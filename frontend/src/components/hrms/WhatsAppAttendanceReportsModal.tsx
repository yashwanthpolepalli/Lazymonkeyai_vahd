import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { WhatsAppGatewayConnectModal } from './WhatsAppGatewayConnectModal';

interface DayWiseRecord {
  day: number;
  date: string;
  weekday: string;
  status: 'PRESENT' | 'ABSENT' | 'SUNDAY' | 'UPCOMING';
  punch_time: string | null;
  check_out_time: string | null;
  device: string | null;
}

interface StudentOverviewItem {
  student_id: string;
  student_name: string;
  roll_number: string;
  student_email: string;
  course: string;
  branch_id?: string;
  parent_phone: string;
  has_parent_phone: boolean;
  total_working_days: number;
  days_present: number;
  days_absent: number;
  attendance_percentage: number;
  status_code: 'EXCELLENT' | 'GOOD' | 'SHORTAGE' | 'CRITICAL';
  status_text: string;
  day_wise_records: DayWiseRecord[];
  dispatch_status: 'SENT' | 'NOT_SENT' | 'FAILED';
  last_dispatched_at: string | null;
  last_message_id: string | null;
  last_dispatch_type: string | null;
}

interface OverviewResponse {
  year: number;
  month: number;
  month_name: string;
  total_students: number;
  parents_mapped_count: number;
  missing_parents_count: number;
  dispatched_count: number;
  pending_dispatch_count: number;
  average_attendance: number;
  students: StudentOverviewItem[];
}

