import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { apiClient } from '@/services/apiClient';
import {
  hrmsApi,
  type ShiftRosterResponse,
  type EmployeeRosterRow,
  type ShiftTemplateItem,
  type WorkCalendarItem,
} from '@/services/hrmsApi';
import { HrmsImportExportControls } from './HrmsImportExportControls';

interface HrmsShiftRosterTabProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsShiftRosterTab({ onSuccessToast }: HrmsShiftRosterTabProps) {
  // Top Sub-view: 'roster' (Weekly Shift Roster) vs 'templates' (Shift Templates & Policies)
  const [activeTabMode, setActiveTabMode] = useState<'roster' | 'templates'>('roster');

  // Filter States (for Roster)
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('vahd_selected_org_id') || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'flat' | 'hierarchy'>('flat');
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  // Synchronize with Topbar organization / branch switcher
  useEffect(() => {
    const handleOrgChanged = (e: any) => {
      const orgId = e?.detail?.id ?? localStorage.getItem('vahd_selected_org_id') ?? 'all';
      setSelectedBranch(orgId);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
  }, []);

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

  // Quick Shift Assignment Modal (from Roster cell click or Day Column header click)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    employeeIds: string[];
    dateStr: string;
    employeeName?: string;
    dayLabel?: string;
    isDayColumn?: boolean;
  } | null>(null);
  const [modalShiftCode, setModalShiftCode] = useState('');
  const [modalStartTime, setModalStartTime] = useState('');
  const [modalEndTime, setModalEndTime] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

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
  const [newCalWorkingDays, setNewCalWorkingDays] = useState<string[]>([]);
  const [submittingCal, setSubmittingCal] = useState(false);

  // Dynamic default working days from active database work calendar policies
  const defaultCalWorkDays = useMemo(() => {
    const active = workCalendars.find((c: any) => c.is_default) || workCalendars[0];
    if (active?.working_days && active.working_days.length > 0) {
      return active.working_days.map((d: string) => (d.length > 3 ? d.slice(0, 3) : d));
    }
    return [];
  }, [workCalendars]);

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
  // New assignment / schedule fields
  const [templateAssignType, setTemplateAssignType] = useState<'employee' | 'student' | 'both'>('both');
  const [templateFromDate, setTemplateFromDate] = useState('');
  const [templateToDate, setTemplateToDate] = useState('');
  const [templateNumMembers, setTemplateNumMembers] = useState<number | ''>('');
  // Organization members for shift template assignment dropdown
  const [orgEmployees, setOrgEmployees] = useState<any[]>([]);
  const [orgStudents, setOrgStudents] = useState<any[]>([]);
  const [templateSelectedMemberIds, setTemplateSelectedMemberIds] = useState<string[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [templateWorkDays, setTemplateWorkDays] = useState<string[]>([]);
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);

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
      const branchId = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
      const res = await hrmsApi.getShiftRoster({
        start_date: currentWeekMondayStr,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        search: searchQuery.trim() || undefined,
        view: viewMode,
        user_type: rosterScope,
        branch_id: branchId,
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
  }, [currentWeekMondayStr, selectedDepartment, viewMode, rosterScope, selectedBranch]);

  useEffect(() => {
    if (activeTabMode === 'templates') {
      fetchTemplatesAndCalendars();
    }
  }, [activeTabMode]);

  // Fetch employees and students under the selected organisation for shift assignment
  useEffect(() => {
    const branchParam = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
    Promise.all([
      hrmsApi.getEmployees({ branch_id: branchParam }).catch(() => []),
      apiClient.get<any[]>('/students', { params: branchParam ? { branch_id: branchParam } : undefined }).catch(() => [])
    ]).then(([emps, studs]) => {
      setOrgEmployees(Array.isArray(emps) ? emps : []);
      setOrgStudents(Array.isArray(studs) ? studs : []);
    });
  }, [selectedBranch]);

  // Compute candidate members for shift assignment based on assign_type and organisation
  const candidateMembers = useMemo(() => {
    let list: Array<{ id: string; name: string; code: string; desg: string; type: 'employee' | 'student' }> = [];
    if (templateAssignType === 'employee' || templateAssignType === 'both') {
      const empItems = orgEmployees.map((e, idx) => {
        const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || `Employee ${idx + 1}`;
        const code = e.code || e.employee_id || e.id || '';
        const desg = e.designation || e.department || 'Staff';
        return {
          id: String(e.id || code),
          name: fullName,
          code: String(code),
          desg,
          type: 'employee' as const,
        };
      });
      list = [...list, ...empItems];
    }
    if (templateAssignType === 'student' || templateAssignType === 'both') {
      const stuItems = orgStudents.map((s, idx) => {
        const fullName = s.full_name || s.name || `Student ${idx + 1}`;
        const code = s.member_code || s.roll_number || s.student_number || s.code || (s.id && !s.id.startsWith('cust_') ? s.id : `stu${String(idx + 1).padStart(4, '0')}`);
        const desg = s.course || s.specialization || s.qualification || 'Student';
        return {
          id: String(s.id || code),
          name: fullName,
          code: String(code),
          desg,
          type: 'student' as const,
        };
      });
      list = [...list, ...stuItems];
    }
    return list;
  }, [orgEmployees, orgStudents, templateAssignType]);

