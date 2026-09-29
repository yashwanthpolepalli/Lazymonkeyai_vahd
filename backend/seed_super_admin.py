#!/usr/bin/env python3
"""
Seed Super Admin Script for FIT CLUB Gym Management
---------------------------------------------------
Dynamic CLI & environment-driven Super Admin seeder.

Usage:
  python3 backend/seed_super_admin.py --email admin@gym.com --password YourSecretPassword --name "Platform Super Admin"
"""
import argparse
import sys
import os
import getpass
import urllib.parse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config.settings import settings
from src.database.session import engine, SessionLocal
from src.database.base import Base
from src.models.user import User
from src.utils.security import hash_password

def ensure_database_exists():
    try:
        parsed = urllib.parse.urlparse(settings.DATABASE_URL)
        username = parsed.username or "postgres"
        password = urllib.parse.unquote(parsed.password) if parsed.password else ""
        hostname = parsed.hostname or "localhost"
        port = parsed.port or 5432
        target_dbname = parsed.path.lstrip("/") or "gym"

        conn = psycopg2.connect(
            user=username,
            password=password,
            host=hostname,
            port=port,
            dbname="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{target_dbname}';")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute(f"CREATE DATABASE {target_dbname};")
            print(f"Database '{target_dbname}' created successfully!")
        else:
            print(f"Database '{target_dbname}' active.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database check warning: {e}")

def seed_super_admin(email: str, password: str, full_name: str, phone: str = None, avatar_url: str = None, role: str = "SUPER_ADMIN"):
    ensure_database_exists()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        clean_email = email.strip().lower()
        clean_name = full_name.strip()
        clean_password = password.strip()
        hashed_password = hash_password(clean_password)
        clean_phone = phone.strip() if phone else None
        clean_avatar = avatar_url.strip() if avatar_url else None
        clean_role = role.strip().upper()

        existing = db.query(User).filter(User.email == clean_email).first()

        if existing:
            existing.full_name = clean_name or existing.full_name
            existing.password_hash = hashed_password
            existing.role = clean_role
            if clean_phone:
                existing.phone = clean_phone
            if clean_avatar:
                existing.avatar_url = clean_avatar
            existing.is_active = True
            existing.is_platform_admin = True
            existing.is_tenant_owner = True
            user = existing
            print(f"Updated existing user with bcrypt hash to {clean_role}: {clean_email}")
        else:
            user = User(
                id=f"usr_super_{clean_email.split('@')[0]}",
                email=clean_email,
                password_hash=hashed_password,
                role=clean_role,
                full_name=clean_name,
                phone=clean_phone,
                avatar_url=clean_avatar,
                is_active=True,
                is_platform_admin=True,
                is_tenant_owner=True
            )
            db.add(user)
            print(f"Created new {clean_role} user with bcrypt password hash: {clean_email}")

        db.commit()

        print("\n" + "=" * 68)
        print("👑  GOD MODE GYM PLATFORM SUPER ADMIN READY!")
        print("=" * 68)
        print(f"  • Email:           {user.email}")
        print(f"  • Name:            {user.full_name}")
        print(f"  • Bcrypt Hash:     {user.password_hash[:25]}...")
        print(f"  • Role:            {user.role}")
        print(f"  • Platform Admin:  {user.is_platform_admin}")
        print(f"  • Tenant Owner:    {user.is_tenant_owner}")
        print(f"  • Status:          ACTIVE (100% Unrestricted Privileges)")
        print("=" * 68 + "\n")

    except Exception as e:
        print(f"Error seeding Super Admin: {e}")
        db.rollback()
    finally:
        db.close()

def parse_args():
    parser = argparse.ArgumentParser(description="Dynamic Super Admin seeder for FIT CLUB Gym Platform.")
    parser.add_argument("--email", "-e", help="Super Admin login email", default=os.getenv("SUPER_ADMIN_EMAIL"))
    parser.add_argument("--password", "-p", help="Super Admin login password", default=os.getenv("SUPER_ADMIN_PASSWORD"))
    parser.add_argument("--name", "-n", help="Full Name", default=os.getenv("SUPER_ADMIN_NAME"))
    parser.add_argument("--phone", help="Phone Number", default=os.getenv("SUPER_ADMIN_PHONE", None))
    parser.add_argument("--avatar", help="Avatar Image URL", default=os.getenv("SUPER_ADMIN_AVATAR", None))
    parser.add_argument("--role", help="Admin Role", default=os.getenv("SUPER_ADMIN_ROLE", "SUPER_ADMIN"))
    return parser.parse_args()

def main():
    args = parse_args()

    email = args.email
    password = args.password
    name = args.name

    if not email:
        if sys.stdin.isatty():
            email = input("Enter Super Admin Email: ").strip()
        else:
            email = "admin@gym.com"

    if not password:
        if sys.stdin.isatty():
            password = getpass.getpass("Enter Super Admin Password: ").strip()
        else:
            password = "AdminPassword123"

    if not name:
        name = "Platform Super Admin"

    seed_super_admin(
        email=email,
        password=password,
        full_name=name,
        phone=args.phone,
        avatar_url=args.avatar,
        role=args.role
    )

if __name__ == "__main__":
    main()
