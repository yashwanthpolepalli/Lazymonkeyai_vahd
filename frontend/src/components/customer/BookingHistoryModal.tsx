import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { customerApi, type GymSlotBookingItem } from '@/services/customerApi';
import { formatDateDDMMYY, isPastDate, isToday, isSlotPassed } from '@/utils/date';
import { cn } from '@/utils/cn';

interface BookingHistoryModalProps {
  open: boolean;
  onClose: () => void;
  onCancelSuccess?: () => void;
}

export function BookingHistoryModal({ open, onClose, onCancelSuccess }: BookingHistoryModalProps) {
  const [history, setHistory] = useState<GymSlotBookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ATTENDED' | 'MISSED' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchHistory = () => {
    setLoading(true);
    customerApi.getMySlotBookings({ include_past: true })
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
        else setHistory([]);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  if (!open) return null;

  const handleCancelSlot = async (slotId: string) => {
    try {
      setCancellingId(slotId);
      await customerApi.cancelSlotBooking(slotId);
      setHistory((prev) =>
        prev.map((item) => (item.id === slotId ? { ...item, status: 'CANCELLED', attendance_status: 'CANCELLED' } : item))
      );
      if (onCancelSuccess) onCancelSuccess();
    } catch (_e) {
      // ignore
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusDetails = (b: GymSlotBookingItem) => {
    const isPast = isPastDate(b.booking_date);
    const isCancelled = b.status === 'CANCELLED';
    const today = isToday(b.booking_date);
    const hasAttended = b.attended === true || b.attendance_status === 'ATTENDED';
    const isPassed = isSlotPassed(b.booking_date, b.start_time, b.end_time || b.time_slot);

    let statusBadgeVariant: 'success' | 'danger' | 'brand' | 'warning' = 'success';
    let statusLabel = b.status;
    let attendanceText = '';

    if (isCancelled) {
      statusBadgeVariant = 'danger';
      statusLabel = 'CANCELLED';
      attendanceText = 'Booking Cancelled';
    } else if (hasAttended) {
      statusBadgeVariant = 'success';
      statusLabel = 'ATTENDED';
      attendanceText = b.check_in_time ? `Checked-in at ${b.check_in_time}` : 'Attended';
    } else if (isPast || (today && isPassed)) {
      statusBadgeVariant = 'warning';
      statusLabel = 'NOT ATTENDED';
      attendanceText = isPast ? 'Missed Session' : 'Slot Ended';
    } else if (today) {
      statusBadgeVariant = 'brand';
      statusLabel = 'TODAY';
      attendanceText = 'Pending Check-in';
    } else {
      statusBadgeVariant = 'brand';
      statusLabel = 'CONFIRMED';
      attendanceText = 'Upcoming';
    }

    // Cancel button is ONLY shown for active upcoming slots whose date/time has not passed
    const canCancel = !isCancelled && !isPast && !hasAttended && !isPassed;

    return { isPast, isCancelled, today, hasAttended, isPassed, canCancel, statusBadgeVariant, statusLabel, attendanceText };
  };

  const filteredHistory = history.filter((b) => {
    const isPast = isPastDate(b.booking_date);
    const isCancelled = b.status === 'CANCELLED';
    const hasAttended = b.attended === true || b.attendance_status === 'ATTENDED';

    if (filter === 'ATTENDED') return hasAttended && !isCancelled;
    if (filter === 'MISSED') return isPast && !hasAttended && !isCancelled;
    if (filter === 'ACTIVE') return !isPast && !hasAttended && !isCancelled;
    if (filter === 'CANCELLED') return isCancelled;
    return true;
  });

  const attendedCount = history.filter((b) => (b.attended || b.attendance_status === 'ATTENDED') && b.status !== 'CANCELLED').length;
  const missedCount = history.filter((b) => isPastDate(b.booking_date) && !b.attended && b.attendance_status !== 'ATTENDED' && b.status !== 'CANCELLED').length;
  const activeCount = history.filter((b) => !isPastDate(b.booking_date) && !b.attended && b.attendance_status !== 'ATTENDED' && b.status !== 'CANCELLED').length;
  const cancelledCount = history.filter((b) => b.status === 'CANCELLED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-navy-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-navy-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Icon name="history" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Booking History</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {history.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400">All your past, active, attended, and cancelled gym slot reservations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Filter Tabs & View Mode Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          {/* Left: Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                filter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              )}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{history.length}</span>
            </button>
            <button
              onClick={() => setFilter('ATTENDED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                filter === 'ATTENDED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              )}
            >
              <Icon name="check-circle" size={13} />
              <span>Attended</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{attendedCount}</span>
            </button>
            <button
              onClick={() => setFilter('MISSED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                filter === 'MISSED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              )}
            >
              <Icon name="alert-circle" size={13} />
              <span>Not Attended</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{missedCount}</span>
            </button>
            <button
              onClick={() => setFilter('ACTIVE')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                filter === 'ACTIVE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              )}
            >
              <span>Upcoming / Today</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{activeCount}</span>
            </button>
            <button
              onClick={() => setFilter('CANCELLED')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                filter === 'CANCELLED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              )}
            >
              <span>Cancelled</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">{cancelledCount}</span>
            </button>
          </div>

          {/* Right: Grid / Row View Switcher & Refresh Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/60">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  viewMode === 'grid'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                )}
              >
                <Icon name="grid" size={13} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('row')}
                title="Row View"
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  viewMode === 'row'
                    ? 'bg-white text-navy-950 shadow-xs'
                    : 'text-slate-600 hover:text-navy-900'
                )}
              >
                <Icon name="list" size={13} />
                <span className="hidden sm:inline">Row</span>
              </button>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loading}
              title="Refresh Bookings"
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-200/60 transition-colors border border-slate-200"
            >
              <Icon name="refresh-cw" size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Bookings List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading && history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Icon name="refresh-cw" size={24} className="animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-medium">Loading booking history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Icon name="calendar-off" size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No bookings found</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filter === 'ALL'
                    ? 'You have not booked any gym time slots yet.'
                    : `No bookings matching the ${filter.toLowerCase()} filter.`}
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ============================================================ */
            /* 1. GRID VIEW */
            /* ============================================================ */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredHistory.map((b) => {
                const { isPast, isCancelled, today, hasAttended, canCancel, statusBadgeVariant, statusLabel, attendanceText } = getStatusDetails(b);

                return (
                  <div
                    key={b.id}
                    className={cn(
                      'p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3',
                      isCancelled
                        ? 'bg-slate-50/80 border-slate-200/80 opacity-75'
                        : hasAttended
                        ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                        : isPast
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-500/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 flex-wrap">
                          <Icon name="calendar" size={13} className={hasAttended ? "text-emerald-600" : "text-indigo-600"} />
                          <span>{formatDateDDMMYY(b.booking_date)}</span>
                          {today && !isCancelled && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-bold uppercase tracking-wider">
                              Today
                            </span>
                          )}
                          <span className="text-slate-300 font-normal">·</span>
                          <span className={cn("font-mono font-bold", hasAttended ? "text-emerald-700" : "text-indigo-600")}>{b.time_slot}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Icon name="map-pin" size={11} className="text-slate-400" />
                          <span>Branch: {b.branch || b.branch_name || 'Main Branch'}</span>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant} dot>
                        {statusLabel}
                      </Badge>
                    </div>

                    {/* Workout Types */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Target Workout
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(b.workout_types || []).length > 0 ? (
                          b.workout_types.map((wt) => (
                            <span
                              key={wt}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                            >
                              {wt}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">General Workout</span>
                        )}
                      </div>
                    </div>

                    {/* Attendance Status Info */}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Icon
                          name={hasAttended ? "check-circle" : isCancelled ? "x" : isPast ? "alert-circle" : "clock"}
                          size={13}
                          className={hasAttended ? "text-emerald-600" : isCancelled ? "text-rose-500" : isPast ? "text-amber-500" : "text-indigo-500"}
                        />
                        <span>{attendanceText}</span>
                      </div>

                      {/* Cancel action ONLY if day is NOT passed and booking is active/unattended */}
                      {canCancel && (
                        <button
                          onClick={() => handleCancelSlot(b.id)}
                          disabled={cancellingId === b.id}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors disabled:opacity-50 px-2 py-0.5 rounded-md hover:bg-rose-50"
                        >
                          <Icon name="x-circle" size={13} />
                          <span>{cancellingId === b.id ? 'Cancelling...' : 'Cancel'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================ */
            /* 2. ROW / LIST VIEW */
            /* ============================================================ */
            <div className="space-y-2.5">
              {filteredHistory.map((b) => {
                const { isPast, isCancelled, today, hasAttended, canCancel, statusBadgeVariant, statusLabel, attendanceText } = getStatusDetails(b);

                return (
                  <div
                    key={b.id}
                    className={cn(
                      'p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      isCancelled
                        ? 'bg-slate-50/80 border-slate-200/80 opacity-75'
                        : hasAttended
                        ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                        : isPast
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        : 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-500/10 hover:border-indigo-300'
                    )}
                  >
                    {/* Left: Date, Time & Branch */}
                    <div className="flex items-start sm:items-center gap-3 min-w-[240px]">
                      <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", hasAttended ? "bg-emerald-100/70 border-emerald-200 text-emerald-700" : "bg-indigo-50 border-indigo-100 text-indigo-600")}>
                        <Icon name={hasAttended ? "check-circle" : "calendar"} size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 flex-wrap">
                          <span>{formatDateDDMMYY(b.booking_date)}</span>
                          {today && !isCancelled && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-bold uppercase tracking-wider">
                              Today
                            </span>
                          )}
                          <span className="text-slate-300 font-normal">·</span>
                          <span className={cn("font-mono font-bold", hasAttended ? "text-emerald-700" : "text-indigo-600")}>{b.time_slot}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Icon name="map-pin" size={11} className="text-slate-400" />
                          <span>Branch: {b.branch || b.branch_name || 'Main Branch'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Workout Target Tags & Attendance Detail */}
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(b.workout_types || []).length > 0 ? (
                          b.workout_types.map((wt) => (
                            <span
                              key={wt}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                            >
                              {wt}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">General Workout</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Icon
                          name={hasAttended ? "check-circle" : isCancelled ? "x" : isPast ? "alert-circle" : "clock"}
                          size={12}
                          className={hasAttended ? "text-emerald-600" : isCancelled ? "text-rose-500" : isPast ? "text-amber-500" : "text-indigo-500"}
                        />
                        <span>{attendanceText}</span>
                      </div>
                    </div>

                    {/* Right: Status Badge & Cancel Action (Only for active / unpassed days) */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <Badge variant={statusBadgeVariant} dot>
                        {statusLabel}
                      </Badge>
                      {canCancel && (
                        <button
                          onClick={() => handleCancelSlot(b.id)}
                          disabled={cancellingId === b.id}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors disabled:opacity-50 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-100"
                        >
                          <Icon name="x-circle" size={13} />
                          <span>{cancellingId === b.id ? 'Cancelling...' : 'Cancel'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Icon name="info" size={14} className="text-indigo-600" />
            <span>Past slots are saved in history. Active slots auto-refresh on 24h EOD.</span>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-1.5 rounded-xl font-bold hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
