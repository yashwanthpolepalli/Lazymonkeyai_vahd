import { useState, useEffect } from "react";
import React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowRightLeft, ShieldAlert, Loader2, Building2, Plus, Eye } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";
import { PurchaseReturnForm } from "./PurchaseReturnForm";

export function PurchaseReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supps = await inventoryApi.getSuppliers().catch(() => []);
      setSuppliers(supps || []);

      const res = await inventoryApi.getPurchaseReturns();
      setReturns(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isCreateMode || selectedDoc) {
    return (
      <PurchaseReturnForm
        initialData={selectedDoc}
        onClose={() => {
          setIsCreateMode(false);
          setSelectedDoc(null);
        }}
        onSaved={() => {
          setIsCreateMode(false);
          setSelectedDoc(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Purchase Returns & Debit Notes
          </h2>
          <p className="text-sm text-muted-foreground">Return defective goods to vendors with automated Debit Note generation.</p>
        </div>
        <Button onClick={() => setIsCreateMode(true)} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Log Purchase Return
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading purchase returns...
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No purchase returns recorded yet. Click "+ Log Purchase Return" to start.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {returns.map((ret) => {
            const suppName = suppliers.find(s => s.id === ret.supplier_id)?.name || ret.supplier_name || "Target Vendor";
            return (
              <Card key={ret.id} className="bg-card border p-6 relative overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center font-bold">
                      <ArrowRightLeft className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg font-mono text-slate-900">{ret.return_number}</h3>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Building2 className="size-3 text-indigo-500" />
                        <span className="font-bold text-slate-700">{suppName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                      {ret.status || "Returned"}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedDoc(ret)}
                      className="h-7 px-2 font-bold rounded-lg hover:bg-rose-50"
                    >
                      <Eye className="size-3.5 mr-1" /> View / Edit Page
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/40 p-4 rounded-xl border border-dashed flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Return Reason & Source</div>
                    <div className="font-bold text-xs text-rose-600 flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5 text-rose-500 shrink-0" />
                      {ret.reason || "Damaged/Defective Goods"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Return Qty</div>
                    <div className="font-bold text-lg text-rose-600 font-mono">
                      {ret.items?.length || 1} Products
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
