import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Star, Sparkles, Building2 } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";

export function SupplierRatings() {
    const { currency, formatCurrency } = useCurrency();
  const data = [
    { id: 1, name: "Apple India Pvt Ltd", score: 98, stars: 5, ai: "Consistently delivers ahead of schedule. Zero quality issues reported in Q2." },
    { id: 2, name: "Tata Consumer Products", score: 85, stars: 4, ai: "Excellent bulk pricing but experienced minor delays in logistics last month." },
    { id: 3, name: "BlueDart Express", score: 62, stars: 3, ai: "Response times dropping. Consider alternatives for priority air shipments." },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supplier Ratings</h2>
          <p className="text-sm text-muted-foreground">Five-star ratings and AI-generated supplier scores.</p>
        </div>
        <Button variant="outline"><Sparkles className="size-4 mr-2" /> Recalculate AI Scores</Button>
      </div>

      <div className="space-y-4">
        {data.map((sup) => (
          <Card key={sup.id} className="p-5 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="size-4 text-muted-foreground" />
                <h3 className="font-bold text-lg">{sup.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`size-4 ${s <= sup.stars ? 'fill-amber-500 text-amber-500' : 'fill-muted text-muted'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 bg-primary/5 p-3 rounded-lg border border-primary/10">
              <div className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5 mb-1"><Sparkles className="size-3" /> Antigravity AI Assessment</div>
              <div className="text-sm text-foreground/80">{sup.ai}</div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Overall Score</div>
              <div className={`text-3xl font-bold font-mono ${sup.score > 90 ? 'text-emerald-500' : sup.score > 70 ? 'text-blue-500' : 'text-amber-500'}`}>
                {sup.score}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
