import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function AIPurchaseSuggestions() {
    const { currency, formatCurrency } = useCurrency();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingIds, setExecutingIds] = useState<string[]>([]);

  const fetchSuggestions = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await inventoryApi.getAISuggestions(refresh);
      setSuggestions(res || []);
      if (refresh) {
        toast.success("AI procurement insights recalculated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load AI suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingIds((prev) => [...prev, id]);
    try {
      const res = await inventoryApi.executeAISuggestion(id);
      toast.success(res.message || "Recommendation executed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to execute AI recommendation");
    } finally {
      setExecutingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">AI Purchase Suggestions
          </h2>
          <p className="text-sm text-muted-foreground">Antigravity AI recommendations for smart procurement.</p>
        </div>
        <Button 
          onClick={() => fetchSuggestions(true)}
          disabled={loading}
          className="gradient-brand text-white border-0 font-semibold rounded-lg text-xs shadow-sm flex items-center"
        >
          {loading ? (
            <>
              Recalculating... <Loader2 className="size-4 ml-2 animate-spin" />
            </>
          ) : (
            <>
              Recalculate AI Suggestions <Sparkles className="size-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Analyzing procurement history...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No AI replenishment or risk recommendations available currently.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {suggestions.map((ai) => (
            <Card key={ai.id} className="p-6 relative overflow-hidden bg-primary/5 border border-primary/20 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center border border-primary/20">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{ai.title}</h3>
                    <div className="text-[10px] font-bold text-primary mt-1 uppercase tracking-wider">{ai.type}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                  ai.priority === "High" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}>
                  {ai.priority} Priority
                </span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6 pl-13">
                {ai.description}
              </p>

              <div className="bg-muted/40 p-4 rounded-xl border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Expected Financial Impact</div>
                  <div className="font-bold text-sm">{ai.impact_saving}</div>
                </div>
                <Button 
                  onClick={() => handleExecute(ai.id)}
                  disabled={executingIds.includes(ai.id)}
                  className="gradient-brand text-white border-0 font-semibold rounded-lg text-xs shadow-sm flex items-center"
                >
                  {executingIds.includes(ai.id) ? (
                    <>
                      Executing... <Loader2 className="size-4 ml-2 animate-spin" />
                    </>
                  ) : (
                    <>
                      Execute Recommendation <ArrowRight className="size-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
