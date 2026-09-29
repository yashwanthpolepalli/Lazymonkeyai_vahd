import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

export function DownloadPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'windows' | 'mac'>('all');

  const releaseVersion = '1.0.0';
  const windowsDownloadUrl = '/downloads/FIT-CLUB-AI-Setup-1.0.0.exe';
  const macDownloadUrl = '/downloads/FIT-CLUB-AI-1.0.0.dmg';

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-500 selection:text-white relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-600/20 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Header Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
          <img
            src="/icon.png"
            alt="LazyMonkey AI"
            className="w-10 h-10 rounded-2xl object-contain shadow-glow border border-white/10"
          />
          <div>
            <div className="text-lg font-black tracking-tight flex items-center gap-1.5 text-white">
              <span>LazyMonkey</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI</span>
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase -mt-0.5">
              VAHD
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
          >
            <span>Open Web App</span>
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
      </header>

      {/* Main Hero & Downloads */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-6 py-12 md:py-16 flex flex-col items-center text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-emerald-400 mb-6 backdrop-blur-md shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Desktop Apps v{releaseVersion} Released</span>
        </div>

        {/* Mascot Logo Centerpiece */}
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition duration-500" />
          <img
            src="/icon.png"
            alt="VAHD Logo"
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-contain shadow-2xl border border-white/15 p-2 bg-slate-900/80 backdrop-blur-xl"
          />
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.1]">
          VAHD
        </h1>
        <p className="text-base sm:text-xl font-medium text-slate-300 mt-3 max-w-2xl">
          Fitness & Gym Management Platform
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
          All-in-one desktop experience for Gym Owners, Staff & Front-desk POS. High-performance offline caching, direct thermal printer & biometric sync.
        </p>

        {/* Download Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12">
          {/* Windows Download Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center hover:border-cyan-500/40 hover:bg-slate-900/80 transition group shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/10 border-b border-l border-cyan-500/20 text-[10px] font-bold text-cyan-400 rounded-bl-xl">
              64-bit Installer
            </div>

            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition duration-300">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.95" />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Download for Windows</h3>
              <p className="text-xs text-slate-400 mt-1">Windows 10 / 11 (64-bit)</p>
              <div className="text-[11px] font-semibold text-cyan-400/90 mt-2">
                FIT CLUB AI Setup {releaseVersion}.exe
              </div>
            </div>

            <a
              href={windowsDownloadUrl}
              download="FIT-CLUB-AI-Windows.exe"
              className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-[0.98]"
            >
              <Icon name="download" size={18} />
              <span>Download .EXE</span>
            </a>
          </div>

          {/* macOS Download Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center hover:border-purple-500/40 hover:bg-slate-900/80 transition group shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500/10 border-b border-l border-purple-500/20 text-[10px] font-bold text-purple-400 rounded-bl-xl">
              Apple Silicon & Intel
            </div>

            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition duration-300">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-0.95 2.76 1.01.08 2.05-.51 2.68-1.26z" />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Download for macOS</h3>
              <p className="text-xs text-slate-400 mt-1">macOS 11.0+ (Universal DMG)</p>
              <div className="text-[11px] font-semibold text-purple-400/90 mt-2">
                FIT CLUB AI {releaseVersion}.dmg
              </div>
            </div>

            <a
              href={macDownloadUrl}
              download="FIT-CLUB-AI-macOS.dmg"
              className="mt-6 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition active:scale-[0.98]"
            >
              <Icon name="download" size={18} />
              <span>Download .DMG</span>
            </a>
          </div>
        </div>

        {/* macOS First-Time Installation Tip */}
        <div className="mt-6 max-w-3xl w-full p-4 rounded-2xl bg-purple-950/30 border border-purple-800/40 text-left text-xs text-purple-200/90 flex items-start gap-3 shadow-inner">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="info" size={14} />
          </div>
          <div>
            <span className="font-bold text-white block mb-0.5">First-time open on macOS:</span>
            <span>If macOS Gatekeeper shows an unverified developer prompt, simply <strong>Right-Click (Control+Click)</strong> the app and click <strong>Open → Open Anyway</strong>, or go to <strong>System Settings → Privacy & Security → Open Anyway</strong>.</span>
          </div>
        </div>

        {/* Web App Alternate Option */}
        <div className="mt-12 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-md w-full flex items-center justify-between">
          <div className="text-left">
            <div className="text-xs font-bold text-white">Prefer using the browser?</div>
            <div className="text-[11px] text-slate-400">Access your cloud portal instantly</div>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-black transition active:scale-95 flex items-center gap-1"
          >
            <span>Launch Web App</span>
            <Icon name="arrow-right" size={13} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>© 2026 LazyMonkey AI Inc. All rights reserved.</div>
        <div className="flex items-center gap-4 text-slate-400">
          <span className="hover:text-white cursor-pointer" onClick={() => navigate('/privacy')}>Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-white cursor-pointer" onClick={() => navigate('/login')}>Sign In</span>
        </div>
      </footer>
    </div>
  );
}
