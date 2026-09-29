import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Search, Users, Trophy, Mail, Phone, FileText, DollarSign, X } from "lucide-react";
import { crmCustomersApi, type CrmCustomer } from "../../lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/use-currency";
import { usePincodeLookup } from "@/hooks/use-pincode-lookup";
import { lookupGstinDetails } from "@/lib/gst-helper";
import { Sparkles, Loader2 } from "lucide-react";

export function PosCustomers() {
  const { currency, formatCurrency } = useCurrency();
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUpGst, setIsLookingUpGst] = useState(false);

  const { lookup: lookupPincode, loading: isLookingUpPincode } = usePincodeLookup();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    customer_type: "Retail",
    gst_number: "",
    credit_limit: 0,
    address: "",
    city: "",
    state: "",
    pincode: "",
    shipping_address: "",
    isShippingSameAsBilling: true
  });

  const handleGstLookup = async (gstinVal?: string) => {
    const clean = (gstinVal || form.gst_number || "").trim().toUpperCase();
    if (clean.length !== 15) return;
    setIsLookingUpGst(true);
    try {
      const res = await lookupGstinDetails(clean, false);
      if (res) {
        setForm(prev => ({
          ...prev,
          gst_number: res.gstin || clean,
          name: prev.name && prev.name !== "Walk-in Customer" ? prev.name : (res.trade_name || res.legal_name || prev.name),
          address: res.principal_address || res.address || prev.address,
          city: res.city || prev.city,
          state: res.state || prev.state,
          pincode: res.pincode || prev.pincode,
          customer_type: "B2B",
        }));
      }
    } catch (e: any) {
      console.warn("GST Lookup error:", e);
    } finally {
      setIsLookingUpGst(false);
    }
  };

  const handlePincodeChange = async (val: string) => {
    setForm(prev => ({ ...prev, pincode: val }));
    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        setForm(prev => ({
          ...prev,
          city: res.city || prev.city,
          state: res.state || prev.state,
          address: prev.address || res.area || ""
        }));
      }
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await crmCustomersApi.list(1, 100, search || undefined);
      setCustomers(res.items || []);
    } catch (err) {
      console.error("Failed to load POS customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and Phone are required!");
    setIsSubmitting(true);
    try {
      await crmCustomersApi.create({
        ...form,
        credit_limit: Number(form.credit_limit) || 0,
        billing_address: form.address,
        shipping_address: form.isShippingSameAsBilling ? form.address : form.shipping_address
      });
      toast.success(`Customer ${form.name} registered successfully!`);
      setIsOpen(false);
      setForm({ name: "", phone: "", email: "", customer_type: "Retail", gst_number: "", credit_limit: 0, address: "", city: "", state: "", pincode: "", shipping_address: "", isShippingSameAsBilling: true });
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">POS Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your retail & B2B customer database, credit limits, and lifetime value.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="h-8 text-xs font-semibold gradient-brand text-white border-0 shadow-sm">
          <Plus className="size-3.5 mr-1.5" /> New Customer
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border bg-card focus:ring-1 focus:ring-primary/30"
            placeholder="Search by customer name, phone, GSTIN..."
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Contact & GSTIN</th>
              <th className="px-6 py-4">Pricing Tier</th>
              <th className="px-6 py-4">Credit Limit</th>
              <th className="px-6 py-4 text-right">Lifetime Value</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading customers…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No customers found. Click "New Customer" to create one.</td></tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary shrink-0" />
                      <span>{cust.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground" /> {cust.phone || 'N/A'}</div>
                    {cust.gst_number && (
                      <div className="text-[11px] font-mono text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                        <FileText className="size-3" /> GST: {cust.gst_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${cust.customer_type === 'Wholesale' || cust.customer_type === 'B2B' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-700'}`}>
                      <Trophy className="size-3" /> {cust.customer_type || 'Retail'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-amber-600">
                    {currency.symbol}{Number(cust.credit_limit || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-600 text-right">
                    {currency.symbol}{Number(cust.lifetime_value || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" /> Register New Customer
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Customer Name *</Label>
                <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe / Business Corp" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone Number *</Label>
                <Input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 9908297963" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Email Address</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="customer@company.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Customer Tier / Type</Label>
                <select
                  value={form.customer_type}
                  onChange={e => setForm({...form, customer_type: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-semibold"
                >
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="B2B">B2B Corporate</option>
                  <option value="VIP">VIP</option>
                  <option value="Distributor">Distributor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">GSTIN / Tax ID</Label>
                  {isLookingUpGst && <span className="text-[10px] text-indigo-600 font-bold animate-pulse">Auto-filling...</span>}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={form.gst_number}
                    onChange={e => {
                      const val = e.target.value.toUpperCase();
                      setForm({...form, gst_number: val});
                      if (val.length === 15) handleGstLookup(val);
                    }}
                    placeholder="36AAACG1234F1Z5"
                    className="uppercase font-mono font-bold text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLookingUpGst || form.gst_number.length !== 15}
                    onClick={() => handleGstLookup()}
                    className="h-10 px-2.5 text-xs text-indigo-600 font-bold shrink-0"
                    title="Auto-fill details from GSTIN"
                  >
                    {isLookingUpGst ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Credit Limit ({currency.symbol})</Label>
                <Input type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: Number(e.target.value)})} placeholder="50000" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  PIN Code {isLookingUpPincode && <span className="text-indigo-600 animate-pulse text-[10px]">Detecting...</span>}
                </Label>
                <Input maxLength={6} value={form.pincode} onChange={e => handlePincodeChange(e.target.value)} placeholder="e.g. 560001" className="font-mono font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">City / Location</Label>
                <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City / District" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">State</Label>
                <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="State" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Billing Address</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street address, building, area..." />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="sameAsBillingPos" 
                checked={form.isShippingSameAsBilling} 
                onChange={(e) => setForm({...form, isShippingSameAsBilling: e.target.checked})}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="sameAsBillingPos" className="text-xs cursor-pointer text-slate-600">Shipping address same as Billing address</Label>
            </div>

            {!form.isShippingSameAsBilling && (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Shipping Address</Label>
                <Input 
                  value={form.shipping_address} 
                  onChange={e => setForm({...form, shipping_address: e.target.value})} 
                  placeholder="Enter shipping address..." 
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSubmitting} className="w-full gradient-brand text-white font-bold">
                {isSubmitting ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

