from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
import uuid
import datetime
import re
from sqlalchemy.orm import Session
from src.models.user import User
from src.utils.security import create_access_token, hash_password, verify_password
from src.models.settings import Setting as vahdSetting, Branch as vahdBranch
from src.models.student import student


from sqlalchemy import or_
from src.models.employee import employeeProfile


def _fetch_vahd_context(db: Session, user: User = None) -> dict:
    """Fetch organization name, branch, and city dynamically from PostgreSQL DB for user & branch mapping."""
    setting = db.query(vahdSetting).first()
    branch = None

    if user:
        u_role = (user.role or "").strip().upper()
        # Direct user branch_id check first
        if user.branch_id:
            branch = db.query(vahdBranch).filter(vahdBranch.id == user.branch_id).first()

        # Check Head Office / Owner mapping
        if not branch:
            if u_role in ["HEAD_OFFICE", "HO"]:
                branch = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.ho_id == user.ho_id if user.ho_id else False,
                        vahdBranch.owner_id == user.id
                    )
                ).first()
            elif u_role in ["OWNER"]:
                branch = db.query(vahdBranch).filter(
                    vahdBranch.owner_id == user.id
                ).first()

        # Check student profile mapping
        if not branch:
            cust = db.query(student).filter(student.user_id == user.id).first()
            if not cust:
                cust = db.query(student).filter(student.email == user.email).first()
            if cust:
                if cust.branch_id:
                    branch = db.query(vahdBranch).filter(vahdBranch.id == cust.branch_id).first()
                if not branch and cust.primary_vahd_location:
                    loc = cust.primary_vahd_location.strip()
                    branch = db.query(vahdBranch).filter(
                        or_(
                            vahdBranch.id == loc,
                            vahdBranch.branch_name.ilike(f"%{loc}%"),
                            vahdBranch.vahd_name.ilike(f"%{loc}%")
                        )
                    ).first()
                if not branch and cust.owner_id:
                    branch = db.query(vahdBranch).filter(vahdBranch.owner_id == cust.owner_id).first()
                if not branch and cust.ho_id:
                    branch = db.query(vahdBranch).filter(vahdBranch.ho_id == cust.ho_id).first()

        # Check HRMS Employee mapping
        if not branch:
            try:
                from src.models.hrms import Employee as HrmsEmployee
                emp = db.query(HrmsEmployee).filter(HrmsEmployee.email == user.email).first()
                if emp:
                    if emp.branch_id:
                        branch = db.query(vahdBranch).filter(vahdBranch.id == emp.branch_id).first()
                    if not branch and emp.vahd_branch:
                        t_b = emp.vahd_branch.strip()
                        branch = db.query(vahdBranch).filter(
                            or_(
                                vahdBranch.id == t_b,
                                vahdBranch.branch_name.ilike(f"%{t_b}%"),
                                vahdBranch.vahd_name.ilike(f"%{t_b}%")
                            )
                        ).first()
                    if not branch and emp.owner_id:
                        branch = db.query(vahdBranch).filter(vahdBranch.owner_id == emp.owner_id).first()
                    if not branch and emp.ho_id:
                        branch = db.query(vahdBranch).filter(vahdBranch.ho_id == emp.ho_id).first()
            except Exception:
                pass

        # Check employeeProfile legacy mapping
        if not branch:
            employee = db.query(employeeProfile).filter(employeeProfile.email == user.email).first()
            if employee and getattr(employee, "primary_vahd_location", None):
                t_loc = employee.primary_vahd_location.strip()
                branch = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.id == t_loc,
                        vahdBranch.branch_name.ilike(f"%{t_loc}%"),
                        vahdBranch.vahd_name.ilike(f"%{t_loc}%")
                    )
                ).first()

    if not branch:
        branch = db.query(vahdBranch).filter(vahdBranch.is_active == True).first()
    if not branch:
        branch = db.query(vahdBranch).first()

    # Self-heal user.branch_id and owner_id if missing so future lookups are instant
    if user and branch and not user.branch_id and branch.id:
        try:
            user.branch_id = branch.id
            if not user.owner_id and branch.owner_id:
                user.owner_id = branch.owner_id
            if not user.ho_id and branch.ho_id:
                user.ho_id = branch.ho_id
            db.commit()
        except Exception:
            db.rollback()

    org_name = ""
    branch_name = ""
    city = ""
    vahd_id = ""
    ho_id = ""

    if branch:
        org_name = (branch.vahd_name or branch.branch_name or "").strip()
        branch_name = (branch.branch_name or "").strip()
        city = (branch.city or "").strip()
        vahd_id = branch.id or ""
        ho_id = (branch.ho_id or (user.ho_id if user else "") or "").strip()

    if not org_name and setting:
        org_name = (setting.vahd_name or "").strip()

    display_org = org_name or branch_name or "Main Organization"

    return {
        "vahd_id": vahd_id,
        "vahd_name": display_org,
        "branch_name": branch_name or display_org,
        "organization_name": display_org,
        "city": city,
        "ho_id": ho_id,
    }

