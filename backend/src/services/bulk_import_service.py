"""
Bulk Excel/CSV import service — students & employees.
=====================================================
Why this exists: the old import path fired one HTTP request (and ~10-15 SQL
round-trips, a bcrypt hash, an SMTP attempt and a cross-table sync) PER ROW,
sequentially. Even 20 rows took minutes.

This service imports the whole file in ONE request:
  * all lookups (users, branches, students, profiles, master data) are
    preloaded once and used as in-memory maps  -> no N+1
  * work is chunked into commit batches of BATCH_SIZE (default 2000) rows
  * generated credential passwords are bcrypt-hashed in PARALLEL per chunk
    (bcrypt releases the GIL) and stamped before the chunk commits
  * enrollment SMTP emails are skipped entirely in bulk mode (credentials
    still exist in the users table; a welcome email is not required)
  * per-row cross-table employee syncs are skipped; ONE forced sync runs at
    the very end of an employee import
  * files larger than INLINE_LIMIT run in a background thread; the caller
    polls get_import_job(job_id) for progress
"""
import os
import re
import secrets
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple

import bcrypt
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from src.database.session import SessionLocal
from src.models.user import User
from src.models.student import student
from src.models.employee import employeeProfile
from src.models.hrms import Employee, Department, Designation
from src.models.settings import Branch as vahdBranch, MasterData
from src.models.plan import MembershipPlan
from src.models.membership import Membership
from src.utils.email import generate_enrollment_password
from src.utils.timezone import now_ist_naive

BATCH_SIZE = int(os.getenv("BULK_IMPORT_BATCH_SIZE", "2000"))
INLINE_LIMIT = int(os.getenv("BULK_IMPORT_INLINE_LIMIT", "2000"))
MAX_ROWS = int(os.getenv("BULK_IMPORT_MAX_ROWS", "50000"))
BCRYPT_ROUNDS = int(os.getenv("BULK_IMPORT_BCRYPT_ROUNDS", "10"))
MAX_WORKERS = int(os.getenv("BULK_IMPORT_MAX_WORKERS", "8"))
STUDENT_CODE_PREFIX = os.getenv("BULK_IMPORT_STUDENT_CODE_PREFIX", "stu")
EMPLOYEE_CODE_PREFIX = os.getenv("BULK_IMPORT_EMPLOYEE_CODE_PREFIX", "EMP-")
DESIGNATION_PREFIX = os.getenv("BULK_IMPORT_DESIGNATION_PREFIX", "DES-")
DEFAULT_DEPARTMENT = os.getenv("BULK_IMPORT_DEFAULT_DEPARTMENT", "")
DEFAULT_EMPLOYMENT_TYPE = os.getenv("BULK_IMPORT_DEFAULT_EMPLOYMENT_TYPE", "")

_JOBS: Dict[str, Dict[str, Any]] = {}
_JOBS_LOCK = threading.Lock()


# ---------------------------------------------------------------------------
# job registry (for background imports)
# ---------------------------------------------------------------------------
def _new_job(job_type: str, total: int) -> Dict[str, Any]:
    job: Dict[str, Any] = {
        "job_id": f"job_{uuid.uuid4().hex[:10]}",
        "type": job_type,
        "status": "running",
        "total": total,
        "done": 0,
        "created": 0,
        "updated": 0,
        "failed": 0,
        "message": "",
        "last_error": "",
        "row_errors": [],
        "started_at": datetime.utcnow().isoformat(),
    }
    with _JOBS_LOCK:
        _JOBS[job["job_id"]] = job
        if len(_JOBS) > 60:
            oldest = sorted(_JOBS, key=lambda k: _JOBS[k].get("started_at") or "")
            for k in oldest[: len(_JOBS) - 60]:
                _JOBS.pop(k, None)
    return job


def get_import_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _JOBS_LOCK:
        j = _JOBS.get(job_id)
        return dict(j) if j else None


def _parallel_hash_passwords(passwords: List[str]) -> List[str]:
    """bcrypt releases the GIL -> hash generated credentials in parallel."""
    if not passwords:
        return []

    def one(pw: str) -> str:
        salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
        val = str(pw).strip() if pw else ""
        if not val:
            val = secrets.token_urlsafe(12)
        return bcrypt.hashpw(val.encode("utf-8")[:72], salt).decode("utf-8")

    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, max(1, len(passwords)))) as pool:
        return list(pool.map(one, passwords))


# ---------------------------------------------------------------------------
# batched branch resolution (tenant-aware and isolation-enforced)
# ---------------------------------------------------------------------------
def _branch_maps(db: Session, current_user: Optional[User] = None) -> Dict[str, Any]:
    branches = db.query(vahdBranch).all()
    by_id: Dict[str, vahdBranch] = {}
    by_vahd_name: Dict[str, vahdBranch] = {}
    by_branch_name: Dict[str, vahdBranch] = {}
    owner_first: Dict[str, vahdBranch] = {}

    user_role = (getattr(current_user, "role", "") or "").upper() if current_user else ""
    user_id = getattr(current_user, "id", None)
    user_ho_id = getattr(current_user, "ho_id", None) or user_id
    user_branch_id = getattr(current_user, "branch_id", None)

    for b in branches:
        if b.id:
            by_id[b.id] = b
        if b.vahd_name:
            by_vahd_name[b.vahd_name.strip().lower()] = b
        if b.branch_name:
            by_branch_name[b.branch_name.strip().lower()] = b
        if b.owner_id and b.owner_id not in owner_first:
            owner_first[b.owner_id] = b

    return {
        "db": db,
        "by_id": by_id,
        "by_vahd_name": by_vahd_name,
        "by_branch_name": by_branch_name,
        "owner_first": owner_first,
        "user_role": user_role,
        "user_id": user_id,
        "user_ho_id": user_ho_id,
        "user_branch_id": user_branch_id,
        "memo": {},
    }


