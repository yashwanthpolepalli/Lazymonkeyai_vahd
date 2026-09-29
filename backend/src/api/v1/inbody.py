from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.inbody_service import InBodyService

from src.models.customer import Customer
from src.models.inbody import InBodyReport

router = APIRouter(prefix="/inbody", tags=["InBody"])

@router.get("/all")
def get_all_inbody_reports(db: Session = Depends(get_db)):
    reports = db.query(InBodyReport).all()
    results = []
    for rep in reports:
        cust = db.query(Customer).filter(Customer.id == rep.customer_id).first() if rep.customer_id else None
        c_name = cust.full_name if cust else "Gym Member"
        avatar = cust.profile_image if cust else ""
        gender = cust.gender if (cust and cust.gender) else "Male"
        results.append({
            "id": rep.id,
            "memberId": rep.customer_id,
            "memberName": c_name,
            "avatarUrl": avatar or "",
            "age": 28,
            "gender": gender,
            "membershipSince": "Jan 2025",
            "testDate": rep.created_at.isoformat() if rep.created_at else None,
            "device": "InBody 380",
            "weightKg": float(rep.weight or 70.0),
            "weightDeltaKg": -1.2,
            "heightCm": 175.0,
            "bmi": float(rep.bmi or 23.0),
            "bmiDelta": -0.4,
            "bodyFatPercent": float(rep.body_fat_percentage or 20.0),
            "bodyFatDeltaPercent": -1.0,
            "muscleMassKg": float(rep.skeletal_muscle_mass or 32.0),
            "muscleMassDeltaKg": 0.8,
            "visceralFatLevel": int(rep.visceral_fat or 5),
            "visceralFatDelta": 0,
            "bodyWaterPercent": float(rep.body_water or 58.0),
            "bodyWaterDeltaPercent": 0.5,
            "boneMassKg": 3.2,
            "bmrKcal": int(rep.basal_metabolic_rate or 1600),
            "status": "warning" if (rep.body_fat_percentage and rep.body_fat_percentage > 25) else "normal",
            "sixMonthWeightTrend": [76.0, 75.0, 74.0, 73.0, 72.0, float(rep.weight or 70.0)],
            "aiInsights": [
                f"Skeletal Muscle Mass at {rep.skeletal_muscle_mass or 32.0} kg",
                f"Body Fat Percentage at {rep.body_fat_percentage or 20.0}%",
                "Recommendation: Maintain balanced macro intake and progressive overload."
            ]
        })
    return results

@router.get("/customer/{customer_id}")
def get_customer_inbody(customer_id: str, db: Session = Depends(get_db)):
    rep = InBodyService.get_latest_inbody_report(db, customer_id)
    if not rep:
        raise HTTPException(status_code=404, detail="InBody report not found")
    return {
        "id": rep.id,
        "customer_id": rep.customer_id,
        "score": rep.score,
        "weight": rep.weight,
        "skeletal_muscle_mass": rep.skeletal_muscle_mass,
        "body_fat_percentage": rep.body_fat_percentage,
        "body_fat_mass": rep.body_fat_mass,
        "visceral_fat": rep.visceral_fat,
        "bmi": rep.bmi,
        "basal_metabolic_rate": rep.basal_metabolic_rate,
        "body_water": rep.body_water,
        "protein": rep.protein,
        "segmental_analysis": rep.segmental_analysis,
    }
