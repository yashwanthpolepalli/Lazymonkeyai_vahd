from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

class CustomerBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    fitness_score: Optional[int] = None
    goal: Optional[str] = None
    profile_image: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[str] = None
    branch_id: Optional[str] = None

class CustomerCreate(CustomerBase):
    role: Optional[str] = "CUSTOMER"
    assigned_trainer_name: Optional[str] = None
    membership_plan: Optional[str] = None
    plan_price: Optional[float] = None
    plan_duration_days: Optional[int] = None
    payment_method: Optional[str] = None
    primary_gym_location: Optional[str] = None
    branch: Optional[str] = None
    start_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_face_enrolled: Optional[bool] = None
    paid_amount: Optional[float] = None
    due_amount: Optional[float] = None
    invoice_number: Optional[str] = None
    transaction_id: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    user_id: str
    trainer_id: Optional[str] = None
    owner_id: Optional[str] = None
    branch_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
