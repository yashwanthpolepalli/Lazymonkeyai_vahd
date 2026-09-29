import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';
import { getNavItems } from '@/config/navigation';
import { cn } from '@/utils/cn';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(() => (user ? getNavItems(user.role) : []));

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-navy-900/30 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-30',
          'bg-white border-r border-navy-200/60 flex flex-col',
          'transition-all duration-300',
          collapsed ? 'lg:w-[72px]' : 'lg:w-[240px]',
          'w-[240px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b border-navy-200/60 shrink-0">
          {collapsed ? <Logo collapsed size="sm" /> : <Logo size="sm" />}
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-navy-100">
            <Icon name="x" size={20} className="text-navy-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/owner' || item.path === '/trainer' || item.path === '/app' || item.path === '/super-admin'}
              onClick={onClose}
              className={({ isActive }) =>
                cn('nav-item', isActive && 'nav-item-active', collapsed && 'lg:justify-center lg:px-0')
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-navy-200/60 shrink-0">
          <button
            onClick={handleLogout}
            className={cn('nav-item text-danger-600 hover:bg-danger-50 hover:text-danger-700 w-full', collapsed && 'lg:justify-center lg:px-0')}
            title={collapsed ? 'Logout' : undefined}
          >
            <Icon name="log-out" size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
