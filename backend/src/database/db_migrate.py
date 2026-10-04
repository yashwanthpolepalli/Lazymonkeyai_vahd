"""
FIT CLUB AI — Cross-Dialect Database Schema Migration Service
Applies dialect-safe schema migrations for missing tables and columns across SQLite and PostgreSQL.
Zero hardcoded default mock data.
"""
from typing import Dict, List, Tuple
from sqlalchemy import inspect, text
from src.database.session import engine
from src.database.base import Base
# Ensure all models are imported so Base.metadata is fully populated
import src.models  # noqa: F401


# Table -> List of (column_name, sql_type)
SCHEMA_COLUMNS: Dict[str, List[Tuple[str, str]]] = {
    "users": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("avatar_url", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("is_platform_admin", "BOOLEAN"),
        ("is_tenant_owner", "BOOLEAN"),
    ],
    "branches": [
        ("owner_id", "VARCHAR"),
        ("name", "VARCHAR"),
        ("branch_name", "VARCHAR"),
        ("city", "VARCHAR"),
        ("address", "VARCHAR"),
        ("is_active", "BOOLEAN"),
        ("created_at", "TIMESTAMP"),
    ],
    "settings": [
        ("name", "VARCHAR"),
        ("address", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("gstin", "VARCHAR"),
        ("essl_bioserver_url", "VARCHAR"),
        ("enable_auto_sms", "BOOLEAN"),
        ("enable_gate_autolock", "BOOLEAN"),
        ("enable_pos", "BOOLEAN"),
        ("enable_inventory", "BOOLEAN"),
        ("enable_gst_engine", "BOOLEAN"),
        ("sgst_rate", "FLOAT"),
        ("sgst_enabled", "BOOLEAN"),
        ("cgst_rate", "FLOAT"),
        ("cgst_enabled", "BOOLEAN"),
        ("igst_rate", "FLOAT"),
        ("igst_enabled", "BOOLEAN"),
        ("total_gst_rate", "FLOAT"),
        ("tax_pricing_mode", "VARCHAR"),
        ("sac_code", "VARCHAR"),
        ("enable_discount_engine", "BOOLEAN"),
        ("pos_discount_presets", "JSON"),
        ("max_staff_discount", "FLOAT"),
        ("discount_sequence", "VARCHAR"),
        ("tier_discounts", "JSON"),
    ],
    "memberships": [
        ("payment_method", "VARCHAR"),
        ("invoice_number", "VARCHAR"),
        ("transaction_id", "VARCHAR"),
        ("paid_amount", "FLOAT"),
        ("due_amount", "FLOAT"),
    ],
    "courses": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("name", "VARCHAR"),
        ("category", "VARCHAR"),
        ("department", "VARCHAR"),
        ("degree_type", "VARCHAR"),
        ("price", "FLOAT"),
        ("duration_days", "INTEGER"),
        ("period", "VARCHAR"),
        ("features", "JSON"),
        ("description", "VARCHAR"),
        ("color", "VARCHAR"),
        ("badge", "VARCHAR"),
        ("is_combo", "BOOLEAN"),
        ("is_active", "BOOLEAN"),
    ],
    "student_courses": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("student_id", "VARCHAR"),
        ("course_id", "VARCHAR"),
        ("start_date", "TIMESTAMP"),
        ("end_date", "TIMESTAMP"),
        ("status", "VARCHAR"),
        ("fee_amount", "FLOAT"),
        ("paid_amount", "FLOAT"),
        ("due_amount", "FLOAT"),
        ("payment_method", "VARCHAR"),
        ("invoice_number", "VARCHAR"),
        ("transaction_id", "VARCHAR"),
        ("auto_renew", "BOOLEAN"),
    ],
    "customers": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("member_code", "VARCHAR"),
        ("gender", "VARCHAR"),
        ("weight", "FLOAT"),
        ("height", "FLOAT"),
        ("age", "INTEGER"),
        ("bmi", "FLOAT"),
        ("fitness_score", "INTEGER"),
        ("fitness_level", "VARCHAR"),
        ("training_preference", "VARCHAR"),
        ("goal", "VARCHAR"),
        ("target_calories", "INTEGER"),
        ("target_weight", "FLOAT"),
        ("days_per_week", "INTEGER"),
        ("session_duration_minutes", "INTEGER"),
        ("target_protein", "INTEGER"),
        ("target_carbs", "INTEGER"),
        ("target_fat", "INTEGER"),
        ("target_water", "FLOAT"),
        ("target_fiber", "INTEGER"),
        ("target_sugar", "INTEGER"),
        ("body_condition", "VARCHAR"),
        ("meals_per_day", "INTEGER"),
        ("dietary_preference", "VARCHAR"),
        ("target_steps", "INTEGER"),
        ("target_sleep_minutes", "INTEGER"),
        ("weight_unit", "VARCHAR"),
        ("profile_image", "VARCHAR"),
        ("face_registered", "BOOLEAN"),
        ("face_image", "VARCHAR"),
        ("rfid_tag", "VARCHAR"),
        ("status", "VARCHAR"),
        ("primary_gym_location", "VARCHAR"),
        ("enable_workout_videos", "BOOLEAN"),
        ("updated_at", "TIMESTAMP"),
    ],
    "inbody_reports": [
        ("score", "INTEGER"),
        ("weight", "FLOAT"),
        ("skeletal_muscle_mass", "FLOAT"),
        ("body_fat_percentage", "FLOAT"),
        ("body_fat_mass", "FLOAT"),
        ("visceral_fat", "FLOAT"),
        ("bmi", "FLOAT"),
        ("basal_metabolic_rate", "FLOAT"),
        ("body_water", "FLOAT"),
        ("protein", "FLOAT"),
        ("segmental_analysis", "JSON"),
    ],
    "trainer_profiles": [
        ("primary_gym_location", "VARCHAR"),
        ("specialization", "VARCHAR"),
        ("base_monthly_salary", "FLOAT"),
        ("pt_session_rate", "FLOAT"),
        ("bank_account_no", "VARCHAR"),
        ("bank_ifsc", "VARCHAR"),
        ("upi_id", "VARCHAR"),
        ("is_active", "BOOLEAN"),
    ],
    "biometric_devices": [
        ("external_device_id", "VARCHAR"),
        ("serial_number", "VARCHAR"),
        ("device_name", "VARCHAR"),
        ("model_name", "VARCHAR"),
        ("device_type", "VARCHAR"),
        ("ip_address", "VARCHAR"),
        ("port", "INTEGER"),
        ("connection_type", "VARCHAR"),
        ("mac_address", "VARCHAR"),
        ("wifi_ssid", "VARCHAR"),
        ("is_wireless", "BOOLEAN"),
        ("status", "VARCHAR"),
        ("location", "VARCHAR"),
        ("meta_data", "JSON"),
        ("last_seen_at", "TIMESTAMP"),
        ("last_sync_at", "TIMESTAMP"),
        ("created_at", "TIMESTAMP"),
        ("updated_at", "TIMESTAMP"),
    ],
    "biometric_logs": [
        ("customer_id", "VARCHAR"),
        ("user_role", "VARCHAR"),
        ("timestamp", "TIMESTAMP"),
        ("event_type", "VARCHAR"),
        ("device_type", "VARCHAR"),
        ("device_id", "VARCHAR"),
        ("device_name", "VARCHAR"),
        ("direction", "VARCHAR"),
        ("status", "VARCHAR"),
        ("confidence_score", "FLOAT"),
        ("meta_data", "JSON"),
    ],
    "membership_plans": [
        ("category", "VARCHAR"),
        ("color", "VARCHAR"),
        ("badge", "VARCHAR"),
        ("is_combo", "BOOLEAN"),
        ("is_active", "BOOLEAN"),
        ("updated_at", "TIMESTAMP"),
    ],
    "hrms_geofence_schemes": [
        ("branch_name", "VARCHAR"),
        ("gym_name", "VARCHAR"),
        ("latitude", "FLOAT"),
        ("longitude", "FLOAT"),
        ("radius_meters", "INTEGER"),
        ("strict_restriction", "BOOLEAN"),
        ("ip_whitelist", "VARCHAR"),
        ("shift_start_time", "VARCHAR"),
        ("shift_end_time", "VARCHAR"),
        ("grace_period_mins", "INTEGER"),
        ("min_half_day_hours", "FLOAT"),
        ("allowed_channels", "JSON"),
        ("assigned_employee_ids", "JSON"),
        ("is_active", "BOOLEAN"),
        ("created_at", "TIMESTAMP"),
        ("updated_at", "TIMESTAMP"),
    ],
    "trainer_profiles": [
        ("gender", "VARCHAR"),
    ],
    "hrms_employees": [
        ("gender", "VARCHAR"),
        ("marital_status", "VARCHAR"),
        ("probation_status", "VARCHAR"),
    ],
    "hrms_leaves": [
        ("leave_type_id", "VARCHAR"),
        ("paid_type", "VARCHAR"),
        ("is_paid", "BOOLEAN"),
        ("rejection_reason", "TEXT"),
        ("attachment_url", "VARCHAR"),
    ],
    "hrms_leave_types": [
        ("name", "VARCHAR"),
        ("code", "VARCHAR"),
        ("category", "VARCHAR"),
        ("description", "TEXT"),
        ("paid_type", "VARCHAR"),
        ("is_paid", "BOOLEAN"),
        ("gender_eligibility", "JSON"),
        ("employment_types", "JSON"),
        ("applicable_departments", "JSON"),
        ("applicable_designations", "JSON"),
        ("min_service_days", "INTEGER"),
        ("annual_quota", "FLOAT"),
        ("max_consecutive_days", "INTEGER"),
        ("carry_forward_allowed", "BOOLEAN"),
        ("max_carry_forward_days", "INTEGER"),
        ("encashment_allowed", "BOOLEAN"),
        ("max_encashment_days", "INTEGER"),
        ("attachment_required", "BOOLEAN"),
        ("is_active", "BOOLEAN"),
        ("created_at", "TIMESTAMP"),
        ("updated_at", "TIMESTAMP"),
    ],
    "hrms_leave_balances": [
        ("employee_id", "VARCHAR"),
        ("leave_type_id", "VARCHAR"),
        ("year", "INTEGER"),
        ("allocated_days", "FLOAT"),
        ("used_days", "FLOAT"),
        ("pending_days", "FLOAT"),
        ("buffer_days", "FLOAT"),
        ("updated_at", "TIMESTAMP"),
    ],
}


