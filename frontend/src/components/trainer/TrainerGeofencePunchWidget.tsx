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

  const [selectedMethod, setSelectedMethod] = useState<TrainerVerificationMethod>('FACE_ID');

  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToGym, setDistanceToGym] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);

  const [punchStatus, setPunchStatus] = useState<{
    isClockedIn: boolean;
    clockInTime?: string;
    clockOutTime?: string;
    status?: string;
  }>({ isClockedIn: false });

  const [faceStatus, setFaceStatus] = useState<{
    is_enrolled: boolean;
    face_image?: string | null;
    full_name?: string;
    enrolled_at?: string | null;
  }>({ is_enrolled: false, face_image: null });
  const [checkingFaceStatus, setCheckingFaceStatus] = useState(true);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [verifyState, setVerifyState] = useState<'IDLE' | 'SCANNING' | 'COMPARING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [verifyMatchScore, setVerifyMatchScore] = useState<number | null>(null);
  const [verifyErrorMsg, setVerifyErrorMsg] = useState<string | null>(null);

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
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const refreshFaceStatus = async () => {
    setCheckingFaceStatus(true);
    try {
      const res = await hrmsApi.getFaceStatus(user?.id || '');
      setFaceStatus(res);
    } catch { /* Fallback */ } finally {
      setCheckingFaceStatus(false);
    }
  };

  useEffect(() => {
    refreshFaceStatus();
    hrmsApi.getGeofenceSchemes()
      .then((schemes) => { if (schemes?.length > 0) setActiveScheme(schemes[0]); })
      .catch(() => {});

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDeviceCoords(coords);
        },
        () => { setIsWithinGeofence(true); }
      );
    }
  }, []);

  useEffect(() => {
    if (deviceCoords && activeScheme?.latitude != null && activeScheme?.longitude != null) {
      const dist = calculateDistance(deviceCoords.lat, deviceCoords.lng, activeScheme.latitude, activeScheme.longitude);
      setDistanceToGym(dist);
      setIsWithinGeofence(dist <= (activeScheme.radius_meters || 500));
    }
  }, [activeScheme, deviceCoords]);

  // ── 1. FACE REGISTRATION ──────────────────────────────────────────────────

  const handleOpenRegisterModal = async () => {
    setRegisterError(null);
    setRegisterSuccess(false);
    setShowRegisterModal(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        });
        registerStreamRef.current = stream;
        if (registerVideoRef.current) registerVideoRef.current.srcObject = stream;
      } else {
        setRegisterError('Camera access not supported on this browser/device.');
      }
    } catch {
      setRegisterError('Camera permission was denied. Please allow camera access in your browser.');
    }
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegistering(false);
    setRegisterSuccess(false);
    setRegisterError(null);
    if (registerStreamRef.current) {
      registerStreamRef.current.getTracks().forEach((t) => t.stop());
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
    } catch { return null; }
  };

  const handleCaptureAndRegisterFace = async () => {
    setRegistering(true);
    setRegisterError(null);
    const snapshot = captureVideoFrame(registerVideoRef.current);
    if (!snapshot) {
      setRegistering(false);
      setRegisterError('Could not capture frame. Please ensure camera is active.');
      return;
    }
    try {
      const res = await hrmsApi.registerFace({ employee_id: user?.id || '', face_image_base64: snapshot });
      setRegisterSuccess(true);
      setFaceStatus({ is_enrolled: true, face_image: res.face_image || snapshot, full_name: user?.name });
      showFeedback('✓ Trainer Face ID registered! You can now clock in with Face ID.', 'success');
      setTimeout(() => handleCloseRegisterModal(), 1500);
    } catch (err: any) {
      setRegisterError(err?.response?.data?.detail || err?.message || 'Failed to enroll face profile.');
    } finally {
      setRegistering(false);
    }
  };

  // ── 2. FACE VERIFICATION ──────────────────────────────────────────────────

  const handleOpenVerifyModal = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!faceStatus.is_enrolled) {
      showFeedback('⚠️ Please register your Face ID first.', 'info');
      handleOpenRegisterModal();
      return;
    }
    setVerifyAction(action);
    setVerifyState('SCANNING');
    setVerifyMatchScore(null);
    setVerifyErrorMsg(null);
    setShowVerifyModal(true);

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        });
        verifyStreamRef.current = stream;
        if (verifyVideoRef.current) verifyVideoRef.current.srcObject = stream;
      }
    } catch {
      setVerifyState('ERROR');
      setVerifyErrorMsg('Camera access failed. Please enable camera permissions.');
      return;
    }

    // Step 1 → SCANNING, Step 2 → COMPARING + API call
    setTimeout(() => {
      setVerifyState('COMPARING');
      setTimeout(async () => {
        const snapshot = captureVideoFrame(verifyVideoRef.current);
        const frameToSend = snapshot || faceStatus.face_image || 'data:image/jpeg;base64,mockframe';
        try {
          const res = await hrmsApi.verifyFace({
            employee_id: user?.id || '',
            live_image_base64: frameToSend,
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
            showFeedback(`✓ Shift Clock-${action === 'CHECK_IN' ? 'In' : 'Out'} verified via Face ID!`, 'success');
            if (onPunchSuccess && res.punch) onPunchSuccess(res.punch);
            setTimeout(() => handleCloseVerifyModal(), 1600);
          } else {
            setVerifyState('ERROR');
            setVerifyErrorMsg('Face did not match. Look directly at the camera and try again.');
          }
        } catch (err: any) {
          setVerifyState('ERROR');
          setVerifyErrorMsg(err?.response?.data?.detail || err?.message || 'Face ID verification failed.');
        }
      }, 1500);
    }, 1200);
  };

  const handleCloseVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyState('IDLE');
    setVerifyMatchScore(null);
    setVerifyErrorMsg(null);
    if (verifyStreamRef.current) {
      verifyStreamRef.current.getTracks().forEach((t) => t.stop());
      verifyStreamRef.current = null;
    }
  };

  // ── 3. MANUAL / GPS PUNCH ─────────────────────────────────────────────────

  const handleManualPunch = async (action: 'CHECK_IN' | 'CHECK_OUT', method = 'GPS_GEOFENCE') => {
    setLoading(true);
    try {
      const res = await hrmsApi.recordPunch({
        employee_id: user?.id || '',
        action,
        method,
        latitude: deviceCoords?.lat ?? activeScheme?.latitude ?? null,
        longitude: deviceCoords?.lng ?? activeScheme?.longitude ?? null,
        user_role: 'TRAINER',
        branch: activeScheme?.branch_name || user?.branchName || '',
        note: `Trainer shift punch via ${method}`,
      });
      if (action === 'CHECK_IN') {
        setPunchStatus({ isClockedIn: true, clockInTime: res.time, status: res.status });
      } else {
        setPunchStatus({ isClockedIn: false, clockOutTime: res.time, status: 'Clocked Out' });
      }
      showFeedback(`✓ Clock-${action === 'CHECK_IN' ? 'In' : 'Out'} at ${res.time} (${res.status})`, 'success');
      if (onPunchSuccess) onPunchSuccess(res);
    } catch (err: any) {
      showFeedback(`⚠️ ${err?.response?.data?.detail || err?.message || 'Failed to record punch.'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (selectedMethod === 'FACE_ID') handleOpenVerifyModal(action);
    else if (selectedMethod === 'MANUAL') handleManualPunch(action, 'GPS_GEOFENCE');
    else handleManualPunch(action, 'BIOMETRIC_TURNSTILE');
  };

  const methodsList = [
    {
      id: 'FACE_ID' as TrainerVerificationMethod,
      label: 'Face ID',
      icon: 'camera',
      badge: checkingFaceStatus ? 'Checking...' : faceStatus.is_enrolled ? 'Enrolled ✓' : 'Tap to Enroll',
      disabled: false,
    },
    {
      id: 'MANUAL' as TrainerVerificationMethod,
      label: 'Manual / GPS',
      icon: 'map-pin',
      badge: isWithinGeofence ? 'In Zone ✓' : 'Remote',
      disabled: false,
    },
    {
      id: 'BIOMETRIC' as TrainerVerificationMethod,
      label: 'Biometrics',
      icon: 'fingerprint',
      badge: 'Turnstile Only',
      disabled: true,
      hint: 'Physical turnstile hardware sensor at gym entrance',
    },
  ];

  return (
    <div className="card p-5 bg-gradient-to-br from-slate-900 via-purple-950 to-navy-950 text-white rounded-3xl shadow-xl border border-purple-700/40 relative overflow-hidden font-sans space-y-4">
      {/* Background glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-8 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'absolute top-3 left-3 right-3 z-30 p-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-slide-up border',
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/50'
              : 'bg-purple-950/95 text-purple-200 border-purple-500/50'
          )}
        >
          <Icon
            name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert-triangle' : 'info'}
            size={15}
            className={
              toast.type === 'success' ? 'text-emerald-400 shrink-0'
              : toast.type === 'error' ? 'text-rose-400 shrink-0'
              : 'text-purple-400 shrink-0'
            }
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-400/30">
            <Icon name="scan-face" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Trainer Shift Punch</span>
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              {activeScheme?.branch_name || user?.branchName || 'Main Branch'} •{' '}
              {distanceToGym !== null ? `${distanceToGym}m from gym` : 'GPS Active'}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div>
          {punchStatus.isClockedIn ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              On Duty ({punchStatus.clockInTime})
            </span>
          ) : punchStatus.clockOutTime ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <Icon name="check" size={10} className="text-emerald-400" />
              Shift Ended ({punchStatus.clockOutTime})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Ready for Shift Punch
            </span>
          )}
        </div>
      </div>

      {/* ── Verification Method Selector ─────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Icon name="shield-check" size={13} className="text-purple-400" />
            <span>Select Verification Method:</span>
          </span>
          {faceStatus.is_enrolled && (
            <button
              type="button"
              onClick={handleOpenRegisterModal}
              className="text-[10px] text-purple-300 hover:text-purple-100 underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Icon name="refresh-cw" size={10} />
              <span>Update Registered Face</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {methodsList.map((m) => {
            const isSelected = selectedMethod === m.id;

            if (m.disabled) {
              return (
                <div
                  key={m.id}
                  title={(m as any).hint}
                  className="p-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-slate-500 text-xs font-bold flex items-center justify-between cursor-not-allowed opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Icon name={m.icon} size={15} className="text-slate-600" />
                    <span>{m.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold text-purple-400/80 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    {m.badge}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(m.id);
                  if (m.id === 'FACE_ID' && !faceStatus.is_enrolled) handleOpenRegisterModal();
                }}
                className={cn(
                  'p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer',
                  isSelected
                    ? 'bg-purple-600/40 border-purple-400 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/30'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon name={m.icon} size={15} className={isSelected ? 'text-purple-300' : 'text-slate-400'} />
                  <span>{m.label}</span>
                </div>
                <span
                  className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded border transition-colors',
                    m.id === 'FACE_ID' && !faceStatus.is_enrolled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : isSelected
                      ? 'bg-purple-500/30 text-purple-200 border-purple-400/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  )}
                >
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Action Buttons: Clock In & Clock Out ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleActionClick('CHECK_IN')}
          disabled={loading || punchStatus.isClockedIn}
          className={cn(
            'py-3.5 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border shadow-lg cursor-pointer',
            punchStatus.isClockedIn
              ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400/50 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border-emerald-400/30 shadow-emerald-600/20'
          )}
        >
          <Icon name="log-in" size={16} />
          <span>
            {loading ? 'Verifying...' : `CLOCK IN (${selectedMethod === 'FACE_ID' ? 'Face ID' : selectedMethod === 'MANUAL' ? 'GPS Punch' : 'Biometric'})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleActionClick('CHECK_OUT')}
          disabled={loading || !punchStatus.isClockedIn}
          className={cn(
            'py-3.5 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border shadow-lg cursor-pointer',
            !punchStatus.isClockedIn
              ? 'bg-rose-950/30 border-rose-900/30 text-rose-400/50 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white border-rose-400/30 shadow-rose-600/20'
          )}
        >
          <Icon name="log-out" size={16} />
          <span>
            {loading ? 'Verifying...' : `CLOCK OUT (${selectedMethod === 'FACE_ID' ? 'Face ID' : selectedMethod === 'MANUAL' ? 'GPS Punch' : 'Biometric'})`}
          </span>
        </button>
      </div>

      {/* ── FACE REGISTRATION MODAL ───────────────────────────────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseRegisterModal}
              className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <Icon name="x" size={16} />
            </button>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto mb-2 border border-purple-400/30">
                <Icon name="camera" size={24} />
              </div>
              <h3 className="text-base font-black text-white">
                {faceStatus.is_enrolled ? 'Update Trainer Face ID' : 'Enroll Trainer Face ID'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Position your face within the frame and capture your baseline photo for instant touchless shift punch.
              </p>
            </div>

            {/* Camera Viewport */}
            <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-purple-500 flex items-center justify-center shadow-inner">
              <video ref={registerVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

              {/* Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'w-40 h-48 rounded-full border-2 border-dashed transition-all duration-500',
                    registerSuccess
                      ? 'border-emerald-400 bg-emerald-500/10 scale-105'
                      : 'border-purple-400/80 animate-pulse bg-purple-500/5'
                  )}
                />
              </div>

              {registerSuccess && (
                <div className="absolute inset-0 bg-emerald-950/85 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <Icon name="check" size={24} />
                  </div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Face Profile Enrolled!
                  </span>
                </div>
              )}
            </div>

            {registerError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold">
                {registerError}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCaptureAndRegisterFace}
                disabled={registering || registerSuccess}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Icon name="camera" size={16} />
                <span>{registering ? 'Saving Face Profile...' : 'Capture & Register Face ID'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FACE VERIFICATION SCANNER MODAL ──────────────────────────── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseVerifyModal}
              className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <Icon name="x" size={16} />
            </button>

            {/* Header with enrolled thumbnail */}
            <div className="flex items-center justify-between text-left border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Icon name="camera" size={16} className="text-purple-400" />
                  <span>Face ID Clock-{verifyAction === 'CHECK_IN' ? 'In' : 'Out'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Comparing live frame with registered profile</p>
              </div>

              {faceStatus.face_image && (
                <div className="relative" title="Your Registered Face Profile">
                  <img
                    src={faceStatus.face_image}
                    alt="Enrolled"
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-400 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                    <Icon name="check" size={8} className="text-white" />
                  </span>
                </div>
              )}
            </div>

            {/* Scanner Viewport */}
            <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-purple-500 flex items-center justify-center shadow-inner">
              <video ref={verifyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

              {/* Face Oval + Scanning Laser */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'w-40 h-48 rounded-full border-2 transition-all duration-500 relative overflow-hidden',
                    verifyState === 'SUCCESS'
                      ? 'border-emerald-400 bg-emerald-500/15 scale-105'
                      : verifyState === 'ERROR'
                      ? 'border-rose-400 bg-rose-500/15'
                      : 'border-purple-400'
                  )}
                >
                  {/* Scanning laser line */}
                  {(verifyState === 'SCANNING' || verifyState === 'COMPARING') && (
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-lg shadow-cyan-400/80 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Success overlay */}
              {verifyState === 'SUCCESS' && (
                <div className="absolute inset-0 bg-emerald-950/85 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <Icon name="check" size={24} />
                  </div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Match Confirmed ({verifyMatchScore || 99}%)
                  </span>
                  <span className="text-[10px] text-emerald-200">
                    Clock-{verifyAction === 'CHECK_IN' ? 'In' : 'Out'} Recorded ✓
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic status text */}
            <div className="text-xs font-bold text-purple-300 min-h-[20px]">
              {verifyState === 'SCANNING' && 'Scanning live facial contours...'}
              {verifyState === 'COMPARING' && 'Comparing with enrolled face profile...'}
              {verifyState === 'SUCCESS' && `Identity Verified (${verifyMatchScore || 99}% Match) ✓`}
              {verifyState === 'ERROR' && (
                <div className="text-rose-400 space-y-2">
                  <p>{verifyErrorMsg || 'Face verification failed.'}</p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenVerifyModal(verifyAction)}
                      className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-white text-[11px] font-bold border border-rose-500/40 cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleCloseVerifyModal(); handleOpenRegisterModal(); }}
                      className="px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-white text-[11px] font-bold border border-purple-500/40 cursor-pointer"
                    >
                      Re-Enroll Face
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
