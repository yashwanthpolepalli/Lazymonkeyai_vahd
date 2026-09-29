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
  currency: { symbol: string; code: string };
  f?: any;
}

export function MargPharmaTemplate({
  invoice,
  dynamicStoreName,
  dynamicLogoUrl,
  dynamicAddress,
  dynamicPhone,
  dynamicEmail,
  sellerGstin,
  sellerStateCode,
  currency,
}: TemplateProps) {
  const items = invoice.items || [];
  const grandTotal = Number(invoice.grand_total || invoice.total_amount || 0);
  const taxableSubtotal = Number(invoice.taxable_value || invoice.subtotal || grandTotal * 0.85);

  // Group Tax Slabs (5%, 12%, 18%, 28%)
  const taxSlabs: Record<number, { taxable: number; cgst: number; sgst: number; totalGst: number }> = {
    5: { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
    12: { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
    18: { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
    28: { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
  };

  let totalItemQty = 0;
  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    totalItemQty += qty;
    const rate = Number(item.tax_rate || (invoice.is_interstate ? (invoice.igst_amount ? 18 : 0) : (invoice.cgst_amount ? 18 : 0)));
    const matchedSlab = [5, 12, 18, 28].find((s) => Math.abs(s - rate) <= 1) || 18;
    const itemSub = Number(item.subtotal || qty * Number(item.unit_price || 0));
    const gstVal = (itemSub * matchedSlab) / 100;

    if (taxSlabs[matchedSlab]) {
      taxSlabs[matchedSlab].taxable += itemSub;
      taxSlabs[matchedSlab].cgst += gstVal / 2;
      taxSlabs[matchedSlab].sgst += gstVal / 2;
      taxSlabs[matchedSlab].totalGst += gstVal;
    }
  });

  // If no items populated slab, fallback to invoice total taxes
  const totalCgst = Number(invoice.cgst_amount || 0);
  const totalSgst = Number(invoice.sgst_amount || 0);
  const totalTax = Number(invoice.tax_amount || totalCgst + totalSgst || (grandTotal - taxableSubtotal));

  if (taxSlabs[18].taxable === 0 && taxableSubtotal > 0) {
    taxSlabs[18].taxable = taxableSubtotal;
    taxSlabs[18].cgst = totalCgst || totalTax / 2;
    taxSlabs[18].sgst = totalSgst || totalTax / 2;
    taxSlabs[18].totalGst = totalTax;
  }

  const sumTaxable = Object.values(taxSlabs).reduce((acc, s) => acc + s.taxable, 0);
  const sumSgst = Object.values(taxSlabs).reduce((acc, s) => acc + s.sgst, 0);
  const sumCgst = Object.values(taxSlabs).reduce((acc, s) => acc + s.cgst, 0);
  const sumTotalGst = Object.values(taxSlabs).reduce((acc, s) => acc + s.totalGst, 0);

  const formattedDate = formatDisplayDate(invoice.invoice_date || invoice.created_at || new Date());

  return (
    <div className="w-full bg-white text-black font-sans text-[11px] leading-tight border-2 border-black selection:bg-none">
      {/* ─── TOP 3-BOX HEADER ─── */}
      <div className="grid grid-cols-12 border-b-2 border-black">
        {/* Left Box: Seller */}
        <div className="col-span-4 p-2.5 border-r-2 border-black flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {dynamicLogoUrl && dynamicLogoUrl !== '/Logo.png' && (
                <img src={dynamicLogoUrl} alt="Logo" className="h-8 max-w-[80px] object-contain" />
              )}
              <h2 className="font-extrabold text-sm uppercase tracking-tight text-blue-900 leading-snug">
                {dynamicStoreName}
              </h2>
            </div>
            {dynamicAddress && <p className="text-[10px] text-gray-800 leading-relaxed">{dynamicAddress}</p>}
            {dynamicPhone && <p className="text-[10px] text-gray-800">Phone: {dynamicPhone}</p>}
          </div>
          <div className="mt-2 pt-1 border-t border-gray-300">
            <p className="font-bold text-[11px] text-black">
              GSTIN : <span className="font-mono">{sellerGstin || '36DYHPR6361D1Z6'}</span>
            </p>
          </div>
        </div>

        {/* Center Box: GST Invoice Meta */}
        <div className="col-span-4 p-1.5 border-r-2 border-black flex flex-col justify-between text-center bg-gray-50/50">
          <div>
            <h1 className="text-base font-black text-blue-900 tracking-wider">GST INVOICE</h1>
            <span className="text-[10px] font-bold text-blue-800 tracking-widest block mb-1">CREDIT</span>
          </div>

          <table className="w-full text-left text-[8px] border border-black border-collapse bg-white font-mono">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-0.5 font-sans font-bold border-r border-black w-18">Invoice No</td>
                <td className="p-0.5 font-bold border-r border-black">{invoice.invoice_number || 'A000002'}</td>
                <td className="p-0.5 font-sans font-bold border-r border-black">Order / PO No.<br />Order Date</td>
                <td className="p-0.5 border-r border-black font-bold">{invoice.po_number || invoice.order_number || '-'}<br />{invoice.po_date ? formatDisplayDate(invoice.po_date) : formattedDate}</td>
                <td className="p-0.5 font-sans font-bold border-r border-black">Cases / Mode</td>
                <td className="p-0.5">{invoice.payment_method || '0'}</td>
              </tr>
              <tr>
                <td className="p-0.5 font-sans font-bold border-r border-black">Invoice Date<br />Due Date</td>
                <td className="p-0.5 border-r border-black">{formattedDate}<br />{formatDisplayDate(invoice.due_date || invoice.invoice_date || new Date())}</td>
                <td className="p-0.5 font-sans font-bold border-r border-black">e-Way Bill / LR<br />Vehicle No</td>
                <td className="p-0.5 border-r border-black font-bold text-[7.5px]">{invoice.eway_bill_number ? `EWB: ${invoice.eway_bill_number}` : '-'}<br />{invoice.vehicle_number || '-'}</td>
                <td className="p-0.5 font-sans font-bold border-r border-black">Transport</td>
                <td className="p-0.5 text-[7.5px] truncate max-w-[70px]">{invoice.transporter_name || invoice.driver_phone || 'Road'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Box: Customer */}
        <div className="col-span-4 p-2.5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold underline block mb-0.5">Party Name :</span>
            <h3 className="font-bold text-xs uppercase text-blue-950">
              {invoice.customerName || invoice.customerCompany || 'CASH CUSTOMER'}
            </h3>
            <p className="text-[10px] text-gray-800 leading-snug mt-0.5">
              <span className="font-bold text-gray-900">Bill To: </span>{invoice.customerBillingAddress || invoice.customerAddress || 'Local Market, Hyderabad'}
            </p>
            <p className="text-[9.5px] text-indigo-900 leading-snug mt-0.5 font-medium">
              <span className="font-bold text-indigo-950">Ship To: </span>{invoice.customerShippingAddress || invoice.customerBillingAddress || invoice.customerAddress || 'Same as Bill To'}
            </p>
            {invoice.customerPhone && (
              <p className="text-[10px] text-gray-800 mt-0.5">
                PHONE. : <span className="font-mono">{invoice.customerPhone}</span>
              </p>
            )}
          </div>
          {invoice.customerGST && (
            <p className="text-[10px] font-bold mt-1">
              PARTY GSTIN : <span className="font-mono">{invoice.customerGST}</span>
            </p>
          )}
        </div>
      </div>

      {/* ─── MARG STYLE ITEM TABLE ─── */}
      <div className="min-h-[220px]">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-200 border-b border-black font-bold text-center">
              <th className="py-1 px-1 border-r border-black w-7">S.</th>
              <th className="py-1 px-1 border-r border-black w-10">Qty.</th>
              <th className="py-1 px-1 border-r border-black w-10">Mfr</th>
              <th className="py-1 px-1 border-r border-black w-12">Pack</th>
              <th className="py-1 px-2 border-r border-black text-left">Product Name</th>
              <th className="py-1 px-1 border-r border-black w-14">HSN</th>
              <th className="py-1 px-1 border-r border-black w-14 text-right">M.R.P</th>
              <th className="py-1 px-1 border-r border-black w-14 text-right">Rate</th>
              <th className="py-1 px-1 border-r border-black w-10 text-right">Dis%</th>
              <th className="py-1 px-1 border-r border-black w-10 text-right">SGST%</th>
              <th className="py-1 px-1 border-r border-black w-14 text-right">Value</th>
              <th className="py-1 px-1 border-r border-black w-10 text-right">CGST%</th>
              <th className="py-1 px-1 border-r border-black w-14 text-right">Value</th>
              <th className="py-1 px-2 text-right w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-mono">
            {items.map((item, idx) => {
              const qty = Number(item.quantity || 1);
              const rate = Number(item.unit_price || 0);
              const mrp = Number(item.mrp || rate * 1.1);
              const disc = Number(item.discount_value || 0);
              const taxRate = Number(item.tax_rate || 18);
              const halfTax = taxRate / 2;
              const taxable = qty * rate - disc;
              const taxVal = (taxable * halfTax) / 100;
              const lineTotal = taxable + taxVal * 2;

              return (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-1 text-center border-r border-black font-sans">{idx + 1}.</td>
                  <td className="p-1 text-center font-bold border-r border-black">{qty}</td>
                  <td className="p-1 text-center border-r border-black font-sans">—</td>
                  <td className="p-1 text-center border-r border-black font-sans">1*1</td>
                  <td className="p-1 border-r border-black font-sans font-bold text-left">{item.product_name || 'Goods'}</td>
                  <td className="p-1 text-center border-r border-black">{item.hsn_code || '123456'}</td>
                  <td className="p-1 text-right border-r border-black">{mrp.toFixed(2)}</td>
                  <td className="p-1 text-right border-r border-black">{rate.toFixed(2)}</td>
                  <td className="p-1 text-right border-r border-black">{disc > 0 ? disc.toFixed(2) : '0.00'}</td>
                  <td className="p-1 text-right border-r border-black">{halfTax.toFixed(2)}</td>
                  <td className="p-1 text-right border-r border-black">{taxVal.toFixed(2)}</td>
                  <td className="p-1 text-right border-r border-black">{halfTax.toFixed(2)}</td>
                  <td className="p-1 text-right border-r border-black">{taxVal.toFixed(2)}</td>
                  <td className="p-1 text-right font-bold">{lineTotal.toFixed(2)}</td>
                </tr>
              );
            })}
            {/* Blank filler rows to maintain vertical MARG ledger columns */}
            {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
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
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── BOTTOM TAX SLAB MATRIX & TOTALS ─── */}
      <div className="grid grid-cols-12 border-t-2 border-black">
        {/* Left Side: Tax Matrix */}
        <div className="col-span-8 p-1.5 border-r-2 border-black flex flex-col justify-between">
          <table className="w-full border border-black border-collapse text-[9px] font-mono text-center">
            <thead>
              <tr className="bg-gray-200 border-b border-black font-bold font-sans">
                <th className="p-0.5 border-r border-black">CLASS</th>
                <th className="p-0.5 border-r border-black">TOTAL</th>
                <th className="p-0.5 border-r border-black">SCHEME</th>
                <th className="p-0.5 border-r border-black">DISCOUNT</th>
                <th className="p-0.5 border-r border-black">SGST</th>
                <th className="p-0.5 border-r border-black">CGST</th>
                <th className="p-0.5">TOTAL GST</th>
              </tr>
            </thead>
            <tbody>
              {[5, 12, 18, 28].map((s) => (
                <tr key={s} className="border-b border-gray-200">
                  <td className="p-0.5 border-r border-black font-sans font-bold">GST {s}.00 %</td>
                  <td className="p-0.5 border-r border-black text-right">{taxSlabs[s].taxable.toFixed(2)}</td>
                  <td className="p-0.5 border-r border-black">0.00</td>
                  <td className="p-0.5 border-r border-black">0.00</td>
                  <td className="p-0.5 border-r border-black text-right">{taxSlabs[s].sgst.toFixed(2)}</td>
                  <td className="p-0.5 border-r border-black text-right">{taxSlabs[s].cgst.toFixed(2)}</td>
                  <td className="p-0.5 text-right font-bold">{taxSlabs[s].totalGst.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold border-t border-black">
                <td className="p-0.5 border-r border-black font-sans">TOTAL</td>
                <td className="p-0.5 border-r border-black text-right">{sumTaxable.toFixed(2)}</td>
                <td className="p-0.5 border-r border-black">0.00</td>
                <td className="p-0.5 border-r border-black">0.00</td>
                <td className="p-0.5 border-r border-black text-right">{sumSgst.toFixed(2)}</td>
                <td className="p-0.5 border-r border-black text-right">{sumCgst.toFixed(2)}</td>
                <td className="p-0.5 text-right">{sumTotalGst.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-2 text-[10px]">
            <p className="font-bold text-blue-950 font-sans">{numberToIndianWords(grandTotal)}</p>
            <p className="text-[9px] text-gray-600 uppercase font-sans mt-0.5">MSG: THANKS CUSTOMER</p>
          </div>
        </div>

        {/* Right Side: Calculation Totals Box */}
        <div className="col-span-4 p-2 flex flex-col justify-between bg-gray-50/40">
          <div className="space-y-1 text-[10px] font-mono">
            <div className="flex justify-between border-b border-gray-300 pb-0.5 font-sans">
              <span>Total Items :- <b className="font-mono">{items.length || 1}</b></span>
              <span>Total Qty :- <b className="font-mono">{totalItemQty || 1}</b></span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">TOTAL</span>
              <span className="font-bold">{taxableSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">DIS AMT.</span>
              <span>0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">SGST PAYABLE</span>
              <span>{(totalSgst || sumSgst).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">CGST PAYABLE</span>
              <span>{(totalCgst || sumCgst).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">CR/DR NOTE</span>
              <span>0.00</span>
            </div>
          </div>

          <div className="mt-2 p-1.5 bg-gray-200 border-2 border-black rounded text-center">
            <span className="text-[10px] font-black font-sans uppercase block tracking-wider">Grand Total</span>
            <span className="text-base font-black font-mono tracking-tight text-blue-950">
              {currency.symbol}{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── FOOTER TERMS & SIGNATURE ─── */}
      <div className="grid grid-cols-12 border-t-2 border-black p-2 bg-white">
        <div className="col-span-7 border-r border-gray-300 pr-2 space-y-0.5 text-[9px] text-gray-700">
          <span className="font-bold underline text-black">Terms & Conditions</span>
          <p>1. Goods once sold will not be taken back or exchanged.</p>
          <p>2. All disputes subject to local Jurisdiction only.</p>
          <p>3. Bills not paid due date will attract 24% interest.</p>
        </div>
        <div className="col-span-5 pl-3 flex flex-col justify-between text-right">
          <span className="text-[10px] font-bold uppercase text-gray-900">
            FOR {dynamicStoreName}
          </span>
          <div className="pt-6">
            <span className="text-[9px] font-bold text-gray-800 border-t border-black pt-0.5 inline-block">
              Authorised Signatory
            </span>
          </div>
        </div>
      </div>
      <div className="text-center text-[8px] text-gray-700 py-0.5 border-t border-black bg-gray-50 font-mono">
        Our Software MARG Erp +911166969600, +911130969600
      </div>
    </div>
  );
}
