import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/config/navigation';
import { cn } from '@/utils/cn';
import { getISTGreeting } from '@/utils/date';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = email.includes('@') && email.includes('.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password);
      const destination = roleHomePath[user.role] || '/app';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(
        err?.message || 'Invalid email or password. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div
      className={cn(
        'min-h-screen w-full flex items-center justify-center transition-colors duration-300 font-sans p-4 sm:p-6 lg:p-10 relative overflow-hidden',
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#FAFBFD] text-slate-900'
      )}
    >
      {/* Ambient Flowing Wave Graphic smoothly blended in background */}
      <div className="absolute right-0 top-0 w-full max-w-[900px] h-[340px] pointer-events-none select-none z-0 overflow-hidden">
        <img
          src="/dashboard-banner-bg.png"
          alt=""
          className="w-full h-full object-cover object-right opacity-80 pointer-events-none select-none"
        />
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* LEFT COLUMN: Hero & Features Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8 pr-0 lg:pr-6 relative">
          {/* Top Brand Header */}
          <div className="flex items-center gap-3">
            <Logo size="lg" />
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
            <span className="hidden sm:inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100/90 text-purple-700 border border-purple-200/60 shadow-2xs">
              HEAD OFFICE &amp; ENTERPRISE PORTAL
            </span>
          </div>

          {/* Main Hero Banner Container */}
          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white">
              The All-in-One <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent">
                Institutional Platform
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
              Unified portal for Head Office administrators, organization owners, and staff — managing branches, biometrics, HRMS, and student enrollment from a single glasspane.
            </p>

            {/* Feature Cards matching Dashboard KPI card system */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              {/* Feature 1: Multi-Branch */}
              <div className="rounded-2xl border border-slate-200/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3.5 shadow-2xs flex items-center gap-3 group hover:border-purple-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Icon name="building-2" size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    Multi-Branch Control
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium truncate">
                    Cross-campus hierarchy
                  </div>
                </div>
              </div>

              {/* Feature 2: HRMS & Biometrics */}
              <div className="rounded-2xl border-2 border-sky-400/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3.5 shadow-2xs flex items-center gap-3 group hover:border-sky-500 transition-all">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0 border border-sky-100">
                  <Icon name="users" size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    HRMS &amp; Staff
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold truncate">
                    Biometric &amp; shifts sync
                  </div>
                </div>
              </div>

              {/* Feature 3: Student Enrollment */}
              <div className="rounded-2xl border border-amber-300/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3.5 shadow-2xs flex items-center gap-3 group hover:border-amber-400 transition-all">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Icon name="graduation-cap" size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    Student Directory
                  </div>
                  <div className="text-[11px] text-blue-600 font-medium truncate">
                    Enrollment &amp; sessions
                  </div>
                </div>
              </div>

              {/* Feature 4: Live Reports */}
              <div className="rounded-2xl border border-slate-200/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-3.5 shadow-2xs flex items-center gap-3 group hover:border-rose-300 transition-all">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                  <Icon name="activity" size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    Live Matrix
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium truncate">
                    Excel &amp; PDF exports
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Elevated Login Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div
            className={cn(
              'w-full max-w-md rounded-[28px] p-7 sm:p-9 transition-all duration-300 relative shadow-xl border',
              isDarkMode
                ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/80 backdrop-blur-xl'
                : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/50 backdrop-blur-xl'
            )}
          >
            {/* Top Bar: Security Badge & Theme Toggle */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70 text-[11px] font-black uppercase tracking-wider">
                <Icon name="shield-check" size={13} className="text-purple-600" />
                <span>Enterprise Portal</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Toggle Theme"
              >
                <Icon name={isDarkMode ? 'sun' : 'moon'} size={13} className={isDarkMode ? 'text-amber-400' : 'text-slate-500'} />
              </button>
            </div>

            {/* Welcome Header */}
            <div className="text-center mb-6 space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome Back 👋
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {`${getISTGreeting()}! Sign in to access your administrative workspace.`}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-2xs">
                <Icon name="alert-triangle" size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email / Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Icon name="mail" size={16} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ho@vahd.com or owner@vahd.com"
                    autoComplete="email"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                  {isValidEmail && (
                    <Icon name="check-circle" size={16} className="absolute right-3.5 text-emerald-500 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Icon name="lock" size={16} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Password reset link sent to your email.')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button with Signature Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all mt-3 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Icon name="refresh-cw" size={15} className="animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <Icon name="log-in" size={15} />
                    <span>Sign In to Dashboard</span>
                    <Icon name="arrow-right" size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Fill Pills */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
                Demo Accounts (Click to Fill)
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('ho@vahd.com')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/70 transition-colors cursor-pointer"
                >
                  🏛️ HO Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('owner@vahd.com')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 transition-colors cursor-pointer"
                >
                  👑 Primary Owner
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('emp1@vahd.com')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 transition-colors cursor-pointer"
                >
                  💼 Staff EMP
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