def _resolve_branch(row: Dict[str, Any], m: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str], str, str]:
    """Mirror create_student / create_employee branch priority, map-backed with strict tenant isolation.

    Returns (branch_id, ho_id, owner_id, org_name, branch_name).
    Never silently falls back to an arbitrary active branch from another tenant when an explicit location is provided.
    """
    explicit = str(
        row.get("branch_id")
        or row.get("branch")
        or row.get("Branch / Campus Location")
        or row.get("branch_campus_location")
        or row.get("branch_location")
        or row.get("campus_location")
        or row.get("location")
        or row.get("campus")
        or row.get("primary_vahd_location")
        or row.get("branch_name")
        or ""
    ).strip()
    owner_hint = row.get("owner_id")
    row_ho = row.get("ho_id") or m.get("user_ho_id")

    b: Optional[vahdBranch] = None
    if explicit:
        b = m["by_id"].get(explicit)
        if b is None:
            b = m["by_vahd_name"].get(explicit.lower())
        if b is None:
            b = m["by_branch_name"].get(explicit.lower())
        if b is None:
            # Composite branch string check: e.g. "klu - bng", "klu-bng", "klu / bng", "klu · bng"
            delims = [" - ", "-", "·", "/", "•", "|", ","]
            for d in delims:
                if d in explicit:
                    parts = [p.strip().lower() for p in explicit.split(d) if p.strip()]
                    if len(parts) >= 2:
                        p1, p2 = parts[0], parts[1]
                        for candidate in m["by_id"].values():
                            c_v = (candidate.vahd_name or "").strip().lower()
                            c_b = (candidate.branch_name or "").strip().lower()
                            if (c_v == p1 and c_b == p2) or (c_v == p2 and c_b == p1):
                                b = candidate
                                break
                    if b is not None:
                        break
        if b is None:
            key = f"{owner_hint}:{explicit}"
            if key in m["memo"]:
                return m["memo"][key]
            hit = m["db"].query(vahdBranch).filter(
                or_(
                    vahdBranch.id == explicit,
                    func.lower(vahdBranch.vahd_name) == explicit.lower(),
                    func.lower(vahdBranch.branch_name) == explicit.lower(),
                )
            ).first()
            if hit:
                b = hit
                m["memo"][key] = (hit.id, hit.ho_id, hit.owner_id, hit.vahd_name or "", hit.branch_name or "")

        if b is None:
            # Explicit location given but could not be resolved — DO NOT fall back to uploader's home branch
            raise ValueError(f"Branch / Location '{explicit}' could not be resolved to a valid organization in database")

    # Fallback only when NO explicit branch was given in row
    if b is None and m.get("user_branch_id"):
        b = m["by_id"].get(m["user_branch_id"])

    if b is None and owner_hint:
        b = m["owner_first"].get(owner_hint)

    # Multi-tenant isolation verification: ensure current_user has right to write to resolved branch
    if b and m.get("user_role") not in ["SUPER_ADMIN", "ADMIN"]:
        if m.get("user_role") == "OWNER":
            if b.owner_id and b.owner_id != m.get("user_id") and b.id != m.get("user_branch_id"):
                raise ValueError(f"Cross-tenant access denied: cannot import into branch '{b.branch_name or b.id}'")
        elif m.get("user_role") in ["HEAD_OFFICE", "HO"]:
            if b.ho_id and b.ho_id != m.get("user_ho_id") and b.ho_id != m.get("user_id"):
                raise ValueError(f"Cross-tenant access denied: branch '{b.branch_name or b.id}' does not belong to your Head Office")
        else:
            # Any other role (MANAGER, STAFF, EMPLOYEE): strictly restricted to their assigned branch
            if not m.get("user_branch_id") or b.id != m.get("user_branch_id"):
                raise ValueError(f"Cross-tenant access denied: role '{m.get('user_role')}' cannot import into branch '{b.branch_name or b.id}'")

    if b:
        return (b.id, b.ho_id, b.owner_id, b.vahd_name or "", b.branch_name or "")

    # Strict multi-tenant safety: do NOT fall back to an active branch from another tenant
    return (None, row_ho, owner_hint, "", "")


# ---------------------------------------------------------------------------
# master-data / department validation across a whole file (pre-load existing)
# ---------------------------------------------------------------------------
def _load_master_validation_sets(db: Session, tenant_ids: Optional[List[str]] = None) -> Dict[str, Set[str]]:
    """Loads existing master-data from database so bulk imports only accept
    valid, pre-configured values. Nothing is auto-created or appended into the DB.

    `tenant_ids` is the request's tenant scope (a LIST of branch ids, e.g. the
    expanded org + its HO branches). Rows are valid when their tenant_id is in
    that set OR is NULL (global/legacy rows stay valid). When None (super-admin
    unscoped) no tenant filter is applied — validate against everything."""
    dept_query = db.query(Department.name, Department.code).filter(Department.is_active != False)
    desg_query = db.query(Designation.title)
    md_query = db.query(MasterData.category, MasterData.name, MasterData.code, MasterData.extra_info).filter(MasterData.is_active != False)
    course_query = db.query(MembershipPlan.name, MembershipPlan.category, MembershipPlan.badge).filter(MembershipPlan.is_active != False)

    if tenant_ids:
        dept_query = dept_query.filter(or_(Department.tenant_id.in_(tenant_ids), Department.tenant_id.is_(None)))
        desg_query = desg_query.filter(or_(Designation.tenant_id.in_(tenant_ids), Designation.tenant_id.is_(None)))
        md_query = md_query.filter(or_(MasterData.tenant_id.in_(tenant_ids), MasterData.tenant_id.is_(None)))
        course_query = course_query.filter(or_(MembershipPlan.tenant_id.in_(tenant_ids), MembershipPlan.tenant_id.is_(None)))

    valid_depts: Set[str] = set()
    for row in dept_query.all():
        if row[0]:
            valid_depts.add(row[0].strip().lower())
        if len(row) > 1 and row[1]:
            valid_depts.add(row[1].strip().lower())

    valid_desgs = {d[0].strip().lower() for d in desg_query.all() if d[0]}

    valid_courses: Set[str] = set()
    for row in course_query.all():
        if row[0]:
            valid_courses.add(row[0].strip().lower())
        if len(row) > 1 and row[1]:
            valid_courses.add(row[1].strip().lower())
        if len(row) > 2 and row[2]:
            valid_courses.add(row[2].strip().lower())

    try:
        from src.models.course import Course, CourseLanguage
        c_query = db.query(Course.name, Course.code, Course.category, Course.badge).filter(Course.is_active != False)
        if tenant_ids:
            c_query = c_query.filter(or_(Course.tenant_id.in_(tenant_ids), Course.tenant_id.is_(None)))
        for cn, cc, ccat, cbadge in c_query.all():
            if cn:
                valid_courses.add(cn.strip().lower())
            if cc:
                valid_courses.add(cc.strip().lower())
            if ccat:
                valid_courses.add(ccat.strip().lower())
            if cbadge:
                valid_courses.add(cbadge.strip().lower())
        
        med_query = db.query(CourseLanguage.name).filter(CourseLanguage.is_active != False)
        if tenant_ids:
            med_query = med_query.filter(or_(CourseLanguage.tenant_id.in_(tenant_ids), CourseLanguage.tenant_id.is_(None)))
        valid_mediums = {m[0].strip().lower() for m in med_query.all() if m[0]}
    except Exception:
        valid_mediums = set()

    valid_emp_roles = {"STAFF", "FACULTY", "TRAINER", "EMPLOYEE", "ADMIN", "MANAGER", "INSTRUCTOR", "TEACHER", "COORDINATOR", "OFFICE_STAFF"}
    valid_stu_roles = {"STUDENT", "MEMBER"}
    valid_qualifications: Set[str] = set()
    valid_specializations: Set[str] = set()

    for cat, name, code, extra_info in md_query.all():
        if cat == "departments":
            if name:
                valid_depts.add(name.strip().lower())
            if code:
                valid_depts.add(code.strip().lower())
        elif cat == "designations":
            if name:
                valid_desgs.add(name.strip().lower())
            if code:
                valid_desgs.add(code.strip().lower())
        elif cat in ("courses", "plans"):
            if name:
                valid_courses.add(name.strip().lower())
            if code:
                valid_courses.add(code.strip().lower())
        elif cat == "roles":
            r_type = (extra_info or "").strip().lower()
            if name:
                u_name = name.strip().upper()
                if r_type in ("student", "both", ""):
                    valid_stu_roles.add(u_name)
                if r_type in ("employee", "both", ""):
                    valid_emp_roles.add(u_name)
            if code:
                u_code = code.strip().upper()
                if r_type in ("student", "both", ""):
                    valid_stu_roles.add(u_code)
                if r_type in ("employee", "both", ""):
                    valid_emp_roles.add(u_code)
        elif cat in ("qualifications", "qualification"):
            if name:
                valid_qualifications.add(name.strip().lower())
            if code:
                valid_qualifications.add(code.strip().lower())
        elif cat in ("specializations", "specialization"):
            if name:
                valid_specializations.add(name.strip().lower())
            if code:
                valid_specializations.add(code.strip().lower())
        elif cat in ("languages", "mediums"):
            if name:
                valid_mediums.add(name.strip().lower())
            if code:
                valid_mediums.add(code.strip().lower())

    return {
        "departments": valid_depts,
        "designations": valid_desgs,
        "roles": valid_emp_roles,
        "student_roles": valid_stu_roles,
        "courses": valid_courses,
        "mediums": valid_mediums,
        "qualifications": valid_qualifications,
        "specializations": valid_specializations,
    }


