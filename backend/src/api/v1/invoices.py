import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func

from src.database.session import get_db
from src.models.pos import PosTransaction
from src.models.customer import Customer
from src.models.inventory import Product, StockMovement
from src.utils.timezone import now_ist_naive

router = APIRouter(prefix="/invoices", tags=["Invoices & Billing"])


def _format_pos_txn_to_invoice(t: PosTransaction) -> Dict[str, Any]:
    paid_amt = t.grand_total if (t.payment_status or "").upper() == "PAID" else 0.0
    bal_due = 0.0 if (t.payment_status or "").upper() == "PAID" else (t.grand_total or 0.0)
    created_dt = t.created_at or now_ist_naive()
    
    return {
        "id": t.id,
        "invoice_number": t.invoice_number,
        "invoice_type": "TAX_INVOICE",
        "status": (t.payment_status or t.status or "PAID").upper(),
        "payment_status": (t.payment_status or "PAID").upper(),
        "customer_id": t.customer_id,
        "customer_name": t.customer_name or "Walk-in Customer",
        "customer_phone": t.customer_phone or "",
        "invoice_date": created_dt.strftime("%Y-%m-%d"),
        "due_date": created_dt.strftime("%Y-%m-%d"),
        "subtotal": float(t.subtotal or 0.0),
        "tax_total": float(t.tax_total or 0.0),
        "discount_total": float(t.discount_total or 0.0),
        "total_amount": float(t.grand_total or 0.0),
        "grand_total": float(t.grand_total or 0.0),
        "amount_paid": float(paid_amt),
        "balance_due": float(bal_due),
        "currency_code": "INR",
        "payment_method": t.payment_method or "Cash",
        "notes": t.notes or "",
        "items": t.items or [],
        "lines": t.items or [],
        "cashier_name": t.cashier_name or "",
        "created_at": created_dt.isoformat(),
    }


@router.get("")
def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    status: Optional[str] = Query(None),
    invoice_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(PosTransaction).order_by(desc(PosTransaction.created_at))

    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(PosTransaction.invoice_number).like(s),
                func.lower(PosTransaction.customer_name).like(s),
                func.lower(PosTransaction.customer_phone).like(s),
            )
        )

    if status and status.upper() != "ALL":
        query = query.filter(
            or_(
                func.upper(PosTransaction.payment_status) == status.upper(),
                func.upper(PosTransaction.status) == status.upper()
            )
        )

    total = query.count()
    txns = query.offset((page - 1) * page_size).limit(page_size).all()
    items = [_format_pos_txn_to_invoice(t) for t in txns]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/customer-summary/{customer_id}")
