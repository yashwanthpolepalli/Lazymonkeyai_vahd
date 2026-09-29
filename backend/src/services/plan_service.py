import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from src.models.plan import MembershipPlan

class PlanService:

    @staticmethod
    def get_all_plans(db: Session) -> List[dict]:
        """
        Fetches all active membership plans directly from PostgreSQL database.
        Returns 100% live dynamic data created/edited by the Gym Owner.
        """
        plans = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).all()

        return [
            {
                "id": p.id,
                "name": p.name,
                "price": p.price,
                "duration_days": p.duration_days,
                "description": p.description or "",
                "badge": p.badge or "",
                "is_active": p.is_active
            }
            for p in plans
        ]

    @staticmethod
    def create_plan(db: Session, name: str, price: float, duration_days: int, description: str = None, badge: str = None) -> dict:
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        new_plan = MembershipPlan(
            id=plan_id,
            name=name.strip(),
            price=float(price),
            duration_days=int(duration_days),
            description=description.strip() if description else "",
            badge=badge.strip() if badge else None,
            is_active=True
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        return {
            "id": new_plan.id,
            "name": new_plan.name,
            "price": new_plan.price,
            "duration_days": new_plan.duration_days,
            "description": new_plan.description,
            "badge": new_plan.badge,
            "is_active": new_plan.is_active
        }

    @staticmethod
    def update_plan(db: Session, plan_id: str, name: str = None, price: float = None, duration_days: int = None, description: str = None, badge: str = None) -> Optional[dict]:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if not plan:
            return None

        if name is not None:
            plan.name = name.strip()
        if price is not None:
            plan.price = float(price)
        if duration_days is not None:
            plan.duration_days = int(duration_days)
        if description is not None:
            plan.description = description.strip()
        if badge is not None:
            plan.badge = badge.strip() if badge else None

        db.commit()
        db.refresh(plan)
        return {
            "id": plan.id,
            "name": plan.name,
            "price": plan.price,
            "duration_days": plan.duration_days,
            "description": plan.description,
            "badge": plan.badge,
            "is_active": plan.is_active
        }

    @staticmethod
    def delete_plan(db: Session, plan_id: str) -> bool:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if not plan:
            return False
        plan.is_active = False
        db.commit()
        return True
