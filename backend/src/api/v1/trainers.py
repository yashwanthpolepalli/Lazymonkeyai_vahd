from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.database.session import get_db
from src.services.payroll_service import PayrollService
from src.services.biometric_service import BiometricService
from src.schemas.payroll import TrainerCreateRequest, TrainerResponse
from src.schemas.biometrics import BiometricEnrollmentRequest

router = APIRouter(prefix="/trainers", tags=["Trainers & Staff Management"])

@router.get("", response_model=List[TrainerResponse])
def get_all_trainers(db: Session = Depends(get_db)):
    """
    Returns all registered trainers, managers, staff, and gym owners.
    """
    return PayrollService.get_all_trainers(db)

@router.post("", response_model=TrainerResponse)
def register_trainer(payload: TrainerCreateRequest, db: Session = Depends(get_db)):
    """
    Registers a new trainer or staff profile with salary & bank account details.
    """
    return PayrollService.register_trainer(db, payload.model_dump())

@router.put("/{trainer_id}", response_model=TrainerResponse)
def update_trainer(trainer_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Updates an existing trainer profile in PostgreSQL database.
    """
    try:
        return PayrollService.update_trainer(db, trainer_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{trainer_id}")
def delete_trainer(trainer_id: str, db: Session = Depends(get_db)):
    """
    Deletes a trainer profile from PostgreSQL database.
    """
    try:
        PayrollService.delete_trainer(db, trainer_id)
        return {"status": "SUCCESS", "message": f"Trainer '{trainer_id}' deleted successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{trainer_id}/customers")
def get_trainer_customers(trainer_id: str, db: Session = Depends(get_db)):
    """
    Returns all customers/members assigned to a specific trainer.
    """
    return PayrollService.get_trainer_customers(db, trainer_id)

@router.post("/{trainer_id}/assign-customer/{customer_id}")
def assign_customer_to_trainer(trainer_id: str, customer_id: str, db: Session = Depends(get_db)):
    """
    Assigns or reassigns a gym customer to a specific trainer.
    """
    try:
        return PayrollService.assign_customer(db, trainer_id, customer_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/enroll-biometrics")
def enroll_trainer_biometrics(payload: BiometricEnrollmentRequest, db: Session = Depends(get_db)):
    """
    Enrolls trainer/staff face or fingerprint across eSSL biometric turnstiles for gate entry & shift attendance.
    """
    try:
        return BiometricService.enroll_biometrics(
            db=db,
            customer_id=payload.customer_id,
            face_image_base64=payload.face_image_base64,
            fingerprint_template=payload.fingerprint_template,
            rfid_card_number=payload.rfid_card_number,
            target_device_ids=payload.target_device_ids
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

