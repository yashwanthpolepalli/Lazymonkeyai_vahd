from src.utils.timezone import now_ist_naive
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, func
from src.models.course import Course, CourseLanguage, CourseClassification, CourseDurationTier
from src.models.plan import MembershipPlan
from src.models.membership import Membership
from src.models.settings import Setting
from src.services.membership_service import MembershipService


class CourseService:

    @staticmethod
    def format_duration(days: int, raw_period: Optional[str] = None) -> str:
        clean_period = (raw_period or "").strip()
        if clean_period and clean_period.lower() not in ("year", "month", "day", "days"):
            return clean_period
        if not days or days <= 0:
            return ""
        if days >= 365:
            years = round(days / 365)
            return f"{years} Year" if years == 1 else f"{years} Years"
        if days >= 30:
            months = round(days / 30)
            return f"{months} Month" if months == 1 else f"{months} Months"
        return f"{days} Day" if days == 1 else f"{days} Days"

    @staticmethod
    def get_all_courses(db: Session, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns dynamic active courses/degree programs stored in the database.
        Syncs between membership_plans and courses tables so data is strictly persisted in DB.
        """
        from src.database.session import engine
        Course.__table__.create(bind=engine, checkfirst=True)
        MembershipPlan.__table__.create(bind=engine, checkfirst=True)

        try:
            plans = db.query(MembershipPlan).filter(MembershipPlan.is_active == True).all()
            existing_courses = {c.id: c for c in db.query(Course).all()}
            for p in plans:
                if p.id not in existing_courses:
                    days = p.duration_days or 0
                    code_val = (p.category or p.badge or "").strip()
                    new_c = Course(
                        id=p.id,
                        tenant_id=p.tenant_id or p.branch_id,
                        owner_id=p.owner_id,
                        branch_id=p.branch_id,
                        name=p.name,
                        category=code_val,
                        price=float(p.price or 0.0),
                        duration_days=days,
                        description=p.description or "",
                        badge=code_val,
                        is_active=p.is_active if p.is_active is not None else True,
                    )
                    db.add(new_c)
            db.commit()
        except Exception:
            db.rollback()

        query = db.query(Course).filter(Course.is_active != False)
        if owner_id:
            query = query.filter(or_(Course.owner_id == owner_id, Course.owner_id.is_(None)))
        if branch_id:
            query = query.filter(or_(
                Course.branch_id == branch_id,
                Course.tenant_id == branch_id,
                Course.branch_id.is_(None),
                Course.tenant_id.is_(None),
            ))
        courses = query.order_by(Course.created_at.asc()).all()

        result = []
        for c in courses:
            days = c.duration_days or 0
            period = CourseService.format_duration(days)
            features = [f.strip() for f in (c.description or "").split(",") if f.strip()]
            code_val = (c.category or c.badge or "").strip()
            result.append({
                "id": c.id,
                "owner_id": c.owner_id,
                "branch_id": c.branch_id,
                "name": c.name,
                "code": code_val,
                "category": code_val,
                "department": c.department or "",
                "degree_type": c.degree_type or "",
                "price": float(c.price or 0.0),
                "duration_days": days,
                "period": period,
                "description": c.description or "",
                "features": features,
                "color": c.color or "",
                "badge": c.badge or code_val,
                "is_combo": bool(c.is_combo),
                "isCombo": bool(c.is_combo),
                "is_active": c.is_active,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })
        return result

    @staticmethod
    def create_course(db: Session, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Persists a course/program dynamically in both courses and membership_plans database tables.
        """
        import re
        from src.database.session import engine
        Course.__table__.create(bind=engine, checkfirst=True)
        MembershipPlan.__table__.create(bind=engine, checkfirst=True)

        name = str(payload.get("name") or "").strip()
        if not name:
            raise ValueError("Course / Program name is required")

        duration_val = payload.get("duration_value")
        duration_unit = str(payload.get("duration_unit") or "Years").lower()
        duration_days = 0

        if duration_val:
            try:
                num = int(duration_val)
                if "year" in duration_unit:
                    duration_days = num * 365
                elif "month" in duration_unit:
                    duration_days = num * 30
                elif "sem" in duration_unit:
                    duration_days = num * 180
                elif "day" in duration_unit:
                    duration_days = num
            except Exception:
                pass

        if not duration_days and payload.get("duration_days"):
            try:
                duration_days = int(payload.get("duration_days"))
            except Exception:
                duration_days = 0

        raw_period = str(payload.get("period") or payload.get("duration") or "").strip()
        if not duration_days and raw_period:
            match = re.search(r"(\d+)", raw_period)
            num = int(match.group(1)) if match else 1
            low = raw_period.lower()
            if "year" in low:
                duration_days = num * 365
            elif "month" in low:
                duration_days = num * 30
            elif "sem" in low:
                duration_days = num * 180
            else:
                duration_days = num

        period = CourseService.format_duration(duration_days, raw_period=raw_period)
        code = str(payload.get("code") or payload.get("category") or payload.get("badge") or "").strip().upper()
        price = float(payload.get("price") or 0.0)
        description = str(payload.get("description") or "").strip()
        dept = str(payload.get("department") or "").strip() or None
        deg_type = str(payload.get("degree_type") or "").strip() or None
        is_active = payload.get("is_active", True)
        cid = f"crs_{uuid.uuid4().hex[:10]}"

        resolved_owner = owner_id or payload.get("owner_id")
        resolved_branch = branch_id or payload.get("branch_id") or payload.get("tenant_id")
        if not resolved_branch:
            try:
                from src.database.tenant_session import get_tenant_scope
                scope = get_tenant_scope()
                if scope and len(scope) == 1 and scope[0]:
                    resolved_branch = scope[0]
            except Exception:
                pass

        # 1. Check if course already exists under this tenant
        existing_course = None
        if resolved_branch:
            existing_course = db.query(Course).filter(
                func.lower(Course.name) == name.lower(),
                or_(Course.tenant_id == resolved_branch, Course.branch_id == resolved_branch, Course.tenant_id.is_(None))
            ).first()
        else:
            existing_course = db.query(Course).filter(func.lower(Course.name) == name.lower()).first()

        if existing_course:
            cid = existing_course.id
            existing_course.price = price
            existing_course.duration_days = duration_days
            existing_course.category = code
            existing_course.badge = code
            existing_course.description = description
            existing_course.is_active = is_active
            if dept:
                existing_course.department = dept
            if deg_type:
                existing_course.degree_type = deg_type
            if resolved_branch and not existing_course.tenant_id:
                existing_course.tenant_id = resolved_branch
                existing_course.branch_id = resolved_branch
            if resolved_owner and not existing_course.owner_id:
                existing_course.owner_id = resolved_owner

            existing_plan = db.query(MembershipPlan).filter(MembershipPlan.id == cid).first()
            if not existing_plan:
                existing_plan = db.query(MembershipPlan).filter(func.lower(MembershipPlan.name) == name.lower()).first()
            if existing_plan:
                existing_plan.price = price
                existing_plan.duration_days = duration_days
                existing_plan.category = code
                existing_plan.badge = code
                existing_plan.description = description
                existing_plan.is_active = is_active
                if resolved_branch and not existing_plan.tenant_id:
                    existing_plan.tenant_id = resolved_branch
                    existing_plan.branch_id = resolved_branch
            else:
                new_plan = MembershipPlan(
                    id=cid,
                    tenant_id=resolved_branch,
                    owner_id=resolved_owner,
                    branch_id=resolved_branch,
                    name=name,
                    category=code,
                    badge=code,
                    price=price,
                    duration_days=duration_days,
                    description=description,
                    is_active=is_active,
                )
                db.add(new_plan)
            db.commit()
        else:
            cid = f"crs_{uuid.uuid4().hex[:10]}"
            # 1. Store directly in courses table
            new_course = Course(
                id=cid,
                tenant_id=resolved_branch,
                owner_id=resolved_owner,
                branch_id=resolved_branch,
                name=name,
                category=code,
                badge=code,
                department=dept,
                degree_type=deg_type,
                price=price,
                duration_days=duration_days,
                description=description,
                is_active=is_active,
            )
            db.add(new_course)

            # 2. Mirror into membership_plans table with same id and tenant
            new_plan = MembershipPlan(
                id=cid,
                tenant_id=resolved_branch,
                owner_id=resolved_owner,
                branch_id=resolved_branch,
                name=name,
                category=code,
                badge=code,
                price=price,
                duration_days=duration_days,
                description=description,
                is_active=is_active,
            )
            db.add(new_plan)
            db.commit()

        return {
            "id": cid,
            "name": name,
            "code": code,
            "category": code,
            "badge": code,
            "period": period,
            "duration_days": duration_days,
            "price": price,
            "description": description,
            "is_active": is_active,
        }

    @staticmethod
    def update_course(db: Session, course_id: str, payload: Dict[str, Any], owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> Dict[str, Any]:
        course = db.query(Course).filter(Course.id == course_id).first()
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == course_id).first()
        if not course and not plan:
            raise ValueError(f"Course '{course_id}' not found")

        name = payload.get("name")
        price = payload.get("price")
        duration_days = payload.get("duration_days")
        raw_period = payload.get("period") or payload.get("duration")
        if duration_days is None and raw_period:
            match = re.search(r"(\d+)", str(raw_period))
            num = int(match.group(1)) if match else 1
            low = str(raw_period).lower()
            if "year" in low:
                duration_days = num * 365
            elif "month" in low:
                duration_days = num * 30
            elif "sem" in low:
                duration_days = num * 180
            elif "day" in low:
                duration_days = num
            else:
                duration_days = num * 365

        code = payload.get("code") or payload.get("category")
        description = payload.get("description")
        is_active = payload.get("is_active")

        if course:
            if name is not None: course.name = str(name).strip()
            if price is not None: course.price = float(price)
            if duration_days is not None: course.duration_days = int(duration_days)
            if code is not None:
                course.category = str(code).strip().upper()
                course.badge = str(code).strip().upper()
            if description is not None: course.description = str(description).strip()
            if is_active is not None: course.is_active = bool(is_active)

        if plan:
            if name is not None: plan.name = str(name).strip()
            if price is not None: plan.price = float(price)
            if duration_days is not None: plan.duration_days = int(duration_days)
            if code is not None:
                plan.category = str(code).strip().upper()
                plan.badge = str(code).strip().upper()
            if description is not None: plan.description = str(description).strip()
            if is_active is not None: plan.is_active = bool(is_active)

        db.commit()

        target = course or plan
        days = getattr(target, "duration_days", 0) or 0
        cd = getattr(target, "category", "") or getattr(target, "badge", "") or ""
        return {
            "id": course_id,
            "name": target.name,
            "code": cd,
            "category": cd,
            "price": float(target.price or 0.0),
            "duration_days": days,
            "period": CourseService.format_duration(days),
            "description": target.description or "",
            "is_active": target.is_active,
        }

    @staticmethod
    def delete_course(db: Session, course_id: str) -> Dict[str, Any]:
        course = db.query(Course).filter(Course.id == course_id).first()
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == course_id).first()
        if not course and not plan:
            raise ValueError(f"Course '{course_id}' not found")
        if course:
            db.delete(course)
        if plan:
            db.delete(plan)
        db.commit()
        return {"id": course_id, "deleted": True}

    # ============================================================
    # LANGUAGES & MEDIUMS OF INSTRUCTION (PURE DATABASE DRIVEN)
    # ============================================================

    @staticmethod
    def get_language_records(db: Session) -> List[Dict[str, Any]]:
        """
        Returns complete language records (id, name, is_active) for the Medium sub-page.
        """
        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            langs = db.query(CourseLanguage).order_by(CourseLanguage.created_at.asc()).all()
            return [{"id": l.id, "name": l.name, "is_active": l.is_active} for l in langs]
        except Exception:
            db.rollback()
            return []

    @staticmethod
    def update_language(db: Session, lang_id_or_name: str, payload: dict) -> Dict[str, Any]:
        """
        Updates name or toggles is_active for a medium of instruction language.
        """
        try:
            from src.database.session import engine
            from sqlalchemy import or_
            from fastapi import HTTPException
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseLanguage).filter(
                or_(CourseLanguage.id == lang_id_or_name, CourseLanguage.name.ilike(lang_id_or_name.strip()))
            ).first()
            if not existing:
                raise HTTPException(status_code=404, detail="Language / Medium not found")
            if "name" in payload and payload["name"].strip():
                existing.name = payload["name"].strip()
            if "is_active" in payload:
                existing.is_active = bool(payload["is_active"])
            db.commit()
            db.refresh(existing)
            return {"id": existing.id, "name": existing.name, "is_active": existing.is_active}
        except Exception as e:
            db.rollback()
            raise e

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
    def add_language(db: Session, lang_name: str, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Adds a new language / medium of instruction directly in database with safe upsert.
        """
        name = lang_name.strip()
        if not name:
            raise ValueError("Medium name is required")

        if not tenant_id:
            try:
                from src.database.tenant_session import get_tenant_scope
                scope = get_tenant_scope()
                if scope and len(scope) == 1 and scope[0]:
                    tenant_id = scope[0]
            except Exception:
                pass

        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)
            from src.database.tenant_session import run_in_resolving
            from sqlalchemy.exc import IntegrityError

            def _find():
                q = db.query(CourseLanguage).filter(func.lower(CourseLanguage.name) == name.lower())
                if tenant_id:
                    q = q.filter(CourseLanguage.tenant_id == tenant_id)
                else:
                    q = q.filter(CourseLanguage.tenant_id.is_(None))
                return q.first()

            existing = run_in_resolving(_find)
            if existing:
                res_id, res_name = existing.id, existing.name
                if not existing.is_active:
                    existing.is_active = True
                    db.commit()
                return {"id": res_id, "name": res_name, "is_active": True}

            lid = f"lang_{uuid.uuid4().hex[:8]}"
            row = CourseLanguage(
                id=lid,
                tenant_id=tenant_id,
                name=name,
                is_active=True
            )
            db.add(row)
            try:
                db.commit()
                return {"id": lid, "name": name, "is_active": True}
            except IntegrityError:
                db.rollback()
                existing = run_in_resolving(_find)
                if existing:
                    res_id, res_name = existing.id, existing.name
                    if not existing.is_active:
                        existing.is_active = True
                        db.commit()
                    return {"id": res_id, "name": res_name, "is_active": True}
                raise
        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def delete_language(db: Session, lang_name_or_id: str) -> Dict[str, Any]:
        """
        Removes a language / medium of instruction from database by id or name.
        """
        name = lang_name_or_id.strip()
        try:
            from src.database.session import engine
            CourseLanguage.__table__.create(bind=engine, checkfirst=True)

            existing = db.query(CourseLanguage).filter(
                or_(CourseLanguage.id == name, CourseLanguage.name.ilike(name))
            ).first()
            if existing:
                db.delete(existing)
                db.commit()
                return {"id": name, "deleted": True}
            return {"id": name, "deleted": False}
        except Exception as e:
            db.rollback()
            raise e

    # ============================================================
    # DURATION TIERS (PURE DATABASE DRIVEN)
    # ============================================================

    @staticmethod
    def get_duration_tiers(db: Session) -> List[Dict[str, Any]]:
        """
        Returns active course duration tiers configured in database.
        """
        from src.database.session import engine
        CourseDurationTier.__table__.create(bind=engine, checkfirst=True)

        tiers = db.query(CourseDurationTier).order_by(CourseDurationTier.days.asc()).all()
        return [
            {
                "id": t.id,
                "name": t.name,
                "days": t.days,
                "unitCount": t.unit_count or 1,
                "unitType": t.unit_type or "years",
                "multiplier": t.multiplier or 1.0,
                "suffix": t.suffix or f"{t.days}D",
                "is_active": t.is_active,
            }
            for t in tiers
        ]

    @staticmethod
    def create_duration_tier(db: Session, payload: Dict[str, Any], tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates or updates a duration tier in the database with safe upsert.
        """
        from src.database.session import engine
        CourseDurationTier.__table__.create(bind=engine, checkfirst=True)

        name = str(payload.get("name") or "").strip()
        days = int(payload.get("days") or 365)
        unit_count = int(payload.get("unitCount") or payload.get("unit_count") or 1)
        unit_type = str(payload.get("unitType") or payload.get("unit_type") or "years").strip().lower()
        multiplier = float(payload.get("multiplier") or 1.0)
        suffix = str(payload.get("suffix") or "").strip() or f"{unit_count}{unit_type[:1].upper()}"

        if not tenant_id:
            try:
                from src.database.tenant_session import get_tenant_scope
                scope = get_tenant_scope()
                if scope and len(scope) == 1 and scope[0]:
                    tenant_id = scope[0]
            except Exception:
                pass

        from src.database.tenant_session import run_in_resolving
        from sqlalchemy.exc import IntegrityError

        def _find_tier():
            q = db.query(CourseDurationTier).filter(func.lower(CourseDurationTier.name) == name.lower())
            if tenant_id:
                q = q.filter(CourseDurationTier.tenant_id == tenant_id)
            else:
                q = q.filter(CourseDurationTier.tenant_id.is_(None))
            return q.first()

        existing = run_in_resolving(_find_tier)
        if existing:
            res_id, res_name = existing.id, existing.name
            existing.days = days
            existing.unit_count = unit_count
            existing.unit_type = unit_type
            existing.multiplier = multiplier
            existing.suffix = suffix
            existing.is_active = True
            db.commit()
            return {
                "id": res_id,
                "name": res_name,
                "days": days,
                "unitCount": unit_count,
                "unitType": unit_type,
                "multiplier": multiplier,
                "suffix": suffix,
                "is_active": True,
            }

        tid = f"tier_{uuid.uuid4().hex[:8]}"
        row = CourseDurationTier(
            id=tid,
            tenant_id=tenant_id,
            name=name,
            days=days,
            unit_count=unit_count,
            unit_type=unit_type,
            multiplier=multiplier,
            suffix=suffix,
            is_active=True,
        )
        db.add(row)
        try:
            db.commit()
            return {
                "id": tid,
                "name": name,
                "days": days,
                "unitCount": unit_count,
                "unitType": unit_type,
                "multiplier": multiplier,
                "suffix": suffix,
                "is_active": True,
            }
        except IntegrityError:
            db.rollback()
            existing = run_in_resolving(_find_tier)
            if existing:
                res_id, res_name = existing.id, existing.name
                existing.days = days
                existing.unit_count = unit_count
                existing.unit_type = unit_type
                existing.multiplier = multiplier
                existing.suffix = suffix
                existing.is_active = True
                db.commit()
                return {
                    "id": res_id,
                    "name": res_name,
                    "days": days,
                    "unitCount": unit_count,
                    "unitType": unit_type,
                    "multiplier": multiplier,
                    "suffix": suffix,
                    "is_active": True,
                }
            raise

    @staticmethod
    def update_duration_tier(db: Session, tier_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates an existing duration tier in the database.
        """
        tier = db.query(CourseDurationTier).filter(CourseDurationTier.id == tier_id).first()
        if not tier:
            raise ValueError(f"Duration tier '{tier_id}' not found")

        if "name" in payload and payload["name"]:
            tier.name = str(payload["name"]).strip()
        if "days" in payload:
            tier.days = int(payload["days"])
        if "unitCount" in payload or "unit_count" in payload:
            tier.unit_count = int(payload.get("unitCount") or payload.get("unit_count") or 1)
        if "unitType" in payload or "unit_type" in payload:
            tier.unit_type = str(payload.get("unitType") or payload.get("unit_type")).strip().lower()
        if "multiplier" in payload:
            tier.multiplier = float(payload["multiplier"])
        if "suffix" in payload:
            tier.suffix = str(payload["suffix"]).strip()
        if "is_active" in payload:
            tier.is_active = bool(payload["is_active"])

        db.commit()
        return {
            "id": tier.id,
            "name": tier.name,
            "days": tier.days,
            "unitCount": tier.unit_count,
            "unitType": tier.unit_type,
            "multiplier": tier.multiplier,
            "suffix": tier.suffix,
            "is_active": tier.is_active,
        }

    @staticmethod
    def delete_duration_tier(db: Session, tier_id: str) -> Dict[str, Any]:
        """
        Removes a duration tier from the database.
        """
        tier = db.query(CourseDurationTier).filter(CourseDurationTier.id == tier_id).first()
        if not tier:
            raise ValueError(f"Duration tier '{tier_id}' not found")
        db.delete(tier)
        db.commit()
        return {"id": tier_id, "deleted": True}

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


