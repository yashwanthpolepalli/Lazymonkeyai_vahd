"""
FIT CLUB AI — Super Admin Router Endpoints
Serves platform overview, gym management, device monitoring, AI engine telemetry,
and DB-driven feature control matrix endpoints.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.super_admin_service import SuperAdminService
from src.services.gym_setting_service import GymSettingService

router = APIRouter(prefix="/superadmin", tags=["Super Admin"])


@router.get("/overview")
@router.get("/super-admin/overview")
def get_super_admin_overview(db: Session = Depends(get_db)):
    return SuperAdminService.get_platform_overview(db)


@router.get("/gyms")
@router.get("/organizations")
def list_organizations(db: Session = Depends(get_db)):
    """Fetch all Gym branches and owners dynamically from PostgreSQL DB."""
    return SuperAdminService.get_organizations(db)


@router.get("/organizations/{org_id}")
def get_organization_detail(org_id: str, db: Session = Depends(get_db)):
    """Fetch deep inspection details for a single organization."""
    detail = SuperAdminService.get_organization_detail(db, org_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Organization not found")
    return detail


@router.post("/gyms")
@router.post("/organizations")
@router.post("/owners/onboard")
def onboard_organization(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Onboard a new Gym branch and owner with full credentials dynamically into PostgreSQL DB."""
    return SuperAdminService.onboard_gym(db, payload)


@router.post("/owners/{user_id}/reset-credentials")
def reset_owner_credentials(user_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Reset Gym Owner credentials dynamically with bcrypt hashing and audit logging."""
    new_password = payload.get("new_password") or payload.get("password") or "FitClub@2026"
    return SuperAdminService.reset_owner_credentials(db, user_id, new_password)


@router.patch("/owners/{user_id}/status")
def update_owner_status(user_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Activate or suspend Gym Owner account credentials with audit logging."""
    is_active = payload.get("is_active")
    if is_active is None:
        status_str = payload.get("status", "active").lower()
        is_active = (status_str == "active")
    return SuperAdminService.update_owner_status(db, user_id, bool(is_active))


@router.patch("/gyms/{gym_id}/status")
@router.patch("/organizations/{gym_id}/status")
def update_organization_status(gym_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Approve or Suspend an Organization in PostgreSQL DB."""
    status = payload.get("status") or "active"
    return SuperAdminService.update_gym_status(db, gym_id, status)


@router.get("/users")
def list_global_users(db: Session = Depends(get_db)):
    """Fetch all platform users dynamically from DB."""
    return SuperAdminService.get_global_users(db)


@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    """Fetch all SaaS subscription plans dynamically from DB."""
    return SuperAdminService.get_plans(db)


@router.post("/plans")
def create_plan(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Create a new SaaS subscription tier dynamically in PostgreSQL."""
    return SuperAdminService.create_saas_plan(db, payload)


@router.put("/plans/{plan_id}")
def update_plan(plan_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Update an existing SaaS subscription tier dynamically in PostgreSQL."""
    return SuperAdminService.update_saas_plan(db, plan_id, payload)


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, db: Session = Depends(get_db)):
    """Delete or deactivate a SaaS subscription tier in PostgreSQL."""
    return SuperAdminService.delete_saas_plan(db, plan_id)



@router.get("/support-tickets")
def list_support_tickets(status: str = None, db: Session = Depends(get_db)):
    """Fetch platform support tickets dynamically from DB."""
    return SuperAdminService.get_support_tickets(db, status_filter=status)


@router.post("/support-tickets")
def create_support_ticket(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Create a support ticket directly in PostgreSQL DB."""
    return SuperAdminService.create_support_ticket(db, payload)


@router.patch("/support-tickets/{ticket_id}/status")
def update_support_ticket_status(ticket_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """Update support ticket status directly in DB."""
    status = payload.get("status") or "resolved"
    return SuperAdminService.update_support_ticket_status(db, ticket_id, status)



@router.get("/billing/overview")
def get_billing_overview(db: Session = Depends(get_db)):
    """Fetch revenue, MRR, and transaction history dynamically from DB."""
    return SuperAdminService.get_billing_overview(db)


@router.get("/billing/settings")
def get_superadmin_billing_settings(db: Session = Depends(get_db)):
    """Fetch global GST & Discount Matrix settings dynamically from DB."""
    setting = GymSettingService.get_settings(db)
    return GymSettingService.get_billing_dict(setting)


@router.post("/billing/settings")
def update_superadmin_billing_settings(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Update global GST & Discount Matrix settings dynamically in DB."""
    setting = GymSettingService.update_settings(db, payload)
    return {
        "message": "GST and discount billing settings saved successfully",
        "billing": GymSettingService.get_billing_dict(setting)
    }



@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    """Fetch all hardware devices directly from BiometricDevice table."""
    return SuperAdminService.get_devices(db)


@router.post("/devices")
def register_device(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Register a new hardware device dynamically into DB."""
    return SuperAdminService.register_new_device(db, payload)


@router.post("/devices/ping/{device_id}")
def ping_device(device_id: str, db: Session = Depends(get_db)):
    """Pings a device and refreshes heartbeat status in DB."""
    try:
        return SuperAdminService.ping_device(db, device_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/devices/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    """Decommission and remove a hardware device from DB."""
    try:
        return SuperAdminService.delete_device(db, device_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/ai-modules")
@router.get("/ai/overview")
def list_ai_modules(db: Session = Depends(get_db)):
    """Fetch real AI engine telemetry and module metrics from PostgreSQL."""
    return SuperAdminService.get_ai_platform_overview(db)


@router.post("/ai/model-routing")
@router.post("/ai-modules/routing")
def update_ai_model_routing(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Update active model routing for a specific capability in DB."""
    try:
        return SuperAdminService.update_ai_model_routing(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/test-job")
@router.post("/ai-modules/test-job")
def run_test_ai_job(payload: dict = Body(default={}), db: Session = Depends(get_db)):
    """Run a live test inference and log telemetry directly into DB."""
    return SuperAdminService.run_test_ai_job(db, payload)



@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    """Fetch platform audit logs dynamically from DB."""
    return SuperAdminService.get_audit_logs(db)


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    """Fetch platform settings dynamically from DB."""
    return SuperAdminService.get_platform_settings(db)


@router.get("/feature-controls")
def get_feature_controls(db: Session = Depends(get_db)):
    """Retrieve Plan Feature Control matrix directly from PostgreSQL feature_controls table."""
    return SuperAdminService.get_feature_controls(db)


@router.post("/feature-controls")
def save_feature_controls(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Save updated Plan Feature Control matrix into PostgreSQL feature_controls table."""
    return SuperAdminService.save_feature_controls(db, payload)


@router.get("/nutrition-policies")
def get_nutrition_policies(db: Session = Depends(get_db)):
    """Fetch all nutrition goal policy rules directly from PostgreSQL nutrition_goal_policies DB table."""
    return SuperAdminService.get_nutrition_policies(db)


@router.post("/nutrition-policies")
def save_nutrition_policy(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Create or update a nutrition goal policy rule directly in PostgreSQL DB."""
    return SuperAdminService.save_nutrition_policy(db, payload)

