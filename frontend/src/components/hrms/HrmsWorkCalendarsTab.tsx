import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { hrmsApi, type CompanyHolidayItem } from '@/services/hrmsApi';
import { HrmsImportExportControls } from './HrmsImportExportControls';

const ALL_WEEK_DAYS = [
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
];

interface HrmsWorkCalendarsTabProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsWorkCalendarsTab({ onSuccessToast }: HrmsWorkCalendarsTabProps) {
  // Calendar Form State
  const [calendarId, setCalendarId] = useState<string>('');
  const [calendarName, setCalendarName] = useState<string>('');
  const [calendarType, setCalendarType] = useState<string>('');
  const [customCalendarType, setCustomCalendarType] = useState<string>('');
  const [isCustomType, setIsCustomType] = useState<boolean>(false);
  const [calendarDepartment, setCalendarDepartment] = useState<string>('All');
  const [modalDepartment, setModalDepartment] = useState<string>('All');
  const [departmentList, setDepartmentList] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Active');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [allCalendars, setAllCalendars] = useState<any[]>([]);

  // Main Page Day-to-Day Range State
  const [mainRangeStart, setMainRangeStart] = useState<string>('Monday');
  const [mainRangeEnd, setMainRangeEnd] = useState<string>('Friday');

  // Create Calendar Modal State (Matching Screenshot)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [modalCalName, setModalCalName] = useState<string>('');
  const [modalCalType, setModalCalType] = useState<string>('');
  const [modalCustomCalType, setModalCustomCalType] = useState<string>('');
  const [modalIsCustomType, setModalIsCustomType] = useState<boolean>(false);
  const [modalWeeklyPreset, setModalWeeklyPreset] = useState<string>('');
  const [modalRangeStart, setModalRangeStart] = useState<string>('');
  const [modalRangeEnd, setModalRangeEnd] = useState<string>('');
  const [modalWorkingDays, setModalWorkingDays] = useState<string[]>([]);
  const [modalIsDefault, setModalIsDefault] = useState<boolean>(false);
  const [creatingCalendar, setCreatingCalendar] = useState<boolean>(false);

  // Derive dynamic calendar types from DB
  const existingCalendarTypes = useMemo(() => {
    const types = new Set<string>();
    allCalendars.forEach((c) => {
      if (c.calendar_type && typeof c.calendar_type === 'string' && c.calendar_type.trim()) {
        types.add(c.calendar_type.trim());
      }
    });
    if (types.size === 0) {
      types.add('Standard Corporate');
      types.add('Shift Based');
      types.add('Factory / Operations');
      types.add('Retail & Field');
    }
    return Array.from(types);
  }, [allCalendars]);

  // Compute contiguous or wrapped day-to-day range
  const computeDayRange = (startDay: string, endDay: string): string[] => {
    if (!startDay || !endDay) return [];
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sIdx = daysOrder.indexOf(startDay);
    const eIdx = daysOrder.indexOf(endDay);
    if (sIdx === -1 || eIdx === -1) return [];
    if (sIdx <= eIdx) {
      return daysOrder.slice(sIdx, eIdx + 1);
    } else {
      return [...daysOrder.slice(sIdx), ...daysOrder.slice(0, eIdx + 1)];
    }
  };

