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

  // Scope Filter: Employee vs Student (replacing Flat List / Team Hierarchy)
  const [rosterScope, setRosterScope] = useState<'employee' | 'student'>('employee');

  // Quick Shift Assignment Modal (from Roster cell click)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    employeeIds: string[];
    dateStr: string;
    employeeName?: string;
  } | null>(null);
  const [modalShiftCode, setModalShiftCode] = useState('');

  // Add Shift Timing Modal (matching Image 3)
  const [showAddTimingModal, setShowAddTimingModal] = useState(false);
  const [targetCalendar, setTargetCalendar] = useState<WorkCalendarItem | null>(null);
  const [newTimingName, setNewTimingName] = useState('');
  const [newTimingStartTime, setNewTimingStartTime] = useState('');
  const [newTimingEndTime, setNewTimingEndTime] = useState('');
  const [submittingTiming, setSubmittingTiming] = useState(false);

  // New Work Calendar Modal (Matching Image 2)
  const [showNewCalendarModal, setShowNewCalendarModal] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalWorkingDays, setNewCalWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [submittingCal, setSubmittingCal] = useState(false);

  // Shift Template Selection, Edit & Create States (Matching Item 1)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateCode, setTemplateCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateStartTime, setTemplateStartTime] = useState('');
  const [templateEndTime, setTemplateEndTime] = useState('');
  const [templateBreakMins, setTemplateBreakMins] = useState<number | ''>('');
  const [templateGraceMins, setTemplateGraceMins] = useState<number | ''>('');
  const [templateIsNight, setTemplateIsNight] = useState(false);
  const [templateColor, setTemplateColor] = useState('#7c3aed');
  const [submittingTemplate, setSubmittingTemplate] = useState(false);

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
        user_type: rosterScope,
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
  }, [currentWeekMondayStr, selectedDepartment, viewMode, rosterScope]);

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
    setNewTimingStartTime('');
    setNewTimingEndTime('');
    setShowAddTimingModal(true);
  };

  // Submit adding shift timing to calendar
  const handleSaveShiftTiming = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetCalendar) return;
    if (!newTimingName.trim()) {
      showToast('Please enter a shift name');
      return;
    }
    if (!newTimingStartTime.trim() || !newTimingEndTime.trim()) {
      showToast('Start time and end time are required');
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
      showToast(err?.response?.data?.detail || err?.message || 'Failed to add shift timing');
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
      showToast(err?.response?.data?.detail || err?.message || 'Failed to remove shift timing');
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
      showToast(err?.response?.data?.detail || err?.message || 'Failed to delete work calendar');
    }
  };

  // Create new work calendar (matching Image 2)
  const handleCreateNewCalendar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCalName.trim()) {
      showToast('Please enter a calendar name');
      return;
    }
    if (newCalWorkingDays.length === 0) {
      showToast('Please select at least one working day');
      return;
    }
    setSubmittingCal(true);
    try {
      const dayMap: Record<string, string> = {
        Mon: 'Monday',
        Tue: 'Tuesday',
        Wed: 'Wednesday',
        Thu: 'Thursday',
        Fri: 'Friday',
        Sat: 'Saturday',
        Sun: 'Sunday',
      };
      const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const days = newCalWorkingDays.map((d) => dayMap[d] || d);
      const offs = allDays.filter((d) => !newCalWorkingDays.includes(d)).map((d) => dayMap[d] || d);

      await hrmsApi.saveWorkCalendar({
        name: newCalName.trim(),
        calendar_type: 'shift',
        is_default: false,
        working_days: days,
        weekly_off_days: offs,
        is_active: true,
      });
      showToast(`Work calendar "${newCalName}" created successfully.`);
      setShowNewCalendarModal(false);
      setNewCalName('');
      setNewCalWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      fetchTemplatesAndCalendars();
      fetchRoster();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to create work calendar');
    } finally {
      setSubmittingCal(false);
    }
  };

  // Shift Template Handlers: Add, Edit, Delete (Matching Item 1)
  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null);
    setTemplateCode('');
    setTemplateName('');
    setTemplateStartTime('');
    setTemplateEndTime('');
    setTemplateBreakMins('');
    setTemplateGraceMins('');
    setTemplateIsNight(false);
    setTemplateColor('#7c3aed');
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = (tpl: ShiftTemplateItem) => {
    setEditingTemplateId(tpl.id);
    setTemplateCode(tpl.code);
    setTemplateName(tpl.name);
    setTemplateStartTime(tpl.start_time || '');
    setTemplateEndTime(tpl.end_time || '');
    setTemplateBreakMins(tpl.break_mins ?? '');
    setTemplateGraceMins(tpl.grace_period_mins ?? '');
    setTemplateIsNight(Boolean(tpl.is_night_shift));
    setTemplateColor(tpl.color || '#7c3aed');
    setShowTemplateModal(true);
  };

  const handleSaveShiftTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateCode.trim() || !templateName.trim()) {
      showToast('Shift code and name are required');
      return;
    }
    setSubmittingTemplate(true);
    try {
      await hrmsApi.saveShiftTemplate({
        id: editingTemplateId || undefined,
        code: templateCode.trim().toUpperCase(),
        name: templateName.trim(),
        start_time: templateStartTime.trim(),
        end_time: templateEndTime.trim(),
        break_mins: templateBreakMins !== '' ? Number(templateBreakMins) : 0,
        grace_period_mins: templateGraceMins !== '' ? Number(templateGraceMins) : 0,
        is_night_shift: templateIsNight,
        color: templateColor,
        is_active: true,
      });
      showToast(`Shift template "${templateName}" saved successfully.`);
      setShowTemplateModal(false);
      fetchTemplatesAndCalendars();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to save shift template');
    } finally {
      setSubmittingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, tplName: string) => {
    if (!confirm(`Are you sure you want to delete shift template "${tplName}"?`)) return;
    try {
      await hrmsApi.deleteShiftTemplate(templateId);
      showToast(`Shift template "${tplName}" deleted.`);
      setSelectedTemplateIds((prev) => prev.filter((id) => id !== templateId));
      fetchTemplatesAndCalendars();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to delete shift template');
    }
  };

  const handleBulkDeleteTemplates = async () => {
    if (selectedTemplateIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTemplateIds.length} selected shift templates?`)) return;
    try {
      await Promise.all(selectedTemplateIds.map((id) => hrmsApi.deleteShiftTemplate(id)));
      showToast(`Deleted ${selectedTemplateIds.length} shift templates.`);
      setSelectedTemplateIds([]);
      fetchTemplatesAndCalendars();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to delete selected templates');
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
              setNewCalWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
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
        /* VIEW 1: SHIFT TEMPLATES                                       */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Standard Enterprise Shift Templates (Matching Image 1 & Item 1) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Standard Enterprise Shift Templates
                </h2>
                {shiftTemplates.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedTemplateIds.length === shiftTemplates.length && shiftTemplates.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplateIds(shiftTemplates.map((t) => t.id));
                        } else {
                          setSelectedTemplateIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                    />
                    <span>Select All</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedTemplateIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteTemplates}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                  >
                    <Icon name="trash-2" size={13} />
                    <span>Delete Selected ({selectedTemplateIds.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenAddTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition cursor-pointer"
                >
                  <Icon name="plus" size={13} />
                  <span>Add Shift Template</span>
                </button>
              </div>
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

                const isChecked = selectedTemplateIds.includes(tpl.id);

                return (
                  <div
                    key={tpl.id}
                    className={cn(
                      'card p-4 rounded-2xl border shadow-2xs space-y-3 relative transition hover:shadow-xs',
                      cardBg,
                      isChecked && 'ring-2 ring-purple-600'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedTemplateIds((prev) =>
                              prev.includes(tpl.id) ? prev.filter((id) => id !== tpl.id) : [...prev, tpl.id]
                            );
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                        />
                        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase', badgeColor)}>
                          {tpl.code}
                        </span>
                      </div>

                      {/* Action buttons: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tpl)}
                          title="Edit this shift template"
                          className="p-1 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-white/80 transition cursor-pointer"
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          title="Delete this shift template"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition cursor-pointer"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {tpl.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-1">
                        {tpl.start_time} - {tpl.end_time}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Break: {tpl.break_mins ?? 0} mins • Grace: {tpl.grace_period_mins ?? 0} mins
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
                placeholder={`Search ${rosterScope === 'student' ? 'students' : 'staff'} by name, code, designation...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Right Controls: Scope Selector, Department Dropdown, Week Navigator */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              {/* Scope Selector: Employee vs Students (Replacing Flat List vs Team Hierarchy) */}
              <div className="flex items-center gap-1.5 bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-200/60 shadow-2xs">
                <span className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                  Scope:
                </span>
                <select
                  value={rosterScope}
                  onChange={(e) => {
                    setRosterScope(e.target.value as 'employee' | 'student');
                    setSelectedDepartment('ALL');
                    setSearchQuery('');
                  }}
                  className="bg-white text-purple-700 px-3 py-1.5 rounded-lg text-xs font-black border-0 shadow-xs focus:outline-none cursor-pointer hover:bg-purple-50 transition"
                >
                  <option value="employee"> Employees Roster</option>
                  <option value="student">Students Roster</option>
                </select>
              </div>

              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                >
                  <option value="ALL">
                    All {rosterScope === 'student' ? 'Courses' : 'Departments'} ({rosterData?.departments?.length ?? 0})
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
              Showing {rosterData?.employees?.length ?? 0} of {rosterData?.total_staff ?? 0} {rosterScope === 'student' ? 'students' : 'staff'}
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
                    <th className="py-3.5 px-4 min-w-[220px]">
                      {rosterScope === 'student' ? 'STUDENT PROFILE' : 'EMPLOYEE PROFILE'}
                    </th>
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
      {/* 4. MODAL: ADD SHIFT TIMING TO CALENDAR (Matching Image 3)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAddTimingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-bold text-slate-900">
                Add Shift to {targetCalendar?.name || 'Day Shift'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTimingModal(false)}
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveShiftTiming} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  SHIFT NAME
                </label>
                <input
                  type="text"
                  required
                  value={newTimingName}
                  onChange={(e) => setNewTimingName(e.target.value)}
                  placeholder="e.g. Night Shift"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    START TIME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newTimingStartTime}
                      onChange={(e) => setNewTimingStartTime(e.target.value)}
                      placeholder="09:00 AM"
                      className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <Icon name="clock" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    END TIME
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newTimingEndTime}
                      onChange={(e) => setNewTimingEndTime(e.target.value)}
                      placeholder="06:00 PM"
                      className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <Icon name="clock" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTimingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTiming}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingTiming ? 'Adding...' : 'Add Shift'}
                </button>
              </div>
            </form>
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
      {/* 6. MODAL: CREATE NEW WORK CALENDAR (Matching Image 2)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showNewCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-bold text-slate-900">
                New Shift Calendar
              </h3>
              <button
                type="button"
                onClick={() => setShowNewCalendarModal(false)}
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateNewCalendar} className="space-y-4">
              {/* Calendar Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  CALENDAR NAME
                </label>
                <input
                  type="text"
                  required
                  value={newCalName}
                  onChange={(e) => setNewCalName(e.target.value)}
                  placeholder="e.g. Standard Rotating Shifts"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {/* Working Days Pill Selector (Matching Screenshot) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  WORKING DAYS
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    const isSelected = newCalWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setNewCalWorkingDays((prev) =>
                            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                          );
                        }}
                        className={cn(
                          'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCalendarModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCal}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingCal ? 'Creating...' : 'Create Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: ADD / EDIT SHIFT TEMPLATE (Matching Item 1)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-bold text-slate-900">
                {editingTemplateId ? 'Edit Shift Template' : 'Add Shift Template'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveShiftTemplate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    SHIFT CODE *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateCode}
                    onChange={(e) => setTemplateCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GEN"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    SHIFT NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. General Shift"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    START TIME
                  </label>
                  <input
                    type="text"
                    value={templateStartTime}
                    onChange={(e) => setTemplateStartTime(e.target.value)}
                    placeholder="09:00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    END TIME
                  </label>
                  <input
                    type="text"
                    value={templateEndTime}
                    onChange={(e) => setTemplateEndTime(e.target.value)}
                    placeholder="18:00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    BREAK (MINS)
                  </label>
                  <input
                    type="number"
                    value={templateBreakMins}
                    onChange={(e) => setTemplateBreakMins(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="60"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    GRACE PERIOD (MINS)
                  </label>
                  <input
                    type="number"
                    value={templateGraceMins}
                    onChange={(e) => setTemplateGraceMins(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="15"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={templateIsNight}
                    onChange={(e) => setTemplateIsNight(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-700">Night Shift</span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500">Color</label>
                  <input
                    type="color"
                    value={templateColor}
                    onChange={(e) => setTemplateColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTemplate}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingTemplate ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Add Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
