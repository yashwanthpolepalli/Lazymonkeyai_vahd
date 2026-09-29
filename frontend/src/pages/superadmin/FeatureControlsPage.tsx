import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

const plans = ['Starter', 'Pro', 'Business', 'Enterprise'] as const;

export function FeatureControlsPage() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.superAdmin.featureControls()
      .then((data) => {
        setMatrix(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (feature: string, plan: string) => {
    setMatrix((prev) => ({
      ...prev,
      [feature]: {
        ...(prev[feature] || {}),
        [plan]: !(prev[feature]?.[plan] ?? false),
      },
    }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await api.superAdmin.saveFeatureControls(matrix);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (_err) {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const featureList = Object.keys(matrix);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Control Matrix"
        breadcrumb={['Super Admin', 'Feature Controls']}
        actions={
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Icon name={savedSuccess ? 'check-circle' : 'check'} size={16} />
            <span>{saving ? 'Saving...' : savedSuccess ? 'Saved to PostgreSQL DB!' : 'Save Changes'}</span>
          </button>
        }
      />

      <div className="card p-4 overflow-x-auto">
        {loading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : (
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-navy-100">
                <th className="text-left text-xs font-semibold text-navy-400 uppercase tracking-wider px-3 py-3">Feature</th>
                {plans.map((p) => (
                  <th key={p} className="text-center text-xs font-semibold text-navy-400 uppercase tracking-wider px-3 py-3">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureList.map((f) => (
                <tr key={f} className="border-b border-navy-50 hover:bg-navy-50 transition-colors">
                  <td className="px-3 py-3 text-sm font-semibold text-navy-900">{f}</td>
                  {plans.map((p) => {
                    const isEnabled = matrix[f]?.[p] ?? false;
                    return (
                      <td key={p} className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(f, p)}
                          aria-label={`Toggle ${f} for ${p}`}
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                            isEnabled ? 'bg-brand-600' : 'bg-slate-200'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-navy-900 mb-3">Plan Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const count = featureList.filter((f) => matrix[f]?.[p]).length;
            return (
              <div key={p} className="p-4 rounded-2xl bg-navy-50">
                <div className="text-sm font-bold text-navy-900">{p}</div>
                <div className="text-2xl font-bold text-brand-600 mt-1">{count}</div>
                <div className="text-xs text-navy-400">features enabled</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
