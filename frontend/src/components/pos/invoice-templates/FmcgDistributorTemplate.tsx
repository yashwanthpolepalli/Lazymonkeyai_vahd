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

export function FmcgDistributorTemplate({
  invoice,
  dynamicStoreName,
  dynamicLogoUrl,
  dynamicAddress,
  dynamicPhone,
  sellerGstin,
  sellerStateCode,
  currency,
}: TemplateProps) {
  const items = invoice.items || [];
  const grandTotal = Number(invoice.grand_total || invoice.total_amount || 0);
  const taxableSubtotal = Number(invoice.taxable_value || invoice.subtotal || grandTotal * 0.85);
  const totalTax = Number(invoice.tax_amount || (invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) || (grandTotal - taxableSubtotal));
  const totalCgst = Number(invoice.cgst_amount || totalTax / 2);
  const totalSgst = Number(invoice.sgst_amount || totalTax / 2);

  const formattedDate = formatDisplayDate(invoice.invoice_date || invoice.created_at || new Date());
  const panNumber = sellerGstin && sellerGstin.length >= 12 ? sellerGstin.slice(2, 12) : 'AAOFM2891F';

  return (
    <div className="w-full bg-white text-black font-sans text-[10px] leading-tight border-2 border-black selection:bg-none p-1">
      {/* ─── TOP TITLE BAR ─── */}
      <div className="flex justify-between items-center text-[9px] font-bold border-b border-black pb-0.5 mb-1 px-1">
        <span>Original/Duplicate/Triplicate</span>
        <span className="text-xs font-black tracking-wider uppercase">TAX INVOICE</span>
        <span>Page No: 1 of 1</span>
      </div>

      {/* ─── COMPANY PROFILE HEADER ─── */}
      <div className="grid grid-cols-12 gap-2 border-b border-black pb-1 px-1">
        <div className="col-span-7">
          <div className="flex items-center gap-2">
            {dynamicLogoUrl && dynamicLogoUrl !== '/Logo.png' && (
              <img src={dynamicLogoUrl} alt="Logo" className="h-7 max-w-[70px] object-contain" />
            )}
            <h1 className="font-extrabold text-xs uppercase tracking-tight text-slate-900">
              {dynamicStoreName}
            </h1>
          </div>
          <p className="text-[9px] text-gray-700 leading-snug mt-0.5">
            {dynamicAddress || 'PLOT NO - N-2, INDUSTRIAL ESTATE, State : 29-Karnataka'}
          </p>
          <p className="text-[9px] text-gray-700">CIN: U74999KA2026PTC123456</p>
        </div>

        <div className="col-span-5 text-right font-mono text-[9px] space-y-0.5">
          <p className="font-bold">GSTIN: <span className="font-extrabold">{sellerGstin || '29AAOFM2891F1ZT'}</span></p>
          {dynamicPhone && <p>Phone: {dynamicPhone}</p>}
          <p>PAN: <span className="font-bold">{panNumber}</span></p>
        </div>
      </div>

      {/* ─── META BAR ─── */}
      <div className="grid grid-cols-5 border-b border-black text-[9px] font-mono py-1 px-1 bg-gray-50/50">
        <div><span className="font-sans font-bold">Invoice No. : </span>{invoice.invoice_number || 'B/26-27/010451'}</div>
        <div><span className="font-sans font-bold">Invoice Date: </span>{formattedDate}</div>
        <div><span className="font-sans font-bold">PO / Order Ref: </span>{invoice.po_number || invoice.order_number || 'DMS'}</div>
        <div><span className="font-sans font-bold">Pymt Mode: </span>{invoice.payment_method || 'Cash'}</div>
        <div><span className="font-sans font-bold">e-Way Bill: </span>{invoice.eway_bill_number || 'NA'}</div>
      </div>

      {/* ─── BILLED TO / SHIPPED TO DUAL COLUMNS ─── */}
      <div className="grid grid-cols-2 border-b border-black text-[9px] leading-snug">
        <div className="p-1 border-r border-black space-y-0.5">
          <p className="font-bold font-sans">Billed To : <span className="font-mono">{invoice.customerName || 'Customer'}</span></p>
          <p>Address : {invoice.customerBillingAddress || invoice.customerAddress || 'Local Address'}</p>
          <p className="font-mono font-bold">GSTIN : {invoice.customerGST || 'UNREGISTERED'}</p>
          <div className="grid grid-cols-2 text-[8px] pt-0.5">
            <p>State : {sellerStateCode}-Telangana</p>
            <p>PO Date : {invoice.po_date ? formatDisplayDate(invoice.po_date) : formattedDate}</p>
            <p>Vehicle : {invoice.vehicle_number || '-'}</p>
            <p>Cust Contact: {invoice.customerPhone || '-'}</p>
          </div>
        </div>

        <div className="p-1 space-y-0.5">
          <p className="font-bold font-sans">Shipped To : <span className="font-mono">{invoice.customerCompany || invoice.customerName || 'Customer'}</span></p>
          <p>Address : {invoice.customerShippingAddress || invoice.customerBillingAddress || invoice.customerAddress || 'Delivery Address'}</p>
          <p className="font-mono font-bold">GSTIN : {invoice.customerGST || 'UNREGISTERED'}</p>
          <div className="grid grid-cols-2 text-[8px] pt-0.5">
            <p>Driver / Transport : {invoice.transporter_name || invoice.driver_phone || '-'}</p>
            <p>e-Way Bill No : {invoice.eway_bill_number || '-'}</p>
            <p>Due Date : {formatDisplayDate(invoice.due_date || invoice.invoice_date || new Date())}</p>
            <p>Ack. Date : {formattedDate}</p>
          </div>
        </div>
      </div>

      {/* ─── MULTI-ROW FMCG ITEM TABLE ─── */}
      <div className="min-h-[220px]">
        <table className="w-full border-collapse text-[8px] font-mono">
          <thead>
            <tr className="border-b border-black font-sans font-bold text-center bg-gray-100">
              <th className="p-0.5 border-r border-black w-5" rowSpan={2}>#</th>
              <th className="p-0.5 border-r border-black text-left" rowSpan={2}>Item Name<br/><span className="font-normal text-[7px]">HSN | Qty in SUOM</span></th>
              <th className="p-0.5 border-r border-black">UOM</th>
              <th className="p-0.5 border-r border-black">MRP</th>
              <th className="p-0.5 border-r border-black">Rate</th>
              <th className="p-0.5 border-r border-black">Qty</th>
              <th className="p-0.5 border-r border-black">GrossAmt</th>
              <th className="p-0.5 border-r border-black">Free</th>
              <th className="p-0.5 border-r border-black">Disc%</th>
              <th className="p-0.5 border-r border-black">Disc.Amt</th>
              <th className="p-0.5 border-r border-black">Other Disc</th>
              <th className="p-0.5 border-r border-black">Tot.Tax</th>
              <th className="p-0.5 text-right">Amount</th>
            </tr>
            <tr className="border-b border-black font-sans font-semibold text-center bg-gray-50 text-[7px]">
              <th className="p-0.5 border-r border-black">Taxable Amt</th>
              <th className="p-0.5 border-r border-black">CGST %</th>
              <th className="p-0.5 border-r border-black">CGST Amt</th>
              <th className="p-0.5 border-r border-black">SGST %</th>
              <th className="p-0.5 border-r border-black">SGST Amt</th>
              <th className="p-0.5 border-r border-black"></th>
              <th className="p-0.5 border-r border-black"></th>
              <th className="p-0.5 border-r border-black"></th>
              <th className="p-0.5 border-r border-black"></th>
              <th className="p-0.5 border-r border-black"></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = Number(it.quantity || 1);
              const rate = Number(it.unit_price || 0);
              const mrp = Number(it.mrp || rate * 1.15);
              const disc = Number(it.discount_value || 0);
              const grossAmt = qty * rate;
              const taxableAmt = grossAmt - disc;
              const taxRate = Number(it.tax_rate || 18);
              const halfTax = taxRate / 2;
              const taxVal = (taxableAmt * halfTax) / 100;
              const totalTaxAmt = taxVal * 2;
              const netAmount = taxableAmt + totalTaxAmt;

              return (
                <React.Fragment key={idx}>
                  <tr className="border-t border-gray-200">
                    <td className="p-0.5 text-center border-r border-black" rowSpan={2}>{idx + 1}</td>
                    <td className="p-0.5 font-sans font-bold border-r border-black text-left">{it.product_name || 'Item'}</td>
                    <td className="p-0.5 text-center border-r border-black">PAC</td>
                    <td className="p-0.5 text-right border-r border-black">{mrp.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{rate.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{qty.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{grossAmt.toFixed(2)}</td>
                    <td className="p-0.5 text-center border-r border-black">0.00</td>
                    <td className="p-0.5 text-right border-r border-black">{disc > 0 ? '5.00' : '0.00'}</td>
                    <td className="p-0.5 text-right border-r border-black">{disc.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">0.00</td>
                    <td className="p-0.5 text-right border-r border-black">{totalTaxAmt.toFixed(2)}</td>
                    <td className="p-0.5 text-right font-bold">{netAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-gray-300 text-gray-600 bg-gray-50/30">
                    <td className="p-0.5 border-r border-black text-left text-[7px]">{it.hsn_code || '19053100'} | {(qty * 0.1).toFixed(3)}KG</td>
                    <td className="p-0.5 text-right border-r border-black">{taxableAmt.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{halfTax.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{taxVal.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{halfTax.toFixed(2)}</td>
                    <td className="p-0.5 text-right border-r border-black">{taxVal.toFixed(2)}</td>
                    <td className="p-0.5 border-r border-black" colSpan={6}></td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── SUMMARY TOTALS BAR ─── */}
      <div className="grid grid-cols-6 border-t-2 border-b border-black p-1 text-[9px] font-mono bg-gray-100 font-bold">
        <div><span className="font-sans">Total: No of Items Sold: </span>{items.length || 1}</div>
        <div><span className="font-sans">Disc Amt: </span>0.00</div>
        <div><span className="font-sans">Other Disc Amt: </span>0.00</div>
        <div><span className="font-sans">Total Tax Amt: </span>{totalTax.toFixed(2)}</div>
        <div className="col-span-2 text-right font-black text-[10px]">{grandTotal.toFixed(2)}</div>
      </div>

      {/* ─── TAX BREAKDOWN & ADJUSTMENTS ─── */}
      <div className="grid grid-cols-12 border-b border-black text-[8px]">
        <div className="col-span-8 p-1 border-r border-black">
          <table className="w-full border border-black border-collapse text-center font-mono">
            <thead>
              <tr className="bg-gray-100 border-b border-black font-sans font-bold">
                <th className="p-0.5 border-r border-black">Rate%</th>
                <th className="p-0.5 border-r border-black">Taxable Amt</th>
                <th className="p-0.5 border-r border-black">CGST</th>
                <th className="p-0.5 border-r border-black">SGST</th>
                <th className="p-0.5">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-0.5 border-r border-black font-bold">18.00%</td>
                <td className="p-0.5 border-r border-black text-right">{taxableSubtotal.toFixed(2)}</td>
                <td className="p-0.5 border-r border-black text-right">{totalCgst.toFixed(2)}</td>
                <td className="p-0.5 border-r border-black text-right">{totalSgst.toFixed(2)}</td>
                <td className="p-0.5 text-right font-bold">{totalTax.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p className="font-black text-[9px] uppercase font-sans mt-2">
            {numberToIndianWords(grandTotal)}
          </p>
        </div>

        <div className="col-span-4 p-1 font-mono text-[8px] space-y-0.5 flex flex-col justify-between">
          <div className="space-y-0.5">
            <div className="flex justify-between"><span className="font-sans">TCS u/s 206C(1H) :</span><span>0.00</span></div>
            <div className="flex justify-between"><span className="font-sans">Credit Adj :</span><span>0.00</span></div>
            <div className="flex justify-between"><span className="font-sans">Round Off Amt :</span><span>0.00</span></div>
          </div>
          <div className="border-t border-black pt-1 flex justify-between font-black text-[10px]">
            <span className="font-sans">Net Amt Payable :</span>
            <span>{currency.symbol}{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ─── FSSAI STATUTORY DECLARATION & SIGNATURE ─── */}
      <div className="grid grid-cols-12 p-1.5 text-[8px]">
        <div className="col-span-8 pr-2 space-y-0.5 text-gray-700">
          <p className="font-bold text-black font-sans">
            Statutory Declaration under FSS Act 2006:
          </p>
          <p className="leading-tight">
            I/We hereby certify that food/foods mentioned in this invoice is/are warranted to be of the nature and quality which it/these purports/purported to be.
          </p>
        </div>
        <div className="col-span-4 text-right flex flex-col justify-between pt-1">
          <span className="font-bold text-black font-sans uppercase">{dynamicStoreName}</span>
          <div className="pt-6">
            <span className="font-bold text-black font-sans border-t border-black pt-0.5 inline-block">
              Authorised Signatory
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
