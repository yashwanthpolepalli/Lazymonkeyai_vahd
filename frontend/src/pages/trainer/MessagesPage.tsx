import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/services/api';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

export function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState(0);
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<number, any[]>>({});

  useEffect(() => {
    api.customers.list()
      .then((data: Member[]) => {
        if (data && data.length > 0) {
          const avatars = ['from-brand-400 to-brand-600', 'from-success-400 to-success-600', 'from-warning-400 to-warning-600', 'from-ai-400 to-ai-600'];
          const samplePrompts = [
            'Coach, should I increase my bench press weight?',
            'Thank you for updating my workout plan!',
            'Feeling great after yesterday session.',
            'What target macros should I aim for today?',
          ];
          const convs = data.slice(0, 8).map((m, i) => ({
            id: m.id,
            name: m.name || (m as any).full_name || 'Gym Member',
            lastMessage: samplePrompts[i % samplePrompts.length],
            time: '10:42 AM',
            unread: i % 3 === 0 ? 1 : 0,
            avatar: avatars[i % avatars.length],
          }));
          setConversations(convs);

          // Initialize chat messages for each conversation
          const initialMap: Record<number, any[]> = {};
          convs.forEach((c, idx) => {
            initialMap[idx] = [
              { sender: 'them', text: c.lastMessage, time: '10:38 AM' },
              { sender: 'me', text: 'Hi! Let me review your training telemetry and get back to you.', time: '10:40 AM' },
            ];
          });
          setChatMessages(initialMap);
        }
      })
      .catch(() => {});
  }, []);

  const currentConv = conversations[activeChat] || {
    name: 'Member',
    avatar: 'from-brand-400 to-brand-600',
  };

  const currentThread = chatMessages[activeChat] || [];

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { sender: 'me', text: input.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMsg],
    }));
    setConversations((prev) =>
      prev.map((c, idx) => (idx === activeChat ? { ...c, lastMessage: input.trim(), time: 'Just now', unread: 0 } : c))
    );
    setInput('');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" breadcrumb={['Trainer', 'Messages']} />

      <div className="card p-0 overflow-hidden grid grid-cols-1 lg:grid-cols-3 h-[600px]">
        <div className="border-r border-navy-100 overflow-y-auto">
          <div className="p-4 border-b border-navy-100"><div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input type="text" placeholder="Search messages..." className="input-field pl-9" /></div></div>
          <div className="divide-y divide-navy-50">
            {conversations.map((c, i) => (
              <div key={c.id || i} onClick={() => setActiveChat(i)} className={cn('flex items-center gap-3 p-4 cursor-pointer transition-colors', activeChat === i ? 'bg-brand-50' : 'hover:bg-navy-50')}>
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0', c.avatar)}>{c.name.split(' ').map((n: string) => n[0]).join('')}</div>
                <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><div className="text-sm font-semibold text-navy-900 truncate">{c.name}</div><div className="text-xs text-navy-400 shrink-0">{c.time}</div></div><div className="text-xs text-navy-400 truncate">{c.lastMessage}</div></div>
                {c.unread > 0 && <div className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{c.unread}</div>}
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="p-4 text-xs text-navy-400 text-center">Loading members...</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col">
          <div className="p-4 border-b border-navy-100 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold', currentConv.avatar)}>{currentConv.name.split(' ').map((n: string) => n[0]).join('')}</div>
            <div className="flex-1"><div className="text-sm font-bold text-navy-900">{currentConv.name}</div><div className="text-xs text-success-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success-500" />Online</div></div>
            <button className="btn-ghost"><Icon name="info" size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {currentThread.map((m: any, i: number) => (
              <div key={i} className={cn('flex', m.sender === 'me' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[70%] px-4 py-2.5 rounded-2xl', m.sender === 'me' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-navy-100 text-navy-900 rounded-bl-md')}>
                  <div className="text-sm">{m.text}</div>
                  <div className={cn('text-xs mt-1', m.sender === 'me' ? 'text-brand-200' : 'text-navy-400')}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-navy-100 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="input-field flex-1" />
            <button onClick={handleSend} className="btn-primary"><Icon name="send" size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