  // Holidays State
  const [holidays, setHolidays] = useState<CompanyHolidayItem[]>([]);
  const [holidaySearch, setHolidaySearch] = useState<string>('');
  const [holidayTypeFilter, setHolidayTypeFilter] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Modals & Loaders
  const [loading, setLoading] = useState<boolean>(true);
  const [savingCalendar, setSavingCalendar] = useState<boolean>(false);
  const [preSeeding, setPreSeeding] = useState<boolean>(false);
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState<string>('');
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayType, setHolidayType] = useState<string>('');
  const [holidayDesc, setHolidayDesc] = useState<string>('');
  const [savingHoliday, setSavingHoliday] = useState<boolean>(false);

  const showToast = (msg: string) => {
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Fetch initial Calendars & Holidays
  const loadData = async (targetCalId?: string) => {
    setLoading(true);
    try {
      const [calsRes, holsRes, deptsRes] = await Promise.all([
        hrmsApi.getWorkCalendars(),
        hrmsApi.getHolidays({ year: selectedYear, type: holidayTypeFilter !== 'ALL' ? holidayTypeFilter : undefined }),
        hrmsApi.getDepartments().catch(() => []),
      ]);

      if (Array.isArray(deptsRes)) {
        setDepartmentList(deptsRes.map((d: any) => d.name).filter(Boolean));
      }

      if (Array.isArray(calsRes) && calsRes.length > 0) {
        setAllCalendars(calsRes);
        const resolvedId = targetCalId || calendarId;
        const primary = (resolvedId ? calsRes.find((c: any) => c.id === resolvedId) : null) || calsRes.find((c: any) => c.is_default) || calsRes[0];
        setCalendarId(primary.id);
        setCalendarName(primary.name || '');
        setCalendarType(primary.calendar_type || '');
        setCalendarDepartment(primary.department || 'All');
        setStatus(primary.is_active ? 'Active' : 'Inactive');
        setIsDefault(Boolean(primary.is_default));
        if (primary.working_days && Array.isArray(primary.working_days) && primary.working_days.length > 0) {
          setWorkingDays(primary.working_days);
          setMainRangeStart(primary.working_days[0] || 'Monday');
          setMainRangeEnd(primary.working_days[primary.working_days.length - 1] || 'Friday');
        } else if (primary.weekly_off_days && Array.isArray(primary.weekly_off_days)) {
          const wDays = ALL_WEEK_DAYS.map((d) => d.full).filter((d) => !primary.weekly_off_days.includes(d));
          setWorkingDays(wDays);
          if (wDays.length > 0) {
            setMainRangeStart(wDays[0]);
            setMainRangeEnd(wDays[wDays.length - 1]);
          }
        }
      } else {
        setAllCalendars([]);
      }

      setHolidays(Array.isArray(holsRes) ? holsRes : []);
    } catch (e) {
      console.error('Failed to load work calendar settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Toggle single day
  const toggleWorkingDay = (dayFull: string) => {
    if (workingDays.includes(dayFull)) {
      if (workingDays.length <= 1) {
        showToast('At least 1 working day must be configured.');
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== dayFull));
    } else {
      setWorkingDays([...workingDays, dayFull]);
    }
  };

  // Presets
  const applyPreset = (preset: '5' | '6' | '7') => {
    if (preset === '5') {
      setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    } else if (preset === '6') {
      setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    } else if (preset === '7') {
      setWorkingDays(ALL_WEEK_DAYS.map((d) => d.full));
    }
  };

  // Weekly off days computed
  const weeklyOffDays = useMemo(() => {
    return ALL_WEEK_DAYS.map((d) => d.full).filter((d) => !workingDays.includes(d));
  }, [workingDays]);

  // Save Working Calendar (Entire Page Changes Persisted)
  const handleSaveCalendar = async () => {
    const finalName = calendarName.trim() || 'Standard 5-Day General Work Calendar';
    const resolvedType = (isCustomType ? customCalendarType.trim() : calendarType.trim()) || 'Standard Corporate';
    const finalWorkingDays = workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const finalWeeklyOffs = ALL_WEEK_DAYS.map((d) => d.full).filter((d) => !finalWorkingDays.includes(d));

    setSavingCalendar(true);
    try {
      const savedRes = await hrmsApi.saveWorkCalendar({
        id: calendarId || undefined,
        name: finalName,
        calendar_type: resolvedType,
        department: calendarDepartment || 'All',
        is_default: isDefault,
        working_days: finalWorkingDays,
        weekly_off_days: finalWeeklyOffs,
        is_active: status === 'Active',
      });
      const resolvedId = savedRes?.id || calendarId;
      if (resolvedId) {
        setCalendarId(resolvedId);
      }
      setCalendarName(finalName);
      setCalendarType(resolvedType);
      setWorkingDays(finalWorkingDays);
      setIsCustomType(false);
      showToast('Working calendar policy and settings saved successfully!');
      await loadData(resolvedId);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || e?.message || 'Failed to save calendar.');
    } finally {
      setSavingCalendar(false);
    }
  };

  // Delete Work Calendar
  const handleDeleteCalendar = async (id: string, name: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete work calendar "${name}"?`)) {
      return;
    }
    try {
      await hrmsApi.deleteWorkCalendar(id);
      showToast(`Work calendar "${name}" deleted successfully.`);
      setCalendarId('');
      setCalendarName('');
      await loadData();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || e?.message || 'Failed to delete calendar.');
    }
  };

  // Create Calendar Modal Submit (Dynamic Type & Editable Days-to-Day Range)
  const handleCreateCalendarSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalCalName.trim()) {
      showToast('Please enter a calendar name.');
      return;
    }
    const resolvedType = modalIsCustomType ? modalCustomCalType.trim() : modalCalType.trim();
    if (!resolvedType) {
      showToast('Please select or enter a calendar type.');
      return;
    }
    if (modalWorkingDays.length === 0) {
      showToast('Please configure at least 1 working day.');
      return;
    }
    setCreatingCalendar(true);
    try {
      const offs = ALL_WEEK_DAYS.map((d) => d.full).filter((d) => !modalWorkingDays.includes(d));

      const res = await hrmsApi.saveWorkCalendar({
        name: modalCalName.trim(),
        calendar_type: resolvedType,
        department: modalDepartment || 'All',
        is_default: modalIsDefault,
        working_days: modalWorkingDays,
        weekly_off_days: offs,
        is_active: true,
      });

      showToast(`Work Calendar "${modalCalName.trim()}" created successfully!`);
      setShowCreateModal(false);
      const newId = res?.id;
      if (newId) {
        setCalendarId(newId);
      }
      await loadData(newId);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to create work calendar.');
    } finally {
      setCreatingCalendar(false);
    }
  };

  // Pre-seed Holidays
  const handlePreSeed = async () => {
    setPreSeeding(true);
    try {
      const res = await hrmsApi.preseedHolidays(selectedYear);
      showToast(res.message || `Pre-seeded ${res.inserted_count} holidays for ${selectedYear}.`);
      loadData();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || e?.message || 'Failed to pre-seed holidays.');
    } finally {
      setPreSeeding(false);
    }
  };

  // Open Add Holiday Modal
  const handleOpenAddHoliday = () => {
    setEditingHolidayId(null);
    setHolidayName('');
    setHolidayDate('');
    setHolidayType('');
    setHolidayDesc('');
    setShowHolidayModal(true);
  };

  // Open Edit Holiday Modal
  const handleOpenEditHoliday = (h: CompanyHolidayItem) => {
    setEditingHolidayId(h.id || null);
    setHolidayName(h.name || '');
    setHolidayDate(h.date || '');
    setHolidayType(h.holiday_type || '');
    setHolidayDesc(h.description || '');
    setShowHolidayModal(true);
  };

  // Save Holiday (Create or Update)
  const handleSaveHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) {
      showToast('Please provide both holiday name and date.');
      return;
    }
    setSavingHoliday(true);
    try {
      await hrmsApi.saveHoliday({
        id: editingHolidayId || undefined,
        name: holidayName.trim(),
        date: holidayDate,
        year: parseInt(holidayDate.split('-')[0], 10) || selectedYear,
        holiday_type: holidayType || 'Public',
        description: holidayDesc.trim() || undefined,
        calendar_id: calendarId || undefined,
      });
      showToast(
        editingHolidayId
          ? `Holiday "${holidayName}" updated successfully.`
          : `Holiday "${holidayName}" added successfully.`
      );
      setShowHolidayModal(false);
      setEditingHolidayId(null);
      setHolidayName('');
      setHolidayDate('');
      setHolidayType('');
      setHolidayDesc('');
      loadData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to save holiday.');
    } finally {
      setSavingHoliday(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (hId: string, hName: string) => {
    if (!confirm(`Are you sure you want to delete holiday "${hName}"?`)) return;
    try {
      await hrmsApi.deleteHoliday(hId);
      showToast(`Holiday "${hName}" deleted.`);
      setHolidays((prev) => prev.filter((h) => h.id !== hId));
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to delete holiday.');
    }
  };

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchSearch =
        !holidaySearch.trim() ||
        h.name.toLowerCase().includes(holidaySearch.toLowerCase()) ||
        h.date.includes(holidaySearch);
      const matchType =
        holidayTypeFilter === 'ALL' ||
        (h.holiday_type && h.holiday_type.toLowerCase() === holidayTypeFilter.toLowerCase());
      return matchSearch && matchType;
    });
  }, [holidays, holidaySearch, holidayTypeFilter]);

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION (Matching Screenshot 4)                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Icon name="calendar" size={18} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Work Calendars
              </h1>
              <p className="text-xs text-slate-500 font-medium">

              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalCalName('');
              setModalCalType('');
              setModalCustomCalType('');
              setModalDepartment('All');
              setModalIsCustomType(false);
              setModalWeeklyPreset('');
              setModalRangeStart('');
              setModalRangeEnd('');
              setModalWorkingDays([]);
              setModalIsDefault(false);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Icon name="plus" size={13} />
            <span>New Work Calendar</span>
          </button>

          <button
            type="button"
            disabled={preSeeding}
            onClick={handlePreSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Icon name="sparkles" size={13} className="text-amber-600" />
            <span>{preSeeding ? 'Seeding...' : `Pre-Seed ${selectedYear}/${selectedYear + 1} Holidays`}</span>
          </button>

          <button
            type="button"
            disabled={savingCalendar}
            onClick={handleSaveCalendar}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition cursor-pointer disabled:opacity-50"
          >
            <Icon name="save" size={13} />
            <span>{savingCalendar ? 'Saving...' : 'Save Working Calendar'}</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4 SUMMARY STAT CARDS (Matching Screenshot 4)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Icon name="calendar-check" size={13} />
            <span>Available Work Calendars:</span>
          </div>
          {allCalendars.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {allCalendars.map((cal) => (
                <div
                  key={cal.id}
                  className={cn(
                    'inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs',
                    calendarId === cal.id
                      ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-600/30'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                  )}
                  onClick={() => {
                    setCalendarId(cal.id);
                    setCalendarName(cal.name || '');
                    setCalendarType(cal.calendar_type || '');
                    setCalendarDepartment(cal.department || 'All');
                    setStatus(cal.is_active ? 'Active' : 'Inactive');
                    setIsDefault(Boolean(cal.is_default));
                    if (cal.working_days && Array.isArray(cal.working_days) && cal.working_days.length > 0) {
                      setWorkingDays(cal.working_days);
                      setMainRangeStart(cal.working_days[0] || 'Monday');
                      setMainRangeEnd(cal.working_days[cal.working_days.length - 1] || 'Friday');
                    } else if (cal.weekly_off_days && Array.isArray(cal.weekly_off_days)) {
                      const wDays = ALL_WEEK_DAYS.map((d) => d.full).filter((d) => !cal.weekly_off_days.includes(d));
                      setWorkingDays(wDays);
                      if (wDays.length > 0) {
                        setMainRangeStart(wDays[0]);
                        setMainRangeEnd(wDays[wDays.length - 1]);
                      }
                    }
                  }}
                >
                  <span className="font-extrabold">{cal.name}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider',
                      calendarId === cal.id
                        ? 'bg-purple-700/80 text-white'
                        : cal.is_default
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {cal.is_default ? '★ Default' : (cal.department && cal.department !== 'All' ? cal.department : 'Custom')}
                  </span>

                  {allCalendars.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCalendar(cal.id, cal.name);
                      }}
                      title={`Delete "${cal.name}"`}
                      className={cn(
                        'p-1 rounded-md transition cursor-pointer',
                        calendarId === cal.id
                          ? 'text-white/70 hover:text-white hover:bg-white/20'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'
                      )}
                    >
                      <Icon name="trash-2" size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Active Calendar */}
          <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Calendar
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                  {calendarType || 'STANDARD'}
                </span>
                {allCalendars.length > 1 && calendarId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCalendar(calendarId, calendarName)}
                    title={`Delete "${calendarName}"`}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Icon name="trash-2" size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-base font-black text-slate-900 truncate">{calendarName}</h3>
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {isDefault ? 'Company Policy' : (calendarDepartment && calendarDepartment !== 'All' ? `Department: ${calendarDepartment}` : 'Custom Work Policy')}
              </p>
            </div>
          </div>

          {/* Card 2: Configured Working Days */}
          <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Configured Working Days
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {workingDays.length} / 7 Days
              </span>
            </div>
            <div className="mt-2">
              <h3 className="text-base font-black text-slate-900">
                {workingDays.length === 5
                  ? 'Mon – Fri (5-Day Week)'
                  : workingDays.length === 6
                    ? 'Mon – Sat (6-Day Week)'
                    : `${workingDays.length} Working Days`}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5 truncate">
                {workingDays.map((d) => d.slice(0, 3)).join(', ')}
              </p>
            </div>
          </div>

          {/* Card 3: Annual Holidays */}
          <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Annual Holidays ({selectedYear})
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Icon name="sun" size={13} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-base font-black text-slate-900">
                {holidays.length} Holidays
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                ,
              </p>
            </div>
          </div>

          {/* Card 4: Payroll & Attendance Sync */}
          <div className="card p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Payroll &amp; Attendance Sync
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Icon name="check" size={14} />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-base font-black text-emerald-700">Active &amp; Enforced</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">

              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TWO COLUMNS: WORKING DAYS & HOLIDAYS ROSTER (Matching Screenshots 4 & 5) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: WORKING DAYS & CALENDAR POLICY */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Icon name="clock" size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Working Days &amp; Calendar Policy
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Define business cycle days and weekend policies.
                  </p>
                </div>
              </div>
            </div>

            {/* Calendar Name & Applicable Department Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Calendar Name</label>
                <input
                  type="text"
                  value={calendarName}
                  onChange={(e) => setCalendarName(e.target.value)}
                  placeholder="e.g. Standard Corporate Calendar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Applicable Department</label>
                <select
                  value={calendarDepartment}
                  onChange={(e) => setCalendarDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="All">All Departments (Company-wide)</option>
                  {departmentList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type & Status Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Calendar Type</label>
                  {isCustomType ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomType(false)}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      Choose Existing
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomType(true);
                        setCustomCalendarType('');
                      }}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      + New Type
                    </button>
                  )}
                </div>
                {isCustomType ? (
                  <input
                    type="text"
                    value={customCalendarType}
                    onChange={(e) => setCustomCalendarType(e.target.value)}
                    placeholder="e.g. Rotational 3-Shift"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    autoFocus
                  />
                ) : (
                  <select
                    value={calendarType}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCustomType(true);
                        setCustomCalendarType('');
                      } else {
                        setCalendarType(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="" disabled>Select Calendar Type</option>
                    {existingCalendarTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__NEW__">+ Add Custom Calendar Type...</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Default Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/50 border border-purple-100 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 mt-0.5"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-900 block">
                  Set as Default Work Calendar
                </span>
                <span className="text-[11px] text-slate-500">
                  Applies automatically to all employees without a custom shift scheme.
                </span>
              </div>
            </label>

            {/* Company Working Days Presets & List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Company Working Days
                </label>
                <span className="text-xs font-black text-purple-700">
                  {workingDays.length} Days Selected
                </span>
              </div>

              {/* Presets Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('5')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-bold text-center border transition',
                    workingDays.length === 5 && !workingDays.includes('Saturday') && !workingDays.includes('Sunday')
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  Mon – Fri (5 Days)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('6')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-bold text-center border transition',
                    workingDays.length === 6 && !workingDays.includes('Sunday')
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  Mon – Sat (6 Days)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('7')}
                  className={cn(
                    'py-2 px-2 rounded-xl text-xs font-bold text-center border transition',
                    workingDays.length === 7
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  All 7 Days
                </button>
              </div>

              {/* Editable Day-to-Day Range Selector */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Day Range:
                </span>
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <select
                    value={mainRangeStart}
                    onChange={(e) => setMainRangeStart(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex-1"
                  >
                    {ALL_WEEK_DAYS.map((d) => (
                      <option key={d.full} value={d.full}>{d.short}</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-400">to</span>
                  <select
                    value={mainRangeEnd}
                    onChange={(e) => setMainRangeEnd(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex-1"
                  >
                    {ALL_WEEK_DAYS.map((d) => (
                      <option key={d.full} value={d.full}>{d.short}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const range = computeDayRange(mainRangeStart, mainRangeEnd);
                      setWorkingDays(range);
                      showToast(`Applied ${range.length}-day range: ${range.map((d) => d.slice(0, 3)).join(', ')}`);
                    }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    Apply Range
                  </button>
                </div>
              </div>

              {/* 7 Days Toggle Rows (Matching Screenshot 5) */}
              <div className="space-y-2 pt-1">
                {ALL_WEEK_DAYS.map((d) => {
                  const isWork = workingDays.includes(d.full);
                  return (
                    <div
                      key={d.full}
                      onClick={() => toggleWorkingDay(d.full)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer',
                        isWork
                          ? 'bg-emerald-50/50 border-emerald-200/90'
                          : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black',
                            isWork ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                          )}
                        >
                          {isWork ? '✓' : '✕'}
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {d.full}{' '}
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({d.short})
                          </span>
                        </span>
                      </div>

                      {isWork ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100/90 text-emerald-800">
                          Working Day
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-600">
                          Week Off (WO)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* How Week-Offs Are Processed Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Icon name="info" size={13} className="text-purple-600" />
                  <span>How Week-Offs Are Processed</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Days marked as <strong>Week Off (WO)</strong> are treated as non-working paid rest days. Attendance matrix automatically categorizes them without marking unexcused absence, and payroll does not apply deductions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FESTIVAL & NATIONAL HOLIDAYS ROSTER (Matching Screenshot 4) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                  <Icon name="sun" size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    Festival &amp; National Holidays Roster
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Configure company observed public, festival, and statutory national holidays.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                <HrmsImportExportControls
                  type="holidays"
                  dataToExport={filteredHolidays}
                  onImportSuccess={() => {
                    loadData();
                    showToast('Holidays updated successfully from import.');
                  }}
                >
                  <button
                    type="button"
                    onClick={handleOpenAddHoliday}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Icon name="plus" size={13} />
                    <span>Add Holiday</span>
                  </button>
                </HrmsImportExportControls>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={holidaySearch}
                  onChange={(e) => setHolidaySearch(e.target.value)}
                  placeholder="Search holiday name or date..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <select
                value={holidayTypeFilter}
                onChange={(e) => setHolidayTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="National">National</option>
                <option value="Festival">Festival</option>
                <option value="Gazetted">Gazetted</option>
                <option value="Public">Public</option>
                <option value="Company">Company</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-purple-700 focus:outline-none cursor-pointer"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            {/* Holidays List / Table */}
            {filteredHolidays.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">
                  🌴
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">No holidays found for this filter</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add custom festival dates or pre-seed standard {selectedYear} national &amp; festival holidays with 1 click.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={preSeeding}
                  onClick={handlePreSeed}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition"
                >
                  <Icon name="sparkles" size={13} />
                  <span>Pre-Seed {selectedYear} Holidays</span>
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                {filteredHolidays.map((h) => (
                  <div
                    key={h.id || h.name}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-black uppercase leading-tight">
                          {h.formatted_date?.split(' ')[1] || 'DAY'}
                        </span>
                        <span className="text-xs font-black leading-tight">
                          {h.formatted_date?.split(' ')[0] || ''}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {h.name}
                          </h4>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider',
                              h.holiday_type?.toLowerCase() === 'national'
                                ? 'bg-rose-100 text-rose-800'
                                : h.holiday_type?.toLowerCase() === 'festival'
                                  ? 'bg-amber-100 text-amber-800'
                                  : h.holiday_type?.toLowerCase() === 'gazetted'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {h.holiday_type || 'Public'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {h.day_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditHoliday(h)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                        title="Edit Holiday"
                      >
                        <Icon name="edit-2" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => h.id && handleDeleteHoliday(h.id, h.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Holiday"
                      >
                        <Icon name="trash-2" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT HOLIDAY MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Icon name="calendar" size={16} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingHolidayId ? 'Edit Holiday' : 'Add Custom Holiday'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHolidaySubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g. Founder's Day / Regional Festival"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Holiday Type</label>
                  <select
                    value={holidayType}
                    onChange={(e) => setHolidayType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="" disabled>Select Holiday Type</option>
                    <option value="National">National</option>
                    <option value="Festival">Festival</option>
                    <option value="Gazetted">Gazetted</option>
                    <option value="Public">Public</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <input
                  type="text"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  placeholder="Optional details or instructions"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHolidayModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {savingHoliday ? 'Saving...' : editingHolidayId ? 'Save Changes' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CREATE NEW WORK CALENDAR MODAL (Matching Given UI & UX)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
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
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition rounded-lg"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCalendarSubmit} className="space-y-4">
              {/* Calendar Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Calendar Name *
                </label>
                <input
                  type="text"
                  required
                  value={modalCalName}
                  onChange={(e) => setModalCalName(e.target.value)}
                  placeholder="Enter work calendar name..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {/* Applicable Department / Scope */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Applicable Department / Scope
                </label>
                <select
                  value={modalDepartment}
                  onChange={(e) => setModalDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                  <option value="All">All Departments (Company-wide)</option>
                  {departmentList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2-column: Calendar Type & Weekly Preset */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Calendar Type *
                    </label>
                    {modalIsCustomType ? (
                      <button
                        type="button"
                        onClick={() => setModalIsCustomType(false)}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                      >
                        Existing
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModalIsCustomType(true);
                          setModalCustomCalType('');
                        }}
                        className="text-[10px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                      >
                        + New
                      </button>
                    )}
                  </div>
                  {modalIsCustomType ? (
                    <input
                      type="text"
                      required
                      value={modalCustomCalType}
                      onChange={(e) => setModalCustomCalType(e.target.value)}
                      placeholder="e.g. Rotational Shift"
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      autoFocus
                    />
                  ) : (
                    <select
                      required
                      value={modalCalType}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setModalIsCustomType(true);
                          setModalCustomCalType('');
                        } else {
                          setModalCalType(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="" disabled>Select Calendar Type</option>
                      {existingCalendarTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__NEW__">+ Add Custom Calendar Type...</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Weekly Preset *
                  </label>
                  <select
                    value={modalWeeklyPreset}
                    onChange={(e) => {
                      const preset = e.target.value;
                      setModalWeeklyPreset(preset);
                      if (preset === '5') {
                        setModalWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
                        setModalRangeStart('Monday');
                        setModalRangeEnd('Friday');
                      } else if (preset === '6') {
                        setModalWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
                        setModalRangeStart('Monday');
                        setModalRangeEnd('Saturday');
                      } else if (preset === 'mideast') {
                        setModalWorkingDays(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
                        setModalRangeStart('Sunday');
                        setModalRangeEnd('Thursday');
                      } else if (preset === '7') {
                        setModalWorkingDays(ALL_WEEK_DAYS.map((d) => d.full));
                        setModalRangeStart('Monday');
                        setModalRangeEnd('Sunday');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="" disabled>Select Weekly Preset</option>
                    <option value="5">Mon – Fri (5 Days)</option>
                    <option value="6">Mon – Sat (6 Days)</option>
                    <option value="mideast">Sun – Thu (5 Days)</option>
                    <option value="7">All 7 Days (Continuous)</option>
                    <option value="custom">Custom Day-to-Day Range</option>
                  </select>
                </div>
              </div>

              {/* Editable Day-to-Day Range & Interactive Day Selection */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Edit Days to Day Range
                  </span>
                  <span className="text-xs font-black text-purple-700">
                    {modalWorkingDays.length} Working Days
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">From Day</label>
                    <select
                      value={modalRangeStart}
                      onChange={(e) => {
                        const start = e.target.value;
                        setModalRangeStart(start);
                        if (modalRangeEnd) {
                          const days = computeDayRange(start, modalRangeEnd);
                          setModalWorkingDays(days);
                        } else {
                          setModalWorkingDays([start]);
                        }
                        setModalWeeklyPreset('custom');
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="" disabled>Select start day</option>
                      {ALL_WEEK_DAYS.map((d) => (
                        <option key={d.full} value={d.full}>{d.full}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">To Day</label>
                    <select
                      value={modalRangeEnd}
                      onChange={(e) => {
                        const end = e.target.value;
                        setModalRangeEnd(end);
                        if (modalRangeStart) {
                          const days = computeDayRange(modalRangeStart, end);
                          setModalWorkingDays(days);
                        } else {
                          setModalWorkingDays([end]);
                        }
                        setModalWeeklyPreset('custom');
                      }}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="" disabled>Select end day</option>
                      {ALL_WEEK_DAYS.map((d) => (
                        <option key={d.full} value={d.full}>{d.full}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Day Pills Toggle */}
                <div className="pt-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Toggle working days / off days:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ALL_WEEK_DAYS.map((d) => {
                      const isSel = modalWorkingDays.includes(d.full);
                      return (
                        <button
                          key={d.full}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              if (modalWorkingDays.length <= 1) {
                                showToast('At least 1 working day must be configured.');
                                return;
                              }
                              setModalWorkingDays(modalWorkingDays.filter((w) => w !== d.full));
                            } else {
                              setModalWorkingDays([...modalWorkingDays, d.full]);
                            }
                            setModalWeeklyPreset('custom');
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer',
                            isSel
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                          )}
                        >
                          {d.short} {isSel ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-0.5 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    Working: {modalWorkingDays.map((d) => d.slice(0, 3)).join(', ')}
                  </span>
                  <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                    Off: {ALL_WEEK_DAYS.filter((d) => !modalWorkingDays.includes(d.full)).map((d) => d.short).join(', ') || 'None'}
                  </span>
                </div>
              </div>

              {/* Checkbox: Set as company default */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modalIsDefault}
                  onChange={(e) => setModalIsDefault(e.target.checked)}
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
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCalendar}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Icon name="plus" size={13} />
                  <span>{creatingCalendar ? 'Creating...' : 'Create Calendar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

