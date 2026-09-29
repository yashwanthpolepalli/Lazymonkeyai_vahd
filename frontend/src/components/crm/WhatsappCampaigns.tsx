import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Phone, User, Plus, X, Send, Check, CheckCheck,
  RefreshCw, LogOut, Search, Sparkles, Smartphone, QrCode, Users,
  MessageCircle, ExternalLink, Loader2, Info, UserPlus,
  Paperclip, FileText, Trash2, Image as ImageIcon
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface ChatMessage {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: number;
  media?: {
    mimeType: string;
    preview?: string;
    fileName?: string;
  };
}

interface WhatsAppSession {
  status: string;
  qr: string | null;
  info: any | null;
  owner_name: string;
}

interface ContactLead {
  id: string;
  name: string;
  phone: string;
  source?: string;
  status?: string;
  category?: string;
  interest?: string;
}

export function WhatsappCampaigns() {
  // Session States
  const [sessions, setSessions] = useState<Record<string, WhatsAppSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);

  // Chat/Lead States
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ContactLead | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Direct Message States
  const [showDirectMessageModal, setShowDirectMessageModal] = useState(false);
  const [directMessageNumber, setDirectMessageNumber] = useState('');
  const [directMessageName, setDirectMessageName] = useState('');
  const [loadingDirectMessage, setLoadingDirectMessage] = useState(false);

  // Sidebar Tab State
  const [sidebarTab, setSidebarTab] = useState<'leads' | 'contacts'>('leads');

  // QR Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(30);

  // Media sending states
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; mimeType: string; fileName: string } | null>(null);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [mediaCaption, setMediaCaption] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Fetch sessions
  const fetchSessions = async () => {
    try {
      const data = await apiClient.get<Record<string, WhatsAppSession>>('/whatsapp-automation/sessions');
      setSessions(data || {});
      if (data && Object.keys(data).length > 0) {
        const activeIds = Object.keys(data);
        if (!activeSessionId) {
          const connected = activeIds.find((id) => data[id].status === 'CONNECTED');
          setActiveSessionId(connected || activeIds[0]);
        }
      }
    } catch (_e) {
      /* ignore */
    }
  };

  // 2. Fetch leads from database
  const fetchLeads = async () => {
    setLoadingChats(true);
    try {
      const res = await apiClient.get<ContactLead[]>('/crm/leads');
      if (Array.isArray(res) && res.length > 0) {
        setLeads(res);
        if (!selectedLead) setSelectedLead(res[0]);
      } else {
        // Fallback demo leads if none exist
        const defaultLeads: ContactLead[] = [
          { id: 'lead_1', name: 'Vikranth Genailakes', phone: '+919849987774', status: 'NEW', category: 'Individual' },
          { id: 'lead_2', name: 'Swapna Uppalapati', phone: '+918309763575', status: 'NEW', category: 'Individual' },
          { id: 'lead_3', name: 'kirankumar6053', phone: '+918639395866', status: 'NEW', category: 'Individual' },
          { id: 'lead_4', name: 'Rohit Verma (VIP Trial)', phone: '+919988776655', status: 'Active', category: 'Membership' },
        ];
        setLeads(defaultLeads);
        if (!selectedLead) setSelectedLead(defaultLeads[0]);
      }
    } catch (_e) {
      setLeads([]);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchLeads();
  }, []);

  // Poll chat messages for selected lead
  const fetchChatMessages = async (leadPhone: string) => {
    if (!activeSessionId || !leadPhone) return;
    try {
      const res = await apiClient.get<{ success: boolean; messages: ChatMessage[] }>(
        `/whatsapp-automation/sessions/${activeSessionId}/chats/${leadPhone.replace(/\D/g, '')}/messages`
      );
      if (res && Array.isArray(res.messages)) {
        setChatMessages(res.messages);
      }
    } catch (_e) {
      setChatMessages([]);
    }
  };

  useEffect(() => {
    if (selectedLead && activeSessionId) {
      fetchChatMessages(selectedLead.phone);
    }
  }, [selectedLead, activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // QR timer countdown
  useEffect(() => {
    let timer: any;
    if (showQrModal && qrTimeLeft > 0) {
      timer = setInterval(() => setQrTimeLeft((prev) => prev - 1), 1000);
    } else if (qrTimeLeft === 0) {
      fetchSessions();
      setQrTimeLeft(30);
    }
    return () => clearInterval(timer);
  }, [showQrModal, qrTimeLeft]);

  // Start new session
  const handleStartSession = async () => {
    const cleanNum = newNumber.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 10) {
      triggerToast('⚠️ Please enter a valid phone number with country code (e.g. 919849617326)');
      return;
    }
    setLoadingStart(true);
    try {
      const res = await apiClient.post<any>(`/whatsapp-automation/sessions/${cleanNum}/start`, {});
      triggerToast('🎉 Chromium WhatsApp session initialized! Scan QR Code.');
      setShowLinkModal(false);
      setNewNumber('');
      await fetchSessions();
      setActiveSessionId(cleanNum);
      setShowQrModal(true);
    } catch (_err) {
      triggerToast('Failed to start WhatsApp web session');
    } finally {
      setLoadingStart(false);
    }
  };

  // Logout / Disconnect
  const handleLogoutSession = async (sessId: string) => {
    if (!window.confirm(`Disconnect WhatsApp account +${sessId}?`)) return;
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${sessId}/logout`, {});
      triggerToast('Session disconnected successfully');
      fetchSessions();
    } catch (_e) {
      triggerToast('Failed to disconnect session');
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    if (!activeSessionId) return;
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${activeSessionId}/reset`, {});
      triggerToast('Session reset to QR_READY');
      fetchSessions();
    } catch (_e) {
      triggerToast('Failed to reset session');
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim() || !selectedLead || !activeSessionId) return;

    const body = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);

    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      body,
      fromMe: true,
      timestamp: Math.floor(Date.now() / 1000),
    };
    setChatMessages((prev) => [...prev, tempMsg]);

    try {
      await apiClient.post(`/whatsapp-automation/sessions/${activeSessionId}/chats/${selectedLead.phone.replace(/\D/g, '')}/send`, {
        message: body,
      });
      fetchChatMessages(selectedLead.phone);
    } catch (_err) {
      triggerToast('Failed to send message over WhatsApp');
    } finally {
      setSendingMessage(false);
    }
  };

  // Send Direct Message
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = directMessageNumber.replace(/\D/g, '');
    if (!cleanNum || !activeSessionId) {
      triggerToast('Please provide a valid phone number');
      return;
    }
    setLoadingDirectMessage(true);
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${activeSessionId}/chats/${cleanNum}/send`, {
        message: `Hello ${directMessageName || 'there'}, greeting from Fit Club AI!`,
      });
      triggerToast(`✅ Message sent to +${cleanNum}`);
      setShowDirectMessageModal(false);
      setDirectMessageNumber('');
      setDirectMessageName('');
      fetchLeads();
    } catch (_err) {
      triggerToast('Failed to send direct message');
    } finally {
      setLoadingDirectMessage(false);
    }
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedMedia({
        file,
        preview: reader.result as string,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Media
  const handleSendMedia = async () => {
    if (!selectedMedia || !selectedLead || !activeSessionId) return;
    setSendingMedia(true);
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${activeSessionId}/chats/${selectedLead.phone.replace(/\D/g, '')}/send-media`, {
        mimeType: selectedMedia.mimeType,
        data: selectedMedia.preview,
        fileName: selectedMedia.fileName,
        caption: mediaCaption || selectedMedia.fileName,
      });
      triggerToast('Media file dispatched to WhatsApp chat!');
      setSelectedMedia(null);
      setMediaCaption('');
      fetchChatMessages(selectedLead.phone);
    } catch (_err) {
      triggerToast('Failed to send media file');
    } finally {
      setSendingMedia(false);
    }
  };

  const currentSession = activeSessionId ? sessions[activeSessionId] : null;
  const sessionStatus = currentSession?.status || 'QR_READY';

  const filteredLeads = leads.filter((l) => {
    return (
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.category || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="bg-white rounded-3xl border border-navy-100 shadow-sm overflow-hidden flex flex-col space-y-0 animate-fade-in">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-navy-950 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/40 flex items-center gap-2.5 animate-slide-in">
          <Sparkles size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP HEADER: Exact match to Screenshot 1                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-navy-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-navy-900 tracking-tight">WhatsApp Link</h2>
          </div>
        </div>

        <button
          onClick={() => setShowLinkModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus size={15} />
          <span>Link Device</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SESSION SELECTOR DROPDOWN & STATUS ROW                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-navy-50/40 border-b border-navy-100 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Dropdown with all numbers */}
          <div className="relative flex-1">
            <select
              value={activeSessionId || ''}
              onChange={(e) => setActiveSessionId(e.target.value)}
              className="w-full bg-white border border-navy-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-navy-900 shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
            >
              {Object.keys(sessions).length === 0 ? (
                <option value="">No Active WhatsApp Sessions (Click + Link Device)</option>
              ) : (
                Object.entries(sessions).map(([id, sess]) => (
                  <option key={id} value={id}>
                    +{id} ({sess.status})
                  </option>
                ))
              )}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy-400">
              ▼
            </div>
          </div>
        </div>

        {/* Status Chip Row with Disconnect button */}
        <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-navy-100 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                sessionStatus === 'CONNECTED'
                  ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-slate-400 ring-4 ring-slate-100'
              }`}
            />
            <span className="font-bold text-navy-800 uppercase tracking-wide text-[11px]">{sessionStatus}</span>
          </div>

          <button
            onClick={() => activeSessionId && handleLogoutSession(activeSessionId)}
            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Disconnect WhatsApp Session"
          >
            <LogOut size={15} />
          </button>
        </div>

        {/* Amber Alert Banner: Exact match to Screenshot 1 */}
        {sessionStatus !== 'CONNECTED' && (
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <QrCode size={16} className="text-amber-700 shrink-0" />
              <span>
                Session is <strong className="font-bold">QR_READY</strong>. Scan QR Code on your phone.
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setQrTimeLeft(30);
                  setShowQrModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1"
              >
                <span>View QR Code</span>
              </button>
              <button
                onClick={handleResetSession}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs shadow-sm transition active:scale-95"
              >
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN TWO-PANE CHAT & LEADS WORKSPACE                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
        {/* LEFT COLUMN: Leads / Chats Sidebar (5 cols) */}
        <div className="lg:col-span-4 border-r border-navy-100 flex flex-col bg-white">
          {/* Search Bar with + Button */}
          <div className="p-3 border-b border-navy-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search chats or leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-navy-50 rounded-xl border border-navy-200 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowDirectMessageModal(true)}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
              title="Start New Direct Chat"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Subtabs: Leads / Chats vs Phone Contacts */}
          <div className="flex border-b border-navy-100 text-xs font-bold text-navy-600">
            <button
              onClick={() => setSidebarTab('leads')}
              className={`flex-1 py-2.5 text-center transition border-b-2 ${
                sidebarTab === 'leads'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                  : 'border-transparent hover:text-navy-900'
              }`}
            >
              Leads / Chats
            </button>
            <button
              onClick={() => setSidebarTab('contacts')}
              className={`flex-1 py-2.5 text-center transition border-b-2 ${
                sidebarTab === 'contacts'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                  : 'border-transparent hover:text-navy-900'
              }`}
            >
              Phone Contacts
            </button>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-navy-50 max-h-[500px]">
            {loadingChats ? (
              <div className="py-12 text-center text-xs text-navy-400 flex flex-col items-center gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span>Loading WhatsApp contacts...</span>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-12 text-center text-xs text-navy-400">
                No chats found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredLeads.map((l) => {
                const initial = (l.name || 'U')[0].toUpperCase();
                const isSelected = selectedLead?.id === l.id || selectedLead?.phone === l.phone;
                return (
                  <div
                    key={l.id || l.phone}
                    onClick={() => setSelectedLead(l)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50/60 border-l-4 border-emerald-600' : 'hover:bg-navy-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        {initial}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-navy-900 leading-snug">{l.name}</h4>
                        <span className="text-[11px] font-mono text-navy-400 block">{l.phone}</span>
                        <span className="text-[10px] text-navy-400">{l.category || 'Individual'}</span>
                      </div>
                    </div>

                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-navy-100 text-navy-600">
                      NEW
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Conversation View (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-50/40">
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 bg-white border-b border-navy-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {(selectedLead.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                      <span>{selectedLead.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Online
                      </span>
                    </h3>
                    <span className="text-[11px] font-mono text-navy-400 block">{selectedLead.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchChatMessages(selectedLead.phone)}
                    className="p-1.5 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition"
                    title="Refresh Chat History"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[360px] max-h-[460px] bg-gradient-to-b from-slate-50/80 to-emerald-50/20">
                {chatMessages.length === 0 ? (
                  <div className="py-16 text-center text-xs text-navy-400 space-y-2">
                    <MessageCircle size={28} className="mx-auto text-navy-300 opacity-60" />
                    <p>No messages exchanged yet with {selectedLead.name}.</p>
                    <p className="text-[11px]">Type below to send an instant WhatsApp text.</p>
                  </div>
                ) : (
                  chatMessages.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${m.fromMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                          m.fromMe
                            ? 'bg-emerald-600 text-white rounded-br-xs'
                            : 'bg-white border border-navy-100 text-navy-900 rounded-bl-xs'
                        }`}
                      >
                        {m.media && (
                          <div className="mb-1.5 p-2 rounded-xl bg-black/10 flex items-center gap-2 text-[11px]">
                            <FileText size={14} />
                            <span className="truncate">{m.media.fileName || 'Attachment'}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-mono ${
                            m.fromMe ? 'text-emerald-100' : 'text-navy-400'
                          }`}
                        >
                          <span>
                            {new Date(m.timestamp * 1000).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Kolkata',
                            })}{' '}
                            IST
                          </span>
                          {m.fromMe && <CheckCheck size={11} />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Media Preview before send */}
              {selectedMedia && (
                <div className="p-3 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <ImageIcon size={16} className="text-emerald-700 shrink-0" />
                    <span className="font-bold text-navy-900 truncate">{selectedMedia.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendMedia}
                      disabled={sendingMedia}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-sm hover:bg-emerald-700 transition"
                    >
                      {sendingMedia ? 'Sending...' : 'Send File'}
                    </button>
                    <button
                      onClick={() => setSelectedMedia(null)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-navy-100 flex items-center gap-2">
                <input
                  type="file"
                  ref={mediaInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="p-2 text-navy-400 hover:text-navy-700 hover:bg-navy-50 rounded-xl transition"
                  title="Attach Image or PDF"
                >
                  <Paperclip size={18} />
                </button>

                <input
                  type="text"
                  placeholder={`Message ${selectedLead.name}...`}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 bg-navy-50 border border-navy-200 rounded-xl px-4 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <button
                  type="submit"
                  disabled={sendingMessage || !newMessageText.trim()}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 disabled:opacity-40 transition active:scale-95"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="py-24 text-center text-xs text-navy-400">
              Select a lead or chat from the sidebar to view conversation.
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: LINK WHATSAPP WEB ACCOUNT (Exact match to Image 4)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-navy-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Smartphone size={20} className="text-emerald-600" />
                <h3 className="text-sm font-black text-navy-900">Link WhatsApp Web Account</h3>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded-full text-navy-400 hover:bg-navy-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Info Callout Box: Exact match to Screenshot 4 */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Entering your phone number starts a headless Chromium browser in the gateway. Once scanned, browser state is persisted.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-navy-700 uppercase tracking-wider block mb-1.5">
                  PHONE NUMBER (WITH COUNTRY CODE)
                </label>
                <input
                  type="text"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  placeholder="919849617326"
                  className="w-full px-4 py-2.5 rounded-xl border border-navy-200 text-xs font-bold text-navy-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-navy-400 mt-1 block">
                  Do not include +, spaces, or leading zeros.
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={loadingStart}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {loadingStart ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{loadingStart ? 'Initializing...' : 'Start Session'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: SCAN QR CODE MODAL                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showQrModal && currentSession && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-navy-900">Scan QR Code on Phone</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-navy-400 hover:bg-navy-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-white border border-navy-100 rounded-2xl shadow-inner inline-block mx-auto">
              {currentSession.qr ? (
                <img
                  src={currentSession.qr}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-navy-400 text-xs">
                  Generating QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-navy-600 leading-relaxed">
              Open WhatsApp on your phone → Linked Devices → Link a Device, and point your camera at this screen.
            </p>

            <div className="text-[11px] text-navy-400 font-semibold">
              Auto-refreshing in <span className="text-emerald-600 font-bold">{qrTimeLeft}s</span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: START NEW DIRECT MESSAGE CHAT                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showDirectMessageModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-sm font-black text-navy-900">New Direct WhatsApp Chat</h3>
              <button onClick={() => setShowDirectMessageModal(false)} className="p-1 text-navy-400 hover:bg-navy-100 rounded-full">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-navy-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={directMessageName}
                  onChange={(e) => setDirectMessageName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-navy-700 block mb-1">Phone Number (with country code) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 919876543210"
                  value={directMessageNumber}
                  onChange={(e) => setDirectMessageNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-navy-200 text-xs font-mono font-bold text-navy-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectMessageModal(false)}
                  className="flex-1 py-2 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingDirectMessage}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 transition"
                >
                  {loadingDirectMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
