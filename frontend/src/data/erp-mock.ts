import { useCurrency } from "@/hooks/use-currency";

export const erpCompanies = [
  { id: "c1", name: "Nimbus Retail Group", legalName: "Nimbus Retail Pvt Ltd", type: "Private Limited", gst: "27AADCN1234A1Z5", pan: "AADCN1234A", regNo: "CIN1234567890", industry: "Retail", country: "India", state: "Maharashtra", city: "Mumbai", address: "123 Nimbus Tower, BKC", phone: "+91 98765 43210", email: "contact@nimbus.com", website: "www.nimbus.com", currency: "INR", timezone: "IST", language: "English", financialYear: "April - March", taxConfig: "GST Standard", status: "Active", plan: "Enterprise", date: "2020-01-15", logo: "NR" },
  { id: "c2", name: "Atlas Manufacturing", legalName: "Atlas Global Mfg Ltd", type: "Public Limited", gst: "29BBCCA9876Z1Z2", pan: "BBCCA9876Z", regNo: "CIN0987654321", industry: "Manufacturing", country: "India", state: "Karnataka", city: "Bengaluru", address: "45 Industrial Hub, Peenya", phone: "+91 99887 76655", email: "info@atlas.com", website: "www.atlas.com", currency: "INR", timezone: "IST", language: "English", financialYear: "April - March", taxConfig: "GST SEZ", status: "Active", plan: "Professional", date: "2018-06-20", logo: "AM" },
  { id: "c3", name: "Helios Logistics", legalName: "Helios Supply Chain LLC", type: "LLP", gst: "07CCDDH4567H1Z3", pan: "CCDDH4567H", regNo: "LLP112233", industry: "Logistics", country: "India", state: "Delhi", city: "New Delhi", address: "78 Transport Nagar", phone: "+91 91234 56789", email: "hello@helios.com", website: "www.helios.com", currency: "INR", timezone: "IST", language: "English", financialYear: "April - March", taxConfig: "GST Standard", status: "Active", plan: "Enterprise", date: "2019-11-10", logo: "HL" },
  { id: "c4", name: "Verdant Foods", legalName: "Verdant F&B Pvt Ltd", type: "Private Limited", gst: "32DDEEV3456V1Z4", pan: "DDEEV3456V", regNo: "CIN55443322", industry: "F&B", country: "India", state: "Kerala", city: "Kochi", address: "Spice Park, Phase 1", phone: "+91 94567 89012", email: "sales@verdant.com", website: "www.verdant.com", currency: "INR", timezone: "IST", language: "English", financialYear: "April - March", taxConfig: "GST Standard", status: "Inactive", plan: "Starter", date: "2021-03-05", logo: "VF" },
  { id: "c5", name: "Quantum Tech Labs", legalName: "Quantum Innovations Inc", type: "Foreign Company", gst: "36EEFFQ2345Q1Z5", pan: "EEFFQ2345Q", regNo: "FC998877", industry: "Technology", country: "India", state: "Telangana", city: "Hyderabad", address: "Cyber City, Hitec", phone: "+91 90123 45678", email: "admin@quantum.com", website: "www.quantum.com", currency: "INR", timezone: "IST", language: "English", financialYear: "April - March", taxConfig: "GST SEZ", status: "Active", plan: "Enterprise", date: "2022-08-12", logo: "QT" },
];

export const erpBranches = Array.from({ length: 25 }, (_, i) => ({
  id: `br${i + 1}`,
  code: `BR-${100 + i}`,
  name: `Branch ${i + 1} - ${['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune'][i % 7]}`,
  manager: `Manager ${i + 1}`,
  address: `${10 + i} Main Street, Zone ${i % 3}`,
  employees: 20 + (i * 5),
  warehouse: i % 2 === 0 ? "Yes" : "No",
  revenue: `$${(100 + i * 15)}K`,
  status: i % 10 === 0 ? "Inactive" : "Active",
  workingHours: "09:00 AM - 06:00 PM",
  openingDate: `2020-${(i % 12) + 1}-01`,
  companyId: `c${(i % 5) + 1}`,
}));

