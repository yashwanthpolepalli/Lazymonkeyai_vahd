import { useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { apiClient } from '@/services/apiClient';
import { hrmsApi } from '@/services/hrmsApi';
import {
  parseUploadedSpreadsheet,
  normalizeStudentImportRow,
  normalizeEmployeeImportRow,
  normalizeDepartmentImportRow,
  normalizeDesignationImportRow,
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
  normalizeCourseImportRow,
  type StudentImportRow,
  type EmployeeImportRow,
  type DepartmentImportRow,
  type DesignationImportRow,
  type CourseImportRow,
} from '@/lib/bulk-import-export-utils';

export interface HrmsBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'students' | 'employees' | 'departments' | 'designations' | 'courses';
  onSuccess: (count: number) => void;
}

export function HrmsBulkImportModal({
  isOpen,
  onClose,
  type,
  onSuccess,
}: HrmsBulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const isStudent = type === 'students';
  const isEmployee = type === 'employees';
  const isDepartment = type === 'departments';
  const isDesignation = type === 'designations';
  const isCourse = type === 'courses';

  const typeTitle = isStudent
    ? 'Students'
    : isEmployee
      ? 'Employees'
      : isDepartment
        ? 'Departments'
        : isDesignation
          ? 'Designations'
          : 'Courses & Programs';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    await processFile(dropped);
  };

  const processFile = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setErrorMsg('Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);
    setParsing(true);

    try {
      const rawData = await parseUploadedSpreadsheet(selectedFile);
      if (!Array.isArray(rawData) || rawData.length === 0) {
        setErrorMsg('The uploaded file is empty or could not be parsed.');
        setParsedRows([]);
        return;
      }

      if (isStudent) {
        const rows = rawData.map(normalizeStudentImportRow);
        setParsedRows(rows);
      } else if (isEmployee) {
        const rows = rawData.map(normalizeEmployeeImportRow);
        setParsedRows(rows);
      } else if (isDepartment) {
        const rows = rawData.map(normalizeDepartmentImportRow);
        setParsedRows(rows);
      } else if (isDesignation) {
        const rows = rawData.map(normalizeDesignationImportRow);
        setParsedRows(rows);
      } else {
        const rows = rawData.map(normalizeCourseImportRow);
        setParsedRows(rows);
      }
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setErrorMsg(err.message || 'Failed to read spreadsheet contents.');
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const validRows = parsedRows.filter((r) => {
    if (isStudent) {
      const s = r as StudentImportRow;
      return Boolean(s.fullName && (s.email || s.phone));
    } else if (isEmployee) {
      const e = r as EmployeeImportRow;
      return Boolean(e.fullName && (e.email || e.phone));
    } else if (isDepartment) {
      const d = r as DepartmentImportRow;
      return Boolean(d.name?.trim());
    } else if (isDesignation) {
      const desg = r as DesignationImportRow;
      return Boolean(desg.title?.trim());
    } else {
      const c = r as CourseImportRow;
      return Boolean(c.name?.trim());
    }
  });

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      setErrorMsg('No valid rows found to import. Please check that Full Name and Email/Phone are provided.');
      return;
    }

    setImporting(true);
    setProgress(0);
    setErrorMsg(null);

    let userHoId: string | undefined = undefined;
    let userOwnerId: string | undefined = undefined;
    let userBranchId: string | undefined = undefined;
    const selectedOrgId = localStorage.getItem('vahd_selected_org_id');
    try {
      const uStr = localStorage.getItem('vahd_user');
      if (uStr) {
        const parsed = JSON.parse(uStr);
        const role = (parsed?.role || '').toUpperCase();
        userHoId = parsed?.ho_id || (['HEAD_OFFICE', 'HO'].includes(role) ? parsed?.id : undefined);
        userOwnerId = parsed?.owner_id || (['OWNER'].includes(role) ? parsed?.id : undefined);
        userBranchId = parsed?.branch_id || undefined;
      }
    } catch {}
    const defaultBranchId = (selectedOrgId && selectedOrgId !== 'all') ? selectedOrgId : userBranchId;

    let successCount = 0;
    const total = validRows.length;

    try {
      for (let i = 0; i < total; i++) {
        const row = validRows[i];
        if (isStudent) {
          const s = row as StudentImportRow;
          const courseStr = s.course?.trim() || '';
          const mediumStr = s.medium?.trim() || '';
          const studentEmail = s.email?.trim() || (s.phone ? `${s.phone}@student.portal` : `${s.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}${Date.now() % 10000}@student.portal`);

          const payload = {
            full_name: s.fullName.toUpperCase().trim(),
            email: studentEmail.toLowerCase(),
            phone: s.phone?.trim() || '',
            gender: (s.gender || '').toLowerCase(),
            age: s.age ? Number(s.age) : undefined,
            role: 'STUDENT',
            goal: courseStr ? `${courseStr}${mediumStr ? ` (${mediumStr} Medium)` : ''}` : 'Student Admission',
            status: s.status || 'ACTIVE',
            branch_id: defaultBranchId,
            ho_id: userHoId,
            owner_id: userOwnerId,
            meta_data: {
              admission_type: 'DEGREE_ADMISSION',
              course: courseStr,
              medium: mediumStr,
              branch_id: defaultBranchId,
              ho_id: userHoId,
              owner_id: userOwnerId,
              academic_year: s.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
              father_name: s.fatherName?.toUpperCase().trim() || '',
              mother_name: s.motherName?.toUpperCase().trim() || '',
              permanent_address: {
                door_no: s.permDoorNo || '',
                street: s.permStreet || '',
                village: s.permVillage || '',
                mandal: s.permMandal || '',
                district: s.permDistrict || '',
                state: s.permState || '',
                mobile: s.permMobile || s.phone || '',
              },
              present_address: {
                door_no: s.presDoorNo || '',
                street: s.presStreet || '',
                village: s.presVillage || '',
                mandal: s.presMandal || '',
                district: s.presDistrict || '',
                state: s.presState || '',
                mobile: s.presMobile || '',
                telephone: s.telephone || '',
              },
              dob: s.dob || '',
              age: s.age || '',
              caste: s.caste || '',
              sub_caste: s.subCaste || '',
              aadhar_number: s.aadharNumber || '',
              enrolled_at: new Date().toISOString(),
            },
          };

          await apiClient.post('/students', payload).catch(() => null);
        } else if (isEmployee) {
          const e = row as EmployeeImportRow;
          const empEmail = e.email?.trim() || (e.phone ? `${e.phone}@staff.portal` : `${e.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}${Date.now() % 10000}@staff.portal`);
          const parts = e.fullName.trim().split(' ');

          const payload = {
            full_name: e.fullName.trim(),
            first_name: parts[0] || e.fullName.trim(),
            last_name: parts.slice(1).join(' ') || '',
            email: empEmail.toLowerCase(),
            phone: e.phone?.trim() || '',
            designation: e.designation?.trim() || '',
            department: e.department?.trim() || '',
            gender: e.gender ? e.gender.trim().toLowerCase() : '',
            code: e.code ? e.code.replace(/\D/g, '') : undefined,
            employment_type: e.employmentType?.trim() || '',
            joined_date: e.joinedDate?.trim() || '',
            salary: e.salary ? Number(e.salary) : 0,
            vahd_branch: e.branch?.trim() || '',
            specialization: e.areaOfService?.trim() || '',
            status: e.status?.trim() || '',
            is_active: e.status ? e.status.toLowerCase() !== 'inactive' : true,
          };

          await hrmsApi.createEmployee(payload).catch(() => null);
        } else if (isDepartment) {
          const d = row as DepartmentImportRow;
          await hrmsApi.createDepartment({
            name: d.name.trim(),
            code: d.code?.trim() || '',
            head_name: d.headName?.trim() || '',
            description: d.description?.trim() || '',
            is_active: d.status ? d.status.toLowerCase() !== 'inactive' : true,
          }).catch(() => null);
        } else if (isDesignation) {
          const desg = row as DesignationImportRow;
          await hrmsApi.createDesignation({
            title: desg.title.trim(),
            department: desg.department?.trim() || '',
            level: desg.level?.trim() || '',
            description: desg.description?.trim() || '',
          }).catch(() => null);
        } else {
          const c = row as CourseImportRow;
          let durationVal = 1;
          let durationUnit = 'Years';
          if (c.durationYears && Number(c.durationYears) > 0) {
            durationVal = Number(c.durationYears);
            durationUnit = 'Years';
          } else if (c.durationMonths && Number(c.durationMonths) > 0) {
            durationVal = Number(c.durationMonths);
            durationUnit = 'Months';
          }
          const payload = {
            name: c.name.trim(),
            category: c.category?.trim() || 'General',
            department: c.category?.trim() || 'Academics',
            degree_type: c.degreeType?.trim() || 'Degree',
            classification: c.degreeType?.trim() || 'Core Subject',
            price: Number(c.price) || 0,
            duration_value: durationVal,
            duration_unit: durationUnit,
            description: c.description?.trim() || '',
            is_active: c.status ? c.status.toLowerCase() !== 'inactive' : true,
          };
          await apiClient.post('/courses/plans', payload).catch(() => null);
        }

        successCount++;
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      onSuccess(successCount);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Import encountered an issue: ${err?.message || 'Server error'}`);
    } finally {
      setImporting(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
              <Icon name="upload-cloud" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                Bulk Import {typeTitle}
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Upload your structured Excel (.xlsx) or CSV (.csv) file to import {typeTitle.toLowerCase()} in bulk.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200">

          {/* Quick Template Download Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                <Icon name="file-spreadsheet" size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Need a pre-formatted template?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Download sample templates with required column headers and sample data.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isStudent) downloadStudentSampleXlsx();
                  else if (isEmployee) downloadEmployeeSampleXlsx();
                  else if (isDepartment) downloadDepartmentSampleXlsx();
                  else if (isDesignation) downloadDesignationSampleXlsx();
                  else downloadCourseSampleXlsx();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="file-spreadsheet" size={14} className="text-emerald-600" />
                <span>Sample .xlsx</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isStudent) downloadStudentSampleCsv();
                  else if (isEmployee) downloadEmployeeSampleCsv();
                  else if (isDepartment) downloadDepartmentSampleCsv();
                  else if (isDesignation) downloadDesignationSampleCsv();
                  else downloadCourseSampleCsv();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="file-text" size={14} className="text-blue-600" />
                <span>Sample .csv</span>
              </button>
            </div>
          </div>

          {/* Upload Drop Zone */}
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 dark:border-blue-700/80 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center mx-auto shadow-inner">
                <Icon name="file-up" size={28} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Click to Browse or Drag &amp; Drop Spreadsheet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 5,000 rows.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-2xs">
                <span>Select File from Computer</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Icon name="alert-triangle" size={16} className="text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsing State */}
          {parsing && (
            <div className="p-6 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Reading and validating spreadsheet data...
              </div>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {file && !parsing && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    File: <span className="text-blue-600">{file.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {validRows.length} Valid Records
                  </span>
                  {parsedRows.length > validRows.length && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                      {parsedRows.length - validRows.length} Incomplete
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={resetUpload}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <Icon name="rotate-ccw" size={13} />
                  <span>Choose Another File</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'DEPARTMENT NAME'
                          : isDesignation
                            ? 'DESIGNATION TITLE'
                            : isCourse
                              ? 'COURSE / PROGRAM NAME'
                              : 'FULL NAME'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'CODE'
                          : isDesignation
                            ? 'DEPARTMENT'
                            : isCourse
                              ? 'CATEGORY / DEPT'
                              : 'EMAIL'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'HEAD OF DEPT'
                          : isDesignation
                            ? 'CAREER LEVEL'
                            : isCourse
                              ? 'DURATION'
                              : 'PHONE'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment || isDesignation || isCourse
                          ? 'DESCRIPTION'
                          : isStudent
                            ? 'COURSE & MEDIUM'
                            : 'DESIGNATION & DEPT'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment || isDesignation
                          ? 'STATUS'
                          : isCourse
                            ? 'TUITION FEE (₹)'
                            : isStudent
                              ? 'FATHER NAME'
                              : 'LOCATION'}
                      </th>
                      <th className="p-2.5 text-center">VALIDATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {parsedRows.map((row, idx) => {
                      const isValid = isStudent
                        ? Boolean((row as StudentImportRow).fullName && ((row as StudentImportRow).email || (row as StudentImportRow).phone))
                        : isEmployee
                          ? Boolean((row as EmployeeImportRow).fullName && ((row as EmployeeImportRow).email || (row as EmployeeImportRow).phone))
                          : isDepartment
                            ? Boolean((row as DepartmentImportRow).name?.trim())
                            : isDesignation
                              ? Boolean((row as DesignationImportRow).title?.trim())
                              : Boolean((row as CourseImportRow).name?.trim());

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                            !isValid && 'bg-amber-50/50 dark:bg-amber-950/20'
                          )}
                        >
                          <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            {isDepartment
                              ? (row.name || <span className="text-rose-500 italic">Missing Name</span>)
                              : isDesignation
                                ? (row.title || <span className="text-rose-500 italic">Missing Title</span>)
                                : isCourse
                                  ? (row.name || <span className="text-rose-500 italic">Missing Course</span>)
                                  : (row.fullName || <span className="text-rose-500 italic">Missing Name</span>)}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            {isDepartment
                              ? row.code || '—'
                              : isDesignation
                                ? row.department || 'ALL'
                                : isCourse
                                  ? row.category || 'General'
                                  : row.email || '—'}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            {isDepartment
                              ? row.headName || '—'
                              : isDesignation
                                ? row.level || 'Mid'
                                : isCourse
                                  ? (row.durationYears ? `${row.durationYears} Years` : row.durationMonths ? `${row.durationMonths} Months` : '1 Year')
                                  : row.phone || '—'}
                          </td>
                          <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            {isDepartment || isDesignation || isCourse
                              ? row.description || '—'
                              : isStudent
                                ? `${row.course || 'General'} (${row.medium || 'English'})`
                                : `${row.designation || 'Staff'} (${row.department || 'General'})`}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            {isDepartment || isDesignation
                              ? row.status || 'Active'
                              : isCourse
                                ? (row.price ? `₹${Number(row.price).toLocaleString()}` : '₹0')
                                : isStudent
                                  ? row.fatherName || '—'
                                  : row.branch || '—'}
                          </td>
                          <td className="p-2.5 text-center">
                            {isValid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                                Missing Fields
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Progress Bar when importing */}
              {importing && (
                <div className="space-y-1.5 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-100">
                    <span>Importing {validRows.length} records into database...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          {file && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || validRows.length === 0}
              className={cn(
                'px-5 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer',
                importing || validRows.length === 0
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 active:scale-[0.98]'
              )}
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing Records...</span>
                </>
              ) : (
                <>
                  <Icon name="upload-cloud" size={15} />
                  <span>Import {validRows.length} {isStudent ? 'Students' : 'Employees'}</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
