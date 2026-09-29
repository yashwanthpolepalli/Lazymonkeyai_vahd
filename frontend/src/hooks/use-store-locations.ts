import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { getActiveBillingGst, getTenantIdFromStorage } from "@/lib/receipt-template-store";
import { branchesApi, type Branch } from "@/lib/api-client";

export interface StoreLocation {
  id: string;
  name: string;
  displayName: string;
  shortName: string;
  code: string;
  isMainStore: boolean;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  raw?: any;
}

export function useStoreLocations() {
  const { tenant, branchesList: tenantBranches, activeBranch } = useTenant();
  const [fetchedBranches, setFetchedBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);

  const tenantId = tenant?.id || getTenantIdFromStorage();

  // Fetch branches directly if not available in tenant context
  const loadBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await branchesApi.list(1, 100);
      if (res && Array.isArray(res.items)) {
        setFetchedBranches(res.items);
      }
    } catch (err) {
      console.warn("Could not fetch branch list for store locations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantBranches || tenantBranches.length === 0) {
      void loadBranches();
    }
  }, [loadBranches, tenantBranches]);

  // Combine tenant context branches with directly fetched branches
  const effectiveBranches = useMemo(() => {
    if (tenantBranches && tenantBranches.length > 0) {
      return tenantBranches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        address: (b as any).address || (b.raw as any)?.address || "",
        city: (b as any).city || (b.raw as any)?.city || "",
        state: (b as any).state || (b.raw as any)?.state || "",
        phone: (b as any).phone || (b.raw as any)?.phone || "",
        email: (b as any).email || (b.raw as any)?.email || "",
        gstin: (b as any).gstin || (b.raw as any)?.gstin || "",
        raw: b.raw || b,
      }));
    }
    return fetchedBranches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code || "",
      address: b.address || "",
      city: b.city || "",
      state: b.state || "",
      phone: b.phone || "",
      email: b.email || "",
      gstin: (b as any).gstin || "",
      raw: b,
    }));
  }, [tenantBranches, fetchedBranches]);

  // Build the complete list of stores
  const stores: StoreLocation[] = useMemo(() => {
    const activeGst = getActiveBillingGst(tenantId);
    
    // Retrieve onboarded company name
    let companyName = "Company";
    if (activeGst?.trade_name && activeGst.trade_name !== "Organization") {
      companyName = activeGst.trade_name;
    } else if (tenant?.name && tenant.name !== "Default Company") {
      companyName = tenant.name;
    } else if (activeGst?.legal_name && activeGst.legal_name !== "Organization") {
      companyName = activeGst.legal_name;
    }

    const defaultMainStoreName = `${companyName} (Main Store)`;

    const mainStore: StoreLocation = {
      id: "main-store",
      name: defaultMainStoreName,
      displayName: defaultMainStoreName,
      shortName: companyName,
      code: "MAIN",
      isMainStore: true,
      address: activeGst?.address || (tenant as any)?.raw?.address || "",
      city: (tenant as any)?.raw?.city || "",
      state: activeGst?.state_name || (tenant as any)?.raw?.state || "",
      phone: activeGst?.phone || (tenant as any)?.raw?.phone || "",
      email: activeGst?.email || (tenant as any)?.raw?.email || "",
      gstin: activeGst?.gstin || "",
      raw: tenant,
    };

    // Filter out branches that exactly duplicate the main store name
    const branchStores: StoreLocation[] = effectiveBranches
      .filter((b) => b.name && b.name.toLowerCase() !== companyName.toLowerCase())
      .map((b) => {
        const dName = b.code ? `${b.name} (${b.code})` : b.name;
        return {
          id: b.id,
          name: dName,
          displayName: dName,
          shortName: b.name,
          code: b.code || "",
          isMainStore: false,
          address: b.address,
          city: b.city,
          state: b.state,
          phone: b.phone,
          email: b.email,
          gstin: b.gstin,
          raw: b.raw,
        };
      });

    return [mainStore, ...branchStores];
  }, [tenant, tenantId, effectiveBranches]);

  // Read saved store from localStorage
  const storageKey = `bos_selected_store_${tenantId}`;
  const [selectedStore, setSelectedStoreState] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey) || localStorage.getItem("bos_selected_store");
        if (saved) return saved;
      }
    } catch {}
    return stores[0]?.name || "Company (Main Store)";
  });

  // Sync default when stores list initializes
  useEffect(() => {
    if (stores.length > 0) {
      const saved = localStorage.getItem(storageKey) || localStorage.getItem("bos_selected_store");
      const exists = stores.some((s) => s.name === saved || s.id === saved || s.displayName === saved);
      if (!saved || !exists) {
        setSelectedStoreState(stores[0].name);
      } else if (saved) {
        const matched = stores.find((s) => s.name === saved || s.id === saved || s.displayName === saved);
        if (matched && matched.name !== selectedStore) {
          setSelectedStoreState(matched.name);
        }
      }
    }
  }, [stores, storageKey]);

  const setSelectedStore = useCallback(
    (nameOrId: string) => {
      const matched = stores.find((s) => s.name === nameOrId || s.id === nameOrId || s.displayName === nameOrId);
      const finalName = matched ? matched.name : nameOrId;
      setSelectedStoreState(finalName);
      try {
        localStorage.setItem(storageKey, finalName);
        localStorage.setItem("bos_selected_store", finalName);
        window.dispatchEvent(new CustomEvent("bos-store-changed", { detail: finalName }));
      } catch {}
    },
    [stores, storageKey]
  );

  // Listen for global store change events
  useEffect(() => {
    const handleStoreChange = (e: any) => {
      const newStore = e.detail;
      if (newStore && newStore !== selectedStore) {
        setSelectedStoreState(newStore);
      }
    };
    window.addEventListener("bos-store-changed", handleStoreChange);
    return () => window.removeEventListener("bos-store-changed", handleStoreChange);
  }, [selectedStore]);

  const selectedStoreDetails = useMemo(() => {
    return stores.find((s) => s.name === selectedStore || s.displayName === selectedStore || s.id === selectedStore) || stores[0];
  }, [stores, selectedStore]);

  const storeOptions = useMemo(() => {
    return stores.map((s) => s.name);
  }, [stores]);

  return {
    stores,
    storeOptions,
    selectedStore,
    setSelectedStore,
    selectedStoreDetails,
    loading,
    refreshStores: loadBranches,
  };
}
