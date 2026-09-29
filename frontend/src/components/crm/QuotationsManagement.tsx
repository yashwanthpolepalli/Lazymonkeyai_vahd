import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Download,
  Printer,
  Trash2,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Send,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface QuotationItem {
  id: string;
  quote_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    tax_pct?: number;
    discount?: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount_amount: number;
  total: number;
  status: string;
  valid_until?: string;
  notes?: string;
  created_at?: string;
}

export function QuotationsManagement() {
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalQuote, setViewModalQuote] = useState<QuotationItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [quoteForm, setQuoteForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    notes: '',
    items: [
      { name: '', qty: 1, rate: 0, tax_pct: 18, discount: 0, total: 0 },
    ],
  });
  const [submitting, setSubmitting] = useState(false);
  const [billingSettings, setBillingSettings] = useState<any>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const [res, bill] = await Promise.all([
        apiClient.get<QuotationItem[]>('/crm/quotations').catch(() => []),
        apiClient.get<any>('/gym/billing').catch(() => null),
      ]);
      setQuotations(res || []);
      if (bill) {
        setBillingSettings(bill.billing || bill);
      }
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const isGstActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
  const effectiveGstRate = billingSettings && isGstActive ? Number(billingSettings.total_gst_rate || 0) : (isGstActive ? 18 : 0);

  const handleAddItem = () => {
    const taxRate = isGstActive ? effectiveGstRate : 0;
    const base = 8000;
    const tot = Math.round(base + (base * (taxRate / 100)));
    setQuoteForm({
      ...quoteForm,
      items: [
        ...quoteForm.items,
        { name: 'Personal Training 10-Session Pack', qty: 1, rate: base, tax_pct: taxRate, discount: 0, total: tot },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setQuoteForm({
      ...quoteForm,
      items: quoteForm.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...quoteForm.items];
    const item = { ...updated[index], [field]: val };
    
    // Recalculate line total
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const base = Math.max(0, (rate * qty) - disc);
    const taxRate = isGstActive ? (Number(item.tax_pct !== undefined ? item.tax_pct : effectiveGstRate)) : 0;
    item.total = Math.round(base + (base * (taxRate / 100)));

    updated[index] = item;
    setQuoteForm({ ...quoteForm, items: updated });
  };

  // Compute Totals
  const subtotal = quoteForm.items.reduce((sum, it) => sum + ((Number(it.rate) || 0) * (Number(it.qty) || 1)), 0);
  const discountAmount = quoteForm.items.reduce((sum, it) => sum + (Number(it.discount) || 0), 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = isGstActive && effectiveGstRate > 0 ? Math.round(taxable * (effectiveGstRate / 100)) : 0;
  const grandTotal = taxable + tax;

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.customer_name) {
      triggerToast('⚠️ Please enter customer name.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/crm/quotations', {
        customer_name: quoteForm.customer_name,
        customer_phone: quoteForm.customer_phone,
        customer_email: quoteForm.customer_email,
        items: quoteForm.items,
        subtotal,
        discount_amount: discountAmount,
        tax,
        total: grandTotal,
        notes: quoteForm.notes,
        status: 'Issued',
      });
      triggerToast('✅ Quotation issued successfully!');
      setAddModalOpen(false);
      fetchQuotations();
    } catch {
      triggerToast('❌ Failed to issue quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await apiClient.put(`/crm/quotations/${id}`, { status });
      setQuotations((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
      triggerToast(`✅ Quotation marked as ${status}!`);
    } catch {
      triggerToast('❌ Error updating quotation.');
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    if (statusFilter !== 'All' && q.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        q.quote_number.toLowerCase().includes(query) ||
        q.customer_name.toLowerCase().includes(query) ||
        (q.customer_phone && q.customer_phone.includes(query))
      );
    }
    return true;
  });

  const totalValue = quotations.reduce((sum, q) => sum + (q.total || 0), 0);

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-navy-900 text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 border border-navy-700 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-navy-900 tracking-tight">
              Quotations & Commercial Estimates
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {quotations.length} Estimates Generated
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Generate itemized tax quotations with custom tier discounts, GST calculation, and PDF dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchQuotations}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95"
          >
            <Plus size={14} /> Create Quotation
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL QUOTED VALUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalValue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Issued</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Sum of all estimates</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">ACCEPTED QUOTES</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                {quotations.filter((q) => q.status === 'Accepted').length}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">Confirmed</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Ready for order creation</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">PENDING DECISION</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                {quotations.filter((q) => q.status === 'Issued').length}
              </span>
              <span className="text-[11px] font-bold text-amber-600">Awaiting Client</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Under client review</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">CONVERSION RATE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                {quotations.length > 0
                  ? Math.round(
                      (quotations.filter((q) => q.status === 'Accepted').length /
                        quotations.length) *
                        100
                    )
                  : 0}%
              </span>
              <span className="text-[11px] font-bold text-purple-600">Accepted</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Quote to order ratio</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search quote number (e.g. QT-2026-0089), client name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">⚡ All Quotation Statuses</option>
          <option value="Issued">Issued / Sent</option>
          <option value="Accepted">Accepted</option>
          <option value="Declined">Declined</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">QUOTE NUMBER</th>
                <th className="py-3.5 px-4">CUSTOMER / ACCOUNT</th>
                <th className="py-3.5 px-4">ITEMS</th>
                <th className="py-3.5 px-4">TOTAL (INCL. GST)</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-navy-400 text-xs">
                    No commercial quotations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const statusColors: Record<string, string> = {
                    Issued: 'bg-blue-50 text-blue-700 border-blue-200',
                    Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Declined: 'bg-red-50 text-red-700 border-red-200',
                    Draft: 'bg-navy-50 text-navy-700 border-navy-200',
                  };

                  return (
                    <tr key={q.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-black text-navy-900 block">{q.quote_number}</span>
                        <span className="text-[10px] text-navy-400">
                          {q.created_at ? new Date(q.created_at).toLocaleDateString() : 'Today'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-900 block">{q.customer_name}</span>
                        <span className="text-[11px] text-navy-500">{q.customer_phone || q.customer_email || 'Direct'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-navy-800 block">{q.items?.length || 1} Line Items</span>
                        <span className="text-[10px] text-navy-400 truncate max-w-xs block">
                          {q.items?.[0]?.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-navy-900 text-sm">
                          ₹{(q.total || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-navy-400 block">
                          Sub: ₹{(q.subtotal || 0).toLocaleString()} • GST: ₹{(q.tax || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={q.status}
                          onChange={(e) => handleUpdateStatus(q.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border outline-none cursor-pointer ${
                            statusColors[q.status] || 'bg-navy-50 text-navy-700'
                          }`}
                        >
                          <option value="Issued">Issued</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Declined">Declined</option>
                          <option value="Draft">Draft</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewModalQuote(q)}
                          className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-600 text-xs font-bold transition shadow-sm"
                        >
                          View Quote
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View / Print Modal */}
      {viewModalQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-600" />
                <h3 className="text-base font-bold text-navy-900">
                  Quotation #{viewModalQuote.quote_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewModalQuote(null)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-navy-400 uppercase block">Client Details</span>
                <h4 className="font-bold text-sm text-navy-900">{viewModalQuote.customer_name}</h4>
                <p className="text-xs text-navy-600">{viewModalQuote.customer_phone}</p>
                <p className="text-xs text-navy-600">{viewModalQuote.customer_email}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-navy-400 uppercase block">Quotation Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-50 text-brand-700 border border-brand-200">
                  {viewModalQuote.status}
                </span>
                <p className="text-xs text-navy-500 mt-2 font-medium">FitClub AI Elite Fitness Club</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-navy-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-navy-50/80 text-[10px] font-bold text-navy-400 uppercase">
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Tax (18%)</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50 font-medium">
                  {viewModalQuote.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-navy-900">{item.name}</td>
                      <td className="py-2.5 px-3 text-center">{item.qty}</td>
                      <td className="py-2.5 px-3 text-right">₹{item.rate.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">{item.tax_pct || 18}%</td>
                      <td className="py-2.5 px-3 text-right font-black text-navy-900">
                        ₹{item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-navy-600">
                  <span>Subtotal:</span>
                  <span className="font-bold">₹{(viewModalQuote.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span>-₹{(viewModalQuote.discount_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-navy-600">
                  <span>GST Tax (18%):</span>
                  <span className="font-bold">₹{(viewModalQuote.tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-navy-900 border-t border-navy-200 pt-2">
                  <span>Grand Total:</span>
                  <span className="text-brand-600">₹{(viewModalQuote.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {viewModalQuote.notes && (
              <div className="p-3 rounded-xl bg-navy-50 text-[11px] text-navy-600">
                <span className="font-bold block text-navy-700">Notes:</span>
                {viewModalQuote.notes}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-navy-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setViewModalQuote(null)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quotation Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <FileText size={16} className="text-brand-600" />
                Issue New Commercial Quotation
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.customer_name}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customer_name: e.target.value })}
                    placeholder="e.g. Infosys Wellness"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Phone Number</label>
                  <input
                    type="text"
                    value={quoteForm.customer_phone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customer_phone: e.target.value })}
                    placeholder="+91 98490 11223"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Email Address</label>
                  <input
                    type="email"
                    value={quoteForm.customer_email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customer_email: e.target.value })}
                    placeholder="admin@corp.com"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-700">Line Items & Services</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                {quoteForm.items.map((item, index) => (
                  <div key={index} className="p-3 rounded-2xl bg-navy-50/70 border border-navy-100 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item / Package Name"
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900 text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                        placeholder="Rate ₹"
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-xs font-black text-navy-900 block">₹{item.total.toLocaleString()}</span>
                      <span className="text-[10px] text-navy-400">{isGstActive && effectiveGstRate > 0 ? `incl. ${effectiveGstRate}% GST` : '0% GST'}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Totals */}
              <div className="p-3.5 rounded-2xl bg-brand-50/40 border border-brand-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-navy-600 block">Subtotal: ₹{subtotal.toLocaleString()}</span>
                  <span className="text-navy-600 block">{isGstActive && effectiveGstRate > 0 ? `GST (${effectiveGstRate}%): ₹${tax.toLocaleString()}` : 'GST (0%): ₹0'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-navy-500 font-bold uppercase block">Grand Total</span>
                  <span className="text-lg font-black text-brand-700">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-700 block">Terms & Commercial Notes</label>
                <textarea
                  rows={2}
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Issue Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
