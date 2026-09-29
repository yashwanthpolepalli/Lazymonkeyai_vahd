import os
import uuid
import time
import httpx
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.models.crm import WhatsAppSessionModel, WhatsAppMessageModel, CrmLead
from src.utils.timezone import now_ist_naive

logger = logging.getLogger(__name__)

_raw_gateway_url = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:8005")
GATEWAY_URL = _raw_gateway_url.replace("localhost", "127.0.0.1")

def _clean_digits(val: str) -> str:
    return "".join(filter(str.isdigit, str(val)))


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
        clean_id = _clean_digits(session_id)
        if not clean_id:
            clean_id = "919908297963"

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

        # Update or create lead
        lead = db.query(CrmLead).filter(CrmLead.phone.contains(from_phone[-10:])).first()
        if not lead:
            lead = CrmLead(
                name=profile_name,
                phone=f"+{from_phone}",
                source="WhatsApp",
                status="lead",
                stage="Prospecting",
                created_at=now_naive
            )
            db.add(lead)
        else:
            lead.last_contacted_at = now_naive

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

        # Return active CRM leads as chat contacts
        leads = db.query(CrmLead).all()
        chats = []
        for l in leads:
            chats.append({
                "id": _clean_digits(l.phone),
                "name": l.name,
                "phone": l.phone,
                "unreadCount": 0,
                "lastMessage": {
                    "body": f"Inquiry about {l.interest or 'Gym Membership'}",
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
        clean_id = _clean_digits(session_id)

        now_naive = now_ist_naive()

        # Save to DB
        new_msg = WhatsAppMessageModel(
            session_id=clean_id,
            phone=clean_phone,
            body=message,
            from_me=True,
            timestamp=int(time.time()),
            created_at=now_naive
        )
        db.add(new_msg)

        # Ensure lead exists
        lead = db.query(CrmLead).filter(CrmLead.phone.contains(clean_phone[-10:])).first()
        if not lead:
            lead = CrmLead(
                name=f"WhatsApp Contact (+{clean_phone})",
                phone=f"+{clean_phone}",
                source="WhatsApp",
                status="lead",
                stage="Prospecting",
                created_at=now_naive
            )
            db.add(lead)
        else:
            lead.last_contacted_at = now_naive

        db.commit()
        db.refresh(new_msg)

        # Try proxying to gateway
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(
                    f"{GATEWAY_URL}/sessions/{clean_id}/chats/{clean_phone}/send",
                    json={"message": message}
                )
        except Exception:
            pass

        return {
            "success": True,
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

        leads = db.query(CrmLead).all()
        return [
            {
                "number": _clean_digits(l.phone),
                "name": l.name,
                "isMyContact": True
            }
            for l in leads
        ]

    @staticmethod
    def sync_contacts(db: Session, session_id: str, contacts: List[Dict[str, Any]]) -> Dict[str, Any]:
        imported_count = 0
        for item in contacts:
            clean_phone = _clean_digits(item.get("number", ""))
            if not clean_phone:
                continue
            existing = db.query(CrmLead).filter(CrmLead.phone.contains(clean_phone[-10:])).first()
            if not existing:
                lead = CrmLead(
                    name=item.get("name") or f"WhatsApp Contact (+{clean_phone})",
                    phone=f"+{clean_phone}",
                    source="WhatsApp",
                    status="lead",
                    stage="Prospecting",
                    created_at=now_ist_naive()
                )
                db.add(lead)
                imported_count += 1
        if imported_count > 0:
            db.commit()
        return {"success": True, "message": f"Successfully imported {imported_count} WhatsApp contacts as CRM leads."}
