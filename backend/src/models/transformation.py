import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class CustomerTransformation(Base):
    __tablename__ = "customer_transformations"

    id = Column(String, primary_key=True, default=lambda: f"tf_{uuid.uuid4().hex[:12]}", index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    
    body_condition = Column(String, nullable=False)  # lean, bulk, recomp, athletic
    before_image_url = Column(String, nullable=True)
    after_image_url = Column(String, nullable=True)
    
    current_weight_kg = Column(Float, nullable=False)
    target_weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    
    estimated_months = Column(Float, nullable=False)
    estimated_weeks = Column(Integer, nullable=False)
    
    bmr_kcal = Column(Float, nullable=False)
    tdee_kcal = Column(Float, nullable=False)
    target_calories = Column(Integer, nullable=False)
    target_protein_g = Column(Float, nullable=False)
    target_carbs_g = Column(Float, nullable=False)
    target_fat_g = Column(Float, nullable=False)
    target_water_l = Column(Float, nullable=False)
    target_fiber_g = Column(Float, nullable=False)
    
    roadmap_phases = Column(JSON, default=list)
    diet_plan = Column(JSON, default=list)
    workout_split = Column(JSON, default=list)
    rationale = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=now_ist_naive)

    customer = relationship("Customer", back_populates="transformations")
