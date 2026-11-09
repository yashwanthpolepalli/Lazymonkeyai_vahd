from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.config.settings import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True
    )
else:
    # High-performance PostgreSQL connection pool configuration
    # Prevents QueuePool exhaustion under concurrent dashboard/widget traffic
    connect_args = {
        "options": "-c idle_in_transaction_session_timeout=60000 -c statement_timeout=45000"
    }
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_size=25,
        max_overflow=35,
        pool_timeout=30,
        pool_recycle=1800,
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
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass
