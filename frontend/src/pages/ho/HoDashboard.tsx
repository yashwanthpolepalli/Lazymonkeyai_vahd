import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

export interface HoOwnerSummary {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  role?: string;
  role_title?: string | null;
  is_active?: boolean;
  is_primary?: boolean;
}

interface HoOrganization {
  id: string;
  vahd_name: string;
  branch_name: string;
  city: string;
  address: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  is_owner_active: boolean;
  owners?: HoOwnerSummary[];
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
  const navigate = useNavigate();
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

  // Checkbox Selection State
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [collapsedHierarchyOrgIds, setCollapsedHierarchyOrgIds] = useState<string[]>([]);

  // Edit Credentials Modal State
  const [showEditCredsModal, setShowEditCredsModal] = useState(false);
  const [editCredsOrg, setEditCredsOrg] = useState<HoOrganization | null>(null);
  const [editSelectedOwnerId, setEditSelectedOwnerId] = useState<string>('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');
  const [editOwnerPassword, setEditOwnerPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [editBranchName, setEditBranchName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Confirmation Modal State (Organizations)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    orgIds: string[];
    orgNames: string[];
  }>({ open: false, orgIds: [], orgNames: [] });
  const [deleting, setDeleting] = useState(false);

  // Delete Confirmation Modal State (Owners)
  const [deleteOwnerModal, setDeleteOwnerModal] = useState<{
    open: boolean;
    owners: Array<{ id: string; name: string; email: string; orgName: string; isPrimary: boolean }>;
  }>({ open: false, owners: [] });
  const [deletingOwner, setDeletingOwner] = useState(false);

  // Tab State: Dashboard vs Branch Attendance Reports
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
    const handleOrgChanged = (e: any) => {
      const orgId = e?.detail?.id || localStorage.getItem('vahd_selected_org_id') || 'all';
      setSelectedOrgId(orgId);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
  }, []);

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
        payload.vahd_name = newOrgName.trim();
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

  // Toggle selection for all organizations
  const handleToggleSelectAll = () => {
    if (data?.organizations && selectedOrgIds.length === data.organizations.length) {
      setSelectedOrgIds([]);
    } else if (data?.organizations) {
      setSelectedOrgIds(data.organizations.map((o) => o.id));
    }
  };

  // Toggle selection for a single organization
  const handleToggleSelectOrg = (id: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle selection for a single owner
  const handleToggleSelectOwner = (ownerId: string) => {
    setSelectedOwnerIds((prev) =>
      prev.includes(ownerId) ? prev.filter((item) => item !== ownerId) : [...prev, ownerId]
    );
  };

  // Toggle collapse/expand of hierarchy tree per organization
  const toggleOrgHierarchy = (orgId: string) => {
    setCollapsedHierarchyOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    );
  };

  // Open Edit Credentials Modal
  const handleOpenEditCredentials = (orgOrId: HoOrganization | string) => {
    let org: HoOrganization | undefined;
    if (typeof orgOrId === 'string') {
      org = data?.organizations.find((o) => o.id === orgOrId);
    } else {
      org = orgOrId;
    }
    if (!org) return;

    setEditCredsOrg(org);
    const primaryOrFirst = org.owners?.find((o) => o.is_primary) || org.owners?.[0];
    const targetOwnerId = primaryOrFirst?.id || org.owner_id || '';
    setEditSelectedOwnerId(targetOwnerId);
    setEditOwnerName(primaryOrFirst?.name || primaryOrFirst?.full_name || org.owner_name || '');
    setEditOwnerEmail(primaryOrFirst?.email || org.owner_email || '');
    setEditOwnerPhone(primaryOrFirst?.phone || org.owner_phone || '');
    setEditOwnerPassword('');
    setEditShowPassword(false);
    setEditOrgName(org.vahd_name || '');
    setEditBranchName(org.branch_name || '');
    setEditCity(org.city || '');
    setEditAddress(org.address || '');
    setEditError('');
    setShowEditCredsModal(true);
  };

