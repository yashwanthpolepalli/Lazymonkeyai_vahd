import React, { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  Building2, Search, Plus, Mail, Phone, MapPin,
  ExternalLink, Edit2, ChevronRight,
  X, Save, Loader2, Trash2, Globe, CheckCircle,
  KeyRound, Star, QrCode, Check, Copy, Layers, Upload, CheckCircle2, Send
} from "lucide-react";
import { cn } from "@/utils/cn";
import { apiClient } from "@/services/apiClient";

export interface GstRegistration {
  id: string;
  gstin: string;
  trade_name: string;
  state_code: string;
  state_name: string;
  address: string;
  is_primary: boolean;
}

export interface GspCredentials {
  environment?: string;
  registered_email?: string;
  ip_address?: string;
  ewb?: {
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
    gstin?: string;
    base_url?: string;
  };
  gst?: {
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
    gstin?: string;
    base_url?: string;
  };
  einv?: {
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
    gstin?: string;
    base_url?: string;
  };
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
  name: string;
  legal_name: string;
  company_type?: string;
  industry?: string;
  gst_number?: string;
  pan_number?: string;
  registration_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  logo_url?: string;
  default_currency_code?: string;
  timezone?: string;
  language?: string;
  google_review_url?: string;
  google_place_id?: string;
  google_review_enabled?: boolean;
  terms_and_conditions?: string;
  status: string;
  gst_registrations?: GstRegistration[];
  gsp_credentials?: GspCredentials;
  email_settings?: CompanyEmailSettings;
  created_at?: string;
  updated_at?: string;
}

export const STATE_GST_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala", "33": "Tamil Nadu",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

// ─── Company Form Modal (Multi-GST, GSP Credentials, Outbound SMTP, Google Reviews) ────────────

