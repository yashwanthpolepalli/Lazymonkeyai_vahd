import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  Printer,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  RefreshCw,
  Download,
  User,
  Award,
  Calendar,
  CreditCard,
  Building,
  Sparkles,
  X,
  MessageCircle,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  MoreHorizontal,
  MoreVertical,
  Banknote
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { posApi, invoicesApi, marketplaceApi, resolveImageUrl } from "@/lib/api-client";
import { getActiveBillingGst } from "@/lib/receipt-template-store";
import { loadStoredInvoiceSettings, saveStoredInvoiceSettings } from "./InvoiceQuickSettingsModal";
import { FullInvoicePrinter } from "./FullInvoicePrinter";
import { EWayBillModal } from "./EWayBillModal";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";
import { useAuth } from "@/contexts/auth-context";
import { useRbac } from "@/contexts/rbac-context";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate, formatDisplayDateTime, getTodayDateString } from "@/lib/utils";

interface LocalInvoiceRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_gstin?: string;
  sales_executive?: string;
  sales_points_earned?: number;
  invoice_date: string;
  due_date?: string;
  payment_mode: string;
  payment_status: "Paid" | "Partial" | "Unpaid" | "Cancelled";
  status?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  subtotal: number;
  total_tax: number;
  discount_amount?: number;
  grand_total: number;
  amount_received?: number;
  is_printed_thermal?: boolean;
  is_printed_a4?: boolean;
  is_whatsapp_sent?: boolean;
  items?: any[];
  [key: string]: any;
}

export interface PosInvoicesHistoryProps {
  onNewInvoice?: () => void;
  onNavigateTab?: (tab: string, extra?: Record<string, any>) => void;
}

