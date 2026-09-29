import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { BarChart, HourlyDistributionChart } from '@/components/ui/Charts';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface BiometricDeviceItem {
  id: string;
  device_name: string;
  serial_number?: string;
  model_name?: string;
  ip_address?: string;
  port?: number;
  location?: string;
  status: string;
  device_type?: string;
}

interface BiometricScanItem {
  id: string;
  customer_id?: string;
  customer_name?: string;
  timestamp: string;
  event_type: string;
  device_id?: string;
  device_name?: string;
  device_type?: string;
  direction: string;
  status: string;
  confidence_score?: number;
}

interface AttendanceAnalytics {
  today_checkins: number;
  today_events: number;
  today_granted?: number;
  today_denied?: number;
  today_success_rate?: number;
  peak_hour: string;
  hourly_data: number[];
  hourly_labels: string[];
  weekly_trend: Array<{ date: string; label: string; count: number }>;
}

export function BiometricsPage({ embedded = false }: { embedded?: boolean }) {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [devices, setDevices] = useState<BiometricDeviceItem[]>([]);
  const [scans, setScans] = useState<BiometricScanItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modal States
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);

  // New Device Form State
  const [newDevice, setNewDevice] = useState({
    device_name: '',
    serial_number: '',
    model_name: '',
    device_type: 'essl',
    ip_address: '',
    port: 4370,
    location: '',
  });


  // Manual Checkin Form State
  const [manualCheckin, setManualCheckin] = useState({
    customer_id: '',
    event_type: 'FACE_SCAN',
    direction: 'CHECK_IN',
    status: 'SUCCESS',
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.biometrics.analytics(undefined, true).catch(() => null),
      api.biometrics.devices().catch(() => null),
      api.biometrics.recent(50, undefined, true).catch(() => []),
      api.members.list().catch(() => []),
    ])
      .then(([analyticsRes, devicesRes, scanRes, membersRes]) => {
        if (analyticsRes) setAnalytics(analyticsRes);
        
        let devList: BiometricDeviceItem[] = [];
        if (Array.isArray(devicesRes)) {
          devList = devicesRes;
        } else if (devicesRes && Array.isArray(devicesRes.devices)) {
          devList = devicesRes.devices;
        }
        setDevices(devList);

        // Strict physical biometric hardware logs filter
        const physicalScans = (scanRes || []).filter((s: BiometricScanItem) => {
          const devType = (s.device_type || '').toUpperCase();
          const devId = (s.device_id || '').toLowerCase();
          const eventType = (s.event_type || '').toUpperCase();
          const devName = (s.device_name || '').toLowerCase();
          if (devType === 'GEOFENCE_ESS' || devId === 'ess_geofence_portal' || eventType === 'GPS_SCAN') return false;
          if (devName.includes('gps mobile')) return false;
          return true;
        });

        setScans(physicalScans);
        setMembers(membersRes || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevice.device_name) return;
    try {
      await api.biometrics.registerDevice(newDevice);
      setDeviceModalOpen(false);
      setNewDevice({
        device_name: '',
        serial_number: '',
        model_name: '',
        device_type: 'essl',
        ip_address: '',
        port: 4370,
        location: '',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to register device:', err);
    }
  };

  const handleManualCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const physicalDev = devices.find((d) => (d.status || '').toLowerCase() === 'online') || devices[0];
      const payload = {
        customer_id: manualCheckin.customer_id || undefined,
        event_type: manualCheckin.event_type,
        device_id: physicalDev?.id || 'dev_essl_mb20_01',
        direction: manualCheckin.direction,
        status: manualCheckin.status,
      };
      await api.biometrics.checkIn(payload);
      setCheckinModalOpen(false);
      setManualCheckin({
        customer_id: '',
        event_type: 'FACE_SCAN',
        direction: 'CHECK_IN',
        status: 'SUCCESS',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to record check-in:', err);
    }
  };

  // Calculations (Dynamic Telemetry from DB analytics or live scans feed)
  const totalScans = analytics?.today_events ?? scans.length;
  const grantedScans = analytics?.today_granted ?? scans.filter((s) => (s.status || '').toUpperCase().includes('SUCCESS') || (s.status || '').toUpperCase().includes('GRANTED')).length;
  const deniedScans = analytics?.today_denied ?? scans.filter((s) => (s.status || '').toUpperCase().includes('DENIED') || (s.status || '').toUpperCase().includes('FAILED')).length;
  const successRate = analytics?.today_success_rate !== undefined ? analytics.today_success_rate.toFixed(1) : (totalScans > 0 ? ((grantedScans / totalScans) * 100).toFixed(1) : '0.0');
  const todayCheckinsCount = analytics?.today_checkins ?? scans.filter((s) => s.direction === 'CHECK_IN').length;

  // Filtered Scans
  const filteredScans = scans.filter((s) => {
    const nameMatch = (s.customer_name || 'Gym Member').toLowerCase().includes(search.toLowerCase()) ||
      (s.device_name || '').toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'ALL') return nameMatch;
    if (filterType === 'GRANTED') return nameMatch && (s.status === 'SUCCESS' || s.status === 'GRANTED');
    if (filterType === 'DENIED') return nameMatch && (s.status === 'DENIED' || s.status === 'FAILED');
    if (filterType === 'CHECK_IN') return nameMatch && s.direction === 'CHECK_IN';
    if (filterType === 'CHECK_OUT') return nameMatch && s.direction === 'CHECK_OUT';
    if (filterType === 'FACE_SCAN') return nameMatch && s.event_type.toLowerCase().includes('face');
    if (filterType === 'FINGERPRINT') return nameMatch && (s.event_type.toLowerCase().includes('finger') || s.event_type.toLowerCase().includes('bio'));
    return nameMatch;
  });

  const weeklyChartLabels = analytics?.weekly_trend?.map((w) => w.label) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyChartData = analytics?.weekly_trend?.map((w) => w.count) || [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="space-y-6 pb-12 overflow-x-hidden">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & ACTIONS */}
      {/* ============================================================ */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-navy-900 tracking-tight flex items-center gap-2">
              <Icon name="fingerprint" size={22} className="text-purple-600" />
              <span>Biometrics & Gate Access</span>
            </h2>
            <p className="text-xs text-navy-500 font-medium">Real-time eSSL device syncing, gate turnstile telemetry, and live punch feed.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCheckinModalOpen(true)}
              className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3.5 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Icon name="check-square" size={15} className="text-emerald-600" />
              <span>Manual Punch</span>
            </button>

            <button
              onClick={() => setDeviceModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-600 shadow-md shadow-purple-600/20 px-4 py-2 rounded-xl text-xs font-extrabold text-white hover:bg-purple-700 transition-all"
            >
              <Icon name="cpu" size={15} />
              <span>Add Device</span>
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          title="Biometrics & Gate Access"
          breadcrumb={['Owner', 'Biometrics']}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCheckinModalOpen(true)}
                className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3.5 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <Icon name="check-square" size={15} className="text-emerald-600" />
                <span>Manual Punch</span>
              </button>

              <button
                onClick={() => setDeviceModalOpen(true)}
                className="flex items-center gap-1.5 bg-purple-600 shadow-md shadow-purple-600/20 px-4 py-2 rounded-xl text-xs font-extrabold text-white hover:bg-purple-700 transition-all"
              >
                <Icon name="cpu" size={15} />
                <span>Add Device</span>
              </button>
            </div>
          }
        />
      )}

      {/* ============================================================ */}
      {/* 2. TOP SUMMARY METRIC CARDS (REAL DB DATA) */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Unique Check-ins */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Check-ins</span>
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon name="fingerprint" size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">{todayCheckinsCount}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>● Live DB Feed</span>
                <span className="text-slate-400 font-normal">({analytics?.today_events ?? totalScans} events)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Access Granted */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Granted</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="check-circle" size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-600">{grantedScans}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>{successRate}%</span>
                <span className="text-slate-400 font-normal">success rate</span>
              </div>
            </div>
          </div>

          {/* Card 3: Security Alerts / Denied */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Denied / Alerts</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Icon name="shield-alert" size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-rose-600">{deniedScans}</div>
              <div className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                <span>Gate Blocked</span>
                <span className="text-slate-400 font-normal">security logs</span>
              </div>
            </div>
          </div>

          {/* Card 4: Active Hardware Terminals */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Terminals</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="cpu" size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900">
                {devices.filter((d) => (d.status || '').toLowerCase() === 'online' || (d.status || '').toLowerCase() === 'active').length}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {devices.length} Online</span>
              </div>
              <div className="text-[11px] font-bold text-purple-600 flex items-center gap-1 mt-0.5">
                <span>eSSL Hardware</span>
                <span className="text-slate-400 font-normal">Peak: {analytics?.peak_hour || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ANALYTICS & TREND CHARTS */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7-Day Weekly Attendance Trend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">7-Day Check-in Trend</h3>
                <p className="text-xs text-slate-400 font-medium">Daily gate attendance entries</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                Weekly Flow
              </div>
            </div>
            <BarChart data={weeklyChartData} labels={weeklyChartLabels} height={180} color="#2563eb" />
          </div>

          {/* 24-Hour Peak Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Hourly Distribution</h3>
                <p className="text-xs text-slate-400 font-medium">Peak check-in hour: <span className="text-brand-600 font-bold">{analytics?.peak_hour || 'N/A'}</span></p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                24H Telemetry
              </div>
            </div>
            <HourlyDistributionChart
              data={analytics?.hourly_data || Array(24).fill(0)}
              labels={analytics?.hourly_labels}
              height={180}
              color="#8b5cf6"
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. BIOMETRIC HARDWARE TERMINALS SECTION */}
      {/* ============================================================ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Registered eSSL Biometric Terminals</h3>
            <p className="text-xs text-slate-400 font-medium">Configured gate controllers and turnstiles</p>
          </div>
          <button
            onClick={() => setDeviceModalOpen(true)}
            className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <Icon name="plus" size={14} /> Add Hardware Device
          </button>
        </div>

        {loading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : devices.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl">
            <Icon name="cpu" size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">No biometric hardware devices registered</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Device" above to register an eSSL terminal</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((d) => {
              const isOnline = (d.status || '').toLowerCase().includes('online') || (d.status || '').toLowerCase().includes('active');
              return (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                        <Icon name={d.device_type?.toLowerCase().includes('face') ? 'user-check' : 'fingerprint'} size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 truncate max-w-[140px]">{d.device_name}</h4>
                        <span className="text-[10px] font-semibold text-slate-400 block">{d.location || 'Unassigned Zone'}</span>
                      </div>
                    </div>
                    <Badge variant={isOnline ? 'success' : 'danger'} dot>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{d.model_name || 'Biometric Terminal'}</span>
                    <span className="font-mono text-[10px] text-slate-400">{d.ip_address ? `${d.ip_address}:${d.port || 8000}` : 'Network IP'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. LIVE CHECK-IN SCAN FEED TABLE */}
      {/* ============================================================ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Live Biometric Check-in Feed</h3>
            <p className="text-xs text-slate-400 font-medium">Real-time attendance punch logs from gate controllers</p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={scans.length > 0 ? `Search ${scans.length} logs or ${devices.length} terminals...` : "Search member or terminal..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 w-48 sm:w-56"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Events</option>
              <option value="GRANTED">Granted Only</option>
              <option value="DENIED">Denied Only</option>
              <option value="CHECK_IN">Check-in Only</option>
              <option value="CHECK_OUT">Check-out Only</option>
              <option value="FACE_SCAN">Face Scan</option>
              <option value="FINGERPRINT">Fingerprint</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : filteredScans.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
            <Icon name="fingerprint" size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">No biometric scan logs recorded</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Logs will automatically appear here when turnstiles record check-ins</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pl-2">Member / User</th>
                  <th className="pb-2.5">Verification</th>
                  <th className="pb-2.5">Direction</th>
                  <th className="pb-2.5">Terminal</th>
                  <th className="pb-2.5 text-center">Confidence</th>
                  <th className="pb-2.5 text-center">Status</th>
                  <th className="pb-2.5 pr-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredScans.map((scan) => {
                  const isGranted = (scan.status || '').toUpperCase().includes('SUCCESS') || (scan.status || '').toUpperCase().includes('GRANTED');
                  const formattedTime = scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
                  const conf = scan.confidence_score ? Math.round(scan.confidence_score * (scan.confidence_score <= 1 ? 100 : 1)) : 98;

                  return (
                    <tr key={scan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-2 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {(scan.customer_name || 'G')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 block truncate max-w-[130px]">
                            {scan.customer_name || 'Gym Member'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            ID: {scan.customer_id ? scan.customer_id.substring(0, 8) : 'Walk-in'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                          <Icon name={scan.event_type?.toLowerCase().includes('face') ? 'user-check' : 'fingerprint'} size={12} />
                          {scan.event_type || 'BIOMETRIC'}
                        </span>
                      </td>

                      <td className="py-3">
                        <span
                          className={cn(
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-md',
                            scan.direction === 'CHECK_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          )}
                        >
                          {scan.direction || 'CHECK_IN'}
                        </span>
                      </td>

                      <td className="py-3 text-slate-600 font-semibold truncate max-w-[120px]">
                        {scan.device_name || 'Main Gate'}
                      </td>

                      <td className="py-3 text-center font-extrabold text-slate-700">
                        {conf}%
                      </td>

                      <td className="py-3 text-center">
                        <Badge variant={isGranted ? 'success' : 'danger'}>
                          {isGranted ? 'GRANTED' : 'DENIED'}
                        </Badge>
                      </td>

                      <td className="py-3 pr-2 text-right font-mono text-[11px] text-slate-400">
                        {formattedTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>



      {/* ============================================================ */}
      {/* MODAL 2: REGISTER HARDWARE DEVICE MODAL */}
      {/* ============================================================ */}
      {deviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon name="cpu" size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Register eSSL Hardware</h3>
              </div>
              <button onClick={() => setDeviceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hardware Brand / Type</label>
                <select
                  value={newDevice.device_type}
                  onChange={(e) => {
                    const selectedType = e.target.value;
                    const defaultPorts: Record<string, number> = { essl: 4370, zkteco: 4370, hikvision: 8000, anviz: 5010 };
                    setNewDevice({
                      ...newDevice,
                      device_type: selectedType,
                      port: defaultPorts[selectedType] || 4370,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold cursor-pointer"
                >
                  <option value="essl">eSSL Biometrics (Default)</option>
                  <option value="zkteco">ZKTeco SpeedFace / iFace</option>
                  <option value="hikvision">Hikvision Face Access</option>
                  <option value="anviz">Anviz Access Controller</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Device Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Gate Turnstile"
                  value={newDevice.device_name}
                  onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. ESSL-998400"
                    value={newDevice.serial_number}
                    onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Model Name</label>
                  <input
                    type="text"
                    placeholder="e.g. SilkID / SpeedFace V5L"
                    value={newDevice.model_name}
                    onChange={(e) => setNewDevice({ ...newDevice, model_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">IP Address</label>
                  <input
                    type="text"
                    placeholder="192.168.1.100"
                    value={newDevice.ip_address}
                    onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Port</label>
                  <input
                    type="number"
                    placeholder="4370"
                    value={newDevice.port}
                    onChange={(e) => setNewDevice({ ...newDevice, port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Location / Zone</label>
                <input
                  type="text"
                  placeholder="e.g. Main Entrance"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-md shadow-brand-600/20"
                >
                  Save Hardware Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: MANUAL CHECK-IN PUNCH MODAL */}
      {/* ============================================================ */}
      {checkinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon name="check-square" size={16} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Record Gate Punch</h3>
              </div>
              <button onClick={() => setCheckinModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleManualCheckin} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Member / Customer</label>
                <select
                  value={manualCheckin.customer_id}
                  onChange={(e) => setManualCheckin({ ...manualCheckin, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold cursor-pointer"
                >
                  <option value="">Walk-in / Unknown</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.name} ({m.email || m.phone || m.id.substring(0, 6)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Verification Method</label>
                  <select
                    value={manualCheckin.event_type}
                    onChange={(e) => setManualCheckin({ ...manualCheckin, event_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold cursor-pointer"
                  >
                    <option value="FACE_SCAN">Face Recognition</option>
                    <option value="FINGERPRINT">Fingerprint</option>
                    <option value="RFID_CARD">RFID Card</option>
                    <option value="PALM_PRINT">Palm Scanner</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Direction</label>
                  <select
                    value={manualCheckin.direction}
                    onChange={(e) => setManualCheckin({ ...manualCheckin, direction: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold cursor-pointer"
                  >
                    <option value="CHECK_IN">CHECK_IN (Gate Entry)</option>
                    <option value="CHECK_OUT">CHECK_OUT (Gate Exit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Access Status</label>
                <select
                  value={manualCheckin.status}
                  onChange={(e) => setManualCheckin({ ...manualCheckin, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-500 font-semibold cursor-pointer"
                >
                  <option value="SUCCESS">SUCCESS (Granted)</option>
                  <option value="DENIED">DENIED (Security Block)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckinModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                >
                  Record Gate Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
