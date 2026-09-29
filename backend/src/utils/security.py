from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
import datetime
import jwt
import bcrypt
from typing import Optional
from src.config.settings import settings

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password securely using bcrypt with salt.
    """
    if not password:
        return ""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain-text password against a bcrypt hashed password or plain-text stored password.
    Strictly dynamic verification without assumptions.
    """
    if not plain_password or not hashed_password:
        return False

    clean_plain = plain_password.strip()
    clean_hash = hashed_password.strip()

    # Direct plain-text match (for unhashed legacy / direct DB inserted passwords)
    if clean_plain == clean_hash:
        return True

    # Secure bcrypt verification
    try:
        if clean_hash.startswith("$2a$") or clean_hash.startswith("$2b$") or clean_hash.startswith("$2y$"):
            pwd_bytes = clean_plain.encode('utf-8')[:72]
            hash_bytes = clean_hash.encode('utf-8')
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        pass

    return False


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = now_ist_naive() + expires_delta
    else:
        expire = now_ist_naive() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    secret = settings.SECRET_KEY or "fitclub-super-secret-jwt-key-32-chars-minimum-token"
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        secret = settings.SECRET_KEY or "fitclub-super-secret-jwt-key-32-chars-minimum-token"
        payload = jwt.decode(token, secret, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
