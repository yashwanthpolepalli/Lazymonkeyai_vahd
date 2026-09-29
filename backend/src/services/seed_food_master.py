"""
FIT CLUB AI — PostgreSQL Food Master Table Initializer
Ensures database table schema for NutritionFoodMaster is created in PostgreSQL.
Food data is fetched dynamically from live open food APIs (Open Food Facts / USDA) and cached directly into PostgreSQL.
"""
from src.database.session import SessionLocal, engine
from src.database.base import Base
from src.models.nutrition import NutritionFoodMaster

def init_food_master():
    """Create NutritionFoodMaster table schema if not already present."""
    Base.metadata.create_all(bind=engine)
    print("✅ PostgreSQL nutrition_food_master table schema initialized cleanly. Dynamic API fetching enabled.")

if __name__ == "__main__":
    init_food_master()
