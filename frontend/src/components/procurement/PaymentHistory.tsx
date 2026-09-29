import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { History, Loader2 } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { ThermalReceiptPrinter } from "../pos/ThermalReceiptPrinter";
import { triggerThermalPrint } from "../../lib/print-helper";
import { Printer } from "lucide-react";
import { Button } from "../ui/button";
import { useCurrency } from "@/hooks/use-currency";

export function PaymentHistory() {
    const { currency, formatCurrency } = useCurrency();
  const [payments, setPayments] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printedPayment, setPrintedPayment] = useState<any>(null);

  const handlePrint = (txn: any, bill: any) => {
    setPrintedPayment({
      id: txn.id,
      created_at: txn.payment_date || new Date().toISOString(),
      payment_method: txn.payment_method,
      amount: txn.amount_paid,
      customer_name: bill?.supplier_name || "Vendor",
      cashier_name: "Admin"
    });
    
    // Slight delay to allow state to set
    setTimeout(() => {
      triggerThermalPrint();
    }, 100);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const b = await inventoryApi.getVendorBills();
      setBills(b || []);

      const res = await inventoryApi.getVendorPayments();
      setPayments(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Payments Out
          </h2>
          <p className="text-sm text-slate-400">Comprehensive timeline of all vendor settlements.</p>
        </div>
      </div>

      <Card className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-4 px-6">Payment Date</th>
                <th className="py-4 px-6">Linked Bill No</th>
                <th className="py-4 px-6">Supplier Vendor</th>
                <th className="py-4 px-6 text-right">Amount Paid</th>
                <th className="py-4 px-6">Payment Mode</th>
                <th className="py-4 px-6 text-right">Transaction Ref</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    Loading historical payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground font-semibold">
                    No vendor payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((txn) => {
                  const bill = bills.find((b) => b.id === txn.vendor_bill_id);
                  return (
                    <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-muted-foreground">
                        {txn.payment_date ? new Date(txn.payment_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-4 px-6 font-mono text-primary font-semibold">{txn.bill_number || "—"}</td>
                      <td className="py-4 px-6 font-bold">{bill?.supplier_name || "—"}</td>
                      <td className="py-4 px-6 font-bold text-emerald-600 text-right">
                        {currency.symbol}{txn.amount_paid.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-6 font-semibold">{txn.payment_method}</td>
                      <td className="py-4 px-6 font-mono text-xs text-muted-foreground text-right">{txn.reference_number || "—"}</td>
                      <td className="py-4 px-6 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handlePrint(txn, bill)}
                          title="Print Receipt"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {printedPayment && (
        <ThermalReceiptPrinter 
          bill={printedPayment} 
        />
      )}
    </div>
  );
}
