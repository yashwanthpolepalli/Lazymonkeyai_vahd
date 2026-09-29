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
  CreditCard,
  Package,
  Receipt,
  Truck,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  Upload,
  ScanLine,
  Loader2,
  AlertCircle,
  RefreshCw,
  Boxes,
  Check,
  Minus,
  Search,
  X,
  Layers,
  Tag,
  Filter,
  MapPin
} from "lucide-react";
import { useStoreLocations } from "@/hooks/use-store-locations";
import { inventoryApi, posApi } from "@/lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { ProcurementShareModal } from "./ProcurementShareModal";
import { AddVendorModal } from "./AddVendorModal";

export type ProcurementDocType = "PR" | "PO" | "PINV";

interface ProcurementItem {
  id: string;
  product_id?: string;
  product_name: string;
  hsn_code?: string;
  uom?: string;
  batch_number?: string;
  expiry_date?: string;
  mfg_date?: string;
  mrp: number;
  quantity: number;
  unit_price: number;
  tax_inclusive_rate?: number;
  tax_exclusive_rate?: number;
  discount_value: number;
  discount_type: "percent" | "amount";
  tax_rate: number;
}

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

interface ProcurementDocumentFormProps {
  docType: ProcurementDocType;
  onClose: () => void;
  onSaved?: () => void;
  initialData?: any;
}

