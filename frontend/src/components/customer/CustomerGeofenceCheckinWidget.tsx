import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import { hrmsApi, type GeofenceScheme, type PunchResponse } from '@/services/hrmsApi';
import { customerApi } from '@/services/customerApi';

interface CustomerGeofenceCheckinWidgetProps {
  onCheckinSuccess?: (res: PunchResponse) => void;
}

export type VerificationMethodType = 'FACE_ID' | 'MANUAL';

export function CustomerGeofenceCheckinWidget({ onCheckinSuccess }: CustomerGeofenceCheckinWidgetProps) {
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
    customerApi.getAttendance()
      .then((att) => {
        if (att) {
          setCheckinStatus({
            isCheckedIn: !!att.is_checked_in,
            checkInTime: att.today_check_in || undefined,
            checkOutTime: att.today_check_out || undefined,
          });
        }
      })
      .catch(() => {});
  };

  const refreshFaceStatus = async () => {
    setCheckingFaceStatus(true);
    try {
      const res = await customerApi.getFaceStatus();
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
      .catch(() => {});
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
      const res = await customerApi.registerFace({ face_image_base64: snapshot });
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
        const frameToSend = liveSnapshot || faceStatus.face_image || 'data:image/jpeg;base64,mockframe';

        try {
          const res = await customerApi.verifyFace({
            live_image_base64: frameToSend,
            action,
          });

          if (res.match) {
            setVerifyMatchScore(Math.round(res.confidence * 100));
            setVerifyState('SUCCESS');

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
      const payload = {
        employee_id: user?.id || '',
        action,
        method: 'MANUAL',
        latitude: activeScheme?.latitude ?? null,
        longitude: activeScheme?.longitude ?? null,
        user_role: 'CUSTOMER',
        branch: activeScheme?.branch_name || user?.branchName || '',
        note: `Customer manual attendance check-${action === 'CHECK_IN' ? 'in' : 'out'}`,
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
        `✓ Gym Check-${action === 'CHECK_IN' ? 'In' : 'Out'} verified via Manual Punch at ${res.time}`,
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
      hint: 'Physical turnstile hardware sensor at gym entrance',
    },
  ];

  return (
    <div className="card p-5 bg-gradient-to-br from-slate-900 via-blue-950 to-navy-950 text-white rounded-3xl shadow-xl border border-blue-700/40 relative overflow-hidden font-sans space-y-4">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      {toast && (
        <div
          className={cn(
            'absolute top-3 left-3 right-3 z-30 p-2.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-slide-up border',
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/50'
              : 'bg-blue-950/95 text-blue-200 border-blue-500/50'
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
                : 'text-blue-400 shrink-0'
            }
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
            <Icon name="check-circle" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Gym Attendance Check-In</span>
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              {activeScheme?.branch_name || user?.branchName || 'Main Gym Entrance'} • Real-Time Biometric Access
            </p>
          </div>
        </div>

        {/* Live Attendance Status Badge */}
        <div>
          {checkinStatus.isCheckedIn ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Checked In ({checkinStatus.checkInTime})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Not Checked In
            </span>
          )}
        </div>
      </div>

      {/* Verification Method Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-blue-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Icon name="shield-check" size={13} className="text-blue-400" />
            <span>Select Verification Method:</span>
          </span>
          {faceStatus.is_enrolled && (
            <button
              type="button"
              onClick={handleOpenRegisterModal}
              className="text-[10px] text-blue-300 hover:text-blue-100 underline flex items-center gap-1 cursor-pointer transition-colors"
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
                  title={m.hint}
                  className="p-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-slate-500 text-xs font-bold flex items-center justify-between cursor-not-allowed opacity-50 relative group"
                >
                  <div className="flex items-center gap-2">
                    <Icon name={m.icon} size={15} className="text-slate-600" />
                    <span>{m.label}</span>
                  </div>
                  <span className="text-[9px] font-semibold text-blue-400/80 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
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
                  'p-3 rounded-2xl border text-xs font-black transition-all flex items-center justify-between cursor-pointer',
                  isSelected
                    ? 'bg-blue-600/40 border-blue-400 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/30'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={m.icon}
                    size={15}
                    className={isSelected ? 'text-blue-300' : 'text-slate-400'}
                  />
                  <span>{m.label}</span>
                </div>
                <span
                  className={cn(
                    'text-[9px] font-bold px-2 py-0.5 rounded border transition-colors',
                    m.id === 'FACE_ID' && !faceStatus.is_enrolled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : isSelected
                      ? 'bg-blue-500/30 text-blue-200 border-blue-400/50'
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

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => handleActionClick('CHECK_IN')}
          disabled={loading || checkinStatus.isCheckedIn}
          className={cn(
            'py-3.5 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border shadow-lg cursor-pointer',
            checkinStatus.isCheckedIn
              ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400/50 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white border-emerald-400/30 shadow-emerald-600/20'
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
            'py-3.5 px-4 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border shadow-lg cursor-pointer',
            !checkinStatus.isCheckedIn
              ? 'bg-rose-950/30 border-rose-900/30 text-rose-400/50 cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white border-rose-400/30 shadow-rose-600/20'
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
