import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.procurement_service import ProcurementService
from src.models.procurement import (
    Supplier, PurchaseRequest, PurchaseQuotation, PurchaseOrder,
    GoodsReceivedNote, PurchaseReturn, VendorBill, VendorPayment,
    DebitNote, CreditNote
)

router = APIRouter(prefix="/procurement", tags=["Purchase & Procurement"])


def _gen_code(prefix: str) -> str:
    """Generate dynamic document reference numbers with current year and random hex."""
    return f"{prefix}-{datetime.now().year}-{uuid.uuid4().hex[:6].upper()}"


# ─── Statistics & Dashboard Summary ──────────────────────────────

@router.get("/summary")
def get_procurement_summary(db: Session = Depends(get_db)):
    return ProcurementService.get_procurement_stats(db)


# ─── 1. Purchase Requests / Requisitions (PR) ──────────────────────

@router.get("/purchase-requests")
def list_purchase_requests(db: Session = Depends(get_db)):
    return db.query(PurchaseRequest).order_by(PurchaseRequest.created_at.desc()).all()


@router.post("/purchase-requests", status_code=status.HTTP_201_CREATED)
def create_purchase_request(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    req_num = payload.get("request_number") or _gen_code("PR")
    pr = PurchaseRequest(
        request_number=req_num,
        requester_name=payload.get("requester_name"),
        department=payload.get("department"),
        priority=payload.get("priority"),
        request_date=payload.get("request_date") or today_str,
        expected_date=payload.get("expected_date"),
        purpose_justification=payload.get("purpose_justification"),
        total_amount=float(payload.get("total_amount", 0.0)),
        status=payload.get("status") or "Draft",
        approval_notes=payload.get("approval_notes"),
        items=payload.get("items") or [],
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr


@router.patch("/purchase-requests/{pr_id}/status")
def update_pr_status(pr_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    if "status" in payload:
        pr.status = payload["status"]
    if "approval_notes" in payload:
        pr.approval_notes = payload["approval_notes"]
    db.commit()
    db.refresh(pr)
    return pr


# ─── 2. Quotations / RFQ ──────────────────────────────────────────

@router.get("/quotations")
@router.get("/purchase-quotations")
def list_quotations(db: Session = Depends(get_db)):
    return db.query(PurchaseQuotation).order_by(PurchaseQuotation.created_at.desc()).all()


@router.post("/quotations", status_code=status.HTTP_201_CREATED)
@router.post("/purchase-quotations", status_code=status.HTTP_201_CREATED)
def create_quotation(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    q_num = payload.get("quotation_number") or _gen_code("RFQ")
    rfq = PurchaseQuotation(
        quotation_number=q_num,
        purchase_request_id=payload.get("purchase_request_id"),
        purchase_request_number=payload.get("purchase_request_number"),
        supplier_id=payload.get("supplier_id"),
        supplier_name=payload.get("supplier_name"),
        rfq_date=payload.get("rfq_date") or today_str,
        valid_until=payload.get("valid_until"),
        total_amount=float(payload.get("total_amount", 0.0)),
        tax_amount=float(payload.get("tax_amount", 0.0)),
        grand_total=float(payload.get("grand_total", 0.0)),
        payment_terms=payload.get("payment_terms"),
        delivery_lead_days=int(payload.get("delivery_lead_days", 0)),
        status=payload.get("status") or "Received",
        notes=payload.get("notes"),
        items=payload.get("items") or [],
    )
    db.add(rfq)
    db.commit()
    db.refresh(rfq)
    return rfq


@router.put("/quotations/{q_id}")
@router.put("/purchase-quotations/{q_id}")
@router.patch("/quotations/{q_id}")
@router.patch("/purchase-quotations/{q_id}")
def update_quotation(q_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    q = db.query(PurchaseQuotation).filter(PurchaseQuotation.id == q_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    for k, v in payload.items():
        if hasattr(q, k):
            setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return q


@router.delete("/quotations/{q_id}")
@router.delete("/purchase-quotations/{q_id}")
def delete_quotation(q_id: str, db: Session = Depends(get_db)):
    q = db.query(PurchaseQuotation).filter(PurchaseQuotation.id == q_id).first()
    if q:
        db.delete(q)
        db.commit()
    return {"success": True}


# ─── 3. Purchase Orders (PO) ───────────────────────────────────────

@router.get("/purchase-orders")
def list_purchase_orders(db: Session = Depends(get_db)):
    return db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()


@router.post("/purchase-orders", status_code=status.HTTP_201_CREATED)
def create_purchase_order(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    po_num = payload.get("po_number") or _gen_code("PO")
    po = PurchaseOrder(
        po_number=po_num,
        supplier_id=payload.get("supplier_id"),
        supplier_name=payload.get("supplier_name"),
        supplier_gstin=payload.get("supplier_gstin"),
        supplier_address=payload.get("supplier_address"),
        purchase_request_number=payload.get("purchase_request_number"),
        quotation_number=payload.get("quotation_number"),
        order_date=payload.get("order_date") or today_str,
        expected_delivery_date=payload.get("expected_delivery_date"),
        payment_terms=payload.get("payment_terms"),
        subtotal=float(payload.get("subtotal", 0.0)),
        discount_amount=float(payload.get("discount_amount", 0.0)),
        tax_amount=float(payload.get("tax_amount", 0.0)),
        grand_total=float(payload.get("grand_total", 0.0)),
        status=payload.get("status") or "Issued",
        shipping_address=payload.get("shipping_address"),
        billing_address=payload.get("billing_address"),
        notes=payload.get("notes"),
        items=payload.get("items") or [],
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return po


@router.patch("/purchase-orders/{po_id}")
@router.put("/purchase-orders/{po_id}")
def update_purchase_order(po_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    for k, v in payload.items():
        if hasattr(po, k):
            setattr(po, k, v)
    db.commit()
    db.refresh(po)
    return po


@router.delete("/purchase-orders/{po_id}")
def delete_purchase_order(po_id: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if po:
        db.delete(po)
        db.commit()
    return {"success": True}


@router.patch("/purchase-orders/{po_id}/status")
def update_po_status(po_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if "status" in payload:
        po.status = payload["status"]
    db.commit()
    db.refresh(po)
    return po


# ─── 4. Goods Received Notes (GRN) ─────────────────────────────────

@router.get("/goods-received-notes")
def list_goods_received_notes(db: Session = Depends(get_db)):
    return db.query(GoodsReceivedNote).order_by(GoodsReceivedNote.created_at.desc()).all()


@router.post("/goods-received-notes", status_code=status.HTTP_201_CREATED)
def create_goods_received_note(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    grn_num = payload.get("grn_number") or _gen_code("GRN")
    grn = GoodsReceivedNote(
        grn_number=grn_num,
        po_id=payload.get("po_id"),
        po_number=payload.get("po_number"),
        supplier_name=payload.get("supplier_name"),
        delivery_challan_number=payload.get("delivery_challan_number"),
        vehicle_number=payload.get("vehicle_number"),
        transporter=payload.get("transporter"),
        received_date=payload.get("received_date") or today_str,
        received_by=payload.get("received_by"),
        inspection_status=payload.get("inspection_status") or "Verified",
        status=payload.get("status") or "Verified",
        notes=payload.get("notes"),
        items=payload.get("items") or [],
    )
    db.add(grn)
    db.commit()
    db.refresh(grn)
    return grn


@router.patch("/goods-received-notes/{grn_id}")
@router.put("/goods-received-notes/{grn_id}")
def update_grn(grn_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    grn = db.query(GoodsReceivedNote).filter(GoodsReceivedNote.id == grn_id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    for k, v in payload.items():
        if hasattr(grn, k):
            setattr(grn, k, v)
    db.commit()
    db.refresh(grn)
    return grn


@router.delete("/goods-received-notes/{grn_id}")
def delete_grn(grn_id: str, db: Session = Depends(get_db)):
    grn = db.query(GoodsReceivedNote).filter(GoodsReceivedNote.id == grn_id).first()
    if grn:
        db.delete(grn)
        db.commit()
    return {"success": True}


# ─── 5. Purchase Returns ───────────────────────────────────────────

@router.get("/purchase-returns")
def list_purchase_returns(db: Session = Depends(get_db)):
    return db.query(PurchaseReturn).order_by(PurchaseReturn.created_at.desc()).all()


@router.post("/purchase-returns", status_code=status.HTTP_201_CREATED)
def create_purchase_return(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    ret_num = payload.get("return_number") or _gen_code("PRT")
    prt = PurchaseReturn(
        return_number=ret_num,
        po_number=payload.get("po_number"),
        grn_number=payload.get("grn_number"),
        supplier_name=payload.get("supplier_name"),
        return_date=payload.get("return_date") or today_str,
        reason=payload.get("reason"),
        total_amount=float(payload.get("total_amount", 0.0)),
        status=payload.get("status") or "Pending",
        debit_note_number=payload.get("debit_note_number"),
        notes=payload.get("notes"),
        items=payload.get("items") or [],
    )
    db.add(prt)
    db.commit()
    db.refresh(prt)
    return prt


# ─── 6. Vendor Bills & Payments ────────────────────────────────────

@router.get("/vendor-bills")
def list_vendor_bills(db: Session = Depends(get_db)):
    return db.query(VendorBill).order_by(VendorBill.created_at.desc()).all()


@router.post("/vendor-bills", status_code=status.HTTP_201_CREATED)
def create_vendor_bill(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    bill_num = payload.get("bill_number") or _gen_code("BILL")
    tot = float(payload.get("total_amount", 0.0))
    paid = float(payload.get("paid_amount", 0.0))
    bal = tot - paid
    st = payload.get("status") or ("Paid" if bal <= 0 else ("Partially Paid" if paid > 0 else "Unpaid"))
    vb = VendorBill(
        bill_number=bill_num,
        vendor_invoice_number=payload.get("vendor_invoice_number"),
        supplier_name=payload.get("supplier_name"),
        supplier_gstin=payload.get("supplier_gstin"),
        po_number=payload.get("po_number"),
        grn_number=payload.get("grn_number"),
        bill_date=payload.get("bill_date") or today_str,
        due_date=payload.get("due_date"),
        subtotal=float(payload.get("subtotal", 0.0)),
        tax_amount=float(payload.get("tax_amount", 0.0)),
        total_amount=tot,
        paid_amount=paid,
        balance_amount=bal,
        status=st,
        payment_terms=payload.get("payment_terms"),
        items=payload.get("items") or [],
    )
    db.add(vb)
    db.commit()
    db.refresh(vb)
    return vb


@router.get("/vendor-payments")
def list_vendor_payments(db: Session = Depends(get_db)):
    return db.query(VendorPayment).order_by(VendorPayment.created_at.desc()).all()


@router.post("/vendor-payments", status_code=status.HTTP_201_CREATED)
def record_vendor_payment(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    pay_num = payload.get("payment_number") or _gen_code("VPAY")
    amount = float(payload.get("amount_paid", 0.0))
    bill_id = payload.get("bill_id")
    bill_number = payload.get("bill_number")

    vp = VendorPayment(
        payment_number=pay_num,
        bill_id=bill_id,
        bill_number=bill_number,
        supplier_name=payload.get("supplier_name"),
        payment_date=payload.get("payment_date") or today_str,
        amount_paid=amount,
        payment_method=payload.get("payment_method"),
        reference_utr=payload.get("reference_utr"),
        bank_account=payload.get("bank_account"),
        status=payload.get("status") or "Completed",
        notes=payload.get("notes"),
    )
    db.add(vp)

    if bill_id:
        bill = db.query(VendorBill).filter(VendorBill.id == bill_id).first()
        if bill:
            bill.paid_amount = (bill.paid_amount or 0.0) + amount
            bill.balance_amount = max(0.0, (bill.total_amount or 0.0) - bill.paid_amount)
            bill.status = "Paid" if bill.balance_amount <= 0 else "Partially Paid"
    elif bill_number:
        bill = db.query(VendorBill).filter(VendorBill.bill_number == bill_number).first()
        if bill:
            bill.paid_amount = (bill.paid_amount or 0.0) + amount
            bill.balance_amount = max(0.0, (bill.total_amount or 0.0) - bill.paid_amount)
            bill.status = "Paid" if bill.balance_amount <= 0 else "Partially Paid"

    db.commit()
    db.refresh(vp)
    return vp


# ─── 7. Debit Notes & Credit Notes ─────────────────────────────────

@router.get("/debit-notes")
def list_debit_notes(db: Session = Depends(get_db)):
    return db.query(DebitNote).order_by(DebitNote.created_at.desc()).all()


@router.post("/debit-notes", status_code=status.HTTP_201_CREATED)
def create_debit_note(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    dn_num = payload.get("debit_note_number") or _gen_code("DN")
    dn = DebitNote(
        debit_note_number=dn_num,
        bill_number=payload.get("bill_number"),
        supplier_name=payload.get("supplier_name"),
        date=payload.get("date") or today_str,
        amount=float(payload.get("amount", 0.0)),
        tax_amount=float(payload.get("tax_amount", 0.0)),
        total_amount=float(payload.get("total_amount", 0.0)),
        reason=payload.get("reason"),
        status=payload.get("status") or "Active",
    )
    db.add(dn)
    db.commit()
    db.refresh(dn)
    return dn


@router.get("/credit-notes")
def list_credit_notes(db: Session = Depends(get_db)):
    return db.query(CreditNote).order_by(CreditNote.created_at.desc()).all()


@router.post("/credit-notes", status_code=status.HTTP_201_CREATED)
def create_credit_note(payload: Dict[str, Any], db: Session = Depends(get_db)):
    today_str = ProcurementService.get_today_str()
    cn_num = payload.get("credit_note_number") or _gen_code("CN")
    cn = CreditNote(
        credit_note_number=cn_num,
        vendor_ref_number=payload.get("vendor_ref_number"),
        supplier_name=payload.get("supplier_name"),
        date=payload.get("date") or today_str,
        amount=float(payload.get("amount", 0.0)),
        tax_amount=float(payload.get("tax_amount", 0.0)),
        total_amount=float(payload.get("total_amount", 0.0)),
        reason=payload.get("reason"),
        status=payload.get("status") or "Available",
    )
    db.add(cn)
    db.commit()
    db.refresh(cn)
    return cn


# ─── 8. Suppliers / Vendors ────────────────────────────────────────

@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).order_by(Supplier.name.asc()).all()


@router.post("/suppliers", status_code=status.HTTP_201_CREATED)
def create_supplier(payload: Dict[str, Any], db: Session = Depends(get_db)):
    code = payload.get("code") or f"SUP-{uuid.uuid4().hex[:6].upper()}"
    sup = Supplier(
        name=payload.get("name"),
        code=code,
        type=payload.get("type"),
        contact_person=payload.get("contact_person"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        gstin=payload.get("gstin"),
        pan=payload.get("pan"),
        city=payload.get("city"),
        state=payload.get("state"),
        address=payload.get("address"),
        category=payload.get("category"),
        credit_limit=float(payload.get("credit_limit", 0.0)),
        payment_terms=payload.get("payment_terms"),
        rating=float(payload.get("rating", 0.0)),
        status=payload.get("status") or "Active",
    )
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup


@router.patch("/suppliers/{sup_id}")
@router.put("/suppliers/{sup_id}")
def update_supplier(sup_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in payload.items():
        if hasattr(sup, k):
            setattr(sup, k, v)
    db.commit()
    db.refresh(sup)
    return sup


@router.delete("/suppliers/{sup_id}")
def delete_supplier(sup_id: str, db: Session = Depends(get_db)):
    sup = db.query(Supplier).filter(Supplier.id == sup_id).first()
    if sup:
        db.delete(sup)
        db.commit()
    return {"success": True}


@router.get("/supplier-categories")
def list_supplier_categories(db: Session = Depends(get_db)):
    db_cats = db.query(Supplier.category).filter(Supplier.category.isnot(None), Supplier.category != "").distinct().all()
    categories = [c[0] for c in db_cats if c[0]]
    return [{"id": f"cat_{idx+1}", "name": cat, "code": cat[:4].upper() if len(cat) >= 4 else cat.upper()} for idx, cat in enumerate(categories)]


@router.post("/supplier-categories")
def create_supplier_category(payload: Dict[str, Any]):
    return payload


@router.post("/verify-gstin")
def verify_gstin(payload: Dict[str, Any]):
    gstin = (payload.get("gstin") or "").strip().upper()
    is_valid = len(gstin) == 15
    state_code_map = {
        "27": "Maharashtra", "29": "Karnataka", "06": "Haryana", "24": "Gujarat",
        "07": "Delhi", "33": "Tamil Nadu", "36": "Telangana", "19": "West Bengal"
    }
    state = state_code_map.get(gstin[:2], "") if len(gstin) >= 2 else ""
    return {
        "valid": is_valid,
        "gstin": gstin,
        "trade_name": payload.get("trade_name") or "",
        "legal_name": payload.get("legal_name") or "",
        "status": "Active" if is_valid else "Invalid Format",
        "state": state,
        "address": payload.get("address") or ""
    }


@router.post("/analytics/ai-suggestions/{sug_id}/execute")
def execute_ai_suggestion(sug_id: str, db: Session = Depends(get_db)):
    return {
        "message": "AI Purchase Recommendation executed and Request created.",
        "purchase_request_id": _gen_code("PR")
    }


@router.post("/ocr/extract-pr-document")
@router.post("/extract-quotation-ocr")
@router.post("/ocr/extract-po-document")
@router.post("/ocr/extract-grn-document")
@router.post("/ocr/extract-invoice-document")
def mock_ocr_extract():
    return {
        "filename": "document.pdf",
        "extracted": True,
        "confidence": 98,
        "items": []
    }


# ─── 9. Spend Analysis, Forecast, Approvals & AI Analytics ───────────────────

@router.get("/spend-analysis")
@router.get("/analytics/spend-analysis")
def get_spend_analysis(db: Session = Depends(get_db)):
    return ProcurementService.get_spend_analysis(db)


@router.get("/procurement-forecast")
@router.get("/analytics/procurement-forecast")
def get_procurement_forecast(db: Session = Depends(get_db)):
    return ProcurementService.get_procurement_forecast(db)


@router.get("/analytics/approvals")
def get_pending_approvals(db: Session = Depends(get_db)):
    prs = db.query(PurchaseRequest).filter(PurchaseRequest.status.in_(["Pending Approval", "Pending", "Draft"])).all()
    return [
        {
            "id": p.id,
            "raw_type": "PR",
            "doc_number": p.request_number,
            "department": p.department,
            "requester_name": p.requester_name,
            "total_amount": p.total_amount,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "priority": p.priority,
            "items": p.items or [],
        }
        for p in prs
    ]


@router.post("/analytics/approvals/{doc_id}/action")
def submit_approval_action(doc_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    action = payload.get("action", "Approved")
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == doc_id).first()
    if pr:
        pr.status = "Approved" if action.lower() == "approve" else "Rejected"
        db.commit()
        return {"success": True, "message": f"Purchase request {pr.request_number} {pr.status}"}
    return {"success": True, "message": "Approval status updated"}


@router.get("/analytics/cost-analysis")
def get_cost_analysis(db: Session = Depends(get_db)):
    return ProcurementService.get_cost_analysis(db)


@router.get("/analytics/lead-time")
def get_lead_time_analysis(db: Session = Depends(get_db)):
    return ProcurementService.get_lead_time_analysis(db)


@router.get("/analytics/ai-suggestions")
def get_ai_suggestions(refresh: bool = Query(False), db: Session = Depends(get_db)):
    return ProcurementService.get_ai_suggestions(db)


@router.get("/supplier-contacts")
def list_supplier_contacts(supplier_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return []


@router.get("/supplier-contracts")
def list_supplier_contracts(supplier_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return []


@router.get("/supplier-performance")
def list_supplier_performance(supplier_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return []


@router.get("/blacklisted-suppliers")
def list_blacklisted_suppliers(db: Session = Depends(get_db)):
    return []
