import uuid
import math
import calendar
from datetime import datetime, date, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.models.hrms import (
    Employee, Department, Designation, Team, EmployeeDocument,
    EmployeeAttendance, LeaveRequest, PayrollRecord,
    RecruitmentJob, JobApplicant, EmployeePerformance, ExitRequest,
    GeofenceScheme, LeaveType, EmployeeLeaveBalance
)
from src.models.trainer import TrainerProfile
from src.models.payroll import PayrollInvoice
from src.models.customer import Customer
from src.models.user import User
from src.models.biometric import BiometricLog
from src.models.gym_setting import GymBranch, GymSetting

IST = timezone(timedelta(hours=5, minutes=30))



class HrmsService:
    # -------------------------------------------------------------
    # 1. EMPLOYEE MANAGEMENT & TRAINERS MAPPING METHODS
    # -------------------------------------------------------------
    @staticmethod
    def sync_trainers_to_employees(db: Session) -> None:
        """
        Synchronizes all trainers and staff from TrainerProfile into HRMS Employee records.
        Removes any obsolete or mock employee records that do not belong to actual trainers/staff.
        """
        trainers = db.query(TrainerProfile).all()
        trainer_emails = {t.email.strip().lower() for t in trainers if t.email}

        # 1. Purge obsolete/mock employees not present in TrainerProfile
        all_employees = db.query(Employee).all()
        for emp in all_employees:
            if not emp.email or emp.email.strip().lower() not in trainer_emails:
                db.query(EmployeeAttendance).filter(EmployeeAttendance.employee_id == emp.id).delete()
                db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp.id).delete()
                db.query(PayrollRecord).filter(PayrollRecord.employee_id == emp.id).delete()
                db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp.id).delete()
                db.query(EmployeePerformance).filter(EmployeePerformance.employee_id == emp.id).delete()
                db.query(ExitRequest).filter(ExitRequest.employee_id == emp.id).delete()
                db.delete(emp)
        db.flush()

        # 2. Upsert each TrainerProfile into Employee
        existing_codes = {e.code for e in db.query(Employee.code).all() if e.code}
        next_code_num = 1

        for idx, t in enumerate(trainers, start=1):
            full_name = (t.full_name or "").strip()
            parts = full_name.split(" ", 1)
            first_name = parts[0] if parts else "Staff"
            last_name = parts[1] if len(parts) > 1 else ""

            role = (t.role or "TRAINER").upper()
            if role == "GYM_OWNER":
                dept = "Executive Management"
                desg = t.specialization or "Gym Owner / Director"
            elif role == "MANAGER":
                dept = "Operations & Management"
                desg = t.specialization or "Gym Operations Manager"
            elif role == "STAFF":
                dept = "Front Desk & Customer Support"
                desg = t.specialization or "Front Desk Executive"
            else:
                dept = "Fitness & Training"
                desg = t.specialization or "Fitness Coach & Trainer"

            status = "Active" if t.is_active else "Inactive"
            salary = float(t.base_monthly_salary or 0.0)
            joined = t.created_at.date() if t.created_at else date.today()

            existing_emp = db.query(Employee).filter(
                (Employee.email.ilike(t.email)) | (Employee.id == f"emp_{t.id}")
            ).first()

            if existing_emp:
                existing_emp.first_name = first_name
                existing_emp.last_name = last_name
                existing_emp.email = t.email
                existing_emp.phone = t.phone or existing_emp.phone or ""
                existing_emp.gender = t.gender or existing_emp.gender
                existing_emp.designation = desg
                existing_emp.department = dept
                existing_emp.status = status
                existing_emp.salary = salary
                existing_emp.gym_branch = t.primary_gym_location or existing_emp.gym_branch or ""
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
                    reporting_manager="Director / Owner",
                    joined_date=joined,
                    employment_type=role.title() if role in ["MANAGER", "STAFF"] else "Full-Time",
                    status=status,
                    salary=salary,
                    avatar="",
                    gym_branch=t.primary_gym_location or "Main Branch",
                    skills=[t.specialization] if t.specialization else []
                )
                db.add(new_emp)

        db.commit()

    @staticmethod
    def get_employees(db: Session, department: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        # Always sync with trainer profiles first
        try:
            HrmsService.sync_trainers_to_employees(db)
        except Exception:
            db.rollback()

        query = db.query(Employee)
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
                "designation": e.designation,
                "department": e.department,
                "reporting_manager": e.reporting_manager or "",
                "joined_date": e.joined_date.strftime("%d/%m/%Y") if e.joined_date else "",
                "employment_type": e.employment_type or "Full-Time",
                "status": e.status or "Active",
                "salary": float(e.salary or 0.0),
                "avatar": e.avatar or "",
                "skills": e.skills or [],
                "gym_branch": e.gym_branch or "",
                "emergency_contact": e.emergency_contact or "",
                "created_at": e.created_at.isoformat() if e.created_at else None
            })
        return result

    @staticmethod
    def create_employee(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        first_name = str(payload.get("first_name") or "").strip()
        last_name = str(payload.get("last_name") or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "New Staff"
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone") or "").strip()
        designation = str(payload.get("designation") or "Fitness Trainer").strip()
        department = str(payload.get("department") or "Fitness & Training").strip()
        salary = float(payload.get("salary") or 0.0)
        gym_branch = str(payload.get("gym_branch") or "").strip()

        # Map department/designation to TrainerProfile role
        role = "TRAINER"
        if "Management" in department or "Director" in designation or "Owner" in designation:
            role = "MANAGER" if "Operations" in department else "GYM_OWNER"
        elif "Front Desk" in department or "Support" in department:
            role = "STAFF"

        # Also register in TrainerProfile so both remain in sync
        from src.services.payroll_service import PayrollService
        PayrollService.register_trainer(db, {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "role": role,
            "specialization": designation,
            "base_monthly_salary": salary,
            "primary_gym_location": gym_branch
        })

        HrmsService.sync_trainers_to_employees(db)
        emp = db.query(Employee).filter(Employee.email == email).first()
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

        # Sync back to TrainerProfile if exists
        trainer_id = emp_id.replace("emp_", "")
        trainer = db.query(TrainerProfile).filter(
            (TrainerProfile.id == trainer_id) | (TrainerProfile.email == emp.email)
        ).first()
        if trainer:
            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            trainer.full_name = full_name
            trainer.email = emp.email
            trainer.phone = emp.phone
            trainer.specialization = emp.designation
            trainer.base_monthly_salary = emp.salary
            trainer.is_active = (emp.status.lower() == "active")

        db.commit()
        return {"message": "Employee updated successfully"}

    @staticmethod
    def delete_employee(db: Session, emp_id: str) -> bool:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            return False

        trainer_id = emp_id.replace("emp_", "")
        trainer = db.query(TrainerProfile).filter(
            (TrainerProfile.id == trainer_id) | (TrainerProfile.email == emp.email)
        ).first()
        if trainer:
            db.delete(trainer)

        db.delete(emp)
        db.commit()
        return True


    # -------------------------------------------------------------
    # 2. DEPARTMENTS, DESIGNATIONS, TEAMS, DOCUMENTS
    # -------------------------------------------------------------
    @staticmethod
    def get_departments(db: Session) -> List[Dict[str, Any]]:
        depts = db.query(Department).order_by(Department.name.asc()).all()
        result = []
        for d in depts:
            count = db.query(Employee).filter(Employee.department == d.name).count()
            result.append({
                "id": d.id,
                "name": d.name,
                "code": d.code,
                "description": d.description or "",
                "head_name": d.head_name or "",
                "is_active": d.is_active,
                "employee_count": count
            })
        return result

    @staticmethod
    def create_department(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        dept = Department(
            id=f"dept_{uuid.uuid4().hex[:8]}",
            name=str(payload.get("name") or "").strip(),
            code=str(payload.get("code") or "").strip(),
            description=str(payload.get("description") or "").strip(),
            head_name=str(payload.get("head_name") or "").strip(),
            is_active=bool(payload.get("is_active", True))
        )
        db.add(dept)
        db.commit()
        return {"message": "Department created successfully", "id": dept.id}

    @staticmethod
    def get_designations(db: Session) -> List[Dict[str, Any]]:
        desgs = db.query(Designation).order_by(Designation.title.asc()).all()
        result = []
        for d in desgs:
            emp_count = db.query(Employee).filter(Employee.designation == d.title).count()
            result.append({
                "id": d.id,
                "title": d.title,
                "department": d.department,
                "level": d.level or "",
                "description": d.description or "",
                "employee_count": emp_count
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
        return {"message": "Designation created successfully", "id": desg.id}

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
            # Dynamically initialize from actual GymBranch / GymSetting if existing
            branches = db.query(GymBranch).filter(GymBranch.is_active == True).all()
            setting = db.query(GymSetting).first()
            gym_title = setting.gym_name if setting and setting.gym_name else ""
            all_emps = db.query(Employee).all()
            all_emp_ids = [e.id for e in all_emps]

            if branches:
                for b in branches:
                    new_scheme = GeofenceScheme(
                        id=f"scheme_{uuid.uuid4().hex[:8]}",
                        name=b.branch_name,
                        branch_name=b.branch_name,
                        gym_name=b.gym_name or gym_title,
                        latitude=None,
                        longitude=None,
                        radius_meters=500,
                        strict_restriction=False,
                        ip_whitelist="",
                        shift_start_time="",
                        shift_end_time="",
                        grace_period_mins=0,
                        min_half_day_hours=None,
                        allowed_channels=["gps", "biometric", "face_recognition", "web_ess"],
                        assigned_employee_ids=all_emp_ids,
                        is_active=True
                    )
                    db.add(new_scheme)
                db.commit()
                schemes = db.query(GeofenceScheme).order_by(GeofenceScheme.created_at.asc()).all()

        result = []
        for s in schemes:
            result.append({
                "id": s.id,
                "name": s.name,
                "branch_name": s.branch_name or "",
                "gym_name": s.gym_name or "",
                "latitude": float(s.latitude) if s.latitude is not None else None,
                "longitude": float(s.longitude) if s.longitude is not None else None,
                "radius_meters": int(s.radius_meters) if s.radius_meters is not None else None,
                "strict_restriction": bool(s.strict_restriction),
                "ip_whitelist": s.ip_whitelist or "",
                "shift_start_time": s.shift_start_time or "",
                "shift_end_time": s.shift_end_time or "",
                "grace_period_mins": int(s.grace_period_mins or 0),
                "min_half_day_hours": float(s.min_half_day_hours) if s.min_half_day_hours is not None else None,
                "allowed_channels": s.allowed_channels or [],
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
        if "gym_name" in payload:
            scheme.gym_name = payload["gym_name"]
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
        if "allowed_channels" in payload:
            scheme.allowed_channels = payload["allowed_channels"]
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
    def get_attendance_logs(db: Session, selected_date: Optional[str] = None) -> List[Dict[str, Any]]:
        now_ist = datetime.now(IST)
        target_date = now_ist.date()
        if selected_date:
            try:
                target_date = datetime.strptime(selected_date, "%Y-%m-%d").date()
            except Exception:
                pass

        logs = db.query(EmployeeAttendance).filter(EmployeeAttendance.date == target_date).order_by(EmployeeAttendance.created_at.desc()).all()
        result = []
        recorded_emp_ids = set()
        for l in logs:
            emp = db.query(Employee).filter(Employee.id == l.employee_id).first()
            if not emp:
                continue
            full_name = f"{emp.first_name} {emp.last_name or ''}".strip()
            parts = full_name.split()
            initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "EM"
            result.append({
                "id": l.id,
                "employee_id": l.employee_id,
                "employee_code": emp.code,
                "employee_name": full_name,
                "initials": initials,
                "designation": emp.designation,
                "department": emp.department,
                "date": l.date.strftime("%d/%m/%Y") if l.date else "",
                "check_in": l.check_in or "--:--",
                "check_out": l.check_out or "--:--",
                "status": l.status,
                "work_hours": float(l.work_hours or 0.0),
                "notes": l.notes or ""
            })
            recorded_emp_ids.add(l.employee_id)

        # Also pull staff / trainer attendance from BiometricLog for target date
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())
        bio_staff_logs = db.query(BiometricLog).filter(
            BiometricLog.timestamp >= start_of_day,
            BiometricLog.timestamp <= end_of_day,
            BiometricLog.user_role.in_(["TRAINER", "STAFF", "GYM_OWNER", "MANAGER"])
        ).order_by(BiometricLog.timestamp.desc()).all()

        for blog in bio_staff_logs:
            meta = blog.meta_data or {}
            emp_id = blog.customer_id or meta.get("employee_id") or meta.get("user_id") or "staff"
            if emp_id in recorded_emp_ids:
                continue
            name = meta.get("employee_name") or meta.get("user_name") or "Staff Member"
            parts = name.split()
            initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "ST"
            t_str = blog.timestamp.strftime("%I:%M %p") if blog.timestamp else "--:--"
            result.append({
                "id": blog.id,
                "employee_id": emp_id,
                "employee_code": emp_id.upper() if len(emp_id) < 15 else "EMP-BIO",
                "employee_name": name,
                "initials": initials,
                "designation": "Staff / Trainer",
                "department": "Fitness & Operations",
                "date": blog.timestamp.strftime("%d/%m/%Y") if blog.timestamp else target_date.strftime("%d/%m/%Y"),
                "check_in": t_str if blog.direction == "CHECK_IN" else "--:--",
                "check_out": t_str if blog.direction == "CHECK_OUT" else "--:--",
                "status": "Present",
                "work_hours": 0.0,
                "notes": f"Biometric Punch ({blog.event_type})"
            })
            recorded_emp_ids.add(emp_id)

        return result

    @staticmethod
    def record_punch(db: Session, employee_id: str, action: str, note: Optional[str] = None,
                     latitude: Optional[float] = None, longitude: Optional[float] = None,
                     method: Optional[str] = "MANUAL", user_role: Optional[str] = "STAFF",
                     branch: Optional[str] = None) -> Dict[str, Any]:
        now_ist = datetime.now(IST)
        today = now_ist.date()
        now_str = now_ist.strftime("%I:%M %p")

        # Find active geofence scheme for branch / radius calculation
        scheme = None
        if branch:
            scheme = db.query(GeofenceScheme).filter(
                GeofenceScheme.branch_name.ilike(f"%{branch}%"),
                GeofenceScheme.is_active == True
            ).first()
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

        # Check shift timing for late flag using IST
        status = "Present"
        if action == "CHECK_IN" and scheme and scheme.shift_start_time:
            try:
                shift_time = datetime.strptime(scheme.shift_start_time.strip(), "%I:%M %p").time()
                grace_mins = int(scheme.grace_period_mins or 0)
                shift_total_mins = shift_time.hour * 60 + shift_time.minute + grace_mins
                now_total_mins = now_ist.hour * 60 + now_ist.minute
                if now_total_mins > shift_total_mins:
                    status = "Late"
            except Exception:
                pass

        punch_notes = note or f"Punch via {method} ({action})"
        if distance is not None:
            punch_notes += f" | Distance: {distance:.0f}m"

        user_role_upper = (user_role or "STAFF").upper()
        display_name = "User"
        customer_id_val = None

        if user_role_upper == "CUSTOMER":
            # Check Customer record
            from src.models.customer import Customer
            cust = db.query(Customer).filter(
                (Customer.id == employee_id) | (Customer.user_id == employee_id) | (Customer.email.ilike(employee_id)) | (Customer.id == f"cust_{employee_id}")
            ).first()
            if not cust:
                user = db.query(User).filter((User.id == employee_id) | (User.email.ilike(employee_id))).first()
                if user:
                    cust = db.query(Customer).filter((Customer.user_id == user.id) | (Customer.email == user.email)).first()

            if cust:
                display_name = cust.full_name
                customer_id_val = cust.id
                cust.status = "ACTIVE"
            else:
                display_name = "Gym Customer"
                customer_id_val = employee_id
        else:

            # Trainer / Staff / Owner
            emp = db.query(Employee).filter(
                (Employee.id == employee_id) | (Employee.code == employee_id) | (Employee.email.ilike(employee_id))
            ).first()

            if not emp:
                trainer = db.query(TrainerProfile).filter(
                    (TrainerProfile.id == employee_id) | (TrainerProfile.email.ilike(employee_id))
                ).first()
                if trainer:
                    emp = db.query(Employee).filter(Employee.id == f"emp_{trainer.id}").first()

            if not emp and user_role_upper == "GYM_OWNER":
                owner_user = db.query(User).filter(User.role == "GYM_OWNER").first()
                if owner_user:
                    emp = db.query(Employee).filter(
                        (Employee.email.ilike(owner_user.email)) | (Employee.id == f"emp_{owner_user.id}")
                    ).first()
                    if not emp:
                        full_name = owner_user.name or "Gym Owner / Director"
                        unique_code = f"EMP-{uuid.uuid4().hex[:4].upper()}"
                        emp = Employee(
                            id=f"emp_{owner_user.id}",
                            code=unique_code,
                            first_name=full_name,
                            email=owner_user.email,
                            designation="Gym Owner / Management",
                            department="Executive Management",
                            status="Active"
                        )
                        db.add(emp)
                        db.flush()

            if not emp:
                full_name = "Gym Owner / Director" if "owner" in employee_id.lower() or "admin" in employee_id.lower() or user_role_upper == "GYM_OWNER" else "Staff Member"
                unique_code = f"EMP-{uuid.uuid4().hex[:4].upper()}"
                emp = Employee(
                    id=f"emp_{uuid.uuid4().hex[:8]}",
                    code=unique_code,
                    first_name=full_name,
                    email=f"{employee_id or 'owner'}@fitclub.ai" if "@" not in employee_id else employee_id,
                    designation="Gym Owner / Management" if ("owner" in employee_id.lower() or user_role_upper == "GYM_OWNER") else "Fitness Trainer",
                    department="Executive Management" if ("owner" in employee_id.lower() or user_role_upper == "GYM_OWNER") else "Fitness & Training",
                    status="Active"
                )
                db.add(emp)
                db.flush()

            display_name = f"{emp.first_name} {emp.last_name or ''}".strip()

            # Record in EmployeeAttendance
            att = db.query(EmployeeAttendance).filter(
                EmployeeAttendance.employee_id == emp.id,
                EmployeeAttendance.date == today
            ).first()

            if not att:
                att = EmployeeAttendance(
                    id=f"att_{uuid.uuid4().hex[:8]}",
                    employee_id=emp.id,
                    date=today,
                    check_in=now_str if action == "CHECK_IN" else None,
                    check_out=now_str if action == "CHECK_OUT" else None,
                    status=status,
                    work_hours=0.0,
                    notes=punch_notes
                )
                db.add(att)
            else:
                if action == "CHECK_IN":
                    att.check_in = now_str
                    att.status = status
                elif action == "CHECK_OUT":
                    att.check_out = now_str
                    if att.check_in:
                        try:
                            t1 = datetime.strptime(att.check_in, "%I:%M %p")
                            t2 = datetime.strptime(now_str, "%I:%M %p")
                            diff_hours = (t2 - t1).total_seconds() / 3600.0
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

            bio_log = BiometricLog(
                id=f"bio_{uuid.uuid4().hex[:8]}",
                customer_id=customer_id_val,
                user_role=user_role_upper,
                event_type=event_type,
                device_type="GEOFENCE_ESS",
                device_id="ess_geofence_portal",
                device_name=f"{branch or (scheme.branch_name if scheme else 'Main Branch')} ({device_label})",
                direction=action,
                status="SUCCESS",
                confidence_score=0.99 if method == "FACE_ID" else 1.0,
                meta_data={
                    "user_id": employee_id,
                    "user_name": display_name,
                    "distance_meters": distance,
                    "within_perimeter": is_within_geofence,
                    "latitude": latitude,
                    "longitude": longitude,
                    "method": method,
                    "branch": branch or (scheme.branch_name if scheme else "Main Branch"),
                    "scheme_name": scheme.name if scheme else "Standard"
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
            "status": status,
            "distance_meters": distance,
            "is_within_geofence": is_within_geofence,
            "method": method,
            "employee_name": display_name
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
        """Updates an existing leave policy configured by Gym Owner/Admin."""
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
        Dynamically calculates and filters leave eligibility for a specific employee/trainer.
        Applies Gender, Employment Type, Minimum Service Days, and Department rules.
        Calculates real-time allocated, used, pending, and remaining balances per eligible leave.
        """
        emp_id = str(employee_id or "").strip()
        emp = db.query(Employee).filter((Employee.id == emp_id) | (Employee.code == emp_id) | (Employee.email.ilike(emp_id))).first()
        trainer = None
        if not emp:
            clean_id = emp_id.replace("emp_", "")
            trainer = db.query(TrainerProfile).filter(
                (TrainerProfile.id == emp_id) | (TrainerProfile.id == clean_id) | (TrainerProfile.email.ilike(emp_id))
            ).first()
            if trainer:
                emp = db.query(Employee).filter(Employee.id == f"emp_{trainer.id}").first()

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
        elif trainer:
            emp_gender = (trainer.gender or "MALE").strip().upper()
            emp_name = trainer.full_name or "Trainer"
            emp_dept = trainer.primary_gym_location or "Fitness"
            joined_d = trainer.created_at.date() if trainer.created_at else date.today()

        service_days = max(0, (date.today() - joined_d).days)
        current_year = date.today().year
        year_start = date(current_year, 1, 1)
        year_end = date(current_year, 12, 31)

        # Query all active leave types
        active_policies = db.query(LeaveType).filter(LeaveType.is_active == True).order_by(LeaveType.created_at.asc()).all()

        # Query employee approved leaves this year
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == (emp.id if emp else employee_id),
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date >= year_start,
            LeaveRequest.start_date <= year_end
        ).all()

        # Query employee pending leaves this year
        pending_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == (emp.id if emp else employee_id),
            LeaveRequest.status == "Pending",
            LeaveRequest.start_date >= year_start,
            LeaveRequest.start_date <= year_end
        ).all()

        # Custom balance overrides
        balances = db.query(EmployeeLeaveBalance).filter(
            EmployeeLeaveBalance.employee_id == (emp.id if emp else employee_id),
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
            used_days = sum(l.days for l in approved_leaves if (l.leave_type_id == policy.id or l.leave_type.lower() == policy.name.lower() or l.leave_type.lower() == policy.code.lower()))
            pending_days = sum(l.days for l in pending_leaves if (l.leave_type_id == policy.id or l.leave_type.lower() == policy.name.lower() or l.leave_type.lower() == policy.code.lower()))

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
                "max_consecutive_days": policy.max_consecutive_days,
                "carry_forward_allowed": policy.carry_forward_allowed,
                "max_carry_forward_days": policy.max_carry_forward_days or 0,
                "encashment_allowed": policy.encashment_allowed,
                "max_encashment_days": policy.max_encashment_days or 0,
                "attachment_required": policy.attachment_required,
                "is_eligible": is_eligible,
                "ineligibility_reason": None
            }

            if is_eligible:
                eligible_types.append(item_data)
                total_allocated += allocated_days
                total_used += used_days
                total_remaining += remaining_days
                total_pending += pending_days
            else:
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
            trainer = None
            if not emp:
                clean_id = l.employee_id.replace("emp_", "")
                trainer = db.query(TrainerProfile).filter(
                    (TrainerProfile.id == l.employee_id) | (TrainerProfile.id == clean_id)
                ).first()
                if trainer:
                    emp = db.query(Employee).filter(Employee.id == f"emp_{trainer.id}").first()

            emp_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else (trainer.full_name if trainer else "")
            emp_code = emp.code if emp else (f"TR-{trainer.id.replace('tr_', '').upper()}" if trainer else "")
            emp_gender = emp.gender if emp else (trainer.gender if trainer and trainer.gender else "Male")
            dept = emp.department if emp else (trainer.primary_gym_location if trainer and trainer.primary_gym_location else "")
            designation = emp.designation if emp else (trainer.role if trainer and trainer.role else "")

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
            raise ValueError("Employee / Trainer ID is required.")

        # Ensure employee exists or resolve trainer
        emp = db.query(Employee).filter((Employee.id == emp_id) | (Employee.code == emp_id) | (Employee.email.ilike(emp_id))).first()
        if not emp:
            clean_tid = emp_id.replace("emp_", "")
            trainer = db.query(TrainerProfile).filter((TrainerProfile.id == emp_id) | (TrainerProfile.id == clean_tid) | (TrainerProfile.email.ilike(emp_id))).first()
            if trainer:
                emp_id = f"emp_{trainer.id}"
                emp = db.query(Employee).filter(Employee.id == emp_id).first()
                if not emp:
                    emp = Employee(
                        id=emp_id,
                        code=f"TR-{trainer.id.replace('tr_', '').upper()}",
                        first_name=trainer.full_name,
                        email=trainer.email,
                        phone=trainer.phone or "",
                        gender=trainer.gender or "Male",
                        designation=trainer.role or trainer.specialization or "",
                        department=trainer.primary_gym_location or "",
                        status="Active",
                        salary=float(trainer.base_monthly_salary or 0.0)
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

        # Policy validation if leave type found
        if lt:
            emp_gender = (emp.gender or "MALE").strip().upper() if emp else "MALE"
            genders = [g.upper() for g in (lt.gender_eligibility or ["ALL"])]
            if "ALL" not in genders and emp_gender not in genders:
                raise ValueError(f"'{lt.name}' is only eligible for {', '.join(lt.gender_eligibility)}. Current employee is {emp_gender.capitalize()}.")

            if lt.max_consecutive_days and days > lt.max_consecutive_days:
                raise ValueError(f"Maximum consecutive days allowed for '{lt.name}' is {lt.max_consecutive_days} days (Requested {days} days).")

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
        employees = db.query(Employee).filter(Employee.status == "Active").order_by(Employee.first_name.asc()).all()
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
    def generate_batch_payroll(db: Session, trainer_ids: List[str], month: Optional[str] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Dynamically generates monthly payroll for selected trainers/staff based on:
        - Base monthly salary from TrainerProfile
        - Biometric punches & attendance records for the month
        - Approved paid leaves (no deduction for approved paid/casual/sick leaves)
        - Assigned active customer enrollments and conducted PT sessions
        - Unexcused absent days deduction = (base_monthly_salary / total_days) * absent_days
        - Commission = pt_sessions_count * pt_session_rate
        - Net Salary = Base Salary Earned + PT Commission + Allowances - Deductions
        """
        month_num, year_num, month_name = HrmsService._parse_month_year(month, year)
        _, days_in_month = calendar.monthrange(year_num, month_num)
        month_year_key = f"{year_num}-{month_num:02d}"

        start_date = date(year_num, month_num, 1)
        end_date = date(year_num, month_num, days_in_month)
        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        # If trainer_ids is empty or contains "ALL", fetch all active trainers
        if not trainer_ids or "ALL" in [t.upper() for t in trainer_ids]:
            all_trainers = db.query(TrainerProfile).filter(TrainerProfile.is_active == True).all()
            target_trainer_ids = [t.id for t in all_trainers]
        else:
            target_trainer_ids = trainer_ids

        generated_records = []

        for tid in target_trainer_ids:
            clean_tid = tid.replace("emp_", "")
            trainer = db.query(TrainerProfile).filter(
                (TrainerProfile.id == clean_tid) | (TrainerProfile.id == tid) | (TrainerProfile.email.ilike(tid))
            ).first()

            emp = db.query(Employee).filter(
                (Employee.id == tid) | (Employee.id == f"emp_{clean_tid}") | (Employee.code == tid)
            ).first()

            if not trainer and not emp:
                continue

            # Ensure Employee record exists for HRMS tracking
            if trainer and not emp:
                emp_id = f"emp_{trainer.id}"
                emp = db.query(Employee).filter(Employee.id == emp_id).first()
                if not emp:
                    emp = Employee(
                        id=emp_id,
                        code=f"TR-{trainer.id.replace('tr_', '').upper()}",
                        first_name=trainer.full_name,
                        email=trainer.email,
                        phone=trainer.phone or "",
                        designation=trainer.role or trainer.specialization or "",
                        department=trainer.primary_gym_location or "",
                        status="Active",
                        salary=float(trainer.base_monthly_salary or 0.0)
                    )
                    db.add(emp)
                    db.flush()

            full_name = trainer.full_name if trainer else f"{emp.first_name} {emp.last_name or ''}".strip()
            base_salary = float(trainer.base_monthly_salary if trainer else (emp.salary or 0.0))
            pt_rate = float(trainer.pt_session_rate if trainer else 0.0)

            # 1. Count Assigned PT Customers and Conducted PT sessions
            assigned_cust_count = 0
            if trainer:
                assigned_cust_count = db.query(Customer).filter(
                    (Customer.trainer_id == trainer.id) | (Customer.trainer_id == trainer.user_id)
                ).count()
            pt_sessions_count = assigned_cust_count

            # 2. Count Biometric Punch days present in this month
            distinct_punch_days = set()
            bio_logs = db.query(BiometricLog).filter(
                BiometricLog.timestamp >= start_datetime,
                BiometricLog.timestamp <= end_datetime,
            ).all()

            search_ids = {clean_tid, tid}
            if trainer and trainer.user_id:
                search_ids.add(trainer.user_id)
            if emp:
                search_ids.add(emp.id)

            for blog in bio_logs:
                meta = blog.meta_data or {}
                uid = str(blog.customer_id or meta.get("user_id") or meta.get("employee_id") or "")
                if uid in search_ids or (blog.user_role in ["TRAINER", "STAFF", "GYM_OWNER"] and meta.get("user_name") == full_name):
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
            commission_earned = round(pt_sessions_count * pt_rate, 2)
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
                    payment_method=trainer.upi_id if (trainer and trainer.upi_id) else (trainer.bank_account_no if trainer and trainer.bank_account_no else "UPI")
                )
                db.add(existing_rec)
            else:
                existing_rec.base_salary = base_salary
                existing_rec.allowances = allowances
                existing_rec.deductions = deductions
                existing_rec.net_salary = net_salary
                existing_rec.month = month_name
                existing_rec.year = year_num

            # Update PayrollInvoice if trainer
            if trainer:
                inv_id = f"inv_{trainer.id}_{month_year_key.replace('-', '')}"
                existing_inv = db.query(PayrollInvoice).filter(PayrollInvoice.id == inv_id).first()
                if not existing_inv:
                    existing_inv = PayrollInvoice(
                        id=inv_id,
                        trainer_id=trainer.id,
                        month_year=month_year_key,
                        days_present=effective_present_days,
                        days_absent=days_absent,
                        pt_sessions_count=pt_sessions_count,
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
                    existing_inv.pt_sessions_count = pt_sessions_count
                    existing_inv.base_salary_earned = base_salary_earned
                    existing_inv.commission_earned = commission_earned
                    existing_inv.deductions = deductions
                    existing_inv.net_salary = net_salary

            db.commit()

            generated_records.append({
                "id": existing_rec.id,
                "trainer_id": trainer.id if trainer else clean_tid,
                "employee_id": emp.id if emp else f"emp_{clean_tid}",
                "employee_code": emp.code if emp else (f"TR-{clean_tid.replace('tr_', '').upper()}" if clean_tid else ""),
                "employee_name": full_name,
                "designation": emp.designation if emp else (trainer.role if trainer and trainer.role else ""),
                "department": emp.department if emp else (trainer.primary_gym_location if trainer and trainer.primary_gym_location else ""),
                "month": month_name,
                "year": year_num,
                "month_year": month_year_key,
                "base_salary": base_salary,
                "base_salary_earned": base_salary_earned,
                "days_present": effective_present_days,
                "days_absent": days_absent,
                "paid_leave_days": paid_leave_days,
                "pt_sessions_count": pt_sessions_count,
                "pt_session_rate": pt_rate,
                "commission_earned": commission_earned,
                "allowances": allowances,
                "deductions": deductions,
                "net_salary": net_salary,
                "status": existing_rec.status,
                "bank_account_no": trainer.bank_account_no if trainer else "",
                "bank_ifsc": trainer.bank_ifsc if trainer else "",
                "upi_id": trainer.upi_id if trainer else "",
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
            trainer_id = p.employee_id.replace("emp_", "")
            trainer = db.query(TrainerProfile).filter(
                (TrainerProfile.id == trainer_id) | (TrainerProfile.id == p.employee_id)
            ).first()

            full_name = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else (trainer.full_name if trainer else "")
            parts = full_name.split()
            initials = "".join([part[0].upper() for part in parts[:2]]) if parts else ""

            # Look for linked PayrollInvoice for detailed breakdown
            inv = None
            if trainer:
                inv = db.query(PayrollInvoice).filter(
                    (PayrollInvoice.trainer_id == trainer.id) | (PayrollInvoice.id.ilike(f"%{trainer.id}%"))
                ).order_by(PayrollInvoice.created_at.desc()).first()

            result.append({
                "id": p.id,
                "employee_id": p.employee_id,
                "trainer_id": trainer.id if trainer else trainer_id,
                "employee_code": emp.code if emp else (f"EMP-{p.employee_id[:4].upper()}" if p.employee_id else ""),
                "employee_name": full_name,
                "initials": initials,
                "designation": emp.designation if emp else (trainer.role if trainer and trainer.role else ""),
                "department": emp.department if emp else (trainer.primary_gym_location if trainer and trainer.primary_gym_location else ""),
                "month": p.month,
                "year": p.year,
                "base_salary": float(p.base_salary or 0.0),
                "base_salary_earned": float(inv.base_salary_earned if inv else (p.base_salary or 0.0)),
                "days_present": int(inv.days_present if inv else 0),
                "days_absent": int(inv.days_absent if inv else 0),
                "pt_sessions_count": int(inv.pt_sessions_count if inv else 0),
                "pt_session_rate": float(trainer.pt_session_rate if trainer else 0.0),
                "commission_earned": float(inv.commission_earned if inv else 0.0),
                "allowances": float(p.allowances or 0.0),
                "deductions": float(p.deductions or (inv.deductions if inv else 0.0)),
                "net_salary": float(p.net_salary or 0.0),
                "status": p.status or "",
                "bank_account_no": trainer.bank_account_no if trainer else "",
                "bank_ifsc": trainer.bank_ifsc if trainer else "",
                "upi_id": trainer.upi_id if trainer else "",
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
        trainer_id = pay.employee_id.replace("emp_", "")
        inv = db.query(PayrollInvoice).filter(
            (PayrollInvoice.trainer_id == trainer_id) | (PayrollInvoice.id.ilike(f"%{trainer_id}%"))
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
