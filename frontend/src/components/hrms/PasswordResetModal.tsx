import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { hrmsApi } from '@/services/hrmsApi';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'student' | 'employee';
  targetId: string;
  targetName: string;
  targetEmail: string;
  targetCode?: string;
  onSuccess?: (msg: string) => void;
}

export function PasswordResetModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  targetEmail,
  targetCode,
  onSuccess,
}: PasswordResetModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const generated = `Pass@${rand}`;
    setNewPassword(generated);
    setConfirmPassword(generated);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await hrmsApi.resetPassword({
        target_type: targetType,
        target_id: targetId,
        new_password: newPassword.trim(),
      });

      if (onSuccess) {
        onSuccess(res.message || `Password for ${targetName} updated successfully.`);
      }
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to reset password. Please check backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="key" size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Reset Account Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Set a customized password for this user
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* User Profile Summary Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {targetName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                  {targetType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                {targetEmail || 'No email associated'}
              </p>
            </div>
            {targetCode && (
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shrink-0">
                {targetCode}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <Icon name="alert-circle" size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Customized Password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 hover:underline flex items-center gap-1"
                >
                  <Icon name="sparkles" size={12} />
                  <span>Generate Password</span>
                </button>
              </div>
              <div className="relative">
                <Icon
                  name="lock"
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter custom new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <Icon
                  name="check-circle"
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
              💡 The user will immediately be able to sign in using their registered email and this updated password across all portals.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading && <Icon name="loader" size={14} className="animate-spin" />}
                <span>{loading ? 'Updating Password...' : 'Save Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

