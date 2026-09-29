from src.utils.timezone import now_ist_naive
import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from src.database.base import Base


class Exercise(Base):
    """Layer 1: Canonical Master Exercise Library stored in PostgreSQL DB."""
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, index=True)
    external_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    form_cues = Column(Text, nullable=True)
    common_mistakes = Column(Text, nullable=True)
    primary_muscle = Column(String, nullable=False, index=True)    # Chest, Back, Quads, Hamstrings, Shoulders, Biceps, Triceps, Abs
    target_muscle = Column(String, nullable=True, index=True)
    secondary_muscles = Column(String, nullable=True)              # e.g., "Triceps, Front Delts"
    body_part = Column(String, nullable=True)                       # Upper Body, Lower Body, Core
    equipment = Column(String, nullable=False, default="Full Gym") # Barbell, Dumbbell, Cable, Machine, Bodyweight
    difficulty = Column(String, default="Intermediate")            # Beginner, Intermediate, Advanced
    movement_pattern = Column(String, nullable=True, index=True)   # Push, Pull, Squat, Hinge, Lunge, Carry
    exercise_type = Column(String, default="Strength")             # Strength, Cardio, Mobility, Hypertrophy
    video_url = Column(String, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    video_type = Column(String, nullable=True, default="mp4")      # mp4, webm, hls, embed
    video_status = Column(String, nullable=False, default="ACTIVE") # ACTIVE, UNAVAILABLE, PROCESSING, EXPIRED
    video_source = Column(String, nullable=True, default="MASTER") # MUSCLEWIKI, WGER, FREE_EX_DB, CUSTOM
    source = Column(String, default="FIT_CLUB_MASTER")
    source_id = Column(String, nullable=True)
    synced_at = Column(DateTime, nullable=True, default=now_ist_naive)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class TrainingSplit(Base):
    """Layer 2: Configurable Training Split Data Model (FULL_BODY, PPL, UPPER_LOWER, SINGLE_MUSCLE, COMBINATION, CUSTOM)."""
    __tablename__ = "training_splits"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)            # FULL_BODY, PPL, UPPER_LOWER, SINGLE_MUSCLE, COMBINATION, CUSTOM
    description = Column(Text, nullable=True)
    min_days = Column(Integer, default=1)
    max_days = Column(Integer, default=6)
    recommended_level = Column(String, default="Intermediate")
    active = Column(Boolean, default=True)
    tenant_id = Column(String, nullable=True)                      # Multi-tenant isolation
    created_at = Column(DateTime, default=now_ist_naive)

    days = relationship("TrainingSplitDay", back_populates="split", cascade="all, delete-orphan")


