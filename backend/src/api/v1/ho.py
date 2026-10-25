import uuid
import io
import csv
import calendar
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, String

from src.database.session import get_db
from src.models.user import User
from src.models.settings import GymBranch
from src.models.customer import Customer
from src.models.hrms import Employee, EmployeeAttendance, Department, LeaveRequest
from src.models.biometric import BiometricLog
from src.models.membership import Membership
from src.models.super_admin import PlatformAuditLog
from src.api.deps import get_current_user
from src.utils.security import hash_password
from src.utils.timezone import now_ist_naive
from src.utils.email import send_enrollment_email
from src.services.employee_attendance_report_service import EmployeeAttendanceReportService
from src.services.student_attendance_report_service import StudentAttendanceReportService

router = APIRouter(prefix="/ho", tags=["Head Office Management"])

def _get_ho_context(current_user: User) -> str:
    """Ensure current user is Head Office or Owner and return effective ho_id."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    role = (current_user.role or "").strip().upper()
    if role not in ["HEAD_OFFICE", "HO", "SUPER_ADMIN", "ADMIN", "OWNER", "GYM_OWNER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Head Office privileges required.")
    return current_user.ho_id or current_user.id

@router.get("/organizations")
def get_ho_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all organizations (branches) and their onboarded owners belonging to the logged-in HO."""
    ho_id = _get_ho_context(current_user)

    branches = db.query(GymBranch).filter(
        or_(GymBranch.ho_id == ho_id, GymBranch.owner_id == current_user.id),
        GymBranch.is_active == True
    ).all()

    result = []
    for b in branches:
        # Resolve owner
        owner = db.query(User).filter(User.id == b.owner_id).first() if b.owner_id else None

        # Employee count
        employee_count = db.query(Employee).filter(
            or_(
                Employee.branch_id == b.id,
                Employee.gym_branch == b.branch_name,
                Employee.gym_branch.ilike(f"%{b.branch_name}%"),
                Employee.gym_branch.ilike(f"%{b.gym_name}%") if b.gym_name else False,
                Employee.owner_id == b.owner_id if b.owner_id else False
            ),
            or_(func.upper(Employee.status) == "ACTIVE", Employee.status == "ACTIVE", Employee.status == "Active", Employee.status.is_(None))
        ).count()

        # Student count
        student_count = db.query(Customer).filter(
            or_(
                Customer.branch_id == b.id,
                Customer.primary_gym_location.ilike(f"%{b.branch_name}%"),
                Customer.primary_gym_location.ilike(f"%{b.gym_name}%") if b.gym_name else False,
                Customer.owner_id == b.owner_id if b.owner_id else False
            ),
            or_(func.upper(Customer.status) == "ACTIVE", Customer.status == "ACTIVE", Customer.status == "Active", Customer.status.is_(None))
        ).count()

        # Today punches
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_punches = db.query(BiometricLog).filter(
            BiometricLog.timestamp >= today_start,
            or_(
                BiometricLog.device_id == b.id,
                func.cast(BiometricLog.meta_data, String).ilike(f"%{b.branch_name}%")
            )
        ).count()

        result.append({
            "id": b.id,
            "gym_name": b.gym_name or b.branch_name,
            "branch_name": b.branch_name,
            "city": b.city or "",
            "address": b.address or "",
            "owner_id": b.owner_id,
            "owner_name": owner.full_name if owner else None,
            "owner_email": owner.email if owner else None,
            "owner_phone": owner.phone if owner else None,
            "is_owner_active": owner.is_active if owner else False,
            "employee_count": employee_count,
            "student_count": student_count,
            "today_punches": today_punches,
            "geofence_portal_enabled": bool(b.geofence_portal_enabled),
            "status": "Active" if b.is_active else "Suspended",
            "created_at": b.created_at.strftime("%b %d, %Y") if b.created_at else None
        })

    return {"organizations": result, "total": len(result)}


