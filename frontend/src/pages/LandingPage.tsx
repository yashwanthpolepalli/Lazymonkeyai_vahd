import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Users,
  Fingerprint,
  CreditCard,
  Dumbbell,
  Megaphone,
  BarChart3,
  Star,
  Globe,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  Check,
  ChevronRight,
  Flame,
  Award,
  Layers,
  Utensils,
  Camera,
  RefreshCw,
  X,
  Phone,
  Mail,
  MessageCircle,
  Headphones,
  CheckCircle,
  Monitor,
  FileText,
  Shield,
  Calendar,
  Youtube,
  Instagram,
  Linkedin
} from 'lucide-react';
import { broadcastNewLeadAlert } from '@/utils/audioAlert';
import { apiClient } from '@/services/apiClient';
import { FitClubLogoIcon } from '@/components/common/FitClubLogoIcon';

export function LandingPage() {
  const navigate = useNavigate();

  // Navigation & Interactive States
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedLanguage, setSelectedLanguage] = useState<'EN' | 'HI' | 'TE' | 'TA'>('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Pro');
  const [showContactModal, setShowContactModal] = useState(false);

  // Form input states for Free Trial
  const [trialForm, setTrialForm] = useState({
    gymName: '',
    name: '',
    phone: '',
    city: ''
  });
  const [trialSuccess, setTrialSuccess] = useState(false);
  const [isSubmittingTrial, setIsSubmittingTrial] = useState(false);

  // Form input states for Enterprise Contact
  const [contactForm, setContactForm] = useState({
    franchiseName: '',
    branches: '5',
    members: '2500',
    contactPerson: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Handle Free Trial Form Submission with Super Admin Beep & Alert
  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTrial(true);

    try {
      // 1. Broadcast lead alert (plays sound + updates storage + dispatches window event)
      broadcastNewLeadAlert({
        name: trialForm.name,
        phone: trialForm.phone,
        gymName: trialForm.gymName,
        plan: `${selectedPlan} Plan (14-Day Free Trial)`,
        notes: `City: ${trialForm.city}`
      });

      // 2. Post to backend live alerts endpoint
      await apiClient.post('/system/notifications/live-alert', {
        title: `🔥 New Free Trial Registration: ${trialForm.gymName}`,
        body: `${trialForm.name} (${trialForm.phone}) registered ${trialForm.gymName} in ${trialForm.city} for ${selectedPlan} Plan.`,
        category: 'lead'
      }).catch(() => {});

      setTrialSuccess(true);
      setTimeout(() => {
        setTrialSuccess(false);
        setShowSignupModal(false);
        navigate('/login');
      }, 2400);
    } catch (err) {
      console.error(err);
      setTrialSuccess(true);
      setTimeout(() => {
        setShowSignupModal(false);
        navigate('/login');
      }, 2000);
    } finally {
      setIsSubmittingTrial(false);
    }
  };

  // Handle Enterprise Contact Submission with Super Admin Beep & Alert
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      // 1. Broadcast lead alert
      broadcastNewLeadAlert({
        name: contactForm.contactPerson || 'Franchise Representative',
        phone: contactForm.phone,
        email: contactForm.email || 'roufbaig123@gmail.com',
        gymName: contactForm.franchiseName,
        plan: 'Enterprise Custom Franchise',
        notes: `Branches: ${contactForm.branches}, Members: ${contactForm.members}. Notes: ${contactForm.notes}`
      });

      // 2. Post to backend
      await apiClient.post('/system/notifications/live-alert', {
        title: `🏢 Enterprise Gym Inquiry: ${contactForm.franchiseName}`,
        body: `${contactForm.contactPerson} (${contactForm.phone}) requested Enterprise setup for ${contactForm.franchiseName} (${contactForm.branches} branches, ${contactForm.members} members). Contact: +91 98493 44919 / roufbaig123@gmail.com`,
        category: 'lead'
      }).catch(() => {});

      setContactSuccess(true);
      setTimeout(() => {
        setContactSuccess(false);
        setShowContactModal(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setContactSuccess(true);
      setTimeout(() => setShowContactModal(false), 2500);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Dynamic AI Diet Plan Demo State
  const [activeDietGoal, setActiveDietGoal] = useState<'fat_loss' | 'muscle_gain' | 'keto'>('fat_loss');
  const [isRegeneratingDiet, setIsRegeneratingDiet] = useState(false);

  const dietPlans = {
    fat_loss: {
      goal: 'Create a 4-week diet plan for fat loss',
      calories: '2,100',
      protein: '180g',
      carbs: '220g',
      fats: '70g',
      breakfast: 'Oats with Banana & Whey',
      breakfastCal: '450 kcal',
      lunch: 'Grilled Chicken + Brown Rice',
      lunchCal: '680 kcal',
      dinner: 'Low-fat Paneer + Sautéed Veggies',
      dinnerCal: '520 kcal'
    },
    muscle_gain: {
      goal: 'High protein lean bulking diet plan',
      calories: '2,850',
      protein: '220g',
      carbs: '340g',
      fats: '85g',
      breakfast: 'Egg White Omelet + Peanut Butter Toast',
      breakfastCal: '650 kcal',
      lunch: 'Salmon / Chicken Breast + Quinoa Bowl',
      lunchCal: '890 kcal',
      dinner: 'Tofu / Paneer Curry + Sweet Potatoes',
      dinnerCal: '720 kcal'
    },
    keto: {
      goal: 'Targeted ketogenic shred roadmap',
      calories: '1,950',
      protein: '160g',
      carbs: '35g',
      fats: '135g',
      breakfast: 'Avocado + Scrambled Eggs with Olive Oil',
      breakfastCal: '520 kcal',
      lunch: 'Herbed Chicken Thighs + Spinach Salad',
      lunchCal: '710 kcal',
      dinner: 'Paneer Butter Tikka + Zucchini Noodles',
      dinnerCal: '580 kcal'
    }
  };

  const handleSwitchDietGoal = (goal: 'fat_loss' | 'muscle_gain' | 'keto') => {
    setIsRegeneratingDiet(true);
    setActiveDietGoal(goal);
    setTimeout(() => {
      setIsRegeneratingDiet(false);
    }, 400);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      
      {/* ─────────────────────────────────────────────────────────────
          0. TOP PROMO & DIRECT CONTACT BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white text-[11px] sm:text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left font-semibold">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
              ⚡ DIRECT SUPPORT & SALES
            </span>
            <span className="text-slate-300 hidden md:inline">Ready to scale your gym with AI?</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <a 
              href="tel:+919849344919" 
              className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>+91 98493 44919</span>
            </a>
            <span className="text-slate-700">|</span>
            <a 
              href="mailto:roufbaig123@gmail.com" 
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span>roufbaig123@gmail.com</span>
            </a>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <a
              href="https://wa.me/919849344919?text=Hi%2C%20I%20am%20interested%20in%20FIT%20CLUB%20AI%20Gym%20Management%20Software"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Chat</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER / NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-md group-hover:scale-105 transition-transform border border-slate-200">
              <FitClubLogoIcon className="w-14 h-14" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-slate-950 flex items-center gap-1.5">
                <span>FIT CLUB</span>
                <span className="text-orange-500">AI</span>
              </div>
              <p className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase -mt-0.5">
                GYM BUSINESS. SUPERPOWERED
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-orange-500 font-extrabold transition-colors hover:text-orange-600"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-slate-950 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="hover:text-slate-950 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => setShowDemoModal(true)}
              className="hover:text-slate-950 transition-colors"
            >
              Demo
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="hover:text-slate-950 transition-colors"
            >
              Success Stories
            </button>
            <button
              onClick={() => scrollToSection('ai-showcase')}
              className="hover:text-slate-950 transition-colors"
            >
              Resources
            </button>
          </nav>

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50 transition-colors flex items-center gap-1"
                title="Change Language"
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold">{selectedLanguage}</span>
              </button>

              {showLanguageDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95">
                  {[
                    { code: 'EN', name: 'English' },
                    { code: 'HI', name: 'हिंदी' },
                    { code: 'TE', name: 'తెలుగు' },
                    { code: 'TA', name: 'தமிழ்' }
                  ].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setSelectedLanguage(lang.code as any);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200 shadow-xs"
            >
              👤 Login
            </button>

            {/* Get Started Button */}
            <button
              onClick={() => {
                setSelectedPlan('Pro');
                setShowSignupModal(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (Dark Aesthetic with Glowing Visuals)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-orange-600/20 via-purple-900/15 to-transparent blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-orange-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headlines, CTAs, Social Proof */}
            <div className="lg:col-span-6 space-y-7 text-left">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold shadow-inner">
                <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
                <span>#1 AI-Powered Gym Management Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-white">
                RUN YOUR GYM <br />
                <span className="text-white">SMARTER. </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500">
                  GROW FASTER.
                </span>
              </h1>

              {/* Sub-headline */}
              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-xl">
                All-in-one gym management software with AI — members, attendance, billing, workouts, nutrition, marketing and more.
              </p>

              {/* Value Bullet Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {[
                  'Easy to Use',
                  'AI-Powered',
                  'Affordable',
                  'Built for Gyms'
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs font-bold backdrop-blur-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-black shadow-xl shadow-orange-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                >
                  <span>View Pricing</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </button>

                <button
                  onClick={() => setShowDemoModal(true)}
                  className="px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-sm font-bold shadow-lg transition-all flex items-center gap-2.5 cursor-pointer backdrop-blur-md"
                >
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <Play className="w-3 h-3 fill-current ml-0.5 text-white" />
                  </div>
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            {/* Right Column: Hero Visuals & Floating Simulated Cards */}
            <div className="lg:col-span-6 relative flex justify-center">
              
              {/* Backdrop Glow & Stamp */}
              <div className="relative w-full max-w-[540px]">
                
                {/* 1. Athlete Image Card */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-900 group">
                  <img
                    src="/assets/landing/hero_athlete.jpg"
                    alt="FitClub AI Coach"
                    className="w-full h-[420px] sm:h-[480px] object-cover object-top filter brightness-95 contrast-105 group-hover:scale-102 transition-transform duration-700"
                    onError={(e) => {
                      // Fallback if local path not yet loaded
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                {/* 2. Floating Mobile App Mockup */}
                <div className="absolute -bottom-6 -left-6 sm:-left-8 w-[170px] sm:w-[200px] bg-slate-900 text-white rounded-3xl p-3.5 shadow-2xl border-2 border-slate-800 animate-in fade-in slide-in-from-left-5 duration-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-orange-400">FIT CLUB AI</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold">
                    <div className="p-2 rounded-xl bg-slate-800/80 text-center">
                      <Users className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
                      <span>Members</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/80 text-center">
                      <Fingerprint className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-0.5" />
                      <span>Attendance</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/80 text-center">
                      <Dumbbell className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                      <span>Workouts</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/80 text-center">
                      <Utensils className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                      <span>AI Diet</span>
                    </div>
                  </div>
                </div>

                {/* 4. Stamp Badge: "YOUR GYM YOUR RULES" */}
                <div className="absolute -bottom-4 right-4 sm:right-6 transform rotate-[-8deg] bg-slate-950/90 border border-orange-500/40 text-orange-400 font-black px-4 py-1.5 rounded-xl shadow-xl backdrop-blur-md text-xs tracking-wider uppercase">
                  ⚡ YOUR GYM • YOUR RULES
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. 6-PILLAR FEATURES STRIP (Clean White Grid)
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-14 sm:py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            
            {[
              {
                icon: Users,
                title: 'Member Management',
                desc: 'Keep all member data organized and accessible.',
                color: 'text-blue-600',
                bg: 'bg-blue-50'
              },
              {
                icon: Fingerprint,
                title: 'Smart Attendance',
                desc: 'Biometric & manual attendance with real-time sync.',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50'
              },
              {
                icon: CreditCard,
                title: 'Billing & Payments',
                desc: 'Membership plans, invoices and online payments.',
                color: 'text-purple-600',
                bg: 'bg-purple-50'
              },
              {
                icon: Dumbbell,
                title: 'Workout & Diet Plans',
                desc: 'Create customized plans with AI assistance.',
                color: 'text-orange-600',
                bg: 'bg-orange-50'
              },
              {
                icon: Megaphone,
                title: 'Marketing & Growth',
                desc: 'Posters, offers and campaigns with AI Creative Studio.',
                color: 'text-rose-600',
                bg: 'bg-rose-50'
              },
              {
                icon: BarChart3,
                title: 'Advanced Reports',
                desc: 'Get insights to grow your gym business.',
                color: 'text-teal-600',
                bg: 'bg-teal-50'
              }
            ].map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-3xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-orange-300 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl ${feat.bg} ${feat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 mb-1 leading-snug">
                    {feat.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. INTERACTIVE FEATURE SHOWCASE: AI-POWERED GYM MANAGEMENT
      ───────────────────────────────────────────────────────────── */}
      <section id="ai-showcase" className="py-16 sm:py-24 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: AI Feature Checklist */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>INTRODUCING</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight">
                AI-Powered Gym Management
              </h2>

              <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                Save time, reduce effort and grow your gym with the power of Artificial Intelligence.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  'AI Workout & Nutrition Plans',
                  'AI Food Scanner & Calorie Tracker',
                  'AI Poster & Social Media Creator',
                  'AI Insights for Better Decisions'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-slate-900">{item}</span>
                  </div>
                ))}
              </div>

              {/* Goal Switcher Buttons */}
              <div className="pt-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Try Interactive AI Diet Plans:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'fat_loss', label: 'Fat Loss 4-Week' },
                    { id: 'muscle_gain', label: 'Lean Bulking 2.8k' },
                    { id: 'keto', label: 'Keto Shred' }
                  ].map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleSwitchDietGoal(g.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        activeDietGoal === g.id
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: 3D Robot Mascot + Interactive Nutrition Card */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-6 relative">
              
              {/* 3D Robot Mascot */}
              <div className="relative w-44 sm:w-56 shrink-0 flex flex-col items-center">
                <img
                  src="/assets/landing/ai_robot_mascot.jpg"
                  alt="FitClub AI Robot Assistant"
                  className="w-full object-contain filter drop-shadow-2xl rounded-3xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                
                {/* Speech Bubble Hook */}
                <div className="mt-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-md text-xs font-bold text-slate-800 text-center animate-bounce duration-1000">
                  💬 "{dietPlans[activeDietGoal].goal}"
                </div>
              </div>

              {/* Live Interactive AI Nutrition Card */}
              <div className="w-full max-w-[380px] bg-slate-950 text-white rounded-3xl p-5 shadow-2xl border border-slate-800 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                      <Flame className="w-4 h-4 fill-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">AI Nutrition Plan</h4>
                      <p className="text-[10px] text-slate-400">Personalized Macro Target</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchDietGoal(activeDietGoal === 'fat_loss' ? 'muscle_gain' : 'fat_loss')}
                    className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                    title="Regenerate with AI"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingDiet ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Macro Target Header */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-orange-400">{dietPlans[activeDietGoal].calories}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">Calories / Day</span>
                  </div>
                  <div className="flex items-center gap-3 text-center text-[10px] font-bold">
                    <div>
                      <span className="text-white block font-black text-xs">{dietPlans[activeDietGoal].protein}</span>
                      <span className="text-slate-400">Protein</span>
                    </div>
                    <div>
                      <span className="text-white block font-black text-xs">{dietPlans[activeDietGoal].carbs}</span>
                      <span className="text-slate-400">Carbs</span>
                    </div>
                    <div>
                      <span className="text-white block font-black text-xs">{dietPlans[activeDietGoal].fats}</span>
                      <span className="text-slate-400">Fats</span>
                    </div>
                  </div>
                </div>

                {/* 3 Meals List with Photos */}
                <div className="space-y-2.5">
                  {[
                    { meal: 'Breakfast', title: dietPlans[activeDietGoal].breakfast, cal: dietPlans[activeDietGoal].breakfastCal, img: '/assets/landing/meal_breakfast.jpg' },
                    { meal: 'Lunch', title: dietPlans[activeDietGoal].lunch, cal: dietPlans[activeDietGoal].lunchCal, img: '/assets/landing/meal_lunch.jpg' },
                    { meal: 'Dinner', title: dietPlans[activeDietGoal].dinner, cal: dietPlans[activeDietGoal].dinnerCal, img: '/assets/landing/meal_dinner.jpg' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-3 hover:border-slate-700 transition-colors"
                    >
                      <img
                        src={item.img}
                        alt={item.meal}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-extrabold text-orange-400 uppercase tracking-wider">{item.meal}</span>
                        <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">{item.cal}</span>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. PRICING SECTION (Simple & Transparent / Choose Your Plan)
      ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              SIMPLE & TRANSPARENT
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Choose Your Plan
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Flexible plans built for gyms of all sizes. No hidden charges.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="pt-3 flex items-center justify-center gap-3">
              <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>
                Monthly Billing
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="w-12 h-6 rounded-full bg-slate-900 p-1 relative transition-colors cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-orange-500 transform transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900' : 'text-slate-400'}`}>
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">Save 20%</span>
              </span>
            </div>
          </div>

          {/* 3 Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            
            {/* 1. Starter Plan */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-left relative">
              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-900">Starter</h3>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-950">
                      {billingCycle === 'annual' ? '₹2,399' : '₹2,999'}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">/month</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Up to 100 members</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Member Management</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Attendance (Manual & QR)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Billing & Payments</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Basic Reports</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => {
                    setSelectedPlan('Starter');
                    setShowSignupModal(true);
                  }}
                  className="w-full py-3.5 rounded-2xl border-2 border-orange-500/30 text-orange-600 hover:bg-orange-50 font-black text-sm transition-colors cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* 2. Pro Plan (Most Popular Highlighted) */}
            <div className="bg-white rounded-3xl p-7 border-2 border-orange-500 shadow-2xl shadow-orange-500/10 transition-all duration-300 flex flex-col justify-between text-left relative transform md:-translate-y-2">
              <div className="absolute -top-3.5 right-8 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-900">Pro</h3>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-950">
                      {billingCycle === 'annual' ? '₹4,799' : '₹5,999'}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">/month</span>
                  </div>
                  <p className="text-xs text-orange-600 font-bold mt-1">Up to 1,000 members</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-orange-500 shrink-0 stroke-[3]" />
                    <span className="font-bold text-slate-900">Everything in Starter</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI Workouts & Nutrition</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Creative Studio (Posters & Ads)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Advanced Reports</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Branch Support</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => {
                    setSelectedPlan('Pro');
                    setShowSignupModal(true);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* 3. Enterprise Plan */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-left relative">
              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-900">Enterprise</h3>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-950">Custom Pricing</span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">For large gym chains</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Unlimited Members</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-Branch Management</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Advanced AI Features</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated Support</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom Integrations</span>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-3.5 rounded-2xl border-2 border-slate-300 hover:bg-slate-50 text-slate-800 font-black text-sm transition-colors cursor-pointer"
                >
                  Contact Sales
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. LIVE STATS / METRICS STRIP
      ───────────────────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-950 text-white border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            
            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-orange-400 mb-1">
                <Users className="w-5 h-5" />
                <span className="text-xl sm:text-2xl font-black text-white">1,000+</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Happy Gym Owners</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xl sm:text-2xl font-black text-white">5,00,000+</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Members Managed</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-cyan-400 mb-1">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xl sm:text-2xl font-black text-white">99.9%</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Uptime Guarantee</p>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <Star className="w-5 h-5 fill-amber-400" />
                <span className="text-xl sm:text-2xl font-black text-white">4.9/5</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Customer Rating</p>
            </div>

            <div className="p-3 col-span-2 md:col-span-1">
              <div className="flex items-center justify-center gap-2 text-rose-400 mb-1">
                <Phone className="w-5 h-5" />
                <span className="text-xl sm:text-2xl font-black text-white">24/7</span>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Dedicated Support</p>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. SUCCESS STORIES / TESTIMONIALS
      ───────────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              SUCCESS STORIES
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
              Loved by Gym Owners Across India
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              See how gyms are growing with FIT CLUB AI.
            </p>
          </div>

          {/* 3 Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {[
              {
                name: 'Rahul Verma',
                gym: 'PowerZone Fitness, Delhi',
                img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
                quote: 'FIT CLUB AI has completely transformed how we manage our gym. Attendance, billing and member engagement are now so easy!'
              },
              {
                name: 'Priya Sharma',
                gym: 'FitLife Gym, Bangalore',
                img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces',
                quote: "The AI workout and diet plans are amazing. Our members love the personalized experience and we've improved retention by 40%."
              },
              {
                name: 'Amit Khan',
                gym: 'Muscle Hub, Mumbai',
                img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
                quote: 'The Creative Studio saves us hours. We create professional posters and offers in minutes. Highly recommended!'
              }
            ].map((t, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-7 rounded-3xl bg-slate-50/80 border border-slate-200/80 hover:border-orange-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                {/* Profile Header */}
                <div className="flex items-center gap-3">
                  <img
                    src={t.img}
                    alt={t.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow-sm"
                  />
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{t.name}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">{t.gym}</p>
                    <div className="flex items-center gap-0.5 text-amber-400 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quote Body */}
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. ULTRA-PREMIUM FUTURISTIC FOOTER (MATCHING DESIGN REFERENCE)
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white pt-16 pb-8 border-t border-slate-900 relative overflow-hidden">
        {/* Ambient neon backdrop glows */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-gradient-to-t from-orange-600/10 via-cyan-500/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-600/10 blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-900/80 items-start">
            
            {/* Column 1: Brand & Badges & Neon Graffiti */}
            <div className="lg:col-span-4 space-y-5">
              <div className="flex items-center gap-4">
                <FitClubLogoIcon className="w-20 h-20 shrink-0" isDarkBg={true} />
                <div>
                  <div className="text-2xl font-black tracking-tight flex items-center gap-1.5 leading-none">
                    <span className="text-white">FIT CLUB</span>
                    <span className="text-orange-500">AI</span>
                  </div>
                  <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest mt-1">
                    GYM BUSINESS. SUPERPOWERED
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-medium max-w-sm">
                Next-generation gym management operating system powered by intelligent biometric sync, AI nutrition workflows, automated billing & customer 360 CRM.
              </p>

              {/* 3 Feature Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <span className="text-orange-400">✳️</span> AI Powered
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Built for Gyms
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <span className="text-purple-400">🟣</span> Trusted by 1000+ Owners
                </span>
              </div>

              {/* Stronger Gyms Happier People Neon Graffiti Element */}
              <div className="pt-2">
                <div className="text-2xl font-black italic tracking-tighter leading-none bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 bg-clip-text text-transparent transform -rotate-1 select-none">
                  Stronger<br/>Gyms<br/>Happier<br/>People
                </div>
                <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mt-2" />
              </div>
            </div>

            {/* Column 2: Quick Links (Interactive Glass Action Buttons) */}
            <div className="lg:col-span-3 space-y-3">
              <div className="space-y-1 mb-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Quick Links</h4>
                <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">Gym Owner Portal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/download')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">Desktop App (.dmg / .exe)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/privacy')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">Privacy & Compliance</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => setShowDemoModal(true)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white">Product Walkthrough</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Column 3: Glowing Neon Glassmorphic Direct Contact Container */}
            <div className="lg:col-span-5 rounded-3xl p-6 sm:p-7 bg-slate-900/90 border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative backdrop-blur-xl space-y-5">
              
              {/* Floating "Your Gym Your Rules" Badge */}
              <div className="absolute -top-3.5 right-6 bg-slate-950 px-3.5 py-1 rounded-full border border-orange-500/40 shadow-lg text-center transform -rotate-3">
                <span className="text-[11px] font-black italic text-slate-200">
                  Your Gym <span className="text-orange-400">Your Rules</span>
                </span>
              </div>

              {/* Title and Subtitle */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Direct Contact & <span className="text-orange-400">24/7 Helpline</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    We're here to help you grow your gym business with FIT CLUB AI.
                  </p>
                </div>
              </div>

              {/* 2x2 Interactive Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Call Support */}
                <a
                  href="tel:+919849344919"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-orange-500/50 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Call Support</p>
                      <p className="text-xs font-black text-white truncate">+91 98493 44919</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-700/80 text-slate-400 group-hover:text-white group-hover:bg-slate-600 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </a>

                {/* 2. Email Inquiries */}
                <a
                  href="mailto:roufbaig123@gmail.com"
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/50 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Inquiries</p>
                      <p className="text-xs font-black text-white truncate">roufbaig123@gmail.com</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-700/80 text-slate-400 group-hover:text-white group-hover:bg-slate-600 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </a>

                {/* 3. Chat on WhatsApp */}
                <a
                  href="https://wa.me/919849344919?text=Hi%2C%20I%20am%20interested%20in%20FIT%20CLUB%20AI%20Gym%20Management%20Platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                    <span className="text-xs font-black">Chat on WhatsApp</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </a>

                {/* 4. Request Callback */}
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-blue-500/30 hover:border-blue-500/60 text-white font-bold transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black">Request Callback</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 group-hover:text-white flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

            </div>

          </div>

          {/* Bottom Copyright & Social Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
            <p>© 2026 <strong className="text-white font-bold">FIT CLUB AI</strong>. All rights reserved.</p>

            <div className="flex items-center gap-5 text-slate-400">
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition">Privacy & Compliance</button>
              <span>|</span>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition">Terms of Service</button>
              <span>|</span>
              <button onClick={() => setShowDemoModal(true)} className="hover:text-white transition">Product Walkthrough</button>
            </div>

            <div className="flex items-center gap-4">
              {/* Social Icons */}
              <div className="flex items-center gap-2">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:scale-110 transition shadow-sm"
                  title="YouTube"
                >
                  <Youtube className="w-3.5 h-3.5 fill-current" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white flex items-center justify-center hover:scale-110 transition shadow-sm"
                  title="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition shadow-sm"
                  title="LinkedIn"
                >
                  <Linkedin className="w-3.5 h-3.5 fill-current" />
                </a>
              </div>

              {/* 24/7 Support Status Badge */}
              <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>24/7 Support</span>
              </div>
            </div>

          </div>

        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          9. INTERACTIVE MODAL: WATCH DEMO / PLATFORM TOUR
      ───────────────────────────────────────────────────────────── */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">FIT CLUB AI Interactive Demo</h3>
                  <p className="text-xs text-slate-400">Explore live modules: POS Billing, AI Diet Generator & Biometrics</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div 
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/login');
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer transition text-center space-y-2"
                >
                  <Users className="w-6 h-6 text-blue-400 mx-auto" />
                  <p className="font-bold text-white">Owner Central Command</p>
                  <p className="text-[11px] text-slate-400">Members, biometric check-ins & real-time revenue</p>
                </div>

                <div 
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/login');
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer transition text-center space-y-2"
                >
                  <Utensils className="w-6 h-6 text-orange-400 mx-auto" />
                  <p className="font-bold text-white">AI Diet & Workout Engine</p>
                  <p className="text-[11px] text-slate-400">Automated 1-click personalized nutrition plans</p>
                </div>

                <div 
                  onClick={() => {
                    setShowDemoModal(false);
                    navigate('/login');
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer transition text-center space-y-2"
                >
                  <Megaphone className="w-6 h-6 text-rose-400 mx-auto" />
                  <p className="font-bold text-white">AI Creative Studio</p>
                  <p className="text-[11px] text-slate-400">Commercial ad posters & Meta publishing</p>
                </div>
              </div>

              {/* Direct Help inside Demo Modal */}
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Need an instant live walkthrough? Call <strong>+91 98493 44919</strong></span>
                </div>
                <a
                  href="https://wa.me/919849344919?text=Hi%2C%20I%20want%20a%20guided%20demo%20of%20FIT%20CLUB%20AI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  WhatsApp Us
                </a>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDemoModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white font-bold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDemoModal(false);
                  navigate('/login');
                }}
                className="px-6 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-600/25 transition cursor-pointer"
              >
                Launch Live App Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          10. INTERACTIVE MODAL: GET STARTED / TRIAL SIGNUP (WITH SUPER ADMIN ALERT)
      ───────────────────────────────────────────────────────────── */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Start 14-Day Free Trial</span>
                <h3 className="text-xl font-black text-slate-950">Register Your Gym</h3>
              </div>
              <button
                onClick={() => {
                  setShowSignupModal(false);
                  setTrialSuccess(false);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trialSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Registration Received!</h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                  Super Admin team has been notified with sound alert. Redirecting you to login portal...
                </p>
                <div className="p-3 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600">
                  Instant Support Helpline: <span className="text-orange-600 font-black">+91 98493 44919</span>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-950 font-bold flex items-center justify-between">
                  <span>Selected Tier: <strong>{selectedPlan} Plan</strong></span>
                  <span className="text-orange-700 font-extrabold">{selectedPlan === 'Starter' ? '₹2,999/mo' : '₹5,999/mo'}</span>
                </div>

                <form onSubmit={handleTrialSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
                  <div>
                    <label className="block mb-1 font-bold">Gym Name</label>
                    <input
                      type="text"
                      required
                      value={trialForm.gymName}
                      onChange={(e) => setTrialForm({ ...trialForm, gymName: e.target.value })}
                      placeholder="e.g. PowerZone Fitness Club"
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-bold">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={trialForm.name}
                      onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                      placeholder="e.g. Rahul Verma"
                      className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-bold">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={trialForm.phone}
                        onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold">City / Location</label>
                      <input
                        type="text"
                        required
                        value={trialForm.city}
                        onChange={(e) => setTrialForm({ ...trialForm, city: e.target.value })}
                        placeholder="e.g. Bangalore"
                        className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingTrial}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-500/25 transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingTrial ? 'Notifying Super Admin...' : 'Create Gym Account & Start Trial →'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          11. INTERACTIVE MODAL: CONTACT SALES (WITH DIRECT DETAILS & SUPER ADMIN ALERT)
      ───────────────────────────────────────────────────────────── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Enterprise Inquiries</span>
                <h3 className="text-xl font-black text-slate-950">Contact Enterprise Sales</h3>
              </div>
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setContactSuccess(false);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Contact Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-orange-400">Direct Enterprise Lead Contact:</span>
                <span className="text-slate-300">+91 98493 44919</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Email: <strong>roufbaig123@gmail.com</strong></span>
                <a
                  href="https://wa.me/919849344919?text=Hi%2C%20I%20am%20interested%20in%20Enterprise%20Plan%20pricing%20and%20integration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Chat WhatsApp →
                </a>
              </div>
            </div>

            {contactSuccess ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Inquiry Submitted!</h4>
                <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                  Super Admin team has received your priority request. We will reach out to you within 2 hours.
                </p>
                <div className="p-3 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600">
                  Call Support directly: <a href="tel:+919849344919" className="text-orange-600 font-black underline">+91 98493 44919</a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block mb-1 font-bold">Franchise / Chain Name</label>
                  <input
                    type="text"
                    required
                    value={contactForm.franchiseName}
                    onChange={(e) => setContactForm({ ...contactForm, franchiseName: e.target.value })}
                    placeholder="e.g. Gold's Gym Chain India"
                    className="w-full p-3 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold">Total Branches</label>
                    <input
                      type="number"
                      value={contactForm.branches}
                      onChange={(e) => setContactForm({ ...contactForm, branches: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold">Total Active Members</label>
                    <input
                      type="number"
                      value={contactForm.members}
                      onChange={(e) => setContactForm({ ...contactForm, members: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold">Contact Person</label>
                    <input
                      type="text"
                      required
                      value={contactForm.contactPerson}
                      onChange={(e) => setContactForm({ ...contactForm, contactPerson: e.target.value })}
                      placeholder="Your Name"
                      className="w-full p-3 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="+91 98493 44919"
                      className="w-full p-3 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingContact ? 'Notifying Super Admin...' : 'Submit Enterprise Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

