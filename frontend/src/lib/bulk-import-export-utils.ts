import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// ─────────────────────────────────────────────────────────────────────────────
// 1. STUDENT TEMPLATES & EXPORT UTILITIES (Clean Dynamic Structure)
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentImportRow {
  // Student Personal Details
  fullName: string;
  email: string;
  phone: string;           // student mobile (also used as permMobile)
  parentPhone?: string;    // parent / guardian mobile
  gender?: string;
  dob?: string;
  age?: number | string;
  bloodGroup?: string;
  caste?: string;
  subCaste?: string;
  motherTongue?: string;
  nationality?: string;
  maritalStatus?: string;
  placeOfBirth?: string;
  identificationMark1?: string;
  identificationMark2?: string;
  aadharNumber?: string;

  // Academic Course Details
  course: string;
  medium: string;
  department?: string;
  academicYear?: string;
  qualification?: string;
  specialization?: string;
  rollNo?: string;

  // Parents / Family Details
  fatherName?: string;
  motherName?: string;
  parentOccupation?: string;
  annualIncome?: string;

  // Permanent Address Details
  permDoorNo?: string;
  permStreet?: string;
  permVillage?: string;
  permMandal?: string;
  permDistrict?: string;
  permState?: string;
  permMobile?: string;     // permanent address contact number

  // Present Address Details
  presDoorNo?: string;
  presStreet?: string;
  presVillage?: string;
  presMandal?: string;
  presDistrict?: string;
  presState?: string;
  presMobile?: string;     // present address contact number
  telephone?: string;      // landline / telephone

  // Campus / Branch / Status
  branch?: string;
  status?: string;
}

export const STUDENT_TEMPLATE_HEADERS = [
  // ── Section 1: Identity (matches top of StudentEnrollmentModal)
  'Student Full Name *',
  'Student Email *',
  'Student Phone / Mobile *',
  'Parent / Guardian Mobile *',

  // ── Section 2: Academic Course Details
  'Degree / Course Program *',
  'Medium of Instruction *',
  'Department',
  'Academic Year',
  'Student / Roll No',
  'Qualification',
  'Specialization',

  // ── Section 3: Personal Info
  'Gender',
  'Date of Birth (YYYY-MM-DD)',
  'Age',
  'Blood Group',
  'Caste / Category',
  'Sub Caste',
  'Mother Tongue',
  'Nationality',
  'Marital Status',
  'Place of Birth',
  'Identification Mark 1',
  'Identification Mark 2',
  'Aadhar Number',

  // ── Section 4: Parents / Family Details
  'Father Name',
  'Mother Name',
  'Parent Occupation',
  'Annual Income (₹)',

  // ── Section 5: Permanent Address
  'Permanent Door No',
  'Permanent Street',
  'Permanent Village / City',
  'Permanent Mandal',
  'Permanent District',
  'Permanent State',
  'Permanent Contact Mobile',

  // ── Section 6: Present Address
  'Present Door No',
  'Present Street',
  'Present Village / City',
  'Present Mandal',
  'Present District',
  'Present State',
  'Present Contact Mobile',
  'Telephone / Landline',

  // ── Section 7: Campus / Status
  'Institution / Branch',
  'Status',
];

