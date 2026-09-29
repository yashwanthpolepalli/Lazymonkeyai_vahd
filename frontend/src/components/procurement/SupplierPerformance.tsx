import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Activity, Clock, ShieldCheck, Truck, Loader2, Star, Plus, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function SupplierPerformance() {
    const { currency, formatCurrency } = useCurrency();
  const [performance, setPerformance] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [delivery, setDelivery] = useState(5.0);
  const [quality, setQuality] = useState(5.0);
  const [pricing, setPricing] = useState(5.0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers();
      setSuppliers(supps || []);
      
      const res = await inventoryApi.getSupplierPerformance();
      setPerformance(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier performance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return toast.error("Supplier is required");
    try {
      const overall = (Number(delivery) + Number(quality) + Number(pricing)) / 3;
      await inventoryApi.createSupplierPerformance({
        supplier_id: supplierId,
        delivery_rating: Number(delivery),
        quality_rating: Number(quality),
        pricing_rating: Number(pricing),
        overall_rating: Number(overall.toFixed(2))
      });
      toast.success("Supplier evaluation saved successfully");
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save evaluation");
    }
  };

  const avgDelivery = performance.length ? (performance.reduce((acc, x) => acc + x.delivery_rating, 0) / performance.length).toFixed(1) : "5.0";
  const avgQuality = performance.length ? (performance.reduce((acc, x) => acc + x.quality_rating, 0) / performance.length).toFixed(1) : "5.0";
  const avgPricing = performance.length ? (performance.reduce((acc, x) => acc + x.pricing_rating, 0) / performance.length).toFixed(1) : "5.0";
  const avgOverall = performance.length ? (performance.reduce((acc, x) => acc + x.overall_rating, 0) / performance.length).toFixed(1) : "5.0";

  const stats = [
    { label: "Delivery Accuracy Rating", value: `${avgDelivery} / 5.0`, icon: Truck, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Product Quality Rating", value: `${avgQuality} / 5.0`, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Pricing Competitiveness", value: `${avgPricing} / 5.0`, icon: Star, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Overall Partner Rating", value: `${avgOverall} / 5.0`, icon: Activity, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Supplier Performance
          </h2>
          <p className="text-sm text-muted-foreground">Monitor KPIs like delivery accuracy, quality, and returns.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Add Evaluation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <Card key={i} className={`bg-card p-5 flex items-center gap-4 border shadow-sm`}>
            <div className={`size-12 rounded-xl grid place-items-center bg-muted`}>
              <s.icon className={`size-6 ${s.color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">{s.label}</div>
              <div className="text-2xl font-bold font-mono mt-1">{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-card border p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Historical Evaluations Log</h3>
        
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            Loading historical data...
          </div>
        ) : performance.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-semibold">
            No evaluation records compiled yet. Click "Add Evaluation" to score a vendor partner.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                  <th className="py-3.5 px-4">Supplier Partner</th>
                  <th className="py-3.5 px-4 text-center">Delivery Score</th>
                  <th className="py-3.5 px-4 text-center">Quality Score</th>
                  <th className="py-3.5 px-4 text-center">Pricing Score</th>
                  <th className="py-3.5 px-4 text-center">Overall Score</th>
                  <th className="py-3.5 px-4 text-right">Evaluation Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {performance.map((record) => {
                  const supplier = suppliers.find(s => s.id === record.supplier_id);
                  return (
                    <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-bold">{supplier?.name || "Unknown"}</td>
                      <td className="py-3 px-4 text-center font-mono text-blue-500 font-semibold">{record.delivery_rating.toFixed(1)} / 5.0</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600 font-semibold">{record.quality_rating.toFixed(1)} / 5.0</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-500 font-semibold">{record.pricing_rating.toFixed(1)} / 5.0</td>
                      <td className="py-3 px-4 text-center font-mono text-primary font-bold">{record.overall_rating.toFixed(1)} / 5.0</td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">
                        {record.evaluation_date ? new Date(record.evaluation_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Evaluate Supplier Performance
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Supplier Partner *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <label className="text-muted-foreground">Delivery Accuracy (1-5)</label>
                  <span className="text-blue-500 font-bold">{delivery}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={delivery}
                  onChange={(e) => setDelivery(Number(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <label className="text-muted-foreground">Quality Compliance (1-5)</label>
                  <span className="text-emerald-500 font-bold">{quality}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <label className="text-muted-foreground">Pricing Competitiveness (1-5)</label>
                  <span className="text-amber-500 font-bold">{pricing}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={pricing}
                  onChange={(e) => setPricing(Number(e.target.value))}
                  className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg">
                  Submit Evaluation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
