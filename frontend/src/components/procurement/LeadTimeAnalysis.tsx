import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Clock, Truck, TrendingUp, AlertTriangle, Loader2, Star, RefreshCcw, Percent } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion, Variants } from "framer-motion";
import { useCurrency } from "@/hooks/use-currency";

export function LeadTimeAnalysis() {
    const { currency, formatCurrency } = useCurrency();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getLeadTimeAnalysis();
      setData(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load vendor analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const avgLeadDays = data.length > 0 ? (data.reduce((acc, x) => acc + x.average_lead_days, 0) / data.length).toFixed(1) : "0.0";
  const avgOnTime = data.length > 0 ? (data.reduce((acc, x) => acc + x.on_time_delivery_rate, 0) / data.length).toFixed(1) : "0.0";
  const avgQuality = data.length > 0 ? (data.reduce((acc, x) => acc + (x.quality_rating || 0), 0) / data.length).toFixed(1) : "0.0";

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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Vendor Performance Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor supplier reliability, lead times, quality ratings, and dependency risks.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="animate-pulse">Analyzing vendor logs...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-background/60 backdrop-blur-md border border-white/10 p-12 rounded-2xl text-center text-muted-foreground font-semibold shadow-xl">
          <Truck className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          No supplier transactions logged to compute analytics.
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <Clock className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Lead Time</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{avgLeadDays}d</div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <Truck className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">On-Time Fulfillment</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{avgOnTime}%</div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <Star className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Quality Rating</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{avgQuality} / 5</div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active Vendors</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{data.length}</div>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Average Lead Time by Vendor</h3>
                    <p className="text-xs text-muted-foreground">Historical fulfillment speeds (Days)</p>
                  </div>
                </div>
                
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
                      <XAxis dataKey="vendor" tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "rgba(var(--background), 0.8)", 
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                        }}
                        labelClassName="font-bold text-foreground mb-2"
                        itemStyle={{ fontSize: "12px", fontWeight: "600", color: "#818cf8" }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="average_lead_days" name="Lead Time (Days)" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.average_lead_days > 5 ? '#f43f5e' : entry.average_lead_days < 3 ? '#10b981' : '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Vendor List / Performance Table */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                      <AlertTriangle className="size-5 text-amber-500" /> Supplier Risk Matrix
                    </h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {data.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-background/40 hover:bg-background/80 border border-white/5 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-bold text-sm text-foreground">{item.vendor}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Star className="size-3 text-amber-500 fill-amber-500" /> {item.quality_rating || "4.5"} Rating
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.on_time_delivery_rate >= 95 ? "bg-emerald-500/10 text-emerald-500" : 
                            item.on_time_delivery_rate >= 90 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                          }`}>
                            {item.on_time_delivery_rate}% On-Time
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 mb-1">
                            <RefreshCcw className="size-3" /> Return Rate
                          </div>
                          <div className={`text-xs font-mono font-bold ${item.return_rate > 3 ? "text-rose-500" : "text-foreground"}`}>
                            {item.return_rate}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1 mb-1">
                            <Percent className="size-3" /> Dependency
                          </div>
                          <div className="text-xs font-mono font-bold text-foreground">
                            {item.dependency}% Volume
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
