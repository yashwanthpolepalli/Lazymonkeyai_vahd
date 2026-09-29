from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
import uuid
import datetime
from sqlalchemy.orm import Session
from src.models.user import User
from src.utils.security import create_access_token, hash_password, verify_password
from src.models.gym_setting import GymSetting, GymBranch
from src.models.customer import Customer


from sqlalchemy import or_
from src.models.trainer import TrainerProfile


def _fetch_gym_context(db: Session, user: User = None) -> dict:
    """Fetch gym name, branch, and city dynamically from PostgreSQL DB for user & branch mapping."""
    setting = db.query(GymSetting).first()
    branch = None

    if user:
        u_role = (user.role or "").strip().upper()
        # Check Gym Owner mapping
        if u_role in ["GYM_OWNER", "OWNER"]:
            branch = db.query(GymBranch).filter(
                or_(
                    GymBranch.owner_id == user.id,
                    GymBranch.id == user.branch_id
                )
            ).first()

        # Check Customer primary gym location mapping
        if not branch:
            cust = db.query(Customer).filter(Customer.user_id == user.id).first()
            if not cust:
                cust = db.query(Customer).filter(Customer.email == user.email).first()
            if cust and cust.primary_gym_location:
                loc = cust.primary_gym_location.strip()
                branch = db.query(GymBranch).filter(
                    or_(
                        GymBranch.id == loc,
                        GymBranch.branch_name.ilike(f"%{loc}%")
                    )
                ).first()

        # Check Trainer primary gym location mapping
        if not branch:
            trainer = db.query(TrainerProfile).filter(TrainerProfile.email == user.email).first()
            if trainer and getattr(trainer, "primary_gym_location", None):
                t_loc = trainer.primary_gym_location.strip()
                branch = db.query(GymBranch).filter(
                    or_(
                        GymBranch.id == t_loc,
                        GymBranch.branch_name.ilike(f"%{t_loc}%")
                    )
                ).first()

    if not branch:
        branch = db.query(GymBranch).filter(GymBranch.is_active == True).first()
    if not branch:
        branch = db.query(GymBranch).first()

    gym_name = (
        (branch.gym_name if branch and branch.gym_name else None)
        or (setting.gym_name if setting and setting.gym_name else None)
        or ""
    )
    branch_name = branch.branch_name if branch and branch.branch_name else ""
    city = branch.city if branch and branch.city else ""
    gym_id = branch.id if branch and branch.id else ""

    return {
        "gym_id": gym_id,
        "gym_name": gym_name,
        "branch_name": branch_name,
        "city": city,
    }

