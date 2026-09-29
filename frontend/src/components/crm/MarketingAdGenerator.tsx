import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Layers,
  Send,
  Save,
  CheckCircle2,
  RefreshCw,
  Target,
  Image as ImageIcon,
  Flame,
  Download,
  Copy,
  Check,
  Dumbbell,
  ShieldCheck,
  Zap,
  ChevronRight,
  Activity,
  Award,
  Clock,
  QrCode,
  Sliders,
  Palette,
  Eye,
  Trash2,
  ExternalLink,
  Users,
  TrendingUp,
  DollarSign,
  Globe,
  Share2,
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  MoreHorizontal,
  X,
  Plus,
  Play,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PosterFeature {
  icon: string;
  text: string;
}

interface PosterData {
  headline: string;
  subheadline: string;
  badge_text: string;
  theme_style: 'cyber_neon' | 'gold_luxury' | 'crimson_beast' | 'emerald_vitality' | 'electric_blue';
  pricing_badge?: string;
  urgency_text?: string;
  cta_text?: string;
  features: PosterFeature[];
  gym_name?: string;
  platform?: string;
  aspect_ratio?: string;
}

interface AdItem {
  id: string;
  headline: string;
  prompt: string;
  aspect_ratio: string;
  model_used: string;
  image_url?: string;
  caption?: string;
  status: string;
  platform?: string;
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  leads_generated?: number;
  poster_data?: PosterData;
  created_at?: string;
}

interface Asset {
  id: string;
  filename: string;
  public_url: string;
  aspect_ratio: string;
  source: string;
  provider_model?: string;
  original_prompt?: string;
  enhanced_prompt?: string;
  style?: string;
  tags?: string[];
  status?: string;
  created_at?: string;
}

type PreviewPlatform = 'facebook' | 'instagram' | 'twitter' | 'youtube';

const THEME_STYLES = [
  { id: 'cyber_neon', name: 'Cyber Neon', bg: 'from-slate-950 via-purple-950 to-slate-900', accent: '#06b6d4', textGrad: 'from-cyan-400 to-fuchsia-400' },
  { id: 'gold_luxury', name: 'Luxury Gold', bg: 'from-zinc-950 via-amber-950 to-stone-900', accent: '#f59e0b', textGrad: 'from-amber-300 via-yellow-400 to-amber-500' },
  { id: 'crimson_beast', name: 'Crimson Beast', bg: 'from-neutral-950 via-red-950 to-neutral-900', accent: '#ef4444', textGrad: 'from-red-400 via-rose-500 to-orange-500' },
  { id: 'emerald_vitality', name: 'Emerald Vitality', bg: 'from-stone-950 via-emerald-950 to-slate-900', accent: '#10b981', textGrad: 'from-emerald-300 via-teal-400 to-green-500' },
  { id: 'electric_blue', name: 'Electric Blue', bg: 'from-slate-950 via-blue-950 to-slate-900', accent: '#3b82f6', textGrad: 'from-blue-400 via-indigo-300 to-cyan-400' },
] as const;

