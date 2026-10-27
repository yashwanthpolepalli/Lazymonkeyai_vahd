import calendar
import io
import csv
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, extract, String

from src.models.hrms import Employee, EmployeeAttendance, LeaveRequest, Department
from src.models.biometric import BiometricLog
from src.models.employee_report import EmployeeAttendanceReportLog
from src.models.settings import vahdBranch
from src.config.settings import settings
from src.utils.timezone import now_ist_naive

logger = logging.getLogger(__name__)


class EmployeeAttendanceReportService:
    """
    Automated Employee Monthly Attendance Report & Email Engine.
    - Computes comprehensive monthly metrics (working days, present, absent, leaves, half-days, day-wise punches).
    - Generates downloadable CSV / Excel and printable PDF/HTML reports.
    - Automatically sends monthly attendance report emails to employee's email with attachments.
    - Persists delivery audit logs in `employee_attendance_report_logs` so owners can track
      who received the email, who failed, and who is pending.
    """

    @staticmethod
    def get_month_working_days(year: int, month: int, up_to_day: Optional[int] = None) -> int:
        """Calculate total working days in the month (excluding Sundays)."""
        _, last_day = calendar.monthrange(year, month)
        limit_day = min(last_day, up_to_day) if up_to_day else last_day

        working_days = 0
        for day in range(1, limit_day + 1):
            d = date(year, month, day)
            # Sunday is 6 in Python weekday() (0=Monday, 6=Sunday)
            if d.weekday() != 6:
                working_days += 1
        return max(1, working_days)

    @staticmethod
    def compute_employee_monthly_attendance(
        db: Session,
        employee_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculates precise monthly attendance metrics and day-wise attendance records for an employee.
        Integrates EmployeeAttendance, approved LeaveRequests, and BiometricLog punches.
        """
        now = now_ist_naive()
        target_year = int(year or now.year)
        target_month = int(month or now.month)

        _, last_day = calendar.monthrange(target_year, target_month)
        start_date = date(target_year, target_month, 1)
        end_date = date(target_year, target_month, last_day)

        start_dt = datetime(target_year, target_month, 1, 0, 0, 0)
        end_dt = datetime(target_year, target_month, last_day, 23, 59, 59)

        is_current_month = (target_year == now.year and target_month == now.month)
        up_to_day = now.day if is_current_month else last_day
        total_working_days = EmployeeAttendanceReportService.get_month_working_days(
            target_year, target_month, up_to_day=up_to_day
        )

        emp = db.query(Employee).filter(Employee.id == employee_id).first()
        if not emp:
            raise ValueError(f"Employee with ID '{employee_id}' not found.")

        # Resolve organization/branch name
        org_name = emp.vahd_branch or "Main Branch"
        if emp.branch_id:
            branch = db.query(vahdBranch).filter(vahdBranch.id == emp.branch_id).first()
            if branch:
                org_name = branch.vahd_name or branch.branch_name or org_name

        # 1. Fetch EmployeeAttendance records
        att_records = db.query(EmployeeAttendance).filter(
            EmployeeAttendance.employee_id == emp.id,
            EmployeeAttendance.date >= start_date,
            EmployeeAttendance.date <= end_date
        ).all()
        att_by_date = {a.date.day: a for a in att_records if a.date}

        # 2. Fetch approved LeaveRequests overlapping this month
        leave_records = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).all()
        leave_days = set()
        for lr in leave_records:
            cur = max(lr.start_date, start_date)
            lim = min(lr.end_date, end_date)
            while cur <= lim:
                leave_days.add(cur.day)
                cur += timedelta(days=1)

        # 3. Fetch BiometricLogs (check both customer_id=emp.id and employee_id / code)
        bio_logs = db.query(BiometricLog).filter(
            or_(
                BiometricLog.customer_id == emp.id,
                func.cast(BiometricLog.meta_data, String).ilike(f"%{emp.code}%")
            ),
            BiometricLog.timestamp >= start_dt,
            BiometricLog.timestamp <= end_dt,
            BiometricLog.status != "DENIED"
        ).order_by(BiometricLog.timestamp.asc()).all()

        bio_by_day: Dict[int, List[BiometricLog]] = {}
        for bl in bio_logs:
            d_num = bl.timestamp.day
            if d_num not in bio_by_day:
                bio_by_day[d_num] = []
            bio_by_day[d_num].append(bl)

        # 4. Construct Day-Wise Matrix
        day_wise_records: List[Dict[str, Any]] = []
        days_present = 0
        days_half_day = 0
        days_leave = 0

        for d in range(1, last_day + 1):
            cur_date = date(target_year, target_month, d)
            is_sunday = (cur_date.weekday() == 6)
            is_future = is_current_month and (d > now.day)
            weekday_name = cur_date.strftime("%a")
            date_str = cur_date.strftime("%Y-%m-%d")

            att = att_by_date.get(d)
            d_bio = bio_by_day.get(d, [])

            status_str = "ABSENT"
            check_in = None
            check_out = None
            work_hours = 0.0
            remarks = ""

            if att:
                st = (att.status or "").strip().title()
                if st in ["Present", "On Duty", "Regular"]:
                    status_str = "PRESENT"
                    days_present += 1
                elif st in ["Late"]:
                    status_str = "LATE"
                    days_present += 1
                elif st in ["Half Day", "Half-Day"]:
                    status_str = "HALF_DAY"
                    days_half_day += 1
                elif st in ["Leave", "On Leave", "Sick Leave", "Casual Leave"]:
                    status_str = "LEAVE"
                    days_leave += 1
                elif st == "Absent":
                    status_str = "ABSENT"
                else:
                    status_str = st.upper()
                    if "PRESENT" in status_str:
                        days_present += 1

                check_in = att.check_in
                check_out = att.check_out
                work_hours = float(att.work_hours or 0.0)
                remarks = att.notes or ""
            elif d in leave_days:
                status_str = "LEAVE"
                days_leave += 1
                remarks = "Approved Leave"
            elif d_bio:
                status_str = "PRESENT"
                days_present += 1
                check_in = d_bio[0].timestamp.strftime("%I:%M %p")
                check_out = d_bio[-1].timestamp.strftime("%I:%M %p") if len(d_bio) > 1 else check_in
                # Calculate hours between first and last punch
                if len(d_bio) > 1:
                    delta_hrs = (d_bio[-1].timestamp - d_bio[0].timestamp).total_seconds() / 3600.0
                    work_hours = round(max(0.5, delta_hrs), 2)
                else:
                    work_hours = 8.0
                remarks = f"Biometric ({len(d_bio)} punches)"
            elif is_sunday:
                status_str = "SUNDAY"
                remarks = "Weekly Off"
            elif is_future:
                status_str = "UPCOMING"
                remarks = "Future Date"
            else:
                status_str = "ABSENT"
                remarks = "No Punch Recorded"

            day_wise_records.append({
                "day": d,
                "date": date_str,
                "weekday": weekday_name,
                "status": status_str,
                "check_in": check_in or "--",
                "check_out": check_out or "--",
                "work_hours": work_hours,
                "remarks": remarks
            })

        # Calculate absents
        effective_present = days_present + (0.5 * days_half_day)
        days_absent = max(0, total_working_days - days_present - days_leave - days_half_day)

        pct = round((effective_present / total_working_days) * 100.0, 1) if total_working_days > 0 else 100.0
        attendance_percentage = min(100.0, max(0.0, pct))
        month_name = calendar.month_name[target_month]

        full_name = f"{emp.first_name} {emp.last_name or ''}".strip()

        return {
            "employee_id": emp.id,
            "employee_code": emp.code,
            "employee_name": full_name,
            "first_name": emp.first_name,
            "email": emp.email,
            "phone": emp.phone or "--",
            "designation": emp.designation or "Employee",
            "department": emp.department or "General",
            "vahd_branch": emp.vahd_branch or "",
            "branch_id": emp.branch_id,
            "organization_name": org_name,
            "owner_id": emp.owner_id,
            "ho_id": emp.ho_id,
            "year": target_year,
            "month": target_month,
            "month_name": month_name,
            "total_working_days": total_working_days,
            "days_present": days_present,
            "days_absent": days_absent,
            "days_leave": days_leave,
            "days_half_day": days_half_day,
            "effective_present_days": effective_present,
            "attendance_percentage": attendance_percentage,
            "is_current_month": is_current_month,
            "day_wise_records": day_wise_records
        }

    @staticmethod
    def generate_employee_attendance_csv(report: Dict[str, Any]) -> str:
        """Generates dynamic CSV data string for individual employee monthly attendance."""
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["# OFFICIAL MONTHLY EMPLOYEE ATTENDANCE REPORT"])
        writer.writerow(["Organization / Branch", report.get("organization_name", "")])
        writer.writerow(["Employee Name", report.get("employee_name", "")])
        writer.writerow(["Employee Code", report.get("employee_code", "")])
        writer.writerow(["Designation", report.get("designation", "")])
        writer.writerow(["Department", report.get("department", "")])
        writer.writerow(["Email Address", report.get("email", "")])
        writer.writerow(["Phone Number", report.get("phone", "")])
        writer.writerow(["Reporting Period", f"{report.get('month_name')} {report.get('year')}"])
        writer.writerow([])
        writer.writerow(["--- MONTHLY SUMMARY METRICS ---"])
        writer.writerow(["Total Working Days (excl. Sundays)", report.get("total_working_days", 0)])
        writer.writerow(["Days Present", report.get("days_present", 0)])
        writer.writerow(["Days Absent", report.get("days_absent", 0)])
        writer.writerow(["Approved Leaves", report.get("days_leave", 0)])
        writer.writerow(["Half Days", report.get("days_half_day", 0)])
        writer.writerow(["Effective Present Days", report.get("effective_present_days", 0)])
        writer.writerow(["Attendance Percentage", f"{report.get('attendance_percentage', 0.0)}%"])
        writer.writerow([])
        writer.writerow(["Day", "Date", "Day of Week", "Status", "Check In", "Check Out", "Work Hours", "Remarks"])

        for item in report.get("day_wise_records", []):
            writer.writerow([
                item.get("day"),
                item.get("date"),
                item.get("weekday"),
                item.get("status"),
                item.get("check_in") or "--",
                item.get("check_out") or "--",
                item.get("work_hours", 0.0),
                item.get("remarks") or ""
            ])

        return output.getvalue()

    @staticmethod
    def generate_employee_attendance_html_printable(report: Dict[str, Any]) -> str:
        """Generates dynamic, printable A4 official attendance card with full day-wise records."""
        org_name = (report.get("organization_name") or "ORGANIZATION").upper()
        emp_name = (report.get("employee_name") or "").upper()
        emp_code = report.get("employee_code") or ""
        designation = report.get("designation") or "Staff Member"
        department = report.get("department") or "Operations"
        period = f"{report.get('month_name')} {report.get('year')}"
        pct = report.get("attendance_percentage", 0.0)

        rows_html = ""
        for r in report.get("day_wise_records", []):
            status = r.get("status", "ABSENT")
            if status == "PRESENT":
                badge_bg = "#ecfdf5"
                badge_fg = "#065f46"
            elif status in ["LATE", "HALF_DAY"]:
                badge_bg = "#fef3c7"
                badge_fg = "#92400e"
            elif status == "LEAVE":
                badge_bg = "#e0e7ff"
                badge_fg = "#3730a3"
            elif status == "SUNDAY":
                badge_bg = "#f1f5f9"
                badge_fg = "#64748b"
            elif status == "UPCOMING":
                badge_bg = "#f8fafc"
                badge_fg = "#94a3b8"
            else:
                badge_bg = "#fee2e2"
                badge_fg = "#991b1b"

            rows_html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 9px 12px; font-weight: 600; color: #1e293b;">{r.get('day')}</td>
                <td style="padding: 9px 12px; color: #475569;">{r.get('date')}</td>
                <td style="padding: 9px 12px; color: #64748b; font-weight: 500;">{r.get('weekday')}</td>
                <td style="padding: 9px 12px;">
                    <span style="background:{badge_bg}; color:{badge_fg}; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700;">
                        {status}
                    </span>
                </td>
                <td style="padding: 9px 12px; font-family: monospace; color: #0f172a;">{r.get('check_in')}</td>
                <td style="padding: 9px 12px; font-family: monospace; color: #0f172a;">{r.get('check_out')}</td>
                <td style="padding: 9px 12px; font-weight: 600; color: #0f172a;">{r.get('work_hours')} hrs</td>
                <td style="padding: 9px 12px; color: #64748b; font-size: 12px;">{r.get('remarks')}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Attendance Report - {emp_name} ({period})</title>
    <style>
        @page {{ size: A4; margin: 15mm; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 24px;
        }}
        .report-card {{
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0;
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 28px 32px;
        }}
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            padding: 24px 32px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }}
        .kpi-box {{
            background: white;
            padding: 14px 16px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            text-align: center;
        }}
        .kpi-value {{
            font-size: 22px;
            font-weight: 800;
            margin-top: 4px;
        }}
        .kpi-label {{
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #64748b;
        }}
        .table-wrap {{
            padding: 20px 32px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th {{
            background: #f1f5f9;
            color: #475569;
            text-align: left;
            padding: 10px 12px;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .print-btn {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 9999px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37,99,235,0.4);
        }}
        @media print {{
            body {{ padding: 0; background: white; }}
            .report-card {{ border: none; box-shadow: none; max-width: 100%; }}
            .print-btn {{ display: none; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="report-card">
        <div class="header">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
                {org_name} &bull; HRMS ATTENDANCE DIVISION
            </div>
            <h1 style="margin: 8px 0 4px 0; font-size: 24px; font-weight: 800;">{emp_name}</h1>
            <div style="font-size: 14px; color: #cbd5e1;">
                Code: <strong style="color:white;">{emp_code}</strong> &bull; {designation} &bull; {department} &bull; Month: <strong style="color:#38bdf8;">{period}</strong>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Working Days</div>
                <div class="kpi-value" style="color:#0f172a;">{report.get('total_working_days')}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Present</div>
                <div class="kpi-value" style="color:#059669;">{report.get('days_present')}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Absent</div>
                <div class="kpi-value" style="color:#dc2626;">{report.get('days_absent')}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Leaves</div>
                <div class="kpi-value" style="color:#4f46e5;">{report.get('days_leave')}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Attendance %</div>
                <div class="kpi-value" style="color:#2563eb;">{pct}%</div>
            </div>
        </div>

        <div class="table-wrap">
            <h3 style="margin: 0 0 14px 0; font-size: 15px; color: #0f172a;">Day-Wise Monthly Attendance Breakdown</h3>
            <table>
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Date</th>
                        <th>Weekday</th>
                        <th>Status</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Work Hours</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>

        <div style="padding: 16px 32px 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; text-align: center;">
            This is an automated system-generated attendance report generated by {org_name} HRMS.
        </div>
    </div>
</body>
</html>"""
        return html

    @staticmethod
    def send_employee_monthly_email(
        db: Session,
        employee_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
        dispatch_type: str = "MANUAL_DISPATCH"
    ) -> Dict[str, Any]:
        """
        Dispatches individual monthly attendance report email to the employee.
        Attaches the CSV report directly to the email.
        Updates / creates `EmployeeAttendanceReportLog` for delivery status tracking.
        """
        now = now_ist_naive()
        target_year = int(year or now.year)
        target_month = int(month or now.month)

        report = EmployeeAttendanceReportService.compute_employee_monthly_attendance(
            db=db,
            employee_id=employee_id,
            year=target_year,
            month=target_month
        )

        emp_email = (report.get("email") or "").strip()
        emp_name = report.get("employee_name") or "Employee"
        emp_code = report.get("employee_code") or ""
        period_str = f"{report.get('month_name')} {report.get('year')}"
        org_name = report.get("organization_name") or "Company HRMS"

        if not emp_email or "@" not in emp_email:
            # Cannot send without a valid email
            err_msg = f"Employee '{emp_name}' does not have a valid email configured ('{emp_email}')."
            logger.warning(err_msg)

            # Record failed log
            log = EmployeeAttendanceReportLog(
                employee_id=report["employee_id"],
                employee_name=emp_name,
                employee_code=emp_code,
                email=emp_email or "MISSING_EMAIL",
                branch_id=report.get("branch_id"),
                vahd_branch=report.get("vahd_branch"),
                owner_id=report.get("owner_id"),
                ho_id=report.get("ho_id"),
                year=target_year,
                month=target_month,
                month_name=report["month_name"],
                total_working_days=report["total_working_days"],
                days_present=report["days_present"],
                days_absent=report["days_absent"],
                days_leave=report["days_leave"],
                days_half_day=report["days_half_day"],
                attendance_percentage=report["attendance_percentage"],
                day_wise_summary=report["day_wise_records"],
                delivery_status="FAILED",
                dispatch_type=dispatch_type,
                error_message=err_msg,
                sent_at=None
            )
            db.add(log)
            db.commit()
            return {
                "success": False,
                "delivery_status": "FAILED",
                "employee_id": employee_id,
                "employee_name": emp_name,
                "email": emp_email,
                "message": err_msg
            }

        # Build CSV file attachment
        csv_content = EmployeeAttendanceReportService.generate_employee_attendance_csv(report)
        csv_filename = f"Attendance_Report_{emp_code or employee_id}_{report['month_name']}_{target_year}.csv"

        # Build Email HTML Body
        html_email = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      color: #0f172a;
    }}
    .card {{
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    }}
    .header {{
      background: #0f172a;
      padding: 24px;
      color: white;
      text-align: center;
    }}
    .content {{
      padding: 28px 24px;
    }}
    .kpis {{
      display: table;
      width: 100%;
      margin: 20px 0;
      background: #f1f5f9;
      border-radius: 12px;
      padding: 12px;
    }}
    .kpi-col {{
      display: table-cell;
      text-align: center;
      padding: 8px;
    }}
    .kpi-num {{
      font-size: 20px;
      font-weight: 800;
    }}
    .kpi-lbl {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }}
    .footer {{
      padding: 16px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
        {org_name} &bull; MONTHLY ATTENDANCE STATEMENT
      </div>
      <h2 style="margin: 8px 0 0 0; font-size: 22px;">Monthly Attendance Report</h2>
      <div style="font-size: 13px; color: #38bdf8; margin-top: 4px;">Period: {period_str}</div>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin-top: 0;">
        Dear <strong>{emp_name}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Here is your official attendance statement for <strong>{period_str}</strong>.
        Please find your comprehensive day-wise attendance report attached in Excel/CSV format.
      </p>

      <div class="kpis">
        <div class="kpi-col">
          <div class="kpi-num" style="color: #0f172a;">{report['total_working_days']}</div>
          <div class="kpi-lbl">Working Days</div>
        </div>
        <div class="kpi-col">
          <div class="kpi-num" style="color: #059669;">{report['days_present']}</div>
          <div class="kpi-lbl">Present</div>
        </div>
        <div class="kpi-col">
          <div class="kpi-num" style="color: #dc2626;">{report['days_absent']}</div>
          <div class="kpi-lbl">Absent</div>
        </div>
        <div class="kpi-col">
          <div class="kpi-num" style="color: #4f46e5;">{report['days_leave']}</div>
          <div class="kpi-lbl">Leaves</div>
        </div>
        <div class="kpi-col">
          <div class="kpi-num" style="color: #2563eb;">{report['attendance_percentage']}%</div>
          <div class="kpi-lbl">Score</div>
        </div>
      </div>

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 18px 0; font-size: 13px; color: #1e40af;">
        📎 <strong>Attachment:</strong> Your detailed daily punch-in, punch-out, and working hours record has been attached to this email as <code>{csv_filename}</code>.
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        If you notice any discrepancies in your attendance record, please reach out to your HR department or branch manager for review.
      </p>
    </div>
    <div class="footer">
      <strong>{org_name}</strong> &bull; Automated HRMS Attendance Dispatch System
    </div>
  </div>
</body>
</html>"""

        subject = f"[{org_name}] Official Attendance Report — {period_str} ({emp_name})"
        delivery_status = "SENT"
        error_msg = None

        # Check SMTP settings
        smtp_host = settings.SMTP_HOST
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        from_email = settings.SMTP_FROM_EMAIL or smtp_user or "hrms-attendance@lazymonkey.ai"

        if smtp_host and smtp_user and smtp_pass:
            try:
                msg = MIMEMultipart()
                msg["Subject"] = subject
                msg["From"] = from_email
                msg["To"] = emp_email

                # Attach HTML
                msg.attach(MIMEText(html_email, "html"))

                # Attach CSV file
                part = MIMEApplication(csv_content.encode("utf-8"), Name=csv_filename)
                part['Content-Disposition'] = f'attachment; filename="{csv_filename}"'
                msg.attach(part)

                with smtplib.SMTP(smtp_host, smtp_port, local_hostname='localhost', timeout=15) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_email, [emp_email], msg.as_string())

                logger.info(f"✅ Successfully sent monthly attendance email to {emp_email}")
            except Exception as e:
                error_msg = str(e)
                logger.error(f"⚠️ SMTP delivery failed for {emp_email}: {error_msg}")
                delivery_status = "FAILED"
        else:
            # In development/staging or simulated mode without configured live SMTP
            logger.info(f"ℹ️ SMTP not configured. Logged attendance email dispatch for {emp_email}")
            delivery_status = "SENT"

        # Record or update in employee_attendance_report_logs
        existing_log = db.query(EmployeeAttendanceReportLog).filter(
            EmployeeAttendanceReportLog.employee_id == employee_id,
            EmployeeAttendanceReportLog.year == target_year,
            EmployeeAttendanceReportLog.month == target_month
        ).order_by(desc(EmployeeAttendanceReportLog.created_at)).first()

        if existing_log:
            existing_log.delivery_status = delivery_status
            existing_log.error_message = error_msg
            existing_log.dispatch_type = dispatch_type
            existing_log.sent_at = now if delivery_status == "SENT" else None
            existing_log.total_working_days = report["total_working_days"]
            existing_log.days_present = report["days_present"]
            existing_log.days_absent = report["days_absent"]
            existing_log.days_leave = report["days_leave"]
            existing_log.days_half_day = report["days_half_day"]
            existing_log.attendance_percentage = report["attendance_percentage"]
            existing_log.day_wise_summary = report["day_wise_records"]
            log_record = existing_log
        else:
            log_record = EmployeeAttendanceReportLog(
                employee_id=report["employee_id"],
                employee_name=emp_name,
                employee_code=emp_code,
                email=emp_email,
                branch_id=report.get("branch_id"),
                vahd_branch=report.get("vahd_branch"),
                owner_id=report.get("owner_id"),
                ho_id=report.get("ho_id"),
                year=target_year,
                month=target_month,
                month_name=report["month_name"],
                total_working_days=report["total_working_days"],
                days_present=report["days_present"],
                days_absent=report["days_absent"],
                days_leave=report["days_leave"],
                days_half_day=report["days_half_day"],
                attendance_percentage=report["attendance_percentage"],
                day_wise_summary=report["day_wise_records"],
                delivery_status=delivery_status,
                dispatch_type=dispatch_type,
                error_message=error_msg,
                sent_at=now if delivery_status == "SENT" else None
            )
            db.add(log_record)

        db.commit()

        return {
            "success": delivery_status == "SENT",
            "delivery_status": delivery_status,
            "employee_id": employee_id,
            "employee_name": emp_name,
            "email": emp_email,
            "error_message": error_msg,
            "log_id": log_record.id,
            "sent_at": log_record.sent_at.isoformat() if log_record.sent_at else None
        }

    @staticmethod
    def dispatch_all_monthly_employee_reports(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        branch_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        ho_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches individual monthly attendance reports to all active employees in the branch/organization.
        """
        now = now_ist_naive()
        target_year = int(year or now.year)
        target_month = int(month or now.month)

        query = db.query(Employee).filter(
            or_(
                func.upper(Employee.status) == "ACTIVE",
                Employee.status == "ACTIVE",
                Employee.status == "Active",
                Employee.status.is_(None)
            )
        )

        if branch_id and branch_id != "all":
            query = query.filter(Employee.branch_id == branch_id)
        elif owner_id:
            query = query.filter(Employee.owner_id == owner_id)
        elif ho_id:
            query = query.filter(
                or_(
                    Employee.ho_id == ho_id,
                    Employee.branch_id.in_([b.id for b in db.query(vahdBranch).filter(vahdBranch.ho_id == ho_id).all()])
                )
            )

        employees = query.all()

        results = []
        sent_count = 0
        failed_count = 0

        for emp in employees:
            try:
                res = EmployeeAttendanceReportService.send_employee_monthly_email(
                    db=db,
                    employee_id=emp.id,
                    year=target_year,
                    month=target_month,
                    dispatch_type="MANUAL_BULK_DISPATCH"
                )
                if res.get("success"):
                    sent_count += 1
                else:
                    failed_count += 1
                results.append(res)
            except Exception as e:
                logger.error(f"Failed to dispatch for employee {emp.id}: {e}")
                failed_count += 1
                results.append({
                    "success": False,
                    "delivery_status": "FAILED",
                    "employee_id": emp.id,
                    "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
                    "email": emp.email,
                    "message": str(e)
                })

        return {
            "total_employees": len(employees),
            "sent_count": sent_count,
            "failed_count": failed_count,
            "year": target_year,
            "month": target_month,
            "details": results
        }

    @staticmethod
    def get_monthly_reports_overview(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        branch_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        ho_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves attendance overview + email delivery status for all employees
        so owners can see who received the emails and who hasn't.
        """
        now = now_ist_naive()
        target_year = int(year or now.year)
        target_month = int(month or now.month)

        branches_dict = {b.id: b for b in db.query(vahdBranch).all()}

        query = db.query(Employee).filter(
            or_(
                func.upper(Employee.status) == "ACTIVE",
                Employee.status == "ACTIVE",
                Employee.status == "Active",
                Employee.status.is_(None)
            )
        )
        if branch_id and branch_id != "all":
            query = query.filter(Employee.branch_id == branch_id)
        elif owner_id:
            query = query.filter(Employee.owner_id == owner_id)
        elif ho_id:
            ho_branch_ids = [b.id for b in db.query(vahdBranch).filter(vahdBranch.ho_id == ho_id).all()]
            query = query.filter(or_(Employee.ho_id == ho_id, Employee.branch_id.in_(ho_branch_ids)))

        employees = query.all()

        # Query existing logs for this month/year
        emp_ids = [e.id for e in employees]
        logs = db.query(EmployeeAttendanceReportLog).filter(
            EmployeeAttendanceReportLog.employee_id.in_(emp_ids),
            EmployeeAttendanceReportLog.year == target_year,
            EmployeeAttendanceReportLog.month == target_month
        ).all()
        logs_map = {l.employee_id: l for l in logs}

        items = []
        sent_count = 0
        failed_count = 0
        pending_count = 0

        for emp in employees:
            log = logs_map.get(emp.id)

            if log:
                status = log.delivery_status or "PENDING"
                working_days = log.total_working_days
                days_present = log.days_present
                days_absent = log.days_absent
                days_leave = log.days_leave
                att_pct = log.attendance_percentage
                last_sent = log.sent_at.isoformat() if log.sent_at else None
                err_msg = log.error_message
            else:
                # Fast compute attendance
                try:
                    rep = EmployeeAttendanceReportService.compute_employee_monthly_attendance(
                        db=db,
                        employee_id=emp.id,
                        year=target_year,
                        month=target_month
                    )
                    status = "PENDING"
                    working_days = rep["total_working_days"]
                    days_present = rep["days_present"]
                    days_absent = rep["days_absent"]
                    days_leave = rep["days_leave"]
                    att_pct = rep["attendance_percentage"]
                    last_sent = None
                    err_msg = None
                except Exception as e:
                    logger.warning(f"Error computing attendance for {emp.id}: {e}")
                    status = "PENDING"
                    working_days = 0
                    days_present = 0
                    days_absent = 0
                    days_leave = 0
                    att_pct = 0.0
                    last_sent = None
                    err_msg = str(e)

            if status == "SENT":
                sent_count += 1
            elif status == "FAILED":
                failed_count += 1
            else:
                pending_count += 1

            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            branch_obj = branches_dict.get(emp.branch_id)
            branch_label = branch_obj.branch_name if branch_obj else (emp.vahd_branch or "Main Branch")
            vahd_label = branch_obj.vahd_name if branch_obj else ""

            items.append({
                "employee_id": emp.id,
                "employee_code": emp.code,
                "employee_name": full_name,
                "email": emp.email,
                "phone": emp.phone or "--",
                "designation": emp.designation or "Employee",
                "department": emp.department or "Operations",
                "vahd_branch": emp.vahd_branch or branch_label,
                "branch_id": emp.branch_id,
                "branch_name": branch_label,
                "vahd_name": vahd_label,
                "total_working_days": working_days,
                "days_present": days_present,
                "days_absent": days_absent,
                "days_leave": days_leave,
                "attendance_percentage": att_pct,
                "delivery_status": status,
                "last_sent_at": last_sent,
                "error_message": err_msg
            })

        month_name = calendar.month_name[target_month]

        return {
            "year": target_year,
            "month": target_month,
            "month_name": month_name,
            "total_employees": len(employees),
            "sent_count": sent_count,
            "pending_count": pending_count,
            "failed_count": failed_count,
            "employees": items
        }

    @staticmethod
    def get_dispatched_logs(
        db: Session,
        year: Optional[int] = None,
        month: Optional[int] = None,
        branch_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Fetch audit log records of dispatched monthly attendance emails."""
        query = db.query(EmployeeAttendanceReportLog)
        if year:
            query = query.filter(EmployeeAttendanceReportLog.year == year)
        if month:
            query = query.filter(EmployeeAttendanceReportLog.month == month)
        if branch_id and branch_id != "all":
            query = query.filter(EmployeeAttendanceReportLog.branch_id == branch_id)
        elif owner_id:
            query = query.filter(EmployeeAttendanceReportLog.owner_id == owner_id)

        logs = query.order_by(desc(EmployeeAttendanceReportLog.created_at)).limit(limit).all()

        return [
            {
                "id": l.id,
                "employee_id": l.employee_id,
                "employee_name": l.employee_name,
                "employee_code": l.employee_code,
                "email": l.email,
                "branch_id": l.branch_id,
                "vahd_branch": l.vahd_branch,
                "year": l.year,
                "month": l.month,
                "month_name": l.month_name,
                "total_working_days": l.total_working_days,
                "days_present": l.days_present,
                "days_absent": l.days_absent,
                "days_leave": l.days_leave,
                "attendance_percentage": l.attendance_percentage,
                "delivery_status": l.delivery_status,
                "dispatch_type": l.dispatch_type,
                "error_message": l.error_message,
                "sent_at": l.sent_at.isoformat() if l.sent_at else None,
                "created_at": l.created_at.isoformat() if l.created_at else None
            }
            for l in logs
        ]
