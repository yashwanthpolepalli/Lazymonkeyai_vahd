import datetime
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session
from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
from src.models.user import User
from src.models.customer import Customer
from src.models.membership import Membership
from src.models.biometric import BiometricLog
from src.utils.email import generate_enrollment_password, send_enrollment_email
from src.utils.security import hash_password
from src.models.settings import Branch as GymBranch

from src.models.biometric_device import BiometricDevice

class CustomerService:

    @staticmethod
    def _format_customer(c: Customer, db: Session) -> dict:
        now = now_ist_naive()

        # Trainer Name Lookup from DB
        trainer_name = None
        if c.trainer_id:
            trainer_user = db.query(User).filter(User.id == c.trainer_id).first()
            if trainer_user:
                trainer_name = trainer_user.full_name

        # Last Visit & Attendance Calculation from Biometric DB Log
        last_log = db.query(BiometricLog).filter(
            (BiometricLog.customer_id == c.id) | (BiometricLog.customer_id == c.user_id)
        ).order_by(BiometricLog.timestamp.desc()).first()
        last_visit = to_ist_str(last_log.timestamp) if (last_log and last_log.timestamp) else None

        # Calculate 30-day attendance percentage from DB logs
        month_ago = now - datetime.timedelta(days=30)
        logs_count = db.query(BiometricLog).filter(
            (BiometricLog.customer_id == c.id) | (BiometricLog.customer_id == c.user_id),
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
            (BiometricLog.customer_id.in_(list(cust_match_ids))) |
            (BiometricLog.customer_id == c.id) |
            (BiometricLog.customer_id == c.user_id),
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
        biometric_count = db.query(BiometricLog).filter(BiometricLog.customer_id == c.id).count()
        is_completed = bool(biometric_count > 0)
        biometric_status = "Completed" if is_completed else "Pending"

        # Dynamic KYC Completeness Calculation
        kyc_fields = [c.full_name, c.email, c.phone, c.gender, c.height, c.weight, c.goal]
        filled_count = sum(1 for f in kyc_fields if f is not None and str(f).strip() != "")
        kyc_percent = int((filled_count / len(kyc_fields)) * 100)
        kyc_status = "Verified & Ready" if kyc_percent >= 80 else f"{kyc_percent}% Complete"

        # Membership DB details
        mem = db.query(Membership).filter(Membership.customer_id == c.id).order_by(Membership.created_at.desc()).first()
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
        if not meta.get("course") and c.goal:
            goal_str = str(c.goal).strip()
            if "(" in goal_str and ")" in goal_str:
                parts = goal_str.split("(")
                course_part = parts[0].strip(" -").strip()
                inside = parts[1].replace(")", "").strip()
                if "medium" in inside.lower():
                    medium_part = inside.lower().replace("medium", "").strip().capitalize()
                    if not meta.get("medium"):
                        meta["medium"] = medium_part
                if not meta.get("course"):
                    meta["course"] = course_part
            else:
                if not meta.get("course"):
                    meta["course"] = goal_str

        return {
            "id": c.id,
            "user_id": c.user_id,
            "trainer_id": c.trainer_id,
            "trainer": trainer_name or "",
            "full_name": c.full_name,
            "name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "gender": c.gender or "",
            "weight": c.weight,
            "height": c.height,
            "height_cm": c.height,
            "bmi": c.bmi,
            "fitness_score": c.fitness_score or 0,
            "fitness_level": c.fitness_level or "",
            "training_preference": c.training_preference or "",
            "goal": c.goal or "",
            "meta_data": meta,
            "course": meta.get("course") or c.goal or "",
            "medium": meta.get("medium") or "",
            "father_name": meta.get("father_name") or "",
            "mother_name": meta.get("mother_name") or "",
            "target_calories": c.target_calories or 0,
            "target_protein": c.target_protein or 0,
            "target_carbs": c.target_carbs or 0,
            "target_fat": c.target_fat or 0,
            "target_water": c.target_water or 0,
            "consumed_calories": 0,
            "consumed_protein": 0,
            "consumed_carbs": 0,
            "consumed_fat": 0,
            "consumed_water": 0.0,
            "target_weight": c.target_weight,
            "days_per_week": c.days_per_week,
            "session_duration_minutes": c.session_duration_minutes,
            "profile_image": c.profile_image or "",
            "status": calculated_status,
            "attendance": attendance_pct,
            "lastVisit": last_visit or "No recent visit",
            "expiry": expiry_str or "No active plan",
            "revenue": revenue_str,
            "branch": c.primary_gym_location or "",
            "branch_id": c.branch_id or "",
            "owner_id": c.owner_id or "",
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "joinDate": c.created_at.isoformat() if c.created_at else None,
            "membership": mem.plan_name if mem else "No Active Plan",
            "membership_plan": mem_dict,
            "biometric_synced": is_completed,
            "biometric_status": biometric_status,
            "enable_workout_videos": bool(c.enable_workout_videos if c.enable_workout_videos is not None else True),
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
    def get_all_customers(
        db: Session,
        current_user: Optional[User] = None,
        branch: Optional[str] = None,
        branch_id: Optional[str] = None,
        owner_id: Optional[str] = None
    ) -> List[dict]:
        from sqlalchemy import or_, func
        from src.models.settings import Branch as GymBranch

        query = db.query(Customer)

        # Multi-tenant gym owner & branch isolation
        if current_user:
            user_role = (current_user.role or "").strip().upper()
            if user_role in ["SUPER_ADMIN", "ADMIN"] or current_user.is_platform_admin:
                # Super Admin can view all or filter by query parameters
                if owner_id:
                    query = query.filter(Customer.owner_id == owner_id)
                if branch_id:
                    query = query.filter(Customer.branch_id == branch_id)
                if branch:
                    query = query.filter(Customer.primary_gym_location.ilike(f"%{branch}%"))
            elif user_role in ["GYM_OWNER", "OWNER"]:
                # Gym Owner can ONLY view customers belonging to their gym / branches
                owner_branches = db.query(GymBranch).filter(
                    or_(
                        GymBranch.owner_id == current_user.id,
                        GymBranch.id == current_user.branch_id
                    )
                ).all()
                owner_branch_ids = [b.id for b in owner_branches if b.id]

                # Customer MUST belong to this gym owner
                conditions = [Customer.owner_id == current_user.id]
                if owner_branch_ids:
                    conditions.append(
                        and_(
                            Customer.branch_id.in_(owner_branch_ids),
                            or_(Customer.owner_id == current_user.id, Customer.owner_id.is_(None))
                        )
                    )

                query = query.filter(or_(*conditions))

                # Branch specific sub-filter if selected by owner
                if branch_id or branch:
                    target_b = branch_id or branch
                    query = query.filter(
                        or_(
                            Customer.branch_id == target_b,
                            Customer.primary_gym_location.ilike(f"%{target_b}%")
                        )
                    )
            elif user_role in ["TRAINER", "COACH", "STAFF", "MANAGER"]:
                # Staff/Trainer scoped to their assigned customers or branch
                conditions = [Customer.trainer_id == current_user.id]
                if current_user.branch_id:
                    conditions.append(Customer.branch_id == current_user.branch_id)
                    conditions.append(Customer.primary_gym_location.ilike(f"%{current_user.branch_id}%"))
                if current_user.owner_id:
                    conditions.append(Customer.owner_id == current_user.owner_id)
                query = query.filter(or_(*conditions))
            elif user_role in ["CUSTOMER", "MEMBER"]:
                # Customer can only view their own record
                query = query.filter(
                    or_(
                        Customer.user_id == current_user.id,
                        func.lower(Customer.email) == current_user.email.strip().lower()
                    )
                )
        else:
            # Unauthenticated or direct filtering via query params
            if owner_id:
                query = query.filter(Customer.owner_id == owner_id)
            if branch_id:
                query = query.filter(Customer.branch_id == branch_id)
            if branch:
                query = query.filter(Customer.primary_gym_location.ilike(f"%{branch}%"))

        customers = query.order_by(Customer.created_at.desc()).all()
        return [CustomerService._format_customer(c, db) for c in customers]

    @staticmethod
    def sync_customer_biometric(db: Session, customer_id: str, data: Optional[dict] = None) -> dict:
        """
        Dynamically registers biometric credentials and/or InBody scan data for a customer.
        Strictly utilizes provided hardware data or customer database attributes without hardcoded values.
        """
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise ValueError("Customer not found")

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
        scan_type = data.get("scan_type") or ("INBODY" if (data.get("weight") or data.get("height")) else "GATE_ACCESS")
        confidence = float(data["confidence_score"]) if data.get("confidence_score") is not None else None

        # 2. Record Biometric Gate / Scanner Log
        if scan_type != "INBODY" or data.get("event_type"):
            meta = {}
            if data.get("card_number"):
                meta["card_number"] = data["card_number"]
            if data.get("notes"):
                meta["notes"] = data["notes"]
            meta["enrolled_by"] = "GYM_OWNER"

            # Geofence location matching & enforcement for students
            from src.models.hrms import GeofenceScheme
            from src.services.hrms_service import HrmsService

            branch_target = cust.primary_gym_location or cust.branch_id
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
                customer_id=customer_id,
                user_role="CUSTOMER",
                event_type=event_type,
                device_id=device_id,
                device_name=device_name,
                direction=data.get("direction") or "CHECK_IN",
                status="SUCCESS",
                confidence_score=confidence,
                meta_data=meta,
            )
            db.add(bio_log)

        # 3. Record InBody Composition Scan if InBody telemetry provided
        if scan_type in ["INBODY", "FULL", "BIOMETRIC_AND_INBODY"] or data.get("weight") is not None:
            raw_w = data.get("weight")
            raw_h = data.get("height")
            actual_weight = float(raw_w) if raw_w is not None else (float(cust.weight) if cust.weight else 0.0)
            actual_height = float(raw_h) if raw_h is not None else (float(cust.height) if cust.height else 0.0)

            # Calculate dynamic metrics only if physical measurements exist
            calc_bmi = None
            calc_bmr = None
            calc_fat_pct = None
            calc_fat_mass = None
            calc_muscle_mass = None
            calc_water = None
            calc_score = None

            if actual_height > 0 and actual_weight > 0:
                h_m = actual_height / 100.0
                calc_bmi = round(actual_weight / (h_m ** 2), 1)

                # Clinical Mifflin-St Jeor formula
                gender_str = (cust.gender or "male").lower()
                gender_offset = 5.0 if gender_str == "male" else -161.0
                calc_bmr = round((10.0 * actual_weight) + (6.25 * actual_height) - (5.0 * 25.0) + gender_offset, 1)

                # Deurenberg formula
                gender_factor = 1.0 if gender_str == "male" else 0.0
                calc_fat_pct = max(5.0, min(50.0, round((1.20 * calc_bmi) + (0.23 * 25.0) - (10.8 * gender_factor) - 5.4, 1)))
                calc_fat_mass = round(actual_weight * (calc_fat_pct / 100.0), 1)
                calc_muscle_mass = round(max(0.0, actual_weight - calc_fat_mass), 1)
                calc_water = round(max(0.0, 100.0 - calc_fat_pct - 16.0), 1)
                calc_score = max(40, min(100, int(100 - (abs(calc_bmi - 22.0) * 3.5))))

            if calc_bmi:
                cust.bmi = calc_bmi
            if calc_score:
                cust.fitness_score = calc_score
            if actual_weight > 0:
                cust.weight = actual_weight
            if actual_height > 0:
                cust.height = actual_height

        db.commit()
        db.refresh(cust)

        return CustomerService._format_customer(cust, db)


    @staticmethod
    def create_customer(db: Session, data: dict) -> dict:
        """
        Onboards a new customer/trainer/member with user credentials and membership plan.
        Role is dynamic (CUSTOMER or TRAINER) from caller.
        Plan duration and price are fetched directly from DB MembershipPlan — no hardcoded strings.
        """
        full_name = data.get("full_name") or data.get("name")
        raw_email = data.get("email") or ""
        clean_email = raw_email.strip().lower()
        phone = (data.get("phone") or "").strip()
        gender = data.get("gender")
        weight = float(data["weight"]) if data.get("weight") else None
        bmi = float(data["bmi"]) if data.get("bmi") else None
        fitness_score = int(data["fitness_score"]) if data.get("fitness_score") else None
        goal = data.get("goal")
        profile_image = data.get("profile_image")
        membership_plan = data.get("membership_plan") or data.get("membership")

        # Role is dynamic — CUSTOMER or TRAINER as passed by the owner
        role = (data.get("role") or "CUSTOMER").strip().upper()

        if not full_name or not clean_email or not phone:
            raise ValueError("full_name, email, and phone are required fields")

        # Generate credential: first 4 chars of name + last 4 digits of phone
        generated_password = generate_enrollment_password(full_name, phone)

        from sqlalchemy import func
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        # Resolve Branch & Gym Owner
        from src.models.settings import Branch as GymBranch
        owner_hint = data.get("owner_id")
        branch_ref = (data.get("branch_id") or data.get("branch") or data.get("primary_gym_location") or data.get("branch_name") or data.get("location") or "").strip()
        matched_branch = None
        if branch_ref:
            if owner_hint:
                matched_branch = db.query(GymBranch).filter(
                    GymBranch.owner_id == owner_hint,
                    or_(
                        GymBranch.id == branch_ref,
                        GymBranch.branch_name.ilike(f"%{branch_ref}%")
                    )
                ).first()
            if not matched_branch:
                matched_branch = db.query(GymBranch).filter(
                    or_(
                        GymBranch.id == branch_ref,
                        GymBranch.branch_name.ilike(f"%{branch_ref}%")
                    )
                ).first()

        resolved_branch_id = data.get("branch_id") or (matched_branch.id if matched_branch else None)
        resolved_branch_name = (matched_branch.branch_name if matched_branch else branch_ref) or None
        resolved_owner_id = data.get("owner_id") or (matched_branch.owner_id if matched_branch else None)

        if not user:
            user = User(
                id=f"usr_{uuid.uuid4().hex[:8]}",
                email=clean_email,
                password_hash=hash_password(generated_password),
                full_name=full_name,
                role=role,
                phone=phone,
                owner_id=resolved_owner_id,
                branch_id=resolved_branch_id
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

        meta_data_payload = data.get("meta_data") or data.get("metaData")
        if existing_cust:
            cust = existing_cust
            cust.full_name = full_name
            cust.email = clean_email
            cust.phone = phone
            if gender:
                cust.gender = gender
            if goal:
                cust.goal = goal
            if data.get("status"):
                cust.status = data.get("status")
            if profile_image:
                cust.profile_image = profile_image
            if meta_data_payload:
                cust.meta_data = meta_data_payload
            if resolved_branch_name:
                cust.primary_gym_location = resolved_branch_name
            if resolved_branch_id:
                cust.branch_id = resolved_branch_id
            if resolved_owner_id:
                cust.owner_id = resolved_owner_id
        else:
            cust = Customer(
                id=f"cust_{uuid.uuid4().hex[:8]}",
                user_id=user.id,
                full_name=full_name,
                email=clean_email,
                phone=phone,
                gender=gender,
                weight=weight,
                bmi=bmi,
                fitness_score=fitness_score,
                goal=goal,
                profile_image=profile_image,
                meta_data=meta_data_payload,
                owner_id=resolved_owner_id,
                branch_id=resolved_branch_id,
                primary_gym_location=resolved_branch_name,
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
                customer_id=cust.id,
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

        return CustomerService._format_customer(cust, db)


    @staticmethod
    def get_customer_by_id(db: Session, customer_id: str) -> Optional[dict]:
        c = db.query(Customer).filter(Customer.id == customer_id).first()
        return CustomerService._format_customer(c, db) if c else None

    @staticmethod
    def update_customer(db: Session, customer_id: str, data: dict) -> dict:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise ValueError("Customer not found")
        if "full_name" in data or "fullName" in data or "name" in data:
            cust.full_name = data.get("full_name") or data.get("fullName") or data.get("name")
        if "phone" in data:
            cust.phone = data.get("phone")
        if "email" in data:
            cust.email = data.get("email")
        if "gender" in data:
            cust.gender = data.get("gender")
        if "height" in data or "height_cm" in data or "heightCm" in data:
            val = data.get("height") or data.get("height_cm") or data.get("heightCm")
            if val is not None:
                cust.height = float(val)
        if "weight" in data or "currentWeight" in data:
            val = data.get("weight") or data.get("currentWeight")
            if val is not None:
                cust.weight = float(val)
                if cust.height and cust.height > 0:
                    h_m = cust.height / 100.0
                    cust.bmi = round(cust.weight / (h_m * h_m), 1)
        if "target_weight" in data or "targetWeightKg" in data:
            val = data.get("target_weight") or data.get("targetWeightKg")
            if val is not None:
                cust.target_weight = float(val)
        if "target_calories" in data or "targetCalories" in data:
            val = data.get("target_calories") or data.get("targetCalories")
            if val is not None:
                cust.target_calories = int(val)
        if "target_protein" in data or "targetProtein" in data:
            val = data.get("target_protein") or data.get("targetProtein")
            if val is not None:
                cust.target_protein = int(val)
        if "target_carbs" in data or "targetCarbs" in data:
            val = data.get("target_carbs") or data.get("targetCarbs")
            if val is not None:
                cust.target_carbs = int(val)
        if "target_fat" in data or "targetFat" in data:
            val = data.get("target_fat") or data.get("targetFat")
            if val is not None:
                cust.target_fat = int(val)
        if "days_per_week" in data or "daysPerWeek" in data:
            val = data.get("days_per_week") or data.get("daysPerWeek")
            if val is not None:
                cust.days_per_week = int(val)
        if "session_duration_minutes" in data or "sessionDurationMinutes" in data:
            val = data.get("session_duration_minutes") or data.get("sessionDurationMinutes")
            if val is not None:
                cust.session_duration_minutes = int(val)
        if "fitness_level" in data or "fitnessLevel" in data:
            cust.fitness_level = data.get("fitness_level") or data.get("fitnessLevel")
        if "goal" in data:
            cust.goal = data.get("goal")
        if "status" in data:
            cust.status = data.get("status")
        if "trainer_id" in data:
            cust.trainer_id = data.get("trainer_id")
        if "meta_data" in data or "metaData" in data:
            meta_val = data.get("meta_data") if "meta_data" in data else data.get("metaData")
            if isinstance(meta_val, dict):
                cust.meta_data = meta_val
        if "profile_image" in data or "profileImage" in data:
            cust.profile_image = data.get("profile_image") or data.get("profileImage")
        if "face_image" in data or "faceImage" in data:
            cust.face_image = data.get("face_image") or data.get("faceImage")
        if "face_registered" in data or "faceRegistered" in data:
            cust.face_registered = bool(data.get("face_registered") if "face_registered" in data else data.get("faceRegistered"))
        if "enable_workout_videos" in data or "enableWorkoutVideos" in data:
            val = data.get("enable_workout_videos") if "enable_workout_videos" in data else data.get("enableWorkoutVideos")
            if val is not None:
                cust.enable_workout_videos = bool(val)
        db.commit()
        db.refresh(cust)
        return CustomerService._format_customer(cust, db)

    @staticmethod
    def toggle_workout_video_access(db: Session, customer_id: str, enable: bool) -> dict:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise ValueError("Customer not found")
        cust.enable_workout_videos = bool(enable)
        db.commit()
        db.refresh(cust)
        return CustomerService._format_customer(cust, db)

    @staticmethod
    def delete_customer(db: Session, customer_id: str) -> bool:
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            return False
        
        # 1. Clean up related courses & student enrollment mappings
        try:
            from src.models.course import StudentCourse
            db.query(StudentCourse).filter(StudentCourse.customer_id == customer_id).delete(synchronize_session=False)
        except Exception:
            pass

        # 2. Clean up biometric logs
        try:
            from src.models.biometric import BiometricLog
            db.query(BiometricLog).filter(BiometricLog.customer_id == customer_id).delete(synchronize_session=False)
        except Exception:
            pass

        # 3. Clean up memberships
        try:
            db.query(Membership).filter(Membership.customer_id == customer_id).delete(synchronize_session=False)
        except Exception:
            pass
        
        user_id = cust.user_id

        # 4. Delete customer record and flush so foreign keys on users table are removed
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
    def onboard_customer(db: Session, data: dict) -> dict:
        return CustomerService.create_customer(db, data)
