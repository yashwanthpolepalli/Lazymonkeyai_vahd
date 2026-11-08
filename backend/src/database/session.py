from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.config.settings import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

from src.database.tenant_session import TenantSession

# Sessions are TenantSession instances (Phase 2 tenancy layer). When no
# tenant scope is set (background jobs, platform-admin, unauthenticated
# requests) they behave exactly like a plain Session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=TenantSession)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
