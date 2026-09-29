import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from src.database.base import Base
from src.utils.timezone import now_ist_naive

class CrmLead(Base):
    __tablename__ = "crm_leads"

    id = Column(String, primary_key=True, index=True, default=lambda: f"lead_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    source = Column(String, nullable=True)
    interest = Column(String, nullable=True)
    assigned_trainer = Column(String, nullable=True)
    status = Column(String, default="lead", index=True)  # lead, enquiry, trial, follow_up, negotiation, enrollment, active, lost
    stage = Column(String, default="Prospecting")
    probability = Column(Integer, default=0)
    deal_value = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    last_contacted_at = Column(DateTime, default=now_ist_naive)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmVoiceCallLog(Base):
    __tablename__ = "crm_voice_call_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: f"call_{uuid.uuid4().hex[:8]}")
    contact_name = Column(String, nullable=False)
    contact_type = Column(String, nullable=True)  # LEAD, CUSTOMER, TRIAL
    phone = Column(String, nullable=False)
    status = Column(String, default="Completed")  # Completed, Busy, No Answer, In Progress
    duration_seconds = Column(Integer, default=0)
    duration_formatted = Column(String, nullable=True)
    sentiment = Column(String, nullable=True)  # Positive, Neutral, Hesitant, Negative
    qualification_score = Column(Integer, default=0)  # 0 to 100
    ai_summary = Column(Text, nullable=False)
    action_items = Column(JSON, default=list)
    transcript = Column(Text, nullable=True)
    audio_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmSupportTicket(Base):
    __tablename__ = "crm_support_tickets"

    id = Column(String, primary_key=True, index=True, default=lambda: f"tkt_{uuid.uuid4().hex[:6]}")
    customer_name = Column(String, nullable=True)
    customer_id = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    category = Column(String, nullable=True)  # General Support, Billing & Payment, Trainer / Service, Equipment / Facility, Membership
    priority = Column(String, nullable=True)  # Low, Medium, High, Urgent
    status = Column(String, default="Open", index=True)  # Open, In Progress, Resolved, Closed
    description = Column(Text, nullable=False)
    assigned_to = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    resolved_at = Column(DateTime, nullable=True)

class CrmMarketingAd(Base):
    __tablename__ = "crm_marketing_ads"

    id = Column(String, primary_key=True, index=True, default=lambda: f"ad_{uuid.uuid4().hex[:8]}")
    headline = Column(String, nullable=False)
    prompt = Column(Text, nullable=False)
    aspect_ratio = Column(String, nullable=True)
    model_used = Column(String, nullable=True)
    image_url = Column(Text, nullable=True)
    caption = Column(Text, nullable=True)
    target_audience = Column(String, nullable=True)
    status = Column(String, default="Draft")  # Draft, Approved, Published, Scheduled, Paused
    platform = Column(String, nullable=True)
    budget = Column(Float, default=0.0)
    spent = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    leads_generated = Column(Integer, default=0)
    meta_campaign_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmMarketingAsset(Base):
    __tablename__ = "crm_marketing_assets"

    id = Column(String, primary_key=True, index=True, default=lambda: f"ast_{uuid.uuid4().hex[:8]}")
    filename = Column(String, nullable=False)
    public_url = Column(Text, nullable=False)
    aspect_ratio = Column(String, default="1:1")
    source = Column(String, default="gemini")
    provider_model = Column(String, nullable=True)
    original_prompt = Column(Text, nullable=True)
    enhanced_prompt = Column(Text, nullable=True)
    style = Column(String, nullable=True)
    tags = Column(JSON, default=list)
    status = Column(String, default="approved")
    created_at = Column(DateTime, default=now_ist_naive)


class CrmOpportunity(Base):
    __tablename__ = "crm_opportunities"

    id = Column(String, primary_key=True, index=True, default=lambda: f"opp_{uuid.uuid4().hex[:8]}")
    lead_id = Column(String, nullable=True, index=True)
    customer_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    stage = Column(String, nullable=False, default="Prospecting", index=True)  # Prospecting, Qualification, Needs Analysis, Value Proposition, Negotiation, Closed Won, Closed Lost
    amount = Column(Float, default=0.0)
    probability = Column(Integer, default=0)  # 0 - 100%
    expected_close_date = Column(DateTime, nullable=True)
    assigned_to = Column(String, nullable=True)
    next_step = Column(String, nullable=True)
    next_step_at = Column(DateTime, nullable=True)
    forecast_category = Column(String, nullable=True)  # Pipeline, Best Case, Commit, Closed
    lost_reason = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    call_disposition = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

class CrmQuotation(Base):
    __tablename__ = "crm_quotations"

    id = Column(String, primary_key=True, index=True, default=lambda: f"quote_{uuid.uuid4().hex[:8]}")
    quote_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(String, nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    items = Column(JSON, default=list)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String, default="Issued", index=True)  # Draft, Issued, Accepted, Declined, Converted
    valid_until = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmSalesOrder(Base):
    __tablename__ = "crm_sales_orders"

    id = Column(String, primary_key=True, index=True, default=lambda: f"so_{uuid.uuid4().hex[:8]}")
    order_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(String, nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    items = Column(JSON, default=list)
    subtotal = Column(Float, default=0.0)
    additional_charges = Column(JSON, default=list)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    pricing_mode = Column(String, nullable=True)  # Retail, Wholesale
    status = Column(String, default="Pending", index=True)  # Pending, Processing, Shipped, Delivered, Cancelled
    payment_status = Column(String, default="Unpaid", index=True)  # Unpaid, Partially Paid, Paid
    payment_mode = Column(String, nullable=True)
    sales_rep = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmDiscount(Base):
    __tablename__ = "crm_discounts"

    id = Column(String, primary_key=True, index=True, default=lambda: f"disc_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    discount_type = Column(String, default="percentage")  # percentage, fixed_amount, bogo, bundle
    value = Column(Float, default=0.0)
    min_order_value = Column(Float, default=0.0)
    max_discount = Column(Float, nullable=True)
    applicable_scope = Column(String, nullable=True)  # order, product, category, membership_tier
    applicable_products = Column(JSON, default=list)
    applicable_tiers = Column(JSON, default=list)
    usage_limit = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    per_customer_limit = Column(Integer, default=1)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)

class CrmDiscountUsage(Base):
    __tablename__ = "crm_discount_usages"

    id = Column(String, primary_key=True, index=True, default=lambda: f"du_{uuid.uuid4().hex[:8]}")
    discount_id = Column(String, nullable=False, index=True)
    discount_code = Column(String, nullable=False)
    customer_id = Column(String, nullable=True)
    customer_name = Column(String, nullable=True)
    order_id = Column(String, nullable=True)
    order_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    used_at = Column(DateTime, default=now_ist_naive)

class CrmSocialPost(Base):
    __tablename__ = "crm_social_posts"

    id = Column(String, primary_key=True, index=True, default=lambda: f"sp_{uuid.uuid4().hex[:8]}")
    post_id = Column(String, nullable=True)
    platform = Column(String, nullable=True)  # Facebook, Instagram, YouTube, X
    message = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    permalink_url = Column(Text, nullable=True)
    post_type = Column(String, nullable=True)  # organic, sponsored
    reactions = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    leads_count = Column(Integer, default=0)
    published_at = Column(DateTime, default=now_ist_naive)
    created_at = Column(DateTime, default=now_ist_naive)


# ─── PUSH NOTIFICATION & BROADCAST MODELS ───

class PushNotificationTemplate(Base):
    __tablename__ = "push_notification_templates"

    id = Column(String, primary_key=True, index=True, default=lambda: f"tpl_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False)
    category = Column(String, default="hrms", index=True)  # hrms, pos, inventory, system, crm
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

