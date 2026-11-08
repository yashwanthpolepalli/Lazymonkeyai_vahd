import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { BarChart } from '@/components/ui/Charts';
import { api, apiClient } from '@/services/api';
import { hrmsApi } from '@/services/hrmsApi';

export function EmployeeProfilePage() {
  const { user } = useAuth();
  const displayName = user?.name || user?.email?.split('@')[0] || 'Employee';
  const initial = displayName.charAt(0).toUpperCase();

  // Dynamic employee data
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Password reset form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch dynamic employee profile from backend
  useEffect(() => {
    let isMounted = true;
    setLoadingDetails(true);

    apiClient.get<any[]>('/hrms/employees')
      .then((employees) => {
        if (!isMounted || !Array.isArray(employees)) return;
        const matched = employees.find(
          (e) => (e.email && e.email.toLowerCase() === (user?.email || '').toLowerCase()) ||
                 (e.id === user?.id) || (e.code === user?.id)
        );
        if (matched) {
          setEmployeeDetails(matched);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => { isMounted = false; };
  }, [user]);

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
      // 1. Try auth change-password endpoint
      let success = false;
      let msg = 'Password updated successfully! You can now log in with your new password.';
      try {
        const res = await api.auth.changePassword(cleanPwd);
        if (res && res.message) msg = res.message;
        success = true;
      } catch (_authErr) {
        // Fallback to hrms resetPassword endpoint
        const resHrms = await hrmsApi.resetPassword({
          target_type: 'employee',
          target_id: employeeDetails?.id || user?.id || user?.email || '',
          new_password: cleanPwd,
        });
        if (resHrms && resHrms.message) msg = resHrms.message;
        success = true;
      }

      if (success) {
        setPasswordSuccess(msg);
        setNewPassword('');
        setConfirmPassword('');
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

  const departmentName = employeeDetails?.department || 'General Operations';
  const designationTitle = employeeDetails?.designation || user?.role || 'Staff / Employee';
  const employeeCode = employeeDetails?.code || user?.id || '—';
  const phoneNo = employeeDetails?.phone || user?.phone || '—';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Profile & Account"
        subtitle="Manage your personal profile, workplace identity, and account security credentials."
        breadcrumb={['Employee', 'Profile & Account']}
      />

      {/* 1. Header Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-purple-600/20 shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate">{displayName}</h2>
              <Badge variant="success" dot className="font-bold">Active</Badge>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-800">
                {user?.role || 'EMPLOYEE'}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-medium mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-slate-800">{designationTitle}</span>
              <span className="text-slate-300">•</span>
              <span>{departmentName}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono">{user?.email || 'Active Staff'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Employee Code</div>
                <div className="text-xs font-black text-purple-700 font-mono mt-0.5">{employeeCode}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Department</div>
                <div className="text-xs font-bold text-slate-800 truncate mt-0.5">{departmentName}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Registered Mobile</div>
                <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">{phoneNo}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">Branch Location</div>
                <div className="text-xs font-bold text-slate-800 truncate mt-0.5">{employeeDetails?.vahd_branch || employeeDetails?.branch_name || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Password Reset & Account Security (Primary feature requested) */}
        <div className="lg:col-span-7 space-y-6">
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
                      <Icon name="check" size={15} />
                      <span>Set My Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900">Monthly Attendance & Performance</h3>
            <BarChart data={[28, 32, 35, 38, 42, 45]} labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']} height={190} color="#7c3aed" />
          </div>
        </div>

        {/* Right Column: Workplace Profile & Skills */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Icon name="briefcase" size={16} className="text-purple-600" />
              <h3 className="text-sm font-black text-slate-900">Workplace Details</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Department</span>
                <span className="font-bold text-slate-900">{departmentName}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Designation</span>
                <span className="font-bold text-slate-900">{designationTitle}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Employment Status</span>
                <span className="font-bold text-emerald-600">{employeeDetails?.status || 'Active'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Joined Date</span>
                <span className="font-bold text-slate-900">{employeeDetails?.joined_date || 'Enrolled'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-medium">Primary Campus</span>
                <span className="font-bold text-slate-900">{employeeDetails?.vahd_branch || 'Main Campus'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Icon name="award" size={16} className="text-purple-600" />
              <h3 className="text-sm font-black text-slate-900">Specializations & Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'Academic Instruction',
                'Curriculum Operations',
                'Student Counseling',
                'Attendance Coordination',
                'Department Workflow'
              ].map((s) => (
                <span key={s} className="px-3 py-1 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const employeeProfilePage = EmployeeProfilePage;
