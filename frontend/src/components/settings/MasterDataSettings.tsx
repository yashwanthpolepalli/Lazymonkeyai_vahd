import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { hrmsApi } from '@/services/hrmsApi';
import { masterDataApi } from '@/services/masterDataApi';
import { useAuth } from '@/context/AuthContext';

export interface MasterDataItem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  parent_id?: string;
  parent_name?: string;
  extra_info?: string;
  check_in_time?: string;
  check_out_time?: string;
  level?: string | number;
  display_order?: number;
  description?: string;
  days?: number | string;
  created_at?: string;
}

export interface MasterCategory {
  id: string;
  title: string;
  icon: string;
  bgLight: string;
  textColor: string;
  description?: string;
  parentCategory?: string;
  codePrefix: string;
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  { id: 'districts', title: 'District', icon: 'map', bgLight: 'bg-sky-100', textColor: 'text-sky-700', codePrefix: 'DST' },
  { id: 'mandals', title: 'Mandal', icon: 'map-pin', bgLight: 'bg-rose-100', textColor: 'text-rose-700', parentCategory: 'districts', codePrefix: 'MDL' },
  { id: 'towns', title: 'Village/Town', icon: 'home', bgLight: 'bg-amber-100', textColor: 'text-amber-700', parentCategory: 'mandals', codePrefix: 'VLG' },
  { id: 'gender_types', title: 'Gender Types', icon: 'users', bgLight: 'bg-pink-100', textColor: 'text-pink-700', codePrefix: 'GND' },
  { id: 'blood_groups', title: 'Blood Groups', icon: 'droplet', bgLight: 'bg-red-100', textColor: 'text-red-700', codePrefix: 'BLD' },
  { id: 'castes', title: 'Caste', icon: 'tag', bgLight: 'bg-purple-100', textColor: 'text-purple-700', codePrefix: 'CST' },
  { id: 'institution_types', title: 'Type of Institution', icon: 'building', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'TOI' },
  { id: 'place_of_working', title: 'Place of Working', icon: 'briefcase', bgLight: 'bg-stone-100', textColor: 'text-stone-700', codePrefix: 'POW' },
  { id: 'dashboard_locations', title: 'Dashboard Locations', icon: 'compass', bgLight: 'bg-red-100', textColor: 'text-red-700', codePrefix: 'DBL' },
  { id: 'mapping_institute', title: 'Mapping Institute', icon: 'layers', bgLight: 'bg-orange-100', textColor: 'text-orange-700', codePrefix: 'MPI' },
  { id: 'division_mapping', title: 'Division Institution Mapping', icon: 'git-branch', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'DIM' },
  { id: 'designations', title: 'Designation', icon: 'award', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'DES' },
  { id: 'roles', title: 'Role', icon: 'shield', bgLight: 'bg-purple-100', textColor: 'text-purple-700', codePrefix: 'ROL' },
  { id: 'departments', title: 'Departments', icon: 'layers', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'DEPT' },
  { id: 'posting_types', title: 'Type of Posting', icon: 'arrow-left-right', bgLight: 'bg-cyan-100', textColor: 'text-cyan-700', codePrefix: 'TOP' },
  { id: 'diagnostics', title: 'Diagnostics', icon: 'microscope', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'DX' },
  { id: 'animal_types', title: 'Animal Type', icon: 'tag', bgLight: 'bg-slate-100', textColor: 'text-slate-700', codePrefix: 'ANI' },
  { id: 'breeds', title: 'Breeds', icon: 'sparkles', bgLight: 'bg-violet-100', textColor: 'text-violet-700', codePrefix: 'BRD' },
  { id: 'vaccination_types', title: 'Vaccination Type', icon: 'shield-alert', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'VAC' },
  { id: 'items', title: 'Items', icon: 'package', bgLight: 'bg-amber-100', textColor: 'text-amber-800', codePrefix: 'ITM' },
  { id: 'surgical_types', title: 'Surgical Type', icon: 'settings', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'STP' },
  { id: 'surgical', title: 'Surgical', icon: 'plus-circle', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'SUR' },
  { id: 'qualifications', title: 'Qualification', icon: 'book-open', bgLight: 'bg-sky-100', textColor: 'text-sky-700', codePrefix: 'QLF' },
  { id: 'specializations', title: 'Specialization', icon: 'file-text', bgLight: 'bg-slate-100', textColor: 'text-slate-800', parentCategory: 'qualifications', codePrefix: 'SPC' },
  { id: 'leave_reasons', title: 'Leave Reasons', icon: 'clock', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'LVR' },
  { id: 'grampanchayath', title: 'Grampanchayath', icon: 'home', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'GP' },
  { id: 'allocation_forms', title: 'Allocation Form', icon: 'file-spreadsheet', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'ALF' },
  { id: 'drugs', title: 'Drugs', icon: 'pill', bgLight: 'bg-green-100', textColor: 'text-green-700', codePrefix: 'DRG' },
  { id: 'financial_years', title: 'Financial Year', icon: 'indian-rupee', bgLight: 'bg-lime-100', textColor: 'text-lime-800', codePrefix: 'FY' },
  { id: 'schemes', title: 'Scheme', icon: 'bar-chart-3', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'SCH' },
  { id: 'quarters', title: 'Quarter', icon: 'pie-chart', bgLight: 'bg-purple-100', textColor: 'text-purple-700', codePrefix: 'QTR' },
  { id: 'form_types', title: 'Form Type', icon: 'edit-3', bgLight: 'bg-yellow-100', textColor: 'text-yellow-700', codePrefix: 'FRM' },
  { id: 'budget_allocations', title: 'Budget / Percentage Allocation', icon: 'pie-chart', bgLight: 'bg-orange-100', textColor: 'text-orange-700', codePrefix: 'BGT' },
  { id: 'policies', title: 'Policies', icon: 'clipboard-list', bgLight: 'bg-slate-100', textColor: 'text-slate-700', codePrefix: 'POL' },
  { id: 'calendars', title: 'Calendar', icon: 'calendar', bgLight: 'bg-rose-100', textColor: 'text-rose-700', codePrefix: 'CAL' },
  { id: 'farmers', title: 'Farmers', icon: 'user', bgLight: 'bg-blue-100', textColor: 'text-blue-800', codePrefix: 'FRM' },
  { id: 'sex_sorted_semen', title: 'Sex Sorted Semen', icon: 'dna', bgLight: 'bg-fuchsia-100', textColor: 'text-fuchsia-700', codePrefix: 'SSS' },
];

