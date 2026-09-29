"""
Gemini AI Configuration Utility
─────────────────────────────────────────────────────────────────────────────
Reads GEMINI_MODEL and GEMINI_FALLBACK_MODELS from .env at call-time so that
changing the model in .env takes effect on the next request — no code changes
or restarts required (load_dotenv with override=True is called on each read).

Usage in any service:
    from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list
    import google.generativeai as genai

    api_key = get_gemini_key()
    models  = build_gemini_fallback_list()

    genai.configure(api_key=api_key)
    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(...)
            break
        except Exception as e:
            if "429" in str(e) or "404" in str(e) or "quota" in str(e).lower():
                continue
            raise
"""
import os
from dotenv import load_dotenv

# ── Currently available Gemini models (updated per Google API guidance) ──────
# Order: most capable → lightest. All verified available on Gemini API.
_SAFE_DEFAULTS = [
    "gemini-3.6-flash",        # Primary: Google recommended stable latest model
    "gemini-3.5-flash",        # High performance multimodal model
    "gemini-3.5-flash-lite",   # Fast lightweight model
    "gemini-flash-latest",     # Latest flash alias
]


def get_gemini_key() -> str:
    """
    Returns the Gemini API key from .env, re-reading the file on every call
    so that key rotations take effect without a restart.
    """
    load_dotenv(override=True)
    raw = (
        os.getenv("GEMINI_API_KEY", "")
        or os.getenv("GOOGLE_API_KEY", "")
    )
    return raw.strip().strip('"').strip("'")


def get_primary_model() -> str:
    """
    Returns the primary Gemini model name from .env (GEMINI_MODEL).
    Falls back to gemini-3.6-flash if the variable is empty or unset.
    """
    load_dotenv(override=True)
    model = os.getenv("GEMINI_MODEL", "").strip().strip('"').strip("'")
    return model if model else "gemini-3.6-flash"


def build_gemini_fallback_list() -> list[str]:
    """
    Builds an ordered, deduplicated list of Gemini models to try, reading
    fully from .env at call-time:

      1. GEMINI_MODEL          — primary model (highest priority)
      2. GEMINI_FALLBACK_MODELS — comma-separated list of fallbacks

    If GEMINI_FALLBACK_MODELS is not set, uses the built-in safe defaults.
    Duplicate entries are removed while preserving order.

    Example .env:
        GEMINI_MODEL=gemini-3.6-flash
        GEMINI_FALLBACK_MODELS=gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-flash-latest
    """
    load_dotenv(override=True)

    primary = get_primary_model()

    raw_fallbacks = os.getenv("GEMINI_FALLBACK_MODELS", "").strip()
    if raw_fallbacks:
        fallback_candidates = [
            m.strip().strip('"').strip("'")
            for m in raw_fallbacks.split(",")
            if m.strip()
        ]
    else:
        fallback_candidates = list(_SAFE_DEFAULTS)

    # Build final ordered, deduplicated list — primary always first
    seen: set[str] = set()
    models: list[str] = []
    for m in [primary] + fallback_candidates:
        if m and m not in seen:
            seen.add(m)
            models.append(m)

    return models


def is_valid_gemini_key(key: str) -> bool:
    """Returns True if the key looks like a valid non-empty Gemini API key."""
    if not key:
        return False
    cleaned = key.strip().strip('"').strip("'")
    return len(cleaned) >= 10
