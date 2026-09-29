import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Layers, Loader2, X } from "lucide-react";
import { inventoryApi } from "../../lib/api-client";
import { toast } from "sonner";

export function SupplierCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getSupplierCategories();
      setCategories(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return toast.error("Name and Code are required");
    try {
      await inventoryApi.createSupplierCategory({
        name,
        code,
        description: desc
      });
      toast.success("Supplier category created successfully");
      setName("");
      setCode("");
      setDesc("");
      setIsOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Supplier Categories
          </h2>
          <p className="text-sm text-muted-foreground">Classify your vendor base into manageable groups.</p>
        </div>
        <Button onClick={() => setIsOpen(true)} className="gradient-brand text-white border-0 font-semibold rounded-lg shadow-sm">
          <Plus className="size-4 mr-2" /> Add Category
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          Loading supplier categories...
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-card border p-8 rounded-xl text-center text-muted-foreground font-semibold shadow-sm">
          No categories found. Click "Add Category" to classify your vendor base.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card key={cat.id} className="bg-card border p-6 relative overflow-hidden group shadow-sm text-foreground">
              <div className="flex justify-between items-start mb-4">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                  <Layers className="size-5 text-primary" />
                </div>
                <div className="font-mono text-xs bg-muted text-primary px-2 py-0.5 rounded border border-primary/20">
                  {cat.code}
                </div>
              </div>
              <h3 className="font-bold text-lg">{cat.name}</h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {cat.description || "No description provided."}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-foreground">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Create Supplier Category
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Raw Materials"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Category Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RAW-MAT"
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Enter details about this classification category..."
                  rows={3}
                  className="w-full p-2.5 bg-background border rounded-lg text-foreground text-sm resize-none focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="rounded-lg">
                  Cancel
                </Button>
                <Button type="submit" className="gradient-brand text-white border-0 font-semibold rounded-lg">
                  Save Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
