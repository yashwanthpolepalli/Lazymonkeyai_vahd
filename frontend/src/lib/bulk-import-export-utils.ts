import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENT TEMPLATES & EXPORT UTILITIES (Clean Dynamic Structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentImportRow {
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  course: string;
  medium: string;
  rollNo?: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  age?: number | string;
  caste?: string;
  subCaste?: string;
  doorNo?: string;
  street?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  aadharNumber?: string;
  academicYear?: string;
  status?: string;
}

export const STUDENT_TEMPLATE_HEADERS = [
  'Student Full Name *',
  'Email *',
  'Phone / Mobile *',
  'Gender',
  'Degree / Course Program *',
  'Medium of Instruction *',
  'Student / Roll No',
  'Father Name',
  'Mother Name',
  'Date of Birth (YYYY-MM-DD)',
  'Age',
  'Caste',
  'Sub Caste',
  'Permanent Door No',
  'Permanent Street',
  'Permanent Village / City',
  'Permanent Mandal',
  'Permanent District',
  'Permanent State',
  'Aadhar Number',
  'Academic Year',
  'Status',
];

export function downloadStudentSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([STUDENT_TEMPLATE_HEADERS]);
  ws['!cols'] = [
    { wch: 24 }, // Name
    { wch: 24 }, // Email
    { wch: 16 }, // Phone
    { wch: 12 }, // Gender
    { wch: 28 }, // Course
    { wch: 20 }, // Medium
    { wch: 16 }, // Roll
    { wch: 20 }, // Father
    { wch: 20 }, // Mother
    { wch: 22 }, // DOB
    { wch: 10 }, // Age
    { wch: 16 }, // Caste
    { wch: 16 }, // SubCaste
    { wch: 16 }, // Door
    { wch: 18 }, // Street
    { wch: 18 }, // Village
    { wch: 18 }, // Mandal
    { wch: 18 }, // District
    { wch: 18 }, // State
    { wch: 18 }, // Aadhar
    { wch: 16 }, // AcadYear
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
  XLSX.writeFile(wb, 'students_bulk_import_template.xlsx');
}

export function downloadStudentSampleCsv() {
  const csv = Papa.unparse({
    fields: STUDENT_TEMPLATE_HEADERS,
    data: [],
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'students_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportStudentsToXlsx(students: any[], filename = 'students_export.xlsx') {
  const rows = students.map((s, idx) => {
    const meta = s.meta_data || {};
    const perm = meta.permanent_address || {};
    return {
      'Student No.': s.member_code || s.code || `STU-${String(idx + 1).padStart(3, '0')}`,
      'Full Name': s.full_name || s.name || '',
      'Email': s.email || '',
      'Phone': s.phone || '',
      'Gender': s.gender || meta.gender || '',
      'Course / Degree': meta.course || s.course || s.goal || '',
      'Medium': meta.medium || s.medium || '',
      'Father Name': meta.father_name || s.father_name || '',
      'Mother Name': meta.mother_name || s.mother_name || '',
      'DOB': meta.dob || '',
      'Age': s.age || meta.age || '',
      'Caste': meta.caste || '',
      'Sub Caste': meta.sub_caste || '',
      'District': meta.district || perm.district || '',
      'State': meta.state || perm.state || '',
      'Aadhar': meta.aadhar_number || '',
      'Academic Year': meta.academic_year || '',
      'Today Attendance': s.today_status || (s.today_punch?.status) || (s.is_present ? 'Present' : 'Absent'),
      'Punch In': s.punch_in || s.in_time || '',
      'Punch Out': s.punch_out || s.out_time || '',
      'Status': (s.status || 'ACTIVE').toUpperCase(),
      'Enrolled Date': s.created_at ? String(s.created_at).slice(0, 10) : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enrolled_Students');
  XLSX.writeFile(wb, filename);
}

export function exportStudentsToCsv(students: any[], filename = 'students_export.csv') {
  const rows = students.map((s, idx) => {
    const meta = s.meta_data || {};
    const perm = meta.permanent_address || {};
    return {
      'Student No.': s.member_code || s.code || `STU-${String(idx + 1).padStart(3, '0')}`,
      'Full Name': s.full_name || s.name || '',
      'Email': s.email || '',
      'Phone': s.phone || '',
      'Gender': s.gender || meta.gender || '',
      'Course / Degree': meta.course || s.course || s.goal || '',
      'Medium': meta.medium || s.medium || '',
      'Father Name': meta.father_name || s.father_name || '',
      'Mother Name': meta.mother_name || s.mother_name || '',
      'DOB': meta.dob || '',
      'Age': s.age || meta.age || '',
      'Caste': meta.caste || '',
      'Sub Caste': meta.sub_caste || '',
      'District': meta.district || perm.district || '',
      'State': meta.state || perm.state || '',
      'Aadhar': meta.aadhar_number || '',
      'Academic Year': meta.academic_year || '',
      'Today Attendance': s.today_status || (s.today_punch?.status) || (s.is_present ? 'Present' : 'Absent'),
      'Punch In': s.punch_in || s.in_time || '',
      'Punch Out': s.punch_out || s.out_time || '',
      'Status': (s.status || 'ACTIVE').toUpperCase(),
      'Enrolled Date': s.created_at ? String(s.created_at).slice(0, 10) : '',
    };
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMPLOYEE TEMPLATES & EXPORT UTILITIES (Clean Dynamic Structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeImportRow {
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  gender?: string;
  code?: string;
  employmentType?: string;
  joinedDate?: string;
  salary?: number | string;
  branch?: string;
  specialization?: string;
  aadharNumber?: string;
  panNumber?: string;
  status?: string;
}

export const EMPLOYEE_TEMPLATE_HEADERS = [
  'Full Name *',
  'Email *',
  'Phone / Mobile *',
  'Designation *',
  'Department *',
  'Gender',
  'Employee Code',
  'Employment Type',
  'Date of Joining (YYYY-MM-DD)',
  'Base Salary (Monthly)',
  'Branch / Location',
  'Specialization / Skills',
  'Aadhar Number',
  'PAN Number',
  'Status',
];

export function downloadEmployeeSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([EMPLOYEE_TEMPLATE_HEADERS]);
  ws['!cols'] = [
    { wch: 22 }, // Name
    { wch: 26 }, // Email
    { wch: 18 }, // Phone
    { wch: 26 }, // Designation
    { wch: 24 }, // Department
    { wch: 14 }, // Gender
    { wch: 16 }, // Code
    { wch: 20 }, // Type
    { wch: 22 }, // Joined
    { wch: 20 }, // Salary
    { wch: 20 }, // Branch
    { wch: 28 }, // Specialization
    { wch: 18 }, // Aadhar
    { wch: 16 }, // PAN
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees_Template');
  XLSX.writeFile(wb, 'employees_bulk_import_template.xlsx');
}

export function downloadEmployeeSampleCsv() {
  const csv = Papa.unparse({
    fields: EMPLOYEE_TEMPLATE_HEADERS,
    data: [],
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'employees_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEmployeesToXlsx(employees: any[], filename = 'employees_export.xlsx') {
  const rows = employees.map((emp, idx) => ({
    'Employee Code': emp.code ? `EMP-${emp.code}` : `EMP-${String(idx + 1).padStart(3, '0')}`,
    'Full Name': emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
    'Email': emp.email || '',
    'Phone': emp.phone || '',
    'Designation': emp.designation || '',
    'Department': emp.department || '',
    'Gender': emp.gender || '',
    'Branch': emp.vahd_branch || emp.branch || '',
    'Base Salary': emp.salary || 0,
    'Date Joined': emp.joined_date ? String(emp.joined_date).slice(0, 10) : '',
    'Today Attendance': emp.todayPunch?.status || emp.today_status || 'Absent',
    'Punch In': emp.todayPunch?.in_time || emp.punch_in || '',
    'Punch Out': emp.todayPunch?.out_time || emp.punch_out || '',
    'Status': emp.status || (emp.is_active === false ? 'Inactive' : 'Active'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staff_Employees');
  XLSX.writeFile(wb, filename);
}

export function exportEmployeesToCsv(employees: any[], filename = 'employees_export.csv') {
  const rows = employees.map((emp, idx) => ({
    'Employee Code': emp.code ? `EMP-${emp.code}` : `EMP-${String(idx + 1).padStart(3, '0')}`,
    'Full Name': emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
    'Email': emp.email || '',
    'Phone': emp.phone || '',
    'Designation': emp.designation || '',
    'Department': emp.department || '',
    'Gender': emp.gender || '',
    'Branch': emp.vahd_branch || emp.branch || '',
    'Base Salary': emp.salary || 0,
    'Date Joined': emp.joined_date ? String(emp.joined_date).slice(0, 10) : '',
    'Today Attendance': emp.todayPunch?.status || emp.today_status || 'Absent',
    'Punch In': emp.todayPunch?.in_time || emp.punch_in || '',
    'Punch Out': emp.todayPunch?.out_time || emp.punch_out || '',
    'Status': emp.status || (emp.is_active === false ? 'Inactive' : 'Active'),
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FILE PARSER UTILITY FOR IMPORT (Filters out instruction/placeholder rows)
// ─────────────────────────────────────────────────────────────────────────────

export async function parseUploadedSpreadsheet(file: File): Promise<any[]> {
  const fileName = file.name.toLowerCase();
  let rawList: any[] = [];

  if (fileName.endsWith('.csv')) {
    rawList = await new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as any[]);
        },
        error: (err) => {
          reject(err);
        },
      });
    });
  } else {
    // Excel files (.xlsx, .xls)
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawList = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  // Filter out guidance placeholder rows (e.g. rows starting with "[Enter" or "[Required" or "[")
  const filtered = (rawList || []).filter((row) => {
    const values = Object.values(row).map((v) => String(v).trim());
    const isGuidanceRow = values.some(
      (v) => v.startsWith('[') && (v.includes('Enter') || v.includes('Required') || v.includes('domain.com') || v.includes('Mobile'))
    );
    return !isGuidanceRow;
  });

  return filtered;
}

// Helper to normalize keys from messy spreadsheets
export function normalizeStudentImportRow(raw: any): StudentImportRow {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      for (const rawKey of Object.keys(raw)) {
        if (rawKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = raw[rawKey];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0 && !s.startsWith('[')) {
              return s;
            }
          }
        }
      }
    }
    return '';
  };

  const fullName = findVal('studentfullname', 'fullname', 'name', 'studentname');
  const email = findVal('email', 'studentemail', 'mail', 'emailaddress');
  const phone = findVal('phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact');
  const gender = findVal('gender', 'sex');
  const course = findVal('degreecourseprogram', 'course', 'degree', 'program', 'degreecourse');
  const medium = findVal('mediumofinstruction', 'medium', 'instructionmedium', 'lang');
  const rollNo = findVal('studentrollno', 'rollno', 'studentno', 'code', 'membercode');
  const fatherName = findVal('fathername', 'fathersname', 'father');
  const motherName = findVal('mothername', 'mothersname', 'mother');
  const dob = findVal('dateofbirth', 'dob', 'birthdate');
  const age = findVal('age');
  const caste = findVal('caste', 'category');
  const subCaste = findVal('subcaste', 'sub_caste');
  const doorNo = findVal('permanentdoorno', 'doorno', 'houseno', 'flatno');
  const street = findVal('permanentstreet', 'street', 'locality');
  const village = findVal('permanentvillagecity', 'village', 'city', 'town');
  const mandal = findVal('permanentmandal', 'mandal', 'taluk');
  const district = findVal('permanentdistrict', 'district');
  const state = findVal('permanentstate', 'state');
  const aadharNumber = findVal('aadharnumber', 'aadhar', 'aadharno');
  const academicYear = findVal('academicyear', 'year', 'batch');
  const status = findVal('status') || 'ACTIVE';

  return {
    fullName,
    email,
    phone,
    gender,
    course,
    medium,
    rollNo,
    fatherName,
    motherName,
    dob,
    age,
    caste,
    subCaste,
    doorNo,
    street,
    village,
    mandal,
    district,
    state,
    aadharNumber,
    academicYear,
    status,
  };
}

export function normalizeEmployeeImportRow(raw: any): EmployeeImportRow {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      for (const rawKey of Object.keys(raw)) {
        if (rawKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = raw[rawKey];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0 && !s.startsWith('[')) {
              return s;
            }
          }
        }
      }
    }
    return '';
  };

  const fullName = findVal('fullname', 'name', 'employeename');
  const email = findVal('email', 'employeeemail', 'workemail', 'mail');
  const phone = findVal('phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact');
  const designation = findVal('designation', 'role', 'jobtitle', 'title');
  const department = findVal('department', 'dept', 'division');
  const gender = findVal('gender', 'sex');
  const code = findVal('employeecode', 'code', 'empid', 'staffid');
  const employmentType = findVal('employmenttype', 'type', 'contracttype');
  const joinedDate = findVal('dateofjoining', 'joiningdate', 'joineddate', 'doj');
  const salary = findVal('basesalary', 'salary', 'monthlysalary', 'ctc', 'pay');
  const branch = findVal('branchlocation', 'branch', 'location', 'campus');
  const specialization = findVal('specializationskills', 'specialization', 'skills', 'skill');
  const aadharNumber = findVal('aadharnumber', 'aadhar', 'aadharno');
  const panNumber = findVal('pannumber', 'pan', 'panno');
  const status = findVal('status');

  return {
    fullName,
    email,
    phone,
    designation,
    department,
    gender,
    code,
    employmentType,
    joinedDate,
    salary,
    branch,
    specialization,
    aadharNumber,
    panNumber,
    status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEPARTMENT TEMPLATES & EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface DepartmentImportRow {
  name: string;
  code: string;
  headName?: string;
  description?: string;
  status?: string;
}

export const DEPARTMENT_TEMPLATE_HEADERS = [
  'Department Name *',
  'Department Code *',
  'Head of Department',
  'Description',
  'Status',
];

export function downloadDepartmentSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([DEPARTMENT_TEMPLATE_HEADERS]);
  ws['!cols'] = [
    { wch: 30 }, // Name
    { wch: 18 }, // Code
    { wch: 24 }, // Head
    { wch: 36 }, // Description
    { wch: 14 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Departments_Template');
  XLSX.writeFile(wb, 'departments_bulk_import_template.xlsx');
}

export function downloadDepartmentSampleCsv() {
  const csv = Papa.unparse({
    fields: DEPARTMENT_TEMPLATE_HEADERS,
    data: [],
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'departments_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDepartmentsToXlsx(departments: any[], filename = 'departments_export.xlsx') {
  const rows = departments.map((dept, idx) => ({
    '#': idx + 1,
    'Department Name': dept.name || '',
    'Department Code': dept.code || '',
    'Head of Department': dept.head_name || '',
    'Description': dept.description || '',
    'Mapped Employees': dept.employee_count || 0,
    'Status': dept.is_active !== false ? 'Active' : 'Inactive',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Departments');
  XLSX.writeFile(wb, filename);
}

export function exportDepartmentsToCsv(departments: any[], filename = 'departments_export.csv') {
  const rows = departments.map((dept, idx) => ({
    '#': idx + 1,
    'Department Name': dept.name || '',
    'Department Code': dept.code || '',
    'Head of Department': dept.head_name || '',
    'Description': dept.description || '',
    'Mapped Employees': dept.employee_count || 0,
    'Status': dept.is_active !== false ? 'Active' : 'Inactive',
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function normalizeDepartmentImportRow(raw: any): DepartmentImportRow {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      for (const rawKey of Object.keys(raw)) {
        if (rawKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = raw[rawKey];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0 && !s.startsWith('[')) {
              return s;
            }
          }
        }
      }
    }
    return '';
  };

  const name = findVal('departmentname', 'name', 'department', 'dept');
  const code = findVal('departmentcode', 'code', 'deptcode');
  const headName = findVal('headofdepartment', 'headname', 'head', 'hod', 'manager');
  const description = findVal('description', 'desc', 'details', 'about');
  const status = findVal('status');

  return {
    name,
    code,
    headName,
    description,
    status,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESIGNATION TEMPLATES & EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface DesignationImportRow {
  title: string;
  department: string;
  level?: string;
  description?: string;
}

export const DESIGNATION_TEMPLATE_HEADERS = [
  'Designation Title *',
  'Department *',
  'Career Level',
  'Description',
];

export function downloadDesignationSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([DESIGNATION_TEMPLATE_HEADERS]);
  ws['!cols'] = [
    { wch: 30 }, // Title
    { wch: 26 }, // Department
    { wch: 18 }, // Level
    { wch: 40 }, // Description
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Designations_Template');
  XLSX.writeFile(wb, 'designations_bulk_import_template.xlsx');
}

export function downloadDesignationSampleCsv() {
  const csv = Papa.unparse({
    fields: DESIGNATION_TEMPLATE_HEADERS,
    data: [],
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'designations_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportDesignationsToXlsx(designations: any[], filename = 'designations_export.xlsx') {
  const rows = designations.map((desg, idx) => ({
    '#': idx + 1,
    'Designation Title': desg.title || '',
    'Department': desg.department || '',
    'Career Level': desg.level || '',
    'Description': desg.description || '',
    'Mapped Employees': desg.employee_count || 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Designations');
  XLSX.writeFile(wb, filename);
}

export function exportDesignationsToCsv(designations: any[], filename = 'designations_export.csv') {
  const rows = designations.map((desg, idx) => ({
    '#': idx + 1,
    'Designation Title': desg.title || '',
    'Department': desg.department || '',
    'Career Level': desg.level || '',
    'Description': desg.description || '',
    'Mapped Employees': desg.employee_count || 0,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function normalizeDesignationImportRow(raw: any): DesignationImportRow {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      for (const rawKey of Object.keys(raw)) {
        if (rawKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = raw[rawKey];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0 && !s.startsWith('[')) {
              return s;
            }
          }
        }
      }
    }
    return '';
  };

  const title = findVal('designationtitle', 'title', 'designation', 'role', 'jobtitle');
  const department = findVal('department', 'dept', 'division');
  const level = findVal('careerlevel', 'level', 'grade');
  const description = findVal('description', 'desc', 'details', 'about');

  return {
    title,
    department,
    level,
    description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COURSE & ACADEMIC PROGRAM TEMPLATES & EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface CourseImportRow {
  name: string;
  category?: string;
  degreeType?: string;
  durationYears?: string;
  durationMonths?: string;
  price: string;
  language?: string;
  description?: string;
  status?: string;
}

export const COURSE_TEMPLATE_HEADERS = [
  'Course / Program Name *',
  'Category / Department *',
  'Classification / Degree Type',
  'Duration in Years (e.g. 4, 3, 2, 1)',
  'Duration in Months (e.g. 6, 12, 24, 36, 48)',
  'Tuition / Program Fee (₹) *',
  'Medium of Instruction',
  'Description',
  'Status',
];

export function downloadCourseSampleXlsx() {
  const guidanceRow = [
    'B.Tech Computer Science & Engineering',
    'Computer Science & Engineering',
    'Undergraduate Degree',
    '4',
    '48',
    '125000',
    'English',
    'Four-year comprehensive engineering program with AI & Software specialization.',
    'Active',
  ];

  const ws = XLSX.utils.aoa_to_sheet([COURSE_TEMPLATE_HEADERS, guidanceRow]);
  ws['!cols'] = [
    { wch: 36 }, // Course Name
    { wch: 30 }, // Category/Dept
    { wch: 26 }, // Classification
    { wch: 30 }, // Duration Years
    { wch: 32 }, // Duration Months
    { wch: 24 }, // Fee
    { wch: 22 }, // Medium
    { wch: 50 }, // Description
    { wch: 14 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Courses_Template');
  XLSX.writeFile(wb, 'courses_bulk_import_template.xlsx');
}

export function downloadCourseSampleCsv() {
  const guidanceRow = [
    {
      'Course / Program Name *': 'B.Tech Computer Science & Engineering',
      'Category / Department *': 'Computer Science & Engineering',
      'Classification / Degree Type': 'Undergraduate Degree',
      'Duration in Years (e.g. 4, 3, 2, 1)': '4',
      'Duration in Months (e.g. 6, 12, 24, 36, 48)': '48',
      'Tuition / Program Fee (₹) *': '125000',
      'Medium of Instruction': 'English',
      'Description': 'Four-year comprehensive engineering program with AI & Software specialization.',
      'Status': 'Active',
    },
  ];

  const csv = Papa.unparse(guidanceRow);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'courses_bulk_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportCoursesToXlsx(courses: any[], filename = 'courses_export.xlsx') {
  const rows = courses.map((c, idx) => ({
    '#': idx + 1,
    'Course / Program Name': c.name || '',
    'Category / Branch': Array.isArray(c.categories) ? c.categories.join(', ') : (c.category || c.department || ''),
    'Classification': c.classification || c.degree_type || '',
    'Duration': c.durationText || c.period || (c.duration_days ? `${Math.round(c.duration_days / 365)} Years` : '1 Year'),
    'Tuition Fee (₹)': c.price || 0,
    'Features / Description': Array.isArray(c.features) ? c.features.join(', ') : (c.description || ''),
    'Status': c.is_active === false ? 'Inactive' : 'Active',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Courses_Fee_Structure');
  XLSX.writeFile(wb, filename);
}

export function exportCoursesToCsv(courses: any[], filename = 'courses_export.csv') {
  const rows = courses.map((c, idx) => ({
    '#': idx + 1,
    'Course / Program Name': c.name || '',
    'Category / Branch': Array.isArray(c.categories) ? c.categories.join(', ') : (c.category || c.department || ''),
    'Classification': c.classification || c.degree_type || '',
    'Duration': c.durationText || c.period || (c.duration_days ? `${Math.round(c.duration_days / 365)} Years` : '1 Year'),
    'Tuition Fee (₹)': c.price || 0,
    'Features / Description': Array.isArray(c.features) ? c.features.join(', ') : (c.description || ''),
    'Status': c.is_active === false ? 'Inactive' : 'Active',
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function normalizeCourseImportRow(raw: any): CourseImportRow {
  const findVal = (...keys: string[]) => {
    for (const k of keys) {
      for (const rawKey of Object.keys(raw)) {
        if (rawKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = raw[rawKey];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s.length > 0 && !s.startsWith('[')) {
              return s;
            }
          }
        }
      }
    }
    return '';
  };

  const name = findVal('courseprogramname', 'coursename', 'programname', 'name', 'title');
  const category = findVal('categorydepartment', 'category', 'department', 'branch');
  const degreeType = findVal('classificationdegreetype', 'classification', 'degreetype', 'type');
  const durationYears = findVal('durationinyears', 'durationyears', 'years', 'year');
  const durationMonths = findVal('durationinmonths', 'durationmonths', 'months', 'month');
  const price = findVal('tuitionprogramfee', 'fee', 'price', 'amount', 'cost');
  const language = findVal('mediumofinstruction', 'medium', 'language', 'lang');
  const description = findVal('description', 'desc', 'features', 'details');
  const status = findVal('status') || 'Active';

  return {
    name,
    category,
    degreeType,
    durationYears,
    durationMonths,
    price,
    language,
    description,
    status,
  };
}
