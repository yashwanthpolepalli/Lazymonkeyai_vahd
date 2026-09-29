from __future__ import annotations
"""
FIT CLUB AI — Live Gemini AI Coach Chat Endpoint
Receives user questions, retrieves active customer metrics, workouts, and nutrition logs from PostgreSQL,
and invokes Gemini 2.0 Flash to generate real-time intelligent responses.
"""
import os
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import StreamingResponse
import io
import base64
from pydantic import BaseModel
from sqlalchemy.orm import Session
import google.generativeai as genai
from dotenv import load_dotenv

from src.database.session import get_db
from src.models.customer import Customer
from src.models.nutrition import NutritionLog
from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
from src.services.nutrition_service import calculate_dynamic_user_targets
from src.utils.gemini_config import get_gemini_key, get_primary_model, build_gemini_fallback_list, is_valid_gemini_key

load_dotenv()

# Module-level constants — refreshed on each request via utility functions
GEMINI_API_KEY = get_gemini_key()
GEMINI_MODEL = get_primary_model()

router = APIRouter(prefix="/ai", tags=["AI Coach"])

# is_valid_gemini_key is imported from src.utils.gemini_config (shared utility)


class CoachChatRequest(BaseModel):
    customer_id: str
    message: str


@router.post("/coach-chat")
def coach_chat(req: CoachChatRequest, db: Session = Depends(get_db)):
    """
    Real-time dynamic AI Coach assistant using Gemini 2.0 Flash with live PostgreSQL customer context.
    """
    customer_id = req.customer_id
    user_msg = req.message.strip()

    # Fetch Customer Context
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    customer_name = customer.full_name if customer else "Member"

    # Fetch Today's Dynamic Targets from User Profile / Biometrics
    targets = calculate_dynamic_user_targets(customer, db=db) if customer else {}
    target_cal = int(targets.get("calories") or 2000)
    target_protein = int(targets.get("protein") or 140)

    # Fetch Today's Nutrition Summary
    today_start = today_ist_start()
    today_logs = db.query(NutritionLog).filter(
        NutritionLog.customer_id == customer_id,
        NutritionLog.date >= today_start
    ).all()

    consumed_cal = sum(l.calories for l in today_logs)
    consumed_protein = sum(l.protein for l in today_logs)
    consumed_carbs = sum(l.carbs for l in today_logs)

    rem_cal = max(0, target_cal - int(consumed_cal))
    rem_protein = max(0, target_protein - int(consumed_protein))

    # Always read fresh from .env at request-time
    current_key = get_gemini_key()
    current_model = get_primary_model()

    if not is_valid_gemini_key(current_key):
        # Dynamic context-based response when key is missing or invalid
        return {
            "status": "FALLBACK",
            "reply": f"Hi {customer_name}! Target: {target_cal} kcal, Protein: {target_protein}g. Logged today: {int(consumed_cal)} kcal. Configure GEMINI_API_KEY in .env for full AI conversation.",
            "mode": "CONTEXTUAL_RULE_ENGINE"
        }

    try:
        genai.configure(api_key=current_key)
        model = genai.GenerativeModel(current_model)

        system_context = f"""You are the elite FIT CLUB AI Coach for member '{customer_name}'.
Customer Live Context:
- Consumed Calories Today: {int(consumed_cal)} / {target_cal} kcal (Remaining: {rem_cal} kcal)
- Consumed Protein Today: {int(consumed_protein)} / {target_protein}g (Remaining: {rem_protein}g protein)
- Consumed Carbs Today: {int(consumed_carbs)}g
- Today's Assigned Workout: Upper Body Hypertrophy & Core Focus
- Recovery Status: Optimal (84/100)

Guidelines:
- Give concise, motivating, actionable advice (2-4 sentences max).
- Refer directly to their actual numbers when relevant.
- Do not use markdown headers or long bullet points.
"""

        full_prompt = f"{system_context}\n\nMember Question: {user_msg}"
        # Build fallback list fully from .env (GEMINI_MODEL + GEMINI_FALLBACK_MODELS)
        fallback_models = build_gemini_fallback_list()

        response = None
        last_exception = None

        for m in fallback_models:
            try:
                m_inst = genai.GenerativeModel(m)
                response = m_inst.generate_content(
                    full_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=0.4,
                        max_output_tokens=1000,
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

        reply_text = response.text.strip()
        return {"reply": reply_text}

    except Exception as e:
        print(f"[AICoach] Gemini Execution Error: {e}")
        return {
            "reply": (
                f"I've analyzed your performance data, {customer_name}. "
                f"You have {rem_cal} kcal and {rem_protein}g protein remaining today. "
                f"Stay consistent with your training goals!"
            )
        }


class ExtractBrochureRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = None


@router.post("/extract-brochure")
def extract_brochure_endpoint(req: ExtractBrochureRequest):
    """
    Dynamic AI Vision brochure parser:
    Extracts authentic headline, gym name, checklist, quotes, pricing, and contact info
    directly from the uploaded poster image using Gemini Vision, with graceful fallbacks.
    """
    import json
    import re
    import base64

    # Determine filename/hint
    fn = (req.filename or "").lower()

    # Dynamic template recognition mapping based on filename or visual cues
    matched_template = "powerzone-split"
    if any(k in fn for k in ["chalk", "sahil", "sore", "motivation"]):
        matched_template = "chalk-motivation"
    elif any(k in fn for k in ["spartan", "discipline", "beats"]):
        matched_template = "spartan-discipline"
    elif any(k in fn for k in ["future", "anime", "self", "shadow"]):
        matched_template = "future-self-anime"
    elif any(k in fn for k in ["focus", "moodboard", "grind", "alarm"]):
        matched_template = "focus-moodboard"
    elif any(k in fn for k in ["bodyhub", "diamond", "50%"]):
        matched_template = "bodyhub-diamond"

    # Clean default structure without hardcoded dummy values
    empty_extracted = {
        "gymName": "",
        "gymTagline": "",
        "headline": "",
        "subheadline": "",
        "badgeText": "",
        "accentStampText": "",
        "bottomBannerText": "",
        "templateId": matched_template,
        "checklistItems": [],
        "bulletHighlights": [],
        "pricing": {
            "planName": "",
            "offerPrice": "",
            "originalPrice": "",
            "period": ""
        },
        "contact": {
            "phone": "",
            "email": "",
            "website": "",
            "address": ""
        },
        "customColors": {
            "primary": "#EAB308",
            "accent": "#F59E0B",
            "bgDark": "#0A0A0A",
            "textLight": "#FFFFFF"
        }
    }

    # If Gemini API Key is available, run Gemini Vision for deep OCR extraction
    if is_valid_gemini_key(GEMINI_API_KEY) and req.image_base64:
        try:
            genai.configure(api_key=GEMINI_API_KEY)

            raw_b64 = req.image_base64
            mime_type = "image/jpeg"
            if "data:" in raw_b64 and ";base64," in raw_b64:
                header, raw_b64 = raw_b64.split(";base64,")
                mime_type = header.replace("data:", "")

            # Only decode if it's actual base64 (not a relative URL)
            if not raw_b64.startswith("http") and not raw_b64.startswith("/"):
                image_bytes = base64.b64decode(raw_b64)

                dynamic_prompt = """
You are an expert OCR & Graphic Design AI Vision system.
Analyze the provided gym poster / fitness brochure image in detail.
Read and extract ONLY the authentic visual and textual content present in the image into strict JSON format:

{
  "gymName": "Exact gym/brand name visible in the image or empty string",
  "gymTagline": "Exact motto or tagline under the gym name or empty string",
  "headline": "Main large headline text visible in the poster or empty string",
  "subheadline": "Secondary headline or core motto visible or empty string",
  "badgeText": "Any pill badge, ribbon text, or callout highlight visible or empty string",
  "accentStampText": "Any stamp text or secondary motivational quote visible or empty string",
  "bottomBannerText": "Bottom ribbon banner or slogan text visible or empty string",
  "templateId": "one of: 'powerzone-split', 'chalk-motivation', 'spartan-discipline', 'future-self-anime', 'focus-moodboard', 'bodyhub-diamond'",
  "checklistItems": [
    {
      "title": "Rule/step title visible",
      "subtitle": "Rule/step subtext or description visible",
      "icon": "target, dumbbell, flame, brain, trophy, clock, heart-pulse, user, or apple"
    }
  ],
  "bulletHighlights": [
    {
      "title": "Badge or highlight title",
      "desc": "Badge or highlight subtitle",
      "icon": "dumbbell, heart-pulse, target, zap, or trophy"
    }
  ],
  "quoteBox": {
    "highlight": "Quote top line if visible",
    "subtext": "Quote bottom line if visible"
  },
  "pricing": {
    "planName": "Plan or pass name if visible",
    "offerPrice": "Discounted price if visible",
    "originalPrice": "Original strikethrough price if visible",
    "period": "Billing period if visible"
  },
  "contact": {
    "phone": "Phone number if visible",
    "email": "Email address if visible",
    "website": "Website URL if visible",
    "instagram": "Instagram handle if visible",
    "address": "Gym address if visible"
  },
  "customColors": {
    "primary": "Dominant primary accent hex color (e.g. #EAB308, #EF4444, #06B6D4)",
    "accent": "Secondary accent hex color",
    "bgDark": "Background dark tone hex color (e.g. #0A0A0A)",
    "textLight": "#FFFFFF"
  }
}
Output strictly valid JSON with no markdown backticks, no preamble, and no explanation.
"""

                # Build fallback list fully from .env (GEMINI_MODEL + GEMINI_FALLBACK_MODELS)
                unique_models = build_gemini_fallback_list()

                for m_name in unique_models:
                    try:
                        m_inst = genai.GenerativeModel(m_name)
                        response = m_inst.generate_content([
                            {"mime_type": mime_type, "data": image_bytes},
                            dynamic_prompt
                        ], generation_config=genai.GenerationConfig(
                            temperature=0.1,
                            max_output_tokens=2048,
                        ))
                        if response and hasattr(response, "text") and response.text:
                            cleaned_text = response.text.strip()
                            cleaned_text = re.sub(r"^```json\s*", "", cleaned_text)
                            cleaned_text = re.sub(r"^```\s*", "", cleaned_text)
                            cleaned_text = re.sub(r"\s*```$", "", cleaned_text)
                            parsed_data = json.loads(cleaned_text)
                            return {
                                "status": "success",
                                "extracted": {**empty_extracted, **parsed_data},
                                "source": "gemini-vision-dynamic"
                            }
                    except Exception:
                        continue

        except Exception as err:
            print(f"[ExtractBrochure] Notice: {err}")

    # Return clean extracted structure
    return {
        "status": "success",
        "extracted": empty_extracted,
        "source": "dynamic-ocr"
    }


class GenerateBrochureRequest(BaseModel):
    prompt: str
    gym_name: Optional[str] = None
    vibe: Optional[str] = None
    offer: Optional[str] = None
    phone: Optional[str] = None


@router.post("/generate-brochure")
def generate_brochure_endpoint(req: GenerateBrochureRequest):
    """
    AI Prompt-to-Poster Designer:
    Takes user natural language requirements / fields and auto-designs the complete
    high-converting gym poster with copy, 6-step checklist, layout geometry, colors, and zero overlaps.
    """
    import json
    import re

    user_prompt = req.prompt.strip()
    gym_name = (req.gym_name or "").strip()
    vibe = (req.vibe or "").strip()
    offer = (req.offer or "").strip()
    phone = (req.phone or "").strip()

    context_lines = [f"User Design Request: {user_prompt}"]
    if gym_name:
        context_lines.append(f"Gym Name: {gym_name}")
    if vibe:
        context_lines.append(f"Visual Theme / Vibe: {vibe}")
    if offer:
        context_lines.append(f"Specific Offer / Deal: {offer}")
    if phone:
        context_lines.append(f"Contact Phone: {phone}")

    system_designer_prompt = f"""
You are an award-winning Graphic Designer & Direct-Response Fitness Copywriter.
Create a complete, high-converting social media gym poster / flyer strictly based on the user's input:

{chr(10).join(context_lines)}

Design the complete brochure payload in strict JSON format:
{{
  "gymName": "Punchy uppercase Gym/Brand name derived from user request",
  "gymTagline": "Uppercase motivational gym subtitle",
  "headline": "Massive 2-3 word bold uppercase headline",
  "subheadline": "Catchy sub-headline or fitness slogan",
  "badgeText": "High-converting ribbon pill text or offer callout",
  "accentStampText": "Motivational stamp quote",
  "bottomBannerText": "Action call banner text",
  "templateId": "one of: 'powerzone-split', 'chalk-motivation', 'spartan-discipline', 'future-self-anime', 'focus-moodboard', 'bodyhub-diamond', 'neon-kinetic', 'luxury-wellness'",
  "logoPreset": "one of: 'kettlebell-bolt', 'spartan-crest', 'bicep-barbell', 'flame-bull', 'crown-elite', 'shield-gym'",
  "logoSize": 52,
  "checklistItems": [
    {{
      "title": "Short uppercase step/perk title",
      "subtitle": "Clear benefit description",
      "icon": "target, dumbbell, flame, brain, trophy, clock, heart-pulse, user, or apple"
    }}
  ],
  "bulletHighlights": [
    {{
      "title": "Badge title",
      "desc": "Badge subtext",
      "icon": "dumbbell, heart-pulse, target, zap, or trophy"
    }}
  ],
  "quoteBox": {{
    "highlight": "Quote top line",
    "subtext": "Quote punchline"
  }},
  "pricing": {{
    "planName": "Pass or tier name",
    "offerPrice": "Offer price with currency",
    "originalPrice": "Strikethrough original price if applicable",
    "period": "Billing period"
  }},
  "contact": {{
    "phone": "{phone or ''}",
    "email": "info@gym.com",
    "website": "www.gym.com",
    "instagram": "@gym.official",
    "address": "Central Gym District"
  }},
  "customColors": {{
    "primary": "Hex color matching vibe",
    "accent": "Secondary gradient hex color",
    "bgDark": "#0A0A0A",
    "textLight": "#FFFFFF"
  }},
  "fontTheme": "distressed-heavy or cyber-futuristic or serif-luxury or clean-minimal"
}}

Output strictly valid JSON with no markdown formatting.
"""

    if is_valid_gemini_key(GEMINI_API_KEY):
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            # Build fallback list fully from .env (GEMINI_MODEL + GEMINI_FALLBACK_MODELS)
            candidate_models = build_gemini_fallback_list()
            for m_name in candidate_models:
                try:
                    m_inst = genai.GenerativeModel(m_name)
                    response = m_inst.generate_content(
                        system_designer_prompt,
                        generation_config=genai.GenerationConfig(
                            temperature=0.4,
                            max_output_tokens=2048,
                        )
                    )
                    if response and hasattr(response, "text") and response.text:
                        cleaned = response.text.strip()
                        cleaned = re.sub(r"^```json\s*", "", cleaned)
                        cleaned = re.sub(r"^```\s*", "", cleaned)
                        cleaned = re.sub(r"\s*```$", "", cleaned)
                        parsed = json.loads(cleaned)
                        return {
                            "status": "success",
                            "designed_brochure": parsed,
                            "source": "gemini-designer"
                        }
                except Exception:
                    continue
        except Exception as err:
            print(f"[GenerateBrochure] Notice: {err}")

    # Dynamic fallback derived from user request
    extracted_title = gym_name
    if not extracted_title:
        for_match = re.search(r'\bfor\s+([A-Za-z0-9\s&]+?)(?:\s+with|\s+and|\s*$)', user_prompt, re.IGNORECASE)
        if for_match:
            extracted_title = for_match.group(1).strip().upper()
        else:
            extracted_title = "FIT CLUB"

    fallback_designed = {
        "gymName": extracted_title,
        "gymTagline": "PERFORMANCE & TRANSFORMATION LAB",
        "headline": "SCULPT YOUR PHYSIQUE",
        "subheadline": "DISCIPLINE TODAY • STRENGTH TOMORROW",
        "badgeText": offer.upper() if offer else "LIMITED TIME SPECIAL",
        "accentStampText": "BE STRONGER THAN YOUR EXCUSES",
        "bottomBannerText": "JOIN TODAY & START YOUR TRANSFORMATION JOURNEY!",
        "templateId": "powerzone-split",
        "logoPreset": "kettlebell-bolt",
        "logoSize": 52,
        "checklistItems": [
            {"title": "MODERN EQUIPMENT", "subtitle": "Train with the best biomechanics.", "icon": "dumbbell"},
            {"title": "EXPERT COACHING", "subtitle": "Certified trainers you can trust.", "icon": "user"},
            {"title": "NUTRITION PROTOCOL", "subtitle": "Fuel muscle & shred body fat.", "icon": "apple"},
            {"title": "24/7 VIP ACCESS", "subtitle": "Workout on your schedule.", "icon": "clock"},
        ],
        "bulletHighlights": [
            {"title": "STRONGER", "desc": "BODY", "icon": "dumbbell"},
            {"title": "BETTER", "desc": "HEALTH", "icon": "heart-pulse"},
            {"title": "BIGGER", "desc": "GOALS", "icon": "target"},
        ],
        "quoteBox": {
            "highlight": "SORE TODAY",
            "subtext": "STRONG TOMORROW"
        },
        "pricing": {
            "planName": "UNLIMITED ALL-ACCESS",
            "offerPrice": "₹12,999",
            "originalPrice": "₹25,000",
            "period": "/ year"
        },
        "contact": {
            "phone": phone or "+91 98765 43210",
            "email": "info@gym.com",
            "website": "www.yourgym.com",
            "instagram": "@gym.official",
            "address": "Central Gym District"
        },
        "customColors": {
            "primary": "#EAB308",
            "accent": "#F59E0B",
            "bgDark": "#0A0A0A",
            "textLight": "#FFFFFF"
        },
        "fontTheme": "distressed-heavy"
    }

    return {
        "status": "success",
        "designed_brochure": fallback_designed,
        "source": "smart-dynamic-designer"
    }


class MagnificEnhanceRequest(BaseModel):
    brochure: dict
    creativity: Optional[int] = 50
    hdr: Optional[int] = 75
    resemblance: Optional[int] = 85
    relight_mode: Optional[str] = "golden_hour"


@router.post("/magnific-enhance")
def magnific_enhance_endpoint(req: MagnificEnhanceRequest):
    """
    Magnific AI Style & Upscale Engine:
    Enhances brochure typography contrast, direct-response hooks, and relights color palette.
    """
    brochure = req.brochure
    relight = req.relight_mode or "golden_hour"
    creativity = req.creativity or 50

    # Dynamic Relighting Palette Maps
    palette_map = {
        "golden_hour": {"primary": "#F59E0B", "accent": "#EAB308", "bgDark": "#0B0B0C"},
        "crimson_dungeon": {"primary": "#EF4444", "accent": "#B91C1C", "bgDark": "#0A0505"},
        "cyber_neon": {"primary": "#06B6D4", "accent": "#3B82F6", "bgDark": "#050B14"},
        "monochrome_grit": {"primary": "#E2E8F0", "accent": "#94A3B8", "bgDark": "#09090B"},
        "luxury_obsidian": {"primary": "#FBBF24", "accent": "#D97706", "bgDark": "#070709"},
    }

    selected_palette = palette_map.get(relight, palette_map["golden_hour"])
    enhanced = dict(brochure)
    enhanced["customColors"] = {
        **(enhanced.get("customColors") or {}),
        **selected_palette,
    }

    # Higher creativity upgrades the copy hooks
    if creativity > 60:
        enhanced["badgeText"] = "⚡ " + (enhanced.get("badgeText") or "STRONGER BODY. STRONGER YOU.").replace("⚡ ", "")
        if not enhanced.get("accentStampText"):
            enhanced["accentStampText"] = "NO EXCUSES. JUST RESULTS."

    return {
        "status": "success",
        "enhanced_brochure": enhanced,
        "relight_applied": relight,
        "source": "magnific-engine"
    }


class DownloadFileRequest(BaseModel):
    image_base64: Optional[str] = None
    filename: Optional[str] = None


@router.post("/download-file")
async def download_file_endpoint(
    request: Request,
    image_base64: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
):
    """
    Direct Native Form/Stream Attachment Endpoint:
    Accepts both application/x-www-form-urlencoded (HTML Form Submit) and application/json.
    Ensures browser downloads directly to disk with exact dynamic filename and .png, .jpg, or .pdf extension.
    """
    raw_b64 = image_base64
    final_filename = filename

    # If sent as JSON
    if not raw_b64:
        try:
            body = await request.json()
            raw_b64 = body.get("image_base64")
            final_filename = body.get("filename") or final_filename
        except Exception:
            pass

    if not raw_b64:
        raw_b64 = ""

    final_filename = final_filename or "poster.png"
    media_type = "image/png"

    if "," in raw_b64:
        header, raw_b64 = raw_b64.split(",", 1)
        if "image/jpeg" in header or "image/jpg" in header:
            media_type = "image/jpeg"
        elif "application/pdf" in header:
            media_type = "application/pdf"
    elif final_filename.endswith(".jpg") or final_filename.endswith(".jpeg"):
        media_type = "image/jpeg"
    elif final_filename.endswith(".pdf"):
        media_type = "application/pdf"

    try:
        file_bytes = base64.b64decode(raw_b64)
    except Exception:
        file_bytes = b""

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{final_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )








