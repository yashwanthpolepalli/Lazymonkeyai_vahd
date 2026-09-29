from src.utils.timezone import now_ist_naive
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from src.database.base import Base

class GymSlotBooking(Base):
    __tablename__ = "gym_slot_bookings"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    branch_id = Column(String, nullable=True)
    branch_name = Column(String, nullable=True)
    booking_date = Column(String, nullable=False, index=True)  # YYYY-MM-DD or DD-MM-YYYY
    start_time = Column(String, nullable=False)                # e.g. "06:00 AM"
    end_time = Column(String, nullable=False)                  # e.g. "07:30 AM"
    workout_types = Column(JSON, default=list)                 # e.g. ["Chest", "Triceps"]
    status = Column(String, nullable=False, index=True)        # CONFIRMED, COMPLETED, CANCELLED
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    # Relationship
    customer = relationship("Customer", foreign_keys=[customer_id], backref="gym_slot_bookings")
