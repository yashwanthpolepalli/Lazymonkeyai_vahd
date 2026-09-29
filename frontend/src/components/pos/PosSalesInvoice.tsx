import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Settings,
  ScanBarcode,
  XCircle,
  Search,
  ScanLine,
  X,
  ChevronDown,
  Trash2,
  UserPlus,
  Calendar,
  FileText,
  CreditCard,
  QrCode,
  Check,
  Building,
  Phone,
  Mail,
  Receipt,
  Sparkles,
  ArrowLeft,
  DollarSign,
  History,
  Wallet,

  MessageSquare,
  StickyNote,
  Tag,
  Boxes,
  CheckSquare,
  Square,
  ShoppingBag,
  Layers,
  Minus,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCircle,
  Zap,
  User,
  Truck,
  Download,
  MapPin,
  ShoppingCart,
  Eye,
  MoreVertical,
  Gift,
  Package,
  Upload,
  Info,
  Send,
  MessageCircle,
  Printer,
  Pencil,
} from "lucide-react";
import { posApi, crmApi, crmCustomersApi, type CustomerAddressItem, invoicesApi, employeesApi, fetchSalesEmployees, inventoryApi, procurementApi, crmWalletApi, bankApi, BankAccountRecord, crmQuotationsApi, companiesApi, numberSeriesApi } from "../../lib/api-client";
import { toast } from "sonner";
import { ThermalReceiptPrinter } from "./ThermalReceiptPrinter";
import { FullInvoicePrinter, FullInvoiceData } from "./FullInvoicePrinter";
import { getActiveBillingGst, setActiveBillingGst, getTenantIdFromStorage, getOrgDocumentPrefix } from "../../lib/receipt-template-store";
import { EWayBillModal } from "./EWayBillModal";
import { RazorpayPOSModal } from "./RazorpayPOSModal";
import { PineLabsEDCModal } from "./PineLabsEDCModal";
import { BatchSelectorModal } from "../inventory/BatchSelectorModal";
import { triggerThermalPrint } from "../../lib/print-helper";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";
import { useNavigate } from "react-router-dom";
import { INDIAN_STATES } from "@/data/indian-states";
import { usePincodeLookup } from "@/hooks/use-pincode-lookup";
import { lookupGstinDetails } from "@/lib/gst-helper";
import { getTodayDateString, addDaysToDateString, isValidUUID, cn } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { useStoreLocations } from "@/hooks/use-store-locations";
import { InvoiceQuickSettingsModal, InvoiceSettings, loadStoredInvoiceSettings, saveStoredInvoiceSettings } from "./InvoiceQuickSettingsModal";
import { computeGstBreakdown, checkIsInterstate, extractGstState } from "@/lib/gst-utils";

export type DocumentType = "TAX_INVOICE" | "ESTIMATE_NON_GST" | "PROFORMA" | "CREDIT_NOTE" | "DEBIT_NOTE" | "QUOTATION";

export const getDocPrefix = (type: DocumentType, tenantId?: string) => {
  return getOrgDocumentPrefix(type, tenantId);
};

export const getDocTitle = (type: DocumentType) => {
  switch (type) {
    case "CREDIT_NOTE": return "Credit Note";
    case "DEBIT_NOTE": return "Debit Note";
    case "PROFORMA": return "Proforma Invoice";
    case "ESTIMATE_NON_GST": return "Estimate";
    case "QUOTATION": return "Customer Sales Quotation";
    case "TAX_INVOICE":
    default:
      return "Tax Invoice";
  }
};

export const getDocButtonNoun = (type: DocumentType) => {
  switch (type) {
    case "QUOTATION": return "QUOTATION";
    case "CREDIT_NOTE": return "CREDIT NOTE";
    case "DEBIT_NOTE": return "DEBIT NOTE";
    case "PROFORMA": return "PROFORMA";
    case "ESTIMATE_NON_GST": return "ESTIMATE";
    case "TAX_INVOICE":
    default:
      return "INVOICE";
  }
};

export interface FreeQtyItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  hsn_code?: string;
  batch_number?: string;
  expiry_date?: string;
}

export interface InvoiceItem {
  id: string;
  product_id?: string;
  product_name: string;
  hsn_code?: string;
  batch_number?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp?: number;
  quantity: number;
  free_qty?: number;
  unit_price: number;
  discount_value: number;
  discount_type: "amount" | "percent";
  tax_rate: number;
  is_tax_inclusive?: boolean;
  is_free?: boolean;
  custom_note?: string;
  is_note_open?: boolean;
  is_search_open?: boolean;
  search_query?: string;
  // Primary and Secondary UOM conversion fields
  uom?: string;
  secondary_uom?: string;
  conversion_factor?: number;
  selected_uom?: string;
  base_unit_price?: number;
  base_mrp?: number;
  primary_qty?: number;
  secondary_qty?: number;
  batch_id?: string;
  warehouse_id?: string;
  warehouse_name?: string;
}

export function extractProductUomInfo(prod: any) {
  if (!prod) {
    return {
      uom: "Pcs",
      secondary_uom: "",
      conversion_factor: 1,
      sales_measuring_unit: "Pcs",
      price_is_per_secondary: false,
    };
  }
  let specs: any = {};
  if (typeof prod.specifications === "string") {
    try {
      specs = JSON.parse(prod.specifications || "{}");
    } catch {
      specs = {};
    }
  } else if (prod.specifications && typeof prod.specifications === "object") {
    specs = prod.specifications;
  }
  const uom = prod.uom || prod.uom_name || specs.primary_uom || specs.uom || prod.unit || "Pcs";
  const secondary_uom = prod.secondary_uom || specs.secondary_uom || "";
  const rawFactor = prod.conversion_factor ?? specs.conversion_factor;
  const conversion_factor = Number(rawFactor) > 0 ? Number(rawFactor) : 1;
  const sales_measuring_unit = prod.sales_measuring_unit || specs.sales_measuring_unit || "";

  // Check if base catalog price is specified per Secondary Unit (e.g. per Piece when 1 Pack = 10 Pieces)
  const price_is_per_secondary = Boolean(
    secondary_uom &&
    conversion_factor > 1 &&
    sales_measuring_unit &&
    (
      sales_measuring_unit.toLowerCase() === secondary_uom.toLowerCase() ||
      (sales_measuring_unit.toLowerCase() !== String(uom).toLowerCase() && (
        secondary_uom.toLowerCase().includes(sales_measuring_unit.toLowerCase()) ||
        sales_measuring_unit.toLowerCase().includes(secondary_uom.toLowerCase())
      ))
    )
  );

  return {
    uom: String(uom),
    secondary_uom: String(secondary_uom || ""),
    conversion_factor: conversion_factor,
    sales_measuring_unit: String(sales_measuring_unit),
    price_is_per_secondary,
  };
}

export function computeItemUomRates(
  rawUnitPrice: number,
  rawMrp: number,
  uomInfo: {
    uom: string;
    secondary_uom: string;
    conversion_factor: number;
    sales_measuring_unit?: string;
    price_is_per_secondary?: boolean;
  },
  desiredSelectedUom?: string
) {
  const factor = Number(uomInfo.conversion_factor) > 1 ? Number(uomInfo.conversion_factor) : 1;
  const priceIsPerSec = Boolean(uomInfo.price_is_per_secondary);

  // If price is defined per secondary unit (e.g. piece), then base_unit_price (primary pack) is price * factor
  // Else (default), base_unit_price (primary pack) is price, and secondary piece is price / factor.
  const primaryUnitPrice = priceIsPerSec ? Number((rawUnitPrice * factor).toFixed(2)) : rawUnitPrice;
  const secondaryUnitPrice = priceIsPerSec ? rawUnitPrice : Number((rawUnitPrice / factor).toFixed(2));

  const primaryMrp = priceIsPerSec ? Number(((rawMrp || 0) * factor).toFixed(2)) : (rawMrp || 0);
  const secondaryMrp = priceIsPerSec ? (rawMrp || 0) : ((rawMrp || 0) > 0 ? Number(((rawMrp || 0) / factor).toFixed(2)) : 0);

  const selectedUom = desiredSelectedUom || (priceIsPerSec && uomInfo.secondary_uom ? uomInfo.secondary_uom : uomInfo.uom);
  const isSelectedSecondary = Boolean(uomInfo.secondary_uom && selectedUom === uomInfo.secondary_uom && factor > 1);

  return {
    uom: uomInfo.uom,
    secondary_uom: uomInfo.secondary_uom,
    conversion_factor: factor,
    selected_uom: selectedUom,
    base_unit_price: primaryUnitPrice,
    base_mrp: primaryMrp,
    unit_price: isSelectedSecondary ? secondaryUnitPrice : primaryUnitPrice,
    mrp: isSelectedSecondary ? secondaryMrp : primaryMrp,
  };
}

export interface PosSalesInvoiceProps {
  initialDocType?: DocumentType;
  editingInvoice?: any;
  onCancel?: () => void;
  onSaved?: (savedDoc?: any) => void;
  onConvertToOrder?: (doc?: any) => void;
}

