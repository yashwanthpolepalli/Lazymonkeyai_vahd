import { useCurrency } from "@/hooks/use-currency";

// ─── Employee Management ────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  team: string;
  employmentType: "Full-Time" | "Part-Time" | "Contract";
  joinDate: string;
  status: "Active" | "On Leave" | "Inactive";
  salary: number;
  manager: string;
  location: string;
}

export const mockEmployees: Employee[] = [
  { id: "EMP-001", name: "James Thompson", email: "james.t@nimbus.com", phone: "+1-415-201-4411", department: "Sales", designation: "Senior Sales Manager", team: "Enterprise Sales", employmentType: "Full-Time", joinDate: "2021-03-15", status: "Active", salary: 95000, manager: "Sarah Chen", location: "San Francisco, CA" },
  { id: "EMP-002", name: "Sarah Mitchell", email: "sarah.m@nimbus.com", phone: "+1-415-202-5522", department: "Marketing", designation: "Marketing Director", team: "Brand & Growth", employmentType: "Full-Time", joinDate: "2020-07-01", status: "Active", salary: 115000, manager: "CEO", location: "San Francisco, CA" },
  { id: "EMP-003", name: "Kevin Park", email: "kevin.p@nimbus.com", phone: "+1-415-203-6633", department: "Engineering", designation: "Senior Software Engineer", team: "Platform Engineering", employmentType: "Full-Time", joinDate: "2022-01-10", status: "Active", salary: 130000, manager: "Alex Rivera", location: "Remote – Austin, TX" },
  { id: "EMP-004", name: "Priya Sharma", email: "priya.s@nimbus.com", phone: "+1-415-204-7744", department: "HR", designation: "HR Business Partner", team: "People & Culture", employmentType: "Full-Time", joinDate: "2021-09-20", status: "Active", salary: 88000, manager: "VP HR", location: "San Francisco, CA" },
  { id: "EMP-005", name: "Daniel Roberts", email: "daniel.r@nimbus.com", phone: "+1-415-205-8855", department: "Operations", designation: "Operations Manager", team: "Supply Chain", employmentType: "Full-Time", joinDate: "2019-05-01", status: "Active", salary: 92000, manager: "COO", location: "Oakland, CA" },
  { id: "EMP-006", name: "Emily Wang", email: "emily.w@nimbus.com", phone: "+1-415-206-9966", department: "Sales", designation: "Account Executive", team: "Mid-Market Sales", employmentType: "Full-Time", joinDate: "2023-02-14", status: "On Leave", salary: 78000, manager: "James Thompson", location: "San Francisco, CA" },
  { id: "EMP-007", name: "Marcus Johnson", email: "marcus.j@nimbus.com", phone: "+1-415-207-1177", department: "Finance", designation: "Financial Analyst", team: "Finance & Accounting", employmentType: "Full-Time", joinDate: "2022-06-01", status: "Active", salary: 85000, manager: "CFO", location: "San Francisco, CA" },
  { id: "EMP-008", name: "Aisha Patel", email: "aisha.p@nimbus.com", phone: "+1-415-208-2288", department: "Engineering", designation: "UX Designer", team: "Product Design", employmentType: "Contract", joinDate: "2024-01-15", status: "Active", salary: 0, manager: "Alex Rivera", location: "Remote – New York, NY" },
  { id: "EMP-009", name: "Ravi Kumar", email: "ravi.k@nimbus.com", phone: "+1-415-209-3399", department: "Operations", designation: "Warehouse Supervisor", team: "Warehouse", employmentType: "Full-Time", joinDate: "2020-03-01", status: "Active", salary: 68000, manager: "Daniel Roberts", location: "Oakland, CA" },
  { id: "EMP-010", name: "Linda Torres", email: "linda.t@nimbus.com", phone: "+1-415-210-4400", department: "Sales", designation: "Sales Representative", team: "Retail Sales", employmentType: "Part-Time", joinDate: "2023-09-01", status: "Active", salary: 42000, manager: "James Thompson", location: "San Francisco, CA" },
];

export interface Department {
  id: string;
  name: string;
  head: string;
  employees: number;
  budget: number;
  location: string;
  status: "Active" | "Inactive";
}

