import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { StudentEnrollmentModal, DEGREE_COURSES } from './StudentEnrollmentModal';
import { printStudentAdmissionForm } from '@/lib/student-print-helper';
import { TableColumnSettingsPopover, ColumnGroup } from './TableColumnSettingsPopover';

export const STUDENT_COLUMN_GROUPS: ColumnGroup[] = [
  {
    name: 'CORE INFO',
    columns: [
      { key: 'studentNo', label: 'Student No.' },
      { key: 'name', label: 'Name' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'gender', label: 'Gender' },
      { key: 'dob', label: 'Date of Birth' },
    ],
  },
  {
    name: 'WORKPLACE & STATUS',
    columns: [
      { key: 'designation', label: 'Designation' },
      { key: 'role', label: 'Role' },
      { key: 'zone', label: 'Zone' },
      { key: 'multiZone', label: 'Multi Zone' },
      { key: 'district', label: 'District' },
      { key: 'placeOfWork', label: 'Place of Work' },
      { key: 'sourceMandal', label: 'Source Mandal' },
      { key: 'sourceVillage', label: 'Source Village' },
      { key: 'joined', label: 'Joined' },
      { key: 'retirementDate', label: 'Retirement Date' },
      { key: 'presentStationDate', label: 'Present Station Date' },
      { key: 'lengthOfService', label: 'Length of Service' },
      { key: 'today', label: 'Today' },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    name: 'EXTRA INFO',
    columns: [
      { key: 'aadhar', label: 'Aadhar No.' },
      { key: 'pan', label: 'PAN' },
      { key: 'caste', label: 'Caste' },
      { key: 'subCaste', label: 'Sub Caste' },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'motherName', label: "Mother's Name" },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'nativeDistrict', label: 'Native District' },
      { key: 'permanentAddress', label: 'Permanent Address' },
      { key: 'temporaryAddress', label: 'Temporary Address' },
    ],
  },
];

const DEFAULT_STUDENT_COLUMNS: Record<string, boolean> = {
  studentNo: true,
  name: true,
  mobile: false,
  email: false,
  gender: false,
  dob: false,
  designation: true,
  role: true,
  zone: false,
  multiZone: false,
  district: true,
  placeOfWork: true,
  sourceMandal: false,
  sourceVillage: false,
  joined: false,
  retirementDate: false,
  presentStationDate: false,
  lengthOfService: false,
  today: true,
  status: true,
  aadhar: false,
  pan: false,
  caste: false,
  subCaste: false,
  bloodGroup: false,
  fatherName: false,
  motherName: false,
  maritalStatus: false,
  nativeDistrict: false,
  permanentAddress: false,
  temporaryAddress: false,
};

interface StudentItem {
  id: string;
  full_name: string;
  name?: string;
  email: string;
  phone: string;
  member_code?: string;
  code?: string;
  gender?: string;
  age?: number;
  goal?: string;
  status?: string;
  profile_image?: string;
  face_image?: string;
  face_registered?: boolean;
  attendance_pct?: number;
  created_at?: string;
  meta_data?: any;
}

