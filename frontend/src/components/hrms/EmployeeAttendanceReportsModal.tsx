import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

interface EmployeeOverviewItem {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  vahd_branch?: string;
  branch_id?: string;
  total_working_days: number;
  days_present: number;
  days_absent: number;
  days_leave: number;
  attendance_percentage: number;
  delivery_status: 'SENT' | 'FAILED' | 'PENDING' | string;
  last_sent_at?: string | null;
  error_message?: string | null;
}

interface OverviewResponse {
  year: number;
  month: number;
  month_name: string;
  total_employees: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
  employees: EmployeeOverviewItem[];
}

interface EmailLogItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  email: string;
  branch_id?: string;
  vahd_branch?: string;
  year: number;
  month: number;
  month_name: string;
  total_working_days: number;
  days_present: number;
  days_absent: number;
  days_leave: number;
  attendance_percentage: number;
  delivery_status: string;
  dispatch_type: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
}

export function EmployeeAttendanceReportsModal({ isOpen, onClose, branchId }: Props) {
  const now = new Date();
  const [targetYear, setTargetYear] = useState<number>(now.getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(now.getMonth() + 1);

  const [activeTab, setActiveTab] = useState<'delivery' | 'logs'>('delivery');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchingAll, setDispatchingAll] = useState<boolean>(false);
  const [dispatchingEmpId, setDispatchingEmpId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');

  const [selectedDayWiseEmp, setSelectedDayWiseEmp] = useState<any | null>(null);
  const [loadingDayWise, setLoadingDayWise] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadOverview = async (y = targetYear, m = targetMonth) => {
    setLoading(true);
    try {
      const bParam = branchId ? `&branch_id=${encodeURIComponent(branchId)}` : '';
      const res = await apiClient.get<OverviewResponse>(`/hrms/attendance-reports/overview?year=${y}&month=${m}${bParam}`);
      setOverview(res);
    } catch (err: any) {
      console.error('Failed to load employee attendance reports overview:', err);
      showToast(err?.message || 'Failed to load attendance reports overview.');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (y = targetYear, m = targetMonth) => {
    setLoading(true);
    try {
      const bParam = branchId ? `&branch_id=${encodeURIComponent(branchId)}` : '';
      const res = await apiClient.get<EmailLogItem[]>(`/hrms/attendance-reports/logs?year=${y}&month=${m}${bParam}`);
      setLogs(res || []);
    } catch (err: any) {
      console.error('Failed to load employee dispatch logs:', err);
      showToast(err?.message || 'Failed to load dispatch logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'delivery') {
        loadOverview(targetYear, targetMonth);
      } else {
        loadLogs(targetYear, targetMonth);
      }
    }
  }, [isOpen, targetYear, targetMonth, activeTab, branchId]);

  if (!isOpen) return null;

  // Single dispatch
  const handleDispatchSingle = async (emp: EmployeeOverviewItem) => {
    setDispatchingEmpId(emp.employee_id);
    try {
      const res = await apiClient.post<any>(`/hrms/${emp.employee_id}/attendance-report/send-email`, {
        year: targetYear,
        month: targetMonth
      });
      if (res?.success) {
        showToast(`✅ Monthly attendance email sent to ${emp.employee_name} (${emp.email})`);
      } else {
        showToast(`⚠️ ${res?.message || res?.error_message || 'Delivery marked failed.'}`);
      }
      loadOverview();
    } catch (err: any) {
      console.error('Single email dispatch error:', err);
      showToast(err?.message || 'Email dispatch failed.');
    } finally {
      setDispatchingEmpId(null);
    }
  };

  // Bulk dispatch
  const handleDispatchAll = async () => {
    if (!overview || overview.employees.length === 0) return;
    const count = overview.employees.length;
    if (!window.confirm(`Are you sure you want to dispatch monthly attendance emails to all ${count} employees for ${overview.month_name} ${overview.year}? Each employee will receive their statement with Excel attachment.`)) {
      return;
    }

    setDispatchingAll(true);
    try {
      const res = await apiClient.post<any>('/hrms/attendance-reports/dispatch-monthly', {
        year: targetYear,
        month: targetMonth,
        branch_id: branchId
      });
      showToast(`🎉 Bulk dispatch finished: ${res?.sent_count || 0} sent, ${res?.failed_count || 0} failed.`);
      loadOverview();
    } catch (err: any) {
      console.error('Bulk email dispatch error:', err);
      showToast(err?.message || 'Bulk dispatch failed.');
    } finally {
      setDispatchingAll(false);
    }
  };

  // View Day-Wise Breakdown
  const handleViewDayWise = async (empId: string) => {
    setLoadingDayWise(true);
    try {
      const rep = await apiClient.get<any>(`/hrms/${empId}/attendance-report?year=${targetYear}&month=${targetMonth}`);
      setSelectedDayWiseEmp(rep);
    } catch (err: any) {
      console.error('Failed to load day-wise report:', err);
      showToast(err?.message || 'Failed to load day-wise punches.');
    } finally {
      setLoadingDayWise(false);
    }
  };

  // Filtered employees
  const filteredEmployees = (overview?.employees || []).filter((emp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.employee_name.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'sent') return emp.delivery_status === 'SENT';
    if (statusFilter === 'pending') return emp.delivery_status === 'PENDING';
    if (statusFilter === 'failed') return emp.delivery_status === 'FAILED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[90] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3">
          <Icon name="bell" size={15} className="text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] tracking-wider uppercase border border-indigo-400/30">
                HRMS Auto-Email Engine
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Delivery Status Tracker
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Icon name="mail" size={24} className="text-indigo-400" />
              Monthly Employee Attendance Email Statements
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Individual statements sent to employees with total working days, present, absent, leaves, and Excel attachments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <select
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
              className="bg-white/10 text-white border border-white/20 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
              className="bg-white/10 text-white border border-white/20 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {[
                { m: 1, name: 'Jan' },
                { m: 2, name: 'Feb' },
                { m: 3, name: 'Mar' },
                { m: 4, name: 'Apr' },
                { m: 5, name: 'May' },
                { m: 6, name: 'Jun' },
                { m: 7, name: 'Jul' },
                { m: 8, name: 'Aug' },
                { m: 9, name: 'Sep' },
                { m: 10, name: 'Oct' },
                { m: 11, name: 'Nov' },
                { m: 12, name: 'Dec' }
              ].map(({ m, name }) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={() => (activeTab === 'delivery' ? loadOverview() : loadLogs())}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh"
            >
              <Icon name="refresh-cw" size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-white transition-colors ml-2"
              title="Close Modal"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Stats Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'delivery'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <Icon name="users" size={14} />
              <span>1. Employee Delivery Status Tracker</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
            >
              <Icon name="file-text" size={14} />
              <span>2. Email Dispatch Audit Logs</span>
            </button>
          </div>

          {/* Quick Metrics */}
          {activeTab === 'delivery' && overview && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                Total: <strong className="text-slate-900">{overview.total_employees}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                Sent: <strong className="text-emerald-900">{overview.sent_count}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                Pending: <strong className="text-amber-900">{overview.pending_count}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                Failed: <strong className="text-rose-900">{overview.failed_count}</strong>
              </span>

              {/* Bulk Dispatch Button */}
              <button
                onClick={handleDispatchAll}
                disabled={dispatchingAll || overview.total_employees === 0}
                className="ml-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Icon name="send" size={13} className={dispatchingAll ? 'animate-spin' : ''} />
                <span>{dispatchingAll ? 'Sending Emails...' : 'Dispatch All Monthly Emails'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Delivery Status Table */}
        {activeTab === 'delivery' && (
          <div className="flex-1 overflow-hidden flex flex-col p-6">
            {/* Search & Status Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Icon name="search" size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, code, designation, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'all', label: 'All Employees' },
                  { key: 'sent', label: `Sent (${overview?.sent_count || 0})` },
                  { key: 'pending', label: `Pending (${overview?.pending_count || 0})` },
                  { key: 'failed', label: `Failed (${overview?.failed_count || 0})` }
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === f.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Code &amp; Email</th>
                    <th className="py-3 px-4 text-center">Working Days</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Leaves</th>
                    <th className="py-3 px-4 text-center">Score %</th>
                    <th className="py-3 px-4 text-center">Email Delivery Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                        Computing real-time employee attendance statements...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSent = emp.delivery_status === 'SENT';
                      const isFailed = emp.delivery_status === 'FAILED';
                      const isPending = emp.delivery_status === 'PENDING';
                      const isBusy = dispatchingEmpId === emp.employee_id;

                      return (
                        <tr key={emp.employee_id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Employee Name & Role */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                                {emp.employee_name ? emp.employee_name[0].toUpperCase() : 'E'}
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-900">{emp.employee_name}</div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {emp.designation} &bull; {emp.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Code & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-slate-800 font-bold text-xs">{emp.employee_code}</div>
                            <div className="text-[11px] text-indigo-600 font-medium truncate max-w-[180px]">
                              {emp.email}
                            </div>
                          </td>

                          {/* Working Days */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                            {emp.total_working_days}
                          </td>

                          {/* Present */}
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600 bg-emerald-50/40">
                            {emp.days_present}
                          </td>

                          {/* Absent */}
                          <td className="py-3.5 px-4 text-center font-bold text-rose-600 bg-rose-50/40">
                            {emp.days_absent}
                          </td>

                          {/* Leaves */}
                          <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                            {emp.days_leave}
                          </td>

                          {/* Score % */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${emp.attendance_percentage >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : emp.attendance_percentage >= 60
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {emp.attendance_percentage}%
                            </span>
                          </td>

                          {/* Delivery Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {isSent && (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Icon name="check-circle" size={12} className="text-emerald-600" />
                                  RECEIVED
                                </span>
                                {emp.last_sent_at && (
                                  <span className="text-[9px] text-slate-400 mt-0.5">
                                    {new Date(emp.last_sent_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}

                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                <Icon name="clock" size={12} className="text-amber-600" />
                                NOT SENT YET
                              </span>
                            )}

                            {isFailed && (
                              <div className="inline-flex flex-col items-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                  <Icon name="alert-triangle" size={12} className="text-rose-600" />
                                  FAILED
                                </span>
                                {emp.error_message && (
                                  <span className="text-[9px] text-rose-500 font-medium truncate max-w-[120px]" title={emp.error_message}>
                                    {emp.error_message}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Send Email Now */}
                              <button
                                onClick={() => handleDispatchSingle(emp)}
                                disabled={isBusy}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all ${isSent
                                    ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                                  }`}
                                title="Send monthly statement email to employee"
                              >
                                <Icon name="mail" size={12} className={isBusy ? 'animate-spin' : ''} />
                                <span>{isBusy ? 'Sending...' : isSent ? 'Re-send' : 'Send'}</span>
                              </button>

                              {/* Download CSV / Excel */}
                              <a
                                href={`/api/v1/hrms/${emp.employee_id}/attendance-report/csv?year=${targetYear}&month=${targetMonth}`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors"
                                title="Download Excel/CSV Report"
                              >
                                <Icon name="download" size={13} />
                              </a>

                              {/* View / Print PDF */}
                              <a
                                href={`/api/v1/hrms/${emp.employee_id}/attendance-report/pdf?year=${targetYear}&month=${targetMonth}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors"
                                title="View &amp; Print PDF Statement"
                              >
                                <Icon name="printer" size={13} />
                              </a>

                              {/* View Daily Punches */}
                              <button
                                onClick={() => handleViewDayWise(emp.employee_id)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors"
                                title="View Day-Wise Matrix"
                              >
                                <Icon name="calendar" size={13} />
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
        )}

        {/* Tab 2: Dispatch Audit Logs */}
        {activeTab === 'logs' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Recipient Email</th>
                    <th className="py-3 px-4 text-center">Reporting Period</th>
                    <th className="py-3 px-4 text-center">Present / Working</th>
                    <th className="py-3 px-4 text-center">Delivery Status</th>
                    <th className="py-3 px-4">Notes / Error Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                        Loading email dispatch audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                        No email dispatch records found for {targetYear}-{targetMonth}.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {log.sent_at || log.created_at ? new Date(log.sent_at || log.created_at).toLocaleString() : '--'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.employee_name} ({log.employee_code})
                        </td>
                        <td className="py-3 px-4 font-mono text-indigo-600 text-xs">{log.email}</td>
                        <td className="py-3 px-4 text-center font-bold">
                          {log.month_name} {log.year}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">
                          {log.days_present} / {log.total_working_days} ({log.attendance_percentage}%)
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${log.delivery_status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                          >
                            {log.delivery_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {log.error_message || (log.delivery_status === 'SENT' ? 'Delivered successfully with CSV attachment' : '--')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Icon name="shield-check" size={14} className="text-emerald-600" />
            <span>Automated End-of-Month Scheduler Active &bull; Emails dispatched automatically with Excel attachments.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Sub-Modal: Day-Wise Punch Breakdown */}
      {selectedDayWiseEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {selectedDayWiseEmp.employee_name} ({selectedDayWiseEmp.employee_code})
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedDayWiseEmp.designation} &bull; {selectedDayWiseEmp.month_name} {selectedDayWiseEmp.year} &bull; Score:{' '}
                  <strong className="text-emerald-400">{selectedDayWiseEmp.attendance_percentage}%</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedDayWiseEmp(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Weekday</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Check In</th>
                    <th className="py-2.5 px-3">Check Out</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedDayWiseEmp.day_wise_records?.map((r: any) => (
                    <tr key={r.day} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{r.day}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.date}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.weekday}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${r.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'LEAVE'
                                ? 'bg-indigo-100 text-indigo-800'
                                : r.status === 'SUNDAY'
                                  ? 'bg-slate-100 text-slate-600'
                                  : r.status === 'UPCOMING'
                                    ? 'bg-slate-50 text-slate-400'
                                    : 'bg-rose-100 text-rose-800'
                            }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{r.check_in || '--'}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{r.check_out || '--'}</td>
                      <td className="py-2.5 px-3 font-semibold">{r.work_hours || 0} hrs</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{r.remarks || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDayWiseEmp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
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
