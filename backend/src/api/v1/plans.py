from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.schemas.plan import PlanCreateRequest, PlanUpdateRequest
from src.services.plan_service import PlanService

router = APIRouter(prefix="/plans", tags=["Membership Plans"])

@router.get("")
def get_plans(db: Session = Depends(get_db)):
    return PlanService.get_all_plans(db)

@router.post("")
def create_plan(req: PlanCreateRequest, db: Session = Depends(get_db)):
    return PlanService.create_plan(
        db,
        name=req.name,
        price=req.price,
        duration_days=req.duration_days,
        description=req.description,
        badge=req.badge
    )

@router.put("/{plan_id}")
def update_plan(plan_id: str, req: PlanUpdateRequest, db: Session = Depends(get_db)):
    updated = PlanService.update_plan(
        db,
        plan_id=plan_id,
        name=req.name,
        price=req.price,
        duration_days=req.duration_days,
        description=req.description,
        badge=req.badge
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return updated

@router.delete("/{plan_id}")
def delete_plan(plan_id: str, db: Session = Depends(get_db)):
    success = PlanService.delete_plan(db, plan_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return {"message": "Plan deactivated successfully"}
