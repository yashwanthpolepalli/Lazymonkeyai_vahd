import React, { useState, useEffect, useCallback, useRef } from "react";
import { Gift, Plus, Trash2, Settings2, CheckCircle2, AlertTriangle, X, Search, ChevronDown, Sparkles, Check, Boxes } from "lucide-react";
import { posApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface FreeQtyItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  rule_id?: string;
  rule_name?: string;
}

export interface FreeQtyRule {
  id: string;
  name: string;
  rule_type: "min_cart_amount" | "min_product_qty" | "company_offer";
  threshold: number;
  trigger_product_id?: string;
  trigger_product_name?: string;
  free_product_id?: string;
  free_product_name?: string;
  free_qty: number;
  active: boolean;
}

interface FreeQtyPanelProps {
  cartSubtotal: number;
  cartItems: Array<{ product_id?: string; id?: string; product_name?: string; name?: string; quantity?: number; qty?: number }>;
  freeItems: FreeQtyItem[];
  onFreeItemsChange: (items: FreeQtyItem[]) => void;
  products?: Array<{ id: string; name: string; sku?: string; mrp?: number; selling_price?: number; stock?: number }>;
  compact?: boolean;
}

const blankRule = (): FreeQtyRule => ({
  id: crypto.randomUUID(),
  name: "",
  rule_type: "min_cart_amount",
  threshold: 500,
  free_qty: 1,
  active: true,
});

