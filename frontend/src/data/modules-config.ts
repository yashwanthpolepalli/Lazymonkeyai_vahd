import {
  LayoutDashboard,
  Component,
  Archive,
  Layers,
  Terminal,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  UsersRound,
  RadioTower,
  BarChart3,
  Settings,
  Calculator,
} from "lucide-react";

export interface ModuleSubTab {
  id: string; // unique identifier / tab query value
  label: string;
  route: string; // URL with tab query
  description?: string;
}

export interface SystemModule {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  category: "Core Operations" | "Commerce & POS" | "Finance & People" | "Administration & Master";
  icon: any;
  navGroup: string; // matches NavGroup.group in navigation.ts
  permissionKey: string; // matches view permission
  defaultRoute: string;
  routePrefix: string;
  isAlwaysAvailable?: boolean;
  subTabs: ModuleSubTab[];
}

export const SYSTEM_MODULES: SystemModule[] = [
  {
    id: "dashboard",
    name: "Workspace & Dashboard",
    shortLabel: "Workspace",
    description: "Overview dashboard, widgets, AI copilot, and quick actions.",
    category: "Core Operations",
    icon: LayoutDashboard,
    navGroup: "Workspace",
    permissionKey: "view:dashboard",
    defaultRoute: "/dashboard",
    routePrefix: "/dashboard",
    isAlwaysAvailable: true,
    subTabs: [
      { id: "dashboard_home", label: "Executive Dashboard", route: "/dashboard" },
      { id: "lazymonkey_ai", label: "LazyMonkey AI Copilot", route: "/dashboard?tab=lazymonkey_ai" },
    ],
  },
  {
    id: "pos",
    name: "Point of Sale (POS)",
    shortLabel: "POS",
    description: "Cashier counter, order checkout, receipt printing, and daily sales register.",
    category: "Commerce & POS",
    icon: Terminal,
    navGroup: "POS",
    permissionKey: "view:pos",
    defaultRoute: "/pos?tab=sales_history",
    routePrefix: "/pos",
    subTabs: [
      { id: "terminal", label: "POS Billing Terminal", route: "/pos?tab=terminal" },
      { id: "sales_history", label: "Sales & Invoices History", route: "/pos?tab=sales_history" },
      { id: "quotations", label: "Quotations & Estimates", route: "/pos?tab=quotations" },
      { id: "credit_notes", label: "Credit Notes (Sales Returns)", route: "/pos?tab=credit_notes" },
      { id: "debit_notes", label: "Debit Notes (Supplementary)", route: "/pos?tab=debit_notes" },
      { id: "proforma", label: "Proforma Invoices", route: "/pos?tab=proforma" },
      { id: "payment_in", label: "Payment In / Collection", route: "/pos?tab=payment_in" },
      { id: "store_operations", label: "Store Operations", route: "/pos?tab=store_operations" },
      { id: "returns", label: "Returns & Exchanges", route: "/pos?tab=returns" },
    ],
  },
  {
    id: "inventory",
    name: "Inventory & Warehouse",
    shortLabel: "Inventory",
    description: "Master catalog, batch & serial tracking, warehouse bin management, and stock transfers.",
    category: "Commerce & POS",
    icon: Archive,
    navGroup: "Inventory & Warehouse",
    permissionKey: "view:inventory",
    defaultRoute: "/inventory?tab=products",
    routePrefix: "/inventory",
    subTabs: [
      { id: "products", label: "Products Master", route: "/inventory?tab=products" },
      { id: "categories", label: "Product Categories", route: "/inventory?tab=categories" },
      { id: "brands", label: "Brands & Makes", route: "/inventory?tab=brands" },
      { id: "units", label: "Units of Measure (UOM)", route: "/inventory?tab=units" },
      { id: "stock_overview", label: "Stock Overview & Balance", route: "/inventory?tab=stock_overview" },
      { id: "stock_movement", label: "Stock Movement & Logs", route: "/inventory?tab=stock_movement" },
      { id: "stock_adjustment", label: "Stock Adjustments", route: "/inventory?tab=stock_adjustment" },
      { id: "stock_transfer", label: "Inter-Store Stock Transfers", route: "/inventory?tab=stock_transfer" },
      { id: "warehouses", label: "Warehouses, Racks & Bins", route: "/inventory?tab=warehouses" },
      { id: "batches", label: "Batch & Serial Traceability", route: "/inventory?tab=batches" },
      { id: "low_stock", label: "Low Stock & Reorder Alerts", route: "/inventory?tab=low_stock" },
      { id: "print_templates", label: "Barcode & Label Templates", route: "/inventory?tab=print_templates" },
    ],
  },
  {
    id: "operations",
    name: "Purchase & Procurement",
    shortLabel: "Purchase",
    description: "Purchase requisitions, vendor RFQs, purchase orders, and goods receipt notes (GRN).",
    category: "Core Operations",
    icon: ShoppingBag,
    navGroup: "Purchase",
    permissionKey: "view:procurement",
    defaultRoute: "/procurement?tab=purchase_requests",
    routePrefix: "/procurement",
    subTabs: [
      { id: "purchase_requests", label: "Purchase Requisitions (PR)", route: "/procurement?tab=purchase_requests" },
      { id: "purchase_approvals", label: "PR Manager Approvals", route: "/procurement?tab=purchase_approvals" },
      { id: "purchase_quotations", label: "Vendor RFQs & Quotations", route: "/procurement?tab=purchase_quotations" },
      { id: "purchase_orders", label: "Purchase Orders (PO)", route: "/procurement?tab=purchase_orders" },
      { id: "goods_received_notes", label: "Goods Received (GRN)", route: "/procurement?tab=goods_received_notes" },
      { id: "suppliers", label: "Suppliers & Vendors Directory", route: "/procurement?tab=suppliers" },
      { id: "vendor_bills", label: "Purchase Invoices & Bills", route: "/procurement?tab=vendor_bills" },
      { id: "pending_payments", label: "Vendor Payments Out", route: "/procurement?tab=pending_payments" },
    ],
  },
  {
    id: "crm",
    name: "Sales & CRM",
    shortLabel: "Sales & CRM",
    description: "Leads pipeline, deals, customer profiles, discount rules, and quotations.",
    category: "Commerce & POS",
    icon: ShoppingCart,
    navGroup: "Sales & CRM",
    permissionKey: "view:crm",
    defaultRoute: "/crm?tab=customers",
    routePrefix: "/crm",
    subTabs: [
      { id: "customers", label: "Customer Directory", route: "/crm?tab=customers" },
      { id: "customer_groups", label: "Customer Groups", route: "/crm?tab=customer_groups" },
      { id: "customer_segments", label: "Customer Segments", route: "/crm?tab=customer_segments" },
      { id: "leads", label: "Leads Pipeline", route: "/crm?tab=leads" },
      { id: "deals", label: "Deals & Opportunities", route: "/crm?tab=deals" },
      { id: "quotations", label: "Quotations & Proposals", route: "/crm?tab=quotations" },
      { id: "sales_orders", label: "Sales Orders", route: "/crm?tab=sales_orders" },
      { id: "discounts", label: "Discounts & Coupons", route: "/crm?tab=discounts" },
      { id: "loyalty_program", label: "Loyalty & Points", route: "/crm?tab=loyalty_program" },
      { id: "customer_wallet", label: "Customer Wallets", route: "/crm?tab=customer_wallet" },
      { id: "support_tickets", label: "Customer Support Tickets", route: "/crm?tab=support_tickets" },
    ],
  },
  {
    id: "marketplace",
    name: "B2B Marketplace",
    shortLabel: "Marketplace",
    description: "Multi-vendor catalog, commission management, supplier payouts, and courier tracking.",
    category: "Commerce & POS",
    icon: ShoppingBag,
    navGroup: "Marketplace",
    permissionKey: "view:marketplace",
    defaultRoute: "/marketplace?tab=vendors",
    routePrefix: "/marketplace",
    subTabs: [
      { id: "vendors", label: "Merchants & Vendors", route: "/marketplace?tab=vendors" },
      { id: "marketplace_products", label: "Marketplace Catalog", route: "/marketplace?tab=marketplace_products" },
      { id: "marketplace_orders", label: "Orders & Fulfillment", route: "/marketplace?tab=marketplace_orders" },
      { id: "payouts", label: "Vendor Payouts & Commission", route: "/marketplace?tab=payouts" },
      { id: "couriers", label: "Courier & Shipment Tracking", route: "/marketplace?tab=couriers" },
      { id: "contracts", label: "Vendor Contracts & SLAs", route: "/marketplace?tab=contracts" },
      { id: "pricing_rules", label: "B2B Tiered Pricing Rules", route: "/marketplace?tab=pricing_rules" },
    ],
  },
  {
    id: "accounting",
    name: "Accounting & Finance",
    shortLabel: "Accounting",
    description: "Chart of accounts, general ledger, tax compliance, bank reconciliation, and financial reports.",
    category: "Finance & People",
    icon: Calculator,
    navGroup: "Accounting & Finance",
    permissionKey: "view:accounting",
    defaultRoute: "/accounting?tab=chart_of_accounts",
    routePrefix: "/accounting",
    subTabs: [
      { id: "chart_of_accounts", label: "Chart of Accounts (COA)", route: "/accounting?tab=chart_of_accounts" },
      { id: "invoices", label: "Sales Invoices & Billing", route: "/accounting?tab=invoices" },
      { id: "journal", label: "Journal Entries & Ledger", route: "/accounting?tab=journal" },
      { id: "banking", label: "Bank Accounts & Reconciliation", route: "/accounting?tab=banking" },
      { id: "taxes", label: "Tax Configuration & GST", route: "/accounting?tab=taxes" },
      { id: "fixed_assets", label: "Fixed Assets & Depreciation", route: "/accounting?tab=fixed_assets" },
      { id: "payment_vouchers", label: "Payment Vouchers", route: "/accounting?tab=payment_vouchers" },
      { id: "expense_claims", label: "Staff Expense Claims", route: "/accounting?tab=expense_claims" },
      { id: "budgets", label: "Financial Budgets & Forecasts", route: "/accounting?tab=budgets" },
      { id: "reports", label: "P&L, Balance Sheet & Reports", route: "/accounting?tab=reports" },
    ],
  },
  {
    id: "hrms",
    name: "HRMS & Payroll",
    shortLabel: "HRMS",
    description: "Employee records, attendance GPS/biometrics, leave approvals, recruitment, and payslips.",
    category: "Finance & People",
    icon: UsersRound,
    navGroup: "HRMS",
    permissionKey: "view:hrms",
    defaultRoute: "/hrms?tab=employees",
    routePrefix: "/hrms",
    subTabs: [
      { id: "employees", label: "Employees Directory", route: "/hrms?tab=employees" },
      { id: "attendance", label: "GPS & Biometric Attendance", route: "/hrms?tab=attendance" },
      { id: "leaves", label: "Leave Requests & Approvals", route: "/hrms?tab=leaves" },
      { id: "payroll", label: "Payroll Processing & Payslips", route: "/hrms?tab=payroll" },
      { id: "recruitment", label: "Recruitment & Job Openings", route: "/hrms?tab=recruitment" },
      { id: "performance", label: "Performance Appraisals & KPIs", route: "/hrms?tab=performance" },
      { id: "ess", label: "Employee Self-Service (ESS)", route: "/hrms?tab=ess" },
      { id: "intelligence", label: "HR Analytics & Insights", route: "/hrms?tab=intelligence" },
      { id: "learning", label: "Learning & Training LMS", route: "/hrms?tab=learning" },
      { id: "exit", label: "Exit & Offboarding", route: "/hrms?tab=exit" },
    ],
  },
  {
    id: "iot",
    name: "IoT & Telemetry",
    shortLabel: "IoT",
    description: "Connected sensors, smart energy meters, telemetry logs, and machine status alerts.",
    category: "Core Operations",
    icon: RadioTower,
    navGroup: "IoT",
    permissionKey: "view:iot",
    defaultRoute: "/iot?tab=connected_devices",
    routePrefix: "/iot",
    subTabs: [
      { id: "connected_devices", label: "Connected Sensor Devices", route: "/iot?tab=connected_devices" },
      { id: "telemetry", label: "Real-time Telemetry Logs", route: "/iot?tab=telemetry" },
      { id: "alerts", label: "Device Anomaly Alerts", route: "/iot?tab=alerts" },
    ],
  },
  {
    id: "analytics",
    name: "Analytics & Intelligence",
    shortLabel: "Analytics",
    description: "Executive dashboards, AI sales insights, profit analytics, and scheduled reporting.",
    category: "Finance & People",
    icon: BarChart3,
    navGroup: "Analytics & Intelligence",
    permissionKey: "view:analytics",
    defaultRoute: "/reports?tab=sales_reports",
    routePrefix: "/reports",
    subTabs: [
      { id: "sales_reports", label: "Sales & Revenue Reports", route: "/reports?tab=sales_reports" },
      { id: "stock_reports", label: "Stock & Inventory Reports", route: "/reports?tab=stock_reports" },
      { id: "financial_reports", label: "Financial P&L Reports", route: "/reports?tab=financial_reports" },
      { id: "crm_reports", label: "CRM & Customer Reports", route: "/reports?tab=crm_reports" },
      { id: "hr_reports", label: "HR & Headcount Reports", route: "/reports?tab=hr_reports" },
      { id: "ai_insights", label: "AI Insights & Trend Forecasts", route: "/reports?tab=ai_insights" },
      { id: "report_builder", label: "Custom Drag-and-Drop Builder", route: "/reports?tab=report_builder" },
    ],
  },
  {
    id: "erp",
    name: "Core ERP & Organization",
    shortLabel: "Core ERP",
    description: "Companies, branches, fiscal years, currencies, number series, and user/role administration.",
    category: "Administration & Master",
    icon: Component,
    navGroup: "Core ERP",
    permissionKey: "view:erp",
    defaultRoute: "/erp?tab=companies",
    routePrefix: "/erp",
    subTabs: [
      { id: "companies", label: "Companies & Workspaces", route: "/erp?tab=companies" },
      { id: "branches", label: "Branches & Locations", route: "/erp?tab=branches" },
      { id: "departments", label: "Departments & Designations", route: "/erp?tab=departments" },
      { id: "fiscal_years", label: "Fiscal Years & Cost Centers", route: "/erp?tab=fiscal_years" },
      { id: "currencies", label: "Currencies & Exchange Rates", route: "/erp?tab=currencies" },
      { id: "users", label: "Users & Staff Accounts", route: "/erp?tab=users" },
      { id: "roles", label: "Roles & Permissions", route: "/erp?tab=roles" },
      { id: "permission_matrix", label: "Permission Matrix", route: "/erp?tab=permission_matrix" },
      { id: "approval_workflows", label: "Approval Workflows", route: "/erp?tab=approval_workflows" },
      { id: "geography", label: "Geography & Master Data", route: "/erp?tab=geography" },
    ],
  },
  {
    id: "settings",
    name: "System Configuration",
    shortLabel: "Settings",
    description: "Global system policies, webhooks, audit logs, and security controls.",
    category: "Administration & Master",
    icon: Settings,
    navGroup: "System Configuration",
    permissionKey: "view:system_config",
    defaultRoute: "/settings?tab=company_profile",
    routePrefix: "/settings",
    subTabs: [
      { id: "company_profile", label: "Company Profile & Branding", route: "/settings?tab=company_profile" },
      { id: "security", label: "Security & MFA Policies", route: "/settings?tab=security" },
      { id: "audit", label: "System Audit Logs", route: "/settings?tab=audit" },
      { id: "webhooks", label: "Webhooks & API Keys", route: "/settings?tab=webhooks" },
      { id: "backup", label: "Backup & Restore", route: "/settings?tab=backup" },
    ],
  },
];

