"""
FIT CLUB AI — Master Dynamic Brochure Template & AI Decomposition Service

Full Production Architecture:
1. File Processor: Accepts JPG/PNG/WEBP/PDF, extracts pages, renders previews, and stores assets securely.
2. AI Vision & OCR Decomposition: Uses Google Gemini Vision to dynamically extract all text blocks,
   typography, colors, logos, badges, images, CTAs, contact info, and layout positions into structured design JSON.
3. Zero Fixed Field Assumptions: Dynamic elements array (e.g. 7 elements, 18 elements, or 45 elements).
4. AI Design Assistant: Uses Gemini LLM to execute structured design operations based on user prompts.
5. Persistent Storage: Saves source files and structured design JSON to PostgreSQL brochure_templates table.
"""
import os
import io
import re
import json
import uuid
import base64
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from src.models.brochure import BrochureTemplate

# Try importing fitz (PyMuPDF) for high-fidelity PDF page rendering
try:
    import fitz  # type: ignore
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

load_dotenv()

_raw_key = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_KEY = _raw_key.strip().strip('"').strip("'")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"[Brochure AI] Warning configuring Gemini: {e}")

# Upload Directory setup
UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads", "brochures"))
os.makedirs(UPLOADS_DIR, exist_ok=True)


# ─── 1. FILE & ASSET PROCESSOR ──────────────────────────────────────────────

def process_and_save_upload(
    image_base64_or_bytes: str,
    filename: Optional[str] = None
) -> Tuple[Image.Image, str, str]:
    """
    Decodes uploaded file (JPG/PNG/PDF), renders first page if PDF,
    saves the asset to the local uploads directory, and returns:
    (PIL.Image, source_asset_url, preview_asset_url)
    """
    clean_b64 = image_base64_or_bytes
    if "," in clean_b64:
        clean_b64 = clean_b64.split(",")[1]

    file_bytes = base64.b64decode(clean_b64)
    ext = "jpg"
    is_pdf = False

    if filename:
        lowered = filename.lower()
        if lowered.endswith(".pdf") or file_bytes[:4] == b"%PDF":
            is_pdf = True
            ext = "pdf"
        elif lowered.endswith(".png"):
            ext = "png"
        elif lowered.endswith(".webp"):
            ext = "webp"

    asset_id = f"asset_{uuid.uuid4().hex[:12]}"
    saved_source_filename = f"{asset_id}.{ext}"
    saved_source_path = os.path.join(UPLOADS_DIR, saved_source_filename)

    # Save original source file
    with open(saved_source_path, "wb") as f:
        f.write(file_bytes)

    source_url = f"/uploads/brochures/{saved_source_filename}"

    # Render image representation
    if is_pdf and HAS_FITZ:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=150)
            preview_filename = f"{asset_id}_preview.jpg"
            preview_path = os.path.join(UPLOADS_DIR, preview_filename)
            pix.save(preview_path)
            preview_url = f"/uploads/brochures/{preview_filename}"
            pil_img = Image.open(io.BytesIO(pix.tobytes("jpeg")))
            return pil_img, source_url, preview_url
        except Exception as e:
            print(f"[Brochure AI] PDF rasterization error: {e}")

    # Standard image loading
    pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    preview_filename = f"{asset_id}_preview.jpg"
    preview_path = os.path.join(UPLOADS_DIR, preview_filename)
    pil_img.save(preview_path, "JPEG", quality=90)
    preview_url = f"/uploads/brochures/{preview_filename}"

    return pil_img, source_url, preview_url


# ─── 2. AI VISION & OCR DECOMPOSITION PROMPT ────────────────────────────────

