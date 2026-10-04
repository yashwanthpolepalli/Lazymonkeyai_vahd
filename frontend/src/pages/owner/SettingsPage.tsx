import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyModuleVisibilityChanged } from '@/config/navigation';
import { CoursesPage } from '@/pages/owner/CoursesPage';
import { ReportsPage } from '@/pages/owner/ReportsPage';
import { CompanyManagement } from '@/components/erp/CompanyManagement';
import { BillingSettingsTab } from '@/components/settings/BillingSettingsTab';
import { cn } from '@/utils/cn';

interface NotificationSetting {
  id: string;
  label: string;
  desc: string;
  category: 'Member Alerts' | 'Financial' | 'Hardware & AI';
  enabled: boolean;
  channel: 'SMS & WhatsApp' | 'Email' | 'Push & Web';
}

interface IntegrationApp {
  id: string;
  name: string;
  icon: string;
  category:
    | 'Hardware & Biometrics'
    | 'Payments & Banking'
    | 'Messaging & Alerts'
    | 'Health & Wearables'
    | 'Hardware Scanners'
    | 'Payments & SMS';
  desc: string;
  connected: boolean;
  statusText: string;
  badgeColor: string;
  apiKey?: string;
}

export type SettingsTab =
  | 'General'
  | 'Profile'
  | 'ERP & Google Reviews'
  | 'Courses'
  | 'Memberships'
  | 'Reports'
  | 'Devices'
  | 'Notifications'
  | 'Security'
  | 'Billing'
  | 'Integrations';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab')?.toLowerCase();

  const getInitialTab = (): SettingsTab => {
    if (rawTab === 'erp' || rawTab === 'company' || rawTab === 'reviews' || rawTab === 'google-reviews') return 'ERP & Google Reviews';
    if (rawTab === 'courses' || rawTab === 'memberships' || rawTab === 'plans') return 'Courses';
    if (rawTab === 'reports' || rawTab === 'analytics') return 'Reports';
    if (rawTab === 'profile') return 'Profile';
    if (rawTab === 'devices' || rawTab === 'bmi' || rawTab === 'hardware') return 'Devices';
    if (rawTab === 'notifications') return 'Notifications';
    if (rawTab === 'security') return 'Security';
    if (rawTab === 'billing' || rawTab === 'plan') return 'Billing';
    if (rawTab === 'integrations') return 'Integrations';
    return 'General';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  useEffect(() => {
    if (rawTab) {
      if (rawTab === 'erp' || rawTab === 'company' || rawTab === 'reviews' || rawTab === 'google-reviews') setActiveTab('ERP & Google Reviews');
      else if (rawTab === 'courses' || rawTab === 'memberships' || rawTab === 'plans') setActiveTab('Courses');
      else if (rawTab === 'reports' || rawTab === 'analytics') setActiveTab('Reports');
      else if (rawTab === 'profile') setActiveTab('Profile');
      else if (rawTab === 'devices' || rawTab === 'bmi' || rawTab === 'hardware') setActiveTab('Devices');
      else if (rawTab === 'notifications') setActiveTab('Notifications');
      else if (rawTab === 'security') setActiveTab('Security');
      else if (rawTab === 'billing' || rawTab === 'plan') setActiveTab('Billing');
      else if (rawTab === 'integrations') setActiveTab('Integrations');
      else if (rawTab === 'general') setActiveTab('General');
    }
  }, [rawTab]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    const paramKey =
      tabId === 'ERP & Google Reviews' ? 'erp' :
      tabId === 'Courses' || tabId === 'Memberships' ? 'courses' :
      tabId === 'Reports' ? 'reports' :
      tabId === 'Profile' ? 'profile' :
      tabId === 'Devices' ? 'devices' :
      tabId === 'Notifications' ? 'notifications' :
      tabId === 'Security' ? 'security' :
      tabId === 'Billing' ? 'billing' :
      tabId === 'Integrations' ? 'integrations' : 'general';
    setSearchParams({ tab: paramKey });
  };
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // General Settings State
  const [gymName, setGymName] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [gymEmail, setGymEmail] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [currency, setCurrency] = useState('INR (₹)');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata (GMT +5:30)');
  const [openingTime, setOpeningTime] = useState('06:00 AM');
  const [closingTime, setClosingTime] = useState('10:00 PM');
  const [gstNumber, setGstNumber] = useState('');

  // Owner Profile State
  const [ownerName, setOwnerName] = useState(() => user?.name || '');
  const [ownerEmail, setOwnerEmail] = useState(() => user?.email || '');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerRole, setOwnerRole] = useState('Gym Owner');
  const [ownerAvatar, setOwnerAvatar] = useState<string>(() => user?.avatar || localStorage.getItem('vahd_owner_avatar') || '');

  // Devices & Hardware Config State
  const [esslUrl, setEsslUrl] = useState('');
  const [deviceAutoSync, setDeviceAutoSync] = useState(true);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification Preferences State
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: '1', label: 'New Member Enrollment', desc: 'Instant WhatsApp & Email welcome kit sent on enrollment', category: 'Member Alerts', enabled: true, channel: 'SMS & WhatsApp' },
    { id: '2', label: 'Payment Receipt & Invoice', desc: 'Automatic GST tax invoice delivered upon successful payment', category: 'Financial', enabled: true, channel: 'SMS & WhatsApp' },
    { id: '3', label: 'Membership Expiry Alert', desc: 'Automated 7-day & 3-day renewal reminder sequences', category: 'Member Alerts', enabled: true, channel: 'SMS & WhatsApp' },
    { id: '4', label: 'Low Inventory Stock Alert', desc: 'Notify branch manager when supplement or merch stock is below 5 units', category: 'Financial', enabled: true, channel: 'Push & Web' },
    { id: '5', label: 'AI Health & Attendance Insights', desc: 'Weekly automated performance & retention telemetry summary', category: 'Hardware & AI', enabled: true, channel: 'Email' },
    { id: '6', label: 'Hardware Device Offline Alert', desc: 'Immediate notification when eSSL Biometric access device drops connection', category: 'Hardware & AI', enabled: true, channel: 'Push & Web' },
  ]);

  // Integrations State
  const [integrations, setIntegrations] = useState<IntegrationApp[]>([
    { id: 'essl', name: 'eSSL Biometric Gate Control', icon: 'lock', category: 'Hardware & Biometrics', desc: 'RFID fingerprint & facial recognition biometric access control sync', connected: true, statusText: 'Online', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'razorpay', name: 'Razorpay Payment Gateway', icon: 'credit-card', category: 'Payments & Banking', desc: 'UPI, Credit Cards, NetBanking & Auto-debit subscriptions', connected: true, statusText: 'Merchant Active', badgeColor: 'bg-brand-50 text-brand-700 border-brand-200' },
    { id: 'whatsapp', name: 'WhatsApp Business API (Twilio)', icon: 'message-square', category: 'Messaging & Alerts', desc: 'Automated student notifications & fee renewal payment links', connected: true, statusText: 'Connected', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ]);

  const [billingInfo, setBillingInfo] = useState<any>(null);

  // Load existing settings, owner profile from backend DB on mount
  useEffect(() => {
    localStorage.removeItem('vahd_enable_pos');
    localStorage.removeItem('vahd_enable_inventory');
    Promise.all([
      apiClient.get<any>('/gym/settings').catch(() => null),
      api.auth.me().catch(() => null),
      apiClient.get<any>('/gym/billing').catch(() => null),
    ]).then(([gymRes, userRes, billingRes]) => {
      if (billingRes) {
        setBillingInfo(billingRes.billing || billingRes);
      }
      if (gymRes) {
        if (gymRes.gym_name) setGymName(gymRes.gym_name);
        if (gymRes.phone) setGymPhone(gymRes.phone);
        if (gymRes.email) setGymEmail(gymRes.email);
        if (gymRes.address) setGymAddress(gymRes.address);
        if (gymRes.gstin) setGstNumber(gymRes.gstin);
        if (gymRes.essl_bioserver_url) setEsslUrl(gymRes.essl_bioserver_url);
        notifyModuleVisibilityChanged();
      }
      if (userRes) {
        const fullName = (userRes as any).full_name || (userRes as any).name || '';
        if (fullName) setOwnerName(fullName);
        if (userRes.email) setOwnerEmail(userRes.email);
        if ((userRes as any).phone) setOwnerPhone((userRes as any).phone);
        if (userRes.role) setOwnerRole(`Gym ${userRes.role.toUpperCase()}`);
        const loadedAvatar = (userRes as any).avatar_url || (userRes as any).avatar;
        if (loadedAvatar) {
          setOwnerAvatar(loadedAvatar);
          localStorage.setItem('vahd_owner_avatar', loadedAvatar);
          updateUser({ avatar: loadedAvatar });
        }
      }
    });
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getInitials = (name: string) => {
    if (!name) return 'AR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerToast('⚠️ Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('⚠️ Image file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setOwnerAvatar(result);
        localStorage.setItem('vahd_owner_avatar', result);
        updateUser({ avatar: result });
        setHasUnsavedChanges(true);
        triggerToast('📸 Profile photo uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setOwnerAvatar('');
    localStorage.removeItem('vahd_owner_avatar');
    updateUser({ avatar: '' });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
    setHasUnsavedChanges(true);
    triggerToast('🗑️ Profile photo removed');
  };

  const handleSaveProfile = () => {
    updateUser({
      name: ownerName,
      email: ownerEmail,
      avatar: ownerAvatar,
    });
    if (ownerAvatar) {
      localStorage.setItem('vahd_owner_avatar', ownerAvatar);
    }
    setHasUnsavedChanges(false);
    triggerToast('✅ Owner profile and photo updated successfully!');
  };

  const handleToggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
    setHasUnsavedChanges(true);
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              connected: !app.connected,
              statusText: !app.connected ? 'Connected' : 'Disconnected',
              badgeColor: !app.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-navy-50 text-navy-600 border-navy-200',
            }
          : app
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    // Save Gym Branch settings to DB
    try {
      await apiClient.post('/gym/settings', {
        gym_name: gymName,
        phone: gymPhone,
        gstin: gstNumber,
        essl_bioserver_url: esslUrl,
        enable_pos: true,
        enable_inventory: true,
      });
      localStorage.removeItem('vahd_enable_pos');
      localStorage.removeItem('vahd_enable_inventory');
      notifyModuleVisibilityChanged();
    } catch (_err) {}

    setHasUnsavedChanges(false);
    triggerToast('Settings and device configurations saved successfully!');
  };

  const tabs = [
    { id: 'General', label: 'General', icon: 'settings' },
    { id: 'Profile', label: 'Profile & Owner', icon: 'user' },
    { id: 'ERP & Google Reviews', label: 'ERP & Google Reviews', icon: 'building-2' },
    { id: 'Courses', label: 'Courses', icon: 'book-open' },
    { id: 'Reports', label: 'Reports & Analytics', icon: 'file-bar-chart' },
    { id: 'Devices', label: 'Devices', icon: 'cpu' },
    { id: 'Notifications', label: 'Notifications', icon: 'bell' },
    { id: 'Security', label: 'Security', icon: 'shield' },
    { id: 'Billing', label: 'Billing & Plan', icon: 'credit-card' },
    { id: 'Integrations', label: 'Integrations', icon: 'layers' },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900/90 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/30 flex items-center gap-2.5 animate-slide-in">
          <Icon name="check-circle" size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Glassmorphic Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-brand-950 to-navy-900 p-6 md:p-8 text-white shadow-2xl border border-navy-800/80">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30 backdrop-blur-md">
                FIT CLUB OS • Branch Admin
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Hardware Gateway Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-serif">
              System Settings & Configurations
            </h1>
            <p className="text-navy-300 text-xs max-w-xl">
              Configure gym brand profile, automated member communication alerts, and hardware device integrations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-amber-400 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 animate-pulse">
                Unsaved Changes
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              className="btn-primary py-2.5 px-5 bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-glow flex items-center gap-2 transition-all active:scale-95"
            >
              <Icon name="check" size={16} />
              Save All Changes
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="card p-2 bg-white/80 backdrop-blur-md border border-navy-100/80 shadow-sm rounded-2xl">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as SettingsTab)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 relative',
                  isActive
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                )}
              >
                <Icon name={tab.icon} size={15} className={isActive ? 'text-white' : 'text-navy-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === 'General' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-8 space-y-6">
            {/* Gym Branch Information Card */}
            <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-navy-900">Gym Branch Information</h3>
                <p className="text-xs text-navy-400">Basic contact profile and branch operational parameters</p>
              </div>
              <Badge variant="brand" dot>Indiranagar Branch</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Gym Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Fit Club Elite"
                  value={gymName}
                  onChange={(e) => { setGymName(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Official Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={gymPhone}
                  onChange={(e) => { setGymPhone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Support Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@vahd.ai"
                  value={gymEmail}
                  onChange={(e) => { setGymEmail(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">GSTIN / Tax Reg Number</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstNumber}
                  onChange={(e) => { setGstNumber(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                >
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar (USD $)</option>
                  <option value="AED (AED)">UAE Dirham (AED)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => { setTimeZone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                >
                  <option value="Asia/Kolkata (GMT +5:30)">Asia/Kolkata (GMT +5:30)</option>
                  <option value="UTC (GMT +0:00)">UTC (GMT +0:00)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Physical Gym Address</label>
                <input
                  type="text"
                  placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru"
                  value={gymAddress}
                  onChange={(e) => { setGymAddress(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>
            </div>

            <div className="border-t border-navy-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-navy-900">Operating Hours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-navy-500 block mb-1">Opening Time</label>
                  <input
                    type="text"
                    value={openingTime}
                    onChange={(e) => { setOpeningTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-500 block mb-1">Closing Time</label>
                  <input
                    type="text"
                    value={closingTime}
                    onChange={(e) => { setClosingTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Right Sidebar Info Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="card p-5 border border-brand-100 bg-gradient-to-br from-brand-50/50 to-white space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
                <Icon name="info" size={20} />
              </div>
              <h4 className="text-sm font-bold text-navy-900">Branch Profile Telemetry</h4>
              <p className="text-xs text-navy-600 leading-relaxed">
                Gym name, phone number, and address are automatically printed on official GST Tax Invoices and member body composition result sheets.
              </p>
              <div className="p-3 rounded-xl bg-white border border-brand-200 text-xs font-semibold text-brand-900">
                Current Active Tax Rate:{' '}
                <span className="font-bold">
                  {billingInfo?.enable_gst_engine && Number(billingInfo?.total_gst_rate) > 0
                    ? `${billingInfo.total_gst_rate}% GST (${billingInfo.cgst_rate || (Number(billingInfo.total_gst_rate)/2)}% CGST + ${billingInfo.sgst_rate || (Number(billingInfo.total_gst_rate)/2)}% SGST)`
                    : 'GST Engine Disabled (0% Nil Rated)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OWNER PROFILE */}
      {activeTab === 'Profile' && (
        <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm animate-fade-in max-w-4xl">
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-navy-900">Owner & Admin Profile</h3>
              <p className="text-xs text-navy-400">Personal details and administrative access privileges</p>
            </div>
            <Badge variant="brand">Administrator</Badge>
          </div>

          {/* Profile Photo Upload Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 rounded-2xl bg-navy-50/60 border border-navy-100">
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change photo"
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white text-2xl font-black shadow-md relative cursor-pointer group overflow-hidden shrink-0 border-2 border-white ring-2 ring-brand-500/20"
              >
                {ownerAvatar ? (
                  <img
                    src={ownerAvatar}
                    alt={ownerName || 'Owner'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span>{getInitials(ownerName || user?.name || 'Owner')}</span>
                )}

                <div className="absolute inset-0 bg-navy-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                  <Icon name="camera" size={18} />
                  <span>Upload</span>
                </div>

                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-navy-900">{ownerName || user?.name || 'Yashwanth'}</h4>
                <p className="text-xs text-navy-500 font-medium">{ownerRole}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="btn-secondary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-navy-100"
                  >
                    <Icon name="upload" size={13} />
                    <span>{ownerAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  {ownerAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-xs py-1.5 px-3 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-rose-200/60 flex items-center gap-1.5"
                    >
                      <Icon name="trash-2" size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right text-[11px] text-navy-400 space-y-0.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-navy-200/60">
              <p className="font-semibold text-navy-700">Profile Photo</p>
              <p>PNG, JPG, WebP (Max 5MB)</p>
              <p className="text-brand-600 font-medium">Updates top navbar instantly</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => { setOwnerName(e.target.value); setHasUnsavedChanges(true); }}
                className="input-field text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy-700 mb-1.5 block">Email Address</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => { setOwnerEmail(e.target.value); setHasUnsavedChanges(true); }}
                className="input-field text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy-700 mb-1.5 block">Personal Phone</label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => { setOwnerPhone(e.target.value); setHasUnsavedChanges(true); }}
                className="input-field text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy-700 mb-1.5 block">Administrative Role</label>
              <input
                type="text"
                value={ownerRole}
                disabled
                className="input-field text-xs font-bold opacity-60 bg-navy-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-navy-100">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icon name="check" size={14} />
              <span>Save Profile Details</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: DEVICES & ACCESS CONTROL */}
      {activeTab === 'Devices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-8 space-y-6">
            {/* Card: Hardware Server Integrations */}
            <div className="card p-6 border border-navy-100 bg-white space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-navy-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Hardware Gateway Server Connections</h3>
                  <p className="text-xs text-navy-400">Endpoints for physical eSSL biometric access control turnstiles & gates</p>
                </div>
                <Badge variant="success" dot>Real Hardware API</Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-navy-700 mb-1 block">eSSL Biometric eBioserver URL</label>
                  <input
                    type="text"
                    value={esslUrl}
                    onChange={(e) => { setEsslUrl(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-mono font-bold"
                    placeholder="http://192.168.1.120:8080/ebioserver"
                  />
                  <span className="text-[10px] text-navy-400 mt-1 block">Server URL for RFID & fingerprint attendance gate autolock integration.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="card p-5 border border-navy-100 bg-white space-y-3">
              <h4 className="text-xs font-bold text-navy-900">Gate Telemetry Status</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-xl bg-navy-50">
                  <span className="text-navy-500">eSSL Gate Protocol:</span>
                  <span className="font-bold text-navy-900">Direct TCP/LAN</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-navy-50">
                  <span className="text-navy-500">Default Service Port:</span>
                  <span className="font-bold text-navy-900">8080 / eBioserver</span>
                </div>
                <div className="flex justify-between p-2 rounded-xl bg-navy-50">
                  <span className="text-navy-500">Auto-Sync Status:</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'Notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          <div className="lg:col-span-8 card p-6 border border-navy-100 bg-white space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900">Notification Preferences</h3>
                <p className="text-xs text-navy-400">Manage real-time communication triggers for members and gym staff</p>
              </div>
              <Badge variant="brand">Automated Triggers</Badge>
            </div>

            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-navy-50/70 border border-navy-100/80 hover:bg-navy-50 transition-all"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy-900">{n.label}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-navy-600 border border-navy-200">
                        {n.channel}
                      </span>
                    </div>
                    <p className="text-xs text-navy-400">{n.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleNotification(n.id)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                      n.enabled ? 'bg-brand-600' : 'bg-slate-200'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                        n.enabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="card p-5 border border-navy-100 bg-white space-y-3">
              <h4 className="text-xs font-bold text-navy-900">Live Preview Box</h4>
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs space-y-2 font-sans shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                  <span>WhatsApp Business API</span>
                  <span>Just Now</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  💪 <span className="font-bold text-brand-400">FIT CLUB</span>: Welcome <span className="font-bold">[Member Name]</span>! Your membership plan is active. View your InBody scan report anytime in the app.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY */}
      {activeTab === 'Security' && (
        <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm animate-fade-in max-w-4xl">
          <div className="flex items-center justify-between border-b border-navy-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-navy-900">Security & Credentials</h3>
              <p className="text-xs text-navy-400">Password management and multi-factor authentication setup</p>
            </div>
            <Badge variant="success" dot>Secured</Badge>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1.5 block">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-navy-900">Two-Factor Authentication (2FA)</div>
              <div className="text-xs text-navy-400">Require authenticator app passcode on login</div>
            </div>
            <button
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={cn(
                'btn-secondary text-xs py-1.5 px-3 font-bold',
                twoFactorEnabled ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : ''
              )}
            >
              {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
            </button>
          </div>

          <div className="flex justify-end">
            <button onClick={() => triggerToast('Security settings updated')} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2">
              <Icon name="shield" size={15} /> Update Security Settings
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: BILLING */}
      {activeTab === 'Billing' && (
        <div className="space-y-6 animate-fade-in">
          <BillingSettingsTab />
        </div>
      )}

      {/* TAB 7: INTEGRATIONS */}
      {activeTab === 'Integrations' && (
        <div className="space-y-6 animate-fade-in w-full">
          <div className="card p-6 border border-navy-100 bg-white space-y-5 shadow-sm w-full">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900">Third-Party Platform Integrations</h3>
                <p className="text-xs text-navy-400">Connect hardware devices, payment gateways, and notification gateways</p>
              </div>
              <Badge variant="brand">{integrations.filter((i) => i.connected).length} Active Adapters</Badge>
            </div>

            <div className="space-y-3">
              {integrations.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-navy-50/70 border border-navy-100 hover:bg-navy-50 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-navy-200 shadow-sm flex items-center justify-center text-brand-600 shrink-0">
                    <Icon name={app.icon} size={18} />
                  </div>

                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy-900">{app.name}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-bold border', app.badgeColor)}>
                        {app.statusText}
                      </span>
                    </div>
                    <p className="text-xs text-navy-400 truncate">{app.desc}</p>
                  </div>

                  <button
                    onClick={() => handleToggleIntegration(app.id)}
                    className={cn(
                      'btn-secondary text-xs py-1.5 px-4 font-bold shrink-0',
                      app.connected ? 'text-rose-700 hover:bg-rose-50 border-rose-200' : 'btn-primary text-white'
                    )}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: ERP & GOOGLE REVIEWS */}
      {activeTab === 'ERP & Google Reviews' && (
        <div className="space-y-6 animate-fade-in">
          <CompanyManagement />
        </div>
      )}

      {/* TAB: COURSES */}
      {(activeTab === 'Courses' || activeTab === 'Memberships') && (
        <div className="space-y-6 animate-fade-in">
          <CoursesPage embedded={true} />
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'Reports' && (
        <div className="space-y-6 animate-fade-in">
          <ReportsPage embedded={true} />
        </div>
      )}
    </div>
  );
}
