"""
FIT CLUB AI — Deterministic Nutrition Calculation Service
Calculates exact meal macronutrients and micronutrients from item portion quantities.
Formula: nutrient_total = (nutrient_per_100g * quantity_g) / 100
"""
from typing import List, Dict, Any


class NutritionCalculationService:
    """Deterministic mathematical calculation engine for food nutrition."""

    @staticmethod
    def calculate_meal_nutrition(food_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate totals for a meal given a list of items with resolved profiles and quantities.
        
        Args:
            food_items: List of dicts containing:
                - name / canonical_name
                - quantity_g (e.g. 180)
                - preparation (e.g. 'Standard', 'Grilled', 'Tadka')
                - nutrient profile per 100g (calories_100g, protein_100g, etc.)
                
        Returns:
            Dict with calculated items, totals, and micronutrients.
        """
        calculated_items = []
        
        totals = {
            "calories": 0.0,
            "protein": 0.0,
            "carbs": 0.0,
            "fat": 0.0,
            "sugar": 0.0,
            "fiber": 0.0,
        }

        micronutrients = {
            "vitamin_a_ug": 0.0,
            "vitamin_b12_ug": 0.0,
            "vitamin_c_mg": 0.0,
            "vitamin_d_ug": 0.0,
            "calcium_mg": 0.0,
            "iron_mg": 0.0,
            "magnesium_mg": 0.0,
            "potassium_mg": 0.0,
        }

        for item in food_items:
            qty = float(item.get("quantity_g", 100.0))
            factor = qty / 100.0

            cal = round(float(item.get("calories_100g", 0.0)) * factor, 1)
            prot = round(float(item.get("protein_100g", 0.0)) * factor, 1)
            carb = round(float(item.get("carbs_100g", 0.0)) * factor, 1)
            fat = round(float(item.get("fat_100g", 0.0)) * factor, 1)
            sug = round(float(item.get("sugar_100g", 0.0)) * factor, 1)
            fib = round(float(item.get("fiber_100g", 0.0)) * factor, 1)

            # Micro totals
            vit_a = float(item.get("vitamin_a_ug", 0.0)) * factor
            vit_b12 = float(item.get("vitamin_b12_ug", 0.0)) * factor
            vit_c = float(item.get("vitamin_c_mg", 0.0)) * factor
            vit_d = float(item.get("vitamin_d_ug", 0.0)) * factor
            calc = float(item.get("calcium_mg", 0.0)) * factor
            fe = float(item.get("iron_mg", 0.0)) * factor
            mg = float(item.get("magnesium_mg", 0.0)) * factor
            k = float(item.get("potassium_mg", 0.0)) * factor

            calculated_items.append({
                "name": item.get("canonical_name", item.get("name", "Food Item")),
                "quantity_g": round(qty, 0),
                "preparation": item.get("preparation", "Standard"),
                "calories": round(cal, 0),
                "protein": prot,
                "carbs": carb,
                "fat": fat,
                "sugar": sug,
                "fiber": fib,
                # Store 100g profile for easy recalculation
                "calories_100g": item.get("calories_100g", 0.0),
                "protein_100g": item.get("protein_100g", 0.0),
                "carbs_100g": item.get("carbs_100g", 0.0),
                "fat_100g": item.get("fat_100g", 0.0),
                "sugar_100g": item.get("sugar_100g", 0.0),
                "fiber_100g": item.get("fiber_100g", 0.0),
                "vitamin_a_ug": item.get("vitamin_a_ug", 0.0),
                "vitamin_b12_ug": item.get("vitamin_b12_ug", 0.0),
                "vitamin_c_mg": item.get("vitamin_c_mg", 0.0),
                "vitamin_d_ug": item.get("vitamin_d_ug", 0.0),
                "calcium_mg": item.get("calcium_mg", 0.0),
                "iron_mg": item.get("iron_mg", 0.0),
                "magnesium_mg": item.get("magnesium_mg", 0.0),
                "potassium_mg": item.get("potassium_mg", 0.0),
            })

            totals["calories"] += cal
            totals["protein"] += prot
            totals["carbs"] += carb
            totals["fat"] += fat
            totals["sugar"] += sug
            totals["fiber"] += fib

            micronutrients["vitamin_a_ug"] += vit_a
            micronutrients["vitamin_b12_ug"] += vit_b12
            micronutrients["vitamin_c_mg"] += vit_c
            micronutrients["vitamin_d_ug"] += vit_d
            micronutrients["calcium_mg"] += calc
            micronutrients["iron_mg"] += fe
            micronutrients["magnesium_mg"] += mg
            micronutrients["potassium_mg"] += k

        return {
            "items": calculated_items,
            "totals": {
                "calories": round(totals["calories"], 0),
                "protein": round(totals["protein"], 1),
                "carbs": round(totals["carbs"], 1),
                "fat": round(totals["fat"], 1),
                "sugar": round(totals["sugar"], 1),
                "fiber": round(totals["fiber"], 1),
            },
            "micronutrients": {
                "vitamin_a_ug": round(micronutrients["vitamin_a_ug"], 1),
                "vitamin_b12_ug": round(micronutrients["vitamin_b12_ug"], 1),
                "vitamin_c_mg": round(micronutrients["vitamin_c_mg"], 1),
                "vitamin_d_ug": round(micronutrients["vitamin_d_ug"], 1),
                "calcium_mg": round(micronutrients["calcium_mg"], 1),
                "iron_mg": round(micronutrients["iron_mg"], 1),
                "magnesium_mg": round(micronutrients["magnesium_mg"], 1),
                "potassium_mg": round(micronutrients["potassium_mg"], 1),
            }
        }
