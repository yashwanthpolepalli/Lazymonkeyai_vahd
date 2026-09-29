import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Global Currency Settings & Formatters ─────────────────────────────
export interface CurrencyConfig {
  code: string;       // e.g. "USD", "INR", "EUR", "AED"
  locale: string;     // e.g. "en-US", "en-IN", "de-DE", "ar-AE"
  symbol: string;     // e.g. "$", "₹", "€", "د.إ"
}

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.52
};

export const AVAILABLE_CURRENCIES: CurrencyConfig[] = [
  { code: "INR", locale: "en-IN", symbol: "₹" },
  { code: "USD", locale: "en-US", symbol: "$" },
  { code: "EUR", locale: "de-DE", symbol: "€" },
  { code: "GBP", locale: "en-GB", symbol: "£" },
  { code: "AED", locale: "ar-AE", symbol: "د.إ" },
  { code: "SAR", locale: "ar-SA", symbol: "ر.س" },
  { code: "CAD", locale: "en-CA", symbol: "C$" },
  { code: "AUD", locale: "en-AU", symbol: "A$" }
];

export function getActiveCurrency(): CurrencyConfig {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("bos-currency");
    if (stored) {
      const match = AVAILABLE_CURRENCIES.find(c => c.code === stored);
      if (match) return match;
    }
  }
  return AVAILABLE_CURRENCIES[0]; // Default to INR
}

export function setActiveCurrency(code: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("bos-currency", code);
    // Dispatch custom event to notify all components to re-render
    window.dispatchEvent(new Event("bos-currency-changed"));
  }
}

export function formatCurrency(val?: number | null): string {
  const currency = getActiveCurrency();
  const amount = Number(val ?? 0);
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: 2
  }).format(amount);
}

// ── Global Date & Time Utilities ──────────────────────────────────────
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(includeSeconds = true): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  if (!includeSeconds) return `${hours}:${minutes}`;
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return getTodayDateString();
  const parts = dateStr.split("-").map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  try {
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-");
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput || "");
  }
}

export function formatDisplayDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${day}/${month}/${year}, ${time}`;
  } catch {
    return String(dateInput || "");
  }
}

export function isValidUUID(id: any): boolean {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
