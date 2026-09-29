from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.crm_service import CrmService

router = APIRouter(prefix="/crm", tags=["CRM & Growth Suite"])

# ── 1. LEADS ──
@router.get("/leads")
def get_leads(db: Session = Depends(get_db)):
    return CrmService.get_all_leads(db)

@router.post("/leads")
def create_lead(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("name") or not payload.get("phone"):
        raise HTTPException(status_code=400, detail="Name and phone are required")
    return CrmService.create_lead(db, payload)

@router.patch("/leads/{lead_id}")
def update_lead(lead_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_lead(db, lead_id, payload)

@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_lead(db, lead_id)

# ── 2. OPPORTUNITIES & DEALS ──
@router.get("/opportunities")
def get_opportunities(stage: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return CrmService.get_all_opportunities(db, stage=stage)

@router.post("/opportunities")
def create_opportunity(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Opportunity name is required")
    return CrmService.create_opportunity(db, payload)

@router.patch("/opportunities/{opp_id}")
@router.put("/opportunities/{opp_id}")
def update_opportunity(opp_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_opportunity(db, opp_id, payload)

@router.delete("/opportunities/{opp_id}")
def delete_opportunity(opp_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_opportunity(db, opp_id)

# ── 3. QUOTATIONS ──
@router.get("/quotations")
def get_quotations(db: Session = Depends(get_db)):
    return CrmService.get_all_quotations(db)

@router.post("/quotations")
def create_quotation(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("customer_name"):
        raise HTTPException(status_code=400, detail="Customer name is required")
    return CrmService.create_quotation(db, payload)

@router.patch("/quotations/{quote_id}")
@router.put("/quotations/{quote_id}")
def update_quotation(quote_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_quotation(db, quote_id, payload)

@router.delete("/quotations/{quote_id}")
def delete_quotation(quote_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_quotation(db, quote_id)

# ── 4. SALES ORDERS ──
@router.get("/sales-orders")
def get_sales_orders(db: Session = Depends(get_db)):
    return CrmService.get_all_sales_orders(db)

@router.post("/sales-orders")
def create_sales_order(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("customer_name"):
        raise HTTPException(status_code=400, detail="Customer name is required")
    return CrmService.create_sales_order(db, payload)

@router.patch("/sales-orders/{order_id}")
@router.put("/sales-orders/{order_id}")
def update_sales_order(order_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_sales_order(db, order_id, payload)

@router.delete("/sales-orders/{order_id}")
def delete_sales_order(order_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_sales_order(db, order_id)

# ── 5. DISCOUNTS & COUPONS ──
@router.get("/discounts")
def get_discounts(db: Session = Depends(get_db)):
    return CrmService.get_all_discounts(db)

@router.post("/discounts")
def create_discount(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("name") or not payload.get("code"):
        raise HTTPException(status_code=400, detail="Discount name and code are required")
    res = CrmService.create_discount(db, payload)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@router.patch("/discounts/{disc_id}")
@router.put("/discounts/{disc_id}")
def update_discount(disc_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_discount(db, disc_id, payload)

@router.delete("/discounts/{disc_id}")
def delete_discount(disc_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_discount(db, disc_id)

@router.post("/discounts/validate")
def validate_discount(payload: dict = Body(...), db: Session = Depends(get_db)):
    code = payload.get("code", "")
    order_amount = float(payload.get("order_amount", 0.0))
    return CrmService.validate_discount(db, code=code, order_amount=order_amount)

# ── 6. SOCIAL MEDIA & MARKETING ADS ──
@router.get("/social-posts")
def get_social_posts(db: Session = Depends(get_db)):
    return CrmService.get_social_posts(db)

@router.post("/social-posts")
def create_social_post(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.create_social_post(db, payload)

@router.post("/social-posts/sync")
def sync_social_posts(db: Session = Depends(get_db)):
    return CrmService.sync_social_posts(db)

@router.delete("/social-posts/{post_id}")
def delete_social_post(post_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_social_post(db, post_id)

@router.get("/ads")
def get_marketing_ads(db: Session = Depends(get_db)):
    return CrmService.get_marketing_ads(db)

@router.post("/ads")
def create_marketing_ad(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.create_marketing_ad(db, payload)

@router.post("/ads/generate")
def generate_marketing_ad(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.generate_marketing_ad(db, payload)

@router.post("/campaigns/optimize-prompt")
def optimize_campaign_prompt(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.optimize_campaign_prompt(db, payload)

@router.post("/campaigns/generate-poster")
def generate_campaign_poster(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.generate_campaign_poster(db, payload)

@router.post("/campaigns/generate-copy")
def generate_campaign_copy(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.generate_campaign_copy(db, payload)

@router.post("/campaigns/publish")
def publish_social_ad(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.publish_social_ad(db, payload)

@router.post("/campaigns/publish-facebook")
def publish_facebook(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.publish_facebook(db, payload)

@router.get("/campaigns/platforms-status")
def get_platforms_status(db: Session = Depends(get_db)):
    return CrmService.get_platforms_status(db)

@router.post("/campaigns/paid")
def create_paid_campaign(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.create_paid_campaign(db, payload)

# ── ASSET LIBRARY ──
@router.get("/assets")
def get_assets(status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return CrmService.get_assets(db, status=status)

@router.post("/assets")
def save_asset(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.save_asset(db, payload)

@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_asset(db, asset_id)

# ── 7. AI VOICE CALLING & LOGS ──
@router.get("/calls")
def get_call_logs(
    contact_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return CrmService.get_all_call_logs(
        db,
        contact_type=contact_type,
        status=status,
        sentiment=sentiment,
        search=search
    )

@router.post("/calls/trigger")
@router.post("/calls/log")
def trigger_ai_call(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.trigger_ai_call(db, payload)

@router.delete("/calls/{call_id}")
def delete_call_log(call_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_call_log(db, call_id)

# ── 8. CUSTOMER SERVICE & SUPPORT TICKETS ──
@router.get("/tickets")
def get_support_tickets(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return CrmService.get_support_tickets(
        db,
        category=category,
        status=status,
        priority=priority,
        search=search
    )

@router.post("/tickets")
def create_support_ticket(payload: dict = Body(...), db: Session = Depends(get_db)):
    if not payload.get("subject") or not payload.get("description"):
        raise HTTPException(status_code=400, detail="Subject and description are required")
    return CrmService.create_support_ticket(db, payload)

@router.patch("/tickets/{ticket_id}")
@router.put("/tickets/{ticket_id}")
def update_support_ticket(ticket_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.update_support_ticket(db, ticket_id, payload)

@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    status = payload.get("status", "Resolved")
    return CrmService.update_ticket_status(db, ticket_id, status)

@router.delete("/tickets/{ticket_id}")
def delete_support_ticket(ticket_id: str, db: Session = Depends(get_db)):
    return CrmService.delete_support_ticket(db, ticket_id)

# ── 9. CAMPAIGNS BROADCAST ──
@router.post("/campaigns/broadcast")
def broadcast_campaign(payload: dict = Body(...), db: Session = Depends(get_db)):
    return CrmService.broadcast_campaign(db, payload)

# ── 10. AGGREGATED CRM STATS ──
@router.get("/stats")
def get_crm_stats(db: Session = Depends(get_db)):
    return CrmService.get_crm_stats(db)

