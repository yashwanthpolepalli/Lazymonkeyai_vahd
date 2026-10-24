import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

interface HoOrganization {
  id: string;
  gym_name: string;
  branch_name: string;
  city: string;
  address: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  is_owner_active: boolean;
  employee_count: number;
  student_count: number;
  today_punches: number;
  status: string;
  is_selected?: boolean;
}

interface HoDashboardData {
  is_filtered: boolean;
  selected_organization_id: string;
  selected_organization_name: string;
  selected_branch_name: string;
  selected_owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    role: string;
  } | null;
  total_organizations: number;
  total_employees: number;
  total_students: number;
  today_punches: number;
  attendance_rate: number;
  departments: Array<{ department: string; count: number }>;
  recent_activities: Array<{
    id: string;
    person_name: string;
    role: string;
    direction: string;
    device: string;
    time: string;
    status: string;
    branch: string;
  }>;
  organizations: HoOrganization[];
}

export const HoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HoDashboardData | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(() => {
    return localStorage.getItem('vahd_selected_org_id') || 'all';
  });
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Modal State for Onboarding Owner
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [modalTargetOrgId, setModalTargetOrgId] = useState<string>('');
  const [isCreatingNewOrg, setIsCreatingNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [onboardSuccess, setOnboardSuccess] = useState<any>(null);
  const [formError, setFormError] = useState('');

  // Tab State: Overview vs Branch Attendance Reports
  const [hoTab, setHoTab] = useState<'overview' | 'attendance_reports'>('overview');
  const [repYear, setRepYear] = useState<number>(new Date().getFullYear());
  const [repMonth, setRepMonth] = useState<number>(new Date().getMonth() + 1);
  const [repCategory, setRepCategory] = useState<'all' | 'employees' | 'students'>('all');
  const [repData, setRepData] = useState<any | null>(null);
  const [loadingRep, setLoadingRep] = useState(false);
  const [branchActiveTab, setBranchActiveTab] = useState<Record<string, 'employees' | 'students'>>({});

  // Fetch Dashboard data from Backend API
  const fetchDashboardData = async (orgId?: string) => {
    try {
      setLoading(true);
      const target = orgId !== undefined ? orgId : selectedOrgId;
      const param = target && target !== 'all' ? `?organization_id=${encodeURIComponent(target)}` : '';
      const res = await apiClient.get<HoDashboardData>(`/ho/dashboard${param}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load HO dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Branch-Wise Attendance Reports for HO
  const fetchBranchAttendanceReports = async (y = repYear, m = repMonth, bId = selectedOrgId) => {
    try {
      setLoadingRep(true);
      const bParam = bId && bId !== 'all' ? `&branch_id=${encodeURIComponent(bId)}` : '';
      const res = await apiClient.get<any>(`/ho/attendance-reports/branches?year=${y}&month=${m}${bParam}`);
      setRepData(res);
    } catch (err) {
      console.error('Failed to load branch attendance reports:', err);
    } finally {
      setLoadingRep(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedOrgId);
  }, [selectedOrgId]);

  useEffect(() => {
    if (hoTab === 'attendance_reports') {
      fetchBranchAttendanceReports(repYear, repMonth, selectedOrgId);
    }
  }, [hoTab, repYear, repMonth, selectedOrgId]);

  // Synchronize organization selection across components
  const handleSelectOrganization = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem('vahd_selected_org_id', orgId);
    setOrgDropdownOpen(false);
    // Notify Topbar or other components
    window.dispatchEvent(new CustomEvent('vahd:org_changed', { detail: { id: orgId } }));
  };

  // Open Onboard Owner Modal
  const handleOpenOnboardModal = (preselectedOrgId?: string) => {
    setFormError('');
    setOnboardSuccess(null);
    if (preselectedOrgId) {
      setModalTargetOrgId(preselectedOrgId);
      setIsCreatingNewOrg(false);
    } else if (data?.organizations && data.organizations.length > 0) {
      setModalTargetOrgId(data.organizations[0].id);
      setIsCreatingNewOrg(false);
    } else {
      setIsCreatingNewOrg(true);
    }
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPhone('');
    setOwnerPassword('Owner@' + Math.floor(1000 + Math.random() * 9000));
    setShowOnboardModal(true);
  };

  // Submit Owner Onboarding to Backend
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!ownerName.trim()) {
      setFormError('Please enter owner full name');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setFormError('Please enter a valid owner email address');
      return;
    }
    if (!ownerPhone.trim()) {
      setFormError('Please enter owner phone number');
      return;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const payload: any = {
        owner_name: ownerName.trim(),
        owner_email: ownerEmail.trim().toLowerCase(),
        phone: ownerPhone.trim(),
        password: ownerPassword.trim(),
      };

      if (isCreatingNewOrg) {
        if (!newOrgName.trim()) {
          setFormError('Organization name is required');
          setSubmitting(false);
          return;
        }
        payload.gym_name = newOrgName.trim();
        payload.branch_name = newBranchName.trim() || newOrgName.trim();
        payload.city = newOrgCity.trim();
        payload.address = newOrgAddress.trim();
      } else {
        payload.organization_id = modalTargetOrgId;
      }

      const res: any = await apiClient.post('/ho/onboard-owner', payload);
      setOnboardSuccess(res);
      // Refresh dashboard live from DB
      await fetchDashboardData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to onboard owner';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOrgName = useMemo(() => {
    if (selectedOrgId === 'all') return 'All Organizations (Global HQ)';
    const found = data?.organizations.find((o) => o.id === selectedOrgId);
    return found ? `${found.gym_name} - ${found.branch_name}` : 'Selected Organization';
  }, [selectedOrgId, data]);

  return (
    <div className="min-h-screen bg-slate-50/70 w-full px-3 sm:px-4 py-4 space-y-5">
      {/* ── TOP HEADER SECTION ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
              HEAD OFFICE COMMAND CENTER
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-semibold">Live Dynamic DB Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {user?.name || 'Head Office'} • Organization Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Centrally manage organizations, onboard branch owners, and monitor multi-branch employees &amp; student metrics.
          </p>
        </div>

        {/* Header Right: Organization Dropdown Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Organization Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-800 transition-all shadow-2xs"
            >
              <Icon name="building-2" size={15} className="text-purple-600" />
              <div className="flex flex-col items-start text-left leading-tight">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viewing Scope</span>
                <span className="truncate max-w-[160px] sm:max-w-[200px] text-slate-900 font-extrabold">
                  {selectedOrgName}
                </span>
              </div>
              <Icon name="chevron-down" size={14} className="text-slate-500 shrink-0 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {orgDropdownOpen && (
              <div className="absolute right-0 top-14 w-72 sm:w-80 bg-white rounded-3xl p-2.5 z-50 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Organization Filter</p>
                  <p className="text-xs text-slate-500 font-medium">Dashboard metrics will update strictly for the selected scope.</p>
                </div>

                <div className="py-1.5 space-y-1 max-h-64 overflow-y-auto">
                  {/* All Organizations Option */}
                  <button
                    onClick={() => handleSelectOrganization('all')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-xs transition-colors ${
                      selectedOrgId === 'all'
                        ? 'bg-purple-50 text-purple-900 font-extrabold border border-purple-200'
                        : 'hover:bg-slate-50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                        HQ
                      </div>
                      <div>
                        <p className="text-xs font-bold">All Organizations</p>
                        <p className="text-[10px] text-slate-400">Global Head Office aggregate</p>
                      </div>
                    </div>
                    {selectedOrgId === 'all' && <Icon name="check" size={14} className="text-purple-600" />}
                  </button>

                  {/* Individual Organizations */}
                  {data?.organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrganization(org.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left text-xs transition-colors ${
                        selectedOrgId === org.id
                          ? 'bg-purple-50 text-purple-900 font-extrabold border border-purple-200'
                          : 'hover:bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          <Icon name="building-2" size={13} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{org.gym_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {org.branch_name} • {org.city || 'Campus'}
                          </p>
                        </div>
                      </div>
                      {selectedOrgId === org.id && <Icon name="check" size={14} className="text-purple-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action: Onboard Owner */}
          <button
            onClick={() => handleOpenOnboardModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all transform active:scale-95"
          >
            <Icon name="user-plus" size={14} />
            <span>Onboard Owner</span>
          </button>

          {/* Action: Refresh Data */}
          <button
            onClick={() => fetchDashboardData()}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh from Database"
          >
            <Icon name="refresh-cw" size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── HO PORTAL TAB SWITCHER ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setHoTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            hoTab === 'overview'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Icon name="layout-dashboard" size={15} />
          <span>Overview &amp; Directory</span>
        </button>

        <button
          onClick={() => setHoTab('attendance_reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            hoTab === 'attendance_reports'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Icon name="calendar-check" size={15} />
          <span>Branch Attendance Reports &amp; Downloads (Excel &amp; PDF)</span>
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & DIRECTORY ────────────────────────────────────── */}
      {hoTab === 'overview' && (
        <>
          {/* ── KPI HIGHLIGHTS CARDS ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Organizations Scope */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organizations</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="building-2" size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.is_filtered ? '1 Selected' : data?.total_organizations ?? 0}
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {data?.is_filtered ? data.selected_organization_name : 'Active branches under Head Office'}
            </p>
          </div>
        </div>

        {/* KPI 2: Total Employees */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="users" size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.total_employees ?? 0}
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <span>●</span> Active HRMS employees
            </p>
          </div>
        </div>

        {/* KPI 3: Total Students */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon name="user-check" size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.total_students ?? 0}
            </div>
            <p className="text-[11px] font-semibold text-blue-600">
              Enrolled students &amp; trainees
            </p>
          </div>
        </div>

        {/* KPI 4: Live Attendance Today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Attendance</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="activity" size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.today_punches ?? 0}
            </div>
            <p className="text-[11px] font-semibold text-amber-600">
              {data?.attendance_rate ?? 0}% overall check-in rate
            </p>
          </div>
        </div>
      </div>


      {/* ── ORGANIZATIONS DIRECTORY & ONBOARDED OWNERS TABLE ─────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Organizations &amp; Branch Directory</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live mapping of Head Office organizations, assigned owners, and current personnel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenOnboardModal()}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Icon name="plus" size={14} />
              <span>Onboard New Owner</span>
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Organization &amp; Branch</th>
                <th className="py-3.5 px-4">Onboarded Owner</th>
                <th className="py-3.5 px-4">City / Location</th>
                <th className="py-3.5 px-4 text-center">Employees</th>
                <th className="py-3.5 px-4 text-center">Students</th>
                <th className="py-3.5 px-4 text-center">Today's Activity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.organizations && data.organizations.length > 0 ? (
                data.organizations.map((org) => {
                  const isCurrentSelected = selectedOrgId === org.id;
                  return (
                    <tr
                      key={org.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentSelected ? 'bg-purple-50/40 font-semibold' : ''
                      }`}
                    >
                      {/* Organization & Branch */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <Icon name="building-2" size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{org.gym_name}</p>
                            <span className="text-[11px] text-slate-400 font-medium">{org.branch_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Onboarded Owner */}
                      <td className="py-4 px-4">
                        {org.owner_name ? (
                          <div>
                            <p className="font-bold text-slate-900">{org.owner_name}</p>
                            <p className="text-[11px] text-slate-500">{org.owner_email}</p>
                            {org.owner_phone && (
                              <p className="text-[10px] text-slate-400">📞 {org.owner_phone}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[11px]">
                            <Icon name="alert-circle" size={13} />
                            <span>No Owner Assigned</span>
                          </div>
                        )}
                      </td>

                      {/* City */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-slate-600 font-medium">
                          <Icon name="map-pin" size={13} className="text-slate-400 shrink-0" />
                          <span>{org.city || '—'}</span>
                        </div>
                      </td>

                      {/* Employees Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs">
                          {org.employee_count}
                        </span>
                      </td>

                      {/* Students Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs">
                          {org.student_count}
                        </span>
                      </td>

                      {/* Today's Activity */}
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          {org.today_punches} punches
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSelectOrganization(org.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isCurrentSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isCurrentSelected ? 'Viewing' : 'Switch View'}
                          </button>
                          <button
                            onClick={() => handleOpenOnboardModal(org.id)}
                            className="p-1.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            title="Onboard or Reassign Owner"
                          >
                            <Icon name="user-plus" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    No organizations found under this Head Office account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECENT LIVE BIOMETRIC ACTIVITY FEED ───────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Recent Attendance &amp; Punch Stream</h3>
            <p className="text-xs text-slate-500 font-medium">Real-time attendance logs filtered for {selectedOrgName}.</p>
          </div>
          <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
            Live Stream
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.recent_activities && data.recent_activities.length > 0 ? (
            data.recent_activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    act.direction === 'CHECK_IN'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {act.direction === 'CHECK_IN' ? 'IN' : 'OUT'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-slate-900 truncate">{act.person_name}</p>
                    <span className="text-[10px] font-bold text-slate-400">{act.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {act.role} • {act.branch}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-slate-400 font-semibold">
              No recent attendance punches recorded yet for today.
            </div>
          )}
        </div>
      </div>
    </>
  )}

      {/* ── TAB 2: BRANCH ATTENDANCE REPORTS & EXPORTS (EXCEL & PDF) ──────── */}
      {hoTab === 'attendance_reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                Head Office Multi-Branch Reporting
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Branch-Wise Attendance Statement &amp; Export Center
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                View real-time monthly attendance breakdown for employees and students per branch and download Excel &amp; PDF reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Year Selector */}
              <select
                value={repYear}
                onChange={(e) => setRepYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Month Selector */}
              <select
                value={repMonth}
                onChange={(e) => setRepMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
              >
                {[
                  { m: 1, name: 'January' },
                  { m: 2, name: 'February' },
                  { m: 3, name: 'March' },
                  { m: 4, name: 'April' },
                  { m: 5, name: 'May' },
                  { m: 6, name: 'June' },
                  { m: 7, name: 'July' },
                  { m: 8, name: 'August' },
                  { m: 9, name: 'September' },
                  { m: 10, name: 'October' },
                  { m: 11, name: 'November' },
                  { m: 12, name: 'December' }
                ].map(({ m, name }) => (
                  <option key={m} value={m}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={repCategory}
                onChange={(e) => setRepCategory(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">👥 + 🎓 All Personnel (Staff &amp; Students)</option>
                <option value="employees">👥 Employees Only</option>
                <option value="students">🎓 Students Only</option>
              </select>

              {/* Download Excel */}
              <a
                href={`/api/v1/ho/attendance-reports/export/excel?year=${repYear}&month=${repMonth}&branch_id=${selectedOrgId}&category=${repCategory}`}
                download
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title="Download consolidated Excel/CSV attendance report"
              >
                <Icon name="file-spreadsheet" size={14} />
                <span>Download Excel</span>
              </a>

              {/* Download PDF / Print */}
              <a
                href={`/api/v1/ho/attendance-reports/export/pdf?year=${repYear}&month=${repMonth}&branch_id=${selectedOrgId}&category=${repCategory}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                title="Open executive printable PDF attendance statement"
              >
                <Icon name="printer" size={14} />
                <span>Download PDF</span>
              </a>

              {/* Refresh */}
              <button
                onClick={() => fetchBranchAttendanceReports()}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Refresh Attendance Reports"
              >
                <Icon name="refresh-cw" size={15} className={loadingRep ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Branches in Scope</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{repData?.total_branches ?? 0}</div>
              <p className="text-[11px] text-purple-600 font-bold">{repData?.period || 'Selected Month'}</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Organization Staff</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">{repData?.total_employees ?? 0}</div>
              <p className="text-[11px] text-slate-500 font-semibold">Active HRMS staff members</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs text-center space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled Students</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-600">{repData?.total_students ?? 0}</div>
              <p className="text-[11px] text-slate-500 font-semibold">Active campus students</p>
            </div>
          </div>

          {/* Branch-by-Branch Reports */}
          {loadingRep ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-semibold">
              Loading branch-wise attendance records from database...
            </div>
          ) : !repData?.branches || repData.branches.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <Icon name="building-2" size={32} className="text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Branches Found</h4>
              <p className="text-xs text-slate-400">No active branches belong to this Head Office scope.</p>
            </div>
          ) : (
            repData.branches.map((b: any) => {
              const currentTab = branchActiveTab[b.branch_id] || 'employees';
              const setTab = (t: 'employees' | 'students') =>
                setBranchActiveTab((prev) => ({ ...prev, [b.branch_id]: t }));

              return (
                <div
                  key={b.branch_id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4"
                >
                  {/* Branch Card Header */}
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-purple-50/20 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">
                          Branch
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs font-bold text-slate-600">
                          City: <strong className="text-slate-800">{b.city || 'Primary Campus'}</strong>
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">{b.gym_name || b.branch_name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Owner: <strong>{b.owner_name || 'No Owner Assigned'}</strong> &bull; Email: {b.owner_email || '--'} &bull; Phone: {b.owner_phone || '--'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Metric Badges */}
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          Staff: <strong>{b.employees?.total_count || 0}</strong> (Avg: {b.employees?.avg_attendance_percentage || 0}%)
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                          Students: <strong>{b.students?.total_count || 0}</strong> (Avg: {b.students?.avg_attendance_percentage || 0}%)
                        </div>
                      </div>

                      {/* Download Branch Specific Excel */}
                      <a
                        href={`/api/v1/ho/attendance-reports/export/excel?year=${repYear}&month=${repMonth}&branch_id=${b.branch_id}&category=${repCategory}`}
                        download
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer"
                        title="Download Excel for this branch"
                      >
                        <Icon name="download" size={13} />
                        <span>Branch Excel</span>
                      </a>

                      {/* Download Branch Specific PDF */}
                      <a
                        href={`/api/v1/ho/attendance-reports/export/pdf?year=${repYear}&month=${repMonth}&branch_id=${b.branch_id}&category=${repCategory}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
                        title="View printable PDF for this branch"
                      >
                        <Icon name="printer" size={13} />
                        <span>Branch PDF</span>
                      </a>
                    </div>
                  </div>

                  {/* Sub-tabs per branch: Employees vs Students */}
                  <div className="px-6 flex items-center gap-2">
                    {repCategory !== 'students' && (
                      <button
                        onClick={() => setTab('employees')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentTab === 'employees'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        👥 Staff Members ({b.employees?.total_count || 0})
                      </button>
                    )}

                    {repCategory !== 'employees' && (
                      <button
                        onClick={() => setTab('students')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentTab === 'students'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        🎓 Enrolled Students ({b.students?.total_count || 0})
                      </button>
                    )}
                  </div>

                  {/* Branch Employee Table */}
                  {currentTab === 'employees' && repCategory !== 'students' && (
                    <div className="p-6 pt-0 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Emp Code</th>
                            <th className="py-2.5 px-3">Employee Name</th>
                            <th className="py-2.5 px-3">Designation &amp; Dept</th>
                            <th className="py-2.5 px-3">Email &amp; Phone</th>
                            <th className="py-2.5 px-3 text-center">Working</th>
                            <th className="py-2.5 px-3 text-center">Present</th>
                            <th className="py-2.5 px-3 text-center">Absent</th>
                            <th className="py-2.5 px-3 text-center">Leaves</th>
                            <th className="py-2.5 px-3 text-center">Score %</th>
                            <th className="py-2.5 px-3 text-right">Statements</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {!b.employees?.list || b.employees.list.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400 font-semibold">
                                No active employees found in this branch.
                              </td>
                            </tr>
                          ) : (
                            b.employees.list.map((emp: any) => (
                              <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-slate-900">{emp.code}</td>
                                <td className="py-3 px-3 font-extrabold text-slate-900">{emp.name}</td>
                                <td className="py-3 px-3 text-slate-600">
                                  {emp.designation} &bull; <span className="text-slate-400">{emp.department}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-indigo-600 font-medium truncate max-w-[160px]">{emp.email}</div>
                                  <div className="text-[10px] text-slate-400">{emp.phone}</div>
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-slate-800">{emp.total_working_days}</td>
                                <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{emp.days_present}</td>
                                <td className="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30">{emp.days_absent}</td>
                                <td className="py-3 px-3 text-center font-bold text-indigo-600">{emp.days_leave}</td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      emp.attendance_percentage >= 75
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : emp.attendance_percentage >= 60
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {emp.attendance_percentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <a
                                      href={`/api/v1/hrms/${emp.id}/attendance-report/csv?year=${repYear}&month=${repMonth}`}
                                      download
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                                      title="Download Employee CSV"
                                    >
                                      <Icon name="download" size={13} />
                                    </a>
                                    <a
                                      href={`/api/v1/hrms/${emp.id}/attendance-report/pdf?year=${repYear}&month=${repMonth}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                                      title="Print Employee PDF"
                                    >
                                      <Icon name="printer" size={13} />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Branch Student Table */}
                  {currentTab === 'students' && repCategory !== 'employees' && (
                    <div className="p-6 pt-0 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Roll / ID</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Program / Course</th>
                            <th className="py-2.5 px-3">Student Mobile</th>
                            <th className="py-2.5 px-3">Parent Mobile</th>
                            <th className="py-2.5 px-3 text-center">Working</th>
                            <th className="py-2.5 px-3 text-center">Present</th>
                            <th className="py-2.5 px-3 text-center">Absent</th>
                            <th className="py-2.5 px-3 text-center">Score %</th>
                            <th className="py-2.5 px-3">Academic Standing</th>
                            <th className="py-2.5 px-3 text-right">Statements</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {!b.students?.list || b.students.list.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold">
                                No active students found in this branch.
                              </td>
                            </tr>
                          ) : (
                            b.students.list.map((s: any) => (
                              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-slate-900">{s.roll_number}</td>
                                <td className="py-3 px-3 font-extrabold text-slate-900">{s.name}</td>
                                <td className="py-3 px-3 text-slate-600">{s.course}</td>
                                <td className="py-3 px-3 text-slate-500">{s.phone}</td>
                                <td className="py-3 px-3 font-mono text-purple-700 font-bold">{s.parent_phone}</td>
                                <td className="py-3 px-3 text-center font-bold text-slate-800">{s.total_working_days}</td>
                                <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{s.days_present}</td>
                                <td className="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30">{s.days_absent}</td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      s.attendance_percentage >= 75
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : s.attendance_percentage >= 60
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {s.attendance_percentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-500">{s.status_text || '--'}</td>
                                <td className="py-3 px-3 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <a
                                      href={`/api/v1/customers/${s.id}/attendance-report/csv?year=${repYear}&month=${repMonth}`}
                                      download
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                                      title="Download Student CSV"
                                    >
                                      <Icon name="download" size={13} />
                                    </a>
                                    <a
                                      href={`/api/v1/customers/${s.id}/attendance-report/pdf?year=${repYear}&month=${repMonth}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                                      title="Print Student PDF"
                                    >
                                      <Icon name="printer" size={13} />
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── ONBOARD OWNER MODAL ───────────────────────────────────────────── */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                  Head Office Admin
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Onboard Gym Owner</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Create owner credentials and assign them to manage an organization under this Head Office.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-circle" size={16} />
                <span>{formError}</span>
              </div>
            )}

            {onboardSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                    <Icon name="check" size={18} />
                    <span>Owner Successfully Onboarded!</span>
                  </div>
                  <p>{onboardSuccess.message}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-extrabold text-slate-800">Generated Login Credentials:</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Email:</span>
                      <strong className="text-slate-900">{onboardSuccess.owner?.email}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Password:</span>
                      <strong className="text-purple-700 font-mono text-sm">{onboardSuccess.owner?.temporary_password}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Role:</span>
                      <span className="font-bold text-emerald-600">{onboardSuccess.owner?.role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Organization:</span>
                      <strong className="text-slate-900">{onboardSuccess.organization?.gym_name}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowOnboardModal(false);
                      setOnboardSuccess(null);
                    }}
                    className="btn-primary text-xs py-2.5 px-5"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
                {/* Organization Selection Mode */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Target Organization</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewOrg(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        !isCreatingNewOrg
                          ? 'border-purple-600 bg-purple-50/50 text-purple-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Existing Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewOrg(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isCreatingNewOrg
                          ? 'border-purple-600 bg-purple-50/50 text-purple-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      + Create New Organization
                    </button>
                  </div>
                </div>

                {/* If Existing: Select Dropdown */}
                {!isCreatingNewOrg ? (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Select Organization to Assign Owner</label>
                    <select
                      value={modalTargetOrgId}
                      onChange={(e) => setModalTargetOrgId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      {data?.organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.gym_name} ({org.branch_name}) • {org.city || 'Campus'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* If New: Enter Organization Name & Branch */
                  <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700">Organization Name *</label>
                        <input
                          type="text"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organization name"
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Branch / Campus</label>
                        <input
                          type="text"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="Enter branch / campus name"
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700">City</label>
                        <input
                          type="text"
                          value={newOrgCity}
                          onChange={(e) => setNewOrgCity(e.target.value)}
                          placeholder="Enter city"
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700">Address</label>
                        <input
                          type="text"
                          value={newOrgAddress}
                          onChange={(e) => setNewOrgAddress(e.target.value)}
                          placeholder="Enter address"
                          className="w-full p-2 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Owner Information */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="font-black text-slate-900 text-xs">Owner Credentials</p>
                  <div>
                    <label className="font-bold text-slate-700">Owner Full Name *</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700">Owner Email Address *</label>
                      <input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@organization.com"
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Mobile Number *</label>
                      <input
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Initial Password *</label>
                    <div className="relative mt-1">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full p-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary py-2.5 px-6 font-bold flex items-center gap-2"
                  >
                    {submitting && <Icon name="refresh-cw" size={14} className="animate-spin" />}
                    <span>{submitting ? 'Onboarding...' : 'Onboard Owner'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HoDashboard;
