import { FileCheck, ShoppingCart, UserCog, Activity, AlertTriangle, ArrowRightLeft, Sparkles, History, Inbox, Radio, Network, PieChart, Skull, LineChart, Grid } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  address: string;
  gstNumber: string;
  type: "Retail" | "Wholesale" | "Corporate" | "VIP" | "Distributor" | "Dealer";
  membership: "Silver" | "Gold" | "Diamond" | "Platinum" | "Basic";
  walletBalance: number;
  loyaltyPoints: number;
  creditLimit: number;
  outstandingAmount: number;
  lastPurchase: string;
  totalPurchases: number;
  preferredBranch: string;
  preferredPayment: string;
  status: "Active" | "Inactive" | "Blocked";
  rating: number;
  segment: "High Value" | "New Customer" | "Inactive" | "Returning" | "Frequent Buyer" | "Premium";
}

export const mockCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Acme Corp",
    email: "contact@acmecorp.com",
    phone: "+1 555-0198",
    photo: "https://i.pravatar.cc/150?u=acmecorp",
    address: "123 Business Ave, Tech Park, NY",
    gstNumber: "GST-NY-12345",
    type: "Corporate",
    membership: "Platinum",
    walletBalance: 12500,
    loyaltyPoints: 45000,
    creditLimit: 100000,
    outstandingAmount: 25000,
    lastPurchase: "2026-06-30T10:00:00Z",
    totalPurchases: 154,
    preferredBranch: "HQ New York",
    preferredPayment: "Bank Transfer",
    status: "Active",
    rating: 4.8,
    segment: "Premium"
  },
  {
    id: "CUST-002",
    name: "Sarah Jenkins",
    email: "sarah.j@example.com",
    phone: "+1 555-8732",
    photo: "https://i.pravatar.cc/150?u=sarahj",
    address: "45 Valley Road, Los Angeles, CA",
    gstNumber: "N/A",
    type: "Retail",
    membership: "Gold",
    walletBalance: 150,
    loyaltyPoints: 1200,
    creditLimit: 0,
    outstandingAmount: 0,
    lastPurchase: "2026-07-01T09:15:00Z",
    totalPurchases: 28,
    preferredBranch: "LA Downtown",
    preferredPayment: "Credit Card",
    status: "Active",
    rating: 4.5,
    segment: "Frequent Buyer"
  },
  {
    id: "CUST-003",
    name: "Global Trade LLC",
    email: "procurement@globaltrade.com",
    phone: "+44 20 7123 4567",
    photo: "https://i.pravatar.cc/150?u=globaltrade",
    address: "88 King St, London, UK",
    gstNumber: "GB123456789",
    type: "Distributor",
    membership: "Diamond",
    walletBalance: 50000,
    loyaltyPoints: 125000,
    creditLimit: 500000,
    outstandingAmount: 120000,
    lastPurchase: "2026-06-25T14:30:00Z",
    totalPurchases: 89,
    preferredBranch: "London City",
    preferredPayment: "Wire Transfer",
    status: "Active",
    rating: 4.9,
    segment: "High Value"
  },
  {
    id: "CUST-004",
    name: "David Chen",
    email: "dchen99@gmail.com",
    phone: "+1 555-3491",
    photo: "https://i.pravatar.cc/150?u=dchen",
    address: "712 Pine Lane, Seattle, WA",
    gstNumber: "N/A",
    type: "VIP",
    membership: "Platinum",
    walletBalance: 850,
    loyaltyPoints: 8500,
    creditLimit: 5000,
    outstandingAmount: 0,
    lastPurchase: "2026-05-15T11:20:00Z",
    totalPurchases: 12,
    preferredBranch: "Seattle West",
    preferredPayment: "Apple Pay",
    status: "Inactive",
    rating: 4.2,
    segment: "Inactive"
  },
  {
    id: "CUST-005",
    name: "TechNova Solutions",
    email: "billing@technova.io",
    phone: "+1 555-7766",
    photo: "https://i.pravatar.cc/150?u=technova",
    address: "404 Error Blvd, San Francisco, CA",
    gstNumber: "GST-CA-99887",
    type: "Corporate",
    membership: "Silver",
    walletBalance: 0,
    loyaltyPoints: 450,
    creditLimit: 20000,
    outstandingAmount: 18500,
    lastPurchase: "2026-07-01T12:00:00Z",
    totalPurchases: 5,
    preferredBranch: "SF Bay Area",
    preferredPayment: "Net 30",
    status: "Active",
    rating: 3.8,
    segment: "New Customer"
  }
];

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
  source: string;
  owner: string;
  estimatedValue: number;
  lastContact: string;
}

