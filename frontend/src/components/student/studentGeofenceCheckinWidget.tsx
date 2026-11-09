import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import { hrmsApi, type GeofenceScheme, type PunchResponse } from '@/services/hrmsApi';
import { studentApi } from '@/services/studentApi';

interface studentGeofenceCheckinWidgetProps {
  onCheckinSuccess?: (res: PunchResponse) => void;
}

export type VerificationMethodType = 'FACE_ID' | 'MANUAL';

export function StudentGeofenceCheckinWidget({ onCheckinSuccess }: studentGeofenceCheckinWidgetProps) {
  const { user } = useAuth();
  const [activeScheme, setActiveScheme] = useState<GeofenceScheme | null>(null);
  const [loading, setLoading] = useState(false);

  // Selected dynamic verification method (Face ID or Manual)
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethodType>('FACE_ID');

  const [checkinStatus, setCheckinStatus] = useState<{
    isCheckedIn: boolean;
    checkInTime?: string;
    checkOutTime?: string;
  }>({
    isCheckedIn: false,
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

  const refreshLiveState = () => {
    studentApi.getAttendance()
      .then((att) => {
        if (att) {
          setCheckinStatus({
            isCheckedIn: !!att.is_checked_in,
            checkInTime: att.today_check_in || undefined,
            checkOutTime: att.today_check_out || undefined,
          });
        }
      })
      .catch(() => { });
  };

  const refreshFaceStatus = async () => {
    setCheckingFaceStatus(true);
    try {
      const res = await studentApi.getFaceStatus();
      setFaceStatus(res);
    } catch {
      // Fallback
    } finally {
      setCheckingFaceStatus(false);
    }
  };

  useEffect(() => {
    refreshLiveState();
    refreshFaceStatus();

    hrmsApi.getGeofenceSchemes()
      .then((schemes) => {
        if (schemes && schemes.length > 0) {
          setActiveScheme(schemes[0]);
        }
      })
      .catch(() => { });
  }, []);

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
      const res = await studentApi.registerFace({ face_image_base64: snapshot });
      setRegisterSuccess(true);
      setFaceStatus({
        is_enrolled: true,
        face_image: res.face_image || snapshot,
        full_name: user?.name,
      });

      showFeedback('✓ Face ID registered successfully! You can now check in with Face ID.', 'success');

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
    setVerifyErrorMsg(null);
    setVerifyMatchScore(null);
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
      }
    } catch (err: any) {
      console.error('Camera error during verification:', err);
      setVerifyErrorMsg('Camera access failed. Please enable camera permissions.');
      setVerifyState('ERROR');
      return;
    }

    // Step 1: Scanning facial contours
    setTimeout(() => {
      setVerifyState('COMPARING');

      // Step 2: Capture live frame and compare with registered face profile
      setTimeout(async () => {
        const liveSnapshot = captureVideoFrame(verifyVideoRef.current);
        if (!liveSnapshot) {
          setVerifyState('ERROR');
          setVerifyErrorMsg('Could not capture video frame from webcam. Please make sure camera is active.');
          return;
        }

        try {
          const devicePlatform = (navigator as any).userAgentData?.platform || navigator.platform || 'Web Browser';
          const res = await studentApi.verifyFace({
            live_image_base64: liveSnapshot,
            action,
            verification_type: 'FACE_BIOMETRIC',
            method: 'LIVE_CAMERA_SCAN',
            device_name: `${devicePlatform} (${window.innerWidth}x${window.innerHeight})`,
            device_type: 'WEBCAM_FACE_SCANNER',
            user_role: user?.role || 'student',
            branch: activeScheme?.branch_name || user?.branchName || '',
            latitude: activeScheme?.latitude ?? null,
            longitude: activeScheme?.longitude ?? null,
            client_timestamp: new Date().toISOString(),
          });

          if (res.match) {
            const score = res.confidence > 1 ? Math.round(res.confidence) : Math.round(res.confidence * 100);
            setVerifyMatchScore(score);
            setVerifyState('SUCCESS');

            if (action === 'CHECK_IN') {
              setCheckinStatus({
                isCheckedIn: true,
                checkInTime: res.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              });
            } else {
              setCheckinStatus({
                isCheckedIn: false,
                checkOutTime: res.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
              });
            }

            showFeedback(
              `✓ Verified via Face ID (${res.confidence_percentage} Match) at ${res.time}`,
              'success'
            );

            if (onCheckinSuccess && res.punch) {
              onCheckinSuccess(res.punch);
            }

            setTimeout(() => {
              handleCloseVerifyModal();
            }, 1600);
          } else {
            setVerifyState('ERROR');
            setVerifyErrorMsg('Face did not match registered profile. Please look directly at the camera.');
          }
        } catch (err: any) {
          const msg = err?.response?.data?.detail || err?.message || 'Verification failed.';
          setVerifyState('ERROR');
          setVerifyErrorMsg(msg);
        }
      }, 1500);
    }, 1200);
  };

  const handleCloseVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyState('IDLE');
    setVerifyErrorMsg(null);
    setVerifyMatchScore(null);
    if (verifyStreamRef.current) {
      verifyStreamRef.current.getTracks().forEach((track) => track.stop());
      verifyStreamRef.current = null;
    }
  };

  // ── 3. MANUAL PUNCH HANDLER ───────────────────────────────────────────────

  const handleManualPunch = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    setLoading(true);
    try {
      const punchLoc = activeScheme?.branch_name || user?.branchName || (activeScheme?.latitude ? `Campus (${activeScheme.latitude.toFixed(4)}, ${activeScheme.longitude.toFixed(4)})` : 'Campus');
      const payload = {
        employee_id: user?.id || '',
        action,
        method: 'MANUAL',
        latitude: activeScheme?.latitude ?? null,
        longitude: activeScheme?.longitude ?? null,
        location: punchLoc,
        user_role: 'student',
        branch: activeScheme?.branch_name || user?.branchName || '',
        note: `student manual attendance check-${action === 'CHECK_IN' ? 'in' : 'out'}`,
      };

      const res = await hrmsApi.recordPunch(payload);

      if (action === 'CHECK_IN') {
        setCheckinStatus({
          isCheckedIn: true,
          checkInTime: res.time,
        });
      } else {
        setCheckinStatus({
          isCheckedIn: false,
          checkOutTime: res.time,
        });
      }

      showFeedback(
        `✓ vahd Check-${action === 'CHECK_IN' ? 'In' : 'Out'} verified via Manual Punch at ${res.time}`,
        'success'
      );

      if (onCheckinSuccess) onCheckinSuccess(res);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to record check-in.';
      showFeedback(`⚠️ ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (selectedMethod === 'FACE_ID') {
      handleOpenVerifyModal(action);
    } else {
      handleManualPunch(action);
    }
  };

  const methodsList: Array<{
    id: VerificationMethodType | 'BIOMETRIC';
    label: string;
    icon: string;
    disabled?: boolean;
    badge?: string;
    hint?: string;
  }> = [
      {
        id: 'FACE_ID',
        label: 'Face ID',
        icon: 'camera',
        badge: checkingFaceStatus ? 'Checking...' : faceStatus.is_enrolled ? 'Enrolled ✓' : 'Tap to Enroll',
      },
      {
        id: 'MANUAL',
        label: 'Manual Punch',
        icon: 'user-check',
        badge: 'Active',
      },
      {
        id: 'BIOMETRIC',
        label: 'Biometrics',
        icon: 'fingerprint',
        disabled: true,
        badge: 'Turnstile Only',
        hint: 'Physical turnstile hardware sensor at vahd entrance',
      },
    ];

  return (
    <div className="card p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-orange-500 text-white rounded-3xl shadow-lg relative overflow-hidden font-sans space-y-4">
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

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
              toast.type === 'success'
                ? 'text-emerald-400 shrink-0'
                : toast.type === 'error'
                  ? 'text-rose-400 shrink-0'
                  : 'text-purple-400 shrink-0'
            }
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center border border-white/30 shrink-0 shadow-2xs">
            <Icon name="check" size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-white leading-tight">
              vahd Attendance Check-In
            </h3>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              {activeScheme?.branch_name || user?.branchName || 'Main Headquarters Branch'} • Real-Time Biometric Access
            </p>
          </div>
        </div>

        {/* Live Attendance Status Badge matching screenshot */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-800 shadow-2xs">
            <span className={cn('w-2 h-2 rounded-full shrink-0', checkinStatus.isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
            <span>
              {checkinStatus.isCheckedIn
                ? `Checked In (${checkinStatus.checkInTime})`
                : 'Not Checked In'}
            </span>
          </div>
        </div>
      </div>

      {/* Verification Method Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-white/95 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Icon name="shield-check" size={15} className="text-white" />
            <span>SELECT VERIFICATION METHOD:</span>
          </span>
          {faceStatus.is_enrolled && (
            <button
              type="button"
              onClick={handleOpenRegisterModal}
              className="text-[11px] text-white/90 hover:text-white underline flex items-center gap-1 cursor-pointer transition-colors capitalize tracking-normal"
            >
              <Icon name="refresh-cw" size={11} />
              <span>Update Registered Face</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {methodsList.map((m) => {
            const isSelected = selectedMethod === m.id;

            if (m.disabled) {
              return (
                <div
                  key={m.id}
                  title={m.hint}
                  className="p-2 pl-4 pr-2.5 rounded-full text-xs font-bold bg-white/80 text-slate-500 shadow-2xs flex items-center justify-between cursor-not-allowed opacity-75"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon name={m.icon} size={16} className="text-purple-600 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0 ml-2">
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
                  setSelectedMethod(m.id as VerificationMethodType);
                  if (m.id === 'FACE_ID' && !faceStatus.is_enrolled) {
                    handleOpenRegisterModal();
                  }
                }}
                className={cn(
                  'p-2 pl-4 pr-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-between shadow-2xs cursor-pointer',
                  isSelected
                    ? 'bg-white text-slate-900 ring-2 ring-white/90 shadow-md'
                    : 'bg-white/95 hover:bg-white text-slate-800'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    name={m.icon}
                    size={16}
                    className="text-purple-600 shrink-0"
                  />
                  <span className="truncate">{m.label}</span>
                </div>
                <span
                  className={cn(
                    'text-[11px] font-bold px-3 py-1 rounded-full transition-colors shrink-0 ml-2',
                    m.id === 'FACE_ID' && !faceStatus.is_enrolled
                      ? 'bg-purple-50 text-purple-700'
                      : m.id === 'MANUAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons (Rounded-full matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleActionClick('CHECK_IN')}
          disabled={loading || checkinStatus.isCheckedIn}
          className={cn(
            'py-3.5 px-6 rounded-full font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98]',
            checkinStatus.isCheckedIn
              ? 'bg-emerald-950/40 text-emerald-200/50 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white'
          )}
        >
          <Icon name="log-in" size={16} />
          <span>
            {loading
              ? 'Verifying...'
              : `CHECK IN (${selectedMethod === 'FACE_ID' ? 'Face ID Scan' : 'Manual Punch'})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleActionClick('CHECK_OUT')}
          disabled={loading || !checkinStatus.isCheckedIn}
          className={cn(
            'py-3.5 px-6 rounded-full font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border shadow-md cursor-pointer active:scale-[0.98]',
            !checkinStatus.isCheckedIn
              ? 'bg-white/40 text-rose-300 border-white/20 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-slate-50 text-rose-600 border-slate-200'
          )}
        >
          <Icon name="log-out" size={16} />
          <span>
            {loading
              ? 'Verifying...'
              : `CHECK OUT (${selectedMethod === 'FACE_ID' ? 'Face ID Scan' : 'Manual Punch'})`}
          </span>
        </button>
      </div>

      {/* ── 1. FACE REGISTRATION / ENROLLMENT MODAL ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseRegisterModal}
              className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <Icon name="x" size={16} />
            </button>

            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mx-auto mb-2 border border-blue-400/30">
                <Icon name="camera" size={24} />
              </div>
              <h3 className="text-base font-black text-white">
                {faceStatus.is_enrolled ? 'Update Face ID Profile' : 'Enroll Face ID Recognition'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Position your face within the frame and capture your baseline photo for dynamic attendance matching.
              </p>
            </div>

            {/* Camera Viewport */}
            <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-blue-500 flex items-center justify-center shadow-inner">
              <video ref={registerVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'w-40 h-48 rounded-full border-2 border-dashed transition-all duration-500',
                    registerSuccess
                      ? 'border-emerald-400 bg-emerald-500/10 scale-105'
                      : 'border-blue-400/80 animate-pulse bg-blue-500/5'
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
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Icon name="camera" size={16} />
                <span>{registering ? 'Saving Face Profile...' : 'Capture & Register Face ID'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. LIVE FACE VERIFICATION & COMPARISON SCANNER MODAL ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseVerifyModal}
              className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <Icon name="x" size={16} />
            </button>

            {/* Header with Comparison Thumbnail */}
            <div className="flex items-center justify-between text-left border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <Icon name="camera" size={16} className="text-blue-400" />
                  <span>Face ID Check-{verifyAction === 'CHECK_IN' ? 'In' : 'Out'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Comparing live frame with registered profile</p>
              </div>

              {faceStatus.face_image && (
                <div className="relative group" title="Your Registered Face Profile">
                  <img
                    src={faceStatus.face_image}
                    alt="Enrolled"
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                    <Icon name="check" size={8} className="text-white" />
                  </span>
                </div>
              )}
            </div>

            {/* Scanner Viewport */}
            <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-blue-500 flex items-center justify-center shadow-inner">
              <video ref={verifyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Biometric Scanning Radar & Laser Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'w-40 h-48 rounded-full border-2 transition-all duration-500 relative overflow-hidden',
                    verifyState === 'SUCCESS'
                      ? 'border-emerald-400 bg-emerald-500/15 scale-105'
                      : verifyState === 'ERROR'
                        ? 'border-rose-400 bg-rose-500/15'
                        : 'border-blue-400'
                  )}
                >
                  {/* Vertical Scanning Laser Line */}
                  {(verifyState === 'SCANNING' || verifyState === 'COMPARING') && (
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-lg shadow-cyan-400/80 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              {/* Success Result Badge */}
              {verifyState === 'SUCCESS' && (
                <div className="absolute inset-0 bg-emerald-950/85 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <Icon name="check" size={24} />
                  </div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Match Confirmed ({verifyMatchScore || 99}%)
                  </span>
                  <span className="text-[10px] text-emerald-200">
                    Check-{verifyAction === 'CHECK_IN' ? 'In' : 'Out'} Recorded ✓
                  </span>
                </div>
              )}
            </div>

            {/* Dynamic Status Progress */}
            <div className="text-xs font-bold text-blue-300 min-h-[20px]">
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
                      className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-white text-[11px] font-bold border border-rose-500/40"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseVerifyModal();
                        handleOpenRegisterModal();
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-white text-[11px] font-bold border border-blue-500/40"
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