class TrainingSplitDay(Base):
    """Day definitions for a Training Split (e.g., Push A, Pull A, Legs A, Push B...)."""
    __tablename__ = "training_split_days"

    id = Column(String, primary_key=True, index=True)
    split_id = Column(String, ForeignKey("training_splits.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False)                         # e.g., "Push A", "Upper Body", "Chest + Triceps"
    muscle_groups = Column(String, nullable=False)                # e.g., "Chest, Shoulders, Triceps"

    split = relationship("TrainingSplit", back_populates="days")


class WorkoutTemplate(Base):
    """Layer 2: Master Workout Templates created by FIT CLUB Admins/Trainers."""
    __tablename__ = "workout_templates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    goal = Column(String, nullable=False, index=True)
    level = Column(String, default="Intermediate")
    duration_minutes = Column(Integer, default=60)
    days_per_week = Column(Integer, default=4)
    equipment = Column(String, default="Full Gym")
    description = Column(Text, nullable=True)
    creator_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)

    days = relationship("WorkoutTemplateDay", back_populates="template", cascade="all, delete-orphan")


class WorkoutTemplateDay(Base):
    """Day schedules within a Workout Template."""
    __tablename__ = "workout_template_days"

    id = Column(String, primary_key=True, index=True)
    template_id = Column(String, ForeignKey("workout_templates.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, default=1)
    day_name = Column(String, nullable=False)

    template = relationship("WorkoutTemplate", back_populates="days")
    exercises = relationship("WorkoutTemplateExercise", back_populates="template_day", cascade="all, delete-orphan")


class WorkoutTemplateExercise(Base):
    """Exercises assigned to a specific Template Day."""
    __tablename__ = "workout_template_exercises"

    id = Column(String, primary_key=True, index=True)
    template_day_id = Column(String, ForeignKey("workout_template_days.id"), nullable=False, index=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=True)
    exercise_name = Column(String, nullable=False)
    target_muscle = Column(String, nullable=True)
    suggested_sets = Column(Integer, default=4)
    suggested_reps = Column(Integer, default=10)
    rest_seconds = Column(Integer, default=60)

    template_day = relationship("WorkoutTemplateDay", back_populates="exercises")


class WorkoutProgram(Base):
    """Layer 3: Configurable Workout Program combining Goals, Levels, Splits, & Duration."""
    __tablename__ = "workout_programs"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)             # e.g., "12-Week Muscle Gain PPL"
    description = Column(Text, nullable=True)
    goal = Column(String, nullable=False, index=True)             # Fat Loss, Muscle Gain, Hypertrophy, Strength, Bulk, Cut, Lean, General Fitness
    training_split_id = Column(String, ForeignKey("training_splits.id"), nullable=True)
    experience_level = Column(String, default="Intermediate")     # Beginner, Intermediate, Advanced
    duration_weeks = Column(Integer, default=12)
    days_per_week = Column(Integer, default=4)
    session_duration_minutes = Column(Integer, default=60)
    equipment = Column(String, default="Full Gym")
    difficulty = Column(String, default="Intermediate")
    progression_strategy = Column(String, default="double_progression") # linear, double_progression, volume_progression, RIR_based, manual_trainer
    active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    tenant_id = Column(String, default="global")                  # Multi-tenant isolation
    created_at = Column(DateTime, default=now_ist_naive)

    split = relationship("TrainingSplit")
    weeks = relationship("WorkoutProgramWeek", back_populates="program", cascade="all, delete-orphan")


class WorkoutProgramWeek(Base):
    """Weeks within a Workout Program (Week 1, Week 2... Week 12)."""
    __tablename__ = "workout_program_weeks"

    id = Column(String, primary_key=True, index=True)
    program_id = Column(String, ForeignKey("workout_programs.id"), nullable=False, index=True)
    week_number = Column(Integer, nullable=False, default=1)
    week_name = Column(String, nullable=False)                    # e.g., "Week 1 - Base Adaptation"

    program = relationship("WorkoutProgram", back_populates="weeks")
    days = relationship("WorkoutProgramDay", back_populates="week", cascade="all, delete-orphan")


class WorkoutProgramDay(Base):
    """Days within a Program Week."""
    __tablename__ = "workout_program_days"

    id = Column(String, primary_key=True, index=True)
    program_week_id = Column(String, ForeignKey("workout_program_weeks.id"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False, default=1)
    day_name = Column(String, nullable=False)                    # e.g., "Day 1 - Push A"
    split_day_id = Column(String, ForeignKey("training_split_days.id"), nullable=True)

    week = relationship("WorkoutProgramWeek", back_populates="days")
    exercises = relationship("WorkoutProgramExercise", back_populates="program_day", cascade="all, delete-orphan")


class WorkoutProgramExercise(Base):
    """Exercises assigned to a Program Day (Strict Exercise ID references, zero name duplication)."""
    __tablename__ = "workout_program_exercises"

    id = Column(String, primary_key=True, index=True)
    program_day_id = Column(String, ForeignKey("workout_program_days.id"), nullable=False, index=True)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False, index=True)
    order_index = Column(Integer, default=1)
    sets = Column(Integer, default=4)
    reps_min = Column(Integer, default=8)
    reps_max = Column(Integer, default=12)
    target_reps = Column(Integer, default=10)
    rest_seconds = Column(Integer, default=60)
    rir = Column(Integer, default=2)                             # Reps In Reserve
    tempo = Column(String, default="2-0-2-0")
    notes = Column(Text, nullable=True)
    superset_group = Column(String, nullable=True)

    program_day = relationship("WorkoutProgramDay", back_populates="exercises")
    exercise = relationship("Exercise")


class CustomerProgramAssignment(Base):
    """Customer Program Assignment (Priority Hierarchy: Trainer Assigned > Customer Selected > AI Recommended)."""
    __tablename__ = "customer_program_assignments"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    program_id = Column(String, ForeignKey("workout_programs.id"), nullable=False, index=True)
    assigned_by = Column(String, default="AI")                   # TRAINER, CUSTOMER, AI
    current_week = Column(Integer, default=1)
    current_day = Column(Integer, default=1)
    status = Column(String, default="ACTIVE")                    # ACTIVE, COMPLETED, PAUSED
    start_date = Column(DateTime, default=now_ist_naive)
    tenant_id = Column(String, default="global")

    customer = relationship("Customer")
    program = relationship("WorkoutProgram")


class Workout(Base):
    """Active/Scheduled Daily Workout Plan assigned to a Customer."""
    __tablename__ = "workouts"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    trainer_id = Column(String, ForeignKey("users.id"), nullable=True)
    program_id = Column(String, ForeignKey("workout_programs.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    goal = Column(String, nullable=True)
    difficulty = Column(String, default="Intermediate")
    duration = Column(Integer, default=60)  # minutes
    status = Column(String, default="SCHEDULED")  # SCHEDULED, COMPLETED, IN_PROGRESS
    created_at = Column(DateTime, default=now_ist_naive)

    customer = relationship("Customer", back_populates="workouts")
    exercises = relationship("WorkoutExercise", back_populates="workout", cascade="all, delete-orphan")


class WorkoutExercise(Base):
    """Exercises within a Scheduled Workout (Strict Exercise ID references)."""
    __tablename__ = "workout_exercises"

    id = Column(String, primary_key=True, index=True)
    workout_id = Column(String, ForeignKey("workouts.id"), index=True, nullable=False)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=False, index=True)
    order_index = Column(Integer, default=1)
    sets = Column(Integer, default=4)
    reps = Column(Integer, default=10)
    weight = Column(Float, default=0.0)
    rest_seconds = Column(Integer, default=60)
    rir = Column(Integer, default=2)
    completed = Column(Boolean, default=False)

    workout = relationship("Workout", back_populates="exercises")
    exercise = relationship("Exercise")


class WorkoutSession(Base):
    """Completed Workout Session Performance Logs for AI Progressive Overload."""
    __tablename__ = "workout_sessions"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), index=True, nullable=False)
    workout_id = Column(String, ForeignKey("workouts.id"), nullable=True)
    program_id = Column(String, ForeignKey("workout_programs.id"), nullable=True)
    name = Column(String, nullable=False)
    status = Column(String, default="COMPLETED")
    duration_seconds = Column(Integer, default=3000)
    total_volume_kg = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime, default=now_ist_naive)
    completed_at = Column(DateTime, default=now_ist_naive)

    session_exercises = relationship("WorkoutSessionExercise", back_populates="session", cascade="all, delete-orphan")


