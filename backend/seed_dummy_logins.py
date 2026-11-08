#!/usr/bin/env python3
"""
Seed Dummy Testing Logins & Default Data
----------------------------------------
Populates the database (SQLite or PostgreSQL) with working demo accounts
for all 5 platform roles, along with default organization, branch,
employee profile, HRMS employee, and student records.

Usage:
    python seed_dummy_logins.py
"""
import sys
import os
import datetime

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from src.config.settings import settings
from src.database.session import engine, SessionLocal
from src.database.base import Base
import src.models

from src.models.user import User
from src.models.settings import Branch, Setting
from src.models.employee import EmployeeProfile
from src.models.hrms import Employee, Department
from src.models.student import student
from src.models.membership import Membership
from src.utils.security import hash_password
from src.utils.timezone import now_ist_naive

DEFAULT_PASSWORD = "Password@123"

DUMMY_USERS = [
    {
        "id": "usr_super_admin",
        "email": "admin@vahd.com",
        "password": DEFAULT_PASSWORD,
        "full_name": "System Super Admin",
        "role": "SUPER_ADMIN",
        "phone": "+91 9900000001",
        "is_platform_admin": True,
        "is_tenant_owner": True,
        "branch_id": None,
        "ho_id": None,
        "portal_name": "Admin Portal (Super Admin)",
    },
    {
        "id": "usr_custom_super_admin",
        "email": "kullasainageswari16@gmail.com",
        "password": "121245@Forgot",
        "full_name": "Platform Super Admin",
        "role": "SUPER_ADMIN",
        "phone": "+91 9900000000",
        "is_platform_admin": True,
        "is_tenant_owner": True,
        "branch_id": None,
        "ho_id": None,
        "portal_name": "Admin Portal (Super Admin)",
    },
    {
        "id": "usr_ho",
        "email": "ho@vahd.com",
        "password": DEFAULT_PASSWORD,
        "full_name": "Head Office Administrator",
        "role": "HO",
        "phone": "+91 9900000002",
        "is_platform_admin": False,
        "is_tenant_owner": True,
        "branch_id": "branch_main",
        "ho_id": "ho_main",
        "portal_name": "Head Office (HO) Portal",
    },
    {
        "id": "usr_owner_main",
        "email": "owner@vahd.com",
        "password": DEFAULT_PASSWORD,
        "full_name": "Main VAHD Owner",
        "role": "OWNER",
        "phone": "+91 9900000003",
        "is_platform_admin": False,
        "is_tenant_owner": True,
        "branch_id": "branch_main",
        "ho_id": "ho_main",
        "portal_name": "Owner Portal",
    },
    {
        "id": "usr_trainer_main",
        "email": "employee@vahd.com",
        "password": DEFAULT_PASSWORD,
        "full_name": "Alex Staff (Senior Instructor)",
        "role": "EMPLOYEE",
        "phone": "+91 9900000004",
        "is_platform_admin": False,
        "is_tenant_owner": False,
        "branch_id": "branch_main",
        "ho_id": "ho_main",
        "owner_id": "usr_owner_main",
        "portal_name": "Staff / Employees Portal",
    },
    {
        "id": "usr_student_main",
        "email": "student@vahd.com",
        "password": DEFAULT_PASSWORD,
        "full_name": "John Student (Enrolled)",
        "role": "STUDENT",
        "phone": "+91 9900000005",
        "is_platform_admin": False,
        "is_tenant_owner": False,
        "branch_id": "branch_main",
        "ho_id": "ho_main",
        "owner_id": "usr_owner_main",
        "portal_name": "Students Portal",
    },
]


