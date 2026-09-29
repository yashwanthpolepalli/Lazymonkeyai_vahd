import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LineChart, BarChart, DonutChart } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface ReportsData {
  summary: {
    totalRevenue: number;
    revenueTrend: string;
    totalMembers: number;
    membersTrend: string;
    activeMembers: number;
    activeTrend: string;
    newCustomers: number;
    newCustomersTrend: string;
    avgCheckinsPerDay: number;
    checkinsTrend: string;
  };
  revenueOverview: {
    labels: string[];
    data: number[];
    total: number;
    trend: string;
  };
  revenueBySource: {
    memberships: number;
    pt: number;
    pos: number;
    others: number;
    total: number;
  };
  monthlyNewCustomers: {
    labels: string[];
    data: number[];
  };
  topMembershipPlans: Array<{
    plan: string;
    totalSold: number;
    revenue: number;
  }>;
  attendanceSummary: {
    totalCheckins: number;
    totalMembers: number;
    avgCheckinsPerMember: number;
    presentPercent: number;
    absentPercent: number;
    missedPercent: number;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    customer: string;
    type: string;
    amount: number;
    status: string;
  }>;
}

export function ReportsPage({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('This Year');

  useEffect(() => {
    // Fetch reports analytics payload dynamically from API
    api.dashboard.getReportsAnalytics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load reports analytics:", err);
        setLoading(false);
      });
  }, []);

  const tabs = [
    'Overview',
    'Revenue',
    'Members',
    'Attendance',
    'Trainers',
    'Workouts',
    'Nutrition',
    'Sales (POS)',
    'Custom Reports',
  ];

  // Pure Dynamic API Bindings (Zero Hardcoded Multipliers or Static Values)
  const totalRev = data?.summary?.totalRevenue ?? 0;
  const revenueTrend = data?.summary?.revenueTrend ?? '+0.0%';
  const totalMembers = data?.summary?.totalMembers ?? 0;
  const membersTrend = data?.summary?.membersTrend ?? '+0.0%';
  const activeMembers = data?.summary?.activeMembers ?? 0;
  const activeTrend = data?.summary?.activeTrend ?? '+0.0%';
  const newCustomers = data?.summary?.newCustomers ?? 0;
  const newCustomersTrend = data?.summary?.newCustomersTrend ?? '+0.0%';
  const avgCheckinsDay = data?.summary?.avgCheckinsPerDay ?? 0;
  const checkinsTrend = data?.summary?.checkinsTrend ?? '+0.0%';

  const revBySource = data?.revenueBySource ?? {
    memberships: 0,
    pt: 0,
    pos: 0,
    others: 0,
    total: 0,
  };

  const topPlans = data?.topMembershipPlans || [];
  const recentTxs = data?.recentTransactions || [];

  const chartLabels = data?.revenueOverview?.labels || [];
  const revenueChartData = data?.revenueOverview?.data || [];
  const newCustomersChartData = data?.monthlyNewCustomers?.data || [];

  const presentPercent = data?.attendanceSummary?.presentPercent ?? 0.0;
  const absentPercent = data?.attendanceSummary?.absentPercent ?? 0.0;
  const missedPercent = data?.attendanceSummary?.missedPercent ?? 0.0;
  const totalCheckins = data?.attendanceSummary?.totalCheckins ?? 0;
  const avgCheckinsPerMember = data?.attendanceSummary?.avgCheckinsPerMember ?? 0;

  const donutSegments = [
    { label: 'Membership', value: revBySource.memberships, color: '#2563eb' },
    { label: 'Personal Training', value: revBySource.pt, color: '#10b981' },
    { label: 'POS (Products)', value: revBySource.pos, color: '#f59e0b' },
    { label: 'Others', value: revBySource.others, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================ */}
      {/* 1. TOP HEADER SECTION */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reports</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Track performance, revenue, members and gym growth.
          </p>
        </div>

        {/* Header Controls: Date Picker, Filters, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 cursor-pointer hover:border-slate-300 transition-all">
            <Icon name="calendar" size={14} className="text-slate-400" />
            <span>01 Mar 2025 - 28 Aug 2025</span>
            <Icon name="chevron-down" size={12} className="text-slate-400" />
          </div>

          <button className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all">
            <Icon name="sliders" size={14} className="text-slate-500" />
            <span>Filters</span>
          </button>

          <button className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all">
            <Icon name="download" size={14} className="text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TOP SUMMARY CARDS (5 METRIC CARDS WITH DYNAMIC SPARK LINES) */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="indian-rupee" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">₹{totalRev.toLocaleString('en-IN')}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>↑ {revenueTrend}</span>
                <span className="text-slate-400 font-medium">vs previous period</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Members */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">Total Members</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="users" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">{totalMembers.toLocaleString('en-IN')}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>↑ {membersTrend}</span>
                <span className="text-slate-400 font-medium">vs previous period</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Members */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">Active Members</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="user-check" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">{activeMembers.toLocaleString('en-IN')}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>↑ {activeTrend}</span>
                <span className="text-slate-400 font-medium">vs previous period</span>
              </div>
            </div>
          </div>

          {/* Card 4: New Customers */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">New Customers</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Icon name="user-plus" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">{newCustomers.toLocaleString('en-IN')}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>↑ {newCustomersTrend}</span>
                <span className="text-slate-400 font-medium">vs previous period</span>
              </div>
            </div>
          </div>

          {/* Card 5: Avg. Check-ins / Day */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider">Avg. Check-ins / Day</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Icon name="calendar-check" size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900">{avgCheckinsDay}</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span>↑ {checkinsTrend}</span>
                <span className="text-slate-400 font-medium">vs previous period</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. NAVIGATION TAB BAR */}
      {/* ============================================================ */}
      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-3 text-xs font-bold transition-all border-b-2 relative',
                activeTab === tab
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MIDDLE ANALYTICS GRID (REVENUE OVERVIEW, SOURCE & CUSTOMERS) */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-1" />
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-1" />
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-1" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Overview (Area Gradient Chart) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-extrabold text-slate-900">Revenue Overview</h3>
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="This Year">This Year</option>
                  <option value="This Quarter">This Quarter</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-2xl font-black text-slate-900">₹{totalRev.toLocaleString('en-IN')}</span>
                <span className="text-xs font-bold text-emerald-600">↑ {revenueTrend} <span className="text-slate-400 font-normal">vs previous period</span></span>
              </div>
            </div>
            <LineChart data={revenueChartData} labels={chartLabels} height={200} color="#2563eb" />
          </div>

          {/* Revenue by Source (Donut Chart & Legend) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 mb-2">Revenue by Source</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto">
              <div className="shrink-0">
                <DonutChart
                  segments={donutSegments}
                  size={150}
                  centerLabel={`₹${totalRev >= 100000 ? (totalRev / 100000).toFixed(1) + 'L' : totalRev.toLocaleString('en-IN')}`}
                  centerSublabel="Total"
                />
              </div>
              <div className="space-y-3 w-full max-w-[180px]">
                {donutSegments.map((seg) => {
                  const pct = totalRev > 0 ? ((seg.value / totalRev) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={seg.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                        <span className="text-slate-600 font-semibold truncate">{seg.label}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 block">₹{seg.value.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly New Customers (Bar Chart) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-900">Monthly New Customers</h3>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option value="This Year">This Year</option>
                <option value="Last Year">Last Year</option>
              </select>
            </div>
            <BarChart data={newCustomersChartData} labels={chartLabels} height={200} color="#8b5cf6" />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. BOTTOM BREAKDOWN SECTION (PLANS, ATTENDANCE & TRANSACTIONS) */}
      {/* ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-1" />
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-1" />
          <Skeleton className="h-72 w-full rounded-2xl lg:col-span-1" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Top Membership Plans Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">Top Membership Plans</h3>
                <button className="text-xs font-bold text-brand-600 hover:underline">View All</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Plan</th>
                      <th className="pb-2 text-center">Total Sold</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {topPlans.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 font-medium text-xs">No plan data available</td>
                      </tr>
                    ) : (
                      topPlans.map((p, idx) => {
                        const icons = ['crown', 'shield', 'check-circle', 'star'];
                        const colors = ['text-amber-500 bg-amber-50', 'text-brand-600 bg-brand-50', 'text-emerald-600 bg-emerald-50', 'text-purple-600 bg-purple-50'];
                        return (
                          <tr key={p.plan || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 flex items-center gap-2">
                              <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0', colors[idx % colors.length])}>
                                <Icon name={icons[idx % icons.length]} size={13} />
                              </div>
                              <span className="font-extrabold text-slate-900 truncate max-w-[120px]">{p.plan}</span>
                            </td>
                            <td className="py-2.5 text-center font-bold text-slate-700">{p.totalSold}</td>
                            <td className="py-2.5 text-right font-black text-slate-900">₹{p.revenue.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 2: Attendance Summary Gauge Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-slate-900">Attendance Summary</h3>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
              <div className="shrink-0 relative">
                <DonutChart
                  segments={[
                    { label: 'Present', value: presentPercent, color: '#2563eb' },
                    { label: 'Absent', value: absentPercent, color: '#f59e0b' },
                    { label: 'Missed', value: missedPercent, color: '#ef4444' },
                  ]}
                  size={130}
                  centerLabel={`${presentPercent}%`}
                  centerSublabel="Avg. Attendance"
                />
              </div>

              <div className="space-y-3 w-full text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Total Check-ins</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-base font-black text-slate-900">{totalCheckins.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] font-bold text-emerald-600">↑ {checkinsTrend}</span>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-semibold">Total Members</span>
                  <span className="font-extrabold text-slate-900">{totalMembers}</span>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-semibold">Avg. Check-ins / Member</span>
                  <span className="font-extrabold text-slate-900">{avgCheckinsPerMember}</span>
                </div>
              </div>
            </div>

            {/* Attendance Status Dots Legend */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Present {presentPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Absent {absentPercent}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Missed {missedPercent}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Transactions Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">Recent Transactions</h3>
                <button className="text-xs font-bold text-brand-600 hover:underline">View All</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {recentTxs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400 font-medium text-xs">No recent transactions</td>
                      </tr>
                    ) : (
                      recentTxs.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 text-[11px] text-slate-500">{tx.date}</td>
                          <td className="py-2 font-extrabold text-slate-900 truncate max-w-[90px]">{tx.customer}</td>
                          <td className="py-2 text-slate-500">{tx.type}</td>
                          <td className="py-2 text-right font-extrabold text-slate-900">₹{tx.amount.toLocaleString('en-IN')}</td>
                          <td className="py-2 text-right">
                            <span
                              className={cn(
                                'text-[10px] font-extrabold px-2 py-0.5 rounded-md',
                                tx.status === 'Paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              )}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
