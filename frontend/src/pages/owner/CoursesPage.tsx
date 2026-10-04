import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/services/api';
import { apiClient } from '@/services/apiClient';
import { hrmsApi } from '@/services/hrmsApi';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

export interface MembershipPlanItem {
  id?: string;
  owner_id?: string;
  branch_id?: string;
  name: string;
  category?: string;
  price: number;
  duration_days?: number;
  period?: string;
  features: string[];
  color?: string;
  badge?: string;
  is_combo?: boolean;
  isCombo?: boolean;
}

export interface DurationTierConfig {
  id: string;
  name: string;
  days: number;
  multiplier: number;
  suffix: string;
}

export interface CategoryBranchItem {
  id: string;
  code: string;
  name: string;
  color?: string;
}

export interface TrainingProgramView {
  id: string;
  name: string;
  categories: string[]; // e.g. ['CSE', 'EEE', 'ECE']
  category: string;     // comma-separated representation
  categoryLabel: string;
  classification: string; // e.g. 'Core Subject', 'Professional Elective', 'Open Elective', 'Integrated Degree'
  isCombo?: boolean;
  color: string;
  badge?: string;
  features: string[];
  tierPrices: Record<number, number>; // maps duration_days -> price
  tierPlanIds: Record<number, string>; // maps duration_days -> DB plan ID
}

export interface CourseClassificationItem {
  id: string;
  value: string;
  label: string;
}

const DEFAULT_DURATION_TIERS: DurationTierConfig[] = [
  { id: 'tier_30', name: '1 Month', days: 30, multiplier: 1.0, suffix: '30D' },
  { id: 'tier_90', name: '3 Months', days: 90, multiplier: 2.6, suffix: '90D' },
  { id: 'tier_180', name: '6 Months', days: 180, multiplier: 4.8, suffix: '180D' },
  { id: 'tier_365', name: '1 Year', days: 365, multiplier: 8.8, suffix: '365D' },
];

const STORAGE_TIERS_KEY = 'course_duration_tiers_v3';
const STORAGE_CATEGORIES_KEY = 'course_branch_categories_v3';

