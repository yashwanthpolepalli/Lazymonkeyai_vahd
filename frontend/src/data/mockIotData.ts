export interface IotDevice {
  id: string;
  deviceId: string;
  name: string;
  type: "Sensor" | "Camera" | "RFID" | "Biometric" | "Scale";
  status: "Online" | "Offline" | "Warning" | "Maintenance";
  location: string;
  batteryLevel: number;
  lastPing: string;
}

export interface DeviceAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: "Critical" | "Warning" | "Info";
  message: string;
  timestamp: string;
  status: "Open" | "Resolved";
}

export const mockIotDevices: IotDevice[] = [
  { id: "IOT-001", deviceId: "SN-Temp-A1", name: "Cold Storage Temp Sensor 1", type: "Sensor", status: "Online", location: "Warehouse A - Zone 1", batteryLevel: 92, lastPing: "Just now" },
  { id: "IOT-002", deviceId: "CAM-Gate-1", name: "Main Gate Camera", type: "Camera", status: "Online", location: "HQ Entrance", batteryLevel: 100, lastPing: "Just now" },
  { id: "IOT-003", deviceId: "RFID-W1", name: "Loading Dock RFID Scanner", type: "RFID", status: "Offline", location: "Warehouse B - Dock 2", batteryLevel: 0, lastPing: "4 hours ago" },
  { id: "IOT-004", deviceId: "BIO-ATT-1", name: "Employee Biometric Terminal", type: "Biometric", status: "Warning", location: "HQ Lobby", batteryLevel: 15, lastPing: "2 mins ago" },
  { id: "IOT-005", deviceId: "SCL-PAL-1", name: "Pallet Weight Scale", type: "Scale", status: "Maintenance", location: "Warehouse A - Dispatch", batteryLevel: 50, lastPing: "1 day ago" },
];

export const mockDeviceAlerts: DeviceAlert[] = [
  { id: "ALT-901", deviceId: "SN-Temp-A1", deviceName: "Cold Storage Temp Sensor 1", type: "Critical", message: "Temperature exceeded threshold (Found 8°C, Max 5°C)", timestamp: "2025-07-01T08:15:00Z", status: "Open" },
  { id: "ALT-902", deviceId: "RFID-W1", deviceName: "Loading Dock RFID Scanner", type: "Warning", message: "Device offline for more than 1 hour", timestamp: "2025-07-01T04:30:00Z", status: "Open" },
  { id: "ALT-903", deviceId: "BIO-ATT-1", deviceName: "Employee Biometric Terminal", type: "Info", message: "Low battery (15%)", timestamp: "2025-07-01T09:00:00Z", status: "Open" },
];

export const mockIotStats = {
  totalDevices: 450,
  onlineDevices: 425,
  offlineDevices: 15,
  maintenanceDevices: 10,
  criticalAlerts: 3,
  warningAlerts: 12,
  dataProcessedToday: "14.2 GB",
};
