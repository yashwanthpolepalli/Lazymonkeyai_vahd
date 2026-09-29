from src.utils.timezone import now_ist_naive
import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Boolean
from src.database.base import Base

class BiometricDevice(Base):
    __tablename__ = "biometric_devices"

    id = Column(String, primary_key=True, index=True)
    external_device_id = Column(String, nullable=True, index=True)
    serial_number = Column(String, nullable=True, index=True)
    device_name = Column(String, nullable=True)
    model_name = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    port = Column(Integer, nullable=True)
    connection_type = Column(String, nullable=True)
    mac_address = Column(String, nullable=True)
    wifi_ssid = Column(String, nullable=True)
    is_wireless = Column(Boolean, nullable=True)
    status = Column(String, nullable=True)
    location = Column(String, nullable=True)
    meta_data = Column(JSON, nullable=True, default=dict)
    last_seen_at = Column(DateTime, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_ist_naive)
    updated_at = Column(DateTime, default=now_ist_naive, onupdate=now_ist_naive)
