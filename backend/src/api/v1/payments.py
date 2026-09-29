import os
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.database.session import get_db
from src.models.membership import Membership
from src.models.customer import Customer
from src.models.plan import MembershipPlan
from src.models.pos import PosTransaction
from src.models.hrms import (
    Employee,
    Payslip,
    SalaryAdvance,
    EmployeeBonus,
    SalesCommission,
)
from src.models.payroll import PayrollInvoice
from src.models.trainer import TrainerProfile
from src.services.pinelabs_service import PineLabsService
from src.services.razorpay_service import RazorpayService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


class PineLabsChargeRequest(BaseModel):
    amount: float
    bill_number: str
    customer_mobile: Optional[str] = None
    payment_mode: Optional[str] = "CARD"  # CARD | TAP_NFC | UPI_QR
    terminal_id: Optional[str] = None


class PineLabsCancelRequest(BaseModel):
    transaction_id: str
    terminal_id: Optional[str] = None


class RazorpayOrderRequest(BaseModel):
    amount: float
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None


class RazorpayQRRequest(BaseModel):
    amount: float
    receipt: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None


class RazorpayLinkRequest(BaseModel):
    amount: float
    customer_phone: str
    customer_name: Optional[str] = None
    bill_number: Optional[str] = None
    notes: Optional[Dict[str, Any]] = None


class RazorpayVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str


# ─── 1. Pine Labs Handheld EDC Routes ─────────────────────────────────

@router.post("/pinelabs/charge")
async def pinelabs_charge_terminal(payload: PineLabsChargeRequest):
    """Pushes a card swipe / NFC tap / Dynamic QR payment prompt to the Pine Labs Handheld EDC Terminal."""
    tid = payload.terminal_id or os.getenv("PINELABS_TERMINAL_ID", "")
    svc = PineLabsService(terminal_id=tid)
    return await svc.initiate_transaction(
        amount=payload.amount,
        bill_number=payload.bill_number,
        customer_mobile=payload.customer_mobile,
        payment_mode=payload.payment_mode or "CARD",
    )


@router.post("/pinelabs/cancel")
async def pinelabs_cancel_transaction(payload: PineLabsCancelRequest):
    """Aborts a pending waiting prompt on the handheld terminal."""
    tid = payload.terminal_id or os.getenv("PINELABS_TERMINAL_ID", "")
    svc = PineLabsService(terminal_id=tid)
    return await svc.cancel_transaction(payload.transaction_id)


# ─── 2. Razorpay POS / UPI Routes ──────────────────────────────────────

@router.post("/razorpay/create-order")
async def razorpay_create_order(payload: RazorpayOrderRequest):
    """Creates an authentic Razorpay Order for POS counter checkout."""
    svc = RazorpayService()
    try:
        return await svc.create_order(
            amount=payload.amount,
            receipt=payload.receipt,
            notes=payload.notes,
        )
    except Exception as exc:
        logger.error("Razorpay create-order failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create Razorpay Order: {exc}",
        )


@router.post("/razorpay/qr-code")
async def razorpay_create_qr_code(payload: RazorpayQRRequest):
    """Generates a dynamic Razorpay UPI QR Code or hosted Payment Link QR."""
    svc = RazorpayService()
    order_desc = f"Bill #{payload.receipt}" if payload.receipt else "Counter Checkout"
    try:
        qr_data = await svc.create_qr_code(
            amount=payload.amount,
            name="POS Counter Checkout",
            description=order_desc,
            notes=payload.notes,
        )
        return qr_data
    except Exception as exc:
        logger.warning(
            "Razorpay native QR API not enabled on merchant account (%s), creating live Razorpay Payment Link instead.",
            exc,
        )
        try:
            link_data = await svc.create_payment_link(
                amount=payload.amount,
                description=order_desc,
                notes=payload.notes,
            )
            return {
                "id": link_data.get("id"),
                "image_url": None,
                "upi_intent": link_data.get("short_url"),
                "short_url": link_data.get("short_url"),
                "amount": link_data.get("amount", int(payload.amount * 100)),
                "status": "active",
                "is_link_fallback": True,
            }
        except Exception as link_exc:
            logger.error("Razorpay create-link fallback also failed: %s", link_exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to generate live Razorpay payment: {link_exc}",
            )


