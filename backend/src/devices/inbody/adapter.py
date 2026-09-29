"""
InBodyDeviceAdapter
===================
Concrete adapter for InBody 270 / 570 / 770 scanner devices.

Lifecycle:
  1. connect()             → TCP/handshake with physical device
  2. start_measurement()   → sends START command; member steps onto scanner
  3. receive_measurement() → waits for and returns actual device result
  4. disconnect()          → release connection

What this adapter does NOT do:
  - No body-fat estimation formulas
  - No muscle-mass proportional calculations
  - No segmental distribution math
  - No BMR equations
  - No fallback fabricated values

If INBODY_DEVICE_URL is not set in .env, all measurement methods raise
DeviceNotConnectedError so the frontend shows a clear "Scanner not configured"
message instead of displaying fabricated numbers as if they were real results.
"""
from __future__ import annotations

import datetime
import uuid
from typing import Any, Dict, List, Optional

from src.devices.base import BaseDeviceAdapter, DeviceNotConnectedError
from src.devices.inbody.protocol import InBodyProtocol


class InBodyDeviceAdapter(BaseDeviceAdapter):

    def __init__(
        self,
        device_id: str,
        model_name: str,
        connection_type: str,
        config: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(device_id, model_name, connection_type, config)
        self.ip_address: Optional[str] = (config or {}).get("ip_address")

    # ── Connection lifecycle ──────────────────────────────────────────────────

    def connect(self) -> bool:
        result = InBodyProtocol.test_connection(
            self.connection_type, self.device_id, self.ip_address
        )
        if result.get("success"):
            self.is_connected = True
            self.last_seen = datetime.datetime.now()
            return True
        self.is_connected = False
        return False

    def disconnect(self) -> bool:
        self.is_connected = False
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "device_id":           self.device_id,
            "model_name":          self.model_name,
            "connection_type":     self.connection_type,
            "is_connected":        self.is_connected,
            "last_seen":           self.last_seen.isoformat() if self.last_seen else None,
            "supported_interfaces": self.get_supported_connection_types(),
            "device_configured":   InBodyProtocol._DEVICE_LIVE
            if hasattr(InBodyProtocol, "_DEVICE_LIVE") else False,
        }

    def get_supported_connection_types(self) -> List[str]:
        return ["Wi-Fi", "LAN", "USB", "Bluetooth"]

    # ── Measurement session ───────────────────────────────────────────────────

    def start_measurement(self, session_id: str, customer_id: str) -> Dict[str, Any]:
        """
        Send the START command to the physical device.
        Returns a session handle immediately — the member then steps onto the scanner.
        Raises DeviceNotConnectedError if the device is not reachable.
        """
        if not self.is_connected:
            raise DeviceNotConnectedError(
                f"Device '{self.device_id}' is not connected. "
                "Connect the device before starting a measurement."
            )

        InBodyProtocol.start_measurement(
            device_id=self.device_id,
            session_id=session_id,
            customer_id=customer_id,
            ip_address=self.ip_address,
        )

        return {
            "session_id": session_id,
            "device_id":  self.device_id,
            "customer_id": customer_id,
            "status":     "waiting_for_measurement",
            "started_at": datetime.datetime.utcnow().isoformat() + "Z",
        }

    def receive_measurement(
        self, session_id: str, timeout_seconds: int = 120
    ) -> Dict[str, Any]:
        """
        Wait for and return the raw result from the physical scanner.

        The returned dict contains ONLY what the device actually sent.
        Any field the device did not provide is explicitly None.
        No estimation, no proportional formulas, no fallbacks.

        Raises:
            DeviceNotConnectedError  — device not reachable
            MeasurementTimeoutError  — device did not respond in time
        """
        raw = InBodyProtocol.receive_measurement(
            device_id=self.device_id,
            session_id=session_id,
            timeout_seconds=timeout_seconds,
            ip_address=self.ip_address,
        )

        # Pass through exactly what the device sent.
        # Keys must match the canonical field names expected by InBodyMapper.
        return {
            "device_id":                  self.device_id,
            "session_id":                 session_id,
            "measurement_id":             raw.get("measurement_id") or f"msr_{uuid.uuid4().hex[:8]}",
            "received_at":                datetime.datetime.utcnow().isoformat() + "Z",
            # ── Scanner measurements (device-provided only) ──────────────────
            "weight_kg":                  raw.get("weight_kg"),
            "body_fat_percent":           raw.get("body_fat_percent"),
            "body_fat_mass_kg":           raw.get("body_fat_mass_kg"),
            "skeletal_muscle_mass_kg":    raw.get("skeletal_muscle_mass_kg"),
            "body_water_percent":         raw.get("body_water_percent"),
            "total_body_water_liters":    raw.get("total_body_water_liters"),
            "protein_kg":                 raw.get("protein_kg"),
            "minerals_kg":                raw.get("minerals_kg"),
            "visceral_fat_level":         raw.get("visceral_fat_level"),
            "basal_metabolic_rate_kcal":  raw.get("basal_metabolic_rate_kcal"),
            "fitness_score":              raw.get("fitness_score"),
            "segmental_data":             raw.get("segmental_data"),   # None if device didn't provide it
            "firmware_version":           raw.get("firmware_version"),
            "measurement_mode":           raw.get("measurement_mode"),
            "quality_score":              raw.get("quality_score"),
            # ── Source flag ─────────────────────────────────────────────────
            "is_device_measurement": True,
            "source": "device",
        }
