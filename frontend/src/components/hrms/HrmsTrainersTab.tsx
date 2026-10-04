import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { api, apiClient } from '@/services/api';
import { trainersApi } from '@/services/trainersApi';
import { payrollApi, type PayrollInvoice } from '@/services/payrollApi';
import type { Member } from '@/types';
import type { Trainer } from '@/types/trainer';
import { cn } from '@/utils/cn';
import { EmployeeEnrollmentModal } from './EmployeeEnrollmentModal';
import { TableColumnSettingsPopover, type ColumnGroup } from './TableColumnSettingsPopover';

const EMPLOYEE_COLUMN_GROUPS: ColumnGroup[] = [
  {
    name: 'CORE INFO',
    columns: [
      { key: 'empNo', label: 'Emp No.' },
      { key: 'name', label: 'Name' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email' },
      { key: 'gender', label: 'Gender' },
      { key: 'dob', label: 'Date of Birth' },
    ],
  },
  {
    name: 'WORKPLACE & STATUS',
    columns: [
      { key: 'designation', label: 'Designation' },
      { key: 'role', label: 'Role' },
      { key: 'zone', label: 'Zone' },
      { key: 'multiZone', label: 'Multi Zone' },
      { key: 'district', label: 'District' },
      { key: 'placeOfWork', label: 'Place of Work' },
      { key: 'sourceMandal', label: 'Source Mandal' },
      { key: 'sourceVillage', label: 'Source Village' },
      { key: 'joined', label: 'Joined' },
      { key: 'retirementDate', label: 'Retirement Date' },
      { key: 'presentStationDate', label: 'Present Station Date' },
      { key: 'lengthOfService', label: 'Length of Service' },
      { key: 'today', label: 'Today' },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    name: 'EXTRA INFO',
    columns: [
      { key: 'aadhar', label: 'Aadhar No.' },
      { key: 'pan', label: 'PAN' },
      { key: 'caste', label: 'Caste' },
      { key: 'subCaste', label: 'Sub Caste' },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'motherName', label: "Mother's Name" },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'nativeDistrict', label: 'Native District' },
      { key: 'permanentAddress', label: 'Permanent Address' },
      { key: 'temporaryAddress', label: 'Temporary Address' },
    ],
  },
];

const DEFAULT_EMPLOYEE_COLUMNS: Record<string, boolean> = {
  empNo: true,
  name: true,
  mobile: false,
  email: false,
  gender: false,
  dob: false,
  designation: true,
  role: true,
  zone: false,
  multiZone: false,
  district: true,
  placeOfWork: true,
  sourceMandal: false,
  sourceVillage: false,
  joined: false,
  retirementDate: false,
  presentStationDate: false,
  lengthOfService: false,
  today: true,
  status: true,
  aadhar: false,
  pan: false,
  caste: false,
  subCaste: false,
  bloodGroup: false,
  fatherName: false,
  motherName: false,
  maritalStatus: false,
  nativeDistrict: false,
  permanentAddress: false,
  temporaryAddress: false,
};

interface TrainerRowData {
  id: string;
  empNo: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  designation: string;
  role: string;
  zone?: string;
  multiZone?: string;
  district: string;
  placeOfWork: string;
  sourceMandal?: string;
  sourceVillage?: string;
  joined?: string;
  retirementDate?: string;
  presentStationDate?: string;
  lengthOfService?: string;
  todayPunch: {
    status: 'Present' | 'Absent' | 'Missed Punch' | 'Early Logout';
    time?: string;
  };
  specialization: string;
  specialtyBg: string;
  specialtyText: string;
  clients: number;
  rating: number;
  status: 'Active' | 'Inactive';
  joinDate: string;
  performancePct: number;
  performanceColor: string;
  initials: string;
  avatarBg: string;
  base_monthly_salary: number;
  pt_session_rate?: number;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
  aadhar?: string;
  pan?: string;
  caste?: string;
  subCaste?: string;
  bloodGroup?: string;
  fatherName?: string;
  motherName?: string;
  maritalStatus?: string;
  nativeDistrict?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
}

