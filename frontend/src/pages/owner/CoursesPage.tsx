import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { apiClient } from '@/services/apiClient';
import { HrmsImportExportControls } from '@/components/hrms/HrmsImportExportControls';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';

export interface DurationTierConfig {
  id: string;
  name: string;
  days: number;
  multiplier: number;
  suffix: string;
}

export interface MediumRecord {
  id: string;
  name: string;
  is_active: boolean;
}

export interface CourseItem {
  id: string;
  name: string;
  code: string;
  duration: string;
  duration_days?: number;
  price: number;
  description?: string;
  is_active: boolean;
}

export interface MembershipPlanItem {
  id?: string;
  owner_id?: string;
  branch_id?: string;
  name: string;
  category?: string;
  badge?: string;
  code?: string;
  price: number;
  duration_days?: number;
  period?: string;
  description?: string;
  features?: string[];
  is_active?: boolean;
}

const STORAGE_TIERS_KEY = 'course_duration_tiers_v3';

export function CoursesPage({ embedded = false }: { embedded?: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'courses' | 'durations' | 'mediums'>('courses');
  const [members, setMembers] = useState<Member[]>([]);
  const [rawPlans, setRawPlans] = useState<MembershipPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [courseSearch, setCourseSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchMedium, setSearchMedium] = useState('');

  // Course Add/Edit Modal
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    duration: '',
    price: '',
    description: '',
    is_active: true,
  });

  // Duration Tiers State (Stored in database via /courses/durations API)
  const [durationTiers, setDurationTiers] = useState<DurationTierConfig[]>([]);

  const [tierManagerOpen, setTierManagerOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<DurationTierConfig | null>(null);
  const [tierForm, setTierForm] = useState({
    name: '',
    unitCount: 1,
    unitType: 'years' as 'days' | 'months' | 'years' | 'semesters',
    multiplier: 1.0,
  });

  // Multi-selection states for bulk checkbox deletion
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [selectedTierIds, setSelectedTierIds] = useState<Set<string>>(new Set());
  const [selectedMediumIds, setSelectedMediumIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Mediums State
  const [languages, setLanguages] = useState<string[]>([]);
  const [mediumRecords, setMediumRecords] = useState<MediumRecord[]>([]);
  const [languageManagerOpen, setLanguageManagerOpen] = useState(false);
  const [newLanguageInput, setNewLanguageInput] = useState('');
  const [editingMediumId, setEditingMediumId] = useState<string | null>(null);
  const [editingMediumName, setEditingMediumName] = useState('');
  const [langLoading, setLangLoading] = useState(false);

  const fetchDurationTiers = async () => {
    try {
      const res = await apiClient.get<DurationTierConfig[]>('/courses/durations');
      if (Array.isArray(res)) {
        const sorted = [...res].sort((a, b) => a.days - b.days);
        setDurationTiers(sorted);
      }
    } catch (e) {
      console.error('Failed to load duration tiers from database', e);
    }
  };

  const fetchMediumRecords = async () => {
    try {
      const recs = await apiClient.get<MediumRecord[]>('/courses/languages/records');
      if (Array.isArray(recs) && recs.length > 0) {
        setMediumRecords(recs);
        setLanguages(recs.filter((r) => r.is_active).map((r) => r.name));
        return;
      }
    } catch { }
    try {
      const stringLangs = await apiClient.get<string[]>('/courses/languages');
      if (Array.isArray(stringLangs) && stringLangs.length > 0) {
        setLanguages(stringLangs);
        setMediumRecords(stringLangs.map((name) => ({ id: name, name, is_active: true })));
      }
    } catch { }
  };

  const fetchPlansAndMembers = async () => {
    setLoading(true);
    try {
      const [membersRes, plansRes, langsRes, langRecordsRes, tiersRes] = await Promise.all([
        api.students.list().catch(() => []),
        apiClient.get<MembershipPlanItem[]>('/courses/plans').catch(() => []),
        apiClient.get<string[]>('/courses/languages').catch(() => []),
        apiClient.get<MediumRecord[]>('/courses/languages/records').catch(() => []),
        apiClient.get<DurationTierConfig[]>('/courses/durations').catch(() => []),
      ]);

      const fetchedMembers = Array.isArray(membersRes) ? membersRes : [];
      const fetchedPlans = Array.isArray(plansRes) ? plansRes : [];
      const fetchedLangs = Array.isArray(langsRes) ? langsRes : [];
      const fetchedLangRecords = Array.isArray(langRecordsRes) ? langRecordsRes : [];
      const fetchedTiers = Array.isArray(tiersRes) ? tiersRes : [];

      setMembers(fetchedMembers);
      setRawPlans(fetchedPlans);
      setLanguages(fetchedLangs);

      if (fetchedLangRecords.length > 0) {
        setMediumRecords(fetchedLangRecords);
      } else if (fetchedLangs.length > 0) {
        setMediumRecords(fetchedLangs.map((name) => ({ id: name, name, is_active: true })));
      }

      if (fetchedTiers.length > 0) {
        const sorted = [...fetchedTiers].sort((a, b) => a.days - b.days);
        setDurationTiers(sorted);
      } else {
        // Dynamically derive from existing course plans if no custom tiers created yet
        const seenPeriods = new Set<string>();
        const discovered: DurationTierConfig[] = [];
        fetchedPlans.forEach((p) => {
          const per = (p.period || '').trim();
          if (per && !seenPeriods.has(per.toLowerCase())) {
            seenPeriods.add(per.toLowerCase());
            const days = p.duration_days || 0;
            discovered.push({
              id: `tier_${discovered.length + 1}`,
              name: per,
              days: days,
              multiplier: 1.0,
              suffix: per.replace(/\s+/g, '').toUpperCase(),
            });
          }
        });
        if (discovered.length > 0) {
          setDurationTiers(discovered);
        }
      }

      // Sync into shared master storage for student enrollment modals
      try {
        const mappedCourses = fetchedPlans.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          code: (p.code || p.badge || p.category || '').trim(),
          category: (p.code || p.badge || p.category || '').trim(),
          period: (p.period || (p.duration_days ? `${Math.round(p.duration_days / 365)} Years` : '')).trim(),
          price: p.price,
          duration_days: p.duration_days,
          is_active: p.is_active !== false,
        }));
        localStorage.setItem('vahd_cached_courses_v1', JSON.stringify(mappedCourses));
        if (fetchedLangs.length > 0) {
          localStorage.setItem('vahd_cached_languages_v1', JSON.stringify(fetchedLangs));
        }
        window.dispatchEvent(new Event('vahd_courses_updated'));
        window.dispatchEvent(new Event('vahd_master_data_updated'));
      } catch { }
    } catch (e) {
      console.error('Failed to load courses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndMembers();
  }, []);

  // Map rawPlans to clean CourseItem list with zero hardcoded mock values
  const coursesList: CourseItem[] = rawPlans.map((p: any) => {
    const rawCat = (p.code || p.badge || p.category || '').trim();
    const period = (p.period || (p.duration_days ? (p.duration_days >= 365 ? `${Math.round(p.duration_days / 365)} Year${Math.round(p.duration_days / 365) > 1 ? 's' : ''}` : `${Math.round(p.duration_days / 30)} Month${Math.round(p.duration_days / 30) > 1 ? 's' : ''}`) : '')).trim();
    return {
      id: p.id,
      name: p.name || '',
      code: rawCat,
      duration: period,
      duration_days: p.duration_days,
      price: Number(p.price) || 0,
      description: p.description || '',
      is_active: p.is_active !== false,
    };
  });

  const displayedCourses = coursesList
    .filter((c) => {
      if (statusFilter === 'active') return c.is_active;
      if (statusFilter === 'inactive') return !c.is_active;
      return true;
    })
    .filter((c) =>
      c.name.toLowerCase().includes(courseSearch.toLowerCase().trim()) ||
      c.code.toLowerCase().includes(courseSearch.toLowerCase().trim())
    );

  const activeCount = members.filter((m) => m.status === 'active' || m.status === 'vip').length;
  const totalRevenue = members.reduce((acc, m) => {
    const val = parseInt(String(m.revenue || '').replace(/[^0-9]/g, ''), 10);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Course handlers
  const openCreateModal = () => {
    setEditingCourseId(null);
    setCourseForm({
      name: '',
      code: '',
      duration: durationTiers[0]?.name || '',
      price: '',
      description: '',
      is_active: true,
    });
    setCourseModalOpen(true);
  };

  const handleEditCourse = (course: CourseItem) => {
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name,
      code: course.code,
      duration: course.duration,
      price: course.price ? String(course.price) : '',
      description: course.description || '',
      is_active: course.is_active,
    });
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.name.trim()) return;

    // Dynamically calculate days from duration text or matched tier (no hardcoded tier mappings)
    const matchedTier = durationTiers.find(
      (t) => t.name.toLowerCase() === courseForm.duration.trim().toLowerCase()
    );
    let days = matchedTier?.days;
    if (!days) {
      const match = courseForm.duration.match(/\d+/);
      const count = match ? parseInt(match[0], 10) : 0;
      const durLower = courseForm.duration.toLowerCase();
      if (durLower.includes('month')) {
        days = count * 30;
      } else if (durLower.includes('sem')) {
        days = count * 180;
      } else if (durLower.includes('day')) {
        days = count;
      } else if (count > 0) {
        days = count * 365;
      } else {
        days = 0;
      }
    }

    const cleanCode = courseForm.code.trim().toUpperCase();
    const payload = {
      name: courseForm.name.trim(),
      category: cleanCode,
      badge: cleanCode,
      code: cleanCode,
      period: courseForm.duration.trim(),
      duration_days: days,
      price: Number(courseForm.price) || 0,
      description: courseForm.description.trim(),
      is_active: courseForm.is_active,
    };

    try {
      if (editingCourseId) {
        await apiClient.put(`/courses/plans/${editingCourseId}`, payload);
      } else {
        await apiClient.post('/courses/plans', payload);
      }
      setCourseModalOpen(false);
      await fetchPlansAndMembers();
    } catch (err) {
      console.error('Failed to save course', err);
    }
  };

  const handleDeleteCourse = async (course: CourseItem) => {
    if (!confirm(`Are you sure you want to delete course "${course.name}" (${course.code})?`)) return;
    try {
      await apiClient.delete(`/courses/plans/${course.id}`);
      await fetchPlansAndMembers();
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const handleToggleCourseStatus = async (course: CourseItem) => {
    const newStatus = !course.is_active;
    try {
      await apiClient.put(`/courses/plans/${course.id}`, { ...course, is_active: newStatus });
      await fetchPlansAndMembers();
    } catch (err) {
      console.error('Failed to toggle course status', err);
    }
  };

  // Course bulk selection handlers
  const toggleSelectCourse = (id: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllCourses = () => {
    if (selectedCourseIds.size === displayedCourses.length && displayedCourses.length > 0) {
      setSelectedCourseIds(new Set());
    } else {
      setSelectedCourseIds(new Set(displayedCourses.map((c) => c.id)));
    }
  };

  const handleBulkDeleteCourses = async () => {
    if (selectedCourseIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedCourseIds.size} selected course(s)?`)) return;
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedCourseIds);
      await Promise.all(
        idsToDelete.map((id) => apiClient.delete(`/courses/plans/${id}`).catch((e) => console.error(e)))
      );
      setSelectedCourseIds(new Set());
      await fetchPlansAndMembers();
    } catch (err) {
      console.error('Failed to bulk delete courses', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Duration Tier bulk selection handlers
  const toggleSelectTier = (id: string) => {
    setSelectedTierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllTiers = () => {
    if (selectedTierIds.size === durationTiers.length && durationTiers.length > 0) {
      setSelectedTierIds(new Set());
    } else {
      setSelectedTierIds(new Set(durationTiers.map((t) => t.id)));
    }
  };

  const handleBulkDeleteTiers = async () => {
    if (selectedTierIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTierIds.size} selected duration tier(s)?`)) return;
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedTierIds);
      await Promise.all(
        idsToDelete.map((id) => apiClient.delete(`/courses/durations/${id}`).catch((e) => console.error(e)))
      );
      setSelectedTierIds(new Set());
      await fetchDurationTiers();
    } catch (err) {
      console.error('Failed to bulk delete duration tiers', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Medium bulk selection handlers
  const toggleSelectMedium = (id: string) => {
    setSelectedMediumIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllMediums = () => {
    if (selectedMediumIds.size === displayedMediums.length && displayedMediums.length > 0) {
      setSelectedMediumIds(new Set());
    } else {
      setSelectedMediumIds(new Set(displayedMediums.map((m) => m.id)));
    }
  };

  const handleBulkDeleteMediums = async () => {
    if (selectedMediumIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMediumIds.size} selected medium(s)?`)) return;
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedMediumIds);
      await Promise.all(
        idsToDelete.map((id) => apiClient.delete(`/courses/languages/${encodeURIComponent(id)}`).catch((e) => console.error(e)))
      );
      setSelectedMediumIds(new Set());
      await fetchMediumRecords();
    } catch (err) {
      console.error('Failed to bulk delete mediums', err);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Duration Tier handlers
  const handleOpenTierManager = () => {
    setEditingTier(null);
    setTierForm({ name: '', unitCount: 1, unitType: 'years', multiplier: 1.0 });
    setTierManagerOpen(true);
  };

  const handleEditTier = (tier: DurationTierConfig) => {
    setEditingTier(tier);
    let unitType: 'days' | 'months' | 'years' | 'semesters' = 'days';
    let unitCount = tier.days;

    if (tier.days > 0 && tier.days % 365 === 0) {
      unitType = 'years';
      unitCount = tier.days / 365;
    } else if (tier.days > 0 && tier.days % 180 === 0 && tier.name.toLowerCase().includes('sem')) {
      unitType = 'semesters';
      unitCount = tier.days / 180;
    } else if (tier.days > 0 && tier.days % 30 === 0) {
      unitType = 'months';
      unitCount = tier.days / 30;
    }

    setTierForm({
      name: tier.name,
      unitCount,
      unitType,
      multiplier: tier.multiplier,
    });
    setTierManagerOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    let calculatedDays = tierForm.unitCount;
    let autoSuffix = `${tierForm.unitCount}D`;
    let defaultLabel = `${tierForm.unitCount} Days`;

    if (tierForm.unitType === 'months') {
      calculatedDays = tierForm.unitCount * 30;
      autoSuffix = `${tierForm.unitCount}M`;
      defaultLabel = `${tierForm.unitCount} Month${tierForm.unitCount > 1 ? 's' : ''}`;
    } else if (tierForm.unitType === 'years') {
      calculatedDays = tierForm.unitCount * 365;
      autoSuffix = `${tierForm.unitCount}Y`;
      defaultLabel = `${tierForm.unitCount} Year${tierForm.unitCount > 1 ? 's' : ''}`;
    } else if (tierForm.unitType === 'semesters') {
      calculatedDays = tierForm.unitCount * 180;
      autoSuffix = `${tierForm.unitCount}SEM`;
      defaultLabel = `${tierForm.unitCount} Semester${tierForm.unitCount > 1 ? 's' : ''}`;
    }

    const tierName = tierForm.name.trim() || defaultLabel;
    const tierPayload = {
      name: tierName,
      days: calculatedDays,
      unitCount: tierForm.unitCount,
      unitType: tierForm.unitType,
      multiplier: tierForm.multiplier,
      suffix: autoSuffix,
    };

    try {
      if (editingTier) {
        await apiClient.put(`/courses/durations/${editingTier.id}`, tierPayload);
      } else {
        await apiClient.post('/courses/durations', tierPayload);
      }
      await fetchDurationTiers();
    } catch (err) {
      console.error('Failed to save duration tier to database', err);
    }

    setTierManagerOpen(false);
  };

  const handleDeleteTier = async (tierId: string, tierName: string) => {
    if (!confirm(`Are you sure you want to remove the "${tierName}" duration tier?`)) return;
    try {
      await apiClient.delete(`/courses/durations/${tierId}`);
      await fetchDurationTiers();
    } catch (err) {
      console.error('Failed to delete duration tier from database', err);
    }
  };

  // Medium handlers
  const displayedMediums: MediumRecord[] = (
    mediumRecords.length > 0
      ? mediumRecords
      : languages.map((l) => ({ id: l, name: l, is_active: true }))
  ).filter((m) => m.name.toLowerCase().includes(searchMedium.toLowerCase().trim()));

  const handleToggleMediumStatus = async (med: MediumRecord) => {
    const newStatus = !med.is_active;
    setMediumRecords((prev) => prev.map((m) => (m.id === med.id ? { ...m, is_active: newStatus } : m)));
    try {
      await apiClient.put(`/courses/languages/${encodeURIComponent(med.id)}`, { is_active: newStatus });
      setLanguages((prev) => (newStatus ? [...prev, med.name] : prev.filter((n) => n !== med.name)));
    } catch (err) {
      console.error('Failed to toggle medium status', err);
      setMediumRecords((prev) => prev.map((m) => (m.id === med.id ? { ...m, is_active: med.is_active } : m)));
    }
  };

  const handleStartEditMedium = (med: MediumRecord) => {
    setEditingMediumId(med.id);
    setEditingMediumName(med.name);
  };

  const handleSaveEditMedium = async (med: MediumRecord) => {
    const clean = editingMediumName.trim();
    if (!clean || clean === med.name) {
      setEditingMediumId(null);
      return;
    }
    try {
      await apiClient.put(`/courses/languages/${encodeURIComponent(med.id)}`, { name: clean });
      setMediumRecords((prev) => prev.map((m) => (m.id === med.id ? { ...m, name: clean } : m)));
      setLanguages((prev) => prev.map((n) => (n === med.name ? clean : n)));
      setEditingMediumId(null);
    } catch (err) {
      console.error('Failed to update medium name', err);
    }
  };

  const handleDeleteMediumRecord = async (med: MediumRecord) => {
    if (!confirm(`Are you sure you want to delete "${med.name}"?`)) return;
    try {
      await apiClient.delete(`/courses/languages/${encodeURIComponent(med.id)}`);
      setMediumRecords((prev) => prev.filter((m) => m.id !== med.id));
      setLanguages((prev) => prev.filter((n) => n !== med.name));
    } catch (err) {
      console.error('Failed to delete medium', err);
    }
  };

  const handleAddMediumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newLanguageInput.trim();
    if (!clean) return;
    setLangLoading(true);
    try {
      await apiClient.post('/courses/languages', { name: clean });
      await fetchMediumRecords();
      setNewLanguageInput('');
    } catch (err) {
      console.error('Failed to add medium', err);
    } finally {
      setLangLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* ── HEADER ── */}
      {embedded ? (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Icon name="book-open" size={22} className="text-brand-600" />
              <span>Course &amp; Medium</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage course degree programs, duration tiers, and instruction mediums
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pb-1 sm:pb-0">
            {activeSubTab === 'courses' && (
              <div className="flex items-center gap-2 shrink-0">
                <HrmsImportExportControls
                  type="courses"
                  className="shrink-0"
                  dataToExport={coursesList}
                  onImportSuccess={fetchPlansAndMembers}
                />
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
                >
                  <Icon name="plus" size={15} />
                  <span>Add Course / Program</span>
                </button>
              </div>
            )}

            {activeSubTab === 'durations' && (
              <button
                type="button"
                onClick={handleOpenTierManager}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Icon name="plus" size={15} />
                <span>Add Duration Tier</span>
              </button>
            )}

            {activeSubTab === 'mediums' && (
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Icon name="plus" size={15} />
                <span>Add Medium</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <PageHeader
          title="Course & Medium"
          breadcrumb={['Home', 'Settings', 'Course & Medium']}
          actions={
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pb-1 sm:pb-0">
              {activeSubTab === 'courses' && (
                <div className="flex items-center gap-2 shrink-0">
                  <HrmsImportExportControls
                    type="courses"
                    className="shrink-0"
                    dataToExport={coursesList}
                    onImportSuccess={fetchPlansAndMembers}
                  />
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
                  >
                    <Icon name="plus" size={15} />
                    <span>Add Course / Program</span>
                  </button>
                </div>
              )}

              {activeSubTab === 'durations' && (
                <button
                  type="button"
                  onClick={handleOpenTierManager}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
                >
                  <Icon name="plus" size={15} />
                  <span>Add Duration Tier</span>
                </button>
              )}

              {activeSubTab === 'mediums' && (
                <button
                  type="button"
                  onClick={() => setLanguageManagerOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
                >
                  <Icon name="plus" size={15} />
                  <span>Add Medium</span>
                </button>
              )}
            </div>
          }
        />
      )}

      {/* ── 3 PRIMARY TABS: COURSES, DURATIONS, MEDIUMS ── */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('courses')}
          className={cn(
            'px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs',
            activeSubTab === 'courses'
              ? 'bg-brand-600 text-white shadow-brand-500/20 shadow-md ring-2 ring-brand-500/30'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
          )}
        >
          <Icon name="book-open" size={16} className={activeSubTab === 'courses' ? 'text-white' : 'text-brand-600'} />
          <span>Courses &amp; Degree Programs</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black',
              activeSubTab === 'courses' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            )}
          >
            {coursesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('durations')}
          className={cn(
            'px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs',
            activeSubTab === 'durations'
              ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-md ring-2 ring-amber-500/30'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
          )}
        >
          <Icon name="clock" size={16} className={activeSubTab === 'durations' ? 'text-white' : 'text-amber-600'} />
          <span>Course Durations</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black',
              activeSubTab === 'durations' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            )}
          >
            {durationTiers.length} Tiers
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mediums')}
          className={cn(
            'px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs',
            activeSubTab === 'mediums'
              ? 'bg-blue-600 text-white shadow-blue-500/20 shadow-md ring-2 ring-blue-500/30'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
          )}
        >
          <Icon name="globe" size={16} className={activeSubTab === 'mediums' ? 'text-white' : 'text-blue-600'} />
          <span>Medium of Instruction</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-black',
              activeSubTab === 'mediums' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            )}
          >
            {mediumRecords.length || languages.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: COURSES & DEGREE PROGRAMS ── */}
      {activeSubTab === 'courses' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label text-slate-500 font-bold text-xs">Total Courses</span>
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                    <Icon name="book-open" size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{coursesList.length}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Configured degree programs</div>
              </div>

              <div className="card p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label text-slate-500 font-bold text-xs">Active Courses</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Icon name="check-circle" size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {coursesList.filter((c) => c.is_active).length}
                </div>
                <div className="text-xs text-emerald-600 mt-1 font-semibold">Available in admissions</div>
              </div>

              <div className="card p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label text-slate-500 font-bold text-xs">Enrolled Students</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Icon name="users" size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{activeCount}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Live active students</div>
              </div>

              <div className="card p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-label text-slate-500 font-bold text-xs">Total Fee Revenue</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Icon name="indian-rupee" size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">Aggregated course fees</div>
              </div>
            </div>
          )}

          {/* Courses List Table Card */}
          <div className="card p-5 space-y-4 border border-slate-200/90 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Icon name="book-open" size={18} className="text-brand-600" />
                  <span>Available Courses &amp; Degree Programs</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Degree, diploma, and certification courses with name, code, duration, and tuition fee.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Bulk Delete Selected Button */}
                {selectedCourseIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteCourses}
                    disabled={bulkDeleting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50 animate-fade-in"
                  >
                    <Icon name="trash-2" size={13} />
                    <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCourseIds.size})`}</span>
                  </button>
                )}

                {/* Status Filter Pill Buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    All ({coursesList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                      statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Active ({coursesList.filter((c) => c.is_active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('inactive')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
                      statusFilter === 'inactive' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Inactive ({coursesList.filter((c) => !c.is_active).length})
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:w-60">
                  <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search course or code..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Selection Status & Bulk Actions Bar */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={displayedCourses.length > 0 && selectedCourseIds.size === displayedCourses.length}
                  onChange={toggleSelectAllCourses}
                  className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer accent-purple-600"
                />
                <span className="text-slate-800">Select All Courses ({displayedCourses.length})</span>
              </label>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium text-[11px]">
                  {selectedCourseIds.size} of {displayedCourses.length} selected
                </span>
                {selectedCourseIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteCourses}
                    disabled={bulkDeleting}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    <Icon name="trash-2" size={13} />
                    <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedCourseIds.size})`}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Courses Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={displayedCourses.length > 0 && selectedCourseIds.size === displayedCourses.length}
                        onChange={toggleSelectAllCourses}
                        className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer accent-purple-600"
                        title="Select all courses"
                      />
                    </th>
                    <th className="py-3.5 px-3 w-10 text-center">#</th>
                    <th className="py-3.5 px-4">Course / Program Name</th>
                    <th className="py-3.5 px-4">Course Code</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Tuition Fee (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedCourses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Icon name="book-open" size={20} />
                          </div>
                          <p className="font-bold text-slate-700 text-xs">No courses found</p>
                          <p className="text-xs text-slate-400">
                            Click &ldquo;Add Course / Program&rdquo; above to register your first course.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayedCourses.map((c, idx) => (
                      <tr
                        key={c.id}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          selectedCourseIds.has(c.id) && 'bg-purple-50/50'
                        )}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.has(c.id)}
                            onChange={() => toggleSelectCourse(c.id)}
                            className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer accent-purple-600"
                          />
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block">{c.name}</span>
                            {c.description && (
                              <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-tight bg-purple-50 text-purple-700 border border-purple-200">
                            {c.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.duration ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                              <Icon name="clock" size={12} className="text-amber-600" />
                              <span>{c.duration}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                          ₹{c.price.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCourseStatus(c)}
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                              c.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                            )}
                            title={c.is_active ? 'Active in admissions (click to deactivate)' : 'Inactive (click to activate)'}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                c.is_active ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditCourse(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit course"
                            >
                              <Icon name="pencil" size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(c)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete course"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: COURSE DURATIONS SUB-PAGE ── */}
      {activeSubTab === 'durations' && (
        <div className="card p-5 space-y-5 border border-slate-200/90 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
                <Icon name="clock" size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Course Durations &amp; Interval Tiers</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                    {durationTiers.length} Configured
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage standard course durations across academic courses.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedTierIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteTiers}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50 animate-fade-in"
                >
                  <Icon name="trash-2" size={13} />
                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedTierIds.size})`}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenTierManager}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Icon name="plus" size={14} />
                <span>Add Duration Tier</span>
              </button>
            </div>
          </div>

          {/* Selection Status & Bulk Actions Bar */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={durationTiers.length > 0 && selectedTierIds.size === durationTiers.length}
                onChange={toggleSelectAllTiers}
                className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
              />
              <span className="text-slate-800">Select All Duration Tiers ({durationTiers.length})</span>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium text-[11px]">
                {selectedTierIds.size} of {durationTiers.length} selected
              </span>
              {selectedTierIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteTiers}
                  disabled={bulkDeleting}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <Icon name="trash-2" size={13} />
                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedTierIds.size})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Durations Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={durationTiers.length > 0 && selectedTierIds.size === durationTiers.length}
                      onChange={toggleSelectAllTiers}
                      className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
                      title="Select all tiers"
                    />
                  </th>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Duration Tier Name</th>
                  <th className="py-3 px-4">Total Days</th>
                  <th className="py-3 px-4">Suffix Code</th>
                  <th className="py-3 px-4">Fee Multiplier</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {durationTiers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                      No duration tiers configured. Click &ldquo;Add Duration Tier&rdquo; above.
                    </td>
                  </tr>
                ) : (
                  durationTiers.map((tier, idx) => {
                    const daysLabel =
                      tier.days >= 365
                        ? `${tier.days} Days (${Math.round(tier.days / 365)} Year${tier.days / 365 > 1 ? 's' : ''})`
                        : `${tier.days} Days (${Math.round(tier.days / 30)} Month${tier.days / 30 > 1 ? 's' : ''})`;
                    return (
                      <tr
                        key={tier.id}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          selectedTierIds.has(tier.id) && 'bg-amber-50/50'
                        )}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTierIds.has(tier.id)}
                            onChange={() => toggleSelectTier(tier.id)}
                            className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer accent-amber-600"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                              <Icon name="clock" size={13} />
                            </div>
                            <span className="font-extrabold text-slate-900">{tier.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {daysLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{tier.suffix}</td>
                        <td className="py-3 px-4 font-mono font-black text-brand-700">{tier.multiplier}x</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditTier(tier)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit duration tier"
                            >
                              <Icon name="pencil" size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTier(tier.id, tier.name)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete duration tier"
                            >
                              <Icon name="trash-2" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: MEDIUM OF INSTRUCTION SUB-PAGE ── */}
      {activeSubTab === 'mediums' && (
        <div className="card p-5 space-y-5 border border-slate-200/90 shadow-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
                <Icon name="globe" size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Mediums of Instruction &amp; Languages</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    {mediumRecords.length || languages.length} Configured
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Configure instruction mediums for student admissions and academic degrees.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedMediumIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteMediums}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50 animate-fade-in"
                >
                  <Icon name="trash-2" size={13} />
                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedMediumIds.size})`}</span>
                </button>
              )}

              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {mediumRecords.length > 0 ? mediumRecords.filter((m) => m.is_active).length : languages.length} Active in
                  Portal
                </span>
              </span>
            </div>
          </div>

          {/* Quick Add Form & Search Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/70">
            <form onSubmit={handleAddMediumSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Icon name="globe" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Add new medium..."
                  value={newLanguageInput}
                  onChange={(e) => setNewLanguageInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={!newLanguageInput.trim() || langLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Icon name="plus" size={14} />
                <span>Add Medium</span>
              </button>
            </form>

            <div className="relative shrink-0 w-full md:w-64">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search mediums..."
                value={searchMedium}
                onChange={(e) => setSearchMedium(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Selection Status & Bulk Actions Bar */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={displayedMediums.length > 0 && selectedMediumIds.size === displayedMediums.length}
                onChange={toggleSelectAllMediums}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <span className="text-slate-800">Select All Mediums ({displayedMediums.length})</span>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium text-[11px]">
                {selectedMediumIds.size} of {displayedMediums.length} selected
              </span>
              {selectedMediumIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDeleteMediums}
                  disabled={bulkDeleting}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-[0.98] disabled:opacity-50"
                >
                  <Icon name="trash-2" size={13} />
                  <span>{bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedMediumIds.size})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mediums Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayedMediums.length > 0 && selectedMediumIds.size === displayedMediums.length}
                      onChange={toggleSelectAllMediums}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      title="Select all mediums"
                    />
                  </th>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Medium / Language Name</th>
                  <th className="py-3 px-4">Short Code</th>
                  <th className="py-3 px-4">Student Admission Scope</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {displayedMediums.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                      No instruction mediums found. Use the input above to add a new medium.
                    </td>
                  </tr>
                ) : (
                  displayedMediums.map((med, idx) => {
                    const isEditing = editingMediumId === med.id;
                    const code = med.name.substring(0, 3).toUpperCase();
                    return (
                      <tr
                        key={med.id || med.name}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          selectedMediumIds.has(med.id) && 'bg-blue-50/50'
                        )}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMediumIds.has(med.id)}
                            onChange={() => toggleSelectMedium(med.id)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingMediumName}
                                onChange={(e) => setEditingMediumName(e.target.value)}
                                className="px-2.5 py-1 rounded-lg border border-brand-500 text-xs font-bold text-slate-900 w-44"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditMedium(med)}
                                className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                                title="Save"
                              >
                                <Icon name="check" size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMediumId(null)}
                                className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                title="Cancel"
                              >
                                <Icon name="x" size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                <Icon name="globe" size={13} />
                              </div>
                              <span className="font-bold text-slate-900">{med.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600 font-medium">Available in Student Admission &amp; Courses</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleMediumStatus(med)}
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                              med.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                            )}
                            title={med.is_active ? 'Active (click to deactivate)' : 'Inactive (click to activate)'}
                          >
                            <span
                              className={cn(
                                'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                med.is_active ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditMedium(med)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit name"
                            >
                              <Icon name="pencil" size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMediumRecord(med)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete medium"
                            >
                              <Icon name="trash-2" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REDESIGNED CLEAN ADD / EDIT COURSE MODAL (ZERO HARDCODED DEFAULTS) ── */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-xs">
                  <Icon name="book-open" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingCourseId ? 'Edit Course / Program' : 'Add New Course / Program'}
                  </h3>
                  <p className="text-xs text-slate-500">Enter course name, course code, duration, and tuition fee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCourseModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Course / Program Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter course name..."
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter code..."
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Course Duration *</label>
                  {durationTiers.length > 0 ? (
                    <select
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs bg-white"
                      required
                    >
                      <option value="">Select duration...</option>
                      {durationTiers.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. 4 Years, 2 Years..."
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Tuition / Course Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Enter tuition fee..."
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Description / Highlights (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Enter course description or highlights..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs resize-none"
                />
              </div>

              <div className="pt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                  <input
                    type="checkbox"
                    checked={courseForm.is_active}
                    onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
                  />
                  <span>Active in Student Admissions</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition cursor-pointer active:scale-[0.98]"
                >
                  {editingCourseId ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DURATION TIERS MODAL ── */}
      {tierManagerOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl animate-scale-in border border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Icon name="clock" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingTier ? `Edit Duration Tier: ${editingTier.name}` : 'Add Duration Tier'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure course duration interval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTierManagerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 shrink-0 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Count</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierForm.unitCount}
                    onChange={(e) => setTierForm({ ...tierForm, unitCount: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Time Unit</label>
                  <select
                    value={tierForm.unitType}
                    onChange={(e) => setTierForm({ ...tierForm, unitType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="years">Years (365D)</option>
                    <option value="months">Months (30D)</option>
                    <option value="semesters">Semesters (180D)</option>
                    <option value="days">Days</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tierForm.multiplier}
                    onChange={(e) => setTierForm({ ...tierForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tier Display Label (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-format (e.g. 4 Years)"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTierManagerOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs"
                >
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MEDIUM OF INSTRUCTION MODAL ── */}
      {languageManagerOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-xs">
                  <Icon name="globe" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Mediums of Instruction</h3>
                  <p className="text-xs text-slate-500">Add and manage teaching mediums for admissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMediumSubmit} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Add new medium..."
                value={newLanguageInput}
                onChange={(e) => setNewLanguageInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
              />
              <button
                type="submit"
                disabled={!newLanguageInput.trim() || langLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Icon name="plus" size={14} />
                <span>Add Medium</span>
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setLanguageManagerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
