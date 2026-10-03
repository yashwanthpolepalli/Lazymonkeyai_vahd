from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CourseCreateRequest(BaseModel):
    name: str
    price: float = 0.0
    duration_days: int = 365
    category: Optional[str] = None
    department: Optional[str] = None
    degree_type: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None
    is_combo: bool = False
    owner_id: Optional[str] = None
    branch_id: Optional[str] = None

class CourseUpdateRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    category: Optional[str] = None
    department: Optional[str] = None
    degree_type: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None
    is_combo: Optional[bool] = None

class CourseResponse(BaseModel):
    id: str
    name: str
    price: float
    duration_days: int
    category: Optional[str] = None
    department: Optional[str] = None
    degree_type: Optional[str] = None
    description: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None
    is_combo: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
