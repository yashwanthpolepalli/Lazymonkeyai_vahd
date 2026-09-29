from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from src.database.base import Base

class PayrollInvoice(Base):
    __tablename__ = "payroll_invoices"

    id = Column(String, primary_key=True, index=True)
    trainer_id = Column(String, ForeignKey("trainer_profiles.id"), nullable=False, index=True)
    month_year = Column(String, nullable=False, index=True)  # e.g., "2026-08"
    days_present = Column(Integer, default=0)
    days_absent = Column(Integer, default=0)
    pt_sessions_count = Column(Integer, default=0)
    base_salary_earned = Column(Float, default=0.0)
    commission_earned = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    status = Column(String, default="DRAFT")  # DRAFT, APPROVED, PAID
    payment_method = Column(String, nullable=True)  # UPI, BANK_TRANSFER, CASH
    transaction_reference = Column(String, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

    # Relationships
    trainer = relationship("TrainerProfile", back_populates="payroll_invoices")
