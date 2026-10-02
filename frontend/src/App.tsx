import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TenantProvider } from '@/contexts/tenant-context';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Role } from '@/types';
import { roleHomePath } from '@/config/navigation';

// Lazy-loaded pages for fast instant startup and smooth chunk loading
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DownloadPage = lazy(() => import('@/pages/DownloadPage').then(m => ({ default: m.DownloadPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));

// Owner pages
const OwnerDashboard = lazy(() => import('@/pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const MembersPage = lazy(() => import('@/pages/owner/MembersPage').then(m => ({ default: m.MembersPage })));
const Customer360Page = lazy(() => import('@/pages/owner/Customer360Page').then(m => ({ default: m.Customer360Page })));
const FoodScannerPage = lazy(() => import('@/pages/owner/FoodScannerPage').then(m => ({ default: m.FoodScannerPage })));
const HealthSyncPage = lazy(() => import('@/pages/owner/HealthSyncPage').then(m => ({ default: m.HealthSyncPage })));
const CrmPage = lazy(() => import('@/pages/owner/CrmPage').then(m => ({ default: m.CrmPage })));
const PosPage = lazy(() => import('@/pages/owner/PosPage').then(m => ({ default: m.PosPage })));
const HrmsPage = lazy(() => import('@/pages/owner/HrmsPage').then(m => ({ default: m.HrmsPage })));
const PaymentsPage = lazy(() => import('@/pages/owner/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const IotPage = lazy(() => import('@/pages/owner/IotPage').then(m => ({ default: m.IotPage })));
const MultiBranchPage = lazy(() => import('@/pages/owner/MultiBranchPage').then(m => ({ default: m.MultiBranchPage })));
const SettingsPage = lazy(() => import('@/pages/owner/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ErpPage = lazy(() => import('@/pages/owner/ErpPage').then(m => ({ default: m.ErpPage })));
const WorkoutsPage = lazy(() => import('@/pages/owner/WorkoutsPage').then(m => ({ default: m.WorkoutsPage })));
const NutritionPage = lazy(() => import('@/pages/owner/NutritionPage').then(m => ({ default: m.NutritionPage })));

// Trainer pages
const TrainerDashboard = lazy(() => import('@/pages/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })));
const TrainerHrmsPage = lazy(() => import('@/pages/trainer/TrainerHrmsPage').then(m => ({ default: m.TrainerHrmsPage })));
const ProgressPage = lazy(() => import('@/pages/trainer/ProgressPage').then(m => ({ default: m.ProgressPage })));
const MessagesPage = lazy(() => import('@/pages/trainer/MessagesPage').then(m => ({ default: m.MessagesPage })));
const AiCoachPage = lazy(() => import('@/pages/trainer/AiCoachPage').then(m => ({ default: m.AiCoachPage })));
const TrainerProfilePage = lazy(() => import('@/pages/trainer/TrainerProfilePage').then(m => ({ default: m.TrainerProfilePage })));

// Customer pages
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const CustomerAttendancePage = lazy(() => import('@/pages/customer/CustomerAttendancePage').then(m => ({ default: m.CustomerAttendancePage })));
const CustomerWorkoutsPage = lazy(() => import('@/pages/customer/CustomerWorkoutsPage').then(m => ({ default: m.CustomerWorkoutsPage })));
const CustomerNutritionPage = lazy(() => import('@/pages/customer/CustomerNutritionPage').then(m => ({ default: m.CustomerNutritionPage })));
const CustomerTransformationPage = lazy(() => import('@/pages/customer/CustomerTransformationPage').then(m => ({ default: m.CustomerTransformationPage })));
const CustomerProfilePage = lazy(() => import('@/pages/customer/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));

// SuperAdmin pages
const SuperAdminDashboard = lazy(() => import('@/pages/superadmin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const GymsPage = lazy(() => import('@/pages/superadmin/GymsPage').then(m => ({ default: m.GymsPage })));
const SaaSPlansPage = lazy(() => import('@/pages/superadmin/SaaSPlansPage').then(m => ({ default: m.SaaSPlansPage })));
const FeatureControlsPage = lazy(() => import('@/pages/superadmin/FeatureControlsPage').then(m => ({ default: m.FeatureControlsPage })));
const AiEnginePage = lazy(() => import('@/pages/superadmin/AiEnginePage').then(m => ({ default: m.AiEnginePage })));
const DevicesPage = lazy(() => import('@/pages/superadmin/DevicesPage').then(m => ({ default: m.DevicesPage })));
const AuditLogsPage = lazy(() => import('@/pages/superadmin/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const SupportDeskPage = lazy(() => import('@/pages/superadmin/SupportDeskPage').then(m => ({ default: m.SupportDeskPage })));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRedirect({ allowed }: { allowed: Role[] }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) return <Navigate to={user ? roleHomePath[user.role] : '/login'} replace />;
  return <AppLayout />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Navigate to="/login" replace />} />
        <Route path="/landing" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* OWNER ROUTES */}
        <Route path="/owner" element={<ProtectedRoute><RoleRedirect allowed={['owner']} /></ProtectedRoute>}>
          <Route index element={<OwnerDashboard />} />
          <Route path="customers" element={<MembersPage />} />
          <Route path="customers/:id" element={<Customer360Page />} />
          <Route path="nutrition" element={<Navigate to="/owner" replace />} />
          <Route path="food-scanner" element={<FoodScannerPage />} />
          <Route path="body-composition" element={<Navigate to="/owner/iot?tab=body-composition" replace />} />
          <Route path="health-sync" element={<HealthSyncPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="pos" element={<PosPage />} />
          <Route path="inventory" element={<Navigate to="/owner/pos?tab=inventory" replace />} />
          <Route path="purchase" element={<Navigate to="/owner/pos?tab=purchase" replace />} />
          <Route path="memberships" element={<Navigate to="/owner/settings?tab=memberships" replace />} />
          <Route path="attendance" element={<Navigate to="/owner/hrms?tab=attendance" replace />} />
          <Route path="trainers" element={<Navigate to="/owner/hrms?tab=trainers" replace />} />
          <Route path="hrms" element={<HrmsPage />} />
          <Route path="brochures" element={<Navigate to="/owner" replace />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="iot" element={<IotPage />} />
          <Route path="cctv" element={<Navigate to="/owner/iot?tab=cctv" replace />} />
          <Route path="biometrics" element={<Navigate to="/owner/iot?tab=biometrics" replace />} />
          <Route path="reports" element={<Navigate to="/owner/settings?tab=reports" replace />} />
          <Route path="multi-branch" element={<MultiBranchPage />} />
          <Route path="erp" element={<Navigate to="/owner/settings?tab=erp" replace />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* ERP ROUTE */}
        <Route path="/erp" element={<ProtectedRoute><RoleRedirect allowed={['owner', 'super_admin']} /></ProtectedRoute>}>
          <Route index element={<ErpPage />} />
        </Route>

        {/* TRAINER ROUTES */}
        <Route path="/trainer" element={<ProtectedRoute><RoleRedirect allowed={['trainer']} /></ProtectedRoute>}>
          <Route index element={<TrainerDashboard />} />
          <Route path="customers" element={<MembersPage />} />
          <Route path="hrms" element={<TrainerHrmsPage />} />
          <Route path="attendance" element={<Navigate to="/trainer/hrms?tab=attendance" replace />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="ai-coach" element={<AiCoachPage />} />
          <Route path="profile" element={<TrainerProfilePage />} />
        </Route>

        {/* CUSTOMER ROUTES */}
        <Route path="/app" element={<ProtectedRoute><RoleRedirect allowed={['customer']} /></ProtectedRoute>}>
          <Route index element={<CustomerDashboard />} />
          <Route path="attendance" element={<CustomerAttendancePage />} />
          <Route path="workouts" element={<Navigate to="/app" replace />} />
          <Route path="nutrition" element={<Navigate to="/app" replace />} />
          <Route path="food-scanner" element={<Navigate to="/app" replace />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="ai-coach" element={<AiCoachPage />} />
          <Route path="transformation" element={<Navigate to="/app" replace />} />
          <Route path="history" element={<Navigate to="/app" replace />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>

        {/* SUPER ADMIN ROUTES */}
        <Route path="/super-admin" element={<ProtectedRoute><RoleRedirect allowed={['super_admin']} /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="gyms" element={<GymsPage />} />
          <Route path="plans" element={<SaaSPlansPage />} />
          <Route path="features" element={<FeatureControlsPage />} />
          <Route path="ai-engine" element={<AiEnginePage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="support" element={<SupportDeskPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
