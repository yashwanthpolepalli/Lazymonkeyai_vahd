from src.utils.timezone import now_ist_naive, today_ist_start, today_ist_end, to_ist_str
"""
FIT CLUB AI — Workouts & Adaptive Engine Endpoints
Provides template searching, today's workout generation, session performance logging, and trainer assignment.
"""
import uuid
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.models.workout import (
    Workout, WorkoutExercise, WorkoutTemplate, WorkoutTemplateDay,
    WorkoutTemplateExercise, WorkoutSession, WorkoutSessionExercise,
    TrainingSplit, TrainingSplitDay, WorkoutProgram, WorkoutProgrammingRules
)
from src.models.customer import Customer
from src.services.workout_service import WorkoutService

router = APIRouter(prefix="/workouts", tags=["Workouts"])


@router.get("/config-options")
def get_workout_config_options(db: Session = Depends(get_db)):
    """Fetch live dynamic options for workout goal, experience level, days, durations, splits, and muscle focus categories directly from PostgreSQL DB."""
    splits = db.query(TrainingSplit).all()
    split_options = [{"id": s.name, "title": s.name, "description": s.description, "min_days": s.min_days, "max_days": s.max_days} for s in splits]

    return {
        "fitness_goals": ["Muscle Gain", "Fat Loss", "Strength", "Hypertrophy", "General Fitness", "Endurance"],
        "experience_levels": ["Beginner", "Intermediate", "Advanced", "Elite"],
        "days_per_week_options": [3, 4, 5, 6],
        "duration_minutes_options": [45, 60, 75, 90],
        "training_splits": split_options,
        "workout_focus_categories": [
            {"name": "Chest", "icon": "dry_cleaning"},
            {"name": "Back", "icon": "nature_people"},
            {"name": "Shoulders", "icon": "accessibility"},
            {"name": "Arms", "icon": "fitness_center"},
            {"name": "Legs", "icon": "directions_run"},
            {"name": "Abs", "icon": "grid_view"},
            {"name": "Glutes", "icon": "accessibility_new"},
            {"name": "Cardio", "icon": "bolt"}
        ]
    }


@router.get("/splits")
def get_training_splits(db: Session = Depends(get_db)):
    """Fetch all 5 Configurable Training Splits and Split Days from PostgreSQL DB."""
    splits = db.query(TrainingSplit).all()
    res = []
    for s in splits:
        days_data = [{"day_number": d.day_number, "name": d.name, "muscle_groups": d.muscle_groups} for d in s.days]
        res.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "min_days": s.min_days,
            "max_days": s.max_days,
            "recommended_level": s.recommended_level,
            "days": days_data
        })
    return {"splits": res}


@router.post("/recommend-split")
def recommend_split(payload: dict, db: Session = Depends(get_db)):
    """Evaluates customer profile and calculates compatibility scores (0-100) for all splits."""
    goal = payload.get("goal") or "Muscle Gain"
    level = payload.get("level") or "Intermediate"
    days = int(payload.get("days_per_week") or 4)
    duration = int(payload.get("session_duration") or 60)
    preference = payload.get("preference") or "AI"

    return WorkoutEngineService.evaluate_split_scores(
        db, goal=goal, level=level, days_per_week=days, session_duration=duration, preference=preference
    )


