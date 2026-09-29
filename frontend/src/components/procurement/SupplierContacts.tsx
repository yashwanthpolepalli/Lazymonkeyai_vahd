import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Users, Mail, Phone, Building2, Loader2, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function SupplierContacts() {
    const { currency, formatCurrency } = useCurrency();
  const [contacts, setContacts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers();
      setSuppliers(supps || []);
      
      const res = await inventoryApi.getSupplierContacts();
      setContacts(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !supplierId) return toast.error("Name and Supplier are required");
    try {
      await inventoryApi.createSupplierContact({
        supplier_id: supplierId,
        name,
        role,
        email,
        phone
      });
      toast.success("Contact added successfully");
      setName("");
      setRole("");
      setEmail("");
      setPhone("");
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add contact");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Supplier Contacts
          </h2>
          <p className="text-sm text-muted-foreground">Manage directory of sales, accounts, and support personnel.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Add Contact
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">Contact Person</th>
                <th className="py-4 px-6">Supplier</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y text-foreground">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-muted-foreground font-semibold">
                    No contacts recorded yet. Click "Add Contact" to associate people with suppliers.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const supplier = suppliers.find(s => s.id === contact.supplier_id);
                  return (
                    <tr key={contact.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold flex items-center gap-2">
                          <Users className="size-4 text-primary" /> {contact.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{contact.role || "Contact Agent"}</div>
                      </td>
                      <td className="py-4 px-6 font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          {supplier?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email || "—"}</a>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        {contact.phone || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Add Supplier Contact
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
                <label className="font-semibold text-muted-foreground">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Role / Designation</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. VP of Accounts"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. accounts@acme.com"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 99887 76655"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg">
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
