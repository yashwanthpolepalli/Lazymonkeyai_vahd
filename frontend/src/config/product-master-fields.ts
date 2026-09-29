// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT FIELD ORDER — MASTER SYSTEM-WIDE CONFIGURATION (70 FIELDS)
//  Single source of truth for the entire Products module.
// ══════════════════════════════════════════════════════════════════════════════

export interface MasterProductField {
  seq: number;                   // 1 to 70
  id: string;                    // Internal model key
  excelHeader: string;           // Exact header name in Excel/CSV
  label: string;                 // UI display label
  type: "text" | "number" | "date" | "boolean" | "select" | "textarea" | "html" | "image" | "blank";
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
  group?: string;                // Logical group for visual layout (maintains relative 1..70 order)
  getter: (p: any) => any;
  setter?: (form: any, value: any) => void;
  renderCell?: (value: any, p: any, currencySymbol?: string) => string;
}

export const PRODUCT_MASTER_FIELDS: MasterProductField[] = [
  {
    seq: 1,
    id: "name",
    excelHeader: "ITEM NAME",
    label: "Item Name",
    type: "text",
    required: true,
    defaultValue: "",
    placeholder: "e.g. Royale Luxury Emulsion White 1L",
    group: "Basic & Identification",
    getter: (p) => p.name || "",
    setter: (form, val) => { form.name = val; },
  },
  {
    seq: 2,
    id: "item_code",
    excelHeader: "Item CODE",
    label: "Item Code (SKU)",
    type: "text",
    required: true,
    defaultValue: "",
    placeholder: "e.g. ITM-00123 / SKU-984",
    group: "Basic & Identification",
    getter: (p) => p.sku || p.item_code || p.specifications?.item_code || "",
    setter: (form, val) => { form.sku = val; form.item_code = val; },
  },
  {
    seq: 3,
    id: "barcode",
    excelHeader: "BarCode",
    label: "Barcode",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. 8901234567890",
    group: "Basic & Identification",
    getter: (p) => p.barcode || "",
    setter: (form, val) => { form.barcode = val; },
  },
  {
    seq: 4,
    id: "brand",
    excelHeader: "Brand",
    label: "Brand",
    type: "select",
    defaultValue: "",
    placeholder: "Select or enter brand",
    group: "Basic & Identification",
    getter: (p) => p.brand_name || p.brand || "",
    setter: (form, val) => { form.brand = val; form.brand_name = val; },
  },
  {
    seq: 5,
    id: "uom",
    excelHeader: "Measuring Unit",
    label: "Measuring Unit",
    type: "select",
    defaultValue: "PCS",
    placeholder: "e.g. PCS, KG, LTR, BOX",
    group: "Basic & Identification",
    getter: (p) => p.uom_name || p.uom || "PCS",
    setter: (form, val) => { form.uom = val; form.uom_name = val; },
  },
  {
    seq: 6,
    id: "stock",
    excelHeader: "Current Stock",
    label: "Current Stock",
    type: "number",
    defaultValue: 0,
    group: "Stock & Inventory",
    getter: (p) => p.stock ?? p.on_hand_stock ?? p.initial_stock ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.stock = isNaN(n) ? 0 : n; 
      form.initial_stock = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 7,
    id: "reorder_level",
    excelHeader: "Stock Alert",
    label: "Stock Alert (Reorder Level)",
    type: "number",
    defaultValue: 10,
    group: "Stock & Inventory",
    getter: (p) => p.reorder_level ?? p.specifications?.stock_alert ?? 10,
    setter: (form, val) => { 
      const n = Number(val);
      form.reorder_level = isNaN(n) ? 10 : n; 
    },
  },
  {
    seq: 8,
    id: "mfg_date",
    excelHeader: "Manifacturing DATE",
    label: "Manufacturing Date",
    type: "date",
    defaultValue: "",
    group: "Stock & Inventory",
    getter: (p) => p.mfg_date || p.specifications?.mfg_date || "",
    setter: (form, val) => { form.mfg_date = val; },
  },
  {
    seq: 9,
    id: "expiry_date",
    excelHeader: "EXPIRY DATE",
    label: "Expiry Date",
    type: "date",
    defaultValue: "",
    group: "Stock & Inventory",
    getter: (p) => p.expiry_date || p.specifications?.expiry_date || "",
    setter: (form, val) => { form.expiry_date = val; },
  },
  {
    seq: 10,
    id: "category",
    excelHeader: "CATEGORY",
    label: "Category",
    type: "select",
    defaultValue: "",
    placeholder: "Select category",
    group: "Classification",
    getter: (p) => p.category_name || p.category || "",
    setter: (form, val) => { form.category = val; form.category_name = val; },
  },
  {
    seq: 11,
    id: "sub_category",
    excelHeader: "SUB CATEGORY",
    label: "Sub Category",
    type: "select",
    defaultValue: "",
    placeholder: "Select or enter sub-category",
    group: "Classification",
    getter: (p) => p.sub_category || p.specifications?.sub_category || "",
    setter: (form, val) => { form.sub_category = val; },
  },
  {
    seq: 12,
    id: "blank_col_12",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 12]",
    type: "blank",
    defaultValue: "",
    group: "Classification",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 13,
    id: "hsn_code",
    excelHeader: "HSN",
    label: "HSN / SAC Code",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. 3209",
    group: "Pricing & Tax",
    getter: (p) => p.hsn_code || p.specifications?.hsn_code || "",
    setter: (form, val) => { form.hsn_code = val; },
  },
  {
    seq: 14,
    id: "mrp",
    excelHeader: "MRP",
    label: "MRP",
    type: "number",
    defaultValue: 0,
    group: "Pricing & Tax",
    getter: (p) => p.mrp ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.mrp = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 15,
    id: "purchase_price",
    excelHeader: "PURCHASE PRICE",
    label: "Purchase Price",
    type: "number",
    defaultValue: 0,
    group: "Pricing & Tax",
    getter: (p) => p.purchase_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.purchase_price = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 16,
    id: "purchase_tax_type",
    excelHeader: "PURCHASE Tax inclusive/Exclusive",
    label: "Purchase Tax Type",
    type: "select",
    defaultValue: "Inclusive",
    group: "Pricing & Tax",
    getter: (p) => p.specifications?.purchase_tax_type || (p.is_purchase_tax_inclusive === false ? "Exclusive" : "Inclusive"),
    setter: (form, val) => { form.purchase_tax_type = val; },
  },
  {
    seq: 17,
    id: "selling_price",
    excelHeader: "SALES PRICE",
    label: "Sales Price",
    type: "number",
    required: true,
    defaultValue: 0,
    group: "Pricing & Tax",
    getter: (p) => p.selling_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.selling_price = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 18,
    id: "sales_tax_type",
    excelHeader: "Sales Tax inclusive/Exclusive",
    label: "Sales Tax Type",
    type: "select",
    defaultValue: "Inclusive",
    group: "Pricing & Tax",
    getter: (p) => p.specifications?.sales_tax_type || (p.is_tax_inclusive !== false ? "Inclusive" : "Exclusive"),
    setter: (form, val) => { 
      form.sales_tax_type = val;
      form.is_tax_inclusive = (val === "Inclusive");
    },
  },
  {
    seq: 19,
    id: "b2b_price",
    excelHeader: "B2B PRICE",
    label: "B2B Price",
    type: "number",
    defaultValue: 0,
    group: "Pricing & Tiers",
    getter: (p) => p.b2b_price ?? p.specifications?.b2b_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.b2b_price = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 20,
    id: "min_b2b_qty",
    excelHeader: "MIN B2B QTY",
    label: "Min B2B Qty",
    type: "number",
    defaultValue: 1,
    group: "Pricing & Tiers",
    getter: (p) => p.min_b2b_qty ?? p.specifications?.min_b2b_qty ?? 1,
    setter: (form, val) => { 
      const n = Number(val);
      form.min_b2b_qty = isNaN(n) ? 1 : n; 
    },
  },
  {
    seq: 21,
    id: "wholesale_price",
    excelHeader: "WHOLESALE PRICE",
    label: "Wholesale Price",
    type: "number",
    defaultValue: 0,
    group: "Pricing & Tiers",
    getter: (p) => p.wholesale_price ?? p.specifications?.wholesale_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.wholesale_price = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 22,
    id: "min_wholesale_qty",
    excelHeader: "MIN WHOLESALE QTY",
    label: "Min Wholesale Qty",
    type: "number",
    defaultValue: 1,
    group: "Pricing & Tiers",
    getter: (p) => p.min_wholesale_qty ?? p.specifications?.min_wholesale_qty ?? 1,
    setter: (form, val) => { 
      const n = Number(val);
      form.min_wholesale_qty = isNaN(n) ? 1 : n; 
    },
  },
  {
    seq: 23,
    id: "base_name",
    excelHeader: "Base Code/Name",
    label: "Base Code / Name",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. Base White, Direct Red",
    group: "Asian Paints & Base Specs",
    getter: (p) => p.base_name || p.specifications?.base_name || "",
    setter: (form, val) => { form.base_name = val; },
  },
  {
    seq: 24,
    id: "product_base_code",
    excelHeader: "Product Base Code",
    label: "Product Base Code",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. 0W06, 912",
    group: "Asian Paints & Base Specs",
    getter: (p) => p.product_base_code || p.specifications?.product_base_code || "",
    setter: (form, val) => { form.product_base_code = val; },
  },
  {
    seq: 25,
    id: "secondary_barcode",
    excelHeader: "BarCode.1",
    label: "Secondary Barcode",
    type: "text",
    defaultValue: "",
    group: "Basic & Identification",
    getter: (p) => p.secondary_barcode || p.specifications?.secondary_barcode || "",
    setter: (form, val) => { form.secondary_barcode = val; },
  },
  {
    seq: 26,
    id: "short_description",
    excelHeader: "DESCRIPTION",
    label: "Description",
    type: "textarea",
    defaultValue: "",
    placeholder: "Brief product description...",
    group: "Descriptions & Specs",
    getter: (p) => p.short_description || p.description || p.specifications?.short_description || "",
    setter: (form, val) => { 
      form.short_description = val; 
      form.description = val; 
    },
  },
  {
    seq: 27,
    id: "description_html",
    excelHeader: "DESCRIPTI ON HTML",
    label: "Description HTML",
    type: "html",
    defaultValue: "",
    placeholder: "<p>Detailed specifications...</p>",
    group: "Descriptions & Specs",
    getter: (p) => p.specifications?.description_html || p.long_description || "",
    setter: (form, val) => { 
      form.description_html = val; 
      form.long_description = val; 
    },
  },
  {
    seq: 28,
    id: "conversion_factor",
    excelHeader: "CONVERSION FACTOR",
    label: "Conversion Factor",
    type: "number",
    defaultValue: 1,
    group: "Descriptions & Specs",
    getter: (p) => p.specifications?.conversion_factor ?? 1,
    setter: (form, val) => { 
      const n = Number(val);
      form.conversion_factor = isNaN(n) ? 1 : n; 
    },
  },
  {
    seq: 29,
    id: "weighing_scale_code",
    excelHeader: "WEIGHING SCALE ITEM CODE",
    label: "Weighing Scale Code",
    type: "text",
    defaultValue: "",
    placeholder: "PLU code for scale",
    group: "Descriptions & Specs",
    getter: (p) => p.specifications?.weighing_scale_code || "",
    setter: (form, val) => { form.weighing_scale_code = val; },
  },
  {
    seq: 30,
    id: "blank_col_30",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 30]",
    type: "blank",
    defaultValue: "",
    group: "Descriptions & Specs",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 31,
    id: "blank_col_31",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 31]",
    type: "blank",
    defaultValue: "",
    group: "Descriptions & Specs",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 32,
    id: "blank_col_32",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 32]",
    type: "blank",
    defaultValue: "",
    group: "Descriptions & Specs",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 33,
    id: "blank_col_33",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 33]",
    type: "blank",
    defaultValue: "",
    group: "Descriptions & Specs",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 34,
    id: "blank_col_34",
    excelHeader: "[BLANK COLUMN]",
    label: "[Blank Column 34]",
    type: "blank",
    defaultValue: "",
    group: "Descriptions & Specs",
    getter: () => "",
    setter: () => {},
  },
  {
    seq: 35,
    id: "sales_tax_name",
    excelHeader: "SALES TAX NAME",
    label: "Sales Tax Name",
    type: "text",
    defaultValue: "GST",
    group: "Taxes & Discounts",
    getter: (p) => p.specifications?.sales_tax_name || "GST",
    setter: (form, val) => { form.sales_tax_name = val; },
  },
  {
    seq: 36,
    id: "tax_percent",
    excelHeader: "SALES TAX PERCENT",
    label: "Sales Tax Percent",
    type: "number",
    defaultValue: 0,
    group: "Taxes & Discounts",
    getter: (p) => p.tax_percent ?? p.specifications?.sales_tax_percent ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.tax_percent = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 37,
    id: "sales_price_after_tax",
    excelHeader: "SALES PRICE AFTER TAX",
    label: "Sales Price After Tax",
    type: "number",
    defaultValue: 0,
    group: "Taxes & Discounts",
    getter: (p) => p.specifications?.sales_price_after_tax ?? p.selling_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.sales_price_after_tax = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 38,
    id: "discount_limit",
    excelHeader: "Disc1(%)",
    label: "Discount 1 (%)",
    type: "number",
    defaultValue: 0,
    group: "Taxes & Discounts",
    getter: (p) => p.discount_limit ?? p.specifications?.discount_percent ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.discount_limit = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 39,
    id: "discount_amount",
    excelHeader: "Disc1(Rs)",
    label: "Discount 1 (Flat Amount)",
    type: "number",
    defaultValue: 0,
    group: "Taxes & Discounts",
    getter: (p) => p.specifications?.discount_amount ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.discount_amount = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 40,
    id: "sales_measuring_unit",
    excelHeader: "SALES MEASURING UNIT",
    label: "Sales Measuring Unit",
    type: "text",
    defaultValue: "PCS",
    group: "Units & Warehouse",
    getter: (p) => p.specifications?.sales_measuring_unit || p.uom_name || p.uom || "PCS",
    setter: (form, val) => { form.sales_measuring_unit = val; },
  },
  {
    seq: 41,
    id: "purchase_tax_name",
    excelHeader: "PURCHASE TAX NAME",
    label: "Purchase Tax Name",
    type: "text",
    defaultValue: "GST",
    group: "Purchasing & Vendor",
    getter: (p) => p.specifications?.purchase_tax_name || "GST",
    setter: (form, val) => { form.purchase_tax_name = val; },
  },
  {
    seq: 42,
    id: "purchase_tax_percent",
    excelHeader: "PURCHASE TAX PERCENT",
    label: "Purchase Tax Percent",
    type: "number",
    defaultValue: 0,
    group: "Purchasing & Vendor",
    getter: (p) => p.specifications?.purchase_tax_percent ?? p.tax_percent ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.purchase_tax_percent = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 43,
    id: "purchase_price_after_tax",
    excelHeader: "PURCHASE PRICE AFTER TAX",
    label: "Purchase Price After Tax",
    type: "number",
    defaultValue: 0,
    group: "Purchasing & Vendor",
    getter: (p) => p.specifications?.purchase_price_after_tax ?? p.purchase_price ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.purchase_price_after_tax = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 44,
    id: "purchase_measuring_unit",
    excelHeader: "PURCHASE MEASURING UNIT",
    label: "Purchase Measuring Unit",
    type: "text",
    defaultValue: "PCS",
    group: "Purchasing & Vendor",
    getter: (p) => p.specifications?.purchase_measuring_unit || p.uom_name || p.uom || "PCS",
    setter: (form, val) => { form.purchase_measuring_unit = val; },
  },
  {
    seq: 45,
    id: "warehouse",
    excelHeader: "WAREHOUSE NAME",
    label: "Warehouse Name",
    type: "select",
    defaultValue: "Main Warehouse",
    group: "Units & Warehouse",
    getter: (p) => p.warehouse || "Main Warehouse",
    setter: (form, val) => { form.warehouse = val; },
  },
  {
    seq: 46,
    id: "location_in_warehouse",
    excelHeader: "LOCATION IN WAREHOUSE",
    label: "Location in Warehouse",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. Aisle 3, Rack B",
    group: "Units & Warehouse",
    getter: (p) => p.rack_location || p.specifications?.location_in_warehouse || "",
    setter: (form, val) => { 
      form.rack_location = val; 
      form.location_in_warehouse = val; 
    },
  },
  {
    seq: 47,
    id: "status",
    excelHeader: "IS ACTIVE",
    label: "Is Active",
    type: "boolean",
    defaultValue: true,
    group: "Flags & Operations",
    getter: (p) => p.status === "active" || p.status === true || p.is_active !== false,
    setter: (form, val) => { 
      const boolVal = val === true || val === "TRUE" || val === "true" || val === 1 || val === "1";
      form.status = boolVal ? "active" : "inactive";
      form.is_active = boolVal;
    },
  },
  {
    seq: 48,
    id: "has_label",
    excelHeader: "HAS LABEL",
    label: "Has Label",
    type: "boolean",
    defaultValue: true,
    group: "Flags & Operations",
    getter: (p) => p.specifications?.has_label !== false,
    setter: (form, val) => { 
      form.has_label = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 49,
    id: "label_headings",
    excelHeader: "LABEL HEADINGS",
    label: "Label Headings",
    type: "text",
    defaultValue: "",
    placeholder: "Custom barcode label header",
    group: "Flags & Operations",
    getter: (p) => p.specifications?.label_headings || "",
    setter: (form, val) => { form.label_headings = val; },
  },
  {
    seq: 50,
    id: "supplier",
    excelHeader: "SUPPLIER NAME",
    label: "Supplier Name",
    type: "select",
    defaultValue: "",
    placeholder: "Select or enter supplier",
    group: "Purchasing & Invoicing",
    getter: (p) => p.supplier || p.specifications?.supplier || "",
    setter: (form, val) => { form.supplier = val; },
  },
  {
    seq: 51,
    id: "item_received_date",
    excelHeader: "ITEM RECEIVED DATE",
    label: "Item Received Date",
    type: "date",
    defaultValue: "",
    group: "Purchasing & Invoicing",
    getter: (p) => p.specifications?.item_received_date || "",
    setter: (form, val) => { form.item_received_date = val; },
  },
  {
    seq: 52,
    id: "supplier_invoice_number",
    excelHeader: "SUPPLIER INVOICE NUMBER",
    label: "Supplier Invoice Number",
    type: "text",
    defaultValue: "",
    placeholder: "Vendor bill reference",
    group: "Purchasing & Invoicing",
    getter: (p) => p.specifications?.supplier_invoice_number || "",
    setter: (form, val) => { form.supplier_invoice_number = val; },
  },
  {
    seq: 53,
    id: "supplier_invoice_date",
    excelHeader: "SUPPLIER INVOICE DATE",
    label: "Supplier Invoice Date",
    type: "date",
    defaultValue: "",
    group: "Purchasing & Invoicing",
    getter: (p) => p.specifications?.supplier_invoice_date || "",
    setter: (form, val) => { form.supplier_invoice_date = val; },
  },
  {
    seq: 54,
    id: "need_to_print_barcode_sticker",
    excelHeader: "NEED TO PRINT BARCODE STICKER",
    label: "Need to Print Barcode Sticker",
    type: "boolean",
    defaultValue: true,
    group: "Flags & Operations",
    getter: (p) => p.specifications?.need_to_print_barcode_sticker !== false,
    setter: (form, val) => { 
      form.need_to_print_barcode_sticker = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 55,
    id: "is_service_item",
    excelHeader: "IS SERVICE ITEM",
    label: "Is Service Item",
    type: "boolean",
    defaultValue: false,
    group: "Flags & Operations",
    getter: (p) => Boolean(p.specifications?.is_service_item),
    setter: (form, val) => { 
      form.is_service_item = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 56,
    id: "not_for_sale",
    excelHeader: "NOTFORSALE",
    label: "Not For Sale",
    type: "boolean",
    defaultValue: false,
    group: "Flags & Operations",
    getter: (p) => Boolean(p.specifications?.not_for_sale),
    setter: (form, val) => { 
      form.not_for_sale = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 57,
    id: "only_for_portal",
    excelHeader: "ONLY FOR PORTAL",
    label: "Only For Portal",
    type: "boolean",
    defaultValue: false,
    group: "Flags & Operations",
    getter: (p) => Boolean(p.specifications?.only_for_portal),
    setter: (form, val) => { 
      form.only_for_portal = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 58,
    id: "not_for_portal",
    excelHeader: "NOT FOR PORTAL",
    label: "Not For Portal",
    type: "boolean",
    defaultValue: false,
    group: "Flags & Operations",
    getter: (p) => Boolean(p.specifications?.not_for_portal),
    setter: (form, val) => { 
      form.not_for_portal = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 59,
    id: "has_manual_batch",
    excelHeader: "HAS MANUAL BATCH",
    label: "Has Manual Batch",
    type: "boolean",
    defaultValue: false,
    group: "Batches & Expiry",
    getter: (p) => Boolean(p.specifications?.has_manual_batch),
    setter: (form, val) => { 
      form.has_manual_batch = (val === true || val === "TRUE" || val === "true" || val === 1 || val === "1"); 
    },
  },
  {
    seq: 60,
    id: "stock_batch_number",
    excelHeader: "STOCK BATCH NUMBER",
    label: "Stock Batch Number",
    type: "text",
    defaultValue: "",
    placeholder: "e.g. BATCH-2026-A",
    group: "Batches & Expiry",
    getter: (p) => p.specifications?.stock_batch_number || "",
    setter: (form, val) => { form.stock_batch_number = val; },
  },
  {
    seq: 61,
    id: "stock_batch_expiry_date",
    excelHeader: "STOCK BATCH EXPIRY DATE",
    label: "Stock Batch Expiry Date",
    type: "date",
    defaultValue: "",
    group: "Batches & Expiry",
    getter: (p) => p.specifications?.stock_batch_expiry_date || "",
    setter: (form, val) => { form.stock_batch_expiry_date = val; },
  },
  {
    seq: 62,
    id: "opening_stock_batch_number",
    excelHeader: "OPENING STOCK BATCH NUMBER",
    label: "Opening Stock Batch Number",
    type: "text",
    defaultValue: "",
    group: "Batches & Expiry",
    getter: (p) => p.specifications?.opening_stock_batch_number || "",
    setter: (form, val) => { form.opening_stock_batch_number = val; },
  },
  {
    seq: 63,
    id: "opening_stock_batch_expiry_date",
    excelHeader: "OPENING STOCK BATCH EXPIRY DATE",
    label: "Opening Stock Batch Expiry Date",
    type: "date",
    defaultValue: "",
    group: "Batches & Expiry",
    getter: (p) => p.specifications?.opening_stock_batch_expiry_date || "",
    setter: (form, val) => { form.opening_stock_batch_expiry_date = val; },
  },
  {
    seq: 64,
    id: "display_index",
    excelHeader: "DISPLAYINDEX",
    label: "Display Index",
    type: "number",
    defaultValue: 0,
    group: "Display & Media",
    getter: (p) => p.specifications?.display_index ?? 0,
    setter: (form, val) => { 
      const n = Number(val);
      form.display_index = isNaN(n) ? 0 : n; 
    },
  },
  {
    seq: 65,
    id: "image_url",
    excelHeader: "ITEMIMAGE",
    label: "Item Image URL",
    type: "image",
    defaultValue: "",
    group: "Display & Media",
    getter: (p) => p.image_url || p.image || "",
    setter: (form, val) => { form.image_url = val; },
  },
  {
    seq: 66,
    id: "category_image",
    excelHeader: "CATEGORYIMAGE",
    label: "Category Image URL",
    type: "image",
    defaultValue: "",
    group: "Display & Media",
    getter: (p) => p.specifications?.category_image || "",
    setter: (form, val) => { form.category_image = val; },
  },
  {
    seq: 67,
    id: "unique_item_name",
    excelHeader: "UNIQUE ITEM NAME",
    label: "Unique Item Name",
    type: "text",
    defaultValue: "",
    placeholder: "Canonical unique title",
    group: "Search & Metadata",
    getter: (p) => p.unique_item_name || p.specifications?.unique_item_name || p.name || "",
    setter: (form, val) => { form.unique_item_name = val; },
  },
  {
    seq: 68,
    id: "keywords",
    excelHeader: "KEYWORDS",
    label: "Keywords",
    type: "text",
    defaultValue: "",
    placeholder: "Comma-separated search keywords",
    group: "Search & Metadata",
    getter: (p) => p.specifications?.keywords || "",
    setter: (form, val) => { form.keywords = val; },
  },
  {
    seq: 69,
    id: "accessories_keyword",
    excelHeader: "ACCESSORIES KEYWORD",
    label: "Accessories Keyword",
    type: "text",
    defaultValue: "",
    placeholder: "Related accessories keywords",
    group: "Search & Metadata",
    getter: (p) => p.specifications?.accessories_keyword || "",
    setter: (form, val) => { form.accessories_keyword = val; },
  },
  {
    seq: 70,
    id: "preferred_supplier",
    excelHeader: "PREFERRED SUPPLIER",
    label: "Preferred Supplier",
    type: "select",
    defaultValue: "",
    placeholder: "Select preferred supplier",
    group: "Search & Metadata",
    getter: (p) => p.specifications?.preferred_supplier || p.supplier || "",
    setter: (form, val) => { form.preferred_supplier = val; },
  },
];

// ── Export Utility Helpers ───────────────────────────────────────────────────

/** Returns all 70 exact Excel headers in sequence 1..70 */
export function getMasterExportHeaders(): string[] {
  return PRODUCT_MASTER_FIELDS.map((f) => f.excelHeader);
}

/** Converts a product entity into a 70-column object formatted in master sequence */
export function mapProductToMasterExportRow(p: any): Record<string, any> {
  const row: Record<string, any> = {};
  for (const f of PRODUCT_MASTER_FIELDS) {
    if (f.type === "blank") {
      row[f.excelHeader] = "";
    } else if (f.type === "boolean") {
      const val = f.getter(p);
      row[f.excelHeader] = val ? "TRUE" : "FALSE";
    } else {
      const val = f.getter(p);
      row[f.excelHeader] = val == null ? "" : val;
    }
  }
  return row;
}

/** Generates standard sample rows adhering to the 70-field sequence */
export function getMasterSampleRows(): Record<string, any>[] {
  const sampleMap: Record<string, any> = {
    name: "Royale Luxury Emulsion White 1L",
    item_code: "AP-ROY-WHT-1L",
    barcode: "8901234567890",
    brand: "Asian Paints",
    uom: "LTR",
    stock: 50,
    reorder_level: 10,
    mfg_date: "2026-01-15",
    expiry_date: "2029-01-15",
    category: "Paints & Finishes",
    sub_category: "Interior Emulsion",
    hsn_code: "3209",
    mrp: 540,
    purchase_price: 380,
    purchase_tax_type: "Inclusive",
    selling_price: 490,
    sales_tax_type: "Inclusive",
    b2b_price: 460,
    min_b2b_qty: 10,
    wholesale_price: 440,
    min_wholesale_qty: 20,
    base_name: "Base White",
    product_base_code: "0W06",
    secondary_barcode: "8901234567891",
    short_description: "Luxury interior emulsion with teflon surface protector.",
    description_html: "<p>Ultra-sheen interior paint with high washability.</p>",
    conversion_factor: 1,
    weighing_scale_code: "101",
    sales_tax_name: "GST",
    tax_percent: 18,
    sales_price_after_tax: 490,
    discount_limit: 5,
    discount_amount: 0,
    sales_measuring_unit: "LTR",
    purchase_tax_name: "GST",
    purchase_tax_percent: 18,
    purchase_price_after_tax: 380,
    purchase_measuring_unit: "LTR",
    warehouse: "Main Warehouse",
    location_in_warehouse: "Aisle 4, Rack A",
    status: "TRUE",
    has_label: "TRUE",
    label_headings: "ROYALE EMULSION",
    supplier: "Asian Paints Distribution Hub",
    item_received_date: "2026-02-01",
    supplier_invoice_number: "INV-AP-88219",
    supplier_invoice_date: "2026-02-01",
    need_to_print_barcode_sticker: "TRUE",
    is_service_item: "FALSE",
    not_for_sale: "FALSE",
    only_for_portal: "FALSE",
    not_for_portal: "FALSE",
    has_manual_batch: "TRUE",
    stock_batch_number: "BAT-2026-02A",
    stock_batch_expiry_date: "2029-01-15",
    opening_stock_batch_number: "BAT-2026-01A",
    opening_stock_batch_expiry_date: "2029-01-15",
    display_index: 1,
    image_url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400",
    category_image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400",
    unique_item_name: "ASIAN-PAINTS-ROYALE-LUXURY-EMULSION-WHITE-1L",
    keywords: "paint, emulsion, interior, asian paints, white",
    accessories_keyword: "roller, brush, primer, masking tape",
    preferred_supplier: "Asian Paints Distribution Hub"
  };

  const row: Record<string, any> = {};
  for (const f of PRODUCT_MASTER_FIELDS) {
    if (f.type === "blank") continue;
    row[f.excelHeader] = sampleMap[f.id] ?? f.defaultValue ?? "";
  }
  return [row];
}

/** Helper to cleanly format numbers that might have been parsed in scientific notation or with commas/currency */
function cleanImportString(val: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  let s = String(val).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return undefined;
  }
  // If Excel parsed a long numeric code (like a 13-digit barcode or HSN) as scientific notation e.g. 8.90123E+12
  if (typeof val === "number" && !isNaN(val)) {
    // Check if it's an integer
    if (Number.isInteger(val)) {
      return val.toLocaleString("fullwide", { useGrouping: false });
    }
  }
  // Strip trailing .0 if an integer code was parsed as float e.g. "3208.0" -> "3208"
  if (/^\d+\.0$/.test(s)) {
    s = s.slice(0, -2);
  }
  return s;
}

function cleanImportNumber(val: any, defaultVal = 0): number {
  if (val === undefined || val === null || val === "") return defaultVal;
  if (typeof val === "number") {
    return isNaN(val) ? defaultVal : val;
  }
  const cleaned = String(val).replace(/[^0-9.-]/g, "").trim();
  if (!cleaned || cleaned === "-" || cleaned === ".") return defaultVal;
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultVal : num;
}

function cleanImportInteger(val: any, defaultVal = 0): number {
  const num = cleanImportNumber(val, defaultVal);
  return Math.round(num);
}

/** Maps an imported raw Excel / CSV object into a product form / API entity */
export function mapMasterImportRowToProduct(rawRow: Record<string, any>): Record<string, any> {
  const normalizedRow: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawRow || {})) {
    if (k && v !== undefined && v !== null) {
      normalizedRow[k.trim().toLowerCase()] = v;
      // Also index with stripped punctuation and spaces for fuzzy header matching
      normalizedRow[k.trim().toLowerCase().replace(/[^a-z0-9]/g, "")] = v;
    }
  }

  const getRawVal = (excelHeader: string, aliases: string[] = []) => {
    const direct = normalizedRow[excelHeader.trim().toLowerCase()];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") return direct;
    
    const directStripped = normalizedRow[excelHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (directStripped !== undefined && directStripped !== null && String(directStripped).trim() !== "") return directStripped;

    for (const a of aliases) {
      const aliasVal = normalizedRow[a.toLowerCase()];
      if (aliasVal !== undefined && aliasVal !== null && String(aliasVal).trim() !== "") return aliasVal;
      
      const strippedAlias = normalizedRow[a.toLowerCase().replace(/[^a-z0-9]/g, "")];
      if (strippedAlias !== undefined && strippedAlias !== null && String(strippedAlias).trim() !== "") return strippedAlias;
    }
    return undefined;
  };

  const product: Record<string, any> = { specifications: {} };

  // 1. Resolve Product Name (The ONLY mandatory field)
  const resolvedName = getRawVal("ITEM NAME", [
    "Item Name", "item_name", "itemname", "Product Name", "product_name", "productname", 
    "name", "Product", "product", "Item", "item", "Title", "title", 
    "Description", "item description", "product description", "particulars", 
    "material", "goods", "sku name", "article name", "model", "ITEM_NAME"
  ]);

  if (resolvedName) {
    product.name = String(resolvedName).trim();
  }

  // 2. Map all master catalog fields
  for (const field of PRODUCT_MASTER_FIELDS) {
    if (field.type === "blank") continue;
    
    const rawVal = getRawVal(field.excelHeader, [
      field.label,
      field.id,
      field.excelHeader.replace(/\s+/g, ""),
      field.excelHeader.replace(/[^a-zA-Z0-9]/g, "")
    ]);

    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
      let parsedVal: any;

      if (field.type === "number") {
        parsedVal = cleanImportNumber(rawVal, field.defaultValue ?? 0);
      } else if (field.type === "boolean") {
        const s = String(rawVal).trim().toLowerCase();
        parsedVal = (s === "true" || s === "1" || s === "yes" || s === "y");
      } else {
        parsedVal = cleanImportString(rawVal);
      }

      if (parsedVal !== undefined && parsedVal !== null) {
        if (field.setter) {
          field.setter(product, parsedVal);
        }
        product.specifications[field.id] = parsedVal;
      }
    } else {
      if (field.defaultValue !== undefined && !(field.id in product)) {
        product[field.id] = field.defaultValue;
      }
    }
  }

  // 3. Clean and sanitize core identifiers
  if (product.barcode) {
    product.barcode = cleanImportString(product.barcode);
  }
  if (product.sku) {
    product.sku = cleanImportString(product.sku);
  } else if (product.item_code) {
    product.sku = cleanImportString(product.item_code);
  }
  if (product.hsn_code) {
    product.hsn_code = cleanImportString(product.hsn_code);
  }

  // 4. Ensure number fields are valid floats/ints
  product.purchase_price = cleanImportNumber(product.purchase_price, 0);
  product.mrp = cleanImportNumber(product.mrp, 0);
  product.selling_price = cleanImportNumber(product.selling_price, 0);
  product.wholesale_price = cleanImportNumber(product.wholesale_price, 0);
  product.b2b_price = cleanImportNumber(product.b2b_price, 0);
  product.tax_percent = cleanImportNumber(product.tax_percent, 0);
  product.initial_stock = cleanImportInteger(product.initial_stock, 0);
  product.reorder_level = cleanImportInteger(product.reorder_level, 0);
  product.safety_stock = cleanImportInteger(product.safety_stock, 0);

  // 5. Clean string metadata (brand, category, UOM, supplier, etc.)
  if (product.brand_name) product.brand_name = cleanImportString(product.brand_name);
  if (product.category_name) product.category_name = cleanImportString(product.category_name);
  if (product.sub_category_name) product.sub_category_name = cleanImportString(product.sub_category_name);
  if (product.uom_name) product.uom_name = cleanImportString(product.uom_name);
  if (product.supplier) product.supplier = cleanImportString(product.supplier);
  if (product.warehouse) product.warehouse = cleanImportString(product.warehouse);
  if (product.base_name) product.base_name = cleanImportString(product.base_name);
  if (product.product_base_code) product.product_base_code = cleanImportString(product.product_base_code);
  if (product.size_l_kg) product.size_l_kg = cleanImportString(product.size_l_kg);

  return product;
}
