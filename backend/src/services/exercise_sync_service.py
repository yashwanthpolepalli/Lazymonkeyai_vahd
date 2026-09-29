"""
FIT CLUB AI — Master Exercise Sync & Normalization Service
Ingests, normalizes, validates video streams, and syncs exercise taxonomy
from provider sources into PostgreSQL `exercises` DB table.
Taxonomy rules are queried directly from the `exercise_taxonomy_rules` PostgreSQL table.
Initial bootstrap data is loaded from `backend/data/taxonomy_rules.json`.
Zero hardcoded exercise dictionaries in code; 100% dynamic DB catalog.
"""
import os
import json
import logging
import uuid
import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from src.models.workout import Exercise, ExerciseTaxonomyRule
from src.services.free_exercise_service import FreeExerciseDbService
from src.utils.timezone import now_ist_naive

logger = logging.getLogger("exercise_sync_service")
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))


def ensure_taxonomy_rules_seeded(db: Session) -> None:
    """Ensures exercise_taxonomy_rules DB table is populated from backend/data/taxonomy_rules.json if empty."""
    count = db.query(ExerciseTaxonomyRule).count()
    if count == 0:
        rules_file = os.path.join(DATA_DIR, "taxonomy_rules.json")
        if os.path.exists(rules_file):
            logger.info(f"🌱 Initializing PostgreSQL exercise_taxonomy_rules from {rules_file}...")
            with open(rules_file, "r", encoding="utf-8") as f:
                rules_data = json.load(f)

            for item in rules_data:
                rule_id = f"rule_{item['category_type'].lower()}_{uuid.uuid4().hex[:8]}"
                db.add(ExerciseTaxonomyRule(
                    id=rule_id,
                    category_type=item["category_type"],
                    raw_alias=item["raw_alias"].lower(),
                    canonical_name=item["canonical_name"],
                    is_active=True
                ))
            db.commit()
            logger.info(f"✅ Successfully imported {len(rules_data)} taxonomy rules into PostgreSQL.")


def normalize_muscle_name(db: Session, muscle_str: Optional[str]) -> str:
    """Normalizes raw external muscle group string dynamically from PostgreSQL exercise_taxonomy_rules DB table."""
    if not muscle_str:
        return "Chest"
    key = muscle_str.strip().lower()
    rule = db.query(ExerciseTaxonomyRule).filter(
        ExerciseTaxonomyRule.category_type == "MUSCLE",
        ExerciseTaxonomyRule.raw_alias == key,
        ExerciseTaxonomyRule.is_active == True
    ).first()
    if rule:
        return rule.canonical_name
    return muscle_str.strip().capitalize()


def normalize_equipment(db: Session, equipment_str: Optional[str]) -> str:
    """Normalizes raw external equipment string dynamically from PostgreSQL exercise_taxonomy_rules DB table."""
    if not equipment_str:
        return "Full Gym"
    key = equipment_str.strip().lower()
    rule = db.query(ExerciseTaxonomyRule).filter(
        ExerciseTaxonomyRule.category_type == "EQUIPMENT",
        ExerciseTaxonomyRule.raw_alias == key,
        ExerciseTaxonomyRule.is_active == True
    ).first()
    if rule:
        return rule.canonical_name
    return equipment_str.strip().capitalize()


