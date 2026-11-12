import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  downloadShiftTemplateSampleXlsx,
  downloadShiftTemplateSampleCsv,
  downloadHolidaySampleXlsx,
  downloadHolidaySampleCsv,
  normalizeCourseImportRow,
  normalizeShiftTemplateImportRow,
  normalizeHolidayImportRow,
  type StudentImportRow,
  type EmployeeImportRow,
  type DepartmentImportRow,
  type DesignationImportRow,
  type CourseImportRow,
  type ShiftTemplateImportRow,
  type HolidayImportRow,
} from '@/lib/bulk-import-export-utils';

export interface HrmsBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'students' | 'employees' | 'departments' | 'designations' | 'courses' | 'shift_templates' | 'holidays';
  onSuccess: (count: number) => void;
}

interface ImportCtx {
  defaultBranchId?: string;
  userHoId?: string;
  userOwnerId?: string;
}

// Student row → the exact payload the /students create endpoint accepts.
// (idx keeps synthesized emails unique across a whole file.)
function buildStudentPayload(s: StudentImportRow, ctx: ImportCtx, idx: number): any {
  const courseStr = s.course?.trim() || '';
  const mediumStr = s.medium?.trim() || '';
  const deptStr = s.department?.trim() || '';
  const cleanParentMobile = s.parentPhone?.trim() || '';
  const studentEmail = s.email?.trim() || (s.phone ? `${s.phone}@student.portal` : `${s.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}${idx % 100000}@student.portal`);

  return {
    full_name: s.fullName.toUpperCase().trim(),
    email: studentEmail.toLowerCase(),
    phone: s.phone?.trim() || '',
    parent_phone: cleanParentMobile || undefined,
    member_code: s.rollNo?.trim() || undefined,
    roll_no: s.rollNo?.trim() || undefined,
    qualification: s.qualification?.trim() || undefined,
    specialization: s.specialization?.trim() || undefined,
    department: deptStr || undefined,
    gender: (s.gender || '').toLowerCase(),
    age: s.age ? Number(s.age) : undefined,
    role: s.role?.trim() || undefined,
    goal: courseStr ? (mediumStr ? `${courseStr} (${mediumStr})` : courseStr) : undefined,
    status: s.status?.trim() || undefined,
    branch_id: ctx.defaultBranchId,
    ho_id: ctx.userHoId,
    owner_id: ctx.userOwnerId,
    primary_vahd_location: s.branch?.trim() || undefined,
    meta_data: {
      admission_type: s.admissionType?.trim() || undefined,
      course: courseStr,
      medium: mediumStr,
      department: deptStr,
      qualification: s.qualification?.trim() || undefined,
      specialization: s.specialization?.trim() || undefined,
      branch_id: ctx.defaultBranchId,
      ho_id: ctx.userHoId,
      owner_id: ctx.userOwnerId,
      academic_year: s.academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
      roll_number: s.rollNo?.trim() || undefined,
      student_number: s.rollNo?.trim() || undefined,
      code: s.rollNo?.trim() || undefined,
      father_name: s.fatherName?.toUpperCase().trim() || '',
      mother_name: s.motherName?.toUpperCase().trim() || '',
      parent_phone: cleanParentMobile,
      parent_occupation: s.parentOccupation || '',
      annual_income: s.annualIncome || '',
      blood_group: s.bloodGroup || '',
      caste: s.caste || '',
      sub_caste: s.subCaste || '',
      mother_tongue: s.motherTongue || '',
      nationality: s.nationality || '',
      marital_status: s.maritalStatus || '',
      place_of_birth: s.placeOfBirth || '',
      identification_marks: [s.identificationMark1 || '', s.identificationMark2 || ''].filter(Boolean),
      aadhar_number: s.aadharNumber || '',
      dob: s.dob || '',
      age: s.age || '',
      gender: s.gender || '',
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
      enrolled_at: new Date().toISOString(),
    },
  };
}

