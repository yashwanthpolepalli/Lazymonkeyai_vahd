import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import {
  hrmsApi,
  formatLeaveOptionLabel,
  type LeaveItem,
  type EmployeeItem,
  type LeaveTypeItem,
  type EmployeeLeaveBalanceItem,
  type EligibleLeaveType,
} from '@/services/hrmsApi';
import { cn } from '@/utils/cn';

interface HrmsLeaveTabProps {
  onSuccessToast?: (msg: string) => void;
}

type SubTabType = 'applications' | 'policies' | 'balances';

export function HrmsLeaveTab({ onSuccessToast }: HrmsLeaveTabProps) {
  const [subTab, setSubTab] = useState<SubTabType>('applications');
  const [loading, setLoading] = useState(true);

  // Core Data
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalanceItem[]>([]);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReason, setFormReason] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [applyError, setApplyError] = useState('');
  const [eligibleTypesForForm, setEligibleTypesForForm] = useState<EligibleLeaveType[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);

  // Policy Tab Filters & View Mode State
  const [policyViewMode, setPolicyViewMode] = useState<'grid' | 'row'>('grid');
  const [policySearchQuery, setPolicySearchQuery] = useState('');
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState('ALL');

  // Policy Modal State (Add / Edit)
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeaveTypeItem | null>(null);
  const [policySubmitting, setPolicySubmitting] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policyForm, setPolicyForm] = useState<{
    name: string;
    code: string;
    category: string;
    description: string;
    paid_type: 'PAID' | 'UNPAID' | 'HALF_PAY';
    gender_eligibility: string[];
    annual_quota: number;
    min_service_days: number;
    max_consecutive_days: number;
    carry_forward_allowed: boolean;
    max_carry_forward_days: number;
    encashment_allowed: boolean;
    max_encashment_days: number;
    attachment_required: boolean;
    is_active: boolean;
  }>({
    name: '',
    code: '',
    category: 'General Leave',
    description: '',
    paid_type: 'PAID',
    gender_eligibility: ['MALE', 'FEMALE', 'OTHER'],
    annual_quota: 12,
    min_service_days: 0,
    max_consecutive_days: 15,
    carry_forward_allowed: false,
    max_carry_forward_days: 0,
    encashment_allowed: false,
    max_encashment_days: 0,
    attachment_required: false,
    is_active: true,
  });

  // Balance Adjustment Modal State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<EmployeeLeaveBalanceItem | null>(null);
  const [adjustAllocated, setAdjustAllocated] = useState(0);
  const [adjustUsed, setAdjustUsed] = useState(0);

  // Rejection Modal
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 1. DATA FETCHING
  // ─────────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [leavesRes, empRes, typesRes, balRes] = await Promise.all([
        hrmsApi.getLeaves(),
        hrmsApi.getEmployees(),
        hrmsApi.getLeaveTypes(),
        hrmsApi.getLeaveBalances(),
      ]);
      setLeaves(leavesRes || []);
      setEmployees(empRes || []);
      setLeaveTypes(typesRes || []);
      setBalances(balRes || []);

      if (empRes && empRes.length > 0 && !formEmployeeId) {
        setFormEmployeeId(empRes[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch HRMS leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch eligible leave types when employee changes in Apply Modal
  useEffect(() => {
    if (!formEmployeeId) return;
    const fetchEligible = async () => {
      setLoadingEligible(true);
      try {
        const res = await hrmsApi.getEligibleLeaveTypes(formEmployeeId);
        const types = res?.eligible_leave_types || [];
        setEligibleTypesForForm(types);
        if (types.length > 0) {
          setFormLeaveTypeId(types[0].id);
        } else {
          setFormLeaveTypeId('');
        }
      } catch (err) {
        console.error('Failed to fetch eligible leave types:', err);
      } finally {
        setLoadingEligible(false);
      }
    };
    fetchEligible();
  }, [formEmployeeId]);

  // ─────────────────────────────────────────────────────────────
  // 2. LEAVE ACTIONS
  // ─────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (leaveId: string, status: 'Approved' | 'Rejected', reasonText?: string) => {
    setActionLoadingId(leaveId);
    try {
      await hrmsApi.updateLeaveStatus(leaveId, {
        status,
        reviewer: 'Gym Owner / Admin',
        rejection_reason: reasonText,
      });
      onSuccessToast?.(`${status === 'Approved' ? 'Approved' : 'Rejected'} leave application.`);
      setRejectingLeaveId(null);
      setRejectionReason('');
      // Refresh
      const [updatedLeaves, updatedBals] = await Promise.all([
        hrmsApi.getLeaves(),
        hrmsApi.getLeaveBalances(),
      ]);
      setLeaves(updatedLeaves || []);
      setBalances(updatedBals || []);
    } catch (err) {
      console.error('Failed to update leave status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError('');

    if (!formEmployeeId) {
      setApplyError('Please select a trainer or staff member.');
      return;
    }
    if (!formLeaveTypeId) {
      setApplyError('Please select an eligible leave type.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setApplyError('Please select valid start and end dates.');
      return;
    }
    if (new Date(formEndDate) < new Date(formStartDate)) {
      setApplyError('End date cannot be earlier than start date.');
      return;
    }

    setSubmittingApply(true);
    try {
      await hrmsApi.applyLeave({
        employee_id: formEmployeeId,
        leave_type_id: formLeaveTypeId,
        start_date: formStartDate,
        end_date: formEndDate,
        reason: formReason.trim(),
        attachment_url: formAttachmentUrl.trim() || undefined,
      });
      onSuccessToast?.('Leave application recorded successfully!');
      setShowApplyModal(false);
      setFormReason('');
      setFormAttachmentUrl('');
      // Refresh
      const [updatedLeaves, updatedBals] = await Promise.all([
        hrmsApi.getLeaves(),
        hrmsApi.getLeaveBalances(),
      ]);
      setLeaves(updatedLeaves || []);
      setBalances(updatedBals || []);
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || err?.message || 'Failed to submit leave application.');
    } finally {
      setSubmittingApply(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. POLICY ACTIONS (CUSTOMIZATION BY OWNER)
  // ─────────────────────────────────────────────────────────────
  const openNewPolicyModal = () => {
    setEditingPolicy(null);
    setPolicyForm({
      name: '',
      code: '',
      category: 'General Leave',
      description: '',
      paid_type: 'PAID',
      gender_eligibility: ['MALE', 'FEMALE', 'OTHER'],
      annual_quota: 12,
      min_service_days: 0,
      max_consecutive_days: 15,
      carry_forward_allowed: false,
      max_carry_forward_days: 0,
      encashment_allowed: false,
      max_encashment_days: 0,
      attachment_required: false,
      is_active: true,
    });
    setPolicyError('');
    setShowPolicyModal(true);
  };

  const openEditPolicyModal = (policy: LeaveTypeItem) => {
    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      code: policy.code,
      category: policy.category || 'General Leave',
      description: policy.description || '',
      paid_type: policy.paid_type || (policy.is_paid ? 'PAID' : 'UNPAID'),
      gender_eligibility: policy.gender_eligibility || ['MALE', 'FEMALE', 'OTHER'],
      annual_quota: policy.annual_quota || 0,
      min_service_days: policy.min_service_days || 0,
      max_consecutive_days: policy.max_consecutive_days || 15,
      carry_forward_allowed: Boolean(policy.carry_forward_allowed),
      max_carry_forward_days: policy.max_carry_forward_days || 0,
      encashment_allowed: Boolean(policy.encashment_allowed),
      max_encashment_days: policy.max_encashment_days || 0,
      attachment_required: Boolean(policy.attachment_required),
      is_active: policy.is_active !== false,
    });
    setPolicyError('');
    setShowPolicyModal(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyError('');

    if (!policyForm.name.trim()) {
      setPolicyError('Policy Name is required.');
      return;
    }
    if (!policyForm.code.trim()) {
      setPolicyError('Policy Code is required (e.g., CL, SL, ML).');
      return;
    }
    if (policyForm.gender_eligibility.length === 0) {
      setPolicyError('Select at least one eligible gender.');
      return;
    }

    setPolicySubmitting(true);
    try {
      const payload = {
        ...policyForm,
        code: policyForm.code.trim().toUpperCase(),
        is_paid: policyForm.paid_type === 'PAID',
      };

      if (editingPolicy) {
        await hrmsApi.updateLeaveType(editingPolicy.id, payload);
        onSuccessToast?.(`Leave policy "${policyForm.name}" updated successfully!`);
      } else {
        await hrmsApi.createLeaveType(payload);
        onSuccessToast?.(`Leave policy "${policyForm.name}" created successfully!`);
      }

      setShowPolicyModal(false);
      const updatedTypes = await hrmsApi.getLeaveTypes();
      setLeaveTypes(updatedTypes || []);
    } catch (err: any) {
      setPolicyError(err?.response?.data?.detail || err?.message || 'Failed to save leave policy.');
    } finally {
      setPolicySubmitting(false);
    }
  };

  const handleDeletePolicy = async (policy: LeaveTypeItem) => {
    if (!confirm(`Are you sure you want to deactivate/delete "${policy.name}"?`)) return;
    try {
      await hrmsApi.deleteLeaveType(policy.id);
      onSuccessToast?.(`Policy "${policy.name}" deactivated.`);
      const updatedTypes = await hrmsApi.getLeaveTypes();
      setLeaveTypes(updatedTypes || []);
    } catch (err) {
      console.error('Failed to delete policy:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. BALANCE ADJUSTMENT
  // ─────────────────────────────────────────────────────────────
  const openAdjustBalanceModal = (item: EmployeeLeaveBalanceItem) => {
    setAdjustTarget(item);
    setAdjustAllocated(item.allocated_days);
    setAdjustUsed(item.used_days);
    setShowBalanceModal(true);
  };

  const handleSaveBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    setAdjustSubmitting(true);
    try {
      await hrmsApi.adjustLeaveBalance({
        employee_id: adjustTarget.employee_id,
        leave_type_id: adjustTarget.leave_type_id,
        year: adjustTarget.year,
        allocated_days: Number(adjustAllocated),
        used_days: Number(adjustUsed),
      });
      onSuccessToast?.(`Adjusted ${adjustTarget.leave_type_name} balance for ${adjustTarget.employee_name}`);
      setShowBalanceModal(false);
      const updatedBals = await hrmsApi.getLeaveBalances();
      setBalances(updatedBals || []);
    } catch (err) {
      console.error('Failed to adjust balance:', err);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. METRICS & FILTERING
  // ─────────────────────────────────────────────────────────────
  const totalCount = leaves.length;
  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const onLeaveTodayCount = leaves.filter((l) => {
    if (l.status !== 'Approved') return false;
    const s = l.start_date ? l.start_date.split('/').reverse().join('-') : '';
    const e = l.end_date ? l.end_date.split('/').reverse().join('-') : '';
    return s && e && todayStr >= s && todayStr <= e;
  }).length;

  const filteredLeaves = leaves.filter((l) => {
    const matchesStatus = statusFilter === 'ALL' || l.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      l.employee_name?.toLowerCase().includes(q) ||
      l.employee_code?.toLowerCase().includes(q) ||
      l.leave_type?.toLowerCase().includes(q) ||
      l.department?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const filteredBalances = balances.filter((b) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      b.employee_name.toLowerCase().includes(q) ||
      b.employee_code.toLowerCase().includes(q) ||
      b.department.toLowerCase().includes(q) ||
      b.leave_type_name.toLowerCase().includes(q)
    );
  });

  const selectedEmployeeObj = employees.find((e) => e.id === formEmployeeId);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & NAVIGATION                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-navy-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="calendar" size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
                <span>Leave &amp; Absence Hub</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase tracking-wider">
                  Configurable LMS
                </span>
              </h2>
              <p className="text-xs text-navy-500 font-medium">
                Enterprise leave policies, dynamic gender-based eligibility (Maternity/Paternity/Casual), and live balance ledgers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowApplyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Icon name="plus" size={15} />
            <span>Apply Leave / Request</span>
          </button>

          <button
            onClick={openNewPolicyModal}
            className="px-3.5 py-2.5 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-800 border border-navy-200 font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <Icon name="settings" size={15} className="text-purple-600" />
            <span>Add Leave Policy</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. KPI SUMMARY CARDS                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Total Applications</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="file-text" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">{totalCount}</div>
            <div className="text-[11px] text-purple-700 font-bold mt-1">Across all staff &amp; coaches</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Pending Approvals</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Icon name="clock" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingCount}</div>
            <div className="text-[11px] text-amber-700 font-bold mt-1">Awaiting owner action</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Configured Policies</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="sliders" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{leaveTypes.length}</div>
            <div className="text-[11px] text-emerald-700 font-bold mt-1">
              {leaveTypes.filter((t) => t.is_active).length} Active policies in database
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">On Leave Today</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="user-x" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">{onLeaveTodayCount}</div>
            <div className="text-[11px] text-blue-600 font-bold mt-1">Excused attendance today</div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SUB-TAB SWITCHER & SEARCH                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-navy-100 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setSubTab('applications')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              subTab === 'applications'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-navy-50 text-navy-600 hover:text-navy-900 hover:bg-navy-100/80'
            )}
          >
            <Icon name="inbox" size={14} />
            <span>Applications &amp; Review</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                subTab === 'applications' ? 'bg-white/20 text-white' : 'bg-navy-200/60 text-navy-700'
              )}
            >
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setSubTab('policies')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              subTab === 'policies'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-navy-50 text-navy-600 hover:text-navy-900 hover:bg-navy-100/80'
            )}
          >
            <Icon name="sliders" size={14} />
            <span>Leave Policies (Owner Config)</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                subTab === 'policies' ? 'bg-white/20 text-white' : 'bg-navy-200/60 text-navy-700'
              )}
            >
              {leaveTypes.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('balances')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
              subTab === 'balances'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-navy-50 text-navy-600 hover:text-navy-900 hover:bg-navy-100/80'
            )}
          >
            <Icon name="pie-chart" size={14} />
            <span>Staff Balances &amp; Ledgers</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search coach, policy, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SUBTAB CONTENT                                             */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* ────────────────────────────────────────── */}
      {/* TAB 1: APPLICATIONS & APPROVALS            */}
      {/* ────────────────────────────────────────── */}
      {subTab === 'applications' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex items-center gap-2">
            {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                    : 'bg-white text-navy-600 border border-navy-200 hover:bg-navy-50'
                )}
              >
                {status} ({status === 'ALL' ? totalCount : leaves.filter((l) => l.status === status).length})
              </button>
            ))}
          </div>

          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Icon name="calendar-x" size={32} className="mx-auto text-navy-300" />
                <div className="text-sm font-bold text-navy-700">No leave applications found</div>
                <div className="text-xs text-navy-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or status filter.'
                    : 'No leave applications have been submitted yet. Click "Apply Leave / Request" to record one.'}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/70 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3.5 px-4">TRAINER / STAFF</th>
                      <th className="py-3.5 px-4">LEAVE TYPE &amp; PAY</th>
                      <th className="py-3.5 px-4">PERIOD</th>
                      <th className="py-3.5 px-4">DAYS</th>
                      <th className="py-3.5 px-4">REASON &amp; ATTACHMENT</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4">REVIEW DETAILS</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {filteredLeaves.map((l) => {
                      const initials =
                        l.employee_name
                          ?.split(' ')
                          .map((p) => p[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || 'TR';

                      const isPending = l.status === 'Pending';
                      const isApproved = l.status === 'Approved';
                      const isActing = actionLoadingId === l.id;
                      const gender = (l.gender || 'MALE').toUpperCase();

                      return (
                        <tr key={l.id} className="hover:bg-purple-50/30 transition-colors">
                          {/* Name & Code & Gender */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0',
                                  gender === 'FEMALE'
                                    ? 'bg-pink-100 text-pink-700'
                                    : 'bg-purple-100 text-purple-700'
                                )}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-navy-900 flex items-center gap-1.5">
                                  <span>{l.employee_name}</span>
                                  <span
                                    className={cn(
                                      'text-[9px] font-bold px-1.5 py-0.2 rounded',
                                      gender === 'FEMALE'
                                        ? 'bg-pink-50 text-pink-700 border border-pink-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    )}
                                  >
                                    {gender === 'FEMALE' ? '♀ Female' : '♂ Male'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-navy-400 font-mono flex items-center gap-1.5">
                                  <span>{l.employee_code}</span>
                                  <span>•</span>
                                  <span>{l.department || 'Fitness'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Leave Type & Pay Classification */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-lg text-[10px] font-bold border',
                                  l.leave_type.toLowerCase().includes('maternity')
                                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                                    : l.leave_type.toLowerCase().includes('paternity')
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : l.leave_type.toLowerCase().includes('sick')
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : l.leave_type.toLowerCase().includes('unpaid')
                                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                )}
                              >
                                {l.leave_type}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] font-bold px-1.5 py-0.2 rounded-full',
                                  l.paid_type === 'PAID' || l.is_paid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : l.paid_type === 'HALF_PAY'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                )}
                              >
                                {l.paid_type === 'PAID' || l.is_paid
                                  ? '💰 Fully Paid'
                                  : l.paid_type === 'HALF_PAY'
                                  ? '½ Half Pay'
                                  : '⚠️ Unpaid / LWP'}
                              </span>
                            </div>
                          </td>

                          {/* Period */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-navy-900 font-semibold">
                              {l.start_date} <span className="text-navy-400">→</span> {l.end_date}
                            </div>
                            <div className="text-[10px] text-navy-400">Applied {l.applied_on}</div>
                          </td>

                          {/* Days */}
                          <td className="py-3.5 px-4 font-black text-navy-900">
                            {l.days} {l.days === 1 ? 'Day' : 'Days'}
                          </td>

                          {/* Reason & Attachment */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="text-navy-700 truncate font-medium" title={l.reason}>
                              {l.reason || '—'}
                            </div>
                            {l.attachment_url && (
                              <a
                                href={l.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-purple-600 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Icon name="paperclip" size={11} />
                                <span>View Document</span>
                              </a>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit',
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  isApproved ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-rose-500'
                                )}
                              />
                              {l.status}
                            </span>
                          </td>

                          {/* Review Details */}
                          <td className="py-3.5 px-4 text-xs text-navy-500 font-medium">
                            <div>{l.approved_by || 'Pending Review'}</div>
                            {l.rejection_reason && (
                              <div className="text-[10px] text-rose-600 font-medium italic mt-0.5">
                                Note: {l.rejection_reason}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={isActing}
                                  onClick={() => handleUpdateStatus(l.id, 'Approved')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Icon name="check" size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  disabled={isActing}
                                  onClick={() => {
                                    setRejectingLeaveId(l.id);
                                    setRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Icon name="x" size={13} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : isApproved ? (
                              <span className="text-emerald-700 text-xs font-bold flex items-center justify-end gap-1">
                                <Icon name="check-circle" size={14} />
                                <span>Approved</span>
                              </span>
                            ) : (
                              <span className="text-rose-600 text-xs font-bold flex items-center justify-end gap-1">
                                <Icon name="x-circle" size={14} />
                                <span>Rejected</span>
                              </span>
                            )}
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

      {/* ────────────────────────────────────────── */}
      {/* TAB 2: LEAVE POLICIES (OWNER CUSTOMIZATION) */}
      {/* ────────────────────────────────────────── */}
      {subTab === 'policies' && (() => {
        const categories = [
          'ALL',
          ...Array.from(new Set(leaveTypes.map((p) => p.category).filter(Boolean) as string[])),
        ];

        const filteredPolicies = leaveTypes.filter((policy) => {
          const q = policySearchQuery.trim().toLowerCase();
          const matchSearch =
            !q ||
            policy.name.toLowerCase().includes(q) ||
            policy.code.toLowerCase().includes(q) ||
            (policy.category && policy.category.toLowerCase().includes(q)) ||
            (policy.description && policy.description.toLowerCase().includes(q));

          const matchCat =
            policyCategoryFilter === 'ALL' ||
            (policy.category && policy.category.toLowerCase() === policyCategoryFilter.toLowerCase());

          return matchSearch && matchCat;
        });

        return (
          <div className="space-y-4">
            {/* Hero Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Icon name="shield" size={20} />
                </div>
                <div>
                  <div className="text-sm font-black text-navy-900">Customizable Leave Policies</div>
                  <div className="text-xs text-navy-600 font-medium">
                    Configure pay classifications (Paid/Unpaid/Half Pay), gender rules, annual quotas, and carry forward in real-time.
                  </div>
                </div>
              </div>

              <button
                onClick={openNewPolicyModal}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start sm:self-auto"
              >
                <Icon name="plus" size={15} />
                <span>Create New Policy</span>
              </button>
            </div>

            {/* Filter & View Switcher Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-navy-100 shadow-xs">
              <div className="flex flex-1 flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                  <input
                    type="text"
                    value={policySearchQuery}
                    onChange={(e) => setPolicySearchQuery(e.target.value)}
                    placeholder="Search policies, codes..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  {policySearchQuery && (
                    <button
                      onClick={() => setPolicySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={policyCategoryFilter}
                  onChange={(e) => setPolicyCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800 focus:bg-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories
                    .filter((c) => c !== 'ALL')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>

                <span className="text-[11px] font-bold text-navy-500 bg-navy-50 px-2.5 py-1 rounded-lg border border-navy-100">
                  {filteredPolicies.length} {filteredPolicies.length === 1 ? 'Policy' : 'Policies'}
                </span>
              </div>

              {/* View Mode Toggle (Grid vs Row View) */}
              <div className="flex items-center gap-1 bg-navy-100/70 p-1 rounded-xl border border-navy-200 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setPolicyViewMode('grid')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    policyViewMode === 'grid'
                      ? 'bg-white text-purple-700 shadow-xs border border-purple-100'
                      : 'text-navy-600 hover:text-navy-900 hover:bg-white/40'
                  )}
                  title="Grid View (Cards)"
                >
                  <Icon name="layout-grid" size={14} />
                  <span>Grid View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPolicyViewMode('row')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    policyViewMode === 'row'
                      ? 'bg-white text-purple-700 shadow-xs border border-purple-100'
                      : 'text-navy-600 hover:text-navy-900 hover:bg-white/40'
                  )}
                  title="Row View (Table)"
                >
                  <Icon name="list" size={14} />
                  <span>Row View</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredPolicies.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-navy-100 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                  <Icon name="sliders" size={24} />
                </div>
                <h4 className="text-sm font-bold text-navy-900">No matching leave policies found</h4>
                <p className="text-xs text-navy-500 max-w-sm mx-auto">
                  Try adjusting your search query or category filter, or create a brand new custom leave policy.
                </p>
                <button
                  onClick={openNewPolicyModal}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Icon name="plus" size={14} />
                  <span>Create Leave Policy</span>
                </button>
              </div>
            ) : policyViewMode === 'grid' ? (
              /* ────────────────────────────────────────── */
              /* 1. GRID VIEW (CARDS)                       */
              /* ────────────────────────────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {filteredPolicies.map((policy) => {
                  const genders = policy.gender_eligibility || [];
                  const isAllGenders =
                    genders.includes('ALL') ||
                    (genders.includes('MALE') && genders.includes('FEMALE') && genders.includes('OTHER'));
                  const isOnlyFemale = genders.length === 1 && genders[0].toUpperCase() === 'FEMALE';
                  const isOnlyMale = genders.length === 1 && genders[0].toUpperCase() === 'MALE';

                  return (
                    <div
                      key={policy.id}
                      className={cn(
                        'bg-white rounded-2xl p-5 border transition-all hover:shadow-md space-y-4 relative flex flex-col justify-between',
                        policy.is_active ? 'border-navy-100' : 'border-navy-200/60 opacity-70 bg-navy-50/30'
                      )}
                    >
                      {/* Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-mono font-black text-xs flex items-center justify-center">
                              {policy.code}
                            </div>
                            <div>
                              <div className="font-black text-sm text-navy-900">{policy.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-navy-400 font-mono font-bold">Code: {policy.code}</span>
                                {policy.category && (
                                  <>
                                    <span className="text-navy-300 text-[10px]">•</span>
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                                      {policy.category}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Paid Type Badge */}
                          <span
                            className={cn(
                              'text-[10px] font-black px-2 py-0.5 rounded-full border',
                              policy.paid_type === 'PAID' || policy.is_paid
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : policy.paid_type === 'HALF_PAY'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {policy.paid_type === 'PAID' || policy.is_paid
                              ? 'PAID'
                              : policy.paid_type === 'HALF_PAY'
                              ? 'HALF PAY'
                              : 'UNPAID'}
                          </span>
                        </div>

                        {/* Description */}
                        {policy.description && (
                          <p className="text-xs text-navy-600 mt-2.5 line-clamp-2 leading-relaxed font-medium">
                            {policy.description}
                          </p>
                        )}
                      </div>

                      {/* Rules Grid */}
                      <div className="space-y-2.5 pt-2 border-t border-navy-50 text-xs">
                        {/* Gender Eligibility */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Gender Eligibility:</span>
                          <div className="flex items-center gap-1">
                            {isAllGenders ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                👥 All Genders
                              </span>
                            ) : isOnlyFemale ? (
                              <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-bold text-[10px] border border-pink-200">
                                ♀ Female Only
                              </span>
                            ) : isOnlyMale ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                ♂ Male Only
                              </span>
                            ) : (
                              genders.map((g) => (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.2 rounded bg-navy-100 text-navy-700 font-bold text-[9px]"
                                >
                                  {g}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Annual Quota */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Annual Quota:</span>
                          <span className="font-black text-navy-900">
                            {policy.annual_quota > 0 ? `${policy.annual_quota} Days / Year` : 'Unlimited / Case basis'}
                          </span>
                        </div>

                        {/* Min Service Requirement */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Min Service Days:</span>
                          <span className="font-semibold text-navy-800">
                            {policy.min_service_days > 0 ? `${policy.min_service_days} Days Required` : 'None (Day 1)'}
                          </span>
                        </div>

                        {/* Carry Forward */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Carry Forward:</span>
                          <span className="font-semibold text-navy-800">
                            {policy.carry_forward_allowed
                              ? `Allowed (Up to ${policy.max_carry_forward_days}d)`
                              : 'No (Lapses yearly)'}
                          </span>
                        </div>

                        {/* Encashment */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Encashment:</span>
                          <span className="font-semibold text-navy-800">
                            {policy.encashment_allowed
                              ? `Allowed (Up to ${policy.max_encashment_days || 0}d)`
                              : 'No Encashment'}
                          </span>
                        </div>

                        {/* Attachment Requirement */}
                        <div className="flex items-center justify-between">
                          <span className="text-navy-500 font-medium">Certificate / Proof:</span>
                          <span
                            className={cn(
                              'font-bold text-[10px] px-1.5 py-0.2 rounded',
                              policy.attachment_required
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'text-navy-400'
                            )}
                          >
                            {policy.attachment_required ? 'Required 📎' : 'Optional'}
                          </span>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-navy-100">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              policy.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            )}
                          />
                          <span className="text-[11px] font-bold text-navy-600">
                            {policy.is_active ? 'Active Policy' : 'Inactive'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditPolicyModal(policy)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-navy-50 hover:bg-navy-100 text-navy-700 border border-navy-200 transition cursor-pointer flex items-center gap-1"
                          >
                            <Icon name="edit" size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(policy)}
                            className="p-1 rounded-lg text-navy-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete or Deactivate"
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ────────────────────────────────────────── */
              /* 2. ROW VIEW (HIGH-DENSITY DATA TABLE)      */
              /* ────────────────────────────────────────── */
              <div className="bg-white border border-navy-100 rounded-2xl shadow-xs overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-navy-100 bg-navy-50/70 text-[11px] font-bold text-navy-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Policy / Leave</th>
                        <th className="py-3 px-4">Pay Type</th>
                        <th className="py-3 px-4">Allocation &amp; Quota</th>
                        <th className="py-3 px-4">Gender Eligibility</th>
                        <th className="py-3 px-4">Carry Fwd &amp; Encash</th>
                        <th className="py-3 px-4">Certificate</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50 text-xs">
                      {filteredPolicies.map((policy) => {
                        const genders = policy.gender_eligibility || [];
                        const isAllGenders =
                          genders.includes('ALL') ||
                          (genders.includes('MALE') && genders.includes('FEMALE') && genders.includes('OTHER'));
                        const isOnlyFemale = genders.length === 1 && genders[0].toUpperCase() === 'FEMALE';
                        const isOnlyMale = genders.length === 1 && genders[0].toUpperCase() === 'MALE';

                        return (
                          <tr
                            key={policy.id}
                            className={cn(
                              'hover:bg-purple-50/30 transition-colors',
                              !policy.is_active && 'opacity-60 bg-navy-50/30'
                            )}
                          >
                            {/* Policy & Code */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                                  {policy.code}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-black text-navy-900 flex items-center gap-1.5">
                                    <span>{policy.name}</span>
                                    {policy.category && (
                                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100">
                                        {policy.category}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-navy-500 truncate max-w-xs" title={policy.description}>
                                    {policy.description || `Code: ${policy.code}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Paid Type */}
                            <td className="py-3.5 px-4">
                              <span
                                className={cn(
                                  'text-[10px] font-black px-2.5 py-1 rounded-full border inline-flex items-center gap-1',
                                  policy.paid_type === 'PAID' || policy.is_paid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : policy.paid_type === 'HALF_PAY'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {policy.paid_type === 'PAID' || policy.is_paid
                                  ? '💰 Fully Paid'
                                  : policy.paid_type === 'HALF_PAY'
                                  ? '½ Half Pay'
                                  : '⚠️ Unpaid'}
                              </span>
                            </td>

                            {/* Allocation & Min Service */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-navy-900">
                                {policy.annual_quota > 0 ? `${policy.annual_quota} Days / Year` : 'Unlimited'}
                              </div>
                              <div className="text-[10px] text-navy-400 font-medium">
                                {policy.min_service_days > 0 ? `Min ${policy.min_service_days}d service` : 'Available Day 1'}
                              </div>
                            </td>

                            {/* Gender Eligibility */}
                            <td className="py-3.5 px-4">
                              {isAllGenders ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                  👥 All Genders
                                </span>
                              ) : isOnlyFemale ? (
                                <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-bold text-[10px] border border-pink-200">
                                  ♀ Female Only
                                </span>
                              ) : isOnlyMale ? (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                  ♂ Male Only
                                </span>
                              ) : (
                                <div className="flex gap-1 flex-wrap">
                                  {genders.map((g) => (
                                    <span
                                      key={g}
                                      className="px-1.5 py-0.2 rounded bg-navy-100 text-navy-700 font-bold text-[9px]"
                                    >
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Carry Forward & Encashment */}
                            <td className="py-3.5 px-4 text-[11px]">
                              <div className="font-bold text-navy-800">
                                CF: {policy.carry_forward_allowed ? `Up to ${policy.max_carry_forward_days}d` : 'No'}
                              </div>
                              <div className="text-[10px] text-navy-500 font-medium">
                                Encash: {policy.encashment_allowed ? `Up to ${policy.max_encashment_days || 0}d` : 'No'}
                              </div>
                            </td>

                            {/* Certificate */}
                            <td className="py-3.5 px-4">
                              <span
                                className={cn(
                                  'font-bold text-[10px] px-2 py-0.5 rounded-md border',
                                  policy.attachment_required
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-navy-50 text-navy-500 border-navy-100'
                                )}
                              >
                                {policy.attachment_required ? 'Required 📎' : 'Optional'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    policy.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                  )}
                                />
                                <span className="text-[11px] font-bold text-navy-700">
                                  {policy.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditPolicyModal(policy)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-navy-50 hover:bg-purple-50 text-navy-700 hover:text-purple-700 border border-navy-200 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Icon name="edit" size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePolicy(policy)}
                                  className="p-1.5 rounded-lg text-navy-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete or Deactivate"
                                >
                                  <Icon name="trash-2" size={14} />
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
            )}
          </div>
        );
      })()}

      {/* ────────────────────────────────────────── */}
      {/* TAB 3: STAFF BALANCES & LEDGERS            */}
      {/* ────────────────────────────────────────── */}
      {subTab === 'balances' && (
        <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-base font-black text-navy-900">Staff Leave Balances &amp; Ledgers (Year {new Date().getFullYear()})</h3>
              <p className="text-xs text-navy-500">
                Track allocated, utilized, pending, and remaining leave quotas across each policy for all staff members.
              </p>
            </div>
          </div>

          {filteredBalances.length === 0 ? (
            <div className="py-12 text-center text-navy-400 text-xs">
              No leave balances found for the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-50/70 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                  <tr>
                    <th className="py-3 px-4">EMPLOYEE / TRAINER</th>
                    <th className="py-3 px-4">GENDER</th>
                    <th className="py-3 px-4">LEAVE POLICY</th>
                    <th className="py-3 px-4">ALLOCATED</th>
                    <th className="py-3 px-4">USED</th>
                    <th className="py-3 px-4">PENDING</th>
                    <th className="py-3 px-4">REMAINING</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                  {filteredBalances.map((b) => (
                    <tr key={`${b.employee_id}_${b.leave_type_id}`} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{b.employee_name}</div>
                        <div className="text-[10px] text-navy-400 font-mono">
                          {b.employee_code} • {b.designation || 'Coach'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded',
                            b.gender?.toUpperCase() === 'FEMALE'
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          )}
                        >
                          {b.gender?.toUpperCase() === 'FEMALE' ? '♀ Female' : '♂ Male'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{b.leave_type_name}</div>
                        <div className="text-[10px] text-navy-400 font-mono">{b.leave_type_code}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-navy-700">{b.allocated_days}d</td>
                      <td className="py-3 px-4 font-bold text-rose-600">{b.used_days}d</td>
                      <td className="py-3 px-4 font-bold text-amber-600">{b.pending_days}d</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md font-black text-xs',
                            b.remaining_days > 3
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.remaining_days > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          )}
                        >
                          {b.remaining_days}d Available
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openAdjustBalanceModal(b)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: APPLY LEAVE (DYNAMIC ELIGIBILITY ENGINE)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-navy-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="calendar" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-900">Record Leave Application</h3>
                  <p className="text-xs text-navy-500">Apply leave on behalf of a coach or staff member.</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {applyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-circle" size={15} />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">
                  Select Trainer / Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name || ''} ({emp.designation || 'Staff'} • {emp.code})
                    </option>
                  ))}
                </select>

                {/* Selected employee info badge */}
                {selectedEmployeeObj && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-navy-500">
                    <span>Department: <strong>{selectedEmployeeObj.department}</strong></span>
                    <span>•</span>
                    <span>Joined: <strong>{selectedEmployeeObj.joined_date || 'N/A'}</strong></span>
                  </div>
                )}
              </div>

              {/* Leave Type (Dynamic based on Employee Gender & Rules) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-navy-700">
                    Eligible Leave Policy <span className="text-rose-500">*</span>
                  </label>
                  {loadingEligible && (
                    <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                      <Icon name="loader-2" size={11} className="animate-spin" />
                      <span>Checking rules...</span>
                    </span>
                  )}
                </div>

                <select
                  value={formLeaveTypeId}
                  onChange={(e) => setFormLeaveTypeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                >
                  {eligibleTypesForForm.length === 0 ? (
                    <option value="">No eligible leave policies found</option>
                  ) : (
                    eligibleTypesForForm.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatLeaveOptionLabel(t)}
                      </option>
                    ))
                  )}
                </select>

                {/* Info on selected leave type */}
                {(() => {
                  const selectedType = eligibleTypesForForm.find((t) => t.id === formLeaveTypeId);
                  if (!selectedType) return null;
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {selectedType.paid_type === 'PAID' || selectedType.is_paid
                            ? '💰 Fully Paid Leave'
                            : selectedType.paid_type === 'HALF_PAY'
                            ? '½ Half Pay Leave'
                            : '⚠️ Unpaid / Loss of Pay'}
                        </span>
                        <span>
                          Remaining Balance: <strong>{selectedType.balance?.remaining_days ?? selectedType.annual_quota} Days</strong>
                        </span>
                      </div>
                      {selectedType.description && (
                        <p className="text-purple-700 text-[10px]">{selectedType.description}</p>
                      )}
                      {selectedType.attachment_required && (
                        <div className="text-amber-800 text-[10px] font-bold flex items-center gap-1 pt-0.5">
                          <Icon name="alert-triangle" size={11} />
                          <span>Medical certificate / document proof is mandatory for this leave.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    End Date <span className="text-rose-500">*</span>
                  </label>
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
                <label className="block text-xs font-bold text-navy-700 mb-1.5">Reason / Description</label>
                <textarea
                  rows={2}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Scheduled surgery, parental duties, family vacation..."
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-medium text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Document URL */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">Supporting Document / Certificate URL</label>
                <input
                  type="text"
                  value={formAttachmentUrl}
                  onChange={(e) => setFormAttachmentUrl(e.target.value)}
                  placeholder="https://... or uploaded certificate link"
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
                  disabled={submittingApply}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingApply && <Icon name="loader-2" size={14} className="animate-spin" />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: CREATE / EDIT LEAVE POLICY (GYM OWNER)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-navy-100 space-y-5 animate-scale-up my-8">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="sliders" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-navy-900">
                    {editingPolicy ? `Edit Policy: ${editingPolicy.name}` : 'Configure New Leave Policy'}
                  </h3>
                  <p className="text-xs text-navy-500">
                    Customize gender eligibility, pay rules, annual quotas, and conditions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="w-8 h-8 rounded-xl bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {policyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-circle" size={15} />
                <span>{policyError}</span>
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4">
              {/* Name, Code & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Policy / Leave Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                    placeholder="e.g. Wedding Leave, Maternity Leave, Casual Leave"
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={policyForm.code}
                    onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. WL, ML, CL"
                    maxLength={6}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 uppercase font-mono focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Leave Category */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">
                  Leave Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={
                      ['General Leave', 'Medical Leave', 'Statutory / Parental Leave', 'Special Leave', 'Compensatory', 'Unpaid Leave'].includes(policyForm.category)
                        ? policyForm.category
                        : 'Custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'Custom') {
                        setPolicyForm({ ...policyForm, category: e.target.value });
                      } else {
                        setPolicyForm({ ...policyForm, category: '' });
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="General Leave">🌴 General Leave (CL / EL / Annual)</option>
                    <option value="Medical Leave">🏥 Medical Leave (Sick / Recovery)</option>
                    <option value="Statutory / Parental Leave">👶 Statutory / Parental Leave (Maternity / Paternity)</option>
                    <option value="Special Leave">🎉 Special Leave (Wedding / Bereavement / Study)</option>
                    <option value="Compensatory">⏱️ Compensatory (Comp-Off / Overtime)</option>
                    <option value="Unpaid Leave">⚠️ Unpaid Leave (Loss of Pay / LWP)</option>
                    <option value="Custom">✏️ Custom Category...</option>
                  </select>

                  {!['General Leave', 'Medical Leave', 'Statutory / Parental Leave', 'Special Leave', 'Compensatory', 'Unpaid Leave'].includes(policyForm.category) && (
                    <input
                      type="text"
                      value={policyForm.category}
                      onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                      placeholder="Type custom category name..."
                      className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">Description &amp; Guidelines</label>
                <textarea
                  rows={2}
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  placeholder="Explain who is eligible and any special terms..."
                  className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-medium text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Paid Classification */}
              <div>
                <label className="block text-xs font-bold text-navy-700 mb-1.5">
                  Paid Classification <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'PAID', label: '💰 Fully Paid', desc: 'No salary deduction' },
                    { id: 'HALF_PAY', label: '½ Half Pay', desc: '50% pay deduction' },
                    { id: 'UNPAID', label: '⚠️ Unpaid / LWP', desc: 'Loss of Pay' },
                  ].map((pt) => (
                    <button
                      type="button"
                      key={pt.id}
                      onClick={() => setPolicyForm({ ...policyForm, paid_type: pt.id as any })}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition cursor-pointer',
                        policyForm.paid_type === pt.id
                          ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                          : 'border-navy-200 bg-navy-50/50 hover:bg-navy-50'
                      )}
                    >
                      <div className="font-black text-xs text-navy-900">{pt.label}</div>
                      <div className="text-[10px] text-navy-500 mt-0.5">{pt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Eligibility (Core Requirement!) */}
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-purple-950">
                    Gender Eligibility (Dynamic Filter) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-purple-700 font-bold">Who can apply for this leave?</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MALE', label: '♂ Male', sub: 'Eligible for Men' },
                    { id: 'FEMALE', label: '♀ Female', sub: 'Eligible for Women' },
                    { id: 'OTHER', label: '⚧ Other', sub: 'All other genders' },
                  ].map((g) => {
                    const checked = policyForm.gender_eligibility.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition',
                          checked
                            ? 'bg-white border-purple-400 shadow-xs'
                            : 'bg-white/40 border-purple-200/50 opacity-60'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newG = e.target.checked
                              ? [...policyForm.gender_eligibility, g.id]
                              : policyForm.gender_eligibility.filter((item) => item !== g.id);
                            setPolicyForm({ ...policyForm, gender_eligibility: newG });
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-navy-900">{g.label}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Quotas & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Annual Quota (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.annual_quota}
                    onChange={(e) => setPolicyForm({ ...policyForm, annual_quota: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <span className="text-[10px] text-navy-400">0 for unlimited</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Min Service (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.min_service_days}
                    onChange={(e) => setPolicyForm({ ...policyForm, min_service_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <span className="text-[10px] text-navy-400">e.g. 80 for Maternity</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1.5">
                    Max Consecutive Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={policyForm.max_consecutive_days}
                    onChange={(e) => setPolicyForm({ ...policyForm, max_consecutive_days: parseInt(e.target.value) || 15 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <span className="text-[10px] text-navy-400">Single stretch limit</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-navy-100">
                {/* Carry forward */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-navy-800">Carry Forward to Next Year</div>
                    <div className="text-[10px] text-navy-400">Unused balance rolls over on Dec 31</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.carry_forward_allowed}
                    onChange={(e) => setPolicyForm({ ...policyForm, carry_forward_allowed: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {policyForm.carry_forward_allowed && (
                  <div className="pl-4">
                    <label className="block text-[11px] font-bold text-navy-600 mb-1">
                      Max Carry Forward Limit (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={policyForm.max_carry_forward_days}
                      onChange={(e) => setPolicyForm({ ...policyForm, max_carry_forward_days: parseInt(e.target.value) || 0 })}
                      className="w-32 px-2.5 py-1.5 rounded-lg bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                    />
                  </div>
                )}

                {/* Encashment */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-navy-800">Encashment Allowed</div>
                    <div className="text-[10px] text-navy-400">Can staff encash unused leave balance for salary payout?</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.encashment_allowed}
                    onChange={(e) => setPolicyForm({ ...policyForm, encashment_allowed: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {policyForm.encashment_allowed && (
                  <div className="pl-4">
                    <label className="block text-[11px] font-bold text-navy-600 mb-1">
                      Max Encashable Days (Per Year)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={policyForm.max_encashment_days}
                      onChange={(e) => setPolicyForm({ ...policyForm, max_encashment_days: parseInt(e.target.value) || 0 })}
                      className="w-32 px-2.5 py-1.5 rounded-lg bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                    />
                  </div>
                )}

                {/* Attachment mandatory */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-navy-800">Mandatory Certificate / Proof Upload</div>
                    <div className="text-[10px] text-navy-400">Require medical notes or official certificates</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.attachment_required}
                    onChange={(e) => setPolicyForm({ ...policyForm, attachment_required: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {/* Active */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-navy-800">Policy Active Status</div>
                    <div className="text-[10px] text-navy-400">Staff can see and apply for this leave when active</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={policyForm.is_active}
                    onChange={(e) => setPolicyForm({ ...policyForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-navy-600 hover:bg-navy-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={policySubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {policySubmitting && <Icon name="loader-2" size={14} className="animate-spin" />}
                  <span>{editingPolicy ? 'Save Changes' : 'Create Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: ADJUST LEAVE BALANCE                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showBalanceModal && adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-navy-100 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="edit" size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-navy-900">Adjust Leave Balance</h3>
                  <p className="text-xs text-navy-500">{adjustTarget.employee_name} • {adjustTarget.leave_type_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBalanceModal(false)}
                className="w-7 h-7 rounded-lg bg-navy-50 text-navy-500 hover:text-navy-900 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveBalanceAdjustment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1">Allocated Days</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustAllocated}
                    onChange={(e) => setAdjustAllocated(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-700 mb-1">Used Days</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustUsed}
                    onChange={(e) => setAdjustUsed(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 text-purple-950 text-xs font-medium flex items-center justify-between">
                <span>Computed Balance:</span>
                <span className="font-black text-sm">{Math.max(0, adjustAllocated - adjustUsed)} Days Remaining</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-navy-600 hover:bg-navy-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Saving...' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: REJECT LEAVE WITH REASON                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {rejectingLeaveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-navy-100 space-y-4 animate-scale-up">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Icon name="x-circle" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-navy-900">Reject Leave Application</h3>
                <p className="text-[11px] text-navy-500">Provide feedback or reason for staff member.</p>
              </div>
            </div>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Critical training schedules conflict, please discuss with gym manager..."
              className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-medium text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-100">
              <button
                type="button"
                onClick={() => setRejectingLeaveId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-navy-600 hover:bg-navy-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(rejectingLeaveId, 'Rejected', rejectionReason.trim())}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
