import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, ScanBarcode, Store, Clock, User as UserIcon,
  Trash2, X, ChevronRight, Plus, Minus, CreditCard, Banknote, QrCode, Tag, ShoppingCart,
  Info, Camera, Sparkles, Printer, Database, Boxes, LayoutGrid, List as ListIcon, Combine, ArrowRightLeft, ArrowLeft,
  Truck, RefreshCw, Heart, History, Wallet, Layers, Phone, Building, Mail, UserPlus, Percent, CheckCircle2, Loader2,
  Pencil, Edit3, MapPin
} from "lucide-react";
import { posApi, inventoryApi, crmApi, invoicesApi, crmWalletApi, procurementApi, POSProduct, POSCategory, resolveImageUrl } from "../../lib/api-client";
import { useHardwareBarcodeScanner } from "../../hooks/useHardwareBarcodeScanner";
import { posStore, posSession, posCustomers, paymentMethods, posCategories } from "../../lib/pos-fallback";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BarcodeScannerView, QuickSearchView, HoldBillsView, SplitBillsView,
  DeliveryView, ExchangeView, RefundView, PriceCheckView,
  FavoritesView, RecentBillsView, AISuggestionsView, WalletView
} from "./POSTerminalViews";
import { ThermalReceiptPrinter } from "./ThermalReceiptPrinter";
import { triggerThermalPrint } from "../../lib/print-helper";
import { useCurrency } from "@/hooks/use-currency";
import { formatCurrency, getTodayDateString, getCurrentTimeString } from "../../lib/utils";
import { INDIAN_STATES } from "@/data/indian-states";
import { usePincodeLookup } from "@/hooks/use-pincode-lookup";
import { FreeQtyPanel, FreeQtyItem } from "./FreeQtyPanel";
import { useTenant } from "../../contexts/tenant-context";
import { PineLabsEDCModal } from "./PineLabsEDCModal";
import { RazorpayPOSModal } from "./RazorpayPOSModal";
import { useStoreLocations } from "@/hooks/use-store-locations";
import { BatchSelectorModal } from "../inventory/BatchSelectorModal";

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div className="p-10 text-red-500 font-mono whitespace-pre-wrap">{this.state.error?.stack || this.state.error?.toString()}</div>;
    return this.props.children;
  }
}

export function PosTerminal() {
  return <ErrorBoundary><PosTerminalInner /></ErrorBoundary>;
}

