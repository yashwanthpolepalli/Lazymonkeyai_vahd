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

  return (
    <aside className="w-56 lg:w-60 shrink-0 hidden md:flex flex-col bg-white border-r border-slate-200/80 sticky top-16 h-[calc(100vh-64px)] z-30 select-none">
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
        {items.map((item) => (
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
                'w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all duration-150 font-bold',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border-transparent'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  name={item.icon}
                  size={16}
                  className={cn('shrink-0', isActive ? 'text-white' : 'text-slate-600')}
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
