"""
FIT CLUB Health Integration API Endpoints
Endpoints for HealthKit / Health Connect connection, daily health sync, and readiness scores.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.health_service import HealthService

router = APIRouter(prefix="/health", tags=["Health Integration"])


@router.get("/connections")
def list_health_connections(customer_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Returns dynamic wearable connections (Apple Health, Google Health Connect, Fitbit, Garmin)."""
    return HealthService.get_all_connections(db, customer_id=customer_id)


@router.post("/toggle-connection")
def toggle_health_connection(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Connects or disconnects a platform connection dynamically in DB."""
    platform = payload.get("platform")
    connected = payload.get("connected")
    customer_id = payload.get("customer_id")
    if not platform:
        raise HTTPException(status_code=400, detail="platform is required.")
    return HealthService.toggle_platform_connection(db, platform=platform, connected=connected, customer_id=customer_id)


@router.get("/summary")
def get_daily_summary(customer_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Returns live daily summary metrics (Steps, Active Calories, Sleep, Distance, Heart Rate)."""
    return HealthService.get_aggregated_today_summary(db, customer_id=customer_id)


@router.get("/readiness")
def get_readiness_score(customer_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Returns dynamic 4-signal readiness score and signal checklist."""
    return HealthService.get_readiness_detail(db, customer_id=customer_id)


@router.post("/simulate-sync")
def simulate_sync(payload: dict = Body(default={}), db: Session = Depends(get_db)):
    """Simulates real-time wearable data sync and recalculates readiness dynamically."""
    customer_id = payload.get("customer_id")
    return HealthService.simulate_live_sync(db, customer_id=customer_id)


@router.post("/connect")
def connect_platform(payload: dict, db: Session = Depends(get_db)):
    """Connects or updates customer platform health connection (Apple HealthKit / Health Connect)."""
    customer_id = payload.get("customer_id")
    platform = payload.get("platform") or "APPLE_HEALTHKIT"
    permissions = payload.get("permissions")

    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    return HealthService.connect_platform(db, customer_id=customer_id, platform=platform, permissions=permissions)


@router.get("/connection-status")
def get_connection_status(customer_id: str = Query(...), db: Session = Depends(get_db)):
    """Fetches customer's active platform health connection status (query-param form)."""
    return HealthService.get_connection_status(db, customer_id=customer_id)


@router.get("/status/{customer_id}")
def get_connection_status_by_path(customer_id: str, db: Session = Depends(get_db)):
    """Fetches customer's active platform health connection status (path-param alias)."""
    return HealthService.get_connection_status(db, customer_id=customer_id)


@router.post("/sync")
def sync_health_data(payload: dict, db: Session = Depends(get_db)):
    """Receives normalized health metrics from iOS/Android and runs active burn deduplication engine."""
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    return HealthService.sync_health_data(db, customer_id=customer_id, payload=payload)


@router.get("/today-summary")
def get_today_health_summary(customer_id: str = Query(...), db: Session = Depends(get_db)):
    """Returns canonical deduplicated daily health summary and AI readiness score for customer dashboard."""
    return HealthService.get_today_health_summary(db, customer_id=customer_id)

