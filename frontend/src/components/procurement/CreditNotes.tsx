import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, FileCheck, Loader2, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function CreditNotes() {
    const { currency, formatCurrency } = useCurrency();
  const [notes, setNotes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [cnNo, setCnNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [billRef, setBillRef] = useState("");
  const [amount, setAmount] = useState(1000);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers();
      setSuppliers(supps || []);

      const res = await inventoryApi.getVendorCreditNotes();
      setNotes(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load credit notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenNew = () => {
    const seq = String(notes.length + 1).padStart(4, '0');
    setCnNo(`CN-2026-${seq}`);
    setSupplierId(suppliers[0]?.id || "");
    setBillRef(`BILL-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setAmount(1000);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !cnNo.trim()) return toast.error("Please fill in all fields");
    try {
      await inventoryApi.createVendorCreditNote({
        note_number: cnNo,
        supplier_id: supplierId,
        bill_reference: billRef.trim() || undefined,
        amount: Number(amount)
      });
      toast.success("Vendor credit note registered successfully");
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create Credit Note");
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Credit Notes
          </h2>
          <p className="text-sm text-muted-foreground">Track vendor credits for returns and discounts.</p>
        </div>
        <Button onClick={handleOpenNew} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Generate CN
        </Button>
      </div>

      <Card className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">CN Number</th>
                <th className="py-4 px-6">Supplier Vendor</th>
                <th className="py-4 px-6">Bill / Invoice Reference</th>
                <th className="py-4 px-6 text-right">Credit Amount</th>
                <th className="py-4 px-6">Date Generated</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    Loading credit ledger...
                  </td>
                </tr>
              ) : notes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground font-semibold">
                    No vendor credit notes issued yet.
                  </td>
                </tr>
              ) : (
                notes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold">
                      <div className="flex items-center gap-2">
                        <FileCheck className="size-4 text-primary" />
                        {cn.note_number}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold">{cn.supplier_name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-foreground font-semibold">
                      {cn.bill_reference || cn.reference_number || "BILL-2026-REF"}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-600">
                      {currency.symbol}{cn.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-muted-foreground">
                      {cn.created_at ? new Date(cn.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {cn.status}
                      </span>
                    </td>
                  </tr>
                ))
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
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Generate Vendor Credit Note (CN)
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Credit Note Document ID *</label>
                <input
                  type="text"
                  required
                  value={cnNo}
                  onChange={(e) => setCnNo(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Original Bill / Invoice Reference No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BILL-2026-0042 or INVO-2026-881"
                  value={billRef}
                  onChange={(e) => setBillRef(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="font-semibold text-muted-foreground">Supplier Vendor Partner *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="font-semibold text-muted-foreground">Credit Value ({currency.symbol}) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
                  Save Credit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