export const mockLeads: Lead[] = [
  { id: "LD-1001", name: "Alice Smith", company: "Smith & Co", email: "alice@smithco.com", phone: "555-0101", status: "New", source: "Website", owner: "James T.", estimatedValue: 15000, lastContact: "2026-07-01" },
  { id: "LD-1002", name: "Bob Johnson", company: "Bj Builders", email: "bob@bjb.com", phone: "555-0102", status: "Qualified", source: "Referral", owner: "Sarah M.", estimatedValue: 45000, lastContact: "2026-06-29" },
  { id: "LD-1003", name: "Charlie Davis", company: "Davis Retail", email: "cdavis@retail.com", phone: "555-0103", status: "Proposal", source: "Trade Show", owner: "Mike R.", estimatedValue: 120000, lastContact: "2026-06-30" },
  { id: "LD-1004", name: "Diana Prince", company: "Prince Logistics", email: "diana@prince.com", phone: "555-0104", status: "Contacted", source: "LinkedIn", owner: "James T.", estimatedValue: 8000, lastContact: "2026-06-28" },
  { id: "LD-1005", name: "Ethan Hunt", company: "IMF Solutions", email: "ethan@imf.com", phone: "555-0105", status: "Won", source: "Direct Mail", owner: "Sarah M.", estimatedValue: 250000, lastContact: "2026-06-25" },
];

export interface Deal {
  id: string;
  title: string;
  customer: string;
  amount: number;
  stage: "Prospecting" | "Qualification" | "Needs Analysis" | "Value Proposition" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  closingDate: string;
  owner: string;
}

export const mockDeals: Deal[] = [
  { id: "DL-501", title: "Enterprise Software License", customer: "Acme Corp", amount: 150000, stage: "Negotiation", probability: 80, closingDate: "2026-07-15", owner: "Mike R." },
  { id: "DL-502", title: "Q3 Inventory Restock", customer: "Global Trade LLC", amount: 85000, stage: "Value Proposition", probability: 60, closingDate: "2026-07-20", owner: "Sarah M." },
  { id: "DL-503", title: "Cloud Migration Services", customer: "TechNova Solutions", amount: 45000, stage: "Qualification", probability: 30, closingDate: "2026-08-01", owner: "James T." },
  { id: "DL-504", title: "Annual Support Contract", customer: "Davis Retail", amount: 24000, stage: "Needs Analysis", probability: 50, closingDate: "2026-07-10", owner: "Mike R." },
  { id: "DL-505", title: "Hardware Upgrade", customer: "Smith & Co", amount: 12000, stage: "Prospecting", probability: 10, closingDate: "2026-08-15", owner: "Sarah M." },
];

export interface SupportTicket {
  id: string;
  subject: string;
  customer: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Waiting on Customer" | "Resolved" | "Closed";
  assignedTo: string;
  created: string;
  updated: string;
}