export const ALL_MODULE_IDS = SYSTEM_MODULES.map((m) => m.id);

export const ALL_SUBTAB_ROUTES: string[] = SYSTEM_MODULES.flatMap((m) =>
  m.subTabs.map((s) => s.route)
);

export interface ModulePreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  modules: string[];
}

export const MODULE_PRESETS: ModulePreset[] = [
  {
    id: "pos_retail",
    name: "POS & Retail Counter",
    description: "Restricted to Cashier POS, Product/Stock Lookup, and Stock Transfers. Hides CRM, HRMS, and Accounting.",
    badge: "Recommended for Cashiers",
    modules: ["dashboard", "pos", "inventory", "operations"],
  },
  {
    id: "warehouse_staff",
    name: "Warehouse & Logistics",
    description: "Inventory management, warehouse bins, stock transfers, and receiving purchase orders.",
    badge: "Logistics",
    modules: ["dashboard", "inventory", "operations"],
  },
  {
    id: "sales_rep",
    name: "Sales & Client Relations",
    description: "CRM leads, deals, quotations, product catalog, and retail sales.",
    badge: "Sales",
    modules: ["dashboard", "crm", "inventory", "pos"],
  },
  {
    id: "finance_desk",
    name: "Finance & Accounts",
    description: "Chart of accounts, journals, invoices, bank reconciliation, and business intelligence.",
    badge: "Finance",
    modules: ["dashboard", "accounting", "operations", "analytics"],
  },
  {
    id: "hrms_desk",
    name: "Human Resources",
    description: "Staff directory, biometric attendance, leave workflows, and payroll.",
    badge: "People",
    modules: ["dashboard", "hrms"],
  },
  {
    id: "full_access",
    name: "Full ERP Administrator",
    description: "Unrestricted access to every business module, accounting ledgers, and administration.",
    badge: "All Modules",
    modules: [...ALL_MODULE_IDS],
  },
];

