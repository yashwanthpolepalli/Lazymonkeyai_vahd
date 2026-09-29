import { useCurrency } from "@/hooks/use-currency";

// --- ENTERPRISE INVENTORY MOCK DATA ---

// WAREHOUSES & LOCATIONS
export const inventoryWarehouses = [
  { id: "wh1", name: "Mumbai Central Hub", type: "Distribution Center", capacity: "100,000 sqft", utilization: "84%", manager: "Rahul Sharma", employees: 45, temp: "Ambient", status: "Active" },
  { id: "wh2", name: "Delhi Cold Storage", type: "Cold Storage", capacity: "25,000 sqft", utilization: "92%", manager: "Anita Desai", employees: 12, temp: "-18°C", status: "Active" },
  { id: "wh3", name: "Bengaluru E-com Fulfillment", type: "Fulfillment Center", capacity: "50,000 sqft", utilization: "65%", manager: "Vikram Bose", employees: 80, temp: "Ambient", status: "Active" },
  { id: "wh4", name: "Pune Manufacturing Buffer", type: "Buffer", capacity: "30,000 sqft", utilization: "45%", manager: "Sneha Patel", employees: 15, temp: "Ambient", status: "Active" },
  { id: "wh5", name: "Hyderabad Retail Depot", type: "Depot", capacity: "15,000 sqft", utilization: "78%", manager: "David Smith", employees: 20, temp: "Ambient", status: "Active" },
];

export const inventoryLocations = [
  { id: "loc1", warehouseId: "wh1", zone: "Receiving", aisle: "A1", rack: "R10", shelf: "S2", bin: "B04", barcode: "WH1-A1-R10-S2-B04", status: "Occupied" },
  { id: "loc2", warehouseId: "wh1", zone: "Storage", aisle: "A5", rack: "R22", shelf: "S4", bin: "B12", barcode: "WH1-A5-R22-S4-B12", status: "Available" },
  { id: "loc3", warehouseId: "wh2", zone: "Freezer", aisle: "F1", rack: "R02", shelf: "S1", bin: "B01", barcode: "WH2-F1-R02-S1-B01", status: "Occupied" },
  { id: "loc4", warehouseId: "wh3", zone: "Picking", aisle: "P4", rack: "R15", shelf: "S3", bin: "B08", barcode: "WH3-P4-R15-S3-B08", status: "Maintenance" },
];

// PRODUCT MASTER
export const inventoryCategories = [
  { id: "cat1", name: "Electronics", sub: ["Mobiles", "Laptops", "Accessories", "Wearables"], count: 1240 },
  { id: "cat2", name: "Grocery", sub: ["Staples", "Snacks", "Beverages", "Dairy"], count: 3500 },
  { id: "cat3", name: "Apparel", sub: ["Men", "Women", "Kids", "Winter Wear"], count: 850 },
];

export const inventoryBrands = [
  { id: "b1", name: "Samsung", country: "South Korea", category: "Electronics", status: "Active" },
  { id: "b2", name: "Apple", country: "USA", category: "Electronics", status: "Active" },
  { id: "b3", name: "Tata Sampann", country: "India", category: "Grocery", status: "Active" },
  { id: "b4", name: "Nike", country: "USA", category: "Apparel", status: "Active" },
];

