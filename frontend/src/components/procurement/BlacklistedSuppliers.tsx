import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ShieldBan, CalendarX, Loader2, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";

export function BlacklistedSuppliers() {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers();
      setSuppliers(supps || []);
      
      const res = await inventoryApi.getBlacklistedSuppliers();
      setBlacklist(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load blacklisted suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !reason.trim()) return toast.error("Supplier and Reason are required");
    try {
      await inventoryApi.blacklistSupplier({
        supplier_id: supplierId,
        reason
      });
      toast.success("Supplier has been blacklisted and status locked.");
      setSupplierId("");
      setReason("");
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to blacklist supplier");
    }
  };

  // Only suppliers not already blacklisted
  const activeSuppliers = suppliers.filter(
    (s) => !blacklist.some((b) => b.supplier_id === s.id)
  );

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Blacklisted Suppliers
          </h2>
          <p className="text-sm text-muted-foreground">Manage restricted vendors to prevent unauthorized PO generation.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow-sm">
          <ShieldBan className="size-4 mr-2" /> Blacklist Supplier
        </Button>
      </div>

      <Card className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">Supplier Name</th>
                <th className="py-4 px-6">Reason for Blacklist</th>
                <th className="py-4 px-6">Date Blocked</th>
                <th className="py-4 px-6 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
                    Loading restricted ledger...
                  </td>
                </tr>
              ) : blacklist.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-muted-foreground font-semibold">
                    No supplier partners are currently blacklisted.
                  </td>
                </tr>
              ) : (
                blacklist.map((b) => {
                  const supplier = suppliers.find(s => s.id === b.supplier_id);
                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-rose-600 flex items-center gap-2">
                        <ShieldBan className="size-4 text-rose-500" /> {supplier?.name || "Unknown"}
                      </td>
                      <td className="py-4 px-6 font-medium">{b.reason}</td>
                      <td className="py-4 px-6 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CalendarX className="size-3 text-rose-500" />
                          {b.blacklisted_at ? new Date(b.blacklisted_at).toLocaleDateString() : "—"}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-[11px] text-muted-foreground">
                        {b.id.substring(0, 8).toUpperCase()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-rose-650 flex items-center gap-2">
                <ShieldBan className="w-5 h-5 text-rose-500" />
                Add Supplier to Blacklist
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
                  <option value="">Select Supplier to Block</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Reason for Restriction *</label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detail why this partner is being added to the restricted vendor database..."
                  rows={4}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm resize-none focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg">
                  Restrict Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
