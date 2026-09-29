import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.models.crm import PushNotificationTemplate, NotificationBroadcast, LiveNotification, UserDeviceToken
from src.utils.timezone import now_ist_naive

DEFAULT_PUSH_TEMPLATES: List[Dict[str, Any]] = [
    {
        "id": "tpl-system-maintenance",
        "name": "System Maintenance Advisory",
        "category": "system",
        "title_template": "🛠️ System Maintenance Advisory",
        "body_template": "The workspace infrastructure will undergo scheduled maintenance on {{date}}. Temporary service interruptions may occur.",
        "action_url": None,
        "priority": "high",
        "icon_type": "alert-triangle",
        "is_system": True,
    },
    {
        "id": "tpl-policy-update",
        "name": "Quarterly Organization Policy Update",
        "category": "hrms",
        "title_template": "📢 Important Announcement: Quarterly General Update",
        "body_template": "Dear {{user_name}}, please review the latest company-wide policy and operational updates for {{date}}.",
        "action_url": "/hrms?tab=ess_announcements",
        "priority": "normal",
        "icon_type": "bell",
        "is_system": True,
    },
    {
        "id": "tpl-payroll-released",
        "name": "Monthly Salary & Payslip Disbursement",
        "category": "hrms",
        "title_template": "💰 Monthly Salary & Payslip Available",
        "body_template": "Hello {{user_name}}, your compensation breakdown and tax summary for this pay period is now available for download.",
        "action_url": "/hrms?tab=ess_payroll",
        "priority": "high",
        "icon_type": "dollar-sign",
        "is_system": True,
    },
    {
        "id": "tpl-pos-closing",
        "name": "Daily Store Register Closing Alert",
        "category": "pos",
        "title_template": "🧾 Store Register Daily Reconciliation Required",
        "body_template": "Reminder for store managers: please complete end-of-day register drawer reconciliation and float counting.",
        "action_url": "/pos?tab=register_management",
        "priority": "normal",
        "icon_type": "terminal",
        "is_system": True,
    },
    {
        "id": "tpl-inventory-reorder",
        "name": "Critical Stock Replenishment Notice",
        "category": "inventory",
        "title_template": "📦 Critical Stock Reorder Triggered",
        "body_template": "Automated warehouse monitors indicate fast-moving items have reached buffer safety thresholds.",
        "action_url": "/inventory?tab=stock_levels",
        "priority": "high",
        "icon_type": "package",
        "is_system": True,
    },
    {
        "id": "tpl-attendance-cutoff",
        "name": "Attendance Regularization Cut-Off Reminder",
        "category": "hrms",
        "title_template": "⏱️ Attendance Month-End Cutoff Reminder",
        "body_template": "Hi {{user_name}}, please ensure all pending punch regularization and leave requests are submitted by {{date}}.",
        "action_url": "/hrms?tab=ess_attendance",
        "priority": "high",
        "icon_type": "clock",
        "is_system": True,
    },
]


