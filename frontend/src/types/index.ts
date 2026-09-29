export type Role = 'super_admin' | 'owner' | 'trainer' | 'customer';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  role: Role;
  avatar: string;
  gymId?: string;
  gymName?: string;
  branchName?: string;
}

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline: number[];
  status: 'up' | 'down' | 'neutral';
  icon: string;
  accent: 'brand' | 'success' | 'warning' | 'danger' | 'ai';
}

export interface ActivityEvent {
  id: string;
  type: 'checkin' | 'membership' | 'payment' | 'lead' | 'expired' | 'body_scan' | 'workout';
  title: string;
  description: string;
  time: string;
  member?: string;
}

export interface AttentionItem {
  id: string;
  icon: string;
  title: string;
  count: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CustomerRadar {
  highRisk: number;
  attention: number;
  healthy: number;
  trend: number[];
}

export interface RevenueData {
  labels: string[];
  revenue: number[];
  mrr: number[];
  membershipSales: number[];
  ptRevenue: number[];
  posRevenue: number[];
  renewals: number[];
  newCustomers: number[];
  churn: number[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  membership: string;
  status: 'active' | 'inactive' | 'expiring' | 'trial' | 'vip';
  attendance: number;
  lastVisit: string;
  expiry: string;
  revenue: string;
  risk: 'low' | 'medium' | 'high';
  branch: string;
  joinDate: string;
  age: number;
  gender: string;
  weight: number;
  bodyFat: number;
  goal: string;
  trainer: string;
  enable_workout_videos?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: string;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string;
  thumbnail: string;
  sets?: number;
  reps?: string;
  weight?: string;
  previousPerformance?: string;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  focus: string;
  duration: number;
  exerciseCount: number;
  exercises: Exercise[];
  split: string;
  aiReasoning: string;
}

export interface NutritionSummary {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
  fiber: { current: number; target: number };
  sugar: { current: number; target: number };
}

export interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface FoodScanResult {
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSugar: number;
  totalFiber: number;
  vitamins: { name: string; value: string }[];
  minerals: { name: string; value: string }[];
}

export interface BodyComposition {
  weight: { current: number; previous: number; target: number; unit: string };
  bmi: { current: number; previous: number; target: number };
  bodyFat: { current: number; previous: number; target: number; unit: string };
  muscleMass: { current: number; previous: number; target: number; unit: string };
  visceralFat: { current: number; previous: number; target: number };
  water: { current: number; previous: number; target: number; unit: string };
  bmr: { current: number; previous: number; target: number };
  boneMass: { current: number; previous: number; target: number; unit: string };
  weightTrend: { labels: string[]; values: number[] };
  bodyFatTrend: { labels: string[]; values: number[] };
  muscleTrend: { labels: string[]; values: number[] };
}

export interface HealthConnection {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  metrics: { name: string; available: boolean }[];
}

export interface HealthSummary {
  steps: number;
  activeCalories: number;
  sleep: string;
  distance: number;
  heartRate: number;
  workouts: number;
}

export interface TrainingReadiness {
  score: number;
  steps: { value: number; available: boolean };
  sleep: { value: string; available: boolean };
  heartRate: { value: number; available: boolean };
  workoutLoad: { value: number; available: boolean };
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  interest: string;
  assignedTrainer: string;
  lastFollowUp: string;
  probability: number;
  status: 'lead' | 'enquiry' | 'trial' | 'follow_up' | 'negotiation' | 'enrollment' | 'active';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  purchasePrice: number;
  sellingPrice: number;
  supplier: string;
  lowStockThreshold: number;
}

export interface Gym {
  id: string;
  name: string;
  owner: string;
  locations: number;
  members: number;
  trainers: number;
  revenue: string;
  subscription: string;
  status: 'active' | 'suspended' | 'pending';
  enabledFeatures: string[];
  health: number;
  aiUsage: number;
}

export interface Device {
  id: string;
  name: string;
  type: 'cctv' | 'biometric' | 'face_recognition' | 'body_scanner' | 'pos';
  status: 'online' | 'warning' | 'offline';
  lastHeartbeat: string;
  location: string;
  version: string;
  network: string;
  alerts: number;
}

export interface AiModule {
  id: string;
  name: string;
  icon: string;
  requests: number;
  successRate: number;
  latency: number;
  errors: number;
  cost: number;
  usage: number;
}
