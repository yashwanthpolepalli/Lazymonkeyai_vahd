from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.services.pos_service import PosService

router = APIRouter(prefix="/pos", tags=["Point of Sale (POS)"])


@router.get("/products", response_model=List[Dict[str, Any]])
def get_pos_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all POS-ready products, memberships, and packages."""
    return PosService.get_pos_products(db=db, search=search, category=category)


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
@router.post("/checkout", status_code=status.HTTP_201_CREATED)
@router.post("/transactions/checkout", status_code=status.HTTP_201_CREATED)
def checkout(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Process a quick POS sale checkout and deduct inventory stock."""
    try:
        return PosService.process_checkout(db=db, payload=payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transactions", response_model=List[Dict[str, Any]])
@router.get("/recent-sales", response_model=List[Dict[str, Any]])
@router.get("/transactions/history", response_model=List[Dict[str, Any]])
def get_recent_transactions(
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """List recent POS transactions and receipt records."""
    return PosService.get_recent_transactions(db=db, limit=limit)


@router.get("/daily-summary")
@router.get("/transactions/reports/daily-summary")
def get_daily_summary(db: Session = Depends(get_db)):
    """Get today's POS sales summary, transaction count, and payment method breakdown."""
    return PosService.get_daily_summary(db=db)


@router.get("/sessions/current")
def get_current_session(db: Session = Depends(get_db)):
    """Get or auto-open current POS session."""
    return {
        "id": "session_default",
        "status": "OPEN",
        "opening_cash": 0.0,
        "cashier": "Admin / Store Manager"
    }
