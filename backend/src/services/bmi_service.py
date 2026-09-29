from typing import Dict, Any

class BMIService:
    """
    FIT CLUB Standardized BMI & Body Composition Metrics Engine.
    Calculates BMI, classification, ideal weight, fat control, and muscle control dynamically.
    """
    @staticmethod
    def calculate_bmi(weight_kg: float, height_cm: float) -> float:
        if not weight_kg or not height_cm or height_cm <= 0:
            return 0.0
        height_m = height_cm / 100.0
        return round(weight_kg / (height_m * height_m), 1)

    @staticmethod
    def classify_bmi(bmi: float) -> Dict[str, str]:
        if bmi <= 0:
            return {"category": "Unmeasured", "color": "slate", "badge": "N/A"}
        elif bmi < 18.5:
            return {"category": "Underweight", "color": "blue", "badge": "Underweight"}
        elif 18.5 <= bmi <= 24.9:
            return {"category": "Normal", "color": "emerald", "badge": "Normal"}
        elif 25.0 <= bmi <= 29.9:
            return {"category": "Overweight", "color": "amber", "badge": "Overweight"}
        elif 30.0 <= bmi <= 34.9:
            return {"category": "Obese Class I", "color": "rose", "badge": "Obese Class I"}
        elif 35.0 <= bmi <= 39.9:
            return {"category": "Obese Class II", "color": "rose", "badge": "Obese Class II"}
        else:
            return {"category": "Obese Class III", "color": "rose", "badge": "Obese Class III"}

    @staticmethod
    def compute_body_targets(weight_kg: float, height_cm: float, body_fat_pct: float, gender: str = "Male", age: int = 28) -> Dict[str, Any]:
        """
        Computes ideal weight, target fat control (kg), muscle control (kg),
        metabolic age, and daily calorie needs dynamically.
        """
        if not weight_kg or not height_cm or height_cm <= 0:
            return {
                "ideal_weight_kg": 0.0,
                "fat_control_kg": 0.0,
                "muscle_control_kg": 0.0,
                "metabolic_age_yrs": 0,
                "daily_calorie_needs": 0
            }

        height_m = height_cm / 100.0
        bmi = round(weight_kg / (height_m * height_m), 1)
        ideal_weight = round(22.0 * (height_m * height_m), 1)

        # Dynamic fat reduction & muscle control calculation
        target_fat_pct = 15.0 if gender.lower() == 'male' else 22.0
        current_fat_kg = weight_kg * (body_fat_pct / 100.0)
        target_fat_kg = ideal_weight * (target_fat_pct / 100.0)
        fat_control = round(target_fat_kg - current_fat_kg, 1)

        # Muscle control target
        ideal_muscle_kg = ideal_weight * (0.45 if gender.lower() == 'male' else 0.38)
        current_muscle_kg = weight_kg * (0.44 if gender.lower() == 'male' else 0.36)
        muscle_control = round(max(0.0, ideal_muscle_kg - current_muscle_kg), 1)

        # Dynamic Metabolic Age
        metabolic_age = max(18, int(round(age + (bmi - 22.0) * 1.2)))

        # Dynamic Daily Calorie Needs (BMR * Activity Factor 1.45)
        if gender.lower() == 'male':
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
        else:
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
        daily_calories = int(round(bmr * 1.45))

        return {
            "ideal_weight_kg": ideal_weight,
            "fat_control_kg": fat_control,
            "muscle_control_kg": muscle_control,
            "metabolic_age_yrs": metabolic_age,
            "daily_calorie_needs": daily_calories
        }
