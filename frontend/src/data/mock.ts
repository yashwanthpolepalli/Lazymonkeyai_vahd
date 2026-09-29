import { useCurrency } from "@/hooks/use-currency";

export const companies = [
  { id: "c1", name: "Nimbus Retail Group", industry: "Retail", logo: "NR" },
  { id: "c2", name: "Atlas Manufacturing", industry: "Manufacturing", logo: "AM" },
  { id: "c3", name: "Helios Logistics", industry: "Logistics", logo: "HL" },
  { id: "c4", name: "Verdant Foods", industry: "F&B", logo: "VF" },
  { id: "c5", name: "Quantum Tech Labs", industry: "Technology", logo: "QT" },
];

export const branches = [
  "HQ — San Francisco", "New York Flagship", "Chicago Hub", "Austin Branch",
  "Seattle West", "Miami South", "London EMEA", "Berlin DACH",
  "Singapore APAC", "Tokyo Asia", "Sydney AU", "Toronto CA",
  "Dubai MEA", "Mumbai IN", "São Paulo LATAM",
];

const spark = (base: number, vol: number, len = 12) =>
  Array.from({ length: len }, (_, i) => ({
    i,
    v: Math.round(base + Math.sin(i / 1.6) * vol + (Math.random() - 0.3) * vol * 0.6),
  }));

export const kpis = [
  { label: "Today's Revenue", value: 184210, change: 14.2, hint: "vs yesterday", spark: spark(160, 30), tone: "blue" as const, isCurrency: true },
  { label: "Today's Sales", value: "1,284", change: 8.2, hint: "orders", spark: spark(120, 25), tone: "purple" as const },
  { label: "Orders Pending", value: "342", change: -3.4, hint: "to fulfill", spark: spark(80, 15), tone: "amber" as const },
  { label: "Active Customers", value: "12,847", change: 5.6, hint: "trailing 30d", spark: spark(140, 20), tone: "cyan" as const },
  { label: "Employees Present", value: "338 / 348", change: 0.8, hint: "97.1% attendance", spark: spark(95, 4), tone: "green" as const },
  { label: "Inventory Value", value: 2130000, change: -2.1, hint: "8 SKUs low", spark: spark(110, 18), tone: "purple" as const, isCurrency: true },
  { label: "Pending Deliveries", value: "187", change: 12.0, hint: "in transit", spark: spark(70, 20), tone: "blue" as const },
  { label: "Pending Payments", value: 284000, change: -6.4, hint: "AR overdue", spark: spark(90, 22), tone: "amber" as const, isCurrency: true },
  { label: "Marketplace Orders", value: "412", change: 21.8, hint: "today", spark: spark(60, 30), tone: "cyan" as const },
  { label: "Net Profit (MTD)", value: 1210000, change: 18.4, hint: "above plan", spark: spark(180, 30), tone: "green" as const, isCurrency: true },
  { label: "Expenses (MTD)", value: 842000, change: 4.1, hint: "vs budget", spark: spark(120, 18), tone: "purple" as const, isCurrency: true },
  { label: "Cash Balance", value: 8940000, change: 3.2, hint: "operating", spark: spark(200, 24), tone: "blue" as const, isCurrency: true },
];

export const healthBreakdown = [
  { label: "Revenue Trend", score: 94, hint: "+14% MoM" },
  { label: "Operational Efficiency", score: 88, hint: "Throughput up" },
  { label: "Customer Satisfaction", score: 91, hint: "NPS 62" },
  { label: "Inventory Health", score: 78, hint: "2 branches low" },
  { label: "Employee Productivity", score: 86, hint: "Above target" },
  { label: "Cash Flow", score: 95, hint: "Healthy runway" },
  { label: "Marketplace", score: 89, hint: "+22% sellers" },
  { label: "Risk & Compliance", score: 93, hint: "0 open issues" },
];

export const revenueData = [
  { month: "Jan", revenue: 412000, expenses: 285000, profit: 127000 },
  { month: "Feb", revenue: 458000, expenses: 301000, profit: 157000 },
  { month: "Mar", revenue: 521000, expenses: 318000, profit: 203000 },
  { month: "Apr", revenue: 489000, expenses: 312000, profit: 177000 },
  { month: "May", revenue: 612000, expenses: 354000, profit: 258000 },
  { month: "Jun", revenue: 684000, expenses: 372000, profit: 312000 },
];

