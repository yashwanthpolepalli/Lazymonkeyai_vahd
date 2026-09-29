from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class InBodyReport(Base):
    __tablename__ = "inbody_reports"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    scan_date = Column(DateTime, default=now_ist_naive)
    score = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    skeletal_muscle_mass = Column(Float, nullable=True)
    body_fat_percentage = Column(Float, nullable=True)
    body_fat_mass = Column(Float, nullable=True)
    visceral_fat = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    basal_metabolic_rate = Column(Float, nullable=True)
    body_water = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    segmental_analysis = Column(JSON, default=dict)
    created_at = Column(DateTime, default=now_ist_naive)

    customer = relationship("Customer", back_populates="inbody_reports")
