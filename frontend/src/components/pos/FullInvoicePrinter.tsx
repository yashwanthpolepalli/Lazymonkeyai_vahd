import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Download, FileText, CheckCircle2 } from 'lucide-react';
import { getActiveInvoicePrintTemplate, getActiveBillingGst, getTenantTemplatesKey } from '../../lib/receipt-template-store';
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";
import { companiesApi, resolveImageUrl } from "@/lib/api-client";
import { formatDisplayDate } from "@/lib/utils";
import { generateQRCodeSVG } from "@/lib/qr-generator";
import { MargPharmaTemplate } from './invoice-templates/MargPharmaTemplate';
import { FmcgDistributorTemplate } from './invoice-templates/FmcgDistributorTemplate';
import { ParleDistributorTemplate } from './invoice-templates/ParleDistributorTemplate';
import { AgriSeedsTemplate } from './invoice-templates/AgriSeedsTemplate';
import { computeGstBreakdown, extractGstState, INDIAN_GST_STATES } from '@/lib/gst-utils';

const BUILTIN_INVOICE_OPTIONS = [
  { id: 'tpl-inv-marg-pharma', name: 'MARG Pharma & Wholesale GST (A4)', themeName: 'marg_pharma' },
  { id: 'tpl-inv-fmcg-distributor', name: 'FMCG / Food Multi-Column GST (A4)', themeName: 'fmcg_distributor' },
  { id: 'tpl-inv-parle-teal', name: 'Parle Brand Teal-Header GST (A4)', themeName: 'parle_teal' },
  { id: 'tpl-inv-agri-seeds', name: 'Agri Seeds, Fertilizer & Pesticides GST (A4)', themeName: 'agri_seeds' },
  { id: 'tpl-inv-stylish', name: 'Stylish Theme (A4)', themeName: 'stylish' },
  { id: 'tpl-inv-luxury', name: 'Luxury Theme (A4)', themeName: 'luxury' },
  { id: 'tpl-inv-tally', name: 'Advanced GST (Tally) Theme (A4)', themeName: 'tally' },
  { id: 'tpl-inv-adv-gst', name: 'Advanced GST Theme (A4)', themeName: 'adv_gst' },
  { id: 'tpl-inv-billbook', name: 'BillBook Theme (A4)', themeName: 'billbook' },
  { id: 'tpl-inv-modern', name: 'Modern Theme (A4)', themeName: 'modern' },
];

export interface FullInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  po_number?: string;
  po_date?: string;
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  transporter_name?: string;
  transporter_id?: string;
  eway_bill_number?: string;
  eway_bill_date?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerGST?: string;
  customerAddress?: string;
  customerBillingAddress?: string;
  customerShippingAddress?: string;
  customerType?: string;
  items?: Array<{
    product_id?: string;
    product_name?: string;
    hsn_code?: string;
    quantity: number;
    unit_price: number;
    mrp?: number;
    discount_type?: 'percent' | 'fixed';
    discount_value?: number;
    tax_rate?: number;
    subtotal?: number;
  }>;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  taxable_value?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  gst_type?: 'cgst_sgst' | 'igst';
  is_interstate?: boolean;
  additional_charges?: Array<{ name: string; amount: number }>;
  round_off?: number;
  grand_total?: number;
  payment_method?: string;
  payment_status?: string;
  amount_received?: number;
  notes?: string;
  terms?: string;
  [key: string]: any;
}

interface FullInvoicePrinterProps {
  invoice: FullInvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  customTemplate?: any;
}

const STATE_GST_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala", "33": "Tamil Nadu",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

