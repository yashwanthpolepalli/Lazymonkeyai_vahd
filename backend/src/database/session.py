from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from src.config.settings import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    connect_args = {"check_same_thread": False, "timeout": 15}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_pre_ping=True
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.execute("PRAGMA busy_timeout=10000;")
            cursor.execute("PRAGMA cache_size=-64000;")  # 64MB memory cache
            cursor.execute("PRAGMA mmap_size=268435456;") # 256MB memory mapped I/O
            cursor.execute("PRAGMA temp_store=MEMORY;")
        finally:
            cursor.close()
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
