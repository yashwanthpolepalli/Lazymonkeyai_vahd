#!/usr/bin/env python3
"""
Production Database Synchronization & Cleanup Script
-----------------------------------------------------
Drops obsolete and unused tables (CRM, workouts, exercises, nutrition, brochures, etc.)
from production PostgreSQL / SQLite databases safely.

Usage:
  # Check status / dry-run against DB configured in .env:
  python3 production_db.py --status

  # Drop unused tables from DB configured in .env:
  python3 production_db.py --drop-unused

  # Drop unused tables from a specific production DB URL:
  python3 production_db.py --db-url "postgresql://user:pass@prod-host:5432/dbname" --drop-unused

  # Full cleanup (drop unused tables + truncate dummy attendance corrections):
  python3 production_db.py --all
"""
import os
import sys
import argparse
import urllib.parse
from typing import List, Tuple

# Ensure backend root is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# List of 41 obsolete / unused tables to be dropped
UNUSED_TABLES: List[str] = [
    # ─── 1. CRM Tables ───────────────────────────────────────────
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

    # ─── 2. Workout, Exercise & Training Split Tables ────────────
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

    # ─── 3. Nutrition, Food, InBody & Health Sync Tables ──────────
    "nutrition_food_master",
    "nutrition_log_items",
    "nutrition_logs",
    "inbody_reports",
    "health_connections",
    "health_daily_summaries",
    "health_workouts",
    "bmi_classification_config",
    "readiness_configs",

    # ─── 4. Brochures & Slot Bookings ────────────────────────────
    "brochure_templates",
    "gym_slot_bookings",
]


def get_connection(db_url: str):
    """Establishes database connection based on URL scheme."""
    if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
        import psycopg2
        # Normalize postgres:// to postgresql://
        parsed = urllib.parse.urlparse(db_url)
        username = parsed.username or "postgres"
        password = urllib.parse.unquote(parsed.password) if parsed.password else ""
        hostname = parsed.hostname or "localhost"
        port = parsed.port or 5432
        dbname = parsed.path.lstrip("/") or "postgres"

        conn = psycopg2.connect(
            dbname=dbname,
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        conn.autocommit = True
        return conn, "postgresql"
    elif db_url.startswith("sqlite:///"):
        import sqlite3
        path = db_url.replace("sqlite:///", "")
        conn = sqlite3.connect(path)
        return conn, "sqlite"
    else:
        raise ValueError(f"Unsupported database scheme: {db_url}")


def get_existing_tables(conn, dialect: str) -> List[str]:
    """Returns list of user tables in the database."""
    cur = conn.cursor()
    if dialect == "postgresql":
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        return [r[0] for r in cur.fetchall()]
    else:
        cur.execute("""
            SELECT name 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name;
        """)
        return [r[0] for r in cur.fetchall()]


def check_status(conn, dialect: str):
    """Prints status of tables in the database."""
    existing = get_existing_tables(conn, dialect)
    cur = conn.cursor()

    existing_unused = [t for t in UNUSED_TABLES if t in existing]
    active_tables = [t for t in existing if t not in UNUSED_TABLES]

    print("=" * 60)
    print(f"DATABASE STATUS REPORT ({dialect.upper()})")
    print("=" * 60)
    print(f"Total tables present: {len(existing)}")
    print(f"Active core tables:   {len(active_tables)}")
    print(f"Obsolete tables:      {len(existing_unused)}")
    print("-" * 60)

    if existing_unused:
        print("\n❌ Obsolete / Unused Tables to be Dropped:")
        for t in existing_unused:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{t}";')
                cnt = cur.fetchone()[0]
                print(f"  • {t} ({cnt} rows)")
            except Exception:
                print(f"  • {t}")
    else:
        print("\n✅ No obsolete tables detected in database.")

    print(f"\n✓ Active Production Tables ({len(active_tables)}):")
    for t in active_tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM "{t}";')
            cnt = cur.fetchone()[0]
            print(f"  • {t} ({cnt} rows)")
        except Exception:
            print(f"  • {t}")
    print("=" * 60)


def drop_unused_tables(conn, dialect: str):
    """Drops obsolete tables from the database."""
    existing = get_existing_tables(conn, dialect)
    to_drop = [t for t in UNUSED_TABLES if t in existing]

    if not to_drop:
        print("✅ No obsolete tables found to drop. Database is already clean.")
        return

    print(f"🗑️  Dropping {len(to_drop)} obsolete tables...")
    cur = conn.cursor()
    dropped_count = 0

    for t in to_drop:
        try:
            if dialect == "postgresql":
                cur.execute(f'DROP TABLE IF EXISTS "{t}" CASCADE;')
            else:
                cur.execute(f'DROP TABLE IF EXISTS "{t}";')
            print(f"  ✓ Dropped table: {t}")
            dropped_count += 1
        except Exception as e:
            print(f"  ⚠️ Failed to drop {t}: {e}")

    if dialect == "sqlite":
        conn.commit()

    print(f"\n🎉 Successfully dropped {dropped_count} obsolete tables from production database.")


def truncate_corrections(conn, dialect: str):
    """Truncates dummy attendance corrections."""
    cur = conn.cursor()
    existing = get_existing_tables(conn, dialect)
    if "hrms_attendance_corrections" in existing:
        if dialect == "postgresql":
            cur.execute('TRUNCATE TABLE hrms_attendance_corrections RESTART IDENTITY;')
        else:
            cur.execute('DELETE FROM hrms_attendance_corrections;')
            conn.commit()
        print("✓ Cleaned hrms_attendance_corrections table.")


def main():
    parser = argparse.ArgumentParser(description="Clean up obsolete tables in Production Database")
    parser.add_argument("--db-url", type=str, default=None, help="Target Database connection URL (defaults to DATABASE_URL in .env)")
    parser.add_argument("--status", action="store_true", help="Print table inventory report without modifying anything")
    parser.add_argument("--drop-unused", action="store_true", help="Drop all obsolete CRM, workout, and nutrition tables")
    parser.add_argument("--clean-corrections", action="store_true", help="Truncate hrms_attendance_corrections table")
    parser.add_argument("--all", action="store_true", help="Run full cleanup: drop obsolete tables and clean corrections")

    args = parser.parse_args()

    # Determine DB URL
    db_url = args.db_url
    if not db_url:
        from src.config.settings import settings
        db_url = settings.DATABASE_URL

    # Obfuscate password for logging
    parsed = urllib.parse.urlparse(db_url)
    safe_host = parsed.hostname or "localhost"
    safe_db = parsed.path.lstrip("/")
    print(f"Connecting to: {parsed.scheme}://{parsed.username or ''}@{safe_host}:{parsed.port or ''}/{safe_db}")

    conn, dialect = get_connection(db_url)

    try:
        if args.status or (not args.drop_unused and not args.clean_corrections and not args.all):
            check_status(conn, dialect)
            if not args.status:
                print("\n💡 Tip: Run with `--drop-unused` or `--all` to execute table deletion.")
        else:
            if args.drop_unused or args.all:
                drop_unused_tables(conn, dialect)
            if args.clean_corrections or args.all:
                truncate_corrections(conn, dialect)
            print("\nFinal Database Status:")
            check_status(conn, dialect)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
