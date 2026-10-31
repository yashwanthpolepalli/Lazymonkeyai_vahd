from fastapi import APIRouter, HTTPException, Body
from src.api.v1.auth import router as auth_router
from src.api.v1.students import router as students_main_router, members_router, crm_students_router, students_router as students_reports_router
from src.api.v1.courses import router as courses_router
from src.api.v1.biometrics import router as biometrics_router
from src.api.v1.super_admin import router as super_admin_router
from src.api.v1.dashboard import router as dashboard_router
from src.api.v1.employees import router as employees_router
from src.api.v1.payroll import router as payroll_router
from src.api.v1.plans import router as plans_router
from src.api.v1.settings import router as settings_router
from src.api.v1.student_portal import router as student_portal_router
from src.api.v1.hrms import router as hrms_router
from src.api.v1.hrms_payroll import router as hrms_payroll_router
from src.api.v1.inventory import router as inventory_router
from src.api.v1.pos import router as pos_router
from src.api.v1.invoices import router as invoices_router
from src.api.v1.bank import router as bank_router
from src.api.v1.payments import router as payments_router
from src.api.v1.notifications import router as notifications_router
from src.api.v1.whatsapp import router as whatsapp_router
from src.api.v1.companies import router as companies_router
from src.api.v1.reviews import router as reviews_router
from src.api.v1.procurement import router as procurement_router
from src.api.v1.ho import router as ho_router

api_router = APIRouter()
api_router.include_router(ho_router)
api_router.include_router(auth_router)
api_router.include_router(students_main_router)
api_router.include_router(students_reports_router)
api_router.include_router(students_main_router, prefix="/students")
api_router.include_router(students_reports_router, prefix="/students")
api_router.include_router(crm_students_router)
api_router.include_router(members_router)
api_router.include_router(courses_router)
api_router.include_router(biometrics_router)
api_router.include_router(super_admin_router)
api_router.include_router(dashboard_router)
api_router.include_router(employees_router)
api_router.include_router(payroll_router)
api_router.include_router(plans_router)
api_router.include_router(settings_router)
api_router.include_router(student_portal_router)
api_router.include_router(hrms_router)
api_router.include_router(hrms_payroll_router)
api_router.include_router(inventory_router)
api_router.include_router(pos_router)
api_router.include_router(invoices_router)
api_router.include_router(bank_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)
api_router.include_router(whatsapp_router)
api_router.include_router(companies_router)
api_router.include_router(reviews_router)
api_router.include_router(procurement_router)
api_router.include_router(procurement_router, prefix="/inventory")

# System & Branches compatibility endpoints for multi-tenant switcher
@api_router.get("/system/tenants")
def list_system_tenants():
    return [
        {
            "id": "default",
            "name": "VAHD",
            "slug": "vahd",
            "industry": "Fitness & Wellness",
            "status": "active",
            "logo_url": None
        }
    ]

@api_router.get("/erp/branches")
@api_router.get("/branches")
def list_erp_branches():
    return {
        "items": [
            {
                "id": "br_01",
                "name": "Main Branch",
                "code": "MAIN",
                "company_id": "default",
                "status": "Active"
            }
        ],
        "total": 1
    }

@api_router.post("/system/send-enrollment-email")
def dispatch_enrollment_email_endpoint(payload: dict = Body(...)):
    from src.utils.email import send_enrollment_email
    
    to_email = payload.get("to_email")
    full_name = payload.get("full_name")
    password = payload.get("password")
    role = payload.get("role", "User")
    plan_name = payload.get("plan_name")
    
    if not to_email or not full_name or not password:
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: 'to_email', 'full_name', and 'password' are required."
        )
        
    success = send_enrollment_email(to_email, full_name, password, role, plan_name)
    return {
        "success": success,
        "message": f"Enrollment email sent to {to_email}",
        "recipient": to_email,
        "template": "white"
    }
