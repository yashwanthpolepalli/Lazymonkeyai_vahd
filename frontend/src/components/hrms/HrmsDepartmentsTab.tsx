import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { hrmsApi, DepartmentItem, MappedEmployee } from '@/services/hrmsApi';

export function HrmsDepartmentsTab() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head_name: '',
    is_active: true,
  });

  // Mapped Employees View Modal
  const [viewEmployeesDept, setViewEmployeesDept] = useState<DepartmentItem | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await hrmsApi.getDepartments();
      setDepartments(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load departments', err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      head_name: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      head_name: dept.head_name,
      is_active: dept.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingDept) {
        await hrmsApi.updateDepartment(editingDept.id, formData);
      } else {
        await hrmsApi.createDepartment(formData);
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      console.error('Save department error', err);
      alert(err?.response?.data?.detail || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Are you sure you want to delete department "${deptName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await hrmsApi.deleteDepartment(deptId);
      fetchDepartments();
    } catch (err: any) {
      console.error('Delete department error', err);
      alert(err?.response?.data?.detail || 'Failed to delete department.');
    }
  };

  // Filter departments
  const filteredDepartments = departments.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.head_name.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && d.is_active !== false) ||
      (statusFilter === 'INACTIVE' && d.is_active === false);

    return matchesSearch && matchesStatus;
  });

  // Dynamic KPI calculations
  const totalDepts = departments.length;
  const totalEmployeesMapped = departments.reduce((acc, d) => acc + (d.employee_count || 0), 0);
  const activeDepts = departments.filter((d) => d.is_active !== false).length;
  const largestDept = departments.length > 0
    ? [...departments].sort((a, b) => (b.employee_count || 0) - (a.employee_count || 0))[0]
    : null;

  const colorPalettes = [
    { bg: 'bg-purple-50 text-purple-700 border-purple-200', tag: 'bg-purple-100 text-purple-800' },
    { bg: 'bg-blue-50 text-blue-700 border-blue-200', tag: 'bg-blue-100 text-blue-800' },
    { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' },
    { bg: 'bg-amber-50 text-amber-700 border-amber-200', tag: 'bg-amber-100 text-amber-800' },
    { bg: 'bg-rose-50 text-rose-700 border-rose-200', tag: 'bg-rose-100 text-rose-800' },
  ];

  return (
    <div className="space-y-4 animate-fade-in font-sans">
      {/* 1. Header & Add Department Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <span>Departments</span>
          </h2>
          <p className="text-xs text-navy-500 font-medium">
            Manage organizational departments, leadership heads, and mapped staff assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Icon name="plus" size={15} />
          <span>Add Department</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Total Departments</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="building-2" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalDepts}</div>
            <div className="text-[11px] font-medium text-navy-400">Configured business units</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Mapped Staff</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon name="users" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalEmployeesMapped}</div>
            <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <span>Assigned across units</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Active Units</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="check-circle" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{activeDepts}</div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>{activeDepts} of {totalDepts} operational</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Largest Department</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="award" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-black text-navy-900 truncate">
              {largestDept ? largestDept.name : 'N/A'}
            </div>
            <div className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
              <span>{largestDept?.employee_count || 0} staff members</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar and Status Filters */}
      <div className="bg-white p-3 rounded-2xl border border-navy-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search departments by name, code, head..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-navy-50/50 border border-navy-100 text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="bg-navy-50 p-1 rounded-xl flex items-center gap-1 border border-navy-100 text-xs">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer',
                  statusFilter === st
                    ? 'bg-white text-purple-700 shadow-xs border border-navy-100'
                    : 'text-navy-500 hover:text-navy-900'
                )}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchDepartments}
            className="p-2 rounded-xl border border-navy-100 hover:bg-navy-50 text-navy-600 transition shadow-2xs cursor-pointer"
            title="Refresh Departments"
          >
            <Icon name="refresh-cw" size={15} />
          </button>
        </div>
      </div>

      {/* 4. Departments Grid */}
      {loading ? (
        <div className="card p-12 text-center text-xs font-semibold text-navy-400 bg-white rounded-2xl border border-navy-100">
          Loading departments...
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto">
            <Icon name="building-2" size={24} />
          </div>
          <div className="text-sm font-bold text-navy-900">No Departments Found</div>
          <p className="text-xs text-navy-400 max-w-sm mx-auto">
            {searchQuery ? 'No departments match your search filter.' : 'Click "Add Department" to configure your first organizational department.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Icon name="plus" size={15} /> Add First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map((dept, idx) => {
            const palette = colorPalettes[idx % colorPalettes.length];
            const employeesList = dept.employees || [];

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-black font-mono border', palette.bg)}>
                      {dept.code || 'DEPT'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border',
                          dept.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-navy-50 text-navy-500 border-navy-200'
                        )}
                      >
                        {dept.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-navy-900 group-hover:text-purple-700 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs text-navy-500 mt-1 line-clamp-2 leading-relaxed">
                      {dept.description || 'Organizational operational division.'}
                    </p>
                  </div>
                </div>

                {/* Head of Department */}
                <div className="p-3 bg-navy-50/60 rounded-xl border border-navy-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white border border-navy-200 flex items-center justify-center text-navy-600 shadow-2xs">
                      <Icon name="user-check" size={13} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-navy-400">Head of Dept</div>
                      <div className="font-bold text-navy-900 text-xs">{dept.head_name || 'Unassigned'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-navy-400">Total Staff</div>
                    <div className="font-black text-purple-700 text-xs">{dept.employee_count} Members</div>
                  </div>
                </div>

                {/* Mapped Employees Avatars Preview */}
                <div className="space-y-2 pt-1 border-t border-navy-50">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-navy-500">
                    <span>Mapped Employees</span>
                    <button
                      type="button"
                      onClick={() => setViewEmployeesDept(dept)}
                      className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                    >
                      View All ({dept.employee_count})
                    </button>
                  </div>

                  {employeesList.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {employeesList.slice(0, 4).map((emp, eIdx) => {
                        const initials = emp.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase();
                        return (
                          <div
                            key={emp.id || eIdx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-navy-50 border border-navy-100 text-[11px] font-medium text-navy-800"
                            title={`${emp.name} (${emp.designation || 'Staff'})`}
                          >
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                              {initials}
                            </span>
                            <span className="truncate max-w-[90px]">{emp.name.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                      {employeesList.length > 4 && (
                        <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold">
                          +{employeesList.length - 4} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-navy-400 italic">No employees assigned yet.</div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewEmployeesDept(dept)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition border border-purple-200/60 cursor-pointer shadow-2xs"
                  >
                    <Icon name="users" size={13} />
                    <span>View Staff ({dept.employee_count})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1.5 rounded-xl text-navy-500 hover:text-blue-600 hover:bg-blue-50 border border-navy-100 transition cursor-pointer"
                      title="Edit Department"
                    >
                      <Icon name="pen" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-1.5 rounded-xl text-navy-500 hover:text-rose-600 hover:bg-rose-50 border border-navy-100 transition cursor-pointer"
                      title="Delete Department"
                    >
                      <Icon name="trash-2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="building-2" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">
                    {editingDept ? 'Edit Department' : 'Create New Department'}
                  </h3>
                  <p className="text-xs text-navy-500">Configure department details and leadership</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-navy-700">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fitness & Training"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-navy-700">Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FITN, OPS, MGMT"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy-700">Department Head / Manager</label>
                <input
                  type="text"
                  placeholder="e.g. Yashwanth Kumar"
                  value={formData.head_name}
                  onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy-700">Description & Role Scope</label>
                <textarea
                  rows={3}
                  placeholder="Describe the department responsibilities, operations, and team focus..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="deptActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-navy-300 cursor-pointer"
                />
                <label htmlFor="deptActive" className="text-xs font-bold text-navy-800 cursor-pointer">
                  Department is currently Active &amp; Operational
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-navy-200 hover:bg-navy-50 text-navy-600 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Mapped Employees Drawer / Modal */}
      {viewEmployeesDept && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="users" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">
                    {viewEmployeesDept.name} — Staff Roster
                  </h3>
                  <p className="text-xs text-navy-500">
                    {viewEmployeesDept.employee_count} employee(s) mapped to this department
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewEmployeesDept(null)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-2.5 flex-1 pr-1">
              {(!viewEmployeesDept.employees || viewEmployeesDept.employees.length === 0) ? (
                <div className="p-8 text-center text-xs text-navy-400 border border-dashed border-navy-200 rounded-2xl">
                  No employees currently mapped to {viewEmployeesDept.name}.
                </div>
              ) : (
                <div className="divide-y divide-navy-50 border border-navy-100 rounded-2xl overflow-hidden">
                  {viewEmployeesDept.employees.map((emp) => {
                    const initials = emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <div key={emp.id} className="p-3.5 bg-white hover:bg-navy-50/50 flex items-center justify-between gap-3 text-xs transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
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
                            <div className="font-semibold text-navy-800 text-xs">{emp.designation || 'Staff'}</div>
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
              <span className="text-navy-500 font-medium">Department Code: <strong className="font-mono text-purple-700">{viewEmployeesDept.code}</strong></span>
              <button
                type="button"
                onClick={() => setViewEmployeesDept(null)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-sm"
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
