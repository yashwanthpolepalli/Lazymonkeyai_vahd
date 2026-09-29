import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Briefcase, CalendarClock, Loader2, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function SupplierContracts() {
    const { currency, formatCurrency } = useCurrency();
  const [contracts, setContracts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [terms, setTerms] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers();
      setSuppliers(supps || []);
      
      const res = await inventoryApi.getSupplierContracts();
      setContracts(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier contracts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !contractNumber.trim()) return toast.error("Supplier and Contract Number are required");
    try {
      await inventoryApi.createSupplierContract({
        supplier_id: supplierId,
        contract_number: contractNumber,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        terms,
        status: "Active"
      });
      toast.success("Supplier contract added successfully");
      setContractNumber("");
      setStartDate("");
      setEndDate("");
      setTerms("");
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to draft contract");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Supplier Contracts
          </h2>
          <p className="text-sm text-muted-foreground">Manage SLA terms, pricing agreements, and renewals.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Draft Contract
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading contracts...
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No active contracts found. Click "Draft Contract" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contracts.map((contract) => {
            const supplier = suppliers.find(s => s.id === contract.supplier_id);
            return (
              <Card key={contract.id} className="bg-card border p-6 relative overflow-hidden group shadow-sm text-foreground">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Briefcase className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{supplier?.name || "Unknown"}</h3>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{contract.contract_number}</div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    contract.status === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {contract.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/40 rounded-lg border border-dashed">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Start Date</div>
                    <div className="font-mono text-sm">
                      {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      <CalendarClock className="size-3 text-rose-500" /> End Date
                    </div>
                    <div className="font-mono text-sm">
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t pt-3">
                  <span className="font-semibold text-foreground">Terms: </span>
                  {contract.terms || "Standard business purchasing SLA terms apply."}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Draft Supplier Contract
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">Select Supplier Partner</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Contract Number *</label>
                <input
                  type="text"
                  required
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  placeholder="e.g. CON-2026-908"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Terms & SLA Details</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Draft SLA agreements, credit cycles, and pricing discount structures..."
                  rows={3}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm resize-none focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg">
                  Draft SLA Contract
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
