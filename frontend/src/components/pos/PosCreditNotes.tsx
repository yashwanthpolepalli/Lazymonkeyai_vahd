import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  FileCheck,
  Printer,
  MessageCircle,
  Download,
  Calendar,
  User,
  ArrowRightLeft,
  DollarSign,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { invoicesApi } from "@/lib/api-client";
import { useTenant } from "@/contexts/tenant-context";
import { useCurrency } from "@/hooks/use-currency";
import { getActiveBillingGst } from "@/lib/receipt-template-store";
import { PosSalesInvoice } from "./PosSalesInvoice";

export interface PosDocumentRecord {
  id: string;
  invoice_number?: string;
  invoice_type?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  reference_number?: string;
  original_invoice_ref?: string;
  order_number?: string;
  note_reason?: string;
  invoice_date?: string;
  due_date?: string;
  payment_terms?: string;
  payment_status?: string;
  payment_method?: string;
  subtotal?: number;
  total?: number;
  total_amount?: number;
  grand_total?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  notes?: string;
  lines?: any[];
  items?: any[];
}

export function PosCreditNotes() {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState("");
  const [creditNotes, setCreditNotes] = useState<PosDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [sendingWhatsappId, setSendingWhatsappId] = useState<string | null>(null);

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      // Fetch both from backend API and local storage
      const res = await invoicesApi.listInvoices({ invoice_type: "credit_note", page_size: 150 }).catch(() => null);
      const apiItems: any[] = Array.isArray(res) ? res : (res as any)?.items || [];

      // Check local storage for any recently created POS credit notes
      const currentTenantId = (tenant as any)?.raw?.tenant_id || (tenant as any)?.tenant_id || tenant?.id || "default";
      const currentCompanyId = tenant?.id || (tenant as any)?.raw?.id || (tenant as any)?.company_id || "default";
      const localKey = `pos_saved_invoices_${currentTenantId}_${currentCompanyId}`;
      let localItems: any[] = [];
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          localItems = parsed.filter((i: any) => i.invoice_type === "CREDIT_NOTE" || i.invoice_type === "credit_note" || (i.invoice_number && i.invoice_number.startsWith("CN-")));
        }
      } catch (e) {
        console.warn("Local storage parse error:", e);
      }

      // Merge and deduplicate
      const map = new Map<string, any>();
      apiItems.forEach((it) => map.set(it.id || it.invoice_number, it));
      localItems.forEach((it) => {
        const key = it.id || it.invoice_number;
        if (!map.has(key)) map.set(key, it);
      });

      setCreditNotes(Array.from(map.values()));
    } catch (err) {
      console.error("Failed to load credit notes:", err);
      toast.error("Failed to load credit notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCreditNotes();
  }, [tenant?.id]);

  const handlePrintCreditNote = (note: PosDocumentRecord | any) => {
    const printWin = window.open("", "_blank", "width=850,height=1100");
    if (!printWin) {
      toast.error("Please allow popups to preview and print Credit Note.");
      return;
    }

    const activeBillingGst = getActiveBillingGst(tenant?.id);
    const orgName = activeBillingGst?.trade_name || activeBillingGst?.legal_name || tenant?.name || "BusinessOS AI";
    const orgLogo = activeBillingGst?.logo_url || tenant?.logo_url || (tenant as any)?.raw?.logo_url || "";
    const orgAddress = activeBillingGst?.address || (tenant as any)?.settings?.address || "Store Main Branch";
    const orgPhone = activeBillingGst?.phone || (tenant as any)?.settings?.phone || "+91 98493 44919";
    const orgEmail = activeBillingGst?.email || (tenant as any)?.settings?.email || "billing@businessos.ai";
    const orgGstin = activeBillingGst?.gstin || (tenant as any)?.settings?.gstin || (tenant as any)?.tax_id || "";

    const lines = note.lines || note.items || [];
    const total = Number(note.total || note.total_amount || 0);
    const cgst = Number(note.cgst_amount || 0);
    const sgst = Number(note.sgst_amount || 0);
    const igst = Number(note.igst_amount || 0);
    const subtotal = Number(note.subtotal || total - (cgst + sgst + igst));

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credit Note - ${note.invoice_number || note.id} - ${orgName}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            body { background: #ffffff; color: #0f172a; padding: 16px; font-size: 9.5pt; line-height: 1.5; }
            .container { max-width: 740px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e11d48; padding-bottom: 14px; margin-bottom: 20px; }
            .org-box { display: flex; align-items: center; gap: 12px; }
            .org-box h1 { font-size: 16pt; font-weight: 900; color: #0f172a; }
            .org-box p { font-size: 8.5pt; color: #64748b; }
            .badge-box { text-align: right; }
            .badge-tag { display: inline-block; background: #e11d48; color: #ffffff; font-size: 9pt; font-weight: 800; padding: 4px 12px; border-radius: 6px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #fff1f2; padding: 12px 16px; border-radius: 8px; border: 1px solid #fecdd3; margin-bottom: 20px; font-size: 8.5pt; }
            .info-grid h4 { font-size: 8pt; text-transform: uppercase; color: #9f1239; font-weight: 800; margin-bottom: 4px; }
            .info-grid p { font-size: 9pt; font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
            th { background: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; font-weight: 800; color: #1e293b; }
            td { padding: 8px 12px; border: 1px solid #e2e8f0; }
            .total-box { display: flex; justify-content: flex-end; margin-bottom: 24px; }
            .total-card { width: 280px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px 16px; }
            .total-row { display: flex; justify-content: space-between; font-size: 9pt; font-weight: 600; margin-bottom: 6px; }
            .grand-total { border-top: 1.5px solid #be123c; padding-top: 6px; margin-top: 6px; font-size: 11pt; font-weight: 900; color: #be123c; }
            .note-box { background: #f8fafc; border-left: 3px solid #e11d48; padding: 10px 14px; font-size: 8pt; color: #475569; margin-bottom: 20px; }
            .footer { text-align: center; font-size: 7.5pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="org-box">
                ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" style="max-height: 48px; max-width: 140px; object-fit: contain;" />` : `<div style="width: 42px; height: 42px; border-radius: 8px; background: #e11d48; color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13pt;">CN</div>`}
                <div>
                  <h1>${orgName}</h1>
                  <p>${orgAddress}</p>
                  <p>Ph: ${orgPhone} • Email: ${orgEmail}${orgGstin ? ` • GSTIN: ${orgGstin}` : ""}</p>
                </div>
              </div>
              <div class="badge-box">
                <span class="badge-tag">GST Credit Note</span>
                <p style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">Sec 34 GST Act 2017</p>
              </div>
            </div>

            <div class="info-grid">
              <div>
                <h4>Issued To (Customer)</h4>
                <p><strong>${note.customer_name || "Valued Customer"}</strong></p>
                <p>${note.customer_phone ? `Phone: ${note.customer_phone}` : ""}</p>
                <p>${note.customer_gstin ? `GSTIN: ${note.customer_gstin}` : ""}</p>
                <p>${note.billing_address || ""}</p>
              </div>
              <div>
                <h4>Credit Note Details</h4>
                <p>Note Number: <strong>${note.invoice_number || note.id}</strong></p>
                <p>Date of Issue: <strong>${note.invoice_date || new Date().toISOString().slice(0, 10)}</strong></p>
                <p>Original Invoice Ref: <strong>${note.reference_number || (note as any).original_invoice_ref || "Direct Credit"}</strong></p>
                <p>Reason for Note: <strong>${note.order_number || (note as any).note_reason || "Sales Return / Rebate"}</strong></p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 35px;">#</th>
                  <th>Item / Returned Goods Description</th>
                  <th style="width: 80px; text-align: center;">HSN</th>
                  <th style="width: 60px; text-align: right;">Qty</th>
                  <th style="width: 90px; text-align: right;">Rate</th>
                  <th style="width: 60px; text-align: right;">Tax %</th>
                  <th style="width: 100px; text-align: right;">Credit Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lines.length > 0 ? lines.map((l: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${l.product_name || l.name || "Item"}</strong></td>
                    <td style="text-align: center;">${l.hsn_code || "—"}</td>
                    <td style="text-align: right;">${l.quantity || 1}</td>
                    <td style="text-align: right;">${currency.symbol}${(Number(l.unit_price) || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${l.tax_rate || 0}%</td>
                    <td style="text-align: right;"><strong>${currency.symbol}${((Number(l.unit_price) || 0) * (Number(l.quantity) || 1)).toFixed(2)}</strong></td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td>1</td>
                    <td>Credit Adjustment / Sales Return</td>
                    <td style="text-align: center;">—</td>
                    <td style="text-align: right;">1</td>
                    <td style="text-align: right;">${currency.symbol}${total.toFixed(2)}</td>
                    <td style="text-align: right;">0%</td>
                    <td style="text-align: right;"><strong>${currency.symbol}${total.toFixed(2)}</strong></td>
                  </tr>
                `}
              </tbody>
            </table>

            <div class="total-box">
              <div class="total-card">
                <div class="total-row"><span>Taxable Value:</span><span>${currency.symbol}${subtotal.toFixed(2)}</span></div>
                ${cgst > 0 ? `<div class="total-row"><span>CGST:</span><span>+${currency.symbol}${cgst.toFixed(2)}</span></div>` : ""}
                ${sgst > 0 ? `<div class="total-row"><span>SGST:</span><span>+${currency.symbol}${sgst.toFixed(2)}</span></div>` : ""}
                ${igst > 0 ? `<div class="total-row"><span>IGST:</span><span>+${currency.symbol}${igst.toFixed(2)}</span></div>` : ""}
                <div class="total-row grand-total"><span>Total Credit Amount:</span><span>${currency.symbol}${total.toFixed(2)}</span></div>
              </div>
            </div>

            ${note.notes ? `<div class="note-box"><strong>Remarks / Reason:</strong> ${note.notes}</div>` : ""}

            <div class="footer">
              <p>This is a computer-generated GST Credit Note issued in compliance with Section 34 of the CGST Act, 2017.</p>
              <p>The above credit amount has been adjusted towards customer ledger / store credit balance.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const handleSendWhatsApp = async (note: PosDocumentRecord | any) => {
    const phone = note.customer_phone || "";
    if (!phone) {
      toast.error("Customer has no phone number on record.");
      return;
    }

    setSendingWhatsappId(note.id);
    try {
      const res = await invoicesApi.sendInvoiceToWhatsApp(note.id, phone);
      if (res.success) {
        toast.success(`Credit Note sent to ${phone} via WhatsApp!`);
      } else {
        toast.error(res.error || "Failed to send Credit Note via WhatsApp.");
      }
    } catch (e: any) {
      toast.error(e?.message || "WhatsApp gateway error.");
    } finally {
      setSendingWhatsappId(null);
    }
  };

  // Filtered notes
  const filtered = creditNotes.filter((n) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (n.invoice_number || "").toLowerCase().includes(q) ||
      (n.customer_name || "").toLowerCase().includes(q) ||
      (n.customer_phone || "").toLowerCase().includes(q) ||
      (n.reference_number || "").toLowerCase().includes(q) ||
      (n.notes || "").toLowerCase().includes(q);

    return matchesSearch;
  });

  const totalCreditAmount = creditNotes.reduce((sum, n) => sum + Number(n.total || n.total_amount || 0), 0);

  if (isCreatingNote) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-rose-50/80 border border-rose-200 px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-rose-600 text-white rounded-lg font-bold text-xs">CN</span>
            <div>
              <h3 className="font-bold text-xs text-rose-900">New Customer Credit Note (Sales Return / Rebate)</h3>
              <p className="text-[11px] text-rose-700">Issue store credit or return adjustment for customer against sales invoice</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingNote(false);
              void fetchCreditNotes();
            }}
            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            ← Back to Credit Notes List
          </button>
        </div>

        <PosSalesInvoice initialDocType="CREDIT_NOTE" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      {/* Header & Metric Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <FileCheck className="size-4" />
            </span>
            Credit Notes (Sales Returns & Rebates)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer credit notes, return goods adjustments, and GST Sec 34 credit memos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchCreditNotes()}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin text-rose-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreatingNote(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" /> + Create Credit Note
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Notes Issued</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{creditNotes.length}</h3>
          </div>
          <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <FileText className="size-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Credit Value</p>
            <h3 className="text-xl font-bold text-rose-600 mt-0.5">{currency.symbol}{totalCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </div>
          <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <TrendingDown className="size-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">GST Status</p>
            <h3 className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle className="size-3.5" /> Sec 34 GST Compliant
            </h3>
          </div>
          <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="size-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Credit Note #, Customer Name, Phone, Original Inv Ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Credit Notes Table List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading credit notes...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="size-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
              <FileCheck className="size-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No Credit Notes Found</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Issue a credit note when a customer returns goods or when you provide a post-sale rebate.
            </p>
            <button
              type="button"
              onClick={() => setIsCreatingNote(true)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" /> + Create First Credit Note
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Note Number</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Customer Party</th>
                  <th className="px-4 py-3">Original Invoice Ref</th>
                  <th className="px-4 py-3">Reason for Note</th>
                  <th className="px-4 py-3 text-right">Credit Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((note) => {
                  const total = Number(note.total || note.total_amount || 0);
                  return (
                    <tr key={note.id || note.invoice_number} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-rose-600">
                        {note.invoice_number || note.id}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {note.invoice_date || new Date().toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{note.customer_name || "Walk-in Customer"}</div>
                        {note.customer_phone && (
                          <div className="text-[11px] text-slate-400">{note.customer_phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {note.reference_number || (note as any).original_invoice_ref ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                            #{note.reference_number || (note as any).original_invoice_ref}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Direct Adjustment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {note.order_number || (note as any).note_reason || "Sales Return"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 text-sm">
                        {currency.symbol}{total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintCreditNote(note)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Print GST Credit Note"
                          >
                            <Printer className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSendWhatsApp(note)}
                            disabled={sendingWhatsappId === note.id}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                            title="Send via WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
