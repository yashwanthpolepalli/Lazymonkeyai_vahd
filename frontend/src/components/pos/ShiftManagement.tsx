import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Clock, Lock, Play, DollarSign, History } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

export function ShiftManagement() {
  const { currency, formatCurrency } = useCurrency();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Shift Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage cash registers, opening floats, and end-of-day reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center border-emerald-500/20 bg-emerald-500/5">
          <div className="size-14 rounded-full bg-emerald-500/20 text-emerald-600 grid place-items-center mb-3">
            <Play className="size-6 ml-0.5" />
          </div>
          <h3 className="text-base font-bold">Open Register</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Start a new shift and declare your opening cash float.</p>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white w-full max-w-xs h-9 text-xs font-semibold">Start Shift</Button>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center text-center border-rose-500/20 bg-rose-500/5 opacity-50 cursor-not-allowed">
          <div className="size-14 rounded-full bg-rose-500/20 text-rose-600 grid place-items-center mb-3">
            <Lock className="size-6" />
          </div>
          <h3 className="text-base font-bold">Close Register</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">End current shift and generate Z-Report.</p>
          <Button disabled className="w-full max-w-xs h-9 text-xs font-semibold">Close Shift</Button>
        </Card>
      </div>

      <h3 className="text-sm font-bold mt-4 mb-2 flex items-center gap-1.5"><History className="size-4" /> Recent Shifts</h3>
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3">Shift ID</th>
              <th className="px-6 py-3">Cashier</th>
              <th className="px-6 py-3">Opened At</th>
              <th className="px-6 py-3">Closed At</th>
              <th className="px-6 py-3">Expected Cash</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-3 font-mono font-bold">SHF-0012</td>
              <td className="px-6 py-3 font-bold">Ravi K.</td>
              <td className="px-6 py-3 text-xs">Today, 09:00 AM</td>
              <td className="px-6 py-3 text-xs">Today, 05:00 PM</td>
              <td className="px-6 py-3 font-mono text-emerald-600 font-bold">{currency.symbol}15,450</td>
              <td className="px-6 py-3"><span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">Closed</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
