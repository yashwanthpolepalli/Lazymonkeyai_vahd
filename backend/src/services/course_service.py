from src.utils.timezone import now_ist_naive
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from src.models.course import Course, StudentCourse, CourseLanguage, CourseClassification
from src.models.plan import MembershipPlan
from src.models.membership import Membership
from src.models.settings import Setting
from src.services.membership_service import MembershipService


class CourseService:

    @staticmethod
    def format_duration(days: int, raw_period: Optional[str] = None) -> str:
        if raw_period and raw_period.strip():
            return raw_period.strip()
        if days == 1095 or days == 1096:
            return "3 Years"
        if days == 1460 or days == 1461:
            return "4 Years"
        if days == 730:
            return "2 Years"
        if days == 365:
            return "1 Year"
        if days == 180:
            return "6 Months"
        if days == 90:
            return "3 Months"
        if days == 30:
            return "1 Month"
        if days >= 365 and days % 365 == 0:
            y = days // 365
            return f"{y} Years" if y > 1 else "1 Year"
        if days >= 30 and days % 30 == 0:
            m = days // 30
            if m % 12 == 0:
                y = m // 12
                return f"{y} Years" if y > 1 else "1 Year"
            return f"{m} Months" if m > 1 else "1 Month"
        return f"{days} Days"

    @staticmethod
    def get_all_courses(db: Session, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns dynamic active courses/degree programs stored in the database.
        """
        try:
            from src.database.session import engine
            Course.__table__.create(bind=engine, checkfirst=True)

            query = db.query(Course).filter(Course.is_active == True)
            if owner_id:
                query = query.filter(or_(Course.owner_id == owner_id, Course.owner_id.is_(None)))
            if branch_id:
                query = query.filter(or_(Course.branch_id == branch_id, Course.branch_id.is_(None)))
            courses = query.order_by(Course.created_at.asc()).all()

            if courses:
                result = []
                for c in courses:
                    days = c.duration_days or 365
                    period = getattr(c, "period", None) or CourseService.format_duration(days)
                    features = [f.strip() for f in (c.description or "").split(",") if f.strip()]
                    result.append({
                        "id": c.id,
                        "owner_id": c.owner_id,
                        "branch_id": c.branch_id,
                        "name": c.name,
                        "category": c.category or "General",
                        "department": c.department or "Academics",
                        "degree_type": c.degree_type or "Degree",
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

        # Dynamic database plans from MembershipService
        plans = MembershipService.get_all_plans(db, owner_id=owner_id, branch_id=branch_id)
        for p in plans:
            days = p.get("duration_days") or 365
            p["period"] = CourseService.format_duration(days)
        return plans

    @staticmethod
    def create_course(db: Session, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Persists a course/program in the database with custom duration (Years/Months).
        """
        duration_val = payload.get("duration_value")
        duration_unit = payload.get("duration_unit", "Years").lower()
        duration_days = int(payload.get("duration_days") or 365)

        if duration_val:
            try:
                num = int(duration_val)
                if "year" in duration_unit:
                    duration_days = num * 365
                elif "month" in duration_unit:
                    duration_days = num * 30
                elif "day" in duration_unit:
                    duration_days = num
            except Exception:
                pass

        period = payload.get("period") or CourseService.format_duration(duration_days)
        payload["duration_days"] = duration_days
        payload["period"] = period

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
                duration_days=duration_days,
                description=payload.get("description") or (", ".join(payload.get("features", [])) if isinstance(payload.get("features"), list) else ""),
                color=payload.get("color", "from-blue-600 to-indigo-700"),
                badge=payload.get("badge", "Degree"),
                is_combo=bool(payload.get("is_combo") or payload.get("isCombo")),
                is_active=True,
            )
            db.add(new_course)
            db.commit()
            res["period"] = period
            res["duration_days"] = duration_days
        except Exception:
            db.rollback()

        return res

    @staticmethod
    def update_course(db: Session, course_id: str, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        duration_days = payload.get("duration_days")
        if duration_days:
            payload["period"] = CourseService.format_duration(int(duration_days))

        res = MembershipService.update_plan(db, course_id, payload, owner_id=owner_id, branch_id=branch_id)
        try:
            course = db.query(Course).filter(Course.id == course_id).first()
            if course:
                if "name" in payload: course.name = payload["name"]
                if "price" in payload: course.price = float(payload["price"])
                if "duration_days" in payload: course.duration_days = int(payload["duration_days"])
                if "category" in payload: course.category = payload["category"]
                if "department" in payload: course.department = payload["department"]
                if "degree_type" in payload: course.degree_type = payload["degree_type"]
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

    # ============================================================
    # LANGUAGES & MEDIUMS OF INSTRUCTION (PURE DATABASE DRIVEN)
    # ============================================================

    @staticmethod
    def get_languages(db: Session) -> List[str]:
        """
        Returns active languages/mediums of instruction from database.
        """
        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            langs = db.query(CourseLanguage).filter(CourseLanguage.is_active == True).order_by(CourseLanguage.created_at.asc()).all()
            return [l.name for l in langs]
        except Exception:
            db.rollback()
            return []

    @staticmethod
    def add_language(db: Session, lang_name: str) -> List[str]:
        """
        Adds a new language / medium of instruction directly in database.
        """
        name = lang_name.strip()
        if not name:
            return CourseService.get_languages(db)
        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseLanguage).filter(CourseLanguage.name.ilike(name)).first()
            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    db.commit()
            else:
                row = CourseLanguage(id=f"lang_{uuid.uuid4().hex[:8]}", name=name, is_active=True)
                db.add(row)
                db.commit()
            return CourseService.get_languages(db)
        except Exception:
            db.rollback()
            return CourseService.get_languages(db)

    @staticmethod
    def delete_language(db: Session, lang_name: str) -> List[str]:
        """
        Removes a language / medium of instruction from database.
        """
        name = lang_name.strip()
        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseLanguage).filter(CourseLanguage.name.ilike(name)).first()
            if existing:
                db.delete(existing)
                db.commit()
            return CourseService.get_languages(db)
        except Exception:
            db.rollback()
            return CourseService.get_languages(db)

    # ============================================================
    # COURSE CLASSIFICATIONS / TYPES (DATABASE DRIVEN & EDITABLE)
    # ============================================================

    @staticmethod
    def get_classifications(db: Session) -> List[Dict[str, str]]:
        """
        Returns active course classifications / types dynamically configured in DB.
        Zero hardcoded defaults or static seeds.
        """
        try:
            from src.database.session import engine
            CourseClassification.__table__.create(bind=engine, checkfirst=True)

            items = db.query(CourseClassification).filter(CourseClassification.is_active == True).order_by(CourseClassification.created_at.asc()).all()
            return [{"id": c.id, "value": c.value, "label": c.label} for c in items]
        except Exception:
            db.rollback()
            return []

    @staticmethod
    def add_classification(db: Session, value: str, label: Optional[str] = None) -> List[Dict[str, str]]:
        val = value.strip()
        lbl = (label or val).strip()
        if not val:
            return CourseService.get_classifications(db)

        try:
            from src.database.session import engine
            CourseClassification.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseClassification).filter(CourseClassification.value.ilike(val)).first()
            if existing:
                existing.label = lbl
                existing.is_active = True
                db.commit()
            else:
                row = CourseClassification(
                    id=f"cls_{uuid.uuid4().hex[:8]}",
                    value=val,
                    label=lbl,
                    is_active=True
                )
                db.add(row)
                db.commit()
            return CourseService.get_classifications(db)
        except Exception:
            db.rollback()
            return CourseService.get_classifications(db)

    @staticmethod
    def update_classification(db: Session, class_id_or_val: str, new_value: str, new_label: str) -> List[Dict[str, str]]:
        val = new_value.strip()
        lbl = (new_label or val).strip()
        try:
            from src.database.session import engine
            CourseClassification.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseClassification).filter(
                or_(CourseClassification.id == class_id_or_val, CourseClassification.value.ilike(class_id_or_val))
            ).first()
            if existing:
                existing.value = val
                existing.label = lbl
                db.commit()
            return CourseService.get_classifications(db)
        except Exception:
            db.rollback()
            return CourseService.get_classifications(db)

    @staticmethod
    def delete_classification(db: Session, class_id_or_val: str) -> List[Dict[str, str]]:
        try:
            from src.database.session import engine
            CourseClassification.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseClassification).filter(
                or_(CourseClassification.id == class_id_or_val, CourseClassification.value.ilike(class_id_or_val))
            ).first()
            if existing:
                db.delete(existing)
                db.commit()
            return CourseService.get_classifications(db)
        except Exception:
            db.rollback()
            return CourseService.get_classifications(db)


