import React, { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Search, Printer, RotateCcw, ReceiptText } from "lucide-react";
import { posApi, POSTransactionHistory } from "../../lib/api-client";
import { useCurrency } from "@/hooks/use-currency";

export function SalesHistory() {
  const { currency, formatCurrency } = useCurrency();
  const [history, setHistory] = useState<POSTransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await posApi.getHistory();
        setHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn("Failed to load sales history:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const filteredSales = history.filter((sale) =>
    sale.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
    sale.items.some((item) => item.product_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Sales History</h2>
          <p className="text-sm text-muted-foreground mt-1">View past receipts, reprint bills, and initiate refunds.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg border bg-card text-xs"
            placeholder="Search Receipt No..."
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading sales history...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3">Receipt No</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSales.slice(0, 50).map((sale) => (
                <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-mono font-bold text-primary flex items-center gap-2">
                    <ReceiptText className="size-4" /> {sale.receipt_number}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs">{new Date(sale.created_at).toLocaleTimeString()}</td>
                  <td className="px-6 py-3 font-bold">{sale.cashier_id || "Customer"}</td>
                  <td className="px-6 py-3 font-mono">{sale.items.length} items</td>
                  <td className="px-6 py-3 font-bold text-emerald-600">{currency.symbol}{sale.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {sale.payments?.[0]?.payment_method || "cash"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"><Printer className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500"><RotateCcw className="size-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No sales history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
