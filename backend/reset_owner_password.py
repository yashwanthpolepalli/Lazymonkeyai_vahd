"""
FIT CLUB — Reset Owner Password Utility
Run: python3 reset_owner_password.py <email> <new_password>
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.database.session import SessionLocal
from src.models.user import User
from src.utils.security import hash_password, verify_password

def reset_password(email: str, new_password: str):
    db = SessionLocal()
    try:
        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            print(f"❌ No user found with email: {email}")
            return
        print(f"✅ Found user: {user.full_name} | Role: {user.role} | Email: {user.email}")
        user.password_hash = hash_password(new_password)
        db.commit()
        db.refresh(user)
        ok = verify_password(new_password, user.password_hash)
        print(f"✅ Password reset {'successful' if ok else 'FAILED'}. Verified: {ok}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 reset_owner_password.py <email> <new_password>")
        sys.exit(1)
    reset_password(sys.argv[1], sys.argv[2])
