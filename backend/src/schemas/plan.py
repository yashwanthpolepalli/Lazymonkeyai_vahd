from typing import Optional
from pydantic import BaseModel

class PlanCreateRequest(BaseModel):
    name: str
    price: float
    duration_days: int
    description: Optional[str] = None
    badge: Optional[str] = None

class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    description: Optional[str] = None
    badge: Optional[str] = None
