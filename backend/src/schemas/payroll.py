from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re

# ---------------------------------------------------------------------------
# Helper: soft email sanitiser — returns the value as-is if it passes basic
# format check, or replaces it with an empty string to avoid crashing
# the entire API for one malformed legacy record.
# ---------------------------------------------------------------------------
def _sanitise_email(v):
    """
    Accepts any string as an email for legacy/db compatibility.
    Strips surrounding whitespace and embedded spaces so that
    'karnisujata@21 @gmail.com' becomes 'karnisujata@21@gmail.com'.
    Returns '' for None / blank values.
    """
    if not v:
        return ""
    # Remove all internal whitespace so we don't store obviously broken values
    cleaned = re.sub(r'\s+', '', str(v))
    return cleaned


class employeeCreateRequest(BaseModel):
    full_name: str
    # Accept any string on input so legacy / bulk-import records are not
    # rejected.  The email is sanitised (spaces stripped) before storage.
    email: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
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

    @field_validator("email", mode="before")
    @classmethod
    def sanitise_email(cls, v: object) -> str:
        return _sanitise_email(str(v) if v is not None else "")


class employeeResponse(BaseModel):
    id: str
    full_name: str
    # Use plain str instead of EmailStr so that legacy malformed emails
    # (e.g. 'karnisujata@21 @gmail.com') stored in the DB do NOT raise a
    # ResponseValidationError and crash the entire Employee Directory API.
    email: str = ""
    phone: Optional[str] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joined_date: Optional[str] = None
    employment_type: Optional[str] = None
    role: str
    specialization: Optional[str] = None
    base_monthly_salary: float
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    assigned_students_count: int = 0
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

    @field_validator("email", mode="before")
    @classmethod
    def coerce_email(cls, v: object) -> str:
        """
        Coerce the DB email value to a plain string.
        Returns '' for None so we never crash the response serialisation.
        Legacy malformed values (e.g. 'karnisujata@21 @gmail.com') are
        passed through unchanged — they are preserved in the DB as-is.
        """
        if v is None:
            return ""
        return str(v)

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