@router.post("/razorpay/payment-link")
async def razorpay_create_payment_link(payload: RazorpayLinkRequest):
    """Generates and SMS/WhatsApp dispatches a live Razorpay Payment Link."""
    svc = RazorpayService()
    bill_desc = f"Bill #{payload.bill_number}" if payload.bill_number else "Payment Link"
    try:
        return await svc.create_payment_link(
            amount=payload.amount,
            customer_phone=payload.customer_phone,
            customer_name=payload.customer_name or "",
            description=bill_desc,
            notes=payload.notes,
        )
    except Exception as exc:
        logger.error("Razorpay create payment link failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create Razorpay Payment Link: {exc}",
        )
    except Exception as exc:
        logger.error("Razorpay create payment link failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create Razorpay Payment Link: {exc}",
        )


@router.get("/razorpay/payment-link/{link_id}/status")
async def razorpay_payment_link_status(link_id: str):
    """Polls real-time payment status of an SMS/UPI Payment Link from Razorpay."""
    svc = RazorpayService()
    try:
        link_info = await svc.fetch_payment_link(link_id)
        is_paid = link_info.get("status") == "paid"
        payments_list = link_info.get("payments", []) or []
        last_pay = payments_list[-1] if payments_list else {}
        return {
            "link_id": link_id,
            "status": link_info.get("status"),
            "is_paid": is_paid,
            "payment_id": last_pay.get("payment_id"),
            "amount_paid": (link_info.get("amount_paid", 0) / 100),
        }
    except Exception as exc:
        logger.error("Razorpay check link status error: %s", exc)
        return {"link_id": link_id, "status": "unknown", "is_paid": False, "error": str(exc)}


@router.get("/razorpay/qr/{qr_id}/status")
async def razorpay_check_qr_status(qr_id: str):
    """Polls live QR code payment status directly from Razorpay."""
    svc = RazorpayService()
    try:
        qr_info = await svc.fetch_qr_code(qr_id)
        payments_received = qr_info.get("payments_amount_received", 0)
        is_paid = payments_received > 0 or qr_info.get("status") == "closed"
        return {
            "qr_id": qr_id,
            "status": qr_info.get("status"),
            "is_paid": is_paid,
            "amount_paid": payments_received / 100,
        }
    except Exception as exc:
        logger.error("Razorpay check QR status error: %s", exc)
        return {"qr_id": qr_id, "status": "unknown", "is_paid": False, "error": str(exc)}


@router.post("/razorpay/verify")
async def razorpay_verify_payment(payload: RazorpayVerifyRequest):
    """Verifies HMAC-SHA256 signature generated by Razorpay Checkout."""
    svc = RazorpayService()
    valid = svc.verify_signature(
        order_id=payload.order_id,
        payment_id=payload.payment_id,
        signature=payload.signature,
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cryptographic signature for Razorpay payment.",
        )
    return {"success": True, "message": "Razorpay payment verified successfully."}


# ─── 3. Unified Financial & Payments Audit Ledger ─────────────────────

def _resolve_membership_amount(mem: Membership, plans_map: Dict[str, float]) -> float:
    if mem.paid_amount is not None and mem.paid_amount > 0:
        return float(mem.paid_amount)
    if mem.price is not None and mem.price > 0:
        return float(mem.price)
    if mem.plan_name:
        key = mem.plan_name.strip().lower()
        if key in plans_map:
            return float(plans_map[key])
    return float(mem.price or 0.0)


