import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/config/navigation';
import { cn } from '@/utils/cn';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeRole, setActiveRole] = useState<'admin' | 'owner' | 'trainer' | 'customer'>('owner');
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
      const user = await login(email, password, activeRole);
      navigate(roleHomePath[user.role]);
    } catch (err: any) {
      setError(
        err?.message || 'Invalid credentials. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectQuickRole = (role: 'admin' | 'owner' | 'trainer' | 'customer') => {
    setActiveRole(role);
    setError('');
  };

  const roleTitleMap = {
    admin: 'Super Admin Portal',
    owner: 'Gym Owner Portal',
    trainer: 'Trainer Portal',
    customer: 'Customer Portal',
  };

  const roleButtonMap = {
    admin: 'Sign In as Admin',
    owner: 'Sign In as Gym Owner',
    trainer: 'Sign In as Trainer',
    customer: 'Sign In as Customer',
  };

  return (
    <div className={cn(
      'min-h-screen w-full flex items-center justify-center transition-colors duration-300 font-sans p-4 sm:p-6 lg:p-10',
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
    )}>
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

        {/* LEFT COLUMN: Hero & Features Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8 pr-0 lg:pr-6 relative">
          
          {/* Top Brand Header */}
          <div className="flex items-center justify-between">
            <Logo size="lg" />
            <button
              type="button"
              onClick={() => navigate('/download')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/80 shadow-xs transition"
            >
              <Icon name="download" size={14} className="text-blue-600" />
              <span>Download Desktop App</span>
            </button>
          </div>

          {/* Main Hero Banner Container */}
          <div className="relative">

            {/* Headline */}
            <div className="space-y-4 max-w-xl z-10 relative">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-slate-900">
                The AI-Powered<br />
                <span className="text-blue-600">Platform</span>
              </h1>
              <p className="text-base text-slate-500 font-medium leading-relaxed max-w-lg">
                Manage members, staff, sales, POS billing, attendance, analytics &amp; more — seamlessly.
              </p>
            </div>

            {/* Features Badge Grid */}
            <div className="grid grid-cols-2 gap-3.5 mt-8 max-w-xl z-10 relative">
              
              {/* Feature 1 */}
              <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Icon name="sparkles" size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">AI Coach</div>
                  <div className="text-[10px] text-slate-400 font-medium">Personalized Plans</div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Icon name="fingerprint" size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Smart Attendance</div>
                  <div className="text-[10px] text-slate-400 font-medium">Biometric &amp; Live Sync</div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Icon name="activity" size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Analytics</div>
                  <div className="text-[10px] text-slate-400 font-medium">Real-time Insights</div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0">
                  <Icon name="smartphone" size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Member App</div>
                  <div className="text-[10px] text-slate-400 font-medium">Mobile Companion</div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Elevated Login & Registration Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className={cn(
            'w-full max-w-md rounded-[32px] p-6 sm:p-8 transition-all duration-300 relative shadow-2xl border',
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-200/80'
          )}>
            
            {/* Top Right Theme Toggle Switch & Dynamic Role Badge */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-extrabold capitalize">
                <Icon name="shield" size={14} />
                <span>{roleTitleMap[activeRole]}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
              >
                <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-xs">
                  <Icon name="sun" size={13} className={cn(!isDarkMode ? 'text-amber-500 font-bold' : 'text-slate-400')} />
                  <Icon name="moon" size={13} className={cn(isDarkMode ? 'text-blue-400 font-bold' : 'text-slate-400')} />
                </span>
              </button>
            </div>            {/* Welcome Header */}
            <div className="text-center mb-6 space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {`${roleTitleMap[activeRole]} 👋`}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                {`Enter your credentials to access your ${activeRole} portal`}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Icon name="alert-triangle" size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeRole === 'owner' ? 'Owner Email' : activeRole === 'admin' ? 'Admin Email' : activeRole === 'trainer' ? 'Trainer Email' : 'Customer Email'}
                </label>
                <div className="relative flex items-center">
                  <Icon name="mail" size={18} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeRole === 'owner' ? 'owner@fitclub.com' : activeRole === 'admin' ? 'admin@fitclub.com' : activeRole === 'trainer' ? 'trainer@fitclub.com' : 'customer@fitclub.com'}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  {isValidEmail && (
                    <Icon name="check-circle" size={18} className="absolute right-3.5 text-emerald-500 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative flex items-center">
                  <Icon name="lock" size={18} className="absolute left-3.5 text-blue-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setError('Password reset instructions sent to your email.')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all mt-3 disabled:opacity-60"
              >
                <Icon name="log-in" size={18} />
                <span>
                  {loading ? 'Authenticating...' : roleButtonMap[activeRole]}
                </span>
                <Icon name="arrow-right" size={16} />
              </button>

            </form>

            {/* Quick Access Roles Selector (Admin, Owner, Trainer, Customer) */}
            <div className="mt-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Quick access roles</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => selectQuickRole('admin')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-extrabold transition-all text-center',
                    activeRole === 'admin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                  )}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickRole('owner')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-extrabold transition-all text-center',
                    activeRole === 'owner'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300'
                  )}
                >
                  Owner
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickRole('trainer')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-extrabold transition-all text-center',
                    activeRole === 'trainer'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                  )}
                >
                  Trainer
                </button>
                <button
                  type="button"
                  onClick={() => selectQuickRole('customer')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-extrabold transition-all text-center',
                    activeRole === 'customer'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 scale-[1.02]'
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300'
                  )}
                >
                  Customer
                </button>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Icon name="shield-check" size={15} className="text-blue-500" />
              <span>Secure • Encrypted • PostgreSQL Sync</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
