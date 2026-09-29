import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { 
  Plus, 
  Boxes, 
  Loader2, 
  Eye, 
  Receipt, 
  Search, 
  Calendar, 
  ArrowUpDown, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  PackageCheck,
  X 
} from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { GoodsReceivedNoteForm } from "./GoodsReceivedNoteForm";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";

type DatePreset = "all" | "today" | "yesterday" | "this_week" | "this_month" | "last_30_days" | "custom";
type SortOption = "date_desc" | "date_asc" | "items_desc" | "items_asc";

export function GoodsReceivedNotes() {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // ── Filters & Search State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qcFilter, setQcFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getGoodsReceivedNotes();
      setGrns(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load GRN logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const handleTenantChange = () => {
      fetchData();
    };
    window.addEventListener("bos-tenant-changed", handleTenantChange);
    return () => window.removeEventListener("bos-tenant-changed", handleTenantChange);
  }, [tenant?.id, (tenant as any)?.raw?.tenant_id]);

  // ── Date Range Presets Handler ─────────────────────────────────────────────
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yStart = new Date(d);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(d);
      yEnd.setHours(23, 59, 59, 999);
      setStartDate(yStart.toISOString().slice(0, 10));
      setEndDate(yEnd.toISOString().slice(0, 10));
    } else if (preset === "this_week") {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff));
      mon.setHours(0, 0, 0, 0);
      setStartDate(mon.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "last_30_days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    setQcFilter("all");
    setSortBy("date_desc");
  };

  const isFiltered = Boolean(
    searchQuery ||
    datePreset !== "all" ||
    startDate ||
    endDate ||
    statusFilter !== "all" ||
    qcFilter !== "all" ||
    sortBy !== "date_desc"
  );

  // ── Filtered & Sorted GRNs ─────────────────────────────────────────────────
  const filteredGrns = useMemo(() => {
    return grns.filter((grn: any) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchGrnNum = (grn.grn_number || "").toLowerCase().includes(q);
        const matchPo = (grn.po_number || "").toLowerCase().includes(q);
        const matchItems = (grn.items || []).some((it: any) => 
          (it.product_name || "").toLowerCase().includes(q)
        );
        if (!matchGrnNum && !matchPo && !matchItems) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        if ((grn.status || "Received").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. QC Filter
      if (qcFilter !== "all") {
        const hasRejections = (grn.items || []).some((it: any) => Number(it.quantity_rejected || 0) > 0);
        if (qcFilter === "rejected" && !hasRejections) return false;
        if (qcFilter === "passed" && hasRejections) return false;
      }

      // 4. Date Range Filter
      const rawDate = grn.received_date || grn.created_at;
      if (rawDate && (startDate || endDate)) {
        const itemDate = new Date(rawDate).getTime();
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (itemDate < s.getTime()) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (itemDate > e.getTime()) return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      if (sortBy === "date_desc") {
        const da = new Date(a.received_date || a.created_at || 0).getTime();
        const db = new Date(b.received_date || b.created_at || 0).getTime();
        return db - da;
      }
      if (sortBy === "date_asc") {
        const da = new Date(a.received_date || a.created_at || 0).getTime();
        const db = new Date(b.received_date || b.created_at || 0).getTime();
        return da - db;
      }
      if (sortBy === "items_desc") {
        return (b.items?.length || 0) - (a.items?.length || 0);
      }
      if (sortBy === "items_asc") {
        return (a.items?.length || 0) - (b.items?.length || 0);
      }
      return 0;
    });
  }, [grns, searchQuery, statusFilter, qcFilter, startDate, endDate, sortBy]);

  // ── KPI Stats Calculation ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalItemsAccepted = 0;
    let totalItemsRejected = 0;
    let verifiedCount = 0;

    filteredGrns.forEach((grn: any) => {
      if ((grn.status || "").toLowerCase() === "verified") verifiedCount++;
      (grn.items || []).forEach((it: any) => {
        totalItemsAccepted += Number(it.quantity_accepted || it.quantity_received || 0);
        totalItemsRejected += Number(it.quantity_rejected || 0);
      });
    });

    return { totalItemsAccepted, totalItemsRejected, verifiedCount };
  }, [filteredGrns]);

  if (isCreateMode || selectedDoc) {
    return (
      <GoodsReceivedNoteForm
        initialData={selectedDoc}
        onClose={() => {
          setIsCreateMode(false);
          setSelectedDoc(null);
        }}
        onSaved={() => {
          setIsCreateMode(false);
          setSelectedDoc(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            Goods Received Notes (GRN)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record inward shipments, perform Quality Control (QC), and update real-time stock balances.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateMode(true)} 
          className="gradient-brand text-white border-0 font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Plus className="size-4" /> Log GRN Inward Receipt
        </Button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card border-indigo-100 dark:border-indigo-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total GRNs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {filteredGrns.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Inward Deliveries</p>
            </div>
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card border-emerald-100 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Accepted Units</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.totalItemsAccepted.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Passed QC Inspection</p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-card border-rose-100 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Defective / Rejected</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {stats.totalItemsRejected.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Flagged for return</p>
            </div>
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Verified Receipts</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {stats.verifiedCount} / {filteredGrns.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filteredGrns.length > 0 ? `${Math.round((stats.verifiedCount / filteredGrns.length) * 100)}% Verified` : "0% Verified"}
              </p>
            </div>
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-sm">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Comprehensive Filter Control Panel */}
      <Card className="p-4 bg-card border rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by GRN #, PO Reference, or Item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-muted/30 hover:bg-muted/50 border border-input rounded-xl text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Range Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "this_week", label: "This Week" },
                { key: "this_month", label: "This Month" },
                { key: "last_30_days", label: "Last 30 Days" },
                { key: "custom", label: "Custom Range" },
              ] as const
            ).map((preset) => (
              <button
                key={preset.key}
                onClick={() => handleDatePresetChange(preset.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  datePreset === preset.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters Toggle & Reset Button */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-9 px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer ${
                showAdvancedFilters || (isFiltered && datePreset === "custom") 
                  ? "bg-primary/10 text-primary border-primary/30" 
                  : ""
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showAdvancedFilters ? "Hide Filters" : "More Filters"}
              {isFiltered && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </Button>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Custom Date Range & Advanced Filter Controls */}
        {(showAdvancedFilters || datePreset === "custom") && (
          <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-3 rounded-xl">
            {/* Custom Start Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Custom End Date */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* QC Inspection Status */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                QC Inspection Status
              </label>
              <select
                value={qcFilter}
                onChange={(e) => setQcFilter(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="all">All QC States</option>
                <option value="passed">Passed (No Rejections)</option>
                <option value="rejected">Has Rejected Items</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-primary" /> Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="date_desc">Latest Date First</option>
                <option value="date_asc">Oldest Date First</option>
                <option value="items_desc">Most Items Received</option>
                <option value="items_asc">Fewest Items Received</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Main Table */}
      <Card className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-4 px-6">GRN Document No</th>
                <th className="py-4 px-6">Linked PO Reference</th>
                <th className="py-4 px-6">Received Items</th>
                <th className="py-4 px-6">QC Inspection Status</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto mb-3" />
                    <p className="font-semibold text-sm">Loading GRNs...</p>
                  </td>
                </tr>
              ) : filteredGrns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <Boxes className="w-10 h-10 mx-auto text-muted-foreground/50" />
                      <h4 className="text-base font-bold text-foreground">No Goods Received Notes found</h4>
                      <p className="text-xs text-muted-foreground">
                        {isFiltered 
                          ? "No records match your selected date, QC, or search filters. Try clearing some filters."
                          : "No Goods Received Notes logged yet. Click '+ Log GRN Inward Receipt' above to receive stock."}
                      </p>
                      {isFiltered && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleResetFilters}
                          className="rounded-xl font-bold text-xs mt-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGrns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-primary">
                      <div className="flex items-center gap-2">
                        <Boxes className="size-4 text-primary" />
                        {grn.grn_number}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-muted-foreground font-medium">
                      {grn.po_number || "Direct Inward"}
                    </td>
                    <td className="py-4 px-6">
                      {grn.items && grn.items.length > 0 ? (
                        <div className="space-y-0.5 text-xs">
                          {grn.items.map((it: any) => (
                            <div key={it.id || it.product_id} className="font-semibold text-foreground">
                              • {it.product_name || "Material Item"} (x{it.quantity_received})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">1 received line item</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {grn.items && grn.items.length > 0 ? (
                        <div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {grn.items[0].quantity_accepted || grn.items[0].quantity_received} Accepted
                          </div>
                          {grn.items[0].quantity_rejected > 0 && (
                            <div className="text-[10px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {grn.items[0].quantity_rejected} Rejected / Defective
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed Inspection
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {grn.status || "Received"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          window.location.href = `/procurement?tab=vendor_bills&po_id=${grn.purchase_order_id}&grn_id=${grn.id}`;
                        }}
                        className="h-8 gap-1 font-bold rounded-lg text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer"
                        title="Create 3-Way Matched Vendor Bill from this GRN"
                      >
                        <Receipt className="size-3.5 mr-1" /> Log Bill
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedDoc(grn)}
                        className="h-8 gap-1.5 font-bold rounded-lg hover:bg-primary/10 cursor-pointer"
                      >
                        <Eye className="size-4" /> View / Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
