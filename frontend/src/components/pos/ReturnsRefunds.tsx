import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowRightLeft, Search, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function ReturnsRefunds() {
    const { currency, formatCurrency } = useCurrency();
  const [receiptId, setReceiptId] = useState("");
  const [searchDone, setSearchDone] = useState(false);
  const [returnItems, setReturnItems] = useState([
    { id: "1", name: "Premium Cotton Shirt", qty: 2, price: 1299, returnQty: 0 },
    { id: "2", name: "Slim Fit Denim Jeans", qty: 1, price: 2499, returnQty: 0 },
    { id: "3", name: "Leather Casual Belt", qty: 1, price: 699, returnQty: 0 }
  ]);
  const [reason, setReason] = useState("Defective / Wrong Size");
  const [refundMethod, setRefundMethod] = useState("Cash Refund");
  const [processedReturn, setProcessedReturn] = useState<any>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptId.trim()) return toast.error("Please enter a valid Receipt ID or Invoice Number");
    setSearchDone(true);
    toast.success(`Found Bill ${receiptId.toUpperCase()}`);
  };

  const handleQtyChange = (id: string, delta: number) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const next = item.returnQty + delta;
        if (next >= 0 && next <= item.qty) {
          return { ...item, returnQty: next };
        }
      }
      return item;
    }));
  };

  const totalRefund = returnItems.reduce((acc, item) => acc + (item.returnQty * item.price), 0);

  const handleProcessReturn = () => {
    if (totalRefund === 0) return toast.error("Please select at least one item to return");
    const returnNo = `SRET-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setProcessedReturn({
      returnNo,
      date: new Date().toLocaleDateString(),
      refundAmount: totalRefund,
      itemsReturned: returnItems.filter(i => i.returnQty > 0),
      refundMethod,
      reason
    });
    toast.success(`Sales Return ${returnNo} processed successfully! Items restored to inventory.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Returns & Refunds</h2>
          <p className="text-sm text-muted-foreground mt-1">Process customer sales returns, restore items to inventory, and issue cash or credit refunds.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-xs font-bold">
          <ShieldCheck className="size-3.5" />
          Strict "Sales Return Only" Policy Enforced
        </div>
      </div>

      {!searchDone ? (
        <Card className="p-12 flex flex-col items-center text-center border-dashed bg-muted/20">
          <ArrowRightLeft className="size-16 text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-xl font-bold mb-2">Scan Receipt / Enter Invoice Barcode</h3>
          <p className="text-muted-foreground max-w-md">To initiate a sales return, enter or scan the Receipt / Invoice ID from the customer's bill.</p>
          <form onSubmit={handleSearch} className="mt-6 flex gap-2">
            <input
              value={receiptId}
              onChange={(e) => setReceiptId(e.target.value)}
              className="h-11 px-4 rounded-xl border w-72 text-center font-mono text-sm bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. INVO-2026-881 or RCP-104"
            />
            <Button type="submit" className="gradient-brand text-white border-0 h-11 px-6 rounded-xl font-bold">
              <Search className="size-4 mr-2" /> Find Bill
            </Button>
          </form>
        </Card>
      ) : processedReturn ? (
        <Card className="p-8 max-w-xl mx-auto space-y-6 text-center border-emerald-500/30 bg-emerald-500/5">
          <div className="size-14 bg-emerald-500/20 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-900">Sales Return Completed</h3>
            <p className="text-sm text-muted-foreground font-mono mt-1">Return ID: {processedReturn.returnNo}</p>
          </div>

          <div className="bg-background border rounded-xl p-4 text-left space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Original Receipt:</span>
              <span className="font-mono font-bold">{receiptId.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Refund Method:</span>
              <span className="font-bold">{processedReturn.refundMethod}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Return Reason:</span>
              <span>{processedReturn.reason}</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-bold">
              <span>Total Refund Amount:</span>
              <span className="text-emerald-600">{currency.symbol}{processedReturn.refundAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => { setSearchDone(false); setProcessedReturn(null); setReceiptId(""); }} variant="outline" className="rounded-xl font-bold">
              <RotateCcw className="size-4 mr-2" /> Process Another Return
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-bold text-lg">Bill Items: <span className="font-mono text-primary">{receiptId.toUpperCase()}</span></h3>
                <p className="text-xs text-muted-foreground">Select quantities to return back to inventory.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSearchDone(false)} className="text-xs">Change Bill</Button>
            </div>

            <div className="space-y-3">
              {returnItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3.5 bg-muted/30 border rounded-xl">
                  <div>
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">Billed Qty: {item.qty} | Price: {currency.symbol}{item.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQtyChange(item.id, -1)}
                      className="size-8 rounded-lg border bg-background font-bold text-lg flex items-center justify-center hover:bg-muted"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold w-6 text-center">{item.returnQty}</span>
                    <button
                      onClick={() => handleQtyChange(item.id, 1)}
                      className="size-8 rounded-lg border bg-background font-bold text-lg flex items-center justify-center hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold border-b pb-2">Refund Summary</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Return Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-sm"
                >
                  <option value="Defective / Wrong Size">Defective / Wrong Size</option>
                  <option value="Customer Mind Change">Customer Mind Change</option>
                  <option value="Incorrect Item Scanned">Incorrect Item Scanned</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Refund Payment Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full p-2.5 bg-background border rounded-lg text-sm"
                >
                  <option value="Cash Refund">Cash Refund</option>
                  <option value="Customer Credit Note / Voucher">Customer Credit Note / Voucher</option>
                  <option value="Original UPI / Card Account">Original UPI / Card Account</option>
                </select>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items Selected:</span>
                  <span className="font-bold">{returnItems.reduce((a, b) => a + b.returnQty, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-emerald-600">
                  <span>Total Refund:</span>
                  <span>{currency.symbol}{totalRefund.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleProcessReturn}
              disabled={totalRefund === 0}
              className="w-full gradient-brand text-white border-0 h-12 rounded-xl font-bold text-sm shadow-md"
            >
              Confirm Sales Return
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
