import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { PiggyBank, Receipt, TrendingUp, PieChart as PieIcon, Loader2, Package, RefreshCcw, TrendingDown } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useCurrency } from "@/hooks/use-currency";

export function CostAnalysis() {
    const { currency, formatCurrency } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"category" | "products">("category");

  const fetchCostData = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getCostAnalysis();
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load cost analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, []);

  const totalCost = data?.total_procurement_cost || 0;
  const estimatedTax = totalCost * 0.18; // Default 18% standard GST baseline
  const returnLoss = data?.return_loss || 0;
  const priceVariance = data?.price_variance?.amount || 0;
  const isPositiveVariance = data?.price_variance?.is_positive;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-6 text-foreground pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Cost & Budget Analysis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Intelligent breakdown of purchasing costs, category distribution, and return leakages.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="animate-pulse">Analyzing cost ledger...</p>
        </div>
      ) : !data ? (
        <div className="bg-background/60 backdrop-blur-md border border-white/10 p-12 rounded-2xl text-center text-muted-foreground font-semibold shadow-xl">
          <PiggyBank className="size-12 mx-auto mb-4 text-muted-foreground/30" />
          No cost ledger transactions logged to compute cost analysis.
        </div>
      ) : (
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="visible"
          className="space-y-6"
        >
          {/* Advanced KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <PiggyBank className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Purchase Cost</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">
                    {currency.symbol}{totalCost.toLocaleString("en-IN")}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-rose-400 to-red-600 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <Receipt className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Tax Paid</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">
                    {currency.symbol}{estimatedTax.toLocaleString("en-IN")}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-white/10 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none group-hover:scale-125 transition-transform duration-500">
                  <TrendingDown className="size-24 text-emerald-500" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform relative z-10">
                  <TrendingUp className="size-6" />
                </div>
                <div className="relative z-10">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Price Variance (Savings)</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground flex items-center gap-1">
                    {isPositiveVariance ? "-" : "+"}{currency.symbol}{priceVariance.toLocaleString("en-IN")}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-5 bg-background/70 backdrop-blur-xl border border-rose-500/20 shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group">
                <div className="size-12 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-white grid place-items-center shadow-inner group-hover:scale-110 transition-transform">
                  <RefreshCcw className="size-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Return Loss Value</div>
                  <div className="text-2xl font-black font-mono tracking-tighter mt-0.5 text-foreground">
                    {currency.symbol}{returnLoss.toLocaleString("en-IN")}
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Trend Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Cost & Tax Trends</h3>
                    <p className="text-xs text-muted-foreground">Historical procurement spend timeline</p>
                  </div>
                </div>
                
                <div className="flex-1 w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.cost_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCostGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorTaxGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
                      <XAxis dataKey="month" tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "currentColor", fontSize: 11 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => `₹${v/1000}k`} />
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
                      <Area type="monotone" dataKey="purchase_cost" name="Purchase Cost" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCostGradient)" activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="tax_amount" name="Tax Amount" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTaxGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* Distribution Inner Tabs */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg h-full flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    {activeTab === "category" ? <PieIcon className="size-5 text-indigo-500" /> : <Package className="size-5 text-purple-500" />}
                    Distribution
                  </h3>
                  
                  <div className="flex bg-muted/50 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab("category")}
                      className={`text-[10px] px-3 py-1 font-bold uppercase rounded-md transition-all ${activeTab === "category" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Category
                    </button>
                    <button 
                      onClick={() => setActiveTab("products")}
                      className={`text-[10px] px-3 py-1 font-bold uppercase rounded-md transition-all ${activeTab === "products" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Top Items
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activeTab === "category" ? (
                      <motion.div 
                        key="cat"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-5"
                      >
                        {data.category_costs && data.category_costs.map((item: any, idx: number) => {
                          const pct = totalCost > 0 ? (item.value / totalCost) * 100 : 0;
                          return (
                            <div key={idx} className="group">
                              <div className="flex justify-between items-center text-xs mb-1.5">
                                <span className="font-semibold text-foreground">{item.category}</span>
                                <span className="font-bold font-mono text-muted-foreground group-hover:text-primary transition-colors">
                                  {currency.symbol}{item.value.toLocaleString("en-IN")} ({Math.round(pct)}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="prod"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        {data.top_cost_drivers && data.top_cost_drivers.length > 0 ? data.top_cost_drivers.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-background/40 hover:bg-background/80 border border-white/5 transition-all">
                            <div>
                              <div className="font-bold text-sm text-foreground line-clamp-1">{item.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">{item.sku}</div>
                            </div>
                            <div className="font-mono font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                              {currency.symbol}{item.cost.toLocaleString("en-IN")}
                            </div>
                          </div>
                        )) : (
                          <div className="text-center text-xs text-muted-foreground py-8">No product data available</div>
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
