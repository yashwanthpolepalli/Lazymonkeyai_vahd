import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import {
  hrmsApi,
  type ShiftRosterResponse,
  type EmployeeRosterRow,
  type ShiftTemplateItem,
  type WorkCalendarItem,
} from '@/services/hrmsApi';

interface HrmsShiftRosterTabProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsShiftRosterTab({ onSuccessToast }: HrmsShiftRosterTabProps) {
  // Top Sub-view: 'roster' (Weekly Shift Roster) vs 'templates' (Shift Templates & Policies)
  const [activeTabMode, setActiveTabMode] = useState<'roster' | 'templates'>('roster');

  // Filter States (for Roster)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [viewMode, setViewMode] = useState<'flat' | 'hierarchy'>('flat');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  // Data States
  const [loading, setLoading] = useState(true);
  const [rosterData, setRosterData] = useState<ShiftRosterResponse | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Shift Templates & Calendars Data States
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplateItem[]>([]);
  const [workCalendars, setWorkCalendars] = useState<WorkCalendarItem[]>([]);

  // Quick Shift Assignment Modal (from Roster cell click)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    employeeIds: string[];
    dateStr: string;
    employeeName?: string;
  } | null>(null);
  const [modalShiftCode, setModalShiftCode] = useState('');

  // Add Shift Timing Modal (matching Image 2)
  const [showAddTimingModal, setShowAddTimingModal] = useState(false);
  const [targetCalendar, setTargetCalendar] = useState<WorkCalendarItem | null>(null);
  const [newTimingName, setNewTimingName] = useState('');
  const [newTimingStartTime, setNewTimingStartTime] = useState('');
  const [newTimingEndTime, setNewTimingEndTime] = useState('');
  const [submittingTiming, setSubmittingTiming] = useState(false);

  // New Work Calendar Modal (Matching Screenshot)
  const [showNewCalendarModal, setShowNewCalendarModal] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalType, setNewCalType] = useState('');
  const [newCalPreset, setNewCalPreset] = useState('');
  const [newCalIsDefault, setNewCalIsDefault] = useState(false);
  const [submittingCal, setSubmittingCal] = useState(false);

  // Helper toast
  const showToast = (msg: string) => {
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Calculate start_date for selected week offset
  const currentWeekMondayStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff + selectedWeekOffset * 7);
    return d.toISOString().split('T')[0];
  }, [selectedWeekOffset]);

  // Fetch Roster Data
  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await hrmsApi.getShiftRoster({
        start_date: currentWeekMondayStr,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        search: searchQuery.trim() || undefined,
        view: viewMode,
      });
      setRosterData(res);
    } catch (err) {
      console.error('Failed to load shift roster:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Shift Templates & Active Work Calendars
  const fetchTemplatesAndCalendars = async () => {
    setTemplatesLoading(true);
    try {
      const [tpls, cals] = await Promise.all([
        hrmsApi.getShiftTemplates(),
        hrmsApi.getWorkCalendars(),
      ]);
      setShiftTemplates(tpls || []);
      setWorkCalendars(cals || []);
    } catch (err) {
      console.error('Failed to load shift templates or calendars:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    fetchTemplatesAndCalendars();
  }, [currentWeekMondayStr, selectedDepartment, viewMode]);

  useEffect(() => {
    if (activeTabMode === 'templates') {
      fetchTemplatesAndCalendars();
    }
  }, [activeTabMode]);

  // Debounced search for roster
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRoster();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle single cell shift quick change
  const handleCellClick = (emp: EmployeeRosterRow, dateStr: string) => {
    const currentShift = emp.shifts[dateStr]?.shift_code || 'GEN';
    setModalTarget({
      employeeIds: [emp.id],
      dateStr,
      employeeName: emp.name,
    });
    setModalShiftCode(currentShift);
    setShowAssignModal(true);
  };

  // Submit shift assignment
  const handleSaveShiftAssignment = async () => {
    if (!modalTarget) return;
    try {
      await hrmsApi.assignShift({
        employee_ids: modalTarget.employeeIds,
        dates: [modalTarget.dateStr],
        shift_code: modalShiftCode,
        is_off: modalShiftCode === 'OFF',
      });
      setShowAssignModal(false);
      setModalTarget(null);
      showToast(`Shift updated to ${modalShiftCode} successfully.`);
      fetchRoster();
    } catch (err) {
      console.error('Error assigning shift:', err);
    }
  };

  // Select all employees checkbox
  const handleToggleSelectAll = () => {
    if (!rosterData) return;
    if (selectedEmployeeIds.length === rosterData.employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(rosterData.employees.map((e) => e.id));
    }
  };

  // Toggle single employee selection
  const handleToggleSelectEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  // Open "Add Shift Timing" modal for a specific calendar
  const handleOpenAddTimingModal = (cal: WorkCalendarItem) => {
    setTargetCalendar(cal);
    setNewTimingName('');
    setNewTimingStartTime('09:00 AM');
    setNewTimingEndTime('06:00 PM');
    setShowAddTimingModal(true);
  };

  // Submit adding shift timing to calendar
  const handleSaveShiftTiming = async () => {
    if (!targetCalendar) return;
    if (!newTimingName.trim()) {
      alert('Please enter a shift name');
      return;
    }
    setSubmittingTiming(true);
    try {
      await hrmsApi.addCalendarShiftTiming(targetCalendar.id, {
        name: newTimingName.trim(),
        start_time: newTimingStartTime.trim(),
        end_time: newTimingEndTime.trim(),
      });
      showToast(`Added ${newTimingName} timing to ${targetCalendar.name} successfully.`);
      setShowAddTimingModal(false);
      fetchTemplatesAndCalendars();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to add shift timing');
    } finally {
      setSubmittingTiming(false);
    }
  };

  // Delete shift timing from calendar
  const handleDeleteTiming = async (calendarId: string, timingId: string) => {
    if (!confirm('Are you sure you want to remove this shift timing?')) return;
    try {
      await hrmsApi.deleteCalendarShiftTiming(calendarId, timingId);
      showToast('Shift timing removed successfully.');
      fetchTemplatesAndCalendars();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to remove shift timing');
    }
  };

  // Delete work calendar
  const handleDeleteCalendar = async (calId: string, calName: string) => {
    if (!confirm(`Are you sure you want to delete calendar "${calName}"?`)) return;
    try {
      await hrmsApi.deleteWorkCalendar(calId);
      showToast(`Work calendar "${calName}" deleted successfully.`);
      fetchTemplatesAndCalendars();
      fetchRoster();
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to delete work calendar');
    }
  };

  // Create new work calendar
  const handleCreateNewCalendar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCalName.trim()) {
      showToast('Please enter a calendar name');
      return;
    }
    if (!newCalType) {
      showToast('Please select a calendar type');
      return;
    }
    if (!newCalPreset) {
      showToast('Please select a weekly preset');
      return;
    }
    setSubmittingCal(true);
    try {
      let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      let offs = ['Saturday', 'Sunday'];
      if (newCalPreset.includes('6')) {
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        offs = ['Sunday'];
      } else if (newCalPreset.includes('7') || newCalPreset.toLowerCase().includes('all')) {
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        offs = [];
      }
      await hrmsApi.saveWorkCalendar({
        name: newCalName.trim(),
        calendar_type: newCalType,
        is_default: newCalIsDefault,
        working_days: days,
        weekly_off_days: offs,
        is_active: true,
      });
      showToast(`Work calendar "${newCalName}" created successfully.`);
      setShowNewCalendarModal(false);
      setNewCalName('');
      setNewCalType('');
      setNewCalPreset('');
      setNewCalIsDefault(false);
      fetchTemplatesAndCalendars();
      fetchRoster();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to create work calendar');
    } finally {
      setSubmittingCal(false);
    }
  };

  return (
    <div className="space-y-4 w-full animate-fade-in">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & VIEW TOGGLES (Matching Screenshot 1)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="clock" size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Shift Roster &amp; Work Calendars
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Visual weekly/monthly shift scheduling, batch team allocation, and hierarchical department rosters.
            </p>
          </div>
        </div>

        {/* Action Buttons Right Side */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle 1: Weekly Shift Roster */}
          <button
            type="button"
            onClick={() => setActiveTabMode('roster')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTabMode === 'roster'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            )}
          >
            <Icon name="users" size={14} />
            <span>Weekly Shift Roster</span>
          </button>

          {/* Toggle 2: Shift Templates & Policies (Matching Image 1) */}
          <button
            type="button"
            onClick={() => setActiveTabMode('templates')}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              activeTabMode === 'templates'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            )}
          >
            <Icon name="sliders" size={14} />
            <span>Shift Templates &amp; Policies</span>
          </button>

          {/* Button 3: + New Calendar (Purple Button) */}
          <button
            type="button"
            onClick={() => {
              setNewCalName('');
              setNewCalType('');
              setNewCalPreset('');
              setNewCalIsDefault(false);
              setShowNewCalendarModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/25 transition-all cursor-pointer"
          >
            <Icon name="plus" size={14} />
            <span>New Calendar</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 5 SUMMARY STATISTIC METRIC CARDS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: GENERAL (09-18) */}
        <div className="card p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border border-purple-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
              {rosterData?.summary?.general ?? 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-600">
              <Icon name="sun" size={18} />
            </div>
          </div>
          <div className="mt-2 text-[11px] font-black uppercase text-purple-800 tracking-wider">
            GENERAL (09-18)
          </div>
        </div>

        {/* Card 2: MORNING (06-14) */}
        <div className="card p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
              {rosterData?.summary?.morning ?? 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600">
              <Icon name="sunrise" size={18} />
            </div>
          </div>
          <div className="mt-2 text-[11px] font-black uppercase text-emerald-800 tracking-wider">
            MORNING (06-14)
          </div>
        </div>

        {/* Card 3: EVENING (14-22) */}
        <div className="card p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
              {rosterData?.summary?.evening ?? 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-600">
              <Icon name="sunset" size={18} />
            </div>
          </div>
          <div className="mt-2 text-[11px] font-black uppercase text-amber-800 tracking-wider">
            EVENING (14-22)
          </div>
        </div>

        {/* Card 4: NIGHT (22-06) */}
        <div className="card p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50/80 via-white to-fuchsia-50/30 border border-fuchsia-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-fuchsia-950 tracking-tight">
              {rosterData?.summary?.night ?? 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-100/80 flex items-center justify-center text-fuchsia-600">
              <Icon name="moon" size={18} />
            </div>
          </div>
          <div className="mt-2 text-[11px] font-black uppercase text-fuchsia-800 tracking-wider">
            NIGHT (22-06)
          </div>
        </div>

        {/* Card 5: WEEKLY OFFS */}
        <div className="card p-4 rounded-2xl bg-gradient-to-br from-slate-50/90 via-white to-slate-100/40 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {rosterData?.summary?.weekly_offs ?? 0}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Icon name="coffee" size={18} />
            </div>
          </div>
          <div className="mt-2 text-[11px] font-black uppercase text-slate-600 tracking-wider">
            WEEKLY OFFS
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CONDITIONAL SUB-VIEW: TEMPLATES VS ROSTER                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTabMode === 'templates' ? (
        /* ══════════════════════════════════════════════════════════════ */
        /* VIEW 1: SHIFT TEMPLATES & WORK CALENDARS (Matching Image 1)   */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Section A: Active Work Calendars & Day Schedules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Active Work Calendars &amp; Day Schedules
              </h2>
            </div>

            {templatesLoading ? (
              <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading work calendars...
              </div>
            ) : workCalendars.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold text-slate-500">No active work calendars found.</p>
                <button
                  onClick={() => setShowNewCalendarModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white"
                >
                  Create Work Calendar
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {workCalendars.map((cal) => {
                  const daysShort = (cal.working_days || []).map((d) => d.slice(0, 3)).join(', ');
                  const timings = cal.shift_timings || [];

                  return (
                    <div
                      key={cal.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3"
                    >
                      {/* Calendar Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">
                            {cal.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            Working Days: <span className="font-semibold text-slate-700">{daysShort || 'None'}</span> • Type:{' '}
                            <span className="font-semibold text-purple-700">{cal.calendar_type || 'shift'}</span>
                          </p>
                        </div>

                        {/* Right Buttons: + Add Shift Timing & Delete Calendar */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAddTimingModal(cal)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
                          >
                            <Icon name="plus" size={13} className="text-purple-600" />
                            <span>Add Shift Timing</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCalendar(cal.id, cal.name)}
                            title="Delete this work calendar"
                            className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition"
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Shift Timings Box List */}
                      <div className="space-y-2">
                        {timings.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 font-medium">
                            No shift timings added to this calendar yet. Click &ldquo;+ Add Shift Timing&rdquo; to configure schedule hours.
                          </div>
                        ) : (
                          timings.map((timing) => (
                            <div
                              key={timing.id}
                              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-purple-200 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/70">
                                  <Icon name="clock" size={14} />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">
                                    {timing.name}
                                  </div>
                                  <div className="text-xs font-mono text-slate-500 font-medium">
                                    {timing.start_time} - {timing.end_time}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTiming(cal.id, timing.id)}
                                title="Remove this shift timing"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Icon name="trash-2" size={13} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Standard Enterprise Shift Templates (Matching Image 1) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Standard Enterprise Shift Templates
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {shiftTemplates.map((tpl) => {
                const code = tpl.code.toUpperCase();
                // Match color accents from Image 1
                const isGen = code === 'GEN';
                const isMorn = code === 'MORN';
                const isEve = code === 'EVE';
                const isNgt = code === 'NGT' || code === 'NIGHT';

                const cardBg = isGen
                  ? 'bg-purple-50/40 border-purple-200/80'
                  : isMorn
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : isEve
                  ? 'bg-amber-50/40 border-amber-200/80'
                  : 'bg-indigo-50/40 border-indigo-200/80';

                const badgeColor = isGen
                  ? 'text-purple-700 bg-purple-100/70'
                  : isMorn
                  ? 'text-emerald-700 bg-emerald-100/70'
                  : isEve
                  ? 'text-amber-700 bg-amber-100/70'
                  : 'text-indigo-700 bg-indigo-100/70';

                const iconName = isGen ? 'sun' : isMorn ? 'sunrise' : isEve ? 'sunset' : 'moon';

                return (
                  <div
                    key={tpl.id}
                    className={cn(
                      'card p-4 rounded-2xl border shadow-2xs space-y-3 relative transition hover:shadow-xs',
                      cardBg
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase', badgeColor)}>
                        {tpl.code}
                      </span>
                      <Icon name={iconName} size={15} className="text-slate-400" />
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {tpl.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                        {tpl.start_time} - {tpl.end_time}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Break: {tpl.break_mins ?? 60} mins • Grace: {tpl.grace_period_mins ?? 15} mins
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* VIEW 2: WEEKLY SHIFT ROSTER MATRIX TABLE                      */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Icon
                name="search"
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name, employee code, email, designation..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Right Controls: View Switcher, Department Dropdown, Week Navigator */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* View Switcher: Flat List vs Team Hierarchy */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-bold hidden sm:inline">View:</span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                      viewMode === 'flat'
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Icon name="list" size={12} />
                    <span>Flat List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('hierarchy')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                      viewMode === 'hierarchy'
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    <Icon name="git-branch" size={12} />
                    <span>Team Hierarchy</span>
                  </button>
                </div>
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                >
                  <option value="ALL">
                    All Departments ({rosterData?.departments?.length ?? 0})
                  </option>
                  {(rosterData?.departments || []).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              {/* Week Navigator */}
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedWeekOffset((prev) => prev - 1)}
                  title="Previous Week"
                  className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                >
                  <Icon name="chevron-left" size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekOffset(0)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-800 hover:text-purple-700 cursor-pointer"
                >
                  {selectedWeekOffset === 0
                    ? 'This Week'
                    : selectedWeekOffset > 0
                    ? `+${selectedWeekOffset} Wk`
                    : `${selectedWeekOffset} Wk`}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekOffset((prev) => prev + 1)}
                  title="Next Week"
                  className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                >
                  <Icon name="chevron-right" size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Subtitle & Count Row */}
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
            <div>{rosterData?.week_label || 'Week of Current Schedule'}</div>
            <div className="text-slate-400">
              Showing {rosterData?.employees?.length ?? 0} of {rosterData?.total_staff ?? 0} staff
            </div>
          </div>

          {/* Main Shift Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                {/* Table Header */}
                <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={
                          (rosterData?.employees?.length ?? 0) > 0 &&
                          selectedEmployeeIds.length === (rosterData?.employees?.length ?? 0)
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 min-w-[220px]">EMPLOYEE PROFILE</th>
                    {(rosterData?.dates || []).map((d) => (
                      <th
                        key={d.date}
                        className={cn(
                          'py-3.5 px-3 text-center min-w-[120px]',
                          d.is_today && 'bg-purple-100/50 text-purple-900 font-black'
                        )}
                      >
                        <div className="font-extrabold">{d.day_name}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{d.formatted}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading shift roster...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !rosterData || rosterData.employees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 font-bold">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    rosterData.employees.map((emp) => {
                      const isSelected = selectedEmployeeIds.includes(emp.id);

                      return (
                        <tr
                          key={emp.id}
                          className={cn(
                            'hover:bg-slate-50/60 transition-colors',
                            isSelected && 'bg-purple-50/30'
                          )}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectEmployee(emp.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>

                          {/* Employee Profile Cell */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200">
                                {emp.initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 truncate">
                                  {emp.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {emp.code} • {emp.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Daily Shift Cells (Mon - Sun) */}
                          {(rosterData.dates || []).map((dateMeta) => {
                            const shift = emp.shifts[dateMeta.date];
                            const isOff = shift?.is_off || shift?.shift_code === 'OFF';
                            const code = shift?.shift_code || 'GEN';
                            const time = shift?.time_range || '09:00-18:00';

                            return (
                              <td
                                key={dateMeta.date}
                                onClick={() => handleCellClick(emp, dateMeta.date)}
                                className={cn(
                                  'py-2 px-2 text-center cursor-pointer transition-all',
                                  dateMeta.is_today && 'bg-purple-50/30'
                                )}
                              >
                                {isOff ? (
                                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:border-slate-400 hover:shadow-2xs transition">
                                    <div className="font-black text-xs text-slate-700 flex items-center justify-center gap-1">
                                      <Icon name="coffee" size={11} className="text-slate-400" />
                                      <span>OFF</span>
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-400">
                                      Rest Day
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200 hover:border-purple-400 hover:shadow-2xs transition">
                                    <div className="font-black text-xs text-purple-800 flex items-center justify-center gap-1">
                                      <Icon name="sun" size={11} className="text-purple-500" />
                                      <span>{code}</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-purple-700 font-bold">
                                      {time}
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODAL: ADD SHIFT TIMING TO CALENDAR (Matching Image 2)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddTimingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Add Shift to {targetCalendar?.name || 'Calendar'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTimingModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  SHIFT NAME
                </label>
                <input
                  type="text"
                  value={newTimingName}
                  onChange={(e) => setNewTimingName(e.target.value)}
                  placeholder="e.g. Night Shift"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    START TIME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newTimingStartTime}
                      onChange={(e) => setNewTimingStartTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <Icon name="clock" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                    END TIME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newTimingEndTime}
                      onChange={(e) => setNewTimingEndTime(e.target.value)}
                      placeholder="06:00 PM"
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <Icon name="clock" size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddTimingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingTiming}
                onClick={handleSaveShiftTiming}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition disabled:opacity-50"
              >
                {submittingTiming ? 'Adding...' : 'Add Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: QUICK SHIFT ASSIGNMENT (From cell click)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAssignModal && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">Assign Working Shift</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {modalTarget.employeeName} • {modalTarget.dateStr}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-1">
              {shiftTemplates.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setModalShiftCode(s.code)}
                  className={cn(
                    'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition',
                    modalShiftCode === s.code
                      ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300/40'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {s.name} {s.start_time && s.end_time ? `(${s.start_time} - ${s.end_time})` : ''}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {s.break_mins ? `Break: ${s.break_mins}m` : ''}
                      {s.grace_period_mins ? ` • Grace: ${s.grace_period_mins}m` : ''}
                    </div>
                  </div>
                  {modalShiftCode === s.code && (
                    <Icon name="check" size={14} className="text-purple-600 shrink-0" />
                  )}
                </div>
              ))}

              {/* Dynamic Weekly Off / Rest Day Option */}
              <div
                onClick={() => setModalShiftCode('OFF')}
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition',
                  modalShiftCode === 'OFF'
                    ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300/40'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <div>
                  <div className="font-bold text-slate-900">Weekly Off / Rest Day (OFF)</div>
                  <div className="text-[11px] text-slate-400">Non-working rest day</div>
                </div>
                {modalShiftCode === 'OFF' && (
                  <Icon name="check" size={14} className="text-purple-600 shrink-0" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShiftAssignment}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 transition"
              >
                Confirm Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: CREATE NEW WORK CALENDAR (Matching Screenshot)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showNewCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Icon name="calendar" size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Create New Work Calendar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCalendarModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewCalendar} className="space-y-4">
              {/* Calendar Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Calendar Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCalName}
                  onChange={(e) => setNewCalName(e.target.value)}
                  placeholder="Corporate 5-Day Standard Calendar"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {/* 2-column: Calendar Type & Weekly Preset */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Calendar Type *
                  </label>
                  <select
                    required
                    value={newCalType}
                    onChange={(e) => setNewCalType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="" disabled>Select Calendar Type</option>
                    <option value="Standard Corporate">Standard Corporate</option>
                    <option value="Shift Based">Shift Based</option>
                    <option value="Factory / Operations">Factory / Operations</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Weekly Preset *
                  </label>
                  <select
                    required
                    value={newCalPreset}
                    onChange={(e) => setNewCalPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="" disabled>Select Weekly Preset</option>
                    <option value="Mon – Fri (5 Days)">Mon – Fri (5 Days)</option>
                    <option value="Mon – Sat (6 Days)">Mon – Sat (6 Days)</option>
                    <option value="All 7 Days">All 7 Days</option>
                  </select>
                </div>
              </div>

              {/* Checkbox: Set as company default */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newCalIsDefault}
                  onChange={(e) => setNewCalIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700">
                  Set as company default work calendar
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCalendarModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Icon name="plus" size={13} />
                  <span>{submittingCal ? 'Creating...' : 'Create Calendar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
