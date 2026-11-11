"""
Settings seeder for head-office-created organizations.

Ensures every organization (vahdBranch) owns a starter settings set that is
stamped tenant_id = <branch id> EXPLICITLY, so that:

  * new HO orgs are never empty on day one,
  * every org's settings tab shows its OWN rows (no cross-org leakage via the
    shared-master / NULL-tenant global fallback),
  * re-running is a no-op (idempotent, safe on the existing-branch path too).

The seeder creates the canonical HRMS rows (Department / Designation /
LeaveType) directly via db.add — it deliberately does NOT call the
settings_service / hrms_service create_* helpers, because those dedupe-match
BY NAME across all visible rows (org + global) and can mutate global rows.

All existence checks are scoped to the organization's OWN rows
(Model.tenant_id == tenant_id). A NULL-tenant (platform-global) row is never
created or touched by this module.
"""

import uuid
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from src.models.hrms import Department, Designation, LeaveType
from src.models.settings import MasterData

logger = logging.getLogger(__name__)

# ── Starter sets (overridable later in the Settings tab) ───────────────────
_SEED_DEPARTMENTS: List[Dict[str, Any]] = [
    {"name": "Administration", "code": "ADMIN", "description": "Institution administration and office operations"},
    {"name": "HR", "code": "HR", "description": "Human resources and staffing"},
    {"name": "Accounts", "code": "ACCT", "description": "Finance, payroll and accounts"},
    {"name": "Academics", "code": "ACAD", "description": "Academic / training operations"},
]

# Designations linked to a seeded Department by name.
_SEED_DESIGNATIONS: List[Dict[str, Any]] = [
    {"title": "Manager", "department": "Administration", "level": "3", "description": "Manages an area or function"},
    {"title": "Supervisor", "department": "HR", "level": "2", "description": "Supervises staff in a section"},
    {"title": "Staff", "department": "Accounts", "level": "1", "description": "General staff role"},
    {"title": "Trainer", "department": "Academics", "level": "2", "description": "Teaches / trains students"},
    {"title": "Admin", "department": "Administration", "level": "3", "description": "System / organization administrator"},
]

_SEED_LEAVE_TYPES: List[Dict[str, Any]] = [
    {
        "name": "Earned Leave", "code": "EL", "category": "Earned Leave",
        "description": "Earned annual leave with full pay.",
        "paid_type": "PAID", "is_paid": True, "annual_quota": 18.0,
        "max_consecutive_days": 30, "carry_forward_allowed": True,
        "max_carry_forward_days": 15, "encashment_allowed": False,
        "min_service_days": 90,
    },
    {
        "name": "Casual Leave", "code": "CL", "category": "Casual Leave",
        "description": "Short paid leaves for personal commitments.",
        "paid_type": "PAID", "is_paid": True, "annual_quota": 12.0,
        "max_consecutive_days": 3, "carry_forward_allowed": False,
        "max_carry_forward_days": 0, "encashment_allowed": False,
        "min_service_days": 0,
    },
    {
        "name": "Sick Leave", "code": "SL", "category": "Sick Leave",
        "description": "Paid time off for illness or medical treatment.",
        "paid_type": "PAID", "is_paid": True, "annual_quota": 10.0,
        "max_consecutive_days": 15, "carry_forward_allowed": False,
        "max_carry_forward_days": 0, "encashment_allowed": False,
        "attachment_required": True, "min_service_days": 0,
    },
    {
        "name": "Unpaid Leave", "code": "UL", "category": "Unpaid Leave",
        "description": "Leave without pay.",
        "paid_type": "UNPAID", "is_paid": False, "annual_quota": 0.0,
        "max_consecutive_days": 30, "carry_forward_allowed": False,
        "max_carry_forward_days": 0, "encashment_allowed": False,
        "min_service_days": 0,
    },
]

# MasterData mirror categories (Settings master-data view).
_MIRROR_CATEGORIES = {"departments": "departments", "designations": "designations", "leave_types": "leave_types"}


def _new_id(prefix: str) -> str:
    """Fresh, collision-free id (uuid suffix) so re-runs never collide."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _unique_code(base_code: str, used_codes: set) -> str:
    """Return base_code, or base_code with a uuid suffix if it is already used
    by this tenant's rows."""
    if base_code not in used_codes:
        return base_code
    candidate = f"{base_code}-{uuid.uuid4().hex[:4].upper()}"
    while candidate in used_codes:
        candidate = f"{base_code}-{uuid.uuid4().hex[:4].upper()}"
    return candidate


def _mirror_master_data(
    db: Session, tenant_id: str, category: str, name: str,
    code: Optional[str] = None, description: Optional[str] = None,
    parent_name: Optional[str] = None,
) -> bool:
    """Create a matching org-owned MasterData row if missing. Returns True if created."""
    existing = (
        db.query(MasterData)
        .filter(
            MasterData.tenant_id == tenant_id,
            MasterData.category == category,
            MasterData.name.ilike(name),
        )
        .first()
    )
    if existing:
        return False
    db.add(MasterData(
        id=_new_id("md"),
        tenant_id=tenant_id,
        category=category,
        name=name,
        code=code,
        description=description,
        is_active=True,
        parent_name=parent_name,
        display_order=0,
    ))
    return True


