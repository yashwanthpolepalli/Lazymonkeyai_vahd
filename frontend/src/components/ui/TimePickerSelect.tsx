import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

interface TimePickerSelectProps {
  value: string; // e.g. "09:00 AM"
  onChange: (timeStr: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

function parseTime(val: string): { hour: string; minute: string; period: 'AM' | 'PM' } {
  if (!val) {
    return { hour: '09', minute: '00', period: 'AM' };
  }
  const clean = val.trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const p = match[3] ? (match[3].toUpperCase() as 'AM' | 'PM') : h >= 12 ? 'PM' : 'AM';
    h = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      period: p,
    };
  }
  return { hour: '09', minute: '00', period: 'AM' };
}

export function TimePickerSelect({
  value,
  onChange,
  disabled = false,
  placeholder = 'HH:MM (e.g. 09:00 AM)',
  className,
}: TimePickerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursColRef = useRef<HTMLDivElement>(null);
  const minutesColRef = useRef<HTMLDivElement>(null);

  const { hour, minute, period } = useMemo(() => parseTime(value), [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active hour and minute to top when opening popover (matching Image 2)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (hoursColRef.current) {
          const activeHourEl = hoursColRef.current.querySelector('[data-selected="true"]') as HTMLElement;
          if (activeHourEl) {
            hoursColRef.current.scrollTop = activeHourEl.offsetTop;
          }
        }
        if (minutesColRef.current) {
          const activeMinEl = minutesColRef.current.querySelector('[data-selected="true"]') as HTMLElement;
          if (activeMinEl) {
            minutesColRef.current.scrollTop = activeMinEl.offsetTop;
          }
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${minute} ${period}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${hour}:${m} ${period}`);
  };

  const handleSelectPeriod = (p: 'AM' | 'PM') => {
    onChange(`${hour}:${minute} ${p}`);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Trigger matching Screenshot */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          'w-full pl-3.5 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between text-left transition',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400',
          disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-75' : 'hover:border-slate-300 cursor-pointer',
          isOpen && 'border-purple-500 ring-2 ring-purple-500/20',
          className
        )}
      >
        <span className={cn(!value && 'text-slate-400 font-normal')}>
          {value || placeholder}
        </span>
        <Icon
          name="clock"
          size={14}
          className={cn('text-slate-400 shrink-0 transition-colors', isOpen && 'text-purple-600')}
        />
      </button>

      {/* 3-Column Scrollable Popover Picker (Exactly matching Image 2) */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Column 1: Hours (01 - 12) */}
          <div
            ref={hoursColRef}
            className="w-14 h-52 overflow-y-auto border-r border-slate-100 select-none scroll-smooth py-0.5 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {HOURS.map((h) => {
              const isSelected = h === hour;
              return (
                <div
                  key={`h-${h}`}
                  data-selected={isSelected}
                  onClick={() => handleSelectHour(h)}
                  className={cn(
                    'py-2 text-center text-xs transition cursor-pointer select-none',
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  )}
                >
                  {h}
                </div>
              );
            })}
          </div>

          {/* Column 2: Minutes (00 - 59) */}
          <div
            ref={minutesColRef}
            className="w-14 h-52 overflow-y-auto border-r border-slate-100 select-none scroll-smooth py-0.5 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {MINUTES.map((m) => {
              const isSelected = m === minute;
              return (
                <div
                  key={`m-${m}`}
                  data-selected={isSelected}
                  onClick={() => handleSelectMinute(m)}
                  className={cn(
                    'py-2 text-center text-xs transition cursor-pointer select-none',
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  )}
                >
                  {m}
                </div>
              );
            })}
          </div>

          {/* Column 3: AM / PM */}
          <div className="w-14 h-52 overflow-y-auto select-none py-0.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {PERIODS.map((p) => {
              const isSelected = p === period;
              return (
                <div
                  key={`p-${p}`}
                  data-selected={isSelected}
                  onClick={() => handleSelectPeriod(p)}
                  className={cn(
                    'py-2 text-center text-xs transition cursor-pointer select-none',
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  )}
                >
                  {p}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
