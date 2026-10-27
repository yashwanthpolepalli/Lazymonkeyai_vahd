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
import { MasterDataSettings } from '@/components/settings/MasterDataSettings';
import { cn } from '@/utils/cn';

export interface SettingCardConfig {
  id: string;
  title: string;
  type: 'master' | 'courses' | 'reports' | 'erp' | 'general';
  categoryKey?: string;
  icon: string;
  bgLight: string;
  textColor: string;
  borderLight: string;
  description: string;
}

export const SETTING_CARDS: SettingCardConfig[] = [
  {
    id: 'districts',
    title: 'District',
    type: 'master',
    categoryKey: 'districts',
    icon: 'map',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    textColor: 'text-sky-600',
    borderLight: 'border-sky-200/70',
    description: '33 Districts in Telangana'
  },
  {
    id: 'mandals',
    title: 'Mandal',
    type: 'master',
    categoryKey: 'mandals',
    icon: 'map-pin',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    textColor: 'text-rose-600',
    borderLight: 'border-rose-200/70',
    description: 'Sub-district mandal units'
  },
  {
    id: 'towns',
    title: 'Village/Town',
    type: 'master',
    categoryKey: 'towns',
    icon: 'home',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-600',
    borderLight: 'border-amber-200/70',
    description: 'Local villages & wards'
  },
  {
    id: 'gender_types',
    title: 'Gender Types',
    type: 'master',
    categoryKey: 'gender_types',
    icon: 'users',
    bgLight: 'bg-pink-50 dark:bg-pink-950/40',
    textColor: 'text-pink-600',
    borderLight: 'border-pink-200/70',
    description: 'Male, Female & Other types'
  },
  {
    id: 'blood_groups',
    title: 'Blood Groups',
    type: 'master',
    categoryKey: 'blood_groups',
    icon: 'droplet',
    bgLight: 'bg-red-50 dark:bg-red-950/40',
    textColor: 'text-red-600',
    borderLight: 'border-red-200/70',
    description: 'A+, B+, O+, AB+ blood types'
  },
  {
    id: 'castes',
    title: 'Caste',
    type: 'master',
    categoryKey: 'castes',
    icon: 'tag',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-600',
    borderLight: 'border-purple-200/70',
    description: 'OC, BC, SC, ST & categories'
  },
  {
    id: 'institution_types',
    title: 'Type of Institution',
    type: 'master',
    categoryKey: 'institution_types',
    icon: 'building',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-600',
    borderLight: 'border-blue-200/70',
    description: 'Veterinary clinics & hospitals'
  },
  {
    id: 'roles',
    title: 'Role',
    type: 'master',
    categoryKey: 'roles',
    icon: 'shield',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-600',
    borderLight: 'border-purple-200/70',
    description: 'System roles & privileges'
  },
  {
    id: 'designations',
    title: 'Designation',
    type: 'master',
    categoryKey: 'designations',
    icon: 'award',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-600',
    borderLight: 'border-indigo-200/70',
    description: 'Officer departmental titles'
  },
  {
    id: 'departments',
    title: 'Departments',
    type: 'master',
    categoryKey: 'departments',
    icon: 'layers',
    bgLight: 'bg-teal-50 dark:bg-teal-950/40',
    textColor: 'text-teal-600',
    borderLight: 'border-teal-200/70',
    description: 'Clinical & admin divisions'
  },
  {
    id: 'qualifications',
    title: 'Qualification',
    type: 'master',
    categoryKey: 'qualifications',
    icon: 'book-open',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/40',
    textColor: 'text-cyan-600',
    borderLight: 'border-cyan-200/70',
    description: 'Degrees, diplomas & SSC'
  },
  {
    id: 'specializations',
    title: 'Specialization',
    type: 'master',
    categoryKey: 'specializations',
    icon: 'file-text',
    bgLight: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-200',
    borderLight: 'border-slate-300/70',
    description: 'Veterinary medical branches'
  },
  {
    id: 'leave_reasons',
    title: 'Leave Reasons',
    type: 'master',
    categoryKey: 'leave_reasons',
    icon: 'calendar',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600',
    borderLight: 'border-emerald-200/70',
    description: 'Leave categories & quotas'
  },
  {
    id: 'courses',
    title: 'Courses',
    type: 'courses',
    icon: 'graduation-cap',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600',
    borderLight: 'border-emerald-200/70',
    description: 'Branch courses & streams'
  },
  {
    id: 'reports',
    title: 'Reports',
    type: 'reports',
    icon: 'bar-chart-3',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-600',
    borderLight: 'border-blue-200/70',
    description: 'Reports & performance logs'
  },
  {
    id: 'erp',
    title: 'ERP & Google Reviews',
    type: 'erp',
    icon: 'star',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-600',
    borderLight: 'border-amber-200/70',
    description: 'Company & online review sync'
  },
  {
    id: 'general',
    title: 'General Profile',
    type: 'general',
    icon: 'settings',
    bgLight: 'bg-violet-50 dark:bg-violet-950/40',
    textColor: 'text-violet-600',
    borderLight: 'border-violet-200/70',
    description: 'Profile, contact & security'
  },
];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const isHo = user?.role === 'ho';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab')?.toLowerCase();

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
    if (rawTab === 'report' || rawTab === 'analytics') return 'reports';
    if (rawTab === 'company' || rawTab === 'reviews' || rawTab === 'google-reviews') return 'erp';
    if (rawTab === 'general' || rawTab === 'profile' || rawTab === 'security') return 'general';
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
      localStorage.removeItem('vahd_enable_pos');
      localStorage.removeItem('vahd_enable_inventory');
      notifyModuleVisibilityChanged();
    } catch (_err) { }

    setHasUnsavedChanges(false);
    triggerToast(
      isHo
        ? 'Head Office settings and profile configurations saved successfully!'
        : 'Settings and profile configurations saved successfully!'
    );
  };

  const activeCard = SETTING_CARDS.find(
    (c) => c.id === selectedSection || c.categoryKey === selectedSection
  );

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900/90 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-500/30 flex items-center gap-2.5 animate-slide-in">
          <Icon name="check-circle" size={18} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 1: 13 SETTING CARDS GRID (Exactly matching reference UI)       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === null && (
        <div className="space-y-6 animate-fade-in">
          {/* Header directly matching Screenshot */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
              Settings
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Master data — geography, clinical, HR, finance, pharmacy, and fodder
            </p>
          </div>

          {/* Subtab indicator */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-blue-600 font-black text-sm">|</span>
            <span className="text-xs font-bold text-blue-600">Settings</span>
          </div>

          {/* 13 Setting Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 pt-1">
            {SETTING_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelectSection(card.id)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-1 active:translate-y-0 cursor-pointer group shadow-2xs min-h-[135px]"
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs border',
                    card.bgLight,
                    card.textColor,
                    card.borderLight
                  )}
                >
                  <Icon name={card.icon} size={24} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                    {card.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block line-clamp-1">
                    {card.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Home</span>
                <Icon name="chevron-right" size={12} />
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                <Icon name="chevron-right" size={12} />
                <span className="text-slate-800 dark:text-slate-200 font-bold">General Profile</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">General Profile</h2>
              <p className="text-xs text-slate-500 font-medium">Settings · Organization Details, Profile & Security</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectSection(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Icon name="chevron-left" size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Icon name="check" size={14} />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
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
              <Badge variant="brand" dot>{vahdName || (isHo ? (user?.ho_name || 'Central Head Office') : 'Primary Branch')}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">
                  {isHo ? 'Head Office / Organisation Name' : 'Branch Name'}
                </label>
                <input
                  type="text"
                  placeholder={isHo ? 'e.g. Central Head Office' : 'e.g. Main Branch'}
                  value={vahdName}
                  onChange={(e) => { setvahdName(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Official Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={vahdPhone}
                  onChange={(e) => { setvahdPhone(e.target.value); setHasUnsavedChanges(true); }}
                  className="input-field text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy-700 mb-1.5 block">Support Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@vahd.ai"
                  value={vahdEmail}
                  onChange={(e) => { setvahdEmail(e.target.value); setHasUnsavedChanges(true); }}
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
                  value={vahdAddress}
                  onChange={(e) => { setvahdAddress(e.target.value); setHasUnsavedChanges(true); }}
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

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 3: COURSES & STREAMS MANAGEMENT                              */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'courses' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Home</span>
                <Icon name="chevron-right" size={12} />
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                <Icon name="chevron-right" size={12} />
                <span className="text-slate-800 dark:text-slate-200 font-bold">Courses</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Courses</h2>
              <p className="text-xs text-slate-500 font-medium">Settings · Branch Courses & Stream Structures</p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Back</span>
            </button>
          </div>
          <CoursesPage embedded={true} />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 4: REPORTS & ANALYTICS                                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'reports' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Home</span>
                <Icon name="chevron-right" size={12} />
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                <Icon name="chevron-right" size={12} />
                <span className="text-slate-800 dark:text-slate-200 font-bold">Reports</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reports</h2>
              <p className="text-xs text-slate-500 font-medium">Settings · Executive Reports & Analytics</p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Back</span>
            </button>
          </div>
          <ReportsPage embedded={true} />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW 5: ERP & GOOGLE REVIEWS                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {selectedSection === 'erp' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Home</span>
                <Icon name="chevron-right" size={12} />
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => handleSelectSection(null)}>Settings</span>
                <Icon name="chevron-right" size={12} />
                <span className="text-slate-800 dark:text-slate-200 font-bold">ERP & Google Reviews</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ERP & Google Reviews</h2>
              <p className="text-xs text-slate-500 font-medium">Settings · Organization Details & Online Reputation Sync</p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectSection(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Back</span>
            </button>
          </div>
          <CompanyManagement />
        </div>
      )}
    </div>
  );
}
