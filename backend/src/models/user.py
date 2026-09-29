from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from src.database.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'SUPER_ADMIN', 'GYM_OWNER', 'MANAGER', 'TRAINER', 'STAFF', 'CUSTOMER'
    full_name = Column(String, nullable=False)
    phone = Column(String)
    avatar_url = Column(String)
    owner_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    is_platform_admin = Column(Boolean, default=False)
    is_tenant_owner = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    # Relationships
    customer_profile = relationship("Customer", foreign_keys="[Customer.user_id]", back_populates="user", uselist=False)
