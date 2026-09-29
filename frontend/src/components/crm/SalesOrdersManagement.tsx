import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  CreditCard,
  Truck,
  Package,
  Calendar,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export interface SalesOrderItem {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    tax_pct?: number;
    total: number;
  }>;
  subtotal: number;
  additional_charges?: Array<{ name: string; amount: number }>;
  tax: number;
  total: number;
  pricing_mode: string; // Retail, Wholesale
  status: string; // Pending, Processing, Shipped, Delivered, Cancelled
  payment_status: string; // Unpaid, Partially Paid, Paid
  payment_mode?: string;
  sales_rep?: string;
  created_at?: string;
}

export function SalesOrdersManagement() {
  const [orders, setOrders] = useState<SalesOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<SalesOrderItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    customer_phone: '',
    pricing_mode: 'Retail',
    payment_mode: 'UPI / GooglePay',
    payment_status: 'Paid',
    sales_rep: '',
    items: [
      { name: '', qty: 1, rate: 0, tax_pct: 18, total: 0 },
    ],
  });
  const [submitting, setSubmitting] = useState(false);
  const [billingSettings, setBillingSettings] = useState<any>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [res, bill] = await Promise.all([
        apiClient.get<SalesOrderItem[]>('/crm/sales-orders').catch(() => []),
        apiClient.get<any>('/gym/billing').catch(() => null),
      ]);
      setOrders(res || []);
      if (bill) {
        setBillingSettings(bill.billing || bill);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const isGstActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
  const effectiveGstRate = billingSettings && isGstActive ? Number(billingSettings.total_gst_rate || 0) : (isGstActive ? 18 : 0);

  const handleAddItem = () => {
    const taxRate = isGstActive ? effectiveGstRate : 0;
    const base = 1500;
    const tot = Math.round(base + (base * (taxRate / 100)));
    setOrderForm({
      ...orderForm,
      items: [
        ...orderForm.items,
        { name: 'Gym Training Kit (Shaker + Wrist Straps)', qty: 1, rate: base, tax_pct: taxRate, total: tot },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderForm({
      ...orderForm,
      items: orderForm.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...orderForm.items];
    const item = { ...updated[index], [field]: val };
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const taxRate = isGstActive ? (Number(item.tax_pct !== undefined ? item.tax_pct : effectiveGstRate)) : 0;
    const base = rate * qty;
    item.total = Math.round(base + (base * (taxRate / 100)));

    updated[index] = item;
    setOrderForm({ ...orderForm, items: updated });
  };

  const subtotal = orderForm.items.reduce((sum, it) => sum + ((Number(it.rate) || 0) * (Number(it.qty) || 1)), 0);
  const tax = isGstActive && effectiveGstRate > 0 ? Math.round(subtotal * (effectiveGstRate / 100)) : 0;
  const total = subtotal + tax;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customer_name) {
      triggerToast('⚠️ Please provide customer name.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/crm/sales-orders', {
        customer_name: orderForm.customer_name,
        customer_phone: orderForm.customer_phone,
        pricing_mode: orderForm.pricing_mode,
        payment_mode: orderForm.payment_mode,
        payment_status: orderForm.payment_status,
        sales_rep: orderForm.sales_rep,
        items: orderForm.items,
        subtotal,
        tax,
        total,
        status: 'Processing',
      });
      triggerToast('✅ Sales Order created successfully!');
      setAddModalOpen(false);
      fetchOrders();
    } catch {
      triggerToast('❌ Error creating sales order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePaymentStatus = async (id: string, payment_status: string) => {
    try {
      await apiClient.put(`/crm/sales-orders/${id}`, { payment_status });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status } : o)));
      triggerToast(`✅ Payment status set to ${payment_status}`);
    } catch {
      triggerToast('❌ Error updating payment status.');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (paymentFilter !== 'All' && o.payment_status !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_phone && o.customer_phone.includes(q))
      );
    }
    return true;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const paidRevenue = orders
    .filter((o) => o.payment_status === 'Paid')
    .reduce((sum, o) => sum + (o.total || 0), 0);

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
              Sales Orders & Fulfillment
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-black">
              {orders.length} Orders Logged
            </span>
          </div>
          <p className="text-xs text-navy-500">
            Manage retail & wholesale gym passes, personal training contracts, and merchandise fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/25 flex items-center gap-1.5 transition hover:scale-[1.02] active:scale-95"
          >
            <Plus size={14} /> New Sales Order
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">TOTAL ORDER REVENUE</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{totalRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Gross</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Across all order lines</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">COLLECTED PAYMENTS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">₹{paidRevenue.toLocaleString()}</span>
              <span className="text-[11px] font-bold text-emerald-600">Settled</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Bank / UPI confirmed</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">UNPAID / PENDING</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">
                ₹{(totalRevenue - paidRevenue).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-amber-600">Receivable</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Outstanding customer balance</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package size={20} />
          </div>
        </div>

        <div className="p-5 bg-white border border-navy-100 rounded-3xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider block">ACTIVE ORDERS</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-navy-900">{orders.length}</span>
              <span className="text-[11px] font-bold text-purple-600">Orders</span>
            </div>
            <span className="text-[11px] text-navy-400 font-medium">Retail & corporate combined</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShoppingCart size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-navy-100 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search order number (e.g. SO-2026-0042)..."
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
          <option value="All">⚡ All Fulfillment Statuses</option>
          <option value="Delivered">Delivered</option>
          <option value="Processing">Processing</option>
          <option value="Pending">Pending</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-navy-50/70 border border-navy-200/70 text-xs font-semibold text-navy-800"
        >
          <option value="All">💳 All Payment Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partially Paid">Partially Paid</option>
        </select>
      </div>

      {/* Sales Orders Table */}
      <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">ORDER NUMBER</th>
                <th className="py-3.5 px-4">CUSTOMER</th>
                <th className="py-3.5 px-4">ITEMS</th>
                <th className="py-3.5 px-4">TOTAL</th>
                <th className="py-3.5 px-4">PRICING MODE</th>
                <th className="py-3.5 px-4">PAYMENT STATUS</th>
                <th className="py-3.5 px-4">FULFILLMENT</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 text-xs font-medium text-navy-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-navy-400 text-xs">
                    No sales orders found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const paymentColors: Record<string, string> = {
                    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    Unpaid: 'bg-red-50 text-red-700 border-red-200',
                    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200',
                  };

                  return (
                    <tr key={order.id} className="hover:bg-navy-50/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-black text-navy-900 block">{order.order_number}</span>
                        <span className="text-[10px] text-navy-400">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-navy-900 block">{order.customer_name}</span>
                        <span className="text-[11px] text-navy-500">{order.customer_phone || 'Direct'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-navy-800 block">{order.items?.length || 1} Items</span>
                        <span className="text-[10px] text-navy-400 truncate max-w-xs block">
                          {order.items?.[0]?.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-black text-navy-900 text-sm">
                          ₹{(order.total || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-navy-400 block">{order.payment_mode || 'UPI'}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-navy-100 text-navy-800 text-[10px] font-bold">
                          {order.pricing_mode || 'Retail'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={order.payment_status}
                          onChange={(e) => handleUpdatePaymentStatus(order.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border outline-none cursor-pointer ${
                            paymentColors[order.payment_status] || 'bg-navy-50 text-navy-700'
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          {order.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewOrder(order)}
                          className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-600 hover:text-white text-brand-600 text-xs font-bold transition shadow-sm"
                        >
                          View Order
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

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <ShoppingCart size={16} className="text-brand-600" />
                Sales Order #{viewOrder.order_number}
              </h3>
              <button
                type="button"
                onClick={() => setViewOrder(null)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-navy-50 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Customer</span>
                  <span className="font-bold text-navy-900">{viewOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-navy-400 font-bold uppercase block">Sales Rep</span>
                  <span className="font-bold text-navy-900">{viewOrder.sales_rep || 'Staff'}</span>
                </div>
              </div>

              <div className="border border-navy-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/80 text-[10px] font-bold text-navy-400 uppercase">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {viewOrder.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-navy-900">{it.name}</td>
                        <td className="py-2 px-3 text-center">{it.qty}</td>
                        <td className="py-2 px-3 text-right font-black">₹{it.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-navy-100 font-black text-sm">
                <span>Grand Total:</span>
                <span className="text-brand-600">₹{(viewOrder.total || 0).toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewOrder(null)}
              className="w-full py-2.5 rounded-xl bg-navy-100 hover:bg-navy-200 text-navy-800 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Sales Order Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 border border-navy-100 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <ShoppingCart size={16} className="text-brand-600" />
                Create Sales Order
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-navy-100 text-navy-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                    placeholder="e.g. Aman Verma"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Phone Number</label>
                  <input
                    type="text"
                    value={orderForm.customer_phone}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                    placeholder="+91 99123 77889"
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Pricing Mode</label>
                  <select
                    value={orderForm.pricing_mode}
                    onChange={(e) => setOrderForm({ ...orderForm, pricing_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Payment Mode</label>
                  <select
                    value={orderForm.payment_mode}
                    onChange={(e) => setOrderForm({ ...orderForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="UPI (GooglePay / PhonePe)">UPI (GooglePay / PhonePe)</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Net Banking / NEFT">Net Banking / NEFT</option>
                    <option value="Cash at Front Desk">Cash at Front Desk</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy-700 block">Payment Status</label>
                  <select
                    value={orderForm.payment_status}
                    onChange={(e) => setOrderForm({ ...orderForm, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-800"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-700">Order Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                {orderForm.items.map((item, index) => (
                  <div key={index} className="p-3 rounded-2xl bg-navy-50/70 border border-navy-100 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Item Name"
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900 text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-navy-200 text-xs font-semibold text-navy-900"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-black text-navy-900">₹{item.total.toLocaleString()}</span>
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
                  <span className="text-[10px] text-navy-500 font-bold uppercase block">Total Amount</span>
                  <span className="text-lg font-black text-brand-700">₹{total.toLocaleString()}</span>
                </div>
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
                  {submitting ? 'Creating...' : 'Create Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
