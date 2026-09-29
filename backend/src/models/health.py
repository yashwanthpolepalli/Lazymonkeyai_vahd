from src.utils.timezone import now_ist_naive
"""
FIT CLUB Health Integration — PostgreSQL ORM Models
Stores HealthKit & Health Connect Connections, Daily Summaries, and Health Workouts.
"""
import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base


class HealthConnection(Base):
    """Stores platform health connections (Apple HealthKit, Android Health Connect)."""
    __tablename__ = "health_connections"

    id = Column(String, primary_key=True, index=True, default=lambda: f"hconn_{uuid.uuid4().hex[:10]}")
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    platform = Column(String, nullable=False)                         # APPLE_HEALTHKIT, ANDROID_HEALTH_CONNECT
    connected = Column(Boolean, default=True)
    permissions = Column(JSON, nullable=True)                         # ["steps", "calories", "workouts", "heart_rate"]
    last_sync_at = Column(DateTime, default=now_ist_naive)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    customer = relationship("Customer")


class HealthDailySummary(Base):
    """Canonical Deduplicated Daily Health Summaries."""
    __tablename__ = "health_daily_summaries"

    id = Column(String, primary_key=True, index=True, default=lambda: f"hds_{uuid.uuid4().hex[:10]}")
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    steps = Column(Integer, default=0)
    distance_meters = Column(Float, default=0.0)
    active_calories = Column(Float, default=0.0)
    total_calories = Column(Float, default=0.0)
    exercise_minutes = Column(Integer, default=0)
    workout_count = Column(Integer, default=0)
    avg_heart_rate = Column(Integer, nullable=True)
    resting_heart_rate = Column(Integer, nullable=True)
    readiness_score = Column(Integer, default=85)
    source = Column(String, default="FIT_CLUB_DEDUPLICATED")           # APPLE_HEALTH, HEALTH_CONNECT, FIT_CLUB_DEDUPLICATED
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    customer = relationship("Customer")


class HealthWorkout(Base):
    """Workouts imported from HealthKit or Health Connect."""
    __tablename__ = "health_workouts"

    id = Column(String, primary_key=True, index=True, default=lambda: f"hwo_{uuid.uuid4().hex[:10]}")
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    external_id = Column(String, nullable=True, index=True)
    activity_type = Column(String, nullable=False)                    # Running, Cycling, Strength Training, Swimming
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, default=0)
    distance_meters = Column(Float, default=0.0)
    active_calories = Column(Float, default=0.0)
    avg_heart_rate = Column(Integer, nullable=True)
    source = Column(String, default="APPLE_HEALTHKIT")
    created_at = Column(DateTime, default=now_ist_naive)

    customer = relationship("Customer")


class ReadinessConfig(Base):
    """Configurable & Versioned Readiness Algorithm Parameters."""
    __tablename__ = "readiness_configs"

    id = Column(String, primary_key=True, index=True, default=lambda: f"rcfg_{uuid.uuid4().hex[:10]}")
    name = Column(String, nullable=False, default="FIT CLUB Training Readiness v1")
    version = Column(String, nullable=False, default="v1.0")
    steps_weight = Column(Float, default=35.0)
    sleep_weight = Column(Float, default=35.0)
    heart_rate_weight = Column(Float, default=20.0)
    workout_weight = Column(Float, default=10.0)
    step_target = Column(Integer, default=10000)
    sleep_target_minutes = Column(Integer, default=480)
    resting_hr_optimal_min = Column(Integer, default=50)
    resting_hr_optimal_max = Column(Integer, default=65)
    resting_hr_elevated_threshold = Column(Integer, default=75)
    minimum_score = Column(Integer, default=20)
    maximum_score = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
