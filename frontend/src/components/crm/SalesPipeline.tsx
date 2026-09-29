import React, { useState, useEffect } from 'react';
import {
  KanbanSquare,
  Plus,
  RefreshCw,
  TrendingUp,
  IndianRupee,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  User,
  Flame
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface PipelineItem {
  id: string;
  name: string;
  customer_name?: string;
  stage: string;
  amount: number;
  probability: number;
  assigned_to?: string;
  next_step?: string;
}

const PIPELINE_COLUMNS = [
  { id: 'Prospecting', title: '1. Prospecting', color: 'border-t-brand-500 bg-brand-50/20' },
  { id: 'Qualification', title: '2. Qualification', color: 'border-t-blue-500 bg-blue-50/20' },
  { id: 'Needs Analysis', title: '3. Needs Analysis', color: 'border-t-cyan-500 bg-cyan-50/20' },
  { id: 'Value Proposition', title: '4. Proposal', color: 'border-t-indigo-500 bg-indigo-50/20' },
  { id: 'Negotiation', title: '5. Negotiation', color: 'border-t-purple-500 bg-purple-50/20' },
  { id: 'Closed Won', title: '6. Closed Won', color: 'border-t-emerald-500 bg-emerald-50/20' },
];

export function SalesPipeline() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PipelineItem[]>('/crm/opportunities');
      setItems(res || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const moveStage = async (id: string, currentStage: string, direction: 'forward' | 'backward') => {
    const currentIndex = PIPELINE_COLUMNS.findIndex((c) => c.id === currentStage);
    if (currentIndex === -1) return;

    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= PIPELINE_COLUMNS.length) return;

    const newStage = PIPELINE_COLUMNS[newIndex].id;

    try {
      await apiClient.put(`/crm/opportunities/${id}`, { stage: newStage });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, stage: newStage } : item)));
      triggerToast(`🚀 Deal moved to ${newStage}!`);
    } catch {
      triggerToast('❌ Failed to update deal stage.');
    }
  };

  const totalValue = items.reduce((sum, i) => sum + (i.amount || 0), 0);

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
              Sales Pipeline & Deal Flow Board
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              Total ₹{totalValue.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Interactive Kanban pipeline with stage velocity tracking and revenue conversion stages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPipeline}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Board
          </button>
        </div>
      </div>

      {/* Horizontal Multi-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((col, idx) => {
          const colDeals = items.filter((d) => d.stage === col.id);
          const colSum = colDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

          return (
            <div
              key={col.id}
              className={`p-4 bg-white border border-navy-100 rounded-3xl shadow-sm border-t-4 ${col.color} space-y-3 min-w-[240px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-navy-100 pb-2">
                <div>
                  <h3 className="font-black text-xs text-navy-900">{col.title}</h3>
                  <span className="text-[10px] text-navy-500 font-bold">
                    ₹{colSum.toLocaleString()}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 text-[10px] font-black">
                  {colDeals.length}
                </span>
              </div>

              {/* Deal Cards */}
              <div className="space-y-3 min-h-[160px]">
                {colDeals.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-navy-400 font-medium">
                    No active deals
                  </div>
                ) : (
                  colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3.5 bg-white border border-navy-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-300 transition-all space-y-2 group"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-navy-900 leading-tight line-clamp-2">
                          {deal.name}
                        </h4>
                        <span className="text-[10px] text-navy-500 font-medium block">
                          {deal.customer_name || 'Individual Prospect'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-black text-navy-900">
                          ₹{(deal.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-purple-600">
                          {deal.probability || 50}%
                        </span>
                      </div>

                      {/* Stage Transition Arrows */}
                      <div className="flex items-center justify-between pt-2 border-t border-navy-100">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveStage(deal.id, deal.stage, 'backward')}
                          className="p-1 rounded-lg hover:bg-navy-100 text-navy-500 disabled:opacity-20 transition"
                          title="Move to previous stage"
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <span className="text-[9px] font-bold text-navy-400">
                          {deal.assigned_to?.split(' ')[0] || 'Coach'}
                        </span>

                        <button
                          type="button"
                          disabled={idx === PIPELINE_COLUMNS.length - 1}
                          onClick={() => moveStage(deal.id, deal.stage, 'forward')}
                          className="p-1 rounded-lg hover:bg-brand-50 hover:text-brand-600 text-navy-500 disabled:opacity-20 transition"
                          title="Move to next stage"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
