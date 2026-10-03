import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { getNavItems } from '@/config/navigation';
import { cn } from '@/utils/cn';
import { playNotificationBeep, getStoredLeads, LiveLeadNotification } from '@/utils/audioAlert';
import { apiClient } from '@/services/apiClient';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [items, setItems] = useState(() => (user ? getNavItems(user.role) : []));
  const [liveLeads, setLiveLeads] = useState<LiveLeadNotification[]>(() => getStoredLeads());
  const [toastAlert, setToastAlert] = useState<LiveLeadNotification | null>(null);

  useEffect(() => {
    const updateItems = () => {
      if (user) setItems(getNavItems(user.role));
    };
    updateItems();
    window.addEventListener('fitclub_modules_changed', updateItems);
    window.addEventListener('storage', updateItems);
    return () => {
      window.removeEventListener('fitclub_modules_changed', updateItems);
      window.removeEventListener('storage', updateItems);
    };
  }, [user]);

  // Real-time Lead Notification & Audio Beep Listener for Super Admin / Gym Owners
  useEffect(() => {
    const handleNewLeadEvent = (e: any) => {
      const lead = e.detail as LiveLeadNotification;
      if (lead) {
        setLiveLeads((prev) => [lead, ...prev.filter((l) => l.id !== lead.id)].slice(0, 30));
        setToastAlert(lead);
        playNotificationBeep('alert');
        setTimeout(() => {
          setToastAlert((curr) => (curr?.id === lead.id ? null : curr));
        }, 8000);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'FITCLUB_LATEST_LEAD_PING' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.lead) {
            setLiveLeads((prev) => [parsed.lead, ...prev.filter((l) => l.id !== parsed.lead.id)].slice(0, 30));
            setToastAlert(parsed.lead);
            playNotificationBeep('alert');
            setTimeout(() => {
              setToastAlert((curr) => (curr?.id === parsed.lead.id ? null : curr));
            }, 8000);
          }
        } catch (err) {}
      }
    };

    // Polling fallback from backend API for live notifications
    const pollBackendLive = async () => {
      try {
        const live = await apiClient.get<any[]>('/system/notifications/live').catch(() => []);
        if (Array.isArray(live) && live.length > 0) {
          const leadsFromDb: LiveLeadNotification[] = live.map((n: any) => ({
            id: n.id,
            name: n.title,
            phone: n.body,
            timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
            read: !n.unread,
          }));
          setLiveLeads((prev) => {
            const merged = [...leadsFromDb, ...prev];
            const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
            return unique.slice(0, 30);
          });
        }
      } catch (e) {}
    };

    window.addEventListener('fitclub:new_lead', handleNewLeadEvent);
    window.addEventListener('storage', handleStorageChange);
    const pollInterval = setInterval(pollBackendLive, 15000);

    return () => {
      window.removeEventListener('fitclub:new_lead', handleNewLeadEvent);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabelMap: Record<string, string> = {
    super_admin: 'Super Admin',
    owner: 'Owner',
    employee: 'Employee',
    trainer: 'Employee',
    student: 'Student',
    customer: 'Student',
  };
  const roleLabel = roleLabelMap[user?.role || 'owner'] || 'Owner';

  const unreadLeadCount = liveLeads.filter((l) => !l.read).length;
  const totalNotifBadge = 12 + unreadLeadCount;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      {/* Real-time Super Admin Sound Alert Toast */}
      {toastAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full bg-slate-950 text-white rounded-3xl p-4 shadow-2xl border-2 border-orange-500 animate-in slide-in-from-top-4 duration-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black shrink-0 animate-pulse shadow-lg shadow-orange-500/40">
              🔔
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                  🔥 NEW LEAD ALERT
                </span>
                <span className="text-[10px] text-slate-400 font-bold">{toastAlert.timestamp}</span>
              </div>
              <p className="text-sm font-black text-white">{toastAlert.name}</p>
              <p className="text-xs font-semibold text-slate-300">
                Gym: <strong>{toastAlert.gymName || 'Gym Lead'}</strong> • Plan: <span className="text-orange-400">{toastAlert.plan || 'Free Trial'}</span>
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-2 pt-0.5">
                <span>📞 {toastAlert.phone}</span>
                {toastAlert.notes && <span className="text-slate-500">({toastAlert.notes})</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => setToastAlert(null)}
            className="p-1 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Row */}
      <div className="h-16 flex items-center justify-between px-2.5 sm:px-3.5 lg:px-4 gap-4 border-b border-slate-100">
        {/* Left: Brand Logo & Gym Location Selector */}
        <div className="flex items-center gap-4 min-w-0">
          <Logo size="sm" />

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors">
            <Icon name="map-pin" size={14} className="text-purple-600" />
            <span className="truncate max-w-[180px]">
              {user?.gymName && user?.branchName
                ? `${user.gymName} - ${user.branchName}`
                : user?.gymName || user?.branchName || 'Main Branch'}
            </span>
            <Icon name="chevron-down" size={12} className="text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Icon
              name="search"
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search members, invoices, reports..."
              className="w-full pl-9 pr-12 py-2 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-400 shadow-2xs">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowProfile(false);
              }}
              className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Icon name="bell" size={19} />
              <span className="absolute top-1 right-1 px-1 min-w-[18px] h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                {totalNotifBadge}
              </span>
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-12 w-88 bg-white rounded-3xl p-4 space-y-3 animate-slide-up z-50 shadow-2xl border border-slate-100 max-h-[500px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-900 uppercase">Notifications & Live Leads</span>
                  <Badge variant="brand">{totalNotifBadge} total</Badge>
                </div>

                {/* Real-time incoming leads stream */}
                {liveLeads.length > 0 && (
                  <div className="space-y-1.5 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider">
                      🔥 Landing Page Leads ({liveLeads.length})
                    </span>
                    {liveLeads.slice(0, 5).map((lead) => (
                      <div
                        key={lead.id}
                        className="p-2.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">{lead.name}</span>
                          <span className="text-[10px] text-orange-700 font-bold">{lead.timestamp}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700">
                          {lead.gymName || 'Gym Lead'} • <span className="text-orange-600">{lead.plan || 'Free Trial'}</span>
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                          <span>📞 {lead.phone}</span>
                          <a href={`tel:${lead.phone}`} className="text-emerald-600 font-bold hover:underline">
                            Call Now
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {[
                  {
                    icon: 'alert-triangle',
                    title: 'High churn risk',
                    desc: '3 members need attention',
                    time: '5m ago',
                    color: 'text-rose-600 bg-rose-50',
                  },
                  {
                    icon: 'clock',
                    title: 'Membership expiring',
                    desc: '2 memberships expire this week',
                    time: '1h ago',
                    color: 'text-amber-600 bg-amber-50',
                  },
                  {
                    icon: 'indian-rupee',
                    title: 'Payment received',
                    desc: '₹18,000 from Vikram Singh',
                    time: '2h ago',
                    color: 'text-emerald-600 bg-emerald-50',
                  },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', n.color)}>
                      <Icon name={n.icon} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">{n.title}</div>
                      <div className="text-[11px] font-medium text-slate-500">{n.desc}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {user?.avatar || localStorage.getItem('fitclub_owner_avatar') ? (
                <img
                  src={user?.avatar || localStorage.getItem('fitclub_owner_avatar') || ''}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-purple-200/80 shadow-2xs uppercase">
                  {(user?.name || 'Owner')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'O'}
                </div>
              )}
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-extrabold text-slate-900">{user?.name || 'User'}</span>
                <span className="text-[10px] font-medium text-slate-400">{roleLabel}</span>
              </div>
              <Icon name="chevron-down" size={14} className="text-slate-400 hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl p-2 animate-slide-up z-50 shadow-xl border border-slate-100">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="text-xs font-extrabold text-slate-900">{user?.name || 'Yashwanth'}</div>
                  <div className="text-[11px] text-slate-400">{user?.email || 'owner@fitclub.ai'}</div>
                </div>
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate(user?.role === 'customer' ? '/app/profile' : `/${user?.role || 'owner'}/settings`);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  <Icon name="user" size={14} />
                  <span>Profile & Account</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate(`/${user?.role || 'owner'}/settings`);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  <Icon name="settings" size={14} />
                  <span>Settings</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2"
                >
                  <Icon name="log-out" size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Pill Navigation Bar (Layout Matching Image 2) */}
      <div className="w-full overflow-x-auto py-2 px-2.5 sm:px-3.5 lg:px-4 no-scrollbar bg-slate-50/40 border-t border-slate-100/80">
        <div className="flex items-center gap-2 min-w-max">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={
                item.path === '/owner' ||
                item.path === '/trainer' ||
                item.path === '/app' ||
                item.path === '/super-admin'
              }
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 transition-all duration-150 select-none shadow-2xs',
                  isActive
                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-extrabold shadow-xs ring-1 ring-purple-300/50'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:text-slate-950 font-bold hover:border-slate-300'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    size={15}
                    className={cn('shrink-0', isActive ? 'text-purple-700' : 'text-slate-500')}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
