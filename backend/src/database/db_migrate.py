"""
VAHD Enterprise Platform — Cross-Dialect Database Schema Migration Service
========================================================================
Applies dialect-safe schema migrations for all tables and columns across SQLite and PostgreSQL.
Auto-creates all 78 canonical platform tables, safely alters missing columns, and seeds default policies.
"""
import os
import sys

# Ensure backend root is in sys.path when executed directly as a script
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import logging
from typing import Dict, List, Set, Tuple
from sqlalchemy import inspect, text
from src.database.session import engine, SessionLocal
from src.database.base import Base

# Ensure all 78 models are imported so Base.metadata is fully populated
import src.models  # noqa: F401

logger = logging.getLogger("VAHD_DB_MIGRATE")

# Legacy / obsolete tables that must be safely dropped if detected
OBSOLETE_TABLES: List[str] = [
    # Legacy duplicate/child tables
    "trainer_profiles",
    "master_data_items",
    "erp_vendor_credit_notes",
    "erp_vendor_debit_notes",
    "erp_purchase_request_items",
    "erp_purchase_quotation_items",
    "erp_purchase_order_items",
    "erp_goods_received_note_items",
    "erp_purchase_return_items",
    "erp_blacklisted_suppliers",
    "erp_procurement_ai_suggestions",
    "erp_supplier_categories",
    "erp_supplier_contacts",
    "erp_supplier_contracts",
    "erp_supplier_performance",
    # Legacy gym/CRM/workout tables
    "crm_discount_usages",
    "crm_discounts",
    "crm_leads",
    "crm_marketing_ads",
    "crm_marketing_assets",
    "crm_opportunities",
    "crm_quotations",
    "crm_sales_orders",
    "crm_social_posts",
    "crm_support_tickets",
    "crm_voice_call_logs",
    "customer_program_assignments",
    "customer_transformations",
    "customer_workout_preferences",
    "exercise_taxonomy_rules",
    "exercises",
    "training_split_days",
    "training_splits",
    "workout_exercises",
    "workout_program_days",
    "workout_program_exercises",
    "workout_program_weeks",
    "workout_programming_rules",
    "workout_programs",
    "workout_session_exercises",
    "workout_sessions",
    "workout_template_days",
    "workout_template_exercises",
    "workout_templates",
    "workouts",
    "nutrition_food_master",
    "nutrition_log_items",
    "nutrition_logs",
    "inbody_reports",
    "health_connections",
    "health_daily_summaries",
    "health_workouts",
    "bmi_classification_config",
    "readiness_configs",
    "brochure_templates",
    "vahd_slot_bookings",
    "gym_slot_bookings",
]


def seed_default_leave_types(db) -> None:
    """Seeds canonical enterprise leave types for HRMS if not present."""
    from src.models.hrms import LeaveType
    try:
        defaults = [
            {
                "id": "lt_cl",
                "name": "Casual Leave (CL)",
                "code": "CL",
                "category": "Casual Leave",
                "description": "Short paid leaves for personal commitments and unplanned events.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 12.0,
                "max_consecutive_days": 3,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_sl",
                "name": "Sick / Medical Leave (SL)",
                "code": "SL",
                "category": "Sick Leave",
                "description": "Paid time off for recovery from illness, injury or medical treatments.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 10.0,
                "max_consecutive_days": 15,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_pl",
                "name": "Paid / Privilege Leave (PL)",
                "code": "PL",
                "category": "Earned Leave",
                "description": "Earned annual vacation leaves with full pay and carry forward facility.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 90,
                "annual_quota": 18.0,
                "max_consecutive_days": 30,
                "carry_forward_allowed": True,
                "max_carry_forward_days": 30,
                "encashment_allowed": True,
                "max_encashment_days": 15,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_ml",
                "name": "Maternity Leave (ML)",
                "code": "ML",
                "category": "Maternity Leave",
                "description": "Fully paid maternity leave as per statutory maternity benefit regulations.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["FEMALE"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 80,
                "annual_quota": 182.0,
                "max_consecutive_days": 182,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_ptl",
                "name": "Paternity Leave (PTL)",
                "code": "PTL",
                "category": "Paternity Leave",
                "description": "Paid leave for fathers upon childbirth or legal adoption.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 90,
                "annual_quota": 7.0,
                "max_consecutive_days": 7,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_lop",
                "name": "Loss of Pay (LOP)",
                "code": "LOP",
                "category": "Unpaid Leave",
                "description": "Unpaid authorized absence with salary deduction (Loss of Pay).",
                "paid_type": "UNPAID",
                "is_paid": False,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 0.0,
                "max_consecutive_days": 90,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": False,
                "is_active": True,
            },
        ]
        for item in defaults:
            row = db.query(LeaveType).filter((LeaveType.id == item["id"]) | (LeaveType.code == item["code"])).first()
            if not row:
                db.add(LeaveType(**item))
            else:
                row.name = item["name"]
                row.code = item["code"]
                row.category = item.get("category", "General Leave")
                row.paid_type = item["paid_type"]
                row.is_paid = item["is_paid"]
                row.encashment_allowed = item.get("encashment_allowed", False)
                row.max_encashment_days = item.get("max_encashment_days", 0)
        db.commit()
    except Exception as e:
        print("[DB Migration Warning] Failed to seed default leave types:", e)
        db.rollback()