  // Submit Edited Credentials
  const handleEditCredsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCredsOrg) return;
    setEditError('');

    if (!editOwnerName.trim()) {
      setEditError('Owner full name is required');
      return;
    }
    if (!editOwnerEmail.trim() || !editOwnerEmail.includes('@')) {
      setEditError('Valid owner email is required');
      return;
    }

    try {
      setEditSubmitting(true);
      const payload: any = {
        owner_id: editSelectedOwnerId || undefined,
        owner_name: editOwnerName.trim(),
        owner_email: editOwnerEmail.trim().toLowerCase(),
        phone: editOwnerPhone.trim(),
        vahd_name: editOrgName.trim(),
        branch_name: editBranchName.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
      };
      if (editOwnerPassword.trim()) {
        if (editOwnerPassword.trim().length < 6) {
          setEditError('Password must be at least 6 characters');
          setEditSubmitting(false);
          return;
        }
        payload.password = editOwnerPassword.trim();
      }

      await apiClient.put(`/ho/organizations/${editCredsOrg.id}/credentials`, payload);
      setShowEditCredsModal(false);
      await fetchDashboardData();
    } catch (err: any) {
      setEditError(err?.response?.data?.detail || err?.message || 'Failed to update credentials');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Delete Confirmation Modal for Organizations
  const handleOpenDeleteModal = (orgIds: string[]) => {
    if (!orgIds.length) return;
    const names = (data?.organizations || [])
      .filter((o) => orgIds.includes(o.id))
      .map((o) => o.vahd_name || o.branch_name || 'Organization');
    setDeleteConfirmModal({
      open: true,
      orgIds,
      orgNames: names,
    });
  };

  // Confirm and Execute Organization Deletion
  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal.orgIds.length) return;
    try {
      setDeleting(true);
      if (deleteConfirmModal.orgIds.length === 1) {
        await apiClient.delete(`/ho/organizations/${deleteConfirmModal.orgIds[0]}`);
      } else {
        await apiClient.post('/ho/organizations/bulk-delete', {
          organization_ids: deleteConfirmModal.orgIds,
        });
      }
      setSelectedOrgIds((prev) => prev.filter((id) => !deleteConfirmModal.orgIds.includes(id)));
      setDeleteConfirmModal({ open: false, orgIds: [], orgNames: [] });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  // Open Delete Confirmation Modal for Selected Owners (from checkboxes)
  const handleOpenDeleteOwnersModal = () => {
    if (!selectedOwnerIds.length || !data?.organizations) return;
    const targetOwners: Array<{ id: string; name: string; email: string; orgName: string; isPrimary: boolean }> = [];
    data.organizations.forEach((org) => {
      org.owners?.forEach((o) => {
        if (selectedOwnerIds.includes(o.id)) {
          targetOwners.push({
            id: o.id,
            name: o.full_name || o.name || 'Owner',
            email: o.email || '',
            orgName: org.vahd_name || org.branch_name,
            isPrimary: Boolean(o.is_primary),
          });
        }
      });
    });
    if (targetOwners.length) {
      setDeleteOwnerModal({ open: true, owners: targetOwners });
    }
  };

  // Open Delete Confirmation Modal for a Single Specific Owner
  const handleOpenDeleteSingleOwner = (org: HoOrganization, owner: HoOwnerSummary) => {
    setDeleteOwnerModal({
      open: true,
      owners: [{
        id: owner.id,
        name: owner.full_name || owner.name || 'Owner',
        email: owner.email || '',
        orgName: org.vahd_name || org.branch_name,
        isPrimary: Boolean(owner.is_primary),
      }]
    });
  };

  // Confirm and Execute Owner Deletion
  const handleConfirmDeleteOwner = async () => {
    if (!deleteOwnerModal.owners.length) return;
    try {
      setDeletingOwner(true);
      if (deleteOwnerModal.owners.length === 1) {
        await apiClient.delete(`/ho/owners/${deleteOwnerModal.owners[0].id}`);
      } else {
        await apiClient.post('/ho/owners/bulk-delete', {
          owner_ids: deleteOwnerModal.owners.map((o) => o.id),
        });
      }
      const removedIds = deleteOwnerModal.owners.map((o) => o.id);
      setSelectedOwnerIds((prev) => prev.filter((id) => !removedIds.includes(id)));
      setDeleteOwnerModal({ open: false, owners: [] });
      await fetchDashboardData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to delete owner');
    } finally {
      setDeletingOwner(false);
    }
  };

  // Quick edit credentials for a specific owner from tree
  const handleOpenEditOwnerSpecific = (org: HoOrganization, owner: HoOwnerSummary) => {
    setEditCredsOrg(org);
    setEditSelectedOwnerId(owner.id);
    setEditOwnerName(owner.full_name || owner.name || '');
    setEditOwnerEmail(owner.email || '');
    setEditOwnerPhone(owner.phone || '');
    setEditOwnerPassword('');
    setEditShowPassword(false);
    setEditOrgName(org.vahd_name || '');
    setEditBranchName(org.branch_name || '');
    setEditCity(org.city || '');
    setEditAddress(org.address || '');
    setEditError('');
    setShowEditCredsModal(true);
  };

  const selectedOrgName = useMemo(() => {
    if (selectedOrgId === 'all') return 'All Organizations (Global HQ)';
    const found = data?.organizations.find((o) => o.id === selectedOrgId);
    return found ? `${found.vahd_name} - ${found.branch_name}` : 'Selected Organization';
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
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {user?.name || 'Head Office'} • Organization Portal
          </h1>
        </div>

        {/* Header Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${hoTab === 'overview'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
        >
          <Icon name="layout-dashboard" size={15} />
          <span>Dashboard &amp; Directory</span>
        </button>

        <button
          onClick={() => navigate('/ho/organisations')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 hover:border-amber-300 shadow-2xs"
          title="View Live Cross-Organization Attendance &amp; Leave Matrix"
        >
          <Icon name="table" size={15} className="text-amber-600" />
          <span>Organisations Matrix</span>
        </button>

        <button
          onClick={() => setHoTab('attendance_reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${hoTab === 'attendance_reports'
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
            <div
              onClick={() => navigate('/ho/organisations')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
              title="Click to view full Organisations Attendance Matrix"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-purple-600 transition-colors">Organizations</span>
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-all">
                  <Icon name="building-2" size={18} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">
                  {data?.is_filtered ? '1 Selected' : data?.total_organizations ?? 0}
                </div>
                <p className="text-[11px] font-semibold text-slate-500 group-hover:text-purple-600 transition-colors flex items-center gap-1">
                  <span>{data?.is_filtered ? data.selected_organization_name : 'Active branches under Head Office'}</span>
                  <Icon name="arrow-up-right" size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
              {(selectedOrgIds.length > 0 || selectedOwnerIds.length > 0) ? (
                <div className="flex flex-wrap items-center gap-2 bg-purple-50 border border-purple-200/80 rounded-2xl p-1.5 px-3 animate-in fade-in">
                  {/* Selected Owners Action Bar */}
                  {selectedOwnerIds.length > 0 && (
                    <div className="flex items-center gap-2 pr-2 border-r border-purple-200/80">
                      <span className="text-xs font-black text-rose-900 flex items-center gap-1.5 bg-rose-100/90 border border-rose-200 px-2.5 py-1 rounded-xl">
                        <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                          {selectedOwnerIds.length}
                        </span>
                        <span>{selectedOwnerIds.length === 1 ? 'Owner' : 'Owners'} Selected</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleOpenDeleteOwnersModal}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        title="Delete selected owner accounts without deleting the organisation"
                      >
                        <Icon name="trash-2" size={13} />
                        <span>Delete {selectedOwnerIds.length === 1 ? 'Owner' : `(${selectedOwnerIds.length}) Owners`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOwnerIds([])}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 cursor-pointer"
                      >
                        Clear Owners
                      </button>
                    </div>
                  )}

                  {/* Selected Organisations Action Bar */}
                  {selectedOrgIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black">
                          {selectedOrgIds.length}
                        </span>
                        <span>{selectedOrgIds.length === 1 ? 'Org' : 'Orgs'} Selected</span>
                      </span>

                      {selectedOrgIds.length === 1 && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditCredentials(selectedOrgIds[0])}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Icon name="key" size={13} />
                          <span>Edit Credentials</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(selectedOrgIds)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Icon name="trash-2" size={13} />
                        <span>Delete {selectedOrgIds.length === 1 ? 'Organisation' : `(${selectedOrgIds.length}) Organisations`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrgIds([])}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 cursor-pointer"
                      >
                        Clear Orgs
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium hidden sm:block">
                  Select checkboxes on organisations or individual owners to edit or delete
                </div>
              )}
            </div>

            {/* Directory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="w-10 py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          data?.organizations &&
                          data.organizations.length > 0 &&
                          selectedOrgIds.length === data.organizations.length
                        )}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        title="Select All"
                      />
                    </th>
                    <th className="py-3.5 px-4">Organization &amp; Branch</th>
                    <th className="py-3.5 px-4">Onboarded Owner</th>
                    <th className="py-3.5 px-4">City / Location</th>
                    <th className="py-3.5 px-4 text-center">Employees</th>
                    <th className="py-3.5 px-4 text-center">Students</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data?.organizations && data.organizations.length > 0 ? (
                    data.organizations.map((org) => {
                      const isCurrentSelected = selectedOrgId === org.id;
                      const isChecked = selectedOrgIds.includes(org.id);
                      return (
                        <tr
                          key={org.id}
                          className={`hover:bg-slate-50/80 transition-colors ${isChecked
                              ? 'bg-purple-50/60'
                              : isCurrentSelected
                                ? 'bg-purple-50/30 font-semibold'
                                : ''
                            }`}
                        >
                          {/* Checkbox */}
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectOrg(org.id)}
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>

                          {/* Organization & Branch */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                <Icon name="building-2" size={16} />
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm">{org.vahd_name}</p>
                                <span className="text-[11px] text-slate-400 font-medium">{org.branch_name}</span>
                              </div>
                            </div>
                          </td>

                          {/* Onboarded Owner Column: Hierarchy Tree & Dropdown */}
                          <td className="py-4 px-4 align-top">
                            {org.owners && org.owners.length > 0 ? (
                              (() => {
                                const isCollapsed = collapsedHierarchyOrgIds.includes(org.id);
                                return (
                                  <div className="space-y-2 max-w-sm">
                                    {/* Hierarchy Header & Dropdown Toggle */}
                                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-black">
                                          <Icon name="git-branch" size={11} />
                                        </span>
                                        <span className="text-[11px] font-extrabold text-slate-800 tracking-tight">
                                          User Hierarchy
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                                          {org.owners.length} {org.owners.length > 1 ? 'Owners' : 'Owner'}
                                        </span>
                                      </div>

                                      {org.owners.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOrgHierarchy(org.id);
                                          }}
                                          className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md hover:bg-purple-50 transition-colors cursor-pointer"
                                        >
                                          <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
                                          <Icon name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={11} />
                                        </button>
                                      )}
                                    </div>

                                    {/* Tree Nodes */}
                                    {!isCollapsed ? (
                                      <div className="relative pl-3 space-y-2 border-l-2 border-purple-200/90 ml-2 mt-1">
                                        {org.owners.map((owner, idx) => {
                                          const isOwnerChecked = selectedOwnerIds.includes(owner.id);
                                          const isPrimary = Boolean(owner.is_primary);

                                          return (
                                            <div key={owner.id || idx} className="relative group">
                                              {/* Horizontal branch connector line */}
                                              <div className="absolute -left-3 top-3.5 w-3 h-0.5 bg-purple-200/90" />

                                              <div
                                                className={`p-2.5 rounded-xl border transition-all ${
                                                  isOwnerChecked
                                                    ? 'bg-purple-50/95 border-purple-300 shadow-xs ring-1 ring-purple-400'
                                                    : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200/80 hover:border-slate-300'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex items-start gap-2 min-w-0">
                                                    {/* Particular Owner Checkbox */}
                                                    <input
                                                      type="checkbox"
                                                      checked={isOwnerChecked}
                                                      onChange={() => handleToggleSelectOwner(owner.id)}
                                                      onClick={(e) => e.stopPropagation()}
                                                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-0.5 shrink-0"
                                                      title={`Select ${owner.full_name || owner.name} to delete or manage`}
                                                    />

                                                    {/* Avatar Icon */}
                                                    <div
                                                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                                        isPrimary
                                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                                                      }`}
                                                    >
                                                      {isPrimary ? '👑' : <Icon name="user" size={13} />}
                                                    </div>

                                                    {/* Owner Details */}
                                                    <div className="min-w-0 space-y-0.5">
                                                      <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-extrabold text-slate-900 text-xs truncate">
                                                          {owner.full_name || owner.name}
                                                        </span>
                                                        {owner.role_title && (
                                                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                                            {owner.role_title}
                                                          </span>
                                                        )}
                                                        <span
                                                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                                            isPrimary
                                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                          }`}
                                                        >
                                                          {isPrimary ? 'Primary Owner' : 'Co-Owner'}
                                                        </span>
                                                      </div>

                                                      <p className="text-[11px] text-slate-500 font-medium truncate">
                                                        {owner.email}
                                                      </p>

                                                      {owner.phone && (
                                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                          <span>📞</span>
                                                          <span>{owner.phone}</span>
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {/* Quick Individual Owner Action Buttons */}
                                                  <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditOwnerSpecific(org, owner);
                                                      }}
                                                      className="p-1 rounded-md bg-white hover:bg-purple-50 text-slate-500 hover:text-purple-700 border border-slate-200 hover:border-purple-200 transition-colors shadow-2xs cursor-pointer"
                                                      title={`Edit credentials for ${owner.full_name || owner.name}`}
                                                    >
                                                      <Icon name="key" size={11} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDeleteSingleOwner(org, owner);
                                                      }}
                                                      className="p-1 rounded-md bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors shadow-2xs cursor-pointer"
                                                      title={`Delete owner ${owner.full_name || owner.name}`}
                                                    >
                                                      <Icon name="trash-2" size={11} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      /* Collapsed Summary Pill */
                                      <div
                                        onClick={() => toggleOrgHierarchy(org.id)}
                                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-800">
                                            {org.owner_name || (org.owners[0]?.full_name || org.owners[0]?.name)}
                                          </span>
                                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-100">
                                            +{org.owners.length - 1} co-owners
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                                          <span>View Tree</span>
                                          <Icon name="chevron-down" size={11} />
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : org.owner_name ? (
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

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSelectOrganization(org.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isCurrentSelected
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                              >
                                {isCurrentSelected ? 'Viewing' : 'Switch View'}
                              </button>
                              <button
                                onClick={() => handleOpenEditCredentials(org)}
                                className="p-1.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                                title="Edit Owner Credentials"
                              >
                                <Icon name="key" size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal([org.id])}
                                className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Delete Organisation"
                              >
                                <Icon name="trash-2" size={14} />
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
                      <h3 className="text-lg font-black text-slate-900">{b.vahd_name || b.branch_name}</h3>
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
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'employees'
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
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentTab === 'students'
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
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${emp.attendance_percentage >= 75
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
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${s.attendance_percentage >= 75
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
                <h3 className="text-xl font-black text-slate-900 mt-1">Onboard vahd Owner</h3>
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
                      <strong className="text-slate-900">{onboardSuccess.organization?.vahd_name}</strong>
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
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${!isCreatingNewOrg
                          ? 'border-purple-600 bg-purple-50/50 text-purple-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      Existing Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewOrg(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${isCreatingNewOrg
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
                          {org.vahd_name} ({org.branch_name}) • {org.city || 'Campus'}
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

      {/* ── EDIT CREDENTIALS MODAL ────────────────────────────────────────── */}
      {showEditCredsModal && editCredsOrg && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                  Credentials Manager
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Edit Owner Credentials</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Update login details and organization settings for {editCredsOrg.vahd_name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCredsModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-circle" size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditCredsSubmit} className="space-y-4 text-xs">
              {/* Organization Profile Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <p className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <Icon name="building-2" size={13} className="text-purple-600" />
                  <span>Organization &amp; Branch Information</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Organization Name *</label>
                    <input
                      type="text"
                      value={editOrgName}
                      onChange={(e) => setEditOrgName(e.target.value)}
                      placeholder="Organization Name"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 font-semibold text-slate-900 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Branch Name</label>
                    <input
                      type="text"
                      value={editBranchName}
                      onChange={(e) => setEditBranchName(e.target.value)}
                      placeholder="Branch / Campus"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 font-semibold text-slate-900 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">City / Location</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="City"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full p-2.5 rounded-xl bg-white border border-slate-200 font-medium text-slate-900 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Credentials */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Icon name="key" size={13} className="text-purple-600" />
                    <span>Owner Login &amp; Contact Credentials</span>
                  </p>
                  {editCredsOrg.owners && editCredsOrg.owners.length > 1 && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {editCredsOrg.owners.length} Owners in Organisation
                    </span>
                  )}
                </div>

                {editCredsOrg.owners && editCredsOrg.owners.length > 1 && (
                  <div>
                    <label className="font-bold text-slate-700">Select Owner to Edit *</label>
                    <select
                      value={editSelectedOwnerId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        setEditSelectedOwnerId(targetId);
                        const chosen = editCredsOrg?.owners?.find((o) => o.id === targetId);
                        if (chosen) {
                          setEditOwnerName(chosen.full_name || chosen.name || '');
                          setEditOwnerEmail(chosen.email || '');
                          setEditOwnerPhone(chosen.phone || '');
                        }
                      }}
                      className="w-full p-2.5 rounded-xl bg-purple-50/60 border border-purple-200 font-semibold text-slate-900 mt-1 cursor-pointer focus:ring-2 focus:ring-purple-500"
                    >
                      {editCredsOrg.owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name || o.name} ({o.email}) {o.is_primary ? '— Primary Owner' : '— Co-Owner'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700">Owner Full Name *</label>
                  <input
                    type="text"
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    placeholder="Owner Full Name"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Owner Email (Login ID) *</label>
                    <input
                      type="email"
                      value={editOwnerEmail}
                      onChange={(e) => setEditOwnerEmail(e.target.value)}
                      placeholder="owner@domain.com"
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Mobile Phone Number</label>
                    <input
                      type="tel"
                      value={editOwnerPhone}
                      onChange={(e) => setEditOwnerPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Reset Password (Optional)</label>
                    <span className="text-[10px] text-slate-400">Leave blank to keep current password</span>
                  </div>
                  <div className="relative mt-1">
                    <input
                      type={editShowPassword ? 'text' : 'password'}
                      value={editOwnerPassword}
                      onChange={(e) => setEditOwnerPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full p-2.5 pr-14 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPassword(!editShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[11px]"
                    >
                      {editShowPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditCredsModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-primary py-2.5 px-6 font-bold flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {editSubmitting && <Icon name="refresh-cw" size={14} className="animate-spin" />}
                  <span>{editSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Icon name="alert-triangle" size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Delete {deleteConfirmModal.orgIds.length === 1 ? 'Organisation' : `${deleteConfirmModal.orgIds.length} Organisations`}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This action is permanent and cannot be undone. All linked branches, active employees, enrolled students, biometric punch logs, and attendance history will be completely erased.
              </p>
            </div>

            {deleteConfirmModal.orgNames.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 max-h-36 overflow-y-auto space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Organisation(s):
                </p>
                {deleteConfirmModal.orgNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Icon name="building-2" size={13} className="text-rose-500 shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ open: false, orgIds: [], orgNames: [] })}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                {deleting && <Icon name="refresh-cw" size={14} className="animate-spin" />}
                <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE OWNER CONFIRMATION MODAL ─────────────────────────────────── */}
      {deleteOwnerModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Icon name="user-x" size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">
                Delete {deleteOwnerModal.owners.length === 1 ? 'Owner Account' : `${deleteOwnerModal.owners.length} Owner Accounts`}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will delete the selected owner account(s) and remove their credentials. The organization, campuses, employees, and other owners will remain completely safe.
              </p>
            </div>

            {deleteOwnerModal.owners.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 max-h-48 overflow-y-auto space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Owner(s) to Delete:
                </p>
                {deleteOwnerModal.owners.map((owner, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 text-xs truncate">
                          {owner.name}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          owner.isPrimary ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {owner.isPrimary ? 'Primary' : 'Co-Owner'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{owner.email}</p>
                      <p className="text-[10px] text-purple-600 font-semibold truncate">🏢 {owner.orgName}</p>
                    </div>
                    <span className="text-rose-500 shrink-0">
                      <Icon name="trash-2" size={14} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOwnerModal({ open: false, owners: [] })}
                disabled={deletingOwner}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOwner}
                disabled={deletingOwner}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                {deletingOwner && <Icon name="refresh-cw" size={14} className="animate-spin" />}
                <span>{deletingOwner ? 'Deleting...' : 'Confirm Delete Owner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoDashboard;
