from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.notification_service import NotificationService

router = APIRouter(prefix="/system/notifications", tags=["System - Push Notifications"])

# ── Templates ──
@router.get("/templates")
def list_push_templates(db: Session = Depends(get_db)):
    return NotificationService.get_templates(db)

@router.post("/templates")
def create_push_template(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("name") or not payload.get("title_template") or not payload.get("body_template"):
        raise HTTPException(status_code=400, detail="Name, title_template, and body_template are required")
    return NotificationService.create_template(db, payload)

@router.put("/templates/{template_id}")
@router.patch("/templates/{template_id}")
def update_push_template(template_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    updated = NotificationService.update_template(db, template_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated

@router.delete("/templates/{template_id}")
def delete_push_template(template_id: str, db: Session = Depends(get_db)):
    deleted = NotificationService.delete_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

# ── Broadcasts ──
@router.get("/broadcasts")
def list_broadcast_history(db: Session = Depends(get_db)):
    return NotificationService.get_broadcasts(db)

@router.post("/broadcast")
def send_broadcast_push(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("title") or not payload.get("body"):
        raise HTTPException(status_code=400, detail="Title and body are required for broadcast")
    return NotificationService.send_broadcast(db, payload)

# ── Live Notification Stream ──
@router.get("/live")
def get_live_notifications(db: Session = Depends(get_db)):
    return NotificationService.get_live_notifications(db)

@router.post("/live-alert")
def create_live_alert(payload: dict = Body(...), db: Session = Depends(get_db)):
    return NotificationService.create_live_alert(db, payload)

# ── Device Tokens ──
@router.post("/devices/register")
def register_device(payload: dict = Body(...), db: Session = Depends(get_db)):
    return NotificationService.register_device_token(db, payload)
