from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.course_service import CourseService
from src.services.membership_service import MembershipService
from src.services.settings_service import SettingsService
from src.models.user import User
from src.models.course import Course, StudentCourse
from src.models.membership import Membership
from src.models.customer import Customer
from src.models.plan import MembershipPlan
from src.api.deps import get_current_user

router = APIRouter(
    prefix="/courses",
    tags=["Academic Courses & Programs"],
)

# ============================================================
# PAYMENT METHODS (DYNAMIC DATABASE)
# ============================================================

@router.get("/payment-methods")
def list_payment_methods(db: Session = Depends(get_db)):
    """
    Returns active payment methods dynamically stored in database.
    """
    methods = SettingsService.get_payment_methods(db)
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
def create_payment_method(payload: dict, db: Session = Depends(get_db)):
    """
    Creates/persists a new payment method directly in database.
    """
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    pm = SettingsService.add_payment_method(db, payload)
    return {
        "id": pm.id,
        "name": pm.name,
        "code": pm.code,
        "icon": pm.icon
    }


# ============================================================
# LANGUAGES & MEDIUMS OF INSTRUCTION
# ============================================================

@router.get("/languages")
def get_course_languages(db: Session = Depends(get_db)):
    """
    Returns active medium of instruction languages dynamically configured by owner.
    """
    return CourseService.get_languages(db)


@router.post("/languages")
def add_course_language(payload: dict, db: Session = Depends(get_db)):
    """
    Adds a new medium of instruction language to settings.
    """
    lang_name = payload.get("name") or payload.get("language") or ""
    if not lang_name.strip():
        raise HTTPException(status_code=400, detail="Language name is required")
    return CourseService.add_language(db, lang_name)


@router.delete("/languages/{lang_name}")
def delete_course_language(lang_name: str, db: Session = Depends(get_db)):
    """
    Removes a medium of instruction language from settings.
    """
    return CourseService.delete_language(db, lang_name)


# ============================================================
# COURSE CLASSIFICATIONS / TYPES (DYNAMIC DATABASE)
# ============================================================

@router.get("/classifications")
def get_classifications(db: Session = Depends(get_db)):
    """
    Returns active course types/classifications dynamically configured in DB.
    """
    return CourseService.get_classifications(db)


@router.post("/classifications")
def create_classification(payload: dict, db: Session = Depends(get_db)):
    """
    Adds a new course type/classification.
    """
    val = payload.get("value") or payload.get("label") or payload.get("name") or ""
    lbl = payload.get("label") or val
    if not val.strip():
        raise HTTPException(status_code=400, detail="Classification value is required")
    return CourseService.add_classification(db, val, lbl)


@router.put("/classifications/{class_id}")
def update_classification(class_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Updates an existing course type/classification.
    """
    val = payload.get("value") or payload.get("name") or ""
    lbl = payload.get("label") or val
    if not val.strip():
        raise HTTPException(status_code=400, detail="Classification value is required")
    return CourseService.update_classification(db, class_id, val, lbl)


@router.delete("/classifications/{class_id}")
def delete_classification(class_id: str, db: Session = Depends(get_db)):
    """
    Removes a course type/classification.
    """
    return CourseService.delete_classification(db, class_id)


# ============================================================
# COURSES / DEGREE PLANS
# ============================================================

@router.get("")
@router.get("/plans")
def list_courses(
    branch_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Returns active academic courses, programs, and fee structure.
    """
    resolved_owner_id = owner_id
    resolved_branch_id = branch_id

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    return CourseService.get_all_courses(db, owner_id=resolved_owner_id, branch_id=resolved_branch_id)


@router.post("")
@router.post("/plans")
def create_course(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Creates a new course or degree program in the database.
    """
    resolved_owner_id = payload.get("owner_id")
    resolved_branch_id = payload.get("branch_id")

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    try:
        return CourseService.create_course(db, payload, owner_id=resolved_owner_id, branch_id=resolved_branch_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/plans/{course_id}")
@router.put("/{course_id}")
def update_course(
    course_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Updates an existing course or degree program.
    """
    resolved_owner_id = payload.get("owner_id")
    resolved_branch_id = payload.get("branch_id")

    if current_user and not current_user.is_platform_admin and current_user.role != 'SUPER_ADMIN':
        resolved_owner_id = resolved_owner_id or current_user.owner_id or current_user.id
        if not resolved_branch_id and current_user.branch_id:
            resolved_branch_id = current_user.branch_id

    try:
        return CourseService.update_course(db, course_id, payload, owner_id=resolved_owner_id, branch_id=resolved_branch_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/plans/{course_id}")
@router.delete("/{course_id}")
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
):
    """
    Deactivates a course from the database.
    """
    try:
        return CourseService.delete_course(db, course_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============================================================
# STUDENT COURSE ASSIGN & RENEW
# ============================================================

@router.get("/customer/{customer_id}")
def get_customer_course(
    customer_id: str,
    db: Session = Depends(get_db),
):
    """
    Returns active course enrollment belonging to a student.
    """
    membership = MembershipService.get_membership_by_customer(db, customer_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Course enrollment not found for student")

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


@router.get("/expiring")
def get_expiring_courses(db: Session = Depends(get_db)):
    return MembershipService.get_expiring_memberships(db)


@router.post("/assign")
def assign_course(payload: dict, db: Session = Depends(get_db)):
    return MembershipService.assign_membership(db, payload)


@router.post("/renew/{customer_id}")
def renew_course(customer_id: str, payload: dict, db: Session = Depends(get_db)):
    return MembershipService.renew_membership(db, customer_id, payload)


@router.get("/transactions")
def get_all_course_transactions(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
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
            "invoice_number": getattr(membership, "invoice_number", None) or f"INV-FEE-{membership.id[:8].upper()}",
            "created_at": membership.created_at.isoformat() if membership.created_at else None,
            "date": membership.created_at.strftime("%b %d, %Y") if membership.created_at else "Today",
            "start_date": getattr(membership, "start_date", None),
            "expiry_date": getattr(membership, "expiry_date", None),
        })

    return {
        "total": len(transactions),
        "transactions": transactions,
    }
