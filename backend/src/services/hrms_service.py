import re
import uuid
import math
import calendar
from datetime import datetime, date, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import or_, func, text, cast, String
from sqlalchemy.orm import Session
from src.models.hrms import (
    Employee, Department, Designation, Team, EmployeeDocument,
    EmployeeAttendance, LeaveRequest, PayrollRecord,
    RecruitmentJob, JobApplicant, EmployeePerformance, ExitRequest,
    GeofenceScheme, LeaveType, EmployeeLeaveBalance, AttendanceCorrection,
    EmployeeShiftRoster, WorkCalendarPolicy, CompanyHoliday, ShiftTemplate
)
from src.models.employee import employeeProfile
from src.models.payroll import PayrollInvoice
from src.models.student import student
from src.models.user import User
from src.models.biometric import BiometricLog
from src.models.settings import Branch as vahdBranch, Setting as vahdSetting, MasterData

IST = timezone(timedelta(hours=5, minutes=30))

def infer_dept_type(dept_name: str, cur_extra: str = "") -> str:
    """Helper to classify departments dynamically into student, employee, or both."""
    if cur_extra and cur_extra.strip():
        val = cur_extra.strip().lower()
        if val in ("student", "students", "academic"):
            return "student"
        if val in ("employee", "employees", "staff"):
            return "employee"
        if val in ("both", "all"):
            return "both"
    n = (dept_name or "").lower()
    student_keywords = [
        "computer", "science", "mechanical", "civil", "electrical", "electronics",
        "engineering", "tech", "data", "ai", "bba", "mca", "mba", "commerce",
        "humanities", "polytechnic", "physics", "chemistry", "mathematics",
        "biology", "sports", "student", "academic", "stream", "curriculum",
        "cse", "ece", "eee", "it", "batch", "degree", "class", "course"
    ]
    employee_keywords = [
        "hr", "human resource", "payroll", "admin", "management", "finance",
        "account", "operations", "facility", "facilities", "security", "transport",
        "housekeeping", "logistics", "maintenance", "reception", "desk",
        "faculty", "teaching", "staff", "office", "executive", "it support",
        "administrative", "manager"
    ]
    is_stud = any(k in n for k in student_keywords)
    is_emp = any(k in n for k in employee_keywords)
    if is_stud and not is_emp:
        return "student"
    if is_emp and not is_stud:
        return "employee"
    return "both"

STANDARD_SHIFTS = {
    "GEN": {"code": "GEN", "name": "General (09-18)", "start_time": "09:00", "end_time": "18:00", "grace_period_mins": 15, "color": "#7c3aed"},
    "MORN": {"code": "MORN", "name": "Morning (06-14)", "start_time": "06:00", "end_time": "14:00", "grace_period_mins": 15, "color": "#059669"},
    "EVE": {"code": "EVE", "name": "Evening (14-22)", "start_time": "14:00", "end_time": "22:00", "grace_period_mins": 15, "color": "#d97706"},
    "NIGHT": {"code": "NIGHT", "name": "Night (22-06)", "start_time": "22:00", "end_time": "06:00", "grace_period_mins": 15, "color": "#9333ea"},
    "OFF": {"code": "OFF", "name": "Rest Day", "start_time": "", "end_time": "", "grace_period_mins": 0, "color": "#64748b"},
}



