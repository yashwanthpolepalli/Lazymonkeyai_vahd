import base64
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Body
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.nutrition_service import NutritionService
from src.services.food_analysis_service import FoodAnalysisService
from src.services.nutrition_calculation_service import NutritionCalculationService
from src.models.nutrition import NutritionLog, NutritionFoodLogItem

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])

@router.get("/customer/{customer_id}")
def get_customer_nutrition(customer_id: str, db: Session = Depends(get_db)):
    return NutritionService.get_nutrition_by_customer(db, customer_id)


@router.post("/analyze-food")
async def analyze_food_image(
    payload: Optional[dict] = Body(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Analyze food photo using 3-stage AI Pipeline (Vision -> Resolution -> Calculation).
    Supports base64 JSON ({ "image_base64": "..." }) or multipart form file upload.
    """
    image_base64 = None

    if file:
        file_bytes = await file.read()
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")
    elif payload and "image_base64" in payload:
        image_base64 = payload["image_base64"]

    if not image_base64:
        raise HTTPException(
            status_code=400,
            detail="No image provided. Provide 'image_base64' in JSON body or send multipart image file."
        )

    result = FoodAnalysisService.analyze_food_image(image_base64)
    return result


@router.post("/recalculate")
def recalculate_nutrition(payload: dict):
    """
    Recalculate exact meal nutrition deterministically when user edits portion sizes.
    Accepts: { "items": [ { "name": "Dal", "quantity_g": 200, "calories_100g": 116, ... } ] }
    """
    items = payload.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="items list is required for recalculation.")

    calc_result = NutritionCalculationService.calculate_meal_nutrition(items)
    return calc_result


@router.post("/save-meal")
def save_meal(payload: dict, db: Session = Depends(get_db)):
    """
    Persist analyzed and confirmed meal to PostgreSQL database.
    Accepts: { "customer_id": "...", "meal_type": "Lunch", "meal_label": "...", "totals": {...}, "items": [...] }
    """
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required.")

    totals = payload.get("totals", {})
    items_data = payload.get("items", [])
    meal_label = payload.get("meal_label", "Scanned Meal")
    meal_type = payload.get("meal_type", "Meal")
    micronutrients = payload.get("micronutrients", {})
    confidence = payload.get("confidence", 0.85)

    # 1. Create Log Entry
    log_entry = NutritionLog(
        customer_id=customer_id,
        meal_type=meal_type,
        meal_name=meal_label,
        calories=float(totals.get("calories", 0.0)),
        protein=float(totals.get("protein", 0.0)),
        carbs=float(totals.get("carbs", 0.0)),
        fats=float(totals.get("fat", 0.0)),
        fiber=float(totals.get("fiber", 0.0)),
        sugar=float(totals.get("sugar", 0.0)),
        micronutrients=micronutrients,
        confidence=float(confidence),
    )

    db.add(log_entry)
    db.flush()  # Generate log_entry.id

    # 2. Add Item Records
    for item in items_data:
        log_item = NutritionFoodLogItem(
            log_id=log_entry.id,
            food_name=item.get("name", "Food Item"),
            quantity_g=float(item.get("quantity_g", 100.0)),
            preparation=item.get("preparation", "Standard"),
            calories=float(item.get("calories", 0.0)),
            protein=float(item.get("protein", 0.0)),
            carbs=float(item.get("carbs", 0.0)),
            fats=float(item.get("fat", 0.0)),
            fiber=float(item.get("fiber", 0.0)),
            sugar=float(item.get("sugar", 0.0)),
        )
        db.add(log_item)

    db.commit()
    db.refresh(log_entry)

    return {
        "success": True,
        "message": f"Meal successfully saved to log",
        "log_id": log_entry.id,
        "meal_name": log_entry.meal_name,
        "calories": log_entry.calories,
        "protein": log_entry.protein,
        "carbs": log_entry.carbs,
        "fats": log_entry.fats,
    }
