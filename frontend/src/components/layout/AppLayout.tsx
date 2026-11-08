import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#FAFBFD] flex flex-col min-w-0 w-full">
      <Topbar />
      <div className="flex-1 flex min-w-0 w-full">
        <Sidebar />
        <main className="flex-1 p-0 pb-20 lg:pb-6 animate-fade-in w-full min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
