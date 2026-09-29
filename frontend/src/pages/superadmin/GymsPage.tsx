import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { PineLabsEDCModal } from '@/components/pos/PineLabsEDCModal';
import { RazorpayPOSModal } from '@/components/pos/RazorpayPOSModal';
import type { Gym } from '@/types';
import { cn } from '@/utils/cn';

interface SaaSPlanItem {
  id: string;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_branches: number;
  max_members: number;
  max_trainers: number;
  ai_credits_monthly: number;
  storage_gb: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
}

function generateSecurePassword(): string {
  const words = ['FitClub', 'Iron', 'Apex', 'Titan', 'Pulse', 'Zenith', 'Vortex', 'Prime'];
  const symbols = ['!', '@', '#', '$', '%', '&'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${word}@${num}${sym}`;
}

export function GymsPage() {
  const [gyms, setGyms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // SaaS Plans from DB
  const [saasPlans, setSaasPlans] = useState<SaaSPlanItem[]>([]);

  // Billing Settings from Database
  const [billingSettings, setBillingSettings] = useState<{
    gym_name?: string;
    gstin?: string;
    sac_code?: string;
    enable_gst_engine: boolean;
    sgst_rate: number;
    sgst_enabled: boolean;
    cgst_rate: number;
    cgst_enabled: boolean;
    igst_rate: number;
    igst_enabled: boolean;
    total_gst_rate: number;
    tax_pricing_mode: string;
    enable_discount_engine: boolean;
    pos_discount_presets: number[];
    max_staff_discount: number;
    discount_sequence: string;
  }>({
    enable_gst_engine: true,
    sgst_rate: 9,
    sgst_enabled: true,
    cgst_rate: 9,
    cgst_enabled: true,
    igst_rate: 18,
    igst_enabled: false,
    total_gst_rate: 18,
    tax_pricing_mode: 'exclusive',
    enable_discount_engine: true,
    pos_discount_presets: [0, 5, 10, 15, 20, 25],
    max_staff_discount: 30,
    discount_sequence: 'before_tax',
  });

  // Onboarding Wizard State (3 Steps: Profile -> SaaS Plan -> POS Billing)
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Profile Form
  const [onboardForm, setOnboardForm] = useState({
    gym_name: '',
    branch_name: '',
    city: '',
    address: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    password: generateSecurePassword(),
  });

  // Step 2: SaaS Plan
  const [selectedPlan, setSelectedPlan] = useState<SaaSPlanItem | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Step 3: POS Billing & Payment Method
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('');
  const [discountTiming, setDiscountTiming] = useState<'before_tax' | 'after_tax'>('before_tax');
  const [discountPresets, setDiscountPresets] = useState<number[]>([0, 5, 10, 15, 20, 25]);
  const [additionalCharge, setAdditionalCharge] = useState<number>(0);
  const [additionalChargeInput, setAdditionalChargeInput] = useState<string>('');
  const [showAddChargeInput, setShowAddChargeInput] = useState(false);
  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Card / PineLabs' | 'Razorpay UPI' | 'Wallet' | 'Pay Later'
  >('Cash');

  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [pineLabsModalOpen, setPineLabsModalOpen] = useState(false);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);

  // Post-Onboarding Credential & Receipt Modal
  const [credentialCardData, setCredentialCardData] = useState<{
    gym_name: string;
    branch_name: string;
    owner_name: string;
    owner_email: string;
    phone: string;
    temporary_password?: string;
    plan_name?: string;
    billing_cycle?: string;
    payment_method?: string;
    paid_amount?: number;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  // Fetch Gyms from DB
  const fetchGyms = () => {
    setLoading(true);
    api.superAdmin.gyms()
      .then((data) => {
        setGyms(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Fetch SaaS Plans & Billing Settings from DB
  const loadSaaSMetadata = () => {
    api.superAdmin.plans()
      .then((plansData) => {
        if (plansData && plansData.length > 0) {
          setSaasPlans(plansData);
          if (!selectedPlan) {
            const popular = plansData.find((p: SaaSPlanItem) => p.is_popular) || plansData[0];
            setSelectedPlan(popular);
          }
        }
      })
      .catch(() => {});

    api.superAdmin.billingSettings()
      .then((bData) => {
        if (bData) {
          const isEnabled = Boolean(
            bData.enable_gst_engine &&
            (Number(bData.total_gst_rate ?? 0) > 0 || Number(bData.cgst_rate ?? 0) > 0 || Number(bData.sgst_rate ?? 0) > 0 || Number(bData.igst_rate ?? 0) > 0)
          );

          setBillingSettings({
            gym_name: bData.gym_name || '',
            gstin: bData.gstin || '',
            sac_code: bData.sac_code || '',
            enable_gst_engine: isEnabled,
            sgst_rate: Number(bData.sgst_rate ?? 0),
            sgst_enabled: Boolean(bData.sgst_enabled),
            cgst_rate: Number(bData.cgst_rate ?? 0),
            cgst_enabled: Boolean(bData.cgst_enabled),
            igst_rate: Number(bData.igst_rate ?? 0),
            igst_enabled: Boolean(bData.igst_enabled),
            total_gst_rate: Number(bData.total_gst_rate ?? 0),
            tax_pricing_mode: bData.tax_pricing_mode || 'exclusive',
            enable_discount_engine: Boolean(bData.enable_discount_engine),
            pos_discount_presets: Array.isArray(bData.pos_discount_presets) && bData.pos_discount_presets.length > 0
              ? bData.pos_discount_presets
              : [0, 5, 10, 15, 20, 25],
            max_staff_discount: Number(bData.max_staff_discount ?? 0),
            discount_sequence: bData.discount_sequence || 'before_tax',
          });

          if (Array.isArray(bData.pos_discount_presets) && bData.pos_discount_presets.length > 0) {
            setDiscountPresets(bData.pos_discount_presets);
          }
          if (bData.discount_sequence) {
            setDiscountTiming(bData.discount_sequence as any);
          }
          if (bData.igst_enabled) {
            setTaxMode('IGST');
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchGyms();
    loadSaaSMetadata();
  }, []);

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ── Dynamic Financial Calculations mapped from DB Billing Settings ───
  const basePlanPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    return billingCycle === 'monthly' ? (selectedPlan.price_monthly || 0) : (selectedPlan.price_annual || 0);
  }, [selectedPlan, billingCycle]);

  const activeDiscountRate = customDiscountPercent !== '' ? Number(customDiscountPercent) || 0 : discountPercent;
  
  const discountAmount = useMemo(() => {
    if (activeDiscountRate <= 0 || basePlanPrice <= 0) return 0;
    return Math.round((basePlanPrice * activeDiscountRate) / 100);
  }, [basePlanPrice, activeDiscountRate]);

  const taxableAmount = Math.max(0, basePlanPrice - (discountTiming === 'before_tax' ? discountAmount : 0));

  const isGstActive = Boolean(
    billingSettings.enable_gst_engine &&
    (billingSettings.total_gst_rate > 0 || billingSettings.cgst_rate > 0 || billingSettings.sgst_rate > 0 || billingSettings.igst_rate > 0)
  );

  const cgstRate = isGstActive ? (billingSettings.cgst_rate ?? 0) : 0;
  const sgstRate = isGstActive ? (billingSettings.sgst_rate ?? 0) : 0;
  const igstRate = isGstActive ? (billingSettings.igst_rate ?? (cgstRate + sgstRate)) : 0;

  const cgst = useMemo(() => {
    if (!isGstActive || basePlanPrice <= 0 || taxMode !== 'CGST_SGST') return 0;
    return Math.round(taxableAmount * (cgstRate / 100));
  }, [isGstActive, basePlanPrice, taxMode, taxableAmount, cgstRate]);

  const sgst = useMemo(() => {
    if (!isGstActive || basePlanPrice <= 0 || taxMode !== 'CGST_SGST') return 0;
    return Math.round(taxableAmount * (sgstRate / 100));
  }, [isGstActive, basePlanPrice, taxMode, taxableAmount, sgstRate]);

  const totalTax = useMemo(() => {
    if (!isGstActive || basePlanPrice <= 0) return 0;
    if (taxMode === 'IGST') {
      return Math.round(taxableAmount * (igstRate / 100));
    }
    return cgst + sgst;
  }, [isGstActive, basePlanPrice, taxMode, taxableAmount, igstRate, cgst, sgst]);

  const grandTotal = useMemo(() => {
    if (basePlanPrice <= 0) return 0;
    const base = taxableAmount + (discountTiming === 'after_tax' ? -discountAmount : 0);
    return Math.max(0, base + totalTax + Number(additionalCharge || 0));
  }, [taxableAmount, discountTiming, discountAmount, totalTax, additionalCharge, basePlanPrice]);

  const handleOpenOnboard = () => {
    loadSaaSMetadata();
    setOnboardForm({
      gym_name: '',
      branch_name: '',
      city: '',
      address: '',
      owner_name: '',
      owner_email: '',
      phone: '',
      password: generateSecurePassword(),
    });
    setWizardStep(1);
    setDiscountPercent(0);
    setCustomDiscountPercent('');
    setAdditionalCharge(0);
    setAdditionalChargeInput('');
    setShowAddChargeInput(false);
    setPaymentMethod('Cash');
    setOnboardError('');
    setShowPassword(false);
    setOnboardOpen(true);
  };

  const handleStatusChange = async (gymId: string, newStatus: string) => {
    try {
      await api.superAdmin.updateGymStatus(gymId, newStatus);
      if (selected && selected.id === gymId) {
        setSelected((prev: any) => prev ? { ...prev, status: newStatus, is_active: newStatus === 'active' } : null);
      }
      fetchGyms();
    } catch (_err) {
      /* ignore */
    }
  };

  const handleOpenResetModal = (g: any) => {
    setResetModalUser({
      id: g.owner_id || g.owner_email || g.id,
      name: g.owner_name || g.owner || 'Gym Owner',
      email: g.owner_email || g.owner || '',
    });
    setNewPasswordVal(generateSecurePassword());
    setShowNewPassword(false);
    setResetResult(null);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal.trim()) return;
    setResetting(true);
    try {
      await api.superAdmin.resetOwnerCredentials(resetModalUser.id, newPasswordVal.trim());
      setResetResult({
        email: resetModalUser.email,
        password: newPasswordVal.trim(),
      });
      fetchGyms();
    } catch (_err) {
      /* ignore */
    } finally {
      setResetting(false);
    }
  };

  const executeActualOnboarding = async (effectiveMethod?: string) => {
    setOnboarding(true);
    setOnboardError('');

    try {
      const methodToUse = effectiveMethod || paymentMethod;
      const payload = {
        ...onboardForm,
        branch_name: onboardForm.branch_name.trim() || 'Main Branch',
        plan_id: selectedPlan?.id,
        plan_name: selectedPlan?.name || 'Pro Growth',
        plan_tier: selectedPlan?.code || 'pro',
        billing_cycle: billingCycle,
        payment_method: methodToUse,
        paid_amount: grandTotal,
        discount_percent: activeDiscountRate,
        discount_amount: discountAmount,
        tax_mode: taxMode,
        tax_amount: totalTax,
        additional_charges: Number(additionalCharge || 0),
      };

      const res = await api.superAdmin.onboardGym(payload);
      if (res && res.success) {
        setOnboardOpen(false);
        setCredentialCardData({
          gym_name: onboardForm.gym_name,
          branch_name: onboardForm.branch_name.trim() || 'Main Branch',
          owner_name: onboardForm.owner_name.trim() || '—',
          owner_email: onboardForm.owner_email,
          phone: onboardForm.phone,
          temporary_password: onboardForm.password,
          plan_name: selectedPlan?.name || 'Pro Growth',
          billing_cycle: billingCycle,
          payment_method: methodToUse,
          paid_amount: grandTotal,
        });
        fetchGyms();
      } else {
        setOnboardError(res?.message || 'Failed to onboard gym. Please try again.');
      }
    } catch (err: any) {
      setOnboardError(err?.message || 'Failed to onboard gym. Please check inputs.');
    } finally {
      setOnboarding(false);
    }
  };

  const handleCompleteOnboard = async () => {
    if (!onboardForm.gym_name.trim() || !onboardForm.owner_email.trim()) {
      setOnboardError('Please fill in both Gym Name and Owner Email.');
      setWizardStep(1);
      return;
    }

    if (paymentMethod === 'Card / PineLabs') {
      setPineLabsModalOpen(true);
      return;
    }

    if (paymentMethod === 'Razorpay UPI') {
      setRazorpayModalOpen(true);
      return;
    }

    await executeActualOnboarding();
  };

  const filteredGyms = gyms.filter((g) => {
    const q = search.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(q)) ||
      (g.branch_name && g.branch_name.toLowerCase().includes(q)) ||
      (g.owner_name && g.owner_name.toLowerCase().includes(q)) ||
      (g.owner_email && g.owner_email.toLowerCase().includes(q)) ||
      (g.city && g.city.toLowerCase().includes(q)) ||
      (g.plan && g.plan.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gym Organizations Directory"
        breadcrumb={['Super Admin', 'Gyms & Tenants']}
        actions={
          <button
            onClick={handleOpenOnboard}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Icon name="plus" size={16} /> Onboard Gym &amp; Owner
          </button>
        }
      />

      {/* Top Search & Filter Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search gym, owner, email, city, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            Total Gyms: <span className="text-blue-600 font-bold">{gyms.length}</span>
          </div>
          <button onClick={fetchGyms} className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3">
            <Icon name="refresh-cw" size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Gyms Table */}
      <div className="card p-4">
        {loading ? (
          <SkeletonTable rows={6} cols={8} />
        ) : filteredGyms.length > 0 ? (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[950px] text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-400 text-left font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3">Gym &amp; Branch</th>
                  <th className="px-3 py-3">Owner Credentials</th>
                  <th className="px-3 py-3">City / Location</th>
                  <th className="px-3 py-3">Members</th>
                  <th className="px-3 py-3">SaaS Plan</th>
                  <th className="px-3 py-3">Billing &amp; Payment</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGyms.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-navy-50 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Icon name="building-2" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{g.name || '—'}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{g.branch_name || '—'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div>
                        <div className="font-bold text-slate-800">{g.owner_name || g.owner || '—'}</div>
                        <div className="text-[11px] text-blue-600 font-semibold">{g.owner_email || '—'}</div>
                        {g.phone && <div className="text-[10px] text-slate-400">{g.phone}</div>}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Icon name="map-pin" size={13} className="text-slate-400" />
                        <span>{g.city || '—'}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3 font-bold text-slate-700">
                      {g.members ? g.members.toLocaleString() : 0}
                    </td>

                    <td className="px-3 py-3">
                      <Badge variant="brand">{g.plan || 'Pro Growth'}</Badge>
                    </td>

                    <td className="px-3 py-3">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{g.payment_method || 'Cash'}</span>
                        <div className="text-[10px] text-slate-400 font-semibold capitalize">
                          {g.billing_cycle || 'monthly'} • ₹{(g.paid_amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <Badge variant={g.is_active ? 'success' : 'danger'} dot>
                        {g.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenResetModal(g)}
                          title="Reset Owner Password"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-all"
                        >
                          <Icon name="key" size={13} className="text-amber-600" />
                          <span>Reset Creds</span>
                        </button>

                        {g.is_active ? (
                          <button
                            onClick={() => handleStatusChange(g.id, 'suspended')}
                            title="Suspend Gym & Owner"
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs flex items-center gap-1 transition-all"
                          >
                            <Icon name="shield-alert" size={13} />
                            <span>Suspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(g.id, 'active')}
                            title="Activate Gym & Owner"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1 transition-all"
                          >
                            <Icon name="check" size={13} />
                            <span>Activate</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelected(g)}
                          title="View Gym 360 Overview"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        >
                          <Icon name="chevron-right" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No gyms or owners found matching your search.
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3-STEP ONBOARDING WIZARD MODAL                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {onboardOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 sm:p-7 w-full max-w-2xl space-y-5 shadow-2xl border border-slate-100 animate-scale-in max-h-[94vh] overflow-y-auto">
            
            {/* Modal Top Header & Stepper */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon name="building-2" size={18} />
                  </div>
                  <span>Onboard Gym &amp; Provision Tenant</span>
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Tenant provisioning: profile setup, SaaS tier packaging, and POS subscription checkout.
                </p>
              </div>
              <button
                onClick={() => setOnboardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Stepper Progress Indicator (3 Steps) */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {[
                { step: 1, label: '1. Profile', icon: 'building-2' },
                { step: 2, label: '2. SaaS Plan', icon: 'credit-card' },
                { step: 3, label: '3. POS Billing', icon: 'receipt' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    if (s.step === 1 || (onboardForm.gym_name && onboardForm.owner_email)) {
                      setWizardStep(s.step as any);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all',
                    wizardStep === s.step
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : wizardStep > s.step
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  <Icon name={s.icon as any} size={14} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {onboardError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <Icon name="alert-triangle" size={16} className="shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            {/* ── STEP 1: GYM PROFILE & OWNER CREDENTIALS ────────────── */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                {/* Gym Details */}
                <div>
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Icon name="building-2" size={13} /> Gym &amp; Location Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Gym / Business Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Iron Beast Fitness Club"
                        value={onboardForm.gym_name}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, gym_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Branch Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Branch / Downtown"
                        value={onboardForm.branch_name}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, branch_name: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Hyderabad"
                        value={onboardForm.city}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, city: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">Address / Street</label>
                      <input
                        type="text"
                        placeholder="e.g. Plot 45, Road No 36, Jubilee Hills"
                        value={onboardForm.address}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, address: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Owner Credentials */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Icon name="key" size={13} /> Owner Account Credentials
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Owner Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Rathore"
                        value={onboardForm.owner_name}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, owner_name: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Owner Email (Login ID) *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. vikram@beastfitness.com"
                        value={onboardForm.owner_email}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, owner_email: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={onboardForm.phone}
                        onChange={(e) => setOnboardForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Initial Password *</label>
                        <button
                          type="button"
                          onClick={() => setOnboardForm((p) => ({ ...p, password: generateSecurePassword() }))}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                        >
                          <Icon name="refresh-cw" size={11} /> Generate
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={onboardForm.password}
                          onChange={(e) => setOnboardForm((p) => ({ ...p, password: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 pr-9 outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setOnboardOpen(false)} className="btn-secondary py-2.5 px-4 text-xs font-bold">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onboardForm.gym_name.trim() || !onboardForm.owner_email.trim()) {
                        setOnboardError('Please fill in Gym Name and Owner Email before continuing.');
                        return;
                      }
                      setOnboardError('');
                      setWizardStep(2);
                    }}
                    className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Continue to SaaS Plan</span>
                    <Icon name="chevron-right" size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: SAAS SUBSCRIPTION PLAN SELECTION ───────────── */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="credit-card" size={13} /> Select SaaS Subscription Tier
                    </div>
                    <p className="text-xs text-slate-400">Choose the platform tier and billing frequency. Modules are governed by the platform feature matrix.</p>
                  </div>

                  {/* Billing Frequency Switch */}
                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={cn(
                        'px-3 py-1 rounded-xl text-xs font-bold transition-all',
                        billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={cn(
                        'px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1',
                        billingCycle === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      )}
                    >
                      Annual
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1 rounded font-extrabold">
                        -20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* SaaS Plan Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[50vh] overflow-y-auto pr-1">
                  {saasPlans.map((p) => {
                    const price = billingCycle === 'monthly' ? p.price_monthly : p.price_annual;
                    const isSelected = selectedPlan?.id === p.id || selectedPlan?.code === p.code;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p)}
                        className={cn(
                          'p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative',
                          isSelected
                            ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600/20 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        )}
                      >
                        {p.is_popular && (
                          <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300')}>
                              {isSelected && <Icon name="check" size={10} />}
                            </div>
                            <h4 className="text-sm font-black text-slate-900">{p.name}</h4>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-1 min-h-[30px] line-clamp-2">
                            {p.description}
                          </p>

                          <div className="mt-2.5 pb-2.5 border-b border-slate-100 flex items-baseline gap-1">
                            <span className="text-xl font-black text-slate-900">₹{(price || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div className="text-slate-600">
                              Branches: <span className="font-bold text-slate-900">{p.max_branches ?? 'Unlimited'}</span>
                            </div>
                            <div className="text-slate-600">
                              Members: <span className="font-bold text-slate-900">{p.max_members ? p.max_members.toLocaleString() : 'Unlimited'}</span>
                            </div>
                            <div className="text-slate-600">
                              AI Credits: <span className="font-bold text-slate-900">{p.ai_credits_monthly ? p.ai_credits_monthly.toLocaleString() : '1,000'}</span>
                            </div>
                            <div className="text-slate-600">
                              Storage: <span className="font-bold text-slate-900">{p.storage_gb || 10} GB</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Feature Bullets */}
                        <div className="space-y-1">
                          {(p.features || []).slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                              <Icon name="check" size={11} className="text-emerald-500 shrink-0" />
                              <span className="truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-between gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setWizardStep(1)} className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-1">
                    <Icon name="chevron-left" size={15} />
                    <span>Back to Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Proceed to POS Billing</span>
                    <Icon name="chevron-right" size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: POS TERMINAL BILLING & PAYMENT CHECKOUT ────── */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="receipt" size={13} /> POS Subscription Checkout &amp; Billing
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  
                  {/* Left: Summary Box */}
                  <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                        <Icon name="building-2" size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">{onboardForm.gym_name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{onboardForm.owner_name} • {onboardForm.city || 'HQ'}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Selected Tier:</span>
                        <span className="font-bold text-slate-900">{selectedPlan?.name}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Billing Cycle:</span>
                        <span className="font-bold text-blue-600 capitalize">{billingCycle}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Member Capacity:</span>
                        <span className="font-bold text-slate-900">{selectedPlan?.max_members ? selectedPlan.max_members.toLocaleString() : 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>AI Tokens / Mo:</span>
                        <span className="font-bold text-slate-900">{selectedPlan?.ai_credits_monthly ? selectedPlan.ai_credits_monthly.toLocaleString() : '1,000'}</span>
                      </div>
                    </div>

                    {/* Included Modules from Plan */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Package Modules</div>
                      <div className="space-y-1">
                        {(selectedPlan?.features || []).slice(0, 4).map((f, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Icon name="check" size={12} className="text-emerald-500 shrink-0" />
                            <span className="truncate">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Dynamic Calculation Box matching Screenshot 3 POS */}
                  <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                    
                    {/* Subtotal */}
                    <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-slate-100">
                      <span className="font-bold">Plan Base Subtotal</span>
                      <span className="font-black text-slate-900">₹{basePlanPrice.toLocaleString()}</span>
                    </div>

                    {/* Dynamic Cart Discount */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Icon name="percent" size={12} /> Dynamic Discount
                        </span>
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setDiscountTiming('before_tax')}
                            className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer', discountTiming === 'before_tax' ? 'bg-blue-600 text-white' : 'text-slate-500')}
                          >
                            Before Tax
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountTiming('after_tax')}
                            className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer', discountTiming === 'after_tax' ? 'bg-blue-600 text-white' : 'text-slate-500')}
                          >
                            After Tax
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {discountPresets.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDiscountPercent(d);
                              setCustomDiscountPercent('');
                            }}
                            className={cn(
                              'px-2 py-1 rounded-xl text-xs font-bold border transition cursor-pointer',
                              discountPercent === d && customDiscountPercent === ''
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            )}
                          >
                            {d === 0 ? 'Off' : `${d}%`}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[10px] font-bold text-slate-400">Custom</span>
                          <input
                            type="number"
                            placeholder="%"
                            value={customDiscountPercent}
                            onChange={(e) => setCustomDiscountPercent(e.target.value)}
                            className="w-12 px-1.5 py-1 text-xs border border-slate-200 rounded-xl text-center font-bold outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Charges */}
                    <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-100">
                      <span className="text-slate-600">Onboarding / Setup Fee:</span>
                      {showAddChargeInput ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="₹"
                            value={additionalChargeInput}
                            onChange={(e) => {
                              setAdditionalChargeInput(e.target.value);
                              setAdditionalCharge(Number(e.target.value) || 0);
                            }}
                            className="w-20 px-2 py-0.5 text-xs border border-slate-200 rounded-lg text-right font-bold"
                          />
                          <button type="button" onClick={() => setShowAddChargeInput(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Done</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddChargeInput(true)}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold"
                        >
                          {additionalCharge > 0 ? `+ ₹${additionalCharge}` : '+ Add Setup Fee'}
                        </button>
                      )}
                    </div>

                    {/* Tax Breakdown */}
                    <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>GST Tax Mode</span>
                        {isGstActive ? (
                          <div className="flex gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setTaxMode('CGST_SGST')}
                              className={cn('px-1.5 py-0.5 rounded font-bold cursor-pointer', taxMode === 'CGST_SGST' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}
                            >
                              CGST+SGST
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaxMode('IGST')}
                              className={cn('px-1.5 py-0.5 rounded font-bold cursor-pointer', taxMode === 'IGST' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}
                            >
                              IGST
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            GST Disabled (0%)
                          </span>
                        )}
                      </div>

                      {isGstActive ? (
                        taxMode === 'CGST_SGST' ? (
                          <>
                            <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                              <span>• CGST ({cgstRate}%)</span>
                              <span>+₹{cgst.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                              <span>• SGST ({sgstRate}%)</span>
                              <span>+₹{sgst.toLocaleString()}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                            <span>• IGST ({igstRate}%)</span>
                            <span>+₹{totalTax.toLocaleString()}</span>
                          </div>
                        )
                      ) : (
                        <div className="flex justify-between text-slate-400 text-[11px] pl-2 italic">
                          <span>• Tax (GST 0% Exempt / Disabled)</span>
                          <span>+₹0</span>
                        </div>
                      )}

                      {billingSettings.gstin && (
                        <div className="flex justify-between text-[10px] text-slate-400 pl-2">
                          <span>GSTIN / SAC:</span>
                          <span className="font-mono">{billingSettings.gstin} {billingSettings.sac_code ? `(${billingSettings.sac_code})` : ''}</span>
                        </div>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 text-[11px]">
                          <span>Discount Applied ({activeDiscountRate}%)</span>
                          <span>-₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Grand Total */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-500">GRAND TOTAL</span>
                      <span className="text-2xl font-black text-slate-900">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Payment Methods Bar matching Screenshot 2 POS */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Select Payment Method
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {/* CASH */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cash')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer',
                        paymentMethod === 'Cash'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700'
                      )}
                    >
                      <Icon name="banknote" size={15} className="text-emerald-600" />
                      <span className="text-xs font-black uppercase">CASH</span>
                    </button>

                    {/* CARD / PINELABS */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('Card / PineLabs');
                        setPineLabsModalOpen(true);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer text-left',
                        paymentMethod === 'Card / PineLabs'
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                          : 'border-blue-200 bg-white hover:bg-blue-50 text-blue-800'
                      )}
                    >
                      <Icon name="credit-card" size={15} className="text-blue-600" />
                      <div>
                        <span className="text-xs font-black uppercase block leading-tight">CARD / PINELABS</span>
                        <span className="text-[9px] text-blue-500 font-medium block">EDC Swiper &amp; POS</span>
                      </div>
                    </button>

                    {/* RAZORPAY UPI */}
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('Razorpay UPI');
                        setRazorpayModalOpen(true);
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer text-left',
                        paymentMethod === 'Razorpay UPI'
                          ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20 shadow-sm'
                          : 'border-purple-200 bg-white hover:bg-purple-50 text-purple-800'
                      )}
                    >
                      <Icon name="qr-code" size={15} className="text-purple-600" />
                      <div>
                        <span className="text-xs font-black uppercase block leading-tight">RAZORPAY UPI</span>
                        <span className="text-[9px] text-purple-500 font-medium block">Smart QR &amp; Link</span>
                      </div>
                    </button>

                    {/* WALLET */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Wallet')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer',
                        paymentMethod === 'Wallet'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-sm'
                          : 'border-amber-200 bg-white hover:bg-amber-50 text-amber-800'
                      )}
                    >
                      <Icon name="wallet" size={15} className="text-amber-600" />
                      <span className="text-xs font-black uppercase">WALLET</span>
                    </button>

                    {/* PAY LATER */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Pay Later')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer',
                        paymentMethod === 'Pay Later'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-800'
                      )}
                    >
                      <Icon name="clock" size={15} className="text-indigo-600" />
                      <span className="text-xs font-black uppercase">PAY LATER</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-between gap-2 border-t border-slate-100">
                  <button type="button" onClick={() => setWizardStep(2)} className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-1">
                    <Icon name="chevron-left" size={15} />
                    <span>Back to Plans</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOnboard}
                    disabled={onboarding}
                    className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30"
                  >
                    {onboarding ? (
                      <>
                        <Icon name="refresh-cw" size={14} className="animate-spin" />
                        <span>Provisioning Tenant &amp; Billing...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check-circle" size={15} />
                        <span>Complete Onboarding (₹{grandTotal.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* POST-ONBOARDING CREDENTIAL CARD & RECEIPT MODAL               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {credentialCardData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 w-full max-w-md space-y-5 shadow-2xl border border-slate-100 animate-scale-in text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Icon name="check-circle" size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">Gym Onboarded Successfully! 🎉</h3>
              <p className="text-xs text-slate-400 font-medium">
                SaaS Subscription &amp; GYM_OWNER credentials active.
              </p>
            </div>

            {/* Credential Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Gym Organization</span>
                <span className="text-slate-900 font-bold">{credentialCardData.gym_name}{credentialCardData.branch_name ? ` (${credentialCardData.branch_name})` : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Plan:</span>
                <span className="text-blue-600 font-bold">{credentialCardData.plan_name} ({credentialCardData.billing_cycle})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-emerald-700 font-bold">{credentialCardData.payment_method} (₹{(credentialCardData.paid_amount || 0).toLocaleString()})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Owner Name:</span>
                <span className="text-slate-800">{credentialCardData.owner_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Login Portal:</span>
                <span className="text-blue-600 font-bold">{typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'} (Owner Tab)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-900 font-mono font-bold">{credentialCardData.owner_email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Password:</span>
                <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {credentialCardData.temporary_password}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
                  const payload = `FIT CLUB GYM OWNER ONBOARDING CREDENTIALS:\n\nGym: ${credentialCardData.gym_name}\nPlan: ${credentialCardData.plan_name} (${credentialCardData.billing_cycle})\nPayment: ${credentialCardData.payment_method} - ₹${(credentialCardData.paid_amount || 0).toLocaleString()}\nLogin URL: ${loginUrl}\nRole: Gym Owner\nEmail: ${credentialCardData.owner_email}\nPassword: ${credentialCardData.temporary_password}\n\nPlease login and change your password upon first sign-in.`;
                  copyToClipboard(payload, 'credentials_sheet');
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Icon name={copiedKey === 'credentials_sheet' ? 'check' : 'copy'} size={15} />
                <span>{copiedKey === 'credentials_sheet' ? 'Copied to Clipboard! ✓' : 'Copy Credentials & Subscription Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCredentialCardData(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RESET PASSWORD MODAL                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 sm:p-7 w-full max-w-md space-y-4 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="key" size={18} className="text-amber-600" />
                <span>Reset Owner Credentials</span>
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            {resetResult ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Icon name="check-circle" size={24} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">New Credentials Active!</div>
                  <div className="text-xs text-slate-400 font-medium">Logged in Security Audit Trail</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs">
                  <div><span className="text-slate-400">Account:</span> <span className="font-bold text-slate-900">{resetResult.email}</span></div>
                  <div><span className="text-slate-400">New Password:</span> <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{resetResult.password}</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `FIT CLUB OWNER PASSWORD RESET:\nAccount: ${resetResult.email}\nNew Password: ${resetResult.password}\nLogin at: http://localhost:8080/login`;
                    copyToClipboard(text, 'reset_copy');
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Icon name={copiedKey === 'reset_copy' ? 'check' : 'copy'} size={14} />
                  <span>{copiedKey === 'reset_copy' ? 'Copied!' : 'Copy New Credentials'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn-secondary w-full py-2 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="text-slate-400 font-semibold">Owner: <span className="text-slate-800 font-bold">{resetModalUser.name}</span></div>
                  <div className="text-slate-400 font-semibold">Email: <span className="text-blue-600 font-bold">{resetModalUser.email}</span></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">New Password</label>
                    <button
                      type="button"
                      onClick={() => setNewPasswordVal(generateSecurePassword())}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                    >
                      <Icon name="refresh-cw" size={11} /> Generate
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 pr-9 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <Icon name={showNewPassword ? 'eye-off' : 'eye'} size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="btn-secondary py-2 px-3 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    {resetting ? 'Updating...' : 'Set & Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GYM 360 DETAIL DRAWER                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-navy-900/30 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-navy-100 p-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-900">Gym 360</h3>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-navy-100"><Icon name="x" size={18} className="text-navy-500" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-lg font-bold text-navy-900">{selected.name || '—'}</div>
                <div className="text-xs text-slate-400 font-semibold">{[selected.branch_name, selected.city].filter(Boolean).join(' • ') || '—'}</div>
              </div>

              {/* Owner Credentials Card */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2 text-xs">
                <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Owner Profile &amp; Plan</div>
                <div className="font-bold text-slate-900">{selected.owner_name || selected.owner?.name || selected.owner || '—'}</div>
                <div className="text-blue-700 font-semibold">{selected.owner_email || selected.owner?.email || '—'}</div>
                {selected.phone || selected.owner?.phone ? (
                  <div className="text-[11px] text-slate-500 font-medium">{selected.phone || selected.owner?.phone}</div>
                ) : null}

                <div className="pt-2 border-t border-blue-100 flex justify-between items-center">
                  <span className="text-slate-500">Subscribed Tier:</span>
                  <Badge variant="brand">{selected.plan || 'Pro Growth'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Billing &amp; Payment:</span>
                  <span className="font-bold text-slate-800">{selected.payment_method || 'Cash'} (₹{(selected.paid_amount || 0).toLocaleString()})</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => { setSelected(null); handleOpenResetModal(selected); }}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Icon name="key" size={13} /> Reset Password
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Members', value: selected.members || 0, icon: 'users' },
                  { label: 'Trainers', value: selected.trainers || 0, icon: 'user-cog' },
                  { label: 'Revenue', value: `₹${(selected.revenue || 0).toLocaleString()}`, icon: 'indian-rupee' },
                  { label: 'Status', value: selected.is_active ? 'Active' : 'Suspended', icon: 'shield' },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl bg-navy-50">
                    <div className="flex items-center gap-2 mb-1"><Icon name={s.icon as any} size={14} className="text-navy-500" /><span className="text-xs text-navy-400 font-medium">{s.label}</span></div>
                    <div className="text-base font-bold text-navy-900">{s.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  {!selected.is_active && (
                    <button onClick={() => handleStatusChange(selected.id, 'active')} className="btn-primary flex items-center justify-center gap-1">
                      <Icon name="check" size={14} /> Activate Gym
                    </button>
                  )}
                  {selected.is_active && (
                    <button onClick={() => handleStatusChange(selected.id, 'suspended')} className="btn-secondary text-danger-600 flex items-center justify-center gap-1">
                      <Icon name="x" size={14} /> Suspend Gym
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PINE LABS EDC MODAL (Step 3 POS Payment)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <PineLabsEDCModal
        isOpen={pineLabsModalOpen}
        amount={grandTotal}
        billNumber={`ONB-${Date.now().toString().slice(-6)}`}
        customerMobile={onboardForm.phone}
        terminalId="TID-882194"
        onClose={() => setPineLabsModalOpen(false)}
        onSuccess={(paymentData) => {
          setPineLabsModalOpen(false);
          executeActualOnboarding('Card / PineLabs');
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RAZORPAY POS MODAL (Step 3 POS Payment)                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <RazorpayPOSModal
        isOpen={razorpayModalOpen}
        amount={grandTotal}
        billNumber={`ONB-${Date.now().toString().slice(-6)}`}
        customerMobile={onboardForm.phone}
        customerName={onboardForm.owner_name || onboardForm.gym_name}
        onClose={() => setRazorpayModalOpen(false)}
        onSuccess={(paymentData) => {
          setRazorpayModalOpen(false);
          executeActualOnboarding('Razorpay UPI');
        }}
      />
    </div>
  );
}
