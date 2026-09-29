from typing import Dict, Any, List
from src.devices.device_manager import device_manager

class DeviceConnectionService:
    """
    Manages body composition scanner device discovery, connection testing, and telemetry status dynamically.
    """
    @staticmethod
    def get_all_devices() -> List[Dict[str, Any]]:
        return device_manager.list_devices()

    @staticmethod
    def register_new_device(payload: Dict[str, Any]) -> Dict[str, Any]:
        device_id = payload.get("device_id")
        if not device_id:
            raise ValueError("device_id is required")

        model_name = payload.get("model_name", "InBody Scanner")
        connection_type = payload.get("connection_type", "Wi-Fi")
        adapter = device_manager.register_device(device_id, model_name, connection_type, payload.get("config"))
        return adapter.get_status()

    @staticmethod
    def connect_and_test_device(device_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        connection_type = payload.get("connection_type")
        model_name = payload.get("model_name")
        return device_manager.connect_device(device_id, connection_type=connection_type, model_name=model_name)

    @staticmethod
    def get_device_status(device_id: str) -> Dict[str, Any]:
        adapter = device_manager.get_device(device_id)
        if not adapter:
            return {
                "device_id": device_id,
                "is_connected": False,
                "error": "Device not found"
            }
        return adapter.get_status()
