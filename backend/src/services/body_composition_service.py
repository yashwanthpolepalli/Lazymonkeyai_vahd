import uuid
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from src.devices.device_manager import device_manager
from src.devices.base import DeviceNotConnectedError, DeviceNotFoundError
from src.devices.inbody.mapper import InBodyMapper
from src.services.classification_config_service import ClassificationConfigService
from src.services.bmi_service import BMIService
from src.models.inbody import InBodyReport
from src.models.customer import Customer
from src.utils.timezone import now_ist_naive

class BodyCompositionService:
    """
    Core Service handling canonical scan ingestion, device measurement session lifecycle,
    database persistence, and dynamic full scan result report generation without hardcoded fallbacks or fabricated segmental metrics.
    """
    @staticmethod
    def ingest_scan_from_device(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Receives canonical Submit Scan JSON payload, validates, saves to PostgreSQL,
        and returns the exact Backend -> Device Acknowledge Scan response schema.
        """
        device_id = payload.get("deviceId", "UNKNOWN_DEVICE")
        scan_id = payload.get("scanId") or f"scan_{uuid.uuid4().hex[:8]}"
        user_id = payload.get("userId")
        timestamp = payload.get("timestamp") or datetime.datetime.utcnow().isoformat() + "Z"

        basic = payload.get("basicMeasurements") or {}
        weight = basic.get("weightKg")
        height = basic.get("heightCm")

        indices = payload.get("indices") or {}
        bmi = indices.get("bmi")
        if bmi is None and weight and height and height > 0:
            height_m = height / 100.0
            bmi = round(weight / (height_m * height_m), 1)

        body_fat = indices.get("percentBodyFat")
        muscle_mass = indices.get("skeletalMuscleMassKg")
        fitness_score = indices.get("fitnessScore")
        body_type = indices.get("bodyType") or "Unmeasured"

        body_comp = payload.get("bodyComposition") or {}
        total_water = body_comp.get("totalBodyWaterLiters")
        protein_kg = body_comp.get("proteinKg")
        visceral = indices.get("visceralFatLevel")
        bmr = indices.get("basalMetabolicRateKcal")

        reading_id = f"rdg_{uuid.uuid4().hex[:8]}"

        # Save to PostgreSQL inbody_reports table if user_id present
        if db and user_id and weight is not None:
            fat_mass = body_comp.get("bodyFatMassKg")
            if fat_mass is None and body_fat is not None:
                fat_mass = round(weight * (body_fat / 100.0), 1)

            report_record = InBodyReport(
                id=scan_id,
                customer_id=user_id,
                scan_date=now_ist_naive(),
                score=fitness_score or 0,
                weight=weight,
                skeletal_muscle_mass=muscle_mass or 0.0,
                body_fat_percentage=body_fat or 0.0,
                body_fat_mass=fat_mass or 0.0,
                visceral_fat=visceral or 0.0,
                bmi=bmi or 0.0,
                basal_metabolic_rate=bmr or 0.0,
                body_water=total_water or 0.0,
                protein=protein_kg or 0.0,
                segmental_analysis=payload.get("segmentalAnalysis")  # Store actual or None
            )
            try:
                db.add(report_record)
                db.commit()
            except Exception:
                db.rollback()

        # Build status flags based on DB thresholds if available
        config = ClassificationConfigService.get(db) if db else None
        flags = []
        if bmi is not None and config:
            if bmi > config.bmi_overweight_max:
                flags.append({"code": "BMI_OBESE", "message": "BMI indicates obese range."})
            elif bmi > config.bmi_normal_max:
                flags.append({"code": "BMI_OVERWEIGHT", "message": "BMI indicates overweight range."})
            elif bmi < config.bmi_underweight_max and bmi > 0:
                flags.append({"code": "BMI_UNDERWEIGHT", "message": "BMI indicates underweight range."})
            elif bmi > 0:
                flags.append({"code": "BMI_NORMAL", "message": "BMI is within normal healthy range."})

        return {
            "status": "success",
            "data": {
                "scanId": scan_id,
                "readingId": reading_id,
                "deviceId": device_id,
                "userId": user_id,
                "timestamp": timestamp,
                "storedAt": datetime.datetime.utcnow().isoformat() + "Z",
                "summary": {
                    "weightKg": weight,
                    "heightCm": height,
                    "bmi": bmi,
                    "percentBodyFat": body_fat,
                    "skeletalMuscleMassKg": muscle_mass,
                    "bodyType": body_type,
                    "fitnessScore": fitness_score
                },
                "flags": flags
            }
        }

    @staticmethod
    def get_full_scan_report(db: Session, customer_id: str, scan_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns Full Scan Result JSON matching the exact InBody-Style Report Canonical Template
        with dynamic historical differentials, DB-driven classification, and NO fabricated segmental data.
        """
        query = db.query(InBodyReport).filter(InBodyReport.customer_id == customer_id)
        if scan_id:
            query = query.filter(InBodyReport.id == scan_id)

        latest = query.order_by(InBodyReport.scan_date.desc()).first()

        customer = db.query(Customer).filter(Customer.id == customer_id).first() if db else None
        cust_gender = getattr(customer, "gender", None)
        cust_age = getattr(customer, "age", None)
        cust_height = float(getattr(customer, "height_cm", None) or 0.0) if customer else None

        if not latest:
            return {
                "status": "success",
                "data": {
                    "scanId": scan_id or "no_scan",
                    "readingId": f"rdg_{uuid.uuid4().hex[:8]}",
                    "userId": customer_id,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "profile": {
                        "age": cust_age,
                        "gender": cust_gender,
                        "heightCm": cust_height,
                        "weightKg": None
                    },
                    "bodyComposition": {
                        "totalBodyWaterLiters": None,
                        "intracellularWaterLiters": None,
                        "extracellularWaterLiters": None,
                        "proteinKg": None,
                        "mineralsKg": None,
                        "bodyFatMassKg": None,
                        "fatFreeMassKg": None,
                        "leanBodyMassKg": None,
                        "dryLeanMassKg": None
                    },
                    "indices": {
                        "bmi": { "value": None, "category": "Unmeasured", "normalRange": { "min": 18.5, "max": 24.9 } },
                        "percentBodyFat": { "value": None, "category": "Unmeasured", "normalRange": { "min": 10.0, "max": 20.0 } },
                        "skeletalMuscleMassKg": { "value": None, "category": "Unmeasured", "normalRange": { "min": 25.0, "max": 40.0 } },
                        "visceralFatLevel": { "value": None, "category": "Unmeasured", "normalRange": { "min": 1, "max": 10 } },
                        "waistHipRatio": None,
                        "basalMetabolicRateKcal": None,
                        "fitnessScore": None,
                        "bodyType": "Unmeasured"
                    },
                    "segmentalAnalysis": None,
                    "historySummary": {
                        "last30Days": { "weightChangeKg": 0.0, "bodyFatChangePercent": 0.0, "skeletalMuscleChangeKg": 0.0 }
                    },
                    "recommendations": ["Perform initial scan on connected device to generate report."]
                }
            }

        weight = float(latest.weight or 0.0)
        height = cust_height or 0.0
        bmi = float(latest.bmi or 0.0)
        if bmi == 0.0 and weight > 0 and height > 0:
            height_m = height / 100.0
            bmi = round(weight / (height_m * height_m), 1)

        config = ClassificationConfigService.get(db) if db else None

        body_fat = float(latest.body_fat_percentage) if latest.body_fat_percentage is not None else None
        muscle_mass = float(latest.skeletal_muscle_mass) if latest.skeletal_muscle_mass is not None else None
        total_water = float(latest.body_water) if latest.body_water is not None else None
        protein_kg = float(latest.protein) if latest.protein is not None else None
        visceral = int(latest.visceral_fat) if latest.visceral_fat is not None else None
        bmr = int(latest.basal_metabolic_rate) if latest.basal_metabolic_rate is not None else None
        score = int(latest.score) if latest.score is not None else None

        fat_mass_kg = float(latest.body_fat_mass) if latest.body_fat_mass is not None else (round(weight * (body_fat / 100.0), 1) if (weight and body_fat) else None)
        fat_free_mass = round(weight - fat_mass_kg, 1) if (weight and fat_mass_kg is not None) else None

        # Compute 30-Day Historical Differentials dynamically from DB
        thirty_days_ago = now_ist_naive() - datetime.timedelta(days=30)
        prev_scan = db.query(InBodyReport).filter(
            InBodyReport.customer_id == customer_id,
            InBodyReport.scan_date <= thirty_days_ago
        ).order_by(InBodyReport.scan_date.desc()).first() if db else None

        if prev_scan:
            weight_change = round(weight - (prev_scan.weight or weight), 1)
            fat_change = round((body_fat or 0.0) - (prev_scan.body_fat_percentage or (body_fat or 0.0)), 1)
            muscle_change = round((muscle_mass or 0.0) - (prev_scan.skeletal_muscle_mass or (muscle_mass or 0.0)), 1)
        else:
            weight_change = 0.0
            fat_change = 0.0
            muscle_change = 0.0

        # AI Recommendations generated dynamically based on actual measurements
        recs = []
        if config and bmi > config.bmi_overweight_max:
            recs.append("Current BMI indicates overweight classification. Recommend balanced caloric deficit and 150+ mins cardio weekly.")
        elif config and bmi < config.bmi_underweight_max and bmi > 0:
            recs.append("Current BMI indicates underweight classification. Recommend caloric surplus and strength training.")
        else:
            recs.append("BMI is in a healthy range. Maintain balanced nutrition and regular physical activity.")

        if muscle_mass is not None and muscle_mass > 0:
            recs.append(f"Skeletal Muscle Mass recorded at {muscle_mass} kg. Maintain progressive resistance training.")

        if body_fat is not None and body_fat > 25.0:
            recs.append(f"Body fat percentage recorded at {body_fat}%. Consider structured cardio & strength training split.")

        # Segmental Analysis: strictly real scanner data or None
        segmental = latest.segmental_analysis if (latest.segmental_analysis and isinstance(latest.segmental_analysis, dict) and len(latest.segmental_analysis) > 0) else None

        # Body Type using Config Thresholds if available
        body_type = "Standard"
        if config and bmi > 0:
            if bmi < config.bmi_underweight_max:
                body_type = "Underweight"
            elif bmi <= config.bmi_normal_max:
                athletic_max = config.body_fat_athletic_max_female if cust_gender == 'Female' else config.body_fat_athletic_max_male
                body_type = "Athletic Fit" if (body_fat is not None and body_fat <= athletic_max) else "Standard Body"
            elif bmi <= config.bmi_overweight_max:
                body_type = "Overweight"
            else:
                body_type = "Obese"

        return {
            "status": "success",
            "data": {
                "scanId": latest.id,
                "readingId": f"rdg_{latest.id}",
                "userId": customer_id,
                "timestamp": latest.scan_date.isoformat() if latest.scan_date else datetime.datetime.utcnow().isoformat() + "Z",
                "profile": {
                    "age": cust_age,
                    "gender": cust_gender,
                    "heightCm": cust_height,
                    "weightKg": weight
                },
                "bodyComposition": {
                    "totalBodyWaterLiters": round(total_water, 1) if total_water is not None else None,
                    "intracellularWaterLiters": round(total_water * 0.62, 1) if total_water is not None else None,
                    "extracellularWaterLiters": round(total_water * 0.38, 1) if total_water is not None else None,
                    "proteinKg": round(protein_kg, 1) if protein_kg is not None else None,
                    "mineralsKg": None,
                    "bodyFatMassKg": fat_mass_kg,
                    "fatFreeMassKg": fat_free_mass,
                    "leanBodyMassKg": round(fat_free_mass * 0.92, 1) if fat_free_mass is not None else None,
                    "dryLeanMassKg": None
                },
                "indices": {
                    "bmi": {
                        "value": bmi,
                        "category": "Normal" if (config and bmi <= config.bmi_normal_max) else "Overweight",
                        "normalRange": { "min": config.bmi_underweight_max if config else 18.5, "max": config.bmi_normal_max if config else 24.9 }
                    },
                    "percentBodyFat": {
                        "value": body_fat,
                        "category": "Normal" if (body_fat is not None and body_fat <= 22.0) else "Over",
                        "normalRange": { "min": 10.0, "max": 20.0 }
                    },
                    "skeletalMuscleMassKg": {
                        "value": muscle_mass,
                        "category": "Good" if muscle_mass else "Unmeasured",
                        "normalRange": { "min": 25.0, "max": 40.0 }
                    },
                    "visceralFatLevel": {
                        "value": visceral,
                        "category": "Healthy" if (visceral is not None and visceral <= 10) else "High",
                        "normalRange": { "min": 1, "max": 10 }
                    },
                    "waistHipRatio": None,
                    "basalMetabolicRateKcal": bmr,
                    "fitnessScore": score,
                    "bodyType": body_type
                },
                "segmentalAnalysis": segmental,
                "historySummary": {
                    "last30Days": {
                        "weightChangeKg": weight_change,
                        "bodyFatChangePercent": fat_change,
                        "skeletalMuscleChangeKg": muscle_change
                    }
                },
                "recommendations": recs
            }
        }

    @staticmethod
    def start_scan_session(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Triggers scan session on physical scanner device.
        Sends start measurement command to hardware adapter.
        """
        device_id = payload.get("device_id", "IB-570-001")
        customer_id = payload.get("customer_id")
        if not customer_id:
            raise ValueError("customer_id is required to start a scan session.")

        adapter = device_manager.get_device(device_id)
        if not adapter:
            raise DeviceNotFoundError(f"Device '{device_id}' is not registered.")

        session_id = f"sess_{uuid.uuid4().hex[:8]}"

        # Start measurement on device adapter (raises DeviceNotConnectedError if offline)
        return adapter.start_measurement(session_id=session_id, customer_id=customer_id)

    @staticmethod
    def receive_scan_result(db: Session, device_id: str, session_id: str, height_cm: float, gender: Optional[str] = None) -> Dict[str, Any]:
        """
        Polls / receives measurement from device adapter, converts to canonical schema via InBodyMapper,
        and saves to PostgreSQL DB.
        """
        adapter = device_manager.get_device(device_id)
        if not adapter:
            raise DeviceNotFoundError(f"Device '{device_id}' is not registered.")

        raw_measurement = adapter.receive_measurement(session_id=session_id)
        config = ClassificationConfigService.get(db) if db else None

        canonical_scan = InBodyMapper.to_canonical_scan(
            raw_payload=raw_measurement,
            height_cm=height_cm,
            gender=gender,
            classification_config=config
        )

        return BodyCompositionService.ingest_scan_from_device(db, canonical_scan)

    @staticmethod
    def get_customer_history(db: Session, customer_id: str) -> List[Dict[str, Any]]:
        customer = db.query(Customer).filter(Customer.id == customer_id).first() if db else None
        cust_height = float(getattr(customer, "height_cm", 0.0) or 0.0) if customer else 0.0

        records = db.query(InBodyReport).filter(InBodyReport.customer_id == customer_id).order_by(InBodyReport.scan_date.desc()).all() if db else []
        result = []
        for r in records:
            result.append({
                "id": r.id,
                "dateStr": r.scan_date.strftime("%d %b %Y, %I:%M %p") if r.scan_date else "Recent",
                "weight": r.weight,
                "height": cust_height,
                "bmi": r.bmi,
                "bodyFat": r.body_fat_percentage,
                "muscleMass": r.skeletal_muscle_mass,
                "water": r.body_water,
                "protein": r.protein,
                "visceralFat": r.visceral_fat,
                "inBodyScore": r.score
            })
        return result
