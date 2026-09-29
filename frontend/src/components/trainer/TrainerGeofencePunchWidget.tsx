import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import { hrmsApi, type GeofenceScheme, type PunchResponse } from '@/services/hrmsApi';

interface TrainerGeofencePunchWidgetProps {
  onPunchSuccess?: (res: PunchResponse) => void;
}

export type TrainerVerificationMethod = 'FACE_ID' | 'MANUAL' | 'BIOMETRIC';

export function TrainerGeofencePunchWidget({ onPunchSuccess }: TrainerGeofencePunchWidgetProps) {
  const { user } = useAuth();
  const [activeScheme, setActiveScheme] = useState<GeofenceScheme | null>(null);
  const [loading, setLoading] = useState(false);

  // Selected verification method
  const [selectedMethod, setSelectedMethod] = useState<TrainerVerificationMethod>('FACE_ID');

  // Coordinates & Geofence
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToGym, setDistanceToGym] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);

  // Punch Status
  const [punchStatus, setPunchStatus] = useState<{
    isClockedIn: boolean;
    clockInTime?: string;
    clockOutTime?: string;
    status?: string;
  }>({
    isClockedIn: false,
  });

  // Face ID Profile State
  const [faceStatus, setFaceStatus] = useState<{
    is_enrolled: boolean;
    face_image?: string | null;
    full_name?: string;
    enrolled_at?: string | null;
  }>({
    is_enrolled: false,
    face_image: null,
  });
  const [checkingFaceStatus, setCheckingFaceStatus] = useState(true);

  // Face Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Face ID Verification Scanner Modal State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [verifyState, setVerifyState] = useState<'IDLE' | 'SCANNING' | 'COMPARING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [verifyMatchScore, setVerifyMatchScore] = useState<number | null>(null);
  const [verifyErrorMsg, setVerifyErrorMsg] = useState<string | null>(null);

  // Camera & Video Refs
  const registerVideoRef = useRef<HTMLVideoElement | null>(null);
  const registerStreamRef = useRef<MediaStream | null>(null);
  const verifyVideoRef = useRef<HTMLVideoElement | null>(null);
  const verifyStreamRef = useRef<MediaStream | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const refreshFaceStatus = async () => {
    setCheckingFaceStatus(true);
    try {
      const empId = user?.id || '';
      const res = await hrmsApi.getFaceStatus(empId);
      setFaceStatus(res);
    } catch {
      // Fallback
    } finally {
      setCheckingFaceStatus(false);
    }
  };

  useEffect(() => {
    refreshFaceStatus();

    hrmsApi.getGeofenceSchemes()
      .then((schemes) => {
        if (schemes && schemes.length > 0) {
          setActiveScheme(schemes[0]);
        }
      })
      .catch(() => {});

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDeviceCoords(coords);
          if (activeScheme && activeScheme.latitude && activeScheme.longitude) {
            const dist = calculateDistance(
              coords.lat,
              coords.lng,
              activeScheme.latitude,
              activeScheme.longitude
            );
            setDistanceToGym(dist);
            setIsWithinGeofence(dist <= (activeScheme.radius_meters || 500));
          }
        },
        () => {
          setDistanceToGym(null);
          setIsWithinGeofence(true);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (deviceCoords && activeScheme && activeScheme.latitude != null && activeScheme.longitude != null) {
      const dist = calculateDistance(
        deviceCoords.lat,
        deviceCoords.lng,
        activeScheme.latitude,
        activeScheme.longitude
      );
      setDistanceToGym(dist);
      setIsWithinGeofence(dist <= (activeScheme.radius_meters || 500));
    }
  }, [activeScheme, deviceCoords]);

  // ── 1. FACE REGISTRATION / ENROLLMENT ─────────────────────────────────────

  const handleOpenRegisterModal = async () => {
    setRegisterError(null);
    setRegisterSuccess(false);
    setShowRegisterModal(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        });
        registerStreamRef.current = stream;
        if (registerVideoRef.current) {
          registerVideoRef.current.srcObject = stream;
        }
      } else {
        setRegisterError('Camera access not supported on this browser/device.');
      }
    } catch (err: any) {
      console.error('Camera error during registration:', err);
      setRegisterError('Camera permission was denied. Please allow camera access in your browser.');
    }
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegistering(false);
    setRegisterSuccess(false);
    setRegisterError(null);
    if (registerStreamRef.current) {
      registerStreamRef.current.getTracks().forEach((track) => track.stop());
      registerStreamRef.current = null;
    }
  };

  const captureVideoFrame = (videoElement: HTMLVideoElement | null): string | null => {
    if (!videoElement || videoElement.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 480;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.error('Failed to capture frame from video:', err);
      return null;
    }
  };

  const handleCaptureAndRegisterFace = async () => {
    setRegistering(true);
    setRegisterError(null);

    const snapshot = captureVideoFrame(registerVideoRef.current);
    if (!snapshot) {
      setRegistering(false);
      setRegisterError('Could not capture frame from camera. Please ensure camera is active.');
      return;
    }

    try {
      const empId = user?.id || '';
      const res = await hrmsApi.registerFace({
        employee_id: empId,
        face_image_base64: snapshot,
      });
      setRegisterSuccess(true);
      setFaceStatus({
        is_enrolled: true,
        face_image: res.face_image || snapshot,
        full_name: user?.name,
      });

      showFeedback('✓ Trainer Face ID registered successfully! You can now clock in with Face ID.', 'success');

      setTimeout(() => {
        handleCloseRegisterModal();
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to enroll face profile.';
      setRegisterError(msg);
    } finally {
      setRegistering(false);
    }
  };

  // ── 2. LIVE FACE ID VERIFICATION & ATTENDANCE PUNCH ──────────────────────

  const handleOpenVerifyModal = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!faceStatus.is_enrolled) {
      showFeedback('⚠️ Please register your Face ID first before verifying.', 'info');
      handleOpenRegisterModal();
      return;
    }

    setVerifyAction(action);
    setVerifyState('SCANNING');
    setVerifyMatchScore(null);
    setVerifyErrorMsg(null);
    setShowVerifyModal(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        });
        verifyStreamRef.current = stream;
        if (verifyVideoRef.current) {
          verifyVideoRef.current.srcObject = stream;
        }

        // Auto trigger verification scan after warm-up
        setTimeout(() => {
          performFaceVerification(action);
        }, 1200);
      } else {
        setVerifyState('ERROR');
        setVerifyErrorMsg('Camera access is not supported on this browser.');
      }
    } catch (err: any) {
      setVerifyState('ERROR');
      setVerifyErrorMsg('Camera permission denied. Please allow camera access.');
    }
  };

  const handleCloseVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyState('IDLE');
    setVerifyMatchScore(null);
    setVerifyErrorMsg(null);
    if (verifyStreamRef.current) {
      verifyStreamRef.current.getTracks().forEach((track) => track.stop());
      verifyStreamRef.current = null;
    }
  };

  const performFaceVerification = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    setVerifyState('COMPARING');
    const snapshot = captureVideoFrame(verifyVideoRef.current);
    if (!snapshot) {
      setVerifyState('ERROR');
      setVerifyErrorMsg('Failed to capture clear face image from camera.');
      return;
    }

    try {
      const empId = user?.id || '';
      const res = await hrmsApi.verifyFace({
        employee_id: empId,
        live_image_base64: snapshot,
        action,
        user_role: 'TRAINER',
        branch: activeScheme?.branch_name || user?.branchName || '',
      });

      if (res.match) {
        setVerifyState('SUCCESS');
        setVerifyMatchScore(res.confidence ? Math.round(res.confidence * 100) : 98);

        if (action === 'CHECK_IN') {
          setPunchStatus({
            isClockedIn: true,
            clockInTime: res.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: 'Present',
          });
        } else {
          setPunchStatus({
            isClockedIn: false,
            clockOutTime: res.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: 'Clocked Out',
          });
        }

        showFeedback(
          `✓ Shift Clock-${action === 'CHECK_IN' ? 'In' : 'Out'} verified via Face ID!`,
          'success'
        );

        if (onPunchSuccess && res.punch) {
          onPunchSuccess(res.punch);
        }

        setTimeout(() => {
          handleCloseVerifyModal();
        }, 1600);
      } else {
        setVerifyState('ERROR');
        setVerifyErrorMsg('Face did not match registered profile. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Face ID verification failed.';
      setVerifyState('ERROR');
      setVerifyErrorMsg(msg);
    }
  };

  // ── 3. MANUAL / GPS GEOFENCE CLOCK IN & OUT ──────────────────────────────

  const handleManualPunch = async (action: 'CHECK_IN' | 'CHECK_OUT', method = 'GPS_GEOFENCE') => {
    setLoading(true);
    try {
      const payload = {
        employee_id: user?.id || '',
        action,
        method,
        latitude: deviceCoords?.lat ?? activeScheme?.latitude ?? null,
        longitude: deviceCoords?.lng ?? activeScheme?.longitude ?? null,
        user_role: 'TRAINER',
        branch: activeScheme?.branch_name || user?.branchName || '',
        note: `Trainer shift punch via ${method}`,
      };

      const res = await hrmsApi.recordPunch(payload);

      if (action === 'CHECK_IN') {
        setPunchStatus({
          isClockedIn: true,
          clockInTime: res.time,
          status: res.status,
        });
      } else {
        setPunchStatus({
          isClockedIn: false,
          clockOutTime: res.time,
          status: 'Clocked Out',
        });
      }

      showFeedback(
        `✓ Shift Clock-${action === 'CHECK_IN' ? 'In' : 'Out'} verified at ${res.time} (${res.status})`,
        'success'
      );

      if (onPunchSuccess) onPunchSuccess(res);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to record punch.';
      showFeedback(`⚠️ ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-navy-100 rounded-3xl p-6 shadow-sm space-y-5 transition-all">
      {/* Toast Alert */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border animate-fade-in',
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-500/40'
              : 'bg-navy-900 text-white border-navy-700'
          )}
        >
          <Icon
            name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert-circle' : 'info'}
            size={16}
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Top Header & Live Status ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
            <Icon name="scan-face" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
                Trainer Biometric &amp; Shift Punch
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                Live Attendance
              </span>
            </div>
            <p className="text-xs text-navy-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{activeScheme?.branch_name || 'Main Branch'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {distanceToGym !== null ? `${distanceToGym}m from center` : 'GPS Verified'}
              </span>
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {punchStatus.isClockedIn ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>On Duty ({punchStatus.clockInTime || 'Active'})</span>
            </div>
          ) : punchStatus.clockOutTime ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-navy-50 border border-navy-200 text-navy-600 text-xs font-bold flex items-center gap-1.5">
              <Icon name="check" size={13} className="text-emerald-500" />
              <span>Shift Ended ({punchStatus.clockOutTime})</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1.5">
              <Icon name="clock" size={13} />
              <span>Ready for Shift Punch</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Method Selector Tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-navy-50/70 border border-navy-100 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedMethod('FACE_ID')}
          className={cn(
            'flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer',
            selectedMethod === 'FACE_ID'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-navy-600 hover:text-navy-900 hover:bg-white/60'
          )}
        >
          <Icon name="camera" size={15} />
          <span>Face ID Verification</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMethod('MANUAL')}
          className={cn(
            'flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer',
            selectedMethod === 'MANUAL'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-navy-600 hover:text-navy-900 hover:bg-white/60'
          )}
        >
          <Icon name="map-pin" size={15} />
          <span>Manual / GPS Punch</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMethod('BIOMETRIC')}
          className={cn(
            'flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer',
            selectedMethod === 'BIOMETRIC'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-navy-600 hover:text-navy-900 hover:bg-white/60'
          )}
        >
          <Icon name="fingerprint" size={15} />
          <span>Biometrics &amp; Turnstile</span>
        </button>
      </div>

      {/* ── Mode 1: Face ID Verification ────────────────────────────────── */}
      {selectedMethod === 'FACE_ID' && (
        <div className="space-y-4 animate-fade-in">
          {/* Face ID Status Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {faceStatus.is_enrolled && faceStatus.face_image ? (
                <div className="relative">
                  <img
                    src={faceStatus.face_image}
                    alt="Registered Face"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-500 shadow-sm"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
                    <Icon name="check" size={10} />
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Icon name="scan" size={22} />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-navy-900">
                    {faceStatus.is_enrolled ? 'Trainer Face Profile Enrolled' : 'Face ID Not Registered'}
                  </h4>
                  {faceStatus.is_enrolled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-navy-500 mt-0.5">
                  {faceStatus.is_enrolled
                    ? 'AI face recognition active for instant touchless shift punch.'
                    : 'Enroll your face once using your camera to enable Face ID Clock-In & Clock-Out.'}
                </p>
              </div>
            </div>

            {/* Face Registration / Re-enroll CTA */}
            <button
              type="button"
              onClick={handleOpenRegisterModal}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs',
                faceStatus.is_enrolled
                  ? 'bg-white border border-navy-200 text-navy-700 hover:bg-navy-50'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-600/20'
              )}
            >
              <Icon name={faceStatus.is_enrolled ? 'refresh-cw' : 'camera'} size={14} />
              <span>{faceStatus.is_enrolled ? 'Re-enroll Face' : 'Register Face ID'}</span>
            </button>
          </div>

          {/* Action Buttons: Clock In & Clock Out with Face ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={loading || !faceStatus.is_enrolled}
              onClick={() => handleOpenVerifyModal('CHECK_IN')}
              className={cn(
                'py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer',
                !faceStatus.is_enrolled
                  ? 'bg-navy-100 text-navy-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]'
              )}
            >
              <Icon name="camera" size={16} />
              <span>Clock In with Face ID</span>
            </button>

            <button
              type="button"
              disabled={loading || !faceStatus.is_enrolled}
              onClick={() => handleOpenVerifyModal('CHECK_OUT')}
              className={cn(
                'py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer',
                !faceStatus.is_enrolled
                  ? 'bg-navy-100 text-navy-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-[0.98]'
              )}
            >
              <Icon name="log-out" size={16} />
              <span>Clock Out with Face ID</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mode 2: Manual / GPS Geofence Punch ─────────────────────────── */}
      {selectedMethod === 'MANUAL' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Icon name="map-pin" size={20} />
              </div>
              <div>
                <div className="text-xs font-black text-navy-900">
                  {isWithinGeofence ? '✓ Inside Gym Geofence Zone' : '⚠️ Outside Permitted Perimeter'}
                </div>
                <div className="text-[11px] text-navy-500 mt-0.5">
                  {distanceToGym !== null ? `${distanceToGym}m from center (Radius: ${activeScheme?.radius_meters || 500}m)` : 'GPS location active'}
                </div>
              </div>
            </div>

            <span className={cn(
              'px-3 py-1 rounded-xl text-xs font-bold border self-start sm:self-auto',
              isWithinGeofence
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              {isWithinGeofence ? 'Verified Zone' : 'Remote'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleManualPunch('CHECK_IN', 'GPS_GEOFENCE')}
              className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
            >
              <Icon name="log-in" size={16} />
              <span>{loading ? 'Verifying...' : 'Manual Clock In'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleManualPunch('CHECK_OUT', 'GPS_GEOFENCE')}
              className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-rose-600/20 active:scale-[0.98] cursor-pointer"
            >
              <Icon name="log-out" size={16} />
              <span>{loading ? 'Verifying...' : 'Manual Clock Out'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mode 3: Hardware Biometrics & Turnstile ─────────────────────── */}
      {selectedMethod === 'BIOMETRIC' && (
        <div className="p-5 rounded-2xl bg-navy-50/70 border border-navy-100 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Icon name="fingerprint" size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-navy-900">Physical Biometric Turnstiles &amp; Gates</h4>
                <p className="text-[11px] text-navy-500 mt-0.5">
                  eSSL gate terminal punches sync automatically to your attendance history.
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Online
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-navy-100 text-xs text-navy-600 flex items-center justify-between">
            <span>Gate Hardware ID: <strong className="text-navy-900">GATE-TR-01 (eSSL SilkBio)</strong></span>
            <button
              type="button"
              onClick={() => handleManualPunch('CHECK_IN', 'BIOMETRIC_TURNSTILE')}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
            >
              Sync Turnstile Punch
            </button>
          </div>
        </div>
      )}

      {/* ── Face Registration Modal ────────────────────────────────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-navy-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="camera" size={16} />
                </div>
                <h3 className="text-sm font-black text-navy-900">Register Trainer Face ID</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseRegisterModal}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Video Container */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-navy-950 flex items-center justify-center border-2 border-purple-200">
              <video
                ref={registerVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Facial Guide Oval Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-purple-400/80 shadow-[0_0_20px_rgba(147,51,234,0.3)]" />
              </div>

              {registerSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <Icon name="check" size={28} />
                  </div>
                  <div className="text-sm font-black">Face ID Enrolled!</div>
                </div>
              )}
            </div>

            {registerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {registerError}
              </div>
            )}

            <p className="text-[11px] text-navy-500 text-center font-medium">
              Position your face inside the oval guide and click below to capture.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloseRegisterModal}
                className="flex-1 py-2.5 rounded-xl bg-navy-100 text-navy-700 font-bold text-xs hover:bg-navy-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={registering || registerSuccess}
                onClick={handleCaptureAndRegisterFace}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
              >
                <Icon name="camera" size={14} />
                <span>{registering ? 'Enrolling...' : 'Capture & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Face Verification Modal ────────────────────────────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-navy-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Icon name="scan-face" size={16} />
                </div>
                <h3 className="text-sm font-black text-navy-900">
                  Face ID Verification — Clock {verifyAction === 'CHECK_IN' ? 'In' : 'Out'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseVerifyModal}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Video Preview */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-navy-950 flex items-center justify-center border-2 border-purple-200">
              <video
                ref={verifyVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Scanning Overlay Box */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-purple-400 rounded-3xl relative overflow-hidden shadow-[0_0_25px_rgba(147,51,234,0.35)]">
                  {verifyState === 'COMPARING' && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_#a855f7] animate-[scan_1.5s_ease-in-out_infinite]" />
                  )}
                </div>
              </div>

              {/* Success Result */}
              {verifyState === 'SUCCESS' && (
                <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl">
                    <Icon name="check" size={32} />
                  </div>
                  <div className="text-base font-black">Face Verified! ({verifyMatchScore}%)</div>
                  <div className="text-xs text-emerald-200 font-semibold">
                    Clock-{verifyAction === 'CHECK_IN' ? 'In' : 'Out'} Confirmed
                  </div>
                </div>
              )}
            </div>

            {verifyErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center justify-between">
                <span>{verifyErrorMsg}</span>
                <button
                  type="button"
                  onClick={() => performFaceVerification(verifyAction)}
                  className="text-rose-800 font-bold underline ml-2 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloseVerifyModal}
                className="w-full py-2.5 rounded-xl bg-navy-100 text-navy-700 font-bold text-xs hover:bg-navy-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