def seed_default_leave_types(db):
    """Seeds canonical enterprise leave policy types if not present in DB."""
    from src.models.hrms import LeaveType
    try:
        defaults = [
            {
                "id": "lt_casual",
                "name": "Casual Leave",
                "code": "CL",
                "category": "General Leave",
                "description": "Short casual leaves for personal affairs, rest and errands.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
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
                "id": "lt_sick",
                "name": "Sick / Medical Leave",
                "code": "SL",
                "category": "Medical Leave",
                "description": "Medical recuperation and sick leaves.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 12.0,
                "max_consecutive_days": 7,
                "carry_forward_allowed": True,
                "max_carry_forward_days": 10,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_earned",
                "name": "Earned / Privilege Leave",
                "code": "EL",
                "category": "Privilege Leave",
                "description": "Annual accrued vacation privilege leave.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 90,
                "annual_quota": 15.0,
                "max_consecutive_days": 15,
                "carry_forward_allowed": True,
                "max_carry_forward_days": 30,
                "encashment_allowed": True,
                "max_encashment_days": 15,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_maternity",
                "name": "Maternity Leave",
                "code": "ML",
                "category": "Statutory / Parental Leave",
                "description": "Statutory maternity benefit for female staff and expectant mothers.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["FEMALE"],
                "employment_types": ["FULL_TIME", "PERMANENT", "CONTRACT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 180,
                "annual_quota": 180.0,
                "max_consecutive_days": 180,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_paternity",
                "name": "Paternity Leave",
                "code": "PL",
                "category": "Statutory / Parental Leave",
                "description": "Statutory paternity benefit for male staff and new fathers.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE"],
                "employment_types": ["FULL_TIME", "PERMANENT", "CONTRACT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 180,
                "annual_quota": 15.0,
                "max_consecutive_days": 15,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_child_care",
                "name": "Child Care Leave",
                "code": "CCL",
                "category": "Special Leave",
                "description": "Leave granted for child care, exams and upbringing.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 365,
                "annual_quota": 30.0,
                "max_consecutive_days": 15,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_adoption",
                "name": "Adoption Leave",
                "code": "AL",
                "category": "Special Leave",
                "description": "Leave granted to adopting parents for legal procedures & bonding.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 180,
                "annual_quota": 60.0,
                "max_consecutive_days": 60,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_bereavement",
                "name": "Bereavement Leave",
                "code": "BL",
                "category": "Special Leave",
                "description": "Compassionate leave on demise of an immediate family member.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 5.0,
                "max_consecutive_days": 5,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_wedding",
                "name": "Wedding Leave",
                "code": "WL",
                "category": "Special Leave",
                "description": "Leave granted to staff members for their own wedding celebrations.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PERMANENT"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 180,
                "annual_quota": 5.0,
                "max_consecutive_days": 5,
                "carry_forward_allowed": False,
                "max_carry_forward_days": 0,
                "encashment_allowed": False,
                "max_encashment_days": 0,
                "attachment_required": True,
                "is_active": True,
            },
            {
                "id": "lt_comp_off",
                "name": "Compensatory Off",
                "code": "COMP",
                "category": "Compensatory",
                "description": "Leave credited against extra hours or festival duty performed.",
                "paid_type": "PAID",
                "is_paid": True,
                "gender_eligibility": ["MALE", "FEMALE", "OTHER"],
                "employment_types": ["FULL_TIME", "PART_TIME", "CONTRACT", "PERMANENT", "PROBATION"],
                "applicable_departments": ["ALL"],
                "applicable_designations": ["ALL"],
                "min_service_days": 0,
                "annual_quota": 0.0,
                "max_consecutive_days": 3,
                "carry_forward_allowed": True,
                "max_carry_forward_days": 10,
                "encashment_allowed": True,
                "max_encashment_days": 5,
                "attachment_required": False,
                "is_active": True,
            },
            {
                "id": "lt_unpaid_lwp",
                "name": "Leave Without Pay",
                "code": "LWP",
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


def run_database_migrations():
    """
    Ensures all tables and missing columns exist in the database.
    Compatible with both SQLite and PostgreSQL.
    Dynamically introspects all registered SQLAlchemy models and schema definitions.
    """
    try:
        # 1. Create any completely missing tables first via Base.metadata
        Base.metadata.create_all(bind=engine)

        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        added_columns_count = 0

        with engine.connect() as conn:
            # First pass: check explicit SCHEMA_COLUMNS mapping
            for table_name, columns in SCHEMA_COLUMNS.items():
                if table_name not in existing_tables:
                    continue

                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}

                for col_name, col_type in columns:
                    if col_name not in existing_cols:
                        try:
                            alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                            conn.execute(text(alter_sql))
                            conn.commit()
                            existing_cols.add(col_name)
                            added_columns_count += 1
                        except Exception as col_err:
                            conn.rollback()
                            print(f"[DB Migration Notice] Column {table_name}.{col_name} skipped: {col_err}")

            # Second pass: check all registered SQLAlchemy models in Base.metadata.tables
            for table_name, table_obj in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue

                existing_cols = {col["name"] for col in inspector.get_columns(table_name)}

                for col in table_obj.columns:
                    col_name = col.name
                    if col_name not in existing_cols:
                        try:
                            # Compile SQL column type
                            col_type = col.type.compile(engine.dialect)
                            alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                            conn.execute(text(alter_sql))
                            conn.commit()
                            existing_cols.add(col_name)
                            added_columns_count += 1
                        except Exception as col_err:
                            conn.rollback()
                            print(f"[DB Migration Notice] Model column {table_name}.{col_name} skipped: {col_err}")

        # 3. Seed canonical leave policies if not present
        from src.database.session import SessionLocal
        seed_db = SessionLocal()
        try:
            seed_default_leave_types(seed_db)
        finally:
            seed_db.close()

        if added_columns_count > 0:
            print(f"✅ Database Schema Migration Completed ({added_columns_count} missing columns added)!")
        else:
            print("✅ Database Schema Integrity Verified — All tables and columns up to date!")

    except Exception as e:
        print(f"[DB Migration Warning] {e}")


if __name__ == "__main__":
    run_database_migrations()

