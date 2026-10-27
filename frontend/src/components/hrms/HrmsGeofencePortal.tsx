import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { apiClient } from '@/services/apiClient';
import {
  hrmsApi,
  type GeofenceScheme,
  type EmployeeItem,
} from '@/services/hrmsApi';

interface HoOrganizationItem {
  id: string;
  vahd_name: string;
  branch_name: string;
  city?: string;
  geofence_portal_enabled: boolean;
  status?: string;
  employee_count?: number;
}

interface HrmsGeofencePortalProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsGeofencePortal({ onSuccessToast }: HrmsGeofencePortalProps) {
  const { user } = useAuth();
  const isHoUser = user?.role === 'ho' || user?.role === 'super_admin';

  // Head Office Governance State
  const [hoOrganizations, setHoOrganizations] = useState<HoOrganizationItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [togglingAccess, setTogglingAccess] = useState<boolean>(false);

  const [schemes, setSchemes] = useState<GeofenceScheme[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [memberFilterType, setMemberFilterType] = useState<'all' | 'employees' | 'students'>('all');
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
  const [vahdName, setvahdName] = useState('');
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

  // Fetch initial schemes, branches, vahd settings, employees and students from live database
  const loadData = async () => {
    setLoading(true);
    try {
      const [schemesRes, empsRes, custsRes, branchesRes, settingsRes] = await Promise.all([
        hrmsApi.getGeofenceSchemes().catch(() => []),
        hrmsApi.getEmployees().catch(() => []),
        apiClient.get<any[]>('/customers').catch(() => []),
        apiClient.get<any[]>('/vahd/branches').catch(() => []),
        apiClient.get<any>('/vahd/settings').catch(() => null),
      ]);

      const emps = empsRes || [];
      const custs = Array.isArray(custsRes) ? custsRes : [];
      setEmployees(emps);
      setStudents(custs);

      const realBranches = Array.isArray(branchesRes)
        ? branchesRes.map((b) => ({
          name: b.branch_name || b.name || '',
          city: b.city || '',
        }))
        : [];
      setAvailableBranches(realBranches);

      const realvahdName = settingsRes?.vahd_name || realBranches[0]?.name || '';
      setvahdName(realvahdName);

      const allMemberIds = [...emps.map((e) => e.id), ...custs.map((c) => c.id)];

      if (schemesRes && schemesRes.length > 0) {
        setSchemes(schemesRes);
        loadSchemeIntoForm(schemesRes[0], allMemberIds, realvahdName);
      } else {
        setSchemes([]);
        setActiveSchemeId('');
        setSchemeName('');
        setBranchName(realBranches[0]?.name || '');
        setvahdName(realvahdName);
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
        () => { }
      );
    }
  }, []);

  // Fetch HO organizations and default selection
  useEffect(() => {
    if (isHoUser) {
      apiClient
        .get<{ organizations: HoOrganizationItem[] }>('/ho/organizations')
        .then((res) => {
          const orgs = res?.organizations || [];
          setHoOrganizations(orgs);
          if (orgs.length > 0) {
            const saved = localStorage.getItem('vahd_selected_org_id');
            const matched = orgs.find((o) => o.id === saved) || orgs[0];
            setSelectedOrgId(matched.id);
          }
        })
        .catch((err) => {
          console.error('Failed to load HO organizations:', err);
        });
    }
  }, [isHoUser]);

  const handleToggleBranchAccess = async (branchId: string, currentEnabled: boolean) => {
    if (togglingAccess) return;
    setTogglingAccess(true);
    const nextStatus = !currentEnabled;
    try {
      const res = await apiClient.post<any>(`/ho/organizations/${branchId}/toggle-geofence`, {
        enabled: nextStatus,
      });
      setHoOrganizations((prev) =>
        prev.map((o) => (o.id === branchId ? { ...o, geofence_portal_enabled: nextStatus } : o))
      );
      showToast(
        res?.message ||
        `Attendance & Geofence Portal ${nextStatus ? 'ENABLED' : 'DISABLED'} for this organization`
      );
      window.dispatchEvent(
        new CustomEvent('vahd:branch_geofence_toggled', {
          detail: { branchId, enabled: nextStatus },
        })
      );
    } catch (err: any) {
      console.error('Failed to toggle branch geofence portal access:', err);
      showToast('Error updating organization portal access. Please try again.');
    } finally {
      setTogglingAccess(false);
    }
  };

  const selectedOrg = hoOrganizations.find((o) => o.id === selectedOrgId) || hoOrganizations[0];


  const loadSchemeIntoForm = (scheme: GeofenceScheme, allAvailableIds?: string[], fallbackvahdName?: string) => {
    setActiveSchemeId(scheme.id || '');
    setSchemeName(scheme.name || '');
    setBranchName(scheme.branch_name || '');
    setvahdName(scheme.vahd_name || fallbackvahdName || vahdName || '');
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

    const rawAssigned = scheme.assigned_employee_ids || [];
    if (Array.isArray(rawAssigned) && rawAssigned.length > 0) {
      const cleanIds = rawAssigned.filter((x): x is string => typeof x === 'string' && x.length > 0);
      setAssignedEmployeeIds(cleanIds);
    } else if (allAvailableIds && allAvailableIds.length > 0) {
      const cleanIds = allAvailableIds.filter((x): x is string => typeof x === 'string' && x.length > 0);
      setAssignedEmployeeIds(cleanIds);
    } else {
      setAssignedEmployeeIds([]);
    }
  };

