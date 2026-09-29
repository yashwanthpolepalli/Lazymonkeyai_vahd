import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, JSON, Text
from src.database.base import Base
from src.utils.timezone import now_ist_naive

class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True, index=True, default=lambda: f"comp_{uuid.uuid4().hex[:8]}")
    name = Column(String, nullable=False, index=True)
    legal_name = Column(String, nullable=False)
    company_type = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    gst_number = Column(String, nullable=True, index=True)
    pan_number = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True)
    default_currency_code = Column(String, nullable=True, default="INR")
    timezone = Column(String, nullable=True, default="Asia/Kolkata")
    language = Column(String, nullable=True, default="en")

    # Google Reviews & QR Automation
    google_review_url = Column(String, nullable=True)
    google_place_id = Column(String, nullable=True)
    google_review_enabled = Column(Boolean, default=False)

    terms_and_conditions = Column(Text, nullable=True)
    status = Column(String, default="active", index=True)


    # Nested configurations stored as structured JSON
    gst_registrations = Column(JSON, default=list)
    gsp_credentials = Column(JSON, default=dict)
    email_settings = Column(JSON, default=dict)

    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)


class CustomerReview(Base):
    __tablename__ = "customer_reviews"

    id = Column(String, primary_key=True, index=True, default=lambda: f"rev_{uuid.uuid4().hex[:8]}")
    company_id = Column(String, nullable=True, index=True)
    customer_id = Column(String, nullable=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    rating = Column(Integer, default=5)
    review_text = Column(Text, nullable=False)
    sentiment = Column(String, default="Positive")  # Positive, Neutral, Negative
    ai_generated = Column(Boolean, default=False)
    posted_to_google = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist_naive)
