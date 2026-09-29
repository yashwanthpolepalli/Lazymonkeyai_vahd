import { useCurrency } from "@/hooks/use-currency";

export const posStore = {
    name: "LazyMonkeyAI Store",
    code: "BOS-HQ-01",
    branch: "San Francisco Flagship",
    address: "Market Street, SF, CA 94103",
    phone: "+1 (555) 019-8273",
    gstin: "36AAAAA0000A1Z5",
    timezone: "America/Los_Angeles",
    currency: "USD",
    taxRegion: "CA-SF",
};

export const posCategories = [
    { id: "c1", name: "Electronics", icon: "Monitor", color: "bg-blue-100 text-blue-700" },
    { id: "c2", name: "Groceries", icon: "ShoppingCart", color: "bg-emerald-100 text-emerald-700" },
    { id: "c3", name: "Apparel & Fashion", icon: "ShoppingBag", color: "bg-violet-100 text-violet-700" },
    { id: "c4", name: "Health & Beauty", icon: "Heart", color: "bg-pink-100 text-pink-700" },
    { id: "c5", name: "Home & Kitchen", icon: "Home", color: "bg-orange-100 text-orange-700" },
    { id: "c6", name: "Services & Repair", icon: "Wrench", color: "bg-slate-100 text-slate-700" },
    { id: "c7", name: "Café & Bakery", icon: "Coffee", color: "bg-amber-100 text-amber-700" },
    { id: "c8", name: "Gift Cards", icon: "Gift", color: "bg-red-100 text-red-700" },
];

export const posSession = {
    cashier: "Sarah Jenkins",
    shift: "Morning (08:00 - 16:00)",
    registerId: "REG-04-FRONT",
    openedAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    openingFloat: 500.0,
    expectedCash: 0,
    productivity: { itemsScannedPerMin: 14, avgCheckoutTime: "1m 12s" },
};

export const paymentMethods = [
    { id: "cash", label: "Cash", icon: "Banknote" },
    { id: "card", label: "Credit/Debit Card", icon: "CreditCard" },
    { id: "upi", label: "UPI / QR", icon: "QrCode" },
    { id: "wallet", label: "Store Wallet", icon: "Wallet" },
    { id: "giftcard", label: "Gift Card", icon: "Gift" },
    { id: "split", label: "Split Payment", icon: "PieChart" },
    { id: "credit", label: "Store Credit", icon: "FileText" },
];

export const posCustomers = [
    { id: "walk-in", name: "Walk-in Customer", phone: "", email: "", points: 0, tier: "Guest", wallet: 0, totalSpent: 0, lastVisit: "Today" },
    { id: "CUST0001", name: "James Smith", phone: "+1 (555) 123-4567", email: "james.smith@example.com", points: 980, tier: "Gold", wallet: 120.0, totalSpent: "$3,250.00", lastVisit: "2 days ago" },
    { id: "CUST0002", name: "Maria Garcia", phone: "+1 (555) 234-5678", email: "maria.garcia@example.com", points: 540, tier: "Silver", wallet: 80.0, totalSpent: "$1,480.00", lastVisit: "5 days ago" },
    { id: "CUST0003", name: "David Johnson", phone: "+1 (555) 345-6789", email: "david.johnson@example.com", points: 276, tier: "Bronze", wallet: 35.0, totalSpent: "$760.00", lastVisit: "1 week ago" },
    { id: "CUST0004", name: "Priya Patel", phone: "+1 (555) 456-7890", email: "priya.patel@example.com", points: 1120, tier: "Platinum", wallet: 220.0, totalSpent: "$4,800.00", lastVisit: "Yesterday" },
];