export const mockDepartments: Department[] = [
  { id: "DEPT-01", name: "Sales", head: "James Thompson", employees: 18, budget: 1200000, location: "San Francisco, CA", status: "Active" },
  { id: "DEPT-02", name: "Marketing", head: "Sarah Mitchell", employees: 10, budget: 350000, location: "San Francisco, CA", status: "Active" },
  { id: "DEPT-03", name: "Engineering", head: "Alex Rivera", employees: 22, budget: 2800000, location: "Remote / HQ", status: "Active" },
  { id: "DEPT-04", name: "HR", head: "Priya Sharma", employees: 6, budget: 180000, location: "San Francisco, CA", status: "Active" },
  { id: "DEPT-05", name: "Operations", head: "Daniel Roberts", employees: 30, budget: 900000, location: "Oakland, CA", status: "Active" },
  { id: "DEPT-06", name: "Finance", head: "Marcus Johnson", employees: 8, budget: 220000, location: "San Francisco, CA", status: "Active" },
];

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: "Present" | "Late" | "Absent" | "Half Day" | "On Leave";
  method: "Biometric" | "GPS" | "Face" | "Manual";
}

export const mockAttendance: AttendanceRecord[] = [
  { id: "ATT-001", employeeId: "EMP-001", employeeName: "James Thompson", date: "2026-07-01", checkIn: "09:02", checkOut: "18:15", hoursWorked: 9.2, status: "Present", method: "Biometric" },
  { id: "ATT-002", employeeId: "EMP-002", employeeName: "Sarah Mitchell", date: "2026-07-01", checkIn: "09:45", checkOut: "18:30", hoursWorked: 8.75, status: "Late", method: "Face" },
  { id: "ATT-003", employeeId: "EMP-003", employeeName: "Kevin Park", date: "2026-07-01", checkIn: "08:55", checkOut: "18:00", hoursWorked: 9.1, status: "Present", method: "GPS" },
  { id: "ATT-004", employeeId: "EMP-004", employeeName: "Priya Sharma", date: "2026-07-01", checkIn: "09:00", checkOut: "13:00", hoursWorked: 4.0, status: "Half Day", method: "Biometric" },
  { id: "ATT-005", employeeId: "EMP-005", employeeName: "Daniel Roberts", date: "2026-07-01", checkIn: "08:30", checkOut: "17:45", hoursWorked: 9.25, status: "Present", method: "Biometric" },
  { id: "ATT-006", employeeId: "EMP-006", employeeName: "Emily Wang", date: "2026-07-01", checkIn: "", checkOut: "", hoursWorked: 0, status: "On Leave", method: "Manual" },
  { id: "ATT-007", employeeId: "EMP-007", employeeName: "Marcus Johnson", date: "2026-07-01", checkIn: "", checkOut: "", hoursWorked: 0, status: "Absent", method: "Manual" },
  { id: "ATT-008", employeeId: "EMP-008", employeeName: "Aisha Patel", date: "2026-07-01", checkIn: "10:00", checkOut: "18:00", hoursWorked: 8.0, status: "Present", method: "GPS" },
  { id: "ATT-009", employeeId: "EMP-009", employeeName: "Ravi Kumar", date: "2026-07-01", checkIn: "07:55", checkOut: "17:00", hoursWorked: 9.1, status: "Present", method: "Biometric" },
  { id: "ATT-010", employeeId: "EMP-010", employeeName: "Linda Torres", date: "2026-07-01", checkIn: "09:10", checkOut: "14:00", hoursWorked: 4.8, status: "Present", method: "Manual" },
];

// ─── Leave ────────────────────────────────────────────────────────────────────

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: "Annual" | "Sick" | "Casual" | "Maternity" | "Unpaid";
  from: string;
  to: string;
  days: number;
  reason: string;
  appliedOn: string;
  status: "Approved" | "Pending" | "Rejected";
  approvedBy?: string;
}

