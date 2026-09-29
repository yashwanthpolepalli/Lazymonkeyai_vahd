import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { BiometricsPage } from '@/pages/owner/BiometricsPage';
import { CctvPage } from '@/pages/owner/CctvPage';
import { BodyCompositionPage } from '@/pages/owner/BodyCompositionPage';
import { api } from '@/services/api';

export type IotSubTab = 'biometrics' | 'cctv' | 'body-composition';

export function IotPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as IotSubTab | null;
  const initialTab: IotSubTab = (rawTab && ['biometrics', 'cctv', 'body-composition'].includes(rawTab))
    ? rawTab
    : 'biometrics';

  const [activeTab, setActiveTab] = useState<IotSubTab>(initialTab);
  const [esslStatus, setEsslStatus] = useState<{ label: string; active: boolean }>({
    label: 'Checking...',
    active: false,
  });

  useEffect(() => {
    api.biometrics.devices()
      .then((res: any) => {
        const devList = Array.isArray(res) ? res : res?.devices || [];
        const esslDevs = devList.filter((d: any) =>
          (d.device_name || '').toLowerCase().includes('essl') ||
          (d.model_name || '').toLowerCase().includes('essl') ||
          (d.device_type || '').toLowerCase() === 'essl' ||
          (d.device_type || '').toLowerCase() === 'biometric'
        );
        const isOnline = esslDevs.some((d: any) =>
          (d.status || '').toLowerCase() === 'online' || (d.status || '').toLowerCase() === 'active'
        ) || res?.sync_status === 'LIVE';

        if (esslDevs.length === 0) {
          setEsslStatus({ label: 'eSSL Inactive', active: false });
        } else if (isOnline) {
          setEsslStatus({ label: 'eSSL Active', active: true });
        } else {
          setEsslStatus({ label: 'eSSL Inactive', active: false });
        }
      })
      .catch(() => {
        setEsslStatus({ label: 'eSSL Inactive', active: false });
      });
  }, []);

  useEffect(() => {
    if (rawTab && ['biometrics', 'cctv', 'body-composition'].includes(rawTab)) {
      setActiveTab(rawTab);
    }
  }, [rawTab]);

  const handleTabChange = (tab: IotSubTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs: Array<{ id: IotSubTab; label: string; icon: string; desc: string; countBadge?: string; badgeActive?: boolean }> = [
    {
      id: 'biometrics',
      label: 'Biometrics & Access',
      icon: 'fingerprint',
      desc: 'eSSL biometric controllers, punch syncing & staff attendance logs',
      countBadge: esslStatus.label,
      badgeActive: esslStatus.active,
    },
    {
      id: 'cctv',
      label: 'CCTV Surveillance',
      icon: 'cctv',
      desc: 'Real-time multi-camera security streams & floor monitoring',
      countBadge: '6 Online',
    },
    {
      id: 'body-composition',
      label: 'Body Composition',
      icon: 'ruler',
      desc: 'InBody hardware integration, visceral fat & biometric scanning',
      countBadge: 'InBody Sync',
    },
  ];

  return (
    <div className="space-y-6 w-full pb-16">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & BREADCRUMB                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <PageHeader
        title="IoT & Smart Hardware Hub"
        breadcrumb={['Owner', 'IoT Hub', tabs.find((t) => t.id === activeTab)?.label || 'Hardware']}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Hardware Mesh Online
            </span>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SUB-TAB PILL SWITCHER                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-navy-100 rounded-2xl p-2 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`p-3.5 rounded-xl text-left transition-all flex items-start gap-3.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 shadow-sm'
                    : 'hover:bg-navy-50/70 border border-transparent'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-navy-100 text-navy-600'
                  }`}
                >
                  <Icon name={tab.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-xs font-black tracking-tight ${isActive ? 'text-purple-900' : 'text-navy-900'}`}>
                      {tab.label}
                    </span>
                    {tab.countBadge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1 ${
                          tab.badgeActive !== undefined
                            ? tab.badgeActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                            : isActive
                            ? 'bg-purple-600 text-white'
                            : 'bg-navy-100 text-navy-600'
                        }`}
                      >
                        {tab.badgeActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {tab.countBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-navy-500 line-clamp-1 leading-snug">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ACTIVE TAB CONTENT VIEW                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-in">
        {activeTab === 'biometrics' && (
          <div className="space-y-6">
            <BiometricsPage embedded={true} />
          </div>
        )}

        {activeTab === 'cctv' && (
          <div className="space-y-6">
            <CctvPage />
          </div>
        )}

        {activeTab === 'body-composition' && (
          <div className="space-y-6">
            <BodyCompositionPage />
          </div>
        )}
      </div>
    </div>
  );
}
