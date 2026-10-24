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
        if u_role in ["OWNER"]:
            data["owner_id"] = current_user.id
            if current_user.ho_id:
                data["ho_id"] = current_user.ho_id
            if not data.get("branch_id") and current_user.branch_id:
                data["branch_id"] = current_user.branch_id
        elif u_role in ["HEAD_OFFICE", "HO"]:
            if not data.get("ho_id"):
                data["ho_id"] = current_user.ho_id or current_user.id
            if not data.get("branch_id") and current_user.branch_id:
                data["branch_id"] = current_user.branch_id
        elif u_role in ["MANAGER", "STAFF", "TRAINER"]:
            data["owner_id"] = data.get("owner_id") or current_user.owner_id
            data["branch_id"] = data.get("branch_id") or current_user.branch_id
            data["ho_id"] = data.get("ho_id") or current_user.ho_id

    # Resolve branch from database to ensure branch_name and hierarchy match
    from src.models.settings import Branch as GymBranch
    from sqlalchemy import or_
    b_ref = data.get("branch_id") or data.get("branch") or data.get("primary_gym_location")
    if b_ref:
        b_obj = db.query(GymBranch).filter(
            or_(GymBranch.id == b_ref, GymBranch.branch_name.ilike(f"%{b_ref}%"))
        ).first()
        if b_obj:
            data["branch_id"] = b_obj.id
            data["primary_gym_location"] = b_obj.branch_name or b_obj.gym_name
            if not data.get("owner_id") and b_obj.owner_id:
                data["owner_id"] = b_obj.owner_id
            if not data.get("ho_id") and b_obj.ho_id:
                data["ho_id"] = b_obj.ho_id
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

from fastapi.responses import Response, HTMLResponse
from src.services.student_attendance_report_service import StudentAttendanceReportService

@router.get("/attendance-reports/overview")
def get_attendance_reports_overview(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    branch_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Provides comprehensive student-parent mapping, live monthly attendance stats, and dispatch statuses."""
    if current_user and current_user.branch_id and not branch_id:
        branch_id = current_user.branch_id
    return StudentAttendanceReportService.get_monthly_reports_overview(
        db, year=year, month=month, branch_id=branch_id
    )

@router.get("/attendance-reports/logs")
def get_attendance_report_logs(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    """Retrieves persistent audit log of all sent WhatsApp reports."""
    return StudentAttendanceReportService.get_dispatched_logs(
        db, year=year, month=month, limit=limit
    )

@router.post("/attendance-reports/dispatch-monthly")
def dispatch_all_monthly_attendance_reports(
    payload: Dict[str, Any] = Body(default={}),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dispatches monthly attendance reports to all registered parents via WhatsApp with strict 1-to-1 mapping."""
    year = payload.get("year")
    month = payload.get("month")
    branch_id = payload.get("branch_id")
    if current_user and current_user.branch_id and not branch_id:
        branch_id = current_user.branch_id
    return StudentAttendanceReportService.dispatch_all_monthly_reports(
        db, year=year, month=month, branch_id=branch_id, dispatch_type=payload.get("dispatch_type", "MANUAL_DISPATCH")
    )

@router.get("/{customer_id}/attendance-report")
def get_customer_monthly_attendance_report(
    customer_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Calculates and returns student monthly biometric attendance report with dynamic day-wise records."""
    try:
        return StudentAttendanceReportService.compute_student_monthly_attendance(
            db, customer_id=customer_id, year=year, month=month
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{customer_id}/attendance-report/csv")
def get_customer_attendance_report_csv(
    customer_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Downloads dynamic day-wise attendance CSV for the student."""
    try:
        rep = StudentAttendanceReportService.compute_student_monthly_attendance(
            db, customer_id=customer_id, year=year, month=month
        )
        csv_data = StudentAttendanceReportService.generate_student_day_wise_csv(rep)
        filename = f"attendance_report_{customer_id}_{rep.get('month')}_{rep.get('year')}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{customer_id}/attendance-report/pdf")
def get_customer_attendance_report_printable_html(
    customer_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Renders printable official A4 attendance report sheet with day-wise matrix."""
    try:
        rep = StudentAttendanceReportService.compute_student_monthly_attendance(
            db, customer_id=customer_id, year=year, month=month
        )
        html_data = StudentAttendanceReportService.generate_student_attendance_html_printable(rep)
        return HTMLResponse(content=html_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{customer_id}/attendance-report/send-whatsapp")
def send_customer_monthly_attendance_whatsapp(
    customer_id: str,
    payload: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db)
):
    """Dispatches the official monthly attendance performance report strictly to the student's parent mobile via WhatsApp."""
    year = payload.get("year")
    month = payload.get("month")
    res = StudentAttendanceReportService.send_report_to_parent(
        db, customer_id=customer_id, year=year, month=month, dispatch_type=payload.get("dispatch_type", "MANUAL_DISPATCH")
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.delete("/{customer_id}")
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    success = CustomerService.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully", "deleted_id": customer_id}


# Alias router for /students
students_router = APIRouter(prefix="/students", tags=["Students"])

@students_router.get("/attendance-reports/overview")
def get_students_attendance_overview(year: Optional[int] = Query(None), month: Optional[int] = Query(None), branch_id: Optional[str] = Query(None), current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_attendance_reports_overview(year=year, month=month, branch_id=branch_id, current_user=current_user, db=db)

@students_router.get("/attendance-reports/logs")
def get_students_attendance_logs(year: Optional[int] = Query(None), month: Optional[int] = Query(None), limit: int = Query(100), db: Session = Depends(get_db)):
    return get_attendance_report_logs(year=year, month=month, limit=limit, db=db)

@students_router.post("/attendance-reports/dispatch-monthly")
def dispatch_students_monthly_attendance(payload: Dict[str, Any] = Body(default={}), current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    return dispatch_all_monthly_attendance_reports(payload=payload, current_user=current_user, db=db)

@students_router.get("/{student_id}/attendance-report")
def get_student_monthly_attendance(student_id: str, year: Optional[int] = Query(None), month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_customer_monthly_attendance_report(student_id, year=year, month=month, db=db)

@students_router.get("/{student_id}/attendance-report/csv")
def get_student_attendance_csv(student_id: str, year: Optional[int] = Query(None), month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_customer_attendance_report_csv(student_id, year=year, month=month, db=db)

@students_router.get("/{student_id}/attendance-report/pdf")
def get_student_attendance_pdf(student_id: str, year: Optional[int] = Query(None), month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_customer_attendance_report_printable_html(student_id, year=year, month=month, db=db)

@students_router.post("/{student_id}/attendance-report/send-whatsapp")
def send_student_monthly_attendance(student_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    return send_customer_monthly_attendance_whatsapp(student_id, payload=payload, db=db)


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
