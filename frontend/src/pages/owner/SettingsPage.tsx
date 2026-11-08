import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { api } from '@/services/api';
import { hrmsApi } from '@/services/hrmsApi';
import { useAuth } from '@/context/AuthContext';
import { notifyModuleVisibilityChanged } from '@/config/navigation';
import { CoursesPage } from '@/pages/owner/CoursesPage';
import { CompanyManagement } from '@/components/erp/CompanyManagement';
import { MasterDataSettings } from '@/components/settings/MasterDataSettings';
import { OwnerPermissionsTab } from '@/components/settings/OwnerPermissionsTab';
import { cn } from '@/utils/cn';

export interface SettingCardConfig {
  id: string;
  title: string;
  type: 'master' | 'courses' | 'reports' | 'erp' | 'general' | 'permissions';
  categoryKey?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  waveColor: string;
  description: string;
}

export const SETTING_CARDS: SettingCardConfig[] = [
  {
    id: 'districts',
    title: 'District',
    type: 'master',
    categoryKey: 'districts',
    icon: 'map',
    iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
    iconColor: 'text-sky-600',
    waveColor: 'text-sky-200/70',
    description: '33 Districts in Telangana'
  },
  {
    id: 'mandals',
    title: 'Mandal',
    type: 'master',
    categoryKey: 'mandals',
    icon: 'map-pin',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    iconColor: 'text-rose-600',
    waveColor: 'text-rose-200/70',
    description: 'Sub-district mandal units'
  },
  {
    id: 'towns',
    title: 'Village/Town',
    type: 'master',
    categoryKey: 'towns',
    icon: 'home',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    iconColor: 'text-amber-600',
    waveColor: 'text-amber-200/70',
    description: 'Local villages & wards'
  },
  {
    id: 'gender_types',
    title: 'Gender Types',
    type: 'master',
    categoryKey: 'gender_types',
    icon: 'users',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    iconColor: 'text-purple-600',
    waveColor: 'text-purple-200/70',
    description: 'Male, Female & Other types'
  },
  {
    id: 'blood_groups',
    title: 'Blood Groups',
    type: 'master',
    categoryKey: 'blood_groups',
    icon: 'droplet',
    iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
    iconColor: 'text-rose-600',
    waveColor: 'text-rose-200/70',
    description: 'A+, B+, O+, AB+ blood types'
  },
  {
    id: 'castes',
    title: 'Caste',
    type: 'master',
    categoryKey: 'castes',
    icon: 'tag',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    iconColor: 'text-purple-600',
    waveColor: 'text-purple-200/70',
    description: 'OC, BC, SC, ST & categories'
  },
  {
    id: 'institution_types',
    title: 'Type of Institution',
    type: 'master',
    categoryKey: 'institution_types',
    icon: 'building-2',
    iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
    iconColor: 'text-sky-600',
    waveColor: 'text-sky-200/70',
    description: 'clinics & hospitals'
  },
  {
    id: 'roles',
    title: 'Role',
    type: 'master',
    categoryKey: 'roles',
    icon: 'shield',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    iconColor: 'text-purple-600',
    waveColor: 'text-purple-200/70',
    description: 'System roles & privileges'
  },
  {
    id: 'designations',
    title: 'Designation',
    type: 'master',
    categoryKey: 'designations',
    icon: 'award',
    iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
    iconColor: 'text-blue-600',
    waveColor: 'text-blue-200/70',
    description: 'Officer departmental titles'
  },
  {
    id: 'departments',
    title: 'Departments',
    type: 'master',
    categoryKey: 'departments',
    icon: 'layers',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    iconColor: 'text-emerald-600',
    waveColor: 'text-emerald-200/70',
    description: 'Admin divisions'
  },
  {
    id: 'technical_skills',
    title: 'Technical Skills',
    type: 'master',
    categoryKey: 'technical_skills',
    icon: 'monitor',
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    iconColor: 'text-indigo-600',
    waveColor: 'text-indigo-200/70',
    description: 'Technical skills, certifications & student/employee mapping'
  },
  {
    id: 'qualifications',
    title: 'Qualification',
    type: 'master',
    categoryKey: 'qualifications',
    icon: 'book-open',
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    iconColor: 'text-cyan-600',
    waveColor: 'text-cyan-200/70',
    description: 'Degrees, diplomas & SSC'
  },
  {
    id: 'specializations',
    title: 'Specialization',
    type: 'master',
    categoryKey: 'specializations',
    icon: 'file-text',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    iconColor: 'text-purple-600',
    waveColor: 'text-purple-200/70',
    description: 'Medical branches'
  },
  {
    id: 'leave_reasons',
    title: 'Leave Reasons',
    type: 'master',
    categoryKey: 'leave_reasons',
    icon: 'calendar',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    iconColor: 'text-emerald-600',
    waveColor: 'text-emerald-200/70',
    description: 'Leave categories & quotas'
  },
  {
    id: 'courses',
    title: 'Courses',
    type: 'courses',
    icon: 'graduation-cap',
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    iconColor: 'text-emerald-600',
    waveColor: 'text-emerald-200/70',
    description: 'Branch courses & streams'
  },
  {
    id: 'erp',
    title: 'ERP & Google Reviews',
    type: 'erp',
    icon: 'star',
    iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
    iconColor: 'text-amber-600',
    waveColor: 'text-amber-200/70',
    description: 'Company & online review sync'
  },
  {
    id: 'general',
    title: 'Profile & Account',
    type: 'general',
    icon: 'user-cog',
    iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
    iconColor: 'text-purple-600',
    waveColor: 'text-purple-200/70',
    description: 'Admin profile & password reset'
  },
  {
    id: 'permissions',
    title: 'Permissions',
    type: 'permissions',
    icon: 'key',
    iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
    iconColor: 'text-sky-600',
    waveColor: 'text-sky-200/70',
    description: 'Owner roles & module access'
  },
];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isHo = user?.role === 'ho';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab')?.toLowerCase();

  useEffect(() => {
    if (rawTab === 'reports' || rawTab === 'report' || rawTab === 'analytics') {
      navigate(`/${isHo ? 'ho' : 'owner'}/reports`, { replace: true });
    }
  }, [rawTab, isHo, navigate]);

  const getInitialSection = (): string | null => {
    if (!rawTab) return null;
    const match = SETTING_CARDS.find(
      (c) => c.id === rawTab || (c.categoryKey && c.categoryKey === rawTab)
    );
    if (match) return match.id;
    if (rawTab === 'district') return 'districts';
    if (rawTab === 'mandal') return 'mandals';
    if (rawTab === 'village' || rawTab === 'town') return 'towns';
    if (rawTab === 'institution' || rawTab === 'institution-types' || rawTab === 'type-of-institution') return 'institution_types';
    if (rawTab === 'role') return 'roles';
    if (rawTab === 'designation') return 'designations';
    if (rawTab === 'department') return 'departments';
    if (rawTab === 'qualification') return 'qualifications';
    if (rawTab === 'specialization') return 'specializations';
    if (rawTab === 'course' || rawTab === 'memberships' || rawTab === 'plans') return 'courses';
    if (rawTab === 'general' || rawTab === 'profile' || rawTab === 'account' || rawTab === 'password' || rawTab === 'reset-password' || rawTab === 'security') return 'general';
    if (rawTab === 'report' || rawTab === 'analytics') return 'reports';
    if (rawTab === 'role' || rawTab === 'roles') {
      return 'roles';
    }
    if (rawTab === 'permission' || rawTab === 'permissions' || rawTab === 'roles-permissions' || rawTab === 'owner-permissions') {
      return 'permissions';
    }
    return null;
  };

  const [selectedSection, setSelectedSection] = useState<string | null>(getInitialSection);

  useEffect(() => {
    if (rawTab) {
      setSelectedSection(getInitialSection());
    } else {
      setSelectedSection(null);
    }
  }, [rawTab]);

  const handleSelectSection = (sectionId: string | null) => {
    setSelectedSection(sectionId);
    if (sectionId) {
      setSearchParams({ tab: sectionId });
    } else {
      setSearchParams({});
    }
  };

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // General Settings State
  const [vahdName, setvahdName] = useState('');
  const [vahdPhone, setvahdPhone] = useState('');
  const [vahdEmail, setvahdEmail] = useState('');
  const [vahdAddress, setvahdAddress] = useState('');
  const [currency, setCurrency] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Owner / Head Office Profile State (now under General tab)
  const [ownerName, setOwnerName] = useState(() => user?.name || '');
  const [ownerEmail, setOwnerEmail] = useState(() => user?.email || '');
  const [ownerPhone, setOwnerPhone] = useState(() => user?.phone || '');
  const [ownerRole, setOwnerRole] = useState(() => user?.role_title || user?.role || '');
  const [ownerAvatar, setOwnerAvatar] = useState<string>(() => user?.avatar || localStorage.getItem('vahd_owner_avatar') || '');

  // Devices & Hardware Config State
  const [esslUrl, setEsslUrl] = useState('');

  // Security State (now under General tab)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Password reset state (matching Employee & Student Login design)
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const cleanPwd = newPassword.trim();
    if (!cleanPwd || cleanPwd.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (cleanPwd !== confirmPassword.trim()) {
      setPasswordError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setSavingPassword(true);
    try {
      let success = false;
      let msg = '';
      try {
        const res = await api.auth.changePassword(cleanPwd, currentPassword.trim() || undefined);
        if (res && res.message) msg = res.message;
        success = true;
      } catch (_authErr) {
        // Fallback to hrms resetPassword endpoint
        const resHrms = await hrmsApi.resetPassword({
          target_type: user?.role || (isHo ? 'ho' : 'owner'),
          target_id: user?.id || user?.email || '',
          new_password: cleanPwd,
        });
        if (resHrms && resHrms.message) msg = resHrms.message;
        success = true;
      }

      if (success) {
        setPasswordSuccess(msg || 'Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        triggerToast('Password updated successfully!');
      }
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to update password. Please check your network and try again.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$';
    let generated = '';
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setPasswordError(null);
  };

  // Notification Preferences State
  // Load existing settings, owner profile from backend DB on mount
  useEffect(() => {
    localStorage.removeItem('vahd_enable_pos');
    localStorage.removeItem('vahd_enable_inventory');
    Promise.all([
      apiClient.get<any>('/vahd/settings').catch(() => null),
      api.auth.me().catch(() => null),
    ]).then(([vahdRes, userRes]) => {
      if (vahdRes) {
        if (vahdRes.vahd_name) setvahdName(vahdRes.vahd_name);
        if (vahdRes.phone) setvahdPhone(vahdRes.phone);
        if (vahdRes.email) setvahdEmail(vahdRes.email);
        if (vahdRes.address) setvahdAddress(vahdRes.address);
        if (vahdRes.gstin) setGstNumber(vahdRes.gstin);
        if (vahdRes.opening_time) setOpeningTime(vahdRes.opening_time);
        if (vahdRes.closing_time) setClosingTime(vahdRes.closing_time);
        if (vahdRes.currency) setCurrency(vahdRes.currency);
        if (vahdRes.timezone) setTimeZone(vahdRes.timezone);
        if (vahdRes.essl_bioserver_url) setEsslUrl(vahdRes.essl_bioserver_url);
        notifyModuleVisibilityChanged();
      }
      if (userRes) {
        const fullName = (userRes as any).full_name || (userRes as any).name || '';
        if (fullName) setOwnerName(fullName);
        if (userRes.email) setOwnerEmail(userRes.email);
        if ((userRes as any).phone) setOwnerPhone((userRes as any).phone);
        if (userRes.role_title || userRes.role) {
          setOwnerRole(userRes.role_title || userRes.role);
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
    if (!name) return '';
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

  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.put('/auth/me', {
        full_name: ownerName.trim(),
        phone: ownerPhone.trim(),
        avatar_url: ownerAvatar,
      });
      updateUser({
        name: ownerName.trim(),
        phone: ownerPhone.trim(),
        avatar: ownerAvatar,
      });
      if (ownerAvatar) {
        localStorage.setItem('vahd_owner_avatar', ownerAvatar);
      }
      setHasUnsavedChanges(false);
      triggerToast('✅ Profile updated successfully in database!');
    } catch (err: any) {
      triggerToast('⚠️ ' + (err?.response?.data?.detail || err?.message || 'Failed to update profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.post('/vahd/settings', {
        vahd_name: vahdName,
        phone: vahdPhone,
        email: vahdEmail,
        address: vahdAddress,
        gstin: gstNumber,
        currency: currency,
        timezone: timeZone,
        opening_time: openingTime,
        closing_time: closingTime,
        essl_bioserver_url: esslUrl,
        enable_pos: true,
        enable_inventory: true,
      });
      if (ownerName || ownerPhone || ownerAvatar) {
        await apiClient.put('/auth/me', {
          full_name: ownerName.trim(),
          phone: ownerPhone.trim(),
          avatar_url: ownerAvatar,
        }).catch(() => null);
        updateUser({
          name: ownerName.trim(),
          phone: ownerPhone.trim(),
          avatar: ownerAvatar,
          vahdName: vahdName,
        });
      }
      localStorage.removeItem('vahd_enable_pos');
      localStorage.removeItem('vahd_enable_inventory');
      notifyModuleVisibilityChanged();
      setHasUnsavedChanges(false);
      triggerToast('Settings and profile configurations saved successfully to database!');
    } catch (_err) {
      triggerToast('⚠️ Failed to save settings.');
    }
  };

  const activeCard = SETTING_CARDS.find(
    (c) => c.id === selectedSection || c.categoryKey === selectedSection
  );

  return (
    <div className="min-h-full bg-transparent w-full px-4 sm:px-6 py-4 space-y-4 font-sans text-slate-900 animate-fade-in relative pb-12">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900/90 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/30 flex items-center gap-2.5 animate-slide-in">
          <Icon name="check-circle" size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: 18 SETTING CARDS GRID (Exactly matching reference UI)       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === null && (
        <div className="space-y-4 animate-fade-in">
          {/* Breadcrumb & Header directly matching Screenshot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                <Icon name="home" size={13} className="text-blue-600" />
                <button
                  type="button"
                  onClick={() => handleSelectSection(null)}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Home
                </button>
                <span className="text-slate-400">›</span>
                <span className="text-slate-900 font-black">Settings</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon name="settings" size={17} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                    Settings
                  </h1>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
                    Master data — geography, HR, finance, pharmacy, and fodder.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subtab indicator matching Screenshot */}
          <div className="flex items-center gap-2 pt-1 border-b border-slate-100 pb-2">
            <span className="text-blue-600 font-black text-base">|</span>
            <span className="text-xs font-black text-slate-900">Settings</span>
          </div>

          {/* Setting Cards Grid (18 cards matching reference screenshot across 7 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5 pt-1">
            {SETTING_CARDS.filter((card) => {
              if (isHo) return true;
              if (card.id === 'permissions') {
                return !!(user?.permissions && (user.permissions['permissions.view'] || user.permissions['permissions']));
              }
              if (!user?.permissions || Object.keys(user.permissions).length === 0) return true;
              const perms = user.permissions;

              // 1. Direct card check if explicitly granted/denied
              const specificPerm = perms[`${card.id}.view`] ?? perms[card.id];
              if (specificPerm !== undefined) {
                return !!specificPerm;
              }

              // 2. Fallbacks for master data categories
              if (card.type === 'master') {
                return !!(perms['master_data.view'] || perms['master_data']);
              }
              if (card.id === 'courses') {
                return !!(perms['courses.view'] || perms['courses']);
              }
              if (card.id === 'reports') {
                return !!(perms['reports_section.view'] || perms['reports.view'] || perms['reports_attendance.view'] || perms['reports_financial.view']);
              }
              if (card.id === 'erp') {
                return !!(perms['erp.view'] || perms['erp'] || perms['branch_profile.view'] || perms['settings.profile']);
              }
              if (card.id === 'general') {
                return !!(perms['general.view'] || perms['general'] || perms['settings_section.view'] || perms['settings.view'] || perms['branch_profile.view'] || perms['settings.profile']);
              }
              return true;
            }).map((card) => (
              <div
                key={card.id}
                onClick={() => handleSelectSection(card.id)}
                className="rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden min-h-[160px] bg-white border border-slate-200/90 hover:border-slate-300"
              >
                <div>
                  {/* Top-left: Icon box */}
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 border',
                      card.iconBg
                    )}
                  >
                    <Icon name={card.icon} size={17} className={card.iconColor} />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mt-3 mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Bottom row: Arrow button */}
                <div className="flex justify-end pt-3 relative z-10">
                  <div className="w-7 h-7 rounded-full bg-white border border-slate-200/90 text-slate-500 group-hover:text-slate-900 group-hover:border-slate-300 group-hover:translate-x-0.5 flex items-center justify-center transition-all duration-200 shadow-2xs">
                    <Icon name="arrow-right" size={13} />
                  </div>
                </div>

                {/* Bottom decorative wave matching screenshot */}
                <svg
                  className={cn(
                    'absolute -bottom-1 right-0 w-full h-12 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity',
                    card.waveColor
                  )}
                  viewBox="0 0 160 50"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,50 Q45,28 95,38 T160,12 L160,50 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER DATA DETAILED TABLE VIEWS (9 Categories)            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection && activeCard?.type === 'master' && (
        <MasterDataSettings
          selectedCatId={activeCard.categoryKey || selectedSection}
          onBack={() => handleSelectSection(null)}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 6: GENERAL PROFILE (Branch info, Owner profile & Security)    */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'general' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <Icon name="user" size={22} className="text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
                  <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1" onClick={() => handleSelectSection(null)}>
                    <Icon name="home" size={12} />
                    <span>Home</span>
                  </span>
                  <Icon name="chevron-right" size={12} />
                  <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                  <Icon name="chevron-right" size={12} />
                  <span className="text-slate-800 font-bold">Profile &amp; Account</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Profile &amp; Account</h2>
                <p className="text-xs text-slate-500 font-medium">Settings · Organization Details, Profile &amp; Security</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => handleSelectSection(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Icon name="arrow-left" size={13} />
                <span>Back to Settings</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Icon name="check" size={14} />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
          {/* Section 1: Branch Information / Head Office Information */}
          <div className="card p-6 border border-slate-200/90 bg-white space-y-6 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-200/90 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isHo ? 'Head Office & Organisation Profile' : 'Branch Information'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isHo ? 'Basic contact profile and head office operational parameters' : 'Basic contact profile and branch operational parameters'}
                </p>
              </div>
              <Badge variant="brand" dot>{vahdName || user?.vahdName || user?.branchName || ''}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  {isHo ? 'Head Office / Organisation Name' : 'Branch Name'}
                </label>
                <input
                  type="text"
                  placeholder="Organisation / Branch Name"
                  value={vahdName}
                  onChange={(e) => { setvahdName(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Official Phone Number</label>
                <input
                  type="text"
                  placeholder="Official Phone Number"
                  value={vahdPhone}
                  onChange={(e) => { setvahdPhone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Support Email Address</label>
                <input
                  type="email"
                  placeholder="Official Email Address"
                  value={vahdEmail}
                  onChange={(e) => { setvahdEmail(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">GSTIN / Tax Reg Number</label>
                <input
                  type="text"
                  placeholder="GSTIN / Registration Number"
                  value={gstNumber}
                  onChange={(e) => { setGstNumber(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                >
                  <option value="">Select Currency</option>
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar (USD $)</option>
                  <option value="AED (AED)">UAE Dirham (AED)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => { setTimeZone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                >
                  <option value="">Select Time Zone</option>
                  <option value="Asia/Kolkata (GMT +5:30)">Asia/Kolkata (GMT +5:30)</option>
                  <option value="UTC (GMT +0:00)">UTC (GMT +0:00)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Physical Address</label>
                <input
                  type="text"
                  placeholder="Physical Address"
                  value={vahdAddress}
                  onChange={(e) => { setvahdAddress(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>
            </div>

            <div className="border-t border-slate-200/90 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Operating Hours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Opening Time</label>
                  <input
                    type="text"
                    placeholder="Opening Time (e.g. 09:00 AM)"
                    value={openingTime}
                    onChange={(e) => { setOpeningTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Closing Time</label>
                  <input
                    type="text"
                    placeholder="Closing Time (e.g. 06:00 PM)"
                    value={closingTime}
                    onChange={(e) => { setClosingTime(e.target.value); setHasUnsavedChanges(true); }}
                    className="input-field text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Admin Profile */}
          <div className="card p-6 border border-slate-200/90 bg-white space-y-6 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-200/90 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isHo ? 'Head Office Administrator Profile' : 'Owner & Admin Profile'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isHo ? 'Personal credentials and head office administrative access privileges' : 'Personal details and administrative access privileges'}
                </p>
              </div>
              <Badge variant="brand">{ownerRole || user?.role_title || (user?.role ? user.role.toUpperCase() : '')}</Badge>
            </div>

            {/* Profile Photo Upload Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 rounded-2xl bg-slate-50/60 border border-slate-200/90">
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
                      alt={ownerName || user?.name || ''}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span>{getInitials(ownerName || user?.name || '')}</span>
                  )}

                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                    <Icon name="camera" size={18} />
                    <span>Upload</span>
                  </div>

                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{ownerName || user?.name || ''}</h4>
                  <p className="text-xs text-slate-500 font-medium">{ownerRole}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="btn-secondary text-xs py-1.5 px-3 font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-100"
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

              <div className="text-left sm:text-right text-[11px] text-slate-400 space-y-0.5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                <p className="font-semibold text-slate-700">Profile Photo</p>
                <p>PNG, JPG, WebP (Max 5MB)</p>
                <p className="text-brand-600 font-medium">Updates top navbar instantly</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => { setOwnerName(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Email Address</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => { setOwnerEmail(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Personal Phone</label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => { setOwnerPhone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Administrative Role</label>
                <input
                  type="text"
                  value={ownerRole}
                  disabled
                  className="input-field text-xs font-bold opacity-60 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200/90">
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

          {/* Section 3: Security & Password Reset (Design matching Employee & Student Login) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0">
                  <Icon name="key" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Security & Password Reset</h3>
                  <p className="text-xs text-slate-500 font-medium">Set and customize your personal account password</p>
                </div>
              </div>
              <Badge variant="success" dot>Secured</Badge>
            </div>

            {passwordSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 animate-fade-in shadow-2xs">
                <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2.5 animate-fade-in shadow-2xs">
                <Icon name="alert-circle" size={16} className="text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Current Password (Optional)</label>
                <div className="relative">
                  <Icon name="key" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter current password if known"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">New Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="sparkles" size={12} />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Icon name="lock" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 4 characters)"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    required
                    minLength={4}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm New Password *</label>
                <div className="relative">
                  <Icon name="check-circle" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    required
                    minLength={4}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed font-medium">
                <Icon name="shield" size={15} className="text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Your password will be updated instantly in the secure database. You can use your registered email (<strong>{user?.email}</strong>) and your new password to sign in on all devices.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword ? (
                    <>
                      <Icon name="loader" size={14} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="key" size={14} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 3: COURSES & STREAMS MANAGEMENT                              */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'courses' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Icon name="graduation-cap" size={22} className="text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
                  <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1" onClick={() => handleSelectSection(null)}>
                    <Icon name="home" size={12} />
                    <span>Home</span>
                  </span>
                  <Icon name="chevron-right" size={12} />
                  <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                  <Icon name="chevron-right" size={12} />
                  <span className="text-slate-800 font-bold">Courses</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Courses</h2>
                <p className="text-xs text-slate-500 font-medium">Settings · Branch Courses &amp; Stream Structures</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer self-start sm:self-center"
            >
              <Icon name="arrow-left" size={13} />
              <span>Back to Settings</span>
            </button>
          </div>
          <CoursesPage embedded={true} />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 5: ERP & GOOGLE REVIEWS                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'erp' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Icon name="star" size={22} className="text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
                  <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1" onClick={() => handleSelectSection(null)}>
                    <Icon name="home" size={12} />
                    <span>Home</span>
                  </span>
                  <Icon name="chevron-right" size={12} />
                  <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                  <Icon name="chevron-right" size={12} />
                  <span className="text-slate-800 font-bold">ERP &amp; Google Reviews</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ERP &amp; Google Reviews</h2>
                <p className="text-xs text-slate-500 font-medium">Settings · Organization Details &amp; Online Reputation Sync</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer self-start sm:self-center"
            >
              <Icon name="arrow-left" size={13} />
              <span>Back to Settings</span>
            </button>
          </div>
          <CompanyManagement />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 6: PERMISSION MATRIX MANAGEMENT                              */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'permissions' && (
        <OwnerPermissionsTab onBack={() => handleSelectSection(null)} />
      )}
    </div>
  );
}
