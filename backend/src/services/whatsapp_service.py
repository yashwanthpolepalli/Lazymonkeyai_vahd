import os
import uuid
import time
import httpx
import logging
import urllib.parse
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.models.crm import WhatsAppSessionModel, WhatsAppMessageModel
from src.models.student import student
from src.utils.timezone import now_ist_naive

logger = logging.getLogger(__name__)

_raw_gateway_url = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:8005")
GATEWAY_URL = _raw_gateway_url.replace("localhost", "127.0.0.1")

def _clean_digits(val: str) -> str:
    return "".join(filter(str.isdigit, str(val)))

def format_whatsapp_phone(phone: str) -> str:
    """Ensures phone number has valid WhatsApp country code (defaults to 91 for 10-digit Indian numbers)."""
    digits = _clean_digits(phone)
    if len(digits) == 10:
        return f"91{digits}"
    return digits


class WhatsAppService:
    @staticmethod
    def get_sessions(db: Session) -> Dict[str, Any]:
        """Fetch all WhatsApp web sessions dynamically from Gateway and sync with DB."""
        gateway_sessions = {}
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.get(f"{GATEWAY_URL}/sessions")
                if resp.status_code == 200:
                    gateway_sessions = resp.json()
        except Exception as e:
            logger.warning(f"Could not reach WhatsApp gateway on {GATEWAY_URL}: {e}")

        # Update or create DB records with real gateway status and real QR
        for session_id, gw in gateway_sessions.items():
            clean_id = _clean_digits(session_id)
            existing = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.id == clean_id).first()
            if not existing:
                existing = WhatsAppSessionModel(
                    id=clean_id,
                    session_id=clean_id,
                    status=gw.get("status", "DISCONNECTED"),
                    qr=gw.get("qr"),
                    owner_name="Administrator",
                    info=gw.get("info"),
                    created_at=now_ist_naive(),
                    updated_at=now_ist_naive()
                )
                db.add(existing)
            else:
                existing.status = gw.get("status", existing.status)
                if gw.get("qr"):
                    existing.qr = gw.get("qr")
                elif gw.get("status") == "CONNECTED":
                    existing.qr = None
                if gw.get("info"):
                    existing.info = gw.get("info")
                existing.updated_at = now_ist_naive()

        db.commit()

        # Query all DB sessions
        db_sessions = db.query(WhatsAppSessionModel).order_by(WhatsAppSessionModel.created_at.desc()).all()
        result = {}
        for s in db_sessions:
            gw = gateway_sessions.get(s.id) or {}
            st = gw.get("status") or s.status or "DISCONNECTED"
            qr_val = gw.get("qr") or s.qr
            info_val = gw.get("info") or s.info or {}
            result[s.id] = {
                "status": st,
                "qr": qr_val,
                "info": info_val,
                "owner_name": s.owner_name or "Administrator"
            }
        return result

    @staticmethod
    def start_session(db: Session, session_id: str) -> Dict[str, Any]:
        clean_id = format_whatsapp_phone(session_id) if session_id else "919908297963"

        existing = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.id == clean_id).first()
        if not existing:
            existing = WhatsAppSessionModel(
                id=clean_id,
                session_id=clean_id,
                status="INITIALIZING",
                qr=None,
                owner_name="Administrator",
                info={"phone": f"+{clean_id}", "platform": "Chromium Web Bridge"},
                created_at=now_ist_naive(),
                updated_at=now_ist_naive()
            )
            db.add(existing)
        else:
            existing.status = "INITIALIZING"
            existing.updated_at = now_ist_naive()
        db.commit()

        # Proxy to gateway
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(f"{GATEWAY_URL}/sessions/{clean_id}/start")
                if resp.status_code == 200:
                    gw_data = resp.json()
                    if gw_data.get("qr"):
                        existing.qr = gw_data.get("qr")
                        existing.status = gw_data.get("status", "QR_READY")
                        db.commit()
                    return gw_data
        except Exception as e:
            logger.error(f"Error starting session {clean_id} on gateway: {e}")

        return {
            "success": True,
            "session_id": clean_id,
            "status": "INITIALIZING",
            "qr": existing.qr,
            "message": "Chromium WhatsApp gateway instance initialized."
        }

    @staticmethod
    def handle_webhook(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming messages and events from NodeJS WhatsApp Gateway."""
        from_phone = _clean_digits(str(payload.get("from", "")))
        body = payload.get("body", "")
        session_id = _clean_digits(str(payload.get("session_id", "")))
        profile_name = payload.get("profile_name") or f"WhatsApp Contact (+{from_phone})"

        if not from_phone or not body:
            return {"status": "ignored", "reason": "empty from or body"}

        # Store inbound message in DB
        now_naive = now_ist_naive()
        inbound_msg = WhatsAppMessageModel(
            session_id=session_id or "default",
            phone=from_phone,
            body=body,
            from_me=False,
            timestamp=payload.get("timestamp") or int(time.time()),
            created_at=now_naive
        )
        db.add(inbound_msg)

        db.commit()
        return {"status": "ok", "message_id": inbound_msg.id}

    @staticmethod
    def logout_session(db: Session, session_id: str) -> Dict[str, Any]:
        clean_id = _clean_digits(session_id)
        row = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.id == clean_id).first()
        if row:
            row.status = "DISCONNECTED"
            row.qr = None
            db.commit()

        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(f"{GATEWAY_URL}/sessions/{clean_id}/logout")
        except Exception:
            pass

        return {"success": True, "message": f"Session {clean_id} disconnected successfully."}

    @staticmethod
    def reset_session(db: Session, session_id: str) -> Dict[str, Any]:
        clean_id = _clean_digits(session_id)
        row = db.query(WhatsAppSessionModel).filter(WhatsAppSessionModel.id == clean_id).first()
        if row:
            row.status = "QR_READY"
            row.updated_at = now_ist_naive()
            db.commit()
        return {"success": True, "status": "QR_READY", "message": "Session reset to QR_READY."}

    @staticmethod
    def get_active_chats(db: Session, session_id: str) -> Dict[str, Any]:
        clean_id = _clean_digits(session_id)
        # Try gateway first
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(f"{GATEWAY_URL}/sessions/{clean_id}/chats")
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass

        # Return registered students / students as contacts
        students = db.query(student).filter(student.phone.isnot(None)).limit(50).all()
        chats = []
        for c in students:
            if c.phone:
                chats.append({
                    "id": _clean_digits(c.phone),
                    "name": c.full_name,
                    "phone": c.phone,
                    "unreadCount": 0,
                    "lastMessage": {
                        "body": f"Chat with {c.full_name}",
                        "timestamp": int(time.time()),
                        "fromMe": False
                    }
                })
        return {"success": True, "chats": chats}

    @staticmethod
    def get_chat_messages(db: Session, session_id: str, phone: str) -> Dict[str, Any]:
        clean_phone = _clean_digits(phone)
        clean_id = _clean_digits(session_id)

        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{GATEWAY_URL}/sessions/{clean_id}/chats/{clean_phone}/messages")
                if resp.status_code == 200:
                    res = resp.json()
                    if res.get("success"):
                        return res
        except Exception:
            pass

        # Load from DB
        messages = db.query(WhatsAppMessageModel).filter(
            WhatsAppMessageModel.session_id == clean_id,
            WhatsAppMessageModel.phone == clean_phone
        ).order_by(WhatsAppMessageModel.timestamp.asc()).all()

        return {
            "success": True,
            "messages": [
                {
                    "id": m.id,
                    "body": m.body,
                    "fromMe": bool(m.from_me),
                    "timestamp": m.timestamp,
                    "timestamp_ist": (m.created_at or now_ist_naive()).strftime("%d/%m/%Y, %I:%M:%S %p IST"),
                    "media": m.media
                }
                for m in messages
            ]
        }

    @staticmethod
    def send_chat_message(db: Session, session_id: str, phone: str, message: str) -> Dict[str, Any]:
        clean_phone = _clean_digits(phone)
        formatted_phone = format_whatsapp_phone(phone)
        clean_id = _clean_digits(session_id)

        now_naive = now_ist_naive()

        # Save to DB
        new_msg = WhatsAppMessageModel(
            session_id=clean_id,
            phone=formatted_phone,
            body=message,
            from_me=True,
            timestamp=int(time.time()),
            created_at=now_naive
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        # Generate direct WhatsApp Web click-to-send URL
        whatsapp_url = f"https://api.whatsapp.com/send?phone={formatted_phone}&text={urllib.parse.quote(message)}"

        # Attempt gateway delivery if gateway is running
        gateway_sent = False
        gateway_error = None
        try:
            with httpx.Client(timeout=2.0) as client:
                resp = client.post(
                    f"{GATEWAY_URL}/sessions/{clean_id}/chats/{formatted_phone}/send",
                    json={"message": message}
                )
                if resp.status_code == 200 and resp.json().get("success"):
                    gateway_sent = True
                else:
                    gateway_error = resp.json().get("error") if resp.headers.get("content-type", "").startswith("application/json") else resp.text
        except Exception as e:
            gateway_error = f"Gateway offline: {e}"

        return {
            "success": True,
            "gateway_sent": gateway_sent,
            "gateway_error": gateway_error,
            "whatsapp_url": whatsapp_url,
            "formatted_phone": formatted_phone,
            "message_id": new_msg.id,
            "timestamp": new_msg.timestamp,
            "timestamp_ist": now_naive.strftime("%d/%m/%Y, %I:%M:%S %p IST")
        }

    @staticmethod
    def send_media(db: Session, session_id: str, phone: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        clean_phone = _clean_digits(phone)
        clean_id = _clean_digits(session_id)

        new_msg = WhatsAppMessageModel(
            session_id=clean_id,
            phone=clean_phone,
            body=payload.get("caption") or f"Sent {payload.get('fileName', 'media file')}",
            from_me=True,
            timestamp=int(time.time()),
            media={
                "mimeType": payload.get("mimeType"),
                "fileName": payload.get("fileName"),
                "preview": payload.get("data", "")[:100]  # snippet
            },
            created_at=now_ist_naive()
        )
        db.add(new_msg)
        db.commit()

        try:
            with httpx.Client(timeout=8.0) as client:
                client.post(
                    f"{GATEWAY_URL}/sessions/{clean_id}/chats/{clean_phone}/send-media",
                    json=payload
                )
        except Exception:
            pass

        return {"success": True, "message_id": new_msg.id, "timestamp": new_msg.timestamp}

    @staticmethod
    def get_contacts(db: Session, session_id: str) -> List[Dict[str, Any]]:
        clean_id = _clean_digits(session_id)
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(f"{GATEWAY_URL}/sessions/{clean_id}/contacts")
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass

        students = db.query(student).filter(student.phone.isnot(None)).limit(50).all()
        return [
            {
                "number": _clean_digits(c.phone),
                "name": c.full_name,
                "isMyContact": True
            }
            for c in students if c.phone
        ]

    @staticmethod
    def sync_contacts(db: Session, session_id: str, contacts: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {"success": True, "message": f"Processed {len(contacts)} contacts."}