export function PosInvoicesHistory({ onNewInvoice, onNavigateTab }: PosInvoicesHistoryProps = {}) {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const currentTenantId = (tenant as any)?.raw?.tenant_id || (tenant as any)?.tenant_id || tenant?.id || "default";
  const currentCompanyId = tenant?.id || (tenant as any)?.raw?.id || (tenant as any)?.company_id || "default";
  const storageKey = `pos_saved_invoices_${currentTenantId}_${currentCompanyId}`;

  const { user } = useAuth();
  const { activeRole } = useRbac();
  const isOrgAdmin = Boolean(
    user?.isTenantOwner ||
    user?.isPlatformAdmin ||
    user?.roles?.some(r => (r.name || "").toLowerCase().includes("admin") || (r.name || "").toLowerCase().includes("owner")) ||
    (activeRole?.name || "").toLowerCase().includes("admin") ||
    (activeRole?.name || "").toLowerCase().includes("owner")
  );

  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<LocalInvoiceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [printFilter, setPrintFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");

  const goToSalesInvoice = (params?: { collect_id?: string; edit_id?: string; recreate_number?: string }) => {
    if (onNavigateTab) {
      onNavigateTab("Sales Invoice", params);
      return;
    }
    if (onNewInvoice && !params) {
      onNewInvoice();
      return;
    }
    const query = new URLSearchParams();
    query.set("tab", "sales");
    if (params?.collect_id) query.set("collect_id", params.collect_id);
    if (params?.edit_id) query.set("edit_id", params.edit_id);
    if (params?.recreate_number) query.set("recreate_number", params.recreate_number);
    navigate(`/owner/pos?${query.toString()}`);
  };

  const handleCollectInSalesInvoice = (inv: LocalInvoiceRecord) => {
    try {
      sessionStorage.setItem("pos_collect_invoice", JSON.stringify(inv));
      window.dispatchEvent(new Event("pos_collect_invoice_trigger"));
    } catch (e) { }
    goToSalesInvoice({ collect_id: inv.id });
  };

  const handleEditInvoice = (inv: LocalInvoiceRecord) => {
    if (inv.payment_status === "Cancelled" || inv.status === "cancelled") {
      toast.error("Cancelled invoices cannot be edited.");
      return;
    }
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      sessionStorage.setItem("pos_edit_invoice", JSON.stringify({ ...inv, invoice_date: todayStr }));
      window.dispatchEvent(new Event("pos_edit_invoice_trigger"));
    } catch (e) {
      console.warn("Could not set pos_edit_invoice:", e);
    }
    goToSalesInvoice({ edit_id: inv.id || inv.invoice_number });
  };

  // Cancellation State
  const [cancellingInvoice, setCancellingInvoice] = useState<LocalInvoiceRecord | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const handleRequestCancelInvoice = (inv: LocalInvoiceRecord) => {
    if (!isOrgAdmin) {
      toast.error("Permission Denied: Only Organization Admins can cancel invoices.");
      return;
    }
    if (inv.payment_status === "Cancelled" || inv.status === "cancelled") {
      toast.error("This invoice has already been cancelled.");
      return;
    }
    setCancellingInvoice(inv);
    setCancellationReason("");
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancellation = async (reopenInSales: boolean = false) => {
    if (!cancellingInvoice) return;
    if (!isOrgAdmin) {
      toast.error("Permission Denied: Only Organization Admins can cancel invoices.");
      return;
    }

    setIsCancelling(true);
    try {
      // 1. Call Backend Cancel API
      await invoicesApi.cancelInvoice(cancellingInvoice.id || cancellingInvoice.invoice_number, cancellationReason).catch((err) => {
        console.warn("Backend invoice cancellation notice:", err);
      });

      // 2. Update Local Invoice History in localStorage
      const stored = localStorage.getItem(storageKey);
      let list = stored ? JSON.parse(stored) : [];
      list = list.map((item: LocalInvoiceRecord) => {
        if (item.id === cancellingInvoice.id || item.invoice_number === cancellingInvoice.invoice_number) {
          return {
            ...item,
            status: "cancelled",
            payment_status: "Cancelled" as any,
            cancellation_reason: cancellationReason || "Cancelled by Admin",
            cancelled_at: new Date().toISOString(),
            cancelled_by: user?.name || "Organization Admin",
          };
        }
        return item;
      });
      localStorage.setItem(storageKey, JSON.stringify(list));
      setInvoices(list);

      // 3. Re-credit Product Stock in localStorage product cache
      try {
        const prodStorageKey = `pos_local_products_${currentTenantId}_${currentCompanyId}`;
        const prodRaw = localStorage.getItem(prodStorageKey);
        if (prodRaw) {
          let prods = JSON.parse(prodRaw);
          if (Array.isArray(prods) && Array.isArray(cancellingInvoice.items)) {
            cancellingInvoice.items.forEach((line: any) => {
              const qty = Number(line.quantity) || 1;
              const match = prods.find((p: any) => 
                (line.product_id && p.id === line.product_id) ||
                (line.sku && p.sku === line.sku) ||
                (line.product_name && p.name && p.name.toLowerCase() === line.product_name.toLowerCase())
              );
              if (match) {
                match.stock = (Number(match.stock) || 0) + qty;
                match.initial_stock = (Number(match.initial_stock) || 0) + qty;
              }
            });
            localStorage.setItem(prodStorageKey, JSON.stringify(prods));
          }
        }
      } catch (err) {
        console.warn("Local stock reversal error:", err);
      }

      // Broadcast update events across all tabs
      window.dispatchEvent(new Event("pos_invoices_updated"));
      window.dispatchEvent(new Event("pos_products_updated"));
      window.dispatchEvent(new Event("inventory_updated"));

      toast.success(`Invoice ${cancellingInvoice.invoice_number} cancelled and items returned to stock.`);

      setIsCancelModalOpen(false);
      const invNum = cancellingInvoice.invoice_number;
      setCancellingInvoice(null);

      // Adjust local invoice settings sequence number if cancelled was the highest active number
      try {
        const s = loadStoredInvoiceSettings();
        if (s && s.sequenceNumber) {
          const digits = (cancellingInvoice.invoice_number || "").match(/\d+/g);
          const lastNum = digits ? parseInt(digits[digits.length - 1], 10) : 0;
          if (lastNum > 0 && s.sequenceNumber === lastNum + 1) {
            saveStoredInvoiceSettings({
              ...s,
              sequenceNumber: lastNum,
            });
          }
        }
      } catch (e) {}

      if (reopenInSales) {
        // Prepare Sales Invoice to be recreated with the exact cancelled invoice number
        const todayStr = new Date().toISOString().slice(0, 10);
        sessionStorage.setItem("pos_recreate_invoice_number", invNum);
        sessionStorage.setItem("pos_recreate_invoice", JSON.stringify({ ...cancellingInvoice, invoice_date: todayStr, is_recreating: true }));
        window.dispatchEvent(new Event("pos_edit_invoice_trigger"));
        goToSalesInvoice({ recreate_number: invNum });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel invoice.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Selected Invoice for Detailed View Drawer & PDF Printer
  const [selectedInvoice, setSelectedInvoice] = useState<LocalInvoiceRecord | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [fullInvoiceModalData, setFullInvoiceModalData] = useState<any>(null);
  const [isFullInvoiceOpen, setIsFullInvoiceOpen] = useState<boolean>(false);
  const [autoPrintFullInvoice, setAutoPrintFullInvoice] = useState<boolean>(false);
  const [ewayBillModalData, setEwayBillModalData] = useState<any | null>(null);
  const [isEwayBillOpen, setIsEwayBillOpen] = useState<boolean>(false);

  // Settlement Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [settlingInvoice, setSettlingInvoice] = useState<LocalInvoiceRecord | null>(null);
  const [settlePaymentMode, setSettlePaymentMode] = useState<string>("Cash");
  const [settleAmount, setSettleAmount] = useState<number | "">("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState<boolean>(false);

  // WhatsApp Dialog State
  const [whatsappInvoice, setWhatsappInvoice] = useState<LocalInvoiceRecord | null>(null);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState<string>("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);

  const handleOpenSettleModal = (inv: LocalInvoiceRecord) => {
    setSettlingInvoice(inv);
    const totalGrand = Number(inv.grand_total || 0);
    const currentReceived = Number(inv.amount_received || 0);
    const due = Math.max(0, totalGrand - currentReceived);
    setSettleAmount(due > 0 ? due : totalGrand);
    setSettlePaymentMode("Cash");
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettlement = async () => {
    if (!settlingInvoice) return;
    const amountToCollect = Number(settleAmount);
    if (!amountToCollect || amountToCollect <= 0) {
      toast.error("Please enter a valid payment amount greater than 0");
      return;
    }

    const currentReceived = Number(settlingInvoice.amount_received || 0);
    const totalGrand = Number(settlingInvoice.grand_total || 0);

    setIsSubmittingSettle(true);
    try {
      if (settlingInvoice.realId || (typeof settlingInvoice.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settlingInvoice.id))) {
        const invId = settlingInvoice.realId || settlingInvoice.id;
        await invoicesApi.recordPayment(invId, {
          amount: amountToCollect,
          payment_date: new Date().toISOString().split("T")[0],
          payment_method: settlePaymentMode,
        });
      }

      const updatedReceived = currentReceived + amountToCollect;
      const newStatus: "Paid" | "Partial" | "Unpaid" = updatedReceived >= totalGrand - 0.01 ? "Paid" : "Partial";

      const updatedInvoices = invoices.map((inv) => {
        if (inv.id === settlingInvoice.id || (inv.invoice_number && inv.invoice_number === settlingInvoice.invoice_number)) {
          return {
            ...inv,
            amount_received: updatedReceived,
            payment_status: newStatus,
            amount_paid: updatedReceived,
            balance_due: Math.max(0, totalGrand - updatedReceived),
          };
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedInvoices));
        window.dispatchEvent(new Event("pos_invoices_updated"));
      } catch (e) {}

      toast.success(`Recorded ${formatCurrency(amountToCollect)} payment for ${settlingInvoice.invoice_number || "invoice"}!`);
      setIsSettleModalOpen(false);
      setSettlingInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment settlement");
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  // Load invoices from Backend API (ERP Invoices + POS Transactions) strictly scoped to active tenant & workspace
  const loadInvoices = async () => {
    setLoading(true);
    const localRecords: LocalInvoiceRecord[] = [];
    const remoteRecords: LocalInvoiceRecord[] = [];

    try {
      // 1. Gather ONLY active tenant's & company's scoped local storage invoices
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((inv) => {
                if (inv && (inv.id || inv.invoice_number)) {
                  localRecords.push(inv);
                }
              });
            }
          } catch (e) {}
        }
      } catch (e) {}

      // 2. Fetch remote ERP Invoices from Backend API
      try {
        const apiRes: any = await invoicesApi.listInvoices({ page_size: 100 }).catch(() => null);
        const invoiceItems = apiRes?.items || apiRes?.data?.items || apiRes?.data || (Array.isArray(apiRes) ? apiRes : []);
        if (Array.isArray(invoiceItems) && invoiceItems.length > 0) {
          invoiceItems.forEach((inv: any) => {
            const isTaxInclusive = inv.is_tax_inclusive === true || (inv.lines || []).some((l: any) => l.is_tax_inclusive === true);
            const lines = (inv.lines || []).map((l: any) => ({
              id: l.id,
              product_name: l.product_name || l.item_name || "Item",
              quantity: Number(l.quantity) || 1,
              unit_price: Number(l.unit_price) || 0,
              mrp: Number(l.mrp) || Number(l.unit_price) || 0,
              hsn_code: l.hsn_code || "",
              tax_rate: Number(l.tax_rate) || 0,
              discount_value: Number(l.discount_value) || 0,
              is_tax_inclusive: l.is_tax_inclusive !== undefined ? l.is_tax_inclusive : isTaxInclusive,
            }));

            // Use authoritative totals from backend invoice record
            const rawGrandTotal = Number(inv.total_amount);
            const rawSubtotal = Number(inv.subtotal);
            const rawTax = Number(
              (Number(inv.cgst_amount || 0) + Number(inv.sgst_amount || 0) + Number(inv.igst_amount || 0)) ||
              inv.tax_amount ||
              0
            );

            let finalGrandTotal = !isNaN(rawGrandTotal) && rawGrandTotal > 0 ? rawGrandTotal : 0;
            let finalTax = !isNaN(rawTax) && rawTax >= 0 ? rawTax : 0;
            let finalSubtotal = !isNaN(rawSubtotal) && rawSubtotal > 0 ? rawSubtotal : (finalGrandTotal - finalTax);

            // Fallback calculation only if inv total_amount is completely missing/0
            if (finalGrandTotal === 0 && lines.length > 0) {
              let computedTaxable = 0;
              let computedTax = 0;
              lines.forEach((l: any) => {
                const lineGross = l.quantity * l.unit_price;
                const dAmt = Number(l.discount_value) || 0;
                const effGross = Math.max(0, lineGross - dAmt);
                if (l.is_tax_inclusive) {
                  const taxable = l.tax_rate > 0 ? effGross / (1 + l.tax_rate / 100) : effGross;
                  computedTaxable += taxable;
                  computedTax += (effGross - taxable);
                } else {
                  computedTaxable += effGross;
                  computedTax += (effGross * (l.tax_rate / 100));
                }
              });
              finalSubtotal = Number(computedTaxable.toFixed(2));
              finalTax = Number(computedTax.toFixed(2));
              finalGrandTotal = Number((computedTaxable + computedTax).toFixed(2));
            }

            const rawStatus = String(inv.status || "").toLowerCase();
            const amtPaid = Number(inv.amount_paid) || 0;
            const isPaid = rawStatus === "paid" || amtPaid >= finalGrandTotal - 0.05;
            const isPartial = rawStatus === "partial" || rawStatus === "partially_paid" || (amtPaid > 0 && amtPaid < finalGrandTotal - 0.05);

            remoteRecords.push({
              id: inv.id,
              realId: inv.id,
              tenant_id: inv.tenant_id,
              company_id: inv.company_id,
              invoice_number: inv.invoice_number || `INV-${String(inv.id).slice(0, 6).toUpperCase()}`,
              customer_name: inv.customer_name || inv.customer?.name || "Walk-in Customer",
              customer_phone: inv.customer?.phone || inv.customer_phone || "",
              customer_email: inv.customer?.email || inv.customer_email || "",
              customer_company: inv.customer?.company || inv.customer_company || "",
              customer_gstin: inv.customer?.tax_number || inv.customer?.gst_number || inv.customer_gstin || "",
              customer_type: inv.customer?.customer_type || inv.customer?.type || inv.customer?.category || inv.customer_type || (inv as any).pricing_mode || undefined,
              customer_billing_address: inv.billing_address || inv.customer?.billing_address || inv.customer_billing_address || "",
              customer_shipping_address: inv.shipping_address || inv.customer?.shipping_address || inv.customer_shipping_address || "",
              sales_executive: inv.created_by_name || "Sales Executive",
              sales_points_earned: Math.floor(finalGrandTotal / 100),
              invoice_date: inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
              created_at: inv.created_at || (inv.invoice_date ? `${inv.invoice_date}T12:00:00Z` : new Date().toISOString()),
              due_date: inv.due_date || "",
              payment_mode: inv.payment_terms || inv.payment_method || "Cash",
              payment_status: isPaid ? "Paid" : isPartial ? "Partial" : "Unpaid",
              subtotal: finalSubtotal,
              taxable_value: Number(inv.subtotal) || finalSubtotal,
              total_tax: finalTax,
              cgst_amount: Number(inv.cgst_amount || 0) || (finalTax > 0 ? finalTax / 2 : 0),
              sgst_amount: Number(inv.sgst_amount || 0) || (finalTax > 0 ? finalTax / 2 : 0),
              igst_amount: Number(inv.igst_amount || 0),
              gst_type: Number(inv.igst_amount || 0) > 0 ? "igst" : "cgst_sgst",
              is_interstate: Number(inv.igst_amount || 0) > 0,
              discount_amount: Number(inv.discount_amount) || 0,
              grand_total: finalGrandTotal,
              amount_received: isPaid ? finalGrandTotal : amtPaid,
              print_status: "A4 PDF Generated",
              terms: inv.terms || inv.terms_and_conditions || undefined,
              notes: inv.notes || undefined,
              po_number: inv.po_number || inv.order_number || undefined,
              po_date: inv.po_date || undefined,
              vehicle_number: inv.vehicle_number || undefined,
              driver_name: inv.driver_name || undefined,
              driver_phone: inv.driver_phone || undefined,
              transporter_name: inv.transporter_name || undefined,
              eway_bill_number: inv.eway_bill_number || undefined,
              eway_bill_date: inv.eway_bill_date || undefined,
              items: lines,
            });
          });
        }
      } catch (e) {
        console.warn("invoicesApi.listInvoices error:", e);
      }

      // 3. Fetch POS transaction checkout history from Backend API
      try {
        const posHist: any = await posApi.getHistory({ limit: 100 }).catch(() => null);
        const posItems = posHist?.items || posHist?.data?.items || posHist?.data || (Array.isArray(posHist) ? posHist : []);
        if (Array.isArray(posItems) && posItems.length > 0) {
          posItems.forEach((tx: any) => {
            const receiptNum = tx.receipt_number || (tx.id ? `REC-${String(tx.id).slice(0, 6).toUpperCase()}` : `REC-${Date.now()}`);
            const txLines = (tx.items || []).map((l: any) => ({
              id: l.id,
              product_name: l.product?.name || l.product_name || "Item",
              quantity: Number(l.quantity) || 1,
              unit_price: Number(l.unit_price) || 0,
              mrp: Number(l.unit_price) || 0,
              discount_value: Number(l.discount) || 0,
              tax_rate: 0,
            }));
            const txSubtotal = Number(tx.subtotal) || Number(tx.total_amount) || 0;
            const txTax = Number(tx.tax_amount) || 0;
            const txGrand = Number(tx.total_amount) || txSubtotal + txTax;
            const isRefund = tx.status === "refunded";
            const isCredit = tx.status === "credit";
            const isPaid = tx.status === "completed" || (!isCredit && !isRefund);

            remoteRecords.push({
              id: tx.id,
              invoice_number: receiptNum,
              customer_name: tx.customer?.name || "Walk-in Guest",
              customer_phone: tx.customer?.phone || "",
              customer_gstin: tx.customer?.gst_number || "",
              sales_executive: tx.cashier?.full_name || "POS Cashier",
              sales_points_earned: Math.floor(txGrand / 100),
              invoice_date: tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              due_date: "",
              payment_mode: tx.payments && tx.payments.length > 0 ? tx.payments.map((p: any) => p.payment_method).join(", ") : "Cash",
              payment_status: isPaid ? "Paid" : isCredit ? "Unpaid" : "Partial",
              subtotal: txSubtotal,
              total_tax: txTax,
              discount_amount: Number(tx.discount_amount) || 0,
              grand_total: txGrand,
              amount_received: isPaid ? txGrand : tx.payments ? tx.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) : 0,
              print_status: "Thermal Printed",
              items: txLines,
            });
          });
        }
      } catch (e) {
        console.warn("posApi.getHistory error:", e);
      }

      // Merge local and remote invoice records
      const mergedMap = new Map<string, LocalInvoiceRecord>();
      remoteRecords.forEach((inv) => {
        if (inv && inv.invoice_number) {
          mergedMap.set(inv.invoice_number, inv);
        }
      });

      localRecords.forEach((inv) => {
        if (inv && inv.invoice_number) {
          const remote = mergedMap.get(inv.invoice_number);
          if (remote) {
            if (inv.items && inv.items.length > 0) {
              remote.items = inv.items;
              remote.subtotal = inv.subtotal;
              remote.total_tax = inv.total_tax;
              remote.grand_total = inv.grand_total;
            }
            if ((inv as any).customer_type) (remote as any).customer_type = (inv as any).customer_type;
            if ((inv as any).customer_company) (remote as any).customer_company = (inv as any).customer_company;
            if ((inv as any).customer_email) (remote as any).customer_email = (inv as any).customer_email;
            if ((inv as any).customer_billing_address) (remote as any).customer_billing_address = (inv as any).customer_billing_address;
            if ((inv as any).customer_shipping_address) (remote as any).customer_shipping_address = (inv as any).customer_shipping_address;
            if ((inv as any).cgst_amount !== undefined) (remote as any).cgst_amount = (inv as any).cgst_amount;
            if ((inv as any).sgst_amount !== undefined) (remote as any).sgst_amount = (inv as any).sgst_amount;
            if ((inv as any).igst_amount !== undefined) (remote as any).igst_amount = (inv as any).igst_amount;
            if ((inv as any).gst_type) (remote as any).gst_type = (inv as any).gst_type;
            if ((inv as any).is_interstate !== undefined) (remote as any).is_interstate = (inv as any).is_interstate;
            if ((inv as any).terms) (remote as any).terms = (inv as any).terms;
            if ((inv as any).notes) (remote as any).notes = (inv as any).notes;

            const maxPaid = Math.max(Number(inv.amount_received || 0), Number(remote.amount_received || 0));
            if (maxPaid >= remote.grand_total - 0.05 && remote.grand_total > 0) {
              remote.payment_status = "Paid";
              remote.payment_mode = inv.payment_mode || remote.payment_mode || "Cash";
              remote.amount_received = remote.grand_total;
            } else if (maxPaid > 0) {
              remote.payment_status = "Partial";
              remote.payment_mode = inv.payment_mode || remote.payment_mode || "Cash";
              remote.amount_received = maxPaid;
            } else {
              remote.payment_status = remote.payment_status || inv.payment_status || "Unpaid";
            }
          } else {
            mergedMap.set(inv.invoice_number, inv);
          }
        }
      });

      const seenNumbers = new Set<string>();
      const dedupedList: LocalInvoiceRecord[] = [];
      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || b.invoice_date || 0).getTime() - new Date(a.created_at || a.invoice_date || 0).getTime()
      );

      for (const inv of sorted) {
        if (!inv.grand_total || inv.grand_total === 0) {
          if (inv.items && inv.items.length > 0) {
            let sub = 0;
            let tax = 0;
            inv.items.forEach((it: any) => {
              const qty = Number(it.quantity || 1);
              const price = Number(it.unit_price || 0);
              const dAmt = Number(it.discount_value || 0);
              const rate = Number(it.tax_rate || 0);
              const isIncl = it.is_tax_inclusive === true;
              const gross = Math.max(0, qty * price - dAmt);
              if (isIncl) {
                const base = rate > 0 ? gross / (1 + rate / 100) : gross;
                sub += base;
                tax += (gross - base);
              } else {
                sub += gross;
                tax += (gross * (rate / 100));
              }
            });
            inv.subtotal = Number(sub.toFixed(2));
            inv.total_tax = Number(tax.toFixed(2));
            inv.grand_total = Number((sub + tax).toFixed(2));
            if (inv.payment_status === "Paid") inv.amount_received = inv.grand_total;
          }
        }
        if (!seenNumbers.has(inv.invoice_number)) {
          seenNumbers.add(inv.invoice_number);
          dedupedList.push(inv);
        }
      }

      setInvoices(dedupedList);
    } catch (err: any) {
      console.error("loadInvoices critical failure:", err);
      toast.error("Failed to load invoice history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setInvoices([]);
    loadInvoices();
    const handleSync = () => {
      loadInvoices();
    };
    window.addEventListener("pos_invoices_updated", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("bos-tenant-changed", handleSync);
    return () => {
      window.removeEventListener("pos_invoices_updated", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("bos-tenant-changed", handleSync);
    };
  }, [currentTenantId, currentCompanyId, storageKey]);

  // Update print status of an invoice locally & persist
  const updateInvoicePrintStatus = (invNum: string, newStatus: "Thermal Printed" | "A4 PDF Generated") => {
    setInvoices((prev) => {
      const updated = prev.map((inv) => (inv.invoice_number === invNum ? { ...inv, print_status: newStatus } : inv));
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Open A4 PDF Printer Modal
  const handlePrintA4 = async (inv: LocalInvoiceRecord) => {
    let fullInvRecord: any = inv;
    if (inv.id && inv.id.length > 20) {
      try {
        const remote: any = await invoicesApi.getInvoice(inv.id);
        if (remote) {
          const rawGrand = Number(remote.total_amount) || inv.grand_total;
          const rawTax = Number(
            (Number(remote.cgst_amount || 0) + Number(remote.sgst_amount || 0) + Number(remote.igst_amount || 0)) ||
            remote.tax_amount ||
            inv.total_tax ||
            0
          );
          const rawSubtotal = Number(remote.subtotal) || (rawGrand - rawTax);

          fullInvRecord = {
            ...inv,
            customer_name: remote.customer_name || remote.customer?.name || inv.customer_name,
            customer_phone: remote.customer_phone || remote.customer?.phone || inv.customer_phone,
            customer_email: remote.customer_email || remote.customer?.email || (inv as any).customer_email || "",
            customer_company: remote.customer?.company || remote.customer_company || (inv as any).customer_company || "",
            customer_gstin: remote.customer_gstin || remote.customer?.tax_number || remote.customer?.gst_number || inv.customer_gstin,
            customer_type: remote.customer?.customer_type || remote.customer?.type || remote.customer?.category || (inv as any).customer_type || (inv as any).customerType,
            customer_billing_address: remote.billing_address || remote.customer?.billing_address || (inv as any).customer_billing_address || "",
            customer_shipping_address: remote.shipping_address || remote.customer?.shipping_address || (inv as any).customer_shipping_address || "",
            subtotal: rawSubtotal,
            taxable_value: rawSubtotal,
            total_tax: rawTax,
            cgst_amount: Number(remote.cgst_amount || 0) || ((inv as any).cgst_amount !== undefined ? Number((inv as any).cgst_amount) : (rawTax > 0 ? rawTax / 2 : 0)),
            sgst_amount: Number(remote.sgst_amount || 0) || ((inv as any).sgst_amount !== undefined ? Number((inv as any).sgst_amount) : (rawTax > 0 ? rawTax / 2 : 0)),
            igst_amount: Number(remote.igst_amount || 0) || ((inv as any).igst_amount !== undefined ? Number((inv as any).igst_amount) : 0),
            gst_type: (Number(remote.igst_amount || 0) > 0 || (inv as any).gst_type === "igst") ? "igst" : "cgst_sgst",
            is_interstate: Number(remote.igst_amount || 0) > 0 || (inv as any).is_interstate === true,
            discount_amount: Number(remote.discount_amount) || 0,
            grand_total: rawGrand,
            amount_received: Number(remote.amount_paid) || (String(remote.status).toLowerCase() === "paid" ? rawGrand : inv.amount_received),
            payment_status: String(remote.status).toLowerCase() === "paid" ? "Paid" : inv.payment_status,
            payment_mode: remote.payment_method || remote.payment_terms || inv.payment_mode,
            terms: remote.terms || remote.terms_and_conditions || (inv as any).terms,
            notes: remote.notes || (inv as any).notes,
            po_number: remote.po_number || remote.order_number || (inv as any).po_number,
            po_date: remote.po_date || (inv as any).po_date,
            vehicle_number: remote.vehicle_number || (inv as any).vehicle_number,
            driver_name: remote.driver_name || (inv as any).driver_name,
            driver_phone: remote.driver_phone || (inv as any).driver_phone,
            transporter_name: remote.transporter_name || (inv as any).transporter_name,
            eway_bill_number: remote.eway_bill_number || (inv as any).eway_bill_number,
            eway_bill_date: remote.eway_bill_date || (inv as any).eway_bill_date,
            items: (remote.lines && remote.lines.length > 0)
              ? remote.lines.map((l: any) => ({
                id: l.id,
                product_name: l.product_name || l.item_name || "Item",
                quantity: Number(l.quantity) || 1,
                unit_price: Number(l.unit_price) || 0,
                mrp: Number(l.mrp) || Number(l.unit_price) || 0,
                hsn_code: l.hsn_code || "",
                tax_rate: Number(l.tax_rate) || 0,
                discount_type: l.discount_type || 'fixed',
                discount_value: Number(l.discount_value) || 0,
                is_tax_inclusive: l.is_tax_inclusive === true,
              }))
              : inv.items,
          };
        }
      } catch (e) {
        console.warn("Could not fetch remote invoice detail, using cached:", e);
      }
    }

    const calculatedTax = Number(fullInvRecord.total_tax || 0);
    const isInterState = fullInvRecord.is_interstate === true || fullInvRecord.gst_type === "igst";
    const cgstAmt = fullInvRecord.cgst_amount !== undefined ? Number(fullInvRecord.cgst_amount) : (!isInterState ? calculatedTax / 2 : 0);
    const sgstAmt = fullInvRecord.sgst_amount !== undefined ? Number(fullInvRecord.sgst_amount) : (!isInterState ? calculatedTax / 2 : 0);
    const igstAmt = fullInvRecord.igst_amount !== undefined ? Number(fullInvRecord.igst_amount) : (isInterState ? calculatedTax : 0);

    const custType = fullInvRecord.customer_type || (fullInvRecord as any).customerType || undefined;

    setFullInvoiceModalData({
      invoice_number: fullInvRecord.invoice_number,
      invoice_type: fullInvRecord.invoice_type || "TAX_INVOICE",
      customerName: fullInvRecord.customer_name || 'Walk-in Customer',
      customerPhone: fullInvRecord.customer_phone || '',
      customerEmail: fullInvRecord.customer_email || '',
      customerCompany: fullInvRecord.customer_company || '',
      customerGST: fullInvRecord.customer_gstin || '',
      customerAddress: fullInvRecord.customer_billing_address || fullInvRecord.billing_address || '',
      customerBillingAddress: fullInvRecord.customer_billing_address || fullInvRecord.billing_address || '',
      customerShippingAddress: fullInvRecord.customer_shipping_address || fullInvRecord.shipping_address || '',
      customerType: custType,
      sales_executive: fullInvRecord.sales_executive,
      invoice_date: fullInvRecord.invoice_date,
      due_date: fullInvRecord.due_date,
      payment_method: fullInvRecord.payment_mode || 'Cash',
      payment_status: fullInvRecord.payment_status || 'PAID',
      subtotal: Number(fullInvRecord.subtotal || 0),
      taxable_value: fullInvRecord.taxable_value !== undefined ? Number(fullInvRecord.taxable_value) : Number(fullInvRecord.subtotal || 0),
      tax_amount: calculatedTax,
      cgst_amount: cgstAmt,
      sgst_amount: sgstAmt,
      igst_amount: igstAmt,
      gst_type: isInterState ? 'igst' : 'cgst_sgst',
      is_interstate: isInterState,
      discount_amount: Number(fullInvRecord.discount_amount || 0),
      grand_total: Number(fullInvRecord.grand_total || 0),
      amount_received: fullInvRecord.payment_status === "Paid" ? fullInvRecord.grand_total : (fullInvRecord.amount_received !== undefined ? Number(fullInvRecord.amount_received) : Number(fullInvRecord.grand_total || 0)),
      items: fullInvRecord.items || [],
      terms: fullInvRecord.terms || fullInvRecord.terms_and_conditions,
      notes: fullInvRecord.notes,
      po_number: fullInvRecord.po_number,
      po_date: fullInvRecord.po_date,
      vehicle_number: fullInvRecord.vehicle_number,
      driver_name: fullInvRecord.driver_name,
      driver_phone: fullInvRecord.driver_phone,
      transporter_name: fullInvRecord.transporter_name,
      eway_bill_number: fullInvRecord.eway_bill_number,
      eway_bill_date: fullInvRecord.eway_bill_date,
    });
    setAutoPrintFullInvoice(true);
    setIsFullInvoiceOpen(true);
    updateInvoicePrintStatus(inv.invoice_number, "A4 PDF Generated");
    toast.success(`A4 PDF Invoice generated for ${inv.invoice_number}`);
  };

  // Dispatch WhatsApp PDF Send
  const dispatchWhatsAppSend = async (inv: LocalInvoiceRecord, targetPhone: string) => {
    const cleanedPhone = targetPhone.replace(/[^0-9+]/g, "").trim();
    if (!cleanedPhone || cleanedPhone.length < 7) {
      toast.error("Please enter a valid recipient WhatsApp number (at least 10 digits).");
      return;
    }
    setIsSendingWhatsApp(true);
    toast.loading(`Sending ${inv.invoice_number} to ${cleanedPhone}...`, { id: `wa-${inv.id}` });
    try {
      const result = await invoicesApi.sendInvoiceToWhatsApp(inv.id, cleanedPhone);
      if (result.error) {
        toast.error(`WhatsApp send failed: ${result.error}`, { id: `wa-${inv.id}` });
      } else {
        toast.success(`Invoice ${inv.invoice_number} sent via WhatsApp to ${cleanedPhone}!`, { id: `wa-${inv.id}` });
        setInvoices((prev) =>
          prev.map((item) =>
            item.id === inv.id || item.invoice_number === inv.invoice_number
              ? { ...item, customer_phone: cleanedPhone, is_whatsapp_sent: true }
              : item
          )
        );
        setWhatsappInvoice(null);
      }
    } catch (err: any) {
      toast.error(`WhatsApp send failed: ${err.message || "Unknown error"}`, { id: `wa-${inv.id}` });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Trigger WhatsApp sending: opens phone dialog if customer phone is not on record
  const handleSendWhatsApp = (inv: LocalInvoiceRecord) => {
    const existingPhone = (inv.customer_phone || (inv as any).phone || "").trim();
    if (existingPhone && existingPhone.length >= 7) {
      dispatchWhatsAppSend(inv, existingPhone);
    } else {
      setWhatsappInvoice(inv);
      setWhatsappPhoneInput("");
    }
  };

  // Open Thermal Receipt Printer Window
  const handlePrintThermal = (inv: LocalInvoiceRecord) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      toast.error("Please allow popups to enable Thermal Receipt printing.");
      return;
    }

    const activeBillingGst = getActiveBillingGst(tenant?.id);
    const orgName = activeBillingGst?.trade_name || activeBillingGst?.legal_name || tenant?.name || "BusinessOS Store";
    const rawLogo = activeBillingGst?.logo_url || tenant?.logo_url || (tenant as any)?.raw?.logo_url || "";
    const orgLogo = resolveImageUrl(rawLogo);
    const orgGstin = activeBillingGst?.gstin || (tenant as any)?.tax_id || (tenant as any)?.gstin || (tenant as any)?.raw?.tax_id || "37AAAAA0000A1Z5";
    const orgAddress = activeBillingGst?.address || (tenant as any)?.address || (tenant as any)?.raw?.address || "Main Branch Store";
    const orgPhone = activeBillingGst?.phone || (tenant as any)?.phone || (tenant as any)?.raw?.phone || "";
    const googleReviewUrl = activeBillingGst?.google_review_url || (tenant as any)?.raw?.google_review_url || (activeBillingGst?.google_place_id ? `https://search.google.com/local/writereview?placeid=${activeBillingGst.google_place_id}` : null);
    const showReviewQR = activeBillingGst?.google_review_enabled !== false && Boolean(googleReviewUrl);

    const itemsHtml = (inv.items || [])
      .map(
        (it) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
        <span style="flex:1;">${it.product_name} x ${it.quantity}</span>
        <span style="font-weight:bold;">₹${(Number(it.quantity || 1) * Number(it.unit_price || 0)).toFixed(2)}</span>
      </div>
    `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${inv.invoice_number}</title>
                  <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 0 auto; padding: 10px; color: #000; }
                    h2 { text-align: center; margin: 0 0 4px 0; font-size: 16px; }
                    p { text-align: center; margin: 2px 0; font-size: 10px; }
                    .line { border-bottom: 1px dashed #000; margin: 8px 0; }
                    .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 6px; }
                  </style>
                </head>
                <body>
                  ${orgLogo ? `<div style="text-align:center; margin-bottom: 6px;"><img src="${orgLogo}" alt="${orgName}" style="max-height: 40px; max-width: 140px; object-fit: contain; filter: grayscale(100%) contrast(150%);" /></div>` : ""}
                  <h2>${orgName}</h2>
                  <p>${orgAddress}${orgPhone ? ` · Tel: ${orgPhone}` : ""}</p>
                  <p>GSTIN: ${orgGstin}</p>
                  <p>Sales Invoice #: ${inv.invoice_number}</p>
                  <p>Date: ${inv.invoice_date} | Rep: ${inv.sales_executive || "Admin"}</p>
                  <div class="line"></div>
                  <div style="font-size:11px; margin-bottom:4px;"><b>Customer:</b> ${inv.customer_name} (${inv.customer_phone || "N/A"})</div>
                  <div class="line"></div>
                  ${itemsHtml}
          <div class="line"></div>
          <div style="display:flex; justify-content:space-between; font-size:11px;">
            <span>Subtotal:</span><span>₹${Number(inv.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px;">
            <span>GST Tax:</span><span>₹${Number(inv.total_tax || 0).toFixed(2)}</span>
          </div>
          <div class="total">
            <span>GRAND TOTAL:</span>
            <span>₹${Number(inv.grand_total || 0).toFixed(2)}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:4px;">
                    <span>${inv.payment_status === "Unpaid" ? "Payment Status: Unpaid / Credit" : `Payment Mode: ${inv.payment_mode || "Cash"}`}</span>
                    <span>Paid: ₹${Number(inv.amount_received || 0).toFixed(2)}</span>
                  </div>
          <div class="line"></div>
          <p style="margin-top:10px; font-weight:bold; text-align:center;">*** THANK YOU FOR YOUR BUSINESS ***</p>
          ${showReviewQR && googleReviewUrl ? `
          <div style="text-align:center; margin: 10px 0 6px 0; padding-top: 8px; border-top: 1px dashed #000;">
            <div style="font-size:10px; font-weight:bold; letter-spacing: 2px;">★ ★ ★ ★ ★</div>
            <div style="font-size:9.5px; font-weight:bold; margin-bottom: 4px;">RATE US ON GOOGLE</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(googleReviewUrl)}" alt="Google Review QR" style="width:75px; height:75px; object-fit:contain; border: 1px solid #000; padding: 2px; margin: 2px auto;" />
            <div style="font-size:8.5px; margin-top:2px;">Scan to share your 5-star review!</div>
          </div>
          ` : ""}
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    updateInvoicePrintStatus(inv.invoice_number, "Thermal Printed");
    toast.success(`Thermal Receipt sent for ${inv.invoice_number}`);
  };

  // Open E-Way Bill Generator / Viewer Modal
  const handleOpenEwayBill = (inv: LocalInvoiceRecord) => {
    let cachedEwb: any = null;
    try {
      const raw = localStorage.getItem(`ewb_${inv.invoice_number}`);
      if (raw) cachedEwb = JSON.parse(raw);
    } catch { }

    const activeBilling = getActiveBillingGst(tenant?.id);
    setEwayBillModalData({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      total_amount: Number(inv.grand_total || 0),
      cgst_amount: Number(inv.total_tax || 0) / 2,
      sgst_amount: Number(inv.total_tax || 0) / 2,
      from_gstin: activeBilling?.gstin || "",
      from_trade_name: activeBilling?.trade_name || activeBilling?.legal_name || "",
      from_address: activeBilling?.address || "",
      from_city: activeBilling?.state_name || "",
      to_customer_name: inv.customer_name,
      to_gstin: inv.customer_gstin || "URP",
      items: inv.items || [],
      eway_bill_number: cachedEwb?.eway_bill_number || inv.eway_bill_number,
      eway_bill_data: cachedEwb,
    });
    setIsEwayBillOpen(true);
  };

  // Filtered and Sorted invoices
  const filteredInvoices = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const matchesDate = (inv: LocalInvoiceRecord) => {
      if (dateFilter === "All") return true;
      const rawDateStr = inv.created_at || inv.invoice_date;
      if (!rawDateStr) return true;
      const invDateTime = new Date(rawDateStr).getTime();
      if (isNaN(invDateTime)) return true;

      if (dateFilter === "today") {
        return invDateTime >= todayStart && invDateTime <= todayEnd;
      }
      if (dateFilter === "yesterday") {
        const yestStart = todayStart - 86400000;
        const yestEnd = todayEnd - 86400000;
        return invDateTime >= yestStart && invDateTime <= yestEnd;
      }
      if (dateFilter === "7days") {
        const start7 = todayStart - 7 * 86400000;
        return invDateTime >= start7 && invDateTime <= todayEnd;
      }
      if (dateFilter === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
        return invDateTime >= monthStart && invDateTime <= todayEnd;
      }
      if (dateFilter === "custom") {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(`${customStartDate}T00:00:00`).getTime() : 0;
        const end = customEndDate ? new Date(`${customEndDate}T23:59:59.999`).getTime() : Infinity;
        return invDateTime >= start && invDateTime <= end;
      }
      return true;
    };

    const filtered = invoices.filter((inv) => {
      const matchesSearch =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.customer_phone && inv.customer_phone.includes(q)) ||
        (inv.sales_executive && inv.sales_executive.toLowerCase().includes(q));

      const matchesStatus = statusFilter === "All" || inv.payment_status === statusFilter;
      const matchesPrint = printFilter === "All" || inv.print_status === printFilter;
      const dateOk = matchesDate(inv);

      return matchesSearch && matchesStatus && matchesPrint && dateOk;
    });

    return filtered.sort((a, b) => {
      const timeA = new Date(a.created_at || a.invoice_date || 0).getTime();
      const timeB = new Date(b.created_at || b.invoice_date || 0).getTime();

      if (sortOrder === "newest") {
        return timeB - timeA;
      }
      if (sortOrder === "oldest") {
        return timeA - timeB;
      }
      if (sortOrder === "amount_desc") {
        return Number(b.grand_total || 0) - Number(a.grand_total || 0);
      }
      if (sortOrder === "amount_asc") {
        return Number(a.grand_total || 0) - Number(b.grand_total || 0);
      }
      return 0;
    });
  }, [invoices, searchQuery, statusFilter, printFilter, dateFilter, customStartDate, customEndDate, sortOrder]);

  // Calculate Metrics
  const totalRevenue = invoices.reduce((acc, curr) => acc + curr.grand_total, 0);
  const paidCount = invoices.filter((i) => i.payment_status === "Paid").length;
  const thermalCount = invoices.filter((i) => i.print_status === "Thermal Printed").length;
  const pdfCount = invoices.filter((i) => i.print_status === "A4 PDF Generated").length;

  return (
    <div className="space-y-6 mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Generated Invoices History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View, track print status, and manage all store sales invoices in real-time
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadInvoices}
            title="Refresh Invoices"
            className="bg-white hover:bg-slate-50 text-slate-700 font-medium h-10 w-10 rounded-xl shadow-sm border border-slate-200/80 flex items-center justify-center transition-all hover:border-slate-300 active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : "text-slate-600"}`} />
          </button>

          <button
            onClick={() => goToSalesInvoice()}
            className="gradient-brand text-white font-bold px-5 h-10 text-sm rounded-xl shadow-md hover:shadow-lg shadow-purple-500/25 flex items-center gap-2 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-0 tracking-wide"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <Receipt className="w-4 h-4" />
            <span>Sales Invoice</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales Invoices</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{invoices.length}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">100% Synced & Logged</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Billed Revenue</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Avg Bill: {formatCurrency(invoices.length ? totalRevenue / invoices.length : 0)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Payment Status</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900">{paidCount}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Paid
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length - paidCount} Unpaid / Credit</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sales/Thermal Bills Breakdown</span>
            <Printer className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
              {thermalCount} 🖨️ Thermal
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
              {pdfCount} 📄 A4 PDF
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for re-printing anytime</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-3">
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Invoice #, Customer Name, Phone, Sales Rep..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">📅 All Time</option>
            <option value="today">Today's Invoices</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date Range...</option>
          </select>

          {/* Custom Date Pickers */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2 py-1">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none text-slate-700"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none text-slate-700"
              />
            </div>
          )}

          {/* Time & Amount Sorting */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">⏱️ Time: Newest First</option>
            <option value="oldest">⏱️ Time: Oldest First</option>
            <option value="amount_desc">💰 Amount: High to Low</option>
            <option value="amount_asc">💰 Amount: Low to High</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid / Credit</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Sales/Thermal Bills Filter */}
          <select
            value={printFilter}
            onChange={(e) => setPrintFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Sales/Thermal Bills</option>
            <option value="Thermal Printed">Thermal Printed</option>
            <option value="A4 PDF Generated">A4 PDF Generated</option>
            <option value="Pending Print">Pending Print</option>
          </select>
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th
                  className="px-4 py-3 text-left cursor-pointer select-none hover:text-blue-600 transition-colors"
                  onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                  title="Click to sort by Date & Time"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date & Time</span>
                    {sortOrder === "newest" && <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                    {sortOrder === "oldest" && <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                    {sortOrder !== "newest" && sortOrder !== "oldest" && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Customer / Party</th>
                <th className="px-4 py-3 text-left">Sales Representative</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Sales/Thermal bills</th>
                <th
                  className="px-4 py-3 text-center font-bold cursor-pointer select-none hover:text-blue-600 transition-colors"
                  onClick={() => setSortOrder((prev) => (prev === "amount_desc" ? "amount_asc" : "amount_desc"))}
                  title="Click to sort by Total Amount"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Total Amount</span>
                    {sortOrder === "amount_desc" && <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                    {sortOrder === "amount_asc" && <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                    {sortOrder !== "amount_desc" && sortOrder !== "amount_asc" && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading generated invoices history...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No generated invoices match your filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.invoice_number} className="hover:bg-slate-50/80 transition-colors">
                    {/* Invoice Number */}
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 flex items-center gap-1.5 flex-wrap">
                      <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{inv.invoice_number}</span>
                      {inv.order_source === "Storefront" && (
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                          🌐 Store
                        </span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          {formatDisplayDate(inv.invoice_date || inv.created_at)}
                        </div>
                        {(inv.created_at || inv.invoice_date) && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {new Date(inv.created_at || inv.invoice_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{inv.customer_name}</div>
                      {inv.customer_phone && <div className="text-[10px] text-slate-400">{inv.customer_phone}</div>}
                    </td>

                    {/* Sales Representative */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-800 font-semibold">
                        <User className="w-3 h-3 text-slate-400" />
                        {inv.sales_executive || "Sales Executive"}
                      </div>
                      {inv.sales_points_earned !== undefined && inv.sales_points_earned > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          <Award className="w-2.5 h-2.5 text-amber-500" /> +{inv.sales_points_earned} Pts
                        </span>
                      )}
                    </td>

                    {/* Payment Mode & Status */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.payment_status === "Paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.payment_status === "Partial"
                                  ? "bg-amber-50 text-amber-800 border border-amber-300 font-black"
                                  : inv.payment_status === "Cancelled" || inv.status === "cancelled"
                                    ? "bg-rose-100 text-rose-800 border border-rose-300 font-black"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                          >
                            {inv.payment_status === "Partial" ? "Partially Paid" : inv.payment_status === "Cancelled" || inv.status === "cancelled" ? "Cancelled" : inv.payment_status}
                          </span>
                          {inv.payment_status !== "Unpaid" && inv.payment_status !== "Cancelled" && inv.status !== "cancelled" && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {inv.payment_mode || "Cash"}
                            </span>
                          )}
                        </div>
                        {inv.payment_status === "Partial" && (
                          <div className="text-[10px] font-semibold flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-emerald-700">Paid: {formatCurrency(inv.amount_received || 0)}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-rose-600 font-bold">Due: {formatCurrency(Math.max(0, inv.grand_total - (inv.amount_received || 0)))}</span>
                          </div>
                        )}
                        {(inv.payment_status === "Cancelled" || inv.status === "cancelled") && inv.cancellation_reason && (
                          <div className="text-[10px] text-rose-600 italic font-medium truncate max-w-[160px]" title={inv.cancellation_reason}>
                            {inv.cancellation_reason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Print Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${inv.print_status === "Thermal Printed"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : inv.print_status === "A4 PDF Generated"
                            ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                      >
                        {inv.print_status === "Thermal Printed" && "🖨️ Thermal Printed"}
                        {inv.print_status === "A4 PDF Generated" && "📄 A4 PDF Generated"}
                        {inv.print_status === "Pending Print" && "⏳ Pending Print"}
                      </span>
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={`font-black text-sm ${(inv.payment_status === "Cancelled" || inv.status === "cancelled") ? "line-through text-slate-400" : "text-slate-900"}`}>
                          {formatCurrency(inv.grand_total)}
                        </div>
                        {inv.payment_status === "Partial" && Math.max(0, inv.grand_total - (inv.amount_received || 0)) > 0 ? (
                          <div className="text-[10px] text-rose-600 font-bold">
                            Due: {formatCurrency(Math.max(0, inv.grand_total - (inv.amount_received || 0)))}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Collect Cash Slot (Fixed width to prevent column shifting/misalignment) */}
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          {inv.payment_status !== "Paid" && inv.payment_status !== "Cancelled" && inv.status !== "cancelled" ? (
                            <button
                              type="button"
                              title={inv.payment_status === "Partial"
                                ? `Collect Due Cash: ${formatCurrency(Math.max(0, inv.grand_total - (inv.amount_received || 0)))}`
                                : `Collect Cash: ${formatCurrency(inv.grand_total)}`
                              }
                              onClick={() => handleCollectInSalesInvoice(inv)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg transition-all shadow-xs flex items-center justify-center cursor-pointer group"
                            >
                              <Banknote className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : null}
                        </div>

                        {/* Send via WhatsApp Button */}
                        <button
                          title="Send Invoice via WhatsApp"
                          onClick={() => handleSendWhatsApp(inv)}
                          className="px-2 py-1 text-slate-700 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 text-[10.5px] font-bold shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Download / Print A4 PDF Button */}
                        <button
                          title="Download / Print A4 Tax Invoice PDF"
                          onClick={() => handlePrintA4(inv)}
                          className="px-2 py-1 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-200 flex items-center gap-1 text-[10.5px] font-bold shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>A4 PDF</span>
                        </button>

                        {/* More Options Dropdown Menu (3-dots) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              title="More Options"
                              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg transition-colors border border-slate-200 flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 shadow-xl border-slate-200/80 rounded-xl p-1 bg-white z-50">
                            {/* Quick Collect Cash in Dropdown */}
                            {inv.payment_status !== "Paid" && inv.payment_status !== "Cancelled" && inv.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleCollectInSalesInvoice(inv)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Collect Due Cash</span>
                              </DropdownMenuItem>
                            )}

                            {/* View Details Drawer */}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsDetailDrawerOpen(true);
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>View Details</span>
                            </DropdownMenuItem>

                            {/* Edit Invoice */}
                            {inv.payment_status !== "Cancelled" && inv.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleEditInvoice(inv)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Edit Invoice</span>
                              </DropdownMenuItem>
                            )}

                            {/* Thermal Print */}
                            <DropdownMenuItem
                              onClick={() => handlePrintThermal(inv)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Thermal Print (80mm)</span>
                            </DropdownMenuItem>

                            {/* E-Way Bill */}
                            <DropdownMenuItem
                              onClick={() => handleOpenEwayBill(inv)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{localStorage.getItem(`ewb_${inv.invoice_number}`) ? "View E-Way Bill" : "Generate E-Way Bill"}</span>
                            </DropdownMenuItem>

                            {/* Cancel Invoice */}
                            {inv.payment_status !== "Cancelled" && inv.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                <DropdownMenuItem
                                  onClick={() => handleRequestCancelInvoice(inv)}
                                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                >
                                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>Cancel Invoice</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Drawer Modal */}
      {isDetailDrawerOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-extrabold">{selectedInvoice.invoice_number}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">Generated on {formatDisplayDate(selectedInvoice.invoice_date || selectedInvoice.created_at)}</p>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Customer & Rep Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Customer / Billed To</span>
                  <div className="font-extrabold text-slate-900 text-sm">{selectedInvoice.customer_name}</div>
                  {selectedInvoice.customer_billing_address && (
                    <div className="text-xs text-slate-600 mt-0.5">{selectedInvoice.customer_billing_address}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-0.5">{selectedInvoice.customer_phone || "Walk-in Guest"}</div>
                  {selectedInvoice.customer_gstin && (
                    <div className="text-[10px] font-mono text-blue-600 font-bold mt-1">GSTIN: {selectedInvoice.customer_gstin}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-500 block mb-1">Shipped To / Destination</span>
                  <div className="font-extrabold text-slate-900 text-sm">{selectedInvoice.customer_name}</div>
                  <div className="text-xs text-slate-700 font-medium mt-0.5">
                    {selectedInvoice.customer_shipping_address || selectedInvoice.customer_billing_address || "Same as Billing Address"}
                  </div>
                  {selectedInvoice.customer_phone && (
                    <div className="text-xs text-slate-500 mt-0.5">Contact: {selectedInvoice.customer_phone}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Sales Representative</span>
                  <div className="font-extrabold text-slate-900 text-sm">{selectedInvoice.sales_executive || "Executive"}</div>
                  <div className="text-xs text-emerald-600 font-bold mt-1">
                    Points Earned: +{selectedInvoice.sales_points_earned || 0} Pts
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" /> Itemized Line Items ({(selectedInvoice.items || []).length})
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedInvoice.items || []).map((it, idx) => {
                        const price = Number(it.unit_price || 0);
                        const qty = Number(it.quantity || 1);
                        return (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-slate-800">
                              {it.product_name}
                              {it.hsn_code && <span className="block text-[10px] font-mono text-slate-400">HSN: {it.hsn_code}</span>}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{qty}</td>
                            <td className="p-2.5 text-right text-slate-600">{currency.symbol}{price.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              {currency.symbol}{(qty * price).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Financials */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Amount:</span>
                  <span className="font-bold text-slate-800">{currency.symbol}{Number(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Tax Breakdown:</span>
                  <span className="font-bold text-slate-800">+{currency.symbol}{Number(selectedInvoice.total_tax || 0).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-purple-600 font-bold">
                    <span>Discount Applied:</span>
                    <span>-{currency.symbol}{Number(selectedInvoice.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Grand Total Amount:</span>
                  <span className="text-blue-600">{currency.symbol}{Number(selectedInvoice.grand_total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              {selectedInvoice.payment_status !== "Paid" && (
                <button
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    handleCollectInSalesInvoice(selectedInvoice);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer mb-1 transition-all"
                >
                  <CreditCard className="w-4 h-4" /> Open & Collect in Sales Invoice
                </button>
              )}
              <button
                onClick={() => handlePrintThermal(selectedInvoice)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Thermal Print
              </button>
              <button
                onClick={() => handlePrintA4(selectedInvoice)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Download A4 PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect / Settle Payment Modal */}
      {isSettleModalOpen && settlingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Collect Payment & Settle</h3>
                  <p className="text-xs text-emerald-100 font-medium">Invoice: {settlingInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSettleModalOpen(false);
                  setSettlingInvoice(null);
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Customer & Bill Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900">{settlingInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Bill Amount:</span>
                  <span className="font-bold text-slate-900">{currency.symbol}{Number(settlingInvoice.grand_total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Already Paid:</span>
                  <span className="font-bold text-slate-600">{currency.symbol}{Number(settlingInvoice.amount_received || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                  <span className="font-black text-slate-900">Remaining Balance Due:</span>
                  <span className="font-black text-rose-600">
                    {currency.symbol}{Math.max(0, Number(settlingInvoice.grand_total || 0) - Number(settlingInvoice.amount_received || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {["Cash", "UPI", "Card", "Bank Transfer"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettlePaymentMode(mode)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${settlePaymentMode === mode
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount to Settle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">Amount Collecting ({currency.symbol})</label>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {Number(settleAmount) < Math.max(0, Number(settlingInvoice.grand_total || 0) - Number(settlingInvoice.amount_received || 0))
                      ? "⚡ Partial Payment Mode"
                      : "✓ Full Payment Mode"}
                  </span>
                </div>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">{currency.symbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-base font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    placeholder="0.00"
                  />
                </div>

                {/* Quick Partial Percentage Buttons */}
                {(() => {
                  const due = Math.max(0, Number(settlingInvoice.grand_total || 0) - Number(settlingInvoice.amount_received || 0));
                  if (due <= 0) return null;
                  return (
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setSettleAmount(Math.round(due * 0.25))}
                        className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 text-center"
                      >
                        25% ({currency.symbol}{Math.round(due * 0.25)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleAmount(Math.round(due * 0.50))}
                        className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 text-center"
                      >
                        50% ({currency.symbol}{Math.round(due * 0.50)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleAmount(Math.round(due * 0.75))}
                        className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200 text-center"
                      >
                        75% ({currency.symbol}{Math.round(due * 0.75)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettleAmount(due)}
                        className="py-1 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-black transition-all border border-emerald-300 text-center"
                      >
                        100% Full
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Or Open in Sales Invoice Option */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettleModalOpen(false);
                    handleCollectInSalesInvoice(settlingInvoice);
                  }}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" /> Open Full Invoice Workspace & Settle
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSettleModalOpen(false);
                  setSettlingInvoice(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={isSubmittingSettle || !settleAmount || Number(settleAmount) <= 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                {isSubmittingSettle
                  ? "Recording..."
                  : Number(settleAmount) < Math.max(0, Number(settlingInvoice.grand_total || 0) - Number(settlingInvoice.amount_received || 0))
                    ? `Record Partial (${formatCurrency(Number(settleAmount))})`
                    : "Confirm & Mark as Paid"}
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
      />

      {/* E-Way Bill Generation Modal (Whitebooks GSP) */}
      <EWayBillModal
        isOpen={isEwayBillOpen}
        onClose={() => setIsEwayBillOpen(false)}
        invoiceData={ewayBillModalData}
      />

      {/* Send Invoice via WhatsApp Modal */}
      {whatsappInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight leading-tight">Send Invoice on WhatsApp</h3>
                  <p className="text-emerald-100 text-xs font-medium mt-0.5">Instant PDF bill dispatch via connected gateway</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappInvoice(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Invoice Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Invoice Number</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {whatsappInvoice.invoice_number}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Customer / Party</span>
                  <span className="font-bold text-slate-800">{whatsappInvoice.customer_name || "Walk-in Guest"}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Grand Total</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatCurrency(Number(whatsappInvoice.grand_total || 0))}
                  </span>
                </div>
              </div>

              {/* Phone input field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Customer's WhatsApp Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    autoFocus
                    placeholder="Enter 10-digit customer phone number"
                    value={whatsappPhoneInput}
                    onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        dispatchWhatsAppSend(whatsappInvoice, whatsappPhoneInput);
                      }
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Your connected WhatsApp account (+7995041979) will automatically deliver the PDF invoice.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWhatsappInvoice(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp || !whatsappPhoneInput.trim()}
                onClick={() => dispatchWhatsAppSend(whatsappInvoice, whatsappPhoneInput)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4" />
                {isSendingWhatsApp ? "Sending PDF Bill..." : "Send Bill via WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Cancellation Modal (Org Admin) */}
      {isCancelModalOpen && cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight leading-tight">Cancel Invoice #{cancellingInvoice.invoice_number}</h3>
                  <p className="text-rose-100 text-xs font-medium mt-0.5">Organization Admin Authorization Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isCancelling) {
                    setIsCancelModalOpen(false);
                    setCancellingInvoice(null);
                  }
                }}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Warning Callout */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Cancelling this invoice will:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-800">
                    <li>Mark invoice <strong>{cancellingInvoice.invoice_number}</strong> as <span className="font-semibold text-rose-600">Cancelled</span>.</li>
                    <li>Automatically restore all line item quantities back into product stock inventory.</li>
                    <li>Allow you to re-issue or create a new invoice under the same number <strong>{cancellingInvoice.invoice_number}</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Customer / Party:</span>
                  <span className="font-bold text-slate-800">{cancellingInvoice.customer_name || "Walk-in Guest"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Invoice Date:</span>
                  <span className="font-bold text-slate-700">{cancellingInvoice.invoice_date}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Total Amount:</span>
                  <span className="font-black text-slate-900 text-sm">{formatCurrency(cancellingInvoice.grand_total)}</span>
                </div>
              </div>

              {/* Products to Restock */}
              {cancellingInvoice.items && cancellingInvoice.items.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Products Returned to Stock ({cancellingInvoice.items.length} items):
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 max-h-36 overflow-y-auto">
                    {cancellingInvoice.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-none">
                        <span className="font-medium text-slate-800 truncate max-w-[240px]">{it.product_name || it.name || "Item"}</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          +{it.quantity || 1} Restocked
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Cancellation Reason <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g., Customer cancelled order / Price dispute / Data entry mistake"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCancellingInvoice(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Keep Invoice
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={() => handleConfirmCancellation(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{isCancelling ? "Cancelling..." : "Cancel Invoice Only"}</span>
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={() => handleConfirmCancellation(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isCancelling ? "Processing..." : "Cancel & Re-open in Sales"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
