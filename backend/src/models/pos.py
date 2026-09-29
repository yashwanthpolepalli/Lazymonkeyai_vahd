import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class PosTransaction(Base):
    __tablename__ = "pos_transactions"

    id = Column(String, primary_key=True, index=True, default=lambda: f"pos_{uuid.uuid4().hex[:8]}")
    invoice_number = Column(String(100), unique=True, index=True, nullable=False)
    session_id = Column(String(100), nullable=True)
    customer_id = Column(String, nullable=True, index=True)
    customer_name = Column(String(255), default="Walk-in Customer")
    customer_phone = Column(String(50), nullable=True)

    subtotal = Column(Float, default=0.0)
    tax_total = Column(Float, default=0.0)
    discount_total = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)

    payment_method = Column(String(50), default="UPI")  # Cash, UPI, Card, Wallet, Split Payment
    payment_status = Column(String(50), default="PAID")  # PAID, PENDING, REFUNDED, VOID
    status = Column(String(50), default="COMPLETED")

    items = Column(JSON, default=list)  # list of { product_id, name, price, qty, tax, total }
    cashier_name = Column(String(100), default="Sandy Owner")
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=now_ist_naive)


class PosSession(Base):
    __tablename__ = "pos_sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: f"sess_{uuid.uuid4().hex[:8]}")
    cashier_id = Column(String, nullable=True)
    cashier_name = Column(String(100), default="Sandy Owner")
    opening_cash = Column(Float, default=5000.0)
    closing_cash = Column(Float, default=0.0)
    total_sales = Column(Float, default=0.0)
    total_transactions = Column(Integer, default=0)
    status = Column(String(50), default="OPEN")  # OPEN, CLOSED
    opened_at = Column(DateTime, default=now_ist_naive)
    closed_at = Column(DateTime, nullable=True)
