import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { apiClient } from '@/services/apiClient';
import {
  hrmsApi,
  type GeofenceScheme,
  type EmployeeItem,
} from '@/services/hrmsApi';

interface HrmsGeofencePortalProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsGeofencePortal({ onSuccessToast }: HrmsGeofencePortalProps) {
  const [schemes, setSchemes] = useState<GeofenceScheme[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [availableBranches, setAvailableBranches] = useState<Array<{ name: string; city: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [currentDeviceCoords, setCurrentDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Active Scheme Editing State
  const [activeSchemeId, setActiveSchemeId] = useState<string>('');
  const [schemeName, setSchemeName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [gymName, setGymName] = useState('');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [latitude, setLatitude] = useState<number | string>('');
  const [longitude, setLongitude] = useState<number | string>('');
  const [radiusMeters, setRadiusMeters] = useState<number>(0);
  const [strictRestriction, setStrictRestriction] = useState<boolean>(false);
  const [shiftStartTime, setShiftStartTime] = useState<string>('');
  const [shiftEndTime, setShiftEndTime] = useState<string>('');
  const [gracePeriodMins, setGracePeriodMins] = useState<number>(0);
  const [minHalfDayHours, setMinHalfDayHours] = useState<number | string>('');
  const [allowedChannels, setAllowedChannels] = useState<string[]>([
    'gps',
    'biometric',
    'face_recognition',
    'web_ess',
  ]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (onSuccessToast) onSuccessToast(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch initial schemes, branches, gym settings, and employees from live database
  const loadData = async () => {
    setLoading(true);
    try {
      const [schemesRes, empsRes, branchesRes, settingsRes] = await Promise.all([
        hrmsApi.getGeofenceSchemes().catch(() => []),
        hrmsApi.getEmployees().catch(() => []),
        apiClient.get<any[]>('/gym/branches').catch(() => []),
        apiClient.get<any>('/gym/settings').catch(() => null),
      ]);

      const emps = empsRes || [];
      setEmployees(emps);

      const realBranches = Array.isArray(branchesRes)
        ? branchesRes.map((b) => ({
            name: b.branch_name || b.name || '',
            city: b.city || '',
          }))
        : [];
      setAvailableBranches(realBranches);

      const realGymName = settingsRes?.gym_name || realBranches[0]?.name || '';
      setGymName(realGymName);

      if (schemesRes && schemesRes.length > 0) {
        setSchemes(schemesRes);
        loadSchemeIntoForm(schemesRes[0], emps, realGymName);
      } else {
        setSchemes([]);
        setActiveSchemeId('');
        setSchemeName('');
        setBranchName(realBranches[0]?.name || '');
        setGymName(realGymName);
        setLatitude(currentDeviceCoords ? currentDeviceCoords.lat : '');
        setLongitude(currentDeviceCoords ? currentDeviceCoords.lng : '');
        setRadiusMeters(0);
        setStrictRestriction(false);
        setIpWhitelist('');
        setShiftStartTime('');
        setShiftEndTime('');
        setGracePeriodMins(0);
        setMinHalfDayHours('');
        setAllowedChannels(['gps', 'biometric', 'face_recognition', 'web_ess']);
        setAssignedEmployeeIds([]);
      }
    } catch (e) {
      console.error('Failed to load geofence portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentDeviceCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, []);

  const loadSchemeIntoForm = (scheme: GeofenceScheme, empsList?: EmployeeItem[], fallbackGymName?: string) => {
    const list = empsList || employees;
    setActiveSchemeId(scheme.id || '');
    setSchemeName(scheme.name || '');
    setBranchName(scheme.branch_name || '');
    setGymName(scheme.gym_name || fallbackGymName || gymName || '');
    setIpWhitelist(scheme.ip_whitelist || '');
    setLatitude(scheme.latitude ?? (currentDeviceCoords ? currentDeviceCoords.lat : ''));
    setLongitude(scheme.longitude ?? (currentDeviceCoords ? currentDeviceCoords.lng : ''));
    setRadiusMeters(scheme.radius_meters ?? 0);
    setStrictRestriction(!!scheme.strict_restriction);
    setShiftStartTime(scheme.shift_start_time || '');
    setShiftEndTime(scheme.shift_end_time || '');
    setGracePeriodMins(scheme.grace_period_mins ?? 0);
    setMinHalfDayHours(scheme.min_half_day_hours ?? '');
    setAllowedChannels(
      scheme.allowed_channels?.length
        ? scheme.allowed_channels
        : ['gps', 'biometric', 'face_recognition', 'web_ess']
    );

    if (scheme.assigned_employee_ids && scheme.assigned_employee_ids.length > 0) {
      setAssignedEmployeeIds(scheme.assigned_employee_ids);
    } else {
      setAssignedEmployeeIds(list.map((e) => e.id));
    }
  };

  const handleCreateNewScheme = () => {
    const newId = `scheme_${Date.now()}`;
    const targetBranch = availableBranches[0]?.name || '';
    setActiveSchemeId(newId);
    setSchemeName('');
    setBranchName(targetBranch);
    setGymName(gymName);
    setLatitude(currentDeviceCoords ? currentDeviceCoords.lat : '');
    setLongitude(currentDeviceCoords ? currentDeviceCoords.lng : '');
    setRadiusMeters(0);
    setStrictRestriction(false);
    setIpWhitelist('');
    setShiftStartTime('');
    setShiftEndTime('');
    setGracePeriodMins(0);
    setMinHalfDayHours('');
    setAllowedChannels(['gps', 'biometric', 'face_recognition', 'web_ess']);
    setAssignedEmployeeIds([]);
    showToast('New geofence scheme form opened. Enter parameters and click Save Scheme.');
  };



  const handleAutoDetectCoordinates = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setCurrentDeviceCoords({ lat, lng });
        setDetectingGps(false);
        showToast(`GPS Captured: Lat ${lat}, Lng ${lng} (Accuracy: ~${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setDetectingGps(false);
        showToast(`GPS Error: ${err.message}. Please allow location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveScheme = async () => {
    if (!schemeName.trim()) {
      showToast('Please enter a Scheme / Office Name.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<GeofenceScheme> = {
        id: activeSchemeId,
        name: schemeName.trim(),
        branch_name: branchName,
        gym_name: gymName,
        ip_whitelist: ipWhitelist,
        latitude: typeof latitude === 'string' ? (latitude === '' ? 0 : parseFloat(latitude)) : latitude,
        longitude: typeof longitude === 'string' ? (longitude === '' ? 0 : parseFloat(longitude)) : longitude,
        radius_meters: radiusMeters,
        strict_restriction: strictRestriction,
        shift_start_time: shiftStartTime,
        shift_end_time: shiftEndTime,
        grace_period_mins: gracePeriodMins,
        min_half_day_hours: minHalfDayHours === '' || minHalfDayHours === undefined ? undefined : Number(minHalfDayHours),
        allowed_channels: allowedChannels,
        assigned_employee_ids: assignedEmployeeIds,
        is_active: true,
      };

      const res = await hrmsApi.saveGeofenceScheme(payload);
      showToast(`Geofence scheme "${schemeName}" and ${assignedEmployeeIds.length} employee assignments saved!`);

      // Refresh list
      const updated = await hrmsApi.getGeofenceSchemes().catch(() => []);
      if (updated && updated.length > 0) {
        setSchemes(updated);
      }
    } catch (err: any) {
      showToast(`Failed to save scheme: ${err?.message || 'Error occurred'}`);
    } finally {
      setSaving(false);
    }
  };

  // Employee Selection Helpers
  const toggleEmployee = (empId: string) => {
    if (assignedEmployeeIds.includes(empId)) {
      setAssignedEmployeeIds(assignedEmployeeIds.filter((id) => id !== empId));
    } else {
      setAssignedEmployeeIds([...assignedEmployeeIds, empId]);
    }
  };

  const handleSelectAllEmployees = () => {
    setAssignedEmployeeIds(employees.map((e) => e.id));
  };

  const handleClearAllEmployees = () => {
    setAssignedEmployeeIds([]);
  };

  const toggleChannel = (channel: string) => {
    if (allowedChannels.includes(channel)) {
      if (allowedChannels.length === 1) {
        showToast('At least one punch channel must remain active.');
        return;
      }
      setAllowedChannels(allowedChannels.filter((c) => c !== channel));
    } else {
      setAllowedChannels([...allowedChannels, channel]);
    }
  };

  const radiusPresets = [50, 100, 250, 500, 1000, 2000];

  const filteredEmployees = employees.filter((emp) => {
    if (!searchEmployeeQuery) return true;
    const q = searchEmployeeQuery.toLowerCase();
    return (
      (emp.full_name || `${emp.first_name} ${emp.last_name}`).toLowerCase().includes(q) ||
      (emp.code || '').toLowerCase().includes(q) ||
      (emp.designation || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-800 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-navy-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-purple-400/40 animate-slide-up">
          <Icon name="check-circle" size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row (Matching Screenshot 1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Attendance &amp; Geofencing Schemes
            </h1>
            {strictRestriction ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                GEOFENCE ENFORCEMENT ACTIVE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                GEOFENCE ENFORCEMENT DISABLED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure attendance schemes with custom GPS coordinates &amp; perimeter radius, and assign desired employees to activate their policies.
          </p>
        </div>

        {/* Action Buttons Top-Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCreateNewScheme}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Icon name="plus" size={14} className="text-purple-600" />
            <span>+ New Scheme</span>
          </button>

          <button
            type="button"
            onClick={handleAutoDetectCoordinates}
            disabled={detectingGps}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Icon
              name="crosshair"
              size={14}
              className={cn('text-purple-600', detectingGps && 'animate-spin')}
            />
            <span>{detectingGps ? 'Detecting GPS...' : 'Auto-Detect My Coordinates'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveScheme}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
          >
            <Icon name="check" size={15} />
            <span>{saving ? 'Saving...' : 'Save Scheme & Assignments'}</span>
          </button>
        </div>
      </div>

      {/* Saved Schemes Chip Bar */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-xs font-extrabold text-slate-600 uppercase flex items-center gap-1.5 shrink-0 pl-1">
          <Icon name="layers" size={14} className="text-purple-600" />
          Saved Schemes:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {schemes.map((s) => {
            const isActive = s.id === activeSchemeId;
            const empCount = s.assigned_employee_ids?.length || employees.length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => loadSchemeIntoForm(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border',
                  isActive
                    ? 'bg-purple-50 text-purple-900 border-purple-400 ring-2 ring-purple-300/40 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon name="map-pin" size={13} className={isActive ? 'text-purple-600' : 'text-slate-400'} />
                <span>{s.name}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-extrabold">
                  {s.radius_meters ?? 0}m
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {empCount} Emps
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Geofence Perimeter + Shift Timings) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Scheme Geofence & Perimeter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Icon name="map-pin" size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Scheme Geofence &amp; Perimeter
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Define coordinates and allowable distance radius for check-ins.
                  </p>
                </div>
              </div>

              {/* Strict Restriction Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-700">Strict Restriction:</span>
                <button
                  type="button"
                  onClick={() => setStrictRestriction(!strictRestriction)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative focus:outline-none p-0.5',
                    strictRestriction ? 'bg-purple-600' : 'bg-slate-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white shadow-md transform transition-transform',
                      strictRestriction ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Input Grid 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  SCHEME / OFFICE NAME
                </label>
                <input
                  type="text"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  placeholder="e.g. Branch Geofence Scheme"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  OFFICE IP WHITELIST (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  placeholder="e.g. 192.168.1.1, 203.0.113.5"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Branch & Gym Selector Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  GYM BRANCH ASSIGNMENT
                </label>
                <select
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  <option value="">Select Branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))}
                  {availableBranches.length === 0 && branchName && (
                    <option value={branchName}>{branchName}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  ORGANIZATION / GYM NAME
                </label>
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="Gym / Facility Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* GPS Latitude & Longitude */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                    GPS LATITUDE
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Degrees N/S</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  placeholder="Latitude (e.g. 17.3850)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase">
                    GPS LONGITUDE
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Degrees E/W</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  placeholder="Longitude (e.g. 78.4867)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {/* Radius Preset Pills & Slider (Matching Screenshot 1) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-purple-700 tracking-wide uppercase">
                  PERMITTED CHECK-IN RADIUS: {radiusMeters} METERS
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {radiusPresets.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadiusMeters(r)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all border',
                        radiusMeters === r
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      )}
                    >
                      {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="50"
                max="3000"
                step="25"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />

              {/* Dynamic status note */}
              <p className="text-[11px] font-medium text-slate-500 italic">
                {strictRestriction
                  ? 'Strict restriction active. Punches outside the perimeter radius will be rejected and flagged.'
                  : 'Geofence restriction is relaxed. Coordinates will be logged for audit without blocking punches.'}
              </p>
            </div>
          </div>

          {/* Card 2: Shift Timings & Automated Calculation Policies (Matching Screenshot 2) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Icon name="clock" size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Shift Timings &amp; Automated Calculation Policies
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Standard working window, grace period before marking late, and half-day thresholds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  SHIFT START TIME
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    placeholder="e.g. 09:00 AM (IST)"
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <Icon name="clock" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  SHIFT END TIME
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    placeholder="e.g. 06:00 PM (IST)"
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <Icon name="clock" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  GRACE PERIOD (MINS)
                </label>
                <input
                  type="number"
                  value={gracePeriodMins}
                  onChange={(e) => setGracePeriodMins(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 15"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  MINIMUM HALF-DAY HOURS
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={minHalfDayHours}
                  onChange={(e) => setMinHalfDayHours(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              {/* Dynamic Rule Preview Callout */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <span className="text-[11px] font-black text-purple-900 uppercase block mb-1">
                  Rule Preview (IST Timezone):
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {shiftStartTime ? (
                    <>
                      Check-ins after <span className="font-extrabold text-purple-900">{shiftStartTime.split(' ')[0]} + {gracePeriodMins}m IST</span> will be flagged as <span className="font-extrabold text-amber-700 bg-amber-100 px-1 py-0.5 rounded">Late</span>.
                    </>
                  ) : (
                    <span>Shift timing policy: Grace period of <span className="font-extrabold text-purple-900">{gracePeriodMins}m</span> will apply after shift start. </span>
                  )}
                  {minHalfDayHours ? (
                    <> Shifts below <span className="font-extrabold text-purple-900">{minHalfDayHours} hours</span> automatically count as <span className="font-extrabold text-rose-700 bg-rose-100 px-1 py-0.5 rounded">Half Day</span>.</>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Assign Desired Employees & Allowed Punch Channels) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Assign Desired Employees (Matching Screenshot 1) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Icon name="users" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Assign Desired Employees
                  </h3>
                  <p className="text-[11px] font-medium text-purple-700">
                    {assignedEmployeeIds.length} of {employees.length} employee(s) active in scheme
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <button
                  type="button"
                  onClick={handleSelectAllEmployees}
                  className="hover:text-purple-700 hover:underline"
                >
                  All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={handleClearAllEmployees}
                  className="hover:text-purple-700 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Employee Search Bar */}
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchEmployeeQuery}
                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Employee List (Scrollable) */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredEmployees.map((emp) => {
                const isAssigned = assignedEmployeeIds.includes(emp.id);
                const name = emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim();
                const initial = (name[0] || 'E').toUpperCase();
                const isP = initial === 'P';

                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleEmployee(emp.id)}
                    className={cn(
                      'p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all',
                      isAssigned
                        ? 'bg-purple-50/50 border-purple-300'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                      />
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 shadow-2xs',
                          isP ? 'bg-purple-200 text-purple-900' : 'bg-indigo-100 text-indigo-900'
                        )}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold truncate">
                          {emp.code ? `EMP-${emp.code}` : emp.designation || 'Staff'}
                        </div>
                      </div>
                    </div>

                    {isAssigned ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                        Activated
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        Inactive
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                  No employees matched the query.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Allowed Punch Channels (Matching Screenshot 2) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                <Icon name="shield-check" size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Allowed Punch Channels
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Permitted punch modes for this scheme.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'gps',
                  title: 'GPS Mobile & Web Geofencing',
                  desc: 'Verifies device coordinates within radius',
                  icon: 'map-pin',
                },
                {
                  id: 'biometric',
                  title: 'Biometric Fingerprint Terminals',
                  desc: 'Hardware gate turnstiles',
                  icon: 'fingerprint',
                },
                {
                  id: 'face_recognition',
                  title: 'AI Facial Recognition Tablet',
                  desc: 'Kiosk face recognition at entrance',
                  icon: 'camera',
                },
                {
                  id: 'web_ess',
                  title: 'Web ESS Portal & WFH',
                  desc: 'Browser 1-click punch',
                  icon: 'globe',
                },
              ].map((channel) => {
                const isChecked = allowedChannels.includes(channel.id);
                return (
                  <div
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    className={cn(
                      'p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all',
                      isChecked
                        ? 'bg-purple-50/40 border-purple-300'
                        : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChannel(channel.id)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Icon name={channel.icon} size={13} className="text-purple-600" />
                        <span>{channel.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">{channel.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Big Action Button (Matching Screenshot 2) */}
            <button
              type="button"
              onClick={handleSaveScheme}
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 active:from-purple-900 active:to-indigo-900 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Icon name="check" size={16} />
              <span>
                {saving
                  ? 'Saving Scheme...'
                  : `Save Scheme & Activate (${assignedEmployeeIds.length} Employees)`}
              </span>
            </button>
          </div>

          {/* Card 5: ACTIVE SCHEME SUMMARY (Matching Screenshot 2 Bottom-Right) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              <Icon name="activity" size={14} className="text-purple-600" />
              <span>ACTIVE SCHEME SUMMARY</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Target Scheme:</span>
                <span className="font-extrabold text-slate-900">{schemeName}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Branch / Gym:</span>
                <span className="font-extrabold text-purple-700">{branchName} ({gymName})</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Coordinates:</span>
                <span className="font-mono text-[11px] font-bold text-slate-800">
                  {latitude}, {longitude}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Radius:</span>
                <span className="font-extrabold text-emerald-600">{radiusMeters}m</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Working Hours:</span>
                <span className="font-bold text-slate-800">
                  {shiftStartTime && shiftEndTime
                    ? `${shiftStartTime} - ${shiftEndTime} IST (${gracePeriodMins}m grace)`
                    : shiftStartTime
                    ? `${shiftStartTime} onwards IST (${gracePeriodMins}m grace)`
                    : 'Flexible / 24x7'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
