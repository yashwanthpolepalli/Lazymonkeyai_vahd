import calendar
import logging
import threading
import time
from datetime import datetime
from src.utils.timezone import now_ist_naive

logger = logging.getLogger(__name__)

_last_dispatched_key: str = ""


def check_and_dispatch_monthly_attendance_reports():
    """
    Checks if current local time is at month end or 1st day of the month.
    If so, automatically dispatches student monthly attendance reports to parent WhatsApp numbers.
    """
    global _last_dispatched_key
    try:
        now = now_ist_naive()
        _, last_day = calendar.monthrange(now.year, now.month)

        is_month_end = (now.day == last_day and now.hour >= 18)
        is_first_of_next_month = (now.day == 1 and now.hour >= 8)

        if not (is_month_end or is_first_of_next_month):
            return

        # Determine target reporting year and month
        if is_month_end:
            target_year = now.year
            target_month = now.month
        else:
            # 1st of month: report previous month
            if now.month == 1:
                target_year = now.year - 1
                target_month = 12
            else:
                target_year = now.year
                target_month = now.month - 1

        dispatch_key = f"{target_year}-{target_month:02d}"
        if _last_dispatched_key == dispatch_key:
            return  # Already dispatched for this month

        from src.database.session import SessionLocal
        from src.services.student_attendance_report_service import StudentAttendanceReportService
        from src.services.employee_attendance_report_service import EmployeeAttendanceReportService

        logger.info(f"🚀 Running Month-End Attendance Auto-Dispatch for {dispatch_key}...")
        db = SessionLocal()
        try:
            # 1. Dispatch Student WhatsApp Reports
            s_res = StudentAttendanceReportService.dispatch_all_monthly_reports(
                db, year=target_year, month=target_month
            )
            logger.info(f"✓ Monthly Student WhatsApp Dispatch Complete: {s_res.get('message')}")

            # 2. Dispatch Employee Monthly Attendance Statement Emails (with Excel/CSV attachments)
            e_res = EmployeeAttendanceReportService.dispatch_all_monthly_employee_reports(
                db, year=target_year, month=target_month
            )
            logger.info(f"✓ Monthly Employee Attendance Email Dispatch Complete: {e_res.get('sent_count')} sent, {e_res.get('failed_count')} failed")

            _last_dispatched_key = dispatch_key
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error during month-end student attendance auto-dispatch: {e}")


def start_monthly_attendance_scheduler():
    """Starts the background daemon thread that runs hourly checks."""
    def _scheduler_loop():
        # Initial brief delay on startup
        time.sleep(10)
        while True:
            try:
                check_and_dispatch_monthly_attendance_reports()
            except Exception as e:
                logger.warning(f"Attendance scheduler tick error: {e}")
            time.sleep(3600)  # Check every 1 hour

    thread = threading.Thread(target=_scheduler_loop, daemon=True, name="StudentMonthlyAttendanceScheduler")
    thread.start()
    logger.info("✓ Student Monthly Attendance WhatsApp Scheduler initialized.")
