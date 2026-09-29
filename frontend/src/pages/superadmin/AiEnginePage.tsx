import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

const AVAILABLE_MODELS = [
  { provider: 'Google', model_id: 'gemini-3.6-flash', label: 'Google Gemini 3.6 Flash (Recommended / Ultra Fast)' },
  { provider: 'Google', model_id: 'gemini-3.5-flash', label: 'Google Gemini 3.5 Flash (Multimodal & Fast)' },
  { provider: 'Google', model_id: 'gemini-3.5-flash-lite', label: 'Google Gemini 3.5 Flash Lite (Cost Efficient)' },
  { provider: 'OpenAI', model_id: 'gpt-4o', label: 'OpenAI GPT-4o (Multimodal Vision)' },
  { provider: 'OpenAI', model_id: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini (Cost Efficient)' },
  { provider: 'Anthropic', model_id: 'claude-3-5-sonnet', label: 'Anthropic Claude 3.5 Sonnet (State-of-the-Art)' },
  { provider: 'Black Forest Labs', model_id: 'flux-1-pro', label: 'BFL Flux 1.0 Pro (High-Res Generation)' },
];

export function AiEnginePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingCapability, setTestingCapability] = useState<string | null>(null);
  const [activeEditingCap, setActiveEditingCap] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ provider: string; model_id: string } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = () => {
    api.superAdmin.aiModules()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestInference = async (capability: string) => {
    setTestingCapability(capability);
    try {
      const res = await api.superAdmin.runTestAiJob({ capability });
      setFeedbackMessage(res.message || `Test completed for ${capability}`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      loadData();
    } catch (_err) {
      console.error('Test failed:', _err);
    } finally {
      setTestingCapability(null);
    }
  };

  const handleSaveModelRouting = async (capability: string) => {
    if (!selectedModel) return;
    try {
      const res = await api.superAdmin.updateAiModelRouting({
        capability,
        provider: selectedModel.provider,
        model_id: selectedModel.model_id
      });
      setFeedbackMessage(res.message || 'Model routing updated successfully.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      setActiveEditingCap(null);
      setSelectedModel(null);
      loadData();
    } catch (_err) {
      console.error('Failed to update routing:', _err);
    }
  };

  const models = Array.isArray(data) ? data : (data?.models || []);
  const recentJobs = data?.recent_jobs || [];
  const requestsToday = data?.requests_today ?? models.reduce((s: number, m: any) => s + (m.requests || 0), 0);
  const tokensToday = data?.tokens_today ?? 0;
  const successRate = data?.success_rate ?? (models.length ? (models.reduce((s: number, m: any) => s + (m.successRate || 100), 0) / models.length) : 100);
  const avgLatency = data?.avg_latency ?? '0.8s';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader title="AI Engine Telemetry" breadcrumb={['Super Admin', 'AI Engine']} />
        <button
          onClick={() => handleTestInference('vision_ocr')}
          disabled={!!testingCapability}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Icon name="sparkles" size={16} className={cn(testingCapability && 'animate-spin')} />
          {testingCapability ? 'Testing Live Inference...' : '⚡ Test Global AI Gateway'}
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl text-xs font-semibold text-brand-900 flex items-center gap-2 animate-in fade-in">
          <Icon name="check-circle" size={16} className="text-brand-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border border-slate-100">
          <div className="stat-label mb-1 text-slate-500 font-semibold text-xs">Total Requests</div>
          <div className="text-2xl font-black text-slate-900">{requestsToday.toLocaleString()}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">● Live Telemetry Active</div>
        </div>
        <div className="card p-5 border border-slate-100">
          <div className="stat-label mb-1 text-slate-500 font-semibold text-xs">Success Rate</div>
          <div className="text-2xl font-black text-slate-900">{typeof successRate === 'number' ? successRate.toFixed(1) : successRate}%</div>
          <div className="text-xs text-slate-400 mt-1">Operational status</div>
        </div>
        <div className="card p-5 border border-slate-100">
          <div className="stat-label mb-1 text-slate-500 font-semibold text-xs">Tokens Used Today</div>
          <div className="text-2xl font-black text-slate-900">{tokensToday.toLocaleString()}</div>
          <div className="text-xs text-indigo-600 font-medium mt-1">Platform aggregate</div>
        </div>
        <div className="card p-5 border border-slate-100">
          <div className="stat-label mb-1 text-slate-500 font-semibold text-xs">Avg Latency</div>
          <div className="text-2xl font-black text-slate-900">{avgLatency}</div>
          <div className="text-xs text-slate-400 mt-1">Across all models</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Dynamic AI Model Routings & Capabilities</h3>
          <span className="text-xs text-slate-400 font-medium">Auto-fallback enabled</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : models.length > 0 ? (
            models.map((m: any, idx: number) => {
              const isEditing = activeEditingCap === m.capability;
              const isTesting = testingCapability === m.capability;

              return (
                <div key={m.id || idx} className="card p-5 border border-slate-100 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <Icon name="cpu" size={18} className="text-brand-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 capitalize">
                          {m.capability ? m.capability.replace('_', ' ') : 'AI Task'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {m.provider || 'AI Provider'} • <span className="font-mono text-slate-800 font-semibold">{m.model_id || 'Model'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={m.status === 'operational' || m.status === 'active' ? 'success' : 'warning'} dot>
                      {m.status || 'Active'}
                    </Badge>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
                      <label className="text-xs font-bold text-slate-700 block">Select AI Model for {m.capability}:</label>
                      <select
                        className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-brand-500"
                        defaultValue={`${m.provider}|||${m.model_id}`}
                        onChange={(e) => {
                          const [provider, model_id] = e.target.value.split('|||');
                          setSelectedModel({ provider, model_id });
                        }}
                      >
                        {AVAILABLE_MODELS.map((opt) => (
                          <option key={opt.model_id} value={`${opt.provider}|||${opt.model_id}`}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setActiveEditingCap(null); setSelectedModel(null); }}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveModelRouting(m.capability)}
                          className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs"
                        >
                          Save Routing
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400 font-medium">Avg Latency:</span> <span className="font-bold text-slate-900 ml-1">{m.avg_latency || '0.8s'}</span></div>
                      <div><span className="text-slate-400 font-medium">Status:</span> <span className="font-bold text-emerald-700 ml-1">Operational</span></div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveEditingCap(m.capability);
                        setSelectedModel({ provider: m.provider, model_id: m.model_id });
                      }}
                      className="text-xs font-bold text-slate-700 hover:text-brand-600 flex items-center gap-1"
                    >
                      <Icon name="sliders" size={14} />
                      Switch Model
                    </button>
                    <button
                      onClick={() => handleTestInference(m.capability)}
                      disabled={isTesting}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Icon name="play" size={12} className={cn(isTesting && 'animate-spin')} />
                      {isTesting ? 'Testing...' : 'Test Inference'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card p-8 text-center text-xs text-slate-400 font-medium col-span-2">No active model routings registered</div>
          )}
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div className="card p-5 space-y-3 border border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Live AI Jobs Stream</h3>
            <span className="text-xs text-slate-400 font-medium">Recent inference execution log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-left">
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Job ID</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Task Capability</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Active Model</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Duration</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Tokens</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="pb-2.5 font-bold uppercase tracking-wider text-[11px]">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentJobs.map((j: any) => (
                  <tr key={j.id || j.job_number} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-mono font-bold text-brand-600">{j.job_number}</td>
                    <td className="py-2.5 font-semibold text-slate-900">{j.task}</td>
                    <td className="py-2.5 text-slate-600 font-mono text-[11px]">{j.model}</td>
                    <td className="py-2.5 text-slate-700 font-medium">{j.duration}</td>
                    <td className="py-2.5 text-slate-700 font-bold">{j.tokens}</td>
                    <td className="py-2.5">
                      <Badge variant={j.status === 'completed' ? 'success' : 'warning'} size="sm" dot>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-slate-400">{j.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

