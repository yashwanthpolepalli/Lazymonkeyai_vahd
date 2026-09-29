from typing import Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    model_config = {"extra": "allow"}

    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str
    email: Optional[str] = None
    customer_id: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    gym_id: Optional[str] = None
    gym_name: Optional[str] = None
    branch_name: Optional[str] = None
    city: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "GYM_OWNER"
    phone: Optional[str] = None
    gym_name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
