from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from src.database.session import get_db
from src.services.company_service import CompanyService
from src.api.deps import get_current_user
from src.models.user import User

router = APIRouter(prefix="/companies", tags=["Companies & ERP Organizations"])

@router.get("")
def list_companies(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    companies = CompanyService.get_all_companies(db, search=search)
    return {
        "items": [
            {
                "id": c.id,
                "name": c.name,
                "legal_name": c.legal_name,
                "company_type": c.company_type,
                "industry": c.industry,
                "gst_number": c.gst_number,
                "pan_number": c.pan_number,
                "registration_number": c.registration_number,
                "email": c.email,
                "phone": c.phone,
                "website": c.website,
                "country": c.country,
                "state": c.state,
                "city": c.city,
                "address": c.address,
                "logo_url": c.logo_url,
                "default_currency_code": c.default_currency_code,
                "timezone": c.timezone,
                "language": c.language,
                "google_review_url": c.google_review_url,
                "google_place_id": c.google_place_id,
                "google_review_enabled": c.google_review_enabled,
                "terms_and_conditions": c.terms_and_conditions,
                "status": c.status,
                "gst_registrations": c.gst_registrations or [],
                "gsp_credentials": c.gsp_credentials or {},
                "email_settings": c.email_settings or {},
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in companies
        ],
        "total": len(companies)
    }

@router.post("", status_code=status.HTTP_201_CREATED)
def create_company(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Company name is required")
    company = CompanyService.create_company(db, payload)
    return {
        "id": company.id,
        "name": company.name,
        "legal_name": company.legal_name,
        "gst_number": company.gst_number,
        "google_review_url": company.google_review_url,
        "google_place_id": company.google_place_id,
        "google_review_enabled": company.google_review_enabled,
        "status": company.status
    }

@router.get("/{company_id}")
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    company = CompanyService.get_company(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": company.id,
        "name": company.name,
        "legal_name": company.legal_name,
        "company_type": company.company_type,
        "industry": company.industry,
        "gst_number": company.gst_number,
        "pan_number": company.pan_number,
        "registration_number": company.registration_number,
        "email": company.email,
        "phone": company.phone,
        "website": company.website,
        "country": company.country,
        "state": company.state,
        "city": company.city,
        "address": company.address,
        "logo_url": company.logo_url,
        "default_currency_code": company.default_currency_code,
        "timezone": company.timezone,
        "language": company.language,
        "google_review_url": company.google_review_url,
        "google_place_id": company.google_place_id,
        "google_review_enabled": company.google_review_enabled,
        "terms_and_conditions": company.terms_and_conditions,
        "status": company.status,
        "gst_registrations": company.gst_registrations or [],
        "gsp_credentials": company.gsp_credentials or {},
        "email_settings": company.email_settings or {},
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }

@router.put("/{company_id}")
def update_company(
    company_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    company = CompanyService.update_company(db, company_id, payload)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": company.id,
        "name": company.name,
        "legal_name": company.legal_name,
        "google_review_url": company.google_review_url,
        "google_place_id": company.google_place_id,
        "google_review_enabled": company.google_review_enabled,
        "status": company.status,
        "message": "Company updated successfully"
    }

@router.delete("/{company_id}")
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    success = CompanyService.delete_company(db, company_id)
    if not success:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"message": "Company deleted successfully"}

@router.post("/test-smtp")
def test_smtp(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    credentials = payload.get("credentials", {})
    recipient_email = payload.get("recipient_email")
    res = CompanyService.test_smtp_connection(credentials, recipient_email)
    return res

@router.post("/test-gsp")
def test_gsp(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    return CompanyService.test_gsp_connection(payload)
