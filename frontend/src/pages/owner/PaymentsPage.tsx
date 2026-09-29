import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import {
  CreditCard,
  QrCode,
  DollarSign,
  Smartphone,
  Banknote,
  Building2,
  Download,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  UserCheck,
  Calendar,
  X,
  Printer,
  Sparkles,
  ShoppingBag,
  Award,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react';

interface TransactionItem {
  id: string;
  source_id?: string;
  category: 'MEMBERSHIP' | 'POS_STORE' | 'SALARY_PAYOUT' | 'SALARY_ADVANCE' | 'EMPLOYEE_BONUS' | 'TRAINER_COMMISSION' | string;
  category_label: string;
  type: 'INFLOW' | 'OUTFLOW';
  invoice_number: string;
  entity_name: string;
  entity_type: string;
  entity_phone?: string;
  entity_email?: string;
  description: string;
  amount: number;
  paid_amount?: number;
  due_amount?: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  gross_salary?: number;
  deductions?: number;
  payment_method: string;
  status: string;
  date: string;
  formatted_date: string;
  items?: any[];
  cashier?: string;
  approved_by?: string;
  details?: Record<string, any>;
  notes?: string;
}

interface AuditSummary {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  pending_receivables: number;
  total_transactions: number;
  completed_count: number;
  pending_count: number;
  failed_count: number;
  inflow_count: number;
  outflow_count: number;
  by_method: Record<string, { count: number; amount: number; inflow?: number; outflow?: number }>;
  by_category: Record<string, { count: number; amount: number; type: string }>;
}

type TabCategory = 'ALL' | 'MEMBERSHIP' | 'POS' | 'SALARY' | 'ADVANCES';

export function PaymentsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TabCategory>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Transaction for Audit Details Modal
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  const fetchPaymentsData = async () => {
    try {
      setRefreshing(true);
      const res: any = await api.payments.audit();
      if (res && res.transactions) {
        setTransactions(res.transactions);
        setSummary(res.summary);
      } else if (Array.isArray(res)) {
        setTransactions(res);
      }
    } catch (err) {
      console.error('Failed to load payment transactions audit:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Tab category filter
      if (activeTab === 'MEMBERSHIP' && tx.category !== 'MEMBERSHIP') return false;
      if (activeTab === 'POS' && tx.category !== 'POS_STORE') return false;
      if (activeTab === 'SALARY' && !['SALARY_PAYOUT', 'TRAINER_COMMISSION'].includes(tx.category)) return false;
      if (activeTab === 'ADVANCES' && !['SALARY_ADVANCE', 'EMPLOYEE_BONUS'].includes(tx.category)) return false;

      // 2. Flow type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // 3. Payment Method filter
      if (selectedMethod !== 'ALL') {
        const m = (tx.payment_method || '').toLowerCase();
        if (selectedMethod === 'UPI' && !m.includes('upi') && !m.includes('qr') && !m.includes('razorpay')) return false;
        if (selectedMethod === 'CARD' && !m.includes('card') && !m.includes('pos') && !m.includes('pinelabs')) return false;
        if (selectedMethod === 'CASH' && !m.includes('cash')) return false;
        if (selectedMethod === 'BANK' && !m.includes('bank') && !m.includes('neft') && !m.includes('imps') && !m.includes('transfer')) return false;
      }

      // 4. Status filter
      if (selectedStatus !== 'ALL') {
        const s = (tx.status || '').toUpperCase();
        if (selectedStatus === 'COMPLETED' && !['COMPLETED', 'PAID', 'DISBURSED', 'ACTIVE'].includes(s)) return false;
        if (selectedStatus === 'PENDING' && s !== 'PENDING') return false;
        if (selectedStatus === 'FAILED' && !['FAILED', 'VOID', 'CANCELLED'].includes(s)) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = (tx.invoice_number || '').toLowerCase().includes(q);
        const matchName = (tx.entity_name || '').toLowerCase().includes(q);
        const matchPhone = (tx.entity_phone || '').toLowerCase().includes(q);
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchMethod = (tx.payment_method || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchName && !matchPhone && !matchDesc && !matchMethod) return false;
      }

      return true;
    });
  }, [transactions, activeTab, selectedType, selectedMethod, selectedStatus, searchQuery]);

  // Method Icon Resolver
  const getMethodBadge = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('upi') || m.includes('qr') || m.includes('gpay') || m.includes('phonepe')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <Smartphone size={13} className="text-emerald-600" />
          UPI / QR
        </span>
      );
    }
    if (m.includes('card') || m.includes('pos') || m.includes('pinelabs')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
          <CreditCard size={13} className="text-blue-600" />
          Card / POS
        </span>
      );
    }
    if (m.includes('cash')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <Banknote size={13} className="text-amber-600" />
          Cash
        </span>
      );
    }
    if (m.includes('bank') || m.includes('neft') || m.includes('imps') || m.includes('transfer')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
          <Building2 size={13} className="text-purple-600" />
          Bank Transfer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <DollarSign size={13} className="text-slate-500" />
        {method || 'Online'}
      </span>
    );
  };

  // Category Badge Resolver
  const getCategoryBadge = (category: string, label: string) => {
    switch (category) {
      case 'MEMBERSHIP':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Membership</span>;
      case 'POS_STORE':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">POS Store</span>;
      case 'SALARY_PAYOUT':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Salary Payout</span>;
      case 'SALARY_ADVANCE':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Advance</span>;
      case 'EMPLOYEE_BONUS':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">Bonus</span>;
      case 'TRAINER_COMMISSION':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">PT Payout</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">{label || category}</span>;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Invoice Number', 'Category', 'Flow Type', 'Entity Name', 'Phone', 'Description', 'Amount (INR)', 'Payment Method', 'Status', 'Date'];
    const rows = filteredTransactions.map((t) => [
      `"${t.invoice_number || ''}"`,
      `"${t.category_label || t.category || ''}"`,
      `"${t.type}"`,
      `"${t.entity_name || ''}"`,
      `"${t.entity_phone || ''}"`,
      `"${t.description || ''}"`,
      t.amount,
      `"${t.payment_method || ''}"`,
      `"${t.status || ''}"`,
      `"${t.formatted_date || t.date || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FITCLUB_Payments_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-navy-900 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Payments & Financial Audit"
        breadcrumb={['Owner', 'Payments']}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchPaymentsData}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-500/20 transition"
            >
              <Download size={14} />
              Export Audit CSV
            </button>
          </div>
        }
      />

      {/* ─── 1. KPI Financial Overview Cards ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Inflow Revenue */}
          <div className="p-5 rounded-2xl bg-white border border-navy-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-500">Total Inflow (Revenue)</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-navy-900">
              ₹{(summary?.total_inflow || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Memberships & POS Counter Sales
            </div>
          </div>

          {/* Total Outflow Expenses */}
          <div className="p-5 rounded-2xl bg-white border border-navy-100 shadow-sm relative overflow-hidden group hover:border-purple-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-500">Total Outflow (Payroll)</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-navy-900">
              ₹{(summary?.total_outflow || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-purple-600">
              <Building2 size={13} />
              Salaries, Advances & Bonuses
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="p-5 rounded-2xl bg-white border border-navy-100 shadow-sm relative overflow-hidden group hover:border-brand-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-500">Net Cash Flow</span>
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Wallet size={18} />
              </div>
            </div>
            <div className={`text-2xl font-black ${(summary?.net_cash_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ₹{(summary?.net_cash_flow || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-navy-400 font-semibold mt-2">
              Inflow minus Outflow balance
            </div>
          </div>

          {/* Pending Receivables / Dues */}
          <div className="p-5 rounded-2xl bg-white border border-navy-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-500">Pending Dues</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <div className="text-2xl font-black text-navy-900">
              ₹{(summary?.pending_receivables || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-amber-600 font-semibold mt-2">
              {summary?.pending_count || 0} pending receivables
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Multi-Category Filter Bar & Sub-Tabs ─── */}
      <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-navy-100">
          {[
            { id: 'ALL', label: 'All Transactions', icon: Receipt, count: transactions.length },
            { id: 'MEMBERSHIP', label: 'Memberships & Plans', icon: UserCheck, count: transactions.filter((t) => t.category === 'MEMBERSHIP').length },
            { id: 'POS', label: 'POS & Store Sales', icon: ShoppingBag, count: transactions.filter((t) => t.category === 'POS_STORE').length },
            { id: 'SALARY', label: 'Staff Salaries & Payouts', icon: Building2, count: transactions.filter((t) => ['SALARY_PAYOUT', 'TRAINER_COMMISSION'].includes(t.category)).length },
            { id: 'ADVANCES', label: 'Advances & Bonuses', icon: Award, count: transactions.filter((t) => ['SALARY_ADVANCE', 'EMPLOYEE_BONUS'].includes(t.category)).length },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabCategory)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                }`}
              >
                <IconComp size={14} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-700'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              placeholder="Search invoice, member, staff, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-navy-50/70 border border-navy-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-navy-50/70 border border-navy-200 text-navy-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="UPI">📱 UPI / Dynamic QR</option>
              <option value="CARD">💳 Card / Pine Labs POS</option>
              <option value="CASH">💵 Cash Counter</option>
              <option value="BANK">🏦 Bank Transfer (NEFT/IMPS)</option>
            </select>
          </div>

          {/* Flow Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-navy-50/70 border border-navy-200 text-navy-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">Flow: All</option>
              <option value="INFLOW">🟢 Inflow (Revenue)</option>
              <option value="OUTFLOW">🟣 Outflow (Payroll)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-navy-50/70 border border-navy-200 text-navy-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="ALL">Status: All</option>
              <option value="COMPLETED">Completed / Paid</option>
              <option value="PENDING">Pending / Due</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-1 flex justify-end">
            {(activeTab !== 'ALL' || selectedMethod !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setActiveTab('ALL');
                  setSelectedMethod('ALL');
                  setSelectedType('ALL');
                  setSelectedStatus('ALL');
                  setSearchQuery('');
                }}
                className="p-2 rounded-xl text-navy-500 hover:text-navy-800 hover:bg-navy-100 text-xs font-bold transition flex items-center gap-1"
                title="Reset all filters"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Unified Transaction Ledger Table ─── */}
      <div className="p-6 bg-white border border-navy-100 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-navy-900">Multi-Channel Transaction Audit Ledger</h3>
            <p className="text-xs text-navy-500 font-medium">
              Showing {filteredTransactions.length} of {transactions.length} verified financial records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-navy-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inflow
            </span>
            <span className="text-xs font-semibold text-navy-500 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Outflow
            </span>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            description="No transaction records match the selected filters or search terms."
            icon="credit-card"
          />
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50/40 text-[11px] font-black text-navy-500 uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">Invoice / ID</th>
                  <th className="py-3 px-4">Entity (Member / Staff)</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 text-xs">
                {filteredTransactions.map((tx) => {
                  const isInflow = tx.type === 'INFLOW';
                  const isCompleted = ['COMPLETED', 'PAID', 'DISBURSED', 'ACTIVE'].includes((tx.status || '').toUpperCase());
                  const isPending = (tx.status || '').toUpperCase() === 'PENDING';

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-brand-50/30 cursor-pointer transition-colors group"
                    >
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-800 group-hover:text-brand-600 transition">
                        <div className="flex items-center gap-2">
                          <Receipt size={14} className="text-navy-400 group-hover:text-brand-500" />
                          <span>{tx.invoice_number || 'INV-0000'}</span>
                        </div>
                      </td>

                      {/* Entity / Customer / Employee */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] ${
                              isInflow ? 'bg-brand-50 text-brand-700' : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {(tx.entity_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-navy-900">{tx.entity_name}</div>
                            <div className="text-[11px] text-navy-400 font-medium">
                              {tx.entity_phone || tx.entity_type}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        {getCategoryBadge(tx.category, tx.category_label)}
                      </td>

                      {/* Amount with Inflow / Outflow styling */}
                      <td className="py-3.5 px-4 font-extrabold text-sm">
                        <span className={isInflow ? 'text-emerald-700' : 'text-purple-700'}>
                          {isInflow ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                        </span>
                        {tx.due_amount && tx.due_amount > 0 ? (
                          <div className="text-[10px] text-amber-600 font-bold">
                            Due: ₹{tx.due_amount.toLocaleString('en-IN')}
                          </div>
                        ) : null}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(tx.payment_method)}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-navy-500 font-medium">
                        {tx.formatted_date || tx.date}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isCompleted ? 'success' : isPending ? 'warning' : 'danger'}
                          dot
                        >
                          {tx.status}
                        </Badge>
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="p-1.5 rounded-xl bg-navy-50 hover:bg-brand-50 text-navy-500 hover:text-brand-600 transition"
                          title="View Details"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. Interactive Transaction Audit Drawer / Modal ─── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-navy-100 overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Banner */}
            <div className="p-6 bg-gradient-to-r from-navy-900 to-brand-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-extrabold uppercase tracking-wider text-brand-300">
                    {selectedTx.category_label}
                  </span>
                  <span className="text-xs text-navy-300 font-mono font-bold">
                    {selectedTx.invoice_number}
                  </span>
                </div>
                <h3 className="text-xl font-black mt-1">Transaction Audit Breakdown</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Financial Highlight Card */}
              <div className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-navy-400">Total Transacted Value</div>
                  <div className={`text-3xl font-black ${selectedTx.type === 'INFLOW' ? 'text-emerald-700' : 'text-purple-700'}`}>
                    {selectedTx.type === 'INFLOW' ? '+' : '-'}₹{(selectedTx.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-navy-400 mb-1">Status</div>
                  <Badge
                    variant={['COMPLETED', 'PAID', 'DISBURSED', 'ACTIVE'].includes((selectedTx.status || '').toUpperCase()) ? 'success' : 'warning'}
                    dot
                  >
                    {selectedTx.status}
                  </Badge>
                </div>
              </div>

              {/* Entity Information Card */}
              <div className="p-4 rounded-2xl border border-navy-100 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-navy-400 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-brand-600" />
                  Entity Information ({selectedTx.entity_type})
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-navy-400 font-semibold block">Full Name</span>
                    <span className="font-bold text-navy-900 text-sm">{selectedTx.entity_name}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 font-semibold block">Phone Number</span>
                    <span className="font-bold text-navy-900">{selectedTx.entity_phone || 'N/A'}</span>
                  </div>
                  {selectedTx.entity_email && (
                    <div>
                      <span className="text-navy-400 font-semibold block">Email Address</span>
                      <span className="font-bold text-navy-900">{selectedTx.entity_email}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-navy-400 font-semibold block">Payment Mode</span>
                    <span className="font-bold text-navy-900">{selectedTx.payment_method}</span>
                  </div>
                </div>
              </div>

              {/* POS Items Breakdown (If POS Transaction) */}
              {selectedTx.category === 'POS_STORE' && selectedTx.items && selectedTx.items.length > 0 && (
                <div className="p-4 rounded-2xl border border-navy-100 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-navy-400 flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-amber-600" />
                    Purchased Items Breakdown
                  </h4>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-navy-100 text-navy-400 font-bold">
                        <th className="py-2">Item</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Price</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50">
                      {selectedTx.items.map((item: any, idx: number) => (
                        <tr key={idx} className="py-2">
                          <td className="py-2 font-bold text-navy-900">{item.name}</td>
                          <td className="py-2 text-center text-navy-600 font-semibold">{item.quantity || item.qty || 1}</td>
                          <td className="py-2 text-right text-navy-600 font-mono">₹{(item.unit_price || item.price || 0).toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-navy-900 font-mono">₹{(item.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedTx.cashier && (
                    <div className="pt-2 text-[11px] text-navy-400 font-medium">
                      Billed by Cashier: <strong className="text-navy-700">{selectedTx.cashier}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Salary / Payroll Breakdown (If HRMS Payslip) */}
              {selectedTx.category === 'SALARY_PAYOUT' && selectedTx.details && (
                <div className="p-4 rounded-2xl border border-navy-100 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-navy-400 flex items-center gap-1.5">
                    <Building2 size={14} className="text-purple-600" />
                    Salary Structure Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-navy-50">
                      <span className="text-[11px] text-navy-400 block font-semibold">Basic Pay</span>
                      <span className="font-bold text-navy-900">₹{(selectedTx.details.basic_salary || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-navy-50">
                      <span className="text-[11px] text-navy-400 block font-semibold">HRA</span>
                      <span className="font-bold text-navy-900">₹{(selectedTx.details.hra || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-navy-50">
                      <span className="text-[11px] text-navy-400 block font-semibold">Allowances</span>
                      <span className="font-bold text-navy-900">₹{(selectedTx.details.allowances || 0).toLocaleString()}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
                      <span className="text-[11px] text-rose-500 block font-semibold">Deductions</span>
                      <span className="font-bold">₹{(selectedTx.deductions || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Membership Benefits Breakdown (If Membership) */}
              {selectedTx.category === 'MEMBERSHIP' && selectedTx.details && (
                <div className="p-4 rounded-2xl border border-navy-100 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-navy-400 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-indigo-600" />
                    Membership Subscription Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-navy-400 block font-semibold">Plan Name</span>
                      <span className="font-bold text-navy-900">{selectedTx.details.plan_name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 block font-semibold">Plan Type</span>
                      <span className="font-bold text-navy-900">{selectedTx.details.plan_type || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamp & Reference Footer */}
              <div className="p-3 rounded-xl bg-navy-50 text-[11px] text-navy-500 flex items-center justify-between">
                <span>Recorded On: <strong>{selectedTx.formatted_date || selectedTx.date}</strong></span>
                <span>Audit Verified: <strong className="text-emerald-600 font-bold">100% Dynamic DB</strong></span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-navy-50/50 border-t border-navy-100 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white border border-navy-200 text-navy-700 hover:bg-navy-50 transition"
              >
                <Printer size={14} /> Print Audit Receipt
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-navy-900 text-white hover:bg-navy-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
