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
import re
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import bcrypt
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from src.database.session import SessionLocal
from src.models.user import User
from src.models.student import student
from src.models.employee import employeeProfile
from src.models.hrms import Employee, Department, Designation
from src.models.settings import Branch as vahdBranch, MasterData
from src.utils.email import generate_enrollment_password

BATCH_SIZE = 2000        # commit chunk size
INLINE_LIMIT = 2000     # <= this many rows: process inside the HTTP request
                        #   (still chunk-commits every 2000 — a 2000-row file
                        #   is fast enough inline; bigger files go background)
MAX_ROWS = 50000        # hard cap per file

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
    """bcrypt releases the GIL -> hash generated credentials in parallel.

    Cost 10 keeps a 20k-row file practical while producing a normal
    $2b$10$ hash that verify_password() checks transparently.
    """
    if not passwords:
        return []

    def one(pw: str) -> str:
        salt = bcrypt.gensalt(rounds=10)
        return bcrypt.hashpw((pw or "pvnr0000").encode("utf-8")[:72], salt).decode("utf-8")

    with ThreadPoolExecutor(max_workers=min(8, max(1, len(passwords)))) as pool:
        return list(pool.map(one, passwords))


# ---------------------------------------------------------------------------
# batched branch resolution (replaces the per-row SQL cascades)
# ---------------------------------------------------------------------------
def _branch_maps(db: Session) -> Dict[str, Any]:
    branches = db.query(vahdBranch).all()
    by_id: Dict[str, vahdBranch] = {}
    by_vahd_name: Dict[str, vahdBranch] = {}
    by_branch_name: Dict[str, vahdBranch] = {}
    owner_first: Dict[str, vahdBranch] = {}
    active: Optional[vahdBranch] = None
    for b in branches:
        if b.id:
            by_id[b.id] = b
        if b.vahd_name:
            by_vahd_name[b.vahd_name.strip().lower()] = b
        if b.branch_name:
            by_branch_name[b.branch_name.strip().lower()] = b
        if b.is_active and active is None:
            active = b
        if b.owner_id and b.owner_id not in owner_first:
            owner_first[b.owner_id] = b
    return {
        "db": db,
        "by_id": by_id,
        "by_vahd_name": by_vahd_name,
        "by_branch_name": by_branch_name,
        "owner_first": owner_first,
        "active": active,
        "memo": {},
    }


def _resolve_branch(row: Dict[str, Any], m: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str], str, str]:
    """Mirror create_student / create_employee branch priority, map-backed.

    Returns (branch_id, ho_id, owner_id, org_name, branch_name).
    The rare 'branch referenced by a name created mid-import' case is
    resolved once via SQL and memoized.
    """
    explicit = str(row.get("branch_id") or row.get("branch") or row.get("primary_vahd_location") or row.get("branch_name") or "").strip()
    owner_hint = row.get("owner_id")
    row_ho = row.get("ho_id")

    if explicit:
        b = m["by_id"].get(explicit)
        if b is None:
            b = m["by_vahd_name"].get(explicit.lower())
        if b is None:
            b = m["by_branch_name"].get(explicit.lower())
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
                res: Tuple = (hit.id, hit.ho_id, hit.owner_id, hit.vahd_name or "", hit.branch_name or "")
                m["memo"][key] = res
                return res
            # unknown branch reference: do NOT echo the raw id (students.branch_id
            # is an FK and would 500 the row). Fall through to owner/active fallback.
            return _resolve_branch_fallback(owner_hint, row_ho, m)
        return (b.id, b.ho_id, b.owner_id, b.vahd_name or "", b.branch_name or "")

    return _resolve_branch_fallback(owner_hint, row_ho, m)


def _resolve_branch_fallback(owner_hint: Optional[str], row_ho: Optional[str], m: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str], str, str]:
    """Owner/active-branch fallback, map-backed. owner_id may only be the
    owner that a real branch points to (users.owner_id is a self-FK, but
    students.branch_id -> branches.id is a real FK, so only known branch
    owner ids are ever returned)."""
    key = f"{owner_hint}:"
    if key in m["memo"]:
        return m["memo"][key]
    b = m["owner_first"].get(owner_hint) if owner_hint else None
    if b is None:
        b = m["active"]
    if b:
        res = (b.id, b.ho_id, b.owner_id, b.vahd_name or "", b.branch_name or "")
    else:
        res = (None, row_ho, None, "", "")
    m["memo"][key] = res
    return res