# ---------------------------------------------------------------------------
# STUdENT bulk import
# ---------------------------------------------------------------------------
def _run_students_import(db: Session, rows: List[Dict[str, Any]], job: Dict[str, Any], current_user: Optional[User] = None) -> Dict[str, Any]:
    total = len(rows)
    job["total"] = total

    users_by_email = {u.email.strip().lower(): u for u in db.query(User).all() if u.email}
    students_by_user = {s.user_id: s for s in db.query(student).all() if s.user_id}
    branches = _branch_maps(db, current_user=current_user)

    ALLOWED_STUDENT_STATUSES = {"ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "SUSPENDED"}
    ALLOWED_STUDENT_ROLES = {"STUDENT", "MEMBER"}

    # Validate against the request's full tenant scope (org + HO branches +
    # global rows). Lazy import: get_tenant_scope lives in the DB layer.
    try:
        from src.database.tenant_session import get_tenant_scope
        _tids = get_tenant_scope() or (
            [branches.get("user_branch_id")] if branches.get("user_branch_id") else None
        )
    except Exception:
        _tids = [branches.get("user_branch_id")] if branches.get("user_branch_id") else None
    masters = _load_master_validation_sets(db, tenant_ids=_tids)
    valid_departments = masters["departments"]
    valid_courses = masters["courses"]
    valid_mediums = masters.get("mediums", set())
    valid_student_roles = masters.get("student_roles", {"STUDENT", "MEMBER"}) | {"STUDENT", "MEMBER"}
    valid_qualifications = masters.get("qualifications", set())
    valid_specializations = masters.get("specializations", set())

    # highest existing stu-sequence, scanned ONCE
    max_num = 0
    taken = set()
    for s_code, s_meta, _s_id in db.query(student.member_code, student.meta_data, student.id).all():
        cands = []
        if s_code:
            cands.append(str(s_code).strip())
            taken.add(str(s_code).strip().lower())
        if isinstance(s_meta, dict):
            for k in ("roll_number", "student_number", "roll_no", "code", "admission_number"):
                v = s_meta.get(k)
                if v:
                    cands.append(str(v).strip())
                    taken.add(str(v).strip().lower())
        for c in cands:
            mm = re.match(rf"^(?:{re.escape(STUDENT_CODE_PREFIX)}|stu)?(\d+)$", c, re.IGNORECASE)
            if mm:
                n = int(mm.group(1))
                if n > max_num:
                    max_num = n
    next_seq = max_num + 1

    # pre-assign sequential codes in-memory (no per-row full-table scans)
    codes: List[str] = []
    for row in rows:
        req = str(row.get("roll_no") or row.get("member_code") or row.get("code") or "").strip()
        mm = re.match(rf"^(?:{re.escape(STUDENT_CODE_PREFIX)}|stu)?(\d+)$", req, re.IGNORECASE) if req else None
        if mm:
            norm = f"{STUDENT_CODE_PREFIX}{int(mm.group(1)):04d}"
            if norm not in taken:
                codes.append(norm)
                taken.add(norm.lower())
                continue
        c = f"{STUDENT_CODE_PREFIX}{next_seq:04d}"
        next_seq += 1
        codes.append(c)
        taken.add(c.lower())

    # chunked commit with parallel password hashing; per-row SAVEPOINTs so a
    # single bad row (FK / unique violation) rolls back ONLY that row instead
    # of the whole 2000-row batch.
    chunk: List[User] = []              # users whose hash is pending
    chunk_hashes: List[str] = []
    for i, row in enumerate(rows):
        sp = None
        mark = len(chunk)
        new_user_email: Optional[str] = None
        new_stu_user_id: Optional[str] = None
        row_created = False
        row_updated = False
        try:
            sp = db.begin_nested()
            # Normalize headers stripping trailing asterisks and whitespace
            clean_row: Dict[str, Any] = {}
            for k, v in row.items():
                clean_k = re.sub(r"\s*\*+\s*$", "", str(k)).strip()
                clean_row[clean_k] = v
                clean_row[re.sub(r"[^a-zA-Z0-9]+", "_", clean_k.lower()).strip("_")] = v

            full_name = str(clean_row.get("full_name") or clean_row.get("name") or "").strip()
            email = str(clean_row.get("email") or clean_row.get("personal_email") or "").strip().lower()
            phone = str(clean_row.get("phone") or clean_row.get("contact_number_mobile") or clean_row.get("mobile") or "").strip()
            meta = clean_row.get("meta_data") if isinstance(clean_row.get("meta_data"), dict) else {}
            course_val = str(clean_row.get("course") or clean_row.get("program") or clean_row.get("course_program") or clean_row.get("Course / Program") or clean_row.get("membership_plan") or meta.get("course") or "").strip()

            missing_fields: List[str] = []
            if not full_name:
                missing_fields.append("Full Name")
            if not email and not phone:
                missing_fields.append("Email or Phone")
            if not course_val:
                missing_fields.append("Course / Program")

            if missing_fields:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    row_identifier = full_name or email or phone or f"Row {i + 1}"
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": row_identifier,
                        "error": f"Missing required field(s): {', '.join(missing_fields)}"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # Resolve branch scoped to this row first
            try:
                branch_id, ho_id, owner_id, org_name, branch_name = _resolve_branch(clean_row, branches)
            except ValueError as b_err:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": str(b_err)
                    })
                if sp is not None:
                    sp.commit()
                continue

            masters = get_masters(branch_id)
            valid_departments = masters["departments"]
            valid_courses = masters["courses"]
            valid_mediums = masters.get("mediums", set())
            valid_student_roles = masters.get("student_roles", {"STUDENT", "MEMBER"}) | {"STUDENT", "MEMBER"}
            valid_qualifications = masters.get("qualifications", set())
            valid_specializations = masters.get("specializations", set())

            # Master-data database existence checks:
            # 1. Course must exist in DB for this branch
            if not valid_courses or course_val.lower() not in valid_courses:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Course / Program '{course_val}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 2. Department must exist in DB (if specified)
            dept = str(clean_row.get("department") or clean_row.get("dept") or meta.get("department") or "").strip()
            if dept and (not valid_departments or dept.lower() not in valid_departments):
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Department '{dept}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 3. Medium must exist in DB (if specified)
            medium_val = str(clean_row.get("medium") or meta.get("medium") or "").strip()
            if medium_val and (not valid_mediums or medium_val.lower() not in valid_mediums):
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Medium of Instruction '{medium_val}' not found in database (please add it in Course & Medium Settings first)"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 4. Role check for student
            raw_stu_role = str(clean_row.get("role") or "").strip().upper()
            if raw_stu_role and raw_stu_role not in valid_student_roles:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Role '{raw_stu_role}' is not configured as a student role in database (please configure it in Settings first)"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 5. Qualification check (if specified and qualifications configured in DB)
            qual = str(clean_row.get("qualification") or meta.get("qualification") or "").strip()
            if qual and valid_qualifications and qual.lower() not in valid_qualifications:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Qualification '{qual}' not found in database (please configure it in Settings first)"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 6. Specialization check (if specified and specializations configured in DB)
            spec = str(clean_row.get("specialization") or meta.get("specialization") or "").strip()
            if spec and valid_specializations and spec.lower() not in valid_specializations:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": f"Specialization '{spec}' not found in database (please configure it in Settings first)"
                    })
                if sp is not None:
                    sp.commit()
                continue

            if not email:
                clean_phone = re.sub(r"[^\d]", "", phone)
                if clean_phone and len(clean_phone) >= 7:
                    email = f"{clean_phone}@student.portal"
                else:
                    clean_name = re.sub(r"[^a-zA-Z0-9]", "", full_name).lower()
                    email = f"{clean_name}{i + 1}@student.portal"

            display_location = (
                f"{org_name} - {branch_name}"
                if org_name and branch_name and org_name.lower() != branch_name.lower()
                else (org_name or branch_name or "")
            )
            if dept:
                meta["department"] = dept
            meta["roll_number"] = codes[i]
            meta["student_number"] = codes[i]
            meta["code"] = codes[i]

            raw_stu_role = str(clean_row.get("role") or "STUDENT").strip().upper()
            student_role = raw_stu_role if raw_stu_role in ALLOWED_STUDENT_ROLES else "STUDENT"

            user = users_by_email.get(email)
            password = generate_enrollment_password(full_name, phone)
            if user is None:
                user = User(
                    id=f"usr_{uuid.uuid4().hex[:8]}",
                    email=email,
                    password_hash="",   # filled by the parallel hash pass before commit
                    full_name=full_name,
                    role=student_role,
                    phone=phone,
                    owner_id=owner_id,
                    branch_id=branch_id,
                    ho_id=ho_id,
                )
                db.add(user)
                db.flush()               # ensure user row exists (student FK)
                users_by_email[email] = user
                new_user_email = email
                chunk.append(user)
                chunk_hashes.append(password)
            else:
                user.full_name = full_name
                user.phone = phone
                user.role = student_role
                if owner_id:
                    user.owner_id = owner_id
                if branch_id:
                    user.branch_id = branch_id
                if ho_id:
                    user.ho_id = ho_id
                chunk.append(user)
                chunk_hashes.append(password)

            existing_stu = students_by_user.get(user.id)
            parent_phone = str(clean_row.get("parent_phone") or clean_row.get("parent_mobile") or meta.get("parent_phone") or meta.get("parent_mobile") or "")
            gender = str(clean_row.get("gender") or meta.get("gender") or "").strip()
            qual = str(clean_row.get("qualification") or meta.get("qualification") or "").strip()
            spec = str(clean_row.get("specialization") or meta.get("specialization") or "").strip()

            if existing_stu:
                c = existing_stu
                c.full_name = full_name
                c.email = email
                c.phone = phone
                if not c.member_code or str(c.member_code).startswith("cust_"):
                    c.member_code = codes[i]
                if parent_phone:
                    c.parent_phone = parent_phone
                if gender:
                    c.gender = gender
                if clean_row.get("status"):
                    raw_stu_status = str(clean_row.get("status")).strip().upper()
                    if raw_stu_status in ALLOWED_STUDENT_STATUSES:
                        c.status = raw_stu_status
                if clean_row.get("profile_image"):
                    c.profile_image = clean_row.get("profile_image")
                if qual:
                    c.qualification = qual
                if spec:
                    c.specialization = spec
                c.meta_data = meta
                c.primary_vahd_location = display_location or org_name or branch_name or c.primary_vahd_location
                if branch_id:
                    c.branch_id = branch_id
                    c.tenant_id = branch_id
                if owner_id:
                    c.owner_id = owner_id
                if ho_id:
                    c.ho_id = ho_id
                row_updated = True
            else:
                c = student(
                    id=f"cust_{uuid.uuid4().hex[:8]}",
                    member_code=codes[i],
                    user_id=user.id,
                    full_name=full_name,
                    email=email,
                    phone=phone,
                    parent_phone=parent_phone or None,
                    gender=gender or None,
                    qualification=qual or None,
                    specialization=spec or None,
                    meta_data=meta,
                    owner_id=owner_id,
                    branch_id=branch_id,
                    tenant_id=branch_id,
                    ho_id=ho_id,
                    primary_vahd_location=display_location or org_name or branch_name or None,
                    status=str(clean_row.get("status") or "ACTIVE").strip().upper() if str(clean_row.get("status") or "").strip().upper() in ALLOWED_STUDENT_STATUSES else "ACTIVE",
                )
                db.add(c)
                students_by_user[user.id] = c
                new_stu_user_id = user.id
                row_created = True

            # Insert / update active Membership in public.memberships
            if course_val:
                mem_exists = db.query(Membership).filter(
                    Membership.student_id == c.id,
                    func.lower(Membership.plan_name) == course_val.lower()
                ).first()
                if not mem_exists:
                    mem_id = f"mem_{uuid.uuid4().hex[:8]}"
                    new_mem = Membership(
                        id=mem_id,
                        tenant_id=branch_id,
                        customer_id=c.id,
                        student_id=c.id,
                        plan_name=course_val,
                        plan_type="ANNUAL",
                        status="ACTIVE",
                        start_date=now_ist_naive(),
                        expiry_date=now_ist_naive() + timedelta(days=365),
                        price=0.0,
                        paid_amount=0.0,
                        due_amount=0.0,
                        payment_method="System / Bulk Enrollment",
                        invoice_number=f"INV-BULK-{mem_id[-6:].upper()}"
                    )
                    db.add(new_mem)

            job["done"] = i + 1
            sp.commit()  # persist this row only; batch commit happens below
            if row_created:
                job["created"] += 1
            elif row_updated:
                job["updated"] += 1

            # chunk commit: stamp parallel hashes, then one commit
            if (i + 1) % BATCH_SIZE == 0 or i == total - 1:
                if chunk:
                    hashes = _parallel_hash_passwords(chunk_hashes)
                    for u_, h_ in zip(chunk, hashes):
                        u_.password_hash = h_
                    db.commit()
                    chunk = []
                    chunk_hashes = []
                    job["message"] = f"{job['done']}/{total} rows committed"

        except Exception as exc:
            # Roll back ONLY this row (savepoint) so the rest of the batch
            # stays intact; also revert the in-memory map/chunk entries this
            # row added, so later rows/counts remain consistent.
            try:
                if sp is not None:
                    sp.rollback()
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass
            if new_user_email is not None:
                users_by_email.pop(new_user_email, None)
            if new_stu_user_id is not None:
                students_by_user.pop(new_stu_user_id, None)
            if len(chunk) > mark:
                del chunk[mark:]
                del chunk_hashes[mark:]
            # job["created"/"updated"] are row-level and only bump AFTER
            # sp.commit(), so a failed row never made it into them —
            # nothing to decrement here.
            job["failed"] += 1
            err_msg = f"{type(exc).__name__}: {str(exc)[:200]}"
            job["last_error"] = f"Row {i + 1} ({full_name or 'Unknown'}): {err_msg}"
            job["message"] = job["last_error"]
            if len(job.setdefault("row_errors", [])) < 100:
                job["row_errors"].append({
                    "row": i + 1,
                    "name": full_name or email or f"Row {i + 1}",
                    "error": err_msg
                })

    job["status"] = "done"
    job["finished_at"] = datetime.utcnow().isoformat()
    job["message"] = f"Imported {job['created']} new, updated {job['updated']}, failed {job['failed']}"
    return job


