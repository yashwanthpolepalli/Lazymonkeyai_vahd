import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore")

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from src.config.settings import settings
from src.database.session import engine, get_db
from src.database.base import Base
from src.api.v1.router import api_router

from src.database.db_migrate import run_database_migrations
from src.services.exercise_seed_service import seed_master_exercises_and_templates
from src.database.session import SessionLocal

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FIT CLUB Gym Management Enterprise Platform Backend API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
def on_startup():
    """Run database migrations and master exercise seeding asynchronously on server startup."""
    try:
        Base.metadata.create_all(bind=engine)
        run_database_migrations()
    except Exception as e:
        print(f"⚠️ [Startup Warning] Database migration alert: {e}")

    try:
        with SessionLocal() as seed_db:
            seed_master_exercises_and_templates(seed_db)
    except Exception as se:
        print(f"⚠️ [Seed Warning] Exercise seeding skipped: {se}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

# Mount static uploads and images directories for brochures, posters & media assets
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "images"))
os.makedirs(images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Register v1 api_router under /api/v1 and /api for compatibility
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": str(e)}

@app.get("/", tags=["System"])
def root():
    return {
        "title": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/health",
        "api_v1_prefix": "/api/v1"
    }
