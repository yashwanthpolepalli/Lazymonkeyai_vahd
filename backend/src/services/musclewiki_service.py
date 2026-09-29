import os
import json
import logging
import urllib.request
import urllib.error
import urllib.parse
from typing import Any, Dict, List, Optional

logger = logging.getLogger("exercise_provider")


class ExerciseProviderError(Exception):
    pass


class ExerciseProvider:
    """
    Provider-independent Exercise Client interfacing directly with dynamic Exercise API.
    Zero hardcoded mock exercise databases or fabricated video links.
    """
    def __init__(self):
        self.base_url = os.getenv("EXERCISE_API_BASE_URL", os.getenv("MUSCLEWIKI_API_URL", "https://api.musclewiki.com"))
        self.api_key = os.getenv("EXERCISE_API_KEY", os.getenv("MUSCLEWIKI_API_KEY"))

    def _request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        if params:
            encoded = urllib.parse.urlencode(
                {key: value for key, value in params.items() if value is not None}
            )
            if encoded:
                url = f"{url}?{encoded}"

        headers = {
            "Accept": "application/json",
            "User-Agent": "FIT-CLUB-AI/1.0",
        }

        if self.api_key:
            headers["X-API-Key"] = self.api_key

        request = urllib.request.Request(url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                body = response.read().decode("utf-8")
                return json.loads(body)
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore") if exc.fp else ""
            logger.warning(f"Exercise provider HTTP {exc.code}: {body}")
            return []
        except urllib.error.URLError as exc:
            logger.error(f"Exercise provider connection failed: {exc}")
            return []

    def mint_media_token(self) -> Optional[str]:
        """
        Mints a short-lived media streaming token via POST /media/token.
        Enables player video streaming via https://api.musclewiki.com/stream/videos/... ?token=...
        """
        url = f"{self.base_url.rstrip('/')}/media/token"
        headers = {
            "Accept": "application/json",
            "User-Agent": "FIT-CLUB-AI/1.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        request = urllib.request.Request(url, headers=headers, method="POST", data=b"")

        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                body = response.read().decode("utf-8")
                data = json.loads(body)
                return data.get("token")
        except Exception as exc:
            logger.warning(f"Media token minting failed: {exc}")
            return None

    def search_exercises(
        self,
        muscle: Optional[str] = None,
        equipment: Optional[str] = None,
        difficulty: Optional[str] = None,
        query: Optional[str] = None,
        limit: Optional[int] = 20,
    ) -> List[Dict[str, Any]]:
        params = {
            "limit": limit or 20,
            "muscles": muscle if muscle and muscle.lower() != "all" else None,
            "category": equipment if equipment and equipment.lower() != "all" else None,
            "difficulty": difficulty if difficulty and difficulty.lower() != "all" else None,
        }

        # If full text search query is present, call /search endpoint
        if query:
            response = self._request("/search", {"q": query, **params})
        else:
            response = self._request("/exercises", params)

        if isinstance(response, list):
            return response
        if isinstance(response, dict):
            results = response.get("results")
            if isinstance(results, list):
                return results
            data = response.get("data")
            if isinstance(data, list):
                return data

        return []

    def get_exercise(self, exercise_id: str) -> Optional[Dict[str, Any]]:
        response = self._request(f"/exercises/{exercise_id}")
        if not response or isinstance(response, list):
            return None
        return response

    def get_videos(self, exercise_id: str) -> List[Dict[str, Any]]:
        response = self._request(f"/exercises/{exercise_id}/videos")
        if isinstance(response, list):
            return response
        if isinstance(response, dict) and isinstance(response.get("videos"), list):
            return response["videos"]
        return []

    def get_muscle_groups(self) -> List[Dict[str, Any]]:
        response = self._request("/muscles")

        if isinstance(response, list):
            return response
        if isinstance(response, dict):
            results = response.get("results")
            if isinstance(results, list):
                return results
            data = response.get("data")
            if isinstance(data, list):
                return data

        return []

    def get_categories(self) -> List[Dict[str, Any]]:
        response = self._request("/categories")

        if isinstance(response, list):
            return response
        if isinstance(response, dict):
            results = response.get("results")
            if isinstance(results, list):
                return results
        return []

    def get_random_exercise(self, category: Optional[str] = None) -> Optional[Dict[str, Any]]:
        response = self._request("/random", {"category": category} if category else None)
        if isinstance(response, dict):
            return response
        return None

    def get_exercises_by_muscle(self, muscle: Optional[str] = None) -> List[Dict[str, Any]]:
        if not muscle or muscle.lower() == "all":
            return self.search_exercises(limit=20)
        return self.search_exercises(muscle=muscle, limit=20)


exercise_provider = ExerciseProvider()
musclewiki_service = exercise_provider
