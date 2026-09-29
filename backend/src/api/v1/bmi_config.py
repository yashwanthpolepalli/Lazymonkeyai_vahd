"""
BMI Classification Config Admin API
====================================
Operators configure classification thresholds once via POST, then update via PATCH.
No default values are assumed anywhere — the system refuses to run scans until this
is explicitly configured.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any

from src.database.session import get_db
from src.services.classification_config_service import ClassificationConfigService

router = APIRouter(prefix="/bmi-config", tags=["BMI Classification Config"])


@router.get("")
def get_bmi_config(db: Session = Depends(get_db)):
    """Return the active BMI classification thresholds, or 404 if not yet configured."""
    config = ClassificationConfigService.get(db)
    if config is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "BMI_CONFIG_NOT_FOUND",
                "message": "BMI classification thresholds are not configured. "
                           "Create them via POST /api/v1/bmi-config before running scans."
            }
        )
    return {
        "status": "success",
        "data": {
            "id":                           config.id,
            "version":                      config.version,
            "bmiUnderweightMax":            config.bmi_underweight_max,
            "bmiNormalMax":                 config.bmi_normal_max,
            "bmiOverweightMax":             config.bmi_overweight_max,
            "bodyFatAthleticMaxMale":       config.body_fat_athletic_max_male,
            "bodyFatAthleticMaxFemale":     config.body_fat_athletic_max_female,
            "bodyFatAthleticMaxOther":      config.body_fat_athletic_max_other,
            "isActive":                     config.is_active,
            "updatedAt":                    config.updated_at.isoformat() if config.updated_at else None,
        }
    }


@router.post("")
def create_bmi_config(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Create the BMI classification thresholds row.
    All fields are required — no defaults are applied.

    Required body fields:
        version (str)
        bmiUnderweightMax (float)
        bmiNormalMax (float)
        bmiOverweightMax (float)
        bodyFatAthleticMaxMale (float)
        bodyFatAthleticMaxFemale (float)
        bodyFatAthleticMaxOther (float)
    """
    required = [
        "version",
        "bmiUnderweightMax", "bmiNormalMax", "bmiOverweightMax",
        "bodyFatAthleticMaxMale", "bodyFatAthleticMaxFemale", "bodyFatAthleticMaxOther",
    ]
    missing = [f for f in required if payload.get(f) is None]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "MISSING_REQUIRED_FIELDS",
                "message": f"All threshold fields are required with no defaults. Missing: {missing}"
            }
        )

    existing = ClassificationConfigService.get(db)
    if existing:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "BMI_CONFIG_ALREADY_EXISTS",
                "message": "A config row already exists. Use PATCH /api/v1/bmi-config to update it."
            }
        )

    data = {
        "id":                          "default",
        "version":                     payload["version"],
        "bmi_underweight_max":         float(payload["bmiUnderweightMax"]),
        "bmi_normal_max":              float(payload["bmiNormalMax"]),
        "bmi_overweight_max":          float(payload["bmiOverweightMax"]),
        "body_fat_athletic_max_male":  float(payload["bodyFatAthleticMaxMale"]),
        "body_fat_athletic_max_female": float(payload["bodyFatAthleticMaxFemale"]),
        "body_fat_athletic_max_other": float(payload["bodyFatAthleticMaxOther"]),
        "is_active":                   True,
        "updated_at":                  None,
    }
    config = ClassificationConfigService.create(db, data)
    return {"status": "success", "data": {"id": config.id, "version": config.version}}


@router.patch("")
def update_bmi_config(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Update one or more BMI classification threshold fields.
    Returns 404 if no config row has been created yet.
    """
    # Map camelCase API keys → snake_case DB column names
    key_map = {
        "version":                    "version",
        "bmiUnderweightMax":          "bmi_underweight_max",
        "bmiNormalMax":               "bmi_normal_max",
        "bmiOverweightMax":           "bmi_overweight_max",
        "bodyFatAthleticMaxMale":     "body_fat_athletic_max_male",
        "bodyFatAthleticMaxFemale":   "body_fat_athletic_max_female",
        "bodyFatAthleticMaxOther":    "body_fat_athletic_max_other",
    }
    patch = {key_map[k]: v for k, v in payload.items() if k in key_map}

    config = ClassificationConfigService.update(db, patch)
    if config is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "BMI_CONFIG_NOT_FOUND",
                "message": "No config row found. Create it first via POST /api/v1/bmi-config."
            }
        )
    return {"status": "success", "data": {"id": config.id, "version": config.version}}