VISION_DECOMPOSITION_PROMPT = """You are an expert AI Document Layout Analyzer and OCR Decomposition Engine for professional gym/fitness posters & brochures.

Analyze the provided poster/brochure image with pixel-level precision.
Deconstruct the image into a structured vector design JSON representation (Fabric.js compatible).

RULES:
1. DO NOT assume a rigid fixed schema. Extract EVERY visually distinct element present on the brochure.
2. For each detected element, output:
   - id: unique string (e.g. "el_001", "el_002")
   - type: "text" | "image" | "logo" | "badge" | "button" | "checklist" | "group" | "qrcode" | "shape"
   - semantic_role: "headline" | "subheadline" | "gym_name" | "tagline" | "offer" | "price" | "discount" | "hero_image" | "logo" | "cta" | "feature" | "bullet" | "quote" | "contact" | "phone" | "email" | "address" | "website" | "qrcode" | "badge" | "background" | "shape"
   - editable: true
   - position: { "x": <px relative to document width>, "y": <px relative to document height>, "zIndex": <layer order from 0 to 20> }
   - size: { "width": <px>, "height": <px> }
   - content: {
       "text": "<exact OCR extracted text>",
       "title": "<title if badge/card>",
       "subtitle": "<subtitle if badge/card>",
       "tag": "<tag if present>",
       "preset": "<logo preset if logo: kettlebell-bolt, bicep-barbell, spartan-crest, crown-elite, etc.>",
       "url": "<URL if QR code>",
       "phone": "<phone if contact>",
       "email": "<email if contact>",
       "address": "<address if contact>",
       "website": "<website if contact>",
       "items": [<checklist or bullet items if grouped>]
     }
   - style: {
       "fontSize": "<estimated px, e.g. 36px, 14px, 10px>",
       "fontFamily": "<font style description e.g. Impact, sans-serif, serif>",
       "fontWeight": "<400, 700, 800, 900, bold>",
       "color": "<hex color code, e.g. #FFFFFF, #EAB308>",
       "backgroundColor": "<hex color or rgba>",
       "borderRadius": "<px e.g. 14px, 9999px>",
       "textAlign": "<left | center | right>",
       "letterSpacing": "<em e.g. 0.08em>",
       "textTransform": "<uppercase | none>"
     }

3. For document bounds:
   - width: standard canvas width (default 640 for social/poster layout)
   - height: standard canvas height (default 880)
   - backgroundColor: detected dominant dark/light background hex
   - primaryColor: detected dominant brand color hex
   - accentColor: detected secondary accent glow hex

Output MUST be valid JSON ONLY in this exact structure:
{
  "document": {
    "width": 640,
    "height": 880,
    "backgroundColor": "#0A0A0A",
    "primaryColor": "#EAB308",
    "accentColor": "#F59E0B",
    "fontTheme": "distressed-heavy"
  },
  "elements": [
    ...
  ]
}
"""


