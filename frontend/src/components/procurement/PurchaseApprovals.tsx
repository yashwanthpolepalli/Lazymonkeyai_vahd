import { useState, useEffect } from "react";
import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Eye, ChevronDown, ChevronUp, Printer, FileText } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/use-currency";

export function PurchaseApprovals() {
    const { currency, formatCurrency } = useCurrency();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingIds, setActingIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getPendingApprovals();
      setData(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, rawType: string, action: "Approve" | "Reject") => {
    setActingIds((prev) => [...prev, `${id}-${action}`]);
    try {
      const res = await inventoryApi.submitApprovalAction(id, rawType, action);
      toast.success(res.message || `Successfully ${action.toLowerCase()}d the request.`);
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action.toLowerCase()} the request.`);
    } finally {
      setActingIds((prev) => prev.filter((x) => x !== `${id}-${action}`));
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PR Approvals Queue (Manager Review)</h2>
          <p className="text-sm text-muted-foreground">Multi-level procurement approval workflows & PR approval queue.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading pending approvals...
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No pending purchase approvals in your queue currently.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.map((req) => {
            const isExpanded = expandedId === req.id;
            return (
              <Card key={req.id} className={`p-6 border-t-4 border-t-amber-500 bg-card rounded-xl shadow-sm transition ${isExpanded ? "ring-2 ring-amber-500" : ""}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-500/10 text-amber-600 grid place-items-center">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{req.type}</h3>
                      <div className="text-xs font-mono text-primary font-semibold mt-0.5">{req.ref}</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setExpandedId(prev => prev === req.id ? null : req.id)}
                    className={`h-7 px-2 font-bold rounded-lg ${isExpanded ? "bg-amber-600 text-white border-amber-600" : "hover:bg-amber-50"}`}
                  >
                    <Eye className="size-3.5 mr-1" /> View Details
                  </Button>
                </div>
                
                <div className="bg-muted/40 p-4 rounded-xl border border-dashed mb-4 flex justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Requested By</div>
                    <div className="font-semibold text-sm">{req.by}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Amount</div>
                    <div className="font-bold text-sm text-amber-600 font-mono">{req.amount}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mb-4 p-4 border border-amber-200 rounded-xl bg-amber-50/50 space-y-2 text-xs">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Approval Type:</span>
                      <span className="font-mono">{req.raw_type || req.type}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Voucher Ref:</span>
                      <span className="font-mono">{req.ref}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Approval Status:</span>
                      <span className="text-amber-600 font-extrabold">Pending Management Sign-off</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleAction(req.id, req.raw_type, "Approve")}
                    disabled={actingIds.includes(`${req.id}-Approve`) || actingIds.includes(`${req.id}-Reject`)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center justify-center rounded-lg"
                  >
                    {actingIds.includes(`${req.id}-Approve`) ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="size-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button 
                    onClick={() => handleAction(req.id, req.raw_type, "Reject")}
                    disabled={actingIds.includes(`${req.id}-Approve`) || actingIds.includes(`${req.id}-Reject`)}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold flex items-center justify-center rounded-lg"
                  >
                    {actingIds.includes(`${req.id}-Reject`) ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="size-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
