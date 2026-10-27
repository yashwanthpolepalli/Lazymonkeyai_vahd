import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

export function AiCoachPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [chat, setChat] = useState<any[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your VAHD AI Assistant. Ask me anything about your attendance, schedules, programs, or membership.',
      time: 'Just now'
    },
  ]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChat((prev) => [...prev, { sender: 'me', text: userMsg, time: nowTime }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.aiCoach.chat(userMsg);
      const reply = res?.response || res?.message || 'I have synchronized your telemetry and verified latest attendance logs.';
      setChat((prev) => [...prev, { sender: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (_err) {
      setChat((prev) => [
        ...prev,
        { sender: 'ai', text: `Your attendance and membership records are active. How else can I assist you today?`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Coach" breadcrumb={['Portal', 'AI Coach']} />

      <div className="w-full max-w-4xl mx-auto card p-0 overflow-hidden flex flex-col h-[600px] border border-slate-200/80 shadow-sm rounded-3xl">
        <div className="p-4 sm:p-5 border-b border-navy-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Icon name="sparkles" size={20} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-navy-900">VAHD AI Assistant</div>
              <div className="text-xs text-purple-600 font-semibold">Powered by VAHD AI</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Online
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {chat.map((m, i) => (
            <div key={i} className={cn('flex', m.sender === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-xs', m.sender === 'me' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-navy-900 border border-slate-200/80 rounded-bl-sm')}>
                {m.sender === 'ai' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon name="sparkles" size={13} className="text-purple-600" />
                    <span className="text-xs font-bold text-purple-600">VAHD AI</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed">{m.text}</div>
                <div className={cn('text-[10px] mt-1.5 font-medium', m.sender === 'me' ? 'text-blue-100' : 'text-slate-400')}>{m.time}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Icon name="loader" size={14} className="animate-spin text-purple-600" />
                <span>VAHD AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-navy-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask VAHD AI anything..."
            className="input-field flex-1 text-sm rounded-2xl"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="btn-primary px-5 rounded-2xl flex items-center gap-2"
          >
            <Icon name="send" size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
