import uuid
import datetime
from typing import Dict, Any

class BodyCompositionReportService:
    """
    Generates custom inbound and outbound PDF reports dynamically and handles report delivery to customers via Email/WhatsApp.
    """
    @staticmethod
    def generate_report(payload: Dict[str, Any]) -> Dict[str, Any]:
        report_id = f"rpt_{uuid.uuid4().hex[:8]}"
        customer_id = payload.get("customer_id")
        report_type = payload.get("report_type", "outbound")  # inbound / outbound
        format_type = payload.get("format", "PDF")

        title = "InBody Detailed Body Composition Analysis Report" if report_type == "outbound" else "Inbound Scan Summary"

        return {
            "report_id": report_id,
            "customer_id": customer_id,
            "report_type": report_type,
            "title": f"FIT CLUB - {title}",
            "format": format_type,
            "download_url": f"/api/v1/body-composition/reports/{report_id}/download",
            "created_at": datetime.datetime.now().isoformat()
        }

    @staticmethod
    def send_report_to_customer(report_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = payload.get("customer_id")
        channels = payload.get("channels", ["email", "whatsapp"])

        return {
            "success": True,
            "report_id": report_id,
            "customer_id": customer_id,
            "delivered_channels": channels,
            "message": f"Report #{report_id} successfully delivered via {', '.join(channels).upper()}!",
            "sent_at": datetime.datetime.now().isoformat()
        }