export const erpDepartments = Array.from({ length: 50 }, (_, i) => ({
  id: `d${i + 1}`,
  name: ['Sales', 'Finance', 'HR', 'Warehouse', 'Marketing', 'Operations', 'Support', 'IT', 'Legal', 'R&D'][i % 10] + (i >= 10 ? ` - Div ${Math.floor(i/10)}` : ''),
  code: `DEP-${200 + i}`,
  head: `Head ${i + 1}`,
  employeeCount: 10 + i,
  status: "Active",
}));

export const erpDesignations = [
  "CEO", "Manager", "Supervisor", "Cashier", "Sales Executive", "Warehouse Executive", "Accountant", "HR Executive", "Store Keeper", "Trainer", "Software Engineer", "Product Manager", "QA Analyst", "Data Scientist"
].map((name, i) => ({ id: `ds${i}`, name, level: i < 3 ? "L1" : "L2", status: "Active" }));

export const erpBusinessUnits = Array.from({ length: 15 }, (_, i) => ({
  id: `bu${i + 1}`,
  name: ['Retail', 'Wholesale', 'Marketplace', 'Manufacturing', 'Corporate', 'Online Sales', 'Services'][i % 7] + ` Unit ${i + 1}`,
  companyId: `c${(i % 5) + 1}`,
  head: `BU Head ${i + 1}`,
  status: "Active",
}));

export const erpCostCenters = Array.from({ length: 15 }, (_, i) => ({
  id: `cc${i + 1}`,
  name: `CC-${300 + i}`,
  department: erpDepartments[i % erpDepartments.length].name,
  budget: 50000 + (i * 10000),
  expense: 20000 + (i * 8000),
  status: "Active"
}));

export const erpFiscalYears = Array.from({ length: 10 }, (_, i) => {
  const year = 2020 + i;
  return {
    id: `fy${i}`,
    name: `${year}-${year + 1}`,
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    status: year < 2025 ? "Locked" : year === 2025 ? "Open" : "Closed"
  };
});

export const erpUsers = Array.from({ length: 350 }, (_, i) => ({
  id: `u${i + 1}`,
  name: `User ${i + 1} Smith`,
  empId: `EMP-${1000 + i}`,
  email: `user${i+1}@example.com`,
  phone: `+1 555 ${1000 + i}`,
  department: erpDepartments[i % erpDepartments.length].name,
  designation: erpDesignations[i % erpDesignations.length].name,
  role: ['Super Admin', 'Company Admin', 'Branch Manager', 'Sales', 'Finance', 'HR', 'Inventory'][i % 7],
  branch: erpBranches[i % erpBranches.length].name,
  company: erpCompanies[i % erpCompanies.length].name,
  status: i % 20 === 0 ? "Suspended" : "Active",
  lastLogin: "2026-06-30",
  mfa: i % 2 === 0
}));

export const erpRoles = Array.from({ length: 120 }, (_, i) => ({
  id: `r${i}`,
  name: ['Super Admin', 'Company Admin', 'Branch Manager', 'Finance', 'HR', 'Inventory', 'Sales', 'Cashier', 'Vendor', 'Customer Support'][i % 10] + (i >= 10 ? ` Level ${Math.floor(i/10)}` : ''),
  users: 1 + (i % 20),
  status: "Active"
}));

export const erpWorkspaces = [
  { id: "w1", name: "Global HQ", company: "Nimbus Retail Group", branch: "HQ", users: 150, theme: "Light", lang: "EN", tz: "IST", status: "Active" },
  { id: "w2", name: "Atlas Operations", company: "Atlas Manufacturing", branch: "Bengaluru", users: 80, theme: "Dark", lang: "EN", tz: "IST", status: "Active" },
];

