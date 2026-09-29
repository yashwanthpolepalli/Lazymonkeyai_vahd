"""eSSL eBioServerNew SOAP 1.1 client.

Contract basis: eBioServerNew Web API Service manual v1.3 (27-Mar-2025).
Only operations documented in that manual are exposed here.
"""
from __future__ import annotations

import os
import logging
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

import httpx

logger = logging.getLogger("essl_bioserver")

SOAP_NS = "http://schemas.xmlsoap.org/soap/envelope/"
TEMPURI_NS = "http://tempuri.org/"
SOAP_CONTENT_TYPE = "text/xml; charset=utf-8"


class EsslBioserverException(Exception):
    """Base eBioServer integration error."""


class EsslConnectionError(EsslBioserverException):
    """Network/timeout/DNS/TLS connection failure."""


class EsslSoapError(EsslBioserverException):
    """HTTP/SOAP/XML contract failure returned by eBioServer."""


# The supplied manual documents 32-character webhook passwords for AES-256.
# It does not document an IV. Keep IV configurable instead of inventing a
# vendor-specific value.
def _normalize_webhook_key(password: str) -> bytes:
    raw = (password or "").encode("utf-8")
    if len(raw) == 32:
        return raw
    if len(raw) < 32:
        return raw.ljust(32, b"1")
    return raw[:32]


def _xml_escape(value: Any) -> str:
    return escape("" if value is None else str(value), {"\"": "&quot;", "'": "&apos;"})


def build_soap_envelope(operation: str, params: Dict[str, Any]) -> str:
    """Build SOAP 1.1 exactly in the shape shown by the eSSL manual."""
    body_params = "\n".join(
        f"      <{name}>{_xml_escape(value)}</{name}>"
        for name, value in params.items()
    )
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
        'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n'
        "  <soap:Body>\n"
        f'    <{operation} xmlns="{TEMPURI_NS}">\n'
        f"{body_params}\n"
        f"    </{operation}>\n"
        "  </soap:Body>\n"
        "</soap:Envelope>"
    )


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def extract_soap_fault(xml_text: str) -> Optional[str]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return None
    for elem in root.iter():
        if _local(elem.tag) == "Fault":
            for child in elem.iter():
                if _local(child.tag) in {"faultstring", "Text"} and child.text:
                    return child.text.strip()
            return "Unknown SOAP fault"
    return None


def parse_soap_result(xml_text: str, operation: str) -> str:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise EsslSoapError(f"{operation}: invalid XML response: {exc}") from exc

    fault = extract_soap_fault(xml_text)
    if fault:
        raise EsslSoapError(f"{operation}: SOAP Fault: {fault}")

    expected = f"{operation}Result"
    for elem in root.iter():
        if _local(elem.tag) == expected:
            return (elem.text or "").strip()

    # Some ASMX responses can be empty. Returning an empty string preserves
    # the documented Result string without guessing a different schema.
    return ""


def _split_records(raw: str) -> List[List[str]]:
    """Parse eBioServer's documented comma-field / semicolon-record format."""
    if not raw:
        return []
    records: List[List[str]] = []
    for record in raw.split(";"):
        record = record.strip()
        if record:
            records.append([part.strip() for part in record.split(",")])
    return records


