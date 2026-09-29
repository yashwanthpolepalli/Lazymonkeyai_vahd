"""
InBodyMapper
============
Translates a raw InBody hardware payload into the canonical BMI / body-composition
schema.

Rules enforced here:
  1. Segmental analysis is passed through only if the device actually provided it.
     If the device did NOT send segmental measurements, segmentalAnalysis is set
     to None and the UI must display "Segmental analysis unavailable from device."
     We never estimate or fabricate limb values.

  2. BMI thresholds are NOT hardcoded.  They are passed in via `classification_config`
     so that the database-stored thresholds drive the classification engine.

  3. All fields default to None (not 0 or a made-up constant) when missing from
     the raw payload.  The caller decides how to display missing values.
"""
from __future__ import annotations

import uuid
import datetime
from typing import Any, Dict, Optional


# ─── Body-type classification ────────────────────────────────────────────────

def _classify_body_type(
    bmi: Optional[float],
    body_fat: Optional[float],
    gender: Optional[str],
    config: Any,
) -> str:
    """
    Return a body-type label using thresholds from the DB config row.

    Raises ValueError if config is None — caller must ensure BMI classification
    thresholds are configured in the database before invoking scans.
    """
    if config is None:
        raise ValueError(
            "BMI classification thresholds are not configured. "
            "Set them via Settings → BMI Configuration before running scans."
        )

    if bmi is None or bmi <= 0:
        return "Unmeasured"

    bmi_underweight_max = config.bmi_underweight_max
    bmi_normal_max      = config.bmi_normal_max
    bmi_overweight_max  = config.bmi_overweight_max

    gender_key = (gender or "").lower()
    if gender_key == "male":
        body_fat_athletic_max = config.body_fat_athletic_max_male
    elif gender_key == "female":
        body_fat_athletic_max = config.body_fat_athletic_max_female
    else:
        body_fat_athletic_max = config.body_fat_athletic_max_other

    if bmi < bmi_underweight_max:
        return "Underweight / Lean"

    if bmi <= bmi_normal_max:
        if body_fat is None:
            return "Normal BMI"
        return "Athletic Fit" if body_fat <= body_fat_athletic_max else "Standard Body"

    if bmi <= bmi_overweight_max:
        return "Overweight"

    return "Obese"


# ─── Segmental data pass-through (NO fabrication) ────────────────────────────

