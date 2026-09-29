import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

export interface CrmTicket {
  id: string;
  customer_name?: string;
  customer_id?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface CustomerSummary {
  id: string;
  name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  membership?: string;
}

interface CustomerServiceHubProps {
  activeSubTab: string;
  onSubTabChange: (subTab: string) => void;
  onStartCall?: (contact: { name: string; phone: string; objective?: string }) => void;
}

export function CustomerServiceHub({
  activeSubTab,
  onSubTabChange,
  onStartCall,
}: CustomerServiceHubProps) {
  const [tickets, setTickets] = useState<CrmTicket[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Ticket Modal State
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    customer_id: '',
    customer_name: '',
    subject: '',
    category: 'General Support',
    priority: 'Medium',
    description: '',
    assigned_to: 'Support Desk',
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Dynamic Call logs for timeline
  const [timelineCalls, setTimelineCalls] = useState<any[]>([]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<CrmTicket[]>('/crm/tickets');
      setTickets(Array.isArray(res) ? res : []);
    } catch (_err) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimelineData = async () => {
    try {
      const res = await apiClient.get<any[]>('/crm/calls');
      setTimelineCalls(Array.isArray(res) ? res : []);
    } catch (_err) {
      setTimelineCalls([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get<CustomerSummary[]>('/members');
      setCustomers(Array.isArray(res) ? res : []);
    } catch (_err) {
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchTimelineData();
    fetchCustomers();
  }, []);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Subtab category filtering
      if (activeSubTab === 'complaints') {
        const isComplaint =
          t.category.toLowerCase().includes('complaint') ||
          t.category.toLowerCase().includes('equipment') ||
          t.category.toLowerCase().includes('facility') ||
          t.priority === 'High' ||
          t.priority === 'Urgent';
        if (!isComplaint) return false;
      } else if (activeSubTab === 'returns') {
        const isReturn =
          t.category.toLowerCase().includes('billing') ||
          t.category.toLowerCase().includes('payment') ||
          t.subject.toLowerCase().includes('refund') ||
          t.subject.toLowerCase().includes('return');
        if (!isReturn) return false;
      }

      const matchSearch =
        searchQuery === '' ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'All' ||
        t.status.toLowerCase() === statusFilter.toLowerCase();

      const matchCategory =
        categoryFilter === 'All Categories' ||
        t.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchPriority =
        priorityFilter === 'All Priorities' ||
        t.priority.toLowerCase() === priorityFilter.toLowerCase();

      return matchSearch && matchStatus && matchCategory && matchPriority;
    });
  }, [tickets, searchQuery, statusFilter, categoryFilter, priorityFilter, activeSubTab]);