# ---------------------------------------------------------------------------
# master-data / department registration across a whole file (deduped)
# ---------------------------------------------------------------------------
def _register_masters(db: Session, rows: List[Dict[str, Any]], kind: str) -> None:
    """Create every department/designation/master-data value referenced by the
    file ONCE each, instead of N times. Mirrors the create_* behavior but
    bulk-deduped."""
    depts: Dict[str, str] = {}
    desgs: Dict[str, str] = {}
    masters: Dict[Tuple[str, str], Tuple[str, str, str]] = {}
    for row in rows:
        meta = row.get("meta_data") if isinstance(row.get("meta_data"), dict) else {}
        dept = str(row.get("department") or meta.get("department") or "").strip()
        desg = str(row.get("designation") or "").strip()
        if dept and dept.lower() not in depts:
            depts[dept.lower()] = dept
        if kind == "employees" and desg and desg.lower() not in desgs:
            desgs[desg.lower()] = desg
        for cat, raw, prefix in (
            ("gender_types", str(row.get("gender") or meta.get("gender") or ""), "GND"),
            ("qualifications", str(row.get("qualification") or meta.get("qualification") or ""), "QLF"),
            ("specializations", str(row.get("specialization") or meta.get("specialization") or ""), "SPC"),
        ):
            name = raw.strip()
            if not name:
                continue
            target = name.capitalize() if cat == "gender_types" else name
            if (cat, target.lower()) not in masters:
                masters[(cat, target.lower())] = (cat, target, prefix)

    # load existing names once
    existing_depts = {d.name.strip().lower() for d in db.query(Department).all() if d.name}
    existing_desgs = {d.title.strip().lower() for d in db.query(Designation).all() if d.title}
    existing_md = {
        (mrow.category, (mrow.name or "").strip().lower())
        for mrow in db.query(MasterData).all() if mrow.name
    }
    existing_dept_codes = {d.code for d in db.query(Department).all() if d.code}

    to_add: List[Any] = []
    for d_lower, d_name in depts.items():
        words = d_name.split()
        d_code = "".join([w[0].upper() for w in words if w.isalnum()])[:6] or d_name[:4].upper()
        if d_lower not in existing_depts:
            while d_code in existing_dept_codes:
                d_code = f"{d_code}{uuid.uuid4().hex[:3].upper()}"
            existing_dept_codes.add(d_code)
            to_add.append(Department(
                id=f"dept_{uuid.uuid4().hex[:8]}", name=d_name, code=d_code,
                description=f"Auto-created department (bulk import)", head_name="", is_active=True,
            ))
        if ("departments", d_lower) not in existing_md:
            to_add.append(MasterData(
                id=f"mdata_{uuid.uuid4().hex[:8]}", category="departments", name=d_name,
                code=d_code, description="Auto-created (bulk import)",
                extra_info="student" if kind == "students" else "employee", is_active=True,
            ))

    for k_lower, k_name in desgs.items():
        if k_lower not in existing_desgs:
            to_add.append(Designation(
                id=f"desg_{uuid.uuid4().hex[:8]}", title=k_name,
                department="General", level="Mid",
                description=f"Auto-created designation (bulk import)",
            ))
        if ("designations", k_lower) not in existing_md:
            to_add.append(MasterData(
                id=f"mdata_{uuid.uuid4().hex[:8]}", category="designations", name=k_name,
                code=f"DES-{k_name[:4].upper()}", description="Auto-created (bulk import)", is_active=True,
            ))

    for (cat, _low), (c_cat, c_name, c_prefix) in masters.items():
        if (c_cat, c_name.lower()) not in existing_md:
            to_add.append(MasterData(
                id=f"mdata_{uuid.uuid4().hex[:8]}", category=c_cat, name=c_name,
                code=f"{c_prefix}-{c_name[:4].upper()}", is_active=True,
            ))

    if to_add:
        db.add_all(to_add)
        db.flush()