# ---------------------------------------------------------------------------
# EMPLOYEE bulk import
# ---------------------------------------------------------------------------
def _run_employees_import(db: Session, rows: List[Dict[str, Any]], job: Dict[str, Any], current_user: Optional[User] = None) -> Dict[str, Any]:
    total = len(rows)
    job["total"] = total

    users_by_email = {u.email.strip().lower(): u for u in db.query(User).all() if u.email}
    profiles_by_email = {p.email.strip().lower(): p for p in db.query(employeeProfile).all() if p.email}
    # The real identity link is user_id — employee_profiles.user_id is UNIQUE,
    # so matching profiles by email alone is what caused the production
    # "duplicate key violates employee_profiles_user_id_key" failure.
    profiles_by_user = {p.user_id: p for p in db.query(employeeProfile).all() if p.user_id}
    emps_by_email = {e.email.strip().lower(): e for e in db.query(Employee).all() if e.email}
    emps_by_user = {e.user_id: e for e in db.query(Employee).all() if e.user_id}
    branches = _branch_maps(db, current_user=current_user)

    # Validate against the request's full tenant scope (org + HO branches +
    # global rows). Lazy import: get_tenant_scope lives in the DB layer.
    try:
        from src.database.tenant_session import get_tenant_scope
        _tids = get_tenant_scope() or (
            [branches.get("user_branch_id")] if branches.get("user_branch_id") else None
        )
    except Exception:
        _tids = [branches.get("user_branch_id")] if branches.get("user_branch_id") else None
    masters = _load_master_validation_sets(db, tenant_ids=_tids)
    valid_departments = masters["departments"]
    valid_designations = masters["designations"]
    valid_roles = masters["roles"]
    valid_qualifications = masters.get("qualifications", set())
    valid_specializations = masters.get("specializations", set())

    # highest existing emp-sequence, scanned ONCE
    max_emp_num = 0
    taken_emp_codes: set = set()
    for (e_code,) in db.query(Employee.code).all():
        if e_code:
            clean_e = str(e_code).strip()
            taken_emp_codes.add(clean_e.lower())
            mm = re.search(r"(\d+)", clean_e)
            if mm:
                n = int(mm.group(1))
                if n > max_emp_num:
                    max_emp_num = n
    next_emp_seq = max_emp_num + 1

    # Pre-assign sequential codes in-memory (no per-row full-table scans)
    assigned_emp_codes: List[str] = []
    for row in rows:
        req = str(row.get("code") or row.get("employee_code") or row.get("emp_no") or row.get("emp_code") or "").strip()
        if req and req.lower() not in taken_emp_codes:
            assigned_emp_codes.append(req)
            taken_emp_codes.add(req.lower())
        else:
            c = f"{EMPLOYEE_CODE_PREFIX}{next_emp_seq:04d}"
            while c.lower() in taken_emp_codes:
                next_emp_seq += 1
                c = f"{EMPLOYEE_CODE_PREFIX}{next_emp_seq:04d}"
            next_emp_seq += 1
            assigned_emp_codes.append(c)
            taken_emp_codes.add(c.lower())

    # per-run set of codes already seen for this file, so synthesized codes
    # stay distinct within the same tenant (avoids the uq(tenant_id, code)
    # collision)
    _EMP_CODES_SEEN: set = set()

    chunk: List[User] = []
    chunk_hashes: List[str] = []

    ALLOWED_EMPLOYEE_ROLES = {"STAFF", "FACULTY", "TRAINER", "EMPLOYEE", "ADMIN", "MANAGER"}
    ALLOWED_EMPLOYEE_STATUSES = {"Active", "Inactive", "On Leave", "Terminated", "Probation"}
    uploader_role = (getattr(current_user, "role", "") or "").upper() if current_user else ""

    for i, row in enumerate(rows):
        sp = None
        mark = len(chunk)
        new_user_email: Optional[str] = None
        new_profile_email: Optional[str] = None
        new_emp_email: Optional[str] = None
        row_created = 0
        row_updated = 0
        try:
            sp = db.begin_nested()
            # Normalize headers stripping trailing asterisks and whitespace
            clean_row: Dict[str, Any] = {}
            for k, v in row.items():
                clean_k = re.sub(r"\s*\*+\s*$", "", str(k)).strip()
                clean_row[clean_k] = v
                clean_row[re.sub(r"[^a-zA-Z0-9]+", "_", clean_k.lower()).strip("_")] = v

            first_name = str(clean_row.get("first_name") or "").strip()
            last_name = str(clean_row.get("last_name") or "").strip()
            full_name = str(clean_row.get("full_name") or clean_row.get("name") or f"{first_name} {last_name}").strip()
            email = str(clean_row.get("email") or clean_row.get("personal_email") or "").strip().lower()
            phone = str(clean_row.get("phone") or clean_row.get("contact_number_mobile") or clean_row.get("mobile") or "").strip()

            meta_in = clean_row.get("meta_data") if isinstance(clean_row.get("meta_data"), dict) else {}
            designation = str(clean_row.get("designation") or (meta_in or {}).get("designation") or (meta_in or {}).get("post_details", {}).get("designation") or "").strip()
            department = str(clean_row.get("department") or (meta_in or {}).get("department") or (meta_in or {}).get("post_details", {}).get("department") or "").strip()
            raw_role = str(clean_row.get("role") or clean_row.get("role_staff_faculty_trainer_manager_admin") or (meta_in or {}).get("role") or "").strip().upper()

            missing_fields: List[str] = []
            if not full_name:
                missing_fields.append("Full Name")
            if not email and not phone:
                missing_fields.append("Email or Phone")
            if not designation:
                missing_fields.append("Designation")
            if not department:
                missing_fields.append("Department")

            if missing_fields:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    row_identifier = full_name or email or phone or f"Row {i + 1}"
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": row_identifier,
                        "error": f"Missing required field(s): {', '.join(missing_fields)}"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # Resolve branch scoped to this row first
            try:
                branch_id, ho_id, owner_id, org_name, branch_name = _resolve_branch(clean_row, branches)
            except ValueError as b_err:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or email or f"Row {i + 1}",
                        "error": str(b_err)
                    })
                if sp is not None:
                    sp.commit()
                continue

            masters = get_masters(branch_id)
            valid_departments = masters["departments"]
            valid_designations = masters["designations"]
            valid_roles = masters["roles"]
            valid_qualifications = masters.get("qualifications", set())
            valid_specializations = masters.get("specializations", set())

            # Master-data database existence checks:
            # 1. Designation must exist in DB for this branch
            if not valid_designations or designation.lower() not in valid_designations:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or f"Row {i + 1}",
                        "error": f"Designation '{designation}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 2. Department must exist in DB for this branch
            if not valid_departments or department.lower() not in valid_departments:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or f"Row {i + 1}",
                        "error": f"Department '{department}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 3. Role must be configured in DB
            if raw_role and raw_role not in valid_roles:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or f"Row {i + 1}",
                        "error": f"Role '{raw_role}' is not configured in database (please configure it in Settings first)"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 4. Qualification check (if specified)
            emp_qual = str(clean_row.get("qualification") or (meta_in or {}).get("qualification") or "").strip()
            if emp_qual and valid_qualifications and emp_qual.lower() not in valid_qualifications:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or f"Row {i + 1}",
                        "error": f"Qualification '{emp_qual}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # 5. Specialization check (if specified)
            emp_spec = str(clean_row.get("area_of_service_specialization") or clean_row.get("specialization") or clean_row.get("area_of_service") or (meta_in or {}).get("specialization") or "").strip()
            if emp_spec and valid_specializations and emp_spec.lower() not in valid_specializations:
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name or f"Row {i + 1}",
                        "error": f"Specialization '{emp_spec}' not found in database for the active organization '{org_name or branch_id}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # Strict email validation & safe synthesis if missing
            EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
            if not email:
                clean_phone = re.sub(r"[^\d]", "", phone)
                if clean_phone and len(clean_phone) >= 7:
                    email = f"{clean_phone}@staff.portal"
                else:
                    clean_name = re.sub(r"[^a-zA-Z0-9]", "", full_name).lower()
                    email = f"{clean_name}{i + 1}@staff.portal"
            elif not re.match(EMAIL_REGEX, email):
                job["failed"] += 1
                if len(job.setdefault("row_errors", [])) < 100:
                    job["row_errors"].append({
                        "row": i + 1,
                        "name": full_name,
                        "error": f"Invalid email format: '{email}'"
                    })
                if sp is not None:
                    sp.commit()
                continue

            # Role validation: strictly validated, no heuristic escalation to OWNER
            if raw_role:
                if raw_role in ["MANAGER", "ADMIN"] and uploader_role not in ["SUPER_ADMIN", "ADMIN", "HO", "HEAD_OFFICE"]:
                    role = "STAFF"
                else:
                    role = raw_role
            else:
                role = "STAFF"

            gender = str(clean_row.get("gender") or (meta_in or {}).get("gender") or "").strip()
            explicit_code = str(clean_row.get("code") or clean_row.get("employee_code") or clean_row.get("emp_no") or clean_row.get("emp_code") or "").strip()
            code = explicit_code or (assigned_emp_codes[i] if i < len(assigned_emp_codes) else "")
            employment_type = str(clean_row.get("employment_type") or "").strip()

            salary_raw = clean_row.get("base_monthly_salary_") or clean_row.get("base_monthly_salary") or clean_row.get("salary")
            salary = 0.0
            if salary_raw is not None and str(salary_raw).strip() != "":
                try:
                    salary = float(re.sub(r"[^\d.]", "", str(salary_raw)).strip())
                except (TypeError, ValueError):
                    salary = 0.0

            raw_status = str(clean_row.get("status") or "").strip().capitalize()
            status = raw_status if raw_status in ALLOWED_EMPLOYEE_STATUSES else ("Active" if not raw_status else raw_status)

            sec_branches = clean_row.get("secondary_branches") or (meta_in or {}).get("secondary_branches") or (meta_in or {}).get("post_details", {}).get("secondary_branches") or []

            joined_date = clean_row.get("date_of_joining_yyyy_mm_dd") or clean_row.get("date_of_joining") or clean_row.get("joined_date")
            parsed_joined = None
            if joined_date:
                if isinstance(joined_date, datetime):
                    parsed_joined = joined_date.date()
                elif isinstance(joined_date, date):
                    parsed_joined = joined_date
                elif isinstance(joined_date, str) and joined_date.strip():
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                        try:
                            parsed_joined = datetime.strptime(joined_date.strip()[:10], fmt).date()
                            break
                        except Exception:
                            pass

            vahd_branch = str(clean_row.get("vahd_branch") or "").strip() or org_name

            # Comprehensive column mapping into meta_dict
            father_name = clean_row.get("father_name")
            dob = clean_row.get("date_of_birth_yyyy_mm_dd") or clean_row.get("date_of_birth") or clean_row.get("dob")
            age = clean_row.get("age")
            blood_group = clean_row.get("blood_group")
            religion = clean_row.get("religion")
            caste = clean_row.get("caste")
            marital_status = str(clean_row.get("marital_status") or "").strip()
            work_experience = clean_row.get("work_experience_years") or clean_row.get("work_experience")
            tech_skills = clean_row.get("technical_skills") or clean_row.get("skills")
            present_address = clean_row.get("present_address")
            permanent_address = clean_row.get("permanent_address")
            emergency_name = clean_row.get("emergency_contact_name")
            emergency_rel = clean_row.get("emergency_relationship")
            emergency_phone = clean_row.get("emergency_contact_number") or clean_row.get("emergency_phone")
            emergency_addr = clean_row.get("emergency_address")
            emergency_note = clean_row.get("emergency_note")
            bank_holder = clean_row.get("bank_account_holder_name") or clean_row.get("account_holder_name")
            bank_name = clean_row.get("bank_name")
            bank_acc = clean_row.get("bank_account_number") or clean_row.get("account_number") or clean_row.get("bank_account_no")
            bank_branch_city = clean_row.get("bank_branch_city") or clean_row.get("bank_branch")
            bank_type = clean_row.get("bank_account_type_savings_current") or clean_row.get("bank_account_type") or clean_row.get("account_type")
            ifsc_code = clean_row.get("ifsc_code") or clean_row.get("bank_ifsc")
            pan_num = clean_row.get("pan_number") or clean_row.get("pan")
            aadhar_num = clean_row.get("aadhar_number") or clean_row.get("aadhar") or clean_row.get("aadhaar_number")
            ref_name = clean_row.get("reference_contact_name") or clean_row.get("reference_name")
            ref_company = clean_row.get("reference_company")
            ref_address = clean_row.get("reference_address")
            ref_post = clean_row.get("reference_post_designation") or clean_row.get("reference_designation")
            ref_tel = clean_row.get("reference_telephone")
            ref_contact = clean_row.get("reference_contact_number") or clean_row.get("reference_mobile")

            meta: Dict[str, Any] = dict(meta_in) if isinstance(meta_in, dict) else {}
            if father_name:
                meta["father_name"] = str(father_name).strip()
            if dob:
                meta["date_of_birth"] = str(dob).strip()
            if age:
                try:
                    meta["age"] = int(str(age).strip())
                except (ValueError, TypeError):
                    meta["age"] = str(age).strip()
            if blood_group:
                meta["blood_group"] = str(blood_group).strip()
            if religion:
                meta["religion"] = str(religion).strip()
            if caste:
                meta["caste"] = str(caste).strip()
            if marital_status:
                meta["marital_status"] = marital_status
            if work_experience:
                meta["work_experience_years"] = str(work_experience).strip()
            if pan_num:
                meta["pan_number"] = str(pan_num).strip()
            if aadhar_num:
                meta["aadhar_number"] = str(aadhar_num).strip()
            if present_address:
                meta["present_address"] = str(present_address).strip()
            if permanent_address:
                meta["permanent_address"] = str(permanent_address).strip()
            if tech_skills:
                meta["technical_skills"] = tech_skills

            bank_info: Dict[str, Any] = {}
            if bank_holder:
                bank_info["holder_name"] = str(bank_holder).strip()
            if bank_name:
                bank_info["bank_name"] = str(bank_name).strip()
            if bank_acc:
                bank_info["account_number"] = str(bank_acc).strip()
            if bank_branch_city:
                bank_info["branch_city"] = str(bank_branch_city).strip()
            if bank_type:
                bank_info["account_type"] = str(bank_type).strip()
            if ifsc_code:
                bank_info["ifsc_code"] = str(ifsc_code).strip()
            if bank_info:
                meta["bank_details"] = bank_info

            em_info: Dict[str, Any] = {}
            if emergency_name:
                em_info["name"] = str(emergency_name).strip()
            if emergency_rel:
                em_info["relationship"] = str(emergency_rel).strip()
            if emergency_phone:
                em_info["number"] = str(emergency_phone).strip()
            if emergency_addr:
                em_info["address"] = str(emergency_addr).strip()
            if emergency_note:
                em_info["note"] = str(emergency_note).strip()
            if em_info:
                meta["emergency_contact_details"] = em_info

            ref_info: Dict[str, Any] = {}
            if ref_name:
                ref_info["name"] = str(ref_name).strip()
            if ref_company:
                ref_info["company"] = str(ref_company).strip()
            if ref_address:
                ref_info["address"] = str(ref_address).strip()
            if ref_post:
                ref_info["post_designation"] = str(ref_post).strip()
            if ref_tel:
                ref_info["telephone"] = str(ref_tel).strip()
            if ref_contact:
                ref_info["contact_number"] = str(ref_contact).strip()
            if ref_info:
                meta["reference_details"] = ref_info

            skills_val = None
            if tech_skills:
                if isinstance(tech_skills, list):
                    skills_val = tech_skills
                elif isinstance(tech_skills, str):
                    skills_val = [s.strip() for s in tech_skills.split(",") if s.strip()]
                else:
                    skills_val = [str(tech_skills)]

            addr_val = str(present_address or permanent_address or clean_row.get("address") or "").strip()

            em_contact_val = str(clean_row.get("emergency_contact") or "").strip()
            if not em_contact_val and (emergency_name or emergency_phone):
                em_parts = []
                if emergency_name:
                    em_parts.append(str(emergency_name).strip())
                if emergency_rel:
                    em_parts.append(f"({str(emergency_rel).strip()})")
                if emergency_phone:
                    em_parts.append(f": {str(emergency_phone).strip()}")
                em_contact_val = " ".join(em_parts).strip()

            password = generate_enrollment_password(full_name, phone)

            # 1) login User (new users get their hash stamped at chunk commit)
            u = users_by_email.get(email)
            if u:
                u.full_name = full_name
                u.phone = phone or u.phone
                u.role = role
                if owner_id:
                    u.owner_id = owner_id
                if branch_id:
                    u.branch_id = branch_id
                if ho_id:
                    u.ho_id = ho_id
                chunk.append(u)
                chunk_hashes.append(password)
            else:
                u = User(
                    id=f"usr_{uuid.uuid4().hex[:8]}",
                    email=email,
                    password_hash="",
                    role=role,
                    full_name=full_name,
                    phone=phone,
                    owner_id=owner_id,
                    branch_id=branch_id,
                    ho_id=ho_id,
                    is_tenant_owner=False,
                )
                db.add(u)
                db.flush()               # employeeProfile.user_id FK
                users_by_email[email] = u
                new_user_email = email
                chunk.append(u)
                chunk_hashes.append(password)

            if not code:
                code = assigned_emp_codes[i] if i < len(assigned_emp_codes) else f"{EMPLOYEE_CODE_PREFIX}{uuid.uuid4().hex[:6].upper()}"
            elif (branch_id or "", code) in _EMP_CODES_SEEN:
                code = f"{code}-{uuid.uuid4().hex[:4].upper()}"
            _EMP_CODES_SEEN.add((branch_id or "", code))

            # 2) employeeProfile
            p = profiles_by_email.get(email)
            if p:
                p.full_name = full_name
                p.email = email
                p.phone = phone or p.phone
                p.role = role
                if designation:
                    p.specialization = designation
                p.base_monthly_salary = salary
                p.bank_account_no = str(bank_acc or p.bank_account_no or "") or None
                p.bank_ifsc = str(ifsc_code or p.bank_ifsc or "") or None
                p.upi_id = clean_row.get("upi_id") or p.upi_id
                p.primary_vahd_location = vahd_branch or p.primary_vahd_location
                p.tenant_id = branch_id or p.tenant_id
                p.is_active = str(status).lower() == "active"
                row_updated = 1
            else:
                p = employeeProfile(
                    id=f"tr_{uuid.uuid4().hex[:6]}",
                    user_id=u.id,
                    full_name=full_name,
                    email=email,
                    phone=phone,
                    gender=gender or None,
                    role=role,
                    specialization=designation or None,
                    base_monthly_salary=salary,
                    bank_account_no=str(bank_acc or "") or None,
                    bank_ifsc=str(ifsc_code or "") or None,
                    upi_id=clean_row.get("upi_id"),
                    primary_vahd_location=vahd_branch or None,
                    tenant_id=branch_id,
                )
                db.add(p)
                profiles_by_email[email] = p
                new_profile_email = email
                row_created = 1

            # 3) HRMS Employee
            e = emps_by_email.get(email)
            if e:
                e.meta_data = meta
                if sec_branches:
                    e.secondary_branches = sec_branches
                if department:
                    e.department = department
                if designation:
                    e.designation = designation
                if gender:
                    e.gender = gender
                if marital_status:
                    e.marital_status = marital_status
                if skills_val:
                    e.skills = skills_val
                if addr_val:
                    e.address = addr_val
                if em_contact_val:
                    e.emergency_contact = em_contact_val
                if emp_qual:
                    e.qualification = emp_qual
                if emp_spec or designation:
                    e.specialization = emp_spec or designation
                if phone:
                    e.phone = phone
                if explicit_code:
                    e.code = explicit_code
                elif not e.code:
                    e.code = code
                if parsed_joined:
                    e.joined_date = parsed_joined
                if employment_type:
                    e.employment_type = employment_type
                if salary > 0:
                    e.salary = salary
                if vahd_branch:
                    e.vahd_branch = vahd_branch
                if branch_id:
                    e.branch_id = branch_id
                    e.tenant_id = branch_id
                if ho_id:
                    e.ho_id = ho_id
                if owner_id:
                    e.owner_id = owner_id
                e.status = status
                if not getattr(e, "user_id", None):
                    e.user_id = u.id
                if not getattr(e, "profile_id", None):
                    e.profile_id = p.id
            else:
                e = Employee(
                    id=f"emp_{uuid.uuid4().hex[:8]}",
                    code=code,
                    first_name=first_name or full_name,
                    last_name=last_name,
                    email=email,
                    phone=phone,
                    gender=gender or None,
                    marital_status=marital_status or None,
                    designation=designation,
                    department=department,
                    joined_date=parsed_joined,
                    employment_type=employment_type or None,
                    status=status,
                    salary=salary,
                    vahd_branch=vahd_branch,
                    branch_id=branch_id,
                    tenant_id=branch_id,
                    secondary_branches=sec_branches,
                    ho_id=ho_id,
                    owner_id=owner_id,
                    address=addr_val or None,
                    emergency_contact=em_contact_val or None,
                    qualification=emp_qual or None,
                    specialization=emp_spec or designation or None,
                    skills=skills_val,
                    meta_data=meta,
                )
                e.user_id = u.id
                e.profile_id = p.id
                db.add(e)
                emps_by_email[email] = e
                new_emp_email = email

            job["done"] = i + 1
            sp.commit()  # persist this row only; batch commit happens below
            if row_created:
                job["created"] += 1
            elif row_updated:
                job["updated"] += 1

            if (i + 1) % BATCH_SIZE == 0 or i == total - 1:
                if chunk:
                    hashes = _parallel_hash_passwords(chunk_hashes)
                    for u_, h_ in zip(chunk, hashes):
                        u_.password_hash = h_
                db.commit()
                chunk = []
                chunk_hashes = []
                job["message"] = f"{job['done']}/{total} rows committed"

        except Exception as exc:
            # Roll back ONLY this row (savepoint) so the rest of the batch
            # survives; revert in-memory maps/chunk added by this row.
            try:
                if sp is not None:
                    sp.rollback()
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass
            if new_user_email is not None:
                users_by_email.pop(new_user_email, None)
            if new_profile_email is not None:
                profiles_by_email.pop(new_profile_email, None)
            if new_emp_email is not None:
                emps_by_email.pop(new_emp_email, None)
            if len(chunk) > mark:
                del chunk[mark:]
                del chunk_hashes[mark:]
            job["created"] = max(0, job["created"] - row_created)
            job["updated"] = max(0, job["updated"] - row_updated)
            job["failed"] += 1
            err_msg = f"{type(exc).__name__}: {str(exc)[:200]}"
            job["last_error"] = f"Row {i + 1} ({full_name or 'Unknown'}): {err_msg}"
            job["message"] = job["last_error"]
            if len(job.setdefault("row_errors", [])) < 100:
                job["row_errors"].append({
                    "row": i + 1,
                    "name": full_name or email or f"Row {i + 1}",
                    "error": err_msg
                })

    # ONE forced reconciliation of the two employee tables at the very end
    try:
        from src.services.hrms_service import HrmsService
        HrmsService.sync_employees_to_employees(db, force=True)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    job["status"] = "done"
    job["finished_at"] = datetime.utcnow().isoformat()
    job["message"] = f"Imported {job['created']} new, updated {job['updated']}, failed {job['failed']}"
    return job


