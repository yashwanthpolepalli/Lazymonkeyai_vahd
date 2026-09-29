"""
Brochure Template Database Model
Supports both built-in system templates and AI-extracted user uploaded brochures.
Stores structured dynamic JSON (Fabric.js compatible canvas and elements).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, JSON, DateTime
from src.database.base import Base


class BrochureTemplate(Base):
    __tablename__ = "brochure_templates"

    id = Column(String(64), primary_key=True, index=True, default=lambda: f"tmpl_{uuid.uuid4().hex[:12]}")
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(32), default="system")  # "system" | "uploaded" | "ai_generated"
    source_asset_id = Column(Text, nullable=True)  # URL or asset path of original image/PDF
    preview_asset_id = Column(Text, nullable=True)  # Thumbnail URL
    design_json = Column(JSON, nullable=False)  # Dynamic Fabric.js canvas & elements JSON
    version = Column(Integer, default=1)
    is_system_template = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
