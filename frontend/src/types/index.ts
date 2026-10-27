export * from './auth';

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
  type: 'checkin' | 'membership' | 'payment' | 'expired';
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
  employee: string;
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

export interface vahd {
  id: string;
  name: string;
  owner: string;
  locations: number;
  members: number;
  employees: number;
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
  type: 'cctv' | 'biometric' | 'face_recognition' | 'pos';
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
