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
      // Dynamic authentication: backend resolves user role directly from database
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

  return (
    <div
      className={cn(
        'min-h-screen w-full flex items-center justify-center transition-colors duration-300 font-sans p-4 sm:p-6 lg:p-10',
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      )}
    >
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

        {/* LEFT COLUMN: Hero & Features Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8 pr-0 lg:pr-6 relative">

          {/* Top Brand Header */}
          <div className="flex items-center">
            <Logo size="lg" />
          </div>

          {/* Main Hero Banner Container */}
          <div className="relative">

            {/* Headline */}
            <div className="space-y-4 max-w-xl z-10 relative">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white font-serif">
                The AI-Powered<br />
                <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Enterprise Platform</span>
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                Unified institutional portal — manage organisations, staff HRMS, student enrollment, biometric attendance &amp; analytics seamlessly.
              </p>
            </div>

            {/* Features Badge Grid */}
            <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-xl z-10 relative">

              {/* Feature 1 */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="sparkles" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">AI Insights</div>
                  <div className="text-[11px] text-slate-400 font-medium">Personalized Intelligence</div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="fingerprint" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Smart Attendance</div>
                  <div className="text-[11px] text-slate-400 font-medium">Biometric &amp; Geofence Sync</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="users" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">HRMS &amp; Staff</div>
                  <div className="text-[11px] text-slate-400 font-medium">Payroll, Shifts &amp; Leaves</div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-all group">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon name="graduation-cap" size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Students Portal</div>
                  <div className="text-[11px] text-slate-400 font-medium">Enrollment &amp; Records</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Elevated Login Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div
            className={cn(
              'w-full max-w-md rounded-[32px] p-7 sm:p-9 transition-all duration-300 relative shadow-2xl border',
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80'
                : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/80'
            )}
          >

            {/* Top Bar: Security Badge & Theme Toggle */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-extrabold">
                <Icon name="shield-check" size={14} />
                <span>Enterprise Portal</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Toggle Theme"
              >
                <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-2xs">
                  <Icon name="sun" size={13} className={cn(!isDarkMode ? 'text-amber-500 font-bold' : 'text-slate-400')} />
                  <Icon name="moon" size={13} className={cn(isDarkMode ? 'text-blue-400 font-bold' : 'text-slate-400')} />
                </span>
              </button>
            </div>

            {/* Welcome Header */}
            <div className="text-center mb-6 space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome Back 👋
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {`${getISTGreeting()}! Enter your credentials to access your dashboard.`}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-2xs">
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
                  <Icon name="mail" size={18} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.com or admin@vahd.ai"
                    autoComplete="email"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                  {isValidEmail && (
                    <Icon name="check-circle" size={18} className="absolute right-3.5 text-emerald-500 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Icon name="lock" size={18} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
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
                  onClick={() => setError('Password reset instructions sent to your email.')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all mt-4 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Icon name="refresh-cw" size={17} className="animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Icon name="log-in" size={17} />
                    <span>Sign In</span>
                    <Icon name="arrow-right" size={16} />
                  </>
                )}
              </button>

            </form>

            {/* Enterprise Security Footer */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Icon name="shield-check" size={15} className="text-emerald-500" />
              <span> </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
