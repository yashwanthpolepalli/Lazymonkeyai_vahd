import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface AuditLogItem {
  id: string;
  actor: string;
  action: string;
  organization: string;
  resource_type: string;
  resource_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address: string;
  timestamp: string;
}

const actionStyles: Record<string, { variant: 'brand' | 'success' | 'warning' | 'danger' | 'purple'; icon: string }> = {
  ONBOARD_ORGANIZATION: { variant: 'success', icon: 'building-2' },
  ONBOARD_OWNER_CREDENTIALS: { variant: 'success', icon: 'key' },
  RESET_OWNER_CREDENTIALS: { variant: 'warning', icon: 'key' },
  CHANGE_OWNER_STATUS: { variant: 'danger', icon: 'shield-alert' },
  CHANGE_ORGANIZATION_STATUS: { variant: 'warning', icon: 'shield-alert' },
  CHANGE_PLAN: { variant: 'purple', icon: 'credit-card' },
  UPDATE_FEATURE_FLAGS: { variant: 'brand', icon: 'toggle-left' },
  UPDATE_SETTINGS: { variant: 'brand', icon: 'settings' },
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    api.superAdmin.auditLogs()
      .then((data) => {
        setLogs(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    return (
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.organization.toLowerCase().includes(search.toLowerCase()) ||
      l.resource_type.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Security & Audit Trail"
        breadcrumb={['Super Admin', 'Audit Logs']}
        actions={
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
            Total Events: <span className="text-brand-600 font-bold">{logs.length}</span>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by actor, action, gym..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <button onClick={fetchLogs} className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3">
          <Icon name="refresh-cw" size={14} /> Refresh Logs
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="card p-4">
        {loading ? (
          <SkeletonTable rows={8} cols={6} />
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[850px] text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-400 text-left font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3">Timestamp</th>
                  <th className="px-3 py-3">Actor</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Target Scope</th>
                  <th className="px-3 py-3">IP Address</th>
                  <th className="px-3 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filteredLogs.map((l) => {
                  const style = actionStyles[l.action] || { variant: 'brand', icon: 'activity' };
                  return (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLog(l)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 font-mono text-slate-500">{l.timestamp}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900">{l.actor}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={style.variant} size="sm" dot>
                          {l.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{l.organization}</div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase">{l.resource_type}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-400">{l.ip_address || '127.0.0.1'}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(l);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-[11px]"
                        >
                          Diff
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Icon name="shield-check" size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">No Audit Events Logged</h4>
            <p className="text-xs text-slate-500">Security and configuration actions will automatically stream here.</p>
          </div>
        )}
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl border border-slate-100 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant={actionStyles[selectedLog.action]?.variant || 'brand'} size="sm">
                  {selectedLog.action}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">{selectedLog.timestamp}</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Triggered By:</span>
                <span className="font-bold text-slate-900">{selectedLog.actor}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block mb-0.5">Target Organization:</span>
                <span className="font-bold text-slate-900">{selectedLog.organization}</span>
              </div>
            </div>

            {/* Side-by-side JSON Diff */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Mutation State Diff</div>
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
                  <div className="text-rose-700 font-bold mb-1.5 flex items-center gap-1">
                    <Icon name="minus" size={12} /> Previous State
                  </div>
                  <pre className="text-slate-700 overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.old_value ? JSON.stringify(selectedLog.old_value, null, 2) : 'null'}
                  </pre>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <div className="text-emerald-700 font-bold mb-1.5 flex items-center gap-1">
                    <Icon name="plus" size={12} /> Updated State
                  </div>
                  <pre className="text-slate-700 overflow-x-auto whitespace-pre-wrap">
                    {selectedLog.new_value ? JSON.stringify(selectedLog.new_value, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="btn-secondary py-2 px-4 text-xs font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