function CompanyFormModal({
  company,
  initialTab = "general",
  onClose,
  onSaved,
}: {
  company: Company | null;
  initialTab?: "general" | "gst" | "gsp" | "email" | "reviews";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!company;
  const [activeModalTab, setActiveModalTab] = useState<"general" | "gst" | "gsp" | "email" | "reviews">(initialTab);
  const [saving, setSaving] = useState(false);
  const [testingModule, setTestingModule] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; token_preview?: string }>>({});
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ── Outbound SMTP Email Settings State ─────────────────────────────────
  const [emailSettings, setEmailSettings] = useState<CompanyEmailSettings>(() => {
    const s = company?.email_settings || {};
    return {
      mail_server: s.mail_server || "",
      mail_port: s.mail_port || 587,
      mail_username: s.mail_username || "",
      mail_password: s.mail_password || "",
      mail_from: s.mail_from || "",
      sender_name: s.sender_name || (company?.name || ""),
      use_tls: s.use_tls !== undefined ? s.use_tls : true,
      use_ssl: s.use_ssl !== undefined ? s.use_ssl : false,
      reply_to: s.reply_to || "",
      enabled: s.enabled !== undefined ? s.enabled : true,
    };
  });
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState(company?.email || "");
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const applyEmailPreset = (preset: "gmail" | "outlook" | "ses" | "zoho") => {
    if (preset === "gmail") {
      setEmailSettings((p) => ({
        ...p,
        mail_server: "smtp.gmail.com",
        mail_port: 587,
        use_tls: true,
        use_ssl: false,
        enabled: true,
      }));
      showToast("Configured for Gmail / Google Workspace (Port 587 TLS). Please use a 16-character App Password.");
    } else if (preset === "outlook") {
      setEmailSettings((p) => ({
        ...p,
        mail_server: "smtp.office365.com",
        mail_port: 587,
        use_tls: true,
        use_ssl: false,
        enabled: true,
      }));
      showToast("Configured for Microsoft 365 / Outlook (Port 587 STARTTLS).");
    } else if (preset === "ses") {
      setEmailSettings((p) => ({
        ...p,
        mail_server: "email-smtp.us-east-1.amazonaws.com",
        mail_port: 587,
        use_tls: true,
        use_ssl: false,
        enabled: true,
      }));
      showToast("Configured for Amazon SES (Port 587 TLS).");
    } else if (preset === "zoho") {
      setEmailSettings((p) => ({
        ...p,
        mail_server: "smtp.zoho.com",
        mail_port: 587,
        use_tls: true,
        use_ssl: false,
        enabled: true,
      }));
      showToast("Configured for Zoho Mail (Port 587 TLS).");
    }
  };

  const handleTestEmail = async () => {
    if (!emailSettings.mail_server) {
      showToast("Please enter an SMTP Host (e.g. smtp.gmail.com)");
      return;
    }
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res: any = await apiClient.post("/companies/test-smtp", {
        credentials: emailSettings,
        recipient_email: testEmailRecipient.trim() || undefined,
        company_id: company?.id,
      });
      if (res.success) {
        setEmailTestResult({ success: true, message: res.message || "Test email sent successfully!" });
        showToast(res.message || "SMTP verified successfully!");
      } else {
        const err = res.error || "SMTP test failed";
        setEmailTestResult({ success: false, message: err });
        showToast(err);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Failed to reach server for SMTP test";
      setEmailTestResult({ success: false, message: msg });
      showToast(msg);
    } finally {
      setTestingEmail(false);
    }
  };

  const [form, setForm] = useState({
    name: company?.name ?? "",
    legal_name: company?.legal_name ?? "",
    company_type: company?.company_type ?? "",
    industry: company?.industry ?? "",
    gst_number: company?.gst_number ?? "",
    pan_number: company?.pan_number ?? "",
    registration_number: company?.registration_number ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    website: company?.website ?? "",
    country: company?.country ?? "India",
    state: company?.state ?? "",
    city: company?.city ?? "",
    address: company?.address ?? "",
    logo_url: company?.logo_url ?? "",
    default_currency_code: company?.default_currency_code ?? "INR",
    timezone: company?.timezone ?? "Asia/Kolkata",
    language: company?.language ?? "en",
    google_review_url: company?.google_review_url ?? "",
    google_place_id: company?.google_place_id ?? "",
    google_review_enabled: company?.google_review_enabled ?? false,
    terms_and_conditions: company?.terms_and_conditions ?? "",
    status: company?.status ?? "active",
  });

  const [gstRegistrations, setGstRegistrations] = useState<GstRegistration[]>(() => {
    if (company?.gst_registrations && company.gst_registrations.length > 0) {
      return company.gst_registrations;
    }
    if (company?.gst_number) {
      const code = company.gst_number.slice(0, 2);
      return [{
        id: "gst-1",
        gstin: company.gst_number,
        trade_name: company.name ? `${company.name} (Head Office)` : "Head Office",
        state_code: code,
        state_name: STATE_GST_CODES[code] || company.state || "State",
        address: company.address ?? "",
        is_primary: true,
      }];
    }
    return [];
  });

  const [gspCreds, setGspCreds] = useState<GspCredentials>(() => {
    const existing = company?.gsp_credentials || {};
    return {
      environment: existing.environment || "sandbox",
      registered_email: existing.registered_email || "",
      ip_address: existing.ip_address || "",
      ewb: {
        client_id: existing.ewb?.client_id || "",
        client_secret: existing.ewb?.client_secret || "",
        username: existing.ewb?.username || "",
        password: existing.ewb?.password || "",
        gstin: existing.ewb?.gstin || "",
        base_url: existing.ewb?.base_url || "",
      },
      gst: {
        client_id: existing.gst?.client_id || "",
        client_secret: existing.gst?.client_secret || "",
        username: existing.gst?.username || "",
        password: existing.gst?.password || "",
        gstin: existing.gst?.gstin || "",
        base_url: existing.gst?.base_url || "",
      },
      einv: {
        client_id: existing.einv?.client_id || "",
        client_secret: existing.einv?.client_secret || "",
        username: existing.einv?.username || "",
        password: existing.einv?.password || "",
        gstin: existing.einv?.gstin || "",
        base_url: existing.einv?.base_url || "",
      },
    };
  });


  const handleGeneralGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    const updates: Partial<typeof form> = { gst_number: clean };
    if (clean.length >= 2) {
      const code = clean.slice(0, 2);
      if (STATE_GST_CODES[code] && !form.state) {
        updates.state = STATE_GST_CODES[code];
      }
    }
    if (clean.length >= 10 && !form.pan_number) {
      updates.pan_number = clean.slice(2, 12);
    }
    setForm((p) => ({ ...p, ...updates }));
  };

  const handleTestConnection = async (module: "ewb" | "gst" | "einv") => {
    setTestingModule(module);
    try {
      const payload = {
        module,
        credentials: {
          ...gspCreds,
          [module]: gspCreds[module],
        },
      };
      const res: any = await apiClient.post("/companies/test-gsp", payload);
      setTestResults((prev) => ({
        ...prev,
        [module]: {
          success: res.success,
          message: res.message,
          token_preview: res.token_preview,
        },
      }));
      showToast(`${module.toUpperCase()} Connected: ${res.message}`);
    } catch (err: any) {
      const msg = err.message || "Connection handshake failed";
      setTestResults((prev) => ({
        ...prev,
        [module]: { success: false, message: msg },
      }));
      showToast(`${module.toUpperCase()} Error: ${msg}`);
    } finally {
      setTestingModule(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || form.name.trim(),
        company_type: form.company_type,
        industry: form.industry,
        gst_number: form.gst_number || null,
        pan_number: form.pan_number || null,
        registration_number: form.registration_number || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        country: form.country || "India",
        state: form.state || null,
        city: form.city || null,
        address: form.address || null,
        logo_url: form.logo_url || null,
        default_currency_code: form.default_currency_code || "INR",
        timezone: form.timezone || "Asia/Kolkata",
        language: form.language || "en",
        google_review_url: form.google_review_url || "https://search.google.com/local/writereview",
        google_place_id: form.google_place_id || null,
        google_review_enabled: form.google_review_enabled,
        terms_and_conditions: form.terms_and_conditions,
        status: form.status || "active",
        gst_registrations: gstRegistrations,
        gsp_credentials: gspCreds,
        email_settings: emailSettings,
      };

      if (isEdit && company) {
        await apiClient.put(`/companies/${company.id}`, payload);
        showToast("Organization & Review settings updated!");
      } else {
        await apiClient.post("/companies", payload);
        showToast("Organization created successfully!");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to save company");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-navy-200 rounded-2xl shadow-2xl w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[92vh] text-navy-900">
        {toastMsg && (
          <div className="bg-brand-600 text-white text-xs py-2 px-4 text-center font-bold animate-fadeIn">
            {toastMsg}
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 bg-navy-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white grid place-items-center shadow-xs">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-navy-900">
                {isEdit ? `Edit Organization: ${company?.name}` : "Create New Organization / Legal Entity"}
              </h2>
              <p className="text-xs text-navy-500">
                Multi-tenant setup with Multi-GST registrations and dedicated e-Way Bill & e-Invoice credentials.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-navy-200/60 text-navy-500 hover:text-navy-900 flex items-center justify-center transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Tabs Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-navy-100 bg-white shrink-0 overflow-x-auto">
          {[
            { id: "general", label: "General Details & GST", icon: Building2 },
            { id: "gst", label: `Additional Branch GSTINs (${gstRegistrations.length})`, icon: Layers },
            { id: "gsp", label: "GSP & Govt Gateway (Whitebooks)", icon: KeyRound },
            { id: "email", label: "Outbound SMTP & Email", icon: Mail },
            { id: "reviews", label: "⭐ Google Reviews & QR", icon: Star },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveModalTab(id as any)}
              className={cn(
                "flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeModalTab === id
                  ? "border-brand-600 text-brand-600 bg-brand-50/60"
                  : "border-transparent text-navy-500 hover:text-navy-900 hover:bg-navy-50"
              )}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {/* TAB 1: General Details & GST */}
          {activeModalTab === "general" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Company / Gym Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. test warangal"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Legal Registered Entity Name *</label>
                  <input
                    type="text"
                    required
                    value={form.legal_name}
                    onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                    placeholder="e.g. Ravi Enterprises Private Limited"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Primary GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={handleGeneralGstChange}
                    placeholder="e.g. 36AAGCR1234F1Z5"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 uppercase font-mono focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">PAN Number</label>
                  <input
                    type="text"
                    value={form.pan_number}
                    onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAGCR1234F"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 uppercase font-mono focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. contact@gym.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +91 99082 97963"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-bold block mb-1 text-navy-800">Registered Address</label>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Shop 4, Hanamkonda Main Road, Warangal, Telangana - 506001"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Additional Branch GSTINs */}
          {activeModalTab === "gst" && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-navy-900">Registered Branch GSTINs</h4>
                  <p className="text-navy-500 text-[11px]">Multi-state branch GST registrations for billing & invoice generation</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newReg: GstRegistration = {
                      id: `gst-${Date.now()}`,
                      gstin: "",
                      trade_name: "",
                      state_code: "",
                      state_name: "",
                      address: "",
                      is_primary: gstRegistrations.length === 0,
                    };
                    setGstRegistrations([...gstRegistrations, newReg]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold flex items-center gap-1.5 hover:bg-brand-700 transition-colors"
                >
                  <Plus className="size-3.5" /> Add GSTIN
                </button>
              </div>

              {gstRegistrations.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-navy-200 rounded-xl text-navy-500">
                  No additional branch GSTINs configured. Primary GSTIN from General tab is used for billing.
                </div>
              ) : (
                <div className="space-y-3">
                  {gstRegistrations.map((reg, idx) => (
                    <div key={reg.id || idx} className="p-4 rounded-xl border border-navy-200 bg-navy-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-2 text-navy-900">
                          <span>Branch #{idx + 1}</span>
                          {reg.is_primary && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Primary GSTIN
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          {!reg.is_primary && (
                            <button
                              type="button"
                              onClick={() => {
                                setGstRegistrations(gstRegistrations.map((r, i) => ({ ...r, is_primary: i === idx })));
                              }}
                              className="text-[11px] text-brand-600 hover:underline font-bold"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setGstRegistrations(gstRegistrations.filter((_, i) => i !== idx))}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold block mb-1 text-navy-800">GSTIN</label>
                          <input
                            type="text"
                            value={reg.gstin}
                            onChange={(e) => {
                              const updated = [...gstRegistrations];
                              updated[idx].gstin = e.target.value.toUpperCase();
                              if (e.target.value.length >= 2) {
                                const code = e.target.value.slice(0, 2);
                                updated[idx].state_code = code;
                                updated[idx].state_name = STATE_GST_CODES[code] || "State";
                              }
                              setGstRegistrations(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white font-mono uppercase text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold block mb-1 text-navy-800">Trade Name</label>
                          <input
                            type="text"
                            value={reg.trade_name}
                            onChange={(e) => {
                              const updated = [...gstRegistrations];
                              updated[idx].trade_name = e.target.value;
                              setGstRegistrations(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold block mb-1 text-navy-800">State</label>
                          <input
                            type="text"
                            value={reg.state_name}
                            onChange={(e) => {
                              const updated = [...gstRegistrations];
                              updated[idx].state_name = e.target.value;
                              setGstRegistrations(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GSP & Govt Gateway (Whitebooks) */}
          {activeModalTab === "gsp" && (
            <div className="space-y-4 text-xs">
              {/* Environment Toggle */}
              <div className="p-4 rounded-xl border border-navy-200 bg-navy-50/70 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-navy-900">Gateway Environment</h4>
                  <p className="text-navy-500 text-[11px]">Switch between live Government Production API and Sandbox testing.</p>
                </div>
                <div className="flex items-center gap-2 bg-navy-200/50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setGspCreds({ ...gspCreds, environment: "sandbox" })}
                    className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-colors", gspCreds.environment === "sandbox" ? "bg-amber-500 text-white shadow-xs" : "text-navy-600")}
                  >
                    Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setGspCreds({ ...gspCreds, environment: "production" })}
                    className={cn("px-3 py-1 rounded-lg text-xs font-bold transition-colors", gspCreds.environment === "production" ? "bg-emerald-600 text-white shadow-xs" : "text-navy-600")}
                  >
                    Live Production
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Whitebooks Registered Account Email *</label>
                  <input
                    type="email"
                    value={gspCreds.registered_email}
                    onChange={(e) => setGspCreds({ ...gspCreds, registered_email: e.target.value })}
                    placeholder="email@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-navy-500 mt-1">Must match the account where Production Client ID was generated.</p>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Whitelisted Server IP Address</label>
                  <input
                    type="text"
                    value={gspCreds.ip_address}
                    onChange={(e) => setGspCreds({ ...gspCreds, ip_address: e.target.value })}
                    placeholder="106.213.64.83"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-navy-500 mt-1">Whitelisted in Whitebooks Dashboard IP Access List.</p>
                </div>
              </div>

              {/* e-Way Bill API Credentials Card */}
              <div className="p-4 rounded-xl border border-navy-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-indigo-50 text-indigo-600">
                      <KeyRound className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-navy-900">e-Way Bill API Credentials</h4>
                      <p className="text-[10px] text-navy-500">Government ewaybillgst.gov.in GSP Access</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestConnection("ewb")}
                    disabled={testingModule === "ewb"}
                    className="px-3 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs flex items-center gap-1.5"
                  >
                    {testingModule === "ewb" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Test e-Way Bill
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">EWB Client ID</label>
                    <input
                      type="text"
                      value={gspCreds.ewb?.client_id || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, ewb: { ...gspCreds.ewb, client_id: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">EWB Client Secret</label>
                    <input
                      type="password"
                      value={gspCreds.ewb?.client_secret || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, ewb: { ...gspCreds.ewb, client_secret: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">NIC GSP Username</label>
                    <input
                      type="text"
                      value={gspCreds.ewb?.username || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, ewb: { ...gspCreds.ewb, username: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">NIC GSP Password</label>
                    <input
                      type="password"
                      value={gspCreds.ewb?.password || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, ewb: { ...gspCreds.ewb, password: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* e-Invoice & IRN Credentials Card */}
              <div className="p-4 rounded-xl border border-navy-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-50 text-emerald-600">
                      <KeyRound className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-navy-900">e-Invoice & IRN Credentials</h4>
                      <p className="text-[10px] text-navy-500">Government einvoice1.gst.gov.in IRP Access</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestConnection("einv")}
                    disabled={testingModule === "einv"}
                    className="px-3 py-1 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-bold text-xs flex items-center gap-1.5"
                  >
                    {testingModule === "einv" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Test e-Invoice
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">e-Invoice Client ID</label>
                    <input
                      type="text"
                      value={gspCreds.einv?.client_id || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, einv: { ...gspCreds.einv, client_id: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">e-Invoice Client Secret</label>
                    <input
                      type="password"
                      value={gspCreds.einv?.client_secret || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, einv: { ...gspCreds.einv, client_secret: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">IRP API Username</label>
                    <input
                      type="text"
                      value={gspCreds.einv?.username || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, einv: { ...gspCreds.einv, username: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-navy-800">IRP API Password</label>
                    <input
                      type="password"
                      value={gspCreds.einv?.password || ""}
                      onChange={(e) => setGspCreds({ ...gspCreds, einv: { ...gspCreds.einv, password: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-navy-200 bg-white text-navy-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* GST Returns & Filing Credentials */}
              <div className="p-4 rounded-xl border border-navy-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-purple-50 text-purple-600">
                      <KeyRound className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-navy-900">GST Returns & Filing Credentials</h4>
                      <p className="text-[10px] text-navy-500">GSTR-1, GSTR-2B & GSTR-3B GSTN Access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestConnection("gst")}
                      className="px-2.5 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 text-[11px] font-bold"
                    >
                      Test API
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast("OTP requested from GST Portal to registered mobile number.")}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700"
                    >
                      Request Mobile OTP
                    </button>
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-2 font-medium">
                  <span className="size-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                  GST Portal Session Inactive (Mobile OTP auth required for live return uploads)
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Outbound SMTP & Email */}
          {activeModalTab === "email" && (
            <div className="space-y-4 text-xs">
              {/* 1-Click Provider Quick Presets */}
              <div className="space-y-2">
                <label className="font-bold block text-navy-600 text-[11px]">1-Click Provider Quick Presets:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyEmailPreset("gmail")}
                    className="px-3 py-1.5 rounded-xl border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-800 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="size-2 rounded-full bg-red-500" /> Google Workspace / Gmail
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset("outlook")}
                    className="px-3 py-1.5 rounded-xl border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-800 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="size-2 rounded-full bg-blue-500" /> Microsoft 365 / Outlook
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset("zoho")}
                    className="px-3 py-1.5 rounded-xl border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-800 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="size-2 rounded-full bg-emerald-500" /> Zoho Mail
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEmailPreset("ses")}
                    className="px-3 py-1.5 rounded-xl border border-navy-200 bg-navy-50 hover:bg-navy-100 text-navy-800 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="size-2 rounded-full bg-amber-500" /> Amazon SES
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1 text-navy-800">SMTP Host / Server *</label>
                  <input
                    type="text"
                    value={emailSettings.mail_server || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_server: e.target.value })}
                    placeholder="e.g. smtp.gmail.com or smtp.office365.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">SMTP Port *</label>
                  <input
                    type="number"
                    value={emailSettings.mail_port || 587}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_port: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-navy-800">SMTP Username / Account *</label>
                  <input
                    type="text"
                    value={emailSettings.mail_username || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_username: e.target.value })}
                    placeholder="venaticfungus@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">SMTP Password / App Password *</label>
                  <input
                    type="password"
                    value={emailSettings.mail_password || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-navy-500 mt-1">For Gmail/Google Workspace, generate a 16-character App Password.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Sender Email (From) *</label>
                  <input
                    type="email"
                    value={emailSettings.mail_from || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_from: e.target.value })}
                    placeholder="noreply@yourcompany.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Sender Display Name</label>
                  <input
                    type="text"
                    value={emailSettings.sender_name || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                    placeholder="test warangal"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-navy-800">Reply-To Email (Optional)</label>
                  <input
                    type="email"
                    value={emailSettings.reply_to || ""}
                    onChange={(e) => setEmailSettings({ ...emailSettings, reply_to: e.target.value })}
                    placeholder="careers@yourcompany.com"
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-navy-800">
                  <input
                    type="checkbox"
                    checked={emailSettings.use_tls}
                    onChange={(e) => setEmailSettings({ ...emailSettings, use_tls: e.target.checked })}
                    className="rounded text-brand-600 size-4"
                  />
                  <span>STARTTLS (Standard for Port 587)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-navy-800">
                  <input
                    type="checkbox"
                    checked={emailSettings.use_ssl}
                    onChange={(e) => setEmailSettings({ ...emailSettings, use_ssl: e.target.checked })}
                    className="rounded text-brand-600 size-4"
                  />
                  <span>Direct SSL (Standard for Port 465)</span>
                </label>
              </div>

              {/* Test Handshake Section */}
              <div className="p-4 rounded-xl border border-navy-200 bg-navy-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="size-4 text-brand-600" />
                    <div>
                      <h4 className="font-bold text-xs text-navy-900">Send Test Email & Validate Connection</h4>
                      <p className="text-[10px] text-navy-500">Verify handshake, TLS credentials, and inbox deliverability</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    className="px-3 py-1.5 rounded-lg border border-navy-200 bg-white hover:bg-navy-100 text-navy-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    {testingEmail ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    Send Test Email
                  </button>
                </div>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Enter email address to receive test message"
                  className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white text-navy-900"
                />
                {emailTestResult && (
                  <div className={cn("p-2.5 rounded-lg text-xs font-medium", emailTestResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200")}>
                    {emailTestResult.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ⭐ Google Reviews & QR */}
          {activeModalTab === "reviews" && (
            <div className="space-y-4 text-xs">
              <div className="p-5 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Star className="size-4 fill-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-navy-900">Google Business Reviews & QR Automation</h3>
                      <p className="text-[11px] text-navy-500">Automate 5-star customer ratings across Thermal POS Receipts & CRM</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-bold cursor-pointer text-navy-800">
                    <input
                      type="checkbox"
                      checked={form.google_review_enabled}
                      onChange={(e) => setForm({ ...form, google_review_enabled: e.target.checked })}
                      className="rounded text-brand-600 size-4 focus:ring-brand-500"
                    />
                    <span>Enable Review QR</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold block mb-1 text-navy-800">Google Review Direct Link / Place URL *</label>
                      <input
                        type="text"
                        value={form.google_review_url}
                        onChange={(e) => setForm({ ...form, google_review_url: e.target.value })}
                        placeholder="https://search.google.com/local/writereview"
                        className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono text-xs focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none text-navy-900"
                      />
                      <p className="text-[10px] text-navy-500 mt-1">
                        Found in your Google Business Profile → "Ask for reviews" → Copy link.
                      </p>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-navy-800">Google Place ID (Optional)</label>
                      <input
                        type="text"
                        value={form.google_place_id}
                        onChange={(e) => setForm({ ...form, google_place_id: e.target.value })}
                        placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                        className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono text-xs focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:outline-none text-navy-900"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (form.google_review_url) {
                              navigator.clipboard.writeText(form.google_review_url);
                              setCopiedReviewLink(true);
                              showToast("Google Review Link copied to clipboard!");
                              setTimeout(() => setCopiedReviewLink(false), 2000);
                            }
                          }}
                          className="flex-1 py-2 px-3 rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          {copiedReviewLink ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-navy-500" />}
                          <span>{copiedReviewLink ? "Copied" : "Copy Link"}</span>
                        </button>

                        <a
                          href={form.google_review_url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <button
                            type="button"
                            className="w-full py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100/50 font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <ExternalLink className="size-3.5" /> Test Link
                          </button>
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const reviewUrl = form.google_review_url || "https://search.google.com/local/writereview";
                          const win = window.open("", "_blank");
                          if (!win) {
                            showToast("Please allow popups to print counter stand card");
                            return;
                          }
                          win.document.write(`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>Google Review Counter Stand - ${form.name}</title>
                                <style>
                                  @page { size: A5 portrait; margin: 10mm; }
                                  body { font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 24px; background: #f8fafc; }
                                  .card { border: 3px solid #6366f1; border-radius: 28px; padding: 40px 24px; max-width: 420px; margin: 0 auto; background: #ffffff; }
                                  .logo-badge { background: #eef2ff; color: #4f46e5; display: inline-block; padding: 6px 18px; border-radius: 999px; font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 14px; }
                                  h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px 0; color: #0f172a; }
                                  .stars { color: #f59e0b; font-size: 28px; letter-spacing: 6px; margin-bottom: 20px; }
                                  .qr-box { background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 24px; padding: 20px; display: inline-block; margin-bottom: 20px; }
                                  .qr-box img { width: 200px; height: 200px; display: block; }
                                  .scan-inst { font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0 0 6px 0; }
                                </style>
                              </head>
                              <body>
                                <div class="card">
                                  <div class="logo-badge">Official Store Review</div>
                                  <h1>${form.name || "Our Gym"}</h1>
                                  <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Loved your fitness experience with us?</p>
                                  <div class="stars">★★★★★</div>
                                  <div class="qr-box">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(reviewUrl)}" alt="QR" />
                                  </div>
                                  <div class="scan-inst">Scan to Rate on Google</div>
                                  <p style="color:#64748b;font-size:12px;">Scan the QR code with your phone camera to share your review.</p>
                                </div>
                                <script>setTimeout(function() { window.print(); }, 500);</script>
                              </body>
                            </html>
                          `);
                          win.document.close();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
                      >
                        <QrCode className="size-4" /> Print Counter Tent Card (A5)
                      </button>
                    </div>
                  </div>

                  {/* QR Preview Box */}
                  <div className="p-5 rounded-2xl border border-navy-200/80 bg-white shadow-xs flex flex-col items-center justify-center text-center space-y-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-4 fill-amber-500" />
                      ))}
                    </div>
                    <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-2xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
                          form.google_review_url || "https://search.google.com/local/writereview"
                        )}`}
                        alt="Live QR"
                        className="size-36 object-contain"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-navy-900">Live POS Bill & Table Tent QR</div>
                      <div className="text-[10px] text-navy-500 mt-0.5">Auto-printed at bottom of thermal invoices</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-navy-100 bg-white shrink-0">
            <span className="text-xs text-navy-500 font-medium">
              {activeModalTab === "reviews"
                ? (form.google_review_enabled ? "Google Review QR Enabled" : "Review QR Disabled")
                : "Organization Settings"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                <span>Save Organization Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Company Management & Google Reviews View ────────────────────────────

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Google Reviews & QR");
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"general" | "gst" | "gsp" | "email" | "reviews">("general");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get("/companies", { params: { search: search || undefined } });
      const items: Company[] = res?.items || [];
      setCompanies(items);
      if (items.length > 0 && !selectedCompany) {
        setSelectedCompany(items[0]);
      } else if (selectedCompany) {
        const found = items.find((c) => c.id === selectedCompany.id);
        if (found) setSelectedCompany(found);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCompany]);

  useEffect(() => {
    loadCompanies();
  }, []);

  const activeCompany = selectedCompany || companies[0];

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-primary text-primary-foreground text-xs py-2 px-4 rounded-xl shadow-lg font-bold animate-fadeIn">
          {toastMsg}
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="size-6 text-primary" />
            <span>Organization & Google Business Reviews</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-tenant company legal profiles, GST registrations, Whitebooks GSP API, and automated Google 5-Star Reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditCompany(null);
              setModalInitialTab("general");
              setShowFormModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:opacity-95"
          >
            <Plus className="size-4" /> New Organization
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Organization List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-xl border border-navy-200 bg-white">
            <Search className="size-4 text-navy-400 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, GST..."
              className="w-full bg-transparent text-xs text-navy-900 focus:outline-none placeholder:text-navy-400"
            />
            <button
              onClick={loadCompanies}
              className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 text-xs font-bold"
            >
              Search
            </button>
          </div>

          <div className="text-[11px] font-bold text-navy-500 px-1">
            {companies.length} organization{companies.length === 1 ? "" : "s"}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-navy-500">
                <Loader2 className="size-5 animate-spin mx-auto mb-2 text-brand-600" />
                Loading organizations...
              </div>
            ) : companies.length === 0 ? (
              <div className="p-6 text-center text-xs text-navy-500 border border-dashed border-navy-200 rounded-xl bg-white">
                No organizations found.
              </div>
            ) : (
              companies.map((comp) => {
                const isSelected = activeCompany?.id === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompany(comp)}
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "border-brand-600 bg-brand-50/50 shadow-xs"
                        : "border-navy-200 bg-white hover:bg-navy-50"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "size-10 rounded-xl grid place-items-center font-black text-xs shrink-0",
                        isSelected ? "bg-brand-600 text-white" : "bg-navy-100 text-navy-600"
                      )}>
                        {comp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs truncate text-navy-900">{comp.name}</h3>
                        <p className="text-[11px] text-navy-500 truncate">{comp.company_type || "Private Limited"} • {comp.industry || "Retail"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-bold capitalize">{comp.status || "active"}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("size-4 shrink-0 transition-transform", isSelected ? "text-brand-600 translate-x-0.5" : "text-navy-400")} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Organization Details & Google Review Hub */}
        <div className="lg:col-span-8 space-y-4">
          {activeCompany ? (
            <div className="border border-navy-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              {/* Top Banner Info */}
              <div className="p-5 border-b border-navy-100 bg-navy-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white grid place-items-center font-bold text-base shadow-sm">
                    <Building2 className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-black text-base text-navy-900">{activeCompany.legal_name || activeCompany.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-navy-500 mt-0.5">
                      <span>GSTIN: <strong className="font-mono text-navy-900">{activeCompany.gst_number || "Not Configured"}</strong></span>
                      <span>•</span>
                      <span>Email: <strong className="text-navy-900">{activeCompany.email || "—"}</strong></span>
                      <span>•</span>
                      <span>Phone: <strong className="text-navy-900">{activeCompany.phone || "—"}</strong></span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditCompany(activeCompany);
                    setModalInitialTab("general");
                    setShowFormModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-navy-200 bg-white hover:bg-navy-50 font-bold text-xs text-navy-700 flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
                >
                  <Edit2 className="size-3.5" /> Edit Org
                </button>
              </div>

              {/* Sub-Tabs Bar */}
              <div className="flex items-center gap-1 px-4 border-b border-navy-100 bg-white overflow-x-auto">
                {[
                  "Overview",
                  "GST Registrations",
                  "GSP & Govt Gateway",
                  "Google Reviews & QR ★ Live",
                  "Branches",
                  "Tax & Finance",
                  "Documents"
                ].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                        isActive
                          ? "border-brand-600 text-brand-600 bg-brand-50/50"
                          : "border-transparent text-navy-500 hover:text-navy-900 hover:bg-navy-50"
                      )}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* ════ TAB: GOOGLE REVIEWS & QR CODE ════ */}
                {activeTab === "Google Reviews & QR ★ Live" && (
                  <div className="space-y-4">
                    {/* Top Amber Highlight Banner */}
                    <div className="p-5 bg-amber-50/50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3.5">
                        <div className="size-12 rounded-2xl bg-amber-500 text-white grid place-items-center font-bold shadow-md shrink-0">
                          <Star className="size-6 fill-white" />
                        </div>
                        <div>
                          <div className="text-[10px] uppercase font-black tracking-wider text-amber-700 flex items-center gap-1.5">
                            <span>Official Google Business Review Automation</span>
                            <span className="bg-amber-500/20 text-amber-900 px-2 py-0.5 rounded-full font-extrabold text-[9px]">
                              POS Bills & CRM Leads
                            </span>
                          </div>
                          <div className="text-base font-black text-navy-900 mt-0.5">
                            {activeCompany.google_review_url ? "Active Review Link Configured" : "Review Link Not Set"}
                          </div>
                          <p className="text-xs text-navy-600 mt-0.5 max-w-2xl">
                            QR code is automatically stamped at the bottom of thermal receipts and shared with customers through WhatsApp CRM after completed orders.
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditCompany(activeCompany);
                            setModalInitialTab("reviews");
                            setShowFormModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                        >
                          <Edit2 className="size-3.5" /> Edit Review Settings
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left 2 Cols: Details & Integration status */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="p-5 rounded-2xl border border-navy-200 bg-white space-y-4">
                          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
                            <h4 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                              <QrCode className="size-4 text-brand-600" />
                              <span>Review URL & Configuration</span>
                            </h4>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              activeCompany.google_review_enabled !== false
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {activeCompany.google_review_enabled !== false ? "Enabled" : "Disabled"}
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="text-[10px] text-navy-500 font-semibold block mb-0.5">
                                Google Review Direct URL:
                              </span>
                              <div className="p-2.5 rounded-xl bg-navy-50 border border-navy-200 font-mono text-xs text-navy-800 break-all flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {activeCompany.google_review_url || "https://search.google.com/local/writereview"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-navy-500 font-semibold block mb-0.5">
                                Google Place ID:
                              </span>
                              <div className="p-2.5 rounded-xl bg-navy-50 border border-navy-200 font-mono text-xs text-navy-800">
                                {activeCompany.google_place_id || "Not configured (Optional)"}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-navy-100 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const link = activeCompany.google_review_url || "https://search.google.com/local/writereview";
                                navigator.clipboard.writeText(link);
                                showToast("Google Review Link copied to clipboard!");
                              }}
                              className="h-8 px-3 rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <Copy className="size-3.5" /> Copy Review Link
                            </button>

                            <a
                              href={activeCompany.google_review_url || "https://search.google.com/local/writereview"}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <button
                                type="button"
                                className="h-8 px-3 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                <ExternalLink className="size-3.5" /> Open Review Page
                              </button>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                const reviewUrl = activeCompany.google_review_url || "https://search.google.com/local/writereview";
                                const win = window.open("", "_blank");
                                if (!win) {
                                  showToast("Please allow popups to print counter stand card");
                                  return;
                                }
                                win.document.write(`
                                  <!DOCTYPE html>
                                  <html>
                                    <head>
                                      <title>Google Review Counter Stand - ${activeCompany.name}</title>
                                      <style>
                                        @page { size: A5 portrait; margin: 10mm; }
                                        body { font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 24px; background: #f8fafc; }
                                        .card { border: 3px solid #6366f1; border-radius: 28px; padding: 40px 24px; max-width: 420px; margin: 0 auto; background: #ffffff; }
                                        .logo-badge { background: #eef2ff; color: #4f46e5; display: inline-block; padding: 6px 18px; border-radius: 999px; font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 14px; }
                                        h1 { font-size: 26px; font-weight: 900; margin: 0 0 6px 0; color: #0f172a; }
                                        .stars { color: #f59e0b; font-size: 28px; letter-spacing: 6px; margin-bottom: 20px; }
                                        .qr-box { background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 24px; padding: 20px; display: inline-block; margin-bottom: 20px; }
                                        .qr-box img { width: 200px; height: 200px; display: block; }
                                        .scan-inst { font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0 0 6px 0; }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="card">
                                        <div class="logo-badge">Official Store Review</div>
                                        <h1>${activeCompany.name}</h1>
                                        <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Loved your experience with us today?</p>
                                        <div class="stars">★★★★★</div>
                                        <div class="qr-box">
                                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(reviewUrl)}" alt="QR" />
                                        </div>
                                        <div class="scan-inst">Scan to Rate on Google</div>
                                        <p style="color:#64748b;font-size:12px;">Scan the QR code with your phone camera to share your review.</p>
                                      </div>
                                      <script>setTimeout(function() { window.print(); }, 500);</script>
                                    </body>
                                  </html>
                                `);
                                win.document.close();
                              }}
                              className="h-8 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                            >
                              <QrCode className="size-3.5" /> Print Table Tent Card (A5)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Col: Live Interactive QR Card */}
                      <div className="p-5 flex flex-col items-center justify-center text-center space-y-3 bg-white border border-navy-200 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-black">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-4 fill-amber-500" />
                          ))}
                        </div>
                        <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-2xs">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${encodeURIComponent(
                              activeCompany.google_review_url || "https://search.google.com/local/writereview"
                            )}`}
                            alt="Google Review QR"
                            className="size-36 object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-black text-navy-900">Scan with Phone Camera</div>
                          <div className="text-[10px] text-navy-500 mt-0.5">Direct link to 5-star Google review prompt</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* OVERVIEW TAB */}
                {activeTab === "Overview" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-navy-200 bg-navy-50/50 space-y-2">
                      <div className="text-[11px] font-bold text-navy-500">Entity Details</div>
                      <div><strong>Trade Name:</strong> {activeCompany.name}</div>
                      <div><strong>Legal Name:</strong> {activeCompany.legal_name}</div>
                      <div><strong>Type:</strong> {activeCompany.company_type || "Private Limited"}</div>
                      <div><strong>Industry:</strong> {activeCompany.industry || "Retail"}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-navy-200 bg-navy-50/50 space-y-2">
                      <div className="text-[11px] font-bold text-navy-500">Contact & Location</div>
                      <div><strong>Email:</strong> {activeCompany.email || "—"}</div>
                      <div><strong>Phone:</strong> {activeCompany.phone || "—"}</div>
                      <div><strong>Address:</strong> {activeCompany.address || "—"}</div>
                      <div><strong>City / State:</strong> {activeCompany.city || "—"}, {activeCompany.state || "—"}</div>
                    </div>
                  </div>
                )}

                {/* OTHER TABS */}
                {activeTab !== "Google Reviews & QR ★ Live" && activeTab !== "Overview" && (
                  <div className="p-8 text-center text-xs text-navy-500 border border-dashed border-navy-200 rounded-xl bg-white">
                    Detailed {activeTab} information configured and synced with database.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-2xl">
              Select or create an organization to view review automation and legal configurations.
            </div>
          )}
        </div>
      </div>

      {/* Edit Organization Modal */}
      {showFormModal && (
        <CompanyFormModal
          company={editCompany}
          initialTab={modalInitialTab}
          onClose={() => setShowFormModal(false)}
          onSaved={loadCompanies}
        />
      )}
    </div>
  );
}
