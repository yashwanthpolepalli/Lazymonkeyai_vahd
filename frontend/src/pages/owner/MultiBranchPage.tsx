import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { BarChart } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/Skeleton';
import { api, apiClient } from '@/services/api';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

export function MultiBranchPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [_members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Branch Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchBranchesData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get<any[]>('/gym/branches').catch(() => []),
      api.customers.list().catch(() => []),
    ]).then(([bList, mList]) => {
      if (Array.isArray(bList) && bList.length > 0) {
        setBranches(bList.map((b: any) => ({
          name: b.branch_name || b.name || '',
          city: b.city || '',
          address: b.address || '',
          members: Number(b.active_members ?? b.total_members ?? b.members) || 0,
          revenue: b.revenue ? `₹${(Number(b.revenue) / 100000).toFixed(1)}L` : '₹0.0L',
          revenueVal: Number(b.revenue) || 0,
          trainers: Number(b.total_trainers ?? b.trainers) || 0,
          status: b.is_active !== undefined ? (b.is_active ? 'active' : 'inactive') : (String(b.status || 'active').toLowerCase().includes('inactive') ? 'inactive' : 'active'),
        })));
      } else {
        setBranches([]);
      }
      setMembers(mList || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchBranchesData();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setError('Branch Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiClient.post('/gym/branches', {
        branch_name: branchName.trim(),
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      });

      // Reset and close
      setBranchName('');
      setCity('');
      setAddress('');
      setIsAddModalOpen(false);

      // Refresh list
      fetchBranchesData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create branch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMembers = branches.reduce((s, b) => s + (b.members || 0), 0);
  const totalRevenueVal = branches.reduce((s, b) => s + (b.revenueVal || 0), 0);
  const totalTrainers = branches.reduce((s, b) => s + (b.trainers || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Branch"
        breadcrumb={['Owner', 'Multi-Branch']}
        actions={
          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl"
          >
            <Icon name="plus" size={16} /> Add Branch
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Total Branches</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Icon name="git-branch" size={16} className="text-brand-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">{branches.length}</div>
          <div className="text-xs text-success-600 font-semibold mt-1">Live Database</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Total Members</span>
            <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
              <Icon name="users" size={16} className="text-success-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">{totalMembers.toLocaleString()}</div>
          <div className="text-xs text-success-600 font-semibold mt-1">Total active members</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
              <Icon name="indian-rupee" size={16} className="text-warning-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">₹{(totalRevenueVal / 100000).toFixed(2)}L</div>
          <div className="text-xs text-success-600 font-semibold mt-1">Branch revenue</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Total Trainers</span>
            <div className="w-8 h-8 rounded-lg bg-ai-50 flex items-center justify-center">
              <Icon name="user-cog" size={16} className="text-ai-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy-900">{totalTrainers}</div>
          <div className="text-xs text-navy-400 mt-1">across all branches</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {branches.map((b, i) => (
          <div key={b.name + i} className="card card-hover p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold', ['from-brand-400 to-brand-600', 'from-success-400 to-success-600', 'from-warning-400 to-warning-600'][i % 3])}>
                <Icon name="building-2" size={22} />
              </div>
              <div>
                <div className="text-sm font-bold text-navy-900">{b.name}</div>
                {b.city && <div className="text-xs text-slate-400">{b.city}</div>}
                <Badge variant="success" dot className="mt-1">{b.status}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-navy-50">
                <div className="text-lg font-bold text-navy-900">{(b.members || 0).toLocaleString()}</div>
                <div className="text-xs text-navy-400">Members</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-50">
                <div className="text-lg font-bold text-navy-900">{b.revenue}</div>
                <div className="text-xs text-navy-400">Revenue</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-50">
                <div className="text-lg font-bold text-navy-900">{b.trainers || 0}</div>
                <div className="text-xs text-navy-400">Trainers</div>
              </div>
              <div className="p-3 rounded-xl bg-navy-50">
                <div className="text-lg font-bold text-navy-900">Active</div>
                <div className="text-xs text-navy-400">Status</div>
              </div>
            </div>
            <button className="btn-secondary w-full mt-4 text-xs py-2">View Branch Details</button>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Branch Comparison</h3>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <BarChart data={branches.map((b) => b.members)} labels={branches.map((b) => b.name)} height={200} color="#2563eb" highlightLast={false} />
        )}
      </div>

      {/* Add Branch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Icon name="building-2" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Gym Branch</h3>
                  <p className="text-xs text-slate-500">Expand your gym platform footprint</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <Icon name="alert-triangle" size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter branch name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  placeholder="Enter city or location"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Address (Optional)
                </label>
                <textarea
                  placeholder="Enter full street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