export function downloadStudentSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([STUDENT_TEMPLATE_HEADERS]);
  ws['!cols'] = STUDENT_TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length + 3, 16),
  }));

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
  const rows = students.map((s) => {
    const meta = s.meta_data || {};
    const perm = meta.permanent_address || {};
    const pres = meta.present_address || {};
    return {
      // Identity
      'Student Full Name': s.full_name || s.name || '',
      'Student Email': s.email || meta.email || '',
      'Student Phone / Mobile': s.phone || perm.mobile || '',
      'Parent / Guardian Mobile': s.parent_phone || s.parent_mobile || meta.parent_mobile || meta.parent_phone || '',

      // Academic
      'Degree / Course Program': meta.course || s.course || s.goal || '',
      'Medium of Instruction': meta.medium || s.medium || '',
      'Department': meta.department || s.department || '',
      'Academic Year': meta.academic_year || '',
      'Student / Roll No': s.member_code || s.code || '',
      'Qualification': s.qualification || meta.qualification || '',
      'Specialization': s.specialization || meta.specialization || '',

      // Personal Info
      'Gender': s.gender || meta.gender || '',
      'Date of Birth (YYYY-MM-DD)': meta.dob || '',
      'Age': s.age || meta.age || '',
      'Blood Group': meta.blood_group || meta.bloodGroup || '',
      'Caste / Category': meta.caste || '',
      'Sub Caste': meta.sub_caste || '',
      'Mother Tongue': meta.mother_tongue || '',
      'Nationality': meta.nationality || '',
      'Marital Status': meta.marital_status || '',
      'Place of Birth': meta.place_of_birth || '',
      'Identification Mark 1': Array.isArray(meta.identification_marks) ? (meta.identification_marks[0] || '') : '',
      'Identification Mark 2': Array.isArray(meta.identification_marks) ? (meta.identification_marks[1] || '') : '',
      'Aadhar Number': meta.aadhar_number || '',

      // Parents / Family
      'Father Name': meta.father_name || s.father_name || '',
      'Mother Name': meta.mother_name || s.mother_name || '',
      'Parent Occupation': meta.parent_occupation || '',
      'Annual Income (₹)': meta.annual_income || '',

      // Permanent Address
      'Permanent Door No': perm.door_no || '',
      'Permanent Street': perm.street || '',
      'Permanent Village / City': perm.village || '',
      'Permanent Mandal': perm.mandal || '',
      'Permanent District': perm.district || '',
      'Permanent State': perm.state || '',
      'Permanent Contact Mobile': perm.mobile || s.phone || '',

      // Present Address
      'Present Door No': pres.door_no || '',
      'Present Street': pres.street || '',
      'Present Village / City': pres.village || '',
      'Present Mandal': pres.mandal || '',
      'Present District': pres.district || '',
      'Present State': pres.state || '',
      'Present Contact Mobile': pres.mobile || '',
      'Telephone / Landline': pres.telephone || '',

      // Campus / Status
      'Institution / Branch': s.primary_vahd_location || meta.organisation_name || '',
      'Status': (s.status || 'ACTIVE').toUpperCase(),

      // Extra export-only columns (not in import template)
      'Today Attendance': s.today_status || (s.today_punch?.status) || (s.is_present ? 'Present' : 'Absent'),
      'Enrolled Date': s.created_at ? String(s.created_at).slice(0, 10) : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enrolled_Students');
  XLSX.writeFile(wb, filename);
}

export function exportStudentsToCsv(students: any[], filename = 'students_export.csv') {
  const rows = students.map((s) => {
    const meta = s.meta_data || {};
    const perm = meta.permanent_address || {};
    const pres = meta.present_address || {};
    return {
      // Identity
      'Student Full Name': s.full_name || s.name || '',
      'Student Email': s.email || meta.email || '',
      'Student Phone / Mobile': s.phone || perm.mobile || '',
      'Parent / Guardian Mobile': s.parent_phone || s.parent_mobile || meta.parent_mobile || meta.parent_phone || '',

      // Academic
      'Degree / Course Program': meta.course || s.course || s.goal || '',
      'Medium of Instruction': meta.medium || s.medium || '',
      'Department': meta.department || s.department || '',
      'Academic Year': meta.academic_year || '',
      'Student / Roll No': s.member_code || s.code || '',
      'Qualification': s.qualification || meta.qualification || '',
      'Specialization': s.specialization || meta.specialization || '',

      // Personal Info
      'Gender': s.gender || meta.gender || '',
      'Date of Birth (YYYY-MM-DD)': meta.dob || '',
      'Age': s.age || meta.age || '',
      'Blood Group': meta.blood_group || meta.bloodGroup || '',
      'Caste / Category': meta.caste || '',
      'Sub Caste': meta.sub_caste || '',
      'Mother Tongue': meta.mother_tongue || '',
      'Nationality': meta.nationality || '',
      'Marital Status': meta.marital_status || '',
      'Place of Birth': meta.place_of_birth || '',
      'Identification Mark 1': Array.isArray(meta.identification_marks) ? (meta.identification_marks[0] || '') : '',
      'Identification Mark 2': Array.isArray(meta.identification_marks) ? (meta.identification_marks[1] || '') : '',
      'Aadhar Number': meta.aadhar_number || '',

      // Parents / Family
      'Father Name': meta.father_name || s.father_name || '',
      'Mother Name': meta.mother_name || s.mother_name || '',
      'Parent Occupation': meta.parent_occupation || '',
      'Annual Income (₹)': meta.annual_income || '',

      // Permanent Address
      'Permanent Door No': perm.door_no || '',
      'Permanent Street': perm.street || '',
      'Permanent Village / City': perm.village || '',
      'Permanent Mandal': perm.mandal || '',
      'Permanent District': perm.district || '',
      'Permanent State': perm.state || '',
      'Permanent Contact Mobile': perm.mobile || s.phone || '',

      // Present Address
      'Present Door No': pres.door_no || '',
      'Present Street': pres.street || '',
      'Present Village / City': pres.village || '',
      'Present Mandal': pres.mandal || '',
      'Present District': pres.district || '',
      'Present State': pres.state || '',
      'Present Contact Mobile': pres.mobile || '',
      'Telephone / Landline': pres.telephone || '',

      // Campus / Status
      'Institution / Branch': s.primary_vahd_location || meta.organisation_name || '',
      'Status': (s.status || 'ACTIVE').toUpperCase(),

      // Extra export-only columns
      'Today Attendance': s.today_status || (s.today_punch?.status) || (s.is_present ? 'Present' : 'Absent'),
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
// 2. EMPLOYEE TEMPLATES & EXPORT UTILITIES (Matching Personal Details Form)
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeImportRow {
  // ── Section 1: Employee Details (Post Details)
  fullName: string;
  email: string;
  phone: string;               // contactNo
  designation: string;         // jobDesignation
  department: string;
  code?: string;               // employeeCode
  role?: string;               // employeeRole
  employmentType?: string;
  joinedDate?: string;         // joiningDate
  salary?: number | string;    // baseSalary
  branch?: string;             // location / selectedBranch

  // Personal Details
  fatherName?: string;
  dob?: string;
  age?: number | string;
  gender?: string;
  bloodGroup?: string;
  religion?: string;
  caste?: string;
  maritalStatus?: string;
  workExperienceYears?: string;
  areaOfService?: string;      // areaOfService
  technicalSkills?: string;    // technicalSkills
  presentAddress?: string;     // presentAddress (single-field in employee form)
  permanentAddress?: string;   // permanentAddress (single-field in employee form)

  // Emergency Contact
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyContactNo?: string;
  emergencyAddress?: string;
  emergencyNote?: string;

  // Bank & Tax Details
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  bankBranchCity?: string;
  bankAccountType?: string;
  ifscCode?: string;
  panNumber?: string;          // panNo in form
  aadharNumber?: string;

  // Reference Contact (Section 6 of form)
  refName?: string;
  refCompany?: string;
  refAddress?: string;         // refAddress in form
  refPost?: string;            // refPost in form
  refTelephone?: string;       // refTelephone in form
  refContactNo?: string;

  status?: string;
}

export const EMPLOYEE_TEMPLATE_HEADERS = [
  // ── Section 1: Employee / Post Details
  'Full Name *',
  'Personal Email *',
  'Contact Number / Mobile *',
  'Designation *',
  'Department *',
  'Employee Code',
  'Role (STAFF/FACULTY/TRAINER/MANAGER/ADMIN)',
  'Employment Type',
  'Date of Joining (YYYY-MM-DD)',
  'Base Monthly Salary (₹)',
  'Branch / Campus Location',

  // ── Section 2: Personal Details
  'Father Name',
  'Date of Birth (YYYY-MM-DD)',
  'Age',
  'Gender',
  'Blood Group',
  'Religion',
  'Caste',
  'Marital Status',
  'Work Experience (Years)',
  'Area of Service / Specialization',
  'Technical Skills',
  'Present Address',
  'Permanent Address',

  // ── Section 3: Emergency Contact Details
  'Emergency Contact Name',
  'Emergency Relationship',
  'Emergency Contact Number',
  'Emergency Address',
  'Emergency Note',

  // ── Section 4: Bank & Tax Details
  'Bank Account Holder Name',
  'Bank Name',
  'Bank Account Number',
  'Bank Branch / City',
  'Bank Account Type (Savings/Current)',
  'IFSC Code',
  'PAN Number',
  'Aadhar Number',

  // ── Section 5: Reference Contact Details
  'Reference Contact Name',
  'Reference Company',
  'Reference Address',
  'Reference Post / Designation',
  'Reference Telephone',
  'Reference Contact Number',

  // ── Status
  'Status',
];

export function downloadEmployeeSampleXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([EMPLOYEE_TEMPLATE_HEADERS]);
  ws['!cols'] = EMPLOYEE_TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length + 3, 16),
  }));

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
  const rows = employees.map((emp) => {
    const meta = emp.meta_data || {};
    const emerg = meta.emergency_details || {};
    const bank = meta.bank_details || {};
    const ref = meta.reference_contact || {};
    const post = meta.post_details || {};
    return {
      // Section 1: Employee / Post Details
      'Full Name': (emp.full_name || '').trim(),
      'Personal Email': emp.email || '',
      'Contact Number / Mobile': emp.phone || '',
      'Designation': emp.designation || post.designation || '',
      'Department': emp.department || post.department || '',
      'Employee Code': emp.code || '',
      'Role': emp.role || meta.employee_role || post.role || 'STAFF',
      'Employment Type': emp.employment_type || 'Full-Time',
      'Date of Joining (YYYY-MM-DD)': emp.joined_date ? String(emp.joined_date).slice(0, 10) : (post.joining_date ? String(post.joining_date).slice(0, 10) : ''),
      'Base Monthly Salary (₹)': emp.salary || emp.base_monthly_salary || 0,
      'Branch / Campus Location': emp.vahd_branch || emp.branch || post.location || '',

      // Section 2: Personal Details
      'Father Name': meta.father_name || '',
      'Date of Birth (YYYY-MM-DD)': meta.dob || '',
      'Age': meta.age || '',
      'Gender': emp.gender || meta.gender || '',
      'Blood Group': meta.blood_group || '',
      'Religion': meta.religion || '',
      'Caste': meta.caste || '',
      'Marital Status': emp.marital_status || meta.marital_status || '',
      'Work Experience (Years)': meta.work_experience_years || '',
      'Area of Service / Specialization': meta.area_of_service || emp.specialization || '',
      'Technical Skills': post.technical_skills || (Array.isArray(emp.skills) ? emp.skills.join(', ') : (emp.skills || '')),
      'Present Address': meta.present_address || emp.address || '',
      'Permanent Address': meta.permanent_address || '',

      // Section 3: Emergency Contact Details
      'Emergency Contact Name': emerg.name || '',
      'Emergency Relationship': emerg.relationship || '',
      'Emergency Contact Number': emerg.contact_no || emp.emergency_contact || '',
      'Emergency Address': emerg.address || '',
      'Emergency Note': emerg.note || '',

      // Section 4: Bank & Tax Details
      'Bank Account Holder Name': bank.account_holder_name || '',
      'Bank Name': bank.bank_name || '',
      'Bank Account Number': bank.account_number || emp.bank_account_no || '',
      'Bank Branch / City': bank.branch_city || '',
      'Bank Account Type (Savings/Current)': bank.account_type || 'Savings',
      'IFSC Code': bank.ifsc_code || emp.bank_ifsc || '',
      'PAN Number': bank.pan_no || '',
      'Aadhar Number': meta.aadhar_number || '',

      // Section 5: Reference Contact Details
      'Reference Contact Name': ref.name || '',
      'Reference Company': ref.company || '',
      'Reference Address': ref.address || '',
      'Reference Post / Designation': ref.post || '',
      'Reference Telephone': ref.telephone || '',
      'Reference Contact Number': ref.contact_no || '',

      // Status
      'Status': emp.status || (emp.is_active === false ? 'Inactive' : 'Active'),

      // Extra export-only columns
      'Today Attendance': emp.todayPunch?.status || emp.today_status || 'Absent',
      'Punch In': emp.todayPunch?.in_time || emp.punch_in || '',
      'Punch Out': emp.todayPunch?.out_time || emp.punch_out || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staff_Employees');
  XLSX.writeFile(wb, filename);
}

export function exportEmployeesToCsv(employees: any[], filename = 'employees_export.csv') {
  const rows = employees.map((emp) => {
    const meta = emp.meta_data || {};
    const emerg = meta.emergency_details || {};
    const bank = meta.bank_details || {};
    const ref = meta.reference_contact || {};
    const post = meta.post_details || {};
    return {
      // Section 1: Employee / Post Details
      'Full Name': (emp.full_name || '').trim(),
      'Personal Email': emp.email || '',
      'Contact Number / Mobile': emp.phone || '',
      'Designation': emp.designation || post.designation || '',
      'Department': emp.department || post.department || '',
      'Employee Code': emp.code || '',
      'Role': emp.role || meta.employee_role || post.role || 'STAFF',
      'Employment Type': emp.employment_type || 'Full-Time',
      'Date of Joining (YYYY-MM-DD)': emp.joined_date ? String(emp.joined_date).slice(0, 10) : (post.joining_date ? String(post.joining_date).slice(0, 10) : ''),
      'Base Monthly Salary (₹)': emp.salary || emp.base_monthly_salary || 0,
      'Branch / Campus Location': emp.vahd_branch || emp.branch || post.location || '',

      // Section 2: Personal Details
      'Father Name': meta.father_name || '',
      'Date of Birth (YYYY-MM-DD)': meta.dob || '',
      'Age': meta.age || '',
      'Gender': emp.gender || meta.gender || '',
      'Blood Group': meta.blood_group || '',
      'Religion': meta.religion || '',
      'Caste': meta.caste || '',
      'Marital Status': emp.marital_status || meta.marital_status || '',
      'Work Experience (Years)': meta.work_experience_years || '',
      'Area of Service / Specialization': meta.area_of_service || emp.specialization || '',
      'Technical Skills': post.technical_skills || (Array.isArray(emp.skills) ? emp.skills.join(', ') : (emp.skills || '')),
      'Present Address': meta.present_address || emp.address || '',
      'Permanent Address': meta.permanent_address || '',

      // Section 3: Emergency Contact Details
      'Emergency Contact Name': emerg.name || '',
      'Emergency Relationship': emerg.relationship || '',
      'Emergency Contact Number': emerg.contact_no || emp.emergency_contact || '',
      'Emergency Address': emerg.address || '',
      'Emergency Note': emerg.note || '',

      // Section 4: Bank & Tax Details
      'Bank Account Holder Name': bank.account_holder_name || '',
      'Bank Name': bank.bank_name || '',
      'Bank Account Number': bank.account_number || emp.bank_account_no || '',
      'Bank Branch / City': bank.branch_city || '',
      'Bank Account Type (Savings/Current)': bank.account_type || 'Savings',
      'IFSC Code': bank.ifsc_code || emp.bank_ifsc || '',
      'PAN Number': bank.pan_no || '',
      'Aadhar Number': meta.aadhar_number || '',

      // Section 5: Reference Contact Details
      'Reference Contact Name': ref.name || '',
      'Reference Company': ref.company || '',
      'Reference Address': ref.address || '',
      'Reference Post / Designation': ref.post || '',
      'Reference Telephone': ref.telephone || '',
      'Reference Contact Number': ref.contact_no || '',

      // Status
      'Status': emp.status || (emp.is_active === false ? 'Inactive' : 'Active'),

      // Extra export-only columns
      'Today Attendance': emp.todayPunch?.status || emp.today_status || 'Absent',
      'Punch In': emp.todayPunch?.in_time || emp.punch_in || '',
      'Punch Out': emp.todayPunch?.out_time || emp.punch_out || '',
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
// 3. FILE PARSER UTILITY FOR IMPORT (Filters out instruction/placeholder rows)
// ─────────────────────────────────────────────────────────────────────────────

export async function parseUploadedSpreadsheet(file: File): Promise<any[]> {
  const fileName = file.name.toLowerCase();
  let rawList: any[] = [];

  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    rawList = (result.data as any[]) || [];
  } else {
    // Excel files (.xlsx, .xls)
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawList = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  // Filter out guidance/sample placeholder rows
  const filtered = rawList.filter((row) => {
    const values = Object.values(row).map((v) => String(v).trim().toLowerCase());
    const isGuidanceRow = values.some(
      (v) =>
        v.includes('[e.g.') ||
        v.includes('(e.g.') ||
        v.includes('sample guidance') ||
        v.includes('enter ') ||
        v.startsWith('[')
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

  // Identity
  const fullName = findVal('studentfullname', 'fullname', 'name', 'studentname');
  const email = findVal('studentemail', 'email', 'mail', 'emailaddress');
  const phone = findVal('studentphonemobile', 'studentphone', 'phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact');
  const parentPhone = findVal('parentguardianmobile', 'parentmobile', 'parentphone', 'guardianphone', 'parentcontact');

  // Academic
  const course = findVal('degreecourseprogram', 'degreecourse', 'course', 'degree', 'program');
  const medium = findVal('mediumofinstruction', 'medium', 'instructionmedium', 'lang') || 'English';
  const department = findVal('department', 'dept', 'branchdept');
  const academicYear = findVal('academicyear', 'year', 'batch');
  const rollNo = findVal('studentrollno', 'rollno', 'studentno', 'code', 'membercode');
  const qualification = findVal('qualification');
  const specialization = findVal('specialization');

  // Personal Info
  const gender = findVal('gender', 'sex') || 'Male';
  const dob = findVal('dateofbirth', 'dob', 'birthdate');
  const age = findVal('age');
  const bloodGroup = findVal('bloodgroup', 'blood');
  const caste = findVal('castecategory', 'caste', 'category');
  const subCaste = findVal('subcaste', 'subcaste');
  const motherTongue = findVal('mothertongue');
  const nationality = findVal('nationality');
  const maritalStatus = findVal('maritalstatus');
  const placeOfBirth = findVal('placeofbirth', 'birthplace');
  const identificationMark1 = findVal('identificationmark1', 'mark1');
  const identificationMark2 = findVal('identificationmark2', 'mark2');
  const aadharNumber = findVal('aadharnumber', 'aadhar', 'aadharno');

  // Parents / Family
  const fatherName = findVal('fathername', 'fathersname', 'father');
  const motherName = findVal('mothername', 'mothersname', 'mother');
  const parentOccupation = findVal('parentoccupation', 'fatheroccupation');
  const annualIncome = findVal('annualincome', 'income', 'familyincome');

  // Permanent Address
  const permDoorNo = findVal('permanentdoorno', 'permdoorno', 'doorno', 'houseno', 'flatno');
  const permStreet = findVal('permanentstreet', 'permstreet', 'street', 'locality');
  const permVillage = findVal('permanentvillagecity', 'permvillagecity', 'permvillage', 'village', 'city', 'town');
  const permMandal = findVal('permanentmandal', 'permmandal', 'mandal', 'taluk');
  const permDistrict = findVal('permanentdistrict', 'permdistrict', 'district');
  const permState = findVal('permanentstate', 'permstate', 'state');
  const permMobile = findVal('permanentcontactmobile', 'permcontactmobile', 'permmobile', 'permanentmobile');

  // Present Address
  const presDoorNo = findVal('presentdoorno', 'presdoorno');
  const presStreet = findVal('presentstreet', 'presstreet');
  const presVillage = findVal('presentvillagecity', 'presvillagecity', 'presvillage', 'presentvillage');
  const presMandal = findVal('presentmandal', 'presmandal');
  const presDistrict = findVal('presentdistrict', 'presdistrict');
  const presState = findVal('presentstate', 'presstate');
  const presMobile = findVal('presentcontactmobile', 'prescontactmobile', 'presmobile', 'presentmobile');
  const telephone = findVal('telephonelandline', 'telephone', 'landline', 'tel');

  // Campus / Status
  const branch = findVal('institutionbranch', 'institution', 'branch', 'campus', 'college');
  const status = findVal('status') || 'ACTIVE';

  return {
    fullName, email, phone, parentPhone,
    course, medium, department, academicYear, rollNo, qualification, specialization,
    gender, dob, age, bloodGroup, caste, subCaste, motherTongue, nationality,
    maritalStatus, placeOfBirth, identificationMark1, identificationMark2, aadharNumber,
    fatherName, motherName, parentOccupation, annualIncome,
    permDoorNo, permStreet, permVillage, permMandal, permDistrict, permState, permMobile,
    presDoorNo, presStreet, presVillage, presMandal, presDistrict, presState, presMobile, telephone,
    branch, status,
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

  // Section 1: Employee / Post Details
  const fullName = findVal('fullname', 'employeename', 'name');
  const email = findVal('personalemail', 'email', 'employeeemail', 'workemail', 'mail');
  const phone = findVal('contactnumbermobile', 'contactnumber', 'phone', 'mobile', 'phonenumber', 'mobilenumber', 'contact');
  const designation = findVal('designation', 'jobdesignation', 'jobtitle', 'title');
  const department = findVal('department', 'dept', 'division');
  const code = findVal('employeecode', 'code', 'empid', 'staffid');
  const role = findVal('role', 'employeerole');
  const employmentType = findVal('employmenttype', 'type', 'contracttype');
  const joinedDate = findVal('dateofjoining', 'joiningdate', 'joineddate', 'doj');
  const salary = findVal('basemonthlysalary', 'basesalary', 'salary', 'monthlysalary', 'ctc', 'pay');
  const branch = findVal('branchcampuslocation', 'branchlocation', 'branch', 'location', 'campus');

  // Section 2: Personal Details
  const fatherName = findVal('fathername', 'fathersname', 'father');
  const dob = findVal('dateofbirth', 'dob', 'birthdate');
  const age = findVal('age');
  const gender = findVal('gender', 'sex');
  const bloodGroup = findVal('bloodgroup', 'blood');
  const religion = findVal('religion');
  const caste = findVal('caste');
  const maritalStatus = findVal('maritalstatus');
  const workExperienceYears = findVal('workexperienceyears', 'workexperience', 'experienceyears', 'experience');
  const areaOfService = findVal('areaofservicespecialization', 'areaofservice', 'specialization', 'specializationskills');
  const technicalSkills = findVal('technicalskills', 'skills', 'skill');
  const presentAddress = findVal('presentaddress', 'address');
  const permanentAddress = findVal('permanentaddress');

  // Section 3: Emergency Contact
  const emergencyName = findVal('emergencycontactname', 'emergencyname');
  const emergencyRelationship = findVal('emergencyrelationship', 'relationship');
  const emergencyContactNo = findVal('emergencycontactnumber', 'emergencycontactno', 'emergencyphone');
  const emergencyAddress = findVal('emergencyaddress');
  const emergencyNote = findVal('emergencynote');

  // Section 4: Bank & Tax Details
  const accountHolderName = findVal('bankaccountholdername', 'accountholdername', 'accountholder');
  const bankName = findVal('bankname');
  const accountNumber = findVal('bankaccountnumber', 'accountnumber', 'accountno');
  const bankBranchCity = findVal('bankbranchcity', 'bankbranch', 'branchcity');
  const bankAccountType = findVal('bankaccounttypesavingscurrent', 'bankaccounttype', 'accounttype');
  const ifscCode = findVal('ifsccode', 'ifsc');
  const panNumber = findVal('pannumber', 'pan', 'panno');
  const aadharNumber = findVal('aadharnumber', 'aadhar', 'aadharno');

  // Section 5: Reference Contact Details
  const refName = findVal('referencecontactname', 'refname', 'referencename');
  const refCompany = findVal('referencecompany', 'refcompany');
  const refAddress = findVal('referenceaddress', 'refaddress');
  const refPost = findVal('referencepostdesignation', 'refpost', 'referencepost');
  const refTelephone = findVal('referencetelephone', 'reftelephone', 'reftel');
  const refContactNo = findVal('referencecontactnumber', 'refcontactno', 'refphone');

  const status = findVal('status');

  return {
    fullName, email, phone, designation, department, code, role,
    employmentType, joinedDate, salary, branch,
    fatherName, dob, age, gender, bloodGroup, religion, caste, maritalStatus,
    workExperienceYears, areaOfService, technicalSkills, presentAddress, permanentAddress,
    emergencyName, emergencyRelationship, emergencyContactNo, emergencyAddress, emergencyNote,
    accountHolderName, bankName, accountNumber, bankBranchCity, bankAccountType, ifscCode, panNumber, aadharNumber,
    refName, refCompany, refAddress, refPost, refTelephone, refContactNo,
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
