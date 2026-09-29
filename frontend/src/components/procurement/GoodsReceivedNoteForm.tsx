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
  Boxes,
  Truck,
  ShieldCheck,
  Search,
  Send,
  Upload,
  ScanLine,
  Loader2,
} from "lucide-react";
import { inventoryApi, fetchSalesEmployees } from "@/lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { useStoreLocations } from "@/hooks/use-store-locations";

interface GRNItem {
  id: string;
  product_id?: string;
  product_name: string;
  batch_number: string;
  expiry_date?: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_accepted: number;
  quantity_rejected: number;
  defect_reason?: string;
  search_query?: string;
  is_search_open?: boolean;
}

interface GoodsReceivedNoteFormProps {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: any;
}

export function GoodsReceivedNoteForm({ onClose, onSaved, initialData }: GoodsReceivedNoteFormProps) {
  const { currency, formatCurrency } = useCurrency();
  const isEditing = !!initialData?.id;
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form Metadata
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const [grnNumber, setGrnNumber] = useState<string>("");
  const [linkedPoId, setLinkedPoId] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receivingLocation, setReceivingLocation] = useState<string>(() => selectedStore);

  useEffect(() => {
    if (selectedStore && (!receivingLocation || receivingLocation.includes("Main Warehouse (BR-100)"))) {
      setReceivingLocation(selectedStore);
    }
  }, [selectedStore]);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>("");
  const [chalanInvoiceNo, setChalanInvoiceNo] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [carrierNote, setCarrierNote] = useState<string>("");
  const [notes, setNotes] = useState<string>(
    initialData?.notes || "1. Stock received in good condition except logged line rejections.\n2. QC inspection verified."
  );

  // OCR upload state
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Line items
  const [items, setItems] = useState<GRNItem[]>([
    {
      id: "1",
      product_name: "",
      batch_number: `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity_ordered: 100,
      quantity_received: 100,
      quantity_accepted: 100,
      quantity_rejected: 0,
      defect_reason: "",
      search_query: "",
      is_search_open: false,
    },
  ]);

  const [barcodeInput, setBarcodeInput] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const prods = await inventoryApi.getProducts().catch(() => ({ items: [] }));
        setProducts(prods.items || []);

        const pos = await inventoryApi.getPurchaseOrders().catch(() => []);
        setPurchaseOrders(pos || []);

        const emps = await fetchSalesEmployees().catch(() => []);
        setEmployees(emps || []);

        if (initialData) {
          setGrnNumber(initialData.grn_number || initialData.id || `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
          if (initialData.po_number) setLinkedPoId(initialData.po_number);
          if (initialData.notes) setNotes(initialData.notes);
          if (initialData.items && initialData.items.length > 0) {
            setItems(initialData.items.map((it: any, idx: number) => ({
              id: it.id || String(idx + 1),
              product_id: it.product_id,
              product_name: it.product_name || it.name || "Inward Item",
              batch_number: it.batch_number || `BATCH-${Math.floor(1000 + Math.random() * 9000)}`,
              quantity_ordered: Number(it.quantity_ordered) || Number(it.quantity_received) || 100,
              quantity_received: Number(it.quantity_received) || 100,
              quantity_accepted: Number(it.quantity_accepted) || Number(it.quantity_received) || 100,
              quantity_rejected: Number(it.quantity_rejected) || 0,
              defect_reason: it.defect_reason || "",
              search_query: it.product_name || "",
              is_search_open: false
            })));
          }
        } else {
          if (emps && emps.length > 0) {
            setSelectedInspectorId(emps[0].id);
          }
          const randomSeq = Math.floor(1000 + Math.random() * 9000);
          setGrnNumber(`GRN-2026-${randomSeq}`);
          setChalanInvoiceNo(`CHALAN-${randomSeq}`);
          setVehicleNo(`KA-${Math.floor(10 + Math.random() * 89)}-HQ-${Math.floor(1000 + Math.random() * 8999)}`);
        }
      } catch (err) {
        console.error("Error initializing GRN form data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialData]);

  const handleSelectPO = (poId: string) => {
    setLinkedPoId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po && po.items && po.items.length > 0) {
      setItems(
        po.items.map((it: any) => {
          const prod = products.find((p) => p.id === it.product_id);
          const qty = Number(it.quantity) || 1;
          return {
            id: Math.random().toString(36).substring(2, 9),
            product_id: it.product_id,
            product_name: it.product_name || prod?.name || "Material Item",
            batch_number: `B-${Math.floor(100 + Math.random() * 900)}`,
            expiry_date: new Date(Date.now() + 86400000 * 180).toISOString().slice(0, 10),
            quantity_ordered: qty,
            quantity_received: qty,
            quantity_accepted: qty,
            quantity_rejected: 0,
            defect_reason: "Passed quality check",
            search_query: it.product_name || prod?.name || "Material Item",
            is_search_open: false,
          };
        })
      );
      toast.success(`Pre-filled ${po.items.length} items from Purchase Order ${po.po_number || poId.slice(0, 8)}!`);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_name: "",
        batch_number: "BATCH-NEW",
        expiry_date: new Date(Date.now() + 86400000 * 180).toISOString().slice(0, 10),
        quantity_ordered: 1,
        quantity_received: 1,
        quantity_accepted: 1,
        quantity_rejected: 0,
        defect_reason: "Passed quality check",
        search_query: "",
        is_search_open: false,
      },
    ]);
  };

  const updateItemQty = (id: string, field: "quantity_received" | "quantity_rejected", val: number) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const rec = field === "quantity_received" ? Math.max(0, val) : it.quantity_received;
          const rej = field === "quantity_rejected" ? Math.min(rec, Math.max(0, val)) : it.quantity_rejected;
          const acc = Math.max(0, rec - rej);
          return { ...it, quantity_received: rec, quantity_rejected: rej, quantity_accepted: acc };
        }
        return it;
      })
    );
  };

  const selectCatalogProduct = (itemId: string, product: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            product_id: product.id,
            product_name: product.name,
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
            expiry_date: new Date(Date.now() + 86400000 * 180).toISOString().slice(0, 10),
            quantity_ordered: 1,
            quantity_received: 1,
            quantity_accepted: 1,
            quantity_rejected: 0,
            defect_reason: "Passed quality check",
            search_query: product.name,
            is_search_open: false,
          },
        ]);
        toast.success(`Scanned & added ${product.name} to GRN`);
        setBarcodeInput("");
        return;
      }
      toast.error("Item barcode not found in catalog");
    }
  };

  const totalReceived = items.reduce((acc, it) => acc + it.quantity_received, 0);
  const totalAccepted = items.reduce((acc, it) => acc + it.quantity_accepted, 0);
  const totalRejected = items.reduce((acc, it) => acc + it.quantity_rejected, 0);

  const handleSubmitGRN = async () => {
    if (items.length === 0) return toast.error("Please add at least one item to the GRN.");
    if (!grnNumber.trim()) return toast.error("GRN number is required.");

    setIsSaving(true);
    try {
      const inspectorId = selectedInspectorId || "00000000-0000-0000-0000-000000000000";
      if (isEditing) {
        await inventoryApi.updateGoodsReceivedNote(initialData.id, {
          received_date: receivedDate ? new Date(receivedDate).toISOString() : undefined,
          status: "Verified",
        });
        toast.success(`GRN ${grnNumber} updated successfully.`);
      } else {
        await inventoryApi.createGoodsReceivedNote({
          grn_number: grnNumber,
          purchase_order_id: linkedPoId || undefined,
          received_by: inspectorId,
          items: items.map((it) => ({
            product_id: it.product_id || products[0]?.id,
            quantity_ordered: Number(it.quantity_ordered),
            quantity_received: Number(it.quantity_received),
            quantity_accepted: Number(it.quantity_accepted),
            quantity_rejected: Number(it.quantity_rejected),
          })),
        });
        toast.success(`GRN ${grnNumber} logged! ${totalAccepted} units added to stock.`);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save Goods Received Note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGRN = async () => {
    if (!isEditing) return;
    if (!confirm(`Delete GRN ${grnNumber}? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      await inventoryApi.deleteGoodsReceivedNote(initialData.id);
      toast.success(`GRN ${grnNumber} deleted.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete GRN");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isEditing) return;
    setOcrFile(file);
    setIsExtracting(true);
    try {
      const data = await inventoryApi.extractGRNDocumentOCR(file);
      setOcrResult(data);
      if (data.extracted) {
        if (data.grn_number) setGrnNumber(data.grn_number);
        if (data.received_date) setReceivedDate(data.received_date);
        if (data.notes) setNotes(data.notes);
        toast.success("Document extracted — review fields and submit.");
      } else {
        toast.error("Could not extract data from document. Please fill manually.");
      }
    } catch (err: any) {
      toast.error(err.message || "OCR extraction failed");
    } finally {
      setIsExtracting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 text-slate-800 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to GRNs List
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                Goods Received Note (GRN)
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Log Material Inward Receipt & QC
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Record delivered shipments, inspect quality, accept/reject items, and automatically adjust inventory stock.
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
            onClick={handleSubmitGRN}
            className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl shadow-md shadow-amber-600/20 flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
          >
            <Boxes className="w-4 h-4" />
            {isSaving ? "Saving..." : "Submit GRN & Update Stock"}
          </button>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" /> Inward Logistics & Delivery Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Linked Purchase Order (PO)
              </label>
              <select
                value={linkedPoId}
                onChange={(e) => handleSelectPO(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Select Linked PO --</option>
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number || po.id.slice(0, 8)} - {po.supplier?.name || "Vendor PO"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Receiving Warehouse / Location *
              </label>
              <select
                value={receivingLocation || selectedStore}
                onChange={(e) => {
                  setReceivingLocation(e.target.value);
                  setSelectedStore(e.target.value);
                }}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
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
                Receiving Inspector / Staff *
              </label>
              <select
                value={selectedInspectorId}
                onChange={(e) => setSelectedInspectorId(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code || "Inspector"})
                    </option>
                  ))
                ) : (
                  <option value="">Abhilash (Store Receiving Manager)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Delivery Vehicle / Lorry Number
              </label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Carrier / AWB Transport Note
              </label>
              <input
                type="text"
                value={carrierNote}
                onChange={(e) => setCarrierNote(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> GRN Metadata
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">GRN Document Number</label>
              <input
                type="text"
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono font-bold text-amber-900 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Inward Inspection Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inward Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-600" /> Delivered Items & Quality Inspection Checklist ({items.length})
          </h2>

          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm w-full md:w-80 focus-within:ring-2 focus-within:ring-amber-500">
            <ScanBarcode className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              placeholder="Scan SKU / Barcode..."
              className="bg-transparent border-none text-xs text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[260px]">Catalog Item Description</th>
                <th className="px-3 py-3 w-28">Batch No</th>
                <th className="px-3 py-3 w-28">Expiry Date</th>
                <th className="px-3 py-3 w-20 text-right">Ordered</th>
                <th className="px-3 py-3 w-24 text-right">Received</th>
                <th className="px-3 py-3 w-24 text-right font-bold text-emerald-600">Accepted</th>
                <th className="px-3 py-3 w-24 text-right font-bold text-rose-600">Rejected</th>
                <th className="px-3 py-3 min-w-[200px]">Defect Reason / Quality Status</th>
                <th className="px-3 py-3 w-10 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
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
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-amber-500">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search product..."
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
                                className="p-2 hover:bg-amber-50 cursor-pointer text-xs font-bold text-slate-800"
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
                        value={item.batch_number}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.id === item.id ? { ...it, batch_number: e.target.value } : it)))
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800 outline-none"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="date"
                        value={item.expiry_date || ""}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.id === item.id ? { ...it, expiry_date: e.target.value } : it)))
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right font-bold text-slate-600">{item.quantity_ordered}</td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity_received}
                        onChange={(e) => updateItemQty(item.id, "quantity_received", Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right font-black text-emerald-700 text-xs">
                      {item.quantity_accepted}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.quantity_rejected}
                        onChange={(e) => updateItemQty(item.id, "quantity_rejected", Number(e.target.value) || 0)}
                        className="w-full bg-white border border-rose-300 rounded px-2 py-1 text-xs text-right font-bold text-rose-700 outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        placeholder="Passed check / Damaged details"
                        value={item.defect_reason || ""}
                        onChange={(e) =>
                          setItems(items.map((it) => (it.id === item.id ? { ...it, defect_reason: e.target.value } : it)))
                        }
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                      />
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
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-amber-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Delivered Item
          </button>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Total Received:</span>{" "}
            <span className="font-extrabold text-slate-900">{totalReceived} Units</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Accepted (Added to Stock):</span>{" "}
            <span className="font-extrabold text-emerald-700">{totalAccepted} Units</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Rejected:</span>{" "}
            <span className="font-extrabold text-rose-600">{totalRejected} Units</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Submitting this GRN will automatically update inventory stock balances in {receivingLocation}.</span>
        </div>
      </div>
    </div>
  );
}
