from src.utils.timezone import now_ist_naive
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from src.models.course import Course, StudentCourse
from src.models.plan import MembershipPlan
from src.models.membership import Membership
from src.services.membership_service import MembershipService

class CourseService:

    @staticmethod
    def get_all_courses(db: Session, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns dynamic active courses/degree programs without hardcoding.
        """
        # Ensure table exists
        try:
            query = db.query(Course).filter(Course.is_active == True)
            if owner_id:
                query = query.filter(or_(Course.owner_id == owner_id, Course.owner_id.is_(None)))
            if branch_id:
                query = query.filter(or_(Course.branch_id == branch_id, Course.branch_id.is_(None)))
            courses = query.order_by(Course.price.asc()).all()
            
            if courses:
                result = []
                for c in courses:
                    days = c.duration_days or 365
                    period = "1 Year" if days >= 365 else ("6 Months" if days == 180 else ("3 Months" if days == 90 else ("1 Month" if days == 30 else f"{days} Days")))
                    features = [f.strip() for f in (c.description or "").split(",") if f.strip()]
                    result.append({
                        "id": c.id,
                        "owner_id": c.owner_id,
                        "branch_id": c.branch_id,
                        "name": c.name,
                        "category": c.category or "degree",
                        "department": c.department or "Academics",
                        "degree_type": c.degree_type or "Bachelor",
                        "price": float(c.price or 0.0),
                        "duration_days": days,
                        "period": period,
                        "description": c.description or "",
                        "features": features,
                        "color": c.color or "from-blue-600 to-indigo-700",
                        "badge": c.badge or "Degree Course",
                        "is_combo": bool(c.is_combo),
                        "isCombo": bool(c.is_combo),
                        "is_active": c.is_active,
                        "created_at": c.created_at.isoformat() if c.created_at else None,
                    })
                return result
        except Exception:
            db.rollback()

        # Fallback to MembershipService plans for seamless dual-read
        return MembershipService.get_all_plans(db, owner_id=owner_id, branch_id=branch_id)

    @staticmethod
    def create_course(db: Session, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Persists a course/program in the database.
        """
        # Also create via MembershipService for cross-compatibility
        res = MembershipService.create_plan(db, payload, owner_id=owner_id, branch_id=branch_id)

        try:
            course_id = res.get("id") or f"crs_{uuid.uuid4().hex[:10]}"
            new_course = Course(
                id=course_id,
                owner_id=owner_id or payload.get("owner_id"),
                branch_id=branch_id or payload.get("branch_id"),
                name=payload.get("name", "New Course").strip(),
                category=payload.get("category", "degree"),
                department=payload.get("department", "Academics"),
                degree_type=payload.get("degree_type", "Degree"),
                price=float(payload.get("price") or 0.0),
                duration_days=int(payload.get("duration_days") or 365),
                description=payload.get("description") or (", ".join(payload.get("features", [])) if isinstance(payload.get("features"), list) else ""),
                color=payload.get("color", "from-blue-600 to-indigo-700"),
                badge=payload.get("badge", "Degree"),
                is_combo=bool(payload.get("is_combo") or payload.get("isCombo")),
                is_active=True,
            )
            db.add(new_course)
            db.commit()
        except Exception:
            db.rollback()

        return res

    @staticmethod
    def update_course(db: Session, course_id: str, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        res = MembershipService.update_plan(db, course_id, payload, owner_id=owner_id, branch_id=branch_id)
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course:
                if "name" in payload: course.name = payload["name"]
                if "price" in payload: course.price = float(payload["price"])
                if "duration_days" in payload: course.duration_days = int(payload["duration_days"])
                if "category" in payload: course.category = payload["category"]
                if "color" in payload: course.color = payload["color"]
                if "badge" in payload: course.badge = payload["badge"]
                if "description" in payload: course.description = payload["description"]
                db.commit()
        except Exception:
            db.rollback()
        return res

    @staticmethod
    def delete_course(db: Session, course_id: str) -> Dict[str, Any]:
        res = MembershipService.delete_plan(db, course_id)
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course:
                course.is_active = False
                db.commit()
        except Exception:
            db.rollback()
        return res
