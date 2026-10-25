import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  downloadStudentSampleXlsx,
  downloadStudentSampleCsv,
  downloadEmployeeSampleXlsx,
  downloadEmployeeSampleCsv,
  downloadDepartmentSampleXlsx,
  downloadDepartmentSampleCsv,
  downloadDesignationSampleXlsx,
  downloadDesignationSampleCsv,
  downloadCourseSampleXlsx,
  downloadCourseSampleCsv,
  exportStudentsToXlsx,
  exportStudentsToCsv,
  exportEmployeesToXlsx,
  exportEmployeesToCsv,
  exportDepartmentsToXlsx,
  exportDepartmentsToCsv,
  exportDesignationsToXlsx,
  exportDesignationsToCsv,
  exportCoursesToXlsx,
  exportCoursesToCsv,
} from '@/lib/bulk-import-export-utils';
import { HrmsBulkImportModal } from './HrmsBulkImportModal';

export interface HrmsImportExportControlsProps {
  type: 'students' | 'employees' | 'departments' | 'designations' | 'courses';
  dataToExport?: any[];
  onImportSuccess?: (count?: number) => void;
  className?: string;
  showExport?: boolean;
  children?: React.ReactNode;
}

export function HrmsImportExportControls({
  type,
  dataToExport = [],
  onImportSuccess,
  className = '',
  showExport = true,
  children,
}: HrmsImportExportControlsProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const importDropdownRef = useRef<HTMLDivElement | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setImportDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadSampleXlsx = () => {
    if (type === 'students') downloadStudentSampleXlsx();
    else if (type === 'employees') downloadEmployeeSampleXlsx();
    else if (type === 'departments') downloadDepartmentSampleXlsx();
    else if (type === 'designations') downloadDesignationSampleXlsx();
    else downloadCourseSampleXlsx();
  };

  const handleDownloadSampleCsv = () => {
    if (type === 'students') downloadStudentSampleCsv();
    else if (type === 'employees') downloadEmployeeSampleCsv();
    else if (type === 'departments') downloadDepartmentSampleCsv();
    else if (type === 'designations') downloadDesignationSampleCsv();
    else downloadCourseSampleCsv();
  };

  const handleExportXlsx = () => {
    setExportDropdownOpen(false);
    const dateStr = new Date().toISOString().slice(0, 10);
    if (type === 'students') {
      exportStudentsToXlsx(dataToExport, `vahd_students_${dateStr}.xlsx`);
    } else if (type === 'employees') {
      exportEmployeesToXlsx(dataToExport, `vahd_employees_${dateStr}.xlsx`);
    } else if (type === 'departments') {
      exportDepartmentsToXlsx(dataToExport, `vahd_departments_${dateStr}.xlsx`);
    } else if (type === 'designations') {
      exportDesignationsToXlsx(dataToExport, `vahd_designations_${dateStr}.xlsx`);
    } else {
      exportCoursesToXlsx(dataToExport, `vahd_courses_${dateStr}.xlsx`);
    }
  };

  const handleExportCsv = () => {
    setExportDropdownOpen(false);
    const dateStr = new Date().toISOString().slice(0, 10);
    if (type === 'students') {
      exportStudentsToCsv(dataToExport, `vahd_students_${dateStr}.csv`);
    } else if (type === 'employees') {
      exportEmployeesToCsv(dataToExport, `vahd_employees_${dateStr}.csv`);
    } else if (type === 'departments') {
      exportDepartmentsToCsv(dataToExport, `vahd_departments_${dateStr}.csv`);
    } else if (type === 'designations') {
      exportDesignationsToCsv(dataToExport, `vahd_designations_${dateStr}.csv`);
    } else {
      exportCoursesToCsv(dataToExport, `vahd_courses_${dateStr}.csv`);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      
      {/* 1. Import Dropdown */}
      <div className="relative" ref={importDropdownRef}>
        <button
          type="button"
          onClick={() => {
            setImportDropdownOpen(!importDropdownOpen);
            setExportDropdownOpen(false);
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
          title={`Import ${type.charAt(0).toUpperCase() + type.slice(1)}`}
        >
          <Icon name="upload-cloud" size={13} className="text-blue-600 dark:text-blue-400" />
          <span>Import</span>
          <Icon name="chevron-down" size={12} className="text-blue-400" />
        </button>

        {importDropdownOpen && (
          <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 animate-fade-in text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setImportDropdownOpen(false);
                setImportModalOpen(true);
              }}
              className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="file-spreadsheet" size={15} className="text-emerald-600" />
              <span>Import Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportDropdownOpen(false);
                setImportModalOpen(true);
              }}
              className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="file-text" size={15} className="text-blue-600" />
              <span>Import CSV (.csv)</span>
            </button>
            <div className="my-1 border-t border-slate-100 dark:border-slate-800 px-3.5 py-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Sample Templates</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setImportDropdownOpen(false);
                handleDownloadSampleXlsx();
              }}
              className="w-full px-3.5 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="download" size={13} className="text-emerald-500" />
              <span>Sample Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportDropdownOpen(false);
                handleDownloadSampleCsv();
              }}
              className="w-full px-3.5 py-1.5 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Icon name="download" size={13} className="text-blue-500" />
              <span>Sample CSV (.csv)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Export Dropdown */}
      {showExport && (
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setExportDropdownOpen(!exportDropdownOpen);
              setImportDropdownOpen(false);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            title="Export Records"
          >
            <Icon name="download" size={13} className="text-slate-500" />
            <span>Export</span>
            <Icon name="chevron-down" size={12} className="text-slate-400" />
          </button>

          {exportDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 animate-fade-in text-xs font-bold">
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

      {/* Trailing Children (e.g. Primary action button aligned on the right of Export) */}
      {children}

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