function PosTerminalInner() {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const currentTenantId = (tenant as any)?.raw?.tenant_id || (tenant as any)?.tenant_id || tenant?.id || "default";
  const currentCompanyId = tenant?.id || (tenant as any)?.raw?.id || (tenant as any)?.company_id || "default";
  const posStorageKey = `pos_saved_invoices_${currentTenantId}_${currentCompanyId}`;
  const [, setCurrencyTick] = useState(0);
  useEffect(() => {
    const cb = () => setCurrencyTick(t => t + 1);
    window.addEventListener("bos-currency-changed", cb);
    return () => window.removeEventListener("bos-currency-changed", cb);
  }, []);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentView = searchParams.get('view') || 'billing';

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("all");
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [posPage, setPosPage] = useState<number>(1);
  const [posPageSize, setPosPageSize] = useState<number>(24);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => { setPosPage(1); }, [activeCategory, activeSubCategory, activeBrand, searchQuery]);


  const [selectedCustomer, setSelectedCustomer] = useState(posCustomers[0]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerList, setCustomerList] = useState<any[]>(posCustomers);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerTab, setCustomerTab] = useState<'search' | 'new'>('search');
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustCompany, setNewCustCompany] = useState("");
  const [newCustType, setNewCustType] = useState("Retail");
  const [newCustGST, setNewCustGST] = useState("");
  
  // Structured Address States
  const [newCustStreet, setNewCustStreet] = useState("");
  const [newCustCity, setNewCustCity] = useState("");
  const [newCustState, setNewCustState] = useState("Andhra Pradesh");
  const [newCustPincode, setNewCustPincode] = useState("");

  const [newCustShipStreet, setNewCustShipStreet] = useState("");
  const [newCustShipCity, setNewCustShipCity] = useState("");
  const [newCustShipState, setNewCustShipState] = useState("Andhra Pradesh");
  const [newCustShipPincode, setNewCustShipPincode] = useState("");
  const [isCustShippingSameAsBilling, setIsCustShippingSameAsBilling] = useState(true);

  // Free Quantity / Promotional Schemes State
  const [freeItems, setFreeItems] = useState<FreeQtyItem[]>([]);

  // Hardware POS EDC & Online Gateways State
  const [isPineLabsModalOpen, setIsPineLabsModalOpen] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [edcMetadata, setEdcMetadata] = useState<{ rrn?: string; authCode?: string; cardBrand?: string; cardLast4?: string; batchNumber?: string } | null>(null);
  const [batchModalCartItem, setBatchModalCartItem] = useState<{ id: string; productId?: string; productName?: string; currentBatch?: string } | null>(null);

  // Pincode Lookup Hook
  const { lookup: lookupPincode, loading: isLookingUpPincode } = usePincodeLookup();

  const handleCustPincodeChange = async (val: string) => {
    setNewCustPincode(val);
    if (isCustShippingSameAsBilling) setNewCustShipPincode(val);
    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        if (res.city) setNewCustCity(res.city);
        if (res.state) {
          const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase()));
          setNewCustState(matched?.name || res.state);
        }
        if (!newCustStreet && res.area) setNewCustStreet(res.area);
        if (isCustShippingSameAsBilling) {
          if (res.city) setNewCustShipCity(res.city);
          if (res.state) {
            const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase()));
            setNewCustShipState(matched?.name || res.state);
          }
          if (!newCustShipStreet && res.area) setNewCustShipStreet(res.area);
        }
      }
    }
  };

  const handleCustShipPincodeChange = async (val: string) => {
    setNewCustShipPincode(val);
    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        if (res.city) setNewCustShipCity(res.city);
        if (res.state) {
          const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase()));
          setNewCustShipState(matched?.name || res.state);
        }
        if (!newCustShipStreet && res.area) setNewCustShipStreet(res.area);
      }
    }
  };

  const [newCustTier, setNewCustTier] = useState("Silver");

  const [customerSummary, setCustomerSummary] = useState<any | null>(null);
  const [includePreviousDueInBill, setIncludePreviousDueInBill] = useState<boolean>(false);
  const [verifyingCustGST, setVerifyingCustGST] = useState(false);

  const handleVerifyPOSCustomerGST = async () => {
    const cleanGst = (newCustGST || "").trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    try {
      setVerifyingCustGST(true);
      const res = await procurementApi.lookupGstin(cleanGst);
      if (res && res.valid) {
        if (res.trade_name || res.legal_name) {
          setNewCustName(res.trade_name || res.legal_name);
          setNewCustCompany(res.legal_name || res.trade_name);
        }
        if (res.state) {
          setNewCustState(res.state);
          if (isCustShippingSameAsBilling) setNewCustShipState(res.state);
        }
        if (res.pincode) {
          setNewCustPincode(res.pincode);
          if (isCustShippingSameAsBilling) setNewCustShipPincode(res.pincode);
        }
        const rawAddr: any = (res as any).address;
        const addrObj = typeof rawAddr === 'object' && rawAddr !== null ? rawAddr : null;
        if (addrObj?.city) {
          setNewCustCity(addrObj.city);
          if (isCustShippingSameAsBilling) setNewCustShipCity(addrObj.city);
        }
        if (addrObj?.street) {
          setNewCustStreet(addrObj.street);
          if (isCustShippingSameAsBilling) setNewCustShipStreet(addrObj.street);
        }
        if (res.phone && !newCustPhone) setNewCustPhone(res.phone);
        if (res.email && !newCustEmail) setNewCustEmail(res.email);
        setNewCustType("B2B");
        setNewCustTier("Wholesale B2B");
        toast.success(`GSTIN Verified: ${res.legal_name || res.trade_name} (${res.state || 'Active'})`);
      } else {
        toast.error("GSTIN verification returned invalid or inactive status");
      }
    } catch (e: any) {
      toast.error(e?.detail || e?.message || "GSTIN lookup failed");
    } finally {
      setVerifyingCustGST(false);
    }
  };

  useEffect(() => {
    crmApi.getCustomers(1, 100)
      .then((res: any) => {
        const items = res?.items || res;
        if (Array.isArray(items) && items.length > 0) {
          const formatted = items.map((c: any) => ({
            id: c.id,
            name: c.name || "Customer",
            phone: c.phone || "",
            email: c.email || "",
            company: c.company_name || "",
            customer_type: c.customer_type || "Retail",
            gstin: c.gst_number || "",
            address: c.address || "",
            points: c.loyalty_points || 150,
            tier: c.tier || "Silver",
            wallet: c.wallet_balance || 0,
            totalSpent: c.total_spent ? `₹${c.total_spent}` : "₹0.00",
            lastVisit: "Recent"
          }));
          setCustomerList([posCustomers[0], ...formatted]);
        }
      })
      .catch(() => {});
  }, []);

  // Backend data
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [customerWalletBalance, setCustomerWalletBalance] = useState<number>(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Modal States
  const [discountModalItem, setDiscountModalItem] = useState<any | null>(null);
  const [cartEditItem, setCartEditItem] = useState<any | null>(null);
  const [editSellingPrice, setEditSellingPrice] = useState<string>("");
  const [editMrp, setEditMrp] = useState<string>("");
  const [editTaxInclusive, setEditTaxInclusive] = useState<boolean>(true);
  const [editDiscountType, setEditDiscountType] = useState<"amount" | "percent">("amount");
  const [editDiscountValue, setEditDiscountValue] = useState<string>("");
  const [editUpdateMaster, setEditUpdateMaster] = useState<boolean>(false);
  const [isSavingEditItem, setIsSavingEditItem] = useState<boolean>(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>("");

  // Shift/Session States
  const [currentSession, setCurrentSession] = useState<any | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [startingCash, setStartingCash] = useState<string>("0");

  // View States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Split Payment States
  const [splitPaymentModalOpen, setSplitPaymentModalOpen] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitOnline, setSplitOnline] = useState("");

  // Cash Payment States
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState("");
  const [creditChangeToWallet, setCreditChangeToWallet] = useState(false);
  const [completedCheckoutBill, setCompletedCheckoutBill] = useState<any | null>(null);

  // Partial Payment States
  const [partialPaymentModalOpen, setPartialPaymentModalOpen] = useState(false);
  const [partialPaidAmount, setPartialPaidAmount] = useState("");
  const [partialPaymentMode, setPartialPaymentMode] = useState<string>("Cash");

  // Held Bills Modal States
  const [heldBillsModalOpen, setHeldBillsModalOpen] = useState(false);
  const [heldBillsList, setHeldBillsList] = useState<any[]>([]);
  const [isLoadingHeldBills, setIsLoadingHeldBills] = useState(false);
  const [heldBillsCount, setHeldBillsCount] = useState(0);

  // Strict Duplicate Checkout Protection Lock
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isProcessingCheckoutRef = useRef(false);

  useEffect(() => {
    if (!selectedCustomer || selectedCustomer.id === 'walk-in' || selectedCustomer.id === 'WALK-IN' || !selectedCustomer.id) {
      setCustomerSummary(null);
      setCustomerWalletBalance(0);
      setIncludePreviousDueInBill(false);
      return;
    }

    invoicesApi
      .getCustomerSummary(selectedCustomer.id)
      .then((data: any) => {
        if (data) {
          const rawUnpaid = (data.unpaid_invoices || []).filter((inv: any) => {
            const rawStatus = String(inv.status || "").toLowerCase();
            const due = Number(inv.balance_due) || 0;
            return !["paid", "voided", "cancelled", "completed"].includes(rawStatus) && due > 0.05;
          });
          const totalPending = rawUnpaid.reduce((sum: number, inv: any) => sum + Number(inv.balance_due || 0), 0);
          setCustomerSummary({
            ...data,
            total_pending_due: totalPending,
            unpaid_invoices: rawUnpaid
          });
        }
      })
      .catch(() => {
        setCustomerSummary(null);
      });

    crmWalletApi
      .getBalance(selectedCustomer.id)
      .then((res: any) => {
        const bal = Number(res?.balance || 0);
        setCustomerWalletBalance(bal);
        setSelectedCustomer((prev: any) => (prev ? { ...prev, wallet: bal } : prev));
      })
      .catch(() => {
        const fallbackBal = Number((selectedCustomer as any)?.wallet || (selectedCustomer as any)?.wallet_balance || 0);
        setCustomerWalletBalance(fallbackBal);
      });
  }, [selectedCustomer?.id]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return toast.error("Customer name is required");
    if (!newCustPhone.trim()) return toast.error("Phone number is required");

    const fullBilling = [newCustStreet, newCustCity, newCustState, newCustPincode].filter(Boolean).join(", ");
    const fullShipping = isCustShippingSameAsBilling
      ? fullBilling
      : [newCustShipStreet, newCustShipCity, newCustShipState, newCustShipPincode].filter(Boolean).join(", ");

    try {
      const created = await crmApi.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
        company_name: newCustCompany.trim() || undefined,
        customer_type: newCustType,
        gst_number: newCustGST.trim() || undefined,
        billing_address: fullBilling ? { street: newCustStreet, city: newCustCity, state: newCustState, postal_code: newCustPincode, country: "India" } : undefined,
        shipping_address: fullShipping ? { street: isCustShippingSameAsBilling ? newCustStreet : newCustShipStreet, city: isCustShippingSameAsBilling ? newCustCity : newCustShipCity, state: isCustShippingSameAsBilling ? newCustState : newCustShipState, postal_code: isCustShippingSameAsBilling ? newCustPincode : newCustShipPincode, country: "India" } : undefined,
      });

      const customerObj = created.data || created;
      const formatted = {
        id: customerObj.id,
        name: customerObj.name,
        phone: customerObj.phone || "",
        email: customerObj.email || "",
        company: customerObj.company_name || "",
        customer_type: customerObj.customer_type || newCustType,
        gstin: customerObj.gst_number || "",
        address: fullBilling || "",
        points: customerObj.loyalty_points || 150,
        tier: customerObj.tier || newCustTier,
        wallet: customerObj.wallet_balance || 0,
        totalSpent: "₹0.00",
        lastVisit: "Just Now"
      };

      setCustomerList(prev => [posCustomers[0], formatted, ...prev.filter(c => c.id !== 'walk-in')]);
      setSelectedCustomer(formatted);
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setNewCustCompany("");
      setNewCustGST("");
      setNewCustStreet("");
      setNewCustCity("");
      setNewCustState("Andhra Pradesh");
      setNewCustPincode("");
      setNewCustShipStreet("");
      setNewCustShipCity("");
      setNewCustShipState("Andhra Pradesh");
      setNewCustShipPincode("");
      setIsCustShippingSameAsBilling(true);
      setNewCustType("Retail");
      toast.success(`Customer "${formatted.name}" created and selected!`);
    } catch {
      const fullBilling = [newCustStreet, newCustCity, newCustState, newCustPincode].filter(Boolean).join(", ");
      const newCust = {
        id: `CUST${Date.now().toString().slice(-4)}`,
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim(),
        company: newCustCompany.trim(),
        customer_type: newCustType,
        gstin: newCustGST.trim(),
        address: fullBilling,
        points: 100,
        tier: newCustTier,
        wallet: 0,
        totalSpent: "₹0.00",
        lastVisit: "Just Now"
      };
      setCustomerList(prev => [posCustomers[0], newCust, ...prev.filter(c => c.id !== 'walk-in')]);
      setSelectedCustomer(newCust);
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustEmail("");
      setNewCustCompany("");
      setNewCustGST("");
      setNewCustStreet("");
      setNewCustCity("");
      setNewCustState("Andhra Pradesh");
      setNewCustPincode("");
      setNewCustType("Retail");
      toast.success(`Customer "${newCust.name}" created and selected!`);
    };
  };
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    name: "", brand: "", sku: "", barcode: "",
    sellingPrice: 0, mrp: 0, purchasePrice: 0, stock: 0, longDesc: ""
  });

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setIsEditingProduct(false);
    setEditForm({
      name: product.name || "",
      brand: product.brand || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      sellingPrice: product.sellingPrice || 0,
      mrp: product.mrp || 0,
      purchasePrice: product.purchasePrice || 0,
      stock: product.stock || 0,
      longDesc: product.longDesc || product.shortDesc || "",
    });
  };

  // Helper to match a product to a category/sub-category by ID or Name
  const isProductInCategory = (p: any, catId: string, allCats: any[]) => {
    if (!catId || catId === "all") return true;

    // Find target category object
    const targetCat = allCats.find(
      (c) =>
        String(c.id).toLowerCase().trim() === String(catId).toLowerCase().trim() ||
        String(c.name).toLowerCase().trim() === String(catId).toLowerCase().trim()
    );
    const targetName = (targetCat ? targetCat.name : catId).toLowerCase().trim();
    const targetId = String(targetCat?.id || catId).toLowerCase().trim();

    const pCatId = String(p.category_id || (typeof p.category === "object" ? p.category?.id : p.category) || "").toLowerCase().trim();
    const pCatName = String(p.category_name || (typeof p.category === "object" ? p.category?.name : (typeof p.category === "string" ? p.category : "")) || "").toLowerCase().trim();
    const pSubCat = String(p.sub_category || p.subcategory || p.sub_category_name || "").toLowerCase().trim();

    // 1. Direct match by ID or Name
    if (pCatId && (pCatId === targetId || pCatId === targetName)) return true;
    if (pCatName && (pCatName === targetName || pCatName === targetId)) return true;
    if (pSubCat && (pSubCat === targetName || pSubCat === targetId)) return true;

    // 2. Contains match (handles slight casing or whitespace discrepancies)
    if (pCatName && targetName && (pCatName === targetName || pCatName.includes(targetName) || targetName.includes(pCatName))) return true;
    if (pSubCat && targetName && (pSubCat === targetName || pSubCat.includes(targetName) || targetName.includes(pSubCat))) return true;

    // 3. Child categories check (if target is a parent category, match if product belongs to any child)
    const childCats = allCats.filter((c) => {
      const pId = String(c.parent_id || "").toLowerCase().trim();
      return pId && (pId === targetId || pId === targetName || (targetCat && pId === String(targetCat.id).toLowerCase().trim()));
    });

    for (const child of childCats) {
      const childId = String(child.id).toLowerCase().trim();
      const childName = String(child.name).toLowerCase().trim();
      if (
        (pCatId && (pCatId === childId || pCatId === childName)) ||
        (pCatName && (pCatName === childName || pCatName === childId)) ||
        (pSubCat && (pSubCat === childName || pSubCat === childId)) ||
        (pCatName && (pCatName.includes(childName) || childName.includes(pCatName))) ||
        (pSubCat && (pSubCat.includes(childName) || childName.includes(pSubCat)))
      ) {
        return true;
      }
    }

    return false;
  };

  // Load real data from backend on mount
  const loadData = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const [cats, invCatsRes, posProds, invProdsRes, bList, heldHistory] = await Promise.all([
        posApi.getCategories().catch(() => []),
        inventoryApi.getCategories({ page_size: 500 }).catch(() => null),
        posApi.getProducts({ limit: 5000 }).catch(() => []),
        inventoryApi.getProducts({ page_size: 5000, sort_by: "updated_at", sort_order: "desc" }).catch(() => null),
        inventoryApi.getBatches().catch(() => []),
        posApi.getHistory({ status_filter: 'on_hold', limit: 100 }).catch(() => [])
      ]);

      if (Array.isArray(bList)) {
        setBatches(bList);
      }

      if (Array.isArray(heldHistory)) {
        setHeldBillsCount(heldHistory.length);
      }

      // Also check session
      try {
        const sess = await posApi.getCurrentSession();
        setCurrentSession(sess);
      } catch (sessErr: any) {
        if (sessErr?.status === 404) {
          setSessionModalOpen(true);
        }
      }

      // 1. Build unified categories list
      const rawPosCats = Array.isArray(cats) ? cats : ((cats as any)?.items || []);
      const rawInvCats = Array.isArray(invCatsRes) ? invCatsRes : ((invCatsRes as any)?.items || []);
      
      const catMap = new Map<string, any>();
      [...rawPosCats, ...rawInvCats].forEach((c: any, i: number) => {
        if (c && (c.id || c.name)) {
          const key = String(c.id || c.name);
          if (!catMap.has(key)) {
            catMap.set(key, {
              id: c.id || c.name,
              name: c.name,
              parent_id: c.parent_id || null,
              color: c.color || posCategories[i % posCategories.length]?.color || "bg-slate-100 text-slate-700",
              icon: posCategories[i % posCategories.length]?.icon || null,
              aiScore: Math.floor(Math.random() * 30) + 70,
            });
          }
        }
      });

      // 2. Build unified products list
      const rawPosProds: any[] = Array.isArray(posProds) ? posProds : ((posProds as any)?.items || []);
      const rawInvProds: any[] = Array.isArray(invProdsRes) ? invProdsRes : ((invProdsRes as any)?.items || []);

      const prodMap = new Map<string, any>();
      rawPosProds.forEach((p: any) => { if (p?.id) prodMap.set(String(p.id), p); });
      rawInvProds.forEach((p: any) => {
        if (p?.id) {
          const existing = prodMap.get(String(p.id)) || {};
          prodMap.set(String(p.id), { ...existing, ...p });
        }
      });

      const allFetchedProds = Array.from(prodMap.values());

      // Extract any missing categories / subcategories present on products
      allFetchedProds.forEach((p: any, i: number) => {
        const catName = p.category?.name || p.category_name || (typeof p.category === "string" ? p.category : "") || "";
        const subCatName = p.sub_category || p.subcategory || p.sub_category_name || "";
        if (catName && !catMap.has(catName)) {
          catMap.set(catName, {
            id: p.category_id || catName,
            name: catName,
            parent_id: null,
            color: posCategories[i % posCategories.length]?.color || "bg-slate-100 text-slate-700",
            icon: posCategories[i % posCategories.length]?.icon || null,
            aiScore: 80
          });
        }
        if (catName && subCatName) {
          const subKey = `${catName}::${subCatName}`;
          if (!catMap.has(subKey)) {
            const parentCatObj = catMap.get(catName) || catMap.get(p.category_id);
            catMap.set(subKey, {
              id: subKey,
              name: subCatName,
              parent_id: parentCatObj ? parentCatObj.id : catName,
              color: posCategories[i % posCategories.length]?.color || "bg-slate-100 text-slate-700",
              icon: null,
              aiScore: 80
            });
          }
        }
      });

      const finalCats = Array.from(catMap.values());
      setCategories(finalCats);

      const mappedProds = allFetchedProds.map((p: any) => {
        let specs: any = {};
        if (typeof p.specifications === "string") {
          try {
            specs = JSON.parse(p.specifications || "{}");
          } catch {
            specs = {};
          }
        } else if (p.specifications && typeof p.specifications === "object") {
          specs = p.specifications;
        }
        const basePrice = Number(p.selling_price || p.price || p.mrp || 0);
        const rawWholesale = Number(p.wholesale_price && Number(p.wholesale_price) > 0 ? p.wholesale_price : (specs.wholesale_price && Number(specs.wholesale_price) > 0 ? specs.wholesale_price : 0));
        const rawB2B = Number(p.b2b_price && Number(p.b2b_price) > 0 ? p.b2b_price : (specs.b2b_price && Number(specs.b2b_price) > 0 ? specs.b2b_price : 0));
        const wPrice = rawWholesale > 0 ? rawWholesale : basePrice;
        const bPrice = rawB2B > 0 ? rawB2B : basePrice;
        const taxPct = Number(p.tax_percent != null ? p.tax_percent : (p.tax_rate != null ? p.tax_rate : 18));
        
        const catNameVal = p.category?.name || p.category_name || (typeof p.category === "string" ? p.category : "") || "";
        const subCatNameVal = p.sub_category || p.subcategory || p.sub_category_name || "";

        const primaryUom = p.uom || p.uom_name || specs.primary_uom || specs.uom || p.unit || "Pcs";
        const secondaryUom = p.secondary_uom || specs.secondary_uom || "";
        const rawFactor = p.conversion_factor ?? specs.conversion_factor;
        const conversionFactor = Number(rawFactor) > 0 ? Number(rawFactor) : 1;

        return {
          id: p.id,
          name: p.name,
          brand: p.brand?.name || (typeof p.brand === "string" ? p.brand : "") || "",
          category: p.category_id || p.category?.id || catNameVal || "all",
          category_id: p.category_id || p.category?.id || null,
          category_name: catNameVal,
          sub_category: subCatNameVal,
          shortDesc: p.description || p.short_description || `${p.name}`,
          longDesc: p.description || "",
          barcode: p.barcode || "",
          sku: p.sku || "",
          hsn_code: p.hsn_code || "1905",
          sellingPrice: basePrice,
          wholesalePrice: wPrice,
          b2bPrice: bPrice,
          minWholesaleQty: Number(p.min_wholesale_qty || 1),
          mrp: Number(p.mrp || basePrice || 0),
          purchasePrice: Number(p.purchase_price || p.cost_price || 0),
          tax_percent: taxPct,
          tax: taxPct,
          is_tax_inclusive: p.is_tax_inclusive !== false,
          discount: Number(p.discount || p.discount_limit || 0),
          stock: Number(p.stock || p.initial_stock || 0),
          reorderLevel: Number(p.reorder_level || 10),
          image: p.image_url ? resolveImageUrl(p.image_url) : null,
          aiScore: Math.floor(Math.random() * 30) + 70,
          isFastMoving: (p.stock || p.initial_stock || 0) > 50,
          uom: String(primaryUom),
          secondary_uom: String(secondaryUom),
          conversion_factor: conversionFactor,
        };
      });

      setProducts(mappedProds);
    } catch (err) {
      console.warn("Backend loading notice:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [tenant?.id, (tenant as any)?.company_id, (tenant as any)?.raw?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleWorkspaceRefresh = () => {
      loadData();
    };
    window.addEventListener("workspace_changed", handleWorkspaceRefresh);
    window.addEventListener("company_changed", handleWorkspaceRefresh);
    window.addEventListener("inventory_updated", handleWorkspaceRefresh);
    window.addEventListener("pos_invoices_updated", handleWorkspaceRefresh);
    return () => {
      window.removeEventListener("workspace_changed", handleWorkspaceRefresh);
      window.removeEventListener("company_changed", handleWorkspaceRefresh);
      window.removeEventListener("inventory_updated", handleWorkspaceRefresh);
      window.removeEventListener("pos_invoices_updated", handleWorkspaceRefresh);
    };
  }, [loadData]);

  useEffect(() => {
    // Attempt to enter fullscreen
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  // Sync active session when switching back from other views
  useEffect(() => {
    if (currentView === 'billing') {
      posApi.getCurrentSession().then(sess => {
        setCurrentSession(sess);
      }).catch(err => {
        if (err?.status === 404) {
          setSessionModalOpen(true);
        }
      });
    }
  }, [currentView]);

  // Available Main Categories
  const parentCategories = useMemo(() => {
    const mainCats = categories.filter(c => !c.parent_id);
    return mainCats;
  }, [categories]);

  const currentSubCategories = useMemo(() => {
    if (activeCategory === "all") return [];
    return categories.filter(c => c.parent_id === activeCategory);
  }, [categories, activeCategory]);

  // Brands available under current Category / Sub-Category
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    const activeTarget = activeSubCategory !== "all" ? activeSubCategory : activeCategory;
    products.forEach(p => {
      if (!p.brand) return;
      if (isProductInCategory(p, activeTarget, categories)) {
        brandSet.add(p.brand);
      }
    });
    return Array.from(brandSet).sort();
  }, [products, activeCategory, activeSubCategory, categories]);

  // Filter products by parent category, sub-category, brand, and search query
  const filteredProducts = useMemo(() => {
    const activeTarget = activeSubCategory !== "all" ? activeSubCategory : activeCategory;
    return products.filter(p => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchSku) return false;
      }

      // 2. Brand Filter (if selected)
      if (activeBrand !== "all") {
        if (p.brand?.toLowerCase() !== activeBrand.toLowerCase()) return false;
      }

      // 3. Category & Sub-category Filter
      if (activeTarget !== "all") {
        if (!isProductInCategory(p, activeTarget, categories)) return false;
      }

      return true;
    });
  }, [products, searchQuery, activeCategory, activeSubCategory, activeBrand, categories]);


  const totalPosPages = Math.ceil(filteredProducts.length / posPageSize) || 1;

  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((posPage - 1) * posPageSize, posPage * posPageSize);
  }, [filteredProducts, posPage, posPageSize]);

  // Cart actions
  const addToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Match active inventory batch via FEFO (First Expired First Out)
    const matchingBatches = batches.filter(
      (b) =>
        (b.product_id === product.id ||
          (b.product_name && product.name && b.product_name.toLowerCase() === product.name.toLowerCase())) &&
        Number(b.remaining_quantity || b.quantity || 0) > 0
    ).sort(
      (a, b) =>
        new Date(a.expiry_date || "2099-12-31").getTime() -
        new Date(b.expiry_date || "2099-12-31").getTime()
    );

    const activeBatch = matchingBatches[0];
    const effectiveHsn =
      product.hsn_code ||
      (product.category?.toLowerCase().includes("dairy")
        ? "0405"
        : product.category?.toLowerCase().includes("biscuit")
        ? "1905"
        : product.category?.toLowerCase().includes("shampoo")
        ? "3305"
        : "1905");
    const effectiveTax = Number(product.tax_percent ?? product.tax ?? 18);
    const specs = typeof product.specifications === "string" ? (function() { try { return JSON.parse(product.specifications); } catch { return {}; } })() : (product.specifications || {});
    const primaryUom = product.uom || product.uom_name || specs.uom || specs.primary_uom || "Pcs";
    const secondaryUom = product.secondary_uom || specs.secondary_uom || "";
    const conversionFactor = Math.max(1, Number(product.conversion_factor || specs.conversion_factor || 1));
    const salesMeasuringUnit = product.sales_measuring_unit || specs.sales_measuring_unit || "";

    const rawBasePrice = Number(activeBatch?.selling_price) > 0 ? Number(activeBatch.selling_price) : (pricingMode === "B2B" && product.b2bPrice ? product.b2bPrice : pricingMode === "Wholesale" && product.wholesalePrice ? product.wholesalePrice : product.sellingPrice);
    const rawBaseMrp = Number(activeBatch?.mrp) > 0 ? Number(activeBatch.mrp) : (product.mrp || rawBasePrice * 1.2);

    const priceIsPerSec = Boolean(
      secondaryUom &&
      conversionFactor > 1 &&
      salesMeasuringUnit &&
      (
        salesMeasuringUnit.toLowerCase() === secondaryUom.toLowerCase() ||
        (salesMeasuringUnit.toLowerCase() !== String(primaryUom).toLowerCase() && (
          secondaryUom.toLowerCase().includes(salesMeasuringUnit.toLowerCase()) ||
          salesMeasuringUnit.toLowerCase().includes(secondaryUom.toLowerCase())
        ))
      )
    );

    const primarySellingPrice = priceIsPerSec ? Number((rawBasePrice * conversionFactor).toFixed(2)) : rawBasePrice;
    const secondarySellingPrice = priceIsPerSec ? rawBasePrice : Number((rawBasePrice / conversionFactor).toFixed(2));
    const primaryMrpVal = priceIsPerSec ? Number((rawBaseMrp * conversionFactor).toFixed(2)) : rawBaseMrp;
    const secondaryMrpVal = priceIsPerSec ? rawBaseMrp : (rawBaseMrp > 0 ? Number((rawBaseMrp / conversionFactor).toFixed(2)) : 0);

    const initialUom = priceIsPerSec && secondaryUom ? secondaryUom : primaryUom;
    const initialPrice = initialUom === secondaryUom ? secondarySellingPrice : primarySellingPrice;
    const initialMrp = initialUom === secondaryUom ? secondaryMrpVal : primaryMrpVal;

    const enrichedProduct = {
      ...product,
      uom: primaryUom,
      secondary_uom: secondaryUom,
      conversion_factor: conversionFactor,
      selected_uom: initialUom,
      base_selling_price: primarySellingPrice,
      base_mrp: primaryMrpVal,
      batch_number: activeBatch?.batch_number || product.batch_number || "",
      batch_id: activeBatch?.id || null,
      expiry_date: activeBatch?.expiry_date ? String(activeBatch.expiry_date).slice(0, 10) : product.expiry_date || null,
      mrp: initialMrp,
      sellingPrice: initialPrice,
      price: initialPrice,
      hsn_code: effectiveHsn,
      tax_percent: effectiveTax,
      is_tax_inclusive: product.is_tax_inclusive !== false,
    };

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...enrichedProduct, qty: 1 }];
    });
  };

  const switchCartItemUom = (itemId: string, newUom: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const factor = Number(item.conversion_factor) > 1 ? Number(item.conversion_factor) : 1;
          const basePrice = Number(item.base_selling_price ?? item.sellingPrice ?? item.price) || 0;
          const baseMrp = Number(item.base_mrp ?? item.mrp) || 0;

          if (newUom === item.secondary_uom && factor > 1) {
            const secPrice = Number((basePrice / factor).toFixed(2));
            const secMrp = baseMrp > 0 ? Number((baseMrp / factor).toFixed(2)) : 0;
            return {
              ...item,
              selected_uom: item.secondary_uom,
              sellingPrice: secPrice,
              price: secPrice,
              mrp: secMrp,
              subtotal: secPrice * (item.qty || 1),
            };
          } else {
            return {
              ...item,
              selected_uom: item.uom,
              sellingPrice: basePrice,
              price: basePrice,
              mrp: baseMrp,
              subtotal: basePrice * (item.qty || 1),
            };
          }
        }
        return item;
      })
    );
  };

  const handleBatchSelectForCartItem = (batch: any) => {
    if (!batchModalCartItem) return;
    setCart((prev) =>
      prev.map((it) => {
        if (it.id !== batchModalCartItem.id) return it;

        let updatedSellingPrice = it.sellingPrice;
        let updatedMrp = it.mrp;
        const isLoose =
          it.selected_uom &&
          it.secondary_uom &&
          it.selected_uom === it.secondary_uom &&
          it.conversion_factor > 1;

        if (batch.selling_price && Number(batch.selling_price) > 0) {
          const baseBatchSp = Number(batch.selling_price);
          updatedSellingPrice = isLoose
            ? Number((baseBatchSp / it.conversion_factor).toFixed(2))
            : baseBatchSp;
        }

        if (batch.mrp && Number(batch.mrp) > 0) {
          const baseBatchMrp = Number(batch.mrp);
          updatedMrp = isLoose
            ? Number((baseBatchMrp / it.conversion_factor).toFixed(2))
            : baseBatchMrp;
        }

        return {
          ...it,
          batch_id: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          mfg_date: batch.mfg_date,
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse_name,
          sellingPrice: updatedSellingPrice,
          base_selling_price: batch.selling_price
            ? Number(batch.selling_price)
            : it.base_selling_price,
          mrp: updatedMrp,
          base_mrp: batch.mrp ? Number(batch.mrp) : it.base_mrp,
        };
      })
    );
    setBatchModalCartItem(null);
    toast.success(`Batch #${batch.batch_number} assigned to cart item.`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const openCartItemEditModal = (item: any) => {
    setCartEditItem(item);
    const rawPrice = item.sellingPrice || item.selling_price || item.price || 0;
    setEditSellingPrice(rawPrice > 0 ? rawPrice.toString() : "");
    setEditMrp((item.mrp || 0) > 0 ? item.mrp.toString() : "");
    setEditTaxInclusive(item.is_tax_inclusive !== false);
    setEditDiscountType("amount");
    setEditDiscountValue(item.discount ? item.discount.toString() : "");
    setEditUpdateMaster(false);
  };

  const handleSaveCartItemEdit = async () => {
    if (!cartEditItem) return;
    const rawPrice = parseFloat(editSellingPrice) || 0;
    const rawMrp = parseFloat(editMrp) || 0;

    // Calculate effective discount
    let discAmt = 0;
    const discVal = parseFloat(editDiscountValue) || 0;
    if (editDiscountType === "percent") {
      discAmt = (rawPrice * discVal) / 100;
    } else {
      discAmt = discVal;
    }

    setIsSavingEditItem(true);
    try {
      // 1. Update cart item
      setCart(prev => prev.map(it => {
        if (it.id === cartEditItem.id) {
          return {
            ...it,
            sellingPrice: rawPrice,
            selling_price: rawPrice,
            price: rawPrice,
            mrp: rawMrp,
            is_tax_inclusive: editTaxInclusive,
            discount: discAmt,
          };
        }
        return it;
      }));

      // 2. If requested, sync back to master product database
      if (editUpdateMaster) {
        try {
          await posApi.updateProduct(cartEditItem.id, {
            selling_price: rawPrice,
            mrp: rawMrp,
            is_tax_inclusive: editTaxInclusive,
          });
          setProducts(prev => prev.map(p => {
            if (p.id === cartEditItem.id) {
              return {
                ...p,
                sellingPrice: rawPrice,
                selling_price: rawPrice,
                mrp: rawMrp,
                is_tax_inclusive: editTaxInclusive,
              };
            }
            return p;
          }));
          toast.success("Updated in cart and saved to product database!");
        } catch (dbErr: any) {
          console.error("Failed to update master product:", dbErr);
          toast.warning("Updated in cart, but could not update product master.");
        }
      } else {
        toast.success("Cart item pricing updated!");
      }

      setCartEditItem(null);
    } finally {
      setIsSavingEditItem(false);
    }
  };

  const applyDiscount = () => {
    if (!discountModalItem) return;
    setCart(prev => prev.map(item => {
      if (item.id === discountModalItem.id) {
        return { ...item, discount: Number(discountInput) };
      }
      return item;
    }));
    setDiscountModalItem(null);
    setDiscountInput("");
  };

  const clearCart = () => setCart([]);

  const handleOpenSession = async () => {
    try {
      const sess = await posApi.openSession({ starting_cash: Number(startingCash) });
      setCurrentSession(sess);
      setSessionModalOpen(false);
    } catch (err: any) {
      alert("Failed to open register: " + (err.detail || err.message || "Unknown error"));
    }
  };

  const [pricingMode, setPricingMode] = useState<"Retail" | "Wholesale" | "B2B">("Retail");

  const getItemEffectivePrice = (item: any, qty: number = item.qty || 1, overrideMode?: "Retail" | "Wholesale" | "B2B") => {
    const mode = overrideMode || pricingMode;
    const specs = typeof item.specifications === "string" ? (function() { try { return JSON.parse(item.specifications); } catch { return {}; } })() : (item.specifications || {});
    const basePrice = Number(item.base_selling_price ?? item.sellingPrice ?? item.selling_price ?? item.price ?? item.mrp ?? 0);
    const rawWholesale = Number(item.wholesalePrice || item.wholesale_price || specs.wholesale_price || 0);
    const rawB2B = Number(item.b2bPrice || item.b2b_price || specs.b2b_price || 0);
    const wholesalePrice = rawWholesale > 0 ? rawWholesale : basePrice;
    const b2bPrice = rawB2B > 0 ? rawB2B : basePrice;
    
    let primaryUnitPrice = basePrice;
    let isTierApplied = false;
    let tierName = "Retail";

    if (mode === "B2B") {
      primaryUnitPrice = b2bPrice;
      isTierApplied = true;
      tierName = "B2B";
    } else if (mode === "Wholesale") {
      primaryUnitPrice = wholesalePrice;
      isTierApplied = true;
      tierName = "Wholesale";
    } else {
      const isWholesaleCustomer = selectedCustomer?.tier?.toLowerCase().includes("wholesale") || selectedCustomer?.tier?.toLowerCase().includes("b2b");
      if (isWholesaleCustomer) {
        primaryUnitPrice = wholesalePrice;
        isTierApplied = true;
        tierName = "Wholesale";
      }
    }

    const factor = Number(item.conversion_factor) > 1 ? Number(item.conversion_factor) : 1;
    let unitPrice = primaryUnitPrice;
    if (item.selected_uom === item.secondary_uom && factor > 1) {
      unitPrice = Number((primaryUnitPrice / factor).toFixed(2));
    }

    return { unitPrice, primaryUnitPrice, isWholesale: isTierApplied, tierName, basePrice, wholesalePrice, b2bPrice };
  };

  const handlePricingModeChange = (mode: "Retail" | "Wholesale" | "B2B") => {
    setPricingMode(mode);
    setCart((prevCart) =>
      prevCart.map((item) => {
        const { unitPrice, primaryUnitPrice } = getItemEffectivePrice(item, item.qty, mode);
        return {
          ...item,
          base_selling_price: primaryUnitPrice,
          sellingPrice: unitPrice,
          price: unitPrice,
          subtotal: unitPrice * item.qty
        };
      })
    );
    toast.success(`Active Pricing Tier switched to ${mode} Tier`);
  };

  // Dynamic Cart Discount State
  const [discountMode, setDiscountMode] = useState<"before_tax" | "after_tax">("before_tax");
  const [cartDiscountType, setCartDiscountType] = useState<"percent" | "amount">("percent");
  const [cartDiscountValue, setCartDiscountValue] = useState<number>(0);

  // Dynamic Custom Additional Charges State (Freight, Packing, Transport, etc.)
  const [posCustomCharges, setPosCustomCharges] = useState<{ id: string; name: string; amount: number; tax_rate: number }[]>([]);
  const [posGstType, setPosGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");

  const handleAddPosChargeRow = () => {
    setPosCustomCharges(prev => [
      ...prev,
      { id: `chg_${Date.now()}_${Math.floor(Math.random() * 1000)}`, name: "Freight / Delivery Fee", amount: 0, tax_rate: 0 }
    ]);
  };

  const handleUpdatePosCharge = (id: string, field: "name" | "amount" | "tax_rate", value: any) => {
    setPosCustomCharges(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: field === "amount" ? Math.max(0, Number(value)) : field === "tax_rate" ? Number(value) : value } : c))
    );
  };

  const handleDeletePosCharge = (id: string) => {
    setPosCustomCharges(prev => prev.filter(c => c.id !== id));
  };

  const posAdditionalChargesTotal = useMemo(() => {
    return posCustomCharges.reduce((sum, c) => {
      const amt = Number(c.amount) || 0;
      const gstAmt = amt * ((Number(c.tax_rate) || 0) / 100);
      return sum + amt + gstAmt;
    }, 0);
  }, [posCustomCharges]);

  const posChargesGstTotal = useMemo(() => {
    return posCustomCharges.reduce((sum, c) => {
      const amt = Number(c.amount) || 0;
      return sum + amt * ((Number(c.tax_rate) || 0) / 100);
    }, 0);
  }, [posCustomCharges]);

  // Cart Math with Dynamic Before-Tax & After-Tax Discount and GST Inclusive/Exclusive Support
  const itemTaxBreakdown = useMemo(() => {
    return cart.map((item) => {
      const { unitPrice, isWholesale, tierName } = getItemEffectivePrice(item);
      const taxRate = Number(item.tax_percent ?? item.tax ?? 18);
      const isIncl = item.is_tax_inclusive !== false;
      const baseUnitPrice = isIncl && taxRate > 0 ? unitPrice / (1 + taxRate / 100) : unitPrice;
      const unitGst = isIncl && taxRate > 0 ? unitPrice - baseUnitPrice : baseUnitPrice * (taxRate / 100);
      const sellingUnitPriceIncl = isIncl ? unitPrice : baseUnitPrice + unitGst;

      const grossBase = baseUnitPrice * item.qty;
      const lineDisc = (item.discount || 0) * item.qty;
      const taxableLine = Math.max(0, grossBase - lineDisc);
      const taxLine = taxableLine * (taxRate / 100);
      const finalLineTotal = (sellingUnitPriceIncl * item.qty) - lineDisc;

      return {
        item,
        unitPrice,
        isWholesale,
        tierName,
        taxRate,
        isIncl,
        baseUnitPrice,
        unitGst,
        sellingUnitPriceIncl,
        grossBase,
        lineDisc,
        taxableLine,
        taxLine,
        finalLineTotal,
      };
    });
  }, [cart, pricingMode, selectedCustomer]);

  const subtotal = itemTaxBreakdown.reduce((sum, b) => sum + (b.unitPrice * b.item.qty), 0);
  const totalBaseTaxable = itemTaxBreakdown.reduce((sum, b) => sum + b.taxableLine, 0);
  const itemDiscounts = itemTaxBreakdown.reduce((sum, b) => sum + b.lineDisc, 0);

  // 1. Before-Tax Discount
  let beforeTaxDiscount = 0;
  if (discountMode === "before_tax" && cartDiscountValue > 0) {
    beforeTaxDiscount = cartDiscountType === "percent"
      ? totalBaseTaxable * (cartDiscountValue / 100)
      : Math.min(cartDiscountValue, totalBaseTaxable);
  }

  const taxableAmount = Math.max(0, totalBaseTaxable - beforeTaxDiscount);

  // 2. Tax Calculation on Taxable Value
  const taxRatio = totalBaseTaxable > 0 ? (taxableAmount / totalBaseTaxable) : 1;
  const tax = itemTaxBreakdown.reduce((sum, b) => sum + (b.taxLine * taxRatio), 0);

  const grossTotal = taxableAmount + tax;

  // 3. After-Tax Discount
  let afterTaxDiscount = 0;
  if (discountMode === "after_tax" && cartDiscountValue > 0) {
    afterTaxDiscount = cartDiscountType === "percent"
      ? grossTotal * (cartDiscountValue / 100)
      : Math.min(cartDiscountValue, grossTotal);
  }

  const totalDiscount = itemDiscounts + beforeTaxDiscount + afterTaxDiscount;
  const previousDueToAdd = (includePreviousDueInBill && customerSummary?.total_pending_due > 0)
    ? Number(customerSummary.total_pending_due)
    : 0;
  const total = Math.max(0, grossTotal - afterTaxDiscount) + previousDueToAdd + posAdditionalChargesTotal;

  const handleCheckout = async () => {
    if (isProcessingCheckoutRef.current || isCheckingOut) return;
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }
    if (paymentMethod === 'Split') {
      setSplitPaymentModalOpen(true);
      return;
    }
    if (paymentMethod === 'Partial' || paymentMethod === 'Partial Pay') {
      setPartialPaidAmount(total > 0 ? (total * 0.5).toFixed(2) : '');
      setPartialPaymentMode('Cash');
      setPartialPaymentModalOpen(true);
      return;
    }
    if (paymentMethod === 'Cash') {
      setCashTendered(total.toString());
      setCashModalOpen(true);
      return;
    }
    if (paymentMethod === 'Credit' || paymentMethod === 'Pay Later') {
      if (!selectedCustomer || selectedCustomer.id === 'walk-in' || selectedCustomer.id === 'WALK-IN') {
        toast.error("Please select or add a registered customer for Pay Later (Store Credit) sales!");
        setIsCustomerModalOpen(true);
        return;
      }
      await executeCheckout([{ payment_method: 'credit', amount: total }]);
      return;
    }
    if (paymentMethod === 'Wallet') {
      if (!selectedCustomer || selectedCustomer.id === "WALK-IN") {
        alert("Please select a registered customer to use Wallet.");
        return;
      }
      if ((selectedCustomer.wallet || 0) < total) {
        alert(`Insufficient Wallet Balance (${formatCurrency(selectedCustomer.wallet || 0)} available).`);
        return;
      }
      await executeCheckout([{ payment_method: "wallet", amount: total }]);
    } else {
      await executeCheckout([{ payment_method: paymentMethod.toLowerCase(), amount: total }]);
    }
  };

  const resolveCartProvisionalItems = async (currentCart: any[]) => {
    const provisionalItems = currentCart.filter(item => item.isProvisional || item.id.toString().startsWith("scanned-"));
    if (provisionalItems.length === 0) return currentCart;

    toast.loading("Registering new scanned products to inventory...");
    try {
      const createdProds = await Promise.all(
        provisionalItems.map(async (item) => {
          const res = await posApi.createProduct({
            name: item.name,
            brand_name: item.brand || "General",
            sku: item.sku || `SKU-${item.barcode}`,
            barcode: item.barcode,
            selling_price: item.sellingPrice,
            mrp: item.mrp || item.sellingPrice,
            purchase_price: item.purchasePrice || (item.sellingPrice * 0.6),
            initial_stock: item.qty || 1,
            description: item.longDesc || "Scanned unknown item",
            is_active: true
          });
          return {
            tempId: item.id,
            realId: res.id
          };
        })
      );

      const updatedCart = currentCart.map(item => {
        const match = createdProds.find(cp => cp.tempId === item.id);
        if (match) {
          return { ...item, id: match.realId, isProvisional: false };
        }
        return item;
      });

      toast.dismiss();
      toast.success("New products registered successfully.");

      // Fetch updated products list
      posApi.getProducts().then(prods => {
        if (Array.isArray(prods)) {
          const mappedProds = prods.map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand || "",
            category: p.category_id || "all",
            shortDesc: p.description || `${p.name}`,
            longDesc: p.description || "",
            barcode: p.barcode || "",
            sku: p.sku || "",
            sellingPrice: p.selling_price || p.mrp || 0,
            mrp: p.mrp,
            purchasePrice: p.purchase_price,
            tax: (p.selling_price || p.mrp || 0) * (p.tax_percent / 100),
            discount: p.discount,
            stock: p.stock,
            reorderLevel: p.reorder_level,
            image: p.image_url ? resolveImageUrl(p.image_url) : null,
            aiScore: 75,
            isFastMoving: p.stock > 50,
          }));
          setProducts(mappedProds);
        }
      }).catch(err => console.warn(err));

      return updatedCart;
    } catch (e: any) {
      toast.dismiss();
      toast.error("Failed to register provisional items: " + (e.detail || e.message));
      throw e;
    }
  };

  const executeCheckout = async (paymentsArray: any[]) => {
    if (isProcessingCheckoutRef.current) {
      console.warn("[POS] Checkout already in progress, blocking duplicate execution.");
      return;
    }
    if (cart.length === 0) {
      console.warn("[POS] Cart is empty, blocking checkout.");
      return;
    }
    if (!currentSession) {
      alert("Please open a register first.");
      return;
    }

    isProcessingCheckoutRef.current = true;
    setIsCheckingOut(true);

    try {
      const resolvedCart = await resolveCartProvisionalItems(cart);

      const payload = {
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: totalDiscount,
        total_amount: total,
        session_id: currentSession.id,
        customer_id: selectedCustomer && selectedCustomer.id !== 'walk-in' ? selectedCustomer.id : null,
        status: "completed",
        items: resolvedCart.map(item => {
          const { unitPrice } = getItemEffectivePrice(item);
          return {
            product_id: item.id,
            quantity: item.qty,
            unit_price: unitPrice,
            discount: item.discount || 0,
            subtotal: (unitPrice - (item.discount || 0)) * item.qty,
            batch_id: item.batch_id || undefined,
            batch_number: item.batch_number || undefined,
            expiry_date: item.expiry_date || undefined,
            warehouse_id: item.warehouse_id || undefined,
            warehouse_name: item.warehouse_name || undefined,
          };
        }),
        payments: paymentsArray
      };

      // Call Backend API
      const response = await posApi.checkout(payload);
      console.log("Checkout Success! Receipt:", response.receipt_number);

      const actualPaid = paymentsArray
        .filter(p => p.payment_method?.toLowerCase() !== 'credit')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const balanceDue = Number(Math.max(0, total - actualPaid).toFixed(2));
      const isCreditOnly = actualPaid <= 0.01;
      const isPartial = actualPaid > 0.01 && actualPaid < total - 0.01;
      const paymentStatusDisplay = isCreditOnly ? 'UNPAID' : (isPartial ? 'PARTIALLY PAID' : 'PAID');
      const paymentMethodSummary = paymentsArray.map(p => `${p.payment_method?.toUpperCase()} (₹${Number(p.amount).toFixed(2)})`).join(', ') || 'Cash';

      const billData = {
        invoice_number: response.receipt_number || `REC-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        customerName: selectedCustomer?.name || 'Walk-in Guest',
        customerPhone: selectedCustomer?.phone || '',
        items: resolvedCart.map(item => ({
          product_id: item.id,
          name: item.name,
          product_name: item.name,
          sku: item.sku,
          hsn_code: item.hsn_code,
          quantity: item.qty,
          unit_price: item.sellingPrice,
          subtotal: (item.sellingPrice - (item.discount || 0)) * item.qty,
          batch_id: item.batch_id || undefined,
          batch_number: item.batch_number || undefined,
          expiry_date: item.expiry_date || undefined,
          warehouse_id: item.warehouse_id || undefined,
          warehouse_name: item.warehouse_name || undefined,
          mrp: item.mrp,
        })),
        subtotal: subtotal,
        discount_amount: totalDiscount,
        tax_amount: tax,
        grand_total: total,
        paid_amount: actualPaid,
        balance_due: balanceDue,
        payment_method: paymentMethodSummary,
        payment_status: paymentStatusDisplay,
      };

      setCompletedCheckoutBill(billData);

      // Sync Customer Wallet balance if paid via Wallet
      const isWalletPayment = paymentsArray.some(p => p.payment_method?.toLowerCase() === 'wallet');
      if (isWalletPayment && selectedCustomer && selectedCustomer.id !== 'walk-in' && selectedCustomer.id !== 'WALK-IN') {
        const walletPaidAmt = paymentsArray.find(p => p.payment_method?.toLowerCase() === 'wallet')?.amount || total;
        const newBal = Math.max(0, customerWalletBalance - walletPaidAmt);
        setCustomerWalletBalance(newBal);
        setSelectedCustomer((prev: any) => prev ? { ...prev, wallet: newBal } : prev);
        crmWalletApi.getBalance(selectedCustomer.id).then((res: any) => {
          if (res && res.balance !== undefined) {
            setCustomerWalletBalance(Number(res.balance));
            setSelectedCustomer((prev: any) => prev ? { ...prev, wallet: Number(res.balance) } : prev);
          }
        }).catch(() => {});
      }

      // Persist to pos_saved_invoices for Invoices History sync
      try {
        const terminalInvoiceRecord = {
          id: response.id || `rec-${Date.now()}`,
          invoice_number: response.receipt_number || billData.invoice_number,
          customer_name: billData.customerName,
          customer_phone: billData.customerPhone,
          customer_gstin: (selectedCustomer as any)?.gst_number || "",
          sales_executive: currentSession?.cashier_name || "POS Cashier",
          sales_points_earned: Math.floor(total / 100),
          invoice_date: getTodayDateString(),
          due_date: getTodayDateString(),
          created_at: new Date().toISOString(),
          payment_mode: billData.payment_method,
          payment_status: isCreditOnly ? "Unpaid" : (isPartial ? "Partially Paid" : "Paid"),
          subtotal: subtotal,
          total_tax: tax,
          discount_amount: totalDiscount,
          grand_total: total,
          amount_received: actualPaid,
          balance_due: balanceDue,
          print_status: "Thermal Printed",
          items: billData.items,
        };
        const prevList = JSON.parse(localStorage.getItem(posStorageKey) || "[]");
        const mergedList = [{ ...terminalInvoiceRecord, tenant_id: currentTenantId, company_id: currentCompanyId, workspace_id: currentCompanyId }, ...prevList.filter((r: any) => r.invoice_number !== terminalInvoiceRecord.invoice_number)];
        localStorage.setItem(posStorageKey, JSON.stringify(mergedList));
      } catch (e) {
        console.warn("Could not save POS checkout bill to localStorage:", e);
      }

      // Broadcast global updates for stock & ledger refresh
      window.dispatchEvent(new Event("pos_invoices_updated"));
      window.dispatchEvent(new Event("inventory_updated"));

      // Clear UI state
      clearCart();
      setPaymentMethod("");
      setSplitPaymentModalOpen(false);
      setCashModalOpen(false);
      setSplitCash("");
      setSplitOnline("");
      setCashTendered("");

      toast.success(`Checkout Successful! Receipt: ${response.receipt_number}`);

      // Wait for React to render the portal before triggering print
      setTimeout(() => {
        // Force a reflow to ensure portal is in the DOM
        const portal = document.getElementById('printable-receipt-portal');
        if (!portal) {
          console.warn('[Print] Portal not found in DOM');
          return;
        }
        triggerThermalPrint();
      }, 500);
    } catch (err: any) {
      console.error("Checkout Failed:", err);
      alert("Checkout failed: " + (err.detail || err.message || "Unknown error"));
    } finally {
      setIsCheckingOut(false);
      setTimeout(() => {
        isProcessingCheckoutRef.current = false;
      }, 1000);
    }
  };

  const handleCashConfirm = async () => {
    const tendered = parseFloat(cashTendered) || 0;
    if (tendered < total) {
      alert("Cash tendered cannot be less than the total amount!");
      return;
    }
    const changeDue = tendered - total;
    
    try {
      await executeCheckout([{ payment_method: "cash", amount: total }]);
      
      // Credit to wallet if checked and applicable
      if (creditChangeToWallet && changeDue > 0 && selectedCustomer && selectedCustomer.id !== "WALK-IN") {
        await crmWalletApi.credit(
          selectedCustomer.id,
          changeDue,
          "POS Cash Change Added to Wallet",
          `POS-${new Date().getTime()}` // Fake reference if receipt isn't returned synchronously before this
        );
        toast.success(`Change of ${formatCurrency(changeDue)} securely credited to Customer Wallet.`);
      }
    } catch (err: any) {
      // Errors already handled in executeCheckout
    }
  };

  const handlePartialConfirm = async () => {
    const paid = parseFloat(partialPaidAmount) || 0;
    if (paid <= 0) {
      toast.error("Please enter a valid upfront payment amount.");
      return;
    }
    if (paid >= total) {
      setPartialPaymentModalOpen(false);
      await executeCheckout([{ payment_method: partialPaymentMode.toLowerCase(), amount: total }]);
      return;
    }

    if (!selectedCustomer || selectedCustomer.id === 'walk-in' || selectedCustomer.id === 'WALK-IN') {
      toast.error("Please select a registered customer to record the remaining balance due in their Khata/Ledger!");
      setIsCustomerModalOpen(true);
      return;
    }

    const due = Number((total - paid).toFixed(2));

    if (partialPaymentMode === 'Wallet' && (customerWalletBalance || 0) < paid) {
      toast.error(`Insufficient Customer Wallet balance (${formatCurrency(customerWalletBalance || 0)} available).`);
      return;
    }

    setPartialPaymentModalOpen(false);
    await executeCheckout([
      { payment_method: partialPaymentMode.toLowerCase(), amount: paid },
      { payment_method: "credit", amount: due }
    ]);
  };

  const handleHoldBill = async () => {
    try {
      if (cart.length === 0) return alert("Cart is empty.");
      if (!currentSession) return alert("Please open a register first.");

      const resolvedCart = await resolveCartProvisionalItems(cart);

      const payload = {
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: totalDiscount,
        total_amount: total,
        session_id: currentSession.id,
        status: "on_hold",
        items: resolvedCart.map(item => ({
          product_id: item.id,
          quantity: item.qty,
          unit_price: item.sellingPrice,
          discount: item.discount || 0,
          subtotal: (item.sellingPrice - (item.discount || 0)) * item.qty
        })),
        payments: []
      };

      await posApi.checkout(payload);
      clearCart();
      setHeldBillsCount(prev => prev + 1);
      alert("Bill placed on hold.");
    } catch (err: any) {
      console.error("Hold Bill Failed:", err);
      alert("Failed to hold bill: " + (err.detail || err.message));
    }
  };

  const resumeCart = async (transaction: any) => {
    try {
      if (cart.length > 0) {
        if (!confirm("Current cart is not empty. Overwrite with resumed bill?")) return;
      }

      const newCart = transaction.items.map((item: any) => {
        const product = products.find(p => p.id === item.product_id);
        return {
          id: item.product_id,
          name: product ? product.name : `Product ${item.product_id.substring(0, 8)}`,
          sku: product ? product.sku : "UNKNOWN",
          brand: product ? product.brand : "",
          image: product && product.image ? product.image : "https://placehold.co/100?text=Item",
          sellingPrice: Number(item.unit_price),
          mrp: Number(item.unit_price) + Number(item.discount || 0),
          discount: Number(item.discount || 0),
          qty: item.quantity,
          stock: product ? product.stock : 999
        };
      });

      setCart(newCart);

      // Delete the held bill from DB so it's not lingering
      // Catch errors silently to prevent double-click 404 alerts
      posApi.deleteTransaction(transaction.id).catch(err => console.warn("Delete held bill:", err));
    } catch (err: any) {
      console.error("Resume failed:", err);
      alert("Failed to resume bill: " + (err.detail || err.message));
    }
  };

  const openHeldBillsModal = async () => {
    setHeldBillsModalOpen(true);
    setIsLoadingHeldBills(true);
    try {
      const bills = await posApi.getHistory({ status_filter: 'on_hold' });
      setHeldBillsList(bills);
    } catch (e) {
      console.error("Failed to load hold bills", e);
    } finally {
      setIsLoadingHeldBills(false);
    }
  };

  const handleSplitPayment = async (payments: any[]) => {
    try {
      if (cart.length === 0) return alert("Cart is empty.");
      if (!currentSession) return alert("Please open a register first.");

      const resolvedCart = await resolveCartProvisionalItems(cart);

      const payload = {
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: totalDiscount,
        total_amount: total,
        session_id: currentSession.id,
        items: resolvedCart.map(item => {
          const { unitPrice } = getItemEffectivePrice(item);
          return {
            product_id: item.id,
            quantity: item.qty,
            unit_price: unitPrice,
            discount: item.discount || 0,
            subtotal: (unitPrice - (item.discount || 0)) * item.qty
          };
        }),
        payments: payments
      };

      const response = await posApi.checkout(payload);
      clearCart();
      alert("Split Payment Successful! Receipt: " + response.receipt_number);
      window.location.hash = "#/pos?view=billing";
    } catch (err: any) {
      console.error("Checkout Failed:", err);
      alert("Checkout failed: " + (err.detail || err.message || "Unknown error"));
    }
  };

  const handleSplitConfirm = async () => {
    const cashAmt = parseFloat(splitCash) || 0;
    const onlineAmt = parseFloat(splitOnline) || 0;
    if (Math.abs(cashAmt + onlineAmt - total) > 0.05) {
      toast.error(`Split amounts (${formatCurrency(cashAmt + onlineAmt)}) must equal total (${formatCurrency(total)})`);
      return;
    }
    setSplitPaymentModalOpen(false);
    const payments = [];
    if (cashAmt > 0) payments.push({ payment_method: "cash", amount: cashAmt });
    if (onlineAmt > 0) payments.push({ payment_method: "online", amount: onlineAmt });
    await handleSplitPayment(payments);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#F3F4F6] font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Terminal Header Nav */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 px-4 flex items-center overflow-x-auto gap-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.02)] z-50">
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => { });
            }
            navigate("/owner/pos?tab=dashboard");
          }}
          className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white shadow-sm hover:shadow-rose-500/20 mr-2 border border-rose-100 hover:border-rose-500"
        >
          <ArrowLeft className="w-4 h-4" /> Exit POS
        </button>
        <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          {[
            { id: "billing", label: "Billing", icon: ShoppingCart },
            { id: "recent", label: "Recent Bills", icon: History },
            { id: "exchange", label: "Exchange", icon: RefreshCw },
            { id: "refund", label: "Refund", icon: CreditCard },
            { id: "wallet", label: "Wallet Summary", icon: Wallet },
            { id: "ai_suggest", label: "AI Suggestions", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = (currentView === tab.id) || (!currentView && tab.id === 'billing');
            return (
              <button
                key={tab.id}
                onClick={() => navigate(`/owner/pos?tab=terminal&view=${tab.id}`)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Pricing Mode 3-Way Pill Toggle (Retail / Wholesale / B2B) */}
        {/* Store / Branch Location Selector & Pricing Mode Toggle */}
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          {/* Store / Location Dropdown */}
          <div className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 shadow-2xs flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Store / Branch</span>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-indigo-600 shrink-0" />
                <select
                  value={selectedStore}
                  onChange={(e) => {
                    setSelectedStore(e.target.value);
                    toast.info(`Switched POS Store to ${e.target.value}`);
                  }}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs max-w-[190px] truncate"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => handlePricingModeChange("Retail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pricingMode === "Retail"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🛒 Retail
            </button>
            <button
              onClick={() => handlePricingModeChange("Wholesale")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                pricingMode === "Wholesale"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              📦 Wholesale
            </button>
            <button
              onClick={() => handlePricingModeChange("B2B")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                pricingMode === "B2B"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-purple-700 hover:bg-purple-50"
              }`}
            >
              🏢 B2B
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (3 Columns) OR SUB-VIEW */}
      {currentView === 'billing' || !currentView ? (
        <div className="flex flex-1 overflow-hidden relative">

          {/* MAIN PRODUCT AREA: LEFT CATEGORY SIDEBAR & TOP SUB-CATEGORY/BRAND WORKSPACE */}
          <div className="flex-1 bg-[#F8FAFC] flex overflow-hidden">

            {/* LEFT VERTICAL SIDEBAR: MAIN CATEGORIES */}
            <div className="w-48 sm:w-56 shrink-0 bg-white border-r border-slate-200/80 flex flex-col p-2 overflow-y-auto z-20 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Main Categories
              </div>

              <button
                onClick={() => { setActiveCategory("all"); setActiveSubCategory("all"); setActiveBrand("all"); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 mb-1 ${
                  activeCategory === "all"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-600/30"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Store className="w-4 h-4 shrink-0" />
                  <span className="truncate">All Products</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === "all" ? "bg-indigo-500/40 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {products.length}
                </span>
              </button>

              <div className="space-y-1">
                {(parentCategories.length > 0 ? parentCategories : categories).map(cat => {
                  const Icon = (cat.icon && typeof cat.icon === 'function') ? cat.icon : Layers;
                  const isActive = activeCategory === cat.id;
                  const count = products.filter(p => isProductInCategory(p, cat.id, categories)).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setActiveSubCategory("all");
                        setActiveBrand("all");
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-600/30 scale-[1.01]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`p-1 rounded-lg shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-indigo-600"}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.name}</span>
                      </div>
                      {count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${isActive ? "bg-indigo-500/40 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT WORKSPACE AREA: TOP SUB-CATEGORIES/BRANDS & PRODUCT GRID */}
            <div className="flex-1 overflow-y-auto flex flex-col">

              {/* TOP SUB-CATEGORIES & BRANDS NAVIGATION BAR */}
              {(currentSubCategories.length > 0 || availableBrands.length > 0) && (
                <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 py-1.5 space-y-1 z-30 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                  {/* Row 1: Nested Sub-Categories Bar */}
                  {currentSubCategories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600/70 mr-1 shrink-0 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> Sub-Category:
                      </span>

                      <button
                        onClick={() => { setActiveSubCategory("all"); setActiveBrand("all"); }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                          activeSubCategory === "all"
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                      >
                        All {categories.find(c => c.id === activeCategory)?.name || "Sub-Categories"}
                      </button>

                      {currentSubCategories.map(subCat => {
                        const isSubActive = activeSubCategory === subCat.id;
                        const subCount = products.filter(p => isProductInCategory(p, subCat.id, categories)).length;

                        return (
                          <button
                            key={subCat.id}
                            onClick={() => { setActiveSubCategory(subCat.id); setActiveBrand("all"); }}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                              isSubActive
                                ? "bg-indigo-500 text-white shadow-sm scale-105"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                            }`}
                          >
                            <span>{subCat.name}</span>
                            {subCount > 0 && (
                              <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${isSubActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {subCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Row 2: Brands Bar */}
                  {availableBrands.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1.5 border-t border-slate-100">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600/70 mr-1 shrink-0 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Brand:
                      </span>

                      <button
                        onClick={() => setActiveBrand("all")}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                          activeBrand === "all"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                        }`}
                      >
                        All Brands ({availableBrands.length})
                      </button>

                      {availableBrands.map(bName => {
                        const isBrandActive = activeBrand.toLowerCase() === bName.toLowerCase();
                        const activeTarget = activeSubCategory !== "all" ? activeSubCategory : activeCategory;
                        const bCount = products.filter(p => {
                          const matchesBrand = p.brand?.toLowerCase() === bName.toLowerCase();
                          if (activeTarget !== "all") {
                            return matchesBrand && isProductInCategory(p, activeTarget, categories);
                          }
                          return matchesBrand;
                        }).length;

                        return (
                          <button
                            key={bName}
                            onClick={() => setActiveBrand(bName)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                              isBrandActive
                                ? "bg-purple-600 text-white shadow-sm scale-105"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70"
                            }`}
                          >
                            <span>{bName}</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${isBrandActive ? "bg-white/20 text-white" : "bg-purple-50 text-purple-600"}`}>
                              {bCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            <div className="p-2.5 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-semibold text-slate-900 whitespace-nowrap tracking-tight">
                  {activeCategory === "all" ? "All Products" : categories.find(c => c.id === activeCategory)?.name}
                </h3>
                <span className="text-xs font-bold bg-white text-slate-500 px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                  {filteredProducts.length} Results
                </span>
              </div>

              <div className="flex items-center gap-3 flex-1 max-w-xl justify-end">
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    id="global-search"
                    type="text"
                    placeholder="Search by name, barcode, SKU... (F2)"
                    className="block w-full pl-11 pr-20 py-3 border border-slate-200/60 rounded-full bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors">
                      <ScanBarcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-1 rounded-2xl shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-2.5">
                {paginatedProducts.map(product => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl border border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:border-indigo-100 transition-all duration-300 cursor-pointer group flex flex-col relative"
                  >
                    {/* Badges */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between z-10 pointer-events-none">
                      {product.stock <= product.reorderLevel && (
                        <span className="bg-rose-500 text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-sm">Low Stock</span>
                      )}
                      {product.aiScore > 90 && (
                        <span className="bg-amber-400 text-amber-950 text-[8px] font-bold px-1 py-0.5 rounded shadow-sm flex items-center gap-0.5"><Sparkles className="w-2 h-2" /> Hot</span>
                      )}
                    </div>

                    {/* Info Button (Opens Drawer) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelectProduct(product); }}
                      className="absolute top-1.5 right-1.5 z-20 w-5 h-5 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Info className="w-3 h-3" />
                    </button>

                    <div className="h-24 bg-slate-50 relative p-2 flex items-center justify-center rounded-t-xl overflow-hidden">
                      <img src={product.image || "https://placehold.co/400x400/f8fafc/94a3b8?text=No+Image"} onError={(e) => { e.currentTarget.src = "https://placehold.co/400x400/f8fafc/94a3b8?text=No+Image"; }} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5 flex flex-col flex-1 justify-between border-t border-slate-100">
                      <div>
                        {product.brand && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">{product.brand}</span>}
                        <h4 className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</h4>
                      </div>
                      <div className="mt-1.5 flex items-end justify-between">
                        <div>
                          {(() => {
                            const eff = getItemEffectivePrice(product);
                            if (eff.isWholesale) {
                              return (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 line-through leading-none">{formatCurrency(eff.basePrice)}</span>
                                  <span className={`font-bold text-[13px] leading-none mt-0.5 flex flex-wrap items-center gap-1 ${pricingMode === 'B2B' ? 'text-purple-700' : 'text-emerald-600'}`}>
                                    {formatCurrency(eff.unitPrice)}
                                    <span className={`text-[8px] px-1 py-0.2 rounded font-semibold uppercase ${pricingMode === 'B2B' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {eff.tierName}
                                    </span>
                                  </span>
                                </div>
                              );
                            }
                            if (product.discount > 0) {
                              return (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 line-through leading-none">{formatCurrency(product.mrp)}</span>
                                  <span className="font-bold text-[13px] text-slate-900 leading-none mt-0.5">{formatCurrency(eff.unitPrice)}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex flex-col">
                                <span className="font-bold text-[13px] text-slate-900 leading-none">{formatCurrency(eff.unitPrice)}</span>
                                {pricingMode === 'Retail' && (
                                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">Wholesale: {formatCurrency(eff.wholesalePrice)}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="w-6 h-6 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-bold">Product</th>
                      <th className="px-6 py-4 font-bold">SKU</th>
                      <th className="px-6 py-4 font-bold">Price</th>
                      <th className="px-6 py-4 font-bold">Stock</th>
                      <th className="px-6 py-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group relative"
                      >
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                          <img src={p.image || "https://placehold.co/40x40/f8fafc/94a3b8?text=Img"} onError={(e) => { e.currentTarget.src = "https://placehold.co/40x40/f8fafc/94a3b8?text=Img"; }} alt={p.name} className="w-10 h-10 rounded border border-slate-100 object-cover" />
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.brand}</span>
                          </div>

                          {/* Tooltip */}
                          <div className="absolute left-64 top-1/2 -translate-y-1/2 ml-4 w-56 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                            <p className="font-bold mb-1">{p.name}</p>
                            <p className="text-slate-400 mb-1">Barcode: <span className="font-mono text-slate-300">{p.barcode}</span></p>
                            <p className="text-slate-400">{p.longDesc.substring(0, 60)}...</p>
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-500">{p.sku}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {(() => {
                            const eff = getItemEffectivePrice(p);
                            if (eff.isWholesale) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className={pricingMode === 'B2B' ? 'text-purple-700' : 'text-emerald-700'}>{formatCurrency(eff.unitPrice)}</span>
                                  <span className="text-xs text-slate-400 line-through font-normal">{formatCurrency(eff.basePrice)}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${pricingMode === 'B2B' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>{eff.tierName}</span>
                                </div>
                              );
                            }
                            if (p.discount > 0) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span>{formatCurrency(eff.unitPrice)}</span>
                                  <span className="text-xs text-rose-500 line-through font-normal">{formatCurrency(p.mrp)}</span>
                                </div>
                              );
                            }
                            return <span>{formatCurrency(eff.unitPrice)}</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <span className={p.stock <= p.reorderLevel ? "text-rose-500 font-bold" : ""}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-slate-400">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSelectProduct(p); }}
                              className="hover:text-slate-900 p-1 bg-white border border-slate-200 rounded-md shadow-sm"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                              className="hover:text-white hover:bg-slate-900 p-1 bg-slate-100 border border-slate-200 rounded-md shadow-sm text-slate-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* POS Pagination Controls */}
            {filteredProducts.length > posPageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">
                  Showing <span className="text-slate-900 font-bold">{(posPage - 1) * posPageSize + 1}</span> to{" "}
                  <span className="text-slate-900 font-bold">{Math.min(posPage * posPageSize, filteredProducts.length)}</span> of{" "}
                  <span className="text-slate-900 font-bold">{filteredProducts.length}</span> products
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPosPage(p => Math.max(1, p - 1))}
                    disabled={posPage === 1}
                    className="px-3 py-1.5 rounded-xl border bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-800 px-2">
                    Page {posPage} of {totalPosPages}
                  </span>
                  <button
                    onClick={() => setPosPage(p => Math.min(totalPosPages, p + 1))}
                    disabled={posPage >= totalPosPages}
                    className="px-3 py-1.5 rounded-xl border bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}


            {/* PRODUCT DETAILS SLIDEOVER */}
            <AnimatePresence>
              {selectedProduct && (
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 bg-white shadow-2xl border-l border-slate-200 z-30 flex flex-col"
                >
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Info className="w-5 h-5" />
                      <h3 className="font-bold">{isEditingProduct ? "Edit Product Details" : "Product Specifications"}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingProduct(!isEditingProduct)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm transition-all cursor-pointer"
                      >
                        {isEditingProduct ? "Cancel" : "Edit Product"}
                      </button>
                      <button onClick={() => { setSelectedProduct(null); setIsEditingProduct(false); }} className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingProduct ? (
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brand</label>
                          <input
                            type="text"
                            value={editForm.brand}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, brand: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SKU Code</label>
                          <input
                            type="text"
                            value={editForm.sku}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, sku: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barcode</label>
                          <input
                            type="text"
                            value={editForm.barcode}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, barcode: e.target.value }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selling Price ({currency.symbol})</label>
                          <input
                            type="number"
                            value={editForm.sellingPrice || ""}
                            placeholder="0.00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, sellingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">MRP ({currency.symbol})</label>
                          <input
                            type="number"
                            value={editForm.mrp || ""}
                            placeholder="0.00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, mrp: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Price ({currency.symbol})</label>
                          <input
                            type="number"
                            value={editForm.purchasePrice || ""}
                            placeholder="0.00"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, purchasePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Stock</label>
                          <input
                            type="number"
                            value={editForm.stock || ""}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setEditForm((prev: any) => ({ ...prev, stock: e.target.value === "" ? "" : parseInt(e.target.value) || 0 }))}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Percent (%)</label>
                          <input
                            type="number"
                            value={selectedProduct.tax_percent || 18}
                            disabled
                            className="w-full border border-slate-100 rounded-xl px-3 py-2 text-sm bg-slate-50 text-slate-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                        <textarea
                          rows={3}
                          value={editForm.longDesc}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, longDesc: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-medium"
                        />
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button
                          onClick={async () => {
                            try {
                              if (selectedProduct.isProvisional) {
                                // If it is provisional, we can update it locally in the cart,
                                // and once the order is checked out it will be created in the DB!
                                setCart(prev => prev.map(item => {
                                  if (item.id === selectedProduct.id) {
                                    return {
                                      ...item,
                                      name: editForm.name,
                                      brand: editForm.brand,
                                      sku: editForm.sku,
                                      barcode: editForm.barcode,
                                      sellingPrice: editForm.sellingPrice,
                                      mrp: editForm.mrp,
                                      purchasePrice: editForm.purchasePrice,
                                      stock: editForm.stock,
                                      longDesc: editForm.longDesc,
                                      shortDesc: editForm.name,
                                    };
                                  }
                                  return item;
                                }));
                                toast.success("Provisional product details updated in current transaction cart!");
                              } else {
                                // For database products, call update API
                                await posApi.updateProduct(selectedProduct.id, {
                                  name: editForm.name,
                                  brand_name: editForm.brand,
                                  sku: editForm.sku,
                                  barcode: editForm.barcode,
                                  selling_price: editForm.sellingPrice,
                                  mrp: editForm.mrp,
                                  purchase_price: editForm.purchasePrice,
                                  initial_stock: editForm.stock,
                                  description: editForm.longDesc,
                                });

                                // Update local lists
                                setProducts(prev => prev.map(p => {
                                  if (p.id === selectedProduct.id) {
                                    return {
                                      ...p,
                                      name: editForm.name,
                                      brand: editForm.brand,
                                      sku: editForm.sku,
                                      barcode: editForm.barcode,
                                      sellingPrice: editForm.sellingPrice,
                                      mrp: editForm.mrp,
                                      purchasePrice: editForm.purchasePrice,
                                      stock: editForm.stock,
                                      longDesc: editForm.longDesc,
                                    };
                                  }
                                  return p;
                                }));

                                // Update cart
                                setCart(prev => prev.map(item => {
                                  if (item.id === selectedProduct.id) {
                                    return {
                                      ...item,
                                      name: editForm.name,
                                      brand: editForm.brand,
                                      sku: editForm.sku,
                                      barcode: editForm.barcode,
                                      sellingPrice: editForm.sellingPrice,
                                      mrp: editForm.mrp,
                                      purchasePrice: editForm.purchasePrice,
                                      stock: editForm.stock,
                                      longDesc: editForm.longDesc,
                                    };
                                  }
                                  return item;
                                }));
                                toast.success("Product updated successfully in local database and catalog!");
                              }
                              setSelectedProduct(null);
                              setIsEditingProduct(false);
                            } catch (e: any) {
                              toast.error("Failed to update product details: " + (e.detail || e.message));
                            }
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-center cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditingProduct(false)}
                          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                        <div className="flex gap-6 items-start">
                          <div className="w-48 h-48 bg-slate-50 rounded-xl border border-slate-200 p-4 shrink-0 flex items-center justify-center">
                            <img src={selectedProduct.image || "https://placehold.co/400x400/f8fafc/94a3b8?text=No+Image"} onError={(e) => { e.currentTarget.src = "https://placehold.co/400x400/f8fafc/94a3b8?text=No+Image"; }} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedProduct.brand}</span>
                              <span className="text-xs font-semibold text-slate-400">{selectedProduct.sku}</span>
                            </div>
                            <h2 className="text-2xl font-semibold text-slate-900 leading-tight mb-2">{selectedProduct.name}</h2>
                            <p className="text-sm text-slate-600 mb-4">{selectedProduct.longDesc}</p>

                            <div className="flex flex-wrap items-end gap-4">
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selling Price</p>
                                <div className="text-3xl font-semibold text-emerald-600">{formatCurrency(selectedProduct.sellingPrice)}</div>
                              </div>
                              <div className="pb-1 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="font-semibold text-slate-500">
                                    Base (Excl. GST): <strong className="text-slate-800">{formatCurrency(selectedProduct.is_tax_inclusive !== false && Number(selectedProduct.tax_percent || 18) > 0 ? selectedProduct.sellingPrice / (1 + Number(selectedProduct.tax_percent || 18) / 100) : selectedProduct.sellingPrice)}</strong>
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${selectedProduct.is_tax_inclusive !== false ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                                    {selectedProduct.is_tax_inclusive !== false ? "✅ Incl. GST" : "🔶 Excl. GST"} {selectedProduct.tax_percent || 18}%
                                  </span>
                                </div>
                                {selectedProduct.discount > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400 line-through">{formatCurrency(selectedProduct.mrp)}</span>
                                    <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                      -{selectedProduct.margin} Margin
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1"><Boxes className="w-3.5 h-3.5" /> Inventory & Storage</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-slate-500">Available Stock:</span> <span className="font-bold text-slate-900">{selectedProduct.stock} Units</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Warehouse:</span> <span className="font-semibold text-slate-700">{selectedProduct.warehouse || "Main Storefront"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Location:</span> <span className="font-semibold text-slate-700">{selectedProduct.rack || "Default"} / {selectedProduct.shelf || "Default"}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Barcode:</span> <span className="font-mono text-xs bg-white px-1 border rounded">{selectedProduct.barcode}</span></div>
                            </div>
                          </div>

                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Product Insights</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-amber-700/70">Demand Forecast:</span> <span className="font-bold text-amber-700">{selectedProduct.demandScore || 85}/100</span></div>
                              <div className="flex justify-between"><span className="text-amber-700/70">AI Recommendation:</span> <span className="font-bold text-amber-900">{selectedProduct.aiScore || 90}/100</span></div>
                              <div className="flex justify-between"><span className="text-amber-700/70">Trend Status:</span> <span className="font-semibold text-emerald-600">{selectedProduct.isFastMoving ? 'Fast Moving 🔥' : 'Stable'}</span></div>
                              <div className="flex justify-between"><span className="text-amber-700/70">Supplier:</span> <span className="font-semibold text-amber-900">{selectedProduct.supplier || "Direct"}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
                        <button onClick={() => addToCart(selectedProduct)} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer">
                          <Plus className="w-5 h-5" /> Add to Checkout
                        </button>
                        <button onClick={() => setSelectedProduct(null)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer">
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>

              )}
            </AnimatePresence>
          </div>
        </div>


          {/* COL 3: Billing Workspace (30%) */}

          <div className="w-[30%] min-w-[350px] max-w-[480px] shrink-0 bg-white/95 backdrop-blur-3xl flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.05)] border-l border-slate-200/50 z-20">

            {/* Customer Profile */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-full bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-2 flex items-center justify-between transition-all shadow-2xs hover:shadow-xs group mb-1.5 text-left"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-xs flex items-center justify-center border border-indigo-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    {selectedCustomer?.name && selectedCustomer.name !== "Walk-in Customer" ? selectedCustomer.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">{selectedCustomer.name}</p>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100 uppercase">
                        {(selectedCustomer as any).customer_type || selectedCustomer.tier || 'Retail'}
                      </span>
                    </div>
                    {selectedCustomer.id && selectedCustomer.id !== 'walk-in' && selectedCustomer.id !== 'WALK-IN' ? (
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          💰 {formatCurrency(customerWalletBalance)}
                        </span>
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          ⭐ {selectedCustomer.points || (selectedCustomer as any).loyalty_points || 0} Pts
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                        Guest • Click to select customer
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-1" />
              </button>

              {/* Customer Pending Dues Banner */}
              {customerSummary && customerSummary.total_pending_due > 0 && (
                <div className="mb-1.5 p-1.5 bg-amber-50/90 border border-amber-200 rounded-lg text-[11px] flex flex-col gap-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900 flex items-center gap-1">
                      ⚠️ Prev Due:
                    </span>
                    <span className="font-extrabold text-amber-700">{currency.symbol}{customerSummary.total_pending_due?.toFixed(2)}</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer pt-0.5 border-t border-amber-200/60 font-medium text-[10px]">
                    <input
                      type="checkbox"
                      checked={includePreviousDueInBill}
                      onChange={(e) => setIncludePreviousDueInBill(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span>Add previous due to current bill</span>
                  </label>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                  className="flex-1 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg border border-amber-200 transition-colors flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <Clock className="w-3 h-3" /> Hold Bill
                </button>
                <button
                  onClick={openHeldBillsModal}
                  className="flex-1 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <ListIcon className="w-3 h-3" /> Resume {heldBillsCount > 0 && `(${heldBillsCount})`}
                </button>
              </div>

              {/* Tax Mode Bulk Quick Toggle */}
              {cart.length > 0 && (
                <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200/60 text-[10px]">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">GST Pricing:</span>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCart(prev => prev.map(it => ({ ...it, is_tax_inclusive: true })))}
                      className={`px-1.5 py-0.2 rounded font-extrabold transition-all cursor-pointer text-[9px] ${
                        cart.every(it => it.is_tax_inclusive !== false)
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All Incl. GST
                    </button>
                    <button
                      type="button"
                      onClick={() => setCart(prev => prev.map(it => ({ ...it, is_tax_inclusive: false })))}
                      className={`px-1.5 py-0.2 rounded font-extrabold transition-all cursor-pointer text-[9px] ${
                        cart.every(it => it.is_tax_inclusive === false)
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All Excl. GST
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* High-Density Cart */}
            <div className="flex-1 overflow-y-auto px-2 py-0.5 bg-white relative">
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-2xs">
                    <ShoppingCart className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-xs text-slate-500">Cart is empty.<br />Scan barcode to add.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map((item, idx) => {
                    const { unitPrice, isWholesale } = getItemEffectivePrice(item);
                    const itemTaxPercent = Number(item.tax_percent ?? item.tax ?? 18);
                    const isIncl = item.is_tax_inclusive !== false;
                    const baseUnitPrice = isIncl && itemTaxPercent > 0 ? unitPrice / (1 + itemTaxPercent / 100) : unitPrice;
                    const unitGst = isIncl && itemTaxPercent > 0 ? unitPrice - baseUnitPrice : baseUnitPrice * (itemTaxPercent / 100);
                    const sellingPriceIncl = isIncl ? unitPrice : baseUnitPrice + unitGst;
                    const mrpVal = Number(item.mrp) || 0;
                    const isMrpExceeded = mrpVal > 0 && sellingPriceIncl > mrpVal;

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => openCartItemEditModal(item)}
                        className={`py-1.5 px-1 hover:bg-slate-50/90 transition-colors relative group cursor-pointer rounded-lg ${isMrpExceeded ? "bg-red-50/40" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={item.image || "https://placehold.co/100x100/f8fafc/94a3b8?text=Img"}
                            onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/f8fafc/94a3b8?text=Img"; }}
                            alt={item.name}
                            className="w-7 h-7 rounded border border-slate-100 object-contain p-0.5 shrink-0 bg-slate-50"
                          />
                          <div className="flex-1 min-w-0 space-y-0.5">
                            {/* Line 1: Name & Price */}
                            <div className="flex items-center justify-between gap-1.5">
                              <h5 className="text-xs font-bold text-slate-900 leading-none truncate" title={item.sku ? `${item.name} (SKU: ${item.sku})` : item.name}>
                                {item.name}
                              </h5>
                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-xs text-slate-900 block leading-none">
                                  {formatCurrency((isIncl ? unitPrice : sellingPriceIncl) * item.qty - (item.discount || 0) * item.qty)}
                                </span>
                                {isWholesale && (
                                  <span className={`text-[8px] font-bold block leading-none mt-0.5 ${pricingMode === 'B2B' ? 'text-purple-600' : 'text-emerald-600'}`}>
                                    {getItemEffectivePrice(item).tierName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Line 2: All badges + Base/GST + Stepper in ONE single compact line */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 text-[9px] flex-wrap min-w-0">
                                {mrpVal > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openCartItemEditModal(item); }}
                                    title="Click to edit MRP or Selling Price"
                                    className="px-1 py-0.2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                                  >
                                    <span>MRP: {formatCurrency(mrpVal)}</span>
                                    <Pencil className="w-2 h-2 opacity-70" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); openCartItemEditModal(item); }}
                                    title="Click to set MRP"
                                    className="px-1 py-0.2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 font-bold rounded flex items-center gap-0.5 transition-colors cursor-pointer"
                                  >
                                    <span>+ MRP</span>
                                  </button>
                                )}

                                {/* Interactive GST toggle badge */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCart(prev => prev.map(it => it.id === item.id ? { ...it, is_tax_inclusive: !isIncl } : it));
                                  }}
                                  title={isIncl ? "Tax Inclusive: Click to switch to Tax Exclusive" : "Tax Exclusive: Click to switch to Tax Inclusive"}
                                  className={`px-1 py-0.2 rounded font-extrabold uppercase transition-all hover:scale-105 cursor-pointer border ${
                                    isIncl
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                      : "bg-blue-50 text-blue-700 border-blue-300"
                                  }`}
                                >
                                  {isIncl ? "Incl." : "Excl."} {itemTaxPercent}%
                                </button>

                                <span className="text-slate-400 font-medium whitespace-nowrap">
                                  Base: {formatCurrency(baseUnitPrice)} • GST: {formatCurrency(unitGst)}
                                </span>

                                {item.hsn_code && (
                                  <span className="px-1 py-0.2 bg-slate-100 text-slate-500 font-mono rounded">
                                    {item.hsn_code}
                                  </span>
                                )}

                                {item.secondary_uom && item.conversion_factor > 1 ? (
                                  <div className="flex items-center gap-1 bg-indigo-50/80 border border-indigo-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); switchCartItemUom(item.id, item.uom); }}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                                        (item.selected_uom || item.uom) === item.uom
                                          ? "bg-indigo-600 text-white shadow-2xs"
                                          : "text-indigo-700 hover:bg-indigo-100"
                                      }`}
                                      title={`Full Unit: ${item.uom} (${formatCurrency(item.base_selling_price || item.sellingPrice)})`}
                                    >
                                      {item.uom} ({formatCurrency(item.base_selling_price || item.sellingPrice)})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); switchCartItemUom(item.id, item.secondary_uom); }}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all cursor-pointer ${
                                        item.selected_uom === item.secondary_uom
                                          ? "bg-emerald-600 text-white shadow-2xs"
                                          : "text-emerald-700 hover:bg-emerald-100"
                                      }`}
                                      title={`Single / Loose Unit: ${item.secondary_uom} (${formatCurrency((item.base_selling_price || item.sellingPrice) / item.conversion_factor)})`}
                                    >
                                      {item.secondary_uom} ({formatCurrency((item.base_selling_price || item.sellingPrice) / item.conversion_factor)})
                                    </button>
                                  </div>
                                ) : item.uom ? (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">
                                    {item.selected_uom || item.uom}
                                  </span>
                                ) : null}

                                {/* Batch Selector Pill Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBatchModalCartItem({
                                      id: item.id,
                                      productId: item.id,
                                      productName: item.name,
                                      currentBatch: item.batch_number,
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                    item.batch_number
                                      ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs"
                                      : "bg-slate-100 text-slate-500 border-dashed border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                                  }`}
                                  title="Select or Create Product Batch (FEFO / Traceability)"
                                >
                                  <Boxes className="w-2.5 h-2.5" />
                                  {item.batch_number ? (
                                    <span>
                                      #{item.batch_number}
                                      {item.expiry_date ? ` (Exp: ${String(item.expiry_date).substring(0, 7)})` : ""}
                                    </span>
                                  ) : (
                                    <span>+ Batch</span>
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Edit Price / MRP button */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openCartItemEditModal(item); }}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Edit Rate, MRP & Discount"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>

                                {/* Quantity Stepper */}
                                <div className="flex items-center bg-slate-100 rounded border border-slate-200/80 p-0.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateQty(item.id, -1); }}
                                    className="w-4 h-4 flex items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <span className="w-5 text-center text-xs font-bold text-slate-900 leading-none">{item.qty}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1); }}
                                    className="w-4 h-4 flex items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                                    title="Increase quantity"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <button
                                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                  className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* MRP Warning Alert Banner */}
                        {isMrpExceeded && (
                          <div className="flex items-center gap-1 bg-red-100 text-red-800 border border-red-300 rounded px-1.5 py-0.5 text-[9px] font-bold mt-1">
                            <span className="animate-pulse">⚠️</span>
                            <span>MRP Alert: Price {currency.symbol}{sellingPriceIncl.toFixed(2)} &gt; MRP {currency.symbol}{mrpVal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checkout Summary */}
            <div className="bg-white border-t border-slate-200/80 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.05)] flex flex-col shrink-0 z-20">

              {/* DYNAMIC CART DISCOUNT BAR */}
              <div className="px-2.5 py-1.5 border-b border-slate-200/70 bg-slate-50/90 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-600" /> Dynamic Cart Discount
                  </span>
                  <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200/80 text-[9px] font-bold shadow-2xs">
                    <button
                      onClick={() => setDiscountMode("before_tax")}
                      className={`px-1.5 py-0.2 rounded transition-all ${discountMode === "before_tax" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      Before Tax
                    </button>
                    <button
                      onClick={() => setDiscountMode("after_tax")}
                      className={`px-1.5 py-0.2 rounded transition-all ${discountMode === "after_tax" ? "bg-purple-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      After Tax
                    </button>
                  </div>
                </div>

                {/* Quick Presets & Custom Input */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1">
                    {[0, 5, 10, 15, 20, 25].map(val => (
                      <button
                        key={val}
                        onClick={() => { setCartDiscountType("percent"); setCartDiscountValue(val); }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all shrink-0 ${cartDiscountType === "percent" && cartDiscountValue === val ? (discountMode === "before_tax" ? "bg-indigo-600 text-white shadow-xs" : "bg-purple-600 text-white shadow-xs") : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"}`}
                      >
                        {val === 0 ? "Off" : `${val}%`}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-white border border-slate-200/80 rounded p-0.5 shrink-0 w-24 shadow-2xs">
                    <input
                      type="number"
                      min="0"
                      placeholder="Custom"
                      value={cartDiscountValue || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCartDiscountValue(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                      className="w-12 text-center text-[10px] font-bold text-slate-800 outline-none"
                    />
                    <button
                      onClick={() => setCartDiscountType(cartDiscountType === "percent" ? "amount" : "percent")}
                      className="px-1 py-0.2 rounded bg-slate-100 text-[9px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      {cartDiscountType === "percent" ? "%" : "₹"}
                    </button>
                  </div>
                </div>
              </div>

              {/* DYNAMIC ADDITIONAL CHARGES BAR (Freight, Packing, Transport, etc.) */}
              <div className="px-2.5 py-1.5 border-b border-slate-200/70 bg-emerald-50/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600" /> Additional Charges (Freight / Transport)
                  </span>
                  <button
                    onClick={handleAddPosChargeRow}
                    className="text-[9px] font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 hover:bg-emerald-100 px-1.5 py-0.2 rounded transition-all flex items-center gap-0.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" /> Add Charge
                  </button>
                </div>

                {posCustomCharges.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {posCustomCharges.map(ch => (
                      <div key={ch.id} className="flex items-center gap-1 bg-white border border-emerald-200/70 rounded p-1 shadow-2xs text-[10px]">
                        <input
                          type="text"
                          value={ch.name}
                          onChange={e => handleUpdatePosCharge(ch.id, "name", e.target.value)}
                          placeholder="Charge name"
                          className="flex-1 min-w-0 text-[10px] font-semibold text-slate-800 outline-none px-1"
                        />
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-1 shrink-0">
                          <span className="text-[9px] text-slate-400 font-bold">{currency.symbol}</span>
                          <input
                            type="number"
                            min="0"
                            value={ch.amount || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={e => handleUpdatePosCharge(ch.id, "amount", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="0"
                            className="w-12 text-right text-[10px] font-bold text-slate-900 outline-none py-0.2"
                          />
                        </div>
                        {/* GST % Selector for charge */}
                        <select
                          value={ch.tax_rate || 0}
                          onChange={e => handleUpdatePosCharge(ch.id, "tax_rate", e.target.value)}
                          title="GST on charge"
                          className="shrink-0 bg-slate-50 border border-slate-200 rounded px-0.5 py-0.2 text-[9px] font-bold text-slate-700 outline-none"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                        {Number(ch.tax_rate) > 0 && Number(ch.amount) > 0 && (
                          <span className="shrink-0 text-[9px] font-bold text-emerald-600 whitespace-nowrap">
                            +{currency.symbol}{(Number(ch.amount) * Number(ch.tax_rate) / 100).toFixed(2)}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeletePosCharge(ch.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Box */}
              <div className="px-3 py-1.5 space-y-1 border-b border-slate-100 border-dashed bg-slate-50/40 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                </div>

                {itemDiscounts > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span className="font-bold">Item Savings</span>
                    <span className="font-semibold">-{formatCurrency(itemDiscounts)}</span>
                  </div>
                )}

                {beforeTaxDiscount > 0 && (
                  <div className="flex justify-between text-indigo-600 font-bold">
                    <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Before-Tax Discount ({cartDiscountType === "percent" ? `${cartDiscountValue}%` : "Flat"})</span>
                    <span className="font-semibold">-{formatCurrency(beforeTaxDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Taxable Amount</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(taxableAmount)}</span>
                </div>

                {/* GST Breakdown (CGST+SGST vs IGST toggle) */}
                <div className="pt-1 border-t border-slate-200/60 space-y-0.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      Total Tax / GST
                    </span>
                    <div className="flex items-center bg-slate-100 rounded p-0.5 text-[8px] font-bold">
                      <button
                        onClick={() => setPosGstType("cgst_sgst")}
                        className={`px-1 py-0.2 rounded transition-all ${posGstType === "cgst_sgst" ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-500"}`}
                      >
                        CGST+SGST
                      </button>
                      <button
                        onClick={() => setPosGstType("igst")}
                        className={`px-1 py-0.2 rounded transition-all ${posGstType === "igst" ? "bg-white text-indigo-700 shadow-2xs font-extrabold" : "text-slate-500"}`}
                      >
                        IGST
                      </button>
                    </div>
                  </div>

                  {posGstType === "cgst_sgst" ? (
                    <>
                      <div className="flex justify-between text-slate-600 pl-1.5">
                        <span>• CGST</span>
                        <span className="font-semibold">+{formatCurrency((tax + posChargesGstTotal) / 2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 pl-1.5">
                        <span>• SGST</span>
                        <span className="font-semibold">+{formatCurrency((tax + posChargesGstTotal) / 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 pl-1.5">
                      <span>• IGST</span>
                      <span className="font-semibold">+{formatCurrency(tax + posChargesGstTotal)}</span>
                    </div>
                  )}
                </div>

                {afterTaxDiscount > 0 && (
                  <div className="flex justify-between text-purple-600 font-bold pt-0.5 border-t border-slate-200/60">
                    <span className="flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> After-Tax Discount ({cartDiscountType === "percent" ? `${cartDiscountValue}%` : "Flat"})</span>
                    <span className="font-semibold">-{formatCurrency(afterTaxDiscount)}</span>
                  </div>
                )}
                
                {includePreviousDueInBill && customerSummary?.total_pending_due > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold pt-0.5 border-t border-amber-200/60">
                    <span>⚠️ Previous Due</span>
                    <span className="font-bold">+{formatCurrency(customerSummary.total_pending_due)}</span>
                  </div>
                )}
              </div>

              {/* Massive Grand Total */}
              <div className="px-5 py-4 flex justify-between items-end bg-white">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Grand Total</span>
                <span className="text-[2.5rem] font-semibold text-slate-900 tracking-tighter leading-none">{formatCurrency(total)}</span>
              </div>

              {/* Payment Methods moved to full-width footer */}

            </div>
          </div>
        </div>
      </div>
      ) : (



        <>
          {currentView === 'barcode' && <BarcodeScannerView addToCart={addToCart} products={products} />}
          {currentView === 'search' && <QuickSearchView />}
          {currentView === 'delivery' && <DeliveryView />}
          {currentView === 'exchange' && <ExchangeView currentSessionId={currentSession?.id} products={products} initialSearch={searchParams.get('exchangeId') || undefined} />}
          {currentView === 'refund' && <RefundView currentSessionId={currentSession?.id} initialSearch={searchParams.get('refundId') || undefined} />}
          {currentView === 'wallet' && <WalletView />}
          {currentView === 'price_check' && <PriceCheckView />}
          {currentView === 'favorites' && <FavoritesView products={products} addToCart={addToCart} />}
          {currentView === 'recent' && (
            <RecentBillsView
              onRefund={(id) => navigate(`/owner/pos?tab=terminal&view=refund&refundId=${id}`)}
              onExchange={(id) => navigate(`/owner/pos?tab=terminal&view=exchange&exchangeId=${id}`)}
            />
          )}
          {currentView === 'ai_suggest' && <AISuggestionsView />}
        </>
      )}

      {/* FULL WIDTH PAYMENT BAR */}
      {currentView === 'billing' && (
        <div className="bg-white border-t border-slate-200 px-4 py-2.5 shrink-0 relative z-30 shadow-[0_-4px_15px_-3px_rgb(0_0_0_/_0.05)] w-full flex items-center justify-between gap-4">
          {/* Centered Payment Tender Buttons */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
              {/* Cash */}
              <button
                onClick={() => setPaymentMethod('Cash')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Cash'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                    : 'border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Cash' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  <Banknote className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
              </button>

              {/* Card (PineLabs EDC) */}
              <button
                onClick={() => {
                  setPaymentMethod('Card');
                  setIsPineLabsModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Card'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                    : 'border-blue-200/80 bg-blue-50/60 hover:bg-blue-100/70 text-blue-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Card' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold uppercase tracking-wider block">Card / PineLabs</span>
                  <span className="text-[9px] opacity-75 font-normal block leading-none">EDC Swiper & NFC</span>
                </div>
              </button>

              {/* Razorpay UPI / QR */}
              <button
                onClick={() => {
                  setPaymentMethod('UPI');
                  setIsRazorpayModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'UPI'
                    ? 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105'
                    : 'border-purple-200/80 bg-purple-50/60 hover:bg-purple-100/70 text-purple-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'UPI' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'}`}>
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold uppercase tracking-wider block">Razorpay UPI</span>
                  <span className="text-[9px] opacity-75 font-normal block leading-none">Smart QR / SMS</span>
                </div>
              </button>

              {/* Wallet */}
              <button
                onClick={() => setPaymentMethod('Wallet')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Wallet'
                    ? 'border-amber-600 bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-105'
                    : 'border-amber-200/80 bg-amber-50/60 hover:bg-amber-100/70 text-amber-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Wallet' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Wallet</span>
              </button>

              {/* Partial Pay */}
              <button
                onClick={() => {
                  setPaymentMethod('Partial Pay');
                  setPartialPaidAmount(total > 0 ? (total * 0.5).toFixed(2) : '');
                  setPartialPaymentModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Partial Pay'
                    ? 'border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105'
                    : 'border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/70 text-rose-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Partial Pay' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                  <Percent className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Partial Pay</span>
              </button>

              {/* Pay Later */}
              <button
                onClick={() => setPaymentMethod('Pay Later')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Pay Later'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                    : 'border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Pay Later' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Pay Later</span>
              </button>

              {/* Split Payment */}
              <button
                onClick={() => setPaymentMethod('Split')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap group hover:-translate-y-0.5 ${
                  paymentMethod === 'Split'
                    ? 'border-orange-600 bg-orange-600 text-white shadow-md shadow-orange-600/30 scale-105'
                    : 'border-orange-200/80 bg-orange-50/60 hover:bg-orange-100/70 text-orange-800 shadow-xs'
                }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${paymentMethod === 'Split' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                  <Combine className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Split Payment</span>
              </button>
            </div>
          </div>

          {/* Amount Due & Complete Payment */}
          <div className="shrink-0 flex items-center gap-3.5 border-l border-slate-200 pl-4">
            <div className="text-right flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Amount Due</span>
              <span className="text-xl font-extrabold text-slate-900 leading-none">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || !paymentMethod || isCheckingOut}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 disabled:text-white/90 disabled:cursor-not-allowed text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 group transform active:scale-[0.98] cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" /> Processing...
                </>
              ) : (
                <>
                  Complete Payment <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. BOTTOM BAR: AI, Shift, Devices */}
      <div className="h-10 bg-white border-t border-slate-200/60 flex items-center justify-between px-4 shrink-0 text-slate-500 text-[11px] font-bold tracking-wide z-40 relative shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">

        {/* AI Recommendations */}
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/50">
          <Sparkles className="w-3 h-3" />
          <span>AI Insight: Recommend <b>Warranty Plan</b> based on cart value.</span>
        </div>

        {/* Shift Info */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
          <span className="flex items-center gap-1.5 text-slate-700"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> {posSession.cashier}</span>
          <span className="flex items-center gap-1.5 text-slate-700"><Clock className="w-3.5 h-3.5 text-slate-400" /> {posSession.shift}</span>
        </div>

        {/* Device Status */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <ScanBarcode className="w-3.5 h-3.5 text-slate-400" />
            Scanner
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Printer
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
            <Database className="w-3.5 h-3.5 text-slate-400" />
            Drawer
          </div>
        </div>
      </div>

      {/* ── EDIT CART ITEM (MRP, RATE, DISCOUNT & TAX) MODAL ── */}
      <AnimatePresence>
        {cartEditItem && (() => {
          const rawPrice = parseFloat(editSellingPrice) || 0;
          const rawMrp = parseFloat(editMrp) || 0;
          const taxPercent = Number(cartEditItem.tax_percent ?? cartEditItem.tax ?? 18);

          // Base & GST calculation based on tax inclusive toggle
          const baseUnitPrice = editTaxInclusive && taxPercent > 0
            ? rawPrice / (1 + taxPercent / 100)
            : rawPrice;
          const unitGst = editTaxInclusive && taxPercent > 0
            ? rawPrice - baseUnitPrice
            : baseUnitPrice * (taxPercent / 100);
          const grossSellingPrice = editTaxInclusive ? rawPrice : baseUnitPrice + unitGst;

          // Discount calculation
          const discVal = parseFloat(editDiscountValue) || 0;
          const discAmt = editDiscountType === "percent"
            ? (grossSellingPrice * discVal) / 100
            : discVal;
          const netUnitPrice = Math.max(0, grossSellingPrice - discAmt);
          const lineTotal = netUnitPrice * (cartEditItem.qty || 1);
          const isMrpExceeded = rawMrp > 0 && grossSellingPrice > rawMrp;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCartEditItem(null)}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Edit Cart Item Pricing</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Update MRP, Selling Rate & Discounts on this line</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCartEditItem(null)}
                    className="p-1.5 bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
                  {/* Product Header Card */}
                  <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <img
                      src={cartEditItem.image || "https://placehold.co/100x100/f8fafc/94a3b8?text=Img"}
                      onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100/f8fafc/94a3b8?text=Img"; }}
                      alt={cartEditItem.name}
                      className="w-11 h-11 object-contain mix-blend-multiply bg-white rounded-xl border border-slate-200 shrink-0 p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-900 text-xs truncate" title={cartEditItem.name}>{cartEditItem.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-1 flex-wrap">
                        {cartEditItem.sku && <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">SKU: {cartEditItem.sku}</span>}
                        {cartEditItem.barcode && <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Barcode: {cartEditItem.barcode}</span>}
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">Qty: {cartEditItem.qty}</span>
                        <span className="text-slate-600 font-bold bg-slate-200/70 px-1.5 py-0.5 rounded">GST: {taxPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* MRP and Selling Price Fields in a 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* MRP Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                          MRP ({currency.symbol})
                        </label>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Printed MRP
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">{currency.symbol}</span>
                        <input
                          type="number"
                          step="any"
                          value={editMrp}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditMrp(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-sm font-extrabold text-slate-900 border-2 border-slate-200 rounded-xl py-2 pl-7 pr-3 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                        />
                      </div>
                    </div>

                    {/* Selling Price Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                          Selling Rate ({currency.symbol})
                        </label>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {editTaxInclusive ? "Incl. GST" : "Excl. GST"}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">{currency.symbol}</span>
                        <input
                          type="number"
                          step="any"
                          value={editSellingPrice}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditSellingPrice(e.target.value)}
                          placeholder="0.00"
                          autoFocus
                          className="w-full text-sm font-extrabold text-slate-900 border-2 border-slate-200 rounded-xl py-2 pl-7 pr-3 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GST Mode Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-700">Tax Type:</span>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditTaxInclusive(true)}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                          editTaxInclusive ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tax Inclusive (GST Included)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTaxInclusive(false)}
                        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                          !editTaxInclusive ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Tax Exclusive (GST Added)
                      </button>
                    </div>
                  </div>

                  {/* Discount Section */}
                  <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                        Line Discount
                      </label>
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setEditDiscountType("amount")}
                          className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                            editDiscountType === "amount" ? "bg-indigo-600 text-white" : "text-slate-600"
                          }`}
                        >
                          Flat ({currency.symbol})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDiscountType("percent")}
                          className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                            editDiscountType === "percent" ? "bg-indigo-600 text-white" : "text-slate-600"
                          }`}
                        >
                          Percent (%)
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">
                          {editDiscountType === "amount" ? currency.symbol : "%"}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={editDiscountValue}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setEditDiscountValue(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-sm font-extrabold text-slate-900 border-2 border-slate-200 rounded-xl py-2 pl-7 pr-3 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                        />
                      </div>
                      {/* Quick Percentage Chips */}
                      {editDiscountType === "percent" && (
                        <div className="flex items-center gap-1 shrink-0">
                          {[5, 10, 15, 20].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setEditDiscountValue(pct.toString())}
                              className={`px-2 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                                editDiscountValue === pct.toString()
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Calculation Breakdown Card */}
                  <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-100/90 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>Base Unit Price (Excl. Tax):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(baseUnitPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>GST Amount ({taxPercent}%):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(unitGst)}</span>
                    </div>
                    {discAmt > 0 && (
                      <div className="flex justify-between items-center text-rose-600 font-medium">
                        <span>Discount Applied:</span>
                        <span className="font-bold">-{formatCurrency(discAmt)}</span>
                      </div>
                    )}
                    <div className="border-t border-indigo-200/60 pt-1.5 flex justify-between items-center">
                      <span className="font-extrabold text-indigo-950">Effective Customer Rate / Unit:</span>
                      <span className="font-black text-sm text-indigo-600">{formatCurrency(netUnitPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="font-extrabold text-slate-700">Line Total ({cartEditItem.qty} {cartEditItem.qty === 1 ? 'item' : 'items'}):</span>
                      <span className="font-black text-sm text-slate-900">{formatCurrency(lineTotal)}</span>
                    </div>
                  </div>

                  {/* MRP Warning Alert */}
                  {isMrpExceeded && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-800 border border-red-200 rounded-xl p-2.5 text-xs font-bold">
                      <span className="text-base">⚠️</span>
                      <div>
                        <span>Selling Price ({currency.symbol}{grossSellingPrice.toFixed(2)}) exceeds MRP ({currency.symbol}{rawMrp.toFixed(2)})!</span>
                        <p className="text-[10px] font-normal text-red-600 mt-0.5">Under consumer regulations, products cannot be sold above printed MRP.</p>
                      </div>
                    </div>
                  )}

                  {/* Master Database Sync Option */}
                  <label className="flex items-start gap-2.5 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editUpdateMaster}
                      onChange={(e) => setEditUpdateMaster(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <div className="text-xs">
                      <span className="font-extrabold text-slate-900 block">Update in Product Master Database</span>
                      <span className="text-[11px] text-slate-500 font-normal">Save this new MRP ({currency.symbol}{rawMrp.toFixed(2)}) & Rate permanently so all future scans use it.</span>
                    </div>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCartEditItem(null)}
                    disabled={isSavingEditItem}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCartItemEdit}
                    disabled={isSavingEditItem}
                    className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEditItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Apply & Save</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* CASH TENDERED MODAL */}
      <AnimatePresence>
        {cashModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCashModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">Cash Payment</h3>
                <button onClick={() => setCashModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-800">Total Due</span>
                <span className="text-2xl font-semibold text-emerald-700">{formatCurrency(total)}</span>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cash Tendered ({currency.symbol})</label>
                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full text-2xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2 mb-2">
                  {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, 2000].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4).map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCashTendered(amt.toString())}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors border border-slate-200"
                    >
                      {amt === total ? 'Exact' : `₹${amt}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-900 rounded-xl flex flex-col justify-center shadow-inner">
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm font-bold text-slate-400">Change Due</span>
                  <span className={`text-3xl font-semibold ${Number(cashTendered) >= total ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(cashTendered) >= total ? formatCurrency(Number(cashTendered) - total) : '---'}
                  </span>
                </div>
                {Number(cashTendered) > total && selectedCustomer && selectedCustomer.id !== "WALK-IN" && (
                  <label className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={creditChangeToWallet} 
                      onChange={(e) => setCreditChangeToWallet(e.target.checked)} 
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600" 
                    />
                    <span className="text-sm font-semibold text-slate-300">
                      Add change ({formatCurrency(Number(cashTendered) - total)}) to Customer Wallet
                    </span>
                  </label>
                )}
              </div>

              <button
                onClick={handleCashConfirm}
                disabled={Number(cashTendered) < total}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 text-lg flex items-center justify-center gap-2"
              >
                <Banknote className="w-5 h-5" /> Complete Transaction
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SPLIT PAYMENT MODAL */}
      <AnimatePresence>
        {splitPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSplitPaymentModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">Split Payment</h3>
                <button onClick={() => setSplitPaymentModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="mb-4">
                <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grand Total</p>
                  <p className="text-3xl font-semibold text-slate-900">{formatCurrency(total)}</p>
                </div>

                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cash Amount</label>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                  <input
                    type="number"
                    value={splitCash}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSplitCash(val);
                      const parsedVal = parseFloat(val) || 0;
                      if (parsedVal <= total && parsedVal >= 0) {
                        setSplitOnline((total - parsedVal).toFixed(2));
                      }
                    }}
                    className="w-full text-lg font-semibold text-slate-900 border-2 border-slate-200 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>

                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Online / UPI Amount</label>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                  <input
                    type="number"
                    value={splitOnline}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSplitOnline(val);
                      const parsedVal = parseFloat(val) || 0;
                      if (parsedVal <= total && parsedVal >= 0) {
                        setSplitCash((total - parsedVal).toFixed(2));
                      }
                    }}
                    className="w-full text-lg font-semibold text-slate-900 border-2 border-slate-200 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button onClick={handleSplitConfirm} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-slate-900/20">
                Confirm Payment
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PARTIAL PAYMENT (KHATA / SPLIT DUE) MODAL */}
      <AnimatePresence>
        {partialPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPartialPaymentModalOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Partial Payment & Khata</h3>
                    <p className="text-xs text-slate-400">Collect upfront part, record remaining on credit</p>
                  </div>
                </div>
                <button onClick={() => setPartialPaymentModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              {/* Grand Total banner */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl mb-4 flex justify-between items-center shadow-inner">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Invoice Bill</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(total)}</p>
                </div>
                {selectedCustomer && selectedCustomer.id !== "WALK-IN" && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-indigo-300">Customer</p>
                    <p className="text-xs font-bold text-indigo-100 max-w-[130px] truncate">{selectedCustomer.name}</p>
                  </div>
                )}
              </div>

              {/* Payment Mode Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">1. Select Upfront Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Cash", "UPI", "Card"] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPartialPaymentMode(m)}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        partialPaymentMode === m
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {m === "Cash" && <Banknote className="w-3.5 h-3.5" />}
                      {m === "UPI" && <QrCode className="w-3.5 h-3.5" />}
                      {m === "Card" && <CreditCard className="w-3.5 h-3.5" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">2. Amount Paid Now ({currency.symbol})</label>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    {Number(partialPaidAmount) > 0 && Number(partialPaidAmount) < total ? `${((Number(partialPaidAmount) / total) * 100).toFixed(0)}% Upfront` : ""}
                  </span>
                </div>
                <div className="relative mb-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">{currency.symbol}</span>
                  <input
                    type="number"
                    value={partialPaidAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setPartialPaidAmount(e.target.value)}
                    className="w-full text-2xl font-semibold text-slate-900 border-2 border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-rose-500 transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                {/* Quick % Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "25%", val: Number((total * 0.25).toFixed(2)) },
                    { label: "50%", val: Number((total * 0.50).toFixed(2)) },
                    { label: "75%", val: Number((total * 0.75).toFixed(2)) },
                    { label: "Full (100%)", val: total }
                  ].map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setPartialPaidAmount(chip.val.toString())}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        Number(partialPaidAmount) === chip.val
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance Due Calculation Card */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl mb-4">
                <div className="flex justify-between items-center text-xs text-amber-900 font-bold mb-1">
                  <span>Upfront Collection ({partialPaymentMode}):</span>
                  <span className="text-emerald-700 font-semibold">+{formatCurrency(Number(partialPaidAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold text-amber-950 pt-1.5 border-t border-amber-200/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-600" /> Remaining Balance Due (Khata):
                  </span>
                  <span className="text-amber-700 text-base">
                    {formatCurrency(Math.max(0, total - (Number(partialPaidAmount) || 0)))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {(!selectedCustomer || selectedCustomer.id === "WALK-IN" || selectedCustomer.id === "walk-in") && (
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="py-3 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1"
                  >
                    <UserIcon className="w-4 h-4" /> Link Customer
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePartialConfirm}
                  disabled={!partialPaidAmount || Number(partialPaidAmount) <= 0}
                  className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-rose-600/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Percent className="w-4 h-4" /> Confirm Partial Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPEN REGISTER (SESSION) MODAL */}
      <AnimatePresence>
        {sessionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Open Register</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium">Please enter your starting cash float to open the shift.</p>

              <div className="mb-6 text-left">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starting Cash ({currency.symbol})</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency.symbol}</span>
                  <input
                    type="number"
                    value={startingCash}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setStartingCash(e.target.value)}
                    className="w-full text-2xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleOpenSession}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-wide"
              >
                Start Shift
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Held Bills Modal */}
      <AnimatePresence>
        {heldBillsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHeldBillsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <ListIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl leading-none">Resume Bill</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Restore Parked Transactions</p>
                  </div>
                </div>
                <button onClick={() => setHeldBillsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                {isLoadingHeldBills ? (
                  <div className="text-center p-8 text-slate-500 font-medium animate-pulse">Loading held bills...</div>
                ) : heldBillsList.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 font-medium">No parked bills currently on hold.</div>
                ) : (
                  <div className="space-y-3">
                    {heldBillsList.map(bill => (
                      <div key={bill.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{bill.receipt_number}</span>
                            <span className="text-xs font-semibold text-slate-400">{new Date(bill.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800">Customer: {bill.customer_id ? bill.customer_id.substring(0, 8) : 'Walk-in'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{bill.items.length} items • <span className="font-bold text-slate-700">{formatCurrency(bill.total_amount)}</span></p>
                        </div>
                        <button
                          onClick={() => {
                            setHeldBillsModalOpen(false);
                            setHeldBillsCount(prev => Math.max(0, prev - 1));
                            resumeCart(bill);
                          }}
                          className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                        >
                          Resume
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Selection & Registration Modal */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomerModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 z-10"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">Customer Profile Selection</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Attach Customer to Terminal Cart & Rewards</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Toggle Pills */}
              <div className="p-3 border-b border-slate-100 bg-white flex gap-2">
                <button
                  onClick={() => setCustomerTab('search')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    customerTab === 'search'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Search Existing Customer
                </button>
                <button
                  onClick={() => setCustomerTab('new')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    customerTab === 'new'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  + Add New Customer
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
                {customerTab === 'search' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search by customer name, mobile, or email..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {customerList
                        .filter(c =>
                          !customerSearchQuery.trim() ||
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          (c.phone && c.phone.includes(customerSearchQuery)) ||
                          (c.email && c.email.toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        )
                        .map(cust => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsCustomerModalOpen(false);
                            }}
                            className={`p-3.5 bg-white border rounded-xl cursor-pointer transition-all flex items-center justify-between hover:border-indigo-400 hover:shadow-md ${
                              selectedCustomer.id === cust.id ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200">
                                {cust.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                  {cust.name}
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">
                                    {cust.tier || 'Silver'} Tier
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                                  {cust.phone && <span>📞 {cust.phone}</span>}
                                  <span>{cust.points || 0} Pts</span>
                                </div>
                              </div>
                            </div>
                            <button className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors">
                              Select
                            </button>
                          </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <button
                        onClick={() => {
                          setSelectedCustomer(posCustomers[0]);
                          setIsCustomerModalOpen(false);
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Reset to Walk-in Guest
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateCustomer} className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Rivera"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        required
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                        <input
                          type="text"
                          placeholder="+1 (555) 019-2834"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          required
                          className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address <span className="text-[10px] font-normal text-slate-400">(Optional)</span></label>
                        <input
                          type="email"
                          placeholder="alex@example.com"
                          value={newCustEmail}
                          onChange={(e) => setNewCustEmail(e.target.value)}
                          className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Company / Business Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Corp"
                          value={newCustCompany}
                          onChange={(e) => setNewCustCompany(e.target.value)}
                          className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Customer Category / Type</label>
                        <select
                          value={newCustType}
                          onChange={(e) => setNewCustType(e.target.value)}
                          className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Retail">Retail Customer</option>
                          <option value="Wholesale">Wholesale Client</option>
                          <option value="B2B">B2B Business Party</option>
                        </select>
                      </div>
                    </div>

                    {/* GSTIN Field with Live Verification */}
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">GSTIN / Tax ID Number</label>
                        <span className="text-[10px] text-slate-500 font-medium">Auto-populates business & address</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 37AABCU9603R1ZM"
                          value={newCustGST}
                          onChange={(e) => setNewCustGST(e.target.value.toUpperCase())}
                          maxLength={15}
                          className="flex-1 h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPOSCustomerGST}
                          disabled={verifyingCustGST || !newCustGST.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                        >
                          {verifyingCustGST ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          {verifyingCustGST ? "Verifying..." : "⚡ Verify & Auto-fill"}
                        </button>
                      </div>
                    </div>

                    {/* Billing Address Structured Fields */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        🏢 Billing Address Details
                      </span>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Building, Street & Area</label>
                        <input
                          type="text"
                          placeholder="e.g. Door 14/2, Market Street"
                          value={newCustStreet}
                          onChange={(e) => setNewCustStreet(e.target.value)}
                          className="w-full h-9 bg-white border border-slate-300 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">City / Town</label>
                          <input
                            type="text"
                            placeholder="e.g. Proddatur"
                            value={newCustCity}
                            onChange={(e) => setNewCustCity(e.target.value)}
                            className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / UT (GST)</label>
                          <select
                            value={newCustState}
                            onChange={(e) => {
                              setNewCustState(e.target.value);
                              if (isCustShippingSameAsBilling) setNewCustShipState(e.target.value);
                            }}
                            className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {INDIAN_STATES.map((st) => (
                              <option key={st.code} value={st.name}>
                                {st.code} - {st.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            PIN Code {isLookingUpPincode && <span className="text-indigo-600 animate-pulse text-[10px]">Detecting...</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="PIN Code"
                            maxLength={6}
                            value={newCustPincode}
                            onChange={(e) => handleCustPincodeChange(e.target.value)}
                            className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address Header & Checkbox */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          🚚 Shipping / Delivery Address
                        </span>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isCustShippingSameAsBilling}
                            onChange={(e) => setIsCustShippingSameAsBilling(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Same as Billing Address
                        </label>
                      </div>

                      {!isCustShippingSameAsBilling && (
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Shipping Building, Street & Area</label>
                            <input
                              type="text"
                              placeholder="e.g. Warehouse 3, Industrial Area"
                              value={newCustShipStreet}
                              onChange={(e) => setNewCustShipStreet(e.target.value)}
                              className="w-full h-9 bg-white border border-slate-300 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">City / Town</label>
                              <input
                                type="text"
                                placeholder="City"
                                value={newCustShipCity}
                                onChange={(e) => setNewCustShipCity(e.target.value)}
                                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / UT (GST)</label>
                              <select
                                value={newCustShipState}
                                onChange={(e) => setNewCustShipState(e.target.value)}
                                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                {INDIAN_STATES.map((st) => (
                                  <option key={st.code} value={st.name}>
                                    {st.code} - {st.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                PIN Code {isLookingUpPincode && <span className="text-indigo-600 animate-pulse text-[10px]">Detecting...</span>}
                              </label>
                              <input
                                type="text"
                                placeholder="PIN"
                                maxLength={6}
                                value={newCustShipPincode}
                                onChange={(e) => handleCustShipPincodeChange(e.target.value)}
                                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomerTab('search')}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                      >
                        Create & Attach Customer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pine Labs Handheld EDC Card Terminal Modal */}
      <PineLabsEDCModal
        isOpen={isPineLabsModalOpen}
        amount={total}
        billNumber={`POS-${Date.now().toString().slice(-6)}`}
        customerMobile={selectedCustomer?.phone}
        onClose={() => setIsPineLabsModalOpen(false)}
        onSuccess={(payData) => {
          setPaymentMethod(payData.paymentMethod);
          setEdcMetadata({
            rrn: payData.rrn,
            authCode: payData.authCode,
            cardBrand: payData.cardBrand,
            cardLast4: payData.cardLast4,
            batchNumber: payData.batchNumber,
          });
          setIsPineLabsModalOpen(false);
          toast.success(`Payment captured via PineLabs EDC (RRN: ${payData.rrn})`);
          executeCheckout([{ payment_method: "card", amount: total }]);
        }}
      />

      {/* Razorpay Dynamic UPI QR & SMS Link Modal */}
      <RazorpayPOSModal
        isOpen={isRazorpayModalOpen}
        amount={total}
        billNumber={`POS-${Date.now().toString().slice(-6)}`}
        customerMobile={selectedCustomer?.phone}
        customerName={selectedCustomer?.name}
        onClose={() => setIsRazorpayModalOpen(false)}
        onSuccess={(payData) => {
          setPaymentMethod("UPI");
          setIsRazorpayModalOpen(false);
          toast.success(`Razorpay Payment verified (${payData.paymentId})`);
          executeCheckout([{ payment_method: "online", amount: total }]);
        }}
      />

      {/* Active Checkout Thermal Printer Portal */}
      <ThermalReceiptPrinter bill={completedCheckoutBill} />

      {/* Interactive Product Batch & Traceability Selector Modal */}
      {batchModalCartItem && (
        <BatchSelectorModal
          isOpen={!!batchModalCartItem}
          onClose={() => setBatchModalCartItem(null)}
          productId={batchModalCartItem.productId}
          productName={batchModalCartItem.productName}
          currentBatchNumber={batchModalCartItem.currentBatch}
          onSelectBatch={handleBatchSelectForCartItem}
        />
      )}
    </div>
  );
}

// Trivial change to force Vite HMR rebuild