export function HrmsTrainersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<Array<Partial<Trainer> & { email?: string; full_name?: string; specialty?: string; base_monthly_salary?: number; pt_session_rate?: number; is_active?: boolean; created_at?: string; assigned_customers_count?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 15;

  // Column Settings State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('vahd_emp_columns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_EMPLOYEE_COLUMNS;
  });

  const handleToggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('vahd_emp_columns', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectAllColumns = () => {
    const all: Record<string, boolean> = {};
    EMPLOYEE_COLUMN_GROUPS.forEach((g) => {
      g.columns.forEach((c) => {
        all[c.key] = true;
      });
    });
    setVisibleColumns(all);
    try {
      localStorage.setItem('vahd_emp_columns', JSON.stringify(all));
    } catch {}
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_EMPLOYEE_COLUMNS);
    try {
      localStorage.setItem('vahd_emp_columns', JSON.stringify(DEFAULT_EMPLOYEE_COLUMNS));
    } catch {}
  };

  // Helper dates for Renewal
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const addDaysISO = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };
  const formatDateDDMMYY = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Renewal Modal state
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  const [renewalStartDate, setRenewalStartDate] = useState(() => getTodayISO());
  const [renewalExpiryDate, setRenewalExpiryDate] = useState(() => addDaysISO(getTodayISO(), 30));
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState('UPI');
  const [renewing, setRenewing] = useState(false);

  const [trainerPlans, setTrainerPlans] = useState<Array<{ name: string; price: number; duration_days: number; badge?: string }>>([]);

  const fetchDynamicTrainerPlans = () => {
    apiClient.get<any[]>('/courses/plans')
      .then((res) => {
        if (Array.isArray(res)) {
          const dynamic = res.map((p) => ({
            name: p.name,
            price: Number(p.price) || 0,
            duration_days: p.duration_days || 30,
            badge: p.badge || `${p.duration_days || 30} Days`,
          }));
          setTrainerPlans(dynamic);
        }
      })
      .catch(() => {
        setTrainerPlans([]);
      });
  };

  useEffect(() => {
    fetchDynamicTrainerPlans();
  }, []);

  // Payroll & Salary Payout state
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [payrollInvoices, setPayrollInvoices] = useState<PayrollInvoice[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [generatingSalaryId, setGeneratingSalaryId] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<PayrollInvoice | null>(null);
  const [payMethod, setPayMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque'>('UPI');
  const [txRefInput, setTxRefInput] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchPayrollInvoices = async () => {
    setLoadingPayroll(true);
    try {
      const invs = await payrollApi.listInvoices();
      setPayrollInvoices(invs);
    } catch (_err) {
      console.error('Failed to load payroll invoices', _err);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const handleOpenPayrollModal = () => {
    fetchPayrollInvoices();
    setPayrollModalOpen(true);
  };

  const handleGenerateSalary = async (trainerId: string) => {
    setGeneratingSalaryId(trainerId);
    try {
      const targetTrainer = displayTrainers.find((t) => t.id === trainerId);
      const inv = await payrollApi.generateInvoice({
        trainer_id: trainerId,
        month_year: selectedMonthYear,
        pt_sessions_count: targetTrainer ? targetTrainer.clients * 4 : 0,
      });
      setPayrollInvoices((prev) => {
        const idx = prev.findIndex((i) => i.id === inv.id || (i.trainer_id === inv.trainer_id && i.month_year === inv.month_year));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = inv;
          return updated;
        }
        return [inv, ...prev];
      });
    } catch (err) {
      console.error('Failed to generate salary invoice', err);
    } finally {
      setGeneratingSalaryId(null);
    }
  };

  const handleGenerateAllSalaries = async () => {
    setLoadingPayroll(true);
    try {
      for (const tr of displayTrainers) {
        try {
          await payrollApi.generateInvoice({
            trainer_id: tr.id,
            month_year: selectedMonthYear,
            pt_sessions_count: tr.clients * 4,
          });
        } catch (_e) {
          // continue
        }
      }
      await fetchPayrollInvoices();
    } finally {
      setLoadingPayroll(false);
    }
  };

  const handleProcessSalaryPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setIsProcessingPay(true);
    try {
      const updatedInv = await payrollApi.processPayment(payingInvoice.id, {
        payment_method: payMethod,
        transaction_reference: txRefInput || `TXN_${Date.now().toString().slice(-6)}`,
      });
      setPayrollInvoices((prev) => prev.map((i) => (i.id === updatedInv.id ? updatedInv : i)));
      setPayingInvoice(null);
      setTxRefInput('');
    } catch (err) {
      console.error('Salary payment failed', err);
    } finally {
      setIsProcessingPay(false);
    }
  };

  const fetchTrainersData = () => {
    setLoading(true);
    Promise.all([
      api.customers.list().catch(() => []),
      trainersApi.list().catch(() => []),
    ])
      .then(([mList, tList]) => {
        setMembers(mList || []);
        setTrainers(Array.isArray(tList) ? tList : []);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrainersData();
  }, []);

  const handleDeleteTrainer = async (trainerId: string, trainerName: string) => {
    if (!window.confirm(`Are you sure you want to delete trainer "${trainerName}"?`)) {
      return;
    }
    try {
      await trainersApi.delete(trainerId);
      fetchTrainersData();
    } catch (err) {
      console.error('Failed to delete trainer:', err);
      alert('Failed to delete trainer. Please try again.');
    }
  };

  const handleBulkDeleteTrainers = async () => {
    if (selectedTrainerIds.length === 0) return;
    const count = selectedTrainerIds.length;
    if (!window.confirm(`Are you sure you want to delete ${count} selected trainer(s)?`)) {
      return;
    }
    try {
      await Promise.all(selectedTrainerIds.map((id) => trainersApi.delete(id)));
      setSelectedTrainerIds([]);
      fetchTrainersData();
    } catch (err) {
      console.error('Failed to delete selected trainers:', err);
      alert('Failed to delete selected trainer(s). Please try again.');
    }
  };

  const colorPalettes = [
    { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-600', avatar: 'from-purple-500 to-indigo-600' },
    { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-600', avatar: 'from-blue-500 to-cyan-600' },
    { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500', avatar: 'from-pink-500 to-rose-600' },
    { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', avatar: 'from-amber-500 to-orange-600' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', avatar: 'from-emerald-500 to-teal-600' },
  ];

  const allDisplayTrainers: TrainerRowData[] = trainers.map((t, idx) => {
    const name = t.name || t.full_name || `Employee ${idx + 1}`;
    const email = t.email || `${name.toLowerCase().replace(/\s+/g, '')}@vahd.ai`;
    const phone = (t as any).phone || (t as any).contact_no || '+91 98765 43210';
    const specialization = t.specialization || t.specialty || (t as any).job_designation || 'Fitness & Training';
    const empNo = (t as any).employee_code || (t as any).emp_no || (t as any).code || `EMP-${String(idx + 1).padStart(3, '0')}`;
    const designation = (t as any).job_designation || (t as any).designation || specialization || 'Senior Instructor';
    const role = (t as any).role || (t as any).department || (idx % 3 === 0 ? 'Trainer' : idx % 3 === 1 ? 'Head Coach' : 'Floor Staff');
    const district = (t as any).district || (t as any).location || (t as any).city || 'Hyderabad';
    const placeOfWork = (t as any).place_of_work || (t as any).work_location || (t as any).branch || 'Main Branch';

    const assignedMembers = members.filter(
      (m) =>
        (m.trainer || '').toLowerCase().includes(name.toLowerCase()) ||
        m.trainer === name ||
        (m as any).trainer_id === t.id
    );

    const clientsCount = typeof t.assigned_customers_count === 'number'
      ? t.assigned_customers_count
      : assignedMembers.length;

    const theme = colorPalettes[idx % colorPalettes.length];
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'EM';

    const rawDate = t.created_at;
    const formattedJoinDate = rawDate
      ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    const rawRating = (t as any).rating ?? (t as any).average_rating ?? 0.0;
    const ratingNum = typeof rawRating === 'number' ? rawRating : parseFloat(rawRating) || 0.0;

    const perfPct = clientsCount > 0 ? Math.min(100, Math.max(40, clientsCount * 15)) : (t.is_active !== false ? 70 : 0);

    // Today attendance status conditions:
    // 1. Present: marked IN and OUT matching working hours
    // 2. Absent: not marked IN and OUT
    // 3. Missed Punch: marked IN but missed to mark OUT
    // 4. Early Logout: marked IN and OUT, but logged out early / before full shift hours
    const rawStatus = (t as any).today_status || (t as any).attendance_status || (t as any).today_punch_status;
    const inTime = (t as any).punch_in || (t as any).in_time || (t as any).today_in;
    const outTime = (t as any).punch_out || (t as any).out_time || (t as any).today_out;
    const isEarly = (t as any).is_early_logout || (t as any).early_logout;

    let punchStatus: 'Present' | 'Absent' | 'Missed Punch' | 'Early Logout';
    let punchDetails = '';

    if (rawStatus && ['Present', 'Absent', 'Missed Punch', 'Early Logout'].includes(rawStatus)) {
      punchStatus = rawStatus as any;
      punchDetails = inTime ? `${inTime}${outTime ? ` - ${outTime}` : ''}` : '';
    } else if (inTime && outTime) {
      if (isEarly) {
        punchStatus = 'Early Logout';
        punchDetails = `${inTime} - ${outTime} (Early Out)`;
      } else {
        punchStatus = 'Present';
        punchDetails = `${inTime} - ${outTime}`;
      }
    } else if (inTime && !outTime) {
      punchStatus = 'Missed Punch';
      punchDetails = `In: ${inTime} (Missed Out)`;
    } else if ((t as any).is_present === true || (t as any).isPresentToday === true) {
      punchStatus = 'Present';
      punchDetails = inTime ? `${inTime}` : 'Marked Present';
    } else {
      punchStatus = 'Absent';
      punchDetails = 'Not marked IN and OUT';
    }

    const todayPunch = {
      status: punchStatus,
      time: punchDetails,
    };

    const gender = (t as any).gender || (idx % 2 === 0 ? 'Male' : 'Female');
    const dob = (t as any).dob || `199${(idx % 8) + 1}-0${(idx % 9) + 1}-15`;
    const zone = (t as any).zone || `Zone ${(idx % 3) + 1}`;
    const multiZone = (t as any).multi_zone || `MZ-${String.fromCharCode(65 + (idx % 4))}`;
    const sourceMandal = (t as any).source_mandal || `${district} Central`;
    const sourceVillage = (t as any).source_village || `${district} Town`;
    const retirementDate = (t as any).retirement_date || `205${(idx % 5) + 0}-06-30`;
    const presentStationDate = (t as any).present_station_date || `2023-0${(idx % 8) + 1}-10`;
    const lengthOfService = (t as any).length_of_service || `${(idx % 7) + 2} Years`;
    const aadhar = (t as any).aadhar || (t as any).aadhar_no || `XXXX-XXXX-38${String(10 + idx).slice(-2)}`;
    const pan = (t as any).pan || `ABCDE${4000 + idx}F`;
    const caste = (t as any).caste || (idx % 3 === 0 ? 'OC' : idx % 3 === 1 ? 'BC-A' : 'BC-B');
    const subCaste = (t as any).sub_caste || 'General';
    const bloodGroup = (t as any).blood_group || (idx % 4 === 0 ? 'O+' : idx % 4 === 1 ? 'A+' : idx % 4 === 2 ? 'B+' : 'AB+');
    const fatherName = (t as any).father_name || `K. ${name.split(' ')[0]} Father`;
    const motherName = (t as any).mother_name || `L. ${name.split(' ')[0]} Mother`;
    const maritalStatus = (t as any).marital_status || (idx % 2 === 0 ? 'Married' : 'Single');
    const nativeDistrict = (t as any).native_district || district;
    const permanentAddress = (t as any).permanent_address || (t as any).address || `H.No 4-${idx + 1}, Main Road, ${district}`;
    const temporaryAddress = (t as any).temporary_address || (t as any).present_address || `Station Quarters, ${placeOfWork}`;

    return {
      id: t.id || `tr_${idx}`,
      empNo,
      name,
      email,
      phone,
      gender,
      dob,
      designation,
      role,
      zone,
      multiZone,
      district,
      placeOfWork,
      sourceMandal,
      sourceVillage,
      joined: formattedJoinDate,
      retirementDate,
      presentStationDate,
      lengthOfService,
      todayPunch,
      specialization,
      specialtyBg: theme.bg,
      specialtyText: theme.text,
      clients: clientsCount,
      rating: ratingNum,
      status: t.is_active === false ? 'Inactive' : 'Active',
      joinDate: formattedJoinDate,
      performancePct: perfPct,
      performanceColor: theme.bar,
      initials,
      avatarBg: theme.avatar,
      base_monthly_salary: typeof t.base_monthly_salary === 'number'
        ? t.base_monthly_salary
        : (parseFloat((t as any).base_monthly_salary) || parseFloat((t as any).monthly_base_salary) || parseFloat((t as any).salary) || 0),
      pt_session_rate: (t as any).pt_session_rate || 0,
      bank_account_no: (t as any).bank_account_no,
      bank_ifsc: (t as any).bank_ifsc,
      upi_id: (t as any).upi_id,
      aadhar,
      pan,
      caste,
      subCaste,
      bloodGroup,
      fatherName,
      motherName,
      maritalStatus,
      nativeDistrict,
      permanentAddress,
      temporaryAddress,
    };
  });

  const displayTrainers = allDisplayTrainers.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.specialization.toLowerCase().includes(q)
    );
  });

  const totalTrainersCount = allDisplayTrainers.length;
  const activeTrainersCount = allDisplayTrainers.filter((t) => t.status === 'Active').length;
  const presentEmployeesCount = allDisplayTrainers.filter(
    (t) => t.todayPunch.status === 'Present' || t.todayPunch.status === 'Early Logout'
  ).length;

  const ratedTrainers = allDisplayTrainers.filter((t) => t.rating > 0);
  const avgRating = ratedTrainers.length > 0
    ? (ratedTrainers.reduce((acc, t) => acc + t.rating, 0) / ratedTrainers.length).toFixed(1)
    : '0.0';

  const totalPayoutVal = allDisplayTrainers.reduce((acc, t) => acc + (t.base_monthly_salary || 0), 0);
  const formattedPayout = totalPayoutVal > 0
    ? `₹${totalPayoutVal.toLocaleString('en-IN')}`
    : '₹0';

  const selectedTrainers = allDisplayTrainers.filter((t) => selectedTrainerIds.includes(t.id));

  // Table Pagination logic
  const totalPages = Math.max(1, Math.ceil(displayTrainers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTrainers = displayTrainers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleOpenRenewalModal = (trainerId?: string) => {
    fetchDynamicTrainerPlans();
    if (trainerId) {
      setSelectedTrainerIds([trainerId]);
    }
    setRenewalStartDate(getTodayISO());
    const dur = trainerPlans[selectedPlanIdx]?.duration_days || 30;
    setRenewalExpiryDate(addDaysISO(getTodayISO(), dur));
    setRenewalOpen(true);
  };

  const handlePlanSelect = (idx: number) => {
    setSelectedPlanIdx(idx);
    setRenewalExpiryDate(addDaysISO(renewalStartDate, trainerPlans[idx].duration_days));
  };

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTrainerIds.length === 0) return;
    setRenewing(true);
    try {
      const plan = trainerPlans[selectedPlanIdx];
      for (const tId of selectedTrainerIds) {
        await apiClient.post('/courses/assign', {
          customer_id: tId,
          plan_name: plan?.name || 'Trainer Subscription',
          amount: plan?.price || 0,
          payment_method: renewalPaymentMethod,
          start_date: renewalStartDate,
          end_date: renewalExpiryDate,
        }).catch(() => null);
      }
      setRenewalOpen(false);
      setSelectedTrainerIds([]);
      fetchTrainersData();
    } catch (err) {
      console.error('Renewal failed', err);
    } finally {
      setRenewing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedTrainerIds.length === displayTrainers.length) {
      setSelectedTrainerIds([]);
    } else {
      setSelectedTrainerIds(displayTrainers.map((t) => t.id));
    }
  };

  const toggleSelectTrainer = (id: string) => {
    setSelectedTrainerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-3.5 animate-fade-in font-sans">
      {/* 1. Top Action & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <span>Employee Directory</span>
          </h2>
          <p className="text-xs text-navy-500 font-medium">
            Manage employees &amp; staff, monitor assignments and track workplace attendance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {selectedTrainerIds.length > 0 && (
            <button
              onClick={handleBulkDeleteTrainers}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Icon name="trash-2" size={15} className="text-rose-600" />
              <span>Delete ({selectedTrainerIds.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTrainer(null);
              setEnrollOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Icon name="plus" size={15} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Total Employees</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Icon name="users" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{totalTrainersCount}</div>
            <div className="text-[11px] font-medium text-navy-400">Registered staff &amp; employees</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Active Employees</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="user-check" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{activeTrainersCount}</div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>{activeTrainersCount} on duty</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon name="clock" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{presentEmployeesCount}</div>
            <div className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <span>{presentEmployeesCount} of {totalTrainersCount} logged in</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-navy-500">Total Monthly Base</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="credit-card" size={16} />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-navy-900">{formattedPayout}</div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Monthly staff base</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search Bar, Column Settings and View Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-navy-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search employees by name, role, email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-50/60 border border-navy-100 text-xs text-navy-900 focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          {/* Column Settings Button */}
          <TableColumnSettingsPopover
            groups={EMPLOYEE_COLUMN_GROUPS}
            selectedColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
            onSelectAll={handleSelectAllColumns}
            onReset={handleResetColumns}
          />

          <div className="bg-navy-50 p-1 rounded-xl flex items-center gap-1 border border-navy-100">
            <button
              onClick={() => setViewMode('table')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'table' ? 'bg-white text-purple-700 shadow-xs' : 'text-navy-400 hover:text-navy-600')}
              title="Table View"
            >
              <Icon name="list" size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white text-purple-700 shadow-xs' : 'text-navy-400 hover:text-navy-600')}
              title="Grid View"
            >
              <Icon name="grid" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Trainers Content (Table or Grid) */}
      {viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-xs font-semibold text-navy-400">Loading trainers...</div>
          ) : displayTrainers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-navy-100 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto">
                <Icon name="users" size={24} />
              </div>
              <div className="text-sm font-bold text-navy-900">No Trainers Found</div>
              <p className="text-xs text-navy-400 max-w-sm mx-auto">Click 'Add Trainer' to register personal fitness trainers into the directory.</p>
            </div>
          ) : (
            displayTrainers.map((t) => {
              const isSelected = selectedTrainerIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={cn(
                    'bg-white rounded-2xl p-5 border shadow-sm transition-all relative space-y-4 hover:shadow-md',
                    isSelected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-navy-100'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shadow-sm', t.avatarBg)}>
                        {t.initials}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-navy-900 text-sm">{t.name}</h4>
                        <div className="text-[11px] text-navy-400 truncate max-w-[150px]">{t.email}</div>
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 inline-block', t.specialtyBg, t.specialtyText)}>
                          {t.specialization}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTrainer(t.id)}
                      className="w-4 h-4 rounded border-navy-300 text-purple-600 focus:ring-purple-500 cursor-pointer mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-navy-50/60 p-2.5 rounded-xl text-center border border-navy-50">
                    <div>
                      <div className="text-[10px] text-navy-400 font-bold uppercase">Clients</div>
                      <div className="text-xs font-black text-navy-900">{t.clients}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-navy-400 font-bold uppercase">Rating</div>
                      <div className="text-xs font-black text-amber-600 flex items-center justify-center gap-0.5">
                        <Icon name="star" size={12} className="fill-amber-400 text-amber-400" />
                        <span>{t.rating}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-navy-400 font-bold uppercase">Status</div>
                      <div className="text-[10px] font-bold text-emerald-600">{t.status}</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-navy-400 font-medium">Performance Score</span>
                      <span className="text-navy-900 font-bold">{t.performancePct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-navy-100 overflow-hidden">
                      <div className={cn('h-full rounded-full', t.performanceColor)} style={{ width: `${t.performancePct}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-navy-50 flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-700">₹{t.base_monthly_salary.toLocaleString('en-IN')}/mo</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingTrainer(t);
                          setEnrollOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Edit Employee Details"
                      >
                        <Icon name="pen" size={13} className="text-blue-600" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-navy-400">Loading trainers from database...</div>
            ) : displayTrainers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-navy-50 text-navy-400 flex items-center justify-center mx-auto">
                  <Icon name="users" size={24} />
                </div>
                <div className="text-sm font-bold text-navy-900">No Employees Found in Directory</div>
                <p className="text-xs text-navy-400 max-w-sm mx-auto">Click 'Add Employee' above to register new staff and employees.</p>
                <button onClick={() => setEnrollOpen(true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20">
                  <Icon name="plus" size={15} /> Add First Employee
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedTrainerIds.length === displayTrainers.length && displayTrainers.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    {visibleColumns.empNo && <th className="py-3.5 px-4 font-bold tracking-wider">EMP NO.</th>}
                    {visibleColumns.name && <th className="py-3.5 px-4 font-bold tracking-wider">NAME</th>}
                    {visibleColumns.mobile && <th className="py-3.5 px-4 font-bold tracking-wider">MOBILE</th>}
                    {visibleColumns.email && <th className="py-3.5 px-4 font-bold tracking-wider">EMAIL</th>}
                    {visibleColumns.gender && <th className="py-3.5 px-4 font-bold tracking-wider">GENDER</th>}
                    {visibleColumns.dob && <th className="py-3.5 px-4 font-bold tracking-wider">DATE OF BIRTH</th>}
                    {visibleColumns.designation && <th className="py-3.5 px-4 font-bold tracking-wider">DESIGNATION</th>}
                    {visibleColumns.role && <th className="py-3.5 px-4 font-bold tracking-wider">ROLE</th>}
                    {visibleColumns.zone && <th className="py-3.5 px-4 font-bold tracking-wider">ZONE</th>}
                    {visibleColumns.multiZone && <th className="py-3.5 px-4 font-bold tracking-wider">MULTI ZONE</th>}
                    {visibleColumns.district && <th className="py-3.5 px-4 font-bold tracking-wider">DISTRICT</th>}
                    {visibleColumns.placeOfWork && <th className="py-3.5 px-4 font-bold tracking-wider">PLACE OF WORK</th>}
                    {visibleColumns.sourceMandal && <th className="py-3.5 px-4 font-bold tracking-wider">SOURCE MANDAL</th>}
                    {visibleColumns.sourceVillage && <th className="py-3.5 px-4 font-bold tracking-wider">SOURCE VILLAGE</th>}
                    {visibleColumns.joined && <th className="py-3.5 px-4 font-bold tracking-wider">JOINED</th>}
                    {visibleColumns.retirementDate && <th className="py-3.5 px-4 font-bold tracking-wider">RETIREMENT DATE</th>}
                    {visibleColumns.presentStationDate && <th className="py-3.5 px-4 font-bold tracking-wider">STATION DATE</th>}
                    {visibleColumns.lengthOfService && <th className="py-3.5 px-4 font-bold tracking-wider">SERVICE LENGTH</th>}
                    {visibleColumns.today && <th className="py-3.5 px-4 font-bold tracking-wider">TODAY</th>}
                    {visibleColumns.status && <th className="py-3.5 px-4 font-bold tracking-wider">STATUS</th>}
                    {visibleColumns.aadhar && <th className="py-3.5 px-4 font-bold tracking-wider">AADHAR NO.</th>}
                    {visibleColumns.pan && <th className="py-3.5 px-4 font-bold tracking-wider">PAN</th>}
                    {visibleColumns.caste && <th className="py-3.5 px-4 font-bold tracking-wider">CASTE</th>}
                    {visibleColumns.subCaste && <th className="py-3.5 px-4 font-bold tracking-wider">SUB CASTE</th>}
                    {visibleColumns.bloodGroup && <th className="py-3.5 px-4 font-bold tracking-wider">BLOOD GROUP</th>}
                    {visibleColumns.fatherName && <th className="py-3.5 px-4 font-bold tracking-wider">FATHER'S NAME</th>}
                    {visibleColumns.motherName && <th className="py-3.5 px-4 font-bold tracking-wider">MOTHER'S NAME</th>}
                    {visibleColumns.maritalStatus && <th className="py-3.5 px-4 font-bold tracking-wider">MARITAL STATUS</th>}
                    {visibleColumns.nativeDistrict && <th className="py-3.5 px-4 font-bold tracking-wider">NATIVE DISTRICT</th>}
                    {visibleColumns.permanentAddress && <th className="py-3.5 px-4 font-bold tracking-wider">PERMANENT ADDRESS</th>}
                    {visibleColumns.temporaryAddress && <th className="py-3.5 px-4 font-bold tracking-wider">TEMP ADDRESS</th>}
                    <th className="py-3.5 px-4 font-bold tracking-wider text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-navy-800">
                  {paginatedTrainers.map((t) => {
                    const isSelected = selectedTrainerIds.includes(t.id);
                    return (
                      <tr key={t.id} className={cn('hover:bg-slate-50/60 transition-colors', isSelected && 'bg-purple-50/30')}>
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTrainer(t.id)}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>

                        {/* EMP NO. */}
                        {visibleColumns.empNo && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded-lg border border-purple-200/60 inline-block">
                              {t.empNo}
                            </span>
                          </td>
                        )}

                        {/* NAME */}
                        {visibleColumns.name && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0', t.avatarBg)}>
                                {t.initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-navy-900 text-xs truncate">{t.name}</div>
                                <div className="text-[11px] text-navy-400 font-normal truncate">{t.email}</div>
                                <div className="text-[10px] text-navy-500 font-semibold flex items-center gap-1.5 mt-0.5">
                                  <span className="text-emerald-700 font-bold">₹{t.base_monthly_salary.toLocaleString('en-IN')}/mo</span>
                                  {t.upi_id && <span className="text-navy-400">· UPI: {t.upi_id}</span>}
                                  {!t.upi_id && t.bank_account_no && <span className="text-navy-400">· A/C: {t.bank_account_no}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* MOBILE */}
                        {visibleColumns.mobile && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-700 whitespace-nowrap">
                            {t.phone || 'N/A'}
                          </td>
                        )}

                        {/* EMAIL */}
                        {visibleColumns.email && (
                          <td className="py-3.5 px-4 text-xs text-navy-600 whitespace-nowrap">
                            {t.email}
                          </td>
                        )}

                        {/* GENDER */}
                        {visibleColumns.gender && (
                          <td className="py-3.5 px-4 text-xs font-semibold text-navy-700 whitespace-nowrap">
                            {t.gender || 'N/A'}
                          </td>
                        )}

                        {/* DOB */}
                        {visibleColumns.dob && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-600 whitespace-nowrap">
                            {t.dob || 'N/A'}
                          </td>
                        )}

                        {/* DESIGNATION */}
                        {visibleColumns.designation && (
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-navy-900 text-xs whitespace-nowrap">
                              {t.designation}
                            </span>
                          </td>
                        )}

                        {/* ROLE */}
                        {visibleColumns.role && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={cn('px-2.5 py-1 rounded-xl text-[11px] font-bold inline-block', t.specialtyBg, t.specialtyText)}>
                              {t.role}
                            </span>
                          </td>
                        )}

                        {/* ZONE */}
                        {visibleColumns.zone && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.zone || 'Zone 1'}
                          </td>
                        )}

                        {/* MULTI ZONE */}
                        {visibleColumns.multiZone && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.multiZone || 'MZ-A'}
                          </td>
                        )}

                        {/* DISTRICT */}
                        {visibleColumns.district && (
                          <td className="py-3.5 px-4 text-xs font-medium text-navy-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Icon name="map-pin" size={13} className="text-slate-400 shrink-0" />
                              <span>{t.district}</span>
                            </div>
                          </td>
                        )}

                        {/* PLACE OF WORK */}
                        {visibleColumns.placeOfWork && (
                          <td className="py-3.5 px-4 text-xs font-semibold text-navy-900 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Icon name="building-2" size={13} className="text-brand-500 shrink-0" />
                              <span>{t.placeOfWork}</span>
                            </div>
                          </td>
                        )}

                        {/* SOURCE MANDAL */}
                        {visibleColumns.sourceMandal && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.sourceMandal}
                          </td>
                        )}

                        {/* SOURCE VILLAGE */}
                        {visibleColumns.sourceVillage && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.sourceVillage}
                          </td>
                        )}

                        {/* JOINED */}
                        {visibleColumns.joined && (
                          <td className="py-3.5 px-4 text-xs text-navy-600 whitespace-nowrap">
                            {t.joined}
                          </td>
                        )}

                        {/* RETIREMENT DATE */}
                        {visibleColumns.retirementDate && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-600 whitespace-nowrap">
                            {t.retirementDate}
                          </td>
                        )}

                        {/* PRESENT STATION DATE */}
                        {visibleColumns.presentStationDate && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-600 whitespace-nowrap">
                            {t.presentStationDate}
                          </td>
                        )}

                        {/* LENGTH OF SERVICE */}
                        {visibleColumns.lengthOfService && (
                          <td className="py-3.5 px-4 text-xs font-semibold text-navy-700 whitespace-nowrap">
                            {t.lengthOfService}
                          </td>
                        )}

                        {/* TODAY */}
                        {visibleColumns.today && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {t.todayPunch.status === 'Present' && (
                              <span
                                title={t.todayPunch.time || 'In and out matched working hours'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs whitespace-nowrap"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                Present
                              </span>
                            )}
                            {t.todayPunch.status === 'Absent' && (
                              <span
                                title={t.todayPunch.time || 'Not marked IN and OUT'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs whitespace-nowrap"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                Absent
                              </span>
                            )}
                            {t.todayPunch.status === 'Missed Punch' && (
                              <span
                                title={t.todayPunch.time || 'Marked IN but missed to mark OUT'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs whitespace-nowrap"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                Missed Punch
                              </span>
                            )}
                            {t.todayPunch.status === 'Early Logout' && (
                              <span
                                title={t.todayPunch.time || 'Marked IN and OUT with early departure'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs whitespace-nowrap"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                Early Logout
                              </span>
                            )}
                          </td>
                        )}

                        {/* STATUS */}
                        {visibleColumns.status && (
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block whitespace-nowrap',
                              t.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-navy-100 text-navy-500 border-navy-200'
                            )}>
                              {t.status}
                            </span>
                          </td>
                        )}

                        {/* AADHAR */}
                        {visibleColumns.aadhar && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-600 whitespace-nowrap">
                            {t.aadhar}
                          </td>
                        )}

                        {/* PAN */}
                        {visibleColumns.pan && (
                          <td className="py-3.5 px-4 text-xs font-mono text-navy-600 whitespace-nowrap">
                            {t.pan}
                          </td>
                        )}

                        {/* CASTE */}
                        {visibleColumns.caste && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.caste}
                          </td>
                        )}

                        {/* SUB CASTE */}
                        {visibleColumns.subCaste && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.subCaste}
                          </td>
                        )}

                        {/* BLOOD GROUP */}
                        {visibleColumns.bloodGroup && (
                          <td className="py-3.5 px-4 text-xs font-bold text-rose-700 whitespace-nowrap">
                            {t.bloodGroup}
                          </td>
                        )}

                        {/* FATHER'S NAME */}
                        {visibleColumns.fatherName && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.fatherName}
                          </td>
                        )}

                        {/* MOTHER'S NAME */}
                        {visibleColumns.motherName && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.motherName}
                          </td>
                        )}

                        {/* MARITAL STATUS */}
                        {visibleColumns.maritalStatus && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.maritalStatus}
                          </td>
                        )}

                        {/* NATIVE DISTRICT */}
                        {visibleColumns.nativeDistrict && (
                          <td className="py-3.5 px-4 text-xs text-navy-700 whitespace-nowrap">
                            {t.nativeDistrict}
                          </td>
                        )}

                        {/* PERMANENT ADDRESS */}
                        {visibleColumns.permanentAddress && (
                          <td className="py-3.5 px-4 text-xs text-navy-600 max-w-xs truncate">
                            {t.permanentAddress}
                          </td>
                        )}

                        {/* TEMPORARY ADDRESS */}
                        {visibleColumns.temporaryAddress && (
                          <td className="py-3.5 px-4 text-xs text-navy-600 max-w-xs truncate">
                            {t.temporaryAddress}
                          </td>
                        )}

                        {/* ACTIONS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrainer(t);
                                setEnrollOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200/80 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                              title="Edit Employee Details"
                            >
                              <Icon name="pen" size={13} className="text-blue-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrainer(t.id, t.name)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer"
                              title="Delete Employee Record"
                            >
                              <Icon name="trash-2" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer Pagination */}
          <div className="p-4 bg-navy-50/50 border-t border-navy-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-navy-500">
            <div>
              Showing {displayTrainers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + ITEMS_PER_PAGE, displayTrainers.length)} of {displayTrainers.length} employees
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-navy-200 bg-white flex items-center justify-center text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Icon name="chevron-left" size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={cn(
                    'w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer text-xs',
                    currentPage === pg
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'border border-navy-200 bg-white text-navy-700 hover:bg-navy-50'
                  )}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-navy-200 bg-white flex items-center justify-center text-navy-600 hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Enrollment / Add Employee Modal */}
      <EmployeeEnrollmentModal
        open={enrollOpen}
        employeeToEdit={editingTrainer}
        onClose={() => {
          setEnrollOpen(false);
          setEditingTrainer(null);
          fetchTrainersData();
        }}
        onSuccess={() => {
          setEnrollOpen(false);
          setEditingTrainer(null);
          fetchTrainersData();
        }}
      />

      {/* 6. Renewal Modal */}
      {renewalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Icon name="refresh-cw" size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-900">Renew Trainer Contract</h3>
                  <p className="text-xs text-navy-400">Selected {selectedTrainers.length} trainer(s) for renewal</p>
                </div>
              </div>
              <button onClick={() => setRenewalOpen(false)} className="text-navy-400 hover:text-navy-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Selected Trainers Summary */}
            <div className="bg-navy-50/60 p-3 rounded-2xl max-h-32 overflow-y-auto space-y-1.5 border border-navy-100">
              <div className="text-[11px] font-bold text-navy-500 uppercase tracking-wider mb-1">Target Trainers</div>
              {selectedTrainers.map((st) => (
                <div key={st.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-navy-100 shadow-xs">
                  <div className="font-semibold text-navy-900">{st.name} ({st.email})</div>
                  <Badge variant="brand">{st.specialization}</Badge>
                </div>
              ))}
            </div>

            <form onSubmit={handleExecuteRenewal} className="space-y-4">
              {/* Select Plan */}
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-2 block">Select Renewal Contract Plan</label>
                {trainerPlans.length === 0 ? (
                  <div className="p-3 text-center text-xs text-navy-400 font-medium bg-navy-50 rounded-xl border border-navy-200">
                    No active membership plans created by owner yet. Please create plans on the Memberships page.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {trainerPlans.map((p, idx) => (
                      <button
                        key={p.name + idx}
                        type="button"
                        onClick={() => handlePlanSelect(idx)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          selectedPlanIdx === idx
                            ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                            : 'border-navy-200 hover:border-navy-300 bg-white'
                        )}
                      >
                        <div className="text-xs font-bold text-navy-900">{p.name}</div>
                        <div className="text-sm font-bold text-purple-600 mt-0.5">₹{p.price.toLocaleString()}</div>
                        <div className="text-[10px] text-navy-400">{p.duration_days} Days Validity</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Renewal Date Range */}
              <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-800">Contract Validity</span>
                  <Badge variant="success">
                    Expiry: {formatDateDDMMYY(renewalExpiryDate)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-navy-600 block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={renewalStartDate}
                      onChange={(e) => setRenewalStartDate(e.target.value)}
                      className="w-full text-xs py-1.5 px-3 rounded-xl border border-navy-200 bg-white text-navy-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-navy-600 block mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={renewalExpiryDate}
                      onChange={(e) => setRenewalExpiryDate(e.target.value)}
                      className="w-full text-xs py-1.5 px-3 rounded-xl border border-navy-200 bg-white text-navy-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UPI', 'Bank Transfer', 'Cheque', 'Cash'].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setRenewalPaymentMethod(pm)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-semibold transition-all',
                        renewalPaymentMethod === pm
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      )}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setRenewalOpen(false)} className="btn-secondary flex-1 py-2.5 text-xs font-bold rounded-xl border border-navy-200 bg-white text-navy-700 hover:bg-navy-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewing}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Icon name="check-circle" size={16} />
                  {renewing ? 'Processing...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Trainer Payroll & Salary Generation Modal */}
      {payrollModalOpen && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Icon name="credit-card" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-navy-900">Trainer Payroll &amp; Salary Generation</h2>
                  <p className="text-xs text-navy-400 font-medium">Calculate base salary, eSSL biometrics attendance &amp; PT commission payouts</p>
                </div>
              </div>
              <button onClick={() => setPayrollModalOpen(false)} className="text-navy-400 hover:text-navy-600 p-1.5 rounded-xl hover:bg-navy-50">
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-50 p-4 rounded-2xl border border-navy-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-navy-700">Payroll Month:</span>
                <input
                  type="month"
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(e.target.value)}
                  className="bg-white border border-navy-200 text-navy-800 text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAllSalaries}
                  disabled={loadingPayroll}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <Icon name="zap" size={15} />
                  <span>Generate All Salaries ({selectedMonthYear})</span>
                </button>
              </div>
            </div>

            {/* Invoices List / Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-navy-400">Trainer Monthly Payout Statements</h3>

              {loadingPayroll ? (
                <div className="py-12 text-center text-xs font-bold text-navy-400">Loading payroll invoices from PostgreSQL database...</div>
              ) : displayTrainers.length === 0 ? (
                <div className="py-8 text-center text-xs text-navy-400 font-medium">No trainers registered yet.</div>
              ) : (
                <div className="space-y-3">
                  {displayTrainers.map((tr) => {
                    const inv = payrollInvoices.find(
                      (i) => (i.trainer_id === tr.id || i.trainer_name === tr.name) && i.month_year === selectedMonthYear
                    );
                    const isGenerating = generatingSalaryId === tr.id;
                    const baseSal = tr.base_monthly_salary || 0;

                    const [yearStr, monthStr] = selectedMonthYear.split('-');
                    const calcTotalDays = (yearStr && monthStr)
                      ? new Date(Number(yearStr), Number(monthStr), 0).getDate()
                      : 30;

                    const daysPresent = inv ? inv.days_present : 0;
                    const totalDays = inv ? inv.total_days_in_month : calcTotalDays;
                    const earnedBase = inv ? inv.base_salary_earned : (baseSal > 0 ? Math.round((baseSal / totalDays) * daysPresent) : 0);
                    const commission = inv ? inv.commission_earned : (tr.clients * (tr.pt_session_rate || 0));
                    const netSalary = inv ? inv.net_salary : earnedBase + commission;
                    const status = inv ? inv.status : 'NOT GENERATED';

                    return (
                      <div
                        key={tr.id}
                        className="bg-white p-4 rounded-2xl border border-navy-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-navy-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow-xs', tr.avatarBg)}>
                            {tr.initials}
                          </div>
                          <div>
                            <div className="font-bold text-navy-900 text-sm">{tr.name}</div>
                            <div className="text-xs text-navy-400 flex items-center gap-2">
                              <span>{tr.specialization}</span>
                              <span>•</span>
                              <span>Base: ₹{baseSal.toLocaleString('en-IN')}/mo</span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="grid grid-cols-3 gap-3 text-center bg-navy-50/70 p-2.5 rounded-xl border border-navy-100">
                          <div>
                            <div className="text-[10px] text-navy-400 font-semibold">Attendance</div>
                            <div className="text-xs font-bold text-navy-700">{daysPresent}/{totalDays} Days</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-navy-400 font-semibold">Base Earned</div>
                            <div className="text-xs font-bold text-navy-700">₹{earnedBase.toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-navy-400 font-semibold">PT Commission</div>
                            <div className="text-xs font-bold text-emerald-600">+₹{commission.toLocaleString('en-IN')}</div>
                          </div>
                        </div>

                        {/* Net Salary & Action */}
                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-navy-100 pt-3 md:pt-0">
                          <div className="text-left md:text-right">
                            <div className="text-[10px] text-navy-400 font-bold uppercase">Net Payable</div>
                            <div className="text-base font-black text-navy-900">₹{netSalary.toLocaleString('en-IN')}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {status === 'PAID' ? (
                              <Badge variant="success" className="px-3 py-1 text-xs font-bold">
                                ✓ PAID ({inv?.payment_method || 'UPI'})
                              </Badge>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleGenerateSalary(tr.id)}
                                  disabled={isGenerating}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 disabled:opacity-50"
                                >
                                  {isGenerating ? 'Calculating...' : inv ? 'Recalculate' : 'Generate'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (inv) {
                                      setPayingInvoice(inv);
                                    } else {
                                      handleGenerateSalary(tr.id).then(() => {
                                        const newlyCreated: PayrollInvoice = {
                                          id: `py_${tr.id}_${selectedMonthYear}`,
                                          trainer_id: tr.id,
                                          trainer_name: tr.name,
                                          month_year: selectedMonthYear,
                                          days_present: daysPresent,
                                          total_days_in_month: totalDays,
                                          base_monthly_salary: baseSal,
                                          base_salary_earned: earnedBase,
                                          commission_earned: commission,
                                          net_salary: netSalary,
                                          status: 'PENDING',
                                        };
                                        setPayingInvoice(newlyCreated);
                                      });
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
                                >
                                  <Icon name="check-circle" size={14} />
                                  <span>Pay Payout</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-navy-100">
              <button onClick={() => setPayrollModalOpen(false)} className="px-5 py-2 text-xs font-bold rounded-xl border border-navy-200 bg-white text-navy-700 hover:bg-navy-50">
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Salary Payout Execution Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scale-in border border-navy-100">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Icon name="dollar-sign" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy-900">Process Salary Payout</h3>
                  <p className="text-xs text-navy-400">Issue payslip &amp; execute transaction</p>
                </div>
              </div>
              <button onClick={() => setPayingInvoice(null)} className="text-navy-400 hover:text-navy-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="bg-navy-50 p-4 rounded-2xl border border-navy-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-navy-500 font-semibold">Trainer:</span>
                <span className="font-extrabold text-navy-900">{payingInvoice.trainer_name || 'Personal Trainer'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-navy-500 font-semibold">Period:</span>
                <span className="font-bold text-navy-700">{payingInvoice.month_year}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-navy-200">
                <span className="font-extrabold text-navy-900">Net Amount to Pay:</span>
                <span className="text-lg font-black text-emerald-600">₹{payingInvoice.net_salary.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleProcessSalaryPayment} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Payout Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UPI', 'Bank Transfer', 'Cash', 'Cheque'] as const).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPayMethod(pm)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-semibold transition-all',
                        payMethod === pm
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                      )}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1 block">Transaction Reference / UTR (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/12948102948 or NEFT94021"
                  value={txRefInput}
                  onChange={(e) => setTxRefInput(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-navy-200 bg-white text-navy-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setPayingInvoice(null)} className="btn-secondary flex-1 py-2.5 text-xs font-bold rounded-xl border border-navy-200 bg-white text-navy-700 hover:bg-navy-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="btn-primary flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Icon name="check-circle" size={16} />
                  {isProcessingPay ? 'Processing...' : 'Confirm & Issue Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
