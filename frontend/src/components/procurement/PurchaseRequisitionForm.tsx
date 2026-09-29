import React, { useState, useEffect, useRef, useMemo } from "react";
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
  MapPin,
  Send,
  Search,
  Loader2,
  Sparkles,
  Upload,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { inventoryApi, employeesApi, fetchSalesEmployees } from "@/lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { useStoreLocations } from "@/hooks/use-store-locations";
import { Button } from "../ui/button";

interface RequisitionItem {
  id: string;
  product_id?: string;
  product_name: string;
  category: string;
  unit_of_measure: string;
  quantity: number;
  estimated_unit_cost: number;
  notes?: string;
  search_query?: string;
  is_search_open?: boolean;
}

interface PurchaseRequisitionFormProps {
  onClose: () => void;
  onSaved?: () => void;
  initialData?: any;
}

export function PurchaseRequisitionForm({ onClose, onSaved, initialData }: PurchaseRequisitionFormProps) {
  const { currency, formatCurrency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExtractingOcr, setIsExtractingOcr] = useState<boolean>(false);
  const prOcrFileRef = useRef<HTMLInputElement | null>(null);

  // Batch Multi-Select Modal State
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [multiSearch, setMultiSearch] = useState("");
  const [multiCategory, setMultiCategory] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Global Enterprise PR Fields
  const [prNumber, setPrNumber] = useState<string>("");
  const [prStatus, setPrStatus] = useState<string>("Pending Approval");
  const [requisitionDate, setRequisitionDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [requiredByDate, setRequiredByDate] = useState<string>(
    new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10)
  );
  const [department, setDepartment] = useState<string>("Operations & Warehouse");
  const [priority, setPriority] = useState<string>("Normal / Medium");
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [preferredSupplierId, setPreferredSupplierId] = useState<string>("");
  const [deliveryLocation, setDeliveryLocation] = useState<string>(() => selectedStore);
  const [purposeJustification, setPurposeJustification] = useState<string>(
    "Quarterly stock replenishment for fast-moving materials and store operation consumables."
  );

  useEffect(() => {
    if (selectedStore && (!deliveryLocation || deliveryLocation.includes("Main Warehouse (BR-100)"))) {
      setDeliveryLocation(selectedStore);
    }
  }, [selectedStore]);

  // Line items
  const [items, setItems] = useState<RequisitionItem[]>([
    {
      id: "1",
      product_name: "",
      category: "General",
      unit_of_measure: "Pcs",
      quantity: 1,
      estimated_unit_cost: 0,
      notes: "",
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

        const prods = await inventoryApi.getProducts({ page_size: 500 }).catch(() => ({ items: [] }));
        const prodsList = Array.isArray(prods) ? prods : (prods?.items || []);
        setProducts(prodsList);

        const emps = await fetchSalesEmployees().catch(() => []);
        setEmployees(emps || []);
        
        if (initialData) {
          setPrNumber(initialData.request_number || initialData.pr_number || `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`);
          if (initialData.supplier_id) setPreferredSupplierId(initialData.supplier_id);
          if (initialData.department) setDepartment(initialData.department);
          if (initialData.priority) setPriority(initialData.priority);
          if (initialData.notes) setPurposeJustification(initialData.notes);
          if (initialData.items && initialData.items.length > 0) {
            setItems(initialData.items.map((it: any, idx: number) => {
              const pName = it.product_name || it.name || "";
              const foundProd = (prods.items || []).find((p: any) => 
                (it.product_id && p.id === it.product_id) || 
                (pName && p.name?.toLowerCase().trim() === pName.toLowerCase().trim())
              );
              const estPrice = Number(it.estimated_unit_cost || it.unit_price || it.cost_price || it.mrp || it.selling_price || it.price) 
                || (foundProd ? (Number((foundProd as any).cost_price) || Number((foundProd as any).selling_price) || Number(foundProd.mrp) || Number((foundProd as any).wholesale_price) || 0) : 0);

              return {
                id: it.id || String(idx + 1),
                product_id: it.product_id || foundProd?.id,
                product_name: pName || foundProd?.name || "Requested Item",
                category: it.category || foundProd?.category_name || "General",
                unit_of_measure: it.uom || it.unit_of_measure || foundProd?.uom_name || "Pcs",
                quantity: Number(it.quantity || it.requested_qty) || 1,
                estimated_unit_cost: estPrice,
                notes: it.notes || "",
                search_query: pName || foundProd?.name || "",
                is_search_open: false
              };
            }));
          }
        } else {
          if (emps && emps.length > 0) {
            setSelectedEmployeeId(emps[0].id);
          }
          const randomSeq = Math.floor(1000 + Math.random() * 9000);
          setPrNumber(`PR-2026-${randomSeq}`);
        }
      } catch (err) {
        console.error("Error initializing PR form:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialData]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_name: "",
        category: "General",
        unit_of_measure: "Pcs",
        quantity: 1,
        estimated_unit_cost: 0,
        notes: "",
        search_query: "",
        is_search_open: false,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const selectCatalogProduct = (itemId: string, product: any) => {
    const price = Number(product.cost_price) || Number(product.selling_price) || Number(product.mrp) || Number(product.wholesale_price) || 0;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            product_id: product.id,
            product_name: product.name,
            category: product.category || product.category_name || "General",
            unit_of_measure: product.uom || product.uom_name || "Pcs",
            estimated_unit_cost: price,
            search_query: product.name,
            is_search_open: false,
          };
        }
        return it;
      })
    );
    toast.success(`Selected catalog product: "${product.name}" (₹${price})`);
  };

  const updateItem = (id: string, field: keyof RequisitionItem, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category || p.category_name) set.add(p.category || p.category_name);
    });
    return Array.from(set);
  }, [products]);

  const filteredMultiProducts = useMemo(() => {
    const q = multiSearch.trim().toLowerCase();
    return products.filter((p) => {
      const cat = p.category || p.category_name;
      const matchCat = !multiCategory || cat === multiCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchQuery;
    });
  }, [products, multiSearch, multiCategory]);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedProductIds(new Set(filteredMultiProducts.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const handleAddSelectedProducts = () => {
    const prodsToAdd = products.filter((p) => selectedProductIds.has(p.id));
    const newItems: RequisitionItem[] = prodsToAdd.map((p) => {
      const price = Number(p.cost_price) || Number(p.purchase_price) || Number(p.selling_price) || Number(p.mrp) || 0;
      return {
        id: Math.random().toString(36).substring(2, 9),
        product_id: p.id,
        product_name: p.name,
        category: p.category || p.category_name || "General",
        unit_of_measure: p.uom || p.uom_name || "Pcs",
        quantity: 1,
        estimated_unit_cost: price,
        notes: "",
        search_query: p.name,
        is_search_open: false,
      };
    });

    setItems((prev) => {
      const nonEmpty = prev.filter((it) => it.product_name.trim() !== "");
      return [...nonEmpty, ...newItems];
    });

    toast.success(`Added ${prodsToAdd.length} products to Requisition!`);
    setIsMultiModalOpen(false);
    setSelectedProductIds(new Set());
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
            category: product.category || "General",
            unit_of_measure: "Pcs",
            quantity: 1,
            estimated_unit_cost: product.cost_price || product.purchase_price || product.selling_price || 0,
            notes: `Barcode: ${code}`,
            search_query: product.name,
            is_search_open: false,
          },
        ]);
        toast.success(`Added ${product.name} to Requisition`);
        setBarcodeInput("");
        return;
      }
      toast.error("Item barcode not found in catalog");
    }
  };

  const totalEstimatedBudget = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0),
    0
  );

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingOcr(true);
    toast.info(`Extracting PR line items from ${file.name} via OCR AI...`);
    try {
      const data = await inventoryApi.extractPRDocumentOCR(file);
      if (data.extracted) {
        if (data.pr_number) setPrNumber(data.pr_number);
        if (data.department) setDepartment(data.department);
        if (data.priority) setPriority(data.priority);
        if (data.purpose_justification) setPurposeJustification(data.purpose_justification);
        if (data.items && data.items.length > 0) {
          setItems(data.items.map((it: any, idx: number) => {
            const pName = it.product_name || "Requisition Item";
            const found = products.find((p: any) => p.name?.toLowerCase().trim() === pName.toLowerCase().trim());
            return {
              id: Math.random().toString(36).substring(2, 9),
              product_id: found?.id,
              product_name: pName,
              category: it.category || found?.category_name || "General",
              unit_of_measure: it.unit_of_measure || "Pcs",
              quantity: Number(it.quantity) || 1,
              estimated_unit_cost: Number(it.estimated_unit_cost) || (found ? Number(found.cost_price || found.selling_price || 0) : 0),
              notes: `Extracted via OCR from ${file.name}`,
              search_query: pName,
              is_search_open: false,
            };
          }));
        }
        toast.success(`OCR AI successfully extracted ${data.items?.length || 0} line items from ${file.name}!`);
      } else {
        toast.error("Could not extract structured data from document. Please fill manually.");
      }
    } catch (err: any) {
      toast.error(err.message || "OCR extraction failed");
    } finally {
      setIsExtractingOcr(false);
      e.target.value = "";
    }
  };

  const handleSubmitRequisition = async () => {
    if (items.length === 0) return toast.error("Please add at least one item to the requisition.");
    if (!prNumber.trim()) return toast.error("Requisition number is required.");

    setIsSaving(true);
    try {
      const requesterId = selectedEmployeeId || "00000000-0000-0000-0000-000000000000";
      await inventoryApi.createPurchaseRequest({
        request_number: prNumber,
        requester_id: requesterId,
        status: prStatus || "Pending Approval",
        items: items.map((it) => ({
          product_id: it.product_id || products[0]?.id,
          quantity: Number(it.quantity),
          estimated_price: Number(it.estimated_unit_cost),
        })),
      });

      toast.success(`Purchase Requisition ${prNumber} saved as ${prStatus}!`);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit Purchase Requisition");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 text-slate-800 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Hidden OCR File Input */}
      <input
        ref={prOcrFileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleOcrUpload}
      />

      {/* Top Header */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Requisitions List
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Purchase Requisition (PR)
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Raise Purchase Requisition
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              Internal material requisition request. Does not contain financial vendor bills or payment terms until awarded via RFQ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* OCR AI Extraction Trigger Button */}
          <button
            type="button"
            disabled={isExtractingOcr || isSaving}
            onClick={() => prOcrFileRef.current?.click()}
            className="px-3.5 py-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 shadow-sm flex items-center gap-1.5 transition-all"
          >
            {isExtractingOcr ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
            {isExtractingOcr ? "Scanning Indent..." : "Upload Indent (OCR AI)"}
          </button>

          {/* Status Selection */}
          <select
            value={prStatus}
            onChange={(e) => setPrStatus(e.target.value)}
            className="h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="Draft">Save as Draft</option>
            <option value="Pending Approval">Submit for Approval</option>
            <option value="Approved">Directly Approved</option>
          </select>

          <button
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300"
          >
            Cancel
          </button>
          <button
            disabled={isSaving || isExtractingOcr}
            onClick={handleSubmitRequisition}
            className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md shadow-purple-600/20 flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSaving ? "Saving..." : prStatus === "Approved" ? "Save & Approve PR" : "Submit PR"}
          </button>
        </div>
      </div>

      {/* Global Enterprise PR Metadata Header Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requisition Details (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-600" /> Departmental Requisition Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Requesting Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Operations & Warehouse">Operations & Warehouse</option>
                <option value="IT & Technology">IT & Technology Hardware</option>
                <option value="Sales & Marketing">Sales & Marketing</option>
                <option value="Facilities & Administration">Facilities & Admin</option>
                <option value="Manufacturing & Production">Manufacturing & Production</option>
                <option value="Human Resources">Human Resources & HRMS</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Requisition Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Low">Low - Normal Replenishment</option>
                <option value="Normal / Medium">Normal / Medium (Standard)</option>
                <option value="High / Urgent">High / Urgent (Stockout Warning)</option>
                <option value="Emergency Stop Work">Emergency (Stop Work Hazard)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Requisitioner Staff Member *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
              >
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code || "Staff"})
                    </option>
                  ))
                ) : (
                  <option value="">Abhilash (EMP-0001)</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Delivery Target Warehouse / Depot *
              </label>
              <select
                value={deliveryLocation || selectedStore}
                onChange={(e) => {
                  setDeliveryLocation(e.target.value);
                  setSelectedStore(e.target.value);
                }}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
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
                Target / Recommended Supplier (Optional Guidance)
              </label>
              <select
                value={preferredSupplierId}
                onChange={(e) => setPreferredSupplierId(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 outline-none"
              >
                <option value="">-- Optional Target Vendor Guidance --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PR System Metadata (1 Col on lg) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Requisition Metadata
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">PR Number</label>
              <input
                type="text"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono font-bold text-purple-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Requisition Date</label>
                <input
                  type="date"
                  value={requisitionDate}
                  onChange={(e) => setRequisitionDate(e.target.value)}
                  className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Required By Date</label>
                <input
                  type="date"
                  value={requiredByDate}
                  onChange={(e) => setRequiredByDate(e.target.value)}
                  className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requisition Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" /> Requisition Materials & Requested Services ({items.length})
          </h2>

          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm w-full md:w-80 focus-within:ring-2 focus-within:ring-purple-500">
            <ScanBarcode className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeSubmit}
              placeholder="Scan catalog SKU / Barcode..."
              className="bg-transparent border-none text-xs text-slate-800 outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[280px]">Catalog Item Search & Selection</th>
                <th className="px-3 py-3 w-32">Category</th>
                <th className="px-3 py-3 w-28">Unit of Measure</th>
                <th className="px-3 py-3 w-24 text-right">Requested Qty</th>
                <th className="px-3 py-3 w-28 text-right">Est. Unit Cost ({currency.symbol})</th>
                <th className="px-3 py-3 w-32 text-right font-bold">Total Est. Cost ({currency.symbol})</th>
                <th className="px-3 py-3 min-w-[180px]">Technical Notes / Specs</th>
                <th className="px-3 py-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.estimated_unit_cost) || 0);

                const matchingProducts = products.filter(
                  (p) =>
                    !item.search_query ||
                    p.name.toLowerCase().includes((item.search_query || "").toLowerCase()) ||
                    (p.sku && p.sku.toLowerCase().includes((item.search_query || "").toLowerCase())) ||
                    (p.barcode && p.barcode.includes(item.search_query || ""))
                );

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-400">{idx + 1}</td>

                    {/* Catalog Autocomplete Input */}
                    <td className="px-3 py-2.5 relative">
                      <div className="relative">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus-within:ring-2 focus-within:ring-purple-500">
                          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Type to search product catalog..."
                            value={item.search_query !== undefined ? item.search_query : item.product_name}
                            onChange={(e) => {
                              updateItem(item.id, "search_query", e.target.value);
                              updateItem(item.id, "product_name", e.target.value);
                              updateItem(item.id, "is_search_open", true);
                            }}
                            onFocus={() => updateItem(item.id, "is_search_open", true)}
                            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>

                        {/* Autocomplete Dropdown List */}
                        {item.is_search_open && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {matchingProducts.length > 0 ? (
                              matchingProducts.slice(0, 10).map((prod) => (
                                <div
                                  key={prod.id}
                                  onClick={() => selectCatalogProduct(item.id, prod)}
                                  className="p-2 hover:bg-purple-50 cursor-pointer flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-900">{prod.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                      SKU: {prod.sku || "N/A"} | Category: {prod.category || "General"}
                                    </div>
                                  </div>
                                  <div className="text-right font-bold text-purple-700">
                                    {currency.symbol}{prod.cost_price || prod.purchase_price || prod.selling_price || 0}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-slate-400 text-center text-xs">
                                No matching catalog items found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateItem(item.id, "category", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                      />
                    </td>

                    <td className="px-3 py-2.5">
                      <select
                        value={item.unit_of_measure}
                        onChange={(e) => updateItem(item.id, "unit_of_measure", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                      >
                        <option value="Pcs">Pcs (Pieces)</option>
                        <option value="Kg">Kg (Kilograms)</option>
                        <option value="Liters">Liters</option>
                        <option value="Boxes">Boxes</option>
                        <option value="Packs">Packs</option>
                        <option value="Meters">Meters</option>
                        <option value="Units">Units</option>
                      </select>
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        value={item.estimated_unit_cost}
                        onChange={(e) => updateItem(item.id, "estimated_unit_cost", Number(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-right font-black text-slate-900 text-xs">
                      {currency.symbol}{lineTotal.toFixed(2)}
                    </td>

                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        placeholder="Specs, Brand, or Requirements"
                        value={item.notes || ""}
                        onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                      />
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
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

        <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-purple-600 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Requisition Item
          </button>

          <button
            type="button"
            onClick={() => setIsMultiModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer border-0"
          >
            <Package className="w-3.5 h-3.5" /> + Batch Select Products
          </button>
        </div>
      </div>

      {/* Bottom Grid: Business Justification + Estimated Budget Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-purple-600" /> Business Justification & Notes
          </h2>
          <textarea
            rows={4}
            value={purposeJustification}
            onChange={(e) => setPurposeJustification(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" /> Requisition Budget Estimate Summary
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Department Allocated Quarterly Budget:</span>
              <span className="font-bold text-slate-800">{currency.symbol}2,50,000.00</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Requisition Total Estimated Budget:</span>
              <span className="font-extrabold text-purple-700 text-sm">{currency.symbol}{totalEstimatedBudget.toFixed(2)}</span>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-purple-600" /> Budget Available
              </div>
              <div>Submitting this requisition will route it to your Department Manager for approval. Approved items can be sent for vendor quotes (RFQ) or converted into Purchase Orders.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BATCH SELECT PRODUCTS MODAL ── */}
      {isMultiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <span>Batch Select Catalog Products for Requisition</span>
                </h3>
                <p className="text-[11px] text-slate-500">Check all products to add into this purchase request simultaneously</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={multiSearch}
                  onChange={(e) => setMultiSearch(e.target.value)}
                  className="w-full pl-8 pr-3 h-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {distinctCategories.length > 0 && (
                <select
                  value={multiCategory}
                  onChange={(e) => setMultiCategory(e.target.value)}
                  className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none"
                >
                  <option value="">All Categories ({distinctCategories.length})</option>
                  {distinctCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-8 text-[11px] font-bold px-2.5 rounded-xl"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 text-[11px] text-slate-500 px-2 rounded-xl"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-100">
              {filteredMultiProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No products found matching "{multiSearch}"
                </div>
              ) : (
                filteredMultiProducts.map((prod) => {
                  const isChecked = selectedProductIds.has(prod.id);
                  const price = Number(prod.cost_price) || Number(prod.purchase_price) || Number(prod.selling_price) || Number(prod.mrp) || 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleSelectProduct(prod.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        isChecked ? "bg-purple-50/80 border border-purple-200" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-purple-600 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="size-5 fill-purple-100" />
                          ) : (
                            <Square className="size-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{prod.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                            <span>SKU: {prod.sku || "—"}</span>
                            <span>• In Stock: {prod.stock ?? 0} {prod.uom || "Pcs"}</span>
                            {prod.category && <span>• Category: {prod.category}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900">{formatCurrency(price)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-700">
                {selectedProductIds.size} Items Selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMultiModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddSelectedProducts}
                  disabled={selectedProductIds.size === 0}
                  className="bg-purple-700 hover:bg-purple-800 text-white border-0 font-bold text-xs rounded-xl shadow-md"
                >
                  + Add {selectedProductIds.size} Products to Requisition
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
