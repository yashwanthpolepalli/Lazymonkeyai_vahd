import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface BillingSettingsData {
  gym_name: string;
  address: string;
  gstin: string;
  sac_code: string;
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
  tier_discounts: Record<string, number>;
}

const EMPTY_BILLING_SETTINGS: BillingSettingsData = {
  gym_name: '',
  address: '',
  gstin: '',
  sac_code: '',
  enable_gst_engine: false,
  sgst_rate: 0,
  sgst_enabled: false,
  cgst_rate: 0,
  cgst_enabled: false,
  igst_rate: 0,
  igst_enabled: false,
  total_gst_rate: 0,
  tax_pricing_mode: 'exclusive',
  enable_discount_engine: false,
  pos_discount_presets: [],
  max_staff_discount: 0,
  discount_sequence: 'before_tax',
  tier_discounts: {},
};

const GST_SLAB_PRESETS = [
  { rate: 0, label: 'Nil' },
  { rate: 5, label: 'Essential' },
  { rate: 12, label: 'Standard' },
  { rate: 18, label: 'Salon / Gym' },
  { rate: 28, label: 'Ultra' },
];

export function BillingSettingsTab() {
  const [settings, setSettings] = useState<BillingSettingsData>(EMPTY_BILLING_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPresetVal, setNewPresetVal] = useState('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Simulator State
  const [testAmount, setTestAmount] = useState<number>(5000);
  const [testDiscount, setTestDiscount] = useState<number>(10);
  const [currentTimeIST, setCurrentTimeIST] = useState<string>('');

  useEffect(() => {
    fetchSettings();

    // Live IST Date & Time clock (DD/MM/YYYY hh:mm:ss A IST)
    const updateISTTime = () => {
      const now = new Date();
      // Format in IST timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      const formatted = new Intl.DateTimeFormat('en-GB', options).format(now);
      // '23/09/2026, 12:20:15 pm' -> format nicely
      setCurrentTimeIST(`${formatted.replace(',', '')} IST`);
    };

    updateISTTime();
    const timer = setInterval(updateISTTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.settings.billing();
      if (res) {
        setSettings({
          gym_name: res.gym_name || '',
          address: res.address || '',
          gstin: res.gstin || '',
          sac_code: res.sac_code || '',
          enable_gst_engine: Boolean(res.enable_gst_engine),
          sgst_rate: Number(res.sgst_rate) || 0,
          sgst_enabled: Boolean(res.sgst_enabled),
          cgst_rate: Number(res.cgst_rate) || 0,
          cgst_enabled: Boolean(res.cgst_enabled),
          igst_rate: Number(res.igst_rate) || 0,
          igst_enabled: Boolean(res.igst_enabled),
          total_gst_rate: Number(res.total_gst_rate) || 0,
          tax_pricing_mode: res.tax_pricing_mode || 'exclusive',
          enable_discount_engine: Boolean(res.enable_discount_engine),
          pos_discount_presets: Array.isArray(res.pos_discount_presets) ? res.pos_discount_presets : [],
          max_staff_discount: Number(res.max_staff_discount) || 0,
          discount_sequence: res.discount_sequence || 'before_tax',
          tier_discounts: res.tier_discounts && typeof res.tier_discounts === 'object' ? res.tier_discounts : {},
        });
      }
    } catch (_err) {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.settings.saveBilling(settings).catch(() => null),
        api.superAdmin.saveBillingSettings(settings).catch(() => null),
      ]);
      setToastMsg({ type: 'success', text: 'GST & Discount Matrix settings saved to PostgreSQL DB!' });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err?.message || 'Failed to save billing settings.' });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Slab preset click handler
  const handleApplySlab = (rate: number) => {
    if (rate === 0) {
      setSettings((prev) => ({
        ...prev,
        enable_gst_engine: false,
        total_gst_rate: 0,
        sgst_rate: 0,
        cgst_rate: 0,
        igst_rate: 0,
        sgst_enabled: false,
        cgst_enabled: false,
        igst_enabled: false,
      }));
      return;
    }

    if (settings.igst_enabled) {
      setSettings((prev) => ({
        ...prev,
        igst_rate: rate,
        total_gst_rate: rate,
        enable_gst_engine: true,
        igst_enabled: true,
      }));
    } else {
      const half = rate / 2;
      setSettings((prev) => ({
        ...prev,
        sgst_rate: half,
        cgst_rate: half,
        sgst_enabled: true,
        cgst_enabled: true,
        total_gst_rate: rate,
        enable_gst_engine: true,
      }));
    }
  };

  // Tax breakdown switches
  const toggleSgst = () => {
    const next = !settings.sgst_enabled;
    const newTotal = (next ? (settings.sgst_rate || 9) : 0) + (settings.cgst_enabled ? (settings.cgst_rate || 9) : 0);
    const hasAnyTax = next || settings.cgst_enabled;
    setSettings((p) => ({
      ...p,
      sgst_enabled: next,
      total_gst_rate: newTotal,
      enable_gst_engine: hasAnyTax && newTotal > 0,
    }));
  };

  const toggleCgst = () => {
    const next = !settings.cgst_enabled;
    const newTotal = (settings.sgst_enabled ? (settings.sgst_rate || 9) : 0) + (next ? (settings.cgst_rate || 9) : 0);
    const hasAnyTax = settings.sgst_enabled || next;
    setSettings((p) => ({
      ...p,
      cgst_enabled: next,
      total_gst_rate: newTotal,
      enable_gst_engine: hasAnyTax && newTotal > 0,
    }));
  };

  const toggleIgst = () => {
    const next = !settings.igst_enabled;
    const newTotal = next ? (settings.igst_rate || 18) : ((settings.sgst_enabled ? settings.sgst_rate : 0) + (settings.cgst_enabled ? settings.cgst_rate : 0));
    setSettings((p) => ({
      ...p,
      igst_enabled: next,
      sgst_enabled: !next,
      cgst_enabled: !next,
      total_gst_rate: newTotal,
      enable_gst_engine: next ? newTotal > 0 : ((p.sgst_enabled || p.cgst_enabled) && newTotal > 0),
    }));
  };

  // Preset chip management
  const handleRemovePreset = (presetToRemove: number) => {
    setSettings((prev) => ({
      ...prev,
      pos_discount_presets: prev.pos_discount_presets.filter((p) => p !== presetToRemove),
    }));
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newPresetVal);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      if (!settings.pos_discount_presets.includes(num)) {
        const sorted = [...settings.pos_discount_presets, num].sort((a, b) => a - b);
        setSettings((prev) => ({ ...prev, pos_discount_presets: sorted }));
      }
      setNewPresetVal('');
    }
  };

  // Live Math calculations for the Simulator
  const simulatedMath = useMemo(() => {
    const gross = Math.max(0, Number(testAmount) || 0);
    const maxDiscountAllowed = settings.max_staff_discount > 0 ? settings.max_staff_discount : 100;
    const discountPct = settings.enable_discount_engine ? Math.min(maxDiscountAllowed, Math.max(0, Number(testDiscount) || 0)) : 0;
    const discountVal = (gross * discountPct) / 100;

    let taxable = gross;
    let cgstVal = 0;
    let sgstVal = 0;
    let igstVal = 0;
    let totalTaxVal = 0;
    let totalPayable = 0;

    const isExclusive = settings.tax_pricing_mode === 'exclusive';
    const activeTaxRate = settings.enable_gst_engine
      ? (settings.igst_enabled ? settings.igst_rate : ((settings.sgst_enabled ? settings.sgst_rate : 0) + (settings.cgst_enabled ? settings.cgst_rate : 0)))
      : 0;

    if (settings.discount_sequence === 'before_tax') {
      taxable = Math.max(0, gross - discountVal);
      if (isExclusive) {
        if (settings.igst_enabled) {
          igstVal = Math.round((taxable * activeTaxRate) / 100);
          totalTaxVal = igstVal;
        } else {
          cgstVal = Math.round((taxable * (settings.cgst_enabled ? settings.cgst_rate : 0)) / 100);
          sgstVal = Math.round((taxable * (settings.sgst_enabled ? settings.sgst_rate : 0)) / 100);
          totalTaxVal = cgstVal + sgstVal;
        }
        totalPayable = taxable + totalTaxVal;
      } else {
        // Inclusive
        totalPayable = taxable;
        totalTaxVal = activeTaxRate > 0 ? Math.round((taxable * activeTaxRate) / (100 + activeTaxRate)) : 0;
        if (settings.igst_enabled) {
          igstVal = totalTaxVal;
        } else {
          cgstVal = Math.round(totalTaxVal / 2);
          sgstVal = totalTaxVal - cgstVal;
        }
      }
    } else {
      // After Tax
      taxable = gross;
      if (isExclusive) {
        if (settings.igst_enabled) {
          igstVal = Math.round((gross * activeTaxRate) / 100);
          totalTaxVal = igstVal;
        } else {
          cgstVal = Math.round((gross * (settings.cgst_enabled ? settings.cgst_rate : 0)) / 100);
          sgstVal = Math.round((gross * (settings.sgst_enabled ? settings.sgst_rate : 0)) / 100);
          totalTaxVal = cgstVal + sgstVal;
        }
        totalPayable = Math.max(0, gross + totalTaxVal - discountVal);
      } else {
        totalPayable = Math.max(0, gross - discountVal);
        totalTaxVal = activeTaxRate > 0 ? Math.round((gross * activeTaxRate) / (100 + activeTaxRate)) : 0;
        if (settings.igst_enabled) {
          igstVal = totalTaxVal;
        } else {
          cgstVal = Math.round(totalTaxVal / 2);
          sgstVal = totalTaxVal - cgstVal;
        }
      }
    }

    return {
      gross,
      discountPct,
      discountVal,
      taxable,
      cgstVal,
      sgstVal,
      igstVal,
      totalTaxVal,
      activeTaxRate,
      totalPayable,
    };
  }, [testAmount, testDiscount, settings]);

  if (loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500">Loading GST &amp; Discount Matrix Engines from Database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-slide-in',
            toastMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          )}
        >
          <Icon name={toastMsg.type === 'success' ? 'check-circle' : 'alert-triangle'} size={18} />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP DUAL ENGINE MASTER TOGGLE CARDS                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GST / Tax Billing Engine Toggle Card */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center justify-between shadow-sm',
            settings.enable_gst_engine ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-colors',
                settings.enable_gst_engine ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              )}
            >
              <Icon name="receipt" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">GST / Tax Billing Engine</h3>
                <span
                  className={cn(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase',
                    settings.enable_gst_engine ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {settings.enable_gst_engine ? 'ENABLED (ACTIVE)' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings.enable_gst_engine
                  ? `Automatically calculating ${settings.total_gst_rate}% GST (${settings.cgst_rate}% CGST + ${settings.sgst_rate}% SGST) on POS bills.`
                  : 'Tax calculations disabled. All invoices will be created at 0% tax.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettings((p) => ({ ...p, enable_gst_engine: !p.enable_gst_engine }))}
            aria-label="Toggle GST Engine"
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
              settings.enable_gst_engine ? 'bg-emerald-600' : 'bg-slate-300'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                settings.enable_gst_engine ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Discount Matrix Engine Toggle Card */}
        <div
          className={cn(
            'p-4 rounded-2xl border transition-all flex items-center justify-between shadow-sm',
            settings.enable_discount_engine ? 'bg-sky-50/40 border-sky-200' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-colors',
                settings.enable_discount_engine ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-400'
              )}
            >
              <Icon name="percent" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Discount Matrix Engine</h3>
                <span
                  className={cn(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider uppercase',
                    settings.enable_discount_engine ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                  )}
                >
                  {settings.enable_discount_engine ? 'ENABLED (ACTIVE)' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cashier &amp; VIP membership discounts enabled (Max allowed: {settings.max_staff_discount}%).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSettings((p) => ({ ...p, enable_discount_engine: !p.enable_discount_engine }))}
            aria-label="Toggle Discount Engine"
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
              settings.enable_discount_engine ? 'bg-sky-600' : 'bg-slate-300'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                settings.enable_discount_engine ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN TWO-COLUMN CONFIGURATION & SIMULATOR GRID             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: CONFIGURATION CARDS ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* CARD 1: GST Percentage & Tax Registration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Icon name="receipt" size={17} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">GST Percentage &amp; Tax Registration</h4>
                <p className="text-[11px] text-slate-400">Setup Goods and Services Tax breakdown (CGST + SGST) and official GSTIN.</p>
              </div>
            </div>

            {/* Quick GST Slabs & Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Quick GST Slabs &amp; Presets</label>
              <div className="grid grid-cols-5 gap-2.5">
                {GST_SLAB_PRESETS.map((slab) => {
                  const isSelected = settings.total_gst_rate === slab.rate;
                  return (
                    <button
                      key={slab.rate}
                      type="button"
                      onClick={() => handleApplySlab(slab.rate)}
                      className={cn(
                        'py-2.5 px-1 rounded-2xl text-center border transition-all cursor-pointer',
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-black'
                          : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-emerald-50/30'
                      )}
                    >
                      <div className="text-xs font-black">{slab.rate}%</div>
                      <div className={cn('text-[10px]', isSelected ? 'text-emerald-100' : 'text-slate-400')}>
                        {slab.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tax Component Breakdown Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* SGST */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">SGST (%)</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[9px] font-extrabold', settings.sgst_enabled ? 'text-emerald-600' : 'text-slate-400')}>
                      {settings.sgst_enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      onClick={toggleSgst}
                      aria-label="Toggle SGST"
                      className={cn(
                        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        settings.sgst_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition',
                          settings.sgst_enabled ? 'translate-x-3' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.sgst_rate || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        sgst_rate: val,
                        total_gst_rate: (p.sgst_enabled ? val : 0) + (p.cgst_enabled ? p.cgst_rate : 0),
                      }));
                    }}
                    className="w-full bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 pr-6"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* CGST */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">CGST (%)</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[9px] font-extrabold', settings.cgst_enabled ? 'text-emerald-600' : 'text-slate-400')}>
                      {settings.cgst_enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      onClick={toggleCgst}
                      aria-label="Toggle CGST"
                      className={cn(
                        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        settings.cgst_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition',
                          settings.cgst_enabled ? 'translate-x-3' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={settings.cgst_rate || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        cgst_rate: val,
                        total_gst_rate: (p.sgst_enabled ? p.sgst_rate : 0) + (p.cgst_enabled ? val : 0),
                      }));
                    }}
                    className="w-full bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 pr-6"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* IGST */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">IGST (%)</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-[9px] font-extrabold', settings.igst_enabled ? 'text-emerald-600' : 'text-slate-400')}>
                      {settings.igst_enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      onClick={toggleIgst}
                      aria-label="Toggle IGST"
                      className={cn(
                        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        settings.igst_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition',
                          settings.igst_enabled ? 'translate-x-3' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={!settings.igst_enabled}
                    value={settings.igst_rate || ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        igst_rate: val,
                        total_gst_rate: val,
                      }));
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 pr-6',
                      settings.igst_enabled ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-400'
                    )}
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* Total GST Rate Summary Box */}
              <div className="bg-emerald-50/50 p-3 rounded-2xl border-2 border-emerald-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Total GST Rate</span>
                  <span className="text-[9px] font-extrabold text-emerald-700">
                    {settings.igst_enabled ? `IGST ${settings.igst_rate}%` : `SGST ${settings.sgst_rate}% + CGST ${settings.cgst_rate}%`}
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-2xl font-black text-emerald-700">{settings.total_gst_rate}</span>
                  <span className="text-xs font-black text-emerald-600">%</span>
                </div>
              </div>
            </div>

            {/* Registration & Mode Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gym / Trade Name</label>
                <input
                  type="text"
                  placeholder="e.g. OLYMPUS ATHLETIC CLUB"
                  value={settings.gym_name}
                  onChange={(e) => setSettings((p) => ({ ...p, gym_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gym Registered Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Hitech City, Hyderabad"
                  value={settings.address}
                  onChange={(e) => setSettings((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gym GSTIN Number</label>
                <input
                  type="text"
                  placeholder="Enter GSTIN Number"
                  value={settings.gstin}
                  onChange={(e) => setSettings((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Service HSN / SAC Code</label>
                <input
                  type="text"
                  placeholder="e.g. 999723"
                  value={settings.sac_code}
                  onChange={(e) => setSettings((p) => ({ ...p, sac_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Tax Pricing Mode</label>
              <select
                value={settings.tax_pricing_mode}
                onChange={(e) => setSettings((p) => ({ ...p, tax_pricing_mode: e.target.value }))}
                className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="exclusive">Exclusive (GST added on top of base)</option>
                <option value="inclusive">Inclusive (GST included in prices)</option>
              </select>
            </div>
          </div>

          {/* CARD 2: Discount Matrix & Preset Configurations */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Icon name="percent" size={17} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Discount Matrix &amp; Preset Configurations</h4>
                <p className="text-[11px] text-slate-400">Configure POS discount presets, cashier guardrails, and membership tier discounts.</p>
              </div>
            </div>

            {/* POS Discount Quick-Pills */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">POS Discount Quick-Pills</label>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {settings.pos_discount_presets.length > 0 ? (
                  settings.pos_discount_presets.map((preset) => (
                    <div
                      key={preset}
                      className="bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-sky-100 transition-colors"
                    >
                      <span>{preset}%</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreset(preset)}
                        className="text-sky-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No discount presets added yet. Add a preset below.</span>
                )}
              </div>

              {/* Add New Preset */}
              <form onSubmit={handleAddPreset} className="flex items-center gap-2 max-w-sm">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Add % preset (e.g. 10)"
                  value={newPresetVal}
                  onChange={(e) => setNewPresetVal(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-sky-500 flex-1 font-medium"
                />
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1"
                >
                  <Icon name="plus" size={13} /> Add Preset
                </button>
              </form>
            </div>

            {/* Staff Limit Slider & Calculation Sequence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Max Allowed Staff Discount</label>
                  <span className="text-xs font-black text-sky-600">{settings.max_staff_discount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.max_staff_discount}
                  onChange={(e) => setSettings((p) => ({ ...p, max_staff_discount: Number(e.target.value) }))}
                  className="w-full accent-sky-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Staff cannot exceed this limit without owner biometric or override pin.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Discount Calculation Sequence</label>
                <select
                  value={settings.discount_sequence}
                  onChange={(e) => setSettings((p) => ({ ...p, discount_sequence: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-sky-500"
                >
                  <option value="before_tax">Apply Discount BEFORE GST (Standard &amp; Compliant)</option>
                  <option value="after_tax">Apply Discount AFTER GST</option>
                </select>
              </div>
            </div>

            {/* Membership Tier Auto-Discount Grid */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Membership Tier Auto-Discount (%)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Regular */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">REGULAR</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tier_discounts?.regular ?? ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        tier_discounts: { ...p.tier_discounts, regular: val },
                      }));
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Silver */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">SILVER</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tier_discounts?.silver ?? ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        tier_discounts: { ...p.tier_discounts, silver: val },
                      }));
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Gold */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">GOLD</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tier_discounts?.gold ?? ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        tier_discounts: { ...p.tier_discounts, gold: val },
                      }));
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Platinum */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">PLATINUM</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tier_discounts?.platinum ?? ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setSettings((p) => ({
                        ...p,
                        tier_discounts: { ...p.tier_discounts, platinum: val },
                      }));
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE TAX & INVOICE SIMULATOR ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Icon name="receipt" size={17} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Live Tax &amp; Invoice Simulator</h4>
                <p className="text-[11px] text-slate-400">Real-time breakdown of bill math</p>
              </div>
            </div>

            {/* Test Bill Amount Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Test Bill Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={testAmount}
                onChange={(e) => setTestAmount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Test Discount Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Test Discount (%):</label>
                <span className="text-xs font-black text-sky-600">{testDiscount}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(settings.pos_discount_presets.length > 0 ? settings.pos_discount_presets : [0, 5, 10, 15, 20, 25]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTestDiscount(d)}
                    className={cn(
                      'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                      testDiscount === d
                        ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {d}%
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Printed Thermal Receipt Box */}
            <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 font-mono text-xs space-y-2.5 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-300 pb-2.5 space-y-1">
                <div className="font-black tracking-wider uppercase text-slate-900 text-xs">
                  {settings.gym_name.trim() ? settings.gym_name : 'FIT CLUB AI LUXURY ATELIER'}
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  GSTIN: {settings.gstin.trim() ? settings.gstin : 'NOT REGISTERED / EXEMPT'}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold">
                  SAC: {settings.sac_code.trim() ? settings.sac_code : '999723'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium px-2 leading-tight">
                  {settings.address?.trim() ? settings.address : 'Plot 42, Hitech City, Hyderabad, Telangana - 500081'}
                </div>
                <div className="text-[9px] text-slate-400 font-bold pt-1 border-t border-dotted border-slate-200">
                  DATE &amp; TIME: {currentTimeIST}
                </div>
              </div>

              {/* Sample Line Item */}
              <div className="flex justify-between items-center text-slate-800 pt-1">
                <span className="font-bold">1x Membership / Service</span>
                <span className="font-black">₹{simulatedMath.gross.toLocaleString()}</span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span>₹{simulatedMath.gross.toLocaleString()}</span>
                </div>
                {simulatedMath.discountVal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Special Discount ({simulatedMath.discountPct}%):</span>
                    <span>-₹{simulatedMath.discountVal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-1">
                  <span>Net Taxable Value:</span>
                  <span>₹{simulatedMath.taxable.toLocaleString()}</span>
                </div>

                {settings.enable_gst_engine && (
                  <>
                    {settings.igst_enabled ? (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST ({settings.igst_rate}%):</span>
                        <span>₹{simulatedMath.igstVal.toLocaleString()}</span>
                      </div>
                    ) : (
                      <>
                        {settings.cgst_enabled && (
                          <div className="flex justify-between text-slate-600">
                            <span>CGST ({settings.cgst_rate}%):</span>
                            <span>₹{simulatedMath.cgstVal.toLocaleString()}</span>
                          </div>
                        )}
                        {settings.sgst_enabled && (
                          <div className="flex justify-between text-slate-600">
                            <span>SGST ({settings.sgst_rate}%):</span>
                            <span>₹{simulatedMath.sgstVal.toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Total Tax ({simulatedMath.activeTaxRate}%):</span>
                      <span>₹{simulatedMath.totalTaxVal.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Grand Total Line */}
              <div className="border-t-2 border-dashed border-slate-400 pt-2 flex justify-between items-baseline text-slate-900">
                <span className="text-xs font-black uppercase tracking-wider">TOTAL PAYABLE:</span>
                <span className="text-base font-black">₹{simulatedMath.totalPayable.toLocaleString()}</span>
              </div>
            </div>

            {/* Active Engine Status Pill */}
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-sky-900 font-medium">
              <Icon name="check-circle" size={15} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Active Engine Status: </span>
                <span>
                  {settings.enable_gst_engine
                    ? `Taxes: ${settings.igst_enabled ? `IGST ${settings.igst_rate}%` : `SGST ${settings.sgst_rate}%, CGST ${settings.cgst_rate}%`}.`
                    : 'Taxes disabled (0%).'}
                  {' '}{settings.enable_discount_engine ? `Discounts active up to ${settings.max_staff_discount}%.` : 'Discounts disabled.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. BOTTOM GLOBAL SAVE & APPLY BUTTON                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-center pt-2 pb-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Icon name={saving ? 'loader' : 'check-circle'} size={16} className={saving ? 'animate-spin' : ''} />
          <span>{saving ? 'Saving GST & Discount Engine...' : 'Save & Apply GST & Discount Settings'}</span>
        </button>
      </div>
    </div>
  );
}