export function FreeQtyPanel({
  cartSubtotal,
  cartItems,
  freeItems,
  onFreeItemsChange,
  products = [],
  compact = false,
}: FreeQtyPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [rules, setRules] = useState<FreeQtyRule[]>([]);
  const [evaluation, setEvaluation] = useState<{ rules_met: string[]; rules_failed: { name: string; reason: string }[]; can_add_free: boolean } | null>(null);
  const [showRuleManager, setShowRuleManager] = useState(false);
  const [draftRules, setDraftRules] = useState<FreeQtyRule[]>([]);
  
  // Searchable Product Selection State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [freeQty, setFreeQty] = useState(1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await posApi.getFreeQtyRules();
      setRules(Array.isArray(res) ? res : []);
    } catch {
      setRules([]);
    }
  }, []);

  const evaluate = useCallback(async () => {
    try {
      const res = await posApi.evaluateFreeQtyRules({
        cart_subtotal: cartSubtotal,
        cart_items: cartItems.map((i) => ({
          product_id: i.product_id || i.id,
          product_name: i.product_name || i.name,
          quantity: i.quantity ?? i.qty ?? 0,
        })),
      });
      setEvaluation(res);
    } catch {
      setEvaluation({ rules_met: [], rules_failed: [], can_add_free: true });
    }
  }, [cartSubtotal, cartItems]);

  useEffect(() => { void loadRules(); }, [loadRules]);
  useEffect(() => { void evaluate(); }, [evaluate]);

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  const addFreeItem = () => {
    let prodName = selectedProduct?.name;
    let prodId = selectedProduct?.id;

    // Fallback: If user typed a custom free gift name without picking an ID
    if (!prodId && productSearch.trim()) {
      const matched = products.find(p => p.name.toLowerCase() === productSearch.trim().toLowerCase());
      if (matched) {
        prodId = matched.id;
        prodName = matched.name;
      } else {
        prodName = productSearch.trim();
      }
    }

    if (!prodName) {
      toast.error("Please search and select a product to add as free gift");
      setIsSearchOpen(true);
      return;
    }

    if (evaluation && !evaluation.can_add_free && evaluation.rules_failed.length > 0) {
      toast.warning("No promotional offer rules matched — free item added manually");
    }

    const existing = freeItems.find((f) => f.product_id === prodId && f.product_name === prodName);
    if (existing) {
      onFreeItemsChange(
        freeItems.map((f) => (f.product_id === prodId && f.product_name === prodName) ? { ...f, quantity: f.quantity + freeQty } : f)
      );
    } else {
      onFreeItemsChange([
        ...freeItems,
        {
          id: crypto.randomUUID(),
          product_id: prodId,
          product_name: prodName,
          quantity: freeQty,
          rule_name: evaluation?.rules_met[0],
        },
      ]);
    }
    setSelectedProductId("");
    setProductSearch("");
    setIsSearchOpen(false);
    setFreeQty(1);
    toast.success(`Added ${freeQty} free × ${prodName}`);
  };

  const saveRules = async () => {
    try {
      await posApi.saveFreeQtyRules(draftRules.filter((r) => r.name.trim()));
      setRules(draftRules.filter((r) => r.name.trim()));
      setShowRuleManager(false);
      toast.success("Free quantity rules saved");
      void evaluate();
    } catch (e: any) {
      toast.error(e?.detail || "Failed to save rules");
    }
  };

  return (
    <div className="border border-emerald-200/80 rounded-xl bg-gradient-to-r from-emerald-50/40 via-teal-50/30 to-emerald-50/40 relative z-30 shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-emerald-100/40 transition-colors rounded-t-xl"
      >
        <span className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wide">
          <Gift className="size-4 text-emerald-600 animate-pulse" /> Free Items & Promotional Offers
          {freeItems.length > 0 && (
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
              {freeItems.length} Free Added
            </span>
          )}
        </span>
        <span className="text-[10px] font-bold text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-white transition-all">
          {expanded ? "Hide" : "Show"}
        </span>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-emerald-200/60 bg-white/60">
          {evaluation && (
            <div className="pt-2 space-y-1">
              {evaluation.rules_met.map((n) => (
                <div key={n} className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold bg-emerald-100/60 border border-emerald-300/80 rounded-lg px-2.5 py-1">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Offer Rule Met: <strong className="underline">{n}</strong></span>
                </div>
              ))}
              {evaluation.rules_failed.map((f) => (
                <div key={f.name} className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <AlertTriangle className="size-3 text-amber-600 shrink-0" />
                  <span>{f.name}: {f.reason}</span>
                </div>
              ))}
              {rules.length === 0 && (
                <p className="text-[10px] text-slate-500 font-medium italic">
                  💡 No promotional rules configured — search any product below to add as free gift manually or configure rules via ⚙️ icon.
                </p>
              )}
            </div>
          )}

          {/* Searchable Free Product Selector Bar */}
          <div className="flex gap-2 flex-wrap items-end pt-1">
            {/* Search Input with Live Dropdown */}
            <div className="flex-1 min-w-[240px] relative" ref={searchContainerRef}>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Search Free Product / Gift
              </label>

              {selectedProduct ? (
                /* Selected Product Chip */
                <div className="flex items-center justify-between h-9 px-3 text-xs rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold shadow-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Gift className="size-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedProduct.name}</span>
                    {selectedProduct.sku && (
                      <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded font-mono text-emerald-800 shrink-0">
                        {selectedProduct.sku}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductId("");
                      setProductSearch("");
                      setIsSearchOpen(true);
                    }}
                    className="p-1 hover:bg-emerald-200/80 rounded-md text-emerald-700 transition-colors ml-2"
                    title="Change product"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                /* Interactive Search Input */
                <div className="relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="size-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search product by name, SKU or barcode to give free..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    className="w-full h-9 pl-8 pr-8 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all shadow-xs"
                  />
                  {productSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch("");
                        setIsSearchOpen(false);
                      }}
                      className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : (
                    <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="size-3.5" />
                    </div>
                  )}
                </div>
              )}

              {/* Autocomplete Dropdown Menu */}
              {isSearchOpen && !selectedProduct && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-[9999] divide-y divide-slate-100 ring-1 ring-black/10">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-600 sticky top-0 backdrop-blur-sm">
                    <span className="flex items-center gap-1.5"><Boxes className="size-3 text-emerald-600" /> {filteredProducts.length} Products Available</span>
                    <span className="text-emerald-700">Click product to add free</span>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No matching products found</p>
                      {productSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            addFreeItem();
                          }}
                          className="mt-2 text-[11px] text-emerald-600 hover:underline font-bold"
                        >
                          + Add &ldquo;{productSearch.trim()}&rdquo; as custom free gift
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredProducts.slice(0, 30).map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedProductId(p.id);
                          setProductSearch(p.name);
                          setIsSearchOpen(false);
                        }}
                        className="p-2.5 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                            {p.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            {p.sku && <span className="font-mono bg-slate-100 px-1 py-0.2 rounded">{p.sku}</span>}
                            {p.stock !== undefined && (
                              <span className={p.stock > 0 ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                                Stock: {p.stock}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                          Select
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quantity Input */}
            <div className="w-20">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Free Qty
              </label>
              <input
                type="number"
                min={1}
                value={freeQty}
                onChange={(e) => setFreeQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 px-2.5 text-xs text-center font-black rounded-xl border border-slate-300 bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
            </div>

            {/* Add Free Button */}
            <Button
              type="button"
              size="sm"
              onClick={addFreeItem}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="size-3.5" /> Add Free
            </Button>

            {/* Rule Manager Trigger */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-2.5 text-xs rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700"
              title="Configure Dynamic Offer / Scheme Rules"
              onClick={() => {
                setDraftRules(rules.length ? [...rules] : [blankRule()]);
                setShowRuleManager(true);
              }}
            >
              <Settings2 className="size-3.5" />
            </Button>
          </div>

          {/* List of Added Free Items */}
          {freeItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                🎁 Free Products Included in Bill:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {freeItems.map((fi) => (
                  <div
                    key={fi.id}
                    className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs shadow-xs hover:border-emerald-400 transition-all"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="font-bold text-emerald-900 block truncate">
                        🎁 {fi.product_name} × {fi.quantity} Units
                      </span>
                      {fi.rule_name && (
                        <span className="text-[10px] text-emerald-600 font-medium block">
                          Rule: {fi.rule_name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onFreeItemsChange(freeItems.filter((x) => x.id !== fi.id))}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-all"
                      title="Remove free item"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC RULE CREATOR MODAL */}
      {showRuleManager && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Gift className="size-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">Promotional & Scheme Rules</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Configure automated free item offers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRuleManager(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Rules define when free items trigger during billing (e.g. minimum cart amount, buying specific product quantities, or general company offers).
              </p>

              {draftRules.map((rule, idx) => (
                <div key={rule.id} className="p-3.5 border border-slate-200 rounded-2xl space-y-2.5 bg-slate-50/60 shadow-xs">
                  <div className="flex gap-2">
                    <input
                      placeholder="Rule name e.g. Buy ₹1,000 get 1 free gift"
                      value={rule.name}
                      onChange={(e) => {
                        const next = [...draftRules];
                        next[idx] = { ...rule, name: e.target.value };
                        setDraftRules(next);
                      }}
                      className="flex-1 h-9 px-3 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftRules(draftRules.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all"
                      title="Delete rule"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rule Type</label>
                      <select
                        value={rule.rule_type}
                        onChange={(e) => {
                          const next = [...draftRules];
                          next[idx] = { ...rule, rule_type: e.target.value as FreeQtyRule["rule_type"] };
                          setDraftRules(next);
                        }}
                        className="w-full h-8 px-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="min_cart_amount">Min Cart Amount (₹)</option>
                        <option value="min_product_qty">Min Product Qty</option>
                        <option value="company_offer">Company Offer (Always On)</option>
                      </select>
                    </div>

                    {rule.rule_type !== "company_offer" && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          {rule.rule_type === "min_cart_amount" ? "Min Cart Total (₹)" : "Min Quantity"}
                        </label>
                        <input
                          type="number"
                          placeholder={rule.rule_type === "min_cart_amount" ? "500" : "3"}
                          value={rule.threshold}
                          onChange={(e) => {
                            const next = [...draftRules];
                            next[idx] = { ...rule, threshold: parseFloat(e.target.value) || 0 };
                            setDraftRules(next);
                          }}
                          className="w-full h-8 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {rule.rule_type === "min_product_qty" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Trigger Product Name</label>
                      <input
                        placeholder="Product name to match (e.g. Energy Drink)"
                        value={rule.trigger_product_name || ""}
                        onChange={(e) => {
                          const next = [...draftRules];
                          next[idx] = { ...rule, trigger_product_name: e.target.value };
                          setDraftRules(next);
                        }}
                        className="w-full h-8 px-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraftRules([...draftRules, blankRule()])}
                className="w-full text-xs font-bold rounded-xl border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-700"
              >
                <Plus className="size-3.5 mr-1" /> Add New Scheme Rule
              </Button>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRuleManager(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveRules}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save All Rules
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
