"""
InBodyProtocol — Physical device communication layer
=====================================================
Handles ONLY the network/serial/BLE protocol with the physical InBody device.

What this file does:
  - test_connection()    : TCP/UDP handshake to verify the device is reachable.
  - start_measurement()  : Sends the START command to the device over the wire.
  - receive_measurement(): Waits for and reads the raw result packet the device
                           transmits after the member completes the scan.

What this file does NOT do:
  - No estimation formulas.
  - No Deurenberg body-fat equation.
  - No Mifflin-St Jeor BMR equation.
  - No proportional muscle/bone/water assumptions.
  - No segmental distribution math.

If the physical device is not connected (ESSL_BIOSERVER_URL not set), all
measurement methods raise DeviceNotConnectedError immediately so the caller
surfaces a clear "device not connected" error instead of returning fabricated data.
"""
from __future__ import annotations

import os
import uuid
import datetime
import time
from typing import Any, Dict, Optional

from src.devices.base import DeviceNotConnectedError, MeasurementTimeoutError


# ---------------------------------------------------------------------------
# Environment gate — set INBODY_DEVICE_URL in .env to enable real device calls
# ---------------------------------------------------------------------------
_DEVICE_URL: Optional[str] = os.getenv("INBODY_DEVICE_URL") or os.getenv("ESSL_BIOSERVER_URL")
_DEVICE_LIVE = bool(_DEVICE_URL)

if not _DEVICE_LIVE:
    import logging
    logging.getLogger(__name__).warning(
        "[InBodyProtocol] INBODY_DEVICE_URL is not set. "
        "Physical device communication is disabled. "
        "Set INBODY_DEVICE_URL in .env to enable real scanner integration."
    )


class InBodyProtocol:
    """
    Network/serial communication layer for InBody 270 / 570 / 770 devices.
    All methods communicate with the physical device — no estimation logic.
    """

    @staticmethod
    def test_connection(
        connection_type: str,
        device_id: str,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform a TCP/handshake test with the physical scanner.

        In production: opens a socket connection to ip_address (or the URL from
        INBODY_DEVICE_URL) and performs the InBody handshake packet exchange.

        When INBODY_DEVICE_URL is not set: returns a clear 'device_not_configured'
        status instead of pretending the device responded.
        """
        supported = ["Wi-Fi", "LAN", "USB", "Bluetooth"]
        if connection_type not in supported:
            return {
                "success": False,
                "error": f"Unsupported connection method '{connection_type}'.",
                "supported": supported,
            }

        if not _DEVICE_LIVE:
            return {
                "success": False,
                "device_id": device_id,
                "connection_type": connection_type,
                "error": "Device URL not configured. Set INBODY_DEVICE_URL in .env.",
                "device_configured": False,
            }

        # ── Production path: real TCP handshake ──────────────────────────────
        # Example (pseudocode for actual InBody LAN API):
        #   import socket
        #   sock = socket.create_connection((ip_address, 3000), timeout=5)
        #   sock.send(b"\x01\x00\x00\x00")   # InBody handshake packet
        #   resp = sock.recv(64)
        #   firmware = parse_firmware_from_response(resp)
        #   sock.close()
        #
        # Replace with the real InBody SDK call when hardware is available.
        raise DeviceNotConnectedError(
            f"Physical connection to device '{device_id}' at '{ip_address}' "
            f"is not yet implemented in this environment. "
            f"Integrate the InBody SDK or LAN API here."
        )

    @staticmethod
    def start_measurement(
        device_id: str,
        session_id: str,
        customer_id: str,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send the START MEASUREMENT command to the physical InBody device.
        Returns immediately — does not wait for the member to complete the scan.

        The device will perform the measurement independently when the member
        stands on it and grips the electrodes.  Call receive_measurement() after
        this to collect the result.
        """
        if not _DEVICE_LIVE:
            raise DeviceNotConnectedError(
                "Cannot start measurement: INBODY_DEVICE_URL is not configured. "
                "Set it in .env to enable physical scanner integration."
            )

        # ── Production path: send START command to InBody device ─────────────
        # Example (pseudocode for InBody LAN API):
        #   import requests
        #   response = requests.post(
        #       f"{_DEVICE_URL}/api/start",
        #       json={"sessionId": session_id, "customerId": customer_id},
        #       timeout=10,
        #   )
        #   response.raise_for_status()
        #
        # Replace with the real InBody SDK call when hardware is available.
        raise DeviceNotConnectedError(
            f"Physical start_measurement for device '{device_id}' is not yet "
            f"implemented in this environment. Integrate the InBody SDK here."
        )

    @staticmethod
    def receive_measurement(
        device_id: str,
        session_id: str,
        timeout_seconds: int = 120,
        ip_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Wait for and read the completed measurement result from the InBody device.

        Returns ONLY what the physical device actually transmitted.
        Fields the device did not provide are explicitly None — never estimated.

        Expected return keys (all optional except weight_kg):
            weight_kg                   float
            body_fat_percent            float | None
            body_fat_mass_kg            float | None
            skeletal_muscle_mass_kg     float | None
            body_water_percent          float | None
            total_body_water_liters     float | None
            protein_kg                  float | None
            minerals_kg                 float | None
            visceral_fat_level          int   | None
            basal_metabolic_rate_kcal   int   | None
            fitness_score               int   | None
            segmental_data              dict  | None
            firmware_version            str   | None
            measurement_mode            str   | None
            quality_score               int   | None
        """
        if not _DEVICE_LIVE:
            raise DeviceNotConnectedError(
                "Cannot receive measurement: INBODY_DEVICE_URL is not configured. "
                "Set it in .env to enable physical scanner integration."
            )

        # ── Production path: poll or webhook-receive from InBody device ───────
        # Example (pseudocode for InBody LAN API):
        #   import requests, time
        #   deadline = time.time() + timeout_seconds
        #   while time.time() < deadline:
        #       r = requests.get(
        #           f"{_DEVICE_URL}/api/result/{session_id}",
        #           timeout=10,
        #       )
        #       data = r.json()
        #       if data.get("status") == "completed":
        #           return {
        #               "weight_kg":                 data["weight"],
        #               "body_fat_percent":          data.get("bodyFatPercent"),
        #               "body_fat_mass_kg":          data.get("bodyFatMass"),
        #               "skeletal_muscle_mass_kg":   data.get("skeletalMuscleMass"),
        #               "body_water_percent":        data.get("bodyWaterPercent"),
        #               "total_body_water_liters":   data.get("totalBodyWater"),
        #               "protein_kg":                data.get("protein"),
        #               "minerals_kg":               data.get("minerals"),
        #               "visceral_fat_level":        data.get("visceralFatLevel"),
        #               "basal_metabolic_rate_kcal": data.get("bmr"),
        #               "fitness_score":             data.get("inbodyScore"),
        #               "segmental_data":            data.get("segmentalAnalysis"),
        #               "firmware_version":          data.get("firmwareVersion"),
        #               "measurement_mode":          data.get("measurementMode"),
        #               "quality_score":             data.get("qualityScore"),
        #           }
        #       time.sleep(2)
        #   raise MeasurementTimeoutError(f"Device did not respond within {timeout_seconds}s.")
        #
        # Replace with the real InBody SDK call when hardware is available.
        raise DeviceNotConnectedError(
            f"Physical receive_measurement for device '{device_id}' is not yet "
            f"implemented in this environment. Integrate the InBody SDK here."
        )
