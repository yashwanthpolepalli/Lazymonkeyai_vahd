import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { customerApi, type GymSlotBookingItem } from '@/services/customerApi';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { getTodayISO, addDaysISO, getCurrentTimeIST, getNextHourIST } from '@/utils/date';

interface BookGymSlotModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (booking: GymSlotBookingItem) => void;
  initialBranch?: string;
}

export function BookGymSlotModal({ open, onClose, onSuccess, initialBranch }: BookGymSlotModalProps) {
  const [bookingDate, setBookingDate] = useState<string>(() => getTodayISO());
  const [startTime, setStartTime] = useState<string>(() => getCurrentTimeIST().time);
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(() => getCurrentTimeIST().period);
  const [endTime, setEndTime] = useState<string>(() => getNextHourIST().time);
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>(() => getNextHourIST().period);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [availableWorkoutTypes, setAvailableWorkoutTypes] = useState<string[]>([]);
  const [customWorkoutInput, setCustomWorkoutInput] = useState<string>('');
  const [branch, setBranch] = useState<string>(initialBranch || '');
  const [branches, setBranches] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Fetch dynamic branches
      apiClient.get<any[]>('/gym/branches')
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setBranches(res);
            if (!branch && res[0]?.branch_name) {
              setBranch(res[0].branch_name);
            }
          }
        })
        .catch(() => {});

      // Fetch dynamic muscle / workout categories
      apiClient.get<any>('/customer/workouts/muscles')
        .then((res) => {
          let list: string[] = [];
          if (Array.isArray(res)) {
            list = res.map((m: any) => typeof m === 'string' ? m : m.name || m.muscle_name || m.label || '');
          } else if (res && Array.isArray(res.results)) {
            list = res.results.map((m: any) => typeof m === 'string' ? m : m.name || m.muscle_name || m.label || '');
          }
          const clean = list.filter(Boolean);
          if (clean.length > 0) {
            setAvailableWorkoutTypes(Array.from(new Set(clean)));
          } else {
            // Fallback dynamic muscle taxonomy if API returns empty
            setAvailableWorkoutTypes(['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Legs', 'Core / Abs', 'Cardio', 'Full Body', 'Functional Training']);
          }
        })
        .catch(() => {
          setAvailableWorkoutTypes(['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Legs', 'Core / Abs', 'Cardio', 'Full Body', 'Functional Training']);
        });
    }
  }, [open]);

  if (!open) return null;

  const toggleWorkoutType = (wId: string) => {
    if (selectedWorkouts.includes(wId)) {
      setSelectedWorkouts(selectedWorkouts.filter((id) => id !== wId));
    } else {
      setSelectedWorkouts([...selectedWorkouts, wId]);
    }
  };

  const handleAddCustomWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customWorkoutInput.trim();
    if (!trimmed) return;
    if (!selectedWorkouts.includes(trimmed)) {
      setSelectedWorkouts([...selectedWorkouts, trimmed]);
    }
    if (!availableWorkoutTypes.includes(trimmed)) {
      setAvailableWorkoutTypes([...availableWorkoutTypes, trimmed]);
    }
    setCustomWorkoutInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) {
      setError('Please select a booking date.');
      return;
    }
    if (selectedWorkouts.length === 0) {
      setError('Please select at least one workout muscle group / type.');
      return;
    }

    setLoading(true);
    setError(null);

    const formattedStart = `${startTime} ${startPeriod}`;
    const formattedEnd = `${endTime} ${endPeriod}`;

    try {
      const res = await customerApi.bookGymSlot({
        booking_date: bookingDate,
        start_time: formattedStart,
        end_time: formattedEnd,
        workout_types: selectedWorkouts,
        branch: branch,
        notes: notes.trim(),
      });
      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to book gym slot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-scale-in overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center shadow-lg">
              <Icon name="calendar" size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">Book Gym Time Slot</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">Live Sync</span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Reserve your slot with intended workout focus for Owner & Trainer schedule mapping.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Date Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Icon name="calendar" size={14} className="text-blue-600" />
              <span>1. Select Booking Date (DD-MM-YYYY)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBookingDate(getTodayISO())}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all flex items-center justify-between',
                  bookingDate === getTodayISO()
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                )}
              >
                <div>
                  <div className="text-xs font-bold">Today (IST)</div>
                  <div className="text-[11px] text-slate-400 font-medium">{getTodayISO()}</div>
                </div>
                {bookingDate === getTodayISO() && <Icon name="check-circle" size={16} className="text-blue-600" />}
              </button>

              <button
                type="button"
                onClick={() => setBookingDate(addDaysISO(getTodayISO(), 1))}
                className={cn(
                  'p-3 rounded-2xl border text-left transition-all flex items-center justify-between',
                  bookingDate === addDaysISO(getTodayISO(), 1)
                    ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                )}
              >
                <div>
                  <div className="text-xs font-bold">Tomorrow (IST)</div>
                  <div className="text-[11px] text-slate-400 font-medium">{addDaysISO(getTodayISO(), 1)}</div>
                </div>
                {bookingDate === addDaysISO(getTodayISO(), 1) && <Icon name="check-circle" size={16} className="text-blue-600" />}
              </button>

              <div className="relative">
                <input
                  type="date"
                  min={getTodayISO()}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full h-full min-h-[46px] p-2.5 rounded-2xl border border-slate-200 font-semibold text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* 2. Time Range (From Time to To Time with AM/PM) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="clock" size={14} className="text-blue-600" />
                <span>2. Time Slot Range (From Time to To Time with AM / PM)</span>
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {startTime} {startPeriod} — {endTime} {endPeriod}
              </span>
            </div>

            {/* Custom Time Range Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {/* FROM TIME */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">From Time</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="HH:MM"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="grid grid-cols-2 p-0.5 bg-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStartPeriod('AM')}
                      className={cn('px-2.5 py-1 text-xs font-bold rounded-lg transition-all', startPeriod === 'AM' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600')}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartPeriod('PM')}
                      className={cn('px-2.5 py-1 text-xs font-bold rounded-lg transition-all', startPeriod === 'PM' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600')}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* TO TIME */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">To Time</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="HH:MM"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-blue-500"
                  />
                  <div className="grid grid-cols-2 p-0.5 bg-slate-200 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEndPeriod('AM')}
                      className={cn('px-2.5 py-1 text-xs font-bold rounded-lg transition-all', endPeriod === 'AM' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600')}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndPeriod('PM')}
                      className={cn('px-2.5 py-1 text-xs font-bold rounded-lg transition-all', endPeriod === 'PM' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600')}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Workout Types (Scrollable Multi-Select & Custom Input) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="dumbbell" size={14} className="text-blue-600" />
                <span>3. Workout Types (Select Multiple Target Muscles / Split)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {selectedWorkouts.length} Selected
              </span>
            </div>

            {/* Selected Workout Focus Badges */}
            {selectedWorkouts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedWorkouts.map((w) => (
                  <span key={w} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                    <span>{w}</span>
                    <button type="button" onClick={() => toggleWorkoutType(w)} className="hover:text-rose-200">
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Custom Workout Adder */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customWorkoutInput}
                onChange={(e) => setCustomWorkoutInput(e.target.value)}
                placeholder="Type custom workout (e.g. Legs, Triceps, HIIT)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomWorkout(e);
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomWorkout}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1"
              >
                <Icon name="plus" size={14} /> Add
              </button>
            </div>

            {/* Scrollable multi-select list */}
            <div className="max-h-44 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2 border border-slate-200 rounded-2xl p-2.5 bg-slate-50/50">
              {availableWorkoutTypes.map((wt) => {
                const isChecked = selectedWorkouts.includes(wt);
                return (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => toggleWorkoutType(wt)}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all text-left flex items-center justify-between',
                      isChecked
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-semibold'
                    )}
                  >
                    <span className="text-xs truncate">{wt}</span>
                    <div className={cn('w-4 h-4 rounded-md border flex items-center justify-center transition-all ml-1 shrink-0', isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white')}>
                      {isChecked && <Icon name="check" size={10} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Gym Branch Mapping & Special Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Gym Branch Location</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
              >
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <option key={b.id || b.branch_name} value={b.branch_name}>
                      {b.branch_name} {b.city ? `(${b.city})` : ''}
                    </option>
                  ))
                ) : (
                  <option value={branch || ''}>{branch || 'Primary Gym Center'}</option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Optional Notes for Trainer</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Focus on heavy compound lifts"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3 text-xs font-bold rounded-2xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-2 py-3 text-xs font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Icon name="check-circle" size={16} />
              <span>{loading ? 'Booking Slot...' : 'Confirm Gym Slot Booking'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
