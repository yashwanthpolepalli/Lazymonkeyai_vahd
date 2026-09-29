"""
Brochures API Endpoints
- GET /templates : Returns all brochure templates (auto-seeds 6 system templates)
- GET /templates/{id} : Returns a specific template
- POST /analyze-template : Uploads & decomposes JPG/PDF into editable JSON
- POST /ai-assistant : Modifies template design JSON via AI prompt
- POST /save : Saves custom version
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.models.brochure import BrochureTemplate
from src.services.brochure_service import (
    seed_system_brochure_templates,
    analyze_and_decompose_brochure,
    apply_ai_design_assistant
)

router = APIRouter(prefix="/brochures", tags=["Brochures"])


class AnalyzeRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = "uploaded_brochure.jpg"
    gym_name: Optional[str] = "FIT CLUB"


class AiAssistantRequest(BaseModel):
    design_json: Dict[str, Any]
    prompt: str


class SaveTemplateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    design_json: Dict[str, Any]


@router.get("/templates")
def get_all_templates(db: Session = Depends(get_db)):
    """Fetch all templates, auto-seeding system templates if empty."""
    count = db.query(BrochureTemplate).count()
    if count == 0:
        seed_system_brochure_templates(db)

    templates = db.query(BrochureTemplate).filter(BrochureTemplate.is_active == True).order_by(BrochureTemplate.is_system_template.desc(), BrochureTemplate.created_at.desc()).all()
    return {
        "success": True,
        "count": len(templates),
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "source_type": t.source_type,
                "source_asset_id": t.source_asset_id,
                "preview_asset_id": t.preview_asset_id,
                "design_json": t.design_json,
                "version": t.version,
                "is_system_template": t.is_system_template,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in templates
        ]
    }


@router.get("/templates/{template_id}")
def get_template_by_id(template_id: str, db: Session = Depends(get_db)):
    """Fetch a specific template by ID."""
    tmpl = db.query(BrochureTemplate).filter(BrochureTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Brochure template not found")
    return {
        "success": True,
        "template": {
            "id": tmpl.id,
            "name": tmpl.name,
            "description": tmpl.description,
            "source_type": tmpl.source_type,
            "source_asset_id": tmpl.source_asset_id,
            "preview_asset_id": tmpl.preview_asset_id,
            "design_json": tmpl.design_json,
            "version": tmpl.version,
            "is_system_template": tmpl.is_system_template
        }
    }


@router.post("/analyze-template")
def analyze_brochure_endpoint(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    """Runs AI Vision + OCR element extraction on uploaded brochure image/PDF and saves structured design JSON."""
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="Image base64 content is required")
    return analyze_and_decompose_brochure(
        db=db,
        image_base64=payload.image_base64,
        filename=payload.filename,
        gym_name=payload.gym_name or "FIT CLUB"
    )


@router.post("/ai-assistant")
def ai_assistant_endpoint(payload: AiAssistantRequest):
    """Applies design transformations to design_json based on natural language prompt."""
    if not payload.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    updated_json = apply_ai_design_assistant(payload.design_json, payload.prompt)
    return {
        "success": True,
        "prompt": payload.prompt,
        "design_json": updated_json
    }


@router.post("/save")
def save_template_endpoint(payload: SaveTemplateRequest, db: Session = Depends(get_db)):
    """Saves or updates a customized brochure template in PostgreSQL."""
    if payload.id:
        tmpl = db.query(BrochureTemplate).filter(BrochureTemplate.id == payload.id).first()
        if tmpl and not tmpl.is_system_template:
            tmpl.name = payload.name
            tmpl.description = payload.description
            tmpl.design_json = payload.design_json
            tmpl.version += 1
            db.commit()
            db.refresh(tmpl)
            return {"success": True, "template_id": tmpl.id, "version": tmpl.version}

    new_tmpl = BrochureTemplate(
        name=payload.name,
        description=payload.description,
        source_type="custom",
        design_json=payload.design_json,
        version=1,
        is_system_template=False,
        is_active=True
    )
    db.add(new_tmpl)
    db.commit()
    db.refresh(new_tmpl)
    return {"success": True, "template_id": new_tmpl.id, "version": 1}