export const channelData = [
  { name: "Online Store", value: 38, color: "var(--brand-blue)" },
  { name: "Retail POS", value: 27, color: "var(--brand-purple)" },
  { name: "Marketplace", value: 21, color: "var(--brand-cyan)" },
  { name: "Wholesale", value: 14, color: "var(--brand-green)" },
];

export const ordersTrend = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  orders: Math.round(120 + Math.sin(i / 2) * 30 + Math.random() * 40),
}));

export const recentActivity = [
  { id: 1, who: "Marcus Wei", action: "approved purchase order", target: "PO-2841", time: "2m ago", type: "approval" },
  { id: 2, who: "Priya Natarajan", action: "closed deal with", target: "Helios Corp ($42K)", time: "18m ago", type: "win" },
  { id: 3, who: "System", action: "low stock alert on", target: "SKU-7821 Steel Rivets", time: "34m ago", type: "alert" },
  { id: 4, who: "Daniel Okafor", action: "submitted expense report", target: "$1,284.20", time: "1h ago", type: "info" },
  { id: 5, who: "Linh Tran", action: "onboarded new hire", target: "Sara Park, Design", time: "2h ago", type: "info" },
  { id: 6, who: "IoT Gateway", action: "temperature spike at", target: "Warehouse 4 — Bay C", time: "3h ago", type: "alert" },
  { id: 7, who: "Payroll Bot", action: "processed June batch for", target: "348 employees", time: "5h ago", type: "approval" },
  { id: 8, who: "Marketplace", action: "received new order", target: "#58291 — Tokyo, $1,240", time: "6h ago", type: "win" },
];

export const notifications = [
  { id: 1, title: "Low stock — 8 SKUs", body: "3 will stock out within 5 days at current velocity.", time: "5m", tone: "warn", unread: true },
  { id: 2, title: "Record sales day", body: "Today is the highest-grossing Tuesday this quarter.", time: "1h", tone: "success", unread: true },
  { id: 3, title: "All systems healthy", body: "Uptime 99.99% · 0 incidents in last 7 days.", time: "2h", tone: "info", unread: false },
  { id: 4, title: "Employee birthday", body: "Daniel Okafor — Finance. Send a note 🎉", time: "3h", tone: "info", unread: false },
  { id: 5, title: "New marketplace vendor", body: "Aurora Audio submitted onboarding documents.", time: "4h", tone: "info", unread: false },
  { id: 6, title: "Payment received", body: "Helios Corp paid INV-7821 ($42,000).", time: "5h", tone: "success", unread: false },
  { id: 7, title: "Vendor payment due", body: "Verdant Supply — $18,420 due today.", time: "6h", tone: "warn", unread: true },
];

export const aiInsights = [
  { id: 1, severity: "critical" as const, title: "Inventory: Basmati Rice runs out in 3 days", impact: "Avoid $42K in lost sales", confidence: 96, action: "Generate PO" },
  { id: 2, severity: "info" as const, title: "Payroll processing starts tomorrow at 9:00 AM", impact: "348 employees · $2.41M gross", confidence: 100, action: "Review run" },
  { id: 3, severity: "positive" as const, title: "Mumbai IN branch sales up 18% this week", impact: "+$84K vs forecast", confidence: 92, action: "View branch" },
  { id: 4, severity: "warn" as const, title: "Customer churn risk: 14 enterprise accounts", impact: "Protect $210K ARR", confidence: 81, action: "Launch retention" },
  { id: 5, severity: "warn" as const, title: "3 employees pending attendance approval", impact: "HR compliance flag", confidence: 100, action: "Approve" },
  { id: 6, severity: "critical" as const, title: "Vendor payment due today: Verdant Supply", impact: "$18,420 — avoid late fee", confidence: 100, action: "Pay now" },
  { id: 7, severity: "info" as const, title: "Renegotiate freight with Helios Logistics", impact: "−$12K monthly cost", confidence: 87, action: "Draft proposal" },
];

export const aiRecommendations = aiInsights.slice(0, 3).map((r) => ({
  id: r.id, title: r.title, impact: r.impact, confidence: r.confidence,
}));

export const inventoryAlerts = [
  { sku: "SKU-7821", name: "Steel Rivets — M6", daysLeft: 2, level: 12, status: "critical" as const },
  { sku: "SKU-4490", name: "Aurora Wireless Headphones", daysLeft: 3, level: 18, status: "critical" as const },
  { sku: "SKU-9120", name: "Verdant Cold Brew 12pk", daysLeft: 4, level: 24, status: "warn" as const },
  { sku: "SKU-3340", name: "Carbon Fiber Panels 2m", daysLeft: 6, level: 38, status: "warn" as const },
  { sku: "SKU-1187", name: "Nimbus Linen Shirt — L", daysLeft: 8, level: 46, status: "info" as const },
];