export const findMatchingInventoryProduct = (
  name: string,
  sku?: string,
  barcode?: string,
  hsn?: string,
  productList: any[] = []
): any | undefined => {
  if (!name && !sku && !barcode) return undefined;
  const cleanName = (name || "").toLowerCase().trim();
  const cleanSku = (sku || "").toLowerCase().trim();
  const cleanBarcode = (barcode || "").trim();

  // 1. Exact Barcode Match
  if (cleanBarcode) {
    const bMatch = productList.find(p => (p.barcode || "").trim() === cleanBarcode);
    if (bMatch) return bMatch;
  }

  // 2. Exact SKU Match
  if (cleanSku) {
    const sMatch = productList.find(p => (p.sku || "").toLowerCase().trim() === cleanSku);
    if (sMatch) return sMatch;
  }

  if (!cleanName) return undefined;

  // 3. Exact Name Match
  const exactName = productList.find(p => p.name?.toLowerCase().trim() === cleanName);
  if (exactName) return exactName;

  // 4. Normalized Alphanumeric Match
  const normName = cleanName.replace(/[^a-z0-9]/g, "");
  if (normName.length >= 4) {
    const normMatch = productList.find(p => {
      const pNorm = (p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return pNorm === normName;
    });
    if (normMatch) return normMatch;
  }

  // 5. Significant Token Overlap (e.g. AP APEX AB2 1 LT -> ASIAN PAINTS APEX AB2 1L)
  const noise = new Set(["lt", "ltr", "litre", "litres", "kg", "kgs", "gm", "gms", "ml", "no", "nos", "pcs", "box", "pack"]);
  const queryTokens = cleanName.split(/[\s\-/,()]+/).filter(t => t.length >= 2 && !noise.has(t));
  if (queryTokens.length >= 2) {
    let bestMatch: any = null;
    let bestScore = 0;
    for (const p of productList) {
      const pTokens = (p.name || "").toLowerCase().split(/[\s\-/,()]+/).filter((t: string) => t.length >= 2);
      let matchCount = 0;
      for (const q of queryTokens) {
        if (pTokens.some((pt: string) => pt === q || pt.includes(q) || q.includes(pt))) {
          matchCount++;
        }
      }
      const score = matchCount / queryTokens.length;
      if (score >= 0.65 && score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }
    if (bestMatch) return bestMatch;
  }

  return undefined;
};

export function ProcurementDocumentForm({ docType, onClose, onSaved, initialData }: ProcurementDocumentFormProps) {
    const { currency, formatCurrency } = useCurrency();
  // Master data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);

  // Multi-Product Selection Modal State
  const [isMultiProductModalOpen, setIsMultiProductModalOpen] = useState<boolean>(false);
  const [multiProductSearch, setMultiProductSearch] = useState<string>("");
  const [selectedProductQuantities, setSelectedProductQuantities] = useState<Record<string, number>>({});
  const [shareModalDoc, setShareModalDoc] = useState<any | null>(null);

  // Quick Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>("");
  const [newProdSku, setNewProdSku] = useState<string>("");
  const [newProdBarcode, setNewProdBarcode] = useState<string>("");
  const [newProdHsn, setNewProdHsn] = useState<string>("2202");
  const [newProdCostPrice, setNewProdCostPrice] = useState<number | "">("");
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<number | "">("");
  const [newProdMrp, setNewProdMrp] = useState<number | "">("");
  const [newProdTax, setNewProdTax] = useState<number>(18);
  const [newProdStock, setNewProdStock] = useState<number | "">("");
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);

  // Form State
  const { stores, selectedStore, setSelectedStore } = useStoreLocations();
  const [selectedLocation, setSelectedLocation] = useState<string>(() => selectedStore);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [docNumber, setDocNumber] = useState<string>("");
  const [originalRefNo, setOriginalRefNo] = useState<string>("");
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (selectedStore && (!selectedLocation || selectedLocation.includes("Main Store"))) {
      setSelectedLocation(selectedStore);
    }
  }, [selectedStore]);
  const [showDueDate, setShowDueDate] = useState<boolean>(false);
  const [paymentTerms, setPaymentTerms] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [notes, setNotes] = useState<string>(
    docType === "PR"
      ? "1. Material required for quarterly inventory stock replenishment.\n2. Inspection required upon delivery."
      : "1. Goods once supplied will be inspected against PO specifications.\n2. All disputes subject to local jurisdiction."
  );

  // Line items & Tax Mode
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);

  // Additional Charges & Rounding
  const [customCharges, setCustomCharges] = useState<AdditionalCharge[]>([]);
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(true);
  const [amountPaid, setAmountPaid] = useState<number | "">(0);

  // Add Party Modal
  const [isAddVendorOpen, setIsAddVendorOpen] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>("");
  const [newVendorPhone, setNewVendorPhone] = useState<string>("");
  const [newVendorGST, setNewVendorGST] = useState<string>("");

  // Linked Sourcing Sync
  const [approvedPRs, setApprovedPRs] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [linkedPrId, setLinkedPrId] = useState<string>("");
  const [linkedRfqId, setLinkedRfqId] = useState<string>("");
  // For PINV: linked PO selection & 3-way match GRN
  const [linkedPoId, setLinkedPoId] = useState<string>("");
  const [grns, setGrns] = useState<any[]>([]);
  const [linkedGrnId, setLinkedGrnId] = useState<string>("");
  const [isEnterprise3WayMatch, setIsEnterprise3WayMatch] = useState<boolean>(Boolean(initialData?.purchase_order_id || initialData?.grn_id));
  // OCR upload state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [selectedOcrInvoiceIdx, setSelectedOcrInvoiceIdx] = useState<number>(0);
  // PO / PINV status update state
  const [currentPoStatus, setCurrentPoStatus] = useState<string>(docType === "PINV" ? "Paid" : "Draft");
  // GRN received date state
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const combined: any[] = [];
      const idSet = new Set<string>();

      try {
        const invRes: any = await inventoryApi.getProducts({ page_size: 1000 });
        const invItems = invRes?.items || (Array.isArray(invRes) ? invRes : []);
        if (Array.isArray(invItems)) {
          invItems.forEach((p: any) => {
            if (p && p.id && !idSet.has(String(p.id))) {
              idSet.add(String(p.id));
              combined.push({
                ...p,
                stock: p.stock ?? p.initial_stock ?? p.stock_quantity ?? 0,
                price: p.purchase_price ?? p.cost_price ?? p.selling_price ?? p.price ?? p.mrp ?? 0,
                cost_price: p.cost_price ?? p.purchase_price ?? p.selling_price ?? 0,
              });
            }
          });
        }
      } catch (e) {
        console.warn("inventoryApi.getProducts error:", e);
      }

      try {
        const posRes: any = await posApi.getProducts();
        const posItems = posRes?.items || (Array.isArray(posRes) ? posRes : []);
        if (Array.isArray(posItems)) {
          posItems.forEach((p: any) => {
            if (p && p.id && !idSet.has(String(p.id))) {
              idSet.add(String(p.id));
              combined.push({
                ...p,
                stock: p.stock ?? p.initial_stock ?? p.stock_quantity ?? 0,
                price: p.purchase_price ?? p.cost_price ?? p.selling_price ?? p.price ?? p.mrp ?? 0,
                cost_price: p.cost_price ?? p.purchase_price ?? p.selling_price ?? 0,
              });
            }
          });
        }
      } catch (e) {
        console.warn("posApi.getProducts error:", e);
      }

      setProducts(combined);
      return combined;
    } catch (err) {
      console.error("Failed to load products for procurement:", err);
      return [];
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const supps = await inventoryApi.getSuppliers().catch(() => []);
        setSuppliers(supps || []);

        const loadedProds = await loadProducts();

        const prs = await inventoryApi.getPurchaseRequests().catch(() => []);
        setApprovedPRs(prs || []);

        const quotations = await inventoryApi.getPurchaseQuotations().catch(() => []);
        setRfqs(quotations || []);

        const pos = await inventoryApi.getPurchaseOrders().catch(() => []);
        setPurchaseOrders(pos || []);

        const grnList = await inventoryApi.getGoodsReceivedNotes().catch(() => []);
        setGrns(grnList || []);

        if (initialData) {
          setDocNumber(initialData.order_number || initialData.po_number || initialData.bill_number || initialData.id || "DOC-2026-0001");
          if (initialData.supplier_id) setSelectedSupplierId(initialData.supplier_id);
          if (initialData.purchase_order_id) setLinkedPoId(initialData.purchase_order_id);
          if (initialData.grn_id) setLinkedGrnId(initialData.grn_id);
          if (initialData.notes) setNotes(initialData.notes);
          if (initialData.status) setCurrentPoStatus(initialData.status);
          if (initialData.delivery_date) setDueDate(new Date(initialData.delivery_date).toISOString().slice(0, 10));
          if (initialData.paid_amount !== undefined) setAmountPaid(Number(initialData.paid_amount) || 0);

          // If opened via shortcut with PO/GRN but without pre-rendered items, auto-sync from PO/GRN
          if (initialData.purchase_order_id && (!initialData.items || initialData.items.length === 0)) {
            const po = pos.find((p: any) => p.id === initialData.purchase_order_id);
            if (po) {
              if (po.supplier_id) setSelectedSupplierId(po.supplier_id);
              if (po.items && po.items.length > 0) {
                setItems(
                  po.items.map((it: any) => {
                    const prod = loadedProds.find((p: any) => p.id === it.product_id);
                    return {
                      id: Math.random().toString(36).substring(2, 9),
                      product_id: it.product_id,
                      product_name: it.product_name || prod?.name || "Material Item",
                      hsn_code: prod?.hsn_code || "2202",
                      mrp: prod?.mrp || prod?.selling_price || 0,
                      quantity: Number(it.quantity) || 1,
                      unit_price: Number(it.unit_price) || prod?.cost_price || 0,
                      discount_value: 0,
                      discount_type: "percent",
                      tax_rate: Number(it.tax_percent) || prod?.gst || 18,
                    };
                  })
                );
              }
            }
          }

          if (initialData.grn_id && (!initialData.items || initialData.items.length === 0)) {
            const grn = grnList.find((g: any) => g.id === initialData.grn_id);
            if (grn && grn.items && grn.items.length > 0) {
              setItems(
                grn.items.map((it: any) => {
                  const prod = loadedProds.find((p: any) => p.id === it.product_id);
                  const acceptedQty = Number(it.quantity_accepted) || Number(it.quantity_received) || 1;
                  return {
                    id: Math.random().toString(36).substring(2, 9),
                    product_id: it.product_id,
                    product_name: it.product_name || prod?.name || "Material Item",
                    hsn_code: prod?.hsn_code || "2202",
                    mrp: prod?.mrp || prod?.selling_price || 0,
                    quantity: acceptedQty,
                    unit_price: prod?.cost_price || prod?.purchase_price || 0,
                    discount_value: 0,
                    discount_type: "percent",
                    tax_rate: prod?.gst || 18,
                  };
                })
              );
            }
          }
          if (initialData.items && initialData.items.length > 0) {
            setItems(initialData.items.map((it: any, idx: number) => {
              const pName = it.product_name || it.name || "";
              const foundProd = (it.product_id ? loadedProds.find((p: any) => p.id === it.product_id) : undefined) ||
                findMatchingInventoryProduct(pName, it.sku, it.barcode, it.hsn_code, loadedProds);
              const price = Number(it.unit_price || it.estimated_unit_cost || it.cost_price || it.mrp || it.selling_price || it.price) 
                || (foundProd ? (Number((foundProd as any).cost_price) || Number((foundProd as any).selling_price) || Number(foundProd.mrp) || Number((foundProd as any).wholesale_price) || 0) : 0);
              const mrpVal = Number(it.mrp) || (foundProd ? Number(foundProd.mrp) : 0) || price;

              return {
                id: it.id || String(idx + 1),
                product_id: it.product_id || foundProd?.id,
                product_name: pName || foundProd?.name || "Purchased Product",
                hsn_code: it.hsn_code || (foundProd as any)?.hsn_code || "2202",
                mrp: mrpVal,
                quantity: Number(it.quantity) || 1,
                unit_price: price,
                discount_value: Number(it.discount_value) || 0,
                discount_type: "percent",
                tax_rate: Number(it.tax_rate) || 18
              };
            }));
          }
        } else {
          if (supps && supps.length > 0) {
            setSelectedSupplierId(supps[0].id);
          }
          const prefix = docType === "PR" ? "PR-2026-" : docType === "PO" ? "PO-2026-" : "PINV-2026-";
          const randomSeq = Math.floor(1000 + Math.random() * 9000);
          setDocNumber(`${prefix}${randomSeq}`);
        }
      } catch (err) {
        console.error("Error initializing procurement form data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [docType, initialData]);

  const handleSelectPRLink = (prId: string) => {
    setLinkedPrId(prId);
    setLinkedRfqId("");
    const pr = approvedPRs.find((p) => p.id === prId);
    if (pr && pr.items && pr.items.length > 0) {
      if (pr.supplier_id) setSelectedSupplierId(pr.supplier_id);
      setItems(
        pr.items.map((it: any) => {
          const prod = products.find((p) => p.id === it.product_id);
          return {
            id: Math.random().toString(36).substring(2, 9),
            product_id: it.product_id,
            product_name: it.product_name || prod?.name || "Material Item",
            hsn_code: prod?.hsn_code || "2202",
            mrp: prod?.mrp || prod?.selling_price || 0,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.estimated_price) || prod?.cost_price || prod?.selling_price || 0,
            discount_value: 0,
            discount_type: "percent",
            tax_rate: prod?.gst || 18,
          };
        })
      );
      toast.success(`Synced ${pr.items.length} line items from Approved ${pr.request_number}!`);
    }
  };

  const handleSelectRFQLink = (rfqId: string) => {
    setLinkedRfqId(rfqId);
    setLinkedPrId("");
    const rfq = rfqs.find((q) => q.id === rfqId);
    if (rfq) {
      if (rfq.supplier_id) setSelectedSupplierId(rfq.supplier_id);
      if (rfq.items && rfq.items.length > 0) {
        setItems(
          rfq.items.map((it: any) => {
            const prod = products.find((p) => p.id === it.product_id);
            return {
              id: Math.random().toString(36).substring(2, 9),
              product_id: it.product_id,
              product_name: it.product_name || prod?.name || "Material Item",
              hsn_code: prod?.hsn_code || "2202",
              mrp: prod?.mrp || prod?.selling_price || 0,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || prod?.cost_price || 0,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: prod?.gst || 18,
            };
          })
        );
        toast.success(`Synced ${rfq.items.length} line items from Awarded RFQ ${rfq.quotation_number}!`);
      }
    }
  };

  const handleSelectPOLink = (poId: string) => {
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
              hsn_code: prod?.hsn_code || "2202",
              mrp: prod?.mrp || prod?.selling_price || 0,
              quantity: Number(it.quantity) || 1,
              unit_price: Number(it.unit_price) || prod?.cost_price || 0,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: Number(it.tax_percent) || prod?.gst || 18,
            };
          })
        );
      }
      // Auto-find matching Verified GRN for this PO
      const matchingGrn = grns.find((g) => g.purchase_order_id === poId && g.status === "Verified") 
        || grns.find((g) => g.purchase_order_id === poId);
      if (matchingGrn) {
        setLinkedGrnId(matchingGrn.id);
        toast.success(`Synced from PO ${po.po_number || poId.slice(0, 8)} & 3-way matched to GRN ${matchingGrn.grn_number}!`);
      } else {
        setLinkedGrnId("");
        toast.info(`Synced PO ${po.po_number || poId.slice(0, 8)}. No verified GRN found yet for this PO.`);
      }
    }
  };

  const handleSelectGRNLink = (grnId: string) => {
    setLinkedGrnId(grnId);
    const grn = grns.find((g) => g.id === grnId);
    if (grn) {
      if (grn.purchase_order_id && !linkedPoId) {
        setLinkedPoId(grn.purchase_order_id);
        const po = purchaseOrders.find((p) => p.id === grn.purchase_order_id);
        if (po && po.supplier_id) setSelectedSupplierId(po.supplier_id);
      }
      if (grn.items && grn.items.length > 0) {
        setItems(
          grn.items.map((it: any) => {
            const prod = products.find((p) => p.id === it.product_id);
            const acceptedQty = Number(it.quantity_accepted) || Number(it.quantity_received) || 1;
            return {
              id: Math.random().toString(36).substring(2, 9),
              product_id: it.product_id,
              product_name: it.product_name || prod?.name || "Material Item",
              hsn_code: prod?.hsn_code || "2202",
              mrp: prod?.mrp || prod?.selling_price || 0,
              quantity: acceptedQty,
              unit_price: prod?.cost_price || prod?.purchase_price || 0,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: prod?.gst || 18,
            };
          })
        );
        toast.success(`Loaded verified quantities from GRN ${grn.grn_number}!`);
      }
    }
  };

  // Selected supplier details
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Line item handlers
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_name: "",
        hsn_code: "",
        batch_number: "",
        expiry_date: "",
        mfg_date: "",
        mrp: 0,
        quantity: 1,
        unit_price: 0,
        discount_value: 0,
        discount_type: "percent",
        tax_rate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, field: keyof ProcurementItem, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          if (field === "product_id" && value) {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.product_name = product.name;
              updated.hsn_code = product.hsn_code || "2202";
              updated.mrp = product.mrp || product.selling_price || 0;
              updated.unit_price = product.cost_price || product.selling_price || 0;
              updated.tax_rate = product.tax_percent || 18;
            }
          }
          return updated;
        }
        return it;
      })
    );
  };

  // Multi-Product Selection Handlers
  const toggleMultiSelectProduct = (productId: string) => {
    setSelectedProductQuantities((prev) => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = 1;
      }
      return copy;
    });
  };

  const updateMultiSelectQty = (productId: string, delta: number) => {
    setSelectedProductQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleAddSelectedProductsToItems = () => {
    const selectedIds = Object.keys(selectedProductQuantities);
    if (selectedIds.length === 0) {
      toast.error("Please select at least one product.");
      return;
    }

    const newItems: ProcurementItem[] = [];
    selectedIds.forEach((pid) => {
      const prod = products.find((p) => String(p.id) === String(pid));
      if (prod) {
        const qty = Math.max(1, Number(selectedProductQuantities[pid]) || 1);
        const costPrice = Number((prod as any).purchase_price || (prod as any).cost_price || prod.selling_price || prod.price || prod.mrp || 0);
        const mrpVal = Number(prod.mrp || prod.selling_price || costPrice || 0);

        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          product_id: prod.id,
          product_name: prod.name,
          hsn_code: prod.hsn_code || "2202",
          uom: (prod as any).uom_name || "Nos",
          batch_number: `B-${Date.now().toString().slice(-4)}`,
          mrp: mrpVal,
          quantity: qty,
          unit_price: costPrice,
          tax_inclusive_rate: mrpVal,
          tax_exclusive_rate: costPrice,
          discount_value: 0,
          discount_type: "percent",
          tax_rate: prod.tax_percent || (prod as any).gst || 18,
        });
      }
    });

    setItems((prev) => {
      const filteredPrev = prev.filter((it) => it.product_id || (it.product_name && it.product_name.trim().length > 0));
      return [...filteredPrev, ...newItems];
    });

    toast.success(`Added ${newItems.length} product(s) to line items!`);
    setSelectedProductQuantities({});
    setIsMultiProductModalOpen(false);
  };

  // Quick Create New Product Modal Handler
  const handleCreateProductAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      toast.error("Product name is required");
      return;
    }
    setIsCreatingProduct(true);
    try {
      const costVal = Number(newProdCostPrice) || Number(newProdSellingPrice) || 0;
      const sellingVal = Number(newProdSellingPrice) || costVal;
      const mrpVal = Number(newProdMrp) || sellingVal;
      const skuVal = newProdSku.trim() || `SKU-${Date.now().toString().slice(-4)}`;
      const barcodeVal = newProdBarcode.trim() || `BC-${Date.now().toString().slice(-4)}`;

      const created = await inventoryApi.createProduct({
        name: newProdName.trim(),
        sku: skuVal,
        barcode: barcodeVal,
        hsn_code: newProdHsn.trim() || "2202",
        purchase_price: costVal,
        cost_price: costVal,
        selling_price: sellingVal,
        mrp: mrpVal,
        tax_percent: newProdTax,
        initial_stock: Number(newProdStock) || 0,
        status: "active"
      });

      const newProdObj = {
        ...created,
        stock: Number(newProdStock) || 0,
        price: costVal,
        cost_price: costVal,
      };

      setProducts((prev) => [newProdObj, ...prev]);

      setItems((prev) => [
        ...prev.filter((it) => it.product_id || (it.product_name && it.product_name.trim().length > 0)),
        {
          id: Math.random().toString(36).substring(2, 9),
          product_id: created.id,
          product_name: created.name,
          hsn_code: created.hsn_code || "2202",
          uom: "Nos",
          batch_number: `B-${Date.now().toString().slice(-4)}`,
          mrp: mrpVal,
          quantity: 1,
          unit_price: costVal,
          discount_value: 0,
          discount_type: "percent",
          tax_rate: newProdTax,
        }
      ]);

      toast.success(`Created "${created.name}" and added to invoice!`);
      setIsAddProductModalOpen(false);
      setNewProdName("");
      setNewProdSku("");
      setNewProdBarcode("");
      setNewProdCostPrice("");
      setNewProdSellingPrice("");
      setNewProdMrp("");
      setNewProdStock("");
    } catch (err: any) {
      toast.error("Failed to create product: " + (err?.detail || err?.message || "Unknown error"));
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Barcode Submit Handler
  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim() !== "") {
      const code = barcodeInput.trim().toLowerCase();
      const product = products.find((p) =>
        (p.barcode && p.barcode.toLowerCase() === code) ||
        (p.sku && p.sku.toLowerCase() === code) ||
        (p.name && p.name.toLowerCase() === code)
      );

      if (product) {
        const costPrice = Number((product as any).purchase_price || (product as any).cost_price || product.selling_price || product.price || product.mrp || 0);
        const mrpVal = Number(product.mrp || product.selling_price || costPrice || 0);

        // If product already in items, increment qty
        const existingIdx = items.findIndex((it) => it.product_id === product.id);
        if (existingIdx !== -1) {
          const updated = [...items];
          updated[existingIdx].quantity += 1;
          setItems(updated);
          toast.success(`Incremented quantity for ${product.name} (Qty: ${updated[existingIdx].quantity})`);
        } else {
          setItems((prev) => [
            ...prev.filter((it) => it.product_id || (it.product_name && it.product_name.trim().length > 0)),
            {
              id: Math.random().toString(36).substring(2, 9),
              product_id: product.id,
              product_name: product.name,
              hsn_code: product.hsn_code || "2202",
              batch_number: `B-${Date.now().toString().slice(-4)}`,
              mrp: mrpVal,
              quantity: 1,
              unit_price: costPrice,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: product.tax_percent || (product as any).gst || 18,
            },
          ]);
          toast.success(`Added ${product.name} to list`);
        }
        setBarcodeInput("");
        return;
      }

      // External Barcode Lookup
      try {
        toast.info(`Searching barcode ${barcodeInput.trim()}...`);
        const res = await posApi.lookupBarcode(barcodeInput.trim());
        if (res && res.success && res.product) {
          const p = res.product;
          const costPrice = Number(p.purchase_price || p.cost_price || p.selling_price || p.price || p.mrp || 0);
          setItems((prev) => [
            ...prev.filter((it) => it.product_id || (it.product_name && it.product_name.trim().length > 0)),
            {
              id: Math.random().toString(36).substring(2, 9),
              product_id: p.id,
              product_name: p.name,
              hsn_code: p.hsn_code || "2202",
              mrp: p.mrp || p.selling_price || costPrice || 0,
              quantity: 1,
              unit_price: costPrice,
              discount_value: 0,
              discount_type: "percent",
              tax_rate: p.gst || p.tax_percent || 18,
            },
          ]);
          toast.success(`Found & Added: ${p.name}`);
          setBarcodeInput("");
        } else {
          toast.error("Barcode not found in catalog");
        }
      } catch (err: any) {
        toast.error("Barcode search error");
      }
    }
  };

  // Additional Charges
  const handleAddCharge = () => {
    setCustomCharges([
      ...customCharges,
      { id: Math.random().toString(36).substring(2, 9), name: "Freight / Transport Charges", amount: 0 },
    ]);
  };

  const handleUpdateCharge = (id: string, field: "name" | "amount", value: any) => {
    setCustomCharges(
      customCharges.map((c) => (c.id === id ? { ...c, [field]: field === "amount" ? Number(value) || 0 : value } : c))
    );
  };

  const handleDeleteCharge = (id: string) => {
    setCustomCharges(customCharges.filter((c) => c.id !== id));
  };

  // Financial Calculations
  let subtotal = 0;
  let totalTax = 0;

  items.forEach((it) => {
    const rawLine = it.quantity * it.unit_price;
    const dAmt =
      it.discount_type === "percent"
        ? rawLine * (it.discount_value / 100)
        : Math.min(it.discount_value, rawLine);
    const lineEffective = Math.max(0, rawLine - dAmt);

    if (isTaxInclusive) {
      // Rates already include tax (Gross Pricing Mode)
      const lineTaxable = lineEffective / (1 + (it.tax_rate || 0) / 100);
      const lineTax = lineEffective - lineTaxable;
      subtotal += lineTaxable;
      totalTax += lineTax;
    } else {
      // Rates exclude tax (Base Pricing Mode)
      const lineTaxable = lineEffective;
      const lineTax = lineTaxable * ((it.tax_rate || 0) / 100);
      subtotal += lineTaxable;
      totalTax += lineTax;
    }
  });

  const additionalChargesTotal = customCharges.reduce((acc, c) => acc + c.amount, 0);
  const rawTotal = subtotal + totalTax + additionalChargesTotal;
  const roundedTotal = autoRoundOff ? Math.round(rawTotal * 100) / 100 : rawTotal;
  const roundOffAmount = roundedTotal - rawTotal;
  
  // Auto-sync amountPaid if status is Paid
  const paidVal = currentPoStatus === "Paid" ? roundedTotal : (typeof amountPaid === "number" ? amountPaid : 0);
  const balanceDue = Math.max(0, roundedTotal - paidVal);

  const getCurrentDocumentData = () => {
    const selectedSupp = suppliers.find((s) => s.id === selectedSupplierId);
    return {
      bill_number: docNumber,
      po_number: docNumber,
      request_number: docNumber,
      supplier_name: selectedSupp?.name || "Vendor Partner",
      supplier_phone: selectedSupp?.phone || selectedSupp?.contacts?.[0]?.phone || "",
      supplier_email: selectedSupp?.email || selectedSupp?.contacts?.[0]?.email || "",
      supplier: selectedSupp,
      bill_date: docDate,
      order_date: docDate,
      due_date: dueDate,
      total_amount: roundedTotal,
      paid_amount: paidVal,
      status: docType === "PINV" ? (currentPoStatus === "Paid" ? "Paid" : "Unpaid") : (currentPoStatus || "Draft"),
      items: items.map((it) => ({
        product_name: it.product_name || "Material Item",
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        tax_percent: Number(it.tax_rate) || 0,
      })),
    };
  };

  // Submit Handler
  const handleSaveDocument = async () => {
    if (items.length === 0) return toast.error("Please add at least one item to the document.");
    if (docType !== "PR" && !selectedSupplierId) return toast.error("Please select a vendor/supplier party.");

    setIsSaving(true);
    try {
      // 1. Ensure supplier_id is a valid UUID
      let supplierIdToUse = selectedSupplierId;
      if (docType !== "PR" && selectedSupplierId) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedSupplierId);
        if (!isUUID) {
          const tempSupp = suppliers.find((s) => s.id === selectedSupplierId);
          const suppName = tempSupp?.name || "Vendor Partner";
          const codeSeq = Math.floor(1000 + Math.random() * 9000);
          const code = `VEN-${Date.now().toString().slice(-4)}-${codeSeq}`;
          const createdSupp = await inventoryApi.createSupplier({
            name: suppName,
            code: code,
            type: "Manufacturer",
            company_name: suppName,
            credit_limit: 500000,
            rating: 5.0,
            status: "Active",
            products_desc: tempSupp?.tax_number ? `GSTIN: ${tempSupp.tax_number}` : undefined,
          });
          supplierIdToUse = createdSupp.id;
          setSelectedSupplierId(createdSupp.id);
          setSuppliers((prev) => [createdSupp, ...prev.filter((p) => p.id !== selectedSupplierId)]);
        }
      }

      // Helper to ensure line items have a valid UUID product_id
      const resolvedItems = await Promise.all(
        items.map(async (it) => {
          let pId = it.product_id;
          const isProdUUID = pId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId);
          if (!isProdUUID) {
            // Find in loaded products
            const existingProd = products.find(
              (p) => p.id === pId || p.name.toLowerCase() === (it.product_name || "").toLowerCase()
            );
            if (existingProd) {
              pId = existingProd.id;
            } else if (products.length > 0) {
              pId = products[0].id;
            } else {
              // Create product on the fly if inventory is empty
              const created = await inventoryApi.createProduct({
                name: (it.product_name || "Procured Item").trim(),
                hsn_code: it.hsn_code || "32091090",
                purchase_price: Number(it.unit_price) || 0,
                mrp: Number(it.mrp) || Number(it.unit_price) || 0,
                selling_price: Number(it.mrp) || Number(it.unit_price) || 0,
                tax_percent: Number(it.tax_rate) || 18,
                status: "active",
              });
              pId = created.id;
              setProducts((prev) => [created, ...prev]);
            }
          }
          return {
            product_id: pId,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            tax_percent: Number(it.tax_rate) || 18,
            estimated_price: Number(it.unit_price) || 0,
          };
        })
      );

      if (docType === "PR") {
        const requesterId = "00000000-0000-0000-0000-000000000000";
        await inventoryApi.createPurchaseRequest({
          request_number: docNumber,
          requester_id: requesterId,
          items: resolvedItems.map((it) => ({
            product_id: it.product_id,
            quantity: it.quantity,
            estimated_price: it.estimated_price,
          })),
        });
        toast.success(`Purchase Requisition ${docNumber} created successfully!`);
      } else if (docType === "PO") {
        if (linkedPrId) {
          const linkedPr = approvedPRs.find((pr) => pr.id === linkedPrId);
          if (linkedPr && linkedPr.status !== "Approved") {
            toast.error("Linked PR is not approved yet. Only Approved PRs can generate official POs.");
            setIsSaving(false);
            return;
          }
        }
        if (initialData?.id) {
          await inventoryApi.updatePurchaseOrderStatus(initialData.id, currentPoStatus || "Draft");
          toast.success(`Purchase Order ${docNumber} updated successfully!`);
        } else {
          await inventoryApi.createPurchaseOrder({
            po_number: docNumber,
            supplier_id: supplierIdToUse,
            purchase_request_id: linkedPrId || undefined,
            delivery_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            status: currentPoStatus || "Draft",
            items: resolvedItems.map((it) => ({
              product_id: it.product_id,
              quantity: it.quantity,
              unit_price: it.unit_price,
              tax_percent: it.tax_percent,
            })),
          });
          toast.success(`Purchase Order ${docNumber} created as ${currentPoStatus || "Draft"}!`);
        }
      } else {
        // PINV: Purchase Invoice / Vendor Bill
        let poIdToUse = linkedPoId;
        if (!poIdToUse) {
          const createdPo = await inventoryApi.createPurchaseOrder({
            po_number: `PO-${docNumber.replace(/^PINV-/, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
            supplier_id: supplierIdToUse,
            delivery_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            status: currentPoStatus === "Paid" ? "Billed" : (currentPoStatus || "Received"),
            items: resolvedItems.map((it) => ({
              product_id: it.product_id,
              quantity: it.quantity,
              unit_price: it.unit_price,
              tax_percent: it.tax_percent,
            })),
          });
          poIdToUse = createdPo.id;
        }

        const isPaid = currentPoStatus === "Paid" || Number(paidVal) >= roundedTotal;
        const finalPaidAmount = isPaid ? roundedTotal : Number(paidVal);
        const billStatus = isPaid ? "Paid" : (finalPaidAmount > 0 ? "Partial" : (currentPoStatus || "Unpaid"));

        await inventoryApi.createVendorBill({
          bill_number: docNumber,
          purchase_order_id: poIdToUse,
          grn_id: linkedGrnId || undefined,
          total_amount: roundedTotal,
          paid_amount: finalPaidAmount,
          status: billStatus,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
        toast.success(`Purchase Invoice ${docNumber} recorded successfully (Status: ${billStatus})!`);
      }

      if (onSaved) onSaved();
      // Show post-save PDF & dispatch modal
      setShareModalDoc(getCurrentDocumentData());
    } catch (err: any) {
      toast.error(err.message || "Failed to save procurement document");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to load a selected invoice (supports multi-page PDFs)
  const applyOcrInvoice = (data: any) => {
    if (!data) return;

    if (data.po_number && docType === "PO") {
      setDocNumber(data.po_number);
    }
    if (data.invoice_number || data.bill_number) {
      if (docType === "PINV") setDocNumber(data.bill_number || data.invoice_number);
      else if (docType === "PO" && !data.po_number) setDocNumber(data.invoice_number || data.bill_number);
    }
    if (data.supplier_name) {
      const matchedSupplier = suppliers.find((s) =>
        s.name.toLowerCase().includes(data.supplier_name.toLowerCase()) ||
        data.supplier_name.toLowerCase().includes(s.name.toLowerCase())
      );
      if (matchedSupplier) {
        setSelectedSupplierId(matchedSupplier.id);
      }
    }
    if (data.delivery_date && docType === "PO") {
      setDueDate(data.delivery_date);
    }
    if (data.due_date) {
      setDueDate(data.due_date);
    }
    if (data.invoice_date) {
      setDocDate(data.invoice_date);
    }
    if (data.items && data.items.length > 0) {
      setItems(data.items.map((it: any) => {
        const pName = it.product_name || "Extracted Item";
        const foundProd = findMatchingInventoryProduct(pName, it.sku, it.barcode, it.hsn_code, products);
        // Default to tax-exclusive base rate so financial totals tally to 100% precision
        const unitPrice = Number(it.unit_price) || Number(it.tax_exclusive_rate) || (foundProd ? Number((foundProd as any).cost_price || (foundProd as any).purchase_price || foundProd.selling_price || 0) : 0);
        const grossPrice = Number(it.tax_inclusive_rate) || Number(it.rate) || (foundProd ? Number(foundProd.mrp) : 0) || unitPrice;
        return {
          id: Math.random().toString(36).substring(2, 9),
          product_id: foundProd?.id,
          product_name: foundProd ? foundProd.name : pName,
          hsn_code: it.hsn_code || foundProd?.hsn_code || "32091090",
          uom: it.uom || (foundProd as any)?.uom_name || "Nos",
          batch_number: it.batch_number || `B-${Math.floor(100 + Math.random() * 900)}`,
          mrp: grossPrice,
          quantity: Number(it.quantity) || 1,
          unit_price: unitPrice,
          tax_inclusive_rate: Number(it.tax_inclusive_rate) || grossPrice,
          tax_exclusive_rate: Number(it.tax_exclusive_rate) || unitPrice,
          discount_value: 0,
          discount_type: "percent",
          tax_rate: Number(it.tax_percent) || foundProd?.tax_percent || 18,
        };
      }));
    }
    if (data.notes) {
      setNotes(data.notes);
    }
  };

  const handleQuickAddLineToInventory = async (item: ProcurementItem) => {
    if (!item.product_name || !item.product_name.trim()) {
      return toast.error("Please enter a product name first");
    }
    try {
      const created = await inventoryApi.createProduct({
        name: item.product_name.trim(),
        hsn_code: item.hsn_code || "32091090",
        purchase_price: Number(item.unit_price) || 0,
        mrp: Number(item.mrp) || Number(item.unit_price) || 0,
        selling_price: Number(item.mrp) || Number(item.unit_price) || 0,
        tax_percent: Number(item.tax_rate) || 18,
        status: "active"
      });
      setProducts(prev => [created, ...prev]);
      updateItem(item.id, "product_id", created.id);
      toast.success(`"${created.name}" created in inventory and linked!`);
    } catch (err: any) {
      toast.error("Failed to add product to inventory: " + (err.detail || err.message || "Unknown error"));
    }
  };

  // OCR Extraction Handlers
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrFile(file);
    setIsExtracting(true);
    setOcrResult(null);
    setSelectedOcrInvoiceIdx(0);

    try {
      let data: any = null;
      if (docType === "PO") {
        data = await inventoryApi.extractPODocumentOCR(file);
      } else if (docType === "PINV") {
        data = await inventoryApi.extractInvoiceDocumentOCR(file);
      } else {
        data = await inventoryApi.extractPRDocumentOCR(file);
      }

      setOcrResult(data);
      toast.success(data.extracted ? "Document data extracted successfully via AI OCR!" : "Could not extract structured data. Please fill manually.");

      // Auto-fill form fields from OCR result (primary invoice or root)
      const primary = (data.invoices && data.invoices.length > 0) ? data.invoices[0] : data;
      applyOcrInvoice(primary);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract document data");
    } finally {
      setIsExtracting(false);
      e.target.value = "";
    }
  };

  const handleClearOcr = () => {
    setOcrFile(null);
    setOcrResult(null);
    setSelectedOcrInvoiceIdx(0);
  };

  // PO Status Update Handler
  const handleUpdatePoStatus = async () => {
    if (docType !== "PO" || !initialData?.id) {
      return toast.error("PO status can only be updated on an existing Purchase Order.");
    }
    if (!currentPoStatus) {
      return toast.error("Please select a status to update.");
    }
    setIsSaving(true);
    try {
      await inventoryApi.updatePurchaseOrder(initialData.id, { status: currentPoStatus });
      toast.success(`PO status updated to "${currentPoStatus}"`);
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update PO status");
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 text-slate-800 space-y-6 max-w-[1600px] mx-auto pb-24">
      {/* Top Header / Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  docType === "PR"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : docType === "PO"
                    ? "bg-blue-100 text-blue-800 border border-blue-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {docType === "PR"
                  ? "Purchase Requisition"
                  : docType === "PO"
                  ? "Purchase Order (PO)"
                  : "Purchase Invoice / Bill"}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {docType === "PR"
                  ? "Create Purchase Requisition"
                  : docType === "PO"
                  ? "Create Purchase Order (PO)"
                  : "Create Purchase Invoice"}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              {docType === "PR"
                ? "Internal departmental stock request. Unit prices are optional estimates until RFQ vendor quotes are awarded."
                : docType === "PO"
                ? "Official binding purchase contract sent to supplier with agreed unit prices and terms."
                : "Record vendor purchase invoices, tax credits, and accounts payable."}
            </p>
          </div>
        </div>

        {/* Top Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShareModalDoc(getCurrentDocumentData())}
            className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileText className="size-3.5 text-teal-600" /> Preview PDF & Share
          </button>
          <button
            disabled={isSaving}
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Linked Sourcing Sync Card for PO */}
      {docType === "PO" && (
        <div className="bg-blue-50/70 rounded-2xl border border-blue-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-blue-900 uppercase tracking-wider">
                Sync & Pre-Fill from Previous Procurement Steps
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                Import supplier & item specifications directly from Approved PRs or Awarded RFQ bids.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-0.5">
                Linked Approved PR
              </label>
              <select
                value={linkedPrId}
                onChange={(e) => handleSelectPRLink(e.target.value)}
                className="w-full md:w-64 h-9 bg-white border border-blue-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">-- Select Approved PR --</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.request_number || pr.id.slice(0, 8)} (Est. {currency.symbol}{pr.total_amount || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-0.5">
                Linked Awarded RFQ
              </label>
              <select
                value={linkedRfqId}
                onChange={(e) => handleSelectRFQLink(e.target.value)}
                className="w-full md:w-64 h-9 bg-white border border-blue-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">-- Select Awarded RFQ --</option>
                {rfqs.map((rfq) => (
                  <option key={rfq.id} value={rfq.id}>
                    {rfq.quotation_number} ({rfq.supplier_name || "Vendor Quote"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Mode Selector for PINV (Direct Purchase vs 3-Way Match) */}
      {docType === "PINV" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shadow-sm ${!isEnterprise3WayMatch ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"}`}>
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Purchase Invoice Type: {!isEnterprise3WayMatch ? "Direct Inward Purchase" : "Enterprise 3-Way Match"}
                  </span>
                  {!isEnterprise3WayMatch ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                      ⚡ Auto-Updates Inventory Stock
                    </span>
                  ) : linkedPoId && linkedGrnId ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-300">
                      ✓ 3-Way Matched
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                      🔗 Linked to PO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {!isEnterprise3WayMatch
                    ? "⚡ Direct Spot Purchase: Line items will automatically credit and increase product stock upon recording this invoice."
                    : "🔗 Enterprise Procurement: Stock was received via Goods Received Note (GRN); this invoice verifies vendor payment."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEnterprise3WayMatch(false);
                  setLinkedPoId("");
                  setLinkedGrnId("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isEnterprise3WayMatch 
                    ? "bg-emerald-600 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ Direct Inward Purchase
              </button>
              <button
                type="button"
                onClick={() => setIsEnterprise3WayMatch(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isEnterprise3WayMatch 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🔗 Link PO & GRN (3-Way)
              </button>
            </div>
          </div>

          {isEnterprise3WayMatch && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-0.5">
                  1. Linked Purchase Order (PO) *
                </label>
                <select
                  value={linkedPoId}
                  onChange={(e) => handleSelectPOLink(e.target.value)}
                  className="w-full h-9 bg-white border border-indigo-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="">-- Select Linked PO --</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number || po.id.slice(0, 8)} ({po.supplier?.name || "Vendor PO"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 block mb-0.5">
                  2. Linked GRN (Stock Receipt)
                </label>
                <select
                  value={linkedGrnId}
                  onChange={(e) => handleSelectGRNLink(e.target.value)}
                  className="w-full h-9 bg-white border border-indigo-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="">-- Select Inward GRN (Optional) --</option>
                  {(linkedPoId ? grns.filter((g) => g.purchase_order_id === linkedPoId) : grns).map((grn) => (
                    <option key={grn.id} value={grn.id}>
                      {grn.grn_number} [{grn.status || "Received"}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OCR Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <ScanLine className="w-4 h-4 text-indigo-600" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Upload Document for {docType === "PO" ? "Purchase Order (PO)" : docType === "PINV" ? "Purchase Invoice (Tax Invoice / Bill)" : "Goods Received Note (GRN)"}
          </h2>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            OCR Auto-Extract
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Upload area */}
          <div className="flex-1">
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all bg-slate-50/50">
              <div className="flex flex-col items-center justify-center pt-3 pb-4">
                <Upload className="w-6 h-6 text-slate-400 mb-1" />
                <p className="text-xs font-medium text-slate-500">
                  {ocrFile ? ocrFile.name : "Drop a PO/GRN document here or click to browse"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports PDF, JPG, PNG (Max 10MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleOcrUpload}
                disabled={isExtracting}
              />
            </label>
          </div>

          {/* OCR Status / Actions */}
          <div className="flex flex-col gap-2 min-w-[160px]">
            {isExtracting && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span className="text-xs font-medium text-indigo-700">Extracting...</span>
              </div>
            )}
            {ocrResult && !isExtracting && (
              <div className="flex flex-col gap-1">
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${ocrResult.extracted ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                  {ocrResult.extracted ? (
                    <><CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-[11px] font-bold text-green-700">Extracted</span></>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px] font-bold text-amber-700">Partial</span></>
                  )}
                </div>
                {ocrResult.confidence && (
                  <span className="text-[10px] text-slate-500 pl-1">
                    Confidence: {Math.round(ocrResult.confidence * 100)}%
                  </span>
                )}
                <button
                  onClick={handleClearOcr}
                  className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2 py-1 transition-all"
                >
                  Clear OCR
                </button>
              </div>
            )}
          </div>
        </div>

        {/* OCR Result Preview & Multi-Invoice Picker */}
        {ocrResult && ocrResult.extracted && (
          <div className="mt-4 space-y-3">
            {/* Multi-Invoice Selector if document has multiple invoices / pages */}
            {ocrResult.invoices && ocrResult.invoices.length > 1 && (
              <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                      {ocrResult.invoices.length} Invoices Detected in Document
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded-full self-start sm:self-auto">
                    Click to load specific invoice & line items
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {ocrResult.invoices.map((inv: any, i: number) => {
                    const isSelected = selectedOcrInvoiceIdx === i;
                    const invNo = inv.invoice_number || inv.po_number || `Page ${inv.page_number || i + 1}`;
                    const invTotal = inv.grand_total || inv.total_amount || 0;
                    const itemCount = inv.items?.length || 0;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedOcrInvoiceIdx(i);
                          applyOcrInvoice(inv);
                          toast.success(`Loaded Invoice #${invNo} (${itemCount} items)`);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400"
                            : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-900"}`}>
                            Invoice #{invNo}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isSelected ? "bg-indigo-700 text-indigo-100" : "bg-indigo-50 text-indigo-700"
                          }`}>
                            {itemCount} Items
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className={isSelected ? "text-indigo-200" : "text-slate-400"}>Total:</span>
                          <span className={`font-black text-sm ${isSelected ? "text-white" : "text-emerald-600"}`}>
                            ₹{Number(invTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Extracted Document Summary {ocrResult.invoices && ocrResult.invoices.length > 1 ? `(Viewing Invoice #${ocrResult.invoices[selectedOcrInvoiceIdx]?.invoice_number || selectedOcrInvoiceIdx + 1})` : ""}
                </p>
                {ocrResult.is_tax_inclusive && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Tax-Inclusive Invoice Detected
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(ocrResult.po_number || ocrResult.invoice_number) && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Doc Number:</span>
                    <p className="font-bold text-slate-800">{ocrResult.po_number || ocrResult.invoice_number}</p>
                  </div>
                )}
                {ocrResult.supplier_name && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Supplier:</span>
                    <p className="font-bold text-slate-800 truncate" title={ocrResult.supplier_name}>{ocrResult.supplier_name}</p>
                  </div>
                )}
                {ocrResult.supplier_gstin && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Supplier GSTIN:</span>
                    <p className="font-mono font-bold text-blue-700">{ocrResult.supplier_gstin}</p>
                  </div>
                )}
                {(ocrResult.grand_total || ocrResult.total_amount) && (
                  <div>
                    <span className="text-slate-400 text-[10px]">Invoice Total:</span>
                    <p className="font-black text-emerald-600">₹{Number(ocrResult.grand_total || ocrResult.total_amount).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PO Status Update (Editing Existing PO) */}
      {docType === "PO" && initialData?.id && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <RefreshCw className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Update Purchase Order Status
            </h2>
            {initialData.status && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Current: {initialData.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={currentPoStatus}
              onChange={(e) => setCurrentPoStatus(e.target.value)}
              className="flex-1 md:w-64 h-9 bg-white border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent / Issued to Vendor</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Fully Received">Fully Received</option>
              <option value="Billed">Billed / Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              onClick={handleUpdatePoStatus}
              disabled={isSaving || currentPoStatus === initialData?.status}
              className="px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-500 rounded-xl shadow-sm shadow-amber-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Update Status
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Update PO status to reflect real-world progress. This status feeds into the Vendor Bill linking workflow.
          </p>
        </div>
      )}

      {/* Top 2-Column Section: Bill From / Vendor Party + Document Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill From / Vendor Party Card (2 Cols on lg) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              {docType === "PR" ? "Target Supplier / Vendor (Optional)" : "Bill From / Vendor Party"}
            </h2>

            <button
              type="button"
              onClick={() => setIsAddVendorOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-xl transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Select Vendor / Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Vendor / Supplier Party --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.tax_number ? `(${s.tax_number})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier ? (
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1 text-xs">
                <div className="font-extrabold text-slate-900">{selectedSupplier.name}</div>
                <div className="text-slate-600 text-[11px]">Phone: {selectedSupplier.phone || "N/A"}</div>
                {selectedSupplier.tax_number && (
                  <div className="font-mono text-blue-700 font-bold text-[11px]">
                    GSTIN: {selectedSupplier.tax_number}
                  </div>
                )}
                {selectedSupplier.address && (
                  <div className="text-slate-500 text-[10px] truncate">{selectedSupplier.address}</div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 flex items-center justify-center italic">
                Select an existing vendor or click "+ Add New Vendor"
              </div>
            )}
          </div>
        </div>

        {/* Document Metadata Card (1 Col on lg) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Document Metadata
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                {docType === "PR" ? "PR No" : docType === "PO" ? "PO No" : "Invoice No"}
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Document Date</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1">
              <MapPin className="size-3 text-indigo-600" /> {docType === "PR" ? "Target Delivery Store / Depot" : docType === "PO" ? "Receiving Store / Branch / Godown" : "Inward Store / Branch"}
            </label>
            <select
              value={selectedLocation || selectedStore}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setSelectedStore(e.target.value);
              }}
              className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>

          {docType === "PINV" && (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                Original Vendor Bill / Ref No
              </label>
              <input
                type="text"
                placeholder="e.g. VEND-9821"
                value={originalRefNo}
                onChange={(e) => setOriginalRefNo(e.target.value)}
                className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs outline-none"
              />
            </div>
          )}

          {!showDueDate ? (
            <button
              type="button"
              onClick={() => setShowDueDate(true)}
              className="w-full py-2 px-3 border-2 border-dashed border-sky-400/90 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/60 text-sky-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="size-3.5" /> Add Due Date
            </button>
          ) : (
            <div className="space-y-1.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/90 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="size-3 text-emerald-600" /> Payment Terms & Due Date
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowDueDate(false);
                    setPaymentTerms("0");
                    setDueDate(docDate);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Remove Due Date & Terms"
                >
                  <X className="size-4.5 stroke-[2.5]" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => {
                      setPaymentTerms(e.target.value);
                      const days = Number(e.target.value) || 0;
                      const d = new Date(docDate);
                      d.setDate(d.getDate() + days);
                      setDueDate(d.toISOString().substring(0, 10));
                    }}
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="0">Immediate / COD</option>
                    <option value="15">Net 15 Days</option>
                    <option value="30">Net 30 Days</option>
                    <option value="60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target / Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-8 bg-white border border-slate-200 rounded-lg px-2 text-xs font-medium text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Line Items Table Component (MyBillBook / POS Style) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" /> Line Items & Required Materials ({items.length})
            </h2>

            {/* Tax Mode Switch */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setIsTaxInclusive(false)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                  !isTaxInclusive
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tax-Exclusive (+GST)
              </button>
              <button
                type="button"
                onClick={() => setIsTaxInclusive(true)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                  isTaxInclusive
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tax-Inclusive (Gross)
              </button>
            </div>
          </div>

          {/* Barcode Search Box & Multi-Product Button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                loadProducts();
                setIsMultiProductModalOpen(true);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Multi-Product Catalog ({products.length})</span>
            </button>

            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-sm w-full md:w-64 focus-within:ring-2 focus-within:ring-blue-500">
              <ScanBarcode className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeSubmit}
                placeholder="Scan barcode or SKU..."
                className="bg-transparent border-none text-xs text-slate-800 outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[260px]">Items / Services</th>
                <th className="px-3 py-3 w-24">HSN/SAC</th>
                <th className="px-3 py-3 w-24">Batch No</th>
                <th className="px-3 py-3 w-28">Exp Date</th>
                <th className="px-3 py-3 w-20 text-right">MRP ({currency.symbol})</th>
                <th className="px-3 py-3 w-20 text-right">Qty</th>
                <th className="px-3 py-3 w-24 text-right">
                  {docType === "PR" ? "Est. Price (₹)" : isTaxInclusive ? "Gross Rate (₹)" : "Price/Item (₹)"}
                </th>
                <th className="px-3 py-3 w-24 text-right">Discount</th>
                <th className="px-3 py-3 w-24 text-right">GST Tax %</th>
                <th className="px-3 py-3 w-28 text-right font-bold">Amount ({currency.symbol})</th>
                <th className="px-3 py-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const rawLine = item.quantity * item.unit_price;
                  const dAmt =
                    item.discount_type === "percent"
                      ? rawLine * (item.discount_value / 100)
                      : Math.min(item.discount_value, rawLine);
                  const lineEffective = Math.max(0, rawLine - dAmt);

                  let lineTaxable = 0;
                  let lineTax = 0;
                  let lineAmount = 0;

                  if (isTaxInclusive) {
                    lineAmount = lineEffective;
                    lineTaxable = lineAmount / (1 + (item.tax_rate || 0) / 100);
                    lineTax = lineAmount - lineTaxable;
                  } else {
                    lineTaxable = lineEffective;
                    lineTax = lineTaxable * ((item.tax_rate || 0) / 100);
                    lineAmount = lineTaxable + lineTax;
                  }

                  const query = (item.product_name || "").toLowerCase().trim();
                  const matchingSuggestions = products.filter((p: any) => {
                    if (!query) return true;
                    return (
                      p.name?.toLowerCase().includes(query) ||
                      p.sku?.toLowerCase().includes(query) ||
                      p.barcode?.toLowerCase().includes(query) ||
                      p.hsn_code?.toLowerCase().includes(query) ||
                      (p.category?.name || p.category)?.toLowerCase().includes(query)
                    );
                  }).slice(0, 10);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>

                      {/* Product Selector / Smart Inventory Mapping */}
                      <td className="px-3 py-2 min-w-[280px]">
                        {item.product_id ? (
                          (() => {
                            const linkedProd = products.find((p) => p.id === item.product_id);
                            return (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                    <Package className="size-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">{item.product_name || linkedProd?.name}</span>
                                  </div>
                                  <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                                    <CheckCircle className="size-3 text-emerald-600 shrink-0" />
                                    <span>Linked to Inventory</span>
                                    {linkedProd?.sku && (
                                      <span className="font-mono text-slate-500 font-normal">
                                        ({linkedProd.sku})
                                      </span>
                                    )}
                                    {linkedProd?.stock !== undefined && (
                                      <span className="text-slate-600 ml-1">
                                        • Stock: <strong>{linkedProd.stock}</strong>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateItem(item.id, "product_id", undefined);
                                    setActiveSearchRowId(item.id);
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold px-1.5 py-0.5 rounded hover:bg-white/60 transition-colors shrink-0 cursor-pointer"
                                  title="Unlink from this inventory product"
                                >
                                  Change
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="space-y-1.5 relative">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Type item name or search catalog..."
                                value={item.product_name}
                                onFocus={() => setActiveSearchRowId(item.id)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateItem(item.id, "product_name", val);
                                  setActiveSearchRowId(item.id);
                                }}
                                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                              />

                              {/* Interactive Autocomplete Suggestions Dropdown */}
                              {activeSearchRowId === item.id && (
                                <div className="absolute left-0 right-0 top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                                  <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span className="flex items-center gap-1.5">
                                      <Boxes className="size-3 text-indigo-600" /> Matching Inventory Products ({matchingSuggestions.length})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveSearchRowId(null)}
                                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </div>

                                  {matchingSuggestions.length === 0 ? (
                                    <div className="p-3 text-center text-xs text-slate-400 space-y-2">
                                      <p>No products match "{item.product_name}".</p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewProdName(item.product_name);
                                          setIsAddProductModalOpen(true);
                                          setActiveSearchRowId(null);
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="size-3" /> Create "{item.product_name}" in Inventory
                                      </button>
                                    </div>
                                  ) : (
                                    matchingSuggestions.map((p: any) => {
                                      const costPrice = Number(p.purchase_price || p.cost_price || p.selling_price || p.price || p.mrp || 0);
                                      const mrpVal = Number(p.mrp || p.selling_price || costPrice || 0);

                                      return (
                                        <div
                                          key={p.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateItem(item.id, "product_id", p.id);
                                            updateItem(item.id, "product_name", p.name);
                                            if (p.hsn_code) updateItem(item.id, "hsn_code", p.hsn_code);
                                            if ((p as any).uom_name) updateItem(item.id, "uom", (p as any).uom_name);
                                            updateItem(item.id, "unit_price", costPrice);
                                            updateItem(item.id, "mrp", mrpVal);
                                            if (p.tax_percent !== undefined) updateItem(item.id, "tax_rate", Number(p.tax_percent));
                                            setActiveSearchRowId(null);
                                          }}
                                          className="p-2.5 hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 text-left"
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                                              <Package className="size-3 text-indigo-600 shrink-0" />
                                              <span className="truncate">{p.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                              {p.sku && <span className="font-mono bg-slate-100 px-1 rounded">SKU: {p.sku}</span>}
                                              {p.barcode && <span className="font-mono bg-slate-100 px-1 rounded">BC: {p.barcode}</span>}
                                              {p.hsn_code && <span>HSN: <strong>{p.hsn_code}</strong></span>}
                                              <span className={cn("font-semibold", (p.stock || 0) > 0 ? "text-emerald-700" : "text-amber-700")}>
                                                Stock: {p.stock ?? 0}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="text-xs font-black text-indigo-700">
                                              {currency.symbol}{costPrice.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                              MRP: {currency.symbol}{mrpVal.toFixed(2)}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}

                                  <div className="p-2 bg-slate-50 flex items-center justify-between border-t text-[11px]">
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setNewProdName(item.product_name);
                                        setIsAddProductModalOpen(true);
                                        setActiveSearchRowId(null);
                                      }}
                                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="size-3" /> Add New Product to Inventory
                                    </button>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        loadProducts();
                                        setIsMultiProductModalOpen(true);
                                        setActiveSearchRowId(null);
                                      }}
                                      className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Boxes className="size-3" /> Open Catalog
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 px-0.5">
                              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="size-3 text-amber-500 shrink-0" />
                                Not in Inventory
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickAddLineToInventory(item)}
                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                                title="Add this item to inventory immediately"
                              >
                                <Plus className="size-2.5" /> Add to Inventory
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* HSN */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="2202"
                          value={item.hsn_code || ""}
                          onChange={(e) => updateItem(item.id, "hsn_code", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs font-mono text-slate-700 outline-none"
                        />
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="B-101"
                          value={item.batch_number || ""}
                          onChange={(e) => updateItem(item.id, "batch_number", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700 outline-none"
                        />
                      </td>

                      {/* Expiry */}
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={item.expiry_date || ""}
                          onChange={(e) => updateItem(item.id, "expiry_date", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-slate-700 outline-none"
                        />
                      </td>

                      {/* MRP */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          placeholder="0"
                          value={item.mrp || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateItem(item.id, "mrp", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-right font-semibold text-slate-700 outline-none"
                        />
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={item.quantity || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.unit_price || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateItem(item.id, "unit_price", e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Discount */}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={item.discount_value || ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => updateItem(item.id, "discount_value", e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs text-right text-slate-700 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, "discount_type", item.discount_type === "percent" ? "amount" : "percent")
                            }
                            className="px-1 py-0.5 bg-slate-100 text-[9px] font-black rounded text-slate-600 hover:bg-slate-200"
                          >
                            {item.discount_type === "percent" ? "%" : "₹"}
                          </button>
                        </div>
                      </td>

                      {/* Tax Rate */}
                      <td className="px-3 py-2 text-right">
                        <select
                          value={item.tax_rate}
                          onChange={(e) => updateItem(item.id, "tax_rate", Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs text-right font-bold text-slate-700 outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      {/* Line Amount */}
                      <td className="px-3 py-2 text-right font-black text-slate-900 text-xs">
                        {currency.symbol}{lineAmount.toFixed(2)}
                        <div className="text-[10px] text-slate-400 font-normal">
                          Tax: {currency.symbol}{lineTax.toFixed(2)}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2 text-center">
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
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 space-y-3">
                    <Package className="w-10 h-10 mx-auto text-slate-300" />
                    <div>
                      <p className="font-bold text-slate-700">No line items added yet.</p>
                      <p className="text-xs text-slate-400">Search products from inventory catalog or click below to add.</p>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          loadProducts();
                          setIsMultiProductModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Boxes className="w-4 h-4" /> Open Multi-Product Catalog
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Blank Row
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-blue-600 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line Item
            </button>
            <button
              type="button"
              onClick={() => {
                loadProducts();
                setIsMultiProductModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" /> Select Multiple Products
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddProductModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Create Product
          </button>
        </div>
      </div>

      {/* Bottom Grid: Terms & Conditions + Financial Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terms & Conditions Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-purple-600" /> Terms & Conditions / Departmental Notes
          </h2>

          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Financial Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" /> Billing Financial Summary
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <div className="flex items-center gap-1.5">
                <span>Subtotal (Taxable Value):</span>
                {isTaxInclusive && (
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Tax-Inclusive
                  </span>
                )}
              </div>
              <span className="font-bold text-slate-800">{currency.symbol}{subtotal.toFixed(2)}</span>
            </div>

            {/* Custom Additional Charges */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-700">Additional Charges (Freight, Packing)</span>
                <button
                  type="button"
                  onClick={handleAddCharge}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md"
                >
                  + Add Charge Field
                </button>
              </div>

              {customCharges.map((charge) => (
                <div key={charge.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Charge Name (e.g. Freight)"
                    value={charge.name}
                    onChange={(e) => handleUpdateCharge(charge.id, "name", e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="0"
                    value={charge.amount || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleUpdateCharge(charge.id, "amount", e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-right font-bold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCharge(charge.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-slate-600">
              <span>GST Tax Amount:</span>
              <span className="font-bold text-slate-800">+{currency.symbol}{totalTax.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={autoRoundOff}
                  onChange={(e) => setAutoRoundOff(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600"
                />
                Auto Round-Off ({roundOffAmount >= 0 ? `+₹${roundOffAmount.toFixed(2)}` : `-₹${Math.abs(roundOffAmount).toFixed(2)}`})
              </label>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-extrabold text-slate-900">
              <span>Grand Total Amount:</span>
              <span className="text-2xl font-black text-blue-600">{currency.symbol}{roundedTotal.toFixed(2)}</span>
            </div>

            {docType === "PINV" && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">Payment Settlement Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPoStatus("Paid");
                        setAmountPaid(roundedTotal);
                      }}
                      className={cn(
                        "py-2 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        currentPoStatus === "Paid"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      <Check className="size-3.5" />
                      <span>Paid in Full</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPoStatus("Unpaid");
                        setAmountPaid(0);
                      }}
                      className={cn(
                        "py-2 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        currentPoStatus === "Unpaid" || currentPoStatus === "Pending Payment"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                      )}
                    >
                      <Clock className="size-3.5" />
                      <span>Unpaid / Due</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPoStatus("Partial");
                        if (!amountPaid) setAmountPaid(Math.round(roundedTotal / 2));
                      }}
                      className={cn(
                        "py-2 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        currentPoStatus === "Partial" || currentPoStatus === "Partially Received"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      )}
                    >
                      <Receipt className="size-3.5" />
                      <span>Partial Paid</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Payment Method</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Credit">Credit / Net 30</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Amount Paid ({currency.symbol})</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={currentPoStatus === "Paid" ? (roundedTotal || "") : (amountPaid || "")}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : "";
                        setAmountPaid(val);
                        if (typeof val === "number" && val >= roundedTotal && roundedTotal > 0) {
                          setCurrentPoStatus("Paid");
                        } else if (typeof val === "number" && val > 0) {
                          setCurrentPoStatus("Partial");
                        } else {
                          setCurrentPoStatus("Unpaid");
                        }
                      }}
                      className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">Balance Due ({currency.symbol})</label>
                    <div className={cn(
                      "h-9 border rounded-xl px-2.5 flex items-center font-black text-xs",
                      balanceDue <= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                    )}>
                      {currency.symbol}{balanceDue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Submission Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            disabled={isSaving}
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-all cursor-pointer"
          >
            Cancel
          </button>

          {(docType === "PO" || docType === "PINV") && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={currentPoStatus}
                onChange={(e) => {
                  const s = e.target.value;
                  setCurrentPoStatus(s);
                  if (s === "Paid") setAmountPaid(roundedTotal);
                  else if (s === "Unpaid") setAmountPaid(0);
                }}
                className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {docType === "PINV" ? (
                  <>
                    <option value="Paid">Paid / Settled (Direct Bill)</option>
                    <option value="Received">Received / Full Delivery</option>
                    <option value="Partial">Partially Paid</option>
                    <option value="Unpaid">Unpaid / Due</option>
                    <option value="Draft">Draft Invoice</option>
                  </>
                ) : (
                  <>
                    <option value="Draft">Draft PO</option>
                    <option value="Sent">Sent / Issued</option>
                    <option value="Partially Received">Partially Received</option>
                    <option value="Fully Received">Fully Received</option>
                    <option value="Billed">Billed / Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShareModalDoc(getCurrentDocumentData())}
            className="w-full sm:w-auto px-5 py-3 text-sm font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="size-4 text-teal-600" /> Preview PDF & Share
          </button>
          <button
            disabled={isSaving}
            onClick={handleSaveDocument}
            className="w-full sm:w-auto px-8 py-3 text-sm font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : (docType === "PINV" ? (currentPoStatus === "Paid" ? "Save Paid Invoice" : "Save Purchase Invoice") : "Save Document")}
          </button>
        </div>
      </div>

      {/* ── Multi-Product Selection Catalog Modal (Sales Invoice Style) ──────── */}
      {isMultiProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 leading-tight">
                      Multi-Product Inventory Catalog
                    </h3>
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {products.length} Products Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Select multiple products and quantities to batch-add to this purchase invoice
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadProducts}
                  disabled={isLoadingProducts}
                  title="Reload inventory products"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? "animate-spin text-indigo-600" : "text-slate-600"}`} />
                  <span>{isLoadingProducts ? "Loading..." : "Refresh"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiProductModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by product name, barcode, SKU, brand, HSN..."
                  value={multiProductSearch}
                  onChange={(e) => setMultiProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const filtered = products.filter((p: any) => {
                      const q = multiProductSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        p.name?.toLowerCase().includes(q) ||
                        p.barcode?.toLowerCase().includes(q) ||
                        p.sku?.toLowerCase().includes(q) ||
                        (p.brand?.name || p.brand)?.toLowerCase().includes(q) ||
                        (p.category?.name || p.category)?.toLowerCase().includes(q) ||
                        p.hsn_code?.toLowerCase().includes(q)
                      );
                    });
                    const newSelected: Record<string, number> = {};
                    filtered.forEach((p: any) => {
                      newSelected[p.id] = selectedProductQuantities[p.id] || 1;
                    });
                    setSelectedProductQuantities(newSelected);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all shrink-0 cursor-pointer"
                >
                  Select All Visible
                </button>
                {Object.keys(selectedProductQuantities).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedProductQuantities({})}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition-all shrink-0 cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMultiProductModalOpen(false);
                    setIsAddProductModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="size-3.5" /> New Product
                </button>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
              {isLoadingProducts && products.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-bold text-slate-700">Loading products from inventory...</p>
                  <p className="text-xs text-slate-400">Fetching ERP catalog and POS items.</p>
                </div>
              ) : (() => {
                const filtered = products.filter((p: any) => {
                  const q = multiProductSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.name?.toLowerCase().includes(q) ||
                    p.barcode?.toLowerCase().includes(q) ||
                    p.sku?.toLowerCase().includes(q) ||
                    (p.brand?.name || p.brand)?.toLowerCase().includes(q) ||
                    (p.category?.name || p.category)?.toLowerCase().includes(q) ||
                    p.hsn_code?.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-300">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                        <Boxes className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        {multiProductSearch.trim() ? "No matching products found" : "No products found in inventory"}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mb-4">
                        {multiProductSearch.trim()
                          ? `No items match the query "${multiProductSearch}". Try different keywords or add a new product.`
                          : "Your inventory product catalog is empty. Click below to add your first product."}
                      </p>
                      <div className="flex items-center gap-2">
                        {multiProductSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => setMultiProductSearch("")}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Clear Search
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsMultiProductModalOpen(false);
                            setIsAddProductModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add New Product
                        </button>
                      </div>
                    </div>
                  );
                }

                return filtered.map((p: any) => {
                  const isSelected = !!selectedProductQuantities[p.id];
                  const qty = selectedProductQuantities[p.id] || 1;
                  const costPrice = Number(p.purchase_price || p.cost_price || p.selling_price || p.price || p.mrp || 0);
                  const mrpVal = Number(p.mrp || p.selling_price || costPrice || 0);
                  const brandName = p.brand?.name || p.brand || "";
                  const categoryName = p.category?.name || p.category || "";

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleMultiSelectProduct(p.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-500 shadow-sm ring-1 ring-indigo-500"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                      )}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0",
                            isSelected ? "bg-indigo-600 text-white" : "border-2 border-slate-300 text-transparent"
                          )}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.barcode && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                {p.barcode}
                              </span>
                            )}
                            {brandName && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                                {brandName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                            <span>SKU: <strong className="text-slate-700">{p.sku || "N/A"}</strong></span>
                            {categoryName && (
                              <>
                                <span>•</span>
                                <span>{categoryName}</span>
                              </>
                            )}
                            {p.hsn_code && (
                              <>
                                <span>•</span>
                                <span>HSN: <strong className="text-slate-700">{p.hsn_code}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              Stock: <span className={(p.stock || p.initial_stock || 0) > 10 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{p.stock || p.initial_stock || 0}</span>
                            </span>
                            <span>•</span>
                            <span>GST: <strong className="text-slate-700">{p.tax_percent || 18}%</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Quantity Stepper */}
                      <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="text-right">
                          <div className="font-black text-xs text-indigo-700">
                            {currency.symbol}{costPrice.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            MRP: {currency.symbol}{mrpVal.toFixed(2)}
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center rounded-xl border-2 border-indigo-500 bg-white px-2 py-1 shadow-xs focus-within:ring-2 focus-within:ring-indigo-400">
                              <span className="text-[11px] font-bold text-slate-400 mr-1">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={selectedProductQuantities[p.id] !== undefined ? selectedProductQuantities[p.id] : 1}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                                  setSelectedProductQuantities((prev) => ({ ...prev, [p.id]: val }));
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value) || 1;
                                  setSelectedProductQuantities((prev) => ({ ...prev, [p.id]: Math.max(1, val) }));
                                }}
                                className="w-16 text-center text-xs font-black text-indigo-700 bg-transparent outline-none font-mono"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleMultiSelectProduct(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Unselect"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleMultiSelectProduct(p.id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
                          >
                            + Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Sticky Bottom Summary & Action */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {Object.keys(selectedProductQuantities).length} Product(s) Selected
                </span>
                <span className="text-[11px] text-slate-500">
                  Total Items Quantity: {Object.values(selectedProductQuantities).reduce((a, b) => a + b, 0)} Units
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMultiProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Object.keys(selectedProductQuantities).length === 0}
                  onClick={handleAddSelectedProductsToItems}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Selected ({Object.keys(selectedProductQuantities).length}) to Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Create Product Modal ────────────────────────────────────────── */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Create & Add Product</h3>
                  <p className="text-xs text-slate-500">Add to inventory catalog and insert into current bill</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductAndAdd} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Product / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stainless Steel Pipe 2-Inch"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-9 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="2202"
                    value={newProdHsn}
                    onChange={(e) => setNewProdHsn(e.target.value)}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="SKU-001"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="890123..."
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Purchase / Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdCostPrice || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewProdCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-bold text-indigo-700 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdSellingPrice || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewProdSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newProdMrp || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewProdMrp(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">GST Tax Rate</label>
                  <select
                    value={newProdTax}
                    onChange={(e) => setNewProdTax(Number(e.target.value))}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value={0}>0% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newProdStock || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewProdStock(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create & Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Party Modal */}
      <AddVendorModal
        isOpen={isAddVendorOpen}
        onClose={() => setIsAddVendorOpen(false)}
        onVendorCreated={(vendor) => {
          setSuppliers([vendor, ...suppliers]);
          setSelectedSupplierId(vendor.id);
        }}
      />

      {/* PDF & WhatsApp/Email Share Modal */}
      <ProcurementShareModal
        isOpen={Boolean(shareModalDoc)}
        onClose={() => {
          setShareModalDoc(null);
          onClose();
        }}
        documentData={shareModalDoc}
        docType={docType}
      />
    </div>
  );
}