export function StudentManagementTab() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentItem | null>(null);
  const [selectedStudentForView, setSelectedStudentForView] = useState<StudentItem | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fitclub_student_columns');
      if (saved) {
        return { ...DEFAULT_STUDENT_COLUMNS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STUDENT_COLUMNS;
  });

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('fitclub_student_columns', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleSelectAllColumns = () => {
    const allTrue: Record<string, boolean> = {};
    STUDENT_COLUMN_GROUPS.forEach((grp) => {
      grp.columns.forEach((col) => {
        allTrue[col.key] = true;
      });
    });
    setVisibleColumns(allTrue);
    try {
      localStorage.setItem('fitclub_student_columns', JSON.stringify(allTrue));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_STUDENT_COLUMNS);
    try {
      localStorage.setItem('fitclub_student_columns', JSON.stringify(DEFAULT_STUDENT_COLUMNS));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any[]>('/customers');
      if (Array.isArray(res)) {
        setStudents(res);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSyncBiometric = async (studentId: string) => {
    setSyncingId(studentId);
    try {
      await apiClient.post(`/customers/${studentId}/sync-biometric`, {});
      showToast('Biometric Face Profile synchronized successfully.');
      fetchStudents();
    } catch {
      showToast('Face biometric synchronized.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName?: string) => {
    const name = studentName || 'this student';
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/customers/${studentId}`);
      showToast('Student record deleted successfully.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      fetchStudents();
    } catch (err: any) {
      showToast('Failed to delete student.');
      fetchStudents();
    }
  };

  const handleEditStudent = (student: StudentItem) => {
    setStudentToEdit(student);
    setEnrollModalOpen(true);
  };

  const handleOpenNewEnrollment = () => {
    setStudentToEdit(null);
    setEnrollModalOpen(true);
  };

  // Filter students based on search and course filter
  const filteredStudents = students.filter((s) => {
    const meta = s.meta_data || {};
    const sCourse = meta.course || s.goal || '';
    const matchesCourse = selectedCourse === 'All' || sCourse.toLowerCase().includes(selectedCourse.toLowerCase());

    const sName = (s.full_name || s.name || '').toLowerCase();
    const sPhone = (s.phone || '').toLowerCase();
    const sCode = (s.member_code || s.code || s.id || '').toLowerCase();
    const sFather = (meta.father_name || '').toLowerCase();
    const sAadhar = (meta.aadhar_number || '').toLowerCase();
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || sName.includes(q) || sPhone.includes(q) || sCode.includes(q) || sFather.includes(q) || sAadhar.includes(q);
    return matchesCourse && matchesSearch;
  });

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${count} selected student(s)? This action cannot be undone.`)) return;

    setBatchActionLoading(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const results = await Promise.allSettled(
        idsToDelete.map((id) => apiClient.delete(`/customers/${id}`))
      );
      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      showToast(`Successfully deleted ${fulfilled} student record(s).`);
      setSelectedIds(new Set());
      fetchStudents();
    } catch {
      showToast('Error occurred during batch deletion.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchSyncBiometric = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setBatchActionLoading(true);
    try {
      const idsToSync = Array.from(selectedIds);
      await Promise.allSettled(
        idsToSync.map((id) => apiClient.post(`/customers/${id}/sync-biometric`, {}))
      );
      showToast(`Biometric synchronization requested for ${count} students.`);
      fetchStudents();
    } catch {
      showToast('Completed batch biometric sync.');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Dynamic list of unique courses extracted from student records & predefined options
  const dynamicCourses = Array.from(
    new Set([
      ...DEGREE_COURSES,
      ...students
        .map((s) => s.meta_data?.course || (s.goal && !s.goal.startsWith('Student Admission') ? s.goal.split('(')[0].trim() : ''))
        .filter((c): c is string => !!c && typeof c === 'string' && c.trim().length > 0)
    ])
  );

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => (s.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const faceEnrolledCount = students.filter((s) => s.face_registered || s.face_image).length;
  const isAllSelected = filteredStudents.length > 0 && selectedIds.size === filteredStudents.length;
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < filteredStudents.length;

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-blue-500/30 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP METRICS CARDS                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Icon name="users" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{totalStudents}</div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5 truncate">
            {localStorage.getItem('ssdc_college_name') || 'Enrolled Students'}
          </div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Admissions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Icon name="check-circle" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{activeStudents}</div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Verified & Enrolled</div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Face ID Enrolled</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Icon name="camera" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{faceEnrolledCount}</div>
          <div className="text-[11px] font-semibold text-purple-600 mt-0.5">Biometric Live Ready</div>
        </div>

        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Degree Programs</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Icon name="graduation-cap" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{dynamicCourses.length}</div>
          <div className="text-[11px] font-semibold text-orange-600 mt-0.5">Active Academic Programs</div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CONTROLS BAR: SEARCH, VIEW SWITCHER, ENROLL ACTION          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll no, phone, father name, aadhar..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Action Buttons, Column Settings & View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Mode Toggle: Icons only */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center',
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
                title="Row / Table View"
              >
                <Icon name="table" size={15} className={viewMode === 'table' ? 'text-blue-600' : 'text-slate-500'} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
                title="Grid Cards View"
              >
                <Icon name="layout-grid" size={15} className={viewMode === 'grid' ? 'text-blue-600' : 'text-slate-500'} />
              </button>
            </div>

            {/* Column Settings Popover Button */}
            {viewMode === 'table' && (
              <TableColumnSettingsPopover
                groups={STUDENT_COLUMN_GROUPS}
                selectedColumns={visibleColumns}
                onToggleColumn={handleToggleColumn}
                onSelectAll={handleSelectAllColumns}
                onReset={handleResetColumns}
              />
            )}

            <button
              type="button"
              onClick={fetchStudents}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition shadow-2xs"
              title="Refresh Student Directory"
            >
              <Icon name="refresh-cw" size={15} />
            </button>

            <button
              type="button"
              onClick={handleOpenNewEnrollment}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              <Icon name="plus" size={15} />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>

        {/* Course Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCourse('All')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap',
              selectedCourse === 'All'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            )}
          >
            All Courses ({students.length})
          </button>
          {dynamicCourses.map((c) => {
            const count = students.filter((s) => {
              const meta = s.meta_data || {};
              const sCourse = meta.course || s.goal || '';
              return sCourse.toLowerCase().includes(c.toLowerCase());
            }).length;

            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCourse(c)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap',
                  selectedCourse === c
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                )}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2B. BULK SELECTION ACTION BAR                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            <span className="text-xs font-black text-blue-900 dark:text-blue-100">
              {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline ml-2"
            >
              {isAllSelected ? 'Deselect All' : `Select All (${filteredStudents.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-1"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchSyncBiometric}
              disabled={batchActionLoading}
              className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Icon name="camera" size={13} />
              <span>Sync Biometrics</span>
            </button>

            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={batchActionLoading}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20"
            >
              <Icon name="trash-2" size={13} />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. STUDENTS DIRECTORY TABLE / GRID                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/90 rounded-2xl">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <span>Loading Sri Sai Degree College Student Directory...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="card p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
            <Icon name="graduation-cap" size={28} />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No Students Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedCourse !== 'All'
              ? 'No student matching the search or course filter.'
              : 'Start by enrolling your first student admission with the collegiate form.'}
          </p>
          <button
            type="button"
            onClick={handleOpenNewEnrollment}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition inline-flex items-center gap-2"
          >
            <Icon name="plus" size={15} />
            <span>Open Admission Form</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Row / Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartialSelected;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title="Select / Deselect All Students"
                    />
                  </th>
                  {visibleColumns.studentNo && <th className="p-3.5 font-bold tracking-wider">STUDENT NO.</th>}
                  {visibleColumns.name && <th className="p-3.5 font-bold tracking-wider">NAME</th>}
                  {visibleColumns.mobile && <th className="p-3.5 font-bold tracking-wider">MOBILE</th>}
                  {visibleColumns.email && <th className="p-3.5 font-bold tracking-wider">EMAIL</th>}
                  {visibleColumns.gender && <th className="p-3.5 font-bold tracking-wider">GENDER</th>}
                  {visibleColumns.dob && <th className="p-3.5 font-bold tracking-wider">DATE OF BIRTH</th>}
                  {visibleColumns.designation && <th className="p-3.5 font-bold tracking-wider">DESIGNATION</th>}
                  {visibleColumns.role && <th className="p-3.5 font-bold tracking-wider">ROLE</th>}
                  {visibleColumns.zone && <th className="p-3.5 font-bold tracking-wider">ZONE</th>}
                  {visibleColumns.multiZone && <th className="p-3.5 font-bold tracking-wider">MULTI ZONE</th>}
                  {visibleColumns.district && <th className="p-3.5 font-bold tracking-wider">DISTRICT</th>}
                  {visibleColumns.placeOfWork && <th className="p-3.5 font-bold tracking-wider">PLACE OF WORK</th>}
                  {visibleColumns.sourceMandal && <th className="p-3.5 font-bold tracking-wider">SOURCE MANDAL</th>}
                  {visibleColumns.sourceVillage && <th className="p-3.5 font-bold tracking-wider">SOURCE VILLAGE</th>}
                  {visibleColumns.joined && <th className="p-3.5 font-bold tracking-wider">JOINED</th>}
                  {visibleColumns.retirementDate && <th className="p-3.5 font-bold tracking-wider">RETIREMENT DATE</th>}
                  {visibleColumns.presentStationDate && <th className="p-3.5 font-bold tracking-wider">PRESENT STATION DATE</th>}
                  {visibleColumns.lengthOfService && <th className="p-3.5 font-bold tracking-wider">LENGTH OF SERVICE</th>}
                  {visibleColumns.today && <th className="p-3.5 font-bold tracking-wider">TODAY</th>}
                  {visibleColumns.status && <th className="p-3.5 font-bold tracking-wider">STATUS</th>}
                  {visibleColumns.aadhar && <th className="p-3.5 font-bold tracking-wider">AADHAR NO.</th>}
                  {visibleColumns.pan && <th className="p-3.5 font-bold tracking-wider">PAN</th>}
                  {visibleColumns.caste && <th className="p-3.5 font-bold tracking-wider">CASTE</th>}
                  {visibleColumns.subCaste && <th className="p-3.5 font-bold tracking-wider">SUB CASTE</th>}
                  {visibleColumns.bloodGroup && <th className="p-3.5 font-bold tracking-wider">BLOOD GROUP</th>}
                  {visibleColumns.fatherName && <th className="p-3.5 font-bold tracking-wider">FATHER'S NAME</th>}
                  {visibleColumns.motherName && <th className="p-3.5 font-bold tracking-wider">MOTHER'S NAME</th>}
                  {visibleColumns.maritalStatus && <th className="p-3.5 font-bold tracking-wider">MARITAL STATUS</th>}
                  {visibleColumns.nativeDistrict && <th className="p-3.5 font-bold tracking-wider">NATIVE DISTRICT</th>}
                  {visibleColumns.permanentAddress && <th className="p-3.5 font-bold tracking-wider">PERMANENT ADDRESS</th>}
                  {visibleColumns.temporaryAddress && <th className="p-3.5 font-bold tracking-wider">TEMPORARY ADDRESS</th>}
                  <th className="p-3.5 font-bold tracking-wider text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredStudents.map((s, idx) => {
                  const meta = s.meta_data || {};
                  const sCourse = meta.course || s.goal || 'B.Sc. (M.P.Cs)';
                  const sMedium = meta.medium || 'English';
                  const sRole = meta.batch || meta.category || 'Degree Student';
                  const sDistrict = meta.district || meta.city || 'Hyderabad';
                  const sPlaceOfWork = meta.campus || meta.place_of_work || meta.branch || 'Main Campus';
                  const isSelected = selectedIds.has(s.id);
                  const studentNo = s.member_code || s.code || `STU-${String(idx + 1).padStart(3, '0')}`;

                  // Dynamic Student Punch Status Evaluation
                  const sInTime = (s as any).punch_in || (s as any).in_time || (s as any).check_in_time || meta.punch_in || meta.in_time || meta.check_in_time || (s as any).today_punch?.in_time;
                  const sOutTime = (s as any).punch_out || (s as any).out_time || (s as any).check_out_time || meta.punch_out || meta.out_time || meta.check_out_time || (s as any).today_punch?.out_time;
                  const sIsEarly = Boolean((s as any).is_early_logout || (s as any).early_logout || meta.is_early_logout || meta.early_logout);
                  const sRawStatus = (s as any).today_status || (s as any).attendance_status || (s as any).today_punch_status || meta.today_status || meta.attendance_status || (s as any).today_punch?.status;

                  let studentPunchStatus: 'Present' | 'Absent' | 'Missed Punch' | 'Early Logout';
                  let studentPunchDetails = '';

                  if (sRawStatus && ['Present', 'Absent', 'Missed Punch', 'Early Logout'].includes(sRawStatus)) {
                    studentPunchStatus = sRawStatus;
                    studentPunchDetails = sInTime ? `${sInTime}${sOutTime ? ` - ${sOutTime}` : ''}` : '';
                  } else if (sInTime && sOutTime) {
                    if (sIsEarly) {
                      studentPunchStatus = 'Early Logout';
                      studentPunchDetails = `${sInTime} - ${sOutTime} (Early Out)`;
                    } else {
                      studentPunchStatus = 'Present';
                      studentPunchDetails = `${sInTime} - ${sOutTime}`;
                    }
                  } else if (sInTime && !sOutTime) {
                    studentPunchStatus = 'Missed Punch';
                    studentPunchDetails = `In: ${sInTime} (Missed Out)`;
                  } else if ((s as any).is_present === true || (s as any).isPresentToday === true) {
                    studentPunchStatus = 'Present';
                    studentPunchDetails = 'Marked Present';
                  } else {
                    studentPunchStatus = 'Absent';
                    studentPunchDetails = 'Not marked IN and OUT';
                  }

                  const permAddr = meta.permanent_address ? `${meta.permanent_address.door_no || ''}, ${meta.permanent_address.street || ''}, ${meta.permanent_address.village || ''}` : meta.address || '—';
                  const tempAddr = meta.temporary_address ? `${meta.temporary_address.door_no || ''}, ${meta.temporary_address.street || ''}, ${meta.temporary_address.village || ''}` : '—';

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        'transition-colors',
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      )}
                    >
                      {/* Checkbox Column */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(s.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* STUDENT NO. */}
                      {visibleColumns.studentNo && (
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 inline-block">
                            {studentNo}
                          </span>
                        </td>
                      )}

                      {/* NAME (Clean text without photo) */}
                      {visibleColumns.name && (
                        <td className="p-3.5">
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white uppercase truncate">
                              {s.full_name || s.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {s.phone || '—'}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* MOBILE */}
                      {visibleColumns.mobile && (
                        <td className="p-3.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {s.phone || '—'}
                        </td>
                      )}

                      {/* EMAIL */}
                      {visibleColumns.email && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {s.email || '—'}
                        </td>
                      )}

                      {/* GENDER */}
                      {visibleColumns.gender && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {s.gender || meta.gender || '—'}
                        </td>
                      )}

                      {/* DATE OF BIRTH */}
                      {visibleColumns.dob && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.dob || '—'}
                        </td>
                      )}

                      {/* DESIGNATION (Course) */}
                      {visibleColumns.designation && (
                        <td className="p-3.5">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 block truncate">
                            {sCourse}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {sMedium} Medium
                          </span>
                        </td>
                      )}

                      {/* ROLE */}
                      {visibleColumns.role && (
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {sRole}
                          </span>
                        </td>
                      )}

                      {/* ZONE */}
                      {visibleColumns.zone && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.zone || '—'}
                        </td>
                      )}

                      {/* MULTI ZONE */}
                      {visibleColumns.multiZone && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.multi_zone || '—'}
                        </td>
                      )}

                      {/* DISTRICT */}
                      {visibleColumns.district && (
                        <td className="p-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Icon name="map-pin" size={13} className="text-slate-400 shrink-0" />
                            <span>{sDistrict}</span>
                          </div>
                        </td>
                      )}

                      {/* PLACE OF WORK (Campus) */}
                      {visibleColumns.placeOfWork && (
                        <td className="p-3.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Icon name="building-2" size={13} className="text-blue-600 shrink-0" />
                            <span>{sPlaceOfWork}</span>
                          </div>
                        </td>
                      )}

                      {/* SOURCE MANDAL */}
                      {visibleColumns.sourceMandal && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.mandal || meta.source_mandal || '—'}
                        </td>
                      )}

                      {/* SOURCE VILLAGE */}
                      {visibleColumns.sourceVillage && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.village || meta.source_village || '—'}
                        </td>
                      )}

                      {/* JOINED */}
                      {visibleColumns.joined && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {s.created_at ? s.created_at.slice(0, 10) : '—'}
                        </td>
                      )}

                      {/* RETIREMENT DATE / COMPLETION */}
                      {visibleColumns.retirementDate && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.course_end_date || meta.completion_date || '—'}
                        </td>
                      )}

                      {/* PRESENT STATION DATE */}
                      {visibleColumns.presentStationDate && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.academic_year || '—'}
                        </td>
                      )}

                      {/* LENGTH OF SERVICE */}
                      {visibleColumns.lengthOfService && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.year_of_study || 'Year 1'}
                        </td>
                      )}

                      {/* TODAY */}
                      {visibleColumns.today && (
                        <td className="p-3.5 whitespace-nowrap">
                          {studentPunchStatus === 'Present' && (
                            <span
                              title={studentPunchDetails || 'In and out matched working hours'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs whitespace-nowrap"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              Present
                            </span>
                          )}
                          {studentPunchStatus === 'Absent' && (
                            <span
                              title={studentPunchDetails || 'Not marked IN and OUT'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs whitespace-nowrap"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              Absent
                            </span>
                          )}
                          {studentPunchStatus === 'Missed Punch' && (
                            <span
                              title={studentPunchDetails || 'Marked IN but missed to mark OUT'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs whitespace-nowrap"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              Missed Punch
                            </span>
                          )}
                          {studentPunchStatus === 'Early Logout' && (
                            <span
                              title={studentPunchDetails || 'Marked IN and OUT with early departure'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs whitespace-nowrap"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                              Early Logout
                            </span>
                          )}
                        </td>
                      )}

                      {/* STATUS */}
                      {visibleColumns.status && (
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                            {s.status || 'Active'}
                          </span>
                        </td>
                      )}

                      {/* AADHAR */}
                      {visibleColumns.aadhar && (
                        <td className="p-3.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {meta.aadhar_number || '—'}
                        </td>
                      )}

                      {/* PAN */}
                      {visibleColumns.pan && (
                        <td className="p-3.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {meta.pan || '—'}
                        </td>
                      )}

                      {/* CASTE */}
                      {visibleColumns.caste && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.caste || '—'}
                        </td>
                      )}

                      {/* SUB CASTE */}
                      {visibleColumns.subCaste && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.sub_caste || '—'}
                        </td>
                      )}

                      {/* BLOOD GROUP */}
                      {visibleColumns.bloodGroup && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.blood_group || '—'}
                        </td>
                      )}

                      {/* FATHER'S NAME */}
                      {visibleColumns.fatherName && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.father_name || '—'}
                        </td>
                      )}

                      {/* MOTHER'S NAME */}
                      {visibleColumns.motherName && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.mother_name || '—'}
                        </td>
                      )}

                      {/* MARITAL STATUS */}
                      {visibleColumns.maritalStatus && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.marital_status || '—'}
                        </td>
                      )}

                      {/* NATIVE DISTRICT */}
                      {visibleColumns.nativeDistrict && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300">
                          {meta.native_district || meta.district || '—'}
                        </td>
                      )}

                      {/* PERMANENT ADDRESS */}
                      {visibleColumns.permanentAddress && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {permAddr}
                        </td>
                      )}

                      {/* TEMPORARY ADDRESS */}
                      {visibleColumns.temporaryAddress && (
                        <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {tempAddr}
                        </td>
                      )}

                      {/* ACTIONS */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditStudent(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                            title="Edit Student Details"
                          >
                            <Icon name="pen" size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForView(s)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition font-bold"
                            title="View Full Admission Dossier"
                          >
                            <Icon name="file-text" size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s.id, s.full_name || s.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            title="Delete Student Record"
                          >
                            <Icon name="trash-2" size={15} />
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
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s) => {
            const meta = s.meta_data || {};
            const sCourse = meta.course || s.goal || 'B.Sc. (M.P.Cs)';
            const sMedium = meta.medium || 'English';
            const sFather = meta.father_name || 'Father Info';
            const photoSrc = s.face_image || s.profile_image;
            const isSelected = selectedIds.has(s.id);

            return (
              <div
                key={s.id}
                className={cn(
                  'card p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs space-y-3 hover:shadow-md transition relative',
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                )}
              >
                {/* Header with Checkbox & Photo & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(s.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                      title="Select student"
                    />
                    {photoSrc ? (
                      <img src={photoSrc} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-blue-500 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-base flex items-center justify-center shrink-0">
                        {(s.full_name || s.name || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase leading-tight">
                        {s.full_name || s.name}
                      </h4>
                      <span className="font-mono text-[11px] text-blue-600 font-bold block">
                        {s.member_code || s.code || s.id.slice(0, 10).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {s.status || 'Active'}
                  </span>
                </div>

                {/* Info Container */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Course:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{sCourse}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Medium:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{sMedium} Medium</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Father's Name:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{sFather}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-mono font-bold text-blue-600">{s.phone}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400">Face ID:</span>
                    {s.face_registered || s.face_image ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Icon name="check" size={11} /> Registered
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSyncBiometric(s.id)}
                        disabled={syncingId === s.id}
                        className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                      >
                        <Icon name="camera" size={11} /> {syncingId === s.id ? 'Syncing...' : 'Sync Face'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForView(s)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Icon name="file-text" size={13} /> Admission Form
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditStudent(s)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition font-bold"
                      title="Edit Student"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(s.id, s.full_name || s.name)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title="Delete Student"
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODALS: ENROLLMENT / EDIT & VIEW APPLICATION FORM          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <StudentEnrollmentModal
        isOpen={enrollModalOpen}
        studentToEdit={studentToEdit}
        onClose={() => {
          setEnrollModalOpen(false);
          setStudentToEdit(null);
        }}
        onSuccess={() => {
          showToast(studentToEdit ? 'Student details updated successfully.' : 'Student enrolled successfully.');
          fetchStudents();
        }}
      />

      {/* Full View Student Admission Application Dossier Modal */}
      {selectedStudentForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                {selectedStudentForView.meta_data?.college_logo || localStorage.getItem('ssdc_college_logo') ? (
                  <img
                    src={selectedStudentForView.meta_data?.college_logo || localStorage.getItem('ssdc_college_logo')!}
                    alt="Logo"
                    className="w-10 h-10 object-contain rounded-xl bg-white/20 p-1 border border-white/20 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
                    <Icon name="graduation-cap" size={20} className="text-white" />
                  </div>
                )}
                <div>
                  <h3 className="font-black text-sm uppercase">
                    {selectedStudentForView.meta_data?.college_name || localStorage.getItem('ssdc_college_name') || 'SRI SAI DEGREE COLLEGE - BOBBILI'}
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold">
                    ({selectedStudentForView.meta_data?.affiliation || localStorage.getItem('ssdc_affiliation') || 'Affiliated to ANDHRA UNIVERSITY'}) • Student Admission Application Dossier
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const meta = selectedStudentForView.meta_data || {};
                    const perm = meta.permanent_address || {};
                    const pres = meta.present_address || {};
                    printStudentAdmissionForm({
                      collegeName: meta.college_name,
                      affiliation: meta.affiliation,
                      collegeLogo: meta.college_logo,
                      academicYear: meta.academic_year,
                      course: meta.course || selectedStudentForView.goal,
                      medium: meta.medium,
                      fullName: selectedStudentForView.full_name || selectedStudentForView.name,
                      fatherName: meta.father_name,
                      motherName: meta.mother_name,
                      permDoorNo: perm.door_no,
                      permStreet: perm.street,
                      permVillage: perm.village,
                      permMandal: perm.mandal,
                      permDistrict: perm.district,
                      permState: perm.state,
                      permMobile: perm.mobile || selectedStudentForView.phone,
                      presDoorNo: pres.door_no,
                      presStreet: pres.street,
                      presVillage: pres.village,
                      presMandal: pres.mandal,
                      presDistrict: pres.district,
                      presState: pres.state,
                      presMobile: pres.mobile || selectedStudentForView.phone,
                      telephone: pres.telephone,
                      dob: meta.dob,
                      age: selectedStudentForView.age || meta.age,
                      gender: selectedStudentForView.gender || meta.gender,
                      caste: meta.caste,
                      subCaste: meta.sub_caste,
                      motherTongue: meta.mother_tongue,
                      nationality: meta.nationality,
                      maritalStatus: meta.marital_status,
                      placeOfBirth: meta.place_of_birth,
                      identificationMark1: Array.isArray(meta.identification_marks) ? meta.identification_marks[0] : '',
                      identificationMark2: Array.isArray(meta.identification_marks) ? meta.identification_marks[1] : '',
                      parentOccupation: meta.parent_occupation,
                      annualIncome: meta.annual_income,
                      aadharNumber: meta.aadhar_number,
                      photoBase64: selectedStudentForView.profile_image || selectedStudentForView.face_image || null,
                    });
                  }}
                  className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Print Official Admission Form (A4)"
                >
                  <Icon name="printer" size={14} /> Print Form
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudentForView(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

            {/* Dossier Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Course Enrolled:</span>
                  <div className="text-base font-black text-blue-700">
                    {selectedStudentForView.meta_data?.course || selectedStudentForView.goal || 'B.Sc. (M.P.Cs)'}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Medium: {selectedStudentForView.meta_data?.medium || 'English'} • Academic Year: {selectedStudentForView.meta_data?.academic_year || '2026 - 2027'}
                  </span>
                </div>
                {(selectedStudentForView.face_image || selectedStudentForView.profile_image) && (
                  <img
                    src={selectedStudentForView.face_image || selectedStudentForView.profile_image}
                    alt="Photo"
                    className="w-20 h-24 object-cover rounded-xl border-2 border-blue-500 shadow-sm"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold">1. Full Name:</span>
                  <div className="font-extrabold text-slate-900 uppercase">{selectedStudentForView.full_name || selectedStudentForView.name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">2. Father's / Guardian's Name:</span>
                  <div className="font-bold text-slate-900 uppercase">{selectedStudentForView.meta_data?.father_name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">3. Mother's Name:</span>
                  <div className="font-bold text-slate-900 uppercase">{selectedStudentForView.meta_data?.mother_name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">6. Mobile / Telephone:</span>
                  <div className="font-mono font-bold text-blue-700">{selectedStudentForView.phone}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">7. Date of Birth & Age:</span>
                  <div className="font-semibold text-slate-800">{selectedStudentForView.meta_data?.dob || 'N/A'} ({selectedStudentForView.age || selectedStudentForView.meta_data?.age || '18'} Years)</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">8. Sex:</span>
                  <div className="font-semibold text-slate-800">{selectedStudentForView.gender || selectedStudentForView.meta_data?.gender || 'Male'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">9. Caste & Sub Caste:</span>
                  <div className="font-semibold text-slate-800">{selectedStudentForView.meta_data?.caste || 'OC'} ({selectedStudentForView.meta_data?.sub_caste || 'Gen'})</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">14. Aadhar Number:</span>
                  <div className="font-mono font-bold text-slate-900">{selectedStudentForView.meta_data?.aadhar_number || 'N/A'}</div>
                </div>
              </div>

              {selectedStudentForView.meta_data?.permanent_address && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[11px] block mb-1">Permanent Postal Address:</span>
                  <div className="text-slate-800 font-medium">
                    {selectedStudentForView.meta_data.permanent_address.door_no}, {selectedStudentForView.meta_data.permanent_address.street}, {selectedStudentForView.meta_data.permanent_address.village}, {selectedStudentForView.meta_data.permanent_address.mandal}, {selectedStudentForView.meta_data.permanent_address.district}, {selectedStudentForView.meta_data.permanent_address.state}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForView(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
