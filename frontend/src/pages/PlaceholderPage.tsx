import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';

export function PlaceholderPage({ title, breadcrumb }: { title: string; breadcrumb: string[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} breadcrumb={breadcrumb} />
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
          <Icon name="sparkles" size={28} className="text-navy-300" />
        </div>
        <h3 className="text-base font-semibold text-navy-900">{title}</h3>
        <p className="text-sm text-navy-500 mt-1 max-w-sm">This module is part of the FIT CLUB AI platform. Full functionality will be available here.</p>
      </div>
    </div>
  );
}
