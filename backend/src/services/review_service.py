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
    def generate_ai_reviews(db: Session, customer_id: Optional[str] = None, gym_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Dynamically analyzes customer profile, attendance history, goals,
        and generates 3 compelling, realistic 5-star Google review suggestions.
        """
        customer_name = ""
        membership_plan = ""
        goal = ""
        trainer = ""
        workout_count = 0

        # Dynamic lookup from DB
        if customer_id:
            cust = db.query(Customer).filter((Customer.id == customer_id) | (Customer.user_id == customer_id)).first()
            if cust:
                customer_name = cust.full_name or ""
                goal = cust.goal or cust.training_preference or cust.body_condition or ""
                if cust.trainer_id:
                    from src.models.user import User
                    trainer_user = db.query(User).filter(User.id == cust.trainer_id).first()
                    if trainer_user and trainer_user.name:
                        trainer = trainer_user.name

                mem = db.query(Membership).filter(Membership.customer_id == cust.id).order_by(Membership.created_at.desc()).first()
                if mem and mem.plan_name:
                    membership_plan = mem.plan_name

                if cust.workouts:
                    workout_count = len(cust.workouts)

                if not gym_name and cust.primary_gym_location:
                    gym_name = cust.primary_gym_location

        if not gym_name:
            active_company = db.query(Company).filter(Company.status == "active").first()
            gym_name = active_company.name if active_company else "this gym"

        api_key = get_gemini_key()
        models = build_gemini_fallback_list()

        context_lines = [f"- Facility / Gym Name: {gym_name}"]
        if customer_name:
            context_lines.append(f"- Member Name: {customer_name}")
        if membership_plan:
            context_lines.append(f"- Membership Tier / Plan: {membership_plan}")
        if goal:
            context_lines.append(f"- Fitness Goal / Routine: {goal}")
        if trainer:
            context_lines.append(f"- Personal Trainer / Coach: {trainer}")
        if workout_count > 0:
            context_lines.append(f"- Completed Workout Sessions: {workout_count}")

        context_str = "\n".join(context_lines)

        prompt = f"""
You are an expert customer experience assistant. Generate 3 unique, highly authentic 5-star Google Business review suggestions for a member at "{gym_name}".
Customer Real Data:
{context_str}

Requirements for the 3 reviews:
1. Review 1: Focus on state-of-the-art gym equipment, hygiene, and modern facilities.
2. Review 2: Focus on personal guidance, motivating community, and noticeable body transformation results.
3. Review 3: Focus on overall atmosphere, helpful staff, clean locker rooms, and value.

Output strict JSON with an array of 3 objects, each having:
- "id": number (1, 2, 3)
- "category": string (e.g. "Equipment & Facilities", "Trainer & Results", "Vibe & Community")
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

        # Dynamic fallback templates incorporating customer's real gym name and goals
        if not generated_data or not isinstance(generated_data, list):
            goal_desc = f" on my {goal.lower()} goals" if goal else ""
            trainer_desc = f" with {trainer}" if trainer else " with the trainers"
            plan_desc = f" of the {membership_plan}" if membership_plan else ""

            generated_data = [
                {
                    "id": 1,
                    "category": "Equipment & Atmosphere",
                    "title": "Best Fitness Center in Town!",
                    "text": f"Hands down the best gym experience at {gym_name}! The imported machines, cleanliness, and motivating vibe make every workout session incredible. Highly recommended for anyone serious about fitness!",
                    "rating": 5,
                    "tags": ["Modern Equipment", "Pristine Hygiene", "Great Vibe"]
                },
                {
                    "id": 2,
                    "category": "Transformation & Coaching",
                    "title": "Incredible Results & Support",
                    "text": f"I've been working{goal_desc}{trainer_desc} here and the guidance is top-notch. The customized workout routines and positive environment have helped me achieve noticeable results!",
                    "rating": 5,
                    "tags": ["Expert Guidance", "Body Transformation", "Great Coaching"]
                },
                {
                    "id": 3,
                    "category": "Value & Community",
                    "title": "Premium Facility with Welcoming Staff",
                    "text": f"From the friendly front desk team to the spacious training zones and spotless locker rooms, {gym_name} sets a high standard. Worth every penny{plan_desc}!",
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
        gym_name = company.name if company else "Fitness Center"

        return {
            "google_review_url": url,
            "google_place_id": place_id,
            "google_review_enabled": enabled,
            "gym_name": gym_name,
            "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data={url}" if url else ""
        }

