from __future__ import annotations
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session, joinedload
from src.models.workout import (
    Workout, WorkoutExercise, WorkoutProgram, CustomerProgramAssignment, WorkoutProgramWeek, WorkoutProgramDay, WorkoutProgramExercise
)
from src.services.exercise_service import ExerciseService

class WorkoutService:
    """FIT CLUB Customer Workout Plan Service querying active PostgreSQL DB assignments."""
    def __init__(self, db: Session, exercise_service: Optional[ExerciseService] = None) -> None:
        self.db = db
        self.exercise_service = exercise_service or ExerciseService()

    def get_active_plan(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Queries PostgreSQL for assigned WorkoutProgram or scheduled Workout for the authenticated customer."""
        # 1. Check for active program assignment in PostgreSQL
        assignment = (
            self.db.query(CustomerProgramAssignment)
            .filter(
                CustomerProgramAssignment.customer_id == customer_id,
                CustomerProgramAssignment.status == "ACTIVE"
            )
            .options(joinedload(CustomerProgramAssignment.program))
            .first()
        )

        if assignment and assignment.program:
            prog = assignment.program
            return {
                "id": prog.id,
                "name": prog.name,
                "goal": prog.goal,
                "assigned_by": assignment.assigned_by,
                "current_week": assignment.current_week,
                "current_day": assignment.current_day,
                "status": assignment.status,
            }

        # 2. Check for scheduled individual Workout assignment in PostgreSQL
        workout = (
            self.db.query(Workout)
            .filter(
                Workout.customer_id == customer_id,
                Workout.status.in_(["SCHEDULED", "IN_PROGRESS"])
            )
            .order_by(Workout.created_at.desc())
            .first()
        )

        if workout:
            return {
                "id": workout.id,
                "name": workout.name,
                "goal": workout.goal,
                "status": workout.status,
            }

        return None

    def get_plan(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Returns structured workout plan details directly from PostgreSQL DB or None if unassigned."""
        active_info = self.get_active_plan(customer_id)
        if not active_info:
            return None

        # Fetch active assigned workout exercises from PostgreSQL DB
        workout = (
            self.db.query(Workout)
            .filter(
                Workout.customer_id == customer_id,
                Workout.status.in_(["SCHEDULED", "IN_PROGRESS"])
            )
            .options(joinedload(Workout.exercises).joinedload(WorkoutExercise.exercise))
            .order_by(Workout.created_at.desc())
            .first()
        )

        if not workout or not workout.exercises:
            return {
                "id": active_info["id"],
                "name": active_info["name"],
                "status": active_info["status"],
                "days": [],
            }

        exercises = []
        for we in sorted(workout.exercises, key=lambda x: x.order_index or 1):
            exercises.append({
                "id": we.id,
                "exercise_id": we.exercise_id,
                "name": we.exercise.name if we.exercise else f"Exercise {we.order_index}",
                "sets": we.sets,
                "reps": we.reps,
                "weight_kg": we.weight,
                "rest_seconds": we.rest_seconds,
                "completed": we.completed,
            })

        return {
            "id": workout.id,
            "name": workout.name,
            "status": workout.status,
            "duration_min": workout.duration,
            "days": [
                {
                    "id": f"day_{workout.id}",
                    "dayNumber": 1,
                    "name": workout.name,
                    "exercises": exercises,
                }
            ],
        }

    def get_today(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Returns today's scheduled exercises directly from PostgreSQL DB."""
        return self.get_plan(customer_id)