export const inventoryProducts = [
  { id: "p1", sku: "EL-SAM-S24U", barcode: "8806094911111", name: "Samsung Galaxy S24 Ultra", category: "Electronics", brand: "Samsung", unit: "Piece", price: "₹1,29,999", stock: 45, reserved: 12, warehouse: "Mumbai Central Hub", batchEnabled: false, serialEnabled: true, status: "Active" },
  { id: "p2", sku: "GR-TAT-RICE-5", barcode: "8904043922222", name: "Tata Sampann Basmati Rice 5kg", category: "Grocery", brand: "Tata Sampann", unit: "Packet", price: "₹650", stock: 1250, reserved: 300, warehouse: "Delhi Cold Storage", batchEnabled: true, serialEnabled: false, status: "Active" },
  { id: "p3", sku: "AP-NIK-AF1-WHT", barcode: "1931518333333", name: "Nike Air Force 1 '07", category: "Apparel", brand: "Nike", unit: "Pair", price: "₹8,495", stock: 120, reserved: 5, warehouse: "Bengaluru E-com Fulfillment", batchEnabled: false, serialEnabled: false, status: "Active" },
  { id: "p4", sku: "EL-APP-MBP16", barcode: "1942521444444", name: "Apple MacBook Pro 16 M3 Max", category: "Electronics", brand: "Apple", unit: "Piece", price: "₹3,49,900", stock: 8, reserved: 2, warehouse: "Mumbai Central Hub", batchEnabled: false, serialEnabled: true, status: "Low Stock" },
  { id: "p5", sku: "GR-NES-COF-200", barcode: "8901058855555", name: "Nescafe Classic Coffee 200g", category: "Grocery", brand: "Nestle", unit: "Jar", price: "₹330", stock: 4500, reserved: 1200, warehouse: "Hyderabad Retail Depot", batchEnabled: true, serialEnabled: false, status: "Active" },
];

// INVENTORY INTELLIGENCE & TRACKING
export const inventoryLowStock = [
  { id: "ls1", product: "Apple MacBook Pro 16 M3 Max", sku: "EL-APP-MBP16", current: 8, min: 15, reorderQty: 20, supplier: "Apple India Pvt Ltd", priority: "Critical" },
  { id: "ls2", product: "Sony WH-1000XM5 Headphones", sku: "EL-SON-WH5", current: 12, min: 25, reorderQty: 50, supplier: "Sony Electronics", priority: "High" },
  { id: "ls3", product: "Organic Honey 500g", sku: "GR-ORG-HON-5", current: 45, min: 100, reorderQty: 200, supplier: "Nature Farms", priority: "Medium" },
];

export const inventoryBatches = [
  { id: "b1", batchNo: "BCH-2024-8891", product: "Tata Sampann Basmati Rice 5kg", mfgDate: "2024-01-15", expDate: "2026-01-14", qty: 500, warehouse: "Delhi Cold Storage", status: "Active" },
  { id: "b2", batchNo: "BCH-2023-4412", product: "Nescafe Classic Coffee 200g", mfgDate: "2023-11-10", expDate: "2025-11-09", qty: 2000, warehouse: "Hyderabad Retail Depot", status: "Active" },
  { id: "b3", batchNo: "BCH-2022-1102", product: "Almond Butter 250g", mfgDate: "2022-05-20", expDate: "2024-05-19", qty: 45, warehouse: "Mumbai Central Hub", status: "Expired" },
];

export const inventoryMovements = [
  { id: "mv1", date: "2026-07-01 10:30 AM", type: "Outbound", product: "Samsung Galaxy S24 Ultra", qty: "-12", ref: "SO-2026-9912", user: "John Doe" },
  { id: "mv2", date: "2026-07-01 09:15 AM", type: "Inbound", product: "Tata Sampann Basmati Rice 5kg", qty: "+500", ref: "PO-2026-4411", user: "System" },
  { id: "mv3", date: "2026-06-30 04:45 PM", type: "Transfer", product: "Nike Air Force 1 '07", qty: "-20", ref: "TR-2026-0012", user: "Alice Smith" },
];

// FORECASTING & AI
export const inventoryForecast = [
  { product: "Air Conditioners", currentStock: 120, predictedDemand: 450, seasonality: "High (Summer)", suggestion: "Order 400 units immediately", confidence: 94 },
  { product: "Winter Jackets", currentStock: 800, predictedDemand: 50, seasonality: "Low (Summer)", suggestion: "Hold stock. Do not reorder.", confidence: 98 },
  { product: "Smartphones", currentStock: 45, predictedDemand: 120, seasonality: "Stable", suggestion: "Order 100 units to maintain buffer", confidence: 85 },
];
