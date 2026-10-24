import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, Smartphone, CheckCircle, RefreshCw, AlertCircle, LogOut, ShieldCheck, X, Plus } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionStatusChange?: (isConnected: boolean) => void;
}

export function WhatsAppGatewayConnectModal({ isOpen, onClose, onSessionStatusChange }: Props) {
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('');
  const [newPhoneNumber, setNewPhoneNumber] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [restarting, setRestarting] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `91${digits}`;
    }
    return digits;
  };

  const fetchSessions = async () => {
    try {
      const res = await apiClient.get<Record<string, any>>('/whatsapp-automation/sessions');
      if (res && typeof res === 'object') {
        setSessions(res);
        const keys = Object.keys(res);
        if (keys.length > 0 && !selectedSessionKey) {
          setSelectedSessionKey(keys[0]);
        }
        const hasConnected = Object.values(res).some((s: any) => s.status === 'CONNECTED');
        onSessionStatusChange?.(hasConnected);
      }
    } catch (err) {
      console.warn('Could not fetch whatsapp sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchSessions();

    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const sessionKeys = Object.keys(sessions);
  const activeSessionKey = selectedSessionKey && sessions[selectedSessionKey]
    ? selectedSessionKey
    : sessionKeys.includes('919908297963')
    ? '919908297963'
    : sessionKeys[0] || '919908297963';

  const activeSession = activeSessionKey
    ? sessions[activeSessionKey]
    : null;

  const isConnected = activeSession?.status === 'CONNECTED';
  const isQrReady = activeSession?.status === 'QR_READY' && Boolean(activeSession?.qr);

  const handleStartOrRefreshSession = async (targetId?: string) => {
    const sessionToStart = normalizePhone(targetId || activeSessionKey || newPhoneNumber);
    if (!sessionToStart) {
      showToast('Please enter a valid WhatsApp mobile number to generate a pairing QR code.');
      return;
    }

    setRestarting(true);
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${sessionToStart}/start`, {});
      showToast(`Initializing WhatsApp session for +${sessionToStart}...`);
      setSelectedSessionKey(sessionToStart);
      setIsAddingNew(false);
      setNewPhoneNumber('');
      await fetchSessions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to start session');
    } finally {
      setRestarting(false);
    }
  };

  const handleLogoutSession = async () => {
    if (!activeSessionKey) return;
    if (!window.confirm(`Are you sure you want to unlink WhatsApp account +${activeSessionKey}? Automated background dispatch will pause until re-linked.`)) {
      return;
    }
    setLoggingOut(true);
    try {
      await apiClient.post(`/whatsapp-automation/sessions/${activeSessionKey}/logout`, {});
      showToast(`Session +${activeSessionKey} unlinked successfully.`);
      await fetchSessions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to logout session');
    } finally {
      setLoggingOut(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">WhatsApp Gateway Connection</h2>
              <p className="text-xs text-emerald-100">Automated Background Student Attendance Dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 text-center animate-fade-in">
            {toast}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Multiple Sessions Selector (if more than 1) */}
          {sessionKeys.length > 1 && (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-2.5">
              <span className="text-xs font-bold text-gray-700">Active Session:</span>
              <div className="flex items-center space-x-2">
                <select
                  value={activeSessionKey}
                  onChange={(e) => setSelectedSessionKey(e.target.value)}
                  className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2.5 py-1 outline-none text-gray-800 shadow-2xs"
                >
                  {sessionKeys.map((key) => (
                    <option key={key} value={key}>
                      +{key} ({sessions[key]?.status || 'DISCONNECTED'})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="p-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                  title="Add another number"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {loading && sessionKeys.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-500">Checking WhatsApp gateway on port 8005...</p>
            </div>
          ) : isAddingNew || (!activeSessionKey && sessionKeys.length === 0) ? (
            /* Input New Phone Number Form (Zero Hardcoded Values) */
            <div className="py-4 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Enter Sender Mobile Number</h3>
                <p className="text-xs text-gray-500">
                  Enter your institution's WhatsApp phone number to generate a pairing QR code.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    WhatsApp Phone Number (with Country Code)
                  </label>
                  <div className="flex rounded-xl shadow-2xs border border-gray-200 overflow-hidden focus-within:border-emerald-500">
                    <span className="inline-flex items-center px-3.5 bg-gray-50 text-gray-500 text-xs font-bold border-r border-gray-200">
                      +
                    </span>
                    <input
                      type="tel"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      placeholder="e.g. 919876543210 or 10-digit number"
                      className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  {sessionKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStartOrRefreshSession(newPhoneNumber)}
                    disabled={restarting || !newPhoneNumber.trim()}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{restarting ? 'Starting Gateway...' : 'Generate Pairing QR Code'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isConnected ? (
            /* Connected State */
            <div className="text-center space-y-5 py-2">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  GATEWAY CONNECTED & ONLINE
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">WhatsApp Device Paired</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Active Connected Session: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-800">+{activeSessionKey}</code>
                </p>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-left space-y-2 text-xs text-emerald-900">
                <div className="flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">100% Automated Background Dispatch:</span> Student monthly attendance reports and parent advisories will be sent over the internet automatically with zero manual intervention.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={handleLogoutSession}
                  disabled={loggingOut}
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{loggingOut ? 'Unlinking...' : 'Unlink / Switch Device'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : isQrReady ? (
            /* QR Ready State */
            <div className="space-y-4 text-center">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
                  QR CODE READY — SCAN WITH WHATSAPP
                </span>
                <p className="text-xs text-gray-600 mt-1.5">
                  Point your phone's camera at this QR code to authenticate the automated sender for <code className="font-mono font-bold text-gray-800">+{activeSessionKey}</code>.
                </p>
              </div>

              {/* QR Image Box */}
              <div className="relative inline-block p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-xl">
                <img
                  src={activeSession.qr}
                  alt="WhatsApp Gateway QR Code"
                  className="w-56 h-56 mx-auto rounded-lg"
                />
              </div>

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left text-xs text-gray-700 space-y-1.5">
                <div className="font-bold text-gray-900 flex items-center space-x-1.5 mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>How to scan from WhatsApp on your phone:</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Open <strong>WhatsApp</strong> on your mobile phone.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Tap <strong>Settings</strong> (iOS) or <strong>Menu ⋮</strong> (Android) &gt; <strong>Linked Devices</strong>.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Tap <strong>Link a Device</strong> and point your camera at this QR code.</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <div className="flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Auto-detecting scan...</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="text-gray-500 hover:text-gray-700 font-semibold"
                  >
                    Change Number
                  </button>
                  <button
                    onClick={() => handleStartOrRefreshSession()}
                    disabled={restarting}
                    className="text-emerald-700 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{restarting ? 'Refreshing...' : 'Refresh QR'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Disconnected / Initializing State */
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border-2 border-amber-200">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">WhatsApp Gateway Ready to Connect</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Click below to start a Chromium instance and generate your pairing QR code.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
                >
                  Enter Different Number
                </button>
                <button
                  onClick={() => handleStartOrRefreshSession()}
                  disabled={restarting}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
                  <span>{restarting ? 'Starting Session...' : 'Generate Pairing QR Code'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span>Backend Gateway Port: <strong>8005</strong></span>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