export const posProducts = [
    { id: "P0001", name: "Apple AirPods Pro", sku: "AIR-001", barcode: "8901234567890", brand: "Apple", category: "Electronics", sellingPrice: 249.99, mrp: 279.99, price: 249.99, stock: 45, reorderLevel: 15, warehouse: "Main DC", rack: "R-3", shelf: "S-1", image: "https://images.unsplash.com/photo-1518441902117-4c9d9ffa1f4c?w=300&q=80", isFastMoving: true },
    { id: "P0002", name: "Samsung Galaxy Buds2", sku: "GAL-002", barcode: "8901234567891", brand: "Samsung", category: "Electronics", sellingPrice: 149.99, mrp: 169.99, price: 149.99, stock: 70, reorderLevel: 20, warehouse: "Main DC", rack: "R-4", shelf: "S-2", image: "https://images.unsplash.com/photo-1512499617640-c2f999feef4b?w=300&q=80", isFastMoving: true },
    { id: "P0003", name: "Nike Running Shoes", sku: "NIK-003", barcode: "8901234567892", brand: "Nike", category: "Apparel", sellingPrice: 99.99, mrp: 119.99, price: 99.99, stock: 30, reorderLevel: 10, warehouse: "Main DC", rack: "R-5", shelf: "S-3", image: "https://images.unsplash.com/photo-1528701800489-20f55e756df3?w=300&q=80", isFastMoving: false },
    { id: "P0004", name: "Instant Pot Duo", sku: "IP-004", barcode: "8901234567893", brand: "Instant Pot", category: "Home & Kitchen", sellingPrice: 89.99, mrp: 109.99, price: 89.99, stock: 22, reorderLevel: 8, warehouse: "Main DC", rack: "R-2", shelf: "S-4", image: "https://images.unsplash.com/photo-1516914743985-7a90fc52347c?w=300&q=80", isFastMoving: false },
    { id: "P0005", name: "L'Oreal Shampoo", sku: "LO-005", barcode: "8901234567894", brand: "L'Oreal", category: "Health & Beauty", sellingPrice: 14.99, mrp: 17.99, price: 14.99, stock: 120, reorderLevel: 25, warehouse: "Main DC", rack: "R-1", shelf: "S-5", image: "https://images.unsplash.com/photo-1584270354949-9c7b3f0aa399?w=300&q=80", isFastMoving: true },
    { id: "P0006", name: "Panasonic Electric Kettle", sku: "PN-006", barcode: "8901234567895", brand: "Panasonic", category: "Home & Kitchen", sellingPrice: 39.99, mrp: 49.99, price: 39.99, stock: 16, reorderLevel: 10, warehouse: "Main DC", rack: "R-6", shelf: "S-6", image: "https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=300&q=80", isFastMoving: false },
];

export const posTransactions = [
    { id: "TRX-20260715-00001", date: new Date().toISOString(), items: [{ name: "Apple AirPods Pro", barcode: "8901234567890", qty: 1, price: 249.99, total: 249.99 }], subtotal: 249.99, tax: 12.5, discount: 0, total: 262.49, customerId: "CUST0001", customerName: "James Smith", paymentMethod: "card", status: "Completed", cashier: "Sarah Jenkins", branch: "San Francisco Flagship", aiFraudScore: 18 },
    { id: "TRX-20260715-00002", date: new Date(Date.now() - 3600000).toISOString(), items: [{ name: "L'Oreal Shampoo", barcode: "8901234567894", qty: 3, price: 14.99, total: 44.97 }], subtotal: 44.97, tax: 2.25, discount: 0, total: 47.22, customerId: "CUST0003", customerName: "David Johnson", paymentMethod: "cash", status: "Completed", cashier: "Sarah Jenkins", branch: "San Francisco Flagship", aiFraudScore: 5 },
    { id: "TRX-20260714-00003", date: new Date(Date.now() - 86400000).toISOString(), items: [{ name: "Samsung Galaxy Buds2", barcode: "8901234567891", qty: 1, price: 149.99, total: 149.99 }], subtotal: 149.99, tax: 7.5, discount: 0, total: 157.49, customerId: "CUST0002", customerName: "Maria Garcia", paymentMethod: "upi", status: "Completed", cashier: "Sarah Jenkins", branch: "San Francisco Flagship", aiFraudScore: 11 },
    { id: "TRX-20260713-00004", date: new Date(Date.now() - 172800000).toISOString(), items: [{ name: "Nike Running Shoes", barcode: "8901234567892", qty: 1, price: 99.99, total: 99.99 }], subtotal: 99.99, tax: 5.0, discount: 0, total: 104.99, customerId: "CUST0004", customerName: "Priya Patel", paymentMethod: "card", status: "Refunded", cashier: "Sarah Jenkins", branch: "San Francisco Flagship", aiFraudScore: 28 },
];

export const posDashboardStats = (() => {
    const today = new Date().toDateString();
    const todayTxs = posTransactions.filter((t) => new Date(t.date).toDateString() === today && t.status === "Completed");
    const revenue = todayTxs.reduce((sum, t) => sum + t.total, 0);
    const avgBill = todayTxs.length ? revenue / todayTxs.length : 0;
    const refundCount = posTransactions.filter((t) => t.status === "Refunded").length;
    const refunds = posTransactions.filter((t) => t.status === "Refunded").reduce((sum, t) => sum + t.total, 0);
    return {
        todayRevenue: revenue,
        todayOrders: todayTxs.length,
        todayCustomers: new Set(todayTxs.map((t) => t.customerId)).size,
        avgBill,
        refunds,
        refundCount,
    };
})();
