import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Package,
  Edit2,
  Trash2,
  Copy,
  Globe,
  Printer,
  Download,
  Upload,
  Sparkles,
  Gift,
  Play,
  Pause,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Sliders,
  Box,
  Truck,
  DollarSign,
  Zap,
  FileText,
  Loader2,
  Store,
  ShoppingCart,
  Check,
  CheckCircle,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import {
  PRODUCT_MASTER_FIELDS,
  getMasterExportHeaders,
  mapProductToMasterExportRow,
  getMasterSampleRows,
  mapMasterImportRowToProduct
} from '@/config/product-master-fields';

// ── Types ─────────────────────────────────────────────────────────────
export interface ProductItem {
  id: string;
  name: string;
  unique_item_name?: string;
  item_code?: string;
  sku: string;
  barcode: string;
  secondary_barcode?: string;
  hsn_code?: string;
  category: string;
  category_name?: string;
  sub_category?: string;
  sub_category_name?: string;
  brand: string;
  brand_name?: string;
  unit: string;
  uom_name?: string;
  secondary_uom?: string;
  stock: number;
  on_hand_stock?: number;
  initial_stock?: number;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  status: 'Active' | 'Inactive';
  mrp: number;
  purchasePrice?: number;
  purchase_price?: number;
  sellingPrice?: number;
  selling_price?: number;
  sales_tax_mode?: string;
  is_tax_inclusive?: boolean;
  sales_tax_name?: string;
  taxPercent?: number;
  tax_percent?: number;
  sales_price_after_tax?: number;
  discount_limit?: number;
  discount_amount?: number;
  wholesale_price?: number;
  min_wholesale_qty?: number;
  b2b_price?: number;
  min_b2b_qty?: number;
  distributor_price?: number;
  min_distributor_qty?: number;
  is_purchase_tax_inclusive?: boolean;
  purchase_tax_name?: string;
  purchase_tax_percent?: number;
  purchase_price_after_tax?: number;
  supplier?: string;
  preferred_supplier?: string;
  supplier_invoice_number?: string;
  supplier_invoice_date?: string;
  item_received_date?: string;
  reorderLevel?: number;
  reorder_level?: number;
  safety_stock?: number;
  mfg_date?: string;
  expiry_date?: string;
  stock_batch_number?: string;
  stock_batch_expiry_date?: string;
  opening_stock_batch_number?: string;
  opening_stock_batch_expiry_date?: string;
  warehouse?: string;
  location_in_warehouse?: string;
  has_manual_batch?: boolean;
  is_published_online?: boolean;
  is_featured_online?: boolean;
  is_service_item?: boolean;
  need_to_print_barcode_sticker?: boolean;
  not_for_sale?: boolean;
  only_for_portal?: boolean;
  not_for_portal?: boolean;
  has_label?: boolean;
  label_headings?: string;
  weighing_scale_code?: string;
  conversion_factor?: string;
  keywords?: string;
  accessories_keyword?: string;
  imageUrl?: string;
  image_url?: string;
  category_image?: string;
  shortDescription?: string;
  short_description?: string;
  long_description?: string;
  description_html?: string;
  specifications?: any;
  isSyncedToPos?: boolean;
  createdAt?: string;
}

export interface MasterCatalogItem {
  id: string;
  name: string;
  unique_item_name?: string;
  item_code?: string;
  sku: string;
  sku_code?: string;
  barcode: string;
  secondary_barcode?: string;
  hsn_code?: string;
  category: string;
  category_name?: string;
  sub_category?: string;
  brand: string;
  brand_name?: string;
  unit: string;
  uom_name?: string;
  mrp: number;
  purchasePrice?: number;
  cost_price?: number;
  sellingPrice?: number;
  sale_price?: number;
  reorderLevel?: number;
  reorder_level?: number;
  imageUrl?: string;
  image_url?: string;
  description?: string;
  short_description?: string;
  specifications?: any;
  isImported?: boolean;
  source?: string;
}

interface SchemeItem {
  id: string;
  name: string;
  appliesTo: string;
  buyQuantity: number;
  getQuantity: number;
  getProductId?: string | null;
  getProductName?: string | null;
  discountPercentage: number;
  status: string;
  createdAt?: string;
}

// ── Columns definitions strictly adhering to sequence 1..70 ──────────
const LOCAL_COLUMNS = [
  { id: 'image', label: 'IMAGE', group: 'Media', seq: 0 },
  ...PRODUCT_MASTER_FIELDS.filter((f) => f.type !== 'blank').map((f) => ({
    id: f.id,
    label: f.excelHeader.toUpperCase(),
    group: f.group || 'General',
    seq: f.seq
  }))
];

const MASTER_COLUMNS = [
  { id: 'image', label: 'IMAGE', seq: 0 },
  ...PRODUCT_MASTER_FIELDS.filter((f) => f.type !== 'blank').map((f) => ({
    id: f.id,
    label: f.excelHeader.toUpperCase(),
    seq: f.seq
  })),
  { id: 'source', label: 'SOURCE', seq: 99 }
];

const getFieldAlignment = (id: string): 'text-left' | 'text-center' | 'text-right' => {
  if (id === 'image' || id === 'source' || id === 'barcode' || id === 'item_code') return 'text-center';
  const masterField = PRODUCT_MASTER_FIELDS.find((f) => f.id === id);
  if (!masterField) return 'text-left';
  if (masterField.type === 'number' || masterField.type === 'date' || masterField.type === 'boolean') {
    return 'text-center';
  }
  return 'text-left';
};

