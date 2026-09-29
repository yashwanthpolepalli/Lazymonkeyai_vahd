"""
AI Image Search & RAG Control State
"""
_AI_IMAGE_SEARCH_PAUSED = False


def is_ai_image_search_paused() -> bool:
    global _AI_IMAGE_SEARCH_PAUSED
    return _AI_IMAGE_SEARCH_PAUSED


def set_ai_image_search_paused(paused: bool) -> None:
    global _AI_IMAGE_SEARCH_PAUSED
    _AI_IMAGE_SEARCH_PAUSED = bool(paused)
