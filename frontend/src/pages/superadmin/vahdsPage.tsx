import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { PineLabsEDCModal } from '@/components/pos/PineLabsEDCModal';
import { RazorpayPOSModal } from '@/components/pos/RazorpayPOSModal';
import type { vahd } from '@/types';
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
  max_employees: number;
  ai_credits_monthly: number;
  storage_gb: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
}

function generateSecurePassword(): string {
  const words = ['VAHD', 'Iron', 'Apex', 'Titan', 'Pulse', 'Zenith', 'Vortex', 'Prime'];
  const symbols = ['!', '@', '#', '$', '%', '&'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${word}@${num}${sym}`;
}

export function VahdsPage() {
  const [vahds, setvahds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // SaaS Plans from DB
  const [saasPlans, setSaasPlans] = useState<SaaSPlanItem[]>([]);

  // Billing Settings from Database
  const [billingSettings, setBillingSettings] = useState<{
    vahd_name?: string;
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
    vahd_name: '',
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
    vahd_name: string;
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

  // Checkbox Selection & Deletion State
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; orgIds: string[]; vahdNames: string[] }>({
    open: false,
    orgIds: [],
    vahdNames: [],
  });

  // Action Menu Dropdown State
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.owner-action-dropdown-container')) {
        setOpenActionDropdownId(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Fetch vahds from DB
  const fetchvahds = (hoId?: string) => {
    setLoading(true);
    const activeHo = hoId !== undefined ? hoId : (localStorage.getItem('vahd_selected_org_id') || 'all');
    api.superAdmin.vahds(activeHo)
      .then((data) => {
        setvahds(data || []);
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
      .catch(() => { });

    api.superAdmin.billingSettings()
      .then((bData) => {
        if (bData) {
          const isEnabled = Boolean(
            bData.enable_gst_engine &&
            (Number(bData.total_gst_rate ?? 0) > 0 || Number(bData.cgst_rate ?? 0) > 0 || Number(bData.sgst_rate ?? 0) > 0 || Number(bData.igst_rate ?? 0) > 0)
          );

          setBillingSettings({
            vahd_name: bData.vahd_name || '',
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
      .catch(() => { });
  };

  useEffect(() => {
    fetchvahds();
    loadSaaSMetadata();
    const handleOrgChanged = (e: any) => {
      fetchvahds(e.detail?.id);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
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
    setOnboardForm({
      vahd_name: '',
      branch_name: '',
      city: '',
      address: '',
      owner_name: '',
      owner_email: '',
      phone: '',
      password: '',
    });
    setOnboardError('');
    setOnboardOpen(true);
  };

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
        setOnboardForm({
          vahd_name: '',
          branch_name: '',
          city: '',
          address: '',
          owner_name: '',
          owner_email: '',
          phone: '',
          password: '',
        });
        setOnboardError('');
        fetchvahds();
      } else {
        setOnboardError(res?.message || 'Failed to onboard organization. Please try again.');
      }
    } catch (err: any) {
      setOnboardError(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to onboard organization.');
    } finally {
      setOnboarding(false);
    }
  };

  const handleStatusChange = async (vahdId: string, newStatus: string) => {
    const isActive = newStatus.toLowerCase() === 'active';
    setvahds((prev) =>
      prev.map((v) => (v.id === vahdId ? { ...v, is_active: isActive, status: isActive ? 'active' : 'inactive' } : v))
    );
    if (selected && selected.id === vahdId) {
      setSelected((prev: any) => (prev ? { ...prev, status: newStatus, is_active: isActive } : null));
    }
    try {
      await api.superAdmin.updatevahdStatus(vahdId, newStatus);
      fetchvahds();
    } catch (_err) {
      fetchvahds();
    }
  };

  const handleOpenResetModal = (g: any) => {
    setResetModalUser({
      id: g.owner_id || g.owner_email || g.id,
      name: g.owner_name || g.owner || 'Owner',
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
      fetchvahds();
    } catch (_err) {
      /* ignore */
    } finally {
      setResetting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (filteredvahds.length > 0 && selectedOrgIds.length === filteredvahds.length) {
      setSelectedOrgIds([]);
    } else {
      setSelectedOrgIds(filteredvahds.map((g) => g.id));
    }
  };

  const handleToggleSelectOrg = (id: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleOpenDeleteSingle = (g: any) => {
    setDeleteConfirmModal({
      open: true,
      orgIds: [g.id],
      vahdNames: [g.name || g.branch_name || 'Selected Organization'],
    });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmModal.orgIds.length === 0) return;
    setDeleting(true);
    try {
      if (deleteConfirmModal.orgIds.length === 1) {
        await api.superAdmin.deleteOrganization(deleteConfirmModal.orgIds[0]);
      } else {
        await api.superAdmin.bulkDeleteOrganizations(deleteConfirmModal.orgIds);
      }
      setSelectedOrgIds((prev) => prev.filter((id) => !deleteConfirmModal.orgIds.includes(id)));
      if (selected && deleteConfirmModal.orgIds.includes(selected.id)) {
        setSelected(null);
      }
      setDeleteConfirmModal({ open: false, orgIds: [], vahdNames: [] });
      await fetchvahds();
    } catch (err: any) {
      console.error('Failed to delete organization:', err);
      alert(err?.message || 'Failed to delete organization from database.');
    } finally {
      setDeleting(false);
    }
  };

  const executeActualOnboarding = async (effectiveMethod?: string) => {
    setOnboarding(true);
    setOnboardError('');

    try {
      const methodToUse = effectiveMethod || paymentMethod;
      const payload = {
        ...onboardForm,
        branch_name: onboardForm.branch_name.trim() || onboardForm.vahd_name.trim(),
        plan_id: selectedPlan?.id || '',
        plan_name: selectedPlan?.name || '',
        plan_tier: selectedPlan?.code || '',
        billing_cycle: billingCycle,
        payment_method: methodToUse,
        paid_amount: grandTotal,
        discount_percent: activeDiscountRate,
        discount_amount: discountAmount,
        tax_mode: taxMode,
        tax_amount: totalTax,
        additional_charges: Number(additionalCharge || 0),
      };

      const res = await api.superAdmin.onboardvahd(payload);
      if (res && res.success) {
        setOnboardOpen(false);
        setCredentialCardData({
          vahd_name: onboardForm.vahd_name,
          branch_name: onboardForm.branch_name.trim() || onboardForm.vahd_name.trim(),
          owner_name: onboardForm.owner_name.trim() || '—',
          owner_email: onboardForm.owner_email,
          phone: onboardForm.phone,
          temporary_password: onboardForm.password,
          plan_name: selectedPlan?.name || '',
          billing_cycle: billingCycle,
          payment_method: methodToUse,
          paid_amount: grandTotal,
        });
        fetchvahds();
      } else {
        setOnboardError(res?.message || 'Failed to onboard organization. Please try again.');
      }

    } catch (err: any) {
      setOnboardError(err?.message || 'Failed to onboard organization. Please check inputs.');
    } finally {
      setOnboarding(false);
    }
  };

  const handleCompleteOnboard = async () => {
    if (!onboardForm.vahd_name.trim() || !onboardForm.owner_email.trim()) {
      setOnboardError('Please fill in both Organization Name and Owner Email.');
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

  const filteredvahds = vahds.filter((g) => {
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
        title="Head Office Directory"
        breadcrumb={['Super Admin', 'Head Office']}
        actions={
          <button
            onClick={handleOpenOnboard}
            className="btn-primary flex items-center gap-2"
          >
            <Icon name="plus" size={16} /> Onboard HO's
          </button>
        }
      />

      {/* Top Search & Filter Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search head office, branch, owner, email, city, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            Total Head Offices: <span className="text-blue-600 font-bold">{vahds.length}</span>
          </div>
          <button onClick={() => fetchvahds()} className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3">
            <Icon name="refresh-cw" size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Bulk Selection Actions Bar */}
      {selectedOrgIds.length > 0 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3.5 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
              {selectedOrgIds.length}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {selectedOrgIds.length} {selectedOrgIds.length === 1 ? 'Head Office' : 'Head Offices'} Selected
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Apply bulk management actions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrgIds([])}
              className="btn-secondary py-1.5 px-3 text-xs font-bold"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => {
                const selectedNames = vahds
                  .filter((g) => selectedOrgIds.includes(g.id))
                  .map((g) => g.name || g.branch_name || g.id);
                setDeleteConfirmModal({ open: true, orgIds: selectedOrgIds, vahdNames: selectedNames });
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Icon name="trash-2" size={14} />
              <span>Delete Selected ({selectedOrgIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Head Offices Table */}
      <div className="card p-4">
        {loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : filteredvahds.length > 0 ? (
          <div className="overflow-x-auto -mx-4 px-4 min-h-[340px] pb-32">
            <table className="w-full min-w-[1000px] text-xs">
              <thead>
                <tr className="border-b border-navy-100 text-navy-400 text-left font-semibold uppercase tracking-wider">
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredvahds.length > 0 && selectedOrgIds.length === filteredvahds.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title="Select / Deselect All"
                    />
                  </th>
                  <th className="px-3 py-3">Head Office &amp; Branch</th>
                  <th className="px-3 py-3">HO Credentials</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3 text-center">Institutions</th>
                  <th className="px-3 py-3 text-center">Owners</th>
                  <th className="px-3 py-3 text-center">Emp</th>
                  <th className="px-3 py-3 text-center">Students</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Owner Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredvahds.map((g) => (
                  <tr
                    key={g.id}
                    className={cn(
                      'border-b border-navy-50 hover:bg-slate-50/80 transition-colors',
                      selectedOrgIds.includes(g.id) ? 'bg-blue-50/50' : ''
                    )}
                  >
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.includes(g.id)}
                        onChange={() => handleToggleSelectOrg(g.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </td>

                    <td className="px-3 py-3 cursor-pointer" onClick={() => setSelected(g)}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Icon name="building-2" size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {g.name || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">{g.branch_name || 'Main HQ'}</div>
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

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80 shadow-2xs">
                        {g.branches_count || 1}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100/80 shadow-2xs">
                        {g.owners_count || 0}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100/80 shadow-2xs">
                        {g.employees_count || 0}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-2xs">
                        {g.students_count || g.members || 0}
                      </span>
                    </td>

                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center">
                        <select
                          value={g.is_active ? 'active' : 'inactive'}
                          onChange={(e) => handleStatusChange(g.id, e.target.value)}
                          aria-label="Change status"
                          className={cn(
                            'text-xs font-bold rounded-xl pl-6 pr-6 py-1 border transition-all cursor-pointer outline-none focus:ring-2 appearance-none text-left shadow-2xs',
                            g.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 focus:ring-emerald-400'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80 focus:ring-rose-400'
                          )}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            backgroundSize: '12px',
                          }}
                        >
                          <option value="active" className="text-emerald-700 bg-white font-bold">Active</option>
                          <option value="inactive" className="text-rose-700 bg-white font-bold">Inactive</option>
                        </select>
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full absolute left-2.5 pointer-events-none',
                            g.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          )}
                        />
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block text-left owner-action-dropdown-container">
                        <button
                          type="button"
                          onClick={() => setOpenActionDropdownId((prev) => (prev === g.id ? null : g.id))}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer outline-none select-none',
                            openActionDropdownId === g.id
                              ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          )}
                          title="Actions menu"
                        >
                          <Icon name="more-horizontal" size={14} className="text-slate-500" />
                          <span>Actions</span>
                          <Icon
                            name="chevron-down"
                            size={12}
                            className={cn('text-slate-400 transition-transform duration-200', openActionDropdownId === g.id && 'rotate-180')}
                          />
                        </button>

                        {openActionDropdownId === g.id && (
                          <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 py-1.5 animate-scale-in max-h-60 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                              Owner Actions
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdownId(null);
                                setSelected(g);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Icon name="eye" size={13} />
                              </div>
                              <div className="flex flex-col">
                                <span>360 Breakdown</span>
                                <span className="text-[10px] text-slate-400 font-normal">View stats & metrics</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdownId(null);
                                handleOpenResetModal(g);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Icon name="key" size={13} />
                              </div>
                              <div className="flex flex-col">
                                <span>Reset Credentials</span>
                                <span className="text-[10px] text-slate-400 font-normal">Change password</span>
                              </div>
                            </button>

                            {g.is_active ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionDropdownId(null);
                                  handleStatusChange(g.id, 'suspended');
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                  <Icon name="shield-alert" size={13} />
                                </div>
                                <div className="flex flex-col">
                                  <span>Suspend Head Office</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Deactivate access</span>
                                </div>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionDropdownId(null);
                                  handleStatusChange(g.id, 'active');
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-emerald-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                  <Icon name="check" size={13} />
                                </div>
                                <div className="flex flex-col">
                                  <span>Activate Head Office</span>
                                  <span className="text-[10px] text-slate-400 font-normal">Restore full access</span>
                                </div>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionDropdownId(null);
                                handleOpenDeleteSingle(g);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <div className="w-6 h-6 rounded-lg bg-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
                                <Icon name="trash-2" size={13} />
                              </div>
                              <div className="flex flex-col">
                                <span>Delete Head Office</span>
                                <span className="text-[10px] text-rose-400 font-normal">Permanent deletion</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            No organizations or owners found matching your search.
          </div>
        )}
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
              <h3 className="text-xl font-black text-slate-900">Head Office (HO) Account Created! 🎉</h3>
              <p className="text-xs text-slate-400 font-medium">
                SaaS Subscription &amp; Head Office (HO) portal credentials active.
              </p>
            </div>

            {/* Credential Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Head Office / Org</span>
                <span className="text-slate-900 font-bold">{credentialCardData.vahd_name}{credentialCardData.branch_name ? ` (${credentialCardData.branch_name})` : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Assigned Plan:</span>
                <span className="text-indigo-600 font-bold">{credentialCardData.plan_name} ({credentialCardData.billing_cycle})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Method:</span>
                <span className="text-emerald-700 font-bold">{credentialCardData.payment_method} (₹{(credentialCardData.paid_amount || 0).toLocaleString()})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Admin Name:</span>
                <span className="text-slate-800">{credentialCardData.owner_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Login Portal:</span>
                <span className="text-indigo-600 font-bold">{typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'} (HO Tab)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">HO Email:</span>
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
                  const payload = `HEAD OFFICE (HO) ONBOARDING CREDENTIALS:\n\nHead Office / Org: ${credentialCardData.vahd_name}\nPlan: ${credentialCardData.plan_name} (${credentialCardData.billing_cycle})\nPayment: ${credentialCardData.payment_method} - ₹${(credentialCardData.paid_amount || 0).toLocaleString()}\nLogin URL: ${loginUrl}\nPortal: Head Office (HO) Tab\nRole: Head Office (HO)\nEmail: ${credentialCardData.owner_email}\nPassword: ${credentialCardData.temporary_password}\n\nPlease login and change your password upon first sign-in.`;
                  copyToClipboard(payload, 'credentials_sheet');
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Icon name={copiedKey === 'credentials_sheet' ? 'check' : 'copy'} size={15} />
                <span>{copiedKey === 'credentials_sheet' ? 'Copied to Clipboard! ✓' : 'Copy HO Credentials & Subscription Receipt'}</span>
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
                    const text = `vahd OWNER PASSWORD RESET:\nAccount: ${resetResult.email}\nNew Password: ${resetResult.password}\nLogin at: http://localhost:8080/login`;
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
      {/* vahd 360 DETAIL DRAWER                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-navy-900/30 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-navy-100 p-5 flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-900">Organization 360</h3>
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
                  <Badge variant="brand">{selected.plan || '—'}</Badge>
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
                  { label: 'Institutions', value: selected.branches_count || 1, icon: 'building' },
                  { label: 'Owners', value: selected.owners_count || 0, icon: 'shield' },
                  { label: 'Emp', value: selected.employees_count || selected.employees || 0, icon: 'user-check' },
                  { label: 'Students', value: selected.students_count || selected.members || 0, icon: 'users' },
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
                      <Icon name="check" size={14} /> Activate Organization
                    </button>
                  )}
                  {selected.is_active && (
                    <button onClick={() => handleStatusChange(selected.id, 'suspended')} className="btn-secondary text-danger-600 flex items-center justify-center gap-1">
                      <Icon name="x" size={14} /> Suspend Organization
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
        studentMobile={onboardForm.phone}
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
        studentMobile={onboardForm.phone}
        studentName={onboardForm.owner_name || onboardForm.vahd_name}
        onClose={() => setRazorpayModalOpen(false)}
        onSuccess={(paymentData) => {
          setRazorpayModalOpen(false);
          executeActualOnboarding('Razorpay UPI');
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DELETE ORGANIZATIONS CONFIRMATION MODAL                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-6 sm:p-7 w-full max-w-md space-y-5 shadow-2xl border border-slate-100 animate-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Icon name="alert-triangle" size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                {deleteConfirmModal.orgIds.length === 1
                  ? 'Delete Organization?'
                  : `Delete ${deleteConfirmModal.orgIds.length} Organizations?`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                This action is permanent and will remove the organization branch and associated owner record from the database.
              </p>
            </div>

            {deleteConfirmModal.vahdNames.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left max-h-36 overflow-y-auto space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Selected to be removed:
                </div>
                {deleteConfirmModal.vahdNames.map((name, idx) => (
                  <div key={idx} className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmModal({ open: false, orgIds: [], vahdNames: [] })}
                className="btn-secondary py-2.5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Icon name="refresh-cw" size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Icon name="trash-2" size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const vahdsPage = VahdsPage;
export default VahdsPage;
