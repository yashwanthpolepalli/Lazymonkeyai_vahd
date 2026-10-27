import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { notifyModuleVisibilityChanged } from '@/config/navigation';
import { hrmsApi } from '@/services/hrmsApi';
import { cn } from '@/utils/cn';

export interface OwnerRecord {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  role: string;
  role_title?: string;
  designation?: string;
  organization_id?: string;
  organization_name?: string;
  permissions?: Record<string, any>;
  created_at?: string;
}

export interface BranchOption {
  id: string;
  branch_name: string;
  branch_code?: string;
}

export type ActionType = 'view' | 'add' | 'edit' | 'delete' | 'import';

export interface MatrixRow {
  key: string;
  label: string;
  actions: ActionType[];
}

export interface MatrixGroup {
  id: string;
  title: string;
  rows: MatrixRow[];
}

export const PERMISSION_MATRIX_CONFIG: MatrixGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    rows: [
      { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
      { key: 'dashboard_analytics', label: 'Financial & Ops KPIs', actions: ['view'] },
      { key: 'dashboard_attendance_stream', label: 'Live Attendance Stream', actions: ['view'] },
    ],
  },
  {
    id: 'hrms',
    title: 'HRMS',
    rows: [
      { key: 'hrms_section', label: 'HRMS section (nav)', actions: ['view'] },
      { key: 'hrms_overview', label: 'HRMS Overview', actions: ['view'] },
      { key: 'employee_details', label: 'Employee details', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'attendance', label: 'Attendance', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'attendance_approve', label: 'Attendance Approve', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'absent_employees', label: 'Absent Employees', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'attendance_report', label: 'Attendance report', actions: ['view'] },
      { key: 'leave_management', label: 'Leave management', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'payroll', label: 'Payroll & Salary Slips', actions: ['view', 'add', 'edit'] },
    ],
  },
  {
    id: 'students',
    title: 'Students & Enrollment',
    rows: [
      { key: 'students_section', label: 'Students section (nav)', actions: ['view'] },
      { key: 'student_details', label: 'Student details & list', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'student_enrollment', label: 'Student Enrollment', actions: ['view', 'add'] },
      { key: 'student_attendance', label: 'Student Attendance', actions: ['view', 'add', 'edit'] },
    ],
  },
  {
    id: 'pos',
    title: 'POS & Billing / Inventory',
    rows: [
      { key: 'pos_billing', label: 'POS Billing Terminal', actions: ['view', 'add'] },
      { key: 'invoices', label: 'Invoices & Receipts', actions: ['view', 'add', 'delete'] },
      { key: 'inventory', label: 'Inventory & Stock', actions: ['view', 'add', 'edit', 'delete', 'import'] },
      { key: 'procurement', label: 'Procurement & Indents', actions: ['view', 'add', 'edit'] },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Fee Collection',
    rows: [
      { key: 'payments_section', label: 'Payments section (nav)', actions: ['view'] },
      { key: 'fee_collection', label: 'Fee Collection', actions: ['view', 'add'] },
      { key: 'transactions', label: 'Transaction History', actions: ['view'] },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    rows: [
      { key: 'reports_section', label: 'Reports section (nav)', actions: ['view'] },
      { key: 'reports_attendance', label: 'Attendance & Operational Reports', actions: ['view', 'import'] },
      { key: 'reports_financial', label: 'Financial Reports & Exports', actions: ['view', 'import'] },
      { key: 'audit_logs', label: 'Audit Logs & Security', actions: ['view'] },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Masters',
    rows: [
      { key: 'settings_section', label: 'Settings section (nav)', actions: ['view'] },
      { key: 'branch_profile', label: 'Branch Profile', actions: ['view', 'edit'] },
      { key: 'courses', label: 'Courses & Academic Plans', actions: ['view', 'add', 'edit', 'delete'] },
      { key: 'master_data', label: 'Master Data (Districts, Mandals, Roles)', actions: ['view', 'add', 'edit', 'delete', 'import'] },
    ],
  },
];

// Calculate total available action permissions
export const TOTAL_AVAILABLE_PERMISSIONS = PERMISSION_MATRIX_CONFIG.reduce(
  (total, group) => total + group.rows.reduce((sub, r) => sub + r.actions.length, 0),
  0
);

// Returns full access dictionary where every permission action is enabled
export function getAllDefaultPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  PERMISSION_MATRIX_CONFIG.forEach((g) => {
    g.rows.forEach((r) => {
      r.actions.forEach((act) => {
        perms[`${r.key}.${act}`] = true;
        if (act === 'view') {
          perms[r.key] = true;
        }
      });
    });
  });
  return perms;
}

// Checks if explicit custom permissions have been saved for a record
export function hasCustomPermissions(perms?: Record<string, any>): boolean {
  if (!perms || typeof perms !== 'object') return false;
  const keys = Object.keys(perms).filter((k) => k !== '_designation');
  return keys.length > 0;
}

interface Props {
  onBack?: () => void;
}

export function OwnerPermissionsTab({ onBack }: Props) {
  const { user, updateUser } = useAuth();
  const [owners, setOwners] = useState<OwnerRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>(() => {
    return localStorage.getItem('vahd_selected_org_id') || 'all';
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingOwner, setEditingOwner] = useState<OwnerRecord | null>(null);

  // Form State
  const [formDesignation, setFormDesignation] = useState('');
  const [formRoleName, setFormRoleName] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formOrgId, setFormOrgId] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with global topbar organization changes
  useEffect(() => {
    const handleOrgChanged = (e: any) => {
      const orgId = e.detail?.id || localStorage.getItem('vahd_selected_org_id') || 'all';
      setSelectedOrgFilter(orgId);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    window.addEventListener('storage', handleOrgChanged);
    return () => {
      window.removeEventListener('vahd:org_changed', handleOrgChanged);
      window.removeEventListener('storage', handleOrgChanged);
    };
  }, []);

  // Fetch real owners, organizations, and designations from backend API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Clear legacy mock seed cache
      try {
        localStorage.removeItem('vahd_roles_data_v1');
      } catch { }

      const [ownersRes, branchesRes, desgsRes] = await Promise.all([
        apiClient.get<any>('/ho/owner-permissions').catch(() => null),
        apiClient.get<any>('/ho/organizations').catch(() => null),
        hrmsApi.getDesignations().catch(() => []),
      ]);

      // Extract organizations safely (handles both raw array or object with organizations/data)
      const rawBranches =
        branchesRes?.organizations ||
        branchesRes?.data?.organizations ||
        (Array.isArray(branchesRes) ? branchesRes : (Array.isArray(branchesRes?.data) ? branchesRes.data : []));

      if (Array.isArray(rawBranches) && rawBranches.length > 0) {
        const mappedBranches: BranchOption[] = rawBranches.map((b: any) => ({
          id: b.id,
          branch_name: b.branch_name || b.name || b.vahd_name || 'Branch',
          branch_code: b.branch_code || '',
        }));
        setBranches(mappedBranches);
      }

      if (Array.isArray(desgsRes) && desgsRes.length > 0) {
        const dynamicDesgs = desgsRes
          .map((d: any) => (d.name || d.designation_name || '').trim())
          .filter(Boolean);
        setAvailableDesignations(Array.from(new Set(dynamicDesgs)));
      } else {
        setAvailableDesignations([]);
      }

      // Extract owners safely (handles both raw array or object with owners/data)
      const rawList =
        ownersRes?.owners ||
        ownersRes?.data?.owners ||
        (Array.isArray(ownersRes) ? ownersRes : (Array.isArray(ownersRes?.data) ? ownersRes.data : []));

      if (Array.isArray(rawList)) {
        const normalized: OwnerRecord[] = rawList.map((o: any) => {
          const rawPerms = o.permissions || {};
          const isConfigured = hasCustomPermissions(rawPerms);
          const effectivePerms = isConfigured
            ? rawPerms
            : { ...getAllDefaultPermissions(), ...(rawPerms._designation ? { _designation: rawPerms._designation } : {}) };

          return {
            id: o.owner_id || o.id,
            email: o.owner_email || o.email || '',
            full_name: o.owner_name || o.full_name || '',
            phone: o.owner_phone || o.phone || '',
            is_active: o.is_active !== false,
            role: o.role || 'OWNER',
            role_title: o.role_title || '',
            designation: o.designation || rawPerms._designation || '',
            organization_id: o.organization_id || '',
            organization_name: o.organization_name || o.branch_name || '',
            permissions: effectivePerms,
            created_at: o.created_at,
          };
        });

        setOwners(normalized);
      } else {
        setOwners([]);
      }
    } catch (err) {
      console.error('Failed to load roles from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Records by selected organization, designation, role name, officer name, email
  const filteredOwners = useMemo(() => {
    let list = owners;

    // Filter by organization if specified (and not 'all')
    if (selectedOrgFilter && selectedOrgFilter !== 'all') {
      list = list.filter((o) => {
        if (o.organization_id === selectedOrgFilter) return true;
        const matchedBranch = branches.find((b) => b.id === selectedOrgFilter);
        if (
          matchedBranch &&
          (o.organization_name?.toLowerCase() === matchedBranch.branch_name.toLowerCase() ||
           o.organization_name?.toLowerCase().includes(matchedBranch.branch_name.toLowerCase()))
        ) {
          return true;
        }
        return false;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.designation?.toLowerCase().includes(q) ||
        o.role_title?.toLowerCase().includes(q) ||
        o.full_name?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q) ||
        o.organization_name?.toLowerCase().includes(q)
    );
  }, [owners, searchQuery, selectedOrgFilter, branches]);

  // Open Modal for Create
  const handleOpenAdd = () => {
    setModalMode('create');
    setEditingOwner(null);
    setFormDesignation(availableDesignations[0] || '');
    setFormRoleName('');
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');

    // Pre-select organisation matching active filter if one is chosen
    const defaultOrg = (selectedOrgFilter && selectedOrgFilter !== 'all')
      ? selectedOrgFilter
      : (branches.length > 0 ? branches[0].id : '');
    setFormOrgId(defaultOrg);
    setFormActive(true);

    // Default: give ALL permissions enabled
    setPermissionsMatrix(getAllDefaultPermissions());
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (owner: OwnerRecord) => {
    setModalMode('edit');
    setEditingOwner(owner);
    setFormDesignation(owner.designation || '');
    setFormRoleName(owner.role_title || '');
    setFormFullName(owner.full_name || '');
    setFormEmail(owner.email || '');
    setFormPhone(owner.phone || '');
    setFormPassword('');
    setFormOrgId(owner.organization_id || (branches[0]?.id || ''));
    setFormActive(owner.is_active);

    const perms = hasCustomPermissions(owner.permissions)
      ? (owner.permissions as Record<string, boolean>)
      : getAllDefaultPermissions();
    setPermissionsMatrix({ ...perms });
    setIsModalOpen(true);
  };

  // Open Modal for View
  const handleOpenView = (owner: OwnerRecord) => {
    setModalMode('view');
    setEditingOwner(owner);
    setFormDesignation(owner.designation || '');
    setFormRoleName(owner.role_title || '');
    setFormFullName(owner.full_name || '');
    setFormEmail(owner.email || '');
    setFormPhone(owner.phone || '');
    setFormPassword('');
    setFormOrgId(owner.organization_id || '');
    setFormActive(owner.is_active);

    const perms = hasCustomPermissions(owner.permissions)
      ? (owner.permissions as Record<string, boolean>)
      : getAllDefaultPermissions();
    setPermissionsMatrix({ ...perms });
    setIsModalOpen(true);
  };

  // Toggle single permission checkbox
  const handleTogglePermission = (rowKey: string, action: ActionType) => {
    if (modalMode === 'view') return;
    const permKey = `${rowKey}.${action}`;
    const nextVal = !permissionsMatrix[permKey];

    setPermissionsMatrix((prev) => {
      const updated = { ...prev, [permKey]: nextVal };
      // Also sync top-level module view flags for compatibility
      if (action === 'view') {
        updated[rowKey] = nextVal;
        if (rowKey === 'hrms_section') updated['hrms.view'] = nextVal;
        if (rowKey === 'students_section') updated['students.view'] = nextVal;
        if (rowKey === 'pos_billing') updated['pos.view'] = nextVal;
        if (rowKey === 'payments_section') updated['payments.view'] = nextVal;
        if (rowKey === 'reports_section') updated['reports.view'] = nextVal;
        if (rowKey === 'settings_section') updated['settings.view'] = nextVal;
      }
      return updated;
    });
  };

  // Count active modules for a record
  const getActiveModuleCount = (perms: Record<string, any> = {}) => {
    if (!hasCustomPermissions(perms)) {
      return TOTAL_AVAILABLE_PERMISSIONS;
    }
    let count = 0;
    PERMISSION_MATRIX_CONFIG.forEach((g) => {
      g.rows.forEach((r) => {
        r.actions.forEach((act) => {
          if (perms[`${r.key}.${act}`]) count++;
        });
      });
    });
    return count;
  };

  // Select all table rows
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOwners.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Delete single permission
  const handleDeleteRole = async (owner: OwnerRecord) => {
    if (!window.confirm(`Are you sure you want to delete permission '${owner.role_title}'?`)) return;
    try {
      await apiClient.delete(`/ho/owner-permissions/${owner.id}`);
      showToast(`Permission '${owner.role_title}' deleted`);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete permission');
    }
  };

  // Delete All / Delete Selected
  const handleDeleteAll = async () => {
    if (selectedIds.length > 0) {
      if (!window.confirm(`Delete ${selectedIds.length} selected permission(s)?`)) return;
      try {
        await Promise.all(selectedIds.map((id) => apiClient.delete(`/ho/owner-permissions/${id}`).catch(() => {})));
        setSelectedIds([]);
        showToast('Selected permissions deleted');
        await fetchData();
      } catch {
        await fetchData();
      }
    } else {
      if (!window.confirm('Are you sure you want to delete all permissions?')) return;
      try {
        await Promise.all(owners.map((o) => apiClient.delete(`/ho/owner-permissions/${o.id}`).catch(() => {})));
        setSelectedIds([]);
        showToast('All permissions deleted');
        await fetchData();
      } catch {
        await fetchData();
      }
    }
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') {
      setIsModalOpen(false);
      return;
    }

    if (!formRoleName.trim()) {
      alert('Role Name is required');
      return;
    }

    setSaving(true);
    const finalPermissions = {
      ...permissionsMatrix,
      _designation: formDesignation,
    };

    try {
      if (modalMode === 'edit' && editingOwner) {
        // Persist updates to backend API
        await apiClient.put(`/ho/owner-permissions/${editingOwner.id}`, {
          owner_name: formFullName.trim() || editingOwner.full_name,
          role_title: formRoleName.trim(),
          designation: formDesignation,
          phone: formPhone.trim(),
          is_active: formActive,
          permissions: finalPermissions,
          password: formPassword.trim() || undefined,
          organization_id: formOrgId || undefined,
        });

        // If currently logged-in user is this owner, immediately update session & topbar
        if (user && (user.id === editingOwner.id || user.email === editingOwner.email)) {
          updateUser({ permissions: finalPermissions });
        }
        notifyModuleVisibilityChanged();

        showToast(`Permission '${formRoleName}' updated successfully`);
        await fetchData();
      } else {
        if (!formEmail.trim() || !formEmail.includes('@')) {
          alert('A valid Login Email is required to create an owner permission profile.');
          setSaving(false);
          return;
        }

        // Persist new owner / role to backend API
        await apiClient.post('/ho/owner-permissions', {
          owner_name: formFullName.trim() || `${formRoleName.trim()} Officer`,
          owner_email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          password: formPassword.trim() || 'Admin@123',
          role_title: formRoleName.trim(),
          designation: formDesignation,
          organization_id: formOrgId || undefined,
          is_active: formActive,
          permissions: finalPermissions,
        });

        showToast(`Permission '${formRoleName}' created successfully`);
        await fetchData();
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save permission:', err);
      alert(err?.response?.data?.detail || err?.message || 'Failed to save permission');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-800">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-slide-down">
          <Icon name="check-circle" size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Bar - Exactly as Image 1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : null)}>
              Home
            </span>
            <Icon name="chevron-right" size={12} />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : null)}>
              Settings
            </span>
            <Icon name="chevron-right" size={12} />
            <span className="text-slate-800 dark:text-slate-200 font-bold">Permissions</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Permissions</h2>
          <p className="text-xs text-slate-500 font-medium">Settings · {owners.length} records</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Back button */}
          <button
            type="button"
            onClick={() => (onBack ? onBack() : null)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back</span>
          </button>

          {/* Delete All button */}
          <button
            type="button"
            onClick={handleDeleteAll}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Icon name="trash-2" size={13} />
            <span>{selectedIds.length > 0 ? `Delete (${selectedIds.length})` : 'Delete All'}</span>
          </button>

          {/* + Add Permission button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Icon name="plus" size={14} />
            <span>+ Add Permission</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permissions..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Organisation / Branch Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedOrgFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedOrgFilter(val);
                localStorage.setItem('vahd_selected_org_id', val);
                window.dispatchEvent(new CustomEvent('vahd:org_changed', { detail: { id: val } }));
              }}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">🏢 All Organisations</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.branch_name} {b.branch_code ? `(${b.branch_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
          <span>{filteredOwners.length} records</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filteredOwners.length > 0 && selectedIds.length === filteredOwners.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Select All</span>
          </label>
        </div>
      </div>

      {/* Permissions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="w-10 py-3.5 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={filteredOwners.length > 0 && selectedIds.length === filteredOwners.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="w-12 py-3.5 px-3">S.NO</th>
                <th className="py-3.5 px-4">ORGANISATION</th>
                <th className="py-3.5 px-4">OWNER / OFFICER</th>
                <th className="py-3.5 px-4">DESIGNATION</th>
                <th className="py-3.5 px-4">ROLE / PERMISSION</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">ACCESS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredOwners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Icon name="loader" size={24} className="animate-spin text-blue-600" />
                        <p className="text-xs font-semibold text-slate-500">Loading organizations and permissions...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Icon name="shield-alert" size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {searchQuery
                            ? 'No permissions found matching your search.'
                            : selectedOrgFilter !== 'all'
                            ? 'No owner permissions assigned to this organization yet.'
                            : 'No organization permissions created yet.'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedOrgFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrgFilter('all');
                                localStorage.setItem('vahd_selected_org_id', 'all');
                                window.dispatchEvent(new CustomEvent('vahd:org_changed', { detail: { id: 'all' } }));
                              }}
                              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              View All Organisations
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                          >
                            + Add Permission
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOwners.map((owner, idx) => {
                  const isChecked = selectedIds.includes(owner.id);
                  const activeModules = getActiveModuleCount(owner.permissions);

                  return (
                    <tr
                      key={owner.id}
                      className={cn(
                        'hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors',
                        isChecked && 'bg-blue-50/30'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, owner.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== owner.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* S.No */}
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px] font-medium">
                        {idx + 1}
                      </td>

                      {/* Organisation */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Icon name="building-2" size={13} className="text-blue-500 shrink-0" />
                          <span>{owner.organization_name || 'Central Head Office'}</span>
                        </div>
                      </td>

                      {/* Owner / Officer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{owner.full_name || '—'}</div>
                        {owner.email && <div className="text-[11px] text-slate-400 font-normal">{owner.email}</div>}
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {owner.designation || '—'}
                      </td>

                      {/* Role Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {owner.role_title || 'Owner'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            owner.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                          )}
                        >
                          {owner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Access Modules Count */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenView(owner)}
                          className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          {activeModules} modules
                        </button>
                      </td>

                      {/* Actions Buttons: View (blue), Edit (green), Delete (red) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(owner)}
                            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Icon name="eye" size={12} />
                            <span>View</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(owner)}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Icon name="edit" size={12} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(owner)}
                            className="p-1 rounded-md border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all cursor-pointer"
                            title="Delete permission"
                          >
                            <Icon name="x" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL: Add / Edit Role & Granular Module Matrix - As in Image 2  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl my-auto overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="space-y-0.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {modalMode === 'create'
                    ? 'Add Permission'
                    : modalMode === 'edit'
                    ? 'Edit Permission'
                    : 'View Permissions'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Set module access: View, Add, Edit, Delete, and Import (for masters that support bulk upload).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Top Form Fields: ORGANISATION, DESIGNATION, and ROLE NAME */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      ORGANISATION / BRANCH <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled={modalMode === 'view'}
                      value={formOrgId}
                      onChange={(e) => setFormOrgId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Central Head Office / All Branches</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name} {b.branch_code ? `(${b.branch_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      DESIGNATION <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="available-designations"
                      disabled={modalMode === 'view'}
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                      placeholder={availableDesignations.length > 0 ? "Select or enter designation..." : "Enter designation..."}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {availableDesignations.length > 0 && (
                      <datalist id="available-designations">
                        {availableDesignations.map((des) => (
                          <option key={des} value={des} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                      ROLE / PERMISSION NAME <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={formRoleName}
                      onChange={(e) => setFormRoleName(e.target.value)}
                      placeholder="Enter role / permission name (e.g. Branch Owner, Manager)..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Owner Account & Login Credentials Section */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="user-check" size={15} className="text-blue-600" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Owner Account & Login Credentials
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer flex items-center gap-1.5 select-none">
                        <input
                          type="checkbox"
                          disabled={modalMode === 'view'}
                          checked={formActive}
                          onChange={(e) => setFormActive(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                        <span>Active Status</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 text-xs block mb-1">
                        Full Name / Officer Name
                      </label>
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="e.g. Officer Name"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 text-xs block mb-1">
                        Login Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        disabled={modalMode === 'view'}
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="owner@organization.gov.in"
                        required={modalMode === 'create'}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 text-xs block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        disabled={modalMode === 'view'}
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    {modalMode !== 'view' && (
                      <div>
                        <label className="font-bold text-slate-600 dark:text-slate-400 text-xs block mb-1">
                          Password {modalMode === 'create' ? '(Default: Admin@123)' : '(Leave blank to keep)'}
                        </label>
                        <input
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Granular Module Access Matrix Table with Quick Full Access / Clear All */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Icon name="shield-check" size={15} className="text-emerald-600" />
                    <span>Module Permissions Matrix</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {Object.entries(permissionsMatrix).filter(([k, v]) => k !== '_designation' && v).length} / {TOTAL_AVAILABLE_PERMISSIONS} Actions Enabled
                    </span>
                  </div>

                  {modalMode !== 'view' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPermissionsMatrix(getAllDefaultPermissions())}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      >
                        <Icon name="check" size={12} />
                        <span>Select All (Full Access)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermissionsMatrix({})}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Module</th>
                      <th className="py-2.5 px-3 text-center w-16">View</th>
                      <th className="py-2.5 px-3 text-center w-16">Add</th>
                      <th className="py-2.5 px-3 text-center w-16">Edit</th>
                      <th className="py-2.5 px-3 text-center w-16">Delete</th>
                      <th className="py-2.5 px-3 text-center w-16">Import</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {PERMISSION_MATRIX_CONFIG.map((group) => (
                      <React.Fragment key={group.id}>
                        {/* Group Header in Blue Bold - As in Image 2 */}
                        <tr className="bg-slate-50/50 dark:bg-slate-800/40">
                          <td colSpan={6} className="py-2 px-4 font-black text-blue-600 text-[11px] tracking-wide">
                            {group.title}
                          </td>
                        </tr>

                        {/* Individual Rows under this Module Group */}
                        {group.rows.map((row) => (
                          <tr
                            key={row.key}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-2 px-4 text-slate-800 dark:text-slate-200 font-medium">
                              {row.label}
                            </td>

                            {/* View Checkbox */}
                            <td className="py-2 px-3 text-center">
                              {row.actions.includes('view') ? (
                                <input
                                  type="checkbox"
                                  disabled={modalMode === 'view'}
                                  checked={!!permissionsMatrix[`${row.key}.view`]}
                                  onChange={() => handleTogglePermission(row.key, 'view')}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              ) : null}
                            </td>

                            {/* Add Checkbox */}
                            <td className="py-2 px-3 text-center">
                              {row.actions.includes('add') ? (
                                <input
                                  type="checkbox"
                                  disabled={modalMode === 'view'}
                                  checked={!!permissionsMatrix[`${row.key}.add`]}
                                  onChange={() => handleTogglePermission(row.key, 'add')}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              ) : null}
                            </td>

                            {/* Edit Checkbox */}
                            <td className="py-2 px-3 text-center">
                              {row.actions.includes('edit') ? (
                                <input
                                  type="checkbox"
                                  disabled={modalMode === 'view'}
                                  checked={!!permissionsMatrix[`${row.key}.edit`]}
                                  onChange={() => handleTogglePermission(row.key, 'edit')}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              ) : null}
                            </td>

                            {/* Delete Checkbox */}
                            <td className="py-2 px-3 text-center">
                              {row.actions.includes('delete') ? (
                                <input
                                  type="checkbox"
                                  disabled={modalMode === 'view'}
                                  checked={!!permissionsMatrix[`${row.key}.delete`]}
                                  onChange={() => handleTogglePermission(row.key, 'delete')}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              ) : null}
                            </td>

                            {/* Import Checkbox */}
                            <td className="py-2 px-3 text-center">
                              {row.actions.includes('import') ? (
                                <input
                                  type="checkbox"
                                  disabled={modalMode === 'view'}
                                  checked={!!permissionsMatrix[`${row.key}.import`]}
                                  onChange={() => handleTogglePermission(row.key, 'import')}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

              {/* Modal Action Buttons: Cancel and Save (As in Image 2) */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saving ? (
                      <Icon name="loader" size={14} className="animate-spin" />
                    ) : (
                      <Icon name="check" size={14} />
                    )}
                    <span>Save</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