class WorkoutSessionExercise(Base):
    """Individual Set Performance Logs within a Workout Session."""
    __tablename__ = "workout_session_exercises"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("workout_sessions.id"), index=True, nullable=False)
    exercise_id = Column(String, ForeignKey("exercises.id"), nullable=True, index=True)
    exercise_name = Column(String, nullable=True)           # Denormalized name for display
    target_muscle = Column(String, nullable=True)           # Denormalized muscle for display
    set_number = Column(Integer, nullable=False, default=1)
    reps_completed = Column(Integer, nullable=False, default=10)
    weight_kg = Column(Float, nullable=False, default=0.0)
    rest_seconds = Column(Integer, default=60)
    rpe = Column(Float, nullable=True)                      # Rate of Perceived Exertion (1-10)
    rir = Column(Integer, default=2)                        # Reps In Reserve
    completed = Column(Boolean, default=True)
    logged_at = Column(DateTime, default=now_ist_naive)

    session = relationship("WorkoutSession", back_populates="session_exercises")
    exercise = relationship("Exercise")


class WorkoutProgrammingRules(Base):
    """
    Database-driven Set/Rep/Rest Programming Rules.
    Replaces ALL hardcoded sets:4, reps:10, rest:60 values in the workout engine.
    Engine queries this table for every exercise recommendation.
    """
    __tablename__ = "workout_programming_rules"

    id = Column(String, primary_key=True, index=True)
    goal = Column(String, nullable=False, index=True)           # Muscle Gain, Fat Loss, Strength, Hypertrophy, etc.
    experience_level = Column(String, nullable=False, index=True) # Beginner, Intermediate, Advanced, Elite
    exercise_type = Column(String, nullable=False, index=True)  # Strength, Hypertrophy, Cardio, Mobility
    sets_min = Column(Integer, nullable=False, default=3)
    sets_max = Column(Integer, nullable=False, default=4)
    rep_min = Column(Integer, nullable=False, default=8)
    rep_max = Column(Integer, nullable=False, default=12)
    rest_min_seconds = Column(Integer, nullable=False, default=60)
    rest_max_seconds = Column(Integer, nullable=False, default=90)
    target_rpe = Column(Float, nullable=True)                   # e.g., 7.5 for moderate intensity
    progression_method = Column(String, default="double_progression") # double_progression, linear, volume, rir_based
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)

    __table_args__ = (
        UniqueConstraint("goal", "experience_level", "exercise_type", name="uq_programming_rules"),
    )


class CustomerWorkoutPreferences(Base):
    """
    Per-customer workout configuration preferences stored in PostgreSQL.
    Decouples customer workout setup from Customer model for clean separation.
    """
    __tablename__ = "customer_workout_preferences"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, unique=True, index=True)
    split_id = Column(String, ForeignKey("training_splits.id"), nullable=True, index=True)
    primary_goal = Column(String, nullable=True)                # Muscle Gain, Fat Loss, Strength...
    secondary_goal = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)            # Beginner, Intermediate, Advanced
    training_days_per_week = Column(Integer, nullable=True)
    preferred_session_duration_minutes = Column(Integer, nullable=True)
    available_equipment = Column(String, nullable=True)         # Full Gym, Dumbbells Only, Bodyweight, Home Gym
    weight_unit = Column(String, default="kg")                  # kg or lbs
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    customer = relationship("Customer")
    split = relationship("TrainingSplit")


class ExerciseTaxonomyRule(Base):
    """
    Database-driven Exercise Taxonomy & Normalization Rules table.
    Replaces static Python dictionary maps in code.
    Allows Admins/Operators to dynamically register muscle aliases and equipment mappings.
    """
    __tablename__ = "exercise_taxonomy_rules"

    id = Column(String, primary_key=True, index=True)
    category_type = Column(String, nullable=False, index=True) # MUSCLE, EQUIPMENT, MOVEMENT
    raw_alias = Column(String, nullable=False, unique=True, index=True)
    canonical_name = Column(String, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)

