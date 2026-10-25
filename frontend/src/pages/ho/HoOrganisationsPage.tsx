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
      'Orag Name',
      'Total EMP',
      'Preent',
      'Leave',
      'Leave Approvals',
      'Abcent',
      'Total Students',
      'Preent',
      'Leave',
      'Leave Approvals',
      'Abcent',
    ];

    const rows = filteredMatrix.map((r) => [
      `"${r.org_name}"`,
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
        '"TOTAL"',
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              Live Matrix Directory
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {data?.date_formatted || selectedDate}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <span>Organisations Attendance &amp; Leave Matrix</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cross-branch overview of total staff, active students, daily present count, leave requests, and absences.
          </p>
        </div>

        {/* Date Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedDate === new Date().toISOString().split('T')[0]
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={() => fetchMatrix()}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Refresh Matrix"
          >
            <Icon name="refresh-cw" size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Icon name="download" size={14} />
            <span>Export Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orgs</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="building-2" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.total_organizations ?? 0}</div>
          <p className="text-[11px] font-semibold text-purple-600 mt-0.5">Active Campus Locations</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="users" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.totals?.total_emp ?? 0}</div>
          <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
            {data?.totals?.emp_present ?? 0} Present &bull; {data?.totals?.emp_leave ?? 0} On Leave
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon name="user-check" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.totals?.total_students ?? 0}</div>
          <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
            {data?.totals?.student_present ?? 0} Present &bull; {data?.totals?.student_absent ?? 0} Absent
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {(data?.totals?.emp_leave_approvals ?? 0) + (data?.totals?.student_leave_approvals ?? 0)}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Leave requests pending</p>
        </div>
      </div>

      {/* ── ORGANIZATIONS MATRIX SPREADSHEET TABLE ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-amber-300 shadow-md overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 border-b border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-amber-300 flex items-center justify-center font-black text-xs">
              M
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Head Office Cross-Organization Matrix
              </h2>
              <p className="text-[11px] font-bold text-slate-700">
                Live snapshot of employee &amp; student rosters, daily presence, and leaves
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <Icon
              name="search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organisation or branch..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/90 border border-amber-400 text-xs font-semibold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Group Header */}
            <thead>
              <tr className="bg-amber-400 border-b-2 border-slate-900 text-[11px] font-black uppercase text-slate-900">
                <th className="py-2.5 px-4 border-r border-amber-500">Organisation Details</th>
                <th colSpan={5} className="py-2.5 px-3 text-center border-r border-amber-500 bg-amber-400/90">
                  👥 Employee Attendance &amp; Leaves
                </th>
                <th colSpan={5} className="py-2.5 px-3 text-center bg-amber-400/80">
                  🎓 Student Attendance &amp; Leaves
                </th>
              </tr>
              {/* Spreadsheet Column Headers matching user's layout */}
              <tr className="bg-amber-300 text-slate-950 font-black text-[11px] uppercase tracking-wider border-b-2 border-slate-900 divide-x divide-amber-400">
                <th className="py-3 px-4 min-w-[200px]">Orag Name</th>
                <th className="py-3 px-3 text-center min-w-[90px] bg-amber-200">Total EMP</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-emerald-950 bg-emerald-100">Preent</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-indigo-950 bg-indigo-100">Leave</th>
                <th className="py-3 px-3 text-center min-w-[110px] text-amber-950 bg-amber-100">Leave Approvals</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-rose-950 bg-rose-100">Abcent</th>
                <th className="py-3 px-3 text-center min-w-[100px] bg-amber-200">Total Students</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-emerald-950 bg-emerald-100">Preent</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-indigo-950 bg-indigo-100">Leave</th>
                <th className="py-3 px-3 text-center min-w-[110px] text-amber-950 bg-amber-100">Leave Approvals</th>
                <th className="py-3 px-3 text-center min-w-[85px] text-rose-950 bg-rose-100">Abcent</th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-amber-200 text-slate-800 font-semibold bg-amber-50/20">
              {filteredMatrix.length > 0 ? (
                filteredMatrix.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-amber-100/70 transition-colors divide-x divide-amber-200/80"
                  >
                    {/* Organization Name */}
                    <td className="py-3.5 px-4 font-black text-slate-950 bg-amber-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-sm font-extrabold">{row.org_name}</span>
                            {row.branch_name && row.branch_name !== row.org_name && (
                              <span className="block text-[10px] text-slate-500 font-medium">
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
                          className="px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-[10px] font-bold text-slate-700 border border-slate-200 shadow-2xs transition-all cursor-pointer"
                          title="Open in Dashboard"
                        >
                          View
                        </button>
                      </div>
                    </td>

                    {/* Total EMP */}
                    <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 bg-amber-50/30">
                      {row.total_emp}
                    </td>

                    {/* EMP Present */}
                    <td className="py-3.5 px-3 text-center font-extrabold text-emerald-700 bg-emerald-50/50">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
                        {row.emp_present}
                      </span>
                    </td>

                    {/* EMP Leave */}
                    <td className="py-3.5 px-3 text-center font-bold text-indigo-700 bg-indigo-50/40">
                      {row.emp_leave}
                    </td>

                    {/* EMP Leave Approvals */}
                    <td className="py-3.5 px-3 text-center font-bold text-amber-800 bg-amber-50/50">
                      {row.emp_leave_approvals > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                          {row.emp_leave_approvals}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* EMP Absent */}
                    <td className="py-3.5 px-3 text-center font-bold text-rose-700 bg-rose-50/50">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100/80 text-rose-800 font-bold">
                        {row.emp_absent}
                      </span>
                    </td>

                    {/* Total Students */}
                    <td className="py-3.5 px-3 text-center font-extrabold text-slate-900 bg-amber-50/30">
                      {row.total_students}
                    </td>

                    {/* Students Present */}
                    <td className="py-3.5 px-3 text-center font-extrabold text-emerald-700 bg-emerald-50/50">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
                        {row.student_present}
                      </span>
                    </td>

                    {/* Students Leave */}
                    <td className="py-3.5 px-3 text-center font-bold text-indigo-700 bg-indigo-50/40">
                      {row.student_leave}
                    </td>

                    {/* Students Leave Approvals */}
                    <td className="py-3.5 px-3 text-center font-bold text-amber-800 bg-amber-50/50">
                      {row.student_leave_approvals > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                          {row.student_leave_approvals}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Students Absent */}
                    <td className="py-3.5 px-3 text-center font-bold text-rose-700 bg-rose-50/50">
                      <span className="px-2 py-0.5 rounded-md bg-rose-100/80 text-rose-800 font-bold">
                        {row.student_absent}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                    {loading ? 'Loading live matrix...' : 'No organizations found.'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            {data?.totals && (
              <tfoot>
                <tr className="bg-amber-300 font-black text-slate-950 border-t-2 border-slate-900 divide-x divide-amber-400 text-xs">
                  <td className="py-3.5 px-4 font-black uppercase tracking-wider bg-amber-400">
                    Grand Total ({filteredMatrix.length} Orgs)
                  </td>
                  <td className="py-3.5 px-3 text-center font-black bg-amber-200">
                    {data.totals.total_emp}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-950 bg-emerald-200">
                    {data.totals.emp_present}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-indigo-950 bg-indigo-200">
                    {data.totals.emp_leave}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-950 bg-amber-200">
                    {data.totals.emp_leave_approvals}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-rose-950 bg-rose-200">
                    {data.totals.emp_absent}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black bg-amber-200">
                    {data.totals.total_students}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-emerald-950 bg-emerald-200">
                    {data.totals.student_present}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-indigo-950 bg-indigo-200">
                    {data.totals.student_leave}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-amber-950 bg-amber-200">
                    {data.totals.student_leave_approvals}
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-rose-950 bg-rose-200">
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
