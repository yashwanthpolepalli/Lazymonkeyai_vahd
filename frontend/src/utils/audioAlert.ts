// Audio Alert System using Web Audio API for Super Admin & System Notifications

let audioCtx: AudioContext | null = null;

export function playNotificationBeep(type: 'beep' | 'success' | 'alert' = 'alert') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'alert' || type === 'beep') {
      // Attention-grabbing double high chime (880Hz -> 1760Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);

      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1760, now + 0.24);
      gain3.gain.setValueAtTime(0.45, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.55);
    } else {
      // Single success tone
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.warn('Audio alert could not be played:', e);
  }
}

export interface LiveLeadNotification {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gymName?: string;
  plan?: string;
  notes?: string;
  timestamp: string;
  read: boolean;
}

// Global broadcast channel & local storage synchronization for instant multi-tab alerts
const BROADCAST_KEY = 'VAHD_LIVE_LEADS_STREAM';

export function broadcastNewLeadAlert(lead: Omit<LiveLeadNotification, 'id' | 'timestamp' | 'read'>) {
  const newLead: LiveLeadNotification = {
    id: `lead_${Date.now()}`,
    ...lead,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false
  };

  // 1. Play sound on current tab
  playNotificationBeep('alert');

  // 2. Persist to localStorage
  try {
    const existing: LiveLeadNotification[] = JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]');
    const updated = [newLead, ...existing].slice(0, 50);
    localStorage.setItem(BROADCAST_KEY, JSON.stringify(updated));
    localStorage.setItem('VAHD_LATEST_LEAD_PING', JSON.stringify({ lead: newLead, pingTime: Date.now() }));
  } catch (e) {
    console.error('Failed to store lead in localStorage:', e);
  }

  // 3. Dispatch window CustomEvent
  window.dispatchEvent(new CustomEvent('vahd:new_lead', { detail: newLead }));
  return newLead;
}

export function getStoredLeads(): LiveLeadNotification[] {
  try {
    return JSON.parse(localStorage.getItem(BROADCAST_KEY) || '[]');
  } catch {
    return [];
  }
}
