from __future__ import annotations
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from src.models.workout import WorkoutSession, WorkoutSessionExercise

class WorkoutProgressionService:
    """Calculates progressive overload recommendations strictly from real customer session history in PostgreSQL."""
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_last_performance(self, customer_id: str, exercise_id: str) -> Optional[WorkoutSessionExercise]:
        """Queries PostgreSQL for the most recent completed set log for the given exercise."""
        return (
            self.db.query(WorkoutSessionExercise)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSessionExercise.session_id)
            .filter(
                WorkoutSession.customer_id == customer_id,
                WorkoutSessionExercise.exercise_id == exercise_id,
                WorkoutSession.status == "COMPLETED",
            )
            .order_by(desc(WorkoutSession.completed_at))
            .first()
        )

    def recommendation(
        self,
        customer_id: str,
        exercise_id: str,
        target_reps: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Returns progressive overload target based strictly on customer session history."""
        previous = self.get_last_performance(customer_id, exercise_id)

        if previous is None:
            return {
                "exerciseId": exercise_id,
                "previousWeightKg": None,
                "previousReps": None,
                "recommendedWeightKg": None,
                "recommendedReps": target_reps,
                "status": "NO_HISTORY",
                "message": "No previous performance. Follow your trainer's prescribed starting load.",
            }

        weight = previous.weight_kg
        reps = previous.reps_completed

        if weight is None or reps is None or weight == 0.0:
            return {
                "exerciseId": exercise_id,
                "previousWeightKg": weight,
                "previousReps": reps,
                "recommendedWeightKg": None,
                "recommendedReps": target_reps,
                "status": "INSUFFICIENT_HISTORY",
                "message": "Insufficient performance metrics recorded for progression.",
            }

        target = target_reps or 10
        if reps >= target:
            next_weight = round(weight * 1.025, 2)
            return {
                "exerciseId": exercise_id,
                "previousWeightKg": weight,
                "previousReps": reps,
                "recommendedWeightKg": next_weight,
                "recommendedReps": target,
                "status": "PROGRESS",
                "message": f"Great performance! Increase load by 2.5% to {next_weight} kg.",
            }

        return {
            "exerciseId": exercise_id,
            "previousWeightKg": weight,
            "previousReps": reps,
            "recommendedWeightKg": weight,
            "recommendedReps": target,
            "status": "MAINTAIN",
            "message": f"Maintain current weight of {weight} kg and aim to hit {target} reps.",
        }
