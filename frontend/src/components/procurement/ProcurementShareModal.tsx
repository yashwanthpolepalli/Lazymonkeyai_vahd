import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  MessageCircle, 
  Mail, 
  Download, 
  FileText, 
  CheckCircle2, 
  Copy, 
  Phone,
  Receipt
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import { useTenant } from '@/contexts/tenant-context';
import { FullInvoicePrinter, FullInvoiceData } from '../pos/FullInvoicePrinter';
import { getActiveBillingGst } from '@/lib/receipt-template-store';

interface ProcurementShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: any;
  docType?: 'PINV' | 'PO' | 'PR';
}

export function ProcurementShareModal({
  isOpen,
  onClose,
  documentData,
  docType = 'PINV'
}: ProcurementShareModalProps) {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'preview' | 'whatsapp' | 'email'>('whatsapp');
  const [isPdfPrinterOpen, setIsPdfPrinterOpen] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  // Extract variables safely even when documentData is null
  const docNumber = documentData?.bill_number || documentData?.po_number || documentData?.request_number || documentData?.id?.slice(0, 8) || 'DOC-001';
  const supplierName = documentData?.supplier_name || documentData?.supplier?.name || documentData?.customerName || 'Vendor Partner';
  const supplierPhone = documentData?.supplier_phone || documentData?.supplier?.phone || documentData?.supplier?.contacts?.[0]?.phone || '';
  const supplierEmail = documentData?.supplier_email || documentData?.supplier?.email || documentData?.supplier?.contacts?.[0]?.email || '';
  
  const totalAmount = Number(documentData?.total_amount || documentData?.grand_total || 0);
  const paidAmount = Number(documentData?.paid_amount || documentData?.amount_received || 0);
  const paymentStatus = documentData?.status || (paidAmount >= totalAmount && totalAmount > 0 ? 'Paid' : 'Unpaid');
  const items = documentData?.items || [];

  // Sync phone and email when documentData changes
  useEffect(() => {
    if (documentData) {
      setPhoneInput(supplierPhone);
      setEmailInput(supplierEmail);
    }
  }, [documentData, supplierPhone, supplierEmail]);

  // Active Store / Tenant details
  const activeGst = getActiveBillingGst(tenant?.id);
  const orgName = activeGst?.trade_name || activeGst?.legal_name || tenant?.name || 'BusinessOS Store';
  const orgPhone = activeGst?.phone || (tenant as any)?.phone || '';

  // Formatted FullInvoiceData for PDF Printer
  const fullInvoiceData: FullInvoiceData = {
    invoice_number: docNumber,
    invoice_date: documentData?.bill_date || documentData?.order_date || documentData?.created_at || new Date().toISOString(),
    due_date: documentData?.due_date || documentData?.delivery_date,
    customerName: supplierName,
    customerPhone: phoneInput,
    customerEmail: emailInput,
    customerCompany: documentData?.supplier?.company_name || supplierName,
    customerGST: documentData?.supplier?.tax_id || (documentData?.supplier as any)?.gstin || '',
    customerAddress: documentData?.supplier?.address || '',
    items: items.map((it: any) => ({
      product_name: it.product_name || it.name || 'Material Item',
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      tax_rate: Number(it.tax_percent) || 0,
      subtotal: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0) * (1 + (Number(it.tax_percent) || 0) / 100),
    })),
    subtotal: totalAmount,
    tax_amount: items.reduce((acc: number, it: any) => acc + ((Number(it.quantity) || 1) * (Number(it.unit_price) || 0) * (Number(it.tax_percent) || 0) / 100), 0),
    grand_total: totalAmount,
    amount_received: paidAmount,
    payment_status: paymentStatus,
    payment_method: 'Direct Settlement / Bank Transfer',
    notes: docType === 'PO' ? 'Official Purchase Order' : 'Verified Purchase Invoice & Bill',
  };

  const docTitle = docType === 'PO' ? 'Purchase Order' : (docType === 'PR' ? 'Purchase Requisition' : 'Purchase Invoice & Bill');

  // WhatsApp Message Generator
  const generateWhatsAppMessage = () => {
    const lines = [
      `*${orgName}*`,
      `📄 *${docTitle.toUpperCase()}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `*Document Number:* ${docNumber}`,
      `*Vendor:* ${supplierName}`,
      `*Date:* ${new Date().toLocaleDateString('en-IN')}`,
      `*Items Count:* ${items.length} item(s)`,
      `*Total Amount:* ${currency.symbol}${totalAmount.toLocaleString('en-IN')}`,
      `*Payment Status:* ${paymentStatus}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Thank you for your business!`,
      orgPhone ? `📞 Contact: ${orgPhone}` : ''
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phoneInput.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit WhatsApp phone number.');
      return;
    }
    const message = generateWhatsAppMessage();
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    toast.success(`WhatsApp chat opened for ${supplierName}!`);
  };

  const handleSendEmail = () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    const subject = `${docTitle} #${docNumber} from ${orgName}`;
    const body = generateWhatsAppMessage().replace(/\*/g, '');
    const mailtoUrl = `mailto:${emailInput}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    toast.success(`Email client opened for ${emailInput}!`);
  };

  const copyTextToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Safe early exit for render ONLY after all hooks are executed
  if (!isOpen || !documentData) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight leading-tight">{docTitle} Dispatch & PDF</h3>
                <p className="text-white/80 text-xs font-medium mt-0.5 font-mono">{docNumber} • {supplierName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'whatsapp' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <MessageCircle className="size-4" /> WhatsApp Dispatch
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'email' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Mail className="size-4" /> Email Dispatch
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPdfPrinterOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="size-4 text-teal-400" /> View / Print PDF
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Quick Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Document Ref</span>
                <span className="font-mono font-bold text-primary">{docNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Vendor Party</span>
                <span className="font-bold text-foreground truncate block">{supplierName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Total Invoiced</span>
                <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="size-3" /> {paymentStatus}
                </span>
              </div>
            </div>

            {/* WhatsApp View */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="size-3.5 text-emerald-600" /> Recipient WhatsApp Mobile Number:
                </label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. 919876543210" 
                    value={phoneInput} 
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="font-mono text-sm rounded-xl"
                  />
                  <Button 
                    type="button" 
                    onClick={handleSendWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shrink-0 shadow-md"
                  >
                    <MessageCircle className="size-4" /> Send Now
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-300">
                  ⚡ Opens instant WhatsApp chat with pre-formatted invoice breakdown and store branding.
                </div>
              </div>
            )}

            {/* Email View */}
            {activeTab === 'email' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mail className="size-3.5 text-indigo-600" /> Recipient Vendor Email Address:
                </label>
                <div className="flex gap-2">
                  <Input 
                    type="email"
                    placeholder="vendor@company.com" 
                    value={emailInput} 
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="text-sm rounded-xl"
                  />
                  <Button 
                    type="button" 
                    onClick={handleSendEmail}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5 shrink-0 shadow-md"
                  >
                    <Mail className="size-4" /> Open Email
                  </Button>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-300">
                  ✉️ Launches default email client with structured document subject, vendor greeting, and complete invoice tally.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyTextToClipboard(generateWhatsAppMessage())}
              className="text-xs rounded-xl gap-1.5 font-semibold"
            >
              <Copy className="size-3.5" /> Copy Summary
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs rounded-xl font-bold"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPdfPrinterOpen(true)}
                className="bg-slate-900 hover:bg-black text-white text-xs rounded-xl font-bold gap-1.5 shadow-md"
              >
                <FileText className="size-3.5 text-teal-400" /> Full A4 PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal with Template Selection */}
      <FullInvoicePrinter
        invoice={fullInvoiceData}
        isOpen={isPdfPrinterOpen}
        onClose={() => setIsPdfPrinterOpen(false)}
        autoPrint={false}
      />
    </>
  );
}
