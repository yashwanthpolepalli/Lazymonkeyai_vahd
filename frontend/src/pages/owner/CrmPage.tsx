import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { EnrollmentModal } from '@/components/EnrollmentModal';

// Marketing & Sales Sub-components
import { MarketingAdGenerator } from '@/components/crm/MarketingAdGenerator';
import { SocialMediaDashboard } from '@/components/crm/SocialMediaDashboard';
import { AdPostHistory } from '@/components/crm/AdPostHistory';
import { LeadsManagement } from '@/components/crm/LeadsManagement';
import { OpportunitiesManagement } from '@/components/crm/OpportunitiesManagement';
import { DealsManagement } from '@/components/crm/DealsManagement';
import { SalesPipeline } from '@/components/crm/SalesPipeline';
import { QuotationsManagement } from '@/components/crm/QuotationsManagement';
import { SalesOrdersManagement } from '@/components/crm/SalesOrdersManagement';
import { DiscountsManagement } from '@/components/crm/DiscountsManagement';

// Modular Customer Service and Communication Hubs
import { CustomerServiceHub } from '@/components/crm/CustomerServiceHub';
import { CommunicationHub } from '@/components/crm/CommunicationHub';

interface CustomerRecord {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  membership?: string;
  goal?: string;
  fitness_level?: string;
  training_preference?: string;
  attendance?: number;
  joinDate?: string;
  created_at?: string;
  revenue?: string;
  branch?: string;
  gender?: string;
  age?: number | string;
  lastVisit?: string;
  expiry?: string;
  biometric_synced?: boolean;
  biometric_status?: string;
  kyc_status?: string;
  kyc_percent?: number;
}

// Top-Level CRM Categories (Customer Intelligence removed as requested)
type CrmCategory =
  | 'Customer Management'
  | 'Marketing & Sales'
  | 'Customer Service'
  | 'Communication';

