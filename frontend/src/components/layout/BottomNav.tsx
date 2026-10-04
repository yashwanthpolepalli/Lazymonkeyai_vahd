import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { getNavItems } from '@/config/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const mobileNavItems: Record<string, string[]> = {
  super_admin: ['Overview', 'Organizations', 'SaaS Plans', 'AI Platform', 'Settings'],
  owner: ['Executive Overview', 'Customers', 'Sales & CRM', 'POS', 'Settings'],
  trainer: ['Dashboard', 'My Customers', 'HRMS', 'AI Coach', 'Profile'],
  customer: ['Home', 'Attendance', 'Workouts', 'Food Scanner', 'Profile'],
};

export function BottomNav() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => (user ? getNavItems(user.role) : []));

  useEffect(() => {
    const updateItems = () => {
      if (user) setItems(getNavItems(user.role));
    };
    updateItems();
    window.addEventListener('vahd_modules_changed', updateItems);
    window.addEventListener('storage', updateItems);
    return () => {
      window.removeEventListener('vahd_modules_changed', updateItems);
      window.removeEventListener('storage', updateItems);
    };
  }, [user]);

  if (!user) return null;
  const labels = mobileNavItems[user.role] || [];
  const mobileItems = items.filter((item) => labels.includes(item.label)).slice(0, 5);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-navy-200/60 px-2 py-1.5">
      <div className="flex items-center justify-around">
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/owner' || item.path === '/trainer' || item.path === '/app' || item.path === '/super-admin'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
                isActive ? 'text-brand-600' : 'text-navy-400'
              )
            }
          >
            <Icon name={item.icon} size={20} />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