class AuthService:

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str, role: str = None) -> dict:
        from sqlalchemy import func
        clean_email = email.strip().lower()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()

        # If not found directly in User table, check student or employee profile tables
        if not user:
            cust = db.query(student).filter(func.lower(student.email) == clean_email).first()
            if cust:
                if cust.user_id:
                    user = db.query(User).filter(User.id == cust.user_id).first()
                
                # Dynamic User provisioning for student record
                if not user:
                    req_role = (role or "").strip().upper()
                    target_role = "STUDENT" if req_role in ["STUDENT", ""] else req_role
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
                employee = db.query(employeeProfile).filter(func.lower(employeeProfile.email) == clean_email).first()
                if employee:
                    if employee.user_id:
                        user = db.query(User).filter(User.id == employee.user_id).first()
                    
                    # Dynamic User provisioning for employee record
                    if not user:
                        target_role = (employee.role or role or "EMPLOYEE").strip().upper()
                        user_id = f"usr_{uuid.uuid4().hex[:8]}"
                        user = User(
                            id=user_id,
                            email=clean_email,
                            password_hash=hash_password(password),
                            role=target_role,
                            full_name=employee.full_name,
                            phone=employee.phone,
                            is_active=True
                        )
                        db.add(user)
                        employee.user_id = user_id
                        db.commit()
                        db.refresh(user)

        is_pwd_valid = verify_password(password, user.password_hash) if user else False

        # Support seamless transition for STUDENT and EMPLOYEE accounts to the pvnr formula
        if not is_pwd_valid and user:
            clean_pwd = (password or "").strip()
            user_role_str = (user.role or "").strip().upper()
            if user_role_str in ["STUDENT", "EMPLOYEE"]:
                phone_candidate = user.phone or ""
                if not phone_candidate and user_role_str == "STUDENT":
                    st = db.query(student).filter(student.user_id == user.id).first()
                    phone_candidate = st.phone if st else ""
                elif not phone_candidate and user_role_str == "EMPLOYEE":
                    ep = db.query(employeeProfile).filter(employeeProfile.user_id == user.id).first()
                    phone_candidate = ep.phone if ep else ""

                digits_phone = re.sub(r'\D', '', phone_candidate or '')
                expected_new_pwd = f"pvnr{digits_phone[-4:]}" if len(digits_phone) >= 4 else None
                if expected_new_pwd and clean_pwd.lower() == expected_new_pwd.lower():
                    user.password_hash = hash_password(clean_pwd.lower())
                    try:
                        db.commit()
                        db.refresh(user)
                    except Exception:
                        db.rollback()
                    is_pwd_valid = True

        if not user or not is_pwd_valid:
            return None

        user_role_up = (user.role or "").strip().upper()

        # Normalize DB user role
        if user_role_up in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
            user_canonical_role = "SUPER_ADMIN"
        elif user_role_up in ["HEAD_OFFICE", "HO"]:
            user_canonical_role = "HEAD_OFFICE"
        elif user_role_up in ["OWNER", "MANAGER"]:
            user_canonical_role = "OWNER"
        elif user_role_up == "EMPLOYEE":
            user_canonical_role = "EMPLOYEE"
        elif user_role_up == "STUDENT":
            user_canonical_role = "STUDENT"
        else:
            user_canonical_role = user_role_up

        # Enforce strict role validation matching selected login portal (Super Admin / HO / Owner / Employees / Students)
        if role:
            r_up = role.strip().upper()
            if r_up in ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"]:
                req_canonical_role = "SUPER_ADMIN"
            elif r_up in ["HO", "HEAD_OFFICE"]:
                req_canonical_role = "HEAD_OFFICE"
            elif r_up in ["OWNER"]:
                req_canonical_role = "OWNER"
            elif r_up == "EMPLOYEE":
                req_canonical_role = "EMPLOYEE"
            elif r_up == "STUDENT":
                req_canonical_role = "STUDENT"
            else:
                req_canonical_role = r_up

            # Strict role rejection: If user DB role does NOT match requested role, reject login
            if user_canonical_role != req_canonical_role:
                return None

        final_role = user_canonical_role

        vahd_ctx = _fetch_vahd_context(db, user=user)
        student_id = None
        cust = db.query(student).filter(student.user_id == user.id).first()
        if not cust:
            cust = db.query(student).filter(student.email == user.email).first()
        if cust:
            student_id = cust.id

        token_payload = {
            "sub": user.id,
            "email": user.email,
            "role": final_role,
            "student_id": student_id,
            "branch_id": vahd_ctx.get("vahd_id"),
        }
        token = create_access_token(token_payload)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.id,
            "student_id": student_id,
            "role": final_role,
            "full_name": user.full_name or (cust.full_name if cust else "") or "",
            "email": user.email,
            "avatar_url": user.avatar_url or (cust.profile_image if cust else "") or "",
            "phone": user.phone or (cust.phone if cust else "") or "",
            "permissions": user.permissions or {},
            "role_title": getattr(user, "role_title", None) or ("Head Office Admin" if final_role == "HEAD_OFFICE" else "Owner" if final_role == "OWNER" else final_role.title()),
            **vahd_ctx,
        }

    @staticmethod
    def register_owner(db: Session, full_name: str, email: str, password: str, phone: str = None, vahd_name: str = None) -> dict:
        clean_email = email.strip().lower()
        existing = db.query(User).filter(User.email == clean_email).first()

        if existing:
            vahd_ctx = _fetch_vahd_context(db, user=existing)
            token = create_access_token({"sub": existing.id, "email": existing.email, "role": existing.role, "branch_id": vahd_ctx.get("vahd_id")})
            return {
                "access_token": token,
                "token_type": "bearer",
                "user_id": existing.id,
                "role": existing.role,
                "full_name": existing.full_name,
                "avatar_url": existing.avatar_url or "",
                "phone": existing.phone or "",
                **vahd_ctx,
            }

        hashed_pwd = hash_password(password)
        user_id = f"owner_{uuid.uuid4().hex[:8]}"
        branch_id = f"vahd_{uuid.uuid4().hex[:10]}"
        resolved_vahd_name = vahd_name or f"{full_name}'s vahd"

        new_user = User(
            id=user_id,
            email=clean_email,
            password_hash=hashed_pwd,
            role="OWNER",
            full_name=full_name,
            phone=phone,
            branch_id=branch_id,
            is_active=True,
            is_tenant_owner=True
        )
        db.add(new_user)
        db.flush()

        new_branch = vahdBranch(
            id=branch_id,
            branch_name=resolved_vahd_name,
            vahd_name=resolved_vahd_name,
            city="",
            owner_id=user_id,
            is_active=True,
            created_at=now_ist_naive()
        )
        db.add(new_branch)
        db.commit()
        db.refresh(new_user)

        vahd_ctx = _fetch_vahd_context(db, user=new_user)

        token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role, "branch_id": vahd_ctx.get("vahd_id")})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": new_user.id,
            "role": new_user.role,
            "full_name": new_user.full_name,
            "avatar_url": new_user.avatar_url or "",
            "phone": new_user.phone or "",
            **vahd_ctx,
        }

    @staticmethod
    def get_user_profile(db: Session, email: str = None, token_payload: dict = None) -> dict:
        user = None
        student_id = token_payload.get("student_id") if token_payload else None

        if token_payload and token_payload.get("sub"):
            user = db.query(User).filter(User.id == token_payload["sub"]).first()

        if not user and email:
            user = db.query(User).filter(User.email == email.strip().lower()).first()

        if not user:
            return None

        cust = None
        if user:
            cust = db.query(student).filter(student.user_id == user.id).first()
            if not cust:
                cust = db.query(student).filter(student.email == user.email).first()

        if cust:
            student_id = cust.id

        vahd_ctx = _fetch_vahd_context(db, user=user)

        raw_role = (token_payload.get("role") if token_payload else None) or user.role
        role_up = str(raw_role or "").upper()
        if role_up in ["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]:
            mapped_role = "SUPER_ADMIN"
        elif role_up in ["HO", "HEAD_OFFICE"]:
            mapped_role = "HEAD_OFFICE"
        elif role_up in ["OWNER", "MANAGER"]:
            mapped_role = "OWNER"
        elif role_up in ["EMPLOYEE", "EMPLOYEES", "employee", "COACH", "STAFF", "EMP"]:
            mapped_role = "EMPLOYEE"
        else:
            mapped_role = "STUDENT"

        if mapped_role in ["SUPER_ADMIN", "HEAD_OFFICE", "OWNER", "EMPLOYEE"]:
            display_name = user.full_name or (cust.full_name if cust else "") or ""
        else:
            display_name = (cust.full_name if cust else "") or user.full_name or ""

        return {
            "user_id": user.id,
            "student_id": student_id,
            "full_name": display_name,
            "email": user.email,
            "role": mapped_role,
            "phone": user.phone or (cust.phone if cust else "") or "",
            "avatar_url": user.avatar_url or (cust.profile_image if cust else "") or "",
            "ho_id": user.ho_id,
            "permissions": user.permissions or {},
            "role_title": getattr(user, "role_title", None) or ("Head Office Admin" if mapped_role == "HEAD_OFFICE" else "Owner" if mapped_role == "OWNER" else mapped_role.title()),
            **vahd_ctx,
        }
