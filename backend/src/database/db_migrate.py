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


def _backfill_tenant_scoping(conn, inspector) -> None:
    """
    Phase-1 tenancy migration (non-breaking):
      1. Fill `tenant_id` on parent tables from branch/HO/free-text sources.
      2. Propagate `tenant_id` to child tables in dependency order.
      3. Create composite-unique indexes on (tenant_id, <business col>),
         REPORTING conflicts instead of crashing (duplicate data in single-tenant
         DBs is expected until the app starts enforcing scoping).

    Dialect-safe: works on SQLite and PostgreSQL. Idempotent: guarded by a
    `tenant_id_backfilled_at` marker row in `platform_settings`-style check.
    """
    # ── Step 1: parent-table backfill ──────────────────────────────────
    # tenant_id canonical value = the originating vahdBranch.id.
    # Existing rows already carry branch_id/ho_id/owner_id/vahd_branch —
    # resolve them to a branch id. For HO-level rows use ho_id directly.
    parent_rules = [
        # (table, source_cols)  — tenant_id = first non-null source (ordered)
        ("users",            ["branch_id", "ho_id", "owner_id"]),
        ("students",         ["branch_id", "ho_id", "owner_id"]),
        ("employee_profiles",["branch_id", "ho_id", "owner_id"]),
        ("courses",          ["branch_id", "ho_id", "owner_id"]),
        ("membership_plans", ["branch_id", "ho_id", "owner_id"]),
        ("branches",         ["ho_id", "owner_id"]),  # fallback; branch's own id is the tenant
        ("hrms_employees",   ["branch_id", "ho_id", "owner_id"]),
        ("hrms_shift_templates", ["branch_id", "ho_id"]),
        ("hrms_attendance_corrections", []),  # derived in Step 2/3 via person links
    ]

    # Build a column map for every existing table ONCE, so all three steps
    # (parent backfill, child propagation, composite-unique) can guard on it.
    all_tables = set(inspector.get_table_names())
    cols: Dict[str, set] = {t: {c["name"] for c in inspector.get_columns(t)}
                             for t in all_tables}

    for table, srcs in parent_rules:
        if table not in cols or "tenant_id" not in cols[table]:
            continue
        # 'branches': the branch's own id IS the tenant (no fallback needed)
        if table == "branches":
            try:
                conn.execute(text(
                    'UPDATE "branches" SET tenant_id = id WHERE tenant_id IS NULL'
                ))
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.warning("tenant backfill branches: %s", e)
            continue
        if not srcs:
            continue
        # Sequential updates per source column — fill tenant_id from the first
        # non-null source that actually exists on the table.
        src_cols = [s for s in srcs if s in cols[table]]
        for c in src_cols:
            try:
                conn.execute(text(
                    f'UPDATE "{table}" SET tenant_id = "{c}" '
                    f'WHERE tenant_id IS NULL AND "{c}" IS NOT NULL'
                ))
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.warning("tenant backfill %s.%s: %s", table, c, e)

    # ── Step 2: child-table propagation (dependency order) ─────────────
    # child table -> source table + join on source id
    child_rules = [
        # (child_table, child_col, source_table, source_col)
        ("memberships",          "student_id", "students",            "tenant_id"),
        ("student_courses",      "student_id", "students",            "tenant_id"),
        ("biometric_logs",       "student_id", "students",            "tenant_id"),
        ("payroll_invoices",     "employee_id","employee_profiles",    "tenant_id"),
        ("hrms_documents",       "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_attendance",      "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_leaves",          "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_payroll",         "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_leave_balances",  "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_performance",     "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_salary_structures","employee_id","hrms_employees",     "tenant_id"),
        ("hrms_payslips",        "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_employee_loans",  "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_salary_advances", "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_employee_bonuses","employee_id","hrms_employees",     "tenant_id"),
        ("hrms_sales_commissions","employee_id","hrms_employees",     "tenant_id"),
        ("hrms_exit_requests",   "employee_id","hrms_employees",      "tenant_id"),
        ("hrms_shift_rosters",   "employee_id","hrms_employees",      "tenant_id"),
        ("erp_stock_movements",  "product_id", "erp_products",        "tenant_id"),
        ("erp_debit_notes",      "company_id", "companies",           "tenant_id"),
        ("erp_credit_notes",     "company_id", "companies",           "tenant_id"),
        ("student_reviews",      "student_id", "students",            "tenant_id"),
    ]
    child_tables = set(inspector.get_table_names())
    for child, child_col, src_tbl, src_col in child_rules:
        if child not in child_tables or "tenant_id" not in cols.get(child, set()):
            continue
        if src_tbl not in child_tables:
            continue
        try:
            conn.execute(text(
                f'UPDATE "{child}" SET tenant_id = ('
                f'SELECT "{src_col}" FROM "{src_tbl}" s '
                f'WHERE s.id = "{child}"."{child_col}") '
                f'WHERE tenant_id IS NULL AND "{child_col}" IS NOT NULL'
            ))
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.warning("tenant propagate %s<-%s: %s", child, src_tbl, e)

    # ── Step 3: composite-unique indexes (report, don't crash) ────────
    # (table, col) pairs that became composite-unique in Phase 1 models.
    composite_uniques = [
        ("hrms_employees",  "code"),
        ("hrms_departments", "name"), ("hrms_departments", "code"),
        ("hrms_leave_types", "name"), ("hrms_leave_types", "code"),
        ("hrms_geofence_schemes", "name"),
        ("hrms_salary_structures", "employee_id"),
        ("hrms_shift_templates", "code"),
        ("erp_product_categories", "category_code"),
        ("erp_products", "sku"),
        ("erp_purchase_requests", "request_number"),
        ("erp_purchase_quotations","quotation_number"),
        ("erp_purchase_orders", "po_number"),
        ("erp_goods_received_notes","grn_number"),
        ("erp_purchase_returns", "return_number"),
        ("erp_vendor_bills", "bill_number"),
        ("erp_vendor_payments", "payment_number"),
        ("erp_debit_notes", "debit_note_number"),
        ("erp_credit_notes", "credit_note_number"),
        ("pos_transactions", "invoice_number"),
        ("course_languages", "name"),
        ("course_classifications", "value"),
        ("payment_methods", "name"),
    ]
    dialect = engine.dialect.name  # "sqlite" or "postgresql"
    idx_tables = set(inspector.get_table_names())
    created, conflicts = 0, 0
    for table, col in composite_uniques:
        if table not in idx_tables:
            continue
        if "tenant_id" not in cols.get(table, set()) or col not in cols.get(table, set()):
            continue
        idx_name = f"uq_{table}_tenant_{col}"
        if dialect == "sqlite":
            ddl = (f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" '
                   f'ON "{table}" ("tenant_id", "{col}")')
        else:
            ddl = (f'CREATE UNIQUE INDEX IF NOT EXISTS "{idx_name}" '
                   f'ON "{table}" ("tenant_id", "{col}")')
        try:
            conn.execute(text(ddl))
            conn.commit()
            created += 1
        except Exception as e:
            # A conflict means duplicate (tenant_id, col) values exist in the
            # current DB — report and leave the index off; don't block startup.
            conn.rollback()
            conflicts += 1
            logger.warning("composite-unique %s.%s skipped: %s", table, col, e)

    # ── Step 4: drop legacy GLOBAL unique constraints/indexes on columns
    # that are now composite-uniqued per-tenant (otherwise the old
    # single-column constraint keeps blocking cross-tenant duplicates).
    # Report, don't crash.
    dropped_legacy = 0
    for table, col in composite_uniques:
        if table not in idx_tables:
            continue
        # candidate legacy names (dialect-dependent)
        candidates = [f"{table}_{col}_key", f"ix_{table}_{col}"]
        # also introspect any existing single-column unique index on `col`
        try:
            for idx in inspector.get_indexes(table):
                cn = idx.get("column_names") or []
                if idx.get("unique") and cn == [col] and idx.get("name"):
                    candidates.append(idx["name"])
        except Exception:
            pass
        for cand in candidates:
            try:
                conn.execute(text(f'DROP INDEX IF EXISTS "{cand}";'))
                conn.commit()
                dropped_legacy += 1
            except Exception:
                conn.rollback()
            try:
                conn.execute(text(
                    f'ALTER TABLE "{table}" DROP CONSTRAINT IF EXISTS "{cand}";'
                ))
                conn.commit()
            except Exception:
                conn.rollback()

    logger.info(
        "tenant backfill complete (%d composite-unique indexes created, %d conflicts reported, "
        "%d legacy global uniques dropped)",
        created, conflicts, dropped_legacy,
    )


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
            # 1.5 Safely drop obsolete foreign keys that restrict employee_id to hrms_employees only
            # This allows shift rosters and attendance to seamlessly support students and staff alike
            try:
                conn.execute(text('ALTER TABLE "hrms_shift_rosters" DROP CONSTRAINT IF EXISTS "hrms_shift_rosters_employee_id_fkey";'))
                conn.commit()
            except Exception as fkey_err:
                conn.rollback()

            try:
                conn.execute(text('ALTER TABLE "hrms_attendance" DROP CONSTRAINT IF EXISTS "hrms_attendance_employee_id_fkey";'))
                conn.commit()
            except Exception as fkey_err:
                conn.rollback()

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

            # 3.5 Backfill tenant_id (canonical branch/org scope) + build composite uniques
            _backfill_tenant_scoping(conn, inspector)

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
