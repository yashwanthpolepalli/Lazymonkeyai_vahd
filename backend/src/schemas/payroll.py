from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class employeeCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "EMPLOYEE"  # OWNER, MANAGER, EMPLOYEE, STAFF
    specialization: Optional[str] = None
    base_monthly_salary: float = 0.0
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    primary_vahd_location: Optional[str] = None
    branch: Optional[str] = None
    branch_id: Optional[str] = None
    owner_id: Optional[str] = None
    ho_id: Optional[str] = None
    join_date: Optional[str] = None
    created_at: Optional[str] = None

class employeeResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    specialization: Optional[str] = None
    base_monthly_salary: float
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    assigned_customers_count: int = 0
    is_active: bool
    created_at: datetime
    today_status: Optional[str] = "Absent"
    punch_in: Optional[str] = None
    punch_out: Optional[str] = None
    in_time: Optional[str] = None
    out_time: Optional[str] = None
    is_present: Optional[bool] = False
    is_early_logout: Optional[bool] = False
    today_punch: Optional[dict] = None
    branch_id: Optional[str] = None
    vahd_branch: Optional[str] = None
    primary_vahd_location: Optional[str] = None
    employee_code: Optional[str] = None
    owner_id: Optional[str] = None
    ho_id: Optional[str] = None

    class Config:
        from_attributes = True

class PayrollGenerateRequest(BaseModel):
    employee_id: str
    month_year: Optional[str] = None

class PayrollPayRequest(BaseModel):
    payment_method: str = "UPI"
    transaction_reference: Optional[str] = None

class PayrollInvoiceResponse(BaseModel):
    id: str
    employee_id: str
    month_year: str
    days_present: int
    days_absent: int
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
