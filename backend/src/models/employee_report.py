import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class EmployeeAttendanceReportLog(Base):
    """
    Persistent audit log for monthly employee attendance reports dispatched to employee email addresses.
    Guarantees 1-to-1 mapping: Employee X attendance -> Employee X Email.
    Tracks monthly attendance summary (working days, present, absent, leaves, day-wise records)
    and email delivery status (SENT, FAILED, PENDING).
    """
    __tablename__ = "employee_attendance_report_logs"

    id = Column(String, primary_key=True, default=lambda: f"earl_{uuid.uuid4().hex[:12]}")
    employee_id = Column(String, index=True, nullable=False)
    employee_name = Column(String, nullable=False)
    employee_code = Column(String, index=True, nullable=True)
    email = Column(String, index=True, nullable=False)
    branch_id = Column(String, index=True, nullable=True)
    vahd_branch = Column(String, nullable=True)
    owner_id = Column(String, index=True, nullable=True)
    ho_id = Column(String, index=True, nullable=True)

    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    month_name = Column(String, nullable=False)

    total_working_days = Column(Integer, default=0)
    days_present = Column(Integer, default=0)
    days_absent = Column(Integer, default=0)
    days_leave = Column(Integer, default=0)
    days_half_day = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)

    # Detailed day-wise breakdown: [{day, date, weekday, status, check_in, check_out, work_hours}]
    day_wise_summary = Column(JSON, nullable=True)

    # SENT, FAILED, PENDING
    delivery_status = Column(String, default="PENDING", index=True)
    dispatch_type = Column(String, default="AUTOMATED_MONTH_END")  # AUTOMATED_MONTH_END, MANUAL_DISPATCH
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
