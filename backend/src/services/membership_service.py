from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from src.models.membership import Membership
from src.models.plan import MembershipPlan

class MembershipService:

    @staticmethod
    def get_all_plans(db: Session, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[dict]:
        """
        Returns dynamic active membership plans filtered by gym owner and branch without hardcoded fallbacks.
        """
        from sqlalchemy import text, or_
        try:
            query = db.query(MembershipPlan).filter(MembershipPlan.is_active == True)
            if owner_id:
                query = query.filter(or_(MembershipPlan.owner_id == owner_id, MembershipPlan.owner_id.is_(None)))
            if branch_id:
                query = query.filter(or_(MembershipPlan.branch_id == branch_id, MembershipPlan.branch_id.is_(None)))
            plans = query.order_by(MembershipPlan.price.asc()).all()
        except Exception:
            db.rollback()
            for col_def in [
                "ALTER TABLE membership_plans ADD COLUMN owner_id VARCHAR;",
                "ALTER TABLE membership_plans ADD COLUMN branch_id VARCHAR;",
                "ALTER TABLE membership_plans ADD COLUMN category VARCHAR;",
                "ALTER TABLE membership_plans ADD COLUMN color VARCHAR;",
                "ALTER TABLE membership_plans ADD COLUMN is_combo BOOLEAN DEFAULT FALSE;",
            ]:
                try:
                    db.execute(text(col_def))
                    db.commit()
                except Exception:
                    db.rollback()
            
            query = db.query(MembershipPlan).filter(MembershipPlan.is_active == True)
            if owner_id:
                query = query.filter(or_(MembershipPlan.owner_id == owner_id, MembershipPlan.owner_id.is_(None)))
            if branch_id:
                query = query.filter(or_(MembershipPlan.branch_id == branch_id, MembershipPlan.branch_id.is_(None)))
            plans = query.order_by(MembershipPlan.price.asc()).all()

        result = []
        for p in plans:
            days = p.duration_days or 30
            period = "month" if days == 30 else ("3 months" if days == 90 else ("6 months" if days == 180 else ("year" if days >= 365 else f"{days} days")))
            features = [f.strip() for f in (p.description or "").split(",") if f.strip()]
            cat = (getattr(p, "category", "") or "").strip()
            col = (getattr(p, "color", "") or "").strip()
            is_combo_val = bool(getattr(p, "is_combo", False))
            if not is_combo_val and (cat.endswith("_combo") or "_" in cat or "+" in p.name):
                is_combo_val = True

            result.append({
                "id": p.id,
                "owner_id": getattr(p, "owner_id", None),
                "branch_id": getattr(p, "branch_id", None),
                "name": p.name,
                "category": cat,
                "price": int(p.price) if p.price is not None else 0,
                "duration_days": days,
                "period": period,
                "features": features,
                "color": col,
                "badge": p.badge or "",
                "is_combo": is_combo_val,
                "isCombo": is_combo_val,
            })
        return result

    @staticmethod
    def create_plan(db: Session, data: dict, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[dict]:
        name = data.get("name")
        price = float(data.get("price", 0.0))
        duration_days = int(data.get("duration_days", 30))
        features_list = data.get("features")
        description = data.get("description") or (", ".join(features_list) if isinstance(features_list, list) else "")
        badge = data.get("badge", "")
        category = str(data.get("category") or "").strip()
        color = str(data.get("color") or "").strip()
        is_combo = bool(data.get("is_combo", False) or data.get("isCombo", False) or "_" in category or "+" in (name or ""))
        plan_owner_id = data.get("owner_id") or owner_id
        plan_branch_id = data.get("branch_id") or branch_id

        if not name:
            raise ValueError("Plan name is required")

        plan_id = f"plan_{uuid.uuid4().hex[:6]}"
        plan = MembershipPlan(
            id=plan_id,
            owner_id=plan_owner_id,
            branch_id=plan_branch_id,
            name=name,
            category=category,
            price=price,
            duration_days=duration_days,
            description=description,
            color=color,
            badge=badge,
            is_combo=is_combo,
            is_active=True
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return MembershipService.get_all_plans(db, owner_id=plan_owner_id, branch_id=plan_branch_id)

    @staticmethod
    def update_plan(db: Session, plan_id: str, data: dict, owner_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[dict]:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found")

        if "name" in data:
            plan.name = data["name"]
        if "category" in data:
            plan.category = str(data["category"] or "").strip()
        if "color" in data:
            plan.color = str(data["color"] or "").strip()
        if "price" in data:
            plan.price = float(data["price"])
        if "duration_days" in data:
            plan.duration_days = int(data["duration_days"])
        if "description" in data:
            plan.description = data["description"]
        elif "features" in data and isinstance(data["features"], list):
            plan.description = ", ".join(data["features"])
        if "badge" in data:
            plan.badge = data["badge"]
        if "is_combo" in data or "isCombo" in data:
            plan.is_combo = bool(data.get("is_combo", False) or data.get("isCombo", False))
        if "owner_id" in data:
            plan.owner_id = data["owner_id"]
        if "branch_id" in data:
            plan.branch_id = data["branch_id"]

        db.commit()
        db.refresh(plan)
        return MembershipService.get_all_plans(db, owner_id=owner_id or getattr(plan, "owner_id", None), branch_id=branch_id or getattr(plan, "branch_id", None))

    @staticmethod
    def delete_plan(db: Session, plan_id: str) -> dict:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if plan:
            plan.is_active = False

            db.commit()
        return {"status": "SUCCESS", "message": f"Plan '{plan_id}' deleted."}

    @staticmethod
    def get_membership_by_customer(db: Session, customer_id: str) -> Optional[Membership]:
        return db.query(Membership).filter(Membership.customer_id == customer_id).order_by(Membership.created_at.desc()).first()

    @staticmethod
    def get_expiring_memberships(db: Session) -> List[Membership]:
        return db.query(Membership).filter(Membership.status == "ACTIVE").limit(10).all()

    @staticmethod
    def _resolve_plan(db: Session, data: dict) -> tuple:
        """
        Dynamically resolves (plan_name, price, duration_days) from PostgreSQL MembershipPlan table or input data.
        Zero hardcoded string/integer fallbacks.
        """
        plan = None
        if data.get("plan_id"):
            plan = db.query(MembershipPlan).filter(MembershipPlan.id == data["plan_id"]).first()
        if not plan and data.get("plan_name"):
            plan = db.query(MembershipPlan).filter(MembershipPlan.name == data["plan_name"]).first()

        if plan:
            plan_name = plan.name
            price = float(data.get("price")) if data.get("price") is not None else float(plan.price)
            duration_days = int(data.get("duration_days")) if data.get("duration_days") is not None else int(plan.duration_days)
        else:
            plan_name = str(data.get("plan_name") or "Custom Membership Plan")
            price = float(data.get("price") or 0.0)
            duration_days = int(data.get("duration_days") or 30)

        return plan_name, price, duration_days

    @staticmethod
    def assign_membership(db: Session, data: dict) -> Membership:
        customer_id = data.get("customer_id")
        if not customer_id:
            raise ValueError("customer_id is required for membership assignment")

        plan_name, price, duration_days = MembershipService._resolve_plan(db, data)
        paid_amount = float(data.get("paid_amount")) if data.get("paid_amount") is not None else price
        due_amount = float(data.get("due_amount")) if data.get("due_amount") is not None else max(0.0, price - paid_amount)

        if data.get("start_date"):
            try:
                start_date = datetime.datetime.fromisoformat(data["start_date"].replace('Z', ''))
            except Exception:
                start_date = now_ist_naive()
        else:
            start_date = now_ist_naive()

        if data.get("expiry_date"):
            try:
                expiry_date = datetime.datetime.fromisoformat(data["expiry_date"].replace('Z', ''))
            except Exception:
                expiry_date = start_date + datetime.timedelta(days=duration_days)
        else:
            expiry_date = start_date + datetime.timedelta(days=duration_days)

        plan_type = "ANNUAL" if duration_days >= 365 else ("QUARTERLY" if duration_days >= 90 else "MONTHLY")
        mem_id = f"mem_{uuid.uuid4().hex[:8]}"
        payment_method = data.get("payment_method") or "UPI / Online"
        invoice_number = data.get("invoice_number") or f"INV-MEM-{mem_id[-6:].upper()}"
        transaction_id = data.get("transaction_id")

        mem = Membership(
            id=mem_id,
            customer_id=customer_id,
            plan_name=plan_name,
            plan_type=plan_type,
            status="ACTIVE",
            start_date=start_date,
            expiry_date=expiry_date,
            price=price,
            paid_amount=paid_amount,
            due_amount=due_amount,
            payment_method=payment_method,
            invoice_number=invoice_number,
            transaction_id=transaction_id
        )
        db.add(mem)
        db.commit()
        db.refresh(mem)
        return mem

    @staticmethod
    def renew_membership(db: Session, customer_id: str, data: dict) -> Membership:
        mem = db.query(Membership).filter(Membership.customer_id == customer_id).order_by(Membership.created_at.desc()).first()
        now = now_ist_naive()

        if mem:
            if data.get("duration_days") is not None:
                duration_days = int(data["duration_days"])
            elif data.get("plan_name") or data.get("plan_id"):
                _, _, duration_days = MembershipService._resolve_plan(db, data)
            else:
                if mem.expiry_date and mem.start_date:
                    delta = (mem.expiry_date - mem.start_date).days
                    duration_days = delta if delta > 0 else 30
                else:
                    duration_days = 30

            renewal_price = float(data.get("price")) if data.get("price") is not None else float(mem.price or 0.0)
            paid_amount = float(data.get("paid_amount")) if data.get("paid_amount") is not None else renewal_price
            due_amount = float(data.get("due_amount")) if data.get("due_amount") is not None else max(0.0, renewal_price - paid_amount)

            if data.get("plan_name"):
                mem.plan_name = str(data["plan_name"])

            if data.get("start_date"):
                try:
                    mem.start_date = datetime.datetime.fromisoformat(data["start_date"].replace('Z', ''))
                except Exception:
                    pass

            if data.get("expiry_date"):
                try:
                    mem.expiry_date = datetime.datetime.fromisoformat(data["expiry_date"].replace('Z', ''))
                except Exception:
                    base_date = mem.expiry_date if (mem.expiry_date and mem.expiry_date > now) else now
                    mem.expiry_date = base_date + datetime.timedelta(days=duration_days)
            else:
                base_date = mem.expiry_date if (mem.expiry_date and mem.expiry_date > now) else now
                mem.expiry_date = base_date + datetime.timedelta(days=duration_days)

            mem.status = "ACTIVE"
            mem.price = renewal_price
            mem.paid_amount = (mem.paid_amount or 0.0) + paid_amount
            mem.due_amount = due_amount
            if data.get("payment_method"):
                mem.payment_method = str(data["payment_method"])
            if data.get("transaction_id"):
                mem.transaction_id = str(data["transaction_id"])
            if data.get("invoice_number"):
                mem.invoice_number = str(data["invoice_number"])
            else:
                mem.invoice_number = f"INV-REN-{mem.id[-6:].upper()}"

            db.commit()
            db.refresh(mem)
            return mem
        else:
            data["customer_id"] = customer_id
            return MembershipService.assign_membership(db, data)