def seed_database():
    print(f"\n🌱 Connecting to Database: {settings.DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── 1. Default Setting ───────────────────────────────────────────────
        setting = db.query(Setting).filter(Setting.id == "default").first()
        if not setting:
            setting = Setting(
                id="default",
                name="VAHD Enterprise Platform",
                address="100 Tech City Boulevard, Madhapur",
                phone="+91 9876543210",
                enable_pos=True,
                enable_inventory=True,
            )
            db.add(setting)
            db.flush()
            print("  ✅ Default Setting created.")

        # ── 2. Default Branch ────────────────────────────────────────────────
        branch = db.query(Branch).filter(Branch.id == "branch_main").first()
        if not branch:
            branch = Branch(
                id="branch_main",
                gym_name="VAHD Enterprise Platform",
                branch_name="Main Headquarters Branch",
                city="Hyderabad",
                address="100 Tech City Boulevard, Madhapur, Hyderabad",
                owner_id="usr_owner_main",
                ho_id="ho_main",
                is_active=True,
            )
            db.add(branch)
            db.flush()
            print("  ✅ Default Main Branch created.")

        # ── 3. Default Department ────────────────────────────────────────────
        dept = db.query(Department).filter(Department.name == "Instruction & Operations").first()
        if not dept:
            dept = Department(
                id="dept_instruction",
                name="Instruction & Operations",
                code="INST",
                description="Core Teaching & Operations Staff",
                head_name="Alex Staff",
                is_active=True,
            )
            db.add(dept)
            db.flush()
            print("  ✅ Default Department created.")

        # ── 4. Seed Users ───────────────────────────────────────────────────
        for u_data in DUMMY_USERS:
            clean_email = u_data["email"].strip().lower()
            user = db.query(User).filter(User.email == clean_email).first()

            if user:
                user.full_name = u_data["full_name"]
                user.password_hash = hash_password(u_data["password"])
                user.role = u_data["role"]
                user.phone = u_data["phone"]
                user.is_active = True
                user.is_platform_admin = u_data.get("is_platform_admin", False)
                user.is_tenant_owner = u_data.get("is_tenant_owner", False)
                user.branch_id = u_data.get("branch_id")
                user.ho_id = u_data.get("ho_id")
                print(f"  🔄 Updated user [{u_data['role']}]: {clean_email}")
            else:
                user = User(
                    id=u_data["id"],
                    email=clean_email,
                    password_hash=hash_password(u_data["password"]),
                    role=u_data["role"],
                    full_name=u_data["full_name"],
                    phone=u_data["phone"],
                    is_active=True,
                    is_platform_admin=u_data.get("is_platform_admin", False),
                    is_tenant_owner=u_data.get("is_tenant_owner", False),
                    branch_id=u_data.get("branch_id"),
                    ho_id=u_data.get("ho_id"),
                    owner_id=u_data.get("owner_id"),
                )
                db.add(user)
                db.flush()
                print(f"  ✨ Created user [{u_data['role']}]: {clean_email}")

        # ── 5. Employee Profiles ────────────────────────────────────────────
        trainer = db.query(EmployeeProfile).filter(EmployeeProfile.email == "employee@vahd.com").first()
        if not trainer:
            trainer = EmployeeProfile(
                id="emp_prof_main",
                user_id="usr_trainer_main",
                full_name="Alex Staff (Senior Instructor)",
                email="employee@vahd.com",
                phone="+91 9900000004",
                gender="Male",
                role="EMPLOYEE",
                specialization="Technical Skills & Core Operations",
                primary_vahd_location="branch_main",
                base_monthly_salary=50000.0,
                is_active=True,
            )
            db.add(trainer)
            print("  ✅ Employee Profile created for employee@vahd.com.")

        emp = db.query(Employee).filter(Employee.email == "employee@vahd.com").first()
        if not emp:
            emp = Employee(
                id="emp_employee_main",
                code="EMP001",
                first_name="Alex",
                last_name="Staff",
                email="employee@vahd.com",
                phone="+91 9900000004",
                gender="Male",
                designation="Senior Instructor",
                department="Instruction & Operations",
                branch_id="branch_main",
                ho_id="ho_main",
                owner_id="usr_owner_main",
                status="ACTIVE",
                salary=50000.0,
            )
            db.add(emp)
            print("  ✅ HRMS Employee record created for employee@vahd.com.")

        # ── 6. Student Profile & Membership ─────────────────────────────────
        stu = db.query(student).filter(student.email == "student@vahd.com").first()
        if not stu:
            stu = student(
                id="stu_student_main",
                user_id="usr_student_main",
                full_name="John Student (Enrolled)",
                email="student@vahd.com",
                phone="+91 9900000005",
                gender="Male",
                member_code="STU001",
                age=24,
                branch_id="branch_main",
                ho_id="ho_main",
                owner_id="usr_owner_main",
                primary_vahd_location="branch_main",
                status="ACTIVE",
            )
            db.add(stu)
            db.flush()
            print("  ✅ Student profile created for student@vahd.com.")

        mem = db.query(Membership).filter(Membership.customer_id == "stu_student_main").first()
        if not mem:
            now = now_ist_naive()
            mem = Membership(
                id="mem_student_main",
                customer_id="stu_student_main",
                plan_name="Annual Professional Certification Course",
                plan_type="Annual",
                status="ACTIVE",
                start_date=now,
                expiry_date=now + datetime.timedelta(days=365),
                price=18000.0,
                paid_amount=18000.0,
                due_amount=0.0,
                payment_method="UPI",
            )
            db.add(mem)
            print("  ✅ Active Enrollment / Membership created for student@vahd.com.")

        db.commit()
        print("\n" + "=" * 70)
        print("🎉 ALL DUMMY LOGINS & TESTING DATA SEEDED SUCCESSFULLY IN DB!")
        print("=" * 70)
        for u in DUMMY_USERS:
            print(f"  • Role: {u['role']:<12} | Portal Tab: {u['portal_name']:<24}")
            print(f"    Email:    {u['email']}")
            print(f"    Password: {u['password']}")
            print("    " + "-" * 56)
        print("=" * 70 + "\n")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seeding failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
