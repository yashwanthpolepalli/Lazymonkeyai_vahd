import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ScanBarcode,
  Plus,
  Trash2,
  FileText,
  Save,
  Building,
  User,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft,
  DollarSign,
  Search,
  Send,
  ShieldAlert
} from "lucide-react";
import { inventoryApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { useStoreLocations } from "@/hooks/use-store-locations";

interface ReturnItem {
  id: string;
  product_id?: string;
  product_name: string;
  batch_number?: string;
  unit_cost: number;
  quantity_returned: number;
  reason: string;
  search_query?: string;
  is_search_open?: boolean;
}

interface PurchaseReturnFormProps {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: any;
}

export function PurchaseReturnForm({ onClose, onSaved, initialData }: PurchaseReturnFormProps) {
    const { currency, formatCurrency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Return Metadata
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const [returnNumber, setReturnNumber] = useState<string>("");
  const [debitNoteNumber, setDebitNoteNumber] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [linkedPoId, setLinkedPoId] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [returnReason, setReturnReason] = useState<string>("Defective / Damaged Stock Received");
  const [resolutionAction, setResolutionAction] = useState<string>("Debit Note Issued");
  const [dispatchLocation, setDispatchLocation] = useState<string>(() => selectedStore);

  useEffect(() => {
    if (selectedStore && (!dispatchLocation || dispatchLocation.includes("Main Warehouse (BR-100)"))) {
      setDispatchLocation(selectedStore);
    }
  }, [selectedStore]);
  const [courierAwbNo, setCourierAwbNo] = useState<string>("");
  const [notes, setNotes] = useState<string>(
    "1. Stock items returned to vendor for replacement or credit adjustment.\n2. Automated debit note issued."
  );

  // Line items
  const [items, setItems] = useState<ReturnItem[]>([
    {
      id: "1",
      product_name: "",
      unit_cost: 0,
      quantity_returned: 1,
      reason: "Quality Defect",
      search_query: "",
      is_search_open: false,
    },
  ]);

  const [barcodeInput, setBarcodeInput] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supps = await inventoryApi.getSuppliers().catch(() => []);
        setSuppliers(supps || []);

        const prods = await inventoryApi.getProducts().catch(() => ({ items: [] }));
        setProducts(prods.items || []);

        const pos = await inventoryApi.getPurchaseOrders().catch(() => []);
        setPurchaseOrders(pos || []);

        if (initialData) {
          setReturnNumber(initialData.return_number || initialData.id || `PRN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
          setDebitNoteNumber(initialData.debit_note_number || `DN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
          if (initialData.supplier_id) setSelectedSupplierId(initialData.supplier_id);
          if (initialData.reason) setReturnReason(initialData.reason);
          if (initialData.notes) setNotes(initialData.notes);
          if (initialData.items && initialData.items.length > 0) {
            setItems(initialData.items.map((it: any, idx: number) => ({
              id: it.id || String(idx + 1),
              product_id: it.product_id,
              product_name: it.product_name || "Returned Material",
              unit_cost: Number(it.unit_cost || it.unit_price) || 0,
              quantity_returned: Number(it.quantity_returned || it.quantity) || 1,
              reason: it.reason || "Quality Defect",
              search_query: it.product_name || "",
              is_search_open: false
            })));
          }
        } else {
          if (supps && supps.length > 0) setSelectedSupplierId(supps[0].id);
          const randomSeq = Math.floor(1000 + Math.random() * 9000);
          setReturnNumber(`PRN-2026-${randomSeq}`);
          setDebitNoteNumber(`DN-2026-${randomSeq}`);
        }
      } catch (err) {
        console.error("Error initializing Purchase Return form data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialData]);

  const handleSelectPO = (poId: string) => {
    setLinkedPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      if (po.supplier_id) setSelectedSupplierId(po.supplier_id);
      if (po.items && po.items.length > 0) {
        setItems(
          po.items.map((it: any) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              id: Math.random().toString(36).substring(2, 9),
              product_id: it.product_id,
              product_name: it.product_name || prod?.name || "Material Item",
              batch_number: "BATCH-PO-REF",
              unit_cost: Number(it.unit_price) || prod?.cost_price || 15,
              quantity_returned: 1,
              reason: "Quality Check Failure / Rejected Inspection",
              search_query: it.product_name || prod?.name || "Material Item",
              is_search_open: false,
            };
          })
        );
        toast.success(`Pre-filled return items from PO ${po.po_number || poId.slice(0, 8)}`);
      }
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_name: "",
        batch_number: "BATCH-RET",
        unit_cost: 0,
        quantity_returned: 1,
        reason: "Damaged in transit",
        search_query: "",
        is_search_open: false,
      },
    ]);
  };

  const selectCatalogProduct = (itemId: string, product: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            product_id: product.id,
            product_name: product.name,
            unit_cost: product.cost_price || product.purchase_price || product.selling_price || 0,
            search_query: product.name,
            is_search_open: false,
          };
        }
        return it;
      })
    );
  };

  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim() !== "") {
      const code = barcodeInput.trim();
      const product = products.find((p) => p.barcode === code || p.sku === code);
      if (product) {
        setItems((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            product_id: product.id,
            product_name: product.name,
            batch_number: `B-${code.slice(-4)}`,
            unit_cost: product.cost_price || product.purchase_price || product.selling_price || 0,
            quantity_returned: 1,
            reason: "Barcode scanned return",
            search_query: product.name,
            is_search_open: false,
          },
        ]);
        toast.success(`Added ${product.name} to Return list`);
        setBarcodeInput("");
        return;
      }
      toast.error("Item barcode not found in catalog");
    }
  };

  const totalDebitNoteAmount = items.reduce(
    (acc, it) => acc + (Number(it.quantity_returned) || 0) * (Number(it.unit_cost) || 0),
    0
  );

  const handleSubmitReturn = async () => {
    if (items.length === 0) return toast.error("Please add at least one returned item.");
    if (!selectedSupplierId) return toast.error("Please select a vendor / supplier party.");

    setIsSaving(true);
    try {
      await inventoryApi.createPurchaseReturn({
        return_number: returnNumber,
        purchase_order_id: linkedPoId || undefined,
        supplier_id: selectedSupplierId,
        reason: `[Resolution: ${resolutionAction}] [Location: ${dispatchLocation}] [AWB: ${courierAwbNo}]`,
        items: items.map((it) => ({
          product_id: it.product_id || products[0]?.id,
          quantity_returned: Number(it.quantity_returned),
        })),
      });

      toast.success(
        `Purchase Return ${returnNumber} processed! Debit Note for ₹${totalDebitNoteAmount.toFixed(2)} generated.`
      );
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to process Purchase Return");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 text-slate-800 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Top Header */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Returns List
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                Purchase Return & Debit Note
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Process Purchase Return to Vendor
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              Return defective or rejected goods back to supplier and issue an automatic Debit Note.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300"
          >
            Cancel
          </button>
          <button
            disabled={isSaving}
            onClick={handleSubmitReturn}
            className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {isSaving ? "Saving..." : "Issue Return & Generate Debit Note"}
          </button>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-rose-600" /> Vendor & Resolution Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Vendor / Supplier Party *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Select Vendor / Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Linked Purchase Order (Optional)
              </label>
              <select
                value={linkedPoId}
                onChange={(e) => handleSelectPO(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">-- Select Original PO --</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number || po.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Resolution Action *
              </label>
              <select
                value={resolutionAction}
                onChange={(e) => setResolutionAction(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Debit Note Issued">Debit Note Issued (Deduct from AP)</option>
                <option value="Replacement Expected">Replacement Goods Expected</option>
                <option value="Direct Bank Refund">Direct Bank Refund</option>
                <option value="Vendor Credit Note">Vendor Credit Note Received</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Dispatching Warehouse / Store Location
              </label>
              <select
                value={dispatchLocation || selectedStore}
                onChange={(e) => {
                  setDispatchLocation(e.target.value);
                  setSelectedStore(e.target.value);
                }}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Transport Courier AWB / Tracking No
              </label>
              <input
                type="text"
                value={courierAwbNo}
                onChange={(e) => setCourierAwbNo(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Return Reference
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Return Voucher No</label>
              <input
                type="text"
                value={returnNumber}
                onChange={(e) => setReturnNumber(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono font-bold text-rose-900 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Return Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-600" /> Returned Items List ({items.length})
          </h2>

          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm w-full md:w-80 focus-within:ring-2 focus-within:ring-rose-500">
            <ScanBarcode className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              placeholder="Scan Barcode / SKU..."
              className="bg-transparent border-none text-xs text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[280px]">Catalog Item Autocomplete</th>
                <th className="px-3 py-3 w-28">Batch No</th>
                <th className="px-3 py-3 w-28 text-right">Unit Cost ({currency.symbol})</th>
                <th className="px-3 py-3 w-28 text-right">Returned Qty</th>
                <th className="px-3 py-3 w-32 text-right font-bold">Debit Line Total ({currency.symbol})</th>
                <th className="px-3 py-3 min-w-[220px]">Reason for Return</th>
                <th className="px-3 py-3 w-10 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const lineTotal = (Number(item.quantity_returned) || 0) * (Number(item.unit_cost) || 0);

                const matchingProducts = products.filter(
                  (p) =>
                    !item.search_query ||
                    p.name.toLowerCase().includes((item.search_query || "").toLowerCase())
                );

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>

                    <td className="px-3 py-2.5 relative">
                      <div className="relative">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-rose-500">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search catalog product..."
                            value={item.search_query !== undefined ? item.search_query : item.product_name}
                            onChange={(e) => {
                              setItems(
                                items.map((it) =>
                                  it.id === item.id
                                    ? { ...it, search_query: e.target.value, product_name: e.target.value, is_search_open: true }
                                    : it
                                )
                              );
                            }}
                            onFocus={() =>
                              setItems(items.map((it) => (it.id === item.id ? { ...it, is_search_open: true } : it)))
                            }
                            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        {item.is_search_open && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {matchingProducts.slice(0, 8).map((prod) => (
                              <div
                                key={prod.id}
                                onClick={() => selectCatalogProduct(item.id, prod)}
                                className="p-2 hover:bg-rose-50 cursor-pointer text-xs font-bold text-slate-800"
                              >
                                {prod.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.batch_number || ""}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.id === item.id ? { ...it, batch_number: e.target.value } : it)))
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) =>
                          setItems(
                            items.map((it) => (it.id === item.id ? { ...it, unit_cost: Number(e.target.value) || 0 } : it))
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity_returned}
                        onChange={(e) =>
                          setItems(
                            items.map((it) =>
                              it.id === item.id ? { ...it, quantity_returned: Number(e.target.value) || 1 } : it
                            )
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right font-black text-rose-700 text-xs">
                      {currency.symbol}{lineTotal.toFixed(2)}
                    </td>

                    <td className="px-3 py-2.5">
                      <select
                        value={item.reason}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.id === item.id ? { ...it, reason: e.target.value } : it)))
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="Damaged in transit / Outer seal broken">Damaged in transit</option>
                        <option value="Quality Check Failure / Rejected">Quality Check Failure</option>
                        <option value="Expired Goods / Short Expiry">Expired Goods</option>
                        <option value="Wrong Material Shipped by Vendor">Wrong Material Shipped</option>
                      </select>
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((it) => it.id !== item.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50/50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-rose-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Returned Item
          </button>
        </div>
      </div>

      {/* Footer Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" /> Vendor Debit Note Statement
          </h2>
          <div className="text-xs text-slate-600 space-y-1">
            <p>1. This Debit Note will be recorded against the supplier account ledger.</p>
            <p>2. Physical stock will be deducted from {dispatchLocation}.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-600" /> Total Debit Note Financial Summary
          </h2>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">Total Debit Note Amount:</span>
            <span className="font-extrabold text-rose-700 text-lg">{currency.symbol}{totalDebitNoteAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
