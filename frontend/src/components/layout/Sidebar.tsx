import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { getNavItems } from '@/config/navigation';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => (user ? getNavItems(user.role, user.permissions) : []));

  useEffect(() => {
    const updateItems = () => {
      if (user) setItems(getNavItems(user.role, user.permissions));
    };
    updateItems();
    window.addEventListener('vahd_modules_changed', updateItems);
    window.addEventListener('storage', updateItems);
    return () => {
      window.removeEventListener('vahd_modules_changed', updateItems);
      window.removeEventListener('storage', updateItems);
    };
  }, [user]);

  const mainNavItems = items.filter(
    (i) =>
      i.path !== '/ho/settings' &&
      i.path !== '/owner/settings' &&
      i.path !== '/super-admin/settings'
  );
  const settingsItem = items.find(
    (i) =>
      i.path === '/ho/settings' ||
      i.path === '/owner/settings' ||
      i.path === '/super-admin/settings'
  );

  return (
    <aside className="w-60 lg:w-64 shrink-0 hidden md:flex flex-col bg-white border-r border-slate-200/80 sticky top-16 h-[calc(100vh-64px)] z-30 select-none shadow-2xs">
      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 no-scrollbar">
        {/* Main Section Header */}
        <div>
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Platform Menu
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
          </div>

          <nav className="space-y-1.5">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={
                  item.path === '/owner' ||
                  item.path === '/ho' ||
                  item.path === '/employee' ||
                  item.path === '/app' ||
                  item.path === '/super-admin'
                }
                className={({ isActive }) =>
                  cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all duration-150 font-bold group',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200/70'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        name={item.icon}
                        size={16}
                        className={cn(
                          'shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-2xs" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Preferences / System Section */}
        {settingsItem && (
          <div>
            <div className="px-3 pt-2 pb-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Preferences
              </span>
            </div>
            <NavLink
              to={settingsItem.path}
              className={({ isActive }) =>
                cn(
                  'w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all duration-150 font-bold group',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200/70'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      name={settingsItem.icon}
                      size={16}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'
                      )}
                    />
                    <span className="truncate">{settingsItem.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-2xs" />
                  )}
                </>
              )}
            </NavLink>
          </div>
        )}
      </div>

      {/* Footer Info / Live Biometric Status Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 m-3 rounded-2xl space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/90 border border-purple-200/60 px-2 py-0.5 rounded-full">
            HEAD OFFICE PORTAL
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Live
          </span>
        </div>
        <p className="text-xs font-black text-slate-900 truncate">
          {user?.name || 'Head Office Admin'}
        </p>
        <p className="text-[10px] text-slate-400 font-medium truncate">
          {user?.email || 'ho@vahd.com'}
        </p>
      </div>
    </aside>
  );
}