export const mockTickets: SupportTicket[] = [
  { id: "TK-901", subject: "Login Issue", customer: "David Chen", priority: "High", status: "Open", assignedTo: "Support Team Alpha", created: "2026-07-01T08:30:00Z", updated: "2026-07-01T08:30:00Z" },
  { id: "TK-902", subject: "Invoice Discrepancy", customer: "TechNova Solutions", priority: "Medium", status: "In Progress", assignedTo: "Billing Dept", created: "2026-06-30T14:15:00Z", updated: "2026-07-01T09:00:00Z" },
  { id: "TK-903", subject: "Feature Request: Export to PDF", customer: "Global Trade LLC", priority: "Low", status: "Waiting on Customer", assignedTo: "Product Team", created: "2026-06-28T11:00:00Z", updated: "2026-06-29T16:20:00Z" },
  { id: "TK-904", subject: "Damaged Delivery", customer: "Acme Corp", priority: "Urgent", status: "Resolved", assignedTo: "Logistics Support", created: "2026-06-25T09:45:00Z", updated: "2026-06-26T10:10:00Z" },
  { id: "TK-905", subject: "Change Address", customer: "Sarah Jenkins", priority: "Low", status: "Closed", assignedTo: "Customer Success", created: "2026-06-20T13:20:00Z", updated: "2026-06-20T14:00:00Z" },
];

export const mockMembershipPlans = [
  { id: "MP-01", name: "Basic", price: 0, users: 5000, benefits: ["Standard Support", "5% Discount"], color: "bg-slate-500" },
  { id: "MP-02", name: "Silver", price: 49, users: 2500, benefits: ["Priority Support", "10% Discount", "Free Shipping"], color: "bg-gray-400" },
  { id: "MP-03", name: "Gold", price: 99, users: 1200, benefits: ["24/7 Support", "15% Discount", "Free Shipping", "Early Access"], color: "bg-amber-400" },
  { id: "MP-04", name: "Platinum", price: 199, users: 450, benefits: ["Dedicated Account Manager", "20% Discount", "Free Expedited Shipping", "VIP Events"], color: "bg-indigo-500" },
  { id: "MP-05", name: "Diamond", price: 499, users: 120, benefits: ["Concierge Service", "25% Discount", "Custom SLA", "Board Advisory"], color: "bg-cyan-400" },
];

export const mockAiRecommendations = [
  { id: "AIR-1", type: "churn_risk", customer: "David Chen", title: "High Churn Risk", description: "Customer inactive for 45 days. Suggest sending a 15% win-back coupon.", confidence: 89, action: "Send Campaign" },
  { id: "AIR-2", type: "upsell", customer: "Acme Corp", title: "Upsell Opportunity", description: "Customer frequently buys electronics. Recommend upgrading to Diamond Membership for bulk discounts.", confidence: 94, action: "Propose Upgrade" },
  { id: "AIR-3", type: "next_purchase", customer: "Sarah Jenkins", title: "Predictive Purchase", description: "Based on purchase cycle, likely to buy Office Supplies next week.", confidence: 78, action: "Add to Email List" },
  { id: "AIR-4", type: "credit_limit", customer: "Global Trade LLC", title: "Credit Limit Review", description: "Consistent on-time payments. Recommend increasing credit limit by $50,000.", confidence: 99, action: "Review Limit" },
];

// Stats for dashboard views
export const mockCrmStats = {
  totalCustomers: 20452,
  activeCustomers: 18230,
  newCustomersThisMonth: 845,
  totalLeads: 5230,
  leadsConverted: 1450,
  totalDeals: 3120,
  wonDeals: 1850,
  totalOrders: 50430,
  totalPurchases: 80120,
  totalCampaigns: 542,
  openTickets: 1023,
  resolvedTickets: 8430,
  customerSatisfaction: 4.8,
  npsScore: 72,
  totalRevenue: 12500400,
  lifetimeValueAvg: 4500,
  churnRate: 2.4,
};

export const mockCustomerGroups = [
  { id: "CG-01", name: "Retail", icon: "Store", count: 12500, description: "Individual retail customers", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "CG-02", name: "Wholesale", icon: "Boxes", count: 850, description: "Bulk buyers and wholesalers", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "CG-03", name: "Corporate", icon: "Building2", count: 420, description: "B2B enterprise clients", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "CG-04", name: "VIP", icon: "Crown", count: 125, description: "High-value premium individuals", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "CG-05", name: "Distributor", icon: "Network", count: 45, description: "Regional distribution partners", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "CG-06", name: "Dealer", icon: "Briefcase", count: 320, description: "Authorized dealers and resellers", color: "text-purple-500", bg: "bg-purple-500/10" },
];

