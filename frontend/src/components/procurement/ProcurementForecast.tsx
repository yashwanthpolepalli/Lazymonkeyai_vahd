import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Sparkles, Calendar, ShieldCheck, AlertCircle, Loader2, ArrowRight, TriangleAlert, Info } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useCurrency } from "@/hooks/use-currency";

export function ProcurementForecast() {
    const { currency, formatCurrency } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"replenishment" | "risk">("replenishment");

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getProcurementForecast();
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load procurement forecast");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const totalDemand = data?.forecast_timeline ? data.forecast_timeline.reduce((acc: number, x: any) => acc + x.predicted_demand, 0) : 0;
  const avgMonthlyDemand = data?.forecast_timeline && data.forecast_timeline.length > 0 
    ? Math.round(totalDemand / data.forecast_timeline.length) 
    : 0;

  const estReorderCost = data?.estimated_reorder_cost || 0;
  const riskItemsCount = data?.stockout_risk_items?.length || 0;

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
        <h2 className="text-2xl font-bold tracking-tight text-foreground">AI Procurement Forecast
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Predictive demand modeling, stockout risk analysis, and automated replenishment queues.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="animate-pulse">Calculating predictive inventory runs...</p>
        </div>
      ) : !data ? (
        <div className="bg-background/60 backdrop-blur-md border border-white/10 p-12 rounded-2xl text-center text-muted-foreground font-semibold shadow-xl">
          <Sparkles className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          No inventory stock ledger logged to compile demand forecasting.
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          
          {/* KPI Forecast Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <Calendar className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Avg Monthly Demand</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{avgMonthlyDemand.toLocaleString()} Units</div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform relative overflow-hidden">
                  <Sparkles className="absolute inset-0 m-auto size-full opacity-20 animate-spin-slow" />
                  <ShieldCheck className="size-6 relative z-10" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">AI Replenishments</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{data.replenishment_orders?.length || 0} Batches</div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <AlertCircle className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Est. Reorder Cost</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{currency.symbol}{(estReorderCost/100000).toFixed(1)}L</div>
                </div>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className={`p-5 bg-background/70 backdrop-blur-xl border ${riskItemsCount > 0 ? 'border-rose-500/30' : 'border-white/10'} shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group`}>
                <div className={`size-12 rounded-xl ${riskItemsCount > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-gray-500 to-slate-600'} text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform`}>
                  <TriangleAlert className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Critical Stockouts</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">{riskItemsCount} Alerts</div>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Forecast Line Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Predictive Demand vs. Safety Cushion</h3>
                    <p className="text-xs text-muted-foreground">Volume forecast based on historical consumption</p>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.forecast_timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
                      <XAxis dataKey="month" tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
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
                        itemStyle={{ fontSize: "12px", fontWeight: "600" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: "20px" }} />
                      <Area type="monotone" dataKey="predicted_demand" name="Predicted Demand" fill="url(#colorDemand)" stroke="none" />
                      <Line type="monotone" dataKey="predicted_demand" name="Predicted Demand" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: "#818cf8", strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="safety_stock" name="Safety Threshold" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Replenishment Orders & Risk Table */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    {activeTab === "replenishment" ? <AlertCircle className="size-5 text-indigo-500" /> : <TriangleAlert className="size-5 text-rose-500" />}
                    Action Queue
                  </h3>
                  
                  <div className="flex bg-muted/50 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab("replenishment")}
                      className={`text-[10px] px-3 py-1 font-bold uppercase rounded-md transition-all ${activeTab === "replenishment" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Reorder
                    </button>
                    <button 
                      onClick={() => setActiveTab("risk")}
                      className={`text-[10px] px-3 py-1 font-bold uppercase rounded-md transition-all flex items-center gap-1 ${activeTab === "risk" ? "bg-background shadow-sm text-rose-500" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Risk {riskItemsCount > 0 && <span className="size-1.5 bg-rose-500 rounded-full animate-pulse"></span>}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activeTab === "replenishment" ? (
                      <motion.div 
                        key="rep"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        {data.replenishment_orders && data.replenishment_orders.length > 0 ? data.replenishment_orders.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-background/40 hover:bg-background/80 border border-white/5 transition-all group">
                            <div className="flex justify-between items-start">
                              <div className="pr-4">
                                <div className="font-bold text-sm text-foreground">{item.product}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sku} &bull; {item.vendor}</div>
                              </div>
                              <div className="text-right whitespace-nowrap">
                                <div className="font-mono text-sm font-black text-primary">+{item.recommended_qty}</div>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 border shadow-sm ${
                                  item.urgency === "High" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }`}>
                                  {item.urgency} Priority
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px]">
                              <span className="text-muted-foreground font-semibold flex items-center gap-1">
                                <Info className="size-3" /> Est. Cost
                              </span>
                              <span className="font-mono font-bold text-foreground">{currency.symbol}{item.est_cost?.toLocaleString("en-IN") || 0}</span>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center text-xs text-muted-foreground py-8">No replenishment needed currently.</div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="risk"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        {data.stockout_risk_items && data.stockout_risk_items.length > 0 ? data.stockout_risk_items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition-all group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-red-600"></div>
                            <div className="flex justify-between items-start pl-2">
                              <div>
                                <div className="font-bold text-sm text-foreground">{item.product}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sku}</div>
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
                                  {item.risk_level}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-rose-500/10 pl-2">
                              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Est. Missed Revenue</div>
                              <div className="font-mono font-black text-rose-500">{currency.symbol}{item.missed_revenue?.toLocaleString("en-IN")}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center text-xs text-muted-foreground py-8 flex flex-col items-center gap-2">
                            <ShieldCheck className="size-8 text-emerald-500 opacity-50" />
                            No immediate stockout risks detected.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