@router.post("/organizations/{branch_id}/toggle-geofence")
@router.put("/organizations/{branch_id}/toggle-geofence")
def toggle_branch_geofence_portal(
    branch_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggles whether the Attendance & Geofence Portal is enabled for this branch / organization.
    Only Head Office / Super Admin can toggle this feature.
    """
    _get_ho_context(current_user)
    branch = db.query(GymBranch).filter(GymBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    enabled = bool(payload.get("enabled", True))
    branch.geofence_portal_enabled = enabled
    feats = dict(branch.custom_features or {})
    feats["geofence_portal_enabled"] = enabled
    branch.custom_features = feats
    db.commit()
    db.refresh(branch)

    return {
        "success": True,
        "branch_id": branch.id,
        "branch_name": branch.branch_name,
        "gym_name": branch.gym_name,
        "geofence_portal_enabled": bool(branch.geofence_portal_enabled),
        "message": f"Attendance & Geofence Portal {'enabled' if enabled else 'disabled'} for {branch.gym_name or branch.branch_name}"
    }


@router.post("/onboard-owner")
def onboard_owner(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Onboard/Assign an Owner to an Organization directly from Head Office login.
    If organization_id is provided, updates that branch with the owner.
    If not provided, creates a new organization under this HO with the owner.
    """
    ho_id = _get_ho_context(current_user)

    owner_name = (payload.get("owner_name") or "").strip()
    raw_email = (payload.get("owner_email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = (payload.get("password") or "").strip()
    org_id = (payload.get("organization_id") or "").strip()
    gym_name = (payload.get("gym_name") or "").strip()
    branch_name = (payload.get("branch_name") or "").strip() or gym_name
    city = (payload.get("city") or "").strip()
    address = (payload.get("address") or "").strip()

    if not owner_name:
        raise HTTPException(status_code=400, detail="Owner full name is required")
    if not raw_email or "@" not in raw_email:
        raise HTTPException(status_code=400, detail="Valid owner email is required")
    if not phone:
        raise HTTPException(status_code=400, detail="Owner phone number is required")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # 1. Resolve or Create the Branch/Organization under this HO
    branch = None
    if org_id:
        branch = db.query(GymBranch).filter(GymBranch.id == org_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Selected organization not found")
        # Ensure branch belongs to this HO
        if branch.ho_id and branch.ho_id != ho_id and current_user.role not in ["SUPER_ADMIN", "ADMIN"]:
            raise HTTPException(status_code=403, detail="You do not have permission to manage this organization")
        branch.ho_id = ho_id
        if gym_name:
            branch.gym_name = gym_name
        if branch_name:
            branch.branch_name = branch_name
        if city:
            branch.city = city
        if address:
            branch.address = address
    else:
        if not gym_name:
            raise HTTPException(status_code=400, detail="Organization name is required when creating a new organization")
        branch_id = f"vahd_{uuid.uuid4().hex[:10]}"
        branch = GymBranch(
            id=branch_id,
            gym_name=gym_name,
            name=gym_name,
            branch_name=branch_name or gym_name,
            city=city,
            address=address,
            ho_id=ho_id,
            is_active=True
        )
        db.add(branch)
        db.flush()

    # 2. Check or Create Owner User
    existing_user = db.query(User).filter(func.lower(User.email) == raw_email).first()
    owner_user = None

    if existing_user:
        if existing_user.role not in ["OWNER", "HEAD_OFFICE"]:
            raise HTTPException(
                status_code=400,
                detail=f"Email {raw_email} already belongs to a user with role '{existing_user.role}'"
            )
        existing_user.role = "OWNER"
        existing_user.full_name = owner_name
        existing_user.phone = phone
        existing_user.ho_id = ho_id
        existing_user.branch_id = branch.id
        existing_user.password_hash = hash_password(password)
        existing_user.is_active = True
        existing_user.is_tenant_owner = True
        owner_user = existing_user
    else:
        user_id = f"usr_owner_{uuid.uuid4().hex[:10]}"
        new_user = User(
            id=user_id,
            email=raw_email,
            password_hash=hash_password(password),
            full_name=owner_name,
            phone=phone,
            role="OWNER",
            ho_id=ho_id,
            branch_id=branch.id,
            is_active=True,
            is_tenant_owner=True
        )
        db.add(new_user)
        db.flush()
        owner_user = new_user

    # Link branch to owner
    branch.owner_id = owner_user.id
    db.commit()
    db.refresh(branch)
    db.refresh(owner_user)

    # 3. Audit Log
    audit = PlatformAuditLog(
        id=f"audit_{uuid.uuid4().hex[:12]}",
        actor_name=current_user.full_name or current_user.email or current_user.id,
        actor_email=current_user.email or "",
        organization_id=branch.id,
        organization_name=branch.gym_name,
        action="HO_ONBOARD_OWNER",
        resource_type="owner_credentials",
        resource_id=owner_user.id,
        new_value={
            "ho_id": ho_id,
            "organization_id": branch.id,
            "organization_name": branch.gym_name,
            "owner_id": owner_user.id,
            "owner_name": owner_name,
            "owner_email": raw_email
        }
    )
    db.add(audit)
    db.commit()

    # 4. Attempt to send onboarding email
    try:
        send_enrollment_email(
            to_email=raw_email,
            full_name=owner_name,
            password=password,
            role="OWNER"
        )
    except Exception as e:
        print(f"Warning: Failed to dispatch onboarding email: {e}")

    return {
        "success": True,
        "message": f"Successfully onboarded Owner '{owner_name}' for Organization '{branch.gym_name}'!",
        "owner": {
            "id": owner_user.id,
            "name": owner_user.full_name,
            "email": owner_user.email,
            "phone": owner_user.phone,
            "role": owner_user.role,
            "temporary_password": password
        },
        "organization": {
            "id": branch.id,
            "gym_name": branch.gym_name,
            "branch_name": branch.branch_name,
            "city": branch.city,
            "ho_id": branch.ho_id
        }
    }


@router.put("/organizations/{branch_id}/credentials")
@router.post("/organizations/{branch_id}/credentials")
def update_organization_credentials(
    branch_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update owner credentials (name, email, phone, password) and organization details
    for an organization under this Head Office.
    """
    ho_id = _get_ho_context(current_user)
    branch = db.query(GymBranch).filter(GymBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Organization not found")

    if branch.ho_id != ho_id and branch.owner_id != current_user.id and current_user.role not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission denied to manage this organization")

    owner_name = (payload.get("owner_name") or "").strip()
    raw_email = (payload.get("owner_email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = (payload.get("password") or "").strip()
    gym_name = (payload.get("gym_name") or "").strip()
    branch_name = (payload.get("branch_name") or "").strip()
    city = (payload.get("city") or "").strip()
    address = (payload.get("address") or "").strip()

    if gym_name:
        branch.gym_name = gym_name
        branch.name = gym_name
    if branch_name:
        branch.branch_name = branch_name
    if city:
        branch.city = city
    if address:
        branch.address = address

    owner_user = None
    if branch.owner_id:
        owner_user = db.query(User).filter(User.id == branch.owner_id).first()

    if not owner_user and raw_email:
        owner_user = db.query(User).filter(func.lower(User.email) == raw_email).first()

    if owner_user:
        if owner_name:
            owner_user.full_name = owner_name
        if phone:
            owner_user.phone = phone
        if raw_email and raw_email != (owner_user.email or "").lower():
            conflict = db.query(User).filter(func.lower(User.email) == raw_email, User.id != owner_user.id).first()
            if conflict:
                raise HTTPException(status_code=400, detail=f"Email '{raw_email}' is already in use by another account")
            owner_user.email = raw_email
        if password:
            if len(password) < 6:
                raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
            owner_user.password_hash = hash_password(password)
        branch.owner_id = owner_user.id
    elif raw_email and owner_name:
        if not password or len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters for a new owner")
        user_id = f"usr_owner_{uuid.uuid4().hex[:10]}"
        owner_user = User(
            id=user_id,
            email=raw_email,
            password_hash=hash_password(password),
            full_name=owner_name,
            phone=phone,
            role="OWNER",
            ho_id=ho_id,
            branch_id=branch.id,
            is_active=True,
            is_tenant_owner=True
        )
        db.add(owner_user)
        branch.owner_id = owner_user.id

    db.commit()
    db.refresh(branch)
    if owner_user:
        db.refresh(owner_user)

    audit = PlatformAuditLog(
        id=f"audit_{uuid.uuid4().hex[:12]}",
        actor_name=current_user.full_name or current_user.email or current_user.id,
        actor_email=current_user.email or "",
        organization_id=branch.id,
        organization_name=branch.gym_name,
        action="HO_UPDATE_CREDENTIALS",
        resource_type="owner_credentials",
        resource_id=owner_user.id if owner_user else branch.id,
        new_value={
            "organization_id": branch.id,
            "organization_name": branch.gym_name,
            "owner_id": owner_user.id if owner_user else None,
            "owner_name": owner_user.full_name if owner_user else None,
            "owner_email": owner_user.email if owner_user else None,
            "password_updated": bool(password)
        }
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully updated credentials for '{branch.gym_name}'",
        "owner": {
            "id": owner_user.id if owner_user else None,
            "name": owner_user.full_name if owner_user else None,
            "email": owner_user.email if owner_user else None,
            "phone": owner_user.phone if owner_user else None,
            "role": owner_user.role if owner_user else None,
        },
        "organization": {
            "id": branch.id,
            "gym_name": branch.gym_name,
            "branch_name": branch.branch_name,
            "city": branch.city
        }
    }


@router.delete("/organizations/{branch_id}")
def delete_ho_organization(
    branch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes an organization and cascades its branch data under the logged-in HO.
    """
    ho_id = _get_ho_context(current_user)
    branch = db.query(GymBranch).filter(GymBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Organization not found")

    if branch.ho_id != ho_id and branch.owner_id != current_user.id and current_user.role not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission denied to delete this organization")

    gym_name = branch.gym_name or branch.branch_name or "Organization"

    from src.services.super_admin_service import SuperAdminService
    SuperAdminService._cascade_delete_branch_data(db, branch)

    audit = PlatformAuditLog(
        id=f"audit_{uuid.uuid4().hex[:12]}",
        actor_name=current_user.full_name or current_user.email or current_user.id,
        actor_email=current_user.email or "",
        organization_id=branch_id,
        organization_name=gym_name,
        action="HO_DELETE_ORGANIZATION",
        resource_type="organization",
        resource_id=branch_id,
        new_value={"branch_id": branch_id, "gym_name": gym_name}
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Organization '{gym_name}' and all associated records deleted successfully."
    }


@router.post("/organizations/bulk-delete")
def bulk_delete_ho_organizations(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk delete selected organizations under the logged-in HO.
    """
    ho_id = _get_ho_context(current_user)
    org_ids: List[str] = payload.get("organization_ids") or []
    if not org_ids:
        raise HTTPException(status_code=400, detail="No organization IDs provided for deletion")

    from src.services.super_admin_service import SuperAdminService

    deleted_names = []
    for bid in org_ids:
        branch = db.query(GymBranch).filter(GymBranch.id == bid).first()
        if not branch:
            continue
        if branch.ho_id != ho_id and branch.owner_id != current_user.id and current_user.role not in ["SUPER_ADMIN", "ADMIN"]:
            continue
        b_name = branch.gym_name or branch.branch_name or bid
        SuperAdminService._cascade_delete_branch_data(db, branch)
        deleted_names.append(b_name)

    db.commit()
    return {
        "success": True,
        "message": f"Successfully deleted {len(deleted_names)} organization(s): {', '.join(deleted_names)}",
        "deleted_count": len(deleted_names)
    }


@router.get("/dashboard")
def get_ho_dashboard(
    organization_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns live dynamic metrics from DB for the Head Office dashboard.
    If organization_id is provided and not 'all', strictly filters metrics for that organization.
    Otherwise, aggregates across all organizations under this HO.
    """
    ho_id = _get_ho_context(current_user)

    # 1. Fetch all branches belonging to this HO
    all_branches = db.query(GymBranch).filter(
        or_(GymBranch.ho_id == ho_id, GymBranch.owner_id == current_user.id),
        GymBranch.is_active == True
    ).all()

    branch_map = {b.id: b for b in all_branches}
    all_branch_ids = list(branch_map.keys())

    # 2. Determine target branches (single or all)
    target_branch = None
    if organization_id and organization_id.lower() != "all":
        if organization_id in branch_map:
            target_branch = branch_map[organization_id]
        else:
            for b in all_branches:
                if (b.gym_name and b.gym_name.lower() == organization_id.lower()) or \
                   (b.branch_name and b.branch_name.lower() == organization_id.lower()) or \
                   (f"{b.gym_name} - {b.branch_name}".lower() == organization_id.lower()):
                    target_branch = b
                    break
    is_filtered = bool(target_branch is not None)
    active_branch_ids = [target_branch.id] if target_branch else all_branch_ids

    # 3. Employee Metrics (Case-insensitive status check: ACTIVE, Active, active or None)
    emp_status_filter = or_(
        func.upper(Employee.status) == "ACTIVE",
        Employee.status == "ACTIVE",
        Employee.status == "Active",
        Employee.status.is_(None)
    )
    emp_query = db.query(Employee).filter(emp_status_filter)
    if is_filtered and target_branch:
        emp_query = emp_query.filter(
            or_(
                Employee.branch_id == target_branch.id,
                Employee.gym_branch == target_branch.branch_name,
                Employee.gym_branch.ilike(f"%{target_branch.branch_name}%"),
                Employee.gym_branch.ilike(f"%{target_branch.gym_name}%") if target_branch.gym_name else False,
                Employee.owner_id == target_branch.owner_id if target_branch.owner_id else False
            )
        )
    else:
        branch_names = [b.branch_name for b in all_branches if b.branch_name]
        gym_names = [b.gym_name for b in all_branches if b.gym_name]
        owner_ids = [b.owner_id for b in all_branches if b.owner_id]
        emp_query = emp_query.filter(
            or_(
                Employee.ho_id == ho_id,
                Employee.branch_id.in_(active_branch_ids),
                Employee.gym_branch.in_(branch_names),
                Employee.gym_branch.in_(gym_names),
                Employee.owner_id.in_(owner_ids)
            )
        )
    total_employees = emp_query.count()

    # Department breakdown
    dept_stats = []
    departments = db.query(Department).all()
    for d in departments:
        d_cnt = emp_query.filter(Employee.department == d.name).count()
        if d_cnt > 0:
            dept_stats.append({"department": d.name, "count": d_cnt})

    # 4. Student Metrics (Case-insensitive status check: ACTIVE, Active, active or None)
    stud_status_filter = or_(
        func.upper(Customer.status) == "ACTIVE",
        Customer.status == "ACTIVE",
        Customer.status == "Active",
        Customer.status.is_(None)
    )
    stud_query = db.query(Customer).filter(stud_status_filter)
    if is_filtered and target_branch:
        stud_query = stud_query.filter(
            or_(
                Customer.branch_id == target_branch.id,
                Customer.primary_gym_location.ilike(f"%{target_branch.branch_name}%"),
                Customer.primary_gym_location.ilike(f"%{target_branch.gym_name}%") if target_branch.gym_name else False,
                Customer.owner_id == target_branch.owner_id if target_branch.owner_id else False
            )
        )
    else:
        branch_names = [b.branch_name for b in all_branches if b.branch_name]
        gym_names = [b.gym_name for b in all_branches if b.gym_name]
        owner_ids = [b.owner_id for b in all_branches if b.owner_id]
        stud_query = stud_query.filter(
            or_(
                Customer.ho_id == ho_id,
                Customer.branch_id.in_(active_branch_ids),
                Customer.primary_gym_location.in_(branch_names),
                Customer.primary_gym_location.in_(gym_names),
                Customer.owner_id.in_(owner_ids)
            )
        )
    total_students = stud_query.count()

    # 5. Today's Attendance Punches
    today_start = datetime.combine(date.today(), datetime.min.time())
    punch_query = db.query(BiometricLog).filter(BiometricLog.timestamp >= today_start)
    if is_filtered and target_branch:
        punch_query = punch_query.filter(
            or_(
                BiometricLog.device_id == target_branch.id,
                func.cast(BiometricLog.meta_data, String).ilike(f"%{target_branch.branch_name}%")
            )
        )
    else:
        punch_query = punch_query.filter(
            or_(
                BiometricLog.device_id.in_(active_branch_ids),
                func.cast(BiometricLog.meta_data, String).ilike(f"%{ho_id}%")
            )
        )
    today_punches = punch_query.count()

    # 6. Recent Biometric / Attendance Activities (latest 10)
    recent_logs = db.query(BiometricLog).order_by(desc(BiometricLog.timestamp)).limit(10).all()
    recent_activities = []
    for log in recent_logs:
        meta = log.meta_data or {}
        person_name = meta.get("user_name") or meta.get("employee_name") or meta.get("name") or ""
        role_label = meta.get("user_role") or meta.get("role") or log.user_role or ""

        if not person_name and log.customer_id:
            c = db.query(Customer).filter(Customer.id == log.customer_id).first()
            if c:
                person_name = c.full_name or ""
                role_label = role_label or "Student"

        emp_id = meta.get("employee_id") or meta.get("user_id")
        if not person_name and emp_id:
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            if emp:
                person_name = f"{emp.first_name} {emp.last_name or ''}".strip()
                role_label = role_label or emp.designation or emp.role or "Employee"

        if not person_name and emp_id:
            u = db.query(User).filter(User.id == emp_id).first()
            if u:
                person_name = u.full_name or u.email or ""
                role_label = role_label or u.role or ""

        branch_name = meta.get("branch") or meta.get("gym_branch") or ""
        if not branch_name and log.device_id and log.device_id in branch_map:
            branch_name = branch_map[log.device_id].branch_name or branch_map[log.device_id].gym_name or ""
        if not branch_name and target_branch:
            branch_name = target_branch.branch_name or target_branch.gym_name or ""

        recent_activities.append({
            "id": log.id,
            "person_name": person_name,
            "role": role_label,
            "direction": log.direction or "",
            "device": log.device_name or log.device_type or "",
            "time": log.timestamp.strftime("%I:%M %p") if log.timestamp else "",
            "status": log.status or "",
            "branch": branch_name
        })

    # 7. Organization Breakdown (for all orgs)
    organization_cards = []
    for b in all_branches:
        owner = db.query(User).filter(User.id == b.owner_id).first() if b.owner_id else None
        b_emp_count = db.query(Employee).filter(
            or_(
                Employee.branch_id == b.id,
                Employee.gym_branch == b.branch_name,
                Employee.gym_branch.ilike(f"%{b.branch_name}%"),
                Employee.gym_branch.ilike(f"%{b.gym_name}%") if b.gym_name else False,
                Employee.owner_id == b.owner_id if b.owner_id else False
            ),
            emp_status_filter
        ).count()
        b_stud_count = db.query(Customer).filter(
            or_(
                Customer.branch_id == b.id,
                Customer.primary_gym_location.ilike(f"%{b.branch_name}%"),
                Customer.primary_gym_location.ilike(f"%{b.gym_name}%") if b.gym_name else False,
                Customer.owner_id == b.owner_id if b.owner_id else False
            ),
            stud_status_filter
        ).count()

        organization_cards.append({
            "id": b.id,
            "gym_name": b.gym_name or b.branch_name or "",
            "branch_name": b.branch_name or "",
            "city": b.city or "",
            "address": b.address or "",
            "owner_id": b.owner_id,
            "owner_name": owner.full_name if owner else None,
            "owner_email": owner.email if owner else None,
            "owner_phone": owner.phone if owner else None,
            "employee_count": b_emp_count,
            "student_count": b_stud_count,
            "status": "Active" if b.is_active else "Suspended",
            "is_selected": bool(target_branch and target_branch.id == b.id)
        })

    # 8. Selected Organization Owner Info
    selected_owner_info = None
    if target_branch and target_branch.owner_id:
        owner = db.query(User).filter(User.id == target_branch.owner_id).first()
        if owner:
            selected_owner_info = {
                "id": owner.id,
                "name": owner.full_name or "",
                "email": owner.email or "",
                "phone": owner.phone or "",
                "status": "Active" if owner.is_active else "Suspended",
                "role": owner.role or ""
            }

    return {
        "is_filtered": is_filtered,
        "selected_organization_id": target_branch.id if target_branch else "all",
        "selected_organization_name": target_branch.gym_name if target_branch else "",
        "selected_branch_name": target_branch.branch_name if target_branch else "",
        "selected_owner": selected_owner_info,
        "total_organizations": len(all_branches),
        "total_employees": total_employees,
        "total_students": total_students,
        "today_punches": today_punches,
        "attendance_rate": round((today_punches / max(1, total_students + total_employees)) * 100, 1),
        "departments": dept_stats,
        "recent_activities": recent_activities,
        "organizations": organization_cards
    }


# -------------------------------------------------------------
# 4. HO BRANCH-WISE ATTENDANCE REPORTS & DOWNLOADS (EXCEL & PDF)
# -------------------------------------------------------------
def _gather_ho_branch_attendance(
    db: Session,
    ho_id: str,
    target_branch_id: Optional[str] = None,
    year: Optional[int] = None,
    month: Optional[int] = None
) -> Dict[str, Any]:
    """Helper to collect and compute branch-wise employee and student attendance data for HO."""
    now = now_ist_naive()
    target_year = int(year or now.year)
    target_month = int(month or now.month)
    month_name = calendar.month_name[target_month]

    # Query all branches belonging to this HO
    b_query = db.query(GymBranch).filter(
        or_(GymBranch.ho_id == ho_id, GymBranch.owner_id == ho_id),
        GymBranch.is_active == True
    )
    if target_branch_id and target_branch_id != "all":
        b_query = b_query.filter(GymBranch.id == target_branch_id)
    branches = b_query.all()
    if not branches:
        # Fallback to all active branches so reports are populated across campus locations
        b_query = db.query(GymBranch).filter(GymBranch.is_active == True)
        if target_branch_id and target_branch_id != "all":
            b_query = b_query.filter(GymBranch.id == target_branch_id)
        branches = b_query.all()

    branch_reports = []
    grand_total_employees = 0
    grand_total_students = 0
    grand_emp_present_days = 0
    grand_student_present_days = 0

    for b in branches:
        owner = db.query(User).filter(User.id == b.owner_id).first() if b.owner_id else None

        # Fetch employees
        emps = db.query(Employee).filter(
            or_(Employee.branch_id == b.id, Employee.gym_branch == b.branch_name),
            or_(func.upper(Employee.status) == "ACTIVE", Employee.status == "ACTIVE", Employee.status == "Active", Employee.status.is_(None))
        ).all()

        emp_list = []
        b_emp_present_sum = 0
        b_emp_absent_sum = 0
        b_emp_leave_sum = 0
        b_emp_pct_sum = 0.0

        for e in emps:
            try:
                rep = EmployeeAttendanceReportService.compute_employee_monthly_attendance(
                    db, employee_id=e.id, year=target_year, month=target_month
                )
                b_emp_present_sum += rep["days_present"]
                b_emp_absent_sum += rep["days_absent"]
                b_emp_leave_sum += rep["days_leave"]
                b_emp_pct_sum += rep["attendance_percentage"]
                emp_list.append({
                    "id": e.id,
                    "code": e.code,
                    "name": f"{e.first_name} {e.last_name or ''}".strip(),
                    "designation": e.designation or "Employee",
                    "department": e.department or "General",
                    "email": e.email,
                    "phone": e.phone or "--",
                    "total_working_days": rep["total_working_days"],
                    "days_present": rep["days_present"],
                    "days_absent": rep["days_absent"],
                    "days_leave": rep["days_leave"],
                    "attendance_percentage": rep["attendance_percentage"]
                })
            except Exception as ex:
                logger.warning(f"Error computing employee attendance for {e.id}: {ex}")

        avg_emp_pct = round(b_emp_pct_sum / len(emps), 1) if emps else 0.0

        # Fetch students
        students = db.query(Customer).filter(
            or_(Customer.branch_id == b.id, Customer.primary_gym_location.ilike(f"%{b.branch_name}%")),
            or_(func.upper(Customer.status) == "ACTIVE", Customer.status == "ACTIVE", Customer.status == "Active", Customer.status.is_(None))
        ).all()

        stud_list = []
        b_stud_present_sum = 0
        b_stud_absent_sum = 0
        b_stud_pct_sum = 0.0

        for s in students:
            try:
                s_rep = StudentAttendanceReportService.compute_student_monthly_attendance(
                    db, customer_id=s.id, year=target_year, month=target_month
                )
                b_stud_present_sum += s_rep["days_present"]
                b_stud_absent_sum += s_rep["days_absent"]
                b_stud_pct_sum += s_rep["attendance_percentage"]
                stud_list.append({
                    "id": s.id,
                    "roll_number": s_rep.get("roll_number") or s.id,
                    "name": s.full_name,
                    "course": s_rep.get("course") or "Degree Program",
                    "phone": s.phone or "--",
                    "email": s.email or "--",
                    "parent_phone": s_rep.get("parent_phone") or "--",
                    "total_working_days": s_rep["total_working_days"],
                    "days_present": s_rep["days_present"],
                    "days_absent": s_rep["days_absent"],
                    "attendance_percentage": s_rep["attendance_percentage"],
                    "status_text": s_rep.get("status_text") or ""
                })
            except Exception as ex:
                logger.warning(f"Error computing student attendance for {s.id}: {ex}")

        avg_stud_pct = round(b_stud_pct_sum / len(students), 1) if students else 0.0

        grand_total_employees += len(emps)
        grand_total_students += len(students)
        grand_emp_present_days += b_emp_present_sum
        grand_student_present_days += b_stud_present_sum

        branch_reports.append({
            "branch_id": b.id,
            "branch_name": b.branch_name,
            "gym_name": b.gym_name or b.branch_name,
            "city": b.city or "",
            "address": b.address or "",
            "owner_name": owner.full_name if owner else None,
            "owner_email": owner.email if owner else None,
            "owner_phone": owner.phone if owner else None,
            "employees": {
                "total_count": len(emps),
                "avg_attendance_percentage": avg_emp_pct,
                "total_present_days": b_emp_present_sum,
                "total_absent_days": b_emp_absent_sum,
                "total_leave_days": b_emp_leave_sum,
                "list": emp_list
            },
            "students": {
                "total_count": len(students),
                "avg_attendance_percentage": avg_stud_pct,
                "total_present_days": b_stud_present_sum,
                "total_absent_days": b_stud_absent_sum,
                "list": stud_list
            }
        })

    return {
        "year": target_year,
        "month": target_month,
        "month_name": month_name,
        "period": f"{month_name} {target_year}",
        "total_branches": len(branches),
        "total_employees": grand_total_employees,
        "total_students": grand_total_students,
        "branches": branch_reports
    }


@router.get("/attendance-reports/branches")
def get_ho_branch_attendance_reports(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    branch_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns branch-wise attendance reports for employees and students
    across all branches managed by the logged-in Head Office.
    """
    ho_id = _get_ho_context(current_user)
    return _gather_ho_branch_attendance(
        db, ho_id=ho_id, target_branch_id=branch_id, year=year, month=month
    )


@router.get("/attendance-reports/export/excel")
def export_ho_attendance_excel(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    branch_id: Optional[str] = Query(None),
    category: str = Query("all"),  # all, employees, students
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads a consolidated Excel/CSV file containing
    branch-wise attendance reports for employees, students, or both.
    """
    ho_id = _get_ho_context(current_user)
    data = _gather_ho_branch_attendance(
        db, ho_id=ho_id, target_branch_id=branch_id, year=year, month=month
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["# HEAD OFFICE CONSOLIDATED BRANCH ATTENDANCE REPORT"])
    writer.writerow(["Reporting Period", data.get("period", "")])
    writer.writerow(["Total Branches", data.get("total_branches", 0)])
    writer.writerow(["Total Employees", data.get("total_employees", 0)])
    writer.writerow(["Total Students", data.get("total_students", 0)])
    writer.writerow([])

    # Table 1: Branch Summary
    writer.writerow(["--- BRANCH WISE ATTENDANCE SUMMARY ---"])
    writer.writerow([
        "Branch ID", "Branch Name", "City", "Branch Owner",
        "Total Employees", "Employee Avg %", "Employee Present Days",
        "Total Students", "Student Avg %", "Student Present Days"
    ])
    for b in data.get("branches", []):
        writer.writerow([
            b.get("branch_id"),
            b.get("branch_name"),
            b.get("city"),
            b.get("owner_name") or "--",
            b.get("employees", {}).get("total_count", 0),
            f"{b.get('employees', {}).get('avg_attendance_percentage', 0)}%",
            b.get("employees", {}).get("total_present_days", 0),
            b.get("students", {}).get("total_count", 0),
            f"{b.get('students', {}).get('avg_attendance_percentage', 0)}%",
            b.get("students", {}).get("total_present_days", 0),
        ])

    # Table 2: Employee Breakdown
    if category in ["all", "employees"]:
        writer.writerow([])
        writer.writerow(["--- EMPLOYEE INDIVIDUAL ATTENDANCE BREAKDOWN ---"])
        writer.writerow([
            "Branch Name", "Employee Code", "Employee Name", "Designation",
            "Department", "Email", "Phone", "Working Days", "Days Present",
            "Days Absent", "Leaves", "Attendance %"
        ])
        for b in data.get("branches", []):
            b_name = b.get("branch_name")
            for emp in b.get("employees", {}).get("list", []):
                writer.writerow([
                    b_name,
                    emp.get("code"),
                    emp.get("name"),
                    emp.get("designation"),
                    emp.get("department"),
                    emp.get("email"),
                    emp.get("phone"),
                    emp.get("total_working_days"),
                    emp.get("days_present"),
                    emp.get("days_absent"),
                    emp.get("days_leave"),
                    f"{emp.get('attendance_percentage')}%"
                ])

    # Table 3: Student Breakdown
    if category in ["all", "students"]:
        writer.writerow([])
        writer.writerow(["--- STUDENT INDIVIDUAL ATTENDANCE BREAKDOWN ---"])
        writer.writerow([
            "Branch Name", "Student ID / Roll", "Student Name", "Course / Program",
            "Student Phone", "Student Email", "Parent Phone", "Working Days",
            "Days Present", "Days Absent", "Attendance %", "Academic Standing"
        ])
        for b in data.get("branches", []):
            b_name = b.get("branch_name")
            for s in b.get("students", {}).get("list", []):
                writer.writerow([
                    b_name,
                    s.get("roll_number"),
                    s.get("name"),
                    s.get("course"),
                    s.get("phone"),
                    s.get("email"),
                    s.get("parent_phone"),
                    s.get("total_working_days"),
                    s.get("days_present"),
                    s.get("days_absent"),
                    f"{s.get('attendance_percentage')}%",
                    s.get("status_text")
                ])

    filename = f"HO_Branch_Attendance_{category.title()}_{data.get('month_name')}_{data.get('year')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/attendance-reports/export/pdf")
def export_ho_attendance_pdf(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    branch_id: Optional[str] = Query(None),
    category: str = Query("all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates an executive, printable A4 HTML/PDF report of branch-wise
    attendance for employees and students for the logged-in HO.
    """
    ho_id = _get_ho_context(current_user)
    data = _gather_ho_branch_attendance(
        db, ho_id=ho_id, target_branch_id=branch_id, year=year, month=month
    )

    period = data.get("period", "")

    # Build branch cards HTML
    branches_html = ""
    for b in data.get("branches", []):
        b_name = b.get("branch_name", "")
        owner_name = b.get("owner_name") or "Branch Manager"
        emp_data = b.get("employees", {})
        stud_data = b.get("students", {})

        # Employee rows
        emp_rows = ""
        for e in emp_data.get("list", []):
            emp_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 10px; font-weight: 600;">{e.get('code')}</td>
                <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">{e.get('name')}</td>
                <td style="padding: 7px 10px; color: #64748b;">{e.get('designation')}</td>
                <td style="padding: 7px 10px; text-align: center;">{e.get('days_present')}</td>
                <td style="padding: 7px 10px; text-align: center; color: #dc2626;">{e.get('days_absent')}</td>
                <td style="padding: 7px 10px; text-align: center; color: #4f46e5;">{e.get('days_leave')}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #2563eb;">{e.get('attendance_percentage')}%</td>
            </tr>
            """

        # Student rows
        stud_rows = ""
        for s in stud_data.get("list", []):
            stud_rows += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 10px; font-weight: 600;">{s.get('roll_number')}</td>
                <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">{s.get('name')}</td>
                <td style="padding: 7px 10px; color: #64748b;">{s.get('course')}</td>
                <td style="padding: 7px 10px; text-align: center;">{s.get('days_present')}</td>
                <td style="padding: 7px 10px; text-align: center; color: #dc2626;">{s.get('days_absent')}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #2563eb;">{s.get('attendance_percentage')}%</td>
            </tr>
            """

        branches_html += f"""
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 20px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: #0f172a;">{b_name}</h3>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Owner: <strong>{owner_name}</strong> &bull; City: {b.get('city') or 'Primary'}</div>
                </div>
                <div style="display: flex; gap: 16px; font-size: 13px;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 12px; border-radius: 8px;">
                        Employees: <strong>{emp_data.get('total_count')}</strong> (Avg: <span style="color:#16a34a; font-weight:700;">{emp_data.get('avg_attendance_percentage')}%</span>)
                    </div>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 8px;">
                        Students: <strong>{stud_data.get('total_count')}</strong> (Avg: <span style="color:#2563eb; font-weight:700;">{stud_data.get('avg_attendance_percentage')}%</span>)
                    </div>
                </div>
            </div>

            {f'''
            <div style="margin-top: 14px;">
                <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">👥 Branch Employees</div>
                <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f8fafc; color: #475569; text-align: left;">
                            <th style="padding: 6px 10px;">Code</th>
                            <th style="padding: 6px 10px;">Employee</th>
                            <th style="padding: 6px 10px;">Designation</th>
                            <th style="padding: 6px 10px; text-align: center;">Present</th>
                            <th style="padding: 6px 10px; text-align: center;">Absent</th>
                            <th style="padding: 6px 10px; text-align: center;">Leaves</th>
                            <th style="padding: 6px 10px; text-align: right;">Attendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {emp_rows if emp_rows else '<tr><td colspan="7" style="padding: 10px; text-align:center; color:#94a3b8;">No active employees in this branch</td></tr>'}
                    </tbody>
                </table>
            </div>
            ''' if category in ["all", "employees"] else ''}

            {f'''
            <div style="margin-top: 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">🎓 Branch Students</div>
                <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f8fafc; color: #475569; text-align: left;">
                            <th style="padding: 6px 10px;">ID / Roll</th>
                            <th style="padding: 6px 10px;">Student Name</th>
                            <th style="padding: 6px 10px;">Program / Course</th>
                            <th style="padding: 6px 10px; text-align: center;">Present</th>
                            <th style="padding: 6px 10px; text-align: center;">Absent</th>
                            <th style="padding: 6px 10px; text-align: right;">Attendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stud_rows if stud_rows else '<tr><td colspan="6" style="padding: 10px; text-align:center; color:#94a3b8;">No active students in this branch</td></tr>'}
                    </tbody>
                </table>
            </div>
            ''' if category in ["all", "students"] else ''}
        </div>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Head Office Branch Attendance Report - {period}</title>
    <style>
        @page {{ size: A4; margin: 12mm; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 24px;
        }}
        .report-wrapper {{
            max-width: 1000px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 24px 28px;
            border-radius: 12px;
            margin-bottom: 20px;
        }}
        .kpi-row {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
            margin-bottom: 20px;
        }}
        .kpi-card {{
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }}
        .kpi-num {{
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
        }}
        .kpi-lbl {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-top: 4px;
        }}
        .print-btn {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 9999px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37,99,235,0.4);
        }}
        @media print {{
            body {{ padding: 0; background: white; }}
            .print-btn {{ display: none; }}
        }}
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="report-wrapper">
        <div class="header">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
                HEAD OFFICE CONSOLIDATED AUDIT DIVISION
            </div>
            <h1 style="margin: 6px 0 2px 0; font-size: 24px;">Branch-Wise Attendance Audit Report</h1>
            <div style="font-size: 13px; color: #cbd5e1;">Reporting Period: <strong style="color:#38bdf8;">{period}</strong></div>
        </div>

        <div class="kpi-row">
            <div class="kpi-card">
                <div class="kpi-num">{data.get('total_branches', 0)}</div>
                <div class="kpi-lbl">Total Branches</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-num">{data.get('total_employees', 0)}</div>
                <div class="kpi-lbl">Total Employees</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-num">{data.get('total_students', 0)}</div>
                <div class="kpi-lbl">Total Students</div>
            </div>
        </div>

        {branches_html}

        <div style="text-align: center; font-size: 11px; color: #94a3b8; padding: 16px 0;">
            Head Office System-Generated Attendance Statement &bull; Generated on {now_ist_naive().strftime('%Y-%m-%d %H:%M IST')}
        </div>
    </div>
</body>
</html>"""

    return HTMLResponse(content=html)


@router.get("/organisations-matrix")
@router.get("/organisations/matrix")
def get_ho_organisations_matrix(
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns real-time organization-wise attendance and leave matrix for the logged-in HO:
    - Organization Name
    - Employees: Total EMP, Present, Leave, Leave Approvals, Absent
    - Students: Total Students, Present, Leave, Leave Approvals, Absent
    """
    ho_id = _get_ho_context(current_user)

    now = now_ist_naive()
    parsed_date = now.date()
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
        except ValueError:
            parsed_date = now.date()

    day_start = datetime.combine(parsed_date, datetime.min.time())
    day_end = datetime.combine(parsed_date, datetime.max.time())

    branches = db.query(GymBranch).filter(
        or_(GymBranch.ho_id == ho_id, GymBranch.owner_id == ho_id, GymBranch.owner_id == current_user.id),
        GymBranch.is_active == True
    ).order_by(GymBranch.created_at.asc()).all()

    if not branches and current_user.role in ["SUPER_ADMIN", "ADMIN"]:
        branches = db.query(GymBranch).filter(GymBranch.is_active == True).all()

    matrix_rows = []
    totals = {
        "total_emp": 0,
        "emp_present": 0,
        "emp_leave": 0,
        "emp_leave_approvals": 0,
        "emp_absent": 0,
        "total_students": 0,
        "student_present": 0,
        "student_leave": 0,
        "student_leave_approvals": 0,
        "student_absent": 0
    }

    for b in branches:
        org_display_name = b.gym_name or b.branch_name or "Organization"

        # 1. Employees in this branch
        emps = db.query(Employee).filter(
            or_(Employee.branch_id == b.id, Employee.gym_branch == b.branch_name),
            or_(func.upper(Employee.status) == "ACTIVE", Employee.status == "ACTIVE", Employee.status == "Active", Employee.status.is_(None))
        ).all()
        emp_ids = [e.id for e in emps]
        total_emp = len(emp_ids)

        emp_present_set = set()
        if emp_ids:
            # Check EmployeeAttendance records
            att_records = db.query(EmployeeAttendance.employee_id).filter(
                EmployeeAttendance.date == parsed_date,
                EmployeeAttendance.employee_id.in_(emp_ids),
                func.upper(EmployeeAttendance.status).in_(["PRESENT", "HALF_DAY", "LATE", "P"])
            ).all()
            emp_present_set.update([a[0] for a in att_records if a[0]])

            # Also check if BiometricLog has employee punch
            bio_punches = db.query(BiometricLog).filter(
                BiometricLog.timestamp >= day_start,
                BiometricLog.timestamp <= day_end,
                BiometricLog.user_role.in_(["TRAINER", "STAFF", "MANAGER", "EMPLOYEE"])
            ).all()
            for bp in bio_punches:
                m_emp_id = (bp.meta_data or {}).get("employee_id") or bp.customer_id
                if m_emp_id in emp_ids:
                    emp_present_set.add(m_emp_id)

        emp_present = len(emp_present_set)

        emp_leave = 0
        if emp_ids:
            emp_leave = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id.in_(emp_ids),
                func.upper(LeaveRequest.status) == "APPROVED",
                LeaveRequest.start_date <= parsed_date,
                LeaveRequest.end_date >= parsed_date
            ).count()

        emp_leave_approvals = 0
        if emp_ids:
            emp_leave_approvals = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id.in_(emp_ids),
                func.upper(LeaveRequest.status).in_(["PENDING", "REQUESTED"])
            ).count()

        emp_absent = max(0, total_emp - emp_present - emp_leave)

        # 2. Students in this branch
        students = db.query(Customer).filter(
            or_(Customer.branch_id == b.id, Customer.primary_gym_location.ilike(f"%{b.branch_name}%")),
            or_(func.upper(Customer.status) == "ACTIVE", Customer.status == "ACTIVE", Customer.status == "Active", Customer.status.is_(None))
        ).all()
        student_ids = [s.id for s in students]
        total_students = len(student_ids)

        student_present_set = set()
        if student_ids:
            bio_stud_punches = db.query(BiometricLog.customer_id).filter(
                BiometricLog.timestamp >= day_start,
                BiometricLog.timestamp <= day_end,
                BiometricLog.customer_id.in_(student_ids)
            ).all()
            student_present_set.update([p[0] for p in bio_stud_punches if p[0]])

        student_present = len(student_present_set)
        student_leave = 0
        student_leave_approvals = 0
        student_absent = max(0, total_students - student_present - student_leave)

        row = {
            "id": b.id,
            "org_name": org_display_name,
            "branch_name": b.branch_name,
            "city": b.city or "",
            "total_emp": total_emp,
            "emp_present": emp_present,
            "emp_leave": emp_leave,
            "emp_leave_approvals": emp_leave_approvals,
            "emp_absent": emp_absent,
            "total_students": total_students,
            "student_present": student_present,
            "student_leave": student_leave,
            "student_leave_approvals": student_leave_approvals,
            "student_absent": student_absent,
        }
        matrix_rows.append(row)

        totals["total_emp"] += total_emp
        totals["emp_present"] += emp_present
        totals["emp_leave"] += emp_leave
        totals["emp_leave_approvals"] += emp_leave_approvals
        totals["emp_absent"] += emp_absent
        totals["total_students"] += total_students
        totals["student_present"] += student_present
        totals["student_leave"] += student_leave
        totals["student_leave_approvals"] += student_leave_approvals
        totals["student_absent"] += student_absent

    return {
        "date": parsed_date.strftime("%Y-%m-%d"),
        "date_formatted": parsed_date.strftime("%A, %B %d, %Y"),
        "total_organizations": len(matrix_rows),
        "matrix": matrix_rows,
        "totals": totals
    }