export const operationsWidgets = [
  { label: "Purchase Requests", count: 24, progress: 62, status: "12 awaiting approval", tone: "blue" as const },
  { label: "Pending Approvals", count: 18, progress: 40, status: "Across 4 departments", tone: "amber" as const },
  { label: "Warehouse Capacity", count: 78, progress: 78, status: "78% — Warehouse 4 full", tone: "purple" as const },
  { label: "Low Stock Items", count: 8, progress: 25, status: "3 critical", tone: "amber" as const },
  { label: "Expiring Products", count: 14, progress: 35, status: "Within 30 days", tone: "amber" as const },
  { label: "Delivery Status", count: 187, progress: 84, status: "84% on-time", tone: "green" as const },
  { label: "Open Returns", count: 9, progress: 18, status: "2 require RMA review", tone: "blue" as const },
  { label: "Production Orders", count: 42, progress: 71, status: "71% on schedule", tone: "green" as const },
];

export const branchPerformance = [
  { branch: "San Francisco", revenue: 842, profit: 312, employees: 84, growth: 12.4 },
  { branch: "New York", revenue: 921, profit: 348, employees: 96, growth: 9.1 },
  { branch: "London", revenue: 612, profit: 218, employees: 58, growth: 14.8 },
  { branch: "Singapore", revenue: 528, profit: 197, employees: 42, growth: 18.2 },
  { branch: "Tokyo", revenue: 487, profit: 172, employees: 38, growth: 6.4 },
  { branch: "Mumbai", revenue: 394, profit: 148, employees: 30, growth: 18.6 },
];

export const hrSummary = {
  total: 348, present: 338, onLeave: 7, remote: 124,
  leaveRequests: 12, payrollStatus: "Ready · approval pending",
  departments: [
    { name: "Engineering", value: 96, color: "var(--brand-blue)" },
    { name: "Operations", value: 84, color: "var(--brand-purple)" },
    { name: "Sales", value: 62, color: "var(--brand-cyan)" },
    { name: "Finance", value: 38, color: "var(--brand-green)" },
    { name: "HR & Admin", value: 28, color: "oklch(0.7 0.17 50)" },
    { name: "Design", value: 24, color: "oklch(0.68 0.2 330)" },
    { name: "Support", value: 16, color: "oklch(0.7 0.13 25)" },
  ],
  topPerformers: [
    { name: "Priya Natarajan", dept: "Sales", score: 98 },
    { name: "Marcus Wei", dept: "Operations", score: 96 },
    { name: "Linh Tran", dept: "People", score: 94 },
    { name: "Daniel Okafor", dept: "Finance", score: 92 },
  ],
};

export const marketplaceSummary = {
  orders: 1842, revenue: 612400, vendors: 184, returns: 24, cancelled: 18, rating: 4.7,
  topSellers: [
    { vendor: "Aurora Audio", revenue: 84200, orders: 412, rating: 4.9 },
    { vendor: "Verdant Foods", revenue: 72800, orders: 528, rating: 4.8 },
    { vendor: "Helios Industrial", revenue: 61400, orders: 184, rating: 4.6 },
    { vendor: "Nimbus Apparel", revenue: 48900, orders: 612, rating: 4.7 },
    { vendor: "Quantum Devices", revenue: 42100, orders: 96, rating: 4.8 },
  ],
  weekly: Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    orders: Math.round(180 + Math.sin(i) * 40 + Math.random() * 60),
    revenue: Math.round(48 + Math.sin(i) * 12 + Math.random() * 18),
  })),
};

export const financialOverview = {
  income: 4820000, expenses: 2840000, profit: 1980000,
  gst: 184200, tds: 84100, receivables: 612400, payables: 284100, cash: 8940000,
  cashFlow: Array.from({ length: 12 }, (_, i) => ({
    m: ["Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"][i],
    inflow: Math.round(420 + Math.sin(i / 2) * 80 + Math.random() * 60),
    outflow: Math.round(280 + Math.cos(i / 2) * 50 + Math.random() * 40),
  })),
};

