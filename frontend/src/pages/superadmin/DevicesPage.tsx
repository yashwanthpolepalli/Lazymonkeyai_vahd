import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { Device } from '@/types';
import { cn } from '@/utils/cn';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger'; color: string; bg: string }> = {
  online: { variant: 'success', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warning: { variant: 'warning', color: 'text-amber-600', bg: 'bg-amber-50' },
  offline: { variant: 'danger', color: 'text-rose-600', bg: 'bg-rose-50' },
};

const typeIcons: Record<string, string> = {
  cctv: 'cctv',
  biometric: 'fingerprint',
  face_recognition: 'user-check',
  body_scanner: 'ruler',
  pos: 'credit-card',
};

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // New Device Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'biometric',
    ip: '192.168.1.',
    port: 4370,
    location: 'Main Branch Entrance',
    network: 'WiFi',
    serialNumber: '',
  });

  const loadDevices = () => {
    api.superAdmin.devices().then((data) => {
      setDevices(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handlePingDevice = async (device: Device) => {
    setPingingDeviceId(device.id);
    try {
      const res = await api.superAdmin.pingDevice(device.id);
      setFeedbackMessage(res.message || `Heartbeat confirmed for ${device.name}`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      loadDevices();
    } catch (_err) {
      console.error('Ping failed:', _err);
    } finally {
      setPingingDeviceId(null);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      const res = await api.superAdmin.registerDevice(formData);
      setFeedbackMessage(res.message || 'Hardware device registered successfully.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        type: 'biometric',
        ip: '192.168.1.',
        port: 4370,
        location: 'Main Branch Entrance',
        network: 'WiFi',
        serialNumber: '',
      });
      loadDevices();
    } catch (_err) {
      console.error('Registration failed:', _err);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to decommission ${deviceName}?`)) return;
    try {
      const res = await api.superAdmin.deleteDevice(deviceId);
      setFeedbackMessage(res.message || 'Device decommissioned.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      loadDevices();
    } catch (_err) {
      console.error('Failed to delete device:', _err);
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.location && d.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((d as any).ip && (d as any).ip.includes(searchQuery));
    const matchesType = selectedType === 'all' || d.type === selectedType;
    return matchesSearch && matchesType;
  });

  const online = devices.filter(d => (d.status || '').toLowerCase() === 'online').length;
  const warning = devices.filter(d => (d.status || '').toLowerCase() === 'warning').length;
  const offline = devices.filter(d => (d.status || '').toLowerCase() === 'offline').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader title="Hardware & Device Fleet" breadcrumb={['Super Admin', 'Devices']} />
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Icon name="plus" size={16} />
          Register New Device
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-3 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Icon name="wifi" size={22} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{online}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Online & Healthy</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Icon name="alert-circle" size={22} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{warning}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Warning State</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3 border border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <Icon name="wifi-off" size={22} className="text-rose-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{offline}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Offline / Disconnected</div>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-4 border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All Fleet' },
              { id: 'biometric', label: 'Turnstiles & Biometrics' },
              { id: 'face_recognition', label: 'Face Cam Terminals' },
              { id: 'body_scanner', label: 'InBody Scanners' },
              { id: 'cctv', label: 'CCTV Feeds' },
              { id: 'pos', label: 'POS Terminals' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  selectedType === tab.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search devices, IP, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 outline-none"
            />
            <Icon name="search" size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>
        </div>

        {loading ? <SkeletonTable rows={5} cols={7} /> : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  {['Device Name & Spec', 'Type', 'Status', 'Last Heartbeat', 'Location', 'Network & IP', 'Firmware', 'Actions'].map((h) => (
                    <th key={h} className="text-left font-bold uppercase tracking-wider text-[11px] px-3 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDevices.map((d: any) => {
                  const statusKey = (d.status || 'online').toLowerCase();
                  const cfg = statusConfig[statusKey] || statusConfig.online;
                  const isPinging = pingingDeviceId === d.id;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                            <Icon name={typeIcons[d.type] || 'server'} size={16} className={cfg.color} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{d.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{d.serialNumber || d.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-600 capitalize">
                        {d.type ? d.type.replace('_', ' ') : 'Hardware'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={cfg.variant} dot>
                          {d.status || 'online'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-600">{d.lastHeartbeat || 'Just now'}</td>
                      <td className="px-3 py-3 text-slate-600 font-medium">{d.location || 'Main Branch'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Icon name={d.network === 'WiFi' ? 'wifi' : 'server'} size={13} className="text-slate-400" />
                          <span>{d.network || 'Ethernet'}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({d.ip || '192.168.1.1'}:{d.port || 4370})</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-500 font-semibold">{d.version || 'v2.4.1'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePingDevice(d)}
                            disabled={isPinging}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold flex items-center gap-1 transition-all shadow-2xs"
                            title="Send ICMP & Socket Ping"
                          >
                            <Icon name="refresh-cw" size={11} className={cn(isPinging && 'animate-spin')} />
                            {isPinging ? 'Pinging...' : 'Ping'}
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(d.id, d.name)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                            title="Decommission device"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Icon name="plus" size={16} className="text-brand-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Register Hardware Device</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. eSSL Turnstile Entry Gate 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Device Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  >
                    <option value="biometric">Biometric Turnstile</option>
                    <option value="face_recognition">Face Recognition Cam</option>
                    <option value="body_scanner">InBody Composition Scanner</option>
                    <option value="cctv">CCTV Stream Camera</option>
                    <option value="pos">POS Terminal</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Network Type</label>
                  <select
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  >
                    <option value="WiFi">WiFi (Wireless)</option>
                    <option value="Ethernet">Ethernet LAN (Wired)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">IP Address</label>
                  <input
                    type="text"
                    required
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    className="w-full p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 4370 })}
                    className="w-full p-2.5 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Gym Location / Zone</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Entrance, Free Weights Area"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 shadow-sm font-bold"
                >
                  Save & Connect Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

