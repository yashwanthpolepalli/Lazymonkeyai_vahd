import React, { useState, useEffect } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  Percent,
  Clock,
  Sliders,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { PineLabsEDCModal } from '@/components/pos/PineLabsEDCModal';
import { RazorpayPOSModal } from '@/components/pos/RazorpayPOSModal';

export type PaymentMethodType =
  | 'Cash'
  | 'Card / PineLabs'
  | 'Razorpay UPI'
  | 'Wallet'
  | 'Partial Pay'
  | 'Pay Later'
  | 'Split Payment'
  | string;

export interface PaymentDetailsPayload {
  paymentMethod: PaymentMethodType;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  transactionId?: string;
  splitDetails?: {
    cashAmount: number;
    onlineAmount: number;
    onlineMode: string;
  };
}

interface PaymentTerminalSelectorProps {
  totalAmount: number;
  billNumber?: string;
  customerName?: string;
  customerPhone?: string;
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType, payload: PaymentDetailsPayload) => void;
  className?: string;
}

export function PaymentTerminalSelector({
  totalAmount,
  billNumber = `BILL-${Math.floor(100000 + Math.random() * 900000)}`,
  customerName = '',
  customerPhone = '',
  selectedMethod,
  onMethodChange,
  className = '',
}: PaymentTerminalSelectorProps) {
  const [paidAmount, setPaidAmount] = useState<number>(totalAmount);
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totalAmount / 2));
  const [splitOnlineMode, setSplitOnlineMode] = useState<string>('UPI');
  const [isPineLabsModalOpen, setIsPineLabsModalOpen] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [gatewayTxId, setGatewayTxId] = useState<string>('');

  useEffect(() => {
    setPaidAmount(totalAmount);
    setSplitCash(Math.floor(totalAmount / 2));
    
    let finalPaid = totalAmount;
    let finalDue = 0;
    if (selectedMethod === 'Pay Later') {
      finalPaid = 0;
      finalDue = totalAmount;
    } else if (selectedMethod === 'Partial Pay') {
      finalPaid = Math.min(totalAmount, paidAmount);
      finalDue = Math.max(0, totalAmount - finalPaid);
    }

    onMethodChange(selectedMethod, {
      paymentMethod: selectedMethod,
      totalAmount,
      paidAmount: finalPaid,
      dueAmount: finalDue,
      transactionId: gatewayTxId || undefined,
      splitDetails: selectedMethod === 'Split Payment' ? {
        cashAmount: Math.floor(totalAmount / 2),
        onlineAmount: totalAmount - Math.floor(totalAmount / 2),
        onlineMode: splitOnlineMode
      } : undefined
    });
  }, [totalAmount]);

  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const splitOnline = Math.max(0, totalAmount - splitCash);

  const handleSelect = (method: PaymentMethodType) => {
    let finalPaid = totalAmount;
    let finalDue = 0;

    if (method === 'Pay Later') {
      finalPaid = 0;
      finalDue = totalAmount;
    } else if (method === 'Partial Pay') {
      finalPaid = paidAmount;
      finalDue = Math.max(0, totalAmount - paidAmount);
    } else if (method === 'Card / PineLabs') {
      setIsPineLabsModalOpen(true);
    } else if (method === 'Razorpay UPI') {
      setIsRazorpayModalOpen(true);
    }

    onMethodChange(method, {
      paymentMethod: method,
      totalAmount,
      paidAmount: finalPaid,
      dueAmount: finalDue,
      transactionId: gatewayTxId || undefined,
      splitDetails:
        method === 'Split Payment'
          ? {
              cashAmount: splitCash,
              onlineAmount: splitOnline,
              onlineMode: splitOnlineMode,
            }
          : undefined,
    });
  };

  const handlePartialAmountChange = (val: number) => {
    const valid = Math.min(totalAmount, Math.max(0, val));
    setPaidAmount(valid);
    onMethodChange('Partial Pay', {
      paymentMethod: 'Partial Pay',
      totalAmount,
      paidAmount: valid,
      dueAmount: Math.max(0, totalAmount - valid),
      transactionId: gatewayTxId || undefined,
    });
  };

  const handleSplitCashChange = (val: number) => {
    const valid = Math.min(totalAmount, Math.max(0, val));
    setSplitCash(valid);
    onMethodChange('Split Payment', {
      paymentMethod: 'Split Payment',
      totalAmount,
      paidAmount: totalAmount,
      dueAmount: 0,
      splitDetails: {
        cashAmount: valid,
        onlineAmount: Math.max(0, totalAmount - valid),
        onlineMode: splitOnlineMode,
      },
    });
  };

  const PAYMENT_OPTIONS: {
    id: PaymentMethodType;
    label: string;
    sub: string;
    icon: any;
    color: string;
    activeBorder: string;
    activeBg: string;
    badge?: string;
  }[] = [
    {
      id: 'Cash',
      label: 'CASH',
      sub: 'Counter Cash Tender',
      icon: Banknote,
      color: 'text-emerald-600',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/50',
      activeBg: 'bg-emerald-500 text-white',
    },
    {
      id: 'Card / PineLabs',
      label: 'CARD / PINELABS',
      sub: 'EDC Terminal & Tap NFC',
      icon: CreditCard,
      color: 'text-blue-600',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50',
      activeBg: 'bg-blue-600 text-white',
      badge: 'POS Hardware',
    },
    {
      id: 'Razorpay UPI',
      label: 'RAZORPAY UPI',
      sub: 'Dynamic QR & SMS Link',
      icon: QrCode,
      color: 'text-purple-600',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/50',
      activeBg: 'bg-purple-600 text-white',
      badge: 'Auto Poll',
    },
    {
      id: 'Wallet',
      label: 'WALLET',
      sub: 'Gym Member Credits',
      icon: Wallet,
      color: 'text-amber-600',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/50',
      activeBg: 'bg-amber-600 text-white',
    },
    {
      id: 'Partial Pay',
      label: 'PARTIAL PAY',
      sub: 'Advance + Pending Due',
      icon: Percent,
      color: 'text-rose-600',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/50',
      activeBg: 'bg-rose-600 text-white',
    },
    {
      id: 'Pay Later',
      label: 'PAY LATER',
      sub: 'Register Due Balance',
      icon: Clock,
      color: 'text-indigo-600',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50',
      activeBg: 'bg-indigo-600 text-white',
    },
    {
      id: 'Split Payment',
      label: 'SPLIT PAYMENT',
      sub: 'Cash + UPI / Card',
      icon: Sliders,
      color: 'text-cyan-600',
      activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/50',
      activeBg: 'bg-cyan-600 text-white',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-navy-600 flex items-center gap-1.5">
          <CreditCard size={14} className="text-brand-600" />
          POS Terminal Payment Module
        </label>
        <span className="text-[11px] font-bold text-navy-400">Multi-Channel Gateway</span>
      </div>

      {/* Payment Method Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {PAYMENT_OPTIONS.map((opt) => {
          const IconComp = opt.icon;
          const isSelected = selectedMethod === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? opt.activeBorder
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? opt.activeBg : 'bg-slate-100 ' + opt.color}`}>
                    <IconComp size={16} />
                  </div>
                  {opt.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <CheckCircle2 size={15} className={opt.color} />
                  )}
                </div>
                <div className="text-xs font-black uppercase tracking-wide text-navy-900 leading-tight">
                  {opt.label}
                </div>
              </div>
              <div className="text-[10px] text-navy-400 font-medium mt-1">
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Dynamic Sub-Panels Based on Selected Payment Method ─── */}

      {/* 1. Partial Pay Interactive Input */}
      {selectedMethod === 'Partial Pay' && (
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between text-xs font-bold text-rose-900">
            <span className="flex items-center gap-1.5">
              <Percent size={14} className="text-rose-600" /> Partial Payment Breakdown
            </span>
            <span>Total Bill: ₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-navy-700 block mb-1">
                Collecting Advance Now (₹)
              </label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                value={paidAmount}
                onChange={(e) => handlePartialAmountChange(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-bold text-navy-900 bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-navy-700 block mb-1">
                Pending Due Balance (₹)
              </label>
              <div className="px-3 py-2 text-sm font-black text-rose-700 bg-rose-100/70 border border-rose-200 rounded-xl flex items-center justify-between">
                <span>₹{dueAmount.toLocaleString()}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-200/80 text-rose-800">
                  Receivable
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Split Payment Interactive Panel */}
      {selectedMethod === 'Split Payment' && (
        <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-900">
            <span className="flex items-center gap-1.5">
              <Sliders size={14} className="text-cyan-600" /> Split Multi-Tender Payment
            </span>
            <span>Total: ₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-navy-700 block mb-1">
                Cash Tender Portion (₹)
              </label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                value={splitCash}
                onChange={(e) => handleSplitCashChange(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-bold text-navy-900 bg-white border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-navy-700 block mb-1">
                Online / Card Portion (₹)
              </label>
              <div className="px-3 py-2 text-sm font-black text-cyan-800 bg-cyan-100/70 border border-cyan-200 rounded-xl flex items-center justify-between">
                <span>₹{splitOnline.toLocaleString()}</span>
                <select
                  value={splitOnlineMode}
                  onChange={(e) => setSplitOnlineMode(e.target.value)}
                  className="text-[11px] font-bold bg-white text-cyan-900 px-2 py-0.5 rounded border border-cyan-200"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="CARD">Card / EDC</option>
                  <option value="NETBANKING">NetBanking</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Card / PineLabs EDC Trigger Button */}
      {selectedMethod === 'Card / PineLabs' && (
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <CreditCard size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-950">Pine Labs Handheld EDC Terminal</div>
              <div className="text-[10px] text-blue-600 font-medium">Push charge packet to counter terminal (TID: TID-882194)</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPineLabsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Sparkles size={13} /> Push Terminal Prompt
          </button>
        </div>
      )}

      {/* 4. Razorpay UPI Trigger Button */}
      {selectedMethod === 'Razorpay UPI' && (
        <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <QrCode size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-purple-950">Dynamic UPI QR & SMS Payment Link</div>
              <div className="text-[10px] text-purple-600 font-medium">Generate on-screen Dynamic QR with live webhook status</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRazorpayModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center gap-1.5"
          >
            <Smartphone size={13} /> Show Dynamic QR
          </button>
        </div>
      )}

      {/* PineLabs EDC Modal Integration */}
      <PineLabsEDCModal
        isOpen={isPineLabsModalOpen}
        amount={totalAmount}
        billNumber={billNumber}
        customerMobile={customerPhone}
        onClose={() => setIsPineLabsModalOpen(false)}
        onSuccess={(data) => {
          setGatewayTxId(data.rrn || data.authCode);
          setIsPineLabsModalOpen(false);
          onMethodChange('Card / PineLabs', {
            paymentMethod: 'Card / PineLabs',
            totalAmount,
            paidAmount: totalAmount,
            dueAmount: 0,
            transactionId: data.rrn || data.authCode,
          });
        }}
      />

      {/* Razorpay POS Modal Integration */}
      <RazorpayPOSModal
        isOpen={isRazorpayModalOpen}
        amount={totalAmount}
        billNumber={billNumber}
        customerMobile={customerPhone}
        customerName={customerName}
        onClose={() => setIsRazorpayModalOpen(false)}
        onSuccess={(data) => {
          setGatewayTxId(data.paymentId || data.orderId);
          setIsRazorpayModalOpen(false);
          onMethodChange('Razorpay UPI', {
            paymentMethod: 'Razorpay UPI',
            totalAmount,
            paidAmount: totalAmount,
            dueAmount: 0,
            transactionId: data.paymentId || data.orderId,
          });
        }}
      />
    </div>
  );
}
