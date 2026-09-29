from __future__ import annotations
from typing import Any, Dict, Optional
from src.services.exercise_service import ExerciseService

class WorkoutVideoService:
    """Exercise Video Stream Resolution & Authorization Token Service."""
    def __init__(self, exercise_service: Optional[ExerciseService] = None) -> None:
        self.exercise_service = exercise_service or ExerciseService()

    def get_video_access(self, exercise_id: int) -> Dict[str, Any]:
        exercise = self.exercise_service.get_exercise(exercise_id)
        videos = self.exercise_service.get_videos(exercise_id)
        token = self.exercise_service.create_media_token()

        return {
            "exercise": exercise,
            "videos": videos,
            "media_token": token,
        }
