from typing import Dict, Any, List, Optional
from src.devices.base import BaseDeviceAdapter
from src.devices.inbody.adapter import InBodyDeviceAdapter

class DeviceManager:
    """
    Singleton registry managing registered scanner devices and active hardware adapters dynamically.
    """
    _instance = None
    _adapters: Dict[str, BaseDeviceAdapter] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DeviceManager, cls).__new__(cls)
            cls._adapters = {}
        return cls._instance

    def list_devices(self) -> List[Dict[str, Any]]:
        result = []
        for dev_id, adapter in self._adapters.items():
            result.append(adapter.get_status())
        return result

    def get_device(self, device_id: str) -> Optional[BaseDeviceAdapter]:
        return self._adapters.get(device_id)

    def register_device(self, device_id: str, model_name: str, connection_type: str, config: Optional[Dict[str, Any]] = None) -> BaseDeviceAdapter:
        adapter = InBodyDeviceAdapter(device_id, model_name, connection_type, config)
        adapter.connect()
        self._adapters[device_id] = adapter
        return adapter

    def connect_device(self, device_id: str, connection_type: str = "Wi-Fi", model_name: str = "InBody 570") -> Dict[str, Any]:
        adapter = self.get_device(device_id)
        if not adapter:
            adapter = self.register_device(device_id, model_name, connection_type)

        if connection_type:
            adapter.connection_type = connection_type

        success = adapter.connect()
        status = adapter.get_status()
        status["connect_success"] = success
        return status

device_manager = DeviceManager()
