import { useCurrency } from "@/hooks/use-currency";

/**
 * LazyMonkeyAI â€” Central API Client
 * All backend API calls go through this module.
 * Auth token is injected from localStorage (set by AuthProvider).
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000/api/v1";

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return "";
  
  // If it's already a data URL or blob
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // Clean leading slash
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;

  // Determine backend origin
  let backendOrigin = "";
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    try {
      const parsedBase = new URL(API_BASE_URL);
      backendOrigin = `${parsedBase.protocol}//${parsedBase.host}`;
    } catch {
      backendOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    }
  } else if (typeof window !== "undefined") {
    // If API_BASE_URL is relative (e.g. /api/v1), use current window origin
    backendOrigin = window.location.origin;
  }

  // If it's an absolute URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // If running in browser on a remote/production domain, but the URL points to localhost/127.0.0.1
    if (typeof window !== "undefined" && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          if (backendOrigin) {
            return `${backendOrigin}${parsed.pathname}${parsed.search}`;
          }
          return `${parsed.pathname}${parsed.search}`;
        }
      } catch {}
    }
    return url;
  }

  // If backendOrigin is defined (e.g. http://15.207.227.85:8000), prefix it
  if (backendOrigin) {
    // If backend is on a separate port or origin, route directly to the backend
    return `${backendOrigin}${cleanUrl}`;
  }

  // Default fallback: if behind Nginx proxy, route through /api/v1
  if (cleanUrl.startsWith("/upload_images/") || cleanUrl.startsWith("/images/")) {
    return `/api/v1${cleanUrl}`;
  }

  return cleanUrl;
}

// Client-side CSV export. Headers + rows; triggers a browser download.
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string | { msg: string }[];
  status: number;
}


export interface GstRegistration {
  id?: string;
  gstin: string;
  trade_name?: string;
  state_code?: string;
  state_name?: string;
  address?: string;
  is_primary?: boolean;
}

export interface GspModuleCredentials {
  client_id?: string;
  client_secret?: string;
  username?: string;
  password?: string;
  gstin?: string;
  base_url?: string;
}

export interface GspCredentials {
  environment?: "sandbox" | "production";
  registered_email?: string;
  ip_address?: string;
  ewb?: GspModuleCredentials;
  gst?: GspModuleCredentials;
  einv?: GspModuleCredentials;
}

export interface CompanyEmailSettings {
  mail_server?: string;
  mail_port?: number;
  mail_username?: string;
  mail_password?: string;
  mail_from?: string;
  sender_name?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  reply_to?: string;
  enabled?: boolean;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  legal_name: string;
  company_type: string | null;
  gst_number: string | null;
  pan_number: string | null;
  registration_number: string | null;
  industry: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  default_currency_code: string;
  timezone: string;
  language: string;
  financial_year_start_month: number;
  tax_config_label: string | null;
  plan: string | null;
  logo_initials: string | null;
  logo_url?: string | null;
  established_date: string | null;
  gst_registrations?: GstRegistration[];
  gsp_credentials?: GspCredentials;
  email_settings?: CompanyEmailSettings;
  terms_and_conditions?: string | null;
  google_review_url?: string | null;
  google_place_id?: string | null;
  google_review_enabled?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  company_id: string;
  region_id: string | null;
  zone_id: string | null;
  code: string;
  name: string;
  manager_user_id: string | null;
  address: string | null;
  district: string | null;
  district_code: string | null;
  region_name: string | null;
  zone_name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  has_warehouse: boolean;
  working_hours: string | null;
  opening_date: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number | null;
  enforce_geofence: boolean | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  tenant_id: string;
  company_id: string;
  branch_id: string | null;
  parent_id: string | null;
  name: string;
  code: string;
  description?: string | null;
  head_user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Designation {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  department_id?: string | null;
  reports_to_id?: string | null;
  department_name?: string | null;
  reports_to_name?: string | null;
  level: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  code: string;
  country: string | null;
  manager_user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  tenant_id: string;
  region_id: string;
  name: string;
  manager_user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  tenant_id: string;
  company_id?: string | null;
  department_id: string;
  branch_id: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  lead_user_id: string | null;
  lead_employee_id?: string | null;
  lead_name?: string | null;
  department_name?: string | null;
  member_employee_ids?: string[];
  members_count?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  head_user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryUOM {
  id: string;
  name: string;
  abbreviation: string;
  unit_type?: string | null;
  base_unit?: boolean;
  conversion_rate?: number;
  unit_symbol?: string | null;
  products_count?: number;
  description: string | null;
  status: string;
  created_at: string;
}

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  warehouse_type: string;
  capacity: string | null;
  manager_name: string | null;
  employees: number;
  temperature_control: string | null;
  status: string;
  created_at: string;
  address?: string | null;
}

export interface StorageLocation {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  zone: string | null;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  barcode: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PutAwayRule {
  id: string;
  tenant_id: string;
  name: string;
  priority: number;
  destination_zone: string | null;
  destination_rack: string | null;
  bin_assignment: string;
  stacking_limit: number;
  special_requirements: string[];
  conditions: Array<Record<string, any>>;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PickingRule {
  id: string;
  tenant_id: string;
  name: string;
  strategy: string;
  order_rule: string;
  batch_size: number;
  zone_priority: string[];
  exclude_hazmat: boolean;
  allow_partial: boolean;
  auto_release: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface InventoryBatch {
  id: string;
  tenant_id: string;
  batch_number: string;
  product_id: string | null;
  product_name: string | null;
  sku: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  supplier: string | null;
  quantity: number;
  remaining_quantity: number;
  uom?: string | null;
  cost_price?: number | null;
  mrp?: number | null;
  selling_price?: number | null;
  tax_percent?: number | null;
  location?: string | null;
  supplier_invoice_no?: string | null;
  qc_status?: string | null;
  barcode?: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  status: string;
  sync_to_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySerial {
  id: string;
  tenant_id: string;
  serial_number: string;
  batch_id: string | null;
  product_id: string | null;
  product_name: string | null;
  sku?: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TraceabilityEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  batch_id: string | null;
  serial_id: string | null;
  source_location: string | null;
  destination_location: string | null;
  source_warehouse_id: string | null;
  destination_warehouse_id: string | null;
  party_type: string | null;
  party_name: string | null;
  reference_document: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  event_at: string;
  actor_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchGenealogy {
  batch: {
    id: string;
    batch_number: string;
    product_name: string | null;
    quantity: number;
    remaining_quantity: number;
    manufacturing_date: string | null;
    expiry_date: string | null;
    status: string;
  };
  events: TraceabilityEvent[];
  serial_count: number;
  serials: Array<{ id: string; serial_number: string; status: string; warehouse_name: string | null }>;
}

export interface ProductQRCode {
  id: string;
  tenant_id: string;
  product_id: string | null;
  qr_data: string;
  qr_type: string;
  format: string | null;
  version: string | null;
  error_correction: string | null;
  print_count: number;
  last_printed_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRFID {
  id: string;
  tenant_id: string;
  product_id: string | null;
  tag_uid: string;
  tag_type: string | null;
  frequency: string | null;
  protocol: string | null;
  memory_bits: number | null;
  write_count: number;
  last_seen_at: string | null;
  last_seen_location: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpirySummary {
  today: string;
  expired: { count: number; units: number };
  expiring_30: { count: number; units: number };
  expiring_90: { count: number; units: number };
}

export interface ExpiryBatchItem {
  id: string;
  batch_number: string;
  product_name: string | null;
  sku: string | null;
  warehouse_name: string | null;
  quantity: number;
  remaining_quantity: number;
  manufacturing_date: string | null;
  expiry_date: string | null;
  status: string;
  days_to_expiry: number | null;
}

export interface ManufacturingCohorts {
  today: string;
  cohorts: Record<string, { count: number; units: number }>;
  serials_tracked: number;
}

export interface ProductBarcode {
  id: string;
  product_name: string;
  sku: string;
  barcode: string;
  format: string | null;
  selling_price: number | null;
  image_url: string | null;
  category_name: string | null;
}


// â”€â”€â”€ CRM Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FiscalYear {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Currency {
  id: string;
  tenant_id: string;
  code: string;
  symbol: string;
  exchange_rate: number;
  decimal_places: number;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaxConfiguration {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  tax_type: string;
  rate_percent: number;
  components: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTerm {
  id: string;
  tenant_id: string;
  name: string;
  days: number;
  credit_limit: number | null;
  late_fee_percent: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CostCenter {
  id: string;
  tenant_id: string;
  department_id: string;
  code: string;
  name: string;
  budget_amount: number;
  expense_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NumberSeries {
  id: string;
  tenant_id: string;
  company_id: string;
  module_name: string;
  prefix: string;
  current_number: number;
  padding: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// â”€â”€â”€ Audit Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  module: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

// â”€â”€â”€ HRMS Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Employee {
  id: string;
  tenant_id: string;
  user_id: string | null;
  company_id: string;
  branch_id: string | null;
  department_id: string | null;
  designation_id: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  date_of_joining: string | null;
  employment_type: string;
  sales_points?: number;
  gender: string | null;
  marital_status: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bank_account: string | null;
  ifsc_code: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  basic_salary: number | null;
  punch_method?: "GPS" | "Biometric" | "Face" | "Web" | "Manual" | string;
  biometric_pin?: string | null;
  nfc_card_number?: string | null;
  status: string;
  manager_id: string | null;
  role_id?: string | null;
  role_name?: string | null;
  created_at: string;
  updated_at: string;
  temporary_password?: string;
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  hours_worked: number | null;
  overtime_hours: number | null;
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  method?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSettings {
  branch_id?: string | null;
  branch_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number;
  enforce_geofence?: boolean;
  allowed_punch_methods?: string[];
  shift_start_time?: string;
  shift_end_time?: string;
  grace_period_minutes?: number;
  half_day_hours?: number;
  ip_whitelist?: string;
  assigned_employee_ids?: string[];
}

export interface AttendanceScheme {
  id: string;
  tenant_id?: string;
  company_id?: string | null;
  branch_id?: string | null;
  name: string;
  code?: string | null;
  description?: string | null;
  shift_start_time?: string;
  shift_end_time?: string;
  grace_period_minutes?: number;
  half_day_hours?: number;
  full_day_hours?: number;
  overtime_allowed?: boolean;
  overtime_min_minutes?: number;
  working_days?: string[];
  latitude?: number | null;
  longitude?: number | null;
  geofence_radius_meters?: number;
  enforce_geofence?: boolean;
  allowed_punch_methods?: string[];
  ip_whitelist?: string | null;
  is_default?: boolean;
  status?: string;
  assigned_employees_count?: number;
  assigned_employee_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeAttendanceSchemeAssignment {
  id?: string;
  scheme_id: string;
  scheme_name?: string;
  scheme_code?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  is_primary?: boolean;
  days_of_week?: string[];
  effective_from?: string;
  effective_to?: string;
}

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string | null;
  department?: string | null;
  leave_type: string;
  from_date: string;
  to_date: string;
  days_requested: number;
  reason: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayslipTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_type: "predefined" | "custom";
  is_default: boolean;
  theme_config?: {
    primary_color?: string;
    accent_color?: string;
    background_color?: string;
    header_style?: string;
    border_style?: string;
    font_family?: string;
  };
  header_config?: {
    title_text?: string;
    subtitle_text?: string;
    show_logo?: boolean;
    show_gstin?: boolean;
    show_cin?: boolean;
    show_address?: boolean;
    show_contact?: boolean;
  };
  fields_config?: {
    show_employee_code?: boolean;
    show_department?: boolean;
    show_designation?: boolean;
    show_bank_details?: boolean;
    show_pan?: boolean;
    show_uan?: boolean;
    show_worked_days?: boolean;
  };
  notes_config?: {
    compliance_notes?: string;
    disclaimer_text?: string;
    signatory_label?: string;
    stamp_text?: string;
  };
  created_at?: string;
}

export interface Payslip {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  month: number;
  year: number;
  basic_salary: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  gross_salary: number;
  net_salary: number;
  status: string;
  pdf_url?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}

// â”€â”€â”€ HTTP Core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

async function parseError(res: Response): Promise<string> {
  let detail = res.statusText;
  try {
    const json = await res.json();
    if (typeof json.detail === "string") detail = json.detail;
    else if (Array.isArray(json.detail))
      detail = (json.detail as { msg: string }[]).map((i) => i.msg).join(", ");
    else if (json.message) detail = json.message as string;
  } catch {
    /* ignore */
  }
  return detail;
}

// In-Memory API Cache for instant tab switching with 0ms delay
const apiGetCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const GET_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    apiGetCache.clear();
    return;
  }
  for (const key of apiGetCache.keys()) {
    if (key.includes(prefix)) {
      apiGetCache.delete(key);
    }
  }
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Automatically attach tenant impersonation and workspace header
  try {
    const storedTenant = localStorage.getItem("bos-tenant");
    if (storedTenant) {
      const parsed = JSON.parse(storedTenant);
      const targetTenantId = parsed.raw?.tenant_id || parsed.tenant_id;
      if (targetTenantId) {
        headers["X-Impersonate-Tenant"] = targetTenantId;
        headers["X-Tenant-Id"] = targetTenantId;
      }
      const companyId = parsed.id || parsed.company_id || parsed.raw?.id;
      if (companyId) {
        headers["X-Company-Id"] = companyId;
        headers["X-Workspace-Id"] = companyId;
      }
    }
  } catch {
    // ignore
  }

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  // Handle in-memory cache for GET requests
  if (method.toUpperCase() === "GET") {
    const cacheKey = `${headers["X-Impersonate-Tenant"] || ""}:${headers["X-Company-Id"] || ""}:${url}`;
    const cached = apiGetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GET_CACHE_TTL_MS) {
      try {
        return typeof structuredClone === "function" ? structuredClone(cached.data) : JSON.parse(JSON.stringify(cached.data));
      } catch {
        return cached.data;
      }
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(url, { method, headers });
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("bos-auth");
            window.location.href = "/login";
          }
          const msg = await parseError(res);
          const error: any = new Error(msg);
          error.status = res.status;
          throw error;
        }
        if (res.status === 204) return undefined as T;
        const data = (await res.json()) as T;
        apiGetCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  // If mutation (POST, PUT, PATCH, DELETE), invalidate the cache
  clearApiCache();

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("bos-auth");
      window.location.href = "/login";
    }
    const msg = await parseError(res);
    const error: any = new Error(msg);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestBlob(
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const storedTenant = localStorage.getItem("bos-tenant");
    if (storedTenant) {
      const parsed = JSON.parse(storedTenant);
      const targetTenantId = parsed.raw?.tenant_id || parsed.tenant_id;
      if (targetTenantId) {
        headers["X-Impersonate-Tenant"] = targetTenantId;
        headers["X-Tenant-Id"] = targetTenantId;
      }
      const companyId = parsed.id || parsed.company_id || parsed.raw?.id;
      if (companyId) {
        headers["X-Company-Id"] = companyId;
        headers["X-Workspace-Id"] = companyId;
      }
    }
  } catch {
    // ignore
  }

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += `?${qs}`;
  }

  let res = await fetch(url, {
    method,
    headers,
  });

  if (!res.ok && path.includes("/hrms/payslips/")) {
    const publicPath = path.replace("/hrms/payslips/", "/hrms/public/payslips/");
    let pubUrl = `${API_BASE_URL}${publicPath}`;
    if (params) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
      }
      const qs = sp.toString();
      if (qs) pubUrl += `?${qs}`;
    }
    try {
      const pubRes = await fetch(pubUrl, { method, headers });
      if (pubRes.ok) {
        res = pubRes;
      }
    } catch {
      // ignore
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("bos-auth");
      window.location.href = "/login";
    }
    const msg = await parseError(res);
    const error: any = new Error(msg || "Failed to download document");
    error.status = res.status;
    throw error;
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let filename = "Payslip.pdf";
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  return { blob, filename };
}