// Employee row → the exact payload the /hrms/employees create endpoint accepts.
function buildEmployeePayload(e: EmployeeImportRow, ctx: ImportCtx, idx: number): any {
  const empEmail = e.email?.trim() || (e.phone ? `${e.phone}@staff.portal` : `${e.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}${idx % 100000}@staff.portal`);
  const parts = e.fullName.trim().split(' ');

  return {
    full_name: e.fullName.trim(),
    first_name: parts[0] || e.fullName.trim(),
    last_name: parts.slice(1).join(' ') || '',
    email: empEmail.toLowerCase(),
    phone: e.phone?.trim() || '',
    designation: e.designation?.trim() || '',
    department: e.department?.trim() || '',
    gender: e.gender ? e.gender.trim().toLowerCase() : '',
    code: e.code ? e.code.trim() : undefined,
    role: e.role?.trim() || undefined,
    employment_type: e.employmentType?.trim() || undefined,
    joined_date: e.joinedDate?.trim() || '',
    salary: e.salary ? Number(e.salary) : undefined,
    vahd_branch: e.branch?.trim() || '',
    branch_id: ctx.defaultBranchId,
    ho_id: ctx.userHoId,
    owner_id: ctx.userOwnerId,
    specialization: e.areaOfService?.trim() || '',
    aadhar_number: e.aadharNumber?.trim() || '',
    pan_number: e.panNumber?.trim() || '',
    account_number: e.accountNumber?.trim() || '',
    ifsc_code: e.ifscCode?.trim() || '',
    address: e.presentAddress?.trim() || e.permanentAddress?.trim() || '',
    emergency_contact: e.emergencyContactNo ? `${e.emergencyName || ''} (${e.emergencyRelationship || ''}): ${e.emergencyContactNo}` : (e.emergencyContactNo || ''),
    skills: e.technicalSkills ? e.technicalSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
    status: e.status?.trim() || undefined,
    is_active: e.status ? e.status.toLowerCase() !== 'inactive' : undefined,
    meta_data: {
      form_title: 'PERSONAL DETAILS FORM',
      employee_code: e.code?.trim() || undefined,
      father_name: e.fatherName?.trim() || '',
      dob: e.dob?.trim() || '',
      age: e.age ? String(e.age) : '',
      blood_group: e.bloodGroup?.trim() || '',
      religion: e.religion?.trim() || '',
      caste: e.caste?.trim() || '',
      gender: e.gender ? e.gender.trim() : '',
      marital_status: e.maritalStatus?.trim() || '',
      work_experience_years: e.workExperienceYears?.trim() || '',
      area_of_service: e.areaOfService?.trim() || '',
      present_address: e.presentAddress?.trim() || '',
      permanent_address: e.permanentAddress?.trim() || '',
      emergency_details: {
        name: e.emergencyName?.trim() || '',
        relationship: e.emergencyRelationship?.trim() || '',
        address: e.emergencyAddress?.trim() || '',
        contact_no: e.emergencyContactNo?.trim() || '',
        note: e.emergencyNote?.trim() || '',
      },
      post_details: {
        location: e.branch?.trim() || '',
        department: e.department?.trim() || '',
        designation: e.designation?.trim() || '',
        joining_date: e.joinedDate?.trim() || '',
        role: e.role?.trim() || undefined,
        technical_skills: e.technicalSkills?.trim() || '',
      },
      bank_details: {
        account_holder_name: e.accountHolderName?.trim() || '',
        bank_name: e.bankName?.trim() || '',
        account_number: e.accountNumber?.trim() || '',
        branch_city: e.bankBranchCity?.trim() || '',
        account_type: e.bankAccountType?.trim() || undefined,
        ifsc_code: e.ifscCode?.trim() || '',
        pan_no: e.panNumber?.trim() || '',
      },
      reference_contact: {
        name: e.refName?.trim() || '',
        company: e.refCompany?.trim() || '',
        address: e.refAddress?.trim() || '',
        post: e.refPost?.trim() || '',
        telephone: e.refTelephone?.trim() || '',
        contact_no: e.refContactNo?.trim() || '',
      },
      enrolled_at: new Date().toISOString(),
    },
  };
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
  const [fileFilter, setFileFilter] = useState<'all' | 'ready' | 'invalid'>('all');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: { row: number; name: string; error: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isStudent = type === 'students';
  const isEmployee = type === 'employees';
  const isDepartment = type === 'departments';
  const isDesignation = type === 'designations';
  const isCourse = type === 'courses';
  const isShiftTemplate = type === 'shift_templates';
  const isHoliday = type === 'holidays';

  const typeTitle = isStudent
    ? 'Students'
    : isEmployee
      ? 'Employees'
      : isDepartment
        ? 'Departments'
        : isDesignation
          ? 'Designations'
          : isShiftTemplate
            ? 'Shift Templates'
            : isHoliday
              ? 'Holidays'
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
      } else if (isShiftTemplate) {
        const rows = rawData.map(normalizeShiftTemplateImportRow);
        setParsedRows(rows);
      } else if (isHoliday) {
        const rows = rawData.map(normalizeHolidayImportRow);
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

  const getRowValidation = (row: any) => {
    const missing: string[] = [];
    if (isStudent) {
      const s = row as StudentImportRow;
      if (!s.fullName?.trim()) missing.push('Full Name');
      if (!s.course?.trim()) missing.push('Course');
      if (!s.email?.trim() && !s.phone?.trim()) missing.push('Email or Mobile');
    } else if (isEmployee) {
      const e = row as EmployeeImportRow;
      if (!e.fullName?.trim()) missing.push('Full Name');
      if (!e.designation?.trim()) missing.push('Designation');
      if (!e.department?.trim()) missing.push('Department');
      if (!e.email?.trim() && !e.phone?.trim()) missing.push('Email or Mobile');
    } else if (isDepartment) {
      if (!(row as DepartmentImportRow).name?.trim()) missing.push('Department Name');
    } else if (isDesignation) {
      if (!(row as DesignationImportRow).title?.trim()) missing.push('Designation Title');
    } else if (isShiftTemplate) {
      const st = row as ShiftTemplateImportRow;
      if (!st.code?.trim()) missing.push('Shift Code');
      if (!st.name?.trim()) missing.push('Shift Name');
    } else if (isHoliday) {
      const h = row as HolidayImportRow;
      if (!h.name?.trim()) missing.push('Holiday Name');
      if (!h.date?.trim()) missing.push('Holiday Date');
    } else {
      if (!(row as CourseImportRow).name?.trim()) missing.push('Course Name');
    }

    return {
      isValid: missing.length === 0,
      missing,
    };
  };

  const evaluatedRows = useMemo(() => {
    return parsedRows.map((r: any, idx: number) => {
      const v = getRowValidation(r);
      return {
        row: r,
        index: idx + 1,
        isValid: v.isValid,
        missing: v.missing,
      };
    });
  }, [parsedRows, type]);

  const validRows = useMemo(() => {
    return evaluatedRows.filter((e: any) => e.isValid).map((e: any) => e.row);
  }, [evaluatedRows]);

  const invalidRows = useMemo(() => {
    return evaluatedRows.filter((e: any) => !e.isValid);
  }, [evaluatedRows]);

  const displayedRows = useMemo(() => {
    if (fileFilter === 'ready') return evaluatedRows.filter((e: any) => e.isValid);
    if (fileFilter === 'invalid') return evaluatedRows.filter((e: any) => !e.isValid);
    return evaluatedRows;
  }, [evaluatedRows, fileFilter]);

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      setErrorMsg(`No valid rows found to import. Please ensure required fields (${isStudent ? 'Full Name, Course, Email/Phone' : 'Full Name, Designation, Email/Phone'}) are provided.`);
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
    } catch { }
    const defaultBranchId = (selectedOrgId && selectedOrgId !== 'all') ? selectedOrgId : userBranchId;

    let successCount = 0;
    const total = validRows.length;
    let job: any = null;

    try {
      if (isStudent || isEmployee) {
        // Fast bulk path: ONE request instead of N. The backend commits in
        // 2000-row batches; files over 2000 rows run in a background thread
        // that we poll for progress on the job endpoint.
        const ctx = { defaultBranchId, userHoId, userOwnerId };
        const bulkRows = validRows.map((r: any, idx: number) =>
          isStudent
            ? buildStudentPayload(r as StudentImportRow, ctx, idx)
            : buildEmployeePayload(r as EmployeeImportRow, ctx, idx),
        );
        const endpoint = isStudent ? '/students/bulk-import' : '/hrms/employees/bulk-import';
        job = await apiClient.post(endpoint, { rows: bulkRows }, { timeout: 300000 });

        if (job?.background && job?.job_id) {
          while (job?.status !== 'done' && job?.status !== 'error') {
            await new Promise((res) => setTimeout(res, 1500));
            const polled: any = await apiClient.get(`${endpoint}/job/${job.job_id}`, { timeout: 15000 }).catch(() => null);
            if (!polled) break; // job lost (e.g. server restarted)
            job = polled;
            if (job.total) setProgress(Math.min(99, Math.round((job.done / job.total) * 100)));
          }
        } else {
          setProgress(100);
        }

        successCount = (job?.created ?? 0) + (job?.updated ?? 0);
        if (job?.status === 'error') throw new Error(job?.message || 'Import failed');
      } else {
        // Reference-data types (departments, designations, shifts, holidays,
        // courses) — small files; per-row endpoints are fine here.
        const referenceRowErrors: any[] = [];
        for (let i = 0; i < total; i++) {
          const row = validRows[i];
          if (isDepartment) {
            const d = row as DepartmentImportRow;
            const rawType = ((d as any).type || (d as any).department_type || (d as any).extra_info || '').toLowerCase().trim();
            try {
              await hrmsApi.createDepartment({
                name: d.name.trim(),
                code: d.code?.trim() || '',
                head_name: d.headName?.trim() || '',
                description: d.description?.trim() || '',
                is_active: d.status ? d.status.toLowerCase() !== 'inactive' : true,
                department_type: rawType || undefined,
                extra_info: rawType || undefined,
              } as any);
              successCount++;
            } catch (err: any) {
              referenceRowErrors.push({
                row: i + 1,
                name: d.name.trim() || `Row ${i + 1}`,
                error: err?.message || 'Failed to create department',
              });
            }
          } else if (isDesignation) {
            const desg = row as DesignationImportRow;
            try {
              await hrmsApi.createDesignation({
                title: desg.title.trim(),
                department: desg.department?.trim() || '',
                level: desg.level?.trim() || '',
                description: desg.description?.trim() || '',
              });
              successCount++;
            } catch (err: any) {
              referenceRowErrors.push({
                row: i + 1,
                name: desg.title.trim() || `Row ${i + 1}`,
                error: err?.message || 'Failed to create designation',
              });
            }
          } else if (isShiftTemplate) {
            const st = row as ShiftTemplateImportRow;
            try {
              await hrmsApi.saveShiftTemplate({
                code: st.code.trim().toUpperCase(),
                name: st.name.trim(),
                start_time: st.start_time?.trim() || '',
                end_time: st.end_time?.trim() || '',
                break_mins: st.break_mins !== undefined && st.break_mins !== null && (st.break_mins as any) !== '' ? Number(st.break_mins) : 0,
                grace_period_mins: st.grace_period_mins !== undefined && st.grace_period_mins !== null && (st.grace_period_mins as any) !== '' ? Number(st.grace_period_mins) : 0,
                is_night_shift: Boolean(st.is_night_shift),
                color: st.color?.trim() || '',
              });
              successCount++;
            } catch (err: any) {
              referenceRowErrors.push({
                row: i + 1,
                name: st.name.trim() || `Row ${i + 1}`,
                error: err?.message || 'Failed to save shift template',
              });
            }
          } else if (isHoliday) {
            const h = row as HolidayImportRow;
            const year = parseInt(h.date.split('-')[0], 10) || (h.date ? new Date(h.date).getFullYear() : undefined);
            try {
              await hrmsApi.saveHoliday({
                name: h.name.trim(),
                date: h.date.trim(),
                year: year,
                holiday_type: h.holiday_type?.trim() || '',
                description: h.description?.trim() || undefined,
              });
              successCount++;
            } catch (err: any) {
              referenceRowErrors.push({
                row: i + 1,
                name: h.name.trim() || `Row ${i + 1}`,
                error: err?.message || 'Failed to save holiday',
              });
            }
          } else {
            const c = row as CourseImportRow;
            const courseCode = (c.code || c.category || 'CRS').trim().toUpperCase();
            let durationStr = c.duration?.trim() || '';
            let durationVal = 4;
            let durationUnit = 'Years';
            let durationDays = 1460;

            if (c.durationYears && Number(c.durationYears) > 0) {
              durationVal = Number(c.durationYears);
              durationUnit = 'Years';
              durationStr = `${durationVal} Year${durationVal > 1 ? 's' : ''}`;
              durationDays = durationVal * 365;
            } else if (c.durationMonths && Number(c.durationMonths) > 0) {
              durationVal = Number(c.durationMonths);
              durationUnit = 'Months';
              durationStr = `${durationVal} Month${durationVal > 1 ? 's' : ''}`;
              durationDays = durationVal * 30;
            } else if (durationStr) {
              const numMatch = durationStr.match(/\d+/);
              const num = numMatch ? parseInt(numMatch[0], 10) : 1;
              const durLow = durationStr.toLowerCase();
              if (durLow.includes('month')) {
                durationDays = num * 30;
              } else if (durLow.includes('sem')) {
                durationDays = num * 180;
              } else if (durLow.includes('day')) {
                durationDays = num;
              } else if (durLow.includes('year') || num > 0) {
                durationDays = num * 365;
              }
            } else {
              durationStr = '';
              durationDays = 0;
            }

            const payload = {
              name: c.name.trim(),
              category: courseCode,
              badge: courseCode,
              code: courseCode,
              period: durationStr,
              duration_days: durationDays,
              price: Number(c.price) || 0,
              description: c.description?.trim() || '',
              is_active: c.status ? c.status.toLowerCase() !== 'inactive' : true,
              branch_id: defaultBranchId,
              tenant_id: defaultBranchId,
              degree_type: c.degreeType?.trim() || undefined,
              department: c.degreeType?.trim() || undefined,
            };
            try {
              await apiClient.post('/courses/plans', payload);
              successCount++;
            } catch (err: any) {
              referenceRowErrors.push({
                row: i + 1,
                name: c.name.trim() || `Row ${i + 1}`,
                error: err?.message || 'Failed to save course',
              });
            }
          }

          setProgress(Math.round(((i + 1) / total) * 100));
        }

        (job as any) = { row_errors: referenceRowErrors };
      }

      const serverErrors = job?.row_errors || [];
      const clientSkippedErrors = invalidRows.map((inv: any) => ({
        row: inv.index,
        name: (inv.row as any).fullName || (inv.row as any).name || (inv.row as any).title || `Row ${inv.index}`,
        error: `Missing required field(s): ${inv.missing.join(', ')}`,
      }));
      const combinedErrors = [...clientSkippedErrors, ...serverErrors];

      if (combinedErrors.length > 0 || (job?.failed ?? 0) > 0) {
        setImportSummary({
          total: parsedRows.length,
          success: successCount,
          failed: parsedRows.length - successCount,
          errors: combinedErrors,
        });
        return;
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
    setImportSummary(null);
    setFileFilter('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in font-sans">
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
                  else if (isShiftTemplate) downloadShiftTemplateSampleXlsx();
                  else if (isHoliday) downloadHolidaySampleXlsx();
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
                  else if (isShiftTemplate) downloadShiftTemplateSampleCsv();
                  else if (isHoliday) downloadHolidaySampleCsv();
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

          {/* Post-Import Results Summary Screen */}
          {importSummary && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{importSummary.total}</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Rows in File</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{importSummary.success}</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Successfully Imported</div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                  <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{importSummary.failed}</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Skipped / Failed</div>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <Icon name="alert-triangle" size={14} />
                      <span>Issues &amp; Skipped Records Breakdown ({importSummary.errors.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Please fix these records in your spreadsheet to import them.
                    </span>
                  </div>

                  <div className="border border-rose-200 dark:border-rose-900/60 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50 dark:bg-rose-950/60 text-[11px] font-black uppercase text-rose-800 dark:text-rose-300 tracking-wider sticky top-0 border-b border-rose-200 dark:border-rose-900 z-10">
                        <tr>
                          <th className="p-2.5 w-16">Row #</th>
                          <th className="p-2.5 w-48">Name / Identifier</th>
                          <th className="p-2.5">Reason for Error / Skipping</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 dark:divide-rose-950/40 font-medium">
                        {importSummary.errors.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/20">
                            <td className="p-2.5 font-mono text-slate-500 font-bold">{err.row ?? '—'}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{err.name || 'Unnamed'}</td>
                            <td className="p-2.5 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                              <Icon name="alert-circle" size={13} className="shrink-0" />
                              <span>{err.error}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {file && !parsing && !importSummary && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    File: <span className="text-blue-600">{file.name}</span>
                  </span>
                  {/* Filter Pills */}
                  <button
                    type="button"
                    onClick={() => setFileFilter('all')}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer',
                      fileFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFileFilter('ready')}
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center gap-1',
                      fileFilter === 'ready'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    )}
                  >
                    <span>✓ Ready ({validRows.length})</span>
                  </button>
                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFileFilter('invalid')}
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer flex items-center gap-1',
                        fileFilter === 'invalid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      )}
                    >
                      <Icon name="alert-circle" size={11} />
                      <span>Missing Fields ({invalidRows.length})</span>
                    </button>
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

              {/* Missing Fields Warning Banner */}
              {invalidRows.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <Icon name="alert-triangle" size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-black">
                      {invalidRows.length} {invalidRows.length === 1 ? 'row has' : 'rows have'} missing required fields.
                    </div>
                    <div className="text-[11px] text-amber-800 dark:text-amber-300">
                      Required for {typeTitle}: <span className="font-bold">{isStudent ? 'Full Name *, Course/Degree *, Personal Email or Mobile *' : isEmployee ? 'Full Name *, Department *, Designation *, Personal Email or Mobile *' : 'Name *'}</span>. Rows with missing required fields are marked in red and will be skipped during import.
                    </div>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'DEPARTMENT NAME *'
                          : isDesignation
                            ? 'DESIGNATION TITLE *'
                            : isCourse
                              ? 'COURSE / PROGRAM NAME *'
                              : isShiftTemplate
                                ? 'SHIFT CODE & NAME *'
                                : isHoliday
                                  ? 'HOLIDAY NAME *'
                                  : 'FULL NAME *'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'CODE'
                          : isDesignation
                            ? 'DEPARTMENT'
                            : isCourse
                              ? 'CATEGORY / DEPT'
                              : isShiftTemplate
                                ? 'START TIME'
                                : isHoliday
                                  ? 'DATE (YYYY-MM-DD) *'
                                  : 'EMAIL *'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment
                          ? 'HEAD OF DEPT'
                          : isDesignation
                            ? 'CAREER LEVEL'
                            : isCourse
                              ? 'DURATION'
                              : isShiftTemplate
                                ? 'END TIME'
                                : isHoliday
                                  ? 'HOLIDAY TYPE'
                                  : 'PHONE *'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment || isDesignation || isCourse
                          ? 'DESCRIPTION'
                          : isShiftTemplate
                            ? 'BREAK / GRACE'
                            : isHoliday
                              ? 'DESCRIPTION'
                              : isStudent
                                ? 'COURSE & MEDIUM *'
                                : 'DESIGNATION & DEPT *'}
                      </th>
                      <th className="p-2.5">
                        {isDepartment || isDesignation
                          ? 'STATUS'
                          : isCourse
                            ? 'TUITION FEE (₹)'
                            : isShiftTemplate
                              ? 'NIGHT SHIFT'
                              : isHoliday
                                ? 'YEAR'
                                : isStudent
                                  ? 'FATHER NAME'
                                  : 'LOCATION'}
                      </th>
                      <th className="p-2.5 text-center">VALIDATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-xs text-slate-500">
                          No records match the current filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((item: any) => {
                        const row = item.row as any;
                        const idx = item.index;
                        const isValid = item.isValid;

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                              !isValid && 'bg-rose-50/50 dark:bg-rose-950/20'
                            )}
                          >
                            <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {isDepartment
                                ? (row.name || <span className="text-rose-500 italic font-semibold">Missing Name *</span>)
                                : isDesignation
                                  ? (row.title || <span className="text-rose-500 italic font-semibold">Missing Title *</span>)
                                  : isCourse
                                    ? (row.name || <span className="text-rose-500 italic font-semibold">Missing Course *</span>)
                                    : isShiftTemplate
                                      ? (`${row.code || '—'} · ${row.name || ''}` || <span className="text-rose-500 italic font-semibold">Missing Code/Name *</span>)
                                      : isHoliday
                                        ? (row.name || <span className="text-rose-500 italic font-semibold">Missing Name *</span>)
                                        : (row.fullName || (
                                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold bg-rose-100/70 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-[10px]">
                                              <Icon name="alert-circle" size={10} /> Missing Name *
                                            </span>
                                          ))}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                              {isDepartment
                                ? row.code || '—'
                                : isDesignation
                                  ? row.department || '—'
                                  : isCourse
                                    ? row.category || '—'
                                    : isShiftTemplate
                                      ? row.start_time || '—'
                                      : isHoliday
                                        ? (row.date || <span className="text-rose-500 italic font-semibold">Missing Date *</span>)
                                        : (row.email || (
                                            !row.phone ? (
                                              <span className="text-rose-500 italic font-semibold">Missing Email/Phone *</span>
                                            ) : '—'
                                          ))}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                              {isDepartment
                                ? row.headName || '—'
                                : isDesignation
                                  ? row.level || '—'
                                  : isCourse
                                    ? (row.durationYears ? `${row.durationYears} Years` : row.durationMonths ? `${row.durationMonths} Months` : '—')
                                    : isShiftTemplate
                                      ? row.end_time || '—'
                                      : isHoliday
                                        ? row.holiday_type || '—'
                                        : (row.phone || (
                                            !row.email ? (
                                              <span className="text-rose-500 italic font-semibold">Missing Email/Phone *</span>
                                            ) : '—'
                                          ))}
                            </td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                              {isDepartment || isDesignation || isCourse
                                ? row.description || '—'
                                : isShiftTemplate
                                  ? `Break: ${row.break_mins ?? 0}m · Grace: ${row.grace_period_mins ?? 0}m`
                                  : isHoliday
                                    ? row.description || '—'
                                    : isStudent
                                      ? (row.course ? (row.medium ? `${row.course} (${row.medium})` : row.course) : <span className="text-rose-500 italic font-semibold">Missing Course *</span>)
                                      : (row.designation ? (row.department ? `${row.designation} (${row.department})` : row.designation) : <span className="text-rose-500 italic font-semibold">Missing Designation *</span>)}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                              {isDepartment || isDesignation
                                ? row.status || '—'
                                : isCourse
                                  ? (row.price ? `₹${Number(row.price).toLocaleString()}` : '—')
                                  : isShiftTemplate
                                    ? (row.is_night_shift ? 'Yes (Night)' : 'No (Day)')
                                    : isHoliday
                                      ? (row.date?.split('-')[0] || '—')
                                      : isStudent
                                        ? row.fatherName || '—'
                                        : row.branch || '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {isValid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                  ✓ Ready
                                </span>
                              ) : (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                                  title={`Missing: ${item.missing.join(', ')}`}
                                >
                                  Missing: {item.missing.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
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
          {importSummary ? (
            <>
              <button
                type="button"
                onClick={resetUpload}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="upload-cloud" size={14} />
                <span>Upload Another File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (importSummary.success > 0) onSuccess(importSummary.success);
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="check" size={15} />
                <span>Done &amp; View Records</span>
              </button>
            </>
          ) : (
            <>
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
                  ) : validRows.length === 0 ? (
                    <>
                      <Icon name="alert-triangle" size={15} />
                      <span>Cannot Import: Missing Required Fields</span>
                    </>
                  ) : invalidRows.length > 0 ? (
                    <>
                      <Icon name="upload-cloud" size={15} />
                      <span>Import {validRows.length} Valid Records ({invalidRows.length} Skipped)</span>
                    </>
                  ) : (
                    <>
                      <Icon name="upload-cloud" size={15} />
                      <span>Import {validRows.length} {isStudent ? 'Students' : isEmployee ? 'Employees' : typeTitle}</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