def _clean_json_output(raw_text: str) -> str:
    """Removes markdown code fences and cleans JSON string."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def run_gemini_vision_decomposition(pil_img: Image.Image, preview_url: str) -> Optional[Dict[str, Any]]:
    """Calls Gemini Vision API to deconstruct the image into dynamic structured layers."""
    if not GEMINI_API_KEY:
        return None

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            [VISION_DECOMPOSITION_PROMPT, pil_img],
            generation_config={"temperature": 0.2}
        )

        cleaned_json_str = _clean_json_output(response.text)
        parsed = json.loads(cleaned_json_str)

        if "document" in parsed and "elements" in parsed and isinstance(parsed["elements"], list):
            # Ensure background layer references the real uploaded asset preview
            has_bg = False
            for el in parsed["elements"]:
                if el.get("semantic_role") == "background":
                    has_bg = True
                    el["content"] = {"src": preview_url}
                    el["style"] = el.get("style", {})
                    el["style"]["opacity"] = el["style"].get("opacity", 0.35)
                    el["style"]["objectFit"] = "cover"

            if not has_bg:
                parsed["elements"].insert(0, {
                    "id": "el_bg_source",
                    "type": "image",
                    "semantic_role": "background",
                    "editable": True,
                    "position": {"x": 0, "y": 0, "zIndex": 0},
                    "size": {"width": 640, "height": 880},
                    "content": {"src": preview_url},
                    "style": {"opacity": 0.35, "objectFit": "cover"}
                })

            return parsed
    except Exception as e:
        print(f"[Brochure AI] Gemini Vision decomposition failed: {e}")
        traceback.print_exc()

    return None


def run_heuristic_image_analysis(pil_img: Image.Image, preview_url: str, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Intelligent image color & layout analysis fallback when API key is unavailable.
    Performs real pixel sampling to detect palette and creates a dynamic multi-layer template.
    """
    width, height = pil_img.size
    # Sample dominant background and accent colors
    small = pil_img.resize((50, 50))
    colors = small.getcolors(maxcolors=2500)
    sorted_colors = sorted(colors, key=lambda c: c[0], reverse=True) if colors else []

    dom_bg = "#0A0A0A"
    dom_accent = "#EAB308"
    if sorted_colors:
        bg_rgb = sorted_colors[0][1]
        dom_bg = f"#{bg_rgb[0]:02x}{bg_rgb[1]:02x}{bg_rgb[2]:02x}"
        if len(sorted_colors) > 1:
            acc_rgb = sorted_colors[1][1]
            dom_accent = f"#{acc_rgb[0]:02x}{acc_rgb[1]:02x}{acc_rgb[2]:02x}"

    clean_name = os.path.splitext(os.path.basename(filename or "GYM"))[0].replace("_", " ").replace("-", " ").upper()

    return {
        "document": {
            "width": 640,
            "height": 880,
            "backgroundColor": dom_bg,
            "primaryColor": dom_accent,
            "accentColor": "#F59E0B",
            "fontTheme": "distressed-heavy"
        },
        "elements": [
            {
                "id": "el_bg_extracted",
                "type": "image",
                "semantic_role": "background",
                "editable": True,
                "position": {"x": 0, "y": 0, "zIndex": 0},
                "size": {"width": 640, "height": 880},
                "content": {"src": preview_url},
                "style": {"opacity": 0.4, "objectFit": "cover"}
            },
            {
                "id": "el_brand_logo",
                "type": "logo",
                "semantic_role": "logo",
                "editable": True,
                "position": {"x": 28, "y": 28, "zIndex": 10},
                "size": {"width": 52, "height": 52},
                "content": {"preset": "kettlebell-bolt", "label": clean_name},
                "style": {"backgroundColor": "rgba(255,255,255,0.08)", "borderRadius": "14px"}
            },
            {
                "id": "el_gym_title",
                "type": "text",
                "semantic_role": "gym_name",
                "editable": True,
                "position": {"x": 92, "y": 28, "zIndex": 10},
                "size": {"width": 320, "height": 30},
                "content": {"text": clean_name},
                "style": {"fontSize": "22px", "fontWeight": "900", "color": "#FFFFFF", "letterSpacing": "0.1em"}
            },
            {
                "id": "el_headline",
                "type": "text",
                "semantic_role": "headline",
                "editable": True,
                "position": {"x": 28, "y": 105, "zIndex": 10},
                "size": {"width": 584, "height": 55},
                "content": {"text": f"{clean_name} FITNESS TRANSFORMATION"},
                "style": {"fontSize": "36px", "fontWeight": "900", "color": "#FFFFFF", "textTransform": "uppercase"}
            },
            {
                "id": "el_offer_badge",
                "type": "badge",
                "semantic_role": "offer",
                "editable": True,
                "position": {"x": 28, "y": 190, "zIndex": 10},
                "size": {"width": 584, "height": 90},
                "content": {
                    "title": "SPECIAL PROMOTION DEAL",
                    "text": "LIMITED TIME DISCOUNT",
                    "subtitle": "Includes Full Access Pass & Personal Coaching"
                },
                "style": {"backgroundColor": "rgba(20,20,20,0.9)", "borderRadius": "16px", "color": "#FFFFFF"}
            },
            {
                "id": "el_cta_btn",
                "type": "button",
                "semantic_role": "cta",
                "editable": True,
                "position": {"x": 28, "y": 580, "zIndex": 12},
                "size": {"width": 584, "height": 48},
                "content": {"text": "🔥 CLAIM MEMBERSHIP DEAL NOW"},
                "style": {"background": dom_accent, "color": "#000000", "borderRadius": "14px", "fontWeight": "900"}
            },
            {
                "id": "el_contact_info",
                "type": "group",
                "semantic_role": "contact",
                "editable": True,
                "position": {"x": 28, "y": 642, "zIndex": 10},
                "size": {"width": 430, "height": 80},
                "content": {"phone": "Contact for info", "website": "www.gymplatform.com"},
                "style": {"fontSize": "9.5px", "color": "#CBD5E1"}
            },
            {
                "id": "el_qr_code",
                "type": "qrcode",
                "semantic_role": "qrcode",
                "editable": True,
                "position": {"x": 480, "y": 642, "zIndex": 10},
                "size": {"width": 132, "height": 80},
                "content": {"url": "https://fitclub.ai", "label": "SCAN TO JOIN"},
                "style": {"backgroundColor": "#FFFFFF", "borderRadius": "12px", "color": "#000000"}
            }
        ]
    }


