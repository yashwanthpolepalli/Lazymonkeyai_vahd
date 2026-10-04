import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import {
  hrmsApi,
  type AttendanceCorrectionItem,
  type AttendanceCorrectionStats,
  type EmployeeItem,
} from '@/services/hrmsApi';
import { membersApi, type CustomerView } from '@/services/membersApi';

interface HrmsAttendanceCorrectionsTabProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsAttendanceCorrectionsTab({ onSuccessToast }: HrmsAttendanceCorrectionsTabProps) {
  // View mode: Grid View vs Row (Table) View
  const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
    const saved = localStorage.getItem('vahd_attendance_corrections_view');
    return saved === 'row' ? 'row' : 'grid';
  });

  // Filter States
  const todayIso = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<string>(todayIso);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [personTypeFilter, setPersonTypeFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [reasonFilter, setReasonFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Data States
  const [records, setRecords] = useState<AttendanceCorrectionItem[]>([]);
  const [stats, setStats] = useState<AttendanceCorrectionStats>({
    total_records: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    present: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Directory for quick selection in modal
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [students, setStudents] = useState<CustomerView[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AttendanceCorrectionItem | null>(null);
  const [rejectModalRecord, setRejectModalRecord] = useState<AttendanceCorrectionItem | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('');

  // New correction form state (100% dynamic, zero hardcoded defaults)
  const [newForm, setNewForm] = useState({
    person_type: 'EMPLOYEE' as 'EMPLOYEE' | 'STUDENT',
    selected_entity_id: '',
    person_name: '',
    person_code: '',
    designation: '',
    department: '',
    district: '',
    place: '',
    date: todayIso,
    in_time: '',
    out_time: '',
    reason: '',
    reason_details: '',
  });

  const handleToggleViewMode = (mode: 'grid' | 'row') => {
    setViewMode(mode);
    localStorage.setItem('vahd_attendance_corrections_view', mode);
  };

  const showToast = (msg: string) => {
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Fetch real employees and students for dropdown selection
  useEffect(() => {
    hrmsApi.getEmployees().then(setEmployees).catch(() => setEmployees([]));
    membersApi.getCustomers().then(setStudents).catch(() => setStudents([]));
  }, []);

  // Fetch correction records & statistics
  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        hrmsApi.getAttendanceCorrections({
          date: dateFilter || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
          person_type: personTypeFilter === 'ALL' ? undefined : personTypeFilter,
          district: districtFilter === 'All' ? undefined : districtFilter,
          reason: reasonFilter === 'All' ? undefined : reasonFilter,
          search: appliedSearch || undefined,
        }),
        hrmsApi.getAttendanceCorrectionsStats({
          date: dateFilter || undefined,
        }),
      ]);

      setRecords(data || []);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load attendance corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter, statusFilter, personTypeFilter, districtFilter, reasonFilter, appliedSearch]);

  // Extract distinct districts and places strictly from real database records
  const distinctDistricts = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      const trimmed = (r.district || '').trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Extract distinct reasons strictly from real database records
  const distinctReasons = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => {
      const trimmed = (r.reason || '').trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Actions: Approve
  const handleApprove = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      await hrmsApi.approveAttendanceCorrection(id, { approved_by: 'Administrator' });
      showToast(`✓ Attendance approved for ${name}`);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'Approved', approved_by: 'Administrator' } : r))
      );
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1,
      }));
    } catch (err) {
      console.error('Approve failed:', err);
      showToast('❌ Failed to approve attendance');
    } finally {
      setProcessingId(null);
    }
  };

  // Actions: Reject
  const handleOpenRejectModal = (rec: AttendanceCorrectionItem) => {
    setRejectModalRecord(rec);
    setRejectionReasonText('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalRecord) return;
    const id = rejectModalRecord.id;
    const name = rejectModalRecord.person_name;
    setProcessingId(id);
    try {
      await hrmsApi.rejectAttendanceCorrection(id, { rejection_reason: rejectionReasonText });
      showToast(`✗ Attendance rejected for ${name}`);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'Rejected', rejection_reason: rejectionReasonText } : r))
      );
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1,
      }));
      setRejectModalRecord(null);
    } catch (err) {
      console.error('Reject failed:', err);
      showToast('❌ Failed to reject attendance');
    } finally {
      setProcessingId(null);
    }
  };

  // Batch Approve
  const handleBatchApprove = async () => {
    const pendingToApprove = selectedIds.length > 0
      ? selectedIds
      : records.filter((r) => r.status === 'Pending').map((r) => r.id);

    if (pendingToApprove.length === 0) {
      showToast('No pending attendance records to approve');
      return;
    }

    setLoading(true);
    try {
      await hrmsApi.batchApproveAttendanceCorrections({ ids: pendingToApprove, approved_by: 'Administrator' });
      showToast(`✓ Batch approved ${pendingToApprove.length} attendance records`);
      setSelectedIds([]);
      await fetchData();
    } catch (err) {
      console.error('Batch approve failed:', err);
      showToast('❌ Failed to execute batch approvals');
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setDateFilter(todayIso);
    setStatusFilter('Pending');
    setPersonTypeFilter('ALL');
    setDistrictFilter('All');
    setReasonFilter('All');
    setSearchQuery('');
    setAppliedSearch('');
  };

  // Handle entity selection in modal
  const handleSelectEntity = (entityId: string) => {
    if (!entityId) {
      setNewForm((prev) => ({
        ...prev,
        selected_entity_id: '',
        person_name: '',
        person_code: '',
        designation: '',
        department: '',
      }));
      return;
    }

    if (newForm.person_type === 'EMPLOYEE') {
      const emp = employees.find((e) => e.id === entityId);
      if (emp) {
        setNewForm((prev) => ({
          ...prev,
          selected_entity_id: emp.id,
          person_name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
          person_code: emp.code || '',
          designation: emp.designation || '',
          department: emp.department || '',
          district: emp.gym_branch || prev.district,
        }));
      }
    } else {
      const st = students.find((s) => s.id === entityId);
      if (st) {
        setNewForm((prev) => ({
          ...prev,
          selected_entity_id: st.id,
          person_name: st.name || '',
          person_code: st.member_id || '',
          designation: 'Student',
          department: st.batch || st.status || '',
        }));
      }
    }
  };

  // Create New Request Submit
  const handleCreateNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.person_name.trim()) {
      showToast('Please enter person name');
      return;
    }
    if (!newForm.reason.trim()) {
      showToast('Please specify the reason for correction');
      return;
    }
    setLoading(true);
    try {
      await hrmsApi.createAttendanceCorrection(newForm);
      showToast('✓ Attendance correction submitted successfully');
      setShowAddModal(false);
      setNewForm({
        person_type: 'EMPLOYEE',
        selected_entity_id: '',
        person_name: '',
        person_code: '',
        designation: '',
        department: '',
        district: '',
        place: '',
        date: todayIso,
        in_time: '',
        out_time: '',
        reason: '',
        reason_details: '',
      });
      await fetchData();
    } catch (err) {
      console.error('Create correction failed:', err);
      showToast('❌ Failed to submit attendance correction');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection for row table batching
  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Date formatting for subtitle
  const formattedSubtitleDate = (() => {
    try {
      const d = dateFilter ? new Date(dateFilter) : new Date();
      return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  })();

  // Deterministic dynamic reason badge palette hashing (No hardcoded strings)
  const getReasonBadgeStyle = (reasonStr: string) => {
    if (!reasonStr) return 'bg-slate-100 text-slate-700 border-slate-200';
    const palettes = [
      'bg-sky-50 text-sky-800 border-sky-200',
      'bg-purple-50 text-purple-800 border-purple-200',
      'bg-blue-50 text-blue-800 border-blue-200',
      'bg-teal-50 text-teal-800 border-teal-200',
      'bg-indigo-50 text-indigo-800 border-indigo-200',
      'bg-amber-50 text-amber-800 border-amber-200',
      'bg-emerald-50 text-emerald-800 border-emerald-200',
      'bg-rose-50 text-rose-800 border-rose-200',
      'bg-cyan-50 text-cyan-800 border-cyan-200',
      'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    ];
    let hash = 0;
    for (let i = 0; i < reasonStr.length; i++) {
      hash = reasonStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-10">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & TITLE                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Attendance Approve</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Mark attendance — <span className="font-semibold text-slate-700">{formattedSubtitleDate}</span>
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Icon name="plus" size={14} className="text-purple-600" />
            <span>Add Correction Request</span>
          </button>

          {stats.pending > 0 && (
            <button
              type="button"
              onClick={handleBatchApprove}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Icon name="check-circle" size={14} />
              <span>Approve All Pending ({stats.pending})</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TOP 4 KPI CARDS                                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* TOTAL RECORDS CARD */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400" />
          <div className="text-[10px] font-black tracking-wider uppercase text-slate-500 mb-1">
            TOTAL RECORDS
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {stats.total_records}
          </div>
        </div>

        {/* PENDING CARD */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="text-[10px] font-black tracking-wider uppercase text-slate-500 mb-1">
            PENDING
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {stats.pending}
          </div>
        </div>

        {/* APPROVED CARD */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="text-[10px] font-black tracking-wider uppercase text-slate-500 mb-1">
            APPROVED
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {stats.approved}
          </div>
        </div>

        {/* PRESENT / REJECTED CARD */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <div className="text-[10px] font-black tracking-wider uppercase text-slate-500 mb-1">
            PRESENT
          </div>
          <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900">
            {stats.present}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FILTER BAR                                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* DATE FILTER */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              DATE
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* SCOPE FILTER (STUDENTS / EMPLOYEES / ALL) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              TYPE / SCOPE
            </label>
            <select
              value={personTypeFilter}
              onChange={(e) => setPersonTypeFilter(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition cursor-pointer"
            >
              <option value="ALL">👥 All (Students &amp; Employees)</option>
              <option value="EMPLOYEE">👨‍💼 Employees &amp; Staff Only</option>
              <option value="STUDENT">🎓 Students Only</option>
            </select>
          </div>

          {/* STATUS FILTER */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              STATUS
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All Statuses</option>
            </select>
          </div>

          {/* DISTRICT / BRANCH FILTER (Dynamically populated from actual records) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              DISTRICT / BRANCH
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition cursor-pointer"
            >
              <option value="All">All Districts &amp; Branches</option>
              {distinctDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* REASON FILTER (Dynamically populated from actual records) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              REASON
            </label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition cursor-pointer"
            >
              <option value="All">All Reasons</option>
              {distinctReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* SEARCH & ACTIONS */}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase text-slate-500">
              SEARCH
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Name, code / roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setAppliedSearch(searchQuery);
                }}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setAppliedSearch(searchQuery)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shrink-0 cursor-pointer shadow-xs"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Switcher and Records Summary Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>Showing <span className="font-bold text-slate-900">{records.length}</span> records</span>
            {selectedIds.length > 0 && (
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-purple-200">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          {/* Row View vs Grid View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon name="layout-grid" size={14} />
              <span>Grid View</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('row')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                viewMode === 'row'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon name="list" size={14} />
              <span>Row View</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN CONTENT: GRID VIEW OR ROW VIEW                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loading && records.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-9 h-9 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading attendance records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Icon name="calendar-check" size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Attendance Records Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are no attendance correction requests matching the selected filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-xs hover:bg-purple-700 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ───────────────────────────────────────────────────────────── */
        /* 4A. GRID VIEW                                                 */
        /* ───────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {records.map((rec) => {
            const isPending = rec.status === 'Pending';
            const isApproved = rec.status === 'Approved';
            const isBusy = processingId === rec.id;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {/* Card Top: Avatar + Details + Action Buttons */}
                <div className="flex items-start gap-2.5">
                  {/* Avatar with Role Overlay */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
                      {rec.avatar ? (
                        <img
                          src={rec.avatar}
                          alt={rec.person_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xs text-purple-700 bg-purple-50">
                          {rec.person_name ? rec.person_name.slice(0, 2).toUpperCase() : '??'}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px] text-white shadow-xs",
                      rec.person_type === 'STUDENT' ? "bg-amber-500" : "bg-blue-600"
                    )}>
                      {rec.person_type === 'STUDENT' ? '🎓' : '👤'}
                    </div>
                  </div>

                  {/* Person Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 truncate" title={rec.person_name}>
                      {rec.person_name}
                    </h3>
                    <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={`${rec.designation} · ${rec.person_code}`}>
                      {rec.designation || (rec.person_type === 'STUDENT' ? 'Student' : 'Staff')}
                      {rec.person_code && ` · ${rec.person_code}`}
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-mono mt-1 space-y-0.5">
                      {rec.in_time && (
                        <div>
                          <span className="font-semibold text-slate-600">In:</span> {rec.in_time}{' '}
                          {rec.district && (
                            <span className="ml-1 text-slate-500">
                              <span className="font-semibold text-slate-600">Dist:</span> {rec.district}
                            </span>
                          )}
                        </div>
                      )}
                      {rec.place && (
                        <div className="truncate" title={`Place: ${rec.place}`}>
                          <span className="font-semibold text-slate-600">Place:</span> {rec.place}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Approve & Reject */}
                  <div className="flex flex-col gap-1.5 shrink-0 pl-1">
                    {isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(rec.id, rec.person_name)}
                          title="Approve Attendance"
                          className="w-7 h-7 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          <Icon name="check" size={14} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleOpenRejectModal(rec)}
                          title="Reject Attendance"
                          className="w-7 h-7 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          <Icon name="x" size={14} className="stroke-[3]" />
                        </button>
                      </>
                    ) : isApproved ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Icon name="check" size={10} /> Approved
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <Icon name="x" size={10} /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Reason Pill */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                  {rec.reason ? (
                    <div className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold border truncate max-w-full",
                      getReasonBadgeStyle(rec.reason)
                    )}>
                      <span className="font-semibold text-slate-500">Reason:</span>{' '}
                      <span className="font-black">{rec.reason}</span>
                      {rec.reason_details && (
                        <span className="text-slate-500 font-normal italic ml-1">
                          "{rec.reason_details.length > 20 ? `${rec.reason_details.slice(0, 20)}...` : rec.reason_details}"
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No reason provided</div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedRecordForDetail(rec)}
                    title="View Full Details"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Icon name="info" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* 4B. ROW TABLE VIEW                                            */
        /* ───────────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === records.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="py-3 px-3">PERSON</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">DESIGNATION &amp; CODE</th>
                  <th className="py-3 px-3">DISTRICT &amp; PLACE</th>
                  <th className="py-3 px-3">IN / OUT TIME</th>
                  <th className="py-3 px-3">REASON &amp; NOTES</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {records.map((rec) => {
                  const isSelected = selectedIds.includes(rec.id);
                  const isPending = rec.status === 'Pending';
                  const isApproved = rec.status === 'Approved';

                  return (
                    <tr
                      key={rec.id}
                      className={cn(
                        "hover:bg-slate-50/70 transition",
                        isSelected && "bg-purple-50/50"
                      )}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(rec.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            {rec.avatar ? (
                              <img src={rec.avatar} alt={rec.person_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-purple-700">
                                {rec.person_name ? rec.person_name.slice(0, 2).toUpperCase() : '??'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{rec.person_name}</div>
                            <div className="text-[10px] text-slate-400">{rec.department || '--'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                          rec.person_type === 'STUDENT'
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        )}>
                          {rec.person_type === 'STUDENT' ? 'Student' : 'Employee'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{rec.designation || '--'}</div>
                        <div className="text-[10px] font-mono text-slate-400">{rec.person_code || '--'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{rec.district || '--'}</div>
                        <div className="text-[10px] text-slate-500">{rec.place || '--'}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        <div className="text-emerald-700 font-semibold">{rec.in_time ? `In: ${rec.in_time}` : '--'}</div>
                        <div className="text-slate-400 text-[10px]">{rec.out_time ? `Out: ${rec.out_time}` : '--'}</div>
                      </td>
                      <td className="py-3 px-3">
                        {rec.reason ? (
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border inline-block", getReasonBadgeStyle(rec.reason))}>
                            {rec.reason}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                        {rec.reason_details && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-[180px]">
                            {rec.reason_details}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black border",
                          isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : rec.status === 'Rejected'
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(rec.id, rec.person_name)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              >
                                <Icon name="check" size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(rec)}
                                className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForDetail(rec)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: ADD MANUAL CORRECTION REQUEST                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-navy-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Icon name="clock" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Manual Attendance Correction</h3>
                  <p className="text-[11px] text-navy-200">Submit an override or missed punch request</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewSubmit} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setNewForm({
                      ...newForm,
                      person_type: 'EMPLOYEE',
                      selected_entity_id: '',
                      person_name: '',
                      person_code: '',
                      designation: '',
                      department: '',
                    });
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                    newForm.person_type === 'EMPLOYEE'
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  👨‍💼 Employee / Trainer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewForm({
                      ...newForm,
                      person_type: 'STUDENT',
                      selected_entity_id: '',
                      person_name: '',
                      person_code: '',
                      designation: '',
                      department: '',
                    });
                  }}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer",
                    newForm.person_type === 'STUDENT'
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  🎓 Student
                </button>
              </div>

              {/* Dynamic Quick Selector from Database */}
              <div>
                <label className="block text-[11px] font-bold text-navy-700 mb-1">
                  Select {newForm.person_type === 'EMPLOYEE' ? 'Employee' : 'Student'} from Directory (Optional)
                </label>
                <select
                  value={newForm.selected_entity_id}
                  onChange={(e) => handleSelectEntity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white cursor-pointer"
                >
                  <option value="">-- Choose or Enter Manually Below --</option>
                  {newForm.person_type === 'EMPLOYEE'
                    ? employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name || `${emp.first_name} ${emp.last_name || ''}`} ({emp.code || 'EMP'}) - {emp.designation || 'Staff'}
                        </option>
                      ))
                    : students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.member_id || 'STU'})
                        </option>
                      ))}
                </select>
              </div>

              {/* Full Name & ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={newForm.person_name}
                    onChange={(e) => setNewForm({ ...newForm, person_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Code / Roll No</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP code or Roll No"
                    value={newForm.person_code}
                    onChange={(e) => setNewForm({ ...newForm, person_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Designation & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="Enter designation"
                    value={newForm.designation}
                    onChange={(e) => setNewForm({ ...newForm, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Department / Branch</label>
                  <input
                    type="text"
                    placeholder="Enter department"
                    value={newForm.department}
                    onChange={(e) => setNewForm({ ...newForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* District & Place */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">District / Region</label>
                  <input
                    type="text"
                    placeholder="Enter district"
                    value={newForm.district}
                    onChange={(e) => setNewForm({ ...newForm, district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Place / Campus / Center</label>
                  <input
                    type="text"
                    placeholder="Enter place or center name"
                    value={newForm.place}
                    onChange={(e) => setNewForm({ ...newForm, place: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Date & In/Out Times */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">In Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:30:00"
                    value={newForm.in_time}
                    onChange={(e) => setNewForm({ ...newForm, in_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy-700 mb-1">Out Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 17:00:00"
                    value={newForm.out_time}
                    onChange={(e) => setNewForm({ ...newForm, out_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-[11px] font-bold text-navy-700 mb-1">Reason for Correction *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter reason (e.g. Official Duty, Vaccination, On-Duty, Biometric Glitch...)"
                  value={newForm.reason}
                  onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              {/* Reason Details */}
              <div>
                <label className="block text-[11px] font-bold text-navy-700 mb-1">Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Enter any additional justification notes..."
                  value={newForm.reason_details}
                  onChange={(e) => setNewForm({ ...newForm, reason_details: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-purple-500 focus:bg-white"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer"
                >
                  Submit Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: REJECTION CONFIRMATION                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {rejectModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-navy-100 shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Icon name="x-circle" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Reject Attendance Request</h3>
                <p className="text-xs text-slate-500">For {rejectModalRecord.person_name}</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Rejection Reason / Note:
              </label>
              <textarea
                rows={3}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                placeholder="Provide reason for rejection..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: INSPECT RECORD DETAILS                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-navy-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon name="file-text" size={18} className="text-purple-400" />
                <h3 className="text-sm font-black">Attendance Request Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 overflow-hidden shrink-0">
                  {selectedRecordForDetail.avatar ? (
                    <img src={selectedRecordForDetail.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm text-purple-700">
                      {selectedRecordForDetail.person_name ? selectedRecordForDetail.person_name.slice(0, 2).toUpperCase() : '??'}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{selectedRecordForDetail.person_name}</h4>
                  <div className="text-xs text-slate-500 font-medium">
                    {selectedRecordForDetail.designation || '--'} {selectedRecordForDetail.person_code && `· ${selectedRecordForDetail.person_code}`}
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold border mt-1 inline-block",
                    selectedRecordForDetail.person_type === 'STUDENT'
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  )}>
                    {selectedRecordForDetail.person_type}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Punch Timestamps</div>
                  <div className="font-mono text-slate-800 font-semibold mt-1">In: {selectedRecordForDetail.in_time || '--:--'}</div>
                  <div className="font-mono text-slate-800 font-semibold">Out: {selectedRecordForDetail.out_time || '--:--'}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Location &amp; District</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedRecordForDetail.district || '--'}</div>
                  <div className="text-slate-500 text-[11px]">{selectedRecordForDetail.place || '--'}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Reason &amp; Description</div>
                <div className="font-black text-purple-800">{selectedRecordForDetail.reason || '--'}</div>
                <div className="text-slate-600 italic">
                  {selectedRecordForDetail.reason_details || 'No additional justification notes provided.'}
                </div>
              </div>

              {selectedRecordForDetail.status !== 'Pending' && (
                <div className={cn(
                  "p-3 rounded-xl text-xs border font-medium",
                  selectedRecordForDetail.status === 'Approved'
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                )}>
                  <div className="font-bold">Status: {selectedRecordForDetail.status}</div>
                  {selectedRecordForDetail.approved_by && (
                    <div>Reviewed by: {selectedRecordForDetail.approved_by}</div>
                  )}
                  {selectedRecordForDetail.rejection_reason && (
                    <div className="mt-1 text-rose-700">Reason: {selectedRecordForDetail.rejection_reason}</div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