export function getDepartmentType(item: Partial<MasterDataItem> | { name?: string; extra_info?: string }): 'student' | 'employee' | 'both' {
  const extra = (item.extra_info || '').toLowerCase().trim();
  if (extra === 'student' || extra === 'students' || extra === 'academic') return 'student';
  if (extra === 'employee' || extra === 'employees' || extra === 'staff') return 'employee';
  if (extra === 'both' || extra === 'all') return 'both';
  return 'student';
}

export interface MasterDataSettingsProps {
  selectedCatId?: string | null;
  onBack?: () => void;
}

export function MasterDataSettings({ selectedCatId: propSelectedCatId, onBack }: MasterDataSettingsProps = {}) {
  const { user } = useAuth();
  const isHo = user?.role === 'ho';
  const perms = user?.permissions;

  const [selectedCatId, setSelectedCatId] = useState<string | null>(propSelectedCatId || null);

  useEffect(() => {
    if (propSelectedCatId !== undefined) {
      setSelectedCatId(propSelectedCatId);
    }
  }, [propSelectedCatId]);

  const [masterStore, setMasterStore] = useState<Record<string, MasterDataItem[]>>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Remove any legacy hardcoded dummy seeded records
          Object.keys(parsed).forEach((k) => {
            if (Array.isArray(parsed[k])) {
              parsed[k] = parsed[k].filter((it: MasterDataItem) => !it.id?.startsWith('dept_seed_'));
            }
          });
          return parsed;
        }
      }
    } catch { }

    const initial: Record<string, MasterDataItem[]> = {};
    MASTER_CATEGORIES.forEach((cat) => {
      initial[cat.id] = [];
    });
    return initial;
  });

  // Fetch all master data directly from backend database on mount
  useEffect(() => {
    masterDataApi.getAll().then((data) => {
      if (data && typeof data === 'object') {
        setMasterStore((prev) => {
          const merged = { ...prev };
          Object.keys(data).forEach((cat) => {
            if (Array.isArray(data[cat])) {
              merged[cat] = data[cat];
            }
          });
          try {
            localStorage.setItem('vahd_master_data_v3', JSON.stringify(merged));
            window.dispatchEvent(new Event('vahd_master_data_updated'));
          } catch { }
          return merged;
        });
      }
    }).catch(() => { });
  }, []);

  const saveMasterStore = (updated: Record<string, MasterDataItem[]>) => {
    setMasterStore(updated);
    try {
      localStorage.setItem('vahd_master_data_v3', JSON.stringify(updated));
      localStorage.setItem('vahd_master_data_v2', JSON.stringify(updated));
      window.dispatchEvent(new Event('vahd_master_data_updated'));
    } catch { }
  };

  // Synchronize DB-backed categories with live backend database
  useEffect(() => {
    if (selectedCatId === 'leave_reasons' || !selectedCatId) {
      hrmsApi.getLeaveTypes().then((types) => {
        if (Array.isArray(types) && types.length > 0) {
          const mapped: MasterDataItem[] = types.map((t) => ({
            id: t.id,
            name: t.name,
            code: t.code,
            days: t.annual_quota || 0,
            is_active: t.is_active,
            description: t.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, leave_reasons: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch { }
            return next;
          });
        }
      }).catch(() => { });
    }

    if (selectedCatId === 'departments' || !selectedCatId) {
      hrmsApi.getDepartments().then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          const mapped: MasterDataItem[] = depts.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            is_active: d.is_active,
            description: d.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, departments: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch { }
            return next;
          });
        }
      }).catch(() => { });
    }

    if (selectedCatId === 'designations' || !selectedCatId) {
      hrmsApi.getDesignations().then((desgs) => {
        if (Array.isArray(desgs) && desgs.length > 0) {
          const mapped: MasterDataItem[] = desgs.map((d: any) => ({
            id: d.id,
            name: d.title || d.name || '',
            code: d.code || 'DES',
            level: d.level,
            parent_name: d.department,
            is_active: d.is_active !== false,
            description: d.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, designations: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch { }
            return next;
          });
        }
      }).catch(() => { });
    }
  }, [selectedCatId]);

  const selectedCategory = useMemo(() => {
    return MASTER_CATEGORIES.find((c) => c.id === selectedCatId) || null;
  }, [selectedCatId]);

  const canAdd = useMemo(() => {
    if (isHo || !perms || Object.keys(perms).length === 0) return true;
    if (!selectedCategory) return true;
    return !!(perms[`${selectedCategory.id}.add`] || perms['master_data.add'] || perms['master_data.edit']);
  }, [isHo, perms, selectedCategory]);

  const canEdit = useMemo(() => {
    if (isHo || !perms || Object.keys(perms).length === 0) return true;
    if (!selectedCategory) return true;
    return !!(perms[`${selectedCategory.id}.edit`] || perms['master_data.edit']);
  }, [isHo, perms, selectedCategory]);

  const canDelete = useMemo(() => {
    if (isHo || !perms || Object.keys(perms).length === 0) return true;
    if (!selectedCategory) return true;
    return !!(perms[`${selectedCategory.id}.delete`] || perms['master_data.delete']);
  }, [isHo, perms, selectedCategory]);

  const canImport = useMemo(() => {
    if (isHo || !perms || Object.keys(perms).length === 0) return true;
    if (!selectedCategory) return true;
    return !!(perms[`${selectedCategory.id}.import`] || perms['master_data.import'] || perms['master_data.add']);
  }, [isHo, perms, selectedCategory]);

  const categoryItems = useMemo(() => {
    if (!selectedCatId) return [];
    return masterStore[selectedCatId] || [];
  }, [selectedCatId, masterStore]);

  // Table filters & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Department Sub-View State (Students Departments vs Employee Departments vs All)
  const [deptTab, setDeptTab] = useState<'students' | 'employees' | 'all'>('students');
  const [deptTypeInModal, setDeptTypeInModal] = useState<'student' | 'employee' | 'both'>('student');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formExtra, setFormExtra] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formLevel, setFormLevel] = useState('0');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formDescription, setFormDescription] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Dynamic Status Filter: 'all' | 'active' | 'inactive' across all master data pages
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Department count metrics for the view switcher
  const deptCounts = useMemo(() => {
    if (selectedCatId !== 'departments') return { students: 0, employees: 0, all: 0 };
    const items = masterStore['departments'] || [];
    let students = 0;
    let employees = 0;
    items.forEach((it) => {
      const t = getDepartmentType(it);
      if (t === 'student' || t === 'both') students++;
      if (t === 'employee' || t === 'both') employees++;
    });
    return { students, employees, all: items.length };
  }, [selectedCatId, masterStore]);



  // Status counts for the currently selected category & subtab
  const statusCounts = useMemo(() => {
    let base = categoryItems;
    if (selectedCatId === 'departments') {
      if (deptTab === 'students') {
        base = base.filter((item) => {
          const t = getDepartmentType(item);
          return t === 'student' || t === 'both';
        });
      } else if (deptTab === 'employees') {
        base = base.filter((item) => {
          const t = getDepartmentType(item);
          return t === 'employee' || t === 'both';
        });
      }
    }
    const active = base.filter((i) => i.is_active).length;
    const inactive = base.filter((i) => !i.is_active).length;
    return { all: base.length, active, inactive };
  }, [categoryItems, selectedCatId, deptTab]);

  // Filtered rows (respects department view tab + dynamic active/inactive filter + search)
  const filteredItems = useMemo(() => {
    let base = categoryItems;
    if (selectedCatId === 'departments') {
      if (deptTab === 'students') {
        base = base.filter((item) => {
          const t = getDepartmentType(item);
          return t === 'student' || t === 'both';
        });
      } else if (deptTab === 'employees') {
        base = base.filter((item) => {
          const t = getDepartmentType(item);
          return t === 'employee' || t === 'both';
        });
      }
    }

    // Dynamic Active / Inactive filter
    if (statusFilter === 'active') {
      base = base.filter((item) => item.is_active);
    } else if (statusFilter === 'inactive') {
      base = base.filter((item) => !item.is_active);
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.parent_name && item.parent_name.toLowerCase().includes(q)) ||
        (item.extra_info && item.extra_info.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [categoryItems, selectedCatId, deptTab, statusFilter, searchQuery]);

  // Dynamically set status for a single item (with backend DB & domain sync)
  const handleSetItemStatus = (item: MasterDataItem, nextActive: boolean) => {
    if (!selectedCatId) return;

    // Optimistically update masterStore and localStorage
    const currentItems = masterStore[selectedCatId] || [];
    const updated = currentItems.map((i) =>
      i.id === item.id ? { ...i, is_active: nextActive } : i
    );
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });

    // Persist to backend master data table
    masterDataApi.update(selectedCatId, item.id, { is_active: nextActive }).catch((err) => {
      console.error('Failed to update status in DB:', err);
    });

    // Sync with specialized backend tables
    if (selectedCatId === 'departments') {
      hrmsApi.updateDepartment(item.id, {
        name: item.name,
        code: item.code,
        is_active: nextActive,
      }).catch(() => {});
    } else if (selectedCatId === 'leave_reasons') {
      hrmsApi.updateLeaveType(item.id, { is_active: nextActive }).catch(() => {});
    }
  };

  // Bulk set status for all selected items
  const handleBulkSetStatus = (nextActive: boolean) => {
    if (!selectedCatId || selectedItemIds.length === 0) return;
    const currentItems = masterStore[selectedCatId] || [];
    const idSet = new Set(selectedItemIds);
    const updated = currentItems.map((item) =>
      idSet.has(item.id) ? { ...item, is_active: nextActive } : item
    );
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });

    selectedItemIds.forEach((id) => {
      masterDataApi.update(selectedCatId, id, { is_active: nextActive }).catch(() => {});
      if (selectedCatId === 'departments') {
        const it = currentItems.find((i) => i.id === id);
        hrmsApi.updateDepartment(id, {
          name: it?.name,
          code: it?.code,
          is_active: nextActive,
        }).catch(() => {});
      } else if (selectedCatId === 'leave_reasons') {
        hrmsApi.updateLeaveType(id, { is_active: nextActive }).catch(() => {});
      }
    });
  };

  // Dynamic Active / Inactive selector for table rows (Interactive Select + 1-Click Toggle)
  const renderActiveStatusSelector = (item: MasterDataItem) => (
    <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative inline-flex items-center">
        <select
          value={item.is_active ? 'active' : 'inactive'}
          onChange={(e) => handleSetItemStatus(item, e.target.value === 'active')}
          aria-label={`Status for ${item.name}`}
          className={cn(
            'appearance-none pl-6 pr-5 py-1 rounded-full text-[11px] font-black cursor-pointer border shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 select-none',
            item.is_active
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          )}
          title={`Status: ${item.is_active ? 'Active' : 'Inactive'}. Click to change.`}
        >
          <option value="active" className="text-emerald-700 font-bold">Active</option>
          <option value="inactive" className="text-slate-600 font-bold">Inactive</option>
        </select>
        <span
          className={cn(
            'absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none transition-colors',
            item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
          )}
        />
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <Icon name="chevron-down" size={10} />
        </span>
      </div>

      <button
        type="button"
        onClick={() => handleSetItemStatus(item, !item.is_active)}
        className={cn(
          'w-7 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500/50',
          item.is_active ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600'
        )}
        title={item.is_active ? 'Quick toggle: Click to make Inactive' : 'Quick toggle: Click to make Active'}
      >
        <span
          className={cn(
            'block w-3 h-3 rounded-full bg-white shadow-2xs transform transition-transform',
            item.is_active ? 'translate-x-3' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormParentId('');
    
    // Automatically pre-select Students View or Employee View based on the active tab
    const initialDeptType = deptTab === 'employees' ? 'employee' : 'student';
    setDeptTypeInModal(initialDeptType);
    setFormExtra(selectedCatId === 'departments' ? initialDeptType : '');

    setFormCheckIn('');
    setFormCheckOut('');
    setFormLevel('0');
    setFormDisplayOrder('0');
    setFormDescription('');
    setFormDays('');
    setFormActive(true);
    setModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (item: MasterDataItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormParentId(item.parent_id || '');
    
    const dType = getDepartmentType(item);
    setDeptTypeInModal(dType);
    setFormExtra(item.extra_info || dType);

    setFormCheckIn(item.check_in_time || '');
    setFormCheckOut(item.check_out_time || '');
    setFormLevel(String(item.level ?? '0'));
    setFormDisplayOrder(String(item.display_order ?? '0'));
    setFormDescription(item.description || '');
    setFormDays(String(item.days ?? ''));
    setFormActive(item.is_active);
    setModalOpen(true);
  };

  // Open modal for view
  const handleOpenView = (item: MasterDataItem) => {
    setModalMode('view');
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormParentId(item.parent_id || '');

    const dType = getDepartmentType(item);
    setDeptTypeInModal(dType);
    setFormExtra(item.extra_info || dType);

    setFormCheckIn(item.check_in_time || '');
    setFormCheckOut(item.check_out_time || '');
    setFormLevel(String(item.level ?? '0'));
    setFormDisplayOrder(String(item.display_order ?? '0'));
    setFormDescription(item.description || '');
    setFormDays(String(item.days ?? ''));
    setFormActive(item.is_active);
    setModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !formName.trim()) return;

    const currentItems = masterStore[selectedCatId] || [];
    const parentCategory = selectedCategory?.parentCategory;
    let resolvedParentName = '';
    let resolvedParentCode = '';
    if (parentCategory && formParentId) {
      const parents = masterStore[parentCategory] || [];
      const match = parents.find((p) => p.id === formParentId);
      if (match) {
        resolvedParentName = match.name;
        resolvedParentCode = match.code;
      }
    }

    const finalExtra = selectedCatId === 'departments'
      ? deptTypeInModal
      : (formExtra.trim() || resolvedParentCode || undefined);

    if (modalMode === 'edit' && editingItem) {
      if (selectedCatId === 'leave_reasons') {
        hrmsApi.updateLeaveType(editingItem.id, {
          name: formName.trim(),
          code: formCode.trim() || editingItem.code,
          annual_quota: parseFloat(formDays) || 15,
          is_active: formActive,
        }).catch(() => { });
      } else if (selectedCatId === 'departments') {
        hrmsApi.updateDepartment(editingItem.id, {
          name: formName.trim(),
          code: formCode.trim() || editingItem.code,
          is_active: formActive,
        }).catch(() => { });
      } else if (selectedCatId === 'designations') {
        hrmsApi.updateDesignation(editingItem.id, {
          title: formName.trim(),
          level: formLevel,
          department: resolvedParentName,
        }).catch(() => { });
      }

      // Also persist to backend database for all master categories
      masterDataApi.update(selectedCatId, editingItem.id, {
        name: formName.trim(),
        code: formCode.trim() || editingItem.code,
        is_active: formActive,
        parent_id: formParentId || undefined,
        parent_name: resolvedParentName || editingItem.parent_name,
        extra_info: finalExtra || editingItem.extra_info,
        level: formLevel || undefined,
        display_order: parseInt(formDisplayOrder, 10) || 0,
        description: formDescription.trim() || undefined,
      }).catch((err) => console.error('Failed to update master data in DB:', err));

      const updatedList = currentItems.map((item) => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formName.trim(),
            code: formCode.trim() || item.code,
            parent_id: formParentId || undefined,
            parent_name: resolvedParentName || item.parent_name,
            extra_info: finalExtra || item.extra_info,
            check_in_time: formCheckIn.trim() || undefined,
            check_out_time: formCheckOut.trim() || undefined,
            level: formLevel || undefined,
            display_order: parseInt(formDisplayOrder, 10) || 0,
            description: formDescription.trim() || undefined,
            days: formDays ? parseInt(formDays, 10) : undefined,
            is_active: formActive,
          };
        }
        return item;
      });
      saveMasterStore({ ...masterStore, [selectedCatId]: updatedList });
    } else {
      // Add new
      const autoCode =
        formCode.trim() ||
        `${selectedCategory?.codePrefix || 'CD'}-${Math.floor(100 + Math.random() * 900)}`;

      if (selectedCatId === 'leave_reasons') {
        hrmsApi.createLeaveType({
          name: formName.trim(),
          code: autoCode,
          annual_quota: parseFloat(formDays) || 15,
          paid_type: 'PAID',
          is_paid: true,
          gender_eligibility: ['MALE', 'FEMALE', 'OTHER'],
          min_service_days: 0,
          carry_forward_allowed: false,
          max_carry_forward_days: 0,
          attachment_required: false,
          is_active: formActive,
        }).catch(() => { });
      } else if (selectedCatId === 'departments') {
        hrmsApi.createDepartment({
          name: formName.trim(),
          code: autoCode,
          is_active: formActive,
        }).catch(() => { });
      } else if (selectedCatId === 'designations') {
        hrmsApi.createDesignation({
          title: formName.trim(),
          level: formLevel,
          department: resolvedParentName,
        }).catch(() => { });
      }

      const tempId = `${selectedCatId}_${Date.now()}`;
      const newItem: MasterDataItem = {
        id: tempId,
        name: formName.trim(),
        code: autoCode,
        is_active: formActive,
        parent_id: formParentId || undefined,
        parent_name: resolvedParentName || undefined,
        extra_info: finalExtra,
        check_in_time: formCheckIn.trim() || undefined,
        check_out_time: formCheckOut.trim() || undefined,
        level: formLevel || undefined,
        display_order: parseInt(formDisplayOrder, 10) || 0,
        description: formDescription.trim() || undefined,
        days: formDays ? parseInt(formDays, 10) : undefined,
        created_at: new Date().toISOString(),
      };

      // Persist to backend database for all master categories
      masterDataApi.create(selectedCatId, {
        name: newItem.name,
        code: newItem.code,
        is_active: newItem.is_active,
        parent_id: newItem.parent_id,
        parent_name: newItem.parent_name,
        extra_info: newItem.extra_info,
        level: newItem.level,
        display_order: newItem.display_order,
        description: newItem.description,
      }).then((created) => {
        if (created?.id) {
          setMasterStore((prev) => {
            const list = prev[selectedCatId] || [];
            const updated = list.map((item) => (item.id === tempId ? { ...item, id: created.id } : item));
            const next = { ...prev, [selectedCatId]: updated };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
              window.dispatchEvent(new Event('vahd_master_data_updated'));
            } catch { }
            return next;
          });
        }
      }).catch((err) => console.error('Failed to create master data in DB:', err));

      saveMasterStore({ ...masterStore, [selectedCatId]: [newItem, ...currentItems] });
    }

    setModalOpen(false);
  };

  // Delete single item
  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!selectedCatId) return;
    if (!confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) return;

    if (selectedCatId === 'leave_reasons') {
      hrmsApi.deleteLeaveType(itemId).catch(() => { });
    } else if (selectedCatId === 'departments') {
      hrmsApi.deleteDepartment(itemId).catch(() => { });
    } else if (selectedCatId === 'designations') {
      hrmsApi.deleteDesignation(itemId).catch(() => { });
    }

    // Call masterDataApi delete
    masterDataApi.delete(selectedCatId, itemId).catch((err) => console.error('Failed to delete master data from DB:', err));

    const currentItems = masterStore[selectedCatId] || [];
    const updated = currentItems.filter((i) => i.id !== itemId);
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
  };


  // Delete Selected / Delete All
  const handleDeleteSelected = () => {
    if (!selectedCatId || selectedItemIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItemIds.length} selected record(s)?`)) return;
    selectedItemIds.forEach((id) => {
      masterDataApi.delete(selectedCatId, id).catch(() => { });
    });
    const currentItems = masterStore[selectedCatId] || [];
    const deleteSet = new Set(selectedItemIds);
    const updated = currentItems.filter((i) => !deleteSet.has(i.id));
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });
    setSelectedItemIds([]);
  };

  const handleDeleteAll = () => {
    if (!selectedCatId) return;
    if (!confirm(`Are you sure you want to delete ALL records for ${selectedCategory?.title}?`)) return;
    const currentItems = masterStore[selectedCatId] || [];
    currentItems.forEach((item) => {
      masterDataApi.delete(selectedCatId, item.id).catch(() => { });
    });
    saveMasterStore({ ...masterStore, [selectedCatId]: [] });
    setSelectedItemIds([]);
  };

  // Dynamic Template CSV Download without hardcoded dummy values
  const handleDownloadSampleCsv = () => {
    if (!selectedCategory) return;
    let headers: string[] = [];

    if (selectedCategory.id === 'departments') {
      headers = ['NAME', 'CODE', 'IS_ACTIVE', 'TYPE', 'DESCRIPTION'];
    } else if (selectedCategory.id === 'institution_types') {
      headers = ['NAME', 'CODE', 'CHECK_IN', 'CHECK_OUT', 'LEVEL', 'DISPLAY_ORDER', 'IS_ACTIVE'];
    } else if (selectedCategory.id === 'leave_reasons') {
      headers = ['NAME', 'DAYS', 'IS_ACTIVE'];
    } else if (selectedCategory.parentCategory) {
      headers = ['NAME', 'CODE', 'IS_ACTIVE', 'PARENT_NAME'];
    } else {
      headers = ['NAME', 'CODE', 'IS_ACTIVE'];
    }

    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${selectedCategory.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCatId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) return;
        const newRecords: MasterDataItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols[0]) {
            let extraVal: string | undefined = undefined;
            if (selectedCatId === 'departments') {
              const rawType = cols[3] ? cols[3].toLowerCase() : '';
              extraVal = (rawType === 'employee' || rawType === 'staff')
                ? 'employee'
                : (rawType === 'both' || rawType === 'all')
                  ? 'both'
                  : 'student';
            }

            newRecords.push({
              id: `${selectedCatId}_imp_${Date.now()}_${i}`,
              name: cols[0],
              code: cols[1] || `${selectedCategory?.codePrefix || 'CD'}-${Math.floor(100 + Math.random() * 900)}`,
              is_active: cols[2] ? cols[2].toUpperCase() !== 'FALSE' : true,
              extra_info: extraVal,
              parent_name: selectedCatId !== 'departments' ? cols[3] || undefined : undefined,
              description: selectedCatId === 'departments' ? cols[4] || undefined : undefined,
            });

            // Also persist imported department to backend DB
            if (selectedCatId === 'departments') {
              masterDataApi.create('departments', {
                name: cols[0],
                code: cols[1] || `${selectedCategory?.codePrefix || 'CD'}-${Math.floor(100 + Math.random() * 900)}`,
                is_active: cols[2] ? cols[2].toUpperCase() !== 'FALSE' : true,
                extra_info: extraVal,
                description: cols[4] || undefined,
              }).catch(() => {});
            }
          }
        }
        if (newRecords.length > 0) {
          const existing = masterStore[selectedCatId] || [];
          saveMasterStore({ ...masterStore, [selectedCatId]: [...existing, ...newRecords] });
          alert(`Successfully imported ${newRecords.length} records into ${selectedCategory?.title}.`);
        }
      } catch (err) {
        alert('Failed to parse file. Please use a valid CSV file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Parent options for dropdowns
  const parentOptions = useMemo(() => {
    if (!selectedCategory?.parentCategory) return [];
    return masterStore[selectedCategory.parentCategory] || [];
  }, [selectedCategory, masterStore]);

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 2: CATEGORY DETAIL TABLE VIEW (Screenshots 1 - 5)
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedCatId && selectedCategory) {
    const isInstitutionType = selectedCategory.id === 'institution_types';
    const isSpecialization = selectedCategory.id === 'specializations';
    const isQualification = selectedCategory.id === 'qualifications';
    const isLeaveReasons = selectedCategory.id === 'leave_reasons';

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Hidden File Input for CSV Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />

        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : setSelectedCatId(null))}>Home</span>
              <Icon name="chevron-right" size={12} />
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : setSelectedCatId(null))}>Settings</span>
              <Icon name="chevron-right" size={12} />
              <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCategory.title}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {selectedCategory.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Settings · {categoryItems.length} records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  setSelectedCatId(null);
                }
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedItemIds([]);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Back</span>
            </button>

            {/* Import Button */}
            {canImport && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="upload" size={13} />
                  <span>Import Excel / CSV</span>
                </button>

                {/* Sample Files */}
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer"
                >
                  Sample .xlsx
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer"
                >
                  Sample .csv
                </button>
              </>
            )}

            {/* Dynamic Bulk Status & Delete Actions */}
            {selectedItemIds.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Mark selected records as Active"
                    >
                      <Icon name="check-circle" size={13} />
                      <span>Mark Active ({selectedItemIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Mark selected records as Inactive"
                    >
                      <Icon name="x-circle" size={13} />
                      <span>Mark Inactive ({selectedItemIds.length})</span>
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Icon name="trash-2" size={13} />
                    <span>Delete ({selectedItemIds.length})</span>
                  </button>
                )}
              </div>
            ) : (
              canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Icon name="trash-2" size={13} />
                  <span>Delete All</span>
                </button>
              )
            )}

            {/* + Add Button */}
            {canAdd && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Icon name="plus" size={14} />
                <span>
                  {selectedCategory.id === 'departments'
                    ? `+ Add ${deptTab === 'students' ? 'Student' : deptTab === 'employees' ? 'Employee' : ''} Department`
                    : `+ Add ${selectedCategory.title}`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Department Sub-Views Switcher (Students Departments vs Employee Departments vs All) */}
        {selectedCategory.id === 'departments' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setDeptTab('students')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  deptTab === 'students'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-indigo-200 dark:border-indigo-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon name="graduation-cap" size={15} className={deptTab === 'students' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>Students Departments</span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-black',
                  deptTab === 'students' ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {deptCounts.students}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeptTab('employees')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  deptTab === 'employees'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-200 dark:border-emerald-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon name="briefcase" size={15} className={deptTab === 'employees' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Employee Departments</span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-black',
                  deptTab === 'employees' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {deptCounts.employees}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeptTab('all')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  deptTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-blue-200 dark:border-blue-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon name="layers" size={15} className={deptTab === 'all' ? 'text-blue-600' : 'text-slate-400'} />
                <span>All Departments</span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-black',
                  deptTab === 'all' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {deptCounts.all}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Filter Bar (Search + Active/Inactive Filter Tabs + Counts) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${selectedCategory.title.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dynamic Status Filter Selector for all pages */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
                title="Show all records"
              >
                <span>All Status</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {statusCounts.all}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                    : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900'
                )}
                title="Show active records only"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusFilter === 'active' ? 'bg-white animate-pulse' : 'bg-emerald-500')} />
                <span>Active</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                  statusFilter === 'active' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                )}>
                  {statusCounts.active}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                  statusFilter === 'inactive'
                    ? 'bg-slate-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
                title="Show inactive records only"
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusFilter === 'inactive' ? 'bg-white' : 'bg-slate-400')} />
                <span>Inactive</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-black',
                  statusFilter === 'inactive' ? 'bg-slate-800 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {statusCounts.inactive}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{filteredItems.length} records</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        {/* Master Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {!isLeaveReasons && (
                    <th className="w-10 py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4 w-16">S.NO</th>

                  {/* Category-Specific Columns */}
                  {isSpecialization ? (
                    <>
                      <th className="py-3.5 px-4">QUALIFICATION ID</th>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      <th className="py-3.5 px-4">QUALIFICATION NAME</th>
                    </>
                  ) : isInstitutionType ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">CODE</th>
                      <th className="py-3.5 px-4">CHECK-IN TIME</th>
                      <th className="py-3.5 px-4">CHECK-OUT TIME</th>
                      <th className="py-3.5 px-4">LEVEL</th>
                      <th className="py-3.5 px-4">DISPLAY ORDER</th>
                      <th className="py-3.5 px-4">STATUS</th>
                    </>
                  ) : isLeaveReasons ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      <th className="py-3.5 px-4">DAYS</th>
                    </>
                  ) : selectedCategory.id === 'departments' ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">CODE</th>
                      <th className="py-3.5 px-4">TYPE / VIEW AUDIENCE</th>
                      <th className="py-3.5 px-4">DESCRIPTION</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                    </>
                  ) : isQualification ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">CODE</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      {selectedCategory.parentCategory && (
                        <th className="py-3.5 px-4 uppercase">{selectedCategory.parentCategory.replace('_', ' ')}</th>
                      )}
                      {selectedCategory.id === 'districts' && (
                        <th className="py-3.5 px-4">DISTRICT CODE</th>
                      )}
                      {['gender_types', 'blood_groups', 'castes'].includes(selectedCategory.id) && (
                        <th className="py-3.5 px-4">DESCRIPTION / INFO</th>
                      )}
                    </>
                  )}

                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-semibold">
                      {selectedCategory.id === 'departments' ? (
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Icon name={deptTab === 'students' ? 'graduation-cap' : deptTab === 'employees' ? 'briefcase' : 'layers'} size={24} />
                          </div>
                          <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                            No {deptTab === 'students' ? 'Students' : deptTab === 'employees' ? 'Employee' : ''} Departments Found
                          </div>
                          <p className="text-xs text-slate-400">
                            {deptTab === 'students'
                              ? 'Academic streams & degree departments appear during student enrollment.'
                              : deptTab === 'employees'
                                ? 'Staff, operational & administrative departments appear during employee onboarding.'
                                : 'Configure academic and operational departments.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleOpenAdd}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                            >
                              <Icon name="plus" size={13} />
                              <span>+ Add Department</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            >
                              <Icon name="upload" size={13} />
                              <span>Import CSV</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Icon name="layers" size={24} className="mx-auto text-slate-300 mb-2" />
                          <div>No records found for "{selectedCategory.title}".</div>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isChecked = selectedItemIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                          isChecked ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''
                        )}
                      >
                        {!isLeaveReasons && (
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-semibold text-slate-500">{idx + 1}</td>

                        {/* Specialization Columns (Screenshot 3) */}
                        {isSpecialization ? (
                          <>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                              {item.extra_info || item.parent_id || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {item.parent_name || '—'}
                            </td>
                          </>
                        ) : isInstitutionType ? (
                          /* Institution Type Columns (Screenshot 1) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {item.code || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                              {item.check_in_time ? (
                                <span className="flex items-center gap-1">
                                  <Icon name="clock" size={12} className="text-rose-500" />
                                  <span>{item.check_in_time}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                              {item.check_out_time ? (
                                <span className="flex items-center gap-1">
                                  <Icon name="clock" size={12} className="text-rose-500" />
                                  <span>{item.check_out_time}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {item.level ? (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                                  {String(item.level).includes('Level') ? item.level : `Level ${item.level}`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                              {item.display_order ?? '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                          </>
                        ) : isLeaveReasons ? (
                          /* Leave Reasons Columns (Screenshot 4) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {item.days ?? '—'}
                            </td>
                          </>
                        ) : selectedCategory.id === 'departments' ? (
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs',
                                  getDepartmentType(item) === 'student'
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                                    : getDepartmentType(item) === 'employee'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                                )}>
                                  <Icon
                                    name={
                                      getDepartmentType(item) === 'student'
                                        ? 'graduation-cap'
                                        : getDepartmentType(item) === 'employee'
                                          ? 'briefcase'
                                          : 'layers'
                                    }
                                    size={14}
                                  />
                                </span>
                                <span>{item.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {item.code}
                            </td>
                            <td className="py-3.5 px-4">
                              {(() => {
                                const t = getDepartmentType(item);
                                if (t === 'student') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                                      <Icon name="graduation-cap" size={12} className="text-indigo-600 dark:text-indigo-400" />
                                      <span>Students View</span>
                                    </span>
                                  );
                                }
                                if (t === 'employee') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                                      <Icon name="briefcase" size={12} className="text-emerald-600 dark:text-emerald-400" />
                                      <span>Employee View</span>
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                                    <Icon name="layers" size={12} className="text-blue-600 dark:text-blue-400" />
                                    <span>Both (Shared)</span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium line-clamp-1 max-w-xs">
                              {item.description || '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                          </>
                        ) : isQualification ? (
                          /* Qualification Columns (Screenshot 2) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                          </>
                        ) : (
                          /* Default Master Data Columns (District, Mandal, etc.) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {item.code}
                            </td>
                            <td className="py-3.5 px-4">
                              {renderActiveStatusSelector(item)}
                            </td>
                            {selectedCategory.parentCategory && (
                              <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                {item.parent_name || '—'}
                              </td>
                            )}
                            {selectedCategory.id === 'districts' && (
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {item.extra_info || item.code}
                              </td>
                            )}
                            {['gender_types', 'blood_groups', 'castes'].includes(selectedCategory.id) && (
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                                {item.extra_info || item.description || '—'}
                              </td>
                            )}
                          </>
                        )}

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenView(item)}
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Icon name="eye" size={12} />
                              <span>View</span>
                            </button>

                            {/* Edit Button */}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                              >
                                <Icon name="edit-3" size={12} />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Delete Button */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Icon name="x" size={13} />
                              </button>
                            )}
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

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ADD / EDIT / VIEW MODAL (Screenshots 1, 3, 4, 5)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {modalMode === 'add'
                    ? `Add ${selectedCategory.title}`
                    : modalMode === 'edit'
                      ? `Edit ${selectedCategory.title}`
                      : `View ${selectedCategory.title}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
                {/* 1. Parent Selection if Specialization (Screenshot 3) or Mandal/Town */}
                {selectedCategory.parentCategory && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      {isSpecialization ? 'QUALIFICATION *' : `${selectedCategory.parentCategory.replace('_', ' ').toUpperCase()} *`}
                    </label>
                    <select
                      value={formParentId}
                      onChange={(e) => setFormParentId(e.target.value)}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    >
                      <option value="">Select...</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Primary Name Field */}
                <div className="space-y-1">
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                    {isLeaveReasons
                      ? 'LEAVE REASON *'
                      : isInstitutionType
                        ? 'INSTITUTION TYPE NAME *'
                        : selectedCategory.id === 'gender_types'
                          ? 'GENDER TYPE *'
                          : selectedCategory.id === 'blood_groups'
                            ? 'BLOOD GROUP *'
                            : selectedCategory.id === 'castes'
                              ? 'CASTE / CATEGORY NAME *'
                              : `${selectedCategory.title.toUpperCase()} NAME *`}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      isInstitutionType
                        ? 'e.g. Polyclinic'
                        : isLeaveReasons
                          ? 'e.g. Casual Leave'
                          : selectedCategory.id === 'gender_types'
                            ? 'e.g. Male, Female, Other'
                            : selectedCategory.id === 'blood_groups'
                              ? 'e.g. O+, AB+, A-'
                              : selectedCategory.id === 'castes'
                                ? 'e.g. BC-A, SC, OC'
                                : `e.g. ${selectedCategory.title} name`
                    }
                    disabled={modalMode === 'view'}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* 3. Leave Reasons Days (Screenshot 5) */}
                {isLeaveReasons && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      MAX DAYS ALLOWED
                    </label>
                    <input
                      type="number"
                      value={formDays}
                      onChange={(e) => setFormDays(e.target.value)}
                      placeholder="e.g. 12 (leave blank for unlimited)"
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}

                {/* 4. Code Field (optional for institution type, district, etc.) */}
                {!isLeaveReasons && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      CODE
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder={
                        isInstitutionType
                          ? 'Optional — e.g. PVC'
                          : selectedCategory.id === 'gender_types'
                            ? 'Optional — e.g. MALE, FEMALE'
                            : selectedCategory.id === 'blood_groups'
                              ? 'Optional — e.g. A_POS, O_NEG'
                              : selectedCategory.id === 'castes'
                                ? 'Optional — e.g. OC, SC, BC-A'
                                : 'Optional — e.g. HYD, or leave blank to auto-generate'
                      }
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}

                {/* 5. Extra Info / Notes for Gender, Blood Groups, Castes, and Districts */}
                {['gender_types', 'blood_groups', 'castes', 'districts'].includes(selectedCategory.id) && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      {selectedCategory.id === 'districts'
                        ? 'DISTRICT SHORT CODE'
                        : selectedCategory.id === 'blood_groups'
                          ? 'RH FACTOR / NOTES'
                          : selectedCategory.id === 'gender_types'
                            ? 'SHORT NOTATION / NOTES'
                            : 'DESCRIPTION / FULL NAME'}
                    </label>
                    <input
                      type="text"
                      value={formExtra}
                      onChange={(e) => setFormExtra(e.target.value)}
                      placeholder={
                        selectedCategory.id === 'districts'
                          ? 'e.g. HYD, ADB'
                          : selectedCategory.id === 'blood_groups'
                            ? 'e.g. Rh Positive, Universal Donor'
                            : selectedCategory.id === 'gender_types'
                              ? 'e.g. M, F, Transgender'
                              : 'e.g. Backward Class Group A'
                      }
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}

                {/* 5. Type of Institution Custom Fields (Screenshot 1) */}
                {isInstitutionType && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          CHECK-IN TIME
                        </label>
                        <input
                          type="text"
                          value={formCheckIn}
                          onChange={(e) => setFormCheckIn(e.target.value)}
                          placeholder="e.g. 09:00 AM"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          CHECK-OUT TIME
                        </label>
                        <input
                          type="text"
                          value={formCheckOut}
                          onChange={(e) => setFormCheckOut(e.target.value)}
                          placeholder="e.g. 05:00 PM"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          LEVEL
                        </label>
                        <input
                          type="text"
                          value={formLevel}
                          onChange={(e) => setFormLevel(e.target.value)}
                          placeholder="e.g. 0"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          DISPLAY ORDER
                        </label>
                        <input
                          type="number"
                          value={formDisplayOrder}
                          onChange={(e) => setFormDisplayOrder(e.target.value)}
                          placeholder="e.g. 0"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                        DESCRIPTION
                      </label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Optional description"
                        disabled={modalMode === 'view'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* Department Type / View Audience Selection */}
                {selectedCategory.id === 'departments' && (
                  <>
                    <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                        DEPARTMENT VIEW AUDIENCE *
                      </label>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">
                        Choose whether this department appears during student enrollment or employee onboarding.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={modalMode === 'view'}
                          onClick={() => setDeptTypeInModal('student')}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                            deptTypeInModal === 'student'
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-900 dark:bg-indigo-950/70 dark:border-indigo-600 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          )}
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                            deptTypeInModal === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          )}>
                            <Icon name="graduation-cap" size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-black">Students View</div>
                            <div className="text-[10px] text-slate-400 font-normal">Student Enrollment</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={modalMode === 'view'}
                          onClick={() => setDeptTypeInModal('employee')}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                            deptTypeInModal === 'employee'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          )}
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                            deptTypeInModal === 'employee' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          )}>
                            <Icon name="briefcase" size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-black">Employee View</div>
                            <div className="text-[10px] text-slate-400 font-normal">Staff & Operations</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={modalMode === 'view'}
                          onClick={() => setDeptTypeInModal('both')}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                            deptTypeInModal === 'both'
                              ? 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/70 dark:border-blue-600 dark:text-blue-200 font-bold ring-2 ring-blue-500/20 shadow-2xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          )}
                        >
                          <div className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                            deptTypeInModal === 'both' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          )}>
                            <Icon name="layers" size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-black">Both Views</div>
                            <div className="text-[10px] text-slate-400 font-normal">Shared Across All</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                        DESCRIPTION / PURPOSE
                      </label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="e.g. Undergraduate computing, HR & payroll operations, etc."
                        disabled={modalMode === 'view'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* Dynamic Active / Inactive Selector in Modal */}
                <div className="space-y-1.5 pt-1">
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                    RECORD STATUS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={modalMode === 'view'}
                      onClick={() => setFormActive(true)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all select-none',
                        modalMode !== 'view' ? 'cursor-pointer' : 'cursor-default',
                        formActive
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', formActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                      <span>Active</span>
                    </button>
                    <button
                      type="button"
                      disabled={modalMode === 'view'}
                      onClick={() => setFormActive(false)}
                      className={cn(
                        'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all select-none',
                        modalMode !== 'view' ? 'cursor-pointer' : 'cursor-default',
                        !formActive
                          ? 'bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 ring-2 ring-slate-500/20 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', !formActive ? 'bg-slate-600' : 'bg-slate-300')} />
                      <span>Inactive</span>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition-colors"
                  >
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      ✓ Save
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

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 1: MASTER DATA CARDS GRID (Screenshot 1)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Matching Screenshot 1 */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
          Settings
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Master data — geography, , HR, finance, pharmacy, and fodder
        </p>
      </div>

      {/* Subtab indicator */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="text-blue-600 font-black text-sm">|</span>
        <span className="text-xs font-bold text-blue-600">Settings</span>
      </div>

      {/* 33 Category Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {MASTER_CATEGORIES.map((cat) => {
          const count = (masterStore[cat.id] || []).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCatId(cat.id);
                setSearchQuery('');
                setSelectedItemIds([]);
              }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group shadow-2xs min-h-[130px]"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs',
                  cat.bgLight,
                  cat.textColor
                )}
              >
                <Icon name={cat.icon} size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                  {cat.title}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  {count} records
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
