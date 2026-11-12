from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from src.database.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=True, index=True)
    owner_id = Column(String, nullable=True, index=True)
    branch_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    department = Column(String, nullable=True)
    degree_type = Column(String, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    duration_days = Column(Integer, nullable=False, default=365)
    description = Column(String, nullable=True)
    color = Column(String, nullable=True)
    badge = Column(String, nullable=True)
    is_combo = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

    @property
    def code(self) -> str:
        return self.category or self.badge or ""

    @code.setter
    def code(self, value: str):
        self.category = value
        self.badge = value


class CourseLanguage(Base):
    __tablename__ = "course_languages"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_courselang_tenant_name"),
                      {"extend_existing": True})

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class CourseClassification(Base):
    __tablename__ = "course_classifications"
    __table_args__ = (UniqueConstraint("tenant_id", "value", name="uq_courseclass_tenant_value"),
                      {"extend_existing": True})

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=True, index=True)
    value = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)


class CourseDurationTier(Base):
    __tablename__ = "course_duration_tiers"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_courseduration_tenant_name"),
                      {"extend_existing": True})

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False, index=True)
    days = Column(Integer, nullable=False, default=365)
    unit_count = Column(Integer, nullable=True, default=1)
    unit_type = Column(String, nullable=True, default="years")
    multiplier = Column(Float, nullable=False, default=1.0)
    suffix = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)