# ---------------------------------------------------------------------------
# STUdENT bulk import
# ---------------------------------------------------------------------------
def _run_students_import(db: Session, rows: List[Dict[str, Any]], job: Dict[str, Any]) -> Dict[str, Any]:
    total = len(rows)
    job["total"] = total

    users_by_email = {u.email.strip().lower(): u for u in db.query(User).all() if u.email}
    students_by_user = {s.user_id: s for s in db.query(student).all() if s.user_id}
    branches = _branch_maps(db)

    _register_masters(db, rows, "students")

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
            mm = re.match(r"^(?:stu)?(\d+)$", c, re.IGNORECASE)
            if mm:
                n = int(mm.group(1))
                if n > max_num:
                    max_num = n
    next_seq = max_num + 1

    # pre-assign sequential codes in-memory (no per-row full-table scans)
    codes: List[str] = []
    for row in rows:
        req = str(row.get("roll_no") or row.get("member_code") or row.get("code") or "").strip()
        mm = re.match(r"^(?:stu)?(\d+)$", req, re.IGNORECASE) if req else None
        if mm:
            norm = f"stu{int(mm.group(1)):04d}"
            if norm not in taken:
                codes.append(norm)
                taken.add(norm.lower())
                continue
        c = f"stu{next_seq:04d}"
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
            full_name = str(row.get("full_name") or row.get("name") or "").strip()
            email = str(row.get("email") or "").strip().lower()
            phone = str(row.get("phone") or "").strip()
            if not full_name or not email or not phone:
                job["failed"] += 1
                if sp is not None:
                    sp.commit()
                continue

            meta = row.get("meta_data") if isinstance(row.get("meta_data"), dict) else {}
            branch_id, ho_id, owner_id, org_name, branch_name = _resolve_branch(row, branches)
            display_location = (
                f"{org_name} - {branch_name}"
                if org_name and branch_name and org_name.lower() != branch_name.lower()
                else (org_name or branch_name or "")
            )
            dept = str(row.get("department") or meta.get("department") or "").strip()
            if dept:
                meta["department"] = dept
            meta["roll_number"] = codes[i]
            meta["student_number"] = codes[i]
            meta["code"] = codes[i]

            user = users_by_email.get(email)
            password = generate_enrollment_password(full_name, phone)
            if user is None:
                user = User(
                    id=f"usr_{uuid.uuid4().hex[:8]}",
                    email=email,
                    password_hash="",   # filled by the parallel hash pass before commit
                    full_name=full_name,
                    role=str(row.get("role") or "STUDENT").strip().upper() or "STUDENT",
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
                user.role = str(row.get("role") or "STUDENT").strip().upper() or "STUDENT"
                if owner_id:
                    user.owner_id = owner_id
                if branch_id:
                    user.branch_id = branch_id
                if ho_id:
                    user.ho_id = ho_id
                chunk.append(user)
                chunk_hashes.append(password)

            existing_stu = students_by_user.get(user.id)
            parent_phone = str(row.get("parent_phone") or row.get("parent_mobile") or meta.get("parent_phone") or meta.get("parent_mobile") or "")
            gender = str(row.get("gender") or meta.get("gender") or "").strip()
            qual = str(row.get("qualification") or meta.get("qualification") or "").strip()
            spec = str(row.get("specialization") or meta.get("specialization") or "").strip()

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
                if row.get("status"):
                    c.status = str(row.get("status")).strip().upper()
                if row.get("profile_image"):
                    c.profile_image = row.get("profile_image")
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
                    status=str(row.get("status") or "ACTIVE").strip().upper(),
                )
                db.add(c)
                students_by_user[user.id] = c
                new_stu_user_id = user.id
                row_created = True

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
            job["last_error"] = f"row {i + 1} failed: {type(exc).__name__}: {str(exc)[:200]}"
            job["message"] = job["last_error"]

    job["status"] = "done"
    job["finished_at"] = datetime.utcnow().isoformat()
    job["message"] = f"Imported {job['created']} new, updated {job['updated']}, failed {job['failed']}"
    return job


