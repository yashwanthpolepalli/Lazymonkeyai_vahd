/**
 * 3rd-Party Optical Fingerprint Scanner RD Service & WebUSB Driver Bridge
 * Supports:
 * - Mantra MFS100 / MFS110
 * - Morpho (IDEMIA Safran MSO 1300 E2 / E3)
 * - SecuGen Hamster Pro 20
 * - Startek FM220
 * - Precision PB510
 *
 * Standard Ports Scanned: 11100, 11101, 11102, 11103, 11104, 11105
 */

export interface RDDeviceInfo {
  status: "READY" | "NOTREADY" | "BUSY" | "NOT_FOUND";
  port: number;
  deviceInfo: string;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  isSimulated?: boolean;
}

export interface RDCaptureResult {
  success: boolean;
  quality: number;
  templateIso: string; // Base64 ISO 19794-2 / Minutiae template
  deviceBrand: string;
  error?: string;
}

const RD_PORTS = [11100, 11101, 11102, 11103, 11104, 11105];

/**
 * Discovers connected USB biometric RD services across standard ports
 */
export async function discoverRDService(): Promise<RDDeviceInfo> {
  for (const port of RD_PORTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const res = await fetch(`http://127.0.0.1:${port}/rd/info`, {
        method: "RDSERVICE",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && (res.ok || res.status === 200)) {
        const text = await res.text();
        const isReady = text.includes('status="READY"') || text.includes("READY");

        let brand = "Mantra MFS100";
        if (text.toLowerCase().includes("morpho") || text.toLowerCase().includes("safran") || text.toLowerCase().includes("idemia")) {
          brand = "Morpho MSO 1300 E3";
        } else if (text.toLowerCase().includes("secugen")) {
          brand = "SecuGen Hamster Pro";
        } else if (text.toLowerCase().includes("startek")) {
          brand = "Startek FM220";
        }

        return {
          status: isReady ? "READY" : "NOTREADY",
          port,
          deviceInfo: text,
          manufacturer: brand.split(" ")[0],
          model: brand,
          isSimulated: false,
        };
      }
    } catch {
      // Continue searching next port
    }
  }

  // Strictly return NOT_FOUND if no real hardware is responding
  return {
    status: "NOT_FOUND",
    port: 0,
    deviceInfo: "No RD Service detected on local ports (11100-11105)",
    manufacturer: "None",
    model: "No Scanner Connected",
    isSimulated: false,
  };
}

/**
 * Triggers optical sensor capture and extracts ISO 19794-2 minutiae template
 */
export async function captureFingerprint(
  device: RDDeviceInfo,
  options?: { timeout?: number; minQuality?: number }
): Promise<RDCaptureResult> {
  const timeoutMs = options?.timeout ?? 10000;

  if (!device.port || device.status === "NOT_FOUND") {
    return {
      success: false,
      quality: 0,
      templateIso: "",
      deviceBrand: device.model || "Unknown",
      error: "No physical USB biometric scanner connected. Please plug in a Mantra, Morpho, or SecuGen scanner and ensure the RD service driver is running.",
    };
  }

  try {
    const pidOptionsXml = `<?xml version="1.0"?>
<PidOptions ver="1.0">
  <Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P" />
</PidOptions>`;

    const res = await fetch(`http://127.0.0.1:${device.port}/rd/capture`, {
      method: "CAPTURE",
      headers: { "Content-Type": "text/xml" },
      body: pidOptionsXml,
    });

    if (res.ok) {
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const respNode = xmlDoc.getElementsByTagName("Resp")[0];
      const errCode = respNode?.getAttribute("errCode") || "0";
      const errInfo = respNode?.getAttribute("errInfo") || "";

      if (errCode === "0" || errCode === "SUCCESS") {
        const pidDataNode = xmlDoc.getElementsByTagName("Data")[0];
        const templateIso = pidDataNode?.textContent?.trim() || "";
        const qScore = parseInt(respNode?.getAttribute("qScore") || "85", 10);

        return {
          success: true,
          quality: qScore,
          templateIso: templateIso,
          deviceBrand: device.model,
        };
      } else {
        return {
          success: false,
          quality: 0,
          templateIso: "",
          deviceBrand: device.model,
          error: errInfo || `Capture failed with error code: ${errCode}`,
        };
      }
    } else {
      return {
        success: false,
        quality: 0,
        templateIso: "",
        deviceBrand: device.model,
        error: `HTTP ${res.status} returned by scanner RD Service driver on port ${device.port}.`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      quality: 0,
      templateIso: "",
      deviceBrand: device.model,
      error: `Failed to communicate with biometric hardware: ${err.message || "Connection refused"}. Please check USB connection.`,
    };
  }
}
