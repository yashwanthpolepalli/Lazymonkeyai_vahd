import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { customerApi } from '@/services/customerApi';
import { MemberCard } from '@/components/customer/MemberCard';
import { MembershipCard } from '@/components/customer/MembershipCard';
import { AttendanceSummary } from '@/components/customer/AttendanceSummary';
import { BiometricStatus } from '@/components/customer/BiometricStatus';
import type {
  CustomerProfile,
  CustomerAttendanceData,
  CustomerBiometricStatus as BioStatusType,
} from '@/types/customer';

export function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [attendance, setAttendance] = useState<CustomerAttendanceData | null>(null);
  const [biometric, setBiometric] = useState<BioStatusType | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    target_weight: '',
    goal: '',
  });

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      customerApi.getProfile(),
      customerApi.getAttendance(),
      customerApi.getBiometricStatus(),
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
            height: p.height ? String(p.height) : '',
            weight: p.weight ? String(p.weight) : '',
            target_weight: p.target_weight ? String(p.target_weight) : '',
            goal: p.goal || '',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customerApi.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        gender: form.gender,
        age: Number(form.age) || undefined,
        height: Number(form.height) || undefined,
        weight: Number(form.weight) || undefined,
        target_weight: Number(form.target_weight) || undefined,
        goal: form.goal,
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
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
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
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
        <EmptyState icon="user" title="Profile Unavailable" description="Please sign in to view your member profile." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Your fitness identity & member account"
        breadcrumb={['Customer', 'Profile']}
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
            <h3 className="text-base font-bold text-navy-900">Personal Information & Fitness Profile</h3>
            <p className="text-xs text-navy-400">Manage your profile information and fitness goals</p>
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

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Height (cm)</label>
              <input
                type="number"
                disabled={!editing}
                placeholder="e.g. 175"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                disabled={!editing}
                placeholder="e.g. 75"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                disabled={!editing}
                placeholder="e.g. 70"
                value={form.target_weight}
                onChange={(e) => setForm({ ...form, target_weight: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Primary Fitness Goal</label>
              <select
                disabled={!editing}
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Goal</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Fat Loss & Toning">Fat Loss & Toning</option>
                <option value="General Fitness & Endurance">General Fitness & Endurance</option>
                <option value="Strength & Powerlifting">Strength & Powerlifting</option>
              </select>
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
    </div>
  );
}
