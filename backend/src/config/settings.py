import os
import urllib.parse
import socket
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

ENV_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(ENV_FILE_PATH)

def is_port_open(host: str, port: int, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def construct_db_url() -> str:
    db_user = os.getenv("DB_USER")
    raw_pass = os.getenv("DB_PASSWORD")
    db_password = urllib.parse.quote_plus(raw_pass) if raw_pass else ""
    db_host = os.getenv("DB_HOST")
    db_port_str = os.getenv("DB_PORT")
    db_name = os.getenv("DB_NAME")
    
    if db_user and db_host and db_port_str and db_name:
        try:
            port_num = int(db_port_str)
            if is_port_open(db_host, port_num):
                return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port_str}/{db_name}"
        except ValueError:
            pass
    
    # Fallback to local SQLite database when configured PostgreSQL server is offline/refused
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "gym.db"))
    return f"sqlite:///{sqlite_path}"

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("GYM_NAME", "FIT CLUB Gym Management Platform")
    GYM_NAME: str = os.getenv("GYM_NAME", "FIT CLUB")
    GYM_PLATFORM_TAGLINE: str = os.getenv("GYM_PLATFORM_TAGLINE", "AI Enterprise Platform")
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fitclub-super-secret-jwt-key-32-chars-minimum-token")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Individual Database Parameters strictly fetched from .env
    DB_USER: Optional[str] = os.getenv("DB_USER")
    DB_PASSWORD: Optional[str] = os.getenv("DB_PASSWORD")
    DB_HOST: Optional[str] = os.getenv("DB_HOST")
    DB_PORT: Optional[str] = os.getenv("DB_PORT")
    DB_NAME: Optional[str] = os.getenv("DB_NAME")

    DATABASE_URL: str = construct_db_url()

    # Dynamic SMTP Configuration strictly fetched from .env
    SMTP_HOST: Optional[str] = os.getenv("MAIL_SERVER", os.getenv("SMTP_HOST"))
    SMTP_PORT: Optional[int] = int(os.getenv("MAIL_PORT", os.getenv("SMTP_PORT", "587"))) if (os.getenv("MAIL_PORT") or os.getenv("SMTP_PORT")) else None
    SMTP_USER: Optional[str] = os.getenv("MAIL_USERNAME", os.getenv("SMTP_USER"))
    SMTP_PASSWORD: Optional[str] = os.getenv("MAIL_PASSWORD", os.getenv("SMTP_PASSWORD"))
    SMTP_FROM_EMAIL: Optional[str] = os.getenv("MAIL_FROM", os.getenv("SMTP_FROM_EMAIL"))

    # ─── eSSL eBioserver Physical Device Integration ──────────────────────
    ESSL_BIOSERVER_URL: Optional[str] = os.getenv("ESSL_BIOSERVER_URL", "")
    ESSL_BIOSERVER_USER: Optional[str] = os.getenv("ESSL_BIOSERVER_USER", "")
    ESSL_BIOSERVER_PASSWORD: Optional[str] = os.getenv("ESSL_BIOSERVER_PASSWORD", "")
    ESSL_BIOSERVER_TIMEOUT: int = int(os.getenv("ESSL_BIOSERVER_TIMEOUT", "8"))

    # ─── MuscleWiki API Key ──────────────────────────────────────────────
    MUSCLEWIKI_API_KEY: str = os.getenv("MUSCLEWIKI_API_KEY", "mw_NAhcwU4l7vVaQYKmBqz-A6Fw1804LA2UwgEaVcM5caQ")

    # ─── Razorpay Payment Gateway ─────────────────────────────────────────
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_RCEmjSWmFaZJbN")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "IGLluMDmPXFRpqDd4MZ7PwBB")
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    class Config:
        case_sensitive = True
        extra = "ignore"
        env_file = ENV_FILE_PATH

settings = Settings()
