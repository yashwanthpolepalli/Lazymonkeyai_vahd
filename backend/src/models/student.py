from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    employee_id = Column(String, ForeignKey("users.id"), nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True, index=True)
    ho_id = Column(String, nullable=True, index=True)
    member_code = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    parent_phone = Column(String, nullable=True)
    email = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    profile_image = Column(String, nullable=True)
    face_registered = Column(Boolean, default=False)
    face_image = Column(String, nullable=True)
    rfid_tag = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    primary_vahd_location = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="customer_profile")
    memberships = relationship("Membership", back_populates="customer", cascade="all, delete-orphan")
    biometric_logs = relationship("BiometricLog", back_populates="customer", cascade="all, delete-orphan")
