from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class TrainerCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "TRAINER"  # GYM_OWNER, MANAGER, TRAINER, STAFF
    specialization: Optional[str] = None
    base_monthly_salary: float = 0.0
    pt_session_rate: float = 0.0
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    primary_gym_location: Optional[str] = None
    branch: Optional[str] = None
    join_date: Optional[str] = None
    created_at: Optional[str] = None

class TrainerResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    specialization: Optional[str] = None
    base_monthly_salary: float
    pt_session_rate: float
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    assigned_customers_count: int = 0
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PayrollGenerateRequest(BaseModel):
    trainer_id: str
    month_year: Optional[str] = None
    pt_sessions_count: int = 0

class PayrollPayRequest(BaseModel):
    payment_method: str = "UPI"
    transaction_reference: Optional[str] = None

class PayrollInvoiceResponse(BaseModel):
    id: str
    trainer_id: str
    month_year: str
    days_present: int
    days_absent: int
    pt_sessions_count: int
    base_salary_earned: float
    commission_earned: float
    deductions: float
    net_salary: float
    status: str
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