class EsslBioserverClient:
    """Synchronous SOAP client for the documented eBioServerNew API."""

    def __init__(self) -> None:
        self.base_url = os.getenv("ESSL_BIOSERVER_URL", "").rstrip("/")
        self.endpoint = (
            self.base_url
            if self.base_url.lower().endswith(".asmx")
            else f"{self.base_url}/Webservice.asmx" if self.base_url else ""
        )
        self.username = os.getenv("ESSL_BIOSERVER_USER", "")
        self.password = os.getenv("ESSL_BIOSERVER_PASSWORD", "")
        self.timeout = float(os.getenv("ESSL_BIOSERVER_TIMEOUT", "10"))
        self.verify_ssl = os.getenv("ESSL_BIOSERVER_VERIFY_SSL", "true").lower() in {"1", "true", "yes"}
        self.location = os.getenv("ESSL_BIOSERVER_LOCATION", "")

    @property
    def is_configured(self) -> bool:
        return bool(self.endpoint and self.username and self.password)

    def _post_soap(self, operation: str, params: Dict[str, Any]) -> str:
        if not self.is_configured:
            raise EsslConnectionError("eBioServer is not configured")

        envelope = build_soap_envelope(operation, params)
        headers = {
            "Content-Type": SOAP_CONTENT_TYPE,
            "SOAPAction": f'"{TEMPURI_NS}{operation}"',
        }
        try:
            with httpx.Client(timeout=self.timeout, verify=self.verify_ssl) as client:
                response = client.post(self.endpoint, content=envelope.encode("utf-8"), headers=headers)
        except httpx.TimeoutException as exc:
            raise EsslConnectionError(f"{operation}: request timed out") from exc
        except httpx.RequestError as exc:
            raise EsslConnectionError(f"{operation}: connection failed: {exc}") from exc

        if response.status_code != 200:
            raise EsslSoapError(
                f"{operation}: HTTP {response.status_code}: {response.text[:500]}"
            )
        return parse_soap_result(response.text, operation)

    def _auth(self) -> Dict[str, str]:
        return {"UserName": self.username, "Password": self.password}

    # ------------------------- Employee API -------------------------
    def update_employee(self, employee_code: str, employee_name: str,
                        employee_location: str, employee_role: str,
                        employee_verification_type: str = "") -> str:
        p = self._auth()
        p.update({
            "EmployeeCode": employee_code,
            "EmployeeName": employee_name,
            "EmployeeLocation": employee_location,
            "EmployeeRole": employee_role,
            "EmployeeVerificationType": employee_verification_type,
        })
        return self._post_soap("UpdateEmployee", p)

    def get_employee_details(self, employee_code: str) -> str:
        p = self._auth(); p["EmployeeCode"] = employee_code
        return self._post_soap("GetEmployeeDetails", p)

    def get_employee_codes(self) -> str:
        # The manual's page-7 example contains a copy/paste SOAP sample using
        # GetEmployeeDetails; the method heading and operation are GetEmployeeCodes.
        return self._post_soap("GetEmployeeCodes", self._auth())

    def get_employee_punch_logs(self, employee_code: str, attendance_date: str) -> str:
        p = self._auth(); p.update({"EmployeeCode": employee_code, "AttendanceDate": attendance_date})
        return self._post_soap("GetEmployeePunchLogs", p)

    def delete_employee(self, employee_code: str) -> str:
        p = self._auth(); p["EmployeeCode"] = employee_code
        return self._post_soap("DeleteEmployee", p)

    def update_employee_with_expiry_dates(
        self, employee_code: str, employee_name: str, employee_location: str,
        employee_role: str, employee_verification_type: str,
        employee_expiry_from: str, employee_expiry_to: str,
    ) -> str:
        p = self._auth(); p.update({
            "EmployeeCode": employee_code,
            "EmployeeName": employee_name,
            "EmployeeLocation": employee_location,
            "EmployeeRole": employee_role,
            "EmployeeVerificationType": employee_verification_type,
            "EmployeeExpiryFrom": employee_expiry_from,
            "EmployeeExpiryTo": employee_expiry_to,
        })
        return self._post_soap("UpdateEmployeewithExpiryDates", p)

    def update_employee_photo(self, employee_code: str, employee_photo_base64: str) -> str:
        p = self._auth(); p.update({"EmployeeCode": employee_code, "EmployeePhoto": employee_photo_base64})
        return self._post_soap("UpdateEmployeePhoto", p)

    def update_employee_ex(
        self, employee_code: str, employee_name: str, employee_location: str,
        employee_role: str, employee_verification_type: str,
        employee_expiry_from: str, employee_expiry_to: str,
        employee_card_number: str, group_id: str, employee_photo: str,
    ) -> str:
        p = self._auth(); p.update({
            "EmployeeCode": employee_code,
            "EmployeeName": employee_name,
            "EmployeeLocation": employee_location,
            "EmployeeRole": employee_role,
            "EmployeeVerificationType": employee_verification_type,
            "EmployeeExpiryFrom": employee_expiry_from,
            "EmployeeExpiryTo": employee_expiry_to,
            "EmployeeCardNumber": employee_card_number,
            "GroupId": group_id,
            "EmployeePhoto": employee_photo,
        })
        return self._post_soap("UpdateEmployeeEx", p)

    # ------------------------- Device API -------------------------
    def get_device_list(self, location: Optional[str] = None) -> str:
        p = self._auth(); p["Location"] = self.location if location is None else location
        return self._post_soap("GetDeviceList", p)

    def get_device_logs(self, location: Optional[str], log_date: str) -> str:
        p = self._auth(); p.update({"Location": self.location if location is None else location, "LogDate": log_date})
        return self._post_soap("GetDeviceLogs", p)

    def get_device_illegal_logs(self, location: Optional[str], log_date: str) -> str:
        p = self._auth(); p.update({"Location": self.location if location is None else location, "LogDate": log_date})
        return self._post_soap("GetDeviceIllegalLogs", p)

    def update_location(self, location_code: str, location_description: str) -> str:
        p = self._auth(); p.update({"LocationCode": location_code, "LocationDescription": location_description})
        return self._post_soap("UpdateLocation", p)

    def delete_location(self, location_code: str) -> str:
        p = self._auth(); p["LocationCode"] = location_code
        return self._post_soap("DeleteLocation", p)

    def update_device(
        self, device_serial_number: str, device_name: str, device_direction: str,
        device_type: str, time_zone: str, device_activation_code: str,
        location: str, is_attendance_device: str,
    ) -> str:
        p = self._auth(); p.update({
            "DeviceSerialNumber": device_serial_number,
            "DeviceName": device_name,
            "DeviceDiretion": device_direction,  # spelling is from the official manual
            "DeviceType": device_type,
            "TimeZone": time_zone,
            "DeviceActivationCode": device_activation_code,
            "Location": location,
            "IsAttendanceDevice": is_attendance_device,
        })
        return self._post_soap("UpdateDevice", p)

    def delete_device(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("DeleteDevice", p)

    def get_device_last_ping(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("GetDeviceLastPing", p)

    def device_command_reboot(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("DeviceCommand_Reboot", p)

    def device_command_reset_op_stamp(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("DeviceCommand_ResetOPStamp", p)

    def device_command_reset_transaction_stamp(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("DeviceCommand_ResetTransactionStamp", p)

    def device_command_clear_logs(self, device_serial_number: str) -> str:
        p = self._auth(); p["DeviceSerialNumber"] = device_serial_number
        return self._post_soap("DeviceCommand_ClearLogs", p)

    def device_command_change_web_server_address(self, device_serial_number: str, web_server_address: str) -> str:
        p = self._auth(); p.update({"DeviceSerialNumber": device_serial_number, "WebServerAddress": web_server_address})
        return self._post_soap("DeviceCommand_ChangeWebServerAddress", p)

    def device_command_change_web_server_port(self, device_serial_number: str, web_server_port: str) -> str:
        p = self._auth(); p.update({"DeviceSerialNumber": device_serial_number, "WebServerPort": web_server_port})
        return self._post_soap("DeviceCommand_ChangeWebServerPort", p)

    def get_device_logs_by_log_id(self, location: Optional[str], log_id: str, log_count: str) -> str:
        p = self._auth(); p.update({
            "Location": self.location if location is None else location,
            "LogId": log_id,
            "LogCount": log_count,
        })
        return self._post_soap("GetDeviceLogsByLogId", p)

    # ------------------------- Response helpers -------------------------
    @staticmethod
    def parse_delimited_result(raw: str) -> List[List[str]]:
        return _split_records(raw)

    @staticmethod
    def parse_device_list_result(raw: str) -> List[Dict[str, Any]]:
        """Best-effort parser for an ASMX XML fragment/DataSet returned as Result."""
        if not raw:
            return []
        try:
            root = ET.fromstring(f"<root>{raw}</root>")
        except ET.ParseError as exc:
            # Device-list result is documented as a string, so a plain
            # delimited result is still useful for testing older builds.
            rows = _split_records(raw)
            return [{"raw_fields": row} for row in rows]

        candidates = []
        for row in root.iter():
            children = list(row)
            if children and any(_local(c.tag) in {"DeviceID", "SerialNumber", "DeviceName"} for c in children):
                candidates.append(row)
        if not candidates:
            candidates = [root]

        result: List[Dict[str, Any]] = []
        for row in candidates:
            item: Dict[str, Any] = {}
            for child in row:
                key = _local(child.tag)
                value = (child.text or "").strip()
                if key:
                    item[key] = value
            if item:
                result.append(item)
        return result


essl_client = EsslBioserverClient()