export const erpAuditLogs = Array.from({ length: 50 }, (_, i) => ({
  id: `al${i}`,
  date: `2026-06-${(i % 30) + 1}`,
  time: `14:${(i % 60).toString().padStart(2, '0')}`,
  user: erpUsers[i % 10].name,
  module: ['Company', 'User', 'Settings', 'Branch'][i % 4],
  action: ['Created', 'Updated', 'Deleted', 'Exported'][i % 4],
  oldValue: i % 2 === 0 ? "Inactive" : "-",
  newValue: "Active",
  ip: `192.168.1.${i}`,
  device: "MacBook Pro",
  browser: "Chrome",
  location: "Mumbai, IN",
  status: "Success"
}));

export const erpActivityLogs = Array.from({ length: 50 }, (_, i) => ({
  id: `act${i}`,
  time: `${i} mins ago`,
  action: ['Invoice Created', 'Employee Joined', 'Stock Updated', 'Purchase Approved', 'Payroll Processed', 'Marketplace Order Received'][i % 6],
  user: erpUsers[i % 5].name,
  avatar: "US"
}));

// --- NEW ENTERPRISE FOUNDATION MOCK DATA ---

// 1. Regions
export const erpRegions = [
  { id: "reg1", name: "North India", code: "NI", country: "India", manager: "Rahul Sharma", branches: 4, revenue: "₹24.5 Cr", employees: 120, status: "Active" },
  { id: "reg2", name: "South India", code: "SI", country: "India", manager: "Anita Desai", branches: 6, revenue: "₹32.1 Cr", employees: 180, status: "Active" },
  { id: "reg3", name: "East India", code: "EI", country: "India", manager: "Vikram Bose", branches: 2, revenue: "₹12.0 Cr", employees: 65, status: "Active" },
  { id: "reg4", name: "West India", code: "WI", country: "India", manager: "Sneha Patel", branches: 5, revenue: "₹45.2 Cr", employees: 210, status: "Active" },
  { id: "reg5", name: "International", code: "INTL", country: "Global", manager: "David Smith", branches: 3, revenue: "$12.5 M", employees: 90, status: "Active" },
];

// 2. Zones
export const erpZones = [
  { id: "z1", name: "Delhi NCR", regionId: "reg1", manager: "Amit Singh", branches: 2, status: "Active" },
  { id: "z2", name: "Punjab & Haryana", regionId: "reg1", manager: "Gurpreet Kaur", branches: 2, status: "Active" },
  { id: "z3", name: "Telangana", regionId: "reg2", manager: "Ravi Teja", branches: 2, status: "Active" },
  { id: "z4", name: "Karnataka", regionId: "reg2", manager: "Priya Gowda", branches: 2, status: "Active" },
  { id: "z5", name: "Maharashtra", regionId: "reg4", manager: "Ajay Patil", branches: 3, status: "Active" },
];

// 3. Teams
export const erpTeams = [
  { id: "t1", name: "Enterprise Sales", lead: "Rohan Kapoor", members: 12, department: "Sales", branch: "Mumbai HQ", status: "Active", kpi: "94%" },
  { id: "t2", name: "Retail Operations", lead: "Meera Reddy", members: 45, department: "Operations", branch: "Bengaluru", status: "Active", kpi: "88%" },
  { id: "t3", name: "Warehouse A Shift", lead: "Suresh Kumar", members: 24, department: "Logistics", branch: "Delhi NCR", status: "Active", kpi: "91%" },
  { id: "t4", name: "Cloud Infrastructure", lead: "Neha Gupta", members: 8, department: "Engineering", branch: "Remote", status: "Active", kpi: "99%" },
];

// 4. Currency
export const erpCurrencies = [
  { code: "INR", symbol: "₹", rate: 1.00, isDefault: true, precision: 2, status: "Active" },
  { code: "USD", symbol: "$", rate: 83.20, isDefault: false, precision: 2, status: "Active" },
  { code: "EUR", symbol: "€", rate: 89.50, isDefault: false, precision: 2, status: "Active" },
  { code: "GBP", symbol: "£", rate: 104.10, isDefault: false, precision: 2, status: "Active" },
];

