import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TenantProvider } from '@/contexts/tenant-context';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { OwnerDashboard } from '@/pages/owner/OwnerDashboard';
import { MembersPage } from '@/pages/owner/MembersPage';
import { Customer360Page } from '@/pages/owner/Customer360Page';
import { WorkoutsPage } from '@/pages/owner/WorkoutsPage';
import { ActiveWorkoutPage } from '@/pages/owner/ActiveWorkoutPage';
import { NutritionPage } from '@/pages/owner/NutritionPage';
import { FoodScannerPage } from '@/pages/owner/FoodScannerPage';
import { BodyCompositionPage } from '@/pages/owner/BodyCompositionPage';
import { HealthSyncPage } from '@/pages/owner/HealthSyncPage';
import { CrmPage } from '@/pages/owner/CrmPage';
import { HrmsPage } from '@/pages/owner/HrmsPage';
import { BrochuresPage } from '@/pages/owner/BrochuresPage';
import { PosPage } from '@/pages/owner/PosPage';
import { InventoryPage } from '@/pages/owner/InventoryPage';
import { MembershipsPage } from '@/pages/owner/MembershipsPage';
import { AttendancePage } from '@/pages/owner/AttendancePage';
import { TrainersPage } from '@/pages/owner/TrainersPage';
import { PaymentsPage } from '@/pages/owner/PaymentsPage';
import { CctvPage } from '@/pages/owner/CctvPage';
import { BiometricsPage } from '@/pages/owner/BiometricsPage';
import { IotPage } from '@/pages/owner/IotPage';
import { ReportsPage } from '@/pages/owner/ReportsPage';
import { MultiBranchPage } from '@/pages/owner/MultiBranchPage';
import { SettingsPage } from '@/pages/owner/SettingsPage';
import { ErpPage } from '@/pages/owner/ErpPage';
import PurchasePage from '@/pages/owner/PurchasePage';
import { TrainerDashboard } from '@/pages/trainer/TrainerDashboard';

import { TodaysWorkoutsPage } from '@/pages/trainer/TodaysWorkoutsPage';
import { ProgressPage } from '@/pages/trainer/ProgressPage';
import { TrainerAttendancePage } from '@/pages/trainer/TrainerAttendancePage';
import { TrainerHrmsPage } from '@/pages/trainer/TrainerHrmsPage';
import { MessagesPage } from '@/pages/trainer/MessagesPage';
import { AiCoachPage } from '@/pages/trainer/AiCoachPage';
import { TrainerProfilePage } from '@/pages/trainer/TrainerProfilePage';
import { CustomerDashboard } from '@/pages/customer/CustomerDashboard';
import { CustomerNutritionPage } from '@/pages/customer/CustomerNutritionPage';
import { CustomerProfilePage } from '@/pages/customer/CustomerProfilePage';
import { CustomerWorkoutsPage } from '@/pages/customer/CustomerWorkoutsPage';
import { CustomerTransformationPage } from '@/pages/customer/CustomerTransformationPage';
import { CustomerAttendancePage } from '@/pages/customer/CustomerAttendancePage';
import { SuperAdminDashboard } from '@/pages/superadmin/SuperAdminDashboard';
import { GymsPage } from '@/pages/superadmin/GymsPage';
import { SaaSPlansPage } from '@/pages/superadmin/SaaSPlansPage';
import { FeatureControlsPage } from '@/pages/superadmin/FeatureControlsPage';
import { DevicesPage } from '@/pages/superadmin/DevicesPage';
import { AiEnginePage } from '@/pages/superadmin/AiEnginePage';
import { AuditLogsPage } from '@/pages/superadmin/AuditLogsPage';
import { SupportDeskPage } from '@/pages/superadmin/SupportDeskPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { DownloadPage } from '@/pages/DownloadPage';
import { LandingPage } from '@/pages/LandingPage';
import type { Role } from '@/types';
import { roleHomePath } from '@/config/navigation';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-navy-50"><div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
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
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Navigate to="/login" replace />} />
      <Route path="/landing" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/download" element={<DownloadPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
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

      <Route path="/erp" element={<ProtectedRoute><RoleRedirect allowed={['owner', 'super_admin']} /></ProtectedRoute>}>
        <Route index element={<ErpPage />} />
      </Route>


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

      <Route path="/app" element={<ProtectedRoute><RoleRedirect allowed={['customer']} /></ProtectedRoute>}>
        <Route index element={<CustomerDashboard />} />
        <Route path="attendance" element={<CustomerAttendancePage />} />
        <Route path="workouts" element={<CustomerWorkoutsPage />} />
        <Route path="nutrition" element={<CustomerNutritionPage />} />
        <Route path="food-scanner" element={<FoodScannerPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="ai-coach" element={<AiCoachPage />} />
        <Route path="transformation" element={<CustomerTransformationPage />} />
        <Route path="history" element={<WorkoutsPage />} />
        <Route path="profile" element={<CustomerProfilePage />} />
      </Route>

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
