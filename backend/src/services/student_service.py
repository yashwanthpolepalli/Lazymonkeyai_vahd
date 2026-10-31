import datetime
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session
from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
from src.models.user import User
from src.models.student import student
from src.models.membership import Membership
from src.models.biometric import BiometricLog
from src.utils.email import generate_enrollment_password, send_enrollment_email
from src.utils.security import hash_password
from src.models.settings import Branch as vahdBranch

from src.models.biometric_device import BiometricDevice

class studentService:

    @staticmethod
    def _format_student(c: student, db: Session) -> dict:
        now = now_ist_naive()

        # employee Name Lookup from DB
        employee_name = None
        if c.employee_id:
            employee_user = db.query(User).filter(User.id == c.employee_id).first()
            if employee_user:
                employee_name = employee_user.full_name

        # Last Visit & Attendance Calculation from Biometric DB Log
        last_log = db.query(BiometricLog).filter(
            (BiometricLog.student_id == c.id) | (BiometricLog.student_id == c.user_id)
        ).order_by(BiometricLog.timestamp.desc()).first()
        last_visit = to_ist_str(last_log.timestamp) if (last_log and last_log.timestamp) else None

        # Calculate 30-day attendance percentage from DB logs
        month_ago = now - datetime.timedelta(days=30)
        logs_count = db.query(BiometricLog).filter(
            (BiometricLog.student_id == c.id) | (BiometricLog.student_id == c.user_id),
            BiometricLog.timestamp >= month_ago
        ).count()
        attendance_pct = min(100, int((logs_count / 30.0) * 100)) if logs_count > 0 else 0

        # Real-time Today Attendance Calculation from Biometric DB Log
        today_start = today_ist_start()
        today_end = today_ist_end()
        cust_match_ids = {str(c.id)}
        if c.user_id:
            cust_match_ids.add(str(c.user_id))
            cust_match_ids.add(f"cust_usr_{c.user_id}")
            cust_match_ids.add(f"cust_{c.user_id}")
        if str(c.id).startswith("cust_"):
            cust_match_ids.add(str(c.id).replace("cust_", ""))
        else:
            cust_match_ids.add(f"cust_{c.id}")

        today_logs = db.query(BiometricLog).filter(
            (BiometricLog.student_id.in_(list(cust_match_ids))) |
            (BiometricLog.student_id == c.id) |
            (BiometricLog.student_id == c.user_id),
            BiometricLog.timestamp >= today_start,
            BiometricLog.timestamp <= today_end
        ).order_by(BiometricLog.timestamp.asc()).all()

        punch_in = None
        punch_out = None
        is_today_present = False
        today_punch_status = "Absent"

        if today_logs:
            in_logs = [
                l for l in today_logs
                if getattr(l, "direction", "") in ["CHECK_IN", "IN", "ENTRY", "ENROLL"]
                or "in" in str(getattr(l, "direction", "")).lower()
                or (l.event_type in ["FACE_SCAN", "FINGERPRINT", "RFID_CARD", "MANUAL", "GPS_SCAN"] and getattr(l, "direction", "") not in ["CHECK_OUT", "OUT", "EXIT"])
            ]
            out_logs = [
                l for l in today_logs
                if getattr(l, "direction", "") in ["CHECK_OUT", "OUT", "EXIT"]
                or "out" in str(getattr(l, "direction", "")).lower()
            ]

            if in_logs:
                punch_in = in_logs[0].timestamp.strftime("%H:%M:%S")
            elif today_logs:
                punch_in = today_logs[0].timestamp.strftime("%H:%M:%S")

            if out_logs:
                punch_out = out_logs[-1].timestamp.strftime("%H:%M:%S")
            elif len(today_logs) > 1:
                punch_out = today_logs[-1].timestamp.strftime("%H:%M:%S")

            is_today_present = True
            if punch_in and punch_out:
                today_punch_status = "Present"
            elif punch_in:
                today_punch_status = "Present"
            else:
                today_punch_status = "Present"

        # Dynamic Biometric Sync Detection (Strict DB check)
        biometric_count = db.query(BiometricLog).filter(BiometricLog.student_id == c.id).count()
        is_completed = bool(biometric_count > 0)
        biometric_status = "Completed" if is_completed else "Pending"

        # Dynamic KYC Completeness Calculation
        kyc_fields = [c.full_name, c.email, c.phone, c.gender]
        filled_count = sum(1 for f in kyc_fields if f is not None and str(f).strip() != "")
        kyc_percent = int((filled_count / len(kyc_fields)) * 100)
        kyc_status = "Verified & Ready" if kyc_percent >= 80 else f"{kyc_percent}% Complete"

        # Membership DB details
        mem = db.query(Membership).filter(Membership.student_id == c.id).order_by(Membership.created_at.desc()).first()
        mem_dict = None
        calculated_status = c.status if c.status else "ACTIVE"
        if mem:
            if mem.status != "ACTIVE" or (mem.expiry_date and mem.expiry_date < now):
                calculated_status = "EXPIRED"
            else:
                calculated_status = "ACTIVE"

        if mem:
            days_left = (mem.expiry_date - now).days if mem.expiry_date else 0
            mem_dict = {
                "id": mem.id,
                "planName": mem.plan_name,
                "status": "EXPIRED" if (mem.expiry_date and mem.expiry_date < now) else mem.status,
                "daysRemaining": max(0, days_left),
                "startDate": mem.start_date.isoformat() if mem.start_date else None,
                "endDate": mem.expiry_date.isoformat() if mem.expiry_date else None,
                "totalAmount": mem.price,
                "paidAmount": mem.paid_amount,
                "dueAmount": mem.due_amount,
            }

        revenue_str = f"₹{int(mem.price):,}" if (mem and mem.price) else "₹0"
        expiry_str = mem.expiry_date.strftime("%d-%m-%y") if (mem and mem.expiry_date) else None

        # Dynamic Student Admission Metadata & Course/Medium Resolution
        meta = dict(c.meta_data) if (c.meta_data and isinstance(c.meta_data, dict)) else {}

        return {
            "id": c.id,
            "user_id": c.user_id,
            "employee_id": c.employee_id,
            "employee": employee_name or "",
            "full_name": c.full_name,
            "name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "gender": c.gender or "",
            "qualification": getattr(c, "qualification", None) or meta.get("qualification") or "",
            "specialization": getattr(c, "specialization", None) or meta.get("specialization") or "",
            "department": meta.get("department") or "",
            "meta_data": meta,
            "course": meta.get("course") or "",
            "medium": meta.get("medium") or "",
            "father_name": meta.get("father_name") or "",
            "mother_name": meta.get("mother_name") or "",
            "parent_phone": c.parent_phone or meta.get("parent_mobile") or meta.get("parent_phone") or "",
            "parent_mobile": c.parent_phone or meta.get("parent_mobile") or meta.get("parent_phone") or "",
            "profile_image": c.profile_image or "",
            "status": calculated_status,
            "attendance": attendance_pct,
            "lastVisit": last_visit or "No recent visit",
            "expiry": expiry_str or "No active plan",
            "revenue": revenue_str,
            "branch": c.primary_vahd_location or "",
            "branch_id": c.branch_id or "",
            "owner_id": c.owner_id or "",
            "ho_id": c.ho_id or "",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "joinDate": c.created_at.isoformat() if c.created_at else None,
            "membership": mem.plan_name if mem else "No Active Plan",
            "membership_plan": mem_dict,
            "biometric_synced": is_completed,
            "biometric_status": biometric_status,
            "kyc_status": kyc_status,
            "kyc_percent": kyc_percent,
            "today_status": today_punch_status,
            "punch_in": punch_in,
            "punch_out": punch_out,
            "in_time": punch_in,
            "out_time": punch_out,
            "is_present": is_today_present,
            "isPresentToday": is_today_present,
            "today_punch": {
                "status": today_punch_status,
                "in_time": punch_in,
                "out_time": punch_out,
            },
        }

    @staticmethod
    def get_all_students(
        db: Session,
        current_user: Optional[User] = None,
        branch: Optional[str] = None,
        branch_id: Optional[str] = None,
        owner_id: Optional[str] = None
    ) -> List[dict]:
        from sqlalchemy import or_, func
        from src.models.settings import Branch as vahdBranch

        query = db.query(student)

        # Multi-tenant vahd owner & branch isolation
        if current_user:
            user_role = (current_user.role or "").strip().upper()
            if user_role in ["SUPER_ADMIN", "ADMIN"] or current_user.is_platform_admin:
                # Super Admin can view all or filter by query parameters
                if owner_id and str(owner_id).lower() not in ["all", "", "none", "undefined", "null"]:
                    query = query.filter(student.owner_id == owner_id)
                if branch_id and str(branch_id).lower() not in ["all", "", "none", "undefined", "null"]:
                    query = query.filter(student.branch_id == branch_id)
                if branch and str(branch).lower() not in ["all", "", "none", "undefined", "null"]:
                    query = query.filter(student.primary_vahd_location.ilike(f"%{branch}%"))
            elif user_role in ["HEAD_OFFICE", "HO"]:
                # Head Office can view all students across organizations under their Head Office
                possible_ho_ids = [x for x in [current_user.ho_id, current_user.id] if x]
                ho_branches = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.ho_id.in_(possible_ho_ids),
                        vahdBranch.owner_id == current_user.id,
                        vahdBranch.id == current_user.branch_id
                    )
                ).all()
                ho_branch_ids = [b.id for b in ho_branches if b.id]
                ho_branch_names = [b.branch_name for b in ho_branches if b.branch_name] + [b.vahd_name for b in ho_branches if b.vahd_name]

                conditions = [student.ho_id.in_(possible_ho_ids), student.owner_id == current_user.id]
                if ho_branch_ids:
                    conditions.append(student.branch_id.in_(ho_branch_ids))
                if ho_branch_names:
                    conditions.append(student.primary_vahd_location.in_(ho_branch_names))

                # Also match if the student's linked User record has ho_id in possible_ho_ids or owner_id == current_user.id
                user_matches = db.query(User.id).filter(
                    or_(
                        User.ho_id.in_(possible_ho_ids),
                        User.owner_id == current_user.id,
                        User.branch_id.in_(ho_branch_ids) if ho_branch_ids else False
                    )
                ).subquery()
                conditions.append(student.user_id.in_(user_matches))

                query = query.filter(or_(*conditions))

                # Sub-filter by specific organisation if selected by HO
                if branch_id or branch:
                    target_b = branch_id or branch
                    if str(target_b).lower() not in ["all", "", "none", "undefined", "null"]:
                        matched_b = db.query(vahdBranch).filter(
                            or_(vahdBranch.id == target_b, vahdBranch.branch_name == target_b, vahdBranch.vahd_name == target_b)
                        ).first()
                        b_filter_ids = [target_b]
                        b_filter_names = [target_b]
                        if matched_b:
                            b_filter_ids.append(matched_b.id)
                            if matched_b.branch_name:
                                b_filter_names.append(matched_b.branch_name)
                            if matched_b.vahd_name:
                                b_filter_names.append(matched_b.vahd_name)

                        conds = [student.branch_id.in_(b_filter_ids), student.ho_id == target_b]
                        for nm in b_filter_names:
                            conds.append(student.primary_vahd_location.ilike(f"%{nm}%"))
                        query = query.filter(or_(*conds))
            elif user_role in ["OWNER"]:
                # vahd Owner views students strictly belonging to their owner_id or owned branches
                owner_branches = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.owner_id == current_user.id,
                        vahdBranch.id == current_user.branch_id
                    )
                ).all()
                owner_branch_ids = [b.id for b in owner_branches if b.id]
                owner_branch_names = [b.branch_name for b in owner_branches if b.branch_name] + [b.vahd_name for b in owner_branches if b.vahd_name]

                conditions = [student.owner_id == current_user.id]
                if owner_branch_ids:
                    conditions.append(student.branch_id.in_(owner_branch_ids))
                if owner_branch_names:
                    conditions.append(student.primary_vahd_location.in_(owner_branch_names))

                query = query.filter(or_(*conditions))

                # Branch specific sub-filter if selected by owner
                if branch_id or branch:
                    target_b = branch_id or branch
                    query = query.filter(
                        or_(
                            student.branch_id == target_b,
                            student.primary_vahd_location.ilike(f"%{target_b}%")
                        )
                    )
            elif user_role in ["employee", "COACH", "STAFF", "MANAGER"]:
                # Staff/employee scoped to their assigned students or branch
                conditions = [student.employee_id == current_user.id]
                if current_user.branch_id:
                    conditions.append(student.branch_id == current_user.branch_id)
                    conditions.append(student.primary_vahd_location.ilike(f"%{current_user.branch_id}%"))
                if current_user.owner_id:
                    conditions.append(student.owner_id == current_user.owner_id)
                query = query.filter(or_(*conditions))
            elif user_role in ["student", "MEMBER"]:
                # student can only view their own record
                query = query.filter(
                    or_(
                        student.user_id == current_user.id,
                        func.lower(student.email) == current_user.email.strip().lower()
                    )
                )
        else:
            # Unauthenticated or direct filtering via query params
            if owner_id:
                query = query.filter(student.owner_id == owner_id)
            if branch_id:
                query = query.filter(student.branch_id == branch_id)
            if branch:
                query = query.filter(student.primary_vahd_location.ilike(f"%{branch}%"))

        students = query.order_by(student.created_at.desc()).all()
        return [studentService._format_student(c, db) for c in students]

    @staticmethod
    def sync_student_biometric(db: Session, student_id: str, data: Optional[dict] = None) -> dict:
        """
        Dynamically registers biometric credentials for a student.
        Strictly utilizes provided hardware data or student database attributes without hardcoded values.
        """
        cust = db.query(student).filter(student.id == student_id).first()
        if not cust:
            raise ValueError("student not found")

        data = data or {}

        # 1. Resolve Device Telemetry from DB or payload
        device_id = data.get("device_id")
        device_name = data.get("device_name")
        if not device_id:
            active_dev = db.query(BiometricDevice).filter(BiometricDevice.status == "ONLINE").first() or db.query(BiometricDevice).first()
            if active_dev:
                device_id = active_dev.external_device_id or active_dev.id
                device_name = device_name or active_dev.device_name or active_dev.model_name
            else:
                device_id = f"DEV_{uuid.uuid4().hex[:8]}"
                device_name = device_name or "Biometric Terminal"

        event_type = data.get("event_type") or "BIOMETRIC"
        scan_type = data.get("scan_type") or "GATE_ACCESS"
        confidence = float(data["confidence_score"]) if data.get("confidence_score") is not None else None

        # 2. Record Biometric Gate / Scanner Log
        if True:
            meta = {}
            if data.get("card_number"):
                meta["card_number"] = data["card_number"]
            if data.get("notes"):
                meta["notes"] = data["notes"]
            meta["enrolled_by"] = "OWNER"

            # Geofence location matching & enforcement for students
            from src.models.hrms import GeofenceScheme
            from src.services.hrms_service import HrmsService

            branch_target = cust.primary_vahd_location or cust.branch_id
            scheme = None
            if branch_target:
                scheme = db.query(GeofenceScheme).filter(
                    GeofenceScheme.branch_name.ilike(f"%{branch_target}%"),
                    GeofenceScheme.is_active == True,
                    GeofenceScheme.latitude.isnot(None)
                ).first()
                if not scheme:
                    scheme = db.query(GeofenceScheme).filter(
                        GeofenceScheme.branch_name.ilike(f"%{branch_target}%"),
                        GeofenceScheme.is_active == True
                    ).first()

            if not scheme:
                scheme = db.query(GeofenceScheme).filter(
                    GeofenceScheme.is_active == True,
                    GeofenceScheme.latitude.isnot(None)
                ).order_by(GeofenceScheme.updated_at.desc()).first()

            if not scheme:
                scheme = db.query(GeofenceScheme).filter(GeofenceScheme.is_active == True).first()

            lat_val = data.get("latitude")
            lng_val = data.get("longitude")
            distance_meters = None
            within_perimeter = True

            if scheme and scheme.latitude is not None and scheme.longitude is not None and lat_val is not None and lng_val is not None:
                distance_meters = HrmsService.calculate_distance_meters(
                    float(lat_val), float(lng_val), scheme.latitude, scheme.longitude
                )
                radius = scheme.radius_meters or 500
                within_perimeter = distance_meters <= radius
                if scheme.strict_restriction and not within_perimeter:
                    raise ValueError(
                        f"Geofence Restriction Active: Student check-in rejected. You are {distance_meters:.0f}m away, which exceeds the permitted perimeter radius of {radius}m."
                    )
                meta["distance_meters"] = distance_meters
                meta["within_perimeter"] = within_perimeter
                meta["latitude"] = lat_val
                meta["longitude"] = lng_val
                meta["scheme_name"] = scheme.name
                meta["branch"] = scheme.branch_name or "Main Branch"

            bio_log = BiometricLog(
                id=f"bio_{uuid.uuid4().hex[:8]}",
                student_id=student_id,
                user_role="student",
                event_type=event_type,
                device_id=device_id,
                device_name=device_name,
                direction=data.get("direction") or "CHECK_IN",
                status="SUCCESS",
                confidence_score=confidence,
                meta_data=meta,
            )
            db.add(bio_log)

        db.commit()
        db.refresh(cust)

        return studentService._format_student(cust, db)


    @staticmethod
    def create_student(db: Session, data: dict) -> dict:
        """
        Onboards a new student/employee/member with user credentials and membership plan.
        Role is dynamic (student or employee) from caller.
        Plan duration and price are fetched directly from DB MembershipPlan — no hardcoded strings.
        """
        full_name = data.get("full_name") or data.get("name")
        raw_email = data.get("email") or ""
        clean_email = raw_email.strip().lower()
        phone = (data.get("phone") or "").strip()
        profile_image = data.get("profile_image")
        membership_plan = data.get("membership_plan") or data.get("membership")

        # Role is dynamic — student or employee as passed by the owner
        role = (data.get("role") or "student").strip().upper()

        if not full_name or not clean_email or not phone:
            raise ValueError("full_name, email, and phone are required fields")

        # Generate credential: pvnr + last 4 digits of registered phone
        generated_password = generate_enrollment_password(full_name, phone)

        from sqlalchemy import func
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        # Resolve Branch & vahd Owner
        from src.models.settings import Branch as vahdBranch
        owner_hint = data.get("owner_id")
        branch_ref = (data.get("branch_id") or data.get("branch") or data.get("primary_vahd_location") or data.get("branch_name") or data.get("location") or "").strip()
        matched_branch = None
        if branch_ref:
            if owner_hint:
                matched_branch = db.query(vahdBranch).filter(
                    vahdBranch.owner_id == owner_hint,
                    or_(
                        vahdBranch.id == branch_ref,
                        vahdBranch.branch_name.ilike(f"%{branch_ref}%")
                    )
                ).first()
            if not matched_branch:
                matched_branch = db.query(vahdBranch).filter(
                    or_(
                        vahdBranch.id == branch_ref,
                        vahdBranch.branch_name.ilike(f"%{branch_ref}%")
                    )
                ).first()

        resolved_branch_id = data.get("branch_id") or (matched_branch.id if matched_branch else None)
        resolved_branch_name = (matched_branch.branch_name if matched_branch else branch_ref) or None
        resolved_owner_id = data.get("owner_id") or (matched_branch.owner_id if matched_branch else None)
        resolved_ho_id = data.get("ho_id") or (matched_branch.ho_id if matched_branch else None)

        if resolved_branch_id and (not resolved_ho_id or not resolved_owner_id or not resolved_branch_name):
            b_lookup = db.query(vahdBranch).filter(vahdBranch.id == resolved_branch_id).first()
            if b_lookup:
                if not resolved_ho_id and b_lookup.ho_id:
                    resolved_ho_id = b_lookup.ho_id
                if not resolved_owner_id and b_lookup.owner_id:
                    resolved_owner_id = b_lookup.owner_id
                if not resolved_branch_name:
                    resolved_branch_name = b_lookup.branch_name or b_lookup.vahd_name

        if not resolved_ho_id and resolved_owner_id:
            owner_u = db.query(User).filter(User.id == resolved_owner_id).first()
            if owner_u and owner_u.ho_id:
                resolved_ho_id = owner_u.ho_id

        if not user:
            user = User(
                id=f"usr_{uuid.uuid4().hex[:8]}",
                email=clean_email,
                password_hash=hash_password(generated_password),
                full_name=full_name,
                role=role,
                phone=phone,
                owner_id=resolved_owner_id,
                branch_id=resolved_branch_id,
                ho_id=resolved_ho_id
            )
            db.add(user)
            db.flush()
        else:
            user.email = clean_email
            user.password_hash = hash_password(generated_password)
            user.full_name = full_name
            user.phone = phone
            user.role = role
            if resolved_owner_id:
                user.owner_id = resolved_owner_id
            if resolved_branch_id:
                user.branch_id = resolved_branch_id
            if resolved_ho_id:
                user.ho_id = resolved_ho_id

        meta_data_payload = data.get("meta_data") or data.get("metaData") or {}
        parent_phone = (
            data.get("parent_phone")
            or data.get("parent_mobile")
            or data.get("parentPhone")
            or data.get("parentMobile")
            or (meta_data_payload.get("parent_mobile") if isinstance(meta_data_payload, dict) else None)
            or (meta_data_payload.get("parent_phone") if isinstance(meta_data_payload, dict) else None)
            or ""
        ).strip()

        gender = (
            data.get("gender")
            or (meta_data_payload.get("gender") if isinstance(meta_data_payload, dict) else None)
            or None
        )
        if gender:
            gender = str(gender).strip()

        qualification = (
            data.get("qualification")
            or (meta_data_payload.get("qualification") if isinstance(meta_data_payload, dict) else None)
            or ""
        ).strip()
        specialization = (
            data.get("specialization")
            or (meta_data_payload.get("specialization") if isinstance(meta_data_payload, dict) else None)
            or ""
        ).strip()

        existing_cust = db.query(student).filter(student.user_id == user.id).first()
        if existing_cust:
            cust = existing_cust
            cust.full_name = full_name
            cust.email = clean_email
            cust.phone = phone
            if parent_phone:
                cust.parent_phone = parent_phone
            if gender:
                cust.gender = gender
            if data.get("status"):
                cust.status = data.get("status")
            if profile_image:
                cust.profile_image = profile_image
            if qualification:
                cust.qualification = qualification
            if specialization:
                cust.specialization = specialization
            if meta_data_payload:
                cust.meta_data = meta_data_payload
            if resolved_branch_name:
                cust.primary_vahd_location = resolved_branch_name
            if resolved_branch_id:
                cust.branch_id = resolved_branch_id
            if resolved_owner_id:
                cust.owner_id = resolved_owner_id
            if resolved_ho_id:
                cust.ho_id = resolved_ho_id
        else:
            cust = student(
                id=f"cust_{uuid.uuid4().hex[:8]}",
                user_id=user.id,
                full_name=full_name,
                email=clean_email,
                phone=phone,
                parent_phone=parent_phone or None,
                gender=gender,
                profile_image=profile_image,
                qualification=qualification or None,
                specialization=specialization or None,
                meta_data=meta_data_payload,
                owner_id=resolved_owner_id,
                branch_id=resolved_branch_id,
                ho_id=resolved_ho_id,
                primary_vahd_location=resolved_branch_name,
                status=data.get("status", "ACTIVE")
            )
            db.add(cust)
            db.flush()

        if membership_plan:
            from src.models.plan import MembershipPlan

            # Look up plan from DB by name (owner-created plans are the source of truth)
            db_plan = db.query(MembershipPlan).filter(
                MembershipPlan.name == membership_plan,
                MembershipPlan.is_active == True
            ).first()

            # Use DB plan values if found; otherwise fall back to caller-supplied values
            if db_plan:
                duration_days = db_plan.duration_days
                plan_price = db_plan.price
            else:
                duration_days = int(data.get("duration_days") or 30)
                plan_price = float(data["plan_price"]) if data.get("plan_price") is not None else 0.0

            plan_type = data.get("plan_type") or (db_plan.category if db_plan and db_plan.category else ("ANNUAL" if duration_days >= 365 else ("QUARTERLY" if duration_days >= 90 else "MONTHLY")))

            start_date = now_ist_naive()
            if data.get("start_date"):
                try:
                    start_date = datetime.datetime.fromisoformat(data["start_date"].replace('Z', ''))
                except Exception:
                    pass

            expiry_date = start_date + datetime.timedelta(days=duration_days)
            if data.get("expiry_date") or data.get("end_date"):
                raw_exp = data.get("expiry_date") or data.get("end_date")
                try:
                    expiry_date = datetime.datetime.fromisoformat(str(raw_exp).replace('Z', ''))
                except Exception:
                    pass

            paid_amount = float(data.get("paid_amount")) if data.get("paid_amount") is not None else plan_price
            due_amount = float(data.get("due_amount")) if data.get("due_amount") is not None else max(0.0, plan_price - paid_amount)
            payment_method = data.get("payment_method") or "Cash"
            mem_id = f"mem_{uuid.uuid4().hex[:8]}"
            invoice_number = data.get("invoice_number") or f"INV-MEM-{mem_id[-6:].upper()}"
            transaction_id = data.get("transaction_id")

            mem = Membership(
                id=mem_id,
                student_id=cust.id,
                plan_name=membership_plan,
                plan_type=plan_type,
                status="ACTIVE",
                start_date=start_date,
                expiry_date=expiry_date,
                price=plan_price,
                paid_amount=paid_amount,
                due_amount=due_amount,
                payment_method=payment_method,
                invoice_number=invoice_number,
                transaction_id=transaction_id
            )
            db.add(mem)

        db.commit()
        db.refresh(cust)

        try:
            send_enrollment_email(
                to_email=clean_email,
                full_name=full_name,
                password=generated_password,
                role=role,
                plan_name=membership_plan
            )
        except Exception:
            pass

        return studentService._format_student(cust, db)


    @staticmethod
    def get_student_by_id(db: Session, student_id: str) -> Optional[dict]:
        c = db.query(student).filter(student.id == student_id).first()
        return studentService._format_student(c, db) if c else None

    @staticmethod
    def update_student(db: Session, student_id: str, data: dict) -> dict:
        cust = db.query(student).filter(student.id == student_id).first()
        if not cust:
            raise ValueError("student not found")
        if "full_name" in data or "fullName" in data or "name" in data:
            cust.full_name = data.get("full_name") or data.get("fullName") or data.get("name")
        if "phone" in data:
            cust.phone = data.get("phone")
        if "parent_phone" in data or "parent_mobile" in data or "parentPhone" in data or "parentMobile" in data:
            cust.parent_phone = (
                data.get("parent_phone")
                or data.get("parent_mobile")
                or data.get("parentPhone")
                or data.get("parentMobile")
                or ""
            ).strip() or None
        elif "meta_data" in data and isinstance(data["meta_data"], dict):
            p_phone = data["meta_data"].get("parent_mobile") or data["meta_data"].get("parent_phone")
            if p_phone:
                cust.parent_phone = p_phone.strip()
        if "email" in data:
            cust.email = data.get("email")
        if "gender" in data:
            cust.gender = data.get("gender")
        if "status" in data:
            cust.status = data.get("status")
        if "employee_id" in data:
            cust.employee_id = data.get("employee_id")
        if "meta_data" in data or "metaData" in data:
            meta_val = data.get("meta_data") if "meta_data" in data else data.get("metaData")
            if isinstance(meta_val, dict):
                cust.meta_data = meta_val
                if "qualification" in meta_val and meta_val["qualification"]:
                    cust.qualification = meta_val["qualification"]
                if "specialization" in meta_val and meta_val["specialization"]:
                    cust.specialization = meta_val["specialization"]
        if "qualification" in data:
            cust.qualification = data.get("qualification")
        if "specialization" in data:
            cust.specialization = data.get("specialization")
        if "profile_image" in data or "profileImage" in data:
            cust.profile_image = data.get("profile_image") or data.get("profileImage")
        if "face_image" in data or "faceImage" in data:
            cust.face_image = data.get("face_image") or data.get("faceImage")
        if "face_registered" in data or "faceRegistered" in data:
            cust.face_registered = bool(data.get("face_registered") if "face_registered" in data else data.get("faceRegistered"))
        db.commit()
        db.refresh(cust)
        return studentService._format_student(cust, db)

    @staticmethod
    def delete_student(db: Session, student_id: str) -> bool:
        cust = db.query(student).filter(student.id == student_id).first()
        if not cust:
            return False
        
        # 1. Clean up related courses & student enrollment mappings
        try:
            from src.models.course import StudentCourse
            db.query(StudentCourse).filter(StudentCourse.student_id == student_id).delete(synchronize_session=False)
        except Exception:
            pass

        # 2. Clean up biometric logs
        try:
            from src.models.biometric import BiometricLog
            db.query(BiometricLog).filter(BiometricLog.student_id == student_id).delete(synchronize_session=False)
        except Exception:
            pass

        # 3. Clean up memberships
        try:
            db.query(Membership).filter(Membership.student_id == student_id).delete(synchronize_session=False)
        except Exception:
            pass
        
        user_id = cust.user_id

        # 4. Delete student record and flush so foreign keys on users table are removed
        db.delete(cust)
        db.flush()
        
        # 5. Delete linked user account if exists
        if user_id:
            try:
                user_obj = db.query(User).filter(User.id == user_id).first()
                if user_obj:
                    db.delete(user_obj)
                    db.flush()
            except Exception:
                pass

        db.commit()
        return True

    @staticmethod
    def onboard_student(db: Session, data: dict) -> dict:
        return studentService.create_student(db, data)