// 5. Taxes
export const erpTaxes = [
  { id: "tax1", name: "GST Standard (18%)", type: "GST", rate: "18%", components: "CGST 9%, SGST 9%", status: "Active" },
  { id: "tax2", name: "GST Reduced (12%)", type: "GST", rate: "12%", components: "CGST 6%, SGST 6%", status: "Active" },
  { id: "tax3", name: "IGST Standard (18%)", type: "IGST", rate: "18%", components: "IGST 18%", status: "Active" },
  { id: "tax4", name: "Zero Rated (0%)", type: "Exempt", rate: "0%", components: "N/A", status: "Active" },
];

// 6. Payment Terms
export const erpPaymentTerms = [
  { id: "pt1", name: "Immediate", days: 0, creditLimit: "₹0", lateFee: "0%", status: "Active" },
  { id: "pt2", name: "Net 15 Days", days: 15, creditLimit: "₹5,00,000", lateFee: "2%", status: "Active" },
  { id: "pt3", name: "Net 30 Days", days: 30, creditLimit: "₹25,00,000", lateFee: "2.5%", status: "Active" },
  { id: "pt4", name: "Net 60 Days", days: 60, creditLimit: "₹50,00,000", lateFee: "3%", status: "Active" },
];

// 7. Number Series
export const erpNumberSeries = [
  { id: "ns1", module: "Invoices", prefix: "INV-2025-", current: "00142", preview: "INV-2025-00143", status: "Active" },
  { id: "ns2", module: "Purchase Orders", prefix: "PO-", current: "05021", preview: "PO-05022", status: "Active" },
  { id: "ns3", module: "Employees", prefix: "EMP-", current: "00350", preview: "EMP-00351", status: "Active" },
  { id: "ns4", module: "Sales Orders", prefix: "SO-", current: "09912", preview: "SO-09913", status: "Active" },
];

// 8. API Keys
export const erpApiKeys = [
  { id: "api1", name: "Razorpay Payment Gateway", service: "Razorpay", env: "Production", lastUsed: "2 mins ago", status: "Active" },
  { id: "api2", name: "Twilio SMS Service", service: "Twilio", env: "Production", lastUsed: "15 mins ago", status: "Active" },
  { id: "api3", name: "OpenAI Antigravity", service: "OpenAI", env: "Production", lastUsed: "1 min ago", status: "Active" },
  { id: "api4", name: "Stripe Test Env", service: "Stripe", env: "Test", lastUsed: "5 days ago", status: "Inactive" },
];

// 9. MFA Policies
export const erpMfaPolicies = [
  { id: "mfa1", role: "Super Admin", methods: "Authenticator App + Biometric", timeout: "15 mins", restrictIp: true, status: "Active" },
  { id: "mfa2", role: "Finance Manager", methods: "Authenticator App / SMS", timeout: "30 mins", restrictIp: false, status: "Active" },
  { id: "mfa3", role: "Store Staff", methods: "SMS Only", timeout: "12 hours", restrictIp: true, status: "Active" },
];

// 10. Workflows
export const erpWorkflows = [
  { id: "wf1", name: "Purchase Order > ₹5L", module: "Procurement", levels: 3, approvers: "Manager, Finance, CEO", status: "Active" },
  { id: "wf2", name: "Leave Approval", module: "HRMS", levels: 1, approvers: "Reporting Manager", status: "Active" },
  { id: "wf3", name: "Customer Credit Limit Increase", module: "CRM", levels: 2, approvers: "Sales Head, Finance Head", status: "Active" },
];