export const mockCustomerSegments = [
  { id: "SEG-01", name: "High Value", icon: "Sparkles", count: 850, revenue: "$4.5M", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "SEG-02", name: "New Customers", icon: "Zap", count: 1250, revenue: "$120K", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "SEG-03", name: "Inactive (90d+)", icon: "AlertTriangle", count: 4320, revenue: "$0", color: "text-red-500", bg: "bg-red-500/10" },
  { id: "SEG-04", name: "Returning", icon: "RotateCw", count: 3200, revenue: "$1.2M", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "SEG-05", name: "Frequent Buyers", icon: "TrendingUp", count: 2100, revenue: "$2.8M", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "SEG-06", name: "Premium", icon: "ShieldCheck", count: 450, revenue: "$3.1M", color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "SEG-07", name: "Online Customers", icon: "Target", count: 14500, revenue: "$8.5M", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "SEG-08", name: "POS Customers", icon: "ShoppingCart", count: 8400, revenue: "$3.2M", color: "text-orange-500", bg: "bg-orange-500/10" },
];

export const mockWalletTransactions = [
  { id: "TX-9981", customer: "Acme Corp", type: "Recharge", amount: 5000, date: "2026-07-01 10:30", status: "Completed", method: "Bank Transfer" },
  { id: "TX-9982", customer: "Sarah Jenkins", type: "Payment", amount: -120.50, date: "2026-07-01 09:15", status: "Completed", method: "Wallet" },
  { id: "TX-9983", customer: "Global Trade LLC", type: "Refund", amount: 450, date: "2026-06-30 14:20", status: "Completed", method: "Wallet" },
  { id: "TX-9984", customer: "David Chen", type: "Recharge", amount: 1000, date: "2026-06-29 11:45", status: "Pending", method: "Credit Card" },
  { id: "TX-9985", customer: "TechNova", type: "Redeem", amount: -50, date: "2026-06-28 16:00", status: "Completed", method: "Points Conversion" },
];

export const mockCustomerDocuments = [
  { id: "DOC-1021", name: "Acme_Corp_NDA_2026.pdf", type: "PDF", size: "2.4 MB", customer: "Acme Corp", date: "2026-07-01", author: "Mike R." },
  { id: "DOC-1022", name: "Trade_License_GT.jpg", type: "Image", size: "1.1 MB", customer: "Global Trade LLC", date: "2026-06-28", author: "Sarah M." },
  { id: "DOC-1023", name: "SLA_Agreement_v2.docx", type: "Word", size: "450 KB", customer: "TechNova Solutions", date: "2026-06-25", author: "James T." },
  { id: "DOC-1024", name: "Tax_Exempt_Cert.pdf", type: "PDF", size: "1.8 MB", customer: "Acme Corp", date: "2026-06-20", author: "Admin" },
  { id: "DOC-1025", name: "Customer_Onboarding.pdf", type: "PDF", size: "5.2 MB", customer: "Davis Retail", date: "2026-06-15", author: "Mike R." },
];

export const mockLoyaltyRewards = [
  { id: "RWD-01", title: "$50 Store Credit", points: 5000, type: "Credit", claims: 1240 },
  { id: "RWD-02", title: "Free Express Shipping (1yr)", points: 15000, type: "Perk", claims: 450 },
  { id: "RWD-03", title: "15% Off Any Purchase", points: 2500, type: "Discount", claims: 3420 },
  { id: "RWD-04", title: "VIP Event Access", points: 50000, type: "Experience", claims: 45 },
  { id: "RWD-05", title: "Free Product Demo", points: 1000, type: "Service", claims: 890 },
];
