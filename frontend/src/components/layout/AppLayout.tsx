import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="h-screen bg-[#FAFBFD] flex flex-col min-w-0 w-full overflow-hidden">
      <Topbar />
      <div className="flex-1 flex min-w-0 w-full overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 p-0 pb-20 lg:pb-6 w-full min-w-0 overflow-y-auto overflow-x-hidden relative">
          {/* Ambient Flowing Wave Graphic smoothly blended across all portal pages */}
          <div className="absolute right-0 top-0 w-full max-w-[950px] h-[220px] pointer-events-none select-none z-0 overflow-hidden">
            <img
              src="/dashboard-banner-bg.png"
              alt=""
              className="w-full h-full object-cover object-right opacity-95 pointer-events-none select-none"
            />
          </div>

          {/* Page Content */}
          <div className="relative z-0 w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
