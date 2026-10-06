import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  downloadStudentSampleXlsx,
  downloadStudentSampleCsv,
  downloadEmployeeSampleXlsx,
  downloadEmployeeSampleCsv,
  exportStudentsToXlsx,
  exportStudentsToCsv,
  exportEmployeesToXlsx,
  exportEmployeesToCsv,
} from '@/lib/bulk-import-export-utils';
import { HrmsBulkImportModal } from './HrmsBulkImportModal';

export interface HrmsImportExportControlsProps {
  type: 'students' | 'employees';
  dataToExport?: any[];
  onImportSuccess?: (count: number) => void;
  className?: string;
  showExport?: boolean;
}

export function HrmsImportExportControls({
  type,
  dataToExport = [],
  onImportSuccess,
  className = '',
  showExport = true,
}: HrmsImportExportControlsProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isStudent = type === 'students';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadSampleXlsx = () => {
    if (isStudent) {
      downloadStudentSampleXlsx();
    } else {
      downloadEmployeeSampleXlsx();
    }
  };

  const handleDownloadSampleCsv = () => {
    if (isStudent) {
      downloadStudentSampleCsv();
    } else {
      downloadEmployeeSampleCsv();
    }
  };

  const handleExportXlsx = () => {
    setExportDropdownOpen(false);
    const dateStr = new Date().toISOString().slice(0, 10);
    if (isStudent) {
      exportStudentsToXlsx(dataToExport, `vahd_students_${dateStr}.xlsx`);
    } else {
      exportEmployeesToXlsx(dataToExport, `vahd_employees_${dateStr}.xlsx`);
    }
  };

  const handleExportCsv = () => {
    setExportDropdownOpen(false);
    const dateStr = new Date().toISOString().slice(0, 10);
    if (isStudent) {
      exportStudentsToCsv(dataToExport, `vahd_students_${dateStr}.csv`);
    } else {
      exportEmployeesToCsv(dataToExport, `vahd_employees_${dateStr}.csv`);
    }
  };

  return (
    <div className={`flex items-center gap-2.5 flex-wrap ${className}`}>
      
      {/* 1. Import Excel / CSV Button */}
      <button
        type="button"
        onClick={() => setImportModalOpen(true)}
        className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-900/60 flex items-center gap-1.5 transition-all duration-150 shadow-2xs cursor-pointer active:scale-[0.98]"
        title={`Bulk Import ${isStudent ? 'Students' : 'Employees'} via Excel or CSV`}
      >
        <div className="w-4 h-4 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
          <Icon name="upload-cloud" size={12} />
        </div>
        <span>Import Excel / CSV</span>
      </button>

      {/* 2. Sample .xlsx Download Link */}
      <button
        type="button"
        onClick={handleDownloadSampleXlsx}
        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors cursor-pointer py-1 px-1"
        title={`Download sample Excel template for bulk ${isStudent ? 'students' : 'employees'} upload`}
      >
        <span className="text-[11px]">Sample .xlsx</span>
      </button>

      {/* 3. Sample .csv Download Link */}
      <button
        type="button"
        onClick={handleDownloadSampleCsv}
        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors cursor-pointer py-1 px-1"
        title={`Download sample CSV template for bulk ${isStudent ? 'students' : 'employees'} upload`}
      >
        <span className="text-[11px]">Sample .csv</span>
      </button>

      {/* 4. Export Button & Dropdown */}
      {showExport && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            title="Export Records"
          >
            <Icon name="download" size={13} className="text-slate-500" />
            <span>Export</span>
            <Icon name="chevron-down" size={12} className="text-slate-400" />
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 animate-fade-in text-xs font-bold">
              <button
                type="button"
                onClick={handleExportXlsx}
                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Icon name="file-spreadsheet" size={15} className="text-emerald-600" />
                <span>Export to Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Icon name="file-text" size={15} className="text-blue-600" />
                <span>Export to CSV (.csv)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      <HrmsBulkImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        type={type}
        onSuccess={(count) => {
          if (onImportSuccess) onImportSuccess(count);
        }}
      />
    </div>
  );
}
