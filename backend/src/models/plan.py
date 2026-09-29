from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
from src.database.base import Base

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    duration_days = Column(Integer, nullable=False, default=30)
    description = Column(String, nullable=True)
    color = Column(String, nullable=True)
    badge = Column(String, nullable=True)
    is_combo = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
