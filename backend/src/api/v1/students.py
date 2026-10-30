from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.schemas.student import studentResponse, studentCreate
from src.services.student_service import studentService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/students", tags=["students"])

@router.get("")
def get_students(
    branch: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    owner_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    custs = studentService.get_all_students(
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
def get_student_slot_bookings(
    branch: Optional[str] = None,
    date: Optional[str] = None,
    student_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from src.services.slot_booking_service import SlotBookingService
    return SlotBookingService.get_all_bookings(db, branch=branch, date=date, student_id=student_id)

@router.get("/{student_id}")
def get_student(student_id: str, db: Session = Depends(get_db)):
    cust = studentService.get_student_by_id(db, student_id)
    if not cust:
        raise HTTPException(status_code=404, detail="student not found")
    return cust

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/onboard")
def onboard_student(
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
        elif u_role in ["MANAGER", "STAFF", "employee"]:
            data["owner_id"] = data.get("owner_id") or current_user.owner_id
            data["branch_id"] = data.get("branch_id") or current_user.branch_id
            data["ho_id"] = data.get("ho_id") or current_user.ho_id

    # Resolve branch from database to ensure branch_name and hierarchy match
    from src.models.settings import Branch as vahdBranch
    from sqlalchemy import or_
    b_ref = data.get("branch_id") or data.get("branch") or data.get("primary_vahd_location")
    if b_ref:
        b_obj = db.query(vahdBranch).filter(
            or_(vahdBranch.id == b_ref, vahdBranch.branch_name.ilike(f"%{b_ref}%"))
        ).first()
        if b_obj:
            data["branch_id"] = b_obj.id
            data["primary_vahd_location"] = b_obj.branch_name or b_obj.vahd_name
            if not data.get("owner_id") and b_obj.owner_id:
                data["owner_id"] = b_obj.owner_id
            if not data.get("ho_id") and b_obj.ho_id:
                data["ho_id"] = b_obj.ho_id
    try:
        created = studentService.onboard_student(db, data)
        return {
            "success": True,
            "message": "Student enrolled successfully",
            "student": created,
            **created
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to enroll student: {str(e)}")

@router.put("/{student_id}")
@router.patch("/{student_id}")
def update_student(student_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return studentService.update_student(db, student_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{student_id}/sync-biometric")
def sync_student_biometric(student_id: str, payload: dict = None, db: Session = Depends(get_db)):
    try:
        return studentService.sync_student_biometric(db, student_id, data=payload)
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
    effective_branch = branch_id if branch_id and branch_id != "all" else None
    return StudentAttendanceReportService.get_monthly_reports_overview(
        db, year=year, month=month, branch_id=effective_branch
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

@router.get("/{student_id}/attendance-report")
def get_student_monthly_attendance_report(
    student_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Calculates and returns student monthly biometric attendance report with dynamic day-wise records."""
    try:
        return StudentAttendanceReportService.compute_student_monthly_attendance(
            db, student_id=student_id, year=year, month=month
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{student_id}/attendance-report/csv")
def get_student_attendance_report_csv(
    student_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Downloads dynamic day-wise attendance CSV for the student."""
    try:
        rep = StudentAttendanceReportService.compute_student_monthly_attendance(
            db, student_id=student_id, year=year, month=month
        )
        csv_data = StudentAttendanceReportService.generate_student_day_wise_csv(rep)
        filename = f"attendance_report_{student_id}_{rep.get('month')}_{rep.get('year')}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{student_id}/attendance-report/pdf")
def get_student_attendance_report_printable_html(
    student_id: str,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Renders printable official A4 attendance report sheet with day-wise matrix."""
    try:
        rep = StudentAttendanceReportService.compute_student_monthly_attendance(
            db, student_id=student_id, year=year, month=month
        )
        html_data = StudentAttendanceReportService.generate_student_attendance_html_printable(rep)
        return HTMLResponse(content=html_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{student_id}/attendance-report/send-whatsapp")
def send_student_monthly_attendance_whatsapp(
    student_id: str,
    payload: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db)
):
    """Dispatches the official monthly attendance performance report strictly to the student's parent mobile via WhatsApp."""
    year = payload.get("year")
    month = payload.get("month")
    res = StudentAttendanceReportService.send_report_to_parent(
        db, student_id=student_id, year=year, month=month, dispatch_type=payload.get("dispatch_type", "MANUAL_DISPATCH")
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    success = studentService.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="student not found")
    return {"message": "student deleted successfully", "deleted_id": student_id}


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
    return get_student_monthly_attendance_report(student_id, year=year, month=month, db=db)

@students_router.get("/{student_id}/attendance-report/csv")
def get_student_attendance_csv(student_id: str, year: Optional[int] = Query(None), month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_student_attendance_report_csv(student_id, year=year, month=month, db=db)

@students_router.get("/{student_id}/attendance-report/pdf")
def get_student_attendance_pdf(student_id: str, year: Optional[int] = Query(None), month: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return get_student_attendance_report_printable_html(student_id, year=year, month=month, db=db)

@students_router.post("/{student_id}/attendance-report/send-whatsapp")
def send_student_monthly_attendance(student_id: str, payload: Dict[str, Any] = Body(default={}), db: Session = Depends(get_db)):
    return send_student_monthly_attendance_whatsapp(student_id, payload=payload, db=db)


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
    return studentService.get_all_students(
        db,
        current_user=current_user,
        branch=branch,
        branch_id=branch_id,
        owner_id=owner_id
    )

@members_router.get("/{member_id}")
def get_member_by_id(member_id: str, db: Session = Depends(get_db)):
    cust = studentService.get_student_by_id(db, member_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Member not found")
    return cust


# Dedicated router for /crm/students
crm_students_router = APIRouter(prefix="/crm/students", tags=["CRM students"])

@crm_students_router.get("")
def get_crm_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    student_type: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    custs = studentService.get_all_students(db, current_user=current_user)
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

@crm_students_router.post("", status_code=status.HTTP_201_CREATED)
def create_crm_student(
    payload: Dict[str, Any] = Body(...),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = dict(payload)
    if not data.get("full_name") and data.get("name"):
        data["full_name"] = data["name"]
    return studentService.onboard_student(db, data)

@crm_students_router.get("/{student_id}")
def get_single_crm_student(student_id: str, db: Session = Depends(get_db)):
    cust = studentService.get_student_by_id(db, student_id)
    if not cust:
        raise HTTPException(status_code=404, detail="student not found")
    return cust

@crm_students_router.patch("/{student_id}")
@crm_students_router.put("/{student_id}")
def update_crm_student(student_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        return studentService.update_student(db, student_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@crm_students_router.delete("/{student_id}")
def delete_crm_student(student_id: str, db: Session = Depends(get_db)):
    success = studentService.delete_student(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="student not found")
    return {"status": "success", "message": "student deleted successfully", "deleted_id": student_id}
