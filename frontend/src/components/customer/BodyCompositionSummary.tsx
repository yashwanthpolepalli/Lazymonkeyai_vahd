import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { CustomerBodyScanMetrics } from '@/types/customer';

export function BodyCompositionSummary({ scan }: { scan?: CustomerBodyScanMetrics | null }) {
  const navigate = useNavigate();

  if (!scan || !scan.has_scan) {
    return (
      <div className="card p-5 space-y-3 border border-navy-200 text-center">
        <div className="w-10 h-10 rounded-2xl bg-navy-100 flex items-center justify-center mx-auto">
          <Icon name="ruler" size={20} className="text-navy-400" />
        </div>
        <h3 className="text-base font-bold text-navy-900">Latest Body Scan</h3>
        <p className="text-xs text-navy-500 max-w-sm mx-auto">
          {scan?.message || 'No body composition scan recorded yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4 border border-navy-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-warning-50 flex items-center justify-center">
            <Icon name="ruler" size={18} className="text-warning-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900">Latest Body Scan</h3>
            <p className="text-xs text-navy-400">{scan.scan_date || 'Recent'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">Weight</div>
          <div className="text-base font-bold text-navy-900 mt-0.5">{scan.weight_kg ?? '—'} kg</div>
        </div>
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">Body Fat</div>
          <div className="text-base font-bold text-brand-600 mt-0.5">{scan.body_fat_pct ?? '—'}%</div>
        </div>
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">BMI</div>
          <div className="text-base font-bold text-navy-900 mt-0.5">{scan.bmi ?? '—'}</div>
        </div>
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">Muscle Mass</div>
          <div className="text-base font-bold text-success-600 mt-0.5">{scan.skeletal_muscle_mass_kg ?? '—'} kg</div>
        </div>
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">Body Water</div>
          <div className="text-base font-bold text-navy-900 mt-0.5">{scan.body_water_pct ?? '—'}%</div>
        </div>
        <div className="p-3 rounded-xl bg-navy-50">
          <div className="text-[11px] text-navy-500 font-medium">Visceral Fat</div>
          <div className="text-base font-bold text-navy-900 mt-0.5">Level {scan.visceral_fat_level ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}
