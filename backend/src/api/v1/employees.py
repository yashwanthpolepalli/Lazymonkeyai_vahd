from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from src.database.session import get_db
from src.services.payroll_service import PayrollService
from src.services.biometric_service import BiometricService
from src.schemas.payroll import employeeCreateRequest, employeeResponse
from src.schemas.biometrics import BiometricEnrollmentRequest
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/employees", tags=["employees & Staff Management"])

@router.get("", response_model=List[employeeResponse])
def get_all_employees(
    branch_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all registered employees, managers, staff, and vahd owners scoped to user hierarchy.
    """
    return PayrollService.get_all_employees(db, current_user=current_user, branch_id=branch_id)

@router.post("", response_model=employeeResponse)
def register_employee(
    payload: employeeCreateRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registers a new employee or staff profile with salary & bank account details.
    """
    data = payload.model_dump()
    if current_user:
        u_role = (current_user.role or "").strip().upper()
        if u_role in ["OWNER"]:
            data["owner_id"] = data.get("owner_id") or current_user.id
            if not data.get("branch_id") and current_user.branch_id:
                data["branch_id"] = current_user.branch_id
            if not data.get("ho_id") and current_user.ho_id:
                data["ho_id"] = current_user.ho_id
        elif u_role in ["HEAD_OFFICE", "HO"]:
            if not data.get("ho_id"):
                data["ho_id"] = current_user.ho_id or current_user.id
            if not data.get("branch_id") and current_user.branch_id:
                data["branch_id"] = current_user.branch_id
    return PayrollService.register_employee(db, data)

@router.put("/{employee_id}", response_model=employeeResponse)
def update_employee(employee_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Updates an existing employee profile in PostgreSQL database.
    """
    try:
        return PayrollService.update_employee(db, employee_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{employee_id}")
def delete_employee(employee_id: str, db: Session = Depends(get_db)):
    """
    Deletes a employee profile from PostgreSQL database.
    """
    try:
        PayrollService.delete_employee(db, employee_id)
        return {"status": "SUCCESS", "message": f"employee '{employee_id}' deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{employee_id}/students")
def get_employee_students(employee_id: str, db: Session = Depends(get_db)):
    """
    Returns all students/members assigned to a specific employee.
    """
    return PayrollService.get_employee_students(db, employee_id)

@router.post("/{employee_id}/assign-student/{student_id}")
def assign_student_to_employee(employee_id: str, student_id: str, db: Session = Depends(get_db)):
    """
    Assigns or reassigns a vahd student to a specific employee.
    """
    try:
        return PayrollService.assign_student(db, employee_id, student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/enroll-biometrics")
def enroll_employee_biometrics(payload: BiometricEnrollmentRequest, db: Session = Depends(get_db)):
    """
    Enrolls employee/staff face or fingerprint across eSSL biometric turnstiles for gate entry & shift attendance.
    """
    try:
        return BiometricService.enroll_biometrics(
            db=db,
            student_id=payload.student_id,
            face_image_base64=payload.face_image_base64,
            fingerprint_template=payload.fingerprint_template,
            rfid_card_number=payload.rfid_card_number,
            target_device_ids=payload.target_device_ids
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

