import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { customerApi } from '@/services/customerApi';
import { morphPhysiqueImage } from '@/utils/imagePhysiqueMorpher';
import { BeforeAfterFrameStudio } from '@/components/customer/BeforeAfterFrameStudio';
import type {
  CustomerProfile,
  TransformationResponse,
  SavedTransformationRecord,
} from '@/types/customer';

const getRecommendedTargetWeight = (
  cond: 'lean' | 'bulk' | 'recomp' | 'athletic',
  currW: number,
  gender: 'Male' | 'Female'
): string => {
  if (!currW || currW <= 0) return '';
  const isFemale = gender === 'Female';
  if (cond === 'bulk') return String(Math.round(currW * (isFemale ? 1.05 : 1.08) * 10) / 10);
  if (cond === 'lean') return String(Math.round(currW * (isFemale ? 0.88 : 0.90) * 10) / 10);
  if (cond === 'athletic') return String(Math.round(currW * (isFemale ? 0.94 : 0.95) * 10) / 10);
  return String(Math.round(currW * (isFemale ? 0.96 : 0.98) * 10) / 10); // recomp
};

export function CustomerTransformationPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [bodyCondition, setBodyCondition] = useState<'lean' | 'bulk' | 'recomp' | 'athletic'>('bulk');
  const [currentWeight, setCurrentWeight] = useState<string>('');
  const [currentHeight, setCurrentHeight] = useState<string>('');
  const [currentAge, setCurrentAge] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [beforeImage, setBeforeImage] = useState<string>('');
  const [morphedImage, setMorphedImage] = useState<string>('');
  
  // Simulation State
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<TransformationResponse | null>(null);
  const [history, setHistory] = useState<SavedTransformationRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');
  
  // Tabs: 'frame-studio' | 'simulator'
  const [activeTab, setActiveTab] = useState<'frame-studio' | 'simulator'>('frame-studio');
  
  // Interactive Split Slider State (0 to 100)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileAndHistory = async () => {
    setLoadingProfile(true);
    try {
      const [profRes, histRes] = await Promise.all([
        customerApi.getProfile(),
        customerApi.getTransformationHistory().catch(() => [])
      ]);
      setProfile(profRes);
      setHistory(histRes || []);
      
      if (profRes) {
        const userGender: 'Male' | 'Female' = profRes.gender && profRes.gender.toLowerCase().includes('female') ? 'Female' : 'Male';
        setGender(userGender);
        const cond = (profRes.body_condition && ['lean', 'bulk', 'recomp', 'athletic'].includes(profRes.body_condition))
          ? (profRes.body_condition as any)
          : 'bulk';
        setBodyCondition(cond);
        if (profRes.weight) {
          setCurrentWeight(String(profRes.weight));
        }
        if (profRes.height) {
          setCurrentHeight(String(profRes.height));
        }
        if (profRes.age) {
          setCurrentAge(String(profRes.age));
        }
        if (profRes.target_weight) {
          setTargetWeight(String(profRes.target_weight));
        } else if (profRes.weight) {
          setTargetWeight(getRecommendedTargetWeight(cond, profRes.weight, userGender));
        }
        if (profRes.profile_image) {
          setBeforeImage(profRes.profile_image);
          morphPhysiqueImage(profRes.profile_image, cond, userGender.toLowerCase() as any).then(setMorphedImage);
        }
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfileAndHistory();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGenderChange = (newGender: 'Male' | 'Female') => {
    setGender(newGender);
    setSimulationResult(null);
    const w = currentWeight ? parseFloat(currentWeight) : (profile?.weight || 0);
    if (w > 0) {
      setTargetWeight(getRecommendedTargetWeight(bodyCondition, w, newGender));
    }
    if (beforeImage) {
      morphPhysiqueImage(beforeImage, bodyCondition, newGender.toLowerCase() as any).then(setMorphedImage);
    }
  };

  const handleConditionChange = (newCond: 'lean' | 'bulk' | 'recomp' | 'athletic') => {
    setBodyCondition(newCond);
    setSimulationResult(null);
    const w = currentWeight ? parseFloat(currentWeight) : (profile?.weight || 0);
    if (w > 0) {
      setTargetWeight(getRecommendedTargetWeight(newCond, w, gender));
    }
    if (beforeImage) {
      morphPhysiqueImage(beforeImage, newCond, gender.toLowerCase() as any).then(setMorphedImage);
    }
  };

  const handleCurrentWeightChange = (newVal: string) => {
    setCurrentWeight(newVal);
    const w = parseFloat(newVal);
    if (w > 0) {
      setTargetWeight(getRecommendedTargetWeight(bodyCondition, w, gender));
    }
  };

  const handleSimulate = async () => {
    const weightVal = currentWeight ? parseFloat(currentWeight) : profile?.weight;
    const heightVal = currentHeight ? parseFloat(currentHeight) : profile?.height;
    const ageVal = currentAge ? parseInt(currentAge) : profile?.age;

    if (!weightVal || weightVal <= 0) {
      triggerToast('Please enter your current weight.');
      return;
    }
    if (!heightVal || heightVal <= 0) {
      triggerToast('Please enter your height in cm.');
      return;
    }
    if (!ageVal || ageVal <= 0) {
      triggerToast('Please enter your age in years.');
      return;
    }

    setSimulating(true);
    try {
      if (beforeImage) {
        const morphed = await morphPhysiqueImage(beforeImage, bodyCondition, gender.toLowerCase() as any);
        setMorphedImage(morphed);
      }
      const payload = {
        body_condition: bodyCondition,
        gender: gender,
        age: ageVal,
        before_image: beforeImage || undefined,
        current_weight_kg: weightVal,
        height_cm: heightVal,
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : undefined
      };
      const result = await customerApi.simulateTransformation(payload);
      setSimulationResult(result);
      if (result.target_weight_kg) {
        setTargetWeight(String(result.target_weight_kg));
      }
      if (result.after_image_url && result.after_image_url.startsWith('data:image/jpeg')) {
        setMorphedImage(result.after_image_url);
      }
      triggerToast('✨ AI Photorealistic Projection generated successfully!');
    } catch (_err: any) {
      const errMsg = _err?.response?.data?.detail || _err?.message || 'Failed to generate transformation projection. Please check parameters.';
      triggerToast(errMsg);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveRoadmap = async () => {
    if (!simulationResult) return;
    setSaving(true);
    try {
      await customerApi.saveTransformation({
        ...simulationResult,
        before_image_url: beforeImage,
        after_image_url: morphedImage || simulationResult.after_image_url
      });
      triggerToast('✅ Transformation Roadmap saved & active targets applied to profile!');
      const updatedHistory = await customerApi.getTransformationHistory();
      setHistory(updatedHistory);
    } catch (_err: any) {
      const errMsg = _err?.response?.data?.detail || _err?.message || 'Failed to save transformation roadmap.';
      triggerToast(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setBeforeImage(base64);
        setSimulationResult(null);
        morphPhysiqueImage(base64, bodyCondition, gender.toLowerCase() as any).then(setMorphedImage);
      };
      reader.readAsDataURL(file);
    }
  };

  // Split-Slider Drag handlers
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPos(pct);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleSliderMove(e.clientX);
    }
  };

  const conditionOptions = [
    {
      id: 'lean',
      title: 'Lean & Shredded',
      desc: 'Caloric deficit targeting 8-12% body fat, sharp abdominal definition & vascularity',
      icon: 'zap',
      badge: 'Deficit (-500 kcal)',
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400'
    },
    {
      id: 'bulk',
      title: 'Hypertrophy & Bulking',
      desc: 'Clean caloric surplus for maximum lean myofibrillar muscle density & heavy strength',
      icon: 'trending-up',
      badge: 'Surplus (+380 kcal)',
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400'
    },
    {
      id: 'recomp',
      title: 'Body Recomposition',
      desc: 'Simultaneous fat loss & muscle tone at maintenance with high nutrient partitioning',
      icon: 'refresh-cw',
      badge: 'Partitioning (0 to -100 kcal)',
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/40 text-purple-400'
    },
    {
      id: 'athletic',
      title: 'Athletic Conditioning',
      desc: 'Functional power-to-weight optimization, speed, mobility & lean endurance tone',
      icon: 'activity',
      badge: 'Functional (-250 kcal)',
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400'
    }
  ];

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI Transformation Studio" breadcrumb={['Customer', 'AI Transformation']} />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  const afterImage = (simulationResult?.after_image_url && !simulationResult.after_image_url.includes('svg'))
    ? simulationResult.after_image_url
    : (morphedImage || beforeImage);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <PageHeader
        title="AI Transformation Studio"
        subtitle="Simulate your target physique, generate Before & After visual projections, and compute clinical diet & milestone roadmaps"
        breadcrumb={['Customer', 'AI Transformation']}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-brand-900/90 border border-brand-500/50 text-brand-200 text-xs font-bold shadow-2xl flex items-center justify-between backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" size={16} className="text-brand-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-brand-400 hover:text-white">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl bg-navy-100/80 border border-navy-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('frame-studio')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'frame-studio'
              ? 'bg-navy-950 text-white shadow-xl shadow-navy-950/25 ring-2 ring-amber-400/50'
              : 'text-navy-600 hover:text-navy-950 hover:bg-white/70'
          }`}
        >
          <Icon name="camera" size={16} className={activeTab === 'frame-studio' ? 'text-amber-400' : ''} />
          <span>Before & After Frame Studio</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
            FEATURED
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-navy-950 text-white shadow-xl shadow-navy-950/25 ring-2 ring-brand-400/50'
              : 'text-navy-600 hover:text-navy-950 hover:bg-white/70'
          }`}
        >
          <Icon name="wand-2" size={16} className={activeTab === 'simulator' ? 'text-brand-400' : ''} />
          <span>AI Physique Simulator & Targets</span>
        </button>
      </div>

      {/* ─── TAB 1: BEFORE & AFTER FRAME STUDIO ─── */}
      {activeTab === 'frame-studio' && (
        <BeforeAfterFrameStudio
          profile={profile}
          initialBeforeImage={beforeImage}
          initialAfterImage={afterImage}
          onToast={triggerToast}
        />
      )}

      {/* ─── TAB 2: AI PHYSIQUE SIMULATOR & CLINICAL ROADMAP ─── */}
      {activeTab === 'simulator' && (
        <>
          {/* 1. Setup & Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Input Parameters & Condition Selector (5 Cols) */}
            <div className="lg:col-span-5 card p-6 border border-navy-100 bg-white shadow-sm rounded-3xl space-y-5">
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Icon name="sliders" size={18} className="text-brand-600" />
                Transformation Setup
              </h3>
              <p className="text-xs text-navy-400">Set target condition & body parameters</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold border border-navy-200">
              {gender} • {currentWeight ? `${currentWeight} kg` : 'Weight Not Set'}
            </span>
          </div>

          {/* Dynamic Gender / Biological Profile Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-700 block">Biological Profile / Gender</label>
            <div className="grid grid-cols-2 gap-2 bg-navy-50/80 p-1 rounded-2xl border border-navy-100">
              <button
                type="button"
                onClick={() => handleGenderChange('Male')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gender === 'Male'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-white/60'
                }`}
              >
                <span>👨</span> Male
              </button>
              <button
                type="button"
                onClick={() => handleGenderChange('Female')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  gender === 'Female'
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-white/60'
                }`}
              >
                <span>👩</span> Female
              </button>
            </div>
          </div>

          {/* Missing Biometrics Alert */}
          {(!currentWeight && !profile?.weight || !currentHeight && !profile?.height || !currentAge && !profile?.age) && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="text-amber-600 shrink-0" />
              <span>
                Please enter your weight, height, and age below to enable clinical transformation calculations.
              </span>
            </div>
          )}

          {/* Condition Selector Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-navy-700 block">Select Target Body Condition</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {conditionOptions.map((opt) => {
                const isSelected = bodyCondition === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleConditionChange(opt.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-navy-900 border-brand-500 shadow-md ring-2 ring-brand-500/20'
                        : 'bg-navy-50/50 hover:bg-navy-50 border-navy-200/80 text-navy-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`p-1.5 rounded-xl ${isSelected ? 'bg-brand-500/20 text-brand-300' : 'bg-navy-200/50 text-navy-600'}`}>
                          <Icon name={opt.icon} size={15} />
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-brand-500/30 text-brand-200' : 'bg-navy-200/60 text-navy-600'}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-navy-900'}`}>{opt.title}</h4>
                      <p className={`text-[10px] mt-1 line-clamp-2 leading-relaxed ${isSelected ? 'text-navy-300' : 'text-navy-500'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Weight & Biometric Adjuster */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1 block">Current Weight</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 75"
                  value={currentWeight}
                  onChange={(e) => handleCurrentWeightChange(e.target.value)}
                  className="input-field text-xs font-bold pr-8 focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-navy-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1 block">Height</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 175"
                  value={currentHeight}
                  onChange={(e) => setCurrentHeight(e.target.value)}
                  className="input-field text-xs font-bold pr-8 focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-navy-400 pointer-events-none">
                  cm
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1 block">Age</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 25"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(e.target.value)}
                  className="input-field text-xs font-bold pr-8 focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-navy-400 pointer-events-none">
                  yrs
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-navy-700 mb-1 block">Target Weight</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  placeholder="Auto-calculated"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="input-field text-xs font-bold pr-8 focus:ring-2 focus:ring-brand-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-navy-400 pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* Upload Before Photo */}
          <div className="space-y-2 pt-2 border-t border-navy-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-700">Before Photo</label>
              {beforeImage && (
                <button
                  type="button"
                  onClick={() => { setBeforeImage(''); setSimulationResult(null); }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Icon name="x" size={12} /> Clear
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-navy-200 hover:border-brand-500 bg-navy-50/50 hover:bg-brand-50/20 text-navy-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Icon name="upload-cloud" size={16} className="text-brand-600" />
              {beforeImage ? 'Change Uploaded Photo' : 'Upload Your "Before" Photo'}
            </button>
          </div>

          {/* Simulate Action CTA */}
          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-glow flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {simulating ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Generating AI Transformed Physique & Roadmap...
              </>
            ) : (
              <>
                <Icon name="sparkles" size={16} />
                Generate AI Transformation Projection
              </>
            )}
          </button>
        </div>

        {/* Right: Interactive Before & After Visual Frame (7 Cols) */}
        <div className="lg:col-span-7 card p-6 border border-navy-900/80 bg-navy-950 text-white shadow-2xl rounded-3xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <Icon name="camera" size={16} className="text-brand-400" />
                Interactive Visual Comparison Frame
              </h3>
            </div>

            <div className="flex items-center gap-2 bg-navy-900/90 p-1 rounded-xl border border-navy-800">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'slider' ? 'bg-brand-600 text-white shadow-sm' : 'text-navy-400 hover:text-white'
                }`}
              >
                <Icon name="split" size={12} /> Split Slider
              </button>
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'side-by-side' ? 'bg-brand-600 text-white shadow-sm' : 'text-navy-400 hover:text-white'
                }`}
              >
                <Icon name="columns" size={12} /> Side-by-Side
              </button>
            </div>
          </div>

          {/* Frame Container */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-navy-900 border border-navy-800 flex items-center justify-center min-h-[380px] max-h-[480px]">
            {!beforeImage && !simulationResult ? (
              /* Empty upload prompt inside frame */
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-navy-800/80 border border-navy-700 flex items-center justify-center text-brand-400">
                  <Icon name="camera" size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Photo Uploaded Yet</h4>
                  <p className="text-xs text-navy-400 max-w-xs mt-1">
                    Upload your current photo or click "Generate AI Transformation Projection" to compute your clinical roadmap.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Icon name="upload-cloud" size={14} /> Upload Photo
                </button>
              </div>
            ) : viewMode === 'slider' ? (
              <div
                ref={sliderContainerRef}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove={handleMouseMove}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                onTouchMove={handleTouchMove}
                className="relative w-full h-[440px] select-none cursor-ew-resize overflow-hidden"
              >
                {/* AFTER Image (Full background layer) */}
                <img
                  src={afterImage}
                  alt="Projected After"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* BEFORE Image (Clipped overlay layer) */}
                <div
                  style={{ width: `${sliderPos}%` }}
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-brand-400 bg-navy-950/80 pointer-events-none"
                >
                  {beforeImage ? (
                    <img
                      src={beforeImage}
                      alt="Current Before"
                      style={{ width: sliderContainerRef.current ? `${sliderContainerRef.current.clientWidth}px` : '100%', maxWidth: 'none' }}
                      className="absolute inset-y-0 left-0 h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-navy-400 text-xs">
                      No Before Photo
                    </div>
                  )}
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded-lg bg-navy-900/90 text-white text-[10px] font-extrabold border border-navy-700 tracking-wider shadow-md">
                    BEFORE (CURRENT)
                  </span>
                </div>

                {/* AFTER Label on Right Side */}
                <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 text-white text-[10px] font-extrabold tracking-wider shadow-lg pointer-events-none">
                  AI PROJECTED AFTER
                </span>

                {/* Draggable Divider Handle */}
                <div
                  style={{ left: `${sliderPos}%` }}
                  className="absolute inset-y-0 -translate-x-1/2 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-8 h-8 rounded-full bg-white text-navy-950 font-bold flex items-center justify-center shadow-glow border-2 border-brand-500 pointer-events-auto cursor-grab active:cursor-grabbing">
                    <Icon name="chevrons-left-right" size={16} className="text-brand-600" />
                  </div>
                </div>

                {/* Bottom Overlay Hint */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-navy-950/80 backdrop-blur-md text-navy-300 text-[10px] font-semibold border border-navy-800">
                    Drag handle left/right to compare Before & After ({Math.round(sliderPos)}%)
                  </span>
                </div>
              </div>
            ) : (
              /* Side-by-Side Dual View */
              <div className="grid grid-cols-2 gap-3 w-full h-[440px] p-3">
                <div className="relative rounded-xl overflow-hidden bg-navy-950 border border-navy-800 flex flex-col items-center justify-center">
                  {beforeImage ? (
                    <img src={beforeImage} alt="Before" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-navy-500 text-xs">No Photo</div>
                  )}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-navy-900/90 text-white text-[10px] font-bold border border-navy-700">
                    BEFORE: {profile?.weight ? `${profile.weight} kg` : '--'}
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-navy-950 border border-brand-500/50 flex flex-col items-center justify-center">
                  <img src={afterImage} alt="After" className="w-full h-full object-contain" />
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-brand-600 text-white text-[10px] font-bold shadow-md">
                    AFTER: {simulationResult?.target_weight_kg || targetWeight || '--'} kg
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar: Save & Apply to Profile */}
          <div className="flex items-center justify-between pt-2 border-t border-navy-900 z-10">
            <div className="text-xs text-navy-400">
              {simulationResult ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Icon name="check-circle" size={14} /> Projection derived from Mifflin-St Jeor clinical equations
                </span>
              ) : (
                <span>Click "Generate AI Transformation Projection" to compute timeline</span>
              )}
            </div>

            {simulationResult && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('frame-studio');
                    triggerToast('📸 Switched to Frame Studio with your AI projection ready!');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Icon name="camera" size={14} />
                  <span>Design Social Frame</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoadmap}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Icon name="bookmark-check" size={14} />
                  {saving ? 'Saving...' : 'Save Roadmap'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Timeline, Milestones & Clinical Roadmap (Shown once simulated) */}
      {simulationResult && (
        <div className="space-y-6 animate-scale-in">
          {/* Top Roadmap Highlights Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 bg-white border border-brand-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-navy-400 mb-2">
                <span className="text-xs font-bold">Estimated Duration</span>
                <Icon name="clock" size={18} className="text-brand-600" />
              </div>
              <div className="text-2xl font-black text-navy-900 tracking-tight">
                {simulationResult.estimated_months} <span className="text-sm font-semibold text-navy-500">Months</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-600 mt-1">
                {simulationResult.estimated_weeks} Weeks Projected Roadmap
              </p>
            </div>

            <div className="card p-5 bg-white border border-brand-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-navy-400 mb-2">
                <span className="text-xs font-bold">Daily Target Calories</span>
                <Icon name="flame" size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-navy-900 tracking-tight">
                {simulationResult.target_calories} <span className="text-sm font-semibold text-navy-500">kcal/day</span>
              </div>
              <p className="text-[11px] font-medium text-navy-500 mt-1">
                TDEE: {Math.round(simulationResult.tdee_kcal)} kcal • BMR: {Math.round(simulationResult.bmr_kcal)}
              </p>
            </div>

            <div className="card p-5 bg-white border border-brand-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-navy-400 mb-2">
                <span className="text-xs font-bold">Protein Requirement</span>
                <Icon name="beef" size={18} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-navy-900 tracking-tight">
                {simulationResult.target_protein_g} <span className="text-sm font-semibold text-navy-500">g/day</span>
              </div>
              <p className="text-[11px] font-medium text-emerald-600 mt-1">
                High Anabolic Satiety Split
              </p>
            </div>

            <div className="card p-5 bg-white border border-brand-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-navy-400 mb-2">
                <span className="text-xs font-bold">Hydration Target</span>
                <Icon name="droplet" size={18} className="text-cyan-500" />
              </div>
              <div className="text-2xl font-black text-navy-900 tracking-tight">
                {simulationResult.target_water_l} <span className="text-sm font-semibold text-navy-500">Liters/day</span>
              </div>
              <p className="text-[11px] font-medium text-cyan-600 mt-1">
                Cellular Recovery Standard
              </p>
            </div>
          </div>

          {/* Phase-by-Phase Timeline Progression Roadmap */}
          <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Icon name="git-commit" size={18} className="text-brand-600" />
                  Clinical 3-Phase Transformation Roadmap
                </h3>
                <p className="text-xs text-navy-400">Step-by-step physiological adaptation stages</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                {bodyCondition.toUpperCase()} PROTOCOL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {simulationResult.roadmap_phases.map((phase) => (
                <div
                  key={phase.phase_number}
                  className="p-4 rounded-2xl border border-navy-100 bg-navy-50/40 hover:bg-navy-50/80 transition-all space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-navy-900 text-white font-extrabold text-[10px]">
                      PHASE {phase.phase_number}
                    </span>
                    <span className="text-xs font-bold text-brand-600">{phase.duration}</span>
                  </div>
                  <h4 className="text-xs font-bold text-navy-900 leading-snug">{phase.title}</h4>
                  <p className="text-[11px] text-navy-600 leading-relaxed">{phase.focus}</p>
                  <div className="pt-2 border-t border-navy-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-navy-400 font-medium">Milestone:</span>
                    <span className="font-bold text-emerald-600">{phase.milestone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Tailored Daily Meal-by-Meal Diet Plan */}
          <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Icon name="apple" size={18} className="text-brand-600" />
                  Tailored Daily Diet & Macronutrient Protocol
                </h3>
                <p className="text-xs text-navy-400">
                  Customized for {profile?.dietary_preference || 'Balanced'} Diet • {simulationResult.target_calories} Total kcal
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-navy-700">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  🥩 {simulationResult.target_protein_g}g Protein
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  🌾 {simulationResult.target_carbs_g}g Carbs
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  🥑 {simulationResult.target_fat_g}g Fats
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {simulationResult.diet_plan.map((meal, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-navy-100 bg-white shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between border-b border-navy-100 pb-2">
                    <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                      <Icon name={meal.icon} size={14} className="text-brand-600" />
                      {meal.meal_name}
                    </span>
                    <span className="text-[10px] font-bold text-navy-400">{meal.time}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-brand-600">{meal.calories} kcal</span>
                    <span className="text-navy-500 text-[10px]">
                      P: {meal.protein_g}g • C: {meal.carbs_g}g • F: {meal.fat_g}g
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-navy-400 uppercase tracking-wider block">Recommended Foods:</span>
                    {meal.recommended_items.map((food, fIdx) => (
                      <div key={fIdx} className="text-[11px] text-navy-700 flex items-start gap-1">
                        <span className="text-brand-500 mt-0.5">•</span>
                        <span>{food}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Tailored Weekly Workout Protocol */}
          <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Icon name="dumbbell" size={18} className="text-brand-600" />
                  Tailored Training Split Structure
                </h3>
                <p className="text-xs text-navy-400">Weekly stimulus aligned with {bodyCondition} adaptation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {simulationResult.workout_split.map((day, dIdx) => (
                <div key={dIdx} className="p-3.5 rounded-2xl border border-navy-100 bg-navy-50/30 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-brand-600">{day.day}</span>
                  </div>
                  <h4 className="text-xs font-bold text-navy-900">{day.focus}</h4>
                  <p className="text-[11px] text-navy-500 leading-tight">{day.sets}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Transformation History Snapshots */}
      {history.length > 0 && (
        <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Icon name="history" size={18} className="text-brand-600" />
              Saved Transformation Projections
            </h3>
            <span className="text-xs text-navy-400">{history.length} Projections Recorded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-navy-100 bg-navy-50/40 hover:bg-navy-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-navy-900 text-white text-[10px] font-bold uppercase">
                    {item.body_condition}
                  </span>
                  <span className="text-[10px] text-navy-400 font-semibold">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-navy-400 block">Weight Target</span>
                    <span className="text-navy-900">{item.current_weight_kg} → {item.target_weight_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-navy-400 block">Timeline</span>
                    <span className="text-brand-600">{item.estimated_months} Months</span>
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  Target Calories: {item.target_calories} kcal • {item.target_protein_g}g Protein
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