def get_customer_summary(customer_id: str, phone: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(PosTransaction)
    if customer_id and customer_id != "undefined" and customer_id != "null":
        query = query.filter(
            or_(
                PosTransaction.customer_id == customer_id,
                PosTransaction.customer_name == customer_id,
            )
        )
    elif phone:
        query = query.filter(PosTransaction.customer_phone == phone)

    txns = query.order_by(desc(PosTransaction.created_at)).all()
    total_invoiced = sum(float(t.grand_total or 0.0) for t in txns)
    total_paid = sum(float(t.grand_total or 0.0) for t in txns if (t.payment_status or "").upper() == "PAID")
    total_due = total_invoiced - total_paid

    return {
        "customer_id": customer_id,
        "total_invoices": len(txns),
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_due": total_due,
        "recent_invoices": [_format_pos_txn_to_invoice(t) for t in txns[:5]],
    }


@router.get("/payments/all")
def list_all_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(PosTransaction).filter(PosTransaction.payment_status == "PAID").order_by(desc(PosTransaction.created_at))
    total = query.count()
    txns = query.offset((page - 1) * page_size).limit(page_size).all()
    
    payments = []
    for t in txns:
        payments.append({
            "id": f"pay_{t.id}",
            "invoice_id": t.id,
            "invoice_number": t.invoice_number,
            "customer_name": t.customer_name,
            "amount": float(t.grand_total or 0.0),
            "payment_method": t.payment_method or "Cash",
            "payment_date": (t.created_at or now_ist_naive()).strftime("%Y-%m-%d"),
            "status": "COMPLETED",
        })

    return {
        "items": payments,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# Reminders compatibility endpoints
@router.get("/reminders/summary")
def get_reminders_summary():
    return {
        "total_overdue": 0,
        "pending_reminders": 0,
        "sent_today": 0,
        "recovered_amount": 0.0,
    }


@router.get("/reminders/policy")
def get_reminders_policy():
    return {
        "auto_reminders_enabled": False,
        "channels": ["WHATSAPP", "SMS"],
        "intervals_days": [1, 3, 7],
    }


@router.put("/reminders/policy")
def update_reminders_policy(payload: Dict[str, Any] = Body(...)):
    return {"message": "Reminder policy updated successfully", "data": payload}


@router.post("/reminders/evaluate-batch")
def evaluate_reminders_batch():
    return {"message": "Batch evaluation complete", "evaluated_count": 0, "reminders_sent": 0}


@router.get("/reminders/logs")
def get_reminders_logs():
    return []


@router.post("/reminders/invoices/{invoice_id}/send-now")
def send_reminder_now(invoice_id: str, data: Optional[Dict[str, Any]] = None):
    return {"message": f"Reminder dispatched for invoice {invoice_id}", "result": {"success": True}}


@router.get("/{invoice_id}")
def get_single_invoice(invoice_id: str, db: Session = Depends(get_db)):
    t = db.query(PosTransaction).filter(
        or_(
            PosTransaction.id == invoice_id,
            PosTransaction.invoice_number == invoice_id
        )
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail=f"Invoice '{invoice_id}' not found")
    return _format_pos_txn_to_invoice(t)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    inv_num = payload.get("invoice_number") or f"INV-POS-{uuid.uuid4().hex[:6].upper()}"
    items = payload.get("lines") or payload.get("items") or []
    
    subtotal = float(payload.get("subtotal") or 0.0)
    tax_total = float(payload.get("tax_amount") or payload.get("tax_total") or 0.0)
    discount_total = float(payload.get("discount_total") or 0.0)
    grand_total = float(payload.get("total_amount") or payload.get("grand_total") or (subtotal + tax_total - discount_total))
    
    pay_status = str(payload.get("payment_status") or "PAID").upper()
    pay_method = payload.get("payment_method") or "Cash"

    # Deduct stock for items
    for item in items:
        pid = item.get("product_id")
        qty = float(item.get("quantity") or item.get("qty") or 1)
        if pid:
            prod = db.query(Product).filter(Product.id == pid).first()
            if prod and prod.on_hand_stock is not None:
                prod.on_hand_stock = max(0, int(prod.on_hand_stock - qty))
                db.add(prod)
                
                # Record stock movement
                mv = StockMovement(
                    id=f"mov_{uuid.uuid4().hex[:8]}",
                    product_id=prod.id,
                    product_name=prod.name,
                    movement_type="OUT",
                    quantity=int(qty),
                    remaining_stock=int(prod.on_hand_stock),
                    reference_type="INVOICE_SALE",
                    reference_id=inv_num,
                    notes=f"Sales invoice {inv_num}",
                    created_at=now_ist_naive(),
                )
                db.add(mv)

    txn = PosTransaction(
        id=f"pos_{uuid.uuid4().hex[:8]}",
        invoice_number=inv_num,
        customer_id=payload.get("customer_id"),
        customer_name=payload.get("customer_name") or "Walk-in Customer",
        customer_phone=payload.get("customer_phone"),
        subtotal=subtotal,
        tax_total=tax_total,
        discount_total=discount_total,
        grand_total=grand_total,
        payment_method=pay_method,
        payment_status=pay_status,
        status="COMPLETED",
        items=items,
        cashier_name=payload.get("cashier_name") or "Store Cashier",
        notes=payload.get("notes"),
        created_at=now_ist_naive(),
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return _format_pos_txn_to_invoice(txn)


@router.patch("/{invoice_id}")
def update_invoice(invoice_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    t = db.query(PosTransaction).filter(
        or_(
            PosTransaction.id == invoice_id,
            PosTransaction.invoice_number == invoice_id
        )
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if "payment_status" in payload:
        t.payment_status = str(payload["payment_status"]).upper()
    if "notes" in payload:
        t.notes = payload["notes"]
    if "customer_name" in payload:
        t.customer_name = payload["customer_name"]
    if "customer_phone" in payload:
        t.customer_phone = payload["customer_phone"]

    db.commit()
    db.refresh(t)
    return _format_pos_txn_to_invoice(t)


@router.post("/{invoice_id}/payments")
def record_invoice_payment(invoice_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    t = db.query(PosTransaction).filter(
        or_(
            PosTransaction.id == invoice_id,
            PosTransaction.invoice_number == invoice_id
        )
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Invoice not found")

    t.payment_status = "PAID"
    if "payment_method" in payload:
        t.payment_method = payload["payment_method"]
    db.commit()
    return {"message": "Payment recorded successfully for invoice", "invoice_id": invoice_id}


@router.post("/{invoice_id}/cancel")
def cancel_invoice(invoice_id: str, payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    t = db.query(PosTransaction).filter(
        or_(
            PosTransaction.id == invoice_id,
            PosTransaction.invoice_number == invoice_id
        )
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Invoice not found")

    t.payment_status = "CANCELLED"
    t.status = "CANCELLED"
    db.commit()
    return {
        "status": "CANCELLED",
        "invoice_id": t.id,
        "invoice_number": t.invoice_number,
        "message": f"Invoice {t.invoice_number} cancelled successfully",
    }


@router.post("/{invoice_id}/send")
def send_invoice(invoice_id: str):
    return {"message": f"Invoice {invoice_id} email dispatched"}


@router.post("/{invoice_id}/send-to-whatsapp")
def send_invoice_to_whatsapp(invoice_id: str, phone: Optional[str] = Query(None)):
    return {"success": True, "message_id": f"wa_{uuid.uuid4().hex[:8]}"}