class AuthService:

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str, role: str = None) -> dict:
        from sqlalchemy import func
        clean_email = email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()

        # If not found directly in User table, check Customer or Trainer profile tables
        if not user:
            cust = db.query(Customer).filter(func.lower(Customer.email) == clean_email).first()
            if cust:
                if cust.user_id:
                    user = db.query(User).filter(User.id == cust.user_id).first()
                
                # Dynamic User provisioning for Customer record
                if not user:
                    req_role = (role or "").strip().upper()
                    target_role = "CUSTOMER" if req_role in ["CUSTOMER", "MEMBER", ""] else req_role
                    user_id = f"usr_{uuid.uuid4().hex[:8]}"
                    user = User(
                        id=user_id,
                        email=clean_email,
                        password_hash=hash_password(password),
                        role=target_role,
                        full_name=cust.full_name,
                        phone=cust.phone,
                        is_active=True
                    )
                    db.add(user)
                    cust.user_id = user_id
                    db.commit()
                    db.refresh(user)
            else:
                trainer = db.query(TrainerProfile).filter(func.lower(TrainerProfile.email) == clean_email).first()
                if trainer:
                    if trainer.user_id:
                        user = db.query(User).filter(User.id == trainer.user_id).first()
                    
                    # Dynamic User provisioning for Trainer/Staff record
                    if not user:
                        target_role = (trainer.role or role or "TRAINER").strip().upper()
                        user_id = f"usr_{uuid.uuid4().hex[:8]}"
                        user = User(
                            id=user_id,
                            email=clean_email,
                            password_hash=hash_password(password),
                            role=target_role,
                            full_name=trainer.full_name,
                            phone=trainer.phone,
                            is_active=True
                        )
                        db.add(user)
                        trainer.user_id = user_id
                        db.commit()
                        db.refresh(user)

        if not user or not verify_password(password, user.password_hash):
            return None

        user_role_up = (user.role or "").strip().upper()

        # Normalize DB user role to canonical representation
        if user_role_up in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
            user_canonical_role = "SUPER_ADMIN"
        elif user_role_up in ["GYM_OWNER", "OWNER", "MANAGER"]:
            user_canonical_role = "GYM_OWNER"
        elif user_role_up in ["TRAINER", "COACH"]:
            user_canonical_role = "TRAINER"
        elif user_role_up in ["CUSTOMER", "MEMBER"]:
            user_canonical_role = "CUSTOMER"
        else:
            user_canonical_role = user_role_up

        # Enforce strict 1:1 role validation matching selected login portal
        if role:
            r_up = role.strip().upper()
            if r_up in ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"]:
                req_canonical_role = "SUPER_ADMIN"
            elif r_up in ["OWNER", "GYM_OWNER"]:
                req_canonical_role = "GYM_OWNER"
            elif r_up in ["TRAINER", "COACH"]:
                req_canonical_role = "TRAINER"
            elif r_up in ["CUSTOMER", "MEMBER"]:
                req_canonical_role = "CUSTOMER"
            else:
                req_canonical_role = r_up

            # Strict role rejection: If user DB role does NOT match requested role, reject login
            if user_canonical_role != req_canonical_role:
                return None

        final_role = user_canonical_role

        gym_ctx = _fetch_gym_context(db, user=user)
        customer_id = None
        cust = db.query(Customer).filter(Customer.user_id == user.id).first()
        if not cust:
            cust = db.query(Customer).filter(Customer.email == user.email).first()
        if cust:
            customer_id = cust.id

        token_payload = {
            "sub": user.id,
            "email": user.email,
            "role": final_role,
            "customer_id": customer_id,
            "branch_id": gym_ctx.get("gym_id"),
        }
        token = create_access_token(token_payload)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "customer_id": customer_id,
            "role": final_role,
            "full_name": user.full_name or (cust.full_name if cust else "") or "",
            "email": user.email,
            "avatar_url": user.avatar_url or (cust.profile_image if cust else "") or "",
            "phone": user.phone or (cust.phone if cust else "") or "",
            **gym_ctx,
        }

    @staticmethod
    def register_owner(db: Session, full_name: str, email: str, password: str, phone: str = None, gym_name: str = None) -> dict:
        clean_email = email.strip().lower()
        existing = db.query(User).filter(User.email == clean_email).first()

        if existing:
            gym_ctx = _fetch_gym_context(db, user=existing)
            token = create_access_token({"sub": existing.id, "email": existing.email, "role": existing.role, "branch_id": gym_ctx.get("gym_id")})
            return {
                "access_token": token,
                "token_type": "bearer",
                "user_id": existing.id,
                "role": existing.role,
                "full_name": existing.full_name,
                "avatar_url": existing.avatar_url or "",
                "phone": existing.phone or "",
                **gym_ctx,
            }

        hashed_pwd = hash_password(password)
        user_id = f"owner_{uuid.uuid4().hex[:8]}"
        branch_id = f"branch_{uuid.uuid4().hex[:8]}"
        resolved_gym_name = gym_name or f"{full_name}'s Gym"

        new_user = User(
            id=user_id,
            email=clean_email,
            password_hash=hashed_pwd,
            role="GYM_OWNER",
            full_name=full_name,
            phone=phone,
            branch_id=branch_id,
            is_active=True,
            is_tenant_owner=True
        )
        db.add(new_user)
        db.flush()

        new_branch = GymBranch(
            id=branch_id,
            branch_name=resolved_gym_name,
            gym_name=resolved_gym_name,
            city="",
            owner_id=user_id,
            is_active=True,
            created_at=now_ist_naive()
        )
        db.add(new_branch)
        db.commit()
        db.refresh(new_user)

        gym_ctx = _fetch_gym_context(db, user=new_user)

        token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role, "branch_id": gym_ctx.get("gym_id")})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": new_user.id,
            "role": new_user.role,
            "full_name": new_user.full_name,
            "avatar_url": new_user.avatar_url or "",
            "phone": new_user.phone or "",
            **gym_ctx,
        }

    @staticmethod
    def get_user_profile(db: Session, email: str = None, token_payload: dict = None) -> dict:
        user = None
        customer_id = token_payload.get("customer_id") if token_payload else None

        if token_payload and token_payload.get("sub"):
            user = db.query(User).filter(User.id == token_payload["sub"]).first()

        if not user and email:
            user = db.query(User).filter(User.email == email.strip().lower()).first()

        if not user:
            return None

        cust = None
        if user:
            cust = db.query(Customer).filter(Customer.user_id == user.id).first()
            if not cust:
                cust = db.query(Customer).filter(Customer.email == user.email).first()

        if cust:
            customer_id = cust.id

        gym_ctx = _fetch_gym_context(db, user=user)

        raw_role = (token_payload.get("role") if token_payload else None) or user.role
        role_up = str(raw_role or "").upper()
        if role_up in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
            mapped_role = "SUPER_ADMIN"
        elif role_up in ["GYM_OWNER", "OWNER", "MANAGER"]:
            mapped_role = "GYM_OWNER"
        elif role_up in ["TRAINER", "COACH"]:
            mapped_role = "TRAINER"
        else:
            mapped_role = "CUSTOMER"

        if mapped_role in ["SUPER_ADMIN", "GYM_OWNER", "TRAINER"]:
            display_name = user.full_name or (cust.full_name if cust else "") or ""
        else:
            display_name = (cust.full_name if cust else "") or user.full_name or ""

        return {
            "user_id": user.id,
            "customer_id": customer_id,
            "full_name": display_name,
            "email": user.email,
            "role": mapped_role,
            "phone": user.phone or (cust.phone if cust else "") or "",
            "avatar_url": user.avatar_url or (cust.profile_image if cust else "") or "",
            **gym_ctx,
        }
