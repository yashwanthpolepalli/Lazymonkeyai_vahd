import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { companies as mockCompanies } from "@/data/mock";
import { companiesApi, branchesApi, clearApiCache, type Company as RealCompany, type Branch as RealBranch } from "@/lib/api-client";
import { useCurrency } from "@/hooks/use-currency";

export interface TenantCompany {
  id: string;
  name: string;
  industry: string;
  logo: string;
  logo_url?: string | null;
  isReal?: boolean;
  raw?: RealCompany;
}

export interface TenantBranch {
  id: string;
  name: string;
  code: string;
  isReal?: boolean;
  raw?: RealBranch;
}

interface TenantContextType {
  tenant: TenantCompany; // Selected active company
  setTenant: (c: TenantCompany) => void;
  activeBranch: TenantBranch | null; // Selected active branch
  setActiveBranch: (b: TenantBranch | null) => void;
  companiesList: TenantCompany[]; // List of available companies
  branchesList: TenantBranch[]; // List of available branches
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { accessToken?: string };
    return parsed.accessToken ?? null;
  } catch {
    return null;
  }
}

function getAuthUserSlug(): string | null {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { user?: { tenantSlug?: string } };
    return parsed.user?.tenantSlug ?? null;
  } catch {
    return null;
  }
}

function getAuthIsPlatformAdmin(): boolean {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { user?: any };
    const u = parsed.user;
    if (!u) return false;
    return Boolean(u.isPlatformAdmin === true || u.is_platform_admin === true);
  } catch {
    return false;
  }
}

function getAuthUserTenantId(): string | null {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { user?: { tenantId?: string; tenant_id?: string } };
    return parsed.user?.tenantId || (parsed.user as any)?.tenant_id || null;
  } catch {
    return null;
  }
}

