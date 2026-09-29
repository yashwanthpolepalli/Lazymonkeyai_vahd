from __future__ import annotations
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.utils.security import verify_token
from src.models.customer import Customer
from src.services.exercise_service import ExerciseService
from src.services.workout_service import WorkoutService
from src.services.workout_progression_service import WorkoutProgressionService
from src.services.workout_video_service import WorkoutVideoService

router = APIRouter(prefix="/customer/workouts", tags=["Customer Workouts Engine"])


def get_current_customer(authorization: str = Header(None), db: Session = Depends(get_db)) -> Customer:
    """Extracts authenticated Customer model strictly from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication token missing")

    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    user_id = payload.get("sub")
    cust_id = payload.get("customer_id")

    customer = None
    if cust_id:
        customer = db.query(Customer).filter(Customer.id == cust_id).first()
    if not customer and user_id:
        customer = db.query(Customer).filter(Customer.user_id == user_id).first()
    if not customer and payload.get("email"):
        customer = db.query(Customer).filter(Customer.email == payload.get("email").strip().lower()).first()

    if not customer:
        raise HTTPException(status_code=401, detail="No linked customer record found")

    return customer


def get_exercise_service() -> ExerciseService:
    return ExerciseService()


def get_workout_service(db: Session = Depends(get_db)) -> WorkoutService:
    return WorkoutService(db=db)


def get_progression_service(db: Session = Depends(get_db)) -> WorkoutProgressionService:
    return WorkoutProgressionService(db=db)


@router.get("/muscles")
def list_muscles(service: ExerciseService = Depends(get_exercise_service)):
    """Returns target muscle groups directly from MuscleWiki exercise taxonomy."""
    return service.get_muscles()


@router.get("/equipment")
def list_equipment(service: ExerciseService = Depends(get_exercise_service)):
    """Returns equipment categories directly from MuscleWiki exercise taxonomy."""
    return service.get_categories()


@router.get("/exercises")
def list_exercises(
    muscle: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ExerciseService = Depends(get_exercise_service),
):
    """Returns exercises matching target filters from MuscleWiki integration layer."""
    return service.list_exercises(
        limit=limit,
        offset=offset,
        muscle=muscle,
        equipment=equipment,
        difficulty=difficulty,
        gender=gender,
        search=search,
    )


@router.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: int, service: ExerciseService = Depends(get_exercise_service)):
    """Returns detailed exercise instructions and metadata for given exercise ID."""
    return service.get_exercise(exercise_id)


@router.get("/exercises/{exercise_id}/videos")
def get_exercise_videos(
    exercise_id: int,
    cust: Customer = Depends(get_current_customer),
    service: ExerciseService = Depends(get_exercise_service)
):
    """Returns video demonstration URLs for target exercise ID if customer has video access enabled by gym owner."""
    has_video_access = bool(cust.enable_workout_videos if cust.enable_workout_videos is not None else True)
    if not has_video_access:
        return {
            "videos": [],
            "has_video_access": False,
            "message": "Workout videos are locked by Gym Owner."
        }
    return {
        "videos": service.get_videos(exercise_id),
        "has_video_access": True
    }


@router.get("/search")
def search_exercises(
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ExerciseService = Depends(get_exercise_service),
):
    """Searches exercise database by name or muscle group."""
    return service.search(q, limit=limit, offset=offset)


@router.get("/my-plan")
def get_my_workout_plan(
    cust: Customer = Depends(get_current_customer),
    service: WorkoutService = Depends(get_workout_service),
):
    """
    Returns active workout plan assigned in PostgreSQL database.
    Returns status "EMPTY" if no plan has been assigned by trainer or customer.
    """
    data = service.get_plan(cust.id)
    if data is None:
        return {
            "data": None,
            "status": "EMPTY",
            "message": "No workout plan assigned.",
        }
    return {
        "data": data,
        "status": "SUCCESS",
    }


@router.get("/progression/{exercise_id}")
def get_progression_recommendation(
    exercise_id: str,
    target_reps: Optional[int] = Query(None),
    cust: Customer = Depends(get_current_customer),
    service: WorkoutProgressionService = Depends(get_progression_service),
):
    """Calculates progressive overload recommendations strictly from real customer session history."""
    return service.recommendation(cust.id, exercise_id, target_reps=target_reps)
