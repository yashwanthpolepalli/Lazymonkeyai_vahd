import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/services/apiClient';

interface NutritionOverviewData {
  user_name: string;
  date_str: string;
  customer_parameters: {
    height_cm: number;
    weight_kg: number;
    target_weight_kg: number;
    body_condition: string;
    meals_per_day: number;
    dietary_preference: string;
  };
  header_stats: {
    calories: { consumed: number; target: number; left: number; pct: number };
    protein: { consumed: number; target: number; left: number; pct: number };
    carbs: { consumed: number; target: number; left: number; pct: number };
    fats: { consumed: number; target: number; left: number; pct: number };
    water: { consumed: number; target: number; left: number; pct: number };
    fiber: { consumed: number; target: number; left: number };
    sugars: { consumed: number; target: number; left: number };
  };
  macros_breakdown: {
    consumed_calories: number;
    recommended_calories: number;
    protein: { grams: number; pct: number; kcal: number };
    carbs: { grams: number; pct: number; kcal: number };
    fats: { grams: number; pct: number; kcal: number };
  };
  meal_summary: Array<{
    name: string;
    time: string;
    items_desc: string;
    calories: number;
    target_calories: number;
    pct: number;
    icon: string;
  }>;
  ai_recommended_meals: Array<{
    meal_type: string;
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    dietary_tag: string;
  }>;
  recommended_vitamins: Array<{
    name: string;
    dosage: string;
    purpose: string;
  }>;
  today_food_log: Array<{
    id: string;
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal_type: string;
    time: string;
  }>;
  nutrition_insights: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    button_text: string | null;
    action?: string;
    icon: string;
  }>;
  weekly_trend: Array<{
    day: string;
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>;
  daily_goals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugars: number;
    water: number;
  };
}

