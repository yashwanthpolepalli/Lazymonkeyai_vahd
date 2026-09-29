import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Receipt,
  Layers,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Settings,
  HelpCircle,
  QrCode,
  Landmark,
  Building,
  MapPin,
  FileText,
  Star,
  ExternalLink,
  Copy,
  Percent,
  CreditCard,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { generateQRCodeSVG } from "@/lib/qr-generator";
import {
  getActiveBillingGst,
  setActiveBillingGst,
  getTenantIdFromStorage,
  setOrgDocumentPrefixes,
  type ActiveGstDetails,
} from "@/lib/receipt-template-store";
import { companiesApi, numberSeriesApi, taxApi, type TaxCode, type Company, type GstRegistration } from "@/lib/api-client";
import { INDIAN_STATES } from "@/data/indian-states";
import { lookupGstinDetails } from "@/lib/gst-helper";

export interface InvoiceCustomField {
  id: string;
  name: string;
  enabled: boolean;
  value?: string;
}

export interface ItemCustomColumn {
  id: string;
  name: string;
  enabled: boolean;
}

export interface InvoiceSettings {
  // Invoice Numbering
  customSequenceEnabled: boolean;
  prefix: string;
  sequenceNumber: number;
  suffix: string;

  // Invoice Fields
  industryType: string;
  showPoNumber: boolean;
  showEwayBill: boolean;
  showVehicleNumber: boolean;
  showChallanNumber: boolean;
  showPaymentTerms: boolean;
  invoiceCustomFields: InvoiceCustomField[];

  // Item Table Toggles
  showPurchasePrice: boolean;
  showItemImage: boolean;
  showPriceHistory: boolean;
  showMrp: boolean;
  showDiscount: boolean;
  showHsn: boolean;

  // Item Table Columns
  showBatchNo: boolean;
  showExpDate: boolean;
  showMfgDate: boolean;
  showSerialNo: boolean;
  showWarranty: boolean;
  itemCustomColumns: ItemCustomColumn[];
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  customSequenceEnabled: true,
  prefix: "INV-",
  sequenceNumber: 1001,
  suffix: "",

  industryType: "Others",
  showPoNumber: true,
  showEwayBill: true,
  showVehicleNumber: true,
  showChallanNumber: false,
  showPaymentTerms: true,
  invoiceCustomFields: [],

  showPurchasePrice: false,
  showItemImage: false,
  showPriceHistory: false,
  showMrp: true,
  showDiscount: true,
  showHsn: true,

  showBatchNo: false,
  showExpDate: false,
  showMfgDate: false,
  showSerialNo: false,
  showWarranty: false,
  itemCustomColumns: [],
};

const SETTINGS_STORAGE_KEY = "pos_invoice_quick_settings";

export function loadStoredInvoiceSettings(): InvoiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_INVOICE_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to load invoice quick settings:", err);
  }
  return DEFAULT_INVOICE_SETTINGS;
}

export function saveStoredInvoiceSettings(settings: InvoiceSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save invoice quick settings:", err);
  }
}

interface InvoiceQuickSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: InvoiceSettings;
  onSave: (newSettings: InvoiceSettings, updatedGstDetails?: ActiveGstDetails | null) => void;
}

