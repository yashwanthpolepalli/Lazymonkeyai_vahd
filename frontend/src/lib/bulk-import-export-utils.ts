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
  const currentYear = new Date().getFullYear();
  const acadYear = `${currentYear} - ${currentYear + 1}`;

  // Clean guidance row showing required formats and empty template rows for direct input
  const guidanceRow = [
    '[Enter Full Name]',
    '[name@domain.com]',
    '[10-Digit Mobile]',
    '[Male / Female]',
    '[Enter Degree / Course Name]',
    '[English / Telugu / Hindi]',
    '[STU-001]',
    '[Father Full Name]',
    '[Mother Full Name]',
    '[YYYY-MM-DD]',
    '[Age]',
    '[General / OBC / SC / ST]',
    '[Sub Caste]',
    '[Door / Flat No]',
    '[Street Name]',
    '[City / Village]',
    '[Mandal / Taluk]',
    '[District Name]',
    '[State Name]',
    '[12-Digit Aadhar]',
    acadYear,
    'ACTIVE',
  ];

  const ws = XLSX.utils.aoa_to_sheet([STUDENT_TEMPLATE_HEADERS, guidanceRow]);
  ws['!cols'] = [
    { wch: 22 }, // Name
    { wch: 26 }, // Email
    { wch: 18 }, // Phone
    { wch: 14 }, // Gender
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
  const currentYear = new Date().getFullYear();
  const acadYear = `${currentYear} - ${currentYear + 1}`;

  const rows = [
    {
      'Student Full Name *': '[Enter Full Name]',
      'Email *': '[name@domain.com]',
      'Phone / Mobile *': '[10-Digit Mobile]',
      'Gender': '[Male / Female]',
      'Degree / Course Program *': '[Enter Degree / Course Name]',
      'Medium of Instruction *': '[English / Telugu / Hindi]',
      'Student / Roll No': '[STU-001]',
      'Father Name': '[Father Full Name]',
      'Mother Name': '[Mother Full Name]',
      'Date of Birth (YYYY-MM-DD)': '[YYYY-MM-DD]',
      'Age': '[Age]',
      'Caste': '[General / OBC / SC / ST]',
      'Sub Caste': '[Sub Caste]',
      'Permanent Door No': '[Door / Flat No]',
      'Permanent Street': '[Street Name]',
      'Permanent Village / City': '[City / Village]',
      'Permanent Mandal': '[Mandal / Taluk]',
      'Permanent District': '[District Name]',
      'Permanent State': '[State Name]',
      'Aadhar Number': '[12-Digit Aadhar]',
      'Academic Year': acadYear,
      'Status': 'ACTIVE',
    },
  ];

  const csv = Papa.unparse(rows);
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
  const guidanceRow = [
    '[Enter Full Name]',
    '[employee@domain.com]',
    '[10-Digit Mobile]',
    '[Enter Designation / Role]',
    '[Enter Department Name]',
    '[Male / Female]',
    '[EMP-001]',
    '[Full-Time / Part-Time / Contract]',
    '[YYYY-MM-DD]',
    '[Monthly Salary]',
    '[Branch / Campus Name]',
    '[Specialization / Domain Skills]',
    '[12-Digit Aadhar]',
    '[PAN Number]',
    'Active',
  ];

  const ws = XLSX.utils.aoa_to_sheet([EMPLOYEE_TEMPLATE_HEADERS, guidanceRow]);
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
  const rows = [
    {
      'Full Name *': '[Enter Full Name]',
      'Email *': '[employee@domain.com]',
      'Phone / Mobile *': '[10-Digit Mobile]',
      'Designation *': '[Enter Designation / Role]',
      'Department *': '[Enter Department Name]',
      'Gender': '[Male / Female]',
      'Employee Code': '[EMP-001]',
      'Employment Type': '[Full-Time / Part-Time / Contract]',
      'Date of Joining (YYYY-MM-DD)': '[YYYY-MM-DD]',
      'Base Salary (Monthly)': '[Monthly Salary]',
      'Branch / Location': '[Branch / Campus Name]',
      'Specialization / Skills': '[Specialization / Domain Skills]',
      'Aadhar Number': '[12-Digit Aadhar]',
      'PAN Number': '[PAN Number]',
      'Status': 'Active',
    },
  ];

  const csv = Papa.unparse(rows);
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
    'Branch': emp.gym_branch || emp.branch || '',
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
    'Branch': emp.gym_branch || emp.branch || '',
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
  const employmentType = findVal('employmenttype', 'type', 'contracttype') || 'Full-Time';
  const joinedDate = findVal('dateofjoining', 'joiningdate', 'joineddate', 'doj');
  const salary = findVal('basesalary', 'salary', 'monthlysalary', 'ctc', 'pay');
  const branch = findVal('branchlocation', 'branch', 'location', 'campus');
  const specialization = findVal('specializationskills', 'specialization', 'skills', 'skill');
  const aadharNumber = findVal('aadharnumber', 'aadhar', 'aadharno');
  const panNumber = findVal('pannumber', 'pan', 'panno');
  const status = findVal('status') || 'Active';

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
