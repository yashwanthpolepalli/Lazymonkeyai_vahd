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
    payload: Dict[str, Any] = Body(default_factory=dict),
    db: Session = Depends(get_db)
):
    student_id = payload.get("student_id") if isinstance(payload, dict) else None
    vahd_name = payload.get("vahd_name") if isinstance(payload, dict) else None
    suggestions = ReviewService.generate_ai_reviews(db, student_id=student_id, vahd_name=vahd_name)
    return {
        "suggestions": suggestions,
        "student_id": student_id
    }

@router.post("/submit")
def submit_student_review(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    if not payload.get("review_text"):
        raise HTTPException(status_code=400, detail="Review text is required")
    review = ReviewService.submit_review(db, payload)
    return {
        "id": review.id,
        "student_name": review.student_name,
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
                "student_id": r.student_id,
                "student_name": r.student_name,
                "student_phone": r.student_phone,
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