export const aiForecast = [
  { label: "Next Month Revenue", value: "$5.2M", change: 7.8, confidence: 91 },
  { label: "Inventory Demand", value: "+18%", change: 18, confidence: 87 },
  { label: "Hiring Need", value: "12 roles", change: 12, confidence: 84 },
  { label: "Expected Orders", value: "14,800", change: 9.2, confidence: 89 },
  { label: "Cash Flow", value: "$9.6M", change: 7.4, confidence: 93 },
  { label: "Top SKU Demand", value: "Aurora HP", change: 24, confidence: 95 },
];

export const calendarEvents = [
  { date: "Today", title: "Leadership Sync", time: "10:00 AM", tone: "blue" as const },
  { date: "Today", title: "Vendor Payment — Verdant", time: "by EOD", tone: "amber" as const },
  { date: "Tomorrow", title: "Payroll Run — June batch", time: "9:00 AM", tone: "purple" as const },
  { date: "Thu", title: "Q3 Board Review", time: "2:00 PM", tone: "blue" as const },
  { date: "Fri", title: "Inventory Audit — Warehouse 4", time: "All day", tone: "amber" as const },
  { date: "Mon", title: "New hire orientation (4)", time: "11:00 AM", tone: "green" as const },
];

export const quickActions = [
  { label: "Generate Invoice", icon: "FileText" },
  { label: "Create Purchase Order", icon: "ShoppingBag" },
  { label: "Add Product", icon: "Package" },
  { label: "Register Employee", icon: "UserPlus" },
  { label: "Approve Leave", icon: "CalendarCheck" },
  { label: "View Inventory", icon: "Boxes" },
  { label: "Open Marketplace", icon: "Store" },
  { label: "Run Payroll", icon: "Banknote" },
];

export const suggestedPrompts = [
  { icon: "📊", title: "Today's sales summary", prompt: "Show me today's sales summary across all channels." },
  { icon: "📦", title: "Low stock products", prompt: "Which products are running low on stock?" },
  { icon: "💰", title: "Revenue prediction", prompt: "Predict revenue for the next quarter." },
  { icon: "👥", title: "Attendance summary", prompt: "Give me this week's attendance summary." },
  { icon: "💼", title: "Payroll summary", prompt: "Summarize the upcoming payroll run." },
  { icon: "🛒", title: "Purchase suggestions", prompt: "Suggest purchases I should make this week." },
];

export const aiResponses: Record<string, string> = {
  "today's sales":
    "**Today's Sales Snapshot**\n\nGross revenue is **$184,210** across 412 orders — up **+14.2%** vs the same weekday last week.\n\n- **Online Store:** $71,840 (39%)\n- **Retail POS:** $52,180 (28%)\n- **Marketplace:** $38,940 (21%)\n- **Wholesale:** $21,250 (12%)\n\nTop SKU: *Aurora Wireless Headphones* — 184 units. AOV is **$447**, basket size **2.4**.\n\nWant me to draft a Slack update for the leadership channel?",
  "low stock":
    "**8 SKUs are below safety stock right now.** 3 will stock out within 5 days at current velocity.\n\n| SKU | Product | Days left |\n|---|---|---|\n| 7821 | Steel Rivets — M6 | 2 |\n| 4490 | Aurora Headphones | 3 |\n| 9120 | Verdant Cold Brew 12pk | 4 |\n\nI can auto-generate POs with your preferred suppliers — confidence **94%**.",
  "revenue":
    "**Q3 forecast: $14.8M** (range $13.9M–$15.6M, 90% CI).\n\nDrivers: marketplace expansion (+18%), enterprise renewals (+9%), partially offset by Q3 retail seasonality (−4%). On track to beat plan by **6.2%**.",
  "attendance":
    "**This week:** 96.4% attendance across 348 employees.\n\n- On-time arrivals: 91%\n- WFH days logged: 412\n- Pending leave approvals: **7** (3 sick, 4 vacation)\n\nEngineering is at 99.1%; Field Operations is dragging at 89.4% — likely the Austin site reshuffle.",
  "payroll":
    "**June payroll run is staged and ready.** Gross: **$2.41M**. Net: **$1.78M**. Headcount: 348 (+4 new hires, −2 offboards).\n\nFlags: 2 expense reimbursements pending review, 1 commission calc adjustment in Sales. Approve and I'll release Friday 9:00 AM PT.",
  "purchase":
    "**Top purchase actions this week:**\n\n1. Reorder 12 SKUs from Helios Industrial — $84K, prevents stockout\n2. Lock Q3 packaging contract with Verdant Supply — saves $11K vs spot\n3. Bulk-buy LED panels for Store #7 retrofit — 18% volume discount window closes Friday\n\nShall I draft POs for #1?",
};