export function PosSalesInvoice({ initialDocType = "TAX_INVOICE", editingInvoice, onCancel, onSaved, onConvertToOrder }: PosSalesInvoiceProps = {}) {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const currentTenantId = (tenant as any)?.raw?.tenant_id || (tenant as any)?.tenant_id || tenant?.id || "default";
  const currentCompanyId = tenant?.id || (tenant as any)?.raw?.id || (tenant as any)?.company_id || "default";
  const posStorageKey = `pos_saved_invoices_${currentTenantId}_${currentCompanyId}`;
  const navigate = useNavigate();

  const [showPaymentTerms, setShowPaymentTerms] = useState(false);
  const [activeEditingInvoice, setActiveEditingInvoice] = useState<any | null>(() => {
    if (editingInvoice) return editingInvoice;
    try {
      const storedEdit = typeof window !== "undefined" ? sessionStorage.getItem("pos_edit_invoice") : null;
      if (storedEdit) return JSON.parse(storedEdit);
      const storedRecreate = typeof window !== "undefined" ? sessionStorage.getItem("pos_recreate_invoice") : null;
      if (storedRecreate) return JSON.parse(storedRecreate);
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get("edit_id");
        if (editId) {
          const rawSaved = localStorage.getItem(posStorageKey);
          if (rawSaved) {
            const list = JSON.parse(rawSaved);
            const found = list.find((x: any) => x.id === editId || x.invoice_number === editId);
            if (found) return found;
          }
        }
      }
    } catch (e) {}
    return null;
  });
  const [isRecreatingInvoice, setIsRecreatingInvoice] = useState<boolean>(() => {
    try {
      const storedRecreate = typeof window !== "undefined" ? sessionStorage.getItem("pos_recreate_invoice") : null;
      if (storedRecreate) return true;
      const storedRecreateNum = typeof window !== "undefined" ? sessionStorage.getItem("pos_recreate_invoice_number") : null;
      if (storedRecreateNum) return true;
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("recreate_number")) return true;
      }
    } catch (e) {}
    return false;
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  // Fixed-position dropdown anchor for product search (avoids overflow-x-auto clipping)
  const [dropdownAnchor, setDropdownAnchor] = useState<{ itemId: string; top: number; left: number; width: number } | null>(null);

  // Quick Settings & Sequence Customization
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(() => loadStoredInvoiceSettings());
  const [challanNumber, setChallanNumber] = useState("");
  const [invoiceCustomFieldValues, setInvoiceCustomFieldValues] = useState<Record<string, string>>({});

  // Invoice Fields & Document Type Support (Tax Invoice, Estimate, Proforma, Credit Note, Debit Note)
  const [invoiceType, setInvoiceType] = useState<DocumentType>(initialDocType);
  const [originalInvoiceRef, setOriginalInvoiceRef] = useState<string>("");
  const [originalInvoiceDate, setOriginalInvoiceDate] = useState<string>("");
  const [noteReason, setNoteReason] = useState<string>("Sales Return");

  const getNextSequentialInvoiceNumber = useCallback((type: DocumentType, currentSettings?: InvoiceSettings) => {
    const s = currentSettings || invoiceSettings || loadStoredInvoiceSettings();
    const isTaxInv = type === "TAX_INVOICE";
    const prefix = isTaxInv ? (s.prefix !== undefined ? s.prefix : "INV-") : `${getDocPrefix(type)}-`;
    const suffix = isTaxInv ? (s.suffix || "") : "";

    // Scan existing pos_saved_invoices in localStorage to find the highest non-cancelled invoice number
    let highestActive = 0;
    try {
      const rawSaved = localStorage.getItem(posStorageKey);
      if (rawSaved) {
        const list = JSON.parse(rawSaved);
        if (Array.isArray(list)) {
          list.forEach((inv: any) => {
            // Ignore cancelled invoices so that cancelled invoices do not consume or block sequence numbers
            if (inv.status === "cancelled" || inv.payment_status === "Cancelled") {
              return;
            }
            const invNum = String(inv.invoice_number || "").trim();
            if (prefix && invNum.startsWith(prefix)) {
              const remainder = suffix && invNum.endsWith(suffix)
                ? invNum.slice(prefix.length, invNum.length - suffix.length)
                : invNum.slice(prefix.length);
              const digits = remainder.match(/\d+/g);
              if (digits) {
                const num = parseInt(digits[digits.length - 1], 10);
                if (!isNaN(num) && num > highestActive) {
                  highestActive = num;
                }
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn("Could not scan pos storage for sequence:", e);
    }

    let targetSeq = 1001;
    if (highestActive > 0) {
      targetSeq = highestActive + 1;
    } else if (s.sequenceNumber) {
      targetSeq = Math.max(1, s.sequenceNumber);
    }

    return `${prefix}${targetSeq}${suffix}`;
  }, [invoiceSettings, posStorageKey]);

  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    if (editingInvoice?.invoice_number) return editingInvoice.invoice_number;
    try {
      const storedEdit = typeof window !== "undefined" ? sessionStorage.getItem("pos_edit_invoice") : null;
      if (storedEdit) {
        const parsed = JSON.parse(storedEdit);
        if (parsed?.invoice_number) return parsed.invoice_number;
      }
      const storedRecreate = typeof window !== "undefined" ? sessionStorage.getItem("pos_recreate_invoice") : null;
      if (storedRecreate) {
        const parsed = JSON.parse(storedRecreate);
        if (parsed?.invoice_number) return parsed.invoice_number;
      }
      const storedRecreateNum = typeof window !== "undefined" ? sessionStorage.getItem("pos_recreate_invoice_number") : null;
      if (storedRecreateNum) return storedRecreateNum;
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const recreateNum = urlParams.get("recreate_number");
        if (recreateNum) return recreateNum;
        const editId = urlParams.get("edit_id");
        if (editId) {
          const rawSaved = localStorage.getItem(posStorageKey);
          if (rawSaved) {
            const list = JSON.parse(rawSaved);
            const found = list.find((x: any) => x.id === editId || x.invoice_number === editId);
            if (found?.invoice_number) return found.invoice_number;
          }
        }
      }
    } catch (e) {}
    return getNextSequentialInvoiceNumber(initialDocType);
  });
  const [invoiceDate, setInvoiceDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [paymentTerms, setPaymentTerms] = useState("0");
  const [customPaymentTermsText, setCustomPaymentTermsText] = useState("");
  const [customPaymentDays, setCustomPaymentDays] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only."
  );

  // PO & Dispatch / Transport Metadata State
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");
  const [ewayBillDate, setEwayBillDate] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [dispatchMode, setDispatchMode] = useState("Road");
  const [metaTab, setMetaTab] = useState<"invoice" | "other">("invoice");
  const [showDispatchSection, setShowDispatchSection] = useState(false);

  const fetchNextOrgDocNumber = useCallback(async (type: DocumentType, explicitSettings?: InvoiceSettings) => {
    const s = explicitSettings || invoiceSettings || loadStoredInvoiceSettings();
    const localSeqNum = getNextSequentialInvoiceNumber(type, s);

    const activeCompId = currentCompanyId && isValidUUID(currentCompanyId) ? currentCompanyId : undefined;
    const moduleMap: Record<DocumentType, string> = {
      TAX_INVOICE: "invoices",
      QUOTATION: "quotations",
      ESTIMATE_NON_GST: "estimates",
      PROFORMA: "proforma",
      CREDIT_NOTE: "credit_notes",
      DEBIT_NOTE: "debit_notes",
    };
    const modName = moduleMap[type] || "invoices";
    const orgPrefix = getOrgDocumentPrefix(type, tenant?.id);

    try {
      const peek = await numberSeriesApi.peekNextNumber(modName, activeCompId, orgPrefix);
      if (peek?.formatted_number && peek?.configured && peek?.current_number > 0) {
        return peek.formatted_number;
      }
    } catch (e) {}

    return localSeqNum;
  }, [currentCompanyId, getNextSequentialInvoiceNumber, invoiceSettings, tenant?.id]);

  const handleRegenerateInvoiceNumber = useCallback((type: DocumentType = invoiceType, explicitSettings?: InvoiceSettings) => {
    const s = explicitSettings || invoiceSettings || loadStoredInvoiceSettings();
    const nextNum = getNextSequentialInvoiceNumber(type, s);
    setInvoiceNumber(nextNum);
    toast.info(`Generated ${getDocTitle(type)} number: ${nextNum}`);
  }, [getNextSequentialInvoiceNumber, invoiceSettings, invoiceType]);

  const handleInvoiceTypeChange = useCallback((newType: DocumentType) => {
    const prevType = invoiceType;
    setInvoiceType(newType);
    
    if ((prevType === "QUOTATION" || invoiceNumber.toUpperCase().startsWith("QT")) && newType === "TAX_INVOICE") {
      const oldQuoteNum = invoiceNumber;
      const nextNum = getNextSequentialInvoiceNumber("TAX_INVOICE");
      setInvoiceNumber(nextNum);
      toast.success(`Converted Quotation ${oldQuoteNum} to Tax Invoice #${nextNum}`);
      setNotes((prev) => prev ? `${prev}\nConverted from Quotation #${oldQuoteNum}` : `Converted from Quotation #${oldQuoteNum}`);
    } else if (!activeEditingInvoice && !editingInvoice && !isRecreatingInvoice) {
      const nextNum = getNextSequentialInvoiceNumber(newType);
      setInvoiceNumber(nextNum);
    }
  }, [activeEditingInvoice, editingInvoice, isRecreatingInvoice, getNextSequentialInvoiceNumber, invoiceNumber, invoiceType]);

  // Sync initialDocType changes
  useEffect(() => {
    if (activeEditingInvoice || editingInvoice || isRecreatingInvoice) return;
    if (initialDocType) {
      setInvoiceType(initialDocType);
      const nextNum = getNextSequentialInvoiceNumber(initialDocType);
      setInvoiceNumber(nextNum);
    }
  }, [initialDocType, editingInvoice, activeEditingInvoice, isRecreatingInvoice, getNextSequentialInvoiceNumber]);

  // Listen for bos-invoice-settings-changed event
  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      if (e.detail) {
        setInvoiceSettings(e.detail);
        if (!activeEditingInvoice && !editingInvoice && !isRecreatingInvoice) {
          const nextNum = getNextSequentialInvoiceNumber(invoiceType, e.detail);
          setInvoiceNumber(nextNum);
        }
      }
    };
    window.addEventListener("bos-invoice-settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("bos-invoice-settings-changed", handleSettingsChanged);
    };
  }, [editingInvoice, activeEditingInvoice, isRecreatingInvoice, getNextSequentialInvoiceNumber, invoiceType]);

  // GST Type: intra-state (CGST + SGST) or inter-state (IGST)
  const [gstType, setGstType] = useState<"cgst_sgst" | "igst">("cgst_sgst");

  const getIsInterstate = useCallback((customerState?: string, customerGst?: string, customerAddress?: string) => {
    const activeBillingGst = getActiveBillingGst(tenant?.id);
    const companyGst = (activeBillingGst?.gstin || (tenant as any)?.gstin || (tenant as any)?.tax_id || (tenant as any)?.raw?.tax_id || (tenant as any)?.raw?.gst_number || "").trim().toUpperCase();
    const companyState = (activeBillingGst?.state_name || (tenant as any)?.state || (tenant as any)?.raw?.state || "");
    const companyAddress = (activeBillingGst?.address || (tenant as any)?.raw?.address || "");

    const { isInterState } = checkIsInterstate(
      { gstin: companyGst, state: companyState, address: companyAddress },
      { gstin: customerGst, state: customerState, address: customerAddress }
    );
    return isInterState;
  }, [tenant]);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [autoRoundOff, setAutoRoundOff] = useState(true);
  const DEFAULT_INVOICE_TERMS = "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.";
  const [termsAndConditions, setTermsAndConditions] = useState<string>(() => {
    const activeGst = getActiveBillingGst(tenant?.id);
    return activeGst?.terms_and_conditions || DEFAULT_INVOICE_TERMS;
  });

  // Sync terms & conditions when tenant or active billing GST changes
  useEffect(() => {
    if (editingInvoice || activeEditingInvoice) return;
    const activeGst = getActiveBillingGst(tenant?.id);
    if (activeGst?.terms_and_conditions) {
      setTermsAndConditions(activeGst.terms_and_conditions);
    }
  }, [tenant?.id, editingInvoice, activeEditingInvoice]);

  // Fetch freshest company details and custom terms from backend API when Sales Invoice opens
  useEffect(() => {
    let isMounted = true;
    companiesApi.list(1, 50).then((res) => {
      if (!isMounted || !res?.items?.length) return;
      const tid = tenant?.id || getTenantIdFromStorage();
      const activeStoredCompRaw = localStorage.getItem(`bos_active_company_${tid}`) || localStorage.getItem('bos_active_company');
      let activeId = "";
      if (activeStoredCompRaw) {
        try { activeId = JSON.parse(activeStoredCompRaw)?.id; } catch {}
      }
      const matchedCompany = (activeId ? res.items.find(c => c.id === activeId) : null) || res.items[0];
      if (matchedCompany) {
        localStorage.setItem(`bos_active_company_${tid}`, JSON.stringify(matchedCompany));
        localStorage.setItem("bos_active_company", JSON.stringify(matchedCompany));
        if (matchedCompany.terms_and_conditions && !editingInvoice && !activeEditingInvoice) {
          setTermsAndConditions(matchedCompany.terms_and_conditions);
        }
        const primaryReg = matchedCompany.gst_registrations?.find((r: any) => r.is_primary) || matchedCompany.gst_registrations?.[0];
        const gstin = primaryReg?.gstin || matchedCompany.gst_number || '';
        setActiveBillingGst({
          gstin,
          trade_name: primaryReg?.trade_name || matchedCompany.name,
          legal_name: matchedCompany.legal_name || matchedCompany.name,
          state_code: primaryReg?.state_code || (gstin ? gstin.slice(0, 2) : '29'),
          state_name: primaryReg?.state_name || matchedCompany.state || 'State',
          address: primaryReg?.address || matchedCompany.address || '',
          phone: matchedCompany.phone || '',
          email: matchedCompany.email || '',
          cin: matchedCompany.registration_number || '',
          pan: matchedCompany.pan_number || '',
          logo_url: matchedCompany.logo_url || undefined,
          google_review_url: matchedCompany.google_review_url || undefined,
          google_place_id: matchedCompany.google_place_id || undefined,
          google_review_enabled: matchedCompany.google_review_enabled !== false,
          terms_and_conditions: matchedCompany.terms_and_conditions || null,
        }, tid);
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [tenant?.id, editingInvoice, activeEditingInvoice]);

  useEffect(() => {
    const handleGstChange = (e: any) => {
      if (editingInvoice || activeEditingInvoice) return;
      const details = e.detail || getActiveBillingGst(tenant?.id);
      if (details?.terms_and_conditions) {
        setTermsAndConditions(details.terms_and_conditions);
      }
    };
    window.addEventListener("bos-active-gst-changed", handleGstChange);
    window.addEventListener("storage", handleGstChange);
    return () => {
      window.removeEventListener("bos-active-gst-changed", handleGstChange);
      window.removeEventListener("storage", handleGstChange);
    };
  }, [tenant?.id, editingInvoice]);
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitOnline, setSplitOnline] = useState<string>("");
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [isPineLabsModalOpen, setIsPineLabsModalOpen] = useState(false);
  const [razorpayMetadata, setRazorpayMetadata] = useState<{
    paymentId?: string;
    orderId?: string;
  } | null>(null);
  const [edcMetadata, setEdcMetadata] = useState<{
    rrn?: string;
    authCode?: string;
    cardBrand?: string;
    cardLast4?: string;
    batchNumber?: string;
  } | null>(null);
  const [customerWalletBalance, setCustomerWalletBalance] = useState<number>(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

  // Dynamic Custom Additional Charges State
  const [customCharges, setCustomCharges] = useState<{ id: string; name: string; amount: number | ""; tax_rate: number }[]>([
    { id: "1", name: "Freight / Transport", amount: "", tax_rate: 0 },
    { id: "2", name: "Packing Charge", amount: "", tax_rate: 0 }
  ]);

  const handleAddChargeRow = () => {
    setCustomCharges((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "Custom Charge", amount: "", tax_rate: 0 }
    ]);
  };

  const handleUpdateCharge = (id: string, field: "name" | "amount" | "tax_rate", value: any) => {
    setCustomCharges((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            [field]: field === "amount" ? (value === "" ? "" : Math.max(0, Number(value))) : field === "tax_rate" ? Number(value) : value
          };
        }
        return c;
      })
    );
  };

  const handleDeleteCharge = (id: string) => {
    setCustomCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Pricing Mode, Location & Sales Executive State
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const [pricingMode, setPricingMode] = useState<"Retail" | "Wholesale" | "B2B">("Retail");
  const [selectedLocation, setSelectedLocation] = useState<string>(() => selectedStore);
  const [salesExecutive, setSalesExecutive] = useState<string>("");
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (selectedStore && (!selectedLocation || selectedLocation === "Store Main Branch")) {
      setSelectedLocation(selectedStore);
    }
  }, [selectedStore]);

  // Inline Create Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdPrice, setNewProdPrice] = useState<number | "">("");
  const [newProdWholesalePrice, setNewProdWholesalePrice] = useState<number | "">("");
  const [newProdB2bPrice, setNewProdB2bPrice] = useState<number | "">("");
  const [newProdMrp, setNewProdMrp] = useState<number | "">("");
  const [newProdTax, setNewProdTax] = useState<number>(18);
  const [newProdStock, setNewProdStock] = useState<number>(100);
  const [newProdImage, setNewProdImage] = useState<string>("");
  const [batchModalItem, setBatchModalItem] = useState<{
    id: string;
    productId?: string;
    productName?: string;
    currentBatch?: string;
  } | null>(null);

  // Add Party Modal State (Multi-Address Book Support)
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [newPartyEmail, setNewPartyEmail] = useState("");
  const [newPartyCompany, setNewPartyCompany] = useState("");
  const [newPartyType, setNewPartyType] = useState("Retail");
  const [newPartyGST, setNewPartyGST] = useState("");
  const [isVerifyingGstin, setIsVerifyingGstin] = useState(false);

  // Multi-Address List for the single customer phone/account
  const [newPartyAddresses, setNewPartyAddresses] = useState<Array<{
    id: string;
    tag: "Home" | "Office" | "Warehouse" | "Branch" | "Other";
    street: string;
    city: string;
    state: string;
    pincode: string;
    is_billing: boolean;
    is_shipping: boolean;
  }>>([
    {
      id: "addr-1",
      tag: "Home",
      street: "",
      city: "",
      state: "Andhra Pradesh",
      pincode: "",
      is_billing: true,
      is_shipping: true,
    },
  ]);
  const [activeAddrIndex, setActiveAddrIndex] = useState<number>(0);
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<any | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<any | null>(null);
  const [isEditAddressesModalOpen, setIsEditAddressesModalOpen] = useState(false);
  const [editingCustomerAddresses, setEditingCustomerAddresses] = useState<Array<CustomerAddressItem>>([]);
  const [activeEditingAddrIndex, setActiveEditingAddrIndex] = useState(0);
  const [isSavingCustomerAddresses, setIsSavingCustomerAddresses] = useState(false);

  // Auto-sync selected addresses and Tax Type when customer changes
  useEffect(() => {
    if (!selectedCustomer) {
      setSelectedBillingAddress(null);
      setSelectedDeliveryAddress(null);
      return;
    }
    const cust = customers.find(c => c.id === selectedCustomer);
    if (!cust) return;

    let defBilling: any = null;
    let defShipping: any = null;

    if (Array.isArray(cust.addresses) && cust.addresses.length > 0) {
      defBilling = cust.addresses.find((a: any) => a.is_default_billing) || cust.addresses[0];
      defShipping = cust.addresses.find((a: any) => a.is_default_shipping) || cust.addresses.find((a: any) => a.type === "shipping" || a.type === "both") || cust.addresses[0];
    } else {
      defBilling = {
        id: "addr-def-b",
        tag: "Head Office / Billing",
        street: cust.billing_address || cust.address || "",
        city: cust.city || "",
        state: cust.state || "Andhra Pradesh",
        pincode: cust.postal_code || cust.pincode || "",
        is_default_billing: true,
        is_default_shipping: true,
      };
      defShipping = cust.shipping_address && cust.shipping_address !== (cust.billing_address || cust.address) ? {
        id: "addr-def-s",
        tag: "Delivery Location",
        street: cust.shipping_address,
        city: cust.city || "",
        state: cust.state || "Andhra Pradesh",
        pincode: cust.postal_code || cust.pincode || "",
        is_default_billing: false,
        is_default_shipping: true,
      } : defBilling;
    }

    setSelectedBillingAddress(defBilling);
    setSelectedDeliveryAddress(defShipping);

    const custState = defShipping?.state || defBilling?.state || cust.state;
    const custGst = defBilling?.gst_number || cust.gst_number || "";
    const custAddr = [defShipping?.street, defShipping?.city, defShipping?.state, defBilling?.street, defBilling?.city, defBilling?.state, cust.address].filter(Boolean).join(", ");
    if (getIsInterstate(custState, custGst, custAddr)) {
      setGstType("igst");
    } else {
      setGstType("cgst_sgst");
    }
  }, [selectedCustomer, customers, getIsInterstate]);

  // Whenever selected billing or delivery address is explicitly changed by user, auto-detect interstate tax
  useEffect(() => {
    if (!selectedCustomer) return;
    const cust = customers.find(c => c.id === selectedCustomer);
    const custGst = selectedBillingAddress?.gst_number || cust?.gst_number || "";
    const custState = selectedDeliveryAddress?.state || selectedBillingAddress?.state || cust?.state || "";
    const custAddr = [
      selectedDeliveryAddress?.street, selectedDeliveryAddress?.city, selectedDeliveryAddress?.state,
      selectedBillingAddress?.street, selectedBillingAddress?.city, selectedBillingAddress?.state,
      cust?.address, cust?.billing_address
    ].filter(Boolean).join(", ");

    if (getIsInterstate(custState, custGst, custAddr)) {
      setGstType("igst");
    } else {
      setGstType("cgst_sgst");
    }
  }, [selectedBillingAddress, selectedDeliveryAddress, selectedCustomer, customers, getIsInterstate]);

  // Autofill and preload all details when editing an existing Quotation/Invoice
  useEffect(() => {
    const inv = activeEditingInvoice || editingInvoice;
    if (!inv) return;

    // 1. Metadata: Invoice / Quote Number, Dates, Status, Executive, Location
    const qNum = inv.quote_number || inv.invoice_number || inv.number || "";
    const isQuotationDoc = Boolean(inv.quote_number || inv.invoice_type === "QUOTATION" || (typeof qNum === "string" && qNum.toUpperCase().startsWith("QT")));
    const isConvertingToTaxInvoice = (initialDocType === "TAX_INVOICE" && isQuotationDoc) || inv.is_quotation_conversion === true;

    if (isConvertingToTaxInvoice) {
      setInvoiceType("TAX_INVOICE");
      fetchNextOrgDocNumber("TAX_INVOICE").then((newInvNum) => {
        setInvoiceNumber(newInvNum);
        toast.success(`Converting Quotation ${qNum} to Tax Invoice #${newInvNum}`);
      });
      setNotes((prev) => {
        const refStr = `Converted from Quotation #${qNum}`;
        return prev && !prev.includes(refStr) ? `${prev}\n${refStr}` : refStr;
      });
      setPoNumber((prev) => prev || `Quote #${qNum}`);
    } else {
      if (qNum) setInvoiceNumber(qNum);
      if (inv.invoice_type) {
        setInvoiceType(inv.invoice_type);
      }
    }
    // Set invoice date to current date (today) for both edit and recreate operations
    const today = getTodayDateString();
    setInvoiceDate(today);

    const dueDateStr = inv.valid_until || inv.due_date;
    if (dueDateStr && String(dueDateStr).slice(0, 10) >= today) {
      setDueDate(String(dueDateStr).slice(0, 10));
    } else {
      setDueDate(today);
    }

    if (inv.sales_rep || inv.sales_executive) {
      setSalesExecutive(inv.sales_rep || inv.sales_executive);
    }
    if (inv.pricing_mode || inv.pricing_tier) {
      setPricingMode(inv.pricing_mode || inv.pricing_tier);
    }
    if (inv.location) {
      setSelectedLocation(inv.location);
    }
    if (inv.notes || inv.customer_notes) {
      setNotes(inv.notes || inv.customer_notes);
    }
    if (inv.terms || inv.terms_and_conditions) {
      setTermsAndConditions(inv.terms || inv.terms_and_conditions);
    }
    if (inv.po_number || inv.order_number) {
      setPoNumber(inv.po_number || inv.order_number || "");
    }
    if (inv.po_date) {
      setPoDate(inv.po_date || "");
    }
    if (inv.vehicle_number) {
      setVehicleNumber(inv.vehicle_number || "");
    }
    if (inv.driver_name) {
      setDriverName(inv.driver_name || "");
    }
    if (inv.driver_phone) {
      setDriverPhone(inv.driver_phone || "");
    }
    if (inv.transporter_name) {
      setTransporterName(inv.transporter_name || "");
    }
    if (inv.eway_bill_number) {
      setEwayBillNumber(inv.eway_bill_number || "");
    }
    if (inv.eway_bill_date) {
      setEwayBillDate(inv.eway_bill_date || "");
    }
    if (inv.po_number || inv.vehicle_number || inv.eway_bill_number || inv.transporter_name || inv.driver_phone) {
      setShowDispatchSection(true);
    }

    // 2. Customer & Address Information
    const custId = inv.customer_id;
    const custName = inv.customer_name || inv.customer?.name || "";
    const custPhone = inv.customer_phone || inv.customer?.phone || "";
    const custEmail = inv.customer_email || inv.customer?.email || "";
    const custGst = inv.customer_gstin || inv.customer?.gst_number || inv.customer?.gstin || "";
    const custAddr = inv.customer_address || inv.customer_billing_address || inv.billing_address || inv.customer?.address || "";
    const custShip = inv.customer_shipping_address || inv.shipping_address || inv.delivery_address || custAddr;

    if (custId || custName) {
      const syntheticId = custId || `cust-temp-${inv.id || inv.invoice_number || Date.now()}`;
      const synthCustomer = {
        id: syntheticId,
        name: custName || "Walk-in Customer",
        phone: custPhone,
        email: custEmail,
        gst_number: custGst,
        address: custAddr,
        billing_address: custAddr,
        shipping_address: custShip,
        type: inv.customer_type || inv.customer?.type || inv.customer?.customer_type || inv.pricing_mode || "Retail",
        customer_type: inv.customer_type || inv.customer?.type || inv.customer?.customer_type || inv.pricing_mode || "Retail",
      };
      setCustomers((prev) => {
        const foundIdx = prev.findIndex(
          (c) => (custId && c.id === custId) || c.id === syntheticId || (custName && c.name && c.name.toLowerCase() === custName.toLowerCase())
        );
        if (foundIdx >= 0) {
          const updated = [...prev];
          updated[foundIdx] = { ...updated[foundIdx], ...synthCustomer, id: updated[foundIdx].id };
          return updated;
        }
        return [synthCustomer, ...prev];
      });
      setSelectedCustomer(syntheticId);
    }

    if (custAddr) {
      setSelectedBillingAddress({
        id: "addr-edit-b",
        tag: "Billing Address",
        street: custAddr,
        city: inv.city || "",
        state: inv.state || "Andhra Pradesh",
        pincode: inv.pincode || inv.postal_code || "",
        gst_number: custGst,
      });
    }

    if (custShip) {
      setSelectedDeliveryAddress({
        id: "addr-edit-s",
        tag: "Delivery Address",
        street: custShip,
        city: inv.city || "",
        state: inv.state || "Andhra Pradesh",
        pincode: inv.pincode || inv.postal_code || "",
        gst_number: custGst,
      });
    }

    const primaryState = inv.state || custShip || custAddr || "";
    if (getIsInterstate(primaryState, custGst, custShip || custAddr)) {
      setGstType("igst");
    } else {
      setGstType("cgst_sgst");
    }

    // 3. Line Items & Services
    const rawLines =
      inv.items?.items ||
      (Array.isArray(inv.items) ? inv.items : []) ||
      inv.lines ||
      inv.line_items ||
      [];

    if (Array.isArray(rawLines) && rawLines.length > 0) {
      const mappedItems: InvoiceItem[] = rawLines.map((it: any) => {
        const unitP = Number(it.unit_price ?? it.price ?? 0);
        const taxR = Number(it.tax_rate ?? it.tax_percent ?? it.tax ?? 18);
        const mrpVal = Number(it.mrp) > 0 ? Number(it.mrp) : Math.ceil(unitP * (1 + taxR / 100));
        const discVal = Number(it.discount_value ?? it.discount_percent ?? it.discount ?? 0);
        const discType =
          it.discount_type === "amount" || it.discount_type === "fixed" ? "amount" : "percent";
        const rawQty = Math.max(1, Number(it.quantity) || 1);
        const rawUom = it.uom || it.unit_of_measure || it.unit || "Pcs";
        const rawSecUom = it.secondary_uom || "";
        const rawFactor = Number(it.conversion_factor) > 0 ? Number(it.conversion_factor) : 1;
        const rawPQty = it.primary_qty !== undefined ? Number(it.primary_qty) : (rawSecUom && rawFactor > 1 ? Math.floor(rawQty) : rawQty);
        const rawSQty = it.secondary_qty !== undefined ? Number(it.secondary_qty) : (rawSecUom && rawFactor > 1 ? Math.round((rawQty - Math.floor(rawQty)) * rawFactor) : 0);

        return {
          id: it.id || Math.random().toString(36).substr(2, 9),
          product_id: it.product_id || it.sku || "",
          product_name: it.product_name || it.name || it.item_name || "Item",
          quantity: rawQty,
          primary_qty: rawPQty,
          secondary_qty: rawSQty,
          uom: rawUom,
          secondary_uom: rawSecUom,
          conversion_factor: rawFactor,
          unit_price: unitP,
          mrp: mrpVal,
          hsn_code: it.hsn_code || it.hsn || "",
          batch_number: it.batch_number || it.batch || "",
          expiry_date: it.expiry_date ? String(it.expiry_date).slice(0, 10) : "",
          tax_rate: taxR,
          is_tax_inclusive: it.is_tax_inclusive === true,
          discount_value: discVal,
          discount_type: discType,
          custom_note: it.custom_note || it.note || "",
        };
      });
      setItems(mappedItems);
    }

    // 4. Financial & Discount Settings
    if (inv.discount_calculation_mode) {
      setInvoiceDiscountMode(inv.discount_calculation_mode === "after_tax" ? "after_tax" : "before_tax");
    }
    if (inv.discount_amount || inv.discount || inv.invoice_discount_value) {
      setInvoiceDiscountValue(Number(inv.discount_amount || inv.discount || inv.invoice_discount_value || 0));
    }
    if (inv.discount_type) {
      setInvoiceDiscountType(inv.discount_type === "amount" || inv.discount_type === "fixed" ? "amount" : "percent");
    }
    if (inv.additional_charges || inv.custom_charges) {
      const chgs = inv.custom_charges || inv.additional_charges;
      if (Array.isArray(chgs) && chgs.length > 0) {
        setCustomCharges(
          chgs.map((c: any, idx: number) => ({
            id: c.id || String(idx + 1),
            name: c.name || "Additional Charge",
            amount: Number(c.amount) || 0,
            tax_rate: Number(c.tax_rate) || 0,
          }))
        );
      }
    }
  }, [activeEditingInvoice, editingInvoice, getIsInterstate]);

  // Handle clicking outside customer dropdown to auto-close
  useEffect(() => {
    function handleClickOutsideCustomerDropdown(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideCustomerDropdown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideCustomerDropdown);
    };
  }, []);

  // Filtered customer list for instant search matching name, phone, company, GSTIN, email, city
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const phoneMatch = (c.phone || "").toLowerCase().includes(q);
      const companyMatch = (c.company || "").toLowerCase().includes(q);
      const gstinMatch = (c.gst_number || c.tax_number || "").toLowerCase().includes(q);
      const emailMatch = (c.email || "").toLowerCase().includes(q);
      const cityMatch = (c.city || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || companyMatch || gstinMatch || emailMatch || cityMatch;
    });
  }, [customers, customerSearchQuery]);

  const handleOpenEditCustomerAddresses = () => {
    const cust = customers.find(c => c.id === selectedCustomer);
    if (!cust) {
      toast.error("Please select a customer first to manage addresses");
      return;
    }
    let addrs: CustomerAddressItem[] = [];
    if (Array.isArray(cust.addresses) && cust.addresses.length > 0) {
      addrs = JSON.parse(JSON.stringify(cust.addresses));
    } else {
      addrs = [
        {
          id: `addr-1`,
          tag: "Head Office / Billing",
          type: "both",
          street: cust.billing_address || cust.address || "",
          city: cust.city || "",
          state: cust.state || "Andhra Pradesh",
          pincode: cust.postal_code || cust.pincode || "",
          country: "India",
          gst_number: cust.gst_number || "",
          contact_person: cust.contact_person || cust.name || "",
          contact_phone: cust.phone || "",
          is_default_billing: true,
          is_default_shipping: true,
        }
      ];
      if (cust.shipping_address && cust.shipping_address !== (cust.billing_address || cust.address)) {
        addrs.push({
          id: `addr-2`,
          tag: "Warehouse / Delivery Site",
          type: "shipping",
          street: cust.shipping_address,
          city: cust.city || "",
          state: cust.state || "Andhra Pradesh",
          pincode: cust.postal_code || cust.pincode || "",
          country: "India",
          gst_number: cust.gst_number || "",
          contact_person: cust.contact_person || cust.name || "",
          contact_phone: cust.phone || "",
          is_default_billing: false,
          is_default_shipping: true,
        });
      }
    }
    setEditingCustomerAddresses(addrs);
    setActiveEditingAddrIndex(0);
    setIsEditAddressesModalOpen(true);
  };

  const handleAddNewEditingAddress = (tag: string = "Branch") => {
    const newIdx = editingCustomerAddresses.length + 1;
    const newSlot: CustomerAddressItem = {
      id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag: `${tag} ${newIdx}`,
      type: "shipping",
      street: "",
      city: editingCustomerAddresses[0]?.city || "",
      state: editingCustomerAddresses[0]?.state || "Andhra Pradesh",
      pincode: "",
      country: "India",
      gst_number: "",
      contact_person: "",
      contact_phone: "",
      is_default_billing: false,
      is_default_shipping: false,
    };
    setEditingCustomerAddresses([...editingCustomerAddresses, newSlot]);
    setActiveEditingAddrIndex(editingCustomerAddresses.length);
  };

  const handleRemoveEditingAddress = (idx: number) => {
    if (editingCustomerAddresses.length <= 1) {
      toast.error("Customer must have at least one address");
      return;
    }
    const filtered = editingCustomerAddresses.filter((_, i) => i !== idx);
    if (!filtered.some(a => a.is_default_billing)) filtered[0].is_default_billing = true;
    if (!filtered.some(a => a.is_default_shipping)) filtered[0].is_default_shipping = true;
    setEditingCustomerAddresses(filtered);
    setActiveEditingAddrIndex(Math.max(0, idx - 1));
  };

  const handleUpdateEditingAddressField = (idx: number, field: keyof CustomerAddressItem, val: any) => {
    const updated = [...editingCustomerAddresses];
    updated[idx] = { ...updated[idx], [field]: val };
    setEditingCustomerAddresses(updated);
  };

  const handleEditingAddrPincodeChange = async (val: string) => {
    handleUpdateEditingAddressField(activeEditingAddrIndex, "pincode", val);
    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        const updated = [...editingCustomerAddresses];
        const curr = { ...updated[activeEditingAddrIndex] };
        curr.pincode = clean;
        if (res.city) curr.city = res.city;
        if (res.state) {
          const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase()));
          curr.state = matched?.name || res.state;
        }
        if (!curr.street && res.area) curr.street = res.area;
        updated[activeEditingAddrIndex] = curr;
        setEditingCustomerAddresses(updated);
      }
    }
  };

  const handleSaveCustomerAddresses = async () => {
    const cust = customers.find(c => c.id === selectedCustomer);
    if (!cust) return;
    setIsSavingCustomerAddresses(true);
    try {
      const defaultBilling = editingCustomerAddresses.find(a => a.is_default_billing) || editingCustomerAddresses[0];
      const defaultShipping = editingCustomerAddresses.find(a => a.is_default_shipping) || editingCustomerAddresses.find(a => a.type === "shipping" || a.type === "both") || editingCustomerAddresses[0];

      const fullBilling = [defaultBilling?.street, defaultBilling?.city, defaultBilling?.state, defaultBilling?.pincode].filter(Boolean).join(", ");
      const fullShipping = [defaultShipping?.street, defaultShipping?.city, defaultShipping?.state, defaultShipping?.pincode].filter(Boolean).join(", ");

      const updatePayload = {
        addresses: editingCustomerAddresses,
        address: defaultBilling?.street || fullBilling || cust.address,
        billing_address: defaultBilling?.street || fullBilling || cust.billing_address,
        shipping_address: defaultShipping?.street || fullShipping || cust.shipping_address,
        city: defaultBilling?.city || cust.city,
        state: defaultBilling?.state || cust.state,
        postal_code: defaultBilling?.pincode || cust.postal_code,
      };

      const res = await crmCustomersApi.update(cust.id, updatePayload);
      const updatedCust = {
        ...cust,
        ...updatePayload,
        ...(res || {}),
      };

      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updatedCust : c)));
      setSelectedBillingAddress(defaultBilling);
      setSelectedDeliveryAddress(defaultShipping);

      const custState = defaultShipping?.state || defaultBilling?.state || cust.state;
      const custGst = defaultShipping?.gst_number || defaultBilling?.gst_number || cust.gst_number;
      if (getIsInterstate(custState, custGst)) {
        setGstType("igst");
        toast.info(`Updated destination: ${defaultShipping?.tag || "Address"} (${custState}) — Tax switched to IGST.`);
      } else {
        setGstType("cgst_sgst");
      }

      toast.success("Customer address book updated & applied to current bill!");
      setIsEditAddressesModalOpen(false);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to update customer addresses");
    } finally {
      setIsSavingCustomerAddresses(false);
    }
  };

  // Free Quantity / Schemes State
  const [freeItems, setFreeItems] = useState<FreeQtyItem[]>([]);

  // Pincode Lookup Hook
  const { lookup: lookupPincode, loading: isLookingUpPincode } = usePincodeLookup();

  const handleActiveAddrPincodeChange = async (val: string) => {
    const updated = [...newPartyAddresses];
    const curr = { ...updated[activeAddrIndex], pincode: val };
    updated[activeAddrIndex] = curr;
    setNewPartyAddresses(updated);

    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        if (res.city) curr.city = res.city;
        if (res.state) {
          const matched = INDIAN_STATES.find(s => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase()));
          curr.state = matched?.name || res.state;
        }
        if (!curr.street && res.area) {
          curr.street = res.area;
        }
        updated[activeAddrIndex] = curr;
        setNewPartyAddresses([...updated]);
      }
    }
  };

  const handleVerifyGstin = async (gstOverride?: string) => {
    const cleanGst = (gstOverride || newPartyGST || "").trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      if (!gstOverride) toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setIsVerifyingGstin(true);
    try {
      const res = await lookupGstinDetails(cleanGst, false);
      if (res) {
        if (res.trade_name || res.legal_name) {
          setNewPartyName(res.trade_name || res.legal_name || "");
          setNewPartyCompany(res.legal_name || res.trade_name || "");
        }
        setNewPartyType("B2B");

        // Update the active address slot with detected city, state, pin, and address
        const targetIdx = activeAddrIndex >= 0 && activeAddrIndex < newPartyAddresses.length ? activeAddrIndex : 0;
        const fullAddr = res.principal_address || res.address || `${res.city || ""}, ${res.state || ""}`.trim();
        const updated = [...newPartyAddresses];
        const primaryAddr = { ...updated[targetIdx] };
        if (fullAddr) {
          primaryAddr.street = fullAddr;
        }
        if (res.city) primaryAddr.city = res.city;
        if (res.state) {
          const matched = INDIAN_STATES.find(
            s => s.name.toLowerCase() === res.state!.toLowerCase() || res.state!.toLowerCase().includes(s.name.toLowerCase()) || s.code === res.state_code
          );
          primaryAddr.state = matched?.name || res.state;
        }
        if (res.pincode) primaryAddr.pincode = res.pincode;

        updated[targetIdx] = primaryAddr;
        setNewPartyAddresses(updated);
      }
    } catch (err: any) {
      console.warn("GST verification failed:", err);
    } finally {
      setIsVerifyingGstin(false);
    }
  };

  const handleAddNewAddressSlot = (tag: "Home" | "Office" | "Warehouse" | "Branch" | "Other" = "Office") => {
    const newSlot = {
      id: `addr-${Date.now()}`,
      tag,
      street: "",
      city: newPartyAddresses[0]?.city || "",
      state: newPartyAddresses[0]?.state || "Andhra Pradesh",
      pincode: "",
      is_billing: false,
      is_shipping: true,
    };
    setNewPartyAddresses([...newPartyAddresses, newSlot]);
    setActiveAddrIndex(newPartyAddresses.length);
  };

  const handleRemoveAddressSlot = (idx: number) => {
    if (newPartyAddresses.length <= 1) {
      toast.error("Customer must have at least one address");
      return;
    }
    const filtered = newPartyAddresses.filter((_, i) => i !== idx);
    setNewPartyAddresses(filtered);
    setActiveAddrIndex(Math.max(0, idx - 1));
  };

  // Customer History & Pending Due Tracking
  const [customerSummary, setCustomerSummary] = useState<{
    total_invoices: number;
    total_spent: number;
    total_pending_due: number;
    last_purchase_date: string | null;
    unpaid_invoices?: any[];
  } | null>(null);
  const [includePreviousDueInBill, setIncludePreviousDueInBill] = useState(false);
  const [showPendingDueAlert, setShowPendingDueAlert] = useState(false);
  const [showCustomerLedger, setShowCustomerLedger] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [aiFetchingHsnId, setAiFetchingHsnId] = useState<string | null>(null);

  // Unpaid Invoices & Settlement State
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [settlingInvoice, setSettlingInvoice] = useState<any | null>(null);
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState<boolean>(false);
  const [unpaidSearchQuery, setUnpaidSearchQuery] = useState<string>("");

  const loadUnpaidInvoices = async () => {
    try {
      let localUnpaid: any[] = [];
      const stored = localStorage.getItem(posStorageKey);
      if (stored) {
        try {
          const list = JSON.parse(stored);
          localUnpaid = list.filter((i: any) => i.payment_status === "Unpaid" || i.payment_status === "Partial");
        } catch {
          localUnpaid = [];
        }
      }

      const apiRes = await invoicesApi.listInvoices({ page_size: 50 }).catch(() => null);
      let remoteUnpaid: any[] = [];
      if (apiRes && apiRes.items) {
        remoteUnpaid = apiRes.items
          .filter((inv: any) => {
            const st = String(inv.status || "").toLowerCase();
            return st === "draft" || st === "posted" || st === "unpaid" || st === "partial" || st === "partially_paid" || st === "overdue";
          })
          .map((inv: any) => ({
            id: inv.id,
            invoice_number: inv.invoice_number || `INV-${inv.id.slice(0, 6).toUpperCase()}`,
            customer_name: inv.customer_name || inv.customer?.name || "Walk-in Customer",
            customer_id: inv.customer_id,
            customer_phone: inv.customer?.phone || "",
            grand_total: inv.total_amount || 0,
            amount_received: Number(inv.amount_paid) || 0,
            payment_status: "Unpaid",
            invoice_date: inv.invoice_date,
            items: (inv.lines || []).map((l: any) => ({
              product_name: l.product_name || l.item_name || "Item",
              quantity: l.quantity || 1,
              unit_price: l.unit_price || 0,
              mrp: l.mrp || l.unit_price || 0,
              tax_rate: l.tax_rate || 18,
            })),
          }));
      }

      const map = new Map<string, any>();
      localUnpaid.forEach((inv) => map.set(inv.invoice_number, inv));

      const storedRecords = localStorage.getItem(posStorageKey);
      let allLocalRecords: any[] = [];
      if (storedRecords) {
        try {
          allLocalRecords = JSON.parse(storedRecords);
        } catch { }
      }

      remoteUnpaid.forEach((inv) => {
        if (!map.has(inv.invoice_number)) {
          const match = allLocalRecords.find(
            (x: any) => x.invoice_number === inv.invoice_number || x.id === inv.id
          );
          if (match && (match.payment_status === "Paid" || Number(match.amount_received) >= Number(match.grand_total))) {
            return; // Skip: already settled!
          }
          map.set(inv.invoice_number, inv);
        }
      });

      setUnpaidInvoices(Array.from(map.values()));
    } catch (e) {
      console.error("Error loading unpaid invoices:", e);
    }
  };

  const handleSelectUnpaidInvoice = async (inv: any) => {
    setSettlingInvoice(inv);
    setIncludePreviousDueInBill(false);
    setShowPendingDueAlert(false);
    setInvoiceDiscountValue(0);
    setCustomCharges([
      { id: "1", name: "Freight / Transport", amount: 0, tax_rate: 0 },
      { id: "2", name: "Packing Charge", amount: 0, tax_rate: 0 }
    ]);

    // Ensure customer is properly selected and in dropdown
    const custId = inv.customer_id || (inv.customer && inv.customer.id);
    const custName = inv.customer_name || (inv.customer && inv.customer.name) || "Customer";
    const custPhone = inv.customer_phone || (inv.customer && inv.customer.phone) || "";
    const custGst = inv.customer_gstin || (inv.customer && inv.customer.gst_number) || "";

    if (custId) {
      setSelectedCustomer(custId);
    }

    if (custName) {
      const found = customers.find((c) =>
        (custId && c.id === custId) ||
        c.name?.toLowerCase() === custName.toLowerCase()
      );
      if (found) {
        setSelectedCustomer(found.id);
      } else {
        const syntheticId = custId || `cust-temp-${Date.now()}`;
        const synthCustomer = {
          id: syntheticId,
          name: custName,
          phone: custPhone,
          gst_number: custGst,
          type: "Retail",
        };
        setCustomers((prev) => [synthCustomer, ...prev.filter((c) => c.id !== syntheticId)]);
        setSelectedCustomer(syntheticId);
      }
    }

    // Try fetching full remote invoice for 100% exact lines if available
    let loadedLines = inv.items || [];
    if (inv.id && inv.id.length > 10) {
      try {
        const full: any = await invoicesApi.getInvoice(inv.id);
        if (full && full.lines && full.lines.length > 0) {
          loadedLines = full.lines.map((l: any) => ({
            product_id: l.product_id || "",
            product_name: l.item_name || l.product_name || "Item",
            quantity: Number(l.quantity) || 1,
            unit_price: Number(l.unit_price) || 0,
            mrp: Number(l.mrp) || Math.ceil(Number(l.unit_price) * 1.25),
            tax_rate: Number(l.tax_rate) || 18,
            is_tax_inclusive: l.is_tax_inclusive === true,
          }));
        }
      } catch (err) {
        console.warn("Could not fetch remote invoice lines, using local fallback:", err);
      }
    }

    if (loadedLines && loadedLines.length > 0) {
      setItems(
        loadedLines.map((it: any) => {
          const unitP = Number(it.unit_price) || 0;
          const taxR = Number(it.tax_rate) || 18;
          const mrpVal = Number(it.mrp) > 0 ? Number(it.mrp) : Math.ceil(unitP * (1 + taxR / 100));
          return {
            id: Math.random().toString(36).substr(2, 9),
            product_id: it.product_id || "",
            product_name: it.product_name || "Item",
            quantity: Number(it.quantity) || 1,
            unit_price: unitP,
            mrp: mrpVal,
            tax_rate: taxR,
            is_tax_inclusive: it.is_tax_inclusive === true,
            discount_value: 0,
            discount_type: "percent",
            custom_note: `Settlement item for #${inv.invoice_number}`,
          };
        })
      );
    } else {
      setItems([
        {
          id: Math.random().toString(36).substr(2, 9),
          product_name: `Bill Settlement for #${inv.invoice_number}`,
          quantity: 1,
          unit_price: Number(inv.grand_total) || 0,
          mrp: Number(inv.grand_total) || 0,
          tax_rate: 0,
          is_tax_inclusive: true,
          discount_value: 0,
          discount_type: "percent",
        }
      ]);
    }

    setPaymentMode(inv.payment_mode && !inv.payment_mode.toLowerCase().includes("credit") && !inv.payment_mode.toLowerCase().includes("due") ? inv.payment_mode : "Cash");
    const previouslyPaid = Number(inv.amount_received || 0);
    const invoiceGrandTotal = Number(inv.grand_total || 0);
    const dueAmount = Math.max(0, invoiceGrandTotal - previouslyPaid);
    setAmountReceived(dueAmount > 0 ? dueAmount : invoiceGrandTotal || "");
    setNotes(`Paid settlement for original Unpaid Invoice #${inv.invoice_number}`);
    setIsUnpaidModalOpen(false);
    toast.success(`Loaded Invoice #${inv.invoice_number} (Due: ${currency.symbol}${dueAmount.toFixed(2)}) ready to settle!`);
  };

  const handleSwitchPricingTier = (newMode: "Retail" | "Wholesale" | "B2B") => {
    setPricingMode(newMode);
    setItems((prev) =>
      prev.map((item) => {
        const prod = products.find(
          (p) =>
            (item.product_id && p.id === item.product_id) ||
            (item.product_name && p.name && p.name.toLowerCase() === item.product_name.toLowerCase())
        );
        if (!prod) return item;
        const targetPrimaryPrice = getProductTierPrice(prod, item.quantity || 1, newMode);
        const factor = Number(item.conversion_factor) > 1 ? Number(item.conversion_factor) : 1;
        const effectivePrice =
          item.selected_uom === item.secondary_uom && factor > 1
            ? Number((targetPrimaryPrice / factor).toFixed(2))
            : targetPrimaryPrice;

        return {
          ...item,
          base_unit_price: targetPrimaryPrice,
          unit_price: effectivePrice,
        };
      })
    );
    toast.success(`Active Pricing Tier switched to ${newMode} Tier`);
  };

  const handleAIFetchHsn = async (itemId: string, productName: string) => {
    if (!productName.trim()) {
      toast.error("Please enter a product name first");
      return;
    }
    try {
      setAiFetchingHsnId(itemId);
      const res: any = await inventoryApi.suggestHsn({ name: productName });
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const currentPrice = Number(item.unit_price) || 0;
            const currentMrp = Number(item.mrp) || 0;

            const retailPrice = Number(res.estimated_selling_price) || (Number(res.estimated_mrp) ? Number((res.estimated_mrp * 0.85).toFixed(2)) : 150.0);
            const wholesalePrice = Number(res.estimated_wholesale_price) || Number((retailPrice * 0.85).toFixed(2));
            const b2bPrice = Number(res.estimated_b2b_price) || Number((retailPrice * 0.70).toFixed(2));

            const targetAiPrice =
              pricingMode === "B2B" ? b2bPrice : pricingMode === "Wholesale" ? wholesalePrice : retailPrice;
            const aiMrp = Number(res.estimated_mrp) || Number((retailPrice * 1.25).toFixed(2));

            const finalPrice = currentPrice > 0 ? currentPrice : targetAiPrice;
            const finalMrp = currentMrp > 0 ? currentMrp : aiMrp;

            return {
              ...item,
              hsn_code: res.hsn_code,
              tax_rate: res.gst_rate,
              is_tax_inclusive: false,
              unit_price: finalPrice,
              mrp: finalMrp,
            };
          }
          return item;
        })
      );

      const activeTierPrice =
        pricingMode === "B2B"
          ? (res.estimated_b2b_price || Math.round((res.estimated_selling_price || 150) * 0.70))
          : pricingMode === "Wholesale"
            ? (res.estimated_wholesale_price || Math.round((res.estimated_selling_price || 150) * 0.85))
            : (res.estimated_selling_price || Math.round((res.estimated_mrp || 180) * 0.85));

      const priceMsg = ` | ${pricingMode} Price: ₹${activeTierPrice} | MRP: ₹${res.estimated_mrp || Math.round(activeTierPrice * 1.25)}`;
      toast.success(`AI Auto-Classified: "${productName}" → HSN ${res.hsn_code} (${res.gst_rate}% GST)${priceMsg}`);
    } catch (e: any) {
      toast.error(e?.detail || "AI HSN Lookup failed");
    } finally {
      setAiFetchingHsnId(null);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const combined: any[] = [];
      const idSet = new Set<string>();

      const processProductItem = (p: any) => {
        if (!p || !p.id || idSet.has(String(p.id))) return;
        idSet.add(String(p.id));

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
        const rawWholesale = Number(
          p.wholesale_price && Number(p.wholesale_price) > 0
            ? p.wholesale_price
            : (specs.wholesale_price && Number(specs.wholesale_price) > 0
                ? specs.wholesale_price
                : 0)
        );
        const rawB2B = Number(
          p.b2b_price && Number(p.b2b_price) > 0
            ? p.b2b_price
            : (specs.b2b_price && Number(specs.b2b_price) > 0
                ? specs.b2b_price
                : 0)
        );

        const primaryUom = p.uom || p.uom_name || specs.primary_uom || specs.uom || p.unit || "Pcs";
        const secondaryUom = p.secondary_uom || specs.secondary_uom || "";
        const rawFactor = p.conversion_factor ?? specs.conversion_factor;
        const conversionFactor = Number(rawFactor) > 0 ? Number(rawFactor) : 1;

        combined.push({
          ...p,
          wholesale_price: rawWholesale,
          b2b_price: rawB2B,
          min_wholesale_qty: Number(p.min_wholesale_qty || specs.min_wholesale_qty || 1),
          min_b2b_qty: Number(p.min_b2b_qty || specs.min_b2b_qty || 1),
          uom: String(primaryUom),
          secondary_uom: String(secondaryUom),
          conversion_factor: conversionFactor,
          specifications: specs,
          stock: p.stock ?? p.initial_stock ?? 0,
          price: basePrice,
        });
      };

      // 1. Primary: Fetch inventory products (from Inventory Tab)
      try {
        const invRes: any = await inventoryApi.getProducts({ page_size: 500 });
        const invItems = invRes?.items || (Array.isArray(invRes) ? invRes : []);
        if (Array.isArray(invItems)) {
          invItems.forEach(processProductItem);
        }
      } catch (e) {
        console.warn("inventoryApi.getProducts error:", e);
      }

      // 2. Secondary: Fetch POS products and merge
      try {
        const posRes: any = await posApi.getProducts({ limit: 2000 });
        const posItems = posRes?.items || (Array.isArray(posRes) ? posRes : []);
        if (Array.isArray(posItems)) {
          posItems.forEach(processProductItem);
        }
      } catch (e) {
        console.warn("posApi.getProducts error:", e);
      }

      setProducts(combined);
    } catch (err) {
      console.error("Failed to load products for sales invoice:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadUnpaidInvoices();
    const handleSync = () => {
      loadUnpaidInvoices();
      if (!editingInvoice && !activeEditingInvoice && !isRecreatingInvoice) {
        const nextNum = getNextSequentialInvoiceNumber(invoiceType);
        setInvoiceNumber(nextNum);
      }
    };
    window.addEventListener("pos_invoices_updated", handleSync);
    window.addEventListener("storage", handleSync);

    const processCollectTarget = async () => {
      try {
        let parsed: any = null;
        const storedCollect = sessionStorage.getItem("pos_collect_invoice");
        if (storedCollect) {
          sessionStorage.removeItem("pos_collect_invoice");
          try {
            parsed = JSON.parse(storedCollect);
          } catch (e) {}
        }

        if (!parsed) {
          const urlParams = new URLSearchParams(window.location.search);
          const collectId = urlParams.get("collect_id");
          if (collectId) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collectId);
            if (isUUID) {
              const res = await invoicesApi.getInvoice(collectId).catch(() => null);
              if (res) parsed = res;
            }
          }
        }

        if (parsed) {
          handleSelectUnpaidInvoice(parsed);
        }
      } catch (e) {
        console.warn("Could not process collect target:", e);
      }
    };

    processCollectTarget();

    const processEditAndRecreateTarget = async () => {
      try {
        let editTarget: any = null;
        const storedEdit = sessionStorage.getItem("pos_edit_invoice");
        if (storedEdit) {
          sessionStorage.removeItem("pos_edit_invoice");
          try {
            editTarget = JSON.parse(storedEdit);
          } catch (e) {}
        }
        if (!editTarget) {
          const storedRecreate = sessionStorage.getItem("pos_recreate_invoice");
          if (storedRecreate) {
            sessionStorage.removeItem("pos_recreate_invoice");
            try {
              editTarget = JSON.parse(storedRecreate);
              setIsRecreatingInvoice(true);
            } catch (e) {}
          }
        }
        if (!editTarget) {
          const urlParams = new URLSearchParams(window.location.search);
          const editId = urlParams.get("edit_id");
          const recreateNum = urlParams.get("recreate_number");
          if (editId) {
            try {
              const raw = localStorage.getItem(posStorageKey);
              if (raw) {
                const list = JSON.parse(raw);
                const found = list.find((x: any) => x.id === editId || x.invoice_number === editId);
                if (found) editTarget = found;
              }
            } catch (e) {}
          } else if (recreateNum) {
            setIsRecreatingInvoice(true);
            setInvoiceNumber(recreateNum);
          }
        }
        if (editTarget) {
          setActiveEditingInvoice(editTarget);
          if (editTarget.invoice_number) {
            setInvoiceNumber(editTarget.invoice_number);
          }
          if (editTarget.is_recreating) {
            setIsRecreatingInvoice(true);
          }
        } else {
          // Check for recreate invoice number directly
          const storedRecreateNum = sessionStorage.getItem("pos_recreate_invoice_number");
          if (storedRecreateNum) {
            sessionStorage.removeItem("pos_recreate_invoice_number");
            setIsRecreatingInvoice(true);
            setInvoiceNumber(storedRecreateNum);
          }
        }
      } catch (e) {
        console.warn("Could not process edit/recreate target:", e);
      }
    };

    processEditAndRecreateTarget();

    const handleCollectSync = () => {
      processCollectTarget();
    };
    const handleEditSync = () => {
      processEditAndRecreateTarget();
    };
    window.addEventListener("pos_collect_invoice_trigger", handleCollectSync);
    window.addEventListener("pos_edit_invoice_trigger", handleEditSync);

    loadProducts();
    inventoryApi
      .getBatches()
      .then((bList: any) => setBatches(bList?.items || (Array.isArray(bList) ? bList : [])))
      .catch(() => setBatches([]));
    crmApi
      .getCustomers(1, 100)
      .then((data: any) => {
        const custList = data?.items || (Array.isArray(data) ? data : []);
        setCustomers((prev) => {
          const map = new Map();
          custList.forEach((c: any) => map.set(c.id, c));
          prev.forEach((c: any) => {
            if (!map.has(c.id)) {
              map.set(c.id, c);
            } else {
              const existing = map.get(c.id);
              map.set(c.id, { ...existing, ...c });
            }
          });
          return Array.from(map.values());
        });
      })
      .catch(console.error);
    fetchSalesEmployees()
      .then((emps) => {
        setSalesEmployees(emps);
        if (emps && emps.length > 0) {
          setSalesExecutive(emps[0].full_name);
        } else {
          setSalesExecutive("Sales Executive");
        }
      })
      .catch(console.error);

    bankApi
      .listBankAccounts({ page: 1, page_size: 50, status: "active" })
      .then((res: any) => {
        const bList = res?.items || (Array.isArray(res) ? res : []);
        setBankAccounts(bList);
        const defaultStored = localStorage.getItem("pos_default_bank_account_id");
        if (defaultStored && bList.some((b: any) => b.id === defaultStored)) {
          setSelectedBankAccountId(defaultStored);
        } else {
          const def = bList.find((b: any) => b.is_default);
          if (def) setSelectedBankAccountId(def.id);
        }
      })
      .catch(() => setBankAccounts([]));

    return () => {
      window.removeEventListener("pos_invoices_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("pos_collect_invoice_trigger", handleCollectSync);
      window.removeEventListener("pos_edit_invoice_trigger", handleEditSync);
    };
  }, []);

  const getProductTierPrice = (prod: any, qty: number = 1, activePricingMode = pricingMode) => {
    if (!prod) return 0;
    let specs: any = {};
    if (typeof prod.specifications === "string") {
      try {
        specs = JSON.parse(prod.specifications || "{}");
      } catch {
        specs = {};
      }
    } else if (prod.specifications && typeof prod.specifications === "object") {
      specs = prod.specifications;
    }
    const basePrice = Number(prod.selling_price || prod.price || prod.mrp || 0);
    const wholesalePrice = Number(
      prod.wholesale_price && Number(prod.wholesale_price) > 0
        ? prod.wholesale_price
        : (specs.wholesale_price && Number(specs.wholesale_price) > 0
            ? specs.wholesale_price
            : (basePrice > 0 ? Number((basePrice * 0.85).toFixed(2)) : 0))
    );
    const b2bPrice = Number(
      prod.b2b_price && Number(prod.b2b_price) > 0
        ? prod.b2b_price
        : (specs.b2b_price && Number(specs.b2b_price) > 0
            ? specs.b2b_price
            : (basePrice > 0 ? Number((basePrice * 0.70).toFixed(2)) : 0))
    );

    // If explicit tier mode is chosen, return set tier price (or tier-calculated price)
    if (activePricingMode === "B2B") {
      return b2bPrice > 0 ? b2bPrice : basePrice;
    }
    if (activePricingMode === "Wholesale") {
      return wholesalePrice > 0 ? wholesalePrice : basePrice;
    }

    // Default Retail mode: strictly use base retail selling price (e.g. ₹500)
    return basePrice;
  };

  const getProductBatchInfo = (prod: any, qty: number = 1, activePricingMode = pricingMode) => {
    if (!prod) return { batch_number: "", expiry_date: "", mrp: 0, unit_price: 0 };
    const basePrice = Number(prod.selling_price || prod.price || prod.mrp || 0);
    const targetPrice = getProductTierPrice(prod, qty, activePricingMode);

    const matchingBatches = batches.filter(
      (b) =>
        (b.product_id === prod.id ||
          (b.product_name && prod.name && b.product_name.toLowerCase() === prod.name.toLowerCase())) &&
        Number(b.remaining_quantity || b.quantity || 0) > 0
    ).sort(
      (a, b) =>
        new Date(a.expiry_date || "2099-12-31").getTime() -
        new Date(b.expiry_date || "2099-12-31").getTime()
    );

    const activeBatch = matchingBatches[0];
    const finalPrice =
      activePricingMode === "Retail" && Number(activeBatch?.selling_price) > 0
        ? Number(activeBatch.selling_price)
        : targetPrice;

    return {
      batch_number: activeBatch?.batch_number || "",
      expiry_date: activeBatch?.expiry_date ? String(activeBatch.expiry_date).slice(0, 10) : "",
      mrp: Number(activeBatch?.mrp) > 0 ? Number(activeBatch.mrp) : (Number(prod.mrp) > 0 ? Number(prod.mrp) : basePrice),
      unit_price: finalPrice,
    };
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerSummary(null);
      setCustomerWalletBalance(0);
      setIncludePreviousDueInBill(false);
      setShowPendingDueAlert(false);
      return;
    }
    const cust = customers.find((c: any) => c.id === selectedCustomer);
    if (!cust) return;

    const fetchSummary = async () => {
      try {
        const [summary, walletRes] = await Promise.all([
          invoicesApi.getCustomerSummary(cust.id || cust.name).catch(() => null),
          cust.id ? crmWalletApi.getBalance(cust.id).catch(() => null) : null
        ]);

        if (walletRes) {
          setCustomerWalletBalance(Number(walletRes?.balance) || 0);
        }

        let localInvoices: any[] = [];
        try {
          const stored = localStorage.getItem(posStorageKey);
          if (stored) {
            localInvoices = JSON.parse(stored);
          }
        } catch (e) {}

        const backendUnpaid = (summary?.unpaid_invoices || []).filter((inv: any) => {
          const rawStatus = String(inv.status || "").toLowerCase();
          const due = Number(inv.balance_due) || 0;
          return !["paid", "voided", "cancelled", "completed"].includes(rawStatus) && due > 0.05;
        });

        const localUnpaidForCust = localInvoices
          .filter((inv: any) => {
            const isMatch = (inv.customer_id && cust.id && inv.customer_id === cust.id) ||
              (inv.customer_name && cust.name && inv.customer_name.toLowerCase() === cust.name.toLowerCase()) ||
              (inv.customer_phone && cust.phone && inv.customer_phone === cust.phone);
            if (!isMatch) return false;

            const isPaid = inv.payment_status === "Paid" || (Number(inv.amount_received || 0) >= Number(inv.grand_total || 0) - 0.05);
            return !isPaid;
          })
          .map((inv: any) => ({
            id: inv.invoice_number || inv.id,
            realId: inv.id,
            invoice_date: inv.invoice_date,
            total_amount: Number(inv.grand_total || 0),
            balance_due: Math.max(0, Number(inv.grand_total || 0) - Number(inv.amount_received || 0)),
            status: inv.payment_status || "Unpaid"
          }))
          .filter((inv: any) => inv.balance_due > 0.05);

        const mergedMap = new Map<string, any>();
        backendUnpaid.forEach((inv: any) => {
          mergedMap.set(inv.invoice_number || inv.id, inv);
        });
        localUnpaidForCust.forEach((inv: any) => {
          if (!mergedMap.has(inv.id)) {
            mergedMap.set(inv.id, inv);
          }
        });

        const finalUnpaid = Array.from(mergedMap.values()).filter((inv: any) => Number(inv.balance_due) > 0.05);
        const totalPending = finalUnpaid.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

        setCustomerSummary({
          total_invoices: summary?.total_invoices || localInvoices.length,
          total_spent: summary?.total_spent || 0,
          total_pending_due: totalPending,
          last_purchase_date: summary?.last_purchase_date || null,
          unpaid_invoices: finalUnpaid
        });

        if (totalPending > 0.05) {
          setShowPendingDueAlert(true);
        } else {
          setShowPendingDueAlert(false);
          setIncludePreviousDueInBill(false);
        }
      } catch (err) {
        setCustomerSummary(null);
        setShowPendingDueAlert(false);
        setIncludePreviousDueInBill(false);
      }
    };

    fetchSummary();
  }, [selectedCustomer, customers, posStorageKey]);

  const handlePricingModeChange = (mode: "Retail" | "Wholesale" | "B2B") => {
    handleSwitchPricingTier(mode);
  };

  // Multi-Product Selection Modal State
  const [isMultiProductModalOpen, setIsMultiProductModalOpen] = useState(false);
  const [multiProductSearch, setMultiProductSearch] = useState("");
  const [multiProductCategory, setMultiProductCategory] = useState("all");
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isMultiProductModalOpen) {
      loadProducts();
    }
  }, [isMultiProductModalOpen]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_name: "",
        quantity: 1,
        primary_qty: 1,
        secondary_qty: 0,
        uom: "Pcs",
        secondary_uom: "",
        conversion_factor: 1,
        unit_price: 0,
        discount_value: 0,
        discount_type: "percent",
        tax_rate: 18,
        is_tax_inclusive: false,
        custom_note: "",
        is_note_open: false,
        is_search_open: false,
        search_query: "",
      },
    ]);
  };

  const handleAddFreeItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_name: "Free / Promo Item",
        quantity: 1,
        primary_qty: 1,
        secondary_qty: 0,
        uom: "Pcs",
        secondary_uom: "",
        conversion_factor: 1,
        unit_price: 0,
        discount_value: 100,
        discount_type: "percent",
        tax_rate: 0,
        is_tax_inclusive: false,
        is_free: true,
        custom_note: "FREE",
        is_note_open: false,
        is_search_open: false,
        search_query: "Free / Promo Item",
      },
    ]);
  };

  const toggleMultiSelectProduct = (productId: string) => {
    setSelectedProductQuantities((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  const updateMultiSelectQty = (productId: string, delta: number) => {
    setSelectedProductQuantities((prev) => {
      const currentQty = prev[productId] || 1;
      const nextQty = Math.max(1, currentQty + delta);
      return { ...prev, [productId]: nextQty };
    });
  };

  const handleAddMultipleProductsToInvoice = () => {
    const selectedIds = Object.keys(selectedProductQuantities);
    if (selectedIds.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    const newItems: InvoiceItem[] = [];
    selectedIds.forEach((pid) => {
      const prod = products.find((p) => p.id === pid);
      if (!prod) return;
      const qty = Math.max(1, Number(selectedProductQuantities[pid]) || 1);
      const batchInfo = getProductBatchInfo(prod, qty);
      const uomInfo = extractProductUomInfo(prod);
      const rateInfo = computeItemUomRates(batchInfo.unit_price, batchInfo.mrp, uomInfo);

      newItems.push({
        id: Math.random().toString(36).substr(2, 9),
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        primary_qty: qty,
        secondary_qty: 0,
        uom: rateInfo.uom,
        secondary_uom: rateInfo.secondary_uom,
        conversion_factor: rateInfo.conversion_factor,
        selected_uom: rateInfo.selected_uom,
        base_unit_price: rateInfo.base_unit_price,
        base_mrp: rateInfo.base_mrp,
        unit_price: rateInfo.unit_price,
        mrp: rateInfo.mrp,
        batch_number: batchInfo.batch_number,
        expiry_date: batchInfo.expiry_date,
        discount_value: 0,
        discount_type: "percent",
        tax_rate: prod.tax_percent || 18,
        is_tax_inclusive: prod.is_tax_inclusive === true,
      });
    });

    setItems((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} products to sales invoice!`);
    setSelectedProductQuantities({});
    setIsMultiProductModalOpen(false);
  };

  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim() !== "") {
      const queryCode = barcodeInput.trim();
      const product = products.find((p) => p.barcode === queryCode || p.sku === queryCode);
      if (product) {
        const batchInfo = getProductBatchInfo(product, 1);
        const uomInfo = extractProductUomInfo(product);
        const rateInfo = computeItemUomRates(batchInfo.unit_price, batchInfo.mrp, uomInfo);

        setItems((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            primary_qty: 1,
            secondary_qty: 0,
            uom: rateInfo.uom,
            secondary_uom: rateInfo.secondary_uom,
            conversion_factor: rateInfo.conversion_factor,
            selected_uom: rateInfo.selected_uom,
            base_unit_price: rateInfo.base_unit_price,
            base_mrp: rateInfo.base_mrp,
            unit_price: rateInfo.unit_price,
            mrp: rateInfo.mrp,
            batch_number: batchInfo.batch_number,
            expiry_date: batchInfo.expiry_date,
            discount_value: 0,
            discount_type: "percent",
            tax_rate: product.tax_percent || 18,
            is_tax_inclusive: product.is_tax_inclusive === true,
          },
        ]);
        toast.success(`Added ${product.name} (${pricingMode} Price)`);
        setBarcodeInput("");
        return;
      }

      // If not in local products state, trigger real-time Master Catalog / RAG / Go-UPC Lookup
      toast.info(`Searching master catalog & web RAG for barcode ${queryCode}...`);
      try {
        const res = await posApi.lookupBarcode(queryCode);
        if (res && res.success && res.product && res.product.name) {
          const p = res.product;
          const basePrice = Number(p.selling_price || p.price || p.mrp || 0);
          const wholesalePrice = Number(p.wholesale_price || basePrice);
          const b2bPrice = Number(p.b2b_price || basePrice);
          const targetPrice = pricingMode === "B2B" ? b2bPrice : (pricingMode === "Wholesale" ? wholesalePrice : basePrice);
          const uomInfo = extractProductUomInfo(p);
          const rateInfo = computeItemUomRates(targetPrice, p.mrp || 0, uomInfo);

          setItems((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              product_id: p.id,
              product_name: p.name,
              quantity: 1,
              primary_qty: 1,
              secondary_qty: 0,
              uom: rateInfo.uom,
              secondary_uom: rateInfo.secondary_uom,
              conversion_factor: rateInfo.conversion_factor,
              selected_uom: rateInfo.selected_uom,
              base_unit_price: rateInfo.base_unit_price,
              base_mrp: rateInfo.base_mrp,
              unit_price: rateInfo.unit_price,
              mrp: rateInfo.mrp,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: p.gst || 18,
              is_tax_inclusive: p.is_tax_inclusive === true,
            },
          ]);
          toast.success(`Found & Added: ${p.name} (${p.source || "Master Catalog"})`);
          setBarcodeInput("");
        } else {
          toast.error(`Barcode ${queryCode} not found in catalog or RAG web registry`);
        }
      } catch (err: any) {
        toast.error(`Barcode search error: ${err.message || "Failed lookup"}`);
      }
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "product_id" && value) {
            const product = products.find((p) => p.id === value);
            if (product) {
              const uomInfo = extractProductUomInfo(product);
              const currentQty = Number(updated.quantity) || 1;
              const batchInfo = getProductBatchInfo(product, currentQty);
              const rateInfo = computeItemUomRates(batchInfo.unit_price, batchInfo.mrp, uomInfo);

              updated.product_name = product.name;
              updated.uom = rateInfo.uom;
              updated.secondary_uom = rateInfo.secondary_uom;
              updated.conversion_factor = rateInfo.conversion_factor;
              updated.selected_uom = rateInfo.selected_uom;
              updated.base_unit_price = rateInfo.base_unit_price;
              updated.base_mrp = rateInfo.base_mrp;
              updated.unit_price = rateInfo.unit_price;
              updated.mrp = rateInfo.mrp;
              updated.hsn_code = product.hsn_code || "1905";
              updated.tax_rate = Number(product.tax_percent) > 0 ? Number(product.tax_percent) : 18;
              updated.is_tax_inclusive = product.is_tax_inclusive === true;
              updated.batch_number = batchInfo.batch_number;
              updated.expiry_date = batchInfo.expiry_date;
              if (!updated.quantity || updated.quantity === 0) {
                updated.quantity = 1;
                updated.primary_qty = 1;
                updated.secondary_qty = 0;
              }
            }
          }
          if (field === "selected_uom") {
            const newUom = String(value);
            updated.selected_uom = newUom;
            const factor = Number(updated.conversion_factor) > 1 ? Number(updated.conversion_factor) : 1;
            const basePrice = Number(updated.base_unit_price ?? updated.unit_price) || 0;
            const baseMrp = Number(updated.base_mrp ?? updated.mrp) || 0;

            if (newUom === updated.secondary_uom && factor > 1) {
              // Switched to Secondary / Alternate unit (e.g. Piece from Box)
              updated.unit_price = Number((basePrice / factor).toFixed(2));
              updated.mrp = baseMrp > 0 ? Number((baseMrp / factor).toFixed(2)) : 0;
            } else {
              // Switched to Primary / Base unit (e.g. Box)
              updated.unit_price = basePrice;
              updated.mrp = baseMrp;
            }
          }
          if (field === "unit_price") {
            const newPrice = Math.max(0, Number(value) || 0);
            updated.unit_price = newPrice;
            const factor = Number(updated.conversion_factor) > 1 ? Number(updated.conversion_factor) : 1;
            if (updated.selected_uom === updated.secondary_uom && factor > 1) {
              updated.base_unit_price = Number((newPrice * factor).toFixed(2));
            } else {
              updated.base_unit_price = newPrice;
            }
          }
          if (field === "mrp") {
            const newMrp = Math.max(0, Number(value) || 0);
            updated.mrp = newMrp;
            const factor = Number(updated.conversion_factor) > 1 ? Number(updated.conversion_factor) : 1;
            if (updated.selected_uom === updated.secondary_uom && factor > 1) {
              updated.base_mrp = Number((newMrp * factor).toFixed(2));
            } else {
              updated.base_mrp = newMrp;
            }
          }
          if (field === "primary_qty") {
            const pQty = Math.max(0, Number(value) || 0);
            const sQty = Math.max(0, Number(item.secondary_qty) || 0);
            const factor = Number(item.conversion_factor) > 0 ? Number(item.conversion_factor) : 1;
            const computedQty = pQty + (sQty / factor);
            updated.primary_qty = pQty;
            updated.quantity = Number(computedQty.toFixed(4));
            if (updated.product_id) {
              const product = products.find((p) => p.id === updated.product_id);
              if (product) {
                const batchInfo = getProductBatchInfo(product, updated.quantity);
                updated.unit_price = batchInfo.unit_price;
                if (batchInfo.mrp) updated.mrp = batchInfo.mrp;
              }
            }
          }
          if (field === "secondary_qty") {
            const sQty = Math.max(0, Number(value) || 0);
            const pQty = Math.max(0, Number(item.primary_qty) || 0);
            const factor = Number(item.conversion_factor) > 0 ? Number(item.conversion_factor) : 1;
            const computedQty = pQty + (sQty / factor);
            updated.secondary_qty = sQty;
            updated.quantity = Number(computedQty.toFixed(4));
            if (updated.product_id) {
              const product = products.find((p) => p.id === updated.product_id);
              if (product) {
                const batchInfo = getProductBatchInfo(product, updated.quantity);
                updated.unit_price = batchInfo.unit_price;
                if (batchInfo.mrp) updated.mrp = batchInfo.mrp;
              }
            }
          }
          if (field === "conversion_factor") {
            const factor = Math.max(1, Number(value) || 1);
            updated.conversion_factor = factor;
            const pQty = Math.max(0, Number(item.primary_qty) || 0);
            const sQty = Math.max(0, Number(item.secondary_qty) || 0);
            updated.quantity = Number((pQty + (sQty / factor)).toFixed(4));
          }
          if (field === "quantity") {
            const newQty = Math.max(0, Number(value) || 0);
            updated.quantity = newQty;
            const factor = Number(item.conversion_factor) > 0 ? Number(item.conversion_factor) : 1;
            if (item.secondary_uom && factor > 1) {
              updated.primary_qty = Math.floor(newQty);
              updated.secondary_qty = Math.round((newQty - Math.floor(newQty)) * factor);
            } else {
              updated.primary_qty = newQty;
              updated.secondary_qty = 0;
            }
            if (updated.product_id) {
              const product = products.find((p) => p.id === updated.product_id);
              if (product) {
                const batchInfo = getProductBatchInfo(product, newQty);
                updated.unit_price = batchInfo.unit_price;
                if (batchInfo.mrp) updated.mrp = batchInfo.mrp;
              }
            }
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const removeItem = (id: string) => setItems(items.filter((item) => item.id !== id));

  // Dynamic Invoice Discount State
  const [invoiceDiscountMode, setInvoiceDiscountMode] = useState<"before_tax" | "after_tax">("before_tax");
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<"percent" | "amount">("percent");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<number>(0);

  // Calculated totals with GST Inclusive vs Exclusive Tax Modes
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let totalTaxableValue = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const isIncl = item.is_tax_inclusive === true;
    const price = Number(item.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    const taxRate = Number(item.tax_rate) || 0;

    const lineGross = qty * price;
    const dAmt = item.discount_type === "percent"
      ? lineGross * (Number(item.discount_value || 0) / 100)
      : Math.min(Number(item.discount_value || 0), lineGross);

    const effectiveGross = Math.max(0, lineGross - dAmt);
    let lineTaxable = 0;
    let lineTax = 0;

    if (isIncl) {
      // Tax Inclusive: Unit price already includes GST
      lineTaxable = taxRate > 0 ? effectiveGross / (1 + taxRate / 100) : effectiveGross;
      lineTax = effectiveGross - lineTaxable;
    } else {
      // Tax Exclusive (Default): GST is added ON TOP of unit price
      lineTaxable = effectiveGross;
      lineTax = (lineTaxable * taxRate) / 100;
    }

    subtotal += lineGross;
    itemDiscountTotal += dAmt;
    totalTaxableValue += lineTaxable;
    totalTax += lineTax;
  });

  // 1. Before-Tax Invoice Discount
  let beforeTaxDiscount = 0;
  if (invoiceDiscountMode === "before_tax" && invoiceDiscountValue > 0) {
    beforeTaxDiscount = invoiceDiscountType === "percent"
      ? totalTaxableValue * (invoiceDiscountValue / 100)
      : Math.min(invoiceDiscountValue, totalTaxableValue);
  }

  const taxableValue = Math.max(0, totalTaxableValue - beforeTaxDiscount);
  const effectiveTotalTax = totalTaxableValue > 0 ? (totalTax * (taxableValue / totalTaxableValue)) : 0;

  // Additional charges: base amount + GST on each charge
  const baseAdditionalCharges = customCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const chargesGstTotal = customCharges.reduce((sum, c) => {
    const amt = Number(c.amount || 0);
    return sum + (amt * (Number(c.tax_rate || 0) / 100));
  }, 0);
  const totalAdditionalCharges = baseAdditionalCharges + chargesGstTotal;
  const combinedTax = effectiveTotalTax + chargesGstTotal;
  const isInterstateTax = gstType === "igst";
  const posGstBreakdown = computeGstBreakdown(items, isInterstateTax);

  // Gross total before after-tax discount
  const grossBillAmount = taxableValue + combinedTax + baseAdditionalCharges;

  // 3. After-Tax Invoice Discount
  let afterTaxDiscount = 0;
  if (invoiceDiscountMode === "after_tax" && invoiceDiscountValue > 0) {
    afterTaxDiscount = invoiceDiscountType === "percent"
      ? grossBillAmount * (invoiceDiscountValue / 100)
      : Math.min(invoiceDiscountValue, grossBillAmount);
  }

  const totalDiscount = itemDiscountTotal + beforeTaxDiscount + afterTaxDiscount;
  const previousDueAmount = (!settlingInvoice && includePreviousDueInBill && customerSummary?.total_pending_due) ? Number(customerSummary.total_pending_due) : 0;
  const baseRawTotal = Math.max(0, grossBillAmount - afterTaxDiscount);
  const rawTotal = baseRawTotal + previousDueAmount;
  const roundOff = autoRoundOff ? Math.round(rawTotal) - rawTotal : 0;
  const grandTotal = autoRoundOff ? Math.round(rawTotal) : rawTotal;

  const activeCustomerObj = customers.find((c) => c.id === selectedCustomer);

  const handleCreateNewParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return toast.error("Party name is required");
    if (!newPartyPhone.trim()) return toast.error("Phone number is required");

    const primaryBilling = newPartyAddresses.find(a => a.is_billing) || newPartyAddresses[0];
    const primaryShipping = newPartyAddresses.find(a => a.is_shipping) || newPartyAddresses[0];

    const fullBillingAddress = [primaryBilling?.street, primaryBilling?.city, primaryBilling?.state, primaryBilling?.pincode].filter(Boolean).join(", ");
    const fullShippingAddress = [primaryShipping?.street, primaryShipping?.city, primaryShipping?.state, primaryShipping?.pincode].filter(Boolean).join(", ");

    try {
      const created = await crmApi.createCustomer({
        name: newPartyName.trim(),
        phone: newPartyPhone.trim() || undefined,
        email: newPartyEmail.trim() || undefined,
        company_name: newPartyCompany.trim() || undefined,
        customer_type: newPartyType || "Retail",
        gst_number: newPartyGST.trim().toUpperCase() || undefined,
        address: fullBillingAddress || undefined,
        billing_address: fullBillingAddress || undefined,
        shipping_address: fullShippingAddress || undefined,
        city: primaryBilling?.city || primaryShipping?.city || undefined,
        state: primaryBilling?.state || primaryShipping?.state || undefined,
        postal_code: primaryBilling?.pincode || primaryShipping?.pincode || undefined,
        addresses: newPartyAddresses.map((a, i) => ({
          id: a.id || `addr-${i + 1}`,
          label: a.tag || "Primary",
          street: a.street,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          country: "India",
          is_default_billing: a.is_billing,
          is_default_shipping: a.is_shipping,
        })),
        meta: {
          addresses: newPartyAddresses,
        },
      });
      const customerObj = created.data || created;
      customerObj.state = primaryBilling?.state || "Andhra Pradesh";
      customerObj.billing_address = fullBillingAddress;
      customerObj.shipping_address = fullShippingAddress;
      customerObj.addresses = newPartyAddresses;
      customerObj.selectedDeliveryAddress = primaryShipping;

      // Update in local customer state (replace if existing, or prepend if new)
      const existingIdx = customers.findIndex(c => c.id === customerObj.id || (customerObj.phone && c.phone && c.phone === customerObj.phone));
      if (existingIdx >= 0) {
        const updatedCusts = [...customers];
        updatedCusts[existingIdx] = { ...updatedCusts[existingIdx], ...customerObj };
        setCustomers(updatedCusts);
      } else {
        setCustomers([customerObj, ...customers]);
      }

      setSelectedCustomer(customerObj.id);
      setSelectedDeliveryAddress(primaryShipping);

      // Check Inter-State vs Intra-State
      const primaryState = primaryShipping?.state || primaryBilling?.state || "";
      const cleanGst = newPartyGST.trim().toUpperCase();
      if (getIsInterstate(primaryState, cleanGst)) {
        setGstType("igst");
        toast.info(`Inter-State Customer Selected (${primaryState || "Inter-State"}). Tax switched to IGST.`);
      } else {
        setGstType("cgst_sgst");
      }

      setIsAddPartyOpen(false);
      setNewPartyName("");
      setNewPartyPhone("");
      setNewPartyEmail("");
      setNewPartyCompany("");
      setNewPartyGST("");
      setNewPartyAddresses([
        {
          id: "addr-1",
          tag: "Home",
          street: "",
          city: "",
          state: "Andhra Pradesh",
          pincode: "",
          is_billing: true,
          is_shipping: true,
        },
      ]);
      setActiveAddrIndex(0);
      setNewPartyType("Retail");
      toast.success(`Party "${customerObj.name}" selected with ${newPartyAddresses.length} address location(s)!`);
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to create party");
    }
  };

  // Party Details Quick Edit Modal State (Edit customer mobile, address, GSTIN, name on this bill)
  const [isEditPartyDetailsModalOpen, setIsEditPartyDetailsModalOpen] = useState(false);
  const [editPartyForm, setEditPartyForm] = useState({
    name: "",
    phone: "",
    email: "",
    gst_number: "",
    billing_street: "",
    billing_city: "",
    billing_state: "Andhra Pradesh",
    billing_pincode: "",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "Andhra Pradesh",
    shipping_pincode: "",
    same_as_billing: true,
    update_in_crm: true,
  });
  const [isLookingUpEditPin, setIsLookingUpEditPin] = useState(false);

  const handleOpenEditPartyDetails = () => {
    const cust = customers.find((c) => c.id === selectedCustomer);
    if (!cust) {
      toast.error("Please select a customer first to edit details");
      return;
    }
    const bStreet = selectedBillingAddress?.street || cust.billing_address || cust.address || "";
    const bCity = selectedBillingAddress?.city || cust.city || "";
    const bState = selectedBillingAddress?.state || cust.state || "Andhra Pradesh";
    const bPincode = selectedBillingAddress?.pincode || cust.postal_code || cust.pincode || "";

    const sStreet = selectedDeliveryAddress?.street || cust.shipping_address || bStreet;
    const sCity = selectedDeliveryAddress?.city || cust.city || bCity;
    const sState = selectedDeliveryAddress?.state || cust.state || bState;
    const sPincode = selectedDeliveryAddress?.pincode || cust.postal_code || cust.pincode || bPincode;

    const isSame =
      (!selectedDeliveryAddress && !cust.shipping_address) ||
      (sStreet === bStreet && sCity === bCity && sState === bState && sPincode === bPincode);

    setEditPartyForm({
      name: cust.name || "",
      phone: cust.phone || "",
      email: cust.email || "",
      gst_number: selectedBillingAddress?.gst_number || cust.gst_number || "",
      billing_street: bStreet,
      billing_city: bCity,
      billing_state: bState,
      billing_pincode: bPincode,
      shipping_street: isSame ? bStreet : sStreet,
      shipping_city: isSame ? bCity : sCity,
      shipping_state: isSame ? bState : sState,
      shipping_pincode: isSame ? bPincode : sPincode,
      same_as_billing: isSame,
      update_in_crm: true,
    });
    setIsEditPartyDetailsModalOpen(true);
  };

  const handleEditPartyPincode = async (val: string, type: "billing" | "shipping") => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (type === "billing") {
      setEditPartyForm((prev) => ({
        ...prev,
        billing_pincode: clean,
        shipping_pincode: prev.same_as_billing ? clean : prev.shipping_pincode,
      }));
    } else {
      setEditPartyForm((prev) => ({ ...prev, shipping_pincode: clean }));
    }

    if (clean.length === 6) {
      setIsLookingUpEditPin(true);
      try {
        const res = await lookupPincode(clean);
        if (res) {
          const matchedState = INDIAN_STATES.find(
            (s) => s.name.toLowerCase() === res.state.toLowerCase() || res.state.toLowerCase().includes(s.name.toLowerCase())
          )?.name || res.state;

          if (type === "billing") {
            setEditPartyForm((prev) => ({
              ...prev,
              billing_city: res.city || prev.billing_city,
              billing_state: matchedState || prev.billing_state,
              billing_street: prev.billing_street || res.area || "",
              shipping_city: prev.same_as_billing ? (res.city || prev.shipping_city) : prev.shipping_city,
              shipping_state: prev.same_as_billing ? (matchedState || prev.shipping_state) : prev.shipping_state,
              shipping_street: prev.same_as_billing ? (prev.shipping_street || res.area || "") : prev.shipping_street,
            }));
          } else {
            setEditPartyForm((prev) => ({
              ...prev,
              shipping_city: res.city || prev.shipping_city,
              shipping_state: matchedState || prev.shipping_state,
              shipping_street: prev.shipping_street || res.area || "",
            }));
          }
        }
      } catch (e) {
      } finally {
        setIsLookingUpEditPin(false);
      }
    }
  };

  const handleSavePartyDetailsEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPartyForm.name.trim()) {
      toast.error("Customer / Party name is required");
      return;
    }

    const fullBillingStr = [
      editPartyForm.billing_street,
      editPartyForm.billing_city,
      editPartyForm.billing_state,
      editPartyForm.billing_pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const fullShippingStr = editPartyForm.same_as_billing
      ? fullBillingStr
      : [
          editPartyForm.shipping_street,
          editPartyForm.shipping_city,
          editPartyForm.shipping_state,
          editPartyForm.shipping_pincode,
        ]
          .filter(Boolean)
          .join(", ");

    const cleanGst = editPartyForm.gst_number.trim().toUpperCase();

    const updatedBillingAddr = {
      id: selectedBillingAddress?.id || "addr-bill-custom",
      tag: "Billing Address",
      street: editPartyForm.billing_street,
      city: editPartyForm.billing_city,
      state: editPartyForm.billing_state,
      pincode: editPartyForm.billing_pincode,
      gst_number: cleanGst,
      is_default_billing: true,
    };

    const updatedDeliveryAddr = editPartyForm.same_as_billing
      ? updatedBillingAddr
      : {
          id: selectedDeliveryAddress?.id || "addr-ship-custom",
          tag: "Delivery Address",
          street: editPartyForm.shipping_street,
          city: editPartyForm.shipping_city,
          state: editPartyForm.shipping_state,
          pincode: editPartyForm.shipping_pincode,
          gst_number: cleanGst,
          is_default_shipping: true,
        };

    setSelectedBillingAddress(updatedBillingAddr);
    setSelectedDeliveryAddress(updatedDeliveryAddr);

    // Update customers list in local state
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === selectedCustomer) {
          return {
            ...c,
            name: editPartyForm.name.trim(),
            phone: editPartyForm.phone.trim(),
            email: editPartyForm.email.trim(),
            gst_number: cleanGst,
            address: fullBillingStr,
            billing_address: fullBillingStr,
            shipping_address: fullShippingStr,
            city: editPartyForm.billing_city,
            state: editPartyForm.billing_state,
            postal_code: editPartyForm.billing_pincode,
            pincode: editPartyForm.billing_pincode,
          };
        }
        return c;
      })
    );

    // Recalculate tax mode (IGST vs CGST+SGST)
    const targetState = updatedDeliveryAddr.state || updatedBillingAddr.state;
    if (getIsInterstate(targetState, cleanGst, fullShippingStr || fullBillingStr)) {
      setGstType("igst");
      toast.info(`Inter-State destination detected (${targetState}). Tax switched to IGST.`);
    } else {
      setGstType("cgst_sgst");
    }

    // Optionally update CRM customer directory if checked and valid UUID
    if (editPartyForm.update_in_crm && selectedCustomer && isValidUUID(selectedCustomer)) {
      crmCustomersApi
        .update(selectedCustomer, {
          name: editPartyForm.name.trim(),
          phone: editPartyForm.phone.trim() || undefined,
          email: editPartyForm.email.trim() || undefined,
          gst_number: cleanGst || undefined,
          address: fullBillingStr || undefined,
          billing_address: fullBillingStr || undefined,
          shipping_address: fullShippingStr || undefined,
          city: editPartyForm.billing_city || undefined,
          state: editPartyForm.billing_state || undefined,
          postal_code: editPartyForm.billing_pincode || undefined,
        })
        .catch((err: any) => console.warn("CRM customer update note:", err));
    }

    setIsEditPartyDetailsModalOpen(false);
    toast.success("Customer details updated for this invoice!");
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return toast.error("Product name is required");
    const unitPriceVal = Number(newProdPrice) || 0;
    const mrpVal = Number(newProdMrp) || unitPriceVal;
    const wholesaleVal = Number(newProdWholesalePrice) || Number((unitPriceVal * 0.85).toFixed(2));
    const b2bVal = Number(newProdB2bPrice) || Number((unitPriceVal * 0.70).toFixed(2));
    const skuVal = newProdSku.trim() || `SKU-${Date.now().toString().slice(-4)}`;
    const barcodeVal = newProdBarcode.trim() || `BC-${Date.now().toString().slice(-4)}`;

    const generatedProduct: any = {
      id: `prod-${Date.now()}`,
      name: newProdName.trim(),
      sku: skuVal,
      barcode: barcodeVal,
      category: newProdCategory,
      selling_price: unitPriceVal,
      price: unitPriceVal,
      wholesale_price: wholesaleVal,
      b2b_price: b2bVal,
      mrp: mrpVal,
      tax_percent: Number(newProdTax) || 18,
      stock_quantity: Number(newProdStock) || 100,
      stock: Number(newProdStock) || 100,
      image_url: newProdImage || undefined,
    };

    try {
      if (typeof (inventoryApi as any)?.createProduct === "function") {
        const res = await (inventoryApi as any).createProduct(generatedProduct);
        if (res && res.id) generatedProduct.id = res.id;
      } else if (typeof (posApi as any)?.createProduct === "function") {
        const res = await (posApi as any).createProduct(generatedProduct);
        if (res && res.id) generatedProduct.id = res.id;
      }
    } catch (err) {
      console.warn("Could not persist product to backend API, saved locally:", err);
    }

    const targetTierPrice =
      pricingMode === "B2B" ? b2bVal : pricingMode === "Wholesale" ? wholesaleVal : unitPriceVal;

    setProducts([generatedProduct, ...products]);
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        product_id: generatedProduct.id,
        product_name: generatedProduct.name,
        quantity: 1,
        unit_price: targetTierPrice,
        mrp: generatedProduct.mrp,
        discount_value: 0,
        discount_type: "percent",
        tax_rate: generatedProduct.tax_percent,
        is_tax_inclusive: true,
      },
    ]);

    setIsAddProductOpen(false);
    setNewProdName("");
    setNewProdSku("");
    setNewProdBarcode("");
    setNewProdPrice("");
    setNewProdWholesalePrice("");
    setNewProdB2bPrice("");
    setNewProdMrp("");
    setNewProdImage("");
    toast.success(`Created "${generatedProduct.name}" & added to bill!`);
  };

  const [printedBill, setPrintedBill] = useState<any>(null);
  const [fullInvoiceModalData, setFullInvoiceModalData] = useState<FullInvoiceData | null>(null);
  const [isFullInvoiceOpen, setIsFullInvoiceOpen] = useState(false);
  const [autoPrintFullInvoice, setAutoPrintFullInvoice] = useState(false);
  const [isEWayBillOpen, setIsEWayBillOpen] = useState(false);

  const getSelectedBankDetailsString = (): string => {
    if (!selectedBankAccountId) return "";
    const b = bankAccounts.find((x) => x.id === selectedBankAccountId);
    if (!b) return "";
    return `Bank: ${b.bank_name || b.name} | A/C: ${b.account_number} | IFSC: ${b.ifsc_code}${b.branch_name ? ` | Branch: ${b.branch_name}` : ""}`;
  };

  const constructFullInvoicePayload = (): FullInvoiceData => {
    const customerObj = customers.find((c) => c.id === selectedCustomer);
    return {
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      original_invoice_ref: originalInvoiceRef || undefined,
      original_invoice_date: originalInvoiceDate || undefined,
      note_reason: (invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE") ? noteReason : undefined,
      po_number: poNumber || undefined,
      po_date: poDate || undefined,
      vehicle_number: vehicleNumber || undefined,
      driver_name: driverName || undefined,
      driver_phone: driverPhone || undefined,
      transporter_name: transporterName || undefined,
      eway_bill_number: ewayBillNumber || undefined,
      eway_bill_date: ewayBillDate || undefined,
      lr_number: lrNumber || undefined,
      dispatch_mode: dispatchMode || undefined,
      invoice_date: invoiceDate,
      due_date: dueDate,
      customerName: customerObj?.name || 'Walk-in Customer',
      customerPhone: customerObj?.phone || '',
      customerEmail: customerObj?.email || '',
      customerCompany: customerObj?.company || '',
      customerGST: selectedBillingAddress?.gst_number || customerObj?.gst_number || '',
      customerAddress: selectedBillingAddress ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state, selectedBillingAddress.pincode].filter(Boolean).join(", ") : (customerObj?.address || ''),
      customerBillingAddress: selectedBillingAddress ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state, selectedBillingAddress.pincode].filter(Boolean).join(", ") : (customerObj?.billing_address || customerObj?.address || ''),
      customerShippingAddress: selectedDeliveryAddress ? [selectedDeliveryAddress.street, selectedDeliveryAddress.city, selectedDeliveryAddress.state, selectedDeliveryAddress.pincode].filter(Boolean).join(", ") : (customerObj?.shipping_address || ''),
      customerType: pricingMode === "B2B" ? "B2B Contract" : (pricingMode === "Wholesale" ? "Wholesale" : (customerObj?.customer_type || customerObj?.type || customerObj?.category || 'Retail')),
      pricing_mode: pricingMode,
      pricing_tier: pricingMode,
      items: items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name || 'Item',
        hsn_code: it.hsn_code,
        quantity: Number(it.quantity || 0),
        primary_qty: it.primary_qty,
        secondary_qty: it.secondary_qty,
        uom: it.uom,
        secondary_uom: it.secondary_uom,
        conversion_factor: it.conversion_factor,
        unit: it.uom || 'Pcs',
        unit_price: Number(it.unit_price || 0),
        mrp: Number(it.mrp || 0),
        discount_type: it.discount_type === 'amount' ? 'fixed' : (it.discount_type as any),
        discount_value: Number(it.discount_value || 0),
        tax_rate: Number(it.tax_rate || 0),
      })),
      subtotal: subtotal,
      taxable_value: taxableValue,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      cgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
      sgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
      igst_amount: gstType === 'igst' ? totalTax : 0,
      gst_type: gstType,
      is_interstate: gstType === 'igst',
      additional_charges: customCharges
        .filter(c => Number(c.amount) > 0)
        .map(c => ({ name: c.name || 'Additional Charge', amount: Number(c.amount) })),
      round_off: autoRoundOff ? roundOff : undefined,
      grand_total: grandTotal,
      payment_method: paymentMode,
      payment_status: paymentMode === "Credit" ? 'UNPAID' : (Number(amountReceived) >= grandTotal ? 'PAID' : 'PARTIAL'),
      amount_received: paymentMode !== "Credit" && amountReceived !== "" ? Number(amountReceived) : undefined,
      terms: termsAndConditions || undefined,
      notes: notes || undefined,
    };
  };

  const handlePreviewFullInvoice = () => {
    if (items.length === 0) return toast.error("Please add at least one item to preview invoice.");
    const payload = constructFullInvoicePayload();
    setFullInvoiceModalData(payload);
    setAutoPrintFullInvoice(false);
    setIsFullInvoiceOpen(true);
  };

  const handlePrintThermal = () => {
    if (items.length === 0) return toast.error("Please add items to invoice before printing receipt.");
    const customerObj = customers.find((c) => c.id === selectedCustomer);
    const billData = {
      invoice_number: invoiceNumber,
      date: invoiceDate,
      customerName: customerObj?.name || 'Walk-in Customer',
      customerPhone: customerObj?.phone || '',
      gst_type: gstType,
      is_interstate: gstType === 'igst',
      items: items.map(it => ({
        name: it.product_name || 'Item',
        quantity: it.quantity,
        unit_price: it.unit_price,
        hsn_code: it.hsn_code,
        discount: it.discount_type === 'percent' ? (it.quantity * it.unit_price * it.discount_value / 100) : it.discount_value,
        subtotal: (it.quantity * it.unit_price) - (it.discount_type === 'percent' ? (it.quantity * it.unit_price * it.discount_value / 100) : it.discount_value)
      })),
      subtotal: subtotal,
      discount_amount: totalDiscount,
      tax_amount: combinedTax,
      grand_total: grandTotal,
      payment_method: paymentMode,
      payment_status: paymentMode === "Credit" ? 'UNPAID' : (Number(amountReceived) >= grandTotal ? 'PAID' : 'PARTIAL')
    };
    setPrintedBill(billData);
    setTimeout(() => {
      triggerThermalPrint();
    }, 100);
  };

  const resetInvoiceForm = (customSettings?: InvoiceSettings) => {
    setActiveEditingInvoice(null);
    setIsRecreatingInvoice(false);
    try {
      sessionStorage.removeItem("pos_edit_invoice");
      sessionStorage.removeItem("pos_recreate_invoice");
      sessionStorage.removeItem("pos_recreate_invoice_number");
      if (typeof window !== "undefined" && window.history && window.location.search) {
        const url = new URL(window.location.href);
        if (url.searchParams.has("edit_id") || url.searchParams.has("recreate_number")) {
          url.searchParams.delete("edit_id");
          url.searchParams.delete("recreate_number");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }
    } catch (e) {}
    setItems([{
      id: `item-${Date.now()}-1`,
      product_id: "",
      product_name: "",
      quantity: 1,
      unit_price: 0,
      mrp: 0,
      batch_number: "",
      expiry_date: "",
      hsn_code: "",
      tax_rate: 18,
      is_tax_inclusive: true,
      discount_type: "percent",
      discount_value: 0,
    }]);
    setFreeItems([]);
    setSelectedCustomer("");
    setSelectedDeliveryAddress(null);
    setSelectedBillingAddress(null);
    setAmountReceived("");
    setNotes("");
    setInvoiceDiscountValue(0);
    setIncludePreviousDueInBill(false);
    setSettlingInvoice(null);
    setCustomCharges([
      { id: "1", name: "Freight / Transport", amount: 0, tax_rate: 0 },
      { id: "2", name: "Packing Charge", amount: 0, tax_rate: 0 }
    ]);
    setGstType("cgst_sgst");
    setPaymentMode("Cash");
    setRazorpayMetadata(null);
    setEdcMetadata(null);
    setPricingMode("Retail");
    setBarcodeInput("");
    setPoNumber("");
    setPoDate("");
    setVehicleNumber("");
    setDriverName("");
    setDriverPhone("");
    setTransporterName("");
    setEwayBillNumber("");
    setEwayBillDate("");
    setLrNumber("");
    setDispatchMode("Road");
    setMetaTab("invoice");
    const today = getTodayDateString();
    setInvoiceDate(today);
    setDueDate(today);
    setPaymentTerms("0");
    setCustomPaymentTermsText("");
    setCustomPaymentDays(0);
    const activeGst = getActiveBillingGst(tenant?.id);
    setTermsAndConditions(activeGst?.terms_and_conditions || DEFAULT_INVOICE_TERMS);
    loadUnpaidInvoices();
    const effectiveSettings = customSettings || invoiceSettings || loadStoredInvoiceSettings();
    const nextNum = getNextSequentialInvoiceNumber(invoiceType, effectiveSettings);
    setInvoiceNumber(nextNum);
  };

  const handleSave = async (printMode: 'a4' | 'thermal' | 'none' = 'a4') => {
    if (invoiceType === "QUOTATION") {
      return handleSaveQuotation("Issued", printMode);
    }
    if (!selectedCustomer) return toast.error("Please select a customer or party first.");
    if (items.length === 0) return toast.error("Please add at least one item.");
    try {
      setIsSaving(true);
      const isEditMode = Boolean(activeEditingInvoice || editingInvoice);
      const isRecreateMode = Boolean(isRecreatingInvoice);
      const customer = customers.find((c) => c.id === selectedCustomer);
      const isCredit = paymentMode === "Credit";
      const calculatedPaymentStatus = isCredit
        ? "UNPAID"
        : (amountReceived === "" || Number(amountReceived) >= grandTotal ? "PAID" : "PARTIAL");



      const numericAmountReceived = amountReceived === "" ? grandTotal : (Number(amountReceived) || 0);
      const actualAmountPaid = isCredit ? 0 : (numericAmountReceived > 0 ? numericAmountReceived : 0);

      const splitPaymentsPayload: Record<string, number> = {};
      if (paymentMode === "Split") {
        if (Number(splitCash) > 0) splitPaymentsPayload["cash"] = Number(splitCash);
        if (Number(splitOnline) > 0) splitPaymentsPayload["upi"] = Number(splitOnline);
      }

      let gatewayPaymentNote = "";
      if (paymentMode === "Razorpay" && razorpayMetadata?.paymentId) {
        gatewayPaymentNote = `Razorpay Payment ID: ${razorpayMetadata.paymentId}${razorpayMetadata.orderId ? ` | Order ID: ${razorpayMetadata.orderId}` : ""}`;
      } else if (paymentMode === "PineLabs EDC" && edcMetadata?.rrn) {
        gatewayPaymentNote = `EDC RRN: ${edcMetadata.rrn}${edcMetadata.cardBrand ? ` | ${edcMetadata.cardBrand} ****${edcMetadata.cardLast4 || ""}` : ""}`;
      }

      const formattedBillingAddress = selectedBillingAddress
        ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state, selectedBillingAddress.pincode].filter(Boolean).join(", ")
        : (customer?.billing_address || customer?.address || "");

      const formattedShippingAddress = selectedDeliveryAddress
        ? [selectedDeliveryAddress.street, selectedDeliveryAddress.city, selectedDeliveryAddress.state, selectedDeliveryAddress.pincode].filter(Boolean).join(", ")
        : (customer?.shipping_address || formattedBillingAddress);

      const apiInvoiceType =
        invoiceType === "TAX_INVOICE" ? "tax_invoice" :
        invoiceType === "ESTIMATE_NON_GST" ? "estimate" :
        invoiceType === "PROFORMA" ? "proforma" :
        invoiceType === "CREDIT_NOTE" ? "credit_note" :
        invoiceType === "DEBIT_NOTE" ? "debit_note" : "tax_invoice";

      const finalNotes = [
        notes,
        (invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE") && noteReason ? `Reason: ${noteReason}` : "",
        originalInvoiceRef ? `Original Inv Ref: ${originalInvoiceRef}${originalInvoiceDate ? ` (${originalInvoiceDate})` : ""}` : "",
        gatewayPaymentNote,
        settlingInvoice ? `Settlement for Invoice #${settlingInvoice.invoice_number}` : ""
      ].filter(Boolean).join(" | ");

      // Attempt to save to backend API
      const createResult = await invoicesApi.createInvoice({
        invoice_number: invoiceNumber.trim(),
        invoice_type: apiInvoiceType,
        reference_number: originalInvoiceRef || undefined,
        order_number: (invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE") ? noteReason : (poNumber || undefined),
        po_number: poNumber || undefined,
        po_date: poDate || undefined,
        vehicle_number: vehicleNumber || undefined,
        driver_name: driverName || undefined,
        driver_phone: driverPhone || undefined,
        transporter_name: transporterName || undefined,
        eway_bill_number: ewayBillNumber || undefined,
        eway_bill_date: ewayBillDate || undefined,
        customer_id: customer?.id && isValidUUID(customer.id) ? customer.id : null,
        customer_name: customer?.name || "Walk-in Customer",
        customer_phone: customer?.phone || null,
        customer_email: customer?.email || null,
        customer_gstin: selectedBillingAddress?.gst_number || customer?.gst_number || null,
        billing_address: formattedBillingAddress,
        shipping_address: formattedShippingAddress,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: isCredit ? "Credit / Due" : paymentMode,
        payment_status: calculatedPaymentStatus,
        payment_method: isCredit ? "Credit" : (paymentMode === "Split" ? "split" : paymentMode),
        amount_paid: paymentMode === "Split" ? (Number(splitCash) || 0) + (Number(splitOnline) || 0) : actualAmountPaid,
        amount_received: paymentMode === "Split" ? (Number(splitCash) || 0) + (Number(splitOnline) || 0) : actualAmountPaid,
        split_payments: paymentMode === "Split" ? splitPaymentsPayload : null,
        notes: finalNotes || undefined,
        terms: termsAndConditions || undefined,
        is_tax_inclusive: items.some((it) => it.is_tax_inclusive === true),
        is_interstate: gstType === "igst",
        gst_type: gstType,
        tax_amount: combinedTax,
        cgst_amount: gstType === "cgst_sgst" ? combinedTax / 2 : 0,
        sgst_amount: gstType === "cgst_sgst" ? combinedTax / 2 : 0,
        igst_amount: gstType === "igst" ? combinedTax : 0,
        lines: items.map((it) => ({
          product_id: it.product_id && isValidUUID(it.product_id) ? it.product_id : null,
          product_name: it.product_name || "Item",
          quantity: Math.max(0.0001, Number(it.quantity) || 1),
          uom: it.uom || "Pcs",
          secondary_uom: it.secondary_uom || undefined,
          conversion_factor: it.conversion_factor || 1,
          primary_qty: it.primary_qty,
          secondary_qty: it.secondary_qty,
          unit_price: Math.max(0, Number(it.unit_price) || 0),
          mrp: Number(it.mrp) > 0 ? Number(it.mrp) : null,
          batch_number: it.batch_number ? String(it.batch_number) : null,
          expiry_date: it.expiry_date ? String(it.expiry_date).slice(0, 10) : null,
          mfg_date: it.mfg_date ? String(it.mfg_date).slice(0, 10) : null,
          hsn_code: it.hsn_code ? String(it.hsn_code) : null,
          discount_type: it.discount_type || null,
          discount_value: Number(it.discount_value) || 0,
          tax_rate: Math.max(0, Math.min(100, Number(it.tax_rate) || 0)),
          is_tax_inclusive: it.is_tax_inclusive === true,
        })),
      });

      const apiInvoice = (createResult as any)?.data || createResult;
      const backendInvoiceNumber = apiInvoice?.invoice_number || invoiceNumber;
      const backendId = apiInvoice?.id || `inv-${Date.now()}`;

      const earnedPts = Math.floor(grandTotal / 100);
      const selectedEmp = salesEmployees.find(e => e.full_name === salesExecutive);
      if (selectedEmp && earnedPts > 0) {
        employeesApi.addSalesPoints(selectedEmp.id, earnedPts).then((updatedEmp) => {
          if (updatedEmp) {
            setSalesEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
          }
        }).catch(console.error);
      }

      // Persist to pos_saved_invoices in localStorage for instant Invoices History tab sync
      const newInvoiceRecord = {
        id: (isEditMode ? (activeEditingInvoice?.id || editingInvoice?.id || backendId) : backendId),
        invoice_number: backendInvoiceNumber,
        invoice_type: invoiceType,
        original_invoice_ref: originalInvoiceRef || undefined,
        original_invoice_date: originalInvoiceDate || undefined,
        note_reason: (invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE") ? noteReason : undefined,
        po_number: poNumber || undefined,
        po_date: poDate || undefined,
        vehicle_number: vehicleNumber || undefined,
        driver_name: driverName || undefined,
        driver_phone: driverPhone || undefined,
        transporter_name: transporterName || undefined,
        eway_bill_number: ewayBillNumber || undefined,
        eway_bill_date: ewayBillDate || undefined,
        customer_name: customer?.name || "Walk-in Customer",
        customer_phone: customer?.phone || "",
        customer_email: customer?.email || "",
        customer_company: customer?.company || "",
        customer_gstin: customer?.gst_number || "",
        customer_type: customer?.customer_type || customer?.type || customer?.category || (pricingMode !== 'Retail' ? pricingMode : undefined),
        customer_billing_address: formattedBillingAddress,
        customer_shipping_address: formattedShippingAddress,
        sales_executive: salesExecutive || "Sales Executive",
        sales_points_earned: earnedPts,
        invoice_date: invoiceDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_date: dueDate,
        payment_mode: isCredit ? "Credit / Due" : paymentMode,
        payment_status: isCredit ? "Unpaid" : (amountReceived === "" || Number(amountReceived) >= grandTotal ? "Paid" : "Partial"),
        subtotal: subtotal,
        taxable_value: taxableValue,
        total_tax: totalTax,
        cgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
        sgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
        igst_amount: gstType === 'igst' ? totalTax : 0,
        gst_type: gstType,
        is_interstate: gstType === "igst",
        discount_amount: totalDiscount,
        grand_total: grandTotal,
        amount_received: isCredit ? 0 : (amountReceived === "" ? grandTotal : (Number(amountReceived) || 0)),
        print_status: printMode === 'thermal' ? 'Thermal Printed' : printMode === 'a4' ? 'A4 PDF Generated' : 'Pending Print',
        terms: termsAndConditions || undefined,
        terms_and_conditions: termsAndConditions || undefined,
        items: items.map(it => ({
          product_name: it.product_name || "Item",
          quantity: it.quantity,
          unit_price: it.unit_price,
          mrp: it.mrp || 0,
          hsn_code: it.hsn_code || "",
          tax_rate: it.tax_rate || 18,
          is_tax_inclusive: it.is_tax_inclusive === true,
        }))
      };

      const stored = localStorage.getItem(posStorageKey);
      let list = stored ? JSON.parse(stored) : [];
      if (isEditMode) {
        const editId = activeEditingInvoice?.id || editingInvoice?.id;
        let matched = false;
        list = list.map((r: any) => {
          if ((editId && r.id === editId) || r.invoice_number === backendInvoiceNumber || r.invoice_number === invoiceNumber) {
            matched = true;
            return { ...newInvoiceRecord, tenant_id: currentTenantId, company_id: currentCompanyId, workspace_id: currentCompanyId };
          }
          return r;
        });
        if (!matched) {
          list.unshift({ ...newInvoiceRecord, tenant_id: currentTenantId, company_id: currentCompanyId, workspace_id: currentCompanyId });
        }
      } else {
        const cleaned = list.filter((r: any) => r.invoice_number !== invoiceNumber && r.invoice_number !== backendInvoiceNumber);
        list = [{ ...newInvoiceRecord, tenant_id: currentTenantId, company_id: currentCompanyId, workspace_id: currentCompanyId }, ...cleaned];
      }
      localStorage.setItem(posStorageKey, JSON.stringify(list));

      // If settling an existing unpaid/partial invoice
      if (settlingInvoice) {
        const amountCollectedNow = Number(amountReceived !== "" ? amountReceived : grandTotal);
        const previouslyReceived = Number(settlingInvoice.amount_received || 0);
        const newTotalReceived = previouslyReceived + amountCollectedNow;
        const totalOriginal = Number(settlingInvoice.grand_total || grandTotal);
        const isFullyPaid = newTotalReceived >= totalOriginal - 0.01;
        const targetStatus: "Paid" | "Partial" | "Unpaid" = isFullyPaid ? "Paid" : "Partial";

        if (settlingInvoice.id && settlingInvoice.id.length > 10) {
          invoicesApi.recordPayment(settlingInvoice.id, {
            amount: amountCollectedNow,
            payment_date: invoiceDate,
            payment_method: paymentMode.toLowerCase(),
            notes: `Settlement via POS Sales Invoice (${targetStatus})`,
          } as any).catch(console.warn);
        }

        const origStored = localStorage.getItem(posStorageKey);
        const origList = origStored ? JSON.parse(origStored) : [];
        const updatedOrigList = origList.map((rec: any) => {
          if (rec.invoice_number === settlingInvoice.invoice_number || rec.id === settlingInvoice.id) {
            return {
              ...rec,
              payment_status: targetStatus,
              payment_mode: paymentMode,
              amount_received: newTotalReceived,
            };
          }
          return rec;
        });
        localStorage.setItem(posStorageKey, JSON.stringify(updatedOrigList));
        if (isFullyPaid) {
          toast.info(`Invoice #${settlingInvoice.invoice_number} is now marked as FULLY PAID!`);
        } else {
          const remainingDue = totalOriginal - newTotalReceived;
          toast.info(`Partial payment of ${formatCurrency(amountCollectedNow)} recorded for #${settlingInvoice.invoice_number}. Remaining Due: ${formatCurrency(remainingDue)}`);
        }
        setSettlingInvoice(null);
      }

      // Broadcast pos_invoices_updated for instant memory refresh across tabs
      window.dispatchEvent(new Event("pos_invoices_updated"));

      if (isEditMode) {
        toast.success(`Sales Invoice ${backendInvoiceNumber} updated successfully!`);
      } else if (isRecreateMode) {
        toast.success(`Sales Invoice ${backendInvoiceNumber} recreated successfully!`);
      } else {
        toast.success(`Sales Invoice ${backendInvoiceNumber} saved! +${earnedPts} sales points awarded to ${salesExecutive || 'Sales Rep'}.`);
      }

      if (printMode === 'a4') {
        const payload = constructFullInvoicePayload();
        payload.invoice_number = backendInvoiceNumber;
        setFullInvoiceModalData(payload);
        setAutoPrintFullInvoice(true);
        setIsFullInvoiceOpen(true);
      } else if (printMode === 'thermal') {
        handlePrintThermal();
      }

      if (onSaved) {
        onSaved(newInvoiceRecord);
      }

      if (isEditMode) {
        // When editing, do NOT advance the sequence counter
        const currentSettings = invoiceSettings || loadStoredInvoiceSettings();
        resetInvoiceForm(currentSettings);
      } else {
        // Advance invoice sequence for the next transaction
        const savedNum = backendInvoiceNumber || invoiceNumber;
        const s = loadStoredInvoiceSettings();
        const isTaxInv = invoiceType === "TAX_INVOICE";
        const pfx = isTaxInv ? (s.prefix !== undefined ? s.prefix : "INV-") : `${getDocPrefix(invoiceType)}-`;
        const sfx = isTaxInv ? (s.suffix || "") : "";
        let nextSeq = (s.sequenceNumber || 1001) + 1;
        if (savedNum && savedNum.startsWith(pfx)) {
          const remainder = sfx && savedNum.endsWith(sfx)
            ? savedNum.slice(pfx.length, savedNum.length - sfx.length)
            : savedNum.slice(pfx.length);
          const digits = remainder.match(/\d+/g);
          if (digits) {
            const parsed = parseInt(digits[digits.length - 1], 10);
            if (!isNaN(parsed)) {
              nextSeq = parsed + 1;
            }
          }
        }
        const updatedSettings: InvoiceSettings = {
          ...s,
          customSequenceEnabled: true,
          sequenceNumber: nextSeq,
        };
        saveStoredInvoiceSettings(updatedSettings);
        setInvoiceSettings(updatedSettings);

        // Auto-reset form state to prepare for next invoice transaction
        resetInvoiceForm(updatedSettings);
      }
    } catch (error: any) {
      toast.error(error?.detail || "Failed to create invoice");
    } finally {
      setIsSaving(false);
    }
  };

  // Quotation Specific Handlers
  const handleSaveQuotation = async (status: "Draft" | "Issued" | "Converted" = "Issued", printMode: 'a4' | 'thermal' | 'none' = 'none') => {
    if (items.length === 0) {
      toast.error("Please add at least one line item to the quotation.");
      return;
    }
    const isEditQuote = Boolean(activeEditingInvoice || editingInvoice);
    const editQuoteId = activeEditingInvoice?.id || editingInvoice?.id;
    const customer = customers.find((c) => c.id === selectedCustomer);

    setIsSaving(true);
    try {
      const quotationPayload = {
        quote_number: invoiceNumber,
        customer_id: customer?.id && isValidUUID(customer.id) ? customer.id : null,
        customer_name: customer?.name || "Walk-in Client",
        customer_phone: customer?.phone || "",
        customer_email: customer?.email || "",
        customer_address: selectedBillingAddress ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state].filter(Boolean).join(", ") : (customer?.billing_address || customer?.address || ""),
        customer_gstin: selectedBillingAddress?.gst_number || customer?.gst_number || "",
        status: status === "Draft" ? "Draft" : status === "Converted" ? "Accepted" : "Issued",
        total: grandTotal,
        subtotal: subtotal,
        discount: totalDiscount,
        tax: totalTax,
        valid_until: dueDate || invoiceDate,
        sales_rep: salesExecutive || "Sales Representative",
        notes: notes || undefined,
        items: {
          items: items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            name: it.product_name,
            hsn_code: it.hsn_code,
            sku: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            price: it.unit_price,
            discount_percent: it.discount_type === "percent" ? it.discount_value : (it.unit_price > 0 ? (it.discount_value / it.unit_price) * 100 : 0),
            tax_percent: it.tax_rate,
            line_total: (it.unit_price * it.quantity) - (it.discount_type === "percent" ? (it.unit_price * it.quantity * it.discount_value) / 100 : it.discount_value),
          })),
        },
      };

      // 1. Save / Update to CRM quotations API
      if (editQuoteId && isValidUUID(editQuoteId)) {
        await crmQuotationsApi.update(editQuoteId, quotationPayload).catch((e: any) => console.warn("CRM Quotations update error:", e));
      } else {
        await crmQuotationsApi.create(quotationPayload).catch((e: any) => console.warn("CRM Quotations create error:", e));
      }

      // 2. Also save to invoicesApi with invoice_type: "quotation"
      const formattedBillingAddress = selectedBillingAddress ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state, selectedBillingAddress.pincode].filter(Boolean).join(", ") : (customer?.billing_address || customer?.address || "");
      const formattedShippingAddress = selectedDeliveryAddress ? [selectedDeliveryAddress.street, selectedDeliveryAddress.city, selectedDeliveryAddress.state, selectedDeliveryAddress.pincode].filter(Boolean).join(", ") : (customer?.shipping_address || formattedBillingAddress);

      await invoicesApi.createInvoice({
        invoice_number: invoiceNumber.trim(),
        invoice_type: "quotation",
        customer_id: customer?.id && isValidUUID(customer.id) ? customer.id : null,
        customer_name: customer?.name || "Walk-in Client",
        customer_phone: customer?.phone || null,
        customer_email: customer?.email || null,
        customer_gstin: selectedBillingAddress?.gst_number || customer?.gst_number || null,
        billing_address: formattedBillingAddress,
        shipping_address: formattedShippingAddress,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms: "Net 30 Days",
        payment_status: status === "Draft" ? "Draft" : "Open",
        payment_method: "Quote",
        notes: notes || undefined,
        is_tax_inclusive: items.some((it) => it.is_tax_inclusive === true),
        lines: items.map((it) => ({
          product_id: it.product_id && isValidUUID(it.product_id) ? it.product_id : null,
          product_name: it.product_name || "Item",
          quantity: Math.max(1, Number(it.quantity) || 1),
          unit_price: Math.max(0, Number(it.unit_price) || 0),
          mrp: Number(it.mrp) > 0 ? Number(it.mrp) : null,
          batch_number: it.batch_number ? String(it.batch_number) : null,
          expiry_date: it.expiry_date ? String(it.expiry_date).slice(0, 10) : null,
          hsn_code: it.hsn_code ? String(it.hsn_code) : null,
          discount_type: it.discount_type || null,
          discount_value: Number(it.discount_value) || 0,
          tax_rate: Math.max(0, Math.min(100, Number(it.tax_rate) || 0)),
          is_tax_inclusive: it.is_tax_inclusive === true,
        })),
      }).catch((e: any) => console.warn("Invoices API Quotation error:", e));

      // 3. Save / Update in localStorage
      const newInvoiceRecord = {
        id: editQuoteId || `qt-${Date.now()}`,
        invoice_number: invoiceNumber,
        invoice_type: "QUOTATION",
        customer_name: customer?.name || "Walk-in Client",
        customer_phone: customer?.phone || "",
        customer_email: customer?.email || "",
        customer_gstin: customer?.gst_number || "",
        sales_executive: salesExecutive || "Sales Rep",
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_mode: "Quote",
        payment_status: status === "Draft" ? "Draft" : status === "Converted" ? "Converted to Order" : "Issued",
        subtotal,
        taxable_value: taxableValue,
        total_tax: totalTax,
        grand_total: grandTotal,
        items: items.map(it => ({
          product_name: it.product_name || "Item",
          quantity: it.quantity,
          unit_price: it.unit_price,
          hsn_code: it.hsn_code || "",
          tax_rate: it.tax_rate || 18,
        })),
      };

      const stored = localStorage.getItem(posStorageKey);
      let list = stored ? JSON.parse(stored) : [];
      if (isEditQuote) {
        list = list.map((x: any) => (x.id === editQuoteId || x.invoice_number === invoiceNumber ? { ...newInvoiceRecord, tenant_id: currentTenantId } : x));
        if (!list.some((x: any) => x.id === editQuoteId || x.invoice_number === invoiceNumber)) {
          list.unshift({ ...newInvoiceRecord, tenant_id: currentTenantId });
        }
      } else {
        list.unshift({ ...newInvoiceRecord, tenant_id: currentTenantId });
      }
      localStorage.setItem(posStorageKey, JSON.stringify(list));
      window.dispatchEvent(new Event("pos_invoices_updated"));

      if (status === "Converted") {
        toast.success(`Quotation ${invoiceNumber} saved & converted to Sales Order / Invoice!`);
        if (onConvertToOrder) onConvertToOrder(newInvoiceRecord);
      } else if (status === "Draft") {
        toast.success(`Quotation ${invoiceNumber} saved as Draft!`);
      } else if (isEditQuote) {
        toast.success(`Quotation ${invoiceNumber} updated successfully!`);
      } else {
        toast.success(`Quotation ${invoiceNumber} saved & issued successfully!`);
      }

      if (printMode === 'a4') {
        const payload = constructFullInvoicePayload();
        payload.invoice_number = invoiceNumber;
        setFullInvoiceModalData(payload);
        setAutoPrintFullInvoice(true);
        setIsFullInvoiceOpen(true);
      } else if (printMode === 'thermal') {
        handlePrintThermal();
      }

      if (onSaved) onSaved(newInvoiceRecord);
      
      if (isEditQuote) {
        const currentSettings = invoiceSettings || loadStoredInvoiceSettings();
        resetInvoiceForm(currentSettings);
      } else {
        const s = loadStoredInvoiceSettings();
        const nextSeq = (s.sequenceNumber || 1001) + 1;
        const updatedSettings: InvoiceSettings = {
          ...s,
          customSequenceEnabled: true,
          sequenceNumber: nextSeq,
        };
        saveStoredInvoiceSettings(updatedSettings);
        setInvoiceSettings(updatedSettings);

        resetInvoiceForm(updatedSettings);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save quotation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsAppQuote = () => {
    const customer = customers.find((c) => c.id === selectedCustomer);
    const phone = (customer?.phone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Please select a customer with a valid phone number.");
      return;
    }
    const text = encodeURIComponent(
      `Hello ${customer?.name || "Valued Client"},\n\nHere is your official quotation *#${invoiceNumber}* from *${tenant?.name || "BusinessOS AI"}* for total amount *${currency.symbol}${grandTotal.toLocaleString()}*.\n\nDate: ${invoiceDate}\nValid Until: ${dueDate}\n\nPlease let us know if you approve this quotation!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    toast.success(`Opened WhatsApp to send Quotation #${invoiceNumber} to ${phone}!`);
  };

  const handleSendEmailQuote = () => {
    const customer = customers.find((c) => c.id === selectedCustomer);
    const email = customer?.email || "";
    if (!email) {
      toast.error("Please select a customer with an email address.");
      return;
    }
    const subject = encodeURIComponent(`Official Sales Quotation #${invoiceNumber} - ${tenant?.name || "BusinessOS AI"}`);
    const body = encodeURIComponent(
      `Dear ${customer?.name || "Valued Client"},\n\nPlease find attached our official price quotation #${invoiceNumber}:\n\n` +
      `Total Value: ${currency.symbol}${grandTotal.toLocaleString()}\n` +
      `Date: ${invoiceDate}\n` +
      `Valid Until: ${dueDate}\n\n` +
      `Items (${items.length}):\n` +
      items.map((it, idx) => `${idx + 1}. ${it.product_name} - Qty: ${it.quantity} @ ${currency.symbol}${it.unit_price}`).join("\n") +
      `\n\nPlease let us know if you approve this proposal.\n\nBest regards,\n${tenant?.name || "Sales Department"}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`Opened email client to send Quotation #${invoiceNumber} to ${email}!`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans text-slate-800 space-y-2.5">
      <ThermalReceiptPrinter bill={printedBill} />

      {/* Editing or Recreating Status Notification Banner */}
      {(activeEditingInvoice || isRecreatingInvoice) && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border shadow-xs ${
          isRecreatingInvoice 
            ? "bg-amber-50 border-amber-200 text-amber-900" 
            : "bg-indigo-50 border-indigo-200 text-indigo-900"
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isRecreatingInvoice ? "bg-amber-600" : "bg-indigo-600"}`} />
            {isRecreatingInvoice ? (
              <span>🔄 Recreating Cancelled Document: <strong className="font-extrabold underline">#{invoiceNumber}</strong> (Preserving original document number)</span>
            ) : (
              <span>✏️ Editing Document: <strong className="font-extrabold underline">#{invoiceNumber}</strong> (Updates will save to this number without incrementing sequence)</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => resetInvoiceForm()}
            className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            {isRecreatingInvoice ? "Discard & Start New" : "Cancel Edit"}
          </button>
        </div>
      )}

      {/* Top Filters & Controls - Fluid Responsive Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full py-0.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Location Dropdown */}
          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-medium leading-none whitespace-nowrap">Location / Store</span>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-slate-400 shrink-0" />
                <select
                  value={selectedLocation || selectedStore}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setSelectedStore(e.target.value);
                  }}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs max-w-[200px] truncate"
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

          {/* Sales Rep Dropdown */}
          <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-medium leading-none whitespace-nowrap">Sales Rep.</span>
              <div className="flex items-center gap-1 mt-0.5">
                <User className="size-3 text-slate-400 shrink-0" />
                <select
                  value={salesExecutive}
                  onChange={(e) => setSalesExecutive(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
                >
                  {salesEmployees && salesEmployees.length > 0 ? (
                    salesEmployees.map((emp) => (
                      <option key={emp.id} value={emp.full_name}>
                        {emp.full_name} ({emp.employee_code})
                      </option>
                    ))
                  ) : (
                    <option value="test2">test2 (EMP-0001)</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing Tier Mode Selector */}
          <div className="flex items-center bg-white p-1 border border-slate-200 rounded-xl text-xs font-semibold gap-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchPricingTier("Retail")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${pricingMode === "Retail" ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Building className="size-3.5" /> Retail
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPricingTier("Wholesale")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${pricingMode === "Wholesale" ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Boxes className="size-3.5" /> Wholesale
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPricingTier("B2B")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${pricingMode === "B2B" ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Building className="size-3.5" /> B2B Contract
            </button>
          </div>

          {/* Unpaid Bills */}
          <button
            type="button"
            onClick={() => setIsUnpaidModalOpen(true)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Clock className="size-3.5 text-slate-400" />
            <span>Unpaid Bills ({unpaidInvoices.length})</span>
          </button>

          {/* New Product */}
          <button
            type="button"
            onClick={() => setIsAddProductOpen(true)}
            className="px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50/40 border border-emerald-300 hover:bg-emerald-100/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
          >
            <Plus className="size-3.5" /> New Product
          </button>
        </div>

        {/* Right side Action Buttons */}
        {invoiceType === "QUOTATION" ? (
          <div className="flex items-center flex-wrap gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePreviewFullInvoice}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Print Quotation PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print PDF
            </button>
            <button
              type="button"
              onClick={handleSendEmailQuote}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Email Quote"
            >
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Email Quote
            </button>
            <button
              type="button"
              onClick={handleSendWhatsAppQuote}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="WhatsApp Quote"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp Quote
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveQuotation("Draft")}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Save Draft
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveQuotation("Issued")}
              className="px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              SAVE & ISSUE QUOTATION
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveQuotation("Converted")}
              className="px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              CONVERT TO ORDER
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Settings Button */}
            <button
              type="button"
              onClick={() => setIsQuickSettingsOpen(true)}
              className="px-2.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              title="Quick Settings (Prefix & Sequence, Custom Fields, Item Columns)"
            >
              <Settings className="size-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* Preview Invoice */}
            <button
              type="button"
              onClick={handlePreviewFullInvoice}
              className="px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/30 border border-indigo-200 hover:bg-indigo-100/50 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
            >
              <Eye className="size-3.5 text-indigo-600" /> Preview Invoice
            </button>

            {/* Save Only */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave('none')}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
            >
              <FileText className="size-3.5 text-indigo-600" />
              <span>{isSaving ? "Saving..." : "Save Only"}</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 w-full max-w-full">
        {/* Top Info Grid: Bill To, Ship To & Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-2.5">
          {/* Bill To Card */}
          <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-0.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-4 text-indigo-600" /> BILL TO / CUSTOMER PARTY
              </span>
              <button
                type="button"
                onClick={() => setIsAddPartyOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-1 rounded-full border border-indigo-100 transition-all cursor-pointer"
              >
                <Plus className="size-3.5" /> Add New Party
              </button>
            </div>

            <div className="space-y-3">
              {/* Searchable Customer Tab (Same Old Style, Same Tab) */}
              <div className="relative" ref={customerDropdownRef}>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="-- Select Customer / Party --"
                    value={
                      isCustomerDropdownOpen
                        ? customerSearchQuery
                        : activeCustomerObj
                        ? `${activeCustomerObj.name}${activeCustomerObj.phone ? ` (${activeCustomerObj.phone})` : ""}`
                        : customerSearchQuery
                    }
                    onFocus={() => {
                      setIsCustomerDropdownOpen(true);
                      if (activeCustomerObj) {
                        setCustomerSearchQuery(activeCustomerObj.name || "");
                      }
                    }}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                      if (!e.target.value) {
                        setSelectedCustomer("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsCustomerDropdownOpen(false);
                      }
                    }}
                    className="w-full h-10 bg-white border border-slate-200 rounded-2xl pl-4 pr-14 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-text shadow-2xs"
                  />
                  
                  <div className="absolute right-3 flex items-center gap-1.5">
                    {(selectedCustomer || customerSearchQuery) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer("");
                          setCustomerSearchQuery("");
                          setIsCustomerDropdownOpen(false);
                        }}
                        className="size-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="Clear customer selection"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomerDropdownOpen((prev) => !prev);
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform duration-150 ${
                          isCustomerDropdownOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Compact Clean Dropdown Options (Matching Original List Style) */}
                {isCustomerDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 shadow-lg rounded-lg py-0.5 z-50 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer("");
                        setCustomerSearchQuery("");
                        setIsCustomerDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-normal transition-colors cursor-pointer leading-snug ${
                        !selectedCustomer ? "bg-indigo-600 text-white font-medium" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      -- Select Customer / Party --
                    </button>

                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((c) => {
                        const isSelected = selectedCustomer === c.id;
                        const label = `${c.name}${c.phone ? ` (${c.phone})` : ""}`;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c.id);
                              setCustomerSearchQuery(label);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer truncate leading-snug ${
                              isSelected
                                ? "bg-indigo-600 text-white font-medium"
                                : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-400 text-center">
                        No customers match "{customerSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {activeCustomerObj ? (
                <div className="space-y-3 transition-all">
                  {/* Party Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                        {activeCustomerObj.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {activeCustomerObj.name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Active Party
                          </span>
                        </div>
                        <div className="text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                          {activeCustomerObj.phone && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Phone className="size-3 text-slate-400" /> {activeCustomerObj.phone}
                            </span>
                          )}
                          {activeCustomerObj.email && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Mail className="size-3 text-slate-400" /> {activeCustomerObj.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenEditPartyDetails}
                        className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                        title="Edit Customer Details (Phone, Address, GSTIN, Name) for this bill"
                      >
                        <Pencil className="size-3 text-amber-600" /> Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEditCustomerAddresses}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        title="Manage and edit addresses for this customer"
                      >
                        <MapPin className="size-3" /> Addresses
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer("")}
                        className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200/80 transition-colors cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Billing Location Selector */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        Billing Location:
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold">
                        {selectedBillingAddress?.tag || "Head Office"}
                      </span>
                    </div>

                    {activeCustomerObj.addresses && activeCustomerObj.addresses.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeCustomerObj.addresses.filter((a: any) => a.type === "billing" || a.type === "both" || !a.type).map((addr: any, idx: number) => {
                          const isSel = selectedBillingAddress?.id === addr.id || (!selectedBillingAddress && (addr.is_default_billing || idx === 0));
                          return (
                            <button
                              key={addr.id || idx}
                              type="button"
                              onClick={() => setSelectedBillingAddress(addr)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                isSel
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {addr.tag || `Branch ${idx + 1}`}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <p className="text-[11px] text-slate-600 leading-snug">
                      {selectedBillingAddress ? [selectedBillingAddress.street, selectedBillingAddress.city, selectedBillingAddress.state, selectedBillingAddress.pincode].filter(Boolean).join(", ") : (activeCustomerObj.billing_address || activeCustomerObj.address || "Standard Billing Address")}
                    </p>
                  </div>

                  {/* Unified Purchase History & Financial Summary */}
                  {customerSummary && (
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className="flex items-center gap-1 font-bold text-indigo-700">
                          <History className="size-3 text-indigo-600" />
                          <span>History</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">
                            Orders: <strong className="text-slate-900 font-bold">{customerSummary.total_invoices}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            Spent: <strong className="text-emerald-600 font-bold">{currency.symbol}{Number(customerSummary.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            Due: <strong className={`font-bold ${Number(customerSummary.total_pending_due || 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>{currency.symbol}{Number(customerSummary.total_pending_due || 0).toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {customerSummary.total_pending_due > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowCustomerLedger(true)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            >
                              Ledger
                            </button>
                            <button
                              type="button"
                              onClick={() => setIncludePreviousDueInBill(!includePreviousDueInBill)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                includePreviousDueInBill
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                              }`}
                            >
                              {includePreviousDueInBill ? "✓ Added" : `+ Add Due`}
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ✓ Clear Account
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center justify-center gap-3.5">
                  <div className="size-9 rounded-full bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                    <User className="size-4" />
                  </div>
                  <div className="text-left text-xs text-slate-400 font-medium leading-tight">
                    <div>Select an existing party above</div>
                    <div>or click Add New Party to create</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ship To / Delivery Destination Card */}
          <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="size-4 text-indigo-600" /> SHIP TO / DESTINATION
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenEditPartyDetails}
                  className="px-2.5 py-1 text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                  title="Quick edit destination & customer details for this bill"
                >
                  <Pencil className="size-3 text-amber-600" /> Edit on Bill
                </button>
                <button
                  type="button"
                  onClick={handleOpenEditCustomerAddresses}
                  className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  title="Edit or add shipping locations in customer address book"
                >
                  <Plus className="size-3" /> Address Book
                </button>
              </div>
            </div>

            <div className="flex-1">
              {activeCustomerObj ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      Delivery Location:
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      {activeCustomerObj.addresses?.length ? `${activeCustomerObj.addresses.length} Location(s) Available` : "Default Address"}
                    </span>
                  </div>
                  
                  {activeCustomerObj.addresses && activeCustomerObj.addresses.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeCustomerObj.addresses.map((addr: any, idx: number) => {
                        const isSel = selectedDeliveryAddress?.id === addr.id || (!selectedDeliveryAddress && (addr.is_default_shipping || idx === 0));
                        return (
                          <button
                            key={addr.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedDeliveryAddress(addr);
                              const custGst = addr.gst_number || selectedBillingAddress?.gst_number || activeCustomerObj?.gst_number;
                              if (getIsInterstate(addr.state, custGst)) {
                                setGstType("igst");
                                toast.info(`Switched destination to ${addr.tag || `Location ${idx + 1}`} (${addr.state}). Tax: IGST.`);
                              } else {
                                setGstType("cgst_sgst");
                                toast.info(`Switched destination to ${addr.tag || `Location ${idx + 1}`} (${addr.state || "Same State"}). Tax: CGST+SGST.`);
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSel
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-sm">{addr.tag?.toLowerCase().includes("home") ? "🏠" : addr.tag?.toLowerCase().includes("warehouse") ? "🏭" : addr.tag?.toLowerCase().includes("branch") ? "🏬" : "🏢"}</span>
                            <span className="truncate max-w-[140px] text-left">
                              <span className="block leading-tight">{addr.tag || `Location ${idx + 1}`}</span>
                              <span className="block text-[9px] font-medium opacity-80 truncate">{addr.street || addr.city || addr.state}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Standard Registered Address</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-100">Primary</span>
                      </div>
                      <span className="text-[11px] leading-relaxed">
                        {activeCustomerObj.shipping_address || activeCustomerObj.billing_address || activeCustomerObj.address || "No detailed address provided."}
                      </span>
                    </div>
                  )}

                  {selectedDeliveryAddress && (
                    <div className="p-2 bg-indigo-50/40 rounded-xl border border-indigo-100 text-[11px] text-slate-600">
                      <span className="font-bold text-indigo-900">Ship to: </span>
                      {[selectedDeliveryAddress.street, selectedDeliveryAddress.city, selectedDeliveryAddress.state, selectedDeliveryAddress.pincode].filter(Boolean).join(", ")}
                      {selectedDeliveryAddress.gst_number && <span className="ml-2 font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">GSTIN: {selectedDeliveryAddress.gst_number}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4 rounded-2xl bg-slate-50/40 border border-slate-100 flex items-center justify-center gap-3.5">
                  <div className="size-9 rounded-full bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                    <MapPin className="size-4" />
                  </div>
                  <div className="text-left text-xs text-slate-400 font-medium leading-tight">
                    <div>Select a party first</div>
                    <div>to view shipping addresses</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Metadata & Other Details Tabbed Card */}
          <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
            {/* Tab Header Selector */}
            <div className="flex items-center border-b border-slate-200/90 -mt-0.5 -mx-2 sm:-mx-2.5 px-2 sm:px-2.5 gap-1 bg-slate-50/50 rounded-t-xl">
              <button
                type="button"
                onClick={() => setMetaTab("invoice")}
                className={cn(
                  "px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 -mb-px",
                  metaTab === "invoice"
                    ? "text-indigo-600 border-indigo-600 bg-white font-black shadow-2xs rounded-t-lg"
                    : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60 rounded-t-lg"
                )}
              >
                <FileText className="size-3.5 text-indigo-600" />
                <span>INVOICE METADATA</span>
              </button>

              <button
                type="button"
                onClick={() => setMetaTab("other")}
                className={cn(
                  "px-3 py-2 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-b-2 -mb-px relative",
                  metaTab === "other"
                    ? "text-indigo-600 border-indigo-600 bg-white font-black shadow-2xs rounded-t-lg"
                    : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60 rounded-t-lg"
                )}
              >
                <Truck className="size-3.5 text-indigo-600" />
                <span>OTHER DETAILS</span>
                {(poNumber || vehicleNumber || driverName || driverPhone || transporterName) ? (
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Other details configured" />
                ) : null}
              </button>
            </div>

            {/* Tab 1: INVOICE METADATA */}
            {metaTab === "invoice" && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Invoice No
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRegenerateInvoiceNumber(invoiceType)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="Generate new sequential invoice number"
                      >
                        <RefreshCw className="size-2.5" /> Auto-Gen
                      </button>
                    </div>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full h-8 px-2.5 text-[11px] font-bold text-slate-800 outline-none bg-transparent"
                      />
                      <select
                        value={invoiceType}
                        onChange={(e) => handleInvoiceTypeChange(e.target.value as DocumentType)}
                        className="h-8 px-2 bg-slate-50 border-l border-slate-200 text-[11px] font-bold text-indigo-700 outline-none cursor-pointer hover:bg-slate-100 transition-all shrink-0"
                      >
                        <option value="TAX_INVOICE">Tax Invoice (INV)</option>
                        <option value="QUOTATION">Quotation (QT)</option>
                        <option value="CREDIT_NOTE">Credit Note (CN)</option>
                        <option value="DEBIT_NOTE">Debit Note (DN)</option>
                        <option value="PROFORMA">Proforma Note (PI)</option>
                        <option value="ESTIMATE_NON_GST">Estimate (EST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      {invoiceType === "CREDIT_NOTE" ? "Credit Note Date" : invoiceType === "DEBIT_NOTE" ? "Debit Note Date" : invoiceType === "PROFORMA" ? "Proforma Date" : "Invoice Date"}
                    </label>
                    <DatePickerInput
                      value={invoiceDate}
                      onChange={(newDate) => {
                        setInvoiceDate(newDate);
                        if (paymentTerms !== "custom") {
                          const days = parseInt(paymentTerms, 10) || 0;
                          setDueDate(addDaysToDateString(newDate, days));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Credit Note / Debit Note Specific Details (Section 34 GST Compliance) */}
                {(invoiceType === "CREDIT_NOTE" || invoiceType === "DEBIT_NOTE") && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                        <Receipt className="size-3 text-amber-700" />
                        {invoiceType === "CREDIT_NOTE" ? "Original Invoice / Return Ref" : "Original Invoice / Supplementary Ref"}
                      </span>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                        GST Ref
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-amber-900">Original Invoice #</label>
                        <input
                          type="text"
                          placeholder="e.g. INV-10948"
                          value={originalInvoiceRef}
                          onChange={(e) => setOriginalInvoiceRef(e.target.value)}
                          className="w-full h-7 bg-white border border-amber-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-semibold text-amber-900">Original Inv Date</label>
                        <DatePickerInput
                          value={originalInvoiceDate || invoiceDate}
                          onChange={(d) => setOriginalInvoiceDate(d)}
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-semibold text-amber-900">Reason for Note</label>
                      <select
                        value={noteReason}
                        onChange={(e) => setNoteReason(e.target.value)}
                        className="w-full h-7 bg-white border border-amber-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        {invoiceType === "CREDIT_NOTE" ? (
                          <>
                            <option value="Sales Return">01 - Sales Return / Goods Rejected</option>
                            <option value="Post-Sale Discount">02 - Post-Sale Discount / Rebate</option>
                            <option value="Defective Goods">03 - Defective / Damaged Goods</option>
                            <option value="Price Correction">04 - Correction in Invoice / Overbilling</option>
                            <option value="Order Cancellation">05 - Order Cancellation</option>
                            <option value="Other">06 - Other Adjustments</option>
                          </>
                        ) : (
                          <>
                            <option value="Price Undercharged">01 - Price Undercharged / Difference</option>
                            <option value="Additional Expenses">02 - Additional Freight / Handling</option>
                            <option value="Tax Rate Correction">03 - Tax Rate / Value Correction</option>
                            <option value="Quantity Discrepancy">04 - Supplementary Quantity Discrepancy</option>
                            <option value="Other">05 - Other Supplementary Adjustments</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* Proforma Note Indicator */}
                {invoiceType === "PROFORMA" && (
                  <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-[11px] text-blue-900 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold">
                      <FileText className="size-3.5 text-blue-600" /> Proforma Note / Commercial Quote
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-200">
                      Non-Fiscal / Pre-Payment
                    </span>
                  </div>
                )}

                {!showPaymentTerms ? (
                  <button
                    type="button"
                    onClick={() => setShowPaymentTerms(true)}
                    className="w-full py-2 px-3 border-2 border-dashed border-sky-400/90 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/60 text-sky-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="size-3.5" /> Add Due Date
                  </button>
                ) : (
                  <div className="space-y-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/90 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="size-3 text-indigo-600" /> Payment Terms & Due Date
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentTerms(false);
                          setPaymentTerms("0");
                          setDueDate(invoiceDate);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="Remove Due Date & Terms"
                      >
                        <X className="size-4.5 stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Payment Terms</label>
                        <select
                          value={paymentTerms}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPaymentTerms(val);
                            if (val !== "custom") {
                              const days = parseInt(val, 10) || 0;
                              setDueDate(addDaysToDateString(invoiceDate, days));
                            }
                          }}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="0">Immediate / Cash (Net 0)</option>
                          <option value="7">Net 7 Days</option>
                          <option value="15">Net 15 Days</option>
                          <option value="30">Net 30 Days</option>
                          <option value="45">Net 45 Days</option>
                          <option value="60">Net 60 Days</option>
                          <option value="90">Net 90 Days</option>
                          <option value="custom">✏️ Custom Terms...</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Due Date</label>
                        <DatePickerInput
                          value={dueDate}
                          onChange={(newDate) => setDueDate(newDate)}
                        />
                      </div>
                    </div>

                    {/* Custom Payment Terms Description / Days input */}
                    {paymentTerms === "custom" && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-600">Custom Terms Description</label>
                          <input
                            type="text"
                            placeholder="e.g. 50% Advance"
                            value={customPaymentTermsText}
                            onChange={(e) => setCustomPaymentTermsText(e.target.value)}
                            className="w-full h-7 bg-white border border-slate-200 rounded-md px-2 text-[11px] text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-600">Days to Payment</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Days"
                            value={customPaymentDays || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              setCustomPaymentDays(val);
                              if (typeof val === "number" && !isNaN(val)) {
                                setDueDate(addDaysToDateString(invoiceDate, val));
                              }
                            }}
                            className="w-full h-7 bg-white border border-slate-200 rounded-md px-2 text-[11px] text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: OTHER DETAILS */}
            {metaTab === "other" && (
              <div className="space-y-2 animate-in fade-in duration-150">
                {/* PO Number & PO Date - Clean grid matching INVOICE METADATA */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      PO / Order Number
                    </label>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                      <input
                        type="text"
                        placeholder="e.g. PO-89412"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        className="w-full h-8 px-2.5 text-[11px] font-bold text-slate-800 outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      PO Date
                    </label>
                    <DatePickerInput
                      value={poDate || invoiceDate}
                      onChange={(d) => setPoDate(d)}
                    />
                  </div>
                </div>

                {/* Transport & Vehicle Details Toggle Button / Expandable Form */}
                {!showDispatchSection ? (
                  <button
                    type="button"
                    onClick={() => setShowDispatchSection(true)}
                    className="w-full py-2 px-3 border-2 border-dashed border-sky-400/90 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/60 text-sky-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="size-3.5" /> Add Transport & Vehicle Details
                  </button>
                ) : (
                  <div className="space-y-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/90 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <Truck className="size-3 text-indigo-600" /> Transport & Vehicle Details
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDispatchSection(false);
                          setVehicleNumber("");
                          setTransporterName("");
                          setDriverName("");
                          setDriverPhone("");
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                        title="Remove Transport & Vehicle Details"
                      >
                        <X className="size-4.5 stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Vehicle / Truck No</label>
                        <input
                          type="text"
                          placeholder="e.g. MH-12-AB-1234"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Transporter / Carrier</label>
                        <input
                          type="text"
                          placeholder="e.g. VRL Logistics / Blue Dart"
                          value={transporterName}
                          onChange={(e) => setTransporterName(e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Driver Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Kumar"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Driver Phone / Mobile</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765 43210"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Itemized Line Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="size-4 text-emerald-500" />
              LINE ITEMS & SERVICES ({items.length})
            </span>

            <div className="flex items-center gap-2">
              {/* Quick Barcode Search Bar */}
              <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 w-64 md:w-80">
                <Search className="size-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeSubmit}
                  placeholder="Scan or type SKU / barcode..."
                  className="bg-transparent border-none text-xs text-slate-800 outline-none w-full placeholder:text-slate-400"
                />
                <ScanBarcode className="size-4 text-indigo-500 ml-1 shrink-0" />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="bg-[#5b5ce2] hover:bg-[#4f50d0] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-200 cursor-pointer"
              >
                <Plus className="size-3.5" /> Add Item
              </button>

              <button
                type="button"
                onClick={() => setIsMultiProductModalOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                title="Multi-select products"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </div>
          </div>

          {/* ===== Fixed-position autocomplete portal dropdown ===== */}
          {dropdownAnchor ? (() => {
            const openItem = items.find(it => it.id === dropdownAnchor.itemId);
            if (!openItem || !openItem.is_search_open) return null;
            const matchP = products.filter(
              (p) =>
                !openItem.search_query ||
                p.name.toLowerCase().includes((openItem.search_query || "").toLowerCase()) ||
                (p.barcode && p.barcode.toLowerCase().includes((openItem.search_query || "").toLowerCase())) ||
                (p.sku && p.sku.toLowerCase().includes((openItem.search_query || "").toLowerCase()))
            );
            return (
              <div
                style={{
                  position: "fixed",
                  top: dropdownAnchor.top,
                  left: dropdownAnchor.left,
                  width: Math.max(dropdownAnchor.width, 340),
                  zIndex: 9999,
                }}
                className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100"
              >
                {matchP.slice(0, 12).map((prod) => {
                  const uomInfo = extractProductUomInfo(prod);
                  return (
                    <div
                      key={prod.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const batchInfo = getProductBatchInfo(prod);
                        setItems((prev) =>
                          prev.map((it) => {
                            if (it.id !== dropdownAnchor.itemId) return it;
                            const curQty = Number(it.quantity) || 1;
                            return {
                              ...it,
                              product_id: prod.id,
                              product_name: prod.name,
                              search_query: prod.name,
                              uom: uomInfo.uom,
                              secondary_uom: uomInfo.secondary_uom,
                              conversion_factor: uomInfo.conversion_factor,
                              selected_uom: uomInfo.uom,
                              base_unit_price: batchInfo.unit_price,
                              base_mrp: batchInfo.mrp,
                              primary_qty: curQty,
                              secondary_qty: 0,
                              quantity: curQty,
                              unit_price: batchInfo.unit_price,
                              mrp: batchInfo.mrp,
                              batch_number: batchInfo.batch_number,
                              expiry_date: batchInfo.expiry_date,
                              hsn_code: prod.hsn_code || "1905",
                              tax_rate: prod.tax_percent || 18,
                              is_tax_inclusive: prod.is_tax_inclusive !== false,
                              is_search_open: false,
                            };
                          })
                        );
                        setDropdownAnchor(null);
                      }}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{prod.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                          <span>SKU: {prod.sku || "N/A"}</span>
                          <span>• Stock: {prod.stock ?? prod.initial_stock ?? 0}</span>
                          {uomInfo.secondary_uom && uomInfo.conversion_factor > 1 ? (
                            <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              1 {uomInfo.uom} = {uomInfo.conversion_factor} {uomInfo.secondary_uom}
                            </span>
                          ) : (
                            <span>• UOM: {uomInfo.uom}</span>
                          )}
                          <span>• {prod.is_tax_inclusive !== false ? "✅ Incl. GST" : "🔶 Excl. GST"}</span>
                        </div>
                      </div>
                      <div className="text-right font-extrabold text-blue-700 ml-3 shrink-0">
                        <div>
                          {currency.symbol}{Number(getProductTierPrice(prod, 1, pricingMode)).toFixed(2)}
                        </div>
                        <div className="text-[9px] font-normal text-slate-400">
                          {pricingMode} Price
                        </div>
                      </div>
                    </div>
                  );
                })}
                {matchP.length === 0 && (
                  <div className="p-3 text-xs text-slate-400 text-center">No products found</div>
                )}
              </div>
            );
          })() : null}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 py-3 w-10 text-left">#</th>
                  <th className="px-3 py-3 min-w-[200px] text-left">Items / Services</th>
                  {invoiceSettings.showHsn !== false && (
                    <th className="px-3 py-3 w-[9%] min-w-[95px] text-left">HSN/SAC</th>
                  )}
                  {invoiceSettings.showBatchNo && (
                    <th className="px-3 py-3 w-[8%] min-w-[90px] text-left">Batch</th>
                  )}
                  {invoiceSettings.showExpDate && (
                    <th className="px-3 py-3 w-[10%] min-w-[110px] text-left">Exp Date</th>
                  )}
                  {invoiceSettings.showMfgDate && (
                    <th className="px-3 py-3 w-[10%] min-w-[110px] text-left">Mfg Date</th>
                  )}
                  {invoiceSettings.showSerialNo && (
                    <th className="px-3 py-3 w-[10%] min-w-[110px] text-left">Serial / IMEI</th>
                  )}
                  {invoiceSettings.showWarranty && (
                    <th className="px-3 py-3 w-[8%] min-w-[80px] text-left">Warranty</th>
                  )}
                  {invoiceSettings.showMrp !== false && (
                    <th className="px-3 py-3 w-[8%] min-w-[80px] text-left">MRP</th>
                  )}
                  {invoiceSettings.showPurchasePrice && (
                    <th className="px-3 py-3 w-[8%] min-w-[80px] text-left">Cost Price</th>
                  )}
                  <th className="px-3 py-3 w-[12%] min-w-[140px] text-left">Qty</th>
                  <th className="px-3 py-3 w-[9%] min-w-[95px] text-left">Price/Item</th>
                  {invoiceSettings.showDiscount !== false && (
                    <th className="px-3 py-3 w-[11%] min-w-[120px] text-left">Discount</th>
                  )}
                  <th className="px-3 py-3 w-[10%] min-w-[105px] text-left">GST Tax</th>
                  {invoiceSettings.itemCustomColumns?.filter((c) => c.enabled).map((c) => (
                    <th key={c.id} className="px-3 py-3 min-w-[90px] text-left">{c.name}</th>
                  ))}
                  <th className="px-3 py-3 w-[11%] min-w-[105px] text-left font-bold">Amount ({currency.symbol})</th>
                  <th className="px-2 py-3 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length > 0 ? (
                  items.map((item, idx) => {
                    const isIncl = item.is_tax_inclusive === true;
                    const price = Number(item.unit_price) || 0;
                    const qty = Number(item.quantity) || 1;
                    const taxRate = Number(item.tax_rate) || 0;

                    let baseUnitPrice = price;
                    if (isIncl && taxRate > 0) {
                      baseUnitPrice = price / (1 + taxRate / 100);
                    }

                    const lineGross = qty * (isIncl ? baseUnitPrice : price);
                    const dAmt = item.discount_type === "percent"
                      ? lineGross * (item.discount_value / 100)
                      : Math.min(item.discount_value, lineGross);

                    const lineTaxable = Math.max(0, lineGross - dAmt);
                    const lineTaxAmount = (lineTaxable * taxRate) / 100;
                    const lineAmount = isIncl ? (qty * price - dAmt) : (lineTaxable + lineTaxAmount);

                    const sellingPriceIncl = isIncl ? price : price * (1 + taxRate / 100);
                    const mrpVal = Number(item.mrp) || 0;
                    const isMrpExceeded = mrpVal > 0 && sellingPriceIncl > mrpVal;

                    const matchedProduct = products.find((p) => p.id === item.product_id);
                    const itemImageUrl = matchedProduct?.image_url || matchedProduct?.image || "";

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`transition-colors ${item.is_free ? "bg-emerald-50/60 border-l-2 border-l-emerald-400" : isMrpExceeded ? "bg-red-50/40" : "hover:bg-slate-50/80"}`}>
                          <td className="px-3 py-2.5 text-slate-400 font-mono font-medium text-left align-middle">{idx + 1}</td>

                          {/* Product Search & Dropdown */}
                          <td className="px-3 py-2.5 align-middle">
                            <div className="relative">
                              {item.is_free && (
                                <div className="absolute -top-2.5 -right-1 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full z-10 shadow-sm border border-emerald-600 shadow-emerald-200">
                                  FREE
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-lg px-2 py-1.5 transition-all">
                                {invoiceSettings.showItemImage && (
                                  <div className="w-6 h-6 rounded bg-slate-200/80 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                                    {itemImageUrl ? (
                                      <img src={itemImageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Package className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                )}
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Search product / scan barcode..."
                                  value={item.product_name || item.search_query || ""}
                                  onChange={(e) => {
                                    updateItem(item.id, "product_name", e.target.value);
                                    updateItem(item.id, "search_query", e.target.value);
                                    if (e.target.value && !item.is_search_open) {
                                      updateItem(item.id, "is_search_open", true);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownAnchor({
                                      itemId: item.id,
                                      top: rect.bottom + window.scrollY,
                                      left: rect.left + window.scrollX,
                                      width: rect.width,
                                    });
                                    setItems(items.map((it) => (it.id === item.id ? { ...it, is_search_open: true } : it)));
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, is_search_open: false } : it));
                                      setDropdownAnchor(null);
                                    }, 150);
                                  }}
                                  className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                                />
                                {/* GST Mode Interactive Toggle Badge */}
                                <button
                                  type="button"
                                  onClick={() => updateItem(item.id, "is_tax_inclusive", !isIncl)}
                                  title={isIncl ? "Tax Inclusive: Price includes GST. Click to switch to Tax Exclusive" : "Tax Exclusive: GST is added on top of Price. Click to switch to Tax Inclusive"}
                                  className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider transition-all hover:scale-105 cursor-pointer shadow-2xs ${isIncl
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100"
                                    }`}
                                >
                                  {isIncl ? "INCL" : "EXCL"}
                                </button>
                                {/* Note icon */}
                                <button
                                  type="button"
                                  onClick={() => updateItem(item.id, "is_note_open", !item.is_note_open)}
                                  title="Add item note"
                                  className={`shrink-0 p-0.5 rounded transition-all ${item.custom_note ? "text-indigo-600" : "text-slate-300 hover:text-indigo-500"
                                    }`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Custom Note Box */}
                              {item.is_note_open && (
                                <div className="mt-1 p-2 bg-indigo-50 border border-indigo-200 rounded-lg space-y-1 shadow">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800">
                                    <span className="flex items-center gap-1"><StickyNote className="w-3 h-3" /> Note</span>
                                    <button onClick={() => updateItem(item.id, "is_note_open", false)} className="text-indigo-500">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="e.g. Serial #, Gift wrap..."
                                    value={item.custom_note || ""}
                                    onChange={(e) => updateItem(item.id, "custom_note", e.target.value)}
                                    className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-xs text-slate-800 outline-none"
                                  />
                                </div>
                              )}

                              {/* Active Note Badge */}
                              {!item.is_note_open && item.custom_note && (
                                <div
                                  onClick={() => updateItem(item.id, "is_note_open", true)}
                                  className="mt-0.5 text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 w-fit"
                                >
                                  <StickyNote className="w-2.5 h-2.5" /> {item.custom_note}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* HSN/SAC */}
                          {invoiceSettings.showHsn !== false && (
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="HSN"
                                  value={item.hsn_code || ""}
                                  onChange={(e) => updateItem(item.id, "hsn_code", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-left outline-none font-mono text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAIFetchHsn(item.id, item.product_name)}
                                  disabled={aiFetchingHsnId === item.id || !item.product_name}
                                  className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 shrink-0 transition"
                                  title="AI Auto-Fetch HSN & GST Rate"
                                >
                                  {aiFetchingHsnId === item.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Batch */}
                          {invoiceSettings.showBatchNo && (
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center gap-1 min-w-[125px]">
                                <input
                                  type="text"
                                  placeholder="Batch #"
                                  value={item.batch_number || ""}
                                  onChange={(e) => updateItem(item.id, "batch_number", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-left outline-none font-mono text-xs font-bold text-slate-800"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBatchModalItem({
                                      id: item.id,
                                      productId: item.product_id,
                                      productName: item.product_name,
                                      currentBatch: item.batch_number,
                                    })
                                  }
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-lg shrink-0 transition shadow-2xs cursor-pointer"
                                  title="Select or Create Batch (FEFO / Stock / Expiry)"
                                >
                                  <Boxes className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}

                          {/* Exp Date */}
                          {invoiceSettings.showExpDate && (
                            <td className="px-3 py-2.5 align-middle">
                              <DatePickerInput
                                value={item.expiry_date || ""}
                                onChange={(val) => updateItem(item.id, "expiry_date", val)}
                                className="w-full"
                              />
                            </td>
                          )}

                          {/* Mfg Date */}
                          {invoiceSettings.showMfgDate && (
                            <td className="px-3 py-2.5 align-middle">
                              <DatePickerInput
                                value={item.mfg_date || ""}
                                onChange={(val) => updateItem(item.id, "mfg_date", val)}
                                className="w-full"
                              />
                            </td>
                          )}

                          {/* Serial / IMEI */}
                          {invoiceSettings.showSerialNo && (
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="text"
                                placeholder="Serial / IMEI #"
                                value={(item as any).serial_number || ""}
                                onChange={(e) => updateItem(item.id, "serial_number" as any, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-left outline-none font-mono text-xs"
                              />
                            </td>
                          )}

                          {/* Warranty */}
                          {invoiceSettings.showWarranty && (
                            <td className="px-3 py-2.5 align-middle">
                              <input
                                type="text"
                                placeholder="e.g. 1 Year"
                                value={(item as any).warranty || ""}
                                onChange={(e) => updateItem(item.id, "warranty" as any, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-left outline-none text-xs"
                              />
                            </td>
                          )}

                          {/* MRP */}
                          {invoiceSettings.showMrp !== false && (
                            <td className="px-3 py-2.5 align-middle">
                              <div className={`relative flex items-center gap-0.5 rounded-lg border ${isMrpExceeded ? "border-red-400 bg-red-50" : "border-slate-200 bg-slate-50 focus-within:border-indigo-500 focus-within:bg-white"}`}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.mrp || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(item.id, "mrp", e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full bg-transparent px-2.5 py-1.5 text-left outline-none text-xs font-semibold"
                                  placeholder="0"
                                />
                                {isMrpExceeded && (
                                  <span title={`Price ${currency.symbol}${Number(sellingPriceIncl || 0).toFixed(2)} > MRP ${currency.symbol}${Number(mrpVal || 0).toFixed(2)}`}>
                                    <AlertTriangle className="w-3 h-3 text-red-500 mr-1 shrink-0" />
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Cost / Purchase Price */}
                          {invoiceSettings.showPurchasePrice && (
                            <td className="px-3 py-2.5 align-middle">
                              <div className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 text-xs font-mono">
                                {currency.symbol}{Number(matchedProduct?.purchase_price || matchedProduct?.cost_price || 0).toFixed(2)}
                              </div>
                            </td>
                          )}

                          {/* Qty with Primary & Secondary UOM Conversion */}
                          <td className="px-3 py-2.5 align-middle">
                            {item.secondary_uom && Number(item.conversion_factor) > 1 ? (
                              <div className="space-y-1.5 min-w-[150px]">
                                <div className="flex items-center gap-1.5">
                                  {/* Qty Input */}
                                  <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-lg overflow-hidden">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={item.quantity || ""}
                                      onFocus={(e) => e.target.select()}
                                      onChange={(e) => updateItem(item.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                                      className="w-full bg-transparent px-2.5 py-1.5 text-left font-bold text-slate-800 outline-none text-xs"
                                      placeholder="1"
                                      title={`Quantity in ${item.selected_uom || item.uom}`}
                                    />
                                  </div>

                                  {/* Interactive Unit Selector (Primary vs Secondary) */}
                                  <select
                                    value={item.selected_uom || item.uom}
                                    onChange={(e) => updateItem(item.id, "selected_uom", e.target.value)}
                                    className="px-2 py-1.5 text-[11px] font-black rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 outline-none cursor-pointer shadow-2xs transition-all shrink-0"
                                    title={`Click to switch billing unit between ${item.uom} and ${item.secondary_uom}`}
                                  >
                                    <option value={item.uom}>
                                      {item.uom} ({currency.symbol}{Number(item.base_unit_price ?? item.unit_price ?? 0).toFixed(2)})
                                    </option>
                                    <option value={item.secondary_uom}>
                                      {item.secondary_uom} ({currency.symbol}{(Number(item.base_unit_price ?? item.unit_price ?? 0) / (Number(item.conversion_factor) || 1)).toFixed(2)})
                                    </option>
                                  </select>
                                </div>

                                {/* Conversion ratio indicator & formula */}
                                <div className="flex items-center justify-between text-[8.5px] px-0.5 font-semibold text-slate-500">
                                  <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                    1 {item.uom || "Box"} = {item.conversion_factor || 1} {item.secondary_uom}
                                  </span>
                                  <span className="text-emerald-700 font-bold">
                                    {item.selected_uom === item.secondary_uom
                                      ? `Single Unit Rate: ${currency.symbol}${Number(item.unit_price || 0).toFixed(2)}/${item.secondary_uom}`
                                      : `Full Unit Rate: ${currency.symbol}${Number(item.unit_price || 0).toFixed(2)}/${item.uom}`}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-lg px-2 py-1.5 min-w-[80px]">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.quantity || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(item.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full bg-transparent text-left font-bold text-slate-800 outline-none text-xs"
                                  placeholder="1"
                                />
                                <span className="shrink-0 text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                  {item.selected_uom || item.uom || "Pcs"}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Price / Item */}
                          <td className="px-3 py-2.5 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price || ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItem(item.id, "unit_price", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-2.5 py-1.5 text-left font-bold text-indigo-600 outline-none text-xs"
                              placeholder="0.00"
                            />
                          </td>

                          {/* Discount */}
                          {invoiceSettings.showDiscount !== false && (
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center gap-1">
                                <select
                                  value={item.discount_type}
                                  onChange={(e) => updateItem(item.id, "discount_type", e.target.value)}
                                  className="bg-slate-100 border border-slate-200 rounded-md px-1 py-1.5 text-[10px] font-bold text-slate-700 outline-none"
                                >
                                  <option value="percent">%</option>
                                  <option value="amount">{currency.symbol}</option>
                                </select>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.discount_value || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => updateItem(item.id, "discount_value", e.target.value === "" ? "" : Number(e.target.value))}
                                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-2 py-1.5 text-left outline-none text-xs font-semibold text-slate-800"
                                  placeholder="0"
                                />
                              </div>
                            </td>
                          )}

                          {/* GST Tax */}
                          <td className="px-3 py-2.5 align-middle">
                            <select
                              value={item.tax_rate}
                              onChange={(e) => updateItem(item.id, "tax_rate", Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-2 py-1.5 text-left text-[11px] outline-none font-bold text-slate-700"
                            >
                              <option value={0}>0% GST</option>
                              <option value={5}>5% GST</option>
                              <option value={12}>12% GST</option>
                              <option value={18}>18% GST</option>
                              <option value={28}>28% GST</option>
                            </select>
                          </td>

                          {/* Custom Columns Cells */}
                          {invoiceSettings.itemCustomColumns?.filter((c) => c.enabled).map((c) => (
                            <td key={c.id} className="px-3 py-2.5 align-middle">
                              <input
                                type="text"
                                placeholder={c.name}
                                value={(item as any)[`custom_${c.name}`] || ""}
                                onChange={(e) => updateItem(item.id, `custom_${c.name}` as any, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-left outline-none text-xs"
                              />
                            </td>
                          ))}

                          {/* Amount */}
                          <td className="px-3 py-2.5 text-left font-extrabold text-xs sm:text-sm whitespace-nowrap align-middle">
                            {item.is_free ? (
                              <span className="flex items-center gap-1.5">
                                <span className="line-through text-slate-400 font-semibold text-[10px]">{currency.symbol}{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</span>
                                <span className="text-emerald-600 font-extrabold">FREE</span>
                              </span>
                            ) : (
                              <span className="text-slate-900">{currency.symbol}{Number(lineAmount || 0).toFixed(2)}</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-2 py-2.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer inline-flex items-center justify-center"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* MRP exceeded warning row */}
                        {isMrpExceeded && (
                          <tr key={`${item.id}-mrp-warn`} className="bg-red-100 border-l-4 border-red-500">
                            <td colSpan={12} className="px-4 py-1.5">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-red-800">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />
                                <span>
                                  ⚠️ MRP Exceeded! Selling price {currency.symbol}{Number(sellingPriceIncl || 0).toFixed(2)} (incl. tax) &gt; MRP {currency.symbol}{Number(mrpVal || 0).toFixed(2)}.
                                  Please reduce the price or obtain approval before saving.
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-10 text-center">
                      <p className="text-xs text-slate-400">
                        No line items added yet. Click "+ Add Line Item" or scan a barcode above.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Table Bottom Action Bar: + Add Single Blank Row & Multi-Select Products */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5 text-slate-500" /> Add Single Blank Row
              </button>

              <button
                type="button"
                onClick={handleAddFreeItem}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Gift className="size-3.5 text-emerald-600" /> Add Free Item
              </button>

              <button
                type="button"
                onClick={() => setIsMultiProductModalOpen(true)}
                className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Boxes className="size-3.5" />
                <span>Multi-Select Products</span>
                <span className="bg-[#3b82f6] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {products.length > 0 ? `${products.length} Items` : "500 Items"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Footer: Terms/Notes & Complete Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 items-start">
          {/* Left Column: Terms & Conditions + Customer Notes */}
          <div className="space-y-2.5">
            {/* Terms and Conditions Card */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FileText className="size-3.5 text-slate-500" />
                <span>TERMS AND CONDITIONS</span>
              </div>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter invoice terms and conditions..."
                className="w-full bg-slate-50/30 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed resize-y"
              />
            </div>

            {/* Customer Notes & Payment Options Card */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                CUSTOMER NOTES & PAYMENT OPTIONS
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special delivery instructions or payment reference notes..."
                className="w-full h-9 bg-slate-50/30 border border-slate-200/80 rounded-xl px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
              <div className="pt-0.5 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={showPaymentQR}
                    onChange={(e) => setShowPaymentQR(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
                  />
                  <QrCode className="size-4 text-purple-600" />
                  <span>Print UPI Payment QR Code on Receipt</span>
                </label>
              </div>
            </div>

            {/* Transport, Vehicle & Dispatch Details (E-Way Bill / PO / Custom Fields) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Truck className="size-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    TRANSPORT & DISPATCH (VEHICLE / E-WAY BILL)
                  </span>
                  {(vehicleNumber || ewayBillNumber || poNumber) && (
                    <span className="text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEWayBillOpen(true)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title="Generate an official GST E-Way Bill for this invoice"
                  >
                    <Zap className="size-3 text-emerald-600" />
                    <span>⚡ Generate E-Way Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDispatchSection(!showDispatchSection)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ChevronDown className={`size-4 transition-transform duration-200 ${showDispatchSection ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {showDispatchSection ? (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. AP04TX9988 / KA01HQ1234"
                        className="w-full h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Transporter Name / Mode
                      </label>
                      <input
                        type="text"
                        value={transporterName}
                        onChange={(e) => setTransporterName(e.target.value)}
                        placeholder="e.g. VRL Logistics / Road Transport"
                        className="w-full h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Driver Name & Phone
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Driver Name"
                          className="h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value)}
                          placeholder="Driver Phone"
                          className="h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Customer PO / Order Ref & Date
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="PO-2026-9812"
                          className="h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-2 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="date"
                          value={poDate}
                          onChange={(e) => setPoDate(e.target.value)}
                          className="h-8 bg-slate-50/50 border border-slate-200 rounded-lg px-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-200/80">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                        e-Way Bill Number
                      </label>
                      <input
                        type="text"
                        value={ewayBillNumber}
                        onChange={(e) => setEwayBillNumber(e.target.value)}
                        placeholder="e.g. 241019283746"
                        className="w-full h-8 bg-white border border-emerald-200 rounded-lg px-2.5 text-xs font-mono font-extrabold text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                        e-Way Bill Date
                      </label>
                      <input
                        type="date"
                        value={ewayBillDate}
                        onChange={(e) => setEwayBillDate(e.target.value)}
                        className="w-full h-8 bg-white border border-emerald-200 rounded-lg px-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>💡 These fields appear on the Tax Invoice (A4 & Thermal) when filled.</span>
                    {(vehicleNumber || transporterName || driverName || driverPhone || poNumber || ewayBillNumber) && (
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleNumber("");
                          setTransporterName("");
                          setDriverName("");
                          setDriverPhone("");
                          setPoNumber("");
                          setPoDate("");
                          setEwayBillNumber("");
                          setEwayBillDate("");
                        }}
                        className="text-red-500 hover:text-red-700 font-bold underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setShowDispatchSection(true)}
                  className="text-[11px] text-slate-500 bg-slate-50/60 hover:bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Truck className="size-3 text-slate-400" />
                    {vehicleNumber ? (
                      <span className="font-mono font-bold text-slate-800">Vehicle: {vehicleNumber} {transporterName ? `• ${transporterName}` : ''} {ewayBillNumber ? `• EWB: ${ewayBillNumber}` : ''}</span>
                    ) : (
                      <span>Click to add Vehicle No, Transporter, Driver or Customer PO details...</span>
                    )}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 shrink-0">
                    {vehicleNumber || ewayBillNumber ? 'Edit' : '+ Add Details'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Billing Financial Summary Card */}
          <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                BILLING FINANCIAL SUMMARY
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-100">
                INVOICE DISCOUNT
              </span>
            </div>

            {/* Discount Mode & Quick Percentage Selectors */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Discount Calculation Mode</span>
                <div className="flex items-center bg-white rounded-full p-0.5 border border-slate-200 text-xs font-bold shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setInvoiceDiscountMode("before_tax")}
                    className={`px-3 py-1 rounded-full transition-all ${invoiceDiscountMode === "before_tax" ? "bg-[#5b5ce2] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Before Tax
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceDiscountMode("after_tax")}
                    className={`px-3 py-1 rounded-full transition-all ${invoiceDiscountMode === "after_tax" ? "bg-[#5b5ce2] text-white shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    After Tax
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                  {[0, 5, 10, 15, 20, 25].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setInvoiceDiscountType("percent"); setInvoiceDiscountValue(val); }}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${invoiceDiscountType === "percent" && invoiceDiscountValue === val ? "bg-[#5b5ce2] text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"}`}
                    >
                      {val === 0 ? "Off" : `${val}%`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 shrink-0 w-36 shadow-2xs">
                  <input
                    type="number"
                    min="0"
                    placeholder="Custom"
                    value={invoiceDiscountValue || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInvoiceDiscountValue(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
                    className="w-20 text-center text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setInvoiceDiscountType(invoiceDiscountType === "percent" ? "amount" : "percent")}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-black text-slate-700 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
                  >
                    {invoiceDiscountType === "percent" ? "%" : "₹"}
                  </button>
                </div>
              </div>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Gross Subtotal:</span>
              <span className="font-bold text-slate-900">{currency.symbol}{subtotal.toFixed(2)}</span>
            </div>

            {/* Additional Charges Panel */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-700">Additional Charges</span>
                <button
                  type="button"
                  onClick={handleAddChargeRow}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                >
                  + Add Charge Field
                </button>
              </div>

              {customCharges.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No additional charges added.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {customCharges.map((charge) => (
                    <div key={charge.id} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Charge Name"
                        value={charge.name}
                        onChange={(e) => handleUpdateCharge(charge.id, "name", e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400"
                      />
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2.5 top-1 text-[10px] text-slate-400 font-bold">{currency.symbol}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={charge.amount || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleUpdateCharge(charge.id, "amount", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 text-right"
                        />
                      </div>
                      <select
                        value={charge.tax_rate}
                        onChange={(e) => handleUpdateCharge(charge.id, "tax_rate", Number(e.target.value))}
                        title="GST on this charge"
                        className="shrink-0 w-22 bg-white border border-slate-200 rounded-xl px-1.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 cursor-pointer"
                      >
                        <option value={0}>0% GST</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                        <option value={28}>28% GST</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteCharge(charge.id)}
                        title="Delete charge row"
                        className="shrink-0 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Taxable Value & Tax Breakdown */}
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Taxable Value:</span>
              <span className="font-bold text-slate-900">{currency.symbol}{taxableValue.toFixed(2)}</span>
            </div>

            {/* GST Breakdown (CGST+SGST vs IGST manual selection toggle & breakdown) */}
            <div className="pt-2 pb-1 border-t border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 font-bold">Total Tax / GST</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    gstType === "cgst_sgst" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}>
                    {gstType === "cgst_sgst" ? "Intra-State" : "Inter-State"}
                  </span>
                </div>
                {/* Manual Selection Buttons */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setGstType("cgst_sgst");
                      toast.success("Switched Tax to CGST + SGST (Intra-State)");
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                      gstType === "cgst_sgst"
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    CGST+SGST
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGstType("igst");
                      toast.success("Switched Tax to IGST (Inter-State)");
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                      gstType === "igst"
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    IGST
                  </button>
                </div>
              </div>

              {/* Dynamic Breakdown Display */}
              {combinedTax > 0 ? (
                <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/70 space-y-1.5">
                  {posGstBreakdown.bySlab.map((slab) => (
                    <div key={slab.rate} className="flex justify-between items-center text-slate-700 text-[11px] pb-1 border-b border-slate-200/50 last:border-b-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {gstType === "cgst_sgst"
                            ? `GST ${slab.rate}% (CGST ${slab.rate / 2}% + SGST ${slab.rate / 2}%)`
                            : `IGST ${slab.rate}%`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Taxable: {currency.symbol}{slab.taxableAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800">
                          +{currency.symbol}{slab.totalTax.toFixed(2)}
                        </span>
                        {gstType === "cgst_sgst" && (
                          <div className="text-[9.5px] text-slate-500 font-medium">
                            C: {currency.symbol}{slab.cgstAmount.toFixed(2)} | S: {currency.symbol}{slab.sgstAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chargesGstTotal > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1 font-medium">• Charges GST:</span>
                      <span className="font-bold text-slate-800">+{currency.symbol}{chargesGstTotal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700 text-[11px] font-bold pt-1.5 border-t border-slate-200/80">
                    <span>Total GST Amount:</span>
                    <span className="text-indigo-600">+{currency.symbol}{combinedTax.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-xs text-slate-500 font-medium pl-1">
                  <span>GST Amount (0%):</span>
                  <span>+{currency.symbol}0.00</span>
                </div>
              )}
            </div>

            {/* Auto Round-Off */}
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={autoRoundOff}
                  onChange={(e) => setAutoRoundOff(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Auto Round-Off ({roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`})
              </label>
            </div>

            {/* Grand Total */}
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-base font-extrabold text-slate-900">Grand Total Amount:</span>
              <span className="text-2xl font-black text-blue-600">{currency.symbol}{grandTotal.toFixed(2)}</span>
            </div>

            {/* Bank Selection */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Building className="size-3.5 text-blue-600" />
                  Print Bank Details on Invoice
                </label>
                <a
                  href="/accounting?tab=bank_accounts"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                >
                  + Manage Accounts
                </a>
              </div>
              <select
                value={selectedBankAccountId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedBankAccountId(newId);
                  if (newId) {
                    localStorage.setItem("pos_default_bank_account_id", newId);
                    toast.success("Bank account selected!");
                  } else {
                    localStorage.removeItem("pos_default_bank_account_id");
                  }
                }}
                className="w-full h-8 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">(None - Do not print bank details)</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name || b.name} - A/C: {b.account_number} (IFSC: {b.ifsc_code}) {b.is_default ? "★ Default" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Mode & Amount Received */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setPaymentMode(mode);
                    if (mode === "Credit") {
                      setAmountReceived(0);
                    } else if (mode === "Wallet") {
                      setAmountReceived(grandTotal);
                    } else if (mode === "Razorpay") {
                      setIsRazorpayModalOpen(true);
                    } else if (mode === "PineLabs") {
                      setIsPineLabsModalOpen(true);
                    }
                  }}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Razorpay">⚡ Razorpay (Dynamic QR / Checkout / SMS)</option>
                  <option value="PineLabs">💳 Pine Labs EDC (Handheld POS Terminal)</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="NetBanking">Net Banking</option>
                  <option value="Wallet">Wallet (B2B / Store Credit)</option>
                  <option value="Split">Split Bills (Cash + Online)</option>
                  <option value="Credit">Credit (Pay Later)</option>
                </select>
              </div>

              {paymentMode === "Split" ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cash</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={splitCash}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSplitCash(val);
                        const parsed = parseFloat(val) || 0;
                        if (parsed <= grandTotal) {
                           setSplitOnline((grandTotal - parsed).toFixed(2));
                        }
                      }}
                      className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Online</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={splitOnline}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSplitOnline(val);
                        const parsed = parseFloat(val) || 0;
                        if (parsed <= grandTotal) {
                           setSplitCash((grandTotal - parsed).toFixed(2));
                        }
                      }}
                      className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-500 block">Amount Received</label>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      amountReceived === "" || Number(amountReceived) >= grandTotal
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : Number(amountReceived) > 0
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}>
                      {amountReceived === "" || Number(amountReceived) >= grandTotal ? "Full Paid" : Number(amountReceived) > 0 ? "Partial" : "Pay Later"}
                    </span>
                  </div>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={amountReceived}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setAmountReceived(e.target.value ? Number(e.target.value) : "")}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Instant Live Payment Gateways Action Bar */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="size-3.5 text-indigo-600" />
                  Live Integrated Gateways
                </span>
                <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  Real-time Sync
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsRazorpayModalOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <span className="size-4 rounded bg-white text-blue-600 text-[9px] font-black flex items-center justify-center">
                    RZP
                  </span>
                  <span>Razorpay QR & SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPineLabsModalOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <CreditCard className="size-3.5 text-emerald-200" />
                  <span>Pine Labs EDC POS</span>
                </button>
              </div>

              {/* Gateway Captured Verification Badges */}
              {razorpayMetadata?.paymentId && (
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-[11px]">
                      Razorpay Paid: <span className="font-mono">{razorpayMetadata.paymentId}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRazorpayMetadata(null)}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {edcMetadata?.rrn && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-[11px]">
                      Pine Labs EDC Approved: <span className="font-mono">RRN {edcMetadata.rrn}</span>
                      {edcMetadata.cardBrand && ` (${edcMetadata.cardBrand} *${edcMetadata.cardLast4 || ""})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEdcMetadata(null)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Quick Partial Percentage Buttons */}
            <div className="grid grid-cols-5 gap-1 pt-0.5">
              {[
                { label: "100%", val: grandTotal },
                { label: "75%", val: Number((grandTotal * 0.75).toFixed(2)) },
                { label: "50%", val: Number((grandTotal * 0.50).toFixed(2)) },
                { label: "25%", val: Number((grandTotal * 0.25).toFixed(2)) },
                { label: "Due 0%", val: 0 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setAmountReceived(btn.val);
                    if (btn.val === 0) {
                      setPaymentMode("Credit");
                    } else if (paymentMode === "Credit") {
                      setPaymentMode("Cash");
                    }
                  }}
                  className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    Number(amountReceived) === btn.val
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('a4')}
                className="w-full py-3.5 bg-[#5b5ce2] hover:bg-[#4f50d0] text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/25 transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="size-4" />
                {isSaving
                  ? `Saving ${getDocTitle(invoiceType)}...`
                  : `SUBMIT & DOWNLOAD PDF ${getDocButtonNoun(invoiceType)} (${currency.symbol}${grandTotal.toFixed(2)})`}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('thermal')}
                  className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <QrCode className="size-3.5" /> Thermal
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('none')}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  Save Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (items.length === 0) return toast.error("Please add items to bill before generating E-Way Bill");
                    setIsEWayBillOpen(true);
                  }}
                  className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Truck className="size-3.5" /> E-Way Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Create Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-[520px] w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Create & Add New Product
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="space-y-3">
              {/* Product Photo Upload */}
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="size-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {newProdImage ? (
                    <img src={newProdImage} alt="Product" className="size-full object-cover" />
                  ) : (
                    <Package className="size-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <Upload className="size-3" /> Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => setNewProdImage(evt.target?.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {newProdImage && (
                      <button
                        type="button"
                        onClick={() => setNewProdImage("")}
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pain d'épices artisanal"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  required
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="Optional barcode"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* 3-Tier Pricing Breakdown */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  💰 3-Tier Multi-Pricing Breakdown
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">🛒 Retail Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 200.00"
                      value={newProdPrice || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewProdPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      required
                      className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">📦 Wholesale (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 165.00"
                      value={newProdWholesalePrice || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewProdWholesalePrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">🏢 B2B Contract (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 140.00"
                      value={newProdB2bPrice || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewProdB2bPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Market MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 240.00"
                      value={newProdMrp || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewProdMrp(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">GST Tax Rate</label>
                    <select
                      value={newProdTax}
                      onChange={(e) => setNewProdTax(Number(e.target.value))}
                      className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2 text-xs font-bold outline-none"
                    >
                      <option value={0}>0% GST</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Initial Stock</label>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newProdStock || ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewProdStock(e.target.value === "" ? (0 as any) : Number(e.target.value))}
                      className="w-full h-8 bg-white border border-slate-300 rounded-lg px-2.5 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Product & Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Party Modal — Landscape Rectangular Multi-Address Book Dialog */}
      {isAddPartyOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 md:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-slate-900 leading-tight">
                    Create New Customer / Party
                  </h3>
                  <p className="text-xs text-slate-500">
                    Single customer account with multiple delivery & billing address locations (Home, Office, Warehouse).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPartyOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewParty} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* ── Left Column (5 Cols): Primary Customer Profile & Tax ── */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="size-3.5 text-indigo-600" /> Primary Customer Identity
                    </span>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Party / Customer Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp / John Doe"
                        value={newPartyName}
                        onChange={(e) => setNewPartyName(e.target.value)}
                        required
                        className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                        <input
                          type="text"
                          placeholder="+91 9876543210"
                          value={newPartyPhone}
                          onChange={(e) => setNewPartyPhone(e.target.value)}
                          required
                          className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Email Address <span className="text-[10px] font-normal text-slate-400">(Optional)</span></label>
                        <input
                          type="email"
                          placeholder="contact@company.com"
                          value={newPartyEmail}
                          onChange={(e) => setNewPartyEmail(e.target.value)}
                          className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Company / Brand</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Pvt Ltd"
                          value={newPartyCompany}
                          onChange={(e) => setNewPartyCompany(e.target.value)}
                          className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Customer Type</label>
                        <select
                          value={newPartyType}
                          onChange={(e) => setNewPartyType(e.target.value)}
                          className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="Retail">Retail Customer</option>
                          <option value="Wholesale">Wholesale Client</option>
                          <option value="B2B">B2B Business Party</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* GSTIN Verification Card */}
                  <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Sparkles className="size-3.5 text-indigo-600" /> GSTIN / Tax ID Number
                      </label>
                      <span className="text-[10px] text-slate-500">Auto-populates company</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 37AABCU9603R1ZM"
                        value={newPartyGST}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setNewPartyGST(val);
                          if (val.length === 15) {
                            handleVerifyGstin(val);
                          }
                        }}
                        maxLength={15}
                        className="flex-1 h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyGstin()}
                        disabled={isVerifyingGstin || !newPartyGST.trim()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {isVerifyingGstin ? (
                          <span className="animate-spin text-xs">⏳</span>
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        {isVerifyingGstin ? "Verifying..." : "⚡ Auto-fill"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Right Column (7 Cols): Swiggy/Zomato Multiple Address Book ── */}
                <div className="lg:col-span-7 space-y-3.5">
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-indigo-600" /> Multi-Address Book ({newPartyAddresses.length})
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Save multiple locations for this customer (Home, Office, Warehouse).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddNewAddressSlot("Office")}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="size-3" /> Add Location
                      </button>
                    </div>

                    {/* Address Tag Selector Tabs (Swiggy / Zomato Style) */}
                    <div className="flex flex-wrap gap-1.5">
                      {newPartyAddresses.map((addr, idx) => (
                        <div
                          key={addr.id || idx}
                          onClick={() => setActiveAddrIndex(idx)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                            activeAddrIndex === idx
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>
                            {addr.tag === "Home" ? "🏠" : addr.tag === "Office" ? "🏢" : addr.tag === "Warehouse" ? "🏭" : addr.tag === "Branch" ? "🏬" : "📍"} {addr.tag} #{idx + 1}
                          </span>
                          {newPartyAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAddressSlot(idx);
                              }}
                              className={`p-0.5 rounded-full hover:bg-black/20 ${activeAddrIndex === idx ? "text-white" : "text-slate-400 hover:text-rose-600"}`}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Active Address Form Editor */}
                    {newPartyAddresses[activeAddrIndex] && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Location Tag:</span>
                            <div className="flex gap-1">
                              {(["Home", "Office", "Warehouse", "Branch", "Other"] as const).map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newPartyAddresses];
                                    updated[activeAddrIndex].tag = t;
                                    setNewPartyAddresses(updated);
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                    newPartyAddresses[activeAddrIndex].tag === t
                                      ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {t === "Home" ? "🏠 Home" : t === "Office" ? "🏢 Office" : t === "Warehouse" ? "🏭 Warehouse" : t === "Branch" ? "🏬 Branch" : "📍 Other"}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Building, Street & Area</label>
                          <input
                            type="text"
                            placeholder="e.g. Door 14/2, Market Street / Tech Park"
                            value={newPartyAddresses[activeAddrIndex].street}
                            onChange={(e) => {
                              const updated = [...newPartyAddresses];
                              updated[activeAddrIndex].street = e.target.value;
                              setNewPartyAddresses(updated);
                            }}
                            className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">City / Town</label>
                            <input
                              type="text"
                              placeholder="City"
                              value={newPartyAddresses[activeAddrIndex].city}
                              onChange={(e) => {
                                const updated = [...newPartyAddresses];
                                updated[activeAddrIndex].city = e.target.value;
                                setNewPartyAddresses(updated);
                              }}
                              className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1">State / UT (GST)</label>
                            <select
                              value={newPartyAddresses[activeAddrIndex].state}
                              onChange={(e) => {
                                const updated = [...newPartyAddresses];
                                updated[activeAddrIndex].state = e.target.value;
                                setNewPartyAddresses(updated);
                              }}
                              className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-1.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                              placeholder="e.g. 516360"
                              maxLength={6}
                              value={newPartyAddresses[activeAddrIndex].pincode}
                              onChange={(e) => handleActiveAddrPincodeChange(e.target.value)}
                              className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-700">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newPartyAddresses[activeAddrIndex].is_billing}
                              onChange={(e) => {
                                const updated = [...newPartyAddresses];
                                updated[activeAddrIndex].is_billing = e.target.checked;
                                setNewPartyAddresses(updated);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Default Billing Address</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newPartyAddresses[activeAddrIndex].is_shipping}
                              onChange={(e) => {
                                const updated = [...newPartyAddresses];
                                updated[activeAddrIndex].is_shipping = e.target.checked;
                                setNewPartyAddresses(updated);
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Default Delivery / Shipping</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-400">
                  Total {newPartyAddresses.length} address location(s) configured.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPartyOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="size-4" /> Create & Select Party
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pending Due Alert Modal */}
      {showPendingDueAlert && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowPendingDueAlert(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">Pending Dues Alert</h2>
              <p className="text-sm text-slate-600 mb-6">
                This customer has an outstanding balance of <span className="font-bold text-rose-600">{currency.symbol}{(customerSummary?.total_pending_due || 0).toFixed(2)}</span>.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowPendingDueAlert(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Ignore & Bill
                </button>
                <button
                  onClick={() => {
                    setShowPendingDueAlert(false);
                    setShowCustomerLedger(true);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-200"
                >
                  View Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal */}
      {showCustomerLedger && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white w-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-800">Customer Ledger</h2>
                <p className="text-xs text-slate-500 mt-1">Pending invoices and payment history</p>
              </div>
              <button onClick={() => setShowCustomerLedger(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-white flex-1">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-rose-700 uppercase">Total Outstanding</p>
                  <p className="text-3xl font-black text-rose-600">{currency.symbol}{(customerSummary?.total_pending_due || 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => {
                    setIncludePreviousDueInBill(true);
                    setShowCustomerLedger(false);
                    toast.success("Previous dues added to current bill");
                  }}
                  className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 text-sm shadow-md"
                >
                  Add to Current Bill
                </button>
              </div>

              <h3 className="font-bold text-slate-700 mb-3 text-sm">Unpaid Invoices</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Invoice ID</th>
                      <th className="px-4 py-3 font-semibold text-right">Original Amount</th>
                      <th className="px-4 py-3 font-semibold text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">12 Oct 2025</td>
                      <td className="px-4 py-3 font-mono text-indigo-600 text-xs">INV-25-1002</td>
                      <td className="px-4 py-3 text-right text-slate-600">{currency.symbol}12500.00</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{currency.symbol}5000.00</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">05 Nov 2025</td>
                      <td className="px-4 py-3 font-mono text-indigo-600 text-xs">INV-25-1145</td>
                      <td className="px-4 py-3 text-right text-slate-600">{currency.symbol}4800.00</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{currency.symbol}4800.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Product Selection Catalog Modal */}
      {isMultiProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-200">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 leading-tight">
                      Multi-Product Catalog Selector
                    </h3>
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {products.length} {products.length === 1 ? "Product" : "Products"} Loaded
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Select multiple products & quantities to add directly to invoice items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadProducts}
                  disabled={isLoadingProducts}
                  title="Reload inventory products"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? "animate-spin text-blue-600" : "text-slate-600"}`} />
                  <span>{isLoadingProducts ? "Loading..." : "Refresh"}</span>
                </button>
                <button
                  onClick={() => setIsMultiProductModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by product name, barcode, SKU, brand, HSN..."
                  value={multiProductSearch}
                  onChange={(e) => setMultiProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const filtered = products.filter((p: any) => {
                      const q = multiProductSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        p.name?.toLowerCase().includes(q) ||
                        p.barcode?.toLowerCase().includes(q) ||
                        p.sku?.toLowerCase().includes(q) ||
                        (p.brand?.name || p.brand)?.toLowerCase().includes(q) ||
                        (p.category?.name || p.category)?.toLowerCase().includes(q) ||
                        p.hsn_code?.toLowerCase().includes(q)
                      );
                    });
                    const newSelected: Record<string, number> = {};
                    filtered.forEach((p: any) => {
                      newSelected[p.id] = selectedProductQuantities[p.id] || 1;
                    });
                    setSelectedProductQuantities(newSelected);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all shrink-0"
                >
                  Select All Visible
                </button>
                {Object.keys(selectedProductQuantities).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedProductQuantities({})}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition-all shrink-0"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Product Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {isLoadingProducts && products.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-bold text-slate-700">Loading products from inventory...</p>
                  <p className="text-xs text-slate-400">Fetching ERP product catalog & POS items.</p>
                </div>
              ) : (() => {
                const filtered = products.filter((p: any) => {
                  const q = multiProductSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.name?.toLowerCase().includes(q) ||
                    p.barcode?.toLowerCase().includes(q) ||
                    p.sku?.toLowerCase().includes(q) ||
                    (p.brand?.name || p.brand)?.toLowerCase().includes(q) ||
                    (p.category?.name || p.category)?.toLowerCase().includes(q) ||
                    p.hsn_code?.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-300">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                        <Boxes className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        {multiProductSearch.trim() ? "No matching products found" : "No products found in inventory"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mb-4">
                        {multiProductSearch.trim()
                          ? `No items match the search query "${multiProductSearch}". Try adjusting your keywords or clearing the search.`
                          : "You haven't added any products yet or they are loading from your inventory catalog."}
                      </p>
                      <div className="flex items-center gap-2">
                        {multiProductSearch.trim() ? (
                          <button
                            type="button"
                            onClick={() => setMultiProductSearch("")}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                          >
                            Clear Search
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={loadProducts}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Refresh Inventory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMultiProductModalOpen(false);
                            setIsAddProductOpen(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add New Product
                        </button>
                      </div>
                    </div>
                  );
                }

                return filtered.map((p: any) => {
                  const isSelected = !!selectedProductQuantities[p.id];
                  const qty = selectedProductQuantities[p.id] || 1;
                  const specs = typeof p.specifications === "string" ? JSON.parse(p.specifications || "{}") : (p.specifications || {});
                  const basePrice = Number(p.selling_price || p.price || p.mrp || 0);
                  const wholesalePrice = Number(p.wholesale_price && Number(p.wholesale_price) > 0 ? p.wholesale_price : (specs.wholesale_price && Number(specs.wholesale_price) > 0 ? specs.wholesale_price : basePrice));
                  const b2bPrice = Number(p.b2b_price && Number(p.b2b_price) > 0 ? p.b2b_price : (specs.b2b_price && Number(specs.b2b_price) > 0 ? specs.b2b_price : basePrice));
                  const price =
                    pricingMode === "B2B"
                      ? b2bPrice
                      : pricingMode === "Wholesale"
                        ? wholesalePrice
                        : basePrice;

                  const brandName = p.brand?.name || p.brand || "";
                  const categoryName = p.category?.name || p.category || "";

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleMultiSelectProduct(p.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isSelected
                        ? "bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                        }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isSelected ? "bg-blue-600 text-white" : "border-2 border-slate-300 text-transparent"
                            }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.barcode && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                {p.barcode}
                              </span>
                            )}
                            {brandName && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                                {brandName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                            <span>SKU: <strong className="text-slate-700">{p.sku || "N/A"}</strong></span>
                            {categoryName && (
                              <>
                                <span>•</span>
                                <span>{categoryName}</span>
                              </>
                            )}
                            {p.hsn_code && (
                              <>
                                <span>•</span>
                                <span>HSN: <strong className="text-slate-700">{p.hsn_code}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              Stock: <span className={(p.stock || p.initial_stock || 0) > 10 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{p.stock || p.initial_stock || 0}</span>
                            </span>
                            {(() => {
                              const uInfo = extractProductUomInfo(p);
                              if (uInfo.secondary_uom && uInfo.conversion_factor > 1) {
                                return (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                      1 {uInfo.uom} = {uInfo.conversion_factor} {uInfo.secondary_uom}
                                    </span>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <span>•</span>
                                  <span>UOM: <strong className="text-slate-700">{uInfo.uom}</strong></span>
                                </>
                              );
                            })()}
                            <span>•</span>
                            <span>GST: <strong className="text-slate-700">{p.tax_percent || 18}%</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Quantity Stepper */}
                      <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <div className="font-black text-xs text-slate-900">
                            ₹{Number(price).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            MRP: ₹{Number(p.mrp || price).toFixed(2)}
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center rounded-xl border-2 border-blue-500 bg-white px-2 py-1 shadow-xs focus-within:ring-2 focus-within:ring-blue-400">
                              <span className="text-[11px] font-bold text-slate-400 mr-1">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                placeholder="1"
                                value={selectedProductQuantities[p.id] || ""}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0);
                                  setSelectedProductQuantities((prev) => ({ ...prev, [p.id]: val }));
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value) || 1;
                                  setSelectedProductQuantities((prev) => ({ ...prev, [p.id]: Math.max(1, val) }));
                                }}
                                className="w-16 text-center text-xs font-black text-blue-700 bg-transparent outline-none font-mono"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleMultiSelectProduct(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Unselect"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleMultiSelectProduct(p.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                          >
                            + Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Sticky Bottom Summary & Action */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {Object.keys(selectedProductQuantities).length} Product{Object.keys(selectedProductQuantities).length === 1 ? "" : "s"} Selected
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Pricing Mode: <strong className="text-indigo-600">{pricingMode}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMultiProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Object.keys(selectedProductQuantities).length === 0}
                  onClick={handleAddMultipleProductsToInvoice}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                >
                  <Boxes className="w-4 h-4" />
                  Add {Object.keys(selectedProductQuantities).length} Selected to Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Invoices Directory Modal */}
      {isUnpaidModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Unpaid / Pending Bills</h3>
                  <p className="text-xs text-amber-100 font-medium">{unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? "" : "s"} waiting for payment settlement</p>
                </div>
              </div>
              <button
                onClick={() => setIsUnpaidModalOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by invoice number or customer name..."
                value={unpaidSearchQuery}
                onChange={(e) => setUnpaidSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
              {unpaidSearchQuery && (
                <button onClick={() => setUnpaidSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
              {unpaidInvoices
                .filter((u) => {
                  if (!unpaidSearchQuery) return true;
                  const q = unpaidSearchQuery.toLowerCase();
                  return (
                    u.invoice_number?.toLowerCase().includes(q) ||
                    u.customer_name?.toLowerCase().includes(q) ||
                    u.customer_phone?.includes(q)
                  );
                })
                .map((u) => {
                  const dueAmt = Math.max(0, Number(u.grand_total || 0) - Number(u.amount_received || 0));
                  return (
                    <div
                      key={u.id || u.invoice_number}
                      className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-amber-50/50 border border-transparent hover:border-amber-200 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{u.invoice_number}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            Unpaid
                          </span>
                          {u.invoice_date && (
                            <span className="text-[10px] text-slate-400 font-medium">Date: {u.invoice_date}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.customer_name}</span>
                          {u.customer_phone && <span className="text-slate-400">({u.customer_phone})</span>}
                        </div>
                        {u.items && u.items.length > 0 && (
                          <div className="text-[11px] text-slate-500 truncate max-w-sm">
                            Items: {u.items.map((it: any) => `${it.quantity}x ${it.product_name || 'Item'}`).join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 font-medium">Balance Due</div>
                          <div className="text-base font-black text-amber-700">
                            {currency.symbol}{Number(dueAmt || u.grand_total || 0).toFixed(2)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectUnpaidInvoice(u)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Load & Settle Bill</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {unpaidInvoices.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                  <p className="text-sm font-bold text-slate-700">All Bills are Settled!</p>
                  <p className="text-xs text-slate-400">No pending unpaid or credit invoices found.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsUnpaidModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full A4 Printable Invoice Modal */}
      <FullInvoicePrinter
        invoice={fullInvoiceModalData}
        isOpen={isFullInvoiceOpen}
        onClose={() => setIsFullInvoiceOpen(false)}
        autoPrint={autoPrintFullInvoice}
        customTemplate={{
          bankDetails: getSelectedBankDetailsString(),
          fields: {
            showBankDetails: Boolean(selectedBankAccountId && getSelectedBankDetailsString())
          }
        }}
      />

      {/* Product Batch & Traceability Selection Modal */}
      {batchModalItem && (
        <BatchSelectorModal
          isOpen={!!batchModalItem}
          onClose={() => setBatchModalItem(null)}
          productId={batchModalItem.productId}
          productName={batchModalItem.productName}
          currentBatchNumber={batchModalItem.currentBatch}
          onSelectBatch={(batch) => {
            setItems((prev) =>
              prev.map((it) => {
                if (it.id !== batchModalItem.id) return it;
                const factor = Number(it.conversion_factor) > 1 ? Number(it.conversion_factor) : 1;
                const newPrice = Number(batch.selling_price) > 0 ? Number(batch.selling_price) : it.unit_price;
                const newMrp = Number(batch.mrp) > 0 ? Number(batch.mrp) : it.mrp;
                const effectivePrice =
                  it.selected_uom === it.secondary_uom && factor > 1
                    ? Number((newPrice / factor).toFixed(2))
                    : newPrice;
                const effectiveMrp =
                  it.selected_uom === it.secondary_uom && factor > 1 && newMrp
                    ? Number((newMrp / factor).toFixed(2))
                    : newMrp;

                return {
                  ...it,
                  batch_id: batch.id,
                  batch_number: batch.batch_number,
                  expiry_date: batch.expiry_date || it.expiry_date,
                  mfg_date: batch.mfg_date || it.mfg_date,
                  warehouse_name: batch.warehouse_name || it.warehouse_name,
                  warehouse_id: batch.warehouse_id || it.warehouse_id,
                  base_unit_price: newPrice,
                  unit_price: effectivePrice,
                  base_mrp: newMrp,
                  mrp: effectiveMrp,
                };
              })
            );
            toast.success(
              `Selected Batch #${batch.batch_number}${batch.remaining_quantity !== undefined ? ` (Stock: ${batch.remaining_quantity})` : ""}${batch.expiry_date ? ` (Exp: ${batch.expiry_date})` : ""}`
            );
          }}
        />
      )}

      {/* E-Way Bill Generation Modal (Whitebooks GSP) */}
      <EWayBillModal
        isOpen={isEWayBillOpen}
        onClose={() => setIsEWayBillOpen(false)}
        onGenerated={(ewbInfo) => {
          if (ewbInfo?.eway_bill_number) {
            setEwayBillNumber(ewbInfo.eway_bill_number);
          }
          if (ewbInfo?.eway_bill_date || ewbInfo?.valid_until) {
            setEwayBillDate(ewbInfo.eway_bill_date || ewbInfo.valid_until || invoiceDate);
          }
          if (ewbInfo?.vehicle_number) {
            setVehicleNumber(ewbInfo.vehicle_number);
          }
          if (ewbInfo?.transporter_name) {
            setTransporterName(ewbInfo.transporter_name);
          }
          setShowDispatchSection(true);
        }}
        invoiceData={{
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          total_amount: grandTotal,
          cgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
          sgst_amount: gstType === 'cgst_sgst' ? totalTax / 2 : 0,
          igst_amount: gstType === 'igst' ? totalTax : 0,
          to_customer_name: customers.find((c) => c.id === selectedCustomer)?.name || 'Walk-in Customer',
          to_gstin: customers.find((c) => c.id === selectedCustomer)?.gst_number || 'URP',
          vehicle_number: vehicleNumber || undefined,
          transporter_name: transporterName || undefined,
          items: items.map(it => ({
            product_name: it.product_name,
            hsn_code: it.hsn_code,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
          })),
        }}
      />

      {/* Inline Customer Address Book Manager Modal */}
      {isEditAddressesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-slate-900 leading-tight">
                    Manage Addresses — {customers.find(c => c.id === selectedCustomer)?.name || "Customer"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add or update multiple branch, warehouse, or billing destinations for this customer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditAddressesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Address Tabs & Add Button */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 shrink-0 flex-wrap">
              <div className="flex flex-wrap gap-1.5 items-center">
                {editingCustomerAddresses.map((addr, idx) => (
                  <div
                    key={addr.id || idx}
                    onClick={() => setActiveEditingAddrIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                      activeEditingAddrIndex === idx
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{addr.tag || `Location ${idx + 1}`}</span>
                    {addr.is_default_billing && <span className="text-[9px] bg-white/20 px-1 rounded">Bill</span>}
                    {addr.is_default_shipping && <span className="text-[9px] bg-white/20 px-1 rounded">Ship</span>}
                    {editingCustomerAddresses.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEditingAddress(idx);
                        }}
                        className={`p-0.5 rounded hover:bg-rose-500 hover:text-white transition-colors ${activeEditingAddrIndex === idx ? "text-white/80" : "text-slate-400"}`}
                        title="Remove address"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddNewEditingAddress("Branch")}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="size-3.5" /> Add Location
              </button>
            </div>

            {/* Active Address Form */}
            {editingCustomerAddresses[activeEditingAddrIndex] && (
              <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Location Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Head Office, Warehouse 1"
                      value={editingCustomerAddresses[activeEditingAddrIndex].tag || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "tag", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address Usage</label>
                    <select
                      value={editingCustomerAddresses[activeEditingAddrIndex].type || "both"}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "type", e.target.value as any)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="both">Both (Billing & Shipping)</option>
                      <option value="billing">Billing Only</option>
                      <option value="shipping">Shipping Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Location GSTIN</label>
                    <input
                      type="text"
                      placeholder="Optional branch GSTIN"
                      value={editingCustomerAddresses[activeEditingAddrIndex].gst_number || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "gst_number", e.target.value.toUpperCase())}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Street Address / Landmark</label>
                    <input
                      type="text"
                      placeholder="Door / Plot no., Street name, Area..."
                      value={editingCustomerAddresses[activeEditingAddrIndex].street || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "street", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Pincode {isLookingUpPincode && <span className="text-indigo-600 font-normal">(Looking up...)</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 500081"
                      value={editingCustomerAddresses[activeEditingAddrIndex].pincode || ""}
                      onChange={(e) => void handleEditingAddrPincodeChange(e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="City"
                      value={editingCustomerAddresses[activeEditingAddrIndex].city || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "city", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">State</label>
                    <input
                      type="text"
                      placeholder="State"
                      value={editingCustomerAddresses[activeEditingAddrIndex].state || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "state", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="Country"
                      value={editingCustomerAddresses[activeEditingAddrIndex].country || "India"}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "country", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person at Site</label>
                    <input
                      type="text"
                      placeholder="Site Manager name"
                      value={editingCustomerAddresses[activeEditingAddrIndex].contact_person || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "contact_person", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="Site Phone"
                      value={editingCustomerAddresses[activeEditingAddrIndex].contact_phone || ""}
                      onChange={(e) => handleUpdateEditingAddressField(activeEditingAddrIndex, "contact_phone", e.target.value)}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(editingCustomerAddresses[activeEditingAddrIndex].is_default_billing)}
                      onChange={(e) => {
                        const updated = editingCustomerAddresses.map((a, i) => ({
                          ...a,
                          is_default_billing: i === activeEditingAddrIndex ? e.target.checked : false,
                        }));
                        setEditingCustomerAddresses(updated);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
                    />
                    <span>Set as Primary Billing Location</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(editingCustomerAddresses[activeEditingAddrIndex].is_default_shipping)}
                      onChange={(e) => {
                        const updated = editingCustomerAddresses.map((a, i) => ({
                          ...a,
                          is_default_shipping: i === activeEditingAddrIndex ? e.target.checked : false,
                        }));
                        setEditingCustomerAddresses(updated);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
                    />
                    <span>Set as Primary Shipping / Delivery Location</span>
                  </label>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-2xl flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => window.open('/crm?tab=customers', '_blank')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
              >
                <Building className="size-3.5" /> Open Full Profile in CRM Customers
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditAddressesModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingCustomerAddresses}
                  onClick={handleSaveCustomerAddresses}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSavingCustomerAddresses ? "Saving..." : "Save & Apply to Current Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pine Labs Handheld EDC Terminal Modal */}
      <PineLabsEDCModal
        isOpen={isPineLabsModalOpen}
        amount={Number(amountReceived) > 0 ? Number(amountReceived) : grandTotal}
        billNumber={invoiceNumber || `INV-${Date.now().toString().slice(-6)}`}
        customerMobile={activeCustomerObj?.phone || activeCustomerObj?.mobile || ""}
        onClose={() => setIsPineLabsModalOpen(false)}
        onSuccess={(payData) => {
          setPaymentMode("PineLabs");
          setAmountReceived(payData.amount || grandTotal);
          setEdcMetadata({
            rrn: payData.rrn,
            authCode: payData.authCode,
            cardBrand: payData.cardBrand,
            cardLast4: payData.cardLast4,
            batchNumber: payData.batchNumber,
          });
          setIsPineLabsModalOpen(false);
          toast.success(`Payment captured via PineLabs EDC (RRN: ${payData.rrn})`);
        }}
      />

      {/* Razorpay Dynamic UPI QR & SMS Link Modal */}
      <RazorpayPOSModal
        isOpen={isRazorpayModalOpen}
        amount={Number(amountReceived) > 0 ? Number(amountReceived) : grandTotal}
        billNumber={invoiceNumber || `INV-${Date.now().toString().slice(-6)}`}
        customerMobile={activeCustomerObj?.phone || activeCustomerObj?.mobile || ""}
        customerName={activeCustomerObj?.name || ""}
        onClose={() => setIsRazorpayModalOpen(false)}
        onSuccess={(payData) => {
          setPaymentMode("Razorpay");
          setAmountReceived(payData.amount || grandTotal);
          setRazorpayMetadata({
            paymentId: payData.paymentId,
            orderId: payData.orderId,
          });
          setIsRazorpayModalOpen(false);
          toast.success(`Razorpay Payment verified (${payData.paymentId})`);
        }}
      />

      {/* Edit Customer Details for this Bill Modal */}
      {isEditPartyDetailsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                  <Pencil className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-slate-900 leading-tight">
                    Edit Customer Details for this Invoice
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modify customer name, mobile number, GSTIN, and billing/shipping address for this bill.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPartyDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePartyDetailsEdit} className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
              {/* Primary Details: Name, Mobile, Email, GST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Customer / Party Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Traders / John Doe"
                      value={editPartyForm.name}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, name: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mobile / Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={editPartyForm.phone}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, phone: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="e.g. customer@example.com"
                      value={editPartyForm.email}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, email: e.target.value })}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    GSTIN / Tax ID
                  </label>
                  <div className="relative">
                    <Building className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 37AAAAA0000A1Z5"
                      value={editPartyForm.gst_number}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setEditPartyForm({ ...editPartyForm, gst_number: val });
                      }}
                      className="w-full h-9 bg-white border border-slate-300 rounded-xl pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-2.5 bg-indigo-50/30 p-3.5 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-indigo-600" /> Billing Address
                  </span>
                  {isLookingUpEditPin && (
                    <span className="text-[10px] text-indigo-600 font-bold animate-pulse">
                      Looking up pincode...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Street Address / Area</label>
                    <input
                      type="text"
                      placeholder="Door / Building / Street name"
                      value={editPartyForm.billing_street}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, billing_street: e.target.value })}
                      className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Pincode</label>
                    <input
                      type="text"
                      placeholder="6-digit PIN"
                      maxLength={6}
                      value={editPartyForm.billing_pincode}
                      onChange={(e) => handleEditPartyPincode(e.target.value, "billing")}
                      className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">City / District</label>
                    <input
                      type="text"
                      placeholder="e.g. Visakhapatnam"
                      value={editPartyForm.billing_city}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, billing_city: e.target.value })}
                      className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">State / Province</label>
                    <select
                      value={editPartyForm.billing_state}
                      onChange={(e) => setEditPartyForm({ ...editPartyForm, billing_state: e.target.value })}
                      className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping / Delivery Destination Address */}
              <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck className="size-3.5 text-indigo-600" /> Shipping / Delivery Address
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={editPartyForm.same_as_billing}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditPartyForm({
                          ...editPartyForm,
                          same_as_billing: checked,
                          shipping_street: checked ? editPartyForm.billing_street : editPartyForm.shipping_street,
                          shipping_city: checked ? editPartyForm.billing_city : editPartyForm.shipping_city,
                          shipping_state: checked ? editPartyForm.billing_state : editPartyForm.shipping_state,
                          shipping_pincode: checked ? editPartyForm.billing_pincode : editPartyForm.shipping_pincode,
                        });
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-3.5"
                    />
                    <span>Same as Billing</span>
                  </label>
                </div>

                {!editPartyForm.same_as_billing && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="md:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination Street Address</label>
                        <input
                          type="text"
                          placeholder="Warehouse / Branch / Site Street"
                          value={editPartyForm.shipping_street}
                          onChange={(e) => setEditPartyForm({ ...editPartyForm, shipping_street: e.target.value })}
                          className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination PIN</label>
                        <input
                          type="text"
                          placeholder="6-digit PIN"
                          maxLength={6}
                          value={editPartyForm.shipping_pincode}
                          onChange={(e) => handleEditPartyPincode(e.target.value, "shipping")}
                          className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination City</label>
                        <input
                          type="text"
                          placeholder="e.g. Hyderabad"
                          value={editPartyForm.shipping_city}
                          onChange={(e) => setEditPartyForm({ ...editPartyForm, shipping_city: e.target.value })}
                          className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Destination State</label>
                        <select
                          value={editPartyForm.shipping_state}
                          onChange={(e) => setEditPartyForm({ ...editPartyForm, shipping_state: e.target.value })}
                          className="w-full h-8.5 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {INDIAN_STATES.map((s) => (
                            <option key={s.code} value={s.name}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Update in CRM checkbox */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editPartyForm.update_in_crm}
                    onChange={(e) => setEditPartyForm({ ...editPartyForm, update_in_crm: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
                  />
                  <span>Also update customer profile in CRM directory</span>
                </label>
                <span className="text-[10px] text-slate-400">Keeps CRM in sync</span>
              </div>

              {/* Submit / Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditPartyDetailsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="size-4 stroke-[2.5]" />
                  <span>Apply to Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Settings Modal */}
      <InvoiceQuickSettingsModal
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
        settings={invoiceSettings}
        onSave={(newSettings, updatedGstDetails) => {
          setInvoiceSettings(newSettings);
          saveStoredInvoiceSettings(newSettings);
          if (!editingInvoice && !activeEditingInvoice && !isRecreatingInvoice) {
            const nextNum = getNextSequentialInvoiceNumber(invoiceType, newSettings);
            setInvoiceNumber(nextNum);
          }
          if (updatedGstDetails?.terms_and_conditions) {
            setTermsAndConditions(updatedGstDetails.terms_and_conditions);
          }
        }}
      />
    </div>
  );
}
