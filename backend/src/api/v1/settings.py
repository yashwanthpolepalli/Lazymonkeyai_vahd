from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.settings_service import SettingsService
from src.api.deps import get_current_user
from src.models.user import User

# Support both /settings and /gym router prefixes seamlessly
router = APIRouter(tags=["Branches & Settings"])

@router.get("/settings")
@router.get("/gym/settings")
def get_settings(db: Session = Depends(get_db)):
    setting = SettingsService.get_settings(db)
    return {
        "name": setting.name or setting.gym_name,
        "org_name": setting.name or setting.gym_name,
        "institution_name": setting.name or setting.gym_name,
        "gym_name": setting.gym_name,
        "phone": setting.phone,
        "gstin": setting.gstin,
        "essl_bioserver_url": setting.essl_bioserver_url,
        "enable_auto_sms": setting.enable_auto_sms,
        "enable_gate_autolock": setting.enable_gate_autolock,
        "enable_pos": setting.enable_pos if setting.enable_pos is not None else True,
        "enable_inventory": setting.enable_inventory if setting.enable_inventory is not None else True,
    }

@router.post("/settings")
@router.post("/gym/settings")
def post_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting = SettingsService.update_settings(db, payload)
    return {
        "message": "Settings updated successfully",
        "settings": {
            "name": setting.name or setting.gym_name,
            "org_name": setting.name or setting.gym_name,
            "institution_name": setting.name or setting.gym_name,
            "gym_name": setting.gym_name,
            "phone": setting.phone,
            "gstin": setting.gstin,
            "essl_bioserver_url": setting.essl_bioserver_url,
        }
    }

@router.get("/settings/branches")
@router.get("/gym/branches")
def get_branches(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    owner_id: Optional[str] = Query(None)
):
    return SettingsService.get_all_branches(db, current_user=current_user, owner_id=owner_id)

@router.post("/settings/branches")
@router.post("/gym/branches")
def create_branch(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    if not payload.get("branch_name"):
        raise HTTPException(status_code=400, detail="branch_name is required")
    branch = SettingsService.create_branch(db, payload, current_user=current_user)
    return {"message": "Branch created successfully", "branch": {
        "id": branch.id,
        "gym_name": branch.gym_name,
        "branch_name": branch.branch_name,
        "city": branch.city,
        "owner_id": branch.owner_id
    }}

@router.get("/settings/billing")
@router.get("/gym/billing")
def get_billing_settings(db: Session = Depends(get_db)):
    setting = SettingsService.get_settings(db)
    return SettingsService.get_billing_dict(setting)

@router.post("/settings/billing")
@router.post("/gym/billing")
@router.put("/settings/billing")
@router.put("/gym/billing")
def update_billing_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting = SettingsService.update_settings(db, payload)
    return {
        "message": "GST and discount billing settings saved successfully",
        "billing": SettingsService.get_billing_dict(setting)
    }