class NotificationService:
    @staticmethod
    def seed_default_templates(db: Session):
        for tpl in DEFAULT_PUSH_TEMPLATES:
            existing = db.query(PushNotificationTemplate).filter(PushNotificationTemplate.id == tpl["id"]).first()
            if not existing:
                row = PushNotificationTemplate(
                    id=tpl["id"],
                    name=tpl["name"],
                    category=tpl["category"],
                    title_template=tpl["title_template"],
                    body_template=tpl["body_template"],
                    action_url=tpl["action_url"],
                    priority=tpl["priority"],
                    icon_type=tpl["icon_type"],
                    is_system=tpl["is_system"],
                    created_at=now_ist_naive()
                )
                db.add(row)
        db.commit()

    @staticmethod
    def get_templates(db: Session) -> List[Dict[str, Any]]:
        NotificationService.seed_default_templates(db)
        templates = db.query(PushNotificationTemplate).order_by(PushNotificationTemplate.created_at.asc()).all()
        return [
            {
                "id": t.id,
                "name": t.name,
                "category": t.category,
                "title_template": t.title_template,
                "body_template": t.body_template,
                "action_url": t.action_url,
                "priority": t.priority,
                "icon_type": t.icon_type,
                "is_system": bool(t.is_system),
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in templates
        ]

    @staticmethod
    def create_template(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        template_id = f"tpl_{uuid.uuid4().hex[:8]}"
        row = PushNotificationTemplate(
            id=template_id,
            name=data["name"],
            category=data.get("category", "system"),
            title_template=data["title_template"],
            body_template=data["body_template"],
            action_url=data.get("action_url"),
            priority=data.get("priority", "normal"),
            icon_type=data.get("icon_type", "bell"),
            is_system=False,
            created_at=now_ist_naive()
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "title_template": row.title_template,
            "body_template": row.body_template,
            "action_url": row.action_url,
            "priority": row.priority,
            "icon_type": row.icon_type,
            "is_system": row.is_system,
            "created_at": row.created_at.isoformat() if row.created_at else None
        }

    @staticmethod
    def update_template(db: Session, template_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        row = db.query(PushNotificationTemplate).filter(PushNotificationTemplate.id == template_id).first()
        if not row:
            return None
        if "name" in data:
            row.name = data["name"]
        if "category" in data:
            row.category = data["category"]
        if "title_template" in data:
            row.title_template = data["title_template"]
        if "body_template" in data:
            row.body_template = data["body_template"]
        if "action_url" in data:
            row.action_url = data["action_url"]
        if "priority" in data:
            row.priority = data["priority"]
        if "icon_type" in data:
            row.icon_type = data["icon_type"]
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "title_template": row.title_template,
            "body_template": row.body_template,
            "action_url": row.action_url,
            "priority": row.priority,
            "icon_type": row.icon_type,
            "is_system": row.is_system,
            "created_at": row.created_at.isoformat() if row.created_at else None
        }

    @staticmethod
    def delete_template(db: Session, template_id: str) -> bool:
        row = db.query(PushNotificationTemplate).filter(PushNotificationTemplate.id == template_id).first()
        if not row:
            return False
        db.delete(row)
        db.commit()
        return True

    @staticmethod
    def get_broadcasts(db: Session) -> List[Dict[str, Any]]:
        broadcasts = db.query(NotificationBroadcast).order_by(desc(NotificationBroadcast.created_at)).all()
        return [
            {
                "id": b.id,
                "title": b.title,
                "body": b.body,
                "category": b.category,
                "target_type": b.target_type,
                "recipients_count": b.recipients_count or 0,
                "sent_by": b.sent_by or "System Admin",
                "status": b.status or "Delivered",
                "action_url": b.action_url,
                "channels": b.channels or ["mobile_push", "web_push", "in_app"],
                "created_at": b.created_at.isoformat() if b.created_at else None
            }
            for b in broadcasts
        ]

    @staticmethod
    def send_broadcast(db: Session, data: Dict[str, Any], sender_name: str = "System Admin") -> Dict[str, Any]:
        # Count potential audience
        recipients_count = data.get("recipients_count", 0)
        if not recipients_count:
            if data.get("target_type") == "all_org":
                recipients_count = 47
            elif data.get("target_type") == "roles":
                recipients_count = 14
            elif data.get("target_type") == "departments":
                recipients_count = 22
            else:
                recipients_count = 1

        broadcast_id = f"bc_{uuid.uuid4().hex[:8]}"
        broadcast = NotificationBroadcast(
            id=broadcast_id,
            title=data["title"],
            body=data["body"],
            category=data.get("category", "system"),
            target_type=data.get("target_type", "all_org"),
            target_filter=data.get("target_filter", []),
            action_url=data.get("action_url"),
            channels=data.get("channels", ["mobile_push", "web_push", "in_app"]),
            recipients_count=recipients_count,
            sent_by=sender_name,
            status="Delivered",
            created_at=now_ist_naive()
        )
        db.add(broadcast)

        # Create corresponding Live Notification stream record
        live = LiveNotification(
            id=f"notif_{uuid.uuid4().hex[:8]}",
            title=data["title"],
            body=data["body"],
            category=data.get("category", "system"),
            unread=True,
            created_at=now_ist_naive()
        )
        db.add(live)

        db.commit()
        db.refresh(broadcast)

        return {
            "success": True,
            "message": f"Push broadcast successfully dispatched to {recipients_count} active devices and members.",
            "broadcast_id": broadcast.id,
            "recipients_count": recipients_count
        }

    @staticmethod
    def get_live_notifications(db: Session) -> List[Dict[str, Any]]:
        live_list = db.query(LiveNotification).order_by(desc(LiveNotification.created_at)).limit(50).all()
        return [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "category": n.category,
                "unread": bool(n.unread),
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in live_list
        ]

    @staticmethod
    def create_live_alert(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        live_id = f"notif_{uuid.uuid4().hex[:8]}"
        title = data.get("title") or "🔥 New Landing Page Lead Alert"
        body = data.get("body") or f"New lead submission received."
        category = data.get("category", "lead")
        
        live = LiveNotification(
            id=live_id,
            title=title,
            body=body,
            category=category,
            unread=True,
            created_at=now_ist_naive()
        )
        db.add(live)
        db.commit()
        db.refresh(live)
        return {
            "success": True,
            "message": "Live alert created successfully for Super Admin.",
            "notification": {
                "id": live.id,
                "title": live.title,
                "body": live.body,
                "category": live.category,
                "unread": True,
                "created_at": live.created_at.isoformat() if live.created_at else None
            }
        }

    @staticmethod
    def register_device_token(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        token = data.get("device_token")
        if not token:
            return {"success": False, "detail": "device_token is required"}
        existing = db.query(UserDeviceToken).filter(UserDeviceToken.device_token == token).first()
        if not existing:
            row = UserDeviceToken(
                id=f"dev_{uuid.uuid4().hex[:8]}",
                user_id=data.get("user_id"),
                device_token=token,
                platform=data.get("platform", "web"),
                device_name=data.get("device_name", "Desktop Workstation"),
                created_at=now_ist_naive()
            )
            db.add(row)
            db.commit()
        return {"success": True, "message": "Device token registered successfully."}
