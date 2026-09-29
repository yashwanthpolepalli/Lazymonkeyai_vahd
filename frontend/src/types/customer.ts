export interface CustomerMembership {
  plan_name: string;
  status: string;
  start_date: string | null;
  expiry_date: string | null;
  days_remaining: number;
}

export interface CustomerProfile {
  id: string;
  member_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  weight: number;
  height: number;
  bmi: number;
  fitness_level: string;
  goal: string;
  target_weight?: number;
  body_condition?: string;
  meals_per_day?: number;
  dietary_preference?: string;
  workout_type?: string;
  // AI Nutrition targets (confirmed & saved)
  target_calories?: number;
  target_protein?: number;
  target_fat?: number;
  target_carbs?: number;
  target_sugar?: number;
  target_fiber?: number;
  days_per_week?: number;
  profile_image: string;
  status: string;
  enable_workout_videos?: boolean;
  has_video_access?: boolean;
  membership: CustomerMembership;
}

export interface AITargetRecommendation {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  sugar_limit_g: number;
  fiber_g: number;
  bmr: number;
  tdee: number;
  method: string;
  rationale: string;
}

export interface CustomerDashboardKpi {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface CustomerDashboardData {
  greeting?: string;
  subtitle?: string;
  completed_workouts?: number;
  attendance?: {
    total_visits: number;
  };
  nutrition?: {
    calories_consumed: number;
  };
  readiness?: {
    score: number;
    label: string;
    message: string;
  };
  kpis?: CustomerDashboardKpi[];
}

export interface CustomerAttendanceHistory {
  id: string;
  date?: string;
  time?: string;
  timestamp?: string;
  check_in?: string;
  check_out?: string;
  duration?: string;
  type?: string;
  event_type?: string;
  verification_type?: string;
  direction?: string;
  status?: string;
  device_name?: string;
  confidence_score?: number;
  is_active?: boolean;
}

export interface CustomerAttendanceData {
  total_visits: number;
  current_streak: number;
  monthly_visits: number;
  monthly_target?: number;
  is_checked_in?: boolean;
  today_check_in?: string | null;
  today_check_out?: string | null;
  last_visit: string | null;
  history: CustomerAttendanceHistory[];
}

export interface CustomerBiometricStatus {
  face_recognition: { status: string; active?: boolean; enrolled?: boolean };
  fingerprint: { status: string; active?: boolean; enrolled?: boolean };
  rfid_card: { status: string; card_number: string; active?: boolean; assigned?: boolean };
  last_verification: string | null;
  notice: string;
}

export interface CustomerBodyScanMetrics {
  has_scan: boolean;
  scan_id?: string;
  scan_date?: string;
  weight_kg?: number;
  body_fat_pct?: number;
  bmi?: number;
  skeletal_muscle_mass_kg?: number;
  body_water_pct?: number;
  visceral_fat_level?: number;
  inbody_score?: number;
  segmental_analysis?: Record<string, any> | null;
  message?: string;
}

export interface WorkoutSplitDay {
  day: number;
  name: string;
  focus: string[];
  status: 'completed' | 'today' | 'upcoming';
}

export interface CustomerWorkoutSplit {
  plan_id: string;
  name: string;
  goal: string;
  days_per_week: number;
  days: WorkoutSplitDay[];
}

export interface WorkoutExerciseItem {
  id: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  weight_kg: number;
}

export interface CustomerTodayWorkout {
  workout_id: string;
  title: string;
  focus: string;
  duration_min: number;
  exercise_count: number;
  exercises: WorkoutExerciseItem[];
}

export interface NutritionMacroSummary {
  current: number;
  target: number;
}

export interface CustomerNutritionData {
  calories: NutritionMacroSummary;
  protein: NutritionMacroSummary;
  carbs: NutritionMacroSummary;
  fat: NutritionMacroSummary;
  meals_logged: {
    id: string;
    meal_type: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

export interface FoodScanItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  vitamins?: {
    vitamin_a_iu?: number;
    vitamin_c_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    potassium_mg?: number;
  };
}

export interface FoodScanResult {
  scan_id: string;
  meal_name?: string;
  items: FoodScanItem[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    vitamins?: {
      vitamin_a_iu?: number;
      vitamin_c_mg?: number;
      calcium_mg?: number;
      iron_mg?: number;
      potassium_mg?: number;
    };
  };
  confidence: number;
}

export interface AICoachRecommendation {
  score: number;
  title: string;
  insight: string;
  suggested_action: string;
}

export interface TransformationPhase {
  phase_number: number;
  title: string;
  duration: string;
  focus: string;
  milestone: string;
}

export interface TransformationDietMeal {
  meal_name: string;
  time: string;
  icon: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  recommended_items: string[];
}

export interface TransformationWorkoutDay {
  day: string;
  focus: string;
  sets: string;
}

export interface TransformationResponse {
  customer_id: string;
  body_condition: 'lean' | 'bulk' | 'recomp' | 'athletic';
  current_weight_kg: number;
  target_weight_kg: number;
  height_cm: number;
  current_bmi: number;
  projected_bmi: number;
  estimated_months: number;
  estimated_weeks: number;
  bmr_kcal: number;
  tdee_kcal: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_water_l: number;
  target_fiber_g: number;
  before_image_url?: string;
  after_image_url: string;
  roadmap_phases: TransformationPhase[];
  diet_plan: TransformationDietMeal[];
  workout_split: TransformationWorkoutDay[];
  rationale: string;
}

export interface SavedTransformationRecord {
  id: string;
  body_condition: string;
  before_image_url?: string;
  after_image_url: string;
  current_weight_kg: number;
  target_weight_kg: number;
  estimated_months: number;
  estimated_weeks: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  created_at: string;
}

export interface BeforeAfterFrameItem {
  id: string;
  template_id: string;
  aspect_ratio: '1:1' | '4:5' | '9:16' | '16:9';
  before_image: string;
  after_image: string;
  before_date_month: string;
  before_date_year: string;
  after_date_month: string;
  after_date_year: string;
  before_weight_kg?: number | string;
  after_weight_kg?: number | string;
  duration_text?: string;
  caption?: string;
  gym_branding?: string;
  accent_color?: string;
  created_at: string;
}