export const mockLeaveRequests: LeaveRequest[] = [
  { id: "LV-001", employeeId: "EMP-006", employeeName: "Emily Wang", department: "Sales", type: "Maternity", from: "2026-07-01", to: "2026-09-30", days: 90, reason: "Maternity leave", appliedOn: "2026-06-01", status: "Approved", approvedBy: "Priya Sharma" },
  { id: "LV-002", employeeId: "EMP-004", employeeName: "Priya Sharma", department: "HR", type: "Annual", from: "2026-07-05", to: "2026-07-09", days: 5, reason: "Family vacation", appliedOn: "2026-06-20", status: "Approved", approvedBy: "VP HR" },
  { id: "LV-003", employeeId: "EMP-007", employeeName: "Marcus Johnson", department: "Finance", type: "Sick", from: "2026-07-01", to: "2026-07-02", days: 2, reason: "Medical checkup", appliedOn: "2026-06-30", status: "Pending" },
  { id: "LV-004", employeeId: "EMP-001", employeeName: "James Thompson", department: "Sales", type: "Casual", from: "2026-07-10", to: "2026-07-10", days: 1, reason: "Personal work", appliedOn: "2026-07-01", status: "Pending" },
  { id: "LV-005", employeeId: "EMP-009", employeeName: "Ravi Kumar", department: "Operations", type: "Annual", from: "2026-06-15", to: "2026-06-17", days: 3, reason: "Personal trip", appliedOn: "2026-06-10", status: "Rejected", approvedBy: "Daniel Roberts" },
];

export const mockLeaveBalances = [
  { employeeId: "EMP-001", name: "James Thompson", annual: { total: 18, used: 4, balance: 14 }, sick: { total: 12, used: 1, balance: 11 }, casual: { total: 6, used: 2, balance: 4 } },
  { employeeId: "EMP-002", name: "Sarah Mitchell", annual: { total: 18, used: 8, balance: 10 }, sick: { total: 12, used: 0, balance: 12 }, casual: { total: 6, used: 1, balance: 5 } },
  { employeeId: "EMP-003", name: "Kevin Park", annual: { total: 18, used: 2, balance: 16 }, sick: { total: 12, used: 3, balance: 9 }, casual: { total: 6, used: 0, balance: 6 } },
  { employeeId: "EMP-005", name: "Daniel Roberts", annual: { total: 21, used: 10, balance: 11 }, sick: { total: 12, used: 2, balance: 10 }, casual: { total: 6, used: 3, balance: 3 } },
  { employeeId: "EMP-007", name: "Marcus Johnson", annual: { total: 18, used: 1, balance: 17 }, sick: { total: 12, used: 2, balance: 10 }, casual: { total: 6, used: 0, balance: 6 } },
];

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface SalaryStructure {
  id: string;
  name: string;
  department: string;
  basic: number;
  hra: number;
  transport: number;
  medical: number;
  bonus: number;
  pf: number;
  esi: number;
  tds: number;
  grossSalary: number;
  netSalary: number;
}

export const mockSalaryStructures: SalaryStructure[] = [
  { id: "SAL-001", name: "James Thompson", department: "Sales", basic: 55000, hra: 22000, transport: 3000, medical: 2000, bonus: 5000, pf: 6600, esi: 825, tds: 4000, grossSalary: 87000, netSalary: 75575 },
  { id: "SAL-002", name: "Sarah Mitchell", department: "Marketing", basic: 65000, hra: 26000, transport: 3000, medical: 2000, bonus: 8000, pf: 7800, esi: 975, tds: 6000, grossSalary: 104000, netSalary: 89225 },
  { id: "SAL-003", name: "Kevin Park", department: "Engineering", basic: 75000, hra: 30000, transport: 3000, medical: 2000, bonus: 10000, pf: 9000, esi: 1125, tds: 8000, grossSalary: 120000, netSalary: 101875 },
  { id: "SAL-004", name: "Priya Sharma", department: "HR", basic: 50000, hra: 20000, transport: 2500, medical: 1500, bonus: 4000, pf: 6000, esi: 750, tds: 3500, grossSalary: 78000, netSalary: 67750 },
  { id: "SAL-005", name: "Daniel Roberts", department: "Operations", basic: 52000, hra: 20800, transport: 3000, medical: 2000, bonus: 4500, pf: 6240, esi: 780, tds: 3800, grossSalary: 82300, netSalary: 71480 },
];

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  payDate: string;
  status: "Paid" | "Pending" | "Processing";
}