// ─── Storage & Resolution Helpers ─────────────────────────────────

const ROLE_MODULES_KEY_PREFIX = "bos_role_modules_";
const ROLE_TABS_KEY_PREFIX = "bos_role_tabs_";
const USER_MODULES_KEY_PREFIX = "bos_user_modules_";
const USER_TABS_KEY_PREFIX = "bos_user_tabs_";

function normalizeKey(str: string): string {
  return (str || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function getStoredRoleModules(roleIdOrName: string): string[] | null {
  if (!roleIdOrName) return null;
  try {
    // Check by exact key or normalized name
    const raw =
      localStorage.getItem(`${ROLE_MODULES_KEY_PREFIX}${roleIdOrName}`) ||
      localStorage.getItem(`${ROLE_MODULES_KEY_PREFIX}${normalizeKey(roleIdOrName)}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Error reading stored role modules:", e);
  }
  return null;
}

export function setStoredRoleModules(roleId: string, modules: string[], roleName?: string): void {
  if (!roleId) return;
  try {
    const serialized = JSON.stringify(modules);
    localStorage.setItem(`${ROLE_MODULES_KEY_PREFIX}${roleId}`, serialized);
    if (roleName) {
      localStorage.setItem(`${ROLE_MODULES_KEY_PREFIX}${normalizeKey(roleName)}`, serialized);
    }
    window.dispatchEvent(new CustomEvent("bos-modules-changed", { detail: { roleId, modules } }));
  } catch (e) {
    console.warn("Error saving stored role modules:", e);
  }
}

export function getStoredRoleTabs(roleIdOrName: string): string[] | null {
  if (!roleIdOrName) return null;
  try {
    const raw =
      localStorage.getItem(`${ROLE_TABS_KEY_PREFIX}${roleIdOrName}`) ||
      localStorage.getItem(`${ROLE_TABS_KEY_PREFIX}${normalizeKey(roleIdOrName)}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Error reading stored role tabs:", e);
  }
  return null;
}

export function setStoredRoleTabs(roleId: string, tabs: string[], roleName?: string): void {
  if (!roleId) return;
  try {
    const serialized = JSON.stringify(tabs);
    localStorage.setItem(`${ROLE_TABS_KEY_PREFIX}${roleId}`, serialized);
    if (roleName) {
      localStorage.setItem(`${ROLE_TABS_KEY_PREFIX}${normalizeKey(roleName)}`, serialized);
    }
    window.dispatchEvent(new CustomEvent("bos-modules-changed", { detail: { roleId, tabs } }));
  } catch (e) {
    console.warn("Error saving stored role tabs:", e);
  }
}

export function getStoredUserModules(userId: string): string[] | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_MODULES_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Error reading stored user modules:", e);
  }
  return null;
}

export function setStoredUserModules(userId: string, modules: string[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${USER_MODULES_KEY_PREFIX}${userId}`, JSON.stringify(modules));
    window.dispatchEvent(new CustomEvent("bos-modules-changed", { detail: { userId, modules } }));
  } catch (e) {
    console.warn("Error saving stored user modules:", e);
  }
}

export function getStoredUserTabs(userId: string): string[] | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_TABS_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Error reading stored user tabs:", e);
  }
  return null;
}

export function setStoredUserTabs(userId: string, tabs: string[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${USER_TABS_KEY_PREFIX}${userId}`, JSON.stringify(tabs));
    window.dispatchEvent(new CustomEvent("bos-modules-changed", { detail: { userId, tabs } }));
  } catch (e) {
    console.warn("Error saving stored user tabs:", e);
  }
}

