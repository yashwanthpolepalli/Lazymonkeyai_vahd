"""
FIT CLUB AI — Platform Super Admin Database Models
Multi-tenant platform models for SaaS Plans, Audit Logs, AI Jobs, Platform Settings, and Support Tickets.
"""
import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from src.database.base import Base
from src.utils.timezone import now_ist_naive


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SaaSPlan(Base):
    __tablename__ = "saas_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)  # starter, pro, enterprise, custom
    description = Column(Text, nullable=True)
    price_monthly = Column(Float, nullable=True)
    price_annual = Column(Float, nullable=True)
    max_branches = Column(Integer, nullable=True)
    max_members = Column(Integer, nullable=True)
    max_trainers = Column(Integer, nullable=True)
    ai_credits_monthly = Column(Integer, nullable=True)
    storage_gb = Column(Float, nullable=True)
    features = Column(JSON, nullable=True)  # List of enabled feature strings
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class PlatformAuditLog(Base):
    __tablename__ = "platform_audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True)
    actor_name = Column(String(150), nullable=True)
    actor_email = Column(String(150), nullable=True)
    organization_id = Column(String(36), nullable=True)
    organization_name = Column(String(150), nullable=True)
    action = Column(String(100), nullable=False)  # e.g. "CHANGE_PLAN", "SUSPEND_GYM", "PUBLISH_TEMPLATE"
    resource_type = Column(String(50), nullable=False)  # "organization", "plan", "user", "ai_model", "template"
    resource_id = Column(String(100), nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=now_ist_naive)


class AiJobLog(Base):
    __tablename__ = "ai_job_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_number = Column(String(50), nullable=False, unique=True)
    organization_id = Column(String(36), nullable=True)
    organization_name = Column(String(150), nullable=True)
    task_type = Column(String(50), nullable=False)  # "image_generate", "ocr_scan", "vision_analyze", "text_prompt", "upscale"
    provider = Column(String(50), nullable=True)
    model_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=True)  # "completed", "processing", "failed"
    duration_seconds = Column(Float, nullable=True)
    credits_consumed = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    input_params = Column(JSON, nullable=True)
    output_result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
    category = Column(String(50), nullable=True)  # "general", "billing", "security", "ai"
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class SupportTicket(Base):
    __tablename__ = "platform_support_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number = Column(String(50), unique=True, nullable=False)
    organization_id = Column(String(36), nullable=True)
    organization_name = Column(String(150), nullable=True)
    user_name = Column(String(150), nullable=True)
    user_email = Column(String(150), nullable=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), nullable=True)  # "low", "medium", "high", "urgent"
    status = Column(String(20), nullable=True)  # "open", "investigating", "escalated", "resolved"
    created_at = Column(DateTime, default=now_ist_naive)
    resolved_at = Column(DateTime, nullable=True)


class PlatformAlert(Base):
    __tablename__ = "platform_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    severity = Column(String(20), nullable=True)  # "critical", "warning", "info"
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=True)  # "payments", "devices", "ai_queue", "database"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
    resolved_at = Column(DateTime, nullable=True)


class AiModelRouting(Base):
    __tablename__ = "ai_model_routings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    capability = Column(String(50), unique=True, nullable=False)  # "text_generation", "image_generation", "ocr_vision", "upscale"
    provider = Column(String(50), nullable=True)
    model_id = Column(String(100), nullable=True)
    status = Column(String(20), nullable=True)  # "operational", "degraded", "disabled"
    cost_per_1k_tokens = Column(Float, nullable=True)
    avg_latency_sec = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


