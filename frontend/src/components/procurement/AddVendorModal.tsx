import React, { useState } from "react";
import {
  Building,
  Building2,
  MapPin,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { inventoryApi } from "@/lib/api-client";
import { INDIAN_STATES } from "@/data/indian-states";
import { usePincodeLookup } from "@/hooks/use-pincode-lookup";

export interface VendorAddressSlot {
  id: string;
  tag: "Warehouse" | "Factory" | "Office" | "Branch" | "Other";
  street: string;
  city: string;
  state: string;
  pincode: string;
  is_billing: boolean;
  is_shipping: boolean;
}

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: (vendor: any) => void;
}

export function AddVendorModal({ isOpen, onClose, onVendorCreated }: AddVendorModalProps) {
  const { lookup: lookupPincode, loading: isLookingUpPincode } = usePincodeLookup();

  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorCompany, setNewVendorCompany] = useState("");
  const [newVendorGST, setNewVendorGST] = useState("");
  const [newVendorType, setNewVendorType] = useState("Wholesale Supplier");
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vendorAddresses, setVendorAddresses] = useState<VendorAddressSlot[]>([
    {
      id: "addr-1",
      tag: "Warehouse",
      street: "",
      city: "",
      state: "Andhra Pradesh",
      pincode: "",
      is_billing: true,
      is_shipping: true,
    },
  ]);
  const [activeAddrIndex, setActiveAddrIndex] = useState(0);

  if (!isOpen) return null;

  const handleAddNewAddressSlot = (
    tag: "Warehouse" | "Factory" | "Office" | "Branch" | "Other" = "Warehouse"
  ) => {
    const newSlot: VendorAddressSlot = {
      id: `addr-${Date.now()}`,
      tag,
      street: "",
      city: "",
      state: vendorAddresses[0]?.state || "Andhra Pradesh",
      pincode: "",
      is_billing: false,
      is_shipping: false,
    };
    const updated = [...vendorAddresses, newSlot];
    setVendorAddresses(updated);
    setActiveAddrIndex(updated.length - 1);
  };

  const handleRemoveAddressSlot = (indexToRemove: number) => {
    if (vendorAddresses.length <= 1) {
      toast.error("At least one address location is required.");
      return;
    }
    const updated = vendorAddresses.filter((_, idx) => idx !== indexToRemove);
    setVendorAddresses(updated);
    setActiveAddrIndex(Math.max(0, indexToRemove - 1));
  };

  const handleActiveAddrPincodeChange = async (val: string) => {
    const updated = [...vendorAddresses];
    const curr = { ...updated[activeAddrIndex] };
    curr.pincode = val;
    updated[activeAddrIndex] = curr;
    setVendorAddresses(updated);

    const clean = val.replace(/\D/g, "").slice(0, 6);
    if (clean.length === 6) {
      const res = await lookupPincode(clean);
      if (res) {
        if (res.city) curr.city = res.city;
        if (res.state) {
          const matched = INDIAN_STATES.find(
            (s) =>
              s.name.toLowerCase() === res.state.toLowerCase() ||
              res.state.toLowerCase().includes(s.name.toLowerCase())
          );
          curr.state = matched?.name || res.state;
        }
        if (!curr.street && res.area) {
          curr.street = res.area;
        }
        updated[activeAddrIndex] = curr;
        setVendorAddresses([...updated]);
      }
    }
  };

  const handleVerifyGstin = async (gstOverride?: string) => {
    const cleanGst = (gstOverride || newVendorGST || "").trim().toUpperCase();
    if (!cleanGst || cleanGst.length !== 15) {
      if (!gstOverride) toast.error("Please enter a valid 15-character GSTIN Number.");
      return;
    }
    setIsVerifyingGst(true);
    try {
      const res = await inventoryApi.verifyGstin(cleanGst);
      if (res && res.valid) {
        const companyName = res.trade_name || res.legal_name || "";
        if (companyName) {
          setNewVendorName(companyName);
          setNewVendorCompany(companyName);
        }
        if (res.gstin) setNewVendorGST(res.gstin);

        // Populate active address
        const targetIdx =
          activeAddrIndex >= 0 && activeAddrIndex < vendorAddresses.length
            ? activeAddrIndex
            : 0;
        const fullAddr =
          (res as any).principal_address || res.address || `${res.city || ""}, ${res.state || ""}`.trim();
        const updated = [...vendorAddresses];
        const primaryAddr = { ...updated[targetIdx] };
        if (fullAddr) primaryAddr.street = fullAddr;
        if (res.city) primaryAddr.city = res.city;
        if (res.state) {
          const matched = INDIAN_STATES.find(
            (s) =>
              s.name.toLowerCase() === res.state!.toLowerCase() ||
              res.state!.toLowerCase().includes(s.name.toLowerCase()) ||
              s.code === res.state_code
          );
          primaryAddr.state = matched?.name || res.state;
        }
        if (res.pincode) primaryAddr.pincode = res.pincode;
        updated[targetIdx] = primaryAddr;
        setVendorAddresses(updated);

        toast.success(`GST Verified! Auto-filled: "${companyName}"`);
      } else {
        toast.error("GST verification did not return valid business data.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to verify GSTIN Number.");
    } finally {
      setIsVerifyingGst(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return toast.error("Vendor name is required");
    if (!newVendorPhone.trim()) return toast.error("Phone number is required");

    const primaryBilling = vendorAddresses.find((a) => a.is_billing) || vendorAddresses[0];
    const primaryShipping = vendorAddresses.find((a) => a.is_shipping) || vendorAddresses[0];

    const fullBillingAddress = [
      primaryBilling?.street,
      primaryBilling?.city,
      primaryBilling?.state,
      primaryBilling?.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const fullShippingAddress = [
      primaryShipping?.street,
      primaryShipping?.city,
      primaryShipping?.state,
      primaryShipping?.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    setIsSubmitting(true);
    try {
      const codeSeq = Math.floor(1000 + Math.random() * 9000);
      const code = `VEN-${Date.now().toString().slice(-4)}-${codeSeq}`;

      const created = await inventoryApi.createSupplier({
        name: newVendorName.trim(),
        code: code,
        type: newVendorType,
        company_name: newVendorCompany.trim() || newVendorName.trim(),
        phone: newVendorPhone.trim(),
        email: newVendorEmail.trim() || undefined,
        credit_limit: 500000,
        rating: 5.0,
        status: "Active",
        gst_number: newVendorGST.trim().toUpperCase() || undefined,
        products_desc: newVendorGST ? `GSTIN: ${newVendorGST.trim().toUpperCase()}` : undefined,
        address: fullBillingAddress || undefined,
        billing_address: fullBillingAddress || undefined,
        shipping_address: fullShippingAddress || undefined,
        city: primaryBilling?.city || primaryShipping?.city || undefined,
        state: primaryBilling?.state || primaryShipping?.state || "Andhra Pradesh",
        postal_code: primaryBilling?.pincode || primaryShipping?.pincode || undefined,
        addresses: vendorAddresses.map((a, i) => ({
          id: a.id || `addr-${i + 1}`,
          label: a.tag || "Primary",
          street: a.street,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          country: "India",
          is_default_billing: a.is_billing,
          is_default_shipping: a.is_shipping,
        })),
        meta: {
          addresses: vendorAddresses,
        },
      });

      const vendorObj = created.data || created;
      vendorObj.phone = newVendorPhone.trim();
      vendorObj.email = newVendorEmail.trim();
      vendorObj.company_name = newVendorCompany.trim() || newVendorName.trim();
      vendorObj.gst_number = newVendorGST.trim().toUpperCase();
      vendorObj.state = primaryBilling?.state || "Andhra Pradesh";
      vendorObj.billing_address = fullBillingAddress;
      vendorObj.shipping_address = fullShippingAddress;
      vendorObj.addresses = vendorAddresses;

      onVendorCreated(vendorObj);
      toast.success(`Vendor Party "${vendorObj.name}" created and selected!`);
      onClose();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to create vendor party");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full p-6 md:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-slate-900 leading-tight">
                Create New Vendor / Party
              </h3>
              <p className="text-xs text-slate-500">
                Single vendor account with multiple delivery & billing address locations (Warehouse, Factory, Office, Branch).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleCreateVendor} className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── Left Column (5 Cols): Primary Vendor Profile & Tax ── */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="size-3.5 text-blue-600" /> Primary Vendor Identity
                </span>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Party / Vendor Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Metro Wholesale / Tata Supplies"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    required
                    className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={newVendorPhone}
                      onChange={(e) => setNewVendorPhone(e.target.value)}
                      required
                      className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="orders@vendor.com"
                      value={newVendorEmail}
                      onChange={(e) => setNewVendorEmail(e.target.value)}
                      className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Company / Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metro Supplies Ltd"
                      value={newVendorCompany}
                      onChange={(e) => setNewVendorCompany(e.target.value)}
                      className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Vendor Type
                    </label>
                    <select
                      value={newVendorType}
                      onChange={(e) => setNewVendorType(e.target.value)}
                      className="w-full h-9.5 bg-white border border-slate-300 rounded-xl px-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Wholesale Supplier">Wholesale Supplier</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Raw Materials / Service Provider">Raw Materials / Services</option>
                      <option value="Trader">Trader</option>
                      <option value="Import / Export">Import / Export</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* GSTIN Verification Card */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="size-3.5 text-blue-600" /> GSTIN / Tax ID Number
                  </label>
                  <span className="text-[10px] text-slate-500">Auto-populates company</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 37AABCU9603R1ZM"
                    value={newVendorGST}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewVendorGST(val);
                      if (val.length === 15) {
                        handleVerifyGstin(val);
                      }
                    }}
                    maxLength={15}
                    className="flex-1 h-9.5 bg-white border border-slate-300 rounded-xl px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyGstin()}
                    disabled={isVerifyingGst || !newVendorGST.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isVerifyingGst ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    {isVerifyingGst ? "Verifying..." : "⚡ Auto-fill"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column (7 Cols): Multi-Address Book ── */}
            <div className="lg:col-span-7 space-y-3.5">
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-blue-600" /> Multi-Address Book ({vendorAddresses.length})
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Save multiple locations for this vendor (Warehouse, Factory, Office, Branch).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddNewAddressSlot("Warehouse")}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="size-3" /> Add Location
                  </button>
                </div>

                {/* Address Tag Selector Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {vendorAddresses.map((addr, idx) => (
                    <div
                      key={addr.id || idx}
                      onClick={() => setActiveAddrIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                        activeAddrIndex === idx
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>
                        {addr.tag === "Warehouse"
                          ? "🏭"
                          : addr.tag === "Factory"
                          ? "🏗️"
                          : addr.tag === "Office"
                          ? "🏢"
                          : addr.tag === "Branch"
                          ? "🏬"
                          : "📍"}{" "}
                        {addr.tag} #{idx + 1}
                      </span>
                      {vendorAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAddressSlot(idx);
                          }}
                          className={`p-0.5 rounded-full hover:bg-black/20 ${
                            activeAddrIndex === idx
                              ? "text-white"
                              : "text-slate-400 hover:text-rose-600"
                          }`}
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Active Address Form Editor */}
                {vendorAddresses[activeAddrIndex] && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Location Tag:</span>
                        <div className="flex gap-1">
                          {(["Warehouse", "Factory", "Office", "Branch", "Other"] as const).map(
                            (t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  const updated = [...vendorAddresses];
                                  updated[activeAddrIndex].tag = t;
                                  setVendorAddresses(updated);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                  vendorAddresses[activeAddrIndex].tag === t
                                    ? "bg-blue-100 text-blue-700 border-blue-300"
                                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {t === "Warehouse"
                                  ? "🏭 Warehouse"
                                  : t === "Factory"
                                  ? "🏗️ Factory"
                                  : t === "Office"
                                  ? "🏢 Office"
                                  : t === "Branch"
                                  ? "🏬 Branch"
                                  : "📍 Other"}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        Building, Street & Area
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Plot 45, Industrial Area / Main Street"
                        value={vendorAddresses[activeAddrIndex].street}
                        onChange={(e) => {
                          const updated = [...vendorAddresses];
                          updated[activeAddrIndex].street = e.target.value;
                          setVendorAddresses(updated);
                        }}
                        className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          City / Town
                        </label>
                        <input
                          type="text"
                          placeholder="City"
                          value={vendorAddresses[activeAddrIndex].city}
                          onChange={(e) => {
                            const updated = [...vendorAddresses];
                            updated[activeAddrIndex].city = e.target.value;
                            setVendorAddresses(updated);
                          }}
                          className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          State / UT (GST)
                        </label>
                        <select
                          value={vendorAddresses[activeAddrIndex].state}
                          onChange={(e) => {
                            const updated = [...vendorAddresses];
                            updated[activeAddrIndex].state = e.target.value;
                            setVendorAddresses(updated);
                          }}
                          className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-1.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st.code} value={st.name}>
                              {st.code} - {st.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          PIN Code{" "}
                          {isLookingUpPincode && (
                            <span className="text-blue-600 animate-pulse text-[10px]">
                              Detecting...
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 516360"
                          maxLength={6}
                          value={vendorAddresses[activeAddrIndex].pincode}
                          onChange={(e) => handleActiveAddrPincodeChange(e.target.value)}
                          className="w-full h-8.5 bg-slate-50 border border-slate-300 rounded-lg px-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendorAddresses[activeAddrIndex].is_billing}
                          onChange={(e) => {
                            const updated = [...vendorAddresses];
                            updated[activeAddrIndex].is_billing = e.target.checked;
                            setVendorAddresses(updated);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Default Billing Address</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vendorAddresses[activeAddrIndex].is_shipping}
                          onChange={(e) => {
                            const updated = [...vendorAddresses];
                            updated[activeAddrIndex].is_shipping = e.target.checked;
                            setVendorAddresses(updated);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Default Supply / Dispatch</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Footer Actions */}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              Total {vendorAddresses.length} address location(s) configured.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" />
                {isSubmitting ? "Creating Vendor..." : "Create & Select Vendor"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