export function MarketingAdGenerator() {
  const { user } = useAuth();
  const currentGymName = user?.gymName || (user as any)?.gym_name || 'FIT CLUB';

  // AI Prompt & Studio State
  const [adPrompt, setAdPrompt] = useState('New Year Transformation Challenge 2026: 60 Days to Peak Fitness with Certified Coaches & InBody Tracking');
  const [adHeadline, setAdHeadline] = useState('60-DAY ELITE TRANSFORMATION CHALLENGE');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9'>('1:1');
  const [modelUsed, setModelUsed] = useState<'Gemini Imagen 3' | 'DALL-E 3' | 'FLUX Commercial'>('Gemini Imagen 3');
  const [stylePreset, setStylePreset] = useState('Photorealistic 8K');
  
  // Active Poster Style
  const [activeTheme, setActiveTheme] = useState<'cyber_neon' | 'gold_luxury' | 'crimson_beast' | 'emerald_vitality' | 'electric_blue'>('cyber_neon');
  
  // Prompt Optimization
  const [optimizingPrompt, setOptimizingPrompt] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [isPromptOptimized, setIsPromptOptimized] = useState(false);

  // Creative & Visual Generation
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [refImageBase64, setRefImageBase64] = useState('');
  const [refImageName, setRefImageName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copywriting & SEO State
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [caption, setCaption] = useState('');
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([
    '#FitnessGoals', '#GymMotivation', '#TransformationChallenge', '#FitFam', '#EliteTraining', '#FatLossJourney'
  ]);
  const [searchKeywords, setSearchKeywords] = useState<string[]>([
    'gym membership', 'personal training', 'fitness transformation', 'weight loss program', 'bodybuilding coach'
  ]);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Preview Platform Simulator
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('facebook');
  const [previewViewMode, setPreviewViewMode] = useState<'ad_preview' | 'poster_canvas'>('ad_preview');
  const [igStoryMode, setIgStoryMode] = useState(false);

  // Multi-Platform Publishing Targets
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    facebook: true,
    instagram: true,
    twitter: true,
    youtube: true
  });
  const [publishing, setPublishing] = useState(false);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  // Dynamic Poster Data
  const [posterData, setPosterData] = useState<PosterData>({
    headline: '60-DAY PEAK TRANSFORMATION',
    subheadline: 'Unlock Your Highest Athletic Potential With World-Class Coaching & Nutrition',
    badge_text: '⚡ EXCLUSIVE ACCESS',
    theme_style: 'cyber_neon',
    pricing_badge: 'SAVE ₹4,999 TODAY',
    urgency_text: '⏳ Only 15 VIP Slots Left',
    cta_text: 'CLAIM ACCESS PASS',
    features: [
      { icon: 'scan', text: 'Full 3D InBody Body Composition Scan' },
      { icon: 'shield', text: '1-on-1 Certified Master Coach Guidance' },
      { icon: 'zap', text: 'Tailored High-Performance Macro Strategy' },
      { icon: 'dumbbell', text: 'Unlimited Elite Gym & Recovery Access' }
    ],
    gym_name: currentGymName,
    platform: 'Meta / Instagram',
    aspect_ratio: '1:1'
  });

  // Ads & Assets Management
  const [recentAds, setRecentAds] = useState<AdItem[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [assetLibrary, setAssetLibrary] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Paid Campaign Modal State
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidCampaignName, setPaidCampaignName] = useState('New Year VIP Lead Campaign');
  const [paidObjective, setPaidObjective] = useState('OUTCOME_LEADS');
  const [dailyBudget, setDailyBudget] = useState(2500); // in Rupees
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(55);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Fitness & Wellness', 'Gym Workouts', 'Bodybuilding', 'Weight Loss']);
  const [creatingPaidCampaign, setCreatingPaidCampaign] = useState(false);

  // Toast / Status Message
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const notify = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusNotification({ type, text });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4500);
  };

  // ── Load Initial Data ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRecentAds();
  }, []);

  const fetchRecentAds = async () => {
    setLoadingAds(true);
    try {
      const res = await apiClient.get<AdItem[]>('/crm/ads');
      if (Array.isArray(res)) {
        setRecentAds(res);
      }
    } catch {
      // silent
    } finally {
      setLoadingAds(false);
    }
  };

  const fetchAssetLibrary = async () => {
    setLoadingAssets(true);
    try {
      const res = await apiClient.get<Asset[]>('/crm/assets');
      if (Array.isArray(res)) {
        setAssetLibrary(res);
      }
    } catch {
      setAssetLibrary([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  // ── Reference Image Upload ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setRefImageBase64(reader.result as string);
      notify('success', `Reference visual "${file.name}" attached.`);
    };
    reader.readAsDataURL(file);
  };

  // ── STEP 1: Optimize Prompt with AI ──────────────────────────────────────────
  const handleOptimizePrompt = async () => {
    if (!adPrompt.trim()) {
      notify('info', 'Please enter a campaign concept or prompt first.');
      return;
    }
    setOptimizingPrompt(true);
    try {
      const res = await apiClient.post<{ optimized_prompt: string }>('/crm/campaigns/optimize-prompt', {
        prompt: adPrompt,
        style: stylePreset,
        aspect_ratio: aspectRatio,
        provider: modelUsed.toLowerCase().includes('gemini') ? 'gemini' : 'openai',
        reference_image: refImageBase64 || undefined
      });
      if (res?.optimized_prompt) {
        setOptimizedPrompt(res.optimized_prompt);
        setIsPromptOptimized(true);
        notify('success', 'AI Creative Director optimized your ad concept!');
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to optimize prompt');
    } finally {
      setOptimizingPrompt(false);
    }
  };

  // ── STEP 2: Generate Visual / Poster ─────────────────────────────────────────
  const handleGenerateVisual = async () => {
    const targetPrompt = isPromptOptimized && optimizedPrompt.trim() ? optimizedPrompt : adPrompt;
    if (!targetPrompt.trim()) {
      notify('info', 'Please enter a prompt first.');
      return;
    }

    setGeneratingVisual(true);
    setPublishSuccessMsg(null);
    try {
      const res = await apiClient.post<{ image_url: string; image_b64?: string; enhanced_prompt: string }>(
        '/crm/campaigns/generate-poster',
        {
          prompt: targetPrompt,
          style: stylePreset,
          aspect_ratio: aspectRatio,
          provider: modelUsed.toLowerCase().includes('gemini') ? 'gemini' : 'flux',
          reference_image: refImageBase64 || undefined,
          skip_enhancement: Boolean(optimizedPrompt.trim())
        }
      );

      const resolvedUrl = res.image_b64 || res.image_url;
      setCurrentImageUrl(resolvedUrl);
      notify('success', 'Commercial creative image generated dynamically!');

      // Also trigger auto copy & hashtags generation
      void handleGenerateCopy(targetPrompt);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to generate visual poster');
    } finally {
      setGeneratingVisual(false);
    }
  };

  // ── STEP 3: Generate Viral Copy & SEO Keywords ───────────────────────────────
  const handleGenerateCopy = async (customPrompt?: string) => {
    const p = customPrompt || (isPromptOptimized && optimizedPrompt.trim() ? optimizedPrompt : adPrompt);
    setGeneratingCopy(true);
    try {
      const channelLabel = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]).join(', ') || 'Social Media';
      const res = await apiClient.post<{ copy: string; hashtags?: string[]; keywords?: string[] }>(
        '/crm/campaigns/generate-copy',
        {
          prompt: p,
          channel: channelLabel,
          provider: 'gemini'
        }
      );

      if (res?.copy) {
        setCaption(res.copy);
      }
      if (res?.hashtags && res.hashtags.length > 0) {
        setTrendingHashtags(res.hashtags);
      }
      if (res?.keywords && res.keywords.length > 0) {
        setSearchKeywords(res.keywords);
      }
      notify('success', 'Channel-tailored marketing copy & viral hashtags ready!');
    } catch (err: any) {
      notify('error', err?.message || 'Failed to generate marketing copy');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleAppendHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      setCaption(prev => `${prev.trim()}\n\n${tag}`);
      notify('info', `Appended ${tag} to caption`);
    } else {
      navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1500);
      notify('info', `Copied ${tag} to clipboard`);
    }
  };

  // ── STEP 4: Multi-Platform Publishing ────────────────────────────────────────
  const handlePublishAll = async () => {
    if (!currentImageUrl && !caption) {
      notify('info', 'Please generate or upload a visual creative and caption before publishing.');
      return;
    }

    const activePlatforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
    if (activePlatforms.length === 0) {
      notify('info', 'Please select at least one target social platform to publish.');
      return;
    }

    setPublishing(true);
    try {
      const res = await apiClient.post<{ status: string; message: string; platforms: string[]; posts: any[] }>(
        '/crm/campaigns/publish',
        {
          platform: activePlatforms.length === 4 ? 'all' : activePlatforms.join(','),
          image_url: currentImageUrl,
          caption: caption || adPrompt,
          headline: adHeadline
        }
      );

      setPublishSuccessMsg(`🚀 Successfully published dynamic ad to: ${activePlatforms.map(p => p.toUpperCase()).join(', ')}!`);
      notify('success', `Ad published to ${activePlatforms.length} platform(s)!`);
      fetchRecentAds();
    } catch (err: any) {
      notify('error', err?.message || 'Publishing failed. Check social connections.');
    } finally {
      setPublishing(false);
    }
  };

  // ── STEP 5: Save to Asset Library ────────────────────────────────────────────
  const handleSaveAsset = async () => {
    if (!currentImageUrl) {
      notify('info', 'No visual creative available to save.');
      return;
    }
    try {
      await apiClient.post('/crm/assets', {
        filename: `poster_${Date.now()}.jpg`,
        public_url: currentImageUrl,
        aspect_ratio: aspectRatio,
        source: modelUsed,
        original_prompt: adPrompt,
        enhanced_prompt: optimizedPrompt || adPrompt,
        style: stylePreset,
        tags: [stylePreset, activeTheme, ...trendingHashtags.slice(0, 3)]
      });
      notify('success', 'Creative saved to Asset Library! Available for future campaigns.');
      if (showAssetLibrary) fetchAssetLibrary();
    } catch (err: any) {
      notify('error', err?.message || 'Failed to save asset to library');
    }
  };

  const handleReuseAsset = (asset: Asset) => {
    setCurrentImageUrl(asset.public_url);
    if (asset.original_prompt) setAdPrompt(asset.original_prompt);
    if (asset.aspect_ratio) setAspectRatio(asset.aspect_ratio as any);
    if (asset.style) setStylePreset(asset.style);
    setShowAssetLibrary(false);
    notify('success', `Loaded asset "${asset.filename}" into creative workspace.`);
  };

  // ── Launch Paid Campaign ─────────────────────────────────────────────────────
  const handleLaunchPaidCampaign = async () => {
    setCreatingPaidCampaign(true);
    try {
      const activePlatforms = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]);
      const res = await apiClient.post<any>('/crm/campaigns/paid', {
        name: paidCampaignName,
        objective: paidObjective,
        daily_budget: dailyBudget,
        platforms: activePlatforms,
        headline: adHeadline,
        caption: caption || adPrompt,
        image_url: currentImageUrl,
        targeting: {
          age_min: ageMin,
          age_max: ageMax,
          interests: selectedInterests
        }
      });
      setShowPaidModal(false);
      notify('success', `Paid Ad Campaign launched successfully! Projected Daily Reach: ~${(dailyBudget * 25).toLocaleString()} members.`);
      fetchRecentAds();
    } catch (err: any) {
      notify('error', err?.message || 'Failed to launch paid campaign');
    } finally {
      setCreatingPaidCampaign(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* Toast Notification Alert */}
      {statusNotification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            statusNotification.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40 shadow-emerald-950/40'
              : statusNotification.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-500/40 shadow-rose-950/40'
              : 'bg-slate-900 text-cyan-200 border-cyan-500/40 shadow-slate-950/40'
          }`}
        >
          {statusNotification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : statusNotification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <span>{statusNotification.text}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-md shadow-indigo-600/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                AI Marketing & Ad Studio
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Dynamic Creative Pipeline — Generate, Preview & Publish Across Facebook, Instagram, Twitter (X) & YouTube
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* AI Engine Switcher */}
          <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
            {(['Gemini Imagen 3', 'DALL-E 3', 'FLUX Commercial'] as const).map(engine => (
              <button
                key={engine}
                type="button"
                onClick={() => setModelUsed(engine)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modelUsed === engine
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {engine}
              </button>
            ))}
          </div>

          {/* Asset Library Button */}
          <button
            type="button"
            onClick={() => {
              setShowAssetLibrary(true);
              fetchAssetLibrary();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            Asset Library
          </button>

          {/* Launch Paid Campaign CTA */}
          <button
            type="button"
            onClick={() => setShowPaidModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            Launch Paid Ad
          </button>
        </div>
      </div>

      {/* ── WORKSPACE GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN: CREATIVE STUDIO (7 COLS) ── */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* STEP 1: Prompt & Creative Concept */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">Campaign Concept & Visual Art Direction</h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dynamic Prompt</span>
            </div>

            {/* Prompt Input & Optimizer */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={adPrompt}
                  onChange={e => setAdPrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe your gym campaign hook (e.g. Summer Shred Challenge, 1-on-1 Personal Training Promo, Student Gym Pass 50% Off)..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none font-medium leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  disabled={optimizingPrompt}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/60 shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${optimizingPrompt ? 'animate-spin' : ''}`} />
                  {optimizingPrompt ? 'Art Directing...' : 'AI Enhance Prompt'}
                </button>
              </div>

              {/* Optimized Prompt Output (if generated) */}
              {isPromptOptimized && optimizedPrompt && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100/90 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-indigo-950">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Art-Directed Prompt (Optimized for 8K Visual Synthesis)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPromptOptimized(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={optimizedPrompt}
                    onChange={e => setOptimizedPrompt(e.target.value)}
                    rows={2}
                    className="w-full bg-white/80 p-2.5 rounded-xl border border-indigo-200/50 text-slate-800 text-xs font-mono focus:outline-none focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Visual Style & Aspect Ratio Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Visual Style Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-slate-500" />
                  Visual Style
                </label>
                <select
                  value={stylePreset}
                  onChange={e => setStylePreset(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Photorealistic 8K">Photorealistic 8K Athletic Studio</option>
                  <option value="Cyber Neon">Cyberpunk Neon & Laser Glow</option>
                  <option value="3D Pixar Mascot & Character">3D Pixar Mascot & Character</option>
                  <option value="Luxury Gold & Black">Luxury Gold & Deep Obsidian</option>
                  <option value="Dark Athletic Beast">Dark Beast Mode & Smoke</option>
                  <option value="Emerald Vitality">Emerald Vitality & Organic Wellness</option>
                </select>
              </div>

              {/* Aspect Ratio Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['1:1', '9:16', '16:9'] as const).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        aspectRatio === ratio
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ratio === '1:1' ? '1:1 (Post)' : ratio === '9:16' ? '9:16 (Story)' : '16:9 (Banner)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reference Image / Brand Logo Upload */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                {refImageBase64 ? (
                  <div className="relative group">
                    <img
                      src={refImageBase64}
                      alt="Ref"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRefImageBase64('');
                        setRefImageName('');
                      }}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-500">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {refImageName || 'Optional Brand Asset / Reference Image'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {refImageName ? 'Visual attached for AI guidance' : 'Attach logo, athlete photo, or facility reference'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-sm transition-all"
              >
                {refImageBase64 ? 'Change' : 'Browse File'}
              </button>
            </div>

            {/* Action Trigger: Generate Visual Creative */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGenerateVisual}
                disabled={generatingVisual}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-black text-sm shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-60 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${generatingVisual ? 'animate-spin' : ''}`} />
                {generatingVisual ? 'Synthesizing Commercial Creative...' : 'Generate AI Visual Creative'}
              </button>
            </div>
          </div>

          {/* STEP 2: Viral Copywriting, Trending Hashtags & SEO */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">AI Copywriting, Trending Hashtags & SEO</h2>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateCopy()}
                disabled={generatingCopy}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingCopy ? 'animate-spin' : ''}`} />
                {generatingCopy ? 'Drafting...' : 'Regenerate Copy'}
              </button>
            </div>

            {/* Editable Caption */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <label>Social Ad Caption</label>
                <span className="text-[11px] text-slate-400 font-normal">{caption.length} characters</span>
              </div>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={4}
                placeholder="AI-generated high-converting ad caption will appear here..."
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium"
              />
            </div>

            {/* Trending Viral Hashtags */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Trending Fitness Hashtags (Click to Append)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {trendingHashtags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAppendHashtag(tag)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold border border-slate-200/80 transition-all flex items-center gap-1"
                  >
                    <span>{tag}</span>
                    {copiedTag === tag ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Keywords */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                Target SEO Search Keywords
              </span>
              <div className="flex flex-wrap gap-1.5">
                {searchKeywords.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-xl bg-indigo-50/60 text-indigo-800 text-[11px] font-bold border border-indigo-100"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 3: Multi-Platform Publishing Studio */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">Multi-Channel Distribution</h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </div>

            {/* Platform Selection Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'facebook', name: 'Facebook Feed', icon: '📘', desc: 'Feed & Reels' },
                { id: 'instagram', name: 'Instagram', icon: '📸', desc: 'Post & Story' },
                { id: 'twitter', name: 'Twitter (X)', icon: '𝕏', desc: 'Promoted Post' },
                { id: 'youtube', name: 'YouTube', icon: '▶️', desc: 'Community Post' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setSelectedPlatforms(prev => ({
                      ...prev,
                      [p.id]: !prev[p.id]
                    }))
                  }
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedPlatforms[p.id]
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{p.icon}</span>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        selectedPlatforms[p.id] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selectedPlatforms[p.id] && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs font-black text-slate-900">{p.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{p.desc}</p>
                </button>
              ))}
            </div>

            {/* Publishing Success Banner */}
            {publishSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>{publishSuccessMsg}</span>
                <button
                  type="button"
                  onClick={() => setPublishSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handlePublishAll}
                disabled={publishing || (!currentImageUrl && !caption)}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-4 h-4 text-cyan-400 ${publishing ? 'animate-bounce' : ''}`} />
                {publishing ? 'Publishing Live to Selected Platforms...' : '1-Click Publish to Selected Channels'}
              </button>

              <button
                type="button"
                onClick={handleSaveAsset}
                disabled={!currentImageUrl}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4 text-slate-500" />
                Save to Library
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: MULTI-PLATFORM PREVIEW SIMULATOR (5 COLS) ── */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            {/* Header & Simulator Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Live Ad Preview Simulator</h3>
              </div>

              {/* Platform Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                {(['facebook', 'instagram', 'twitter', 'youtube'] as const).map(plat => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => {
                      setPreviewPlatform(plat);
                      if (plat !== 'instagram') setIgStoryMode(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                      previewPlatform === plat
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {plat === 'twitter' ? '𝕏' : plat}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulator Display Card */}
            <div className="bg-slate-100/70 p-3 sm:p-4 rounded-3xl border border-slate-200/60 flex justify-center">
              
              {/* ── FACEBOOK FEED SIMULATOR ── */}
              {previewPlatform === 'facebook' && (
                <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-slate-900 font-sans">
                  {/* Page Header */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
                        {currentGymName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-900">{currentGymName}</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">Sponsored • 🌐</p>
                      </div>
                    </div>
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Post Caption */}
                  <div className="px-3 pb-2.5 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                    {caption || adPrompt}
                  </div>

                  {/* Post Media Creative */}
                  <div className={`relative bg-slate-900 overflow-hidden ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                    {currentImageUrl ? (
                      <img src={currentImageUrl} alt="Creative" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <Sparkles className="w-10 h-10 text-indigo-400 mb-2 opacity-50" />
                        <p className="text-xs font-bold text-slate-300">Visual creative will render here</p>
                        <p className="text-[10px] text-slate-500 mt-1">Click "Generate AI Visual Creative"</p>
                      </div>
                    )}
                  </div>

                  {/* Facebook Link & CTA Bar */}
                  <div className="p-3 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <div className="overflow-hidden pr-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">fitclub.ai/offer</p>
                      <p className="text-xs font-bold text-slate-900 truncate">{adHeadline || 'Claim Special Pass'}</p>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold shrink-0 transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>

                  {/* Social Action Bar */}
                  <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <button className="flex items-center gap-1.5 hover:text-blue-600">
                      <Heart className="w-4 h-4" /> 142
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-blue-600">
                      <MessageCircle className="w-4 h-4" /> 18 Comments
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-blue-600">
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>
              )}

              {/* ── INSTAGRAM SIMULATOR ── */}
              {previewPlatform === 'instagram' && (
                <div className="w-full max-w-[400px] bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden text-slate-900">
                  {/* Story / Post Toggle */}
                  <div className="bg-slate-50 p-2 flex justify-center border-b border-slate-100">
                    <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIgStoryMode(false)}
                        className={`px-3 py-1 rounded-lg transition-all ${!igStoryMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                      >
                        Feed Post
                      </button>
                      <button
                        type="button"
                        onClick={() => setIgStoryMode(true)}
                        className={`px-3 py-1 rounded-lg transition-all ${igStoryMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                      >
                        Story / Reel (9:16)
                      </button>
                    </div>
                  </div>

                  {igStoryMode ? (
                    /* Instagram Story View */
                    <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden text-white flex flex-col justify-between p-4">
                      {currentImageUrl && (
                        <img src={currentImageUrl} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                              {currentGymName.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{currentGymName.toLowerCase().replace(/\s+/g, '_')}</p>
                            <p className="text-[10px] text-slate-300">Sponsored</p>
                          </div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-white" />
                      </div>

                      <div className="relative z-10 text-center space-y-3 pb-2">
                        <p className="text-xs font-bold text-white drop-shadow-md">{adHeadline}</p>
                        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-slate-950 font-black text-xs shadow-lg">
                          <span>Learn More</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Instagram Feed Post */
                    <div>
                      <div className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600">
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-900">
                              {currentGymName.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{currentGymName.toLowerCase().replace(/\s+/g, '_')}</p>
                            <p className="text-[10px] text-slate-400 font-medium">Sponsored</p>
                          </div>
                        </div>
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="relative bg-slate-900 aspect-square overflow-hidden">
                        {currentImageUrl ? (
                          <img src={currentImageUrl} alt="IG Post" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                            <Sparkles className="w-8 h-8 text-indigo-400 mb-2 opacity-50" />
                            <p className="text-xs font-bold text-slate-300">Visual creative will render here</p>
                          </div>
                        )}
                      </div>

                      {/* Instagram Action Row */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-slate-800">
                            <Heart className="w-5 h-5 hover:text-rose-500 cursor-pointer" />
                            <MessageCircle className="w-5 h-5 cursor-pointer" />
                            <Send className="w-5 h-5 cursor-pointer" />
                          </div>
                          <Bookmark className="w-5 h-5 text-slate-800 cursor-pointer" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">1,280 likes</p>
                        <p className="text-xs text-slate-800 line-clamp-3">
                          <span className="font-bold mr-1.5">{currentGymName.toLowerCase().replace(/\s+/g, '_')}</span>
                          {caption || adPrompt}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TWITTER (X) SIMULATOR ── */}
              {previewPlatform === 'twitter' && (
                <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-3 font-sans">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {currentGymName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-xs text-slate-900 truncate">{currentGymName}</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-sky-500 flex items-center justify-center text-white text-[9px]">✓</span>
                          <span className="text-[11px] text-slate-400">@{currentGymName.toLowerCase().replace(/\s+/g, '')}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 rounded-md bg-slate-100">Promoted</span>
                      </div>

                      <p className="text-xs text-slate-800 mt-1.5 whitespace-pre-line leading-relaxed">
                        {caption || adPrompt}
                      </p>

                      {/* Attached Card */}
                      <div className="mt-3 rounded-2xl border border-slate-200 overflow-hidden bg-slate-900">
                        {currentImageUrl ? (
                          <img src={currentImageUrl} alt="X Card" className="w-full aspect-[16/9] object-cover" />
                        ) : (
                          <div className="w-full aspect-[16/9] flex items-center justify-center text-slate-400 text-xs font-semibold">
                            Visual Creative Preview
                          </div>
                        )}
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100">
                          <p className="text-[10px] text-slate-400">fitclub.ai</p>
                          <p className="text-xs font-bold text-slate-900 truncate">{adHeadline}</p>
                        </div>
                      </div>

                      {/* X Metrics */}
                      <div className="flex items-center justify-between text-slate-400 text-xs pt-3 mt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> 24</span>
                        <span className="flex items-center gap-1"><Repeat2 className="w-3.5 h-3.5" /> 68</span>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> 312</span>
                        <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── YOUTUBE COMMUNITY / SHORTS AD SIMULATOR ── */}
              {previewPlatform === 'youtube' && (
                <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-3 font-sans">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm">
                        {currentGymName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-900">{currentGymName} Fitness</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-400 flex items-center justify-center text-white text-[9px]">✓</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Sponsored • 35.6K subscribers</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-full">
                      Subscribe
                    </button>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {caption || adPrompt}
                  </p>

                  <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                    {currentImageUrl ? (
                      <img src={currentImageUrl} alt="YT Post" className="w-full aspect-[16/9] object-cover" />
                    ) : (
                      <div className="w-full aspect-[16/9] flex items-center justify-center text-slate-400 text-xs font-semibold">
                        Visual Creative Preview
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">{adHeadline || 'Claim Exclusive Offer'}</p>
                      <p className="text-[10px] text-slate-500">Official Membership Portal</p>
                    </div>
                    <button className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                      <span>Visit Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT CAMPAIGNS PERFORMANCE TABLE ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Campaign History & Live Ad Performance</h2>
          </div>
          <button
            type="button"
            onClick={fetchRecentAds}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAds ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60">
                <th className="p-3.5 rounded-l-xl">Campaign Headline</th>
                <th className="p-3.5">Platform</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Impressions</th>
                <th className="p-3.5">Clicks (CTR)</th>
                <th className="p-3.5">Leads Generated</th>
                <th className="p-3.5">Budget</th>
                <th className="p-3.5 rounded-r-xl text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {recentAds.length > 0 ? (
                recentAds.map(ad => (
                  <tr key={ad.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        {ad.image_url ? (
                          <img src={ad.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-bold text-slate-900 line-clamp-1">{ad.headline || ad.prompt}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                        {ad.platform || 'Multi-Platform'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        ad.status === 'Published' || ad.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ad.status || 'Draft'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold">{ad.impressions?.toLocaleString() || 0}</td>
                    <td className="p-3.5">
                      <span className="font-bold">{ad.clicks?.toLocaleString() || 0}</span>
                      <span className="text-[11px] text-slate-400 ml-1">({ad.ctr || 0}%)</span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-600">{ad.leads_generated || 0}</td>
                    <td className="p-3.5 font-bold text-slate-900">₹{(ad.budget || 0).toLocaleString()}</td>
                    <td className="p-3.5 text-right text-slate-400 text-[11px]">{ad.created_at || 'Recently'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    No marketing campaigns generated yet. Create your first ad above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ASSET LIBRARY ── */}
      {showAssetLibrary && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Creative Asset Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetLibrary(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loadingAssets ? (
                <div className="p-12 text-center text-slate-400">Loading saved assets...</div>
              ) : assetLibrary.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assetLibrary.map(asset => (
                    <div key={asset.id} className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 space-y-2 pb-2">
                      <div className="aspect-square bg-slate-900 overflow-hidden">
                        <img src={asset.public_url} alt={asset.filename} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      </div>
                      <div className="px-2.5">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{asset.original_prompt || asset.filename}</p>
                        <p className="text-[10px] text-slate-400">{asset.style || 'Creative'}</p>
                      </div>
                      <div className="px-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleReuseAsset(asset)}
                          className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          Use in Studio
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No saved assets in your library yet. Generate an ad and click "Save to Library".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PAID CAMPAIGN BUILDER ── */}
      {showPaidModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Launch Paid Meta & Social Ad Campaign</h3>
                  <p className="text-xs text-slate-500">Configure audience targeting, budget, and live projections</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaidModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Campaign Objective */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Campaign Objective</label>
                <select
                  value={paidObjective}
                  onChange={e => setPaidObjective(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                >
                  <option value="OUTCOME_LEADS">📋 Lead Generation (High ROI Membership Signups)</option>
                  <option value="OUTCOME_SALES">💰 Direct Pass Sales & Conversions</option>
                  <option value="OUTCOME_TRAFFIC">🔗 Website & WhatsApp Traffic</option>
                  <option value="OUTCOME_ENGAGEMENT">❤️ Social Post Engagement & Video Views</option>
                  <option value="OUTCOME_AWARENESS">🌐 Local Brand Awareness & Reach</option>
                </select>
              </div>

              {/* Daily Budget Slider */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>Daily Ad Budget</span>
                  <span className="text-base text-emerald-600">₹{dailyBudget.toLocaleString()}/day</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={25000}
                  step={500}
                  value={dailyBudget}
                  onChange={e => setDailyBudget(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                
                {/* Live Projections */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Daily Reach</p>
                    <p className="text-xs font-black text-slate-900">{(dailyBudget * 28).toLocaleString()} users</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Clicks</p>
                    <p className="text-xs font-black text-slate-900">{(dailyBudget * 0.95).toFixed(0)} clicks</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Leads</p>
                    <p className="text-xs font-black text-emerald-600">{(dailyBudget * 0.12).toFixed(0)} leads</p>
                  </div>
                </div>
              </div>

              {/* Demographics & Targeting */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Age Range</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={ageMin}
                      onChange={e => setAgeMin(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 text-center font-bold"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      value={ageMax}
                      onChange={e => setAgeMax(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Geo-Radius</label>
                  <input
                    type="text"
                    defaultValue="Within 10 km of Gym Branch"
                    className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Modal Submit */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPaidModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunchPaidCampaign}
                disabled={creatingPaidCampaign}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {creatingPaidCampaign ? 'Launching Ad Set...' : 'Confirm & Launch Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
