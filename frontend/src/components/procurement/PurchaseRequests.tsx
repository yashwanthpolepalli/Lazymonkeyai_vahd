import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { 
  Plus, 
  Package, 
  Loader2, 
  Eye, 
  Search, 
  Calendar, 
  ArrowUpDown, 
  RotateCcw, 
  Filter, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  X 
} from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { PurchaseRequisitionForm } from "./PurchaseRequisitionForm";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";

type DatePreset = "all" | "today" | "yesterday" | "this_week" | "this_month" | "last_30_days" | "custom";
type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export function PurchaseRequests() {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // ── Filters & Search State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prs = await inventoryApi.getPurchaseRequests();
      setRequests(prs || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load purchase requests");
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
    setMinAmount("");
    setMaxAmount("");
    setStatusFilter("all");
    setSortBy("date_desc");
  };

  const isFiltered = Boolean(
    searchQuery ||
    datePreset !== "all" ||
    startDate ||
    endDate ||
    minAmount ||
    maxAmount ||
    statusFilter !== "all" ||
    sortBy !== "date_desc"
  );

  // ── Filtered & Sorted Requests ─────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return requests.filter((req: any) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchPrNum = (req.request_number || req.id || "").toLowerCase().includes(q);
        const matchSupplier = (req.supplier?.name || "").toLowerCase().includes(q);
        const matchItems = (req.items || []).some((it: any) => 
          (it.product_name || "").toLowerCase().includes(q)
        );
        if (!matchPrNum && !matchSupplier && !matchItems) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        if ((req.status || "Draft").toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Amount Filters
      const total = Number(req.total_amount || 0);
      if (minAmount && total < Number(minAmount)) return false;
      if (maxAmount && total > Number(maxAmount)) return false;

      // 4. Date Range Filter
      const rawDate = req.request_date || req.created_at;
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
        const da = new Date(a.request_date || a.created_at || 0).getTime();
        const db = new Date(b.request_date || b.created_at || 0).getTime();
        return db - da;
      }
      if (sortBy === "date_asc") {
        const da = new Date(a.request_date || a.created_at || 0).getTime();
        const db = new Date(b.request_date || b.created_at || 0).getTime();
        return da - db;
      }
      if (sortBy === "amount_desc") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }
      if (sortBy === "amount_asc") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }
      return 0;
    });
  }, [requests, searchQuery, statusFilter, minAmount, maxAmount, startDate, endDate, sortBy]);

  // ── KPI Stats Calculation ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalEstimatedValue = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    filteredRequests.forEach((req: any) => {
      totalEstimatedValue += Number(req.total_amount || 0);
      const st = (req.status || "").toLowerCase();
      if (st === "approved") approvedCount++;
      if (st === "pending" || st === "pending approval" || st === "draft") pendingCount++;
    });

    return { totalEstimatedValue, approvedCount, pendingCount };
  }, [filteredRequests]);

  if (isCreateMode || selectedDoc) {
    return (
      <PurchaseRequisitionForm
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
            <Package className="w-7 h-7 text-primary" />
            Purchase Requests (PR)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage internal departmental requests, approvals, and budget authorizations for materials and services.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateMode(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <Plus className="size-4" /> Raise Purchase Request
        </Button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-card border-indigo-100 dark:border-indigo-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total PRs</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {filteredRequests.length}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Material Requisitions</p>
            </div>
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-sm">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-card border-emerald-100 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Estimated Value</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(stats.totalEstimatedValue)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Requisition Budget</p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-card border-purple-100 dark:border-purple-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Approved for PO</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {stats.approvedCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {filteredRequests.length > 0 ? `${Math.round((stats.approvedCount / filteredRequests.length) * 100)}% Approved` : "0% Approved"}
              </p>
            </div>
            <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-card border-amber-100 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.pendingCount}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting Manager Sign-off</p>
            </div>
            <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-sm">
              <Clock className="w-5 h-5" />
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
              placeholder="Search by PR Number, Supplier name, or Product..."
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
                showAdvancedFilters || (isFiltered && (minAmount || maxAmount || datePreset === "custom")) 
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

        {/* Custom Date Range, Amount Range & Advanced Filter Controls */}
        {(showAdvancedFilters || datePreset === "custom" || minAmount || maxAmount) && (
          <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-muted/20 p-3 rounded-xl">
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

            {/* Min Amount */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-primary" /> Min Amount
              </label>
              <input
                type="number"
                placeholder="₹ Min value"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-primary" /> Max Amount
              </label>
              <input
                type="number"
                placeholder="₹ Max value"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                Request Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="sm:col-span-2 md:col-span-5">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-primary" /> Sort Requisitions:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-auto h-9 bg-background border border-input rounded-xl px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                >
                  <option value="date_desc">Latest Date First</option>
                  <option value="date_asc">Oldest Date First</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                </select>
              </div>
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
                <th className="py-4 px-6">PR Number</th>
                <th className="py-4 px-6">Target Vendor / Supplier</th>
                <th className="py-4 px-6">Requested Items</th>
                <th className="py-4 px-6 text-right">Total Amount</th>
                <th className="py-4 px-6">Date Raised</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-primary" />
                    <p className="font-semibold text-sm">Loading purchase requisitions...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <Package className="w-10 h-10 mx-auto text-muted-foreground/50" />
                      <h4 className="text-base font-bold text-foreground">No Purchase Requests found</h4>
                      <p className="text-xs text-muted-foreground">
                        {isFiltered 
                          ? "No requisitions match your selected date, amount, or search filters. Try clearing some filters."
                          : "No purchase requests found. Click '+ Raise PR' above to create a new requisition."}
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
                filteredRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-primary">
                      {req.request_number || req.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-6 font-semibold text-foreground">
                      {req.supplier?.name || "General Supplier"}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-xs">
                      {req.items && req.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {req.items.map((it: any) => (
                            <div key={it.id || it.product_id} className="font-semibold text-foreground">
                              • {it.product_name || "Material"} (x{it.quantity})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>1 material line item</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-foreground">
                      {currency.symbol}{Number(req.total_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-mono text-xs">
                      {req.request_date || req.created_at
                        ? new Date(req.request_date || req.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : new Date().toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                        req.status === 'Pending' || req.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}>
                        {req.status || 'Draft'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedDoc(req)}
                          className="h-8 gap-1.5 font-bold rounded-lg hover:bg-primary/10 cursor-pointer"
                        >
                          <Eye className="size-4" /> View / Edit
                        </Button>
                      </div>
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
