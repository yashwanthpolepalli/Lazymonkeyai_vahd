import { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { hrmsApi, CompanyHolidayItem } from '@/services/hrmsApi';
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

  // Filter States
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedInstitution, setSelectedInstitution] = useState<string>('All holidays (any institution)');
  const [branches, setBranches] = useState<BranchOption[]>([]);

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

  // Map of date string YYYY-MM-DD -> Holiday items
  const holidayMap = useMemo(() => {
    const map: Record<string, CompanyHolidayItem> = {};
    for (const h of holidays) {
      if (h.date) {
        // Only keep primary or last if multiple on same date
        map[h.date] = h;
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

    return (
      <div
        key={monthIndex}
        className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs hover:shadow-xs transition"
      >
        {/* Month Header matching reference screenshot */}
        <div className="py-2 px-3 text-center text-xs font-black text-blue-600 bg-slate-50/70 border-b border-slate-100">
          {MONTH_NAMES[monthIndex]}
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
            <div key={`blank-${b}`} className="h-6 w-full" />
          ))}

          {days.map((d) => {
            const dateStr = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const holiday = holidayMap[dateStr];

            return (
              <div
                key={`day-${d}`}
                onClick={() => {
                  if (holiday) {
                    handleOpenEdit(holiday);
                  } else {
                    handleOpenAdd(dateStr);
                  }
                }}
                title={holiday ? `${holiday.name}` : `Click to add holiday for ${dateStr}`}
                className={cn(
                  'h-6 rounded text-[11px] font-semibold flex items-center justify-center cursor-pointer transition-all',
                  holiday && 'bg-amber-100/90 text-amber-900 font-black border border-amber-300/80 shadow-2xs hover:bg-amber-200',
                  !holiday && 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {d}
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
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
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
    </div>
  );
}