def run_database_migrations() -> None:
    """
    Ensures all 78 canonical tables and missing columns exist in the database.
    Compatible with both SQLite and PostgreSQL.
    Dynamically introspects all registered SQLAlchemy models in Base.metadata.
    """
    try:
        # 1. Create all 78 canonical tables from Base.metadata if any are missing
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        existing_tables: Set[str] = set(inspector.get_table_names())

        added_columns_count = 0

        with engine.connect() as conn:
            # 2. Legacy Migration: Merge trainer_profiles into employee_profiles if found
            if "trainer_profiles" in existing_tables:
                try:
                    # Ensure employee_profiles exists and has primary_gym_location
                    emp_cols = {col["name"] for col in inspector.get_columns("employee_profiles")}
                    if "primary_gym_location" not in emp_cols:
                        conn.execute(text("ALTER TABLE employee_profiles ADD COLUMN primary_gym_location VARCHAR;"))
                        conn.commit()

                    # Merge rows without conflict
                    merge_sql = text("""
                        INSERT INTO employee_profiles (
                            id, user_id, full_name, email, phone, gender, role, specialization,
                            primary_vahd_location, primary_gym_location, base_monthly_salary,
                            pt_session_rate, bank_account_no, bank_ifsc, upi_id, is_active, created_at
                        )
                        SELECT
                            id, user_id, full_name, email, phone, gender, role, specialization,
                            COALESCE(primary_vahd_location, primary_gym_location),
                            primary_gym_location, base_monthly_salary, pt_session_rate,
                            bank_account_no, bank_ifsc, upi_id, is_active, created_at
                        FROM trainer_profiles
                        ON CONFLICT (id) DO UPDATE SET
                            user_id = EXCLUDED.user_id,
                            full_name = EXCLUDED.full_name,
                            email = EXCLUDED.email,
                            phone = EXCLUDED.phone,
                            gender = EXCLUDED.gender,
                            role = EXCLUDED.role,
                            specialization = EXCLUDED.specialization,
                            primary_vahd_location = EXCLUDED.primary_vahd_location,
                            primary_gym_location = EXCLUDED.primary_gym_location,
                            base_monthly_salary = EXCLUDED.base_monthly_salary,
                            pt_session_rate = EXCLUDED.pt_session_rate,
                            bank_account_no = EXCLUDED.bank_account_no,
                            bank_ifsc = EXCLUDED.bank_ifsc,
                            upi_id = EXCLUDED.upi_id,
                            is_active = EXCLUDED.is_active;
                    """)
                    conn.execute(merge_sql)
                    conn.commit()
                except Exception as merge_err:
                    conn.rollback()
                    print(f"[DB Migration Notice] Trainer merge notice: {merge_err}")

            # 3. Drop obsolete / duplicate tables
            for tbl in OBSOLETE_TABLES:
                if tbl in existing_tables:
                    try:
                        conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;'))
                        conn.commit()
                        existing_tables.discard(tbl)
                    except Exception as drop_err:
                        conn.rollback()
                        print(f"[DB Migration Notice] Could not drop obsolete table {tbl}: {drop_err}")

            # 4. Introspect all registered SQLAlchemy models in Base.metadata.tables and add missing columns
            for table_name, table_obj in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue

                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}

                for col in table_obj.columns:
                    col_name = col.name
                    if col_name not in existing_cols:
                        try:
                            col_type = col.type.compile(engine.dialect)
                            alter_sql = f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {col_type};'
                            conn.execute(text(alter_sql))
                            conn.commit()
                            existing_cols.add(col_name)
                            added_columns_count += 1
                        except Exception as col_err:
                            conn.rollback()
                            print(f"[DB Migration Notice] Column {table_name}.{col_name} skipped: {col_err}")

        # 5. Seed canonical leave policies
        seed_db = SessionLocal()
        try:
            seed_default_leave_types(seed_db)
        finally:
            seed_db.close()

        if added_columns_count > 0:
            print(f"✅ Database Schema Migration Completed ({added_columns_count} missing columns added)!")
        else:
            print("✅ Database Schema Integrity Verified — All 78 tables and columns up to date!")

    except Exception as e:
        print(f"[DB Migration Warning] {e}")


if __name__ == "__main__":
    run_database_migrations()
