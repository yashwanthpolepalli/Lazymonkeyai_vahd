import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { WhatsappCampaigns } from '@/components/crm/WhatsappCampaigns';
import { PushNotifications } from '@/components/crm/PushNotifications';

export interface CrmCallLog {
  id: string;
  contact_name: string;
  contact_type: string;
  phone: string;
  status: string;
  duration_formatted: string;
  duration_seconds: number;
  sentiment: string;
  qualification_score: number;
  ai_summary: string;
  action_items: string[];
  transcript?: string;
  audio_url?: string;
  created_at: string;
}

export interface MemberOption {
  id: string;
  name?: string;
  full_name?: string;
  phone?: string;
  membership?: string;
}

interface CommunicationHubProps {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  prefillContact?: { name: string; phone: string; objective?: string } | null;
}

export function CommunicationHub({
  activeSubTab,
  onSubTabChange,
  prefillContact,
}: CommunicationHubProps) {
  const { user } = useAuth();
  const currentGymName = user?.gymName || (user as any)?.gym_name || 'Fit Club';

  const [calls, setCalls] = useState<CrmCallLog[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContactType, setFilterContactType] = useState('All Contact Types');
  const [filterStatus, setFilterStatus] = useState('All Statuses');
  const [filterTime, setFilterTime] = useState('All Time');
  const [filterSentiment, setFilterSentiment] = useState('All Sentiments');

  // AI Calling Modal
  const [newCallModalOpen, setNewCallModalOpen] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'dialing' | 'connected' | 'completed'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callForm, setCallForm] = useState({
    contact_name: '',
    phone: '',
    contact_type: 'LEAD',
    objective: 'Membership Consultation & VIP Trial Pass',
    voice_persona: `${currentGymName} AI Assistant`,
  });

  // Transcript Modal
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [selectedCallLog, setSelectedCallLog] = useState<CrmCallLog | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Broadcast Campaigns State
  const [broadcastChannel, setBroadcastChannel] = useState<'email' | 'sms' | 'whatsapp' | 'push'>('email');
  const [campaignForm, setCampaignForm] = useState({
    targetAudience: 'All Active Members',
    subject: 'Exclusive Announcements & Member Updates',
    message: `Hey {member_name}! Stay on track with your fitness goals at ${currentGymName}. Check out our latest schedule and reserve your workout sessions on the member portal!`,
    senderId: currentGymName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'FITCLUB',
    deepLink: '/app/workouts',
    enableSound: true,
  });
  const [broadcasting, setBroadcasting] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CrmCallLog[]>('/crm/calls');
      setCalls(Array.isArray(res) ? res : []);
    } catch (_err) {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await apiClient.get<MemberOption[]>('/members');
      setMembers(Array.isArray(res) ? res : []);
    } catch (_err) {
      setMembers([]);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (prefillContact) {
      setCallForm((prev) => ({
        ...prev,
        contact_name: prefillContact.name || '',
        phone: prefillContact.phone || '',
        objective: prefillContact.objective || prev.objective,
      }));
      setNewCallModalOpen(true);
    }
  }, [prefillContact]);

  // Timer simulation for active call
  useEffect(() => {
    let interval: any;
    if (callingState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callingState]);

  // Start Call Handler
  const handleStartCall = async () => {
    if (!callForm.phone.trim() || !callForm.contact_name.trim()) {
      triggerToast('Please provide contact name and phone number');
      return;
    }

    setCallingState('dialing');
    setTimeout(() => {
      setCallingState('connected');
    }, 1500);

    try {
      setTimeout(async () => {
        const res = await apiClient.post<any>('/crm/calls/trigger', callForm);
        setCallingState('completed');
        setTimeout(() => {
          setNewCallModalOpen(false);
          setCallingState('idle');
          fetchCalls();
          triggerToast('🎉 AI Voice consultation call logged successfully!');
        }, 1200);
      }, 4500);
    } catch (_err) {
      setCallingState('idle');
      triggerToast('Failed to connect AI Voice Agent call');
    }
  };

  const handleDeleteCall = async (id: string) => {
    if (!window.confirm('Delete this AI call record?')) return;
    try {
      await apiClient.delete(`/crm/calls/${id}`);
      setCalls((prev) => prev.filter((c) => c.id !== id));
      triggerToast('Call log deleted');
    } catch (_err) {
      triggerToast('Failed to delete call log');
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (calls.length === 0) {
      triggerToast('No call logs available to export');
      return;
    }
    const headers = ['ID', 'Contact Name', 'Phone', 'Type', 'Status', 'Duration', 'Sentiment', 'AI Score', 'Created At'];
    const rows = calls.map((c) => [
      c.id,
      `"${c.contact_name}"`,
      `"${c.phone}"`,
      c.contact_type,
      c.status,
      c.duration_formatted,
      c.sentiment,
      c.qualification_score,
      `"${c.created_at}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const filePrefix = currentGymName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filePrefix}_crm_calls_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('CSV Exported successfully!');
  };

  // Broadcast Handler
  const handleSendBroadcast = async (channel: 'email' | 'sms' | 'whatsapp' | 'push') => {
    setBroadcasting(true);
    try {
      const res = await apiClient.post<any>('/crm/campaigns/broadcast', {
        channel,
        target_audience: campaignForm.targetAudience,
        subject: campaignForm.subject,
        message: campaignForm.message,
      });
      triggerToast(res?.message || `🚀 ${channel.toUpperCase()} broadcast sent successfully!`);
    } catch (_err) {
      triggerToast(`Failed to send ${channel.toUpperCase()} campaign`);
    } finally {
      setBroadcasting(false);
    }
  };

  // Filtered Calls
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      const matchSearch =
        searchQuery === '' ||
        c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ai_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType =
        filterContactType === 'All Contact Types' ||
        c.contact_type.toLowerCase() === filterContactType.toLowerCase();

      const matchStatus =
        filterStatus === 'All Statuses' ||
        c.status.toLowerCase() === filterStatus.toLowerCase();

      const matchSentiment =
        filterSentiment === 'All Sentiments' ||
        c.sentiment.toLowerCase() === filterSentiment.toLowerCase();

      return matchSearch && matchType && matchStatus && matchSentiment;
    });
  }, [calls, searchQuery, filterContactType, filterStatus, filterSentiment]);

  // Metric Computations
  const totalCallsCount = calls.length;
  const totalSeconds = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const avgSeconds = totalCallsCount > 0 ? Math.floor(totalSeconds / totalCallsCount) : 0;
  const avgM = Math.floor(avgSeconds / 60);
  const avgS = avgSeconds % 60;
  const avgDurationFormatted = `${avgM}m ${avgS < 10 ? '0' : ''}${avgS}s`;

  const positiveCallsCount = calls.filter((c) => (c.sentiment || '').toLowerCase() === 'positive').length;
  const positiveSentimentPct = totalCallsCount > 0 ? Math.round((positiveCallsCount / totalCallsCount) * 100) : 0;

  const totalScore = calls.reduce((acc, c) => acc + (c.qualification_score || 0), 0);
  const avgAiScore = totalCallsCount > 0 ? Math.round(totalScore / totalCallsCount) : 0;

  // Dedicated View: WhatsApp Campaigns
  if (activeSubTab === 'whatsapp_campaigns') {
    return <WhatsappCampaigns />;
  }

  // Dedicated View: Push Notifications & Broadcast Studio
  if (activeSubTab === 'push_notifications') {
    return <PushNotifications />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-navy-950/95 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-brand-500/40 flex items-center gap-2.5 animate-slide-in">
          <Icon name="sparkles" size={16} className="text-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER: Exact match to Screenshot 2                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Icon name="headphones" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-navy-900 tracking-tight">Communication & AI Voice Logs</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-600 border border-brand-200">
                {totalCallsCount} Total Calls
              </span>
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              Full communication analytics, voice transcripts, qualification scores & CSV export.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition active:scale-95"
          >
            <Icon name="download" size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchCalls}
            className="p-2.5 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 shadow-sm transition active:scale-95"
            title="Refresh calls"
          >
            <Icon name="refresh-cw" size={15} />
          </button>

          <button
            onClick={() => setNewCallModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-2 transition hover:scale-[1.02] active:scale-95"
          >
            <Icon name="phone" size={15} />
            <span>Start AI Call</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 4 STAT METRIC CARDS: Exact match to Screenshot 2          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls Logged */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL CALLS LOGGED</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-navy-900">{totalCallsCount}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span>↗</span> Live DB Data
            </span>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="phone" size={18} />
          </div>
        </div>

        {/* Avg Duration */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">AVG DURATION</span>
            <span className="text-3xl font-black text-navy-900">{avgDurationFormatted}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block">Per Consultation</span>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="clock" size={18} />
          </div>
        </div>

        {/* Positive Sentiment */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">POSITIVE SENTIMENT</span>
            <span className="text-3xl font-black text-navy-900">{positiveSentimentPct}%</span>
            <span className="text-[11px] text-brand-600 font-semibold block">Interest Rate</span>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="sparkles" size={18} />
          </div>
        </div>

        {/* Avg AI Score */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">AVG AI SCORE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-navy-900">{avgAiScore}</span>
              <span className="text-sm font-bold text-navy-400">/100</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block">Qualification Score</span>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="award" size={18} />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CAMPAIGNS TABS: Email, SMS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {['email_campaigns', 'sms_campaigns'].includes(activeSubTab) && (
        <div className="card p-6 sm:p-7 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <div>
              <h3 className="text-base font-black text-navy-900 capitalize">
                {activeSubTab.replace('_', ' ')} Broadcast Dispatcher
              </h3>
              <p className="text-xs text-navy-400 mt-0.5">
                Send targeted omnichannel broadcasts with custom personalization tags
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-600 uppercase tracking-wider">
              Omnichannel CRM
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Audience Segment</label>
                <select
                  value={campaignForm.targetAudience}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="All Active Members">All Active Members ({members.length})</option>
                  <option value="Members Expiring within 7 Days">Members Expiring in 7 Days</option>
                  <option value="Inactive Members (Over 14 Days)">Inactive Members (Over 14 Days)</option>
                  <option value="VIP Annual Plan Holders">VIP Annual Plan Holders</option>
                  <option value="Prospective Leads & Inquiries">Prospective Leads & Inquiries</option>
                </select>
              </div>

              {activeSubTab === 'email_campaigns' && (
                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-navy-700">Message Content</label>
                  <div className="flex items-center gap-1 text-[10px] text-navy-400 font-mono">
                    <span className="bg-navy-50 px-1.5 py-0.5 rounded">{"{member_name}"}</span>
                    <span className="bg-navy-50 px-1.5 py-0.5 rounded">{"{plan_name}"}</span>
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={campaignForm.message}
                  onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-[11px]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignForm((prev) => ({
                      ...prev,
                      subject: 'Membership Renewal Notice',
                      message: `Reminder: Your ${currentGymName} membership is due for renewal soon. Renew today to maintain your unlimited gym access!`,
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-navy-100 hover:bg-navy-200 text-[11px] font-bold text-navy-700 transition"
                >
                  ⚡ Renewal Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCampaignForm((prev) => ({
                      ...prev,
                      subject: 'Special Workout Pass',
                      message: `Special Guest Pass: Bring a workout partner this week for a complimentary session at ${currentGymName}!`,
                    }));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-navy-100 hover:bg-navy-200 text-[11px] font-bold text-navy-700 transition"
                >
                  ⚡ Buddy Pass Template
                </button>
              </div>

              <button
                type="button"
                disabled={broadcasting}
                onClick={() =>
                  handleSendBroadcast(
                    activeSubTab === 'email_campaigns'
                      ? 'email'
                      : activeSubTab === 'sms_campaigns'
                      ? 'sms'
                      : activeSubTab === 'whatsapp_campaigns'
                      ? 'whatsapp'
                      : 'push'
                  )
                }
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <Icon name="send" size={16} />
                <span>
                  {broadcasting ? 'Broadcasting Batch...' : `Send ${activeSubTab.replace('_', ' ').toUpperCase()} Broadcast`}
                </span>
              </button>
            </div>

            {/* Live Visual Preview */}
            <div className="card p-5 bg-navy-900 text-white rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] font-mono text-navy-400 uppercase tracking-wider">
                    {activeSubTab.replace('_', ' ')} Live Simulator
                  </span>
                </div>

                <div className="bg-navy-950/80 p-4 rounded-xl border border-navy-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-navy-400">
                    <span>From: {currentGymName.toUpperCase()} Verified</span>
                    <span>Just Now</span>
                  </div>
                  {activeSubTab === 'email_campaigns' && (
                    <h4 className="text-xs font-bold text-brand-400">{campaignForm.subject}</h4>
                  )}
                  <p className="text-xs text-navy-200 whitespace-pre-line leading-relaxed">
                    {campaignForm.message
                      .replace('{member_name}', members[0]?.name || members[0]?.full_name || 'Member')
                      .replace('{plan_name}', members[0]?.membership || 'All-Access Pass')}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-navy-400 font-mono flex items-center justify-between">
                <span>Audience: {campaignForm.targetAudience}</span>
                <span className="text-emerald-400 font-bold">100% Delivery SLA</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. AI CALL LOGS & DIALER (Main View): Matches Screenshot 2   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'ai_call_logs' && (
        <div className="space-y-4">
          {/* Search & 4 Filters Bar: Exact match to Screenshot 2 */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Icon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
              />
              <input
                type="text"
                placeholder="Search contact, company, summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-wrap sm:flex-nowrap">
              {/* Contact Types */}
              <select
                value={filterContactType}
                onChange={(e) => setFilterContactType(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-700 shadow-sm"
              >
                <option value="All Contact Types">🩸 All Contact Types</option>
                <option value="LEAD">Lead</option>
                <option value="CUSTOMER">Customer</option>
                <option value="TRIAL">Trial</option>
              </select>

              {/* Statuses */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-700 shadow-sm"
              >
                <option value="All Statuses">📞 All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Busy">Busy</option>
                <option value="No Answer">No Answer</option>
              </select>

              {/* Time */}
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-700 shadow-sm"
              >
                <option value="All Time">📅 All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>

              {/* Sentiments */}
              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-700 shadow-sm"
              >
                <option value="All Sentiments">✨ All Sentiments</option>
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Hesitant">Hesitant</option>
                <option value="Negative">Negative</option>
              </select>
            </div>
          </div>

          {/* Table / Empty State: Exact match to Screenshot 2 */}
          {filteredCalls.length === 0 ? (
            <div className="card p-16 bg-white border border-navy-100 rounded-3xl shadow-sm text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-navy-50 flex items-center justify-center text-navy-400">
                <Icon name="phone" size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-navy-900">No call logs found</h4>
                <p className="text-xs text-navy-400 max-w-md mx-auto">
                  No calls match the selected filters. Use the AI Dialer on any Lead or Customer to execute calls and
                  log real-time data.
                </p>
              </div>
              <button
                onClick={() => setNewCallModalOpen(true)}
                className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
              >
                Start AI Call
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden bg-white border border-navy-100 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                    <th className="py-3 px-4">CONTACT / PHONE</th>
                    <th className="py-3 px-4">TYPE & STATUS</th>
                    <th className="py-3 px-4">DURATION</th>
                    <th className="py-3 px-4">SENTIMENT & SCORE</th>
                    <th className="py-3 px-4">AI CONSULTATION SUMMARY</th>
                    <th className="py-3 px-4">TIMESTAMP</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 text-xs">
                  {filteredCalls.map((c) => (
                    <tr key={c.id} className="hover:bg-navy-50/40 transition group">
                      <td className="py-3.5 px-4 font-bold text-navy-900">
                        <span>{c.contact_name}</span>
                        <span className="text-[11px] text-navy-400 font-mono block">{c.phone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-100 text-navy-700">
                            {c.contact_type}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {c.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-700">{c.duration_formatted}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.sentiment === 'Positive'
                                ? 'bg-emerald-50 text-emerald-700'
                                : c.sentiment === 'Neutral'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {c.sentiment}
                          </span>
                          <span className="font-bold text-navy-900 text-xs">{c.qualification_score}/100</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-navy-600 text-[11px]">{c.ai_summary}</p>
                      </td>
                      <td className="py-3.5 px-4 text-navy-400 text-[11px] whitespace-nowrap">{c.created_at}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedCallLog(c);
                              setTranscriptModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 font-bold text-[11px] transition flex items-center gap-1"
                          >
                            <Icon name="file-text" size={12} />
                            <span>Transcript</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCall(c.id)}
                            className="p-1 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete log"
                          >
                            <Icon name="trash-2" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: START AI VOICE CALL (Live Simulator)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {newCallModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                  <Icon name="phone-call" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-navy-900">AI Voice Calling Engine</h3>
                  <p className="text-[11px] text-navy-400">Autonomous conversational agent</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (callingState === 'idle') setNewCallModalOpen(false);
                }}
                disabled={callingState !== 'idle'}
                className="p-1.5 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition disabled:opacity-30"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {callingState === 'idle' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Pick Member or Enter Contact</label>
                  <select
                    onChange={(e) => {
                      const mId = e.target.value;
                      const found = members.find((m) => m.id === mId);
                      if (found) {
                        setCallForm({
                          ...callForm,
                          contact_name: found.name || found.full_name || '',
                          phone: found.phone || '',
                          contact_type: 'CUSTOMER',
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- Or select existing member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.full_name} ({m.phone}) - {m.membership || 'Member'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-navy-700 block mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={callForm.contact_name}
                      onChange={(e) => setCallForm({ ...callForm, contact_name: e.target.value })}
                      placeholder="e.g. Full Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-navy-700 block mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={callForm.phone}
                      onChange={(e) => setCallForm({ ...callForm, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Call Campaign Objective</label>
                  <select
                    value={callForm.objective}
                    onChange={(e) => setCallForm({ ...callForm, objective: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Membership Consultation & VIP Trial Pass">Membership Consultation & VIP Trial Pass</option>
                    <option value="Annual Membership Early Renewal Discount">Annual Membership Early Renewal Discount</option>
                    <option value="Inactive Member Reactivation & Health Checkup">Inactive Member Reactivation & Health Checkup</option>
                    <option value="1-on-1 Personal Trainer Body Scan Follow-up">1-on-1 Personal Trainer Body Scan Follow-up</option>
                  </select>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewCallModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center justify-center gap-2 transition"
                  >
                    <Icon name="phone" size={14} />
                    <span>Dial Now</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live In-Call Screen */
              <div className="py-6 text-center space-y-5">
                <div className="relative w-20 h-20 mx-auto rounded-full bg-brand-50 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
                  <Icon name="phone-call" size={32} className="text-brand-600" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-navy-900">{callForm.contact_name}</h4>
                  <span className="text-xs font-mono text-navy-400 block">{callForm.phone}</span>
                  <div className="pt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        callingState === 'dialing'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : callingState === 'connected'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-brand-100 text-brand-800'
                      }`}
                    >
                      {callingState === 'dialing' && '⚡ Ringing & Connecting Agent...'}
                      {callingState === 'connected' && `🎙️ Active Consultation (${callDuration}s)`}
                      {callingState === 'completed' && '✅ Call Completed & Saved to DB'}
                    </span>
                  </div>
                </div>

                {callingState === 'connected' && (
                  <div className="flex items-center justify-center gap-1.5 h-6">
                    <div className="w-1.5 h-4 bg-brand-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-6 bg-brand-600 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-1.5 h-3 bg-brand-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-5 bg-brand-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: CALL TRANSCRIPT & ANALYSIS                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {transcriptModalOpen && selectedCallLog && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
                  <span>AI Voice Consultation Details</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600">
                    {selectedCallLog.qualification_score}/100 Score
                  </span>
                </h3>
                <p className="text-xs text-navy-400 mt-0.5">
                  {selectedCallLog.contact_name} • {selectedCallLog.phone} • {selectedCallLog.duration_formatted}
                </p>
              </div>
              <button
                onClick={() => setTranscriptModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* AI Summary */}
            <div className="card p-4 bg-navy-50 rounded-2xl border border-navy-100 space-y-2">
              <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">AI EXECUTIVE SUMMARY</span>
              <p className="text-xs text-navy-800 leading-relaxed font-semibold">{selectedCallLog.ai_summary}</p>
            </div>

            {/* Action Items */}
            {selectedCallLog.action_items && selectedCallLog.action_items.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">RECOMMENDED NEXT ACTIONS</span>
                <div className="space-y-1.5">
                  {selectedCallLog.action_items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-navy-700 font-medium">
                      <Icon name="check-circle" size={14} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Audio Transcript */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider">FULL VOICE TRANSCRIPT</span>
                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="text-[11px] font-bold text-brand-600 flex items-center gap-1 hover:underline"
                >
                  <Icon name={isPlayingAudio ? 'pause' : 'volume-2'} size={13} />
                  <span>{isPlayingAudio ? 'Pause Audio' : 'Play Voice Recording'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-navy-950 text-navy-100 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto space-y-2.5 border border-navy-800">
                {selectedCallLog.transcript ? (
                  selectedCallLog.transcript.split('\n').map((line, idx) => (
                    <p key={idx} className={line.startsWith('AI Agent:') ? 'text-brand-400' : 'text-emerald-300'}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-navy-400">No transcript recorded for this call.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setTranscriptModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
