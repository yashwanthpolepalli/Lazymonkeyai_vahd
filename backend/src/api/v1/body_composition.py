from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from src.database.session import get_db
from src.services.device_connection_service import DeviceConnectionService
from src.services.body_composition_service import BodyCompositionService
from src.services.report_service import BodyCompositionReportService
from src.devices.base import DeviceNotConnectedError, DeviceNotFoundError, MeasurementTimeoutError

router = APIRouter(prefix="/body-composition", tags=["Body Composition & BMI Scanners"])

@router.get("/devices")
def list_bmi_devices():
    """Returns list of registered and discovered BMI/body-composition scanner devices."""
    return DeviceConnectionService.get_all_devices()

@router.post("/devices")
def register_bmi_device(payload: Dict[str, Any] = Body(...)):
    """Registers a new physical scanner device (e.g. InBody 570, Tanita, Accuniq)."""
    return DeviceConnectionService.register_new_device(payload)

@router.post("/devices/{device_id}/connect")
def connect_bmi_device(device_id: str, payload: Dict[str, Any] = Body(default={})):
    """Tests connection parameters (Wi-Fi, LAN, USB, Bluetooth) and performs handshake with scanner."""
    return DeviceConnectionService.connect_and_test_device(device_id, payload)

@router.get("/devices/{device_id}/status")
def get_bmi_device_status(device_id: str):
    """Fetches real-time status and health telemetry of a scanner device."""
    return DeviceConnectionService.get_device_status(device_id)

@router.post("/scans")
def submit_canonical_device_scan(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Device -> Backend: Submit Scan Canonical Endpoint.
    Validates scan JSON, saves to PostgreSQL, and returns Backend -> Device Acknowledge Scan JSON response.
    """
    return BodyCompositionService.ingest_scan_from_device(db, payload)

@router.post("/tests/start")
def start_body_scan_session(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Starts measurement session on physical scanner device.
    Returns session handle. Does NOT generate estimated body composition numbers.
    """
    try:
        return BodyCompositionService.start_scan_session(db, payload)
    except DeviceNotConnectedError as err:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "DEVICE_NOT_CONNECTED",
                "message": str(err),
                "hint": "Set INBODY_DEVICE_URL in .env and verify scanner power & Wi-Fi connection."
            }
        )
    except DeviceNotFoundError as err:
        raise HTTPException(status_code=404, detail={"code": "DEVICE_NOT_FOUND", "message": str(err)})

@router.post("/tests/receive")
def receive_body_scan_result(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Receives raw measurement result from scanner adapter, maps to canonical schema, and stores in DB.
    """
    device_id = payload.get("device_id")
    session_id = payload.get("session_id")
    height_cm = float(payload.get("height_cm") or 0.0)
    gender = payload.get("gender")

    if not device_id or not session_id:
        raise HTTPException(status_code=422, detail={"code": "MISSING_PARAMS", "message": "device_id and session_id are required."})

    try:
        return BodyCompositionService.receive_scan_result(db, device_id, session_id, height_cm, gender)
    except DeviceNotConnectedError as err:
        raise HTTPException(status_code=503, detail={"code": "DEVICE_NOT_CONNECTED", "message": str(err)})
    except MeasurementTimeoutError as err:
        raise HTTPException(status_code=504, detail={"code": "MEASUREMENT_TIMEOUT", "message": str(err)})

@router.get("/scans/{scan_id}")
def get_canonical_scan_report_by_id(scan_id: str, db: Session = Depends(get_db)):
    """Backend -> Web App: Full Scan Result (InBody-Style Report Canonical JSON)."""
    return BodyCompositionService.get_full_scan_report(db, customer_id="cust_1", scan_id=scan_id)

@router.get("/customers/{customer_id}/report")
def get_canonical_customer_latest_report(customer_id: str, db: Session = Depends(get_db)):
    """Backend -> Web App: Full Scan Result InBody-Style Report for a specific member."""
    return BodyCompositionService.get_full_scan_report(db, customer_id=customer_id)

@router.get("/customers/{customer_id}/history")
def get_customer_scan_history(customer_id: str, db: Session = Depends(get_db)):
    """Fetches historical scan records for a gym member."""
    return BodyCompositionService.get_customer_history(db, customer_id)

@router.post("/reports")
def generate_custom_report(payload: Dict[str, Any] = Body(...)):
    """Generates custom inbound or outbound body composition analysis report."""
    return BodyCompositionReportService.generate_report(payload)

@router.post("/reports/{report_id}/send")
def send_report_to_customer(report_id: str, payload: Dict[str, Any] = Body(...)):
    """Sends custom report to customer via Email, SMS, or WhatsApp."""
    return BodyCompositionReportService.send_report_to_customer(report_id, payload)
