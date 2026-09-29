import React, { forwardRef } from 'react';
import type { BrochureData } from '@/types/brochure';
import { Icon } from '@/components/ui/Icon';
import { GymBrandLogo } from './GymBrandLogo';

interface BrochurePreviewCanvasProps {
  data: BrochureData;
  scale?: number;
  width?: number;
  height?: number;
}

export const BrochurePreviewCanvas = forwardRef<HTMLDivElement, BrochurePreviewCanvasProps>(
  ({ data, scale = 1, width = 640, height = 880 }, ref) => {
    const { templateId, customColors, fontTheme } = data;

    // Font theme styling
    const fontClass =
      fontTheme === 'serif-luxury'
        ? 'font-serif'
        : fontTheme === 'cyber-futuristic'
        ? 'tracking-wide font-sans'
        : fontTheme === 'clean-minimal'
        ? 'font-sans font-light'
        : fontTheme === 'distressed-heavy'
        ? 'font-sans tracking-tight'
        : 'font-sans font-bold';

    // QR Code placeholder SVG / URL generator or custom uploaded QR
    const qrSvgUrl =
      data.customQrUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
        data.qrCodeText || 'https://fitclub.ai'
      )}&color=${customColors.bgDark.replace('#', '')}&bgcolor=ffffff`;

    const logoSizePx = data.logoSize || 52;
    const logoBgStyle = data.logoBgStyle || 'glass-dark';
    const bgImage = data.heroImage || '/assets/brochures/powerzone_bg.jpg';

    return (
      <div
        className="flex items-center justify-center p-2 transition-transform duration-200 origin-top"
        style={{ transform: `scale(${scale})` }}
      >
        <div
          ref={ref}
          id="brochure-export-node"
          className={`relative rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col justify-between select-none ${fontClass}`}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: customColors.bgDark,
            boxShadow: `0 25px 50px -12px ${customColors.primary}25, 0 0 0 1px ${customColors.primary}33`,
          }}
        >
          {/* =========================================================
              TEMPLATE 1: POWERZONE KINETIC GOLD (PURE NATIVE VECTOR LAYOUT)
          ========================================================= */}
          {templateId === 'powerzone-split' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#0e0e0e] via-[#090909] to-[#040404] overflow-hidden">
              {/* Dynamic Background Image Layer */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Brochure Background"
                  className="w-full h-full object-cover opacity-35 filter contrast-125 brightness-75"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
              </div>

              {/* Gold Dot Texture Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(#eab30812_1.5px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none opacity-60 z-0" />
              <div
                className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 z-0"
                style={{ background: customColors.primary }}
              />

              {/* Dynamic Angled Photo Split on Right Half */}
              <div className="absolute top-16 right-0 w-[300px] h-[520px] pointer-events-none overflow-hidden z-10">
                <div
                  className="absolute inset-0 transform -skew-x-12 translate-x-8 border-l-4 opacity-80"
                  style={{ borderColor: customColors.primary }}
                />
                <div className="absolute inset-0 transform -skew-x-12 translate-x-12 overflow-hidden rounded-3xl shadow-2xl">
                  <img
                    src={
                      data.secondaryImages?.action1 ||
                      data.heroImage ||
                      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80'
                    }
                    alt="Athlete Training"
                    className="w-full h-full object-cover transform skew-x-12 scale-110 brightness-90 contrast-110"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                </div>
              </div>

              {/* TOP HEADER: Gym Brand & 3 Focus Badges */}
              <div className="relative z-20 flex items-center justify-between gap-4 pb-3 border-b border-yellow-500/25">
                {/* Gym Logo & Title */}
                <div className="flex items-center gap-3">
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'kettlebell-bolt'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                  <div>
                    <h2 className="text-2xl font-black tracking-wider uppercase text-white drop-shadow-md leading-none">
                      {data.gymName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-3.5 h-0.5" style={{ background: customColors.primary }} />
                      <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: customColors.primary }}>
                        {data.gymTagline || 'FITNESS CLUB • YOUR BEST BEGINS HERE'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Top Badges */}
                <div className="flex items-center gap-2">
                  {(data.bulletHighlights && data.bulletHighlights.length >= 3
                    ? data.bulletHighlights.slice(0, 3)
                    : [
                        { title: 'STRONGER', desc: 'BODY', icon: 'dumbbell' },
                        { title: 'BETTER', desc: 'HEALTH', icon: 'heart-pulse' },
                        { title: 'BIGGER', desc: 'GOALS', icon: 'target' },
                      ]
                  ).map((badge, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-yellow-500/40 px-2.5 py-1.5 rounded-full shadow-lg"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-black shadow"
                        style={{ background: customColors.primary }}
                      >
                        <Icon name={badge.icon || 'zap'} size={12} className="text-black" />
                      </div>
                      <div className="leading-tight text-left pr-1">
                        <p className="text-[9px] font-black uppercase text-white tracking-wider">{badge.title}</p>
                        <p className="text-[8px] font-bold uppercase tracking-wide" style={{ color: customColors.primary }}>
                          {badge.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MAIN HERO BODY: Giant Typography & Highlight Pills */}
              <div className="relative z-20 my-auto grid grid-cols-12 gap-3 py-4">
                <div className="col-span-7 flex flex-col justify-center space-y-3">
                  {/* Huge Bold Headline */}
                  <div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-[0.88]">
                      {data.headline.split(' ')[0] || 'FITNESS'}
                    </h1>
                    <h1
                      className="text-6xl font-black uppercase tracking-tighter leading-[0.85] mt-1 drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]"
                      style={{
                        color: customColors.primary,
                        WebkitTextStroke: '1px rgba(0,0,0,0.9)',
                      }}
                    >
                      {data.headline.split(' ').slice(1).join(' ') || 'CLUB'}
                    </h1>
                  </div>

                  {/* Slanted Brush Highlight Tag */}
                  <div className="relative inline-block">
                    <div
                      className="px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider text-black shadow-xl transform -rotate-1 inline-flex items-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${customColors.primary}, ${customColors.accent})`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                      <span>{data.badgeText || 'STRONGER BODY. STRONGER YOU.'}</span>
                    </div>
                  </div>

                  {/* FOCUS • TRAIN • TRANSFORM Pill */}
                  <div className="bg-black/90 backdrop-blur-md border border-yellow-500/40 rounded-xl p-2.5 flex items-center justify-around shadow-2xl max-w-[300px]">
                    <span className="text-[10px] font-black uppercase text-yellow-400">FOCUS</span>
                    <span className="text-white/30">•</span>
                    <span className="text-[10px] font-black uppercase text-white">TRAIN</span>
                    <span className="text-white/30">•</span>
                    <span className="text-[10px] font-black uppercase text-yellow-400">TRANSFORM</span>
                  </div>

                  {/* Pricing / Plan Perk */}
                  {data.pricing && (
                    <div className="bg-black/85 backdrop-blur-md border-l-4 border-yellow-400 px-3 py-2 rounded-r-xl max-w-[280px] shadow-lg">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{data.pricing.planName}</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-lg font-black text-white">{data.pricing.offerPrice}</span>
                        {data.pricing.originalPrice && (
                          <span className="text-xs line-through text-slate-500">{data.pricing.originalPrice}</span>
                        )}
                        <span className="text-[8.5px] text-slate-400">{data.pricing.period}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Callout Stamp */}
                <div className="col-span-5 flex flex-col items-end justify-end pb-3 pr-1">
                  <div className="bg-black/85 backdrop-blur-md border border-yellow-500/60 p-2.5 rounded-2xl shadow-2xl text-center max-w-[170px]">
                    <span className="text-xs font-black text-yellow-400">⚡</span>
                    <p className="text-[9.5px] font-black uppercase text-yellow-400 tracking-wider mt-0.5">
                      {data.accentStampText || 'BE STRONGER THAN YOUR EXCUSES'}
                    </p>
                  </div>
                </div>
              </div>

              {/* BOTTOM 4 FEATURE PERKS CARDS */}
              <div className="relative z-20 grid grid-cols-4 gap-2 pt-2.5 border-t border-yellow-500/25">
                {(data.checklistItems && data.checklistItems.length >= 4
                  ? data.checklistItems.slice(0, 4)
                  : [
                      { title: 'MODERN EQUIPMENT', subtitle: 'Train with the best.', icon: 'dumbbell' },
                      { title: 'EXPERT TRAINERS', subtitle: 'Guidance you can trust.', icon: 'user' },
                      { title: 'NUTRITION SUPPORT', subtitle: 'Fuel your body right.', icon: 'apple' },
                      { title: 'FLEXIBLE TIMINGS', subtitle: 'Workout on your schedule.', icon: 'clock' },
                    ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-black/85 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-2 flex flex-col items-center text-center shadow-xl hover:border-yellow-400 transition"
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center mb-1 text-black shadow-md"
                      style={{ background: customColors.primary }}
                    >
                      <Icon name={item.icon || 'check'} size={14} className="text-black" />
                    </div>
                    <p className="text-[9px] font-black text-white uppercase tracking-tight leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[7.5px] text-slate-400 mt-0.5 leading-snug">{item.subtitle}</p>
                  </div>
                ))}
              </div>

              {/* BOTTOM HIGH-CONVERTING BANNER */}
              <div className="relative z-20 mt-2.5">
                <div
                  className="w-full py-2 px-3.5 rounded-xl text-black font-black text-[11px] uppercase tracking-wider text-center shadow-2xl flex items-center justify-between"
                  style={{
                    background: `linear-gradient(90deg, ${customColors.primary}, ${customColors.accent})`,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>{data.bottomBannerText || 'JOIN TODAY & START YOUR TRANSFORMATION JOURNEY!'}</span>
                  </span>
                  <span className="bg-black text-white px-2 py-0.5 rounded-lg text-[8.5px] font-bold shadow-md">
                    📞 {data.contact.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 2: FIT CHALK MOTIVATION (IMAGE 2)
          ========================================================= */}
          {templateId === 'chalk-motivation' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-black overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Chalk Athlete Background"
                  className="w-full h-full object-cover opacity-40 filter contrast-125"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/70" />
              </div>

              {/* Top Header */}
              <div className="relative z-10 flex items-start justify-between gap-4 pb-3 border-b border-white/15">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-none drop-shadow-lg">
                    {data.headline.split(' ')[0] || 'FITNESS'}
                  </h1>
                  <h1
                    className="text-4xl font-black uppercase tracking-tight leading-none drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] mt-0.5"
                    style={{ color: customColors.primary }}
                  >
                    {data.headline.split(' ').slice(1).join(' ') || 'MOTIVATION'}
                  </h1>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="w-5 h-0.5" style={{ background: customColors.primary }} />
                    <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-200">
                      {data.subheadline || 'DISCIPLINE TODAY • STRENGTH TOMORROW'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-yellow-500/40 shadow-xl">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">COACH / GYM</p>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{data.gymName}</h3>
                  </div>
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'bicep-barbell'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                </div>
              </div>

              {/* 6 Steps & Quote */}
              <div className="relative z-10 my-auto grid grid-cols-12 gap-3 py-3">
                <div className="col-span-6 space-y-1.5">
                  {(data.checklistItems && data.checklistItems.length > 0
                    ? data.checklistItems
                    : [
                        { title: 'FOCUS', subtitle: 'ON YOUR GOAL', icon: 'target' },
                        { title: 'TRAIN', subtitle: 'HARD', icon: 'dumbbell' },
                        { title: 'BUILD', subtitle: 'YOUR STRENGTH', icon: 'flame' },
                        { title: 'EAT', subtitle: 'CLEAN', icon: 'apple' },
                        { title: 'SLEEP', subtitle: 'WELL', icon: 'bed' },
                        { title: 'STAY', subtitle: 'CONSISTENT', icon: 'refresh-cw' },
                      ]
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 bg-black/80 backdrop-blur-md border border-yellow-500/40 px-3 py-1.5 rounded-xl shadow-lg"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-black text-black shadow shrink-0"
                        style={{ background: `linear-gradient(135deg, ${customColors.primary}, ${customColors.accent})` }}
                      >
                        <Icon name={item.icon || 'check'} size={12} className="text-black" />
                      </div>
                      <div className="leading-tight">
                        <span className="text-[10px] font-black uppercase text-white tracking-wider block">
                          {item.title}
                        </span>
                        <span className="text-[8.5px] font-bold uppercase tracking-wide" style={{ color: customColors.primary }}>
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-span-6 flex flex-col items-center justify-center pl-2">
                  <div className="relative bg-black/85 backdrop-blur-md border-2 border-yellow-500/60 rounded-2xl p-4 shadow-2xl text-center w-full max-w-[220px]">
                    <span className="text-2xl text-yellow-400 font-serif leading-none absolute -top-3 left-3">“</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">
                      {data.quoteBox?.highlight || 'SORE TODAY'}
                    </p>
                    <p
                      className="text-xl font-black uppercase tracking-tight my-1 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                      style={{ color: customColors.primary }}
                    >
                      {data.quoteBox?.subtext || 'STRONG TOMORROW'}
                    </p>
                    <span className="text-2xl text-yellow-400 font-serif leading-none absolute -bottom-3 right-3">”</span>
                  </div>
                </div>
              </div>

              {/* Bottom 4 Badges */}
              <div className="relative z-10 grid grid-cols-4 gap-2 pt-2 border-t border-white/15 text-center">
                {(data.bulletHighlights && data.bulletHighlights.length >= 4
                  ? data.bulletHighlights.slice(0, 4)
                  : [
                      { title: 'EVERY DAY', desc: 'Is a chance to improve', icon: 'footprints' },
                      { title: 'PUSH YOURSELF', desc: 'Because no one else will', icon: 'activity' },
                      { title: 'YOUR BODY CAN', desc: "It's your mind to convince", icon: 'brain' },
                      { title: 'PAIN TODAY', desc: 'Is strength tomorrow', icon: 'trophy' },
                    ]
                ).map((pillar, idx) => (
                  <div key={idx} className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-1.5 flex flex-col items-center shadow-md">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center mb-0.5 text-black shadow"
                      style={{ background: customColors.primary }}
                    >
                      <Icon name={pillar.icon || 'zap'} size={11} />
                    </div>
                    <p className="text-[8px] font-black uppercase text-white leading-tight">{pillar.title}</p>
                    <p className="text-[6.5px] text-slate-300 mt-0.5 leading-snug">{pillar.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-2">
                <div
                  className="w-full py-2 px-3 rounded-xl text-black font-black text-[10px] uppercase tracking-widest text-center shadow-lg flex items-center justify-between"
                  style={{ background: `linear-gradient(90deg, ${customColors.primary}, ${customColors.accent})` }}
                >
                  <span>⚡ {data.bottomBannerText || 'NO EXCUSES. JUST RESULTS.'}</span>
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[8.5px] font-bold">
                    📞 {data.contact.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 3: SPARTAN DISCIPLINE (IMAGE 3)
          ========================================================= */}
          {templateId === 'spartan-discipline' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#0a0604] via-[#050302] to-[#020101] overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Spartan Gym Atmosphere"
                  className="w-full h-full object-cover opacity-35 filter contrast-125 brightness-75"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
              </div>

              {/* Header */}
              <div className="relative z-10 text-center pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm p-1.5 rounded-xl border border-amber-500/40">
                    <GymBrandLogo
                      logoUrl={data.logoUrl}
                      logoPreset={data.logoPreset || 'spartan-crest'}
                      primaryColor={customColors.primary}
                      accentColor={customColors.accent}
                      sizePx={logoSizePx}
                      bgStyle={logoBgStyle}
                      shape="squircle"
                    />
                    <div className="text-left">
                      <h3 className="text-xs font-black tracking-wider uppercase text-white">{data.gymName}</h3>
                      <p className="text-[8px] font-bold tracking-widest uppercase text-amber-400">{data.gymTagline}</p>
                    </div>
                  </div>

                  <div className="bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-red-600/40 text-right">
                    <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">
                      ⚡ DISCIPLINE BUILDS LEGENDS
                    </span>
                  </div>
                </div>

                <div className="mt-2 bg-black/70 backdrop-blur-sm py-2 px-4 rounded-2xl border border-amber-500/30 inline-block shadow-2xl">
                  <h1
                    className="text-4xl font-black uppercase tracking-tighter drop-shadow-[0_4px_12px_rgba(234,179,8,0.5)]"
                    style={{
                      background: 'linear-gradient(180deg, #FDE047 0%, #CA8A04 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    DISCIPLINE
                  </h1>
                  <div className="flex items-center justify-center gap-2 -my-1">
                    <span className="w-10 h-0.5 bg-red-600" />
                    <span className="text-xs font-black italic tracking-widest text-red-500">BEATS</span>
                    <span className="w-10 h-0.5 bg-red-600" />
                  </div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.7)]">
                    MOTIVATION
                  </h1>
                </div>

                <div className="mt-1.5 inline-block px-3 py-1 rounded-lg bg-black/80 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                  MOTIVATION GETS YOU STARTED. <span className="text-amber-400 font-black">DISCIPLINE KEEPS YOU GOING.</span>
                </div>
              </div>

              {/* 5 Rules */}
              <div className="relative z-10 my-auto grid grid-cols-12 gap-3 py-2">
                <div className="col-span-7 space-y-1.5">
                  {(data.checklistItems && data.checklistItems.length >= 5
                    ? data.checklistItems.slice(0, 5)
                    : [
                        { title: 'NO EXCUSES', subtitle: 'Show up, even when you do not feel like it.', icon: 'target' },
                        { title: 'BUILD HABITS', subtitle: 'Small actions done daily create big results.', icon: 'flame' },
                        { title: 'BE PATIENT', subtitle: 'Growth takes time. Trust the process.', icon: 'hourglass' },
                        { title: 'STAY FOCUSED', subtitle: 'Your mind quits before your body does.', icon: 'brain' },
                        { title: 'BE UNSTOPPABLE', subtitle: 'Discipline today, freedom tomorrow.', icon: 'crown' },
                      ]
                  ).map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 bg-black/80 backdrop-blur-sm border border-amber-500/40 p-1.5 rounded-xl shadow-lg"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-black font-black shrink-0 shadow">
                        <Icon name={rule.icon || 'shield'} size={12} className="text-black" />
                      </div>
                      <div className="leading-tight">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                          {rule.title}
                        </span>
                        <span className="text-[8px] text-slate-200 leading-snug">{rule.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="col-span-5 flex flex-col items-center justify-center">
                  <div className="p-3 bg-black/85 border border-red-600/60 rounded-2xl shadow-2xl w-full text-center">
                    <Icon name="crown" size={20} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-[11px] font-black uppercase text-white tracking-widest">FORGE YOUR BODY</p>
                    <p className="text-[8px] text-slate-300 mt-0.5">Heavy Calibrated Plates & 24/7 Access</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-amber-500/25 text-center">
                <h3 className="text-lg font-black uppercase tracking-wider text-amber-400 drop-shadow">
                  TRAIN YOUR MIND.
                </h3>
                <h3 className="text-xl font-black uppercase tracking-wider text-red-600 -mt-0.5 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                  TRANSFORM YOUR LIFE.
                </h3>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 4: TRAIN FOR YOUR FUTURE SELF (IMAGE 4)
          ========================================================= */}
          {templateId === 'future-self-anime' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-black overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Anime Warrior Atmosphere"
                  className="w-full h-full object-cover opacity-35 filter contrast-125"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />
              </div>

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between gap-4 pb-2">
                <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-amber-500/30 shadow-2xl max-w-[320px]">
                  <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-none drop-shadow-md">
                    TRAIN
                  </h1>
                  <div className="flex items-center gap-2 my-1">
                    <span className="w-4 h-0.5 bg-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">FOR YOUR</span>
                    <span className="w-4 h-0.5 bg-amber-400" />
                  </div>
                  <h1
                    className="text-4xl font-black uppercase tracking-tight leading-none drop-shadow-[0_0_20px_rgba(234,179,8,0.6)]"
                    style={{
                      background: 'linear-gradient(180deg, #FDE047 0%, #CA8A04 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    FUTURE SELF
                  </h1>
                  <p className="text-[8.5px] font-bold text-slate-300 mt-2 leading-relaxed uppercase">
                    {data.subheadline || 'THE ONLY PERSON YOU NEED TO BE BETTER THAN, IS THE PERSON YOU WERE YESTERDAY.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-amber-500/40 shadow-xl">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">WARRIOR CLUB</p>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">{data.gymName}</h3>
                  </div>
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'spartan-crest'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                </div>
              </div>

              {/* 3-Tier Left Box & 5 Right Rules */}
              <div className="relative z-10 my-auto grid grid-cols-12 gap-3 py-2 items-center">
                <div className="col-span-5 flex flex-col justify-center">
                  <div className="bg-black/85 backdrop-blur-md border-2 border-amber-500/60 p-3 rounded-2xl shadow-2xl text-center space-y-2 max-w-[200px]">
                    {(data.leftBoxItems || ['DISCIPLINE TODAY', 'STRENGTH TOMORROW', 'PRIDE FOREVER']).map(
                      (item, idx) => (
                        <div key={idx} className="border-b border-amber-500/20 pb-1.5 last:border-b-0 last:pb-0">
                          <p
                            className="text-[11px] font-black uppercase tracking-wider"
                            style={{ color: idx === 1 ? customColors.primary : '#FFFFFF' }}
                          >
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="col-span-7 space-y-1.5">
                  {(data.checklistItems && data.checklistItems.length >= 5
                    ? data.checklistItems.slice(0, 5)
                    : [
                        { title: 'SET YOUR GOALS', subtitle: 'STAY FOCUSED', icon: 'target' },
                        { title: 'TRAIN HARD', subtitle: 'BE CONSISTENT', icon: 'dumbbell' },
                        { title: 'PUSH YOUR LIMITS', subtitle: 'EVERY DAY', icon: 'flame' },
                        { title: 'STAY DISCIPLINED', subtitle: 'MENTALLY STRONG', icon: 'brain' },
                        { title: 'BE PATIENT', subtitle: 'TRUST THE PROCESS', icon: 'trophy' },
                      ]
                  ).map((rule, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-black/80 backdrop-blur-sm border border-amber-500/30 px-2 py-1 rounded-xl shadow-md"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                        <Icon name={rule.icon || 'check'} size={11} />
                      </div>
                      <div className="flex items-center gap-1.5 text-[9.5px]">
                        <span className="font-black uppercase text-white">{rule.title}</span>
                        <span className="text-amber-400">•</span>
                        <span className="text-amber-400 font-bold uppercase">{rule.subtitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Brush Quote */}
              <div className="relative z-10 my-2 text-right pr-2">
                <div className="bg-black/80 backdrop-blur-md p-2 rounded-xl inline-block border border-amber-500/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">YOUR FUTURE</p>
                  <p className="text-lg font-black uppercase italic tracking-tight" style={{ color: customColors.primary }}>
                    IS BUILT BY WHAT YOU DO TODAY
                  </p>
                </div>
              </div>

              {/* Bottom 4 Badges */}
              <div className="relative z-10 grid grid-cols-4 gap-2 pt-2 border-t border-amber-500/30 text-center">
                {(data.bottomBadges || [
                  { title: 'STRONG BODY', icon: 'dumbbell' },
                  { title: 'STRONG MIND', icon: 'brain' },
                  { title: 'STRONG HABITS', icon: 'shield' },
                  { title: 'STRONG FUTURE', icon: 'trophy' },
                ]).map((b, idx) => (
                  <div key={idx} className="bg-black/80 backdrop-blur-sm border border-amber-500/30 rounded-xl p-1.5 flex flex-col items-center shadow-md">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-0.5">
                      <Icon name={b.icon || 'zap'} size={11} />
                    </div>
                    <span className="text-[8px] font-black uppercase text-white tracking-wider">{b.title}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-2">
                <div
                  className="w-full py-1.5 px-3 rounded-xl text-black font-black text-[10px] uppercase tracking-wider text-center shadow-lg flex items-center justify-between"
                  style={{ background: `linear-gradient(90deg, ${customColors.primary}, ${customColors.accent})` }}
                >
                  <span>⚡ {data.bottomBannerText || 'WORK FOR IT NOW. LIVE YOUR DREAM LATER.'}</span>
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[8.5px] font-bold">
                    📞 {data.contact.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 5: DARK FOCUS MOODBOARD (IMAGE 5)
          ========================================================= */}
          {templateId === 'focus-moodboard' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-[#060606] overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Focus Moodboard Background"
                  className="w-full h-full object-cover opacity-35 filter contrast-125 brightness-75"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
              </div>

              <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40 z-0" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'crown-elite'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                  <div>
                    <h3 className="text-xs font-black uppercase text-white tracking-wider">{data.gymName}</h3>
                    <p className="text-[8px] font-bold uppercase text-red-500 tracking-widest">{data.gymTagline}</p>
                  </div>
                </div>

                <div className="bg-black/80 backdrop-blur-sm px-3 py-1 rounded-xl border border-red-600/40">
                  <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">
                    ⚡ {data.badgeText || 'YOU VS YOU'}
                  </span>
                </div>
              </div>

              {/* Center Huge FOCUS Title */}
              <div className="relative z-10 my-auto text-center py-4">
                <div className="bg-black/80 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-white/20 inline-block shadow-2xl">
                  <h1 className="text-6xl font-black uppercase tracking-widest text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                    {data.headline || 'FOCUS'}
                  </h1>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-200 tracking-wider">
                      DISCIPLINE TODAY,
                    </span>
                    <span className="text-[11px] font-black uppercase text-red-500 tracking-wider">
                      FREEDOM TOMORROW.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom 4 Badges */}
              <div className="relative z-10 grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                {(data.bottomBadges || [
                  { title: 'MIND RIGHT', icon: 'brain' },
                  { title: 'BODY STRONG', icon: 'dumbbell' },
                  { title: 'FOCUS SHARP', icon: 'target' },
                  { title: 'GOALS CLEAR', icon: 'trophy' },
                ]).map((b, idx) => (
                  <div key={idx} className="bg-black/85 backdrop-blur-sm border border-white/15 rounded-xl p-1.5 flex flex-col items-center shadow-md">
                    <div className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center mb-0.5">
                      <Icon name={b.icon || 'zap'} size={11} />
                    </div>
                    <span className="text-[8px] font-black uppercase text-white tracking-wider">{b.title}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-2">
                <div className="w-full py-1.5 px-3 rounded-xl bg-red-600 text-white font-black text-[9.5px] uppercase tracking-wider text-center shadow-lg flex items-center justify-between">
                  <span>⚡ {data.bottomBannerText || 'CONSISTENCY IS FOREVER • YOU VS YOU'}</span>
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[8px] font-bold">
                    📞 {data.contact.phone}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 6: BODYHUB 50% OFF DIAMOND (IMAGE 6)
          ========================================================= */}
          {templateId === 'bodyhub-diamond' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#111] via-[#090909] to-[#040404] overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="BodyHub Diamond Background"
                  className="w-full h-full object-cover opacity-35 filter contrast-125 brightness-75"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
              </div>

              <div className="absolute inset-0 bg-[radial-gradient(#eab30815_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none opacity-50 z-0" />

              {/* Header */}
              <div className="relative z-10 flex items-start justify-between gap-4 pb-2 border-b border-yellow-500/20">
                <div className="flex items-center gap-2.5 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-yellow-500/40 shadow-xl">
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'kettlebell-bolt'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                  <div>
                    <h2 className="text-lg font-black uppercase text-white tracking-wider leading-none">
                      {data.gymName}
                    </h2>
                    <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest mt-0.5">
                      {data.gymTagline || 'YOUR BEST BEGINS HERE'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-black/85 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-yellow-500/50 text-right">
                    <p className="text-[8px] font-bold text-slate-300 uppercase">FOR FIRST MONTH</p>
                    <p className="text-xl font-black text-yellow-400 leading-none">50% OFF</p>
                  </div>
                  <div className="w-10 h-10 bg-white p-0.5 rounded-lg shadow-lg">
                    <img src={qrSvgUrl} alt="QR Code" className="w-full h-full" crossOrigin="anonymous" />
                  </div>
                </div>
              </div>

              {/* Center Push Beyond Your Limits */}
              <div className="relative z-10 my-auto py-4 text-center">
                <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-yellow-500/30 inline-block shadow-2xl">
                  <p className="text-3xl font-serif italic font-bold text-yellow-400 -mb-1 drop-shadow">Push</p>
                  <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                    {data.headline || 'BEYOND YOUR LIMITS'}
                  </h1>
                  <p className="text-[11px] font-black uppercase text-white tracking-widest mt-1">
                    {data.subheadline || 'START YOUR TRAINING TODAY!!!'}
                  </p>
                </div>
              </div>

              {/* Bottom Website Button & Contact */}
              <div className="relative z-10 space-y-2 pt-2 border-t border-yellow-500/30 text-center">
                <div
                  className="w-full max-w-[340px] mx-auto py-2 px-6 rounded-full text-black font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(90deg, ${customColors.primary}, ${customColors.accent})` }}
                >
                  <span>🌐 {data.contact.website || 'WWW.YOURGYM.COM'}</span>
                </div>

                <div className="flex items-center justify-around text-[9px] text-slate-300 pt-1">
                  <span>📧 {data.contact.email}</span>
                  <span>📍 {data.contact.address}</span>
                  <span>📞 {data.contact.phone}</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 7: NEON KINETIC DARK
          ========================================================= */}
          {templateId === 'neon-kinetic' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#080c15] via-[#0b1220] to-[#060911] overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Neon Background"
                  className="w-full h-full object-cover opacity-35 filter contrast-125"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060911] via-[#0b1220]/70 to-[#080c15]/90" />
              </div>

              <div
                className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 z-0"
                style={{ background: customColors.primary }}
              />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between pb-3 border-b border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <GymBrandLogo
                    logoUrl={data.logoUrl}
                    logoPreset={data.logoPreset || 'kettlebell-bolt'}
                    primaryColor={customColors.primary}
                    accentColor={customColors.accent}
                    sizePx={logoSizePx}
                    bgStyle={logoBgStyle}
                    shape="squircle"
                  />
                  <div>
                    <h3 className="text-xl font-black tracking-wider uppercase text-white drop-shadow-sm">
                      {data.gymName}
                    </h3>
                    <p className="text-[10px] tracking-widest uppercase font-bold text-cyan-400">
                      {data.gymTagline}
                    </p>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-md"
                  style={{
                    backgroundColor: `${customColors.primary}15`,
                    borderColor: `${customColors.primary}60`,
                    color: customColors.primary,
                  }}
                >
                  {data.badgeText || '⚡ HIGH PERFORMANCE'}
                </div>
              </div>

              {/* Center Headline */}
              <div className="relative z-10 my-auto py-3 space-y-3">
                <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/30 shadow-2xl max-w-[440px]">
                  <h1 className="text-4xl font-black tracking-tight uppercase text-white drop-shadow-lg leading-none">
                    {data.headline}
                  </h1>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                    {data.subheadline}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-w-[440px]">
                  {(data.checklistItems && data.checklistItems.length >= 4
                    ? data.checklistItems.slice(0, 4)
                    : [
                        { title: 'SPEED & AGILITY', subtitle: 'Kinetic conditioning', icon: 'zap' },
                        { title: 'HYPER STRENGTH', subtitle: 'Targeted hypertrophy', icon: 'dumbbell' },
                        { title: 'PRO COACHING', subtitle: '1-on-1 programming', icon: 'user' },
                        { title: '24/7 ACCESS', subtitle: 'Smart biometric entry', icon: 'clock' },
                      ]
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-black/80 backdrop-blur-sm border border-cyan-500/30 p-2 rounded-xl flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black shrink-0">
                        <Icon name={item.icon || 'check'} size={12} />
                      </div>
                      <div className="leading-tight">
                        <p className="text-[9px] font-black text-white uppercase">{item.title}</p>
                        <p className="text-[7.5px] text-slate-400">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer */}
              <div className="relative z-10 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-white p-0.5 rounded-xl shadow-md">
                    <img src={qrSvgUrl} alt="QR Code" className="w-full h-full" crossOrigin="anonymous" />
                  </div>
                  <div className="text-[9.5px]">
                    <p className="font-black text-white">📞 {data.contact.phone}</p>
                    <p className="text-slate-400 font-medium">🌐 {data.contact.website}</p>
                  </div>
                </div>

                <div
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-950 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${customColors.primary}, ${customColors.accent})` }}
                >
                  ⚡ {data.bottomBannerText || 'START TODAY'}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TEMPLATE 8: LUXURY WELLNESS SPA (REBUILT FULL-BLEED 4K)
          ========================================================= */}
          {templateId === 'luxury-wellness' && (
            <div className="relative flex-1 flex flex-col justify-between p-6 bg-[#07080b] text-slate-100 overflow-hidden">
              {/* Full-Bleed Photographic Background Layer */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={bgImage}
                  alt="Luxury Wellness Ambience"
                  className="w-full h-full object-cover opacity-35 filter contrast-125 brightness-75"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-[#07080b]/60 to-[#07080b]/80" />
                <div className="absolute inset-0 bg-[radial-gradient(#d9770612_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40" />
              </div>

              {/* Luxury Gold Border Inset */}
              <div className="absolute inset-3 border border-amber-500/25 pointer-events-none rounded-2xl z-0" />

              {/* TOP HEADER: Centered Luxury Emblem & Slogan */}
              <div className="relative z-10 text-center pb-3 border-b border-amber-500/20">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2.5">
                    <GymBrandLogo
                      logoUrl={data.logoUrl}
                      logoPreset={data.logoPreset || 'crown-elite'}
                      primaryColor={customColors.primary}
                      accentColor={customColors.accent}
                      sizePx={logoSizePx}
                      bgStyle="glow-gold"
                      shape="squircle"
                    />
                    <div className="text-left">
                      <h3 className="text-base font-serif font-black tracking-widest uppercase text-amber-400">
                        {data.gymName}
                      </h3>
                      <p className="text-[8px] tracking-[0.25em] text-slate-300 uppercase mt-0.5">
                        {data.gymTagline}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-black/80 border border-amber-500/40 text-[9px] font-serif uppercase tracking-widest text-amber-300 shadow-md">
                    👑 {data.badgeText || 'SANCTUARY FOR BODY & MIND'}
                  </div>
                </div>
              </div>

              {/* MAIN HERO: Grand Serif Typography & Slogan */}
              <div className="relative z-10 my-auto text-center py-2 space-y-3">
                <div className="bg-black/85 backdrop-blur-md px-6 py-4 rounded-3xl border border-amber-500/30 inline-block shadow-2xl max-w-[520px]">
                  <p className="text-xs font-serif italic text-amber-400 tracking-wider mb-1">
                    Bespoke Transformation Experience
                  </p>
                  <h1 className="text-4xl font-serif font-black tracking-wide text-white uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-tight">
                    {data.headline}
                  </h1>
                  <p className="text-xs text-slate-300 mt-2 font-serif leading-relaxed max-w-md mx-auto">
                    {data.subheadline}
                  </p>
                </div>

                {/* 4 Luxury Wellness Pillar Cards */}
                <div className="grid grid-cols-4 gap-2 pt-1 max-w-[560px] mx-auto">
                  {(data.checklistItems && data.checklistItems.length >= 4
                    ? data.checklistItems.slice(0, 4)
                    : [
                        { title: 'REFORMER PILATES', subtitle: 'Core Alignment', icon: 'activity' },
                        { title: 'INFRARED SAUNA', subtitle: 'Cellular Detox', icon: 'flame' },
                        { title: 'BESPOKE COACHING', subtitle: '1-on-1 Protocol', icon: 'user' },
                        { title: 'MINDFUL RECOVERY', subtitle: 'Ice Bath & Spa', icon: 'heart-pulse' },
                      ]
                  ).map((pillar, idx) => (
                    <div
                      key={idx}
                      className="bg-black/85 backdrop-blur-md border border-amber-500/30 rounded-2xl p-2.5 flex flex-col items-center text-center shadow-xl hover:border-amber-400 transition"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black mb-1 shadow">
                        <Icon name={pillar.icon || 'crown'} size={12} className="text-slate-950" />
                      </div>
                      <p className="text-[8.5px] font-serif font-black uppercase text-amber-200 tracking-wider leading-tight">
                        {pillar.title}
                      </p>
                      <p className="text-[7px] text-slate-400 mt-0.5 leading-snug">{pillar.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BOTTOM LUXURY BOOKING & CONTACT BAR */}
              <div className="relative z-10 pt-2.5 border-t border-amber-500/20">
                <div className="flex items-center justify-between text-xs text-slate-300 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white p-0.5 rounded-lg shadow-md">
                      <img src={qrSvgUrl} alt="QR Code" className="w-full h-full" crossOrigin="anonymous" />
                    </div>
                    <div className="text-left text-[9px] space-y-0.5">
                      <p className="font-serif text-white font-bold">📍 {data.contact.address}</p>
                      <p className="text-amber-400 font-mono font-bold">📞 {data.contact.phone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-serif font-bold text-amber-400 tracking-wider">
                      🌐 {data.contact.website}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">
                      {data.bottomBannerText || 'MEMBERSHIP BY INVITATION & APPLICATION'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              FALLBACK TEMPLATE: HIGH-CONVERTING DIRECT-RESPONSE
          ========================================================= */}
          {templateId !== 'powerzone-split' &&
            templateId !== 'chalk-motivation' &&
            templateId !== 'spartan-discipline' &&
            templateId !== 'future-self-anime' &&
            templateId !== 'focus-moodboard' &&
            templateId !== 'bodyhub-diamond' &&
            templateId !== 'neon-kinetic' &&
            templateId !== 'luxury-wellness' && (
              <div className="relative flex-1 flex flex-col justify-between p-6 bg-slate-950 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                  <img src={bgImage} alt="Fallback Hero" className="w-full h-full object-cover opacity-35 filter contrast-125" crossOrigin="anonymous" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80" />
                </div>

                <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <GymBrandLogo
                      logoUrl={data.logoUrl}
                      logoPreset={data.logoPreset || 'kettlebell-bolt'}
                      primaryColor={customColors.primary}
                      accentColor={customColors.accent}
                      sizePx={logoSizePx}
                      bgStyle={logoBgStyle}
                      shape="squircle"
                    />
                    <div>
                      <h2 className="text-xl font-black uppercase text-white">{data.gymName}</h2>
                      <p className="text-[10px] uppercase font-bold" style={{ color: customColors.primary }}>
                        {data.gymTagline}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-xl bg-black/80 border border-yellow-500/40 text-[10px] font-black text-yellow-400">
                    ⚡ {data.badgeText}
                  </div>
                </div>

                <div className="my-auto py-3 relative z-10 space-y-3">
                  <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl">
                    <h1 className="text-4xl font-black uppercase text-white leading-tight">{data.headline}</h1>
                    <p className="text-xs text-slate-300 mt-1">{data.subheadline}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(data.checklistItems || []).slice(0, 4).map((item, idx) => (
                      <div key={idx} className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 p-2 rounded-xl text-center">
                        <Icon name={item.icon || 'zap'} size={14} className="text-yellow-400 mx-auto mb-1" />
                        <p className="text-[9px] font-black uppercase text-white">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span>📍 {data.contact.address}</span>
                  <span>📞 {data.contact.phone}</span>
                  <span className="font-bold text-yellow-400">🌐 {data.contact.website}</span>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }
);

BrochurePreviewCanvas.displayName = 'BrochurePreviewCanvas';
