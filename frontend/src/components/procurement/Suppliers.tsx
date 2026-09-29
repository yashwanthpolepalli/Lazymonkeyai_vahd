import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Search, Plus, Building2, Edit2, Trash, Star, Loader2, Store } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { SupplierForm } from "./SupplierForm";
import { AddVendorModal } from "./AddVendorModal";
import { useCurrency } from "@/hooks/use-currency";

interface SupplierItem {
  id: string;
  name: string;
  code: string;
  type: string;
  products_desc?: string;
  credit_limit: number;
  rating: number;
  status: string;
  company_name?: string;
  category_id?: string;
  category_name?: string;
}

export function Suppliers() {
    const { currency, formatCurrency } = useCurrency();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Full-page form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSuppliers({
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined
      });
      setSuppliers(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, statusFilter]);

  const handleOpenNew = () => {
    setSelectedSupplierId(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: SupplierItem) => {
    setSelectedSupplierId(s.id);
    setIsFormOpen(true);
  };
  if (isFormOpen) {
    return (
      <SupplierForm
        supplierId={selectedSupplierId}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchSuppliers}
      />
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await inventoryApi.deleteSupplier(id);
      toast.success("Supplier deleted successfully");
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplier");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Suppliers & Vendors
          </h2>
          <p className="text-sm text-muted-foreground">Manage your master supplier directory, tax GSTINs, credit limits, and bank accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsQuickAddOpen(true)} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 font-semibold rounded-lg shadow-sm">
            <Plus className="size-4 mr-2" /> Quick Add Vendor
          </Button>
          <Button onClick={handleOpenNew} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
            <Plus className="size-4 mr-2" /> Onboard Supplier Party
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" 
            placeholder="Search suppliers by name or code..." 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border rounded-lg text-xs text-foreground py-2 px-4 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">Supplier Profile</th>
                <th className="py-4 px-6">Supplier Code</th>
                <th className="py-4 px-6">Type & Category</th>
                <th className="py-4 px-6">Credit Limit</th>
                <th className="py-4 px-6">Rating</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground font-semibold">
                    No suppliers onboarded yet. Click "+ Onboard Supplier Party" to add one.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-bold">{supplier.name}</div>
                          {supplier.company_name && (
                            <div className="text-xs text-muted-foreground mt-0.5">{supplier.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono font-bold text-xs text-primary">{supplier.code}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-xs bg-muted px-2 py-0.5 rounded w-fit mb-1">
                        {supplier.type}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {supplier.category_name || "General Supplier"}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold">
                      {currency.symbol}{supplier.credit_limit.toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="size-3 fill-amber-500" /> {Number(supplier.rating).toFixed(1)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        supplier.status === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      }`}>
                        <span className={`size-1.5 rounded-full ${supplier.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {supplier.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          onClick={() => handleOpenEdit(supplier)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-muted"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(supplier.id)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add Vendor Modal */}
      <AddVendorModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onVendorCreated={() => {
          fetchSuppliers();
        }}
      />
    </div>
  );
}
