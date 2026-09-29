from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class Membership(Base):
    __tablename__ = "memberships"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    plan_name = Column(String, nullable=True)
    plan_type = Column(String, nullable=True)
    status = Column(String, nullable=True)
    start_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    price = Column(Float, nullable=True)
    paid_amount = Column(Float, nullable=True)
    due_amount = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    transaction_id = Column(String, nullable=True)
    benefits = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    customer = relationship("Customer", back_populates="memberships")