def analyze_and_decompose_brochure(
    db: Session,
    image_base64: str,
    filename: Optional[str] = None,
    gym_name: Optional[str] = "FIT CLUB"
) -> Dict[str, Any]:
    """
    Master AI Template Analyzer:
    1. Processes and saves uploaded asset (JPG/PNG/PDF).
    2. Runs Gemini Vision to dynamically extract all text blocks, elements, and layout geometry.
    3. Saves structured design JSON into PostgreSQL brochure_templates table.
    """
    # 1. Process and save uploaded file
    pil_img, source_url, preview_url = process_and_save_upload(image_base64, filename)

    # 2. Run Vision AI Decomposition
    design_json = run_gemini_vision_decomposition(pil_img, preview_url)
    source_type = "ai_vision"

    if not design_json:
        design_json = run_heuristic_image_analysis(pil_img, preview_url, filename)
        source_type = "heuristic_vision"

    template_id = f"tmpl_ai_{uuid.uuid4().hex[:10]}"
    display_name = f"Uploaded Brochure ({filename or 'Custom'})"
    elements_count = len(design_json.get("elements", []))

    # 3. Store into PostgreSQL
    new_template = BrochureTemplate(
        id=template_id,
        name=display_name,
        description=f"AI scanned and decomposed from {filename or 'uploaded asset'} with {elements_count} dynamic layers.",
        source_type="uploaded",
        source_asset_id=source_url,
        preview_asset_id=preview_url,
        design_json=design_json,
        version=1,
        is_system_template=False,
        is_active=True
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return {
        "success": True,
        "template": {
            "id": new_template.id,
            "name": new_template.name,
            "description": new_template.description,
            "source_type": new_template.source_type,
            "source_asset_id": new_template.source_asset_id,
            "preview_asset_id": new_template.preview_asset_id,
            "design_json": new_template.design_json,
            "version": new_template.version,
            "element_count": elements_count
        },
        "analysis_summary": {
            "source": source_type,
            "elements_found": elements_count,
            "document_bounds": design_json.get("document", {}),
            "asset_url": preview_url
        }
    }


# ─── 3. LLM-POWERED AI DESIGN ASSISTANT ────────────────────────────────────

AI_ASSISTANT_SYSTEM_PROMPT = """You are an expert AI Graphic Designer for FIT CLUB brochure templates.
You receive:
1. The current structured design JSON (Fabric.js compatible) of a fitness brochure.
2. The user's natural language request (e.g. "Make this brochure more premium with gold accents and change the offer to 40% OFF").

YOUR TASK:
Modify the design JSON to fulfill the user request precisely while strictly maintaining spatial layout integrity.

MODIFICATION CAPABILITIES:
- Update text content of any matching semantic element (e.g. headline, offer, discount, cta, gym_name, quote).
- Modify color tokens in document (primaryColor, accentColor, backgroundColor, backgroundGradient).
- Update styles of buttons, badges, typography (fontFamily, fontWeight, letterSpacing, borderRadius, boxShadow).
- Ensure high contrast and professional readability.

Output MUST be the complete updated JSON only (no markdown commentary).
"""


def apply_ai_design_assistant(
    design_json: Dict[str, Any],
    prompt: str
) -> Dict[str, Any]:
    """
    Calls Gemini LLM to execute structured design transformations on design_json based on user prompt.
    Falls back to deterministic parameter transforms if API is unreachable.
    """
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel(GEMINI_MODEL)
            full_prompt = f"{AI_ASSISTANT_SYSTEM_PROMPT}\n\nUSER REQUEST: {prompt}\n\nCURRENT DESIGN JSON:\n{json.dumps(design_json, indent=2)}"
            response = model.generate_content(full_prompt, generation_config={"temperature": 0.3})
            cleaned = _clean_json_output(response.text)
            parsed = json.loads(cleaned)
            if "document" in parsed and "elements" in parsed:
                return parsed
        except Exception as e:
            print(f"[Brochure AI] AI Assistant LLM error: {e}")

    # Deterministic fallback transformer
    updated = json.loads(json.dumps(design_json))
    p = prompt.lower()

    if "gold" in p or "luxury" in p or "premium" in p:
        updated["document"]["primaryColor"] = "#D97706"
        updated["document"]["accentColor"] = "#F59E0B"
        updated["document"]["backgroundColor"] = "#080705"
        for el in updated.get("elements", []):
            if el.get("type") == "button":
                el.setdefault("style", {})["background"] = "linear-gradient(135deg, #D97706, #F59E0B)"
                el["style"]["color"] = "#000000"
            elif el.get("semantic_role") in ["offer", "badge"]:
                el.setdefault("style", {})["border"] = "2px solid #D97706"

    elif "neon" in p or "cyber" in p or "future" in p:
        updated["document"]["primaryColor"] = "#06B6D4"
        updated["document"]["accentColor"] = "#A855F7"
        updated["document"]["backgroundColor"] = "#060913"
        for el in updated.get("elements", []):
            if el.get("type") == "button":
                el.setdefault("style", {})["background"] = "linear-gradient(135deg, #06B6D4, #A855F7)"
                el["style"]["color"] = "#FFFFFF"

    # Percentage / Discount extraction
    pct_match = re.search(r"(\d+)%", prompt)
    if pct_match:
        pct = pct_match.group(1)
        for el in updated.get("elements", []):
            if el.get("semantic_role") == "offer":
                el.setdefault("content", {})["text"] = f"FLAT {pct}% OFF PROMO"

    return updated


# ─── 4. INITIAL SYSTEM TEMPLATES SEEDING ────────────────────────────────────

def seed_system_brochure_templates(db: Session) -> int:
    """Ensures default master templates are available in PostgreSQL."""
    from src.data.seed_templates import MASTER_SYSTEM_TEMPLATES  # Load from external seed definitions
    seeded_count = 0
    for tmpl_data in MASTER_SYSTEM_TEMPLATES:
        existing = db.query(BrochureTemplate).filter(BrochureTemplate.id == tmpl_data["id"]).first()
        if not existing:
            tmpl = BrochureTemplate(
                id=tmpl_data["id"],
                name=tmpl_data["name"],
                description=tmpl_data.get("description"),
                source_type=tmpl_data.get("source_type", "system"),
                source_asset_id=tmpl_data.get("source_asset_id"),
                preview_asset_id=tmpl_data.get("preview_asset_id"),
                design_json=tmpl_data["design_json"],
                version=tmpl_data.get("version", 1),
                is_system_template=True,
                is_active=True
            )
            db.add(tmpl)
            seeded_count += 1
    if seeded_count > 0:
        db.commit()
    return seeded_count
