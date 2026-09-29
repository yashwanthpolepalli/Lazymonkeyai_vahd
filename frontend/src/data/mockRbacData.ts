export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  assignedRoles: string[]; // Role IDs
  defaultRole: string; // Role ID
  status: "Active" | "Inactive";
}

// Granular permissions
export const ALL_PERMISSIONS = [
  "view:dashboard",
  "view:copilot",
  "view:erp",
  "view:inventory",
  "view:warehouse",
  "view:procurement",
  "view:pos",
  "view:accounting",
  "view:crm",
  "view:hrms",
  "view:payroll",
  "view:reports",
  "view:settings",
  "manage:users",
  "manage:roles",
];

// Pre-defined Roles
export const mockRoles: Role[] = [
  {
    id: "r_super_admin",
    name: "Super Admin",
    description: "Full access to all modules and system settings.",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    id: "r_company_admin",
    name: "Company Admin",
    description: "Manage company settings, users, and financials.",
    permissions: ["view:dashboard", "view:copilot", "view:erp", "view:accounting", "view:hrms", "view:crm", "view:reports", "view:settings", "manage:users"],
  },
  {
    id: "r_branch_manager",
    name: "Branch Manager",
    description: "Manage daily operations at a specific branch.",
    permissions: ["view:dashboard", "view:inventory", "view:warehouse", "view:pos", "view:hrms", "view:crm", "view:reports"],
  },
  {
    id: "r_hr_manager",
    name: "HR Manager",
    description: "Manage employees, payroll, and recruitment.",
    permissions: ["view:dashboard", "view:hrms", "view:payroll", "view:reports"],
  },
  {
    id: "r_sales_rep",
    name: "Sales Rep",
    description: "Access CRM and POS.",
    permissions: ["view:dashboard", "view:crm", "view:pos"],
  },
  {
    id: "r_warehouse_worker",
    name: "Warehouse Worker",
    description: "Manage inventory and shipments.",
    permissions: ["view:inventory", "view:warehouse"],
  },
  {
    id: "r_vendor",
    name: "Vendor Portal",
    description: "External portal for vendors to manage purchase orders and bills.",
    permissions: ["view:procurement"],
  },
];

// Pre-defined Users
export const mockUsers: AppUser[] = [
  {
    id: "u_1",
    name: "Alexandra Chen",
    email: "alexandra.chen@businessos.ai",
    avatar: "AC",
    assignedRoles: ["r_super_admin", "r_company_admin"],
    defaultRole: "r_super_admin",
    status: "Active",
  },
  {
    id: "u_2",
    name: "Marcus Johnson",
    email: "marcus.j@businessos.ai",
    avatar: "MJ",
    assignedRoles: ["r_branch_manager", "r_warehouse_worker"],
    defaultRole: "r_branch_manager",
    status: "Active",
  },
  {
    id: "u_3",
    name: "Sarah Jenkins",
    email: "sarah.j@vendor.com",
    avatar: "SJ",
    assignedRoles: ["r_vendor"],
    defaultRole: "r_vendor",
    status: "Active",
  },
  {
    id: "u_4",
    name: "David Chen",
    email: "david.c@businessos.ai",
    avatar: "DC",
    assignedRoles: ["r_sales_rep"],
    defaultRole: "r_sales_rep",
    status: "Active",
  }
];
