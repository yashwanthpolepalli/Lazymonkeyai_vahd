import React, { useState } from 'react';
import type { BrochureData, BrochureTemplateId } from '@/types/brochure';
import { BROCHURE_TEMPLATES } from '@/data/brochureTemplates';
import { Icon } from '@/components/ui/Icon';
import { GymBrandLogo } from './GymBrandLogo';
import { optimizeBrochureLayout } from '@/utils/brochureAiAligner';

interface BrochureCustomizerPanelProps {
  data: BrochureData;
  onChange: (updated: BrochureData) => void;
  onSelectTemplate: (templateId: BrochureTemplateId) => void;
  onResetDefaults: () => void;
  onAiAlign?: () => void;
  onOpenAiUpload?: () => void;
}

type TabKey =
  | 'templates'
  | 'logo-brand'
  | 'content'
  | 'checklist'
  | 'images'
  | 'pricing'
  | 'theme'
  | 'contact';

const LOGO_PRESETS = [
  { id: 'kettlebell-bolt', label: 'Power Kettlebell & Bolt', desc: 'Powerzone & BodyHub Style' },
  { id: 'bicep-barbell', label: 'Iron Bicep & Barbell', desc: 'Fit with Sahil' },
  { id: 'spartan-crest', label: 'Spartan Wings & Helmet', desc: 'Discipline & Future Self' },
  { id: 'crown-elite', label: 'Royal Crown Elite', desc: 'Focus Moodboard' },
  { id: 'flame-bull', label: 'Fierce Flame Bull', desc: 'Strength & Power' },
  { id: 'shield-gym', label: 'Shield & Iron Star', desc: 'Community Haven' },
];

const AUTHENTIC_POSTER_PRESETS = [
  {
    label: 'Powerzone Kinetic Gold (Image 1)',
    url: '/assets/brochures/powerzone_bg.jpg',
    category: 'Poster 1 Background',
    templateId: 'powerzone-split' as BrochureTemplateId,
  },
  {
    label: 'Fit Chalk Warrior (Image 2)',
    url: '/assets/brochures/chalk_motivation_bg.png',
    category: 'Poster 2 Background',
    templateId: 'chalk-motivation' as BrochureTemplateId,
  },
  {
    label: 'Spartan Discipline Beats Motivation (Image 3)',
    url: '/assets/brochures/spartan_discipline_bg.jpg',
    category: 'Poster 3 Background',
    templateId: 'spartan-discipline' as BrochureTemplateId,
  },
  {
    label: 'Train For Your Future Self Anime (Image 4)',
    url: '/assets/brochures/future_self_bg.jpg',
    category: 'Poster 4 Background',
    templateId: 'future-self-anime' as BrochureTemplateId,
  },
  {
    label: 'Dark Focus Moodboard Collage (Image 5)',
    url: '/assets/brochures/focus_moodboard_bg.png',
    category: 'Poster 5 Background',
    templateId: 'focus-moodboard' as BrochureTemplateId,
  },
  {
    label: 'BodyHub 50% Off Diamond (Image 6)',
    url: '/assets/brochures/bodyhub_diamond_bg.jpg',
    category: 'Poster 6 Background',
    templateId: 'bodyhub-diamond' as BrochureTemplateId,
  },
];

