import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { BarChart } from '@/components/ui/Charts';

export function TrainerProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" breadcrumb={['Trainer', 'Profile']} actions={<button className="btn-primary"><Icon name="edit" size={16} /> Edit Profile</button>} />

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-success-500 to-success-700 flex items-center justify-center text-white text-3xl font-bold shrink-0">M</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2"><h2 className="text-xl font-bold text-navy-900">Coach Meera</h2><Badge variant="success" dot>Active</Badge></div>
            <div className="text-sm text-navy-500 mb-4">Weight Loss & Nutrition Specialist · Fit Club Elite Indiranagar</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><div className="stat-label">Customers</div><div className="text-lg font-bold text-navy-900">15</div></div>
              <div><div className="stat-label">Rating</div><div className="text-lg font-bold text-navy-900 flex items-center gap-1"><Icon name="star" size={14} className="text-warning-500" />4.8</div></div>
              <div><div className="stat-label">Experience</div><div className="text-lg font-bold text-navy-900">7 yrs</div></div>
              <div><div className="stat-label">Revenue</div><div className="text-lg font-bold text-navy-900">₹98K</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Specializations</h3>
          <div className="flex flex-wrap gap-2">
            {['Weight Loss', 'Nutrition Planning', 'Strength Training', 'Functional Fitness', 'Body Composition', 'Post-Rehab', 'Group Training'].map((s) => (
              <Badge key={s} variant="brand">{s}</Badge>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Certifications</h3>
          <div className="space-y-2">
            {[
              { name: 'ACE Certified Personal Trainer', year: '2019' },
              { name: 'Precision Nutrition Level 2', year: '2021' },
              { name: 'NASM Corrective Exercise Specialist', year: '2022' },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl bg-navy-50">
                <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center"><Icon name="award" size={16} className="text-success-600" /></div>
                <div className="flex-1"><div className="text-sm font-semibold text-navy-900">{c.name}</div><div className="text-xs text-navy-400">Certified {c.year}</div></div>
                <Icon name="check-circle" size={16} className="text-success-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Monthly Performance</h3>
        <BarChart data={[28, 32, 35, 38, 42, 45]} labels={['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']} height={200} color="#059669" />
      </div>
    </div>
  );
}
