import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import type { CustomerBiometricStatus } from '@/types/customer';

export function BiometricStatus({ biometric }: { biometric: CustomerBiometricStatus }) {
  if (!biometric) return null;

  const faceStatus = biometric.face_recognition?.status;
  const isFaceEnrolled = Boolean(biometric.face_recognition?.enrolled || biometric.face_recognition?.active);

  const fpStatus = biometric.fingerprint?.status;
  const isFpEnrolled = Boolean(biometric.fingerprint?.enrolled || biometric.fingerprint?.active);

  const rfidCardNo = biometric.rfid_card?.card_number;
  const rfidStatus = biometric.rfid_card?.status;
  const isRfidAssigned = Boolean(biometric.rfid_card?.assigned || biometric.rfid_card?.active);

  return (
    <div className="card p-5 space-y-4 border border-navy-200">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-ai-50 flex items-center justify-center">
          <Icon name="shield" size={18} className="text-ai-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-navy-900">Biometric Access</h3>
          <p className="text-xs text-navy-400">Gym turnstile & door access status</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {faceStatus && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-navy-50 border border-navy-100">
            <div className="flex items-center gap-2.5">
              <Icon name="scan-face" size={16} className="text-brand-600" />
              <span className="text-sm font-semibold text-navy-800">Face Recognition</span>
            </div>
            <Badge variant={isFaceEnrolled ? 'success' : 'neutral'} dot>{faceStatus}</Badge>
          </div>
        )}

        {fpStatus && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-navy-50 border border-navy-100">
            <div className="flex items-center gap-2.5">
              <Icon name="fingerprint" size={16} className="text-success-600" />
              <span className="text-sm font-semibold text-navy-800">Fingerprint</span>
            </div>
            <Badge variant={isFpEnrolled ? 'success' : 'neutral'} dot>{fpStatus}</Badge>
          </div>
        )}

        {rfidStatus && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-navy-50 border border-navy-100">
            <div className="flex items-center gap-2.5">
              <Icon name="credit-card" size={16} className="text-warning-600" />
              <span className="text-sm font-semibold text-navy-800">RFID Card {rfidCardNo ? `(${rfidCardNo})` : ''}</span>
            </div>
            <Badge variant={isRfidAssigned ? 'success' : 'neutral'} dot>{rfidStatus}</Badge>
          </div>
        )}
      </div>

      {biometric.last_verification && (
        <div className="text-xs text-navy-500 flex items-center gap-1.5 pt-1">
          <Icon name="shield-check" size={12} className="text-success-600" />
          Last Verification: <span className="font-semibold text-navy-700">{biometric.last_verification}</span>
        </div>
      )}

      {biometric.notice && (
        <div className="p-2.5 rounded-xl bg-warning-50/50 border border-warning-200/60 text-[11px] text-warning-800 flex items-start gap-2">
          <Icon name="lock" size={14} className="text-warning-600 shrink-0 mt-0.5" />
          <span>{biometric.notice}</span>
        </div>
      )}
    </div>
  );
}