const formatPrice = (val?: number | string | null) => {
  const n = Number(val);
  if (isNaN(n) || n === 0) return '₹0.00';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── ColumnMenu Popover ────────────────────────────────────────────────
function ColumnMenu({
  columns,
  visible,
  onToggle,
  onToggleAll,
  onSave,
  onReset,
  onClose,
  onApplyPreset
}: {
  columns: { id: string; label: string; group?: string }[];
  visible: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  onApplyPreset: (cols: string[]) => void;
}) {
  const [searchCol, setSearchCol] = useState('');

  const filteredColumns = useMemo(() => {
    if (!searchCol.trim()) return columns;
    const q = searchCol.toLowerCase();
    return columns.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.group || '').toLowerCase().includes(q)
    );
  }, [columns, searchCol]);

  const presets = [
    { label: 'All Columns', ids: columns.map((c) => c.id) },
    {
      label: 'Identity & Stock',
      ids: [
        'image',
        'name',
        'item_code',
        'barcode',
        'brand',
        'uom',
        'stock',
        'reorder_level',
        'mfg_date',
        'expiry_date',
        'category',
        'sub_category'
      ]
    },
    {
      label: 'Pricing & GST',
      ids: [
        'image',
        'name',
        'hsn_code',
        'mrp',
        'purchase_price',
        'purchase_tax_type',
        'selling_price',
        'sales_tax_type',
        'b2b_price',
        'min_b2b_qty',
        'wholesale_price',
        'min_wholesale_qty'
      ]
    },
    {
      label: 'Asian Paints & Base',
      ids: [
        'image',
        'name',
        'base_name',
        'product_base_code',
        'secondary_barcode',
        'short_description',
        'conversion_factor',
        'weighing_scale_code'
      ]
    },
    {
      label: 'Taxes & Discounts',
      ids: [
        'image',
        'name',
        'sales_tax_name',
        'tax_percent',
        'sales_price_after_tax',
        'discount_limit',
        'discount_amount',
        'sales_measuring_unit',
        'purchase_tax_name',
        'purchase_tax_percent',
        'purchase_price_after_tax',
        'purchase_measuring_unit'
      ]
    },
    {
      label: 'Logistics & Flags',
      ids: [
        'image',
        'name',
        'warehouse',
        'location_in_warehouse',
        'status',
        'has_label',
        'supplier',
        'need_to_print_barcode_sticker',
        'is_service_item',
        'not_for_sale',
        'only_for_portal',
        'not_for_portal'
      ]
    },
    {
      label: 'Batches & Expiry',
      ids: [
        'image',
        'name',
        'has_manual_batch',
        'stock_batch_number',
        'stock_batch_expiry_date',
        'opening_stock_batch_number',
        'opening_stock_batch_expiry_date'
      ]
    },
    {
      label: 'Media & Keywords',
      ids: [
        'image',
        'name',
        'display_index',
        'image_url',
        'category_image',
        'unique_item_name',
        'keywords',
        'accessories_keyword',
        'preferred_supplier'
      ]
    }
  ];

  return (
    <div className="absolute right-0 mt-2 w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3.5 flex flex-col max-h-[500px] animate-fade-in font-sans">
      <div className="flex items-center justify-between border-b pb-2 shrink-0">
        <div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
            Columns Customizer
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            {visible.length} of {columns.length} columns active
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors uppercase cursor-pointer"
        >
          {visible.length === columns.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Preset Quick Selectors */}
      <div className="py-2 border-b shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Quick Presets:
        </span>
        <div className="flex flex-wrap gap-1">
          {presets.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => onApplyPreset(pr.ids)}
              className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 hover:bg-purple-50 hover:text-purple-600 border border-slate-200 transition-colors cursor-pointer"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search columns */}
      <div className="pt-2 shrink-0">
        <input
          type="text"
          placeholder="Filter columns (e.g. price, batch, gst)..."
          value={searchCol}
          onChange={(e) => setSearchCol(e.target.value)}
          className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Column Checkboxes */}
      <div className="divide-y divide-slate-100 overflow-y-auto my-2 py-1 pr-1 flex-1 max-h-64">
        {filteredColumns.map((col) => (
          <label
            key={col.id}
            className="flex items-center justify-between gap-2.5 py-1.5 px-1 hover:bg-slate-50 rounded cursor-pointer text-xs font-semibold text-slate-700"
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visible.includes(col.id)}
                onChange={() => onToggle(col.id)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-3.5 cursor-pointer"
              />
              {col.label}
            </span>
            {col.group && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                {col.group}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t mt-auto shrink-0">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 text-[11px] h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg border-0 shadow-sm"
        >
          Save View Preset
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 text-[11px] h-8 font-bold rounded-lg text-slate-700 hover:bg-slate-50 border border-slate-200"
        >
          Reset Default
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
export interface InventoryPageProps {
  embedded?: boolean;
  onNavigateToPos?: () => void;
}

export function InventoryPage({ embedded, onNavigateToPos }: InventoryPageProps = {}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'My Inventory' | 'Master Catalog'>('My Inventory');
  const [search, setSearch] = useState('');
  const [masterSearch, setMasterSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');

  const [items, setItems] = useState<ProductItem[]>([]);
  const [masterCatalog, setMasterCatalog] = useState<MasterCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchingMaster, setIsSearchingMaster] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Visible Columns state
  const defaultLocalVisible = useMemo(() => LOCAL_COLUMNS.map((c) => c.id), []);
  const defaultMasterVisible = useMemo(() => MASTER_COLUMNS.map((c) => c.id), []);

  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gym_inventory_visible_columns_v6');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultLocalVisible;
  });

  const [masterVisibleColumns, setMasterVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gym_master_catalog_visible_columns_v6');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultMasterVisible;
  });

  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<
    'basic' | 'pricing' | 'purchasing' | 'stock' | 'flags' | 'specs'
  >('basic');

  // Barcode Print Modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodePrintItem, setBarcodePrintItem] = useState<ProductItem | null>(null);
  const [barcodePrintQty, setBarcodePrintQty] = useState(24);
  const [barcodeLayout, setBarcodeLayout] = useState<'1up' | '2up' | '3up' | '4up' | 'a4'>('2up');

  // Free Schemes Modal
  const [freeSchemesModalOpen, setFreeSchemesModalOpen] = useState(false);
  const [freeSchemes, setFreeSchemes] = useState<SchemeItem[]>([]);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [newSchemeAppliesTo, setNewSchemeAppliesTo] = useState('Supplements');
  const [newSchemeBuyQty, setNewSchemeBuyQty] = useState(2);
  const [newSchemeGetQty, setNewSchemeGetQty] = useState(1);
  const [newSchemeGetProductName, setNewSchemeGetProductName] = useState('Shaker Bottle');

  // AI Images State
  const [aiPaused, setAiPaused] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 6-Tab Form Data State (Covering all 70 enterprise fields)
  const [form, setForm] = useState({
    name: '',
    unique_item_name: '',
    item_code: '',
    sku: '',
    barcode: '',
    secondary_barcode: '',
    hsn_code: '',
    category: 'Supplements',
    sub_category: '',
    brand: '',
    unit: 'Pcs',
    imageUrl: '',
    // Asian Paints & Specs
    base_name: '',
    product_base_code: '',
    size_l_kg: '',
    // Pricing & Tax
    selling_price: '0.00',
    sales_tax_mode: 'Tax Inclusive',
    is_tax_inclusive: true,
    tax_percent: 18,
    sales_tax_name: 'GST',
    sales_price_after_tax: '0.00',
    mrp: '0.00',
    discount_limit: '0',
    discount_amount: '0.00',
    sales_measuring_unit: 'Pcs',
    wholesale_price: '0.00',
    min_wholesale_qty: '10',
    b2b_price: '0.00',
    min_b2b_qty: '5',
    distributor_price: '0.00',
    min_distributor_qty: '50',
    // Purchasing
    purchase_price: '0.00',
    purchase_tax_mode: 'Tax Inclusive',
    is_purchase_tax_inclusive: true,
    purchase_tax_percent: 18,
    purchase_tax_name: 'GST',
    purchase_price_after_tax: '0.00',
    purchase_measuring_unit: 'Pcs',
    supplier: '',
    preferred_supplier: '',
    supplier_invoice_number: '',
    supplier_invoice_date: '',
    item_received_date: '',
    // Stock & Batches
    initial_stock: '0',
    stock: '0',
    reorder_level: '5',
    safety_stock: '0',
    warehouse: '',
    location_in_warehouse: '',
    mfg_date: '',
    expiry_date: '',
    has_manual_batch: false,
    stock_batch_number: '',
    stock_batch_expiry_date: '',
    opening_stock_batch_number: '',
    opening_stock_batch_expiry_date: '',
    // Flags & Operations
    status: 'Active',
    is_published_online: true,
    is_featured_online: false,
    is_service_item: false,
    need_to_print_barcode_sticker: true,
    not_for_sale: false,
    only_for_portal: false,
    not_for_portal: false,
    has_label: true,
    label_headings: '',
    weighing_scale_code: '',
    conversion_factor: '1',
    keywords: '',
    accessories_keyword: '',
    // Descriptions
    short_description: '',
    long_description: '',
    description_html: ''
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Database Load ──────────────────────────────────────────────────
  const loadData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<ProductItem[]>('/inventory'),
      apiClient.get<SchemeItem[]>('/inventory/schemes')
    ])
      .then(([invRes, schRes]) => {
        if (Array.isArray(invRes)) setItems(invRes);
        if (Array.isArray(schRes)) setFreeSchemes(schRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Inventory Items
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.unique_item_name && item.unique_item_name.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q) ||
        (item.item_code && item.item_code.toLowerCase().includes(q)) ||
        item.barcode.includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'All Categories' || item.category === categoryFilter;
      const matchesStock = stockStatusFilter === 'All' || item.stockStatus === stockStatusFilter;
      const matchesBrand = brandFilter === 'All' || item.brand === brandFilter;

      return matchesSearch && matchesCat && matchesStock && matchesBrand;
    });

    result.sort((a, b) => {
      return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });

    return result;
  }, [items, search, categoryFilter, stockStatusFilter, brandFilter, sortOrder]);

  // Master Catalog products excluding already imported items in local inventory
  const unimportedMasterCatalog = useMemo(() => {
    const existingSkus = new Set(items.map((i) => i.sku.toLowerCase()));
    const existingBarcodes = new Set(items.map((i) => (i.barcode || '').trim()).filter(Boolean));
    return masterCatalog.filter((c) => {
      if (c.isImported) return false;
      if (c.sku && existingSkus.has(c.sku.toLowerCase())) return false;
      if (c.barcode && existingBarcodes.has(c.barcode.trim())) return false;
      return true;
    });
  }, [masterCatalog, items]);

  // Master Catalog Search
  const handleMasterSearch = async () => {
    if (!masterSearch.trim()) return;
    setIsSearchingMaster(true);
    try {
      const res = await apiClient.get<MasterCatalogItem[]>(
        `/inventory/master-catalog?search=${encodeURIComponent(masterSearch)}`
      );
      if (Array.isArray(res)) setMasterCatalog(res);
      triggerToast(`Found ${res.length} catalog results`);
    } catch {
      triggerToast('❌ Error searching master catalog');
    } finally {
      setIsSearchingMaster(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pagedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Multi-Selection
  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─────────────────────────────────────────────────────────────────
  // TOP ACTION BUTTONS (100% Dynamic with Database Connections)
  // ─────────────────────────────────────────────────────────────────

  // 1. Sample Excel Download
  const handleDownloadSampleExcel = () => {
    try {
      const sampleRows = getMasterSampleRows();
      const ws = XLSX.utils.json_to_sheet(sampleRows, { header: getMasterExportHeaders() });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sample Products');
      XLSX.writeFile(wb, 'fitclub_product_master_sample_template.xlsx');
      triggerToast('📥 Sample Excel template downloaded with all 70 headers!');
    } catch {
      triggerToast('❌ Failed to download sample Excel');
    }
  };

  // 2. Import File (Excel & CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const rawData = XLSX.utils.sheet_to_json(ws);

          let importedCount = 0;
          for (const row of rawData as any[]) {
            const mapped = mapMasterImportRowToProduct(row);
            if (mapped.name) {
              await apiClient.post('/inventory', mapped);
              importedCount++;
            }
          }

          triggerToast(`🎉 Successfully imported ${importedCount} products into database!`);
          loadData();
        } catch {
          triggerToast('❌ Failed to parse and import Excel file');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          try {
            let importedCount = 0;
            for (const row of results.data as any[]) {
              const mapped = mapMasterImportRowToProduct(row);
              if (mapped.name) {
                await apiClient.post('/inventory', mapped);
                importedCount++;
              }
            }
            triggerToast(`🎉 Successfully imported ${importedCount} products into database!`);
            loadData();
          } catch {
            triggerToast('❌ Failed to process CSV data');
          }
        }
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Export to Excel (All 70 Enterprise Headers)
  const handleExportData = () => {
    try {
      const exportRows = items.map((p) => mapProductToMasterExportRow(p));
      const ws = XLSX.utils.json_to_sheet(exportRows, { header: getMasterExportHeaders() });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Products');
      XLSX.writeFile(wb, `gym_inventory_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      triggerToast(`📥 Exported ${items.length} products to Excel successfully!`);
    } catch {
      triggerToast('❌ Export failed');
    }
  };

  // 4. Print Barcodes Modal
  const handleOpenBarcodeModal = (item?: ProductItem) => {
    setBarcodePrintItem(item || items[0] || null);
    setBarcodeModalOpen(true);
  };

  const handleTriggerPrint = () => {
    window.print();
    triggerToast('🖨️ Barcode labels sent to printer queue!');
    setBarcodeModalOpen(false);
  };

  // 5. Free Schemes Management
  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchemeName.trim()) return;
    try {
      await apiClient.post('/inventory/schemes', {
        name: newSchemeName,
        appliesTo: newSchemeAppliesTo,
        buyQuantity: newSchemeBuyQty,
        getQuantity: newSchemeGetQty,
        getProductName: newSchemeGetProductName,
        discountPercentage: 100.0
      });
      triggerToast('🎁 Free scheme saved to database successfully!');
      setNewSchemeName('');
      loadData();
    } catch {
      triggerToast('❌ Error creating scheme');
    }
  };

  const handleDeleteScheme = async (id: string) => {
    try {
      await apiClient.delete(`/inventory/schemes/${id}`);
      triggerToast('🗑️ Promotional scheme deleted');
      loadData();
    } catch {
      triggerToast('❌ Error deleting scheme');
    }
  };

  // 6. Resume AI Images / Pause AI Images (Dynamic Backend AI Sourcing)
  const handleToggleAiImages = async () => {
    try {
      if (aiPaused) {
        triggerToast('⚡ Resuming AI Image search and processing catalog visuals...');
        const res = await apiClient.post<{ paused: boolean; enriched_count?: number; message: string }>(
          '/inventory/master-catalog/ai-image-search/resume'
        );
        setAiPaused(false);
        triggerToast(res?.message || '⚡ AI Image Search & dynamic visual sourcing resumed!');
        loadData();
      } else {
        const res = await apiClient.post<{ paused: boolean; message: string }>(
          '/inventory/master-catalog/ai-image-search/pause'
        );
        setAiPaused(true);
        triggerToast(res?.message || '⏸️ AI Image Search paused globally.');
      }
    } catch {
      triggerToast('❌ Failed to communicate with AI image service');
    }
  };

  // Dynamic On-Demand Single Product Image Fetch
  const handleFetchProductImage = async (productId: string) => {
    try {
      triggerToast('🔍 Dynamically sourcing product visual from AI & web...');
      const res = await apiClient.post<{ success: boolean; image_url: string; message: string }>(
        `/inventory/products/${productId}/fetch-image`
      );
      if (res.success && res.image_url) {
        triggerToast('✨ Dynamic image found and saved to database!');
        loadData();
      } else {
        triggerToast('⚠️ No suitable dynamic image found.');
      }
    } catch {
      triggerToast('❌ Error fetching product image.');
    }
  };


  // 7. Storefront Sync 1-Click Toggle
  const handleToggleStorefrontSync = async (item: ProductItem) => {
    try {
      const newStatus = !item.is_published_online;
      await apiClient.put(`/inventory/${item.id}`, { is_published_online: newStatus });
      triggerToast(
        newStatus
          ? `🌐 "${item.name}" is now LIVE on Online Storefront!`
          : `🔒 "${item.name}" is now hidden (In-Store Only)`
      );
      loadData();
    } catch {
      triggerToast('❌ Failed to update storefront status');
    }
  };

  // 8. Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    if (!confirm(`Delete ${selectedProductIds.size} selected products from database?`)) return;

    try {
      await apiClient.post('/inventory/bulk-delete', {
        product_ids: Array.from(selectedProductIds)
      });
      triggerToast(`🗑️ Successfully deleted ${selectedProductIds.size} products`);
      setSelectedProductIds(new Set());
      loadData();
    } catch {
      triggerToast('❌ Error performing bulk delete');
    }
  };

  // 9. Master Catalog Import
  const handleImportFromCatalog = async (catalogId: string) => {
    try {
      await apiClient.post('/inventory/master-catalog/import', {
        catalog_id: catalogId,
        initialStock: 10
      });
      // Optimistically remove from master catalog view immediately
      setMasterCatalog((prev) => prev.filter((item) => item.id !== catalogId));
      triggerToast('📦 Product imported to My Inventory successfully!');
      loadData();
      setActiveTab('My Inventory');
    } catch {
      triggerToast('❌ Error importing product');
    }
  };

  // 9B. Import Selected Products to POS Terminal
  const handleBulkImportToPos = async () => {
    if (selectedProductIds.size === 0) return;
    try {
      const res = await apiClient.post<{ synced_count: number; message: string }>('/inventory/bulk-sync-pos', {
        product_ids: Array.from(selectedProductIds),
        sync_status: true
      });
      triggerToast(`🛒 ${res.message || `Imported ${selectedProductIds.size} product(s) to POS terminal`}`);
      setSelectedProductIds(new Set());
      loadData();
    } catch {
      triggerToast('❌ Failed to import products to POS');
    }
  };

  // 9C. Toggle Single Product POS Sync
  const handleTogglePosSync = async (product: ProductItem) => {
    try {
      const res = await apiClient.post<{ is_synced_to_pos: boolean; message: string }>(`/inventory/${product.id}/toggle-pos`);
      triggerToast(res.is_synced_to_pos ? `🛒 "${product.name}" imported & live on POS terminal` : `🔒 "${product.name}" removed from POS`);
      loadData();
    } catch {
      triggerToast('❌ Failed to update POS status');
    }
  };

  // 10. Generate Barcode on Demand
  const handleGenerateBarcode = async (item: ProductItem) => {
    try {
      const res = await apiClient.post<{ barcode: string }>(`/inventory/${item.id}/generate-barcode`, {
        barcode_type: 'EAN-13'
      });
      triggerToast(`⚡ Generated GS1 barcode: ${res.barcode}`);
      loadData();
    } catch {
      triggerToast('❌ Failed to generate barcode');
    }
  };

  // 11. Create & Edit Product Modal Actions
  const handleOpenCreateModal = () => {
    setEditingItemId(null);
    setActiveModalTab('basic');
    setForm({
      name: '',
      unique_item_name: '',
      item_code: '',
      sku: '',
      barcode: '',
      secondary_barcode: '',
      hsn_code: '',
      category: 'Supplements',
      sub_category: '',
      brand: '',
      unit: 'Pcs',
      imageUrl: '',
      base_name: '',
      product_base_code: '',
      size_l_kg: '',
      selling_price: '0.00',
      sales_tax_mode: 'Tax Inclusive',
      is_tax_inclusive: true,
      tax_percent: 18,
      sales_tax_name: 'GST',
      sales_price_after_tax: '0.00',
      mrp: '0.00',
      discount_limit: '0',
      discount_amount: '0.00',
      sales_measuring_unit: 'Pcs',
      wholesale_price: '0.00',
      min_wholesale_qty: '10',
      b2b_price: '0.00',
      min_b2b_qty: '5',
      distributor_price: '0.00',
      min_distributor_qty: '50',
      purchase_price: '0.00',
      purchase_tax_mode: 'Tax Inclusive',
      is_purchase_tax_inclusive: true,
      purchase_tax_percent: 18,
      purchase_tax_name: 'GST',
      purchase_price_after_tax: '0.00',
      purchase_measuring_unit: 'Pcs',
      supplier: '',
      preferred_supplier: '',
      supplier_invoice_number: '',
      supplier_invoice_date: '',
      item_received_date: '',
      initial_stock: '0',
      stock: '0',
      reorder_level: '5',
      safety_stock: '0',
      warehouse: '',
      location_in_warehouse: '',
      mfg_date: '',
      expiry_date: '',
      has_manual_batch: false,
      stock_batch_number: '',
      stock_batch_expiry_date: '',
      opening_stock_batch_number: '',
      opening_stock_batch_expiry_date: '',
      status: 'Active',
      is_published_online: true,
      is_featured_online: false,
      is_service_item: false,
      need_to_print_barcode_sticker: true,
      not_for_sale: false,
      only_for_portal: false,
      not_for_portal: false,
      has_label: true,
      label_headings: '',
      weighing_scale_code: '',
      conversion_factor: '1',
      keywords: '',
      accessories_keyword: '',
      short_description: '',
      long_description: '',
      description_html: ''
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: ProductItem) => {
    setEditingItemId(item.id);
    setActiveModalTab('basic');
    setForm({
      name: item.name || '',
      unique_item_name: item.unique_item_name || item.name || '',
      item_code: item.item_code || item.sku || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      secondary_barcode: item.secondary_barcode || '',
      hsn_code: item.hsn_code || '',
      category: item.category || item.category_name || 'Supplements',
      sub_category: item.sub_category || item.sub_category_name || '',
      brand: item.brand || item.brand_name || '',
      unit: item.unit || 'Pcs',
      imageUrl: item.imageUrl || item.image_url || '',
      base_name: item.specifications?.base_name || '',
      product_base_code: item.specifications?.product_base_code || '',
      size_l_kg: item.specifications?.size_l_kg || '',
      selling_price: String(item.sellingPrice || item.selling_price || item.mrp || '0.00'),
      sales_tax_mode: item.is_tax_inclusive ? 'Tax Inclusive' : 'Tax Exclusive',
      is_tax_inclusive: item.is_tax_inclusive ?? true,
      tax_percent: item.taxPercent || item.tax_percent || 18,
      sales_tax_name: item.sales_tax_name || 'GST',
      sales_price_after_tax: String(item.sales_price_after_tax || item.sellingPrice || item.mrp || '0.00'),
      mrp: String(item.mrp || '0.00'),
      discount_limit: String(item.discount_limit || '0'),
      discount_amount: String(item.discount_amount || '0.00'),
      sales_measuring_unit: item.unit || 'Pcs',
      wholesale_price: String(item.wholesale_price || '0.00'),
      min_wholesale_qty: String(item.min_wholesale_qty || '10'),
      b2b_price: String(item.b2b_price || '0.00'),
      min_b2b_qty: String(item.min_b2b_qty || '5'),
      distributor_price: String(item.distributor_price || '0.00'),
      min_distributor_qty: String(item.min_distributor_qty || '50'),
      purchase_price: String(item.purchasePrice || item.purchase_price || '0.00'),
      purchase_tax_mode: item.is_purchase_tax_inclusive ? 'Tax Inclusive' : 'Tax Exclusive',
      is_purchase_tax_inclusive: item.is_purchase_tax_inclusive ?? true,
      purchase_tax_percent: item.purchase_tax_percent || 18,
      purchase_tax_name: item.purchase_tax_name || 'GST',
      purchase_price_after_tax: String(item.purchase_price_after_tax || item.purchasePrice || '0.00'),
      purchase_measuring_unit: item.unit || 'Pcs',
      supplier: item.supplier || '',
      preferred_supplier: item.preferred_supplier || item.supplier || '',
      supplier_invoice_number: item.supplier_invoice_number || '',
      supplier_invoice_date: item.supplier_invoice_date || '',
      item_received_date: item.item_received_date || '',
      initial_stock: String(item.initial_stock || item.stock || '0'),
      stock: String(item.stock || '0'),
      reorder_level: String(item.reorderLevel || item.reorder_level || '5'),
      safety_stock: String(item.safety_stock || '0'),
      warehouse: item.warehouse || '',
      location_in_warehouse: item.location_in_warehouse || '',
      mfg_date: item.mfg_date || '',
      expiry_date: item.expiry_date || '',
      has_manual_batch: item.has_manual_batch ?? false,
      stock_batch_number: item.stock_batch_number || '',
      stock_batch_expiry_date: item.stock_batch_expiry_date || '',
      opening_stock_batch_number: item.opening_stock_batch_number || '',
      opening_stock_batch_expiry_date: item.opening_stock_batch_expiry_date || '',
      status: item.status || 'Active',
      is_published_online: item.is_published_online ?? true,
      is_featured_online: item.is_featured_online ?? false,
      is_service_item: item.is_service_item ?? false,
      need_to_print_barcode_sticker: item.need_to_print_barcode_sticker ?? true,
      not_for_sale: item.not_for_sale ?? false,
      only_for_portal: item.only_for_portal ?? false,
      not_for_portal: item.not_for_portal ?? false,
      has_label: item.has_label ?? true,
      label_headings: item.label_headings || '',
      weighing_scale_code: item.weighing_scale_code || '',
      conversion_factor: item.conversion_factor || '1',
      keywords: item.keywords || '',
      accessories_keyword: item.accessories_keyword || '',
      short_description: item.shortDescription || item.short_description || '',
      long_description: item.long_description || '',
      description_html: item.description_html || ''
    });
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      triggerToast('⚠️ Item name is required');
      return;
    }

    try {
      const payload = {
        name: form.name,
        unique_item_name: form.unique_item_name || form.name,
        item_code: form.item_code || form.sku,
        sku: form.sku,
        barcode: form.barcode,
        secondary_barcode: form.secondary_barcode,
        hsn_code: form.hsn_code,
        category: form.category,
        sub_category: form.sub_category,
        brand: form.brand,
        unit: form.unit,
        imageUrl: form.imageUrl,
        purchasePrice: Number(form.purchase_price) || 0,
        mrp: Number(form.mrp) || 0,
        sellingPrice: Number(form.selling_price) || Number(form.mrp) || 0,
        is_tax_inclusive: form.is_tax_inclusive,
        taxPercent: Number(form.tax_percent) || 0,
        sales_tax_name: form.sales_tax_name,
        sales_price_after_tax: Number(form.sales_price_after_tax) || Number(form.selling_price) || 0,
        discount_limit: Number(form.discount_limit) || 0,
        discount_amount: Number(form.discount_amount) || 0,
        wholesale_price: Number(form.wholesale_price) || 0,
        min_wholesale_qty: Number(form.min_wholesale_qty) || 0,
        b2b_price: Number(form.b2b_price) || 0,
        min_b2b_qty: Number(form.min_b2b_qty) || 0,
        distributor_price: Number(form.distributor_price) || 0,
        min_distributor_qty: Number(form.min_distributor_qty) || 0,
        supplier: form.supplier,
        preferred_supplier: form.preferred_supplier,
        supplier_invoice_number: form.supplier_invoice_number,
        supplier_invoice_date: form.supplier_invoice_date,
        item_received_date: form.item_received_date,
        initialStock: Number(form.initial_stock) || 0,
        reorderLevel: Number(form.reorder_level) || 0,
        safety_stock: Number(form.safety_stock) || 0,
        mfg_date: form.mfg_date,
        expiry_date: form.expiry_date,
        stock_batch_number: form.stock_batch_number,
        status: form.status,
        is_published_online: form.is_published_online,
        is_featured_online: form.is_featured_online,
        is_service_item: form.is_service_item,
        need_to_print_barcode_sticker: form.need_to_print_barcode_sticker,
        shortDescription: form.short_description,
        long_description: form.long_description,
        specifications: {
          base_name: form.base_name,
          product_base_code: form.product_base_code,
          size_l_kg: form.size_l_kg,
          warehouse: form.warehouse,
          location_in_warehouse: form.location_in_warehouse,
          has_manual_batch: form.has_manual_batch,
          stock_batch_expiry_date: form.stock_batch_expiry_date,
          opening_stock_batch_number: form.opening_stock_batch_number,
          opening_stock_batch_expiry_date: form.opening_stock_batch_expiry_date,
          not_for_sale: form.not_for_sale,
          only_for_portal: form.only_for_portal,
          not_for_portal: form.not_for_portal,
          has_label: form.has_label,
          label_headings: form.label_headings,
          weighing_scale_code: form.weighing_scale_code,
          conversion_factor: form.conversion_factor,
          keywords: form.keywords,
          accessories_keyword: form.accessories_keyword,
          description_html: form.description_html
        }
      };

      if (editingItemId) {
        await apiClient.put(`/inventory/${editingItemId}`, payload);
        triggerToast('✅ Product updated in database');
      } else {
        await apiClient.post('/inventory', payload);
        triggerToast('✅ Product created and saved in database');
      }

      setModalOpen(false);
      loadData();
    } catch {
      triggerToast('❌ Error saving product');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiClient.delete(`/inventory/${id}`);
      triggerToast('🗑️ Product deleted from database');
      loadData();
    } catch {
      triggerToast('❌ Error deleting product');
    }
  };

  const handleDuplicateItem = (item: ProductItem) => {
    setEditingItemId(null);
    setForm({
      ...form,
      name: `${item.name} (Copy)`,
      unique_item_name: `${item.name} (Copy)`,
      item_code: `ITM-${Math.floor(10000 + Math.random() * 90000)}`,
      sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      brand: item.brand,
      category: item.category,
      unit: item.unit,
      mrp: String(item.mrp || '0.00'),
      selling_price: String(item.sellingPrice || item.mrp || '0.00'),
      purchase_price: String(item.purchasePrice || '0.00'),
      imageUrl: item.imageUrl || item.image_url || ''
    });
    setModalOpen(true);
  };

  // ══════════════════════════════════════════════════════════════════
  //  DYNAMIC ROW RENDERER (Handles All 65 Enterprise Columns)
  // ══════════════════════════════════════════════════════════════════
  const renderLocalRow = (product: ProductItem, visible: string[]) => {
    const isSelected = selectedProductIds.has(product.id);
    const specs = product.specifications || {};
    const activeCols = LOCAL_COLUMNS.filter((c) => visible.includes(c.id)).sort(
      (a, b) => a.seq - b.seq
    );

    return (
      <tr
        key={product.id}
        className={cn(
          'hover:bg-slate-50/80 transition border-b border-slate-100 text-xs text-slate-700',
          isSelected && 'bg-purple-50/50 hover:bg-purple-50/80'
        )}
      >
        {/* Checkbox */}
        <td className="w-10 px-4 py-3 text-center sticky left-0 bg-white group-hover:bg-slate-50 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectProduct(product.id)}
            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4 cursor-pointer"
          />
        </td>

        {/* Dynamic Columns */}
        {activeCols.map((col) => {
          const colId = col.id;
          const align = getFieldAlignment(colId);

          switch (colId) {
            case 'image':
              return (
                <td key={colId} className="px-3 py-2.5 text-center whitespace-nowrap">
                  {product.imageUrl || product.image_url ? (
                    <img
                      src={product.imageUrl || product.image_url}
                      alt={product.name}
                      onClick={() => setPreviewImage(product.imageUrl || product.image_url || null)}
                      className="w-9 h-9 mx-auto rounded-xl object-cover border border-slate-200 cursor-zoom-in hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-9 h-9 mx-auto rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <Box size={16} />
                    </div>
                  )}
                </td>
              );

            case 'name':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-bold text-slate-900 min-w-[200px] max-w-xs', align)}>
                  <div className="flex flex-col">
                    <span className="truncate">{product.name}</span>
                    {product.unique_item_name && product.unique_item_name !== product.name && (
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        {product.unique_item_name}
                      </span>
                    )}
                  </div>
                </td>
              );

            case 'unique_item_name':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 max-w-xs truncate', align)}>
                  {product.unique_item_name || product.name || '—'}
                </td>
              );

            case 'item_code':
            case 'sku':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-mono text-slate-500 font-medium whitespace-nowrap', align)}>
                  {colId === 'item_code' ? (product.item_code || product.sku || '—') : product.sku}
                </td>
              );

            case 'barcode':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap', align)}>
                  {product.barcode ? (
                    <div className="inline-flex items-center gap-1.5">
                      <span>{product.barcode}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenBarcodeModal(product)}
                        className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition"
                        title="Print Barcode Label"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerateBarcode(product)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1"
                    >
                      <Zap size={11} className="text-amber-500 fill-amber-500" /> Gen Barcode
                    </button>
                  )}
                </td>
              );

            case 'secondary_barcode':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap', align)}>
                  {product.secondary_barcode || specs.secondary_barcode || '—'}
                </td>
              );

            case 'brand':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {product.brand || product.brand_name || '—'}
                </td>
              );

            case 'category':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap', align)}>
                  {product.category || product.category_name || '—'}
                </td>
              );

            case 'sub_category':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {product.sub_category || product.sub_category_name || '—'}
                </td>
              );

            case 'uom':
            case 'sales_measuring_unit':
            case 'purchase_measuring_unit':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {product.unit || product.uom_name || 'Pcs'}
                </td>
              );

            case 'stock':
            case 'initial_stock':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-black text-slate-900 whitespace-nowrap', align)}>
                  {product.stock}
                </td>
              );

            case 'reorder_level':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-500 whitespace-nowrap', align)}>
                  {product.reorderLevel || product.reorder_level || 5}
                </td>
              );

            case 'safety_stock':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {product.safety_stock || 0}
                </td>
              );

            case 'mrp':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {formatPrice(product.mrp)}
                </td>
              );

            case 'selling_price':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap', align)}>
                  {formatPrice(product.sellingPrice || product.selling_price || product.mrp)}
                </td>
              );

            case 'sales_price_after_tax':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-bold text-purple-700 whitespace-nowrap', align)}>
                  {formatPrice(product.sales_price_after_tax || product.sellingPrice || product.mrp)}
                </td>
              );

            case 'purchase_price':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-600 whitespace-nowrap', align)}>
                  {formatPrice(product.purchasePrice || product.purchase_price)}
                </td>
              );

            case 'wholesale_price':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {formatPrice(product.wholesale_price)}
                </td>
              );

            case 'b2b_price':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {formatPrice(product.b2b_price)}
                </td>
              );

            case 'distributor_price':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {formatPrice(product.distributor_price)}
                </td>
              );

            case 'tax_percent':
            case 'purchase_tax_percent':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 font-semibold whitespace-nowrap', align)}>
                  {product.taxPercent || product.tax_percent || 18}%
                </td>
              );

            case 'sales_tax_type':
            case 'purchase_tax_type':
              return (
                <td key={colId} className={cn('px-4 py-2.5 whitespace-nowrap text-[10px] font-semibold text-slate-600', align)}>
                  {product.is_tax_inclusive !== false ? 'Inclusive' : 'Exclusive'}
                </td>
              );

            case 'sales_tax_name':
            case 'purchase_tax_name':
              return (
                <td key={colId} className={cn('px-4 py-2.5 whitespace-nowrap text-[10px] font-semibold text-slate-600', align)}>
                  {product.sales_tax_name || 'GST'}
                </td>
              );

            case 'hsn_code':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap', align)}>
                  {product.hsn_code || '—'}
                </td>
              );

            case 'supplier':
            case 'preferred_supplier':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap', align)}>
                  {product.supplier || product.preferred_supplier || '—'}
                </td>
              );

            case 'status':
              return (
                <td key={colId} className={cn('px-4 py-2.5 whitespace-nowrap', align)}>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold',
                      product.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    )}
                  >
                    {product.status}
                  </span>
                </td>
              );

            case 'is_published_online':
              return (
                <td key={colId} className={cn('px-4 py-2.5 whitespace-nowrap', align)}>
                  <button
                    type="button"
                    onClick={() => handleToggleStorefrontSync(product)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition cursor-pointer hover:scale-105',
                      product.is_published_online
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        product.is_published_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      )}
                    />
                    <span>{product.is_published_online ? 'Live Online' : 'In-Store Only'}</span>
                  </button>
                </td>
              );

            default: {
              const masterField = PRODUCT_MASTER_FIELDS.find((f) => f.id === colId);
              let val = masterField ? masterField.getter(product) : (specs[colId] || (product as any)[colId]);
              if (val === undefined || val === null || val === '') val = '—';
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                </td>
              );
            }
          }
        })}

        {/* Sticky Actions Column */}
        <td className="px-4 py-2.5 whitespace-nowrap text-right sticky right-0 bg-white/95 backdrop-blur-xs border-l border-slate-100 z-10 min-w-[170px] shadow-[-4px_0_6px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-end gap-1.5">
            {/* Import / Sync to POS Terminal */}
            <button
              type="button"
              onClick={() => handleTogglePosSync(product)}
              className={cn(
                'w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer',
                product.isSyncedToPos
                  ? 'bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-purple-50 hover:text-purple-600'
              )}
              title={product.isSyncedToPos ? 'Live on POS (Click to Remove)' : 'Import / Sync to POS Tab'}
            >
              <Store size={13} />
            </button>

            {/* Globe Toggle */}
            <button
              type="button"
              onClick={() => handleToggleStorefrontSync(product)}
              className={cn(
                'w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer',
                product.is_published_online
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
              )}
              title={product.is_published_online ? 'Live on Storefront (Click to Hide)' : 'In-Store Only (Click to Publish)'}
            >
              <Globe size={13} />
            </button>

            {/* Print Barcode */}
            {product.barcode && (
              <button
                type="button"
                onClick={() => handleOpenBarcodeModal(product)}
                className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-600 flex items-center justify-center transition cursor-pointer"
                title="Print Barcode Label"
              >
                <Printer size={13} />
              </button>
            )}

            {/* Edit */}
            <button
              type="button"
              onClick={() => handleOpenEditModal(product)}
              className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Edit Product"
            >
              <Edit2 size={13} />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => handleDuplicateItem(product)}
              className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Duplicate Product"
            >
              <Copy size={13} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDeleteItem(product.id)}
              className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer"
              title="Delete Product"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  //  DYNAMIC MASTER CATALOG ROW RENDERER
  // ══════════════════════════════════════════════════════════════════
  const renderMasterRow = (item: MasterCatalogItem, visible: string[]) => {
    const activeCols = MASTER_COLUMNS.filter((c) => visible.includes(c.id)).sort(
      (a, b) => a.seq - b.seq
    );

    const isAISourced = (item.source || '').toLowerCase().includes('ai') || (item.source || '').toLowerCase().includes('open food');
    const sourceLabel = item.source || (isAISourced ? 'AI SOURCED' : 'GLOBAL CATALOG');

    return (
      <tr
        key={item.id}
        className="hover:bg-purple-50/20 bg-purple-50/5 transition border-b border-purple-100/50 text-xs text-slate-700"
      >
        {activeCols.map((col) => {
          const colId = col.id;
          const align = getFieldAlignment(colId);

          switch (colId) {
            case 'image':
              return (
                <td key="image" className="px-4 py-2.5 whitespace-nowrap text-center">
                  {item.imageUrl || item.image_url ? (
                    <img
                      src={item.imageUrl || item.image_url}
                      alt={item.name}
                      onClick={() => setPreviewImage(item.imageUrl || item.image_url || null)}
                      className="w-9 h-9 mx-auto rounded-lg object-cover border bg-white cursor-zoom-in hover:opacity-90 transition"
                    />
                  ) : (
                    <div className="w-9 h-9 mx-auto rounded-lg bg-purple-100/40 flex items-center justify-center text-purple-600">
                      <Globe size={16} />
                    </div>
                  )}
                </td>
              );

            case 'name':
              return (
                <td key="name" className={cn('px-4 py-2.5 font-bold text-slate-900 min-w-[220px]', align)}>
                  <div className="truncate">{item.name}</div>
                  <div className={cn(
                    "text-[10px] font-extrabold uppercase mt-0.5 inline-block tracking-wider",
                    isAISourced ? "text-blue-600" : "text-purple-600"
                  )}>
                    {sourceLabel}
                  </div>
                </td>
              );

            case 'item_code':
            case 'sku':
              return (
                <td key={colId} className={cn('px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap', align)}>
                  {item.sku || item.sku_code || item.item_code || '—'}
                </td>
              );

            case 'barcode':
              return (
                <td key="barcode" className={cn('px-4 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap', align)}>
                  {item.barcode || '—'}
                </td>
              );

            case 'brand':
              return (
                <td key="brand" className={cn('px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap', align)}>
                  {item.brand || item.brand_name || '—'}
                </td>
              );

            case 'category':
              return (
                <td key="category" className={cn('px-4 py-2.5 text-slate-700 whitespace-nowrap', align)}>
                  {item.category || item.category_name || '—'}
                </td>
              );

            case 'uom':
            case 'sales_measuring_unit':
            case 'purchase_measuring_unit':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {item.unit || item.uom_name || 'Pcs'}
                </td>
              );

            case 'stock':
            case 'initial_stock':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-center font-bold text-slate-800', align)}>
                  0
                </td>
              );

            case 'reorder_level':
            case 'safety_stock':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-center text-slate-500', align)}>
                  {item.reorderLevel || item.reorder_level || 5}
                </td>
              );

            case 'mrp':
              return (
                <td key="mrp" className={cn('px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap', align)}>
                  {formatPrice(item.mrp)}
                </td>
              );

            case 'selling_price':
            case 'sales_price_after_tax':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-800 whitespace-nowrap', align)}>
                  {formatPrice(item.sellingPrice || item.sale_price || item.mrp)}
                </td>
              );

            case 'purchase_price':
            case 'purchase_price_after_tax':
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-800 whitespace-nowrap', align)}>
                  {formatPrice(item.purchasePrice || item.cost_price || 0)}
                </td>
              );

            case 'source':
              return (
                <td key="source" className="px-4 py-2.5 whitespace-nowrap text-center">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px]",
                    isAISourced ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-100 text-purple-700"
                  )}>
                    <Sparkles size={12} /> {sourceLabel}
                  </span>
                </td>
              );

            default: {
              const masterField = PRODUCT_MASTER_FIELDS.find((f) => f.id === colId);
              let val = masterField ? masterField.getter(item as any) : (item as any)[colId];
              if (val === undefined || val === null || val === '') val = '—';
              return (
                <td key={colId} className={cn('px-4 py-2.5 text-slate-600 whitespace-nowrap', align)}>
                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                </td>
              );
            }
          }
        })}

        {/* Action Column */}
        <td className="px-4 py-2.5 text-right whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs border-l border-slate-100 z-10 min-w-[120px] shadow-[-4px_0_6px_rgba(0,0,0,0.02)]">
          {item.isImported ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle size={13} /> In Inventory
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handleImportFromCatalog(item.id)}
              className="h-7 px-3 text-[11px] font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <ShoppingCart size={13} /> Import
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Row with Exact 7 Action Buttons Matching Screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage your inventory products and browse the global master catalog.
          </p>
        </div>

        {/* Action Button Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadSampleExcel}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Sample Excel</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Upload size={14} className="text-slate-600" />
            <span>Import File</span>
          </button>

          <button
            type="button"
            onClick={handleExportData}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download size={14} className="text-slate-600" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenBarcodeModal()}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Printer size={14} className="text-emerald-600" />
            <span>Print Barcodes</span>
          </button>

          <button
            type="button"
            onClick={() => setFreeSchemesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Gift size={14} className="text-emerald-600" />
            <span>Free Schemes</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAiImages}
            className={cn(
              'px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer',
              aiPaused
                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
            )}
          >
            {aiPaused ? (
              <Pause size={13} className="fill-emerald-600 text-emerald-600" />
            ) : (
              <Play size={13} className="fill-amber-600 text-amber-600" />
            )}
            <span>{aiPaused ? 'Pause AI Images' : 'Resume AI Images'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 transition shadow-md shadow-purple-500/20 cursor-pointer"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>Create Product</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Pills (My Inventory vs Master Catalog) */}
      <div className="flex items-center gap-2">
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('My Inventory');
              setSearch('');
            }}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer',
              activeTab === 'My Inventory'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Package size={14} />
            <span>My Inventory</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('Master Catalog');
              setMasterSearch('');
            }}
            className={cn(
              'px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer',
              activeTab === 'Master Catalog'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Globe size={14} />
            <span>Master Catalog</span>
            {masterSearch.trim() && unimportedMasterCatalog.length > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
                {unimportedMasterCatalog.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 1: MY INVENTORY TAB                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'My Inventory' && (
        <div className="space-y-3">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory by name, SKU, or Barcode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end relative">
              {/* Sort button */}
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ArrowUpDown size={13} />
                <span>Sort: Name ({sortOrder === 'asc' ? 'A-Z ↑' : 'Z-A ↓'})</span>
              </button>

              {/* Filters Drawer Toggle */}
              <button
                type="button"
                onClick={() => setFiltersDrawerOpen(!filtersDrawerOpen)}
                className={cn(
                  'px-3.5 py-2 bg-white border rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer',
                  categoryFilter !== 'All Categories' || stockStatusFilter !== 'All' || brandFilter !== 'All'
                    ? 'border-purple-300 text-purple-700 bg-purple-50'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                )}
              >
                <Filter size={13} />
                <span>Filters</span>
              </button>

              {/* Columns Customizer 65 Button */}
              <button
                type="button"
                onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sliders size={13} />
                <span>Columns</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
                  {localVisibleColumns.length}
                </span>
              </button>

              {/* ColumnMenu Popover */}
              {isColumnsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsColumnsMenuOpen(false)} />
                  <ColumnMenu
                    columns={LOCAL_COLUMNS}
                    visible={localVisibleColumns}
                    onToggle={(id) => {
                      setLocalVisibleColumns((prev) =>
                        prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
                      );
                    }}
                    onToggleAll={() => {
                      if (localVisibleColumns.length === LOCAL_COLUMNS.length) {
                        setLocalVisibleColumns(defaultLocalVisible);
                      } else {
                        setLocalVisibleColumns(LOCAL_COLUMNS.map((c) => c.id));
                      }
                    }}
                    onApplyPreset={(presetIds) => {
                      setLocalVisibleColumns(presetIds);
                      localStorage.setItem('gym_inventory_visible_columns_v6', JSON.stringify(presetIds));
                      triggerToast('✨ Applied column view preset!');
                    }}
                    onSave={() => {
                      localStorage.setItem(
                        'gym_inventory_visible_columns_v6',
                        JSON.stringify(localVisibleColumns)
                      );
                      setIsColumnsMenuOpen(false);
                      triggerToast('💾 Column preferences saved!');
                    }}
                    onReset={() => {
                      setLocalVisibleColumns(defaultLocalVisible);
                      localStorage.setItem(
                        'gym_inventory_visible_columns_v6',
                        JSON.stringify(defaultLocalVisible)
                      );
                      triggerToast('🔄 Reset columns to all 65 master fields.');
                    }}
                    onClose={() => setIsColumnsMenuOpen(false)}
                  />
                </>
              )}
            </div>
          </div>

          {/* Filters Bar (When Open) */}
          {filtersDrawerOpen && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-4 items-center text-xs animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Category:
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Supplements">Supplements</option>
                  <option value="Nutrition">Nutrition</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Merchandise">Merchandise</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Stock Status:
                </label>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => {
                    setStockStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="All">All Stock Levels</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Brand:
                </label>
                <select
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="All">All Brands</option>
                  {Array.from(new Set(items.map((i) => i.brand))).filter(Boolean).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('All Categories');
                  setStockStatusFilter('All');
                  setBrandFilter('All');
                }}
                className="mt-4 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-white font-bold"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Bulk Selection Floating Action Banner */}
          {selectedProductIds.size > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-black tracking-wide">
                  {selectedProductIds.size} product{selectedProductIds.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Prominent Import to POS Button */}
                <button
                  type="button"
                  onClick={handleBulkImportToPos}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition transform hover:scale-[1.02] cursor-pointer"
                >
                  <Store size={14} className="stroke-[2.5]" />
                  <span>Import to POS ({selectedProductIds.size})</span>
                </button>

                {/* Quick Navigate to POS Terminal */}
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToPos) onNavigateToPos();
                    else navigate('/owner/pos');
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingCart size={13} />
                  <span>Open POS Tab</span>
                </button>

                {/* Delete Selected Button */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 size={13} /> Delete ({selectedProductIds.size})
                </button>
              </div>
            </div>
          )}

          {/* Main Table Container */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Loader2 size={32} className="mx-auto animate-spin text-purple-600" />
                <p className="text-xs font-bold">Loading live inventory database...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No inventory products found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click "+ Create Product" to add your first catalog item or browse the Master Catalog.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus size={14} /> Add Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider sticky top-0 z-30">
                    <tr>
                      <th className="w-10 px-4 py-3.5 text-center sticky left-0 bg-slate-50 z-30">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={selectedProductIds.size === filteredItems.length && filteredItems.length > 0}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4 cursor-pointer"
                        />
                      </th>
                      {LOCAL_COLUMNS.filter((c) => localVisibleColumns.includes(c.id))
                        .sort((a, b) => a.seq - b.seq)
                        .map((col) => (
                          <th
                            key={col.id}
                            className={cn('px-4 py-3.5 whitespace-nowrap', getFieldAlignment(col.id))}
                          >
                            {col.label}
                          </th>
                        ))}
                      <th className="px-4 py-3.5 text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-30 min-w-[140px] shadow-[-4px_0_6px_rgba(0,0,0,0.02)]">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedItems.map((item) => renderLocalRow(item, localVisibleColumns))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {filteredItems.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t bg-slate-50/50 text-xs text-slate-500 font-semibold">
                <div>
                  Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
                  <span className="font-bold text-slate-900">
                    {Math.min(startIndex + pageSize, filteredItems.length)}
                  </span>{' '}
                  of <span className="font-bold text-slate-900">{filteredItems.length}</span> products
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value={10}>10</option>
                      <option value={12}>12</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-bold text-slate-900">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: MASTER CATALOG TAB                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'Master Catalog' && (
        <div className="space-y-4">
          {/* Search bar matching Screenshot 2 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search master catalog / barcode (Press Enter)..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleMasterSearch();
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>
            <button
              type="button"
              disabled={isSearchingMaster}
              onClick={handleMasterSearch}
              className="px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSearchingMaster ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              <span>Search</span>
            </button>
          </div>

          {/* Banner matching Screenshot 2 */}
          {masterSearch.trim() && unimportedMasterCatalog.length > 0 && (
            <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-3.5 flex items-center justify-between animate-fade-in shadow-2xs">
              <p className="text-xs text-purple-800 font-semibold">
                Found <span className="font-bold">{unimportedMasterCatalog.length}</span> unique product{unimportedMasterCatalog.length !== 1 ? 's' : ''} not yet in your inventory. Click <span className="font-bold text-purple-900">Import</span> to add any product directly.
              </p>
            </div>
          )}

          {/* Master Catalog Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider sticky top-0 z-30">
                  <tr>
                    {MASTER_COLUMNS.filter((c) => masterVisibleColumns.includes(c.id))
                      .sort((a, b) => a.seq - b.seq)
                      .map((col) => (
                        <th
                          key={col.id}
                          className={cn('px-4 py-3.5 whitespace-nowrap', getFieldAlignment(col.id))}
                        >
                          {col.label}
                        </th>
                      ))}
                    <th className="px-4 py-3.5 text-right whitespace-nowrap sticky right-0 bg-slate-50 border-l border-slate-200 z-30 min-w-[120px] shadow-[-4px_0_6px_rgba(0,0,0,0.02)]">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isSearchingMaster ? (
                    <tr>
                      <td colSpan={masterVisibleColumns.length + 1} className="p-12 text-center text-purple-600 text-xs font-bold">
                        <Loader2 size={28} className="mx-auto mb-2 animate-spin text-purple-600" />
                        <p>Searching global master catalog & real-time registries...</p>
                      </td>
                    </tr>
                  ) : unimportedMasterCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={masterVisibleColumns.length + 1} className="p-12 text-center text-slate-400 text-xs font-bold">
                        <Globe size={32} className="mx-auto mb-2 opacity-30 text-purple-600" />
                        <p>Search for a product to browse the global master catalog.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Type a product name, SKU, or barcode to source from AI or the global database.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    unimportedMasterCatalog.map((cat) => renderMasterRow(cat, masterVisibleColumns))
                  )}
                </tbody>

              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: 6-TAB ENTERPRISE CREATE / EDIT PRODUCT               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Package size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    {editingItemId ? 'Edit Product Attributes' : 'Create New Product Master'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Configure all 70 enterprise specifications, barcodes, taxes & pricing tiers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* 6 Tabs Header */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-200 bg-white overflow-x-auto shrink-0 text-xs">
              {[
                { id: 'basic', label: 'Basic & Identity', icon: Package },
                { id: 'pricing', label: 'Pricing & Tax', icon: DollarSign },
                { id: 'purchasing', label: 'Purchasing & Vendor', icon: Truck },
                { id: 'stock', label: 'Stock & Batches', icon: Box },
                { id: 'flags', label: 'Flags & Operations', icon: Zap },
                { id: 'specs', label: 'Descriptions & Specs', icon: FileText }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModalTab(tab.id as any)}
                    className={cn(
                      'px-4 py-3 font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer',
                      active
                        ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* TAB 1: BASIC & IDENTITY */}
              {activeModalTab === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Item Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Optimum Nutrition Gold Standard 100% Whey 2kg"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unique Item Name</label>
                    <input
                      type="text"
                      value={form.unique_item_name}
                      onChange={(e) => setForm({ ...form, unique_item_name: e.target.value })}
                      placeholder="e.g. ON Whey Double Rich Chocolate 2kg"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Code (SKU)</label>
                    <input
                      type="text"
                      value={form.item_code}
                      onChange={(e) => setForm({ ...form, item_code: e.target.value, sku: e.target.value })}
                      placeholder="e.g. ON-WHEY-2KG"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Barcode</label>
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="e.g. 748927028669"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Secondary Barcode</label>
                    <input
                      type="text"
                      value={form.secondary_barcode}
                      onChange={(e) => setForm({ ...form, secondary_barcode: e.target.value })}
                      placeholder="e.g. 8901234567890"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      placeholder="e.g. Optimum Nutrition, MuscleBlaze, Eleiko"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    >
                      <option value="Supplements">Supplements</option>
                      <option value="Nutrition">Nutrition</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Merchandise">Merchandise</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Sub Category</label>
                    <input
                      type="text"
                      value={form.sub_category}
                      onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
                      placeholder="e.g. Whey Protein, Creatine, Shakers"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Measuring Unit (UOM)</label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Pack">Pack</option>
                      <option value="Pairs">Pairs</option>
                      <option value="Kg">Kg</option>
                      <option value="Grams">Grams</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Product Image URL</label>
                    <input
                      type="text"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & TAX */}
              {activeModalTab === 'pricing' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.mrp}
                      onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.selling_price}
                      onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-black text-purple-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">GST Tax (%)</label>
                    <select
                      value={form.tax_percent}
                      onChange={(e) => setForm({ ...form, tax_percent: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={form.hsn_code}
                      onChange={(e) => setForm({ ...form, hsn_code: e.target.value })}
                      placeholder="21069099"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Discount Limit (%)</label>
                    <input
                      type="number"
                      value={form.discount_limit}
                      onChange={(e) => setForm({ ...form, discount_limit: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Wholesale Price (₹)</label>
                    <input
                      type="number"
                      value={form.wholesale_price}
                      onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">B2B Tier Price (₹)</label>
                    <input
                      type="number"
                      value={form.b2b_price}
                      onChange={(e) => setForm({ ...form, b2b_price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Distributor Price (₹)</label>
                    <input
                      type="number"
                      value={form.distributor_price}
                      onChange={(e) => setForm({ ...form, distributor_price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: PURCHASING & VENDOR */}
              {activeModalTab === 'purchasing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Purchase Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.purchase_price}
                      onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Supplier</label>
                    <input
                      type="text"
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="e.g. Glanbia Nutritionals India"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Preferred Supplier</label>
                    <input
                      type="text"
                      value={form.preferred_supplier}
                      onChange={(e) => setForm({ ...form, preferred_supplier: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Invoice Number</label>
                    <input
                      type="text"
                      value={form.supplier_invoice_number}
                      onChange={(e) => setForm({ ...form, supplier_invoice_number: e.target.value })}
                      placeholder="INV-2026-8842"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={form.supplier_invoice_date}
                      onChange={(e) => setForm({ ...form, supplier_invoice_date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Received Date</label>
                    <input
                      type="date"
                      value={form.item_received_date}
                      onChange={(e) => setForm({ ...form, item_received_date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: STOCK & BATCHES */}
              {activeModalTab === 'stock' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {editingItemId ? 'On Hand Stock' : 'Initial Stock Quantity'}
                    </label>
                    <input
                      type="number"
                      value={form.initial_stock}
                      onChange={(e) => setForm({ ...form, initial_stock: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Stock Alert / Reorder Level
                    </label>
                    <input
                      type="number"
                      value={form.reorder_level}
                      onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Safety Stock</label>
                    <input
                      type="number"
                      value={form.safety_stock}
                      onChange={(e) => setForm({ ...form, safety_stock: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Manufacturing Date</label>
                    <input
                      type="date"
                      value={form.mfg_date}
                      onChange={(e) => setForm({ ...form, mfg_date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Stock Batch Number</label>
                    <input
                      type="text"
                      value={form.stock_batch_number}
                      onChange={(e) => setForm({ ...form, stock_batch_number: e.target.value })}
                      placeholder="BATCH-2026-A1"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: FLAGS & OPERATIONS */}
              {activeModalTab === 'flags' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published_online}
                      onChange={(e) => setForm({ ...form, is_published_online: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Publish to Online Storefront</span>
                      <span className="text-[10px] text-slate-400">Makes product visible on gym mobile app & web store</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.need_to_print_barcode_sticker}
                      onChange={(e) => setForm({ ...form, need_to_print_barcode_sticker: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Print Barcode Sticker</span>
                      <span className="text-[10px] text-slate-400">Include in auto-print queue upon stock entry</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_service_item}
                      onChange={(e) => setForm({ ...form, is_service_item: e.target.checked })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Service Item</span>
                      <span className="text-[10px] text-slate-400">Non-tangible service (Personal training, Diet consultation)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.status === 'Active'}
                      onChange={(e) => setForm({ ...form, status: e.target.checked ? 'Active' : 'Inactive' })}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 size-4"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Active Status</span>
                      <span className="text-[10px] text-slate-400">Enable item for POS sales and transactions</span>
                    </div>
                  </label>
                </div>
              )}

              {/* TAB 6: DESCRIPTIONS & SPECS */}
              {activeModalTab === 'specs' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Short Description</label>
                    <textarea
                      rows={2}
                      value={form.short_description}
                      onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                      placeholder="Brief product highlight for POS receipts and quick cards..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Long Description & Nutritional Info
                    </label>
                    <textarea
                      rows={4}
                      value={form.long_description}
                      onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                      placeholder="Detailed product ingredients, instructions, and gym usage guidelines..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md shadow-purple-500/20"
                >
                  {editingItemId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: BARCODE PRINT DRAWER / MODAL                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {barcodeModalOpen && barcodePrintItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Print Barcode Labels</h3>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-center">
                <span className="font-bold text-slate-900 block text-sm">{barcodePrintItem.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  SKU: {barcodePrintItem.sku} • Barcode: {barcodePrintItem.barcode}
                </span>

                {/* Simulated Barcode Display */}
                <div className="py-3 px-6 bg-white border border-slate-200 rounded-xl inline-block mx-auto shadow-xs">
                  <div className="font-mono text-2xl tracking-widest font-black text-slate-900 scale-y-125">
                    ||| | |||| | ||||| || |
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-800 tracking-widest mt-1">
                    {barcodePrintItem.barcode}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                    MRP: {formatPrice(barcodePrintItem.mrp)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity to Print</label>
                  <input
                    type="number"
                    min={1}
                    value={barcodePrintQty}
                    onChange={(e) => setBarcodePrintQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Layout Mode</label>
                  <select
                    value={barcodeLayout}
                    onChange={(e) => setBarcodeLayout(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  >
                    <option value="1up">1-Up (50x25mm Thermal)</option>
                    <option value="2up">2-Up (Dual Column)</option>
                    <option value="3up">3-Up (A4 Sheet 24-up)</option>
                    <option value="4up">4-Up (A4 Sheet 40-up)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBarcodeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print {barcodePrintQty} Labels</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: FREE SCHEMES & BOGO PROMOTIONS                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {freeSchemesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Promotional Free Schemes (BOGO)</h3>
              </div>
              <button
                type="button"
                onClick={() => setFreeSchemesModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Add New Scheme Form */}
              <form onSubmit={handleCreateScheme} className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <span className="font-bold text-purple-900 block text-xs">Create New Scheme Rule</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Scheme Name (e.g. Buy 2 Whey, Get 1 Shaker Free)"
                      value={newSchemeName}
                      onChange={(e) => setNewSchemeName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={1}
                      placeholder="Buy Quantity (e.g. 2)"
                      value={newSchemeBuyQty}
                      onChange={(e) => setNewSchemeBuyQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Free Gift Product Name"
                      value={newSchemeGetProductName}
                      onChange={(e) => setNewSchemeGetProductName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Plus size={14} /> Add Scheme Rule
                </button>
              </form>

              {/* Active Schemes List */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block text-xs">Active Schemes ({freeSchemes.length})</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                  {freeSchemes.map((sch) => (
                    <div key={sch.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{sch.name}</span>
                        <span className="text-[10px] text-slate-400">
                          Applies to: {sch.appliesTo} • Buy {sch.buyQuantity} Get {sch.getQuantity} Free
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteScheme(sch.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title="Delete Scheme"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 4: IMAGE ZOOM PREVIEW                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] bg-white rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900"
            >
              <X size={16} />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
