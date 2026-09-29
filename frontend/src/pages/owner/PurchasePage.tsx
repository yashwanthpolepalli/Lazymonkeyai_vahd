import React, { useState } from 'react';
import {
  FileText,
  Truck,
  CreditCard,
  Building2,
  CheckSquare,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  TrendingUp,
  LineChart as LineChartIcon,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Procurement Component Imports
import { PurchaseRequests } from '@/components/procurement/PurchaseRequests';
import { PurchaseApprovals } from '@/components/procurement/PurchaseApprovals';
import { PurchaseQuotations } from '@/components/procurement/PurchaseQuotations';
import { PurchaseOrders } from '@/components/procurement/PurchaseOrders';
import { GoodsReceivedNotes } from '@/components/procurement/GoodsReceivedNotes';
import { PurchaseReturns } from '@/components/procurement/PurchaseReturns';
import { VendorBills } from '@/components/procurement/VendorBills';
import { PendingPayments } from '@/components/procurement/PendingPayments';
import { PaymentHistory } from '@/components/procurement/PaymentHistory';
import { DebitNotes } from '@/components/procurement/DebitNotes';
import { CreditNotes } from '@/components/procurement/CreditNotes';
import { SpendAnalysis } from '@/components/procurement/SpendAnalysis';
import { ProcurementForecast } from '@/components/procurement/ProcurementForecast';
import { Suppliers } from '@/components/procurement/Suppliers';

// Cart definition
type MainCart = 'requisitions' | 'procurement' | 'payments' | 'suppliers';

type RequisitionTab = 'pr_list' | 'approvals';
type ProcurementTab = 'quotations' | 'po_list' | 'grn_list' | 'returns';
type PaymentTab = 'bills' | 'pending' | 'history' | 'debit_notes' | 'credit_notes' | 'spend_analysis' | 'forecast';

export default function PurchasePage() {
  const [activeCart, setActiveCart] = useState<MainCart>('requisitions');
  
  // Sub-tabs per Cart
  const [activeReqTab, setActiveReqTab] = useState<RequisitionTab>('pr_list');
  const [activeProcTab, setActiveProcTab] = useState<ProcurementTab>('po_list');
  const [activePayTab, setActivePayTab] = useState<PaymentTab>('bills');

  return (
    <div className="w-full max-w-full space-y-4 font-sans text-slate-900 animate-fade-in pb-12">
      {/* ── Main Cart Navigation Header (100% Horizontal Width) ────────── */}
      <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-sm w-full overflow-x-auto scrollbar-none">
        {/* Cart 1: Purchase Requisitions */}
        <button
          onClick={() => setActiveCart('requisitions')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border cursor-pointer",
            activeCart === 'requisitions'
              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <FileText className={cn("w-4 h-4", activeCart === 'requisitions' ? "text-white" : "text-amber-500")} />
          <span>1. Purchase Requisitions</span>
        </button>

        {/* Cart 2: Procurement */}
        <button
          onClick={() => setActiveCart('procurement')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border cursor-pointer",
            activeCart === 'procurement'
              ? "bg-blue-600 text-white border-blue-700 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Truck className={cn("w-4 h-4", activeCart === 'procurement' ? "text-white" : "text-blue-500")} />
          <span>2. Procurement</span>
        </button>

        {/* Cart 3: Vendor Payments */}
        <button
          onClick={() => setActiveCart('payments')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border cursor-pointer",
            activeCart === 'payments'
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <CreditCard className={cn("w-4 h-4", activeCart === 'payments' ? "text-white" : "text-emerald-500")} />
          <span>3. Vendor Payments</span>
        </button>

        {/* Suppliers Directory */}
        <button
          onClick={() => setActiveCart('suppliers')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap border cursor-pointer",
            activeCart === 'suppliers'
              ? "bg-purple-600 text-white border-purple-700 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Building2 className={cn("w-4 h-4", activeCart === 'suppliers' ? "text-white" : "text-purple-500")} />
          <span>Suppliers Directory</span>
        </button>
      </div>

      {/* ── Sub-Tab Segmented Switcher (Full Width) ────────────────────── */}
      {activeCart === 'requisitions' && (
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 w-fit">
          <button
            onClick={() => setActiveReqTab('pr_list')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeReqTab === 'pr_list'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span>Purchase Requests / Requisitions</span>
          </button>
          <button
            onClick={() => setActiveReqTab('approvals')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeReqTab === 'approvals'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
            <span>PR Approvals (Manager)</span>
          </button>
        </div>
      )}

      {activeCart === 'procurement' && (
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none w-fit">
          <button
            onClick={() => setActiveProcTab('quotations')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeProcTab === 'quotations'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
            <span>1. Proforma / Quotations (RFQ)</span>
          </button>
          <button
            onClick={() => setActiveProcTab('po_list')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeProcTab === 'po_list'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>2. Purchase Orders (PO)</span>
          </button>
          <button
            onClick={() => setActiveProcTab('grn_list')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeProcTab === 'grn_list'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>3. Goods Received Notes (GRN)</span>
          </button>
          <button
            onClick={() => setActiveProcTab('returns')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activeProcTab === 'returns'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
            <span>4. Purchase Returns (RTV)</span>
          </button>
        </div>
      )}

      {activeCart === 'payments' && (
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none w-fit">
          <button
            onClick={() => setActivePayTab('bills')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'bills'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            <span>1. Vendor Bills (Invoices)</span>
          </button>
          <button
            onClick={() => setActivePayTab('pending')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'pending'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>2. Pending Payments</span>
          </button>
          <button
            onClick={() => setActivePayTab('history')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'history'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>3. Payments Out</span>
          </button>
          <button
            onClick={() => setActivePayTab('debit_notes')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'debit_notes'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>4. Debit Notes</span>
          </button>
          <button
            onClick={() => setActivePayTab('credit_notes')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'credit_notes'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
            <span>5. Credit Notes</span>
          </button>
          <button
            onClick={() => setActivePayTab('spend_analysis')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'spend_analysis'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>6. Spend Analysis</span>
          </button>
          <button
            onClick={() => setActivePayTab('forecast')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              activePayTab === 'forecast'
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LineChartIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>7. Procurement Forecast</span>
          </button>
        </div>
      )}

      {/* ── Active Sub-Page View (Spans 100% Horizontal UI Width) ──────── */}
      <div className="w-full">
        {/* Cart 1: Purchase Requisitions */}
        {activeCart === 'requisitions' && (
          <div>
            {activeReqTab === 'pr_list' && <PurchaseRequests />}
            {activeReqTab === 'approvals' && <PurchaseApprovals />}
          </div>
        )}

        {/* Cart 2: Procurement (All 4 Pages) */}
        {activeCart === 'procurement' && (
          <div>
            {activeProcTab === 'quotations' && <PurchaseQuotations />}
            {activeProcTab === 'po_list' && <PurchaseOrders />}
            {activeProcTab === 'grn_list' && <GoodsReceivedNotes />}
            {activeProcTab === 'returns' && <PurchaseReturns />}
          </div>
        )}

        {/* Cart 3: Vendor Payments (All 7 Pages) */}
        {activeCart === 'payments' && (
          <div>
            {activePayTab === 'bills' && <VendorBills />}
            {activePayTab === 'pending' && <PendingPayments />}
            {activePayTab === 'history' && <PaymentHistory />}
            {activePayTab === 'debit_notes' && <DebitNotes />}
            {activePayTab === 'credit_notes' && <CreditNotes />}
            {activePayTab === 'spend_analysis' && <SpendAnalysis />}
            {activePayTab === 'forecast' && <ProcurementForecast />}
          </div>
        )}

        {/* Suppliers Directory */}
        {activeCart === 'suppliers' && (
          <div>
            <Suppliers />
          </div>
        )}
      </div>
    </div>
  );
}
