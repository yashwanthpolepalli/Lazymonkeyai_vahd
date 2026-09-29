import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Trophy, Gift, Settings } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

export function LoyaltyPrograms() {
    const { currency, formatCurrency } = useCurrency();
  const tiers = [
    { name: "Bronze", points: "0 - 499", reward: "1% Cash-back", color: "text-orange-700", bg: "bg-orange-700/10" },
    { name: "Silver", points: "500 - 999", reward: "3% Cash-back + Free Shipping", color: "text-slate-500", bg: "bg-slate-500/10" },
    { name: "Gold", points: "1000+", reward: "5% Cash-back + VIP Access", color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Loyalty Programs</h2>
          <p className="text-sm text-slate-500 mt-1">Configure point accumulation logic and reward tiers.</p>
        </div>
        <Button variant="outline"><Settings className="size-4 mr-2" /> Global Settings</Button>
      </div>

      <Card className="p-6 border-primary bg-primary/5">
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Gift className="size-5 text-primary" /> Active Program: Points to Cash</h3>
        <p className="text-sm">Customers earn 1 point for every {currency.symbol}100 spent. 10 Points = {currency.symbol}1. Points can be redeemed during checkout directly on the POS Terminal.</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {tiers.map((t, i) => (
          <Card key={i} className="p-6 text-center flex flex-col items-center">
            <div className={`size-16 rounded-full grid place-items-center mb-4 ${t.bg} ${t.color}`}>
              <Trophy className="size-8" />
            </div>
            <h3 className={`text-xl font-bold ${t.color}`}>{t.name} Tier</h3>
            <p className="font-mono text-sm font-bold mt-2">{t.points} Points</p>
            <div className="bg-muted px-4 py-2 rounded-lg mt-4 w-full text-sm font-medium">{t.reward}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
