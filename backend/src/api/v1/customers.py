from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.schemas.customer import CustomerResponse, CustomerCreate
from src.services.customer_service import CustomerService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("")
def get_customers(
    branch: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    custs = CustomerService.get_all_customers(
        db,
        current_user=current_user,
        branch=branch,
        branch_id=branch_id,
        owner_id=owner_id
    )
    if search:
        s = search.lower()
        custs = [c for c in custs if s in (c.get("full_name") or c.get("name") or "").lower() or s in (c.get("phone") or "").lower() or s in (c.get("email") or "").lower()]
    return custs

@router.get("/slot-bookings")
def get_customer_slot_bookings(
    branch: Optional[str] = None,
    date: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from src.services.slot_booking_service import SlotBookingService
    return SlotBookingService.get_all_bookings(db, branch=branch, date=date, customer_id=customer_id)

@router.get("/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    cust = CustomerService.get_customer_by_id(db, customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/onboard")
def onboard_customer(
    payload: Dict[str, Any] = Body(...),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = dict(payload)
    if not data.get("full_name") and data.get("name"):
        data["full_name"] = data["name"]
    if current_user:
        u_role = (current_user.role or "").strip().upper()
        if u_role in ["GYM_OWNER", "OWNER"]:
            data["owner_id"] = data.get("owner_id") or current_user.id
            if not data.get("branch_id") and current_user.branch_id:
                data["branch_id"] = current_user.branch_id
        elif u_role in ["MANAGER", "STAFF", "TRAINER"]:
            data["owner_id"] = data.get("owner_id") or current_user.owner_id
            data["branch_id"] = data.get("branch_id") or current_user.branch_id
    return CustomerService.onboard_customer(db, data)

@router.put("/{customer_id}")
@router.patch("/{customer_id}")
def update_customer(customer_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return CustomerService.update_customer(db, customer_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{customer_id}/workout-video-access")
def toggle_workout_video_access(customer_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    enable = payload.get("enable_workout_videos") if "enable_workout_videos" in payload else payload.get("enable", True)
    try:
        return CustomerService.toggle_workout_video_access(db, customer_id, bool(enable))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{customer_id}/sync-biometric")
def sync_customer_biometric(customer_id: str, payload: dict = None, db: Session = Depends(get_db)):
    try:
        return CustomerService.sync_customer_biometric(db, customer_id, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{customer_id}")
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    success = CustomerService.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully", "deleted_id": customer_id}


# Alias router for /members
members_router = APIRouter(prefix="/members", tags=["Members"])

@members_router.get("")
def get_all_members(
    branch: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return CustomerService.get_all_customers(
        db,
        current_user=current_user,
        branch=branch,
        branch_id=branch_id,
        owner_id=owner_id
    )

@members_router.get("/{member_id}")
def get_member_by_id(member_id: str, db: Session = Depends(get_db)):
    cust = CustomerService.get_customer_by_id(db, member_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Member not found")
    return cust


# Dedicated router for /crm/customers
crm_customers_router = APIRouter(prefix="/crm/customers", tags=["CRM Customers"])

@crm_customers_router.get("")
def get_crm_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    customer_type: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    custs = CustomerService.get_all_customers(db, current_user=current_user)
    if search:
        s = search.lower()
        custs = [c for c in custs if s in (c.get("full_name") or c.get("name") or "").lower() or s in (c.get("phone") or "").lower() or s in (c.get("email") or "").lower()]
    total = len(custs)
    start = (page - 1) * page_size
    paged = custs[start:start + page_size]
    return {
        "items": paged,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@crm_customers_router.post("", status_code=status.HTTP_201_CREATED)
def create_crm_customer(
    payload: Dict[str, Any] = Body(...),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = dict(payload)
    if not data.get("full_name") and data.get("name"):
        data["full_name"] = data["name"]
    return CustomerService.onboard_customer(db, data)

@crm_customers_router.get("/{customer_id}")
def get_single_crm_customer(customer_id: str, db: Session = Depends(get_db)):
    cust = CustomerService.get_customer_by_id(db, customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust

@crm_customers_router.patch("/{customer_id}")
@crm_customers_router.put("/{customer_id}")
def update_crm_customer(customer_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return CustomerService.update_customer(db, customer_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@crm_customers_router.delete("/{customer_id}")
def delete_crm_customer(customer_id: str, db: Session = Depends(get_db)):
    success = CustomerService.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"status": "success", "message": "Customer deleted successfully", "deleted_id": customer_id}
