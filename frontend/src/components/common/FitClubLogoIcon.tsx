import React from 'react';

export function FitClubLogoIcon({ className = "w-8 h-8", isDarkBg = false }: { className?: string; isDarkBg?: boolean }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden ${isDarkBg ? 'bg-white shadow-md shadow-orange-500/10 ring-1 ring-white/20' : 'bg-white shadow-sm ring-1 ring-slate-200'} ${className}`}>
      <img
        src="/logo.png"
        alt="VAHD Logo"
        className="w-full h-full object-cover object-center p-0.5"
        loading="eager"
      />
    </div>
  );
}
