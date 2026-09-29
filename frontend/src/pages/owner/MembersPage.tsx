/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { apiClient } from '@/services/apiClient';
import { customerApi, GymSlotBookingItem } from '@/services/customerApi';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';
import { EnrollmentModal } from '@/components/EnrollmentModal';
import { formatDateDDMMYY, getTodayISO, addDaysISO } from '@/utils/date';
import { PaymentTerminalSelector, type PaymentDetailsPayload, type PaymentMethodType } from '@/components/payments/PaymentTerminalSelector';

interface PlanItem {
  id?: string;
  owner_id?: string;
  branch_id?: string;
  name: string;
  category?: string;
  price: number;
  duration_days?: number;
  period?: string;
  features?: string[];
  badge?: string;
  color?: string;
  is_combo?: boolean;
  isCombo?: boolean;
}

const statusConfig: Record<Member['status'], { variant: 'success' | 'warning' | 'danger' | 'brand' | 'ai' | 'neutral'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  inactive: { variant: 'neutral', label: 'Inactive' },
  expiring: { variant: 'warning', label: 'Expiring' },
  trial: { variant: 'ai', label: 'Trial' },
  vip: { variant: 'brand', label: 'VIP' },
};

const riskConfig: Record<Member['risk'], { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  low: { variant: 'success', label: 'Low' },
  medium: { variant: 'warning', label: 'Medium' },
  high: { variant: 'danger', label: 'High' },
};

const filters = ['All', 'Active', 'Inactive', 'Expiring', 'High Risk', 'VIP', 'New', 'Trial'] as const;

