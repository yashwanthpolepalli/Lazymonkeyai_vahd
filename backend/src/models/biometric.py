from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class BiometricLog(Base):
    __tablename__ = "biometric_logs"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), index=True, nullable=True)
    user_role = Column(String, default="student")  # student, employee, OWNER, MANAGER, STAFF
    timestamp = Column(DateTime, default=now_ist_naive)
    event_type = Column(String, nullable=False)  # FACE_SCAN, FINGERPRINT, RFID_CARD, PASSWORD
    device_type = Column(String, nullable=True)
    device_id = Column(String, nullable=False)
    device_name = Column(String, nullable=True)
    direction = Column(String, nullable=True)  # CHECK_IN, CHECK_OUT
    status = Column(String, nullable=True)  # SUCCESS, DENIED, ACCESS_GRANTED
    confidence_score = Column(Float, nullable=True)
    meta_data = Column(JSON, default=dict)

    student = relationship("student", back_populates="biometric_logs")
