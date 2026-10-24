export interface ErpCompany {
  id: string;
  name: string;
  legalName?: string;
  type?: string;
  gst?: string;
  pan?: string;
  regNo?: string;
  industry?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  language?: string;
  financialYear?: string;
  taxConfig?: string;
  status?: string;
  plan?: string;
  date?: string;
  logo?: string;
}

export interface ErpBranch {
  id: string;
  code: string;
  name: string;
  manager?: string;
  address?: string;
  employees?: number;
  warehouse?: string;
  revenue?: string;
  status?: string;
  workingHours?: string;
  openingDate?: string;
  companyId?: string;
}

export interface ErpDepartment {
  id: string;
  name: string;
  code?: string;
  head?: string;
  employeeCount?: number;
  status?: string;
}

export interface ErpDesignation {
  id: string;
  name: string;
  level?: string;
  status?: string;
}

export interface ErpBusinessUnit {
  id: string;
  name: string;
  companyId?: string;
  head?: string;
  status?: string;
}

export interface ErpCostCenter {
  id: string;
  name: string;
  department?: string;
  budget?: number;
  expense?: number;
  status?: string;
}

export interface ErpFiscalYear {
  id: string;
  name: string;
  start: string;
  end: string;
  status: string;
}

export interface ErpUser {
  id: string;
  name: string;
  empId?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: string;
  branch?: string;
  company?: string;
  status?: string;
  lastLogin?: string;
  mfa?: boolean;
}

export interface ErpRole {
  id: string;
  name: string;
  users?: number;
  status?: string;
}

export interface ErpWorkspace {
  id: string;
  name: string;
  company?: string;
  branch?: string;
  users?: number;
  theme?: string;
  lang?: string;
  tz?: string;
  status?: string;
}

export interface ErpAuditLog {
  id: string;
  date: string;
  time: string;
  user: string;
  module: string;
  action: string;
  oldValue: string;
  newValue: string;
  ip: string;
  device: string;
  browser: string;
  location: string;
  status: string;
}

export interface ErpActivityLog {
  id: string;
  time: string;
  action: string;
  user: string;
  avatar?: string;
}

export interface ErpRegion {
  id: string;
  name: string;
  code: string;
  country: string;
  manager: string;
  branches: number;
  revenue: string;
  employees: number;
  status: string;
}

export interface ErpZone {
  id: string;
  name: string;
  regionId: string;
  manager: string;
  branches: number;
  status: string;
}

export interface ErpTeam {
  id: string;
  name: string;
  lead: string;
  members: number;
  department: string;
  branch: string;
  status: string;
  kpi: string;
}

export interface ErpCurrency {
  code: string;
  symbol: string;
  rate: number;
  isDefault: boolean;
  precision: number;
  status: string;
}

export interface ErpTax {
  id: string;
  name: string;
  type: string;
  rate: string;
  components: string;
  status: string;
}

export interface ErpPaymentTerm {
  id: string;
  name: string;
  days: number;
  creditLimit: string;
  lateFee: string;
  status: string;
}

export interface ErpNumberSeries {
  id: string;
  module: string;
  prefix: string;
  current: string;
  preview: string;
  status: string;
}

export interface ErpApiKey {
  id: string;
  name: string;
  service: string;
  env: string;
  lastUsed: string;
  status: string;
}

export interface ErpMfaPolicy {
  id: string;
  role: string;
  methods: string;
  timeout: string;
  restrictIp: boolean;
  status: string;
}

export interface ErpWorkflow {
  id: string;
  name: string;
  module: string;
  levels: number;
  approvers: string;
  status: string;
}

export interface ErpCustomField {
  id: string;
  name: string;
  module: string;
  type: string;
  required: boolean;
  status: string;
}

export interface ErpAutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: string;
}

export interface ErpGeographyItem {
  id: string;
  country: string;
  iso: string;
  currency: string;
  phoneCode: string;
  states: number;
  status: string;
}

export interface ErpLocation {
  id: string;
  name: string;
  type: string;
  capacity: string;
  hours: string;
  map: string;
  status: string;
}

export interface ErpShift {
  id: string;
  name: string;
  hours: string;
  break: string;
  grace: string;
  days: string;
  status: string;
}

export interface ErpTag {
  id: string;
  name: string;
  color: string;
  module: string;
}

export interface ErpErrorLog {
  id: string;
  date: string;
  module: string;
  message: string;
  severity: string;
  status: string;
}

export interface ErpBackup {
  id: string;
  date: string;
  type: string;
  size: string;
  location: string;
  status: string;
}

// All data collections initialized to empty without hardcoded mock data
export const erpCompanies: ErpCompany[] = [];
export const erpBranches: ErpBranch[] = [];
export const erpDepartments: ErpDepartment[] = [];
export const erpDesignations: ErpDesignation[] = [];
export const erpBusinessUnits: ErpBusinessUnit[] = [];
export const erpCostCenters: ErpCostCenter[] = [];
export const erpFiscalYears: ErpFiscalYear[] = [];
export const erpUsers: ErpUser[] = [];
export const erpRoles: ErpRole[] = [];
export const erpWorkspaces: ErpWorkspace[] = [];
export const erpAuditLogs: ErpAuditLog[] = [];
export const erpActivityLogs: ErpActivityLog[] = [];
export const erpRegions: ErpRegion[] = [];
export const erpZones: ErpZone[] = [];
export const erpTeams: ErpTeam[] = [];
export const erpCurrencies: ErpCurrency[] = [];
export const erpTaxes: ErpTax[] = [];
export const erpPaymentTerms: ErpPaymentTerm[] = [];
export const erpNumberSeries: ErpNumberSeries[] = [];
export const erpApiKeys: ErpApiKey[] = [];
export const erpMfaPolicies: ErpMfaPolicy[] = [];
export const erpWorkflows: ErpWorkflow[] = [];
export const erpCustomFields: ErpCustomField[] = [];
export const erpAutomationRules: ErpAutomationRule[] = [];
export const erpGeography: ErpGeographyItem[] = [];
export const erpLocations: ErpLocation[] = [];
export const erpShifts: ErpShift[] = [];
export const erpTags: ErpTag[] = [];
export const erpErrorLogs: ErpErrorLog[] = [];
export const erpBackups: ErpBackup[] = [];
