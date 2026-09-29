"""
FIT CLUB AI — Body Composition & BMI Report OCR Extraction Engine
Processes InBody, TANITA, and medical BMI scan reports (Images/PDFs) using Gemini AI Vision OCR.
Extracts weight, height, BMI, body fat %, muscle mass, BMR, visceral fat, and body water.
Deterministically updates PostgreSQL Customer biometrics and recalculates dynamic macro targets.
"""
import os
import json
import base64
import uuid
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from src.utils.gemini_config import get_gemini_key, get_primary_model, build_gemini_fallback_list

load_dotenv()

logger = logging.getLogger("inbody_ocr_service")

# Module-level constants — refreshed on each request via utility functions
GEMINI_API_KEY = get_gemini_key()
GEMINI_MODEL = get_primary_model()

BMI_OCR_PROMPT = """You are an expert clinical medical OCR engine specializing in InBody, TANITA, DEXA, and Body Composition / BMI report scan sheets.

Carefully examine the provided image of a body scan / BMI report sheet.
Extract the following clinical biometrics accurately:

1. weight_kg: Total body weight in kg (float)
2. height_cm: Height in cm (float, convert from meters or feet/inches if necessary)
3. bmi: Body Mass Index (float)
4. body_fat_percentage: Percent body fat PBF % (float)
5. skeletal_muscle_mass_kg: Skeletal Muscle Mass SMM in kg (float)
6. visceral_fat_level: Visceral fat level 1-20 (int or float)
7. basal_metabolic_rate_kcal: Basal Metabolic Rate BMR in kcal (int)
8. body_water_l: Total Body Water TBW in liters/kg (float)
9. protein_kg: Protein mass in kg (float)
10. score: InBody/Fitness Score 0-100 if present (int)
11. scan_date: Scan date string (YYYY-MM-DD) if present

CRITICAL INSTRUCTIONS:
- Return ONLY strict, valid JSON.
- If a value cannot be found in the image, set its value to null.
- Do NOT hallucinate values. Extract only clear visible text/numbers.

JSON Structure (Dynamically extract values from report image, set field to null if not present):
{
  "weight_kg": 0.0,
  "height_cm": 0.0,
  "bmi": 0.0,
  "body_fat_percentage": 0.0,
  "skeletal_muscle_mass_kg": 0.0,
  "visceral_fat_level": 0,
  "basal_metabolic_rate_kcal": 0,
  "body_water_l": 0.0,
  "protein_kg": 0.0,
  "score": 0,
  "scan_date": "YYYY-MM-DD",
  "confidence": 0.0
}
"""


class InBodyOcrService:

    @staticmethod
    def extract_from_image_bytes(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Processes body composition / BMI report image bytes using Gemini AI Vision.
        Extracts clinical biometrics into a structured dictionary.
        """
        # Always read fresh from .env at call-time
        api_key = get_gemini_key()
        model_name = get_primary_model()

        if not api_key:
            logger.warning("GEMINI_API_KEY not configured. Please ensure GEMINI_API_KEY is set in backend .env file.")
            return {"error": "AI Vision key not configured in .env"}

        try:
            genai.configure(api_key=api_key)
            # Build fallback list fully from .env (GEMINI_MODEL + GEMINI_FALLBACK_MODELS)
            fallback_models = build_gemini_fallback_list()

            image_part = {
                "mime_type": mime_type,
                "data": image_bytes
            }

            response = None
            last_exception = None

            for m in fallback_models:
                try:
                    m_inst = genai.GenerativeModel(m)
                    response = m_inst.generate_content(
                        [BMI_OCR_PROMPT, image_part],
                        generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=4096, response_mime_type="application/json")
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
            from src.services.nutrition_service import parse_gemini_json
            parsed = parse_gemini_json(raw_text)
            if isinstance(parsed, dict):
                return parsed

        except Exception as e:
            logger.error(f"Error during Gemini Body Scan OCR: {e}")
            return {"error": f"Gemini Vision OCR Error: {str(e)}"}

        return {"error": "Failed to parse body composition scan image."}
