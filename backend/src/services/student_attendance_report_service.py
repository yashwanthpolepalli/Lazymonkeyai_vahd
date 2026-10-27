import calendar
import io
import csv
import logging
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from src.models.customer import Customer
from src.models.settings import vahdBranch
from src.models.biometric import BiometricLog
from src.models.crm import WhatsAppSessionModel
from src.models.student_report import StudentAttendanceReportLog
from src.services.whatsapp_service import WhatsAppService
from src.utils.timezone import now_ist_naive

logger = logging.getLogger(__name__)


class StudentAttendanceReportService:
    """
    Automated Student Monthly Attendance Report Engine.
    - Dynamically computes real-time day-wise biometric attendance directly from DB.
    - Strictly maps Student X's attendance report to Student X's parent mobile number only.
    - Dispatches reports via WhatsApp automatically at month-end or on-demand.
    - Persists every dispatched report in `student_attendance_report_logs`.
    - Generates dynamic day-wise CSV and printable PDF reports.
    """

    @staticmethod
    def get_month_working_days(year: int, month: int, up_to_day: Optional[int] = None) -> int:
        """
        Calculate total college working days in the month (excluding Sundays).
        If up_to_day is provided (for in-progress current month), only counts working days up to that date.
        """
        _, last_day = calendar.monthrange(year, month)
        limit_day = min(last_day, up_to_day) if up_to_day else last_day

        working_days = 0
        for day in range(1, limit_day + 1):
            d = date(year, month, day)
            # 6 is Sunday in Python's weekday() (0=Monday, 6=Sunday)
            if d.weekday() != 6:
                working_days += 1
        return max(1, working_days)

    @staticmethod
    def compute_student_monthly_attendance(
        db: Session,
        customer_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculates precise monthly attendance metrics and day-wise attendance records for a single student.
        Dynamically extracts all biometric punch logs from DB.
        """
        now = now_ist_naive()
        target_year = year or now.year
        target_month = month or now.month

        _, last_day = calendar.monthrange(target_year, target_month)
        start_dt = datetime(target_year, target_month, 1, 0, 0, 0)
        end_dt = datetime(target_year, target_month, last_day, 23, 59, 59)

        is_current_month = (target_year == now.year and target_month == now.month)
        up_to_day = now.day if is_current_month else last_day
        total_working_days = StudentAttendanceReportService.get_month_working_days(
            target_year, target_month, up_to_day=up_to_day
        )

        student = db.query(Customer).filter(Customer.id == customer_id).first()
        if not student:
            raise ValueError(f"Student with ID '{customer_id}' not found.")

        meta = student.meta_data or {}
        parent_phone = (
            student.parent_phone
            or meta.get("parent_mobile")
            or meta.get("parent_phone")
            or meta.get("guardian_phone")
            or ""
        ).strip()

        # Query all biometric logs for this student in the target month
        logs = (
            db.query(BiometricLog)
            .filter(
                BiometricLog.customer_id == student.id,
                BiometricLog.timestamp >= start_dt,
                BiometricLog.timestamp <= end_dt,
                BiometricLog.status != "DENIED"
            )
            .order_by(BiometricLog.timestamp.asc())
            .all()
        )

        # Group logs by day
        day_logs: Dict[int, List[BiometricLog]] = {}
        for l in logs:
            day_num = l.timestamp.day
            if day_num not in day_logs:
                day_logs[day_num] = []
            day_logs[day_num].append(l)

        # Build day-wise records for every single day of the month (1..last_day)
        day_wise_records: List[Dict[str, Any]] = []
        days_present = 0

        for d in range(1, last_day + 1):
            cur_date = date(target_year, target_month, d)
            is_sunday = (cur_date.weekday() == 6)
            is_future = is_current_month and (d > now.day)
            weekday_name = cur_date.strftime("%a")
            date_str = cur_date.strftime("%Y-%m-%d")

            d_logs = day_logs.get(d, [])
            if d_logs:
                # Student is present on this day
                status = "PRESENT"
                days_present += 1
                punch_in = d_logs[0].timestamp.strftime("%I:%M %p")
                punch_out = d_logs[-1].timestamp.strftime("%I:%M %p") if len(d_logs) > 1 else punch_in
                device_info = d_logs[0].device_name or "Biometric Terminal"
            elif is_sunday:
                status = "SUNDAY"
                punch_in = None
                punch_out = None
                device_info = None
            elif is_future:
                status = "UPCOMING"
                punch_in = None
                punch_out = None
                device_info = None
            else:
                # Working day in the past or today with no punch
                status = "ABSENT"
                punch_in = None
                punch_out = None
                device_info = None

            day_wise_records.append({
                "day": d,
                "date": date_str,
                "weekday": weekday_name,
                "status": status,
                "punch_time": punch_in,
                "check_out_time": punch_out,
                "device": device_info
            })

        days_absent = max(0, total_working_days - days_present)
        attendance_percentage = round((days_present / total_working_days) * 100.0, 1) if total_working_days > 0 else 100.0
        attendance_percentage = min(100.0, attendance_percentage)

        month_name = calendar.month_name[target_month]

        # Academic standing status
        if attendance_percentage >= 85.0:
            status_text = "🌟 Excellent (Eligible for Examinations & Honors)"
            status_code = "EXCELLENT"
        elif attendance_percentage >= 75.0:
            status_text = "✅ Good Standing (Eligible for Semester Exams)"
            status_code = "GOOD"
        elif attendance_percentage >= 65.0:
            status_text = "⚠️ Attendance Shortage (Action Required / Condonation Risk)"
            status_code = "SHORTAGE"
        else:
            status_text = "🚨 Severe Shortage (Critical Risk of Exam Detention)"
            status_code = "CRITICAL"

        course_name = meta.get("course") or "Degree Program"
        medium_name = meta.get("medium") or ""
        college_name = meta.get("college_name") or student.primary_vahd_location or "VAHD Higher Education Academy"
        roll_number = meta.get("roll_number") or meta.get("admission_number") or student.id

        return {
            "student_id": student.id,
            "roll_number": roll_number,
            "student_name": student.full_name,
            "student_phone": student.phone,
            "student_email": student.email,
            "parent_phone": parent_phone,
            "has_parent_phone": bool(parent_phone),
            "college_name": college_name,
            "branch_id": student.branch_id,
            "course": f"{course_name}{f' ({medium_name} Medium)' if medium_name else ''}",
            "year": target_year,
            "month": target_month,
            "month_name": month_name,
            "total_working_days": total_working_days,
            "days_present": days_present,
            "days_absent": days_absent,
            "attendance_percentage": attendance_percentage,
            "status_text": status_text,
            "status_code": status_code,
            "is_current_month": is_current_month,
            "day_wise_records": day_wise_records
        }

    @staticmethod
    def generate_student_day_wise_csv(report: Dict[str, Any]) -> str:
        """Generates dynamic CSV data string for day-wise attendance."""
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["# VAHD STUDENT OFFICIAL MONTHLY ATTENDANCE REPORT"])
        writer.writerow(["Institution", report.get("college_name", "VAHD Academic Platform")])
        writer.writerow(["Student Name", report.get("student_name", "")])
        writer.writerow(["Student ID / Roll No", report.get("student_id", "")])
        writer.writerow(["Degree / Program", report.get("course", "")])
        writer.writerow(["Parent / Guardian Mobile", report.get("parent_phone", "")])
        writer.writerow(["Reporting Month", f"{report.get('month_name')} {report.get('year')}"])
        writer.writerow(["Total Working Days", report.get("total_working_days", 0)])
        writer.writerow(["Days Present", report.get("days_present", 0)])
        writer.writerow(["Days Absent", report.get("days_absent", 0)])
        writer.writerow(["Monthly Attendance %", f"{report.get('attendance_percentage', 0.0)}%"])
        writer.writerow(["Academic Evaluation", report.get("status_text", "")])
        writer.writerow([])
        writer.writerow(["Day", "Date", "Day of Week", "Attendance Status", "Punch In Time", "Punch Out Time", "Biometric Terminal"])

        for item in report.get("day_wise_records", []):
            writer.writerow([
                item.get("day"),
                item.get("date"),
                item.get("weekday"),
                item.get("status"),
                item.get("punch_time") or "--",
                item.get("check_out_time") or "--",
                item.get("device") or "--"
            ])

        return output.getvalue()

    @staticmethod
    def generate_student_attendance_html_printable(report: Dict[str, Any]) -> str:
        """Generates dynamic, printable A4 official attendance sheet with day-wise matrix."""
        college = report.get("college_name", "VAHD Higher Education Academy").upper()
        name = report.get("student_name", "").upper()
        s_id = report.get("student_id", "")
        roll_no = report.get("roll_number", s_id)
        parent_ph = report.get("parent_phone", "N/A")
        course = report.get("course", "Academic Degree Program")
        month_yr = f"{report.get('month_name')} {report.get('year')}".upper()
        working_days = report.get("total_working_days", 0)
        present = report.get("days_present", 0)
        absent = report.get("days_absent", 0)
        pct = report.get("attendance_percentage", 0.0)
        status_text = report.get("status_text", "")

        rows_html = ""
        for item in report.get("day_wise_records", []):
            st = item.get("status", "")
            if st == "PRESENT":
                st_badge = "<span style='color:#166534;background:#dcfce7;padding:3px 8px;border-radius:6px;font-weight:700;'>PRESENT</span>"
            elif st == "ABSENT":
                st_badge = "<span style='color:#991b1b;background:#fee2e2;padding:3px 8px;border-radius:6px;font-weight:700;'>ABSENT</span>"
            elif st == "SUNDAY":
                st_badge = "<span style='color:#475569;background:#f1f5f9;padding:3px 8px;border-radius:6px;'>SUNDAY</span>"
            else:
                st_badge = "<span style='color:#64748b;padding:3px 8px;'>--</span>"

            rows_html += f"""
            <tr style="border-bottom:1px solid #e2e8f0;text-align:center;">
                <td style="padding:6px;font-weight:600;">{item.get('day')}</td>
                <td style="padding:6px;">{item.get('date')}</td>
                <td style="padding:6px;font-weight:600;">{item.get('weekday')}</td>
                <td style="padding:6px;">{st_badge}</td>
                <td style="padding:6px;color:#1e293b;">{item.get('punch_time') or '--'}</td>
                <td style="padding:6px;color:#1e293b;">{item.get('check_out_time') or '--'}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Attendance Report — {name} — {month_yr}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #0f172a; background: #fff; }}
        .header {{ text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.5px; }}
        .header h2 {{ margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #475569; }}
        .meta-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }}
        .kpi-row {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; text-align: center; }}
        .kpi-card {{ border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #fafafa; }}
        .kpi-num {{ font-size: 20px; font-weight: 800; color: #0f172a; }}
        .kpi-label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
        th {{ background: #1e293b; color: #fff; padding: 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; }}
        .footer {{ margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; padding-top: 20px; border-top: 1px solid #cbd5e1; }}
        @media print {{
            body {{ margin: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">🖨 Print / Save as PDF</button>
    </div>
    <div class="header">
        <h1>{college}</h1>
        <h2>OFFICIAL BIOMETRIC ATTENDANCE RECORD — {month_yr}</h2>
    </div>

    <div class="meta-grid">
        <div><strong>Student Name:</strong> {name}</div>
        <div><strong>Student Roll / Reg ID:</strong> {roll_no}</div>
        <div><strong>Degree / Course:</strong> {course}</div>
        <div><strong>Parent Mobile (WhatsApp Mapped):</strong> <span style="color:#047857;font-weight:700;">{parent_ph}</span></div>
    </div>

    <div class="kpi-row">
        <div class="kpi-card"><div class="kpi-num">{working_days}</div><div class="kpi-label">Working Days</div></div>
        <div class="kpi-card"><div class="kpi-num" style="color:#16a34a;">{present}</div><div class="kpi-label">Days Present</div></div>
        <div class="kpi-card"><div class="kpi-num" style="color:#dc2626;">{absent}</div><div class="kpi-label">Days Absent</div></div>
        <div class="kpi-card"><div class="kpi-num" style="color:#2563eb;">{pct}%</div><div class="kpi-label">Monthly %</div></div>
    </div>

    <div style="margin-bottom:14px;padding:8px 12px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:4px;font-size:12px;font-weight:600;">
        Evaluation: {status_text}
    </div>

    <table>
        <thead>
            <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Weekday</th>
                <th>Biometric Status</th>
                <th>Check-in Punch</th>
                <th>Check-out Punch</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div class="footer">
        <div>Generated via Biometric Cloud System on {now_ist_naive().strftime('%d-%b-%Y %I:%M %p')} IST</div>
        <div>Authorized Registrar / Dean of Academics Seal</div>
    </div>
</body>
</html>
"""
        return html

    @staticmethod
    def build_parent_whatsapp_message(report: Dict[str, Any]) -> str:
        """Constructs an official, formatted WhatsApp attendance report for parents with day-wise highlights."""
        college = report.get("college_name", "VAHD Academic Platform").upper()
        name = report.get("student_name", "Student").upper()
        s_id = report.get("roll_number") or report.get("student_id", "N/A")
        parent_ph = report.get("parent_phone", "")
        course = report.get("course", "Academic Program")
        month_yr = f"{report.get('month_name')} {report.get('year')}".upper()
        working_days = report.get("total_working_days", 0)
        present = report.get("days_present", 0)
        absent = report.get("days_absent", 0)
        pct = report.get("attendance_percentage", 0.0)
        status_line = report.get("status_text", "Regular")

        # Build day-wise summary snippet (first 10 days or sample highlights)
        day_records = report.get("day_wise_records", [])
        recent_working = [r for r in day_records if r.get("status") in ("PRESENT", "ABSENT")][-7:]
        day_highlights = []
        for r in recent_working:
            st_icon = "✅" if r.get("status") == "PRESENT" else "❌"
            time_part = f" ({r.get('punch_time')})" if r.get("punch_time") else ""
            day_highlights.append(f"• {r.get('date')[-5:]} ({r.get('weekday')}): {st_icon} {r.get('status').title()}{time_part}")

        days_summary_text = "\n".join(day_highlights) if day_highlights else f"• {present} Days Present, {absent} Days Absent"

        msg = (
            f"📊 *OFFICIAL MONTHLY ATTENDANCE REPORT — {month_yr}*\n"
            f"🏛 *{college}*\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"Dear Parent / Guardian,\n\n"
            f"Here is the official monthly biometric attendance performance report for your ward:\n\n"
            f"👤 *Student Name:* {name}\n"
            f"🆔 *Student ID / Reg No:* `{s_id}`\n"
            f"📱 *Parent Mobile (Verified Mapped):* `{parent_ph}`\n"
            f"📚 *Degree / Program:* {course}\n"
            f"🗓 *Reporting Month:* {month_yr}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📅 *Total College Working Days:* *{working_days} Days*\n"
            f"✅ *Days Present (Biometric In):* *{present} Days*\n"
            f"❌ *Days Absent:* *{absent} Days*\n"
            f"📈 *Overall Monthly Attendance:* *{pct}%*\n\n"
            f"📌 *Academic Evaluation:* \n{status_line}\n\n"
            f"📋 *Recent Day-Wise Biometric Log:* \n{days_summary_text}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"💡 *Parent Advisory:* University regulations require a mandatory minimum of 75% biometric attendance for semester exam hall ticket eligibility.\n\n"
            f"_Automated attendance advisory dispatched from {college} Student Information System._"
        )
        return msg

    @staticmethod
    def send_report_to_parent(
        db: Session,
        customer_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
        dispatch_type: str = "MANUAL_DISPATCH"
    ) -> Dict[str, Any]:
        """
        Generates the monthly report and sends it STRICTLY to the student's mapped parent mobile number.
        Student X attendance report is dispatched ONLY to Student X's parent phone.
        Saves a persistent audit record into `student_attendance_report_logs`.
        """
        report = StudentAttendanceReportService.compute_student_monthly_attendance(
            db, customer_id=customer_id, year=year, month=month
        )

        parent_phone = report.get("parent_phone")
        if not parent_phone:
            # Log skipped attempt
            log_entry = StudentAttendanceReportLog(
                student_id=customer_id,
                student_name=report.get("student_name", "Unknown"),
                parent_phone="MISSING",
                branch_id=report.get("branch_id"),
                year=report.get("year"),
                month=report.get("month"),
                month_name=report.get("month_name"),
                total_working_days=report.get("total_working_days", 0),
                days_present=report.get("days_present", 0),
                days_absent=report.get("days_absent", 0),
                attendance_percentage=report.get("attendance_percentage", 0.0),
                day_wise_summary=report.get("day_wise_records"),
                delivery_status="FAILED",
                dispatch_type=dispatch_type,
                notes="Missing parent mobile number in student profile."
            )
            db.add(log_entry)
            db.commit()

            return {
                "success": False,
                "student_id": customer_id,
                "student_name": report.get("student_name"),
                "message": f"Missing parent mobile number for {report.get('student_name')}. Please update student dossier with parent mobile number."
            }

        # Resolve WhatsApp active sender session (Institution From Address: 919908297963)
        active_sess = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.id == "919908297963").first()
        if not active_sess:
            active_sess = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.status == "CONNECTED").first()
        if not active_sess:
            active_sess = db.query(WhatsAppSessionModel).first()
        session_id = active_sess.id if active_sess else "919908297963"

        msg_body = StudentAttendanceReportService.build_parent_whatsapp_message(report)

        send_res = WhatsAppService.send_chat_message(
            db=db,
            session_id=session_id,
            phone=parent_phone,
            message=msg_body
        )

        gateway_sent = send_res.get("gateway_sent", False)
        gateway_err = send_res.get("gateway_error")
        whatsapp_url = send_res.get("whatsapp_url")
        formatted_phone = send_res.get("formatted_phone") or parent_phone

        # Create persistent audit log in DB
        log_entry = StudentAttendanceReportLog(
            student_id=customer_id,
            student_name=report.get("student_name"),
            parent_phone=parent_phone,
            branch_id=report.get("branch_id"),
            year=report.get("year"),
            month=report.get("month"),
            month_name=report.get("month_name"),
            total_working_days=report.get("total_working_days", 0),
            days_present=report.get("days_present", 0),
            days_absent=report.get("days_absent", 0),
            attendance_percentage=report.get("attendance_percentage", 0.0),
            day_wise_summary=report.get("day_wise_records"),
            whatsapp_session_id=session_id,
            whatsapp_message_id=send_res.get("message_id"),
            delivery_status="DELIVERED" if gateway_sent else "READY_FOR_DIRECT_DISPATCH",
            dispatch_type=dispatch_type,
            message_body=msg_body,
            notes=(
                "Dispatched via WhatsApp Web Headless Gateway."
                if gateway_sent
                else f"Automated gateway offline/unpaired ({gateway_err}). WhatsApp direct click-to-chat URL generated."
            )
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        status_msg = (
            f"Monthly attendance report for {report.get('student_name')} successfully delivered to parent ({parent_phone}) via WhatsApp Gateway!"
            if gateway_sent
            else f"Attendance report generated for parent ({parent_phone}). Direct WhatsApp Web dispatch link ready."
        )

        return {
            "success": True,
            "log_id": log_entry.id,
            "student_id": customer_id,
            "student_name": report.get("student_name"),
            "parent_phone": parent_phone,
            "formatted_phone": formatted_phone,
            "gateway_sent": gateway_sent,
            "gateway_error": gateway_err,
            "whatsapp_url": whatsapp_url,
            "attendance_percentage": report.get("attendance_percentage"),
            "whatsapp_message_id": send_res.get("message_id"),
            "timestamp": send_res.get("timestamp_ist") or log_entry.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "message": status_msg
        }

    @staticmethod
    def dispatch_all_monthly_reports(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        branch_id: Optional[str] = None,
        dispatch_type: str = "AUTOMATED_MONTH_END"
    ) -> Dict[str, Any]:
        """
        Dispatches monthly attendance reports to all enrolled students' respective mapped parent mobile numbers.
        Executed automatically at month-end or triggered on-demand by the owner.
        """
        query = db.query(Customer).filter(
            or_(
                func.upper(Customer.status) == "ACTIVE",
                Customer.status == "ACTIVE",
                Customer.status == "Active",
                Customer.status.is_(None)
            )
        )
        if branch_id:
            query = query.filter(Customer.branch_id == branch_id)

        students = query.all()
        results = []
        sent_count = 0
        skipped_count = 0

        for s in students:
            try:
                res = StudentAttendanceReportService.send_report_to_parent(
                    db, customer_id=s.id, year=year, month=month, dispatch_type=dispatch_type
                )
                if res.get("success"):
                    sent_count += 1
                else:
                    skipped_count += 1
                results.append(res)
            except Exception as e:
                logger.error(f"Failed to dispatch report for student {s.id}: {e}")
                skipped_count += 1
                results.append({
                    "success": False,
                    "student_id": s.id,
                    "student_name": s.full_name,
                    "error": str(e)
                })

        target_year = year or now_ist_naive().year
        target_month = month or now_ist_naive().month

        return {
            "total_students": len(students),
            "dispatched_count": sent_count,
            "skipped_count": skipped_count,
            "year": target_year,
            "month": target_month,
            "results": results,
            "message": f"Dispatched {sent_count} monthly attendance reports to parents via WhatsApp ({skipped_count} skipped due to missing parent phone numbers)."
        }

    @staticmethod
    def get_monthly_reports_overview(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        branch_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Provides comprehensive overview data for the WhatsApp Reports Page.
        Maps each student to their respective parent mobile number, live dynamic attendance stats,
        and latest dispatch status.
        """
        now = now_ist_naive()
        target_year = year or now.year
        target_month = month or now.month

        # Query branches to provide branch_name and vahd_name mapping
        branches_dict = {b.id: b for b in db.query(vahdBranch).all()}

        query = db.query(Customer).filter(
            or_(
                func.upper(Customer.status) == "ACTIVE",
                Customer.status == "ACTIVE",
                Customer.status == "Active",
                Customer.status.is_(None)
            )
        )
        if branch_id and branch_id != "all":
            query = query.filter(Customer.branch_id == branch_id)

        students = query.all()

        student_reports: List[Dict[str, Any]] = []
        parents_mapped_count = 0
        dispatched_count = 0
        total_pct_sum = 0.0

        # Query existing dispatch logs for this month to quickly map delivery status
        logs = (
            db.query(StudentAttendanceReportLog)
            .filter(
                StudentAttendanceReportLog.year == target_year,
                StudentAttendanceReportLog.month == target_month
            )
            .order_by(desc(StudentAttendanceReportLog.created_at))
            .all()
        )
        logs_by_student: Dict[str, StudentAttendanceReportLog] = {}
        for l in logs:
            if l.student_id not in logs_by_student:
                logs_by_student[l.student_id] = l

        for s in students:
            try:
                rep = StudentAttendanceReportService.compute_student_monthly_attendance(
                    db, customer_id=s.id, year=target_year, month=target_month
                )
            except Exception as e:
                logger.error(f"Error computing attendance for student {s.id}: {e}")
                continue

            last_log = logs_by_student.get(s.id)
            if rep.get("has_parent_phone"):
                parents_mapped_count += 1

            if last_log and last_log.delivery_status == "SENT":
                dispatched_count += 1

            total_pct_sum += rep.get("attendance_percentage", 0.0)

            branch_obj = branches_dict.get(s.branch_id)
            branch_label = branch_obj.branch_name if branch_obj else (s.primary_vahd_location or "Main Campus")
            vahd_label = branch_obj.vahd_name if branch_obj else ""

            student_reports.append({
                "student_id": s.id,
                "student_name": s.full_name,
                "roll_number": rep.get("roll_number"),
                "student_email": s.email,
                "course": rep.get("course"),
                "branch_id": s.branch_id,
                "branch_name": branch_label,
                "vahd_name": vahd_label,
                "parent_phone": rep.get("parent_phone"),
                "has_parent_phone": rep.get("has_parent_phone"),
                "total_working_days": rep.get("total_working_days"),
                "days_present": rep.get("days_present"),
                "days_absent": rep.get("days_absent"),
                "attendance_percentage": rep.get("attendance_percentage"),
                "status_code": rep.get("status_code"),
                "status_text": rep.get("status_text"),
                "day_wise_records": rep.get("day_wise_records"),
                "dispatch_status": last_log.delivery_status if last_log else "NOT_SENT",
                "last_dispatched_at": last_log.created_at.strftime("%Y-%m-%d %H:%M:%S") if last_log else None,
                "last_message_id": last_log.whatsapp_message_id if last_log else None,
                "last_dispatch_type": last_log.dispatch_type if last_log else None
            })

        avg_attendance = round(total_pct_sum / len(student_reports), 1) if student_reports else 0.0

        return {
            "year": target_year,
            "month": target_month,
            "month_name": calendar.month_name[target_month],
            "total_students": len(student_reports),
            "parents_mapped_count": parents_mapped_count,
            "missing_parents_count": len(student_reports) - parents_mapped_count,
            "dispatched_count": dispatched_count,
            "pending_dispatch_count": max(0, parents_mapped_count - dispatched_count),
            "average_attendance": avg_attendance,
            "students": student_reports
        }

    @staticmethod
    def get_dispatched_logs(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Returns the chronological audit log of all sent WhatsApp reports."""
        query = db.query(StudentAttendanceReportLog)
        if year:
            query = query.filter(StudentAttendanceReportLog.year == year)
        if month:
            query = query.filter(StudentAttendanceReportLog.month == month)

        logs = query.order_by(desc(StudentAttendanceReportLog.created_at)).limit(limit).all()
        return [
            {
                "id": l.id,
                "student_id": l.student_id,
                "student_name": l.student_name,
                "parent_phone": l.parent_phone,
                "branch_id": l.branch_id,
                "year": l.year,
                "month": l.month,
                "month_name": l.month_name,
                "total_working_days": l.total_working_days,
                "days_present": l.days_present,
                "days_absent": l.days_absent,
                "attendance_percentage": l.attendance_percentage,
                "whatsapp_session_id": l.whatsapp_session_id,
                "whatsapp_message_id": l.whatsapp_message_id,
                "delivery_status": l.delivery_status,
                "dispatch_type": l.dispatch_type,
                "message_body": l.message_body,
                "notes": l.notes,
                "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else None
            }
            for l in logs
        ]
