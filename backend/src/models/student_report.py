import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, Text
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class StudentAttendanceReportLog(Base):
    """
    Persistent audit log for monthly student attendance reports dispatched to parent WhatsApp numbers.
    Guarantees strict 1-to-1 mapping: Student X attendance -> Student X Parent Mobile.
    """
    __tablename__ = "student_attendance_report_logs"

    id = Column(String, primary_key=True, default=lambda: f"sarl_{uuid.uuid4().hex[:12]}")
    student_id = Column(String, index=True, nullable=False)
    student_name = Column(String, nullable=False)
    parent_phone = Column(String, index=True, nullable=False)
    branch_id = Column(String, index=True, nullable=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    month_name = Column(String, nullable=False)
    total_working_days = Column(Integer, default=0)
    days_present = Column(Integer, default=0)
    days_absent = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=0.0)
    day_wise_summary = Column(JSON, nullable=True)  # List of {day, date, weekday, status, punch_time}
    whatsapp_session_id = Column(String, nullable=True)
    whatsapp_message_id = Column(String, nullable=True)
    delivery_status = Column(String, default="SENT")  # SENT, FAILED, SKIPPED, DELIVERED
    dispatch_type = Column(String, default="AUTOMATED_MONTH_END")  # AUTOMATED_MONTH_END, MANUAL_DISPATCH
    message_body = Column(Text, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