function getAuthUserTenantName(): string | null {
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { user?: { tenantName?: string; tenant_name?: string } };
    return parsed.user?.tenantName || (parsed.user as any)?.tenant_name || null;
  } catch {
    return null;
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
    const { currency, formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [companiesList, setCompaniesList] = useState<TenantCompany[]>([]);
  const [branchesList, setBranchesList] = useState<TenantBranch[]>([]);

  const [tenant, setTenantState] = useState<TenantCompany>(() => {
    // Initial sync load from localStorage if possible, fallback to first mock
    try {
      const stored = localStorage.getItem("bos-tenant");
      if (stored) return JSON.parse(stored) as TenantCompany;
    } catch {
      // ignore
    }
    return {
      id: mockCompanies[0].id,
      name: mockCompanies[0].name,
      industry: mockCompanies[0].industry,
      logo: mockCompanies[0].logo,
      logo_url: null,
    };
  });

  const [activeBranch, setActiveBranchState] = useState<TenantBranch | null>(() => {
    try {
      const stored = localStorage.getItem("bos-branch");
      if (stored) return JSON.parse(stored) as TenantBranch;
    } catch {
      // ignore
    }
    return null;
  });

  let queryClient: any = null;
  try {
    queryClient = useQueryClient();
  } catch {}

  const setTenant = useCallback((c: TenantCompany) => {
    setTenantState(c);
    localStorage.setItem("bos-tenant", JSON.stringify(c));
    clearApiCache();
    // Trigger storage event so other tabs/components listen
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("bos-tenant-changed", { detail: c }));
    if (queryClient) {
      try {
        queryClient.invalidateQueries();
      } catch {}
    }
  }, [queryClient]);

  const setActiveBranch = useCallback((b: TenantBranch | null) => {
    setActiveBranchState(b);
    if (b) {
      localStorage.setItem("bos-branch", JSON.stringify(b));
    } else {
      localStorage.removeItem("bos-branch");
    }
    window.dispatchEvent(new Event("storage"));
  }, []);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    const slug = getAuthUserSlug();
    const authTenantId = getAuthUserTenantId();
    const authTenantName = getAuthUserTenantName();
    const isPlatformAdminUser = getAuthIsPlatformAdmin();

    if (!token) {
      // Reset to mock data if not logged in
      const mappedMocks = mockCompanies.map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        logo: c.logo,
      }));
      setCompaniesList(mappedMocks);
      setBranchesList([]);
      return;
    }

    setLoading(true);
    try {
      let mappedCompanies: TenantCompany[] = [];
      const isPlatformAdmin = isPlatformAdminUser;

      if (isPlatformAdmin) {
        // Fetch all client tenant environments for SaaS impersonation switcher
        try {
          const sysRes = await fetch(`${API_BASE_URL}/system/tenants`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (sysRes.ok) {
            const sysTenants = await sysRes.json();
            if (Array.isArray(sysTenants) && sysTenants.length > 0) {
              mappedCompanies = sysTenants.map((t: any) => ({
                id: t.id,
                name: t.name,
                industry: "Client Workspace",
                logo: (t.name || "WS").slice(0, 2).toUpperCase(),
                logo_url: t.logo_url || null,
                isReal: true,
                raw: {
                  id: t.id,
                  tenant_id: t.id,
                  name: t.name,
                  slug: t.slug,
                  logo_initials: (t.name || "WS").slice(0, 2).toUpperCase(),
                  logo_url: t.logo_url || null,
                  ...(t.settings || {}),
                } as any
              }));
            }
          }
        } catch (sysErr) {
          console.warn("Could not fetch system tenants:", sysErr);
        }
      }

      // Fetch companies and branches concurrently for ultra-fast startup
      const [coResult, brResult] = await Promise.allSettled([
        mappedCompanies.length === 0 ? companiesApi.list(1, 100) : Promise.resolve({ items: [] }),
        branchesApi.list(1, 100)
      ]);

      if (mappedCompanies.length === 0 && coResult.status === "fulfilled" && coResult.value?.items) {
        mappedCompanies = coResult.value.items.map(c => ({
          id: c.id,
          name: c.name,
          industry: c.industry ?? "General",
          logo: c.logo_url || c.logo_initials || c.name.slice(0, 2).toUpperCase(),
          logo_url: c.logo_url || null,
          isReal: true,
          raw: c,
        }));
      }

      let mappedBranches: TenantBranch[] = [];
      if (brResult.status === "fulfilled" && brResult.value?.items) {
        mappedBranches = brResult.value.items.map(b => ({
          id: b.id,
          name: b.name,
          code: b.code,
          isReal: true,
          raw: b,
        }));
      }

      setCompaniesList(mappedCompanies);
      setBranchesList(mappedBranches);

      // Prioritize matching authenticated user's own tenant
      const userTenant = mappedCompanies.find(
        c => (authTenantId && c.id === authTenantId) ||
             (slug && (c.raw as any)?.slug === slug) ||
             (authTenantName && c.name.toLowerCase() === authTenantName.toLowerCase())
      );

      const currentStoredValid = mappedCompanies.find(c => c.id === tenant.id);

      if (userTenant && (!currentStoredValid || tenant.id.startsWith("c"))) {
        setTenant(userTenant);
      } else if (currentStoredValid) {
        // Sync any updated properties (like newly uploaded logo_url or name)
        if (currentStoredValid.logo_url !== tenant.logo_url || currentStoredValid.name !== tenant.name) {
          setTenant(currentStoredValid);
        }
      } else if (mappedCompanies.length > 0) {
        setTenant(userTenant || mappedCompanies[0]);
      }

      // Auto-select first branch if none selected
      const branchIsValid = mappedBranches.some(b => b.id === activeBranch?.id);
      if (!branchIsValid && mappedBranches.length > 0) {
        setActiveBranch(mappedBranches[0]);
      }
    } catch (err) {
      console.error("Failed to load tenant workspace list:", err);
      setCompaniesList([]);
    } finally {
      setLoading(false);
    }
  }, [tenant.id, tenant.logo_url, tenant.name, activeBranch?.id, setTenant, setActiveBranch]);

  useEffect(() => {
    void loadData();

    // Listen for auth storage changes (login/logout) and workspace deletions
    const handleStorageChange = () => {
      void loadData();
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("bos-tenant-changed", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("bos-tenant-changed", handleStorageChange);
    };
  }, [loadData]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        setTenant,
        activeBranch,
        setActiveBranch,
        companiesList,
        branchesList,
        loading,
        refresh: loadData,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
