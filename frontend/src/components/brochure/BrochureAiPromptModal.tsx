import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { BrochureData } from '@/types/brochure';
import { generateBrochureWithAi } from '@/services/brochureAiGenerator';

interface BrochureAiPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGenerated: (data: BrochureData) => void;
}

const INSPIRATION_PROMPTS = [
  {
    title: '⚡ 50% Off New Year Campaign',
    prompt:
      'Design a high-converting gold & black gym poster for TITAN FITNESS with "FOR FIRST MONTH 50% OFF", bold typography "PUSH BEYOND YOUR LIMITS", QR code, and website button.',
    vibe: 'High-Converting Gold Diamond Promo',
    offer: '50% OFF FIRST MONTH',
  },
  {
    title: '🔥 6-Step Daily Discipline Rules',
    prompt:
      'Create an atmospheric dark motivation poster with 6 golden daily habit steps: Focus on your goal, Train hard, Build strength, Eat clean, Sleep well, Stay consistent. Quote: SORE TODAY / STRONG TOMORROW.',
    vibe: 'Chalk Athlete & Daily Habits',
    offer: '12-WEEK PHYSIQUE BLUEPRINT',
  },
  {
    title: '⚔️ Spartan Discipline Beats Motivation',
    prompt:
      'Create a hardcore metallic 3D gold & red Spartan gym poster with headline "DISCIPLINE BEATS MOTIVATION", Spartan crest emblem, and 5 rules for mental toughness.',
    vibe: 'Hardcore Spartan Discipline',
    offer: 'IRON WARRIOR PASS',
  },
  {
    title: '👑 Modern Luxury Boutique Wellness',
    prompt:
      'Design an elegant obsidian and champagne gold poster for THE AURA CLUB with headline "ELEVATE YOUR DAILY RITUAL", Reformer Pilates and thermal spa highlights.',
    vibe: 'Luxury Boutique Wellness',
    offer: 'VIP INVITATION ONLY',
  },
];

export function BrochureAiPromptModal({
  isOpen,
  onClose,
  onApplyGenerated,
}: BrochureAiPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [gymName, setGymName] = useState('');
  const [offer, setOffer] = useState('');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [vibe, setVibe] = useState('Aggressive High-Contrast Gold');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState('');

  if (!isOpen) return null;

  const handleSelectInspiration = (item: typeof INSPIRATION_PROMPTS[0]) => {
    setPrompt(item.prompt);
    setVibe(item.vibe);
    setOffer(item.offer);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setStepText('Designing brochure layout, copy & colors...');

    try {
      const result = await generateBrochureWithAi({
        prompt,
        gymName: gymName.trim() || undefined,
        offer: offer.trim() || undefined,
        phone: phone.trim() || undefined,
        vibe,
      });

      if (result && result.data) {
        onApplyGenerated(result.data);
        onClose();
      }
    } catch (err) {
      console.error('AI Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Icon name="sparkles" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Prompt-to-Poster Designer</h3>
              <p className="text-xs text-slate-500">
                Describe the poster you want and AI will auto-design the entire brochure layout, copy & colors
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Main Prompt Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Describe How AI Should Design Your Poster & Required Fields:
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a bold gold & black gym poster for TITAN FITNESS with 50% discount for New Year, 6 habit checklist for bulking, Spartan helmet logo, contact: +91 9988776655, with quote 'DISCIPLINE IS POWER'..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-900 placeholder-slate-400 text-xs focus:border-amber-500 focus:bg-white outline-none leading-relaxed"
            />
          </div>

          {/* Inspiration Quick Prompts */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              ⚡ 1-Click Inspiration Prompts:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INSPIRATION_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectInspiration(item)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-amber-500 hover:bg-amber-50/50 text-left transition space-y-1 group"
                >
                  <p className="font-bold text-xs text-amber-800 group-hover:text-amber-900">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">{item.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Direct Fields */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Optional Direct Field Overrides:
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Gym Name</label>
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. TITAN GYM"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Target Offer / Pricing</label>
                <input
                  type="text"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="e.g. 50% OFF Annual Pass"
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-600 mb-1">Visual Theme / Vibe</label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:border-amber-500 outline-none cursor-pointer"
                >
                  <option value="Aggressive High-Contrast Gold">Aggressive High-Contrast Gold (PowerZone)</option>
                  <option value="Chalk Athlete & Daily Habits">Chalk Athlete & Habits (Sahil)</option>
                  <option value="Hardcore Spartan Discipline">Hardcore Spartan Discipline (Red/Gold)</option>
                  <option value="Future Self Golden Shadow">Future Self Shadow Anime</option>
                  <option value="Dark Focus Moodboard">Dark Focus Moodboard</option>
                  <option value="High-Converting Gold Diamond Promo">Gold Diamond Promo (BodyHub)</option>
                  <option value="Cyber Neon Kinetic">Cyber Neon Kinetic (Cyan)</option>
                  <option value="Luxury Boutique Wellness">Luxury Boutique Wellness (Champagne)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generating Animation */}
          {isGenerating && (
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                  AI Designing Full Poster...
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium">{stepText}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="sparkles" className="w-4 h-4" />
            <span>{isGenerating ? 'AI Designing...' : '🎨 Auto-Design Entire Poster'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