/**
 * Resolves the final effective list of allowed modules for the active session.
 */
export const DEFAULT_STANDARD_MODULES = [
  "dashboard",
  "pos",
  "inventory",
  "crm",
  "operations",
  "marketplace",
  "analytics",
  "erp",
  "settings",
];

export function resolveEffectiveModules(
  user: {
    id?: string;
    isPlatformAdmin?: boolean;
    isTenantOwner?: boolean;
    enabledModules?: string[] | null;
    permissions?: string[] | null;
  } | null,
  activeRole: {
    id?: string;
    name?: string;
    permissions?: string[] | null;
    enabled_modules?: string[] | null;
    enabledModules?: string[] | null;
  } | null
): string[] {
  if (!user) return ["dashboard"];

  // Platform super admins always have full god mode across all modules
  if (user.isPlatformAdmin) {
    return ALL_MODULE_IDS;
  }

  // 1. Check user.enabledModules from backend database OR localStorage
  let userAllowedList: string[] | null = null;
  if (user.enabledModules && user.enabledModules.length > 0) {
    userAllowedList = user.enabledModules;
  } else if (user.id) {
    const userCustom = getStoredUserModules(user.id);
    if (userCustom && userCustom.length > 0) {
      userAllowedList = userCustom;
    }
  }

  if (userAllowedList && userAllowedList.length > 0) {
    const normalized = userAllowedList.map((m) => {
      if (m === "procurement") return "operations";
      if (m === "reports") return "analytics";
      if (m === "system_config" || m === "system_admin") return "settings";
      if (m === "core") return "erp";
      if (m === "warehouse") return "inventory";
      return m;
    });
    // Strict isolation: Return ONLY the modules explicitly granted to this user!
    return Array.from(new Set(["dashboard", ...normalized]));
  }

  // 2. Check active role custom modules (from backend or localStorage)
  if (activeRole) {
    const roleDbModules = activeRole.enabled_modules || activeRole.enabledModules;
    if (roleDbModules && roleDbModules.length > 0) {
      return Array.from(new Set(["dashboard", ...roleDbModules]));
    }
    if (activeRole.id) {
      const roleCustom = getStoredRoleModules(activeRole.id);
      if (roleCustom && roleCustom.length > 0) {
        return Array.from(new Set(["dashboard", ...roleCustom]));
      }
    }
    if (activeRole.name) {
      const roleNameCustom = getStoredRoleModules(activeRole.name);
      if (roleNameCustom && roleNameCustom.length > 0) {
        return Array.from(new Set(["dashboard", ...roleNameCustom]));
      }
    }
  }

  // 3. Determine allowed modules based on role permissions
  const perms = activeRole?.permissions || user.permissions || [];
  const hasWildcard =
    perms.includes("all") ||
    perms.includes("*:*") ||
    perms.includes("super_admin") ||
    perms.includes("manage:all") ||
    perms.includes("*");

  const standardBase = DEFAULT_STANDARD_MODULES;

  if (hasWildcard) {
    return standardBase;
  }

  // Compute modules dynamically granted by permissions
  const permModules: string[] = [];
  if (perms.length > 0) {
    SYSTEM_MODULES.forEach((mod) => {
      if (mod.id === "dashboard") {
        permModules.push("dashboard");
        return;
      }
      const hasPerm = perms.some((p: string) => {
        if (!p) return false;
        if (p === mod.permissionKey) return true;
        if (mod.id === "pos" && (p.startsWith("view:pos") || p.startsWith("manage:pos") || p.includes("pos_terminal") || p.includes("pos_register") || p.includes("pos"))) return true;
        if (mod.id === "inventory" && (p.startsWith("view:inventory") || p.startsWith("manage:inventory") || p.includes("stock_") || p.includes("warehouse") || p.includes("product") || p.includes("catalog"))) return true;
        if (mod.id === "operations" && (p.startsWith("view:procurement") || p.startsWith("manage:procurement") || p.includes("purchase_") || p.includes("suppliers") || p.includes("rfq") || p.includes("procurement") || p.includes("operations") || p.includes("grn"))) return true;
        if (mod.id === "crm" && (p.startsWith("view:crm") || p.startsWith("manage:crm") || p.includes("crm_") || p.includes("customer") || p.includes("lead") || p.includes("deal") || p.includes("quotation"))) return true;
        if (mod.id === "accounting" && (p.startsWith("view:accounting") || p.startsWith("manage:accounting") || p.includes("chart_of_accounts") || p.includes("journal") || p.includes("bank_") || p.includes("fixed_assets") || p.includes("finance") || p.includes("tax") || p.includes("invoice"))) return true;
        if (mod.id === "hrms" && (p.startsWith("view:hrms") || p.startsWith("manage:hrms") || p.includes("hrms_") || p.startsWith("view:ess") || p.startsWith("manage:ess") || p.includes("employee") || p.includes("payroll") || p.includes("attendance") || p.includes("leave"))) return true;
        if (mod.id === "marketplace" && (p.startsWith("view:marketplace") || p.startsWith("manage:marketplace") || p.includes("marketplace") || p.includes("vendor"))) return true;
        if (mod.id === "iot" && (p.startsWith("view:iot") || p.startsWith("manage:iot") || p.includes("iot") || p.includes("telemetry") || p.includes("device") || p.includes("sensor"))) return true;
        if (mod.id === "analytics" && (p.startsWith("view:analytics") || p.startsWith("view:reports") || p.startsWith("manage:analytics") || p.startsWith("manage:reports") || p.includes("analytics") || p.includes("report") || p.includes("ai_insights"))) return true;
        if (mod.id === "erp" && (p.startsWith("view:erp") || p.startsWith("manage:erp") || p.includes("company") || p.includes("branches") || p.includes("fiscal_years") || p.includes("users") || p.includes("roles") || p.includes("workspaces"))) return true;
        if (mod.id === "settings" && (p.startsWith("view:system_config") || p.startsWith("manage:system_config") || p.startsWith("view:settings") || p.includes("system_config") || p.includes("settings") || p.includes("audit") || p.includes("backup"))) return true;
        return false;
      });
      if (hasPerm) {
        permModules.push(mod.id);
      }
    });
  }

  // 1. Check if user has explicit stored custom modules
  let baseModules: string[] = [];
  if (user.id) {
    const userCustom = getStoredUserModules(user.id);
    if (userCustom && userCustom.length > 0) {
      baseModules = userCustom;
    }
  }

  // 2. Check if active role has explicit stored modules (by ID or by name)
  if (baseModules.length === 0 && activeRole?.id) {
    const roleCustom = getStoredRoleModules(activeRole.id);
    if (roleCustom && roleCustom.length > 0) {
      baseModules = roleCustom;
    }
  }
  if (baseModules.length === 0 && activeRole?.name) {
    const roleNameCustom = getStoredRoleModules(activeRole.name);
    if (roleNameCustom && roleNameCustom.length > 0) {
      baseModules = roleNameCustom;
    }
  }

  // 3. Check user.enabledModules from backend token/payload if set
  if (baseModules.length === 0 && user.enabledModules && user.enabledModules.length > 0) {
    baseModules = user.enabledModules.map((m) => {
      if (m === "procurement") return "operations";
      if (m === "reports") return "analytics";
      return m;
    });
  }

  // Combine base modules with permission-granted modules
  const combined = Array.from(new Set(["dashboard", ...baseModules, ...permModules]));
  if (combined.length > 1 || baseModules.length > 0 || permModules.length > 0) {
    return combined;
  }

  return standardBase;
}

