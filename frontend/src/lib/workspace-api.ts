import { ApiError } from "./api-client";
import { useCurrency } from "@/hooks/use-currency";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "http://127.0.0.1:8000/api/v1";

export interface DashboardKPI {
  label: string;
  value: string | number;
  change: number;
  hint: string;
  tone: "blue" | "purple" | "amber" | "cyan" | "green";
  isCurrency?: boolean;
}

export interface DashboardData {
  kpis: DashboardKPI[];
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = null;
  try {
    const authItem = localStorage.getItem("bos-auth");
    if (authItem) {
      token = JSON.parse(authItem).accessToken;
    }
  } catch (e) {
    console.warn("Failed to parse bos-auth from localStorage");
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  try {
    const storedTenant = localStorage.getItem("bos-tenant");
    if (storedTenant) {
      const parsed = JSON.parse(storedTenant);
      const companyId = parsed.id || parsed.company_id || parsed.raw?.id;
      if (companyId) {
        headers.set("X-Company-Id", companyId);
        headers.set("X-Workspace-Id", companyId);
      }
    }
  } catch {}
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw { status: response.status, detail: errorData.detail } as ApiError;
  }
  
  return response.json();
}

export interface DashboardChartsData {
  revenueData: any[];
  channelData: any[];
  ordersTrend: any[];
}

export interface DashboardWidgetsData {
  operationsWidgets: any[];
  branchPerformance: any[];
  inventoryAlerts: any[];
  recentActivity: any[];
  notifications: any[];
  calendarEvents: any[];
}

export const workspaceApi = {
  getCurrentWorkspace: async (): Promise<{ name: string; id: string }> => {
    return { id: "W-1", name: "Store HQ" };
  },
  getDashboardKPIs: async (): Promise<DashboardData> => {
    return fetchWithAuth(`${API_BASE_URL}/workspace/dashboard/kpis`);
  },
  getDashboardCharts: async (): Promise<DashboardChartsData> => {
    return fetchWithAuth(`${API_BASE_URL}/workspace/dashboard/charts`);
  },
  getDashboardWidgets: async (): Promise<DashboardWidgetsData> => {
    return fetchWithAuth(`${API_BASE_URL}/workspace/dashboard/widgets`);
  },
  getDashboardFeeds: async (): Promise<Record<string, any[]>> => {
    return fetchWithAuth(`${API_BASE_URL}/workspace/dashboard/feeds`);
  }
};
