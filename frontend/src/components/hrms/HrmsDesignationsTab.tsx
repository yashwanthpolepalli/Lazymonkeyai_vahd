import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { hrmsApi, DesignationItem, DepartmentItem, MappedEmployee } from '@/services/hrmsApi';

export interface CareerLevelItem {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
}

const DEFAULT_LEVELS: CareerLevelItem[] = [
  { id: 'lvl_1', name: 'Entry Level', code: 'L1', color: 'slate', description: 'Junior & trainee positions' },
  { id: 'lvl_2', name: 'Mid Level', code: 'L2', color: 'blue', description: 'Independent operational staff' },
  { id: 'lvl_3', name: 'Senior Specialist', code: 'L3', color: 'purple', description: 'Subject matter experts' },
  { id: 'lvl_4', name: 'Team Lead', code: 'TL', color: 'amber', description: 'Supervisors and pod leaders' },
  { id: 'lvl_5', name: 'Executive / Head', code: 'EXEC', color: 'rose', description: 'Department heads & directors' },
];

const STORAGE_LEVELS_KEY = 'hrms_career_levels_v2';

export function HrmsDesignationsTab() {
  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
    return (localStorage.getItem('hrms_designations_view_mode') as 'grid' | 'row') || 'row';
  });

  const handleSetViewMode = (mode: 'grid' | 'row') => {
    setViewMode(mode);
    try {
      localStorage.setItem('hrms_designations_view_mode', mode);
    } catch {}
  };

  // Dynamic Career Levels State
  const [careerLevels, setCareerLevels] = useState<CareerLevelItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LEVELS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_LEVELS;
  });

  // Level Management Modal State
  const [levelManagerOpen, setLevelManagerOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CareerLevelItem | null>(null);
  const [levelForm, setLevelForm] = useState({ name: '', code: '', color: 'purple', description: '' });

  // Quick Inline Adders for Designation Modal
  const [quickAddDeptMode, setQuickAddDeptMode] = useState(false);
  const [quickDeptName, setQuickDeptName] = useState('');
  const [quickDeptCode, setQuickDeptCode] = useState('');
  const [creatingQuickDept, setCreatingQuickDept] = useState(false);

  const [quickAddLevelMode, setQuickAddLevelMode] = useState(false);
  const [quickLevelName, setQuickLevelName] = useState('');

  // Designation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDesg, setEditingDesg] = useState<DesignationItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    level: '',
    description: '',
  });

  // Mapped Staff Modal
  const [viewStaffDesg, setViewStaffDesg] = useState<DesignationItem | null>(null);

  const saveCareerLevels = (levels: CareerLevelItem[]) => {
    setCareerLevels(levels);
    try {
      localStorage.setItem(STORAGE_LEVELS_KEY, JSON.stringify(levels));
    } catch (e) {
      console.error('Failed to persist career levels', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [desgsRes, deptsRes] = await Promise.all([
        hrmsApi.getDesignations().catch(() => []),
        hrmsApi.getDepartments().catch(() => []),
      ]);
      const desgsList = Array.isArray(desgsRes) ? desgsRes : [];
      const deptsList = Array.isArray(deptsRes) ? deptsRes : [];

      setDesignations(desgsList);
      setDepartments(deptsList);

      // Dynamically merge any unique levels found in existing DB designations
      const existingLevelNames = new Set(careerLevels.map((l) => l.name.toLowerCase()));
      const newDiscoveredLevels: CareerLevelItem[] = [];
      desgsList.forEach((d) => {
        if (d.level && !existingLevelNames.has(d.level.toLowerCase())) {
          existingLevelNames.add(d.level.toLowerCase());
          newDiscoveredLevels.push({
            id: `lvl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: d.level,
            code: d.level.substring(0, 4).toUpperCase(),
            color: 'blue',
            description: `Custom Level: ${d.level}`,
          });
        }
      });
      if (newDiscoveredLevels.length > 0) {
        saveCareerLevels([...careerLevels, ...newDiscoveredLevels]);
      }
    } catch (err) {
      console.error('Failed to load designations data', err);
      setDesignations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingDesg(null);
    setQuickAddDeptMode(false);
    setQuickAddLevelMode(false);
    const defaultDept = departments.length > 0 ? departments[0].name : '';
    const defaultLevel = careerLevels.length > 0 ? careerLevels[0].name : '';
    setFormData({
      title: '',
      department: defaultDept,
      level: defaultLevel,
      description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (desg: DesignationItem) => {
    setEditingDesg(desg);
    setQuickAddDeptMode(false);
    setQuickAddLevelMode(false);
    setFormData({
      title: desg.title || '',
      department: desg.department || (departments[0]?.name || ''),
      level: desg.level || (careerLevels[0]?.name || ''),
      description: desg.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      if (editingDesg) {
        await hrmsApi.updateDesignation(editingDesg.id, formData);
      } else {
        await hrmsApi.createDesignation(formData);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Save designation error', err);
      alert(err?.response?.data?.detail || 'Failed to save designation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (desgId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete designation "${title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await hrmsApi.deleteDesignation(desgId);
      fetchData();
    } catch (err: any) {
      console.error('Delete designation error', err);
      alert(err?.response?.data?.detail || 'Failed to delete designation.');
    }
  };

  // Quick Inline Department Creator
  const handleQuickCreateDept = async () => {
    if (!quickDeptName.trim()) return;
    setCreatingQuickDept(true);
    try {
      const code = quickDeptCode.trim() || quickDeptName.substring(0, 4).toUpperCase();
      await hrmsApi.createDepartment({
        name: quickDeptName.trim(),
        code,
        description: `${quickDeptName.trim()} department`,
      });
      const updatedDepts = await hrmsApi.getDepartments();
      const list = Array.isArray(updatedDepts) ? updatedDepts : [];
      setDepartments(list);
      setFormData((prev) => ({ ...prev, department: quickDeptName.trim() }));
      setQuickDeptName('');
      setQuickDeptCode('');
      setQuickAddDeptMode(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create department');
    } finally {
      setCreatingQuickDept(false);
    }
  };

  // Quick Inline Level Creator
  const handleQuickCreateLevel = () => {
    if (!quickLevelName.trim()) return;
    const name = quickLevelName.trim();
    const existing = careerLevels.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      const newLvl: CareerLevelItem = {
        id: `lvl_${Date.now()}`,
        name,
        code: name.substring(0, 4).toUpperCase(),
        color: 'purple',
        description: `Custom defined level: ${name}`,
      };
      const updated = [...careerLevels, newLvl];
      saveCareerLevels(updated);
    }
    setFormData((prev) => ({ ...prev, level: name }));
    setQuickLevelName('');
    setQuickAddLevelMode(false);
  };

  // Career Levels Manager Functions
  const handleOpenLevelManager = () => {
    setEditingLevel(null);
    setLevelForm({ name: '', code: '', color: 'purple', description: '' });
    setLevelManagerOpen(true);
  };

  const handleEditLevel = (level: CareerLevelItem) => {
    setEditingLevel(level);
    setLevelForm({
      name: level.name,
      code: level.code,
      color: level.color || 'purple',
      description: level.description || '',
    });
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm.name.trim()) return;

    if (editingLevel) {
      const oldName = editingLevel.name;
      const updatedList = careerLevels.map((l) =>
        l.id === editingLevel.id
          ? {
              ...l,
              name: levelForm.name.trim(),
              code: levelForm.code.trim() || levelForm.name.substring(0, 4).toUpperCase(),
              color: levelForm.color,
              description: levelForm.description.trim(),
            }
          : l
      );
      saveCareerLevels(updatedList);

      // Cascade rename to any designations with the old level name
      if (oldName !== levelForm.name.trim()) {
        const toUpdate = designations.filter((d) => d.level?.toLowerCase() === oldName.toLowerCase());
        for (const desg of toUpdate) {
          try {
            await hrmsApi.updateDesignation(desg.id, { ...desg, level: levelForm.name.trim() });
          } catch (e) {
            console.error('Failed to cascade level rename', e);
          }
        }
        fetchData();
      }
      setEditingLevel(null);
    } else {
      const newLvl: CareerLevelItem = {
        id: `lvl_${Date.now()}`,
        name: levelForm.name.trim(),
        code: levelForm.code.trim() || levelForm.name.substring(0, 4).toUpperCase(),
        color: levelForm.color,
        description: levelForm.description.trim(),
      };
      saveCareerLevels([...careerLevels, newLvl]);
    }
    setLevelForm({ name: '', code: '', color: 'purple', description: '' });
  };

  const handleDeleteLevel = (levelId: string, levelName: string) => {
    if (!window.confirm(`Are you sure you want to delete career level "${levelName}"?`)) {
      return;
    }
    const updated = careerLevels.filter((l) => l.id !== levelId);
    saveCareerLevels(updated);
    if (editingLevel?.id === levelId) {
      setEditingLevel(null);
      setLevelForm({ name: '', code: '', color: 'purple', description: '' });
    }
  };

  // Filter Designations
  const filteredDesignations = designations.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      (d.department || '').toLowerCase().includes(q) ||
      (d.level || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q);

    const matchesDept = deptFilter === 'ALL' || d.department.toLowerCase() === deptFilter.toLowerCase();
    const matchesLevel = levelFilter === 'ALL' || (d.level || '').toLowerCase() === levelFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesLevel;
  });

  // Unique departments for filters
  const dynamicDeptNames = Array.from(
    new Set([...departments.map((d) => d.name), ...designations.map((d) => d.department)].filter(Boolean))
  );

  // Dynamic Level Colors
  const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string; text: string; border: string; badge: string }> = {
      slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' },
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
    };
    return map[color] || map.purple;
  };

  const getLevelStyle = (lvlName: string) => {
    const found = careerLevels.find((l) => l.name.toLowerCase() === (lvlName || '').toLowerCase());
    if (found && found.color) {
      return getColorClasses(found.color);
    }
    const lower = (lvlName || '').toLowerCase();
    if (lower.includes('lead') || lower.includes('l4')) return getColorClasses('amber');
    if (lower.includes('exec') || lower.includes('head') || lower.includes('director')) return getColorClasses('rose');
    if (lower.includes('senior') || lower.includes('l3')) return getColorClasses('purple');
    if (lower.includes('mid') || lower.includes('l2')) return getColorClasses('blue');
    if (lower.includes('entry') || lower.includes('l1')) return getColorClasses('slate');
    return getColorClasses('indigo');
  };

  // KPI calculations
  const totalRoles = designations.length;
  const totalAssignedStaff = designations.reduce((acc, d) => acc + (d.employee_count || 0), 0);
  const departmentsCovered = dynamicDeptNames.length;
  const totalLevelsCount = careerLevels.length;

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* 1. Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <span>Roles &amp; Designations</span>
          </h2>
          <p className="text-xs text-navy-500 font-medium">
            Define role hierarchy, career levels, and department designations with dynamic staff mapping.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleOpenLevelManager}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Icon name="layers" size={15} className="text-purple-600" />
            <span>Manage Career Levels ({careerLevels.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Icon name="plus" size={15} />
            <span>Add Designation</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Total Designations</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="award" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalRoles}</div>
            <div className="text-[11px] font-medium text-navy-400">Configured job roles</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Assigned Staff</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon name="users" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalAssignedStaff}</div>
            <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <span>Mapped to active staff</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Career Levels</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="layers" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalLevelsCount}</div>
            <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
              <span>Customizable tiers</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Departments Covered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="building-2" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{departmentsCovered}</div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Operational units</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search and Dynamic Multi-Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-navy-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search designations, departments, levels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-navy-50/50 border border-navy-100 text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end text-xs">
          {dynamicDeptNames.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-navy-200 bg-white text-navy-700 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="ALL">All Departments ({dynamicDeptNames.length})</option>
              {dynamicDeptNames.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {careerLevels.length > 0 && (
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-navy-200 bg-white text-navy-700 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="ALL">All Career Levels ({careerLevels.length})</option>
              {careerLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.name}>
                  {lvl.name} {lvl.code ? `(${lvl.code})` : ''}
                </option>
              ))}
            </select>
          )}

          {(searchQuery || deptFilter !== 'ALL' || levelFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDeptFilter('ALL');
                setLevelFilter('ALL');
              }}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition"
              title="Reset Filters"
            >
              <Icon name="rotate-ccw" size={13} />
            </button>
          )}

          {/* Row / Grid View Toggle */}
          <div className="bg-navy-50 p-1 rounded-xl flex items-center border border-navy-100">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'grid'
                  ? 'bg-white text-purple-700 shadow-xs border border-navy-100 font-bold'
                  : 'text-navy-400 hover:text-navy-700'
              )}
              title="Grid View"
            >
              <Icon name="layout-grid" size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('row')}
              className={cn(
                'p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'row'
                  ? 'bg-white text-purple-700 shadow-xs border border-navy-100 font-bold'
                  : 'text-navy-400 hover:text-navy-700'
              )}
              title="Row / Table View"
            >
              <Icon name="list" size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Designations List / Grid or Row View */}
      {loading ? (
        <div className="p-12 text-center text-navy-400 text-xs flex flex-col items-center gap-2">
          <Icon name="loader" size={24} className="animate-spin text-purple-600" />
          <span>Loading designations...</span>
        </div>
      ) : filteredDesignations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-navy-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Icon name="award" size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-navy-900 text-base">No Designations Found</h3>
            <p className="text-xs text-navy-500 max-w-sm mx-auto mt-1">
              {searchQuery || deptFilter !== 'ALL' || levelFilter !== 'ALL'
                ? 'No roles match your search filters. Try clearing filters.'
                : 'Create customizable job designations to organize roles and assign staff.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <Icon name="plus" size={14} />
            <span>Add First Designation</span>
          </button>
        </div>
      ) : viewMode === 'row' ? (
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50/70 border-b border-navy-100 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Designation & Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Career Tier</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {filteredDesignations.map((desg) => {
                  const levelStyle = getLevelStyle(desg.level);
                  const employeesList = desg.employees || [];

                  return (
                    <tr key={desg.id} className="hover:bg-purple-50/20 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                            <Icon name="award" size={16} />
                          </div>
                          <div>
                            <div className="font-extrabold text-navy-900 text-sm group-hover:text-purple-700 transition">
                              {desg.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-navy-700 font-semibold">
                          <Icon name="building-2" size={13} className="text-navy-400" />
                          <span>{desg.department || <span className="text-navy-400 italic">General</span>}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase border',
                            levelStyle.bg,
                            levelStyle.text,
                            levelStyle.border
                          )}
                        >
                          <Icon name="layers" size={10} />
                          <span>{desg.level || 'Unassigned'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] text-navy-500 line-clamp-1">
                          {desg.description || <span className="italic text-navy-400">No description</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewStaffDesg(desg)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200/60 transition cursor-pointer"
                          >
                            <Icon name="users" size={12} />
                            <span>{desg.employee_count || 0} Staff</span>
                          </button>
                          {employeesList.length > 0 && (
                            <div className="hidden sm:flex items-center -space-x-1.5">
                              {employeesList.slice(0, 3).map((emp, eIdx) => (
                                <span
                                  key={emp.id || eIdx}
                                  className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[8px] flex items-center justify-center ring-2 ring-white shadow-2xs"
                                  title={emp.name}
                                >
                                  {emp.name.charAt(0)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewStaffDesg(desg)}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 hover:text-purple-700 border border-purple-200/60 transition cursor-pointer"
                            title="View Roster & Staff"
                          >
                            <Icon name="users" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(desg)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 border border-blue-200/60 transition cursor-pointer shadow-2xs"
                            title="Edit Designation"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(desg.id, desg.title)}
                            className="p-1.5 rounded-lg text-navy-400 hover:text-rose-600 hover:bg-rose-50 border border-navy-100 transition cursor-pointer"
                            title="Delete Designation"
                          >
                            <Icon name="trash-2" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDesignations.map((desg) => {
            const levelStyle = getLevelStyle(desg.level);
            return (
              <div
                key={desg.id}
                className="bg-white rounded-3xl p-5 border border-navy-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="space-y-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wide uppercase border',
                          levelStyle.bg,
                          levelStyle.text,
                          levelStyle.border
                        )}
                      >
                        <Icon name="layers" size={10} />
                        <span>{desg.level || 'Unassigned Level'}</span>
                      </span>
                      <h3 className="text-base font-extrabold text-navy-900 group-hover:text-purple-700 transition">
                        {desg.title}
                      </h3>
                      {desg.department && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-navy-500">
                          <Icon name="building-2" size={12} className="text-navy-400" />
                          <span>{desg.department}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(desg)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 font-bold text-xs transition cursor-pointer shadow-2xs"
                        title="Edit Designation"
                      >
                        <Icon name="edit" size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(desg.id, desg.title)}
                        className="p-1 rounded-lg text-navy-400 hover:text-rose-600 hover:bg-rose-50 border border-navy-100 transition cursor-pointer"
                        title="Delete Designation"
                      >
                        <Icon name="trash-2" size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {desg.description ? (
                    <p className="text-xs text-navy-600 font-medium line-clamp-2 mb-4 leading-relaxed bg-navy-50/40 p-2.5 rounded-xl border border-navy-100/60">
                      {desg.description}
                    </p>
                  ) : (
                    <p className="text-xs text-navy-400 italic mb-4">No description configured for this role.</p>
                  )}
                </div>

                {/* Footer / Mapped Staff Overview */}
                <div className="pt-3 border-t border-navy-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {desg.employees && desg.employees.length > 0 ? (
                        desg.employees.slice(0, 3).map((emp) => (
                          <div
                            key={emp.id}
                            className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-xs"
                            title={emp.name}
                          >
                            {emp.name.charAt(0)}
                          </div>
                        ))
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-400 font-bold text-[9px] flex items-center justify-center border border-navy-200">
                          0
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-navy-700">
                      {desg.employee_count || 0} Assigned Staff
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewStaffDesg(desg)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Roster</span>
                    <Icon name="chevron-right" size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Designation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="award" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">
                    {editingDesg ? 'Edit Designation' : 'Create New Designation'}
                  </h3>
                  <p className="text-xs text-navy-500">Configure job title, department assignment, and level</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-navy-700">Designation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Fitness Trainer, Head Coach"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              {/* Department Assignment with Dynamic Add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-navy-700">Department *</label>
                  {!quickAddDeptMode && (
                    <button
                      type="button"
                      onClick={() => setQuickAddDeptMode(true)}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="plus" size={11} />
                      <span>Create New Dept</span>
                    </button>
                  )}
                </div>

                {quickAddDeptMode ? (
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                      <span>Quick Add Department</span>
                      <button
                        type="button"
                        onClick={() => setQuickAddDeptMode(false)}
                        className="text-navy-400 hover:text-navy-600"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Department Name"
                        value={quickDeptName}
                        onChange={(e) => setQuickDeptName(e.target.value)}
                        className="col-span-2 px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Code (e.g. FIT)"
                        value={quickDeptCode}
                        onChange={(e) => setQuickDeptCode(e.target.value.toUpperCase())}
                        className="px-2 py-1.5 rounded-lg border border-purple-200 bg-white text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={creatingQuickDept || !quickDeptName.trim()}
                      onClick={handleQuickCreateDept}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50"
                    >
                      {creatingQuickDept ? 'Creating...' : 'Save & Select Department'}
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold"
                  >
                    {departments.length === 0 && <option value="">No departments found — Create one</option>}
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Career Level Assignment with Dynamic Add */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-navy-700">Career Level *</label>
                  {!quickAddLevelMode && (
                    <button
                      type="button"
                      onClick={() => setQuickAddLevelMode(true)}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="plus" size={11} />
                      <span>Add New Level</span>
                    </button>
                  )}
                </div>

                {quickAddLevelMode ? (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span>Add Custom Career Level</span>
                      <button
                        type="button"
                        onClick={() => setQuickAddLevelMode(false)}
                        className="text-navy-400 hover:text-navy-600"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Associate Director, Level 4"
                        value={quickLevelName}
                        onChange={(e) => setQuickLevelName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        disabled={!quickLevelName.trim()}
                        onClick={handleQuickCreateLevel}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold"
                  >
                    {careerLevels.length === 0 && <option value="">No levels defined — Add one</option>}
                    {careerLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.name}>
                        {lvl.name} {lvl.code ? `(${lvl.code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy-700">Job Role &amp; Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Specify the key deliverables, qualification expectations, and duties for this role..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-navy-200 hover:bg-navy-50 text-navy-600 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingDesg ? 'Save Changes' : 'Create Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Career Levels Manager Modal (Full Add / Edit / Delete) */}
      {levelManagerOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="layers" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">Career Levels Manager</h3>
                  <p className="text-xs text-navy-500">Create, customize, edit, and delete organization career tiers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLevelManagerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Add / Edit Level Form */}
            <form onSubmit={handleSaveLevel} className="bg-navy-50/60 p-4 rounded-2xl border border-navy-100 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy-900">
                  {editingLevel ? `Editing: ${editingLevel.name}` : 'Add New Career Level'}
                </span>
                {editingLevel && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLevel(null);
                      setLevelForm({ name: '', code: '', color: 'purple', description: '' });
                    }}
                    className="text-[11px] font-bold text-navy-500 hover:text-navy-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-navy-700">Level Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Specialist, Director"
                    value={levelForm.name}
                    onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Code / Tier</label>
                  <input
                    type="text"
                    placeholder="e.g. L3, DIR"
                    value={levelForm.code}
                    onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Badge Color Theme</label>
                  <select
                    value={levelForm.color}
                    onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="purple">Purple Theme (Specialist / Senior)</option>
                    <option value="blue">Blue Theme (Mid-Level / Core)</option>
                    <option value="amber">Amber Theme (Leadership / Lead)</option>
                    <option value="rose">Rose Theme (Executive / Director)</option>
                    <option value="emerald">Emerald Theme (Growth / Advisory)</option>
                    <option value="slate">Slate Theme (Entry Level / Support)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Description / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Independent specialists with 3+ yrs experience"
                    value={levelForm.description}
                    onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {editingLevel ? 'Update Career Level' : 'Add Career Level'}
                </button>
              </div>
            </form>

            {/* List of Defined Career Levels */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              <div className="text-xs font-bold text-navy-700 mb-1">Defined Career Levels ({careerLevels.length})</div>
              {careerLevels.length === 0 ? (
                <div className="p-6 text-center text-xs text-navy-400 border border-dashed border-navy-200 rounded-2xl">
                  No career levels defined yet. Add your first level above.
                </div>
              ) : (
                <div className="divide-y divide-navy-100 border border-navy-100 rounded-2xl overflow-hidden">
                  {careerLevels.map((lvl) => {
                    const style = getColorClasses(lvl.color);
                    const associatedCount = designations.filter(
                      (d) => d.level?.toLowerCase() === lvl.name.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={lvl.id}
                        className="p-3 bg-white hover:bg-navy-50/50 flex items-center justify-between gap-3 text-xs transition"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border',
                              style.bg,
                              style.text,
                              style.border
                            )}
                          >
                            {lvl.code || 'LVL'}
                          </span>
                          <div>
                            <div className="font-extrabold text-navy-900">{lvl.name}</div>
                            <div className="text-[11px] text-navy-500">{lvl.description || 'No description'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-navy-400 bg-navy-50 px-2 py-0.5 rounded-lg border border-navy-100">
                            {associatedCount} Role{associatedCount === 1 ? '' : 's'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditLevel(lvl)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-navy-400 hover:text-purple-600 transition cursor-pointer"
                            title="Edit Level"
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLevel(lvl.id, lvl.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-navy-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Level"
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-navy-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLevelManagerOpen(false)}
                className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                Close &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Mapped Staff Modal */}
      {viewStaffDesg && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="award" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">
                    {viewStaffDesg.title} — Assigned Staff
                  </h3>
                  <p className="text-xs text-navy-500">
                    {viewStaffDesg.employee_count} staff member(s) holding this designation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewStaffDesg(null)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-2.5 flex-1 pr-1">
              {!viewStaffDesg.employees || viewStaffDesg.employees.length === 0 ? (
                <div className="p-8 text-center text-xs text-navy-400 border border-dashed border-navy-200 rounded-2xl">
                  No staff members currently assigned to {viewStaffDesg.title}.
                </div>
              ) : (
                <div className="divide-y divide-navy-50 border border-navy-100 rounded-2xl overflow-hidden">
                  {viewStaffDesg.employees.map((emp) => {
                    const initials = emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={emp.id}
                        className="p-3.5 bg-white hover:bg-navy-50/50 flex items-center justify-between gap-3 text-xs transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-navy-900 flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {emp.code && (
                                <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200/60">
                                  {emp.code}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-navy-400">{emp.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-navy-800 text-xs">
                              {emp.department || viewStaffDesg.department}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600">{emp.status || 'Active'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-navy-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-navy-500 font-medium">
                Career Level: <strong className="font-bold text-purple-700">{viewStaffDesg.level}</strong>
              </span>
              <button
                type="button"
                onClick={() => setViewStaffDesg(null)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
