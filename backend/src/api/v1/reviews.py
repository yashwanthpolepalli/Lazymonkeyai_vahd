from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.review_service import ReviewService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/reviews", tags=["Google Reviews & Feedback"])

@router.get("/settings")
def get_review_settings(
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return ReviewService.get_review_settings(db, company_id)

@router.post("/ai-generate")
def generate_ai_reviews(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    customer_id = payload.get("customer_id")
    gym_name = payload.get("gym_name")
    suggestions = ReviewService.generate_ai_reviews(db, customer_id=customer_id, gym_name=gym_name)
    return {
        "suggestions": suggestions,
        "customer_id": customer_id
    }

@router.post("/submit")
def submit_customer_review(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    if not payload.get("review_text"):
        raise HTTPException(status_code=400, detail="Review text is required")
    review = ReviewService.submit_review(db, payload)
    return {
        "id": review.id,
        "customer_name": review.customer_name,
        "rating": review.rating,
        "review_text": review.review_text,
        "posted_to_google": review.posted_to_google,
        "message": "Thank you! Your review has been saved."
    }

@router.get("")
def get_reviews(
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    reviews = ReviewService.get_reviews(db, company_id)
    return {
        "items": [
            {
                "id": r.id,
                "company_id": r.company_id,
                "customer_id": r.customer_id,
                "customer_name": r.customer_name,
                "customer_phone": r.customer_phone,
                "rating": r.rating,
                "review_text": r.review_text,
                "sentiment": r.sentiment,
                "ai_generated": r.ai_generated,
                "posted_to_google": r.posted_to_google,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in reviews
        ],
        "total": len(reviews)
    }
