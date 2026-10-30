import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { LineChart, BarChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { KpiCard as KpiType, RevenueData } from '@/types';

export function SuperAdminDashboard() {
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  // Onboard vahd Modal State
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    vahd_name: '',
    branch_name: '',
    city: '',
    address: '',
    owner_name: '',
    owner_email: '',
    password: '',
  });
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');

  const fetchDashboardData = (hoId?: string) => {
    setLoading(true);
    const activeHo = hoId !== undefined ? hoId : (localStorage.getItem('vahd_selected_org_id') || 'all');
    Promise.all([
      api.dashboard.superAdminKpis(activeHo),
      api.dashboard.revenue()
    ]).then(([k, r]) => {
      setKpis(k || []);
      setRevenue(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
    const handleOrgChanged = (e: any) => {
      fetchDashboardData(e.detail?.id);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
  }, []);

  const handleOnboardvahdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');
    if (!onboardForm.vahd_name.trim()) {
      setOnboardError('Organization Name is required.');
      return;
    }
    if (!onboardForm.owner_email.trim()) {
      setOnboardError('Owner Email is required.');
      return;
    }
    setOnboarding(true);
    try {
      const payload = {
        ...onboardForm,
        vahd_name: onboardForm.vahd_name.trim(),
        branch_name: onboardForm.branch_name.trim() || onboardForm.vahd_name.trim(),
        owner_email: onboardForm.owner_email.trim().toLowerCase(),
        password: onboardForm.password.trim() || `vahd@${Math.floor(1000 + Math.random() * 9000)}`,
      };
      const res = await api.superAdmin.onboardvahd(payload);
      if (res && (res.success === true || (res.success === undefined && (res.vahd_id || res.id)))) {
        setOnboardOpen(false);
        setOnboardForm({ vahd_name: '', branch_name: '', city: '', address: '', owner_name: '', owner_email: '', password: '' });
        setOnboardError('');
        fetchDashboardData();
      } else {
        setOnboardError(res?.message || 'Failed to onboard organization. Please try again.');
      }
    } catch (err: any) {
      setOnboardError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to onboard organization.');
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        breadcrumb={['Super Admin', 'Dashboard']}
        actions={
          <button onClick={() => setOnboardOpen(true)} className="btn-primary flex items-center gap-2">
            <Icon name="plus" size={16} /> Onboard HO's
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="h-[96px] p-3.5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {kpis
            .filter((k) => k.id !== 'platform_revenue' && k.id !== 'active_devices')
            .map((k) => (
              <KpiCard
                key={k.id}
                {...k}
                hideSparkline={true}
                hideChange={true}
              />
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">New Organization Growth</h3>
          {loading || !revenue ? <Skeleton className="h-48 w-full" /> : (
            <BarChart data={revenue.newstudents} labels={revenue.labels} height={180} color="#059669" />
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Churn Rate</h3>
          {loading || !revenue ? <Skeleton className="h-48 w-full" /> : (
            <LineChart data={revenue.churn} labels={revenue.labels} height={180} color="#dc2626" />
          )}
        </div>
      </div>

      {/* Onboard Organization Modal */}
      {onboardOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="building-2" size={18} className="text-brand-600" /> Onboard New Organization Branch
              </h3>
              <button onClick={() => setOnboardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            {onboardError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <Icon name="alert-circle" size={16} className="text-rose-600 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardvahdSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Enterprise"
                  value={onboardForm.vahd_name}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, vahd_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Branch"
                    value={onboardForm.branch_name}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, branch_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. City Name"
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street / Area Address"
                  value={onboardForm.address}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Owner Name"
                    value={onboardForm.owner_name}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, owner_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@example.com"
                    value={onboardForm.owner_email}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, owner_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Owner Password <span className="text-slate-400 font-normal">(Leave blank to auto-generate)</span>
                </label>
                <input
                  type="password"
                  placeholder="Set custom password or leave blank for auto-generated"
                  value={onboardForm.password}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOnboardOpen(false)} className="btn-secondary py-2 px-4 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={onboarding} className="btn-primary py-2 px-4 text-xs font-bold">
                  {onboarding ? 'Onboarding...' : "Save & Onboard HO's"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
