import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Plus,
  Boxes,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  DollarSign,
  Tag,
  RefreshCw,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { inventoryApi, type InventoryBatch, type Warehouse } from "@/lib/api-client";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export interface BatchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  currentBatchNumber?: string;
  onSelectBatch: (batch: {
    id?: string;
    batch_number: string;
    expiry_date?: string;
    mfg_date?: string;
    mrp?: number;
    selling_price?: number;
    cost_price?: number;
    remaining_quantity?: number;
    warehouse_name?: string;
    warehouse_id?: string;
  }) => void;
}

export function BatchSelectorModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentBatchNumber,
  onSelectBatch,
}: BatchSelectorModalProps) {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const currentCompanyId = (tenant as any)?.company_id || undefined;
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Create Form State
  const [formBatchNumber, setFormBatchNumber] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formMfgDate, setFormMfgDate] = useState("");
  const [formQuantity, setFormQuantity] = useState<number | "">("");
  const [formSellingPrice, setFormSellingPrice] = useState<number | "">("");
  const [formMrp, setFormMrp] = useState<number | "">("");
  const [formCostPrice, setFormCostPrice] = useState<number | "">("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadBatches();
      loadWarehouses();
      // Generate default batch number if opening create tab
      const code = `BTH-${new Date().toISOString().slice(2, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFormBatchNumber(code);
    }
  }, [isOpen, productId]);

  const loadWarehouses = async () => {
    try {
      const res: any = await inventoryApi.getWarehouses();
      const list = res?.items || (Array.isArray(res) ? res : []);
      setWarehouses(list);
      if (list.length > 0) {
        setFormWarehouseId(list[0].id);
      }
    } catch {
      setWarehouses([]);
    }
  };

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const res: any = await inventoryApi.getBatches({
        product_id: productId || undefined,
        search: searchQuery || undefined,
        company_id: currentCompanyId || undefined,
      });
      const list: InventoryBatch[] = res?.items || (Array.isArray(res) ? res : []);
      // Filter locally by product_id if available
      const filtered = productId
        ? list.filter((b) => !b.product_id || b.product_id === productId || (b.product_name && productName && b.product_name.toLowerCase() === productName.toLowerCase()))
        : list;
      setBatches(filtered);
    } catch (err) {
      console.warn("Failed to load batches:", err);
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBatchNumber.trim()) {
      toast.error("Please enter a batch number");
      return;
    }
    const selWh = warehouses.find((w) => w.id === formWarehouseId);
    setIsSaving(true);
    try {
      const payload: any = {
        company_id: currentCompanyId || undefined,
        batch_number: formBatchNumber.trim(),
        product_id: productId,
        product_name: productName || "Product",
        sku: "",
        warehouse_id: formWarehouseId || undefined,
        warehouse_name: selWh?.name || "Main Warehouse",
        quantity: Number(formQuantity) || 0,
        remaining_quantity: Number(formQuantity) || 0,
        uom: "Pcs",
        cost_price: Number(formCostPrice) || 0,
        mrp: Number(formMrp) || 0,
        selling_price: Number(formSellingPrice) || 0,
        location: formLocation || undefined,
        manufacturing_date: formMfgDate || undefined,
        expiry_date: formExpiryDate || undefined,
        notes: formNotes || undefined,
        status: "Active",
        sync_to_stock: true,
      };

      const newBatch = await inventoryApi.createBatch(payload);
      toast.success(`Created Batch #${newBatch.batch_number}!`);

      // Auto-select the newly created batch
      onSelectBatch({
        id: newBatch.id,
        batch_number: newBatch.batch_number,
        expiry_date: newBatch.expiry_date ? String(newBatch.expiry_date).slice(0, 10) : "",
        mfg_date: newBatch.manufacturing_date ? String(newBatch.manufacturing_date).slice(0, 10) : "",
        mrp: Number(newBatch.mrp) || 0,
        selling_price: Number(newBatch.selling_price) || 0,
        cost_price: Number(newBatch.cost_price) || 0,
        remaining_quantity: Number(newBatch.remaining_quantity) || 0,
        warehouse_name: newBatch.warehouse_name || selWh?.name,
        warehouse_id: newBatch.warehouse_id,
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to create batch");
    } finally {
      setIsSaving(false);
    }
  };

  // FEFO Sorting & Analysis
  const sortedBatches = useMemo(() => {
    let list = [...batches];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.batch_number.toLowerCase().includes(q) ||
          (b.warehouse_name && b.warehouse_name.toLowerCase().includes(q)) ||
          (b.location && b.location.toLowerCase().includes(q))
      );
    }

    // Sort by Expiry Date ascending (FEFO - First Expired First Out)
    return list.sort((a, b) => {
      const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 9999999999999;
      const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 9999999999999;
      return dateA - dateB;
    });
  }, [batches, searchQuery]);

  const fefoBatchId = useMemo(() => {
    const validWithStock = sortedBatches.find(
      (b) => Number(b.remaining_quantity || b.quantity || 0) > 0 && b.expiry_date && new Date(b.expiry_date) > new Date()
    );
    return validWithStock?.id || sortedBatches[0]?.id;
  }, [sortedBatches]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Select Product Batch & Traceability</h3>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                  FEFO Enabled
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-md mt-0.5">
                {productName ? `For item: "${productName}"` : "Choose batch with specific rate and expiry"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("select")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "select"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Available Batches ({batches.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            + Quick Add New Batch
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === "select" && (
            <div className="space-y-3">
              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search batch number, warehouse, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl outline-none font-medium text-slate-800 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={loadBatches}
                  disabled={isLoading}
                  className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition cursor-pointer"
                  title="Reload batches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>

              {/* Batch List */}
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  Loading batches...
                </div>
              ) : sortedBatches.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                  <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No matching batches found</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    You can bill directly with a new batch by switching to the Quick Add tab above.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("create")}
                    className="mt-3.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl text-xs transition cursor-pointer"
                  >
                    + Create First Batch
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedBatches.map((b) => {
                    const isSelected = currentBatchNumber && b.batch_number === currentBatchNumber;
                    const isFefo = b.id === fefoBatchId;
                    const expDateStr = b.expiry_date ? String(b.expiry_date).slice(0, 10) : "";
                    const mfgDateStr = b.manufacturing_date ? String(b.manufacturing_date).slice(0, 10) : "";
                    const remainingQty = Number(b.remaining_quantity || b.quantity || 0);

                    // Expiry calculations
                    let expiryTag: { label: string; color: string; icon: any } | null = null;
                    if (b.expiry_date) {
                      const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (daysLeft < 0) {
                        expiryTag = { label: `Expired (${Math.abs(daysLeft)}d ago)`, color: "bg-red-50 text-red-700 border-red-200", icon: ShieldAlert };
                      } else if (daysLeft <= 30) {
                        expiryTag = { label: `Expiring in ${daysLeft} days`, color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle };
                      } else {
                        expiryTag = { label: `Fresh (${daysLeft}d left)`, color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: ShieldCheck };
                      }
                    }

                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectBatch({
                            id: b.id,
                            batch_number: b.batch_number,
                            expiry_date: expDateStr,
                            mfg_date: mfgDateStr,
                            mrp: Number(b.mrp) || 0,
                            selling_price: Number(b.selling_price) || 0,
                            cost_price: Number(b.cost_price) || 0,
                            remaining_quantity: remainingQty,
                            warehouse_name: b.warehouse_name || undefined,
                            warehouse_id: b.warehouse_id || undefined,
                          });
                          onClose();
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-indigo-50/90 border-indigo-400 shadow-xs ring-1 ring-indigo-400"
                            : isFefo
                            ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/70"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              #{b.batch_number}
                            </span>
                            {isFefo && (
                              <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                <Sparkles className="w-2.5 h-2.5" /> FEFO Recommended
                              </span>
                            )}
                            {expiryTag && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${expiryTag.color}`}>
                                <expiryTag.icon className="w-2.5 h-2.5" />
                                {expiryTag.label}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Currently Selected
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2.5 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-700 font-bold">
                              <Boxes className="w-3 h-3 text-slate-400" />
                              Stock: <span className={remainingQty > 0 ? "text-emerald-700 font-black" : "text-red-600 font-black"}>{remainingQty} {b.uom || "Pcs"}</span>
                            </span>
                            {expDateStr && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Exp: <strong className="text-slate-700">{expDateStr}</strong>
                              </span>
                            )}
                            {b.warehouse_name && (
                              <span className="flex items-center gap-1">
                                <WarehouseIcon className="w-3 h-3 text-slate-400" />
                                {b.warehouse_name}
                              </span>
                            )}
                            {b.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {b.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Batch Price & Action */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">Selling Rate</span>
                            <span className="text-xs font-black text-indigo-700">
                              {formatCurrency(Number(b.selling_price || b.mrp || 0))}
                            </span>
                          </div>
                          {Number(b.mrp) > 0 && (
                            <span className="text-[10px] text-slate-400">
                              MRP: {formatCurrency(Number(b.mrp))}
                            </span>
                          )}
                          <button
                            type="button"
                            className="mt-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition cursor-pointer"
                          >
                            Use Batch
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Batch Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Batch Number *</span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = `BTH-${new Date().toISOString().slice(2, 7).replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
                        setFormBatchNumber(code);
                      }}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    placeholder="e.g. BATCH-2026-001"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                {/* Warehouse */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Warehouse / Store</label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ""}
                      </option>
                    ))}
                    {warehouses.length === 0 && <option value="">Main Warehouse</option>}
                  </select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Expiry Date</label>
                  <DatePickerInput
                    value={formExpiryDate}
                    onChange={setFormExpiryDate}
                    className="w-full"
                  />
                </div>

                {/* Mfg Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Manufacturing Date</label>
                  <DatePickerInput
                    value={formMfgDate}
                    onChange={setFormMfgDate}
                    className="w-full"
                  />
                </div>

                {/* Batch Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Batch Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                {/* Batch MRP */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Batch MRP (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formMrp}
                    onChange={(e) => setFormMrp(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                {/* Stock Quantity */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Initial Batch Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                {/* Storage Rack/Bin Location */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Rack A-02, Shelf 3"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("select")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save & Select Batch
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
