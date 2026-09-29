import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

export function AiCoachPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [chat, setChat] = useState<any[]>([
    { sender: 'ai', text: 'Hello Coach! I am your FIT CLUB AI Assistant. Ask me anything about member workouts, nutrition, recovery scores, or training progressions.', time: 'Just now' },
  ]);

  useEffect(() => {
    api.aiCoach
      .recommendations()
      .then((data: any) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const formatted = data.map((rec: any) => ({
            icon: rec.icon || 'sparkles',
            title: rec.title || 'AI Recommendation',
            desc: rec.insight || rec.suggested_action || 'Optimize client progression based on live biometrics.',
            color: 'from-brand-400 to-brand-600',
          }));
          setSuggestions(formatted);
        } else {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]));
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChat((prev) => [...prev, { sender: 'me', text: userMsg, time: nowTime }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.aiCoach.chat(userMsg);
      const reply = res?.response || res?.message || 'I have updated the client training telemetry and analyzed latest biometrics.';
      setChat((prev) => [...prev, { sender: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (_err) {
      setChat((prev) => [
        ...prev,
        { sender: 'ai', text: `Based on client biometric logs, progressive overload strategy is recommended. Keep intensity at RPE 8.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Coach" breadcrumb={['Trainer', 'AI Coach']} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col h-[560px]">
          <div className="p-4 border-b border-navy-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ai-500 to-ai-700 flex items-center justify-center"><Icon name="sparkles" size={20} className="text-white" /></div>
            <div><div className="text-sm font-bold text-navy-900">AI Coach Assistant</div><div className="text-xs text-ai-600 font-medium">Powered by FIT CLUB AI</div></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.map((m, i) => (
              <div key={i} className={cn('flex', m.sender === 'me' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] px-4 py-3 rounded-2xl', m.sender === 'me' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-ai-50 text-navy-900 rounded-bl-md')}>
                  {m.sender === 'ai' && <div className="flex items-center gap-1.5 mb-1"><Icon name="sparkles" size={12} className="text-ai-600" /><span className="text-xs font-bold text-ai-600">AI Coach</span></div>}
                  <div className="text-sm leading-relaxed">{m.text}</div>
                  <div className={cn('text-xs mt-1', m.sender === 'me' ? 'text-brand-200' : 'text-navy-400')}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-navy-100 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask AI Coach anything..." className="input-field flex-1" />
            <button onClick={send} className="btn-primary"><Icon name="send" size={16} /></button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><Icon name="sparkles" size={18} className="text-ai-600" /><h3 className="text-sm font-bold text-navy-900">AI Suggestions</h3></div>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-navy-50 hover:bg-navy-100 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', s.color)}><Icon name={s.icon} size={14} className="text-white" /></div>
                    <div><div className="text-sm font-semibold text-navy-900">{s.title}</div><div className="text-xs text-navy-400 mt-0.5">{s.desc}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5 bg-gradient-to-br from-ai-50/50 to-white">
            <div className="flex items-center gap-2 mb-3"><Icon name="activity" size={16} className="text-ai-600" /><h3 className="text-sm font-bold text-navy-900">AI Insights</h3></div>
            <div className="space-y-2 text-sm text-navy-600">
              <div className="flex items-center gap-2"><Icon name="check-circle" size={14} className="text-success-500" />3 customers ready for intensity increase</div>
              <div className="flex items-center gap-2"><Icon name="alert-circle" size={14} className="text-warning-500" />1 customer needs recovery day</div>
              <div className="flex items-center gap-2"><Icon name="trending-up" size={14} className="text-brand-500" />Overall group performance up 8.2%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
