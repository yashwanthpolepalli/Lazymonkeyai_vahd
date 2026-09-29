import { 
  Monitor, ShoppingCart, TrendingUp, Users, CreditCard, Store, 
  Settings, Bot, Tag, Smartphone, Coffee, ShoppingBag, Heart, 
  Home, Wrench, Gift, Package, RefreshCw
} from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

// --- STORE & SESSION ---
export const posStore = {
  name: "LazyMonkeyAI Store",
  code: "BOS-HQ-01",
  branch: "San Francisco Flagship",
  address: "Market Street, SF, CA 94103",
  phone: "+1 (555) 019-8273",
  gstin: "36AAAAA0000A1Z5",
  timezone: "America/Los_Angeles",
  currency: "USD",
  taxRegion: "CA-SF"
};

export const posSession = {
  cashier: "Sarah Jenkins",
  shift: "Morning (08:00 - 16:00)",
  registerId: "REG-04-FRONT",
  openedAt: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
  openingFloat: 500.00,
  expectedCash: 0, 
  productivity: { itemsScannedPerMin: 14, avgCheckoutTime: "1m 12s" }
};

// --- CATEGORIES ---
export const posCategories = [
  { id: "c1", name: "Electronics", icon: Monitor, color: "bg-blue-100 text-blue-700", aiScore: 94 },
  { id: "c2", name: "Groceries", icon: ShoppingCart, color: "bg-green-100 text-green-700", aiScore: 88 },
  { id: "c3", name: "Apparel & Fashion", icon: ShoppingBag, color: "bg-purple-100 text-purple-700", aiScore: 91 },
  { id: "c4", name: "Health & Beauty", icon: Heart, color: "bg-pink-100 text-pink-700", aiScore: 85 },
  { id: "c5", name: "Home & Kitchen", icon: Home, color: "bg-orange-100 text-orange-700", aiScore: 79 },
  { id: "c6", name: "Services & Repair", icon: Wrench, color: "bg-slate-100 text-slate-700", aiScore: 65 },
  { id: "c7", name: "Café & Bakery", icon: Coffee, color: "bg-amber-100 text-amber-700", aiScore: 97 },
  { id: "c8", name: "Gift Cards", icon: Gift, color: "bg-red-100 text-red-700", aiScore: 72 },
];

