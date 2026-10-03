"""
Database Schema Synchronizer & Production Migration Engine
=========================================================
Runs automatically in both local development and production environments (PostgreSQL / SQLite).
Safely handles:
1. Creating all missing tables (`courses`, `student_courses`, `branches`, `settings`, etc.)
2. Safe column schema additions (`ALTER TABLE ... ADD COLUMN ...`) across all dialects
3. Table renaming and column harmonization (e.g. gym_branches -> branches, gym_settings -> settings)
4. Zero data loss / zero hardcoded defaults
"""
import sys
import logging
from typing import Dict, List, Tuple
from sqlalchemy import inspect, text
from src.database.session import engine
from src.database.base import Base

# Ensure all application models are imported so Base.metadata is complete
import src.models  # noqa: F401

logger = logging.getLogger("DB_SYNC")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Comprehensive column definition matrix for cross-dialect schema verification
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
        ("plan_id", "VARCHAR"),
        ("plan_name", "VARCHAR"),
        ("plan_tier", "VARCHAR"),
        ("billing_cycle", "VARCHAR"),
        ("payment_method", "VARCHAR"),
        ("paid_amount", "FLOAT"),
        ("custom_features", "JSON"),
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
        ("meta_data", "JSON"),
        ("updated_at", "TIMESTAMP"),
    ],
    "invoices": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("invoice_number", "VARCHAR"),
        ("member_id", "VARCHAR"),
        ("member_name", "VARCHAR"),
        ("member_phone", "VARCHAR"),
        ("subtotal", "FLOAT"),
        ("tax_rate", "FLOAT"),
        ("tax_amount", "FLOAT"),
        ("sgst_amount", "FLOAT"),
        ("cgst_amount", "FLOAT"),
        ("igst_amount", "FLOAT"),
        ("discount_amount", "FLOAT"),
        ("total_amount", "FLOAT"),
        ("paid_amount", "FLOAT"),
        ("due_amount", "FLOAT"),
        ("status", "VARCHAR"),
        ("payment_method", "VARCHAR"),
        ("notes", "VARCHAR"),
        ("due_date", "TIMESTAMP"),
    ],
    "payments": [
        ("owner_id", "VARCHAR"),
        ("branch_id", "VARCHAR"),
        ("invoice_id", "VARCHAR"),
        ("member_id", "VARCHAR"),
        ("member_name", "VARCHAR"),
        ("amount", "FLOAT"),
        ("payment_method", "VARCHAR"),
        ("transaction_id", "VARCHAR"),
        ("status", "VARCHAR"),
        ("notes", "VARCHAR"),
    ],
    "payment_methods": [
        ("name", "VARCHAR"),
        ("code", "VARCHAR"),
        ("icon", "VARCHAR"),
        ("is_active", "BOOLEAN"),
        ("created_at", "TIMESTAMP"),
    ],
    "feature_controls": [
        ("feature_name", "VARCHAR"),
        ("starter", "BOOLEAN"),
        ("pro", "BOOLEAN"),
        ("business", "BOOLEAN"),
        ("enterprise", "BOOLEAN"),
        ("updated_at", "TIMESTAMP"),
    ],
}


def sync_database_schema(verbose: bool = True) -> bool:
    """
    Executes an idempotent schema synchronization against the target database.
    Works seamlessly on local SQLite and production PostgreSQL instances.
    """
    try:
        dialect_name = engine.dialect.name.lower()
        if verbose:
            logger.info(f"⚡ Starting Database Schema Sync (Dialect: {dialect_name.upper()})")

        # 1. Inspect existing tables
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        # Safe table renaming migrations if old legacy tables exist
        with engine.begin() as conn:
            if "gym_branches" in existing_tables and "branches" not in existing_tables:
                try:
                    conn.execute(text('ALTER TABLE "gym_branches" RENAME TO "branches";'))
                    existing_tables.remove("gym_branches")
                    existing_tables.add("branches")
                    if verbose: logger.info("✓ Migrated table gym_branches -> branches")
                except Exception as ex:
                    logger.warning(f"Notice during table rename gym_branches: {ex}")

            if "gym_settings" in existing_tables and "settings" not in existing_tables:
                try:
                    conn.execute(text('ALTER TABLE "gym_settings" RENAME TO "settings";'))
                    existing_tables.remove("gym_settings")
                    existing_tables.add("settings")
                    if verbose: logger.info("✓ Migrated table gym_settings -> settings")
                except Exception as ex:
                    logger.warning(f"Notice during table rename gym_settings: {ex}")

        # 2. Create all missing tables defined in SQLAlchemy Base.metadata
        Base.metadata.create_all(bind=engine)
        if verbose:
            logger.info("✓ Verified all Base tables exist.")

        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        added_columns_count = 0

        with engine.begin() as conn:
            for table_name, columns in SCHEMA_COLUMNS.items():
                if table_name not in existing_tables:
                    continue

                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}

                for col_name, col_type in columns:
                    if col_name not in existing_cols:
                        sql_type = col_type
                        if dialect_name == "sqlite":
                            if "JSON" in col_type:
                                sql_type = "TEXT"
                            elif "BOOLEAN" in col_type:
                                sql_type = "INTEGER"
                            elif "TIMESTAMP" in col_type:
                                sql_type = "DATETIME"
                        elif "postgres" in dialect_name:
                            if "JSON" in col_type:
                                sql_type = "JSONB"

                        alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {sql_type};'
                        try:
                            conn.execute(text(alter_stmt))
                            added_columns_count += 1
                            if verbose:
                                logger.info(f"  + Added column {table_name}.{col_name} ({sql_type})")
                        except Exception as ex:
                            if "already exists" not in str(ex).lower() and "duplicate column" not in str(ex).lower():
                                logger.warning(f"  ! Column {table_name}.{col_name} notice: {ex}")

        if verbose:
            logger.info(f"✅ Database Schema Sync completed successfully! ({added_columns_count} new columns verified)")
        return True

    except Exception as e:
        logger.error(f"❌ Database Schema Sync encountered an error: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = sync_database_schema(verbose=True)
    sys.exit(0 if success else 1)
