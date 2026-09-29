export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: "Active" | "Pending" | "Suspended";
  rating: number;
  totalOrders: number;
  revenue: number;
  joinDate: string;
  location: string;
}

export interface MarketplaceProduct {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "Approved" | "Pending" | "Rejected";
  rating: number;
}

export interface MarketplaceOrder {
  id: string;
  customerId: string;
  customerName: string;
  vendorId: string;
  vendorName: string;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
  total: number;
  date: string;
  items: number;
}

export const mockVendors: Vendor[] = [
  { id: "VND-001", name: "TechNova Electronics", category: "Electronics", status: "Active", rating: 4.8, totalOrders: 12450, revenue: 1450000, joinDate: "2024-01-15", location: "Dubai, UAE" },
  { id: "VND-002", name: "Arabian Coffee Roasters", category: "Food & Beverage", status: "Active", rating: 4.9, totalOrders: 34200, revenue: 890000, joinDate: "2024-03-22", location: "Abu Dhabi, UAE" },
  { id: "VND-003", name: "Fresh Harvest Groceries", category: "Groceries", status: "Active", rating: 4.7, totalOrders: 45000, revenue: 2100000, joinDate: "2023-11-10", location: "Sharjah, UAE" },
  { id: "VND-004", name: "Emirates Fashion Studio", category: "Fashion", status: "Pending", rating: 0.0, totalOrders: 0, revenue: 0, joinDate: "2026-06-12", location: "Dubai Design District" },
  { id: "VND-005", name: "Gulf Packaging & Supplies", category: "Packaging", status: "Active", rating: 4.6, totalOrders: 5400, revenue: 320000, joinDate: "2024-05-18", location: "Ajman Free Zone" },
  { id: "VND-006", name: "Al-Noor Auto Spares", category: "Automotive", status: "Active", rating: 4.4, totalOrders: 3200, revenue: 410000, joinDate: "2024-09-30", location: "Ras Al Khaimah" },
  { id: "VND-007", name: "Beauty Oasis UAE", category: "Health & Beauty", status: "Pending", rating: 0.0, totalOrders: 0, revenue: 0, joinDate: "2026-07-01", location: "Dubai Silicon Oasis" },
];

export const mockVendorCategories = [
  { id: "VCAT-01", name: "Electronics & Gadgets", commissionRate: "8.5%", vendorCount: 18, activeListings: 450, status: "Active" },
  { id: "VCAT-02", name: "Food & Beverage", commissionRate: "10.0%", vendorCount: 32, activeListings: 1200, status: "Active" },
  { id: "VCAT-03", name: "Fresh Groceries & Produce", commissionRate: "7.0%", vendorCount: 14, activeListings: 850, status: "Active" },
  { id: "VCAT-04", name: "Fashion & Apparel", commissionRate: "12.0%", vendorCount: 26, activeListings: 640, status: "Active" },
  { id: "VCAT-05", name: "Packaging & Industrial", commissionRate: "9.0%", vendorCount: 12, activeListings: 310, status: "Active" },
  { id: "VCAT-06", name: "Automotive & Parts", commissionRate: "11.0%", vendorCount: 9, activeListings: 220, status: "Active" },
];

export const mockVendorContracts = [
  { id: "CTR-2026-001", vendor: "TechNova Electronics", type: "Exclusive Merchant Agreement", commission: "8.5%", startDate: "2024-01-15", expiryDate: "2027-01-14", status: "Active", sla: "99.0%" },
  { id: "CTR-2026-002", vendor: "Arabian Coffee Roasters", type: "Standard Marketplace Tier", commission: "10.0%", startDate: "2024-03-22", expiryDate: "2026-12-31", status: "Active", sla: "98.5%" },
  { id: "CTR-2026-003", vendor: "Fresh Harvest Groceries", type: "Hyperlocal Express Contract", commission: "7.0%", startDate: "2023-11-10", expiryDate: "2026-11-09", status: "Renewing", sla: "97.5%" },
  { id: "CTR-2026-004", vendor: "Gulf Packaging & Supplies", type: "B2B Volume Distribution", commission: "9.0%", startDate: "2024-05-18", expiryDate: "2027-05-17", status: "Active", sla: "98.0%" },
];

export const mockVendorPayouts = [
  { id: "PAY-1001", vendor: "TechNova Electronics", amount: 142500, method: "WPS Bank Transfer", date: "2026-08-25", bankRef: "DXB-WPS-8842", status: "Cleared" },
  { id: "PAY-1002", vendor: "Arabian Coffee Roasters", amount: 78200, method: "WPS Bank Transfer", date: "2026-08-25", bankRef: "DXB-WPS-8843", status: "Cleared" },
  { id: "PAY-1003", vendor: "Fresh Harvest Groceries", amount: 184000, method: "Direct Escrow", date: "2026-08-29", bankRef: "ESC-90123", status: "Processing" },
  { id: "PAY-1004", vendor: "Gulf Packaging & Supplies", amount: 32400, method: "WPS Bank Transfer", date: "2026-08-20", bankRef: "DXB-WPS-8819", status: "Cleared" },
];