// --- PRODUCTS ---
const generateProducts = (count: number) => {
  const products = [];
  const brands = ["Apple", "Samsung", "Sony", "Nike", "Adidas", "Nestle", "Unilever", "L'Oreal", "LG", "Philips", "Bosch", "Generic"];
  const suppliers = ["TechData Dist", "Global Foods Inc", "Fashion Hub B2B", "BeautyWholesale", "Direct Import"];
  const categoryImages: Record<string, string[]> = {
    "c1": [ // Electronics
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&q=80",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&q=80",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80",
      "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=300&q=80",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80"
    ],
    "c2": [ // Groceries
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80",
      "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=300&q=80",
      "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=300&q=80",
      "https://images.unsplash.com/photo-1588964895597-cfccd6e2b0d9?w=300&q=80"
    ],
    "c3": [ // Apparel
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80",
      "https://images.unsplash.com/photo-1434389678232-04ce6fc8db93?w=300&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&q=80"
    ],
    "c4": [ // Health & Beauty
      "https://images.unsplash.com/photo-1596462502278-27bf85033e5a?w=300&q=80",
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&q=80",
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=300&q=80"
    ],
    "c5": [ // Home & Kitchen
      "https://images.unsplash.com/photo-1584145293297-c8a77d1d6a69?w=300&q=80",
      "https://images.unsplash.com/photo-1556910103-1c02745a805a?w=300&q=80",
      "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=300&q=80"
    ],
    "c6": [ // Services & Repair (Parts)
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=300&q=80",
      "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300&q=80"
    ],
    "c7": [ // Cafe & Bakery
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300&q=80",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&q=80"
    ],
    "c8": [ // Gift Cards
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&q=80",
      "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=300&q=80"
    ]
  };

  for (let i = 1; i <= count; i++) {
    const cat = posCategories[i % posCategories.length];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const purchasePrice = parseFloat((Math.random() * 100 + 5).toFixed(2));
    const marginPercent = Math.floor(Math.random() * 40) + 10;
    const mrp = parseFloat((purchasePrice * (1 + (marginPercent + 15) / 100)).toFixed(2));
    const sellingPrice = parseFloat((purchasePrice * (1 + marginPercent / 100)).toFixed(2));
    const hasDiscount = Math.random() > 0.7;
    const discount = hasDiscount ? parseFloat((mrp - sellingPrice).toFixed(2)) : 0;
    
    products.push({
      id: `P${i.toString().padStart(5, '0')}`,
      name: `${brand} Premium ${cat.name.split(' ')[0]} ${i}`,
      brand: brand,
      category: cat.id,
      supplier: suppliers[i % suppliers.length],
      shortDesc: `High quality ${cat.name.toLowerCase()} product for enterprise retail.`,
      longDesc: `This is a premium ${cat.name.toLowerCase()} item sourced directly from ${suppliers[i % suppliers.length]}. It features top-of-the-line specifications and a reliable warranty.`,
      barcode: `890${i.toString().padStart(9, '0')}`,
      sku: `${cat.name.substring(0,3).toUpperCase()}-${brand.substring(0,3).toUpperCase()}-${i}`,
      batch: `BTH-${new Date().getFullYear()}-${Math.floor(Math.random() * 12) + 1}`,
      expiry: Math.random() > 0.5 ? new Date(new Date().getTime() + Math.random() * 31536000000).toISOString().split('T')[0] : null,
      warranty: `${Math.floor(Math.random() * 3) + 1} Years`,
      purchasePrice,
      mrp,
      sellingPrice,
      tax: parseFloat((sellingPrice * 0.05).toFixed(2)),
      discount,
      margin: `${marginPercent}%`,
      warehouse: "Main DC",
      rack: `R-${Math.floor(Math.random() * 20) + 1}`,
      shelf: `S-${Math.floor(Math.random() * 5) + 1}`,
      stock: Math.floor(Math.random() * 200),
      reserved: Math.floor(Math.random() * 10),
      reorderLevel: 15,
      image: (categoryImages[cat.id] || categoryImages["c1"])[i % (categoryImages[cat.id] || categoryImages["c1"]).length],
      variants: Math.random() > 0.8 ? [{ color: "Black", size: "L" }, { color: "White", size: "M" }] : [],
      aiScore: Math.floor(Math.random() * 30) + 70, // 70-100
      demandScore: Math.floor(Math.random() * 100),
      isFastMoving: Math.random() > 0.7
    });
  }
  return products;
};

export const posProducts = generateProducts(300);

// --- CUSTOMERS ---
const generateCustomers = (count: number) => {
  const customers: any[] = [
    { id: "walk-in", name: "Walk-in Customer", phone: "", points: 0, tier: "None", wallet: 0, creditLimit: 0, aiChurnRisk: "Low" }
  ];
  
  const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  const tiers = ["Bronze", "Silver", "Gold", "Platinum"];

  for (let i = 1; i <= count; i++) {
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
    customers.push({
      id: `CUST${i.toString().padStart(5, '0')}`,
      name: `${fname} ${lname}`,
      phone: `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com`,
      points: Math.floor(Math.random() * 5000),
      tier: tiers[Math.floor(Math.random() * tiers.length)],
      wallet: parseFloat((Math.random() * 200).toFixed(2)),
      creditLimit: Math.random() > 0.8 ? 1000 : 0,
      outstanding: Math.random() > 0.9 ? parseFloat((Math.random() * 500).toFixed(2)) : 0,
      aiChurnRisk: Math.random() > 0.8 ? "High" : (Math.random() > 0.5 ? "Medium" : "Low"),
      lifetimeValue: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
      lastVisit: new Date(new Date().getTime() - Math.random() * 30 * 86400000).toISOString()
    });
  }
  return customers;
};