export const mockPayslips: Payslip[] = [
  { id: "PS-JUN-001", employeeId: "EMP-001", employeeName: "James Thompson", month: "June 2026", grossSalary: 87000, deductions: 11425, netSalary: 75575, payDate: "2026-06-30", status: "Paid" },
  { id: "PS-JUN-002", employeeId: "EMP-002", employeeName: "Sarah Mitchell", month: "June 2026", grossSalary: 104000, deductions: 14775, netSalary: 89225, payDate: "2026-06-30", status: "Paid" },
  { id: "PS-JUN-003", employeeId: "EMP-003", employeeName: "Kevin Park", month: "June 2026", grossSalary: 120000, deductions: 18125, netSalary: 101875, payDate: "2026-06-30", status: "Paid" },
  { id: "PS-JUL-001", employeeId: "EMP-001", employeeName: "James Thompson", month: "July 2026", grossSalary: 87000, deductions: 11425, netSalary: 75575, payDate: "2026-07-31", status: "Processing" },
  { id: "PS-JUL-002", employeeId: "EMP-002", employeeName: "Sarah Mitchell", month: "July 2026", grossSalary: 104000, deductions: 14775, netSalary: 89225, payDate: "2026-07-31", status: "Processing" },
];

// ─── Recruitment ──────────────────────────────────────────────────────────────

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-Time" | "Part-Time" | "Contract";
  experience: string;
  openings: number;
  applicants: number;
  postedDate: string;
  status: "Open" | "On Hold" | "Closed";
}

export const mockJobOpenings: JobOpening[] = [
  { id: "JOB-001", title: "Senior Backend Engineer", department: "Engineering", location: "Remote", type: "Full-Time", experience: "4-6 years", openings: 2, applicants: 48, postedDate: "2026-06-15", status: "Open" },
  { id: "JOB-002", title: "Sales Account Executive", department: "Sales", location: "San Francisco, CA", type: "Full-Time", experience: "2-4 years", openings: 3, applicants: 72, postedDate: "2026-06-20", status: "Open" },
  { id: "JOB-003", title: "UX / Product Designer", department: "Engineering", location: "Remote", type: "Full-Time", experience: "3-5 years", openings: 1, applicants: 31, postedDate: "2026-06-01", status: "Open" },
  { id: "JOB-004", title: "Warehouse Team Lead", department: "Operations", location: "Oakland, CA", type: "Full-Time", experience: "3+ years", openings: 1, applicants: 19, postedDate: "2026-05-20", status: "On Hold" },
  { id: "JOB-005", title: "Digital Marketing Specialist", department: "Marketing", location: "San Francisco, CA", type: "Full-Time", experience: "2-3 years", openings: 1, applicants: 55, postedDate: "2026-07-01", status: "Open" },
];

export interface Applicant {
  id: string;
  name: string;
  email: string;
  jobId: string;
  jobTitle: string;
  appliedDate: string;
  experience: string;
  stage: "Applied" | "Screening" | "Interview" | "Offer" | "Hired" | "Rejected";
  rating: number;
}

export const mockApplicants: Applicant[] = [
  { id: "APP-001", name: "Nikhil Mehta", email: "nikhil@mail.com", jobId: "JOB-001", jobTitle: "Senior Backend Engineer", appliedDate: "2026-06-17", experience: "5 years", stage: "Interview", rating: 4 },
  { id: "APP-002", name: "Claire Dubois", email: "claire@mail.com", jobId: "JOB-001", jobTitle: "Senior Backend Engineer", appliedDate: "2026-06-18", experience: "4 years", stage: "Screening", rating: 3 },
  { id: "APP-003", name: "Tom Wilson", email: "tom@mail.com", jobId: "JOB-002", jobTitle: "Sales Account Executive", appliedDate: "2026-06-21", experience: "3 years", stage: "Offer", rating: 5 },
  { id: "APP-004", name: "Anjali Singh", email: "anjali@mail.com", jobId: "JOB-003", jobTitle: "UX / Product Designer", appliedDate: "2026-06-05", experience: "4 years", stage: "Hired", rating: 5 },
  { id: "APP-005", name: "Jason Bourne", email: "jason@mail.com", jobId: "JOB-002", jobTitle: "Sales Account Executive", appliedDate: "2026-06-22", experience: "2 years", stage: "Applied", rating: 3 },
  { id: "APP-006", name: "Mehmet Yilmaz", email: "mehmet@mail.com", jobId: "JOB-005", jobTitle: "Digital Marketing Specialist", appliedDate: "2026-07-01", experience: "2 years", stage: "Applied", rating: 4 },
];

