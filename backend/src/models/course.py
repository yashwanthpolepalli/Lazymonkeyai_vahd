from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    department = Column(String, nullable=True)
    degree_type = Column(String, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    duration_days = Column(Integer, nullable=False, default=365)
    description = Column(String, nullable=True)
    color = Column(String, nullable=True)
    badge = Column(String, nullable=True)
    is_combo = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class StudentCourse(Base):
    __tablename__ = "student_courses"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    course_name = Column(String, nullable=True)
    course_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    fee_amount = Column(Float, nullable=True)
    paid_amount = Column(Float, nullable=True)
    due_amount = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
