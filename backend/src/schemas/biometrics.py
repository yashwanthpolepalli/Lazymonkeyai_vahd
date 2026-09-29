"""Pydantic schemas for the documented eBioServerNew integration."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

MAX_TEXT = 5_000_000


class BiometricDeviceCreate(BaseModel):
    id: Optional[str] = None
    external_device_id: Optional[str] = None
    serial_number: Optional[str] = None
    device_name: Optional[str] = None
    model_name: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    device_type: Optional[str] = None
    connection_type: Optional[str] = None
    mac_address: Optional[str] = None
    wifi_ssid: Optional[str] = None
    is_wireless: Optional[bool] = None
    status: Optional[str] = None
    location: Optional[str] = None


class BiometricCheckinCreate(BaseModel):
    customer_id: str = Field(..., min_length=1)
    event_type: str = Field(..., min_length=1)
    device_id: str = Field(..., min_length=1)
    direction: str = Field(default="CHECK_IN")
    status: str = Field(default="SUCCESS")
    confidence_score: Optional[float] = Field(default=None, ge=0, le=100)


class BiometricEnrollmentRequest(BaseModel):
    """Application-level employee synchronization request.

    The supplied official manual does NOT document raw face/fingerprint
    template enrollment commands. This schema therefore models the documented
    employee/photo/card/verification operations instead of pretending those
    undocumented commands are official.
    """
    employee_code: str = Field(..., min_length=1)
    employee_name: str = Field(..., min_length=1)
    employee_location: str = Field(default="")
    employee_role: str = Field(default="Normal")
    employee_verification_type: str = Field(default="")
    employee_expiry_from: str = Field(default="")
    employee_expiry_to: str = Field(default="")
    employee_card_number: str = Field(default="")
    group_id: str = Field(default="")
    employee_photo: Optional[str] = Field(default=None, max_length=MAX_TEXT)
    use_extended_update: bool = True


class ESSLWebhookPayload(BaseModel):
    """Exact raw JSON fields documented by eBioServerNew Web Hook."""
    model_config = ConfigDict(extra="allow")

    EmployeeCode: str = Field(..., min_length=1)
    DownloadDate: str = Field(..., min_length=1)
    LogDate: str = Field(..., min_length=1)
    DeviceName: str = Field(..., min_length=1)
    SerialNumber: str = Field(..., min_length=1)
    Direction: str = Field(..., min_length=1)
    DeviceDirection: str = Field(default="")
    WorkCode: str = Field(default="0")
    VerificationType: str = Field(default="")
    GPS: str = Field(default="")


class WebhookEnvelope(BaseModel):
    """Encrypted webhook wrapper documented by eBioServerNew."""
    data: str = Field(..., min_length=1, max_length=MAX_TEXT)


class UpdateEmployeeRequest(BaseModel):
    UserName: Optional[str] = None
    Password: Optional[str] = None
    EmployeeCode: str = Field(..., min_length=1)
    EmployeeName: str = Field(..., min_length=1)
    EmployeeLocation: str = ""
    EmployeeRole: str = "Normal"
    EmployeeVerificationType: str = ""


class UpdateEmployeeExpiryRequest(UpdateEmployeeRequest):
    EmployeeExpiryFrom: str = ""
    EmployeeExpiryTo: str = ""


class UpdateEmployeePhotoRequest(BaseModel):
    EmployeeCode: str = Field(..., min_length=1)
    EmployeePhoto: str = Field(..., min_length=1, max_length=MAX_TEXT)


class UpdateEmployeeExRequest(UpdateEmployeeExpiryRequest):
    EmployeeCardNumber: str = ""
    GroupId: str = ""
    EmployeePhoto: str = Field(default="", max_length=MAX_TEXT)


class DeviceListRequest(BaseModel):
    Location: str = ""


class DeviceLogsRequest(BaseModel):
    Location: str = ""
    LogDate: str = Field(..., min_length=1)


class EmployeePunchLogsRequest(BaseModel):
    EmployeeCode: str = Field(..., min_length=1)
    AttendanceDate: str = Field(..., min_length=1)


class DeviceLogsByLogIdRequest(BaseModel):
    Location: str = ""
    LogId: str = Field(..., min_length=1)
    LogCount: str = Field(..., min_length=1)


class UpdateLocationRequest(BaseModel):
    LocationCode: str = Field(..., min_length=1)
    LocationDescription: str = ""


class DeleteLocationRequest(BaseModel):
    LocationCode: str = Field(..., min_length=1)


class UpdateDeviceRequest(BaseModel):
    DeviceSerialNumber: str = Field(..., min_length=1)
    DeviceName: str = ""
    DeviceDiretion: str = ""
    DeviceType: str = ""
    TimeZone: str = ""
    DeviceActivationCode: str = ""
    Location: str = ""
    IsAttendanceDevice: str = ""


class SerialDeviceRequest(BaseModel):
    DeviceSerialNumber: str = Field(..., min_length=1)


class ChangeWebAddressRequest(SerialDeviceRequest):
    WebServerAddress: str = Field(..., min_length=1)


class ChangeWebPortRequest(SerialDeviceRequest):
    WebServerPort: str = Field(..., min_length=1)
