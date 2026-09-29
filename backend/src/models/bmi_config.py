"""
BmiClassificationConfig — stores WHO/clinical BMI and body-fat classification thresholds.
All values are explicitly required — no default values on any column.
"""
from sqlalchemy import Column, String, Float, Boolean, DateTime
from src.database.base import Base
from src.utils.timezone import now_ist_naive


class BmiClassificationConfig(Base):
    __tablename__ = "bmi_classification_config"

    id = Column(String, primary_key=True)
    version = Column(String, nullable=False)

    # BMI Thresholds — no defaults; must be set explicitly from DB or seed
    bmi_underweight_max = Column(Float, nullable=False)
    bmi_normal_max = Column(Float, nullable=False)
    bmi_overweight_max = Column(Float, nullable=False)

    # Body-fat Thresholds — gender-specific, no defaults
    body_fat_athletic_max_male = Column(Float, nullable=False)
    body_fat_athletic_max_female = Column(Float, nullable=False)
    body_fat_athletic_max_other = Column(Float, nullable=False)

    is_active = Column(Boolean, nullable=False)
    updated_at = Column(DateTime, onupdate=now_ist_naive)
