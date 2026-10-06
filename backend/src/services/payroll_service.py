from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from src.models.trainer import TrainerProfile
from src.models.payroll import PayrollInvoice
from src.models.biometric import BiometricLog
from src.models.customer import Customer
from src.models.user import User
from src.utils.security import hash_password
from src.utils.email import generate_enrollment_password, send_enrollment_email

class PayrollService:

    @staticmethod
    def get_all_trainers(db: Session) -> List[TrainerProfile]:
        """
        Returns all registered trainers, managers, and staff profiles dynamically from PostgreSQL database
        with real-time today attendance synchronization.
        """
        from src.models.hrms import EmployeeAttendance
        trainers = db.query(TrainerProfile).filter(TrainerProfile.is_active == True).order_by(TrainerProfile.created_at.desc()).all()

        today_start = today_ist_start()
        today_end = today_ist_end()
        today_date = today_start.date()

        # Fetch today's biometric logs and HRMS attendance in bulk
        today_bio_logs = db.query(BiometricLog).filter(
            BiometricLog.timestamp >= today_start,
            BiometricLog.timestamp <= today_end
        ).order_by(BiometricLog.timestamp.asc()).all()

        today_hrms_att = db.query(EmployeeAttendance).filter(
            EmployeeAttendance.date == today_date
        ).all()

        for t in trainers:
            count = db.query(Customer).filter((Customer.trainer_id == t.id) | (Customer.trainer_id == t.user_id)).count()
            setattr(t, 'assigned_customers_count', count)

            # Match keys for this trainer
            emp_keys = {str(t.id), str(t.id).replace('tr_', ''), f"emp_{t.id}", f"tr_{t.id}"}
            if t.user_id:
                emp_keys.update({str(t.user_id), f"cust_{t.user_id}", f"cust_usr_{t.user_id}", f"emp_{t.user_id}"})
            if t.email:
                emp_keys.add(t.email.lower().strip())

            # Find matching HRMS attendance
            matching_att = None
            for att in today_hrms_att:
                if str(att.employee_id) in emp_keys or str(att.employee_id).replace('emp_', '') in emp_keys:
                    matching_att = att
                    break

            # Find matching Biometric logs
            matching_logs = []
            for b in today_bio_logs:
                cid = str(b.customer_id or '')
                meta = b.meta_data or {}
                meta_uid = str(meta.get("user_id") or meta.get("employee_id") or meta.get("customer_id") or '')
                meta_name = str(meta.get("user_name") or meta.get("employee_name") or '').strip().lower()
                meta_email = str(meta.get("email") or '').strip().lower()

                if (
                    cid in emp_keys
                    or cid.replace('cust_', '') in emp_keys
                    or cid.replace('emp_', '') in emp_keys
                    or meta_uid in emp_keys
                    or (t.email and meta_email == t.email.lower().strip())
                    or (t.full_name and meta_name == t.full_name.lower().strip())
                ):
                    matching_logs.append(b)

            # Calculate Punch In and Out
            punch_in = None
            punch_out = None
            is_early = False
            today_status = "Absent"
            is_present = False

            if matching_att:
                if matching_att.check_in and matching_att.check_in != "--:--":
                    punch_in = matching_att.check_in
                    is_present = True
                if matching_att.check_out and matching_att.check_out != "--:--":
                    punch_out = matching_att.check_out
                if matching_att.status:
                    if matching_att.status.upper() in ["PRESENT", "ON_DUTY"]:
                        today_status = "Present"
                        is_present = True
                    elif matching_att.status.upper() in ["EARLY_LOGOUT", "EARLY_OUT"]:
                        today_status = "Early Logout"
                        is_early = True
                        is_present = True
                    elif matching_att.status.upper() in ["MISSED_PUNCH", "HALF_DAY"]:
                        today_status = "Missed Punch"
                        is_present = True
                    elif matching_att.status.upper() in ["ON_LEAVE", "LEAVE"]:
                        today_status = "Absent"

            if matching_logs:
                in_logs = [
                    l for l in matching_logs
                    if getattr(l, "direction", "") in ["CHECK_IN", "IN", "ENTRY", "ENROLL"]
                    or "in" in str(getattr(l, "direction", "")).lower()
                    or (l.event_type in ["FACE_SCAN", "FINGERPRINT", "RFID_CARD", "MANUAL", "GPS_SCAN"] and getattr(l, "direction", "") not in ["CHECK_OUT", "OUT", "EXIT"])
                ]
                out_logs = [
                    l for l in matching_logs
                    if getattr(l, "direction", "") in ["CHECK_OUT", "OUT", "EXIT"]
                    or "out" in str(getattr(l, "direction", "")).lower()
                ]

                if in_logs and not punch_in:
                    punch_in = in_logs[0].timestamp.strftime("%H:%M:%S")
                elif not punch_in and matching_logs:
                    punch_in = matching_logs[0].timestamp.strftime("%H:%M:%S")

                if out_logs and not punch_out:
                    punch_out = out_logs[-1].timestamp.strftime("%H:%M:%S")
                elif len(matching_logs) > 1 and not punch_out:
                    punch_out = matching_logs[-1].timestamp.strftime("%H:%M:%S")

                is_present = True

            if is_present or punch_in:
                if punch_in and punch_out:
                    today_status = "Early Logout" if is_early else "Present"
                elif punch_in:
                    today_status = "Present"
                else:
                    today_status = "Present"
            else:
                today_status = "Absent"

            setattr(t, 'today_status', today_status)
            setattr(t, 'punch_in', punch_in)
            setattr(t, 'punch_out', punch_out)
            setattr(t, 'in_time', punch_in)
            setattr(t, 'out_time', punch_out)
            setattr(t, 'is_present', is_present)
            setattr(t, 'is_early_logout', is_early)
            setattr(t, 'today_punch', {"status": today_status, "in_time": punch_in, "out_time": punch_out})

        return trainers

    @staticmethod
    def get_trainer_customers(db: Session, trainer_id: str) -> List[Customer]:
        """
        Returns all customer members assigned to a specific trainer.
        """
        trainer = db.query(TrainerProfile).filter(TrainerProfile.id == trainer_id).first()
        trainer_user_id = trainer.user_id if trainer else None
        return db.query(Customer).filter(
            (Customer.trainer_id == trainer_id) | 
            ((Customer.trainer_id == trainer_user_id) if trainer_user_id else False)
        ).all()

    @staticmethod
    def assign_customer(db: Session, trainer_id: str, customer_id: str) -> Customer:
        """
        Assigns or reassigns a customer to a trainer.
        """
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise ValueError(f"Customer '{customer_id}' not found.")
        cust.trainer_id = trainer_id
        db.commit()
        db.refresh(cust)
        return cust

    @staticmethod
    def register_trainer(db: Session, data: Dict[str, Any]) -> TrainerProfile:
        """
        Registers a new trainer or staff profile dynamically in PostgreSQL database.
        """
        full_name = data["full_name"]
        email = data["email"]
        phone = data.get("phone") or ""
        trainer_role = data.get("role", "TRAINER")
        trainer_id = data.get("id")

        # Check existing User
        existing_user = db.query(User).filter(User.email == email).first()

        # Check existing TrainerProfile by id, email, or user_id
        existing_trainer = None
        if trainer_id:
            existing_trainer = db.query(TrainerProfile).filter(TrainerProfile.id == trainer_id).first()
        if not existing_trainer and existing_user:
            existing_trainer = db.query(TrainerProfile).filter(TrainerProfile.user_id == existing_user.id).first()
        if not existing_trainer:
            existing_trainer = db.query(TrainerProfile).filter(TrainerProfile.email == email).first()

        if existing_trainer:
            existing_trainer.full_name = full_name
            existing_trainer.email = email
            existing_trainer.phone = phone or existing_trainer.phone
            existing_trainer.role = trainer_role
            if "specialization" in data and data["specialization"]:
                existing_trainer.specialization = data["specialization"]
            if "base_monthly_salary" in data and data["base_monthly_salary"] is not None:
                existing_trainer.base_monthly_salary = float(data["base_monthly_salary"])
            if "pt_session_rate" in data and data["pt_session_rate"] is not None:
                existing_trainer.pt_session_rate = float(data["pt_session_rate"])
            if "bank_account_no" in data:
                existing_trainer.bank_account_no = data["bank_account_no"]
            if "bank_ifsc" in data:
                existing_trainer.bank_ifsc = data["bank_ifsc"]
            if "upi_id" in data:
                existing_trainer.upi_id = data["upi_id"]

            if "primary_gym_location" in data or "branch" in data or "branch_name" in data or "location" in data:
                existing_trainer.primary_gym_location = (data.get("primary_gym_location") or data.get("branch") or data.get("branch_name") or data.get("location") or "").strip() or None

            if existing_user:
                existing_user.full_name = full_name
                existing_user.phone = phone or existing_user.phone
                existing_user.role = trainer_role
                if trainer_role in ["GYM_OWNER", "OWNER"]:
                    existing_user.is_tenant_owner = True

            db.commit()
            db.refresh(existing_trainer)

            try:
                from src.services.hrms_service import HrmsService
                HrmsService.sync_trainers_to_employees(db)
            except Exception:
                pass

            return existing_trainer

        # Generate credential: first 4 chars of name + last 4 digits of phone
        generated_password = generate_enrollment_password(full_name, phone)

        # Create or update User record for login
        if existing_user:
            existing_user.password_hash = hash_password(generated_password)
            existing_user.full_name = full_name
            existing_user.phone = phone
            existing_user.role = trainer_role
            if trainer_role in ["GYM_OWNER", "OWNER"]:
                existing_user.is_tenant_owner = True
            user = existing_user
        else:
            user = User(
                id=f"usr_{uuid.uuid4().hex[:8]}",
                email=email,
                password_hash=hash_password(generated_password),
                role=trainer_role,
                full_name=full_name,
                phone=phone,
                is_tenant_owner=(trainer_role in ["GYM_OWNER", "OWNER"])
            )
            db.add(user)
            db.flush()

        new_trainer_id = trainer_id or f"tr_{uuid.uuid4().hex[:6]}"
        date_str = data.get("join_date") or data.get("created_at")
        custom_created_at = None
        if date_str:
            try:
                custom_created_at = datetime.datetime.fromisoformat(date_str)
            except Exception:
                pass

        new_trainer = TrainerProfile(
            id=new_trainer_id,
            user_id=user.id,
            full_name=full_name,
            email=email,
            phone=phone,
            role=trainer_role,
            specialization=data.get("specialization"),
            base_monthly_salary=float(data.get("base_monthly_salary") or 0.0),
            pt_session_rate=float(data.get("pt_session_rate") or 0.0),
            bank_account_no=data.get("bank_account_no"),
            bank_ifsc=data.get("bank_ifsc"),
            upi_id=data.get("upi_id"),
            primary_gym_location=(data.get("primary_gym_location") or data.get("branch") or data.get("branch_name") or data.get("location") or "").strip() or None,
            **( {"created_at": custom_created_at} if custom_created_at else {} )
        )
        db.add(new_trainer)
        db.commit()
        db.refresh(new_trainer)

        # Sync to HRMS
        try:
            from src.services.hrms_service import HrmsService
            HrmsService.sync_trainers_to_employees(db)
        except Exception:
            pass

        # Dispatch credential email to trainer
        try:
            send_enrollment_email(
                to_email=email,
                full_name=full_name,
                password=generated_password,
                role="TRAINER"
            )
        except Exception:
            pass

        return new_trainer

    @staticmethod
    def update_trainer(db: Session, trainer_id: str, data: Dict[str, Any]) -> TrainerProfile:
        """
        Updates an existing trainer profile in PostgreSQL database.
        """
        trainer = db.query(TrainerProfile).filter(TrainerProfile.id == trainer_id).first()
        if not trainer:
            raise ValueError(f"Trainer '{trainer_id}' not found.")
        if "full_name" in data and data["full_name"]:
            trainer.full_name = data["full_name"]
        if "email" in data and data["email"]:
            trainer.email = data["email"]
        if "phone" in data:
            trainer.phone = data["phone"]
        if "role" in data and data["role"]:
            trainer.role = data["role"]
        if "specialization" in data:
            trainer.specialization = data["specialization"]
        if "base_monthly_salary" in data and data["base_monthly_salary"] is not None:
            trainer.base_monthly_salary = float(data["base_monthly_salary"])
        if "pt_session_rate" in data and data["pt_session_rate"] is not None:
            trainer.pt_session_rate = float(data["pt_session_rate"])
        if "bank_account_no" in data:
            trainer.bank_account_no = data["bank_account_no"]
        if "bank_ifsc" in data:
            trainer.bank_ifsc = data["bank_ifsc"]
        if "upi_id" in data:
            trainer.upi_id = data["upi_id"]

        db.commit()
        db.refresh(trainer)

        try:
            from src.services.hrms_service import HrmsService
            HrmsService.sync_trainers_to_employees(db)
        except Exception:
            pass

        return trainer

    @staticmethod
    def delete_trainer(db: Session, trainer_id: str) -> bool:
        """
        Deletes or deactivates a trainer profile from PostgreSQL database.
        """
        trainer = db.query(TrainerProfile).filter(TrainerProfile.id == trainer_id).first()
        if not trainer:
            raise ValueError(f"Trainer '{trainer_id}' not found.")
        
        # Clean up related payroll invoices
        try:
            db.query(PayrollInvoice).filter(PayrollInvoice.trainer_id == trainer.id).delete(synchronize_session=False)
        except Exception:
            pass

        db.delete(trainer)
        db.commit()

        try:
            from src.services.hrms_service import HrmsService
            HrmsService.sync_trainers_to_employees(db)
        except Exception:
            pass

        return True

    @staticmethod
    def generate_monthly_payroll(
        db: Session,
        trainer_id: str,
        month_year: Optional[str] = None,
        pt_sessions_count: int = 0
    ) -> PayrollInvoice:
        """
        Generates or updates a monthly salary invoice for a trainer/staff based on eSSL biometric attendance.
        """
        if not month_year:
            month_year = now_ist_naive().strftime("%Y-%m")
        trainer = db.query(TrainerProfile).filter(TrainerProfile.id == trainer_id).first()
        if not trainer:
            raise ValueError(f"Trainer/Staff with ID '{trainer_id}' not found.")

        # Count biometric punch days present
        logs = db.query(BiometricLog).filter(BiometricLog.meta_data.op('->>')('user_id') == trainer_id).all()
        if not logs:
            logs = db.query(BiometricLog).filter(BiometricLog.customer_id == trainer_id).all()

        distinct_days = set()
        for log in logs:
            if log.timestamp:
                distinct_days.add(log.timestamp.strftime("%Y-%m-%d"))

        days_present = len(distinct_days) if distinct_days else 22  # default full month work days
        days_absent = max(0, 30 - days_present)

        base_salary_earned = round((trainer.base_monthly_salary / 30.0) * days_present, 2)
        commission_earned = round(pt_sessions_count * trainer.pt_session_rate, 2)
        net_salary = round(base_salary_earned + commission_earned, 2)

        invoice_id = f"pay_{trainer_id}_{month_year.replace('-', '')}"
        existing = db.query(PayrollInvoice).filter(PayrollInvoice.id == invoice_id).first()

        if existing:
            existing.days_present = days_present
            existing.days_absent = days_absent
            existing.pt_sessions_count = pt_sessions_count
            existing.base_salary_earned = base_salary_earned
            existing.commission_earned = commission_earned
            existing.net_salary = net_salary
            db.commit()
            db.refresh(existing)
            return existing

        invoice = PayrollInvoice(
            id=invoice_id,
            trainer_id=trainer_id,
            month_year=month_year,
            days_present=days_present,
            days_absent=days_absent,
            pt_sessions_count=pt_sessions_count,
            base_salary_earned=base_salary_earned,
            commission_earned=commission_earned,
            deductions=0.0,
            net_salary=net_salary,
            status="DRAFT"
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def process_salary_payment(
        db: Session,
        payroll_id: str,
        payment_method: str = "UPI",
        transaction_reference: Optional[str] = None
    ) -> PayrollInvoice:
        """
        Marks a trainer/staff salary invoice as PAID and records transaction details.
        """
        invoice = db.query(PayrollInvoice).filter(PayrollInvoice.id == payroll_id).first()
        if not invoice:
            raise ValueError(f"Payroll Invoice '{payroll_id}' not found.")

        invoice.status = "PAID"
        invoice.payment_method = payment_method
        invoice.transaction_reference = transaction_reference or f"TXN_{uuid.uuid4().hex[:8].upper()}"
        invoice.paid_at = now_ist_naive()

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def get_all_invoices(db: Session) -> List[PayrollInvoice]:
        """
        Returns all payroll invoices from PostgreSQL.
        """
        return db.query(PayrollInvoice).order_by(PayrollInvoice.created_at.desc()).all()