class HrmsService:
    # -------------------------------------------------------------
    # 1. EMPLOYEE MANAGEMENT & employeeS MAPPING METHODS
    # -------------------------------------------------------------
    @staticmethod
    def sync_employees_to_employees(db: Session) -> None:
        """
        Synchronizes all employees and staff from employeeProfile into HRMS Employee records.
        Removes any obsolete or mock employee records that do not belong to actual employees/staff.
        """
        employees = db.query(employeeProfile).all()
        user_employees = db.query(User).filter(
            func.upper(User.role).in_(["EMPLOYEE", "STAFF", "ADMIN", "OWNER", "SUPER_ADMIN", "HO"])
        ).all()
        valid_emails = {t.email.strip().lower() for t in employees if t.email}
        valid_emails.update({u.email.strip().lower() for u in user_employees if u.email})

        # 1. Only purge obsolete employees that have no email or are placeholder/mock artifacts
        all_employees = db.query(Employee).all()
        for emp in all_employees:
            # Keep any employee who has an email or was enrolled directly in HRMS
            if not emp.email and not emp.code:
                db.delete(emp)
        db.flush()

        # 2. Upsert each employeeProfile into Employee
        existing_codes = {e.code for e in db.query(Employee.code).all() if e.code}
        next_code_num = 1

        for idx, t in enumerate(employees, start=1):
            full_name = (t.full_name or "").strip()
            parts = full_name.split(" ", 1)
            first_name = parts[0] if parts else ""
            last_name = parts[1] if len(parts) > 1 else ""

            role = (t.role or "").upper()
            dept = getattr(t, "department", None) or ""
            desg = getattr(t, "job_designation", None) or getattr(t, "specialization", None) or role

            status = "Active" if getattr(t, "is_active", True) else "Inactive"
            salary = float(t.base_monthly_salary or 0.0)
            joined = t.created_at.date() if t.created_at else date.today()

            u = db.query(User).filter(User.id == t.user_id).first() if t.user_id else None
            if not u and t.email:
                u = db.query(User).filter(func.lower(User.email) == t.email.strip().lower()).first()

            b = None
            if t.primary_vahd_location:
                b = db.query(vahdBranch).filter(
                    or_(vahdBranch.id == t.primary_vahd_location, vahdBranch.branch_name.ilike(f"%{t.primary_vahd_location}%"))
                ).first()

            t_branch_id = (u.branch_id if u and u.branch_id else None) or (b.id if b else None)
            t_owner_id = (u.owner_id if u and u.owner_id else None) or (b.owner_id if b else None)
            t_ho_id = (u.ho_id if u and u.ho_id else None) or (b.ho_id if b else None)

            existing_emp = db.query(Employee).filter(
                (Employee.email.ilike(t.email)) | (Employee.id == f"emp_{t.id}")
            ).first()

            if existing_emp:
                existing_emp.first_name = first_name
                existing_emp.last_name = last_name
                existing_emp.email = t.email
                existing_emp.phone = t.phone or existing_emp.phone or ""
                existing_emp.gender = t.gender or existing_emp.gender
                if desg and desg.upper() not in ["EMPLOYEE", "STAFF"]:
                    existing_emp.designation = desg
                elif not existing_emp.designation:
                    existing_emp.designation = desg or "Staff"
                if dept:
                    existing_emp.department = dept
                existing_emp.status = status
                existing_emp.salary = salary
                existing_emp.vahd_branch = t.primary_vahd_location or existing_emp.vahd_branch or ""
                if t_branch_id and not existing_emp.branch_id:
                    existing_emp.branch_id = t_branch_id
                if t_owner_id and not getattr(existing_emp, "owner_id", None):
                    existing_emp.owner_id = t_owner_id
                if t_ho_id and not existing_emp.ho_id:
                    existing_emp.ho_id = t_ho_id
                if not existing_emp.code:
                    while f"{next_code_num:04d}" in existing_codes:
                        next_code_num += 1
                    unique_code = f"{next_code_num:04d}"
                    existing_codes.add(unique_code)
                    existing_emp.code = unique_code
            else:
                while f"{next_code_num:04d}" in existing_codes:
                    next_code_num += 1
                unique_code = f"{next_code_num:04d}"
                existing_codes.add(unique_code)

                new_emp = Employee(
                    id=f"emp_{t.id}",
                    code=unique_code,
                    first_name=first_name,
                    last_name=last_name,
                    email=t.email,
                    phone=t.phone or "",
                    gender=t.gender,
                    designation=desg,
                    department=dept,
                    reporting_manager="",
                    joined_date=joined,
                    employment_type=role.title() if role else "Full-Time",
                    status=status,
                    salary=salary,
                    avatar="",
                    vahd_branch=t.primary_vahd_location or "",
                    branch_id=t_branch_id,
                    owner_id=t_owner_id,
                    ho_id=t_ho_id,
                    skills=[t.specialization] if t.specialization else []
                )
                db.add(new_emp)

        db.commit()

    @staticmethod
    def get_employees(
        db: Session,
        department: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        branch_id: Optional[str] = None,
        ho_id: Optional[str] = None,
        current_user: Optional[User] = None
    ) -> List[Dict[str, Any]]:
        # Always sync with employee profiles first
        try:
            HrmsService.sync_employees_to_employees(db)
        except Exception:
            db.rollback()

        query = db.query(Employee)

        # Multi-tenant Head Office / Branch isolation
        if current_user:
            user_role = (current_user.role or "").strip().upper()
            if user_role in ["HEAD_OFFICE", "HO"]:
                ho_target = current_user.ho_id or current_user.id
                ho_branches = db.query(vahdBranch).filter(
                    or_(vahdBranch.ho_id == ho_target, vahdBranch.owner_id == current_user.id)
                ).all()
                ho_branch_names = [b.branch_name for b in ho_branches if b.branch_name]
                ho_branch_ids = [b.id for b in ho_branches if b.id]

                conditions = [Employee.ho_id == ho_target]
                if ho_branch_ids:
                    conditions.append(Employee.branch_id.in_(ho_branch_ids))
                if ho_branch_names:
                    conditions.append(Employee.vahd_branch.in_(ho_branch_names))
                # Also include unassigned or organization-wide enterprise employees
                conditions.append(Employee.ho_id.is_(None))
                conditions.append(Employee.ho_id == "")

                query = query.filter(or_(*conditions))

                if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                    matched_b = db.query(vahdBranch).filter(
                        or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
                    ).first()
                    b_ids = [branch_id]
                    b_names = [branch_id]
                    if matched_b:
                        b_ids.append(matched_b.id)
                        if matched_b.branch_name:
                            b_names.append(matched_b.branch_name)
                        if matched_b.vahd_name:
                            b_names.append(matched_b.vahd_name)
                    b_conds = [Employee.branch_id.in_(b_ids)]
                    for bn in b_names:
                        b_conds.append(Employee.vahd_branch.ilike(f"%{bn}%"))
                    for bid in b_ids:
                        b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bid}%"))
                        b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bid}%"))
                    for bn in b_names:
                        b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bn}%"))
                        b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bn}%"))
                    query = query.filter(or_(*b_conds))
            elif user_role in ["OWNER"]:
                owner_branches = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.owner_id == current_user.id,
                        vahdBranch.id == current_user.branch_id
                    )
                ).all()
                owner_branch_names = [b.branch_name for b in owner_branches if b.branch_name] + [b.vahd_name for b in owner_branches if b.vahd_name]
                owner_branch_ids = [b.id for b in owner_branches if b.id]
                conditions = [Employee.owner_id == current_user.id]
                if owner_branch_ids:
                    conditions.append(Employee.branch_id.in_(owner_branch_ids))
                if owner_branch_names:
                    conditions.append(Employee.vahd_branch.in_(owner_branch_names))
                # Also include unassigned or organization-wide enterprise employees
                conditions.append(Employee.owner_id.is_(None))
                conditions.append(Employee.owner_id == "")
                if conditions:
                    query = query.filter(or_(*conditions))
                if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                    matched_b = db.query(vahdBranch).filter(
                        or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
                    ).first()
                    b_ids = [branch_id]
                    b_names = [branch_id]
                    if matched_b:
                        b_ids.append(matched_b.id)
                        if matched_b.branch_name:
                            b_names.append(matched_b.branch_name)
                        if matched_b.vahd_name:
                            b_names.append(matched_b.vahd_name)
                    b_conds = [Employee.branch_id.in_(b_ids)]
                    for bn in b_names:
                        b_conds.append(Employee.vahd_branch.ilike(f"%{bn}%"))
                    for bid in b_ids:
                        b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bid}%"))
                        b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bid}%"))
                    for bn in b_names:
                        b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bn}%"))
                        b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bn}%"))
                    query = query.filter(or_(*b_conds))
        elif ho_id:
            query = query.filter(Employee.ho_id == ho_id)
        elif branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
            matched_b = db.query(vahdBranch).filter(
                or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
            ).first()
            b_ids = [branch_id]
            b_names = [branch_id]
            if matched_b:
                b_ids.append(matched_b.id)
                if matched_b.branch_name:
                    b_names.append(matched_b.branch_name)
                if matched_b.vahd_name:
                    b_names.append(matched_b.vahd_name)
            b_conds = [Employee.branch_id.in_(b_ids)]
            for bn in b_names:
                b_conds.append(Employee.vahd_branch.ilike(f"%{bn}%"))
            for bid in b_ids:
                b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bid}%"))
                b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bid}%"))
            for bn in b_names:
                b_conds.append(cast(Employee.secondary_branches, String).ilike(f"%{bn}%"))
                b_conds.append(cast(Employee.meta_data, String).ilike(f"%{bn}%"))
            query = query.filter(or_(*b_conds))

        if department and department != "All Departments":
            query = query.filter(Employee.department == department)
        if status and status != "All Statuses":
            query = query.filter(Employee.status.ilike(status))
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (Employee.first_name.ilike(s)) |
                (Employee.last_name.ilike(s)) |
                (Employee.email.ilike(s)) |
                (Employee.code.ilike(s)) |
                (Employee.designation.ilike(s))
            )

        employees = query.order_by(Employee.code.asc(), Employee.created_at.desc()).all()
        result = []
        for e in employees:
            full_name = f"{e.first_name} {e.last_name or ''}".strip()
            parts = full_name.split()
            initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "EM"
            result.append({
                "id": e.id,
                "code": e.code,
                "first_name": e.first_name,
                "last_name": e.last_name or "",
                "full_name": full_name,
                "initials": initials,
                "email": e.email,
                "phone": e.phone or "",
                "gender": getattr(e, "gender", None) or "",
                "designation": e.designation,
                "department": e.department,
                "reporting_manager": e.reporting_manager or "",
                "joined_date": e.joined_date.strftime("%d/%m/%Y") if e.joined_date else "",
                "employment_type": e.employment_type or "Full-Time",
                "status": e.status or "Active",
                "salary": float(e.salary or 0.0),
                "avatar": e.avatar or "",
                "skills": e.skills or [],
                "qualification": getattr(e, "qualification", None) or "",
                "specialization": getattr(e, "specialization", None) or "",
                "vahd_branch": e.vahd_branch or "",
                "branch_id": e.branch_id or "",
                "ho_id": e.ho_id or "",
                "owner_id": getattr(e, "owner_id", None) or "",
                "emergency_contact": e.emergency_contact or "",
                "secondary_branches": getattr(e, "secondary_branches", None) or (e.meta_data.get("secondary_branches") if (e.meta_data and isinstance(e.meta_data, dict)) else []) or [],
                "meta_data": getattr(e, "meta_data", None) or {},
                "created_at": e.created_at.isoformat() if e.created_at else None
            })
        return result

    @staticmethod
    def create_employee(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        first_name = str(payload.get("first_name") or "").strip()
        last_name = str(payload.get("last_name") or "").strip()
        full_name = str(payload.get("full_name") or f"{first_name} {last_name}").strip()
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        designation = str(payload.get("designation") or "").strip()
        department = str(payload.get("department") or "").strip()
        gender = str(payload.get("gender") or "").strip().lower()
        code = str(payload.get("code") or "").strip()
        joined_date = payload.get("joined_date")
        employment_type = str(payload.get("employment_type") or "Full-Time").strip()
        salary = float(payload.get("salary") or 0.0)
        vahd_branch = str(payload.get("vahd_branch") or "").strip()
        branch_id = payload.get("branch_id")
        ho_id = payload.get("ho_id")
        owner_id = payload.get("owner_id")

        # 1. Auto-create Department if it doesn't already exist in DB
        if department:
            clean_d = department.strip()
            existing_dept = db.query(Department).filter(
                func.lower(Department.name) == clean_d.lower()
            ).first()
            words = clean_d.split()
            d_code = "".join([w[0].upper() for w in words if w.isalnum()])[:6] or clean_d[:4].upper()
            if not existing_dept:
                existing_code = db.query(Department).filter(Department.code == d_code).first()
                if existing_code:
                    d_code = f"{d_code}{uuid.uuid4().hex[:3].upper()}"
                new_dept = Department(
                    id=f"dept_{uuid.uuid4().hex[:8]}",
                    name=clean_d,
                    code=d_code,
                    description=f"Auto-created department: {clean_d}",
                    head_name="",
                    is_active=True
                )
                db.add(new_dept)
                try:
                    db.commit()
                except Exception:
                    db.rollback()

            # Synchronize with MasterData for departments (marked as employee)
            existing_md = db.query(MasterData).filter(
                MasterData.category == "departments",
                func.lower(MasterData.name) == clean_d.lower()
            ).first()
            if not existing_md:
                new_md = MasterData(
                    id=f"mdata_{uuid.uuid4().hex[:8]}",
                    category="departments",
                    name=clean_d,
                    code=d_code,
                    description=f"Auto-created department: {clean_d}",
                    extra_info="employee",
                    is_active=True
                )
                db.add(new_md)
                try:
                    db.commit()
                except Exception:
                    db.rollback()
            elif not existing_md.extra_info or existing_md.extra_info.lower() not in ("employee", "both"):
                existing_md.extra_info = "employee"
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        # 2. Auto-create Designation if it doesn't already exist in DB
        if designation:
            clean_desg = designation.strip()
            existing_desg = db.query(Designation).filter(
                func.lower(Designation.title) == clean_desg.lower()
            ).first()
            if not existing_desg:
                clean_desg = designation.strip()
                new_desg = Designation(
                    id=f"desg_{uuid.uuid4().hex[:8]}",
                    title=clean_desg,
                    department=department or "General",
                    level="Mid",
                    description=f"Auto-created designation: {clean_desg}"
                )
                db.add(new_desg)
                try:
                    db.commit()
                except Exception:
                    db.rollback()

            # Also sync to MasterData for designations
            existing_md_desg = db.query(MasterData).filter(
                MasterData.category == "designations",
                func.lower(MasterData.name) == clean_desg.lower()
            ).first()
            if not existing_md_desg:
                new_md_desg = MasterData(
                    id=f"mdata_{uuid.uuid4().hex[:8]}",
                    category="designations",
                    name=clean_desg,
                    code=f"DES-{clean_desg[:4].upper()}",
                    parent_name=department or "General",
                    description=f"Auto-created designation: {clean_desg}",
                    is_active=True
                )
                db.add(new_md_desg)
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        # 3. Auto-append gender, qualification, specialization to MasterData if not present
        if gender:
            clean_gender = gender.strip().capitalize()
            if clean_gender:
                existing_g = db.query(MasterData).filter(
                    MasterData.category == "gender_types",
                    func.lower(MasterData.name) == clean_gender.lower()
                ).first()
                if not existing_g:
                    db.add(MasterData(
                        id=f"mdata_{uuid.uuid4().hex[:8]}",
                        category="gender_types",
                        name=clean_gender,
                        code=f"GND-{clean_gender[:3].upper()}",
                        is_active=True
                    ))
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()

        emp_qual = payload.get("qualification")
        if emp_qual and str(emp_qual).strip():
            clean_qual = str(emp_qual).strip()
            existing_q = db.query(MasterData).filter(
                MasterData.category == "qualifications",
                func.lower(MasterData.name) == clean_qual.lower()
            ).first()
            if not existing_q:
                db.add(MasterData(
                    id=f"mdata_{uuid.uuid4().hex[:8]}",
                    category="qualifications",
                    name=clean_qual,
                    code=f"QLF-{clean_qual[:4].upper()}",
                    is_active=True
                ))
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        emp_spec = payload.get("specialization")
        if emp_spec and str(emp_spec).strip():
            clean_spec = str(emp_spec).strip()
            existing_s = db.query(MasterData).filter(
                MasterData.category == "specializations",
                func.lower(MasterData.name) == clean_spec.lower()
            ).first()
            if not existing_s:
                db.add(MasterData(
                    id=f"mdata_{uuid.uuid4().hex[:8]}",
                    category="specializations",
                    name=clean_spec,
                    code=f"SPC-{clean_spec[:4].upper()}",
                    parent_name=str(emp_qual).strip() if emp_qual else "",
                    is_active=True
                ))
                try:
                    db.commit()
                except Exception:
                    db.rollback()

        from src.models.settings import Branch as vahdBranch
        from sqlalchemy import or_

        if vahd_branch and not branch_id:
            matched_b = db.query(vahdBranch).filter(
                or_(vahdBranch.id == vahd_branch, vahdBranch.branch_name.ilike(f"%{vahd_branch}%"))
            ).first()
            if matched_b:
                branch_id = matched_b.id
                if not ho_id and matched_b.ho_id:
                    ho_id = matched_b.ho_id
                if not owner_id and matched_b.owner_id:
                    owner_id = matched_b.owner_id
        elif branch_id:
            matched_b = db.query(vahdBranch).filter(vahdBranch.id == branch_id).first()
            if matched_b:
                if not ho_id and matched_b.ho_id:
                    ho_id = matched_b.ho_id
                if not owner_id and matched_b.owner_id:
                    owner_id = matched_b.owner_id

        if not branch_id:
            if owner_id:
                matched_b = db.query(vahdBranch).filter(vahdBranch.owner_id == owner_id).first()
            else:
                matched_b = db.query(vahdBranch).filter(vahdBranch.is_active == True).first() or db.query(vahdBranch).first()
            if matched_b:
                branch_id = matched_b.id
                vahd_branch = vahd_branch or matched_b.branch_name or matched_b.vahd_name
                if not ho_id and matched_b.ho_id:
                    ho_id = matched_b.ho_id
                if not owner_id and matched_b.owner_id:
                    owner_id = matched_b.owner_id

        if not ho_id and owner_id:
            owner_u = db.query(User).filter(User.id == owner_id).first()
            if owner_u and owner_u.ho_id:
                ho_id = owner_u.ho_id

        # Parse joined date safely
        parsed_joined = None
        if joined_date:
            if isinstance(joined_date, (datetime, date)):
                parsed_joined = joined_date if isinstance(joined_date, date) else joined_date.date()
            elif isinstance(joined_date, str) and joined_date.strip():
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                    try:
                        parsed_joined = datetime.strptime(joined_date.strip()[:10], fmt).date()
                        break
                    except Exception:
                        pass

        # Map department/designation to employeeProfile role
        role = str(payload.get("role") or "EMPLOYEE").upper()
        if role == "employee":
            role = "EMPLOYEE"
        if not payload.get("role"):
            if "Management" in department or "Director" in designation or "Owner" in designation:
                role = "MANAGER" if "Operations" in department else "OWNER"
            elif "Front Desk" in department or "Support" in department:
                role = "STAFF"

        # Also register in employeeProfile so both remain in sync
        from src.services.payroll_service import PayrollService
        PayrollService.register_employee(db, {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "gender": gender,
            "role": role,
            "specialization": designation,
            "department": department,
            "base_monthly_salary": salary,
            "primary_vahd_location": vahd_branch,
            "branch_id": branch_id,
            "owner_id": owner_id,
            "ho_id": ho_id,
            "join_date": parsed_joined.isoformat() if parsed_joined else None,
            "bank_account_no": payload.get("account_number") or payload.get("bank_account_no"),
            "bank_ifsc": payload.get("ifsc_code") or payload.get("bank_ifsc"),
        })

        HrmsService.sync_employees_to_employees(db)
        sec_branches = payload.get("secondary_branches") or []
        if not sec_branches and payload.get("meta_data") and isinstance(payload.get("meta_data"), dict):
            sec_branches = payload["meta_data"].get("secondary_branches") or payload["meta_data"].get("post_details", {}).get("secondary_branches") or []

        emp = db.query(Employee).filter(Employee.email == email).first()
        if not emp:
            emp = Employee(
                id=f"emp_{uuid.uuid4().hex[:8]}",
                code=code or "",
                first_name=first_name or full_name,
                last_name=last_name or "",
                email=email,
                phone=phone,
                gender=gender,
                designation=designation,
                department=department,
                joined_date=parsed_joined or date.today(),
                employment_type=employment_type,
                status=str(payload.get("status") or "Active").capitalize(),
                salary=salary,
                vahd_branch=vahd_branch,
                branch_id=branch_id,
                secondary_branches=sec_branches,
                ho_id=ho_id,
                owner_id=owner_id,
                address=payload.get("address") or "",
                emergency_contact=payload.get("emergency_contact") or "",
                qualification=payload.get("qualification") or "",
                specialization=payload.get("specialization") or designation or "",
                meta_data=payload.get("meta_data") if isinstance(payload.get("meta_data"), dict) else None,
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
        else:
            if payload.get("meta_data") and isinstance(payload.get("meta_data"), dict):
                emp.meta_data = payload.get("meta_data")
            if sec_branches:
                emp.secondary_branches = sec_branches
            if department:
                emp.department = department
            if designation:
                emp.designation = designation
            if gender:
                emp.gender = gender
            if phone:
                emp.phone = phone
            if code and not emp.code:
                emp.code = code
            elif code:
                emp.code = code
            if parsed_joined:
                emp.joined_date = parsed_joined
            if employment_type:
                emp.employment_type = employment_type
            if salary > 0:
                emp.salary = salary
            if vahd_branch:
                emp.vahd_branch = vahd_branch
            if branch_id:
                emp.branch_id = branch_id
            if ho_id:
                emp.ho_id = ho_id
            if owner_id:
                emp.owner_id = owner_id
            if payload.get("status"):
                emp.status = str(payload["status"]).capitalize()
            if payload.get("qualification"):
                emp.qualification = payload["qualification"]
            if payload.get("specialization"):
                emp.specialization = payload["specialization"]
            if payload.get("address"):
                emp.address = payload["address"]
            if payload.get("emergency_contact"):
                emp.emergency_contact = payload["emergency_contact"]
            db.commit()

        u = db.query(User).filter(User.email == email).first()
        if u:
            if phone and not u.phone:
                u.phone = phone
            if branch_id:
                u.branch_id = branch_id
            if ho_id:
                u.ho_id = ho_id
            if owner_id:
                u.owner_id = owner_id
            db.commit()

        return {"message": "Employee created and synced successfully", "id": emp.id if emp else "", "code": emp.code if emp else ""}

    @staticmethod
    def update_employee(db: Session, emp_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            raise ValueError("Employee not found")

        for key, val in payload.items():
            if hasattr(emp, key) and key not in ["id", "created_at"]:
                if key == "joined_date" and isinstance(val, str) and val.strip():
                    try:
                        val = datetime.strptime(val.strip(), "%Y-%m-%d").date()
                    except Exception:
                        continue
                elif key == "salary" and val is not None:
                    try:
                        val = float(val)
                    except Exception:
                        val = 0.0
                setattr(emp, key, val)

        if "secondary_branches" in payload:
            emp.secondary_branches = payload["secondary_branches"]
        elif payload.get("meta_data") and isinstance(payload.get("meta_data"), dict) and "secondary_branches" in payload["meta_data"]:
            emp.secondary_branches = payload["meta_data"]["secondary_branches"]

        # Sync back to employeeProfile if exists
        employee_id = emp_id.replace("emp_", "")
        employee = db.query(employeeProfile).filter(
            (employeeProfile.id == employee_id) | (employeeProfile.email == emp.email)
        ).first()
        if employee:
            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            employee.full_name = full_name
            employee.email = emp.email
            employee.phone = emp.phone
            employee.specialization = emp.designation
            employee.base_monthly_salary = emp.salary
            employee.is_active = (emp.status.lower() == "active")

        db.commit()
        return {"message": "Employee updated successfully"}

    @staticmethod
    def delete_employee(db: Session, emp_id: str) -> bool:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            return False

        employee_id = emp_id.replace("emp_", "")
        employee = db.query(employeeProfile).filter(
            (employeeProfile.id == employee_id) | (employeeProfile.email == emp.email)
        ).first()
        if employee:
            db.delete(employee)

        db.delete(emp)
        db.commit()
        return True


    # -------------------------------------------------------------
    # 2. DEPARTMENTS, DESIGNATIONS, TEAMS, DOCUMENTS
    # -------------------------------------------------------------
    @staticmethod
    def get_departments(db: Session) -> List[Dict[str, Any]]:
        # Self-healing: ensure any department present on Employee records is in Department table
        emp_depts = db.query(Employee.department).distinct().all()
        existing_dept_names = {d.name.strip().lower() for d in db.query(Department.name).all() if d.name}
        for (dept_name,) in emp_depts:
            if dept_name and dept_name.strip() and dept_name.strip().lower() not in existing_dept_names:
                clean_name = dept_name.strip()
                words = clean_name.split()
                d_code = "".join([w[0].upper() for w in words if w.isalnum()])[:6] or clean_name[:4].upper()
                existing_code = db.query(Department).filter(Department.code == d_code).first()
                if existing_code:
                    d_code = f"{d_code}{uuid.uuid4().hex[:3].upper()}"
                new_d = Department(
                    id=f"dept_{uuid.uuid4().hex[:8]}",
                    name=clean_name,
                    code=d_code,
                    description=f"Auto-created department: {clean_name}",
                    head_name="",
                    is_active=True
                )
                db.add(new_d)
                existing_dept_names.add(clean_name.lower())

        # Self-healing: ensure any student departments are also present in Department table
        try:
            for s in db.query(student).all():
                s_meta = s.meta_data if isinstance(s.meta_data, dict) else {}
                s_dept = (s_meta.get("department") or s_meta.get("dept") or s_meta.get("branchdept") or getattr(s, "specialization", None) or "").strip()
                if s_dept and s_dept.lower() not in existing_dept_names:
                    words = s_dept.split()
                    d_code = "".join([w[0].upper() for w in words if w.isalnum()])[:6] or s_dept[:4].upper()
                    new_d = Department(
                        id=f"dept_{uuid.uuid4().hex[:8]}",
                        name=s_dept,
                        code=d_code,
                        description=f"Auto-created department: {s_dept}",
                        head_name="",
                        is_active=True
                    )
                    db.add(new_d)
                    existing_dept_names.add(s_dept.lower())
        except Exception:
            pass

        try:
            db.commit()
        except Exception:
            db.rollback()

        depts = db.query(Department).order_by(Department.name.asc()).all()
        employees = db.query(Employee).all()
        employee_profiles = db.query(employeeProfile).all()
        students = db.query(student).all()
        master_depts = {m.name.strip().lower(): m for m in db.query(MasterData).filter(MasterData.category == "departments").all() if m.name}
        
        result = []
        for d in depts:
            dept_name_lower = (d.name or "").strip().lower()
            mapped_emp = []
            
            # Map from Employee records
            for e in employees:
                e_dept = (getattr(e, "department", None) or "").strip().lower()
                if e_dept and e_dept == dept_name_lower:
                    mapped_emp.append({
                        "id": e.id,
                        "name": f"{getattr(e, 'first_name', '') or ''} {getattr(e, 'last_name', '') or ''}".strip() or (getattr(e, "email", "") or "Employee"),
                        "email": getattr(e, "email", "") or "",
                        "code": getattr(e, "code", "") or "",
                        "designation": getattr(e, "designation", "") or "",
                        "department": d.name,
                        "phone": getattr(e, "phone", "") or "",
                        "status": getattr(e, "status", "Active") or "Active",
                        "avatar": getattr(e, "avatar", "") or "",
                        "joined_date": e.joined_date.isoformat() if getattr(e, "joined_date", None) else None,
                    })
            
            # Map from employeeProfile records
            for t in employee_profiles:
                t_dept = (getattr(t, "department", None) or getattr(t, "specialization", None) or "").strip().lower()
                if t_dept and t_dept == dept_name_lower:
                    # Check if already added
                    if not any(emp["email"].lower() == (getattr(t, "email", "") or "").lower() for emp in mapped_emp):
                        mapped_emp.append({
                            "id": t.id,
                            "name": getattr(t, "full_name", None) or getattr(t, "name", None) or (getattr(t, "email", "") or "Staff"),
                            "email": getattr(t, "email", "") or "",
                            "code": f"EMP-{t.id[:4].upper()}" if t.id else "",
                            "designation": getattr(t, "job_designation", None) or getattr(t, "specialization", None) or getattr(t, "role", "") or "",
                            "department": d.name,
                            "phone": getattr(t, "phone", "") or "",
                            "status": "Active" if getattr(t, "is_active", True) is not False else "Inactive",
                            "avatar": "",
                            "joined_date": t.created_at.strftime('%Y-%m-%d') if getattr(t, "created_at", None) else None,
                        })

            # Map from student records
            mapped_stud = []
            for s in students:
                s_meta = s.meta_data if isinstance(s.meta_data, dict) else {}
                s_dept = (s_meta.get("department") or s_meta.get("dept") or s_meta.get("branchdept") or getattr(s, "specialization", None) or "").strip().lower()
                if s_dept and s_dept == dept_name_lower:
                    mapped_stud.append({
                        "id": s.id,
                        "name": getattr(s, "full_name", "") or "Student",
                        "email": getattr(s, "email", "") or "",
                        "phone": getattr(s, "phone", "") or "",
                        "code": getattr(s, "member_code", "") or "",
                        "department": d.name,
                        "status": getattr(s, "status", "ACTIVE") or "ACTIVE",
                        "avatar": getattr(s, "profile_image", "") or "",
                        "joined_date": s.created_at.strftime('%Y-%m-%d') if getattr(s, "created_at", None) else None,
                    })

            emp_cnt = len(mapped_emp)
            stud_cnt = len(mapped_stud)

            # Determine department audience type
            md_entry = master_depts.get(dept_name_lower)
            explicit_type = (md_entry.extra_info or "").strip().lower() if md_entry else ""
            if explicit_type in ("student", "students", "academic"):
                dept_type = "student"
            elif explicit_type in ("employee", "employees", "staff"):
                dept_type = "employee"
            elif explicit_type in ("both", "all"):
                dept_type = "both"
            elif emp_cnt > 0 and stud_cnt == 0:
                dept_type = "employee"
            elif stud_cnt > 0 and emp_cnt == 0:
                dept_type = "student"
            elif emp_cnt > 0 and stud_cnt > 0:
                dept_type = "both"
            else:
                dept_type = infer_dept_type(d.name)

            # Ensure MasterData entry exists and has extra_info aligned
            if not md_entry:
                try:
                    new_md = MasterData(
                        id=f"mdata_{uuid.uuid4().hex[:8]}",
                        category="departments",
                        name=d.name,
                        code=d.code or d.name[:4].upper(),
                        description=d.description or "",
                        extra_info=dept_type,
                        is_active=d.is_active if d.is_active is not None else True
                    )
                    db.add(new_md)
                    db.commit()
                    master_depts[dept_name_lower] = new_md
                except Exception:
                    db.rollback()
            elif not md_entry.extra_info or md_entry.extra_info.lower() not in ("student", "employee", "both"):
                try:
                    md_entry.extra_info = dept_type
                    db.commit()
                except Exception:
                    db.rollback()
            
            result.append({
                "id": d.id,
                "name": d.name,
                "code": d.code or "",
                "description": d.description or "",
                "head_name": d.head_name or "",
                "is_active": d.is_active if d.is_active is not None else True,
                "employee_count": emp_cnt,
                "student_count": stud_cnt,
                "department_type": dept_type,
                "extra_info": dept_type,
                "employees": mapped_emp,
                "students": mapped_stud
            })
        return result

    @staticmethod
    def create_department(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        dept_name = str(payload.get("name") or "").strip()
        dept_code = str(payload.get("code") or "").strip()
        dept_desc = str(payload.get("description") or "").strip()
        dept_head = str(payload.get("head_name") or "").strip()
        dept_active = bool(payload.get("is_active", True))
        raw_type = (payload.get("department_type") or payload.get("extra_info") or payload.get("type") or "").strip().lower()
        if raw_type not in ("student", "employee", "both"):
            raw_type = infer_dept_type(dept_name)

        dept = db.query(Department).filter(func.lower(Department.name) == dept_name.lower()).first()
        if not dept:
            dept = Department(
                id=f"dept_{uuid.uuid4().hex[:8]}",
                name=dept_name,
                code=dept_code or dept_name[:4].upper(),
                description=dept_desc,
                head_name=dept_head,
                is_active=dept_active
            )
            db.add(dept)
        else:
            if dept_code: dept.code = dept_code
            if dept_desc: dept.description = dept_desc
            if dept_head: dept.head_name = dept_head
            dept.is_active = dept_active

        # Synchronize with MasterData
        md = db.query(MasterData).filter(
            MasterData.category == "departments",
            func.lower(MasterData.name) == dept_name.lower()
        ).first()
        if not md:
            md = MasterData(
                id=f"mdata_{uuid.uuid4().hex[:8]}",
                category="departments",
                name=dept_name,
                code=dept.code or dept_name[:4].upper(),
                description=dept.description or "",
                extra_info=raw_type,
                is_active=dept.is_active
            )
            db.add(md)
        else:
            md.code = dept.code
            md.description = dept.description
            md.extra_info = raw_type
            md.is_active = dept.is_active

        db.commit()
        return {"message": "Department created successfully", "id": dept.id, "name": dept.name, "extra_info": raw_type, "department_type": raw_type}

    @staticmethod
    def update_department(db: Session, dept_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        clean_id = (dept_id or "").strip()
        while clean_id.startswith("cat_dept_"):
            clean_id = clean_id[len("cat_dept_"):]

        dept = db.query(Department).filter(
            or_(
                Department.id == clean_id,
                Department.id == dept_id,
                Department.code.ilike(clean_id),
                Department.name.ilike(clean_id)
            )
        ).first()

        # If not found directly in Department, check MasterData for matching department
        m_item = None
        if not dept:
            m_item = db.query(MasterData).filter(
                MasterData.category == "departments",
                or_(MasterData.id == dept_id, MasterData.id == clean_id)
            ).first()
            if m_item:
                dept = db.query(Department).filter(
                    or_(
                        Department.name.ilike(m_item.name),
                        Department.id == m_item.id
                    )
                ).first()

        if not dept:
            dept_name = str(payload.get("name") or (m_item.name if m_item else "")).strip()
            if dept_name:
                dept = db.query(Department).filter(Department.name.ilike(dept_name)).first()

            if not dept:
                # If name is still empty, do not attempt an invalid empty department insert
                if not dept_name:
                    if m_item and "is_active" in payload:
                        m_item.is_active = bool(payload["is_active"])
                        db.commit()
                    return {"message": "Department updated in MasterData", "id": dept_id}

                raw_t = (payload.get("department_type") or payload.get("extra_info") or "").strip().lower() or infer_dept_type(dept_name)
                dept = Department(
                    id=clean_id if clean_id.startswith("dept_") else f"dept_{uuid.uuid4().hex[:8]}",
                    name=dept_name,
                    code=str(payload.get("code") or (m_item.code if m_item else "")).strip() or dept_name[:4].upper(),
                    description=str(payload.get("description") or (m_item.description if m_item else "")).strip(),
                    head_name=str(payload.get("head_name") or "").strip(),
                    is_active=bool(payload.get("is_active", True))
                )
                db.add(dept)
                md = MasterData(
                    id=f"mdata_{uuid.uuid4().hex[:8]}",
                    category="departments",
                    name=dept_name,
                    code=dept.code,
                    description=dept.description,
                    extra_info=raw_t,
                    is_active=dept.is_active
                )
                db.add(md)
                db.commit()
                return {"message": "Department created successfully", "id": dept.id}

        if "name" in payload and str(payload["name"]).strip():
            old_name = dept.name
            dept.name = str(payload["name"]).strip()
            # Update associated employees
            db.query(Employee).filter(Employee.department == old_name).update({"department": dept.name})
        if "code" in payload:
            dept.code = str(payload["code"]).strip()
        if "description" in payload:
            dept.description = str(payload["description"]).strip()
        if "head_name" in payload:
            dept.head_name = str(payload["head_name"]).strip()
        if "is_active" in payload:
            dept.is_active = bool(payload["is_active"])

        # Sync MasterData
        raw_type = (payload.get("extra_info") or payload.get("department_type") or "").strip().lower()
        md = db.query(MasterData).filter(
            MasterData.category == "departments",
            func.lower(MasterData.name) == dept.name.lower()
        ).first()
        if md:
            md.name = dept.name
            md.code = dept.code
            md.description = dept.description
            md.is_active = dept.is_active
            if raw_type:
                md.extra_info = raw_type
        elif raw_type:
            db.add(MasterData(
                id=f"mdata_{uuid.uuid4().hex[:8]}",
                category="departments",
                name=dept.name,
                code=dept.code,
                description=dept.description,
                extra_info=raw_type,
                is_active=dept.is_active
            ))

        db.commit()
        return {"message": "Department updated successfully", "id": dept.id}

    @staticmethod
    def delete_department(db: Session, dept_id: str) -> Dict[str, Any]:
        clean_id = (dept_id or "").strip()
        while clean_id.startswith("cat_dept_"):
            clean_id = clean_id[len("cat_dept_"):]
        dept = db.query(Department).filter(
            or_(
                Department.id == clean_id,
                Department.id == dept_id,
                Department.code.ilike(clean_id),
                Department.name.ilike(clean_id)
            )
        ).first()
        if not dept:
            # Also check MasterData
            db.query(MasterData).filter(
                MasterData.category == "departments",
                or_(MasterData.id == dept_id, MasterData.id == clean_id)
            ).delete(synchronize_session=False)
            db.commit()
            return {"message": "Department deleted or already removed", "id": dept_id}
        
        dept_name = dept.name
        db.delete(dept)
        db.query(MasterData).filter(
            MasterData.category == "departments",
            func.lower(MasterData.name) == dept_name.lower()
        ).delete(synchronize_session=False)
        db.commit()
        return {"message": "Department deleted successfully", "id": dept.id}

    @staticmethod
    def get_designations(db: Session) -> List[Dict[str, Any]]:
        # Self-healing: ensure any designation present on Employee records is in Designation table
        emp_desgs = db.query(Employee.designation, Employee.department).distinct().all()
        existing_titles = {d.title.strip().lower() for d in db.query(Designation.title).all() if d.title}
        for desg_title, dept_name in emp_desgs:
            if desg_title and desg_title.strip() and desg_title.strip().lower() not in existing_titles:
                clean_title = desg_title.strip()
                new_desg = Designation(
                    id=f"desg_{uuid.uuid4().hex[:8]}",
                    title=clean_title,
                    department=dept_name or "General",
                    level="Mid",
                    description=f"Auto-created designation: {clean_title}"
                )
                db.add(new_desg)
                existing_titles.add(clean_title.lower())
        try:
            db.commit()
        except Exception:
            db.rollback()

        desgs = db.query(Designation).order_by(Designation.title.asc()).all()
        employees = db.query(Employee).all()
        employee_profiles = db.query(employeeProfile).all()
        
        result = []
        for d in desgs:
            title_lower = (d.title or "").strip().lower()
            mapped = []
            
            for e in employees:
                e_desg = (e.designation or "").strip().lower()
                if e_desg and e_desg == title_lower:
                    mapped.append({
                        "id": e.id,
                        "name": f"{e.first_name or ''} {e.last_name or ''}".strip() or (e.email or "Employee"),
                        "email": e.email or "",
                        "code": e.code or "",
                        "department": e.department or d.department or "",
                        "status": e.status or "Active",
                        "phone": e.phone or ""
                    })
            
            for t in employee_profiles:
                t_desg = (getattr(t, "job_designation", None) or getattr(t, "specialization", None) or getattr(t, "role", None) or "").strip().lower()
                if t_desg and t_desg == title_lower:
                    if not any(emp["email"].lower() == (t.email or "").lower() for emp in mapped):
                        mapped.append({
                            "id": t.id,
                            "name": getattr(t, "full_name", None) or getattr(t, "name", None) or (t.email or "Staff"),
                            "email": t.email or "",
                            "code": f"EMP-{t.id[:4].upper()}" if t.id else "",
                            "department": d.department or "",
                            "status": "Active" if getattr(t, "is_active", True) is not False else "Inactive",
                            "phone": getattr(t, "phone", "") or ""
                        })
            
            result.append({
                "id": d.id,
                "title": d.title,
                "department": d.department or "",
                "level": d.level or "",
                "description": d.description or "",
                "employee_count": len(mapped),
                "employees": mapped
            })
        return result

    @staticmethod
    def create_designation(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        desg = Designation(
            id=f"desg_{uuid.uuid4().hex[:8]}",
            title=str(payload.get("title") or "").strip(),
            department=str(payload.get("department") or "").strip(),
            level=str(payload.get("level") or "").strip(),
            description=str(payload.get("description") or "").strip()
        )
        db.add(desg)
        db.commit()
        return {"message": "Designation created successfully", "id": desg.id, "title": desg.title}

    @staticmethod
    def update_designation(db: Session, desg_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        clean_id = (desg_id or "").strip()
        desg = db.query(Designation).filter(
            or_(
                Designation.id == clean_id,
                Designation.id == desg_id,
                Designation.title.ilike(clean_id)
            )
        ).first()
        if not desg:
            desg = Designation(
                id=clean_id if clean_id.startswith("desg_") else f"desg_{uuid.uuid4().hex[:8]}",
                title=str(payload.get("title") or "").strip(),
                department=str(payload.get("department") or "").strip(),
                level=str(payload.get("level") or "").strip(),
                description=str(payload.get("description") or "").strip()
            )
            db.add(desg)
            db.commit()
            return {"message": "Designation created successfully", "id": desg.id}
        if "title" in payload:
            old_title = desg.title
            desg.title = str(payload["title"]).strip()
            db.query(Employee).filter(Employee.designation == old_title).update({"designation": desg.title})
        if "department" in payload:
            desg.department = str(payload["department"]).strip()
        if "level" in payload:
            desg.level = str(payload["level"]).strip()
        if "description" in payload:
            desg.description = str(payload["description"]).strip()
        db.commit()
        return {"message": "Designation updated successfully", "id": desg.id}

    @staticmethod
    def delete_designation(db: Session, desg_id: str) -> Dict[str, Any]:
        clean_id = (desg_id or "").strip()
        desg = db.query(Designation).filter(
            or_(
                Designation.id == clean_id,
                Designation.id == desg_id,
                Designation.title.ilike(clean_id)
            )
        ).first()
        if not desg:
            return {"message": "Designation deleted or already removed", "id": desg_id}
        db.delete(desg)
        db.commit()
        return {"message": "Designation deleted successfully", "id": desg.id}

    @staticmethod
    def get_teams(db: Session) -> List[Dict[str, Any]]:
        teams = db.query(Team).order_by(Team.name.asc()).all()
        return [
            {
                "id": t.id,
                "name": t.name,
                "department": t.department,
                "lead_name": t.lead_name or "",
                "description": t.description or ""
            } for t in teams
        ]

    @staticmethod
    def create_team(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        team = Team(
            id=f"team_{uuid.uuid4().hex[:8]}",
            name=str(payload.get("name") or "").strip(),
            department=str(payload.get("department") or "").strip(),
            lead_name=str(payload.get("lead_name") or "").strip(),
            description=str(payload.get("description") or "").strip()
        )
        db.add(team)
        db.commit()
        return {"message": "Team created successfully", "id": team.id}

    @staticmethod
    def get_documents(db: Session, employee_id: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(EmployeeDocument)
        if employee_id:
            query = query.filter(EmployeeDocument.employee_id == employee_id)
        docs = query.order_by(EmployeeDocument.uploaded_at.desc()).all()
        result = []
        for d in docs:
            emp = db.query(Employee).filter(Employee.id == d.employee_id).first()
            emp_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else ""
            result.append({
                "id": d.id,
                "employee_id": d.employee_id,
                "employee_name": emp_name,
                "title": d.title,
                "doc_type": d.doc_type or "",
                "file_size": d.file_size or "",
                "status": d.status or "Pending",
                "uploaded_at": d.uploaded_at.strftime("%d/%m/%Y") if d.uploaded_at else ""
            })
        return result

    # -------------------------------------------------------------
    # 3. ATTENDANCE & GEOFENCING SCHEME METHODS
    # -------------------------------------------------------------
    @staticmethod
    def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        try:
            R = 6371000  # Radius of Earth in meters
            phi1 = math.radians(float(lat1))
            phi2 = math.radians(float(lat2))
            delta_phi = math.radians(float(lat2) - float(lat1))
            delta_lambda = math.radians(float(lon2) - float(lon1))

            a = math.sin(delta_phi / 2.0) ** 2 + \
                math.cos(phi1) * math.cos(phi2) * \
                math.sin(delta_lambda / 2.0) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return round(R * c, 1)
        except Exception:
            return 0.0

    @staticmethod
    def get_geofence_schemes(db: Session) -> List[Dict[str, Any]]:
        schemes = db.query(GeofenceScheme).order_by(GeofenceScheme.created_at.asc()).all()
        if not schemes:
            # Dynamically initialize from actual vahdBranch / vahdSetting if existing
            branches = db.query(vahdBranch).filter(vahdBranch.is_active == True).all()
            setting = db.query(vahdSetting).first()
            vahd_title = setting.vahd_name if setting and setting.vahd_name else ""
            all_emps = db.query(Employee).all()
            all_emp_ids = [e.id for e in all_emps]

            if branches:
                for b in branches:
                    new_scheme = GeofenceScheme(
                        id=f"scheme_{uuid.uuid4().hex[:8]}",
                        name=b.branch_name,
                        branch_name=b.branch_name,
                        vahd_name=b.vahd_name or vahd_title,
                        latitude=None,
                        longitude=None,
                        radius_meters=500,
                        strict_restriction=False,
                        ip_whitelist="",
                        shift_start_time="",
                        shift_end_time="",
                        grace_period_mins=0,
                        min_half_day_hours=None,
                        allow_ot=True,
                        min_ot_threshold_mins=60,
                        allowed_channels=["gps", "face_recognition"],
                        assigned_employee_ids=all_emp_ids,
                        is_active=True
                    )
                    db.add(new_scheme)
                db.commit()
                schemes = db.query(GeofenceScheme).order_by(GeofenceScheme.created_at.asc()).all()

        result = []
        for s in schemes:
            raw_channels = s.allowed_channels or ["gps", "face_recognition"]
            clean_channels = [c for c in raw_channels if c in ["gps", "face_recognition"]]
            if not clean_channels:
                clean_channels = ["gps", "face_recognition"]
            result.append({
                "id": s.id,
                "name": s.name,
                "branch_name": s.branch_name or "",
                "vahd_name": s.vahd_name or "",
                "latitude": float(s.latitude) if s.latitude is not None else None,
                "longitude": float(s.longitude) if s.longitude is not None else None,
                "radius_meters": int(s.radius_meters) if s.radius_meters is not None else None,
                "strict_restriction": bool(s.strict_restriction),
                "ip_whitelist": s.ip_whitelist or "",
                "shift_start_time": s.shift_start_time or "",
                "shift_end_time": s.shift_end_time or "",
                "grace_period_mins": int(s.grace_period_mins or 0),
                "min_half_day_hours": float(s.min_half_day_hours) if s.min_half_day_hours is not None else None,
                "allow_ot": bool(s.allow_ot) if s.allow_ot is not None else True,
                "min_ot_threshold_mins": int(s.min_ot_threshold_mins) if s.min_ot_threshold_mins is not None else 60,
                "allowed_channels": clean_channels,
                "assigned_employee_ids": s.assigned_employee_ids or [],
                "is_active": bool(s.is_active),
                "created_at": s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else "",
                "updated_at": s.updated_at.strftime("%Y-%m-%d %H:%M:%S") if s.updated_at else "",
            })
        return result


    @staticmethod
    def save_geofence_scheme(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        scheme_id = payload.get("id")
        scheme = None
        if scheme_id:
            scheme = db.query(GeofenceScheme).filter(GeofenceScheme.id == scheme_id).first()

        name = (payload.get("name") or "New Scheme").strip()
        if not scheme:
            # Check by name
            scheme = db.query(GeofenceScheme).filter(GeofenceScheme.name == name).first()

        if not scheme:
            scheme = GeofenceScheme(
                id=f"scheme_{uuid.uuid4().hex[:8]}",
                name=name
            )
            db.add(scheme)

        scheme.name = name
        if "branch_name" in payload:
            scheme.branch_name = payload["branch_name"]
        if "vahd_name" in payload:
            scheme.vahd_name = payload["vahd_name"]
        if "latitude" in payload and payload["latitude"] is not None:
            scheme.latitude = float(payload["latitude"])
        if "longitude" in payload and payload["longitude"] is not None:
            scheme.longitude = float(payload["longitude"])
        if "radius_meters" in payload and payload["radius_meters"] is not None:
            scheme.radius_meters = int(payload["radius_meters"])
        if "strict_restriction" in payload:
            scheme.strict_restriction = bool(payload["strict_restriction"])
        if "ip_whitelist" in payload:
            scheme.ip_whitelist = str(payload["ip_whitelist"] or "")
        if "shift_start_time" in payload:
            scheme.shift_start_time = str(payload["shift_start_time"] or "").strip()
        if "shift_end_time" in payload:
            scheme.shift_end_time = str(payload["shift_end_time"] or "").strip()
        if "grace_period_mins" in payload:
            scheme.grace_period_mins = int(payload["grace_period_mins"] or 0)
        if "min_half_day_hours" in payload:
            scheme.min_half_day_hours = float(payload["min_half_day_hours"]) if payload["min_half_day_hours"] is not None else None
        if "allow_ot" in payload:
            scheme.allow_ot = bool(payload["allow_ot"])
        if "min_ot_threshold_mins" in payload:
            scheme.min_ot_threshold_mins = int(payload["min_ot_threshold_mins"]) if payload["min_ot_threshold_mins"] is not None and str(payload["min_ot_threshold_mins"]).strip() != "" else 60
        if "allowed_channels" in payload:
            raw_channels = payload.get("allowed_channels") or ["gps", "face_recognition"]
            clean_channels = [c for c in raw_channels if c in ["gps", "face_recognition"]]
            scheme.allowed_channels = clean_channels if clean_channels else ["gps", "face_recognition"]
        if "assigned_employee_ids" in payload:
            scheme.assigned_employee_ids = payload["assigned_employee_ids"]
        if "is_active" in payload:
            scheme.is_active = bool(payload["is_active"])

        scheme.updated_at = datetime.now(IST)
        db.commit()
        return {"message": "Geofence scheme saved successfully", "scheme_id": scheme.id}

    @staticmethod
    def delete_geofence_scheme(db: Session, scheme_id: str) -> bool:
        scheme = db.query(GeofenceScheme).filter(GeofenceScheme.id == scheme_id).first()
        if not scheme:
            return False
        db.delete(scheme)
        db.commit()
        return True

    @staticmethod
    def get_attendance_logs(db: Session, selected_date: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        now_ist = datetime.now(IST)
        target_date = now_ist.date()
        if selected_date:
            for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"]:
                try:
                    target_date = datetime.strptime(selected_date.strip(), fmt).date()
                    break
                except Exception:
                    pass

        target_date_str = target_date.strftime("%Y-%m-%d")
        target_date_slash = target_date.strftime("%d/%m/%Y")

        target_branch_ids = [branch_id]
        target_branch_names = [branch_id]
        if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
            br = db.query(vahdBranch).filter(
                or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
            ).first()
            if br:
                target_branch_ids.append(br.id)
                if br.branch_name:
                    target_branch_names.append(br.branch_name)
                if br.vahd_name:
                    target_branch_names.append(br.vahd_name)

        logs = db.query(EmployeeAttendance).filter(
            or_(
                EmployeeAttendance.date == target_date,
                cast(EmployeeAttendance.date, String) == target_date_str,
                cast(EmployeeAttendance.date, String) == target_date_slash,
                cast(EmployeeAttendance.date, String).ilike(f"%{target_date_str}%")
            )
        ).order_by(EmployeeAttendance.created_at.desc()).all()

        result = []
        recorded_emp_ids = set()
        for l in logs:
            clean_lid = str(l.employee_id or '').strip()
            clean_num = clean_lid.replace("EMP-", "").strip()
            emp = db.query(Employee).filter(
                or_(
                    Employee.id == clean_lid,
                    Employee.code == clean_lid,
                    Employee.id == f"emp_{clean_lid}",
                    Employee.code == f"EMP-{clean_lid}",
                    Employee.code == f"EMP-{clean_num.zfill(4)}",
                    Employee.code == clean_num.zfill(4),
                    Employee.code == clean_num,
                    Employee.email.ilike(clean_lid)
                )
            ).first()

            if not emp:
                t_prof = db.query(employeeProfile).filter(
                    or_(
                        employeeProfile.id == clean_lid,
                        employeeProfile.id == clean_lid.replace("emp_", ""),
                        employeeProfile.user_id == clean_lid,
                        employeeProfile.email.ilike(clean_lid)
                    )
                ).first()
                if t_prof:
                    emp = db.query(Employee).filter(
                        or_(
                            Employee.email.ilike(t_prof.email),
                            Employee.id == f"emp_{t_prof.id}",
                            Employee.id == t_prof.id
                        )
                    ).first()

            if not emp:
                t_usr = db.query(User).filter(User.id == clean_lid).first()
                if t_usr:
                    emp = db.query(Employee).filter(
                        or_(
                            Employee.email.ilike(t_usr.email),
                            Employee.id == f"emp_{t_usr.id}",
                            Employee.id == t_usr.id
                        )
                    ).first()

            stu = None
            if not emp:
                from src.models.student import student as StudentModel
                stu = db.query(StudentModel).filter(
                    or_(
                        StudentModel.id == clean_lid,
                        StudentModel.user_id == clean_lid,
                        StudentModel.member_code == clean_lid,
                        StudentModel.id == f"cust_{clean_lid}",
                        StudentModel.email.ilike(clean_lid)
                    )
                ).first()
                if not stu:
                    t_usr = db.query(User).filter(User.id == clean_lid).first()
                    if t_usr:
                        stu = db.query(StudentModel).filter(
                            or_(
                                StudentModel.email.ilike(t_usr.email),
                                StudentModel.user_id == t_usr.id
                            )
                        ).first()

            if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                emp_br_id = getattr(emp, "branch_id", None) if emp else (getattr(stu, "branch_id", None) if stu else None)
                emp_br_name = getattr(emp, "vahd_branch", None) if emp else (getattr(stu, "primary_vahd_location", None) if stu else None)
                emp_sec = getattr(emp, "secondary_branches", None) or (emp.meta_data.get("secondary_branches") if (emp and emp.meta_data and isinstance(emp.meta_data, dict)) else []) or []
                sec_match = False
                if emp_sec:
                    for s in emp_sec:
                        s_str = str(s).lower()
                        if any(t_id.lower() in s_str or s_str in t_id.lower() for t_id in target_branch_ids if t_id) or \
                           any(tn.lower() in s_str or s_str in tn.lower() for tn in target_branch_names if tn):
                            sec_match = True
                            break

                matched_br = (
                    (emp_br_id and emp_br_id in target_branch_ids) or
                    (emp_br_name and any(tn.lower() in emp_br_name.lower() or emp_br_name.lower() in tn.lower() for tn in target_branch_names)) or
                    sec_match
                )
                if not matched_br:
                    continue

            if emp:
                full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
                emp_code = emp.code or clean_lid
                desg = emp.designation or ""
                dept = emp.department or ""
                parts = full_name.split()
                initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "EM"
            elif stu:
                full_name = stu.full_name
                emp_code = stu.member_code or (stu.meta_data.get("roll_number") if isinstance(stu.meta_data, dict) else None) or f"stu{stu.id[-4:]}"
                desg = stu.specialization or stu.qualification or "Student"
                dept = stu.primary_vahd_location or ""
                parts = full_name.split()
                initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "ST"
            else:
                full_name = clean_lid
                emp_code = clean_lid
                desg = ""
                dept = ""
                parts = full_name.split()
                initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "EM"

            clean_in_loc = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', getattr(l, "check_in_location", None) or "").strip()
            clean_out_loc = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', getattr(l, "check_out_location", None) or "").strip()
            if clean_in_loc.lower() in ["face scanner", "biometric device", "webcam"]:
                clean_in_loc = ""
            if clean_out_loc.lower() in ["face scanner", "biometric device", "webcam"]:
                clean_out_loc = ""

            # Check-in location only applies if the person actually checked in
            if not l.check_in or l.check_in in ["--:--", "-", ""] or l.status == "Absent":
                clean_in_loc = ""

            # Check-out location only applies if the person actually checked out
            if not l.check_out or l.check_out in ["--:--", "-", ""]:
                clean_out_loc = ""

            fmt_date = l.date.strftime("%d/%m/%Y") if (l.date and hasattr(l.date, "strftime")) else str(l.date or target_date_slash)

            result.append({
                "id": l.id,
                "employee_id": l.employee_id,
                "employee_code": emp_code,
                "employee_name": full_name,
                "initials": initials,
                "designation": desg,
                "department": dept,
                "date": fmt_date,
                "check_in": l.check_in or "--:--",
                "check_out": l.check_out or "--:--",
                "check_in_location": clean_in_loc,
                "check_out_location": clean_out_loc,
                "check_in_latitude": getattr(l, "check_in_latitude", None),
                "check_in_longitude": getattr(l, "check_in_longitude", None),
                "check_out_latitude": getattr(l, "check_out_latitude", None),
                "check_out_longitude": getattr(l, "check_out_longitude", None),
                "status": l.status or ("Present" if l.check_in and l.check_in not in ["--:--", "-", ""] else "Absent"),
                "work_hours": float(l.work_hours or 0.0),
                "notes": l.notes or "",
                "email": emp.email if emp else "",
                "user_id": emp.id if emp else clean_lid
            })
            recorded_emp_ids.add(l.employee_id)
            recorded_emp_ids.add(clean_lid)
            if emp:
                recorded_emp_ids.add(emp.id)
                if emp.code:
                    recorded_emp_ids.add(emp.code)
                if emp.email:
                    recorded_emp_ids.add(emp.email.lower())

        # Index existing attendance rows comprehensively by employee id/code/name/email/variants for merging
        result_by_emp = {}
        for r in result:
            for k in [r.get("employee_id"), r.get("employee_code"), r.get("employee_name"), r.get("email"), r.get("user_id")]:
                if not k:
                    continue
                clean_k = str(k).strip().lower()
                result_by_emp[clean_k] = r
                if clean_k.startswith("emp_") or clean_k.startswith("cust_"):
                    result_by_emp[clean_k.replace("emp_", "").replace("cust_", "")] = r
                if clean_k.startswith("emp-"):
                    result_by_emp[clean_k.replace("emp-", "")] = r
                num_only = "".join(filter(str.isdigit, clean_k))
                if num_only:
                    result_by_emp[num_only] = r
                    result_by_emp[num_only.zfill(4)] = r
                    try:
                        result_by_emp[str(int(num_only))] = r
                    except Exception:
                        pass

        # Also pull staff / employee attendance from BiometricLog for target date (with timezone tolerance)
        start_of_day = datetime.combine(target_date, datetime.min.time()) - timedelta(hours=6)
        end_of_day = datetime.combine(target_date, datetime.max.time()) + timedelta(hours=6)
        bio_staff_logs = db.query(BiometricLog).filter(
            BiometricLog.timestamp >= start_of_day,
            BiometricLog.timestamp <= end_of_day,
            BiometricLog.status != "DENIED"
        ).order_by(BiometricLog.timestamp.desc()).all()

        for blog in bio_staff_logs:
            if not blog.timestamp:
                continue
            ts = blog.timestamp
            p_dates = {ts.date(), (ts + timedelta(hours=5, minutes=30)).date()}
            if ts.tzinfo:
                p_dates.add(ts.astimezone(IST).date())
            if target_date not in p_dates:
                continue

            # Skip enrollment and registration events - only real punches count for attendance logs
            if (
                blog.direction in ["ENROLL", "FACE_ENROLLMENT", "REGISTRATION"]
                or blog.event_type in ["ENROLL", "FACE_ENROLLMENT"]
                or (blog.meta_data and blog.meta_data.get("action") == "FACE_ENROLLMENT")
            ):
                continue

            meta = blog.meta_data or {}
            candidates = [
                str(blog.student_id or ""),
                str(meta.get("employee_id") or ""),
                str(meta.get("user_id") or ""),
                str(meta.get("student_id") or ""),
                str(meta.get("employee_code") or meta.get("code") or ""),
                str(meta.get("email") or "").lower(),
                str(meta.get("employee_name") or meta.get("user_name") or meta.get("name") or "").lower()
            ]

            emp_id = blog.student_id or meta.get("employee_id") or meta.get("user_id") or ""
            meta_code = str(meta.get("employee_code") or meta.get("code") or "")
            meta_email = str(meta.get("email") or "")

            is_out = blog.direction in ["CHECK_OUT", "OUT"]
            is_in = blog.direction in ["CHECK_IN", "IN"] or not is_out
            t_str = blog.timestamp.strftime("%I:%M %p") if blog.timestamp else "--:--"

            clean_dev = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', blog.device_name or "").strip()
            bio_loc = meta.get("location") or meta.get("branch") or (
                f"{meta.get('scheme_name')} ({meta.get('latitude'):.4f}, {meta.get('longitude'):.4f})"
                if meta.get("latitude") and meta.get("longitude")
                else clean_dev
            )
            if bio_loc.lower() in ["face scanner", "biometric device", "webcam"]:
                bio_loc = ""

            # Check if this employee already has an entry in result to merge punches
            existing_r = None
            for c in candidates:
                if not c:
                    continue
                clean_c = c.strip().lower()
                if clean_c in result_by_emp:
                    existing_r = result_by_emp[clean_c]
                    break
                num_only = "".join(filter(str.isdigit, clean_c))
                if num_only and num_only in result_by_emp:
                    existing_r = result_by_emp[num_only]
                    break
                if num_only and num_only.zfill(4) in result_by_emp:
                    existing_r = result_by_emp[num_only.zfill(4)]
                    break

            if existing_r:
                if is_in:
                    if not existing_r.get("check_in") or existing_r["check_in"] in ["--:--", "-", ""]:
                        existing_r["check_in"] = t_str
                    if bio_loc and (not existing_r.get("check_in_location") or existing_r["check_in_location"] in ["—", ""]):
                        existing_r["check_in_location"] = bio_loc
                    if getattr(blog, "meta_data", None) and blog.meta_data.get("latitude"):
                        existing_r["check_in_latitude"] = blog.meta_data.get("latitude")
                        existing_r["check_in_longitude"] = blog.meta_data.get("longitude")
                    if existing_r.get("status") in ["Absent", None, ""]:
                        existing_r["status"] = "Present"
                elif is_out:
                    if not existing_r.get("check_out") or existing_r["check_out"] in ["--:--", "-", ""]:
                        existing_r["check_out"] = t_str
                    if bio_loc and (not existing_r.get("check_out_location") or existing_r["check_out_location"] in ["—", ""]):
                        existing_r["check_out_location"] = bio_loc
                    if getattr(blog, "meta_data", None) and blog.meta_data.get("latitude"):
                        existing_r["check_out_latitude"] = blog.meta_data.get("latitude")
                        existing_r["check_out_longitude"] = blog.meta_data.get("longitude")
                continue

            if (
                not emp_id
                or emp_id in recorded_emp_ids
                or (meta_code and meta_code in recorded_emp_ids)
                or (meta_email and meta_email.lower() in recorded_emp_ids)
            ):
                continue

            # Lookup real Employee record by id, code, or user_id/email
            emp = db.query(Employee).filter(
                or_(
                    Employee.id == emp_id,
                    Employee.code == emp_id,
                    Employee.id == f"emp_{emp_id}",
                    Employee.email.ilike(emp_id),
                    Employee.email.ilike(meta_email) if meta_email else False
                )
            ).first()

            if not emp:
                t_usr = db.query(User).filter(User.id == emp_id).first()
                if t_usr:
                    emp = db.query(Employee).filter(
                        or_(
                            Employee.email.ilike(t_usr.email),
                            Employee.id == f"emp_{t_usr.id}"
                        )
                    ).first()

            stu = None
            if not emp:
                from src.models.student import student as StudentModel
                stu = db.query(StudentModel).filter(
                    or_(
                        StudentModel.id == emp_id,
                        StudentModel.user_id == emp_id,
                        StudentModel.member_code == emp_id,
                        StudentModel.id == f"cust_{emp_id}",
                        StudentModel.email.ilike(emp_id),
                        StudentModel.email.ilike(meta_email) if meta_email else False
                    )
                ).first()
                if not stu:
                    t_usr = db.query(User).filter(User.id == emp_id).first()
                    if t_usr:
                        stu = db.query(StudentModel).filter(
                            or_(
                                StudentModel.email.ilike(t_usr.email),
                                StudentModel.user_id == t_usr.id
                            )
                        ).first()

            if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                emp_br_id = getattr(emp, "branch_id", None) if emp else (getattr(stu, "branch_id", None) if stu else None)
                emp_br_name = getattr(emp, "vahd_branch", None) if emp else (getattr(stu, "primary_vahd_location", None) if stu else None)
                emp_sec = getattr(emp, "secondary_branches", None) or (emp.meta_data.get("secondary_branches") if (emp and emp.meta_data and isinstance(emp.meta_data, dict)) else []) or []
                sec_match = False
                if emp_sec:
                    for s in emp_sec:
                        s_str = str(s).lower()
                        if any(t_id.lower() in s_str or s_str in t_id.lower() for t_id in target_branch_ids if t_id) or \
                           any(tn.lower() in s_str or s_str in tn.lower() for tn in target_branch_names if tn):
                            sec_match = True
                            break

                matched_br = (
                    (emp_br_id and emp_br_id in target_branch_ids) or
                    (emp_br_name and any(tn.lower() in emp_br_name.lower() or emp_br_name.lower() in tn.lower() for tn in target_branch_names)) or
                    sec_match
                )
                if not matched_br:
                    continue

            if emp:
                real_emp_id = emp.id
                emp_name = f"{emp.first_name} {emp.last_name or ''}".strip()
                emp_code = emp.code or emp.id
                designation = emp.designation or meta.get("designation") or ""
                department = emp.department or meta.get("department") or ""
            elif stu:
                real_emp_id = stu.id
                emp_name = stu.full_name
                emp_code = stu.member_code or (stu.meta_data.get("roll_number") if isinstance(stu.meta_data, dict) else None) or f"stu{stu.id[-4:]}"
                designation = stu.specialization or stu.qualification or "Student"
                department = stu.primary_vahd_location or ""
            else:
                real_emp_id = emp_id
                emp_name = meta.get("employee_name") or meta.get("user_name") or meta.get("name") or "Staff Member"
                emp_code = meta.get("employee_code") or meta.get("code") or emp_id
                designation = meta.get("designation") or ""
                department = meta.get("department") or ""

            parts = emp_name.split()
            initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "EM"
            t_str = blog.timestamp.strftime("%I:%M %p") if blog.timestamp else "--:--"

            clean_dev = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', blog.device_name or "").strip()
            bio_loc = meta.get("location") or meta.get("branch") or (
                f"{meta.get('scheme_name')} ({meta.get('latitude'):.4f}, {meta.get('longitude'):.4f})"
                if meta.get("latitude") and meta.get("longitude")
                else (clean_dev or (emp.vahd_branch if emp else "") or "")
            )
            if bio_loc.lower() in ["face scanner", "biometric device", "webcam"]:
                bio_loc = ""

            result.append({
                "id": blog.id,
                "employee_id": real_emp_id,
                "employee_code": emp_code,
                "employee_name": emp_name,
                "initials": initials,
                "designation": designation,
                "department": department,
                "date": blog.timestamp.strftime("%d/%m/%Y") if blog.timestamp else target_date.strftime("%d/%m/%Y"),
                "check_in": t_str if is_in else "--:--",
                "check_out": t_str if is_out else "--:--",
                "check_in_location": bio_loc if is_in else "",
                "check_out_location": bio_loc if is_out else "",
                "check_in_latitude": meta.get("latitude") if is_in else None,
                "check_in_longitude": meta.get("longitude") if is_in else None,
                "check_out_latitude": meta.get("latitude") if is_out else None,
                "check_out_longitude": meta.get("longitude") if is_out else None,
                "status": "Present",
                "work_hours": 0.0,
                "notes": f"Biometric Punch ({blog.event_type or blog.direction or 'PUNCH'})",
                "email": emp.email if emp else meta_email,
                "user_id": emp.id if emp else real_emp_id
            })
            recorded_emp_ids.add(emp_id)
            if emp:
                recorded_emp_ids.add(emp.id)
                if emp.code:
                    recorded_emp_ids.add(emp.code)
                if emp.email:
                    recorded_emp_ids.add(emp.email.lower())

        return result

    @staticmethod
    def record_punch(db: Session, employee_id: str, action: str, note: Optional[str] = None,
                     latitude: Optional[float] = None, longitude: Optional[float] = None,
                     method: Optional[str] = "MANUAL", user_role: Optional[str] = "STAFF",
                     branch: Optional[str] = None, punch_date: Optional[str] = None,
                     punch_time: Optional[str] = None, check_out_time: Optional[str] = None,
                     status: Optional[str] = None, location: Optional[str] = None) -> Dict[str, Any]:
        now_ist = datetime.now(IST)
        if punch_date:
            try:
                today = datetime.strptime(punch_date.strip(), "%Y-%m-%d").date()
            except Exception:
                today = now_ist.date()
        else:
            today = now_ist.date()
        now_str = punch_time or now_ist.strftime("%I:%M %p")

        # Find active geofence scheme for branch / radius calculation
        scheme = None
        if branch:
            scheme = db.query(GeofenceScheme).filter(
                GeofenceScheme.branch_name.ilike(f"%{branch}%"),
                GeofenceScheme.is_active == True,
                GeofenceScheme.latitude.isnot(None)
            ).first()
            if not scheme:
                scheme = db.query(GeofenceScheme).filter(
                    GeofenceScheme.branch_name.ilike(f"%{branch}%"),
                    GeofenceScheme.is_active == True
                ).first()

        if not scheme:
            scheme = db.query(GeofenceScheme).filter(
                GeofenceScheme.is_active == True,
                GeofenceScheme.latitude.isnot(None)
            ).order_by(GeofenceScheme.updated_at.desc()).first()

        if not scheme:
            scheme = db.query(GeofenceScheme).filter(GeofenceScheme.is_active == True).first()

        distance = None
        is_within_geofence = True

        if scheme and scheme.latitude is not None and scheme.longitude is not None and latitude is not None and longitude is not None:
            distance = HrmsService.calculate_distance_meters(
                latitude, longitude, scheme.latitude, scheme.longitude
            )
            radius = scheme.radius_meters or 500
            is_within_geofence = distance <= radius

            if scheme.strict_restriction and not is_within_geofence:
                raise ValueError(
                    f"Geofence Restriction Active: Punch rejected. You are {distance:.0f}m away, which exceeds the permitted perimeter radius of {radius}m."
                )

        loc_label = location
        if loc_label:
            loc_label = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', str(loc_label)).strip()

        if not loc_label or loc_label.lower() in ["face scanner", "biometric device", "webcam"]:
            b_name = branch or (scheme.branch_name if scheme and scheme.branch_name else "")
            if latitude is not None and longitude is not None:
                loc_label = f"{b_name} ({latitude:.4f}, {longitude:.4f})".strip() if b_name else f"{latitude:.4f}, {longitude:.4f}"
            else:
                loc_label = b_name

        # Check shift timing for late flag using IST
        st_clean = (status or "").strip().lower()
        if "present" in st_clean or st_clean in ["p", "check_in", "check in"]:
            final_status = "Present"
        elif "late" in st_clean:
            final_status = "Late"
        elif "half" in st_clean or action == "HALF_DAY":
            final_status = "Half Day"
        elif any(x in st_clean for x in ["leave", "paid"]) or action in ["LEAVE", "PAID_LEAVE"]:
            final_status = "Paid Leave"
        elif any(x in st_clean for x in ["holiday", "hol"]):
            final_status = "Holiday"
        elif any(x in st_clean for x in ["week off", "wo", "off", "rest"]) or action in ["WEEK_OFF", "OFF"]:
            final_status = "Week Off"
        elif any(x in st_clean for x in ["absent", "a"]) or action in ["MARK_ABSENT", "ABSENT"]:
            final_status = "Absent"
        elif action in ["MARK_ABSENT", "ABSENT"]:
            final_status = "Absent"
        elif action in ["HALF_DAY"]:
            final_status = "Half Day"
        elif action in ["LEAVE", "PAID_LEAVE"]:
            final_status = "Paid Leave"
        else:
            final_status = "Present"
            if action == "CHECK_IN" and scheme and scheme.shift_start_time:
                try:
                    shift_time = datetime.strptime(scheme.shift_start_time.strip(), "%I:%M %p").time()
                    grace_mins = int(scheme.grace_period_mins or 0)
                    shift_total_mins = shift_time.hour * 60 + shift_time.minute + grace_mins
                    now_total_mins = now_ist.hour * 60 + now_ist.minute
                    if now_total_mins > shift_total_mins:
                        final_status = "Late"
                except Exception:
                    pass

        punch_notes = note or f"Punch via {method} ({action})"
        if distance is not None:
            punch_notes += f" | Distance: {distance:.0f}m"

        user_role_upper = (user_role or "STAFF").upper()
        display_name = "User"
        student_id_val = None

        from src.models.student import student
        cust = None
        if user_role_upper in ["STUDENT", "MEMBER"] or employee_id.startswith("cust_"):
            cust = db.query(student).filter(
                (student.id == employee_id) | (student.user_id == employee_id) | (student.email.ilike(employee_id)) | (student.id == f"cust_{employee_id}")
            ).first()
            if not cust:
                user = db.query(User).filter((User.id == employee_id) | (User.email.ilike(employee_id))).first()
                if user:
                    cust = db.query(student).filter((student.user_id == user.id) | (student.email == user.email)).first()
        elif not db.query(Employee).filter((Employee.id == employee_id) | (Employee.code == employee_id)).first():
            cust = db.query(student).filter((student.id == employee_id) | (student.user_id == employee_id) | (student.email.ilike(employee_id))).first()

        if cust or user_role_upper in ["STUDENT", "MEMBER"] or employee_id.startswith("cust_"):
            user_role_upper = "STUDENT"

            if cust:
                display_name = cust.full_name
                student_id_val = cust.id
                cust.status = "ACTIVE"
            else:
                display_name = "Student Member"
                student_id_val = employee_id

            # Save student attendance record into EmployeeAttendance table for dynamic matrix sync
            target_emp_id = student_id_val
            att = db.query(EmployeeAttendance).filter(
                EmployeeAttendance.employee_id == target_emp_id,
                EmployeeAttendance.date == today
            ).first()

            if not att:
                att = EmployeeAttendance(
                    id=f"att_{uuid.uuid4().hex[:8]}",
                    employee_id=target_emp_id,
                    date=today,
                    check_in=(punch_time or now_str) if final_status not in ["Absent", "Week Off", "Holiday"] else None,
                    check_out=check_out_time if final_status not in ["Absent", "Week Off", "Holiday"] else None,
                    check_in_location=loc_label if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_location=loc_label if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_in_latitude=latitude if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_in_longitude=longitude if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_latitude=latitude if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_longitude=longitude if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    status=final_status,
                    work_hours=4.0 if final_status == "Half Day" else (0.0 if final_status in ["Absent", "Week Off", "Holiday"] else 8.0),
                    notes=punch_notes
                )
                db.add(att)
            else:
                att.status = final_status
                if final_status in ["Absent", "Week Off", "Holiday"]:
                    att.check_in = None
                    att.check_out = None
                    att.check_in_location = None
                    att.check_out_location = None
                    att.work_hours = 0.0
                else:
                    if punch_time:
                        att.check_in = punch_time
                    elif action in ["CHECK_IN", "IN"]:
                        att.check_in = now_str
                    if action in ["CHECK_IN", "IN"] and not att.check_in_location:
                        att.check_in_location = loc_label
                        att.check_in_latitude = latitude
                        att.check_in_longitude = longitude
                    if check_out_time is not None:
                        att.check_out = check_out_time
                    elif action in ["CHECK_OUT", "OUT"]:
                        att.check_out = now_str
                    if action in ["CHECK_OUT", "OUT"]:
                        att.check_out_location = loc_label
                        att.check_out_latitude = latitude
                        att.check_out_longitude = longitude
                    att.work_hours = 4.0 if final_status == "Half Day" else 8.0
                if punch_notes:
                    att.notes = punch_notes
        else:
            # employee / Staff / Employee / Owner
            clean_id = (employee_id or "").strip()
            # 1. Direct match on id, code, or email
            emp = db.query(Employee).filter(
                (Employee.id == clean_id) |
                (Employee.code == clean_id) |
                (Employee.email.ilike(clean_id))
            ).first()

            # 2. Match with/without 'EMP-' prefix and zero-padded code
            if not emp:
                clean_num = clean_id.replace("EMP-", "").strip()
                emp = db.query(Employee).filter(
                    (Employee.id == f"emp_{clean_id}") |
                    (Employee.code == f"EMP-{clean_id}") |
                    (Employee.code == f"EMP-{clean_num.zfill(4)}") |
                    (Employee.code == clean_num.zfill(4)) |
                    (Employee.code == clean_num) |
                    (Employee.code.ilike(f"%{clean_num}%"))
                ).first()

            # 3. Match without 'emp_' prefix
            if not emp and clean_id.startswith("emp_"):
                raw_id = clean_id[4:]
                emp = db.query(Employee).filter(
                    (Employee.id == raw_id) |
                    (Employee.code == raw_id) |
                    (Employee.code == f"EMP-{raw_id}") |
                    (Employee.code == f"EMP-{raw_id.zfill(4)}")
                ).first()

            employee = None
            if not emp:
                employee = db.query(employeeProfile).filter(
                    (employeeProfile.id == clean_id) | (employeeProfile.email.ilike(clean_id)) | (employeeProfile.user_id == clean_id)
                ).first()
                if employee:
                    emp = db.query(Employee).filter((Employee.id == f"emp_{employee.id}") | (Employee.id == employee.id)).first()

            if not emp and user_role_upper == "OWNER":
                owner_user = db.query(User).filter(User.role == "OWNER").first()
                if owner_user:
                    emp = db.query(Employee).filter(
                        (Employee.email.ilike(owner_user.email)) | (Employee.id == f"emp_{owner_user.id}")
                    ).first()
                    if not emp:
                        full_name = getattr(owner_user, "full_name", None) or getattr(owner_user, "name", None) or owner_user.email
                        unique_code = f"EMP-{uuid.uuid4().hex[:4].upper()}"
                        emp = Employee(
                            id=f"emp_{owner_user.id}",
                            code=unique_code,
                            first_name=full_name,
                            email=owner_user.email,
                            designation="Owner",
                            department="",
                            status="Active"
                        )
                        db.add(emp)
                        db.flush()

            if not emp:
                # If still not found, check User table
                u = db.query(User).filter((User.id == clean_id) | (User.email.ilike(clean_id))).first()
                if u:
                    emp = db.query(Employee).filter((Employee.email.ilike(u.email)) | (Employee.id == f"emp_{u.id}")).first()

            if not emp:
                # Fallback to first existing active employee if this was a generic test punch
                emp = db.query(Employee).order_by(Employee.created_at.asc()).first()

            if not emp:
                full_name = (employee.full_name if employee else employee_id)
                unique_code = f"EMP-{uuid.uuid4().hex[:4].upper()}"
                emp = Employee(
                    id=f"emp_{employee.id if employee else uuid.uuid4().hex[:8]}",
                    code=unique_code,
                    first_name=full_name,
                    email=employee.email if employee else (employee_id if "@" in employee_id else f"{employee_id}@lazymonkey.ai"),
                    designation=employee.role if employee else "",
                    department="",
                    status="Active"
                )
                db.add(emp)
                db.flush()

            display_name = f"{emp.first_name} {emp.last_name or ''}".strip() or (employee.full_name if employee else emp.email)
            student_id_val = None

            # Shift Roster mapping for accurate presence evaluation
            roster = db.query(EmployeeShiftRoster).filter(
                EmployeeShiftRoster.employee_id == emp.id,
                EmployeeShiftRoster.date == today
            ).first()

            resolved_shift_code = (roster.shift_code if roster else getattr(emp, "shift_code", None))
            db_tmpl = db.query(ShiftTemplate).filter(ShiftTemplate.code.ilike(resolved_shift_code)).first() if resolved_shift_code else None
            resolved_shift_name = (roster.shift_name if roster else None) or (db_tmpl.name if db_tmpl else (f"{resolved_shift_code} Shift" if resolved_shift_code else ""))
            resolved_shift_id = (roster.shift_id if roster else None) or (db_tmpl.id if db_tmpl else None)
            shift_start_time = (roster.start_time if roster else None) or (db_tmpl.start_time if db_tmpl else "")
            shift_grace = int(db_tmpl.grace_period_mins if (db_tmpl and db_tmpl.grace_period_mins) else 0)

            # If punch is CHECK_IN and not explicitly marked absent/half-day, calculate attendance status based on shift start time & grace period
            if not status and action not in ["MARK_ABSENT", "ABSENT", "HALF_DAY", "LEAVE"]:
                if action == "CHECK_IN" and shift_start_time:
                    try:
                        expected_time = datetime.strptime(shift_start_time.strip(), "%H:%M").time()
                        punch_time_obj = now_ist.time()
                        expected_mins = expected_time.hour * 60 + expected_time.minute
                        actual_mins = punch_time_obj.hour * 60 + punch_time_obj.minute
                        grace = shift_grace
                        if actual_mins <= expected_mins + grace:
                            final_status = "Present"
                        else:
                            final_status = "Present (Late)"
                    except Exception:
                        final_status = "Present"
                elif action == "CHECK_IN":
                    final_status = "Present"

            if roster:
                roster.status = "ATTENDED" if final_status != "Absent" else "ABSENT"

            # Record in EmployeeAttendance
            att = db.query(EmployeeAttendance).filter(
                (EmployeeAttendance.employee_id == emp.id) | (EmployeeAttendance.employee_id == emp.code),
                EmployeeAttendance.date == today
            ).first()

            if not att:
                att = EmployeeAttendance(
                    id=f"att_{uuid.uuid4().hex[:8]}",
                    employee_id=emp.id,
                    date=today,
                    check_in=(punch_time or now_str) if final_status not in ["Absent", "Week Off", "Holiday"] else None,
                    check_out=check_out_time if final_status not in ["Absent", "Week Off", "Holiday"] else (now_str if action in ["CHECK_OUT", "OUT"] else None),
                    check_in_location=loc_label if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_location=loc_label if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_in_latitude=latitude if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_in_longitude=longitude if (action in ["CHECK_IN", "IN"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_latitude=latitude if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    check_out_longitude=longitude if (action in ["CHECK_OUT", "OUT"] and final_status not in ["Absent", "Week Off", "Holiday"]) else None,
                    status=final_status,
                    work_hours=0.0 if final_status in ["Absent", "Week Off", "Holiday"] else (4.0 if final_status == "Half Day" else 8.0),
                    shift_id=resolved_shift_id,
                    shift_code=resolved_shift_code,
                    shift_name=resolved_shift_name,
                    notes=punch_notes
                )
                db.add(att)
            else:
                att.employee_id = emp.id
                att.shift_id = resolved_shift_id
                att.shift_code = resolved_shift_code
                att.shift_name = resolved_shift_name
                att.status = final_status
                if final_status in ["Absent", "Week Off", "Holiday"]:
                    att.check_in = None
                    att.check_out = None
                    att.check_in_location = None
                    att.check_out_location = None
                    att.work_hours = 0.0
                else:
                    if punch_time:
                        att.check_in = punch_time
                    elif action in ["CHECK_IN", "IN"]:
                        att.check_in = now_str
                    if action in ["CHECK_IN", "IN"] and not att.check_in_location:
                        att.check_in_location = loc_label
                        att.check_in_latitude = latitude
                        att.check_in_longitude = longitude
                    if check_out_time is not None:
                        att.check_out = check_out_time
                    elif action in ["CHECK_OUT", "OUT"]:
                        att.check_out = now_str
                    if action in ["CHECK_OUT", "OUT"]:
                        att.check_out_location = loc_label
                        att.check_out_latitude = latitude
                        att.check_out_longitude = longitude
                    if att.check_in and att.check_out:
                        try:
                            for fmt in ["%I:%M %p", "%H:%M", "%I:%M%p"]:
                                try:
                                    t1 = datetime.strptime(att.check_in.strip(), fmt)
                                    break
                                except Exception:
                                    continue
                            for fmt in ["%I:%M %p", "%H:%M", "%I:%M%p"]:
                                try:
                                    t2 = datetime.strptime(att.check_out.strip(), fmt)
                                    break
                                except Exception:
                                    continue
                            diff_hours = (t2 - t1).total_seconds() / 3600.0
                            if diff_hours < 0:
                                diff_hours += 24.0
                            att.work_hours = max(0.1, round(diff_hours, 1))
                            if scheme and scheme.min_half_day_hours and att.work_hours < scheme.min_half_day_hours:
                                att.status = "Half Day"
                        except Exception:
                            att.work_hours = 8.0
                if punch_notes:
                    att.notes = punch_notes

        # Create unified BiometricLog entry visible on Owner Attendance Hub
        try:
            if method in ["FACE_ID", "FACE_SCAN"]:
                event_type = "FACE_SCAN"
                device_label = "Face Scanner"
            elif method in ["BIOMETRIC", "FINGERPRINT", "TOUCH"]:
                event_type = "FINGERPRINT"
                device_label = "Biometric Turnstile"
            elif method in ["RFID", "RFID_CARD", "CARD"]:
                event_type = "RFID_CARD"
                device_label = "RFID Sensor"
            elif method == "MANUAL":
                event_type = "MANUAL"
                device_label = "Manual Self Check-in"
            else:
                event_type = "GPS_SCAN"
                device_label = "GPS Mobile"

            log_timestamp = now_ist
            if punch_date:
                try:
                    p_d = datetime.strptime(punch_date.strip(), "%Y-%m-%d").date()
                    t_val = now_ist.time()
                    if punch_time:
                        for fmt in ["%I:%M %p", "%H:%M", "%I:%M%p", "%H:%M:%S"]:
                            try:
                                t_val = datetime.strptime(punch_time.strip(), fmt).time()
                                break
                            except Exception:
                                pass
                    log_timestamp = datetime.combine(p_d, t_val)
                except Exception:
                    pass

            resolved_branch = (
                branch
                or (scheme.branch_name if scheme and scheme.branch_name else None)
                or (emp.vahd_branch if 'emp' in locals() and emp and emp.vahd_branch else "")
            )

            bio_log = BiometricLog(
                id=f"bio_{uuid.uuid4().hex[:8]}",
                timestamp=log_timestamp,
                student_id=student_id_val,
                user_role=user_role_upper,
                event_type=event_type,
                device_type="GEOFENCE_ESS",
                device_id="ess_geofence_portal",
                device_name=f"{resolved_branch} ({device_label})".strip() if resolved_branch else str(device_label),
                direction=action,
                status="SUCCESS",
                confidence_score=0.99 if method == "FACE_ID" else 1.0,
                meta_data={
                    "user_id": employee_id,
                    "employee_id": (emp.id if 'emp' in locals() and emp else (employee.id if 'employee' in locals() and employee else employee_id)),
                    "employee_code": (emp.code if 'emp' in locals() and emp and emp.code else ""),
                    "user_name": display_name,
                    "employee_name": display_name,
                    "email": (emp.email if 'emp' in locals() and emp else (employee.email if 'employee' in locals() and employee else employee_id)),
                    "distance_meters": distance,
                    "within_perimeter": is_within_geofence,
                    "latitude": latitude,
                    "longitude": longitude,
                    "method": method,
                    "branch": resolved_branch,
                    "scheme_name": scheme.name if scheme and scheme.name else ""
                }
            )
            db.add(bio_log)
        except Exception as ex:
            print("Warning logging biometric record:", ex)

        db.commit()

        return {
            "message": f"Successfully Clocked {'In' if action == 'CHECK_IN' else 'Out'} at {now_str}",
            "action": action,
            "time": now_str,
            "status": final_status,
            "distance_meters": distance,
            "is_within_geofence": is_within_geofence,
            "method": method,
            "employee_name": display_name
        }

    # -------------------------------------------------------------
    # 3B. ATTENDANCE CORRECTIONS & APPROVALS METHODS
    # -------------------------------------------------------------
    @staticmethod
    def get_attendance_corrections(
        db: Session,
        date_str: Optional[str] = None,
        status: Optional[str] = None,
        person_type: Optional[str] = None,
        department: Optional[str] = None,
        district: Optional[str] = None,
        reason: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(AttendanceCorrection)

        if date_str and date_str.strip():
            try:
                if "/" in date_str:
                    d_obj = datetime.strptime(date_str.strip(), "%d/%m/%Y").date()
                else:
                    d_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
                query = query.filter(AttendanceCorrection.date == d_obj)
            except Exception:
                pass

        if status and status.strip() and status.lower() != "all":
            query = query.filter(AttendanceCorrection.status.ilike(status.strip()))

        if person_type and person_type.strip() and person_type.upper() != "ALL":
            query = query.filter(AttendanceCorrection.person_type.ilike(person_type.strip()))

        if department and department.strip() and department.lower() != "all":
            query = query.filter(AttendanceCorrection.department.ilike(f"%{department.strip()}%"))

        if district and district.strip() and district.lower() != "all" and "all district" not in district.lower():
            query = query.filter(
                (AttendanceCorrection.district.ilike(f"%{district.strip()}%")) |
                (AttendanceCorrection.place.ilike(f"%{district.strip()}%"))
            )

        if reason and reason.strip() and reason.lower() != "all" and "all reason" not in reason.lower():
            query = query.filter(AttendanceCorrection.reason.ilike(f"%{reason.strip()}%"))

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter(
                (AttendanceCorrection.person_name.ilike(s)) |
                (AttendanceCorrection.person_code.ilike(s)) |
                (AttendanceCorrection.designation.ilike(s)) |
                (AttendanceCorrection.place.ilike(s)) |
                (AttendanceCorrection.district.ilike(s)) |
                (AttendanceCorrection.department.ilike(s))
            )

        records = query.order_by(AttendanceCorrection.created_at.desc()).all()
        result = []
        for r in records:
            result.append({
                "id": r.id,
                "person_type": r.person_type or "EMPLOYEE",
                "person_id": r.person_id or "",
                "person_name": r.person_name,
                "person_code": r.person_code or "",
                "designation": r.designation or "",
                "department": r.department or "",
                "district": r.district or "",
                "place": r.place or "",
                "date": r.date.strftime("%Y-%m-%d") if r.date else "",
                "date_formatted": r.date.strftime("%d/%m/%Y") if r.date else "",
                "in_time": r.in_time or "",
                "out_time": r.out_time or "",
                "reason": r.reason or "",
                "reason_details": r.reason_details or "",
                "status": r.status or "Pending",
                "avatar": r.avatar or "",
                "approved_by": r.approved_by or "",
                "approved_at": r.approved_at.isoformat() if r.approved_at else None,
                "rejection_reason": r.rejection_reason or "",
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return result

    @staticmethod
    def get_attendance_corrections_stats(db: Session, date_str: Optional[str] = None) -> Dict[str, int]:
        query = db.query(AttendanceCorrection)
        if date_str and date_str.strip():
            try:
                if "/" in date_str:
                    d_obj = datetime.strptime(date_str.strip(), "%d/%m/%Y").date()
                else:
                    d_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
                query = query.filter(AttendanceCorrection.date == d_obj)
            except Exception:
                pass

        all_recs = query.all()
        total = len(all_recs)
        pending = sum(1 for r in all_recs if (r.status or "").lower() == "pending")
        approved = sum(1 for r in all_recs if (r.status or "").lower() == "approved")
        rejected = sum(1 for r in all_recs if (r.status or "").lower() == "rejected")
        present = approved if approved > 0 else total

        return {
            "total_records": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
            "present": present
        }

    @staticmethod
    def approve_attendance_correction(db: Session, correction_id: str, approved_by: str = "Admin") -> Dict[str, Any]:
        corr = db.query(AttendanceCorrection).filter(AttendanceCorrection.id == correction_id).first()
        if not corr:
            raise ValueError("Attendance correction request not found")
        corr.status = "Approved"
        corr.approved_by = approved_by
        corr.approved_at = datetime.utcnow()
        db.commit()
        return {"message": "Attendance correction approved successfully", "id": corr.id, "status": corr.status}

    @staticmethod
    def reject_attendance_correction(db: Session, correction_id: str, rejection_reason: Optional[str] = None) -> Dict[str, Any]:
        corr = db.query(AttendanceCorrection).filter(AttendanceCorrection.id == correction_id).first()
        if not corr:
            raise ValueError("Attendance correction request not found")
        corr.status = "Rejected"
        corr.rejection_reason = rejection_reason or "Rejected by administrator"
        db.commit()
        return {"message": "Attendance correction rejected", "id": corr.id, "status": corr.status}

    @staticmethod
    def batch_approve_attendance_corrections(db: Session, correction_ids: List[str], approved_by: str = "Admin") -> Dict[str, Any]:
        records = db.query(AttendanceCorrection).filter(AttendanceCorrection.id.in_(correction_ids)).all()
        count = 0
        for r in records:
            r.status = "Approved"
            r.approved_by = approved_by
            r.approved_at = datetime.utcnow()
            count += 1
        db.commit()
        return {"message": f"Successfully approved {count} attendance records", "count": count}

    @staticmethod
    def create_attendance_correction(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        today = datetime.now(IST).date()
        rec_date = today
        if payload.get("date"):
            try:
                rec_date = datetime.strptime(str(payload["date"])[:10], "%Y-%m-%d").date()
            except Exception:
                pass

        corr = AttendanceCorrection(
            id=f"corr_{uuid.uuid4().hex[:8]}",
            person_type=str(payload.get("person_type") or "EMPLOYEE").upper(),
            person_id=payload.get("person_id") or None,
            person_name=str(payload.get("person_name") or "").strip(),
            person_code=str(payload.get("person_code") or "").strip(),
            designation=str(payload.get("designation") or "").strip(),
            department=str(payload.get("department") or "").strip(),
            district=str(payload.get("district") or "").strip(),
            place=str(payload.get("place") or "").strip(),
            date=rec_date,
            in_time=str(payload.get("in_time") or "").strip(),
            out_time=str(payload.get("out_time") or "").strip(),
            reason=str(payload.get("reason") or "").strip(),
            reason_details=str(payload.get("reason_details") or "").strip(),
            status="Pending",
            avatar=str(payload.get("avatar") or "").strip(),
            created_at=datetime.utcnow()
        )
        db.add(corr)
        db.commit()
        db.refresh(corr)
        return {
            "id": corr.id,
            "person_name": corr.person_name,
            "status": corr.status,
            "message": "Attendance correction request submitted successfully"
        }

    @staticmethod
    def update_attendance_correction(
        db: Session, correction_id: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update pending attendance correction details.

        Only 'Pending' corrections are editable; approved/rejected records are
        immutable (status transitions go through the dedicated approve/reject
        flow to preserve the audit trail).

        Looked up by primary key; the TenantSession auto-filters the query to
        the caller's tenant scope, so a correction belonging to another
        organization is not visible and cannot be modified (returns not found).
        """
        corr = db.query(AttendanceCorrection).filter(
            AttendanceCorrection.id == correction_id
        ).first()
        if not corr:
            raise ValueError(f"Attendance correction request '{correction_id}' not found")
        if (corr.status or "").lower() != "pending":
            raise ValueError("Only pending attendance correction requests can be edited")

        if "in_time" in payload and payload["in_time"] is not None:
            corr.in_time = str(payload["in_time"]).strip()
        if "out_time" in payload and payload["out_time"] is not None:
            corr.out_time = str(payload["out_time"]).strip()
        if "reason" in payload and payload["reason"] is not None:
            corr.reason = str(payload["reason"]).strip()
        if "reason_details" in payload and payload["reason_details"] is not None:
            corr.reason_details = str(payload["reason_details"]).strip()
        if "date" in payload and payload["date"]:
            try:
                corr.date = datetime.strptime(str(payload["date"])[:10], "%Y-%m-%d").date()
            except Exception:
                pass

        db.commit()
        db.refresh(corr)
        return {
            "id": corr.id,
            "person_name": corr.person_name,
            "status": corr.status,
            "message": "Attendance correction request updated successfully"
        }

    @staticmethod
    def delete_attendance_correction(db: Session, correction_id: str) -> Dict[str, Any]:
        """Delete a pending attendance correction record.

        Tenant-scoped: if the correction belongs to another organization the
        TenantSession filter hides it and it is reported as 'not found'.
        """
        corr = db.query(AttendanceCorrection).filter(
            AttendanceCorrection.id == correction_id
        ).first()
        if not corr:
            raise ValueError(f"Attendance correction request '{correction_id}' not found")
        if (corr.status or "").lower() != "pending":
            raise ValueError("Only pending attendance correction requests can be deleted")

        db.delete(corr)
        db.commit()
        return {
            "id": correction_id,
            "message": "Attendance correction request deleted successfully"
        }



    # -------------------------------------------------------------
    # 4. LEAVE MANAGEMENT METHODS
    # -------------------------------------------------------------
    # 4. LEAVE MANAGEMENT & DYNAMIC POLICY CONFIGURATION ENGINE
    # -------------------------------------------------------------
    @staticmethod
    def get_leave_types(db: Session, active_only: bool = False) -> List[Dict[str, Any]]:
        """
        Returns all leave types / policies configured in the DB.
        Includes gender eligibility, paid/unpaid classification, quotas and rules.
        """
        query = db.query(LeaveType)
        if active_only:
            query = query.filter(LeaveType.is_active == True)
        leave_types = query.order_by(LeaveType.created_at.asc()).all()
        result = []
        for lt in leave_types:
            result.append({
                "id": lt.id,
                "name": lt.name,
                "code": lt.code,
                "category": lt.category or "General Leave",
                "description": lt.description or "",
                "paid_type": lt.paid_type or "PAID",
                "is_paid": bool(lt.is_paid if lt.is_paid is not None else True),
                "gender_eligibility": lt.gender_eligibility if isinstance(lt.gender_eligibility, list) else ["MALE", "FEMALE", "OTHER"],
                "employment_types": lt.employment_types if isinstance(lt.employment_types, list) else ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
                "applicable_departments": lt.applicable_departments if isinstance(lt.applicable_departments, list) else ["ALL"],
                "applicable_designations": lt.applicable_designations if isinstance(lt.applicable_designations, list) else ["ALL"],
                "min_service_days": lt.min_service_days or 0,
                "annual_quota": float(lt.annual_quota or 0.0),
                "max_consecutive_days": lt.max_consecutive_days,
                "carry_forward_allowed": bool(lt.carry_forward_allowed),
                "max_carry_forward_days": lt.max_carry_forward_days or 0,
                "encashment_allowed": bool(lt.encashment_allowed),
                "max_encashment_days": lt.max_encashment_days or 0,
                "attachment_required": bool(lt.attachment_required),
                "is_active": bool(lt.is_active if lt.is_active is not None else True),
                "created_at": lt.created_at.isoformat() if lt.created_at else None,
                "updated_at": lt.updated_at.isoformat() if lt.updated_at else None,
            })
        return result

    @staticmethod
    def create_leave_type(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new customizable leave policy in the DB."""
        name = str(payload.get("name") or "").strip()
        code = str(payload.get("code") or "").strip().upper()
        if not name or not code:
            raise ValueError("Leave Name and Code are required.")

        existing = db.query(LeaveType).filter((LeaveType.code == code) | (LeaveType.name == name)).first()
        if existing:
            raise ValueError(f"Leave type with name '{name}' or code '{code}' already exists.")

        paid_type = str(payload.get("paid_type") or ("PAID" if payload.get("is_paid", True) else "UNPAID")).upper()
        is_paid = paid_type != "UNPAID"
        category = str(payload.get("category") or "General Leave").strip()

        genders = payload.get("gender_eligibility")
        if genders is None:
            genders = ["MALE", "FEMALE", "OTHER"]
        elif isinstance(genders, str):
            genders = [g.strip().upper() for g in genders.split(",") if g.strip()]
        else:
            genders = [str(g).strip().upper() for g in genders]

        emp_types = payload.get("employment_types")
        if emp_types is None:
            emp_types = ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"]
        elif isinstance(emp_types, str):
            emp_types = [e.strip().upper() for e in emp_types.split(",") if e.strip()]
        else:
            emp_types = [str(e).strip().upper() for e in emp_types]

        lt = LeaveType(
            id=f"lt_{uuid.uuid4().hex[:8]}",
            name=name,
            code=code,
            category=category,
            description=str(payload.get("description") or "").strip(),
            paid_type=paid_type,
            is_paid=is_paid,
            gender_eligibility=genders,
            employment_types=emp_types,
            applicable_departments=payload.get("applicable_departments") or ["ALL"],
            applicable_designations=payload.get("applicable_designations") or ["ALL"],
            min_service_days=int(payload.get("min_service_days")) if payload.get("min_service_days") is not None else 0,
            annual_quota=float(payload.get("annual_quota")) if payload.get("annual_quota") is not None else 0.0,
            max_consecutive_days=int(payload.get("max_consecutive_days")) if payload.get("max_consecutive_days") is not None and str(payload.get("max_consecutive_days")).strip() != "" else None,
            carry_forward_allowed=bool(payload.get("carry_forward_allowed")),
            max_carry_forward_days=int(payload.get("max_carry_forward_days")) if payload.get("max_carry_forward_days") is not None else 0,
            encashment_allowed=bool(payload.get("encashment_allowed")),
            max_encashment_days=int(payload.get("max_encashment_days")) if payload.get("max_encashment_days") is not None else 0,
            attachment_required=bool(payload.get("attachment_required")),
            is_active=bool(payload.get("is_active", True)),
        )
        db.add(lt)
        db.commit()
        db.refresh(lt)
        return {"message": f"Leave policy '{name}' created successfully", "id": lt.id}

    @staticmethod
    def update_leave_type(db: Session, leave_type_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an existing leave policy configured by vahd Owner/Admin."""
        lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        if not lt:
            raise ValueError("Leave type policy not found.")

        if "name" in payload:
            lt.name = str(payload["name"]).strip()
        if "code" in payload:
            lt.code = str(payload["code"]).strip().upper()
        if "category" in payload:
            lt.category = str(payload["category"]).strip()
        if "description" in payload:
            lt.description = str(payload["description"]).strip()
        if "paid_type" in payload:
            lt.paid_type = str(payload["paid_type"]).upper()
            lt.is_paid = lt.paid_type != "UNPAID"
        elif "is_paid" in payload:
            lt.is_paid = bool(payload["is_paid"])
            lt.paid_type = "PAID" if lt.is_paid else "UNPAID"
        if "gender_eligibility" in payload:
            genders = payload["gender_eligibility"]
            if isinstance(genders, str):
                genders = [g.strip().upper() for g in genders.split(",") if g.strip()]
            lt.gender_eligibility = [g.upper() for g in genders]
        if "employment_types" in payload:
            emp_types = payload["employment_types"]
            if isinstance(emp_types, str):
                emp_types = [e.strip().upper() for e in emp_types.split(",") if e.strip()]
            lt.employment_types = [e.upper() for e in emp_types]
        if "applicable_departments" in payload:
            lt.applicable_departments = payload["applicable_departments"]
        if "applicable_designations" in payload:
            lt.applicable_designations = payload["applicable_designations"]
        if "min_service_days" in payload:
            lt.min_service_days = int(payload["min_service_days"])
        if "annual_quota" in payload:
            lt.annual_quota = float(payload["annual_quota"])
        if "max_consecutive_days" in payload:
            val = payload["max_consecutive_days"]
            lt.max_consecutive_days = int(val) if val is not None and str(val).strip() != "" else None
        if "carry_forward_allowed" in payload:
            lt.carry_forward_allowed = bool(payload["carry_forward_allowed"])
        if "max_carry_forward_days" in payload:
            lt.max_carry_forward_days = int(payload["max_carry_forward_days"])
        if "encashment_allowed" in payload:
            lt.encashment_allowed = bool(payload["encashment_allowed"])
        if "max_encashment_days" in payload:
            lt.max_encashment_days = int(payload["max_encashment_days"])
        if "attachment_required" in payload:
            lt.attachment_required = bool(payload["attachment_required"])
        if "is_active" in payload:
            lt.is_active = bool(payload["is_active"])

        lt.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(lt)
        return {"message": f"Leave policy '{lt.name}' updated successfully", "id": lt.id}

    @staticmethod
    def delete_leave_type(db: Session, leave_type_id: str) -> bool:
        """Deletes a leave policy."""
        lt = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
        if not lt:
            return False
        db.query(EmployeeLeaveBalance).filter(EmployeeLeaveBalance.leave_type_id == leave_type_id).delete()
        db.delete(lt)
        db.commit()
        return True

    @staticmethod
    def get_eligible_leave_types_for_employee(db: Session, employee_id: str) -> Dict[str, Any]:
        """
        Dynamically calculates and filters leave eligibility for a specific employee/employee.
        Applies Gender, Employment Type, Minimum Service Days, and Department rules.
        Calculates real-time allocated, used, pending, and remaining balances per eligible leave.
        """
        emp_id = str(employee_id or "").strip()
        emp = db.query(Employee).filter((Employee.id == emp_id) | (Employee.code == emp_id) | (Employee.email.ilike(emp_id))).first()
        employee = None
        if not emp:
            clean_id = emp_id.replace("emp_", "")
            employee = db.query(employeeProfile).filter(
                (employeeProfile.id == emp_id) | (employeeProfile.id == clean_id) | (employeeProfile.email.ilike(emp_id))
            ).first()
            if employee:
                emp = db.query(Employee).filter(Employee.id == f"emp_{employee.id}").first()

        emp_gender = "MALE"
        emp_name = "Employee"
        emp_dept = "General"
        emp_emp_type = "FULL_TIME"
        joined_d = date.today()

        if emp:
            emp_gender = (emp.gender or "MALE").strip().upper()
            emp_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            emp_dept = emp.department or "General"
            emp_emp_type = (emp.employment_type or "FULL_TIME").strip().upper().replace("-", "_").replace(" ", "_")
            joined_d = emp.joined_date or date.today()
        elif employee:
            emp_gender = (employee.gender or "MALE").strip().upper()
            emp_name = employee.full_name or "employee"
            emp_dept = employee.primary_vahd_location or "Fitness"
            joined_d = employee.created_at.date() if employee.created_at else date.today()

        service_days = max(0, (date.today() - joined_d).days)
        current_year = date.today().year
        year_start = date(current_year, 1, 1)
        year_end = date(current_year, 12, 31)

        # Query all active leave types
        active_policies = db.query(LeaveType).filter(LeaveType.is_active == True).order_by(LeaveType.created_at.asc()).all()

        matching_emp_ids = list(filter(None, {
            str(employee_id),
            str(emp.id) if emp else None,
            str(emp.code) if emp and emp.code else None,
            f"emp_{employee_id}" if not str(employee_id).startswith("emp_") else None,
            str(employee_id).replace("emp_", "") if str(employee_id).startswith("emp_") else None,
            getattr(emp, "email", None),
            getattr(employee, "id", None) if "employee" in locals() and employee else None,
            f"emp_{employee.id}" if "employee" in locals() and employee else None,
            getattr(employee, "email", None) if "employee" in locals() and employee else None,
        }))

        # Query employee approved leaves this year
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(matching_emp_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date >= year_start,
            LeaveRequest.start_date <= year_end
        ).all()

        # Query employee pending leaves this year
        pending_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(matching_emp_ids),
            LeaveRequest.status == "Pending",
            LeaveRequest.start_date >= year_start,
            LeaveRequest.start_date <= year_end
        ).all()

        # Custom balance overrides
        balances = db.query(EmployeeLeaveBalance).filter(
            EmployeeLeaveBalance.employee_id.in_(matching_emp_ids),
            EmployeeLeaveBalance.year == current_year
        ).all()
        bal_map = {b.leave_type_id: b for b in balances}

        eligible_types = []
        ineligible_types = []

        total_allocated = 0.0
        total_used = 0.0
        total_remaining = 0.0
        total_pending = 0.0

        for policy in active_policies:
            # 1. Gender check
            genders = [g.upper() for g in (policy.gender_eligibility or ["ALL"])]
            is_gender_eligible = "ALL" in genders or emp_gender in genders

            # 2. Service days check
            is_service_eligible = service_days >= (policy.min_service_days or 0)

            # 3. Employment type check
            emp_types = [e.upper().replace("-", "_").replace(" ", "_") for e in (policy.employment_types or ["ALL"])]
            is_emp_type_eligible = "ALL" in emp_types or emp_emp_type in emp_types

            # 4. Department check
            depts = [d.upper() for d in (policy.applicable_departments or ["ALL"])]
            is_dept_eligible = "ALL" in depts or emp_dept.upper() in depts

            is_eligible = is_gender_eligible and is_service_eligible and is_emp_type_eligible and is_dept_eligible

            # Calculate days used for this leave type
            used_days = sum(l.days for l in approved_leaves if (l.leave_type_id == policy.id or str(l.leave_type or "").lower() == str(policy.name or "").lower() or str(l.leave_type or "").lower() == str(policy.code or "").lower()))
            pending_days = sum(l.days for l in pending_leaves if (l.leave_type_id == policy.id or str(l.leave_type or "").lower() == str(policy.name or "").lower() or str(l.leave_type or "").lower() == str(policy.code or "").lower()))

            allocated_days = policy.annual_quota or 0.0
            if policy.id in bal_map:
                allocated_days = bal_map[policy.id].allocated_days

            remaining_days = max(0.0, allocated_days - used_days)

            item_data = {
                "id": policy.id,
                "name": policy.name,
                "code": policy.code,
                "category": policy.category or "General Leave",
                "description": policy.description or "",
                "paid_type": policy.paid_type or "PAID",
                "is_paid": policy.is_paid,
                "gender_eligibility": policy.gender_eligibility,
                "min_service_days": policy.min_service_days or 0,
                "annual_quota": allocated_days,
                "allocated_days": allocated_days,
                "used_days": used_days,
                "pending_days": pending_days,
                "remaining_days": remaining_days,
                "balance": {
                    "allocated_days": allocated_days,
                    "used_days": used_days,
                    "pending_days": pending_days,
                    "remaining_days": remaining_days,
                },
                "max_consecutive_days": policy.max_consecutive_days,
                "carry_forward_allowed": policy.carry_forward_allowed,
                "max_carry_forward_days": policy.max_carry_forward_days or 0,
                "encashment_allowed": policy.encashment_allowed,
                "max_encashment_days": policy.max_encashment_days or 0,
                "attachment_required": policy.attachment_required,
                "is_eligible": is_eligible,
                "ineligibility_reason": None
            }

            eligible_types.append(item_data)
            total_allocated += allocated_days
            total_used += used_days
            total_remaining += remaining_days
            total_pending += pending_days

            if not is_eligible:
                reasons = []
                if not is_gender_eligible:
                    reasons.append(f"Applicable to {', '.join(policy.gender_eligibility)} only (Employee is {emp_gender.capitalize()})")
                if not is_service_eligible:
                    reasons.append(f"Requires minimum {policy.min_service_days} service days (Employee has {service_days} days)")
                if not is_emp_type_eligible:
                    reasons.append(f"Applicable to {', '.join(policy.employment_types)} employment types")
                item_data["ineligibility_reason"] = "; ".join(reasons)
                ineligible_types.append(item_data)

        return {
            "employee_id": emp.id if emp else employee_id,
            "employee_name": emp_name,
            "gender": emp_gender,
            "department": emp_dept,
            "employment_type": emp_emp_type,
            "service_days": service_days,
            "summary": {
                "total_allocated": total_allocated,
                "total_used": total_used,
                "total_remaining": total_remaining,
                "total_pending": total_pending,
            },
            "eligible_leave_types": eligible_types,
            "ineligible_leave_types": ineligible_types,
        }

    @staticmethod
    def get_leaves(db: Session, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns leave applications enriched with policy metadata, employee gender, and paid/unpaid tags."""
        query = db.query(LeaveRequest)
        if status and status.upper() != "ALL":
            query = query.filter(LeaveRequest.status.ilike(status))
        leaves = query.order_by(LeaveRequest.created_at.desc()).all()
        result = []
        for l in leaves:
            emp = db.query(Employee).filter(Employee.id == l.employee_id).first()
            employee = None
            if not emp:
                clean_id = l.employee_id.replace("emp_", "")
                employee = db.query(employeeProfile).filter(
                    (employeeProfile.id == l.employee_id) | (employeeProfile.id == clean_id)
                ).first()
                if employee:
                    emp = db.query(Employee).filter(Employee.id == f"emp_{employee.id}").first()

            emp_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else (employee.full_name if employee else "")
            emp_code = emp.code if emp else (f"TR-{employee.id.replace('tr_', '').upper()}" if employee else "")
            emp_gender = emp.gender if emp else (employee.gender if employee and employee.gender else "Male")
            dept = emp.department if emp else (employee.primary_vahd_location if employee and employee.primary_vahd_location else "")
            designation = emp.designation if emp else (employee.role if employee and employee.role else "")

            # Match leave policy for code / paid status
            lt = None
            if l.leave_type_id:
                lt = db.query(LeaveType).filter(LeaveType.id == l.leave_type_id).first()
            if not lt:
                lt = db.query(LeaveType).filter((LeaveType.name.ilike(l.leave_type)) | (LeaveType.code.ilike(l.leave_type))).first()

            paid_type = l.paid_type or (lt.paid_type if lt else "PAID")
            is_paid = l.is_paid if l.is_paid is not None else (lt.is_paid if lt else True)

            result.append({
                "id": l.id,
                "employee_id": l.employee_id,
                "employee_name": emp_name,
                "employee_code": emp_code,
                "employee_gender": emp_gender or "Male",
                "department": dept or "",
                "designation": designation or "",
                "leave_type_id": l.leave_type_id or (lt.id if lt else ""),
                "leave_type": l.leave_type or (lt.name if lt else ""),
                "leave_type_code": lt.code if lt else "",
                "paid_type": paid_type,
                "is_paid": is_paid,
                "start_date": l.start_date.strftime("%d/%m/%Y") if l.start_date else "",
                "end_date": l.end_date.strftime("%d/%m/%Y") if l.end_date else "",
                "raw_start_date": l.start_date.isoformat() if l.start_date else "",
                "raw_end_date": l.end_date.isoformat() if l.end_date else "",
                "days": l.days or 0,
                "reason": l.reason or "",
                "status": l.status or "Pending",
                "approved_by": l.approved_by or "",
                "rejection_reason": l.rejection_reason or "",
                "attachment_url": l.attachment_url or "",
                "applied_on": l.created_at.strftime("%d/%m/%Y") if l.created_at else ""
            })
        return result

    @staticmethod
    def apply_leave(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Applies for leave with dynamic policy validation & eligibility check."""
        emp_id = str(payload.get("employee_id") or "").strip()
        if not emp_id:
            raise ValueError("Employee / employee ID is required.")

        # Ensure employee exists or resolve employee
        emp = db.query(Employee).filter((Employee.id == emp_id) | (Employee.code == emp_id) | (Employee.email.ilike(emp_id))).first()
        if not emp:
            clean_tid = emp_id.replace("emp_", "")
            employee = db.query(employeeProfile).filter((employeeProfile.id == emp_id) | (employeeProfile.id == clean_tid) | (employeeProfile.email.ilike(emp_id))).first()
            if employee:
                emp_id = f"emp_{employee.id}"
                emp = db.query(Employee).filter(Employee.id == emp_id).first()
                if not emp:
                    emp = Employee(
                        id=emp_id,
                        code=f"TR-{employee.id.replace('tr_', '').upper()}",
                        first_name=employee.full_name,
                        email=employee.email,
                        phone=employee.phone or "",
                        gender=employee.gender or "Male",
                        designation=employee.role or employee.specialization or "",
                        department=employee.primary_vahd_location or "",
                        status="Active",
                        salary=float(employee.base_monthly_salary or 0.0)
                    )
                    db.add(emp)
                    db.flush()

        start_str = payload.get("start_date")
        end_str = payload.get("end_date")
        if not start_str or not end_str:
            raise ValueError("Start date and end date are required.")

        start = datetime.strptime(start_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_str, "%Y-%m-%d").date()

        if end < start:
            raise ValueError("End date cannot be earlier than start date.")

        days = max(1, (end - start).days + 1)

        leave_type_input = str(payload.get("leave_type") or payload.get("leave_type_id") or "").strip()
        if not leave_type_input:
            raise ValueError("Leave type is required.")

        # Resolve leave policy
        lt = db.query(LeaveType).filter(
            (LeaveType.id == leave_type_input) |
            (LeaveType.code.ilike(leave_type_input)) |
            (LeaveType.name.ilike(leave_type_input))
        ).first()

        leave_type_name = lt.name if lt else leave_type_input
        leave_type_id = lt.id if lt else None
        paid_type = lt.paid_type if lt else ("PAID" if payload.get("is_paid", True) else "UNPAID")
        is_paid = lt.is_paid if lt else (paid_type != "UNPAID")

        # Optional policy checks
        if lt:
            pass

        leave = LeaveRequest(
            id=f"leave_{uuid.uuid4().hex[:8]}",
            employee_id=emp.id if emp else emp_id,
            leave_type_id=leave_type_id,
            leave_type=leave_type_name,
            paid_type=paid_type,
            is_paid=is_paid,
            start_date=start,
            end_date=end,
            days=days,
            reason=str(payload.get("reason") or "").strip(),
            attachment_url=str(payload.get("attachment_url") or "").strip(),
            status="Pending"
        )
        db.add(leave)
        db.commit()
        db.refresh(leave)
        return {"message": "Leave application submitted successfully", "id": leave.id}

    @staticmethod
    def update_leave_status(db: Session, leave_id: str, status: str, reviewer: Optional[str] = None, rejection_reason: Optional[str] = None) -> Dict[str, Any]:
        """Approves, rejects, or cancels a leave request."""
        leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
        if not leave:
            raise ValueError("Leave request not found")
        leave.status = status
        if reviewer:
            leave.approved_by = reviewer
        if rejection_reason:
            leave.rejection_reason = rejection_reason
        db.commit()
        return {"message": f"Leave request status updated to {status}"}

    @staticmethod
    def get_leave_balances_matrix(db: Session, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """Returns the complete leave balance matrix for all active employees across all leave types."""
        current_year = int(year) if year else date.today().year
        employees = db.query(Employee).filter(
            or_(func.upper(Employee.status) == "ACTIVE", Employee.status == "ACTIVE", Employee.status == "Active", Employee.status.is_(None))
        ).order_by(Employee.first_name.asc()).all()
        leave_types = db.query(LeaveType).filter(LeaveType.is_active == True).order_by(LeaveType.created_at.asc()).all()

        matrix = []
        for emp in employees:
            eligibility_info = HrmsService.get_eligible_leave_types_for_employee(db, emp.id)
            matrix.append({
                "employee_id": emp.id,
                "employee_code": emp.code,
                "employee_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
                "gender": emp.gender or "Male",
                "department": emp.department,
                "designation": emp.designation,
                "employment_type": emp.employment_type,
                "service_days": eligibility_info.get("service_days", 0),
                "summary": eligibility_info.get("summary", {}),
                "balances": eligibility_info.get("eligible_leave_types", []),
            })
        return matrix

    @staticmethod
    def adjust_leave_balance(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Manually adjusts or overrides leave balance for an employee."""
        emp_id = str(payload.get("employee_id") or "").strip()
        lt_id = str(payload.get("leave_type_id") or "").strip()
        allocated_days = float(payload.get("allocated_days", 0.0))
        year = int(payload.get("year", date.today().year))

        bal = db.query(EmployeeLeaveBalance).filter(
            EmployeeLeaveBalance.employee_id == emp_id,
            EmployeeLeaveBalance.leave_type_id == lt_id,
            EmployeeLeaveBalance.year == year
        ).first()

        if bal:
            bal.allocated_days = allocated_days
            bal.updated_at = datetime.utcnow()
        else:
            bal = EmployeeLeaveBalance(
                id=f"bal_{uuid.uuid4().hex[:8]}",
                employee_id=emp_id,
                leave_type_id=lt_id,
                year=year,
                allocated_days=allocated_days,
                used_days=0.0,
                pending_days=0.0
            )
            db.add(bal)
        db.commit()
        return {"message": "Leave balance adjusted successfully"}

    # -------------------------------------------------------------
    # 5. PAYROLL METHODS & DYNAMIC CALCULATION ENGINE
    # -------------------------------------------------------------
    @staticmethod
    def _parse_month_year(month: Optional[str], year: Optional[int]) -> tuple[int, int, str]:
        now_ist = datetime.now(IST)
        parsed_year = int(year) if year else now_ist.year
        parsed_month = now_ist.month

        if month:
            m_str = str(month).strip().lower()
            for idx, name in enumerate(calendar.month_name):
                if name and name.lower() == m_str:
                    parsed_month = idx
                    break
            else:
                for idx, abbr in enumerate(calendar.month_abbr):
                    if abbr and abbr.lower() == m_str:
                        parsed_month = idx
                        break
                else:
                    try:
                        parsed_month = int(m_str)
                    except ValueError:
                        parsed_month = now_ist.month

        month_name = calendar.month_name[parsed_month]
        return parsed_month, parsed_year, month_name

    @staticmethod
    def generate_batch_payroll(db: Session, employee_ids: List[str], month: Optional[str] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Dynamically generates monthly payroll for selected employees/staff based on:
        - Base monthly salary from employeeProfile
        - Biometric punches & attendance records for the month
        - Approved paid leaves (no deduction for approved paid/casual/sick leaves)
        - Unexcused absent days deduction = (base_monthly_salary / total_days) * absent_days
        - Net Salary = Base Salary Earned + Allowances - Deductions
        """
        month_num, year_num, month_name = HrmsService._parse_month_year(month, year)
        _, days_in_month = calendar.monthrange(year_num, month_num)
        month_year_key = f"{year_num}-{month_num:02d}"

        start_date = date(year_num, month_num, 1)
        end_date = date(year_num, month_num, days_in_month)
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # If employee_ids is empty or contains "ALL", fetch all active employees
        if not employee_ids or "ALL" in [t.upper() for t in employee_ids]:
            all_employees = db.query(employeeProfile).filter(employeeProfile.is_active == True).all()
            target_employee_ids = [t.id for t in all_employees]
        else:
            target_employee_ids = employee_ids

        generated_records = []

        for tid in target_employee_ids:
            clean_tid = tid.replace("emp_", "")
            employee = db.query(employeeProfile).filter(
                (employeeProfile.id == clean_tid) | (employeeProfile.id == tid) | (employeeProfile.email.ilike(tid))
            ).first()

            emp = db.query(Employee).filter(
                (Employee.id == tid) | (Employee.id == f"emp_{clean_tid}") | (Employee.code == tid)
            ).first()

            if not employee and not emp:
                continue

            # Ensure Employee record exists for HRMS tracking
            if employee and not emp:
                emp_id = f"emp_{employee.id}"
                emp = db.query(Employee).filter(Employee.id == emp_id).first()
                if not emp:
                    emp = Employee(
                        id=emp_id,
                        code=f"TR-{employee.id.replace('tr_', '').upper()}",
                        first_name=employee.full_name,
                        email=employee.email,
                        phone=employee.phone or "",
                        designation=employee.role or employee.specialization or "",
                        department=employee.primary_vahd_location or "",
                        status="Active",
                        salary=float(employee.base_monthly_salary or 0.0)
                    )
                    db.add(emp)
                    db.flush()

            full_name = employee.full_name if employee else f"{emp.first_name} {emp.last_name or ''}".strip()
            base_salary = float(employee.base_monthly_salary if employee else (emp.salary or 0.0))

            # 2. Count Biometric Punch days present in this month
            distinct_punch_days = set()
            bio_logs = db.query(BiometricLog).filter(
                BiometricLog.timestamp >= start_datetime,
                BiometricLog.timestamp <= end_datetime,
            ).all()

            search_ids = {clean_tid, tid}
            if employee and employee.user_id:
                search_ids.add(employee.user_id)
            if emp:
                search_ids.add(emp.id)

            for blog in bio_logs:
                meta = blog.meta_data or {}
                uid = str(blog.student_id or meta.get("user_id") or meta.get("employee_id") or "")
                if uid in search_ids or (blog.user_role in ["employee", "STAFF", "OWNER"] and meta.get("user_name") == full_name):
                    if blog.timestamp:
                        distinct_punch_days.add(blog.timestamp.date())

            # Also check EmployeeAttendance table
            if emp:
                emp_atts = db.query(EmployeeAttendance).filter(
                    EmployeeAttendance.employee_id == emp.id,
                    EmployeeAttendance.date >= start_date,
                    EmployeeAttendance.date <= end_date,
                    EmployeeAttendance.status.in_(["Present", "Late", "Half Day"])
                ).all()
                for ea in emp_atts:
                    if ea.date:
                        distinct_punch_days.add(ea.date)

            actual_punched_days = len(distinct_punch_days)

            # 3. Count Approved Paid Leaves in this month
            leave_records = db.query(LeaveRequest).filter(
                LeaveRequest.employee_id.in_(list(search_ids)),
                LeaveRequest.status == "Approved",
                LeaveRequest.start_date <= end_date,
                LeaveRequest.end_date >= start_date
            ).all()

            paid_leave_days = 0
            for lr in leave_records:
                if "unpaid" not in (lr.leave_type or "").lower():
                    # Calculate overlap with current month
                    l_start = max(start_date, lr.start_date)
                    l_end = min(end_date, lr.end_date)
                    paid_leave_days += max(0, (l_end - l_start).days + 1)

            effective_present_days = min(days_in_month, actual_punched_days + paid_leave_days)
            days_absent = max(0, days_in_month - effective_present_days)

            per_day_salary = base_salary / float(days_in_month) if days_in_month > 0 else 0.0
            base_salary_earned = round(per_day_salary * effective_present_days, 2)
            absent_deduction = round(per_day_salary * days_absent, 2)
            commission_earned = 0.0
            allowances = 0.0
            deductions = absent_deduction
            net_salary = round(base_salary_earned + commission_earned + allowances, 2)

            # 4. Save or Update PayrollRecord & PayrollInvoice
            emp_rec_id = f"pay_{emp.id if emp else clean_tid}_{year_num}{month_num:02d}"
            existing_rec = db.query(PayrollRecord).filter(PayrollRecord.id == emp_rec_id).first()

            if not existing_rec:
                existing_rec = PayrollRecord(
                    id=emp_rec_id,
                    employee_id=emp.id if emp else f"emp_{clean_tid}",
                    month=month_name,
                    year=year_num,
                    base_salary=base_salary,
                    allowances=allowances,
                    deductions=deductions,
                    net_salary=net_salary,
                    status="Pending",
                    payment_method=employee.upi_id if (employee and employee.upi_id) else (employee.bank_account_no if employee and employee.bank_account_no else "UPI")
                )
                db.add(existing_rec)
            else:
                existing_rec.base_salary = base_salary
                existing_rec.allowances = allowances
                existing_rec.deductions = deductions
                existing_rec.net_salary = net_salary
                existing_rec.month = month_name
                existing_rec.year = year_num

            # Update PayrollInvoice if employee
            if employee:
                inv_id = f"inv_{employee.id}_{month_year_key.replace('-', '')}"
                existing_inv = db.query(PayrollInvoice).filter(PayrollInvoice.id == inv_id).first()
                if not existing_inv:
                    existing_inv = PayrollInvoice(
                        id=inv_id,
                        employee_id=employee.id,
                        month_year=month_year_key,
                        days_present=effective_present_days,
                        days_absent=days_absent,
                        base_salary_earned=base_salary_earned,
                        commission_earned=commission_earned,
                        deductions=deductions,
                        net_salary=net_salary,
                        status="DRAFT"
                    )
                    db.add(existing_inv)
                else:
                    existing_inv.days_present = effective_present_days
                    existing_inv.days_absent = days_absent
                    existing_inv.base_salary_earned = base_salary_earned
                    existing_inv.commission_earned = commission_earned
                    existing_inv.deductions = deductions
                    existing_inv.net_salary = net_salary

            db.commit()

            generated_records.append({
                "id": existing_rec.id,
                "employee_id": employee.id if employee else clean_tid,
                "employee_id": emp.id if emp else f"emp_{clean_tid}",
                "employee_code": emp.code if emp else (f"TR-{clean_tid.replace('tr_', '').upper()}" if clean_tid else ""),
                "employee_name": full_name,
                "designation": emp.designation if emp else (employee.role if employee and employee.role else ""),
                "department": emp.department if emp else (employee.primary_vahd_location if employee and employee.primary_vahd_location else ""),
                "month": month_name,
                "year": year_num,
                "month_year": month_year_key,
                "base_salary": base_salary,
                "base_salary_earned": base_salary_earned,
                "days_present": effective_present_days,
                "days_absent": days_absent,
                "paid_leave_days": paid_leave_days,
                "commission_earned": commission_earned,
                "allowances": allowances,
                "deductions": deductions,
                "net_salary": net_salary,
                "status": existing_rec.status,
                "bank_account_no": employee.bank_account_no if employee else "",
                "bank_ifsc": employee.bank_ifsc if employee else "",
                "upi_id": employee.upi_id if employee else "",
                "payment_method": existing_rec.payment_method or "",
                "payment_date": existing_rec.payment_date.strftime("%d/%m/%Y") if existing_rec.payment_date else ""
            })

        return generated_records

    @staticmethod
    def get_payroll_records(db: Session, month: Optional[str] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
        query = db.query(PayrollRecord)
        if month:
            query = query.filter(PayrollRecord.month.ilike(f"%{month}%"))
        if year:
            query = query.filter(PayrollRecord.year == year)
        records = query.order_by(PayrollRecord.created_at.desc()).all()
        result = []
        for p in records:
            emp = db.query(Employee).filter(Employee.id == p.employee_id).first()
            employee_id = p.employee_id.replace("emp_", "")
            employee = db.query(employeeProfile).filter(
                (employeeProfile.id == employee_id) | (employeeProfile.id == p.employee_id)
            ).first()

            full_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else (employee.full_name if employee else "")
            parts = full_name.split()
            initials = "".join([part[0].upper() for part in parts[:2]]) if parts else ""

            # Look for linked PayrollInvoice for detailed breakdown
            inv = None
            if employee:
                inv = db.query(PayrollInvoice).filter(
                    (PayrollInvoice.employee_id == employee.id) | (PayrollInvoice.id.ilike(f"%{employee.id}%"))
                ).order_by(PayrollInvoice.created_at.desc()).first()

            result.append({
                "id": p.id,
                "employee_id": p.employee_id,
                "employee_id": employee.id if employee else employee_id,
                "employee_code": emp.code if emp else (f"EMP-{p.employee_id[:4].upper()}" if p.employee_id else ""),
                "employee_name": full_name,
                "initials": initials,
                "designation": emp.designation if emp else (employee.role if employee and employee.role else ""),
                "department": emp.department if emp else (employee.primary_vahd_location if employee and employee.primary_vahd_location else ""),
                "month": p.month,
                "year": p.year,
                "base_salary": float(p.base_salary or 0.0),
                "base_salary_earned": float(inv.base_salary_earned if inv else (p.base_salary or 0.0)),
                "days_present": int(inv.days_present if inv else 0),
                "days_absent": int(inv.days_absent if inv else 0),
                "commission_earned": float(inv.commission_earned if inv else 0.0),
                "allowances": float(p.allowances or 0.0),
                "deductions": float(p.deductions or (inv.deductions if inv else 0.0)),
                "net_salary": float(p.net_salary or 0.0),
                "status": p.status or "",
                "bank_account_no": employee.bank_account_no if employee else "",
                "bank_ifsc": employee.bank_ifsc if employee else "",
                "upi_id": employee.upi_id if employee else "",
                "payment_method": p.payment_method or "",
                "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "",
                "transaction_reference": inv.transaction_reference if inv else ""
            })
        return result

    @staticmethod
    def process_payroll_payout(db: Session, payroll_id: str, status: str = "Paid",
                               payment_method: Optional[str] = "UPI",
                               transaction_reference: Optional[str] = None) -> Dict[str, Any]:
        pay = db.query(PayrollRecord).filter(PayrollRecord.id == payroll_id).first()
        if not pay:
            raise ValueError("Payroll record not found")
        pay.status = status
        if payment_method:
            pay.payment_method = payment_method
        if status == "Paid":
            pay.payment_date = datetime.now(IST).date()

        # Also update PayrollInvoice if exists
        employee_id = pay.employee_id.replace("emp_", "")
        inv = db.query(PayrollInvoice).filter(
            (PayrollInvoice.employee_id == employee_id) | (PayrollInvoice.id.ilike(f"%{employee_id}%"))
        ).first()
        if inv:
            inv.status = "PAID" if status == "Paid" else "APPROVED"
            inv.payment_method = payment_method or "UPI"
            inv.transaction_reference = transaction_reference or f"TXN_{uuid.uuid4().hex[:8].upper()}"
            inv.paid_at = datetime.now(IST)

        db.commit()
        return {"message": f"Payroll payout status updated to {status}", "id": pay.id}

    # -------------------------------------------------------------
    # 6. RECRUITMENT METHODS
    # -------------------------------------------------------------
    @staticmethod
    def get_recruitment_overview(db: Session) -> Dict[str, Any]:
        jobs = db.query(RecruitmentJob).order_by(RecruitmentJob.posted_date.desc()).all()
        applicants = db.query(JobApplicant).order_by(JobApplicant.applied_date.desc()).all()

        job_list = []
        for j in jobs:
            app_count = db.query(JobApplicant).filter(JobApplicant.job_id == j.id).count()
            job_list.append({
                "id": j.id,
                "title": j.title,
                "department": j.department,
                "openings": j.openings,
                "job_type": j.job_type or "",
                "experience": j.experience or "",
                "salary_range": j.salary_range or "",
                "status": j.status,
                "posted_date": j.posted_date.strftime("%d/%m/%Y") if j.posted_date else "",
                "applicant_count": app_count
            })

        app_list = []
        for a in applicants:
            job = db.query(RecruitmentJob).filter(RecruitmentJob.id == a.job_id).first() if a.job_id else None
            app_list.append({
                "id": a.id,
                "job_id": a.job_id,
                "job_title": job.title if job else "",
                "department": job.department if job else "",
                "name": a.name,
                "email": a.email,
                "phone": a.phone or "",
                "stage": a.stage,
                "experience_years": float(a.experience_years or 0.0),
                "rating": float(a.rating or 0.0),
                "applied_date": a.applied_date.strftime("%d/%m/%Y") if a.applied_date else ""
            })

        return {
            "jobs": job_list,
            "applicants": app_list,
            "total_openings": sum(j.openings for j in jobs if j.status == "Open"),
            "total_applicants": len(applicants)
        }

    @staticmethod
    def update_applicant_stage(db: Session, applicant_id: str, new_stage: str) -> Dict[str, Any]:
        app = db.query(JobApplicant).filter(JobApplicant.id == applicant_id).first()
        if not app:
            raise ValueError("Applicant not found")
        app.stage = new_stage
        db.commit()
        return {"message": f"Candidate stage updated to {new_stage}"}

    # -------------------------------------------------------------
    # 7. PERFORMANCE METHODS
    # -------------------------------------------------------------
    @staticmethod
    def get_performance_reviews(db: Session) -> List[Dict[str, Any]]:
        perfs = db.query(EmployeePerformance).order_by(EmployeePerformance.created_at.desc()).all()
        result = []
        for p in perfs:
            emp = db.query(Employee).filter(Employee.id == p.employee_id).first()
            if not emp:
                continue
            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            parts = full_name.split()
            initials = "".join([part[0].upper() for part in parts[:2]]) if parts else "EM"
            result.append({
                "id": p.id,
                "employee_id": p.employee_id,
                "employee_code": emp.code,
                "employee_name": full_name,
                "initials": initials,
                "designation": emp.designation,
                "department": emp.department,
                "review_period": p.review_period,
                "score": float(p.score or 0.0),
                "kpi_ratings": p.kpi_ratings or [],
                "feedback": p.feedback or "",
                "reviewer": p.reviewer or "",
                "status": p.status
            })
        return result

    # -------------------------------------------------------------
    # 8. EXIT MANAGEMENT METHODS
    # -------------------------------------------------------------
    @staticmethod
    def get_exit_requests(db: Session) -> List[Dict[str, Any]]:
        exits = db.query(ExitRequest).order_by(ExitRequest.created_at.desc()).all()
        result = []
        for x in exits:
            emp = db.query(Employee).filter(Employee.id == x.employee_id).first()
            if not emp:
                continue
            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            parts = full_name.split()
            initials = "".join([part[0].upper() for part in parts[:2]]) if parts else "EM"
            result.append({
                "id": x.id,
                "employee_id": x.employee_id,
                "employee_code": emp.code,
                "employee_name": full_name,
                "initials": initials,
                "designation": emp.designation,
                "department": emp.department,
                "resignation_date": x.resignation_date.strftime("%d/%m/%Y") if x.resignation_date else "",
                "last_working_day": x.last_working_day.strftime("%d/%m/%Y") if x.last_working_day else "",
                "reason": x.reason or "",
                "handover_status": x.handover_status,
                "settlement_status": x.settlement_status,
                "status": x.status
            })
        return result

    @staticmethod
    def update_exit_status(db: Session, exit_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        req = db.query(ExitRequest).filter(ExitRequest.id == exit_id).first()
        if not req:
            raise ValueError("Exit request not found")
        if payload.get("status"):
            req.status = payload["status"]
        if payload.get("handover_status"):
            req.handover_status = payload["handover_status"]
        if payload.get("settlement_status"):
            req.settlement_status = payload["settlement_status"]
        db.commit()
        return {"message": "Exit status updated successfully"}

    # -------------------------------------------------------------
    # 14. SHIFT ROSTER & WORK CALENDAR METHODS
    # -------------------------------------------------------------
    @staticmethod
    def _get_dynamic_work_days_from_db(db: Session, branch_id: Optional[str] = None) -> List[str]:
        """Dynamically resolve active working days from WorkCalendarPolicy in DB, removing hardcoded days."""
        cal = None
        if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
            cal = db.query(WorkCalendarPolicy).filter(
                WorkCalendarPolicy.is_active == True,
                or_(WorkCalendarPolicy.id == branch_id, WorkCalendarPolicy.department == branch_id)
            ).first()
        if not cal:
            cal = db.query(WorkCalendarPolicy).filter(
                WorkCalendarPolicy.is_active == True,
                WorkCalendarPolicy.is_default == True
            ).first()
        if not cal:
            cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.is_active == True).first()

        if cal and cal.working_days:
            return [d[:3].capitalize() if len(d) > 3 else d for d in cal.working_days]
        if cal and cal.weekly_off_days:
            off_abbr = {d[:3].capitalize() if len(d) > 3 else d for d in cal.weekly_off_days}
            all_abbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            return [d for d in all_abbr if d not in off_abbr]
        return []

    @staticmethod
    def get_work_calendars(db: Session) -> List[Dict[str, Any]]:
        cals = db.query(WorkCalendarPolicy).order_by(WorkCalendarPolicy.created_at.asc()).all()
        holidays_count = db.query(CompanyHoliday).count()
        ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        result = []
        for c in cals:
            w_days = getattr(c, "working_days", []) or []
            off_days = c.weekly_off_days or []
            if w_days and not off_days:
                off_days = [d for d in ALL_DAYS if d not in w_days]
            elif off_days and not w_days:
                w_days = [d for d in ALL_DAYS if d not in off_days]
            elif not w_days and not off_days:
                w_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                off_days = ["Saturday", "Sunday"]

            result.append({
                "id": c.id,
                "name": c.name,
                "calendar_type": getattr(c, "calendar_type", None) or "Standard Corporate",
                "department": c.department or "All",
                "is_default": bool(getattr(c, "is_default", False)),
                "default_shift_code": c.default_shift_code or "",
                "working_days": w_days,
                "weekly_off_days": off_days,
                "shift_timings": getattr(c, "shift_timings", []) or [],
                "is_active": bool(c.is_active),
                "holidays_count": holidays_count,
            })
        return result

    @staticmethod
    def save_work_calendar(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        cal_id = payload.get("id")
        cal = None
        if cal_id:
            cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.id == cal_id).first()
        if not cal:
            name = (payload.get("name") or "").strip()
            if name:
                cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.name == name).first()

        working_days = payload.get("working_days") or []
        weekly_off_days = payload.get("weekly_off_days") or []
        ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        if working_days and not weekly_off_days:
            weekly_off_days = [d for d in ALL_DAYS if d not in working_days]
        elif weekly_off_days and not working_days:
            working_days = [d for d in ALL_DAYS if d not in weekly_off_days]
        elif not working_days and not weekly_off_days:
            working_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            weekly_off_days = ["Saturday", "Sunday"]

        is_def = bool(payload.get("is_default", False))
        existing_default = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.is_default == True).first()
        if not existing_default and not cal:
            is_def = True

        if not cal:
            name = (payload.get("name") or "").strip()
            if not name:
                raise ValueError("Calendar name is required")
            cal = WorkCalendarPolicy(
                id=f"cal_{uuid.uuid4().hex[:8]}",
                name=name,
                calendar_type=payload.get("calendar_type") or "Standard Corporate",
                department=payload.get("department") or "All",
                is_default=is_def,
                default_shift_code=payload.get("default_shift_code") or None,
                working_days=working_days,
                weekly_off_days=weekly_off_days,
                shift_timings=payload.get("shift_timings") or [],
                is_active=bool(payload.get("is_active", True))
            )
            db.add(cal)
        else:
            if "name" in payload and payload["name"]:
                cal.name = payload["name"].strip()
            if "calendar_type" in payload and payload["calendar_type"]:
                cal.calendar_type = payload["calendar_type"]
            if "department" in payload:
                cal.department = payload["department"]
            if "is_default" in payload:
                cal.is_default = is_def
            if "default_shift_code" in payload:
                cal.default_shift_code = payload["default_shift_code"]
            cal.working_days = working_days
            cal.weekly_off_days = weekly_off_days
            if "shift_timings" in payload:
                cal.shift_timings = payload["shift_timings"]
            if "is_active" in payload:
                cal.is_active = bool(payload["is_active"])

        if is_def:
            db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.id != cal.id).update({"is_default": False})

        db.commit()
        db.refresh(cal)
        return {
            "id": cal.id,
            "name": cal.name,
            "calendar_type": getattr(cal, "calendar_type", "Standard Corporate"),
            "department": cal.department,
            "is_default": bool(getattr(cal, "is_default", False)),
            "default_shift_code": cal.default_shift_code,
            "working_days": getattr(cal, "working_days", []) or [],
            "weekly_off_days": cal.weekly_off_days or [],
            "shift_timings": getattr(cal, "shift_timings", []) or [],
            "is_active": bool(cal.is_active)
        }

    @staticmethod
    def delete_work_calendar(db: Session, cal_id: str) -> Dict[str, Any]:
        cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.id == cal_id).first()
        if not cal:
            raise ValueError(f"Calendar with ID {cal_id} not found")
        db.delete(cal)
        db.commit()
        return {"status": "success", "message": "Work calendar deleted successfully"}

    @staticmethod
    def add_calendar_shift_timing(db: Session, cal_id: str, timing_payload: Dict[str, Any]) -> Dict[str, Any]:
        cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.id == cal_id).first()
        if not cal:
            raise ValueError(f"Work calendar with ID {cal_id} not found")
        current_timings = list(getattr(cal, "shift_timings", []) or [])
        new_timing = {
            "id": f"st_{uuid.uuid4().hex[:8]}",
            "name": timing_payload.get("name", "Shift Timing").strip(),
            "start_time": timing_payload.get("start_time", "09:00").strip(),
            "end_time": timing_payload.get("end_time", "18:00").strip()
        }
        current_timings.append(new_timing)
        cal.shift_timings = current_timings
        db.commit()
        db.refresh(cal)
        return new_timing

    @staticmethod
    def delete_calendar_shift_timing(db: Session, cal_id: str, timing_id: str) -> Dict[str, Any]:
        cal = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.id == cal_id).first()
        if not cal:
            raise ValueError(f"Work calendar with ID {cal_id} not found")
        current_timings = list(getattr(cal, "shift_timings", []) or [])
        updated_timings = [t for t in current_timings if t.get("id") != timing_id]
        cal.shift_timings = updated_timings
        db.commit()
        db.refresh(cal)
        return {"status": "success", "message": "Shift timing removed successfully"}

    @staticmethod
    def _normalize_time_str(val: Optional[str]) -> str:
        if not val:
            return ""
        s = str(val).strip()
        if re.match(r'^\d{2}:\d{2}', s):
            return s[:5]
        if re.match(r'^\d{1}:\d{2}', s):
            return f"0{s[:4]}"
        return s

    @staticmethod
    def get_shift_templates(
        db: Session,
        branch_id: Optional[str] = None,
        ho_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return shift templates, filtered by org/branch when supplied."""
        query = db.query(ShiftTemplate).filter(ShiftTemplate.is_active == True)
        if branch_id and str(branch_id).lower() not in ("all", "", "none", "undefined", "null"):
            query = query.filter(
                or_(
                    ShiftTemplate.branch_id == branch_id,
                    ShiftTemplate.branch_id.is_(None),
                    ShiftTemplate.branch_id == "",
                )
            )
        elif ho_id and str(ho_id).lower() not in ("all", "", "none", "undefined", "null"):
            query = query.filter(
                or_(
                    ShiftTemplate.ho_id == ho_id,
                    ShiftTemplate.ho_id.is_(None),
                    ShiftTemplate.ho_id == "",
                )
            )
        templates = query.order_by(ShiftTemplate.created_at.asc()).all()
        return [
            {
                "id": t.id,
                "code": t.code,
                "name": t.name,
                "start_time": HrmsService._normalize_time_str(t.start_time),
                "end_time": HrmsService._normalize_time_str(t.end_time),
                "duration_hours": t.duration_hours,
                "break_mins": t.break_mins,
                "grace_period_mins": t.grace_period_mins,
                "is_night_shift": bool(t.is_night_shift),
                "color": t.color or "#7c3aed",
                "is_active": bool(t.is_active),
                "assign_type": t.assign_type or "both",
                "from_date": t.from_date or "",
                "to_date": t.to_date or "",
                "num_members": t.num_members,
                "member_ids": t.member_ids or [],
                "work_days": t.work_days or HrmsService._get_dynamic_work_days_from_db(db, t.branch_id),
                "branch_id": t.branch_id or "",
                "ho_id": t.ho_id or "",
            }
            for t in templates
        ]

    @staticmethod
    def get_shift_template_by_id(db: Session, template_id: str) -> Dict[str, Any]:
        """Fetch a single shift template by ID or code dynamically from the DB with all fields."""
        tmpl = db.query(ShiftTemplate).filter(
            or_(ShiftTemplate.id == template_id, ShiftTemplate.code.ilike(template_id))
        ).first()
        if not tmpl:
            raise ValueError(f"Shift template '{template_id}' not found")

        dynamic_work_days = HrmsService._get_dynamic_work_days_from_db(db, tmpl.branch_id)
        return {
            "id": tmpl.id,
            "code": tmpl.code,
            "name": tmpl.name,
            "start_time": HrmsService._normalize_time_str(tmpl.start_time),
            "end_time": HrmsService._normalize_time_str(tmpl.end_time),
            "duration_hours": tmpl.duration_hours,
            "break_mins": tmpl.break_mins,
            "grace_period_mins": tmpl.grace_period_mins,
            "is_night_shift": bool(tmpl.is_night_shift),
            "color": tmpl.color or "",
            "is_active": bool(tmpl.is_active),
            "assign_type": tmpl.assign_type or "",
            "from_date": tmpl.from_date or "",
            "to_date": tmpl.to_date or "",
            "num_members": tmpl.num_members,
            "member_ids": tmpl.member_ids or [],
            "work_days": tmpl.work_days or dynamic_work_days,
            "branch_id": tmpl.branch_id or "",
            "ho_id": tmpl.ho_id or "",
        }

    @staticmethod
    def get_shift_cell(db: Session, employee_id: str, date_str: str) -> Dict[str, Any]:
        """Fetch the exact shift record for an employee on a specific date dynamically from DB with all fields."""
        try:
            d_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
        except Exception:
            raise ValueError("Invalid date format, expected YYYY-MM-DD")

        clean_sid = str(employee_id).replace("cust_", "").replace("emp_", "")
        emp_matches = [
            EmployeeShiftRoster.employee_id == str(employee_id),
            EmployeeShiftRoster.employee_id == clean_sid,
            EmployeeShiftRoster.employee_id == f"cust_{employee_id}",
            EmployeeShiftRoster.employee_id == f"cust_{clean_sid}",
            EmployeeShiftRoster.employee_id == f"emp_{clean_sid}"
        ]

        emp_obj = db.query(Employee).filter(
            or_(Employee.id == str(employee_id), Employee.id == clean_sid, Employee.code == str(employee_id))
        ).first()
        if emp_obj:
            emp_name = f"{emp_obj.first_name or ''} {emp_obj.last_name or ''}".strip() or emp_obj.code or employee_id
        else:
            stu_obj = db.query(student).filter(or_(student.id == str(employee_id), student.id == clean_sid)).first()
            emp_name = stu_obj.full_name if (stu_obj and stu_obj.full_name) else employee_id

        roster = db.query(EmployeeShiftRoster).filter(
            or_(*emp_matches),
            EmployeeShiftRoster.date == d_obj
        ).first()

        db_shift_templates = db.query(ShiftTemplate).filter(ShiftTemplate.is_active == True).all()
        emp_candidate_keys = {str(employee_id), clean_sid, f"emp_{clean_sid}", f"cust_{clean_sid}"}
        if emp_obj and emp_obj.code:
            emp_candidate_keys.add(str(emp_obj.code).strip())

        assigned_tpl = None
        for tpl in db_shift_templates:
            tpl_members = set(str(m).strip() for m in (tpl.member_ids or []))
            if emp_candidate_keys & tpl_members:
                assigned_tpl = tpl
                break

        day_abbr = d_obj.strftime("%a")
        if roster:
            meta = None
            if roster.shift_code and roster.shift_code != "OFF":
                meta = next((t for t in db_shift_templates if t.code.upper() == roster.shift_code.upper()), None)
            return {
                "employee_id": employee_id,
                "employee_name": emp_name,
                "date": date_str,
                "shift_id": roster.shift_id or (meta.id if meta else None),
                "shift_code": roster.shift_code,
                "shift_name": roster.shift_name,
                "start_time": HrmsService._normalize_time_str(roster.start_time or (meta.start_time if meta else "")),
                "end_time": HrmsService._normalize_time_str(roster.end_time or (meta.end_time if meta else "")),
                "is_off": bool(roster.is_weekly_off or roster.shift_code == "OFF"),
                "break_mins": meta.break_mins if meta else None,
                "grace_period_mins": meta.grace_period_mins if meta else None,
                "color": meta.color if (meta and meta.color) else (roster.color if hasattr(roster, 'color') and roster.color else "")
            }
        elif assigned_tpl:
            tpl_work_days = assigned_tpl.work_days or HrmsService._get_dynamic_work_days_from_db(db, assigned_tpl.branch_id)
            is_work_day = day_abbr in tpl_work_days
            return {
                "employee_id": employee_id,
                "employee_name": emp_name,
                "date": date_str,
                "shift_id": assigned_tpl.id if is_work_day else None,
                "shift_code": assigned_tpl.code if is_work_day else "OFF",
                "shift_name": assigned_tpl.name if is_work_day else "Rest Day",
                "start_time": HrmsService._normalize_time_str(assigned_tpl.start_time) if is_work_day else "",
                "end_time": HrmsService._normalize_time_str(assigned_tpl.end_time) if is_work_day else "",
                "is_off": not is_work_day,
                "break_mins": assigned_tpl.break_mins if is_work_day else None,
                "grace_period_mins": assigned_tpl.grace_period_mins if is_work_day else None,
                "color": assigned_tpl.color if (is_work_day and assigned_tpl.color) else ""
            }
        else:
            first_tpl = db_shift_templates[0] if db_shift_templates else None
            return {
                "employee_id": employee_id,
                "employee_name": emp_name,
                "date": date_str,
                "shift_id": first_tpl.id if first_tpl else None,
                "shift_code": first_tpl.code if first_tpl else "",
                "shift_name": first_tpl.name if first_tpl else "",
                "start_time": HrmsService._normalize_time_str(first_tpl.start_time) if first_tpl else "",
                "end_time": HrmsService._normalize_time_str(first_tpl.end_time) if first_tpl else "",
                "is_off": False,
                "break_mins": first_tpl.break_mins if first_tpl else None,
                "grace_period_mins": first_tpl.grace_period_mins if first_tpl else None,
                "color": first_tpl.color if first_tpl else ""
            }

    @staticmethod
    def save_shift_template(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a shift template, persisting all fields including org scope."""
        t_id = payload.get("id")
        template = None
        if t_id:
            template = db.query(ShiftTemplate).filter(ShiftTemplate.id == t_id).first()
        if not template and payload.get("code"):
            template = db.query(ShiftTemplate).filter(ShiftTemplate.code == payload["code"].strip().upper()).first()
        if not template:
            code = (payload.get("code") or "").strip().upper()
            name = (payload.get("name") or "").strip()
            if not code or not name:
                raise ValueError("Shift code and name are required")
            template = ShiftTemplate(
                id=f"shift_{uuid.uuid4().hex[:8]}",
                code=code,
                name=name,
                start_time=HrmsService._normalize_time_str(payload.get("start_time")),
                end_time=HrmsService._normalize_time_str(payload.get("end_time")),
                duration_hours=float(payload.get("duration_hours")) if payload.get("duration_hours") is not None else None,
                break_mins=int(payload.get("break_mins")) if payload.get("break_mins") is not None else None,
                grace_period_mins=int(payload.get("grace_period_mins")) if payload.get("grace_period_mins") is not None else None,
                is_night_shift=bool(payload.get("is_night_shift", False)),
                color=payload.get("color"),
                is_active=bool(payload.get("is_active", True)),
                assign_type=payload.get("assign_type", "both"),
                from_date=payload.get("from_date") or None,
                to_date=payload.get("to_date") or None,
                num_members=int(payload.get("num_members")) if payload.get("num_members") is not None else None,
                member_ids=payload.get("member_ids") or [],
                work_days=payload.get("work_days") or HrmsService._get_dynamic_work_days_from_db(db, payload.get("branch_id")),
                branch_id=payload.get("branch_id") or None,
                ho_id=payload.get("ho_id") or None,
            )
            db.add(template)
        else:
            for k in [
                "name", "start_time", "end_time", "duration_hours", "break_mins",
                "grace_period_mins", "is_night_shift", "color", "is_active",
                "assign_type", "from_date", "to_date", "num_members", "member_ids", "work_days", "branch_id", "ho_id",
            ]:
                if k in payload:
                    val = payload[k]
                    if k in ("start_time", "end_time") and val is not None:
                        val = HrmsService._normalize_time_str(val)
                    if k == "num_members" and val is not None:
                        val = int(val)
                    if k in ("from_date", "to_date", "branch_id", "ho_id") and val == "":
                        val = None
                    setattr(template, k, val)
        db.commit()
        db.refresh(template)

        # 1. Update existing EmployeeShiftRoster records referencing this template so time/name changes overwrite live
        try:
            db.query(EmployeeShiftRoster).filter(
                or_(
                    EmployeeShiftRoster.shift_id == template.id,
                    EmployeeShiftRoster.shift_code == template.code
                )
            ).update({
                EmployeeShiftRoster.shift_name: template.name,
                EmployeeShiftRoster.start_time: template.start_time or "",
                EmployeeShiftRoster.end_time: template.end_time or "",
            }, synchronize_session=False)
            db.commit()
        except Exception as sync_err:
            db.rollback()
            print(f"[ShiftTemplate] Failed to sync existing rosters with updated template: {sync_err}")

        # 2. If member_ids are supplied, auto-apply and OVERWRITE roster for those members across their work days
        member_ids_to_apply = payload.get("member_ids") or template.member_ids or []
        f_date_str = template.from_date or payload.get("from_date")
        t_date_str = template.to_date or payload.get("to_date")
        if member_ids_to_apply:
            try:
                today = datetime.now(IST).date()
                start_dt = None
                if f_date_str:
                    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y"]:
                        try:
                            start_dt = datetime.strptime(str(f_date_str).strip()[:10], fmt).date()
                            break
                        except Exception:
                            pass
                if not start_dt:
                    start_dt = today

                # Always align start_dt to Sunday of the active week so that the entire active week's roster
                # is cleanly overwritten in the database instead of leaving partial days with stale shifts.
                days_since_sunday = (start_dt.weekday() + 1) % 7  # 0 if Sun, 1 if Mon, ..., 6 if Sat
                start_dt = start_dt - timedelta(days=days_since_sunday)

                end_dt = None
                if t_date_str:
                    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y"]:
                        try:
                            end_dt = datetime.strptime(str(t_date_str).strip()[:10], fmt).date()
                            break
                        except Exception:
                            pass
                if not end_dt or end_dt < start_dt:
                    # By default cover at least 35 days from start_dt
                    end_dt = start_dt + timedelta(days=35)
                else:
                    # Align end_dt to the end of its week (Saturday)
                    days_to_sat = (5 - end_dt.weekday()) % 7
                    end_dt = end_dt + timedelta(days=days_to_sat)

                DAY_NAME_MAP = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
                dynamic_db_work_days = HrmsService._get_dynamic_work_days_from_db(db, template.branch_id if hasattr(template, 'branch_id') else None)
                allowed_days = template.work_days or payload.get("work_days") or dynamic_db_work_days
                work_dates_list = []
                off_dates_list = []
                cur = start_dt
                while cur <= end_dt:
                    day_abbr = DAY_NAME_MAP.get(cur.weekday())
                    d_str = cur.strftime("%Y-%m-%d")
                    if day_abbr in allowed_days:
                        work_dates_list.append(d_str)
                    else:
                        off_dates_list.append(d_str)
                    cur += timedelta(days=1)

                # Overwrite work days with the shift template
                if work_dates_list:
                    HrmsService.assign_shift(db, {
                        "employee_ids": member_ids_to_apply,
                        "dates": work_dates_list,
                        "shift_code": template.code,
                        "shift_name": template.name,
                        "start_time": template.start_time or "",
                        "end_time": template.end_time or "",
                        "shift_id": template.id,
                        "is_off": False
                    })
                # Overwrite non-work days with Rest Day (OFF)
                if off_dates_list:
                    HrmsService.assign_shift(db, {
                        "employee_ids": member_ids_to_apply,
                        "dates": off_dates_list,
                        "shift_code": "OFF",
                        "shift_name": "Rest Day",
                        "start_time": "",
                        "end_time": "",
                        "shift_id": None,
                        "is_off": True
                    })
            except Exception as sched_err:
                print(f"[ShiftTemplate] Auto-assign shift roster warning: {sched_err}")

        return {
            "id": template.id,
            "code": template.code,
            "name": template.name,
            "start_time": template.start_time or "",
            "end_time": template.end_time or "",
            "duration_hours": template.duration_hours,
            "break_mins": template.break_mins,
            "grace_period_mins": template.grace_period_mins,
            "is_night_shift": bool(template.is_night_shift),
            "color": template.color,
            "is_active": bool(template.is_active),
            "assign_type": template.assign_type or "both",
            "from_date": template.from_date or "",
            "to_date": template.to_date or "",
            "num_members": template.num_members,
            "member_ids": template.member_ids or [],
            "work_days": template.work_days or HrmsService._get_dynamic_work_days_from_db(db, template.branch_id),
            "branch_id": template.branch_id or "",
            "ho_id": template.ho_id or "",
        }

    @staticmethod
    def delete_shift_template(db: Session, template_id: str) -> Dict[str, Any]:
        template = db.query(ShiftTemplate).filter(ShiftTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Shift template with ID {template_id} not found")
        db.delete(template)
        db.commit()
        return {"status": "success", "message": "Shift template deleted successfully"}

    @staticmethod
    def get_holidays(
        db: Session,
        year: Optional[int] = None,
        holiday_type: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        query = db.query(CompanyHoliday)
        if year:
            query = query.filter(CompanyHoliday.year == year)
        if holiday_type and holiday_type.upper() != "ALL":
            query = query.filter(CompanyHoliday.holiday_type.ilike(f"%{holiday_type}%"))
        if search:
            query = query.filter(CompanyHoliday.name.ilike(f"%{search.strip()}%"))
        holidays = query.order_by(CompanyHoliday.date.asc()).all()
        return [
            {
                "id": h.id,
                "name": h.name,
                "date": h.date.strftime("%Y-%m-%d"),
                "formatted_date": h.date.strftime("%d %b, %Y"),
                "day_name": h.date.strftime("%A"),
                "year": h.year,
                "holiday_type": h.holiday_type or "",
                "description": h.description or "",
                "is_optional": bool(h.is_optional)
            }
            for h in holidays
        ]

    @staticmethod
    def save_holiday(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        name = (payload.get("name") or "").strip()
        date_str = (payload.get("date") or "").strip()
        if not name or not date_str:
            raise ValueError("Holiday name and date are required")

        d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        year = int(payload.get("year") or d_obj.year)

        hol_id = payload.get("id")
        hol = None
        if hol_id:
            hol = db.query(CompanyHoliday).filter(CompanyHoliday.id == hol_id).first()
        if not hol:
            hol = CompanyHoliday(
                id=f"hol_{uuid.uuid4().hex[:8]}",
                name=name,
                date=d_obj,
                year=year,
                holiday_type=payload.get("holiday_type") or "",
                description=payload.get("description") or "",
                is_optional=bool(payload.get("is_optional", False))
            )
            db.add(hol)
        else:
            hol.name = name
            hol.date = d_obj
            hol.year = year
            if "holiday_type" in payload:
                hol.holiday_type = payload["holiday_type"]
            if "description" in payload:
                hol.description = payload["description"]
            if "is_optional" in payload:
                hol.is_optional = bool(payload["is_optional"])
        db.commit()
        db.refresh(hol)
        return {
            "id": hol.id,
            "name": hol.name,
            "date": hol.date.strftime("%Y-%m-%d"),
            "formatted_date": hol.date.strftime("%d %b, %Y"),
            "year": hol.year,
            "holiday_type": hol.holiday_type,
            "description": hol.description,
            "is_optional": hol.is_optional
        }

    @staticmethod
    def delete_holiday(db: Session, holiday_id: str) -> Dict[str, Any]:
        hol = db.query(CompanyHoliday).filter(CompanyHoliday.id == holiday_id).first()
        if not hol:
            raise ValueError("Holiday not found")
        db.delete(hol)
        db.commit()
        return {"message": "Holiday deleted successfully", "id": holiday_id}

    @staticmethod
    def preseed_holidays(db: Session, target_year: int = 2026) -> Dict[str, Any]:
        seed_data = {
            2026: [
                ("New Year's Day", "2026-01-01", "National", None),
                ("Republic Day", "2026-01-26", "National", None),
                ("Maha Shivratri", "2026-02-15", "Festival", None),
                ("Holi", "2026-03-04", "Festival", None),
                ("Eid ul-Fitr", "2026-03-21", "Festival", None),
                ("Good Friday", "2026-04-03", "Public", None),
                ("Dr. B.R. Ambedkar Jayanti", "2026-04-14", "National", None),
                ("May Day / Labour Day", "2026-05-01", "Public", None),
                ("Bakrid / Eid al-Adha", "2026-05-27", "Festival", None),
                ("Muharram", "2026-06-26", "Festival", None),
                ("Independence Day", "2026-08-15", "National", None),
                ("Ganesh Chaturthi", "2026-09-07", "Festival", None),
                ("Gandhi Jayanti", "2026-10-02", "National", None),
                ("Dussehra (Vijayadashami)", "2026-10-20", "Festival", None),
                ("Diwali (Deepavali)", "2026-11-08", "Festival", None),
                ("Guru Nanak Jayanti", "2026-11-24", "Festival", None),
                ("Christmas Day", "2026-12-25", "National", None),
            ],
            2027: [
                ("New Year's Day", "2027-01-01", "National", None),
                ("Republic Day", "2027-01-26", "National", None),
                ("Holi", "2027-03-22", "Festival", None),
                ("Eid ul-Fitr", "2027-03-10", "Festival", None),
                ("Good Friday", "2027-03-26", "Public", None),
                ("Dr. B.R. Ambedkar Jayanti", "2027-04-14", "National", None),
                ("May Day / Labour Day", "2027-05-01", "Public", None),
                ("Independence Day", "2027-08-15", "National", None),
                ("Gandhi Jayanti", "2027-10-02", "National", None),
                ("Dussehra", "2027-10-10", "Festival", None),
                ("Diwali", "2027-10-29", "Festival", None),
                ("Christmas Day", "2027-12-25", "National", None),
            ]
        }
        items = seed_data.get(target_year, seed_data[2026])
        inserted = 0
        for name, d_str, h_type, desc in items:
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
            existing = db.query(CompanyHoliday).filter(
                (CompanyHoliday.name == name) & (CompanyHoliday.date == d_obj)
            ).first()
            if not existing:
                db.add(CompanyHoliday(
                    id=f"hol_{uuid.uuid4().hex[:8]}",
                    name=name,
                    date=d_obj,
                    year=target_year,
                    holiday_type=h_type,
                    description=desc,
                    is_optional=False
                ))
                inserted += 1
            else:
                existing.holiday_type = h_type
                existing.description = None
        db.commit()
        return {
            "status": "success",
            "message": f"Pre-seeded {inserted} holidays for year {target_year} successfully.",
            "inserted_count": inserted
        }

    @staticmethod
    def get_shift_roster(
        db: Session,
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None,
        department: Optional[str] = None,
        search: Optional[str] = None,
        view_mode: Optional[str] = "flat",
        branch_id: Optional[str] = None,
        ho_id: Optional[str] = None,
        current_user: Optional[User] = None,
        user_type: Optional[str] = "employee"
    ) -> Dict[str, Any]:
        now_ist = datetime.now(IST)
        today = now_ist.date()

        # Resolve 7-day week starting at Monday
        if start_date_str:
            try:
                monday = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
            except Exception:
                monday = today - timedelta(days=today.weekday())
        else:
            monday = today - timedelta(days=today.weekday())

        sunday = monday + timedelta(days=6)
        week_days = [monday + timedelta(days=i) for i in range(7)]

        week_dates_meta = []
        for d in week_days:
            week_dates_meta.append({
                "date": d.strftime("%Y-%m-%d"),
                "day_name": d.strftime("%a").upper(),
                "formatted": d.strftime("%b %d").upper(),
                "full_str": f"{d.strftime('%a').upper()} {d.strftime('%b %d').upper()}",
                "is_today": d == today
            })

        week_label = f"Week of {monday.strftime('%b %d')} - {sunday.strftime('%b %d, %Y')}"

        is_student_scope = (user_type or "").lower().startswith("student")

        if is_student_scope:
            from src.models.student import student
            stus_query = db.query(student)
            if ho_id:
                stus_query = stus_query.filter(student.ho_id == ho_id)
            if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                matched_b = db.query(vahdBranch).filter(
                    or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
                ).first()
                b_ids = [branch_id]
                b_names = [branch_id]
                if matched_b:
                    b_ids.append(matched_b.id)
                    if matched_b.branch_name:
                        b_names.append(matched_b.branch_name)
                    if matched_b.vahd_name:
                        b_names.append(matched_b.vahd_name)
                b_conds = [student.branch_id.in_(b_ids)]
                for bn in b_names:
                    b_conds.append(student.primary_vahd_location.ilike(f"%{bn}%"))
                stus_query = stus_query.filter(or_(*b_conds))
            if current_user and (current_user.role or "").strip().upper() == "OWNER":
                stus_query = stus_query.filter(
                    or_(
                        student.owner_id == current_user.id,
                        student.branch_id == current_user.branch_id,
                        student.owner_id.is_(None),
                        student.owner_id == ""
                    )
                )
            if search:
                s = search.strip().lower()
                stus_query = stus_query.filter(
                    or_(
                        student.full_name.ilike(f"%{s}%"),
                        student.email.ilike(f"%{s}%"),
                        student.phone.ilike(f"%{s}%"),
                        student.member_code.ilike(f"%{s}%")
                    )
                )
            if department and department != "ALL":
                stus_query = stus_query.filter(
                    or_(
                        student.specialization.ilike(f"%{department}%"),
                        student.qualification.ilike(f"%{department}%")
                    )
                )
            stus = stus_query.all()
            emps = []
            for s in stus:
                s_dept = s.specialization or s.qualification or "Batch A"
                emps.append({
                    "id": s.id,
                    "code": s.member_code or "",
                    "full_name": s.full_name or "",
                    "name": s.full_name or "",
                    "department": s_dept,
                    "designation": "Student",
                    "avatar": s.profile_image or ""
                })
        else:
            # Fetch employees using scoped permissions
            emps = HrmsService.get_employees(
                db, department=department, search=search,
                branch_id=branch_id, ho_id=ho_id, current_user=current_user
            )

        # Load active work calendar policies (by department or fallback)
        calendars = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.is_active == True).all()
        cal_by_dept = {c.department.lower(): c for c in calendars if c.department and c.department != "All"}
        default_cal = next((c for c in calendars if c.department in ["All", None, ""]), None)

        all_query_ids = set()
        emp_id_to_profile_id = {}
        for e in emps:
            e_id = e["id"]
            all_query_ids.add(e_id)
            emp_id_to_profile_id[e_id] = e_id
            if e_id.startswith("cust_"):
                no_cust = e_id.replace("cust_", "")
                all_query_ids.add(no_cust)
                emp_id_to_profile_id[no_cust] = e_id
            else:
                cust_prefix = f"cust_{e_id}"
                all_query_ids.add(cust_prefix)
                emp_id_to_profile_id[cust_prefix] = e_id
            if e.get("code"):
                all_query_ids.add(e["code"])
                emp_id_to_profile_id[e["code"]] = e_id

        roster_records = db.query(EmployeeShiftRoster).filter(
            EmployeeShiftRoster.employee_id.in_(list(all_query_ids)),
            EmployeeShiftRoster.date >= monday,
            EmployeeShiftRoster.date <= sunday
        ).all() if all_query_ids else []

        roster_map = {}
        for r in roster_records:
            d_key = r.date.strftime("%Y-%m-%d")
            canon_id = emp_id_to_profile_id.get(r.employee_id, r.employee_id)
            roster_map[(canon_id, d_key)] = r
            roster_map[(r.employee_id, d_key)] = r

        # Fetch attendance records for this week to dynamically reflect Presence
        att_records = db.query(EmployeeAttendance).filter(
            EmployeeAttendance.employee_id.in_(list(all_query_ids)),
            EmployeeAttendance.date >= monday,
            EmployeeAttendance.date <= sunday
        ).all() if all_query_ids else []

        att_map = {}
        for a in att_records:
            if a.date:
                d_key = a.date.strftime("%Y-%m-%d") if hasattr(a.date, "strftime") else str(a.date)[:10]
                canon_id = emp_id_to_profile_id.get(a.employee_id, a.employee_id)
                att_map[(canon_id, d_key)] = a
                att_map[(a.employee_id, d_key)] = a

        # Load dynamic shift templates from database
        db_shift_templates = db.query(ShiftTemplate).filter(ShiftTemplate.is_active == True).order_by(ShiftTemplate.created_at.asc()).all()
        shift_templates_map = {t.code.strip().upper(): t for t in db_shift_templates if t.code}
        for t in db_shift_templates:
            if t.id:
                shift_templates_map[t.id] = t

        def resolve_shift_meta(code):
            if not code or code == "OFF":
                return {"code": "OFF", "name": "Weekly Off", "start_time": "", "end_time": "", "color": "#64748b"}
            c_upper = str(code).strip().upper()
            if c_upper in shift_templates_map:
                t = shift_templates_map[c_upper]
                return {
                    "code": t.code,
                    "name": t.name or f"{t.code} Shift",
                    "start_time": t.start_time or "",
                    "end_time": t.end_time or "",
                    "color": t.color or "#7c3aed"
                }
            return {
                "code": str(code),
                "name": f"{code} Shift",
                "start_time": "",
                "end_time": "",
                "color": "#7c3aed"
            }

        # Summary counters tracking distinct employees assigned to each shift
        employees_by_code: Dict[str, set] = {t.code.strip().upper(): set() for t in db_shift_templates if t.code}
        employees_by_legacy: Dict[str, set] = {
            "general": set(),
            "morning": set(),
            "evening": set(),
            "night": set(),
            "weekly_offs": set()
        }

        # Format rows for each employee
        employee_rows = []
        for emp in emps:
            e_id = emp["id"]
            emp_dept = (emp.get("department") or "").strip().lower()
            emp_cal = cal_by_dept.get(emp_dept, default_cal)
            shifts_by_date = {}

            for d in week_days:
                d_key = d.strftime("%Y-%m-%d")
                day_of_week = d.strftime("%A")

                r = roster_map.get((e_id, d_key))
                att = att_map.get((e_id, d_key))

                # Check if this employee is explicitly assigned to any active ShiftTemplate
                emp_candidate_keys = {str(e_id), str(e_id).replace("emp_", "").replace("cust_", ""), f"emp_{e_id}", f"cust_{e_id}"}
                if emp.get("code"):
                    emp_candidate_keys.add(str(emp["code"]).strip())

                assigned_tpl = None
                for tpl in db_shift_templates:
                    tpl_members = set(str(m).strip() for m in (tpl.member_ids or []))
                    if emp_candidate_keys & tpl_members:
                        assigned_tpl = tpl
                        break

                DAY_ABBR = d.strftime("%a")

                if assigned_tpl:
                    # Explicit ShiftTemplate assignment governs this member's schedule across all applicable days
                    r_updated = getattr(r, "updated_at", None) or getattr(r, "created_at", None) if r else None
                    tpl_updated = getattr(assigned_tpl, "updated_at", None) or getattr(assigned_tpl, "created_at", None)
                    is_newer_cell_override = bool(
                        r and r.shift_code not in [assigned_tpl.code, "OFF"] and
                        r_updated and tpl_updated and r_updated > tpl_updated
                    )

                    if not is_newer_cell_override:
                        tpl_work_days = assigned_tpl.work_days or HrmsService._get_dynamic_work_days_from_db(db, branch_id)
                        if DAY_ABBR in tpl_work_days:
                            s_code = assigned_tpl.code
                            is_off = False
                            s_name = assigned_tpl.name or f"{assigned_tpl.code} Shift"
                            s_start = assigned_tpl.start_time or ""
                            s_end = assigned_tpl.end_time or ""
                            color = assigned_tpl.color or "#7c3aed"
                        else:
                            s_code = "OFF"
                            is_off = True
                            s_name = "Rest Day"
                            s_start = ""
                            s_end = ""
                            color = "#64748b"
                    else:
                        s_code = r.shift_code
                        is_off = bool(r.is_weekly_off or s_code == "OFF")
                        meta = resolve_shift_meta(s_code)
                        s_name = "Rest Day" if is_off else (r.shift_name or meta.get("name") or f"{s_code} Shift")
                        s_start = "" if is_off else (r.start_time or meta.get("start_time", ""))
                        s_end = "" if is_off else (r.end_time or meta.get("end_time", ""))
                        color = "#64748b" if is_off else (r.color if hasattr(r, 'color') and r.color else meta.get("color", "#7c3aed"))
                elif r:
                    s_code = r.shift_code
                    is_off = bool(r.is_weekly_off or s_code == "OFF")
                    meta = resolve_shift_meta(s_code)
                    s_name = "Rest Day" if is_off else (r.shift_name or meta.get("name") or f"{s_code} Shift")
                    s_start = "" if is_off else (r.start_time or meta.get("start_time", ""))
                    s_end = "" if is_off else (r.end_time or meta.get("end_time", ""))
                    color = "#64748b" if is_off else (r.color if hasattr(r, 'color') and r.color else meta.get("color", "#7c3aed"))
                elif emp_cal and emp_cal.weekly_off_days and day_of_week in emp_cal.weekly_off_days:
                    s_code = "OFF"
                    is_off = True
                    s_name = "Rest Day"
                    s_start = ""
                    s_end = ""
                    color = "#64748b"
                else:
                    target_code = (emp_cal.default_shift_code if (emp_cal and emp_cal.default_shift_code) else emp.get("shift_code"))
                    if not target_code and db_shift_templates:
                        target_code = db_shift_templates[0].code
                    meta = resolve_shift_meta(target_code) if target_code else {"code": "", "name": "", "start_time": "", "end_time": "", "color": "#94a3b8"}
                    s_code = meta["code"]
                    is_off = False
                    s_name = meta["name"]
                    s_start = meta.get("start_time", "")
                    s_end = meta.get("end_time", "")
                    color = meta.get("color", "#7c3aed")

                if is_off or s_code == "OFF":
                    employees_by_legacy["weekly_offs"].add(e_id)
                else:
                    c_up = str(s_code).strip().upper()
                    if c_up in employees_by_code:
                        employees_by_code[c_up].add(e_id)
                    
                    # Dynamically map to legacy fixed cards based on time window or code
                    st_clean = (s_start or "").strip()
                    try:
                        hour = int(st_clean.split(":")[0]) if ":" in st_clean else None
                    except Exception:
                        hour = None

                    if c_up in ["GEN", "1"] or (hour is not None and 8 <= hour < 14 and "morning" not in s_name.lower()):
                        employees_by_legacy["general"].add(e_id)
                    elif c_up == "MORN" or (hour is not None and 5 <= hour < 12):
                        employees_by_legacy["morning"].add(e_id)
                    elif c_up == "EVE" or (hour is not None and 14 <= hour < 21):
                        employees_by_legacy["evening"].add(e_id)
                    elif c_up == "NIGHT" or (hour is not None and (hour >= 21 or hour < 5)):
                        employees_by_legacy["night"].add(e_id)
                    else:
                        employees_by_legacy["general"].add(e_id)

                att_status = att.status if att else None
                check_in_str = att.check_in if att else None
                check_out_str = att.check_out if att else None

                if is_off or s_code == "OFF":
                    time_range_str = "Rest Day"
                elif s_start and s_end:
                    time_range_str = f"{s_start}-{s_end}"
                elif s_name:
                    time_range_str = s_name
                else:
                    time_range_str = "Flexible"

                shifts_by_date[d_key] = {
                    "shift_code": s_code,
                    "shift_name": s_name,
                    "start_time": s_start,
                    "end_time": s_end,
                    "is_off": is_off,
                    "color": color,
                    "time_range": time_range_str,
                    "attendance_status": att_status,
                    "check_in": check_in_str,
                    "check_out": check_out_str,
                    "is_present": att_status in ["Present", "Present (Late)"]
                }

            name_val = emp.get("full_name") or emp.get("name") or ""
            parts = name_val.split()
            calc_initials = "".join([p[0].upper() for p in parts[:2]]) if parts else ""
            employee_rows.append({
                "id": emp["id"],
                "code": emp.get("code") or "",
                "name": name_val,
                "initials": emp.get("initials") or calc_initials,
                "designation": emp.get("designation") or ("Student" if is_student_scope else "Staff"),
                "department": emp.get("department") or "",
                "avatar": emp.get("avatar") or "",
                "shifts": shifts_by_date
            })

        all_departments = sorted(list({e.get("department") for e in emps if e.get("department")}))
        if not all_departments and not is_student_scope:
            all_departments = [d.name for d in db.query(Department).all()]

        summary = {
            "general": len(employees_by_legacy["general"]),
            "morning": len(employees_by_legacy["morning"]),
            "evening": len(employees_by_legacy["evening"]),
            "night": len(employees_by_legacy["night"]),
            "weekly_offs": len(employees_by_legacy["weekly_offs"])
        }

        dynamic_template_summaries = []
        for t in db_shift_templates:
            code_u = t.code.strip().upper()
            emp_cnt = len(employees_by_code.get(code_u, set()))
            dynamic_template_summaries.append({
                "id": t.id,
                "code": t.code,
                "name": t.name,
                "start_time": t.start_time or "",
                "end_time": t.end_time or "",
                "time_range": f"{t.start_time}-{t.end_time}" if (t.start_time and t.end_time) else "",
                "color": t.color or "#7c3aed",
                "count": emp_cnt,
                "employee_count": emp_cnt
            })

        return {
            "week_label": week_label,
            "start_date": monday.strftime("%Y-%m-%d"),
            "end_date": sunday.strftime("%Y-%m-%d"),
            "dates": week_dates_meta,
            "summary": summary,
            "template_summaries": dynamic_template_summaries,
            "employees": employee_rows,
            "total_staff": len(employee_rows),
            "departments": all_departments,
            "user_type": "students" if is_student_scope else "employees"
        }

    @staticmethod
    def assign_shift(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        employee_ids = payload.get("employee_ids") or []
        if isinstance(employee_ids, str):
            employee_ids = [employee_ids]
        if not employee_ids and payload.get("employee_id"):
            employee_ids = [payload["employee_id"]]

        dates = payload.get("dates") or []
        if isinstance(dates, str):
            dates = [dates]
        if not dates and payload.get("date"):
            dates = [payload["date"]]

        shift_code = (payload.get("shift_code") or "").strip().upper()
        is_off = shift_code == "OFF" or bool(payload.get("is_off", False))

        # Lookup dynamic shift template from DB first, then fallback to STANDARD_SHIFTS
        tmpl = db.query(ShiftTemplate).filter(
            or_(ShiftTemplate.code.ilike(shift_code), ShiftTemplate.id == payload.get("shift_id"))
        ).first()

        std = STANDARD_SHIFTS.get(shift_code, {})
        if is_off:
            shift_name = "Rest Day"
            start_time = ""
            end_time = ""
            shift_id = None
        else:
            shift_name = payload.get("shift_name") or (tmpl.name if tmpl else std.get("name", f"{shift_code} Shift" if shift_code else "Custom Shift"))
            start_time = HrmsService._normalize_time_str(payload.get("start_time") or (tmpl.start_time if tmpl else std.get("start_time", "")))
            end_time = HrmsService._normalize_time_str(payload.get("end_time") or (tmpl.end_time if tmpl else std.get("end_time", "")))
            shift_id = payload.get("shift_id") or (tmpl.id if tmpl else None)

        # Proactively ensure foreign key constraint that blocks students/custom IDs is dropped
        try:
            db.execute(text('ALTER TABLE "hrms_shift_rosters" DROP CONSTRAINT IF EXISTS "hrms_shift_rosters_employee_id_fkey";'))
            db.commit()
        except Exception:
            db.rollback()

        def apply_shift_updates():
            count = 0
            for emp_id in employee_ids:
                for d_str in dates:
                    try:
                        d_obj = datetime.strptime(d_str.strip(), "%Y-%m-%d").date()
                    except Exception:
                        continue

                    clean_sid = str(emp_id).replace("cust_", "").replace("emp_", "")
                    roster = db.query(EmployeeShiftRoster).filter(
                        or_(
                            EmployeeShiftRoster.employee_id == str(emp_id),
                            EmployeeShiftRoster.employee_id == clean_sid,
                            EmployeeShiftRoster.employee_id == f"cust_{emp_id}",
                            EmployeeShiftRoster.employee_id == f"cust_{clean_sid}",
                            EmployeeShiftRoster.employee_id == f"emp_{clean_sid}"
                        ),
                        EmployeeShiftRoster.date == d_obj
                    ).first()

                    if not roster:
                        roster = EmployeeShiftRoster(
                            id=f"roster_{uuid.uuid4().hex[:8]}",
                            employee_id=emp_id,
                            date=d_obj,
                            shift_id=shift_id,
                            shift_code=shift_code,
                            shift_name=shift_name,
                            start_time=start_time,
                            end_time=end_time,
                            is_weekly_off=is_off,
                            status="SCHEDULED"
                        )
                        db.add(roster)
                    else:
                        roster.shift_id = shift_id
                        roster.shift_code = shift_code
                        roster.shift_name = shift_name
                        roster.start_time = start_time
                        roster.end_time = end_time
                        roster.is_weekly_off = is_off

                    # If an attendance record exists for this employee/student on this date, update its shift linkage
                    clean_sid = emp_id.replace("cust_", "")
                    att = db.query(EmployeeAttendance).filter(
                        or_(
                            EmployeeAttendance.employee_id == emp_id,
                            EmployeeAttendance.employee_id == clean_sid,
                            EmployeeAttendance.employee_id == f"cust_{emp_id}"
                        ),
                        EmployeeAttendance.date == d_obj
                    ).first()
                    if att:
                        att.shift_id = shift_id
                        att.shift_code = shift_code
                        att.shift_name = shift_name

                    count += 1

                # If student, sync default shift in student metadata
                clean_sid = emp_id.replace("cust_", "")
                st_obj = db.query(student).filter(
                    or_(
                        student.id == emp_id,
                        student.id == clean_sid,
                        student.id == f"cust_{emp_id}"
                    )
                ).first()
                if st_obj:
                    s_meta = dict(st_obj.meta_data or {})
                    s_meta["shift_code"] = shift_code
                    s_meta["shift_name"] = shift_name
                    st_obj.meta_data = s_meta

                # If employee, sync default shift_code on Employee record
                emp_obj = db.query(Employee).filter(
                    or_(
                        Employee.id == emp_id,
                        Employee.code == emp_id
                    )
                ).first()
                if emp_obj:
                    emp_obj.shift_code = shift_code

            return count

        try:
            updated_count = apply_shift_updates()
            db.commit()
        except Exception as e:
            db.rollback()
            err_str = str(e).lower()
            if "foreignkey" in err_str or "foreign key" in err_str or "hrms_shift_rosters_employee_id_fkey" in err_str:
                # Force drop constraint in DB transaction and re-apply
                try:
                    db.execute(text('ALTER TABLE "hrms_shift_rosters" DROP CONSTRAINT IF EXISTS "hrms_shift_rosters_employee_id_fkey";'))
                    db.commit()
                    updated_count = apply_shift_updates()
                    db.commit()
                except Exception as retry_err:
                    db.rollback()
                    raise retry_err
            else:
                raise e

        return {
            "status": "success",
            "message": f"Successfully updated shift to {shift_name} across {updated_count} slot(s).",
            "updated_count": updated_count
        }

    @staticmethod
    def get_monthly_attendance_matrix(
        db: Session,
        year: int,
        month: int,
        department: Optional[str] = None,
        search: Optional[str] = None,
        branch_id: Optional[str] = None,
        ho_id: Optional[str] = None,
        user_type: Optional[str] = "employee",
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        now_ist = datetime.now(IST)
        today = now_ist.date()

        import calendar
        num_days = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)
        month_name = calendar.month_name[month]

        days_in_month = []
        for day_num in range(1, num_days + 1):
            curr_d = date(year, month, day_num)
            day_name = curr_d.strftime("%A")
            days_in_month.append({
                "day": day_num,
                "day_letter": day_name[0].upper(),
                "day_name": day_name,
                "formatted": curr_d.strftime("%b %d"),
                "date_str": curr_d.strftime("%Y-%m-%d"),
                "is_today": curr_d == today,
                "is_future": curr_d > today
            })

        u_type = (user_type or "employee").lower()
        is_all_scope = u_type in ["all", "both"]
        is_student_scope = u_type.startswith("student") or is_all_scope
        is_employee_scope = not u_type.startswith("student") or is_all_scope

        profiles = []
        if is_employee_scope:
            emp_profiles = HrmsService.get_employees(
                db, department=department, search=search,
                branch_id=branch_id, ho_id=ho_id, current_user=current_user
            )
            for e in emp_profiles:
                e["role_category"] = "Employee"
                profiles.append(e)

        if is_student_scope:
            from src.models.student import student
            stus_query = db.query(student)
            if ho_id:
                stus_query = stus_query.filter(student.ho_id == ho_id)
            if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                matched_b = db.query(vahdBranch).filter(
                    or_(vahdBranch.id == branch_id, vahdBranch.branch_name == branch_id, vahdBranch.vahd_name == branch_id)
                ).first()
                b_ids = [branch_id]
                b_names = [branch_id]
                if matched_b:
                    b_ids.append(matched_b.id)
                    if matched_b.branch_name:
                        b_names.append(matched_b.branch_name)
                    if matched_b.vahd_name:
                        b_names.append(matched_b.vahd_name)
                b_conds = [student.branch_id.in_(b_ids)]
                for bn in b_names:
                    b_conds.append(student.primary_vahd_location.ilike(f"%{bn}%"))
                stus_query = stus_query.filter(or_(*b_conds))
            if current_user and (current_user.role or "").strip().upper() == "OWNER":
                stus_query = stus_query.filter(
                    or_(
                        student.owner_id == current_user.id,
                        student.branch_id == current_user.branch_id,
                        student.owner_id.is_(None),
                        student.owner_id == ""
                    )
                )
            if search:
                s = search.strip().lower()
                stus_query = stus_query.filter(
                    or_(
                        student.full_name.ilike(f"%{s}%"),
                        student.email.ilike(f"%{s}%"),
                        student.phone.ilike(f"%{s}%"),
                        student.member_code.ilike(f"%{s}%")
                    )
                )
            if department and department != "ALL":
                stus_query = stus_query.filter(
                    or_(
                        student.specialization.ilike(f"%{department}%"),
                        student.qualification.ilike(f"%{department}%"),
                        student.primary_vahd_location.ilike(f"%{department}%")
                    )
                )
            student_records = stus_query.all()
            for s in student_records:
                initials = "".join([part[0].upper() for part in s.full_name.split()[:2]]) if s.full_name else ""
                dept = s.specialization or s.qualification or s.primary_vahd_location or ""
                profiles.append({
                    "id": s.id,
                    "code": s.member_code or s.id or "",
                    "name": s.full_name or "",
                    "department": dept,
                    "designation": "Student",
                    "initials": initials,
                    "avatar": s.profile_image or "",
                    "role_category": "Student"
                })

        profile_ids = [p["id"] for p in profiles]
        emp_id_to_profile_id = {}
        all_query_ids = set()

        # Pass 1: Register exact profile IDs, explicit codes, and emails
        for p in profiles:
            pid = p["id"]
            all_query_ids.add(pid)
            emp_id_to_profile_id[pid] = pid
            if pid.startswith("emp_"):
                raw_id = pid[4:]
                all_query_ids.add(raw_id)
                emp_id_to_profile_id[raw_id] = pid
            elif pid.startswith("cust_"):
                raw_id = pid[5:]
                all_query_ids.add(raw_id)
                emp_id_to_profile_id[raw_id] = pid
            else:
                all_query_ids.add(f"emp_{pid}")
                all_query_ids.add(f"cust_{pid}")

            code = p.get("code")
            if code:
                all_query_ids.add(code)
                emp_id_to_profile_id[code] = pid

            email = p.get("email")
            if email:
                all_query_ids.add(email.lower())
                emp_id_to_profile_id[email.lower()] = pid

            # Check linked employeeProfile or student or user for cross-table punch lookup
            if p.get("role_category") != "Student":
                clean_lookup_id = pid.replace("emp_", "")
                tr = db.query(employeeProfile).filter(
                    or_(
                        employeeProfile.id == clean_lookup_id,
                        employeeProfile.id == f"tr_{clean_lookup_id}",
                        employeeProfile.email.ilike(email) if email else False
                    )
                ).first()
                if tr:
                    all_query_ids.add(tr.id)
                    emp_id_to_profile_id[tr.id] = pid
                    if tr.user_id:
                        all_query_ids.add(tr.user_id)
                        emp_id_to_profile_id[tr.user_id] = pid
            else:
                from src.models.student import student as StudentModel
                st = db.query(StudentModel).filter(
                    or_(
                        StudentModel.id == pid,
                        StudentModel.email.ilike(email) if email else False
                    )
                ).first()
                if st and st.user_id:
                    all_query_ids.add(st.user_id)
                    emp_id_to_profile_id[st.user_id] = pid

        # Pass 2: Register formatted code variants only if not already claimed by an exact code
        for p in profiles:
            pid = p["id"]
            code = p.get("code")
            if code:
                clean_num = code.replace("EMP-", "").strip()
                if clean_num:
                    variants = [clean_num, clean_num.zfill(4), f"EMP-{clean_num.zfill(4)}", f"EMP-{clean_num}"]
                    for v in variants:
                        all_query_ids.add(v)
                        if v not in emp_id_to_profile_id:
                            emp_id_to_profile_id[v] = pid

        # Load active work calendar policy
        calendars = db.query(WorkCalendarPolicy).filter(WorkCalendarPolicy.is_active == True).all()
        cal_by_dept = {c.department.strip().lower(): c for c in calendars if c.department and c.department.strip().lower() not in ["all", "general", ""]}
        default_cal = (
            next((c for c in calendars if c.is_default), None)
            or next((c for c in calendars if (c.department or "").strip().lower() in ["all", "general", ""]), None)
            or (calendars[0] if calendars else None)
        )

        # Load holidays for this month
        holidays = db.query(CompanyHoliday).filter(
            CompanyHoliday.date >= start_date,
            CompanyHoliday.date <= end_date
        ).all()
        holiday_map = {h.date.strftime("%Y-%m-%d"): h for h in holidays}

        # Load attendance records
        att_records = db.query(EmployeeAttendance).filter(
            EmployeeAttendance.date >= start_date,
            EmployeeAttendance.date <= end_date
        ).all()

        att_by_emp_date = {}
        for a in att_records:
            if a.date:
                d_key = a.date.strftime("%Y-%m-%d") if hasattr(a.date, "strftime") else str(a.date)[:10]
                target_pid = emp_id_to_profile_id.get(a.employee_id) or emp_id_to_profile_id.get(str(a.employee_id).replace("emp_", "")) or emp_id_to_profile_id.get(str(a.employee_id).replace("cust_", ""))
                if target_pid:
                    att_by_emp_date[(target_pid, d_key)] = a
                att_by_emp_date[(a.employee_id, d_key)] = a

        # Also pull BiometricLog punches for this month (GPS Mobile, Face ID, Turnstile)
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())
        month_bio_logs = db.query(BiometricLog).filter(
            BiometricLog.timestamp >= start_dt,
            BiometricLog.timestamp <= end_dt,
            BiometricLog.status != "DENIED"
        ).order_by(BiometricLog.timestamp.asc()).all()

        for blog in month_bio_logs:
            d_key = blog.timestamp.strftime("%Y-%m-%d") if blog.timestamp else ""
            meta = blog.meta_data or {}
            candidates = [
                str(blog.student_id or ""),
                str(meta.get("user_id") or ""),
                str(meta.get("employee_id") or ""),
                str(meta.get("student_id") or ""),
                str(meta.get("employee_code") or meta.get("code") or ""),
                str(meta.get("email") or "").lower()
            ]
            target_pid = None
            for c in candidates:
                if not c:
                    continue
                if c in emp_id_to_profile_id:
                    target_pid = emp_id_to_profile_id[c]
                    break
                elif c.replace("emp_", "") in emp_id_to_profile_id:
                    target_pid = emp_id_to_profile_id[c.replace("emp_", "")]
                    break
                elif c.replace("cust_", "") in emp_id_to_profile_id:
                    target_pid = emp_id_to_profile_id[c.replace("cust_", "")]
                    break

            if target_pid:
                clean_dev_loc = re.sub(r'\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)', '', blog.device_name or "").strip()
                bio_loc = meta.get("location") or meta.get("branch") or clean_dev_loc or ""
                if bio_loc.lower() in ["face scanner", "biometric device", "webcam"]:
                    bio_loc = ""

                punch_time_str = blog.timestamp.strftime("%I:%M %p") if blog.timestamp else "--:--"
                is_out = blog.direction in ["CHECK_OUT", "OUT"]
                is_in = blog.direction in ["CHECK_IN", "IN"] or not is_out

                if (target_pid, d_key) not in att_by_emp_date:
                    att_by_emp_date[(target_pid, d_key)] = {
                        "status": "Present",
                        "check_in": punch_time_str if is_in else None,
                        "check_out": punch_time_str if is_out else None,
                        "check_in_location": bio_loc if is_in else "",
                        "check_out_location": bio_loc if is_out else "",
                        "work_hours": 8.0,
                        "notes": f"Punched via {blog.event_type or blog.direction or 'Biometric'}"
                    }
                else:
                    existing_entry = att_by_emp_date[(target_pid, d_key)]
                    st = getattr(existing_entry, "status", None) if hasattr(existing_entry, "status") else (existing_entry.get("status") if isinstance(existing_entry, dict) else "")
                    if (st or "").lower() in ["absent", "none", "", "-"]:
                        if hasattr(existing_entry, "status"):
                            existing_entry.status = "Present"
                            if is_in and (not existing_entry.check_in or existing_entry.check_in in ["--:--", "-"]):
                                existing_entry.check_in = punch_time_str
                            if is_out and (not existing_entry.check_out or existing_entry.check_out in ["--:--", "-"]):
                                existing_entry.check_out = punch_time_str
                            if bio_loc:
                                if is_in and not existing_entry.check_in_location:
                                    existing_entry.check_in_location = bio_loc
                                if is_out and not existing_entry.check_out_location:
                                    existing_entry.check_out_location = bio_loc
                        elif isinstance(existing_entry, dict):
                            existing_entry["status"] = "Present"
                            if is_in and (not existing_entry.get("check_in") or existing_entry["check_in"] in ["--:--", "-"]):
                                existing_entry["check_in"] = punch_time_str
                            if is_out and (not existing_entry.get("check_out") or existing_entry["check_out"] in ["--:--", "-"]):
                                existing_entry["check_out"] = punch_time_str
                            if bio_loc:
                                if is_in and not existing_entry.get("check_in_location"):
                                    existing_entry["check_in_location"] = bio_loc
                                if is_out and not existing_entry.get("check_out_location"):
                                    existing_entry["check_out_location"] = bio_loc

        # Load approved leaves (for employees)
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id.in_(list(all_query_ids)),
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).all() if all_query_ids and not is_student_scope else []

        # Today metrics
        today_str = today.strftime("%Y-%m-%d")
        present_today_count = 0
        absent_today_count = 0
        on_leave_today_count = 0

        for p in profiles:
            p_id = p["id"]
            today_att = att_by_emp_date.get((p_id, today_str))
            if today_att:
                t_st = (getattr(today_att, "status", None) if hasattr(today_att, "status") else today_att.get("status", "") or "").lower()
                t_in = getattr(today_att, "check_in", None) if hasattr(today_att, "check_in") else today_att.get("check_in", None)
                if any(x in t_st for x in ["present", "late", "verified", "half"]) or t_in:
                    present_today_count += 1
                elif "absent" in t_st:
                    absent_today_count += 1
            for lv in leaves:
                if lv.employee_id in [p_id, p.get("code")] and lv.start_date <= today <= lv.end_date:
                    on_leave_today_count += 1
                    break

        # Format rows
        attendance_rows = []

        ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for p in profiles:
            p_id = p["id"]
            p_dept = (p.get("department") or "").strip().lower()
            p_cal = cal_by_dept.get(p_dept, default_cal)

            # Compute weekly offs
            weekly_offs = []
            if p_cal:
                if p_cal.weekly_off_days and len(p_cal.weekly_off_days) > 0:
                    weekly_offs = p_cal.weekly_off_days
                elif p_cal.working_days and len(p_cal.working_days) > 0:
                    weekly_offs = [d for d in ALL_DAYS if d not in p_cal.working_days]
            if not weekly_offs:
                weekly_offs = ["Saturday", "Sunday"]

            weekly_offs_norm = {d.strip().lower() for d in weekly_offs}

            p_count = 0
            a_count = 0
            pl_count = 0
            wo_count = 0
            hol_count = 0
            days_status = {}

            for day_info in days_in_month:
                d_str = day_info["date_str"]
                d_obj = date(year, month, day_info["day"])
                d_name = day_info["day_name"]
                is_fut = day_info["is_future"]
                is_tod = day_info["is_today"]

                is_week_off = (d_name.lower() in weekly_offs_norm) or (d_name[:3].lower() in weekly_offs_norm)
                is_hol = d_str in holiday_map

                att = att_by_emp_date.get((p_id, d_str))
                is_on_leave = any(lv.employee_id in [p_id, p.get("code")] and lv.start_date <= d_obj <= lv.end_date for lv in leaves)

                att_check_in = None
                att_check_out = None
                att_work_hours = None

                if att:
                    st_val = getattr(att, "status", None) if hasattr(att, "status") else att.get("status", "")
                    st_lower = (st_val or "").strip().lower()
                    att_check_in = getattr(att, "check_in", None) if hasattr(att, "check_in") else att.get("check_in", None)
                    att_check_out = getattr(att, "check_out", None) if hasattr(att, "check_out") else att.get("check_out", None)
                    att_work_hours = getattr(att, "work_hours", None) if hasattr(att, "work_hours") else att.get("work_hours", 8.0)

                    if any(x in st_lower for x in ["holiday", "hol"]):
                        status_code = "HOL"
                        hol_count += 1
                    elif any(x in st_lower for x in ["week off", "wo", "off", "rest"]):
                        status_code = "WO"
                        wo_count += 1
                    elif any(x in st_lower for x in ["absent", "unexcused"]):
                        status_code = "A"
                        a_count += 1
                    elif any(x in st_lower for x in ["leave", "paid leave", "pl"]):
                        status_code = "PL"
                        pl_count += 1
                    elif "half" in st_lower:
                        status_code = "HD"
                        p_count += 0.5
                        pl_count += 0.5
                    elif any(x in st_lower for x in ["present", "late", "verified", "on duty"]) or (att_check_in and not is_fut):
                        status_code = "P"
                        p_count += 1
                    else:
                        if is_fut:
                            status_code = "HOL" if is_hol else ("WO" if is_week_off else "-")
                            if status_code == "HOL":
                                hol_count += 1
                            elif status_code == "WO":
                                wo_count += 1
                        else:
                            status_code = "P"
                            p_count += 1
                elif is_on_leave:
                    status_code = "PL"
                    pl_count += 1
                elif is_hol:
                    status_code = "HOL"
                    hol_count += 1
                elif is_week_off:
                    status_code = "WO"
                    wo_count += 1
                elif not is_fut and not is_tod:
                    # Past working day without attendance record is Absent
                    status_code = "A"
                    a_count += 1
                else:
                    status_code = "-"

                att_in_loc = getattr(att, "check_in_location", None) if hasattr(att, "check_in_location") else (att.get("check_in_location") if isinstance(att, dict) else "")
                att_out_loc = getattr(att, "check_out_location", None) if hasattr(att, "check_out_location") else (att.get("check_out_location") if isinstance(att, dict) else "")

                days_status[str(day_info["day"])] = {
                    "code": status_code,
                    "date": d_str,
                    "status_label": "Present" if status_code == "P" else ("Half Day" if status_code == "HD" else ("Week Off" if status_code == "WO" else ("Holiday" if status_code == "HOL" else ("Paid Leave" if status_code == "PL" else ("Absent" if status_code == "A" else "-"))))),
                    "status": "Present" if status_code == "P" else ("Half Day" if status_code == "HD" else ("Absent" if status_code == "A" else status_code)),
                    "check_in": att_check_in,
                    "check_out": att_check_out,
                    "check_in_location": att_in_loc or "",
                    "check_out_location": att_out_loc or "",
                    "work_hours": att_work_hours
                }

            payable = p_count + pl_count + wo_count + hol_count

            name_val = p.get("full_name") or p.get("name") or ""
            parts = name_val.split()
            calc_initials = "".join([part[0].upper() for part in parts[:2]]) if parts else ""
            attendance_rows.append({
                "id": p["id"],
                "code": p.get("code") or "",
                "name": name_val,
                "department": p.get("department") or "",
                "designation": p.get("designation") or "",
                "initials": p.get("initials") or calc_initials,
                "avatar": p.get("avatar") or "",
                "present_count": int(p_count) if isinstance(p_count, float) and p_count.is_integer() else p_count,
                "absent_count": a_count,
                "leave_count": pl_count,
                "payable_days": int(payable) if isinstance(payable, float) and payable.is_integer() else payable,
                "days": days_status
            })

        all_depts = sorted(list({p.get("department") for p in profiles if p.get("department")}))

        avg_att = 0
        if len(attendance_rows) > 0 and num_days > 0:
            total_present_sum = sum(r["present_count"] for r in attendance_rows)
            avg_att = round((total_present_sum / (len(attendance_rows) * num_days)) * 100)

        return {
            "year": year,
            "month": month,
            "month_name": month_name,
            "days_in_month": days_in_month,
            "user_type": "all" if is_all_scope else ("students" if is_student_scope else "employees"),
            "summary": {
                "present_today": present_today_count,
                "absent": absent_today_count,
                "on_leave": on_leave_today_count,
                "avg_attendance_pct": avg_att,
                "total_profiles": len(attendance_rows)
            },
            "employees": attendance_rows,
            "departments": all_depts
        }

    @staticmethod
    def reset_user_password(
        db: Session,
        target_type: str,
        target_id: str,
        new_password: str,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        from src.utils.security import hash_password
        from src.models.student import student
        from src.models.hrms import Employee
        from src.models.user import User

        if not new_password or len(new_password.strip()) < 4:
            raise ValueError("New password must be at least 4 characters long.")

        clean_pwd = new_password.strip()
        pwd_hash = hash_password(clean_pwd)

        email = ""
        user_obj = None
        target_name = ""

        t_type = (target_type or "").strip().lower()

        if t_type == "student":
            st = db.query(student).filter(
                (student.id == target_id) | (student.user_id == target_id) | (student.email.ilike(target_id))
            ).first()
            if not st:
                # Check direct User match
                u_direct = db.query(User).filter((User.id == target_id) | (User.email.ilike(target_id))).first()
                if u_direct:
                    u_direct.password_hash = pwd_hash
                    db.commit()
                    return {"status": "success", "message": f"Password for {u_direct.full_name or u_direct.email} updated successfully.", "email": u_direct.email}
                raise ValueError("Student record not found.")
            email = (st.email or "").strip().lower()
            target_name = st.full_name or "Student"
            
            if st.user_id:
                user_obj = db.query(User).filter(User.id == st.user_id).first()
            if not user_obj and email:
                user_obj = db.query(User).filter(User.email.ilike(email)).first()
            
            if user_obj:
                user_obj.password_hash = pwd_hash
                if not st.user_id:
                    st.user_id = user_obj.id
            else:
                user_id = f"usr_{uuid.uuid4().hex[:8]}"
                user_obj = User(
                    id=user_id,
                    email=email,
                    password_hash=pwd_hash,
                    role="STUDENT",
                    full_name=target_name,
                    phone=st.phone,
                    is_active=True
                )
                db.add(user_obj)
                st.user_id = user_id

        elif t_type in ["employee", "staff"]:
            emp = db.query(Employee).filter(
                (Employee.id == target_id) | (Employee.id == f"emp_{target_id}") | (Employee.email.ilike(target_id))
            ).first()
            if not emp:
                u_direct = db.query(User).filter((User.id == target_id) | (User.email.ilike(target_id))).first()
                if u_direct:
                    u_direct.password_hash = pwd_hash
                    db.commit()
                    return {"status": "success", "message": f"Password for {u_direct.full_name or u_direct.email} updated successfully.", "email": u_direct.email}
                raise ValueError("Employee record not found.")
            email = (emp.email or "").strip().lower()
            target_name = f"{emp.first_name} {emp.last_name or ''}".strip() or emp.email
            
            if emp.user_id:
                user_obj = db.query(User).filter(User.id == emp.user_id).first()
            if not user_obj and email:
                user_obj = db.query(User).filter(User.email.ilike(email)).first()
            
            if user_obj:
                user_obj.password_hash = pwd_hash
                if not emp.user_id:
                    emp.user_id = user_obj.id
            else:
                user_id = f"usr_{uuid.uuid4().hex[:8]}"
                user_obj = User(
                    id=user_id,
                    email=email,
                    password_hash=pwd_hash,
                    role="EMPLOYEE",
                    full_name=target_name,
                    phone=emp.phone,
                    is_active=True
                )
                db.add(user_obj)
                emp.user_id = user_id
        elif t_type in ["ho", "head_office", "head office", "owner", "manager", "admin", "super_admin"]:
            user_obj = db.query(User).filter(
                (User.id == target_id) | (User.email.ilike(target_id))
            ).first()
            if not user_obj and current_user:
                user_obj = current_user
            if not user_obj:
                raise ValueError(f"{target_type.upper()} account record not found.")
            email = (user_obj.email or "").strip().lower()
            target_name = user_obj.full_name or user_obj.email
            user_obj.password_hash = pwd_hash
        else:
            # Fallback direct user lookup across the database
            user_obj = db.query(User).filter(
                (User.id == target_id) | (User.email.ilike(target_id))
            ).first()
            if not user_obj and current_user:
                user_obj = current_user
            if user_obj:
                email = (user_obj.email or "").strip().lower()
                target_name = user_obj.full_name or user_obj.email
                user_obj.password_hash = pwd_hash
            else:
                raise ValueError(f"Account not found for target: {target_id}")

        db.commit()
        return {
            "status": "success",
            "message": f"Password for {target_name} ({email}) updated successfully.",
            "target_id": target_id,
            "target_name": target_name,
            "email": email
        }
