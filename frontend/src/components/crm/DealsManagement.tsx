import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  RefreshCw,
  IndianRupee,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sparkles,
  Award,
  Calendar,
  Layers,
  Flame,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface DealItem {
  id: string;
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
}

export function DealsManagement() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<DealItem[]>('/crm/opportunities');
      setDeals(res || []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const updateDealStage = async (id: string, stage: string) => {
    try {
      await apiClient.put(`/crm/opportunities/${id}`, { stage });
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
      triggerToast(`🎉 Deal marked as ${stage}!`);
    } catch {
      triggerToast('❌ Error updating deal.');
    }
  };

  const filteredDeals = deals.filter((deal) => {
    if (stageFilter === 'Won' && deal.stage !== 'Closed Won') return false;
    if (stageFilter === 'Lost' && deal.stage !== 'Closed Lost') return false;
    if (stageFilter === 'Active' && ['Closed Won', 'Closed Lost'].includes(deal.stage)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        deal.name.toLowerCase().includes(q) ||
        (deal.customer_name && deal.customer_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalWon = deals
    .filter((d) => d.stage === 'Closed Won')
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalActive = deals
    .filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.amount || 0), 0);
  const avgDealSize = deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + (d.amount || 0), 0) / deals.length) : 0;

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
              High-Value Deals & Closings
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black flex items-center gap-1">
              <Flame size={12} className="text-amber-500 fill-amber-500" /> Live Revenue Tracker
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Monitor large-ticket corporate wellness, annual multi-pass, and VIP transformation packages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDeals}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">ACTIVE DEAL PIPELINE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalActive.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-brand-600">Open</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">In active negotiation</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Tag size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">CLOSED WON REVENUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalWon.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Converted</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Total finalized contracts</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">AVG DEAL VALUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{avgDealSize.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-purple-600">Per Account</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Across all high-ticket deals</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">WIN RATIO</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                {deals.length > 0 ? Math.round((deals.filter((d) => d.stage === 'Closed Won').length / deals.length) * 100) : 0}%
              </span>
              <span className="text-[11px] font-bold text-emerald-600">Close Rate</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Historical conversion</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['All', 'Active', 'Won', 'Lost'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStageFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                stageFilter === filter
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-navy-50 hover:bg-navy-100 text-navy-700'
              }`}
            >
              {filter} Deals
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Deals Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDeals.map((deal) => {
          const isWon = deal.stage === 'Closed Won';
          const isLost = deal.stage === 'Closed Lost';

          return (
            <div
              key={deal.id}
              className={`p-6 bg-white border rounded-3xl shadow-sm transition-all space-y-4 ${
                isWon
                  ? 'border-emerald-200 bg-emerald-50/10'
                  : isLost
                  ? 'border-red-200 bg-red-50/10'
                  : 'border-navy-100 hover:border-brand-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-sm text-navy-900">{deal.name}</h4>
                  <p className="text-xs text-navy-500 font-medium">{deal.customer_name || 'Individual VIP'}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                    isWon
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isLost
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-brand-50 text-brand-700 border-brand-200'
                  }`}
                >
                  {deal.stage}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-navy-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Deal Value</span>
                  <span className="text-lg font-black text-navy-900">₹{(deal.amount || 0).toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Probability</span>
                  <span className="text-sm font-bold text-purple-600">{deal.probability || 50}%</span>
                </div>
              </div>

              {deal.next_step && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">Next Step:</span>
                  <p className="text-xs text-navy-800 font-medium">{deal.next_step}</p>
                </div>
              )}

              {/* Quick Action Footer */}
              {!isWon && !isLost ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-navy-100">
                  <button
                    type="button"
                    onClick={() => updateDealStage(deal.id, 'Closed Won')}
                    className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1 transition"
                  >
                    <CheckCircle2 size={14} /> Won
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDealStage(deal.id, 'Closed Lost')}
                    className="py-2 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-700 font-bold text-xs border border-red-200 flex items-center justify-center gap-1 transition"
                  >
                    <XCircle size={14} /> Lost
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-navy-100 text-center">
                  <span className="text-[11px] font-bold text-navy-400">
                    Deal Status Finalized ({deal.stage})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