  // Metric Counts
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const urgentCount = tickets.filter(
    (t) => (t.priority === 'Urgent' || t.priority === 'High') && t.status !== 'Resolved'
  ).length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  // Handle Ticket Submit
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      triggerToast('Please provide a subject and description');
      return;
    }

    setSubmittingTicket(true);
    try {
      let custName = ticketForm.customer_name;
      if (ticketForm.customer_id) {
        const found = customers.find((c) => c.id === ticketForm.customer_id);
        if (found) custName = found.name || found.full_name || custName;
      }

      await apiClient.post('/crm/tickets', {
        ...ticketForm,
        customer_name: custName || 'Walk-in Guest',
      });

      triggerToast('✅ Support ticket created successfully!');
      setNewTicketModalOpen(false);
      setTicketForm({
        customer_id: '',
        customer_name: '',
        subject: '',
        category: 'General Support',
        priority: 'Medium',
        description: '',
        assigned_to: 'Support Desk',
      });
      fetchTickets();
    } catch (_err) {
      triggerToast('Failed to create ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Status toggle
  const handleToggleStatus = async (ticket: CrmTicket) => {
    const newStatus = ticket.status === 'Resolved' ? 'Open' : 'Resolved';
    try {
      await apiClient.patch(`/crm/tickets/${ticket.id}/status`, { status: newStatus });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t))
      );
      triggerToast(`Ticket #${ticket.id} marked as ${newStatus}`);
    } catch (_err) {
      triggerToast('Failed to update ticket status');
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await apiClient.delete(`/crm/tickets/${id}`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      triggerToast('Ticket deleted successfully');
    } catch (_err) {
      triggerToast('Failed to delete ticket');
    }
  };

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
      {/* 1. HEADER: Exact match to Screenshot 1                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            {activeSubTab === 'support_tickets' && 'Support Tickets'}
            {activeSubTab === 'complaints' && 'Customer Complaints & Grievances'}
            {activeSubTab === 'returns' && 'Refunds & Membership Returns'}
            {activeSubTab === 'feedback' && 'Member Reviews & NPS Feedback'}
            {activeSubTab === 'timeline' && '360° Customer Interaction Timeline'}
          </h2>
          <p className="text-xs text-navy-500 mt-0.5">
            {activeSubTab === 'support_tickets' &&
              'Manage, triage, and resolve customer support cases and technical inquiries.'}
            {activeSubTab === 'complaints' &&
              'Track member escalation reports, facility concerns, and trainer conduct tickets.'}
            {activeSubTab === 'returns' &&
              'Audit membership cancellation requests, credit note adjustments, and return policies.'}
            {activeSubTab === 'feedback' &&
              'Monitor real-time gym member satisfaction ratings, amenity reviews, and NPS scores.'}
            {activeSubTab === 'timeline' &&
              'Complete audit trail of turnstile logs, attendance, payments, tickets, and AI calls.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTickets}
            className="p-2.5 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 shadow-sm transition active:scale-95"
            title="Refresh tickets"
          >
            <Icon name="refresh-cw" size={15} />
          </button>

          <button
            onClick={() => setNewTicketModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-2 transition hover:scale-[1.02] active:scale-95"
          >
            <Icon name="plus" size={15} />
            <span>+ New Ticket</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 4 METRIC STAT CARDS: Matching Screenshot 1                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-navy-600 block">Open Tickets</span>
            <span className="text-3xl font-black text-navy-900">{openCount}</span>
            <span className="text-[11px] text-brand-600 font-semibold block">Awaiting resolution</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
            <Icon name="info" size={16} />
          </div>
        </div>

        {/* High & Urgent */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-navy-600 block">High & Urgent</span>
            <span className="text-3xl font-black text-red-600">{urgentCount}</span>
            <span className="text-[11px] text-red-600 font-semibold block">Immediate triage needed</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <Icon name="flag" size={16} />
          </div>
        </div>

        {/* In Progress */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-navy-600 block">In Progress</span>
            <span className="text-3xl font-black text-navy-900">{inProgressCount}</span>
            <span className="text-[11px] text-amber-600 font-semibold block">Actively being worked</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Icon name="clock" size={16} />
          </div>
        </div>

        {/* Resolved */}
        <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-navy-600 block">Resolved</span>
            <span className="text-3xl font-black text-emerald-600">{resolvedCount}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block">Successfully closed</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="check-circle" size={16} />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SUB-VIEW: FEEDBACK RATINGS & REVIEWS                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'feedback' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 bg-white border border-navy-100 rounded-2xl">
              <span className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">Total Member Cases</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-navy-900">{tickets.length}</span>
              </div>
              <span className="text-xs text-navy-500 font-medium">Logged feedback & support tickets</span>
            </div>

            <div className="card p-5 bg-white border border-navy-100 rounded-2xl">
              <span className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">Resolution Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-emerald-600">
                  {tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0}%
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">Live Status</span>
              </div>
              <span className="text-xs text-navy-500 font-medium">{resolvedCount} of {tickets.length} cases resolved</span>
            </div>

            <div className="card p-5 bg-white border border-navy-100 rounded-2xl">
              <span className="text-xs font-bold text-navy-400 uppercase tracking-wider block mb-1">Open Feedback Queue</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-brand-600">{openCount + inProgressCount}</span>
                <span className="text-xs text-brand-600 font-bold">Active Cases</span>
              </div>
              <span className="text-xs text-navy-500 font-medium">Under active review & triage</span>
            </div>
          </div>

          <div className="card overflow-hidden bg-white border border-navy-100 rounded-2xl shadow-sm divide-y divide-navy-100">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-navy-400">
                <Icon name="message-square" size={32} className="mx-auto mb-2 opacity-40 text-navy-400" />
                <p className="text-sm font-bold text-navy-600">No member feedback records logged yet</p>
                <p className="text-xs text-navy-400 mt-1">Create a support or feedback ticket to start tracking customer satisfaction.</p>
                <button
                  onClick={() => setNewTicketModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow hover:bg-brand-700 transition"
                >
                  + Log New Ticket
                </button>
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-navy-50/40 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-navy-900">{t.customer_name || 'Member'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-100 text-navy-700">{t.category}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'Resolved' || t.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{t.status}</span>
                    </div>
                    <p className="text-xs font-semibold text-navy-800">{t.subject}</p>
                    <p className="text-xs text-navy-600">{t.description}</p>
                    <span className="text-[11px] text-navy-400">{t.created_at}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        t.status === 'Resolved'
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                          : 'border-navy-200 text-navy-700 hover:bg-navy-100'
                      }`}
                    >
                      {t.status === 'Resolved' ? '✓ Resolved' : 'Mark Resolved'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SUB-VIEW: CUSTOMER TIMELINE                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'timeline' && (
        <div className="card p-6 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <h3 className="text-sm font-black text-navy-900 uppercase tracking-wider">Live Interaction History</h3>
            <span className="text-xs text-navy-400">Omnichannel touchpoints from database</span>
          </div>

          {tickets.length === 0 && timelineCalls.length === 0 ? (
            <div className="p-12 text-center text-navy-400">
              <Icon name="clock" size={32} className="mx-auto mb-2 opacity-40 text-navy-400" />
              <p className="text-sm font-bold text-navy-600">No customer interactions logged in timeline</p>
              <p className="text-xs text-navy-400 mt-1">Support tickets and voice consultations will automatically populate here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-200">
              {[
                ...tickets.map((t) => ({
                  time: t.created_at,
                  title: `Support Ticket: ${t.subject}`,
                  desc: `${t.customer_name || 'Customer'} • Category: ${t.category} • Priority: ${t.priority} • Status: ${t.status}`,
                  icon: 'life-buoy',
                  color: t.status === 'Resolved' ? 'bg-emerald-500 text-white' : 'bg-brand-500 text-white',
                })),
                ...timelineCalls.map((c) => ({
                  time: c.created_at,
                  title: `AI Voice Call: ${c.contact_name}`,
                  desc: `${c.phone} • Duration: ${c.duration_formatted} • Sentiment: ${c.sentiment} • Score: ${c.qualification_score}%`,
                  icon: 'phone',
                  color: 'bg-indigo-500 text-white',
                })),
              ].map((event, idx) => (
                <div key={idx} className="relative group">
                  <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${event.color} ring-4 ring-white shadow-sm`}>
                    <Icon name={event.icon} size={10} />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-navy-400 block">{event.time}</span>
                    <h4 className="text-xs font-bold text-navy-900">{event.title}</h4>
                    <p className="text-xs text-navy-600">{event.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. TICKETS / COMPLAINTS / RETURNS TABLE: Matches Screenshot 1 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {['support_tickets', 'complaints', 'returns'].includes(activeSubTab) && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Icon
                name="search"
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400"
              />
              <input
                type="text"
                placeholder="Search by subject, customer, ticket ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200'
                  }`}
                >
                  {st}
                </button>
              ))}

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-700 shadow-sm"
              >
                <option value="All Categories">All Categories</option>
                <option value="General Support">General Support</option>
                <option value="Billing & Payment">Billing & Payment</option>
                <option value="Trainer / Service">Trainer / Service</option>
                <option value="Equipment / Facility">Equipment / Facility</option>
              </select>
            </div>
          </div>

          {/* Table / Empty State */}
          {filteredTickets.length === 0 ? (
            <div className="card p-16 bg-white border border-navy-100 rounded-3xl shadow-sm text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-navy-50 flex items-center justify-center text-navy-400">
                <Icon name="message-square" size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-navy-900">No Support Tickets Found</h4>
                <p className="text-xs text-navy-400">
                  No support tickets have been created yet. Click '+ New Ticket' to create one.
                </p>
              </div>
              <button
                onClick={() => setNewTicketModalOpen(true)}
                className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
              >
                + New Ticket
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden bg-white border border-navy-100 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                    <th className="py-3 px-4">TICKET ID / SUBJECT</th>
                    <th className="py-3 px-4">CUSTOMER</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">PRIORITY</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">CREATED</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 text-xs">
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-navy-50/40 transition">
                      <td className="py-3.5 px-4 font-bold text-navy-900">
                        <span className="text-[10px] text-navy-400 font-mono block">#{t.id}</span>
                        {t.subject}
                      </td>
                      <td className="py-3.5 px-4 text-navy-700 font-semibold">{t.customer_name}</td>
                      <td className="py-3.5 px-4 text-navy-600">{t.category}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.priority === 'Urgent' || t.priority === 'High'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-navy-50 text-navy-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.status === 'In Progress'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-navy-400 text-[11px]">{t.created_at}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(t)}
                            className="px-2.5 py-1 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 font-bold text-[11px] transition"
                          >
                            {t.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            className="p-1 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete ticket"
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
      {/* 6. MODAL: + NEW TICKET                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {newTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-black text-navy-900">Create New Support Ticket</h3>
                <p className="text-xs text-navy-400 mt-0.5">Log an operational issue, grievance, or support request</p>
              </div>
              <button
                onClick={() => setNewTicketModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Select Member / Customer</label>
                <select
                  value={ticketForm.customer_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const found = customers.find((c) => c.id === cId);
                    setTicketForm({
                      ...ticketForm,
                      customer_id: cId,
                      customer_name: found ? found.name || found.full_name || '' : '',
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Walk-in / Guest / General --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.full_name} ({c.phone || 'No phone'}) - {c.membership || 'Standard'}
                    </option>
                  ))}
                </select>
              </div>

              {!ticketForm.customer_id && (
                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Customer / Guest Name</label>
                  <input
                    type="text"
                    value={ticketForm.customer_name}
                    onChange={(e) => setTicketForm({ ...ticketForm, customer_name: e.target.value })}
                    placeholder="Enter customer name..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Ticket Subject *</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="e.g. Locker RFID lock failure on 2nd floor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="General Support">General Support</option>
                    <option value="Billing & Payment">Billing & Payment</option>
                    <option value="Trainer / Service">Trainer / Service</option>
                    <option value="Equipment / Facility">Equipment / Facility</option>
                    <option value="Membership">Membership</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-navy-700 block mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Detailed Description *</label>
                <textarea
                  rows={3}
                  required
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Describe the member's issue or escalation..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTicketModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 transition disabled:opacity-50"
                >
                  {submittingTicket ? 'Logging Ticket...' : 'Log Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
