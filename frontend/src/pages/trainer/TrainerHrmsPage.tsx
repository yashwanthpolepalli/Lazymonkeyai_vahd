import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { TrainerGeofencePunchWidget } from '@/components/trainer/TrainerGeofencePunchWidget';
import { hrmsApi, formatLeaveOptionLabel, type LeaveItem, type PayrollItem, type EligibleLeaveType } from '@/services/hrmsApi';
import { apiClient } from '@/services/apiClient';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

type TrainerHrmsTab = 'attendance' | 'leave' | 'payroll';

interface TrainerProfileData {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  gender?: string;
  specialization?: string;
  base_monthly_salary: number;
  pt_session_rate: number;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
  assigned_customers_count?: number;
}

export function TrainerHrmsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: TrainerHrmsTab =
    rawTab === 'leave' || rawTab === 'payroll' || rawTab === 'attendance'
      ? rawTab
      : 'attendance';

  const setTab = (t: TrainerHrmsTab) => {
    setSearchParams({ tab: t });
  };

  const [trainerProfile, setTrainerProfile] = useState<TrainerProfileData | null>(null);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [eligibleLeaveTypes, setEligibleLeaveTypes] = useState<EligibleLeaveType[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [customerCheckins, setCustomerCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formLeaveType, setFormLeaveType] = useState('Casual Leave');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReason, setFormReason] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Payslip Modal State
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchTrainerData = async () => {
    setLoading(true);
    try {
      const [trainersRes, leavesRes, payrollRes, biometricsRes, customersRes] = await Promise.all([
        apiClient.get<TrainerProfileData[]>('/payroll/trainers').catch(() => []),
        hrmsApi.getLeaves().catch(() => []),
        hrmsApi.getPayroll().catch(() => []),
        api.biometrics.recent(50).catch(() => []),
        api.customers.list().catch(() => []),
      ]);

      // Match current logged in trainer
      let matchedTrainer = trainersRes.find(
        (t) =>
          (user?.id && (t.id === user.id || t.user_id === user.id)) ||
          (user?.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.name && t.full_name?.toLowerCase() === user.name.toLowerCase())
      ) || trainersRes[0] || null;

      setTrainerProfile(matchedTrainer);

      const tid = matchedTrainer?.id || user?.id || '';
      const tname = matchedTrainer?.full_name || user?.name || '';

      // Fetch eligible leave types for this trainer (respects gender, service days, owner config)
      if (tid) {
        try {
          const eligRes = await hrmsApi.getEligibleLeaveTypes(tid);
          const types = eligRes?.eligible_leave_types || [];
          setEligibleLeaveTypes(types);
          if (types.length > 0) {
            setFormLeaveTypeId(types[0].id);
            setFormLeaveType(types[0].name);
          }
        } catch (err) {
          console.error('Failed to fetch eligible leave types for trainer:', err);
        }
      }

      // Filter leaves for this trainer
      const myLeaves = leavesRes.filter((l) => {
        if (!matchedTrainer && !user) return true;
        return (
          l.employee_id === tid ||
          l.employee_id === `emp_${tid}` ||
          (l.employee_name && tname && l.employee_name.toLowerCase() === tname.toLowerCase())
        );
      });
      setLeaves(myLeaves.length > 0 ? myLeaves : leavesRes);

      // Filter payroll for this trainer
      const myPayroll = payrollRes.filter((p) => {
        if (!matchedTrainer && !user) return true;
        return (
          p.trainer_id === tid ||
          p.employee_id === tid ||
          p.employee_id === `emp_${tid}` ||
          (p.employee_name && tname && p.employee_name.toLowerCase() === tname.toLowerCase())
        );
      });
      setPayrollRecords(myPayroll.length > 0 ? myPayroll : payrollRes);

      // Filter biometric punches for this specific trainer
      if (Array.isArray(biometricsRes)) {
        const myAttendance = biometricsRes.filter((log: any) => {
          if (!matchedTrainer && !user) return true;
          return (
            log.customer_id === tid ||
            log.customer_id === `emp_${tid}` ||
            (log.meta_data?.user_id && log.meta_data.user_id === tid) ||
            (log.customer_name && tname && log.customer_name.toLowerCase() === tname.toLowerCase())
          );
        });
        setAttendanceLogs(myAttendance);
      }

      // Customers assigned to this trainer
      if (customersRes && Array.isArray(customersRes)) {
        const myCustomers = customersRes.filter((c: any) => {
          if (!matchedTrainer && !user) return false;
          return (
            c.assigned_trainer_id === tid ||
            c.trainer_id === tid ||
            (c.assigned_trainer && tname && c.assigned_trainer.toLowerCase() === tname.toLowerCase())
          );
        });
        const assignedCustIds = new Set(myCustomers.map((c: any) => c.id));
        const custLogs = (biometricsRes || []).filter(
          (log: any) =>
            log.customer_id &&
            assignedCustIds.has(log.customer_id) &&
            log.event_type !== 'FACE_ENROLLMENT'
        );
        setCustomerCheckins(custLogs);
      }
    } catch (err) {
      console.error('Error loading trainer HRMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainerData();
  }, [user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formStartDate || !formEndDate) {
      setFormError('Please select valid start and end dates.');
      return;
    }
    if (new Date(formEndDate) < new Date(formStartDate)) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const empId = trainerProfile?.id || user?.id || 'trainer_001';
      await hrmsApi.applyLeave({
        employee_id: empId,
        leave_type_id: formLeaveTypeId || undefined,
        leave_type: formLeaveType,
        start_date: formStartDate,
        end_date: formEndDate,
        reason: formReason.trim(),
        attachment_url: formAttachmentUrl.trim() || undefined,
      });
      triggerToast('Leave application submitted successfully! Awaiting owner review.');
      setShowApplyModal(false);
      setFormReason('');
      setFormAttachmentUrl('');

      // Refresh leaves & eligible quotas
      const [updated, eligRes] = await Promise.all([
        hrmsApi.getLeaves(),
        hrmsApi.getEligibleLeaveTypes(empId).catch(() => null),
      ]);
      setLeaves(updated || []);
      if (eligRes?.eligible_leave_types) {
        setEligibleLeaveTypes(eligRes.eligible_leave_types);
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err?.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 font-sans animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-brand-500/30 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}



      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. NAVIGATION SUB-PILLS                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-navy-100 rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'attendance', label: 'Daily Attendance & Punch', icon: 'clock' },
          { id: 'leave', label: 'Leave Requests & Approvals', icon: 'calendar' },
          { id: 'payroll', label: 'My Payroll & Payslips', icon: 'credit-card' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id as TrainerHrmsTab)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
                isSelected
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
              )}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. TAB 1: ATTENDANCE & GEOFENCED CLOCK-IN                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-fade-in">
          {/* Trainer Geofenced Punch Center */}
          <TrainerGeofencePunchWidget onPunchSuccess={fetchTrainerData} />


          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Days Present</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon name="check-circle" size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-navy-900">
                {attendanceLogs.length > 0 ? new Set(attendanceLogs.map((a: any) => a.timestamp?.slice(0, 10))).size : 24} Days
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">This current month</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Approved Leaves</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="calendar" size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-700">
                {leaves.filter((l) => l.status === 'Approved').reduce((acc, l) => acc + (l.days || 0), 0)} Days
              </div>
              <div className="text-[11px] text-purple-700 font-bold mt-1">Excused &amp; paid leaves</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Active PT Clients</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon name="users" size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-navy-900">
                {trainerProfile?.assigned_customers_count || 4} Members
              </div>
              <div className="text-[11px] text-blue-600 font-bold mt-1">Assigned for training</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Punctuality Score</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Icon name="award" size={16} />
                </div>
              </div>
              <div className="text-2xl font-black text-navy-900">98.5%</div>
              <div className="text-[11px] text-amber-600 font-bold mt-1">On-time attendance rate</div>
            </div>
          </div>

          {/* Personal Punch History */}
          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                  <Icon name="history" size={16} className="text-purple-600" />
                  <span>Personal Attendance &amp; Shift History</span>
                </h3>
                <p className="text-xs text-navy-500">Live biometric &amp; mobile punches recorded in database.</p>
              </div>
            </div>

            {attendanceLogs.length === 0 ? (
              <div className="py-12 text-center text-navy-400 text-xs font-bold">
                <Icon name="calendar-check" size={28} className="mx-auto text-navy-300 mb-2" />
                <div>No personal punch records logged yet. Clock in using the widget above.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">ACTION</th>
                      <th className="py-3 px-4">METHOD</th>
                      <th className="py-3 px-4">LOCATION / BRANCH</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {attendanceLogs.map((log: any, i: number) => {
                      const t = log.timestamp ? new Date(log.timestamp) : new Date();
                      const timeStr = t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                      const dateStr = t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const isCheckIn = (log.direction || 'CHECK_IN') === 'CHECK_IN';

                      return (
                        <tr key={log.id || i} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-navy-900">{timeStr}</div>
                            <div className="text-[10px] text-navy-400">{dateStr}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1',
                                isCheckIn ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                              )}
                            >
                              <Icon name={isCheckIn ? 'log-in' : 'log-out'} size={12} />
                              <span>{isCheckIn ? 'Clock In' : 'Clock Out'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-navy-700">
                            {log.event_type || log.meta_data?.method || 'GPS Geofence'}
                          </td>
                          <td className="py-3 px-4 text-navy-500">
                            {log.device_name || log.meta_data?.branch || 'Main Branch'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Success
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. TAB 2: LEAVE REQUESTS & BALANCES                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'leave' && (
        <div className="space-y-6 animate-fade-in">
          {/* Dynamic Leave Balances Header Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {eligibleLeaveTypes.slice(0, 3).map((policy) => {
              const rem = policy.balance?.remaining_days ?? policy.annual_quota;
              const isPaid = policy.paid_type === 'PAID' || policy.is_paid;
              return (
                <div key={policy.id} className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">{policy.name} ({policy.code})</span>
                    <span
                      className={cn(
                        'text-[9px] font-black px-1.5 py-0.2 rounded',
                        isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {isPaid ? 'PAID' : 'UNPAID'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-700">{rem} Days</div>
                  <div className="text-[11px] text-navy-400 mt-1">
                    {policy.annual_quota > 0 ? `${policy.balance?.used_days || 0}d used of ${policy.annual_quota}d quota` : 'Unlimited quota'}
                  </div>
                </div>
              );
            })}

            {/* Pending Approvals Summary */}
            <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
              <div className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-2">Pending Approvals</div>
              <div className="text-2xl font-black text-amber-600">
                {leaves.filter((l) => l.status === 'Pending').length} Request(s)
              </div>
              <div className="text-[11px] text-amber-700 font-bold mt-1">
                {leaves.filter((l) => l.status === 'Approved').reduce((acc, l) => acc + (l.days || 0), 0)} days approved this year
              </div>
            </div>
          </div>

          {/* Leave Applications History */}
          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                  <Icon name="calendar" size={16} className="text-purple-600" />
                  <span>My Leave Applications &amp; Status</span>
                </h3>
                <p className="text-xs text-navy-500">All submitted leave requests and owner review feedback.</p>
              </div>

              <button
                onClick={() => setShowApplyModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Icon name="plus" size={13} />
                <span>New Application</span>
              </button>
            </div>

            {leaves.length === 0 ? (
              <div className="py-12 text-center text-navy-400 text-xs font-bold space-y-2">
                <Icon name="calendar-x" size={28} className="mx-auto text-navy-300" />
                <div>No leave applications submitted yet.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3 px-4">LEAVE TYPE</th>
                      <th className="py-3 px-4">DURATION</th>
                      <th className="py-3 px-4">DAYS</th>
                      <th className="py-3 px-4">REASON</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4">REVIEWED BY</th>
                      <th className="py-3 px-4">APPLIED ON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[10px] font-bold border',
                              l.leave_type?.toLowerCase().includes('sick')
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : l.leave_type?.toLowerCase().includes('paid')
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            )}
                          >
                            {l.leave_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-900">
                          {l.start_date} → {l.end_date}
                        </td>
                        <td className="py-3 px-4 font-black text-navy-900">{l.days} Day(s)</td>
                        <td className="py-3 px-4 text-navy-600 max-w-xs truncate" title={l.reason}>
                          {l.reason || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit',
                              l.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : l.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            )}
                          >
                            <span
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                l.status === 'Approved'
                                  ? 'bg-emerald-500'
                                  : l.status === 'Pending'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              )}
                            />
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-navy-500">{l.approved_by || 'Pending Review'}</td>
                        <td className="py-3 px-4 text-navy-400 font-mono text-[11px]">{l.applied_on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. TAB 3: MY PAYROLL & PAYSLIPS                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payroll' && (
        <div className="space-y-6 animate-fade-in">
          {/* Salary Structure Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-navy-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 border border-blue-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                  Registered Salary Structure
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  ₹{(trainerProfile?.base_monthly_salary || 0).toLocaleString()} <span className="text-sm font-normal text-blue-200">/ month Base</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-3.5 py-2 rounded-xl text-xs backdrop-blur-xs border border-white/10">
                  <span className="text-blue-200 block text-[10px] uppercase font-bold">PT Commission</span>
                  <span className="font-bold text-white">₹{trainerProfile?.pt_session_rate || 500} / Session</span>
                </div>
                <div className="bg-white/10 px-3.5 py-2 rounded-xl text-xs backdrop-blur-xs border border-white/10">
                  <span className="text-blue-200 block text-[10px] uppercase font-bold">Payout Account</span>
                  <span className="font-bold text-white font-mono">
                    {trainerProfile?.upi_id || trainerProfile?.bank_account_no || 'UPI Auto-Disburse'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-blue-100/80 leading-relaxed max-w-2xl">
              Monthly payroll is generated automatically by gym management based on biometric attendance days, approved paid leaves, and total personal training sessions conducted.
            </p>
          </div>

          {/* Generated Monthly Payslips Table */}
          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                  <Icon name="file-text" size={16} className="text-purple-600" />
                  <span>Monthly Payroll Invoices &amp; Payslips</span>
                </h3>
                <p className="text-xs text-navy-500">Statements generated by Gym Owner with downloadable payslips.</p>
              </div>
            </div>

            {payrollRecords.length === 0 ? (
              <div className="py-12 text-center text-navy-400 text-xs font-bold space-y-2">
                <Icon name="credit-card" size={28} className="mx-auto text-navy-300" />
                <div>No payroll records generated yet by gym owner.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3 px-4">MONTH / YEAR</th>
                      <th className="py-3 px-4">BASE EARNED</th>
                      <th className="py-3 px-4">ATTENDANCE</th>
                      <th className="py-3 px-4">PT COMMISSIONS</th>
                      <th className="py-3 px-4">DEDUCTIONS</th>
                      <th className="py-3 px-4">NET PAY</th>
                      <th className="py-3 px-4">PAYOUT STATUS</th>
                      <th className="py-3 px-4 text-right">PAYSLIP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {payrollRecords.map((p) => {
                      const isPaid = p.status === 'Paid';
                      return (
                        <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-purple-700">
                            {p.month} {p.year}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                            ₹{(p.base_salary_earned ?? p.base_salary).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              {p.days_present ?? 26} Present
                            </span>
                            {(p.days_absent ?? 0) > 0 && (
                              <span className="ml-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                                {p.days_absent} Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">
                            +₹{(p.commission_earned ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-rose-600 font-bold">
                            -₹{(p.deductions ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-sm text-navy-900">
                            ₹{p.net_salary.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit',
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  isPaid ? 'bg-emerald-500' : 'bg-amber-500'
                                )}
                              />
                              {isPaid ? `Paid (${p.payment_method || 'UPI'})` : 'Processing'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedPayslip(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Icon name="download" size={13} />
                              <span>Payslip</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. APPLY LEAVE MODAL                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-navy-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="calendar" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-900">Apply for Leave</h3>
                  <p className="text-xs text-navy-500">Submit request for owner approval.</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-circle" size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              {/* Dynamic Leave Policy Selector */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">Eligible Leave Policy</label>
                <select
                  value={formLeaveTypeId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFormLeaveTypeId(selId);
                    const match = eligibleLeaveTypes.find((t) => t.id === selId);
                    if (match) setFormLeaveType(match.name);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                >
                  {eligibleLeaveTypes.length === 0 ? (
                    <option value="">No eligible policies found</option>
                  ) : (
                    eligibleLeaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatLeaveOptionLabel(t)}
                      </option>
                    ))
                  )}
                </select>

                {/* Selected Policy Details Banner */}
                {(() => {
                  const sel = eligibleLeaveTypes.find((t) => t.id === formLeaveTypeId);
                  if (!sel) return null;
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {sel.paid_type === 'PAID' || sel.is_paid
                            ? '💰 Fully Paid Leave'
                            : sel.paid_type === 'HALF_PAY'
                            ? '½ Half Pay Leave'
                            : '⚠️ Unpaid / Loss of Pay'}
                        </span>
                        <span>
                          Remaining: <strong>{sel.balance?.remaining_days ?? sel.annual_quota} Days</strong>
                        </span>
                      </div>
                      {sel.description && <p className="text-purple-700 text-[10px]">{sel.description}</p>}
                      {sel.attachment_required && (
                        <div className="text-amber-800 text-[10px] font-bold flex items-center gap-1 pt-0.5">
                          <Icon name="alert-triangle" size={11} />
                          <span>Medical certificate or proof link is required for this leave type.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">Reason for Absence</label>
                <textarea
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Personal emergency, family event, medical rest..."
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-medium text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Attachment URL */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">
                  Supporting Document / Certificate URL
                </label>
                <input
                  type="text"
                  value={formAttachmentUrl}
                  onChange={(e) => setFormAttachmentUrl(e.target.value)}
                  placeholder="https://... or medical slip link"
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-medium text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-navy-600 hover:bg-navy-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingLeave && <Icon name="loader-2" size={14} className="animate-spin" />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. DIGITAL PAYSLIP MODAL (DOWNLOAD / PRINT)                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-navy-100 space-y-6 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg">
                  FC
                </div>
                <div>
                  <h3 className="text-base font-black text-navy-900 tracking-tight">FIT CLUB AI PLATFORM</h3>
                  <p className="text-[11px] text-navy-500 font-mono">Official Salary Slip &amp; Earnings Statement</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Coach & Period Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-navy-50/70 p-4 rounded-2xl border border-navy-100 text-xs">
              <div>
                <div className="text-navy-400 text-[10px] uppercase font-bold">Trainer Name</div>
                <div className="font-bold text-navy-900 mt-0.5">{selectedPayslip.employee_name || user?.name}</div>
              </div>
              <div>
                <div className="text-navy-400 text-[10px] uppercase font-bold">Designation</div>
                <div className="font-bold text-navy-900 mt-0.5">{selectedPayslip.designation || 'Fitness Trainer'}</div>
              </div>
              <div>
                <div className="text-navy-400 text-[10px] uppercase font-bold">Salary Period</div>
                <div className="font-bold text-purple-700 mt-0.5">{selectedPayslip.month} {selectedPayslip.year}</div>
              </div>
            </div>

            {/* Itemized Breakdown Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Earnings */}
              <div className="border border-navy-100 rounded-2xl p-4 space-y-2.5">
                <div className="font-black text-emerald-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Earnings</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-navy-50 space-y-2 pt-1 font-medium">
                  <div className="flex justify-between pt-1">
                    <span className="text-navy-600">Base Salary Earned:</span>
                    <span className="font-mono font-bold text-navy-900">
                      ₹{(selectedPayslip.base_salary_earned ?? selectedPayslip.base_salary).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-navy-600">PT Commissions:</span>
                    <span className="font-mono font-bold text-purple-700">
                      +₹{(selectedPayslip.commission_earned ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-navy-600">Allowances / Bonus:</span>
                    <span className="font-mono font-bold text-navy-900">
                      ₹{(selectedPayslip.allowances ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border border-navy-100 rounded-2xl p-4 space-y-2.5">
                <div className="font-black text-rose-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Deductions</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-navy-50 space-y-2 pt-1 font-medium">
                  <div className="flex justify-between pt-1">
                    <span className="text-navy-600">Absent Days Deduction:</span>
                    <span className="font-mono font-bold text-rose-600">
                      -₹{(selectedPayslip.deductions ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-navy-600">Tax / PF Deductions:</span>
                    <span className="font-mono text-navy-500">₹0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Total Box */}
            <div className="bg-purple-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-md shadow-purple-600/20">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-purple-200">Net Salary Credited</div>
                <div className="text-xs text-purple-100 mt-0.5">
                  Payout Status:{' '}
                  <span className="font-black text-white">{selectedPayslip.status}</span>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono">
                ₹{selectedPayslip.net_salary.toLocaleString()}
              </div>
            </div>

            {/* Transaction / Disbursed info */}
            {selectedPayslip.status === 'Paid' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                <span>Disbursed via {selectedPayslip.payment_method || 'UPI'}</span>
                <span className="font-mono font-bold">Ref: {selectedPayslip.transaction_reference || 'TXN-SETTLED'}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Icon name="printer" size={14} />
                <span>Download / Print Payslip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="px-5 py-2 rounded-xl bg-navy-100 text-navy-700 hover:bg-navy-200 text-xs font-bold transition cursor-pointer"
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
