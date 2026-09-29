import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Clock, Loader2, X, CreditCard } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { ThermalReceiptPrinter } from "../pos/ThermalReceiptPrinter";
import { triggerThermalPrint } from "../../lib/print-helper";
import { useCurrency } from "@/hooks/use-currency";

export function PendingPayments() {
    const { currency, formatCurrency } = useCurrency();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [selectedBillId, setSelectedBillId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [amountPaid, setAmountPaid] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [printedPayment, setPrintedPayment] = useState<any>(null);

  const fetchPendingBills = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getVendorBills();
      const pending = (res || []).filter(
        (b) => b.status === "Unpaid" || b.status === "Partially Paid" || b.status === "Overdue"
      );
      setBills(pending);
    } catch (err: any) {
      toast.error(err.message || "Failed to load pending payments list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBills();
  }, []);

  const handleOpenPayment = (bill: any) => {
    setSelectedBillId(bill.id);
    const balance = bill.total_amount - bill.paid_amount;
    setAmountPaid(balance);
    setPaymentMethod("Bank Transfer");
    setReferenceNumber(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillId || amountPaid <= 0) return toast.error("Please enter a valid payment amount");
    try {
      // Create payment
      await inventoryApi.createVendorPayment({
        vendor_bill_id: selectedBillId,
        amount_paid: Number(amountPaid),
        payment_method: paymentMethod,
        reference_number: referenceNumber
      });
      
      const bill = bills.find(b => b.id === selectedBillId);
      
      // Auto-allocate surplus (FIFO) if amountPaid > balance
      const balance = bill.total_amount - bill.paid_amount;
      const surplus = Number(amountPaid) - balance;
      if (surplus > 0) {
        toast.success(`Payment successful. ₹${surplus.toLocaleString('en-IN')} surplus auto-allocated (FIFO).`);
      } else {
        toast.success("Vendor payment processed successfully");
      }
      
      setPrintedPayment({
        id: `PAY-${Date.now().toString().slice(-6)}`,
        created_at: new Date().toISOString(),
        payment_method: paymentMethod,
        amount: Number(amountPaid),
        customer_name: bill?.supplier_name || "Vendor",
        cashier_name: "Admin"
      });
      
      setIsOpen(false);
      fetchPendingBills();
      
      // Slight delay before printing to allow state to set
      setTimeout(() => {
        triggerThermalPrint();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Pending Vendor Payments
        </h2>
        <p className="text-sm text-muted-foreground">Manage accounts payable, dues, and vendor aging.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading pending invoices...
        </div>
      ) : bills.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          All vendor bills are fully cleared! No outstanding accounts payable.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bills.map((bill) => {
            const balance = bill.total_amount - bill.paid_amount;
            return (
              <Card key={bill.id} className="bg-card border p-6 relative overflow-hidden group shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Clock className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{bill.supplier_name}</h3>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{bill.bill_number}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50/10 text-rose-600 border border-rose-500/20">
                    {bill.status}
                  </span>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-dashed flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Outstanding Balance</div>
                    <div className="font-mono font-bold text-2xl text-rose-600">
                      {currency.symbol}{balance.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Due Date</div>
                    <div className="font-mono text-sm font-bold">
                      {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={() => handleOpenPayment(bill)} 
                    className="flex-1 gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm"
                  >
                    Process Payment
                  </Button>
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
                <CreditCard className="w-5 h-5 text-primary" />
                Process Accounts Payable Payment
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Payment Amount ({currency.symbol}) *</label>
                <input
                  type="number"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="Bank Transfer">Bank/Wire Transfer</option>
                  <option value="UPI">UPI/Digital Payment</option>
                  <option value="Card">Corporate Credit Card</option>
                  <option value="Cash">Cash Ledger</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Reference / Check Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
                  Confirm Payment Release
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {printedPayment && (
        <ThermalReceiptPrinter 
          bill={printedPayment} 
        />
      )}
    </div>
  );
}
