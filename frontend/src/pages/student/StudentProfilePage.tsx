import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { studentApi } from '@/services/studentApi';
import { api } from '@/services/api';
import { hrmsApi } from '@/services/hrmsApi';
import { MemberCard } from '@/components/student/MemberCard';
import { MembershipCard } from '@/components/student/MembershipCard';
import { AttendanceSummary } from '@/components/student/AttendanceSummary';
import { BiometricStatus } from '@/components/student/BiometricStatus';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['student', 'Profile']} />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-60 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['student', 'Profile']} />
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['student', 'Profile']} />
        <EmptyState icon="user" title="Profile Unavailable" description="Please sign in to view your member profile." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Your member profile & account"
        breadcrumb={['student', 'Profile']}
        actions={
          <button onClick={() => setEditing(!editing)} className="btn-primary flex items-center gap-2">
            <Icon name={editing ? 'x' : 'edit-3'} size={16} />
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        }
      />

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-600" />
          {toast}
        </div>
      )}

      {/* 1. Digital Member Pass */}
      <MemberCard profile={profile} />

      {/* 2. Grid Layout for Membership, Attendance & Biometrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MembershipCard membership={profile.membership} />
        {attendance && <AttendanceSummary attendance={attendance} />}
        {biometric && <BiometricStatus biometric={biometric} />}
      </div>

      {/* 3. Personal Information Form */}
      <div className="card p-6 border border-navy-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-100">
          <div>
            <h3 className="text-base font-bold text-navy-900">Personal Information</h3>
            <p className="text-xs text-navy-400">Manage your member profile information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Full Name</label>
              <input
                type="text"
                disabled={!editing}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Phone Number</label>
              <input
                type="text"
                disabled={!editing}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Email (Read-Only)</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="input-field bg-navy-50 text-navy-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Gender</label>
              <select
                disabled={!editing}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Age (Years)</label>
              <input
                type="number"
                disabled={!editing}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>
          </div>

          {editing && (
            <div className="flex justify-end gap-3 pt-3 border-t border-navy-100">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 4. Security & Account Password Reset */}
      <div className="card p-6 border border-navy-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0">
              <Icon name="key" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Security & Password Reset</h3>
              <p className="text-xs text-navy-400">Set and customize your personal account password</p>
            </div>
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
                <label className="text-xs font-semibold text-navy-700">New Password *</label>
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
                <Icon name="lock" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
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
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-navy-200 bg-white text-xs font-semibold text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 cursor-pointer"
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Confirm New Password *</label>
              <div className="relative">
                <Icon name="check-circle" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
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
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-navy-200 bg-white text-xs font-semibold text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-navy-50/70 border border-navy-100 flex items-start gap-2.5 text-[11px] text-navy-500 leading-relaxed font-medium">
            <Icon name="shield" size={15} className="text-purple-600 shrink-0 mt-0.5" />
            <span>
              Your updated password is encrypted and stored securely in the database. You will immediately be able to sign in across web and mobile using your registered email (<strong>{profile.email}</strong>) and this new password.
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
                  <Icon name="check" size={15} />
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