/**
 * Resolves effective allowed sub-tabs (routes) for the active session.
 * If user is platform super admin or if no explicit tab-level restriction is stored, returns null (meaning ALL tabs allowed).
 */
export function resolveEffectiveTabs(
  user: { id?: string; isPlatformAdmin?: boolean; isTenantOwner?: boolean } | null,
  activeRole: { id?: string; name?: string; permissions?: string[] | null } | null,
  allowedModules: string[]
): string[] | null {
  if (!user) return null;

  if (user.isPlatformAdmin) {
    return null;
  }

  // 1. Check user custom tabs
  if (user.id) {
    const userTabs = getStoredUserTabs(user.id);
    if (userTabs && userTabs.length > 0) {
      return userTabs;
    }
  }

  // 2. Check role custom tabs
  if (activeRole?.id) {
    const roleTabs = getStoredRoleTabs(activeRole.id);
    if (roleTabs && roleTabs.length > 0) {
      return roleTabs;
    }
  }
  if (activeRole?.name) {
    const roleNameTabs = getStoredRoleTabs(activeRole.name);
    if (roleNameTabs && roleNameTabs.length > 0) {
      return roleNameTabs;
    }
  }

  return null;
}

export function isRouteAllowed(
  pathname: string,
  allowedModules: string[],
  searchStr = ""
): boolean {
  if (!pathname || pathname === "/" || pathname === "/dashboard") return true;

  const matchedModule = SYSTEM_MODULES.find((m) => pathname.startsWith(m.routePrefix));
  if (!matchedModule) return true; // Non-module general route
  if (matchedModule.isAlwaysAvailable) return true;

  return allowedModules.includes(matchedModule.id);
}

export function getDefaultAllowedRoute(allowedModules: string[]): string {
  if (allowedModules.includes("hrms")) return "/hrms?tab=employees";
  if (allowedModules.includes("pos")) return "/pos?tab=sales_history";
  if (allowedModules.includes("inventory")) return "/inventory?tab=products";
  if (allowedModules.includes("dashboard")) return "/dashboard";

  const firstModule = SYSTEM_MODULES.find((m) => allowedModules.includes(m.id));
  return firstModule ? firstModule.defaultRoute : "/dashboard";
}