export const posCustomers = generateCustomers(500);

// --- PAYMENT METHODS ---
export const paymentMethods = [
  { id: "cash", label: "Cash", icon: "Banknote" },
  { id: "card", label: "Credit/Debit Card", icon: "CreditCard" },
  { id: "upi", label: "UPI / QR", icon: "QrCode" },
  { id: "wallet", label: "Store Wallet", icon: "Wallet" },
  { id: "giftcard", label: "Gift Card", icon: "Gift" },
  { id: "split", label: "Split Payment", icon: "PieChart" },
  { id: "credit", label: "Store Credit", icon: "FileText" }
];

// --- TRANSACTIONS ---
export const generateTransactions = (count: number) => {
  const transactions = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const isRecent = i < (count * 0.2); 
    const isToday = i < (count * 0.05);
    let timeOffset;
    if (isToday) timeOffset = Math.random() * 12 * 3600000;
    else if (isRecent) timeOffset = Math.random() * 7 * 86400000;
    else timeOffset = Math.random() * 365 * 86400000;

    const date = new Date(now.getTime() - timeOffset);
    
    const itemCount = Math.floor(Math.random() * 6) + 1;
    const items = [];
    let subtotal = 0;
    let totalDiscount = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const product = posProducts[Math.floor(Math.random() * posProducts.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const lineDiscount = Math.random() > 0.8 ? product.discount * qty : 0;
      
      items.push({
        productId: product.id,
        name: product.name,
        price: product.sellingPrice,
        qty: qty,
        discount: lineDiscount,
        total: (product.sellingPrice * qty) - lineDiscount,
        barcode: product.barcode
      });
      subtotal += product.sellingPrice * qty;
      totalDiscount += lineDiscount;
    }
    
    const tax = (subtotal - totalDiscount) * 0.05;
    const grandTotal = subtotal - totalDiscount + tax;
    const customer = Math.random() > 0.4 ? posCustomers[Math.floor(Math.random() * posCustomers.length)] : posCustomers[0];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    const isRefund = Math.random() > 0.95;

    transactions.push({
      id: `TRX-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${i.toString().padStart(5, '0')}`,
      date: date.toISOString(),
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(totalDiscount.toFixed(2)),
      total: parseFloat(grandTotal.toFixed(2)),
      customerId: customer.id,
      customerName: customer.name,
      paymentMethod: paymentMethod.id,
      status: isRefund ? "Refunded" : "Completed",
      cashier: posSession.cashier,
      branch: posStore.branch,
      aiFraudScore: Math.floor(Math.random() * 100)
    });
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const posTransactions = generateTransactions(5000);

// --- DASHBOARD STATS ---
export const posDashboardStats = (() => {
  const today = new Date().toDateString();
  const todayTxs = posTransactions.filter(t => new Date(t.date).toDateString() === today);
  const completedTxs = todayTxs.filter(t => t.status === "Completed");
  
  const stats = {
    todayRevenue: completedTxs.reduce((sum, t) => sum + t.total, 0),
    todayOrders: completedTxs.length,
    todayCustomers: new Set(completedTxs.map(t => t.customerId)).size,
    avgBill: 0, 
    refunds: todayTxs.filter(t => t.status === "Refunded").reduce((sum, t) => sum + t.total, 0),
    refundCount: todayTxs.filter(t => t.status === "Refunded").length,
    taxCollected: completedTxs.reduce((sum, t) => sum + t.tax, 0),
    aiForecastEndofDay: completedTxs.reduce((sum, t) => sum + t.total, 0) * 1.4
  };
  stats.avgBill = stats.todayOrders > 0 ? stats.todayRevenue / stats.todayOrders : 0;
  return stats;
})();
