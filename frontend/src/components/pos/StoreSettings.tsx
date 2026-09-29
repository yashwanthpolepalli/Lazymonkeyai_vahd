import { Settings } from "lucide-react";

export function StoreSettings() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="size-6 text-primary" /> Store Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure tax inclusion rules, multi-currency, and terminal hardware logic.
          </p>
        </div>
      </div>
    </div>
  );
}
