import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointerClick,
  IndianRupee,
  Share2,
  Heart,
  MessageCircle,
  Instagram,
  Facebook,
  Youtube,
  RefreshCw,
  ExternalLink,
  Target,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Trash2,
  Plus,
  Send,
  CheckCircle2,
  Sliders,
  Flame,
  Activity
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface SocialPost {
  id: string;
  post_id?: string;
  platform: string;
  message: string;
  image_url?: string;
  permalink_url?: string;
  post_type: string;
  reactions: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  spend: number;
  leads_count: number;
  published_at?: string;
}

interface CampaignAd {
  id: string;
  headline: string;
  platform?: string;
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  leads_generated?: number;
  status?: string;
  image_url?: string;
}

interface SocialMediaDashboardProps {
  onNavigateToAdStudio?: () => void;
}

export function SocialMediaDashboard({ onNavigateToAdStudio }: SocialMediaDashboardProps) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [ads, setAds] = useState<CampaignAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, adsRes] = await Promise.all([
        apiClient.get<SocialPost[]>('/crm/social-posts').catch(() => []),
        apiClient.get<CampaignAd[]>('/crm/ads').catch(() => []),
      ]);
      setPosts(postsRes || []);
      setAds(adsRes || []);
    } catch {
      setPosts([]);
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLiveMetrics = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.post<any>('/crm/social-posts/sync');
      showNotification('success', res?.message || 'Live social metrics synced successfully!');
      fetchData();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to sync live metrics');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to remove this published post record?')) return;
    try {
      await apiClient.delete(`/crm/social-posts/${id}`);
      showNotification('info', 'Post removed from dashboard history.');
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete post');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0) + ads.reduce((sum, a) => sum + (a.impressions || 0), 0);
  const totalClicks = posts.reduce((sum, p) => sum + (p.clicks || 0), 0) + ads.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalSpend = posts.reduce((sum, p) => sum + (p.spend || 0), 0) + ads.reduce((sum, a) => sum + (a.spent || 0), 0);
  const totalLeads = posts.reduce((sum, p) => sum + (p.leads_count || 0), 0) + ads.reduce((sum, a) => sum + (a.leads_generated || 0), 0);
  const avgCtr = totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(2) : '0.00';
  const roasLabel = totalSpend > 0 ? `${(totalLeads > 0 ? (totalLeads * 1200 / totalSpend).toFixed(1) : '0.0')}x ROAS` : '0.0x ROAS';

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatform !== 'All' && !p.platform.toLowerCase().includes(selectedPlatform.toLowerCase())) return false;
    if (selectedType !== 'All' && p.post_type.toLowerCase() !== selectedType.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
          notification.type === 'success' ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40' :
          notification.type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-500/40' :
          'bg-slate-900 text-cyan-200 border-cyan-500/40'
        }`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Social Media & Campaign Analytics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black flex items-center gap-1">
              <Activity size={12} /> Live Multi-Channel Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time engagement, organic post reach, sponsored ad performance, and inbound lead attribution across Meta, 𝕏 & YouTube.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncLiveMetrics}
            disabled={syncing}
            className="px-4 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Live Metrics'}
          </button>

          <button
            type="button"
            onClick={fetchData}
            className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL REACH / IMPRESSIONS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalReach.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">{totalReach > 0 ? 'Live Engagement' : '0% Active'}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Across IG, FB, 𝕏 & YT</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Eye size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL ENGAGEMENTS & CLICKS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalClicks.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-purple-600">Avg CTR {avgCtr}%</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Clicks, Shares & Comments</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <MousePointerClick size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL AD SPEND</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">₹{totalSpend.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">{roasLabel}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Meta & Multi-Channel Paid Ads</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">LEADS ACQUIRED</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalLeads}</span>
              <span className="text-[11px] font-bold text-amber-600">Direct CRM Sync</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Cost / Lead: ₹{totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Target size={20} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform:</span>
          {['All', 'Instagram', 'Facebook', 'Twitter', 'YouTube'].map((plat) => (
            <button
              key={plat}
              type="button"
              onClick={() => setSelectedPlatform(plat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedPlatform === plat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              {plat === 'Twitter' ? '𝕏 Twitter' : plat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type:</span>
          {['All', 'Organic', 'Sponsored'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedType === t
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Posts & Campaigns Grid */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 bg-white border border-slate-200/80 rounded-3xl text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <BarChart3 size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-900">No Social Posts or Campaigns Active</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven't published or synced any social media posts yet. Use the <strong>AI Ad Pipeline Studio</strong> to design and publish your first multi-platform campaign.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col group"
            >
              {/* Image Banner */}
              <div className="h-48 bg-slate-950 relative overflow-hidden flex-shrink-0">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt="Post banner"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                    <ImageIcon size={32} className="opacity-40 mb-1" />
                    <span className="text-[10px] font-bold uppercase">Social Media Post</span>
                  </div>
                )}

                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-extrabold rounded-full border border-white/20">
                  {post.platform.toLowerCase().includes('instagram') ? (
                    <Instagram size={12} className="text-pink-400" />
                  ) : post.platform.toLowerCase().includes('youtube') ? (
                    <Youtube size={12} className="text-red-400" />
                  ) : post.platform.toLowerCase().includes('twitter') || post.platform.toLowerCase().includes('x') ? (
                    <span className="text-sky-400 font-bold">𝕏</span>
                  ) : (
                    <Facebook size={12} className="text-blue-400" />
                  )}
                  <span>{post.platform} • {post.post_type}</span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {post.permalink_url && (
                    <a
                      href={post.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-indigo-600 transition"
                      title="Open Live Post"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 bg-black/60 backdrop-blur-md text-rose-300 hover:text-white rounded-lg hover:bg-rose-600 transition"
                    title="Remove from Dashboard"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-3 leading-relaxed">
                    {post.message}
                  </p>
                  {post.published_at && (
                    <p className="text-[10px] text-slate-400 font-medium mt-2">
                      Published {new Date(post.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Engagement Stats Grid */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-800">
                      <Heart size={12} className="text-rose-500 fill-rose-500" />
                      <span>{post.likes || 0}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Likes</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-800">
                      <MessageCircle size={12} className="text-blue-500" />
                      <span>{post.comments || 0}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Comments</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-800">
                      <Share2 size={12} className="text-emerald-500" />
                      <span>{post.shares || 0}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Shares</span>
                  </div>

                  <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center justify-center gap-1 text-[11px] font-black text-indigo-700">
                      <Target size={12} />
                      <span>{post.leads_count || 0}</span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase">Leads</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
