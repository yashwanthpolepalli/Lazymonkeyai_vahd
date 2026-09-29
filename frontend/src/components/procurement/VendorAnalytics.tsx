import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Trophy, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";

export function VendorAnalytics() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getLeadTimeAnalysis();
      setAnalytics(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load vendor analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Vendor Performance Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Identify top performing suppliers and risk factors.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading vendor profiles...
        </div>
      ) : analytics.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No supplier transactions logged to compute vendor analytics.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border p-6 flex flex-col items-center text-center border-t-4 border-t-amber-500 rounded-xl shadow-sm">
            <div className="size-16 rounded-full bg-amber-500/10 text-amber-600 grid place-items-center mb-4">
              <Trophy className="size-8" />
            </div>
            <h3 className="font-bold text-lg">Most Used Partner</h3>
            <p className="text-sm text-muted-foreground mt-2">{analytics[0]?.vendor || "No vendor recorded"}</p>
            <div className="text-xs font-semibold mt-2.5 text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
              High volume supplier
            </div>
          </Card>

          <Card className="bg-card border p-6 flex flex-col items-center text-center border-t-4 border-t-emerald-500 rounded-xl shadow-sm">
            <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mb-4">
              <ShieldCheck className="size-8" />
            </div>
            <h3 className="font-bold text-lg">Most Reliable Partner</h3>
            <p className="text-sm text-muted-foreground mt-2">{analytics[2]?.vendor || "No vendor recorded"}</p>
            <div className="text-xs font-semibold mt-2.5 text-emerald-650 bg-emerald-500/10 px-2 py-0.5 rounded">
              {analytics[2]?.on_time_delivery_rate || 100}% Delivery Rate
            </div>
          </Card>

          <Card className="bg-card border p-6 flex flex-col items-center text-center border-t-4 border-t-blue-500 rounded-xl shadow-sm">
            <div className="size-16 rounded-full bg-blue-500/10 text-blue-600 grid place-items-center mb-4">
              <Clock className="size-8" />
            </div>
            <h3 className="font-bold text-lg">Fastest Fulfillment</h3>
            <p className="text-sm text-muted-foreground mt-2">{analytics[4]?.vendor || "No vendor recorded"}</p>
            <div className="text-xs font-semibold mt-2.5 text-blue-650 bg-blue-500/10 px-2 py-0.5 rounded">
              Avg {analytics[4]?.average_lead_days || 1.2} Days Lead Time
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
