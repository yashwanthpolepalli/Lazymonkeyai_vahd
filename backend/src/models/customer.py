from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    branch_id = Column(String, ForeignKey("branches.id"), nullable=True, index=True)
    member_code = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    gender = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    bmi = Column(Float, nullable=True)
    fitness_score = Column(Integer, nullable=True)
    fitness_level = Column(String, nullable=True)
    training_preference = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    target_calories = Column(Integer, nullable=True)
    target_weight = Column(Float, nullable=True)
    days_per_week = Column(Integer, nullable=True)
    session_duration_minutes = Column(Integer, nullable=True)
    target_protein = Column(Integer, nullable=True)
    target_carbs = Column(Integer, nullable=True)
    target_fat = Column(Integer, nullable=True)
    target_water = Column(Float, nullable=True)
    target_fiber = Column(Integer, nullable=True)
    target_sugar = Column(Integer, nullable=True)
    body_condition = Column(String, nullable=True)
    meals_per_day = Column(Integer, nullable=True)
    dietary_preference = Column(String, nullable=True)
    target_steps = Column(Integer, nullable=True)
    target_sleep_minutes = Column(Integer, nullable=True)
    weight_unit = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    face_registered = Column(Boolean, default=False)
    face_image = Column(String, nullable=True)
    rfid_tag = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    primary_gym_location = Column(String, nullable=True)
    enable_workout_videos = Column(Boolean, default=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="customer_profile")
    memberships = relationship("Membership", back_populates="customer", cascade="all, delete-orphan")
    biometric_logs = relationship("BiometricLog", back_populates="customer", cascade="all, delete-orphan")
