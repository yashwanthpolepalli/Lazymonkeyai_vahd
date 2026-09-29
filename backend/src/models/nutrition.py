from src.utils.timezone import now_ist_naive
import datetime
import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    date = Column(DateTime, default=now_ist_naive)
    meal_type = Column(String, default="Meal")  # Breakfast, Lunch, Dinner, Snack
    meal_name = Column(String, nullable=False)
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)
    fiber = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)
    water = Column(Float, default=0.0)
    micronutrients = Column(JSON, default=dict)  # Vitamins & Minerals
    confidence = Column(Float, default=0.85)
    notes = Column(String)

    customer = relationship("Customer", back_populates="nutrition_logs")
    items = relationship("NutritionFoodLogItem", back_populates="log", cascade="all, delete-orphan")


class NutritionFoodLogItem(Base):
    __tablename__ = "nutrition_log_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    log_id = Column(String, ForeignKey("nutrition_logs.id"), index=True, nullable=False)
    food_name = Column(String, nullable=False)
    quantity_g = Column(Float, default=100.0)
    preparation = Column(String, default="Standard")
    calories = Column(Float, default=0.0)
    protein = Column(Float, default=0.0)
    carbs = Column(Float, default=0.0)
    fats = Column(Float, default=0.0)
    fiber = Column(Float, default=0.0)
    sugar = Column(Float, default=0.0)

    log = relationship("NutritionLog", back_populates="items")


class NutritionFoodMaster(Base):
    __tablename__ = "nutrition_food_master"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    canonical_name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, default="General")
    # Nutrient reference values per 100g
    calories_100g = Column(Float, default=0.0)
    protein_100g = Column(Float, default=0.0)
    carbs_100g = Column(Float, default=0.0)
    fat_100g = Column(Float, default=0.0)
    fiber_100g = Column(Float, default=0.0)
    sugar_100g = Column(Float, default=0.0)
    # Micronutrients per 100g
    vitamin_a_ug = Column(Float, default=0.0)
    vitamin_b12_ug = Column(Float, default=0.0)
    vitamin_c_mg = Column(Float, default=0.0)
    vitamin_d_ug = Column(Float, default=0.0)
    calcium_mg = Column(Float, default=0.0)
    iron_mg = Column(Float, default=0.0)
    magnesium_mg = Column(Float, default=0.0)
    potassium_mg = Column(Float, default=0.0)
    source = Column(String, default="FIT_CLUB_MASTER")
