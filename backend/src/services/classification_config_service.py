"""
ClassificationConfigService
===========================
Loads BMI and body-fat classification thresholds from the `bmi_classification_config`
PostgreSQL table.

There are NO hardcoded fallback values anywhere in this file.

If no active config row exists yet, `get()` returns None.  The caller is
responsible for surfacing a clear error to the operator:

    "BMI classification thresholds are not configured.
     Please set them via Settings → BMI Configuration before running scans."

An operator creates the row once via:
    POST /api/v1/bmi-config    (admin-only endpoint)

After that the values live in the database and can be updated at any time via:
    PATCH /api/v1/bmi-config
"""
from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from src.models.bmi_config import BmiClassificationConfig
from src.utils.timezone import now_ist_naive


class ClassificationConfigService:

    @staticmethod
    def get(db: Session) -> Optional[BmiClassificationConfig]:
        """
        Return the active classification config row, or None if not yet configured.
        No seed, no fallback values, no defaults.
        """
        return (
            db.query(BmiClassificationConfig)
            .filter(BmiClassificationConfig.is_active == True)
            .first()
        )

    @staticmethod
    def create(db: Session, data: dict) -> BmiClassificationConfig:
        """
        Create the classification config row.
        All threshold fields must be supplied explicitly by the caller.
        Required keys:
            id, version,
            bmi_underweight_max, bmi_normal_max, bmi_overweight_max,
            body_fat_athletic_max_male, body_fat_athletic_max_female,
            body_fat_athletic_max_other, is_active
        """
        config = BmiClassificationConfig(**data)
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update(db: Session, patch: dict) -> Optional[BmiClassificationConfig]:
        """
        Partially update an existing classification config row.
        Returns None if no active config row exists yet.
        Only threshold fields and version are patchable.
        """
        _PATCHABLE = {
            "version",
            "bmi_underweight_max",
            "bmi_normal_max",
            "bmi_overweight_max",
            "body_fat_athletic_max_male",
            "body_fat_athletic_max_female",
            "body_fat_athletic_max_other",
        }
        config = ClassificationConfigService.get(db)
        if config is None:
            return None

        for key, value in patch.items():
            if key in _PATCHABLE:
                setattr(config, key, value)

        config.updated_at = now_ist_naive()
        db.commit()
        db.refresh(config)
        return config
