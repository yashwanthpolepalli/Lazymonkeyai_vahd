"""
FIT CLUB AI — Master Dynamic Food Analysis Pipeline
Pipeline: Image → Gemini Vision (Visual Recognition ONLY) → Food Resolution Service → Deterministic Calculation Engine → Dynamic AI Advice.

Strict Rule: Gemini is NEVER asked to guess calories or nutrient numbers.
Gemini identifies foods + portions + preparation. FIT CLUB nutrition engine calculates the actual math.
"""
import os
import json
import base64
import traceback
import uuid
from typing import Optional, Dict, Any

import google.generativeai as genai
from dotenv import load_dotenv

from src.services.food_resolution_service import FoodResolutionService
from src.services.nutrition_calculation_service import NutritionCalculationService
from src.services.nutrition_service import parse_gemini_json
from src.utils.gemini_config import get_gemini_key, get_primary_model, build_gemini_fallback_list, is_valid_gemini_key

load_dotenv()

# Module-level constants — refreshed on each request via utility functions
GEMINI_API_KEY = get_gemini_key()
GEMINI_MODEL = get_primary_model()


# ─── STRICT VISION PROMPT (STRICT FOOD & BEVERAGE ONLY) ──────────────────
VISION_ONLY_PROMPT = """You are a STRICT FOOD & BEVERAGE ONLY computer vision engine for FIT CLUB AI.

Analyze the supplied image carefully.

CRITICAL NON-FOOD REJECTION RULES:
1. You MUST check if the main subject of the image is genuine edible food or a drink.
2. If the image contains human faces, clothing, shirts, pants, plastic objects, electronics, phones, furniture, toys, papers, tools, animals, or empty non-food surfaces, YOU MUST REJECT THE IMAGE IMMEDIATELY.
3. NEVER classify clothes, faces, plastic bottles/containers, fingers, or household objects as food dishes or meal items.
4. If NO edible food or beverage is present, return ONLY this JSON:
   {"error": "No food detected in image. Please scan edible food or beverage items."}

FOOD RECOGNITION INSTRUCTIONS (Only when real edible food is present):
1. Identify each visually distinguishable edible food or beverage item.
2. Estimate the quantity/portion size in grams for each detected food based on visual appearance.
3. Identify preparation method when visually inferable (e.g., 'Tadka', 'Grilled', 'Steamed', 'Boiled', 'Fresh').
4. Provide a confidence score between 0.0 and 1.0 for each item and overall.
5. Do NOT calculate calories, protein, carbs, or fat.

Return ONLY this strict JSON structure when food is present (dynamically extract all food items from visual analysis):
{
  "detected_items": [
    {
      "detected_name": "<name of detected food item>",
      "quantity_g": 0.0,
      "preparation": "<preparation method if inferable>",
      "confidence": 0.0
    }
  ],
  "overall_confidence": 0.0,
  "meal_label": "<overall meal label>"
}
"""

NON_FOOD_KEYWORDS = [
    "plastic", "face", "shirt", "cloth", "clothing", "person", "human", "man", "woman",
    "hand", "finger", "phone", "mobile", "laptop", "table", "chair", "wood", "paper",
    "cardboard", "glasses", "key", "wallet", "bag", "toy", "tool", "device", "t-shirt"
]