// â”€â”€â”€ ERP â€” Companies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const companiesApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<Company>>("GET", "/erp/companies", undefined, {
      page,
      page_size: pageSize,
      search,
    }),
  get: (id: string) => request<Company>("GET", `/erp/companies/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Company>("POST", "/erp/companies", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Company>("PATCH", `/erp/companies/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/companies/${id}`),
  testGspConnection: (payload: { module: string; credentials?: any }) =>
    request<{ success: boolean; message: string; module: string; token_preview?: string; client_id?: string; gstin?: string; timestamp?: string }>(
      "POST",
      "/erp/companies/test-gsp-connection",
      payload
    ),
  testSmtpConnection: (payload: { credentials?: any; recipient_email?: string; company_id?: string }) =>
    request<{ success: boolean; message?: string; error?: string }>(
      "POST",
      "/erp/companies/test-smtp",
      payload
    ),
};

// â”€â”€â”€ ERP â€” Branches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const branchesApi = {
  list: (page = 1, pageSize = 20, search?: string, companyId?: string) =>
    request<PaginatedResponse<Branch>>("GET", "/erp/branches", undefined, {
      page,
      page_size: pageSize,
      search,
      company_id: companyId,
    }),
  get: (id: string) => request<Branch>("GET", `/erp/branches/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Branch>("POST", "/erp/branches", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Branch>("PATCH", `/erp/branches/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/branches/${id}`),
};

// â”€â”€â”€ ERP â€” Departments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const departmentsApi = {
  list: (page = 1, pageSize = 50, companyId?: string) =>
    request<PaginatedResponse<Department>>("GET", "/erp/departments", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<Department>("GET", `/erp/departments/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Department>("POST", "/erp/departments", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Department>("PATCH", `/erp/departments/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/departments/${id}`),
};

// â”€â”€â”€ ERP â€” Designations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const designationsApi = {
  list: (page = 1, pageSize = 50, companyId?: string) =>
    request<PaginatedResponse<Designation>>("GET", "/erp/designations", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<Designation>("GET", `/erp/designations/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Designation>("POST", "/erp/designations", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Designation>("PATCH", `/erp/designations/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/designations/${id}`),
};

// â”€â”€â”€ ERP â€” Regions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const regionsApi = {
  list: (page = 1, pageSize = 50, companyId?: string) =>
    request<PaginatedResponse<Region>>("GET", "/erp/regions", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<Region>("GET", `/erp/regions/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Region>("POST", "/erp/regions", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Region>("PATCH", `/erp/regions/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/regions/${id}`),
};

// â”€â”€â”€ ERP â€” Zones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const zonesApi = {
  list: (page = 1, pageSize = 50, regionId?: string) =>
    request<PaginatedResponse<Zone>>("GET", "/erp/zones", undefined, {
      page,
      page_size: pageSize,
      region_id: regionId,
    }),
  get: (id: string) => request<Zone>("GET", `/erp/zones/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Zone>("POST", "/erp/zones", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Zone>("PATCH", `/erp/zones/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/zones/${id}`),
};

// â”€â”€â”€ ERP â€” Teams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const teamsApi = {
  list: (page = 1, pageSize = 50, departmentId?: string, companyId?: string) =>
    request<PaginatedResponse<Team>>("GET", "/erp/teams", undefined, {
      page,
      page_size: pageSize,
      department_id: departmentId,
      company_id: companyId,
    }),
  get: (id: string) => request<Team>("GET", `/erp/teams/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Team>("POST", "/erp/teams", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Team>("PATCH", `/erp/teams/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/teams/${id}`),
};

// â”€â”€â”€ ERP â€” Business Units â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const businessUnitsApi = {
  list: (page = 1, pageSize = 50, companyId?: string) =>
    request<PaginatedResponse<BusinessUnit>>("GET", "/erp/business-units", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<BusinessUnit>("GET", `/erp/business-units/${id}`),
  create: (data: Record<string, unknown>) =>
    request<BusinessUnit>("POST", "/erp/business-units", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<BusinessUnit>("PATCH", `/erp/business-units/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/business-units/${id}`),
};

// ─── ERP — Roles & Access Control ──────────────────────────────────────────

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system?: boolean;
  status?: string;
  permissions?: any[];
}

export const rolesApi = {
  list: (page = 1, pageSize = 100) =>
    request<PaginatedResponse<Role>>("GET", "/erp/roles", undefined, {
      page,
      page_size: pageSize,
    }),
  get: (id: string) => request<Role>("GET", `/erp/roles/${id}`),
  create: (data: Record<string, unknown>) => request<Role>("POST", "/erp/roles", data),
  update: (id: string, data: Record<string, unknown>) => request<Role>("PATCH", `/erp/roles/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/roles/${id}`),
};

// â”€â”€â”€ Financial â€” Fiscal Years â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const fiscalYearsApi = {
  list: (page = 1, pageSize = 20, companyId?: string) =>
    request<PaginatedResponse<FiscalYear>>("GET", "/erp/fiscal-years", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<FiscalYear>("GET", `/erp/fiscal-years/${id}`),
  create: (data: Record<string, unknown>) =>
    request<FiscalYear>("POST", "/erp/fiscal-years", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<FiscalYear>("PATCH", `/erp/fiscal-years/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/fiscal-years/${id}`),
};

// â”€â”€â”€ Financial â€” Currencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const currenciesApi = {
  list: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Currency>>("GET", "/erp/currencies", undefined, {
      page,
      page_size: pageSize,
    }),
  get: (id: string) => request<Currency>("GET", `/erp/currencies/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Currency>("POST", "/erp/currencies", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Currency>("PATCH", `/erp/currencies/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/currencies/${id}`),
};

// â”€â”€â”€ Financial â€” Tax Configurations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const taxConfigurationsApi = {
  list: (page = 1, pageSize = 50, companyId?: string) =>
    request<PaginatedResponse<TaxConfiguration>>("GET", "/erp/tax-configurations", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
    }),
  get: (id: string) => request<TaxConfiguration>("GET", `/erp/tax-configurations/${id}`),
  create: (data: Record<string, unknown>) =>
    request<TaxConfiguration>("POST", "/erp/tax-configurations", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<TaxConfiguration>("PATCH", `/erp/tax-configurations/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/tax-configurations/${id}`),
};

// â”€â”€â”€ Financial â€” Payment Terms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const paymentTermsApi = {
  list: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<PaymentTerm>>("GET", "/erp/payment-terms", undefined, {
      page,
      page_size: pageSize,
    }),
  get: (id: string) => request<PaymentTerm>("GET", `/erp/payment-terms/${id}`),
  create: (data: Record<string, unknown>) =>
    request<PaymentTerm>("POST", "/erp/payment-terms", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<PaymentTerm>("PATCH", `/erp/payment-terms/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/payment-terms/${id}`),
};

// â”€â”€â”€ Financial â€” Cost Centers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const costCentersApi = {
  list: (page = 1, pageSize = 50, departmentId?: string) =>
    request<PaginatedResponse<CostCenter>>("GET", "/erp/cost-centers", undefined, {
      page,
      page_size: pageSize,
      department_id: departmentId,
    }),
  get: (id: string) => request<CostCenter>("GET", `/erp/cost-centers/${id}`),
  create: (data: Record<string, unknown>) =>
    request<CostCenter>("POST", "/erp/cost-centers", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<CostCenter>("PATCH", `/erp/cost-centers/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/cost-centers/${id}`),
};

// â”€â”€â”€ Financial â€” Number Series â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const numberSeriesApi = {
  list: (page = 1, pageSize = 50, companyId?: string, search?: string) =>
    request<PaginatedResponse<NumberSeries>>("GET", "/erp/number-series", undefined, {
      page,
      page_size: pageSize,
      company_id: companyId,
      search: search,
    }),
  peekNextNumber: (module: string, companyId?: string, prefix?: string) =>
    request<{
      series_id: string | null;
      module_name: string;
      prefix: string;
      current_number: number;
      next_number: number;
      padding: number;
      formatted_number: string;
      configured: boolean;
    }>("GET", "/erp/number-series/next-number", undefined, {
      module,
      company_id: companyId,
      prefix,
    }),
  get: (id: string) => request<NumberSeries>("GET", `/erp/number-series/${id}`),
  create: (data: Record<string, unknown>) =>
    request<NumberSeries>("POST", "/erp/number-series", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<NumberSeries>("PATCH", `/erp/number-series/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/number-series/${id}`),
};

// â”€â”€â”€ Audit Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const auditLogsApi = {
  list: (
    page = 1,
    pageSize = 50,
    filters?: {
      module?: string;
      action?: string;
      entity_type?: string;
      user_id?: string;
    },
  ) =>
    request<PaginatedResponse<AuditLog>>("GET", "/erp/audit-logs", undefined, {
      page,
      page_size: pageSize,
      ...filters,
    }),
};

// â”€â”€â”€ HRMS â€” Employees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface EmployeeVCard {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string;
  company_name: string;
  department?: string;
  designation?: string;
  status: string;
  date_of_joining?: string;
  vcard_raw: string;
  qr_code_data_url: string;
  filename: string;
}

export const employeesApi = {
  list: (page = 1, pageSize = 20, search?: string, companyId?: string, departmentId?: string, status?: string, role?: string) =>
    request<PaginatedResponse<Employee>>("GET", "/hrms/employees", undefined, {
      page,
      page_size: pageSize,
      search,
      company_id: companyId,
      department_id: departmentId,
      status,
      role,
    }),
  getMe: () => request<Employee>("GET", "/hrms/employees/me"),
  get: (id: string) => request<Employee>("GET", `/hrms/employees/${id}`),
  getVCard: (empId: string) =>
    request<EmployeeVCard>("GET", `/hrms/employees/${empId}/vcard`),
  getVCardDownloadUrl: (empId: string) =>
    `/api/v1/hrms/employees/${empId}/vcard/download`,
  getBulkExportVCardUrl: () =>
    `/api/v1/hrms/employees/vcard/bulk-export`,
  create: (data: Record<string, unknown>) =>
    request<Employee>("POST", "/hrms/employees", data),
  bulkCreate: (employees: Record<string, unknown>[]) =>
    request<{ message: string; created_count: number; skipped_count: number; errors: string[] }>("POST", "/hrms/employees/bulk", { employees }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Employee>("PATCH", `/hrms/employees/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/hrms/employees/${id}`),
  listDocuments: (empId: string) =>
    request<EmployeeDocument[]>("GET", `/hrms/employees/${empId}/documents`),
  createDocument: (empId: string, data: Record<string, unknown>) =>
    request<EmployeeDocument>("POST", `/hrms/employees/${empId}/documents`, data),
  addSalesPoints: (empId: string, points: number) =>
    request<Employee>("POST", `/hrms/employees/${empId}/add-points`, undefined, { points }),
};

export async function fetchSalesEmployees(): Promise<Employee[]> {
  try {
    const salesRes = await employeesApi.list(1, 100, undefined, undefined, undefined, "Active", "sales");
    if (salesRes?.items && salesRes.items.length > 0) {
      return salesRes.items;
    }
    const allRes = await employeesApi.list(1, 100, undefined, undefined, undefined, "Active");
    return allRes?.items || [];
  } catch (err) {
    console.error("Failed to fetch sales employees:", err);
    return [];
  }
}

// â”€â”€â”€ HRMS â€” Attendance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const attendanceApi = {
  list: (page = 1, pageSize = 50, employeeId?: string, dateFrom?: string, dateTo?: string) =>
    request<PaginatedResponse<AttendanceRecord>>("GET", "/hrms/attendance", undefined, {
      page,
      page_size: pageSize,
      employee_id: employeeId,
      date_from: dateFrom,
      date_to: dateTo,
    }),
  create: (data: Record<string, unknown>) =>
    request<AttendanceRecord>("POST", "/hrms/attendance", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<AttendanceRecord>("PATCH", `/hrms/attendance/${id}`, data),
  checkIn: (data: { employee_id?: string; latitude?: number; longitude?: number; notes?: string; method: string }) =>
    request<AttendanceRecord>("POST", "/hrms/attendance/check-in", data),
  checkOut: (data: { employee_id?: string; latitude?: number; longitude?: number; notes?: string }) =>
    request<AttendanceRecord>("POST", "/hrms/attendance/check-out", data),
  delete: (id: string) =>
    request<any>("DELETE", `/hrms/attendance/${id}`),
  getStats: () =>
    request<HrmsDashboardStats>("GET", "/hrms/attendance/stats"),
  listBiometric: () =>
    request<BiometricDevice[]>("GET", "/hrms/attendance/biometric"),
  createBiometric: (data: { device_code: string; location: string; model: string; enrolled_employees?: number; status?: string }) =>
    request<BiometricDevice>("POST", "/hrms/attendance/biometric", data),
  deleteBiometric: (id: string) =>
    request<any>("DELETE", `/hrms/attendance/biometric/${id}`),
  syncBiometric: () =>
    request<{ message: string }>("POST", "/hrms/attendance/biometric/sync"),
  listFaceLogs: () =>
    request<FaceRecognitionLog[]>("GET", "/hrms/attendance/face-logs"),
  createFaceLog: (data: { employee_id: string; confidence: number; location: string; action: string; status: string }) =>
    request<FaceRecognitionLog>("POST", "/hrms/attendance/face-logs", data),
  listCorrections: () =>
    request<AttendanceCorrection[]>("GET", "/hrms/attendance/corrections"),
  createCorrection: (data: Record<string, unknown>) =>
    request<AttendanceCorrection>("POST", "/hrms/attendance/corrections", data),
  reviewCorrection: (id: string, status: string) =>
    request<AttendanceCorrection>("PATCH", `/hrms/attendance/corrections/${id}/review`, { status }),
  getSettings: (branchId?: string, employeeId?: string) =>
    request<AttendanceSettings>("GET", "/hrms/attendance/settings", undefined, { branch_id: branchId, employee_id: employeeId }),
  updateSettings: (data: AttendanceSettings) =>
    request<AttendanceSettings>("POST", "/hrms/attendance/settings", data),
  listSchemes: (companyId?: string) =>
    request<AttendanceScheme[]>("GET", "/hrms/attendance/schemes", undefined, { company_id: companyId }),
  createScheme: (data: Partial<AttendanceScheme>) =>
    request<AttendanceScheme>("POST", "/hrms/attendance/schemes", data),
  updateScheme: (id: string, data: Partial<AttendanceScheme>) =>
    request<AttendanceScheme>("PATCH", `/hrms/attendance/schemes/${id}`, data),
  deleteScheme: (id: string) =>
    request<{ message: string }>("DELETE", `/hrms/attendance/schemes/${id}`),
  assignEmployeesToScheme: (data: { scheme_id: string; employee_ids: string[]; punch_method?: string }) =>
    request<{ message: string; scheme_id: string; scheme_name: string; assigned_count: number }>("POST", "/hrms/attendance/schemes/assign", data),
  assignMultiScheme: (schemeId: string, assignments: Array<{ employee_id: string; is_primary?: boolean; days_of_week?: string[]; effective_from?: string; effective_to?: string; punch_method?: string }>) =>
    request<{ message: string; scheme_id: string; assigned_count: number }>("POST", `/hrms/attendance/schemes/${schemeId}/assign`, { employee_assignments: assignments }),
  unassignFromScheme: (schemeId: string, employeeIds: string[]) =>
    request<{ message: string; scheme_id: string; unassigned_count: number }>("POST", `/hrms/attendance/schemes/${schemeId}/unassign`, { employee_ids: employeeIds }),
  getEmployeeSchemes: (employeeId: string) =>
    request<{ employee_id: string; schemes: EmployeeAttendanceSchemeAssignment[] }>("GET", `/hrms/attendance/employees/${employeeId}/schemes`),
};

export const attendanceSchemesApi = {
  list: (companyId?: string) =>
    request<AttendanceScheme[]>("GET", "/hrms/attendance/schemes", undefined, { company_id: companyId }),
  get: (id: string) =>
    request<AttendanceScheme>("GET", `/hrms/attendance/schemes/${id}`),
  create: (data: Partial<AttendanceScheme>) =>
    request<AttendanceScheme>("POST", "/hrms/attendance/schemes", data),
  update: (id: string, data: Partial<AttendanceScheme>) =>
    request<AttendanceScheme>("PATCH", `/hrms/attendance/schemes/${id}`, data),
  delete: (id: string) =>
    request<{ message: string }>("DELETE", `/hrms/attendance/schemes/${id}`),
  assign: (id: string, data: { employee_assignments: Array<{ employee_id: string; is_primary?: boolean; days_of_week?: string[]; effective_from?: string; effective_to?: string; punch_method?: string }> }) =>
    request<{ message: string; scheme_id: string; assigned_count: number }>("POST", `/hrms/attendance/schemes/${id}/assign`, data),
  unassign: (id: string, employee_ids: string[]) =>
    request<{ message: string; scheme_id: string; unassigned_count: number }>("POST", `/hrms/attendance/schemes/${id}/unassign`, { employee_ids }),
  getEmployeeSchemes: (employeeId: string) =>
    request<{ employee_id: string; schemes: EmployeeAttendanceSchemeAssignment[] }>("GET", `/hrms/attendance/employees/${employeeId}/schemes`),
};

// â”€â”€â”€ HRMS â€” Leaves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const leavesApi = {
  list: (page = 1, pageSize = 20, employeeId?: string, status?: string) =>
    request<PaginatedResponse<LeaveRequest>>("GET", "/hrms/leaves", undefined, {
      page,
      page_size: pageSize,
      employee_id: employeeId,
      status_filter: status,
    }),
  listBalances: (employeeId?: string) =>
    request<LeaveBalance[]>("GET", "/hrms/leaves/balances", undefined, { employee_id: employeeId }),
  listPolicies: () =>
    request<LeavePolicy[]>("GET", "/hrms/leaves/policies"),
  createPolicy: (data: Record<string, unknown>) =>
    request<LeavePolicy>("POST", "/hrms/leaves/policies", data),
  get: (id: string) => request<LeaveRequest>("GET", `/hrms/leaves/${id}`),
  create: (data: Record<string, unknown>) =>
    request<LeaveRequest>("POST", "/hrms/leaves", data),
  approve: (id: string) => request<LeaveRequest>("PATCH", `/hrms/leaves/${id}/review`, { status: "Approved" }),
  reject: (id: string, reason?: string) =>
    request<LeaveRequest>("PATCH", `/hrms/leaves/${id}/review`, { status: "Rejected" }),
};

// â”€â”€â”€ HRMS â€” Payroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const payrollApi = {
  listPayslips: (employeeId?: string) =>
    request<Payslip[]>("GET", "/hrms/payslips", undefined, {
      employee_id: employeeId,
    }),
  listSalaryStructures: () =>
    request<SalaryStructure[]>("GET", "/hrms/salary-structures"),
  createSalaryStructure: (data: Record<string, unknown>) =>
    request<SalaryStructure>("POST", "/hrms/salary-structures", data),
  listPayGrades: () =>
    request<PayGrade[]>("GET", "/hrms/payroll/grades"),
  createPayGrade: (data: Record<string, unknown>) =>
    request<PayGrade>("POST", "/hrms/payroll/grades", data),
  generatePayslip: (data: Record<string, unknown>) =>
    request<Payslip[]>("POST", "/hrms/payslips/process", data),
  processBatchPayslips: (data: { month: number; year: number; status?: string }) =>
    request<Payslip[]>("POST", "/hrms/payslips/process-batch", data),
  getPayslip: (id: string) =>
    request<Payslip>("GET", `/hrms/payslips/${id}`),
  downloadPayslipPdf: (id: string, tenantId?: string) =>
    requestBlob("GET", `/hrms/payslips/${id}/pdf`, tenantId ? { tenant_id: tenantId } : undefined),
  getPublicPayslip: (id: string) =>
    request<Payslip>("GET", `/hrms/public/payslips/${id}`),
  listTemplates: () =>
    request<PayslipTemplate[]>("GET", "/hrms/payroll/templates"),
  getActiveTemplate: () =>
    request<PayslipTemplate>("GET", "/hrms/payroll/templates/active"),
  getPublicActiveTemplate: (tenantId?: string) =>
    request<PayslipTemplate>("GET", "/hrms/payroll/public/templates/active", undefined, tenantId ? { tenant_id: tenantId } : undefined),
  createTemplate: (data: Partial<PayslipTemplate>) =>
    request<PayslipTemplate>("POST", "/hrms/payroll/templates", data),
  updateTemplate: (id: string, data: Partial<PayslipTemplate>) =>
    request<PayslipTemplate>("PUT", `/hrms/payroll/templates/${id}`, data),
  deleteTemplate: (id: string) =>
    request<{ message: string }>("DELETE", `/hrms/payroll/templates/${id}`),
  setDefaultTemplate: (id: string) =>
    request<{ message: string; template_id: string }>("POST", `/hrms/payroll/templates/${id}/set-default`),

  // Loans, Advances, Bonuses & Commissions
  listLoans: () =>
    request<any[]>("GET", "/hrms/payroll/loans"),
  createLoan: (data: any) =>
    request<{ message: string; id: string }>("POST", "/hrms/payroll/loans", data),
  updateLoanStatus: (id: string, status: string) =>
    request<{ message: string; status: string }>("PATCH", `/hrms/payroll/loans/${id}/status`, { status }),

  listAdvances: () =>
    request<any[]>("GET", "/hrms/payroll/advances"),
  createAdvance: (data: any) =>
    request<{ message: string; id: string }>("POST", "/hrms/payroll/advances", data),
  updateAdvanceStatus: (id: string, status: string) =>
    request<{ message: string; status: string }>("PATCH", `/hrms/payroll/advances/${id}/status`, { status }),

  listBonuses: () =>
    request<any[]>("GET", "/hrms/payroll/bonuses"),
  createBonus: (data: any) =>
    request<{ message: string; id: string }>("POST", "/hrms/payroll/bonuses", data),
  updateBonusStatus: (id: string, status: string) =>
    request<{ message: string; status: string }>("PATCH", `/hrms/payroll/bonuses/${id}/status`, { status }),

  listCommissions: () =>
    request<any[]>("GET", "/hrms/payroll/commissions"),
  createCommission: (data: any) =>
    request<{ message: string; id: string }>("POST", "/hrms/payroll/commissions", data),
  updateCommissionStatus: (id: string, status: string) =>
    request<{ message: string; status: string }>("PATCH", `/hrms/payroll/commissions/${id}/status`, { status }),
  getCommissionSlabPlan: () =>
    request<{
      id: string;
      name: string;
      calculation_mode: string;
      slabs: any[];
      milestone_bonus_enabled: boolean;
      milestone_bonus_amount: number;
      notes?: string;
    }>("GET", "/hrms/payroll/commission-slabs"),
  saveCommissionSlabPlan: (data: any) =>
    request<{ message: string }>("PUT", "/hrms/payroll/commission-slabs", data),
  getRepPerformance: (employeeId: string, month = 7, year = 2026) =>
    request<{
      employee_id: string;
      employee_name: string;
      employee_code: string;
      period_month: number;
      period_year: number;
      target_quota: number;
      achieved_volume: number;
      crm_revenue: number;
      crm_deals_count: number;
      pos_revenue: number;
      pos_tx_count: number;
      summary: string;
    }>("GET", `/hrms/payroll/rep-performance/${employeeId}`, undefined, { month, year }),

  getAttendanceSheet: (month = 7, year = 2026) =>
    request<{ month: number; year: number; days_in_month: number; total_employees: number; records: any[] }>(
      "GET",
      "/hrms/payroll/attendance-sheet",
      undefined,
      { month, year }
    ),
  syncAttendanceSheet: (data: { month: number; year: number; records: any[] }) =>
    request<{ message: string; month: number; year: number; records_synced: number }>(
      "POST",
      "/hrms/payroll/sync-attendance-sheet",
      data
    ),
  processBatchPayroll: (data: { month: number; year: number; status?: string; employee_ids?: string[] }) =>
    request<Payslip[]>("POST", "/hrms/payslips/process-batch", data),
  getEmployeePayrollHistory: (employeeId: string) =>
    request<{
      employee: {
        id: string;
        full_name: string;
        employee_code: string;
        email?: string;
        phone?: string;
        department: string;
        designation: string;
        joining_date?: string;
        status: string;
        base_salary: number;
      };
      summary: {
        total_runs: number;
        total_gross_paid: number;
        total_net_paid: number;
        total_deductions: number;
        avg_monthly_net: number;
      };
      history: Array<{
        id: string;
        month: number;
        year: number;
        period_label: string;
        basic_salary: number;
        hra: number;
        other_allowances: number;
        gross_salary: number;
        pf_deduction: number;
        esi_deduction: number;
        tds_deduction: number;
        other_deductions: number;
        total_deductions: number;
        net_salary: number;
        status: string;
        pdf_url?: string;
        created_at?: string;
      }>;
    }>("GET", `/hrms/payroll/employee-history/${employeeId}`),
};

// â”€â”€â”€ Workflow Engine Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ─── HRMS — Recruitment ──────────────────────────────────────────────────────

export interface JobOpening {
  id: string;
  tenant_id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  openings: number;
  applicants_count: number;
  posted_date: string;
  status: string;
  description: string;
  threshold_score: number;
  portals: string[];
  criteria: string;
  created_at: string;
  updated_at: string;
  provider?: string;
  provider_job_id?: string;
  sync_status?: string;
  last_synced?: string;
}

export interface Applicant {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string | null;
  job_id?: string | null;
  job_title: string;
  applied_date: string;
  experience: string;
  rating: number;
  stage: "Applied" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
  source: string;
  match_score: number;
  resume_text: string | null;
  expected_salary?: number;
  proposed_salary?: number;
  notice_period_days?: number;
  notes_json?: { author: string; date: string; text: string }[];
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: string;
  tenant_id: string;
  applicant_id: string;
  candidate: string;
  job_title: string;
  interviewer_name: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  mode: string;
  meeting_link: string | null;
  status: "Scheduled" | "Completed" | "Cancelled";
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  tenant_id: string;
  applicant_id?: string | null;
  employee_id?: string | null;
  candidate: string;
  candidate_email?: string | null;
  role: string;
  ctc: number;
  offer_date: string;
  expiry_date: string;
  joining_date: string;
  signer_name: string;
  status: "Awaiting Acceptance" | "Accepted" | "Declined" | "Rejected" | "Draft" | string;
  email_sent: boolean;
  custom_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTask {
  task: string;
  assignedTo: string;
  status: "Pending" | "In Progress" | "Done";
}

export interface Onboarding {
  id: string;
  tenant_id: string;
  applicant_id: string;
  new_hire: string;
  role: string;
  start_date: string;
  progress: number;
  tasks_json: OnboardingTask[];
  created_at: string;
  updated_at: string;
}

export const recruitmentApi = {
  // Job Openings
  listJobs: (status?: string, search?: string, page = 1, pageSize = 50) =>
    request<PaginatedResponse<JobOpening>>("GET", "/hrms/recruitment/jobs", undefined, {
      status, search, page, page_size: pageSize
    }),
  createJob: (data: Record<string, unknown>) =>
    request<JobOpening>("POST", "/hrms/recruitment/jobs", data),
  generateJd: (prompt: string) =>
    request<{ title: string; department: string; criteria: string; description: string; threshold_score: number }>(
      "POST",
      "/hrms/recruitment/jobs/generate-jd",
      { prompt }
    ),
  updateJob: (id: string, data: Record<string, unknown>) =>
    request<JobOpening>("PATCH", `/hrms/recruitment/jobs/${id}`, data),
  deleteJob: (id: string) =>
    request<void>("DELETE", `/hrms/recruitment/jobs/${id}`),

  // Applicants
  listApplicants: (jobId?: string, stage?: string, source?: string, search?: string, page = 1, pageSize = 50) =>
    request<PaginatedResponse<Applicant>>("GET", "/hrms/recruitment/applicants", undefined, {
      job_id: jobId, stage, source, search, page, page_size: pageSize
    }),
  createApplicant: (data: Record<string, unknown>) =>
    request<Applicant>("POST", "/hrms/recruitment/applicants", data),
  applyJob: (jobId: string, data: Record<string, unknown>) =>
    request<Applicant>("POST", `/hrms/recruitment/jobs/${jobId}/apply`, data),
  updateApplicant: (id: string, data: Record<string, unknown>) =>
    request<Applicant>("PATCH", `/hrms/recruitment/applicants/${id}`, data),
  addApplicantNote: (id: string, text: string) =>
    request<Applicant>("POST", `/hrms/recruitment/applicants/${id}/notes`, { text }),

  // Interviews
  listInterviews: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Interview>>("GET", "/hrms/recruitment/interviews", undefined, {
      page, page_size: pageSize
    }),
  checkOverlap: (interviewer: string, date: string, time: string, duration: number) =>
    request<{ conflict: boolean; candidate?: string; time?: string; duration?: number; detail?: string }>(
      "GET",
      "/hrms/recruitment/interviews/check-overlap",
      undefined,
      { interviewer, date, time, duration }
    ),
  scheduleInterview: (data: Record<string, unknown>) =>
    request<Interview>("POST", "/hrms/recruitment/interviews", data),
  updateInterview: (id: string, data: Record<string, unknown>) =>
    request<Interview>("PATCH", `/hrms/recruitment/interviews/${id}`, data),

  // Offers
  listOffers: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Offer>>("GET", "/hrms/recruitment/offers", undefined, {
      page, page_size: pageSize
    }),
  getOffer: (id: string) =>
    request<Offer>("GET", `/hrms/recruitment/offers/${id}`),
  getPublicOffer: (id: string) =>
    request<Offer>("GET", `/hrms/recruitment/public/offers/${id}`),
  createOffer: (data: Record<string, unknown>) =>
    request<Offer>("POST", "/hrms/recruitment/offers", data),
  updateOffer: (id: string, data: Record<string, unknown>) =>
    request<Offer>("PUT", `/hrms/recruitment/offers/${id}`, data),
  deleteOffer: (id: string) =>
    request<{ status: string; message: string; id: string }>("DELETE", `/hrms/recruitment/offers/${id}`),
  sendOfferEmail: (id: string) =>
    request<{ status: string; message: string }>("POST", `/hrms/recruitment/offers/${id}/send-email`),
  updateOfferStatus: (id: string, data: Record<string, unknown>) =>
    request<Offer>("PATCH", `/hrms/recruitment/offers/${id}`, data),
  startOnboarding: (id: string) =>
    request<Onboarding>("POST", `/hrms/recruitment/offers/${id}/start-onboarding`),

  // Onboardings
  listOnboardings: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Onboarding>>("GET", "/hrms/recruitment/onboarding", undefined, {
      page, page_size: pageSize
    }),
  createOnboarding: (data: Record<string, unknown>) =>
    request<Onboarding>("POST", "/hrms/recruitment/onboarding", data),
  updateOnboarding: (id: string, data: Record<string, unknown>) =>
    request<Onboarding>("PATCH", `/hrms/recruitment/onboarding/${id}`, data),
  deleteOnboarding: (id: string) =>
    request<void>("DELETE", `/hrms/recruitment/onboarding/${id}`),
};


export interface PerformanceGoal {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  employee_name: string;
  title: string;
  description: string | null;
  target_date: string;
  status: "Not Started" | "On Track" | "At Risk" | "Completed";
  weight: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceKpi {
  id: string;
  tenant_id: string;
  metric: string;
  target: string;
  current: string;
  unit: string;
  achievement: number;
}

export interface PerformanceAppraisal {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  period: string;
  self_score: number;
  manager_score: number;
  final_score: number;
  rating: string;
  reviewer: string;
  status: "Pending" | "In Progress" | "Completed";
  created_at: string;
  updated_at: string;
}

export interface PerformanceIncentive {
  id: string;
  tenant_id: string;
  employee_name: string;
  department: string;
  type: string;
  basis: string;
  amount: number;
  status: "Pending" | "Approved" | "Paid";
}

export interface LearningCourse {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  instructor: string;
  duration: string;
  enrolled: number;
  completion: number;
  status: string;
}

export interface LearningCertificate {
  id: string;
  tenant_id: string;
  employee_name: string;
  cert_name: string;
  issuer: string;
  issued_date: string;
  expiry_date: string;
  status: string;
}

export interface LearningAssessment {
  id: string;
  tenant_id: string;
  title: string;
  course_name: string;
  due_date: string;
  participants: number;
  avg_score: number;
  status: string;
}


export const performanceApi = {
  listGoals: (employeeId?: string, status?: string, page = 1, pageSize = 50) =>
    request<PaginatedResponse<PerformanceGoal>>("GET", "/hrms/performance/goals", undefined, {
      employee_id: employeeId, status, page, page_size: pageSize
    }),
  createGoal: (data: Record<string, unknown>) =>
    request<PerformanceGoal>("POST", "/hrms/performance/goals", data),
  updateGoal: (id: string, data: Record<string, unknown>) =>
    request<PerformanceGoal>("PATCH", `/hrms/performance/goals/${id}`, data),

  listKpis: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<PerformanceKpi>>("GET", "/hrms/performance/kpis", undefined, {
      page, page_size: pageSize
    }),
  createKpi: (data: Record<string, unknown>) =>
    request<PerformanceKpi>("POST", "/hrms/performance/kpis", data),

  listAppraisals: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<PerformanceAppraisal>>("GET", "/hrms/performance/appraisals", undefined, {
      page, page_size: pageSize
    }),
  createAppraisal: (data: Record<string, unknown>) =>
    request<PerformanceAppraisal>("POST", "/hrms/performance/appraisals", data),
  updateAppraisal: (id: string, data: Record<string, unknown>) =>
    request<PerformanceAppraisal>("PATCH", `/hrms/performance/appraisals/${id}`, data),

  listIncentives: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<PerformanceIncentive>>("GET", "/hrms/performance/incentives", undefined, {
      page, page_size: pageSize
    }),
  createIncentive: (data: Record<string, unknown>) =>
    request<PerformanceIncentive>("POST", "/hrms/performance/incentives", data),
};

export const learningApi = {
  listCourses: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<LearningCourse>>("GET", "/hrms/learning/courses", undefined, {
      page, page_size: pageSize
    }),
  createCourse: (data: Record<string, unknown>) =>
    request<LearningCourse>("POST", "/hrms/learning/courses", data),

  listCertificates: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<LearningCertificate>>("GET", "/hrms/learning/certificates", undefined, {
      page, page_size: pageSize
    }),
  createCertificate: (data: Record<string, unknown>) =>
    request<LearningCertificate>("POST", "/hrms/learning/certificates", data),

  listAssessments: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<LearningAssessment>>("GET", "/hrms/learning/assessments", undefined, {
      page, page_size: pageSize
    }),
  createAssessment: (data: Record<string, unknown>) =>
    request<LearningAssessment>("POST", "/hrms/learning/assessments", data),
};

export interface AttendanceDeptStats {
  dept: string;
  rate: number;
}

export interface AttendanceMethodStats {
  method: string;
  count: number;
  pct: number;
  color: string;
}

export interface AttendanceAnalytics {
  avg_attendance: number;
  today_presence: number;
  chronic_absentees: number;
  late_arrivals: number;
  dept_rates: AttendanceDeptStats[];
  method_rates: AttendanceMethodStats[];
}

export interface DeptPayrollCost {
  dept: string;
  headcount: number;
  totalPayroll: number;
  avgSalary: number;
  yoyChange: number;
}

export interface PayrollAnalytics {
  monthly_payroll: number;
  highest_dept: string;
  growth_yoy: string;
  dept_costs: DeptPayrollCost[];
}

export interface AtRiskEmployee {
  name: string;
  dept: string;
  riskScore: number;
  factors: string[];
  risk: "High" | "Medium";
}

export interface AttritionPrediction {
  at_risk: AtRiskEmployee[];
}

export interface ShiftOptimizationItem {
  shift: string;
  employees: number;
  optimal: number;
  coverage: number;
  efficiency: number;
}

export interface ShiftOptimization {
  shifts: ShiftOptimizationItem[];
}

export interface ProductivityItem {
  name: string;
  dept: string;
  score: number;
  trend: "up" | "down" | "stable";
  tasks: number;
  output: string;
}

export interface ProductivityScore {
  scores: ProductivityItem[];
}

export interface TrainingRecommendationItem {
  employee: string;
  dept: string;
  skill: string;
  reason: string;
  priority: "High" | "Medium";
}

export interface TrainingRecommendation {
  recommendations: TrainingRecommendationItem[];
}

export const intelligenceApi = {
  getAttendanceAnalytics: () =>
    request<AttendanceAnalytics>("GET", "/hrms/intelligence/attendance-analytics"),
  getPayrollAnalytics: () =>
    request<PayrollAnalytics>("GET", "/hrms/intelligence/payroll-analytics"),
  getAttritionPrediction: () =>
    request<AttritionPrediction>("GET", "/hrms/intelligence/attrition-risk"),
  getShiftOptimization: () =>
    request<ShiftOptimization>("GET", "/hrms/intelligence/shift-optimization"),
  getProductivityScore: () =>
    request<ProductivityScore>("GET", "/hrms/intelligence/productivity-score"),
  getTrainingRecommendation: () =>
    request<TrainingRecommendation>("GET", "/hrms/intelligence/training-recommendation"),
};


export interface ExitResignation {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  resign_date: string;
  last_working_day: string;
  reason: string;
  status: "Pending" | "Accepted" | "Rejected" | "Completed";
}

export interface ExitClearanceTask {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  task: string;
  status: "Pending" | "In Progress" | "Done";
  assigned_to: string;
}

export interface ExitFinalSettlement {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  last_working_day: string;
  components_json: { item: string; amount: number }[];
}

export interface ExitExperienceLetter {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string;
  designation: string;
  from_date: string;
  to_date: string;
  issued_on: string;
  status: "Pending" | "Issued";
}

export const exitApi = {
  listResignations: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<ExitResignation>>("GET", "/hrms/exit/resignations", undefined, {
      page, page_size: pageSize
    }),
  createResignation: (data: Record<string, unknown>) =>
    request<ExitResignation>("POST", "/hrms/exit/resignations", data),
  updateResignation: (id: string, data: Record<string, unknown>) =>
    request<ExitResignation>("PATCH", `/hrms/exit/resignations/${id}`, data),

  listClearance: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<ExitClearanceTask>>("GET", "/hrms/exit/clearance", undefined, {
      page, page_size: pageSize
    }),
  createClearance: (data: Record<string, unknown>) =>
    request<ExitClearanceTask>("POST", "/hrms/exit/clearance", data),
  updateClearance: (id: string, data: Record<string, unknown>) =>
    request<ExitClearanceTask>("PATCH", `/hrms/exit/clearance/${id}`, data),

  listSettlements: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<ExitFinalSettlement>>("GET", "/hrms/exit/settlements", undefined, {
      page, page_size: pageSize
    }),
  createSettlement: (data: Record<string, unknown>) =>
    request<ExitFinalSettlement>("POST", "/hrms/exit/settlements", data),

  listExperienceLetters: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<ExitExperienceLetter>>("GET", "/hrms/exit/experience-letters", undefined, {
      page, page_size: pageSize
    }),
  createExperienceLetter: (data: Record<string, unknown>) =>
    request<ExitExperienceLetter>("POST", "/hrms/exit/experience-letters", data),
  updateExperienceLetter: (id: string, data: Record<string, unknown>) =>
    request<ExitExperienceLetter>("PATCH", `/hrms/exit/experience-letters/${id}`, data),
};


// ─── Workflow Engine Types ────────────────────────────────────────────────────



// ─── Workflow Engine Types ────────────────────────────────────────────────────

export interface ApprovalWorkflow {
  id: string;
  tenant_id: string;
  company_id: string | null;
  name: string;
  module: string;
  description: string | null;
  steps: Record<string, unknown>[] | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  name: string;
  event: string;
  channel: string;
  subject: string | null;
  body: string | null;
  variables: string[] | null;
  is_active: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplate {
  id: string;
  tenant_id: string;
  name: string;
  document_type: string;
  format: string;
  description: string | null;
  template_content: string | null;
  variables: string[] | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  name: string;
  module: string;
  trigger_event: string;
  conditions: Record<string, unknown> | null;
  actions: Record<string, unknown>[] | null;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  tenant_id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  options: string[] | null;
  default_value: string | null;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Master Data Types ───────────────────────────────────────────────────────

export interface GeographyCountry {
  id: string;
  tenant_id: string;
  name: string;
  iso_code: string;
  phone_code: string | null;
  currency_code: string | null;
  states: Record<string, unknown>[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ERPLocation {
  id: string;
  tenant_id: string;
  company_id: string | null;
  branch_id: string | null;
  code: string;
  name: string;
  location_type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkCalendar {
  id: string;
  tenant_id: string;
  company_id: string | null;
  name: string;
  calendar_type: string;
  working_days: string[] | null;
  shifts: Record<string, unknown>[] | null;
  holidays: Record<string, unknown>[] | null;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  tenant_id: string;
  name: string;
  entity_type: string;
  color: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// â”€â”€â”€ System Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SystemSetting {
  id: string;
  tenant_id: string;
  key: string;
  value: string | null;
  category: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemHealthService {
  name: string;
  status: string;
  latency_ms: number | null;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  python_version: string;
  database: { status: string; latency_ms: number };
  tenant: { id: string; total_audit_logs: number };
  services: SystemHealthService[];
}

// â”€â”€â”€ Workflow Engine API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const approvalWorkflowsApi = {
  list: (page = 1, pageSize = 20, search?: string, module?: string) =>
    request<PaginatedResponse<ApprovalWorkflow>>("GET", "/erp/approval-workflows", undefined, {
      page, page_size: pageSize, search, module,
    }),
  get: (id: string) => request<ApprovalWorkflow>("GET", `/erp/approval-workflows/${id}`),
  create: (data: Record<string, unknown>) =>
    request<ApprovalWorkflow>("POST", "/erp/approval-workflows", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<ApprovalWorkflow>("PATCH", `/erp/approval-workflows/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/approval-workflows/${id}`),
};

export const notificationTemplatesApi = {
  list: (page = 1, pageSize = 20, search?: string, channel?: string) =>
    request<PaginatedResponse<NotificationTemplate>>("GET", "/erp/notification-templates", undefined, {
      page, page_size: pageSize, search, channel,
    }),
  get: (id: string) => request<NotificationTemplate>("GET", `/erp/notification-templates/${id}`),
  create: (data: Record<string, unknown>) =>
    request<NotificationTemplate>("POST", "/erp/notification-templates", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<NotificationTemplate>("PATCH", `/erp/notification-templates/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/notification-templates/${id}`),
};

export const documentTemplatesApi = {
  list: (page = 1, pageSize = 20, search?: string, documentType?: string) =>
    request<PaginatedResponse<DocumentTemplate>>("GET", "/erp/document-templates", undefined, {
      page, page_size: pageSize, search, document_type: documentType,
    }),
  get: (id: string) => request<DocumentTemplate>("GET", `/erp/document-templates/${id}`),
  create: (data: Record<string, unknown>) =>
    request<DocumentTemplate>("POST", "/erp/document-templates", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<DocumentTemplate>("PATCH", `/erp/document-templates/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/document-templates/${id}`),
};

export const automationRulesApi = {
  list: (page = 1, pageSize = 20, search?: string, module?: string) =>
    request<PaginatedResponse<AutomationRule>>("GET", "/erp/automation-rules", undefined, {
      page, page_size: pageSize, search, module,
    }),
  get: (id: string) => request<AutomationRule>("GET", `/erp/automation-rules/${id}`),
  create: (data: Record<string, unknown>) =>
    request<AutomationRule>("POST", "/erp/automation-rules", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<AutomationRule>("PATCH", `/erp/automation-rules/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/automation-rules/${id}`),
};

export const customFieldsApi = {
  list: (page = 1, pageSize = 50, search?: string, entityType?: string) =>
    request<PaginatedResponse<CustomField>>("GET", "/erp/custom-fields", undefined, {
      page, page_size: pageSize, search, entity_type: entityType,
    }),
  get: (id: string) => request<CustomField>("GET", `/erp/custom-fields/${id}`),
  create: (data: Record<string, unknown>) =>
    request<CustomField>("POST", "/erp/custom-fields", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<CustomField>("PATCH", `/erp/custom-fields/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/custom-fields/${id}`),
};

// â”€â”€â”€ Master Data API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const geographyApi = {
  list: (page = 1, pageSize = 50, search?: string) =>
    request<PaginatedResponse<GeographyCountry>>("GET", "/erp/geography", undefined, {
      page, page_size: pageSize, search,
    }),
  get: (id: string) => request<GeographyCountry>("GET", `/erp/geography/${id}`),
  create: (data: Record<string, unknown>) =>
    request<GeographyCountry>("POST", "/erp/geography", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<GeographyCountry>("PATCH", `/erp/geography/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/geography/${id}`),
};

export const locationsApi = {
  list: (page = 1, pageSize = 20, search?: string, companyId?: string, locationType?: string) =>
    request<PaginatedResponse<ERPLocation>>("GET", "/erp/locations", undefined, {
      page, page_size: pageSize, search, company_id: companyId, location_type: locationType,
    }),
  get: (id: string) => request<ERPLocation>("GET", `/erp/locations/${id}`),
  create: (data: Record<string, unknown>) =>
    request<ERPLocation>("POST", "/erp/locations", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<ERPLocation>("PATCH", `/erp/locations/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/locations/${id}`),
};

export const workCalendarsApi = {
  list: (page = 1, pageSize = 20, search?: string, companyId?: string) =>
    request<PaginatedResponse<WorkCalendar>>("GET", "/erp/work-calendars", undefined, {
      page, page_size: pageSize, search, company_id: companyId,
    }),
  get: (id: string) => request<WorkCalendar>("GET", `/erp/work-calendars/${id}`),
  create: (data: Record<string, unknown>) => request<WorkCalendar>("POST", "/erp/work-calendars", data),
  update: (id: string, data: Record<string, unknown>) => request<WorkCalendar>("PATCH", `/erp/work-calendars/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/work-calendars/${id}`),
};

export const tagsApi = {
  list: (page = 1, pageSize = 50, search?: string, entityType?: string) =>
    request<PaginatedResponse<Tag>>("GET", "/erp/tags", undefined, {
      page, page_size: pageSize, search, entity_type: entityType,
    }),
  get: (id: string) => request<Tag>("GET", `/erp/tags/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Tag>("POST", "/erp/tags", data),
  update: (id: string, data: Record<string, unknown>) =>
    request<Tag>("PATCH", `/erp/tags/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/erp/tags/${id}`),
};

// ─── System Administration API ────────────────────────────────────────────────

export const systemSettingsApi = {
  list: (category?: string) =>
    request<SystemSetting[]>("GET", "/erp/system-settings", undefined, { category }),
  batchUpdate: (settings: { key: string; value: string | null; category?: string; description?: string; is_public?: boolean }[]) =>
    request<SystemSetting[]>("PATCH", "/erp/system-settings", { settings }),
  upsert: (key: string, data: { value: string | null; category?: string; description?: string; is_public?: boolean }) =>
    request<SystemSetting>("PUT", `/erp/system-settings/${key}`, { key, ...data }),
};

export const systemHealthApi = {
  get: () => request<SystemHealth>("GET", "/erp/system-health"),
};

export const errorLogsApi = {
  list: (page = 1, pageSize = 20, module?: string) =>
    request<PaginatedResponse<Record<string, unknown>>>("GET", "/erp/error-logs", undefined, {
      page, page_size: pageSize, module,
    }),
};

export const backupApi = {
  getStatus: () => request<Record<string, unknown>>("GET", "/erp/backup-status"),
};

// ─── CRM & Sales — Customers and Leads ──────────────────────────────────────

export interface CustomerAddressItem {
  id: string;
  tag?: string; // "Head Office" | "Warehouse" | "Branch" | "Billing" | "Shipping" | "Home" | "Other"
  type?: "billing" | "shipping" | "both";
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gst_number?: string;
  contact_person?: string;
  contact_phone?: string;
  is_default_billing?: boolean;
  is_default_shipping?: boolean;
}

export interface CrmCustomer {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  whatsapp_number: string | null;
  company_name: string | null;
  contact_person?: string | null;
  customer_type: string;
  status: string;
  source: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  pincode?: string | null;
  gst_number: string | null;
  pan_number: string | null;
  date_of_birth: string | null;
  anniversary_date: string | null;
  gender: string | null;
  preferred_language: string | null;
  customer_code?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  website?: string | null;
  designation?: string | null;
  industry?: string | null;
  company_size?: string | null;
  annual_revenue?: number | null;
  customer_category?: string;
  lifecycle_stage?: string;
  referred_by?: string | null;
  gst_treatment?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  addresses?: CustomerAddressItem[];
  payment_terms?: string | null;
  credit_limit: number;
  outstanding_balance: number;
  lifetime_value: number;
  total_orders: number;
  total_returns?: number;
  average_order_value?: number;
  last_purchase_date?: string | null;
  first_purchase_date?: string | null;
  last_order_at?: string | null;
  loyalty_points_balance: number;
  loyalty_tier?: string | null;
  loyalty_tier_progress?: number;
  loyalty_points?: number;
  wallet_balance: number;
  wallet_lifetime_credited?: number;
  wallet_lifetime_debited?: number;
  preferred_currency?: string | null;
  preferred_channel: string | null;
  timezone?: string | null;
  sms_opt_in?: boolean;
  email_opt_in?: boolean;
  whatsapp_opt_in?: boolean;
  do_not_disturb?: boolean;
  do_not_contact?: boolean;
  marketing_opt_in: boolean;
  facebook_id?: string | null;
  instagram_handle?: string | null;
  twitter_handle?: string | null;
  linkedin_handle?: string | null;
  rfm_recency_days?: number | null;
  rfm_frequency_score?: number | null;
  rfm_monetary_score?: number | null;
  rfm_segment?: string | null;
  churn_risk_score?: number | null;
  rating?: number;
  tags: string[] | null;
  custom_fields?: Record<string, unknown> | null;
  notes: string | null;
  preferred_category?: string | null;
  assigned_segment_ids?: string[];
  membership_plan_id?: string | null;
  membership_status?: string | null;
  membership_end_at?: string | null;
  owner_user_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmLead {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
  source: string | null;
  owner_user_id: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  calls_count?: number;
  last_call_status?: string | null;
  last_call_sentiment?: string | null;
  estimated_value: number;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  call_disposition?: string | null;
  call_duration_minutes?: number | null;
  customer_response?: string | null;
  external_id?: string | null;
  external_source?: string | null;
  meta?: Record<string, any> | null;
  ai_score: number | null;
  ai_sentiment: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesExecutive {
  id: string;
  name: string;
  email: string;
  role_name?: string;
  active_leads_count: number;
  total_calls_count: number;
}

export interface CrmLeadActivity {
  id: string;
  lead_id?: string | null;
  opportunity_id?: string | null;
  activity_type: string;
  summary: string;
  call_disposition?: string | null;
  call_duration_minutes?: number | null;
  customer_response?: string | null;
  occurred_at: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMCallInitiateRequest {
  target_type: string;  // lead | customer | opportunity | deal | quotation | order | ticket | complaint
  target_id?: string | null;
  contact_name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  company_name?: string | null;
  agent_persona?: string;
  custom_prompt?: string | null;
  sip_number?: string | null;
  call_mode?: string;
}

export interface CRMCallInitiateResponse {
  call_id: string;
  status: string;
  room_name?: string | null;
  agent_greeting: string;
  contact_name: string;
  contact_phone?: string | null;
  agent_persona: string;
  battlecards: Array<{ topic: string; talking_point: string }>;
  message: string;
}

export interface CRMCallTurnMessage {
  speaker: 'AI' | 'User';
  text: string;
  timestamp?: string;
}

export interface CRMCallTurnRequest {
  call_id: string;
  user_speech: string;
  conversation_history: CRMCallTurnMessage[];
  agent_persona?: string;
  target_type?: string;
  contact_name?: string;
  company_name?: string | null;
  context_notes?: string | null;
}

export interface CRMCallTurnResponse {
  ai_response: string;
  detected_sentiment: string;
  confidence?: number;
  suggested_objection_handling?: string;
  recommended_action?: string;
}

export interface CRMCallCompleteRequest {
  call_id: string;
  duration_seconds: number;
  transcript: CRMCallTurnMessage[];
  final_sentiment: string;
  status?: string;
  auto_advance_stage?: boolean;
  new_stage_or_status?: string | null;
}

export interface CRMCallLog {
  id: string;
  tenant_id: string;
  target_type: string;
  target_id?: string | null;
  contact_name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  company_name?: string | null;
  status: string;
  direction: string;
  duration_seconds: number;
  agent_persona: string;
  call_mode: string;
  transcript?: Array<{ speaker: string; text: string; timestamp?: string }>;
  ai_summary?: string | null;
  sentiment?: string | null;
  qualification_score?: number | null;
  action_items?: string[];
  recording_url?: string | null;
  created_at: string;
}

export interface CRMCallStats {
  total_calls: number;
  connected_calls: number;
  avg_duration_seconds: number;
  positive_sentiment_rate: number;
  leads_contacted_count: number;
  opportunities_advanced: number;
}

export interface LeadAttribution {
  form_id: string;
  form_name: string | null;
  ad_id: string;
  adset_id: string;
  campaign_id: string;
  ad: { id: string; name: string; status: string; headline: string | null; lead_form_id: string | null } | null;
  adset: { id: string; name: string; status: string } | null;
  campaign: { id: string; name: string; status: string; objective: string } | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  source: string | null;
}

export interface OrganicPost {
  post_id: string;
  message: string;
  image_url: string | null;
  created_time: string;
  permalink_url: string | null;
  likes: number;
  reactions: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface FacebookAdItem {
  id: string;
  name: string;
  status: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  reach: string;
  frequency: string;
  image_url?: string | null;
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  start_time: string | null;
  stop_time: string | null;
  spend: string | null;
  impressions: string | null;
  clicks: string | null;
  ctr: string | null;
  reach: string | null;
  frequency: string | null;
  ad_image_url?: string | null;
  ad_name?: string;
  ads?: FacebookAdItem[];
}

export interface CustomerLedgerEntry {
  id: string;
  raw_id: string;
  parent_doc_id?: string;
  date: string;
  formatted_date: string;
  iso_date: string;
  type: "invoice" | "payment" | "credit_note" | "quotation";
  type_label: string;
  voucher_no: string;
  reference_no?: string;
  particulars: string;
  payment_mode: string;
  debit: number;
  credit: number;
  amount_paid: number;
  balance_due: number;
  running_balance: number;
  status: string;
  items_count: number;
  items: Array<{
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  quote_amount?: number;
}

export interface CustomerLedgerResponse {
  customer: {
    id: string;
    name: string;
    company_name: string;
    phone: string;
    email: string;
    gstin: string;
    pan_number: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    customer_type: string;
    status: string;
    credit_limit: number;
  };
  date_range: {
    start_date: string;
    end_date: string;
    is_custom: boolean;
  };
  summary: {
    opening_balance: number;
    total_invoiced: number;
    total_received: number;
    total_returns: number;
    closing_balance: number;
    net_receivable: number;
    net_payable: number;
    unpaid_invoices_count: number;
    total_transactions_count: number;
  };
  ledger_entries: CustomerLedgerEntry[];
}

export const crmCustomersApi = {
  list: (page = 1, pageSize = 20, search?: string, customerType?: string) =>
    request<PaginatedResponse<CrmCustomer>>("GET", "/crm/customers", undefined, { page, page_size: pageSize, search, customer_type: customerType }),
  create: (data: Record<string, unknown>) => request<CrmCustomer>("POST", "/crm/customers", data),
  update: (id: string, data: Record<string, unknown>) => request<CrmCustomer>("PATCH", `/crm/customers/${id}`, data),
  delete: (id: string) => request<{ status: string; message: string; deleted_id?: string }>("DELETE", `/crm/customers/${id}`),
  verifyGstin: (gstin: string) => request<any>("POST", "/crm/verify-gstin", { gstin }),
  bulkImport: (data: { customers: any[]; default_owner_user_id?: string | null }) =>
    request<{ success: boolean; imported_count: number; message: string }>("POST", "/crm/customers/bulk-import", data),
  getLedger: (
    customerId: string,
    params?: { startDate?: string; endDate?: string; docType?: string; search?: string }
  ) =>
    request<CustomerLedgerResponse>("GET", `/crm/customers/${customerId}/ledger`, undefined, {
      start_date: params?.startDate,
      end_date: params?.endDate,
      doc_type: params?.docType,
      search: params?.search,
    }),
  recordPayment: (
    customerId: string,
    data: {
      amount: number;
      payment_method: string;
      payment_date?: string;
      reference_number?: string;
      invoice_id?: string;
      notes?: string;
    }
  ) => request<{ status: string; message: string; customer_id: string; amount: number }>("POST", `/crm/customers/${customerId}/payments`, data),
};

// ── CRM Modules ──────────────────────────────────────────────────────────────

export interface CustomerGroup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  auto_join_rules: Record<string, unknown> | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerGroupMember {
  id: string;
  group_id: string;
  customer_id: string;
  joined_at: string;
  added_by_user_id: string | null;
  notes: string | null;
  customer_name?: string;
  customer_email?: string;
}

export interface CrmSegment {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown>;
  is_dynamic: boolean;
  is_active: boolean;
  member_count: number;
  last_recalculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  tenant_id: string;
  name: string;
  tier: string;
  description: string | null;
  duration_months: number;
  price: number;
  currency: string;
  benefits: string[];
  discount_percentage: number;
  points_multiplier: number;
  auto_renewal: boolean;
  is_active: boolean;
  max_members: number;
  current_members: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerMembership {
  id: string;
  tenant_id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  auto_renewal: boolean;
  cancelled_at: string | null;
  customer_name?: string;
  plan_name?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
  customer_name?: string;
}

export interface LoyaltyRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  rule_type: string;
  trigger_value: number;
  reward_type: string;
  reward_value: number;
  cooldown_days: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  rule_id: string | null;
  points_earned: number;
  points_redeemed: number;
  transaction_type: string;
  description: string;
  reference_id: string | null;
  created_at: string;
  customer_name?: string;
  rule_name?: string;
}

export interface Discount {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  description: string | null;
  discount_type: string;
  value: number;
  min_order_value: number;
  max_discount: number | null;
  applicable_scope: string;
  applicable_products: string[] | null;
  applicable_categories: string[] | null;
  applicable_customer_groups: string[] | null;
  applicable_segments: string[] | null;
  usage_limit: number | null;
  usage_count: number;
  per_customer_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  stackable: boolean;
  requires_coupon: boolean;
  is_active: boolean;
  applicable_tiers: string[] | null;
  bundle_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountUsage {
  id: string;
  tenant_id: string;
  discount_id: string;
  customer_id: string;
  order_id: string | null;
  discount_amount: number;
  created_at: string;
  customer_name?: string;
  discount_name?: string;
}

// ── Groups API ───────────────────────────────────────────────────────────────

export const crmGroupsApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<CustomerGroup>>("GET", "/crm/groups", undefined, { page, page_size: pageSize, search }),
  get: (id: string) => request<CustomerGroup>("GET", `/crm/groups/${id}`),
  create: (data: Record<string, unknown>) => request<CustomerGroup>("POST", "/crm/groups", data),
  update: (id: string, data: Record<string, unknown>) => request<CustomerGroup>("PATCH", `/crm/groups/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/crm/groups/${id}`),
  toggle: (id: string, isActive: boolean) => request<CustomerGroup>("PATCH", `/crm/groups/${id}/toggle`, { is_active: isActive }),
  addMembers: (id: string, data: { customer_ids: string[] }) =>
    request<{ added: number }>("POST", `/crm/groups/${id}/members`, data),
  removeMember: (groupId: string, customerId: string) =>
    request<void>("DELETE", `/crm/groups/${groupId}/members/${customerId}`),
  getMembers: (groupId: string, page = 1, pageSize = 20) =>
    request<PaginatedResponse<CustomerGroupMember>>("GET", `/crm/groups/${groupId}/members`, undefined, { page, page_size: pageSize }),
};

// ── Segments API ─────────────────────────────────────────────────────────────

export const crmSegmentsApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<CrmSegment>>("GET", "/crm/segments", undefined, { page, page_size: pageSize, search }),
  get: (id: string) => request<CrmSegment>("GET", `/crm/segments/${id}`),
  create: (data: Record<string, unknown>) => request<CrmSegment>("POST", "/crm/segments", data),
  update: (id: string, data: Record<string, unknown>) => request<CrmSegment>("PATCH", `/crm/segments/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/crm/segments/${id}`),
  toggle: (id: string, isActive: boolean) => request<CrmSegment>("PATCH", `/crm/segments/${id}/toggle`, { is_active: isActive }),
  recalculate: (id: string) => request<{ member_count: number; recalculated_at: string }>("POST", `/crm/segments/${id}/recalculate`),
  preview: (id: string) => request<{ member_count: number }>("POST", `/crm/segments/${id}/preview`),
};

// ── Memberships API ──────────────────────────────────────────────────────────

export const crmMembershipsApi = {
  listPlans: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<MembershipPlan>>("GET", "/crm/membership-plans", undefined, { page, page_size: pageSize, search }),
  getPlan: (id: string) => request<MembershipPlan>("GET", `/crm/membership-plans/${id}`),
  createPlan: (data: Record<string, unknown>) => request<MembershipPlan>("POST", "/crm/membership-plans", data),
  updatePlan: (id: string, data: Record<string, unknown>) => request<MembershipPlan>("PATCH", `/crm/membership-plans/${id}`, data),
  deletePlan: (id: string) => request<void>("DELETE", `/crm/membership-plans/${id}`),
  listSubscriptions: (page = 1, pageSize = 20, customerId?: string, planId?: string, status?: string) =>
    request<PaginatedResponse<CustomerMembership>>("GET", "/crm/membership-subscriptions", undefined, { page, page_size: pageSize, customer_id: customerId, plan_id: planId, status }),
  getSubscription: (id: string) => request<CustomerMembership>("GET", `/crm/membership-subscriptions/${id}`),
  createSubscription: (data: { customer_id: string; plan_id: string }) =>
    request<CustomerMembership>("POST", "/crm/membership-subscriptions", data),
  cancelSubscription: (id: string) => request<CustomerMembership>("POST", `/crm/membership-subscriptions/${id}/cancel`),
  renewSubscription: (id: string) => request<CustomerMembership>("POST", `/crm/membership-subscriptions/${id}/renew`),
};

// ── Wallet API ───────────────────────────────────────────────────────────────

export const crmWalletApi = {
  listTransactions: (customerId?: string, page = 1, pageSize = 20) =>
    request<PaginatedResponse<WalletTransaction>>("GET", `/crm/wallet/transactions`, undefined, { customer_id: customerId, page, page_size: pageSize }),
  credit: (customerId: string, amount: number, description: string, referenceId?: string) =>
    request<WalletTransaction>("POST", `/crm/wallet/credit`, { customer_id: customerId, amount, description, reference_id: referenceId }),
  debit: (customerId: string, amount: number, description: string, referenceId?: string) =>
    request<WalletTransaction>("POST", `/crm/wallet/debit`, { customer_id: customerId, amount, description, reference_id: referenceId }),
  adjust: (customerId: string, amount: number, description: string) =>
    request<WalletTransaction>("POST", `/crm/wallet/adjust`, { customer_id: customerId, amount, description }),
  getBalance: (customerId: string) =>
    request<{ customer_id: string; balance: number }>("GET", `/crm/wallet/balance/${customerId}`),
};

// ── Loyalty API ──────────────────────────────────────────────────────────────

export const crmLoyaltyApi = {
  listRules: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<LoyaltyRule>>("GET", "/crm/loyalty/rules", undefined, { page, page_size: pageSize, search }),
  getRule: (id: string) => request<LoyaltyRule>("GET", `/crm/loyalty/rules/${id}`),
  createRule: (data: Record<string, unknown>) => request<LoyaltyRule>("POST", "/crm/loyalty/rules", data),
  updateRule: (id: string, data: Record<string, unknown>) => request<LoyaltyRule>("PATCH", `/crm/loyalty/rules/${id}`, data),
  deleteRule: (id: string) => request<void>("DELETE", `/crm/loyalty/rules/${id}`),
  toggleRule: (id: string, isActive: boolean) => request<LoyaltyRule>("PATCH", `/crm/loyalty/rules/${id}/toggle`, { is_active: isActive }),
  listTransactions: (customerId?: string, page = 1, pageSize = 20) =>
    request<PaginatedResponse<LoyaltyTransaction>>("GET", "/crm/loyalty/transactions", undefined, { customer_id: customerId, page, page_size: pageSize }),
  addPoints: (customerId: string, points: number, description: string, referenceId?: string) =>
    request<LoyaltyTransaction>("POST", "/crm/loyalty/points/add", { customer_id: customerId, points, description, reference_id: referenceId }),
  redeemPoints: (customerId: string, points: number, description: string, referenceId?: string) =>
    request<LoyaltyTransaction>("POST", "/crm/loyalty/points/redeem", { customer_id: customerId, points, description, reference_id: referenceId }),
};

// ── Discounts API ────────────────────────────────────────────────────────────

export const crmDiscountsApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    request<PaginatedResponse<Discount>>("GET", "/crm/discounts", undefined, { page, page_size: pageSize, search }),
  get: (id: string) => request<Discount>("GET", `/crm/discounts/${id}`),
  create: (data: Record<string, unknown>) => request<Discount>("POST", "/crm/discounts", data),
  update: (id: string, data: Record<string, unknown>) => request<Discount>("PATCH", `/crm/discounts/${id}`, data),
  delete: (id: string) => request<void>("DELETE", `/crm/discounts/${id}`),
  toggle: (id: string, isActive: boolean) => request<Discount>("PATCH", `/crm/discounts/${id}/toggle`, { is_active: isActive }),
  validateCoupon: (code: string, customerId?: string, orderValue?: number) =>
    request<{ valid: boolean; discount_id?: string; discount_amount?: number; message?: string }>("POST", "/crm/discounts/validate", { code, customer_id: customerId, order_value: orderValue }),
  listUsage: (discountId?: string, page = 1, pageSize = 20) =>
    request<PaginatedResponse<DiscountUsage>>("GET", "/crm/discounts/usage", undefined, { discount_id: discountId, page, page_size: pageSize }),
};

export const crmLeadsApi = {
  list: (
    page = 1,
    pageSize = 100,
    search?: string,
    status?: string,
    assignedTo?: string,
    createdAfter?: string,
    createdBefore?: string,
    source?: string
  ) =>
    request<PaginatedResponse<CrmLead>>("GET", "/crm/leads", undefined, {
      page,
      page_size: pageSize,
      search,
      status,
      assigned_to: assignedTo,
      created_after: createdAfter,
      created_before: createdBefore,
      source,
    }),
  listSalesExecutives: () => request<SalesExecutive[]>("GET", "/crm/sales-executives"),
  bulkAssign: (data: { lead_ids: string[]; owner_user_id?: string | null; mode?: string; user_ids?: string[] }) =>
    request<{ success: boolean; assigned_count: number; message: string }>("POST", "/crm/leads/bulk-assign", data),
  bulkImport: (data: { leads: any[]; default_owner_user_id?: string | null }) =>
    request<{ success: boolean; imported_count: number; message: string }>("POST", "/crm/leads/bulk-import", data),
  create: (data: Record<string, unknown>) => request<CrmLead>("POST", "/crm/leads", data),
  update: (id: string, data: Record<string, unknown>) => request<CrmLead>("PATCH", `/crm/leads/${id}`, data),
  listActivities: (id: string) => request<CrmLeadActivity[]>("GET", `/crm/leads/${id}/activities`),
  addActivity: (id: string, data: Record<string, unknown>) => request<CrmLeadActivity>("POST", `/crm/leads/${id}/activities`, data),
  convert: (id: string) => request<CrmCustomer>("POST", `/crm/leads/${id}/convert`),
  convertPipeline: (id: string, data: { deal_name?: string; deal_amount?: number; deal_stage?: string; customer_type?: string; expected_close_date?: string; notes?: string }) =>
    request<{ lead_id: string; customer_id: string; customer_name: string; opportunity_id: string; deal_name: string; deal_stage: string; deal_amount: number; message: string }>("POST", `/crm/leads/${id}/convert-pipeline`, data),
  getAttribution: (id: string) =>
    request<LeadAttribution>("GET", `/crm/leads/${id}/attribution`),
  exportCsvUrl: (params?: { search?: string; status?: string; assigned_to?: string; created_after?: string; created_before?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.status && params.status !== "all") q.append("status", params.status);
    if (params?.assigned_to && params.assigned_to !== "all") q.append("assigned_to", params.assigned_to);
    if (params?.created_after) q.append("created_after", params.created_after);
    if (params?.created_before) q.append("created_before", params.created_before);
    const qs = q.toString();
    return `${API_BASE_URL}/crm/leads/export-csv${qs ? `?${qs}` : ""}`;
  },

  // ── Facebook OAuth page connection (proper flow) ─────────────────────────────
  /** Get this tenant's Meta App configuration status */
  getFbAppConfig: () =>
    request<{ configured: boolean; app_id?: string; redirect_uri?: string }>("GET", "/crm/facebook/app-config"),
  /** Save this tenant's Meta App credentials */
  saveFbAppConfig: (data: { app_id: string; app_secret: string; redirect_uri?: string }) =>
    request<{ success: boolean; message: string }>("POST", "/crm/facebook/app-config", data),
  /** Delete this tenant's Meta App credentials */
  deleteFbAppConfig: () =>
    request<{ success: boolean }>("DELETE", "/crm/facebook/app-config"),
  /** Connect a Page or Lead Form directly by pasting both Page ID and Access Token */
  connectFbDirect: (data: { page_id?: string; access_token: string }) =>
    request<{ success: boolean; page_name: string; page_id: string; message: string }>("POST", "/crm/facebook/connect-direct", data),
  /** Returns whether the Meta App is configured and which page (if any) is connected. */
  getFbStatus: () =>
    request<{ app_configured: boolean; page_connected: boolean; page_name?: string; page_id?: string }>("GET", "/crm/facebook/status"),
  /**
   * Verify a pasted User Token or Page Token from the Meta Graph API Explorer.
   * No OAuth login required — token is introspected against /me/accounts and
   * the discovered pages are returned for the user to pick one.
   */
  verifyFbToken: (access_token: string) =>
    request<{ pages: { id: string; name: string; category: string }[]; count: number }>("POST", "/crm/facebook/verify-token", { access_token }),
  /** Returns the Meta OAuth URL to open in a popup (optional if user prefers OAuth login). */
  getFbAuthUrl: () =>
    request<{ auth_url: string }>("GET", "/crm/facebook/auth-url"),
  /** Returns pages retrieved during OAuth or verify-token flow. */
  getFbAvailablePages: () =>
    request<{ pages: { id: string; name: string; category: string }[] }>("GET", "/crm/facebook/available-pages"),
  /** Saves the selected page permanently (page token stored server-side). */
  selectFbPage: (data: { page_id: string; page_name: string; page_access_token: string }) =>
    request<{ success: boolean; page_name: string; page_id: string; message: string }>("POST", "/crm/facebook/select-page", data),
  /** Disconnects the connected FB page. */
  disconnectFbPage: () =>
    request<{ success: boolean }>("DELETE", "/crm/facebook/disconnect"),

  getOrganicPosts: (limit = 25) =>
    request<{ posts: OrganicPost[]; total: number; page_id: string }>(
      "GET", "/crm/facebook/organic-posts", undefined, { limit }
    ),
  getCampaigns: () =>
    request<FacebookCampaign[]>("GET", "/crm/facebook/campaigns"),

  // ── Legacy credential endpoints (for lead import form backward-compat) ───────
  saveFacebookCredentials: (data: { fb_access_token: string; fb_page_or_form_id?: string; fb_api_version?: string }) =>
    request<any>("POST", "/crm/facebook/credentials", data),
  deleteFacebookCredentials: () =>
    request<any>("DELETE", "/crm/facebook/credentials"),
  getFacebookCredentials: () =>
    request<{ configured: boolean; fb_page_or_form_id?: string; fb_api_version?: string; has_token?: boolean }>("GET", "/crm/facebook/credentials"),
  importFacebookLeads: () =>
    request<{ imported: number; skipped: number; total: number; message: string }>("POST", "/crm/facebook/import"),

  // AI scoring
  analyzeLeadAi: (id: string) =>
    request<{ id: string; ai_score: number; ai_sentiment: string }>("POST", `/crm/leads/${id}/analyze-ai`),

  // AI outbound call via LiveKit
  initiateCall: (id: string, data: { sip_number: string; custom_prompt?: string }) =>
    request<{ status: string; room_name?: string; participant_id?: string; sip_call_id?: string; message: string }>("POST", `/crm/leads/${id}/initiate-call`, data),

  // ── Facebook Token Health & Ad History ───────────────────────────────────────
  /** Check health/expiry of the stored Facebook access token for this org. */
  getFbTokenInfo: () =>
    request<{
      connected: boolean;
      is_valid: boolean;
      page_id?: string;
      page_name?: string;
      token_type?: string;
      expires_at?: number | null;
      scopes?: string[];
      error?: string | null;
    }>("GET", "/crm/campaigns/fb-token-info"),

  /** Fetch paginated list of all Facebook ads published by this org. */
  getAdHistory: (page = 1, pageSize = 20) =>
    request<{
      total: number;
      page: number;
      page_size: number;
      items: Array<{
        id: string;
        post_id?: string;
        page_id?: string;
        page_name?: string;
        caption?: string;
        image_url?: string;
        fb_post_url?: string;
        published_at?: string;
        published_by_user_id?: string;
      }>;
    }>("GET", `/crm/campaigns/ad-history?page=${page}&page_size=${pageSize}`),

  /** Publish a generated ad poster to the connected Facebook Page. */
  publishToFacebook: (data: { image_url: string; caption: string; aspect_ratio?: string }) =>
    request<{ status: string; post_id?: string; page_id?: string; fb_post_url?: string; message: string }>("POST", "/crm/campaigns/publish-facebook", data),

  /** Fetch all Facebook ad accounts. */
  getFbAdAccounts: () =>
    request<Array<{ account_id: string; name: string; account_status: number }>>("GET", "/crm/facebook/ad-accounts"),

  /** Select active Facebook Ad Account. */
  selectFbAdAccount: (ad_account_id: string) =>
    request<{ success: boolean; message: string }>("POST", "/crm/facebook/select-ad-account", { ad_account_id }),

  /** Fetch active campaigns and their metrics. */
  getFbCampaigns: () =>
    request<Array<{
      id: string;
      name: string;
      status: string;
      objective: string;
      start_time?: string;
      stop_time?: string;
      spend?: string;
      impressions?: string;
      clicks?: string;
    }>>("GET", "/crm/facebook/campaigns"),

  /** Fetch active ads. */
  getFbAds: () =>
    request<Array<{
      id: string;
      name: string;
      status: string;
      campaign_id: string;
      adset_id: string;
    }>>("GET", "/crm/facebook/ads"),

  /** Sync lead gen forms submissions. */
  syncFbLeads: () =>
    request<{ success: boolean; synced_count: number; message: string }>("POST", "/crm/facebook/sync-leads"),

  // ── Master Catalog & AI RAG Search ─────────────────────────────────────────
  getSearchSuggestions: (query: string) =>
    request<string[]>("GET", `/inventory/master-catalog/suggestions?query=${encodeURIComponent(query)}`),

  searchMasterCatalog: (query: string, searchWeb = false, provider?: string) =>
    request<Array<{
      id?: string;
      name: string;
      barcode?: string;
      brand_name?: string;
      category_name?: string;
      sub_category_name?: string;
      model_number?: string;
      hsn_code?: string;
      mrp?: number;
      selling_price?: number;
      purchase_price?: number;
      image_url?: string;
      short_description?: string;
      specifications?: string;
      source?: "MASTER_DB" | "AI_WEB_SEARCH" | "EXCEL_IMPORT";
    }>>("GET", `/inventory/master-catalog/search?query=${encodeURIComponent(query)}&search_web=${searchWeb}${provider && provider !== "auto" ? `&provider=${encodeURIComponent(provider)}` : ""}`),

  saveToMasterCatalog: (item: any) =>
    request<any>("POST", "/inventory/master-catalog/save", item),

  importExcelMasterCatalog: (items: any[]) =>
    request<{ message: string; count: number }>("POST", "/inventory/master-catalog/import-excel", { items }),

  importToLocalInventory: (data: {
    name: string;
    sku?: string;
    barcode?: string;
    brand_name?: string;
    category_id?: string;
    sub_category_id?: string;
    category_name?: string;
    sub_category_name?: string;
    short_description?: string;
    image_url?: string;
    purchase_price?: number;
    mrp?: number;
    selling_price?: number;
    wholesale_price?: number;
    b2b_price?: number;
    is_tax_inclusive?: boolean;
    mfg_date?: string;
    expiry_date?: string;
    tax_percent?: number;
    initial_stock?: number;
    supplier?: string;
    warehouse?: string;
  }) =>
    request<any>("POST", "/inventory/master-catalog/import-to-local-inventory", data),
};

export interface CrmOpportunity {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  lead_id: string | null;
  name: string;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  owner_user_id: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  customer_name?: string | null;
  calls_count?: number | null;
  last_call_status?: string | null;
  last_call_sentiment?: string | null;
  next_step: string | null;
  next_step_at: string | null;
  forecast_category: string;
  lost_reason: string | null;
  notes?: string | null;
  call_disposition?: string | null;
  call_duration_minutes?: number | null;
  customer_response?: string | null;
  last_contact_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const crmOpportunitiesApi = {
  list: async (params?: { search?: string; stage?: string; assigned_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.stage && params.stage !== "all") q.append("stage", params.stage);
    if (params?.assigned_to && params.assigned_to !== "all") q.append("assigned_to", params.assigned_to);
    const qs = q.toString();
    const res = await request<any>("GET", `/crm/opportunities${qs ? `?${qs}` : ""}`);
    return Array.isArray(res) ? res : res?.items ?? [];
  },
  create: (data: Record<string, unknown>) => request<CrmOpportunity>("POST", "/crm/opportunities", data),
  update: (id: string, data: Record<string, unknown>) => request<CrmOpportunity>("PATCH", `/crm/opportunities/${id}`, data),
  listActivities: (id: string) => request<CrmLeadActivity[]>("GET", `/crm/opportunities/${id}/activities`),
  addActivity: (id: string, data: Record<string, unknown>) => request<CrmLeadActivity>("POST", `/crm/opportunities/${id}/activities`, data),
  exportCsvUrl: (params?: { search?: string; stage?: string; assigned_to?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.stage && params.stage !== "all") q.append("stage", params.stage);
    if (params?.assigned_to && params.assigned_to !== "all") q.append("assigned_to", params.assigned_to);
    const qs = q.toString();
    return `${API_BASE_URL}/crm/opportunities/export-csv${qs ? `?${qs}` : ""}`;
  },
};

export interface EmailCampaign {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  body_html: string;
  target_category: string;
  status: string;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  subject: string | null;
  body_html: string;
  created_at: string;
  updated_at: string;
}

export interface LiveNotification {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  category: string;
  unread: boolean;
  created_at: string;
}

export const crmCampaignsApi = {
  generateCopy: (data: { prompt: string; channel: string; provider?: string; reference_image?: string }) =>
    request<{ copy: string; hashtags?: string[]; keywords?: string[] }>("POST", "/crm/campaigns/generate-copy", data),
  optimizePrompt: (data: { prompt: string; style?: string; aspect_ratio?: string; provider?: string; reference_image?: string }) =>
    request<{ optimized_prompt: string }>("POST", "/crm/campaigns/optimize-prompt", data),
  generatePoster: (data: { prompt: string; style?: string; aspect_ratio?: string; provider?: string; reference_image?: string; skip_enhancement?: boolean }) =>
    request<{ image_url: string; image_b64?: string; enhanced_prompt: string; aspect_ratio: string }>("POST", "/crm/campaigns/generate-poster", data),
  publishFacebook: (data: { image_url: string; caption: string }) =>
    request<{ status: string; post_id?: string; message: string }>("POST", "/crm/campaigns/publish-facebook", data),

  // Email Campaign methods
  listEmailCampaigns: () => request<EmailCampaign[]>("GET", "/crm/email-campaigns"),
  createEmailCampaign: (data: { name: string; subject: string; body_html: string; target_category: string }) =>
    request<EmailCampaign>("POST", "/crm/email-campaigns", data),
  sendEmailCampaign: (campaignId: string) =>
    request<EmailCampaign>("POST", `/crm/email-campaigns/${campaignId}/send`),
  listEmailTemplates: () => request<EmailTemplate[]>("GET", "/crm/email-templates"),
  createEmailTemplate: (data: { name: string; subject?: string; body_html: string }) =>
    request<EmailTemplate>("POST", "/crm/email-templates", data),
};

export interface LeadFormInfo {
  id: string;
  name: string;
  status: string;
  leads_count: number;
}

export interface MetaAdCampaignResponse {
  id: string;
  tenant_id: string;
  meta_campaign_id: string;
  name: string;
  objective: string;
  status: string;
  special_ad_categories: string[];
  daily_budget_cents: number | null;
  lifetime_budget_cents: number | null;
  spend_cents: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  reach: number;
  frequency: number | null;
  meta_payload: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdSetResponse {
  id: string;
  campaign_id: string;
  meta_adset_id: string;
  name: string;
  targeting: Record<string, any> | null;
  status: string;
  meta_payload: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdResponse {
  id: string;
  adset_id: string;
  meta_ad_id: string;
  meta_creative_id: string;
  meta_image_hash: string;
  name: string;
  lead_form_id: string | null;
  destination_url: string | null;
  headline: string | null;
  body: string | null;
  cta_type: string | null;
  status: string;
  meta_payload: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAdInsights {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  reach: string;
  frequency: string;
  cpc?: string;
  cpm?: string;
}

export interface PaidCampaignListResponse {
  total: number;
  page: number;
  page_size: number;
  items: MetaAdCampaignResponse[];
}

export interface CreatePaidAdRequest {
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  objective: "OUTCOME_ENGAGEMENT" | "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_AWARENESS" | "OUTCOME_APP_INSTALLS" | "REACH";
  special_ad_categories?: string[];
  image_url: string;
  caption: string;
  headline: string;
  destination_url: string;
  lead_form_id?: string;
  cta_type?: string;
  daily_budget_cents?: number;
  lifetime_budget_cents?: number;
  targeting?: Record<string, any>;
  start_time?: string;
  end_time?: string;
}

export interface ActivateAdRequest {
  status: "ACTIVE" | "PAUSED";
}

export interface AssetLibraryItem {
  id: string;
  filename: string;
  public_url: string;
  thumbnail_url: string | null;
  aspect_ratio: string;
  width: number | null;
  height: number | null;
  source: string;
  provider_model: string | null;
  original_prompt: string | null;
  enhanced_prompt: string | null;
  style: string | null;
  approval_status: string;
  used_in_organic_post: boolean;
  used_in_paid_campaign: boolean;
  organic_post_id: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export interface SaveAssetPayload {
  filename: string;
  public_url: string;
  aspect_ratio?: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  source?: "claude" | "gemini" | "openai" | "upload";
  provider_model?: string;
  original_prompt?: string;
  enhanced_prompt?: string;
  style?: string;
  tags?: string[];
  notes?: string;
}

export interface AssetLibraryListResponse {
  total: number;
  page: number;
  page_size: number;
  items: AssetLibraryItem[];
}

export const assetLibraryApi = {
  save: (data: SaveAssetPayload) =>
    request<{ id: string; public_url: string; approval_status: string }>(
      "POST", "/crm/ads/save-asset", data
    ),
  list: (status?: string, source?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (source) params.set("source", source);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    return request<AssetLibraryListResponse>(
      "GET", `/crm/ads/asset-library?${params.toString()}`
    );
  },
  approve: (assetId: string, status: "approved" | "rejected" | "draft", rejectionReason?: string) =>
    request<{ id: string; approval_status: string }>(
      "PUT", `/crm/ads/assets/${assetId}/approve`, {
        status,
        rejection_reason: rejectionReason,
      }
    ),
};

export const paidAdsApi = {
  /** List lead-gen forms on the connected Page for destination dropdown. */
  listLeadForms: () =>
    request<LeadFormInfo[]>("POST", "/crm/ads/lead-forms"),

  /** Create a full paid-ad pipeline (campaign → adset → creative → ad). */
  createCampaign: (data: CreatePaidAdRequest) =>
    request<{
      success: boolean;
      local_campaign_id: string;
      local_adset_id: string;
      local_ad_id: string;
      meta_campaign_id: string;
      meta_adset_id: string;
      meta_ad_id: string;
      meta_creative_id: string;
      image_hash: string;
      message: string;
    }>("POST", "/crm/ads/campaigns", data),

  /** Activate (submit) or pause a paid ad. */
  activateAd: (adId: string, data: { status: "ACTIVE" | "PAUSED" }) =>
    request<{ success: boolean; meta_ad_id: string; status: string }>(
      "POST", `/crm/ads/${adId}/activate`, data
    ),

  /** Paginated list of paid-ad campaigns. */
  listCampaigns: (page = 1, pageSize = 20) =>
    request<PaidCampaignListResponse>(
      "GET", `/crm/ads/campaigns?page=${page}&page_size=${pageSize}`
    ),

  /** Live performance insights for a campaign. */
  getCampaignInsights: (campaignId: string) =>
    request<MetaAdInsights>("GET", `/crm/ads/campaigns/${campaignId}/insights`),

  /** Archive (delete) a paid-ad campaign. */
  archiveCampaign: (campaignId: string) =>
    request<{ success: boolean }>("DELETE", `/crm/ads/campaigns/${campaignId}`),
};

export interface NotificationSettings {
  enabled: boolean;
  categories: string[];
  polling_interval: number;
}

export const liveNotificationsApi = {
  list: () => request<LiveNotification[]>("GET", "/system/notifications/live"),
  readAll: () => request<{ message: string }>("POST", "/system/notifications/read-all"),
  markAsRead: (id: string) => request<{ message: string; id: string }>("PATCH", `/system/notifications/${id}/read`),
  delete: (id: string) => request<{ message: string; id: string }>("DELETE", `/system/notifications/${id}`),
  getSettings: () => request<NotificationSettings>("GET", "/system/notifications/settings"),
  updateSettings: (data: NotificationSettings) => request<{ message: string; settings: NotificationSettings }>("PUT", "/system/notifications/settings", data),
};

export interface CrmTicket {
  id: string;
  customer_id: string | null;
  subject: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  ai_summary: string | null;
  created_at: string;
}

export const crmTicketsApi = {
  list: (category?: string, status?: string) => request<CrmTicket[]>("GET", "/crm/tickets", undefined, { category, status }),
  create: (data: Record<string, unknown>) => request<CrmTicket>("POST", "/crm/tickets", data),
  update: (id: string, data: Record<string, unknown>) => request<CrmTicket>("PATCH", `/crm/tickets/${id}`, data),
  delete: (id: string) => request<{ message: string; id: string }>("DELETE", `/crm/tickets/${id}`),
  summarize: (id: string) => request<{ id: string; ai_summary: string }>("POST", `/crm/tickets/${id}/summarize-ai`),
};

export interface CrmQuotation {
  id: string;
  customer_id: string;
  quote_number: string;
  items: Record<string, any>;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  created_at: string;
}

export const crmQuotationsApi = {
  list: () => request<CrmQuotation[]>("GET", "/crm/quotations"),
  create: (data: Record<string, unknown>) => request<any>("POST", "/crm/quotations", data),
  update: (id: string, data: Record<string, unknown>) => request<any>("PUT", `/crm/quotations/${id}`, data),
  sendQuotation: (
    id: string,
    payload: {
      send_email?: boolean;
      send_whatsapp?: boolean;
      recipient_email?: string;
      recipient_phone?: string;
    }
  ) => request<any>("POST", `/crm/quotations/${id}/send`, payload),
  delete: (id: string) => request<any>("DELETE", `/crm/quotations/${id}`),
  convertToOrder: (id: string) => request<any>("POST", `/crm/quotations/${id}/convert-to-order`),
  getPdfUrl: (id: string) => `${API_BASE_URL}/crm/quotations/${id}/pdf`,
};

export interface CrmSalesOrder {
  id: string;
  customer_id: string;
  order_number: string;
  items: Record<string, any>;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export const crmSalesOrdersApi = {
  list: () => request<CrmSalesOrder[]>("GET", "/crm/sales-orders"),
  create: (data: Record<string, unknown>) => request<CrmSalesOrder>("POST", "/crm/sales-orders", data),
};

// ─── Customer Intelligence API ────────────────────────────────────────────────

export interface IntelAnalytics {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  repeat_rate: number;
  monthly_data: { month: string; revenue: number; orders: number; new_customers: number }[];
  segments: { name: string; count: number }[];
}

export interface IntelChurnCustomer {
  customer_id: string;
  customer: string;
  company: string | null;
  risk: number;
  tier: string;
  last_purchase: string;
  order_count: number;
  open_tickets: number;
  reason: string;
}

export interface IntelChurn {
  summary: { high_risk: number; at_risk: number; watch: number; total: number };
  customers: IntelChurnCustomer[];
}

export interface IntelLtvCustomer {
  customer_id: string;
  customer: string;
  company: string | null;
  ltv: number;
  revenue: number;
  profit: number;
  orders: number;
  years: number;
}

export interface IntelLtv {
  summary: { avg_ltv: number; total_customer_value: number; avg_orders_per_customer: number; total_customers: number };
  customers: IntelLtvCustomer[];
}

export interface IntelPurchaseBehaviour {
  summary: { avg_frequency: number; avg_order_value: number; peak_hour: string; top_category: string };
  categories: { name: string; pct: number; revenue: number; orders: number }[];
  top_buyers: { name: string; score: number }[];
  purchase_times: { hour: string; orders: number }[];
}

export interface IntelRfmSegment {
  label: string;
  count: number;
  revenue: number;
  r: number;
  f: number;
  description: string;
  color: string;
}

export interface IntelRfm {
  segments: IntelRfmSegment[];
  total_customers_analysed: number;
}

export interface IntelRecommendation {
  id: string;
  type: string;
  customer: string;
  customer_seg: string;
  title: string;
  description: string;
  confidence: number;
  action: string;
  priority: string;
  icon_type: string;
}

export interface IntelRecommendations {
  summary: { total_recommendations: number; avg_confidence: number; customers_analysed: number; transactions_analysed: number; support_interactions: number };
  recommendations: IntelRecommendation[];
}

export const crmIntelligenceApi = {
  getAnalytics: () => request<IntelAnalytics>("GET", "/crm/intelligence/analytics"),
  getChurn: () => request<IntelChurn>("GET", "/crm/intelligence/churn"),
  getLifetimeValue: () => request<IntelLtv>("GET", "/crm/intelligence/lifetime-value"),
  getPurchaseBehaviour: () => request<IntelPurchaseBehaviour>("GET", "/crm/intelligence/purchase-behaviour"),
  getRfm: () => request<IntelRfm>("GET", "/crm/intelligence/rfm"),
  getRecommendations: () => request<IntelRecommendations>("GET", "/crm/intelligence/recommendations"),
};


// ─── Extended HRMS Types ──────────────────────────────────────────────────────

export interface EmployeeDocument {
  id: string;
  tenant_id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  upload_date: string;
  expiry_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BiometricDevice {
  id: string;
  tenant_id: string;
  device_code: string;
  location: string;
  model: string;
  enrolled_employees: number;
  last_sync: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FaceRecognitionLog {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  employee_name: string | null;
  timestamp: string;
  confidence: number;
  location: string;
  action: string;
  status: string;
  created_at: string;
}

export interface AttendanceCorrection {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name: string | null;
  date: string;
  original_status: string;
  original_check_in: string | null;
  original_check_out: string | null;
  corrected_status: string;
  corrected_check_in: string | null;
  corrected_check_out: string | null;
  reason: string;
  status: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrmsDashboardStats {
  total_employees: number;
  active_employees: number;
  on_leave: number;
  new_joinees: number;
  avg_attendance: number;
  attrition_rate: number;
}

export interface LeaveBalance {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface LeavePolicy {
  id: string;
  tenant_id: string;
  name: string;
  leave_type: string;
  entitled_days: number;
  applicable_to: string;
  created_at: string;
  updated_at: string;
}

export interface PayGrade {
  id: string;
  tenant_id: string;
  name: string;
  designation_id: string;
  designation_name?: string;
  basic_salary: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_deduction: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_name?: string;
  designation?: string;
  department?: string;
  basic_salary: number;
  hra: number;
  other_allowances: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_deduction: number;
  other_deductions: number;
  created_at?: string;
  updated_at?: string;
}



// --- POS Types & API ------------------------------------------------

export interface POSCategory {
  id: string; name: string; description: string | null;
  parent_id?: string | null;
  color: string | null; icon: string | null; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface POSProduct {
  id: string; name: string; brand: string | null; sku: string | null;
  barcode: string | null; description: string | null; image_url: string | null;
  category_id: string | null; category_name: string | null;
  purchase_price: number; mrp: number; selling_price: number;
  wholesale_price?: number; min_wholesale_qty?: number;
  tax_percent: number; discount: number; stock: number;
  reorder_level: number; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface POSTransactionHistory {
  id: string; session_id: string; cashier_id: string; customer_id: string | null;
  receipt_number: string; status: string;
  parent_transaction_id: string | null;
  delivery_status: string | null;
  delivery_address: string | null;
  driver_name: string | null;
  subtotal: number; tax_amount: number; discount_amount: number; total_amount: number;
  created_at: string; updated_at: string;
  items: { id: string; product_id: string; quantity: number; unit_price: number; discount: number; subtotal: number }[];
  payments: { id: string; payment_method: string; amount: number; reference_number: string | null }[];
}

export const posApi = {
  // Sessions
  openSession: (data: Record<string, unknown>) => request<any>("POST", "/pos/sessions/open", data),
  closeSession: (sessionId: string, data: Record<string, unknown>) => request<any>("POST", `/pos/sessions/${sessionId}/close`, data),
  getCurrentSession: () => request<any>("GET", "/pos/sessions/current"),
  // Transactions
  checkout: (data: Record<string, unknown>) => request<any>("POST", "/pos/transactions/checkout", data),
  getHistory: (params?: { limit?: number; status_filter?: string; search?: string }) =>
    request<POSTransactionHistory[]>("GET", "/pos/transactions/history", undefined, params as Record<string, string | number | boolean | null | undefined>),
  getTransactionHistory: (limit: number = 50) =>
    request<POSTransactionHistory[]>("GET", "/pos/transactions/history", undefined, { limit } as Record<string, string | number | boolean | null | undefined>),
  getDailySummary: (params?: { session_id?: string }) =>
    request<any>("GET", "/pos/transactions/reports/daily-summary", undefined, params as Record<string, string | number | boolean | null | undefined>),
  deleteTransaction: (id: string) => request<void>("DELETE", `/pos/transactions/${id}`),
  // Products & Categories
  lookupBarcode: (barcode: string) =>
    request<{ success: boolean; message?: string; product?: any }>("GET", `/products/barcode/${barcode}`),
  getCategories: () => request<POSCategory[]>("GET", "/pos/categories"),
  getProducts: (params?: { category_id?: string; search?: string; limit?: number }) =>
    request<POSProduct[]>("GET", "/pos/products", undefined, params as Record<string, string | number | boolean | null | undefined>),
  createProduct: (data: Record<string, unknown>) => request<POSProduct>("POST", "/pos/products", data),
  bulkCreateProducts: (products: Record<string, unknown>[]) =>
    request<{ created_count: number; skipped_count: number; errors: string[] }>("POST", "/pos/products/bulk", { products }),
  updateProduct: (id: string, data: Record<string, unknown>) => request<POSProduct>("PATCH", `/pos/products/${id}`, data),
  deleteProduct: (id: string) => request<void>("DELETE", `/pos/products/${id}`),
  createCategory: (data: Record<string, unknown>) => request<POSCategory>("POST", "/pos/categories", data),
  getCustomerSummary: (nameOrId?: string, phone?: string) =>
    request<any>("GET", `/invoices/customer-summary/${nameOrId || ""}`, undefined, { phone }),
  // Free Quantity & Promotional Schemes
  getFreeQtyRules: () =>
    request<any[]>("GET", "/pos/free-qty-rules"),
  saveFreeQtyRules: (rules: any[]) =>
    request<{ success: boolean; count: number }>("POST", "/pos/free-qty-rules", { rules }),
  evaluateFreeQtyRules: (payload: { cart_subtotal: number; cart_items: any[] }) =>
    request<{
      rules_met: string[];
      rules_failed: { name: string; reason: string }[];
      can_add_free: boolean;
      free_suggestions?: any[];
    }>("POST", "/pos/free-qty-rules/evaluate", payload),
};

// --- Inventory (ERP Product Master) ------------------------------------------------

export interface InventoryCategory {
  id: string; name: string; category_code: string | null; description: string | null;
  parent_id: string | null; status: string;
  created_at: string; updated_at: string;
}

export interface InventoryBrand {
  id: string; name: string; description: string | null;
  manufacturer: string | null; status: string;
  image_url?: string | null; category?: string | null; products_count?: number;
  created_at: string; updated_at: string;
}

export interface InventoryUOM {
  id: string;
  name: string;
  abbreviation: string;
  unit_type?: string | null;
  base_unit?: boolean;
  conversion_rate?: number;
  unit_symbol?: string | null;
  products_count?: number;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  module: string;
  options: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>;
  additional_price: number;
  stock_override?: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  items: { id: string; product_id: string; quantity: number }[];
}

export interface ProductKit {
  id: string;
  name: string;
  sku: string;
  kit_type: string;
  description?: string;
  items: { id: string; component_name: string; quantity: number }[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface InventoryProduct {
  id: string; name: string; sku: string; barcode: string | null;
  category_id: string | null; brand_id: string | null; uom_id: string | null;
  category_name: string | null; brand_name: string | null; uom_name: string | null;
  short_description: string | null; long_description: string | null;
  image_url: string | null;
  hsn_code?: string | null;
  purchase_price: number; mrp: number; selling_price: number;
  wholesale_price?: number; min_wholesale_qty?: number;
  b2b_price?: number; min_b2b_qty?: number;
  base_name?: string | null; product_base_code?: string | null; size_l_kg?: string | null;
  tax_percent: number; discount_limit: number;
  initial_stock: number; stock?: number; reorder_level: number; safety_stock: number;
  supplier: string | null; warehouse: string | null;
  status: string; created_at: string; updated_at: string;
  specifications?: any;
  [k: string]: any;
}

// --- Inventory Operations ---
export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  supplier: string | null;
  reference_number: string | null;
  notes: string | null;
  status: string;
  items: any[];
}

export interface GoodsIssue {
  id: string;
  issue_number: string;
  recipient: string | null;
  reference_number: string | null;
  notes: string | null;
  status: string;
  items: any[];
}

export interface StockMovement {
  id: string;
  movement_number: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  source_location: string;
  destination_location: string;
  quantity: number;
  notes: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockAdjustment {
  id: string;
  adjustment_number: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  current_stock?: number;
  adjustment_type: string;
  quantity_changed: number;
  reason: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CycleCount {
  id: string;
  count_number: string;
  location: string | null;
  auditor: string | null;
  status: string;
  notes: string | null;
  items: any[];
}

export interface HealthComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  signal: string;
}

export interface HealthScore {
  overall: number;
  grade: string;
  grade_color: string;
  components: HealthComponent[];
  total_products: number;
  total_value: number;
  total_units: number;
  stocked_out_count: number;
  dead_stock_count: number;
  expiry_at_risk_value: number;
}

export interface DeadStockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  on_hand: number;
  stock_value: number;
  selling_price: number;
  purchase_price: number;
  no_movement_for: string;
  recommendation: string;
  recommendation_severity: string;
  days_to_expiry: number | null;
  next_expiry: string | null;
}

export interface ReorderItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  on_hand: number;
  reorder_level: number;
  urgency: string;
  reason: string;
  suggested_order_qty: number;
  suggested_order_value: number;
}

export interface AnomalyItem {
  product_id: string;
  product_name: string;
  sku: string;
  anomaly_type: string;
  severity: string;
  title: string;
  message: string;
  metric: string;
  context: string;
  ts: string;
}

export interface Insight {
  tone: "success" | "warning" | "critical" | "info";
  icon: string;
  title: string;
  body: string;
}

export interface CategoryBreakdownItem {
  category: string;
  units: number;
  value: number;
  potential_revenue: number;
  potential_margin: number;
  margin_pct: number;
  product_count: number;
  expiring_value: number;
  dead_value: number;
  avg_value_per_sku: number;
  value_share_pct: number;
}

export interface IntelligenceSummary {
  health: HealthScore;
  dead_stock: { items: DeadStockItem[]; total_count: number; total_dead_value: number; total_units: number };
  reorder: { items: ReorderItem[]; total_count: number; critical: number; high: number; medium: number; low: number; estimated_total_value: number };
  insights: { insights: Insight[]; summary: string };
  categories: { items: CategoryBreakdownItem[]; total_value: number };
  anomalies: { items: AnomalyItem[]; counts: Record<string, number> };
  generated_at: string;
}

export const inventoryApi = {
  verifyGstin: (gstin: string) =>
    request<{
      valid: boolean;
      gstin: string;
      legal_name: string;
      trade_name: string;
      pan: string;
      state: string;
      state_code: string;
      taxpayer_type: string;
      status: string;
      city: string;
      pincode: string;
      address: string;
      business_nature: string;
      // Extended auto-fill fields
      contact_person?: string;
      email?: string;
      phone?: string;
      bank_name?: string;
      account_number?: string;
      ifsc_code?: string;
      is_fallback?: boolean;
    }>("POST", "/inventory/procurement/verify-gstin", { gstin }),

  lookupGstin: (gstin: string) =>
    inventoryApi.verifyGstin(gstin),

  getHsnCodes: (search?: string) =>
    request<Array<{ hsn_code: string; description: string; gst_rate: number }>>("GET", "/inventory/hsn-codes", undefined, search ? { search } : undefined),

  suggestHsn: (payload: { name: string; category?: string; description?: string }) =>
    request<{
      success: boolean;
      found: boolean;
      hsn_code: string;
      gst_rate: number;
      description: string;
      category: string;
      uom: string;
      is_tax_inclusive: boolean;
      confidence: number;
    }>("POST", "/inventory/suggest-hsn", payload),

  getProducts: (params?: { category_id?: string; brand_id?: string; search?: string; page?: number; page_size?: number; sort_by?: string; sort_order?: string }) =>

    request<PaginatedResponse<InventoryProduct>>("GET", "/inventory/products", undefined, params as Record<string, any>),

  createProduct: (data: Record<string, unknown>) => request<InventoryProduct>("POST", "/inventory/products", data),
  masterImportProducts: (payload: { items: Record<string, unknown>[]; enable_ai_search?: boolean } | Record<string, unknown>[], enable_ai_search?: boolean) => {
    const body = Array.isArray(payload)
      ? { items: payload, enable_ai_search: enable_ai_search ?? true }
      : { items: payload.items, enable_ai_search: payload.enable_ai_search ?? true };
    return request<{ products_created: number; brands_created: number; categories_created: number; uoms_created: number; skipped_count: number; errors: string[] }>(
      "POST",
      "/inventory/products/master-import",
      body
    );
  },
  updateProduct: (id: string, data: Record<string, unknown>) => request<InventoryProduct>("PATCH", `/inventory/products/${id}`, data),
  deleteProduct: (id: string) => request<void>("DELETE", `/inventory/products/${id}`),
  bulkDeleteProducts: (product_ids: string[]) =>
    request<{ deleted_count: number; deleted_ids: string[] }>("POST", "/inventory/products/bulk-delete", { product_ids }),
  uploadProductImage: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ image_url: string }>("POST", "/inventory/products/upload-image", fd);
  },

  lookupProductByBarcode: (rawBarcode: string) =>
    request<{ success: boolean; message?: string; product?: any }>("GET", `/products/barcode/${encodeURIComponent(rawBarcode)}`),

  instantScan: (rawBarcode: string) =>
    request<{ success: boolean; found_in_db: boolean; barcode_searched: string; product?: any; message: string; background_search_triggered: boolean; enriching: boolean }>("POST", `/products/instant-scan`, { barcode: rawBarcode }),

  // Master Catalog & AI Search
  getSearchSuggestions: (query: string) =>
    request<string[]>("GET", `/inventory/master-catalog/suggestions?query=${encodeURIComponent(query)}`),

  searchMasterCatalog: (query: string, searchWeb = false, provider?: string) =>
    request<Array<{
      id?: string;
      name: string;
      barcode?: string;
      brand_name?: string;
      category_name?: string;
      sub_category_name?: string;
      model_number?: string;
      hsn_code?: string;
      mrp?: number;
      selling_price?: number;
      purchase_price?: number;
      image_url?: string;
      short_description?: string;
      specifications?: string;
      source?: "MASTER_DB" | "AI_WEB_SEARCH" | "EXCEL_IMPORT";
    }>>("GET", `/inventory/master-catalog/search?query=${encodeURIComponent(query)}&search_web=${searchWeb}${provider && provider !== "auto" ? `&provider=${encodeURIComponent(provider)}` : ""}`),

  saveToMasterCatalog: (item: any) =>
    request<any>("POST", "/inventory/master-catalog/save", item),

  importExcelMasterCatalog: (items: any[]) =>
    request<{ message: string; count: number }>("POST", "/inventory/master-catalog/import-excel", { items }),

  importToLocalInventory: (data: Record<string, unknown>) =>
    request<any>("POST", "/inventory/master-catalog/import-to-local-inventory", data),

  triggerRAGEnrichment: (productIds?: string[], enrichAll = false) =>
    request<{ message: string }>("POST", "/inventory/master-catalog/enrich/trigger", { product_ids: productIds, enrich_all: enrichAll }),

  getRAGEnrichmentStatus: () =>
    request<{ total: number; pending: number; processing: number; completed: number; failed: number; paused?: boolean }>("GET", "/inventory/master-catalog/enrich/status"),

  pauseRAGEnrichment: () =>
    request<{ message: string; paused?: boolean }>("POST", "/inventory/master-catalog/enrich/pause"),

  resumeRAGEnrichment: () =>
    request<{ message: string; paused?: boolean }>("POST", "/inventory/master-catalog/enrich/resume"),

  getAiImageSearchStatus: () =>
    request<{ paused: boolean; status: string }>("GET", "/inventory/master-catalog/ai-image-search/status"),

  pauseAiImageSearch: () =>
    request<{ paused: boolean; message: string }>("POST", "/inventory/master-catalog/ai-image-search/pause"),

  resumeAiImageSearch: () =>
    request<{ paused: boolean; message: string }>("POST", "/inventory/master-catalog/ai-image-search/resume"),

  fetchMasterCatalogImage: (itemId: string) =>
    request<{ success: boolean; image_url: string; message: string }>("POST", `/inventory/master-catalog/admin/master-catalog/${itemId}/fetch-image`),

  fetchProductImage: (productId: string) =>
    request<{ success: boolean; image_url: string; message: string }>("POST", `/inventory/products/${productId}/fetch-image`),

  adminGetMasterCatalogList: (params?: { page?: number; page_size?: number; search?: string; rag_status?: string }) =>
    request<{ items: any[]; total: number; page: number; page_size: number }>("GET", "/inventory/master-catalog/admin/list", undefined, params as Record<string, any>),

  // Categories
  getCategories: (params?: { search?: string; page?: number; page_size?: number }) =>
    request<PaginatedResponse<InventoryCategory>>("GET", "/inventory/categories", undefined, params as Record<string, any>),
  createCategory: (data: Record<string, unknown>) => request<InventoryCategory>("POST", "/inventory/categories", data),
  bulkCreateCategories: (categories: Record<string, unknown>[]) =>
    request<{ created_count: number; skipped_count: number; errors: string[] }>("POST", "/inventory/categories/bulk", { categories }),
  updateCategory: (id: string, data: Record<string, unknown>) => request<InventoryCategory>("PATCH", `/inventory/categories/${id}`, data),
  deleteCategory: (id: string) => request<void>("DELETE", `/inventory/categories/${id}`),
  deleteAllCategories: () => request<{ message: string; count: number }>("DELETE", "/inventory/categories/all"),

  // Brands
  getBrands: (params?: { search?: string; page?: number; page_size?: number }) =>
    request<PaginatedResponse<InventoryBrand>>("GET", "/inventory/brands", undefined, params as Record<string, any>),
  createBrand: (data: Record<string, unknown>) => request<InventoryBrand>("POST", "/inventory/brands", data),
  updateBrand: (id: string, data: Record<string, unknown>) => request<InventoryBrand>("PATCH", `/inventory/brands/${id}`, data),
  deleteBrand: (id: string) => request<void>("DELETE", `/inventory/brands/${id}`),
  deleteAllBrands: () => request<{ message: string; count: number }>("DELETE", "/inventory/brands/all"),

  // UOMs
  getUOMs: (params?: { search?: string; page?: number; page_size?: number }) =>
    request<PaginatedResponse<InventoryUOM>>("GET", "/inventory/uoms", undefined, params as Record<string, any>),
  createUOM: (data: Record<string, unknown>) => request<InventoryUOM>("POST", "/inventory/uoms", data),
  updateUOM: (id: string, data: Record<string, unknown>) => request<InventoryUOM>("PATCH", `/inventory/uoms/${id}`, data),
  deleteUOM: (id: string) => request<void>("DELETE", `/inventory/uoms/${id}`),

  // Attributes
  getProductAttributes: () => request<ProductAttribute[]>("GET", "/inventory/product-attributes"),
  createProductAttribute: (data: Record<string, unknown>) => request<ProductAttribute>("POST", "/inventory/product-attributes", data),
  updateProductAttribute: (id: string, data: Record<string, unknown>) => request<ProductAttribute>("PATCH", `/inventory/product-attributes/${id}`, data),
  deleteProductAttribute: (id: string) => request<void>("DELETE", `/inventory/product-attributes/${id}`),

  // Variants
  getProductVariants: () => request<ProductVariant[]>("GET", "/inventory/product-variants"),
  createProductVariant: (data: Record<string, unknown>) => request<ProductVariant>("POST", "/inventory/product-variants", data),
  updateProductVariant: (id: string, data: Record<string, unknown>) => request<ProductVariant>("PATCH", `/inventory/product-variants/${id}`, data),
  deleteProductVariant: (id: string) => request<void>("DELETE", `/inventory/product-variants/${id}`),

  // Bundles
  getProductBundles: () => request<ProductBundle[]>("GET", "/inventory/product-bundles"),
  createProductBundle: (data: Record<string, unknown>) => request<ProductBundle>("POST", "/inventory/product-bundles", data),
  updateProductBundle: (id: string, data: Record<string, unknown>) => request<ProductBundle>("PATCH", `/inventory/product-bundles/${id}`, data),
  deleteProductBundle: (id: string) => request<void>("DELETE", `/inventory/product-bundles/${id}`),

  // Kits
  getProductKits: () => request<ProductKit[]>("GET", "/inventory/product-kits"),
  createProductKit: (data: Record<string, unknown>) => request<ProductKit>("POST", "/inventory/product-kits", data),
  updateProductKit: (id: string, data: Record<string, unknown>) => request<ProductKit>("PATCH", `/inventory/product-kits/${id}`, data),
  deleteProductKit: (id: string) => request<void>("DELETE", `/inventory/product-kits/${id}`),

  // Images
  getProductImages: () => request<ProductImage[]>("GET", "/inventory/product-images"),
  createProductImage: (data: Record<string, unknown>) => request<ProductImage>("POST", "/inventory/product-images", data),
  updateProductImage: (id: string, data: Record<string, unknown>) => request<ProductImage>("PATCH", `/inventory/product-images/${id}`, data),
  deleteProductImage: (id: string) => request<void>("DELETE", `/inventory/product-images/${id}`),
  uploadProductImageFile: (productId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE_URL}/inventory/product-images/upload?product_id=${encodeURIComponent(productId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      body: form,
    }).then(async (r) => {
      if (!r.ok) {
        const detail = await r.text();
        throw { detail, status: r.status };
      }
      return r.json() as Promise<ProductImage>;
    });
  },

  uploadSingleProductImage: (productId: string, file: File, isPrimary = true) => {
    const fd = new FormData();
    fd.append("product_id", productId);
    fd.append("is_primary", String(isPrimary));
    fd.append("file", file);
    return fetch(`${API_BASE_URL}/inventory/product-images/upload-single`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      body: fd,
    }).then(async (r) => {
      if (!r.ok) {
        const detail = await r.text();
        throw { detail, status: r.status };
      }
      return r.json() as Promise<{ success: boolean; image_url: string; product_id: string; product_name: string }>;
    });
  },

  bulkUploadImagesByBarcode: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return fetch(`${API_BASE_URL}/inventory/product-images/bulk-upload-by-barcode`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
      body: fd,
    }).then(async (r) => {
      if (!r.ok) {
        const detail = await r.text();
        throw { detail, status: r.status };
      }
      return r.json() as Promise<{
        total_files: number;
        matched_count: number;
        unmatched_count: number;
        results: Array<{
          filename: string;
          matched: boolean;
          product_id?: string;
          product_name?: string;
          sku?: string;
          barcode?: string;
          image_url?: string;
          searched_code?: string;
          error?: string;
        }>;
      }>;
    });
  },

  // Operations - GRN
  getGoodsReceipts: () => request<GoodsReceipt[]>("GET", "/inventory/grn"),
  createGoodsReceipt: (data: Record<string, unknown>) => request<GoodsReceipt>("POST", "/inventory/grn", data),
  updateGoodsReceipt: (id: string, data: Record<string, unknown>) => request<GoodsReceipt>("PUT", `/inventory/grn/${id}`, data),
  deleteGoodsReceipt: (id: string) => request<void>("DELETE", `/inventory/grn/${id}`),

  // Operations - Goods Issue
  getGoodsIssues: () => request<GoodsIssue[]>("GET", "/inventory/goods-issue"),
  createGoodsIssue: (data: Record<string, unknown>) => request<GoodsIssue>("POST", "/inventory/goods-issue", data),
  deleteGoodsIssue: (id: string) => request<void>("DELETE", `/inventory/goods-issue/${id}`),

  // Operations - Stock Movement
  getStockMovements: () => request<StockMovement[]>("GET", "/inventory/movements"),
  createStockMovement: (data: Record<string, unknown>) => request<StockMovement>("POST", "/inventory/movements", data),
  deleteStockMovement: (id: string) => request<void>("DELETE", `/inventory/movements/${id}`),

  // Operations - Stock Adjustment
  getStockAdjustments: () => request<StockAdjustment[]>("GET", "/inventory/adjustments"),
  createStockAdjustment: (data: Record<string, unknown>) => request<StockAdjustment>("POST", "/inventory/adjustments", data),
  createStockAdjustmentBatch: (data: {
    adjustment_number: string;
    warehouse?: string;
    adjustment_type?: string;
    reason?: string;
    items: Array<{
      product_id: string;
      adjustment_type?: string;
      quantity_changed: number;
      reason?: string;
      unit_price?: number;
    }>;
  }) => request<StockAdjustment[]>("POST", "/inventory/adjustments/batch", data as unknown as Record<string, unknown>),
  deleteStockAdjustment: (id: string) => request<void>("DELETE", `/inventory/adjustments/${id}`),

  // Operations - Cycle Counting
  getCycleCounts: () => request<CycleCount[]>("GET", "/inventory/cycle-counts"),
  createCycleCount: (data: Record<string, unknown>) => request<CycleCount>("POST", "/inventory/cycle-counts", data),
  deleteCycleCount: (id: string) => request<void>("DELETE", `/inventory/cycle-counts/${id}`),

  // Operations - Overview
  getOperationsOverview: () => request<{
    available: number;
    reserved: number;
    damaged: number;
    transit: number;
    expired: number;
    valuation: Record<string, { value: string; pct: number }>;
  }>("GET", "/inventory/operations/overview"),

  // Intelligence
  getIntelligence: () => request<IntelligenceSummary>("GET", "/inventory/intelligence/summary"),

  // Warehouse Management
  getWarehouses: () => request<Warehouse[]>("GET", "/inventory/warehouses"),
  createWarehouse: (data: Record<string, unknown>) => request<Warehouse>("POST", "/inventory/warehouses", data),
  deleteWarehouse: (id: string) => request<void>("DELETE", `/inventory/warehouses/${id}`),

  getStorageLocations: () => request<StorageLocation[]>("GET", "/inventory/locations"),
  createStorageLocation: (warehouseId: string, data: Record<string, unknown>) => request<StorageLocation>("POST", `/inventory/warehouses/${warehouseId}/locations`, data),
  deleteStorageLocation: (id: string) => request<void>("DELETE", `/inventory/locations/${id}`),

  // Put-Away Rules
  getPutAwayRules: () => request<PutAwayRule[]>("GET", "/inventory/put-away-rules"),
  createPutAwayRule: (data: Record<string, unknown>) => request<PutAwayRule>("POST", "/inventory/put-away-rules", data),
  updatePutAwayRule: (id: string, data: Record<string, unknown>) => request<PutAwayRule>("PATCH", `/inventory/put-away-rules/${id}`, data),
  deletePutAwayRule: (id: string) => request<void>("DELETE", `/inventory/put-away-rules/${id}`),

  // Picking Rules
  getPickingRules: () => request<PickingRule[]>("GET", "/inventory/picking-rules"),
  createPickingRule: (data: Record<string, unknown>) => request<PickingRule>("POST", "/inventory/picking-rules", data),
  updatePickingRule: (id: string, data: Record<string, unknown>) => request<PickingRule>("PATCH", `/inventory/picking-rules/${id}`, data),
  deletePickingRule: (id: string) => request<void>("DELETE", `/inventory/picking-rules/${id}`),


  // Batch & Serial Numbers
  getBatches: (params?: { search?: string; product_id?: string; warehouse_id?: string; status?: string }) =>
    request<InventoryBatch[]>("GET", "/inventory/batches", undefined, params as Record<string, any>),
  createBatch: (data: Record<string, unknown>) => request<InventoryBatch>("POST", "/inventory/batches", data),
  updateBatch: (id: string, data: Record<string, unknown>) => request<InventoryBatch>("PATCH", `/inventory/batches/${id}`, data),
  deleteBatch: (id: string) => request<void>("DELETE", `/inventory/batches/${id}`),

  getSerials: (params?: { batch_id?: string; warehouse_id?: string; status?: string; search?: string }) =>
    request<InventorySerial[]>("GET", "/inventory/serials", undefined, params as Record<string, any>),
  createSerial: (data: Record<string, unknown>) => request<InventorySerial>("POST", "/inventory/serials", data),
  updateSerial: (id: string, data: Record<string, unknown>) => request<InventorySerial>("PATCH", `/inventory/serials/${id}`, data),
  deleteSerial: (id: string) => request<void>("DELETE", `/inventory/serials/${id}`),

  // Traceability
  getTraceabilityEvents: (params?: { batch_id?: string; serial_id?: string; event_type?: string }) =>
    request<TraceabilityEvent[]>("GET", "/inventory/traceability/events", undefined, params as Record<string, any>),
  createTraceabilityEvent: (data: Record<string, unknown>) => request<TraceabilityEvent>("POST", "/inventory/traceability/events", data),
  getBatchGenealogy: (batchId: string) => request<BatchGenealogy>("GET", `/inventory/traceability/genealogy/${batchId}`),

  // Expiry Management
  getExpirySummary: () => request<ExpirySummary>("GET", "/inventory/expiry/summary"),
  getExpiryList: (bucket?: string) => request<ExpiryBatchItem[]>("GET", `/inventory/expiry/list${bucket ? `?bucket=${bucket}` : ''}`),
  applyExpiryDiscount: (batchId: string, discountPercent: number) => request<any>("POST", `/inventory/expiry/apply-discount?batch_id=${batchId}&discount_percent=${discountPercent}`),
  writeOffExpired: (batchId: string, reason?: string) => request<any>("POST", `/inventory/expiry/write-off?batch_id=${batchId}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`),

  // Manufacturing Dates
  getManufacturingCohorts: () => request<ManufacturingCohorts>("GET", "/inventory/manufacturing/cohorts"),
  getManufacturingList: () => request<any[]>("GET", "/inventory/manufacturing/list"),

  // Barcodes
  getBarcodes: (search?: string) => request<ProductBarcode[]>("GET", `/inventory/barcodes${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  generateBarcode: (productId: string, format: "EAN-13" | "Code-128" = "EAN-13", prefix?: string, force: boolean = false) =>
    request<any>("POST", `/inventory/barcodes/generate?product_id=${productId}&format=${format}${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ""}${force ? `&force=true` : ""}`),
  generateBulkBarcodes: (format: "EAN-13" | "Code-128" = "EAN-13", productIds?: string[]) =>
    request<{ message: string; generated_count: number; products: ProductBarcode[] }>(
      "POST",
      `/inventory/barcodes/generate-bulk?format=${format}${productIds && productIds.length > 0 ? `&product_ids=${encodeURIComponent(productIds.join(","))}` : ""}`
    ),
  batchPrintBarcodes: (productIds: string[]) => request<any>("POST", "/inventory/barcodes/batch-print", undefined, { product_ids: productIds } as Record<string, any>),

  // QR Codes
  getQRCodes: (params?: { product_id?: string; search?: string }) => request<ProductQRCode[]>("GET", "/inventory/qrcodes", undefined, params as Record<string, any>),
  createQRCode: (data: Record<string, unknown>) => request<ProductQRCode>("POST", "/inventory/qrcodes", data),
  updateQRCode: (id: string, data: Record<string, unknown>) => request<ProductQRCode>("PATCH", `/inventory/qrcodes/${id}`, data),
  deleteQRCode: (id: string) => request<void>("DELETE", `/inventory/qrcodes/${id}`),
  printQRCode: (id: string) => request<any>("POST", `/inventory/qrcodes/${id}/print`),

  // RFID
  getRFIDs: (params?: { product_id?: string; status?: string; search?: string }) => request<ProductRFID[]>("GET", "/inventory/rfids", undefined, params as Record<string, any>),
  createRFID: (data: Record<string, unknown>) => request<ProductRFID>("POST", "/inventory/rfids", data),
  updateRFID: (id: string, data: Record<string, unknown>) => request<ProductRFID>("PATCH", `/inventory/rfids/${id}`, data),
  deleteRFID: (id: string) => request<void>("DELETE", `/inventory/rfids/${id}`),
  scanRFID: (id: string, location: string) => request<ProductRFID>("POST", `/inventory/rfids/${id}/scan?location=${encodeURIComponent(location)}`),


  // --- Procurement & Supplier Management ---
  getSuppliers: (params?: { search?: string; status?: string }) => request<any[]>("GET", "/inventory/procurement/suppliers", undefined, params),
  createSupplier: (data: any) => request<any>("POST", "/inventory/procurement/suppliers", data),
  updateSupplier: (id: string, data: any) => request<any>("PATCH", `/inventory/procurement/suppliers/${id}`, data),
  deleteSupplier: (id: string) => request<any>("DELETE", `/inventory/procurement/suppliers/${id}`),

  getSupplierCategories: () => request<any[]>("GET", "/inventory/procurement/supplier-categories"),
  createSupplierCategory: (data: any) => request<any>("POST", "/inventory/procurement/supplier-categories", data),

  getSupplierContacts: (params?: { supplier_id?: string }) => request<any[]>("GET", "/inventory/procurement/supplier-contacts", undefined, params),
  createSupplierContact: (data: any) => request<any>("POST", "/inventory/procurement/supplier-contacts", data),

  getSupplierContracts: (params?: { supplier_id?: string }) => request<any[]>("GET", "/inventory/procurement/supplier-contracts", undefined, params),
  createSupplierContract: (data: any) => request<any>("POST", "/inventory/procurement/supplier-contracts", data),

  getSupplierPerformance: (params?: { supplier_id?: string }) => request<any[]>("GET", "/inventory/procurement/supplier-performance", undefined, params),
  createSupplierPerformance: (data: any) => request<any>("POST", "/inventory/procurement/supplier-performance", data),

  getBlacklistedSuppliers: () => request<any[]>("GET", "/inventory/procurement/blacklisted-suppliers"),
  blacklistSupplier: (data: any) => request<any>("POST", "/inventory/procurement/blacklisted-suppliers", data),

  getPurchaseRequests: () => request<any[]>("GET", "/inventory/procurement/purchase-requests"),
  createPurchaseRequest: (data: any) => request<any>("POST", "/inventory/procurement/purchase-requests", data),

  getPurchaseQuotations: () => request<any[]>("GET", "/inventory/procurement/purchase-quotations"),
  createPurchaseQuotation: (data: any) => request<any>("POST", "/inventory/procurement/purchase-quotations", data),
  updatePurchaseQuotation: (id: string, data: any) => request<any>("PUT", `/inventory/procurement/purchase-quotations/${id}`, data),
  deletePurchaseQuotation: (id: string) => request<void>("DELETE", `/inventory/procurement/purchase-quotations/${id}`),

  getPurchaseOrders: () => request<any[]>("GET", "/inventory/procurement/purchase-orders"),
  createPurchaseOrder: (data: any) => request<any>("POST", "/inventory/procurement/purchase-orders", data),
  updatePurchaseOrder: (id: string, data: any) => request<any>("PATCH", `/inventory/procurement/purchase-orders/${id}`, data),
  updatePurchaseOrderStatus: (id: string, status: string) => request<any>("PATCH", `/inventory/procurement/purchase-orders/${id}`, { status }),

  getGoodsReceivedNotes: () => request<any[]>("GET", "/inventory/procurement/goods-received-notes"),
  createGoodsReceivedNote: (data: any) => request<any>("POST", "/inventory/procurement/goods-received-notes", data),
  updateGoodsReceivedNote: (id: string, data: any) => request<any>("PATCH", `/inventory/procurement/goods-received-notes/${id}`, data),
  deleteGoodsReceivedNote: (id: string) => request<void>("DELETE", `/inventory/procurement/goods-received-notes/${id}`),

  extractPRDocumentOCR: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{filename: string; extracted: boolean; pr_number?: string; department?: string; priority?: string; purpose_justification?: string; items?: any[]; confidence?: number}>("POST", "/inventory/procurement/ocr/extract-pr-document", fd);
  },
  extractQuotationOCR: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{filename: string; extracted: boolean; supplier_name?: string; quoted_unit_price?: number; delivery_lead_days?: number; payment_terms?: string}>("POST", "/inventory/procurement/extract-quotation-ocr", fd);
  },
  extractPODocumentOCR: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{filename: string; extracted: boolean; po_number?: string; supplier_name?: string; delivery_date?: string; items?: any[]; notes?: string; confidence?: number}>("POST", "/inventory/procurement/ocr/extract-po-document", fd);
  },
  extractGRNDocumentOCR: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{filename: string; extracted: boolean; grn_number?: string; received_date?: string; items?: any[]; notes?: string; confidence?: number}>("POST", "/inventory/procurement/ocr/extract-grn-document", fd);
  },
  extractInvoiceDocumentOCR: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{filename: string; extracted: boolean; bill_number?: string; supplier_name?: string; total_amount?: number; due_date?: string; po_reference?: string; items?: any[]; notes?: string; confidence?: number}>("POST", "/inventory/procurement/ocr/extract-invoice-document", fd);
  },

  getPurchaseReturns: () => request<any[]>("GET", "/inventory/procurement/purchase-returns"),
  createPurchaseReturn: (data: any) => request<any>("POST", "/inventory/procurement/purchase-returns", data),

  getVendorBills: () => request<any[]>("GET", "/inventory/procurement/vendor-bills"),
  createVendorBill: (data: any) => request<any>("POST", "/inventory/procurement/vendor-bills", data),

  getVendorPayments: () => request<any[]>("GET", "/inventory/procurement/vendor-payments"),
  createVendorPayment: (data: any) => request<any>("POST", "/inventory/procurement/vendor-payments", data),

  getVendorCreditNotes: () => request<any[]>("GET", "/inventory/procurement/credit-notes"),
  createVendorCreditNote: (data: any) => request<any>("POST", "/inventory/procurement/credit-notes", data),
  getVendorDebitNotes: () => request<any[]>("GET", "/inventory/procurement/debit-notes"),
  createVendorDebitNote: (data: any) => request<any>("POST", "/inventory/procurement/debit-notes", data),

  getSpendAnalysis: () => request<any>("GET", "/inventory/procurement/analytics/spend-analysis"),
  getLeadTimeAnalysis: () => request<any[]>("GET", "/inventory/procurement/analytics/lead-time"),
  getAISuggestions: (refresh = false) => request<any[]>("GET", `/inventory/procurement/analytics/ai-suggestions?refresh=${refresh}`),
  executeAISuggestion: (id: string) => request<{ message: string; purchase_request_id?: string }>("POST", `/inventory/procurement/analytics/ai-suggestions/${id}/execute`),
  getCostAnalysis: () => request<any>("GET", "/inventory/procurement/analytics/cost-analysis"),
  getProcurementForecast: () => request<any>("GET", "/inventory/procurement/analytics/procurement-forecast"),
  getPendingApprovals: () => request<any[]>("GET", "/inventory/procurement/analytics/approvals"),
  submitApprovalAction: (id: string, raw_type: string, action: string) => request<any>("POST", `/inventory/procurement/analytics/approvals/${id}/action`, { raw_type, action }),

  // --- Real-time Analytics & Intelligence ---
  getReportData: (tab: string) => request<any>("GET", `/analytics/reports/${tab}`),
  consultAIReport: (tab: string, query: string, contextData: any) => request<{ answer: string }>("POST", `/analytics/reports/${tab}/ai-consult`, { query, contextData }),
  getReportBuilderPresets: () => request<any>("GET", "/analytics/report-builder/presets"),
  generateCustomReport: (payload: any) => request<any>("POST", "/analytics/report-builder/generate", payload),

  // --- Zoho Recruit Integration ---
  getZohoStatus: () => request<any>("GET", "/integrations/zoho/status"),
  connectZoho: () => request<{ url: string }>("GET", "/integrations/zoho/connect"),
  disconnectZoho: () => request<any>("DELETE", "/integrations/zoho/disconnect"),
  testZohoConnection: () => request<any>("POST", "/integrations/zoho/test"),
  publishJobToZoho: (jobId: string) => request<any>("POST", "/integrations/zoho/jobs/publish", { job_id: jobId }),
  syncJobsFromZoho: () => request<{ success: boolean; message: string; created: number; updated: number; total_from_zoho: number }>("POST", "/integrations/zoho/sync-from-zoho"),
};

// ═══════════════════════════════════════════════════════════════
//  ACCOUNTING & FINANCE API
// ═══════════════════════════════════════════════════════════════

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  description: string | null;
  account_type: string;
  account_sub_type: string | null;
  parent_id: string | null;
  is_control_account: boolean;
  is_active: boolean;
  opening_balance: number;
  allow_posting: boolean;
  sort_order: number;
  currency_code: string | null;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_type: string;
  status: string;
  entry_date: string;
  reference: string | null;
  description: string | null;
  total_debit: number;
  total_credit: number;
  currency_code: string;
  source_module: string | null;
  lines?: JournalEntryLine[];
}

export interface JournalEntryLine {
  id: string;
  account_id: string;
  account_name?: string;
  account_code?: string;
  debit: number;
  credit: number;
  description: string | null;
  cost_center_id: string | null;
}

export interface BankAccountRecord {
  id: string;
  name: string;
  account_number: string | null;
  ifsc_code: string | null;
  bank_name: string | null;
  branch_name: string | null;
  account_type: string;
  currency_code: string;
  opening_balance: number;
  current_balance: number;
  status: string;
  is_default: boolean;
  chart_of_account_id?: string;
}

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  transaction_type: string;
  amount: number;
  running_balance: number | null;
  is_reconciled: boolean;
  is_manual: boolean;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  customer_id: string | null;
  customer_name?: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency_code: string;
  notes: string | null;
}

export interface FixedAsset {
  id: string;
  asset_number: string;
  name: string;
  description: string | null;
  status: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  depreciation_method: string;
  useful_life_years: number;
  accumulated_depreciation: number;
  book_value: number;
  location: string | null;
}

export interface FixedAssetCategory {
  id: string;
  name: string;
  description: string | null;
  useful_life_years: number;
  depreciation_method: string;
  salvage_value_percent: number;
  status: string;
}

export interface ExpenseClaimLine {
  id?: string;
  claim_id?: string;
  expense_date: string;
  category: string;
  description?: string | null;
  amount: number;
  payment_mode?: string | null;
  receipt_url?: string | null;
  cost_center_id?: string | null;
}

export interface ExpenseClaim {
  id: string;
  tenant_id?: string;
  company_id?: string | null;
  employee_id?: string | null;
  claim_number: string;
  status: string;
  claim_date: string;
  total_amount: number;
  description: string | null;
  payment_mode?: string | null;
  receipt_photo?: string | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  payment_journal_entry_id?: string | null;
  rejection_reason?: string | null;
  lines?: ExpenseClaimLine[];
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: string;
  name: string;
  fiscal_year_id: string;
  cost_center_id: string | null;
  status: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
}

export const accountingApi = {
  // Chart of Accounts
  listAccounts: (params?: { page?: number; page_size?: number; account_type?: string; search?: string; is_active?: boolean }) =>
    request<PaginatedResponse<ChartOfAccount>>("GET", "/accounting/accounts", undefined, params),
  getAccount: (id: string) => request<ChartOfAccount>("GET", `/accounting/accounts/${id}`),
  createAccount: (data: Partial<ChartOfAccount>) => request<ChartOfAccount>("POST", "/accounting/accounts", data),
  updateAccount: (id: string, data: Partial<ChartOfAccount>) => request<ChartOfAccount>("PATCH", `/accounting/accounts/${id}`, data),
  deleteAccount: (id: string) => request<{ message: string }>("DELETE", `/accounting/accounts/${id}`),

  // General Ledger
  getGeneralLedger: (params?: { account_id?: string; date_from?: string; date_to?: string; entry_type?: string }) =>
    request<any[]>("GET", "/accounting/general-ledger", undefined, params),
  getAccountTree: (params?: { account_type?: string }) =>
    request<ChartOfAccount[]>("GET", "/accounting/accounts/tree", undefined, params),

  // Opening Balances
  getOpeningBalances: (params?: { account_type?: string; search?: string }) =>
    request<ChartOfAccount[]>("GET", "/accounting/opening-balances", undefined, params),
  updateOpeningBalance: (id: string, data: { opening_balance: number }) =>
    request<ChartOfAccount>("PATCH", `/accounting/opening-balances/${id}`, data),

  // Journal Entries
  listJournalEntries: (params?: { page?: number; page_size?: number; entry_type?: string; status?: string; search?: string }) =>
    request<PaginatedResponse<JournalEntry>>("GET", "/accounting/journal-entries", undefined, params),
  getJournalEntry: (id: string) => request<JournalEntry>("GET", `/accounting/journal-entries/${id}`),
  createJournalEntry: (data: any) => request<JournalEntry>("POST", "/accounting/journal-entries", data),
  postJournalEntry: (id: string) => request<JournalEntry>("POST", `/accounting/journal-entries/${id}/post`),
  voidJournalEntry: (id: string, reason: string) => request<JournalEntry>("POST", `/accounting/journal-entries/${id}/void`, { reason }),
};

export const bankApi = {
  // Bank Accounts
  listBankAccounts: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    request<PaginatedResponse<BankAccountRecord>>("GET", "/bank/accounts", undefined, params),
  getBankAccount: (id: string) => request<BankAccountRecord>("GET", `/bank/accounts/${id}`),
  createBankAccount: (data: Partial<BankAccountRecord>) => request<BankAccountRecord>("POST", "/bank/accounts", data),
  updateBankAccount: (id: string, data: Partial<BankAccountRecord>) => request<BankAccountRecord>("PATCH", `/bank/accounts/${id}`, data),

  // Transactions
  listTransactions: (bankAccountId: string, params?: { page?: number; page_size?: number }) =>
    request<PaginatedResponse<BankTransaction>>("GET", `/bank/accounts/${bankAccountId}/transactions`, undefined, params),
  createTransaction: (bankAccountId: string, data: Partial<BankTransaction>) =>
    request<BankTransaction>("POST", `/bank/accounts/${bankAccountId}/transactions`, data),

  // Reconciliations
  listReconciliations: (params?: { page?: number; page_size?: number; bank_account_id?: string; status?: string }) =>
    request<PaginatedResponse<any>>("GET", "/bank/reconciliations", undefined, params),
  getReconciliation: (id: string) => request<any>("GET", `/bank/reconciliations/${id}`),
  createReconciliation: (data: any) => request<any>("POST", "/bank/reconciliations", data),
  completeReconciliation: (id: string) => request<any>("POST", `/bank/reconciliations/${id}/complete`),
};

export const invoicesApi = {
  listInvoices: (params?: { page?: number; page_size?: number; status?: string; invoice_type?: string; search?: string }) =>
    request<PaginatedResponse<Invoice>>("GET", "/invoices", undefined, params),
  getInvoice: (id: string) => request<Invoice>("GET", `/invoices/${id}`),
  getCustomerSummary: (customerId: string) => request<any>("GET", `/invoices/customer-summary/${customerId}`),
  createInvoice: (data: any) => request<Invoice>("POST", "/invoices", data),
  sendInvoice: (id: string) => request<{ message: string }>("POST", `/invoices/${id}/send`),
  sendInvoiceToWhatsApp: (id: string, phone?: string) =>
    request<{ success: boolean; message_id?: string; error?: string }>(
      "POST",
      `/invoices/${id}/send-to-whatsapp${phone ? `?phone=${encodeURIComponent(phone)}` : ""}`
    ),
  recordPayment: (id: string, data: { amount: number; payment_date: string; payment_method?: string }) =>
    request<{ message: string }>("POST", `/invoices/${id}/payments`, data),
  cancelInvoice: (id: string, reason?: string) =>
    request<{ status: string; invoice_id: string; invoice_number: string; message: string; restocked_items_count?: number }>(
      "POST",
      `/invoices/${id}/cancel`,
      { reason }
    ),
  updateInvoice: (id: string, data: any) =>
    request<Invoice>("PATCH", `/invoices/${id}`, data),
  listPayments: (params?: { page?: number; page_size?: number }) =>
    request<PaginatedResponse<any>>("GET", "/invoices/payments/all", undefined, params),
};

export const paymentRemindersApi = {
  getSummary: () => request<any>("GET", "/invoices/reminders/summary"),
  getPolicy: () => request<any>("GET", "/invoices/reminders/policy"),
  updatePolicy: (data: any) => request<{ message: string }>("PUT", "/invoices/reminders/policy", data),
  evaluateBatch: () => request<any>("POST", "/invoices/reminders/evaluate-batch"),
  sendSingleReminder: (invoiceId: string, data?: { custom_note?: string }) =>
    request<{ message: string; result: any }>("POST", `/invoices/reminders/invoices/${invoiceId}/send-now`, data),
  getLogs: (params?: { channel?: string; limit?: number }) =>
    request<any[]>("GET", "/invoices/reminders/logs", undefined, params),
};

export const fixedAssetsApi = {
  listAssets: (params?: { page?: number; page_size?: number; status?: string; search?: string; category_id?: string }) =>
    request<PaginatedResponse<FixedAsset>>("GET", "/fixed-assets", undefined, params),
  getAsset: (id: string) => request<FixedAsset>("GET", `/fixed-assets/${id}`),
  createAsset: (data: any) => request<FixedAsset>("POST", "/fixed-assets", data),
  runDepreciation: (id: string, data: { depreciation_date: string; period_months?: number }) =>
    request<any>("POST", `/fixed-assets/${id}/depreciate`, data),
  listCategories: () => request<FixedAssetCategory[]>("GET", "/fixed-assets/categories"),
  createCategory: (data: any) => request<FixedAssetCategory>("POST", "/fixed-assets/categories", data),
};

export const expenseClaimsApi = {
  listExpenseClaims: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    request<PaginatedResponse<ExpenseClaim>>("GET", "/expense-claims", undefined, params),
  getSummary: () => request<any>("GET", "/expense-claims/summary"),
  getExpenseClaim: (id: string) => request<ExpenseClaim>("GET", `/expense-claims/${id}`),
  createExpenseClaim: (data: any) => request<ExpenseClaim>("POST", "/expense-claims", data),
  updateExpenseClaim: (id: string, data: any) => request<ExpenseClaim>("PATCH", `/expense-claims/${id}`, data),
  deleteExpenseClaim: (id: string) => request<void>("DELETE", `/expense-claims/${id}`),
  approveExpenseClaim: (id: string, note?: string) =>
    request<{ message: string }>("POST", `/expense-claims/${id}/approve`, { note }),
  rejectExpenseClaim: (id: string, reason: string) =>
    request<{ message: string }>("POST", `/expense-claims/${id}/reject`, { reason }),
  payExpenseClaim: (id: string) =>
    request<{ message: string }>("POST", `/expense-claims/${id}/pay`),
  batchApprove: (ids: string[]) =>
    request<{ message: string; count: number }>("POST", "/expense-claims/batch-approve", { ids }),
  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("auth_token") || localStorage.getItem("accessToken") || "";
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"}/expense-claims/upload-receipt`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload receipt proof");
    return res.json() as Promise<{ url: string; filename: string }>;
  },
};

export const budgetsApi = {
  listBudgets: (params?: { page?: number; page_size?: number; status?: string }) =>
    request<PaginatedResponse<Budget>>("GET", "/budgets", undefined, params),
  getBudget: (id: string) => request<Budget>("GET", `/budgets/${id}`),
  createBudget: (data: any) => request<Budget>("POST", "/budgets", data),
};

// ─── Financial Reports ──────────────────────────────────────────────────

export interface ProfitAndLossReport {
  meta: { title: string; from_date: string; to_date: string; currency: string };
  income: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_income: number;
  cogs: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_cogs: number;
  gross_profit: number;
  expenses: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_expenses: number;
  net_profit: number;
}

export interface BalanceSheetReport {
  meta: { title: string; from_date: string; to_date: string; currency: string };
  assets: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_assets: number;
  liabilities: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_liabilities: number;
  equity: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_equity: number;
  total_liabilities_and_equity: number;
}

export interface CashFlowReport {
  meta: { title: string; from_date: string; to_date: string; currency: string };
  operating: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  net_operating: number;
  investing: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  net_investing: number;
  financing: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  net_financing: number;
  net_cash_flow: number;
}

export interface TrialBalanceReport {
  meta: { title: string; from_date: string; to_date: string; currency: string };
  entries: Array<{ account_code: string; account_name: string; account_type: string; debit: number; credit: number; net: number }>;
  total_debit: number;
  total_credit: number;
}

export interface ARAgingReport {
  meta: { title: string; from_date: string; to_date: string; currency: string };
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  total_outstanding: number;
}

export const financialReportsApi = {
  profitAndLoss: (params: { from_date: string; to_date: string; company_id?: string }) =>
    request<ProfitAndLossReport>("GET", "/financial-reports/profit-and-loss", undefined, params),
  balanceSheet: (params: { as_of: string; company_id?: string }) =>
    request<BalanceSheetReport>("GET", "/financial-reports/balance-sheet", undefined, params),
  cashFlow: (params: { from_date: string; to_date: string; company_id?: string }) =>
    request<CashFlowReport>("GET", "/financial-reports/cash-flow", undefined, params),
  trialBalance: (params: { from_date: string; to_date: string; company_id?: string }) =>
    request<TrialBalanceReport>("GET", "/financial-reports/trial-balance", undefined, params),
  arAging: (params: { as_of: string; company_id?: string }) =>
    request<ARAgingReport>("GET", "/financial-reports/ar-aging", undefined, params),
};

// ─── Tax ─────────────────────────────────────────────────────────────────

export interface TaxCode {
  id: string;
  name: string;
  code: string;
  tax_type: string;
  rate?: number;
  rate_percent?: number;
  is_inclusive: boolean;
  is_reverse_charge?: boolean;
  is_active?: boolean;
  status?: string;
  effective_from?: string;
}

export interface TaxReturn {
  id: string;
  return_type: string;
  period: string;
  period_start: string | null;
  period_end: string | null;
  total_taxable_value: number;
  total_tax_amount: number;
  status: string;
  filed_at: string | null;
  acknowledgment_number: string | null;
}

export interface TaxPayment {
  id: string;
  tax_return_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  status: string;
}

export const taxApi = {
  listTaxCodes: (params?: { tax_type?: string; is_active?: boolean }) =>
    request<PaginatedResponse<TaxCode>>("GET", "/tax/codes", undefined, params),
  createTaxCode: (data: Partial<TaxCode>) => request<TaxCode>("POST", "/tax/codes", data),
  updateTaxCode: (id: string, data: Partial<TaxCode>) => request<TaxCode>("PATCH", `/tax/codes/${id}`, data),
  deleteTaxCode: (id: string) => request<{ message: string }>("DELETE", `/tax/codes/${id}`),

  listTaxReturns: (params?: { tax_type?: string; status?: string; period_start?: string; period_end?: string }) =>
    request<PaginatedResponse<TaxReturn>>("GET", "/tax/returns", undefined, params),
  createTaxReturn: (data: Partial<TaxReturn>) => request<TaxReturn>("POST", "/tax/returns", data),
  updateTaxReturn: (id: string, data: Partial<TaxReturn>) => request<TaxReturn>("PATCH", `/tax/returns/${id}`, data),
  fileTaxReturn: (id: string) => request<{ message: string }>("POST", `/tax/returns/${id}/file`),
  deleteTaxReturn: (id: string) => request<{ message: string }>("DELETE", `/tax/returns/${id}`),

  listTaxPayments: (params?: { tax_return_id?: string; status?: string }) =>
    request<PaginatedResponse<TaxPayment>>("GET", "/tax/payments", undefined, params),
  createTaxPayment: (data: Partial<TaxPayment>) => request<TaxPayment>("POST", "/tax/payments", data),
  updateTaxPayment: (id: string, data: Partial<TaxPayment>) => request<TaxPayment>("PATCH", `/tax/payments/${id}`, data),
  deleteTaxPayment: (id: string) => request<{ message: string }>("DELETE", `/tax/payments/${id}`),
};

// ─── CRM & Sales ─────────────────────────────────────────────────────────────

export const crmApi = {
  // Intelligence
  getIntelligenceAnalytics: () => request<any>("GET", "/crm/intelligence/analytics"),
  getChurnPrediction: () => request<any>("GET", "/crm/intelligence/churn"),
  getLifetimeValue: () => request<any>("GET", "/crm/intelligence/lifetime-value"),
  getPurchaseBehaviour: () => request<any>("GET", "/crm/intelligence/purchase-behaviour"),
  getRfmAnalysis: () => request<any>("GET", "/crm/intelligence/rfm"),
  getRecommendations: () => request<any>("GET", "/crm/intelligence/recommendations"),
  
  // Facebook Ads & Marketing
  getAdHistory: (page = 1, pageSize = 50) => request<any>("GET", "/crm/campaigns/ad-history", undefined, { page, page_size: pageSize }),
  getFacebookCampaigns: () => request<any>("GET", "/crm/facebook/campaigns"),
  
  // Pipeline & Core
  getOpportunities: () => request<any>("GET", "/crm/opportunities"),
  getLeads: (page = 1, pageSize = 100) => request<any>("GET", "/crm/leads", undefined, { page, page_size: pageSize }),
  getCustomers: (page = 1, pageSize = 200) => request<any>("GET", "/crm/customers", undefined, { page, page_size: pageSize }),
  createCustomer: (data: any) => request<any>("POST", "/crm/customers", data),
  getQuotations: () => request<any>("GET", "/crm/quotations"),
  getSalesOrders: () => request<any>("GET", "/crm/sales-orders")
};

export const whatsappAutomationApi = {
  getSessions: () => request<any>("GET", "/whatsapp-automation/sessions"),
  startSession: (sessionId: string) => request<any>("POST", `/whatsapp-automation/sessions/${sessionId}/start`),
  logoutSession: (sessionId: string) => request<any>("POST", `/whatsapp-automation/sessions/${sessionId}/logout`),
  getContacts: (sessionId: string) => request<any>("GET", `/whatsapp-automation/sessions/${sessionId}/contacts`),
  syncContacts: (sessionId: string, contacts: any[]) => request<any>("POST", `/whatsapp-automation/sessions/${sessionId}/sync`, { contacts }),
  getChatMessages: (sessionId: string, phone: string) => request<any>("GET", `/whatsapp-automation/sessions/${sessionId}/chats/${phone}/messages`),
  sendMessage: (sessionId: string, phone: string, message: string) => request<any>("POST", `/whatsapp-automation/sessions/${sessionId}/chats/${phone}/send`, { message }),
  sendMedia: (sessionId: string, phone: string, media: { mimeType: string; data: string; fileName?: string; caption?: string }) =>
    request<any>("POST", `/whatsapp-automation/sessions/${sessionId}/chats/${phone}/send-media`, media),
  getActiveChats: (sessionId: string) => request<any>("GET", `/whatsapp-automation/sessions/${sessionId}/chats`),
};

export const procurementApi = {
  lookupGstin: (gstin: string) => inventoryApi.verifyGstin(gstin),
  verifyGstin: (gstin: string) => inventoryApi.verifyGstin(gstin),
  getVendors: (page = 1, pageSize = 200) => request<any>("GET", "/erp/procurement/vendors", undefined, { page, page_size: pageSize }),
  getVendorSummary: (vendorId: string) => request<any>("GET", `/erp/procurement/vendors/${vendorId}/summary`),
  listVendorPayments: () => request<any>("GET", "/erp/procurement/payments"),
  recordVendorPayment: (vendorId: string, data: any) => request<any>("POST", `/erp/procurement/vendors/${vendorId}/payments`, data),
};

export const deliveryChallanApi = {
  getChallans: (page = 1, pageSize = 50, filters?: any) => request<any>("GET", "/erp/delivery-challans", undefined, { page, page_size: pageSize, ...filters }),
  getChallan: (id: string) => request<any>("GET", `/erp/delivery-challans/${id}`),
  createChallan: (data: any) => request<any>("POST", "/erp/delivery-challans", data),
  updateChallan: (id: string, data: any) => request<any>("PUT", `/erp/delivery-challans/${id}`, data),
  deleteChallan: (id: string) => request<void>("DELETE", `/erp/delivery-challans/${id}`),
  dispatchChallan: (id: string) => request<any>("POST", `/erp/delivery-challans/${id}/dispatch`),
};

export interface CopilotChatResponse {
  reply: string;
  widget?: "sales" | "inventory" | "payroll" | null;
  direct_link?: string | null;
  suggested_actions?: string[];
}

export const copilotApi = {
  chat: (message: string, history: { role: string; content: string }[] = []) =>
    request<CopilotChatResponse>("POST", "/copilot/chat", { message, history }),
  getSuggestions: () =>
    request<{ title: string; category: string }[]>("GET", "/copilot/suggestions"),
};

export const ewayBillApi = {
  generateEWayBill: (payload: {
    invoice_id?: string;
    invoice_number: string;
    invoice_date?: string;
    total_amount: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    from_gstin?: string;
    from_trade_name?: string;
    from_address?: string;
    from_city?: string;
    from_pincode?: string;
    to_gstin?: string;
    to_customer_name?: string;
    to_address?: string;
    to_city?: string;
    to_pincode?: string;
    transporter_id?: string;
    transporter_name?: string;
    lr_number?: string;
    vehicle_number: string;
    transport_mode?: string;
    approx_distance_km?: number;
    vehicle_type?: string;
    items?: any[];
  }) => request<any>("POST", "/erp/eway-bill/generate", payload),
  cancelEWayBill: (payload: { eway_bill_number: string; cancel_reason_code?: string; remarks?: string }) =>
    request<any>("POST", "/erp/eway-bill/cancel", payload),
  updateVehicle: (payload: {
    eway_bill_number: string;
    vehicle_no: string;
    from_place?: string;
    from_state?: string;
    reason_code?: string;
    remarks?: string;
  }) => request<any>("POST", "/erp/eway-bill/update-vehicle", payload),
  getEWayBillDetails: (ewbNumber: string) =>
    request<any>("GET", `/erp/eway-bill/${ewbNumber}`),
};

export const einvoiceApi = {
  generateIrn: (payload: {
    invoice_id?: string;
    invoice_number?: string;
    invoice_date?: string;
    seller_gstin?: string;
    seller_name?: string;
    buyer_gstin?: string;
    buyer_name?: string;
    taxable_value?: number;
    total_amount?: number;
    items?: any[];
  }) => request<any>("POST", "/erp/einvoice/generate-irn", payload),
  cancelIrn: (payload: { irn: string; cancel_reason?: string; remarks?: string }) =>
    request<any>("POST", "/erp/einvoice/cancel-irn", payload),
  generateEwaybillByIrn: (payload: {
    irn: string;
    transporter_id?: string;
    transporter_name?: string;
    trans_mode?: string;
    distance_km?: number;
    vehicle_no: string;
    vehicle_type?: string;
  }) => request<any>("POST", "/erp/einvoice/generate-ewaybill-by-irn", payload),
  generateB2CQr: (payload: {
    invoice_number: string;
    total_amount: number;
    payee_name?: string;
    upi_id?: string;
  }) => request<any>("POST", "/erp/einvoice/b2c-qr", payload),
};

export const gstFilingApi = {
  searchGstin: (gstin: string) =>
    request<any>("GET", `/erp/gst/search/${encodeURIComponent(gstin)}`),
  getGstr1Summary: (params: { year: number; month: number; invoice_type?: string }) =>
    request<any>("GET", "/erp/gst/gstr1-summary", undefined, params),
  uploadGstr1: (payload: { year: number; month: number; gstr1_payload: any }) =>
    request<any>("POST", "/erp/gst/gstr1-upload", payload),
  getGstr2b: (params: { year: number; month: number }) =>
    request<any>("GET", "/erp/gst/gstr2b", undefined, params),
  getGstr3bSummary: (params: { year: number; month: number; invoice_type?: string }) =>
    request<any>("GET", "/erp/gst/gstr3b-summary", undefined, params),
  requestOtp: (payload: { gstin?: string; username?: string }) =>
    request<any>("POST", "/erp/gst/otp/request", payload),
  verifyOtp: (payload: { otp: string; txn?: string; gstin?: string; username?: string }) =>
    request<any>("POST", "/erp/gst/otp/verify", payload),
  getSessionStatus: () =>
    request<any>("GET", "/erp/gst/session-status"),
};

export const whitebooksSettingsApi = {
  getConfig: () => request<any>("GET", "/erp/whitebooks/config"),
  saveConfig: (payload: any) => request<any>("PUT", "/erp/whitebooks/config", payload),
  testConnection: (module: "ewb" | "gst" | "einv", credentials?: any) =>
    request<any>("POST", "/erp/whitebooks/test-connection", { module, credentials }),
};

export const utilsApi = {
  lookupPincode: (pincode: string) =>
    request<{
      pincode: string;
      city: string;
      district: string;
      state: string;
      country: string;
      area: string;
      region?: string;
      division?: string;
      circle?: string;
      post_offices?: string[];
    }>("GET", `/utils/pincode/${pincode}`),
};

export const whitebooksApi = {
  searchGstin: (gstin: string) => gstFilingApi.searchGstin(gstin),
  ewayBill: ewayBillApi,
  einvoice: einvoiceApi,
  gstFiling: gstFilingApi,
  settings: whitebooksSettingsApi,
};

export const marketplaceApi = {
  getVendors: (params?: { status?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.category) q.set("category", params.category);
    const qs = q.toString();
    return request<any[]>("GET", `/marketplace/vendors${qs ? `?${qs}` : ""}`);
  },
  createVendor: (data: any) => request<any>("POST", "/marketplace/vendors", data),
  updateKYC: (vendorId: string, kycStatus: string) =>
    request<any>("PUT", `/marketplace/vendors/${vendorId}/kyc?kyc_status=${kycStatus}`),

  getProducts: (params?: { vendor_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.vendor_id) q.set("vendor_id", params.vendor_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<any[]>("GET", `/marketplace/products${qs ? `?${qs}` : ""}`);
  },
  createProduct: (data: any) => request<any>("POST", "/marketplace/products", data),
  updateProductStatus: (productId: string, status: string) =>
    request<any>("PUT", `/marketplace/products/${productId}/status?product_status=${status}`),

  getOrders: (params?: { vendor_id?: string; customer_id?: string; customer_email?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.vendor_id) q.set("vendor_id", params.vendor_id);
    if (params?.customer_id) q.set("customer_id", params.customer_id);
    if (params?.customer_email) q.set("customer_email", params.customer_email);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return request<any[]>("GET", `/marketplace/orders${qs ? `?${qs}` : ""}`);
  },
  getOrderById: (orderId: string) => request<any>("GET", `/marketplace/orders/${orderId}`),
  createOrder: (data: any) => request<any>("POST", "/marketplace/orders", data),
  packOrder: (orderId: string) => request<any>("PUT", `/marketplace/orders/${orderId}/pack`),
  dispatchOrder: (orderId: string, payload?: { courier?: string; tracking_number?: string; expected_delivery?: string; eta?: string }) =>
    request<any>("PUT", `/marketplace/orders/${orderId}/dispatch`, payload || {}),
  deliverOrder: (orderId: string) => request<any>("PUT", `/marketplace/orders/${orderId}/deliver`),
  cancelOrder: (orderId: string) => request<any>("PUT", `/marketplace/orders/${orderId}/cancel`),

  getStats: () => request<any>("GET", `/marketplace/stats`),
  getPayouts: () => request<any[]>("GET", `/marketplace/payouts`),
  createPayout: (data: any) => request<any>("POST", "/marketplace/payouts", data),

  getCoupons: () => request<any[]>("GET", `/marketplace/coupons`),
  createCoupon: (data: any) => request<any>("POST", "/marketplace/coupons", data),

  getDeliveryPartners: () => request<any[]>("GET", `/marketplace/delivery-partners`),
  getVendorCategories: () => request<any[]>("GET", `/marketplace/vendor-categories`),
  getVendorContracts: () => request<any[]>("GET", `/marketplace/vendor-contracts`),

  getPricingRules: () => request<any[]>("GET", `/marketplace/pricing-rules`),
  createPricingRule: (data: any) => request<any>("POST", "/marketplace/pricing-rules", data),

  getRFQs: () => request<any[]>("GET", `/marketplace/rfqs`),
  createRFQ: (data: any) => request<any>("POST", "/marketplace/rfqs", data),
  submitRFQBid: (rfqId: string, data: any) => request<any>("POST", `/marketplace/rfqs/${rfqId}/bid`, data),
  acceptRFQBid: (rfqId: string, bidId: string) => request<any>("PUT", `/marketplace/rfqs/${rfqId}/accept-bid?bid_id=${bidId}`),

  getTradeCredits: () => request<any[]>("GET", `/marketplace/trade-credit`),
};

// ─── CRM AI Calling API ────────────────────────────────────────────────────────
export const crmCallsApi = {
  initiate: (payload: CRMCallInitiateRequest) =>
    request<CRMCallInitiateResponse>("POST", "/crm/calls/initiate", payload),

  turn: (payload: CRMCallTurnRequest) =>
    request<CRMCallTurnResponse>("POST", "/crm/calls/turn", payload),

  complete: (payload: CRMCallCompleteRequest) =>
    request<CRMCallLog>("POST", "/crm/calls/complete", payload),

  listLogs: (
    page = 1,
    pageSize = 20,
    targetType?: string,
    targetId?: string,
    search?: string,
    sentiment?: string,
    status?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ) =>
    request<{ items: CRMCallLog[]; total: number }>(
      "GET",
      "/crm/calls/logs",
      undefined,
      {
        page,
        page_size: pageSize,
        target_type: targetType,
        target_id: targetId,
        search,
        sentiment,
        status,
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
      }
    ),

  getStats: () =>
    request<CRMCallStats>("GET", "/crm/calls/stats"),

  exportCsvUrl: (params?: {
    target_type?: string;
    sentiment?: string;
    status?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.target_type && params.target_type !== "all") query.set("target_type", params.target_type);
    if (params?.sentiment && params.sentiment !== "all") query.set("sentiment", params.sentiment);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.user_id && params.user_id !== "all") query.set("user_id", params.user_id);
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.search) query.set("search", params.search);
    const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
    return `${API_BASE}/crm/calls/export-csv?${query.toString()}`;
  },
};

// ── Push Notifications & In-App Alerts ───────────────────────────────────────

export interface LiveNotification {
  id: string;
  tenant_id: string;
  title: string;
  body: string;
  category: string;
  unread: boolean;
  created_at: string;
}

export interface PushNotificationTemplate {
  id: string;
  name: string;
  category: string;
  title_template: string;
  body_template: string;
  action_url?: string | null;
  priority: string;
  icon_type?: string | null;
  is_system?: boolean;
  created_at?: string | null;
}

export interface NotificationBroadcast {
  id: string;
  sender_name?: string | null;
  title: string;
  body: string;
  category: string;
  target_type: string;
  recipients_count: number;
  status: string;
  created_at: string;
}

export interface BroadcastPushPayload {
  template_id?: string;
  title: string;
  body: string;
  category?: string;
  target_type?: string;
  target_filter?: string[];
  action_url?: string;
  priority?: string;
  channels?: string[];
}

export const pushNotificationsApi = {
  listTemplates: () => request<PushNotificationTemplate[]>("GET", "/system/notifications/templates"),
  createTemplate: (data: Partial<PushNotificationTemplate>) => request<PushNotificationTemplate>("POST", "/system/notifications/templates", data),
  updateTemplate: (id: string, data: Partial<PushNotificationTemplate>) => request<PushNotificationTemplate>("PUT", `/system/notifications/templates/${id}`, data),
  deleteTemplate: (id: string) => request<{ message: string }>("DELETE", `/system/notifications/templates/${id}`),

  sendBroadcast: (data: BroadcastPushPayload) => request<{ message: string; broadcast_id: string; recipients_count: number; status: string }>("POST", "/system/notifications/broadcast", data),
  listBroadcasts: (limit = 50) => request<NotificationBroadcast[]>("GET", "/system/notifications/broadcasts", undefined, { limit }),

  registerDevice: (data: { device_token: string; platform: string; device_name?: string }) =>
    request<{ message: string; platform: string }>("POST", "/system/notifications/devices/register", data),
  unregisterDevice: (data: { device_token: string; platform: string }) =>
    request<{ message: string }>("POST", "/system/notifications/devices/unregister", data),
};

// ── WebAuthn / FIDO2 Biometric Passkeys ──────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  user?: any;
  tenant?: any;
  tenant_id?: string;
}

export interface UserPasskey {
  id: string;
  credential_id: string;
  device_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

export const passkeysApi = {
  getRegisterOptions: (deviceName?: string) =>
    request<any>("POST", "/auth/passkeys/register-options", { device_name: deviceName }),
  verifyRegister: (data: {
    device_name?: string;
    credential_id: string;
    raw_id: string;
    client_data_json: string;
    attestation_object?: string | null;
    transports?: string[];
  }) => request<{ message: string; passkey_id: string; device_name: string }>("POST", "/auth/passkeys/register-verify", data),

  getLoginOptions: (email: string, tenantSlug?: string) =>
    request<any>("POST", "/auth/passkeys/login-options", { email, tenant_slug: tenantSlug }),
  verifyLogin: (data: {
    email: string;
    credential_id: string;
    client_data_json: string;
    authenticator_data: string;
    signature: string;
    tenant_slug?: string;
  }) => request<TokenResponse>("POST", "/auth/passkeys/login-verify", data),

  list: () => request<UserPasskey[]>("GET", "/auth/passkeys"),
  delete: (passkeyId: string) => request<{ message: string }>("DELETE", `/auth/passkeys/${passkeyId}`),
};

// ── 3rd-Party Optical Fingerprint Scanners (Mantra / Morpho / SecuGen) ───────

export interface UserFingerprint {
  id: string;
  finger_name: string;
  device_brand: string;
  quality_score: number;
  is_active: boolean;
  created_at: string;
  last_used_at?: string | null;
}

export const fingerprintsApi = {
  enroll: (data: {
    finger_name: string;
    device_brand: string;
    template_iso: string;
    quality_score: number;
  }) => request<UserFingerprint>("POST", "/auth/fingerprints/enroll", data),

  verifyLogin: (data: {
    email?: string;
    template_iso: string;
    tenant_slug?: string;
  }) => request<TokenResponse>("POST", "/auth/fingerprints/verify-login", data),

  list: () => request<UserFingerprint[]>("GET", "/auth/fingerprints"),
  delete: (id: string) => request<{ message: string }>("DELETE", `/auth/fingerprints/${id}`),
};

// ── Unified Payment Gateways (Razorpay, Pine Labs, Stripe, PhonePe) ──────────

export interface PaymentGatewayConfigDTO {
  id: string;
  name: string;
  category: "domestic" | "international" | "pos_terminal" | "offline";
  description: string;
  isEnabled: boolean;
  isTestMode: boolean;
  credentials: Record<string, any>;
  supportedMethods: string[];
  currencies: string[];
  docUrl?: string;
  companyId?: string | null;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: string;
  key_id?: string;
  notes?: Record<string, any>;
}

export interface RazorpayVerificationResult {
  success: boolean;
  message: string;
  order_id: string;
  payment_id: string;
  status?: string;
  method?: string;
  amount?: number;
  vpa?: string;
  bank?: string;
}

export interface PineLabsTransactionResult {
  status: "APPROVED" | "DECLINED" | "FAILED" | "PENDING";
  success: boolean;
  transaction_id: string;
  terminal_id: string;
  merchant_id?: string;
  amount: number;
  bill_number: string;
  rrn?: string;
  auth_code?: string;
  card_brand?: string;
  card_last4?: string;
  card_type?: string;
  batch_number?: string;
  message?: string;
  response_code?: string;
}

export const paymentsApi = {
  getGatewayConfigs: (companyId?: string) =>
    request<PaymentGatewayConfigDTO[]>("GET", "/payments/gateways/config", undefined, companyId ? { company_id: companyId } : undefined),

  saveGatewayConfig: (
    gatewayId: string,
    data: {
      company_id?: string;
      is_enabled: boolean;
      is_test_mode: boolean;
      credentials: Record<string, any>;
      settings?: Record<string, any>;
    }
  ) => request<{ success: boolean; message: string; config_id: string }>("PUT", `/payments/gateways/${gatewayId}/config`, data),

  testGatewayConnection: (gatewayId: string, credentials?: Record<string, any>) =>
    request<{ success: boolean; message: string; mode?: string; terminal_id?: string }>(
      "POST",
      `/payments/gateways/${gatewayId}/test-connection`,
      credentials ? { credentials } : {}
    ),

  createRazorpayOrder: (data: {
    amount: number;
    currency?: string;
    receipt?: string;
    company_id?: string;
    notes?: Record<string, any>;
  }) => request<RazorpayOrderResponse>("POST", "/payments/razorpay/create-order", data),

  verifyRazorpayPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    company_id?: string;
  }) => request<RazorpayVerificationResult>("POST", "/payments/razorpay/verify", data),

  createRazorpayLink: (data: {
    amount: number;
    description: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    notify_sms?: boolean;
    notify_email?: boolean;
    company_id?: string;
    notes?: Record<string, any>;
  }) => request<any>("POST", "/payments/razorpay/create-link", data),

  checkRazorpayOrderStatus: (orderId: string, companyId?: string) =>
    request<{ order_id: string; status: string; amount_paid: number; is_paid: boolean; captured_payment_id?: string; payment_method?: string }>(
      "GET",
      `/payments/razorpay/orders/${orderId}/status`,
      undefined,
      companyId ? { company_id: companyId } : undefined
    ),

  checkRazorpayLinkStatus: (linkId: string, companyId?: string) =>
    request<{ link_id: string; status: string; is_paid: boolean; payment_id?: string; amount_paid: number }>(
      "GET",
      `/payments/razorpay/links/${linkId}/status`,
      undefined,
      companyId ? { company_id: companyId } : undefined
    ),

  createRazorpayQR: (data: {
    amount: number;
    receipt?: string;
    company_id?: string;
    notes?: Record<string, any>;
  }) =>
    request<{
      id: string;
      image_url?: string;
      upi_intent?: string;
      amount: number;
      status: string;
    }>("POST", "/payments/razorpay/create-qr", data),

  checkRazorpayQRStatus: (qrId: string, companyId?: string) =>
    request<{ qr_id: string; status: string; is_paid: boolean; amount_paid: number }>(
      "GET",
      `/payments/razorpay/qr/${qrId}/status`,
      undefined,
      companyId ? { company_id: companyId } : undefined
    ),

  chargePineLabs: (data: {
    amount: number;
    bill_number: string;
    customer_mobile?: string;
    payment_mode?: "CARD" | "TAP_NFC" | "UPI_QR";
    terminal_id?: string;
    company_id?: string;
  }) => request<PineLabsTransactionResult>("POST", "/payments/pinelabs/charge", data),

  cancelPineLabs: (data: { transaction_id: string; terminal_id?: string; company_id?: string }) =>
    request<{ success: boolean; message: string }>("POST", "/payments/pinelabs/cancel", data),

  voidPineLabs: (data: { rrn: string; amount: number; terminal_id?: string; company_id?: string }) =>
    request<{ success: boolean; message: string }>("POST", "/payments/pinelabs/void", data),

  settlePineLabsBatch: (data?: { terminal_id?: string; company_id?: string }) =>
    request<{ success: boolean; terminal_id?: string; batch_number?: string; settled_at?: string; message: string }>(
      "POST",
      "/payments/pinelabs/settle",
      data || {}
    ),
};




