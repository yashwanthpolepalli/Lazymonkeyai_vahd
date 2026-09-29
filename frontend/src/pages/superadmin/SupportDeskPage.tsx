import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface SupportTicketItem {
  id: string;
  ticket_number: string;
  organization_name: string;
  user_name: string;
  user_email: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'investigating' | 'escalated' | 'resolved';
  created_at: string;
  resolved_at: string;
}

const priorityConfig: Record<string, { variant: 'danger' | 'warning' | 'brand' | 'gray'; label: string }> = {
  urgent: { variant: 'danger', label: 'Urgent' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'brand', label: 'Medium' },
  low: { variant: 'gray', label: 'Low' },
};

const statusConfig: Record<string, { variant: 'danger' | 'warning' | 'purple' | 'success'; label: string }> = {
  open: { variant: 'danger', label: 'Open' },
  investigating: { variant: 'warning', label: 'Investigating' },
  escalated: { variant: 'purple', label: 'Escalated' },
  resolved: { variant: 'success', label: 'Resolved' },
};

export function SupportDeskPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);

  // New Ticket Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    organization_name: '',
    user_name: '',
    user_email: '',
    subject: '',
    description: '',
    priority: 'medium',
  });

  const fetchTickets = () => {
    setLoading(true);
    api.superAdmin.supportTickets()
      .then((data) => {
        setTickets(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      await api.superAdmin.updateSupportTicketStatus(ticketId, newStatus);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
      fetchTickets();
    } catch (_err) {
      /* ignore */
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    setCreating(true);
    try {
      await api.superAdmin.createSupportTicket(form);
      setCreateOpen(false);
      setForm({ organization_name: '', user_name: '', user_email: '', subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (_err) {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter.toLowerCase();
    const matchesSearch =
      !search ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.organization_name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const investigatingCount = tickets.filter((t) => t.status === 'investigating').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & Escalations Desk"
        breadcrumb={['Super Admin', 'Support']}
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
            <Icon name="plus" size={16} /> New Support Ticket
          </button>
        }
      />

      {/* KPI Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-danger-500">
          <div className="stat-label mb-1">Open Tickets</div>
          <div className="text-2xl font-black text-slate-900">{openCount}</div>
          <div className="text-xs text-danger-600 font-semibold mt-1">Requires triage</div>
        </div>
        <div className="card p-5 border-l-4 border-l-warning-500">
          <div className="stat-label mb-1">Investigating</div>
          <div className="text-2xl font-black text-slate-900">{investigatingCount}</div>
          <div className="text-xs text-warning-600 font-semibold mt-1">In progress</div>
        </div>
        <div className="card p-5 border-l-4 border-l-rose-600">
          <div className="stat-label mb-1">Urgent SLA</div>
          <div className="text-2xl font-black text-rose-600">{urgentCount}</div>
          <div className="text-xs text-rose-500 font-semibold mt-1">Immediate action</div>
        </div>
        <div className="card p-5 border-l-4 border-l-success-500">
          <div className="stat-label mb-1">Resolved</div>
          <div className="text-2xl font-black text-slate-900">{resolvedCount}</div>
          <div className="text-xs text-success-600 font-semibold mt-1">Closed successfully</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets by ID, subject, or gym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card p-4">
        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : filteredTickets.length > 0 ? (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[850px] text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-400 text-left font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3">Ticket ID</th>
                  <th className="px-3 py-3">Organization</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Priority</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Reported Time</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-3 font-mono font-bold text-brand-600">{t.ticket_number}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{t.organization_name || 'Global'}</td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-800 line-clamp-1">{t.subject}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{t.description}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={priorityConfig[t.priority]?.variant || 'gray'} size="sm">
                        {t.priority.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={statusConfig[t.status]?.variant || 'gray'} dot size="sm">
                        {statusConfig[t.status]?.label || t.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{t.created_at || '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(t);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="check-circle" size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">All clear</h4>
            <p className="text-xs text-slate-500">No support tickets found matching this filter.</p>
          </div>
        )}
      </div>

      {/* Ticket Inspector & Triage Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-brand-600 text-sm">{selectedTicket.ticket_number}</span>
                <Badge variant={priorityConfig[selectedTicket.priority]?.variant || 'gray'} size="sm">
                  {selectedTicket.priority.toUpperCase()}
                </Badge>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Reported by {selectedTicket.user_name || 'Admin'} ({selectedTicket.organization_name}) on {selectedTicket.created_at}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto">
                {selectedTicket.description}
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-2">Change Ticket Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'investigating')}
                    className="py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all border border-amber-200"
                  >
                    Investigate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'escalated')}
                    className="py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 transition-all border border-purple-200"
                  >
                    Escalate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, 'resolved')}
                    className="py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedTicket(null)} className="btn-secondary py-2 px-4 text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="message-square" size={18} className="text-brand-600" /> Create Support Ticket
              </h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gym / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PowerZone Fitness"
                    value={form.organization_name}
                    onChange={(e) => setForm((p) => ({ ...p, organization_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of operational issue..."
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide full context or steps to reproduce..."
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary py-2 px-4 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary py-2 px-4 font-bold">
                  {creating ? 'Submitting...' : 'File Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
