"""FastAPI routes for the eBioServerNew integration.

This router is an application wrapper around the vendor's SOAP client. The
vendor-facing contract lives in essl_bioserver_client.py; these REST routes
exist for the FIT CLUB backend/admin UI and for integration testing.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.services.biometric_service import BiometricService
from src.services.essl_bioserver_client import (
    essl_client,
    EsslBioserverException,
    EsslConnectionError,
    EsslSoapError,
)
from src.services.essl_webhook_crypto import decrypt_ebioserver_webhook_data
from src.schemas.biometrics import (
    BiometricCheckinCreate,
    BiometricDeviceCreate,
    BiometricEnrollmentRequest,
    ESSLWebhookPayload,
    UpdateEmployeeRequest,
    UpdateEmployeeExpiryRequest,
    UpdateEmployeePhotoRequest,
    UpdateEmployeeExRequest,
    DeviceListRequest,
    DeviceLogsRequest,
    EmployeePunchLogsRequest,
    DeviceLogsByLogIdRequest,
    UpdateLocationRequest,
    DeleteLocationRequest,
    UpdateDeviceRequest,
    SerialDeviceRequest,
    ChangeWebAddressRequest,
    ChangeWebPortRequest,
)

logger = logging.getLogger("biometrics_router")
router = APIRouter(prefix="/biometrics", tags=["Biometrics"])


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
try:
    from src.api.deps import get_current_user as _get_current_user
except Exception:
    _get_current_user = None


def require_staff_user(current_user: Any = Depends(_get_current_user) if _get_current_user else Depends(lambda: None)) -> Any:
    """Fail closed when no application authentication dependency is available."""
    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    role = str(getattr(current_user, "role", "")).upper()
    if role not in {"ADMIN", "STAFF", "MANAGER", "GYM_OWNER", "OWNER", "SUPER_ADMIN", "TRAINER"}:
        raise HTTPException(status_code=403, detail="Staff/admin/owner role required")
    return current_user


# ---------------------------------------------------------------------------
# Common error wrapper
# ---------------------------------------------------------------------------
def _vendor_call(fn: Callable[[], Any]) -> Any:
    try:
        return fn()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except EsslConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except EsslSoapError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except EsslBioserverException as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Local application endpoints
# ---------------------------------------------------------------------------
@router.get("/analytics")
def attendance_analytics(
    role: Optional[str] = Query(None, description="Filter by role: ALL, CUSTOMER, TRAINER, STAFF"),
    physical_only: bool = Query(False, description="Filter only physical biometric hardware devices"),
    _auth: Any = Depends(require_staff_user),
    db: Session = Depends(get_db)
):
    return BiometricService.get_attendance_analytics(db, role_filter=role, physical_only=physical_only)


@router.get("/recent")
def recent_biometrics(
    limit: int = Query(50, ge=1, le=200),
    role: Optional[str] = Query(None, description="Filter by role: ALL, CUSTOMER, TRAINER, STAFF"),
    physical_only: bool = Query(False, description="Filter only physical biometric hardware devices"),
    db: Session = Depends(get_db),
    _auth: Any = Depends(require_staff_user),
):
    return BiometricService.get_recent_checkins(db, limit, role_filter=role, physical_only=physical_only)


@router.post("/check-in")
def manual_checkin(payload: BiometricCheckinCreate, db: Session = Depends(get_db), _auth: Any = Depends(require_staff_user)):
    return BiometricService.record_checkin(
        db=db,
        customer_id=payload.customer_id,
        event_type=payload.event_type,
        device_id=payload.device_id,
        direction=payload.direction,
        status=payload.status,
        confidence_score=payload.confidence_score,
    )


@router.get("/devices")
def list_devices(
    location: str = Query("", description="eBioServer location code; blank means all locations"),
    db: Session = Depends(get_db),
    _auth: Any = Depends(require_staff_user),
):
    return _vendor_safe_devices(db, location)


def _vendor_safe_devices(db: Session, location: str) -> Dict[str, Any]:
    return BiometricService.get_all_devices(db, location)


@router.post("/devices")
def register_device(payload: BiometricDeviceCreate, db: Session = Depends(get_db), _auth: Any = Depends(require_staff_user)):
    try:
        return BiometricService.register_device(db, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Documented eBioServer employee API wrappers
# ---------------------------------------------------------------------------
@router.post("/employee/update")
def update_employee(payload: UpdateEmployeeRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_employee(
        payload.EmployeeCode, payload.EmployeeName, payload.EmployeeLocation,
        payload.EmployeeRole, payload.EmployeeVerificationType,
    ))


@router.post("/employee/details")
def get_employee_details(employee_code: str = Query(..., min_length=1), _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.get_employee_details(employee_code))


@router.get("/employee/codes")
def get_employee_codes(_auth: Any = Depends(require_staff_user)):
    return _vendor_call(essl_client.get_employee_codes)


@router.post("/employee/punch-logs")
def get_employee_punch_logs(payload: EmployeePunchLogsRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.get_employee_punch_logs(payload.EmployeeCode, payload.AttendanceDate))


@router.delete("/employee/{employee_code}")
def delete_employee(employee_code: str, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.delete_employee(employee_code))


@router.post("/employee/expiry")
def update_employee_expiry(payload: UpdateEmployeeExpiryRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_employee_with_expiry_dates(
        payload.EmployeeCode, payload.EmployeeName, payload.EmployeeLocation,
        payload.EmployeeRole, payload.EmployeeVerificationType,
        payload.EmployeeExpiryFrom, payload.EmployeeExpiryTo,
    ))


@router.post("/employee/photo")
def update_employee_photo(payload: UpdateEmployeePhotoRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_employee_photo(payload.EmployeeCode, payload.EmployeePhoto))


@router.post("/employee/ex")
def update_employee_ex(payload: UpdateEmployeeExRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_employee_ex(
        payload.EmployeeCode, payload.EmployeeName, payload.EmployeeLocation,
        payload.EmployeeRole, payload.EmployeeVerificationType,
        payload.EmployeeExpiryFrom, payload.EmployeeExpiryTo,
        payload.EmployeeCardNumber, payload.GroupId, payload.EmployeePhoto,
    ))


@router.post("/employee/sync")
def sync_employee(payload: BiometricEnrollmentRequest, _auth: Any = Depends(require_staff_user)):
    if payload.use_extended_update:
        return _vendor_call(lambda: essl_client.update_employee_ex(
            payload.employee_code, payload.employee_name, payload.employee_location,
            payload.employee_role, payload.employee_verification_type,
            payload.employee_expiry_from, payload.employee_expiry_to,
            payload.employee_card_number, payload.group_id, payload.employee_photo or "",
        ))
    return _vendor_call(lambda: essl_client.update_employee(
        payload.employee_code, payload.employee_name, payload.employee_location,
        payload.employee_role, payload.employee_verification_type,
    ))


# ---------------------------------------------------------------------------
# Documented eBioServer device API wrappers
# ---------------------------------------------------------------------------
@router.post("/vendor/device-list")
def vendor_device_list(payload: DeviceListRequest, _auth: Any = Depends(require_staff_user)):
    raw = _vendor_call(lambda: essl_client.get_device_list(payload.Location))
    return {"status": "OK", "operation": "GetDeviceList", "raw_result": raw,
            "parsed": essl_client.parse_device_list_result(raw)}


@router.post("/vendor/device-logs")
def vendor_device_logs(payload: DeviceLogsRequest, _auth: Any = Depends(require_staff_user)):
    raw = _vendor_call(lambda: essl_client.get_device_logs(payload.Location, payload.LogDate))
    return {"status": "OK", "operation": "GetDeviceLogs", "raw_result": raw,
            "records": essl_client.parse_delimited_result(raw)}


@router.post("/vendor/device-illegal-logs")
def vendor_device_illegal_logs(payload: DeviceLogsRequest, _auth: Any = Depends(require_staff_user)):
    raw = _vendor_call(lambda: essl_client.get_device_illegal_logs(payload.Location, payload.LogDate))
    return {"status": "OK", "operation": "GetDeviceIllegalLogs", "raw_result": raw,
            "records": essl_client.parse_delimited_result(raw)}


@router.post("/vendor/location/update")
def vendor_update_location(payload: UpdateLocationRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_location(payload.LocationCode, payload.LocationDescription))


@router.delete("/vendor/location/{location_code}")
def vendor_delete_location(location_code: str, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.delete_location(location_code))


@router.post("/vendor/device/update")
def vendor_update_device(payload: UpdateDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.update_device(
        payload.DeviceSerialNumber, payload.DeviceName, payload.DeviceDiretion,
        payload.DeviceType, payload.TimeZone, payload.DeviceActivationCode,
        payload.Location, payload.IsAttendanceDevice,
    ))


@router.delete("/vendor/device/{serial_number}")
def vendor_delete_device(serial_number: str, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.delete_device(serial_number))


@router.post("/vendor/device/last-ping")
def vendor_device_last_ping(payload: SerialDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.get_device_last_ping(payload.DeviceSerialNumber))


@router.post("/vendor/device/reboot")
def vendor_device_reboot(payload: SerialDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_reboot(payload.DeviceSerialNumber))


@router.post("/vendor/device/reset-op-stamp")
def vendor_reset_op_stamp(payload: SerialDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_reset_op_stamp(payload.DeviceSerialNumber))


@router.post("/vendor/device/reset-transaction-stamp")
def vendor_reset_transaction_stamp(payload: SerialDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_reset_transaction_stamp(payload.DeviceSerialNumber))


@router.post("/vendor/device/clear-logs")
def vendor_clear_logs(payload: SerialDeviceRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_clear_logs(payload.DeviceSerialNumber))


@router.post("/vendor/device/change-web-address")
def vendor_change_web_address(payload: ChangeWebAddressRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_change_web_server_address(
        payload.DeviceSerialNumber, payload.WebServerAddress))


@router.post("/vendor/device/change-web-port")
def vendor_change_web_port(payload: ChangeWebPortRequest, _auth: Any = Depends(require_staff_user)):
    return _vendor_call(lambda: essl_client.device_command_change_web_server_port(
        payload.DeviceSerialNumber, payload.WebServerPort))


@router.post("/vendor/device/logs-by-id")
def vendor_logs_by_id(payload: DeviceLogsByLogIdRequest, _auth: Any = Depends(require_staff_user)):
    raw = _vendor_call(lambda: essl_client.get_device_logs_by_log_id(
        payload.Location, payload.LogId, payload.LogCount))
    return {"status": "OK", "operation": "GetDeviceLogsByLogId", "raw_result": raw,
            "records": essl_client.parse_delimited_result(raw)}


# ---------------------------------------------------------------------------
# eBioServer Web Hook
# ---------------------------------------------------------------------------
@router.post("/essl-webhook", response_class=PlainTextResponse)
async def essl_webhook(request: Request, db: Session = Depends(get_db)):
    """Receive the exact eBioServerNew Web Hook JSON contract.

    Supported vendor modes:
      1. Plain JSON object with EmployeeCode/LogDate/etc.
      2. {"data":"..."} encrypted wrapper using AES-256-CBC.

    The supplied vendor manual specifies AES-256-CBC but does not specify an
    IV. Therefore the IV is configurable with ESSL_WEBHOOK_AES_IV and is never
    guessed from application data.
    """
    allowed_ip = os.getenv("ESSL_WEBHOOK_ALLOWED_IPS", "").strip()
    if allowed_ip:
        client_ip = request.client.host if request.client else ""
        allowed = {x.strip() for x in allowed_ip.split(",") if x.strip()}
        if client_ip not in allowed:
            raise HTTPException(status_code=403, detail="Webhook source IP is not allowed")

    try:
        body = await request.body()
        if len(body) > 10_000_000:
            raise HTTPException(status_code=413, detail="Webhook body too large")
        try:
            outer = json.loads(body.decode("utf-8"))
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Webhook body must be valid JSON") from exc

        payloads = []
        if isinstance(outer, dict) and isinstance(outer.get("data"), str):
            decrypted = decrypt_ebioserver_webhook_data(outer["data"])
            decoded = json.loads(decrypted)
            payloads = decoded if isinstance(decoded, list) else [decoded]
        elif isinstance(outer, dict):
            payloads = [outer]
        elif isinstance(outer, list):
            payloads = outer
        else:
            raise HTTPException(status_code=400, detail="Unsupported webhook JSON shape")

        results = []
        for item in payloads:
            validated = ESSLWebhookPayload.model_validate(item)
            results.append(BiometricService.process_webhook(db, validated.model_dump()))

        # eBioServer manual explicitly documents Success as the webhook response.
        logger.info("eBioServer webhook synchronized %d record(s)", len(results))
        return "Success"

    except HTTPException:
        raise
    except ValueError as exc:
        logger.warning("Invalid eBioServer webhook: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("eBioServer webhook processing failed")
        raise HTTPException(status_code=500, detail="Internal webhook processing error") from exc


@router.get("/essl-status")
def essl_status(_auth: Any = Depends(require_staff_user)):
    return {
        "configured": essl_client.is_configured,
        "endpoint": essl_client.endpoint or None,
        "soap_namespace": "http://tempuri.org/",
        "soap_version": "1.1",
        "webhook_encryption": "AES-256-CBC" if os.getenv("ESSL_WEBHOOK_AES_PASSWORD") else "not configured",
    }
