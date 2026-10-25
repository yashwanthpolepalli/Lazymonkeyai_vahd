import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyModuleVisibilityChanged } from '@/config/navigation';
import { CoursesPage } from '@/pages/owner/CoursesPage';
import { ReportsPage } from '@/pages/owner/ReportsPage';
import { CompanyManagement } from '@/components/erp/CompanyManagement';
import { cn } from '@/utils/cn';

export type SettingsTab =
  | 'General'
  | 'ERP & Google Reviews'
  | 'Courses'
  | 'Memberships'
  | 'Reports';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const isHo = user?.role === 'ho';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab')?.toLowerCase();

  const getInitialTab = (): SettingsTab => {
    if (rawTab === 'erp' || rawTab === 'company' || rawTab === 'reviews' || rawTab === 'google-reviews') return 'ERP & Google Reviews';
    if (rawTab === 'courses' || rawTab === 'memberships' || rawTab === 'plans') return 'Courses';
    if (rawTab === 'reports' || rawTab === 'analytics') return 'Reports';
    return 'General';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);

  useEffect(() => {
    if (rawTab) {
      if (rawTab === 'erp' || rawTab === 'company' || rawTab === 'reviews' || rawTab === 'google-reviews') setActiveTab('ERP & Google Reviews');
      else if (rawTab === 'courses' || rawTab === 'memberships' || rawTab === 'plans') setActiveTab('Courses');
      else if (rawTab === 'reports' || rawTab === 'analytics') setActiveTab('Reports');
      else if (rawTab === 'general' || rawTab === 'profile' || rawTab === 'security') setActiveTab('General');
    }
  }, [rawTab]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    const paramKey =
      tabId === 'ERP & Google Reviews' ? 'erp' :
      tabId === 'Courses' || tabId === 'Memberships' ? 'courses' :
      tabId === 'Reports' ? 'reports' : 'general';
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
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Owner / Head Office Profile State (now under General tab)
  const [ownerName, setOwnerName] = useState(() => user?.name || '');
  const [ownerEmail, setOwnerEmail] = useState(() => user?.email || '');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerRole, setOwnerRole] = useState(() => (user?.role === 'ho' ? 'Head Office Admin' : 'Owner'));
  const [ownerAvatar, setOwnerAvatar] = useState<string>(() => user?.avatar || localStorage.getItem('vahd_owner_avatar') || '');

  // Devices & Hardware Config State
  const [esslUrl, setEsslUrl] = useState('');

  // Security State (now under General tab)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification Preferences State
  // Load existing settings, owner profile from backend DB on mount
  useEffect(() => {
    localStorage.removeItem('vahd_enable_pos');
    localStorage.removeItem('vahd_enable_inventory');
    Promise.all([
      apiClient.get<any>('/gym/settings').catch(() => null),
      api.auth.me().catch(() => null),
    ]).then(([gymRes, userRes]) => {
      if (gymRes) {
        if (gymRes.gym_name) setGymName(gymRes.gym_name);
        if (gymRes.phone) setGymPhone(gymRes.phone);
        if (gymRes.email) setGymEmail(gymRes.email);
        if (gymRes.address) setGymAddress(gymRes.address);
        if (gymRes.gstin) setGstNumber(gymRes.gstin);
        if (gymRes.opening_time) setOpeningTime(gymRes.opening_time);
        if (gymRes.closing_time) setClosingTime(gymRes.closing_time);
        if (gymRes.currency) setCurrency(gymRes.currency);
        if (gymRes.timezone) setTimeZone(gymRes.timezone);
        if (gymRes.essl_bioserver_url) setEsslUrl(gymRes.essl_bioserver_url);
        notifyModuleVisibilityChanged();
      }
      if (userRes) {
        const fullName = (userRes as any).full_name || (userRes as any).name || '';
        if (fullName) setOwnerName(fullName);
        if (userRes.email) setOwnerEmail(userRes.email);
        if ((userRes as any).phone) setOwnerPhone((userRes as any).phone);
        if (userRes.role) {
          const cleanRole = userRes.role.toLowerCase();
          setOwnerRole(
            cleanRole === 'owner' ? 'Owner' :
            cleanRole === 'ho' ? 'Head Office Admin' :
            userRes.role.toUpperCase()
          );
        }
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
    triggerToast(`✅ ${isHo ? 'Head Office administrator' : 'Owner'} profile and photo updated successfully!`);
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.post('/gym/settings', {
        gym_name: gymName,
        phone: gymPhone,
        email: gymEmail,
        address: gymAddress,
        gstin: gstNumber,
        currency: currency,
        timezone: timeZone,
        opening_time: openingTime,
        closing_time: closingTime,
        essl_bioserver_url: esslUrl,
        enable_pos: true,
        enable_inventory: true,
      });
      localStorage.removeItem('vahd_enable_pos');
      localStorage.removeItem('vahd_enable_inventory');
      notifyModuleVisibilityChanged();
    } catch (_err) {}

    setHasUnsavedChanges(false);
    triggerToast(
      isHo
        ? 'Head Office settings and profile configurations saved successfully!'
        : 'Settings and profile configurations saved successfully!'
    );
  };

  const tabs = [
    { id: 'General', label: 'General', icon: 'settings' },
    { id: 'ERP & Google Reviews', label: 'ERP & Google Reviews', icon: 'building-2' },
    { id: 'Courses', label: 'Courses', icon: 'book-open' },
    { id: 'Reports', label: 'Reports & Analytics', icon: 'file-bar-chart' },
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
                {isHo ? 'VAHD Enterprise • Head Office Management' : 'VAHD Enterprise • Branch Admin'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active & Synchronized
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-serif">
              System Settings & Configurations
            </h1>
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

      {/* TAB 1: GENERAL SETTINGS (includes Branch Profile, Owner Profile, and Security) */}
      {activeTab === 'General' && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 1: Branch Information / Head Office Information */}
          <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-navy-900">
                  {isHo ? 'Head Office & Organisation Profile' : 'Branch Information'}
                </h3>
                <p className="text-xs text-navy-400">
                  {isHo ? 'Basic contact profile and head office operational parameters' : 'Basic contact profile and branch operational parameters'}
                </p>
              </div>
              <Badge variant="brand" dot>{gymName || (isHo ? (user?.ho_name || 'Central Head Office') : 'Primary Branch')}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">
                  {isHo ? 'Head Office / Organisation Name' : 'Branch Name'}
                </label>
                <input
                  type="text"
                  placeholder={isHo ? 'e.g. Central Head Office' : 'e.g. Main Branch'}
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
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main Street, Suite 100, City, State"
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
                    placeholder="e.g. 06:00 AM"
                    value={openingTime}
                    onChange={(e) => { setOpeningTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-500 block mb-1">Closing Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 PM"
                    value={closingTime}
                    onChange={(e) => { setClosingTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Admin Profile */}
          <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-navy-900">
                  {isHo ? 'Head Office Administrator Profile' : 'Owner & Admin Profile'}
                </h3>
                <p className="text-xs text-navy-400">
                  {isHo ? 'Personal credentials and head office administrative access privileges' : 'Personal details and administrative access privileges'}
                </p>
              </div>
              <Badge variant="brand">{isHo ? 'Head Office Admin' : 'Administrator'}</Badge>
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
                      alt={ownerName || (isHo ? 'Head Office' : 'Owner')}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span>{getInitials(ownerName || user?.name || (isHo ? 'Head Office' : 'Owner'))}</span>
                  )}

                  <div className="absolute inset-0 bg-navy-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                    <Icon name="camera" size={18} />
                    <span>Upload</span>
                  </div>

                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-navy-900">{ownerName || user?.name || 'User'}</h4>
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

          {/* Section 3: Security & Credentials */}
          <div className="card p-6 border border-navy-100 bg-white space-y-6 shadow-sm rounded-3xl">
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
        </div>
      )}

      {/* TAB 5: ERP & GOOGLE REVIEWS */}
      {activeTab === 'ERP & Google Reviews' && (
        <div className="space-y-6 animate-fade-in">
          <CompanyManagement />
        </div>
      )}

      {/* TAB 6: COURSES */}
      {(activeTab === 'Courses' || activeTab === 'Memberships') && (
        <div className="space-y-6 animate-fade-in">
          <CoursesPage embedded={true} />
        </div>
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'Reports' && (
        <div className="space-y-6 animate-fade-in">
          <ReportsPage embedded={true} />
        </div>
      )}
    </div>
  );
}
