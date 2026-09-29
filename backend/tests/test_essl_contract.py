import os
import sys
import unittest

# Ensure backend root is on sys.path for imports like `src.services...`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.services.essl_bioserver_client import EsslBioserverClient, build_soap_envelope
from src.schemas.biometrics import ESSLWebhookPayload


class ContractTests(unittest.TestCase):
    def test_soap_1_1_shape(self):
        xml = build_soap_envelope("GetDeviceList", {
            "UserName": "u", "Password": "p", "Location": "L1"
        })
        self.assertIn('xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"', xml)
        self.assertIn('<GetDeviceList xmlns="http://tempuri.org/">', xml)
        self.assertIn('<Location>L1</Location>', xml)

    def test_documented_operation_names(self):
        client = EsslBioserverClient()
        calls = []
        client._enabled = True
        client.base_url = "http://example"
        client.endpoint = "http://example/Webservice.asmx"
        client.username = "u"
        client.password = "p"
        client._post_soap = lambda op, params: calls.append((op, params)) or "OK"

        client.get_device_list("")
        client.get_device_logs("", "2026-08-28")
        client.get_employee_punch_logs("S1123", "2026-08-28")
        client.get_device_last_ping("SERIAL1")
        client.device_command_reboot("SERIAL1")
        client.device_command_reset_op_stamp("SERIAL1")
        client.device_command_reset_transaction_stamp("SERIAL1")
        client.device_command_clear_logs("SERIAL1")
        client.device_command_change_web_server_address("SERIAL1", "http://host")
        client.device_command_change_web_server_port("SERIAL1", "8080")
        client.get_device_logs_by_log_id("", "100", "50")

        names = [x[0] for x in calls]
        for expected in [
            "GetDeviceList", "GetDeviceLogs", "GetEmployeePunchLogs",
            "GetDeviceLastPing", "DeviceCommand_Reboot",
            "DeviceCommand_ResetOPStamp", "DeviceCommand_ResetTransactionStamp",
            "DeviceCommand_ClearLogs", "DeviceCommand_ChangeWebServerAddress",
            "DeviceCommand_ChangeWebServerPort", "GetDeviceLogsByLogId",
        ]:
            self.assertIn(expected, names)
        self.assertNotIn("GetDevicePunchLogs", names)

    def test_webhook_schema_matches_vendor_fields(self):
        payload = ESSLWebhookPayload.model_validate({
            "EmployeeCode": "S1123",
            "DownloadDate": "2025-01-18 16:28:37",
            "LogDate": "2025-01-18 16:27:09",
            "DeviceName": "SilkBio",
            "SerialNumber": "AEXY182960104",
            "Direction": "IN",
            "DeviceDirection": "Device",
            "WorkCode": "0",
            "VerificationType": "Finger or Face or Card or Password",
            "GPS": "0,0",
        })
        self.assertEqual(payload.EmployeeCode, "S1123")
        self.assertEqual(payload.SerialNumber, "AEXY182960104")


if __name__ == "__main__":
    unittest.main()