export function CustomerNutritionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NutritionOverviewData | null>(null);

  // Modals
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditGoalsModal, setShowEditGoalsModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showUploadBmiModal, setShowUploadBmiModal] = useState(false);
  const [selectedBmiFile, setSelectedBmiFile] = useState<File | null>(null);
  const [uploadingBmi, setUploadingBmi] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Parameter Form
  const [profileForm, setProfileForm] = useState({
    height_cm: '',
    weight_kg: '',
    target_weight_kg: '',
    body_condition: '',
    meals_per_day: '',
    dietary_preference: '',
  });

  // Food Form
  const [foodForm, setFoodForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    meal_type: '',
  });

  // Goals Form
  const [goalsForm, setGoalsForm] = useState({
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    water: '',
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<NutritionOverviewData>('/customer/nutrition/overview');
      setData(res);
      if (res?.customer_parameters) {
        setProfileForm({
          height_cm: String(res.customer_parameters.height_cm || ''),
          weight_kg: String(res.customer_parameters.weight_kg || ''),
          target_weight_kg: String(res.customer_parameters.target_weight_kg || ''),
          body_condition: res.customer_parameters.body_condition || '',
          meals_per_day: res.customer_parameters.meals_per_day ? String(res.customer_parameters.meals_per_day) : '',
          dietary_preference: res.customer_parameters.dietary_preference || '',
        });
      }
      if (res?.daily_goals) {
        setGoalsForm({
          calories: String(res.daily_goals.calories || ''),
          protein: String(res.daily_goals.protein || ''),
          carbs: String(res.daily_goals.carbs || ''),
          fats: String(res.daily_goals.fats || ''),
          water: String(res.daily_goals.water || ''),
        });
      }
    } catch (_err) {
      /* handle error */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleLogWater = async () => {
    try {
      await apiClient.post('/customer/nutrition/log-water', { amount_l: 0.25 });
      fetchOverview();
    } catch (_err) {
      /* handle error */
    }
  };

  const handleLogAIMeal = async (meal: { food_name: string; calories: number; protein_g: number; carbs_g: number; fats_g: number; meal_type: string }) => {
    try {
      await apiClient.post('/customer/nutrition/log-food', {
        name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein_g,
        carbs: meal.carbs_g,
        fat: meal.fats_g,
        meal_type: meal.meal_type,
      });
      fetchOverview();
    } catch (_err) {
      /* handle error */
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/customer/nutrition/update-profile-parameters', {
        height_cm: Number(profileForm.height_cm) || undefined,
        weight_kg: Number(profileForm.weight_kg) || undefined,
        target_weight_kg: Number(profileForm.target_weight_kg) || undefined,
        body_condition: profileForm.body_condition,
        meals_per_day: Number(profileForm.meals_per_day) || 4,
        dietary_preference: profileForm.dietary_preference,
      });
      setShowProfileModal(false);
      fetchOverview();
    } catch (_err) {
      /* handle error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodForm.name) return;
    try {
      setSubmitting(true);
      await apiClient.post('/customer/nutrition/log-food', {
        name: foodForm.name,
        calories: Number(foodForm.calories) || 0,
        protein: Number(foodForm.protein) || 0,
        carbs: Number(foodForm.carbs) || 0,
        fat: Number(foodForm.fat) || 0,
        meal_type: foodForm.meal_type,
      });
      setShowAddFoodModal(false);
      setFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '', meal_type: 'Breakfast' });
      fetchOverview();
    } catch (_err) {
      /* handle error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/customer/nutrition/update-goals', {
        calories: Number(goalsForm.calories) || undefined,
        protein: Number(goalsForm.protein) || undefined,
        carbs: Number(goalsForm.carbs) || undefined,
        fats: Number(goalsForm.fats) || undefined,
        water: Number(goalsForm.water) || undefined,
      });
      setShowEditGoalsModal(false);
      fetchOverview();
    } catch (_err) {
      /* handle error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleBmiFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBmiFile) return;
    setUploadingBmi(true);
    setUploadError(null);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedBmiFile);
      const res = await apiClient.post<any>('/customer/body-composition/upload', formData);
      setOcrResult(res);
      fetchOverview();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to extract biometrics from scan report.');
    } finally {
      setUploadingBmi(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  const { user_name, date_str, customer_parameters, header_stats, macros_breakdown, meal_summary, ai_recommended_meals, recommended_vitamins, today_food_log, nutrition_insights, weekly_trend, daily_goals } = data;

  return (
    <div className="space-y-6 pb-16 animate-fade-in text-slate-800">
      {/* 1. Header Greeting & Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-indigo-300">
            <Icon name="sparkles" size={14} className="text-amber-400" />
            <span>AI Personal Nutrition Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            Good Morning, {user_name}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl">
            Stay consistent with your nutrition. Real-time AI macro optimization tailored strictly to your profile.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200">
            <Icon name="calendar" size={15} className="text-indigo-400" />
            <span>Today, {date_str}</span>
          </div>

          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Icon name="sliders" size={15} className="text-amber-400" />
            <span>AI Bio Parameters</span>
          </button>

          <button
            onClick={() => { setShowUploadBmiModal(true); setOcrResult(null); setUploadError(null); setSelectedBmiFile(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.03] cursor-pointer"
          >
            <Icon name="upload" size={15} />
            <span>Upload BMI Report</span>
          </button>

          <button
            onClick={() => setShowAddFoodModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.03] cursor-pointer"
          >
            <Icon name="plus" size={16} />
            <span>+ Add Food / Meal</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive AI Biometrics & Parameters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <Icon name="ruler" size={15} className="text-indigo-500" />
            <span className="text-slate-400">Height:</span>
            <span className="font-extrabold text-slate-900">{customer_parameters.height_cm || '—'} cm</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <Icon name="weight" size={15} className="text-emerald-500" />
            <span className="text-slate-400">Current:</span>
            <span className="font-extrabold text-slate-900">{customer_parameters.weight_kg || '—'} kg</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <Icon name="target" size={15} className="text-purple-500" />
            <span className="text-slate-400">Target:</span>
            <span className="font-extrabold text-slate-900">{customer_parameters.target_weight_kg || '—'} kg</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
            <Icon name="zap" size={15} className="text-purple-600" />
            <span className="opacity-80">Condition:</span>
            <span className="font-extrabold capitalize">{customer_parameters.body_condition}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
            <Icon name="utensils" size={15} className="text-amber-600" />
            <span className="opacity-80">Meals/Day:</span>
            <span className="font-extrabold">{customer_parameters.meals_per_day} Meals</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Icon name="apple" size={15} className="text-emerald-600" />
            <span className="opacity-80">Diet:</span>
            <span className="font-extrabold">{customer_parameters.dietary_preference}</span>
          </div>
        </div>

        <button
          onClick={() => setShowProfileModal(true)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer"
        >
          <Icon name="refresh-cw" size={14} /> Recalculate AI Target Macros
        </button>
      </div>

      {/* 3. Multi-Color Premium Metric Cards (7 Stat Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Calories Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="zap" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-emerald-100">Calories</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.calories.consumed.toLocaleString()}</span>
              <span className="text-[11px] text-emerald-100 font-semibold">/ {header_stats.calories.target.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-emerald-100 font-medium">{header_stats.calories.left} kcal left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${header_stats.calories.pct}%` }} />
          </div>
        </div>

        {/* Protein Card */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-purple-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="sparkles" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-purple-100">Protein</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.protein.consumed}</span>
              <span className="text-[11px] text-purple-100 font-semibold">/ {header_stats.protein.target} g</span>
            </div>
            <div className="text-[10px] text-purple-100 font-medium">{header_stats.protein.left} g left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${header_stats.protein.pct}%` }} />
          </div>
        </div>

        {/* Carbs Card */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-sky-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="wheat" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-sky-100">Carbs</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.carbs.consumed}</span>
              <span className="text-[11px] text-sky-100 font-semibold">/ {header_stats.carbs.target} g</span>
            </div>
            <div className="text-[10px] text-sky-100 font-medium">{header_stats.carbs.left} g left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${header_stats.carbs.pct}%` }} />
          </div>
        </div>

        {/* Fats Card */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl text-white shadow-lg shadow-amber-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="droplet" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-amber-100">Fats</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.fats.consumed}</span>
              <span className="text-[11px] text-amber-100 font-semibold">/ {header_stats.fats.target} g</span>
            </div>
            <div className="text-[10px] text-amber-100 font-medium">{header_stats.fats.left} g left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${header_stats.fats.pct}%` }} />
          </div>
        </div>

        {/* Fiber Card */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-4 rounded-2xl text-white shadow-lg shadow-rose-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="sprout" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-rose-100">Fiber</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.fiber.consumed}</span>
              <span className="text-[11px] text-rose-100 font-semibold">/ {header_stats.fiber.target} g</span>
            </div>
            <div className="text-[10px] text-rose-100 font-medium">{header_stats.fiber.left} g left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (header_stats.fiber.consumed / Math.max(1, header_stats.fiber.target)) * 100)}%` }} />
          </div>
        </div>

        {/* Sugars Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="heart" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-indigo-100">Sugars</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.sugars.consumed}</span>
              <span className="text-[11px] text-indigo-100 font-semibold">/ &lt; {header_stats.sugars.target} g</span>
            </div>
            <div className="text-[10px] text-indigo-100 font-medium">Limit Goal</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: '40%' }} />
          </div>
        </div>

        {/* Water Card */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-cyan-500/20 flex flex-col justify-between space-y-3 transform transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Icon name="glass-water" size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-cyan-100">Water</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{header_stats.water.consumed}</span>
              <span className="text-[11px] text-cyan-100 font-semibold">/ {header_stats.water.target} L</span>
            </div>
            <div className="text-[10px] text-cyan-100 font-medium">{header_stats.water.left} L left</div>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${header_stats.water.pct}%` }} />
          </div>
        </div>
      </div>

      {/* 4. AI Daily Recommended Meals (Filtered by Diet Preference & Meals/Day) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Icon name="sparkles" size={18} className="text-indigo-600" />
              AI Daily Recommended Meals ({customer_parameters.dietary_preference || 'Dynamic'} Filter)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalized {customer_parameters.meals_per_day || ai_recommended_meals.length || 4}-meal split generated by AI matching your target macros.
            </p>
          </div>

          {/* Quick Dietary Preference Pill Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {['Veg', 'Non-Veg', 'Vegan', 'Keto'].map((diet) => (
              <button
                key={diet}
                onClick={async () => {
                  setProfileForm({ ...profileForm, dietary_preference: diet });
                  try {
                    setLoading(true);
                    await apiClient.post('/customer/nutrition/update-profile-parameters', {
                      dietary_preference: diet,
                    });
                    fetchOverview();
                  } catch (_err) {
                    setLoading(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${(customer_parameters.dietary_preference || '').toLowerCase() === diet.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow-sm scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {diet}
              </button>
            ))}
          </div>
        </div>

        {ai_recommended_meals.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl space-y-3">
            <Icon name="sparkles" size={28} className="text-indigo-500 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No AI Meal Suggestions Generated Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Set your target body condition, height, weight, and dietary preference to let AI calculate your meal plan.
            </p>
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              ⚡ Setup AI Parameters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ai_recommended_meals.map((meal, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">{meal.meal_type}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-slate-600 border border-slate-200">
                      {meal.dietary_tag || customer_parameters.dietary_preference || 'AI Meal'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white text-[11px] border border-slate-100 text-center">
                  <div>
                    <div className="text-slate-400 font-medium">Protein</div>
                    <div className="font-extrabold text-purple-600">{meal.protein_g}g</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Carbs</div>
                    <div className="font-extrabold text-sky-600">{meal.carbs_g}g</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-medium">Fats</div>
                    <div className="font-extrabold text-amber-600">{meal.fats_g}g</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-black text-slate-900">{meal.calories} kcal</span>
                  <button
                    onClick={() => handleLogAIMeal(meal)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="plus" size={13} /> Log Meal
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Recommended Micronutrients & Vitamins */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Icon name="shield-check" size={18} className="text-emerald-600" />
            AI Recommended Micronutrients & Vitamins
          </h2>
          <span className="text-xs font-semibold text-slate-400">Tailored to your biometrics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recommended_vitamins.map((vit, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                <Icon name="pill" size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{vit.name}</div>
                <div className="text-[11px] font-semibold text-emerald-700">{vit.dosage}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{vit.purpose}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Macros Breakdown & Meal Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Macros Breakdown Donut Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Macros Breakdown</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-500"
                  strokeDasharray={`${macros_breakdown.protein.pct}, 100`}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${macros_breakdown.carbs.pct}, 100`}
                  strokeDashoffset={`-${macros_breakdown.protein.pct}`}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeDasharray={`${macros_breakdown.fats.pct}, 100`}
                  strokeDashoffset={`-${macros_breakdown.protein.pct + macros_breakdown.carbs.pct}`}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-slate-900">{macros_breakdown.consumed_calories.toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-medium">kcal</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="font-semibold text-slate-700">Protein</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">{macros_breakdown.protein.grams}g ({macros_breakdown.protein.pct}%)</span>
                  <span className="font-bold text-slate-900 w-16 text-right">{macros_breakdown.protein.kcal} kcal</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-700">Carbohydrates</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">{macros_breakdown.carbs.grams}g ({macros_breakdown.carbs.pct}%)</span>
                  <span className="font-bold text-slate-900 w-16 text-right">{macros_breakdown.carbs.kcal} kcal</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-slate-700">Fats</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium">{macros_breakdown.fats.grams}g ({macros_breakdown.fats.pct}%)</span>
                  <span className="font-bold text-slate-900 w-16 text-right">{macros_breakdown.fats.kcal} kcal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Recommended: {macros_breakdown.recommended_calories.toLocaleString()} kcal/day</span>
            <Icon name="info" size={13} />
          </div>
        </div>

        {/* Right: Meal Summary */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Meal Summary</h2>
            <button onClick={() => setShowEditGoalsModal(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Edit Plan
            </button>
          </div>

          <div className="space-y-3.5">
            {meal_summary.map((meal) => (
              <div key={meal.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/60 text-amber-600 flex items-center justify-center shrink-0">
                    <Icon name={meal.icon === 'coffee' ? 'coffee' : meal.icon === 'moon' ? 'moon' : 'sun'} size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{meal.name}</div>
                    <div className="text-xs text-slate-400 font-medium">{meal.time} • {meal.items_desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 min-w-[180px] justify-between sm:justify-end">
                  <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">{meal.calories} kcal</span>
                  <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${meal.pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 w-8 text-right">{meal.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Today's Food Log + Nutrition Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Today's Food Log</h2>
            <button onClick={() => setShowAddFoodModal(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View Full Log
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold">
                  <th className="pb-3 font-semibold">Food / Meal</th>
                  <th className="pb-3 font-semibold">Quantity</th>
                  <th className="pb-3 text-right font-semibold">Calories</th>
                  <th className="pb-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {today_food_log.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No foods logged today. Click '+ Add More Food' below to log your meal!
                    </td>
                  </tr>
                ) : (
                  today_food_log.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                          <Icon name="utensils" size={14} />
                        </div>
                        <div>
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{item.meal_type} • {item.time}</div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-500">{item.quantity}</td>
                      <td className="py-3 text-right font-extrabold text-slate-900">{item.calories} kcal</td>
                      <td className="py-3 text-right text-slate-400 hover:text-slate-600 cursor-pointer">
                        <Icon name="more-vertical" size={15} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setShowAddFoodModal(true)}
            className="w-full py-2.5 text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/60 hover:bg-indigo-50 rounded-2xl border border-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Icon name="plus" size={14} /> Add More Food
          </button>
        </div>

        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Nutrition Insights</h2>
            <button onClick={() => setShowTipsModal(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View Details
            </button>
          </div>

          <div className="space-y-3.5">
            {nutrition_insights.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 border ${item.type === 'success' || item.type === 'warning'
                    ? 'bg-purple-50/60 border-purple-100 text-purple-900'
                    : item.type === 'info'
                      ? 'bg-sky-50/60 border-sky-100 text-sky-900'
                      : 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'success' || item.type === 'warning' ? 'bg-purple-100 text-purple-600'
                      : item.type === 'info' ? 'bg-sky-100 text-sky-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                    <Icon name={item.icon === 'droplet' ? 'droplet' : item.icon === 'sprout' ? 'sprout' : 'sparkles'} size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{item.title}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{item.message}</div>
                  </div>
                </div>

                {item.button_text && (
                  <button
                    onClick={item.action === 'log_water' ? handleLogWater : () => setShowTipsModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-white shadow-xs text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-all shrink-0 cursor-pointer"
                  >
                    {item.button_text}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8. Weekly Trend & Daily Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Weekly Nutrition Trend</h2>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>This Week</span>
              <Icon name="chevron-down" size={14} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span>Calories</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Protein (g)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Carbs (g)</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Fats (g)</span></div>
          </div>

          <div className="relative h-44 w-full pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 700 140" preserveAspectRatio="none">
              <line x1="0" y1="20" x2="700" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="700" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />

              <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={weekly_trend.map((d, i) => `${i * 115 + 20},${120 - Math.min(100, (d.calories / 2500) * 100)}`).join(' ')} />
              <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={weekly_trend.map((d, i) => `${i * 115 + 20},${120 - Math.min(100, (d.protein / 200) * 80)}`).join(' ')} />
              <polyline fill="none" stroke="#10b981" strokeWidth="2" points={weekly_trend.map((d, i) => `${i * 115 + 20},${120 - Math.min(100, (d.carbs / 300) * 80)}`).join(' ')} />
              <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={weekly_trend.map((d, i) => `${i * 115 + 20},${120 - Math.min(100, (d.fats / 100) * 80)}`).join(' ')} />

              {weekly_trend.map((d, i) => (
                <g key={i}>
                  <circle cx={i * 115 + 20} cy={120 - Math.min(100, (d.calories / 2500) * 100)} r="4" fill="#3b82f6" />
                  <circle cx={i * 115 + 20} cy={120 - Math.min(100, (d.protein / 200) * 80)} r="3.5" fill="#a855f7" />
                </g>
              ))}
            </svg>

            <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-1">
              {weekly_trend.map((d) => (
                <span key={d.day}>{d.day}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Daily Goals</h2>
            <button onClick={() => setShowEditGoalsModal(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Edit Goals
            </button>
          </div>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2"><Icon name="sun" size={15} className="text-emerald-500" /><span className="font-semibold text-slate-700">Calories</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.calories.toLocaleString()} kcal</span>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-2"><Icon name="sparkles" size={15} className="text-purple-500" /><span className="font-semibold text-slate-700">Protein</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.protein} g</span>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-2"><Icon name="wheat" size={15} className="text-sky-500" /><span className="font-semibold text-slate-700">Carbs</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.carbs} g</span>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-2"><Icon name="droplet" size={15} className="text-amber-500" /><span className="font-semibold text-slate-700">Fats</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.fats} g</span>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-2"><Icon name="sprout" size={15} className="text-rose-500" /><span className="font-semibold text-slate-700">Fiber</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.fiber} g</span>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-2"><Icon name="glass-water" size={15} className="text-blue-500" /><span className="font-semibold text-slate-700">Water</span></div>
              <span className="font-extrabold text-slate-900">{daily_goals.water} L</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Profile Parameters Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-slide-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="sparkles" size={18} className="text-indigo-600" /> Dynamic AI Nutrition & Macro Generator
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <Icon name="x" size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={profileForm.height_cm}
                    onChange={(e) => setProfileForm({ ...profileForm, height_cm: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Current Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 75"
                    value={profileForm.weight_kg}
                    onChange={(e) => setProfileForm({ ...profileForm, weight_kg: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Target Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 70"
                    value={profileForm.target_weight_kg}
                    onChange={(e) => setProfileForm({ ...profileForm, target_weight_kg: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Target Body Condition</label>
                  <select
                    value={profileForm.body_condition}
                    onChange={(e) => setProfileForm({ ...profileForm, body_condition: e.target.value })}
                    className="input-field py-2"
                  >
                    <option value="lean">Lean Fat Loss (Deficit)</option>
                    <option value="bulk">Hypertrophy Bulk (Surplus)</option>
                    <option value="recomp">Body Recomposition</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Meals Per Day</label>
                  <select
                    value={profileForm.meals_per_day}
                    onChange={(e) => setProfileForm({ ...profileForm, meals_per_day: e.target.value })}
                    className="input-field py-2"
                  >
                    <option value="3">3 Meals (Breakfast, Lunch, Dinner)</option>
                    <option value="4">4 Meals (Default Split)</option>
                    <option value="5">5 Meals (Incl. Pre/Post Workout)</option>
                    <option value="6">6 Meals (Athlete High Frequency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1">Dietary Preference Filter</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Veg', 'Non-Veg', 'Vegan', 'Keto'].map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, dietary_preference: diet })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${profileForm.dietary_preference === diet
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowProfileModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? 'Analyzing with AI...' : '⚡ Save & Analyze with AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Food Modal */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-slide-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="plus-circle" size={18} className="text-indigo-600" /> Add Food / Meal Item
              </h3>
              <button onClick={() => setShowAddFoodModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <Icon name="x" size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddFoodSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Meal Category</label>
                <select
                  value={foodForm.meal_type}
                  onChange={(e) => setFoodForm({ ...foodForm, meal_type: e.target.value })}
                  className="input-field py-2"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Evening Snack">Evening Snack</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Food Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grilled Chicken Salad, Oats, Egg White Omelette"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
                  required
                  className="input-field py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    placeholder="e.g. 350"
                    value={foodForm.calories}
                    onChange={(e) => setFoodForm({ ...foodForm, calories: e.target.value })}
                    required
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={foodForm.protein}
                    onChange={(e) => setFoodForm({ ...foodForm, protein: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 40"
                    value={foodForm.carbs}
                    onChange={(e) => setFoodForm({ ...foodForm, carbs: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Fats (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 10"
                    value={foodForm.fat}
                    onChange={(e) => setFoodForm({ ...foodForm, fat: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddFoodModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? 'Saving...' : 'Save Meal Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Daily Goals Modal */}
      {showEditGoalsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-slide-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="sliders" size={18} className="text-indigo-600" /> Edit Daily Nutrition Targets
              </h3>
              <button onClick={() => setShowEditGoalsModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <Icon name="x" size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateGoalsSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block mb-1">Daily Calorie Target (kcal)</label>
                <input
                  type="number"
                  value={goalsForm.calories}
                  onChange={(e) => setGoalsForm({ ...goalsForm, calories: e.target.value })}
                  className="input-field py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Protein Target (g)</label>
                  <input
                    type="number"
                    value={goalsForm.protein}
                    onChange={(e) => setGoalsForm({ ...goalsForm, protein: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Carbs Target (g)</label>
                  <input
                    type="number"
                    value={goalsForm.carbs}
                    onChange={(e) => setGoalsForm({ ...goalsForm, carbs: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Fats Target (g)</label>
                  <input
                    type="number"
                    value={goalsForm.fats}
                    onChange={(e) => setGoalsForm({ ...goalsForm, fats: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1">Water Target (Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goalsForm.water}
                    onChange={(e) => setGoalsForm({ ...goalsForm, water: e.target.value })}
                    className="input-field py-2"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditGoalsModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? 'Updating...' : 'Update Goals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-slide-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="sprout" size={18} className="text-emerald-600" /> Nutrition & Fiber Recommendations
              </h3>
              <button onClick={() => setShowTipsModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <Icon name="x" size={18} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-100">
                <div className="font-bold text-emerald-900 mb-1">1. High-Fiber Whole Foods</div>
                Include oats, quinoa, brown rice, broccoli, spinach, and chia seeds to improve digestion and maintain steady insulin response.
              </div>
              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100">
                <div className="font-bold text-purple-900 mb-1">2. Lean Protein Distribution</div>
                Distribute your protein intake evenly across Breakfast, Lunch, and Dinner (approx. 30g–40g per meal) for optimal muscle protein synthesis.
              </div>
              <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-100">
                <div className="font-bold text-sky-900 mb-1">3. Optimal Hydration</div>
                Drink 500ml of water right after waking up and 250ml every 2 hours during physical activity to maximize workout recovery.
              </div>
            </div>

            <button onClick={() => setShowTipsModal(false)} className="btn-primary w-full bg-slate-900 hover:bg-slate-800">
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Upload BMI / Body Scan Report Modal */}
      {showUploadBmiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="file-text" size={18} className="text-teal-600" />
                Upload InBody / BMI Report Scan
              </h3>
              <button onClick={() => setShowUploadBmiModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <Icon name="x" size={18} className="text-slate-400" />
              </button>
            </div>

            {!ocrResult ? (
              <form onSubmit={handleBmiFileUploadSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setSelectedBmiFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="bmi-report-file-input"
                  />
                  <label htmlFor="bmi-report-file-input" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                      <Icon name="upload-cloud" size={24} />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedBmiFile ? selectedBmiFile.name : 'Click to select InBody / TANITA / BMI report'}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports JPG, PNG, WEBP, or PDF scan reports. AI Vision will automatically extract weight, BMI, body fat %, and muscle mass.
                    </p>
                  </label>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-medium text-rose-700 flex items-center gap-2">
                    <Icon name="alert-circle" size={16} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowUploadBmiModal(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedBmiFile || uploadingBmi}
                    className="btn-primary flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploadingBmi ? (
                      <>
                        <Icon name="sparkles" size={16} className="animate-spin text-amber-300" />
                        <span>AI Vision Extracting...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="sparkles" size={16} />
                        <span>Extract & Update Biometrics</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Extraction Summary */
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <Icon name="check-circle" size={18} className="text-emerald-600" />
                    <span>Body Scan Biometrics Successfully Extracted & Saved to DB!</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="p-2 rounded-xl bg-white text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Weight</span>
                      <span className="text-sm font-black text-slate-900">{ocrResult.extracted_biometrics?.weight_kg || '—'} kg</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 block">BMI</span>
                      <span className="text-sm font-black text-teal-600">{ocrResult.extracted_biometrics?.bmi || '—'}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white text-center shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Body Fat %</span>
                      <span className="text-sm font-black text-indigo-600">{ocrResult.extracted_biometrics?.body_fat_percentage || '—'}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Icon name="sparkles" size={14} className="text-amber-500" /> Dynamic Recalculated Targets:
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-700">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400">Calories</div>
                      <div className="text-indigo-600">{ocrResult.recalculated_targets?.calories || '—'} kcal</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400">Protein</div>
                      <div className="text-indigo-600">{ocrResult.recalculated_targets?.protein || '—'}g</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400">Carbs</div>
                      <div className="text-indigo-600">{ocrResult.recalculated_targets?.carbs || '—'}g</div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-400">Fat</div>
                      <div className="text-indigo-600">{ocrResult.recalculated_targets?.fat || '—'}g</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowUploadBmiModal(false)}
                  className="btn-primary w-full bg-slate-900 hover:bg-slate-800 cursor-pointer"
                >
                  Done & Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
