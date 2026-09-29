import React, { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { cn, formatDisplayDate } from "@/lib/utils";

interface DatePickerInputProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (val: string) => void; // returns ISO date string YYYY-MM-DD
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
}

export function DatePickerInput({
  value,
  onChange,
  className,
  disabled = false,
  min,
  max,
  placeholder = "DD/MM/YYYY",
}: DatePickerInputProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => formatDisplayDate(value));

  useEffect(() => {
    setDisplayValue(formatDisplayDate(value));
  }, [value]);

  const handleOpenPicker = () => {
    if (disabled) return;
    try {
      if (hiddenInputRef.current && typeof (hiddenInputRef.current as any).showPicker === "function") {
        (hiddenInputRef.current as any).showPicker();
      } else {
        hiddenInputRef.current?.focus();
        hiddenInputRef.current?.click();
      }
    } catch {
      hiddenInputRef.current?.click();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // If user typed complete valid DD/MM/YYYY
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        onChange(iso);
      }
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      onChange(isoVal);
      setDisplayValue(formatDisplayDate(isoVal));
    }
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      {/* Hidden native input for picker popup */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ""}
        onChange={handleNativeDateChange}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full -z-10"
        aria-hidden="true"
      />

      {/* Visible Formatted Input */}
      <input
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        onClick={handleOpenPicker}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full h-8 bg-white border border-slate-200 rounded-xl pl-2.5 pr-8 text-[11px] font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all",
          disabled && "bg-slate-100 opacity-60 cursor-not-allowed"
        )}
      />

      {/* Calendar Icon Button */}
      <button
        type="button"
        onClick={handleOpenPicker}
        disabled={disabled}
        tabIndex={-1}
        className="absolute right-2 text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
        title="Open Calendar"
      >
        <Calendar className="size-3.5" />
      </button>
    </div>
  );
}
