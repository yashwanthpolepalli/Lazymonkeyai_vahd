import React from "react";
import { createPortal } from "react-dom";
import {
  ScanBarcode, Search, Clock, Combine, Truck, RefreshCw, CreditCard,
  Tag, Heart, History, Sparkles, AlertCircle, ShoppingCart, ArrowRightLeft,
  Banknote, Camera, QrCode, LayoutGrid, List as ListIcon, Edit2, Trash2, X, Info, Boxes,
  CheckCircle2, Keyboard, MonitorSmartphone, Wallet, Printer, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { posProducts, posTransactions, posCustomers, posCategories } from "../../lib/pos-fallback";
import { posApi, invoicesApi, POSTransactionHistory } from "../../lib/api-client";
import { useTenant } from "../../contexts/tenant-context";
import { ESCPOSPrinter } from "../../lib/escpos-printer";
import { triggerThermalPrint } from "../../lib/print-helper";
import { ThermalReceiptPrinter } from "./ThermalReceiptPrinter";
import { useCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "../../lib/utils";
import { toast } from "sonner";

const PrintableReceipt = ({ bill, allBills }: { bill: any, allBills: any[] }) => {
  const { currency } = useCurrency();
  if (!bill) return null;
  return <ThermalReceiptPrinter bill={bill} />;
};

const PlaceholderView = ({ title, icon: Icon, description }: any) => (
  <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center p-8 font-sans">
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 text-center"
    >
      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1.5">{title}</h2>
      <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto mb-6">{description}</p>
      <button className="bg-slate-900 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-xs hover:bg-slate-800 transition-colors">
        Initialize Module
      </button>
    </motion.div>
  </div>
);

export const BarcodeScannerView = ({ addToCart, products = posProducts }: { addToCart?: (p: any) => void, products?: any[] }) => {
  const [manualBarcode, setManualBarcode] = React.useState("");
  const [recentScans, setRecentScans] = React.useState<any[]>([]);
  const [scannerActive, setScannerActive] = React.useState(true);

  const simulateScan = () => {
    const list = products.length > 0 ? products : posProducts;
    const randomProduct = list[Math.floor(Math.random() * list.length)];
    const newScan = {
      ...randomProduct,
      scanTime: new Date().toLocaleTimeString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    setRecentScans(prev => [newScan, ...prev].slice(0, 10)); // Keep last 10
    if (addToCart) addToCart(randomProduct);
  };

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode) return;

    const list = products.length > 0 ? products : posProducts;
    // Find product or pick random if not found for demo purposes
    const product = list.find(p => p.barcode === manualBarcode) || list[0];

    const newScan = {
      ...product,
      scanTime: new Date().toLocaleTimeString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    setRecentScans(prev => [newScan, ...prev].slice(0, 10));
    if (addToCart) addToCart(product);
    setManualBarcode("");
  };

  return (
    <div className="flex-1 bg-slate-50 flex overflow-hidden">

      {/* LEFT PANEL: Scanner Camera */}
      <div className="flex-[2] bg-slate-900 relative flex flex-col">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Scanner Top Bar */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${scannerActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            <span className="text-white font-bold tracking-widest uppercase text-sm">
              {scannerActive ? 'Scanner Active' : 'Scanner Offline'}
            </span>
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button className="px-4 py-2 rounded-md bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm">
              <ScanBarcode className="w-4 h-4" /> Hardware
            </button>
            <button className="px-4 py-2 rounded-md text-slate-400 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors">
              <Camera className="w-4 h-4" /> Camera
            </button>
          </div>
        </div>

        {/* Viewfinder */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="w-[400px] h-[250px] border-4 border-emerald-500/30 rounded-3xl mb-8 relative bg-black/20 backdrop-blur-sm">
            <div className="absolute inset-0 border-4 border-emerald-400 rounded-3xl clip-corners opacity-70"></div>
            {scannerActive && (
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] animate-scan"></div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <ScanBarcode className="w-24 h-24 text-emerald-500" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight mb-2">Ready to Scan</h2>
          <p className="text-slate-400 font-medium mb-8 text-xs">Align the barcode within the frame</p>

          <button
            onClick={simulateScan}
            className="px-6 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-xl font-semibold text-xs hover:bg-emerald-500/30 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Simulate Scan (Demo)
          </button>
        </div>

        <style>{`
          .clip-corners { clip-path: polygon(0 0, 20px 0, 20px 4px, 4px 4px, 4px 20px, 0 20px, 0 100%, 0 calc(100% - 20px), 4px calc(100% - 20px), 4px calc(100% - 4px), 20px calc(100% - 4px), 20px 100%, 0 100%, 100% 100%, 100% calc(100% - 20px), calc(100% - 4px) calc(100% - 20px), calc(100% - 4px) calc(100% - 4px), calc(100% - 20px) calc(100% - 4px), calc(100% - 20px) 100%, 100% 100%, 100% 0, calc(100% - 20px) 0, calc(100% - 20px) 4px, calc(100% - 4px) 4px, calc(100% - 4px) 20px, 100% 20px); }
          @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
          .animate-scan { animation: scan 2s ease-in-out infinite; }
        `}</style>
      </div>

      {/* RIGHT PANEL: Input & History */}
      <div className="flex-1 bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] max-w-md font-sans">

        {/* Manual Entry */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4" /> Manual Entry
          </h3>
          <form onSubmit={handleManualEntry} className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              placeholder="Type or paste barcode..."
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 font-mono font-medium shadow-2xs"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer">
              Add
            </button>
          </form>
        </div>

        {/* Recent Scans */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-5 pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2"><History className="w-4 h-4" /> Recent Scans</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{recentScans.length}</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pt-0">
            {recentScans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <ScanBarcode className="w-10 h-10 opacity-30" />
                <p className="text-xs font-medium">No items scanned yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence>
                  {recentScans.map((scan, idx) => (
                    <motion.div
                      key={scan.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-3 flex items-center gap-3 relative overflow-hidden group hover:border-emerald-400 transition-colors"
                    >
                      {/* Success indicator strip */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>

                      <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 p-1">
                        <img src={scan.image} alt={scan.name} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate leading-tight">{scan.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">{scan.barcode}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{scan.scanTime}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end">
                        <span className="font-bold text-xs text-indigo-600">{formatCurrency(scan.sellingPrice)}</span>
                        <div className="flex items-center gap-1 text-emerald-600 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Scanned</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export const QuickSearchView = () => {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('list');
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);

  const filtered = posProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search));
  const displayProducts = filtered.slice(0, 15);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-hidden relative">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 shrink-0 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search entire catalog..."
            className="flex-1 bg-transparent border-none focus:outline-none text-lg text-slate-800 placeholder:text-slate-400"
          />
          <div className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-bold text-slate-500">{filtered.length} SKUs</div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayProducts.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white border border-slate-200 rounded-xl overflow-visible hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col relative"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  <p className="font-bold mb-1">{p.name}</p>
                  <p className="text-slate-400 mb-1">Barcode: <span className="font-mono text-slate-300">{p.barcode}</span></p>
                  <p className="text-slate-400">{((p as any).description || (p as any).longDesc || '').substring(0, 50)}...</p>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                </div>

                <div className="h-32 bg-slate-100 relative overflow-hidden rounded-t-xl">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm">{p.stock} in stock</div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{p.barcode}</p>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-2 flex-1">{p.name}</h4>
                  <div className="text-lg font-black text-indigo-600">{formatCurrency(p.sellingPrice)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-6 py-4 font-bold">Product</th>
                  <th className="px-6 py-4 font-bold">SKU</th>
                  <th className="px-6 py-4 font-bold">Category</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Stock</th>
                  <th className="px-6 py-4 font-bold">Kind</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group relative"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded border border-slate-100 object-cover" />
                      <span>{p.name}</span>

                      {/* Tooltip */}
                      <div className="absolute left-64 top-1/2 -translate-y-1/2 ml-4 w-56 bg-slate-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        <p className="font-bold mb-1">{p.name}</p>
                        <p className="text-slate-400 mb-1">Barcode: <span className="font-mono text-slate-300">{p.barcode}</span></p>
                        <p className="text-slate-400">{((p as any).description || (p as any).longDesc || '').substring(0, 60)}...</p>
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-500">{p.sku}</td>
                    <td className="px-6 py-4 text-slate-500">{posCategories.find(c => c.id === p.category)?.name || "Retail"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-6 py-4 text-slate-500">{p.stock}</td>
                    <td className="px-6 py-4 text-slate-500 uppercase text-[10px] tracking-wider font-bold">RETAIL</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400">
                        <button className="hover:text-indigo-600 p-1"><Edit2 className="w-4 h-4" /></button>
                        <button className="hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans border border-slate-200/80"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-none">Product Details</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{selectedProduct.sku}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 flex gap-6">
                <div className="w-36 h-36 bg-slate-50 rounded-xl border border-slate-200/80 p-3 shrink-0 flex items-center justify-center">
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 mb-1 leading-snug">{selectedProduct.name}</h2>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">{selectedProduct.longDesc}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Selling Price</p>
                      <div className="text-lg font-bold text-emerald-600">{formatCurrency(selectedProduct.sellingPrice)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Boxes className="w-3 h-3" /> Inventory</p>
                      <div className="text-lg font-bold text-slate-900">{selectedProduct.stock} <span className="text-xs text-slate-500 font-normal">units</span></div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-500">Barcode:</span> <span className="font-mono font-semibold text-slate-700">{selectedProduct.barcode}</span></div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5"><span className="text-slate-500">Warehouse:</span> <span className="font-medium text-slate-700">{selectedProduct.warehouse || "Main Store"}</span></div>
                    <div className="flex justify-between pb-1"><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-700">Rack {selectedProduct.rack || "A1"} / Shelf {selectedProduct.shelf || "S1"}</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export const HoldBillsView = ({ onResume }: { onResume?: (bill: any) => void }) => {
  const [holdBills, setHoldBills] = React.useState<POSTransactionHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHoldBills = async () => {
      try {
        const bills = await posApi.getHistory({ status_filter: 'on_hold' });
        setHoldBills(bills);
      } catch (e) {
        console.error("Failed to load hold bills", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHoldBills();
  }, []);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-hidden font-sans">
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-xs">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Suspended / Parked Bills</h2>
          <p className="text-slate-500 text-xs font-medium">Resume held customer carts and complete open transactions.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center p-12 text-slate-400 text-xs font-medium">Loading held bills...</div>
        ) : holdBills.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-medium text-xs bg-white rounded-2xl shadow-xs border border-slate-200/80">
            No parked bills currently on hold.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {holdBills.map(bill => (
              <div key={bill.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-200/60 font-mono">{bill.receipt_number}</span>
                    <span className="text-xs font-medium text-slate-400">{new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Customer: {bill.customer_id ? bill.customer_id.substring(0,8) : 'Walk-in Guest'}</h3>
                  <p className="text-xs text-slate-500 mb-4">{bill.items.length} items in basket</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(bill.total_amount)}</div>
                  <button onClick={() => onResume && onResume(bill)} className="bg-indigo-600 text-white font-semibold text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer">
                    Resume Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export const SplitBillsView = ({ totalBill, onSubmit }: { totalBill: number, onSubmit?: (payments: any[]) => void }) => {
  const { currency } = useCurrency();
  const [cash, setCash] = React.useState<number>(0);
  const [card, setCard] = React.useState<number>(0);
  const [upi, setUpi] = React.useState<number>(0);

  const paid = (cash || 0) + (card || 0) + (upi || 0);
  const remaining = totalBill - paid;
  const progress = Math.min(100, (paid / (totalBill || 1)) * 100);

  const handleProcess = () => {
    if (remaining > 0 || !onSubmit) return;
    const payments = [];
    if (cash > 0) payments.push({ payment_method: "cash", amount: cash });
    if (card > 0) payments.push({ payment_method: "card", amount: card });
    if (upi > 0) payments.push({ payment_method: "upi", amount: upi });
    onSubmit(payments);
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-hidden font-sans">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
        <div className="mb-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-xs">
              <Combine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Split Tender Payment</h2>
              <p className="text-slate-500 text-xs font-medium">Allocate balance across multiple payment methods.</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Bill</div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalBill)}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-5 shrink-0">
          <div className="flex justify-between items-end mb-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining Balance</div>
            <div className={`text-xl font-bold ${remaining <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {remaining <= 0 ? 'Settled (₹0.00)' : formatCurrency(remaining)}
            </div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-300 ${remaining <= 0 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
          {/* Cash */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-100">
              <Banknote className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Cash Tender</h3>
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currency.symbol}</span>
              <input
                type="number"
                value={cash || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCash(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                className="w-full text-center text-xl font-bold text-slate-900 border border-slate-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 border border-blue-100">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Card / EDC Swipe</h3>
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currency.symbol}</span>
              <input
                type="number"
                value={card || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCard(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                className="w-full text-center text-xl font-bold text-slate-900 border border-slate-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* UPI */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 border border-purple-100">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">UPI / QR Pay</h3>
            <div className="relative w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currency.symbol}</span>
              <input
                type="number"
                value={upi || ''}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setUpi(e.target.value === '' ? ('' as any) : Number(e.target.value))}
                className="w-full text-center text-xl font-bold text-slate-900 border border-slate-200 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all bg-slate-50"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <button
          disabled={remaining > 0 || totalBill === 0}
          onClick={handleProcess}
          className="w-full mt-4 bg-indigo-600 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
        >
          {totalBill === 0 ? 'Cart is Empty' : remaining > 0 ? `Balance Remaining: ${formatCurrency(remaining)}` : 'Finalize Split Payment'}
        </button>
      </div>
    </div>
  );
};
export const DeliveryView = () => {
  const [deliveries, setDeliveries] = React.useState<POSTransactionHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const bills = await posApi.getHistory({ limit: 100 });
        const deliveryOrders = bills.filter(b => b.delivery_status != null || b.delivery_address != null);
        setDeliveries(deliveryOrders);
      } catch (e) {
        console.error("Failed to load deliveries", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDeliveries();
  }, []);

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
    switch (status.toLowerCase()) {
      case 'preparing': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'out for delivery': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-hidden font-sans">
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center border border-cyan-100 shadow-xs">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Delivery Dispatch</h2>
          <p className="text-slate-500 text-xs font-medium">Assign orders and track customer delivery fulfillment.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center p-12 text-slate-400 text-xs font-medium">Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-medium text-xs bg-white rounded-2xl shadow-xs border border-slate-200/80">
            No delivery orders found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map(d => (
              <div key={d.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-900">{d.receipt_number}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(d.delivery_status)}`}>
                      {d.delivery_status || "Pending"}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-800">Customer: {d.customer_id ? d.customer_id.substring(0,8) : "Guest"}</p>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{d.delivery_address || "No address provided"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                      {d.driver_name ? d.driver_name.charAt(0) : "?"}
                    </div>
                    <span className="text-xs font-medium text-slate-600">{d.driver_name || "Unassigned"}</span>
                  </div>
                  <div className="text-base font-bold text-slate-900">{formatCurrency(d.total_amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export const ExchangeView = ({ currentSessionId, products, initialSearch }: { currentSessionId?: string; products?: any[]; initialSearch?: string }) => {
  const { currency, formatCurrency } = useCurrency();
  const [receiptSearch, setReceiptSearch] = React.useState(initialSearch || "");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [originalBill, setOriginalBill] = React.useState<any | null>(null);
  const [recentBills, setRecentBills] = React.useState<any[]>([]);

  // Return Items State (Left Panel)
  const [selectedReturnItems, setSelectedReturnItems] = React.useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = React.useState<Record<string, string>>({});

  // Replacement Items State (Right Panel)
  const [productSearch, setProductSearch] = React.useState("");
  const [replacementItems, setReplacementItems] = React.useState<Array<{
    id?: string;
    product_id: string;
    name: string;
    unit_price: number;
    quantity: number;
    sku?: string;
    image?: string;
  }>>([]);

  // Tender / Payment mode for difference
  const [diffPaymentMode, setDiffPaymentMode] = React.useState<"cash" | "card" | "online" | "wallet">("cash");
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Fetch recent bills & invoices for quick lookup chips
  React.useEffect(() => {
    const fetchRecent = async () => {
      try {
        const [posHistory, invRes] = await Promise.all([
          posApi.getHistory({ limit: 15 }).catch(() => []),
          invoicesApi.listInvoices({ page_size: 15 }).catch(() => null)
        ]);

        const invList = (invRes as any)?.items || (invRes as any)?.data || (Array.isArray(invRes) ? invRes : []);
        const combined = [
          ...invList.map((inv: any) => ({
            id: inv.id,
            number: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
            customer: inv.customer_name || "Guest",
            total: Number(inv.total_amount || 0),
            date: inv.invoice_date || inv.created_at,
            type: "invoice"
          })),
          ...posHistory.map((pos: any) => ({
            id: pos.id,
            number: pos.receipt_number || `REC-${pos.id.slice(0, 8)}`,
            customer: pos.customer_name || pos.customer_id || "Guest",
            total: Number(pos.total_amount || 0),
            date: pos.created_at,
            type: "pos"
          }))
        ];

        // Deduplicate & sort newest first
        const unique = Array.from(new Map(combined.map(b => [b.number, b])).values());
        unique.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setRecentBills(unique.slice(0, 8));
      } catch (e) {
        console.warn("Failed to load recent bills:", e);
      }
    };
    fetchRecent();
  }, []);

  // Available store products catalog for replacement selection
  const catalogProducts = React.useMemo(() => {
    if (products && products.length > 0) return products;
    return posProducts || [];
  }, [products]);

  const filteredCatalog = React.useMemo(() => {
    if (!productSearch.trim()) return catalogProducts.slice(0, 8);
    const q = productSearch.toLowerCase();
    return catalogProducts.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) || 
      p.barcode?.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [catalogProducts, productSearch]);

  const handleLookup = async (query?: string) => {
    const q = (query || receiptSearch).trim();
    if (!q) return;
    setLookupLoading(true);
    try {
      // 1. Check POS receipts
      const history = await posApi.getHistory({ limit: 1000 }).catch(() => []);
      let found: any = history.find((t: any) => 
        t.id?.toLowerCase() === q.toLowerCase() || 
        t.receipt_number?.toLowerCase() === q.toLowerCase() ||
        t.id?.toLowerCase().includes(q.toLowerCase()) ||
        t.receipt_number?.toLowerCase().includes(q.toLowerCase())
      );

      // 2. Check ERP invoices
      if (!found) {
        let fullInv: any = await invoicesApi.getInvoice(q).catch(() => null);

        if (!fullInv) {
          const invRes: any = await invoicesApi.listInvoices({ search: q }).catch(() => null);
          const invList = invRes?.items || invRes?.data || (Array.isArray(invRes) ? invRes : []);
          const matchedInv = invList.find((inv: any) => 
            inv.id?.toLowerCase() === q.toLowerCase() || 
            inv.invoice_number?.toLowerCase() === q.toLowerCase() || 
            inv.invoice_number?.toLowerCase().includes(q.toLowerCase())
          );

          if (matchedInv) {
            fullInv = await invoicesApi.getInvoice(matchedInv.id).catch(() => matchedInv);
          }
        }

        if (fullInv) {
          const rawLines = fullInv.lines || fullInv.items || fullInv.invoice_items || [];
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          let lineItems = rawLines.map((it: any, idx: number) => {
            const rawPid = it.product_id || it.productId;
            const validPid = (typeof rawPid === "string" && uuidRegex.test(rawPid)) 
              ? rawPid 
              : (typeof fullInv.id === "string" && uuidRegex.test(fullInv.id) ? fullInv.id : "00000000-0000-0000-0000-000000000000");
            
            const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
            const unitPrice = Number(it.unit_price || it.rate || (Number(fullInv.total_amount || 0) / Math.max(1, rawLines.length)));
            const subtotal = Number(it.line_total || it.taxable_amount || (unitPrice * qty));

            return {
              id: it.id || `line-${idx}`,
              product_id: validPid,
              product_name: it.product_name || it.description || it.item_name || `Item #${idx + 1}`,
              product_sku: it.product_sku || it.sku || it.hsn_code || `SKU-${idx + 1}`,
              hsn_code: it.hsn_code || "",
              quantity: qty,
              unit_price: unitPrice,
              tax_rate: Number(it.tax_rate || 0),
              discount_amount: Number(it.discount_amount || 0),
              subtotal: subtotal,
              is_returnable: it.is_returnable !== false,
              days_ago: Math.max(0, Math.floor((Date.now() - new Date(fullInv.created_at || fullInv.invoice_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
            };
          });

          // If no line items exist in summary, provide a bill item fallback
          if (lineItems.length === 0 && Number(fullInv.total_amount || 0) > 0) {
            lineItems = [{
              id: `line-0`,
              product_id: (typeof fullInv.id === "string" && uuidRegex.test(fullInv.id)) ? fullInv.id : "00000000-0000-0000-0000-000000000000",
              product_name: fullInv.invoice_number ? `Merchandise (${fullInv.invoice_number})` : "Store Merchandise",
              product_sku: fullInv.invoice_number || "INV-ITEM",
              hsn_code: fullInv.hsn_code || "N/A",
              quantity: 1,
              unit_price: Number(fullInv.total_amount || 0),
              tax_rate: Number(fullInv.tax_rate || 0),
              discount_amount: Number(fullInv.discount_amount || 0),
              subtotal: Number(fullInv.total_amount || 0),
              is_returnable: true,
              days_ago: Math.max(0, Math.floor((Date.now() - new Date(fullInv.created_at || fullInv.invoice_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
            }];
          }

          found = {
            id: fullInv.id,
            receipt_number: fullInv.invoice_number || `INV-${fullInv.id.slice(0, 8)}`,
            invoice_type: fullInv.invoice_type || "Tax Invoice",
            created_at: fullInv.created_at || fullInv.invoice_date || new Date().toISOString(),
            customer_name: fullInv.customer_name || fullInv.customer_id || "Walk-in Guest",
            customer_phone: fullInv.customer_phone || fullInv.phone || "N/A",
            customer_email: fullInv.customer_email || fullInv.email || "N/A",
            customer_gstin: fullInv.customer_gstin || fullInv.gstin || "",
            billing_address: fullInv.billing_address || fullInv.address || "Counter Sale",
            subtotal: Number(fullInv.subtotal || fullInv.taxable_amount || fullInv.total_amount || 0),
            tax_amount: Number(fullInv.tax_amount || fullInv.cgst_amount || 0) + Number(fullInv.sgst_amount || 0) + Number(fullInv.igst_amount || 0),
            discount_amount: Number(fullInv.discount_amount || 0),
            total_amount: Number(fullInv.total_amount || 0),
            status: fullInv.status || "PAID",
            payment_method: fullInv.payment_method || "cash",
            items: lineItems,
            payments: [{ payment_method: fullInv.payment_method || "cash", amount: Number(fullInv.total_amount || 0) }]
          };
        }
      }

      if (found) {
        setOriginalBill(found);
        setSelectedReturnItems({});
        setReturnReasons({});
        toast.success(`Found Bill: ${found.receipt_number}`);
      } else {
        toast.error(`Receipt / Invoice "${q}" not found.`);
      }
    } catch (err) {
      console.error("Exchange bill lookup error:", err);
      toast.error("Lookup failed. Please check the receipt number.");
    } finally {
      setLookupLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialSearch) {
      setReceiptSearch(initialSearch);
      handleLookup(initialSearch);
    }
  }, [initialSearch]);

  const toggleReturnItem = (itemId: string, maxQty: number) => {
    setSelectedReturnItems(prev => {
      const next = { ...prev };
      if (next[itemId]) {
        delete next[itemId];
      } else {
        next[itemId] = maxQty;
      }
      return next;
    });
  };

  const updateReturnQty = (itemId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      setSelectedReturnItems(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setSelectedReturnItems(prev => ({
        ...prev,
        [itemId]: Math.min(qty, maxQty)
      }));
    }
  };

  // Add replacement product
  const handleAddReplacement = (prod: any) => {
    const unitP = Number(prod.price || prod.selling_price || prod.mrp || 0);
    setReplacementItems(prev => {
      const existingIdx = prev.findIndex(i => i.product_id === String(prod.id));
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: String(prod.id),
          name: prod.name,
          unit_price: unitP,
          quantity: 1,
          sku: prod.sku,
          image: prod.image || prod.image_url
        }
      ];
    });
    toast.success(`Added ${prod.name} as replacement`);
  };

  const handleUpdateReplacementQty = (idx: number, delta: number) => {
    setReplacementItems(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        updated.splice(idx, 1);
      } else {
        updated[idx].quantity = newQty;
      }
      return updated;
    });
  };

  // Financial calculations
  const totalReturnCredit = React.useMemo(() => {
    if (!originalBill?.items) return 0;
    return originalBill.items.reduce((sum: number, it: any) => {
      const qty = selectedReturnItems[it.id] || 0;
      return sum + (Number(it.unit_price) * qty);
    }, 0);
  }, [originalBill, selectedReturnItems]);

  const totalReplacementValue = React.useMemo(() => {
    return replacementItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  }, [replacementItems]);

  const netDifference = totalReplacementValue - totalReturnCredit;

  const handleProcessExchange = async () => {
    if (!currentSessionId) {
      toast.error("Please open an active POS register session first.");
      return;
    }
    if (Object.keys(selectedReturnItems).length === 0) {
      toast.error("Please select at least one returned item to exchange.");
      return;
    }
    if (replacementItems.length === 0) {
      toast.error("Please select at least one replacement item from the inventory.");
      return;
    }

    setIsProcessing(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validParentId = (originalBill?.id && uuidRegex.test(originalBill.id)) ? originalBill.id : undefined;

      // 1. Negative lines (Returned Items restoring stock)
      const returnLines = originalBill.items
        .filter((it: any) => selectedReturnItems[it.id] > 0)
        .map((it: any) => {
          const qty = selectedReturnItems[it.id];
          const validPid = (it.product_id && uuidRegex.test(it.product_id)) ? it.product_id : "00000000-0000-0000-0000-000000000000";
          return {
            product_id: validPid,
            quantity: -Math.max(1, Math.round(qty)),
            unit_price: Number(it.unit_price || 0),
            discount: 0,
            subtotal: -Number(it.unit_price || 0) * qty
          };
        });

      // 2. Positive lines (New Replacement Items deducting stock)
      const replacementLines = replacementItems.map((it) => {
        const validPid = (it.product_id && uuidRegex.test(it.product_id)) ? it.product_id : "00000000-0000-0000-0000-000000000000";
        return {
          product_id: validPid,
          quantity: Math.max(1, Math.round(it.quantity)),
          unit_price: Number(it.unit_price || 0),
          discount: 0,
          subtotal: Number(it.unit_price || 0) * it.quantity
        };
      });

      const combinedLines = [...returnLines, ...replacementLines];

      // Payment for difference
      const payments = [
        {
          payment_method: diffPaymentMode,
          amount: netDifference
        }
      ];

      const payload = {
        session_id: currentSessionId,
        parent_transaction_id: validParentId,
        status: "completed",
        items: combinedLines,
        payments: payments,
        subtotal: netDifference,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: netDifference
      };

      const response = await posApi.checkout(payload);
      toast.success(`Exchange completed successfully! Receipt Ref: ${response.receipt_number}`);
      
      // Reset
      setOriginalBill(null);
      setSelectedReturnItems({});
      setReplacementItems([]);
      setReceiptSearch("");
      setProductSearch("");
    } catch (err: any) {
      console.error("Exchange checkout error:", err);
      toast.error("Exchange failed: " + (err.detail || err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-xs">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Direct POS Exchange Terminal</h2>
            <p className="text-slate-500 text-xs font-medium">1-Step item exchange: swap returned products with new inventory items & settle difference.</p>
          </div>
        </div>
      </div>

      {/* Step 1: Lookup Receipt & Quick Recent Invoices */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={receiptSearch}
            onChange={(e) => setReceiptSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Scan receipt barcode or enter Receipt / Invoice # (e.g. INV-ORD-4F885C1D, INVO-20260911-71EEAEEE, INV-53333)..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={lookupLoading}
            className="bg-indigo-600 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {lookupLoading ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            Lookup Bill
          </button>
        </div>

        {/* Quick Clickable Recent Invoices Chips */}
        {recentBills.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <History className="w-3 h-3 text-slate-400" /> Recent:
            </span>
            {recentBills.map(b => (
              <button
                key={b.number}
                type="button"
                onClick={() => {
                  setReceiptSearch(b.number);
                  handleLookup(b.number);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200/60 transition-all shrink-0 flex items-center gap-1.5"
              >
                <span className="font-mono font-semibold">{b.number}</span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-slate-700">{formatCurrency(b.total)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {originalBill ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
          {/* ── LEFT: Full Invoice Details & Return Items ── */}
          <div className="lg:col-span-6 bg-white border border-rose-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
            
            {/* INVOICE MASTER DETAILS CARD */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                      {originalBill.invoice_type || "Invoice"}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-900">{originalBill.receipt_number}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>📅 {new Date(originalBill.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>•</span>
                    <span>👤 <strong className="text-slate-700">{originalBill.customer_name || "Walk-in Guest"}</strong></span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Bill Value</span>
                  <span className="text-base font-black text-slate-900">{formatCurrency(originalBill.total_amount)}</span>
                </div>
              </div>

              {/* Financial & Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 font-medium block">Subtotal</span>
                  <span className="font-bold text-slate-800">{formatCurrency(originalBill.subtotal || originalBill.total_amount)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 font-medium block">Tax (GST)</span>
                  <span className="font-bold text-slate-800">{formatCurrency(originalBill.tax_amount || 0)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 font-medium block">Payment</span>
                  <span className="font-bold text-slate-800 uppercase">{originalBill.payment_method || "Cash"}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400 font-medium block">Status</span>
                  <span className="font-bold text-emerald-600 uppercase">{originalBill.status || "PAID"}</span>
                </div>
              </div>
            </div>

            {/* Step 1 Header & Return Credit Counter */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Items to Return / Exchange</h3>
                <p className="text-[11px] text-slate-500">Pick items and quantities customer wants to exchange</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Return Credit</span>
                <span className="text-base font-black text-rose-600">-{formatCurrency(totalReturnCredit)}</span>
              </div>
            </div>

            {/* Line Items List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] pr-1">
              {(originalBill.items || []).map((it: any) => {
                const isSelected = !!selectedReturnItems[it.id];
                const maxQty = Number(it.quantity || 1);
                const currentQty = selectedReturnItems[it.id] || 0;
                const isEligible = it.is_returnable !== false;
                const daysAgo = it.days_ago ?? 0;
                const isWithinWindow = daysAgo <= 30;

                return (
                  <div
                    key={it.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-rose-400 bg-rose-50/60 shadow-xs ring-1 ring-rose-300"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleReturnItem(it.id, maxQty)}
                          className="mt-1 size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs text-slate-900 leading-snug">{it.product_name || it.name || "Item"}</p>
                            {it.product_sku && (
                              <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                {it.product_sku}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span>Unit: <strong className="text-slate-800">{formatCurrency(Number(it.unit_price))}</strong></span>
                            <span>•</span>
                            <span>Purchased: <strong className="text-slate-800">{maxQty} qty</strong></span>
                            {Number(it.tax_rate) > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium bg-emerald-50 px-1 rounded text-[10px]">GST {it.tax_rate}%</span>
                              </>
                            )}
                          </div>

                          {/* Eligibility Badge */}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {isEligible && isWithinWindow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Return & Exchange Eligible
                                <span className="text-[9px] font-normal text-emerald-800">({30 - daysAgo}d window left)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Return Window Expired ({daysAgo}d ago)
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-slate-900 block">
                          {formatCurrency(Number(it.unit_price) * (isSelected ? currentQty : maxQty))}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-rose-200/70 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-700">Return Qty:</span>
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateReturnQty(it.id, currentQty - 1, maxQty)}
                              className="px-2 py-0.5 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-slate-900 bg-slate-50">{currentQty}</span>
                            <button
                              type="button"
                              onClick={() => updateReturnQty(it.id, currentQty + 1, maxQty)}
                              className="px-2 py-0.5 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400">max {maxQty}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-700">Reason:</span>
                          <select
                            value={returnReasons[it.id] || "Size / Fit Swap"}
                            onChange={(e) => setReturnReasons(prev => ({ ...prev, [it.id]: e.target.value }))}
                            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-800 shadow-2xs"
                          >
                            <option value="Size / Fit Swap">Size / Fit Swap</option>
                            <option value="Color Swap">Color / Variant Swap</option>
                            <option value="Customer Mind Change">Customer Mind Change</option>
                            <option value="Defective Replacement">Defective / Damaged</option>
                            <option value="Model Upgrade">Model / Price Upgrade</option>
                            <option value="Wrong Item Received">Wrong Item Billed</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Replacement Products & Catalog ── */}
          <div className="lg:col-span-6 bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Step 2 • New Replacement Products
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">Select New Inventory Items</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">New Items Value</span>
                <span className="text-base font-black text-emerald-600">+{formatCurrency(totalReplacementValue)}</span>
              </div>
            </div>

            {/* Catalog search bar */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search replacement catalog by product name, SKU or barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-slate-50"
              />
            </div>

            {/* Catalog product pills / quick grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 max-h-[140px] overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-100">
              {filteredCatalog.map((prod: any) => (
                <div
                  key={prod.id}
                  onClick={() => handleAddReplacement(prod)}
                  className="p-2 bg-white rounded-lg border border-slate-200 hover:border-emerald-500 hover:shadow-2xs cursor-pointer transition-all flex flex-col justify-between"
                >
                  <p className="text-[11px] font-semibold text-slate-900 line-clamp-1">{prod.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-bold text-emerald-600">
                      {formatCurrency(Number(prod.price || prod.selling_price || prod.mrp || 0))}
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded">
                      + Add
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Added Replacement Items Table */}
            <div className="flex-1 border border-slate-200 rounded-xl overflow-y-auto max-h-[220px]">
              {replacementItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No replacement products added yet. Click on any product above to add.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-500 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {replacementItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{it.name}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(it.unit_price)}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center border border-slate-200 rounded-md bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateReplacementQty(idx, -1)}
                              className="px-1.5 py-0.5 hover:bg-slate-100 font-bold text-slate-700"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-slate-900">{it.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateReplacementQty(idx, 1)}
                              className="px-1.5 py-0.5 hover:bg-slate-100 font-bold text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(it.unit_price * it.quantity)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateReplacementQty(idx, -it.quantity)}
                            className="text-slate-400 hover:text-rose-600 font-bold text-sm"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── BOTTOM: Settlement & Finalization Bar ── */}
          <div className="lg:col-span-12 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-5">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Return Credit:</span>
                <span className="text-sm font-bold text-rose-600">-{formatCurrency(totalReturnCredit)}</span>
              </div>
              <span className="text-slate-300 font-bold text-sm">+</span>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">New Products:</span>
                <span className="text-sm font-bold text-emerald-600">+{formatCurrency(totalReplacementValue)}</span>
              </div>
              <span className="text-slate-300 font-bold text-sm">=</span>
              <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] text-slate-500 font-semibold block">
                  {netDifference > 0 ? "Customer Pays Balance:" : netDifference < 0 ? "Store Refunds Customer:" : "Net Balance:"}
                </span>
                <span className={`text-base font-black ${netDifference > 0 ? "text-indigo-600" : netDifference < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {netDifference === 0 ? "₹0.00 (Even Swap)" : formatCurrency(Math.abs(netDifference))}
                </span>
              </div>
            </div>

            {/* Payment Method Selector & Confirm Button */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              {netDifference !== 0 && (
                <select
                  value={diffPaymentMode}
                  onChange={(e) => setDiffPaymentMode(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="online">⚡ UPI / Online</option>
                  <option value="card">💳 Card</option>
                  <option value="wallet">👛 Customer Wallet</option>
                </select>
              )}

              <button
                type="button"
                onClick={handleProcessExchange}
                disabled={isProcessing || Object.keys(selectedReturnItems).length === 0 || replacementItems.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <RefreshCw className="size-3.5 animate-spin" /> : <ArrowRightLeft className="size-3.5" />}
                Complete & Print Exchange
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center max-w-xl mx-auto my-auto space-y-4 shadow-xs">
          <div className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ArrowRightLeft className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Scan or Enter Receipt to Start Exchange</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Enter any original counter receipt number (`REC-...`) or ERP sales invoice (`INV-...`) in the search bar above, or click any recent bill to load the customer's items for exchange.
          </p>
        </div>
      )}
    </div>
  );
};

export const RefundView = ({ currentSessionId, initialSearch }: { currentSessionId?: string, initialSearch?: string }) => {
  const { formatCurrency } = useCurrency();
  const [search, setSearch] = React.useState(initialSearch || "");
  const [itemSearch, setItemSearch] = React.useState("");
  const [tx, setTx] = React.useState<any | null>(null);
  const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});
  const [refundReasons, setRefundReasons] = React.useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] = React.useState<"cash" | "card" | "online" | "wallet">("cash");
  const [recentBills, setRecentBills] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Fetch recent bills for quick chips
  React.useEffect(() => {
    const fetchRecent = async () => {
      try {
        const [posHistory, invRes] = await Promise.all([
          posApi.getHistory({ limit: 15 }).catch(() => []),
          invoicesApi.listInvoices({ page_size: 15 }).catch(() => null)
        ]);

        const invList = (invRes as any)?.items || (invRes as any)?.data || (Array.isArray(invRes) ? invRes : []);
        const combined = [
          ...invList.map((inv: any) => ({
            id: inv.id,
            number: inv.invoice_number || `INV-${inv.id.slice(0, 8)}`,
            customer: inv.customer_name || "Guest",
            total: Number(inv.total_amount || 0),
            date: inv.invoice_date || inv.created_at,
            type: "invoice"
          })),
          ...posHistory.map((pos: any) => ({
            id: pos.id,
            number: pos.receipt_number || `REC-${pos.id.slice(0, 8)}`,
            customer: pos.customer_name || pos.customer_id || "Guest",
            total: Number(pos.total_amount || 0),
            date: pos.created_at,
            type: "pos"
          }))
        ];

        const unique = Array.from(new Map(combined.map(b => [b.number, b])).values());
        unique.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setRecentBills(unique.slice(0, 8));
      } catch (e) {
        console.warn("Failed to load recent bills for refund:", e);
      }
    };
    fetchRecent();
  }, []);

  const handleLookup = async (query?: string) => {
    const q = (query || search).trim();
    if (!q) return;
    setLoading(true);
    try {
      // 1. Search in POS transactions
      const history = await posApi.getHistory({ limit: 1000 }).catch(() => []);
      let found: any = history.find(t => 
        t.id?.toLowerCase() === q.toLowerCase() || 
        t.receipt_number?.toLowerCase() === q.toLowerCase() ||
        t.id?.toLowerCase().includes(q.toLowerCase()) ||
        t.receipt_number?.toLowerCase().includes(q.toLowerCase())
      );

      // 2. If not found in POS receipts, search in ERP sales invoices (e.g. INVO-...)
      if (!found) {
        let fullInv: any = await invoicesApi.getInvoice(q).catch(() => null);

        if (!fullInv) {
          const invRes: any = await invoicesApi.listInvoices({ search: q }).catch(() => null);
          const invList = invRes?.items || invRes?.data || (Array.isArray(invRes) ? invRes : []);
          const matchedInv = invList.find((inv: any) => 
            inv.id?.toLowerCase() === q.toLowerCase() || 
            inv.invoice_number?.toLowerCase() === q.toLowerCase() || 
            inv.invoice_number?.toLowerCase().includes(q.toLowerCase())
          );

          if (matchedInv) {
            fullInv = await invoicesApi.getInvoice(matchedInv.id).catch(() => matchedInv);
          }
        }

        if (fullInv) {
          const rawLines = fullInv.lines || fullInv.items || fullInv.invoice_items || [];
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          let mappedItems = rawLines.map((it: any, idx: number) => {
            const rawPid = it.product_id || it.productId;
            const validPid = (typeof rawPid === "string" && uuidRegex.test(rawPid))
              ? rawPid
              : (typeof fullInv.id === "string" && uuidRegex.test(fullInv.id))
                ? fullInv.id
                : "00000000-0000-0000-0000-000000000000";

            const qty = Math.max(1, Math.round(Number(it.quantity || 1)));
            const unitPrice = Number(it.unit_price || it.rate || (Number(fullInv.total_amount || 0) / Math.max(1, rawLines.length)));
            const subtotal = Number(it.line_total || it.taxable_amount || it.subtotal || (unitPrice * qty));

            return {
              id: it.id || `inv-line-${idx}`,
              product_id: validPid,
              product_name: it.product_name || it.description || it.item_name || `Item #${idx + 1}`,
              product_sku: it.product_sku || it.sku || it.hsn_code || `SKU-${idx + 1}`,
              quantity: qty,
              unit_price: unitPrice,
              tax_rate: Number(it.tax_rate || 0),
              discount_amount: Number(it.discount_amount || 0),
              subtotal: subtotal,
              is_returnable: it.is_returnable !== false,
              days_ago: Math.max(0, Math.floor((Date.now() - new Date(fullInv.created_at || fullInv.invoice_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
            };
          });

          if (mappedItems.length === 0 && Number(fullInv.total_amount || 0) > 0) {
            mappedItems = [
              {
                id: fullInv.id || `inv-item-0`,
                product_id: (typeof fullInv.id === "string" && uuidRegex.test(fullInv.id)) ? fullInv.id : "00000000-0000-0000-0000-000000000000",
                product_name: fullInv.invoice_number ? `Merchandise (${fullInv.invoice_number})` : "Store Merchandise",
                product_sku: fullInv.invoice_number || "INV-ITEM",
                quantity: 1,
                unit_price: Number(fullInv.total_amount || 0),
                tax_rate: Number(fullInv.tax_rate || 0),
                discount_amount: Number(fullInv.discount_amount || 0),
                subtotal: Number(fullInv.total_amount || 0),
                is_returnable: true,
                days_ago: Math.max(0, Math.floor((Date.now() - new Date(fullInv.created_at || fullInv.invoice_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
              }
            ];
          }

          found = {
            id: fullInv.id,
            receipt_number: fullInv.invoice_number || `INV-${fullInv.id.slice(0, 8)}`,
            invoice_type: fullInv.invoice_type || "Tax Invoice",
            created_at: fullInv.created_at || fullInv.invoice_date || new Date().toISOString(),
            customer_name: fullInv.customer_name || fullInv.customer_id || "Walk-in Guest",
            customer_phone: fullInv.customer_phone || fullInv.phone || "N/A",
            customer_email: fullInv.customer_email || fullInv.email || "N/A",
            subtotal: Number(fullInv.subtotal || fullInv.taxable_amount || fullInv.total_amount || 0),
            tax_amount: Number(fullInv.tax_amount || fullInv.cgst_amount || 0) + Number(fullInv.sgst_amount || 0) + Number(fullInv.igst_amount || 0),
            discount_amount: Number(fullInv.discount_amount || 0),
            total_amount: Number(fullInv.total_amount || 0),
            status: fullInv.status || "PAID",
            payment_method: fullInv.payment_method || "cash",
            items: mappedItems,
            payments: [{ payment_method: fullInv.payment_method || "cash", amount: Number(fullInv.total_amount || 0) }]
          };
        }
      }

      setTx(found || null);
      setSelectedItems({});
      setRefundReasons({});
      if (found) {
        toast.success(`Loaded bill: ${found.receipt_number}`);
      } else {
        toast.error(`Receipt / Invoice "${q}" not found in POS or ERP records.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
      handleLookup(initialSearch);
    }
  }, [initialSearch]);

  const toggleItem = (itemId: string, maxQty: number) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[itemId]) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = maxQty;
      }
      return newItems;
    });
  };

  const updateItemQty = (itemId: string, qty: number, maxQty: number) => {
    if (qty <= 0) {
      setSelectedItems(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: Math.min(qty, maxQty)
      }));
    }
  };

  const handleSelectAll = () => {
    if (!tx) return;
    const filteredItems = tx.items.filter((item: any) => 
      itemSearch ? (item.product_name?.toLowerCase().includes(itemSearch.toLowerCase()) || item.product_sku?.toLowerCase().includes(itemSearch.toLowerCase())) : true
    );
    
    const allSelected = filteredItems.every((i: any) => selectedItems[i.id] === i.quantity);
    
    if (allSelected) {
      const newItems = { ...selectedItems };
      filteredItems.forEach((i: any) => delete newItems[i.id]);
      setSelectedItems(newItems);
    } else {
      const newItems = { ...selectedItems };
      filteredItems.forEach((i: any) => { newItems[i.id] = i.quantity; });
      setSelectedItems(newItems);
    }
  };

  const refundAmount = tx ? tx.items.reduce((sum: number, item: any) => {
    return sum + (selectedItems[item.id] ? Number(item.unit_price) * selectedItems[item.id] : 0);
  }, 0) : 0;

  const handleRefund = async () => {
    if (!tx || !currentSessionId) {
      toast.error("Please open an active POS register session first before processing refunds.");
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      toast.error("Please select at least one item to refund.");
      return;
    }

    setIsProcessing(true);
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validParentId = (typeof tx.id === "string" && uuidRegex.test(tx.id)) ? tx.id : undefined;

      const payload = {
        subtotal: -refundAmount,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: -refundAmount,
        session_id: currentSessionId,
        parent_transaction_id: validParentId,
        items: tx.items.filter((i: any) => selectedItems[i.id] > 0).map((i: any) => {
          const pid = (typeof i.product_id === "string" && uuidRegex.test(i.product_id))
            ? i.product_id
            : "00000000-0000-0000-0000-000000000000";
          return {
            product_id: pid,
            quantity: -Math.max(1, Math.round(selectedItems[i.id])),
            unit_price: Number(i.unit_price || 0),
            discount: 0,
            subtotal: -Number(i.unit_price || 0) * selectedItems[i.id]
          };
        }),
        payments: [
          { payment_method: refundMethod, amount: -refundAmount }
        ]
      };
      const response = await posApi.checkout(payload);
      toast.success(`Refund processed successfully! Reference Receipt: ${response.receipt_number}`);
      setTx(null);
      setSelectedItems({});
      setRefundReasons({});
      setSearch("");
    } catch (err: any) {
      toast.error("Refund failed: " + (err.detail || err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Process Sales Refund</h2>
            <p className="text-slate-500 text-xs font-medium">Look up original bill to issue partial or full refund and restore warehouse inventory.</p>
          </div>
        </div>
      </div>

      {/* Lookup Bar & Recent Bills */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="Scan receipt barcode or enter Receipt / Invoice # (e.g. INV-ORD-4F885C1D, INVO-20260911-71EEAEEE, INV-53333)..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <button
            type="button"
            onClick={() => handleLookup()}
            disabled={loading}
            className="bg-slate-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            Lookup Bill
          </button>
        </div>

        {/* Quick Recent Bills Chips */}
        {recentBills.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <History className="w-3 h-3 text-slate-400" /> Recent:
            </span>
            {recentBills.map(b => (
              <button
                key={b.number}
                type="button"
                onClick={() => {
                  setSearch(b.number);
                  handleLookup(b.number);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200/60 transition-all shrink-0 flex items-center gap-1.5"
              >
                <span className="font-mono font-semibold">{b.number}</span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-slate-700">{formatCurrency(b.total)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {tx ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col flex-1">
          
          {/* MASTER INVOICE DETAILS CARD */}
          <div className="p-5 border-b border-slate-200/70 bg-slate-50/80">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/60 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                    {tx.invoice_type || "Invoice"}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">{tx.receipt_number}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>📅 {new Date(tx.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>•</span>
                  <span>👤 <strong className="text-slate-700">{tx.customer_name || tx.customer_id || "Walk-in Guest"}</strong></span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Original Bill Total</span>
                <span className="text-base font-black text-slate-900">{formatCurrency(tx.total_amount)}</span>
              </div>
            </div>

            {/* Financial Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 font-medium block">Subtotal</span>
                <span className="font-bold text-slate-800">{formatCurrency(tx.subtotal || tx.total_amount)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 font-medium block">Tax (GST)</span>
                <span className="font-bold text-slate-800">{formatCurrency(tx.tax_amount || 0)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 font-medium block">Original Mode</span>
                <span className="font-bold text-slate-800 uppercase">{tx.payment_method || tx.payments?.[0]?.payment_method || "Cash"}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 font-medium block">Status</span>
                <span className="font-bold text-emerald-600 uppercase">{tx.status || "PAID"}</span>
              </div>
            </div>
          </div>

          {/* Items Filter & Select All Bar */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Filter items by name or SKU..." 
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium bg-slate-50"
              />
            </div>
            <button 
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-rose-200/60"
            >
              Select All Items
            </button>
          </div>

          {/* Items Table / Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[380px]">
            {tx.items
              .filter((item: any) => itemSearch ? (item.product_name?.toLowerCase().includes(itemSearch.toLowerCase()) || item.product_sku?.toLowerCase().includes(itemSearch.toLowerCase())) : true)
              .map((item: any) => {
                const isSelected = !!selectedItems[item.id];
                const maxQty = Number(item.quantity || 1);
                const currentQty = selectedItems[item.id] || 0;
                const isEligible = item.is_returnable !== false;
                const daysAgo = item.days_ago ?? 0;
                const isWithinWindow = daysAgo <= 30;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-rose-400 bg-rose-50/60 shadow-xs ring-1 ring-rose-300"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.id, maxQty)}
                          className="mt-1 size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs text-slate-900 leading-snug">{item.product_name || item.name || "Item"}</p>
                            {item.product_sku && (
                              <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                {item.product_sku}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span>Unit Price: <strong className="text-slate-800">{formatCurrency(Number(item.unit_price))}</strong></span>
                            <span>•</span>
                            <span>Purchased: <strong className="text-slate-800">{maxQty} qty</strong></span>
                            {Number(item.tax_rate) > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium bg-emerald-50 px-1 rounded text-[10px]">GST {item.tax_rate}%</span>
                              </>
                            )}
                          </div>

                          {/* Eligibility Badge */}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {isEligible && isWithinWindow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Return & Refund Eligible
                                <span className="text-[9px] font-normal text-emerald-800">({30 - daysAgo}d window left)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Return Window Expired ({daysAgo}d ago)
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs text-slate-900 block">
                          {formatCurrency(Number(item.unit_price) * (isSelected ? currentQty : maxQty))}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                            To Refund
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-rose-200/70 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-700">Refund Qty:</span>
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, currentQty - 1, maxQty)}
                              className="px-2 py-0.5 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-slate-900 bg-slate-50">{currentQty}</span>
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, currentQty + 1, maxQty)}
                              className="px-2 py-0.5 hover:bg-slate-100 font-bold text-slate-700 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400">max {maxQty}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-700">Reason:</span>
                          <select
                            value={refundReasons[item.id] || "Customer Mind Change"}
                            onChange={(e) => setRefundReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-800 shadow-2xs"
                          >
                            <option value="Customer Mind Change">Customer Changed Mind</option>
                            <option value="Defective Item">Defective / Damaged</option>
                            <option value="Wrong Item Billed">Wrong Item Billed</option>
                            <option value="Dissatisfied Quality">Dissatisfied with Quality</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Bottom Refund Settlement Bar */}
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/90 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Refund Payout</span>
                <div className="text-2xl font-black text-rose-600">{formatCurrency(refundAmount)}</div>
              </div>

              {/* Refund Method Tender Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">Payout Via:</span>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none shadow-2xs cursor-pointer"
                >
                  <option value="cash">💵 Cash Out</option>
                  <option value="online">⚡ UPI / Bank Transfer</option>
                  <option value="card">💳 Card Reversal</option>
                  <option value="wallet">👛 Store Wallet Credit</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefund}
              disabled={refundAmount === 0 || isProcessing}
              className="bg-rose-600 disabled:bg-slate-300 text-white font-bold text-xs px-7 py-3 rounded-xl hover:bg-rose-700 transition-colors shadow-xs disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? <RefreshCw className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
              Issue Refund ({formatCurrency(refundAmount)})
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center max-w-xl mx-auto my-auto space-y-4 shadow-xs">
          <div className="size-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <CreditCard className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Scan or Enter Receipt to Process Refund</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Enter any original counter receipt number (`REC-...`) or ERP sales invoice (`INV-...`) in the search bar above, or click any recent bill to load the items for refund.
          </p>
        </div>
      )}
    </div>
  );
};
export const PriceCheckView = ({ products = [] }: { products?: any[] }) => {
  const [barcode, setBarcode] = React.useState("");
  const [matchedProduct, setMatchedProduct] = React.useState<any | null>(null);

  const handleScan = (code: string) => {
    const list = products.length > 0 ? products : posProducts;
    const found = list.find((p: any) => p.barcode === code || p.sku === code || p.id === code || p.name?.toLowerCase().includes(code.toLowerCase()));
    setMatchedProduct(found || null);
  };

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-xs">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Price & Stock Checker</h2>
            <p className="text-slate-500 text-xs font-medium">Scan any product barcode or search SKU for instant price, tax, and inventory lookup.</p>
          </div>
        </div>
      </div>

      {/* Barcode Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 mb-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <ScanBarcode className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={barcode}
            onChange={(e) => {
              setBarcode(e.target.value);
              handleScan(e.target.value.trim());
            }}
            placeholder="Scan barcode or type SKU / Item Name..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {barcode && (
            <button
              onClick={() => {
                setBarcode("");
                setMatchedProduct(null);
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {matchedProduct ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs max-w-2xl space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {matchedProduct.brand || "Standard"}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1.5">{matchedProduct.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {matchedProduct.sku} • Barcode: {matchedProduct.barcode}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Retail Price</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(matchedProduct.sellingPrice || matchedProduct.selling_price || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">Available Stock</span>
              <span className="font-bold text-slate-800">{matchedProduct.stock || 0} Units</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">GST Tax Rate</span>
              <span className="font-bold text-slate-800">{matchedProduct.tax_percent || 18}%</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 font-medium block text-[10px] uppercase">MRP</span>
              <span className="font-bold text-slate-800">{formatCurrency(matchedProduct.mrp || matchedProduct.sellingPrice || 0)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-2xl shadow-xs">
          <ScanBarcode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Scanner Ready</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Scan any product using the handheld USB barcode scanner or type above.</p>
        </div>
      )}
    </div>
  );
};
export const FavoritesView = ({ products = [], addToCart }: { products?: any[], addToCart?: (product: any) => void }) => {
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('pos_favorites');
      if (stored) setFavoriteIds(JSON.parse(stored));
    } catch(e) {}
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = favoriteIds.includes(id) 
      ? favoriteIds.filter(f => f !== id)
      : [...favoriteIds, id];
    setFavoriteIds(newFavs);
    localStorage.setItem('pos_favorites', JSON.stringify(newFavs));
  };

  // If no favorites are set yet, show top 5 as a placeholder demo
  const favorites = favoriteIds.length > 0 
    ? products.filter(p => favoriteIds.includes(p.id))
    : products.slice(0, 8);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-hidden font-sans">
      <div className="mb-6 shrink-0 flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 shadow-xs">
          <Heart className="w-5 h-5 fill-rose-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Cashier Favorites</h2>
          <p className="text-slate-500 text-xs font-medium">1-tap quick access to your most frequently sold items.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {favorites.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-medium text-xs">No favorite products selected yet.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {favorites.map(p => (
              <div 
                key={p.id} 
                onClick={() => addToCart && addToCart(p)}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col relative"
              >
                <div 
                  onClick={(e) => toggleFavorite(e, p.id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 backdrop-blur-sm text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center shadow-2xs transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${favoriteIds.includes(p.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                </div>
                <div className="h-28 bg-slate-50 relative overflow-hidden flex items-center justify-center p-2">
                  <img src={p.image || p.image_url} alt={p.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 leading-snug mb-1">{p.name}</h4>
                  <div className="text-sm font-bold text-slate-900">{formatCurrency(p.sellingPrice || p.selling_price || 0)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export const RecentBillsView = ({ onRefund, onExchange }: { onRefund?: (id: string) => void; onExchange?: (id: string) => void }) => {
  const [bills, setBills] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [selectedBill, setSelectedBill] = React.useState<any | null>(null);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      posApi.getHistory({ search: searchQuery || undefined })
        .then((data: POSTransactionHistory[]) => {
          if (Array.isArray(data)) {
            const mapped = data.map(tx => {
              const payments = tx.payments || [];
              const totalAmount = Number(tx.total_amount) || 0;
              const creditPayment = payments.find((p: any) => p.payment_method?.toLowerCase() === 'credit');
              const nonCreditPayments = payments.filter((p: any) => p.payment_method?.toLowerCase() !== 'credit');
              const totalPaid = nonCreditPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
              const dueAmount = creditPayment ? Number(creditPayment.amount) : Math.max(0, totalAmount - totalPaid);
              const isPartial = dueAmount > 0.01 && totalPaid > 0.01;
              const isCreditOnly = dueAmount >= totalAmount - 0.01 && totalAmount > 0;

              let methodDisplay = payments?.[0]?.payment_method?.toUpperCase() || "CASH";
              if (isPartial) {
                const upfrontMethod = nonCreditPayments[0]?.payment_method?.toUpperCase() || "CASH";
                methodDisplay = `PARTIAL (${upfrontMethod} + CREDIT)`;
              } else if (payments.length > 1) {
                methodDisplay = "SPLIT";
              } else if (isCreditOnly) {
                methodDisplay = "CREDIT / KHATA";
              }

              let statusDisplay = tx.status ? (tx.status.charAt(0).toUpperCase() + tx.status.slice(1)) : "Completed";
              if (isPartial) {
                statusDisplay = "Partially Paid";
              } else if (isCreditOnly) {
                statusDisplay = "Pay Later / Due";
              }

              return {
                rawId: tx.id,
                id: tx.receipt_number,
                date: tx.created_at,
                customerName: (tx as any).customer_name || "Customer",
                paymentMethod: methodDisplay,
                total: totalAmount,
                paidAmount: totalPaid,
                dueAmount: dueAmount,
                isPartial: isPartial,
                isCreditOnly: isCreditOnly,
                status: statusDisplay,
                items: tx.items,
                payments: tx.payments,
                subtotal: tx.subtotal,
                tax: tx.tax_amount,
                discount: tx.discount_amount,
                isRefund: totalAmount < 0,
                parentTxId: tx.parent_transaction_id,
              };
            });
            setBills(mapped);
          }
        })
        .catch((err) => {
          console.warn("Failed to fetch history:", err);
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 relative overflow-hidden font-sans">
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Recent Receipts & Transactions</h2>
            <p className="text-slate-500 text-xs font-medium">
              {loading ? "Loading from database..." : `${bills.length} transactions recorded in session ledger`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search receipt no or customer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-xs"
            />
          </div>
          {loading && <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-xs border border-slate-200/80">
        <table className="w-full text-xs text-left">
          <thead className="text-[11px] text-slate-500 uppercase font-semibold bg-slate-50/80 border-b border-slate-200/80 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3.5 font-bold">Receipt / Bill #</th>
              <th className="px-5 py-3.5 font-bold">Time</th>
              <th className="px-5 py-3.5 font-bold">Customer</th>
              <th className="px-5 py-3.5 font-bold">Payment Method</th>
              <th className="px-5 py-3.5 font-bold text-right">Total Amount</th>
              <th className="px-5 py-3.5 font-bold text-center">Status</th>
              <th className="px-5 py-3.5 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(tx => (
              <tr key={tx.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${tx.isRefund ? 'bg-rose-50/30' : ''}`}>
                <td className="px-6 py-4 font-mono font-medium text-slate-700">
                  {tx.id}
                  {tx.isRefund && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">Refund</span>}
                </td>
                <td className="px-6 py-4 text-slate-500">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{tx.customerName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${tx.isPartial ? 'bg-amber-100 text-amber-800' : 'text-slate-600 bg-slate-100'}`}>
                    {tx.paymentMethod}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`font-bold ${tx.isRefund ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatCurrency(tx.total)}
                  </div>
                  {tx.isPartial && (
                    <div className="text-[10px] font-semibold flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-emerald-600">Paid: +{formatCurrency(tx.paidAmount)}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-600 font-bold">Due: {formatCurrency(tx.dueAmount)}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    tx.isRefund 
                      ? 'bg-rose-100 text-rose-700' 
                      : tx.isPartial
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : tx.status === 'Completed' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tx.isRefund ? 'Refunded' : tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedBill(tx)}
                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold text-xs px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Details Modal */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedBill(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-none">Receipt Details</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{selectedBill.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBill(null)} className="p-2 text-slate-400 hover:text-slate-900 bg-white rounded-lg border border-slate-200 shadow-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {/* Customer Info */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                    {selectedBill.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedBill.customerName}</p>
                    <p className="text-xs text-slate-500">{new Date(selectedBill.date).toLocaleString()}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {selectedBill.isRefund && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                        Refund Receipt
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedBill.isRefund ? 'bg-rose-100 text-rose-700' : selectedBill.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedBill.isRefund ? 'Refunded' : selectedBill.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Purchased Items</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {selectedBill.items.map((item: any, idx: number) => {
                    // Check if this specific item was refunded in any child transactions
                    const childRefunds = bills.filter(b => b.parentTxId === selectedBill.rawId);
                    const refundedQty = childRefunds.reduce((sum, child) => {
                      const childItem = child.items.find((i: any) => i.product_id === item.product_id);
                      return sum + (childItem ? Math.abs(childItem.quantity) : 0);
                    }, 0);
                    
                    return (
                      <div key={idx} className="flex justify-between p-3 border-b border-slate-100 last:border-b-0 items-center">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.name || `Product ${item.product_id.substring(0,8)}`}</p>
                          <p className="text-xs text-slate-500">
                            {item.quantity} x {formatCurrency(item.unit_price)}
                            {refundedQty > 0 && (
                              <span className="ml-2 font-bold text-rose-600">({refundedQty} Refunded)</span>
                            )}
                          </p>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Details */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Payment Breakdown</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedBill.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>Tax (5%)</span>
                    <span>{formatCurrency(selectedBill.tax || 0)}</span>
                  </div>
                  {selectedBill.discount > 0 && (
                    <div className="flex justify-between text-sm text-rose-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedBill.discount || 0)}</span>
                    </div>
                  )}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between text-lg font-black text-slate-900">
                    <span>Grand Total {selectedBill.isRefund && "(Refunded)"}</span>
                    <span className={selectedBill.isRefund ? "text-rose-600" : ""}>{formatCurrency(selectedBill.total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods Used */}
              {selectedBill.payments && selectedBill.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Payment Methods</h4>
                  <div className="flex gap-2">
                    {selectedBill.payments.map((pm: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 flex-1 text-center shadow-sm">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{pm.payment_method}</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(pm.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex gap-3">
              <button 
                onClick={async () => {
                  try {
                    const escpos = new ESCPOSPrinter();
                    const directPrinted = await escpos.printDirectUSB(selectedBill);
                    if (!directPrinted) {
                      triggerThermalPrint();
                    }
                  } catch (e) {
                    triggerThermalPrint();
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs text-xs"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              {!selectedBill.isRefund && (
                <>
                  <button 
                    onClick={() => {
                      if (onExchange && selectedBill?.id) {
                        onExchange(selectedBill.id);
                      }
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-xs text-xs flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Exchange
                  </button>
                  <button 
                    onClick={() => {
                      if (onRefund && selectedBill?.id) {
                        onRefund(selectedBill.id);
                      }
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition-colors shadow-xs text-xs flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Refund
                  </button>
                </>
              )}
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PrintableReceipt bill={selectedBill} allBills={bills} />
    </div>
  );
};
export const AISuggestionsView = () => (
  <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-y-auto font-sans">
    {/* Header */}
    <div className="mb-6 shrink-0 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">AI Sales & Cross-Sell Copilot</h2>
          <p className="text-slate-500 text-xs font-medium">Real-time cart intelligence, high-affinity add-ons, and customer recommendation triggers.</p>
        </div>
      </div>
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span> Copilot Active
      </span>
    </div>

    {/* Content Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            🔥 Fast Moving Bundle
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900">Weekend Grocery Super Saver</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Shoppers buying Fresh Milk (1L) have an 84% conversion rate when recommended Whole Wheat Bread & Butter.
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">+18% Avg Margin</span>
          <span className="text-indigo-600 font-bold">Recommended</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            ⚡ High-Margin Add-on
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900">Extended Warranty / Protection</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          For electronics & appliances over ₹1,000, trigger 1-year replacement protection add-on at register checkout.
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">₹149 Direct Revenue</span>
          <span className="text-indigo-600 font-bold">Recommended</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            🎯 Customer Loyalty Trigger
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900">Points Redemption Reminder</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Prompt returning customers when their accumulated loyalty reward points exceed ₹50 discount eligibility.
        </p>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Boosts Retention</span>
          <span className="text-indigo-600 font-bold">Automatic</span>
        </div>
      </div>
    </div>
  </div>
);

export const WalletView = () => {
  const [summary, setSummary] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    posApi.getDailySummary().then(data => {
      setSummary(data);
      setIsLoading(false);
    }).catch((err) => {
      console.error("Failed to load daily summary:", err);
      // Fallback to empty state
      setSummary({ transactions_count: 0, total_revenue: 0, breakdown: { cash: 0, card: 0, upi: 0 }, split_count: 0 });
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="flex-1 bg-slate-50/50 flex flex-col p-6 overflow-y-auto font-sans">
      {/* Header */}
      <div className="mb-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Daily Wallet & Settlement Summary</h2>
            <p className="text-slate-500 text-xs font-medium">Session payment reconciliation and multi-tender collection breakdown</p>
          </div>
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-5 flex-1">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Collection</span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.total_revenue || 0)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{summary.transactions_count || 0} bills finalized</span>
                </div>
              </div>
            </div>

            {/* Cash */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cash in Drawer</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Banknote className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.breakdown?.cash || 0)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-medium">
                  <span>Physical Currency Tender</span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Card / EDC Terminal</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.breakdown?.card || 0)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-medium">
                  <span>Debit & Credit EDC Swipe</span>
                </div>
              </div>
            </div>

            {/* UPI */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">UPI / Dynamic QR</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <QrCode className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(summary.breakdown?.upi || 0)}</div>
                <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-[11px] font-medium">
                  <span>Instant Soundbox / QR Pay</span>
                </div>
              </div>
            </div>

          </div>

          {/* Breakdown Card & Split Payments Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Tender Share Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Proportion of total session turnover by settlement channel</p>

              <div className="space-y-3">
                {[
                  { label: "Cash Collections", amount: summary.breakdown?.cash || 0, color: "bg-emerald-500", icon: Banknote },
                  { label: "Card Swipes / EDC", amount: summary.breakdown?.card || 0, color: "bg-blue-500", icon: CreditCard },
                  { label: "UPI & Digital QR", amount: summary.breakdown?.upi || 0, color: "bg-purple-500", icon: QrCode },
                ].map((item, idx) => {
                  const pct = summary.total_revenue > 0 ? ((item.amount / summary.total_revenue) * 100).toFixed(1) : "0.0";
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="p-3 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`${item.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Combine className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-900">Multi-Tender Splits</h4>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  <b>{summary.split_count || 0}</b> transactions were paid using combination split modes (e.g. Cash + UPI). All split portions are reconciled in individual channel totals.
                </p>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Drawer Status</h4>
                  <p className="text-[11px] text-slate-500">Active Register Session</p>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Opening Float:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(2000)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Cash:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(2000 + (summary.breakdown?.cash || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