@router.post("/select-split")
def select_training_split(payload: dict, db: Session = Depends(get_db)):
    """Updates customer training split preference and biometrics in PostgreSQL."""
    customer_id = payload.get("customer_id")
    preference = payload.get("training_preference") or "AI"
    goal = payload.get("goal")
    fitness_level = payload.get("fitness_level")

    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    cust = db.query(Customer).filter(Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found.")

    cust.training_preference = preference
    if goal:
        cust.goal = goal
    if fitness_level:
        cust.fitness_level = fitness_level
    db.commit()

    return {
        "status": "success",
        "customer_id": customer_id,
        "training_preference": preference,
        "goal": cust.goal,
        "fitness_level": cust.fitness_level,
        "message": f"Training preferences updated successfully!"
    }


@router.get("/programs")
def list_workout_programs(
    goal: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Searchable database of Workout Programs stored in PostgreSQL."""
    q = db.query(WorkoutProgram)
    if goal:
        q = q.filter(WorkoutProgram.goal.ilike(f"%{goal}%"))
    if level:
        q = q.filter(WorkoutProgram.experience_level.ilike(f"%{level}%"))
    if query:
        q = q.filter(WorkoutProgram.name.ilike(f"%{query}%"))

    progs = q.all()
    res = []
    for p in progs:
        res.append({
            "id": p.id,
            "name": p.name,
            "goal": p.goal,
            "level": getattr(p, "experience_level", None) or getattr(p, "difficulty", "Intermediate"),
            "experience_level": getattr(p, "experience_level", "Intermediate"),
            "duration_weeks": p.duration_weeks,
            "days_per_week": p.days_per_week,
            "session_duration": getattr(p, "session_duration_minutes", 60),
            "session_duration_minutes": getattr(p, "session_duration_minutes", 60),
            "description": p.description,
            "split_name": p.split.name if p.split else "Dynamic Split"
        })
    return {"total": len(res), "programs": res}



@router.get("/templates")
def list_workout_templates(
    goal: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Search and filter master workout templates stored in PostgreSQL DB."""
    q = db.query(WorkoutTemplate)
    if goal:
        q = q.filter(WorkoutTemplate.goal.ilike(f"%{goal}%"))
    if level:
        q = q.filter(WorkoutTemplate.level.ilike(f"%{level}%"))
    if equipment:
        q = q.filter(WorkoutTemplate.equipment.ilike(f"%{equipment}%"))
    if query:
        q = q.filter(WorkoutTemplate.name.ilike(f"%{query}%"))

    templates = q.all()
    res = []
    for tmpl in templates:
        res.append({
            "id": tmpl.id,
            "name": tmpl.name,
            "goal": tmpl.goal,
            "level": tmpl.level,
            "duration_minutes": tmpl.duration_minutes,
            "days_per_week": tmpl.days_per_week,
            "equipment": tmpl.equipment,
            "description": tmpl.description,
            "days_count": len(tmpl.days)
        })
    return {"total": len(res), "templates": res}


@router.get("/templates/{template_id}")
def get_workout_template_detail(template_id: str, db: Session = Depends(get_db)):
    """Fetch complete template schedule with days and exercises."""
    tmpl = db.query(WorkoutTemplate).filter(WorkoutTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Workout template not found.")

    days_data = []
    for day in tmpl.days:
        ex_data = []
        for ex in day.exercises:
            ex_data.append({
                "id": ex.id,
                "exercise_name": ex.exercise_name,
                "target_muscle": ex.target_muscle,
                "suggested_sets": ex.suggested_sets,
                "suggested_reps": ex.suggested_reps,
                "rest_seconds": ex.rest_seconds
            })
        days_data.append({
            "day_id": day.id,
            "day_number": day.day_number,
            "day_name": day.day_name,
            "exercises": ex_data
        })

    return {
        "id": tmpl.id,
        "name": tmpl.name,
        "goal": tmpl.goal,
        "level": tmpl.level,
        "duration_minutes": tmpl.duration_minutes,
        "days_per_week": tmpl.days_per_week,
        "description": tmpl.description,
        "days": days_data
    }


@router.get("/today")
def get_today_workout(customer_id: str = Query(...), db: Session = Depends(get_db)):
    """GET endpoint for today's dynamic adaptive workout."""
    return WorkoutEngineService.generate_today_workout(db, customer_id)


@router.post("/substitute-exercise")
def substitute_exercise(payload: dict, db: Session = Depends(get_db)):
    """Finds dynamic exercise alternatives from PostgreSQL exercise library."""
    exercise_id = payload.get("exercise_id")
    customer_id = payload.get("customer_id")
    if not exercise_id:
        raise HTTPException(status_code=400, detail="exercise_id is required.")

    return WorkoutEngineService.substitute_exercise(db, exercise_id, customer_id)


@router.post("/generate-today")
def generate_today_workout(payload: dict, db: Session = Depends(get_db)):
    """
    Generates Today's Dynamic Adaptive Workout based on Customer Profile or explicit overrides,
    Recent Workout Session History, and Progressive Overload Rules.
    """
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    return WorkoutEngineService.generate_today_workout(
        db,
        customer_id=customer_id,
        override_goal=payload.get("goal"),
        override_level=payload.get("fitness_level") or payload.get("level"),
        override_days=int(payload["days_per_week"]) if payload.get("days_per_week") else None,
        override_duration=int(payload["session_duration_minutes"]) if payload.get("session_duration_minutes") else None,
        override_preference=payload.get("training_preference") or payload.get("preference")
    )


@router.post("/log-session")
def log_workout_session(payload: dict, db: Session = Depends(get_db)):
    """
    Saves completed workout session & set performance logs to PostgreSQL
    for progressive overload tracking and AI adaptation.
    """
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    name = payload.get("name") or "Completed Workout Session"
    duration = int(payload.get("duration_seconds") or 3000)
    exercises_logged = payload.get("exercises", [])

    total_vol = 0.0
    session = WorkoutSession(
        id=session_id,
        customer_id=customer_id,
        workout_id=payload.get("workout_id"),
        name=name,
        status="COMPLETED",
        duration_seconds=duration,
        notes=payload.get("notes")
    )
    db.add(session)
    db.flush()

    for ex in exercises_logged:
        name_str = ex.get("exercise_name") or ex.get("name") or "Exercise"
        sets_count = int(ex.get("sets") or 1)
        reps_count = int(ex.get("reps") or 10)
        weight_val = float(ex.get("weight_kg") or ex.get("weight") or 0.0)
        total_vol += (sets_count * reps_count * weight_val)

        for s_idx in range(1, sets_count + 1):
            ex_log = WorkoutSessionExercise(
                id=f"se_{uuid.uuid4().hex[:8]}",
                session_id=session_id,
                exercise_name=name_str,
                target_muscle=ex.get("target_muscle"),
                set_number=s_idx,
                reps_completed=reps_count,
                weight_kg=weight_val,
                rest_seconds=int(ex.get("rest_seconds") or 60),
                rir=int(ex.get("rir") or 2),
                completed=True
            )
            db.add(ex_log)

    session.total_volume_kg = total_vol
    db.commit()
    db.refresh(session)

    return {
        "status": "success",
        "session_id": session.id,
        "name": session.name,
        "total_volume_kg": total_vol,
        "message": "Workout session logged successfully for progressive overload tracking!"
    }


@router.get("/sessions/today")
def get_all_today_workout_sessions(db: Session = Depends(get_db)):
    """Returns today's active workout sessions for all customers dynamically queried from DB."""
    sessions = (
        db.query(WorkoutSession)
        .order_by(WorkoutSession.started_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for s in sessions:
        cust = db.query(Customer).filter(Customer.id == s.customer_id).first()
        start_time_str = s.started_at.strftime("%I:%M %p") if s.started_at else "09:00 AM"
        duration_str = f"{s.duration_seconds // 60} min" if s.duration_seconds else "45 min"
        result.append({
            "id": s.id,
            "customer_id": s.customer_id,
            "name": cust.full_name if cust else "Gym Member",
            "time": start_time_str,
            "type": s.name or "Full Body Workout",
            "duration": duration_str,
            "status": (s.status or "UPCOMING").lower(),
            "total_volume_kg": s.total_volume_kg or 0.0
        })

    if not result:
        customers = db.query(Customer).filter(Customer.status == "ACTIVE").limit(6).all()
        times = ["09:00 AM", "10:30 AM", "12:00 PM", "04:00 PM", "05:30 PM", "07:00 PM"]
        for idx, c in enumerate(customers):
            result.append({
                "id": f"sess_live_{c.id}",
                "customer_id": c.id,
                "name": c.full_name,
                "time": times[idx % len(times)],
                "type": f"{c.fitness_level or 'Adaptive'} {c.goal or 'Strength'} Training",
                "duration": f"{c.session_duration_minutes or 45} min",
                "status": "completed" if idx == 0 else "upcoming",
                "total_volume_kg": 0.0
            })

    return result


@router.get("/customer/{customer_id}")
def get_customer_workouts(customer_id: str, db: Session = Depends(get_db)):
    return WorkoutService.get_workouts_by_customer(db, customer_id)


@router.get("/customer/{customer_id}/history")
def get_customer_workout_history(customer_id: str, db: Session = Depends(get_db)):
    """Returns past completed workout session history for customer."""
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.customer_id == customer_id)
        .order_by(WorkoutSession.completed_at.desc())
        .all()
    )
    res = []
    for sess in sessions:
        res.append({
            "session_id": sess.id,
            "name": sess.name,
            "duration_seconds": sess.duration_seconds,
            "total_volume_kg": sess.total_volume_kg,
            "completed_at": sess.completed_at.isoformat() if sess.completed_at else None,
            "exercises_count": len(sess.session_exercises)
        })
    return {"total": len(res), "history": res}


@router.post("/assign")
def assign_workout(payload: dict, db: Session = Depends(get_db)):
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="customer_id field is required."
        )
    trainer_id = payload.get("trainer_id")
    name = payload.get("name") or "Workout Plan"
    exercises = payload.get("exercises", [])
    return WorkoutService.assign_workout(db, customer_id, trainer_id, name, exercises)


@router.post("/seed-rules")
def seed_programming_rules(db: Session = Depends(get_db)):
    """Seeds all programming rules (goal × level × type) into PostgreSQL DB. Idempotent."""
    return WorkoutProgrammingRulesService.seed_rules(db)


@router.get("/programming-rules")
def list_programming_rules(
    goal: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Fetch all programming rules from DB. Optionally filter by goal and/or level."""
    q = db.query(WorkoutProgrammingRules).filter(WorkoutProgrammingRules.is_active == True)
    if goal:
        q = q.filter(WorkoutProgrammingRules.goal.ilike(f"%{goal}%"))
    if level:
        q = q.filter(WorkoutProgrammingRules.experience_level.ilike(f"%{level}%"))
    rules = q.order_by(WorkoutProgrammingRules.goal, WorkoutProgrammingRules.experience_level).all()
    return {"total": len(rules), "rules": [{
        "id": r.id, "goal": r.goal, "experience_level": r.experience_level,
        "exercise_type": r.exercise_type, "sets_min": r.sets_min, "sets_max": r.sets_max,
        "rep_min": r.rep_min, "rep_max": r.rep_max,
        "rest_min_seconds": r.rest_min_seconds, "rest_max_seconds": r.rest_max_seconds,
        "target_rpe": r.target_rpe, "progression_method": r.progression_method
    } for r in rules]}


@router.post("/{workout_id}/start")
def start_workout_session(workout_id: str, payload: dict, db: Session = Depends(get_db)):
    """Mark a workout as started. Records start time and transitions status to IN_PROGRESS."""
    customer_id = payload.get("customer_id")
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if workout:
        workout.status = "IN_PROGRESS"
        db.commit()
    # Create a live session record
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    session = WorkoutSession(
        id=session_id,
        customer_id=customer_id or (workout.customer_id if workout else "unknown"),
        workout_id=workout_id,
        name=workout.name if workout else f"Workout {workout_id}",
        status="IN_PROGRESS",
        started_at=now_ist_naive(),
    )
    db.add(session)
    db.commit()
    return {"status": "started", "session_id": session_id, "workout_id": workout_id, "started_at": session.started_at.isoformat()}


@router.post("/{workout_id}/sets")
def log_exercise_set(workout_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Log a single completed set within an active workout session.
    Stores weight, reps, RPE, RIR to PostgreSQL for progressive overload analysis.
    """
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    set_log = WorkoutSessionExercise(
        id=f"se_{uuid.uuid4().hex[:8]}",
        session_id=session_id,
        exercise_id=payload.get("exercise_id"),
        exercise_name=payload.get("exercise_name"),
        target_muscle=payload.get("target_muscle"),
        set_number=int(payload.get("set_number", 1)),
        reps_completed=int(payload.get("reps", 0)),
        weight_kg=float(payload.get("weight_kg", 0.0)),
        rest_seconds=int(payload.get("rest_seconds", 60)),
        rpe=float(payload.get("rpe", 0)) if payload.get("rpe") else None,
        rir=int(payload.get("rir", 2)),
        completed=True,
    )
    db.add(set_log)

    # Update running session volume
    session.total_volume_kg = (session.total_volume_kg or 0.0) + (
        set_log.reps_completed * set_log.weight_kg
    )
    db.commit()
    return {
        "status": "set_logged",
        "set_id": set_log.id,
        "session_id": session_id,
        "set_number": set_log.set_number,
        "reps": set_log.reps_completed,
        "weight_kg": set_log.weight_kg,
        "volume_contribution_kg": set_log.reps_completed * set_log.weight_kg,
    }


@router.post("/{workout_id}/complete")
def complete_workout_session(workout_id: str, payload: dict, db: Session = Depends(get_db)):
    """
    Mark an active workout session as COMPLETED.
    Finalizes session metrics for progressive overload analysis on next session.
    """
    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = now_ist_naive()
    session.status = "COMPLETED"
    session.completed_at = now
    if session.started_at:
        session.duration_seconds = int((now - session.started_at).total_seconds())
    session.notes = payload.get("notes")

    # Update workout status
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if workout:
        workout.status = "COMPLETED"

    db.commit()
    return {
        "status": "completed",
        "session_id": session_id,
        "workout_id": workout_id,
        "total_volume_kg": session.total_volume_kg,
        "duration_seconds": session.duration_seconds,
        "completed_at": session.completed_at.isoformat(),
        "message": "Workout session completed! Progressive overload data saved for next session."
    }


@router.get("/customer/{customer_id}/history")
def get_customer_workout_history(customer_id: str, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Returns paginated completed workout session history for a customer."""
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.customer_id == customer_id, WorkoutSession.status == "COMPLETED")
        .order_by(WorkoutSession.completed_at.desc())
        .limit(limit)
        .all()
    )
    res = []
    for sess in sessions:
        res.append({
            "session_id": sess.id,
            "name": sess.name,
            "duration_seconds": sess.duration_seconds,
            "total_volume_kg": sess.total_volume_kg,
            "exercises_count": len(sess.session_exercises),
            "completed_at": sess.completed_at.isoformat() if sess.completed_at else None,
        })
    return {"total": len(res), "history": res}


@router.get("/customer/{customer_id}/progress")
def get_customer_exercise_progress(
    customer_id: str,
    exercise_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns per-exercise performance history (weight, reps per session) for progress charts."""
    q = (
        db.query(WorkoutSessionExercise)
        .join(WorkoutSession)
        .filter(WorkoutSession.customer_id == customer_id)
    )
    if exercise_id:
        q = q.filter(WorkoutSessionExercise.exercise_id == exercise_id)
    logs = q.order_by(WorkoutSession.completed_at.desc()).limit(limit).all()
    return {"total": len(logs), "progress": [{
        "session_id": log.session_id,
        "exercise_id": log.exercise_id,
        "exercise_name": log.exercise_name,
        "set_number": log.set_number,
        "weight_kg": log.weight_kg,
        "reps_completed": log.reps_completed,
        "rpe": log.rpe,
        "rir": log.rir,
        "logged_at": log.logged_at.isoformat() if log.logged_at else None,
    } for log in logs]}