  const filteredCandidateMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return candidateMembers;
    const q = memberSearchQuery.toLowerCase();
    return candidateMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.desg.toLowerCase().includes(q)
    );
  }, [candidateMembers, memberSearchQuery]);

  const handleToggleSelectAllMembers = () => {
    if (templateSelectedMemberIds.length === candidateMembers.length) {
      setTemplateSelectedMemberIds([]);
    } else {
      setTemplateSelectedMemberIds(candidateMembers.map((m) => m.id));
    }
  };

  const handleToggleMember = (id: string) => {
    setTemplateSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Debounced search for roster
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRoster();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Dynamic available shifts list for filtering
  const availableShifts = useMemo(() => {
    const shiftMap = new Map<string, { code: string; label: string; count?: number }>();

    // 1. From template_summaries (if provided by backend)
    if (rosterData?.template_summaries && rosterData.template_summaries.length > 0) {
      rosterData.template_summaries.forEach((ts) => {
        const code = (ts.code || '').toUpperCase();
        if (!code) return;
        const time = ts.time_range ? ` (${ts.time_range.replace('-', ' - ')})` : '';
        const countStr = ts.count !== undefined ? ` • ${ts.count} ${rosterScope === 'student' ? 'students' : 'staff'}` : '';
        shiftMap.set(code, {
          code,
          label: `${ts.name}${time}${countStr}`,
          count: ts.count,
        });
      });
    }

    // 2. From shiftTemplates list
    shiftTemplates.forEach((t) => {
      const code = (t.code || '').toUpperCase();
      if (!code || shiftMap.has(code)) return;
      const time = t.start_time && t.end_time ? ` (${t.start_time} - ${t.end_time})` : '';
      shiftMap.set(code, {
        code,
        label: `${t.name}${time}`,
      });
    });

    // 3. From currently loaded employees in roster (in case any custom or existing shifts exist)
    if (rosterData?.employees) {
      rosterData.employees.forEach((emp) => {
        Object.values(emp.shifts || {}).forEach((s) => {
          if (!s) return;
          if (s.is_off || s.shift_code === 'OFF') return;
          const code = (s.shift_code || '').toUpperCase();
          if (code && !shiftMap.has(code)) {
            const rawTitle = s.shift_name && s.shift_name !== 'Rest Day' ? s.shift_name : code;
            const cleanTitle = rawTitle.replace(/\s*\(\d+.*$/, ' Shift').replace('Shift Shift', 'Shift');
            const time = s.start_time && s.end_time ? ` (${s.start_time} - ${s.end_time})` : '';
            shiftMap.set(code, {
              code,
              label: `${cleanTitle}${time}`,
            });
          }
        });
      });
    }

    // 4. Always add Weekly Offs / Rest Day
    const offCount = rosterData?.summary?.weekly_offs;
    const offCountStr = offCount !== undefined ? ` • ${offCount} ${rosterScope === 'student' ? 'students' : 'staff'}` : '';
    shiftMap.set('OFF', {
      code: 'OFF',
      label: `Weekly Off / Rest Day (OFF)${offCountStr}`,
      count: offCount,
    });

    return Array.from(shiftMap.values());
  }, [rosterData?.template_summaries, rosterData?.summary, rosterData?.employees, shiftTemplates, rosterScope]);

  // Filtered employees list based on search, department, and shift filter
  const displayedEmployees = useMemo(() => {
    if (!rosterData?.employees) return [];
    if (selectedShiftFilter === 'ALL') return rosterData.employees;

    const filterCode = selectedShiftFilter.toUpperCase();

    return rosterData.employees.filter((emp) => {
      const shiftEntries = Object.values(emp.shifts || {});
      if (filterCode === 'OFF') {
        return shiftEntries.some((s) => Boolean(s.is_off || s.shift_code?.toUpperCase() === 'OFF'));
      }
      return shiftEntries.some((s) => {
        if (s.is_off || s.shift_code?.toUpperCase() === 'OFF') return false;
        const code = (s.shift_code || '').toUpperCase();
        const name = (s.shift_name || '').toLowerCase();
        return code === filterCode || name.includes(filterCode.toLowerCase());
      });
    });
  }, [rosterData?.employees, selectedShiftFilter]);

  // Handle single cell shift quick change - loads existing data dynamically from DB via backend
  const handleCellClick = async (emp: EmployeeRosterRow, dateStr: string) => {
    const currentShift = emp.shifts[dateStr]?.shift_code || (shiftTemplates[0]?.code ?? '');
    const tmpl = shiftTemplates.find((t) => t.code.toUpperCase() === currentShift.toUpperCase());
    // Seed modal with normalized local data as immediate fallback
    const localStart = normalizeTimeInput(emp.shifts[dateStr]?.start_time || tmpl?.start_time || '');
    const localEnd = normalizeTimeInput(emp.shifts[dateStr]?.end_time || tmpl?.end_time || '');
    setModalTarget({
      employeeIds: [emp.id],
      dateStr,
      employeeName: emp.name,
      isDayColumn: false,
    });
    setModalDate(dateStr);
    setModalShiftCode(currentShift);
    setModalStartTime(localStart);
    setModalEndTime(localEnd);
    setShowAssignModal(true);

    // Dynamically fetch exact live record from database via backend
    try {
      const live = await hrmsApi.getShiftCell(emp.id, dateStr);
      if (live) {
        if (live.shift_code) setModalShiftCode(live.shift_code);
        // Normalize and prefer live value; fall back to local seed if live is empty
        if (live.start_time !== undefined) setModalStartTime(normalizeTimeInput(live.start_time) || localStart);
        if (live.end_time !== undefined) setModalEndTime(normalizeTimeInput(live.end_time) || localEnd);
        if (live.date) setModalDate(live.date);
      }
    } catch (err) {
      // Fallback already rendered smoothly
    }
  };

  // Handle day header click (e.g. MON NOV 02) to assign shift & timing across all employees
  const handleDayHeaderClick = (d: { date: string; day_name: string; formatted: string }) => {
    if (!rosterData || displayedEmployees.length === 0) return;
    const targetEmployees = selectedEmployeeIds.length > 0
      ? displayedEmployees.filter((e) => selectedEmployeeIds.includes(e.id))
      : displayedEmployees;
    const targetIds = targetEmployees.map((e) => e.id);

    // Determine default shift for this day among target employees
    const firstShift = targetEmployees[0]?.shifts[d.date];
    const initialCode = firstShift?.shift_code || shiftTemplates[0]?.code || 'GEN';
    const tmpl = shiftTemplates.find((t) => t.code.toUpperCase() === initialCode.toUpperCase());

    setModalTarget({
      employeeIds: targetIds,
      dateStr: d.date,
      dayLabel: `${d.day_name} (${d.formatted})`,
      employeeName: selectedEmployeeIds.length > 0
        ? `${targetIds.length} Selected Staff`
        : `All ${targetIds.length} Staff`,
      isDayColumn: true,
    });
    setModalDate(d.date);
    setModalShiftCode(initialCode);
    setModalStartTime(normalizeTimeInput(firstShift?.start_time || tmpl?.start_time || ''));
    setModalEndTime(normalizeTimeInput(firstShift?.end_time || tmpl?.end_time || ''));
    setShowAssignModal(true);
  };

  // Submit shift assignment
  const handleSaveShiftAssignment = async () => {
    if (!modalTarget) return;
    setModalSubmitting(true);
    try {
      const selectedTmpl = shiftTemplates.find((t) => t.code.toUpperCase() === modalShiftCode.toUpperCase());
      const isOff = modalShiftCode === 'OFF';
      const sName = isOff ? 'Rest Day' : (selectedTmpl?.name || `${modalShiftCode} Shift`);
      const sStart = isOff ? '' : modalStartTime;
      const sEnd = isOff ? '' : modalEndTime;
      const targetDate = modalDate || modalTarget.dateStr;

      await hrmsApi.assignShift({
        employee_ids: modalTarget.employeeIds,
        dates: [targetDate],
        shift_code: modalShiftCode,
        shift_name: sName,
        start_time: sStart,
        end_time: sEnd,
        shift_id: isOff ? undefined : selectedTmpl?.id,
        is_off: isOff,
      });
      setShowAssignModal(false);
      setModalTarget(null);
      showToast(
        modalTarget.isDayColumn
          ? `Shift for ${modalTarget.dayLabel} set to ${sName} (${sStart && sEnd ? `${sStart} - ${sEnd}` : sName}) across ${modalTarget.employeeName}.`
          : `Shift updated to ${sName} (${sStart && sEnd ? `${sStart} - ${sEnd}` : sName}) for ${modalTarget.employeeName} on ${targetDate}.`
      );
      fetchRoster();
    } catch (err: any) {
      console.error('Error assigning shift:', err);
      showToast(err?.response?.data?.detail || err?.message || 'Failed to assign shift');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Select all employees checkbox
  const handleToggleSelectAll = () => {
    if (!rosterData || displayedEmployees.length === 0) return;
    if (selectedEmployeeIds.length === displayedEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(displayedEmployees.map((e) => e.id));
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
      setNewCalWorkingDays(defaultCalWorkDays.length > 0 ? defaultCalWorkDays : []);
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
    setTemplateAssignType('both');
    setTemplateFromDate('');
    setTemplateToDate('');
    setTemplateNumMembers('');
    setTemplateSelectedMemberIds([]);
    setShowMemberDropdown(false);
    setMemberSearchQuery('');
    setTemplateWorkDays(defaultCalWorkDays.length > 0 ? defaultCalWorkDays : []);
    setShowDaysDropdown(false);
    setShowTemplateModal(true);
  };

  const formatToDateInput = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split('/');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split('-');
      return `${y}-${m}-${d}`;
    }
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch { }
    return '';
  };

  /**
   * Normalize a time string to HH:mm format expected by <input type="time">.
   * Handles: "9:00" → "09:00", "22:00" → "22:00", "06:30" → "06:30".
   * Returns '' for null / undefined / empty input.
   */
  const normalizeTimeInput = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    // Already HH:mm or HH:mm:ss
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) return str.slice(0, 5);
    // Single-digit hour: "9:00" → "09:00"
    if (/^\d{1}:\d{2}$/.test(str)) return `0${str}`;
    return str;
  };

  const handleOpenEditTemplate = async (tpl: ShiftTemplateItem) => {
    setEditingTemplateId(tpl.id);
    setTemplateCode(tpl.code);
    setTemplateName(tpl.name);
    setTemplateStartTime(normalizeTimeInput(tpl.start_time));
    setTemplateEndTime(normalizeTimeInput(tpl.end_time));
    setTemplateBreakMins(tpl.break_mins ?? '');
    setTemplateGraceMins(tpl.grace_period_mins ?? '');
    setTemplateIsNight(Boolean(tpl.is_night_shift));
    setTemplateColor(tpl.color || '#7c3aed');
    setTemplateAssignType((tpl.assign_type as 'employee' | 'student' | 'both') || 'both');
    setTemplateFromDate(formatToDateInput(tpl.from_date));
    setTemplateToDate(formatToDateInput(tpl.to_date));
    setTemplateNumMembers(tpl.num_members ?? '');
    setTemplateSelectedMemberIds(tpl.member_ids || []);
    setShowMemberDropdown(false);
    setMemberSearchQuery('');
    setTemplateWorkDays(tpl.work_days && tpl.work_days.length > 0 ? tpl.work_days : (defaultCalWorkDays.length > 0 ? defaultCalWorkDays : []));
    setShowDaysDropdown(false);
    setShowTemplateModal(true);

    // Dynamically fetch exact live record from database via backend
    try {
      const live = await hrmsApi.getShiftTemplateById(tpl.id);
      if (live) {
        if (live.code) setTemplateCode(live.code);
        if (live.name) setTemplateName(live.name);
        // Normalize times and only overwrite if the live value is non-empty
        if (live.start_time !== undefined) setTemplateStartTime(normalizeTimeInput(live.start_time) || normalizeTimeInput(tpl.start_time));
        if (live.end_time !== undefined) setTemplateEndTime(normalizeTimeInput(live.end_time) || normalizeTimeInput(tpl.end_time));
        if (live.break_mins !== undefined) setTemplateBreakMins(live.break_mins ?? '');
        if (live.grace_period_mins !== undefined) setTemplateGraceMins(live.grace_period_mins ?? '');
        if (live.is_night_shift !== undefined) setTemplateIsNight(Boolean(live.is_night_shift));
        if (live.color) setTemplateColor(live.color);
        if (live.assign_type) setTemplateAssignType(live.assign_type as any);
        if (live.from_date !== undefined) setTemplateFromDate(formatToDateInput(live.from_date));
        if (live.to_date !== undefined) setTemplateToDate(formatToDateInput(live.to_date));
        if (live.num_members !== undefined) setTemplateNumMembers(live.num_members ?? '');
        if (live.member_ids) setTemplateSelectedMemberIds(live.member_ids || []);
        if (live.work_days && live.work_days.length > 0) setTemplateWorkDays(live.work_days);
      }
    } catch (err) {
      // Fallback already rendered smoothly
    }
  };

  const handleSaveShiftTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateCode.trim() || !templateName.trim()) {
      showToast('Shift code and name are required');
      return;
    }
    setSubmittingTemplate(true);
    try {
      const finalMemberCount = templateSelectedMemberIds.length > 0
        ? templateSelectedMemberIds.length
        : (templateNumMembers !== '' ? Number(templateNumMembers) : 0);

      const saved = await hrmsApi.saveShiftTemplate({
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
        assign_type: templateAssignType,
        from_date: templateFromDate || undefined,
        to_date: templateToDate || undefined,
        num_members: finalMemberCount,
        member_ids: templateSelectedMemberIds,
        work_days: templateWorkDays,
        branch_id: selectedBranch !== 'all' ? selectedBranch : undefined,
      });

      // If members are selected, apply shift to roster and overwrite matching days
      if (templateSelectedMemberIds.length > 0) {
        const workDates: string[] = [];
        const offDates: string[] = [];
        const rawStart = templateFromDate ? new Date(templateFromDate) : new Date();
        // Always align startD to Sunday of the active week so all applicable days in the week
        // (Mon, Tue, etc.) are overwritten in the database instead of leaving partial days with stale shifts.
        const dayOfWeek = rawStart.getDay(); // 0 = Sun, 1 = Mon...
        const startD = new Date(rawStart.getFullYear(), rawStart.getMonth(), rawStart.getDate() - dayOfWeek);
        const endD = templateToDate
          ? new Date(templateToDate)
          : new Date(startD.getTime() + 35 * 24 * 60 * 60 * 1000); // Default to 35-day window so weekly roster is fully populated
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
          const dayName = dayNames[cur.getDay()];
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const day = String(cur.getDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${day}`;
          if (templateWorkDays.length === 0 || templateWorkDays.includes(dayName)) {
            workDates.push(dStr);
          } else {
            offDates.push(dStr);
          }
        }
        if (workDates.length > 0) {
          await hrmsApi.assignShift({
            employee_ids: templateSelectedMemberIds,
            dates: workDates,
            shift_code: templateCode.trim().toUpperCase(),
            shift_name: templateName.trim(),
            start_time: templateStartTime.trim(),
            end_time: templateEndTime.trim(),
            shift_id: (saved as any)?.id,
            is_off: false,
          }).catch(() => null);
        }
        if (offDates.length > 0) {
          await hrmsApi.assignShift({
            employee_ids: templateSelectedMemberIds,
            dates: offDates,
            shift_code: 'OFF',
            shift_name: 'Rest Day',
            start_time: '',
            end_time: '',
            is_off: true,
          }).catch(() => null);
        }
      }

      showToast(`Shift template "${templateName}" saved and roster updated.`);
      setShowTemplateModal(false);

      // Navigate roster view to the week containing templateFromDate so user sees the saved shifts immediately
      let targetMondayStr = currentWeekMondayStr;
      if (templateFromDate) {
        const savedDate = new Date(templateFromDate);
        const today = new Date();
        const savedDay = savedDate.getDay();
        const savedMonday = new Date(savedDate);
        savedMonday.setDate(savedDate.getDate() - savedDay + (savedDay === 0 ? -6 : 1));
        const todayDay = today.getDay();
        const todayMonday = new Date(today);
        todayMonday.setDate(today.getDate() - todayDay + (todayDay === 0 ? -6 : 1));
        const diffMs = savedMonday.getTime() - todayMonday.getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        setSelectedWeekOffset(diffWeeks);
        targetMondayStr = savedMonday.toISOString().split('T')[0];
      }
      // Switch to roster tab so user sees the assignments
      setActiveTabMode('roster');
      const branchId = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
      hrmsApi.getShiftRoster({
        start_date: targetMondayStr,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        search: searchQuery.trim() || undefined,
        view: viewMode,
        user_type: rosterScope,
        branch_id: branchId,
      }).then((res) => setRosterData(res)).catch(() => { });
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
              setNewCalWorkingDays(defaultCalWorkDays.length > 0 ? defaultCalWorkDays : []);
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
      {/* 2. DYNAMIC SHIFT STATISTIC METRIC CARDS (Real Live DB Templates) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {rosterData?.template_summaries && rosterData.template_summaries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rosterData.template_summaries.map((tmpl, idx) => {
            const colorThemes = [
              { bg: 'from-purple-50/80 via-white to-purple-50/30', border: 'border-purple-200/80', text: 'text-purple-950', badge: 'text-purple-800', iconBg: 'bg-purple-100/80', iconText: 'text-purple-600', icon: 'sun' },
              { bg: 'from-emerald-50/80 via-white to-emerald-50/30', border: 'border-emerald-200/80', text: 'text-emerald-950', badge: 'text-emerald-800', iconBg: 'bg-emerald-100/80', iconText: 'text-emerald-600', icon: 'sunrise' },
              { bg: 'from-amber-50/80 via-white to-amber-50/30', border: 'border-amber-200/80', text: 'text-amber-950', badge: 'text-amber-800', iconBg: 'bg-amber-100/80', iconText: 'text-amber-600', icon: 'sunset' },
              { bg: 'from-fuchsia-50/80 via-white to-fuchsia-50/30', border: 'border-fuchsia-200/80', text: 'text-fuchsia-950', badge: 'text-fuchsia-800', iconBg: 'bg-fuchsia-100/80', iconText: 'text-fuchsia-600', icon: 'moon' },
              { bg: 'from-blue-50/80 via-white to-blue-50/30', border: 'border-blue-200/80', text: 'text-blue-950', badge: 'text-blue-800', iconBg: 'bg-blue-100/80', iconText: 'text-blue-600', icon: 'clock' },
            ];
            const theme = colorThemes[idx % colorThemes.length];
            const isCardActive = selectedShiftFilter.toUpperCase() === (tmpl.code || '').toUpperCase();
            return (
              <div
                key={tmpl.id || tmpl.code}
                onClick={() => setSelectedShiftFilter((prev) => (prev.toUpperCase() === (tmpl.code || '').toUpperCase() ? 'ALL' : tmpl.code))}
                className={`card p-4 rounded-2xl bg-gradient-to-br ${theme.bg} border ${isCardActive ? 'ring-2 ring-purple-600 border-purple-500 shadow-md scale-[1.01]' : theme.border
                  } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
                title={`Click to filter roster by ${tmpl.name}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-2xl sm:text-3xl font-black ${theme.text} tracking-tight`}>
                    {tmpl.count ?? 0}
                  </span>
                  <div className={`w-8 h-8 rounded-xl ${theme.iconBg} flex items-center justify-center ${theme.iconText}`}>
                    <Icon name={theme.icon as any} size={18} />
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  <div className={`text-[11px] font-black uppercase ${theme.badge} tracking-wider truncate`} title={tmpl.name}>
                    {tmpl.name}
                  </div>
                  {tmpl.time_range ? (
                    <div className="text-[11px] font-mono font-bold text-slate-700">
                      {tmpl.time_range.replace('-', ' - ')}
                    </div>
                  ) : null}
                  <div className="text-[10px] text-slate-500 font-medium">
                    {tmpl.count === 1 ? '1 employee' : `${tmpl.count ?? 0} employees`}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dynamic Weekly Offs Card */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'OFF' ? 'ALL' : 'OFF'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-slate-50/90 via-white to-slate-100/40 border ${selectedShiftFilter === 'OFF' ? 'ring-2 ring-purple-600 border-purple-500 shadow-md scale-[1.01]' : 'border-slate-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by Weekly Offs / Rest Days"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                {rosterData?.summary?.weekly_offs ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Icon name="coffee" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                WEEKLY OFFS
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                Rest Days
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.weekly_offs === 1 ? '1 employee' : `${rosterData?.summary?.weekly_offs ?? 0} employees`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: GENERAL (09-18) */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'GEN' ? 'ALL' : 'GEN'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30 border ${selectedShiftFilter === 'GEN' ? 'ring-2 ring-purple-600 border-purple-500 shadow-md scale-[1.01]' : 'border-purple-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by General Shift"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
                {rosterData?.summary?.general ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-600">
                <Icon name="sun" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-purple-800 tracking-wider">
                GENERAL SHIFT
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                09:00 - 18:00
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.general === 1 ? '1 employee' : `${rosterData?.summary?.general ?? 0} employees`}
              </div>
            </div>
          </div>

          {/* Card 2: MORNING (06-14) */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'MORN' ? 'ALL' : 'MORN'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border ${selectedShiftFilter === 'MORN' ? 'ring-2 ring-emerald-600 border-emerald-500 shadow-md scale-[1.01]' : 'border-emerald-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by Morning Shift"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                {rosterData?.summary?.morning ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600">
                <Icon name="sunrise" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">
                MORNING SHIFT
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                06:00 - 14:30
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.morning === 1 ? '1 employee' : `${rosterData?.summary?.morning ?? 0} employees`}
              </div>
            </div>
          </div>

          {/* Card 3: EVENING (14-22) */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'EVE' ? 'ALL' : 'EVE'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border ${selectedShiftFilter === 'EVE' ? 'ring-2 ring-amber-600 border-amber-500 shadow-md scale-[1.01]' : 'border-amber-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by Evening Shift"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                {rosterData?.summary?.evening ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center text-amber-600">
                <Icon name="sunset" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider">
                EVENING SHIFT
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                14:00 - 22:30
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.evening === 1 ? '1 employee' : `${rosterData?.summary?.evening ?? 0} employees`}
              </div>
            </div>
          </div>

          {/* Card 4: NIGHT (22-06) */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'NGT' ? 'ALL' : 'NGT'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50/80 via-white to-fuchsia-50/30 border ${selectedShiftFilter === 'NGT' ? 'ring-2 ring-fuchsia-600 border-fuchsia-500 shadow-md scale-[1.01]' : 'border-fuchsia-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by Night Shift"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-fuchsia-950 tracking-tight">
                {rosterData?.summary?.night ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-fuchsia-100/80 flex items-center justify-center text-fuchsia-600">
                <Icon name="moon" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-fuchsia-800 tracking-wider">
                NIGHT SHIFT
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                22:00 - 06:30
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.night === 1 ? '1 employee' : `${rosterData?.summary?.night ?? 0} employees`}
              </div>
            </div>
          </div>

          {/* Card 5: WEEKLY OFFS */}
          <div
            onClick={() => setSelectedShiftFilter((prev) => (prev === 'OFF' ? 'ALL' : 'OFF'))}
            className={`card p-4 rounded-2xl bg-gradient-to-br from-slate-50/90 via-white to-slate-100/40 border ${selectedShiftFilter === 'OFF' ? 'ring-2 ring-purple-600 border-purple-500 shadow-md scale-[1.01]' : 'border-slate-200/80'
              } shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all`}
            title="Click to filter roster by Weekly Offs / Rest Days"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                {rosterData?.summary?.weekly_offs ?? 0}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Icon name="coffee" size={18} />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <div className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                WEEKLY OFFS
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                Rest Days
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {rosterData?.summary?.weekly_offs === 1 ? '1 employee' : `${rosterData?.summary?.weekly_offs ?? 0} employees`}
              </div>
            </div>
          </div>
        </div>
      )}

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

              <div className="flex items-center gap-2 flex-wrap">
                <HrmsImportExportControls
                  type="shift_templates"
                  dataToExport={shiftTemplates}
                  onImportSuccess={() => {
                    fetchTemplatesAndCalendars();
                    showToast('Shift templates updated successfully from import.');
                  }}
                />
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
                      {tpl.work_days && tpl.work_days.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          {tpl.work_days.map((d) => (
                            <span key={d} className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/90 border border-slate-200/90 text-slate-700 shadow-2xs">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
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

            {/* Right Controls: Scope Selector, Department Dropdown, Shift Filter Dropdown, Week Navigator */}
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
                    setSelectedShiftFilter('ALL');
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

              {/* Shift Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedShiftFilter}
                  onChange={(e) => setSelectedShiftFilter(e.target.value)}
                  className={cn(
                    "pl-3 pr-8 py-1.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none transition-colors max-w-[210px] truncate",
                    selectedShiftFilter !== 'ALL'
                      ? "bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-500/20 font-black"
                      : "bg-slate-50 border-slate-200/80 text-slate-700"
                  )}
                  title="Filter employees by shift"
                >
                  <option value="ALL">All Shifts ({availableShifts.length})</option>
                  {availableShifts.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Icon
                  name="chevron-down"
                  size={12}
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none",
                    selectedShiftFilter !== 'ALL' ? "text-purple-600" : "text-slate-400"
                  )}
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
            <div className="flex items-center gap-2.5">
              {selectedShiftFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedShiftFilter('ALL')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 transition cursor-pointer"
                >
                  <span>Filter: {selectedShiftFilter}</span>
                  <Icon name="x" size={11} />
                </button>
              )}
              <div className="text-slate-400">
                Showing {displayedEmployees.length} of {rosterData?.total_staff ?? 0} {rosterScope === 'student' ? 'students' : 'staff'}
              </div>
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
                          displayedEmployees.length > 0 &&
                          selectedEmployeeIds.length === displayedEmployees.length
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
                        onClick={() => handleDayHeaderClick(d)}
                        title={`Click to set shift for all employees on ${d.day_name} (${d.formatted})`}
                        className={cn(
                          'py-3.5 px-3 text-center min-w-[120px] cursor-pointer group select-none transition-all',
                          d.is_today
                            ? 'bg-purple-100/60 text-purple-900 font-black hover:bg-purple-200/70'
                            : 'hover:bg-purple-50/70 hover:text-purple-700'
                        )}
                      >
                        <div className="flex items-center justify-center gap-1 font-extrabold group-hover:text-purple-700 transition-colors">
                          <span>{d.day_name}</span>
                          <Icon name="edit-3" size={11} className="opacity-0 group-hover:opacity-100 text-purple-600 transition-opacity" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold group-hover:text-purple-500 transition-colors">
                          {d.formatted}
                        </div>
                        <div className="text-[9px] font-black text-purple-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                          Set Day Shift
                        </div>
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
                  ) : !rosterData || displayedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 font-bold">
                        {selectedShiftFilter !== 'ALL'
                          ? `No ${rosterScope === 'student' ? 'students' : 'staff'} found assigned to "${selectedShiftFilter}" shift this week.`
                          : 'No employees found matching filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    displayedEmployees.map((emp) => {
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
                            const isOff = Boolean(shift?.is_off || shift?.shift_code === 'OFF');
                            const code = shift?.shift_code || '';
                            const rawTitle = shift?.shift_name && shift.shift_name !== 'Rest Day' ? shift.shift_name : code;
                            const cleanShiftTitle = rawTitle.replace(/\s*\(\d+.*$/, ' Shift').replace('Shift Shift', 'Shift');
                            const time = isOff
                              ? 'Rest Day'
                              : (shift?.start_time && shift?.end_time
                                ? `${shift.start_time} - ${shift.end_time}`
                                : (shift?.time_range && shift.time_range !== 'Rest Day' ? shift.time_range : ''));

                            const isFilterActive = selectedShiftFilter !== 'ALL';
                            const isMatchedShift = isFilterActive && (
                              selectedShiftFilter === 'OFF'
                                ? isOff
                                : (!isOff && (
                                  code.toUpperCase() === selectedShiftFilter.toUpperCase() ||
                                  cleanShiftTitle.toLowerCase().includes(selectedShiftFilter.toLowerCase())
                                ))
                            );

                            return (
                              <td
                                key={dateMeta.date}
                                onClick={() => handleCellClick(emp, dateMeta.date)}
                                className={cn(
                                  'py-2 px-2 text-center cursor-pointer transition-all',
                                  dateMeta.is_today && 'bg-purple-50/30',
                                  isFilterActive && !isMatchedShift && 'opacity-40 hover:opacity-100'
                                )}
                              >
                                {isOff ? (
                                  <div className={cn(
                                    "py-2 px-1.5 rounded-xl border transition flex flex-col items-center justify-center text-center min-h-[52px]",
                                    isMatchedShift
                                      ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/40 text-purple-800 shadow-xs"
                                      : "bg-slate-50 border-slate-200/80 text-slate-500 hover:border-slate-400 hover:shadow-2xs"
                                  )}>
                                    <div className={cn("font-extrabold text-[11px] flex items-center justify-center gap-1", isMatchedShift ? "text-purple-900" : "text-slate-700")}>
                                      <Icon name="coffee" size={11} className={isMatchedShift ? "text-purple-600 shrink-0" : "text-slate-400 shrink-0"} />
                                      <span className="truncate">OFF</span>
                                    </div>
                                    <div className={cn("text-[10px] font-medium mt-0.5 truncate", isMatchedShift ? "text-purple-700 font-bold" : "text-slate-400")}>
                                      Rest Day
                                    </div>
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "py-2 px-1.5 rounded-xl border transition flex flex-col items-center justify-center text-center min-h-[52px]",
                                    isMatchedShift
                                      ? "bg-purple-100/90 border-purple-600 ring-2 ring-purple-500/50 shadow-xs"
                                      : "bg-purple-50/70 border-purple-200 hover:border-purple-400 hover:shadow-2xs"
                                  )}>
                                    <div className="font-extrabold text-[11px] text-purple-900 tracking-tight flex items-center justify-center gap-1">
                                      <Icon name="sun" size={11} className={isMatchedShift ? "text-purple-700 shrink-0" : "text-purple-500 shrink-0"} />
                                      <span className="truncate max-w-[105px]" title={cleanShiftTitle}>{cleanShiftTitle}</span>
                                    </div>
                                    <div className={cn("text-[10px] font-mono font-bold mt-0.5 truncate max-w-[105px]", isMatchedShift ? "text-purple-900" : "text-purple-700")}>
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
      {/* 5. MODAL: QUICK SHIFT ASSIGNMENT (From cell or Day Column click) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAssignModal && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Icon name={modalTarget.isDayColumn ? "calendar" : "clock"} size={16} className="text-purple-600" />
                  <span>{modalTarget.isDayColumn ? `Set Shift: ${modalTarget.dayLabel}` : 'Assign Working Shift'}</span>
                </h3>
                <p className="text-xs text-purple-700 font-bold mt-0.5">
                  {modalTarget.employeeName} {!modalTarget.isDayColumn && `• ${modalTarget.dateStr}`}
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

            {modalTarget.isDayColumn && (
              <div className="p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 font-medium">
                Choose a shift template and timing below to schedule <strong>{modalTarget.employeeName}</strong> for this day.
              </div>
            )}

            <div className="space-y-2 text-xs max-h-56 overflow-y-auto pr-1">
              {shiftTemplates.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setModalShiftCode(s.code);
                    if (s.start_time) setModalStartTime(normalizeTimeInput(s.start_time));
                    if (s.end_time) setModalEndTime(normalizeTimeInput(s.end_time));
                  }}
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
                onClick={() => {
                  setModalShiftCode('OFF');
                  setModalStartTime('');
                  setModalEndTime('');
                }}
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

            {/* Shift Timing & Date Customization (From Time, To Time & Date) */}
            {modalShiftCode !== 'OFF' && (
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase text-purple-900 tracking-wider flex items-center gap-1">
                    <Icon name="clock" size={12} className="text-purple-600" />
                    <span>Shift Timing & Date</span>
                  </label>
                  <span className="text-[10px] text-purple-600 font-bold">
                    {modalTarget.isDayColumn ? 'Applied to All' : ''}
                  </span>
                </div>

                {/* Date Input */}
                {!modalTarget.isDayColumn && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Shift Date</label>
                    <input
                      type="date"
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">From Time (Start)</label>
                    <input
                      type="time"
                      value={modalStartTime}
                      onChange={(e) => setModalStartTime(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">To Time (End)</label>
                    <input
                      type="time"
                      value={modalEndTime}
                      onChange={(e) => setModalEndTime(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  {modalTarget.isDayColumn
                    ? `Assigns this shift & timing (${modalStartTime || '--:--'} - ${modalEndTime || '--:--'}) to all employees on this day.`
                    : `Dynamic shift assignment with From Time, To Time, and Date for ${modalTarget.employeeName}.`}
                </p>
              </div>
            )}

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
                disabled={modalSubmitting}
                onClick={handleSaveShiftAssignment}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {modalSubmitting ? 'Saving...' : modalTarget.isDayColumn ? 'Assign to All Staff' : 'Confirm Shift'}
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
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
              {/* Row 1: Shift Code + Shift Name */}
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

              {/* Row 2: Start Time + End Time */}
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

              {/* Row 3: Break + Grace Period */}
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

              {/* Row 4: Assign To + No. of Members */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    ASSIGN TO
                  </label>
                  <select
                    value={templateAssignType}
                    onChange={(e) => setTemplateAssignType(e.target.value as 'employee' | 'student' | 'both')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                  >
                    <option value="both">Employees &amp; Students</option>
                    <option value="employee">Employees Only</option>
                    <option value="student">Students Only</option>
                  </select>
                </div>
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                      ASSIGN TO {templateAssignType === 'student' ? 'STUDENTS' : templateAssignType === 'employee' ? 'EMPLOYEES' : 'MEMBERS'}
                    </label>
                    <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                      {templateSelectedMemberIds.length} of {candidateMembers.length}
                    </span>
                  </div>

                  {/* Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowMemberDropdown((prev) => !prev)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer text-left"
                  >
                    <span className="truncate">
                      {templateSelectedMemberIds.length === 0
                        ? `Select ${templateAssignType === 'student' ? 'students' : templateAssignType === 'employee' ? 'employees' : 'members'}...`
                        : templateSelectedMemberIds.length === candidateMembers.length
                          ? `All (${candidateMembers.length}) Selected`
                          : `${templateSelectedMemberIds.length} selected`}
                    </span>
                    <Icon
                      name="chevron-down"
                      size={14}
                      className={cn(
                        "text-slate-400 shrink-0 ml-1 transition-transform duration-200",
                        showMemberDropdown && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Dropdown Scroll-Down Menu with Checkboxes */}
                  {showMemberDropdown && (
                    <div className="absolute right-0 left-auto top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-fade-in w-72 sm:w-80">
                      {/* Search Bar + Select All Header */}
                      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <div className="relative flex-1">
                          <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder={`Search ${templateAssignType === 'student' ? 'students' : 'employees'}...`}
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleSelectAllMembers}
                          className="px-2 py-1.5 text-[10px] font-extrabold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition whitespace-nowrap cursor-pointer"
                        >
                          {templateSelectedMemberIds.length === candidateMembers.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>

                      {/* Scrollable Checkbox List */}
                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 pr-1">
                        {filteredCandidateMembers.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 font-medium">
                            No {templateAssignType === 'student' ? 'students' : 'employees'} found for this organisation.
                          </div>
                        ) : (
                          filteredCandidateMembers.map((m) => {
                            const isChecked = templateSelectedMemberIds.includes(m.id);
                            return (
                              <label
                                key={m.id}
                                className={cn(
                                  "flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition select-none hover:bg-slate-50",
                                  isChecked && "bg-purple-50/50"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleMember(m.id)}
                                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate">
                                      {m.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                      <span className="font-mono font-semibold text-slate-600">{m.code}</span>
                                      <span>•</span>
                                      <span>{m.desg}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.2 rounded shrink-0",
                                  m.type === 'student' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                  {m.type === 'student' ? 'STU' : 'EMP'}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-500">
                          {templateSelectedMemberIds.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMemberDropdown(false)}
                          className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 5: From Date + To Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    FROM DATE
                  </label>
                  <input
                    type="date"
                    value={templateFromDate}
                    onChange={(e) => setTemplateFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    TO DATE
                  </label>
                  <input
                    type="date"
                    value={templateToDate}
                    onChange={(e) => setTemplateToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Row 6: Applicable Days (Scroll-down Checkbox Dropdown) + Shift Color */}
              <div className="grid grid-cols-2 gap-3 items-end">
                {/* Applicable Days Dropdown */}
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                      APPLICABLE DAYS
                    </label>
                    <span className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md">
                      {templateWorkDays.length} of 7 days
                    </span>
                  </div>

                  {/* Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowDaysDropdown((prev) => !prev)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer text-left"
                  >
                    <span className="truncate">
                      {templateWorkDays.length === 0
                        ? 'Select days...'
                        : templateWorkDays.length === 7
                          ? 'All 7 Days'
                          : templateWorkDays.join(', ')}
                    </span>
                    <Icon
                      name="chevron-down"
                      size={14}
                      className={cn(
                        "text-slate-400 shrink-0 ml-1 transition-transform duration-200",
                        showDaysDropdown && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Scroll-down Checkbox Menu */}
                  {showDaysDropdown && (
                    <div className="absolute left-0 bottom-full mb-1.5 z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-fade-in w-64 sm:w-72">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                          Select Days
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            setTemplateWorkDays(templateWorkDays.length === 7 ? [] : allDays);
                          }}
                          className="px-2 py-0.5 text-[10px] font-extrabold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition cursor-pointer"
                        >
                          {templateWorkDays.length === 7 ? 'Clear All' : 'Select All'}
                        </button>
                      </div>

                      {/* Scrollable list with checkboxes */}
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {[
                          { id: 'Mon', label: 'Monday' },
                          { id: 'Tue', label: 'Tuesday' },
                          { id: 'Wed', label: 'Wednesday' },
                          { id: 'Thu', label: 'Thursday' },
                          { id: 'Fri', label: 'Friday' },
                          { id: 'Sat', label: 'Saturday' },
                          { id: 'Sun', label: 'Sunday' },
                        ].map((d) => {
                          const isChecked = templateWorkDays.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none hover:bg-slate-50 border",
                                isChecked
                                  ? "bg-purple-50/60 border-purple-200 text-purple-950 font-bold"
                                  : "border-transparent text-slate-700 font-medium"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setTemplateWorkDays((prev) =>
                                      prev.includes(d.id)
                                        ? prev.filter((item) => item !== d.id)
                                        : [...prev, d.id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                                />
                                <span className="text-xs">{d.label}</span>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold",
                                  isChecked ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500"
                                )}
                              >
                                {d.id}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-500">
                          {templateWorkDays.length} of 7 selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDaysDropdown(false)}
                          className="px-2.5 py-1 text-xs font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shift Color */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    SHIFT COLOR
                  </label>
                  <div className="flex items-center gap-2 h-[38px] px-3 bg-white border border-slate-200 rounded-xl">
                    <input
                      type="color"
                      value={templateColor}
                      onChange={(e) => setTemplateColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                      {templateColor}
                    </span>
                  </div>
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
