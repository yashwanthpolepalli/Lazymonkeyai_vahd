import { CreditCard } from "lucide-react";

export function PaymentMethods() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" /> Payment Methods
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure Cash, UPI, Credit Card gateways and Split Payment handling.
          </p>
        </div>
      </div>
    </div>
  );
}
