import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Package,
  Trash2,
  X,
  CreditCard,
  QrCode,
  Wallet,
  Percent,
  Clock,
  Combine,
  Banknote,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  User as UserIcon,
  Sparkles,
  Printer,
  RotateCcw,
  Sliders,
  DollarSign,
  Truck,
  Eye,
  ListOrdered
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { PineLabsEDCModal } from '@/components/pos/PineLabsEDCModal';
import { RazorpayPOSModal } from '@/components/pos/RazorpayPOSModal';
import { InventoryPage } from '@/pages/owner/InventoryPage';
import { PosInvoicesHistory } from '@/components/pos/PosInvoicesHistory';
import { PosSalesInvoice } from '@/components/pos/PosSalesInvoice';
import PurchasePage from '@/pages/owner/PurchasePage';
import { ShoppingBag } from 'lucide-react';

interface POSProduct {
  id: string;
  name: string;
  sub?: string;
  brand?: string;
  brand_name?: string;
  price: number;
  selling_price?: number;
  mrp: number;
  category: string;
  category_name?: string;
  stock: number;
  on_hand_stock?: number;
  sku: string;
  barcode: string;
  taxPercent?: number;
  tax_percent?: number;
  badge?: string;
  imageUrl?: string;
  image_url?: string;
  type?: 'PRODUCT' | 'MEMBERSHIP';
}

interface CartItem {
  product: POSProduct;
  qty: number;
}

interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  cart: CartItem[];
  discountPercent: number;
  discountAmount: number;
  discountType: 'percentage' | 'flat';
  discountTiming: 'before_tax' | 'after_tax';
  additionalCharge: number;
  taxMode: 'CGST_SGST' | 'IGST';
}

interface RecentSale {
  id: string;
  invoiceId: string;
  customerName: string;
  customerPhone?: string;
  itemsStr: string;
  items?: Array<{ name: string; price: number; qty: number; total: number }>;
  amount: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  paymentMethod: string;
  status: string;
  cashier: string;
  dateTimeStr: string;
}

interface DailySummary {
  todaySales: number;
  transactionsCount: number;
  itemsSold: number;
  averageOrderValue: number;
  paymentBreakdown: Record<string, number>;
}

const posTabs = ['Invoices History', 'Quick Sale', 'Inventory', 'Purchase', 'Recent Sales', 'Daily Summary'];

