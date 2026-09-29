import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Eye,
  MousePointerClick,
  IndianRupee,
  Target,
  ExternalLink,
  Filter,
  Sparkles,
  Calendar,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface AdItem {
  id: string;
  headline: string;
  prompt: string;
  aspect_ratio: string;
  model_used: string;
  image_url?: string;
  caption?: string;
  target_audience?: string;
  status: string;
  platform?: string;
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  leads_generated?: number;
  meta_campaign_id?: string;
  created_at?: string;
}

export function AdPostHistory() {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AdItem[]>('/crm/ads');
      setAds(res || []);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const filteredAds = ads.filter((ad) => {
    if (statusFilter !== 'All' && ad.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ad.headline.toLowerCase().includes(q) ||
        (ad.prompt && ad.prompt.toLowerCase().includes(q)) ||
        (ad.platform && ad.platform.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-navy-900 tracking-tight">
              Ad Post History & Campaign Archives
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {ads.length} Campaigns Logged
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Track past creative assets, AI prompts, budget allocation, click-through rates, and lead yields.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAds}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh History
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search campaign headline, prompt, platform..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">⚡ All Statuses</option>
          <option value="Published">Published</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Draft">Draft</option>
          <option value="Paused">Paused</option>
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">CREATIVE & CAMPAIGN</th>
                <th className="py-3.5 px-4">PLATFORM & MODEL</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">SPENT / BUDGET</th>
                <th className="py-3.5 px-4">IMPRESSIONS & CLICKS</th>
                <th className="py-3.5 px-4">LEADS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
              {filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-navy-400 text-xs">
                    No marketing ad campaigns found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredAds.map((ad) => {
                  const statusColors: Record<string, string> = {
                    Published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
                    Draft: 'bg-navy-50 text-navy-700 border-navy-200',
                    Paused: 'bg-amber-50 text-amber-700 border-amber-200',
                  };

                  return (
                    <tr key={ad.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-navy-900 overflow-hidden flex-shrink-0 border border-navy-200">
                            {ad.image_url ? (
                              <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-navy-400">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-navy-900 block">{ad.headline}</span>
                            <span className="text-[11px] text-navy-400 truncate max-w-xs block">
                              {ad.prompt}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-800 block">{ad.platform || 'Meta / Instagram'}</span>
                        <span className="text-[11px] text-brand-600 font-semibold">{ad.model_used || 'Gemini Imagen'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusColors[ad.status] || 'bg-navy-50 text-navy-700'}`}>
                          {ad.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-900 block">₹{(ad.spent || 0).toLocaleString()}</span>
                        <span className="text-[11px] text-navy-400">of ₹{(ad.budget || 0).toLocaleString()}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-900 block">{(ad.impressions || 0).toLocaleString()} views</span>
                        <span className="text-[11px] text-purple-600 font-semibold">{(ad.clicks || 0).toLocaleString()} clicks ({ad.ctr || 0}%)</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-brand-700 font-black">
                          <Target size={13} />
                          <span>{ad.leads_generated || 0}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAd(ad)}
                          className="px-3 py-1.5 rounded-xl bg-navy-50 hover:bg-brand-50 hover:text-brand-600 border border-navy-200 text-xs font-bold transition"
                        >
                          View Details
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

      {/* Details Modal */}
      {selectedAd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Sparkles size={16} className="text-brand-600" />
                Campaign Asset Overview
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAd(null)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-navy-950 border border-navy-200">
                <img
                  src={selectedAd.image_url || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=60'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h4 className="text-base font-black text-navy-900">{selectedAd.headline}</h4>
                <p className="text-xs text-navy-600 mt-1">{selectedAd.caption || selectedAd.prompt}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-navy-50 text-center">
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Budget</span>
                  <span className="text-sm font-black text-navy-900">₹{(selectedAd.budget || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Impressions</span>
                  <span className="text-sm font-black text-navy-900">{(selectedAd.impressions || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Leads</span>
                  <span className="text-sm font-black text-brand-600">{selectedAd.leads_generated || 0}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedAd(null)}
                className="w-full py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