# ---------------------------------------------------------------------------
# EMPLOYEE bulk import
# ---------------------------------------------------------------------------
def _run_employees_import(db: Session, rows: List[Dict[str, Any]], job: Dict[str, Any]) -> Dict[str, Any]:
    total = len(rows)
    job["total"] = total

    users_by_email = {u.email.strip().lower(): u for u in db.query(User).all() if u.email}
    profiles_by_email = {p.email.strip().lower(): p for p in db.query(employeeProfile).all() if p.email}
    emps_by_email = {e.email.strip().lower(): e for e in db.query(Employee).all() if e.email}
    branches = _branch_maps(db)

    _register_masters(db, rows, "employees")

    # per-run set of codes already seen for this file, so synthesized codes
    # stay distinct within the same tenant (avoids the uq(tenant_id, code)
    # collision)
    _EMP_CODES_SEEN: set = set()

    chunk: List[User] = []
    chunk_hashes: List[str] = []

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
            first_name = str(row.get("first_name") or "").strip()
            last_name = str(row.get("last_name") or "").strip()
            full_name = str(row.get("full_name") or f"{first_name} {last_name}").strip()
            email = str(row.get("email") or "").strip().lower()
            phone = str(row.get("phone") or "").strip()
            if not full_name and not email:
                job["failed"] += 1
                sp.commit()  # release the savepoint (nothing was written)
                continue
            if not full_name:
                full_name = email.split("@")[0]

            designation = str(row.get("designation") or "").strip()
            department = str(row.get("department") or "").strip()
            gender = str(row.get("gender") or "").strip().lower()
            code = str(row.get("code") or "").strip()
            employment_type = str(row.get("employment_type") or "Full-Time").strip()
            try:
                salary = float(row.get("salary") or 0.0)
            except (TypeError, ValueError):
                salary = 0.0
            status = str(row.get("status") or "Active").strip().capitalize() or "Active"
            role = str(row.get("role") or "EMPLOYEE").strip().upper() or "EMPLOYEE"
            if role == "EMPLOYEE" and ("Management" in department or "Director" in designation or "Owner" in designation):
                role = "MANAGER" if "Operations" in department else "OWNER"
            elif role == "EMPLOYEE" and ("Front Desk" in department or "Support" in department):
                role = "STAFF"

            meta = row.get("meta_data") if isinstance(row.get("meta_data"), dict) else None
            sec_branches = row.get("secondary_branches") or (meta or {}).get("secondary_branches") or (meta or {}).get("post_details", {}).get("secondary_branches") or []

            joined_date = row.get("joined_date")
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

            branch_id, ho_id, owner_id, org_name, _branch_name = _resolve_branch(row, branches)
            vahd_branch = str(row.get("vahd_branch") or "").strip() or org_name

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
                    is_tenant_owner=(role == "OWNER"),
                )
                db.add(u)
                db.flush()               # employeeProfile.user_id FK
                users_by_email[email] = u
                new_user_email = email
                chunk.append(u)
                chunk_hashes.append(password)

            # distinct code per (tenant_id, code) — the table has a
            # uq(tenant_id, code) index, so two empty-code rows in one tenant
            # would collide. Use a UUID suffix (never collides with existing
            # BULK00xx data or codes already in the DB).
            if not code:
                code = f"BULK{uuid.uuid4().hex[:8].upper()}"
            elif (branch_id or "", code) in _EMP_CODES_SEEN:
                code = f"{code}-{uuid.uuid4().hex[:6].upper()}"
            _EMP_CODES_SEEN.add((branch_id or "", code))

            # 2) employeeProfile (legacy table — mirrors register_employee;
            #    employeeProfiles have NO department column — it lives on
            #    specialization/hrms Employee)
            p = profiles_by_email.get(email)
            if p:
                p.full_name = full_name
                p.email = email
                p.phone = phone or p.phone
                p.role = role
                if designation:
                    p.specialization = designation
                p.base_monthly_salary = salary
                p.bank_account_no = row.get("account_number") or row.get("bank_account_no") or p.bank_account_no
                p.bank_ifsc = row.get("ifsc_code") or row.get("bank_ifsc") or p.bank_ifsc
                p.upi_id = row.get("upi_id") or p.upi_id
                p.primary_vahd_location = vahd_branch or p.primary_vahd_location
                p.tenant_id = branch_id or p.tenant_id
                p.is_active = str(row.get("status") or "Active").lower() == "active"
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
                    bank_account_no=row.get("account_number") or row.get("bank_account_no"),
                    bank_ifsc=row.get("ifsc_code") or row.get("bank_ifsc"),
                    upi_id=row.get("upi_id"),
                    primary_vahd_location=vahd_branch or None,
                    tenant_id=branch_id,
                )
                db.add(p)
                profiles_by_email[email] = p
                new_profile_email = email
                row_created = 1

            # 3) HRMS Employee — field-for-field with create_employee
            e = emps_by_email.get(email)
            if e:
                if meta:
                    e.meta_data = meta
                if sec_branches:
                    e.secondary_branches = sec_branches
                if department:
                    e.department = department
                if designation:
                    e.designation = designation
                if gender:
                    e.gender = gender
                if phone:
                    e.phone = phone
                if code:
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
                if row.get("qualification"):
                    e.qualification = str(row.get("qualification"))
                if row.get("specialization"):
                    e.specialization = str(row.get("specialization"))
                if row.get("address"):
                    e.address = str(row.get("address"))
                if row.get("emergency_contact"):
                    e.emergency_contact = str(row.get("emergency_contact"))
                # heal legacy rows: ensure the canonical person links exist
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
                    gender=gender,
                    designation=designation,
                    department=department,
                    joined_date=parsed_joined or date.today(),
                    employment_type=employment_type,
                    status=status,
                    salary=salary,
                    vahd_branch=vahd_branch,
                    branch_id=branch_id,
                    tenant_id=branch_id,
                    secondary_branches=sec_branches,
                    ho_id=ho_id,
                    owner_id=owner_id,
                    address=str(row.get("address") or ""),
                    emergency_contact=str(row.get("emergency_contact") or ""),
                    qualification=str(row.get("qualification") or ""),
                    specialization=str(row.get("specialization") or designation or ""),
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
            job["last_error"] = f"row {i + 1} failed: {type(exc).__name__}: {str(exc)[:200]}"
            job["message"] = job["last_error"]

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
            _run_students_import(db, rows, job)
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
                _run_students_import(db, rows, job)
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
            _run_employees_import(db, rows, job)
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
                _run_employees_import(db, rows, job)
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
