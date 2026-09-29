import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

interface CustomerNutrition {
  id: string;
  name: string;
  memberId: string;
  phone: string;
  avatar: string;
  planName: string;
  goal: string;
  mealsDone: number;
  totalMeals: number;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  carbsConsumed: number;
  carbsTarget: number;
  fatConsumed: number;
  fatTarget: number;
  fiberConsumed: number;
  fiberTarget: number;
  waterConsumed: number;
  waterTarget: number;
  compliance: number;
  status: 'on_track' | 'needs_attention' | 'off_track';
  lastMealLogged: string;
  lastMealTime: string;
  trainerName: string;
  streakDays: number;
  missedMealsLast7Days: number;
}

export function NutritionPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('All Plans');
  const [selectedGoalFilter, setSelectedGoalFilter] = useState('All Goals');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All Status');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerNutrition | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'Overview' | 'Meals' | 'Progress' | 'Analysis'>('Overview');

  useEffect(() => {
    let isMounted = true;
    api.customers.list()
      .then((data) => {
        if (isMounted) setMembers(data || []);
      })
      .catch(() => {
        if (isMounted) setMembers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const nutritionCustomers: CustomerNutrition[] = members.map((m, i) => {
    const name = m.name || (m as any).full_name || '';
    const calTarget = Number((m as any).target_calories) || 0;
    const calConsumed = Number((m as any).consumed_calories) || 0;
    const proTarget = Number((m as any).target_protein) || 0;
    const proConsumed = Number((m as any).consumed_protein) || 0;
    const carbsTarget = Number((m as any).target_carbs) || 0;
    const carbsConsumed = Number((m as any).consumed_carbs) || 0;
    const fatTarget = Number((m as any).target_fat) || 0;
    const fatConsumed = Number((m as any).consumed_fat) || 0;
    const waterTarget = Number((m as any).target_water) || 0.0;
    const waterConsumed = Number((m as any).consumed_water) || 0.0;
    const compliance = calTarget > 0 ? Math.min(100, Math.round((calConsumed / calTarget) * 100)) : 0;
    const status: 'on_track' | 'needs_attention' | 'off_track' =
      compliance >= 80 ? 'on_track' : compliance >= 60 ? 'needs_attention' : 'off_track';

    return {
      id: m.id || `cust-${i}`,
      name,
      memberId: m.id ? m.id.toUpperCase() : `MEM${1000 + i + 1}`,
      phone: m.phone || '',
      avatar: m.avatar || '',
      planName: m.membership || 'No Plan',
      goal: m.goal || '',
      mealsDone: Math.min(6, Math.max(0, Math.round((compliance / 100) * 6))),
      totalMeals: 6,
      caloriesConsumed: calConsumed,
      caloriesTarget: calTarget,
      proteinConsumed: proConsumed,
      proteinTarget: proTarget,
      carbsConsumed: carbsConsumed,
      carbsTarget: carbsTarget,
      fatConsumed: fatConsumed,
      fatTarget: fatTarget,
      fiberConsumed: 0,
      fiberTarget: 0,
      waterConsumed: waterConsumed,
      waterTarget: waterTarget,
      compliance,
      status,
      lastMealLogged: (m as any).last_meal_logged || '',
      lastMealTime: (m as any).last_meal_time || '',
      trainerName: m.trainer || 'Unassigned',
      streakDays: Math.max(0, Math.round(compliance / 15)),
      missedMealsLast7Days: Math.max(0, 7 - Math.round(compliance / 15)),
    };
  });

  const totalMembersCount = members.length;
  const onTrackCount = nutritionCustomers.filter((c) => c.status === 'on_track').length;
  const needsAttentionCount = nutritionCustomers.filter((c) => c.status === 'needs_attention').length;
  const offTrackCount = nutritionCustomers.filter((c) => c.status === 'off_track').length;
  const avgCompliance = members.length > 0 ? Math.round(nutritionCustomers.reduce((acc, c) => acc + c.compliance, 0) / members.length) : 0;

  const filteredCustomers = nutritionCustomers.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.memberId.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchPlan = selectedPlanFilter === 'All Plans' || c.planName === selectedPlanFilter;
    const matchGoal = selectedGoalFilter === 'All Goals' || c.goal === selectedGoalFilter;
    const matchStatus = selectedStatusFilter === 'All Status' ||
      (selectedStatusFilter === 'On Track' && c.status === 'on_track') ||
      (selectedStatusFilter === 'Needs Attention' && c.status === 'needs_attention') ||
      (selectedStatusFilter === 'Off Track' && c.status === 'off_track');
    return matchSearch && matchPlan && matchGoal && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <PageHeader
        title="Nutrition"
        breadcrumb={['Dashboard', 'Nutrition', 'Customers']}
        actions={
          <button className="btn-primary bg-brand-600 hover:bg-brand-700 shadow-glow">
            <Icon name="plus" size={16} /> Create Nutrition Plan
          </button>
        }
      />

      {/* Top 5 Metric KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Members */}
          <div className="card p-4 flex items-center justify-between border-navy-100/80 hover:border-navy-200 transition-all">
            <div>
              <div className="text-xs font-medium text-navy-400">Total Members</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">{totalMembersCount.toLocaleString()}</div>
              <div className="text-[11px] text-navy-400 mt-0.5">With Nutrition Plans</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
              <Icon name="users" size={20} />
            </div>
          </div>

          {/* Card 2: On Track */}
          <div className="card p-4 flex items-center justify-between border-navy-100/80 hover:border-navy-200 transition-all">
            <div>
              <div className="text-xs font-medium text-navy-400">On Track</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-navy-900">{onTrackCount}</span>
                <span className="text-xs font-semibold text-success-600">({totalMembersCount > 0 ? Math.round((onTrackCount / totalMembersCount) * 100) : 0}%)</span>
              </div>
              <div className="text-[11px] text-navy-400 mt-0.5">Following plans well</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center text-success-600">
              <Icon name="check-circle" size={20} />
            </div>
          </div>

          {/* Card 3: Needs Attention */}
          <div className="card p-4 flex items-center justify-between border-navy-100/80 hover:border-navy-200 transition-all">
            <div>
              <div className="text-xs font-medium text-navy-400">Needs Attention</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-navy-900">{needsAttentionCount}</span>
                <span className="text-xs font-semibold text-warning-600">({totalMembersCount > 0 ? Math.round((needsAttentionCount / totalMembersCount) * 100) : 0}%)</span>
              </div>
              <div className="text-[11px] text-navy-400 mt-0.5">Require improvement</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center text-warning-600">
              <Icon name="alert-circle" size={20} />
            </div>
          </div>

          {/* Card 4: Off Track */}
          <div className="card p-4 flex items-center justify-between border-navy-100/80 hover:border-navy-200 transition-all">
            <div>
              <div className="text-xs font-medium text-navy-400">Off Track</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-navy-900">{offTrackCount}</span>
                <span className="text-xs font-semibold text-danger-600">({totalMembersCount > 0 ? Math.round((offTrackCount / totalMembersCount) * 100) : 0}%)</span>
              </div>
              <div className="text-[11px] text-navy-400 mt-0.5">Not following plans</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-danger-50 flex items-center justify-center text-danger-600">
              <Icon name="x-circle" size={20} />
            </div>
          </div>

          {/* Card 5: Today's Avg Compliance */}
          <div className="card p-4 flex items-center justify-between border-navy-100/80 hover:border-navy-200 transition-all">
            <div>
              <div className="text-xs font-medium text-navy-400">Today's Avg Compliance</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">{avgCompliance}%</div>
              <div className="text-[11px] text-success-600 font-semibold mt-0.5 flex items-center gap-0.5">
                <Icon name="trending-up" size={12} /> +8.4% vs yesterday
              </div>
            </div>
            <div className="w-12 h-12 shrink-0">
              <ProgressRing value={avgCompliance} max={100} size={48} strokeWidth={5} color="#059669" label="" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Filters Row */}
      <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Customer */}
          <div className="relative flex-1 min-w-[220px]">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-xs"
            />
          </div>

          {/* Filter Dropdowns */}
          <select value={selectedPlanFilter} onChange={(e) => setSelectedPlanFilter(e.target.value)} className="input-field py-2 text-xs w-auto">
            <option>All Plans</option>
            <option>Muscle Gain Plan</option>
            <option>Fat Loss Plan</option>
            <option>Lean Bulk Plan</option>
            <option>Weight Loss Plan</option>
          </select>

          <select value={selectedGoalFilter} onChange={(e) => setSelectedGoalFilter(e.target.value)} className="input-field py-2 text-xs w-auto">
            <option>All Goals</option>
            <option>Gain Muscle</option>
            <option>Lose Weight</option>
            <option>Lean Bulk</option>
          </select>

          <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="input-field py-2 text-xs w-auto">
            <option>All Status</option>
            <option>On Track</option>
            <option>Needs Attention</option>
            <option>Off Track</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Picker Button */}
          <button className="btn-secondary py-2 px-3 text-xs flex items-center gap-2">
            <Icon name="calendar" size={14} className="text-navy-500" />
            <span>Today, 25 May 2025</span>
          </button>
          <button className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5">
            <Icon name="sliders" size={14} /> Filters
          </button>
          <button className="btn-ghost py-2 px-2.5 text-xs text-navy-500 hover:bg-navy-100">
            <Icon name="download" size={16} />
          </button>
        </div>
      </div>

      {/* Customer Nutrition Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} cols={9} />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState icon="!" title="No members found" description="No customer nutrition data matches your query." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan & Goal</th>
                  <th className="py-3 px-4">Meals (Done/Total)</th>
                  <th className="py-3 px-4">Calories (Consumed / Target)</th>
                  <th className="py-3 px-4">Protein (Consumed / Target)</th>
                  <th className="py-3 px-4">Compliance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Meal Logged</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs text-navy-700">
                {filteredCustomers.map((c) => {
                  const calPct = Math.round((c.caloriesConsumed / c.caloriesTarget) * 100);
                  const proPct = Math.round((c.proteinConsumed / c.proteinTarget) * 100);
                  const mealPct = (c.mealsDone / c.totalMeals) * 100;

                  return (
                    <tr key={c.id} className="hover:bg-navy-50/60 transition-colors">
                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                            {c.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-navy-900">{c.name}</div>
                            <div className="text-[11px] text-navy-400">{c.memberId} · {c.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Plan & Goal */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy-900">{c.planName}</div>
                        <div className="text-[11px] text-navy-400">{c.goal}</div>
                      </td>

                      {/* Meals */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900 mb-1">{c.mealsDone} / {c.totalMeals}</div>
                        <div className="w-20 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', mealPct >= 80 ? 'bg-success-500' : mealPct >= 50 ? 'bg-warning-500' : 'bg-danger-500')}
                            style={{ width: `${mealPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Calories */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{c.caloriesConsumed.toLocaleString()} / {c.caloriesTarget.toLocaleString()} kcal</div>
                        <div className="text-[11px] font-semibold text-success-600">{calPct}%</div>
                      </td>

                      {/* Protein */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{c.proteinConsumed} / {c.proteinTarget} g</div>
                        <div className="text-[11px] font-semibold text-success-600">{proPct}%</div>
                      </td>

                      {/* Compliance */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900 mb-1">{c.compliance}%</div>
                        <div className="w-24 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', c.compliance >= 80 ? 'bg-success-500' : c.compliance >= 60 ? 'bg-warning-500' : 'bg-danger-500')}
                            style={{ width: `${c.compliance}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {c.status === 'on_track' && <Badge variant="success">On Track</Badge>}
                        {c.status === 'needs_attention' && <Badge variant="warning">Needs Attention</Badge>}
                        {c.status === 'off_track' && <Badge variant="danger">Off Track</Badge>}
                      </td>

                      {/* Last Meal Logged */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy-900">{c.lastMealLogged}</div>
                        <div className="text-[11px] text-navy-400">{c.lastMealTime}</div>
                      </td>

                      {/* Action View */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => { setSelectedCustomer(c); setActiveDrawerTab('Overview'); }}
                          className="btn-secondary py-1 px-3 text-xs font-semibold hover:border-brand-300 hover:text-brand-600 transition-all"
                        >
                          View
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

      {/* Customer Nutrition Detail Modal / Drawer (Image 2) */}
      {selectedCustomer && (
        <>
          <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-50 animate-fade-in" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-50 animate-slide-up border border-navy-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-navy-100 bg-white sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-full border border-navy-200 hover:bg-navy-50 text-navy-500 transition-colors">
                  <Icon name="x" size={16} />
                </button>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-base flex items-center justify-center shadow-md">
                  {selectedCustomer.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-navy-900">{selectedCustomer.name}</h2>
                    {selectedCustomer.status === 'on_track' && <Badge variant="success">On Track</Badge>}
                    {selectedCustomer.status === 'needs_attention' && <Badge variant="warning">Needs Attention</Badge>}
                    {selectedCustomer.status === 'off_track' && <Badge variant="danger">Off Track</Badge>}
                  </div>
                  <div className="text-xs text-navy-500 mt-0.5">
                    <span className="font-semibold">{selectedCustomer.planName}</span> · Assigned to <span className="font-semibold text-navy-700">{selectedCustomer.trainerName}</span> · Member ID: {selectedCustomer.memberId} · Phone: {selectedCustomer.phone}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
                  <Icon name="message-square" size={14} /> Contact Member
                </button>
                <button className="btn-primary bg-brand-600 text-xs py-2 px-3 flex items-center gap-1">
                  Actions <Icon name="chevron-down" size={14} />
                </button>
              </div>
            </div>

            {/* Modal Tab Controls */}
            <div className="px-6 border-b border-navy-100 bg-navy-50/40 flex items-center gap-6 text-xs font-semibold text-navy-500">
              {(['Overview', 'Meals', 'Progress', 'Analysis'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDrawerTab(tab)}
                  className={cn('py-3 border-b-2 transition-all', activeDrawerTab === tab ? 'border-brand-600 text-brand-600 font-bold' : 'border-transparent hover:text-navy-900')}
                >
                  {tab === 'Meals' ? "Today's Meals" : tab}
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 space-y-6 bg-navy-50/20">
              {activeDrawerTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Today's Nutrition Summary & AI Status */}
                  <div className="space-y-6">
                    {/* Today's Nutrition Summary */}
                    <div className="card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-navy-900">Today's Nutrition Summary</h3>
                        <button className="text-xs text-brand-600 font-semibold hover:underline">View Full Report →</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Calories */}
                        <div className="p-3 rounded-2xl bg-brand-50/40 border border-brand-100/60">
                          <div className="flex items-center gap-1.5 text-xs text-brand-700 font-bold mb-1">
                            <Icon name="flame" size={14} className="text-brand-600" /> Calories
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.caloriesConsumed.toLocaleString()} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.caloriesTarget.toLocaleString()} kcal</span></div>
                          <div className="text-[11px] font-semibold text-brand-600 mt-1">{Math.round((selectedCustomer.caloriesConsumed / selectedCustomer.caloriesTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-brand-100 mt-2 overflow-hidden">
                            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(selectedCustomer.caloriesConsumed / selectedCustomer.caloriesTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Protein */}
                        <div className="p-3 rounded-2xl bg-success-50/40 border border-success-100/60">
                          <div className="flex items-center gap-1.5 text-xs text-success-700 font-bold mb-1">
                            <Icon name="shield" size={14} className="text-success-600" /> Protein
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.proteinConsumed} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.proteinTarget} g</span></div>
                          <div className="text-[11px] font-semibold text-success-600 mt-1">{Math.round((selectedCustomer.proteinConsumed / selectedCustomer.proteinTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-success-100 mt-2 overflow-hidden">
                            <div className="h-full bg-success-600 rounded-full" style={{ width: `${(selectedCustomer.proteinConsumed / selectedCustomer.proteinTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Carbs */}
                        <div className="p-3 rounded-2xl bg-ai-50/40 border border-ai-100/60">
                          <div className="flex items-center gap-1.5 text-xs text-ai-700 font-bold mb-1">
                            <Icon name="zap" size={14} className="text-ai-600" /> Carbs
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.carbsConsumed} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.carbsTarget} g</span></div>
                          <div className="text-[11px] font-semibold text-ai-600 mt-1">{Math.round((selectedCustomer.carbsConsumed / selectedCustomer.carbsTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-ai-100 mt-2 overflow-hidden">
                            <div className="h-full bg-ai-600 rounded-full" style={{ width: `${(selectedCustomer.carbsConsumed / selectedCustomer.carbsTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Fats */}
                        <div className="p-3 rounded-2xl bg-warning-50/40 border border-warning-100/60">
                          <div className="flex items-center gap-1.5 text-xs text-warning-700 font-bold mb-1">
                            <Icon name="droplet" size={14} className="text-warning-600" /> Fats
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.fatConsumed} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.fatTarget} g</span></div>
                          <div className="text-[11px] font-semibold text-warning-600 mt-1">{Math.round((selectedCustomer.fatConsumed / selectedCustomer.fatTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-warning-100 mt-2 overflow-hidden">
                            <div className="h-full bg-warning-600 rounded-full" style={{ width: `${(selectedCustomer.fatConsumed / selectedCustomer.fatTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Fiber */}
                        <div className="p-3 rounded-2xl bg-navy-50/60 border border-navy-100">
                          <div className="flex items-center gap-1.5 text-xs text-navy-700 font-bold mb-1">
                            <Icon name="activity" size={14} className="text-navy-600" /> Fiber
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.fiberConsumed} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.fiberTarget} g</span></div>
                          <div className="text-[11px] font-semibold text-navy-600 mt-1">{Math.round((selectedCustomer.fiberConsumed / selectedCustomer.fiberTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-navy-200 mt-2 overflow-hidden">
                            <div className="h-full bg-navy-600 rounded-full" style={{ width: `${(selectedCustomer.fiberConsumed / selectedCustomer.fiberTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Water */}
                        <div className="p-3 rounded-2xl bg-brand-50/40 border border-brand-100/60">
                          <div className="flex items-center gap-1.5 text-xs text-brand-700 font-bold mb-1">
                            <Icon name="droplets" size={14} className="text-brand-600" /> Water
                          </div>
                          <div className="text-base font-bold text-navy-900">{selectedCustomer.waterConsumed} <span className="text-xs font-medium text-navy-400">/ {selectedCustomer.waterTarget} L</span></div>
                          <div className="text-[11px] font-semibold text-brand-600 mt-1">{Math.round((selectedCustomer.waterConsumed / selectedCustomer.waterTarget) * 100)}% of goal</div>
                          <div className="w-full h-1.5 rounded-full bg-brand-100 mt-2 overflow-hidden">
                            <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(selectedCustomer.waterConsumed / selectedCustomer.waterTarget) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Nutrition Status */}
                    <div className="card p-5 space-y-3">
                      <div className="text-xs font-bold text-navy-500 uppercase tracking-wider">AI Nutrition Status</div>
                      <div className="text-lg font-bold text-success-600">ON TRACK</div>
                      <p className="text-xs text-navy-600 leading-relaxed">Great job! {selectedCustomer.name} is following the nutrition plan carefully and staying on track with goals.</p>

                      <div className="flex items-center justify-between pt-2 border-t border-navy-100">
                        <div className="w-20 h-20 shrink-0">
                          <ProgressRing value={selectedCustomer.compliance} max={100} size={76} strokeWidth={7} color="#059669" label={`${selectedCustomer.compliance}%`} />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Icon name="flame" size={16} className="text-warning-500" />
                            <div><div className="font-bold text-navy-900">{selectedCustomer.streakDays} Days</div><div className="text-[10px] text-navy-400">Current Streak</div></div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="x-circle" size={16} className="text-danger-500" />
                            <div><div className="font-bold text-navy-900">{selectedCustomer.missedMealsLast7Days} Meal</div><div className="text-[10px] text-navy-400">Missed in last 7 days</div></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Today's Meal Timeline */}
                  <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-navy-900">Today's Meal Timeline</h3>
                      <button className="text-xs text-brand-600 font-semibold hover:underline">View All Logs →</button>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-navy-100">
                      {[
                        { time: '06:30 AM', name: 'Pre-Workout', desc: 'Banana, Whey Protein', cal: '320 kcal', macros: '26g Protein · 45g Carbs · 4g Fat', status: 'Completed' },
                        { time: '09:00 AM', name: 'Breakfast', desc: 'Oats, Eggs, Milk, Almonds', cal: '580 kcal', macros: '34g Protein · 62g Carbs · 18g Fat', status: 'Completed' },
                        { time: '01:00 PM', name: 'Lunch', desc: 'Rice, Chicken, Dal, Curd, Salad', cal: '684 kcal', macros: '42g Protein · 82g Carbs · 18g Fat', status: 'Completed' },
                        { time: '05:00 PM', name: 'Evening Snack', desc: 'Greek Yogurt, Nuts, Berries', cal: '280 kcal', macros: '18g Protein · 20g Carbs · 12g Fat', status: 'Pending' },
                        { time: '08:30 PM', name: 'Dinner', desc: 'Chicken, Vegetables, Brown Rice', cal: '520 kcal', macros: '38g Protein · 39g Carbs · 15g Fat', status: 'Pending' },
                      ].map((meal, idx) => (
                        <div key={idx} className="flex gap-4 items-start relative z-10">
                          <span className="text-[11px] font-semibold text-navy-400 w-14 shrink-0 pt-1">{meal.time}</span>
                          <div className={cn('w-4 h-4 rounded-full border-2 bg-white shrink-0 mt-1', meal.status === 'Completed' ? 'border-success-500 bg-success-500' : 'border-warning-400')} />
                          <div className="flex-1 p-3 rounded-2xl bg-white border border-navy-100 shadow-sm hover:border-navy-200 transition-all">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-navy-900">{meal.name}</h4>
                              <Badge variant={meal.status === 'Completed' ? 'success' : 'warning'}>{meal.status}</Badge>
                            </div>
                            <p className="text-[11px] text-navy-500 mt-0.5">{meal.desc}</p>
                            <div className="text-[10px] font-medium text-navy-400 mt-1.5 flex items-center justify-between">
                              <span>{meal.cal}</span>
                              <span>{meal.macros}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Planned vs Actual & AI Insights */}
                  <div className="space-y-6">
                    {/* Planned vs Actual */}
                    <div className="card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-navy-900">Planned vs Actual</h3>
                        <button className="text-xs text-brand-600 font-semibold hover:underline">View Details →</button>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        {/* Calories */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-navy-700">Calories</span>
                            <span className="text-navy-400">Planned: {selectedCustomer.caloriesTarget} kcal · <strong className="text-navy-900">Actual: {selectedCustomer.caloriesConsumed} kcal</strong></span>
                          </div>
                          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(selectedCustomer.caloriesConsumed / selectedCustomer.caloriesTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Protein */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-navy-700">Protein</span>
                            <span className="text-navy-400">Planned: {selectedCustomer.proteinTarget} g · <strong className="text-navy-900">Actual: {selectedCustomer.proteinConsumed} g</strong></span>
                          </div>
                          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div className="h-full bg-success-500 rounded-full" style={{ width: `${(selectedCustomer.proteinConsumed / selectedCustomer.proteinTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Carbs */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-navy-700">Carbs</span>
                            <span className="text-navy-400">Planned: {selectedCustomer.carbsTarget} g · <strong className="text-navy-900">Actual: {selectedCustomer.carbsConsumed} g</strong></span>
                          </div>
                          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div className="h-full bg-ai-500 rounded-full" style={{ width: `${(selectedCustomer.carbsConsumed / selectedCustomer.carbsTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Fats */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-navy-700">Fats</span>
                            <span className="text-navy-400">Planned: {selectedCustomer.fatTarget} g · <strong className="text-navy-900">Actual: {selectedCustomer.fatConsumed} g</strong></span>
                          </div>
                          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div className="h-full bg-warning-500 rounded-full" style={{ width: `${(selectedCustomer.fatConsumed / selectedCustomer.fatTarget) * 100}%` }} />
                          </div>
                        </div>

                        {/* Fiber */}
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-navy-700">Fiber</span>
                            <span className="text-navy-400">Planned: {selectedCustomer.fiberTarget} g · <strong className="text-navy-900">Actual: {selectedCustomer.fiberConsumed} g</strong></span>
                          </div>
                          <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div className="h-full bg-navy-500 rounded-full" style={{ width: `${(selectedCustomer.fiberConsumed / selectedCustomer.fiberTarget) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Insights Card */}
                    <div className="card p-5 bg-gradient-to-br from-ai-50/60 via-white to-brand-50/40 border-ai-200/40 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon name="sparkles" size={16} className="text-ai-600" />
                        <span className="text-xs font-bold text-ai-700 uppercase tracking-wider">AI Insights</span>
                      </div>
                      <div className="space-y-2 text-xs text-navy-700 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <Icon name="check" size={14} className="text-success-600 shrink-0 mt-0.5" />
                          <span>Protein intake is {selectedCustomer.proteinTarget - selectedCustomer.proteinConsumed}g below daily target.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Icon name="check" size={14} className="text-success-600 shrink-0 mt-0.5" />
                          <span>Great consistency! {selectedCustomer.mealsDone} out of {selectedCustomer.totalMeals} meals completed.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Icon name="check" size={14} className="text-success-600 shrink-0 mt-0.5" />
                          <span>Consider increasing healthy fats slightly for dinner.</span>
                        </div>
                      </div>
                      <button className="text-xs text-brand-600 font-bold hover:underline pt-1 block">View Full Analysis →</button>
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab !== 'Overview' && (
                <div className="card p-8 text-center text-navy-500 text-sm">
                  <Icon name="activity" size={32} className="mx-auto mb-2 text-brand-500" />
                  Showing {activeDrawerTab} data for {selectedCustomer.name}.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