// 11. Custom Fields
export const erpCustomFields = [
  { id: "cf1", name: "Vehicle Registration", module: "Employees", type: "Text", required: false, status: "Active" },
  { id: "cf2", name: "Secondary Contact", module: "Customers", type: "Phone", required: false, status: "Active" },
  { id: "cf3", name: "Warehouse Shelf Location", module: "Products", type: "Text", required: true, status: "Active" },
];

// 12. Automation Rules
export const erpAutomationRules = [
  { id: "ar1", name: "Low Stock Alert", trigger: "Inventory < Min Level", action: "Email Procurement Head", status: "Active" },
  { id: "ar2", name: "Welcome Email", trigger: "Employee Created", action: "Send Offer & Policy Docs", status: "Active" },
  { id: "ar3", name: "Late Payment Reminder", trigger: "Invoice Overdue > 3 Days", action: "SMS Customer", status: "Active" },
];

// 13. Geography (Countries, States, Cities)
export const erpGeography = [
  { id: "g1", country: "India", iso: "IN", currency: "INR", phoneCode: "+91", states: 28, status: "Active" },
  { id: "g2", country: "United States", iso: "US", currency: "USD", phoneCode: "+1", states: 50, status: "Active" },
  { id: "g3", country: "United Arab Emirates", iso: "AE", currency: "AED", phoneCode: "+971", states: 7, status: "Active" },
];

// 14. Locations
export const erpLocations = [
  { id: "loc1", name: "Mumbai Main Warehouse", type: "Warehouse", capacity: "50,000 sqft", hours: "24x7", map: "Bandra Kurla Complex", status: "Active" },
  { id: "loc2", name: "Delhi Connaught Place", type: "Store", capacity: "2,500 sqft", hours: "10AM - 9PM", map: "Connaught Place", status: "Active" },
  { id: "loc3", name: "Bengaluru Tech Hub", type: "Office", capacity: "500 Seats", hours: "9AM - 6PM", map: "Electronic City", status: "Active" },
];

// 15. Calendars & Shifts
export const erpShifts = [
  { id: "sh1", name: "Morning General", hours: "09:00 - 18:00", break: "60 mins", grace: "15 mins", days: "Mon-Fri", status: "Active" },
  { id: "sh2", name: "Evening Retail", hours: "13:00 - 22:00", break: "45 mins", grace: "10 mins", days: "Tue-Sun", status: "Active" },
  { id: "sh3", name: "Night Operations", hours: "22:00 - 06:00", break: "45 mins", grace: "10 mins", days: "Rotational", status: "Active" },
];

// 16. Tags
export const erpTags = [
  { id: "tag1", name: "VIP Customer", color: "bg-amber-500/10 text-amber-600", module: "CRM" },
  { id: "tag2", name: "High Risk", color: "bg-rose-500/10 text-rose-600", module: "Finance" },
  { id: "tag3", name: "Fast Moving", color: "bg-emerald-500/10 text-emerald-600", module: "Inventory" },
];

// 17. Error Logs
export const erpErrorLogs = [
  { id: "err1", date: "2026-07-01 10:24 AM", module: "Payment Gateway", message: "Timeout connecting to Razorpay API", severity: "High", status: "Resolved" },
  { id: "err2", date: "2026-07-01 09:15 AM", module: "Sync Engine", message: "Failed to sync offline POS orders", severity: "Critical", status: "Investigating" },
  { id: "err3", date: "2026-06-30 08:44 PM", module: "Email Service", message: "SMTP connection rejected", severity: "Medium", status: "Resolved" },
];

// 18. Backup & Restore
export const erpBackups = [
  { id: "bk1", date: "2026-07-01 02:00 AM", type: "Automated Daily", size: "4.2 GB", location: "AWS S3", status: "Success" },
  { id: "bk2", date: "2026-06-30 02:00 AM", type: "Automated Daily", size: "4.1 GB", location: "AWS S3", status: "Success" },
  { id: "bk3", date: "2026-06-25 10:00 AM", type: "Manual User Backup", size: "3.9 GB", location: "Azure Blob", status: "Success" },
];
