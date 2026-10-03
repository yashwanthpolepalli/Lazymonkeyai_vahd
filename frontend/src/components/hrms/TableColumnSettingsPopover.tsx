import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export interface ColumnItem {
  key: string;
  label: string;
}

export interface ColumnGroup {
  name: string;
  columns: ColumnItem[];
}

interface TableColumnSettingsPopoverProps {
  groups: ColumnGroup[];
  selectedColumns: Record<string, boolean>;
  onToggleColumn: (key: string) => void;
  onSelectAll: () => void;
  onReset: () => void;
  className?: string;
}

export function TableColumnSettingsPopover({
  groups,
  selectedColumns,
  onToggleColumn,
  onSelectAll,
  onReset,
  className,
}: TableColumnSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const activeColumnCount = Object.values(selectedColumns).filter(Boolean).length;

  return (
    <div className={cn('relative inline-block text-left', className)} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer',
          isOpen
            ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-500/20'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
        )}
      >
        <Icon name="settings" size={14} className={isOpen ? 'text-blue-600' : 'text-slate-500'} />
        <span>Column Settings</span>
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
          {activeColumnCount}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in text-xs">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">Table Columns</h4>
              <p className="text-[10px] text-slate-400">Choose visible columns</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-xs cursor-pointer transition"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={onReset}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-xs cursor-pointer transition"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Scrollable Column Groups */}
          <div className="p-3.5 max-h-[380px] overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
            {groups.map((group, gIdx) => (
              <div key={group.name} className={cn(gIdx > 0 && 'pt-3.5', 'space-y-1.5')}>
                <div className="text-[10px] font-black tracking-wider uppercase text-blue-600 dark:text-blue-400 px-1">
                  {group.name}
                </div>
                <div className="space-y-0.5">
                  {group.columns.map((col) => {
                    const isChecked = !!selectedColumns[col.key];
                    return (
                      <label
                        key={col.key}
                        className={cn(
                          'flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none',
                          isChecked
                            ? 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-slate-900 dark:text-slate-100 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleColumn(col.key)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-xs">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{activeColumnCount} columns visible</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