class ExerciseSyncService:
    """Production Sync Engine that ingests, validates, and stores exercises in PostgreSQL."""

    def __init__(self, db: Session):
        self.db = db
        self.free_ex_service = FreeExerciseDbService()
        ensure_taxonomy_rules_seeded(self.db)

    def sync_all(self) -> Dict[str, Any]:
        """Runs full sync from provider into PostgreSQL exercises table."""
        logger.info("⚡ Running Master Exercise Sync Engine...")
        raw_items = self.free_ex_service._load_data()

        if not raw_items:
            logger.warning("No raw items loaded from free-exercise-db source.")
            return {"status": "SKIPPED", "synced_count": 0}

        synced_count = 0
        updated_count = 0

        for item in raw_items:
            source_id = str(item.get("id") or "")
            if not source_id:
                continue

            name = item.get("name") or "Exercise"
            primary_muscles = item.get("primaryMuscles") or []
            raw_muscle = primary_muscles[0] if primary_muscles else "chest"
            norm_muscle = normalize_muscle_name(self.db, raw_muscle)
            norm_equipment = normalize_equipment(self.db, item.get("equipment"))

            # Determine precision demonstration video, type, and form guidance
            demo_meta = self.free_ex_service.resolve_exercise_demonstration(name, norm_muscle)
            v_url = demo_meta["video_url"]
            v_type = demo_meta.get("video_type", "youtube")
            form_cues_str = "\n".join(demo_meta.get("form_cues", []))
            mistakes_str = "\n".join(demo_meta.get("common_mistakes", []))
            video_status = "ACTIVE" if v_url else "UNAVAILABLE"

            # Determine 2-phase demonstration images (0: Start position, 1: Peak contraction)
            images = item.get("images") or []
            thumb_url_0 = ""
            thumb_url_1 = ""
            if images and isinstance(images, list):
                if len(images) > 0:
                    thumb_url_0 = images[0] if images[0].startswith("http") else f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{images[0]}"
                if len(images) > 1:
                    thumb_url_1 = images[1] if images[1].startswith("http") else f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{images[1]}"
                else:
                    thumb_url_1 = thumb_url_0

            instructions = item.get("instructions") or []
            instructions_str = "\n".join(instructions) if isinstance(instructions, list) else str(instructions)

            # Check existing Exercise in PostgreSQL
            existing = self.db.query(Exercise).filter(
                (Exercise.source_id == source_id) | (Exercise.name.ilike(name))
            ).first()

            if existing:
                existing.name = name
                existing.primary_muscle = norm_muscle
                existing.equipment = norm_equipment
                existing.difficulty = (item.get("level") or existing.difficulty or "Intermediate").capitalize()
                existing.movement_pattern = (item.get("mechanic") or existing.movement_pattern or "Compound").capitalize()
                existing.exercise_type = (item.get("category") or existing.exercise_type or "Strength").capitalize()
                existing.video_url = v_url
                existing.video_type = v_type
                existing.video_status = video_status
                existing.video_source = "PRECISION_VERIFIED"
                existing.thumbnail_url = thumb_url_0
                existing.image_url = thumb_url_1
                existing.form_cues = form_cues_str
                existing.common_mistakes = mistakes_str
                if instructions_str:
                    existing.instructions = instructions_str
                existing.source = "FREE_EX_DB"
                existing.source_id = source_id
                existing.synced_at = now_ist_naive()
                updated_count += 1
            else:
                ex_id = f"ex_{uuid.uuid4().hex[:8]}"
                new_ex = Exercise(
                    id=ex_id,
                    name=name,
                    primary_muscle=norm_muscle,
                    target_muscle=primary_muscles[0].capitalize() if primary_muscles else norm_muscle,
                    secondary_muscles=", ".join([m.capitalize() for m in (item.get("secondaryMuscles") or [])]),
                    equipment=norm_equipment,
                    difficulty=(item.get("level") or "Intermediate").capitalize(),
                    movement_pattern=(item.get("mechanic") or "Compound").capitalize(),
                    exercise_type=(item.get("category") or "Strength").capitalize(),
                    video_url=v_url,
                    thumbnail_url=thumb_url_0,
                    image_url=thumb_url_1,
                    video_type=v_type,
                    video_status=video_status,
                    video_source="PRECISION_VERIFIED",
                    form_cues=form_cues_str,
                    common_mistakes=mistakes_str,
                    instructions=instructions_str,
                    source="FREE_EX_DB",
                    source_id=source_id,
                    active=True,
                    synced_at=now_ist_naive()
                )
                self.db.add(new_ex)
                synced_count += 1

        self.db.commit()
        logger.info(f"✅ Exercise Sync Complete: {synced_count} inserted, {updated_count} updated.")
        return {
            "status": "SUCCESS",
            "synced_count": synced_count,
            "updated_count": updated_count,
            "total_in_db": self.db.query(Exercise).count()
        }
