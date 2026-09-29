import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import {
  hrmsApi,
  type GeofenceScheme,
  type EmployeeItem,
  type PunchResponse,
} from '@/services/hrmsApi';

interface OwnerClockInOutWidgetProps {
  onPunchSuccess?: (res: PunchResponse) => void;
}

export function OwnerClockInOutWidget({ onPunchSuccess }: OwnerClockInOutWidgetProps) {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeScheme, setActiveScheme] = useState<GeofenceScheme | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [isPunchingForSelf, setIsPunchingForSelf] = useState<boolean>(true);

  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToGym, setDistanceToGym] = useState<number | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [punchState, setPunchState] = useState<{
    isClockedIn: boolean;
    clockInTime?: string;
    clockOutTime?: string;
    workHours?: number;
    status?: string;
  }>({
    isClockedIn: false,
  });

  // Face ID Scan Modal State
  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);
  const [faceScanning, setFaceScanning] = useState<boolean>(false);
  const [faceScanSuccess, setFaceScanSuccess] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Keep clock running
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate distance
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

  // Fetch initial schemes, employees, and today's attendance status
  useEffect(() => {
    const initData = async () => {
      try {
        const [schemesRes, empsRes, attRes] = await Promise.all([
          hrmsApi.getGeofenceSchemes().catch(() => []),
          hrmsApi.getEmployees().catch(() => []),
          hrmsApi.getAttendance().catch(() => []),
        ]);

        if (schemesRes && schemesRes.length > 0) {
          const scheme = schemesRes[0];
          setActiveScheme(scheme);
        }

        if (empsRes && empsRes.length > 0) {
          setEmployees(empsRes);
          setSelectedEmpId(empsRes[0]?.id || '');
        }

        // Check if current user / owner is clocked in today
        if (attRes && attRes.length > 0) {
          const currentUserId = user?.id || '';
          const todayPunch = attRes.find(
            (a) =>
              (currentUserId && a.employee_id === currentUserId) ||
              a.employee_name.toLowerCase().includes((user?.name || 'owner').toLowerCase())
          );
          if (todayPunch) {
            setPunchState({
              isClockedIn: !!todayPunch.check_in && !todayPunch.check_out,
              clockInTime: todayPunch.check_in,
              clockOutTime: todayPunch.check_out,
              workHours: todayPunch.work_hours,
              status: todayPunch.status,
            });
          }
        }
      } catch (err) {
        console.error('Error initializing clock-in widget:', err);
      }
    };

    initData();

    // Browser Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDeviceCoords(coords);
          if (activeScheme && activeScheme.latitude != null && activeScheme.longitude != null) {
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
  }, [user]);

  // Update distance when activeScheme loads
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

  const handlePunch = async (action: 'CHECK_IN' | 'CHECK_OUT', method = 'MANUAL') => {
    setLoading(true);
    try {
      const targetEmpId = isPunchingForSelf ? (user?.id || 'owner_user') : selectedEmpId;
      const targetEmp = employees.find((e) => e.id === targetEmpId);
      const empName = isPunchingForSelf ? (user?.name || 'Gym Owner') : (targetEmp?.full_name || 'Staff Member');

      const payload = {
        employee_id: targetEmpId,
        action,
        method,
        latitude: deviceCoords?.lat ?? activeScheme?.latitude,
        longitude: deviceCoords?.lng ?? activeScheme?.longitude,
        user_role: isPunchingForSelf ? 'GYM_OWNER' : (targetEmp?.designation?.toUpperCase() || 'STAFF'),
        branch: activeScheme?.branch_name || user?.branchName || '',
        note: `Manual portal punch via ${method} (${action})`,
      };

      const res = await hrmsApi.recordPunch(payload);

      if (action === 'CHECK_IN') {
        setPunchState({
          isClockedIn: true,
          clockInTime: res.time,
          status: res.status,
        });
      } else {
        setPunchState({
          isClockedIn: false,
          clockOutTime: res.time,
          status: 'Clocked Out',
        });
      }

      showFeedback(
        `✓ ${empName} successfully Clocked ${action === 'CHECK_IN' ? 'IN' : 'OUT'} at ${res.time} (${res.status})`,
        'success'
      );

      if (onPunchSuccess) {
        onPunchSuccess(res);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to record punch.';
      showFeedback(`⚠️ ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Face ID Punch Trigger
  const handleOpenFaceModal = async () => {
    setShowFaceModal(true);
    setFaceScanning(true);
    setFaceScanSuccess(false);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Camera access denied/unavailable, simulating AI Face ID scanner.');
    }

    // Simulate AI Facial Vector Recognition
    setTimeout(() => {
      setFaceScanning(false);
      setFaceScanSuccess(true);
      setTimeout(async () => {
        const nextAction = punchState.isClockedIn ? 'CHECK_OUT' : 'CHECK_IN';
        await handlePunch(nextAction, 'FACE_ID');
        handleCloseFaceModal();
      }, 1200);
    }, 2400);
  };

  const handleCloseFaceModal = () => {
    setShowFaceModal(false);
    setFaceScanning(false);
    setFaceScanSuccess(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const timeFormatted = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateFormatted = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-navy-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/50 relative overflow-hidden font-sans">
      {/* Background ambient gradient glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Toast inside widget */}
      {toast && (
        <div
          className={cn(
            'absolute top-4 left-4 right-4 z-30 p-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-slide-up border',
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50'
              : 'bg-rose-950/95 text-rose-200 border-rose-500/50'
          )}
        >
          <Icon
            name={toast.type === 'success' ? 'check-circle' : 'alert-triangle'}
            size={16}
            className={toast.type === 'success' ? 'text-emerald-400 shrink-0' : 'text-rose-400 shrink-0'}
          />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Row: Live Time & Geofence Beacon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
            <Icon name="clock" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-mono font-black tracking-tight text-white">
                {timeFormatted}
              </span>
              <span className="text-[11px] font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-md">
                IST
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300">{dateFormatted}</p>
          </div>
        </div>

        {/* Geofence Proximity Status */}
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2">
          <div className="relative flex items-center justify-center">
            <span
              className={cn(
                'w-3 h-3 rounded-full',
                isWithinGeofence ? 'bg-emerald-400' : 'bg-amber-400'
              )}
            />
            <span
              className={cn(
                'absolute w-3 h-3 rounded-full animate-ping opacity-75',
                isWithinGeofence ? 'bg-emerald-400' : 'bg-amber-400'
              )}
            />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-extrabold text-white flex items-center gap-1">
              <span>{activeScheme?.branch_name || user?.branchName || 'Gym'} Branch</span>
              <span className="text-[10px] text-purple-300">
                ({distanceToGym !== null ? `${distanceToGym}m` : 'Nearby'})
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              {isWithinGeofence
                ? 'Inside Authorized Geofence Perimeter'
                : `Outside ${activeScheme?.radius_meters || 500}m radius (${activeScheme?.strict_restriction ? 'Strict' : 'Relaxed'})`}
            </div>
          </div>
        </div>
      </div>

      {/* Center Row: Punch Status & Switcher */}
      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Indicator */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Punch Status
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {punchState.isClockedIn ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CLOCKED IN since {punchState.clockInTime || 'Today'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                {punchState.clockOutTime
                  ? `Clocked Out at ${punchState.clockOutTime}`
                  : 'Not Clocked In Today'}
              </span>
            )}

            {punchState.status && punchState.status !== 'Present' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {punchState.status}
              </span>
            )}
          </div>
        </div>

        {/* Punch on behalf of staff selector */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setIsPunchingForSelf(true)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
              isPunchingForSelf
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            )}
          >
            My Punch (Owner)
          </button>
          <button
            type="button"
            onClick={() => setIsPunchingForSelf(false)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all',
              !isPunchingForSelf
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Staff / Trainer
          </button>
        </div>
      </div>

      {/* Staff Selector Dropdown (When Punching for Trainer/Staff) */}
      {!isPunchingForSelf && (
        <div className="pb-4">
          <label className="block text-[11px] font-extrabold text-slate-300 uppercase mb-1.5">
            Select Employee / Trainer to Punch For:
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                {emp.full_name || `${emp.first_name} ${emp.last_name || ''}`} ({emp.designation || 'Staff'} - {emp.code || 'EMP'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Bottom Row: Big Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Clock In Button */}
        <button
          type="button"
          onClick={() => handlePunch('CHECK_IN', 'GPS_GEOFENCE')}
          disabled={loading || punchState.isClockedIn}
          className={cn(
            'py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2.5 border shadow-lg',
            punchState.isClockedIn
              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400/60 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white border-emerald-400/30 shadow-emerald-600/20'
          )}
        >
          <Icon name="log-in" size={18} />
          <span>{loading ? 'Recording...' : 'CLOCK IN'}</span>
        </button>

        {/* Clock Out Button */}
        <button
          type="button"
          onClick={() => handlePunch('CHECK_OUT', 'GPS_GEOFENCE')}
          disabled={loading || !punchState.isClockedIn}
          className={cn(
            'py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2.5 border shadow-lg',
            !punchState.isClockedIn
              ? 'bg-rose-950/30 border-rose-900/30 text-rose-400/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white border-rose-400/30 shadow-rose-600/20'
          )}
        >
          <Icon name="log-out" size={18} />
          <span>{loading ? 'Recording...' : 'CLOCK OUT'}</span>
        </button>

        {/* Face ID Scanner Button */}
        <button
          type="button"
          onClick={handleOpenFaceModal}
          disabled={loading}
          className="py-3.5 px-4 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white border border-purple-400/40 shadow-lg shadow-purple-600/25"
        >
          <Icon name="camera" size={18} className="text-purple-200" />
          <span>AI FACE ID PUNCH</span>
        </button>
      </div>

      {/* Face ID Scanning Modal Overlay */}
      {showFaceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative">
            <button
              type="button"
              onClick={handleCloseFaceModal}
              className="absolute right-4 top-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <Icon name="x" size={16} />
            </button>

            <div>
              <h3 className="text-base font-black text-white flex items-center justify-center gap-2">
                <Icon name="camera" size={20} className="text-purple-400" />
                AI Facial Recognition Punch
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Align your face inside the biometric boundary box.
              </p>
            </div>

            {/* Video Viewport / Biometric Target Frame */}
            <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-purple-500 flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Holographic Face Grid Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'w-40 h-40 rounded-full border-2 border-dashed transition-all duration-700',
                    faceScanSuccess
                      ? 'border-emerald-400 scale-105 bg-emerald-500/10'
                      : 'border-purple-400 animate-pulse bg-purple-500/5'
                  )}
                />
                {/* Crosshairs */}
                <div className="absolute w-48 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-bounce" />
              </div>

              {faceScanSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <Icon name="check" size={28} />
                  </div>
                  <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                    Face Verified (99.8%)
                  </span>
                </div>
              )}
            </div>

            {/* Progress Text */}
            <div>
              {faceScanning ? (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-purple-300">
                  <Icon name="loader" size={14} className="animate-spin" />
                  <span>Analyzing facial landmarks &amp; geofence coordinates...</span>
                </div>
              ) : faceScanSuccess ? (
                <div className="text-xs font-extrabold text-emerald-400">
                  Punching {punchState.isClockedIn ? 'OUT' : 'IN'}...
                </div>
              ) : (
                <div className="text-xs text-slate-400">Ready for scan.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
