from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database.base import Base

class TrainerProfile(Base):
    __tablename__ = "trainer_profiles"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    gender = Column(String, nullable=True)  # Male, Female, Other
    role = Column(String, nullable=False)  # GYM_OWNER, MANAGER, TRAINER, STAFF
    specialization = Column(String, nullable=True)
    primary_gym_location = Column(String, nullable=True)
    base_monthly_salary = Column(Float, nullable=False)
    pt_session_rate = Column(Float, nullable=False)
    bank_account_no = Column(String, nullable=True)
    bank_ifsc = Column(String, nullable=True)
    upi_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    payroll_invoices = relationship("PayrollInvoice", back_populates="trainer")
