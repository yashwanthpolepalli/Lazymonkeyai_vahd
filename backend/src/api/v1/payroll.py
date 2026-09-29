from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from src.database.session import get_db
from src.services.payroll_service import PayrollService
from src.schemas.payroll import (
    PayrollGenerateRequest,
    PayrollPayRequest,
    PayrollInvoiceResponse
)

router = APIRouter(prefix="/payroll", tags=["Payroll & Trainer Invoices"])

@router.get("/invoices", response_model=List[PayrollInvoiceResponse])
def get_all_payroll_invoices(db: Session = Depends(get_db)):
    """
    Returns all monthly staff & trainer payroll invoices from PostgreSQL.
    """
    return PayrollService.get_all_invoices(db)

@router.post("/generate", response_model=PayrollInvoiceResponse)
def generate_payroll_invoice(payload: PayrollGenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a monthly salary invoice based on eSSL biometric attendance & personal training commissions.
    """
    try:
        return PayrollService.generate_monthly_payroll(
            db=db,
            trainer_id=payload.trainer_id,
            month_year=payload.month_year,
            pt_sessions_count=payload.pt_sessions_count
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{payroll_id}/pay", response_model=PayrollInvoiceResponse)
def process_salary_payment(payroll_id: str, payload: PayrollPayRequest, db: Session = Depends(get_db)):
    """
    Processes salary payout to trainer/staff via UPI, Bank Transfer, or Cash and issues digital payslip.
    """
    try:
        return PayrollService.process_salary_payment(
            db=db,
            payroll_id=payroll_id,
            payment_method=payload.payment_method,
            transaction_reference=payload.transaction_reference
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