export function MembersPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'slots'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [slotBookings, setSlotBookings] = useState<GymSlotBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const [slotDateFilter, setSlotDateFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [togglingVideoId, setTogglingVideoId] = useState<string | null>(null);

  // Renewal Modal state
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const [renewalSelectedProgramId, setRenewalSelectedProgramId] = useState<string>('');
  const [renewalDurationDays, setRenewalDurationDays] = useState<number>(30);
  const [renewalProgramCategory, setRenewalProgramCategory] = useState<string>('all');
  const [renewalPlanSearch, setRenewalPlanSearch] = useState('');
  const [renewalStartDate, setRenewalStartDate] = useState(() => getTodayISO());
  const [renewalExpiryDate, setRenewalExpiryDate] = useState(() => addDaysISO(getTodayISO(), 30));
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [renewalPaymentDetails, setRenewalPaymentDetails] = useState<PaymentDetailsPayload | null>(null);
  const [renewalIncludeGst, setRenewalIncludeGst] = useState(true);
  const [renewing, setRenewing] = useState(false);

  const navigate = useNavigate();

  // Dynamic workout programs structured 100% from database plans
  const workoutPrograms = (() => {
    if (!plans || plans.length === 0) return [];

    const programMap = new Map<string, {
      id: string;
      name: string;
      category: string;
      categoryLabel: string;
      programType: 'combos' | 'training' | 'classes' | 'pt';
      isCombo: boolean;
      badge: string;
      color: string;
      features: string[];
      plans: PlanItem[];
    }>();

    plans.forEach((cp) => {
      const isCombo = cp.is_combo !== undefined
        ? Boolean(cp.is_combo || cp.isCombo)
        : Boolean((cp.category || '').includes('_') || cp.name.includes('+'));
      const isClass = (cp.category || '').includes('dance') || (cp.category || '').includes('yoga') || (cp.category || '').includes('zumba');
      const isPt = (cp.category || '').includes('pt') || (cp.category || '').includes('trainer');
      const programType: 'combos' | 'training' | 'classes' | 'pt' = isCombo ? 'combos' : isClass ? 'classes' : isPt ? 'pt' : 'training';

      const key = cp.id || cp.name.trim();

      if (!programMap.has(key)) {
        const catLabel = (cp.category || 'Membership Program').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        programMap.set(key, {
          id: cp.id || `prog_${cp.name.toLowerCase().replace(/\s+/g, '_')}`,
          name: cp.name,
          category: cp.category || 'general',
          categoryLabel: catLabel,
          programType,
          isCombo,
          badge: cp.badge || (isCombo ? 'Combo' : ''),
          color: cp.color || (isCombo ? 'from-rose-500 to-pink-600' : isPt ? 'from-amber-500 to-yellow-600' : isClass ? 'from-purple-500 to-indigo-600' : 'from-brand-500 to-brand-700'),
          features: cp.features?.length ? cp.features : ['Full Access', 'Gym Floor & Facilities', 'Locker & Assessment'],
          plans: [cp],
        });
      } else {
        programMap.get(key)!.plans.push(cp);
      }
    });

    return Array.from(programMap.values()).map((prog) => ({
      id: prog.id,
      name: prog.name,
      category: prog.category,
      categoryLabel: prog.categoryLabel,
      programType: prog.programType,
      isCombo: prog.isCombo,
      badge: prog.badge,
      color: prog.color,
      features: prog.features,
      getPriceForDuration: (days: number) => {
        const exact = prog.plans.find((p) => (p.duration_days || 30) === days);
        if (exact && typeof exact.price === 'number' && exact.price > 0) {
          const periodLabel = days === 30 ? 'month' : days === 90 ? '3 months' : days === 180 ? '6 months' : days === 365 ? 'year' : `${days} days`;
          return { price: exact.price, periodLabel, durationDays: days };
        }

        const basePlan = prog.plans[0];
        const basePrice = basePlan?.price || 0;
        const baseDays = basePlan?.duration_days || 30;

        let multiplier = 1;
        let periodLabel = 'month';

        if (days === 30) {
          multiplier = 1;
          periodLabel = 'month';
        } else if (days === 90) {
          multiplier = 2.6;
          periodLabel = '3 months';
        } else if (days === 180) {
          multiplier = 4.8;
          periodLabel = '6 months';
        } else if (days === 365) {
          multiplier = 8.8;
          periodLabel = 'year';
        } else {
          multiplier = baseDays > 0 ? (days / baseDays) : 1;
          periodLabel = `${days} days`;
        }

        const calculatedPrice = basePrice > 0 ? Math.round((basePrice * multiplier) / 50) * 50 : 0;
        return { price: calculatedPrice, periodLabel, durationDays: days };
      },
    }));
  })();

  const currentRenewalProgram = workoutPrograms.find((p) => p.id === renewalSelectedProgramId) || workoutPrograms[0];
  const currentRenewalPricing = currentRenewalProgram
    ? currentRenewalProgram.getPriceForDuration(renewalDurationDays)
    : { price: 0, periodLabel: 'month', durationDays: renewalDurationDays };

  const handleToggleVideoAccess = async (memberId: string, currentVal: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !currentVal;
    
    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, enable_workout_videos: newVal } : m))
    );
    setTogglingVideoId(memberId);

    try {
      await api.customers.toggleWorkoutVideoAccess(memberId, newVal);
    } catch (_err) {
      // Revert on error
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, enable_workout_videos: currentVal } : m))
      );
      alert('Failed to update workout video permission. Please try again.');
    } finally {
      setTogglingVideoId(null);
    }
  };

  const handleBatchToggleVideos = async (enable: boolean) => {
    if (selectedMemberIds.length === 0) return;
    setMembers((prev) =>
      prev.map((m) => (selectedMemberIds.includes(m.id) ? { ...m, enable_workout_videos: enable } : m))
    );
    try {
      await Promise.all(
        selectedMemberIds.map((id) => api.customers.toggleWorkoutVideoAccess(id, enable))
      );
    } catch (_err) {
      fetchMembers();
    }
  };

  const fetchSlotBookings = () => {
    setSlotsLoading(true);
    customerApi.getAllSlotBookings()
      .then((data) => setSlotBookings(data || []))
      .catch(() => setSlotBookings([]))
      .finally(() => setSlotsLoading(false));
  };

  const fetchMembers = () => {
    setLoading(true);
    api.customers
      .list()
      .then((data) => {
        setMembers(data || []);
      })
      .catch(() => {
        setMembers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMembers();
    fetchSlotBookings();
  }, []);

  const fetchDynamicPlans = () => {
    apiClient.get<PlanItem[]>('/memberships/plans')
      .then((res) => {
        if (Array.isArray(res)) {
          setPlans(res);
        }
      })
      .catch(() => {
        setPlans([]);
      });
  };

  useEffect(() => {
    fetchDynamicPlans();
    api.settings.billing()
      .then((res) => {
        const data = res?.billing || res;
        if (data) {
          setBillingSettings(data);
          const isEngineActive = data.enable_gst_engine !== false && Number(data.total_gst_rate) > 0;
          setRenewalIncludeGst(isEngineActive);
        }
      })
      .catch(() => {});
  }, []);

  // Auto calculate renewal expiry date when duration or start date changes
  useEffect(() => {
    setRenewalExpiryDate(addDaysISO(renewalStartDate, renewalDurationDays));
  }, [renewalDurationDays, renewalStartDate]);

  const handleDurationTierChange = (days: number) => {
    setRenewalDurationDays(days);
    setRenewalExpiryDate(addDaysISO(renewalStartDate, days));
  };

  const filtered = members.filter((m) => {
    const name = m.name || (m as any).full_name || '';
    const email = m.email || '';
    const phone = m.phone || '';
    const matchesSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.includes(search) ||
      email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' ||
      (filter === 'Active' && m.status === 'active') ||
      (filter === 'Inactive' && m.status === 'inactive') ||
      (filter === 'Expiring' && m.status === 'expiring') ||
      (filter === 'High Risk' && m.risk === 'high') ||
      (filter === 'VIP' && m.status === 'vip') ||
      (filter === 'Trial' && m.status === 'trial') ||
      (filter === 'New' && (() => {
        if (!m.joinDate) return false;
        const join = new Date(m.joinDate).getTime();
        if (isNaN(join)) return false;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        return join >= thirtyDaysAgo;
      })());
    return matchesSearch && matchesFilter;
  });

  const todayIso = getTodayISO();
  const filteredSlots = slotBookings.filter((s) => {
    const custName = (s.customer_name || '').toLowerCase();
    const custPhone = (s.customer_phone || '').toLowerCase();
    const custEmail = (s.customer_email || '').toLowerCase();
    const branchName = (s.branch_name || '').toLowerCase();
    const workouts = (s.workout_types || []).join(' ').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = !search ||
      custName.includes(q) ||
      custPhone.includes(q) ||
      custEmail.includes(q) ||
      branchName.includes(q) ||
      workouts.includes(q);

    let matchesDate = true;
    if (slotDateFilter === 'today') {
      matchesDate = s.booking_date === todayIso;
    } else if (slotDateFilter === 'upcoming') {
      matchesDate = s.booking_date >= todayIso;
    }

    return matchesSearch && matchesDate;
  });

  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMemberIds(filtered.map((m) => m.id));
    } else {
      setSelectedMemberIds([]);
    }
  };

  const handleToggleSelect = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedMemberIds((prev) => [...prev, id]);
    } else {
      setSelectedMemberIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleOpenRenewalModal = () => {
    if (selectedMemberIds.length === 0) return;
    setRenewalPlanSearch('');
    setRenewalStartDate(getTodayISO());
    setRenewalProgramCategory('all');

    // Smart-match current member's program & duration
    const firstSelected = members.find((m) => selectedMemberIds.includes(m.id));
    if (firstSelected?.membership) {
      const memName = firstSelected.membership.toLowerCase();
      // Match program
      const matchedProg = workoutPrograms.find((prog) =>
        memName.includes(prog.name.toLowerCase()) ||
        prog.name.toLowerCase().includes(memName) ||
        (prog.category && memName.includes(prog.category.toLowerCase()))
      );
      if (matchedProg) {
        setRenewalSelectedProgramId(matchedProg.id);
      } else {
        setRenewalSelectedProgramId(workoutPrograms[0]?.id || '');
      }

      // Match duration
      if (memName.includes('365') || memName.includes('year') || memName.includes('annual')) {
        setRenewalDurationDays(365);
      } else if (memName.includes('180') || memName.includes('6-month') || memName.includes('6 month')) {
        setRenewalDurationDays(180);
      } else if (memName.includes('90') || memName.includes('quarter') || memName.includes('quater')) {
        setRenewalDurationDays(90);
      } else {
        setRenewalDurationDays(30);
      }
    } else {
      setRenewalSelectedProgramId(workoutPrograms[0]?.id || '');
      setRenewalDurationDays(30);
    }

    apiClient.get<PlanItem[]>('/memberships/plans')
      .then((res) => {
        if (Array.isArray(res)) {
          setPlans(res);
        }
      })
      .catch(() => {});

    setRenewalOpen(true);
  };

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberIds.length === 0) return;

    if (!currentRenewalProgram) {
      alert('Please select a valid membership program.');
      return;
    }

    const durationLabel = renewalDurationDays === 30 ? 'Monthly (30 Days)' : renewalDurationDays === 90 ? 'Quarterly (90 Days)' : renewalDurationDays === 180 ? '6-Month (180 Days)' : renewalDurationDays === 365 ? 'Yearly (365 Days)' : `${renewalDurationDays} Days`;
    const finalPlanName = `${currentRenewalProgram.name} (${durationLabel})`;

    const isGstActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
    const effectiveGstRate = billingSettings && isGstActive ? Number(billingSettings.total_gst_rate || 0) : (isGstActive ? 18 : 0);

    const subtotal = currentRenewalPricing.price;
    const gst = renewalIncludeGst && isGstActive && effectiveGstRate > 0 ? Math.round(subtotal * (effectiveGstRate / 100)) : 0;
    const totalAmount = subtotal + gst;

    const paidAmount = renewalPaymentDetails?.paidAmount ?? totalAmount;
    const dueAmount = renewalPaymentDetails?.dueAmount ?? Math.max(0, totalAmount - paidAmount);
    const paymentMethod = renewalPaymentDetails?.paymentMethod ?? renewalPaymentMethod ?? 'Cash';
    const transactionId = renewalPaymentDetails?.transactionId || undefined;

    setRenewing(true);

    try {
      for (const mId of selectedMemberIds) {
        await apiClient.post(`/memberships/renew/${mId}`, {
          plan_name: finalPlanName,
          duration_days: renewalDurationDays,
          price: totalAmount,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          start_date: renewalStartDate,
          expiry_date: renewalExpiryDate,
          payment_method: paymentMethod,
          transaction_id: transactionId,
        });
      }
      setRenewalOpen(false);
      setSelectedMemberIds([]);
      fetchMembers();
    } catch (_err) {
      alert('Failed to process renewal. Please try again.');
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <PageHeader
        title="Members & Customers"
        breadcrumb={['Owner', activeTab === 'members' ? 'Members' : 'Gym Slot Bookings']}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'members' && (
              <>
                {selectedMemberIds.length > 0 && (
                  <div className="flex items-center gap-2 mr-1">
                    <button
                      onClick={() => handleBatchToggleVideos(true)}
                      className="btn-secondary flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                      title="Enable workout videos for selected members"
                    >
                      <Icon name="play" size={13} className="text-emerald-600 fill-emerald-600" /> Unlock Videos ({selectedMemberIds.length})
                    </button>
                    <button
                      onClick={() => handleBatchToggleVideos(false)}
                      className="btn-secondary flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                      title="Lock workout videos for selected members"
                    >
                      <Icon name="lock" size={13} className="text-amber-600" /> Lock Videos ({selectedMemberIds.length})
                    </button>
                  </div>
                )}
                <button
                  onClick={handleOpenRenewalModal}
                  disabled={selectedMemberIds.length === 0}
                  className={cn(
                    'btn-secondary flex items-center gap-2 text-sm font-semibold transition-all',
                    selectedMemberIds.length > 0
                      ? 'border-brand-500 text-brand-600 bg-brand-50 ring-2 ring-brand-500/20 shadow-glow'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon name="refresh-cw" size={16} /> Renewal {selectedMemberIds.length > 0 && `(${selectedMemberIds.length})`}
                </button>
                <button onClick={() => setEnrollOpen(true)} className="btn-primary flex items-center gap-2">
                  <Icon name="plus" size={16} /> Add Member
                </button>
              </>
            )}
            {activeTab === 'slots' && (
              <button onClick={fetchSlotBookings} className="btn-secondary flex items-center gap-2 text-sm">
                <Icon name="refresh-cw" size={16} className={cn(slotsLoading && 'animate-spin')} /> Refresh Bookings
              </button>
            )}
          </div>
        }
      />

      {/* Top View Toggle Tabs */}
      <div className="flex items-center gap-3 p-1.5 bg-navy-100/60 rounded-2xl w-fit border border-navy-200/50">
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'members'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-navy-600 hover:text-navy-900'
          )}
        >
          <Icon name="users" size={16} />
          <span>Members Directory</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-navy-100 text-navy-600 font-bold">
            {members.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('slots');
            fetchSlotBookings();
          }}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'slots'
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow'
              : 'text-navy-600 hover:text-navy-900'
          )}
        >
          <Icon name="calendar" size={16} />
          <span>Gym Slot Bookings</span>
          <span className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-bold',
            activeTab === 'slots' ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'
          )}>
            {slotBookings.length}
          </span>
        </button>
      </div>

      {activeTab === 'members' ? (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search by name, phone or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-semibold transition-all',
                    filter === f ? 'bg-brand-600 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <SkeletonTable rows={8} cols={10} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="!" title="No members found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-navy-100">
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedMemberIds.length === filtered.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
                    {['Member', 'Membership', 'Status', 'Attendance', 'Workout Videos', 'Last Visit', 'Expiry', 'Revenue', 'Risk', ''].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const name = m.name || (m as any).full_name || 'Member';
                    const initials = name ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'M';
                    const statusConf = statusConfig[m.status] || { variant: 'success', label: m.status || 'Active' };
                    const riskConf = riskConfig[m.risk] || { variant: 'success', label: m.risk || 'Low' };
                    const isSelected = selectedMemberIds.includes(m.id);
                    const isVideoEnabled = m.enable_workout_videos !== false;
                    const isToggling = togglingVideoId === m.id;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => navigate(`/owner/customers/${m.id}`)}
                        className={cn(
                          'border-b border-navy-50 hover:bg-navy-50 cursor-pointer transition-colors',
                          isSelected && 'bg-brand-50/50'
                        )}
                      >
                        <td className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelect(m.id, e)}
                            className="w-4 h-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-navy-900 truncate">{name}</div>
                              <div className="text-xs text-navy-500 font-medium truncate">{m.phone || m.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-navy-600 font-medium">{m.membership}</td>
                        <td className="px-3 py-3"><Badge variant={statusConf.variant}>{statusConf.label}</Badge></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${m.attendance || 0}%` }} />
                            </div>
                            <span className="text-xs text-navy-500 font-medium">{m.attendance || 0}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleVideoAccess(m.id, isVideoEnabled, e)}
                              disabled={isToggling}
                              title={isVideoEnabled ? 'Workout videos are ENABLED for this customer. Click to turn OFF.' : 'Workout videos are LOCKED for this customer. Click to turn ON.'}
                              className={cn(
                                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                                isVideoEnabled ? 'bg-emerald-500 hover:bg-emerald-600 shadow-sm' : 'bg-navy-200 dark:bg-navy-700 hover:bg-navy-300',
                                isToggling && 'opacity-60 cursor-wait'
                              )}
                            >
                              <span
                                className={cn(
                                  'pointer-events-none inline-flex h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out items-center justify-center',
                                  isVideoEnabled ? 'translate-x-5' : 'translate-x-0'
                                )}
                              >
                                {isToggling ? (
                                  <Icon name="refresh-cw" size={10} className="text-navy-500 animate-spin" />
                                ) : isVideoEnabled ? (
                                  <Icon name="play" size={9} className="text-emerald-600 fill-emerald-600 ml-0.5" />
                                ) : (
                                  <Icon name="lock" size={9} className="text-navy-400" />
                                )}
                              </span>
                            </button>
                            <span className={cn(
                              'text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors whitespace-nowrap',
                              isVideoEnabled 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50' 
                                : 'bg-navy-100 text-navy-500 border border-navy-200 dark:bg-navy-800 dark:text-navy-400 dark:border-navy-700'
                            )}>
                              {isVideoEnabled ? 'Videos ON' : 'Locked'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-navy-500">{m.lastVisit}</td>
                        <td className="px-3 py-3 text-sm font-medium text-navy-700">{formatDateDDMMYY(m.expiry)}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-navy-900">{m.revenue}</td>
                        <td className="px-3 py-3"><Badge variant={riskConf.variant}>{riskConf.label}</Badge></td>
                        <td className="px-3 py-3"><Icon name="chevron-right" size={16} className="text-navy-300" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Gym Slot Bookings Tab for Owner */
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-2 border-b border-navy-100">
            <div className="relative flex-1 w-full sm:w-auto">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search member, phone, branch, or workout muscle (chest, back...)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {(['all', 'today', 'upcoming'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSlotDateFilter(mode)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all',
                    slotDateFilter === mode
                      ? 'bg-brand-600 text-white shadow-glow'
                      : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                  )}
                >
                  {mode === 'all' ? 'All Bookings' : mode === 'today' ? "Today's Slots" : 'Upcoming Slots'}
                </button>
              ))}
            </div>
          </div>

          {slotsLoading ? (
            <SkeletonTable rows={6} cols={6} />
          ) : filteredSlots.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No Slot Bookings Found"
              description="Customer gym slot reservations will appear dynamically here as members book."
            />
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-navy-100">
                    {['Customer', 'Date & Time Slot', 'Workout Focus', 'Branch / Facility', 'Status', 'Notes'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-navy-500 uppercase tracking-wider px-3 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {filteredSlots.map((slot) => {
                    const name = slot.customer_name || 'Member';
                    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                    return (
                      <tr key={slot.id} className="hover:bg-navy-50/70 transition-colors">
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-navy-900">{name}</div>
                              <div className="text-xs text-navy-500 font-medium">{slot.customer_phone || slot.customer_email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                            <Icon name="calendar" size={14} className="text-brand-600" />
                            {formatDateDDMMYY(slot.booking_date)}
                          </div>
                          <div className="text-xs font-semibold text-brand-600 flex items-center gap-1.5 mt-0.5">
                            <Icon name="clock" size={14} />
                            {slot.start_time} - {slot.end_time}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {(slot.workout_types || []).map((wt, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200/60"
                              >
                                {wt}
                              </span>
                            ))}
                            {(!slot.workout_types || slot.workout_types.length === 0) && (
                              <span className="text-xs text-navy-400">General Workout</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="text-xs font-bold text-navy-800 flex items-center gap-1">
                            <Icon name="map-pin" size={13} className="text-navy-400" />
                            {slot.branch_name || 'Main Branch'}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <Badge variant={slot.status === 'CONFIRMED' ? 'success' : slot.status === 'CANCELLED' ? 'danger' : 'brand'}>
                            {slot.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3.5 text-xs text-navy-500 font-medium">
                          {slot.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <EnrollmentModal open={enrollOpen} onClose={() => setEnrollOpen(false)} />

      {/* Renewal Modal */}
      {renewalOpen && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl animate-scale-in border border-navy-100 my-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 sticky -top-5 sm:-top-6 bg-white/95 backdrop-blur-md z-10 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Icon name="refresh-cw" size={18} className="text-brand-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-900">Renew Membership</h3>
                  <p className="text-xs text-navy-400">Selected {selectedMembers.length} member(s) for renewal</p>
                </div>
              </div>
              <button onClick={() => setRenewalOpen(false)} className="text-navy-400 hover:text-navy-600 p-1.5 rounded-xl hover:bg-navy-50 transition">
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Selected Members Summary */}
            <div className="card p-3 bg-navy-50 max-h-32 overflow-y-auto space-y-1.5 border border-navy-200">
              <div className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-1">Target Members</div>
              {selectedMembers.map((sm) => (
                <div key={sm.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-navy-100">
                  <div className="font-semibold text-navy-900">{sm.name} ({sm.phone || sm.email})</div>
                  <Badge variant="brand">{sm.membership || 'Standard'}</Badge>
                </div>
              ))}
            </div>

            <form onSubmit={handleExecuteRenewal} className="space-y-4">
              {/* Program Header & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-navy-900 block">Select Program & Training Plan</label>
                    <p className="text-[11px] text-navy-400">Choose workout program and duration tier. Price and billing auto-accommodate.</p>
                  </div>
                  <div className="relative min-w-[180px]">
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={renewalPlanSearch}
                      onChange={(e) => setRenewalPlanSearch(e.target.value)}
                      className="input-field text-xs py-1.5 pl-8 pr-3 w-full bg-navy-50"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                      <Icon name="search" size={12} />
                    </div>
                  </div>
                </div>

                {/* Program Categories Filter Pills */}
                {(() => {
                  const filterOptions = [
                    { id: 'all', label: 'All Programs', icon: 'layers' },
                    { id: 'combos', label: 'Combos & Hybrid', icon: 'flame' },
                    { id: 'training', label: 'Training Programs', icon: 'activity' },
                    { id: 'classes', label: 'Group Classes', icon: 'zap' },
                    { id: 'pt', label: '1-on-1 PT', icon: 'award' },
                  ];

                  return (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {filterOptions.map((opt) => {
                        const isActive = renewalProgramCategory === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRenewalProgramCategory(opt.id)}
                            className={cn(
                              'px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 border cursor-pointer shrink-0',
                              isActive
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm font-bold'
                                : 'bg-white text-navy-600 border-navy-200 hover:border-navy-300 hover:bg-navy-50'
                            )}
                          >
                            <Icon name={opt.icon} size={12} className={isActive ? 'text-white' : 'text-navy-500'} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Duration Tiers Selector */}
                <div className="space-y-1.5 pt-1 border-t border-navy-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold text-navy-500 uppercase tracking-wider flex items-center gap-1">
                      <Icon name="clock" size={11} className="text-brand-500" /> Duration Tiers
                    </div>
                    <div className="text-[10px] text-brand-600 font-bold bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
                      {renewalDurationDays === 30 ? 'Monthly (30D)' : renewalDurationDays === 90 ? 'Quarterly (90D)' : renewalDurationDays === 180 ? '6-Month (180D)' : 'Yearly (365D)'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { days: 30, label: 'Monthly (30D)' },
                      { days: 90, label: 'Quarterly (90D)' },
                      { days: 180, label: '6-Month (180D)' },
                      { days: 365, label: 'Yearly (365D)' },
                    ].map((tier) => {
                      const isActive = renewalDurationDays === tier.days;
                      return (
                        <button
                          key={tier.days}
                          type="button"
                          onClick={() => handleDurationTierChange(tier.days)}
                          className={cn(
                            'px-2 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center',
                            isActive
                              ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                              : 'bg-white border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50/60'
                          )}
                        >
                          <span>{tier.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Programs List */}
                {(() => {
                  const filteredPrograms = workoutPrograms.filter((p) => {
                    if (renewalProgramCategory !== 'all') {
                      if (renewalProgramCategory === 'combos' && !p.isCombo) return false;
                      if (renewalProgramCategory === 'training' && (p.isCombo || p.programType !== 'training')) return false;
                      if (renewalProgramCategory === 'classes' && (p.isCombo || p.programType !== 'classes')) return false;
                      if (renewalProgramCategory === 'pt' && (p.isCombo || p.programType !== 'pt')) return false;
                    }
                    if (renewalPlanSearch.trim()) {
                      const q = renewalPlanSearch.toLowerCase();
                      const matchesName = p.name.toLowerCase().includes(q);
                      const matchesCategory = p.categoryLabel.toLowerCase().includes(q);
                      const matchesFeatures = p.features.some((f) => f.toLowerCase().includes(q));
                      if (!matchesName && !matchesCategory && !matchesFeatures) return false;
                    }
                    return true;
                  });

                  if (filteredPrograms.length === 0) {
                    return (
                      <div className="card p-4 text-center bg-navy-50/60 border border-navy-200">
                        <p className="text-xs font-bold text-navy-700">No matching programs found</p>
                        <button
                          type="button"
                          onClick={() => {
                            setRenewalProgramCategory('all');
                            setRenewalPlanSearch('');
                          }}
                          className="mt-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                        >
                          Reset filters
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-1.5 max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar">
                      {filteredPrograms.map((prog) => {
                        const isSelected = renewalSelectedProgramId === prog.id;
                        const pricing = prog.getPriceForDuration(renewalDurationDays);
                        const cardColor = prog.color || 'from-brand-500 to-brand-700';

                        return (
                          <div
                            key={prog.id}
                            onClick={() => setRenewalSelectedProgramId(prog.id)}
                            className={cn(
                              'p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2.5',
                              isSelected
                                ? 'bg-white border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                                : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm text-white',
                                  cardColor
                                )}
                              >
                                <Icon name={prog.isCombo ? 'flame' : 'credit-card'} size={15} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-navy-900 line-clamp-1">
                                    {prog.name}
                                  </span>
                                  {prog.isCombo && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                                      Combo
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-brand-600 font-semibold truncate">
                                  {prog.categoryLabel}
                                </div>
                              </div>
                            </div>

                            {/* Price for current duration */}
                            <div className="text-right shrink-0">
                              <div className="text-sm font-extrabold text-navy-900">
                                ₹{pricing.price.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-navy-400">
                                {renewalDurationDays} Days
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Renewal Date Range */}
              <div className="card p-3 bg-brand-50/40 border border-brand-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-800">Renewal Validity</span>
                  <Badge variant="success">
                    Expiry: {formatDateDDMMYY(renewalExpiryDate)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-navy-600 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={renewalStartDate}
                      onChange={(e) => {
                        setRenewalStartDate(e.target.value);
                        setRenewalExpiryDate(addDaysISO(e.target.value, renewalDurationDays));
                      }}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-navy-600 block mb-1">Expiry Date (DD-MM-YY)</label>
                    <input
                      type="date"
                      value={renewalExpiryDate}
                      onChange={(e) => setRenewalExpiryDate(e.target.value)}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & GST Summary */}
              {currentRenewalProgram && (() => {
                const isGstActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
                const effectiveGstRate = billingSettings && isGstActive ? Number(billingSettings.total_gst_rate || 0) : (isGstActive ? 18 : 0);
                const subtotal = currentRenewalPricing.price;
                const gst = renewalIncludeGst && isGstActive && effectiveGstRate > 0 ? Math.round(subtotal * (effectiveGstRate / 100)) : 0;
                const totalAmount = subtotal + gst;

                return (
                  <>
                    <div className="card p-3 bg-navy-50/80 rounded-2xl border border-navy-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-navy-600">
                        <span>Base Subtotal ({currentRenewalProgram.name})</span>
                        <span className="font-semibold text-navy-900">₹{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-navy-600">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={renewalIncludeGst && isGstActive}
                            disabled={!isGstActive}
                            onChange={(e) => setRenewalIncludeGst(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-navy-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                          />
                          <span>{isGstActive ? `Include GST (${effectiveGstRate}%)` : 'GST Engine Disabled (0% Nil)'}</span>
                        </label>
                        <span className="font-semibold text-navy-900">
                          ₹{gst.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-navy-200 pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-navy-900">Total Renewal Amount</span>
                        <span className="text-base font-bold text-brand-600">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic POS Payment Terminal Selector */}
                    <PaymentTerminalSelector
                      totalAmount={totalAmount}
                      customerName={selectedMembers[0]?.name || ''}
                      customerPhone={selectedMembers[0]?.phone || ''}
                      selectedMethod={renewalPaymentMethod}
                      onMethodChange={(method, payload) => {
                        setRenewalPaymentMethod(method);
                        setRenewalPaymentDetails(payload);
                      }}
                    />
                  </>
                );
              })()}

              <div className="flex gap-2 pt-3 pb-1 border-t border-navy-100 sticky -bottom-5 sm:-bottom-6 bg-white/95 backdrop-blur-md z-10">
                <button type="button" onClick={() => setRenewalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewing || plans.length === 0}
                  className="btn-primary flex-1 bg-success-600 hover:bg-success-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Icon name="check-circle" size={16} />
                  {renewing ? 'Processing...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
