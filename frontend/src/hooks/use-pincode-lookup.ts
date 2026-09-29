import { useCallback, useRef, useState } from "react";
import { utilsApi } from "@/lib/api-client";
import { toast } from "sonner";

export interface PincodeResult {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  area: string;
  region?: string;
  division?: string;
  post_offices?: string[];
}

export function usePincodeLookup() {
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, PincodeResult>>(new Map());

  const lookup = useCallback(async (pincode: string, opts?: { silent?: boolean }): Promise<PincodeResult | null> => {
    const clean = pincode.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) return null;

    const cached = cacheRef.current.get(clean);
    if (cached) return cached;

    setLoading(true);
    try {
      // 1. Try backend endpoint
      const res = await utilsApi.lookupPincode(clean);
      if (res && res.state) {
        cacheRef.current.set(clean, res);
        if (!opts?.silent) toast.success(`Address detected: ${res.area || res.city}, ${res.state}`);
        return res;
      }
      throw new Error("Empty response");
    } catch {
      // 2. Direct India Post fallback
      try {
        const directResp = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
        const data = await directResp.json();
        const first = Array.isArray(data) ? data[0] : data;
        if (first?.Status === "Success" && first.PostOffice?.length > 0) {
          const po = first.PostOffice[0];
          const result: PincodeResult = {
            pincode: clean,
            city: po.District || po.Block || po.Circle || "",
            district: po.District || "",
            state: po.State || "",
            country: po.Country || "India",
            area: po.Name || "",
            region: po.Region || "",
            division: po.Division || "",
            post_offices: first.PostOffice.map((p: any) => p.Name).filter(Boolean),
          };
          cacheRef.current.set(clean, result);
          if (!opts?.silent) toast.success(`Address detected: ${result.area || result.city}, ${result.state}`);
          return result;
        }
      } catch (err: any) {
        if (!opts?.silent) toast.error("Could not find address for PIN " + clean);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading };
}
