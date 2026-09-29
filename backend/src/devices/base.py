"""
base.py — Abstract Device Adapter Interface
============================================
Defines the contract every physical scanner adapter must implement.

Key design decisions:
  - `start_measurement()` only STARTS a session on the device and returns immediately.
    It does not return any body-composition values — the device hasn't measured yet.
  - `receive_measurement()` WAITS for or FETCHES the completed result from the device.
    It returns only what the physical device actually sent — never estimated values.
  - BMI is NOT calculated here. That belongs in FIT CLUB's calculation layer.
  - If a device does not provide a field (e.g. segmental data), that field must be
    absent or explicitly None in the returned dict — never substituted with a formula.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import datetime


class DeviceNotConnectedError(Exception):
    """Raised when a scan is attempted on a device that is not connected."""


class DeviceNotFoundError(Exception):
    """Raised when the requested device ID is not registered."""


class MeasurementTimeoutError(Exception):
    """Raised when the device does not return a result within the timeout window."""


class BaseDeviceAdapter(ABC):
    """
    Abstract base for all body-composition / BMI scanner adapters.
    One concrete subclass per device vendor/model family.
    """

    def __init__(
        self,
        device_id: str,
        model_name: str,
        connection_type: str,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.device_id = device_id
        self.model_name = model_name
        self.connection_type = connection_type
        self.config = config or {}
        self.is_connected: bool = False
        self.last_seen: Optional[datetime.datetime] = None

    # ── Connection lifecycle ──────────────────────────────────────────────────

    @abstractmethod
    def connect(self) -> bool:
        """
        Perform device handshake / authentication.
        Returns True if connection was established, False otherwise.
        Does NOT perform any measurement.
        """

    @abstractmethod
    def disconnect(self) -> bool:
        """Release the connection to the device cleanly."""

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """
        Return real-time device telemetry.
        Example fields: is_connected, signal_strength, firmware_version, battery_level.
        Never includes estimated body-composition values.
        """

    # ── Measurement session ───────────────────────────────────────────────────

    @abstractmethod
    def start_measurement(self, session_id: str, customer_id: str) -> Dict[str, Any]:
        """
        Send the START MEASUREMENT command to the physical device.
        Returns immediately with the session handle — does NOT wait for results.

        The member then steps onto / into the scanner.  The device performs the
        measurement independently.

        Returned dict must contain at minimum:
            session_id   str
            device_id    str
            status       "waiting_for_measurement"
        """

    @abstractmethod
    def receive_measurement(
        self, session_id: str, timeout_seconds: int = 120
    ) -> Dict[str, Any]:
        """
        Wait for (or poll) the completed measurement result from the device.

        Returns a raw payload dict containing ONLY what the physical device
        actually transmitted.  Fields the device did not provide must be
        absent or explicitly None — never estimated or filled with formulas.

        Expected raw fields (all optional except weight):
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

    @abstractmethod
    def get_supported_connection_types(self) -> List[str]:
        """Return the list of protocols this adapter supports (e.g. ['Wi-Fi', 'LAN'])."""
