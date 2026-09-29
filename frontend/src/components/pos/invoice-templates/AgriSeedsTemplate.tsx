import React from 'react';
import { FullInvoiceData } from '../FullInvoicePrinter';
import { numberToIndianWords } from '@/lib/number-to-words';
import { formatDisplayDate } from '@/lib/utils';

interface TemplateProps {
  invoice: FullInvoiceData;
  dynamicStoreName: string;
  dynamicLogoUrl: string;
  dynamicAddress: string;
  dynamicPhone: string;
  dynamicEmail: string;
  sellerGstin: string;
  sellerStateCode: string;
  dynamicBank: string;
  currency: { symbol: string; code: string };
  f?: any;
}

export function AgriSeedsTemplate({
  invoice,
  dynamicStoreName,
  dynamicLogoUrl,
  dynamicAddress,
  dynamicPhone,
  sellerGstin,
  sellerStateCode,
  dynamicBank,
  currency,
}: TemplateProps) {
  const items = invoice.items || [];
  const grandTotal = Number(invoice.grand_total || invoice.total_amount || 0);
  const taxableSubtotal = Number(invoice.taxable_value || invoice.subtotal || grandTotal * 0.95);
  const totalTax = Number(invoice.tax_amount || (invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) || (grandTotal - taxableSubtotal));

  const formattedDate = formatDisplayDate(invoice.invoice_date || invoice.created_at || new Date());

  return (
    <div className="w-full bg-white text-black font-sans text-[10px] leading-tight border-2 border-black selection:bg-none p-1 relative">
      {/* ─── TOP STATUTORY PERMIT HEADER ─── */}
      <div className="grid grid-cols-12 border-b-2 border-black pb-1 mb-1 items-center">
        {/* Left Statutory Licences */}
        <div className="col-span-3 text-[8px] font-mono space-y-0.5">
          <p className="font-bold">GSTIN : <span className="font-extrabold">{sellerGstin || '36AZBPP8500G1ZG'}</span></p>
          <p>SEED.LIC.No. : ADB/03/JDA/SD/2016/8353</p>
          <p>PL NO. 2417/2013</p>
        </div>

        {/* Center Brand Identity with Circular Logo */}
        <div className="col-span-6 text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-3">
            <div className="size-10 rounded-full border-2 border-red-700 overflow-hidden flex items-center justify-center bg-amber-50 shrink-0">
              {dynamicLogoUrl && dynamicLogoUrl !== '/Logo.png' ? (
                <img src={dynamicLogoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-bold text-red-700">🌱</span>
              )}
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-wide text-red-800 leading-tight">
                {dynamicStoreName || 'SAI BABA AGENCY'}
              </h1>
              <span className="text-[9px] font-extrabold text-teal-800 block uppercase tracking-wider">
                DEALERS IN SEEDS AND PESTICIDES
              </span>
            </div>
          </div>
          <p className="text-[9px] text-gray-700 mt-1 leading-snug">
            {dynamicAddress || 'Door No. 1-2-15/L, Shanti Nagar, Adilabad - 504001 (T.S)'}
          </p>
          {dynamicPhone && <p className="text-[8px] text-gray-800">Phone : <span className="font-mono font-bold">{dynamicPhone}</span></p>}
        </div>

        {/* Right QR & Invoice Title */}
        <div className="col-span-3 text-right flex flex-col justify-between h-full">
          <div>
            <h2 className="font-black text-xs text-gray-900 tracking-wider">GST INVOICE</h2>
            <span className="text-[9px] font-bold text-gray-600">(CREDIT)</span>
          </div>
          <div className="size-8 border border-black ml-auto mt-1 grid place-items-center bg-gray-50 text-[7px] font-mono">
            QR CODE
          </div>
        </div>
      </div>

      {/* ─── CUSTOMER DETAILS & INVOICE META ─── */}
      <div className="grid grid-cols-12 border-b-2 border-black py-1 px-1 text-[9px] leading-snug bg-gray-50/40">
        <div className="col-span-7 space-y-0.5">
          <p className="font-bold">BUYER (BILL TO) : <span className="font-extrabold uppercase">{invoice.customerName || 'Customer'}</span></p>
          <p><span className="font-bold">BILL TO (ADDRESS) : </span>{invoice.customerBillingAddress || invoice.customerAddress || 'Adilabad'}</p>
          <p className="text-emerald-950 font-bold"><span className="text-gray-900 font-bold">SHIP TO (DELIVERY) : </span>{invoice.customerShippingAddress || invoice.customerBillingAddress || invoice.customerAddress || 'Same as Bill To'}</p>
          <p className="font-mono font-bold">GSTIN : {invoice.customerGST || 'UNREGISTERED'}</p>
        </div>

        <div className="col-span-5 text-right font-mono space-y-0.5">
          <p><span className="font-sans font-bold">Date : </span>{formattedDate}</p>
          <p><span className="font-sans font-bold">Invoice No. : </span><b className="font-black">{invoice.invoice_number || 'ALL000001'}</b></p>
          {invoice.po_number && <p><span className="font-sans font-bold">PO / Order Ref : </span><b>{invoice.po_number}</b></p>}
          {invoice.vehicle_number && <p><span className="font-sans font-bold">Vehicle No : </span><b>{invoice.vehicle_number}</b></p>}
          {invoice.eway_bill_number && <p className="text-emerald-800 font-bold"><span className="font-sans">e-Way Bill : </span>{invoice.eway_bill_number}</p>}
        </div>
      </div>

      {/* ─── AGRICULTURE / SEEDS ITEMS TABLE WITH WATERMARK ─── */}
      <div className="min-h-[260px] relative">
        {/* Subtle Agricultural Watermark Artwork in Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <div className="text-center font-black text-5xl uppercase tracking-widest text-emerald-950 rotate-[-12deg]">
            🌾 {dynamicStoreName} 🌾
          </div>
        </div>

        <table className="w-full border-collapse text-[9px] font-mono relative z-10">
          <thead>
            <tr className="bg-gray-100 border-b border-black font-sans font-bold text-center">
              <th className="py-1 px-1 border-r border-black w-6">Sn.</th>
              <th className="py-1 px-2 border-r border-black text-left">Particulars</th>
              <th className="py-1 px-1 border-r border-black w-12">Kgs/Ltrs</th>
              <th className="py-1 px-1 border-r border-black w-14">Crop</th>
              <th className="py-1 px-1 border-r border-black w-14">HSN</th>
              <th className="py-1 px-1 border-r border-black w-14">Lot/Batch</th>
              <th className="py-1 px-1 border-r border-black w-10">Mfg.</th>
              <th className="py-1 px-1 border-r border-black w-10">Exp</th>
              <th className="py-1 px-1 border-r border-black w-14">Cases/Bags</th>
              <th className="py-1 px-1 border-r border-black w-10">Qty</th>
              <th className="py-1 px-1 border-r border-black w-14 text-right">Rate</th>
              <th className="py-1 px-2 text-right w-16">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = Number(it.quantity || 1);
              const rate = Number(it.unit_price || 0);
              const lineAmount = qty * rate;

              return (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1 px-1 text-center border-r border-black font-sans">{idx + 1}.</td>
                  <td className="py-1 px-2 font-sans font-bold border-r border-black text-left">{it.product_name || 'RAGHAVA 459'}</td>
                  <td className="py-1 px-1 text-center border-r border-black">1000 LT</td>
                  <td className="py-1 px-1 text-center border-r border-black font-sans">JOWAR</td>
                  <td className="py-1 px-1 text-center border-r border-black">{it.hsn_code || '3103900'}</td>
                  <td className="py-1 px-1 text-center border-r border-black">25415</td>
                  <td className="py-1 px-1 text-center border-r border-black">10/22</td>
                  <td className="py-1 px-1 text-center border-r border-black">5/25</td>
                  <td className="py-1 px-1 text-center border-r border-black">{qty}</td>
                  <td className="py-1 px-1 text-center font-bold border-r border-black">{qty}</td>
                  <td className="py-1 px-1 text-right border-r border-black">{rate.toFixed(2)}</td>
                  <td className="py-1 px-2 text-right font-bold">{lineAmount.toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Fillers to give full height */}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <tr key={`fill-${i}`} className="h-6 border-b border-gray-100">
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── BOTTOM TOTALS & TAX ─── */}
      <div className="border-t-2 border-black grid grid-cols-12 py-1 px-1">
        <div className="col-span-7 font-bold text-[9px] space-y-1">
          <p>{numberToIndianWords(grandTotal)}</p>
        </div>
        <div className="col-span-5 font-mono text-[9px] text-right space-y-0.5">
          <div className="flex justify-between"><span className="font-sans font-bold">SUB TOTAL :</span><span>{taxableSubtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="font-sans font-bold">GST / TAX :</span><span>{totalTax.toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-black pt-0.5 text-[10px] font-black">
            <span className="font-sans">GRAND TOTAL :</span>
            <span>{currency.symbol}{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ─── TERMS, BANK DETAILS & SIGNATURES ─── */}
      <div className="border-t-2 border-black grid grid-cols-12 p-1 text-[8px] gap-2">
        <div className="col-span-7 space-y-1 text-gray-700">
          <div>
            <span className="font-bold underline text-black">Terms & Conditions :</span>
            <p>1) All disputes subject to local Jurisdiction only.</p>
            <p>2) Goods once sold will not be taken back or exchanged.</p>
          </div>
          <div className="pt-1">
            <span className="font-bold text-black">Bank Details :</span>
            <p className="font-mono">{dynamicBank || `SAI BABA AGENCY, A/C NO. : 4812201000012\nI.F.S.C : CNRB0004812, CANARA BANK`}</p>
          </div>
        </div>

        <div className="col-span-5 flex flex-col justify-between text-right">
          <span className="font-bold uppercase text-black font-sans">
            For : {dynamicStoreName}
          </span>
          <div className="flex justify-between items-end pt-8">
            <span className="border-t border-black pt-0.5 inline-block text-[7px] font-bold text-center">Customer signatory</span>
            <span className="border-t border-black pt-0.5 inline-block text-[7px] font-bold text-center">Authorised signatory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
