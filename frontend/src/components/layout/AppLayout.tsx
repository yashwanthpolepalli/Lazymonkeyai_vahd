import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col min-w-0 w-full">
      <Topbar />
      <main className="flex-1 p-0 pb-20 lg:pb-6 animate-fade-in w-full max-w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
