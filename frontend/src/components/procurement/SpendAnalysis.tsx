import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { BarChart3, Loader2, Building2, Briefcase, TrendingUp } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { motion, Variants } from "framer-motion";
import { useCurrency } from "@/hooks/use-currency";

export function SpendAnalysis() {
    const { currency, formatCurrency } = useCurrency();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSpend = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSpendAnalysis();
      setAnalytics(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load spend analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpend();
  }, []);

  const totalSpend = analytics?.total_spend || 0;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-6 text-foreground pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Spend Analysis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Interactive analytics for supplier spend and procurement value distribution.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="animate-pulse">Loading spend analytics...</p>
        </div>
      ) : !analytics ? (
        <div className="bg-background/60 backdrop-blur-md border border-white/10 p-12 rounded-2xl text-center text-muted-foreground font-semibold shadow-xl">
          <BarChart3 className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          No procurement transactions logged to run spend analysis.
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div variants={itemVariants} className="md:col-span-2">
            <Card className="bg-background/60 backdrop-blur-xl border border-white/10 p-6 h-full shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                  <Building2 className="size-5 text-indigo-500" /> Spend by Supplier
                </h3>
              </div>
              
              <div className="space-y-5">
                {analytics.supplier_spend && analytics.supplier_spend.length > 0 ? (
                  analytics.supplier_spend.map((item: any, i: number) => {
                    const pct = totalSpend > 0 ? (item.amount / totalSpend) * 100 : 0;
                    return (
                      <div key={i} className="group">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Briefcase className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            {item.supplier}
                          </span>
                          <span className="font-bold font-mono text-muted-foreground group-hover:text-primary transition-colors">
                            {currency.symbol}{item.amount.toLocaleString("en-IN")} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" 
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground font-medium py-12 text-center flex flex-col items-center gap-3">
                    <Building2 className="size-10 text-muted-foreground/20" />
                    No supplier transactions mapped.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-6 flex flex-col justify-center rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <BarChart3 className="size-32" />
              </div>
              <div className="relative z-10">
                <div className="text-[11px] uppercase font-bold text-white/70 mb-1 tracking-wider">Total Procurement Spend (YTD)</div>
                <div className="text-4xl font-black font-mono tracking-tighter drop-shadow-md">
                  {currency.symbol}{totalSpend.toLocaleString("en-IN")}
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs font-semibold bg-black/20 w-fit px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">
                  <TrendingUp className="size-3 text-emerald-300" />
                  Active ledger verified
                </div>
              </div>
            </Card>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
}
