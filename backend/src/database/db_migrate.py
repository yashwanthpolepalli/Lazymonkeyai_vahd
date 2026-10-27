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

# Tables explicitly protected from any drop operation
PROTECTED_TABLES: Set[str] = {"users", "alembic_version", "sqlite_sequence"}


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
    Safely drops any non-canonical tables while preserving user logins and core data.
    """
    try:
        # 1. Create all 78 canonical tables from Base.metadata if any are missing
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        existing_tables: Set[str] = set(inspector.get_table_names())
        canonical_tables: Set[str] = set(Base.metadata.tables.keys())

        # Automatically detect any table in the DB that is not part of the canonical 78 models
        obsolete_tables = [
            tbl for tbl in existing_tables
            if tbl not in canonical_tables and tbl not in PROTECTED_TABLES
        ]

        added_columns_count = 0
        dropped_tables_count = 0

        with engine.connect() as conn:

            # 2. Safely drop any non-canonical tables detected in the database
            for tbl in obsolete_tables:
                try:
                    conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;'))
                    conn.commit()
                    existing_tables.discard(tbl)
                    dropped_tables_count += 1
                    print(f"[DB Migration Notice] Safely dropped obsolete non-canonical table: {tbl}")
                except Exception as drop_err:
                    conn.rollback()
                    print(f"[DB Migration Notice] Could not drop table {tbl}: {drop_err}")

            # 3. Introspect all registered SQLAlchemy models in Base.metadata.tables and add missing columns
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

        # 4. Seed canonical leave policies
        seed_db = SessionLocal()
        try:
            seed_default_leave_types(seed_db)
        finally:
            seed_db.close()

        print(
            f"✅ Database Schema Migration Completed ({len(canonical_tables)} canonical tables verified, "
            f"{dropped_tables_count} obsolete tables dropped, {added_columns_count} missing columns added)!"
        )

    except Exception as e:
        print(f"[DB Migration Warning] {e}")


if __name__ == "__main__":
    run_database_migrations()