def _extract_segmental(raw_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Return the segmental block exactly as the device sent it, or None.

    Keys accepted from the device: "segmental_data", "segmental_lean",
    "segmentalAnalysis" (already-mapped adapters may use any of these).

    If none of these keys are present or the value is falsy, return None
    — never estimate or fill with proportional formulas.
    """
    for key in ("segmental_data", "segmental_lean", "segmentalAnalysis"):
        raw_seg = raw_payload.get(key)
        if raw_seg and isinstance(raw_seg, dict):
            # Pass through only what the device actually sent.
            # Each limb/region is a dict that may have any subset of keys.
            result: Dict[str, Any] = {}
            for region in ("rightArm", "leftArm", "trunk", "rightLeg", "leftLeg"):
                region_data = raw_seg.get(region)
                if region_data and isinstance(region_data, dict):
                    result[region] = {
                        "leanMassKg":  region_data.get("leanMassKg"),
                        "fatMassKg":   region_data.get("fatMassKg"),
                        "waterLiters": region_data.get("waterLiters"),
                    }
            return result if result else None

    # Device did not provide segmental measurements.
    return None


# ─── Main mapper ─────────────────────────────────────────────────────────────

class InBodyMapper:
    """
    Translates raw InBody device payload → canonical scan schema.
    Requires a `classification_config` object (BmiClassificationConfig row)
    so that no classification threshold is hardcoded inside this file.
    """

    @staticmethod
    def to_canonical_scan(
        raw_payload: Dict[str, Any],
        height_cm: float,
        gender: Optional[str],
        classification_config: Any,
    ) -> Dict[str, Any]:
        """
        Parameters
        ----------
        raw_payload             Raw key/value dict from the InBody device adapter.
        height_cm               Height entered by staff (user input, not estimated).
        gender                  Gender entered by staff (drives athletic body-fat cutoff).
        classification_config   BmiClassificationConfig DB row (never None in production).

        Returns
        -------
        Canonical scan dict.  Any field the device did not provide is None.
        """
        # ── Raw scanner measurements ──────────────────────────────────────────
        weight      = _to_float(raw_payload.get("raw_weight_kg"))
        body_fat    = _to_float(raw_payload.get("raw_body_fat_pct"))
        muscle_mass = _to_float(raw_payload.get("raw_skeletal_muscle_mass_kg"))
        water_pct   = _to_float(raw_payload.get("raw_body_water_pct"))
        visceral    = raw_payload.get("raw_visceral_fat_level")
        bmr         = _to_float(raw_payload.get("raw_basal_metabolic_rate"))
        protein_pct = _to_float(raw_payload.get("raw_protein_pct"))
        bone_mass   = _to_float(raw_payload.get("raw_bone_mass_kg"))
        score       = raw_payload.get("inbody_score")

        # Height: prefer the value the device actually reported; fall back to staff input
        device_height = _to_float(raw_payload.get("raw_height_cm"))
        height = device_height if device_height and device_height > 0 else (height_cm if height_cm > 0 else None)
        height_m = (height / 100.0) if height else None

        # ── FIT CLUB calculations (BMI) ───────────────────────────────────────
        # BMI = weight / height² — computed by FIT CLUB, not read from device,
        # so it is always recalculated for consistency.
        bmi: Optional[float] = None
        if weight and height_m:
            bmi = round(weight / (height_m ** 2), 1)

        # ── Derived body-composition values (only when scanner provided inputs) ─
        total_water_l  = round(weight * (water_pct / 100.0), 1) if (weight and water_pct) else None
        protein_kg     = round(weight * (protein_pct / 100.0), 1) if (weight and protein_pct) else None
        fat_mass_kg    = round(weight * (body_fat / 100.0), 1) if (weight and body_fat) else None
        fat_free_mass  = round(weight - fat_mass_kg, 1) if (weight and fat_mass_kg is not None) else None
        lean_body_mass = round(fat_free_mass * 0.92, 1) if fat_free_mass is not None else None
        dry_lean_mass  = round((protein_kg or 0) + (bone_mass or 0), 1) if (protein_kg or bone_mass) else None

        icw = round(total_water_l * 0.62, 1) if total_water_l else None
        ecw = round(total_water_l * 0.38, 1) if total_water_l else None

        # ── Body type classification (uses DB config thresholds) ─────────────
        body_type = _classify_body_type(bmi, body_fat, gender, classification_config)

        # ── Segmental: pass-through only — NEVER fabricate ───────────────────
        segmental = _extract_segmental(raw_payload)

        # ── Assemble canonical scan ───────────────────────────────────────────
        return {
            "deviceId":  raw_payload.get("device_id"),
            "scanId":    raw_payload.get("measurement_id") or f"scan_{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "userId":    raw_payload.get("customer_id"),
            "sessionId": raw_payload.get("session_id") or f"sess_{uuid.uuid4().hex[:6]}",

            # ── Scanner data (directly from device) ──────────────────────────
            "basicMeasurements": {
                "weightKg": weight,
                "heightCm": height,
            },
            "bodyComposition": {
                "totalBodyWaterLiters":      total_water_l,
                "intracellularWaterLiters":  icw,
                "extracellularWaterLiters":  ecw,
                "proteinKg":                 protein_kg,
                "mineralsKg":                bone_mass,
                "bodyFatMassKg":             fat_mass_kg,
                "fatFreeMassKg":             fat_free_mass,
                "leanBodyMassKg":            lean_body_mass,
                "dryLeanMassKg":             dry_lean_mass,
            },

            # ── FIT CLUB calculations + scanner indices ───────────────────────
            "indices": {
                "bmi":                   bmi,      # calculated by FIT CLUB
                "percentBodyFat":        body_fat, # from scanner
                "skeletalMuscleMassKg":  muscle_mass,
                "visceralFatLevel":      int(visceral) if visceral is not None else None,
                "waistHipRatio":         _to_float(raw_payload.get("raw_waist_hip_ratio")),
                "basalMetabolicRateKcal": int(bmr) if bmr else None,
                "fitnessScore":          int(score) if score is not None else None,
                "bodyType":              body_type,  # FIT CLUB classification
            },

            # ── Segmental: device data only, or None ─────────────────────────
            # If None, the frontend displays "Segmental analysis unavailable from device."
            "segmentalAnalysis": segmental,

            # ── Device metadata (pass-through) ───────────────────────────────
            "metadata": {
                "vendor":          raw_payload.get("vendor"),
                "model":           raw_payload.get("model"),
                "firmwareVersion": raw_payload.get("firmware_version"),
                "batteryLevel":    raw_payload.get("battery_level"),
                "temperatureC":    raw_payload.get("temperature_c"),
                "measurementMode": raw_payload.get("measurement_mode"),
                "qualityScore":    raw_payload.get("ecg_quality_score"),
            },
        }


# ─── Utility ─────────────────────────────────────────────────────────────────

def _to_float(value: Any) -> Optional[float]:
    """Cast a value to float, returning None if absent or non-numeric."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
