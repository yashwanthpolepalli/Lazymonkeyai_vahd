import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from src.database.base import Base
from src.utils.timezone import now_ist_naive


# ─── PUSH NOTIFICATION & BROADCAST MODELS ───

class PushNotificationTemplate(Base):
    __tablename__ = "push_notification_templates"

    id = Column(String, primary_key=True, index=True, default=lambda: f"tpl_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    category = Column(String, default="hrms", index=True)  # hrms, pos, inventory, system
    title_template = Column(String, nullable=False)
    body_template = Column(Text, nullable=False)
    action_url = Column(String, nullable=True)
    priority = Column(String, default="normal")  # normal, high, urgent
    icon_type = Column(String, default="bell")
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist_naive)


class NotificationBroadcast(Base):
    __tablename__ = "notification_broadcasts"

    id = Column(String, primary_key=True, index=True, default=lambda: f"bc_{uuid.uuid4().hex[:8]}")
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String, default="system")
    target_type = Column(String, default="all_org")  # all_org, roles, departments, individual
    target_filter = Column(JSON, default=list)
    action_url = Column(String, nullable=True)
    channels = Column(JSON, default=lambda: ["mobile_push", "web_push", "in_app"])
    recipients_count = Column(Integer, default=0)
    sent_by = Column(String, default="System Admin")
    status = Column(String, default="Delivered")
    created_at = Column(DateTime, default=now_ist_naive)


class LiveNotification(Base):
    __tablename__ = "live_notifications"

    id = Column(String, primary_key=True, index=True, default=lambda: f"notif_{uuid.uuid4().hex[:8]}")
    user_id = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    category = Column(String, default="system")
    unread = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"

    id = Column(String, primary_key=True, index=True, default=lambda: f"dev_{uuid.uuid4().hex[:8]}")
    user_id = Column(String, nullable=True, index=True)
    device_token = Column(String, unique=True, nullable=False)
    platform = Column(String, default="web")  # web, android, ios
    device_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)


# ─── WHATSAPP CAMPAIGNS & SESSIONS MODELS ───

class WhatsAppSessionModel(Base):
    __tablename__ = "whatsapp_sessions"

    id = Column(String, primary_key=True, index=True)  # phone number (e.g. 919908297963)
    session_id = Column(String, index=True, nullable=False)
    status = Column(String, default="QR_READY")  # QR_READY, CONNECTED, DISCONNECTED, PAIRING
    qr = Column(Text, nullable=True)
    owner_name = Column(String, default="Administrator")
    info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class WhatsAppMessageModel(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String, primary_key=True, index=True, default=lambda: f"wam_{uuid.uuid4().hex[:8]}")
    session_id = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    body = Column(Text, nullable=False)
    from_me = Column(Boolean, default=True)
    timestamp = Column(Integer, nullable=False)
    media = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
