import { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { hrmsApi, CompanyHolidayItem, WorkCalendarItem } from '@/services/hrmsApi';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

interface CalendarHolidaysSettingsProps {
  onBack?: () => void;
}

interface BranchOption {
  id: string;
  name: string;
  code?: string;
}

export function CalendarHolidaysSettings({ onBack }: CalendarHolidaysSettingsProps) {
  const { user } = useAuth();
  const isHo = user?.role === 'ho';

  // Permission evaluation for Owner
  const perms = (user?.permissions as Record<string, boolean>) || {};
  const hasFullControl = isHo || !user?.permissions || Object.keys(perms).length === 0;

  const canAdd = hasFullControl || !!perms['calendar.add'] || !!perms['calendar'];
  const canEdit = hasFullControl || !!perms['calendar.edit'] || !!perms['calendar'];
  const canDelete = hasFullControl || !!perms['calendar.delete'] || !!perms['calendar'];
  const canImport = hasFullControl || !!perms['calendar.import'] || !!perms['calendar'];

  // Sub-tab Navigation State
  const [activeTab, setActiveTab] = useState<'holidays' | 'work_calendars'>('holidays');

  // Filter States
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const yearOptions = useMemo(() => {
    const base = [-2, -1, 0, 1, 2].map((offset) => currentYear + offset);
    if (!base.includes(selectedYear)) {
      base.push(selectedYear);
      base.sort((a, b) => a - b);
    }
    return base;
  }, [currentYear, selectedYear]);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('All holidays (any institution)');
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Work Calendars State
  const [workCalendars, setWorkCalendars] = useState<WorkCalendarItem[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState<boolean>(false);
  const [showAddEditCalModal, setShowAddEditCalModal] = useState<boolean>(false);
  const [editingCal, setEditingCal] = useState<WorkCalendarItem | null>(null);
  const [calForm, setCalForm] = useState<{
    name: string;
    calendar_type: string;
    department: string;
    working_days: string[];
    weekly_off_days: string[];
    default_shift_code: string;
    is_default: boolean;
  }>({
    name: '',
    calendar_type: 'Standard Corporate',
    department: 'All',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    weekly_off_days: ['Saturday', 'Sunday'],
    default_shift_code: 'GEN',
    is_default: false,
  });
  const [savingCal, setSavingCal] = useState<boolean>(false);
  const [deletingCal, setDeletingCal] = useState<WorkCalendarItem | null>(null);
  const [deletingCalLoading, setDeletingCalLoading] = useState<boolean>(false);

  // Holidays Data State
  const [holidays, setHolidays] = useState<CompanyHolidayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<CompanyHolidayItem | null>(null);
  const [modalForm, setModalForm] = useState<{
    name: string;
    date: string;
    holiday_type: string;
    institution_type: string;
    description: string;
  }>({
    name: '',
    date: '',
    holiday_type: 'Holiday',
    institution_type: 'All holidays (any institution)',
    description: '',
  });
  const [savingHoliday, setSavingHoliday] = useState<boolean>(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInstitution, setUploadInstitution] = useState<string>('All holidays (any institution)');
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deletingHoliday, setDeletingHoliday] = useState<CompanyHolidayItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch dynamic institutions / branches from DB
  // 1. Fetch dynamic institutions / organisations from DB
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const [hoRes, superRes, settingsRes] = await Promise.all([
          apiClient.get<any>('/ho/organizations').catch(() => null),
          apiClient.get<any>('/superadmin/organizations').catch(() => null),
          apiClient.get<any>('/settings/branches').catch(() => null),
        ]);

        const rawList =
          (hoRes as any)?.organizations ||
          (hoRes as any)?.data?.organizations ||
          (Array.isArray(hoRes) ? hoRes : (hoRes as any)?.data) ||
          (superRes as any)?.organizations ||
          (superRes as any)?.branches ||
          (Array.isArray(superRes) ? superRes : (superRes as any)?.data) ||
          (Array.isArray(settingsRes) ? settingsRes : (settingsRes as any)?.data) ||
          [];

        if (Array.isArray(rawList) && rawList.length > 0) {
          const mapped: BranchOption[] = rawList.map((b: any) => ({
            id: b.id || b.branch_id || b._id,
            name: b.branch_name || b.name || b.vahd_name || b.title || 'Organisation',
            code: b.branch_code || b.code || '',
          }));

          const seen = new Set<string>();
          const unique = mapped.filter((b) => {
            const key = (b.name || '').trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setBranches(unique);
        }
      } catch (err) {
        console.error('Failed to load organisations for calendar:', err);
      }
    };
    fetchBranches();
  }, []);

  // 2. Fetch holidays from database via backend API
  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const isAllInst =
        selectedInstitution === 'All holidays (any institution)' ||
        selectedInstitution === 'All' ||
        !selectedInstitution;

      const params: any = {
        year: selectedYear,
      };

      if (!isAllInst) {
        params.institution_type = selectedInstitution;
        params.branch_id = selectedInstitution;
      }

      const res = await hrmsApi.getHolidays(params);
      const data = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [];
      setHolidays(data);
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
      showToast(err.response?.data?.detail || err.message || 'Failed to load holidays from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear, selectedInstitution]);

  // 3. Fetch work calendars from database via backend API
  const fetchWorkCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const res = await hrmsApi.getWorkCalendars();
      const list = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setWorkCalendars(list);
    } catch (err: any) {
      console.error('Failed to load work calendars:', err);
    } finally {
      setLoadingCalendars(false);
    }
  };

  useEffect(() => {
    fetchWorkCalendars();
  }, []);

  const handleOpenAddCal = () => {
    setEditingCal(null);
    setCalForm({
      name: '',
      calendar_type: 'Standard Corporate',
      department: 'All',
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      weekly_off_days: ['Saturday', 'Sunday'],
      default_shift_code: 'GEN',
      is_default: false,
    });
    setShowAddEditCalModal(true);
  };

  const handleOpenEditCal = (cal: WorkCalendarItem) => {
    setEditingCal(cal);
    setCalForm({
      name: cal.name || '',
      calendar_type: cal.calendar_type || 'Standard Corporate',
      department: cal.department || 'All',
      working_days: cal.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      weekly_off_days: cal.weekly_off_days || ['Saturday', 'Sunday'],
      default_shift_code: cal.default_shift_code || 'GEN',
      is_default: !!cal.is_default,
    });
    setShowAddEditCalModal(true);
  };

  const handleSaveCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calForm.name.trim()) {
      showToast('Calendar name is required', 'error');
      return;
    }
    setSavingCal(true);
    try {
      const payload: any = {
        name: calForm.name.trim(),
        calendar_type: calForm.calendar_type,
        department: calForm.department,
        working_days: calForm.working_days,
        weekly_off_days: calForm.weekly_off_days,
        default_shift_code: calForm.default_shift_code,
        is_default: calForm.is_default,
      };
      if (editingCal?.id) {
        payload.id = editingCal.id;
      }
      await hrmsApi.saveWorkCalendar(payload);
      showToast(editingCal ? 'Work calendar updated successfully' : 'Work calendar created successfully');
      setShowAddEditCalModal(false);
      fetchWorkCalendars();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to save work calendar', 'error');
    } finally {
      setSavingCal(false);
    }
  };

  const handleToggleDefault = async (cal: WorkCalendarItem) => {
    try {
      await hrmsApi.saveWorkCalendar({
        id: cal.id,
        name: cal.name,
        is_default: !cal.is_default,
      });
      showToast(cal.is_default ? 'Default removed' : 'Set as default calendar');
      fetchWorkCalendars();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to update calendar default status', 'error');
    }
  };

  const handleConfirmDeleteCal = async () => {
    if (!deletingCal) return;
    setDeletingCalLoading(true);
    try {
      await hrmsApi.deleteWorkCalendar(deletingCal.id);
      showToast('Work calendar deleted successfully');
      setDeletingCal(null);
      fetchWorkCalendars();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to delete work calendar', 'error');
    } finally {
      setDeletingCalLoading(false);
    }
  };

  // Normalize date string helper (handles ISO strings, dates with timestamps, and various formats)
  const normalizeDateKey = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const str = String(raw).trim().split('T')[0].split(' ')[0];
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY -> convert to YYYY-MM-DD
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return str;
  };

  // Map of date string YYYY-MM-DD -> Holiday items
  const holidayMap = useMemo(() => {
    const map: Record<string, CompanyHolidayItem[]> = {};
    for (const h of holidays) {
      if (h.date) {
        const key = normalizeDateKey(h.date);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(h);
      }
    }
    return map;
  }, [holidays]);

  // Open Add Modal
  const handleOpenAdd = (presetDate?: string) => {
    if (!canAdd) {
      showToast('You do not have permission to add holidays. Contact Head Office.', 'error');
      return;
    }
    setEditingHoliday(null);
    setModalForm({
      name: '',
      date: presetDate || `${selectedYear}-01-01`,
      holiday_type: 'Holiday',
      institution_type: selectedInstitution || 'All holidays (any institution)',
      description: '',
    });
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (holiday: CompanyHolidayItem) => {
    if (!canEdit) {
      showToast('You do not have permission to edit holidays. Contact Head Office.', 'error');
      return;
    }
    setEditingHoliday(holiday);
    setModalForm({
      name: holiday.name,
      date: holiday.date,
      holiday_type: holiday.holiday_type || holiday.raw_holiday_type || 'India holiday',
      institution_type: holiday.institution_type || 'All holidays (any institution)',
      description: holiday.description || '',
    });
    setShowAddEditModal(true);
  };

  // Save or Update Holiday
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name.trim() || !modalForm.date) {
      showToast('Please provide a valid holiday name and date', 'error');
      return;
    }

    setSavingHoliday(true);
    try {
      if (editingHoliday?.id) {
        await hrmsApi.updateHoliday(editingHoliday.id, modalForm);
        showToast(`Holiday "${modalForm.name}" updated successfully.`);
      } else {
        await hrmsApi.saveHoliday(modalForm);
        showToast(`Holiday "${modalForm.name}" added successfully.`);
      }
      setShowAddEditModal(false);
      fetchHolidays();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Error saving holiday';
      showToast(msg, 'error');
    } finally {
      setSavingHoliday(false);
    }
  };

  // Delete Holiday
  const handleConfirmDelete = async () => {
    if (!deletingHoliday?.id) return;
    if (!canDelete) {
      showToast('You do not have permission to delete holidays.', 'error');
      return;
    }

    setDeleting(true);
    try {
      await hrmsApi.deleteHoliday(deletingHoliday.id);
      showToast(`Holiday "${deletingHoliday.name}" deleted successfully.`);
      setDeletingHoliday(null);
      fetchHolidays();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete holiday';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('vahd_token') || localStorage.getItem('token') || '';
      const response = await fetch('/api/v1/hrms/holidays/template', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'holiday_upload_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Holiday template downloaded successfully.');
    } catch (err) {
      console.error('Failed to download template:', err);
      showToast('Failed to download template file', 'error');
    }
  };

  // Upload Holidays CSV / Excel
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('Please select a CSV or Excel file to upload', 'error');
      return;
    }
    if (!canImport) {
      showToast('You do not have permission to import holidays. Contact Head Office.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('institution_type', uploadInstitution);
      if (uploadInstitution !== 'All holidays (any institution)') {
        formData.append('branch_id', uploadInstitution);
      }

      const res: any = await hrmsApi.uploadHolidays(formData);
      const msg = res?.message || res?.data?.message || 'Holidays imported successfully.';
      showToast(msg);
      setShowUploadModal(false);
      setUploadFile(null);
      fetchHolidays();
      const resYears: number[] = res?.years || res?.data?.years || [];
      if (resYears.length > 0 && !resYears.includes(selectedYear)) {
        setSelectedYear(resYears[0]);
      } else {
        fetchHolidays();
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Calendar rendering helpers
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const renderMonth = (monthIndex: number) => {
    const firstDayIndex = new Date(selectedYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();

    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Collect all holidays belonging to this month
    const monthHolidays = holidays.filter((h) => {
      const key = normalizeDateKey(h.date);
      if (!key) return false;
      const parts = key.split('-');
      return parseInt(parts[0], 10) === selectedYear && parseInt(parts[1], 10) === (monthIndex + 1);
    });
    const hasHolidays = monthHolidays.length > 0;

    return (
      <div
        key={monthIndex}
        className={cn(
          "border rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-md transition-all duration-200",
          hasHolidays
            ? "border-amber-400 ring-1 ring-amber-300/50 shadow-amber-100/30"
            : "border-slate-200/80"
        )}
      >
        {/* Month Header - highlighted if holidays exist in this month */}
        <div
          className={cn(
            "py-2 px-3 flex items-center justify-between text-xs font-bold border-b transition-colors",
            hasHolidays
              ? "bg-amber-50/90 text-amber-950 border-amber-200"
              : "bg-slate-50/70 text-blue-600 border-slate-100"
          )}
        >
          <span className="font-extrabold tracking-wide">{MONTH_NAMES[monthIndex]}</span>
          {hasHolidays ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {monthHolidays.length} {monthHolidays.length === 1 ? 'holiday' : 'holidays'}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-normal">0 holidays</span>
          )}
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {WEEKDAYS.map((w, idx) => (
            <div
              key={idx}
              className="text-[11px] font-bold text-slate-400 text-center py-1 select-none"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 p-1.5 gap-1 bg-white">
          {blanks.map((b) => (
            <div key={`blank-${b}`} className="h-7 w-full" />
          ))}

          {days.map((d) => {
            const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayHolidays = holidayMap[dateStr] || [];
            const primaryHoliday = dayHolidays[0];

            return (
              <div
                key={`day-${d}`}
                onClick={() => {
                  if (primaryHoliday) {
                    handleOpenEdit(primaryHoliday);
                  } else {
                    handleOpenAdd(dateStr);
                  }
                }}
                title={
                  dayHolidays.length > 0
                    ? dayHolidays.map((h) => `${h.name} (${h.holiday_type || 'Holiday'})`).join(', ')
                    : `Click to add holiday for ${dateStr}`
                }
                className={cn(
                  'h-7 rounded-md text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-all relative',
                  primaryHoliday
                    ? 'bg-amber-500 text-white font-black shadow-xs hover:bg-amber-600 scale-[1.03] ring-1 ring-amber-600/30'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {d}
                {dayHolidays.length > 1 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                    +
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in font-sans pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            'fixed top-20 right-6 z-50 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-slide-in',
            toastType === 'success' ? 'bg-emerald-900/90 border border-emerald-500/30' : 'bg-rose-900/90 border border-rose-500/30'
          )}
        >
          <Icon name={toastType === 'success' ? 'check-circle' : 'alert-circle'} size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Header matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
            <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Home</span>
            <span className="text-slate-400">›</span>
            <span className="hover:text-blue-600 cursor-pointer" onClick={onBack}>Settings</span>
            <span className="text-slate-400">›</span>
            <span className="text-slate-900 font-bold">Calendar</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Calendar</h1>
          <p className="text-xs text-slate-500 font-medium">Holidays by institution type</p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <Icon name="arrow-left" size={14} />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'holidays'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          )}
        >
          <span>📅</span>
          <span>Holidays Calendar</span>
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-black', activeTab === 'holidays' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600')}>
            {holidays.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('work_calendars')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'work_calendars'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          )}
        >
          <span>⏱️</span>
          <span>Work Calendars & Shifts</span>
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-black', activeTab === 'work_calendars' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600')}>
            {workCalendars.length}
          </span>
        </button>
      </div>

      {activeTab === 'holidays' && (
        <>
          {/* Top Filter Bar matching Screenshot */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-end gap-3.5">
        {/* Institution type filter */}
        <div className="min-w-[260px] flex-1">
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Institution type <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="w-full py-2 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
            >
              <option value="All holidays (any institution)">All holidays (any institution)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Year filter */}
        <div className="w-[110px]">
          <label className="text-xs font-bold text-slate-700 block mb-1.5">Year</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full py-2 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons matching Screenshot */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {/* Get Holidays List button */}
          <button
            type="button"
            onClick={fetchHolidays}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Icon name="loader" size={14} className="animate-spin" />
            ) : (
              <Icon name="search" size={14} />
            )}
            <span>Get Holidays List</span>
          </button>

          {/* Upload Holidays button */}
          <button
            type="button"
            onClick={() => {
              if (!canImport) {
                showToast('You do not have permission to import holidays.', 'error');
                return;
              }
              setShowUploadModal(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Icon name="upload" size={14} className="text-slate-600" />
            <span>Upload Holidays</span>
          </button>

          {/* Download Template button */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Icon name="download" size={14} className="text-slate-600" />
            <span>Download Template</span>
          </button>

          {/* Add Holiday button */}
          {canAdd && (
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Icon name="plus" size={14} />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout matching Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 12-Month Calendar Grid (70% ~ 8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Calendar {selectedYear}
              </h2>
            </div>
          </div>

          {/* 12-Month Grid (3 cols x 4 rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-4">
            {MONTH_NAMES.map((_, idx) => renderMonth(idx))}
          </div>
        </div>

        {/* Right Column: Holidays List (30% ~ 4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col h-[750px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="text-sm font-black text-slate-900">Holidays List</h3>
            </div>
            <Badge variant="brand">{holidays.length} Holidays</Badge>
          </div>

          {/* Scrollable Holiday Card List matching screenshot */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {holidays.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Icon name="calendar" size={32} className="mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-bold text-slate-600">No holidays found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click 'Add Holiday' or 'Upload Holidays' to add events for {selectedYear}
                </p>
              </div>
            ) : (
              holidays.map((h) => {
                return (
                  <div
                    key={h.id || `${h.name}-${h.date}`}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-2xs group flex items-start justify-between gap-2"
                  >
                    <div>
                      <div>
                        <span className="text-xs font-black text-slate-900 leading-snug">
                          {h.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-1">
                        {h.date} {h.day_name ? `• ${h.day_name}` : ''}
                      </div>
                      {h.institution_type && h.institution_type !== 'All holidays (any institution)' && (
                        <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                          🏛️ {h.institution_type}
                        </div>
                      )}
                    </div>

                    {/* Action buttons matching screenshot */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(h)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Icon name="edit" size={11} className="text-slate-500" />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeletingHoliday(h)}
                          className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 shadow-2xs transition flex items-center justify-center cursor-pointer"
                        >
                          <Icon name="x" size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  )}

  {/* ───────────────────────────────────────────────────────────────── */}
  {/* SUB-TAB 2: WORK CALENDARS & SHIFTS                                */}
  {/* ───────────────────────────────────────────────────────────────── */}
  {activeTab === 'work_calendars' && (
    <div className="space-y-4">
      {/* Header Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-black text-slate-900">Work Calendars & Weekly Off Policies</h2>
          <p className="text-xs text-slate-500">Configure default working days, weekly off days, and shift policies across departments</p>
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={handleOpenAddCal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="plus" size={14} />
            <span>Add Work Calendar</span>
          </button>
        )}
      </div>

      {/* Calendars List */}
      {loadingCalendars ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Icon name="loader" size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs font-semibold">Loading work calendars...</p>
        </div>
      ) : workCalendars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <span className="text-3xl block mb-2">⏱️</span>
          <p className="text-xs font-bold text-slate-600">No work calendars configured yet</p>
          <p className="text-[11px] text-slate-400 mt-1">Create a work calendar to establish working schedules and weekly offs.</p>
          {canAdd && (
            <button
              type="button"
              onClick={handleOpenAddCal}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="plus" size={14} />
              <span>Create First Calendar</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workCalendars.map((cal) => (
            <div
              key={cal.id}
              className={cn(
                'bg-white rounded-2xl border p-5 shadow-2xs hover:shadow-md transition flex flex-col justify-between',
                cal.is_default ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-200/90'
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-slate-900">{cal.name}</h3>
                      {cal.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold">{cal.calendar_type || 'Standard Corporate'}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Department:</span>
                    <span className="font-bold text-slate-800">{cal.department || 'All'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Default Shift:</span>
                    <span className="font-bold text-slate-800">{cal.default_shift_code || 'GEN'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Working Days ({cal.working_days?.length || 0}):</span>
                    <div className="flex flex-wrap gap-1">
                      {(cal.working_days || []).map((day) => (
                        <span key={day} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block mb-1">Weekly Offs ({cal.weekly_off_days?.length || 0}):</span>
                    <div className="flex flex-wrap gap-1">
                      {(cal.weekly_off_days || []).map((day) => (
                        <span key={day} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50">
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleToggleDefault(cal)}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer',
                    cal.is_default
                      ? 'text-slate-500 hover:text-slate-700 bg-slate-50'
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  )}
                >
                  {cal.is_default ? 'Unset Default' : '⭐ Set as Default'}
                </button>
                <div className="flex items-center gap-1.5">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditCal(cal)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition cursor-pointer"
                      title="Edit Calendar"
                    >
                      <Icon name="edit-2" size={13} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeletingCal(cal)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                      title="Delete Calendar"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ADD / EDIT HOLIDAY                                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <Icon name="calendar" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Set holiday details dynamically in the database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveHoliday} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Holiday Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day, Diwali, Sunday"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={modalForm.date}
                    onChange={(e) => setModalForm({ ...modalForm, date: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Holiday Type
                  </label>
                  <select
                    value={modalForm.holiday_type}
                    onChange={(e) => setModalForm({ ...modalForm, holiday_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 transition"
                  >
                    <option value="Holiday">Holiday</option>
                    <option value="Public Holiday">Public Holiday</option>
                    <option value="Festival">Festival</option>
                    <option value="Rest Day">Rest Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Institution / Organization Mapping
                </label>
                <select
                  value={modalForm.institution_type}
                  onChange={(e) => setModalForm({ ...modalForm, institution_type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="All holidays (any institution)">All holidays (any institution)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Description / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes regarding this holiday"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingHoliday ? (
                    <>
                      <Icon name="loader" size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={14} />
                      <span>{editingHoliday ? 'Update Holiday' : 'Save Holiday'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: UPLOAD HOLIDAYS (CSV / EXCEL)                            */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Icon name="upload" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Upload Calendar Holidays</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Import multiple holidays at once using CSV or Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Institution / Organization
                </label>
                <select
                  value={uploadInstitution}
                  onChange={(e) => setUploadInstitution(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="All holidays (any institution)">All holidays (any institution)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* File Drop Area */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload CSV or Excel File (.csv, .xlsx, .xls)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Icon name="file-text" size={20} />
                  </div>
                  {uploadFile ? (
                    <div>
                      <p className="text-xs font-bold text-slate-800">{uploadFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(uploadFile.size / 1024).toFixed(1)} KB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Click here to browse and select file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Supports CSV, XLSX, XLS formats</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Download sample link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 font-medium">Need the correct column structure?</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Icon name="download" size={12} />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Icon name="loader" size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="upload" size={14} />
                      <span>Upload & Import</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: DELETE CONFIRMATION                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {deletingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
              <Icon name="trash" size={22} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Delete Holiday</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to delete <strong>{deletingHoliday.name}</strong> on{' '}
                <strong>{deletingHoliday.date}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingHoliday(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Icon name="loader" size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Icon name="trash" size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: ADD / EDIT WORK CALENDAR                                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showAddEditCalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingCal ? 'Edit Work Calendar' : 'Add Work Calendar'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Define working schedule and weekly off days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEditCalModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Calendar Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard 5-Day Corporate"
                  value={calForm.name}
                  onChange={(e) => setCalForm({ ...calForm, name: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Calendar Type</label>
                  <select
                    value={calForm.calendar_type}
                    onChange={(e) => setCalForm({ ...calForm, calendar_type: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="Standard Corporate">Standard Corporate</option>
                    <option value="5-Day Workweek">5-Day Workweek</option>
                    <option value="6-Day Workweek">6-Day Workweek</option>
                    <option value="Shift Based">Shift Based</option>
                    <option value="Academic">Academic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="All"
                    value={calForm.department}
                    onChange={(e) => setCalForm({ ...calForm, department: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Working Days</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const isSelected = calForm.working_days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          const updated = isSelected
                            ? calForm.working_days.filter((d) => d !== day)
                            : [...calForm.working_days, day];
                          const updatedOffs = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter((d) => !updated.includes(d));
                          setCalForm({ ...calForm, working_days: updated, weekly_off_days: updatedOffs });
                        }}
                        className={cn(
                          'py-1.5 px-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer',
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Default Shift Code</label>
                  <input
                    type="text"
                    placeholder="GEN"
                    value={calForm.default_shift_code}
                    onChange={(e) => setCalForm({ ...calForm, default_shift_code: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calForm.is_default}
                      onChange={(e) => setCalForm({ ...calForm, is_default: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Set as Organization Default</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditCalModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingCal ? (
                    <>
                      <Icon name="loader" size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={14} />
                      <span>{editingCal ? 'Update Calendar' : 'Create Calendar'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: DELETE WORK CALENDAR CONFIRMATION                        */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {deletingCal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Icon name="alert-triangle" size={24} />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Delete Work Calendar</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to delete <strong>{deletingCal.name}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCal}
                disabled={deletingCalLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingCalLoading ? (
                  <>
                    <Icon name="loader" size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Icon name="trash" size={14} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