export function InvoiceQuickSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: InvoiceQuickSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"invoice" | "item" | "tax_finance" | "google_reviews">("invoice");
  const [draftSettings, setDraftSettings] = useState<InvoiceSettings>(settings);

  // Organization & GST State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeBillingGst, setActiveBillingGstLocal] = useState<ActiveGstDetails | null>(null);
  const [gstForm, setGstForm] = useState({
    trade_name: "",
    legal_name: "",
    gstin: "",
    state_name: "Andhra Pradesh",
    state_code: "37",
    address: "",
    phone: "",
    email: "",
    pan: "",
    cin: "",
    is_composition: false,
    lut_number: "",
    lut_expiry: "",
    bank_name: "",
    bank_account: "",
    bank_ifsc: "",
    bank_branch: "",
    upi_id: "",
    terms_and_conditions: "1. Goods once sold will not be taken back or exchanged.\n2. All disputes are subject to local jurisdiction only.",
  });

  // Google Review QR State
  const [reviewForm, setReviewForm] = useState({
    google_review_enabled: true,
    google_review_url: "https://search.google.com/local/writereview",
    google_place_id: "",
  });

  // Tax Slabs State (Tax & Finance)
  const [taxSlabs, setTaxSlabs] = useState<TaxCode[]>([]);
  const [newTaxRate, setNewTaxRate] = useState<string>("18");
  const [newTaxName, setNewTaxName] = useState<string>("GST 18%");
  const [isAddingTax, setIsAddingTax] = useState(false);
  const [isLookingUpGst, setIsLookingUpGst] = useState(false);
  const [isSavingTaxData, setIsSavingTaxData] = useState(false);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSettings(settings);

      // Load active GST details
      const currentGst = getActiveBillingGst();
      setActiveBillingGstLocal(currentGst);
      if (currentGst) {
        setGstForm((prev) => ({
          ...prev,
          trade_name: currentGst.trade_name || "",
          legal_name: currentGst.legal_name || "",
          gstin: currentGst.gstin || "",
          state_name: currentGst.state_name || "Andhra Pradesh",
          state_code: currentGst.state_code || (currentGst.gstin ? currentGst.gstin.slice(0, 2) : "37"),
          address: currentGst.address || "",
          phone: currentGst.phone || "",
          email: currentGst.email || "",
          pan: currentGst.pan || "",
          cin: currentGst.cin || "",
          terms_and_conditions: currentGst.terms_and_conditions || prev.terms_and_conditions,
        }));

        setReviewForm({
          google_review_enabled: currentGst.google_review_enabled !== false,
          google_review_url: currentGst.google_review_url || "https://search.google.com/local/writereview",
          google_place_id: currentGst.google_place_id || "",
        });
      }

      // Load active company and GST profiles from API / Storage
      companiesApi.list(1, 50).then((res) => {
        setCompanies(res.items || []);
        if (res.items && res.items.length > 0) {
          const storedComp = localStorage.getItem("bos_active_company");
          let targetComp = res.items[0];
          if (storedComp) {
            try {
              const parsed = JSON.parse(storedComp);
              const found = res.items.find((c) => c.id === parsed.id);
              if (found) targetComp = found;
            } catch {}
          }
          setActiveCompany(targetComp);

          // If review settings exist on company, hydrate
          if (targetComp.google_review_url) {
            setReviewForm((prev) => ({
              ...prev,
              google_review_url: targetComp.google_review_url || prev.google_review_url,
              google_place_id: targetComp.google_place_id || prev.google_place_id,
              google_review_enabled: targetComp.google_review_enabled !== false,
            }));
          }
        }
      }).catch((err) => {
        console.warn("Could not load companies for quick settings:", err);
      });

      // Load Tax Slabs
      taxApi.listTaxCodes().then((res: any) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        setTaxSlabs(items);
      }).catch((err) => {
        console.warn("Could not load tax slabs:", err);
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof InvoiceSettings) => {
    setDraftSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddInvoiceCustomField = () => {
    const newField: InvoiceCustomField = {
      id: "cf_" + Date.now(),
      name: "",
      enabled: true,
    };
    setDraftSettings((prev) => ({
      ...prev,
      invoiceCustomFields: [...prev.invoiceCustomFields, newField],
    }));
  };

  const handleUpdateInvoiceCustomField = (
    id: string,
    patch: Partial<InvoiceCustomField>
  ) => {
    setDraftSettings((prev) => ({
      ...prev,
      invoiceCustomFields: prev.invoiceCustomFields.map((f) =>
        f.id === id ? { ...f, ...patch } : f
      ),
    }));
  };

  const handleDeleteInvoiceCustomField = (id: string) => {
    setDraftSettings((prev) => ({
      ...prev,
      invoiceCustomFields: prev.invoiceCustomFields.filter((f) => f.id !== id),
    }));
  };

  const handleAddItemCustomColumn = () => {
    const newCol: ItemCustomColumn = {
      id: "col_" + Date.now(),
      name: "",
      enabled: true,
    };
    setDraftSettings((prev) => ({
      ...prev,
      itemCustomColumns: [...prev.itemCustomColumns, newCol],
    }));
  };

  const handleUpdateItemCustomColumn = (
    id: string,
    patch: Partial<ItemCustomColumn>
  ) => {
    setDraftSettings((prev) => ({
      ...prev,
      itemCustomColumns: prev.itemCustomColumns.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const handleDeleteItemCustomColumn = (id: string) => {
    setDraftSettings((prev) => ({
      ...prev,
      itemCustomColumns: prev.itemCustomColumns.filter((c) => c.id !== id),
    }));
  };

  // Switch Active Company or GSTIN Profile
  const handleSelectCompany = (comp: Company) => {
    setActiveCompany(comp);
    localStorage.setItem("bos_active_company", JSON.stringify(comp));
    const primaryReg = comp.gst_registrations?.find((r) => r.is_primary) || comp.gst_registrations?.[0];
    const gstin = primaryReg?.gstin || comp.gst_number || "";
    const stateCode = primaryReg?.state_code || (gstin ? gstin.slice(0, 2) : "37");
    const foundState = INDIAN_STATES.find((s) => s.code === stateCode);

    setGstForm((prev) => ({
      ...prev,
      trade_name: primaryReg?.trade_name || comp.name || "",
      legal_name: comp.legal_name || comp.name || "",
      gstin: gstin,
      state_code: stateCode,
      state_name: primaryReg?.state_name || foundState?.name || comp.state || "State",
      address: primaryReg?.address || comp.address || "",
      phone: comp.phone || "",
      email: comp.email || "",
      pan: comp.pan_number || (gstin.length === 15 ? gstin.slice(2, 12) : ""),
      cin: comp.registration_number || "",
      terms_and_conditions: comp.terms_and_conditions || prev.terms_and_conditions,
    }));

    if (comp.google_review_url) {
      setReviewForm({
        google_review_enabled: comp.google_review_enabled !== false,
        google_review_url: comp.google_review_url || "https://search.google.com/local/writereview",
        google_place_id: comp.google_place_id || "",
      });
    }

    toast.info(`Selected organization profile: ${comp.name}`);
  };

  // Switch GSTIN Registration within active company
  const handleSelectGstRegistration = (reg: GstRegistration) => {
    const sCode = reg.state_code || reg.gstin.slice(0, 2);
    const foundState = INDIAN_STATES.find((s) => s.code === sCode);
    setGstForm((prev) => ({
      ...prev,
      gstin: reg.gstin,
      trade_name: reg.trade_name || prev.trade_name,
      state_code: sCode,
      state_name: reg.state_name || foundState?.name || prev.state_name,
      address: reg.address || prev.address,
    }));
    toast.info(`Selected GSTIN profile: ${reg.gstin}`);
  };

  // GSTIN Live Auto-Lookup
  const handleLookupGstin = async () => {
    if (!gstForm.gstin || gstForm.gstin.length < 15) {
      toast.error("Please enter a valid 15-character GSTIN to lookup details.");
      return;
    }
    setIsLookingUpGst(true);
    try {
      const res = await lookupGstinDetails(gstForm.gstin.trim().toUpperCase());
      if (res && (res.trade_name || res.legal_name)) {
        setGstForm((prev) => ({
          ...prev,
          trade_name: res.trade_name || res.legal_name || prev.trade_name,
          legal_name: res.legal_name || prev.legal_name,
          state_name: res.state || prev.state_name,
          state_code: res.state_code || prev.state_code,
          address: res.principal_address || prev.address,
          pan: res.pan || prev.pan,
        }));
        toast.success(`Fetched GST profile for ${res.trade_name || res.legal_name}!`);
      } else {
        toast.error("Could not fetch GST details. Please check GSTIN.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to lookup GSTIN details.");
    } finally {
      setIsLookingUpGst(false);
    }
  };

  // Add new Tax Code Slab
  const handleCreateTaxSlab = async () => {
    const rateNum = parseFloat(newTaxRate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error("Please enter a valid tax rate percentage.");
      return;
    }
    setIsAddingTax(true);
    try {
      await taxApi.createTaxCode({
        code: `GST_${rateNum}%`,
        name: newTaxName.trim() || `GST ${rateNum}%`,
        rate: rateNum,
        tax_type: "gst",
        is_inclusive: false,
        is_active: true,
      });
      toast.success(`GST Slab ${rateNum}% created successfully!`);
      const updated: any = await taxApi.listTaxCodes();
      setTaxSlabs(updated?.items || (Array.isArray(updated) ? updated : []));
      setNewTaxRate("");
      setNewTaxName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create tax slab.");
    } finally {
      setIsAddingTax(false);
    }
  };

  // Generate Google Review Link from Place ID
  const handleGenerateReviewLinkFromPlaceId = () => {
    if (!reviewForm.google_place_id.trim()) {
      toast.error("Please enter a Google Place ID first.");
      return;
    }
    const generated = `https://search.google.com/local/writereview?placeid=${reviewForm.google_place_id.trim()}`;
    setReviewForm((prev) => ({ ...prev, google_review_url: generated }));
    toast.success("Generated Google Review Link from Place ID!");
  };

  // Comprehensive Save
  const handleSave = async () => {
    setIsSavingTaxData(true);
    try {
      // 1. Clean and Save Invoice Settings
      const cleaned: InvoiceSettings = {
        ...draftSettings,
        invoiceCustomFields: draftSettings.invoiceCustomFields.filter(
          (f) => f.name.trim() !== ""
        ),
        itemCustomColumns: draftSettings.itemCustomColumns.filter(
          (c) => c.name.trim() !== ""
        ),
      };
      saveStoredInvoiceSettings(cleaned);

      // 2. Prepare and Save Active GST Profile
      const cleanGst = gstForm.gstin.trim().toUpperCase();
      const detectedStateCode = cleanGst.length >= 2 ? cleanGst.slice(0, 2) : gstForm.state_code;
      const updatedGstDetails: ActiveGstDetails = {
        gstin: cleanGst,
        trade_name: gstForm.trade_name.trim() || activeCompany?.name || "Organization",
        legal_name: gstForm.legal_name.trim() || activeCompany?.legal_name || gstForm.trade_name.trim(),
        state_code: detectedStateCode,
        state_name: gstForm.state_name,
        address: gstForm.address.trim(),
        phone: gstForm.phone.trim(),
        email: gstForm.email.trim(),
        pan: gstForm.pan.trim() || (cleanGst.length === 15 ? cleanGst.slice(2, 12) : ""),
        cin: gstForm.cin.trim(),
        logo_url: activeCompany?.logo_url || undefined,
        google_review_url: reviewForm.google_review_url.trim() || undefined,
        google_place_id: reviewForm.google_place_id.trim() || undefined,
        google_review_enabled: reviewForm.google_review_enabled,
        terms_and_conditions: gstForm.terms_and_conditions.trim() || null,
      };

      // Save to receipt template store & storage
      setActiveBillingGst(updatedGstDetails);

      // 3. Update Org Document Prefixes
      if (cleaned.prefix) {
        setOrgDocumentPrefixes({ invoice_prefix: cleaned.prefix });
      }

      // 4. If active company exists, update company metadata & number series in DB
      if (activeCompany?.id) {
        try {
          await companiesApi.update(activeCompany.id, {
            name: updatedGstDetails.trade_name,
            legal_name: updatedGstDetails.legal_name,
            gst_number: updatedGstDetails.gstin,
            pan_number: updatedGstDetails.pan,
            address: updatedGstDetails.address,
            phone: updatedGstDetails.phone,
            email: updatedGstDetails.email,
            state: updatedGstDetails.state_name,
            google_review_url: updatedGstDetails.google_review_url || null,
            google_place_id: updatedGstDetails.google_place_id || null,
            google_review_enabled: updatedGstDetails.google_review_enabled,
            terms_and_conditions: updatedGstDetails.terms_and_conditions || null,
          });

          // Sync number series in backend if prefix or sequence is defined
          const targetSeq = Math.max(0, Number(cleaned.sequenceNumber || 1001) - 1);
          const seriesRes = await numberSeriesApi.list(1, 50, activeCompany.id);
          const seriesList = seriesRes.items || (seriesRes as any).data || [];
          const existing = seriesList.find((s) => s.module_name.toLowerCase().includes("invoice"));
          if (existing) {
            await numberSeriesApi.update(existing.id, {
              prefix: cleaned.prefix || "INV-",
              current_number: targetSeq,
            }).catch(console.warn);
          } else {
            await numberSeriesApi.create({
              company_id: activeCompany.id,
              module_name: "invoices",
              prefix: cleaned.prefix || "INV-",
              current_number: targetSeq,
              padding: 5,
              status: "active",
            }).catch(console.warn);
          }
        } catch (apiErr) {
          console.warn("Could not sync company/series to backend API:", apiErr);
        }
      }

      // Dispatch window events so all components update immediately without refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bos-active-gst-changed", { detail: updatedGstDetails })
        );
        window.dispatchEvent(
          new CustomEvent("bos-invoice-settings-changed", { detail: cleaned })
        );
      }

      onSave(cleaned, updatedGstDetails);
      toast.success("Sales invoice settings, sequence & GST details saved successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setIsSavingTaxData(false);
    }
  };

  const resolvedReviewUrl = reviewForm.google_review_url || (reviewForm.google_place_id ? `https://search.google.com/local/writereview?placeid=${reviewForm.google_place_id}` : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Sales Invoice & ERP Settings</h2>
              <p className="text-xs text-slate-400">
                Configure invoice numbering, item table columns, organization GST profile, tax slabs, and Google Review QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Tabs + Right Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-50/50">
          {/* Left Tab Sidebar */}
          <div className="w-52 bg-white border-r border-slate-100 p-3 space-y-1.5 shrink-0 flex flex-col justify-between">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === "invoice"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Invoice Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("item")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === "item"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Item Table Columns</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tax_finance")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === "tax_finance"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="truncate">
                  <span>Tax & GST Details</span>
                  <span className="block text-[9px] font-medium text-slate-400">Core ERP Tax & Finance</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("google_reviews")}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === "google_reviews"
                    ? "bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="flex items-center gap-1">
                    <span>Google Review QR</span>
                    {reviewForm.google_review_enabled && (
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="block text-[9px] font-medium text-slate-400">5-Star Feedback QR</span>
                </div>
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1 text-slate-500">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Active GSTIN:</span>
                <span className="font-mono text-indigo-600">{gstForm.gstin ? `${gstForm.gstin.slice(0, 4)}...${gstForm.gstin.slice(-3)}` : "None"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Review QR:</span>
                <span className={reviewForm.google_review_enabled ? "text-emerald-600 font-bold" : "text-slate-400 font-medium"}>
                  {reviewForm.google_review_enabled ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Tab Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {/* TAB 1: INVOICE DETAILS */}
            {activeTab === "invoice" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. Invoice Prefix & Sequence Number */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        Invoice Prefix & Sequence Number
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Add your custom prefix & sequence for Invoice Numbering
                      </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggle("customSequenceEnabled")}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                        draftSettings.customSequenceEnabled ? "bg-indigo-600" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          draftSettings.customSequenceEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {draftSettings.customSequenceEnabled && (
                    <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Invoice Prefix
                          </label>
                          <input
                            type="text"
                            value={draftSettings.prefix}
                            onChange={(e) =>
                              setDraftSettings((prev) => ({
                                ...prev,
                                prefix: e.target.value,
                              }))
                            }
                            placeholder="e.g. INV/2026/"
                            className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">
                            Next Sequence Number
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={draftSettings.sequenceNumber || ""}
                            onChange={(e) =>
                              setDraftSettings((prev) => ({
                                ...prev,
                                sequenceNumber: parseInt(e.target.value, 10) || 1,
                              }))
                            }
                            placeholder="e.g. 1001"
                            className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Live Preview of Next Invoice Number */}
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-indigo-800">
                          Next Generated Invoice Preview:
                        </span>
                        <span className="font-mono text-xs font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                          {draftSettings.prefix || "INV-"}
                          {draftSettings.sequenceNumber || 1}
                          {draftSettings.suffix || ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Show or Hide Invoice Custom Fields */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h3 className="text-xs font-bold text-slate-800">
                    Invoice Fields & Header Metadata
                  </h3>

                  {/* Industry Type Selector */}
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Industry Profile
                    </label>
                    <select
                      value={draftSettings.industryType}
                      onChange={(e) =>
                        setDraftSettings((prev) => ({
                          ...prev,
                          industryType: e.target.value,
                        }))
                      }
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-indigo-500"
                    >
                      <option value="Others">General / Others</option>
                      <option value="Retail">Retail & Supermarket</option>
                      <option value="Wholesale">Wholesale & Distribution</option>
                      <option value="Pharma">Pharma & Healthcare</option>
                      <option value="Electronics">Electronics & Hardware</option>
                      <option value="Manufacturing">Manufacturing & Auto</option>
                      <option value="Services">Services & IT</option>
                    </select>
                  </div>

                  {/* Suggested Standard Custom Fields */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Standard Fields
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={draftSettings.showPoNumber}
                          onChange={() => handleToggle("showPoNumber")}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">PO Number</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={draftSettings.showEwayBill}
                          onChange={() => handleToggle("showEwayBill")}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">E-way Bill Number</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={draftSettings.showVehicleNumber}
                          onChange={() => handleToggle("showVehicleNumber")}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">Vehicle Number</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={draftSettings.showChallanNumber}
                          onChange={() => handleToggle("showChallanNumber")}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">Delivery Challan No.</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors col-span-1 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={draftSettings.showPaymentTerms}
                          onChange={() => handleToggle("showPaymentTerms")}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">Payment Terms & Due Date</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Header Fields */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Custom Invoice Fields
                    </span>

                    {draftSettings.invoiceCustomFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) =>
                            handleUpdateInvoiceCustomField(field.id, {
                              enabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer ml-1"
                        />
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            handleUpdateInvoiceCustomField(field.id, {
                              name: e.target.value,
                            })
                          }
                          placeholder="Field name (e.g. Sales Executive, Project Code)"
                          className="flex-1 bg-transparent px-2 text-xs font-semibold text-slate-800 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoiceCustomField(field.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddInvoiceCustomField}
                      className="w-full py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-xl text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Field</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ITEM TABLE COLUMNS */}
            {activeTab === "item" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. Show Purchase Price */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Show Purchase Price while adding Items
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Displays cost / purchase rate beside catalog items for profit checking
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("showPurchasePrice")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      draftSettings.showPurchasePrice ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        draftSettings.showPurchasePrice ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Show Item Image on Invoice */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Show Item Image on Invoice
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Displays product thumbnail picture in line items table and printouts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("showItemImage")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      draftSettings.showItemImage ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        draftSettings.showItemImage ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Price History */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800">Price History</h3>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                        New
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Show last sales & purchase rate when selecting party and product
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("showPriceHistory")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      draftSettings.showPriceHistory ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        draftSettings.showPriceHistory ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Item Table Columns */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3.5">
                  <h3 className="text-xs font-bold text-slate-800">
                    Show or Hide Item Table Columns
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* MRP Column */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showMrp}
                        onChange={() => handleToggle("showMrp")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">MRP Column</span>
                    </label>

                    {/* HSN/SAC Column */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showHsn}
                        onChange={() => handleToggle("showHsn")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">HSN / SAC Code</span>
                    </label>

                    {/* Item Discount Column */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showDiscount}
                        onChange={() => handleToggle("showDiscount")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Item Discount Column</span>
                    </label>

                    {/* Batch No */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showBatchNo}
                        onChange={() => handleToggle("showBatchNo")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Batch No.</span>
                    </label>

                    {/* Exp Date */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showExpDate}
                        onChange={() => handleToggle("showExpDate")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Exp. Date (Expiry Date)</span>
                    </label>

                    {/* Mfg Date */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showMfgDate}
                        onChange={() => handleToggle("showMfgDate")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Mfg Date (Manufacturing Date)</span>
                    </label>

                    {/* Serial / IMEI */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showSerialNo}
                        onChange={() => handleToggle("showSerialNo")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Serial / IMEI No.</span>
                    </label>

                    {/* Warranty */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={draftSettings.showWarranty}
                        onChange={() => handleToggle("showWarranty")}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">Warranty Period</span>
                    </label>
                  </div>

                  {/* Custom Columns */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Custom Item Columns
                    </span>

                    {draftSettings.itemCustomColumns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <input
                          type="checkbox"
                          checked={col.enabled}
                          onChange={(e) =>
                            handleUpdateItemCustomColumn(col.id, {
                              enabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer ml-1"
                        />
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) =>
                            handleUpdateItemCustomColumn(col.id, {
                              name: e.target.value,
                            })
                          }
                          placeholder="Column name (e.g. Color, Size, Bin Location)"
                          className="flex-1 bg-transparent px-2 text-xs font-semibold text-slate-800 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteItemCustomColumn(col.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddItemCustomColumn}
                      className="w-full py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/70 rounded-xl text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Column</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TAX & FINANCE / GST DETAILS (From Core ERP) */}
            {activeTab === "tax_finance" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. Active Organization & Multi-GST Selector */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building className="size-4 text-indigo-600" />
                        <span>Organization & GST Profile</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Select the billing organization and registered GSTIN profile for sales invoices
                      </p>
                    </div>

                    {companies.length > 0 && (
                      <select
                        value={activeCompany?.id || ""}
                        onChange={(e) => {
                          const found = companies.find((c) => c.id === e.target.value);
                          if (found) handleSelectCompany(found);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-700 outline-none cursor-pointer"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.gst_number ? `(${c.gst_number})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Multi-GST Profile Badges if available */}
                  {activeCompany?.gst_registrations && activeCompany.gst_registrations.length > 1 && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Multiple GSTIN Branches Configured:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCompany.gst_registrations.map((reg) => {
                          const isSel = gstForm.gstin === reg.gstin;
                          return (
                            <button
                              key={reg.id || reg.gstin}
                              type="button"
                              onClick={() => handleSelectGstRegistration(reg)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSel
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="font-mono">{reg.gstin}</span>
                              <span className="opacity-80 text-[10px]">({reg.state_name || `State ${reg.state_code}`})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* GSTIN and Organization Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-600">
                          Seller GSTIN Number (15 Digits)
                        </label>
                        <button
                          type="button"
                          onClick={handleLookupGstin}
                          disabled={isLookingUpGst || !gstForm.gstin}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isLookingUpGst ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
                          Lookup GSTIN
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstForm.gstin}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          const sCode = val.length >= 2 ? val.slice(0, 2) : gstForm.state_code;
                          const foundState = INDIAN_STATES.find((s) => s.code === sCode);
                          const sName = foundState?.name || gstForm.state_name;
                          setGstForm((prev) => ({
                            ...prev,
                            gstin: val,
                            state_code: sCode,
                            state_name: sName,
                          }));
                        }}
                        placeholder="e.g. 37AAAAA0000A1Z5"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Trade Name / Brand Name
                      </label>
                      <input
                        type="text"
                        value={gstForm.trade_name}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, trade_name: e.target.value }))}
                        placeholder="e.g. TechNova Retail Store"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Legal Business Entity Name
                      </label>
                      <input
                        type="text"
                        value={gstForm.legal_name}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, legal_name: e.target.value }))}
                        placeholder="e.g. TechNova Solutions Pvt Ltd"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Registered State & Code
                      </label>
                      <select
                        value={gstForm.state_code}
                        onChange={(e) => {
                          const sCode = e.target.value;
                          const foundState = INDIAN_STATES.find((s) => s.code === sCode);
                          const sName = foundState?.name || "State";
                          setGstForm((prev) => ({ ...prev, state_code: sCode, state_name: sName }));
                        }}
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st.code} value={st.code}>
                            {st.code} - {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Principal Place of Business (Registered Address)
                      </label>
                      <input
                        type="text"
                        value={gstForm.address}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Door No, Street Name, Landmark, City, State, Pincode"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Bank & UPI Payment Accounts for Invoices */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Landmark className="size-4 text-emerald-600" />
                    <span>Bank & UPI Details (Printed on Invoices)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    These banking details are displayed in the footer of full tax invoices for direct NEFT/RTGS/UPI customer payments.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={gstForm.bank_name}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                        placeholder="e.g. HDFC Bank / State Bank of India"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={gstForm.bank_account}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, bank_account: e.target.value }))}
                        placeholder="e.g. 50200012345678"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={gstForm.bank_ifsc}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, bank_ifsc: e.target.value.toUpperCase() }))}
                        placeholder="e.g. HDFC0001234"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        UPI ID / VPA
                      </label>
                      <input
                        type="text"
                        value={gstForm.upi_id}
                        onChange={(e) => setGstForm((prev) => ({ ...prev, upi_id: e.target.value }))}
                        placeholder="e.g. business@okhdfcbank"
                        className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-bold text-emerald-700 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Configured GST Tax Slabs (Core ERP Tax & Finance) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Percent className="size-4 text-indigo-600" />
                        <span>Configured GST Tax Slabs</span>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                          {taxSlabs.length} Active Slabs
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Active GST rates across POS, Sales Invoices, and Purchases with auto-split as CGST+SGST (Intra) or IGST (Inter)
                      </p>
                    </div>
                  </div>

                  {/* Slabs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {taxSlabs.map((slab) => {
                      const rate = Number(slab.rate ?? 0);
                      const half = (rate / 2).toFixed(1);
                      return (
                        <div
                          key={slab.id || slab.code}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                        >
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block">
                              {rate}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 block truncate">
                              {slab.name || `GST ${rate}%`}
                            </span>
                          </div>
                          <div className="mt-2 text-[8.5px] font-mono font-semibold text-slate-500 border-t border-slate-200 pt-1">
                            <div>CGST {half}% + SGST {half}%</div>
                            <div className="text-indigo-600 font-bold">IGST {rate}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Slab */}
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                      + Add New GST Tax Slab
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="w-full sm:w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={newTaxRate}
                          onChange={(e) => {
                            setNewTaxRate(e.target.value);
                            if (e.target.value) {
                              setNewTaxName(`GST ${e.target.value}%`);
                            }
                          }}
                          placeholder="Rate %"
                          className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:flex-1">
                        <input
                          type="text"
                          value={newTaxName}
                          onChange={(e) => setNewTaxName(e.target.value)}
                          placeholder="Slab Name (e.g. GST 18% Standard)"
                          className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateTaxSlab}
                        disabled={isAddingTax || !newTaxRate}
                        className="w-full sm:w-auto h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        {isAddingTax ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                        Add Slab
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Terms & Conditions */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Default Invoice Terms & Conditions
                  </label>
                  <textarea
                    rows={3}
                    value={gstForm.terms_and_conditions}
                    onChange={(e) => setGstForm((prev) => ({ ...prev, terms_and_conditions: e.target.value }))}
                    placeholder="Enter default invoice terms & conditions here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: GOOGLE REVIEW QR (From Core ERP) */}
            {activeTab === "google_reviews" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. Toggle & Info Banner */}
                <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                        <Star className="size-5 fill-amber-100" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-950">
                          Google Review QR Code Integration
                        </h3>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                          Automatically print a 5-Star Google Review QR code on all sales invoices, thermal receipts, and delivery challans so customers can easily rate your business on Google.
                        </p>
                      </div>
                    </div>

                    {/* Review QR Toggle Switch */}
                    <button
                      type="button"
                      onClick={() =>
                        setReviewForm((prev) => ({
                          ...prev,
                          google_review_enabled: !prev.google_review_enabled,
                        }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                        reviewForm.google_review_enabled ? "bg-amber-600" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          reviewForm.google_review_enabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white border border-amber-300 text-amber-900 shadow-2xs">
                      Status: {reviewForm.google_review_enabled ? "Active on All Receipts" : "Disabled"}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-900">
                      ⭐⭐⭐⭐⭐ Boost local search rankings & verified customer reviews
                    </span>
                  </div>
                </div>

                {/* 2. Review Link Configuration & Live QR Code Preview */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: URL Inputs & Generator */}
                  <div className="md:col-span-7 space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Direct Google Review Link / URL
                      </label>
                      <input
                        type="url"
                        value={reviewForm.google_review_url}
                        onChange={(e) => setReviewForm((prev) => ({ ...prev, google_review_url: e.target.value }))}
                        placeholder="e.g. https://g.page/r/CbXx_YourLink/review or search.google.com..."
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tip: Copy this link from your Google Business Profile &gt; "Ask for reviews".
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Google Place ID (Alternative)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={reviewForm.google_place_id}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, google_place_id: e.target.value }))}
                          placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                          className="flex-1 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs font-mono text-slate-800 outline-none focus:border-amber-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateReviewLinkFromPlaceId}
                          className="h-8 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        >
                          <Sparkles className="size-3 text-amber-600" />
                          Generate
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Found in Google Maps Place ID Finder tool.
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      {resolvedReviewUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(resolvedReviewUrl);
                              toast.success("Review URL copied to clipboard!");
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Copy className="size-3" />
                            Copy Link
                          </button>
                          <a
                            href={resolvedReviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <ExternalLink className="size-3 text-amber-600" />
                            Test Review Link
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Live Interactive QR Code Preview */}
                  <div className="md:col-span-5 bg-gradient-to-b from-white to-amber-50/40 p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Live Receipt QR Preview
                    </span>

                    <div className="p-2.5 bg-white rounded-2xl border border-amber-200 shadow-sm">
                      {resolvedReviewUrl ? (
                        <img
                          src={generateQRCodeSVG(resolvedReviewUrl, 160)}
                          alt="Google Review QR Code"
                          className="size-32 object-contain"
                        />
                      ) : (
                        <div className="size-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold">
                          Enter URL to generate
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 max-w-[200px]">
                      <div className="text-amber-500 font-black text-xs tracking-widest">
                        ★★★★★
                      </div>
                      <span className="text-xs font-black text-slate-900 block leading-tight">
                        Rate Us on Google!
                      </span>
                      <span className="text-[9.5px] text-slate-500 block leading-tight">
                        Scan with your phone camera to share your 5-star experience.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="text-[11px] text-slate-400 font-medium">
            Changes automatically update in real-time across invoices, receipts, and reports
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingTaxData}
              onClick={handleSave}
              className="px-6 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSavingTaxData ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Save & Apply Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
