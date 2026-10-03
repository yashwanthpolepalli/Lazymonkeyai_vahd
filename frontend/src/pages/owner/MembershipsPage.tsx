import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { DonutChart, BarChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/services/api';
import { apiClient } from '@/services/apiClient';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

export interface MembershipPlanItem {
  id?: string;
  owner_id?: string;
  branch_id?: string;
  name: string;
  category?: string;
  price: number;
  duration_days?: number;
  period?: string;
  features: string[];
  color?: string;
  badge?: string;
  is_combo?: boolean;
  isCombo?: boolean;
}

export interface TrainingProgramView {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  isCombo?: boolean;
  color: string;
  badge?: string;
  features: string[];
  prices: {
    d30: number;
    d90: number;
    d180: number;
    d365: number;
  };
  dbPlanIds?: {
    d30?: string;
    d90?: string;
    d180?: string;
    d365?: string;
  };
}




export function MembershipsPage({ embedded = false }: { embedded?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [rawPlans, setRawPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Custom Categories State (persisted in localStorage)
  const [customCategories, setCustomCategories] = useState<{ value: string; label: string; isCombo?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('gym_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Program Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    category: 'strength_cardio',
    categoryLabel: 'Strength + Cardio Combo',
    isCombo: true,
    badge: 'Popular Combo',
    color: 'from-emerald-500 to-teal-600',
    features: '',
    price_30d: '3500',
    price_90d: '9000',
    price_180d: '16500',
    price_365d: '29000',
    dbPlanIds: {} as { d30?: string; d90?: string; d180?: string; d365?: string },
  });

  const fetchPlansAndMembers = () => {
    setLoading(true);
    Promise.all([
      api.customers.list().catch(() => []),
      apiClient.get<MembershipPlanItem[]>('/memberships/plans').catch(() => []),
    ])
      .then(([m, p]) => {
        setMembers(m || []);
        setRawPlans(p || []);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPlansAndMembers();
  }, []);

  // Build structured training programs purely from owner-created DB plans (no hardcoded presets)
  const structuredPrograms: TrainingProgramView[] = (() => {
    if (!rawPlans.length) return [];

    // Group DB plans by their canonical program name (strip duration suffixes like "- Monthly", "- Quarterly" etc.)
    const groupMap = new Map<string, MembershipPlanItem[]>();

    rawPlans.forEach((plan) => {
      // Derive the base program name by stripping common duration suffixes
      const baseName = plan.name
        .replace(/\s*[-–]\s*(monthly|quarterly|6[- ]?month|yearly|annual|30d?|90d?|180d?|365d?)\s*$/i, '')
        .trim();
      const key = `${(plan.category || 'general').toLowerCase().trim()}::${baseName.toLowerCase().trim()}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(plan);
    });

    const list: TrainingProgramView[] = [];

    groupMap.forEach((groupPlans) => {
      const first = groupPlans[0];
      const baseName = first.name
        .replace(/\s*[-–]\s*(monthly|quarterly|6[- ]?month|yearly|annual|30d?|90d?|180d?|365d?)\s*$/i, '')
        .trim();

      const p30 = groupPlans.find((p) => (p.duration_days || 30) === 30);
      const p90 = groupPlans.find((p) => (p.duration_days || 30) === 90);
      const p180 = groupPlans.find((p) => (p.duration_days || 30) === 180);
      const p365 = groupPlans.find((p) => (p.duration_days || 30) === 365);
      const basePrice = (p30 || first).price || 0;

      const isComboVal = Boolean(
        first.is_combo || first.isCombo ||
        (first.category || '').includes('_') ||
        baseName.includes('+')
      );

      const category = (first.category || 'general').trim();
      const categoryLabel = category
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      list.push({
        id: first.id || `prog_${category}_${baseName.replace(/\s+/g, '_').toLowerCase()}`,
        name: baseName,
        category,
        categoryLabel,
        isCombo: isComboVal,
        badge: first.badge || '',
        color: first.color || (isComboVal ? 'from-rose-500 to-pink-600' : 'from-blue-500 to-indigo-600'),
        features: first.features?.length ? first.features : [],
        prices: {
          d30: p30 ? p30.price : basePrice,
          d90: p90 ? p90.price : Math.round((basePrice * 2.6) / 50) * 50,
          d180: p180 ? p180.price : Math.round((basePrice * 4.8) / 50) * 50,
          d365: p365 ? p365.price : Math.round((basePrice * 8.8) / 50) * 50,
        },
        dbPlanIds: {
          d30: p30?.id,
          d90: p90?.id,
          d180: p180?.id,
          d365: p365?.id,
        },
      });
    });

    return list;

  })();

  const handleAddCustomCategory = () => {
    if (!newCatName.trim()) return;
    const val = newCatName.trim().toLowerCase().replace(/\s+/g, '_');
    const lbl = newCatName.trim();
    const exists = customCategories.some((c) => c.value === val);
    if (!exists) {
      const updated = [...customCategories, { value: val, label: lbl, isCombo: programForm.isCombo }];
      setCustomCategories(updated);
      try {
        localStorage.setItem('gym_custom_categories', JSON.stringify(updated));
      } catch {}
    }
    setProgramForm((prev) => ({
      ...prev,
      category: val,
      categoryLabel: lbl,
    }));
    setNewCatName('');
    setShowNewCatInput(false);
  };

  const openCreateModal = () => {
    setEditingProgramId(null);
    setProgramForm({
      name: '',
      category: 'general',
      categoryLabel: 'General',
      isCombo: false,
      badge: '',
      color: 'from-blue-500 to-indigo-600',
      features: '',
      price_30d: '',
      price_90d: '',
      price_180d: '',
      price_365d: '',
      dbPlanIds: {},
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: TrainingProgramView) => {
    setEditingProgramId(prog.id);
    setProgramForm({
      name: prog.name,
      category: prog.category,
      categoryLabel: prog.categoryLabel,
      isCombo: Boolean(prog.isCombo),
      badge: prog.badge || '',
      color: prog.color || 'from-brand-500 to-brand-700',
      features: prog.features.join(', '),
      price_30d: String(prog.prices.d30),
      price_90d: String(prog.prices.d90),
      price_180d: String(prog.prices.d180),
      price_365d: String(prog.prices.d365),
      dbPlanIds: prog.dbPlanIds || {},
    });
    setModalOpen(true);
  };

  const handleAutoCalculatePrices = (basePrice: number) => {
    if (!basePrice || isNaN(basePrice)) return;
    setProgramForm((prev) => ({
      ...prev,
      price_90d: String(Math.round((basePrice * 2.6) / 50) * 50),
      price_180d: String(Math.round((basePrice * 4.8) / 50) * 50),
      price_365d: String(Math.round((basePrice * 8.8) / 50) * 50),
    }));
  };


  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name || !programForm.price_30d) return;

    const featuresList = programForm.features
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const durationTiers = [
      { days: 30, price: Number(programForm.price_30d) || 1500, dbId: programForm.dbPlanIds?.d30 },
      { days: 90, price: Number(programForm.price_90d) || 3500, dbId: programForm.dbPlanIds?.d90 },
      { days: 180, price: Number(programForm.price_180d) || 6500, dbId: programForm.dbPlanIds?.d180 },
      { days: 365, price: Number(programForm.price_365d) || 10000, dbId: programForm.dbPlanIds?.d365 },
    ];

    try {
      for (const tier of durationTiers) {
        const payload = {
          name: `${programForm.name} - ${tier.days === 30 ? 'Monthly' : tier.days === 90 ? 'Quarterly' : tier.days === 180 ? '6-Month' : 'Yearly'}`,
          category: programForm.category,
          price: tier.price,
          duration_days: tier.days,
          features: featuresList,
          badge: programForm.badge,
          color: programForm.color,
          is_combo: Boolean(programForm.isCombo),
        };

        if (tier.dbId) {
          await apiClient.put(`/memberships/plans/${tier.dbId}`, payload).catch(() => {});
        } else {
          await apiClient.post('/memberships/plans', payload).catch(() => {});
        }
      }

      setModalOpen(false);
      fetchPlansAndMembers();
    } catch (_err) {
      /* ignore */
    }
  };

  const handleDeleteProgram = async (prog: TrainingProgramView) => {
    if (!confirm(`Are you sure you want to delete the "${prog.name}" program and all its duration tiers?`)) return;
    try {
      const idsToDelete = Object.values(prog.dbPlanIds || {}).filter(Boolean) as string[];
      for (const id of idsToDelete) {
        await apiClient.delete(`/memberships/plans/${id}`).catch(() => {});
      }
      if (editingProgramId === prog.id) {
        setModalOpen(false);
      }
      fetchPlansAndMembers();
    } catch (_err) {
      /* ignore */
    }
  };

  const activeCount = members.filter((m) => m.status === 'active' || m.status === 'vip').length;
  const expiringCount = members.filter((m) => m.status === 'expiring').length;
  const trialCount = members.filter((m) => m.status === 'trial').length;

  const totalRevenue = members.reduce((acc, m) => {
    const val = parseInt(String(m.revenue || '').replace(/[^0-9]/g, ''), 10);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const colors = ['#2563eb', '#059669', '#d97706', '#9333ea', '#ec4899', '#06b6d4', '#84cc16'];
  const planCounts = structuredPrograms.map((p, i) => ({
    label: p.name,
    value: members.filter((m) => (m.membership || '').toLowerCase().includes(p.name.toLowerCase())).length,
    color: colors[i % colors.length],
  }));

  const filteredPrograms = structuredPrograms.filter((p) => {
    if (filterCategory === 'all') return true;
    return p.category.toLowerCase() === filterCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-navy-900 tracking-tight flex items-center gap-2">
              <Icon name="layers" size={22} className="text-brand-600" />
              <span>Training Programs, Combos & Duration Pricing</span>
            </h2>
            <p className="text-xs text-navy-500 font-medium">
              Configure single & combo workout programs. Set custom pricing per duration tier (1M, 3M, 6M, 1Y).
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-glow">
            <Icon name="plus" size={16} /> Add Program / Combo
          </button>
        </div>
      ) : (
        <PageHeader
          title="Memberships & Training Programs"
          breadcrumb={['Owner', 'Memberships']}
          actions={
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 shadow-glow">
              <Icon name="plus" size={16} /> Add Program / Combo
            </button>
          }
        />
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Active Members</span>
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                <Icon name="check-circle" size={16} className="text-success-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{activeCount}</div>
            <div className="text-xs text-navy-400 mt-1">Live active subscribers</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Expiring Soon</span>
              <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                <Icon name="clock" size={16} className="text-warning-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{expiringCount}</div>
            <div className="text-xs text-warning-600 font-semibold mt-1">within 7 days</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Active Combos</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <Icon name="flame" size={16} className="text-rose-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{structuredPrograms.filter((p) => p.isCombo).length} Combos</div>
            <div className="text-xs text-rose-600 font-semibold mt-1">Multi-discipline training</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon name="indian-rupee" size={16} className="text-brand-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-navy-400 mt-1">Aggregated memberships</div>
          </div>
        </div>
      )}

      {/* Program Distribution & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Program Distribution</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <>
              <div className="flex justify-center mb-4">
                <DonutChart
                  segments={planCounts.filter((p) => p.value > 0).length > 0
                    ? planCounts.filter((p) => p.value > 0)
                    : [{ label: 'Subscribers', value: Math.max(1, members.length), color: '#2563eb' }]}
                  size={160}
                  centerLabel={`${members.length}`}
                  centerSublabel="Members"
                />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {planCounts.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-navy-700 font-medium truncate">{p.label}</span>
                    </div>
                    <span className="font-bold text-navy-900 ml-2 shrink-0">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Monthly Membership Revenue Progression</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <BarChart data={[32, 28, 35, 42, 38, 45, 48, Math.max(1, members.length)]} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']} height={200} color="#2563eb" />
          )}
        </div>
      </div>

      {/* Training Programs & Combos Grid */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Icon name="award" size={18} className="text-brand-600" />
              <span>Available Training Programs & Combos</span>
            </h3>
            <p className="text-xs text-navy-400 mt-0.5">
              Each program automatically adapts its billing across 30D, 90D, 180D, and 365D duration tiers in member enrollment.
            </p>
          </div>

          {/* Dynamic Category Filter Pills — from owner-created programs only */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Programs' },
              ...Array.from(
                new Map(
                  structuredPrograms.map((p) => [p.category, { id: p.category, label: p.categoryLabel }])
                ).values()
              ),
            ].map((cat) => {
              const isActive = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0',
                    isActive
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-navy-50 text-navy-600 border-navy-200 hover:bg-navy-100'
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? <Skeleton className="h-48 w-full" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => {
              const enrolledCount = members.filter((m) => (m.membership || '').toLowerCase().includes(prog.name.toLowerCase())).length;

              return (
                <div
                  key={prog.id}
                  className="card card-hover p-5 relative flex flex-col justify-between border border-navy-200/90 hover:border-brand-500/50 hover:shadow-md transition-all duration-200"
                >
                  <div>
                    {/* Top Badges & Icon */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0', prog.color)}>
                        <Icon name={prog.isCombo ? 'flame' : 'credit-card'} size={20} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {prog.isCombo && (
                          <Badge variant="brand" className="text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-700 border-rose-200">
                            Combo Pack
                          </Badge>
                        )}
                        {prog.badge && (
                          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-sm">
                            {prog.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Program Title & Category */}
                    <div className="text-base font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                      {prog.name}
                    </div>
                    <div className="text-xs text-brand-600 font-semibold mb-3">
                      {prog.categoryLabel}
                    </div>

                    {/* 4-Tier Duration Pricing Grid */}
                    <div className="mb-4 bg-navy-50/70 p-3 rounded-2xl border border-navy-200/70 space-y-1.5">
                      <div className="text-[10px] font-bold text-navy-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Duration Tier Pricing</span>
                        <Icon name="clock" size={12} className="text-brand-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-navy-100 flex items-center justify-between">
                          <span className="text-navy-500 font-medium">1 Mo (30D)</span>
                          <span className="font-extrabold text-navy-900">₹{prog.prices.d30.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-navy-100 flex items-center justify-between">
                          <span className="text-navy-500 font-medium">3 Mo (90D)</span>
                          <span className="font-extrabold text-navy-900">₹{prog.prices.d90.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-navy-100 flex items-center justify-between">
                          <span className="text-navy-500 font-medium">6 Mo (180D)</span>
                          <span className="font-extrabold text-navy-900">₹{prog.prices.d180.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-navy-100 flex items-center justify-between">
                          <span className="text-navy-500 font-medium">1 Yr (365D)</span>
                          <span className="font-extrabold text-brand-600">₹{prog.prices.d365.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Enrolled & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-navy-100 mt-2">
                    <span className="text-xs text-navy-500 font-medium">
                      <span className="font-bold text-navy-800">{enrolledCount}</span> members enrolled
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(prog)}
                        className="btn-ghost text-xs flex items-center gap-1 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Icon name="edit" size={13} /> Edit Pricing
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(prog)}
                        className="btn-ghost text-xs text-danger-600 hover:text-danger-700 hover:bg-danger-50 flex items-center gap-1"
                      >
                        <Icon name="trash-2" size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Program & Duration Pricing Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Icon name="layers" size={18} className="text-brand-600" />
                  <span>{editingProgramId ? 'Edit Program & Duration Pricing' : 'Add New Training Program / Combo'}</span>
                </h3>
                <p className="text-xs text-navy-400">Configure program details and pricing across all duration tiers.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-navy-400 hover:text-navy-600 p-1">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              {/* Program Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Program / Combo Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter program name"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-navy-700">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCatInput((prev) => !prev)}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name={showNewCatInput ? 'x' : 'plus'} size={12} />
                      <span>{showNewCatInput ? 'Cancel' : '+ Add Category'}</span>
                    </button>
                  </div>

                  {showNewCatInput ? (
                    <div className="p-2.5 bg-brand-50/70 border border-brand-200 rounded-xl space-y-2 animate-fade-in">
                      <div className="text-[11px] font-bold text-brand-800">New Category Name</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter category name"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          className="input-field text-xs py-1.5 flex-1 bg-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomCategory}
                          disabled={!newCatName.trim()}
                          className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50 shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={programForm.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__add_new__') {
                          setShowNewCatInput(true);
                          return;
                        }
                        const customMatch = customCategories.find((c) => c.value === val);
                        const isCombo = customMatch ? Boolean(customMatch.isCombo) : (val.includes('_') || val.includes('cardio_strength'));
                        setProgramForm({
                          ...programForm,
                          category: val,
                          isCombo: programForm.isCombo !== undefined ? programForm.isCombo : isCombo,
                          categoryLabel: customMatch ? customMatch.label : val.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                        });
                      }}
                      className="input-field text-xs py-2"
                    >
                      {/* Existing categories from owner's DB programs */}
                      {Array.from(
                        new Map(
                          structuredPrograms.map((p) => [p.category, { value: p.category, label: p.categoryLabel, isCombo: p.isCombo }])
                        ).values()
                      ).map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}{cat.isCombo ? ' (Combo)' : ''}
                        </option>
                      ))}
                      {/* Custom categories added by owner */}
                      {customCategories
                        .filter((cc) => !structuredPrograms.some((p) => p.category === cc.value))
                        .map((cc) => (
                          <option key={cc.value} value={cc.value}>
                            {cc.label} {cc.isCombo ? '(Combo)' : ''}
                          </option>
                        ))}
                      <option value="__add_new__">+ Add New Category...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Checkbox for Combo Pack Label & Classification */}
              <div className="card p-3 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/50 border border-rose-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm transition-colors',
                    programForm.isCombo ? 'bg-rose-500' : 'bg-navy-300'
                  )}>
                    <Icon name="flame" size={16} />
                  </div>
                  <div>
                    <label htmlFor="combo_pack_checkbox" className="text-xs font-bold text-navy-900 cursor-pointer block select-none">
                      Mark as Combo Training Pack
                    </label>
                    <p className="text-[11px] text-navy-500">
                      {programForm.isCombo
                        ? 'Active: Includes "Combo Pack" badge and appears in Combos & Hybrid filter in enrollment.'
                        : 'Inactive: Standard single-discipline program.'}
                    </p>
                  </div>
                </div>
                <input
                  id="combo_pack_checkbox"
                  type="checkbox"
                  checked={programForm.isCombo}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setProgramForm((prev) => ({
                      ...prev,
                      isCombo: checked,
                      badge: checked ? (prev.badge || 'Popular Combo') : (prev.badge === 'Popular Combo' || prev.badge === 'Best Seller' || prev.badge === 'High Burn' ? '' : prev.badge),
                    }));
                  }}
                  className="w-5 h-5 rounded border-navy-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Duration Tier Pricing Matrix */}
              <div className="card p-3.5 bg-gradient-to-br from-navy-50 via-white to-brand-50/40 border border-navy-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="credit-card" size={13} className="text-brand-600" />
                    <span>Duration Tier Pricing (₹)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoCalculatePrices(Number(programForm.price_30d))}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <Icon name="refresh-cw" size={11} /> Auto-Calculate Multipliers
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-navy-700 mb-1 block">1 Month (30D)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={programForm.price_30d}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProgramForm({ ...programForm, price_30d: val });
                      }}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-navy-700 mb-1 block">3 Months (90D)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={programForm.price_90d}
                      onChange={(e) => setProgramForm({ ...programForm, price_90d: e.target.value })}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-navy-700 mb-1 block">6 Months (180D)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={programForm.price_180d}
                      onChange={(e) => setProgramForm({ ...programForm, price_180d: e.target.value })}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-navy-700 mb-1 block">1 Year (365D)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={programForm.price_365d}
                      onChange={(e) => setProgramForm({ ...programForm, price_365d: e.target.value })}
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1 block">Features / Inclusions (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="Features separated by commas"
                  value={programForm.features}
                  onChange={(e) => setProgramForm({ ...programForm, features: e.target.value })}
                  className="input-field text-xs py-2"
                />
              </div>

              {/* Badge & Color Theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Badge Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="Optional badge label"
                    value={programForm.badge}
                    onChange={(e) => setProgramForm({ ...programForm, badge: e.target.value })}
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Color Gradient</label>
                  <select
                    value={programForm.color}
                    onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
                    className="input-field text-xs py-2"
                  >
                    <option value="from-emerald-500 to-teal-600">Emerald / Teal</option>
                    <option value="from-rose-500 to-pink-600">Rose / Pink</option>
                    <option value="from-amber-500 to-orange-600">Amber / Orange</option>
                    <option value="from-blue-500 to-indigo-600">Blue / Indigo</option>
                    <option value="from-purple-500 to-violet-600">Purple / Violet</option>
                    <option value="from-amber-600 to-yellow-600">Amber / Gold</option>
                    <option value="from-indigo-500 to-cyan-600">Indigo / Cyan</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-navy-100">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 shadow-glow">
                  {editingProgramId ? 'Update Program & Pricing' : 'Save & Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