export function CrmPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'customer_list';

  // State
  const [activeCategory, setActiveCategory] = useState<CrmCategory>('Customer Management');
  const [activeSubTab, setActiveSubTab] = useState<string>(urlTab);

  // Data States
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search for Member lists
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilterStatus, setCustomerFilterStatus] = useState('All');
  const [onboardingBiometricFilter, setOnboardingBiometricFilter] = useState<'All' | 'Completed' | 'Pending'>('All');

  // Prefill contact for AI voice calling cross-navigation
  const [callPrefill, setCallPrefill] = useState<{ name: string; phone: string; objective?: string } | null>(null);

  // Biometric Enrollment Modal State
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedEnrollMember, setSelectedEnrollMember] = useState<CustomerRecord | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    verificationType: 'FACE_SCAN' as 'FACE_SCAN' | 'FINGERPRINT' | 'RFID_CARD' | 'INBODY',
    device_name: 'Main Turnstile eSSL SilkBio-101',
    card_number: '',
    weight: '',
    height: '',
    notes: '',
  });
  const [enrollingState, setEnrollingState] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Sync sub-tab to URL & category
  useEffect(() => {
    if (urlTab) {
      setActiveSubTab(urlTab);
      if (['ai_call_logs', 'email_campaigns', 'sms_campaigns', 'whatsapp_campaigns', 'push_notifications'].includes(urlTab)) {
        setActiveCategory('Communication');
      } else if (['ad_generator', 'social_dashboard', 'ad_history', 'leads', 'opportunities', 'deals', 'pipeline', 'quotations', 'sales_orders', 'discounts'].includes(urlTab)) {
        setActiveCategory('Marketing & Sales');
      } else if (['support_tickets', 'complaints', 'returns', 'feedback', 'timeline'].includes(urlTab)) {
        setActiveCategory('Customer Service');
      } else if (['customer_list', 'onboarding'].includes(urlTab)) {
        setActiveCategory('Customer Management');
      }
    }
  }, [urlTab]);

  const switchSubTab = (tab: string, cat?: CrmCategory) => {
    setActiveSubTab(tab);
    if (cat) setActiveCategory(cat);
    setSearchParams({ tab });
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Members from Database
  const fetchMembers = async () => {
    setLoading(true);
    try {
      let customersList: CustomerRecord[] = [];
      try {
        const cRes = await apiClient.get<CustomerRecord[]>('/customers');
        if (Array.isArray(cRes)) {
          customersList = cRes;
        } else {
          const mRes = await apiClient.get<CustomerRecord[]>('/members');
          if (Array.isArray(mRes)) customersList = mRes;
        }
      } catch (_cErr) {
        try {
          const mRes = await apiClient.get<CustomerRecord[]>('/members');
          if (Array.isArray(mRes)) customersList = mRes;
        } catch (_mErr) {
          customersList = [];
        }
      }
      setCustomers(customersList || []);
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Handler for Syncing Customer Biometrics in Real Time
  const handleSyncBiometric = async (customerId: string, displayName: string) => {
    try {
      const updated = await apiClient.post<CustomerRecord>(`/customers/${customerId}/sync-biometric`, {});
      setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...updated } : c)));
      triggerToast(`✅ Biometric telemetry synced for ${displayName}!`);
    } catch (_err) {
      triggerToast(`Failed to sync biometric device for ${displayName}`);
    }
  };

  const handleOpenEnrollModal = (member: CustomerRecord) => {
    setSelectedEnrollMember(member);
    setEnrollForm({
      verificationType: 'FACE_SCAN',
      device_name: 'Main Turnstile eSSL SilkBio-101',
      card_number: member.phone ? `RFID_${member.phone.slice(-6)}` : '',
      weight: '',
      height: '',
      notes: '',
    });
    setEnrollingState('idle');
    setEnrollModalOpen(true);
  };

  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollMember) return;
    setEnrollingState('scanning');

    try {
      const payload = {
        event_type: enrollForm.verificationType,
        device_name: enrollForm.device_name,
        card_number: enrollForm.card_number || undefined,
        weight: enrollForm.weight ? parseFloat(enrollForm.weight) : undefined,
        height: enrollForm.height ? parseFloat(enrollForm.height) : undefined,
        notes: enrollForm.notes || `Enrolled via ${enrollForm.verificationType}`,
        scan_type: enrollForm.verificationType === 'INBODY' ? 'INBODY' : 'BIOMETRIC',
      };

      const updated = await apiClient.post<CustomerRecord>(
        `/customers/${selectedEnrollMember.id}/sync-biometric`,
        payload
      );
      setCustomers((prev) => prev.map((c) => (c.id === selectedEnrollMember.id ? { ...c, ...updated } : c)));
      setEnrollingState('success');
      setTimeout(() => {
        setEnrollModalOpen(false);
        triggerToast(`🎉 Biometric access granted & synced for ${selectedEnrollMember.full_name || selectedEnrollMember.name}!`);
      }, 1000);
    } catch (_err) {
      setEnrollingState('idle');
      triggerToast('Failed to complete biometric enrollment');
    }
  };

  // Filtered Customers from DB
  const filteredCustomers = customers.filter((cust) => {
    const name = cust.full_name || cust.name || '';
    const email = cust.email || '';
    const phone = cust.phone || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);
    const matchesStatus =
      customerFilterStatus === 'All' ||
      (cust.status || '').toUpperCase() === customerFilterStatus.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const totalMembersCount = customers.length;
  const activeMembersCount = customers.filter((c) => (c.status || '').toUpperCase() === 'ACTIVE').length;

  return (
    <div className="space-y-6 animate-fade-in relative pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-navy-950/95 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-brand-500/40 flex items-center gap-2.5 animate-slide-in">
          <Icon name="sparkles" size={16} className="text-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="CRM & Growth Suite"
        subtitle="AI-driven Lead Pipelines, Smart Outbound Voice Calling, Marketing Creative Studio & Omnichannel Customer Service"
        breadcrumb={['Owner', 'CRM & Growth']}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEVEL 1: CATEGORY NAVIGATION BAR (Matches lazymonkeyai.com) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-navy-200/80 pb-1">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
          {[
            { id: 'Customer Management', icon: 'users', defaultTab: 'customer_list' },
            { id: 'Marketing & Sales', icon: 'trending-up', defaultTab: 'ad_generator' },
            { id: 'Customer Service', icon: 'headphones', defaultTab: 'support_tickets' },
            { id: 'Communication', icon: 'radio', defaultTab: 'ai_call_logs' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as CrmCategory);
                  switchSubTab(cat.defaultTab, cat.id as CrmCategory);
                }}
                className={`flex items-center gap-2 py-2.5 text-xs font-bold transition-all relative whitespace-nowrap ${
                  isActive ? 'text-brand-600 font-black' : 'text-navy-500 hover:text-navy-900'
                }`}
              >
                <Icon name={cat.icon} size={15} className={isActive ? 'text-brand-600' : 'text-navy-400'} />
                <span>{cat.id}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-brand-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LEVEL 2: SUB-TABS PILL BAR (Matches lazymonkeyai.com) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {activeCategory === 'Customer Management' && (
          <>
            {[
              { id: 'customer_list', label: 'All Customers & Members', icon: 'users' },
              { id: 'onboarding', label: 'Member Onboarding KYC', icon: 'user-check' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => switchSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeSubTab === sub.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/60'
                }`}
              >
                <Icon name={sub.icon} size={14} />
                <span>{sub.label}</span>
              </button>
            ))}
          </>
        )}

        {activeCategory === 'Marketing & Sales' && (
          <>
            {[
              { id: 'ad_generator', label: 'Marketing Ad Generator', icon: 'sparkles' },
              { id: 'social_dashboard', label: 'Social Media Dashboard', icon: 'bar-chart-3' },
              { id: 'ad_history', label: 'Ad Post History', icon: 'history' },
              { id: 'leads', label: 'Leads', icon: 'target' },
              { id: 'opportunities', label: 'Opportunities', icon: 'award' },
              { id: 'deals', label: 'Deals', icon: 'tag' },
              { id: 'pipeline', label: 'Sales Pipeline', icon: 'kanban-square' },
              { id: 'quotations', label: 'Quotations', icon: 'file-text' },
              { id: 'sales_orders', label: 'Sales Orders', icon: 'shopping-cart' },
              { id: 'discounts', label: 'Discounts', icon: 'percent' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => switchSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeSubTab === sub.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/60'
                }`}
              >
                <Icon name={sub.icon} size={14} />
                <span>{sub.label}</span>
              </button>
            ))}
          </>
        )}

        {activeCategory === 'Customer Service' && (
          <>
            {[
              { id: 'support_tickets', label: 'Support Tickets', icon: 'headphones' },
              { id: 'complaints', label: 'Complaints', icon: 'alert-triangle' },
              { id: 'returns', label: 'Returns', icon: 'refresh-cw' },
              { id: 'feedback', label: 'Feedback', icon: 'star' },
              { id: 'timeline', label: 'Customer Timeline', icon: 'clock' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => switchSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeSubTab === sub.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/60'
                }`}
              >
                <Icon name={sub.icon} size={14} />
                <span>{sub.label}</span>
              </button>
            ))}
          </>
        )}

        {activeCategory === 'Communication' && (
          <>
            {[
              { id: 'ai_call_logs', label: 'AI Voice Calling & Logs', icon: 'headphones' },
              { id: 'email_campaigns', label: 'Email Campaigns', icon: 'mail' },
              { id: 'sms_campaigns', label: 'SMS Campaigns', icon: 'message-square' },
              { id: 'whatsapp_campaigns', label: 'WhatsApp Campaigns', icon: 'message-circle' },
              { id: 'push_notifications', label: 'Push Notifications', icon: 'bell' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => switchSubTab(sub.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeSubTab === sub.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/60'
                }`}
              >
                <Icon name={sub.icon} size={14} />
                <span>{sub.label}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. VIEW: ALL CUSTOMERS & MEMBERS                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'customer_list' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-navy-900 tracking-tight">
                  All Customers & Members
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
                  {totalMembersCount} Registered
                </span>
              </div>
              <p className="text-xs text-navy-500 mt-0.5">
                Live member database with subscription status, fitness goals, and 1-click AI consultation actions.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchMembers}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
              >
                <Icon name="refresh-cw" size={14} /> Refresh List
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL MEMBERS</span>
                <span className="text-3xl font-black text-navy-900">{totalMembersCount}</span>
                <span className="text-[11px] font-bold text-brand-600 block">Database Records</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon name="users" size={18} />
              </div>
            </div>

            <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">ACTIVE MEMBERS</span>
                <span className="text-3xl font-black text-emerald-600">{activeMembersCount}</span>
                <span className="text-[11px] font-bold text-emerald-600 block">Current Subscriptions</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="user-check" size={18} />
              </div>
            </div>

            <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">RETENTION RATE</span>
                <span className="text-3xl font-black text-purple-600">
                  {totalMembersCount > 0 ? `${Math.round((activeMembersCount / totalMembersCount) * 100)}%` : '100%'}
                </span>
                <span className="text-[11px] font-bold text-purple-600 block">Active Member Health</span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="activity" size={18} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search member by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {['All', 'Active', 'Expired', 'Trial'].map((st) => (
                <button
                  key={st}
                  onClick={() => setCustomerFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    customerFilterStatus === st
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table */}
          {filteredCustomers.length === 0 ? (
            <div className="card p-16 bg-white border border-navy-100 rounded-3xl shadow-sm text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-navy-50 flex items-center justify-center text-navy-400">
                <Icon name="users" size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-navy-900">No Members Found</h4>
                <p className="text-xs text-navy-400">No member records match your search filter criteria.</p>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden bg-white border border-navy-100 rounded-2xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                      <th className="py-3 px-4">MEMBER NAME / CONTACT</th>
                      <th className="py-3 px-4">MEMBERSHIP PLAN</th>
                      <th className="py-3 px-4">FITNESS GOAL</th>
                      <th className="py-3 px-4">TRAINING PREFERENCE</th>
                      <th className="py-3 px-4 text-right">OUTREACH ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100 text-xs">
                    {filteredCustomers.map((cust) => {
                      const displayName = cust.full_name || cust.name || 'Member';
                      const isActive = (cust.status || '').toUpperCase() === 'ACTIVE';
                      return (
                        <tr key={cust.id} className="hover:bg-navy-50/40 transition">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-black flex items-center justify-center text-xs">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-navy-900 block">{displayName}</span>
                                <span className="text-[11px] text-navy-400 block">{cust.phone || cust.email || 'No contact'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase inline-block ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-navy-100 text-navy-600'
                              }`}
                            >
                              {cust.status || 'Registered'}
                            </span>
                            <span className="text-[11px] text-navy-500 font-semibold block mt-1">
                              {cust.membership || 'Standard Pass'}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-navy-700 font-medium">
                            {cust.goal || 'General Fitness'}
                          </td>

                          <td className="py-4 px-4 text-navy-600">
                            <span className="px-2 py-0.5 rounded-md bg-navy-50 text-navy-700 text-[11px] font-semibold border border-navy-200/60">
                              {cust.training_preference || 'Standard Workout'}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setCallPrefill({
                                  name: displayName,
                                  phone: cust.phone || '',
                                  objective: 'Member Progress & Workout Consultation',
                                });
                                switchSubTab('ai_call_logs', 'Communication');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold inline-flex items-center gap-1.5 transition"
                            >
                              <Icon name="phone" size={13} />
                              <span>AI Call</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. VIEW: MEMBER ONBOARDING KYC & BIOMETRIC SYNC               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'onboarding' && (() => {
        const biometricCompletedCount = customers.filter((c) => c.biometric_synced).length;
        const biometricPendingCount = customers.filter((c) => !c.biometric_synced).length;
        const verifiedKycCount = customers.filter((c) => (c.kyc_percent || 0) >= 80 || c.kyc_status === 'Verified & Ready').length;

        const filteredOnboardingCustomers = customers.filter((c) => {
          const name = c.full_name || c.name || '';
          const phone = c.phone || '';
          const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
          if (!matchesSearch) return false;
          if (onboardingBiometricFilter === 'Completed') return c.biometric_synced;
          if (onboardingBiometricFilter === 'Pending') return !c.biometric_synced;
          return true;
        });

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-navy-900 tracking-tight">Member Onboarding & Biometric Sync</h2>
                <p className="text-xs text-navy-500 mt-0.5">Track KYC completeness and hardware biometric scanner linkage status in real time.</p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchMembers}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
                >
                  <Icon name="refresh-cw" size={14} /> Refresh Status
                </button>
              </div>
            </div>

            {/* 4 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL MEMBERS</span>
                  <span className="text-3xl font-black text-navy-900">{customers.length}</span>
                  <span className="text-[11px] text-navy-400 font-semibold block">Registered in DB</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon name="users" size={18} />
                </div>
              </div>

              <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">BIOMETRICS SYNCED</span>
                  <span className="text-3xl font-black text-emerald-600">{biometricCompletedCount}</span>
                  <span className="text-[11px] font-bold text-emerald-600 block">Device Linked & Active</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon name="fingerprint" size={18} />
                </div>
              </div>

              <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">BIOMETRICS PENDING</span>
                  <span className="text-3xl font-black text-amber-600">{biometricPendingCount}</span>
                  <span className="text-[11px] font-bold text-amber-600 block">Action Required</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Icon name="circle-alert" size={18} />
                </div>
              </div>

              <div className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">VERIFIED KYC RATIO</span>
                  <span className="text-3xl font-black text-purple-600">
                    {customers.length > 0 ? `${Math.round((verifiedKycCount / customers.length) * 100)}%` : '100%'}
                  </span>
                  <span className="text-[11px] font-bold text-purple-600 block">Complete Profiles</span>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="user-check" size={18} />
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="Search member by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-white border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {[
                  { id: 'All', label: `All Members (${customers.length})` },
                  { id: 'Completed', label: `Biometrics Synced (${biometricCompletedCount})` },
                  { id: 'Pending', label: `Pending Link (${biometricPendingCount})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOnboardingBiometricFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      onboardingBiometricFilter === st.id
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Onboarding Table */}
            {filteredOnboardingCustomers.length === 0 ? (
              <div className="card p-16 bg-white border border-navy-100 rounded-3xl shadow-sm text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-navy-50 flex items-center justify-center text-navy-400">
                  <Icon name="fingerprint" size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-navy-900">No Members Match Filter</h4>
                  <p className="text-xs text-navy-400">Try changing your search keywords or biometric filter status.</p>
                </div>
              </div>
            ) : (
              <div className="card overflow-hidden bg-white border border-navy-100 rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                        <th className="py-3 px-4">MEMBER & CONTACT</th>
                        <th className="py-3 px-4">KYC STATUS</th>
                        <th className="py-3 px-4">HARDWARE BIOMETRIC LINK</th>
                        <th className="py-3 px-4">TURNSTILE DEVICE</th>
                        <th className="py-3 px-4 text-right">TELEMETRY ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100 text-xs">
                      {filteredOnboardingCustomers.map((cust) => {
                        const displayName = cust.full_name || cust.name || 'Member';
                        const isBiometricSynced = cust.biometric_synced;
                        return (
                          <tr key={cust.id} className="hover:bg-navy-50/40 transition">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 font-black flex items-center justify-center text-xs">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-navy-900 block">{displayName}</span>
                                  <span className="text-[11px] text-navy-400 font-mono block">{cust.phone || 'No phone'}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    (cust.kyc_percent || 0) >= 80 || cust.kyc_status === 'Verified & Ready'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {cust.kyc_status || (cust.kyc_percent ? `${cust.kyc_percent}% Complete` : 'Verified')}
                                </span>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {isBiometricSynced ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                  <Icon name="check-circle" size={13} className="text-emerald-600" />
                                  <span>Face & RFID Linked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                  <Icon name="circle-alert" size={13} className="text-amber-600" />
                                  <span>Pending Sensor Link</span>
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-navy-600">
                              <span className="font-mono text-[11px]">
                                {isBiometricSynced ? 'Main Turnstile SilkBio-101' : 'Unassigned'}
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSyncBiometric(cust.id, displayName)}
                                  className="px-2.5 py-1 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 text-[11px] font-bold flex items-center gap-1 transition"
                                  title="Sync IoT turnstile sensor state"
                                >
                                  <Icon name="refresh-cw" size={12} /> Sync
                                </button>
                                <button
                                  onClick={() => handleOpenEnrollModal(cust)}
                                  className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                                >
                                  <Icon name="fingerprint" size={12} /> Enroll Hardware
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VIEW: MARKETING & SALES MODULES                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeCategory === 'Marketing & Sales' && (
        <div className="space-y-6">
          {activeSubTab === 'ad_generator' && <MarketingAdGenerator />}
          {activeSubTab === 'social_dashboard' && <SocialMediaDashboard />}
          {activeSubTab === 'ad_history' && <AdPostHistory />}
          {activeSubTab === 'leads' && (
            <LeadsManagement
              onStartCall={(lead) => {
                setCallPrefill({
                  name: lead.name,
                  phone: lead.phone,
                  objective: 'Lead Consultation & VIP Pass',
                });
                switchSubTab('ai_call_logs', 'Communication');
              }}
            />
          )}
          {activeSubTab === 'opportunities' && <OpportunitiesManagement />}
          {activeSubTab === 'deals' && <DealsManagement />}
          {activeSubTab === 'pipeline' && <SalesPipeline />}
          {activeSubTab === 'quotations' && <QuotationsManagement />}
          {activeSubTab === 'sales_orders' && <SalesOrdersManagement />}
          {activeSubTab === 'discounts' && <DiscountsManagement />}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. VIEW: CUSTOMER SERVICE HUB (Screenshot 1 Match)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeCategory === 'Customer Service' && (
        <CustomerServiceHub
          activeSubTab={activeSubTab}
          onSubTabChange={(sub) => switchSubTab(sub, 'Customer Service')}
          onStartCall={(contact) => {
            setCallPrefill(contact);
            switchSubTab('ai_call_logs', 'Communication');
          }}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. VIEW: COMMUNICATION HUB (Screenshot 2 Match)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeCategory === 'Communication' && (
        <CommunicationHub
          activeSubTab={activeSubTab}
          onSubTabChange={(sub) => switchSubTab(sub, 'Communication')}
          prefillContact={callPrefill}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: BIOMETRIC ENROLLMENT SCANNER                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {enrollModalOpen && selectedEnrollMember && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-navy-100 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-black text-navy-900">Hardware Biometric Enrollment</h3>
                <p className="text-xs text-navy-400 mt-0.5">
                  Link {selectedEnrollMember.full_name || selectedEnrollMember.name} to turnstiles & body scanners
                </p>
              </div>
              <button
                onClick={() => setEnrollModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCompleteEnrollment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Telemetry Sensor Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'FACE_SCAN', label: 'Face Biometric', icon: 'camera' },
                    { id: 'FINGERPRINT', label: 'Fingerprint', icon: 'fingerprint' },
                    { id: 'RFID_CARD', label: 'RFID Card Tag', icon: 'credit-card' },
                    { id: 'INBODY', label: 'InBody Body Scan', icon: 'activity' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setEnrollForm({ ...enrollForm, verificationType: item.id as any })}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition ${
                        enrollForm.verificationType === item.id
                          ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-navy-200 bg-white text-navy-600 hover:bg-navy-50'
                      }`}
                    >
                      <Icon name={item.icon} size={15} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 block mb-1">Target IoT Device</label>
                <select
                  value={enrollForm.device_name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, device_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Main Turnstile eSSL SilkBio-101">Main Turnstile eSSL SilkBio-101 (Gate #1)</option>
                  <option value="Gym Studio Secondary Turnstile">Gym Studio Secondary Turnstile (Gate #2)</option>
                  <option value="InBody 770 Clinical Analyzer">InBody 770 Clinical Analyzer (Assessment Room)</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEnrollModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollingState !== 'idle'}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {enrollingState === 'scanning' ? (
                    <>
                      <Icon name="refresh-cw" size={14} className="animate-spin" />
                      <span>Syncing Device...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check-circle" size={14} />
                      <span>Complete Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
