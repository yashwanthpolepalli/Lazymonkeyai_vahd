from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.whatsapp_service import WhatsAppService

router = APIRouter(prefix="/whatsapp-automation", tags=["CRM & Growth Suite - WhatsApp Automation"])

@router.get("/sessions")
def get_whatsapp_sessions(db: Session = Depends(get_db)):
    return WhatsAppService.get_sessions(db)

@router.post("/sessions/{session_id}/start")
def start_whatsapp_session(session_id: str, db: Session = Depends(get_db)):
    return WhatsAppService.start_session(db, session_id)

@router.post("/sessions/{session_id}/logout")
def logout_whatsapp_session(session_id: str, db: Session = Depends(get_db)):
    return WhatsAppService.logout_session(db, session_id)

@router.post("/sessions/{session_id}/reset")
def reset_whatsapp_session(session_id: str, db: Session = Depends(get_db)):
    return WhatsAppService.reset_session(db, session_id)

@router.get("/sessions/{session_id}/chats")
def get_active_chats(session_id: str, db: Session = Depends(get_db)):
    return WhatsAppService.get_active_chats(db, session_id)

@router.get("/sessions/{session_id}/chats/{phone}/messages")
def get_chat_messages(session_id: str, phone: str, db: Session = Depends(get_db)):
    return WhatsAppService.get_chat_messages(db, session_id, phone)

@router.post("/sessions/{session_id}/chats/{phone}/send")
def send_chat_message(session_id: str, phone: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    msg = payload.get("message", "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    return WhatsAppService.send_chat_message(db, session_id, phone, msg)

@router.post("/sessions/{session_id}/chats/{phone}/send-media")
def send_chat_media(session_id: str, phone: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("data") or not payload.get("mimeType"):
        raise HTTPException(status_code=400, detail="Media data and mimeType are required")
    return WhatsAppService.send_media(db, session_id, phone, payload)

@router.get("/sessions/{session_id}/contacts")
def get_contacts(session_id: str, db: Session = Depends(get_db)):
    return WhatsAppService.get_contacts(db, session_id)

@router.post("/sessions/{session_id}/sync")
def sync_contacts(session_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    contacts = payload.get("contacts", [])
    return WhatsAppService.sync_contacts(db, session_id, contacts)

@router.post("/webhook")
def whatsapp_webhook(payload: dict = Body(...), db: Session = Depends(get_db)):
    return WhatsAppService.handle_webhook(db, payload)

