import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

interface MatrixRow {
  id: string;
  org_name: string;
  branch_name: string;
  city: string;
  total_emp: number;
  emp_present: number;
  emp_leave: number;
  emp_leave_approvals: number;
  emp_absent: number;
  total_students: number;
  student_present: number;
  student_leave: number;
  student_leave_approvals: number;
  student_absent: number;
}

interface MatrixTotals {
  total_emp: number;
  emp_present: number;
  emp_leave: number;
  emp_leave_approvals: number;
  emp_absent: number;
  total_students: number;
  student_present: number;
  student_leave: number;
  student_leave_approvals: number;
  student_absent: number;
}

interface MatrixResponse {
  date: string;
  date_formatted: string;
  total_organizations: number;
  matrix: MatrixRow[];
  totals: MatrixTotals;
}

export const HoOrganisationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMatrix = async (targetDate = selectedDate) => {
    try {
      setLoading(true);
      const res = await apiClient.get<MatrixResponse>(
        `/ho/organisations-matrix?target_date=${encodeURIComponent(targetDate)}`
      );
      setData(res);
    } catch (err) {
      console.error('Failed to load organisations matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix(selectedDate);
  }, [selectedDate]);

  const filteredMatrix = useMemo(() => {
    if (!data?.matrix) return [];
    if (!searchQuery.trim()) return data.matrix;
    const q = searchQuery.toLowerCase().trim();
    return data.matrix.filter(
      (row) =>
        row.org_name.toLowerCase().includes(q) ||
        row.branch_name.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Export Matrix as CSV matching spreadsheet format
  const handleExportCsv = () => {
    if (!data?.matrix) return;
    const headers = [
      'Organisation Name',
      'Branch',
      'City',
      'Total Staff',
      'Staff Present',
      'Staff Leave',
      'Staff Leave Approvals',
      'Staff Absent',
      'Total Students',
      'Students Present',
      'Students Leave',
      'Students Leave Approvals',
      'Students Absent',
    ];

    const rows = filteredMatrix.map((r) => [
      `"${r.org_name.replace(/"/g, '""')}"`,
      `"${(r.branch_name || '').replace(/"/g, '""')}"`,
      `"${(r.city || '').replace(/"/g, '""')}"`,
      r.total_emp,
      r.emp_present,
      r.emp_leave,
      r.emp_leave_approvals,
      r.emp_absent,
      r.total_students,
      r.student_present,
      r.student_leave,
      r.student_leave_approvals,
      r.student_absent,
    ]);

    if (data.totals) {
      const t = data.totals;
      rows.push([
        '"GRAND TOTAL"',
        '""',
        '""',
        t.total_emp,
        t.emp_present,
        t.emp_leave,
        t.emp_leave_approvals,
        t.emp_absent,
        t.total_students,
        t.student_present,
        t.student_leave,
        t.student_leave_approvals,
        t.student_absent,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `organisations_matrix_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-transparent w-full px-4 sm:px-6 py-4 space-y-4">
      {/* ── TOP BANNER SECTION ────────────────────────────────────────────── */}
      <div className="relative pt-1 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100/90 text-purple-700 border border-purple-200/60 shadow-2xs">
              HEAD OFFICE COMMAND CENTER • MATRIX
            </span>
            <span className="text-xs font-bold text-slate-400">
              {data?.date_formatted || selectedDate}
            </span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
            Organisations Attendance &amp; Leave Matrix
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            Cross-branch overview of total staff, active students, daily present count, leave requests, and absences.
          </p>
        </div>

        {/* Header Right: Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200/90 shadow-2xs">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => fetchMatrix()}
            className="w-9 h-9 rounded-full bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
            title="Refresh Matrix"
          >
            <Icon name="refresh-cw" size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <Icon name="download" size={14} />
            <span>Export Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* ── HO PORTAL TAB SWITCHER ────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-1">
        <button
          onClick={() => navigate('/ho')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-2xs"
        >
          <Icon name="layout-grid" size={14} className="text-slate-500" />
          <span>Dashboard &amp; Directory</span>
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20"
        >
          <Icon name="layers" size={14} className="text-white" />
          <span>Organisations Matrix</span>
        </button>

        <button
          onClick={() => navigate('/ho?tab=attendance_reports')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-2xs"
          title="View Attendance Reports &amp; Downloads"
        >
          <Icon name="file-text" size={14} className="text-slate-500" />
          <span>Branch Attendance Reports &amp; Downloads (Excel &amp; PDF)</span>
        </button>
      </div>

      {/* ── KPI HIGHLIGHTS CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Organizations */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-purple-50/40 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50/90 border border-purple-100 flex items-center justify-center shrink-0">
            <Icon name="building-2" size={17} className="text-purple-600" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block">
              TOTAL ORGANIZATIONS
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {data?.total_organizations ?? 0}
            </div>
            <p className="text-[11px] text-purple-600 font-semibold truncate pt-0.5">
              Active campuses reporting
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-purple-100/40 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* KPI 2: Total Staff */}
        <div className="rounded-2xl border-2 border-sky-400/90 bg-gradient-to-br from-white via-sky-50/30 to-sky-100/50 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
            <Icon name="users" size={17} className="text-sky-500" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block">
              TOTAL STAFF
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {data?.totals?.total_emp ?? 0}
            </div>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1.5 pt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span>{data?.totals?.emp_present ?? 0} Present Today</span>
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-200/40 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* KPI 3: Total Students */}
        <div className="rounded-2xl border border-amber-300/90 bg-gradient-to-br from-white via-amber-50/20 to-amber-100/40 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Icon name="graduation-cap" size={17} className="text-amber-600" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block">
              TOTAL STUDENTS
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {data?.totals?.total_students ?? 0}
            </div>
            <p className="text-[11px] text-blue-600 font-medium truncate pt-0.5">
              {data?.totals?.student_present ?? 0} Present in Sessions
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-200/40 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* KPI 4: Pending Approvals */}
        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-rose-50/20 to-rose-100/40 p-3.5 sm:p-4 shadow-2xs relative overflow-hidden flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Icon name="clock" size={17} className="text-rose-500" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 block">
              PENDING LEAVE APPROVALS
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {(data?.totals?.emp_leave_approvals ?? 0) + (data?.totals?.student_leave_approvals ?? 0)}
            </div>
            <p className="text-[11px] text-amber-600 font-semibold truncate pt-0.5">
              Requires owner review
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-200/40 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* ── ORGANIZATIONS MATRIX TABLE ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Icon name="layers" size={16} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Live Cross-Branch Matrix
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Live attendance breakdown for employees and students across all registered branches.
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative max-w-xs w-full">
            <Icon
              name="search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by organization or city..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Top Tier: Section Group Header */}
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-2.5 px-4 border-r border-slate-200/70">Campus &amp; Branch</th>
                <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-200/70 bg-sky-50/50 text-sky-900">
                  👥 Employee Attendance &amp; Leaves
                </th>
                <th colSpan={5} className="py-2.5 px-3 text-center bg-indigo-50/50 text-indigo-900">
                  🎓 Student Attendance &amp; Leaves
                </th>
              </tr>
              {/* Secondary Tier: Column Headers */}
              <tr className="bg-white border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 divide-x divide-slate-100">
                <th className="py-2.5 px-4 min-w-[220px]">Organisation Name</th>
                <th className="py-2.5 px-3 text-center min-w-[85px] bg-slate-50/40">Total Staff</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-emerald-700 bg-emerald-50/30">Present</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-blue-700 bg-blue-50/30">Leave</th>
                <th className="py-2.5 px-3 text-center min-w-[95px] text-amber-700 bg-amber-50/30">Approvals</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-rose-700 bg-rose-50/30">Absent</th>
                <th className="py-2.5 px-3 text-center min-w-[85px] bg-slate-50/40">Total Students</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-emerald-700 bg-emerald-50/30">Present</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-blue-700 bg-blue-50/30">Leave</th>
                <th className="py-2.5 px-3 text-center min-w-[95px] text-amber-700 bg-amber-50/30">Approvals</th>
                <th className="py-2.5 px-3 text-center min-w-[80px] text-rose-700 bg-rose-50/30">Absent</th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold bg-white">
              {filteredMatrix.length > 0 ? (
                filteredMatrix.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 transition-colors divide-x divide-slate-100"
                  >
                    {/* Organization Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center font-black text-[9px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 block truncate">
                              {row.org_name}
                            </span>
                            {row.branch_name && (
                              <span className="text-[10px] text-slate-400 font-medium block truncate">
                                {row.branch_name} {row.city ? `• ${row.city}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            localStorage.setItem('vahd_selected_org_id', row.id);
                            window.dispatchEvent(
                              new CustomEvent('vahd:org_changed', { detail: { id: row.id } })
                            );
                            navigate('/ho');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
                          title="Open in Directory"
                        >
                          View
                        </button>
                      </div>
                    </td>

                    {/* Total Staff */}
                    <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50/20">
                      {row.total_emp}
                    </td>

                    {/* Staff Present */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-black text-[11px]">
                        {row.emp_present}
                      </span>
                    </td>

                    {/* Staff Leave */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-bold text-[11px]">
                        {row.emp_leave}
                      </span>
                    </td>

                    {/* Staff Approvals */}
                    <td className="py-3 px-3 text-center">
                      {row.emp_leave_approvals > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/70 font-black text-[10px]">
                          {row.emp_leave_approvals}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Staff Absent */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 font-bold text-[11px]">
                        {row.emp_absent}
                      </span>
                    </td>

                    {/* Total Students */}
                    <td className="py-3 px-3 text-center font-black text-slate-900 bg-slate-50/20">
                      {row.total_students}
                    </td>

                    {/* Students Present */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-black text-[11px]">
                        {row.student_present}
                      </span>
                    </td>

                    {/* Students Leave */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-bold text-[11px]">
                        {row.student_leave}
                      </span>
                    </td>

                    {/* Students Approvals */}
                    <td className="py-3 px-3 text-center">
                      {row.student_leave_approvals > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200/70 font-black text-[10px]">
                          {row.student_leave_approvals}
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Students Absent */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 font-bold text-[11px]">
                        {row.student_absent}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                    {loading ? 'Loading live matrix...' : 'No organizations found matching search.'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Summary Row */}
            {data?.totals && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black divide-x divide-slate-800 text-xs">
                  <td className="py-3.5 px-4 font-black uppercase tracking-wider">
                    Grand Total ({filteredMatrix.length} Orgs)
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-white">
                    {data.totals.total_emp}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-400">
                    {data.totals.emp_present}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-blue-300">
                    {data.totals.emp_leave}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-300">
                    {data.totals.emp_leave_approvals}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-rose-400">
                    {data.totals.emp_absent}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-white">
                    {data.totals.total_students}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-400">
                    {data.totals.student_present}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-blue-300">
                    {data.totals.student_leave}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-300">
                    {data.totals.student_leave_approvals}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-rose-400">
                    {data.totals.student_absent}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default HoOrganisationsPage;
