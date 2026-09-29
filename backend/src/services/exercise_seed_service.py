"""
FIT CLUB AI — Master JSON Dataset Import & Seeder Service
Reads dataset files from `backend/data/` (exercises, training_splits, workout_programs)
and populates PostgreSQL DB without hardcoded Python constants.
"""
import os
import json
import uuid
from sqlalchemy.orm import Session
from src.models.workout import (
    Exercise, TrainingSplit, TrainingSplitDay, WorkoutProgram,
    WorkoutProgramWeek, WorkoutProgramDay, WorkoutProgramExercise
)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))


def seed_master_exercises_and_templates(db: Session):
    """Imports exercises, splits, and programs from `backend/data/` JSON files into PostgreSQL DB."""
    # 1. Import Exercises from backend/data/exercises/catalog.json
    ex_file = os.path.join(DATA_DIR, "exercises", "catalog.json")
    if os.path.exists(ex_file) and db.query(Exercise).count() == 0:
        print("🌱 Importing Master Exercise Library from backend/data/exercises/catalog.json...")
        with open(ex_file, "r", encoding="utf-8") as f:
            exercises_data = json.load(f)

        for ex in exercises_data:
            exercise = Exercise(
                id=ex.get("id") or f"ex_{uuid.uuid4().hex[:8]}",
                name=ex["name"],
                primary_muscle=ex["primary_muscle"],
                secondary_muscles=ex.get("secondary_muscles"),
                body_part=ex.get("body_part"),
                equipment=ex.get("equipment", "Full Gym"),
                difficulty=ex.get("difficulty", "Intermediate"),
                movement_pattern=ex.get("movement_pattern"),
                exercise_type=ex.get("exercise_type", "Strength"),
                instructions=ex.get("instructions"),
                form_cues=ex.get("form_cues"),
                common_mistakes=ex.get("common_mistakes")
            )
            db.add(exercise)
        db.commit()
        print(f"✅ Successfully Imported {len(exercises_data)} Exercises into PostgreSQL!")

    # 2. Import Training Splits from backend/data/training_splits/splits.json
    splits_file = os.path.join(DATA_DIR, "training_splits", "splits.json")
    if os.path.exists(splits_file) and db.query(TrainingSplit).count() == 0:
        print("🌱 Importing Configurable Training Splits from backend/data/training_splits/splits.json...")
        with open(splits_file, "r", encoding="utf-8") as f:
            splits_data = json.load(f)

        for s in splits_data:
            split_obj = TrainingSplit(
                id=s.get("id") or f"split_{uuid.uuid4().hex[:8]}",
                name=s["name"],
                description=s.get("description"),
                min_days=s.get("min_days", 1),
                max_days=s.get("max_days", 6),
                recommended_level=s.get("recommended_level", "Intermediate")
            )
            db.add(split_obj)
            db.flush()

            for d in s.get("days", []):
                # Generate deterministic slug-based ID matching programs.json references
                # e.g. "Push A" -> "push_a", "Legs B" -> "legs_b"
                day_slug = d["name"].strip().lower().replace(" ", "_").replace("+", "and").replace("/", "_")
                day_id = f"{s['id']}_{day_slug}"
                db.add(TrainingSplitDay(
                    id=day_id,
                    split_id=split_obj.id,
                    day_number=d["day_number"],
                    name=d["name"],
                    muscle_groups=d["muscle_groups"]
                ))

        db.commit()
        print(f"✅ Successfully Imported {len(splits_data)} Training Splits into PostgreSQL!")

    # 3. Import Workout Programs from backend/data/workout_programs/programs.json
    progs_file = os.path.join(DATA_DIR, "workout_programs", "programs.json")
    if os.path.exists(progs_file) and db.query(WorkoutProgram).count() == 0:
        print("🌱 Importing Workout Programs from backend/data/workout_programs/programs.json...")
        with open(progs_file, "r", encoding="utf-8") as f:
            programs_data = json.load(f)

        for p in programs_data:
            prog_obj = WorkoutProgram(
                id=p.get("id") or f"prog_{uuid.uuid4().hex[:8]}",
                name=p["name"],
                goal=p["goal"],
                experience_level=p.get("experience_level", "Intermediate"),
                training_split_id=p.get("split_id"),
                duration_weeks=p.get("duration_weeks", 12),
                days_per_week=p.get("days_per_week", 4),
                session_duration_minutes=p.get("session_duration_minutes", 60),
                equipment=p.get("equipment", "Full Gym"),
                description=p.get("description")
            )
            db.add(prog_obj)
            db.flush()

            # Create Week 1
            week_obj = WorkoutProgramWeek(
                id=f"pw_{prog_obj.id}_w1",
                program_id=prog_obj.id,
                week_number=1,
                week_name="Week 1 - Base Adaptation"
            )
            db.add(week_obj)
            db.flush()

            for d in p.get("days", []):
                day_obj = WorkoutProgramDay(
                    id=f"pd_{prog_obj.id}_d{d['day_number']}",
                    program_week_id=week_obj.id,
                    day_number=d["day_number"],
                    day_name=d["day_name"],
                    split_day_id=d.get("split_day_id")
                )
                db.add(day_obj)
                db.flush()

                for ex in d.get("exercises", []):
                    db.add(WorkoutProgramExercise(
                        id=f"pe_{uuid.uuid4().hex[:8]}",
                        program_day_id=day_obj.id,
                        exercise_id=ex["exercise_id"],
                        order_index=ex.get("order_index", 1),
                        sets=ex.get("sets", 4),
                        reps_min=ex.get("reps_min", 8),
                        reps_max=ex.get("reps_max", 12),
                        target_reps=ex.get("target_reps", 10),
                        rest_seconds=ex.get("rest_seconds", 60),
                        rir=ex.get("rir", 2)
                    ))

        db.commit()
        print(f"✅ Successfully Imported {len(programs_data)} Workout Programs into PostgreSQL!")