// ─── Performance ──────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  department: string;
  dueDate: string;
  progress: number;
  status: "On Track" | "At Risk" | "Completed" | "Not Started";
}

export const mockGoals: Goal[] = [
  { id: "GOAL-001", employeeId: "EMP-001", employeeName: "James Thompson", title: "Achieve $2M Q3 Sales Quota", department: "Sales", dueDate: "2026-09-30", progress: 48, status: "On Track" },
  { id: "GOAL-002", employeeId: "EMP-002", employeeName: "Sarah Mitchell", title: "Launch 3 brand campaigns by Q3", department: "Marketing", dueDate: "2026-09-30", progress: 66, status: "On Track" },
  { id: "GOAL-003", employeeId: "EMP-003", employeeName: "Kevin Park", title: "Migrate auth service to microservices", department: "Engineering", dueDate: "2026-08-31", progress: 85, status: "On Track" },
  { id: "GOAL-004", employeeId: "EMP-004", employeeName: "Priya Sharma", title: "Complete onboarding automation", department: "HR", dueDate: "2026-07-31", progress: 30, status: "At Risk" },
  { id: "GOAL-005", employeeId: "EMP-005", employeeName: "Daniel Roberts", title: "Reduce warehouse cycle time by 15%", department: "Operations", dueDate: "2026-08-31", progress: 100, status: "Completed" },
  { id: "GOAL-006", employeeId: "EMP-007", employeeName: "Marcus Johnson", title: "Implement automated expense approvals", department: "Finance", dueDate: "2026-09-30", progress: 0, status: "Not Started" },
];

export interface Appraisal {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  period: string;
  selfScore: number;
  managerScore: number;
  finalScore: number;
  rating: "Outstanding" | "Exceeds Expectations" | "Meets Expectations" | "Needs Improvement";
  reviewer: string;
  status: "Completed" | "In Progress" | "Pending";
}

export const mockAppraisals: Appraisal[] = [
  { id: "APR-001", employeeId: "EMP-001", employeeName: "James Thompson", department: "Sales", period: "H1 2026", selfScore: 88, managerScore: 91, finalScore: 90, rating: "Exceeds Expectations", reviewer: "Sarah Chen", status: "Completed" },
  { id: "APR-002", employeeId: "EMP-002", employeeName: "Sarah Mitchell", department: "Marketing", period: "H1 2026", selfScore: 92, managerScore: 94, finalScore: 93, rating: "Outstanding", reviewer: "CEO", status: "Completed" },
  { id: "APR-003", employeeId: "EMP-003", employeeName: "Kevin Park", department: "Engineering", period: "H1 2026", selfScore: 85, managerScore: 87, finalScore: 86, rating: "Meets Expectations", reviewer: "Alex Rivera", status: "In Progress" },
  { id: "APR-004", employeeId: "EMP-005", employeeName: "Daniel Roberts", department: "Operations", period: "H1 2026", selfScore: 95, managerScore: 93, finalScore: 94, rating: "Outstanding", reviewer: "COO", status: "Completed" },
  { id: "APR-005", employeeId: "EMP-007", employeeName: "Marcus Johnson", department: "Finance", period: "H1 2026", selfScore: 0, managerScore: 0, finalScore: 0, rating: "Meets Expectations", reviewer: "CFO", status: "Pending" },
];

// ─── HR Stats ─────────────────────────────────────────────────────────────────
export const mockHrStats = {
  totalEmployees: 124,
  activeEmployees: 119,
  onLeave: 3,
  newJoinees: 5,
  attritionRate: 3.8,
  avgTenure: 2.8,
  totalPayroll: 1250000,
  openPositions: 7,
  avgAttendance: 94.2,
  trainingCompletion: 78,
};
