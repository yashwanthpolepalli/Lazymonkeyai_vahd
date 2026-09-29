import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Filter,
  UserCheck
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface OpportunityItem {
  id: string;
  lead_id?: string;
  customer_id?: string;
  name: string;
  customer_name?: string;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date?: string;
  assigned_to?: string;
  next_step?: string;
  forecast_category?: string;
  notes?: string;
  created_at?: string;
}

const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

export function OpportunitiesManagement() {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newOpp, setNewOpp] = useState({
    name: '',
    customer_name: '',
    amount: 0,
    probability: 50,
    stage: 'Prospecting',
    assigned_to: '',
    forecast_category: '',
    next_step: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOpps = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<OpportunityItem[]>('/crm/opportunities');
      setOpportunities(res || []);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpp.name) {
      triggerToast('⚠️ Please enter an opportunity name.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/crm/opportunities', newOpp);
      triggerToast('✅ Opportunity created and added to pipeline!');
      setAddModalOpen(false);
      setNewOpp({
        name: '',
        customer_name: '',
        amount: 0,
        probability: 50,
        stage: 'Prospecting',
        assigned_to: '',
        forecast_category: '',
        next_step: '',
        notes: '',
      });
      fetchOpps();
    } catch {
      triggerToast('❌ Error creating opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageChange = async (oppId: string, stage: string) => {
    try {
      await apiClient.put(`/crm/opportunities/${oppId}`, { stage });
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stage } : o))
      );
      triggerToast(`✅ Stage updated to ${stage}`);
    } catch {
      triggerToast('❌ Error updating stage.');
    }
  };

  const filteredOpps = opportunities.filter((opp) => {
    if (stageFilter !== 'All' && opp.stage !== stageFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        opp.name.toLowerCase().includes(q) ||
        (opp.customer_name && opp.customer_name.toLowerCase().includes(q)) ||
        (opp.assigned_to && opp.assigned_to.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalAmount = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const weightedForecast = opportunities.reduce(
    (sum, o) => sum + (o.amount || 0) * ((o.probability || 50) / 100),
    0
  );
  const wonAmount = opportunities
    .filter((o) => o.stage === 'Closed Won')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

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
              Opportunities & Revenue Pipeline
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {opportunities.length} Active Deals
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Track multi-tier memberships, corporate wellness contracts, and personal training packages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOpps}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95"
          >
            <Plus size={14} /> New Opportunity
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL PIPELINE VALUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalAmount.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Active</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Sum of all open stages</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">WEIGHTED FORECAST</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{Math.round(weightedForecast).toLocaleString()}</span>
              <span className="text-[11px] font-bold text-purple-600">Expected</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Adjusted for win probability</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">CLOSED WON REVENUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{wonAmount.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Realized</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Successfully converted</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">OPPORTUNITIES COUNT</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">{opportunities.length}</span>
              <span className="text-[11px] font-bold text-amber-600">In Play</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Across all team reps</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search opportunity title, client name, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">🎯 All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Opportunities List Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">OPPORTUNITY & CLIENT</th>
                <th className="py-3.5 px-4">AMOUNT</th>
                <th className="py-3.5 px-4">STAGE</th>
                <th className="py-3.5 px-4">PROBABILITY</th>
                <th className="py-3.5 px-4">NEXT ACTION</th>
                <th className="py-3.5 px-4">ASSIGNED REP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
              {filteredOpps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-navy-400 text-xs">
                    No opportunities found in this stage.
                  </td>
                </tr>
              ) : (
                filteredOpps.map((opp) => {
                  const stageStyles: Record<string, string> = {
                    Prospecting: 'bg-navy-50 text-navy-700 border-navy-200',
                    Qualification: 'bg-blue-50 text-blue-700 border-blue-200',
                    'Needs Analysis': 'bg-cyan-50 text-cyan-700 border-cyan-200',
                    'Value Proposition': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    Negotiation: 'bg-purple-50 text-purple-700 border-purple-200',
                    'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Closed Lost': 'bg-red-50 text-red-700 border-red-200',
                  };

                  return (
                    <tr key={opp.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-900 block">{opp.name}</span>
                        <span className="text-[11px] text-navy-500">{opp.customer_name || 'Individual Prospect'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-navy-900 text-sm">
                          ₹{(opp.amount || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={opp.stage}
                          onChange={(e) => handleStageChange(opp.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border outline-none cursor-pointer ${
                            stageStyles[opp.stage] || 'bg-navy-50 text-navy-700'
                          }`}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-navy-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full"
                              style={{ width: `${opp.probability || 50}%` }}
                            />
                          </div>
                          <span className="font-bold text-purple-600 text-[11px]">{opp.probability || 50}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-navy-800 text-[11px] font-semibold truncate block">
                          {opp.next_step || 'Follow-up consultation'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-navy-700 font-bold">{opp.assigned_to || 'Sales Head'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Opportunity Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Award size={16} className="text-brand-600" />
                Create Sales Opportunity
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOpp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Opportunity Title *</label>
                <input
                  type="text"
                  required
                  value={newOpp.name}
                  onChange={(e) => setNewOpp({ ...newOpp, name: e.target.value })}
                  placeholder="e.g. 50-Seat Corporate Wellness Membership"
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Client / Account Name</label>
                  <input
                    type="text"
                    value={newOpp.customer_name}
                    onChange={(e) => setNewOpp({ ...newOpp, customer_name: e.target.value })}
                    placeholder="e.g. TechCorp Solutions"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Deal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newOpp.amount}
                    onChange={(e) => setNewOpp({ ...newOpp, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Initial Stage</label>
                  <select
                    value={newOpp.stage}
                    onChange={(e) => setNewOpp({ ...newOpp, stage: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Win Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newOpp.probability}
                    onChange={(e) => setNewOpp({ ...newOpp, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Next Action Step</label>
                <input
                  type="text"
                  value={newOpp.next_step}
                  onChange={(e) => setNewOpp({ ...newOpp, next_step: e.target.value })}
                  placeholder="e.g. Schedule facility tour on Wednesday"
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
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
                  {submitting ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
