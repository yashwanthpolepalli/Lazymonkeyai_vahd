from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.settings_service import SettingsService
from src.api.deps import get_current_user
from src.models.user import User

from src.models.settings import GymBranch

# Support both /settings and /gym router prefixes seamlessly
router = APIRouter(tags=["Branches & Settings"])

@router.get("/settings/branches/{branch_id}/geofence-status")
@router.get("/gym/branches/{branch_id}/geofence-status")
def get_branch_geofence_status(
    branch_id: str,
    db: Session = Depends(get_db)
):
    branch = db.query(GymBranch).filter(GymBranch.id == branch_id).first()
    if not branch:
        branch = db.query(GymBranch).filter(GymBranch.branch_name.ilike(branch_id)).first()
    if not branch:
        return {"branch_id": branch_id, "geofence_portal_enabled": False}
    return {
        "branch_id": branch.id,
        "branch_name": branch.branch_name,
        "gym_name": branch.gym_name,
        "geofence_portal_enabled": bool(branch.geofence_portal_enabled)
    }


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
        "owner_id": branch.owner_id,
        "ho_id": branch.ho_id
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


# -----------------------------------------------------------------
# DYNAMIC MASTER DATA ENDPOINTS (Database-driven for all categories)
# -----------------------------------------------------------------
@router.get("/settings/master-data")
@router.get("/gym/settings/master-data")
def get_all_master_data(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return SettingsService.get_master_data(db, category=category)


@router.get("/settings/master-data/{category}")
@router.get("/gym/settings/master-data/{category}")
def get_master_data_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    return SettingsService.get_master_data(db, category=category)


@router.post("/settings/master-data/{category}")
@router.post("/gym/settings/master-data/{category}")
def create_master_data(
    category: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return SettingsService.create_master_data_item(db, category=category, data=payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create master data item: {e}")


@router.put("/settings/master-data/{category}/{item_id}")
@router.put("/gym/settings/master-data/{category}/{item_id}")
def update_master_data(
    category: str,
    item_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        return SettingsService.update_master_data_item(db, category=category, item_id=item_id, data=payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update master data item: {e}")


@router.delete("/settings/master-data/{category}/{item_id}")
@router.delete("/gym/settings/master-data/{category}/{item_id}")
def delete_master_data(
    category: str,
    item_id: str,
    db: Session = Depends(get_db)
):
    try:
        SettingsService.delete_master_data_item(db, category=category, item_id=item_id)
        return {"message": "Item deleted successfully", "id": item_id, "category": category}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete master data item: {e}")

