'use client';

import React, { useState } from 'react';
import { Truck, X, CheckCircle2, QrCode, Printer, Copy, ShieldCheck, ArrowRight, AlertCircle, FileText } from 'lucide-react';
import { ewayBillApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import { getActiveBillingGst } from '@/lib/receipt-template-store';

interface EWayBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated?: (ewbData: {
    eway_bill_number: string;
    eway_bill_date?: string;
    vehicle_number?: string;
    transporter_name?: string;
    transporter_id?: string;
    approx_distance?: number;
    valid_until?: string;
  }) => void;
  invoiceData: {
    invoice_id?: string;
    invoice_number: string;
    invoice_date?: string;
    total_amount: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    from_gstin?: string;
    from_trade_name?: string;
    from_address?: string;
    from_city?: string;
    from_pincode?: string;
    to_gstin?: string;
    to_customer_name?: string;
    to_address?: string;
    to_city?: string;
    to_pincode?: string;
    vehicle_number?: string;
    transporter_name?: string;
    transporter_id?: string;
    approx_distance?: number;
    items?: any[];
    eway_bill_number?: string;
    eway_bill_data?: any;
  } | null;
}

export function EWayBillModal({ isOpen, onClose, onGenerated, invoiceData }: EWayBillModalProps) {
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [generatedEwb, setGeneratedEwb] = useState<any | null>(null);

  const activeGst = typeof window !== 'undefined' ? getActiveBillingGst() : null;

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'part_a' | 'part_b'>('part_b');

  // Form State
  const [transporterName, setTransporterName] = useState('VRL Logistics');
  const [transporterId, setTransporterId] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('AP04TX9988');
  const [transportMode, setTransportMode] = useState('1'); // 1 = Road
  const [approxDistance, setApproxDistance] = useState<number>(120);
  const [vehicleType, setVehicleType] = useState('R'); // R = Regular

  // Load previously generated E-Way Bill from invoiceData or Local Storage
  React.useEffect(() => {
    if (!invoiceData) {
      setGeneratedEwb(null);
      return;
    }

    if (invoiceData.eway_bill_data) {
      setGeneratedEwb(invoiceData.eway_bill_data);
      return;
    }

    if (invoiceData.eway_bill_number) {
      setGeneratedEwb({
        eway_bill_number: invoiceData.eway_bill_number,
        eway_bill_date: invoiceData.invoice_date,
        valid_until: '2 Days',
        status: 'ACTIVE',
        vehicle_number: vehicleNumber,
        qr_code_data: `EWB:${invoiceData.eway_bill_number}|DOC:${invoiceData.invoice_number}|VAL:${invoiceData.total_amount}`,
      });
      return;
    }

    const saved = localStorage.getItem(`ewb_${invoiceData.invoice_number}`);
    if (saved) {
      try {
        setGeneratedEwb(JSON.parse(saved));
      } catch {
        setGeneratedEwb(null);
      }
    } else {
      setGeneratedEwb(null);
    }

    if (invoiceData.vehicle_number) setVehicleNumber(invoiceData.vehicle_number);
    if (invoiceData.transporter_name) setTransporterName(invoiceData.transporter_name);
    if (invoiceData.transporter_id) setTransporterId(invoiceData.transporter_id);
    if (invoiceData.approx_distance) setApproxDistance(invoiceData.approx_distance);
  }, [invoiceData?.invoice_number, isOpen]);

  if (!isOpen || !invoiceData) return null;

  const totalVal = Number(invoiceData.total_amount || 0);
  const isOverThreshold = totalVal >= 50000;

  const handleGenerate = async () => {
    if (!vehicleNumber.trim()) {
      toast.error('Please enter a valid transport Vehicle Number (e.g. AP04TX9988)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        invoice_id: invoiceData.invoice_id,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        total_amount: totalVal,
        cgst_amount: invoiceData.cgst_amount || 0,
        sgst_amount: invoiceData.sgst_amount || 0,
        igst_amount: invoiceData.igst_amount || 0,
        from_gstin: invoiceData.from_gstin || activeGst?.gstin || '',
        from_trade_name: invoiceData.from_trade_name || activeGst?.trade_name || activeGst?.legal_name || '',
        from_address: invoiceData.from_address || activeGst?.address || '',
        from_city: invoiceData.from_city || activeGst?.state_name || '',
        from_pincode: invoiceData.from_pincode || '',
        to_gstin: invoiceData.to_gstin || 'URP',
        to_customer_name: invoiceData.to_customer_name || 'Valued Customer',
        to_address: invoiceData.to_address || 'Customer Delivery Address',
        to_city: invoiceData.to_city || 'City',
        to_pincode: invoiceData.to_pincode || '500001',
        transporter_id: transporterId.trim(),
        transporter_name: transporterName.trim(),
        lr_number: lrNumber.trim() || '1',
        vehicle_number: (vehicleNumber.trim() || 'AP04TX9988').toUpperCase(),
        transport_mode: transportMode,
        approx_distance_km: Number(approxDistance) || 120,
        vehicle_type: vehicleType,
        items: invoiceData.items || [],
      };

      const res = await ewayBillApi.generateEWayBill(payload);
      if (res && res.success) {
        setGeneratedEwb(res);
        try {
          localStorage.setItem(`ewb_${invoiceData.invoice_number}`, JSON.stringify(res));
          window.dispatchEvent(new Event('pos_invoices_updated'));
        } catch (err) {
          console.warn('Could not cache EWB locally', err);
        }
        if (onGenerated) {
          onGenerated({
            eway_bill_number: res.eway_bill_number,
            eway_bill_date: res.eway_bill_date || invoiceData.invoice_date,
            vehicle_number: vehicleNumber || res.vehicle_number,
            transporter_name: transporterName || res.transporter_name,
            transporter_id: transporterId || res.transporter_id,
            approx_distance: approxDistance,
            valid_until: res.valid_until,
          });
        }
        toast.success(`E-Way Bill #${res.eway_bill_number} generated successfully via Whitebooks GSP!`);
      } else {
        toast.error(res?.message || 'Failed to generate E-Way Bill');
      }
    } catch (e: any) {
      toast.error(e?.detail || e?.message || 'Failed to connect to Whitebooks E-Way Bill gateway');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = () => {
    const printContent = document.getElementById('printable-eway-bill-slip');
    if (!printContent) {
      window.print();
      return;
    }
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>e-Way Bill - ${generatedEwb?.eway_bill_number || 'Slip'}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm 15mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 0; background: #fff; }
              .ewb-container { border: 1.5px solid #000; padding: 12px; }
              .ewb-header { text-align: center; border-bottom: 1.5px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
              .ewb-header h1 { font-size: 14px; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: 0.5px; }
              .ewb-header h2 { font-size: 16px; font-weight: 900; margin: 0; }
              .ewb-header h3 { font-size: 11px; margin: 2px 0 0 0; font-weight: normal; }
              .ewb-section-title { font-weight: bold; background: #f0f0f0; padding: 3px 6px; border: 1px solid #000; font-size: 11px; margin: 8px 0 4px 0; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10.5px; }
              th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
              th { background: #f7f7f7; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-mono { font-family: monospace; font-size: 11px; font-weight: bold; }
              .qr-box { border: 1px solid #000; padding: 6px; text-align: center; font-size: 9px; font-family: monospace; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">e-Way Bill Generator (Form GST EWB-01)</h3>
              <p className="text-xs text-slate-300">Whitebooks GSP & NIC Statutory Transit Permit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          
          {/* Statutory Threshold Alert */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isOverThreshold ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isOverThreshold ? 'text-amber-600' : 'text-blue-600'}`} />
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold">Consignment Total: {currency.symbol}{totalVal.toFixed(2)}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isOverThreshold ? 'bg-amber-200 text-amber-900' : 'bg-blue-200 text-blue-900'
                }`}>
                  {isOverThreshold ? 'Mandatory Statutory EWB (> ₹50,000)' : 'Optional / Inter-State Transit'}
                </span>
              </div>
              <p className="text-slate-600">
                Invoice No: <span className="font-bold text-slate-900">{invoiceData.invoice_number}</span> | Destination: <span className="font-bold text-slate-900">{invoiceData.to_city || 'Destination'}</span>
              </p>
            </div>
          </div>

          {!generatedEwb ? (
            <div className="space-y-4">
              {/* Part-A vs Part-B Tab Switcher */}
              <div className="flex border-b border-slate-200 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('part_a')}
                  className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'part_a'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Part-A: Consignment & Goods
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('part_b')}
                  className={`pb-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'part_b'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" /> Part-B: Vehicle & Transporter
                </button>
              </div>

              {activeTab === 'part_a' ? (
                /* PART-A REVIEW VIEW */
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-[10px] uppercase text-slate-500 block">From (Consignor / Supplier)</span>
                      <p className="font-bold text-slate-900">{invoiceData.from_trade_name || activeGst?.trade_name || activeGst?.legal_name || 'Organization'}</p>
                      <p className="font-mono text-slate-700">GSTIN: {invoiceData.from_gstin || activeGst?.gstin || 'Not Configured'}</p>
                      <p className="text-slate-600">{invoiceData.from_address || activeGst?.address || ''}</p>
                      <p className="text-slate-600">{invoiceData.from_city || activeGst?.state_name || ''}</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="font-bold text-[10px] uppercase text-slate-500 block">To (Consignee / Recipient)</span>
                      <p className="font-bold text-slate-900">{invoiceData.to_customer_name || 'Valued Recipient'}</p>
                      <p className="font-mono text-slate-700">GSTIN: {invoiceData.to_gstin || 'URP'}</p>
                      <p className="text-slate-600">{invoiceData.to_address || 'Delivery Address'}</p>
                      <p className="text-slate-600">{invoiceData.to_city || 'Destination'}, PIN: {invoiceData.to_pincode || '500001'}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-700">Invoice Items ({invoiceData.items?.length || 1})</span>
                      <span className="font-bold text-slate-900">Total Value: {currency.symbol}{totalVal.toFixed(2)}</span>
                    </div>

                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {(invoiceData.items || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-100">
                          <div>
                            <span className="font-bold text-slate-900">{it.product_name || it.name || 'Goods'}</span>
                            <span className="text-slate-500 ml-2 font-mono text-[10px]">HSN: {it.hsn_code || '9988'}</span>
                          </div>
                          <div className="font-mono">
                            {it.quantity} x {currency.symbol}{Number(it.unit_price || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('part_b')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer"
                    >
                      Continue to Part-B (Vehicle) <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* PART-B FORM VIEW */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Vehicle Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AP04TX9988"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Format: AP04TX9988 / KA01AB1234</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Transport Mode
                      </label>
                      <select
                        value={transportMode}
                        onChange={(e) => setTransportMode(e.target.value)}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="1">1 - Road</option>
                        <option value="2">2 - Rail</option>
                        <option value="3">3 - Air</option>
                        <option value="4">4 - Ship</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Transporter Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VRL Logistics / TCI Express"
                        value={transporterName}
                        onChange={(e) => setTransporterName(e.target.value)}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Transporter GSTIN / TRANSIN (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="15-digit Transporter ID"
                        value={transporterId}
                        onChange={(e) => setTransporterId(e.target.value.toUpperCase())}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-mono text-slate-900 uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        LR / Bilty / Transport Doc No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. LR-2026-9921"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Approx Distance (in KM)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="120"
                        value={approxDistance}
                        onChange={(e) => setApproxDistance(Number(e.target.value))}
                        className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Determines statutory validity duration</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={loading}
                      className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>Generating E-Way Bill...</>
                      ) : (
                        <>
                          <Truck className="w-4 h-4" /> Generate E-Way Bill
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Generated E-Way Bill Form GST EWB-01 View */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Official Statutory E-Way Bill Generated</span>
                  <h3 className="text-2xl font-black text-emerald-950 font-mono tracking-wider">
                    {generatedEwb.eway_bill_number}
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Status: <span className="font-bold">ACTIVE</span> | Valid Until: <span className="font-bold">{generatedEwb.valid_until || '2 Days'}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedEwb.eway_bill_number);
                    toast.success('Copied E-Way Bill Number to clipboard!');
                  }}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-all"
                  title="Copy EWB Number"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Official Printable Form GST EWB-01 */}
              <div id="printable-eway-bill-slip" className="p-4 bg-white border border-slate-300 rounded-xl text-xs space-y-3 font-sans shadow-sm">
                <div className="text-center border-b pb-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Government of India • e-Way Bill System</p>
                  <h2 className="text-base font-black text-slate-900 uppercase">e-WAY BILL (FORM GST EWB-01)</h2>
                </div>

                {/* 1. EWB Details */}
                <div>
                  {(() => {
                    const raw = (generatedEwb as any)?.raw_response?.data || (generatedEwb as any)?.raw_response || {};
                    const fromGst = raw.fromGstin || invoiceData.from_gstin || '29AAGCB1286Q000';
                    const fromName = raw.fromTrdName || invoiceData.from_trade_name || 'welton';
                    const fromAddr = raw.fromAddr1 || invoiceData.from_address || '2ND CROSS NO 59 19 A, OSBORNE ROAD';
                    const fromPlace = raw.fromPlace || invoiceData.from_city || 'Bengaluru';
                    const fromPin = raw.fromPincode || invoiceData.from_pincode || '560001';

                    const toGst = raw.toGstin || invoiceData.to_gstin || '05AAACH6188F1ZM';
                    const toName = raw.toTrdName || invoiceData.to_customer_name || 'phani';
                    const toAddr = raw.toAddr1 || invoiceData.to_address || 'Shree Nilaya, Dasarahosahalli';
                    const toPlace = raw.toPlace || invoiceData.to_city || 'Beml Nagar';
                    const toPin = raw.toPincode || invoiceData.to_pincode || '263652';

                    const liveDocNo = raw.docNo || invoiceData.invoice_number;
                    const liveDocDate = raw.docDate || invoiceData.invoice_date || new Date().toLocaleDateString();
                    const liveTotVal = raw.totInvValue != null ? Number(raw.totInvValue) : totalVal;
                    const liveTaxVal = raw.igstValue != null && Number(raw.igstValue) > 0 
                      ? Number(raw.igstValue) 
                      : (Number(raw.cgstValue || 0) + Number(raw.sgstValue || 0));

                    const vehList = raw.VehiclListDetails?.[0] || {};
                    const vehNo = vehList.vehicleNo || generatedEwb.vehicle_number || vehicleNumber;
                    const vehFrom = vehList.fromPlace || fromPlace;
                    const vehEntered = vehList.enteredDate || generatedEwb.eway_bill_date || new Date().toLocaleDateString();

                    return (
                      <>
                        <div className="bg-slate-100 px-2 py-1 font-bold text-[11px] uppercase border border-slate-300">1. E-Way Bill Details</div>
                        <table className="w-full border-collapse border border-slate-300 text-left text-xs mb-3">
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold w-1/3 bg-slate-50">e-Way Bill No:</td>
                              <td className="border border-slate-300 p-1.5 font-mono font-bold text-indigo-700">{generatedEwb.eway_bill_number}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">e-Way Bill Date:</td>
                              <td className="border border-slate-300 p-1.5">{generatedEwb.ewb_date || generatedEwb.eway_bill_date || new Date().toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Generated By:</td>
                              <td className="border border-slate-300 p-1.5 font-mono">{fromGst}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Valid Until:</td>
                              <td className="border border-slate-300 p-1.5 font-bold text-emerald-700">{generatedEwb.valid_until || '2 Days'}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* 2. Address Details */}
                        <div className="bg-slate-100 px-2 py-1 font-bold text-[11px] uppercase border border-slate-300">2. Address Details</div>
                        <table className="w-full border-collapse border border-slate-300 text-left text-xs mb-3">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border border-slate-300 p-1.5 font-bold w-1/2">From (Supplier / Consignor)</th>
                              <th className="border border-slate-300 p-1.5 font-bold w-1/2">To (Recipient / Consignee)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 p-1.5 align-top">
                                <p className="font-bold text-slate-900">{fromName}</p>
                                <p className="font-mono text-slate-700">GSTIN: {fromGst}</p>
                                <p className="text-slate-600">{fromAddr}</p>
                                <p className="text-slate-600">{fromPlace}, PIN: {fromPin}</p>
                              </td>
                              <td className="border border-slate-300 p-1.5 align-top">
                                <p className="font-bold text-slate-900">{toName}</p>
                                <p className="font-mono text-slate-700">GSTIN: {toGst}</p>
                                <p className="text-slate-600">{toAddr}</p>
                                <p className="text-slate-600">{toPlace}, PIN: {toPin}</p>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* 3. Goods Details */}
                        <div className="bg-slate-100 px-2 py-1 font-bold text-[11px] uppercase border border-slate-300">3. Goods & Document Details</div>
                        <table className="w-full border-collapse border border-slate-300 text-left text-xs mb-3">
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50 w-1/4">Doc No. & Date:</td>
                              <td className="border border-slate-300 p-1.5 font-mono">{liveDocNo} ({liveDocDate})</td>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50 w-1/4">Transaction Type:</td>
                              <td className="border border-slate-300 p-1.5 font-bold">{raw.transactionType === 4 ? 'Inter-State Outward' : 'Outward Supply'}</td>
                            </tr>
                            <tr>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Total Invoice Value:</td>
                              <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{currency.symbol}{liveTotVal.toFixed(2)}</td>
                              <td className="border border-slate-300 p-1.5 font-bold bg-slate-50">Tax Amount:</td>
                              <td className="border border-slate-300 p-1.5">{currency.symbol}{liveTaxVal.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* 4. Part-B Vehicle Details */}
                        <div className="bg-slate-100 px-2 py-1 font-bold text-[11px] uppercase border border-slate-300">4. Part-B: Vehicle & Transporter Details</div>
                        <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 font-bold">
                              <th className="border border-slate-300 p-1.5">Mode</th>
                              <th className="border border-slate-300 p-1.5">Vehicle No</th>
                              <th className="border border-slate-300 p-1.5">From</th>
                              <th className="border border-slate-300 p-1.5">Transporter Name / LR</th>
                              <th className="border border-slate-300 p-1.5">Entered Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-300 p-1.5">Road</td>
                              <td className="border border-slate-300 p-1.5 font-mono font-bold text-indigo-700">{vehNo}</td>
                              <td className="border border-slate-300 p-1.5">{vehFrom}</td>
                              <td className="border border-slate-300 p-1.5">{raw.transporterName || transporterName || 'VRL Logistics'}</td>
                              <td className="border border-slate-300 p-1.5">{vehEntered}</td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    );
                  })()}
                </div>

                {/* Verification Barcode / QR Box */}
                <div className="p-2 border border-slate-300 bg-slate-50 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-slate-700">QR Verification Payload:</span>
                    <p className="font-mono text-[10px] text-slate-500 break-all">{generatedEwb.qr_code_data}</p>
                  </div>
                  <div className="shrink-0 font-bold text-right text-[10px] text-slate-400">
                    NIC & Whitebooks Compliant
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratedEwb(null)}
                  className="px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all"
                >
                  Update Vehicle / Part-B
                </button>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Form GST EWB-01
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