export function CoursesPage({ embedded = false }: { embedded?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [rawPlans, setRawPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
    try {
      return (localStorage.getItem('courses_display_view_mode') as 'grid' | 'row') || 'row';
    } catch {
      return 'row';
    }
  });

  const handleToggleViewMode = (mode: 'grid' | 'row') => {
    setViewMode(mode);
    try {
      localStorage.setItem('courses_display_view_mode', mode);
    } catch {}
  };

  // Dynamic Classifications State (Editable & Database Driven)
  const [classifications, setClassifications] = useState<CourseClassificationItem[]>([]);
  const [classificationManagerOpen, setClassificationManagerOpen] = useState(false);
  const [editingClassification, setEditingClassification] = useState<CourseClassificationItem | null>(null);
  const [newClassValue, setNewClassValue] = useState('');
  const [newClassLabel, setNewClassLabel] = useState('');
  const [classLoading, setClassLoading] = useState(false);

  // Dynamic Duration Tiers State
  const [durationTiers, setDurationTiers] = useState<DurationTierConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TIERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DURATION_TIERS;
  });

  // Dynamic Categories / Branches State (Strictly dynamically populated)
  const [categories, setCategories] = useState<CategoryBranchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATEGORIES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Category Manager State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // Mediums of Instruction / Languages State
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageManagerOpen, setLanguageManagerOpen] = useState(false);
  const [newLanguageInput, setNewLanguageInput] = useState('');
  const [langLoading, setLangLoading] = useState(false);

  // Tiers Manager Modal State
  const [tierManagerOpen, setTierManagerOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<DurationTierConfig | null>(null);
  const [tierForm, setTierForm] = useState({
    name: '',
    unitCount: 1,
    unitType: 'months' as 'days' | 'months' | 'years' | 'semesters',
    multiplier: 1.0,
  });

  // Quick Inline Add Tier in Course Modal
  const [showQuickAddTier, setShowQuickAddTier] = useState(false);
  const [quickTierName, setQuickTierName] = useState('');
  const [quickTierCount, setQuickTierCount] = useState(1);
  const [quickTierUnit, setQuickTierUnit] = useState<'days' | 'months' | 'years' | 'semesters'>('years');

  // Course Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    selectedCategories: [] as string[], // array of branch codes: ['CSE', 'EEE', 'ECE']
    classification: 'Core Subject',
    isCombo: false,
    badge: '',
    color: 'from-blue-600 to-indigo-700',
    features: '',
    tierPrices: {} as Record<number, string>, // days -> price string
    tierPlanIds: {} as Record<number, string>, // days -> plan ID
  });

  const saveDurationTiers = (tiers: DurationTierConfig[]) => {
    const sorted = [...tiers].sort((a, b) => a.days - b.days);
    setDurationTiers(sorted);
    try {
      localStorage.setItem(STORAGE_TIERS_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error('Failed to save duration tiers', e);
    }
  };

  const saveCategories = (cats: CategoryBranchItem[]) => {
    setCategories(cats);
    try {
      localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(cats));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newLanguageInput.trim();
    if (!clean) return;
    setLangLoading(true);
    try {
      const res = await apiClient.post<string[]>('/courses/languages', { name: clean });
      if (Array.isArray(res)) {
        setLanguages(res);
      } else {
        setLanguages((prev) => Array.from(new Set([...prev, clean])));
      }
      setNewLanguageInput('');
    } catch (err) {
      console.error('Failed to add language', err);
    } finally {
      setLangLoading(false);
    }
  };

  const handleDeleteLanguage = async (langName: string) => {
    if (!confirm(`Are you sure you want to remove "${langName}" from mediums of instruction?`)) return;
    try {
      const res = await apiClient.delete<string[]>(`/courses/languages/${encodeURIComponent(langName)}`);
      if (Array.isArray(res)) {
        setLanguages(res);
      } else {
        setLanguages((prev) => prev.filter((l) => l !== langName));
      }
    } catch (err) {
      console.error('Failed to delete language', err);
    }
  };

  const handleAddClassification = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newClassValue.trim();
    const lbl = newClassLabel.trim() || val;
    if (!val) return;
    setClassLoading(true);
    try {
      if (editingClassification) {
        const res = await apiClient.put<CourseClassificationItem[]>(
          `/courses/classifications/${editingClassification.id}`,
          { value: val, label: lbl }
        );
        if (Array.isArray(res)) setClassifications(res);
        setEditingClassification(null);
      } else {
        const res = await apiClient.post<CourseClassificationItem[]>(
          '/courses/classifications',
          { value: val, label: lbl }
        );
        if (Array.isArray(res)) setClassifications(res);
      }
      setNewClassValue('');
      setNewClassLabel('');
    } catch (err) {
      console.error('Failed to save classification', err);
    } finally {
      setClassLoading(false);
    }
  };

  const handleEditClassification = (item: CourseClassificationItem) => {
    setEditingClassification(item);
    setNewClassValue(item.value);
    setNewClassLabel(item.label);
  };

  const handleDeleteClassification = async (item: CourseClassificationItem) => {
    if (!confirm(`Are you sure you want to delete classification "${item.label}"?`)) return;
    try {
      const res = await apiClient.delete<CourseClassificationItem[]>(
        `/courses/classifications/${item.id}`
      );
      if (Array.isArray(res)) setClassifications(res);
      else setClassifications((prev) => prev.filter((c) => c.id !== item.id));
      if (editingClassification?.id === item.id) {
        setEditingClassification(null);
        setNewClassValue('');
        setNewClassLabel('');
      }
    } catch (err) {
      console.error('Failed to delete classification', err);
    }
  };

  const fetchPlansAndMembers = async () => {
    setLoading(true);
    try {
      const [membersRes, plansRes, deptsRes, langsRes, classRes] = await Promise.all([
        api.customers.list().catch(() => []),
        apiClient.get<MembershipPlanItem[]>('/courses/plans').catch(() => []),
        hrmsApi.getDepartments().catch(() => []),
        apiClient.get<string[]>('/courses/languages').catch(() => []),
        apiClient.get<CourseClassificationItem[]>('/courses/classifications').catch(() => []),
      ]);

      const fetchedMembers = Array.isArray(membersRes) ? membersRes : [];
      const fetchedPlans = Array.isArray(plansRes) ? plansRes : [];
      const fetchedDepts = Array.isArray(deptsRes) ? deptsRes : [];
      const fetchedLangs = Array.isArray(langsRes) ? langsRes : [];
      const fetchedClasses = Array.isArray(classRes) ? classRes : [];

      setMembers(fetchedMembers);
      setRawPlans(fetchedPlans);
      setLanguages(fetchedLangs);
      if (fetchedClasses.length > 0) {
        setClassifications(fetchedClasses);
      }

      // Merge departments from HRMS into branch categories if not already present
      const existingCodes = new Set(categories.map((c) => c.code.toUpperCase()));
      const newFromDepts: CategoryBranchItem[] = [];
      fetchedDepts.forEach((dept) => {
        const code = (dept.code || dept.name.substring(0, 4)).toUpperCase();
        if (!existingCodes.has(code)) {
          existingCodes.add(code);
          newFromDepts.push({
            id: `cat_dept_${dept.id}`,
            code,
            name: dept.name,
            color: 'indigo',
          });
        }
      });
      if (newFromDepts.length > 0) {
        saveCategories([...categories, ...newFromDepts]);
      }

      // Auto-discover duration tiers from plans
      setDurationTiers((prevTiers) => {
        const knownDays = new Set(prevTiers.map((t) => t.days));
        const newTiers: DurationTierConfig[] = [];
        fetchedPlans.forEach((plan) => {
          const days = plan.duration_days;
          if (days && days > 0 && !knownDays.has(days)) {
            knownDays.add(days);
            let name = `${days} Days`;
            let suffix = `${days}D`;
            let multiplier = Number((days / 30).toFixed(1));
            if (days === 30) name = '1 Month';
            else if (days === 60) name = '2 Months';
            else if (days === 90) name = '3 Months';
            else if (days === 180) name = '6 Months';
            else if (days === 365) name = '1 Year';
            else if (days === 730) name = '2 Years';
            else if (days === 1095) name = '3 Years';
            else if (days === 1460) name = '4 Years';

            newTiers.push({
              id: `tier_${days}`,
              name,
              days,
              multiplier,
              suffix,
            });
          }
        });

        if (newTiers.length > 0) {
          const merged = [...prevTiers, ...newTiers].sort((a, b) => a.days - b.days);
          try {
            localStorage.setItem(STORAGE_TIERS_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        }
        return prevTiers;
      });
    } catch (err) {
      console.error('Failed to load courses data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndMembers();
  }, []);

  // Build structured training programs purely from owner-created DB plans
  const structuredPrograms: TrainingProgramView[] = (() => {
    if (!rawPlans.length) return [];

    const groupMap = new Map<string, MembershipPlanItem[]>();

    rawPlans.forEach((plan) => {
      const baseName = plan.name
        .replace(/\s*[-–]\s*(monthly|quarterly|6[- ]?month|yearly|annual|\d+[- ]?months?|\d+[- ]?years?|\d+d?)\s*$/i, '')
        .trim();
      const key = `${(plan.category || 'general').toLowerCase().trim()}::${baseName.toLowerCase().trim()}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(plan);
    });

    const list: TrainingProgramView[] = [];

    groupMap.forEach((groupPlans) => {
      const first = groupPlans[0];
      const baseName = first.name
        .replace(/\s*[-–]\s*(monthly|quarterly|6[- ]?month|yearly|annual|\d+[- ]?months?|\d+[- ]?years?|\d+d?)\s*$/i, '')
        .trim();

      const tierPrices: Record<number, number> = {};
      const tierPlanIds: Record<number, string> = {};

      groupPlans.forEach((p) => {
        const days = p.duration_days || 30;
        tierPrices[days] = p.price || 0;
        if (p.id) tierPlanIds[days] = p.id;
      });

      const isComboVal = Boolean(
        first.is_combo || first.isCombo ||
        (first.category || '').includes('_') ||
        baseName.includes('+')
      );

      const rawCategory = (first.category || 'General').trim();
      // Split multiple categories if saved comma-separated or space separated
      const parsedCategories = rawCategory
        .split(/[,/|]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      const categoryCodes = parsedCategories.length > 0 ? parsedCategories : ['General'];
      const categoryLabel = categoryCodes.join(', ');

      let classification = 'Core Subject';
      if (first.badge) {
        classification = first.badge;
      } else if (isComboVal) {
        classification = 'Integrated Degree';
      }

      list.push({
        id: first.id || `prog_${rawCategory}_${baseName.replace(/\s+/g, '_').toLowerCase()}`,
        name: baseName,
        categories: categoryCodes,
        category: rawCategory,
        categoryLabel,
        classification,
        isCombo: isComboVal,
        badge: first.badge || '',
        color: first.color || (isComboVal ? 'from-rose-500 to-pink-600' : 'from-blue-500 to-indigo-600'),
        features: first.features?.length ? first.features : [],
        tierPrices,
        tierPlanIds,
      });
    });

    return list;
  })();

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatCode.trim()) return;
    const code = newCatCode.trim().toUpperCase();
    const name = newCatName.trim() || code;
    const existing = categories.find((c) => c.code.toUpperCase() === code);
    if (!existing) {
      const newCat: CategoryBranchItem = {
        id: `cat_${Date.now()}`,
        code,
        name,
        color: 'blue',
      };
      const updated = [...categories, newCat];
      saveCategories(updated);
    }
    setNewCatCode('');
    setNewCatName('');
    setShowAddCategoryModal(false);
  };

  const handleToggleBranchSelection = (code: string) => {
    setProgramForm((prev) => {
      const current = prev.selectedCategories;
      const exists = current.includes(code);
      const next = exists ? current.filter((c) => c !== code) : [...current, code];
      return { ...prev, selectedCategories: next };
    });
  };

  const handleSelectAllBranches = () => {
    setProgramForm((prev) => {
      const allCodes = categories.map((c) => c.code);
      const areAllSelected = allCodes.every((c) => prev.selectedCategories.includes(c));
      return { ...prev, selectedCategories: areAllSelected ? [] : allCodes };
    });
  };

  const openCreateModal = () => {
    setEditingProgramId(null);
    setShowQuickAddTier(false);

    const initialPrices: Record<number, string> = {};
    durationTiers.forEach((t) => {
      initialPrices[t.days] = '';
    });

    setProgramForm({
      name: '',
      selectedCategories: categories.length > 0 ? [categories[0].code] : [],
      classification: 'Core Subject',
      isCombo: false,
      badge: '',
      color: 'from-blue-600 to-indigo-700',
      features: '',
      tierPrices: initialPrices,
      tierPlanIds: {},
    });
    setModalOpen(true);
  };

  const openEditModal = (prog: TrainingProgramView) => {
    setEditingProgramId(prog.id);
    setShowQuickAddTier(false);

    const prices: Record<number, string> = {};
    durationTiers.forEach((t) => {
      prices[t.days] = prog.tierPrices[t.days] !== undefined ? String(prog.tierPrices[t.days]) : '';
    });

    setProgramForm({
      name: prog.name,
      selectedCategories: prog.categories.length > 0 ? prog.categories : ['General'],
      classification: prog.classification || 'Core Subject',
      isCombo: Boolean(prog.isCombo),
      badge: prog.badge || '',
      color: prog.color || 'from-brand-500 to-brand-700',
      features: prog.features.join(', '),
      tierPrices: prices,
      tierPlanIds: prog.tierPlanIds || {},
    });
    setModalOpen(true);
  };

  const calculateDaysAndName = (count: number, unit: 'days' | 'months' | 'years' | 'semesters', customName?: string) => {
    let days = 30;
    let defaultName = `${count} ${unit}`;
    let suffix = `${days}D`;

    if (unit === 'days') {
      days = Math.max(1, count);
      defaultName = `${days} Days`;
      suffix = `${days}D`;
    } else if (unit === 'months') {
      days = Math.max(1, count) * 30;
      defaultName = count === 1 ? '1 Month' : `${count} Months`;
      suffix = `${days}D`;
    } else if (unit === 'years') {
      days = Math.max(1, count) * 365;
      defaultName = count === 1 ? '1 Year' : `${count} Years`;
      suffix = `${days}D`;
    } else if (unit === 'semesters') {
      days = Math.max(1, count) * 180;
      defaultName = count === 1 ? '1 Semester (6M)' : `${count} Semesters`;
      suffix = `${days}D`;
    }

    return {
      days,
      name: customName?.trim() || defaultName,
      suffix,
      multiplier: Number((days / 30).toFixed(1)),
    };
  };

  const handleQuickAddTier = () => {
    const { days, name, suffix, multiplier } = calculateDaysAndName(
      quickTierCount,
      quickTierUnit,
      quickTierName
    );

    const existing = durationTiers.find((t) => t.days === days);
    if (!existing) {
      const newTier: DurationTierConfig = {
        id: `tier_${days}_${Date.now()}`,
        name,
        days,
        multiplier,
        suffix,
      };
      const updated = [...durationTiers, newTier];
      saveDurationTiers(updated);
    }

    setProgramForm((prev) => ({
      ...prev,
      tierPrices: {
        ...prev.tierPrices,
        [days]: prev.tierPrices[days] || '',
      },
    }));

    setQuickTierName('');
    setQuickTierCount(1);
    setShowQuickAddTier(false);
  };

  const handleRemoveTier = (daysToRemove: number, tierName: string) => {
    if (!confirm(`Remove "${tierName}" from duration tiers?`)) return;
    const updated = durationTiers.filter((t) => t.days !== daysToRemove);
    saveDurationTiers(updated);

    setProgramForm((prev) => {
      const nextPrices = { ...prev.tierPrices };
      delete nextPrices[daysToRemove];
      return { ...prev, tierPrices: nextPrices };
    });
  };

  const handleOpenTierManager = () => {
    setEditingTier(null);
    setTierForm({ name: '', unitCount: 1, unitType: 'months', multiplier: 1.0 });
    setTierManagerOpen(true);
  };

  const handleEditTier = (tier: DurationTierConfig) => {
    setEditingTier(tier);
    let unitType: 'days' | 'months' | 'years' | 'semesters' = 'days';
    let unitCount = tier.days;

    if (tier.days % 365 === 0) {
      unitType = 'years';
      unitCount = tier.days / 365;
    } else if (tier.days % 180 === 0 && tier.name.toLowerCase().includes('sem')) {
      unitType = 'semesters';
      unitCount = tier.days / 180;
    } else if (tier.days % 30 === 0) {
      unitType = 'months';
      unitCount = tier.days / 30;
    }

    setTierForm({
      name: tier.name,
      unitCount,
      unitType,
      multiplier: tier.multiplier || Number((tier.days / 30).toFixed(1)),
    });
  };

  const handleSaveTierFromManager = (e: React.FormEvent) => {
    e.preventDefault();
    const { days, name, suffix } = calculateDaysAndName(
      tierForm.unitCount,
      tierForm.unitType,
      tierForm.name
    );

    if (editingTier) {
      const updated = durationTiers.map((t) =>
        t.id === editingTier.id
          ? {
              ...t,
              name,
              days,
              suffix,
              multiplier: Number(tierForm.multiplier) || Number((days / 30).toFixed(1)),
            }
          : t
      );
      saveDurationTiers(updated);
      setEditingTier(null);
    } else {
      const newTier: DurationTierConfig = {
        id: `tier_${days}_${Date.now()}`,
        name,
        days,
        suffix,
        multiplier: Number(tierForm.multiplier) || Number((days / 30).toFixed(1)),
      };
      saveDurationTiers([...durationTiers, newTier]);
    }

    setTierForm({ name: '', unitCount: 1, unitType: 'months', multiplier: 1.0 });
  };

  const handleDeleteTierFromManager = (tierId: string, tierName: string) => {
    if (!confirm(`Are you sure you want to delete duration tier "${tierName}"?`)) return;
    const updated = durationTiers.filter((t) => t.id !== tierId);
    saveDurationTiers(updated);
    if (editingTier?.id === tierId) {
      setEditingTier(null);
      setTierForm({ name: '', unitCount: 1, unitType: 'months', multiplier: 1.0 });
    }
  };

  const handleAutoCalculatePrices = () => {
    const baseTier = durationTiers[0];
    const basePriceStr = baseTier ? programForm.tierPrices[baseTier.days] : '';
    const basePrice = Number(basePriceStr) || Number(Object.values(programForm.tierPrices).find(Boolean)) || 0;

    if (!basePrice || isNaN(basePrice)) {
      alert('Please enter a base price in the first tier (e.g. 1 Month) to auto-calculate other duration tiers.');
      return;
    }

    const calculated: Record<number, string> = {};
    durationTiers.forEach((tier) => {
      if (tier.days === baseTier?.days) {
        calculated[tier.days] = String(basePrice);
      } else {
        const mult = tier.multiplier || (tier.days / (baseTier ? baseTier.days : 30));
        const price = Math.round((basePrice * mult) / 50) * 50;
        calculated[tier.days] = String(price);
      }
    });

    setProgramForm((prev) => ({
      ...prev,
      tierPrices: calculated,
    }));
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name.trim()) return;

    const chosenCategories = programForm.selectedCategories.length > 0 ? programForm.selectedCategories : ['General'];
    const categoryString = chosenCategories.join(', ');

    const featuresList = programForm.features
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const activeTiers = durationTiers.filter((tier) => {
        const tierPrice = Number(programForm.tierPrices[tier.days]) || 0;
        return tierPrice > 0 || editingProgramId;
      });

      // If user provided no specific tier price (>0), create at least with the primary duration tier
      const tiersToProcess = activeTiers.length > 0
        ? activeTiers
        : [durationTiers[0] || { id: 'tier_365', name: '1 Year', days: 365, multiplier: 1, suffix: '365D' }];

      for (const tier of tiersToProcess) {
        const tierPrice = Number(programForm.tierPrices[tier.days]) || 0;

        const payload = {
          name: `${programForm.name} - ${tier.name}`,
          category: categoryString,
          price: tierPrice,
          duration_days: tier.days,
          features: featuresList,
          badge: programForm.classification || programForm.badge || 'Core Subject',
          color: programForm.color || 'from-blue-600 to-indigo-700',
          is_combo: Boolean(programForm.isCombo || programForm.classification === 'Integrated Degree'),
        };

        const existingDbId = programForm.tierPlanIds[tier.days];
        if (existingDbId) {
          await apiClient.put(`/courses/plans/${existingDbId}`, payload).catch(() => {});
        } else {
          await apiClient.post('/courses/plans', payload).catch(() => {});
        }
      }

      setModalOpen(false);
      await fetchPlansAndMembers();
    } catch (_err) {
      console.error('Save course error', _err);
    }
  };

  const handleDeleteProgram = async (prog: TrainingProgramView) => {
    if (!confirm(`Are you sure you want to delete the "${prog.name}" course and all its fee tiers?`)) return;
    try {
      const idsToDelete = Object.values(prog.tierPlanIds || {}).filter(Boolean);
      if (idsToDelete.length === 0 && prog.id) {
        idsToDelete.push(prog.id);
      }
      for (const id of idsToDelete) {
        await apiClient.delete(`/courses/plans/${id}`).catch(() => {});
      }
      if (editingProgramId === prog.id) {
        setModalOpen(false);
      }
      await fetchPlansAndMembers();
    } catch (_err) {
      console.error('Delete course error', _err);
    }
  };

  const activeCount = members.filter((m) => m.status === 'active' || m.status === 'vip').length;
  const expiringCount = members.filter((m) => m.status === 'expiring').length;

  const totalRevenue = members.reduce((acc, m) => {
    const val = parseInt(String(m.revenue || '').replace(/[^0-9]/g, ''), 10);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Filtering: Check if the course's categories array includes the selected filter
  const filteredPrograms = structuredPrograms.filter((p) => {
    if (filterCategory === 'all') return true;
    const filterLower = filterCategory.toLowerCase();
    return p.categories.some((c) => c.toLowerCase() === filterLower) || p.category.toLowerCase().includes(filterLower);
  });

  // Unique Category Filter Pills strictly derived from actual created courses in the database
  const availableFilterPills = (() => {
    const map = new Map<string, string>(); // lowerKey -> displayName
    structuredPrograms.flatMap((p) => p.categories).forEach((cat) => {
      const trimmed = cat.trim();
      if (trimmed && !map.has(trimmed.toLowerCase())) {
        map.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  })();

  const getBranchBadgeStyle = (branchCode: string) => {
    const lower = branchCode.toLowerCase();
    if (lower.includes('cse') || lower.includes('comp') || lower.includes('cs')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (lower.includes('ece') || lower.includes('electr') || lower.includes('comm')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (lower.includes('eee') || lower.includes('power')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (lower.includes('mech') || lower.includes('auto')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (lower.includes('civil') || lower.includes('struct')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (lower.includes('ai') || lower.includes('ml') || lower.includes('data')) {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    if (lower.includes('it') || lower.includes('info')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    // Dynamic palette hashing for custom categories
    const palettes = [
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-violet-50 text-violet-700 border-violet-200',
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      'bg-pink-50 text-pink-700 border-pink-200',
      'bg-orange-50 text-orange-700 border-orange-200',
      'bg-lime-50 text-lime-700 border-lime-200',
      'bg-sky-50 text-sky-700 border-sky-200',
    ];
    let hash = 0;
    for (let i = 0; i < branchCode.length; i++) {
      hash = branchCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-navy-900 tracking-tight flex items-center gap-2">
              <Icon name="book-open" size={22} className="text-brand-600" />
              <span>Courses, Degree Programs &amp; Fee Structure</span>
            </h2>
            <p className="text-xs text-navy-500 font-medium">
              Map courses across branches (CSE, EEE, ECE, etc.) with custom duration fee tiers.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setClassificationManagerOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Icon name="tag" size={15} className="text-purple-600" />
              <span>Classifications ({classifications.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguageManagerOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Icon name="globe" size={15} className="text-blue-600" />
              <span>Mediums / Languages ({languages.length})</span>
            </button>
            <button
              type="button"
              onClick={handleOpenTierManager}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Icon name="clock" size={15} className="text-brand-600" />
              <span>Manage Duration Tiers ({durationTiers.length})</span>
            </button>
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 shadow-glow">
              <Icon name="plus" size={16} /> Add Course / Program
            </button>
          </div>
        </div>
      ) : (
        <PageHeader
          title="Courses, Degree Programs & Fee Structure"
          breadcrumb={['Owner', 'Courses']}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setClassificationManagerOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Icon name="tag" size={15} className="text-purple-600" />
                <span>Classifications ({classifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Icon name="globe" size={15} className="text-blue-600" />
                <span>Mediums / Languages ({languages.length})</span>
              </button>
              <button
                type="button"
                onClick={handleOpenTierManager}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Icon name="clock" size={15} className="text-brand-600" />
                <span>Manage Duration Tiers ({durationTiers.length})</span>
              </button>
              <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 shadow-glow">
                <Icon name="plus" size={16} /> Add Course / Program
              </button>
            </div>
          }
        />
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Enrolled Students</span>
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                <Icon name="check-circle" size={16} className="text-success-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{activeCount}</div>
            <div className="text-xs text-navy-400 mt-1">Live active students</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Expiring Soon</span>
              <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                <Icon name="clock" size={16} className="text-warning-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{expiringCount}</div>
            <div className="text-xs text-warning-600 font-semibold mt-1">within 7 days</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Academic Branches</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Icon name="layers" size={16} className="text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{categories.length} Branches</div>
            <div className="text-xs text-purple-600 font-semibold mt-1">CSE, EEE, ECE, MECH, etc.</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Total Fee Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon name="indian-rupee" size={16} className="text-brand-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-navy-400 mt-1">Aggregated course fees</div>
          </div>
        </div>
      )}

      {/* Courses & Degree Programs Grid */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
              <Icon name="book-open" size={18} className="text-brand-600" />
              <span>Available Courses &amp; Degree Programs</span>
            </h3>
            <p className="text-xs text-navy-400 mt-0.5">
              Multi-branch subjects &amp; degree courses with custom duration fee tiers.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* Dynamic Branch / Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0',
                  filterCategory === 'all'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-navy-50 text-navy-600 border-navy-200 hover:bg-navy-100'
                )}
              >
                All Courses
              </button>
              {availableFilterPills.map((code) => {
                const isActive = filterCategory.toLowerCase() === code.toLowerCase();
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setFilterCategory(code)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0',
                      isActive
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-navy-50 text-navy-600 border-navy-200 hover:bg-navy-100'
                    )}
                  >
                    {code}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle: Grid vs Row */}
            <div className="flex items-center bg-navy-100/80 p-0.5 rounded-xl border border-navy-200 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-navy-500 hover:text-navy-800'
                )}
                title="Card Grid View"
              >
                <Icon name="grid" size={13} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('row')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  viewMode === 'row'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-navy-500 hover:text-navy-800'
                )}
                title="Row Table View"
              >
                <Icon name="list" size={13} />
                <span className="hidden sm:inline">Row</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : filteredPrograms.length === 0 ? (
          <div className="p-12 text-center bg-navy-50/40 rounded-3xl border border-dashed border-navy-200 space-y-2">
            <Icon name="book-open" size={24} className="text-navy-400 mx-auto" />
            <p className="text-xs font-bold text-navy-700">No courses found for selected branch</p>
            <p className="text-[11px] text-navy-400">Click "Add Course / Program" to create a new course.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrograms.map((prog) => {
              const enrolledCount = members.filter((m) =>
                (m.membership || '').toLowerCase().includes(prog.name.toLowerCase())
              ).length;

              return (
                <div
                  key={prog.id}
                  className="card card-hover p-5 relative flex flex-col justify-between border border-navy-200/90 hover:border-brand-500/50 hover:shadow-md transition-all duration-200"
                >
                  <div>
                    {/* Top Badges & Icon */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm shrink-0', prog.color)}>
                        <Icon name={prog.isCombo ? 'award' : 'book-open'} size={20} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-[10px] font-extrabold text-navy-700 bg-navy-100/80 border border-navy-200 px-2 py-0.5 rounded-md shadow-xs">
                          {prog.classification || 'Course'}
                        </span>
                      </div>
                    </div>

                    {/* Program Title */}
                    <div className="text-base font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                      {prog.name}
                    </div>

                    {/* Applicable Branches / Categories */}
                    <div className="flex items-center gap-1 flex-wrap my-2">
                      <span className="text-[10px] font-bold text-navy-400 mr-0.5">Branches:</span>
                      {prog.categories.map((branch) => (
                        <span
                          key={branch}
                          className={cn(
                            'text-[10px] font-extrabold px-1.5 py-0.5 rounded border shadow-xs',
                            getBranchBadgeStyle(branch)
                          )}
                        >
                          {branch}
                        </span>
                      ))}
                    </div>

                    {/* Dynamic Duration Pricing Grid */}
                    <div className="mb-4 bg-navy-50/70 p-3 rounded-2xl border border-navy-200/70 space-y-1.5">
                      <div className="text-[10px] font-bold text-navy-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Duration Fee Structure ({durationTiers.length} Tiers)</span>
                        <Icon name="clock" size={12} className="text-brand-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {durationTiers.map((tier) => {
                          const price = prog.tierPrices[tier.days] || 0;
                          return (
                            <div key={tier.id} className="bg-white p-2 rounded-xl border border-navy-100 flex items-center justify-between">
                              <span className="text-navy-500 font-medium truncate">{tier.name}</span>
                              <span className="font-extrabold text-navy-900 shrink-0 ml-1">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Enrolled & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-navy-100 mt-2">
                    <span className="text-xs text-navy-500 font-medium">
                      <span className="font-bold text-navy-800">{enrolledCount}</span> students enrolled
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(prog)}
                        className="btn-ghost text-xs flex items-center gap-1 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
                      >
                        <Icon name="edit" size={13} /> Edit Fees
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(prog)}
                        className="btn-ghost text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Icon name="trash" size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Row / Table View */
          <div className="overflow-x-auto rounded-2xl border border-navy-200/90 bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-navy-200 bg-navy-50/70 text-navy-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Course Name</th>
                  <th className="py-3 px-4">Applicable Branches</th>
                  <th className="py-3 px-4">Course Type</th>
                  {durationTiers.map((tier) => (
                    <th key={tier.id} className="py-3 px-3 text-right whitespace-nowrap">
                      {tier.name}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {filteredPrograms.map((prog) => {
                  const enrolledCount = members.filter((m) =>
                    (m.membership || '').toLowerCase().includes(prog.name.toLowerCase())
                  ).length;

                  return (
                    <tr key={prog.id} className="hover:bg-navy-50/50 transition group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-xs shrink-0',
                              prog.color
                            )}
                          >
                            <Icon name={prog.isCombo ? 'award' : 'book-open'} size={16} />
                          </div>
                          <div>
                            <div className="font-extrabold text-navy-900 group-hover:text-brand-600 transition">
                              {prog.name}
                            </div>
                            {prog.features && prog.features.length > 0 && (
                              <div className="text-[10px] text-navy-400 line-clamp-1 max-w-xs">
                                {prog.features.join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Applicable Branches Multi-Badges */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {prog.categories.map((branch) => (
                            <span
                              key={branch}
                              className={cn(
                                'text-[10px] font-extrabold px-1.5 py-0.5 rounded border shadow-xs',
                                getBranchBadgeStyle(branch)
                              )}
                            >
                              {branch}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Course Type / Classification */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold text-navy-700 bg-navy-100/70 border border-navy-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {prog.classification || 'Core Subject'}
                        </span>
                      </td>

                      {durationTiers.map((tier) => {
                        const price = prog.tierPrices[tier.days] || 0;
                        return (
                          <td key={tier.id} className="py-3 px-3 text-right">
                            {price > 0 ? (
                              <span className="font-extrabold text-navy-900 font-mono">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-navy-300 font-mono">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold text-[11px] border border-navy-200/60">
                          <Icon name="users" size={11} className="text-navy-400" />
                          {enrolledCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(prog)}
                            className="p-1.5 rounded-lg hover:bg-brand-50 text-navy-500 hover:text-brand-600 border border-navy-200/70 hover:border-brand-300 transition cursor-pointer shadow-xs"
                            title="Edit Course & Fee Structure"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProgram(prog)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 border border-rose-200 hover:border-rose-400 transition cursor-pointer shadow-xs"
                            title="Delete Course"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course & Multi-Branch Pricing Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                  <Icon name="book-open" size={18} className="text-brand-600" />
                  <span>{editingProgramId ? 'Edit Course & Fee Structure' : 'Add New Course / Subject'}</span>
                </h3>
                <p className="text-xs text-navy-400">Configure subject details, branches (CSE, EEE, ECE, etc.), and fee tiers.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-navy-400 hover:text-navy-600 p-1 cursor-pointer">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              {/* Course Name & Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-navy-700">Course / Subject Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Python Programming, Data Structures"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                    className="input-field text-xs py-2 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-navy-700">Course Type / Classification</label>
                    <button
                      type="button"
                      onClick={() => setClassificationManagerOpen(true)}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Icon name="plus" size={10} /> Manage Types
                    </button>
                  </div>
                  <select
                    value={programForm.classification}
                    onChange={(e) => setProgramForm({ ...programForm, classification: e.target.value })}
                    className="input-field text-xs py-2 font-bold"
                  >
                    {classifications.map((c) => (
                      <option key={c.id || c.value} value={c.value}>
                        {c.label || c.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Branch / Category Assignment */}
              <div className="p-3.5 bg-navy-50/60 rounded-2xl border border-navy-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="layers" size={13} className="text-purple-600" />
                    <span>Applicable Branches / Departments</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllBranches}
                      className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer"
                    >
                      {categories.every((c) => programForm.selectedCategories.includes(c.code))
                        ? 'Deselect All'
                        : 'Select All Branches'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Icon name="plus" size={10} /> + New Branch
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => {
                    const isSelected = programForm.selectedCategories.includes(cat.code);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleBranchSelection(cat.code)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs scale-[1.02]'
                            : 'bg-white text-navy-700 border-navy-200 hover:border-purple-300'
                        )}
                      >
                        <Icon name={isSelected ? 'check' : 'plus'} size={12} />
                        <span>{cat.code}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-navy-400">
                  {programForm.selectedCategories.length === 0
                    ? '⚠️ Please select at least one branch for this course.'
                    : `Active in ${programForm.selectedCategories.length} branch(es): ${programForm.selectedCategories.join(', ')}`}
                </p>
              </div>

              {/* Dynamic Duration Tier Pricing Matrix */}
              <div className="card p-3.5 bg-gradient-to-br from-navy-50 via-white to-brand-50/40 border border-navy-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="credit-card" size={13} className="text-brand-600" />
                    <span>Duration Tier Fee Structure (₹)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddTier(!showQuickAddTier)}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="plus" size={11} /> + Add Duration Tier
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoCalculatePrices}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Icon name="refresh-cw" size={11} /> Auto-Calculate Multipliers
                    </button>
                  </div>
                </div>

                {/* Inline Quick Tier Add form */}
                {showQuickAddTier && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs animate-fade-in">
                    <div className="flex items-center justify-between font-bold text-purple-900">
                      <span>Add New Duration Tier (Months / Years / Semesters)</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddTier(false)}
                        className="text-navy-400 hover:text-navy-600 cursor-pointer"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Duration Count"
                        value={quickTierCount}
                        onChange={(e) => setQuickTierCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white font-bold"
                      />
                      <select
                        value={quickTierUnit}
                        onChange={(e) => setQuickTierUnit(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white font-bold"
                      >
                        <option value="months">Month(s)</option>
                        <option value="years">Year(s)</option>
                        <option value="semesters">Semester(s) [6M]</option>
                        <option value="days">Day(s)</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Label (e.g. 2 Years)"
                        value={quickTierName}
                        onChange={(e) => setQuickTierName(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickAddTier}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Insert Duration Tier
                    </button>
                  </div>
                )}

                {/* Tier Price Inputs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {durationTiers.map((tier) => (
                    <div key={tier.id} className="relative group bg-white p-2.5 rounded-xl border border-navy-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-navy-800 truncate" title={tier.name}>
                          {tier.name}
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-mono text-navy-400 font-bold bg-navy-50 px-1 rounded">
                            {tier.suffix || `${tier.days}D`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(tier.days, tier.name)}
                            className="text-navy-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                            title="Delete Tier"
                          >
                            <Icon name="x" size={11} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        value={programForm.tierPrices[tier.days] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProgramForm({
                            ...programForm,
                            tierPrices: {
                              ...programForm.tierPrices,
                              [tier.days]: val,
                            },
                          });
                        }}
                        className="input-field text-xs py-1.5 font-bold text-navy-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1 block">Course Syllabus &amp; Highlights (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Lab Access, Practical Workshop, Semester Project"
                  value={programForm.features}
                  onChange={(e) => setProgramForm({ ...programForm, features: e.target.value })}
                  className="input-field text-xs py-2"
                />
              </div>

              {/* Color Theme */}
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1 block">Card Color Theme</label>
                <select
                  value={programForm.color}
                  onChange={(e) => setProgramForm({ ...programForm, color: e.target.value })}
                  className="input-field text-xs py-2"
                >
                  <option value="from-blue-600 to-indigo-700">Blue / Indigo</option>
                  <option value="from-emerald-500 to-teal-600">Emerald / Teal</option>
                  <option value="from-purple-500 to-violet-600">Purple / Violet</option>
                  <option value="from-rose-500 to-pink-600">Rose / Pink</option>
                  <option value="from-amber-500 to-orange-600">Amber / Orange</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-navy-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs cursor-pointer">
                  {editingProgramId ? 'Save Fee Changes' : 'Save & Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Duration Tiers Manager Modal (Add, Edit, Delete Tiers) */}
      {tierManagerOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="clock" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">Manage Duration Tiers</h3>
                  <p className="text-xs text-navy-500">Configure customizable months, years, semesters, and day durations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTierManagerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTierFromManager} className="bg-navy-50/70 p-4 rounded-2xl border border-navy-100 space-y-3 shrink-0 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy-900">
                  {editingTier ? `Editing: ${editingTier.name}` : 'Add New Duration Tier'}
                </span>
                {editingTier && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTier(null);
                      setTierForm({ name: '', unitCount: 1, unitType: 'months', multiplier: 1.0 });
                    }}
                    className="text-[11px] font-bold text-navy-500 hover:text-navy-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Duration Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierForm.unitCount}
                    onChange={(e) => setTierForm({ ...tierForm, unitCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Time Unit</label>
                  <select
                    value={tierForm.unitType}
                    onChange={(e) => setTierForm({ ...tierForm, unitType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-bold"
                  >
                    <option value="months">Months (30D per mo)</option>
                    <option value="years">Years (365D per yr)</option>
                    <option value="semesters">Semesters (180D)</option>
                    <option value="days">Custom Days</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-navy-700">Multiplier Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="1.0"
                    value={tierForm.multiplier}
                    onChange={(e) => setTierForm({ ...tierForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy-700">Tier Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2 Years (B.Tech Course), 1 Semester"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {editingTier ? 'Update Duration Tier' : 'Add Duration Tier'}
                </button>
              </div>
            </form>

            {/* List of Duration Tiers */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              <div className="text-xs font-bold text-navy-700 mb-1">Configured Duration Tiers ({durationTiers.length})</div>
              <div className="divide-y divide-navy-100 border border-navy-100 rounded-2xl overflow-hidden">
                {durationTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="p-3 bg-white hover:bg-navy-50/50 flex items-center justify-between gap-3 text-xs transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
                        {tier.days} Days
                      </span>
                      <div>
                        <div className="font-extrabold text-navy-900">{tier.name}</div>
                        <div className="text-[11px] text-navy-500">
                          Multiplier: <strong className="text-purple-700">{tier.multiplier}x</strong> base rate
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditTier(tier)}
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-navy-400 hover:text-purple-600 transition cursor-pointer"
                        title="Edit Tier"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTierFromManager(tier.id, tier.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-navy-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Tier"
                      >
                        <Icon name="trash-2" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-navy-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setTierManagerOpen(false)}
                className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Branch / Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Icon name="layers" size={16} />
                </div>
                <h3 className="font-extrabold text-navy-900 text-sm">Add Branch / Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-navy-400 hover:text-navy-600"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-navy-700">Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & DS, EEE, ECE, CSE"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-navy-700">Branch Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-navy-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-navy-200 text-navy-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Medium of Instruction / Languages Manager Modal */}
      {languageManagerOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
                  <Icon name="globe" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">Mediums of Instruction / Languages</h3>
                  <p className="text-xs text-navy-500">Configure languages available in student admission forms</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Add New Language Form */}
            <form onSubmit={handleAddLanguage} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Add new language (e.g. Sanskrit, Tamil, French)..."
                value={newLanguageInput}
                onChange={(e) => setNewLanguageInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!newLanguageInput.trim() || langLoading}
                className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-4 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Icon name="plus" size={14} />
                <span>Add Medium</span>
              </button>
            </form>

            {/* Languages List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                Configured Languages ({languages.length})
              </div>
              {languages.length === 0 ? (
                <div className="text-center py-6 text-xs text-navy-400 italic bg-navy-50/50 rounded-2xl border border-dashed border-navy-200">
                  No languages configured. Add one above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <div
                      key={lang}
                      className="flex items-center justify-between p-3 rounded-xl border border-navy-100 bg-navy-50/60 hover:bg-navy-50 transition shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="globe" size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-navy-800">{lang}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteLanguage(lang)}
                        className="text-navy-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                        title={`Delete ${lang}`}
                      >
                        <Icon name="trash-2" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-navy-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(false)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Type / Classification Manager Modal (Add, Edit, Delete) */}
      {classificationManagerOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-navy-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-xs">
                  <Icon name="tag" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-navy-900">Manage Course Classifications</h3>
                  <p className="text-xs text-navy-500">Add, edit, or delete course types and classifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClassificationManagerOpen(false);
                  setEditingClassification(null);
                  setNewClassValue('');
                  setNewClassLabel('');
                }}
                className="w-8 h-8 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-400 hover:text-navy-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Add / Edit Form */}
            <form onSubmit={handleAddClassification} className="bg-navy-50/70 p-4 rounded-2xl border border-navy-100 space-y-2.5 shrink-0 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy-900">
                  {editingClassification ? `Editing: ${editingClassification.label || editingClassification.value}` : 'Add New Classification'}
                </span>
                {editingClassification && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClassification(null);
                      setNewClassValue('');
                      setNewClassLabel('');
                    }}
                    className="text-[11px] font-bold text-navy-500 hover:text-navy-700 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-navy-600 uppercase mb-1 block">Short Code / Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Honors Degree"
                    value={newClassValue}
                    onChange={(e) => setNewClassValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-navy-600 uppercase mb-1 block">Display Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Honors & Research Track"
                    value={newClassLabel}
                    onChange={(e) => setNewClassLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!newClassValue.trim() || classLoading}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Icon name={editingClassification ? 'check' : 'plus'} size={14} />
                <span>{editingClassification ? 'Update Classification' : 'Add Classification'}</span>
              </button>
            </form>

            {/* Classifications List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-[11px] font-bold text-navy-400 uppercase tracking-wider">
                Configured Classifications ({classifications.length})
              </div>
              <div className="space-y-2">
                {classifications.map((item) => (
                  <div
                    key={item.id || item.value}
                    className="flex items-center justify-between p-3 rounded-xl border border-navy-100 bg-navy-50/60 hover:bg-navy-50 transition shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-navy-900 text-xs">{item.label}</div>
                      <div className="text-[10px] text-navy-400 font-mono">Value: {item.value}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditClassification(item)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-navy-500 hover:text-brand-600 transition cursor-pointer"
                        title="Edit Classification"
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClassification(item)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                        title="Delete Classification"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-navy-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setClassificationManagerOpen(false);
                  setEditingClassification(null);
                  setNewClassValue('');
                  setNewClassLabel('');
                }}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
