import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { getNavItems } from '@/config/navigation';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => (user ? getNavItems(user.role, user.permissions) : []));
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('vahd_sidebar_collapsed') === 'true';
  });

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

  // Synchronize collapse state with custom events and keyboard shortcut
  useEffect(() => {
    const handleToggle = (e: any) => {
      if (e?.detail?.collapsed !== undefined) {
        setCollapsed(e.detail.collapsed);
      } else {
        setCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('vahd_sidebar_collapsed', String(next));
          return next;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        setCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('vahd_sidebar_collapsed', String(next));
          return next;
        });
      }
    };

    window.addEventListener('vahd:toggle_sidebar', handleToggle);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('vahd:toggle_sidebar', handleToggle);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('vahd_sidebar_collapsed', String(next));
      window.dispatchEvent(new CustomEvent('vahd:sidebar_change', { detail: { collapsed: next } }));
      return next;
    });
  };

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

  const userInitials = (user?.name || 'HO')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        'shrink-0 hidden md:flex flex-col bg-white border-r border-slate-200/80 sticky top-16 h-[calc(100vh-64px)] z-30 select-none shadow-2xs transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-60 lg:w-64'
      )}
    >
      {/* Top Sidebar Header / Collapse Action */}
      <div className={cn('p-3 flex items-center border-b border-slate-100', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Navigation
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar (Ctrl+[)' : 'Collapse sidebar (Ctrl+[)'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>
      </div>

      {/* Navigation Section */}
      <div className={cn('flex-1 overflow-y-auto no-scrollbar space-y-4', collapsed ? 'p-2' : 'p-3.5')}>
        {/* Main Section Header */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Platform Menu
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
            </div>
          )}

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
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'w-full rounded-xl text-xs flex items-center transition-all duration-150 font-bold group',
                    collapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200/70'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn('flex items-center gap-2.5', collapsed ? 'justify-center' : 'truncate')}>
                      <Icon
                        name={item.icon}
                        size={17}
                        className={cn(
                          'shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {isActive && !collapsed && (
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
            {!collapsed ? (
              <div className="px-3 pt-2 pb-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Preferences
                </span>
              </div>
            ) : (
              <div className="border-t border-slate-100 my-2" />
            )}
            <NavLink
              to={settingsItem.path}
              title={collapsed ? settingsItem.label : undefined}
              className={({ isActive }) =>
                cn(
                  'w-full rounded-xl text-xs flex items-center transition-all duration-150 font-bold group',
                  collapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-200/70'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn('flex items-center gap-2.5', collapsed ? 'justify-center' : 'truncate')}>
                    <Icon
                      name={settingsItem.icon}
                      size={17}
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-600'
                      )}
                    />
                    {!collapsed && <span className="truncate">{settingsItem.label}</span>}
                  </div>
                  {isActive && !collapsed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-2xs" />
                  )}
                </>
              )}
            </NavLink>
          </div>
        )}
      </div>

      {/* Footer Info / User Status */}
      {collapsed ? (
        <div className="p-2 border-t border-slate-100 flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-xl bg-purple-100/90 border border-purple-200 text-purple-700 font-black text-xs flex items-center justify-center shadow-2xs cursor-pointer"
            title={`${user?.name || 'Head Office Admin'} (${user?.email || 'ho@vahd.com'})`}
          >
            {userInitials}
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="System Live" />
        </div>
      ) : (
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
      )}
    </aside>
  );
}