interface WhatsAppLogItem {
  id: string;
  student_id: string;
  student_name: string;
  parent_phone: string;
  year: number;
  month: number;
  month_name: string;
  total_working_days: number;
  days_present: number;
  days_absent: number;
  attendance_percentage: number;
  whatsapp_message_id?: string;
  delivery_status: string;
  dispatch_type: string;
  message_body: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppAttendanceReportsModal({ isOpen, onClose }: Props) {
  const now = new Date();
  const [targetYear, setTargetYear] = useState<number>(now.getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(now.getMonth() + 1);

  const [activeTab, setActiveTab] = useState<'mapping' | 'logs'>('mapping');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchingAll, setDispatchingAll] = useState<boolean>(false);
  const [dispatchingStudentId, setDispatchingStudentId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'pending' | 'missing' | 'shortage'>('all');

  const [selectedDayWiseStudent, setSelectedDayWiseStudent] = useState<StudentOverviewItem | null>(null);
  const [previewMessage, setPreviewMessage] = useState<{ title: string; body: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGatewayModalOpen, setIsGatewayModalOpen] = useState<boolean>(false);
  const [isGatewayConnected, setIsGatewayConnected] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const checkGatewayStatus = async () => {
    try {
      const res = await apiClient.get<Record<string, any>>('/whatsapp-automation/sessions');
      if (res && typeof res === 'object') {
        const connected = Object.values(res).some((s: any) => s.status === 'CONNECTED');
        setIsGatewayConnected(connected);
      }
    } catch {
      setIsGatewayConnected(false);
    }
  };

  const loadOverview = async (y = targetYear, m = targetMonth) => {
    setLoading(true);
    try {
      const res = await apiClient.get<OverviewResponse>(`/customers/attendance-reports/overview?year=${y}&month=${m}`);
      setOverview(res);
    } catch (err: any) {
      console.error('Failed to load attendance reports overview:', err);
      showToast(err?.message || 'Failed to load attendance reports overview.');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (y = targetYear, m = targetMonth) => {
    try {
      const res = await apiClient.get<WhatsAppLogItem[]>(`/customers/attendance-reports/logs?year=${y}&month=${m}&limit=150`);
      setLogs(res || []);
    } catch (err) {
      console.error('Failed to load WhatsApp dispatch logs:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOverview(targetYear, targetMonth);
      loadLogs(targetYear, targetMonth);
      checkGatewayStatus();
    }
  }, [isOpen, targetYear, targetMonth]);

  const handleSendSingleReport = async (student: StudentOverviewItem) => {
    if (!student.parent_phone) {
      showToast(`Cannot send: Missing parent phone for ${student.student_name}.`);
      return;
    }
    setDispatchingStudentId(student.student_id);
    try {
      const res = await apiClient.post<any>(`/customers/${student.student_id}/attendance-report/send-whatsapp`, {
        year: targetYear,
        month: targetMonth,
        dispatch_type: 'MANUAL_DISPATCH',
      });
      if (res?.whatsapp_url && !res?.gateway_sent) {
        window.open(res.whatsapp_url, '_blank');
        showToast(`Opening WhatsApp Web for ${student.parent_phone} with pre-filled report...`);
      } else {
        showToast(res?.message || `Monthly attendance report dispatched to parent (${student.parent_phone})!`);
      }
      loadOverview(targetYear, targetMonth);
      loadLogs(targetYear, targetMonth);
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch report to parent.');
    } finally {
      setDispatchingStudentId(null);
    }
  };

  const handleDispatchAll = async () => {
    if (!window.confirm(`Are you sure you want to dispatch monthly attendance reports via WhatsApp to all registered parents for ${overview?.month_name || ''} ${targetYear}?`)) {
      return;
    }
    setDispatchingAll(true);
    try {
      const res = await apiClient.post<any>('/customers/attendance-reports/dispatch-monthly', {
        year: targetYear,
        month: targetMonth,
        dispatch_type: 'AUTOMATED_MONTH_END',
      });
      showToast(res?.message || 'Monthly attendance reports dispatched to parents via WhatsApp!');
      loadOverview(targetYear, targetMonth);
      loadLogs(targetYear, targetMonth);
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch reports.');
    } finally {
      setDispatchingAll(false);
    }
  };

  const handleDownloadCsv = (studentId: string) => {
    const url = `/api/v1/customers/${studentId}/attendance-report/csv?year=${targetYear}&month=${targetMonth}`;
    window.open(url, '_blank');
  };

  const handlePrintPdf = (studentId: string) => {
    const url = `/api/v1/customers/${studentId}/attendance-report/pdf?year=${targetYear}&month=${targetMonth}`;
    window.open(url, '_blank');
  };

  const filteredStudents = useMemo(() => {
    if (!overview?.students) return [];
    return overview.students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.student_name.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        s.student_id.toLowerCase().includes(q) ||
        s.parent_phone.includes(q) ||
        s.course.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === 'sent') return s.dispatch_status === 'SENT';
      if (statusFilter === 'pending') return s.dispatch_status !== 'SENT' && s.has_parent_phone;
      if (statusFilter === 'missing') return !s.has_parent_phone;
      if (statusFilter === 'shortage') return s.attendance_percentage < 75.0;

      return true;
    });
  }, [overview, searchQuery, statusFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-7xl max-h-[94vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-slide-in text-sm font-medium">
            <Icon name="check-circle" className="text-emerald-400" size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-900 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Icon name="message-square" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  WhatsApp Monthly Attendance Reports
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full border border-blue-300 dark:border-blue-700">
                  Student Attendance
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated month-end biometric attendance reports dispatched directly to registered mobile numbers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Month & Year Selectors */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 px-2 py-1 outline-none cursor-pointer"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>

              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 px-2 py-1 outline-none cursor-pointer border-l border-slate-200 dark:border-slate-700"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* WhatsApp Gateway Status / Connect Button */}
            <button
              type="button"
              onClick={() => setIsGatewayModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm border cursor-pointer active:scale-95 ${
                isGatewayConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-100 animate-pulse'
              }`}
              title="Click to view WhatsApp Gateway connection or scan QR code"
            >
              <span className={`w-2 h-2 rounded-full ${isGatewayConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <Icon name="smartphone" size={14} />
              <span>{isGatewayConnected ? 'Gateway: Connected' : 'Link WhatsApp (Scan QR)'}</span>
            </button>

            <button
              onClick={() => {
                loadOverview(targetYear, targetMonth);
                loadLogs(targetYear, targetMonth);
                checkGatewayStatus();
              }}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh attendance records"
            >
              <Icon name="refresh-cw" size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        {/* Live Gateway QR Alert Banner if Unpaired */}
        {!isGatewayConnected && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-white shadow-inner animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                <Icon name="smartphone" size={18} />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  WhatsApp Background Automation Device Unpaired
                </p>
                <p className="text-[11px] text-amber-100 leading-tight mt-0.5">
                  Scan the QR code once to enable 100% automated background message delivery to parents without manual clicks.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGatewayModalOpen(true)}
              className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 font-black rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
            >
              <Icon name="smartphone" size={14} />
              <span>Scan QR Code</span>
            </button>
          </div>
        )}

        {/* Top KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {overview?.total_students ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">Active enrollments</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
              <Icon name="check-circle" size={12} /> Registered Mobiles
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {overview?.parents_mapped_count ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">{overview?.missing_parents_count ?? 0} missing numbers</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block flex items-center gap-1">
              <Icon name="send" size={12} /> Dispatched This Month
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {overview?.dispatched_count ?? 0}
            </div>
            <span className="text-[10px] text-slate-500">{overview?.pending_dispatch_count ?? 0} pending dispatch</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block flex items-center gap-1">
              <Icon name="bar-chart-2" size={12} /> Average Attendance
            </span>
            <div className="text-xl font-black text-violet-600 dark:text-violet-400 mt-0.5">
              {overview?.average_attendance ?? 0}%
            </div>
            <span className="text-[10px] text-slate-500">Month overall</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-3 rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              <Icon name="clock" size={13} /> Month-End Auto Job
            </div>
            <div className="text-xs font-semibold mt-1 text-emerald-50">
              Active: Runs automatically at month end (18:00 IST)
            </div>
          </div>
        </div>

        {/* Toolbar Tabs & Actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('mapping')}
              className={cn(
                'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2',
                activeTab === 'mapping'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon name="users" size={14} />
              <span>Student Attendance ({overview?.students?.length ?? 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={cn(
                'px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2',
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon name="file-text" size={14} />
              <span>WhatsApp Delivery Audit Logs ({logs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={dispatchingAll || (overview?.parents_mapped_count ?? 0) === 0}
              onClick={handleDispatchAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Icon name="send" size={14} className={dispatchingAll ? 'animate-bounce' : ''} />
              <span>{dispatchingAll ? 'Dispatching to All Parents...' : '🚀 Dispatch All Month-End WhatsApp Reports'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'mapping' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter / Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student by name, ID, parent mobile..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">Filter:</span>
                {(['all', 'sent', 'pending', 'missing', 'shortage'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStatusFilter(mode)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-colors',
                      statusFilter === mode
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    {mode === 'all' && 'All'}
                    {mode === 'sent' && 'Dispatched'}
                    {mode === 'pending' && 'Pending'}
                    {mode === 'missing' && 'Missing Mobile'}
                    {mode === 'shortage' && '< 75% Shortage'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700 z-10">
                  <tr>
                    <th className="p-3">Student Profile</th>
                    <th className="p-3">Course / Degree</th>
                    <th className="p-3">Registered Mobile</th>
                    <th className="p-3">Monthly Biometric Attendance</th>
                    <th className="p-3">WhatsApp Dispatch Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        <Icon name="inbox" size={36} className="mx-auto mb-2 opacity-40" />
                        <div className="font-semibold">No students found matching current filters</div>
                        <div className="text-[11px] mt-1">Enroll students with registered mobile numbers to dispatch automated reports.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white uppercase">
                            {s.student_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {s.roll_number || s.student_id}
                          </div>
                        </td>

                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {s.course || 'Degree Program'}
                        </td>

                        <td className="p-3">
                          {s.has_parent_phone ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {s.parent_phone}
                              </span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                                MAPPED
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-500 font-semibold text-[11px]">
                              <Icon name="alert-triangle" size={13} />
                              <span>No parent mobile</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] font-black',
                                s.attendance_percentage >= 75
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : s.attendance_percentage >= 65
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              )}
                            >
                              {s.attendance_percentage}%
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {s.days_present} / {s.total_working_days} Days
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{s.status_text}</div>
                        </td>

                        <td className="p-3">
                          {s.dispatch_status === 'SENT' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <Icon name="check-circle" size={11} /> SENT VIA WHATSAPP
                              </span>
                              {s.last_dispatched_at && (
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {s.last_dispatched_at}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              PENDING DISPATCH
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Day-Wise View Button */}
                            <button
                              onClick={() => setSelectedDayWiseStudent(s)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="View dynamic day-wise attendance"
                            >
                              <Icon name="calendar" size={12} />
                              <span>Day-wise</span>
                            </button>

                            {/* CSV Download Button */}
                            <button
                              onClick={() => handleDownloadCsv(s.student_id)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Download Day-Wise CSV"
                            >
                              <Icon name="download" size={12} />
                              <span>CSV</span>
                            </button>

                            {/* Printable PDF Button */}
                            <button
                              onClick={() => handlePrintPdf(s.student_id)}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Print Official Report PDF"
                            >
                              <Icon name="printer" size={12} />
                              <span>PDF</span>
                            </button>

                            {/* Send to Parent WhatsApp */}
                            <button
                              disabled={dispatchingStudentId === s.student_id || !s.has_parent_phone}
                              onClick={() => handleSendSingleReport(s)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                              title={`Send to parent ${s.parent_phone}`}
                            >
                              <Icon name="send" size={11} className={dispatchingStudentId === s.student_id ? 'animate-spin' : ''} />
                              <span>{dispatchingStudentId === s.student_id ? 'Sending...' : 'Send WhatsApp'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Logs Tab */
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700 z-10 shadow-sm">
                <tr>
                  <th className="p-3">Dispatched Time (IST)</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Recipient Mobile</th>
                  <th className="p-3">Reporting Period</th>
                  <th className="p-3">Attendance %</th>
                  <th className="p-3">Delivery Status</th>
                  <th className="p-3">Dispatch Type</th>
                  <th className="p-3 text-right">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400">
                      <Icon name="message-square" size={36} className="mx-auto mb-2 opacity-40" />
                      <div className="font-semibold">No dispatched WhatsApp reports recorded yet</div>
                      <div className="text-[11px] mt-1">Dispatches will be audited and logged here in real-time.</div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-500">{log.created_at}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">{log.student_name}</td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{log.parent_phone}</td>
                      <td className="p-3">{log.month_name} {log.year}</td>
                      <td className="p-3 font-bold">{log.attendance_percentage}%</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {log.delivery_status}
                        </span>
                      </td>
                      <td className="p-3 text-[10px] font-mono text-slate-400">{log.dispatch_type}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setPreviewMessage({
                            title: `WhatsApp Message for ${log.student_name}`,
                            body: log.message_body,
                          })}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold"
                        >
                          View Message
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Biometric Live Sync Active • Attendance records pulled directly from biometric terminals.</span>
          </div>
          <div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Day-Wise Attendance Modal */}
      {selectedDayWiseStudent && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white uppercase">
                  {selectedDayWiseStudent.student_name} — Day-Wise Attendance
                </h3>
                <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                  <span>Month: <strong>{overview?.month_name} {targetYear}</strong></span>
                  <span>Parent: <strong className="text-emerald-600">{selectedDayWiseStudent.parent_phone || 'N/A'}</strong></span>
                  <span>Monthly %: <strong>{selectedDayWiseStudent.attendance_percentage}%</strong></span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayWiseStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Day</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Weekday</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Punch-In Time</th>
                    <th className="p-2">Punch-Out Time</th>
                    <th className="p-2">Device</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedDayWiseStudent.day_wise_records?.map((r) => (
                    <tr key={r.day} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 font-mono font-bold">{r.day}</td>
                      <td className="p-2">{r.date}</td>
                      <td className="p-2 font-medium">{r.weekday}</td>
                      <td className="p-2">
                        {r.status === 'PRESENT' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            PRESENT
                          </span>
                        )}
                        {r.status === 'ABSENT' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            ABSENT
                          </span>
                        )}
                        {r.status === 'SUNDAY' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            SUNDAY
                          </span>
                        )}
                        {r.status === 'UPCOMING' && (
                          <span className="text-slate-400 text-[10px]">--</span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{r.punch_time || '--'}</td>
                      <td className="p-2 font-mono text-slate-700 dark:text-slate-300">{r.check_out_time || '--'}</td>
                      <td className="p-2 text-slate-500 text-[10px]">{r.device || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCsv(selectedDayWiseStudent.student_id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Icon name="download" size={13} />
                  <span>Download Day-wise CSV</span>
                </button>
                <button
                  onClick={() => handlePrintPdf(selectedDayWiseStudent.student_id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Icon name="printer" size={13} />
                  <span>Print Official PDF</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedDayWiseStudent(null)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Body Preview Modal */}
      {previewMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{previewMessage.title}</h4>
              <button onClick={() => setPreviewMessage(null)} className="text-slate-400 hover:text-slate-700">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto my-3 p-4 bg-emerald-50/50 dark:bg-slate-950 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 border border-emerald-100 dark:border-slate-800">
              {previewMessage.body}
            </div>
            <div className="text-right pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPreviewMessage(null)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Gateway QR Code & Connection Modal */}
      <WhatsAppGatewayConnectModal
        isOpen={isGatewayModalOpen}
        onClose={() => {
          setIsGatewayModalOpen(false);
          checkGatewayStatus();
        }}
        onSessionStatusChange={setIsGatewayConnected}
      />
    </div>
  );
}
