import { apiClient } from './apiClient';

export type BiometricType = 'face' | 'fingerprint' | 'face_and_fingerprint';
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'capturing';
export type ConnectionType = 'LAN' | 'WiFi' | 'Bluetooth' | 'USB' | string;

export interface EnrollmentDevice {
  id: string;
  name: string;
  vendor: string;
  model: string;
  serial_number: string;
  location: string;
  connection_type: ConnectionType;
  status: DeviceStatus;
  capabilities: BiometricType[];
  ip_address?: string;
  mac_address?: string;
  wifi_ssid?: string;
  is_wireless?: boolean;
  essl_live?: boolean;
}

export interface BiometricEnrollment {
  id: string;
  person_id: string;
  person_type: 'member' | 'trainer';
  biometric_type: BiometricType;
  device_id: string | null;
  provider_reference: string | null;
  status: 'pending' | 'capturing' | 'captured' | 'failed' | 'cancelled';
  captured_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const biometricService = {
  /**
   * Fetches real live biometric devices from backend DB.
   * The backend derives connection_type (LAN / WiFi / Bluetooth / USB)
   * from the device's ip_address, mac_address, wifi_ssid and is_wireless fields.
   * Returns an EMPTY array if no physical devices are registered — never uses hardcoded fallbacks.
   */
  async listDevices(): Promise<EnrollmentDevice[]> {
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const raw: any[] = await apiClient.get('/biometrics/devices');
      if (!Array.isArray(raw)) return [];

      return raw.map((d: any) => {
        // Capabilities come from backend's _device_capabilities helper
        const caps: BiometricType[] = Array.isArray(d.capabilities) && d.capabilities.length > 0
          ? d.capabilities as BiometricType[]
          : (() => {
            const dt = String(d.device_type || '').toUpperCase();
            if (dt.includes('FINGER')) return ['fingerprint'];
            if (dt.includes('FACE') && !dt.includes('MULTI')) return ['face'];
            return ['face', 'fingerprint', 'face_and_fingerprint'];
          })();

        return {
          id: d.id,
          name: d.device_name || d.name || d.id,
          vendor: 'eSSL Security',
          model: d.model_name || d.model || 'eSSL Biometric Terminal',
          serial_number: d.serial_number || '',
          location: d.location || '',
          connection_type: d.connection_type || 'LAN',
          status: String(d.status || 'OFFLINE').toLowerCase() as DeviceStatus,
          capabilities: caps,
          ip_address: d.ip_address || '',
          mac_address: d.mac_address || '',
          wifi_ssid: d.wifi_ssid || '',
          is_wireless: Boolean(d.is_wireless),
          essl_live: Boolean(d.essl_live),
        };
      });
    } catch (_err) {
      return [];
    }
  },

  async enrollBiometrics(payload: {
    customer_id: string;
    face_image_base64?: string;
    fingerprint_template?: string;
    rfid_card_number?: string;
    target_device_ids?: string[];
  }) {
    try {
      return await apiClient.post('/biometrics/enroll', payload);
    } catch (_err) {
      return null;
    }
  },

  async getDevicesByCapability(cap: BiometricType): Promise<EnrollmentDevice[]> {
    const all = await this.listDevices();
    return all.filter((d) => d.status === 'online' && d.capabilities.includes(cap));
  },

  /**
   * Creates a biometric enrollment session via real backend API.
   * Returns null if backend call fails — no local object construction.
   */
  async createEnrollment(input: {
    person_id: string;
    person_type: 'member' | 'trainer';
    biometric_type: BiometricType;
    device_id: string;
  }): Promise<BiometricEnrollment | null> {
    if (!input.person_id || !input.person_type || !input.biometric_type || !input.device_id) {
      console.error('[biometricService.createEnrollment] Missing required fields:', input);
      return null;
    }
    try {
      const result = await apiClient.post<BiometricEnrollment>('/biometrics/enroll', {
        customer_id: input.person_id,
        person_type: input.person_type,
        biometric_type: input.biometric_type,
        target_device_ids: [input.device_id],
      });
      return (result as BiometricEnrollment) ?? null;
    } catch (e) {
      console.error('[biometricService.createEnrollment] Backend error:', e);
      return null;
    }
  },

  /**
   * Marks a biometric enrollment as complete via real backend API.
   * Returns null if backend call fails — no local object construction.
   */
  async completeEnrollment(
    enrollmentId: string,
    providerReference: string,
    input: { person_id: string; person_type: 'member' | 'trainer'; biometric_type: BiometricType; device_id: string }
  ): Promise<BiometricEnrollment | null> {
    if (!input.person_id || !input.person_type || !input.biometric_type || !input.device_id) {
      console.error('[biometricService.completeEnrollment] Missing required fields:', input);
      return null;
    }
    try {
      const result = await apiClient.post<BiometricEnrollment>('/biometrics/enroll', {
        customer_id: input.person_id,
        person_type: input.person_type,
        biometric_type: input.biometric_type,
        target_device_ids: [input.device_id],
        provider_reference: providerReference,
        enrollment_id: enrollmentId,
        status: 'captured',
      });
      return (result as BiometricEnrollment) ?? null;
    } catch (e) {
      console.error('[biometricService.completeEnrollment] Backend error:', e);
      return null;
    }
  },
};
