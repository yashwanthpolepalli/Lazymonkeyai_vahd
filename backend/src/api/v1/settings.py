from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.settings_service import SettingsService
from src.api.deps import get_current_user
from src.models.user import User

from src.models.settings import vahdBranch

# Support both /settings and /vahd router prefixes seamlessly
router = APIRouter(tags=["Branches & Settings"])

@router.get("/settings/branches/{branch_id}/geofence-status")
@router.get("/vahd/branches/{branch_id}/geofence-status")
def get_branch_geofence_status(
    branch_id: str,
    db: Session = Depends(get_db)
):
    branch = db.query(vahdBranch).filter(
        or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
    ).first()
    if not branch:
        return {"branch_id": branch_id, "geofence_portal_enabled": False}
    return {
        "branch_id": branch.id,
        "branch_name": branch.branch_name,
        "vahd_name": branch.vahd_name,
        "geofence_portal_enabled": bool(branch.geofence_portal_enabled)
    }


@router.get("/settings")
@router.get("/vahd/settings")
def get_settings(db: Session = Depends(get_db)):
    setting = SettingsService.get_settings(db)
    return {
        "name": setting.name or setting.vahd_name or "",
        "org_name": setting.name or setting.vahd_name or "",
        "institution_name": setting.name or setting.vahd_name or "",
        "vahd_name": setting.vahd_name or setting.name or "",
        "phone": setting.phone or "",
        "email": getattr(setting, "email", "") or "",
        "address": getattr(setting, "address", "") or "",
        "gstin": setting.gstin or "",
        "currency": getattr(setting, "currency", "") or "",
        "timezone": getattr(setting, "timezone", "") or "",
        "opening_time": getattr(setting, "opening_time", "") or "",
        "closing_time": getattr(setting, "closing_time", "") or "",
        "essl_bioserver_url": setting.essl_bioserver_url or "",
        "enable_auto_sms": setting.enable_auto_sms,
        "enable_gate_autolock": setting.enable_gate_autolock,
        "enable_pos": setting.enable_pos if setting.enable_pos is not None else True,
        "enable_inventory": setting.enable_inventory if setting.enable_inventory is not None else True,
    }

@router.post("/settings")
@router.post("/vahd/settings")
def post_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    setting = SettingsService.update_settings(db, payload)
    return {
        "message": "Settings updated successfully",
        "settings": {
            "name": setting.name or setting.vahd_name or "",
            "org_name": setting.name or setting.vahd_name or "",
            "institution_name": setting.name or setting.vahd_name or "",
            "vahd_name": setting.vahd_name or setting.name or "",
            "phone": setting.phone or "",
            "email": getattr(setting, "email", "") or "",
            "address": getattr(setting, "address", "") or "",
            "gstin": setting.gstin or "",
            "currency": getattr(setting, "currency", "") or "",
            "timezone": getattr(setting, "timezone", "") or "",
            "opening_time": getattr(setting, "opening_time", "") or "",
            "closing_time": getattr(setting, "closing_time", "") or "",
            "essl_bioserver_url": setting.essl_bioserver_url or "",
        }
    }

@router.get("/settings/branches")
@router.get("/vahd/branches")
def get_branches(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    owner_id: Optional[str] = Query(None)
):
    return SettingsService.get_all_branches(db, current_user=current_user, owner_id=owner_id)

@router.post("/settings/branches")
@router.post("/vahd/branches")
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
        "vahd_name": branch.vahd_name,
        "branch_name": branch.branch_name,
        "city": branch.city,
        "owner_id": branch.owner_id,
        "ho_id": branch.ho_id
    }}

@router.get("/settings/billing")
@router.get("/vahd/billing")
def get_billing_settings(db: Session = Depends(get_db)):
    setting = SettingsService.get_settings(db)
    return SettingsService.get_billing_dict(setting)

@router.post("/settings/billing")
@router.post("/vahd/billing")
@router.put("/settings/billing")
@router.put("/vahd/billing")
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
@router.get("/vahd/settings/master-data")
def get_all_master_data(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return SettingsService.get_master_data(db, category=category)


@router.get("/settings/master-data/{category}")
@router.get("/vahd/settings/master-data/{category}")
def get_master_data_by_category(
    category: str,
    db: Session = Depends(get_db)
):
    return SettingsService.get_master_data(db, category=category)


@router.post("/settings/master-data/{category}")
@router.post("/vahd/settings/master-data/{category}")
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
@router.put("/vahd/settings/master-data/{category}/{item_id}")
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
@router.delete("/vahd/settings/master-data/{category}/{item_id}")
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

