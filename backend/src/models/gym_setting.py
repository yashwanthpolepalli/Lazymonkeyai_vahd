from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, JSON
from src.database.base import Base

class GymBranch(Base):
    __tablename__ = "gym_branches"

    id = Column(String, primary_key=True, index=True)
    owner_id = Column(String, nullable=True, index=True)
    gym_name = Column(String, nullable=False)
    branch_name = Column(String, nullable=False)
    city = Column(String, nullable=True, default="")
    address = Column(String, nullable=True)
    plan_id = Column(String, nullable=True)
    plan_name = Column(String, nullable=True)
    plan_tier = Column(String, nullable=True)
    billing_cycle = Column(String, nullable=True)  # monthly, annual
    payment_method = Column(String, nullable=True)  # Cash, Card / PineLabs, Razorpay UPI, Wallet, Pay Later
    paid_amount = Column(Float, nullable=True)
    custom_features = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class GymSetting(Base):
    __tablename__ = "gym_settings"

    id = Column(String, primary_key=True, index=True, default="default")
    gym_name = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    essl_bioserver_url = Column(String, nullable=True)
    enable_auto_sms = Column(Boolean, nullable=True, default=False)
    enable_gate_autolock = Column(Boolean, nullable=True, default=False)
    enable_pos = Column(Boolean, nullable=True, default=False)
    enable_inventory = Column(Boolean, nullable=True, default=False)

    # GST / Tax Billing Engine Configurations
    enable_gst_engine = Column(Boolean, nullable=True, default=False)
    sgst_rate = Column(Float, nullable=True)
    sgst_enabled = Column(Boolean, nullable=True, default=False)
    cgst_rate = Column(Float, nullable=True)
    cgst_enabled = Column(Boolean, nullable=True, default=False)
    igst_rate = Column(Float, nullable=True)
    igst_enabled = Column(Boolean, nullable=True, default=False)
    total_gst_rate = Column(Float, nullable=True)
    tax_pricing_mode = Column(String, nullable=True)  # exclusive, inclusive
    sac_code = Column(String, nullable=True)

    # Discount Matrix Engine Configurations
    enable_discount_engine = Column(Boolean, nullable=True, default=False)
    pos_discount_presets = Column(JSON, nullable=True)
    max_staff_discount = Column(Float, nullable=True)
    discount_sequence = Column(String, nullable=True)  # before_tax, after_tax
    tier_discounts = Column(JSON, nullable=True)

    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class FeatureControl(Base):
    """Database-driven Plan Feature Control Matrix table."""
    __tablename__ = "feature_controls"

    id = Column(String, primary_key=True, index=True)
    feature_name = Column(String, nullable=False, unique=True, index=True)
    starter = Column(Boolean, default=False)
    pro = Column(Boolean, default=False)
    business = Column(Boolean, default=True)
    enterprise = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