export function BrochureCustomizerPanel({
  data,
  onChange,
  onSelectTemplate,
  onResetDefaults,
  onAiAlign,
  onOpenAiUpload,
}: BrochureCustomizerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('templates');

  const updateField = <K extends keyof BrochureData>(field: K, value: BrochureData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateNestedField = (
    parent: 'pricing' | 'contact' | 'customColors' | 'quoteBox' | 'secondaryImages',
    field: string,
    value: any
  ) => {
    onChange({
      ...data,
      [parent]: {
        ...(data[parent] as any),
        [field]: value,
      },
    });
  };

  const handleAiOptimize = () => {
    const optimized = optimizeBrochureLayout(data);
    onChange(optimized);
    if (onAiAlign) onAiAlign();
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        updateField('logoUrl', base64Url);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        updateField('heroImage', base64Url);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col h-full max-h-[920px] text-slate-800">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Icon name="palette" className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Poster Studio Controls</h2>
            <p className="text-[10px] text-slate-500">Customize authentic posters, logo size & copy</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAiUpload && (
            <button
              onClick={onOpenAiUpload}
              className="text-xs text-slate-950 font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 px-3 py-1.5 rounded-xl transition shadow-sm shadow-amber-500/20 flex items-center gap-1.5"
              title="Upload any poster image and extract fields with AI"
            >
              <Icon name="upload" className="w-3.5 h-3.5" />
              <span>Scan Poster</span>
            </button>
          )}

          <button
            onClick={handleAiOptimize}
            className="text-xs text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Auto-align layouts, balance font sizing & fix text overlaps"
          >
            <Icon name="sparkles" className="w-3.5 h-3.5 text-amber-600" />
            <span>Auto-Align</span>
          </button>

          <button
            onClick={onResetDefaults}
            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition flex items-center gap-1"
            title="Reset to template defaults"
          >
            <Icon name="refresh-cw" className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-1.5 overflow-x-auto py-3 border-b border-slate-200 no-scrollbar">
        {[
          { id: 'templates', label: 'Posters (8)', icon: 'layout-dashboard' },
          { id: 'logo-brand', label: 'Logo & Brand', icon: 'award' },
          { id: 'content', label: 'Headlines', icon: 'file-text' },
          { id: 'checklist', label: 'Rules & Badges', icon: 'check-circle' },
          { id: 'images', label: 'Backgrounds', icon: 'image' },
          { id: 'pricing', label: 'Pricing & Deal', icon: 'indian-rupee' },
          { id: 'theme', label: 'Colors & Relight', icon: 'sparkles' },
          { id: 'contact', label: 'Contact', icon: 'phone' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabKey)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Icon name={tab.icon} className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
        {/* =========================================================
            TAB 1: TEMPLATES
        ========================================================= */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Select a Poster Artwork:</span>
              <span className="text-[10px] text-amber-700 font-bold">6 Authentic Reference Posters</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {BROCHURE_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === data.templateId;
                const isFlagship = [
                  'powerzone-split',
                  'chalk-motivation',
                  'spartan-discipline',
                  'future-self-anime',
                  'focus-moodboard',
                  'bodyhub-diamond',
                ].includes(tmpl.id);
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => onSelectTemplate(tmpl.id)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-1 ring-amber-500/50 shadow-sm'
                        : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{tmpl.name}</span>
                        {isFlagship && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-400 text-black">
                            Exact Reference
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{tmpl.description}</p>
                      <span className="inline-block text-[10px] text-amber-600 font-medium">
                        ✨ {tmpl.pinterestVibe}
                      </span>
                    </div>

                    <div className="shrink-0 pt-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                          <Icon name="check" className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: GYM LOGO & SIZING
        ========================================================= */}
        {activeTab === 'logo-brand' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Icon name="upload" className="w-4 h-4 text-amber-500" />
                  <span>Upload Custom Gym Logo</span>
                </label>
                {data.logoUrl && (
                  <button
                    onClick={() => updateField('logoUrl', undefined)}
                    className="text-[10px] text-red-500 hover:text-red-700 underline"
                  >
                    Remove Logo
                  </button>
                )}
              </div>

              {data.logoUrl ? (
                <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-amber-500/40">
                  <img
                    src={data.logoUrl}
                    alt="Current Logo"
                    className="w-14 h-14 object-contain rounded-lg bg-slate-950 p-1 border border-slate-200"
                  />
                  <div>
                    <p className="text-slate-900 font-bold text-xs">Custom Logo Active</p>
                    <p className="text-[10px] text-slate-500">Positioned and blended in poster header</p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Upload your gym PNG, SVG, or JPG logo. It will blend directly with the poster design.
                </p>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
              />
            </div>

            {/* Logo Size Slider */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">Logo Size Customization</label>
                <span className="text-amber-700 font-mono font-bold text-xs">{data.logoSize || 52} px</span>
              </div>
              <input
                type="range"
                min={32}
                max={120}
                step={4}
                value={data.logoSize || 52}
                onChange={(e) => updateField('logoSize', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between gap-1 pt-1">
                {[
                  { label: 'Small (40px)', val: 40 },
                  { label: 'Medium (56px)', val: 56 },
                  { label: 'Large (72px)', val: 72 },
                  { label: 'X-Large (96px)', val: 96 },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => updateField('logoSize', s.val)}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      (data.logoSize || 52) === s.val
                        ? 'bg-amber-500 text-black'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Background Blend Style */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="font-bold text-slate-800">Logo Frame & Blend Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'glass-dark', label: 'Dark Glass' },
                  { id: 'glow-gold', label: 'Gold Glow' },
                  { id: 'transparent', label: 'Transparent' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => updateField('logoBgStyle', style.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition ${
                      (data.logoBgStyle || 'glass-dark') === style.id
                        ? 'bg-amber-500 text-black border-amber-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vector Preset Logos */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700">Or Choose a Vector Emblem Preset:</label>
              <div className="grid grid-cols-2 gap-2">
                {LOGO_PRESETS.map((preset) => {
                  const isSelected = !data.logoUrl && (data.logoPreset || 'kettlebell-bolt') === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        updateField('logoUrl', undefined);
                        updateField('logoPreset', preset.id);
                      }}
                      className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 text-slate-900 ring-1 ring-amber-500/50'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <GymBrandLogo
                        logoPreset={preset.id}
                        primaryColor={data.customColors.primary}
                        accentColor={data.customColors.accent}
                        sizePx={32}
                      />
                      <div className="leading-tight">
                        <p className="font-bold text-[10px] text-slate-900">{preset.label}</p>
                        <p className="text-[8.5px] text-slate-500">{preset.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gym Name & Tagline */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Gym Name</label>
                <input
                  type="text"
                  value={data.gymName}
                  onChange={(e) => updateField('gymName', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Gym Tagline / Subtitle</label>
                <input
                  type="text"
                  value={data.gymTagline}
                  onChange={(e) => updateField('gymTagline', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: HEADLINES & COPY
        ========================================================= */}
        {activeTab === 'content' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Main Poster Headline</label>
              <input
                type="text"
                value={data.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black uppercase focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Subheadline / Core Slogan</label>
              <textarea
                rows={2}
                value={data.subheadline}
                onChange={(e) => updateField('subheadline', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Badge Highlight Pill Text</label>
              <input
                type="text"
                value={data.badgeText}
                onChange={(e) => updateField('badgeText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Quote Highlight</label>
                <input
                  type="text"
                  value={data.quoteBox?.highlight || ''}
                  onChange={(e) => updateNestedField('quoteBox', 'highlight', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Quote Subtext</label>
                <input
                  type="text"
                  value={data.quoteBox?.subtext || ''}
                  onChange={(e) => updateNestedField('quoteBox', 'subtext', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Bottom Ribbon Banner</label>
              <input
                type="text"
                value={data.bottomBannerText || ''}
                onChange={(e) => updateField('bottomBannerText', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            {/* Left Box Items for Future-Self Template */}
            {data.templateId === 'future-self-anime' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-bold text-amber-700 block">Left 3-Tier Discipline Box Stack</label>
                {(data.leftBoxItems || ['DISCIPLINE TODAY', 'STRENGTH TOMORROW', 'PRIDE FOREVER']).map((item, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...(data.leftBoxItems || [])];
                      updated[idx] = e.target.value;
                      updateField('leftBoxItems', updated);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 4: CHECKLIST & BADGES
        ========================================================= */}
        {activeTab === 'checklist' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Discipline Rules & Feature Badges</span>
            </div>

            <div className="space-y-2">
              {(data.checklistItems || []).map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...(data.checklistItems || [])];
                      updated[idx] = { ...updated[idx], title: e.target.value };
                      updateField('checklistItems', updated);
                    }}
                    className="w-32 bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 font-bold text-xs"
                    placeholder="Title"
                  />
                  <input
                    type="text"
                    value={item.subtitle}
                    onChange={(e) => {
                      const updated = [...(data.checklistItems || [])];
                      updated[idx] = { ...updated[idx], subtitle: e.target.value };
                      updateField('checklistItems', updated);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs"
                    placeholder="Subtitle description"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 5: POSTER BACKGROUND IMAGES
        ========================================================= */}
        {activeTab === 'images' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                <Icon name="upload" className="w-4 h-4 text-amber-500" />
                <span>Upload Custom Poster Background</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroFileUpload}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Current Background Image URL</label>
              <input
                type="text"
                value={data.heroImage}
                onChange={(e) => updateField('heroImage', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:border-amber-500 focus:bg-white outline-none font-mono"
              />
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-700">Authentic Reference Poster Backgrounds:</span>
              <div className="grid grid-cols-2 gap-2">
                {AUTHENTIC_POSTER_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectTemplate(preset.templateId);
                      updateField('heroImage', preset.url);
                    }}
                    className={`p-2 rounded-xl border bg-slate-50 cursor-pointer space-y-1.5 transition ${
                      data.templateId === preset.templateId
                        ? 'border-amber-500 bg-amber-50/80 ring-1 ring-amber-500/50'
                        : 'border-slate-200 hover:border-amber-500 hover:bg-slate-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-24 object-cover rounded-lg"
                      crossOrigin="anonymous"
                    />
                    <p className="font-bold text-[10px] text-slate-900 truncate">{preset.label}</p>
                    <p className="text-[8.5px] text-amber-600">{preset.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 6: PRICING & DEALS
        ========================================================= */}
        {activeTab === 'pricing' && (
          <div className="space-y-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Plan / Pass Name</label>
              <input
                type="text"
                value={data.pricing.planName}
                onChange={(e) => updateNestedField('pricing', 'planName', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Special Offer Price</label>
                <input
                  type="text"
                  value={data.pricing.offerPrice}
                  onChange={(e) => updateNestedField('pricing', 'offerPrice', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black text-sm focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Original Price (Strikethrough)</label>
                <input
                  type="text"
                  value={data.pricing.originalPrice || ''}
                  onChange={(e) => updateNestedField('pricing', 'originalPrice', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Billing Period</label>
              <input
                type="text"
                value={data.pricing.period}
                onChange={(e) => updateNestedField('pricing', 'period', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 7: THEME & COLORS
        ========================================================= */}
        {activeTab === 'theme' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Primary Accent</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.customColors.primary}
                    onChange={(e) => updateNestedField('customColors', 'primary', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-200"
                  />
                  <input
                    type="text"
                    value={data.customColors.primary}
                    onChange={(e) => updateNestedField('customColors', 'primary', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 font-mono text-xs focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Secondary Gradient</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={data.customColors.accent}
                    onChange={(e) => updateNestedField('customColors', 'accent', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-slate-200"
                  />
                  <input
                    type="text"
                    value={data.customColors.accent}
                    onChange={(e) => updateNestedField('customColors', 'accent', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-900 font-mono text-xs focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 8: CONTACT
        ========================================================= */}
        {activeTab === 'contact' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={data.contact.phone}
                  onChange={(e) => updateNestedField('contact', 'phone', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Instagram Handle</label>
                <input
                  type="text"
                  value={data.contact.instagram}
                  onChange={(e) => updateNestedField('contact', 'instagram', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Gym Address</label>
              <input
                type="text"
                value={data.contact.address}
                onChange={(e) => updateNestedField('contact', 'address', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Website URL</label>
              <input
                type="text"
                value={data.contact.website}
                onChange={(e) => updateNestedField('contact', 'website', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-amber-500 focus:bg-white outline-none"
              />
            </div>

            {/* Custom QR Code Upload */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mt-2">
              <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Icon name="upload" className="w-3.5 h-3.5 text-amber-500" />
                <span>Upload Custom QR Code (Payment / UPI / Social)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        updateField('customQrUrl', ev.target.result as string);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
              />
              {data.customQrUrl && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Custom QR Attached</span>
                  <button
                    onClick={() => updateField('customQrUrl', undefined)}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
