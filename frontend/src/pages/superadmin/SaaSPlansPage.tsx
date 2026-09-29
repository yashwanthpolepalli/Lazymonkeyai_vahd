import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface SaaSPlanItem {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_branches: number;
  max_members: number;
  max_trainers: number;
  ai_credits_monthly: number;
  storage_gb: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
}

export function SaaSPlansPage() {
  const [plans, setPlans] = useState<SaaSPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Create Plan Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    price_monthly: '',
    price_annual: '',
    max_branches: '',
    max_members: '',
    max_trainers: '',
    ai_credits_monthly: '',
    storage_gb: '',
    features: '',
    is_popular: false,
    is_active: true,
  });

  // Edit Plan Modal State
  const [editPlan, setEditPlan] = useState<SaaSPlanItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    description: '',
    price_monthly: '',
    price_annual: '',
    max_branches: '',
    max_members: '',
    max_trainers: '',
    ai_credits_monthly: '',
    storage_gb: '',
    features: '',
    is_popular: false,
    is_active: true,
  });

  const fetchPlans = () => {
    setLoading(true);
    api.superAdmin.plans()
      .then((data) => {
        setPlans(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenEdit = (p: SaaSPlanItem) => {
    setEditPlan(p);
    setEditForm({
      name: p.name || '',
      code: p.code || '',
      description: p.description || '',
      price_monthly: p.price_monthly !== null && p.price_monthly !== undefined ? String(p.price_monthly) : '',
      price_annual: p.price_annual !== null && p.price_annual !== undefined ? String(p.price_annual) : '',
      max_branches: p.max_branches !== null && p.max_branches !== undefined ? String(p.max_branches) : '',
      max_members: p.max_members !== null && p.max_members !== undefined ? String(p.max_members) : '',
      max_trainers: p.max_trainers !== null && p.max_trainers !== undefined ? String(p.max_trainers) : '',
      ai_credits_monthly: p.ai_credits_monthly !== null && p.ai_credits_monthly !== undefined ? String(p.ai_credits_monthly) : '',
      storage_gb: p.storage_gb !== null && p.storage_gb !== undefined ? String(p.storage_gb) : '',
      features: Array.isArray(p.features) ? p.features.join(', ') : '',
      is_popular: Boolean(p.is_popular),
      is_active: Boolean(p.is_active),
    });
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) return;
    setCreating(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        code: createForm.code.trim().toLowerCase(),
        description: createForm.description.trim() || null,
        price_monthly: createForm.price_monthly !== '' ? Number(createForm.price_monthly) : null,
        price_annual: createForm.price_annual !== '' ? Number(createForm.price_annual) : null,
        max_branches: createForm.max_branches !== '' ? Number(createForm.max_branches) : null,
        max_members: createForm.max_members !== '' ? Number(createForm.max_members) : null,
        max_trainers: createForm.max_trainers !== '' ? Number(createForm.max_trainers) : null,
        ai_credits_monthly: createForm.ai_credits_monthly !== '' ? Number(createForm.ai_credits_monthly) : null,
        storage_gb: createForm.storage_gb !== '' ? Number(createForm.storage_gb) : null,
        features: createForm.features ? createForm.features.split(',').map((s) => s.trim()).filter(Boolean) : [],
        is_active: createForm.is_active,
        is_popular: createForm.is_popular,
      };
      await api.superAdmin.createPlan(payload);
      setCreateOpen(false);
      setCreateForm({
        name: '',
        code: '',
        description: '',
        price_monthly: '',
        price_annual: '',
        max_branches: '',
        max_members: '',
        max_trainers: '',
        ai_credits_monthly: '',
        storage_gb: '',
        features: '',
        is_popular: false,
        is_active: true,
      });
      fetchPlans();
    } catch (_err) {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlan || !editForm.name.trim()) return;
    setEditing(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        code: editForm.code.trim().toLowerCase(),
        description: editForm.description.trim() || null,
        price_monthly: editForm.price_monthly !== '' ? Number(editForm.price_monthly) : null,
        price_annual: editForm.price_annual !== '' ? Number(editForm.price_annual) : null,
        max_branches: editForm.max_branches !== '' ? Number(editForm.max_branches) : null,
        max_members: editForm.max_members !== '' ? Number(editForm.max_members) : null,
        max_trainers: editForm.max_trainers !== '' ? Number(editForm.max_trainers) : null,
        ai_credits_monthly: editForm.ai_credits_monthly !== '' ? Number(editForm.ai_credits_monthly) : null,
        storage_gb: editForm.storage_gb !== '' ? Number(editForm.storage_gb) : null,
        features: editForm.features ? editForm.features.split(',').map((s) => s.trim()).filter(Boolean) : [],
        is_active: editForm.is_active,
        is_popular: editForm.is_popular,
      };
      await api.superAdmin.updatePlan(editPlan.id, payload);
      setEditPlan(null);
      fetchPlans();
    } catch (_err) {
      /* ignore */
    } finally {
      setEditing(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this SaaS tier?')) return;
    try {
      await api.superAdmin.deletePlan(planId);
      setEditPlan(null);
      fetchPlans();
    } catch (_err) {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SaaS Subscription Packages & Pricing"
        breadcrumb={['Super Admin', 'SaaS Plans']}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Icon name="plus" size={16} /> Create SaaS Plan
          </button>
        }
      />

      {/* Cycle Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-200">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-bold transition-all',
              billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
              billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            Annual Billing
            <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const price = billingCycle === 'monthly' ? p.price_monthly : p.price_annual;
            return (
              <div
                key={p.id}
                className={cn(
                  'card p-6 relative flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-xl',
                  p.is_popular ? 'border-2 border-brand-500 bg-gradient-to-b from-brand-50/20 to-white' : ''
                )}
              >
                {p.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-black text-slate-900">{p.name}</h3>
                    <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">
                      {p.code.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 min-h-[36px] line-clamp-2">{p.description || 'Enterprise platform access tier.'}</p>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">₹{(price || 0).toLocaleString()}</span>
                      <span className="text-xs text-slate-400 font-semibold">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                  </div>

                  {/* Limits Spec */}
                  <div className="space-y-2 mb-4 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5"><Icon name="building-2" size={13} className="text-brand-500" /> Branches:</span>
                      <span className="font-bold text-slate-900">{p.max_branches ?? 'Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5"><Icon name="users" size={13} className="text-brand-500" /> Members:</span>
                      <span className="font-bold text-slate-900">{p.max_members ? p.max_members.toLocaleString() : 'Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5"><Icon name="sparkles" size={13} className="text-indigo-500" /> AI Credits:</span>
                      <span className="font-bold text-slate-900">{p.ai_credits_monthly ? p.ai_credits_monthly.toLocaleString() : '1,000'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5"><Icon name="hard-drive" size={13} className="text-brand-500" /> Storage:</span>
                      <span className="font-bold text-slate-900">{p.storage_gb || 10} GB</span>
                    </div>
                  </div>

                  {/* Feature Checkmarks */}
                  <div className="space-y-1.5 mb-5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Included Modules</div>
                    {(p.features && Array.isArray(p.features) ? p.features : []).map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name="check" size={10} />
                        </div>
                        <span className="line-clamp-1">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(p)}
                  className="btn-secondary w-full py-2 text-xs font-bold hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <Icon name="sliders" size={13} />
                  <span>Configure &amp; Edit Pricing</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Icon name="credit-card" size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-1">No SaaS Plans Registered</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Create subscription tiers to enable gym businesses to subscribe and scale.
          </p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Icon name="plus" size={16} /> Create First Plan
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* EDIT / CONFIGURE SAAS PLAN MODAL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {editPlan && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Icon name="sliders" size={18} className="text-brand-600" /> Configure SaaS Tier: {editPlan.name}
                </h3>
                <p className="text-[11px] text-slate-400">Update pricing, limits, and packaging for this tier in PostgreSQL.</p>
              </div>
              <button onClick={() => setEditPlan(null)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Code (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Pricing in INR */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2999"
                    value={editForm.price_monthly}
                    onChange={(e) => setEditForm((p) => ({ ...p, price_monthly: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Annual Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="29990"
                    value={editForm.price_annual}
                    onChange={(e) => setEditForm((p) => ({ ...p, price_annual: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Quotas */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Branches</label>
                  <input
                    type="number"
                    value={editForm.max_branches}
                    onChange={(e) => setEditForm((p) => ({ ...p, max_branches: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Members</label>
                  <input
                    type="number"
                    value={editForm.max_members}
                    onChange={(e) => setEditForm((p) => ({ ...p, max_members: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">AI Credits / Mo</label>
                  <input
                    type="number"
                    value={editForm.ai_credits_monthly}
                    onChange={(e) => setEditForm((p) => ({ ...p, ai_credits_monthly: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Included Modules (comma-separated tags)</label>
                <textarea
                  rows={3}
                  value={editForm.features}
                  onChange={(e) => setEditForm((p) => ({ ...p, features: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_pop"
                    checked={editForm.is_popular}
                    onChange={(e) => setEditForm((p) => ({ ...p, is_popular: e.target.checked }))}
                    className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <label htmlFor="edit_pop" className="text-slate-700 font-bold cursor-pointer">
                    "Most Popular" Ribbon
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePlan(editPlan.id)}
                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                >
                  <Icon name="trash" size={13} /> Delete Tier
                </button>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setEditPlan(null)} className="btn-secondary py-2 px-4 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={editing} className="btn-primary py-2 px-5 font-bold flex items-center gap-1.5">
                  <Icon name="check" size={14} />
                  <span>{editing ? 'Updating Tier...' : 'Save Plan Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CREATE NEW SAAS PLAN MODAL                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="credit-card" size={18} className="text-brand-600" /> Create New SaaS Tier
              </h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pro Growth"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Plan Code (Slug) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. pro"
                    value={createForm.code}
                    onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short tagline for tier"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="5999"
                    value={createForm.price_monthly}
                    onChange={(e) => setCreateForm((p) => ({ ...p, price_monthly: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Annual Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="59990"
                    value={createForm.price_annual}
                    onChange={(e) => setCreateForm((p) => ({ ...p, price_annual: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Branches</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={createForm.max_branches}
                    onChange={(e) => setCreateForm((p) => ({ ...p, max_branches: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Members</label>
                  <input
                    type="number"
                    placeholder="750"
                    value={createForm.max_members}
                    onChange={(e) => setCreateForm((p) => ({ ...p, max_members: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">AI Credits / Mo</label>
                  <input
                    type="number"
                    placeholder="2500"
                    value={createForm.ai_credits_monthly}
                    onChange={(e) => setCreateForm((p) => ({ ...p, ai_credits_monthly: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Enabled Features (comma separated)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. AI Coach, InBody OCR, PineLabs POS"
                  value={createForm.features}
                  onChange={(e) => setCreateForm((p) => ({ ...p, features: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pop"
                  checked={createForm.is_popular}
                  onChange={(e) => setCreateForm((p) => ({ ...p, is_popular: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="pop" className="text-slate-700 font-bold cursor-pointer">
                  Mark as "Most Popular"
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary py-2 px-4 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary py-2 px-4 font-bold">
                  {creating ? 'Saving...' : 'Create SaaS Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