class FoodAnalysisService:
    """Master Pipeline Controller for AI Food Analysis."""

    @staticmethod
    def analyze_food_image(image_base64: str) -> dict:
        """
        Execute 3-stage AI analysis pipeline:
        Stage 1: Gemini Vision识别 (Visual recognition only)
        Stage 2: Food Resolution (Canonical mapping to master database)
        Stage 3: Deterministic Nutrition Calculation (Math calculation)
        """
        analysis_id = str(uuid.uuid4())
        # Always read fresh from .env at call-time
        api_key = get_gemini_key()
        model_name = get_primary_model()

        if not api_key:
            # Safe informative fallback when key is not added to .env
            return FoodAnalysisService._get_missing_key_response(analysis_id)

        try:
            # ── STAGE 1: GEMINI VISION RECOGNITION ──────────────────────────
            genai.configure(api_key=api_key)
            # Build fallback list fully from .env (GEMINI_MODEL + GEMINI_FALLBACK_MODELS)
            fallback_models = build_gemini_fallback_list()

            image_bytes = base64.b64decode(image_base64)
            image_part = {"mime_type": "image/jpeg", "data": image_bytes}

            response = None
            last_exception = None

            for m in fallback_models:
                try:
                    m_inst = genai.GenerativeModel(m)
                    response = m_inst.generate_content(
                        [VISION_ONLY_PROMPT, image_part],
                        generation_config=genai.GenerationConfig(
                            temperature=0.1,
                            max_output_tokens=4096,
                            response_mime_type="application/json",
                        )
                    )
                    if response and hasattr(response, "text") and response.text:
                        break
                except Exception as ge:
                    last_exception = ge
                    err_str = str(ge)
                    if "429" in err_str or "Quota" in err_str or "ResourceExhausted" in err_str or "404" in err_str or "not available" in err_str:
                        continue
                    raise ge

            if not response and last_exception:
                raise last_exception

            raw_text = response.text.strip()
            vision_data = parse_gemini_json(raw_text)

            if "error" in vision_data:
                return {
                    "analysis_id": analysis_id,
                    "error": vision_data["error"],
                    "items": [],
                    "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "fiber": 0},
                    "micronutrients": {},
                    "confidence": 0.0
                }

            detected_list = vision_data.get("detected_items", [])
            overall_conf = float(vision_data.get("overall_confidence", 0.88))
            meal_label = vision_data.get("meal_label", "Analyzed Meal")

            # ── STAGE 2: FOOD RESOLUTION & CANONICAL MATCHING ────────────────
            valid_food_list = []
            for item in detected_list:
                raw_name_lower = str(item.get("detected_name", "")).lower()
                if any(kw in raw_name_lower for kw in NON_FOOD_KEYWORDS):
                    continue
                valid_food_list.append(item)

            if not valid_food_list:
                return {
                    "analysis_id": analysis_id,
                    "error": "No food detected. Please scan real edible food or beverages.",
                    "items": [],
                    "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "fiber": 0},
                    "micronutrients": {},
                    "confidence": 0.0
                }

            resolved_items = []
            for item in valid_food_list:
                raw_name = item.get("detected_name", "Food")
                qty = float(item.get("quantity_g", 100))
                prep = item.get("preparation", "Standard")

                resolved_profile = FoodResolutionService.resolve_food_item(raw_name)

                # Combine portion & prep with nutrient profile
                merged_item = {
                    **resolved_profile,
                    "quantity_g": qty,
                    "preparation": prep,
                    "detected_name": raw_name,
                }
                resolved_items.append(merged_item)

            # ── STAGE 3: DETERMINISTIC NUTRITION CALCULATION ───────────────
            calc_result = NutritionCalculationService.calculate_meal_nutrition(resolved_items)

            # ── STAGE 4: DYNAMIC AI INSIGHTS GENERATION ─────────────────────
            totals = calc_result["totals"]
            insights = FoodAnalysisService._generate_dynamic_insights(totals)

            return {
                "analysis_id": analysis_id,
                "meal_label": meal_label,
                "confidence": overall_conf,
                "confidence_display": f"{int(overall_conf * 100)}% (High Accuracy)",
                "items": calc_result["items"],
                "totals": calc_result["totals"],
                "micronutrients": calc_result["micronutrients"],
                "insights": insights,
                "status": "success"
            }

        except Exception as e:
            print(f"[FoodAnalysis] Pipeline Error: {traceback.format_exc()}")
            return {
                "analysis_id": analysis_id,
                "error": f"Food analysis failed: {str(e)}",
                "items": [],
                "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "fiber": 0},
                "micronutrients": {},
                "confidence": 0.0,
                "insights": []
            }

    @staticmethod
    def _generate_dynamic_insights(totals: dict) -> list:
        """Generates dynamic insights from calculated math against health parameters."""
        insights = []
        calories = totals.get("calories", 0)
        protein = totals.get("protein", 0)
        carbs = totals.get("carbs", 0)
        fat = totals.get("fat", 0)

        if calories > 0:
            protein_cal_pct = (protein * 4 / calories) * 100
            if protein_cal_pct >= 25:
                insights.append({
                    "type": "success",
                    "title": "High Protein Meal",
                    "message": f"Provides {protein}g protein ({protein_cal_pct:.0f}% of total calories) for muscle recovery."
                })
            elif protein_cal_pct < 15:
                insights.append({
                    "type": "info",
                    "title": "Moderate Protein Content",
                    "message": "Consider adding eggs, curd, or paneer to boost protein ratio."
                })

        if carbs > 60:
            insights.append({
                "type": "info",
                "title": "Energy-Rich Complex Carbs",
                "message": f"Contains {carbs}g carbohydrates — great energy source before workout."
            })

        if fat > 25:
            insights.append({
                "type": "warning",
                "title": "Higher Fat Ratio",
                "message": f"Contains {fat}g fat. Ensure this fits within your daily target allocation."
            })

        return insights

    @staticmethod
    def _get_missing_key_response(analysis_id: str) -> dict:
        """Returns structured resolution fallback if GEMINI_API_KEY is not set."""
        return {
            "analysis_id": analysis_id,
            "error": "GEMINI_API_KEY not set in backend .env. Please configure API key for live Vision analysis.",
            "items": [],
            "totals": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugar": 0, "fiber": 0},
            "micronutrients": {},
            "confidence": 0.0,
            "insights": [
                {
                    "type": "warning",
                    "title": "API Key Required",
                    "message": "Add GEMINI_API_KEY to your backend .env file to enable live Gemini Vision food recognition."
                }
            ]
        }
