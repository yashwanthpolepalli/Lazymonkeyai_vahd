import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { Device } from '@/types';
import { cn } from '@/utils/cn';

export function CctvPage() {
  const [_devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCamera, setActiveCamera] = useState(0);

  useEffect(() => {
    api.superAdmin
      .devices()
      .then((data) => {
        setDevices((data || []).filter((d: Device) => d.type === 'cctv'));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const cameras = [
    { name: 'Entrance', location: 'Main Gate', status: 'online' },
    { name: 'Gym Floor', location: 'Main Area', status: 'online' },
    { name: 'Free Weights', location: 'Weight Zone', status: 'online' },
    { name: 'Reception', location: 'Front Desk', status: 'online' },
    { name: 'Studio', location: 'Class Room', status: 'warning' },
    { name: 'Parking', location: 'Basement', status: 'online' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="CCTV Monitoring" breadcrumb={['Owner', 'CCTV']} actions={<button className="btn-primary"><Icon name="plus" size={16} /> Add Camera</button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? <Skeleton className="h-80 w-full" /> : (
            <div className="card p-4">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-navy-800 to-navy-900 relative overflow-hidden mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Icon name="cctv" size={48} className="text-navy-600 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-navy-500">{cameras[activeCamera].name}</div>
                    <div className="text-xs text-navy-600">{cameras[activeCamera].location}</div>
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-lg bg-danger-500/90 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-white animate-live-dot" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-navy-900/60 backdrop-blur text-xs font-semibold text-white">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-navy-900/60 backdrop-blur text-xs font-semibold text-white">
                  CAM-{String(activeCamera + 1).padStart(2, '0')} · 1080p
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {cameras.map((cam, i) => (
                  <button key={i} onClick={() => setActiveCamera(i)} className={cn('aspect-video rounded-xl bg-navy-100 flex items-center justify-center relative overflow-hidden transition-all', activeCamera === i ? 'ring-2 ring-brand-500' : 'hover:opacity-80')}>
                    <Icon name="cctv" size={20} className="text-navy-400" />
                    <span className={cn('absolute top-1 right-1 w-1.5 h-1.5 rounded-full', cam.status === 'online' ? 'bg-success-500 animate-live-dot' : 'bg-warning-500')} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Camera List</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <div className="space-y-2">
              {cameras.map((cam, i) => (
                <div key={i} onClick={() => setActiveCamera(i)} className={cn('flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors', activeCamera === i ? 'bg-brand-50' : 'hover:bg-navy-50')}>
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', cam.status === 'online' ? 'bg-success-50' : 'bg-warning-50')}>
                    <Icon name="cctv" size={16} className={cam.status === 'online' ? 'text-success-600' : 'text-warning-600'} />
                  </div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-navy-900">{cam.name}</div><div className="text-xs text-navy-400">{cam.location}</div></div>
                  <span className={cn('w-2 h-2 rounded-full', cam.status === 'online' ? 'bg-success-500 animate-live-dot' : 'bg-warning-500')} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5"><div className="stat-label mb-1">Total Cameras</div><div className="text-2xl font-bold text-navy-900">{cameras.length}</div></div>
        <div className="card p-5"><div className="stat-label mb-1">Online</div><div className="text-2xl font-bold text-success-600">{cameras.filter((c) => c.status === 'online').length}</div></div>
        <div className="card p-5"><div className="stat-label mb-1">Warning</div><div className="text-2xl font-bold text-warning-600">{cameras.filter((c) => c.status === 'warning').length}</div></div>
        <div className="card p-5"><div className="stat-label mb-1">Storage</div><div className="text-2xl font-bold text-navy-900">8.2 TB</div></div>
      </div>
    </div>
  );
}
