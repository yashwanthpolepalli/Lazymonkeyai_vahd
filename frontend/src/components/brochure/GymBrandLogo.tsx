import React from 'react';

export interface GymBrandLogoProps {
  logoUrl?: string;
  logoPreset?: string;
  primaryColor?: string;
  accentColor?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  sizePx?: number;
  bgStyle?: 'transparent' | 'glass-dark' | 'glow-gold' | 'solid-white' | 'solid-dark';
  shape?: 'circle' | 'squircle' | 'rect' | 'none';
  brandText?: string;
  showText?: boolean;
  textColor?: string;
}

export function GymBrandLogo({
  logoUrl,
  logoPreset = 'kettlebell-bolt',
  primaryColor = '#EAB308',
  accentColor = '#CA8A04',
  className = '',
  size = 'md',
  sizePx,
  bgStyle = 'glass-dark',
  shape = 'squircle',
  brandText,
  showText = false,
  textColor = '#FFFFFF',
}: GymBrandLogoProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const currentSizeClass = sizePx ? '' : sizeMap[size];
  const customInlineStyle = sizePx
    ? { width: `${sizePx}px`, height: `${sizePx}px`, minWidth: `${sizePx}px`, minHeight: `${sizePx}px` }
    : undefined;

  const shapeClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'rect'
      ? 'rounded-lg'
      : shape === 'none'
      ? ''
      : 'rounded-2xl';

  const bgClasses =
    bgStyle === 'transparent'
      ? 'bg-transparent'
      : bgStyle === 'glow-gold'
      ? 'bg-slate-950/90 border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]'
      : bgStyle === 'solid-white'
      ? 'bg-white border border-slate-200 shadow-md'
      : bgStyle === 'solid-dark'
      ? 'bg-slate-950 border border-slate-800 shadow-md'
      : 'bg-slate-950/80 backdrop-blur-md border border-yellow-500/40 shadow-xl';

  const renderEmblem = () => {
    // If a custom uploaded logo image is provided, display it
    if (logoUrl) {
      return (
        <div
          className={`relative flex items-center justify-center overflow-hidden p-1 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <img
            src={logoUrl}
            alt="Custom Gym Logo"
            className="w-full h-full object-contain"
            crossOrigin="anonymous"
          />
          {bgStyle !== 'transparent' && shape !== 'none' && (
            <div className={`absolute inset-0 border border-white/10 pointer-events-none ${shapeClass}`} />
          )}
        </div>
      );
    }

    // Preset 0: LazyMonkey FIT CLUB AI Official Mascot Logo
    if (logoPreset === 'lazymonkey' || logoPreset === 'fitclub-ai') {
      return (
        <div
          className={`relative flex items-center justify-center p-1 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <img
            src="/icon.png"
            alt="LazyMonkey FIT CLUB AI"
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
      );
    }

    // Vector Preset 1: Kettlebell with Lightning Bolt (Powerzone Style)
    if (logoPreset === 'kettlebell-bolt') {
      return (
        <div
          className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <path
              d="M 30 45 C 30 18, 70 18, 70 45"
              fill="none"
              stroke={primaryColor}
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="50" cy="62" r="32" fill="#141414" stroke={primaryColor} strokeWidth="6" />
            <polygon
              points="53,38 39,60 48,60 45,78 61,54 52,54"
              fill={primaryColor}
              stroke="#000000"
              strokeWidth="1"
            />
            <rect x="8" y="52" width="6" height="20" rx="3" fill={primaryColor} opacity="0.9" />
            <rect x="86" y="52" width="6" height="20" rx="3" fill={primaryColor} opacity="0.9" />
            <line x1="6" y1="62" x2="16" y2="62" stroke={primaryColor} strokeWidth="4" />
            <line x1="84" y1="62" x2="94" y2="62" stroke={primaryColor} strokeWidth="4" />
          </svg>
        </div>
      );
    }

    // Vector Preset 2: Spartan Helmet Crest with Wings (Discipline Poster Style)
    if (logoPreset === 'spartan-crest') {
      return (
        <div
          className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <path
              d="M 50 15 C 32 15 25 32 25 50 C 25 68 35 85 45 88 L 45 62 L 35 62 L 35 50 L 65 50 L 65 62 L 55 62 L 55 88 C 65 85 75 68 75 50 C 75 32 68 15 50 15 Z"
              fill={primaryColor}
            />
            <path d="M 46 8 C 46 8 50 2 54 8 L 54 22 L 46 22 Z" fill={accentColor} />
            <polygon points="38,42 47,46 47,42 38,38" fill="#000000" />
            <polygon points="62,42 53,46 53,42 62,38" fill="#000000" />
            <polygon points="12,38 24,30 20,48" fill={primaryColor} opacity="0.85" />
            <polygon points="88,38 76,30 80,48" fill={primaryColor} opacity="0.85" />
          </svg>
        </div>
      );
    }

    // Vector Preset 3: Iron Bicep with Barbell (Fit with Sahil Style)
    if (logoPreset === 'bicep-barbell') {
      return (
        <div
          className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <path
              d="M 30 75 C 20 65 22 45 35 38 C 48 30 65 32 72 45 C 78 55 75 70 65 78 C 55 82 40 82 30 75 Z"
              fill={primaryColor}
            />
            <circle cx="52" cy="42" r="14" fill="#000000" opacity="0.25" />
            <circle cx="68" cy="46" r="9" fill={primaryColor} />
            <line x1="10" y1="52" x2="90" y2="52" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <rect x="12" y="38" width="6" height="28" rx="3" fill={primaryColor} />
            <rect x="20" y="42" width="5" height="20" rx="2" fill="#FFFFFF" />
            <rect x="82" y="38" width="6" height="28" rx="3" fill={primaryColor} />
            <rect x="75" y="42" width="5" height="20" rx="2" fill="#FFFFFF" />
          </svg>
        </div>
      );
    }

    // Vector Preset 4: Flame Bull / Beast
    if (logoPreset === 'flame-bull') {
      return (
        <div
          className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <path
              d="M 50 10 C 35 30 20 45 25 70 C 28 85 42 95 50 95 C 58 95 72 85 75 70 C 80 45 65 30 50 10 Z"
              fill={primaryColor}
            />
            <path
              d="M 50 35 C 40 50 35 60 40 78 C 44 86 50 88 50 88 C 50 88 56 86 60 78 C 65 60 60 50 50 35 Z"
              fill="#FFFFFF"
            />
            <path d="M 22 55 C 10 40 15 22 25 20 C 28 32 32 42 38 48 Z" fill={accentColor} />
            <path d="M 78 55 C 90 40 85 22 75 20 C 72 32 68 42 62 48 Z" fill={accentColor} />
          </svg>
        </div>
      );
    }

    // Vector Preset 5: Crown Elite
    if (logoPreset === 'crown-elite') {
      return (
        <div
          className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
          style={customInlineStyle}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <polygon
              points="15,75 85,75 90,35 68,52 50,22 32,52 10,35"
              fill={primaryColor}
              stroke={accentColor}
              strokeWidth="3"
            />
            <rect x="15" y="78" width="70" height="8" rx="3" fill={accentColor} />
            <circle cx="10" cy="33" r="4" fill="#FFFFFF" />
            <circle cx="50" cy="20" r="5" fill="#FFFFFF" />
            <circle cx="90" cy="33" r="4" fill="#FFFFFF" />
          </svg>
        </div>
      );
    }

    // Vector Preset 6: Shield Gym
    return (
      <div
        className={`relative flex items-center justify-center p-1.5 ${shapeClass} ${bgClasses} ${currentSizeClass} ${className}`}
        style={customInlineStyle}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <path
            d="M 50 8 L 85 22 L 85 55 C 85 75 50 92 50 92 C 50 92 15 75 15 55 L 15 22 Z"
            fill="#111827"
            stroke={primaryColor}
            strokeWidth="6"
          />
          <polygon points="50,28 58,45 76,45 61,56 67,73 50,62 33,73 39,56 24,45 42,45" fill={primaryColor} />
        </svg>
      </div>
    );
  };

  if (showText && brandText) {
    return (
      <div className="flex items-center gap-2 select-none">
        {renderEmblem()}
        <span
          className="font-black tracking-wider uppercase text-xs truncate"
          style={{ color: textColor }}
        >
          {brandText}
        </span>
      </div>
    );
  }

  return renderEmblem();
}
