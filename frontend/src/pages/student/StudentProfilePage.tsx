import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { studentApi } from '@/services/studentApi';
import { api } from '@/services/api';
import { hrmsApi } from '@/services/hrmsApi';
import type {
  studentProfile,
  studentAttendanceData,
  studentBiometricStatus as BioStatusType,
} from '@/types/student';

export function studentProfilePage() {
  const [profile, setProfile] = useState<studentProfile | null>(null);
  const [attendance, setAttendance] = useState<studentAttendanceData | null>(null);
  const [biometric, setBiometric] = useState<BioStatusType | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    age: '',
  });

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      studentApi.getProfile(),
      studentApi.getAttendance(),
      studentApi.getBiometricStatus(),
    ])
      .then(([pRes, aRes, bRes]) => {
        const p = pRes.status === 'fulfilled' ? pRes.value : null;
        const a = aRes.status === 'fulfilled' ? aRes.value : null;
        const b = bRes.status === 'fulfilled' ? bRes.value : null;

        setProfile(p);
        setAttendance(a);
        setBiometric(b);
        if (p) {
          setForm({
            full_name: p.full_name || '',
            phone: p.phone || '',
            gender: p.gender || '',
            age: p.age ? String(p.age) : '',
          });
        }
      })
      .catch(() => {
        setError('Unable to load your profile data. Please check connection and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Pass@${rand}`;
    setNewPassword(generated);
    setConfirmPassword(generated);
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const cleanPwd = newPassword.trim();
    if (!cleanPwd || cleanPwd.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    if (cleanPwd !== confirmPassword.trim()) {
      setPasswordError('Passwords do not match. Please verify both fields.');
      return;
    }

    setSavingPassword(true);
    try {
      let success = false;
      let msg = 'Password updated successfully! You can now log in with your new password.';
      try {
        const res = await api.auth.changePassword(cleanPwd);
        if (res && res.message) msg = res.message;
        success = true;
      } catch (_authErr) {
        const resHrms = await hrmsApi.resetPassword({
          target_type: 'student',
          target_id: profile?.id || profile?.email || '',
          new_password: cleanPwd,
        });
        if (resHrms && resHrms.message) msg = resHrms.message;
        success = true;
      }

      if (success) {
        setPasswordSuccess(msg);
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully!');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await studentApi.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        gender: form.gender,
        age: Number(form.age) || undefined,
      });
      showToast('Personal profile updated successfully!');
      setEditing(false);
      fetchData();
    } catch (_err) {
      showToast('Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const monthlyTarget = 20;
  const visits = attendance?.monthly_visits ?? 0;
  const progressPct = Math.min(100, Math.round((visits / monthlyTarget) * 100));

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
            <Icon name="home" size={13} className="text-blue-600" />
            <span className="text-blue-600">Student</span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-900 font-extrabold">Profile</span>
          </div>
          <Skeleton className="h-10 w-52 rounded-xl" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Profile</span>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Profile</span>
        </div>
        <EmptyState icon="user" title="Profile Unavailable" description="Please sign in to view your member profile." />
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'JO';

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
      {/* ── 1. Breadcrumb & Themed Header matching screenshot ───────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
            <Icon name="home" size={13} className="text-blue-600" />
            <span className="text-blue-600 hover:underline cursor-pointer">Student</span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-900 font-extrabold">Profile</span>
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="user" size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                My Profile
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Your member profile &amp; account
              </p>
            </div>
          </div>
        </div>

        {/* Right action button */}
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <Icon name={editing ? 'x' : 'edit-3'} size={14} />
          <span>{editing ? 'Cancel' : 'Edit Profile'}</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-2xs">
          <Icon name="check-circle" size={16} className="text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── 2. Digital Member ID Banner ───────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-orange-500 text-white p-5 sm:p-6 shadow-md flex items-center gap-4 sm:gap-5">
        {/* Subtle decorative curves */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none" viewBox="0 0 1000 200">
          <path d="M0 130 C 300 180, 500 80, 750 140 C 900 180, 960 120, 1000 130 L 1000 200 L 0 200 Z" fill="white" />
        </svg>

        {/* Avatar Squircle */}
        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shrink-0 shadow-inner">
          {profile.profile_image ? (
            <img src={profile.profile_image} alt={profile.full_name} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Member Details */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white/90 uppercase">DIGITAL MEMBER ID</span>
            <span className="bg-white/20 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/25 flex items-center gap-1.5 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {profile.full_name} {profile.full_name && !profile.full_name.includes('(Member)') ? '(Member)' : ''}
          </h2>

          <div className="text-xs text-white/90 font-mono font-medium">
            ID: {profile.member_code || `stu${String(profile.id || 1).padStart(4, '0')}`}
          </div>

          <div className="text-xs text-white/90 font-medium flex items-center gap-1.5 pt-0.5">
            <Icon name="layers" size={13} className="text-white/80" />
            <span>{profile.membership?.plan_name || 'No Active Plan'}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Summary Cards (3 Columns: Membership, Attendance, Biometric) ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Membership */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Icon name="credit-card" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Membership</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Plan validity &amp; status</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                (profile.membership?.status || '').toLowerCase() === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  (profile.membership?.status || '').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
                {(profile.membership?.status || 'INACTIVE').toUpperCase()}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-600">
                  <Icon name="calendar" size={14} className="text-purple-500" />
                  <span>Plan</span>
                </div>
                <span className="font-bold text-slate-900">{profile.membership?.plan_name || 'No Active Plan'}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-600">
                  <Icon name="calendar" size={14} className="text-purple-500" />
                  <span>Start Date</span>
                </div>
                <span className="font-semibold text-slate-700">{profile.membership?.start_date || '—'}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-600">
                  <Icon name="calendar" size={14} className="text-purple-500" />
                  <span>Expiry Date</span>
                </div>
                <span className="font-semibold text-slate-700">{profile.membership?.expiry_date || '—'}</span>
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <div className="flex items-center gap-2 font-semibold text-slate-600">
                  <Icon name="clock" size={14} className="text-purple-500" />
                  <span>Days Remaining</span>
                </div>
                <span className="text-sm font-black text-amber-600">
                  {profile.membership?.days_remaining ?? 0} Days
                </span>
              </div>
            </div>
          </div>

          {/* Decorative Bottom Wave */}
          <svg className="absolute bottom-0 right-0 w-36 h-12 pointer-events-none opacity-40" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path d="M0 35 C 30 15, 60 40, 100 20 L 100 40 L 0 40 Z" fill="#FED7AA" />
          </svg>
        </div>

        {/* Card 2: Attendance */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Icon name="calendar" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Attendance</h3>
                <p className="text-[11px] text-slate-400 font-medium">vahd visits &amp; consistency</p>
              </div>
            </div>

            {/* 2 Stat Boxes */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/90 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Icon name="users" size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Visits</div>
                  <div className="text-lg font-black text-slate-900 leading-none mt-1">{attendance?.total_visits ?? 0}</div>
                </div>
              </div>

              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/90 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Icon name="zap" size={16} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Streak</div>
                  <div className="text-lg font-black text-emerald-600 leading-none mt-1">{attendance?.current_streak ?? 0} Days</div>
                </div>
              </div>
            </div>

            {/* Monthly Progress */}
            <div className="pt-4">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span>This Month ({attendance?.monthly_visits ?? 0} visits)</span>
                <span className="text-slate-400 text-[11px]">{progressPct}% of goal</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Decorative Bottom Wave */}
          <svg className="absolute bottom-0 right-0 w-36 h-12 pointer-events-none opacity-40" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path d="M0 35 C 30 15, 60 40, 100 20 L 100 40 L 0 40 Z" fill="#A7F3D0" />
          </svg>
        </div>

        {/* Card 3: Biometric Access */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <Icon name="shield" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Biometric Access</h3>
                <p className="text-[11px] text-slate-400 font-medium">vahd turnstile &amp; door access status</p>
              </div>
            </div>

            {/* Status list */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2.5">
                  <Icon name="camera" size={15} className="text-blue-600" />
                  <span>Face Recognition</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  • ENROLLED
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2.5">
                  <Icon name="fingerprint" size={15} className="text-blue-600" />
                  <span>Fingerprint</span>
                </div>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  • NOT_ENROLLED
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <div className="flex items-center gap-2.5">
                  <Icon name="credit-card" size={15} className="text-amber-500" />
                  <span>RFID Card ({biometric?.rfid_card?.card_number || 'None'})</span>
                </div>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  • NOT_ASSIGNED
                </span>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="pt-4">
            <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100/70 flex items-start gap-2 text-[11px] text-purple-900/80 font-medium leading-tight">
              <Icon name="info" size={14} className="text-purple-600 shrink-0 mt-0.5" />
              <span>Biometric hardware credentials are synced across turnstiles &amp; access gates.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Personal Information Form ───────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Icon name="user" size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Personal Information</h3>
            <p className="text-xs text-slate-400 font-medium">Manage your member profile information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name *</label>
              <div className="relative">
                <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={!editing}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition disabled:bg-slate-50/80 disabled:text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Phone Number</label>
              <div className="relative">
                <Icon name="phone" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={!editing}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition disabled:bg-slate-50/80 disabled:text-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Email (Read-Only)</label>
              <div className="relative">
                <Icon name="mail" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Gender</label>
              <div className="relative">
                <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  disabled={!editing}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 transition disabled:bg-slate-50/80 disabled:text-slate-700 appearance-none cursor-pointer disabled:cursor-default"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Age (Years)</label>
              <div className="relative">
                <Icon name="calendar" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  disabled={!editing}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition disabled:bg-slate-50/80 disabled:text-slate-700"
                />
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ── 5. Security & Account Password Reset ───────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Icon name="key" size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Security &amp; Password Reset</h3>
            <p className="text-xs text-slate-400 font-medium">Set and customize your personal account password</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-2xs">
            <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 animate-fade-in shadow-2xs">
            <Icon name="alert-circle" size={16} className="text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">New Password *</label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer transition hover:underline"
                >
                  <Icon name="sparkles" size={13} />
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
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex-1 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100/80 flex items-center gap-2.5 text-[11px] text-purple-900/85 font-medium leading-relaxed">
              <Icon name="shield" size={16} className="text-purple-600 shrink-0" />
              <span>
                Your updated password is encrypted and stored securely in the database. You will immediately be able to sign in across web and mobile using your registered email (<strong>{profile.email}</strong>) and this new password.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {savingPassword ? (
                <>
                  <Icon name="loader" size={14} className="animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={14} />
                  <span>Set My Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
