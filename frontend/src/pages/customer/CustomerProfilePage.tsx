import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { customerApi } from '@/services/customerApi';
import type { AnalyzeTargetsPayload } from '@/services/customerApi';
import { MemberCard } from '@/components/customer/MemberCard';
import { MembershipCard } from '@/components/customer/MembershipCard';
import { AttendanceSummary } from '@/components/customer/AttendanceSummary';
import { BiometricStatus } from '@/components/customer/BiometricStatus';
import { BodyCompositionSummary } from '@/components/customer/BodyCompositionSummary';
import type {
  CustomerProfile,
  CustomerAttendanceData,
  CustomerBiometricStatus as BioStatusType,
  CustomerBodyScanMetrics,
  AITargetRecommendation,
} from '@/types/customer';

const WORKOUT_TYPES = [
  { value: '', label: 'Select Workout Type' },
  { value: 'muscle training', label: '💪 Muscle Training (Hypertrophy / Drop Set)' },
  { value: 'weight loss', label: '🔥 Weight Loss' },
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'zumba', label: '💃 Zumba Training' },
  { value: 'aerobics', label: '🤸 Aerobics' },
  { value: 'calisthenics', label: '🧗 Calisthenics' },
  { value: 'bulking', label: '🏋️ Bulking' },
  { value: 'lean', label: '✂️ Lean (Cut)' },
  { value: 'body recomposition', label: '⚡ Body Recomposition' },
];

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-sm border text-white font-black text-base`}
        style={{ background: color }}
      >
        {value}
        <span className="text-[9px] font-semibold opacity-90 -mt-0.5">{unit}</span>
      </div>
      <span className="text-[11px] font-bold text-navy-600 text-center leading-tight">{label}</span>
    </div>
  );
}

export function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [attendance, setAttendance] = useState<CustomerAttendanceData | null>(null);
  const [biometric, setBiometric] = useState<BioStatusType | null>(null);
  const [scan, setScan] = useState<CustomerBodyScanMetrics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form state for editing personal & AI nutrition parameters
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    target_weight: '',
    body_condition: '',
    meals_per_day: '',
    dietary_preference: '',
    goal: '',
    workout_type: '',
    days_per_week: '4',
  });

  // AI Nutrition Targets state (editable after recommendation)
  const [aiTargets, setAiTargets] = useState({
    calories: '',
    protein_g: '',
    fat_g: '',
    carbs_g: '',
    sugar_limit_g: '',
    fiber_g: '',
  });

  const [aiResult, setAiResult] = useState<AITargetRecommendation | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [targetsSaved, setTargetsSaved] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.allSettled([
      customerApi.getProfile(),
      customerApi.getAttendance(),
      customerApi.getBiometricStatus(),
      customerApi.getLatestBodyScan(),
    ])
      .then(([pRes, aRes, bRes, sRes]) => {
        const p = pRes.status === 'fulfilled' ? pRes.value : null;
        const a = aRes.status === 'fulfilled' ? aRes.value : null;
        const b = bRes.status === 'fulfilled' ? bRes.value : null;
        const s = sRes.status === 'fulfilled' ? sRes.value : null;

        setProfile(p);
        setAttendance(a);
        setBiometric(b);
        setScan(s);
        if (p) {
          setForm({
            full_name: p.full_name || '',
            phone: p.phone || '',
            gender: p.gender || '',
            age: p.age ? String(p.age) : '',
            height: p.height ? String(p.height) : '',
            weight: p.weight ? String(p.weight) : '',
            target_weight: p.target_weight ? String(p.target_weight) : '',
            body_condition: p.body_condition || '',
            meals_per_day: p.meals_per_day ? String(p.meals_per_day) : '',
            dietary_preference: p.dietary_preference || '',
            goal: p.goal || '',
            workout_type: p.workout_type || '',
            days_per_week: p.days_per_week ? String(p.days_per_week) : '4',
          });
          // Load saved targets if they exist
          if (p.target_calories) {
            setAiTargets({
              calories: String(p.target_calories),
              protein_g: String(p.target_protein ?? ''),
              fat_g: String(p.target_fat ?? ''),
              carbs_g: String(p.target_carbs ?? ''),
              sugar_limit_g: String(p.target_sugar ?? ''),
              fiber_g: String(p.target_fiber ?? ''),
            });
            setTargetsSaved(true);
          }
        }
      })
      .catch(() => {
        setError('Unable to load your profile data. Please check connection and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customerApi.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        gender: form.gender,
        age: Number(form.age) || undefined,
        height: Number(form.height) || undefined,
        weight: Number(form.weight) || undefined,
        target_weight: Number(form.target_weight) || undefined,
        body_condition: form.body_condition || undefined,
        meals_per_day: Number(form.meals_per_day) || undefined,
        dietary_preference: form.dietary_preference || undefined,
        goal: form.goal,
        workout_type: form.workout_type || undefined,
        days_per_week: Number(form.days_per_week) || undefined,
      });
      showToast('Personal & AI Nutrition parameters updated successfully!');
      setEditing(false);
      fetchData();
    } catch (_err) {
      showToast('Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    setAiError(null);
    if (!form.weight || !form.height || !form.age || !form.gender) {
      setAiError('Please fill in Weight, Height, Age and Gender before analyzing.');
      return;
    }
    if (!form.workout_type) {
      setAiError('Please select your Workout Type to get accurate recommendations.');
      return;
    }
    setAnalyzing(true);
    try {
      const payload: AnalyzeTargetsPayload = {
        weight_kg: Number(form.weight),
        height_cm: Number(form.height),
        age: Number(form.age),
        gender: form.gender,
        goal: form.goal || form.workout_type,
        workout_type: form.workout_type,
        target_weight_kg: Number(form.target_weight) || undefined,
        days_per_week: Number(form.days_per_week) || 4,
      };
      const result = await customerApi.analyzeNutritionTargets(payload);
      setAiResult(result);
      setAiTargets({
        calories: String(result.calories),
        protein_g: String(result.protein_g),
        fat_g: String(result.fat_g),
        carbs_g: String(result.carbs_g),
        sugar_limit_g: String(result.sugar_limit_g),
        fiber_g: String(result.fiber_g),
      });
      setTargetsSaved(false);
    } catch (_err) {
      setAiError('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmTargets = async () => {
    setSaving(true);
    try {
      await customerApi.updateProfile({
        workout_type: form.workout_type || undefined,
        target_calories: Number(aiTargets.calories) || undefined,
        target_protein: Number(aiTargets.protein_g) || undefined,
        target_fat: Number(aiTargets.fat_g) || undefined,
        target_carbs: Number(aiTargets.carbs_g) || undefined,
        target_sugar: Number(aiTargets.sugar_limit_g) || undefined,
        target_fiber: Number(aiTargets.fiber_g) || undefined,
      });
      setTargetsSaved(true);
      showToast('✅ Nutrition targets confirmed & tracking started!');
      fetchData();
    } catch (_err) {
      showToast('Failed to save targets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-60 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" breadcrumb={['Customer', 'Profile']} />
        <EmptyState icon="user" title="Profile Unavailable" description="Please sign in to view your member profile." />
      </div>
    );
  }

  const hasAiTargets = Boolean(aiTargets.calories);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Your fitness identity & member account"
        breadcrumb={['Customer', 'Profile']}
        actions={
          <button onClick={() => setEditing(!editing)} className="btn-primary flex items-center gap-2">
            <Icon name={editing ? 'x' : 'edit-3'} size={16} />
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        }
      />

      {toast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-600" />
          {toast}
        </div>
      )}

      {/* 1. Digital Member Pass */}
      <MemberCard profile={profile} />

      {/* 2. Grid Layout for Membership, Attendance, Biometrics & Body Scan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MembershipCard membership={profile.membership} />
        {attendance && <AttendanceSummary attendance={attendance} />}
        {biometric && <BiometricStatus biometric={biometric} />}
        {scan && <BodyCompositionSummary scan={scan} />}
      </div>

      {/* 3. Personal Information Form */}
      <div className="card p-6 border border-navy-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-100">
          <div>
            <h3 className="text-base font-bold text-navy-900">Personal Information & Biometrics</h3>
            <p className="text-xs text-navy-400">Manage your profile, goals, dietary preferences & workout type</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Full Name</label>
              <input
                type="text"
                disabled={!editing}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Phone Number</label>
              <input
                type="text"
                disabled={!editing}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Email (Read-Only)</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="input-field bg-navy-50 text-navy-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Gender</label>
              <select
                disabled={!editing}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Age (Years)</label>
              <input
                type="number"
                disabled={!editing}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Height (cm)</label>
              <input
                type="number"
                disabled={!editing}
                placeholder="e.g. 175"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                disabled={!editing}
                placeholder="e.g. 75"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                disabled={!editing}
                placeholder="e.g. 70"
                value={form.target_weight}
                onChange={(e) => setForm({ ...form, target_weight: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Workout Days / Week</label>
              <select
                disabled={!editing}
                value={form.days_per_week}
                onChange={(e) => setForm({ ...form, days_per_week: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="2">2 days / week</option>
                <option value="3">3 days / week</option>
                <option value="4">4 days / week</option>
                <option value="5">5 days / week</option>
                <option value="6">6 days / week</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Target Body Condition</label>
              <select
                disabled={!editing}
                value={form.body_condition}
                onChange={(e) => setForm({ ...form, body_condition: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Condition</option>
                <option value="lean">Lean Fat Loss (Deficit)</option>
                <option value="bulk">Hypertrophy Bulk (Surplus)</option>
                <option value="recomp">Body Recomposition</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Meals Per Day</label>
              <select
                disabled={!editing}
                value={form.meals_per_day}
                onChange={(e) => setForm({ ...form, meals_per_day: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Meals</option>
                <option value="3">3 Meals (Breakfast, Lunch, Dinner)</option>
                <option value="4">4 Meals (Default Split)</option>
                <option value="5">5 Meals (Incl. Pre/Post Workout)</option>
                <option value="6">6 Meals (Athlete High Frequency)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Dietary Preference</label>
              <select
                disabled={!editing}
                value={form.dietary_preference}
                onChange={(e) => setForm({ ...form, dietary_preference: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Diet Preference</option>
                <option value="Veg">Vegetarian 🥦</option>
                <option value="Non-Veg">Non-Vegetarian 🍗</option>
                <option value="Vegan">Vegan 🌿</option>
                <option value="Keto">Keto 🥑</option>
                <option value="Eggetarian">Eggetarian 🥚</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy-700 mb-1 block">Primary Fitness Goal</label>
              <select
                disabled={!editing}
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700"
              >
                <option value="">Select Goal</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="Fat Loss & Toning">Fat Loss & Toning</option>
                <option value="General Fitness & Endurance">General Fitness & Endurance</option>
                <option value="Strength & Powerlifting">Strength & Powerlifting</option>
              </select>
            </div>

            {/* Workout Type — key input for AI analysis */}
            <div className="md:col-span-2 lg:col-span-2">
              <label className="text-xs font-semibold text-navy-700 mb-1 block flex items-center gap-1.5">
                <Icon name="zap" size={13} className="text-brand-500" />
                Workout Type
                <span className="text-[10px] font-normal text-brand-500 ml-1">(used by AI to calculate your targets)</span>
              </label>
              <select
                disabled={!editing}
                value={form.workout_type}
                onChange={(e) => { setForm({ ...form, workout_type: e.target.value }); setAiResult(null); }}
                className="input-field disabled:bg-navy-50 disabled:text-navy-700 font-semibold"
              >
                {WORKOUT_TYPES.map((wt) => (
                  <option key={wt.value} value={wt.value}>{wt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {editing && (
            <div className="flex justify-end gap-3 pt-3 border-t border-navy-100">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* 4. AI NUTRITION TARGET ANALYZER */}
      <div className="card border border-brand-200 bg-gradient-to-br from-white via-brand-50/30 to-white overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-brand-100">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-600/5 to-purple-600/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Icon name="sparkles" size={16} className="text-white" />
                </div>
                <h3 className="text-base font-black text-navy-900">AI Nutrition Target Analyzer</h3>
                {targetsSaved && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                    <Icon name="check-circle" size={10} /> Tracking Active
                  </span>
                )}
              </div>
              <p className="text-xs text-navy-400">
                Based on your biometrics & workout type, AI calculates your personalised daily macro targets using the Mifflin-St Jeor clinical formula.
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-bold shadow-md hover:shadow-lg hover:from-brand-600 hover:to-purple-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {analyzing
                ? <><Icon name="loader" size={14} className="animate-spin" /> Analyzing...</>
                : <><Icon name="zap" size={14} /> Analyze & Recommend</>
              }
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {aiError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <Icon name="alert-circle" size={14} className="text-red-500 shrink-0" />
              {aiError}
            </div>
          )}

          {/* Existing / Saved Targets Banner */}
          {targetsSaved && !aiResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Icon name="check-circle" size={14} className="text-emerald-600 shrink-0" />
              Your nutrition tracking targets are active. Click <strong>Analyze & Recommend</strong> to recalculate based on updated data.
            </div>
          )}

          {/* AI Result Summary */}
          {aiResult && (
            <div className="rounded-2xl bg-gradient-to-br from-brand-900 to-purple-900 p-4 text-white space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="sparkles" size={14} className="text-brand-300" />
                <span className="text-xs font-bold text-brand-200 uppercase tracking-wider">AI Recommendation</span>
              </div>
              {/* Macro Pills */}
              <div className="flex flex-wrap gap-3 justify-center">
                <MacroBar label="Calories" value={aiResult.calories} unit="kcal" color="#2563eb" />
                <MacroBar label="Protein" value={aiResult.protein_g} unit="g" color="#059669" />
                <MacroBar label="Carbs" value={aiResult.carbs_g} unit="g" color="#d97706" />
                <MacroBar label="Fats" value={aiResult.fat_g} unit="g" color="#7c3aed" />
                <MacroBar label="Fibre" value={aiResult.fiber_g} unit="g" color="#0891b2" />
                <MacroBar label="Sugar Limit" value={aiResult.sugar_limit_g} unit="g" color="#dc2626" />
              </div>
              {/* Rationale */}
              <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                {aiResult.rationale.split(' | ').map((line, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-brand-200">
                    <span className="mt-0.5 shrink-0 opacity-60">▸</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable Targets Fields */}
          {hasAiTargets && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-navy-900">Daily Nutrition Targets</h4>
                {aiResult && (
                  <span className="text-[10px] text-navy-400 font-medium">(AI recommended – you can adjust before confirming)</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: 'calories', label: 'Calories', unit: 'kcal', color: 'focus:ring-blue-400', icon: '🔥' },
                  { key: 'protein_g', label: 'Protein', unit: 'g/day', color: 'focus:ring-emerald-400', icon: '🥩' },
                  { key: 'carbs_g', label: 'Carbs', unit: 'g/day', color: 'focus:ring-amber-400', icon: '🌾' },
                  { key: 'fat_g', label: 'Fats', unit: 'g/day', color: 'focus:ring-purple-400', icon: '🥑' },
                  { key: 'fiber_g', label: 'Fibre', unit: 'g/day', color: 'focus:ring-cyan-400', icon: '🥦' },
                  { key: 'sugar_limit_g', label: 'Sugar Limit', unit: 'g/day', color: 'focus:ring-red-400', icon: '🍬' },
                ].map(({ key, label, unit, color, icon }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-navy-700 flex items-center gap-1">
                      <span>{icon}</span> {label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={aiTargets[key as keyof typeof aiTargets]}
                        onChange={(e) => setAiTargets({ ...aiTargets, [key]: e.target.value })}
                        className={`input-field text-xs font-bold pr-8 ${color} focus:ring-2`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-navy-400 font-medium pointer-events-none">
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleConfirmTargets}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all active:scale-95 disabled:opacity-60"
                >
                  {saving
                    ? <><Icon name="loader" size={14} className="animate-spin" /> Saving...</>
                    : <><Icon name="check-circle" size={14} /> Confirm & Start Tracking</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Empty state hint */}
          {!hasAiTargets && !analyzing && !aiError && (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Icon name="target" size={24} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-700">No Targets Set Yet</p>
                <p className="text-xs text-navy-400 mt-0.5 max-w-sm">
                  Fill in your biometrics (Weight, Height, Age, Gender) above, select your Workout Type, then click <strong>Analyze & Recommend</strong> to get AI-powered targets.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