def ensure_org_settings(
    db: Session,
    tenant_id: str,
    ho_id: Optional[str] = None,
    current_user=None,
) -> Dict[str, Any]:
    """
    Idempotently seed the starter settings set OWNED by `tenant_id`
    (an organization / vahdBranch id).

    - Only creates what is missing in that org's OWN rows (tenant_id == tenant_id).
    - Never creates or touches a NULL-tenant (global) row.
    - Generates stable, collision-free ids/codes so re-runs are safe.
    - Mirrors each seeded row into a same-tenant MasterData row.

    Returns {"seeded_departments": n, "seeded_designations": n,
             "seeded_leave_types": n, "already_present": bool}.
    If tenant_id is falsy, this is a no-op returning the zero/False shape.
    """
    result = {
        "seeded_departments": 0,
        "seeded_designations": 0,
        "seeded_leave_types": 0,
        "already_present": False,
    }
    if not tenant_id:
        # No organization to seed — guard, no-op.
        return result

    # ── Departments ──────────────────────────────────────────────────────
    own_depts = (
        db.query(Department)
        .filter(Department.tenant_id == tenant_id)
        .all()
    )
    dept_names = {d.name.strip().lower() for d in own_depts if d.name}
    dept_codes = {d.code for d in own_depts if d.code}

    for spec in _SEED_DEPARTMENTS:
        name = spec["name"]
        if name.lower() in dept_names:
            continue
        code = _unique_code(spec["code"], dept_codes)
        dept = Department(
            id=_new_id("dept"),
            tenant_id=tenant_id,
            name=name,
            code=code,
            description=spec.get("description"),
            is_active=True,
        )
        db.add(dept)
        dept_codes.add(code)
        dept_names.add(name.lower())
        _mirror_master_data(db, tenant_id, "departments", name, code=code, description=spec.get("description"))
        result["seeded_departments"] += 1

    # ── Designations (linked to a seeded department by name) ─────────────
    own_desgs = (
        db.query(Designation)
        .filter(Designation.tenant_id == tenant_id)
        .all()
    )
    desg_titles = {d.title.strip().lower() for d in own_desgs if d.title}

    for spec in _SEED_DESIGNATIONS:
        title = spec["title"]
        if title.lower() in desg_titles:
            continue
        desg = Designation(
            id=_new_id("desg"),
            tenant_id=tenant_id,
            title=title,
            department=spec["department"],
            level=str(spec.get("level", "")),
            description=spec.get("description"),
        )
        db.add(desg)
        desg_titles.add(title.lower())
        _mirror_master_data(
            db, tenant_id, "designations", title,
            description=spec.get("description"), parent_name=spec["department"],
        )
        result["seeded_designations"] += 1

    # ── Leave types ──────────────────────────────────────────────────────
    own_lts = (
        db.query(LeaveType)
        .filter(LeaveType.tenant_id == tenant_id)
        .all()
    )
    lt_names = {lt.name.strip().lower() for lt in own_lts if lt.name}
    lt_codes = {lt.code for lt in own_lts if lt.code}

    for spec in _SEED_LEAVE_TYPES:
        name = spec["name"]
        if name.lower() in lt_names:
            continue
        code = _unique_code(spec["code"], lt_codes)
        lt = LeaveType(
            id=_new_id("lt"),
            tenant_id=tenant_id,
            name=name,
            code=code,
            category=spec.get("category"),
            description=spec.get("description"),
            paid_type=spec["paid_type"],
            is_paid=spec.get("is_paid", spec["paid_type"] == "PAID"),
            gender_eligibility=["MALE", "FEMALE", "OTHER"],
            employment_types=["FULL_TIME", "PERMANENT", "PROBATION", "CONTRACTUAL"],
            applicable_departments=["ALL"],
            applicable_designations=["ALL"],
            min_service_days=spec.get("min_service_days", 0),
            annual_quota=spec.get("annual_quota", 0.0),
            max_consecutive_days=spec.get("max_consecutive_days"),
            carry_forward_allowed=spec.get("carry_forward_allowed", False),
            max_carry_forward_days=spec.get("max_carry_forward_days", 0),
            encashment_allowed=spec.get("encashment_allowed", False),
            max_encashment_days=spec.get("max_encashment_days", 0),
            attachment_required=spec.get("attachment_required", False),
            is_active=True,
        )
        db.add(lt)
        lt_codes.add(code)
        lt_names.add(name.lower())
        _mirror_master_data(db, tenant_id, "leave_types", name, code=code, description=spec.get("description"))
        result["seeded_leave_types"] += 1

    anything_seeded = (
        result["seeded_departments"] + result["seeded_designations"] + result["seeded_leave_types"]
    ) > 0

    if not anything_seeded:
        result["already_present"] = True

    db.commit()
    if anything_seeded:
        logger.info(
            "Seeded starter settings for org %s: %d departments, %d designations, %d leave types",
            tenant_id,
            result["seeded_departments"],
            result["seeded_designations"],
            result["seeded_leave_types"],
        )
    return result
