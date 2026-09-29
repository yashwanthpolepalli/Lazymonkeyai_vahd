from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.dashboard_service import DashboardService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
@router.get("/customer/{customer_id}")
def get_customer_dashboard(customer_id: str = "active", db: Session = Depends(get_db)):
    return DashboardService.get_aggregated_dashboard(db, customer_id if customer_id != "active" else None)

@router.get("/owner")
def get_owner_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    branch_id: Optional[str] = Query(None)
):
    return DashboardService.get_owner_dashboard(db, branch_id=branch_id, current_user=current_user)

@router.get("/trainer")
def get_trainer_dashboard(db: Session = Depends(get_db)):
    return DashboardService.get_trainer_dashboard(db)

@router.get("/revenue")
def get_revenue_data(db: Session = Depends(get_db)):
    return DashboardService.get_revenue_analytics(db)

@router.get("/owner-kpis")
def get_owner_kpis(db: Session = Depends(get_db)):
    return DashboardService.get_owner_kpis(db)

@router.get("/super-admin-kpis")
def get_super_admin_kpis(db: Session = Depends(get_db)):
    return DashboardService.get_super_admin_kpis(db)

@router.get("/trainer-kpis")
def get_trainer_kpis(db: Session = Depends(get_db)):
    return DashboardService.get_trainer_kpis(db)

@router.get("/customer-kpis")
def get_customer_kpis(db: Session = Depends(get_db)):
    return DashboardService.get_customer_kpis(db)

@router.get("/activity")
def get_activity(db: Session = Depends(get_db)):
    return DashboardService.get_activity(db)

@router.get("/attention")
def get_attention(db: Session = Depends(get_db)):
    return DashboardService.get_attention(db)

@router.get("/radar")
def get_customer_radar(db: Session = Depends(get_db)):
    return DashboardService.get_customer_radar(db)

@router.get("/reports-analytics")
def get_reports_analytics(db: Session = Depends(get_db)):
    return DashboardService.get_reports_analytics(db)
