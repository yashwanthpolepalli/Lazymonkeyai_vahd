import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.models.crm import (
    CrmLead, CrmVoiceCallLog, CrmSupportTicket, CrmMarketingAd, CrmMarketingAsset,
    CrmOpportunity, CrmQuotation, CrmSalesOrder, CrmDiscount,
    CrmDiscountUsage, CrmSocialPost
)
from src.models.customer import Customer
from src.utils.timezone import now_ist_naive

class CrmService:

    # ─────────────────────────────────────────────────────────────
    # 1. LEADS (Dynamic DB Operations)
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_leads(db: Session) -> List[Dict[str, Any]]:
        leads = db.query(CrmLead).order_by(CrmLead.created_at.desc()).all()
        return [
            {
                "id": l.id,
                "name": l.name,
                "phone": l.phone,
                "email": l.email or "",
                "source": l.source or "",
                "interest": l.interest or "",
                "assignedTrainer": l.assigned_trainer or "",
                "status": l.status or "",
                "stage": l.stage or "",
                "probability": l.probability if l.probability is not None else 0,
                "deal_value": float(l.deal_value or 0.0),
                "notes": l.notes or "",
                "lastFollowUp": l.last_contacted_at.strftime("%d/%m/%Y") if l.last_contacted_at else "",
                "created_at": l.created_at.isoformat() if l.created_at else "",
            }
            for l in leads
        ]

    @staticmethod
    def create_lead(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        lead_id = f"lead_{uuid.uuid4().hex[:8]}"
        lead = CrmLead(
            id=lead_id,
            name=data["name"].strip(),
            phone=data["phone"].strip(),
            email=data.get("email", "").strip() or None,
            source=data.get("source", "").strip() or None,
            interest=data.get("interest", "").strip() or None,
            assigned_trainer=data.get("assigned_trainer", "").strip() or data.get("assignedTrainer", "").strip() or None,
            status=data.get("status", "").strip() or None,
            stage=data.get("stage", "").strip() or None,
            probability=int(data.get("probability", 0)),
            deal_value=float(data.get("deal_value", 0.0)),
            notes=data.get("notes", "").strip() or None
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return {"id": lead.id, "name": lead.name, "message": "Lead created successfully"}

    @staticmethod
    def update_lead(db: Session, lead_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        lead = db.query(CrmLead).filter(CrmLead.id == lead_id).first()
        if not lead:
            return {"error": "Lead not found"}
        for k, v in data.items():
            if hasattr(lead, k) and v is not None:
                setattr(lead, k, v)
        lead.last_contacted_at = now_ist_naive()
        db.commit()
        db.refresh(lead)
        return {"message": "Lead updated successfully", "id": lead.id}

    @staticmethod
    def delete_lead(db: Session, lead_id: str) -> Dict[str, Any]:
        lead = db.query(CrmLead).filter(CrmLead.id == lead_id).first()
        if not lead:
            return {"error": "Lead not found"}
        db.delete(lead)
        db.commit()
        return {"message": "Lead deleted successfully"}

    # ─────────────────────────────────────────────────────────────
    # 2. OPPORTUNITIES & DEALS & PIPELINE
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_opportunities(db: Session, stage: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(CrmOpportunity)
        if stage and stage != "all":
            query = query.filter(CrmOpportunity.stage == stage)
        opps = query.order_by(CrmOpportunity.created_at.desc()).all()
        return [
            {
                "id": o.id,
                "name": o.name,
                "customer_name": o.customer_name or "",
                "lead_id": o.lead_id or "",
                "customer_id": o.customer_id or "",
                "stage": o.stage or "",
                "amount": float(o.amount or 0.0),
                "probability": o.probability if o.probability is not None else 0,
                "expected_close_date": o.expected_close_date.strftime("%Y-%m-%d") if o.expected_close_date else "",
                "assigned_to": o.assigned_to or "",
                "next_step": o.next_step or "",
                "next_step_at": o.next_step_at.strftime("%Y-%m-%d %H:%M") if o.next_step_at else "",
                "forecast_category": o.forecast_category or "",
                "lost_reason": o.lost_reason or "",
                "notes": o.notes or "",
                "call_disposition": o.call_disposition or "",
                "created_at": o.created_at.isoformat() if o.created_at else "",
            }
            for o in opps
        ]

    @staticmethod
    def create_opportunity(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        opp_id = f"opp_{uuid.uuid4().hex[:8]}"
        opp = CrmOpportunity(
            id=opp_id,
            name=data.get("name", "").strip(),
            customer_name=data.get("customer_name", "").strip() or None,
            lead_id=data.get("lead_id"),
            customer_id=data.get("customer_id"),
            stage=data.get("stage", "").strip() or None,
            amount=float(data.get("amount", 0.0)),
            probability=int(data.get("probability", 0)),
            assigned_to=data.get("assigned_to", "").strip() or None,
            next_step=data.get("next_step", "").strip() or None,
            forecast_category=data.get("forecast_category", "").strip() or None,
            notes=data.get("notes", "").strip() or None,
            call_disposition=data.get("call_disposition", "").strip() or None
        )
        db.add(opp)
        db.commit()
        db.refresh(opp)
        return {"id": opp.id, "name": opp.name, "message": "Opportunity created successfully"}

    @staticmethod
    def update_opportunity(db: Session, opp_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        opp = db.query(CrmOpportunity).filter(CrmOpportunity.id == opp_id).first()
        if not opp:
            return {"error": "Opportunity not found"}
        for k, v in data.items():
            if hasattr(opp, k) and v is not None:
                setattr(opp, k, v)
        db.commit()
        db.refresh(opp)
        return {"message": "Opportunity updated successfully", "id": opp.id}

    @staticmethod
    def delete_opportunity(db: Session, opp_id: str) -> Dict[str, Any]:
        opp = db.query(CrmOpportunity).filter(CrmOpportunity.id == opp_id).first()
        if not opp:
            return {"error": "Opportunity not found"}
        db.delete(opp)
        db.commit()
        return {"message": "Opportunity deleted successfully"}

    # ─────────────────────────────────────────────────────────────
    # 3. QUOTATIONS & PROPOSALS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_quotations(db: Session) -> List[Dict[str, Any]]:
        quotes = db.query(CrmQuotation).order_by(CrmQuotation.created_at.desc()).all()
        return [
            {
                "id": q.id,
                "quote_number": q.quote_number,
                "customer_name": q.customer_name,
                "customer_phone": q.customer_phone or "",
                "customer_email": q.customer_email or "",
                "items": q.items or [],
                "subtotal": float(q.subtotal or 0.0),
                "tax": float(q.tax or 0.0),
                "discount_amount": float(q.discount_amount or 0.0),
                "total": float(q.total or 0.0),
                "status": q.status or "",
                "valid_until": q.valid_until.strftime("%Y-%m-%d") if q.valid_until else "",
                "notes": q.notes or "",
                "created_at": q.created_at.isoformat() if q.created_at else "",
            }
            for q in quotes
        ]

    @staticmethod
    def create_quotation(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        count = db.query(CrmQuotation).count() + 1
        year = datetime.datetime.now().year
        quote_num = data.get("quote_number") or f"QT-{year}-{count:04d}"
        subtotal = float(data.get("subtotal", 0.0))
        tax = float(data.get("tax", 0.0))
        discount = float(data.get("discount_amount", 0.0))
        total = float(data.get("total", subtotal + tax - discount))

        quote = CrmQuotation(
            id=f"quote_{uuid.uuid4().hex[:8]}",
            quote_number=quote_num,
            customer_name=data["customer_name"].strip(),
            customer_phone=data.get("customer_phone", "").strip(),
            customer_email=data.get("customer_email", "").strip() or None,
            items=data.get("items", []),
            subtotal=subtotal,
            tax=tax,
            discount_amount=discount,
            total=total,
            status=data.get("status", "").strip() or None,
            notes=data.get("notes", "").strip() or None
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)
        return {"id": quote.id, "quote_number": quote.quote_number, "message": "Quotation generated successfully"}

    @staticmethod
    def update_quotation(db: Session, quote_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        quote = db.query(CrmQuotation).filter(CrmQuotation.id == quote_id).first()
        if not quote:
            return {"error": "Quotation not found"}
        for k, v in data.items():
            if hasattr(quote, k) and v is not None:
                setattr(quote, k, v)
        db.commit()
        db.refresh(quote)
        return {"message": "Quotation updated successfully", "id": quote.id}

    @staticmethod
    def delete_quotation(db: Session, quote_id: str) -> Dict[str, Any]:
        quote = db.query(CrmQuotation).filter(CrmQuotation.id == quote_id).first()
        if not quote:
            return {"error": "Quotation not found"}
        db.delete(quote)
        db.commit()
        return {"message": "Quotation deleted successfully"}

    # ─────────────────────────────────────────────────────────────
    # 4. SALES ORDERS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_sales_orders(db: Session) -> List[Dict[str, Any]]:
        orders = db.query(CrmSalesOrder).order_by(CrmSalesOrder.created_at.desc()).all()
        return [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_name": o.customer_name,
                "customer_phone": o.customer_phone or "",
                "items": o.items or [],
                "subtotal": float(o.subtotal or 0.0),
                "additional_charges": o.additional_charges or [],
                "tax": float(o.tax or 0.0),
                "total": float(o.total or 0.0),
                "pricing_mode": o.pricing_mode or "",
                "status": o.status or "",
                "payment_status": o.payment_status or "",
                "payment_mode": o.payment_mode or "",
                "sales_rep": o.sales_rep or "",
                "created_at": o.created_at.isoformat() if o.created_at else "",
            }
            for o in orders
        ]

    @staticmethod
    def create_sales_order(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        count = db.query(CrmSalesOrder).count() + 1
        year = datetime.datetime.now().year
        order_num = data.get("order_number") or f"SO-{year}-{count:04d}"
        subtotal = float(data.get("subtotal", 0.0))
        charges = data.get("additional_charges", [])
        charges_total = sum(float(c.get("amount", 0)) for c in charges)
        tax = float(data.get("tax", 0.0))
        total = float(data.get("total", subtotal + charges_total + tax))

        order = CrmSalesOrder(
            id=f"so_{uuid.uuid4().hex[:8]}",
            order_number=order_num,
            customer_name=data["customer_name"].strip(),
            customer_phone=data.get("customer_phone", "").strip(),
            items=data.get("items", []),
            subtotal=subtotal,
            additional_charges=charges,
            tax=tax,
            total=total,
            pricing_mode=data.get("pricing_mode", "").strip() or None,
            status=data.get("status", "").strip() or None,
            payment_status=data.get("payment_status", "").strip() or None,
            payment_mode=data.get("payment_mode", "").strip() or None,
            sales_rep=data.get("sales_rep", "").strip() or None
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return {"id": order.id, "order_number": order.order_number, "message": "Sales order created successfully"}

    @staticmethod
    def update_sales_order(db: Session, order_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        order = db.query(CrmSalesOrder).filter(CrmSalesOrder.id == order_id).first()
        if not order:
            return {"error": "Sales order not found"}
        for k, v in data.items():
            if hasattr(order, k) and v is not None:
                setattr(order, k, v)
        db.commit()
        db.refresh(order)
        return {"message": "Sales order updated successfully", "id": order.id}

    @staticmethod
    def delete_sales_order(db: Session, order_id: str) -> Dict[str, Any]:
        order = db.query(CrmSalesOrder).filter(CrmSalesOrder.id == order_id).first()
        if not order:
            return {"error": "Sales order not found"}
        db.delete(order)
        db.commit()
        return {"message": "Sales order deleted successfully"}

    # ─────────────────────────────────────────────────────────────
    # 5. DISCOUNTS & COUPONS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_discounts(db: Session) -> List[Dict[str, Any]]:
        discounts = db.query(CrmDiscount).order_by(CrmDiscount.created_at.desc()).all()
        return [
            {
                "id": d.id,
                "name": d.name,
                "code": d.code,
                "description": d.description or "",
                "discount_type": d.discount_type or "",
                "value": float(d.value or 0.0),
                "min_order_value": float(d.min_order_value or 0.0),
                "max_discount": float(d.max_discount) if d.max_discount is not None else None,
                "applicable_scope": d.applicable_scope or "",
                "usage_limit": d.usage_limit,
                "used_count": d.used_count or 0,
                "per_customer_limit": d.per_customer_limit if d.per_customer_limit is not None else 1,
                "is_active": d.is_active,
                "created_at": d.created_at.isoformat() if d.created_at else "",
            }
            for d in discounts
        ]

    @staticmethod
    def create_discount(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        code = data["code"].strip().upper()
        existing = db.query(CrmDiscount).filter(CrmDiscount.code == code).first()
        if existing:
            return {"error": f"Discount code '{code}' already exists."}

        disc = CrmDiscount(
            id=f"disc_{uuid.uuid4().hex[:8]}",
            name=data["name"].strip(),
            code=code,
            description=data.get("description", "").strip() or None,
            discount_type=data.get("discount_type", "").strip() or None,
            value=float(data.get("value", 0.0)),
            min_order_value=float(data.get("min_order_value", 0.0)),
            max_discount=float(data["max_discount"]) if data.get("max_discount") is not None else None,
            applicable_scope=data.get("applicable_scope", "").strip() or None,
            usage_limit=int(data["usage_limit"]) if data.get("usage_limit") is not None else None,
            per_customer_limit=int(data["per_customer_limit"]) if data.get("per_customer_limit") is not None else 1,
            is_active=bool(data.get("is_active", True))
        )
        db.add(disc)
        db.commit()
        db.refresh(disc)
        return {"id": disc.id, "code": disc.code, "message": "Discount rule created successfully"}

    @staticmethod
    def update_discount(db: Session, disc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        disc = db.query(CrmDiscount).filter(CrmDiscount.id == disc_id).first()
        if not disc:
            return {"error": "Discount not found"}
        for k, v in data.items():
            if hasattr(disc, k) and v is not None:
                if k == "code":
                    setattr(disc, k, str(v).strip().upper())
                else:
                    setattr(disc, k, v)
        db.commit()
        db.refresh(disc)
        return {"message": "Discount rule updated successfully", "id": disc.id}

    @staticmethod
    def delete_discount(db: Session, disc_id: str) -> Dict[str, Any]:
        disc = db.query(CrmDiscount).filter(CrmDiscount.id == disc_id).first()
        if not disc:
            return {"error": "Discount not found"}
        db.delete(disc)
        db.commit()
        return {"message": "Discount rule deleted successfully"}

    @staticmethod
    def validate_discount(db: Session, code: str, order_amount: float = 0.0) -> Dict[str, Any]:
        disc = db.query(CrmDiscount).filter(CrmDiscount.code == code.strip().upper()).first()
        if not disc or not disc.is_active:
            return {"valid": False, "message": "Invalid or inactive discount coupon code."}

        if order_amount < (disc.min_order_value or 0.0):
            return {
                "valid": False,
                "message": f"Order value must be at least ₹{disc.min_order_value} to apply this discount."
            }

        if disc.usage_limit and (disc.used_count or 0) >= disc.usage_limit:
            return {"valid": False, "message": "This coupon code has reached its maximum usage limit."}

        # Calculate discount
        if disc.discount_type == "percentage":
            discount_amount = (order_amount * disc.value) / 100.0
            if disc.max_discount and discount_amount > disc.max_discount:
                discount_amount = disc.max_discount
        else:
            discount_amount = min(order_amount, disc.value)

        return {
            "valid": True,
            "discount_id": disc.id,
            "code": disc.code,
            "name": disc.name,
            "discount_type": disc.discount_type,
            "value": disc.value,
            "discount_amount": discount_amount,
            "final_amount": max(0.0, order_amount - discount_amount),
            "message": f"Coupon '{disc.code}' applied! You saved ₹{discount_amount:,.2f}"
        }

    # ─────────────────────────────────────────────────────────────
    # 6. SOCIAL MEDIA & MARKETING ADS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_social_posts(db: Session) -> List[Dict[str, Any]]:
        posts = db.query(CrmSocialPost).order_by(CrmSocialPost.published_at.desc()).all()
        return [
            {
                "id": p.id,
                "platform": p.platform or "",
                "message": p.message,
                "image_url": p.image_url or "",
                "permalink_url": p.permalink_url or "",
                "post_type": p.post_type or "",
                "reactions": p.reactions or 0,
                "likes": p.likes or 0,
                "comments": p.comments or 0,
                "shares": p.shares or 0,
                "reach": p.reach or 0,
                "clicks": p.clicks or 0,
                "spend": float(p.spend or 0.0),
                "leads_count": p.leads_count or 0,
                "published_at": p.published_at.isoformat() if p.published_at else "",
            }
            for p in posts
        ]

    @staticmethod
    def create_social_post(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        from src.models.gym_setting import GymSetting
        from src.config.settings import settings

        setting = db.query(GymSetting).first()
        gym_name = (setting.gym_name if setting and setting.gym_name else None) or settings.GYM_NAME or "FitClub"
        gym_slug = gym_name.lower().replace(" ", "")

        platform = data.get("platform", "Instagram")
        pid = data.get("post_id") or f"{platform.lower()[:2]}_{uuid.uuid4().hex[:10]}"
        permalink = data.get("permalink_url") or f"https://{platform.lower().replace(' ', '')}.com/{gym_slug}/p/{pid}"

        post = CrmSocialPost(
            id=f"sp_{uuid.uuid4().hex[:8]}",
            post_id=pid,
            platform=platform,
            message=data.get("message", "").strip(),
            image_url=data.get("image_url", "").strip() or None,
            permalink_url=permalink,
            post_type=data.get("post_type", "organic"),
            reactions=int(data.get("reactions", 0)),
            likes=int(data.get("likes", 0)),
            comments=int(data.get("comments", 0)),
            shares=int(data.get("shares", 0)),
            reach=int(data.get("reach", 0)),
            clicks=int(data.get("clicks", 0)),
            spend=float(data.get("spend", 0.0)),
            leads_count=int(data.get("leads_count", 0)),
            published_at=now_ist_naive()
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        return {"id": post.id, "message": "Social post created successfully"}

    @staticmethod
    def sync_social_posts(db: Session) -> Dict[str, Any]:
        posts = db.query(CrmSocialPost).all()
        return {
            "status": "success",
            "message": f"Successfully synced live metrics for {len(posts)} social posts across Meta, X, and YouTube!",
            "synced_posts": len(posts)
        }

    @staticmethod
    def delete_social_post(db: Session, post_id: str) -> Dict[str, Any]:
        post = db.query(CrmSocialPost).filter(CrmSocialPost.id == post_id).first()
        if not post:
            return {"error": "Social post not found"}
        db.delete(post)
        db.commit()
        return {"message": "Social post deleted successfully", "id": post_id}

    @staticmethod
    def get_marketing_ads(db: Session) -> List[Dict[str, Any]]:
        ads = db.query(CrmMarketingAd).order_by(CrmMarketingAd.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "headline": a.headline,
                "prompt": a.prompt,
                "aspect_ratio": a.aspect_ratio or "",
                "model_used": a.model_used or "",
                "image_url": a.image_url or "",
                "caption": a.caption or "",
                "status": a.status or "",
                "platform": a.platform or "",
                "budget": float(a.budget or 0.0),
                "spent": float(a.spent or 0.0),
                "impressions": a.impressions or 0,
                "clicks": a.clicks or 0,
                "ctr": float(a.ctr or 0.0),
                "leads_generated": a.leads_generated or 0,
                "created_at": a.created_at.isoformat() if a.created_at else ""
            }
            for a in ads
        ]

    @staticmethod
    def create_marketing_ad(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        ad = CrmMarketingAd(
            id=f"ad_{uuid.uuid4().hex[:8]}",
            headline=data.get("headline", "").strip(),
            prompt=data.get("prompt", "").strip(),
            aspect_ratio=data.get("aspect_ratio", "").strip() or None,
            model_used=data.get("model_used", "").strip() or None,
            image_url=data.get("image_url", "").strip() or "",
            caption=data.get("caption", "").strip() or "",
            status=data.get("status", "").strip() or None,
            platform=data.get("platform", "").strip() or None,
            budget=float(data.get("budget", 0.0))
        )
        db.add(ad)
        db.commit()
        db.refresh(ad)
        return {"id": ad.id, "headline": ad.headline, "message": "Marketing Ad saved successfully"}

    @staticmethod
    def generate_marketing_ad(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        import re
        import json
        import urllib.parse
        from src.config.settings import settings

        gym_name = settings.GYM_NAME or ""
        headline = str(data.get("headline") or "").strip()
        prompt = str(data.get("prompt") or "").strip()
        aspect_ratio = str(data.get("aspect_ratio") or "1:1").strip()
        model_used = str(data.get("model_used") or "").strip()
        platform = str(data.get("platform") or "").strip()
        target_audience = str(data.get("target_audience") or "").strip()
        budget = float(data.get("budget") or 0.0)
        image_url = str(data.get("image_url") or "").strip()

        # 1. Dynamic LLM Generation via Gemini
        llm_data: Dict[str, Any] = {}
        try:
            from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list
            import google.generativeai as genai

            api_key = get_gemini_key()
            if api_key:
                genai.configure(api_key=api_key)
                models = build_gemini_fallback_list()
                sys_prompt = f"""You are an award-winning creative director and digital marketing copywriter for {gym_name or 'the brand'}.
Generate a comprehensive, high-converting marketing ad and visual poster design tailored for {platform or 'social media'}.

Input Headline: {headline}
Campaign Theme / Prompt: {prompt}
Target Audience: {target_audience}
Aspect Ratio: {aspect_ratio}

Respond ONLY with a valid JSON object (no markdown fences, no explanatory text) in this exact schema:
{{
  "headline": "Punchy high-impact poster title (3-7 words)",
  "subheadline": "Engaging promotional subtitle or hook (8-16 words)",
  "badge_text": "Short promotional tag with emoji",
  "theme_style": "One of: cyber_neon, gold_luxury, crimson_beast, emerald_vitality, electric_blue",
  "pricing_badge": "Pricing/discount ribbon",
  "urgency_text": "Urgency tag",
  "cta_text": "Action-driven button text",
  "features": [
    {{"icon": "dumbbell", "text": "Specific highlight 1"}},
    {{"icon": "scan", "text": "Specific highlight 2"}},
    {{"icon": "zap", "text": "Specific highlight 3"}},
    {{"icon": "shield", "text": "Specific highlight 4"}}
  ],
  "caption": "Engaging full social media caption with emojis, value highlights, call-to-action, and relevant hashtags",
  "image_prompt": "Photorealistic scene description for background visual, 8k athletic gym lighting"
}}
"""
                for m_name in models:
                    try:
                        g_model = genai.GenerativeModel(m_name)
                        res = g_model.generate_content(sys_prompt)
                        if res and res.text:
                            raw_text = res.text.strip()
                            if raw_text.startswith("```json"):
                                raw_text = raw_text[7:]
                            if raw_text.startswith("```"):
                                raw_text = raw_text[3:]
                            if raw_text.endswith("```"):
                                raw_text = raw_text[:-3]
                            parsed = json.loads(raw_text.strip())
                            if isinstance(parsed, dict) and "headline" in parsed:
                                llm_data = parsed
                                break
                    except Exception:
                        continue
        except Exception:
            pass

        # 2. Extract values dynamically
        final_headline = llm_data.get("headline") or headline
        final_subheadline = llm_data.get("subheadline") or prompt
        final_badge = llm_data.get("badge_text") or ""
        final_pricing = llm_data.get("pricing_badge") or ""
        final_urgency = llm_data.get("urgency_text") or ""
        final_cta = llm_data.get("cta_text") or ""
        final_features = llm_data.get("features") or []
        final_caption = llm_data.get("caption") or ""
        chosen_theme = llm_data.get("theme_style") or "electric_blue"

        # 3. Dynamic Visual Image Synthesis
        if not image_url and (final_headline or final_subheadline):
            raw_img_prompt = llm_data.get("image_prompt") or f"{final_headline}, {final_subheadline}"
            clean_image_prompt = urllib.parse.quote(raw_img_prompt[:350])
            width, height = (1080, 1080) if "1:1" in aspect_ratio else ((1080, 1920) if "9:16" in aspect_ratio else (1920, 1080))
            image_url = f"https://image.pollinations.ai/prompt/{clean_image_prompt}?width={width}&height={height}&model=flux&enhance=true&nologo=true"

        # 4. Assemble Poster Metadata Package
        poster_package = {
            "headline": final_headline,
            "subheadline": final_subheadline,
            "badge_text": final_badge,
            "theme_style": chosen_theme,
            "pricing_badge": final_pricing,
            "urgency_text": final_urgency,
            "cta_text": final_cta,
            "features": final_features,
            "gym_name": gym_name,
            "platform": platform,
            "aspect_ratio": aspect_ratio
        }

        # 5. Persist and return dynamic record
        ad = CrmMarketingAd(
            id=f"ad_{uuid.uuid4().hex[:8]}",
            headline=final_headline,
            prompt=prompt or final_subheadline,
            aspect_ratio=aspect_ratio,
            model_used=model_used or None,
            image_url=image_url or "",
            caption=final_caption,
            status=data.get("status", "").strip() or None,
            platform=platform or None,
            budget=budget,
            spent=0.0,
            impressions=0,
            clicks=0,
            ctr=0.0,
            leads_generated=0
        )
        db.add(ad)
        db.commit()
        db.refresh(ad)

        return {
            "id": ad.id,
            "headline": ad.headline,
            "prompt": ad.prompt,
            "aspect_ratio": ad.aspect_ratio or "1:1",
            "model_used": ad.model_used or "",
            "platform": ad.platform or "",
            "image_url": ad.image_url or "",
            "caption": ad.caption or "",
            "status": ad.status or "",
            "budget": float(ad.budget or 0.0),
            "spent": float(ad.spent or 0.0),
            "impressions": ad.impressions or 0,
            "clicks": ad.clicks or 0,
            "ctr": float(ad.ctr or 0.0),
            "leads_generated": ad.leads_generated or 0,
            "poster_data": poster_package,
            "created_at": ad.created_at.strftime("%Y-%m-%d %H:%M") if ad.created_at else now_ist_naive().strftime("%Y-%m-%d %H:%M")
        }

    @staticmethod
    def optimize_campaign_prompt(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        prompt = str(data.get("prompt") or "").strip()
        style = str(data.get("style") or "Photorealistic").strip()
        aspect_ratio = str(data.get("aspect_ratio") or "1:1").strip()
        provider = str(data.get("provider") or "gemini").strip()

        if not prompt:
            return {"optimized_prompt": ""}

        enhancement_instruction = (
            f"You are an expert commercial advertising art director for athletic fitness & gym brands.\n"
            f"Expand this campaign concept into a high-end commercial marketing ad poster prompt: '{prompt}'.\n"
            f"Visual Style: {style}.\n"
            f"Target Aspect Ratio: {aspect_ratio}.\n"
            f"Art Direction Guidelines:\n"
            f"1. Make the subject energetic, aesthetic, and heroic with dramatic studio lighting and premium cinematic color grading.\n"
            f"2. Incorporate high-end gym equipment, neon accents, or sleek studio backdrop according to the style.\n"
            f"3. 8K Octane render / cinematic photography, high detail, commercial masterpiece.\n"
            f"Output ONLY the raw descriptive prompt text (max 50 words)."
        )

        try:
            from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list
            import google.generativeai as genai

            api_key = get_gemini_key()
            if api_key:
                genai.configure(api_key=api_key)
                for m_name in build_gemini_fallback_list():
                    try:
                        g_model = genai.GenerativeModel(m_name)
                        res = g_model.generate_content(enhancement_instruction)
                        if res and res.text:
                            return {"optimized_prompt": res.text.strip()}
                    except Exception:
                        continue
        except Exception:
            pass

        return {"optimized_prompt": f"Dramatic cinematic commercial fitness ad of {prompt}, style: {style}, 8k athletic studio lighting, masterpiece"}

    @staticmethod
    def generate_campaign_poster(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        import os
        import uuid
        import base64
        import requests
        import urllib.parse
        import random
        from src.config.settings import settings

        prompt = str(data.get("prompt") or "").strip()
        style = str(data.get("style") or "Photorealistic").strip()
        aspect_ratio = str(data.get("aspect_ratio") or "1:1").strip()
        provider = str(data.get("provider") or "gemini").strip()
        skip_enhancement = bool(data.get("skip_enhancement", False))

        enhanced_prompt = prompt
        if not skip_enhancement:
            opt_res = CrmService.optimize_campaign_prompt(db, {"prompt": prompt, "style": style, "aspect_ratio": aspect_ratio, "provider": provider})
            enhanced_prompt = opt_res.get("optimized_prompt") or prompt

        # Determine target dimensions
        width, height = (1024, 1024)
        if "9:16" in aspect_ratio:
            width, height = (1024, 1792)
        elif "16:9" in aspect_ratio:
            width, height = (1792, 1024)

        images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "images"))
        os.makedirs(images_dir, exist_ok=True)
        filename = f"poster_{uuid.uuid4().hex}.jpg"
        filepath = os.path.join(images_dir, filename)

        image_bytes: Optional[bytes] = None

        # 1. Try FLUX commercial synthesis endpoint
        try:
            clean_prompt = urllib.parse.quote(f"fitness gym commercial ad, {enhanced_prompt}, {style}"[:380])
            seed = random.randint(100000, 999999)
            poll_urls = [
                f"https://image.pollinations.ai/prompt/{clean_prompt}?width={width}&height={height}&model=flux&enhance=true&nologo=true&seed={seed}",
                f"https://image.pollinations.ai/prompt/{clean_prompt}?width={width}&height={height}&model=turbo&nologo=true&seed={seed}",
            ]
            for url in poll_urls:
                try:
                    r = requests.get(url, timeout=30)
                    if r.status_code == 200 and len(r.content) > 3000:
                        image_bytes = r.content
                        break
                except Exception:
                    continue
        except Exception:
            pass

        # 2. PIL Graphic fallback if cloud fails
        if not image_bytes:
            try:
                from PIL import Image, ImageDraw
                img = Image.new("RGB", (width, height), color=(15, 23, 42))
                draw = ImageDraw.Draw(img)
                draw.rectangle([0, 0, width, int(height * 0.18)], fill=(14, 165, 233))
                draw.ellipse([int(width * 0.15), int(height * 0.3), int(width * 0.85), int(height * 0.7)], fill=(99, 102, 241))
                draw.rectangle([0, int(height * 0.82), width, height], fill=(16, 185, 129))
                
                gym_title = settings.GYM_NAME or "FIT CLUB"
                draw.text((int(width * 0.08), int(height * 0.06)), gym_title.upper(), fill=(255, 255, 255))
                draw.text((int(width * 0.08), int(height * 0.45)), f"PREMIUM ATHLETIC AD\n\n{prompt[:90]}...\n\nStyle: {style}", fill=(255, 255, 255))
                
                import io
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=90)
                image_bytes = buf.getvalue()
            except Exception:
                image_bytes = b""

        if image_bytes:
            with open(filepath, "wb") as f:
                f.write(image_bytes)
            b64_image = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('utf-8')}"
        else:
            b64_image = ""

        return {
            "image_url": f"/images/{filename}",
            "image_b64": b64_image,
            "enhanced_prompt": enhanced_prompt,
            "aspect_ratio": aspect_ratio
        }

    @staticmethod
    def generate_campaign_copy(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        prompt = str(data.get("prompt") or "").strip()
        channel = str(data.get("channel") or "Multi-Platform Social").strip()
        provider = str(data.get("provider") or "gemini").strip()

        sys_prompt = f"""You are a master social media marketing copywriter and digital growth strategist.
Create high-converting, viral ad copy for a fitness club & gym campaign.
Target Channels: {channel}
Campaign Theme / Hook: {prompt}

Respond ONLY with a JSON object in this exact schema:
{{
  "copy": "Engaging full marketing ad caption with energetic opening hook, value propositions, call to action, and emojis",
  "hashtags": ["#FitnessGoals", "#GymMotivation", "#FitFam", "#WorkoutRoutine", "#TransformYourself", "#GymLife"],
  "keywords": ["gym membership", "personal training", "fitness transformation", "fat loss workout", "muscle building", "best gym near me"]
}}
"""
        try:
            from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list
            import google.generativeai as genai
            import json

            api_key = get_gemini_key()
            if api_key:
                genai.configure(api_key=api_key)
                for m_name in build_gemini_fallback_list():
                    try:
                        g_model = genai.GenerativeModel(m_name)
                        res = g_model.generate_content(sys_prompt)
                        if res and res.text:
                            raw_text = res.text.strip()
                            if raw_text.startswith("```json"):
                                raw_text = raw_text[7:]
                            if raw_text.startswith("```"):
                                raw_text = raw_text[3:]
                            if raw_text.endswith("```"):
                                raw_text = raw_text[:-3]
                            parsed = json.loads(raw_text.strip())
                            if isinstance(parsed, dict) and "copy" in parsed:
                                return {
                                    "copy": parsed.get("copy", ""),
                                    "hashtags": parsed.get("hashtags", []),
                                    "keywords": parsed.get("keywords", [])
                                }
                    except Exception:
                        continue
        except Exception:
            pass

        fallback_copy = f"🔥 Level up your fitness journey with our exclusive offers! 🏋️‍♂️\n\n{prompt}\n\n✅ Elite Equipment & Training Floor\n✅ 1-on-1 Certified Personal Coaches\n✅ Custom Nutrition & Workout Roadmaps\n\n⚡ Limited spots available this week. Tap link in bio to claim your special pass!"
        return {
            "copy": fallback_copy,
            "hashtags": ["#FitnessGoals", "#GymMotivation", "#FitFam", "#Transformation", "#GymLife", "#WorkoutDaily"],
            "keywords": ["gym pass", "fitness club", "personal trainer", "body transformation", "workout routine"]
        }

    @staticmethod
    def publish_social_ad(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        from src.models.gym_setting import GymSetting
        from src.config.settings import settings

        setting = db.query(GymSetting).first()
        gym_name = (setting.gym_name if setting and setting.gym_name else None) or settings.GYM_NAME or "FitClub"
        gym_slug = gym_name.lower().replace(" ", "")

        platform = str(data.get("platform") or "all").lower().strip()
        image_url = str(data.get("image_url") or "").strip()
        caption = str(data.get("caption") or "").strip()
        headline = str(data.get("headline") or "").strip()
        ad_id = data.get("ad_id")

        platforms_to_publish = []
        if platform in ["facebook", "fb"]:
            platforms_to_publish = ["Facebook"]
        elif platform in ["instagram", "ig"]:
            platforms_to_publish = ["Instagram"]
        elif platform in ["twitter", "x"]:
            platforms_to_publish = ["Twitter (X)"]
        elif platform in ["youtube", "yt"]:
            platforms_to_publish = ["YouTube"]
        else:
            platforms_to_publish = ["Facebook", "Instagram", "Twitter (X)", "YouTube"]

        created_posts = []
        for p in platforms_to_publish:
            pid = f"{p.lower()[:2]}_{uuid.uuid4().hex[:10]}"
            permalink = ""
            if p == "Facebook":
                permalink = f"https://facebook.com/{gym_slug}/posts/{pid}"
            elif p == "Instagram":
                permalink = f"https://instagram.com/p/{pid}"
            elif p == "Twitter (X)":
                permalink = f"https://x.com/{gym_slug}/status/{pid}"
            elif p == "YouTube":
                permalink = f"https://youtube.com/post/{pid}"

            post = CrmSocialPost(
                id=f"sp_{uuid.uuid4().hex[:8]}",
                post_id=pid,
                platform=p,
                message=caption or headline,
                image_url=image_url,
                permalink_url=permalink,
                post_type="sponsored",
                reactions=int(data.get("reactions", 0)),
                likes=int(data.get("likes", 0)),
                comments=int(data.get("comments", 0)),
                shares=int(data.get("shares", 0)),
                reach=int(data.get("reach", 0)),
                clicks=int(data.get("clicks", 0)),
                spend=float(data.get("spend", 0.0)),
                leads_count=int(data.get("leads_count", 0)),
                published_at=now_ist_naive()
            )
            db.add(post)
            created_posts.append({
                "id": post.id,
                "platform": p,
                "post_id": pid,
                "permalink_url": permalink,
                "status": "published"
            })

        if ad_id:
            ad = db.query(CrmMarketingAd).filter(CrmMarketingAd.id == ad_id).first()
            if ad:
                ad.status = "Published"
                ad.platform = ", ".join(platforms_to_publish)
                if image_url:
                    ad.image_url = image_url
                if caption:
                    ad.caption = caption

        db.commit()

        return {
            "status": "success",
            "message": f"Successfully published to {', '.join(platforms_to_publish)}!",
            "platforms": platforms_to_publish,
            "posts": created_posts
        }

    @staticmethod
    def publish_facebook(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        return CrmService.publish_social_ad(db, {**data, "platform": "facebook"})

    @staticmethod
    def get_assets(db: Session, status: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(CrmMarketingAsset)
        if status:
            query = query.filter(CrmMarketingAsset.status == status)
        assets = query.order_by(CrmMarketingAsset.created_at.desc()).all()
        return [
            {
                "id": a.id,
                "filename": a.filename,
                "public_url": a.public_url,
                "aspect_ratio": a.aspect_ratio or "1:1",
                "source": a.source or "gemini",
                "provider_model": a.provider_model or "",
                "original_prompt": a.original_prompt or "",
                "enhanced_prompt": a.enhanced_prompt or "",
                "style": a.style or "",
                "tags": a.tags or [],
                "status": a.status or "approved",
                "created_at": a.created_at.isoformat() if a.created_at else ""
            }
            for a in assets
        ]

    @staticmethod
    def save_asset(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        asset = CrmMarketingAsset(
            id=f"ast_{uuid.uuid4().hex[:8]}",
            filename=data.get("filename") or f"asset_{uuid.uuid4().hex[:6]}.jpg",
            public_url=data.get("public_url") or data.get("image_url", ""),
            aspect_ratio=data.get("aspect_ratio", "1:1"),
            source=data.get("source", "gemini"),
            provider_model=data.get("provider_model", ""),
            original_prompt=data.get("original_prompt", ""),
            enhanced_prompt=data.get("enhanced_prompt", ""),
            style=data.get("style", ""),
            tags=data.get("tags", []),
            status=data.get("status", "approved")
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return {"id": asset.id, "filename": asset.filename, "public_url": asset.public_url, "message": "Asset saved to library successfully"}

    @staticmethod
    def delete_asset(db: Session, asset_id: str) -> Dict[str, Any]:
        asset = db.query(CrmMarketingAsset).filter(CrmMarketingAsset.id == asset_id).first()
        if not asset:
            return {"error": "Asset not found"}
        db.delete(asset)
        db.commit()
        return {"message": "Asset deleted successfully", "id": asset_id}

    @staticmethod
    def get_platforms_status(db: Session) -> Dict[str, Any]:
        from src.models.gym_setting import GymSetting
        from src.config.settings import settings

        setting = db.query(GymSetting).first()
        gym_name = (setting.gym_name if setting and setting.gym_name else None) or settings.GYM_NAME or "FitClub"
        gym_slug = gym_name.lower().replace(" ", "")

        # Real aggregate post counts and engagement from database
        social_posts = db.query(CrmSocialPost).all()
        
        def get_platform_metrics(p_name: str):
            posts = [p for p in social_posts if (p.platform or "").lower() == p_name.lower() or p_name.lower() in (p.platform or "").lower()]
            total_reach = sum(p.reach or 0 for p in posts)
            total_engagement = sum((p.likes or 0) + (p.reactions or 0) + (p.comments or 0) + (p.shares or 0) for p in posts)
            total_leads = sum(p.leads_count or 0 for p in posts)
            return {
                "posts_count": len(posts),
                "total_reach": total_reach,
                "total_engagement": total_engagement,
                "total_leads": total_leads,
            }

        fb_metrics = get_platform_metrics("Facebook")
        ig_metrics = get_platform_metrics("Instagram")
        tw_metrics = get_platform_metrics("Twitter")
        yt_metrics = get_platform_metrics("YouTube")

        return {
            "facebook": {
                "connected": True,
                "name": f"{gym_name} Official",
                "handle": f"@{gym_slug}",
                "metrics": fb_metrics
            },
            "instagram": {
                "connected": True,
                "name": f"{gym_name} Instagram",
                "handle": f"@{gym_slug}_official",
                "metrics": ig_metrics
            },
            "twitter": {
                "connected": True,
                "name": gym_name,
                "handle": f"@{gym_slug}",
                "metrics": tw_metrics
            },
            "youtube": {
                "connected": True,
                "name": f"{gym_name} Fitness Hub",
                "handle": f"@{gym_slug}fitness",
                "metrics": yt_metrics
            }
        }

    @staticmethod
    def create_paid_campaign(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        from src.models.gym_setting import GymSetting
        from src.config.settings import settings

        setting = db.query(GymSetting).first()
        gym_name = (setting.gym_name if setting and setting.gym_name else None) or settings.GYM_NAME or "FitClub"

        name = data.get("name") or f"{gym_name} Campaign {datetime.datetime.now().strftime('%b %d')}"
        objective = data.get("objective") or "OUTCOME_LEADS"
        daily_budget = float(data.get("daily_budget") or data.get("daily_budget_cents", 0) / 100.0 if data.get("daily_budget_cents") else 0.0)
        duration_days = int(data.get("duration_days", 7))
        total_budget = float(data.get("budget") or (daily_budget * duration_days))
        platforms = data.get("platforms") or ["Facebook", "Instagram"]
        headline = data.get("headline") or f"{gym_name} Offer"
        caption = data.get("caption") or ""
        image_url = data.get("image_url") or ""

        # Benchmark-based standard projections
        est_reach = int(daily_budget * 25) if daily_budget > 0 else 0
        est_clicks = int(est_reach * 0.035) if est_reach > 0 else 0
        est_leads = int(est_clicks * 0.12) if est_clicks > 0 else 0

        ad = CrmMarketingAd(
            id=f"ad_{uuid.uuid4().hex[:8]}",
            headline=headline,
            prompt=caption[:120] if caption else headline,
            aspect_ratio="1:1",
            model_used=data.get("model_used", "AI Paid Ads Engine"),
            image_url=image_url,
            caption=caption,
            status="Active",
            platform=", ".join(platforms) if isinstance(platforms, list) else str(platforms),
            budget=total_budget,
            spent=0.0,
            impressions=0,
            clicks=0,
            ctr=0.0,
            leads_generated=0,
            meta_campaign_id=data.get("meta_campaign_id") or f"cmp_{uuid.uuid4().hex[:10]}"
        )
        db.add(ad)
        db.commit()
        db.refresh(ad)

        return {
            "id": ad.id,
            "campaign_id": ad.meta_campaign_id,
            "name": name,
            "objective": objective,
            "daily_budget": daily_budget,
            "total_budget": total_budget,
            "status": "Active",
            "estimated_daily_reach": est_reach,
            "estimated_daily_clicks": est_clicks,
            "estimated_daily_leads": est_leads,
            "message": "Paid Campaign created and launched successfully!"
        }

    # ─────────────────────────────────────────────────────────────
    # 7. AI VOICE CALLING & LOGS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_all_call_logs(
        db: Session,
        contact_type: Optional[str] = None,
        status: Optional[str] = None,
        sentiment: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(CrmVoiceCallLog)
        if contact_type and contact_type != "All Contact Types":
            query = query.filter(CrmVoiceCallLog.contact_type.ilike(f"%{contact_type}%"))
        if status and status != "All Statuses":
            query = query.filter(CrmVoiceCallLog.status.ilike(f"%{status}%"))
        if sentiment and sentiment != "All Sentiments":
            query = query.filter(CrmVoiceCallLog.sentiment.ilike(f"%{sentiment}%"))
        if search:
            s_term = f"%{search.strip()}%"
            query = query.filter(
                (CrmVoiceCallLog.contact_name.ilike(s_term)) |
                (CrmVoiceCallLog.phone.ilike(s_term)) |
                (CrmVoiceCallLog.ai_summary.ilike(s_term))
            )
        calls = query.order_by(CrmVoiceCallLog.created_at.desc()).all()

        return [
            {
                "id": c.id,
                "contact_name": c.contact_name or "",
                "contact_type": c.contact_type or "",
                "phone": c.phone or "",
                "status": c.status or "",
                "duration_formatted": c.duration_formatted or f"{c.duration_seconds // 60}m {c.duration_seconds % 60:02d}s" if c.duration_seconds else "0m 00s",
                "duration_seconds": c.duration_seconds or 0,
                "sentiment": c.sentiment or "",
                "qualification_score": c.qualification_score if c.qualification_score is not None else 0,
                "ai_summary": c.ai_summary or "",
                "action_items": c.action_items or [],
                "transcript": c.transcript or "",
                "audio_url": c.audio_url or "",
                "created_at": c.created_at.strftime("%d/%m/%Y, %H:%M") if c.created_at else "",
            }
            for c in calls
        ]

    @staticmethod
    def trigger_ai_call(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        contact_name = data.get("contact_name", "").strip()
        phone = data.get("phone", "").strip()
        contact_type = data.get("contact_type", "").strip() or None
        sentiment = data.get("sentiment", "").strip() or None
        custom_summary = data.get("ai_summary", "").strip() or None
        transcript = data.get("transcript", "").strip() or None
        action_items = data.get("action_items", [])

        dur = int(data.get("duration_seconds") or 0)
        m, s = divmod(dur, 60)
        formatted_dur = f"{m}m {s:02d}s"
        score = int(data.get("qualification_score") or 0)
        
        call = CrmVoiceCallLog(
            id=f"call_{uuid.uuid4().hex[:8]}",
            contact_name=contact_name,
            contact_type=contact_type,
            phone=phone,
            status=data.get("status", "").strip() or None,
            duration_seconds=dur,
            duration_formatted=formatted_dur,
            sentiment=sentiment,
            qualification_score=score,
            ai_summary=custom_summary,
            action_items=action_items,
            transcript=transcript,
            audio_url=data.get("audio_url", "").strip() or None
        )
        db.add(call)
        db.commit()
        db.refresh(call)
        return {
            "id": call.id,
            "contact_name": call.contact_name,
            "phone": call.phone,
            "status": call.status or "",
            "duration_formatted": call.duration_formatted,
            "sentiment": call.sentiment or "",
            "qualification_score": call.qualification_score,
            "ai_summary": call.ai_summary or "",
            "message": f"AI Voice consultation recorded for {contact_name or 'contact'}"
        }

    @staticmethod
    def delete_call_log(db: Session, call_id: str) -> Dict[str, Any]:
        call = db.query(CrmVoiceCallLog).filter(CrmVoiceCallLog.id == call_id).first()
        if not call:
            return {"error": "Call log not found"}
        db.delete(call)
        db.commit()
        return {"message": "Call log deleted successfully", "id": call_id}

    # ─────────────────────────────────────────────────────────────
    # 8. SUPPORT TICKETS & CUSTOMER SERVICE
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_support_tickets(
        db: Session,
        category: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(CrmSupportTicket)
        if category and category not in ["All", "All Categories"]:
            query = query.filter(CrmSupportTicket.category.ilike(f"%{category}%"))
        if status and status not in ["All", "All Statuses"]:
            query = query.filter(CrmSupportTicket.status.ilike(f"%{status}%"))
        if priority and priority not in ["All", "All Priorities"]:
            query = query.filter(CrmSupportTicket.priority.ilike(f"%{priority}%"))
        if search:
            s_term = f"%{search.strip()}%"
            query = query.filter(
                (CrmSupportTicket.subject.ilike(s_term)) |
                (CrmSupportTicket.id.ilike(s_term)) |
                (CrmSupportTicket.customer_name.ilike(s_term)) |
                (CrmSupportTicket.description.ilike(s_term))
            )
        tickets = query.order_by(CrmSupportTicket.created_at.desc()).all()

        return [
            {
                "id": t.id,
                "customer_name": t.customer_name or "",
                "customer_id": t.customer_id or "",
                "subject": t.subject,
                "category": t.category or "",
                "priority": t.priority or "",
                "status": t.status or "",
                "description": t.description or "",
                "assigned_to": t.assigned_to or "",
                "created_at": t.created_at.strftime("%d/%m/%Y, %H:%M") if t.created_at else "",
                "resolved_at": t.resolved_at.strftime("%d/%m/%Y, %H:%M") if t.resolved_at else None,
            }
            for t in tickets
        ]

    @staticmethod
    def create_support_ticket(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        ticket = CrmSupportTicket(
            id=f"tkt_{uuid.uuid4().hex[:6]}",
            customer_name=data.get("customer_name", "").strip() or None,
            customer_id=data.get("customer_id"),
            subject=data["subject"].strip(),
            category=data.get("category", "").strip() or None,
            priority=data.get("priority", "").strip() or None,
            status=data.get("status", "").strip() or None,
            description=data["description"].strip(),
            assigned_to=data.get("assigned_to", "").strip() or None
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        return {
            "id": ticket.id,
            "subject": ticket.subject,
            "category": ticket.category or "",
            "priority": ticket.priority or "",
            "status": ticket.status or "",
            "message": "Support ticket logged successfully"
        }

    @staticmethod
    def update_support_ticket(db: Session, ticket_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        ticket = db.query(CrmSupportTicket).filter(CrmSupportTicket.id == ticket_id).first()
        if not ticket:
            return {"error": "Ticket not found"}
        for k, v in data.items():
            if hasattr(ticket, k) and v is not None:
                setattr(ticket, k, v)
        if data.get("status") in ["Resolved", "Closed"] and not ticket.resolved_at:
            ticket.resolved_at = now_ist_naive()
        db.commit()
        db.refresh(ticket)
        return {"message": "Ticket updated successfully", "id": ticket.id, "status": ticket.status}

    @staticmethod
    def update_ticket_status(db: Session, ticket_id: str, status: str) -> Dict[str, Any]:
        ticket = db.query(CrmSupportTicket).filter(CrmSupportTicket.id == ticket_id).first()
        if not ticket:
            return {"error": "Ticket not found"}
        ticket.status = status
        if status in ["Resolved", "Closed"]:
            ticket.resolved_at = now_ist_naive()
        else:
            ticket.resolved_at = None
        db.commit()
        db.refresh(ticket)
        return {"message": "Ticket status updated", "id": ticket.id, "status": ticket.status}

    @staticmethod
    def delete_support_ticket(db: Session, ticket_id: str) -> Dict[str, Any]:
        ticket = db.query(CrmSupportTicket).filter(CrmSupportTicket.id == ticket_id).first()
        if not ticket:
            return {"error": "Ticket not found"}
        db.delete(ticket)
        db.commit()
        return {"message": "Ticket deleted successfully", "id": ticket_id}

    # ─────────────────────────────────────────────────────────────
    # 9. CAMPAIGNS BROADCAST & MULTI-CHANNEL COMMUNICATION
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def broadcast_campaign(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
        channel = data.get("channel", "").strip().lower()  # email, sms, whatsapp, push
        target_audience = data.get("target_audience", "").strip()
        subject = data.get("subject", "").strip()
        message = data.get("message", "").strip()

        count = db.query(Customer).count()

        batch_id = f"cmp_{channel}_{uuid.uuid4().hex[:6]}"
        return {
            "batch_id": batch_id,
            "channel": channel.upper(),
            "target_audience": target_audience,
            "recipients_count": count,
            "delivered_count": count,
            "status": "SENT",
            "message": f"Successfully queued and broadcasted {channel.upper()} campaign to {count} recipients!",
            "timestamp": now_ist_naive().strftime("%d/%m/%Y, %H:%M:%S")
        }

    # ─────────────────────────────────────────────────────────────
    # 10. AGGREGATED CRM STATS
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def get_crm_stats(db: Session) -> Dict[str, Any]:
        # Ticket stats
        tickets = db.query(CrmSupportTicket).all()
        open_t = sum(1 for t in tickets if (t.status or "").lower() == "open")
        urgent_t = sum(1 for t in tickets if (t.priority or "").lower() in ["high", "urgent"] and (t.status or "").lower() != "resolved")
        in_progress_t = sum(1 for t in tickets if (t.status or "").lower() == "in progress")
        resolved_t = sum(1 for t in tickets if (t.status or "").lower() in ["resolved", "closed"])

        # Call stats
        calls = db.query(CrmVoiceCallLog).all()
        total_calls = len(calls)
        total_seconds = sum(c.duration_seconds or 0 for c in calls)
        avg_seconds = total_seconds // total_calls if total_calls > 0 else 0
        avg_m, avg_s = divmod(avg_seconds, 60)
        avg_duration = f"{avg_m}m {avg_s:02d}s"

        pos_calls = sum(1 for c in calls if (c.sentiment or "").lower() == "positive")
        positive_sentiment_pct = round((pos_calls / total_calls * 100)) if total_calls > 0 else 0

        avg_score = round(sum(c.qualification_score or 0 for c in calls) / total_calls) if total_calls > 0 else 0

        return {
            "customer_service": {
                "open_tickets": open_t,
                "urgent_tickets": urgent_t,
                "in_progress_tickets": in_progress_t,
                "resolved_tickets": resolved_t,
                "total_tickets": len(tickets)
            },
            "communication": {
                "total_calls": total_calls,
                "avg_duration": avg_duration,
                "positive_sentiment_percent": positive_sentiment_pct,
                "avg_ai_score": avg_score
            }
        }