export function PosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab')?.toLowerCase();

  const getInitialTab = () => {
    if (rawTab === 'invoices-history' || rawTab === 'invoices_history' || rawTab === 'invoices' || rawTab === 'history' || rawTab === 'sales_history') return 'Invoices History';
    if (rawTab === 'sales' || rawTab === 'sales-invoice' || rawTab === 'sales_invoice' || rawTab === 'new-invoice') return 'Sales Invoice';
    if (rawTab === 'inventory' || rawTab === 'stock' || rawTab === 'products') return 'Inventory';
    if (rawTab === 'purchase' || rawTab === 'procurement' || rawTab === 'vendor-bills' || rawTab === 'suppliers') return 'Purchase';
    if (rawTab === 'recent-sales' || rawTab === 'recentsales') return 'Recent Sales';
    if (rawTab === 'daily-summary' || rawTab === 'dailysummary' || rawTab === 'summary') return 'Daily Summary';
    if (rawTab === 'quicksale' || rawTab === 'quick-sale' || rawTab === 'terminal' || rawTab === 'pos') return 'Quick Sale';
    return 'Invoices History';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (rawTab) {
      if (rawTab === 'invoices-history' || rawTab === 'invoices_history' || rawTab === 'invoices' || rawTab === 'history' || rawTab === 'sales_history') setActiveTab('Invoices History');
      else if (rawTab === 'sales' || rawTab === 'sales-invoice' || rawTab === 'sales_invoice' || rawTab === 'new-invoice') setActiveTab('Sales Invoice');
      else if (rawTab === 'inventory' || rawTab === 'stock' || rawTab === 'products') setActiveTab('Inventory');
      else if (rawTab === 'purchase' || rawTab === 'procurement' || rawTab === 'vendor-bills' || rawTab === 'suppliers') setActiveTab('Purchase');
      else if (rawTab === 'recent-sales' || rawTab === 'recentsales') setActiveTab('Recent Sales');
      else if (rawTab === 'daily-summary' || rawTab === 'dailysummary' || rawTab === 'summary') setActiveTab('Daily Summary');
      else if (rawTab === 'quicksale' || rawTab === 'quick-sale' || rawTab === 'terminal' || rawTab === 'pos') setActiveTab('Quick Sale');
    }
  }, [rawTab]);

  const handleTabChange = (tabName: string, extraParams?: Record<string, any>) => {
    setActiveTab(tabName);
    const paramKey =
      tabName === 'Invoices History' ? 'sales_history' :
      tabName === 'Sales Invoice' ? 'sales' :
      tabName === 'Inventory' ? 'inventory' :
      tabName === 'Purchase' ? 'purchase' :
      tabName === 'Recent Sales' ? 'recent-sales' :
      tabName === 'Daily Summary' ? 'daily-summary' : 'quicksale';
    
    const newParams: Record<string, string> = { tab: paramKey };
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          newParams[k] = String(v);
        }
      });
    }
    setSearchParams(newParams);
    if (tabName === 'Quick Sale') {
      loadPosData();
    }
  };

  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const categories = useMemo(() => {
    const dynamicCats = Array.from(
      new Set(
        products
          .map((p) => (p.category || p.category_name || '').trim())
          .filter(Boolean)
      )
    ).sort();
    return ['All', ...dynamicCats];
  }, [products]);

  useEffect(() => {
    if (activeCat !== 'All' && !categories.includes(activeCat)) {
      setActiveCat('All');
    }
  }, [categories, activeCat]);

  // Cart State matching Screenshots
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Card / PineLabs' | 'Razorpay UPI' | 'Wallet' | 'Partial Pay' | 'Pay Later' | 'Split'
  >('Cash');

  // Dynamic Cart Discount State matching Screenshot 3
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('');
  const [discountTiming, setDiscountTiming] = useState<'before_tax' | 'after_tax'>('before_tax');
  const [discountPresets, setDiscountPresets] = useState<number[]>([0, 5, 10, 15, 20, 25]);

  // Additional Charges State matching Screenshot 3
  const [additionalCharge, setAdditionalCharge] = useState<number>(0);
  const [additionalChargeInput, setAdditionalChargeInput] = useState<string>('');
  const [addChargeModalOpen, setAddChargeModalOpen] = useState(false);

  // Tax Mode matching Screenshot 3
  const [taxMode, setTaxMode] = useState<'CGST_SGST' | 'IGST'>('CGST_SGST');

  // Bill Hold & Resume State matching Screenshot 3
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  // Payment Gateways Modals matching Screenshots 4 & 5
  const [pineLabsModalOpen, setPineLabsModalOpen] = useState(false);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const [partialPayModalOpen, setPartialPayModalOpen] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState('');

  // Delete Product Confirmation
  const [productToDelete, setProductToDelete] = useState<POSProduct | null>(null);

  // Recent Sales & Daily Summary State
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  // Customer Selection State
  const [selectedCustomer, setSelectedCustomer] = useState<{ id?: string; name: string; phone?: string } | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerList, setCustomerList] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<RecentSale | null>(null);
  const [billingSettings, setBillingSettings] = useState<any>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPosData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<POSProduct[]>('/pos/products'),
      apiClient.get<RecentSale[]>('/pos/recent-sales'),
      apiClient.get<DailySummary>('/pos/daily-summary'),
      apiClient.get<any[]>('/customers'),
      apiClient.get<any>('/gym/billing').catch(() => null)
    ])
      .then(([prodsRes, salesRes, summaryRes, custRes, billingRes]) => {
        if (Array.isArray(prodsRes)) setProducts(prodsRes);
        if (Array.isArray(salesRes)) setRecentSales(salesRes);
        if (summaryRes) setDailySummary(summaryRes);
        if (billingRes) {
          setBillingSettings(billingRes);
          if (Array.isArray(billingRes.pos_discount_presets) && billingRes.pos_discount_presets.length > 0) {
            setDiscountPresets(billingRes.pos_discount_presets);
          }
          if (billingRes.discount_sequence) {
            setDiscountTiming(billingRes.discount_sequence);
          }
          if (billingRes.igst_enabled) {
            setTaxMode('IGST');
          }
        }
        if (Array.isArray(custRes)) {
          setCustomerList(
            custRes.map((c) => ({
              id: c.id,
              name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Member',
              phone: c.phone || c.mobile || ''
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = activeCat === 'All' || p.category.toLowerCase() === activeCat.toLowerCase();
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, activeCat, search]);

  const addToCart = (product: POSProduct) => {
    if (product.type === 'PRODUCT' && product.stock <= 0) {
      triggerToast('⚠️ Item is out of stock!');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) => (c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountPercent(0);
    setCustomDiscountPercent('');
    setAdditionalCharge(0);
  };

  // Delete Product Handler
  const handleDeleteProduct = async (prod: POSProduct) => {
    try {
      await apiClient.delete(`/inventory/${prod.id}`);
      triggerToast(`🗑️ "${prod.name}" deleted successfully`);
      setProductToDelete(null);
      loadPosData();
    } catch {
      triggerToast('❌ Failed to delete product');
    }
  };

  // ── Financial Calculations matching Screenshot 3 ───────────────────
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
  }, [cart]);

  const activeDiscountRate = customDiscountPercent !== '' ? Number(customDiscountPercent) || 0 : discountPercent;
  const discountAmount = useMemo(() => {
    if (activeDiscountRate <= 0) return 0;
    return Math.round((subtotal * activeDiscountRate) / 100);
  }, [subtotal, activeDiscountRate]);

  const isGstActive = Boolean(
    billingSettings?.enable_gst_engine &&
    (Number(billingSettings?.total_gst_rate ?? 0) > 0 ||
     Number(billingSettings?.cgst_rate ?? 0) > 0 ||
     Number(billingSettings?.sgst_rate ?? 0) > 0 ||
     Number(billingSettings?.igst_rate ?? 0) > 0)
  );

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - (discountTiming === 'before_tax' ? discountAmount : 0));
  }, [subtotal, discountTiming, discountAmount]);

  const cgstRate = isGstActive ? Number(billingSettings?.cgst_rate ?? 0) : 0;
  const sgstRate = isGstActive ? Number(billingSettings?.sgst_rate ?? 0) : 0;
  const igstRate = isGstActive ? Number(billingSettings?.igst_rate ?? (cgstRate + sgstRate)) : 0;
  const isExclusive = billingSettings?.tax_pricing_mode !== 'inclusive';

  const cgst = useMemo(() => {
    if (!isGstActive || cart.length === 0 || taxMode !== 'CGST_SGST') return 0;
    return Math.round((taxableAmount * cgstRate) / 100);
  }, [isGstActive, taxableAmount, taxMode, cgstRate, cart.length]);

  const sgst = useMemo(() => {
    if (!isGstActive || cart.length === 0 || taxMode !== 'CGST_SGST') return 0;
    return Math.round((taxableAmount * sgstRate) / 100);
  }, [isGstActive, taxableAmount, taxMode, sgstRate, cart.length]);

  const totalTax = useMemo(() => {
    if (!isGstActive || cart.length === 0) return 0;
    if (taxMode === 'IGST') {
      return Math.round((taxableAmount * igstRate) / 100);
    }
    return cgst + sgst;
  }, [isGstActive, taxableAmount, taxMode, igstRate, cgst, sgst, cart.length]);

  const grandTotal = useMemo(() => {
    if (cart.length === 0) return 0;
    const base = taxableAmount + (discountTiming === 'after_tax' ? -discountAmount : 0);
    return Math.max(0, base + (isExclusive ? totalTax : 0) + additionalCharge);
  }, [taxableAmount, discountTiming, discountAmount, isExclusive, totalTax, additionalCharge, cart.length]);

  // ── Hold and Resume Bills matching Screenshot 3 ───────────────────
  const handleHoldBill = () => {
    if (cart.length === 0) {
      triggerToast('⚠️ Cannot hold an empty cart!');
      return;
    }
    const newHold: HeldBill = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      cart: [...cart],
      discountPercent: activeDiscountRate,
      discountAmount,
      discountType: 'percentage',
      discountTiming,
      additionalCharge,
      taxMode,
    };
    setHeldBills((prev) => [newHold, ...prev]);
    clearCart();
    triggerToast(`⏸️ Bill #${newHold.id} held successfully`);
  };

  const handleResumeBill = (held: HeldBill) => {
    setCart(held.cart);
    setDiscountPercent(held.discountPercent);
    setDiscountTiming(held.discountTiming);
    setAdditionalCharge(held.additionalCharge);
    setTaxMode(held.taxMode);
    setHeldBills((prev) => prev.filter((b) => b.id !== held.id));
    setResumeModalOpen(false);
    triggerToast(`▶️ Resumed bill #${held.id}`);
  };

  // ── Checkout Handling & Gateway Routing ────────────────────────────
  const handleCompletePaymentClick = () => {
    if (cart.length === 0) {
      triggerToast('⚠️ Cart is empty! Add products to proceed.');
      return;
    }

    if (paymentMethod === 'Card / PineLabs') {
      setPineLabsModalOpen(true);
    } else if (paymentMethod === 'Razorpay UPI') {
      setRazorpayModalOpen(true);
    } else if (paymentMethod === 'Partial Pay') {
      setPartialPayModalOpen(true);
    } else {
      executeFinalCheckout(paymentMethod);
    }
  };

  const executeFinalCheckout = async (chosenMethod: string, extraData?: any) => {
    setIsCheckingOut(true);
    try {
      const payload = {
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        customer_phone: selectedCustomer?.phone,
        payment_method: chosenMethod,
        discount_amount: discountAmount,
        additional_charge: additionalCharge,
        tax_mode: taxMode,
        items: cart.map((c) => ({
          id: c.product.id,
          name: c.product.name,
          price: c.product.price,
          qty: c.qty,
          taxPercent: c.product.taxPercent
        })),
        cashier_name: 'Sandy Owner',
        payment_metadata: extraData || {}
      };

      const res = await apiClient.post<any>('/pos/checkout', payload);
      triggerToast(`🎉 Sale completed! Invoice #${res.invoiceNumber}`);

      const completedRecord: RecentSale = {
        id: res.id,
        invoiceId: res.invoiceNumber,
        customerName: res.customerName,
        customerPhone: selectedCustomer?.phone,
        itemsStr: cart.map((c) => `${c.product.name} (x${c.qty})`).join(', '),
        items: res.items,
        amount: res.grandTotal || grandTotal,
        subtotal: res.subtotal || subtotal,
        discount: res.discount || discountAmount,
        tax: res.tax || totalTax,
        paymentMethod: chosenMethod,
        status: 'PAID',
        cashier: 'Sandy Owner',
        dateTimeStr: res.dateTime || 'Just now'
      };

      setActiveInvoice(completedRecord);
      setReceiptModalOpen(true);
      clearCart();
      loadPosData();
    } catch {
      triggerToast('❌ Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatPrice = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="space-y-4 font-sans text-slate-900 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with POS Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Point of Sale (POS)</h1>
          <p className="text-xs text-slate-500 font-medium">
            Fast terminal checkout for items, products, and services.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
          {posTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={cn(
                'px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab === 'Invoices History' && <Printer size={14} />}
              {tab === 'Quick Sale' && <ShoppingCart size={14} />}
              {tab === 'Inventory' && <Package size={14} />}
              {tab === 'Purchase' && <ShoppingBag size={14} />}
              {tab === 'Recent Sales' && <ListOrdered size={14} />}
              {tab === 'Daily Summary' && <DollarSign size={14} />}
              <span>{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 0: GENERATED INVOICES HISTORY                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Invoices History' && (
        <div className="space-y-4 animate-fade-in">
          <PosInvoicesHistory
            onNewInvoice={() => handleTabChange('Sales Invoice')}
            onNavigateTab={(tab, extra) => handleTabChange(tab, extra)}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 0.5: SALES INVOICE CREATOR                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Sales Invoice' && (
        <div className="space-y-4 animate-fade-in">
          <PosSalesInvoice
            onCancel={() => handleTabChange('Invoices History')}
            onSaved={() => handleTabChange('Invoices History')}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: QUICK SALE TERMINAL                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Quick Sale' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Product Catalog Grid matching Screenshot 1 */}
            <div className="lg:col-span-8 space-y-3">
              {/* Search & Categories Bar */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products by name, SKU, or barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                </div>

                {/* Category Pills */}
                {categories.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCat(cat)}
                        className={cn(
                          'px-4 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer',
                          activeCat === cat
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Cards Grid matching Screenshot 1 */}
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                  <Package size={36} className="mx-auto text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-900">No matching products found</h4>
                  <p className="text-xs text-slate-400">Import products from Master Catalog or adjust your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredProducts.map((p) => {
                    const inCartQty = cart.find((c) => c.product.id === p.id)?.qty || 0;
                    const isOutOfStock = p.type === 'PRODUCT' && p.stock <= 0;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'bg-white border rounded-3xl p-3 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 relative group',
                          inCartQty > 0 ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                        )}
                      >
                        {/* Quantity badge */}
                        {inCartQty > 0 && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-lg z-10">
                            {inCartQty}
                          </div>
                        )}

                        {/* Top Image Container matching Screenshot 1 */}
                        <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-100">
                          {p.imageUrl || p.image_url ? (
                            <img
                              src={p.imageUrl || p.image_url}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                              <Package size={26} className="text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">No Image</span>
                            </div>
                          )}

                          {/* Delete Button on Product Card */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(p);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-white/90 backdrop-blur-xs text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                            {p.category}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                            {p.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium block truncate">
                            {p.sub}
                          </span>
                        </div>

                        {/* Price & Add to Cart Action */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900">
                            {formatPrice(p.price)}
                          </span>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(p)}
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold transition shadow-sm cursor-pointer',
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : inCartQty > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                            )}
                          >
                            <Plus size={15} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Cart & Summary Panel matching Screenshot 3 */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl shadow-sm p-4 space-y-4 sticky top-4">
              {/* Hold Bill & Resume Header matching Screenshot 3 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleHoldBill}
                  className="py-2 px-3 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Clock size={14} className="text-amber-600" />
                  <span>Hold Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResumeModalOpen(true)}
                  className="py-2 px-3 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ListOrdered size={14} className="text-blue-600" />
                  <span>Resume ({heldBills.length})</span>
                </button>
              </div>

              {/* Customer Box */}
              <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <UserIcon size={14} />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-black text-slate-900 block truncate">
                      {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {selectedCustomer?.phone || 'No customer attached'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-700 shrink-0 cursor-pointer"
                >
                  {selectedCustomer ? 'Change' : 'Link Customer'}
                </button>
              </div>

              {/* Cart Items List or Empty Illustration matching Screenshot 3 */}
              <div className="min-h-[160px] max-h-64 overflow-y-auto pr-1 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-300">
                      <ShoppingCart size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-600">Cart is empty.</p>
                    <p className="text-[11px] text-slate-400">Scan barcode to add.</p>
                  </div>
                ) : (
                  cart.map(({ product, qty }) => (
                    <div
                      key={product.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="truncate flex-1">
                        <span className="text-xs font-bold text-slate-900 block truncate">{product.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {formatPrice(product.price)} each
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(product.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCartItem(product.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 ml-1 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dynamic Cart Discount Section matching Screenshot 3 */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <span className="flex items-center gap-1 text-blue-600">
                    <Percent size={12} /> DYNAMIC CART DISCOUNT
                  </span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDiscountTiming('before_tax')}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer',
                        discountTiming === 'before_tax' ? 'bg-blue-600 text-white' : 'text-slate-500'
                      )}
                    >
                      Before Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountTiming('after_tax')}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer',
                        discountTiming === 'after_tax' ? 'bg-blue-600 text-white' : 'text-slate-500'
                      )}
                    >
                      After Tax
                    </button>
                  </div>
                </div>

                {/* Discount Percentage Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {discountPresets.map((val) => {
                    const label = val === 0 ? 'Off' : `${val}%`;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setDiscountPercent(val);
                          setCustomDiscountPercent('');
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer',
                          discountPercent === val && customDiscountPercent === ''
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] font-bold text-slate-400">Custom</span>
                    <input
                      type="number"
                      placeholder="%"
                      value={customDiscountPercent}
                      onChange={(e) => setCustomDiscountPercent(e.target.value)}
                      className="w-12 px-2 py-1 text-xs border border-slate-200 rounded-xl text-center font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Charges matching Screenshot 3 */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1 text-slate-600">
                  <Truck size={13} /> ADDITIONAL CHARGES (FREIGHT / TRANSPORT)
                </span>
                <button
                  type="button"
                  onClick={() => setAddChargeModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{additionalCharge > 0 ? `+ ₹${additionalCharge}` : '+ Add Charge'}</span>
                </button>
              </div>

              {/* Breakdown Rows matching Screenshot 3 */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} items)</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span className="font-bold text-slate-900">{formatPrice(taxableAmount)}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span>Total Tax / GST</span>
                  {isGstActive ? (
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTaxMode('CGST_SGST')}
                        className={cn(
                          'px-1.5 py-0.5 rounded font-bold cursor-pointer',
                          taxMode === 'CGST_SGST' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        CGST+SGST
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxMode('IGST')}
                        className={cn(
                          'px-1.5 py-0.5 rounded font-bold cursor-pointer',
                          taxMode === 'IGST' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                        )}
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
                        <span>+{formatPrice(cgst)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                        <span>• SGST ({sgstRate}%)</span>
                        <span>+{formatPrice(sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-500 text-[11px] pl-2">
                      <span>• IGST ({igstRate}%)</span>
                      <span>+{formatPrice(totalTax)}</span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between text-slate-400 text-[11px] pl-2 italic">
                    <span>• Tax (GST 0% Exempt / Disabled)</span>
                    <span>+₹0</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 pt-1">
                    <span>Discount ({activeDiscountRate}%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                {additionalCharge > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Delivery / Freight Charge</span>
                    <span>+{formatPrice(additionalCharge)}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-slate-900">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">GRAND TOTAL</span>
                  <span className="text-2xl font-black text-slate-900">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* BOTTOM PAYMENT METHODS BAR matching Screenshot 2              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xl flex flex-col xl:flex-row items-center justify-between gap-4 sticky bottom-3 z-30">
            {/* Payment Method Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0">
              {/* 1. CASH */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap cursor-pointer',
                  paymentMethod === 'Cash'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-100 text-emerald-700'
                )}
              >
                <Banknote size={16} className="text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider">CASH</span>
              </button>

              {/* 2. CARD / PINELABS */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Card / PineLabs');
                  setPineLabsModalOpen(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap cursor-pointer text-left',
                  paymentMethod === 'Card / PineLabs'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-blue-200/80 bg-blue-50/40 hover:bg-blue-100 text-blue-800'
                )}
              >
                <CreditCard size={16} className="text-blue-600" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block leading-tight">CARD / PINELABS</span>
                  <span className="text-[9px] text-blue-500 font-medium block">EDC Swiper & NFC</span>
                </div>
              </button>

              {/* 3. RAZORPAY UPI */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Razorpay UPI');
                  setRazorpayModalOpen(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap cursor-pointer text-left',
                  paymentMethod === 'Razorpay UPI'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20 shadow-sm'
                    : 'border-purple-200/80 bg-purple-50/40 hover:bg-purple-100 text-purple-800'
                )}
              >
                <QrCode size={16} className="text-purple-600" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block leading-tight">RAZORPAY UPI</span>
                  <span className="text-[9px] text-purple-500 font-medium block">Smart QR / SMS</span>
                </div>
              </button>

              {/* 4. WALLET */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Wallet')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap cursor-pointer',
                  paymentMethod === 'Wallet'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 shadow-sm'
                    : 'border-amber-200/80 bg-amber-50/40 hover:bg-amber-100 text-amber-800'
                )}
              >
                <Wallet size={16} className="text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider">WALLET</span>
              </button>

              {/* 5. PARTIAL PAY */}
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('Partial Pay');
                  setPartialPayModalOpen(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap cursor-pointer',
                  paymentMethod === 'Partial Pay'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-sm'
                    : 'border-rose-200/80 bg-rose-50/40 hover:bg-rose-100 text-rose-800'
                )}
              >
                <Percent size={16} className="text-rose-600" />
                <span className="text-xs font-black uppercase tracking-wider">PARTIAL PAY</span>
              </button>

              {/* 6. PAY LATER */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Pay Later')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap cursor-pointer',
                  paymentMethod === 'Pay Later'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-indigo-200/80 bg-indigo-50/40 hover:bg-indigo-100 text-indigo-800'
                )}
              >
                <Clock size={16} className="text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider">PAY LATER</span>
              </button>

              {/* 7. SPLIT PAYMENT */}
              <button
                type="button"
                onClick={() => setPaymentMethod('Split')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all whitespace-nowrap cursor-pointer',
                  paymentMethod === 'Split'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20 shadow-sm'
                    : 'border-orange-200/80 bg-orange-50/40 hover:bg-orange-100 text-orange-800'
                )}
              >
                <Combine size={16} className="text-orange-600" />
                <span className="text-xs font-black uppercase tracking-wider">SPLIT PAYMENT</span>
              </button>
            </div>

            {/* Amount Due & Complete Payment Button matching Screenshot 2 */}
            <div className="flex items-center gap-4 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-200 pt-3 xl:pt-0 xl:pl-4 w-full xl:w-auto justify-between xl:justify-end">
              <div className="text-left xl:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AMOUNT DUE</span>
                <span className="text-xl font-black text-slate-900">{formatPrice(grandTotal)}</span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0 || isCheckingOut}
                onClick={handleCompletePaymentClick}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/30 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>COMPLETE PAYMENT</span>
                    <ChevronRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: INVENTORY & STOCK MANAGEMENT                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Inventory' && (
        <div className="space-y-4 animate-fade-in">
          <InventoryPage embedded={true} onNavigateToPos={() => handleTabChange('Quick Sale')} />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2.5: PURCHASE & PROCUREMENT                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Purchase' && (
        <div className="space-y-4 animate-fade-in">
          <PurchasePage />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: RECENT SALES                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Recent Sales' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Recent POS Invoices & Receipts</h3>
              <p className="text-xs text-slate-400">View customer purchases, payment methods, and reprint tax receipts</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.invoiceId}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{s.dateTimeStr}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{s.customerName}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{s.itemsStr}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{s.paymentMethod}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">{formatPrice(s.amount)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInvoice(s);
                          setReceiptModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: DAILY SUMMARY                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Daily Summary' && dailySummary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
              <h3 className="text-2xl font-black text-emerald-600">{formatPrice(dailySummary.todaySales)}</h3>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
              <h3 className="text-2xl font-black text-slate-900">{dailySummary.transactionsCount}</h3>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Units Sold</span>
              <h3 className="text-2xl font-black text-blue-600">{dailySummary.itemsSold}</h3>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Order Value</span>
              <h3 className="text-2xl font-black text-purple-600">{formatPrice(dailySummary.averageOrderValue)}</h3>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900">Payment Tender Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(dailySummary.paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">{method}</span>
                  <div className="text-lg font-black text-slate-900">{formatPrice(amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: PINE LABS EDC MODAL matching Screenshot 4            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <PineLabsEDCModal
        isOpen={pineLabsModalOpen}
        amount={grandTotal}
        billNumber={`POS-${Date.now().toString().slice(-6)}`}
        customerMobile={selectedCustomer?.phone}
        terminalId="TID-882194"
        onClose={() => setPineLabsModalOpen(false)}
        onSuccess={(paymentData) => {
          setPineLabsModalOpen(false);
          executeFinalCheckout('Card / PineLabs', paymentData);
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: RAZORPAY POS MODAL matching Screenshot 5             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <RazorpayPOSModal
        isOpen={razorpayModalOpen}
        amount={grandTotal}
        billNumber={`POS-${Date.now().toString().slice(-6)}`}
        customerMobile={selectedCustomer?.phone}
        customerName={selectedCustomer?.name}
        onClose={() => setRazorpayModalOpen(false)}
        onSuccess={(paymentData) => {
          setRazorpayModalOpen(false);
          executeFinalCheckout('Razorpay UPI', paymentData);
        }}
      />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: DELETE PRODUCT CONFIRMATION MODAL                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">Delete Product?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <b className="text-slate-900">"{productToDelete.name}"</b> from inventory and POS?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(productToDelete)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 4: RESUME HELD BILLS MODAL                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {resumeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Held Orders & Parked Bills</h3>
              <button
                type="button"
                onClick={() => setResumeModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {heldBills.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No held orders available.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {heldBills.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{b.id} • {b.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{b.cart.length} items • Held at {b.heldAt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleResumeBill(b)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Resume
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 5: ADD CHARGE MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {addChargeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Add Freight / Delivery Charge</h3>
              <button
                type="button"
                onClick={() => setAddChargeModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Charge Amount (₹)</label>
              <input
                type="number"
                placeholder="50"
                value={additionalChargeInput}
                onChange={(e) => setAdditionalChargeInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAdditionalCharge(0);
                  setAddChargeModalOpen(false);
                }}
                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdditionalCharge(Number(additionalChargeInput) || 0);
                  setAddChargeModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Save Charge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 6: CUSTOMER SELECTION MODAL                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Select Customer / Member</h3>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search member by name or mobile..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerModalOpen(false);
                }}
                className="w-full p-2.5 rounded-2xl border border-dashed border-slate-300 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Walk-in Customer (Guest)
              </button>

              {customerList
                .filter(
                  (c) =>
                    !customerSearch ||
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.phone.includes(customerSearch)
                )
                .map((cust) => (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setCustomerModalOpen(false);
                    }}
                    className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{cust.name}</span>
                      <span className="text-[10px] text-slate-400">{cust.phone}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 7: TAX RECEIPT / INVOICE MODAL                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {receiptModalOpen && activeInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-scale-up border border-slate-200">
            <div className="text-center space-y-1 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black">
                {billingSettings?.gym_name?.slice(0, 2).toUpperCase() || 'VA'}
              </div>
              <h3 className="text-base font-black text-slate-900">{billingSettings?.gym_name || 'VAHD POS'}</h3>
              {billingSettings?.gstin && (
                <div className="text-[10px] text-slate-500 font-bold">GSTIN: {billingSettings.gstin}</div>
              )}
              {billingSettings?.sac_code && (
                <div className="text-[10px] text-slate-500 font-medium">SAC: {billingSettings.sac_code}</div>
              )}
              {billingSettings?.address && (
                <div className="text-[10px] text-slate-400 font-medium">{billingSettings.address}</div>
              )}
              <span className="text-xs font-mono font-bold text-blue-600 block pt-1">{activeInvoice.invoiceId}</span>
            </div>

            <div className="text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold text-slate-900">{activeInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{activeInvoice.dateTimeStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Tender:</span>
                <span className="font-bold text-emerald-600">{activeInvoice.paymentMethod}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Items:</span>
              <p className="font-semibold text-slate-800 leading-relaxed">{activeInvoice.itemsStr}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-base font-black text-slate-900">
              <span>Total Paid:</span>
              <span className="text-blue-600">{formatPrice(activeInvoice.amount)}</span>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
