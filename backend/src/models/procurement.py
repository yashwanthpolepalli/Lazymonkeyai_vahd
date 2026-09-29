import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class Supplier(Base):
    __tablename__ = "erp_suppliers"

    id = Column(String, primary_key=True, index=True, default=lambda: f"sup_{uuid.uuid4().hex[:8]}")
    name = Column(String(150), nullable=False, index=True)
    code = Column(String(50), index=True, nullable=True)
    type = Column(String(100), nullable=True)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    gstin = Column(String(50), nullable=True)
    pan = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    credit_limit = Column(Float, default=0.0)
    payment_terms = Column(String(50), nullable=True)
    rating = Column(Float, default=0.0)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=now_ist_naive)


class PurchaseRequest(Base):
    __tablename__ = "erp_purchase_requests"

    id = Column(String, primary_key=True, index=True, default=lambda: f"pr_{uuid.uuid4().hex[:8]}")
    request_number = Column(String(50), index=True, unique=True, nullable=False)
    requester_name = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    priority = Column(String(50), default="Medium")
    request_date = Column(String(50), nullable=True)
    expected_date = Column(String(50), nullable=True)
    purpose_justification = Column(Text, nullable=True)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Draft")
    approval_notes = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class PurchaseQuotation(Base):
    __tablename__ = "erp_purchase_quotations"

    id = Column(String, primary_key=True, index=True, default=lambda: f"rfq_{uuid.uuid4().hex[:8]}")
    quotation_number = Column(String(50), index=True, unique=True, nullable=False)
    purchase_request_id = Column(String, nullable=True)
    purchase_request_number = Column(String, nullable=True)
    supplier_id = Column(String, nullable=True)
    supplier_name = Column(String(150), nullable=False)
    rfq_date = Column(String(50), nullable=True)
    valid_until = Column(String(50), nullable=True)
    total_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    payment_terms = Column(String(50), nullable=True)
    delivery_lead_days = Column(Integer, default=0)
    status = Column(String(50), default="Received")
    notes = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class PurchaseOrder(Base):
    __tablename__ = "erp_purchase_orders"

    id = Column(String, primary_key=True, index=True, default=lambda: f"po_{uuid.uuid4().hex[:8]}")
    po_number = Column(String(50), index=True, unique=True, nullable=False)
    supplier_id = Column(String, nullable=True)
    supplier_name = Column(String(150), nullable=False)
    supplier_gstin = Column(String(50), nullable=True)
    supplier_address = Column(Text, nullable=True)
    purchase_request_number = Column(String, nullable=True)
    quotation_number = Column(String, nullable=True)
    order_date = Column(String(50), nullable=True)
    expected_delivery_date = Column(String(50), nullable=True)
    payment_terms = Column(String(50), nullable=True)
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    grand_total = Column(Float, default=0.0)
    status = Column(String(50), default="Issued")
    shipping_address = Column(Text, nullable=True)
    billing_address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class GoodsReceivedNote(Base):
    __tablename__ = "erp_goods_received_notes"

    id = Column(String, primary_key=True, index=True, default=lambda: f"grn_{uuid.uuid4().hex[:8]}")
    grn_number = Column(String(50), index=True, unique=True, nullable=False)
    po_id = Column(String, nullable=True)
    po_number = Column(String(50), index=True, nullable=False)
    supplier_name = Column(String(150), nullable=False)
    delivery_challan_number = Column(String(100), nullable=True)
    vehicle_number = Column(String(50), nullable=True)
    transporter = Column(String(100), nullable=True)
    received_date = Column(String(50), nullable=True)
    received_by = Column(String(100), nullable=True)
    inspection_status = Column(String(50), default="Verified")
    status = Column(String(50), default="Verified")
    notes = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class PurchaseReturn(Base):
    __tablename__ = "erp_purchase_returns"

    id = Column(String, primary_key=True, index=True, default=lambda: f"prt_{uuid.uuid4().hex[:8]}")
    return_number = Column(String(50), index=True, unique=True, nullable=False)
    po_number = Column(String(50), nullable=True)
    grn_number = Column(String(50), nullable=True)
    supplier_name = Column(String(150), nullable=False)
    return_date = Column(String(50), nullable=True)
    reason = Column(String(200), nullable=True)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Pending")
    debit_note_number = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class VendorBill(Base):
    __tablename__ = "erp_vendor_bills"

    id = Column(String, primary_key=True, index=True, default=lambda: f"bill_{uuid.uuid4().hex[:8]}")
    bill_number = Column(String(50), index=True, unique=True, nullable=False)
    vendor_invoice_number = Column(String(100), nullable=False)
    supplier_name = Column(String(150), nullable=False)
    supplier_gstin = Column(String(50), nullable=True)
    po_number = Column(String(50), nullable=True)
    grn_number = Column(String(50), nullable=True)
    bill_date = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=True)
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)
    status = Column(String(50), default="Unpaid")
    payment_terms = Column(String(50), nullable=True)
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist_naive)


class VendorPayment(Base):
    __tablename__ = "erp_vendor_payments"

    id = Column(String, primary_key=True, index=True, default=lambda: f"vpay_{uuid.uuid4().hex[:8]}")
    payment_number = Column(String(50), index=True, unique=True, nullable=False)
    bill_id = Column(String, nullable=True)
    bill_number = Column(String(50), nullable=True)
    supplier_name = Column(String(150), nullable=False)
    payment_date = Column(String(50), nullable=True)
    amount_paid = Column(Float, default=0.0)
    payment_method = Column(String(50), nullable=True)
    reference_utr = Column(String(100), nullable=True)
    bank_account = Column(String(100), nullable=True)
    status = Column(String(50), default="Completed")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)


class DebitNote(Base):
    __tablename__ = "erp_debit_notes"

    id = Column(String, primary_key=True, index=True, default=lambda: f"dn_{uuid.uuid4().hex[:8]}")
    debit_note_number = Column(String(50), index=True, unique=True, nullable=False)
    bill_number = Column(String(50), nullable=True)
    supplier_name = Column(String(150), nullable=False)
    date = Column(String(50), nullable=True)
    amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    reason = Column(String(200), nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=now_ist_naive)


class CreditNote(Base):
    __tablename__ = "erp_credit_notes"

    id = Column(String, primary_key=True, index=True, default=lambda: f"cn_{uuid.uuid4().hex[:8]}")
    credit_note_number = Column(String(50), index=True, unique=True, nullable=False)
    vendor_ref_number = Column(String(100), nullable=True)
    supplier_name = Column(String(150), nullable=False)
    date = Column(String(50), nullable=True)
    amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    reason = Column(String(200), nullable=True)
    status = Column(String(50), default="Available")
    created_at = Column(DateTime, default=now_ist_naive)
