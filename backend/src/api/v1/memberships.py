from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.membership_service import MembershipService
from src.models.membership import Membership
from src.models.customer import Customer
from src.models.plan import MembershipPlan
from src.models.user import User
from src.api.deps import get_current_user
from src.services.gym_setting_service import GymSettingService

router = APIRouter(
    prefix="/memberships",
    tags=["Memberships"],
)


# ============================================================
# PAYMENT METHODS (DYNAMIC DATABASE)
# ============================================================

@router.get("/payment-methods")
def list_payment_methods(
    db: Session = Depends(get_db),
):
    """
    Returns active payment methods dynamically stored in PostgreSQL.
    """
    methods = GymSettingService.get_payment_methods(db)
    return [
        {
            "id": m.id,
            "name": m.name,
            "code": m.code or m.name.upper(),
            "icon": m.icon or "credit-card"
        }
        for m in methods
    ]


@router.post("/payment-methods")
def create_payment_method(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Creates/persists a new payment method directly in PostgreSQL database.
    """
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    pm = GymSettingService.add_payment_method(db, payload)
    return {
        "id": pm.id,
        "name": pm.name,
        "code": pm.code,
        "icon": pm.icon
    }


@router.get("/plans")
def list_membership_plans(
    branch_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Returns active membership plans stored in PostgreSQL, mapped to gym owner and branch.
    """
    resolved_owner_id = owner_id
    resolved_branch_id = branch_id

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    return MembershipService.get_all_plans(db, owner_id=resolved_owner_id, branch_id=resolved_branch_id)


@router.post("/plans")
def create_membership_plan(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Creates a membership plan in PostgreSQL mapped with branch_id and owner_id.
    """
    resolved_owner_id = payload.get("owner_id")
    resolved_branch_id = payload.get("branch_id")

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    try:
        return MembershipService.create_plan(db, payload, owner_id=resolved_owner_id, branch_id=resolved_branch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


@router.put("/plans/{plan_id}")
def update_membership_plan(
    plan_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Updates an existing membership plan.
    """
    resolved_owner_id = payload.get("owner_id")
    resolved_branch_id = payload.get("branch_id")

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    try:
        return MembershipService.update_plan(db, plan_id, payload, owner_id=resolved_owner_id, branch_id=resolved_branch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


@router.delete("/plans/{plan_id}")
def delete_membership_plan(
    plan_id: str,
    db: Session = Depends(get_db),
):
    """
    Deactivates a membership plan.
    """
    try:
        return MembershipService.delete_plan(db, plan_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )


# ============================================================
# CUSTOMER MEMBERSHIP (OWNER/ADMIN)
# ============================================================

@router.get("/customer/{customer_id}")
def get_customer_membership(
    customer_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns the actual membership belonging to a customer.
    """
    membership = MembershipService.get_membership_by_customer(
        db, customer_id
    )

    if not membership:
        raise HTTPException(
            status_code=404,
            detail="Membership not found for customer",
        )

    return {
        "id": membership.id,
        "customer_id": membership.customer_id,
        "plan_name": membership.plan_name,
        "plan_type": membership.plan_type,
        "status": membership.status,
        "price": membership.price,
        "paid_amount": membership.paid_amount,
        "due_amount": membership.due_amount,
        "benefits": membership.benefits,
        "start_date": getattr(membership, "start_date", None),
        "expiry_date": getattr(membership, "expiry_date", None),
    }


# ============================================================
# EXPIRING MEMBERSHIPS
# ============================================================

@router.get("/expiring")
def get_expiring_memberships(
    db: Session = Depends(get_db),
):
    return MembershipService.get_expiring_memberships(db)


# ============================================================
# ASSIGN MEMBERSHIP
# ============================================================

@router.post("/assign")
def assign_membership(
    payload: dict,
    db: Session = Depends(get_db),
):
    return MembershipService.assign_membership(db, payload)


# ============================================================
# RENEW MEMBERSHIP
# ============================================================

@router.post("/renew/{customer_id}")
def renew_membership(
    customer_id: str,
    payload: dict,
    db: Session = Depends(get_db),
):
    return MembershipService.renew_membership(db, customer_id, payload)


# ============================================================
# MEMBERSHIP TRANSACTIONS (OWNER/ADMIN)
# ============================================================

@router.get("/transactions")
def get_all_membership_transactions(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Returns ONLY real membership/payment records stored in PostgreSQL.
    No mock transactions. No generated invoice numbers. No fake payment methods. No fallback customers.
    """
    query = (
        db.query(Membership, Customer)
        .join(Customer, Customer.id == Membership.customer_id)
    )

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            (Customer.full_name.ilike(search_value))
            | (Customer.email.ilike(search_value))
            | (Customer.phone.ilike(search_value))
        )

    if status:
        query = query.filter(Membership.status.ilike(status))

    rows = query.order_by(Membership.created_at.desc()).all()
    plans = db.query(MembershipPlan).all()
    plans_map = {p.name.strip().lower(): float(p.price) for p in plans if p.name and p.price}

    transactions = []

    for membership, customer in rows:
        amount = 0.0
        if membership.paid_amount is not None and membership.paid_amount > 0:
            amount = float(membership.paid_amount)
        elif membership.price is not None and membership.price > 0:
            amount = float(membership.price)
        elif membership.plan_name:
            k = membership.plan_name.strip().lower()
            amount = float(plans_map.get(k, 0.0))
        else:
            amount = 0.0

        paid_amount = float(membership.paid_amount if membership.paid_amount is not None else amount)
        due_amount = float(membership.due_amount if membership.due_amount is not None else max(0.0, amount - paid_amount))

        transactions.append({
            "id": membership.id,
            "customer_id": membership.customer_id,
            "member": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "plan_name": membership.plan_name,
            "plan_type": membership.plan_type,
            "amount": amount,
            "paid_amount": paid_amount,
            "due_amount": due_amount,
            "status": (membership.status or "COMPLETED").lower(),
            "payment_method": getattr(membership, "payment_method", None) or "UPI / Online",
            "transaction_id": getattr(membership, "transaction_id", None),
            "invoice_number": getattr(membership, "invoice_number", None) or f"INV-MEM-{membership.id[:8].upper()}",
            "created_at": (
                membership.created_at.isoformat()
                if membership.created_at
                else None
            ),
            "date": (
                membership.created_at.strftime("%b %d, %Y")
                if membership.created_at
                else "Today"
            ),
            "start_date": getattr(membership, "start_date", None),
            "expiry_date": getattr(membership, "expiry_date", None),
        })

    return {
        "total": len(transactions),
        "transactions": transactions,
    }