@router.get("/audit")
@router.get("/transactions")
def get_payments_audit_ledger(
    category: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),  # INFLOW, OUTFLOW
    method: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Returns the dynamic, unified multi-channel payment audit ledger covering:
    1. Membership Subscriptions & Renewals (Inflow)
    2. Point of Sale (POS) Counter / Store Sales (Inflow)
    3. Staff Salary & HRMS Disbursements (Outflow)
    4. Employee Salary Advances (Outflow)
    5. Employee Performance & Festival Bonuses (Outflow)
    6. Trainer PT Commissions & Invoices (Outflow)
    """
    plans = db.query(MembershipPlan).all()
    plans_map = {p.name.strip().lower(): float(p.price) for p in plans if p.name and p.price}

    all_txs: List[Dict[str, Any]] = []

    # 1. Memberships
    try:
        mem_rows = (
            db.query(Membership, Customer)
            .join(Customer, Customer.id == Membership.customer_id)
            .order_by(desc(Membership.created_at))
            .all()
        )
        for mem, cust in mem_rows:
            amount = _resolve_membership_amount(mem, plans_map)
            paid_amt = float(mem.paid_amount if mem.paid_amount is not None else amount)
            due_amt = float(mem.due_amount if mem.due_amount is not None else max(0.0, amount - paid_amt))
            
            raw_status = (mem.status or "COMPLETED").upper()
            tx_status = "COMPLETED" if raw_status in ("ACTIVE", "PAID", "COMPLETED") else raw_status
            if due_amt > 0 and paid_amt == 0:
                tx_status = "PENDING"

            payment_method = getattr(mem, "payment_method", None) or "Cash"
            inv_num = getattr(mem, "invoice_number", None) or f"INV-MEM-{(mem.id or '')[-6:].upper()}"

            dt = mem.created_at or datetime.utcnow()
            all_txs.append({
                "id": f"tx_mem_{mem.id}",
                "source_id": mem.id,
                "category": "MEMBERSHIP",
                "category_label": "Membership Subscription",
                "type": "INFLOW",
                "invoice_number": inv_num,
                "entity_name": cust.full_name or "",
                "entity_type": "Customer",
                "entity_id": cust.id,
                "entity_phone": cust.phone or "",
                "entity_email": cust.email or "",
                "description": f"{mem.plan_name or ''} {mem.plan_type or ''}".strip() or "Membership",
                "amount": amount,
                "paid_amount": paid_amt,
                "due_amount": due_amt,
                "payment_method": payment_method,
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
                "details": {
                    "plan_name": mem.plan_name,
                    "plan_type": mem.plan_type,
                    "start_date": mem.start_date.isoformat() if mem.start_date else None,
                    "expiry_date": mem.expiry_date.isoformat() if mem.expiry_date else None,
                    "benefits": mem.benefits or [],
                },
            })
    except Exception as exc:
        logger.error("Error loading membership transactions: %s", exc)

    # 2. POS Store Transactions
    try:
        pos_rows = db.query(PosTransaction).order_by(desc(PosTransaction.created_at)).all()
        for pos in pos_rows:
            raw_st = (pos.payment_status or pos.status or "").upper()
            tx_status = "COMPLETED" if raw_st in ("PAID", "COMPLETED") else raw_st
            
            p_method = pos.payment_method or "Cash"
            dt = pos.created_at or datetime.utcnow()
            
            item_names = [it.get("name", "") for it in (pos.items or []) if isinstance(it, dict) and it.get("name")]
            desc_text = ", ".join(item_names[:3]) + (f" +{len(item_names)-3} more" if len(item_names) > 3 else "")
            if not desc_text:
                desc_text = "POS Sale"

            all_txs.append({
                "id": f"tx_pos_{pos.id}",
                "source_id": pos.id,
                "category": "POS_STORE",
                "category_label": "POS / Store Sale",
                "type": "INFLOW",
                "invoice_number": pos.invoice_number or f"REC-POS-{(pos.id or '')[-6:].upper()}",
                "entity_name": pos.customer_name or "",
                "entity_type": "POS Customer",
                "entity_id": pos.customer_id or "",
                "entity_phone": pos.customer_phone or "",
                "entity_email": "",
                "description": desc_text,
                "amount": float(pos.grand_total or 0.0),
                "subtotal": float(pos.subtotal or 0.0),
                "tax": float(pos.tax_total or 0.0),
                "discount": float(pos.discount_total or 0.0),
                "payment_method": p_method,
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
                "items": pos.items or [],
                "cashier": pos.cashier_name or "",
                "notes": pos.notes or "",
            })
    except Exception as exc:
        logger.error("Error loading POS transactions: %s", exc)

    # 3. HRMS Payslips & Salary Disbursements
    try:
        slip_rows = (
            db.query(Payslip, Employee)
            .join(Employee, Employee.id == Payslip.employee_id)
            .order_by(desc(Payslip.generated_at))
            .all()
        )
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        for slip, emp in slip_rows:
            net_sal = float(slip.net_salary if slip.net_salary is not None else (slip.basic_salary or 0.0))
            raw_st = (slip.status or "").upper()
            tx_status = "COMPLETED" if raw_st in ("DISBURSED", "PAID") else raw_st
            
            p_method = slip.payment_method or "Bank Transfer"
            dt = slip.disbursed_at or slip.generated_at or slip.created_at or datetime.utcnow()
            
            m_idx = slip.month - 1 if (1 <= slip.month <= 12) else 0
            month_label = f"{month_names[m_idx]} {slip.year}" if slip.month and slip.year else ""

            all_txs.append({
                "id": f"tx_slip_{slip.id}",
                "source_id": slip.id,
                "category": "SALARY_PAYOUT",
                "category_label": "Staff Salary Disbursement",
                "type": "OUTFLOW",
                "invoice_number": f"SLIP-{(slip.id or '')[-6:].upper()}",
                "entity_name": f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                "entity_type": f"Staff ({emp.designation})" if emp.designation else "Staff",
                "entity_id": emp.id,
                "entity_phone": emp.phone or "",
                "entity_email": emp.email or "",
                "description": f"Salary Payout {month_label}".strip(),
                "amount": net_sal,
                "gross_salary": float(slip.gross_salary or 0.0),
                "deductions": float(slip.total_deductions or 0.0),
                "payment_method": p_method,
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
                "details": {
                    "basic_salary": slip.basic_salary,
                    "hra": slip.hra,
                    "allowances": slip.other_allowances,
                    "pf": slip.pf_deduction,
                    "esi": slip.esi_deduction,
                    "tds": slip.tds_deduction,
                    "month": slip.month,
                    "year": slip.year,
                },
            })
    except Exception as exc:
        logger.error("Error loading HRMS payslips: %s", exc)

    # 4. Salary Advances
    try:
        adv_rows = (
            db.query(SalaryAdvance, Employee)
            .join(Employee, Employee.id == SalaryAdvance.employee_id)
            .order_by(desc(SalaryAdvance.created_at))
            .all()
        )
        for adv, emp in adv_rows:
            raw_st = (adv.status or "").upper()
            tx_status = "COMPLETED" if raw_st in ("DISBURSED", "APPROVED", "PAID") else raw_st
            dt = adv.disbursed_at or adv.created_at or datetime.utcnow()
            adv_pm = getattr(adv, "payment_method", None) or "Bank Transfer"
            all_txs.append({
                "id": f"tx_adv_{adv.id}",
                "source_id": adv.id,
                "category": "SALARY_ADVANCE",
                "category_label": "Salary Advance",
                "type": "OUTFLOW",
                "invoice_number": f"ADV-{(adv.id or '')[-6:].upper()}",
                "entity_name": f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                "entity_type": "Staff",
                "entity_id": emp.id,
                "entity_phone": emp.phone or "",
                "entity_email": emp.email or "",
                "description": adv.reason or "Salary Advance",
                "amount": float(adv.amount or 0.0),
                "payment_method": adv_pm,
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
                "approved_by": adv.approved_by or "",
            })
    except Exception as exc:
        logger.error("Error loading salary advances: %s", exc)

    # 5. Employee Bonuses
    try:
        bon_rows = (
            db.query(EmployeeBonus, Employee)
            .join(Employee, Employee.id == EmployeeBonus.employee_id)
            .order_by(desc(EmployeeBonus.created_at))
            .all()
        )
        for bon, emp in bon_rows:
            raw_st = (bon.status or "").upper()
            tx_status = "COMPLETED" if raw_st in ("PAID", "APPROVED") else raw_st
            dt = bon.created_at or datetime.utcnow()
            bon_pm = getattr(bon, "payment_method", None) or "Bank Transfer"
            all_txs.append({
                "id": f"tx_bon_{bon.id}",
                "source_id": bon.id,
                "category": "EMPLOYEE_BONUS",
                "category_label": "Staff Bonus",
                "type": "OUTFLOW",
                "invoice_number": f"BON-{(bon.id or '')[-6:].upper()}",
                "entity_name": f"{emp.first_name or ''} {emp.last_name or ''}".strip(),
                "entity_type": "Staff",
                "entity_id": emp.id,
                "entity_phone": emp.phone or "",
                "entity_email": emp.email or "",
                "description": bon.title or "Staff Bonus",
                "amount": float(bon.amount or 0.0),
                "payment_method": bon_pm,
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
            })
    except Exception as exc:
        logger.error("Error loading bonuses: %s", exc)

    # 6. Trainer Payroll Invoices
    try:
        trn_rows = (
            db.query(PayrollInvoice, TrainerProfile)
            .join(TrainerProfile, TrainerProfile.id == PayrollInvoice.trainer_id)
            .order_by(desc(PayrollInvoice.created_at))
            .all()
        )
        for inv, trn in trn_rows:
            raw_st = (inv.status or "").upper()
            tx_status = "COMPLETED" if raw_st in ("PAID", "APPROVED") else raw_st
            dt = inv.paid_at or inv.created_at or datetime.utcnow()
            all_txs.append({
                "id": f"tx_trn_{inv.id}",
                "source_id": inv.id,
                "category": "TRAINER_COMMISSION",
                "category_label": "Trainer PT Commission & Payout",
                "type": "OUTFLOW",
                "invoice_number": f"TRN-{(inv.id or '')[-6:].upper()}",
                "entity_name": trn.full_name or "",
                "entity_type": "Trainer",
                "entity_id": trn.id,
                "entity_phone": trn.phone or "",
                "entity_email": trn.email or "",
                "description": f"PT Sessions & Commission ({inv.month_year})",
                "amount": float(inv.net_salary or 0.0),
                "payment_method": inv.payment_method or "Bank Transfer",
                "status": tx_status,
                "date": dt.isoformat() if dt else "",
                "formatted_date": dt.strftime("%b %d, %Y, %I:%M %p") if dt else "",
                "raw_date": dt,
            })
    except Exception as exc:
        logger.error("Error loading trainer invoices: %s", exc)

    # Sort all transactions chronologically descending
    all_txs.sort(key=lambda x: x["raw_date"], reverse=True)

    # Calculate overall financial analytics across the entire database
    total_inflow = sum(t["amount"] for t in all_txs if t["type"] == "INFLOW" and t["status"] == "COMPLETED")
    total_outflow = sum(t["amount"] for t in all_txs if t["type"] == "OUTFLOW" and t["status"] == "COMPLETED")
    net_cash_flow = total_inflow - total_outflow
    pending_receivables = sum(
        t.get("due_amount", t["amount"]) for t in all_txs if t["type"] == "INFLOW" and t["status"] == "PENDING"
    )

    by_method: Dict[str, Dict[str, Any]] = {}
    for t in all_txs:
        m = t.get("payment_method") or "Other"
        if m not in by_method:
            by_method[m] = {"count": 0, "amount": 0.0, "inflow": 0.0, "outflow": 0.0}
        by_method[m]["count"] += 1
        by_method[m]["amount"] += t["amount"]
        if t["type"] == "INFLOW":
            by_method[m]["inflow"] += t["amount"]
        else:
            by_method[m]["outflow"] += t["amount"]

    by_category: Dict[str, Dict[str, Any]] = {}
    for t in all_txs:
        cat = t.get("category_label") or t.get("category", "General")
        if cat not in by_category:
            by_category[cat] = {"count": 0, "amount": 0.0, "type": t["type"]}
        by_category[cat]["count"] += 1
        by_category[cat]["amount"] += t["amount"]

    # Filter transactions based on query parameters
    filtered_txs = all_txs
    if category and category.lower() != "all":
        c_lower = category.lower()
        filtered_txs = [t for t in filtered_txs if c_lower in t["category"].lower() or c_lower in t["category_label"].lower()]

    if type and type.lower() != "all":
        t_upper = type.upper()
        filtered_txs = [t for t in filtered_txs if t["type"] == t_upper]

    if method and method.lower() != "all":
        m_lower = method.lower()
        filtered_txs = [t for t in filtered_txs if m_lower in (t.get("payment_method") or "").lower()]

    if status and status.lower() != "all":
        st_upper = status.upper()
        filtered_txs = [t for t in filtered_txs if t["status"] == st_upper]

    if search:
        s_query = search.strip().lower()
        filtered_txs = [
            t for t in filtered_txs
            if s_query in t["invoice_number"].lower()
            or s_query in t["entity_name"].lower()
            or s_query in (t.get("entity_phone") or "").lower()
            or s_query in (t.get("entity_email") or "").lower()
            or s_query in (t.get("description") or "").lower()
            or s_query in (t.get("payment_method") or "").lower()
        ]

    # Remove raw_date before serialization
    cleaned_txs = []
    for t in filtered_txs:
        item = dict(t)
        item.pop("raw_date", None)
        cleaned_txs.append(item)

    summary = {
        "total_inflow": round(total_inflow, 2),
        "total_outflow": round(total_outflow, 2),
        "net_cash_flow": round(net_cash_flow, 2),
        "pending_receivables": round(pending_receivables, 2),
        "total_transactions": len(all_txs),
        "completed_count": sum(1 for t in all_txs if t["status"] == "COMPLETED"),
        "pending_count": sum(1 for t in all_txs if t["status"] == "PENDING"),
        "failed_count": sum(1 for t in all_txs if t["status"] in ("FAILED", "VOID", "CANCELLED")),
        "inflow_count": sum(1 for t in all_txs if t["type"] == "INFLOW"),
        "outflow_count": sum(1 for t in all_txs if t["type"] == "OUTFLOW"),
        "by_method": by_method,
        "by_category": by_category,
    }

    return {
        "summary": summary,
        "total": len(cleaned_txs),
        "transactions": cleaned_txs,
    }

