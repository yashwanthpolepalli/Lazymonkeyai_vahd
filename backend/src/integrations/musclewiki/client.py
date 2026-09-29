from __future__ import annotations
from typing import Any, Optional, Dict
import urllib.request
import urllib.parse
import json
import logging
from src.config.settings import settings

logger = logging.getLogger("musclewiki_client")

class MuscleWikiClient:
    """
    Native HTTP Client for MuscleWiki API Integration.
    Communicates directly with https://api.musclewiki.com with X-API-Key authorization.
    """
    def __init__(self) -> None:
        self.base_url = settings.MUSCLEWIKI_API_KEY.rstrip("/") if hasattr(settings, "MUSCLEWIKI_API_URL") else "https://api.musclewiki.com"
        self.api_key = getattr(settings, "MUSCLEWIKI_API_KEY", "mw_NAhcwU4l7vVaQYKmBqz-A6Fw1804LA2UwgEaVcM5caQ")

    @property
    def headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Accept": "application/json",
            "User-Agent": "FitClub-Backend/2.0",
        }

    def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json_body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"https://api.musclewiki.com{path}"
        if params:
            # Filter None values from query parameters
            clean_params = {k: v for k, v in params.items() if v is not None}
            if clean_params:
                url = f"{url}?{urllib.parse.urlencode(clean_params)}"

        data_bytes = json.dumps(json_body).encode("utf-8") if json_body else None

        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers=self.headers,
            method=method.upper(),
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as e:
            error_text = e.read().decode("utf-8") if e.fp else ""
            logger.warning(f"MuscleWiki API HTTP Error {e.code}: {error_text}")
            if e.code == 401:
                raise RuntimeError("MuscleWiki API authentication failed.")
            if e.code == 403:
                # Basic tier playground access limit notice
                logger.info("MuscleWiki API BASIC tier restricted access notice.")
                return {"error": True, "code": 403, "message": "Playground access only", "results": []}
            if e.code == 404:
                raise RuntimeError("MuscleWiki resource was not found.")
            if e.code == 429:
                raise RuntimeError("MuscleWiki API rate limit exceeded.")
            if e.code >= 500:
                raise RuntimeError("MuscleWiki API server error.")
            return {"error": True, "code": e.code, "message": error_text}
        except Exception as exc:
            logger.error(f"MuscleWiki client request exception: {exc}")
            return {"error": True, "message": str(exc)}

    def get_muscles(self) -> Any:
        return self.request("GET", "/muscles")

    def get_categories(self) -> Any:
        return self.request("GET", "/categories")

    def get_exercises(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        muscles: Optional[str] = None,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
        gender: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Any:
        params: Dict[str, Any] = {
            "limit": limit,
            "offset": offset,
        }
        if muscles:
            params["muscles"] = muscles
        if category:
            params["category"] = category
        if difficulty:
            params["difficulty"] = difficulty
        if gender:
            params["gender"] = gender
        if search:
            params["search"] = search

        return self.request("GET", "/exercises", params=params)

    def get_exercise(self, exercise_id: int) -> Any:
        return self.request("GET", f"/exercises/{exercise_id}")

    def get_exercise_videos(self, exercise_id: int) -> Any:
        return self.request("GET", f"/exercises/{exercise_id}/videos")

    def search(self, query: str, *, limit: int = 20, offset: int = 0) -> Any:
        return self.request("GET", "/search", params={"q": query, "limit": limit, "offset": offset})

    def create_media_token(self) -> Any:
        return self.request("POST", "/media/token")
