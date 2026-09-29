import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Search,
  RefreshCw,
  Download,
  Phone,
  Mail,
  UserCheck,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  IndianRupee,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  interest: string;
  assignedTrainer: string;
  status: string;
  stage: string;
  probability: number;
  deal_value: number;
  notes?: string;
  lastFollowUp?: string;
  created_at?: string;
}

interface LeadsManagementProps {
  onStartCall?: (lead: LeadItem) => void;
}

export function LeadsManagement({ onStartCall }: LeadsManagementProps) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  // Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: '',
    interest: '',
    assigned_trainer: '',
    stage: 'Prospecting',
    probability: 50,
    deal_value: 0,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<LeadItem[]>('/crm/leads');
      setLeads(res || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) {
      triggerToast('⚠️ Please provide lead name and phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/crm/leads', newLead);
      triggerToast('✅ Lead captured and added to sales pipeline!');
      setAddModalOpen(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        source: '',
        interest: '',
        assigned_trainer: '',
        stage: 'Prospecting',
        probability: 50,
        deal_value: 0,
        notes: '',
      });
      fetchLeads();
    } catch {
      triggerToast('❌ Error creating lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStage: string) => {
    try {
      await apiClient.put(`/crm/leads/${leadId}`, { stage: newStage });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      );
      triggerToast(`✅ Lead stage updated to ${newStage}`);
    } catch {
      triggerToast('❌ Error updating lead stage.');
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (sourceFilter !== 'All' && lead.source !== sourceFilter) return false;
    if (stageFilter !== 'All' && lead.stage !== stageFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        lead.interest.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalValue = leads.reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const avgProb = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.probability || 0), 0) / leads.length) : 0;

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
              Inbound Leads & Prospect Roster
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {leads.length} Active Leads
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Omnichannel lead capture with instant AI score, deal value forecasting, and 1-click calling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-navy-100 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'list' ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-navy-500 hover:text-navy-900'
              }`}
            >
              <ListIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition ${
                viewMode === 'grid' ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-navy-500 hover:text-navy-900'
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <button
            onClick={fetchLeads}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95"
          >
            <Plus size={14} /> Add New Lead
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL LEADS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">{leads.length}</span>
              <span className="text-[11px] font-bold text-emerald-600">Live CRM</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Inbound & Meta Campaigns</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Target size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">PIPELINE VALUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalValue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Expected</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Sum of all prospect deals</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">AVG WIN PROBABILITY</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">{avgProb}%</span>
              <span className="text-[11px] font-bold text-purple-600">AI Confidence</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Weighted qualification</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">CONVERTED / TRIAL</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                {leads.filter((l) => ['Trial Pass', 'Negotiation', 'Closed Won'].includes(l.stage)).length}
              </span>
              <span className="text-[11px] font-bold text-amber-600">Warm Prospects</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Scheduled for gym walk-ins</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search lead name, phone, email, fitness goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">⚡ All Lead Sources</option>
          <option value="Instagram Ad">Instagram Ad</option>
          <option value="Google Ads">Google Ads</option>
          <option value="Walk-In">Walk-In</option>
          <option value="Website Consultation">Website Consultation</option>
          <option value="Referral">Referral</option>
        </select>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">🎯 All Stages</option>
          <option value="Prospecting">Prospecting</option>
          <option value="Qualification">Qualification</option>
          <option value="Trial Pass">Trial Pass</option>
          <option value="Negotiation">Negotiation</option>
          <option value="Closed Won">Closed Won</option>
          <option value="Closed Lost">Closed Lost</option>
        </select>
      </div>

      {/* Leads Content View (List or Grid) */}
      {viewMode === 'list' ? (
        <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">PROSPECT / LEAD</th>
                  <th className="py-3.5 px-4">INTEREST & GOAL</th>
                  <th className="py-3.5 px-4">SOURCE</th>
                  <th className="py-3.5 px-4">STAGE & PROBABILITY</th>
                  <th className="py-3.5 px-4">DEAL VALUE</th>
                  <th className="py-3.5 px-4">COACH ASSIGNED</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-navy-400 text-xs">
                      No leads found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stageColors: Record<string, string> = {
                      Prospecting: 'bg-navy-50 text-navy-700 border-navy-200',
                      Qualification: 'bg-blue-50 text-blue-700 border-blue-200',
                      'Trial Pass': 'bg-amber-50 text-amber-700 border-amber-200',
                      Negotiation: 'bg-purple-50 text-purple-700 border-purple-200',
                      'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      'Closed Lost': 'bg-red-50 text-red-700 border-red-200',
                    };

                    return (
                      <tr key={lead.id} className="hover:bg-navy-50/50 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-navy-900 block">{lead.name}</span>
                          <span className="text-[11px] text-navy-500">{lead.phone}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-navy-800 block">{lead.interest}</span>
                          <span className="text-[10px] text-navy-400 font-medium">Follow-up: {lead.lastFollowUp || 'Today'}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-navy-100 text-navy-700 text-[10px] font-bold">
                            {lead.source}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={lead.stage}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border outline-none cursor-pointer ${stageColors[lead.stage] || 'bg-navy-50 text-navy-700'}`}
                            >
                              <option value="Prospecting">Prospecting</option>
                              <option value="Qualification">Qualification</option>
                              <option value="Trial Pass">Trial Pass</option>
                              <option value="Negotiation">Negotiation</option>
                              <option value="Closed Won">Closed Won</option>
                              <option value="Closed Lost">Closed Lost</option>
                            </select>
                            <span className="text-[11px] font-bold text-purple-600">{lead.probability}%</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-black text-navy-900">₹{(lead.deal_value || 0).toLocaleString()}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-navy-700 font-semibold">{lead.assignedTrainer || 'Head Coach'}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onStartCall?.(lead)}
                            className="p-2 rounded-xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-600 transition shadow-sm"
                            title="Start AI Call"
                          >
                            <Phone size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm hover:shadow-md hover:border-brand-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-black text-sm text-navy-900">{lead.name}</h4>
                  <p className="text-xs text-navy-500">{lead.phone}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-50 text-brand-700 border border-brand-200">
                  {lead.source}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-navy-50/70 space-y-1">
                <span className="text-[10px] font-bold text-navy-400 uppercase block">Fitness Goal / Interest</span>
                <p className="text-xs font-semibold text-navy-800">{lead.interest}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-navy-100 text-xs">
                <div>
                  <span className="text-[10px] text-navy-400 block font-bold">Deal Value</span>
                  <span className="font-black text-navy-900">₹{(lead.deal_value || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 block font-bold">Probability</span>
                  <span className="font-bold text-purple-600">{lead.probability}%</span>
                </div>
                <button
                  type="button"
                  onClick={() => onStartCall?.(lead)}
                  className="px-3 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-600/20 hover:bg-brand-700 transition"
                >
                  <Phone size={12} /> Call
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Lead Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Target size={16} className="text-brand-600" />
                Add Inbound Lead
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Lead Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+91 98490 12345"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Lead Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="Instagram Ad">Instagram Ad</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Walk-In">Walk-In</option>
                    <option value="Website Consultation">Website Consultation</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Target Interest</label>
                  <select
                    value={newLead.interest}
                    onChange={(e) => setNewLead({ ...newLead, interest: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="Weight Loss & Transformation">Weight Loss & Transformation</option>
                    <option value="Muscle Building & Strength">Muscle Building & Strength</option>
                    <option value="1-on-1 Personal Training">1-on-1 Personal Training</option>
                    <option value="Corporate Wellness Pass">Corporate Wellness Pass</option>
                    <option value="General Gym Membership">General Gym Membership</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Estimated Deal Value (₹)</label>
                  <input
                    type="number"
                    value={newLead.deal_value}
                    onChange={(e) => setNewLead({ ...newLead, deal_value: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Win Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newLead.probability}
                    onChange={(e) => setNewLead({ ...newLead, probability: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Notes & Consultation Background</label>
                <textarea
                  rows={2}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Notes from initial contact..."
                  className="w-full p-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 outline-none"
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
                  {submitting ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
