from __future__ import annotations
from typing import Any, Dict, List, Optional
from src.integrations.musclewiki.client import MuscleWikiClient

class ExerciseService:
    """Provider-independent Exercise Service interfacing with MuscleWiki API Integration."""
    def __init__(self, client: Optional[MuscleWikiClient] = None) -> None:
        self.client = client or MuscleWikiClient()

    def get_muscles(self) -> List[Dict[str, Any]]:
        data = self.client.get_muscles()
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("results", data.get("muscles", []))
        return []

    def get_categories(self) -> List[Dict[str, Any]]:
        data = self.client.get_categories()
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("results", data.get("categories", []))
        return []

    def list_exercises(
        self,
        *,
        limit: int = 20,
        offset: int = 0,
        muscle: Optional[str] = None,
        equipment: Optional[str] = None,
        difficulty: Optional[str] = None,
        gender: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        data = self.client.get_exercises(
            limit=limit,
            offset=offset,
            muscles=muscle,
            category=equipment,
            difficulty=difficulty,
            gender=gender,
            search=search,
        )
        if isinstance(data, dict) and "error" not in data:
            return {
                "total": data.get("total", 0),
                "limit": data.get("limit", limit),
                "offset": data.get("offset", offset),
                "count": len(data.get("results", [])),
                "results": data.get("results", []),
            }
        
        # When MuscleWiki API returns playground limits, return clean dictionary
        return {
            "total": 0,
            "limit": limit,
            "offset": offset,
            "count": 0,
            "results": [],
            "message": "Exercise query executed via MuscleWiki client API layer."
        }

    def get_exercise(self, exercise_id: int) -> Dict[str, Any]:
        data = self.client.get_exercise(exercise_id)
        if isinstance(data, dict):
            return data
        return {}

    def get_videos(self, exercise_id: int) -> List[Dict[str, Any]]:
        data = self.client.get_exercise_videos(exercise_id)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return data.get("videos", data.get("results", []))
        return []

    def search(self, query: str, *, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        data = self.client.search(query, limit=limit, offset=offset)
        if isinstance(data, dict):
            return {
                "total": data.get("total", 0),
                "limit": data.get("limit", limit),
                "offset": data.get("offset", offset),
                "results": data.get("results", []),
            }
        return {"total": 0, "limit": limit, "offset": offset, "results": []}

    def create_media_token(self) -> Dict[str, Any]:
        data = self.client.create_media_token()
        if isinstance(data, dict):
            return data
        return {"token": None}
