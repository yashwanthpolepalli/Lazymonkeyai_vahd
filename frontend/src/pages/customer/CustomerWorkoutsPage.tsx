import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { customerApi } from '@/services/customerApi';
import { api } from '@/services/api';
import { BookGymSlotModal } from '@/components/customer/BookGymSlotModal';
import { BookingHistoryModal } from '@/components/customer/BookingHistoryModal';
import type { CustomerTodayWorkout, CustomerDashboardData } from '@/types/customer';
import { cn } from '@/utils/cn';

interface ExerciseItem {
  id: string;
  name: string;
  muscle_group?: string;
  category?: string;
  equipment?: string;
  difficulty?: string;
  mechanic?: string;
  rating?: number;
  duration?: string;
  sets?: number;
  reps?: number;
  weight_kg?: number;
  video_url?: string;
  video_type?: string;
  video_url_female?: string;
  video_url_male?: string;
  thumbnail_url?: string;
  thumbnail_url_alt?: string;
  instructions?: string[];
  form_cues?: string[];
  common_mistakes?: string[];
}

interface MuscleItem {
  id: string;
  name: string;
}

export function CustomerWorkoutsPage() {
  // Top App Header & Auth User State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Muscle Explorer State
  const [muscles, setMuscles] = useState<MuscleItem[]>([]);
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>('chest');
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [exercisesError, setExercisesError] = useState<string | null>(null);

  // Dashboard & Today's Workout Summary State
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<CustomerTodayWorkout | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Filters State
  const [equipmentFilter, setEquipmentFilter] = useState<string>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Exercise Detail Modal State
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [exerciseDetailModalOpen, setExerciseDetailModalOpen] = useState(false);
  const [exerciseDetailsData, setExerciseDetailsData] = useState<any>(null);
  const [selectedGenderMedia, setSelectedGenderMedia] = useState<'female' | 'male'>('male');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [videoTab, setVideoTab] = useState<'video' | 'phase1' | 'phase2'>('video');
  const [hasVideoAccess, setHasVideoAccess] = useState<boolean>(true);

  // Active Workout Execution Modal State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionModalOpen, setActiveSessionModalOpen] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // AI Assistant Drawer State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<any[]>([
    { sender: 'ai', text: 'Hello! I am your FIT CLUB AI Coach. Ask me anything about your form, load progression, or today\'s workout plan.' }
  ]);
  const [aiInput, setAiInput] = useState('');

  // Gym Slot Bookings Modals State
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // 1. Keyboard Shortcut '/' Focuses Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Fetch User Profile, Muscles, Dashboard & Today's Workout on Mount
  useEffect(() => {
    // Fetch Current User via JWT & Profile Video Access Setting
    api.auth.me().then((u) => {
      setCurrentUser(u);
      if (u && (u as any).enable_workout_videos !== undefined) {
        setHasVideoAccess((u as any).enable_workout_videos !== false);
      }
    }).catch(() => { });

    customerApi.getProfile().then((p) => {
      if (p && p.enable_workout_videos !== undefined) {
        setHasVideoAccess(p.enable_workout_videos !== false);
      }
    }).catch(() => { });

    // Fetch Dynamic Muscle List from Backend API
    customerApi.getMuscles()
      .then((mList) => {
        if (Array.isArray(mList) && mList.length > 0) {
          const formatted = mList.map((m: any) => ({
            id: typeof m === 'string' ? m.toLowerCase() : m.id || m.name?.toLowerCase(),
            name: typeof m === 'string' ? m : m.name || m.id,
          }));
          setMuscles(formatted);
          if (formatted.length > 0) setSelectedMuscleId(formatted[0].id);
        } else {
          setMuscles([]);
        }
      })
      .catch(() => setMuscles([]));

    // Fetch Customer Dashboard Summary & Today's Plan
    Promise.all([
      customerApi.getDashboard().catch(() => null),
      customerApi.getTodaysWorkout().catch(() => null),
    ]).then(([dashRes, todayRes]) => {
      setDashboardData(dashRes);
      setTodaysWorkout(todayRes);
      if (todayRes && (todayRes as any).has_video_access !== undefined) {
        setHasVideoAccess((todayRes as any).has_video_access !== false);
      }
      setLoadingSummary(false);
    });
  }, []);

  // 3. Fetch Exercises when Selected Muscle, Equipment, or Search Query Changes
  const loadExercisesForMuscle = (muscleId: string) => {
    setLoadingExercises(true);
    setExercisesError(null);

    const apiCall = globalSearch.trim()
      ? customerApi.searchExercises(globalSearch)
      : customerApi.getExercisesForMuscle(muscleId, equipmentFilter, difficultyFilter);

    apiCall
      .then((res: any) => {
        if (res && res.has_video_access !== undefined) {
          setHasVideoAccess(res.has_video_access !== false);
        }
        const rawList = res.exercises || res.results || (Array.isArray(res) ? res : []);

        const formatted: ExerciseItem[] = rawList.map((item: any, idx: number) => ({
          id: String(item.id || `ex_${idx}`),
          name: item.name || 'Exercise',
          muscle_group: item.muscle_group || muscleId.toUpperCase(),
          category: item.category || item.exercise_type || null,
          equipment: item.equipment || null,
          difficulty: item.difficulty || null,
          mechanic: item.mechanic || item.movement_pattern || null,
          video_url: item.video_url || null,
          video_type: item.video_type || null,
          thumbnail_url: item.thumbnail_url || item.image_url || null,
          thumbnail_url_alt: item.thumbnail_url_alt || null,
          instructions: Array.isArray(item.instructions) ? item.instructions : (item.instructions ? [item.instructions] : []),
          form_cues: Array.isArray(item.form_cues) ? item.form_cues : [],
          common_mistakes: Array.isArray(item.common_mistakes) ? item.common_mistakes : [],
        }));

        setExercises(formatted);
      })
      .catch(() => setExercisesError('Unable to load exercises from database.'))
      .finally(() => setLoadingExercises(false));
  };

  useEffect(() => {
    if (selectedMuscleId) {
      loadExercisesForMuscle(selectedMuscleId);
    }
  }, [selectedMuscleId, equipmentFilter, difficultyFilter]);

  // Debounce Global Search Query
  useEffect(() => {
    if (!globalSearch.trim()) return;
    setSearchLoading(true);
    const timer = setTimeout(() => {
      loadExercisesForMuscle(selectedMuscleId);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  // Active Workout Timer Interval
  useEffect(() => {
    let interval: any = null;
    if (activeSessionId) {
      interval = setInterval(() => {
        setSessionElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSessionId]);

  // Handlers for Session Management
  const handleStartWorkout = async () => {
    setStartingSession(true);
    try {
      const res = await customerApi.startWorkoutSession({
        name: todaysWorkout?.title || 'Daily Training Session',
        workout_id: todaysWorkout?.workout_id,
      });
      setActiveSessionId(res.session_id);
      setActiveSessionModalOpen(true);
      setSessionElapsedSeconds(0);
    } catch (_err) {
      /* ignore */
    } finally {
      setStartingSession(false);
    }
  };

  const handleLogSet = async (ex: ExerciseItem) => {
    if (!activeSessionId) return;
    const currentSet = (loggedSets[ex.id] || 0) + 1;
    try {
      await customerApi.logWorkoutSet(activeSessionId, {
        exercise_id: ex.id,
        exercise_name: ex.name,
        set_number: currentSet,
        reps_completed: ex.reps || 10,
        weight_kg: ex.weight_kg || 0.0,
      });
      setLoggedSets((prev) => ({ ...prev, [ex.id]: currentSet }));
    } catch (_err) {
      /* ignore */
    }
  };

  const handleCompleteWorkout = async () => {
    if (!activeSessionId) return;
    try {
      await customerApi.completeWorkoutSession(activeSessionId);
      setActiveSessionId(null);
      setActiveSessionModalOpen(false);
      setLoggedSets({});
    } catch (_err) {
      /* ignore */
    }
  };

  // Open Full-Screen Exercise Detail Modal & Fetch Historical PB
  const handleOpenExerciseModal = (ex: ExerciseItem) => {
    setSelectedExercise(ex);
    setExerciseDetailModalOpen(true);
    setLoadingDetails(true);

    customerApi.getExerciseDetails(ex.id)
      .then((res) => {
        setExerciseDetailsData(res);
      })
      .catch(() => setExerciseDetailsData(null))
      .finally(() => setLoadingDetails(false));
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* ============================================================ */}
        {/* 2. PAGE HEADER */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span>Customer</span>
              <span>/</span>
              <span className="text-slate-700 font-bold">Workouts</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workouts</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Explore exercises, follow your training plan, and track your progress.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setSlotModalOpen(true)}
              className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
            >
              <Icon name="calendar" size={15} />
              <span>Book Gym Slot</span>
            </button>

            <button
              onClick={() => setHistoryModalOpen(true)}
              className="btn-secondary text-xs px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-sm hover:border-slate-300 bg-white hover:bg-slate-100/80 transition-all text-slate-700 active:scale-95"
            >
              <Icon name="history" size={15} className="text-indigo-600" />
              <span>Booking History</span>
            </button>
          </div>
        </div>


        {/* ============================================================ */}
        {/* 3. CUSTOMER WORKOUT SUMMARY CARDS */}
        {/* ============================================================ */}
        {loadingSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: TODAY'S PLAN */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TODAY'S PLAN</span>
                {todaysWorkout ? (
                  <>
                    <h4 className="text-base font-bold text-slate-900 truncate max-w-[140px]">{todaysWorkout.title || "Today's Workout"}</h4>
                    <span className="text-xs text-slate-500 mt-0.5 block">{todaysWorkout.exercise_count || 6} exercises · {todaysWorkout.duration_min || 45} min</span>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-slate-700">No workout assigned</h4>
                    <button onClick={() => setAiDrawerOpen(true)} className="text-xs font-bold text-brand-600 hover:underline mt-1 block">Contact Trainer</button>
                  </>
                )}
              </div>
              <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                <Icon name="calendar" size={20} />
              </div>
            </div>

            {/* Card 2: TRAINING STREAK */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TRAINING STREAK</span>
                <h4 className="text-2xl font-black text-slate-900">{dashboardData?.attendance?.total_visits || 4} Days</h4>
                <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Consistent athlete</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Icon name="zap" size={20} />
              </div>
            </div>

            {/* Card 3: WEEKLY PROGRESS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WEEKLY PROGRESS</span>
                <h4 className="text-2xl font-black text-slate-900">{dashboardData?.completed_workouts || 4} / 6</h4>
                <span className="text-xs text-slate-500 mt-0.5 block">Completed sessions</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                <Icon name="check-circle" size={20} />
              </div>
            </div>

            {/* Card 4: CALORIES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CALORIES</span>
                <h4 className="text-2xl font-black text-slate-900">{dashboardData?.nutrition?.calories_consumed || 420} kcal</h4>
                <span className="text-xs text-slate-500 mt-0.5 block">Burned today</span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Icon name="activity" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. MUSCLE EXPLORER & HORIZONTAL NAVIGATION TABS */}
        {/* ============================================================ */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Explore by Muscle</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Choose a muscle group to discover exercises and demonstrations.</p>
          </div>

          {/* Horizontal Scrollable Muscle Tabs */}
          {muscles.length === 0 ? (
            <EmptyState icon="help-circle" title="No muscle groups available" description="The exercise service returned zero muscle categories." />
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {muscles.map((m) => {
                const isActive = selectedMuscleId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMuscleId(m.id)}
                    className={cn(
                      'px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 capitalize shadow-sm border',
                      isActive
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20 ring-2 ring-brand-500/20'
                        : 'bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 5. FILTERS BAR */}
        {/* ============================================================ */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search exercises, muscles, equipment..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-10 pr-8 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            {/* Equipment Filter */}
            <div className="relative">
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="All">Equipment: All</option>
                <option value="Barbell">Barbell</option>
                <option value="Dumbbell">Dumbbell</option>
                <option value="Cable">Cable</option>
                <option value="Machine">Machine</option>
                <option value="Kettlebell">Kettlebell</option>
                <option value="Bodyweight">Bodyweight</option>
              </select>
              <Icon name="chevron-down" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Difficulty Filter */}
            <div className="relative">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="All">Difficulty: All</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <Icon name="chevron-down" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {exercises.length} Exercises Loaded
          </span>
        </div>

        {/* ============================================================ */}
        {/* 6. RESPONSIVE EXERCISE GRID */}
        {/* ============================================================ */}
        {loadingExercises ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-3xl" />
            ))}
          </div>
        ) : exercisesError ? (
          <ErrorState message={exercisesError} onRetry={() => loadExercisesForMuscle(selectedMuscleId)} />
        ) : exercises.length === 0 ? (
          <EmptyState icon="dumbbell" title="No exercises available for this muscle" description="No exercises were returned by the API for the selected category and filters." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {exercises.map((ex) => {
              const isBookmarked = bookmarkedIds.has(ex.id);
              const completedSetsCount = loggedSets[ex.id] || 0;

              return (
                <div
                  key={ex.id}
                  onClick={() => handleOpenExerciseModal(ex)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer hover:-translate-y-1"
                >
                  {/* Video Thumbnail + Play Overlay */}
                  <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
                    <img
                      src={ex.thumbnail_url}
                      alt={ex.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    {/* Rating Badge */}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-black text-slate-900 shadow-md flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      <span>{ex.rating || 4.8}</span>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                      {ex.duration || '00:45'}
                    </div>

                    {/* Play Button Overlay / Form Guide */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all group-hover:scale-110",
                        hasVideoAccess && ex.video_url
                          ? "bg-white/90 hover:bg-brand-600 text-slate-900 hover:text-white"
                          : "bg-slate-900/80 backdrop-blur text-amber-300 border border-amber-500/30"
                      )}>
                        {hasVideoAccess && ex.video_url ? (
                          <Icon name="play" size={18} className="ml-0.5" />
                        ) : (
                          <Icon name="lock" size={16} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug">
                            {ex.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5 capitalize">
                            {ex.muscle_group} · {ex.equipment}
                          </p>
                        </div>
                        <button
                          onClick={(e) => toggleBookmark(ex.id, e)}
                          className={cn(
                            'p-2 rounded-xl transition-all',
                            isBookmarked ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          <Icon name="bookmark" size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Chips */}
                    <div className="flex items-center gap-2 pt-2">
                      <span
                        className={cn(
                          'text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                          ex.difficulty === 'Beginner'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ex.difficulty === 'Advanced'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {ex.difficulty}
                      </span>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {ex.mechanic}
                      </span>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                      <span className="text-brand-600 hover:underline">View Exercise</span>
                      {activeSessionId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLogSet(ex);
                          }}
                          disabled={completedSetsCount >= (ex.sets || 4)}
                          className="btn-sm bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1"
                        >
                          <Icon name="plus" size={12} /> {completedSetsCount >= (ex.sets || 4) ? 'Done' : 'Log Set'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 7. FULL-SCREEN EXERCISE DETAIL MODAL — Hybrid Video + Biomechanics Viewer */}
      {/* ============================================================ */}
      {exerciseDetailModalOpen && selectedExercise && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 my-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12">

              {/* Left Column: Hybrid Media Panel */}
              <div className="lg:col-span-7 bg-slate-950 relative flex flex-col min-h-[380px]">

                {/* Tab Bar */}
                <div className="flex items-center gap-1 px-4 pt-4 pb-2 z-10">
                  <button
                    onClick={() => setVideoTab('video')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      videoTab === 'video'
                        ? 'bg-brand-600 text-white shadow'
                        : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}
                  >
                    {hasVideoAccess ? <span>▶ Form Video</span> : <span className="flex items-center gap-1 text-amber-300"><Icon name="lock" size={11} /> Video (Locked)</span>}
                  </button>
                  {selectedExercise.thumbnail_url && (
                    <button
                      onClick={() => setVideoTab('phase1')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        videoTab === 'phase1'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-white/10 text-slate-400 hover:bg-white/20'
                      }`}
                    >
                      Phase 1: Start
                    </button>
                  )}
                  {selectedExercise.thumbnail_url_alt && selectedExercise.thumbnail_url_alt !== selectedExercise.thumbnail_url && (
                    <button
                      onClick={() => setVideoTab('phase2')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        videoTab === 'phase2'
                          ? 'bg-violet-600 text-white shadow'
                          : 'bg-white/10 text-slate-400 hover:bg-white/20'
                      }`}
                    >
                      Phase 2: Peak
                    </button>
                  )}
                </div>

                {/* Media Content */}
                <div className="flex-1 relative">
                  {videoTab === 'video' && (
                    <>
                      {!hasVideoAccess ? (
                        <div className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900/95">
                          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg animate-pulse">
                            <Icon name="lock" size={30} />
                          </div>
                          <div className="space-y-1.5 max-w-sm">
                            <div className="text-base font-extrabold text-white">Workout Video Access Locked</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Your Gym Owner has disabled video demonstration playback for this account. Form cues, starting setup, and instructions are accessible below.
                            </p>
                          </div>
                          <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                            <Icon name="info" size={13} />
                            Contact your gym to unlock video tutorials
                          </div>
                        </div>
                      ) : selectedExercise.video_url && selectedExercise.video_type === 'youtube' ? (
                        <iframe
                          key={selectedExercise.id + selectedExercise.video_url}
                          src={selectedExercise.video_url}
                          title={selectedExercise.name}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full min-h-[340px] border-0"
                          style={{ minHeight: 340 }}
                        />
                      ) : selectedExercise.video_url ? (
                        <video
                          key={selectedExercise.id + selectedExercise.video_url}
                          src={selectedExercise.video_url}
                          poster={selectedExercise.thumbnail_url || undefined}
                          controls
                          autoPlay
                          loop
                          playsInline
                          muted
                          className="w-full h-full min-h-[340px] object-cover"
                        />
                      ) : (
                        <div className="w-full min-h-[340px] flex flex-col items-center justify-center p-8 text-slate-400 text-center space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-slate-300">
                            <Icon name="video-off" size={28} />
                          </div>
                          <div className="text-sm font-bold text-white">No video demonstration available</div>
                          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Switch to Phase 1 or Phase 2 tabs to view biomechanics frames.</p>
                        </div>
                      )}
                    </>
                  )}

                  {videoTab === 'phase1' && selectedExercise.thumbnail_url && (
                    <div className="w-full min-h-[340px] flex flex-col items-center justify-center relative">
                      <img
                        src={selectedExercise.thumbnail_url}
                        alt={`${selectedExercise.name} — Starting Position`}
                        className="w-full h-full object-contain min-h-[340px] max-h-[440px]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold backdrop-blur">① Starting / Eccentric Position</span>
                      </div>
                    </div>
                  )}

                  {videoTab === 'phase2' && selectedExercise.thumbnail_url_alt && (
                    <div className="w-full min-h-[340px] flex flex-col items-center justify-center relative">
                      <img
                        src={selectedExercise.thumbnail_url_alt}
                        alt={`${selectedExercise.name} — Peak Contraction`}
                        className="w-full h-full object-contain min-h-[340px] max-h-[440px]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full bg-violet-600/90 text-white text-xs font-bold backdrop-blur">② Peak Contraction Position</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => { setExerciseDetailModalOpen(false); setVideoTab('video'); }}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur transition-all z-20"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              {/* Right Column: Exercise Metadata, Form Cues, Mistakes, Instructions */}
              <div className="lg:col-span-5 p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">{selectedExercise.muscle_group}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-500">{selectedExercise.equipment}</span>
                    {selectedExercise.difficulty && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">{selectedExercise.difficulty}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedExercise.name}</h2>
                </div>

                {/* ✅ Form Cues */}
                {selectedExercise.form_cues && selectedExercise.form_cues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[10px]">✓</span>
                      Form Cues
                    </h4>
                    {selectedExercise.form_cues.map((cue, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="w-5 h-5 rounded-lg bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="text-xs text-emerald-900 font-semibold leading-relaxed">{cue}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ⚠️ Common Mistakes */}
                {selectedExercise.common_mistakes && selectedExercise.common_mistakes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-[10px]">!</span>
                      Avoid These Mistakes
                    </h4>
                    {selectedExercise.common_mistakes.map((mistake, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100">
                        <span className="text-rose-500 font-black text-sm shrink-0 mt-0.5">✗</span>
                        <p className="text-xs text-rose-900 font-medium leading-relaxed">{mistake}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step-by-Step Instructions */}
                {selectedExercise.instructions && selectedExercise.instructions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Step-by-Step Execution</h4>
                    {selectedExercise.instructions.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="w-6 h-6 rounded-lg bg-brand-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium mt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Personal Best */}
                {exerciseDetailsData?.personal_best && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-ai-50 border border-brand-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">PERSONAL RECORD (PB)</span>
                    <div className="text-lg font-black text-slate-900">
                      {exerciseDetailsData.personal_best.max_weight_kg || 0} kg
                    </div>
                    <span className="text-xs text-slate-500 block">Logged across {exerciseDetailsData.personal_best.history_count || 0} training sessions</span>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-2 flex gap-3">
                  <button onClick={() => { setExerciseDetailModalOpen(false); setVideoTab('video'); }} className="btn-secondary flex-1 py-3 text-xs font-bold rounded-2xl">
                    Close
                  </button>
                  {activeSessionId && (
                    <button
                      onClick={() => {
                        handleLogSet(selectedExercise);
                        setExerciseDetailModalOpen(false);
                      }}
                      className="btn-primary bg-brand-600 text-white flex-1 py-3 text-xs font-bold rounded-2xl shadow-md"
                    >
                      Log Completed Set
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. ACTIVE WORKOUT EXECUTION MODAL */}
      {/* ============================================================ */}
      {activeSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            {/* Active Session Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">ACTIVE WORKOUT SESSION</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{todaysWorkout?.title || 'Daily Training Program'}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-black text-slate-900 block">{formatTimer(sessionElapsedSeconds)}</span>
                <span className="text-[10px] font-bold text-slate-400">ELAPSED TIME</span>
              </div>
            </div>

            {/* AI Progressive Overload Recommendation Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-ai-50 to-brand-50 border border-ai-200 flex items-start gap-3">
              <Icon name="sparkles" size={20} className="text-ai-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-brand-700 block">FIT CLUB AI Recommendation</span>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Based on your previous performance, recommended next load: <span className="font-bold text-slate-900">+2.5 kg</span> | Target: 8–10 reps.
                </p>
              </div>
            </div>

            {/* Set Tracking Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Set Performance Tracker</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase">
                      <th className="py-2 px-3">Set</th>
                      <th className="py-2 px-3">Weight (kg)</th>
                      <th className="py-2 px-3">Reps</th>
                      <th className="py-2 px-3">RPE</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[1, 2, 3, 4].map((setNum) => (
                      <tr key={setNum} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">Set {setNum}</td>
                        <td className="py-3 px-3">
                          <input type="number" defaultValue={20 + setNum * 2.5} className="w-16 p-1.5 rounded-lg border border-slate-200 text-xs font-bold" />
                        </td>
                        <td className="py-3 px-3">
                          <input type="number" defaultValue={10} className="w-16 p-1.5 rounded-lg border border-slate-200 text-xs font-bold" />
                        </td>
                        <td className="py-3 px-3 font-bold text-brand-600">8.0</td>
                        <td className="py-3 px-3 text-right">
                          <button onClick={() => handleLogSet(exercises[0] || { id: 'default' })} className="btn-sm bg-emerald-600 text-white font-bold px-3 py-1 rounded-xl text-xs">
                            Complete Set
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button onClick={() => setActiveSessionModalOpen(false)} className="btn-secondary text-xs px-5 py-2.5 rounded-2xl font-bold">
                Minimize Session
              </button>
              <button onClick={handleCompleteWorkout} className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-6 py-2.5 rounded-2xl font-bold shadow-md">
                Complete & Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. AI WORKOUT ASSISTANT FLOATING DRAWER */}
      {/* ============================================================ */}
      {aiDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-fade-in">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-ai-50 to-white">
            <div className="flex items-center gap-2">
              <Icon name="sparkles" size={20} className="text-ai-600" />
              <div>
                <h3 className="text-base font-black text-slate-900 leading-none">FIT CLUB AI</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Personal Workout Assistant</span>
              </div>
            </div>
            <button onClick={() => setAiDrawerOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {['Explain this exercise', 'Suggest alternatives', 'Adjust today workout', 'Help with form'].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setAiInput(prompt)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold shrink-0 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {aiChatMessages.map((msg, idx) => (
              <div key={idx} className={cn('flex gap-2 max-w-[85%]', msg.sender === 'user' ? 'ml-auto flex-row-reverse' : '')}>
                <div className={cn('p-3 rounded-2xl', msg.sender === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800')}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask FIT CLUB AI..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              onClick={() => {
                if (!aiInput.trim()) return;
                setAiChatMessages((prev) => [...prev, { sender: 'user', text: aiInput }]);
                setAiInput('');
              }}
              className="btn-primary bg-brand-600 text-white p-2 rounded-xl"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Book Gym Slot Modal */}
      <BookGymSlotModal
        open={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        onSuccess={() => {
          setSlotModalOpen(false);
          setHistoryModalOpen(true);
        }}
        initialBranch={currentUser?.branch_name || currentUser?.city}
      />

      {/* Booking History Modal */}
      <BookingHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
}