# ---------------------------------------------------------------------------
# public entry points
# ---------------------------------------------------------------------------
def start_students_import(rows: List[Dict[str, Any]], current_user: Optional[User] = None) -> Dict[str, Any]:
    if len(rows) > MAX_ROWS:
        raise ValueError(f"too many rows ({len(rows)}); maximum {MAX_ROWS} per file")
    job = _new_job("students", len(rows))
    if len(rows) <= INLINE_LIMIT:
        db = SessionLocal()
        try:
            _run_students_import(db, rows, job, current_user=current_user)
        except Exception as exc:
            try:
                db.rollback()
            except Exception:
                pass
            job["status"] = "error"
            job["message"] = f"Import aborted: {type(exc).__name__}: {str(exc)[:200]}"
        finally:
            db.close()
    else:
        job["background"] = True

        def _worker():
            db = SessionLocal()
            try:
                _run_students_import(db, rows, job, current_user=current_user)
            except Exception as exc:
                try:
                    db.rollback()
                except Exception:
                    pass
                job["status"] = "error"
                job["message"] = f"Import aborted: {type(exc).__name__}: {str(exc)[:200]}"
            finally:
                db.close()

        threading.Thread(target=_worker, daemon=True).start()
    return job


def start_employees_import(rows: List[Dict[str, Any]], current_user: Optional[User] = None) -> Dict[str, Any]:
    if len(rows) > MAX_ROWS:
        raise ValueError(f"too many rows ({len(rows)}); maximum {MAX_ROWS} per file")
    job = _new_job("employees", len(rows))
    if len(rows) <= INLINE_LIMIT:
        db = SessionLocal()
        try:
            _run_employees_import(db, rows, job, current_user=current_user)
        except Exception as exc:
            try:
                db.rollback()
            except Exception:
                pass
            job["status"] = "error"
            job["message"] = f"Import aborted: {type(exc).__name__}: {str(exc)[:200]}"
        finally:
            db.close()
    else:
        job["background"] = True

        def _worker():
            db = SessionLocal()
            try:
                _run_employees_import(db, rows, job, current_user=current_user)
            except Exception as exc:
                try:
                    db.rollback()
                except Exception:
                    pass
                job["status"] = "error"
                job["message"] = f"Import aborted: {type(exc).__name__}: {str(exc)[:200]}"
            finally:
                db.close()

        threading.Thread(target=_worker, daemon=True).start()
    return job
