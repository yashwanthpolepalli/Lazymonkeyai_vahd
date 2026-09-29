"""
FIT CLUB AI — Exercises API Router
Provider-Agnostic Exercise Library & Catalog REST Endpoints.
Communicates directly with ExerciseService / ExerciseProvider.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import urllib.request
import urllib.error

from src.database.session import get_db
from src.services.exercise_service import ExerciseService

router = APIRouter(prefix="/exercises", tags=["Exercises"])


def get_exercise_service() -> ExerciseService:
    return ExerciseService()


@router.get("/image-proxy")
def proxy_exercise_image(url: str = Query(..., description="External image URL to proxy")):
    """
    Server-side image proxy to bypass browser CORS restrictions.
    Fetches external exercise images re-serving them with Cache-Control headers.
    """
    ALLOWED_HOSTS = ["wger.de", "raw.githubusercontent.com", "v2.exercisedb.io", "exercisedb.io", "musclewiki.com", "unsplash.com"]
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        if not any(host.endswith(h) for h in ALLOWED_HOSTS):
            raise HTTPException(status_code=403, detail="Host not allowed")

        req = urllib.request.Request(url, headers={
            "User-Agent": "FitClubGymBot/1.0",
            "Accept": "image/*,*/*"
        })
        with urllib.request.urlopen(req, timeout=8) as resp:
            content_type = resp.headers.get("Content-Type", "image/jpeg")
            data = resp.read()
        return Response(content=data, media_type=content_type, headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*"
        })
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=f"Upstream error: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy failed: {str(e)}")


@router.get("")
def list_exercises(
    muscle: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    service: ExerciseService = Depends(get_exercise_service),
):
    """List normalized exercises from provider layer with optional filters."""
    return service.list_exercises(
        muscle=muscle, equipment=equipment, difficulty=difficulty, limit=limit
    )


@router.get("/search")
def search_exercises(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    service: ExerciseService = Depends(get_exercise_service),
):
    """Search exercises by name or keyword."""
    return service.search(q, limit=limit)


@router.get("/muscle/{muscle}")
def list_by_muscle(
    muscle: str,
    limit: int = Query(20, ge=1, le=100),
    service: ExerciseService = Depends(get_exercise_service),
):
    """List exercises targeting a specific muscle group."""
    return service.list_exercises(muscle=muscle, limit=limit)


@router.get("/equipment/{equipment}")
def list_by_equipment(
    equipment: str,
    limit: int = Query(20, ge=1, le=100),
    service: ExerciseService = Depends(get_exercise_service),
):
    """List exercises matching specified equipment."""
    return service.list_exercises(equipment=equipment, limit=limit)


@router.get("/{exercise_id}")
def get_exercise_by_id(
    exercise_id: int,
    service: ExerciseService = Depends(get_exercise_service),
):
    """Get single normalized exercise by ID."""
    ex = service.get_exercise(exercise_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex
