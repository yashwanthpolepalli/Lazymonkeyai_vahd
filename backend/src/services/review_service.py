import json
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from src.models.erp import Company, CustomerReview
from src.models.customer import Customer
from src.models.membership import Membership
from src.utils.timezone import now_ist_naive
from src.utils.gemini_config import get_gemini_key, build_gemini_fallback_list

logger = logging.getLogger(__name__)

class ReviewService:
    @staticmethod
    def generate_ai_reviews(db: Session, customer_id: Optional[str] = None, vahd_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Dynamically analyzes customer profile, attendance history, goals,
        and generates 3 compelling, realistic 5-star Google review suggestions.
        """
        customer_name = ""
        membership_plan = ""
        goal = ""
        employee = ""
        attendance_count = 0

        # Dynamic lookup from DB
        if customer_id:
            cust = db.query(Customer).filter((Customer.id == customer_id) | (Customer.user_id == customer_id)).first()
            if cust:
                customer_name = cust.full_name or ""
                goal = getattr(cust, "specialization", "") or getattr(cust, "qualification", "") or ""
                if cust.employee_id:
                    from src.models.user import User
                    employee_user = db.query(User).filter(User.id == cust.employee_id).first()
                    if employee_user and employee_user.name:
                        employee = employee_user.name

                mem = db.query(Membership).filter(Membership.customer_id == cust.id).order_by(Membership.created_at.desc()).first()
                if mem and mem.plan_name:
                    membership_plan = mem.plan_name

                if getattr(cust, "biometric_logs", None):
                    attendance_count = len(cust.biometric_logs)

                if not vahd_name and cust.primary_vahd_location:
                    vahd_name = cust.primary_vahd_location

        if not vahd_name:
            active_company = db.query(Company).filter(Company.status == "active").first()
            vahd_name = active_company.name if active_company else "this facility"

        api_key = get_gemini_key()
        models = build_gemini_fallback_list()

        context_lines = [f"- Facility Name: {vahd_name}"]
        if customer_name:
            context_lines.append(f"- Member Name: {customer_name}")
        if membership_plan:
            context_lines.append(f"- Membership Tier / Plan: {membership_plan}")
        if goal:
            context_lines.append(f"- Specialization / Focus: {goal}")
        if employee:
            context_lines.append(f"- Assigned Mentor / Staff: {employee}")
        if attendance_count > 0:
            context_lines.append(f"- Completed Attendance Sessions: {attendance_count}")

        context_str = "\n".join(context_lines)

        prompt = f"""
You are an expert customer experience assistant. Generate 3 unique, highly authentic 5-star Google Business review suggestions for a member at "{vahd_name}".
Customer Real Data:
{context_str}

Requirements for the 3 reviews:
1. Review 1: Focus on state-of-the-art vahd equipment, hygiene, and modern facilities.
2. Review 2: Focus on personal guidance, motivating community, and noticeable body transformation results.
3. Review 3: Focus on overall atmosphere, helpful staff, clean locker rooms, and value.

Output strict JSON with an array of 3 objects, each having:
- "id": number (1, 2, 3)
- "category": string (e.g. "Equipment & Facilities", "employee & Results", "Vibe & Community")
- "title": short catchy headline
- "text": the full review text (2-3 sentences, natural tone, authentic voice)
- "rating": 5
- "tags": array of 2-3 keywords (e.g. ["Cleanliness", "Modern Machines", "Friendly Staff"])

JSON only without markdown fences:
"""
        generated_data = None
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                for model_name in models:
                    try:
                        model = genai.GenerativeModel(model_name)
                        response = model.generate_content(prompt)
                        text = response.text.strip()
                        if text.startswith("```json"):
                            text = text[7:]
                        if text.startswith("```"):
                            text = text[3:]
                        if text.endswith("```"):
                            text = text[:-3]
                        generated_data = json.loads(text.strip())
                        if isinstance(generated_data, list) and len(generated_data) > 0:
                            break
                    except Exception as e:
                        logger.warning(f"Failed generation with {model_name}: {e}")
                        continue
            except Exception as e:
                logger.error(f"Error configuring Gemini for review suggestions: {e}")

        # Dynamic fallback templates incorporating customer's real vahd name and goals
        if not generated_data or not isinstance(generated_data, list):
            goal_desc = f" on my {goal.lower()} goals" if goal else ""
            employee_desc = f" with {employee}" if employee else " with the employees"
            plan_desc = f" of the {membership_plan}" if membership_plan else ""

            generated_data = [
                {
                    "id": 1,
                    "category": "Infrastructure & Atmosphere",
                    "title": "Outstanding Facility & Services!",
                    "text": f"Hands down the best experience at {vahd_name}! The modern amenities, cleanliness, and motivating environment make every visit productive. Highly recommended!",
                    "rating": 5,
                    "tags": ["Modern Facility", "Pristine Hygiene", "Great Experience"]
                },
                {
                    "id": 2,
                    "category": "Operations & Mentorship",
                    "title": "Incredible Results & Support",
                    "text": f"I've been working with the team here and the guidance is top-notch. The structured programs and positive environment have helped me achieve noticeable progress!",
                    "rating": 5,
                    "tags": ["Expert Guidance", "Professional Growth", "Great Mentorship"]
                },
                {
                    "id": 3,
                    "category": "Value & Community",
                    "title": "Premium Facility with Welcoming Staff",
                    "text": f"From the friendly front desk team to the dedicated zones and spotless premises, {vahd_name} sets a high standard. Worth every investment!",
                    "rating": 5,
                    "tags": ["Friendly Staff", "Value for Money", "Spacious"]
                }
            ]

        return generated_data


    @staticmethod
    def submit_review(db: Session, data: Dict[str, Any]) -> CustomerReview:
        review = CustomerReview(
            company_id=data.get("company_id"),
            customer_id=data.get("customer_id"),
            customer_name=data.get("customer_name", "Anonymous Member"),
            customer_phone=data.get("customer_phone"),
            rating=data.get("rating", 5),
            review_text=data.get("review_text", ""),
            sentiment=data.get("sentiment", "Positive"),
            ai_generated=data.get("ai_generated", False),
            posted_to_google=data.get("posted_to_google", True),
            created_at=now_ist_naive()
        )
        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def get_reviews(db: Session, company_id: Optional[str] = None) -> List[CustomerReview]:
        query = db.query(CustomerReview)
        if company_id:
            query = query.filter(CustomerReview.company_id == company_id)
        return query.order_by(CustomerReview.created_at.desc()).all()

    @staticmethod
    def get_review_settings(db: Session, company_id: Optional[str] = None) -> Dict[str, Any]:
        company = None
        if company_id:
            company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            company = db.query(Company).filter(Company.status == "active").first()
        
        url = company.google_review_url if company and company.google_review_url else ""
        place_id = company.google_place_id if company else ""
        enabled = company.google_review_enabled if company and company.google_review_enabled is not None else False
        vahd_name = company.name if company else "Fitness Center"

        return {
            "google_review_url": url,
            "google_place_id": place_id,
            "google_review_enabled": enabled,
            "vahd_name": vahd_name,
            "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data={url}" if url else ""
        }

