import React, { useState, useEffect } from 'react';
import {
  Bell, Smartphone, Monitor, Send, Target, CheckCheck,
  RefreshCw, Inbox, Sparkles, MessageSquare, Megaphone, ShieldAlert,
  Calendar, Clock, CheckCircle2, AlertTriangle, Layers, Users, Building,
  Radio, Laptop, Eye, Edit3, Trash2, ArrowRight, ExternalLink, Zap, Plus, X, Loader2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface PushNotificationTemplate {
  id: string;
  name: string;
  category: string;
  title_template: string;
  body_template: string;
  action_url?: string | null;
  priority: string;
  icon_type?: string;
  is_system?: boolean;
  created_at?: string;
}

export interface NotificationBroadcast {
  id: string;
  title: string;
  body: string;
  category: string;
  target_type: string;
  recipients_count: number;
  sent_by: string;
  status: string;
  action_url?: string | null;
  channels?: string[];
  created_at?: string;
}

export interface LiveNotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  unread: boolean;
  created_at?: string;
}

export function PushNotifications() {
  const [activeTab, setActiveTab] = useState<'composer' | 'templates' | 'history' | 'live'>('composer');
  const [templates, setTemplates] = useState<PushNotificationTemplate[]>([]);
  const [broadcasts, setBroadcasts] = useState<NotificationBroadcast[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<LiveNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Native Push Status State
  const [browserPushPermission, setBrowserPushPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // Broadcast Composer State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [pushTitle, setPushTitle] = useState('📢 Important Announcement: Quarterly General Update');
  const [pushBody, setPushBody] = useState(
    'Dear {{user_name}}, please review the latest company-wide policy and operational updates for {{date}}.'
  );
  const [pushCategory, setPushCategory] = useState('system');
  const [targetType, setTargetType] = useState<'all_org' | 'roles' | 'departments'>('all_org');
  const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>(['Trainers & Coaches']);
  const [selectedDeptFilters, setSelectedDeptFilters] = useState<string[]>(['Operations & Fitness']);
  const [actionUrl, setActionUrl] = useState('/hrms?tab=ess_announcements');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [channels, setChannels] = useState<{ mobile: boolean; web: boolean; in_app: boolean }>({
    mobile: true,
    web: true,
    in_app: true,
  });

  // Template Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PushNotificationTemplate | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplCategory, setTmplCategory] = useState('hrms');
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplBody, setTmplBody] = useState('');
  const [tmplActionUrl, setTmplActionUrl] = useState('');
  const [tmplPriority, setTmplPriority] = useState('normal');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const checkNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPushPermission(Notification.permission);
    } else {
      setBrowserPushPermission('unsupported');
    }
  };

  const requestNativePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      triggerToast('⚠️ Web Push Notifications are not supported in this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPushPermission(permission);
      if (permission === 'granted') {
        const mockToken = `web-push-${Math.random().toString(36).substring(2)}-${Date.now()}`;
        await apiClient.post('/system/notifications/devices/register', {
          device_token: mockToken,
          platform: 'web',
          device_name: navigator.userAgent.includes('Mac') ? 'Mac Workstation' : 'Desktop Client',
        });
        triggerToast('🔔 Browser push notifications successfully authorized!');
      } else {
        triggerToast('⚠️ Push notification permission was dismissed.');
      }
    } catch (_err) {
      triggerToast('Failed to request browser push permission');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tmplData, bcData, liveData] = await Promise.all([
        apiClient.get<PushNotificationTemplate[]>('/system/notifications/templates').catch(() => []),
        apiClient.get<NotificationBroadcast[]>('/system/notifications/broadcasts').catch(() => []),
        apiClient.get<LiveNotificationItem[]>('/system/notifications/live').catch(() => []),
      ]);
      setTemplates(Array.isArray(tmplData) ? tmplData : []);
      setBroadcasts(Array.isArray(bcData) ? bcData : []);
      setLiveNotifications(Array.isArray(liveData) ? liveData : []);
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    checkNotificationPermission();
  }, []);

  const handleSelectTemplate = (tId: string) => {
    setSelectedTemplateId(tId);
    const tmpl = templates.find((t) => t.id === tId);
    if (tmpl) {
      setPushTitle(tmpl.title_template);
      setPushBody(tmpl.body_template);
      setPushCategory(tmpl.category || 'system');
      if (tmpl.action_url) setActionUrl(tmpl.action_url);
      if (tmpl.priority) setPriority(tmpl.priority as any);
      triggerToast(`Loaded template: "${tmpl.name}"`);
    }
  };

  const handleInsertPlaceholder = (ph: string) => {
    setPushBody((prev) => `${prev} ${ph}`);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) {
      triggerToast('Please provide both notification title and message body.');
      return;
    }

    const selectedChannels = [];
    if (channels.mobile) selectedChannels.push('mobile_push');
    if (channels.web) selectedChannels.push('web_push');
    if (channels.in_app) selectedChannels.push('in_app');

    if (selectedChannels.length === 0) {
      triggerToast('Please select at least one delivery channel.');
      return;
    }

    setSending(true);
    try {
      const res = await apiClient.post<any>('/system/notifications/broadcast', {
        template_id: selectedTemplateId || null,
        title: pushTitle,
        body: pushBody,
        category: pushCategory,
        target_type: targetType,
        target_filter: targetType === 'roles' ? selectedRoleFilters : targetType === 'departments' ? selectedDeptFilters : [],
        action_url: actionUrl,
        channels: selectedChannels,
      });

      triggerToast(res?.message || '🎉 Push broadcast dispatched successfully!');
      loadData();
    } catch (_err) {
      triggerToast('Failed to dispatch broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleOpenTemplateModal = (tmpl?: PushNotificationTemplate) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTmplName(tmpl.name);
      setTmplCategory(tmpl.category);
      setTmplTitle(tmpl.title_template);
      setTmplBody(tmpl.body_template);
      setTmplActionUrl(tmpl.action_url || '');
      setTmplPriority(tmpl.priority || 'normal');
    } else {
      setEditingTemplate(null);
      setTmplName('');
      setTmplCategory('hrms');
      setTmplTitle('');
      setTmplBody('');
      setTmplActionUrl('');
      setTmplPriority('normal');
    }
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplTitle.trim() || !tmplBody.trim()) {
      triggerToast('Please fill in required fields');
      return;
    }

    try {
      if (editingTemplate) {
        await apiClient.put(`/system/notifications/templates/${editingTemplate.id}`, {
          name: tmplName,
          category: tmplCategory,
          title_template: tmplTitle,
          body_template: tmplBody,
          action_url: tmplActionUrl || null,
          priority: tmplPriority,
        });
        triggerToast('✅ Template updated successfully');
      } else {
        await apiClient.post('/system/notifications/templates', {
          name: tmplName,
          category: tmplCategory,
          title_template: tmplTitle,
          body_template: tmplBody,
          action_url: tmplActionUrl || null,
          priority: tmplPriority,
        });
        triggerToast('🎉 New push notification template created');
      }
      setTemplateModalOpen(false);
      loadData();
    } catch (_err) {
      triggerToast('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await apiClient.delete(`/system/notifications/templates/${id}`);
      triggerToast('Template deleted');
      loadData();
    } catch (_err) {
      triggerToast('Failed to delete template');
    }
  };

  // Preview formatted text
  const previewFormattedBody = pushBody
    .replace(/\{\{user_name\}\}/g, 'Alex Morgan')
    .replace(/\{\{org_name\}\}/g, 'Fit Club AI')
    .replace(/\{\{date\}\}/g, '23 Sep 2026');

  // Stats values (100% dynamic from live DB data)
  const totalBroadcastsCount = broadcasts.length;
  const activeTemplatesCount = templates.length;
  const deliveredPushesCount = broadcasts.reduce((sum, b) => sum + (Number(b.recipients_count) || 0), 0);
  const liveAlertsCount = liveNotifications.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-navy-950 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-purple-500/40 flex items-center gap-2.5 animate-slide-in">
          <Sparkles size={16} className="text-purple-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP TITLE HEADER: Exact match to Screenshot 2 & 3          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-black text-navy-900 tracking-tight">Push Notifications & Broadcast Studio</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Multi-Channel Engine
            </span>
          </div>
          <p className="text-xs text-navy-500 mt-1">
            Broadcast templated push messages across entire organizations, mobile devices, and desktop browsers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          <button
            onClick={requestNativePush}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-xs ${
              browserPushPermission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-white hover:bg-navy-50 text-navy-700 border-navy-200'
            }`}
          >
            <Bell size={14} className={browserPushPermission === 'granted' ? 'text-emerald-600' : 'text-amber-500'} />
            <span>{browserPushPermission === 'granted' ? 'Push Alerts Authorized' : 'Enable Browser Push Alerts'}</span>
          </button>

          <button
            onClick={() => handleOpenTemplateModal()}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-800 text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus size={14} />
            <span>New Template</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 shadow-xs transition"
            title="Refresh All"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 4 STAT METRIC CARDS: Exact match to Screenshot 2          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organization Broadcasts */}
        <div className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-500 block">Organization Broadcasts</span>
            <div className="text-3xl font-black text-navy-900">{totalBroadcastsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Megaphone size={20} />
          </div>
        </div>

        {/* Card 2: Active Push Templates */}
        <div className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-500 block">Active Push Templates</span>
            <div className="text-3xl font-black text-navy-900">{activeTemplatesCount}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>

        {/* Card 3: Delivered Mobile Pushes */}
        <div className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-500 block">Delivered Mobile Pushes</span>
            <div className="text-3xl font-black text-navy-900">{deliveredPushesCount.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Smartphone size={20} />
          </div>
        </div>

        {/* Card 4: Active Live Alerts */}
        <div className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-500 block">Active Live Alerts</span>
            <div className="text-3xl font-black text-navy-900">{liveAlertsCount}</div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Radio size={20} />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SUB-TABS: Exact match to Screenshot 2                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('composer')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'composer'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white hover:bg-navy-50 text-navy-700 border border-navy-100'
          }`}
        >
          <Send size={14} />
          <span>Broadcast Push Composer</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'templates'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white hover:bg-navy-50 text-navy-700 border border-navy-100'
          }`}
        >
          <Layers size={14} />
          <span>Message Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white hover:bg-navy-50 text-navy-700 border border-navy-100'
          }`}
        >
          <Clock size={14} />
          <span>Broadcast History ({broadcasts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition ${
            activeTab === 'live'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
              : 'bg-white hover:bg-navy-50 text-navy-700 border border-navy-100'
          }`}
        >
          <Bell size={14} />
          <span>Live Alerts Stream ({liveNotifications.length})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: BROADCAST COMPOSER & LIVE PREVIEW (Screenshot 2 & 3)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Dispatch Form (7 cols) */}
          <div className="lg:col-span-7 card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-5">
            <div className="border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2 text-navy-900 font-black text-sm">
                <Megaphone size={16} className="text-purple-600" />
                <h3>Dispatch Organization Broadcast</h3>
              </div>
              <p className="text-xs text-navy-400 mt-0.5">
                Compose push alert, load from pre-built corporate templates, and target user cohorts.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              {/* Pre-configured Message Template Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-navy-700">Pre-configured Message Template</label>
                  <span className="text-[11px] text-purple-600 font-semibold">Optional quick-fill</span>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-navy-200 bg-navy-50/40 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">✨ Custom Blank Message (No Template)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Audience 3 Cards */}
              <div>
                <label className="font-bold text-navy-700 block mb-2">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Option 1: All Organization */}
                  <button
                    type="button"
                    onClick={() => setTargetType('all_org')}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                      targetType === 'all_org'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-navy-200 hover:border-navy-300 text-navy-700 bg-white'
                    }`}
                  >
                    <Building size={18} className={targetType === 'all_org' ? 'text-purple-600' : 'text-navy-400'} />
                    <span className="font-bold text-[11px] block">All Organization</span>
                    <span className="text-[10px] text-navy-400 block">Entire Workspace</span>
                  </button>

                  {/* Option 2: Target by Role */}
                  <button
                    type="button"
                    onClick={() => setTargetType('roles')}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                      targetType === 'roles'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-navy-200 hover:border-navy-300 text-navy-700 bg-white'
                    }`}
                  >
                    <Users size={18} className={targetType === 'roles' ? 'text-purple-600' : 'text-navy-400'} />
                    <span className="font-bold text-[11px] block">Target by Role</span>
                    <span className="text-[10px] text-navy-400 block">e.g. HR, Sales, Cashier</span>
                  </button>

                  {/* Option 3: By Department */}
                  <button
                    type="button"
                    onClick={() => setTargetType('departments')}
                    className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                      targetType === 'departments'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'border-navy-200 hover:border-navy-300 text-navy-700 bg-white'
                    }`}
                  >
                    <Target size={18} className={targetType === 'departments' ? 'text-purple-600' : 'text-navy-400'} />
                    <span className="font-bold text-[11px] block">By Department</span>
                    <span className="text-[10px] text-navy-400 block">e.g. Sales, Tech, Ops</span>
                  </button>
                </div>
              </div>

              {/* Title & Category in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="font-bold text-navy-700 block mb-1">Notification Title</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                      placeholder="e.g. 📢 Important Announcement"
                      className="w-full px-3.5 py-2 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="font-bold text-navy-700 block mb-1">Category</label>
                  <select
                    value={pushCategory}
                    onChange={(e) => setPushCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="system">System / General</option>
                    <option value="hrms">HRMS & Policy</option>
                    <option value="pos">POS & Counter</option>
                    <option value="inventory">Inventory & Stocks</option>
                    <option value="crm">CRM & Growth</option>
                  </select>
                </div>
              </div>

              {/* Notification Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-navy-700">Notification Message Body</label>
                  <div className="flex items-center gap-1.5 text-[10px] text-navy-400">
                    <span>Insert placeholder:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertPlaceholder('+{{user_name}}')}
                      className="text-purple-600 font-bold hover:underline"
                    >
                      +&#123;&#123;user_name&#125;&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertPlaceholder('+{{org_name}}')}
                      className="text-purple-600 font-bold hover:underline"
                    >
                      +&#123;&#123;org_name&#125;&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertPlaceholder('+{{date}}')}
                      className="text-purple-600 font-bold hover:underline"
                    >
                      +&#123;&#123;date&#125;&#125;
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  required
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  placeholder="Type push message text..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-navy-200 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* Target Deep Link & Priority Level in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy-700 block mb-1">Target Deep Link / Route (Optional)</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/hrms?tab=ess_announcements"
                    className="w-full px-3.5 py-2 rounded-xl border border-navy-200 text-xs font-mono font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-navy-700 block mb-1">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="high">High Priority (Audible Alert)</option>
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">Urgent Priority (Override DND)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Device Delivery Channels */}
              <div>
                <label className="font-bold text-navy-700 block mb-1.5">Multi-Device Delivery Channels</label>
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-navy-800 select-none">
                    <input
                      type="checkbox"
                      checked={channels.mobile}
                      onChange={(e) => setChannels({ ...channels, mobile: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-navy-300"
                    />
                    <span>📱 Mobile App (FCM)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-navy-800 select-none">
                    <input
                      type="checkbox"
                      checked={channels.web}
                      onChange={(e) => setChannels({ ...channels, web: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-navy-300"
                    />
                    <span>💻 Web & Desktop</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-navy-800 select-none">
                    <input
                      type="checkbox"
                      checked={channels.in_app}
                      onChange={(e) => setChannels({ ...channels, in_app: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-navy-300"
                    />
                    <span>🔔 In-App Topbar</span>
                  </label>
                </div>
              </div>

              {/* Submit Broadcast Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/25 disabled:opacity-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  <span>{sending ? 'Broadcasting Push Notification...' : 'Send Broadcast Push Notification Now'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Live Device Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-navy-700 flex items-center gap-1.5">
                <Eye size={14} className="text-purple-600" />
                <span>LIVE DEVICE PREVIEW</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800">
                High-Fidelity Render
              </span>
            </div>

            {/* 1. Smartphone Lockscreen & Banner Render (Exact match to Screenshot 2) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-navy-500 flex items-center gap-1.5">
                <Smartphone size={13} />
                <span>Smartphone Lockscreen & Banner</span>
              </span>

              <div className="p-4 rounded-3xl bg-navy-950 text-white shadow-xl border border-navy-800 space-y-3">
                {/* Notification Card on Phone */}
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white shrink-0 shadow-md border border-white/20 p-0.5">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="font-black text-slate-100 text-sm tracking-tight">LazyMonkey FIT CLUB AI</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">Just now</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-white leading-snug">{pushTitle}</h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                      {previewFormattedBody}
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1">
                      <span>View Details</span>
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Desktop Workstation Banner Render (Exact match to Screenshot 3) */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-navy-500 flex items-center gap-1.5">
                <Laptop size={13} />
                <span>Desktop Workstation Banner</span>
              </span>

              <div className="p-4 rounded-2xl bg-white border border-navy-200 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                    <Bell size={13} />
                    <span>Push Notification</span>
                  </div>
                  <span className="text-[10px] text-navy-400">12:30 PM</span>
                </div>

                <h4 className="font-bold text-xs text-navy-900">{pushTitle}</h4>
                <p className="text-[11px] text-navy-600 leading-relaxed">{previewFormattedBody}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: MESSAGE TEMPLATES                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-navy-900">Pre-Configured Corporate Templates</h3>
            <button
              onClick={() => handleOpenTemplateModal()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus size={14} />
              <span>Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-3 hover:border-purple-200 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-navy-100 text-navy-700">
                    {t.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenTemplateModal(t)}
                      className="p-1 text-navy-400 hover:text-navy-700 rounded transition"
                      title="Edit"
                    >
                      <Edit3 size={13} />
                    </button>
                    {!t.is_system && (
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-1 text-navy-400 hover:text-red-600 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-navy-900">{t.name}</h4>
                  <p className="text-[11px] font-medium text-navy-500 mt-1 line-clamp-2">{t.body_template}</p>
                </div>

                <div className="pt-2 border-t border-navy-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      handleSelectTemplate(t.id);
                      setActiveTab('composer');
                    }}
                    className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <span>Use in Composer</span>
                    <ArrowRight size={12} />
                  </button>
                  <span className="text-[10px] text-navy-400 uppercase font-mono">{t.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: BROADCAST HISTORY                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card bg-white border border-navy-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-navy-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">Broadcast Dispatch Records</h3>
            <span className="text-xs text-navy-400">{broadcasts.length} total dispatches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50 text-navy-600 font-bold border-b border-navy-100">
                <tr>
                  <th className="py-3 px-4">Title & Message</th>
                  <th className="py-3 px-4">Target Audience</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Channels</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {broadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-navy-400">
                      No broadcast push dispatches logged yet.
                    </td>
                  </tr>
                ) : (
                  broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/40">
                      <td className="py-3.5 px-4 font-bold text-navy-900 max-w-xs">
                        <span className="block truncate">{b.title}</span>
                        <span className="text-[11px] font-normal text-navy-500 truncate block">{b.body}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700">
                          {b.target_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-navy-900">{b.recipients_count}</td>
                      <td className="py-3.5 px-4 text-[11px] text-navy-500">
                        {Array.isArray(b.channels) ? b.channels.join(', ') : 'All'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-navy-400 text-[11px] whitespace-nowrap">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: LIVE ALERTS STREAM                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'live' && (
        <div className="card p-5 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">Live In-App Notification Feed</h3>
            <span className="text-xs text-emerald-600 font-bold">● Active WebSocket / Polling Stream</span>
          </div>

          <div className="divide-y divide-navy-50 space-y-2">
            {liveNotifications.length === 0 ? (
              <div className="py-12 text-center text-navy-400 text-xs">
                No active notifications in feed.
              </div>
            ) : (
              liveNotifications.map((n) => (
                <div key={n.id} className="pt-2 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Bell size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-navy-900">{n.title}</h4>
                      <p className="text-[11px] text-navy-600 mt-0.5">{n.body}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-navy-400 whitespace-nowrap">
                    {n.created_at ? new Date(n.created_at).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TEMPLATE CREATE / EDIT MODAL                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-sm font-black text-navy-900">
                {editingTemplate ? 'Edit Push Template' : 'Create Push Template'}
              </h3>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 rounded-full text-navy-400 hover:bg-navy-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-navy-700 block mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Staff Review Alert"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-navy-700 block mb-1">Category</label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 font-semibold text-navy-900 bg-white"
                  >
                    <option value="hrms">HRMS & Policy</option>
                    <option value="pos">POS & Counter</option>
                    <option value="inventory">Inventory & Stock</option>
                    <option value="system">System / General</option>
                    <option value="crm">CRM & Sales</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-navy-700 block mb-1">Priority</label>
                  <select
                    value={tmplPriority}
                    onChange={(e) => setTmplPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 font-semibold text-navy-900 bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-navy-700 block mb-1">Notification Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 📢 Important Notice"
                  value={tmplTitle}
                  onChange={(e) => setTmplTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-navy-700 block mb-1">Notification Body Template *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Dear {{user_name}}, please note..."
                  value={tmplBody}
                  onChange={(e) => setTmplBody(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-navy-700 block mb-1">Action Deep Link / Route (Optional)</label>
                <input
                  type="text"
                  placeholder="/hrms?tab=ess_announcements"
                  value={tmplActionUrl}
                  onChange={(e) => setTmplActionUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 font-mono text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/25 transition"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
