"""
FIT CLUB AI — Dynamic Database & Open API Food Resolution Service
Resolves raw vision detected food names into canonical food items with accurate 100g nutrient profiles.
1. Searches PostgreSQL `nutrition_food_master` table for cached records.
2. If not found in DB, fetches live from Open Food Facts API / USDA API (no hardcoding needed!).
3. Automatically caches fetched profiles in PostgreSQL `nutrition_food_master` for future queries.
"""
import os
import json
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from src.models.nutrition import NutritionFoodMaster
from src.database.session import SessionLocal

USDA_API_KEY = os.getenv("USDA_API_KEY", "")
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"


class FoodResolutionService:
    """Resolves raw detected food names via PostgreSQL DB and live Open Food APIs."""

    @staticmethod
    def resolve_food_item(detected_name: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Resolve detected food name dynamically:
        1. Check PostgreSQL `nutrition_food_master` table.
        2. Fetch live from Open Food Facts / USDA API.
        3. Persist fetched profile to PostgreSQL and return canonical 100g nutrients.
        """
        cleaned_name = detected_name.strip()
        close_db = False
        if db is None:
            db = SessionLocal()
            close_db = True

        try:
            # 1. Search PostgreSQL Database
            db_food = db.query(NutritionFoodMaster).filter(
                NutritionFoodMaster.canonical_name.ilike(f"%{cleaned_name}%")
            ).first()

            if db_food:
                return FoodResolutionService._food_model_to_dict(db_food)

            # 2. Query Live Open Food Facts API (Free public endpoint)
            off_result = FoodResolutionService._fetch_from_open_food_facts(cleaned_name)
            if off_result:
                return FoodResolutionService._save_and_return_food(db, off_result, "OPEN_FOOD_FACTS")

            # 3. Query Live USDA API if key present
            if USDA_API_KEY:
                usda_result = FoodResolutionService._fetch_from_usda_api(cleaned_name)
                if usda_result:
                    return FoodResolutionService._save_and_return_food(db, usda_result, "USDA_API")

            # 4. Return clean zero structure if open APIs return empty (No fake numbers hardcoded)
            return {
                "canonical_name": cleaned_name.title(),
                "calories_100g": 0.0,
                "protein_100g": 0.0,
                "carbs_100g": 0.0,
                "fat_100g": 0.0,
                "fiber_100g": 0.0,
                "sugar_100g": 0.0,
                "vitamin_a_ug": 0.0,
                "vitamin_b12_ug": 0.0,
                "vitamin_c_mg": 0.0,
                "vitamin_d_ug": 0.0,
                "calcium_mg": 0.0,
                "iron_mg": 0.0,
                "magnesium_mg": 0.0,
                "potassium_mg": 0.0,
            }

        finally:
            if close_db:
                db.close()

    @staticmethod
    def _save_and_return_food(db: Session, data: Dict[str, Any], source: str) -> Dict[str, Any]:
        """Save API response into PostgreSQL nutrition_food_master table for caching."""
        try:
            new_food = NutritionFoodMaster(
                canonical_name=data["canonical_name"],
                category="API_Import",
                calories_100g=data["calories_100g"],
                protein_100g=data["protein_100g"],
                carbs_100g=data["carbs_100g"],
                fat_100g=data["fat_100g"],
                fiber_100g=data["fiber_100g"],
                sugar_100g=data["sugar_100g"],
                vitamin_a_ug=data["vitamin_a_ug"],
                vitamin_b12_ug=data["vitamin_b12_ug"],
                vitamin_c_mg=data["vitamin_c_mg"],
                vitamin_d_ug=data["vitamin_d_ug"],
                calcium_mg=data["calcium_mg"],
                iron_mg=data["iron_mg"],
                magnesium_mg=data["magnesium_mg"],
                potassium_mg=data["potassium_mg"],
                source=source,
            )
            db.add(new_food)
            db.commit()
            db.refresh(new_food)
            return FoodResolutionService._food_model_to_dict(new_food)
        except Exception:
            db.rollback()
            return data

    @staticmethod
    def _fetch_from_open_food_facts(query: str) -> Optional[Dict[str, Any]]:
        """Fetch live product/food nutrient profile per 100g from Open Food Facts API."""
        try:
            params = {
                "search_terms": query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": 1,
            }
            headers = {"User-Agent": "FITCLUB_AI/1.0"}
            response = httpx.get(OFF_SEARCH_URL, params=params, headers=headers, timeout=5.0)

            if response.status_code == 200:
                res_data = response.json()
                products = res_data.get("products", [])
                if products:
                    product = products[0]
                    name = product.get("product_name", query).title()
                    nutriments = product.get("nutriments", {})

                    return {
                        "canonical_name": name,
                        "calories_100g": float(nutriments.get("energy-kcal_100g", nutriments.get("energy_100g", 0.0))),
                        "protein_100g": float(nutriments.get("proteins_100g", 0.0)),
                        "carbs_100g": float(nutriments.get("carbohydrates_100g", 0.0)),
                        "fat_100g": float(nutriments.get("fat_100g", 0.0)),
                        "fiber_100g": float(nutriments.get("fiber_100g", 0.0)),
                        "sugar_100g": float(nutriments.get("sugars_100g", 0.0)),
                        "vitamin_a_ug": float(nutriments.get("vitamin-a_100g", 0.0)),
                        "vitamin_b12_ug": float(nutriments.get("vitamin-b12_100g", 0.0)),
                        "vitamin_c_mg": float(nutriments.get("vitamin-c_100g", 0.0)),
                        "vitamin_d_ug": float(nutriments.get("vitamin-d_100g", 0.0)),
                        "calcium_mg": float(nutriments.get("calcium_100g", 0.0)),
                        "iron_mg": float(nutriments.get("iron_100g", 0.0)),
                        "magnesium_mg": float(nutriments.get("magnesium_100g", 0.0)),
                        "potassium_mg": float(nutriments.get("potassium_100g", 0.0)),
                    }
        except Exception as e:
            print(f"[FoodResolution] Open Food Facts Error: {e}")
        return None

    @staticmethod
    def _fetch_from_usda_api(query: str) -> Optional[Dict[str, Any]]:
        """Fetch real-time nutrient profile per 100g from USDA FoodData Central API."""
        try:
            params = {
                "api_key": USDA_API_KEY,
                "query": query,
                "pageSize": 1,
                "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
            }
            response = httpx.get(USDA_SEARCH_URL, params=params, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                foods = data.get("foods", [])
                if foods:
                    top_food = foods[0]
                    name = top_food.get("description", query).title()
                    nutrients = top_food.get("foodNutrients", [])

                    nut_map = {}
                    for n in nutrients:
                        n_name = n.get("nutrientName", "").lower()
                        val = float(n.get("value", 0.0))
                        nut_map[n_name] = val

                    return {
                        "canonical_name": name,
                        "calories_100g": nut_map.get("energy", nut_map.get("energy (kcal)", 0.0)),
                        "protein_100g": nut_map.get("protein", 0.0),
                        "carbs_100g": nut_map.get("carbohydrate, by difference", 0.0),
                        "fat_100g": nut_map.get("total lipid (fat)", 0.0),
                        "fiber_100g": nut_map.get("fiber, total dietary", 0.0),
                        "sugar_100g": nut_map.get("sugars, total including nlea", 0.0),
                        "vitamin_a_ug": nut_map.get("vitamin a, RAE", 0.0),
                        "vitamin_b12_ug": nut_map.get("vitamin b-12", 0.0),
                        "vitamin_c_mg": nut_map.get("vitamin c, total ascorbic acid", 0.0),
                        "vitamin_d_ug": nut_map.get("vitamin d (d2 + d3)", 0.0),
                        "calcium_mg": nut_map.get("calcium, ca", 0.0),
                        "iron_mg": nut_map.get("iron, fe", 0.0),
                        "magnesium_mg": nut_map.get("magnesium, mg", 0.0),
                        "potassium_mg": nut_map.get("potassium, k", 0.0),
                    }
        except Exception as e:
            print(f"[FoodResolution] USDA API Error: {e}")
        return None

    @staticmethod
    def _food_model_to_dict(food: NutritionFoodMaster) -> Dict[str, Any]:
        """Convert SQLAlchemy NutritionFoodMaster object to dictionary."""
        return {
            "canonical_name": food.canonical_name,
            "calories_100g": food.calories_100g,
            "protein_100g": food.protein_100g,
            "carbs_100g": food.carbs_100g,
            "fat_100g": food.fat_100g,
            "fiber_100g": food.fiber_100g,
            "sugar_100g": food.sugar_100g,
            "vitamin_a_ug": food.vitamin_a_ug,
            "vitamin_b12_ug": food.vitamin_b12_ug,
            "vitamin_c_mg": food.vitamin_c_mg,
            "vitamin_d_ug": food.vitamin_d_ug,
            "calcium_mg": food.calcium_mg,
            "iron_mg": food.iron_mg,
            "magnesium_mg": food.magnesium_mg,
            "potassium_mg": food.potassium_mg,
        }