export function FullInvoicePrinter({
  isOpen,
  onClose,
  invoice,
  autoPrint = false,
  customTemplate,
}: FullInvoicePrinterProps) {
  const { currency } = useCurrency();
  const { tenant } = useTenant();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [fetchedReviewUrl, setFetchedReviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      try {
        const storageKey = getTenantTemplatesKey(tenant?.id);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            const invTpls = list.filter((t: any) => t.category === 'invoices');
            setAvailableTemplates(invTpls);
          }
        }

        // 1. Try resolving Google Review URL immediately from localStorage
        const activeCompRaw = localStorage.getItem('bos_active_company') || 
                              localStorage.getItem(`bos_active_company_${tenant?.id}`) ||
                              localStorage.getItem('bos_active_company_default');
        if (activeCompRaw) {
          const parsed = JSON.parse(activeCompRaw);
          if (parsed?.google_review_url) {
            setFetchedReviewUrl(parsed.google_review_url);
          }
        }

        // 2. Fetch fresh organization company data from API to guarantee Google Review URL is populated
        companiesApi.list(1, 10).then((res) => {
          if (res?.items && res.items.length > 0) {
            const active = res.items.find((c: any) => c.is_active) || res.items[0];
            if (active?.google_review_url) {
              setFetchedReviewUrl(active.google_review_url);
            }
          }
        }).catch(() => {});
      } catch {}
    }
  }, [isOpen, tenant?.id]);

  useEffect(() => {
    if (isOpen && autoPrint && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, invoice]);

  if (!isOpen || !invoice) return null;
  if (typeof document === 'undefined') return null;

  // Retrieve active template or fallback
  const activeMasterTemplate = getActiveInvoicePrintTemplate();
  const selectedTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);
  const template = selectedTemplate || activeMasterTemplate;

  const f = {
    showLogo: true,
    showHSN: true,
    showTaxSplit: true,
    showBankDetails: false,
    showSignature: true,
    showCustomerDetails: true,
    showProductName: true,
    showPrice: true,
    showMRP: true,
    showSKU: true,
    showPartyBalance: true,
    ...(template?.fields || {}),
  };

  const theme =
    template.themeName ||
    (template.name?.toLowerCase().includes('marg') || template.id?.includes('marg') ? 'marg_pharma' :
     template.name?.toLowerCase().includes('fmcg') || template.id?.includes('fmcg') ? 'fmcg_distributor' :
     template.name?.toLowerCase().includes('parle') || template.id?.includes('parle') ? 'parle_teal' :
     template.name?.toLowerCase().includes('agri') || template.id?.includes('agri') || template.name?.toLowerCase().includes('seed') || template.id?.includes('seed') ? 'agri_seeds' :
     template.name?.toLowerCase().includes('luxury') || template.id?.includes('luxury') ? 'luxury' :
     template.name?.toLowerCase().includes('tally') || template.id?.includes('tally') ? 'tally' :
     template.name?.toLowerCase().includes('adv') || template.id?.includes('adv') ? 'adv_gst' :
     template.name?.toLowerCase().includes('billbook') || template.id?.includes('billbook') ? 'billbook' :
     template.name?.toLowerCase().includes('modern') || template.id?.includes('modern') ? 'modern' :
     template.name?.toLowerCase().includes('god') || template.id?.includes('god') ? 'culture_god' :
     'stylish');

  const isMargPharma = theme === 'marg_pharma';
  const isFmcg = theme === 'fmcg_distributor';
  const isParle = theme === 'parle_teal';
  const isAgriSeeds = theme === 'agri_seeds';
  const isCustomReplica = isMargPharma || isFmcg || isParle || isAgriSeeds;

  const isLuxury = theme === 'luxury';
  const isTally = theme === 'tally';
  const isStylish = theme === 'stylish';
  const isAdvGst = theme === 'adv_gst';
  const isBillBook = theme === 'billbook';
  const isModern = theme === 'modern';
  const isSimple = theme === 'simple';
  const isCultureUp = theme === 'culture_up';
  const isCultureGod = theme === 'culture_god';

  const primaryColor = template.primaryColor || (isLuxury ? '#b45309' : isTally ? '#0f172a' : isAdvGst ? '#16a34a' : isModern ? '#475569' : '#2563eb');
  const fontFamily = template.fontFamily || (isLuxury || isModern ? 'Outfit, sans-serif' : 'Inter, sans-serif');

  // ── Dynamic Multi-Tenant Organization & Template Data Resolution ─────
  const tenantRaw = (tenant as any)?.raw || {};
  const tenantSettings = (tenant as any)?.settings || tenantRaw?.settings || {};
  const activeBillingGst = getActiveBillingGst(tenant?.id);

  // 1. Store Name / Company Name Resolution (Honor template custom name if set, else active org company, else tenant)
  const isTemplateStoreNameCustom = Boolean(
    template.storeName &&
    template.storeName.trim() !== '' &&
    !template.storeName.includes('LazyMonkeyAI') &&
    !template.storeName.includes('Organization')
  );

  const dynamicStoreName =
    (isTemplateStoreNameCustom ? template.storeName : '') ||
    activeBillingGst?.trade_name ||
    activeBillingGst?.legal_name ||
    tenant?.name ||
    tenantRaw?.trade_name ||
    tenantRaw?.legal_name ||
    tenantRaw?.name ||
    template.storeName ||
    'Business Organization';

  // 2. Logo Resolution (Active organization company logo strictly isolated per tenant)
  const activeLogo =
    activeBillingGst?.logo_url ||
    tenant?.logo_url ||
    tenantRaw?.logo_url ||
    (tenant as any)?.raw?.logo_url ||
    null;

  const isTemplateLogoCustom = Boolean(
    template.logoUrl &&
    template.logoUrl.trim() !== '' &&
    !template.logoUrl.includes('default') &&
    !template.logoUrl.includes('/Logo.png') &&
    !template.logoUrl.includes('/logo.png')
  );

  const rawLogo = activeLogo || (isTemplateLogoCustom ? template.logoUrl : '') || '/lazymonkey-logo.png';
  const dynamicLogoUrl = resolveImageUrl(rawLogo) || '/lazymonkey-logo.png';

  // 3. Address Resolution
  const isTemplateAddressCustom = Boolean(
    template.storeAddress &&
    template.storeAddress.trim() !== '' &&
    !template.storeAddress.includes('KK Street, Proddatur')
  );

  const tenantAddressFormatted = [
    tenantRaw?.address || tenantSettings?.address,
    tenantRaw?.city || tenantSettings?.city,
    tenantRaw?.state || tenantSettings?.state,
    tenantRaw?.postal_code || tenantSettings?.pincode,
  ].filter(Boolean).join(', ');

  const dynamicAddress =
    (isTemplateAddressCustom ? template.storeAddress : '') ||
    activeBillingGst?.address ||
    tenantAddressFormatted ||
    '';

  // 4. Phone Resolution
  const isTemplatePhoneCustom = Boolean(
    template.storePhone &&
    template.storePhone.trim() !== '' &&
    !template.storePhone.includes('+91 9849344919')
  );

  const dynamicPhone =
    (isTemplatePhoneCustom ? template.storePhone : '') ||
    activeBillingGst?.phone ||
    tenantRaw?.phone ||
    tenantSettings?.phone ||
    (tenant as any)?.phone ||
    '';

  // 5. Email Resolution
  const dynamicEmail =
    (template.storeEmail && !template.storeEmail.includes('support@businessos.ai') ? template.storeEmail : '') ||
    activeBillingGst?.email ||
    tenantRaw?.email ||
    tenantSettings?.email ||
    (tenant as any)?.email ||
    '';

  // 6. GSTIN Resolution
  const isTemplateGstinCustom = Boolean(
    template.gstin &&
    template.gstin.trim() !== '' &&
    !template.gstin.includes('37AABCCH694G1Z4')
  );

  const dynamicGstin =
    (
      (isTemplateGstinCustom ? template.gstin : '') ||
      activeBillingGst?.gstin ||
      tenantRaw?.gst_number ||
      tenantRaw?.gstin ||
      tenantSettings?.gstin ||
      tenantSettings?.tax_id ||
      ''
    ).trim().toUpperCase();

  const sellerGstin = dynamicGstin;
  const sellerState = extractGstState(
    sellerGstin,
    dynamicAddress,
    activeBillingGst?.state_name || tenantRaw?.state || tenantSettings?.state
  );
  const sellerStateCode = sellerState.code;

  // 7. Bank Details Resolution
  const dynamicBank = (() => {
    if (customTemplate?.bankDetails) return customTemplate.bankDetails;
    const rawTplBank = (template.bankDetails || '').trim();
    const isTplDummy = !rawTplBank ||
      rawTplBank.includes('334455667788') ||
      rawTplBank.includes('TEST') ||
      rawTplBank.includes('000405102030') ||
      rawTplBank.includes('000405103000') ||
      rawTplBank.includes('502000492811') ||
      rawTplBank.includes('912010023456') ||
      rawTplBank.includes('SBIN0001234') ||
      rawTplBank.toLowerCase().includes('dummy');

    if (!isTplDummy && rawTplBank.length > 5) return rawTplBank;
    if (tenantRaw?.bank_details) return tenantRaw.bank_details;
    if (tenantSettings?.bank_details) return tenantSettings.bank_details;
    if (tenantRaw?.bank_name && tenantRaw?.account_number) {
      return `Bank: ${tenantRaw.bank_name} | A/C: ${tenantRaw.account_number} | IFSC: ${tenantRaw.ifsc_code || ''} ${tenantRaw.branch_name ? `| Branch: ${tenantRaw.branch_name}` : ''}`;
    }
    return '';
  })();

  const hasRealBank = Boolean((customTemplate?.fields?.showBankDetails ?? f.showBankDetails) && dynamicBank && dynamicBank.length > 5);

  const googleReviewUrl = fetchedReviewUrl || activeBillingGst?.google_review_url || tenantRaw?.google_review_url || tenantSettings?.google_review_url || template?.googleReviewUrl || null;
  const isReviewEnabled = activeBillingGst?.google_review_enabled !== false && tenantRaw?.google_review_enabled !== false && tenantSettings?.google_review_enabled !== false;
  const showGoogleReview = Boolean(googleReviewUrl && isReviewEnabled);

  // 1. Group / aggregate identical items
  const rawItems = invoice.items || [];
  const items = rawItems.reduce((acc: typeof rawItems, item) => {
    const pId = item.product_id || "";
    const pName = (item.product_name || "").trim().toLowerCase();
    const price = Number(item.unit_price || 0);
    const tax = Number(item.tax_rate || 0);

    const existing = acc.find(
      (x) =>
        (pId && x.product_id === pId && Number(x.unit_price) === price) ||
        (!pId && (x.product_name || "").trim().toLowerCase() === pName && Number(x.unit_price) === price && Number(x.tax_rate) === tax)
    );

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + Number(item.quantity || 0);
      existing.discount_value = Number(existing.discount_value || 0) + Number(item.discount_value || 0);
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, []);

  // 2. GST State Detection
  const billingAddr = invoice.customerBillingAddress || invoice.customerAddress || invoice.billing_address || '';
  const shippingAddr = invoice.customerShippingAddress || invoice.shipping_address || billingAddr;

  const customerState = extractGstState(
    invoice.customerGST,
    shippingAddr || billingAddr,
    invoice.customerState || invoice.shipping_state || invoice.billing_state
  );

  const isInterState = Boolean(
    invoice.gst_type === 'igst' ||
    invoice.is_interstate === true ||
    (sellerState.code && customerState.code && sellerState.code !== customerState.code)
  );

  // 3. Tax & GST Breakdown Calculation
  const gstBreakdown = computeGstBreakdown(
    items,
    isInterState,
    sellerState,
    customerState
  );

  let calculatedDiscount = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    const discVal = Number(item.discount_value || 0);
    const disc = item.discount_type === 'percent'
      ? (qty * price * discVal / 100)
      : discVal;
    calculatedDiscount += disc;
  });

  const totalTax = Number(
    invoice.tax_amount !== undefined && Number(invoice.tax_amount) > 0
      ? invoice.tax_amount
      : (invoice.cgst_amount || invoice.sgst_amount || invoice.igst_amount
          ? (Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0) + Number(invoice.igst_amount || 0))
          : gstBreakdown.totalTax)
  );

  const taxableSubtotal = Number(
    invoice.taxable_value !== undefined && Number(invoice.taxable_value) > 0
      ? invoice.taxable_value
      : gstBreakdown.totalTaxable
  );

  const grandTotal = Number(invoice.grand_total !== undefined ? invoice.grand_total : (taxableSubtotal + totalTax));
  const totalDiscount = Number(invoice.discount_amount !== undefined ? invoice.discount_amount : calculatedDiscount);

  const dominantTaxRate = gstBreakdown.slabsBreakdown.length > 0 ? gstBreakdown.slabsBreakdown[0].rate : 18;
  const halfTaxRate = dominantTaxRate / 2;

  const cgstAmount = invoice.cgst_amount !== undefined ? Number(invoice.cgst_amount) : gstBreakdown.totalCgst;
  const sgstAmount = invoice.sgst_amount !== undefined ? Number(invoice.sgst_amount) : gstBreakdown.totalSgst;
  const igstAmount = invoice.igst_amount !== undefined ? Number(invoice.igst_amount) : gstBreakdown.totalIgst;

  const handlePrint = () => {
    const container = printContainerRef.current;
    if (typeof window === 'undefined' || !container) {
      window.print();
      return;
    }

    try {
      // Create isolated printing iframe to prevent background/modal overlay blanking
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'A4 Invoice Print Frame');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style:not(#thermal-print-style-tag)'))
        .map((el) => el.outerHTML)
        .join('\n');

      const invoiceHtml = container.outerHTML;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${invoice?.invoice_number || 'Tax Invoice'}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
            ${styles}
            <style>
              @page {
                size: A4 portrait !important;
                margin: 4mm 6mm !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                display: block !important;
                visibility: visible !important;
              }
              body > * {
                display: block !important;
                visibility: visible !important;
              }
              #a4-invoice-portal {
                display: block !important;
                visibility: visible !important;
                position: static !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
              }
              #a4-invoice-printable-area {
                display: block !important;
                visibility: visible !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 2mm 4mm !important;
                background: #ffffff !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #a4-invoice-printable-area * {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:hidden, .no-print {
                display: none !important;
                visibility: hidden !important;
              }
              .grid { display: grid !important; }
              .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .grid-cols-3 { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              .grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
              .grid-cols-12 { display: grid !important; grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
              .col-span-7 { grid-column: span 7 / span 7 !important; }
              .col-span-5 { grid-column: span 5 / span 5 !important; }
              .flex { display: flex !important; }
              .border-l { border-left-width: 1px !important; }
            </style>
          </head>
          <body>
            <div id="a4-invoice-portal">
              ${invoiceHtml}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Iframe print error, falling back to window.print:", e);
          document.body.classList.add('printing-a4-invoice');
          window.print();
          setTimeout(() => document.body.classList.remove('printing-a4-invoice'), 1500);
        } finally {
          setTimeout(() => {
            try {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            } catch {}
          }, 3000);
        }
      }, 450);
    } catch (e) {
      console.warn("Iframe initialization failed, using standard window.print:", e);
      document.body.classList.add('printing-a4-invoice');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-a4-invoice'), 1500);
    }
  };

  const modalJSX = (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait !important; margin: 6mm 8mm 6mm 8mm !important; }
          html, body { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #000000 !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body > *:not(#a4-invoice-portal), #root, header, nav, footer, .no-print, [data-no-print] { display: none !important; visibility: hidden !important; }
          #a4-invoice-portal { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #000000 !important; overflow: visible !important; }
          #a4-invoice-portal > div { display: block !important; position: static !important; width: 100% !important; max-width: none !important; max-height: none !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
          #a4-invoice-portal .print\\:hidden { display: none !important; visibility: hidden !important; }
          #a4-invoice-printable-area { display: block !important; visibility: visible !important; position: static !important; width: 100% !important; max-width: 100% !important; height: auto !important; margin: 0 !important; padding: 4mm 6mm !important; background: #ffffff !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; page-break-inside: avoid !important; break-inside: avoid !important; }
          #a4-invoice-printable-area * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .grid { display: grid !important; }
          .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .grid-cols-3 { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .grid-cols-12 { display: grid !important; grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
          .col-span-7 { grid-column: span 7 / span 7 !important; }
          .col-span-5 { grid-column: span 5 / span 5 !important; }
          .flex { display: flex !important; }
          .border-l { border-left-width: 1px !important; }
        }
      `}</style>

      <div
        id="a4-invoice-portal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:static print:inset-auto print:p-0 print:m-0 print:w-full print:h-auto print:overflow-visible print:bg-white print:backdrop-blur-none"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:static print:w-full print:max-w-none print:max-h-none print:h-auto print:overflow-visible print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:bg-white">
          
          <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Tax Invoice Preview (A4 Format)
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {dynamicStoreName}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                                 <select
                    value={selectedTemplateId || template.id}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="bg-slate-800 text-blue-300 border border-slate-700 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {(() => {
                      const list = [...availableTemplates];
                      BUILTIN_INVOICE_OPTIONS.forEach((def) => {
                        if (!list.some((t) => t.id === def.id)) {
                          list.push(def as any);
                        }
                      });
                      return list.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isDefault ? '(Org Default)' : ''}
                        </option>
                      ));
                    })()}
                  </select>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                title="Open system print dialog to Save as PDF or print to physical A4 printer"
              >
                <Printer className="w-4 h-4" /> Save as PDF / Print
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 print:static print:w-full print:h-auto print:overflow-visible print:bg-white print:p-0 print:m-0">
            <div
              id="a4-invoice-printable-area"
              ref={printContainerRef}
              className={`mx-auto bg-white ${
                isCustomReplica ? 'p-1 md:p-2 max-w-4xl' : 'p-6 md:p-8 max-w-3xl space-y-4 shadow-md rounded-xl'
              } text-slate-900 text-xs print:static print:w-full print:max-w-none print:shadow-none print:rounded-none print:border-none print:p-0 print:m-0 ${
                !isCustomReplica && isTally ? 'border-2 border-double border-slate-900' : !isCustomReplica ? 'border border-slate-200' : ''
              }`}
              style={{
                fontFamily: fontFamily,
                backgroundColor: template.paperBgColor || '#ffffff',
                borderTop: !isCustomReplica && (isStylish || isCultureUp || isCultureGod) ? `6px solid ${primaryColor}` : undefined,
              }}
            >
              {isMargPharma ? (
                <MargPharmaTemplate
                  invoice={invoice}
                  dynamicStoreName={dynamicStoreName}
                  dynamicLogoUrl={dynamicLogoUrl}
                  dynamicAddress={dynamicAddress}
                  dynamicPhone={dynamicPhone}
                  dynamicEmail={dynamicEmail}
                  sellerGstin={sellerGstin}
                  sellerStateCode={sellerStateCode}
                  currency={currency}
                  f={f}
                />
              ) : isFmcg ? (
                <FmcgDistributorTemplate
                  invoice={invoice}
                  dynamicStoreName={dynamicStoreName}
                  dynamicLogoUrl={dynamicLogoUrl}
                  dynamicAddress={dynamicAddress}
                  dynamicPhone={dynamicPhone}
                  dynamicEmail={dynamicEmail}
                  sellerGstin={sellerGstin}
                  sellerStateCode={sellerStateCode}
                  currency={currency}
                  f={f}
                />
              ) : isParle ? (
                <ParleDistributorTemplate
                  invoice={invoice}
                  dynamicStoreName={dynamicStoreName}
                  dynamicLogoUrl={dynamicLogoUrl}
                  dynamicAddress={dynamicAddress}
                  dynamicPhone={dynamicPhone}
                  dynamicEmail={dynamicEmail}
                  sellerGstin={sellerGstin}
                  sellerStateCode={sellerStateCode}
                  currency={currency}
                  f={f}
                />
              ) : isAgriSeeds ? (
                <AgriSeedsTemplate
                  invoice={invoice}
                  dynamicStoreName={dynamicStoreName}
                  dynamicLogoUrl={dynamicLogoUrl}
                  dynamicAddress={dynamicAddress}
                  dynamicPhone={dynamicPhone}
                  dynamicEmail={dynamicEmail}
                  sellerGstin={sellerGstin}
                  sellerStateCode={sellerStateCode}
                  dynamicBank={dynamicBank}
                  currency={currency}
                  f={f}
                />
              ) : (
                <>
                  {(isCultureGod || isCultureUp) && (
                    <div className="text-center text-[11px] font-bold tracking-widest text-amber-800 bg-amber-50 py-1 rounded-md border border-amber-200 mb-1">
                      {isCultureGod ? '॥ श्री गणेशाय नमः ॥ शुभ लाभ ॥' : '॥ गंगा मैया की जय ॥ उत्तर प्रदेश शासन स्वीकृत ॥'}
                    </div>
                  )}

                  <div
                    className={`flex items-start justify-between border-b pb-4 z-10 relative ${
                      isTally ? 'border-slate-900 border-b-2' : 'border-slate-200'
                    }`}
                    style={(!isTally && !isSimple && !isModern) ? { borderBottom: `2px solid ${primaryColor}` } : {}}
                  >
                    <div className="space-y-1 max-w-[60%]">
                      {f.showLogo && (
                        <div className="flex items-center gap-3 mb-1.5">
                          <img
                            src={dynamicLogoUrl || "/lazymonkey-logo.png"}
                            alt="Organization Logo"
                            className="h-11 max-w-[150px] object-contain rounded-lg shadow-2xs"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/logo.png";
                            }}
                          />
                          <div>
                            <h2 className="font-extrabold text-base text-slate-900 leading-tight">
                              {dynamicStoreName}
                            </h2>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Authorized Business Organization
                            </span>
                          </div>
                        </div>
                      )}

                      {!f.showLogo && (
                        <h2 className="font-extrabold text-lg mb-1" style={{ color: primaryColor }}>
                          {dynamicStoreName}
                        </h2>
                      )}

                      {dynamicAddress && (
                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                          {dynamicAddress}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600 font-medium">
                        {dynamicPhone && <span>Ph: {dynamicPhone}</span>}
                        {dynamicEmail && <span>Email: {dynamicEmail}</span>}
                      </div>
                      {sellerGstin && (
                        <p className="text-[11px] font-bold text-slate-900">
                          GSTIN: {sellerGstin}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <h1 className="text-xl font-black tracking-tight uppercase" style={{ color: primaryColor }}>
                        {template.headerTitle || 'TAX INVOICE'}
                      </h1>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 inline-block text-right mt-0.5">
                        <p className="text-xs font-bold text-slate-900">Invoice No: {invoice.invoice_number || '#INV'}</p>
                        <p className="text-[11px] text-slate-600 font-medium">Date: {formatDisplayDate(invoice.invoice_date || invoice.created_at || new Date())}</p>
                        {invoice.eway_bill_number && (
                          <div className="mt-1 px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-[10px] font-mono font-bold text-right">
                            <span className="font-sans font-extrabold uppercase text-[9px] text-emerald-950">e-Way Bill: </span>
                            {invoice.eway_bill_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {f.showCustomerDetails && (() => {
                    const billingAddr = invoice.customerBillingAddress || invoice.customerAddress || invoice.billing_address || '';
                    const shippingAddr = invoice.customerShippingAddress || invoice.shipping_address || billingAddr;

                    return (
                      <div className="space-y-2 z-10 relative">
                        <div
                          className={`grid grid-cols-3 gap-3 p-3 rounded-xl border ${
                            isModern ? 'bg-slate-50 border-slate-200' :
                            isLuxury ? 'bg-amber-50/40 border-amber-200' :
                            isTally ? 'bg-white border-slate-900' : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          {/* 1. Billed To Column */}
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Billed To (Customer Details)</span>
                            <h4 className="font-bold text-slate-900 text-xs">{invoice.customerName || 'Walk-in Customer'}</h4>
                            {invoice.customerCompany && <p className="text-[10px] font-semibold text-slate-700">{invoice.customerCompany}</p>}
                            {billingAddr ? (
                              <p className="text-[10px] text-slate-600 leading-tight">{billingAddr}</p>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">No billing address specified</p>
                            )}
                            {invoice.customerPhone && <p className="text-[10px] text-slate-600">Ph: {invoice.customerPhone}</p>}
                            {invoice.customerEmail && <p className="text-[10px] text-slate-600">Email: {invoice.customerEmail}</p>}
                            {invoice.customerGST && <p className="text-[10px] font-bold text-slate-800">GSTIN: {invoice.customerGST}</p>}
                          </div>

                          {/* 2. Shipped To Column (Always clearly displayed) */}
                          <div className="space-y-0.5 border-l border-slate-200 pl-3">
                            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block flex items-center gap-1">
                              Shipped To (Delivery Destination)
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs">{invoice.customerCompany || invoice.customerName || 'Consignee / Recipient'}</h4>
                            {shippingAddr ? (
                              <p className="text-[10px] text-slate-700 font-medium leading-tight">{shippingAddr}</p>
                            ) : (
                              <p className="text-[10px] text-slate-500 leading-tight">Same as Billing Address</p>
                            )}
                            {invoice.customerPhone && <p className="text-[10px] text-slate-600">Contact: {invoice.customerPhone}</p>}
                            {invoice.customerGST && <p className="text-[10px] font-semibold text-slate-700">GSTIN: {invoice.customerGST}</p>}
                          </div>

                          {/* 3. Place of Supply & Payment Mode Column */}
                          <div className="text-right space-y-0.5 flex flex-col justify-between border-l border-slate-200 pl-3">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Place of Supply</span>
                              <p className="text-[10px] font-bold text-slate-800 mt-0.5">
                                {isInterState ? `${customerState.name} (${customerState.code}) - Inter-State` : `${sellerState.name} (${sellerState.code}) - Intra-State`}
                              </p>
                              {(invoice.pricing_mode || invoice.customerType) && (
                                <p className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block border border-indigo-100 mt-0.5">
                                  {invoice.pricing_mode ? `Tier: ${invoice.pricing_mode === "B2B" ? "B2B Contract" : invoice.pricing_mode}` : `Category: ${invoice.customerType}`}
                                  {(invoice.customerGST || (invoice as any).customer_gstin || (invoice as any).customer_gst) ? " • B2B (GST Registered)" : ""}
                                </p>
                              )}
                            </div>
                            {f.showPartyBalance && (
                              <div className="text-[9px] font-bold text-slate-600 bg-white p-1.5 rounded-lg border border-slate-200 inline-block mt-2">
                                Payment Mode: <span className="text-slate-900 font-extrabold">{invoice.payment_method || 'Cash'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dispatch, Transport, PO & E-Way Bill Details Strip */}
                        {(invoice.po_number || invoice.vehicle_number || invoice.driver_phone || invoice.driver_name || invoice.eway_bill_number || invoice.transporter_name) && (
                          <div className="grid grid-cols-4 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-medium">
                            {invoice.po_number && (
                              <div className="space-y-0.5">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Customer PO / Order Ref</span>
                                <span className="font-bold text-slate-800 font-mono text-[11px] block">{invoice.po_number}</span>
                                {invoice.po_date && <span className="text-slate-500 block text-[9px]">PO Date: {formatDisplayDate(invoice.po_date)}</span>}
                              </div>
                            )}
                            {invoice.vehicle_number && (
                              <div className="space-y-0.5">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Number</span>
                                <span className="font-mono font-extrabold text-slate-900 text-[11px] block">{invoice.vehicle_number}</span>
                              </div>
                            )}
                            {(invoice.driver_phone || invoice.driver_name || invoice.transporter_name) && (
                              <div className="space-y-0.5">
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Transport / Driver</span>
                                <span className="text-slate-800 font-bold block truncate">{invoice.transporter_name || invoice.driver_name || "Road Logistics"}</span>
                                {invoice.driver_phone && <span className="text-slate-600 block text-[9px] font-mono">Driver Ph: {invoice.driver_phone}</span>}
                              </div>
                            )}
                            {invoice.eway_bill_number && (
                              <div className="space-y-0.5 bg-emerald-50/80 p-1 rounded-lg border border-emerald-200">
                                <span className="text-[8.5px] font-black text-emerald-800 uppercase tracking-wider block">e-Way Bill No.</span>
                                <span className="font-mono font-black text-emerald-950 text-[11px] block">{invoice.eway_bill_number}</span>
                                {invoice.eway_bill_date && <span className="text-emerald-700 block text-[8.5px]">Generated: {formatDisplayDate(invoice.eway_bill_date)}</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Line Items Table */}
                  <div className="z-10 relative overflow-hidden rounded-xl border border-slate-200">
                    <table className={`w-full border-collapse text-xs ${isTally ? 'border border-slate-900' : ''}`}>
                      <thead>
                        <tr
                          className="text-white text-left font-bold"
                          style={{ backgroundColor: isSimple ? '#1e293b' : primaryColor }}
                        >
                          <th className="py-2 px-3 w-8 text-center">#</th>
                          <th className="py-2 px-3">Item Description</th>
                          {f.showHSN && <th className="py-2 px-3 text-center">HSN/SAC</th>}
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Rate</th>
                          <th className="py-2 px-3 text-right">Discount</th>
                          {f.showTaxSplit && <th className="py-2 px-3 text-right">Tax Rate</th>}
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isTally ? 'divide-slate-900' : 'divide-slate-100'} bg-white`}>
                        {items.map((item, idx) => {
                          const qty = Number(item.quantity || 0);
                          const unitPrice = Number(item.unit_price || 0);
                          const mrpPrice = Number(item.mrp || 0);
                          const discVal = Number(item.discount_value || 0);
                          const taxRate = Number(item.tax_rate || 0);
                          const itemSub = qty * unitPrice;
                          const disc = item.discount_type === 'percent'
                            ? (itemSub * discVal / 100)
                            : discVal;
                          const netAmount = itemSub - disc;

                          return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                              <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900 block">{item.product_name || 'Item'}</span>
                                {mrpPrice > unitPrice && (
                                  <span className="text-[9px] text-slate-500">MRP: {currency.symbol}{mrpPrice.toFixed(2)}</span>
                                )}
                              </td>
                              {f.showHSN && <td className="py-2 px-3 text-center font-mono text-slate-600 text-[10px]">{item.hsn_code || '9988'}</td>}
                              <td className="py-2 px-3 text-center font-extrabold text-slate-800">{qty}</td>
                              <td className="py-2 px-3 text-right font-medium text-slate-700">{currency.symbol}{unitPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                                {disc > 0 ? `-₹${disc.toFixed(2)}` : '—'}
                              </td>
                              {f.showTaxSplit && (
                                <td className="py-2 px-3 text-right text-slate-600 font-medium">
                                  {!isInterState ? (
                                    <div>
                                      <span>{taxRate ? `${taxRate}%` : '0%'}</span>
                                      {taxRate > 0 && <span className="text-[9px] text-slate-400 block font-normal leading-none mt-0.5">({(taxRate/2)}%+{(taxRate/2)}%)</span>}
                                    </div>
                                  ) : (
                                    <div>
                                      <span>{taxRate ? `${taxRate}%` : '0%'}</span>
                                      {taxRate > 0 && <span className="text-[9px] text-indigo-500 block font-normal leading-none mt-0.5">IGST</span>}
                                    </div>
                                  )}
                                </td>
                              )}
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{currency.symbol}{netAmount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* GST Tax Breakdown Table (Standard Statutory Compliance) */}
                  {f.showTaxSplit && gstBreakdown.slabsBreakdown.length > 0 && (
                    <div className="z-10 relative overflow-hidden rounded-xl border border-slate-200 mt-2">
                      <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <span>📊 GST Tax Breakdown (Product & Slab Wise)</span>
                          <span className={`text-[8.5px] px-2 py-0.2 rounded font-black uppercase ${isInterState ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                          </span>
                        </span>
                        <span className="text-[9px] text-slate-600 font-medium">
                          Supply: {isInterState ? `${customerState.name} (${customerState.code})` : `${sellerState.name} (${sellerState.code})`}
                        </span>
                      </div>
                      <table className="w-full border-collapse text-[10.5px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-1.5 px-2.5 text-left">HSN / SAC</th>
                            <th className="py-1.5 px-2.5 text-right">Taxable Value</th>
                            {!isInterState ? (
                              <>
                                <th className="py-1.5 px-2.5 text-right">CGST Rate</th>
                                <th className="py-1.5 px-2.5 text-right">CGST Amount</th>
                                <th className="py-1.5 px-2.5 text-right">SGST Rate</th>
                                <th className="py-1.5 px-2.5 text-right">SGST Amount</th>
                              </>
                            ) : (
                              <>
                                <th className="py-1.5 px-2.5 text-right">IGST Rate</th>
                                <th className="py-1.5 px-2.5 text-right">IGST Amount</th>
                              </>
                            )}
                            <th className="py-1.5 px-2.5 text-right">Total Tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {gstBreakdown.slabsBreakdown.map((slab, sIdx) => {
                            const hsnList = Array.from(new Set(gstBreakdown.itemsBreakdown.filter(it => it.taxRate === slab.rate).map(it => it.hsn).filter(Boolean)));
                            return (
                              <tr key={sIdx} className={sIdx % 2 === 1 ? 'bg-slate-50/40' : ''}>
                                <td className="py-1.5 px-2.5 font-mono text-slate-700 font-semibold">
                                  {hsnList.slice(0, 3).join(', ') || 'GST Slab'}
                                  <span className="text-[9px] text-slate-500 ml-1 font-sans">({slab.rate}%)</span>
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-medium text-slate-800">{currency.symbol}{slab.taxableAmount.toFixed(2)}</td>
                                {!isInterState ? (
                                  <>
                                    <td className="py-1.5 px-2.5 text-right text-slate-600">{slab.cgstRate}%</td>
                                    <td className="py-1.5 px-2.5 text-right font-medium text-slate-800">{currency.symbol}{slab.cgstAmount.toFixed(2)}</td>
                                    <td className="py-1.5 px-2.5 text-right text-slate-600">{slab.sgstRate}%</td>
                                    <td className="py-1.5 px-2.5 text-right font-medium text-slate-800">{currency.symbol}{slab.sgstAmount.toFixed(2)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-1.5 px-2.5 text-right text-slate-600">{slab.igstRate}%</td>
                                    <td className="py-1.5 px-2.5 text-right font-medium text-slate-800">{currency.symbol}{slab.igstAmount.toFixed(2)}</td>
                                  </>
                                )}
                                <td className="py-1.5 px-2.5 text-right font-bold text-slate-900">{currency.symbol}{slab.totalTax.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-100/90 font-black text-slate-900 border-t border-slate-200">
                            <td className="py-1.5 px-2.5">Total</td>
                            <td className="py-1.5 px-2.5 text-right">{currency.symbol}{gstBreakdown.totalTaxable.toFixed(2)}</td>
                            {!isInterState ? (
                              <>
                                <td className="py-1.5 px-2.5 text-right">—</td>
                                <td className="py-1.5 px-2.5 text-right">{currency.symbol}{gstBreakdown.totalCgst.toFixed(2)}</td>
                                <td className="py-1.5 px-2.5 text-right">—</td>
                                <td className="py-1.5 px-2.5 text-right">{currency.symbol}{gstBreakdown.totalSgst.toFixed(2)}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-1.5 px-2.5 text-right">—</td>
                                <td className="py-1.5 px-2.5 text-right">{currency.symbol}{gstBreakdown.totalIgst.toFixed(2)}</td>
                              </>
                            )}
                            <td className="py-1.5 px-2.5 text-right">{currency.symbol}{gstBreakdown.totalTax.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Totals & Bank Details */}
                  <div className="grid grid-cols-12 gap-4 pt-1 z-10 relative">
                    <div className="col-span-7 space-y-3">
                      {hasRealBank && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                            Bank & Wire Transfer Details
                          </span>
                          <p className="text-[10px] text-slate-700 font-mono leading-relaxed whitespace-pre-line">
                            {dynamicBank}
                          </p>
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Terms & Conditions</span>
                        <p className="text-[9px] text-slate-500 whitespace-pre-line leading-relaxed">
                          {invoice?.terms || activeBillingGst?.terms_and_conditions || template.termsText || '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.'}
                        </p>
                      </div>

                      {showGoogleReview && googleReviewUrl && (
                        <div className="flex items-center gap-3 p-2.5 bg-amber-50/70 border border-amber-200/90 rounded-xl print:border-slate-300">
                          <div className="p-1 bg-white border border-amber-200 rounded-lg shrink-0 shadow-2xs">
                            <img
                              src={generateQRCodeSVG(googleReviewUrl, 140)}
                              alt="Google Review QR"
                              className="size-14 object-contain"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-0.5 text-amber-500 text-[10.5px] font-black tracking-widest">
                              ★★★★★
                            </div>
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight block">
                              Loved our service? Rate us on Google!
                            </span>
                            <span className="text-[8.5px] text-slate-600 block leading-tight">
                              Scan with your phone camera to share your 5-star review.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-span-5 bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between font-semibold text-xs">
                        <span>Taxable Subtotal:</span>
                        <span className="text-slate-900">{currency.symbol}{Number(taxableSubtotal || 0).toFixed(2)}</span>
                      </div>

                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold text-xs">
                          <span>Total Savings / Discount:</span>
                          <span>-{currency.symbol}{Number(totalDiscount || 0).toFixed(2)}</span>
                        </div>
                      )}

                      {totalTax > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-200/60">
                          {isInterState ? (
                            gstBreakdown.slabsBreakdown.length > 1 ? (
                              <>
                                {gstBreakdown.slabsBreakdown.filter(s => s.totalTax > 0).map((s, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-600 text-[11px] font-medium">
                                    <span>IGST ({s.rate}%):</span>
                                    <span className="font-bold text-slate-800">{currency.symbol}{Number(s.igstAmount || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-slate-800 text-[11px] font-bold">
                                  <span>Total IGST:</span>
                                  <span>{currency.symbol}{Number(gstBreakdown.totalIgst || 0).toFixed(2)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                                <span>IGST ({gstBreakdown.slabsBreakdown[0]?.rate || dominantTaxRate}%):</span>
                                <span className="font-bold text-slate-800">{currency.symbol}{Number(igstAmount || 0).toFixed(2)}</span>
                              </div>
                            )
                          ) : (
                            gstBreakdown.slabsBreakdown.length > 1 ? (
                              <>
                                <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                                  <span>Central GST (CGST):</span>
                                  <span className="font-bold text-slate-800">{currency.symbol}{Number(gstBreakdown.totalCgst || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                                  <span>State GST (SGST):</span>
                                  <span className="font-bold text-slate-800">{currency.symbol}{Number(gstBreakdown.totalSgst || 0).toFixed(2)}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                                  <span>CGST ({gstBreakdown.slabsBreakdown[0]?.cgstRate || halfTaxRate}%):</span>
                                  <span className="font-bold text-slate-800">{currency.symbol}{Number(cgstAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[11px] font-medium">
                                  <span>SGST ({gstBreakdown.slabsBreakdown[0]?.sgstRate || halfTaxRate}%):</span>
                                  <span className="font-bold text-slate-800">{currency.symbol}{Number(sgstAmount || 0).toFixed(2)}</span>
                                </div>
                              </>
                            )
                          )}
                        </div>
                      )}

                      {/* Additional Charges (Freight, Packing, etc.) */}
                      {(invoice.additional_charges || []).filter(c => Number(c.amount) > 0).map((charge, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                          <span>{charge.name}:</span>
                          <span>+{currency.symbol}{Number(charge.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}

                      {/* Round Off */}
                      {invoice.round_off !== undefined && invoice.round_off !== 0 && (
                        <div className="flex justify-between text-slate-500 italic text-[11px]">
                          <span>Round Off:</span>
                          <span>{Number(invoice.round_off || 0) >= 0 ? '+' : ''}{currency.symbol}{Number(invoice.round_off || 0).toFixed(2)}</span>
                        </div>
                      )}

                      <div
                        className="flex justify-between items-center pt-2 border-t-2 border-slate-300 font-black text-xs text-slate-900"
                        style={{ borderColor: primaryColor }}
                      >
                        <span>GRAND TOTAL:</span>
                        <span className="text-sm font-extrabold" style={{ color: primaryColor }}>
                          {currency.symbol}{Number(grandTotal || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Amount Received & Balance */}
                      {invoice.amount_received !== undefined && Number(invoice.amount_received) > 0 && (
                        <>
                          <div className="flex justify-between text-slate-600 font-semibold pt-0.5 text-[11px]">
                            <span>Amount Received:</span>
                            <span className="text-emerald-700 font-bold">{currency.symbol}{Number(invoice.amount_received).toFixed(2)}</span>
                          </div>
                          {Number(invoice.amount_received) >= grandTotal - 0.05 ? (
                            <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                              <span>Payment Status:</span>
                              <span>PAID ({invoice.payment_method || 'Cash'})</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-red-600 font-bold text-[11px]">
                              <span>Balance Due:</span>
                              <span>{currency.symbol}{Math.max(0, Number(grandTotal || 0) - Number(invoice.amount_received)).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Signature & Footer */}
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-end z-10 relative">
                    <div className="text-[9px] text-slate-500 max-w-[50%]">
                      <p className="font-semibold text-slate-700">{template.footerText || 'Thank you for your business!'}</p>
                      <p className="mt-0.5">Computer generated invoice. No signature required if authorized.</p>
                    </div>

                    {f.showSignature && (
                      <div className="text-center space-y-4">
                        <div className="h-6 border-b border-slate-300 w-36"></div>
                        <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-wider">
                          Authorized Signatory
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );

  return createPortal(modalJSX, document.body);
}

export type FullInvoicePropsWrapper = FullInvoicePrinterProps;
