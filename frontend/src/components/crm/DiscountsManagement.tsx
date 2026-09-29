import React, { useState, useEffect } from 'react';
import {
  Percent,
  Plus,
  Search,
  RefreshCw,
  Tag,
  Calendar,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Sparkles,
  Scissors,
  Check,
  X,
  Layers,
  Flame
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface DiscountItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  discount_type: string; // percentage, fixed_amount, bogo, bundle
  value: number;
  min_order_value?: number;
  max_discount?: number;
  applicable_scope?: string;
  applicable_tiers?: string[];
  usage_limit?: number;
  used_count: number;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  created_at?: string;
}

export function DiscountsManagement() {
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Interactive Validator Sandbox
  const [testCode, setTestCode] = useState('FIT20');
  const [testAmount, setTestAmount] = useState(25000);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    discount_amount: number;
    final_amount: number;
    message?: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  // Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [discountForm, setDiscountForm] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'percentage',
    value: 0,
    min_order_value: 0,
    max_discount: 0,
    usage_limit: 0,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<DiscountItem[]>('/crm/discounts');
      setDiscounts(res || []);
    } catch {
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleValidateCoupon = async () => {
    if (!testCode) return;
    setValidating(true);
    try {
      const res = await apiClient.post<{
        valid: boolean;
        discount_amount: number;
        final_amount: number;
        message?: string;
      }>('/crm/discounts/validate', {
        code: testCode,
        order_amount: testAmount,
      });
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        discount_amount: 0,
        final_amount: testAmount,
        message: 'Invalid or expired coupon code',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountForm.name || !discountForm.code) {
      triggerToast('⚠️ Please enter coupon name and code.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/crm/discounts', {
        ...discountForm,
        code: discountForm.code.toUpperCase().trim(),
      });
      triggerToast('✅ Promotional discount created successfully!');
      setAddModalOpen(false);
      setDiscountForm({
        name: '',
        code: '',
        description: '',
        discount_type: 'percentage',
        value: 0,
        min_order_value: 0,
        max_discount: 0,
        usage_limit: 0,
        is_active: true,
      });
      fetchDiscounts();
    } catch {
      triggerToast('❌ Error creating discount code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await apiClient.put(`/crm/discounts/${id}`, { is_active: !current });
      setDiscounts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: !current } : d))
      );
      triggerToast(`✅ Discount code ${!current ? 'activated' : 'paused'}!`);
    } catch {
      triggerToast('❌ Error updating discount.');
    }
  };

  const filteredDiscounts = discounts.filter((d) => {
    if (typeFilter !== 'All' && d.discount_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-navy-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 border border-navy-700 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-navy-900 tracking-tight">
              Discounts, Coupons & Loyalty Promotions
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {discounts.length} Active Vouchers
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Configure percentage, flat-cash, BOGO and personal training bundle codes with minimum order constraints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDiscounts}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95"
          >
            <Plus size={14} /> New Discount Coupon
          </button>
        </div>
      </div>

      {/* Live Coupon Simulator Sandbox */}
      <div className="p-5 bg-gradient-to-r from-navy-900 via-indigo-950 to-brand-950 text-white rounded-3xl shadow-lg border border-brand-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-400/30 text-[10px] font-extrabold flex items-center gap-1">
                <Scissors size={12} /> Live Coupon Calculator
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight">Interactive Coupon Validation Sandbox</h3>
            <p className="text-xs text-navy-300">
              Test your discount rules in real-time before releasing them to members.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="e.g. SUMMER20"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value.toUpperCase())}
              className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white placeholder-navy-400 outline-none focus:ring-2 focus:ring-brand-400 w-36 uppercase"
            />
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white">
              <span>₹</span>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="bg-transparent w-20 text-xs font-bold outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleValidateCoupon}
              disabled={validating}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-brand-500/20"
            >
              <Sparkles size={14} className={validating ? 'animate-spin' : ''} />
              <span>Validate</span>
            </button>
          </div>
        </div>

        {validationResult && (
          <div className="mt-4 p-3.5 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              )}
              <span className="font-semibold text-white">
                {validationResult.message || (validationResult.valid ? 'Coupon Applied Successfully!' : 'Coupon Not Applicable')}
              </span>
            </div>

            {validationResult.valid && (
              <div className="flex items-center gap-4 text-xs">
                <span>Discount: <strong className="text-emerald-400">-₹{validationResult.discount_amount.toLocaleString()}</strong></span>
                <span>Final Price: <strong className="text-amber-300 font-black">₹{validationResult.final_amount.toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search coupon code (e.g. SUMMER20, FIT2000), campaign name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">⚡ All Discount Types</option>
          <option value="percentage">Percentage (%)</option>
          <option value="fixed_amount">Fixed Cash (₹)</option>
          <option value="bogo">BOGO (Buy 1 Get 1)</option>
          <option value="bundle">Product Bundle</option>
        </select>
      </div>

      {/* Discounts Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">COUPON CODE & NAME</th>
                <th className="py-3.5 px-4">DISCOUNT VALUE</th>
                <th className="py-3.5 px-4">MIN ORDER & CAP</th>
                <th className="py-3.5 px-4">USAGE LIMIT</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-navy-400 text-xs">
                    No promo codes found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-navy-50/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 font-mono font-black text-xs">
                          {d.code}
                        </span>
                        <div>
                          <span className="font-bold text-navy-900 block">{d.name}</span>
                          <span className="text-[11px] text-navy-500 line-clamp-1">{d.description}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-navy-900 text-sm">
                        {d.discount_type === 'percentage' ? `${d.value}% OFF` : `₹${d.value.toLocaleString()} OFF`}
                      </span>
                      <span className="text-[10px] text-navy-400 block capitalize">{d.discount_type.replace('_', ' ')}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-navy-800 block">Min: ₹{(d.min_order_value || 0).toLocaleString()}</span>
                      {d.max_discount && (
                        <span className="text-[10px] text-navy-400">Max Cap: ₹{d.max_discount.toLocaleString()}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="font-bold text-navy-900 block">
                          {d.used_count || 0} / {d.usage_limit || '∞'} used
                        </span>
                        {d.usage_limit && (
                          <div className="w-20 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                            <div
                              className="h-full bg-brand-600 rounded-full"
                              style={{ width: `${Math.min(100, ((d.used_count || 0) / d.usage_limit) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          d.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-navy-100 text-navy-600 border-navy-200'
                        }`}
                      >
                        {d.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(d.id, d.is_active)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          d.is_active
                            ? 'bg-navy-50 hover:bg-red-50 hover:text-red-700 text-navy-700 border-navy-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {d.is_active ? 'Pause' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Discount Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Tag size={16} className="text-brand-600" />
                Create Promotional Discount Code
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDiscount} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Campaign / Promo Name *</label>
                  <input
                    type="text"
                    required
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                    placeholder="e.g. Diwali Mega Fitness Offer"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={discountForm.code}
                    onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DIWALI25"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-mono font-bold text-navy-900 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Discount Type</label>
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Cash (₹)</option>
                    <option value="bogo">BOGO (Buy 1 Get 1)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: Number(e.target.value) })}
                    placeholder={discountForm.discount_type === 'percentage' ? '20%' : '₹2000'}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Min. Order Value (₹)</label>
                  <input
                    type="number"
                    value={discountForm.min_order_value}
                    onChange={(e) => setDiscountForm({ ...discountForm, min_order_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    value={discountForm.max_discount}
                    onChange={(e) => setDiscountForm({ ...discountForm, max_discount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Total Redemptions Allowed</label>
                <input
                  type="number"
                  value={discountForm.usage_limit}
                  onChange={(e) => setDiscountForm({ ...discountForm, usage_limit: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Description & Restrictions</label>
                <textarea
                  rows={2}
                  value={discountForm.description}
                  onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                  placeholder="e.g. Valid on 6-month & annual plans for new members only."
                  className="w-full p-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
