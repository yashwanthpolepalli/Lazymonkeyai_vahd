/**
 * Centralized Date & Time Utility with Indian Standard Time (IST, UTC+5:30) enforcement.
 */

/**
 * Returns a Date object representing the current moment in Indian Standard Time (IST).
 */
export function getISTNow(): Date {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(istString);
}

/**
 * Formats any date string or Date object into DD-MM-YY format (e.g. 15-09-26) in IST.
 */
export function formatDateDDMMYY(dateInput?: string | Date | null): string {
  if (!dateInput) return 'No active plan';
  
  // If string is already in DD-MM-YY or DD-MM-YYYY format, return cleanly
  if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{2,4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  // Format in IST timezone
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
  const month = parts.find((p) => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
  const year = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD strictly in Indian Standard Time (IST).
 */
export function getTodayISO(): string {
  const istDate = getISTNow();
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds days to a date string (YYYY-MM-DD) in IST and returns YYYY-MM-DD.
 */
export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO || Date.now());
  if (isNaN(d.getTime())) return getTodayISO();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time formatted in 12-hour AM/PM format strictly in IST (Asia/Kolkata).
 */
export function getCurrentTimeIST(): { time: string; period: 'AM' | 'PM'; full: string } {
  const ist = getISTNow();
  let hours = ist.getHours();
  const minutes = ist.getMinutes() >= 30 ? '30' : '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return {
    time: `${formattedHours}:${minutes}`,
    period: period as 'AM' | 'PM',
    full: `${formattedHours}:${minutes} ${period}`,
  };
}

/**
 * Returns next hour time formatted in 12-hour AM/PM format strictly in IST.
 */
export function getNextHourIST(): { time: string; period: 'AM' | 'PM'; full: string } {
  const ist = getISTNow();
  ist.setHours(ist.getHours() + 1);
  let hours = ist.getHours();
  const minutes = ist.getMinutes() >= 30 ? '30' : '00';
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, '0');
  return {
    time: `${formattedHours}:${minutes}`,
    period: period as 'AM' | 'PM',
    full: `${formattedHours}:${minutes} ${period}`,
  };
}

/**
 * Formats any ISO/UTC timestamp to an IST timestamp string (e.g. 15-09-2026 09:35 PM IST).
 */
export function formatTimestampIST(timestamp?: string | Date | null): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return String(timestamp);

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

/**
 * Normalizes any date format (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO string) to standard YYYY-MM-DD.
 */
export function normalizeDateToISO(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const dmyShortMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
    if (dmyShortMatch) {
      const [, day, month, year] = dmyShortMatch;
      return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if the date is strictly in the past (before today in IST).
 * Stays valid for today until 24:00 (EOD).
 */
export function isPastDate(dateInput?: string | Date | null): boolean {
  const iso = normalizeDateToISO(dateInput);
  if (!iso) return false;
  const today = getTodayISO();
  return iso < today;
}

/**
 * Returns true if the date is today in IST.
 */
export function isToday(dateInput?: string | Date | null): boolean {
  const iso = normalizeDateToISO(dateInput);
  if (!iso) return false;
  return iso === getTodayISO();
}

/**
 * Returns true if the slot's date or time has passed in IST.
 * - For past dates: always true.
 * - For future dates: always false.
 * - For today: true if current time is past the slot end time (or start time).
 */
export function isSlotPassed(dateInput?: string | Date | null, startTime?: string | null, endTime?: string | null): boolean {
  if (isPastDate(dateInput)) return true;
  if (!isToday(dateInput)) return false;

  const targetTime = endTime || startTime;
  if (!targetTime) return false;

  try {
    const istNow = getISTNow();
    const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

    const cleanTime = targetTime.split('-').pop()?.trim() || targetTime.trim();
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();

      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const slotMinutes = hours * 60 + minutes;
      return currentMinutes >= slotMinutes;
    }
  } catch (_e) {}

  return false;
}