  const handleCreateNewScheme = () => {
    const newId = `scheme_${Date.now()}`;
    const targetBranch = availableBranches[0]?.name || '';
    setActiveSchemeId(newId);
    setSchemeName('');
    setBranchName(targetBranch);
    setvahdName(vahdName);
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
        vahd_name: vahdName,
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

  // Unified Member Selection Helpers (Employees & Students)
  interface UnifiedMember {
    id: string;
    name: string;
    code?: string;
    role: 'Employee' | 'Student';
    subText: string;
    email?: string;
  }

  const unifiedMembers: UnifiedMember[] = [
    ...employees.map((emp) => ({
      id: String(emp.id || ''),
      name: (emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()) || 'Employee',
      code: emp.code ? `EMP-${emp.code}` : 'EMP',
      role: 'Employee' as const,
      subText: emp.designation || emp.department || 'Staff / employee',
      email: emp.email || '',
    })),
    ...students.map((stu, idx) => ({
      id: String(stu.id || ''),
      name: stu.full_name || stu.name || 'Student Member',
      code: stu.member_code || stu.code || `STU-${String(idx + 1).padStart(3, '0')}`,
      role: 'Student' as const,
      subText: stu.batch || stu.branch || 'Student',
      email: stu.email || '',
    })),
  ].filter((m) => Boolean(m.id));

  const filteredMembers = unifiedMembers.filter((m) => {
    if (memberFilterType === 'employees' && m.role !== 'Employee') return false;
    if (memberFilterType === 'students' && m.role !== 'Student') return false;
    if (!searchEmployeeQuery) return true;
    const q = (searchEmployeeQuery || '').toLowerCase();
    const nameStr = (m.name || '').toLowerCase();
    const codeStr = (m.code || '').toLowerCase();
    const subStr = (m.subText || '').toLowerCase();
    const emailStr = (m.email || '').toLowerCase();
    return (
      nameStr.includes(q) ||
      codeStr.includes(q) ||
      subStr.includes(q) ||
      emailStr.includes(q)
    );
  });

  const assignedEmpCount = assignedEmployeeIds.filter((id) => typeof id === 'string' && !id.startsWith('cust_')).length;
  const assignedStuCount = assignedEmployeeIds.filter((id) => typeof id === 'string' && id.startsWith('cust_')).length;

  const toggleMember = (id: string) => {
    if (!id) return;
    if (assignedEmployeeIds.includes(id)) {
      setAssignedEmployeeIds(assignedEmployeeIds.filter((x) => x !== id));
    } else {
      setAssignedEmployeeIds([...assignedEmployeeIds, id]);
    }
  };

  const handleSelectAllMembers = () => {
    const idsToSelect = filteredMembers.map((m) => m.id).filter(Boolean);
    const newSet = new Set([...assignedEmployeeIds.filter(Boolean), ...idsToSelect]);
    setAssignedEmployeeIds(Array.from(newSet));
  };

  const handleClearAllMembers = () => {
    if (memberFilterType === 'all') {
      setAssignedEmployeeIds([]);
    } else {
      const idsToRemove = new Set(filteredMembers.map((m) => m.id));
      setAssignedEmployeeIds(assignedEmployeeIds.filter((id) => Boolean(id) && !idsToRemove.has(id)));
    }
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

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-800 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-navy-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-purple-400/40 animate-slide-up">
          <Icon name="check-circle" size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEAD OFFICE GOVERNANCE & ACCESS CONTROL BANNER                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isHoUser && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 shadow-xl text-white space-y-4">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                    <Icon name="shield" size={12} className="text-indigo-400" />
                    Head Office Governance Control
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Role: Head Office (HO)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Branch Geofence Portal Access Control</span>
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl font-medium">
                  Toggle whether the <strong>Attendance &amp; Geofence Portal</strong> tab is visible and accessible in Owner login for each branch / organization. When disabled, this tab is completely hidden from that branch's owner.
                </p>
              </div>

              {/* Active Branch Control Pill / Switch */}
              {selectedOrg && (
                <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 flex items-center gap-4 shrink-0 shadow-lg">
                  <div className="text-right">
                    <div className="text-[10px] font-extrabold uppercase text-slate-400">
                      Portal Status for {selectedOrg.vahd_name || selectedOrg.branch_name}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          selectedOrg.geofence_portal_enabled
                            ? 'bg-emerald-400 animate-pulse'
                            : 'bg-rose-400'
                        )}
                      />
                      <span
                        className={cn(
                          'text-xs font-black',
                          selectedOrg.geofence_portal_enabled ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {selectedOrg.geofence_portal_enabled ? 'PORTAL ENABLED' : 'PORTAL DISABLED'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch Button */}
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleBranchAccess(selectedOrg.id, selectedOrg.geofence_portal_enabled)
                    }
                    disabled={togglingAccess}
                    className={cn(
                      'relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 shadow-inner',
                      selectedOrg.geofence_portal_enabled
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'bg-slate-700 hover:bg-slate-600'
                    )}
                    title={
                      selectedOrg.geofence_portal_enabled
                        ? 'Click to disable for this branch'
                        : 'Click to enable for this branch'
                    }
                  >
                    <span className="sr-only">Toggle portal access</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black',
                        selectedOrg.geofence_portal_enabled
                          ? 'translate-x-8 text-emerald-600'
                          : 'translate-x-0 text-slate-500'
                      )}
                    >
                      {selectedOrg.geofence_portal_enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Organizations Grid / Selector Bar */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Select Branch / Organisation to Configure:</span>
                <span className="text-[10px] text-slate-500">
                  {hoOrganizations.length} Total Registered Branches
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {hoOrganizations.map((org) => {
                  const isSelected = org.id === selectedOrgId;
                  return (
                    <div
                      key={org.id}
                      onClick={() => {
                        setSelectedOrgId(org.id);
                        if (org.branch_name) setBranchName(org.branch_name);
                        if (org.vahd_name) setvahdName(org.vahd_name);
                      }}
                      className={cn(
                        'cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between gap-3',
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-400 ring-2 ring-indigo-400/30'
                          : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon
                            name="building-2"
                            size={14}
                            className={isSelected ? 'text-indigo-400' : 'text-slate-400'}
                          />
                          <span className="text-xs font-black text-white truncate">
                            {org.vahd_name || org.branch_name}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold pl-5">
                          Branch: {org.branch_name} {org.city ? `• ${org.city}` : ''}
                        </div>
                      </div>

                      {/* Mini Toggle Button per organization */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrgId(org.id);
                          if (org.branch_name) setBranchName(org.branch_name);
                          if (org.vahd_name) setvahdName(org.vahd_name);
                          handleToggleBranchAccess(org.id, org.geofence_portal_enabled);
                        }}
                        disabled={togglingAccess}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase shrink-0 transition-all border flex items-center gap-1',
                          org.geofence_portal_enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            org.geofence_portal_enabled ? 'bg-emerald-400' : 'bg-rose-400'
                          )}
                        />
                        <span>{org.geofence_portal_enabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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

            {/* Branch & vahd Selector Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase mb-1.5">
                  vahd BRANCH ASSIGNMENT
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
                  ORGANIZATION / vahd NAME
                </label>
                <input
                  type="text"
                  value={vahdName}
                  onChange={(e) => setvahdName(e.target.value)}
                  placeholder="vahd / Facility Name"
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
          {/* Card 3: Assign Desired Members (Employees & Students) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Icon name="users" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Assign Desired Members
                  </h3>
                  <p className="text-[11px] font-medium text-purple-700">
                    {assignedEmployeeIds.length} of {unifiedMembers.length} active in scheme ({assignedEmpCount} Employees, {assignedStuCount} Students)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleSelectAllMembers}
                  className="hover:text-purple-700 hover:underline cursor-pointer"
                >
                  All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={handleClearAllMembers}
                  className="hover:text-purple-700 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter Tabs: All, Employees, Students */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
              <button
                type="button"
                onClick={() => setMemberFilterType('all')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer text-[11px]',
                  memberFilterType === 'all'
                    ? 'bg-white text-purple-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                All ({unifiedMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilterType('employees')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer text-[11px]',
                  memberFilterType === 'employees'
                    ? 'bg-white text-purple-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Employees ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilterType('students')}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer text-[11px]',
                  memberFilterType === 'students'
                    ? 'bg-white text-blue-800 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Students ({students.length})
              </button>
            </div>

            {/* Member Search Bar */}
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
                placeholder="Search employees & students (name, email, code)..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Members List (Scrollable) */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredMembers.map((m) => {
                const isAssigned = assignedEmployeeIds.includes(m.id);
                const initial = ((m.name && m.name[0]) || (m.role === 'Student' ? 'S' : 'E')).toUpperCase();
                const isStudent = m.role === 'Student';

                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={cn(
                      'p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all',
                      isAssigned
                        ? isStudent
                          ? 'bg-blue-50/60 border-blue-300'
                          : 'bg-purple-50/60 border-purple-300'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 opacity-75'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => toggleMember(m.id)}
                        className={cn(
                          'w-4 h-4 rounded border-slate-300',
                          isStudent
                            ? 'text-blue-600 focus:ring-blue-500'
                            : 'text-purple-600 focus:ring-purple-500'
                        )}
                      />
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 shadow-2xs',
                          isStudent
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        )}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span
                            className={cn(
                              'text-[9px] font-black px-1.5 py-0.2 rounded-sm uppercase tracking-wider',
                              isStudent
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            )}
                          >
                            {m.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold truncate">
                          {m.code ? m.code : ''} {m.subText ? `· ${m.subText}` : ''}
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

              {filteredMembers.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                  No members matched the filter.
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
                <span className="text-slate-500 font-medium">Branch / vahd:</span>
                <span className="font-extrabold text-purple-700">{branchName} ({vahdName})</span>
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
