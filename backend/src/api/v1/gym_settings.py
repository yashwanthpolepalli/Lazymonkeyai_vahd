from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.gym_setting_service import GymSettingService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/gym", tags=["Gym Branches & Settings"])

@router.get("/branches")
def get_gym_branches(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    owner_id: Optional[str] = Query(None)
):
    return GymSettingService.get_all_branches(db, current_user=current_user, owner_id=owner_id)

@router.post("/branches")
def create_gym_branch(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    if not payload.get("branch_name"):
        raise HTTPException(status_code=400, detail="branch_name is required")
    branch = GymSettingService.create_branch(db, payload, current_user=current_user)
    return {"message": "Branch created successfully", "branch": {
        "id": branch.id,
        "gym_name": branch.gym_name,
        "branch_name": branch.branch_name,
        "city": branch.city,
        "owner_id": branch.owner_id
    }}

@router.get("/settings")
def get_gym_settings(db: Session = Depends(get_db)):
    setting = GymSettingService.get_settings(db)
    return {
        "gym_name": setting.gym_name,
        "phone": setting.phone,
        "gstin": setting.gstin,
        "essl_bioserver_url": setting.essl_bioserver_url,
        "enable_auto_sms": setting.enable_auto_sms,
        "enable_gate_autolock": setting.enable_gate_autolock,
        "enable_pos": setting.enable_pos if setting.enable_pos is not None else True,
        "enable_inventory": setting.enable_inventory if setting.enable_inventory is not None else True,
    }

@router.get("/billing")
def get_billing_settings(db: Session = Depends(get_db)):
    setting = GymSettingService.get_settings(db)
    return GymSettingService.get_billing_dict(setting)

@router.post("/billing")
def update_billing_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting = GymSettingService.update_settings(db, payload)
    return {
        "message": "GST and discount billing settings saved successfully",
        "billing": GymSettingService.get_billing_dict(setting)
    }

@router.put("/billing")
def put_billing_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting = GymSettingService.update_settings(db, payload)
    return {
        "message": "GST and discount billing settings saved successfully",
        "billing": GymSettingService.get_billing_dict(setting)
    }