export const mockVendorKYC = [
  { id: "KYC-001", vendor: "TechNova Electronics", tradeLicense: "DED-1049281", taxId: "TRN-10049281900003", documents: "Verified (4/4)", date: "2024-01-10", status: "Approved" },
  { id: "KYC-002", vendor: "Arabian Coffee Roasters", tradeLicense: "AD-8842019", taxId: "TRN-10088420190003", documents: "Verified (4/4)", date: "2024-03-15", status: "Approved" },
  { id: "KYC-003", vendor: "Emirates Fashion Studio", tradeLicense: "DED-7729104", taxId: "TRN-10077291040003", documents: "Under Review (3/4)", date: "2026-06-12", status: "Pending" },
  { id: "KYC-004", vendor: "Beauty Oasis UAE", tradeLicense: "DSO-449102", taxId: "TRN-10044910200003", documents: "Submitted (4/4)", date: "2026-07-01", status: "Pending" },
];

export const mockMarketplaceProducts: MarketplaceProduct[] = [
  { id: "MP-1001", vendorId: "VND-001", vendorName: "TechNova Electronics", name: "Quantum Pro Laptop M3", category: "Electronics", price: 4299.00, stock: 140, status: "Approved", rating: 4.9 },
  { id: "MP-1002", vendorId: "VND-001", vendorName: "TechNova Electronics", name: "UltraHD 4K Curved Monitor 34\"", category: "Electronics", price: 1849.50, stock: 65, status: "Approved", rating: 4.7 },
  { id: "MP-2001", vendorId: "VND-002", vendorName: "Arabian Coffee Roasters", name: "Signature Dark Roast Coffee Beans 1KG", category: "Food & Beverage", price: 125.00, stock: 850, status: "Approved", rating: 4.9 },
  { id: "MP-3001", vendorId: "VND-003", vendorName: "Fresh Harvest Groceries", name: "Organic Hass Avocado Box (12 Pack)", category: "Groceries", price: 48.00, stock: 420, status: "Approved", rating: 4.8 },
  { id: "MP-4001", vendorId: "VND-004", vendorName: "Emirates Fashion Studio", name: "Silk Linen Designer Kaftan", category: "Fashion", price: 380.00, stock: 25, status: "Pending", rating: 0.0 },
  { id: "MP-5001", vendorId: "VND-005", vendorName: "Gulf Packaging & Supplies", name: "Eco-Friendly Kraft Delivery Boxes (100pc)", category: "Packaging", price: 195.00, stock: 1200, status: "Approved", rating: 4.6 },
];

export const mockMarketplaceOrders: MarketplaceOrder[] = [
  { id: "ORD-98234", customerId: "CUST-004", customerName: "David Chen", vendorId: "VND-001", vendorName: "TechNova Electronics", status: "Delivered", total: 4299.00, date: "2026-08-28T14:30:00Z", items: 1 },
  { id: "ORD-98235", customerId: "EXT-001", customerName: "Al-Manara Retail LLC", vendorId: "VND-002", vendorName: "Arabian Coffee Roasters", status: "Shipped", total: 2500.00, date: "2026-08-29T09:15:00Z", items: 20 },
  { id: "ORD-98236", customerId: "CUST-002", customerName: "Sarah Al-Qasimi", vendorId: "VND-003", vendorName: "Fresh Harvest Groceries", status: "Processing", total: 240.00, date: "2026-08-29T08:45:00Z", items: 5 },
  { id: "ORD-98237", customerId: "EXT-002", customerName: "Emirates Suites Hotel", vendorId: "VND-005", vendorName: "Gulf Packaging & Supplies", status: "Pending", total: 1950.00, date: "2026-08-29T10:20:00Z", items: 10 },
  { id: "ORD-98238", customerId: "CUST-005", customerName: "Tariq Mansoor", vendorId: "VND-006", vendorName: "Al-Noor Auto Spares", status: "Delivered", total: 680.00, date: "2026-08-27T11:00:00Z", items: 2 },
];

export const mockDeliveryPartners = [
  { id: "DEL-01", name: "Careem Express", drivers: 45, rating: 4.9, sla: "98.4%", activeOrders: 14, status: "Active", zone: "Dubai All Sectors" },
  { id: "DEL-02", name: "Aramex UAE", drivers: 32, rating: 4.7, sla: "96.8%", activeOrders: 8, status: "Active", zone: "UAE Inter-Emirate" },
  { id: "DEL-03", name: "Talabat Logistics", drivers: 58, rating: 4.8, sla: "97.5%", activeOrders: 22, status: "Active", zone: "Hyperlocal 30-min" },
  { id: "DEL-04", name: "DHL Express Gulf", drivers: 18, rating: 4.9, sla: "99.1%", activeOrders: 5, status: "Active", zone: "GCC Cross-Border" },
];

export const mockCoupons = [
  { code: "SUMMER2026", discount: "15% OFF", minOrder: "₹150", maxUsage: 1000, usedCount: 642, expiry: "2026-09-30", status: "Active" },
  { code: "TECHNOVA50", discount: "₹50 FLAT", minOrder: "₹500", maxUsage: 500, usedCount: 412, expiry: "2026-09-15", status: "Active" },
  { code: "FREEDELIVERY", discount: "Free Shipping", minOrder: "₹99", maxUsage: 5000, usedCount: 3820, expiry: "2026-12-31", status: "Active" },
  { code: "FIRSTORDER", discount: "20% OFF", minOrder: "₹100", maxUsage: 2000, usedCount: 1890, expiry: "2026-12-31", status: "Active" },
];

export const mockMarketplaceStats = {
  totalVendors: 1450,
  activeVendors: 1280,
  pendingApprovals: 85,
  totalProducts: 458200,
  monthlyGMV: 12500000,
  monthlyOrders: 85400,
  averageCommission: 12.5,
  totalRevenue: 1562500,
};
