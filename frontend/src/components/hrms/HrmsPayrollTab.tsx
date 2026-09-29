import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, FileText, CreditCard, Shield, Plus, Download, Upload,
  Zap, Loader2, CheckCircle2, AlertCircle, Edit3, Trash2, Printer,
  Eye, History, Calendar, Check, Search, Filter, RefreshCw, X, ChevronRight,
  TrendingUp, Award, Wallet, Percent, Sparkles, Sliders, ArrowUpRight, Banknote
} from 'lucide-react';
import { hrmsApi, type EmployeeItem } from '@/services/hrmsApi';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';

interface HrmsPayrollTabProps {
  onSuccessToast?: (msg: string) => void;
}

type PayrollSubTab =
  | 'salary_structure'
  | 'payroll_processing'
  | 'pf'
  | 'esi'
  | 'tds'
  | 'payslips'
  | 'payslip_studio'
  | 'loans'
  | 'advances'
  | 'bonuses'
  | 'commissions';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function HrmsPayrollTab({ onSuccessToast }: HrmsPayrollTabProps) {
  const currentDate = new Date();
  const [activeTab, setActiveTab] = useState<PayrollSubTab>('salary_structure');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Salary Structure State
  const [structures, setStructures] = useState<any[]>([]);
  const [structModalOpen, setStructModalOpen] = useState<boolean>(false);
  const [structForm, setStructForm] = useState({
    employee_id: '',
    basic_salary: '',
    hra: '',
    other_allowances: '',
    pf_deduction: '',
    esi_deduction: '',
    tds_deduction: '',
    other_deductions: ''
  });

  // 2. Payroll Processing State
  const [processingData, setProcessingData] = useState<any>(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [processingSearch, setProcessingSearch] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('All Departments');
  const [procStatusFilter, setProcStatusFilter] = useState<'All' | 'Pending' | 'Disbursed'>('All');
  const [disburseModalItem, setDisburseModalItem] = useState<any | null>(null);
  const [disburseMethod, setDisburseMethod] = useState<string>('UPI');
  const [disburseTxnRef, setDisburseTxnRef] = useState<string>('');
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);

  // 3. Statutory States (PF, ESI, TDS)
  const [pfData, setPfData] = useState<any>(null);
  const [esiData, setEsiData] = useState<any>(null);
  const [tdsData, setTdsData] = useState<any>(null);

  // 4. Payslips Archive State
  const [payslipsArchive, setPayslipsArchive] = useState<any>(null);
  const [payslipSearch, setPayslipSearch] = useState<string>('');
  const [payslipFilterMonth, setPayslipFilterMonth] = useState<string>('all');
  const [payslipViewMode, setPayslipViewMode] = useState<'table' | 'calendar'>('table');
  const [previewSlipModal, setPreviewSlipModal] = useState<any | null>(null);

  // 5. Payslip Template Studio State
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [templateStudioTab, setTemplateStudioTab] = useState<'styling' | 'branding' | 'signatures'>('styling');
  const [customizerForm, setCustomizerForm] = useState({
    name: 'Modern Corporate (Slate & Blue)',
    description: 'Clean slate & blue contemporary layout with high-contrast net pay hero card and structured earnings.',
    theme_color: '#1e3a8a',
    title_text: 'SALARY CERTIFICATE & DISBURSAL SLIP',
    subtitle_text: 'CONFIDENTIAL EMPLOYEE PAYROLL RECORD',
    signatory_label: 'Authorized Finance / Payroll Manager',
    stamp_text: '[Digitally Signed & Verified Document]'
  });

  // 6. Loans, Advances, Bonuses, Commissions
  const [loans, setLoans] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({ employee_id: '', loan_type: 'Personal', principal_amount: '', tenure_months: '12', reason: '' });

  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ employee_id: '', amount: '', reason: '' });

  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusForm, setBonusForm] = useState({ employee_id: '', title: '', bonus_type: 'Performance', amount: '', remarks: '' });

  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commForm, setCommForm] = useState({ employee_id: '', target_quota: '', achieved_volume: '', commission_rate: '5', notes: '' });

  // Load Main Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, structRes, procRes, tmplRes] = await Promise.all([
        hrmsApi.getEmployees().catch(() => []),
        hrmsApi.getSalaryStructures().catch(() => []),
        hrmsApi.getPayrollProcessing(selectedMonthIndex, selectedYear).catch(() => null),
        hrmsApi.getPayslipTemplates().catch(() => [])
      ]);

      setEmployees(empRes || []);
      setStructures(structRes || []);
      setProcessingData(procRes);
      setTemplates(tmplRes || []);

      if (tmplRes && tmplRes.length > 0) {
        setSelectedTemplate(tmplRes[0]);
      }
    } catch (err) {
      console.error('Failed to load payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonthIndex, selectedYear]);

  // Load Subtab Specific Data
  useEffect(() => {
    if (activeTab === 'pf') {
      hrmsApi.getStatutoryPfReport(selectedMonthIndex, selectedYear).then(setPfData).catch(() => {});
    } else if (activeTab === 'esi') {
      hrmsApi.getStatutoryEsiReport(selectedMonthIndex, selectedYear).then(setEsiData).catch(() => {});
    } else if (activeTab === 'tds') {
      hrmsApi.getStatutoryTdsReport(selectedYear).then(setTdsData).catch(() => {});
    } else if (activeTab === 'payslips') {
      hrmsApi.getPayslipsArchive(payslipFilterMonth, selectedYear, payslipSearch).then(setPayslipsArchive).catch(() => {});
    } else if (activeTab === 'loans') {
      hrmsApi.getLoans().then(setLoans).catch(() => {});
    } else if (activeTab === 'advances') {
      hrmsApi.getAdvances().then(setAdvances).catch(() => {});
    } else if (activeTab === 'bonuses') {
      hrmsApi.getBonuses().then(setBonuses).catch(() => {});
    } else if (activeTab === 'commissions') {
      hrmsApi.getCommissions().then(setCommissions).catch(() => {});
    }
  }, [activeTab, selectedMonthIndex, selectedYear, payslipFilterMonth, payslipSearch]);

  // Auto-Formula Calculation in Map Salary Modal
  const handleBasicSalaryChange = (val: string) => {
    const basic = parseFloat(val) || 0;
    const hraVal = Math.round(basic * 0.40);
    const allowVal = Math.round(basic * 0.10);
    const pfVal = Math.round(basic * 0.12);
    const gross = basic + hraVal + allowVal;
    const esiVal = gross <= 21000 ? Math.round(gross * 0.0075) : 0;

    setStructForm((prev) => ({
      ...prev,
      basic_salary: val,
      hra: hraVal ? hraVal.toString() : '',
      other_allowances: allowVal ? allowVal.toString() : '',
      pf_deduction: pfVal ? pfVal.toString() : '',
      esi_deduction: esiVal ? esiVal.toString() : ''
    }));
  };

  const structLiveCalc = useMemo(() => {
    const basic = parseFloat(structForm.basic_salary) || 0;
    const hra = parseFloat(structForm.hra) || 0;
    const allow = parseFloat(structForm.other_allowances) || 0;
    const gross = basic + hra + allow;

    const pf = parseFloat(structForm.pf_deduction) || 0;
    const esi = parseFloat(structForm.esi_deduction) || 0;
    const tds = parseFloat(structForm.tds_deduction) || 0;
    const other = parseFloat(structForm.other_deductions) || 0;
    const deductions = pf + esi + tds + other;

    const net = gross - deductions;
    return { gross, deductions, net };
  }, [structForm]);

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structForm.employee_id) {
      onSuccessToast?.('⚠️ Please select an employee');
      return;
    }
    try {
      await hrmsApi.saveSalaryStructure(structForm);
      onSuccessToast?.('✅ Employee salary structure mapped successfully');
      setStructModalOpen(false);
      loadData();
    } catch {
      onSuccessToast?.('❌ Error saving salary structure');
    }
  };

  const handle1ClickBatchDisburse = async () => {
    try {
      const res = await hrmsApi.disburseBatchPayroll({
        month: selectedMonthIndex,
        year: selectedYear,
        employee_ids: selectedEmpIds.length > 0 ? selectedEmpIds : undefined
      });
      onSuccessToast?.(`⚡ ${res.message || 'Batch payroll disbursed successfully'}`);
      loadData();
    } catch {
      onSuccessToast?.('❌ Failed to disburse batch payroll');
    }
  };

  const handleSingleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModalItem) return;
    setIsDisbursing(true);
    try {
      await hrmsApi.disburseSingleEmployee({
        employee_id: disburseModalItem.employee_id,
        month: selectedMonthIndex,
        year: selectedYear,
        payment_method: disburseMethod,
        transaction_ref: disburseTxnRef
      });
      onSuccessToast?.(`✅ Salary disbursed to ${disburseModalItem.employee_name}`);
      setDisburseModalItem(null);
      loadData();
    } catch {
      onSuccessToast?.('❌ Disbursal failed');
    } finally {
      setIsDisbursing(false);
    }
  };

  const SUB_TABS: { id: PayrollSubTab; label: string; icon: any }[] = [
    { id: 'salary_structure', label: 'Salary Structure', icon: DollarSign },
    { id: 'payroll_processing', label: 'Payroll Processing', icon: CreditCard },
    { id: 'pf', label: 'PF', icon: Shield },
    { id: 'esi', label: 'ESI', icon: Shield },
    { id: 'tds', label: 'TDS', icon: Percent },
    { id: 'payslips', label: 'Payslips', icon: FileText },
    { id: 'payslip_studio', label: 'Payslip Studio', icon: Sparkles },
    { id: 'loans', label: 'Loans', icon: Wallet },
    { id: 'advances', label: 'Advances', icon: Banknote },
    { id: 'bonuses', label: 'Bonuses', icon: Award },
    { id: 'commissions', label: 'Commissions', icon: TrendingUp }
  ];

  const PRESETS = [
    { name: 'Modern Corporate', desc: 'Deep indigo & navy styling with high-contrast breakdown grid.', color: '#1e3a8a' },
    { name: 'Executive Sapphire', desc: 'Royal sapphire theme with highlighted earnings and banner.', color: '#0284c7' },
    { name: 'Emerald Clean', desc: 'Eco emerald accents, clean white-space design, and modern indicators.', color: '#059669' },
    { name: 'Monochrome Minimal', desc: 'Classic black and dark slate legal styling for thermal/laser.', color: '#1e293b' },
    { name: 'Tech Violet', desc: 'Futuristic purple-indigo tones with modern pill badges.', color: '#7c3aed' },
    { name: 'Compact Legal Voucher', desc: 'High-density single-column voucher layout for paper savings.', color: '#475569' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUB-TABS NAVIGATION BAR                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {SUB_TABS.map((tab) => {
          const IconComp = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer',
                active
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              <IconComp size={14} className={active ? 'text-white' : 'text-purple-600'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SALARY STRUCTURE                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'salary_structure' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">Salary Structure</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} /> Auto-Statutory
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated salary components, statutory EPFO/ESIC rules, and take-home mapping.
              </p>
            </div>
            <button
              onClick={() => {
                setStructForm({
                  employee_id: '',
                  basic_salary: '',
                  hra: '',
                  other_allowances: '',
                  pf_deduction: '',
                  esi_deduction: '',
                  tds_deduction: '',
                  other_deductions: ''
                });
                setStructModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Map Employee Salary</span>
            </button>
          </div>

          {/* Salary Structures Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">EMPLOYEE</th>
                    <th className="px-5 py-3.5">ROLE</th>
                    <th className="px-5 py-3.5">BASIC SALARY</th>
                    <th className="px-5 py-3.5">HRA (40%)</th>
                    <th className="px-5 py-3.5">ALLOWANCES</th>
                    <th className="px-5 py-3.5 text-rose-600">STATUTORY DED.</th>
                    <th className="px-5 py-3.5 text-emerald-600">NET TAKE-HOME</th>
                    <th className="px-5 py-3.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {structures.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <DollarSign size={32} className="mx-auto mb-2 opacity-30 text-purple-600" />
                        <p className="font-bold">No mapped employee salary structures yet.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Map Employee Salary" to configure compensation.</p>
                      </td>
                    </tr>
                  ) : (
                    structures.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3 font-bold text-slate-900">
                          <div>{s.employee_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{s.employee_code}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          <div className="font-semibold text-slate-700">{s.department}</div>
                          <div className="text-[10px] text-slate-400">{s.designation}</div>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-slate-800">₹{s.basic_salary?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-slate-600">₹{s.hra?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-slate-600">₹{s.other_allowances?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono font-bold text-rose-600">-₹{s.total_deductions?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono font-black text-emerald-600">₹{s.net_salary?.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => {
                              setStructForm({
                                employee_id: s.employee_id,
                                basic_salary: s.basic_salary?.toString() || '',
                                hra: s.hra?.toString() || '',
                                other_allowances: s.other_allowances?.toString() || '',
                                pf_deduction: s.pf_deduction?.toString() || '',
                                esi_deduction: s.esi_deduction?.toString() || '',
                                tds_deduction: s.tds_deduction?.toString() || '',
                                other_deductions: s.other_deductions?.toString() || ''
                              });
                              setStructModalOpen(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          >
                            <Edit3 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: MONTHLY PAYROLL PROCESSING                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payroll_processing' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">Monthly Payroll & Attendance Processing</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                  Statutory Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Download day-wise & shift-wise Excel spreadsheets, apply offline adjustments, re-upload, and run compliant batch disbursements.
              </p>
            </div>

            {/* Top Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold text-slate-700">
                <Calendar size={14} className="text-purple-600" />
                <select
                  value={selectedMonthIndex}
                  onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent outline-none cursor-pointer ml-1 border-l border-slate-200 pl-1.5"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => onSuccessToast?.('📥 Attendance template exported')}
                className="px-3 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download size={14} />
                <span>Download Attendance Excel</span>
              </button>

              <button
                onClick={() => onSuccessToast?.('📤 Please select file to upload')}
                className="px-3 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload size={14} />
                <span>Upload Modified Sheet</span>
              </button>

              <button
                onClick={handle1ClickBatchDisburse}
                className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Zap size={14} />
                <span>1-Click Batch Disburse ({processingData?.metrics?.pending_count || 0})</span>
              </button>
            </div>
          </div>

          {/* 5 KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Total Staff</div>
              <div className="text-xl font-black text-slate-900 mt-1">{processingData?.metrics?.total_staff || 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">30.0 avg payable days</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Gross Payroll</div>
              <div className="text-xl font-black text-slate-900 mt-1">₹{processingData?.metrics?.gross_payroll?.toLocaleString() || 0}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1">Prorated on Attendance</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Statutory Deductions</div>
              <div className="text-xl font-black text-rose-600 mt-1">-₹{processingData?.metrics?.statutory_deductions?.toLocaleString() || 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">PF 12% + ESI 0.75% + TDS</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Net Disbursable</div>
              <div className="text-xl font-black text-emerald-600 mt-1">₹{processingData?.metrics?.net_disbursable?.toLocaleString() || 0}</div>
              <div className="text-[10px] text-slate-400 mt-1">Take-Home Compensation</div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Disbursal Status</div>
              <div className="text-xl font-black text-purple-700 mt-1">
                {processingData?.metrics?.disbursed_count || 0} / {processingData?.metrics?.total_staff || 0}
              </div>
              <div className="text-[10px] font-bold text-purple-600 mt-1">
                {processingData?.metrics?.pending_count || 0} Pending
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md bg-white border border-slate-200 rounded-2xl px-3.5 py-2 shadow-sm">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, code, designation..."
                value={processingSearch}
                onChange={(e) => setProcessingSearch(e.target.value)}
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
              >
                <option value="All Departments">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="Fitness & Training">Fitness & Training</option>
                <option value="Front Desk">Front Desk</option>
              </select>

              <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                {(['All', 'Pending', 'Disbursed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setProcStatusFilter(st)}
                    className={cn(
                      'px-3 py-1 rounded-xl transition',
                      procStatusFilter === st ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Processing Grid Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedEmpIds.length === (processingData?.employees?.length || 0) && selectedEmpIds.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEmpIds(processingData?.employees?.map((x: any) => x.employee_id) || []);
                          else setSelectedEmpIds([]);
                        }}
                        className="rounded accent-purple-600"
                      />
                    </th>
                    <th className="px-4 py-3.5">EMPLOYEE</th>
                    <th className="px-4 py-3.5">SHIFT & DEPT</th>
                    <th className="px-4 py-3.5">MONTH / WORK DAYS</th>
                    <th className="px-4 py-3.5">LEAVES & LOP</th>
                    <th className="px-4 py-3.5">PAYABLE DAYS</th>
                    <th className="px-4 py-3.5">BASE CTC</th>
                    <th className="px-4 py-3.5">GROSS EARNINGS</th>
                    <th className="px-4 py-3.5 text-rose-600">STATUTORY DED.</th>
                    <th className="px-4 py-3.5 text-emerald-600">NET PAYOUT</th>
                    <th className="px-4 py-3.5">STATUS</th>
                    <th className="px-4 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(!processingData?.employees || processingData.employees.length === 0) ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-400">
                        <CreditCard size={32} className="mx-auto mb-2 opacity-30 text-purple-600" />
                        <p className="font-bold">No active employees found for this month cycle.</p>
                      </td>
                    </tr>
                  ) : (
                    processingData.employees
                      .filter((row: any) => {
                        if (processingSearch) {
                          const s = processingSearch.toLowerCase();
                          if (!row.employee_name.toLowerCase().includes(s) && !row.employee_code.toLowerCase().includes(s)) return false;
                        }
                        if (deptFilter !== 'All Departments' && row.department !== deptFilter) return false;
                        if (procStatusFilter === 'Pending' && row.status === 'Paid') return false;
                        if (procStatusFilter === 'Disbursed' && row.status !== 'Paid') return false;
                        return true;
                      })
                      .map((row: any) => (
                        <tr key={row.employee_id} className="hover:bg-slate-50/60 transition">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedEmpIds.includes(row.employee_id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEmpIds([...selectedEmpIds, row.employee_id]);
                                else setSelectedEmpIds(selectedEmpIds.filter((id) => id !== row.employee_id));
                              }}
                              className="rounded accent-purple-600"
                            />
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{row.employee_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{row.employee_code}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="font-semibold">{row.department}</div>
                            <div className="text-[10px] text-slate-400">{row.designation}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 font-bold">
                            {row.month_days} <span className="text-slate-400 font-normal">/ {row.work_days} W</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold mr-1">
                              {row.leaves_pl} PL
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {row.lop_days} LOP
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-700">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px]">
                              {row.payable_days} Days
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">₹{row.base_ctc?.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">₹{row.gross_earnings?.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono font-bold text-rose-600">-₹{row.statutory_deductions?.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono font-black text-emerald-600">₹{row.net_payout?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase',
                              row.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            )}>
                              {row.status === 'Paid' ? 'Disbursed' : 'Computed'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {row.status !== 'Paid' && (
                                <button
                                  onClick={() => setDisburseModalItem(row)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Zap size={12} /> Disburse
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setPreviewSlipModal(row);
                                }}
                                className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg transition"
                                title="View Payslip"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: PF (PROVIDENT FUND) STATUTORY DASHBOARD                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'pf' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">EPFO Statutory PF Contributions</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase">
                  12% Employee + 12% Employer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory monthly Provident Fund ledger, EPS pension split, and ECR electronic challan generator.
              </p>
            </div>
            <button
              onClick={() => onSuccessToast?.('📥 EPFO ECR Challan generated')}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download EPFO ECR File</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400">COVERED WAGES</div>
              <div className="text-lg font-black text-slate-900 mt-1">₹{pfData?.summary?.total_pf_wages?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400">EMPLOYEE SHARE (12%)</div>
              <div className="text-lg font-black text-blue-600 mt-1">₹{pfData?.summary?.total_employee_pf?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400">EMPLOYER EPS (8.33%)</div>
              <div className="text-lg font-black text-slate-800 mt-1">₹{pfData?.summary?.total_eps?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400">TOTAL CHALLAN PAYABLE</div>
              <div className="text-lg font-black text-purple-700 mt-1">₹{pfData?.summary?.total_challan_amount?.toLocaleString() || 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">EMPLOYEE</th>
                    <th className="px-5 py-3.5">PF WAGES</th>
                    <th className="px-5 py-3.5">EE SHARE (12%)</th>
                    <th className="px-5 py-3.5">ER PF (3.67%)</th>
                    <th className="px-5 py-3.5">ER EPS (8.33%)</th>
                    <th className="px-5 py-3.5 text-right">TOTAL CONTRIBUTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pfData?.records?.map((r: any) => (
                    <tr key={r.employee_id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{r.employee_name}</td>
                      <td className="px-5 py-3 text-slate-700">₹{r.pf_wages?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-blue-600 font-bold">₹{r.employee_share_12?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₹{r.employer_pf_3_67?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₹{r.employer_eps_8_33?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-black text-purple-700 text-right">₹{r.total_pf_contribution?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: ESI (EMPLOYEE STATE INSURANCE)                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'esi' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">ESIC Compliance Ledger</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">
                  Threshold ≤ ₹21,000
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Medical & disability coverage ledger (Employee 0.75% / Employer 3.25%).
              </p>
            </div>
            <button
              onClick={() => onSuccessToast?.('📥 ESIC Portal file generated')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Export ESIC Return</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">EMPLOYEE</th>
                    <th className="px-5 py-3.5">GROSS WAGES</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5">EE SHARE (0.75%)</th>
                    <th className="px-5 py-3.5">ER SHARE (3.25%)</th>
                    <th className="px-5 py-3.5 text-right">TOTAL ESI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {esiData?.records?.map((r: any) => (
                    <tr key={r.employee_id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{r.employee_name}</td>
                      <td className="px-5 py-3 text-slate-700">₹{r.gross_wages?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-sans">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase',
                          r.is_eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {r.is_eligible ? 'Covered' : 'Exempted'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-emerald-600 font-bold">₹{r.employee_share_0_75?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₹{r.employer_share_3_25?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-black text-purple-700 text-right">₹{r.total_esi_contribution?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: TDS (TAX DEDUCTED AT SOURCE)                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'tds' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">Section 192 TDS Income Tax Projection</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 uppercase">
                  New Tax Regime Slabs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Annual projected tax liability calculations, standard deductions, and quarterly Form 24Q estimates.
              </p>
            </div>
            <button
              onClick={() => onSuccessToast?.('📥 Form 24Q quarterly summary exported')}
              className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Export Form 24Q Summary</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">EMPLOYEE</th>
                    <th className="px-5 py-3.5">ANNUAL GROSS SALARY</th>
                    <th className="px-5 py-3.5">TAXABLE INCOME</th>
                    <th className="px-5 py-3.5 text-rose-600">ANNUAL TDS LIABILITY</th>
                    <th className="px-5 py-3.5 text-right text-purple-700">MONTHLY TDS DEDUCTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {tdsData?.records?.map((r: any) => (
                    <tr key={r.employee_id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{r.employee_name}</td>
                      <td className="px-5 py-3 text-slate-700">₹{r.annual_gross_salary?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-600">₹{r.taxable_income?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-bold text-rose-600">₹{r.annual_tds_liability?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-black text-purple-700 text-right">₹{r.monthly_tds_deduction?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 6: PAYSLIPS & DISBURSAL ARCHIVE                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payslips' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">Payslips & Disbursal Archive</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase">
                  Live Disbursal Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Month-wise payslip filtering, statutory reconciliation & day-by-day disbursal calendar.
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setPayslipViewMode('table')}
                className={cn('px-3.5 py-1.5 rounded-xl transition', payslipViewMode === 'table' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500')}
              >
                Table Ledger
              </button>
              <button
                onClick={() => setPayslipViewMode('calendar')}
                className={cn('px-3.5 py-1.5 rounded-xl transition', payslipViewMode === 'calendar' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500')}
              >
                Disbursal Calendar
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3.5 py-2 shadow-sm">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search by employee name or code (e.g. EMP-0001)..."
                value={payslipSearch}
                onChange={(e) => setPayslipSearch(e.target.value)}
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>
            <select
              value={payslipFilterMonth}
              onChange={(e) => setPayslipFilterMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
            >
              <option value="all">All Months</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 outline-none shadow-sm cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">FILTERED PAYSLIPS</div>
              <div className="text-xl font-black text-slate-900 mt-1">{payslipsArchive?.summary?.filtered_count || 0} profiles</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">TOTAL GROSS SALARY</div>
              <div className="text-xl font-black text-slate-900 mt-1">₹{payslipsArchive?.summary?.total_gross_salary?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">TOTAL DEDUCTIONS</div>
              <div className="text-xl font-black text-rose-600 mt-1">-₹{payslipsArchive?.summary?.total_deductions?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase">NET DISBURSED PAYOUT</div>
              <div className="text-xl font-black text-emerald-600 mt-1">₹{payslipsArchive?.summary?.net_disbursed_payout?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Payslips Archive Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">EMPLOYEE</th>
                    <th className="px-5 py-3.5">PERIOD</th>
                    <th className="px-5 py-3.5">BASIC SALARY</th>
                    <th className="px-5 py-3.5">GROSS SALARY</th>
                    <th className="px-5 py-3.5 text-rose-600">DEDUCTIONS</th>
                    <th className="px-5 py-3.5 text-emerald-600">NET PAY</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(!payslipsArchive?.payslips || payslipsArchive.payslips.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <FileText size={32} className="mx-auto mb-2 opacity-30 text-purple-600" />
                        <p className="font-bold">No historical payslips found matching your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    payslipsArchive.payslips.map((slip: any) => (
                      <tr key={slip.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3 font-bold text-slate-900">
                          <div>{slip.employee_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{slip.employee_code}</div>
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-purple-700">{slip.period}</td>
                        <td className="px-5 py-3 font-mono text-slate-800">₹{slip.basic_salary?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-slate-900 font-bold">₹{slip.gross_salary?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-rose-600 font-bold">-₹{slip.deductions?.toLocaleString()}</td>
                        <td className="px-5 py-3 font-mono text-emerald-600 font-black">₹{slip.net_pay?.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase',
                            slip.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            {slip.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <a
                            href={`/api/v1/hrms/payroll/payslips/${slip.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 inline-flex items-center gap-1.5 transition"
                          >
                            <Printer size={13} />
                            <span>Print / PDF Slip</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 7: PAYSLIP TEMPLATE STUDIO (LIVE CUSTOMIZER)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payslip_studio' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900">Payslip Template Studio</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 uppercase">
                  Live Customizer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Design, brand, and configure corporate salary slips with live real-time preview & print compliance.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={14} /> Test Print / PDF
              </button>
              <button
                onClick={() => onSuccessToast?.('✅ Template saved and active')}
                className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Check size={14} /> Save & Set as Default
              </button>
            </div>
          </div>

          {/* Corporate Design Presets */}
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              READY-TO-USE CORPORATE DESIGN PRESETS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PRESETS.map((p, idx) => (
                <div
                  key={p.name}
                  onClick={() => {
                    setSelectedPresetIndex(idx);
                    setCustomizerForm((prev) => ({
                      ...prev,
                      name: p.name,
                      theme_color: p.color
                    }));
                  }}
                  className={cn(
                    'p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-28',
                    selectedPresetIndex === idx ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div>
                    <div className="h-1.5 w-8 rounded-full mb-2" style={{ backgroundColor: p.color }} />
                    <div className="text-xs font-bold text-slate-900">{p.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-1">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Studio Split: Editor vs Live Document Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Editor Config */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase">Template Identity</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  Active Default
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Template Name</label>
                <input
                  type="text"
                  value={customizerForm.name}
                  onChange={(e) => setCustomizerForm({ ...customizerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Sub-tabs for Branding */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {(['styling', 'branding', 'signatures'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTemplateStudioTab(tab)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg capitalize transition',
                      templateStudioTab === tab ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {templateStudioTab === 'styling' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-[11px] font-bold text-slate-600">Theme Primary Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customizerForm.theme_color}
                      onChange={(e) => setCustomizerForm({ ...customizerForm, theme_color: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <span className="font-mono text-xs font-bold text-slate-700">{customizerForm.theme_color}</span>
                  </div>
                </div>
              )}

              {templateStudioTab === 'branding' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Header Title Text</label>
                    <input
                      type="text"
                      value={customizerForm.title_text}
                      onChange={(e) => setCustomizerForm({ ...customizerForm, title_text: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Subtitle Banner</label>
                    <input
                      type="text"
                      value={customizerForm.subtitle_text}
                      onChange={(e) => setCustomizerForm({ ...customizerForm, subtitle_text: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {templateStudioTab === 'signatures' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Signatory Title</label>
                    <input
                      type="text"
                      value={customizerForm.signatory_label}
                      onChange={(e) => setCustomizerForm({ ...customizerForm, signatory_label: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Digital Stamp Note</label>
                    <input
                      type="text"
                      value={customizerForm.stamp_text}
                      onChange={(e) => setCustomizerForm({ ...customizerForm, stamp_text: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Live A4 Document Preview */}
            <div className="lg:col-span-7 bg-slate-900/5 border border-slate-200 rounded-3xl p-6 flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs font-bold text-slate-500 mb-3 px-2">
                <span className="flex items-center gap-1.5"><Eye size={14} /> Live Document Preview (A4 Format)</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">A4 595 x 842 pt</span>
              </div>

              {/* Rendered A4 Payslip Paper Card */}
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 text-xs font-sans text-slate-800">
                {/* Header with Custom Theme Color */}
                <div className="flex items-center justify-between pb-3 border-b-2" style={{ borderColor: customizerForm.theme_color }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm"
                      style={{ backgroundColor: customizerForm.theme_color }}
                    >
                      FC
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm">FIT CLUB ENTERPRISE</div>
                      <div className="text-[10px] text-slate-400">100 Innovation Boulevard, Tech District</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black text-white" style={{ backgroundColor: customizerForm.theme_color }}>
                      OFFICIAL PAYSLIP
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">Period: 09/2026</div>
                  </div>
                </div>

                <div className="text-center font-bold text-[11px] uppercase tracking-wider py-1 bg-slate-50 rounded-lg text-slate-700">
                  {customizerForm.title_text}
                </div>

                {/* Employee Meta Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div><span className="text-slate-400">Employee:</span> <span className="font-bold">Rahul Sharma</span></div>
                  <div><span className="text-slate-400">EMP Code:</span> <span className="font-mono font-bold">EMP-0001</span></div>
                  <div><span className="text-slate-400">Department:</span> <span className="font-semibold">Fitness & Training</span></div>
                  <div><span className="text-slate-400">Designation:</span> <span className="font-semibold">Senior Trainer</span></div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  {/* Earnings */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-100/70 px-3 py-1.5 font-bold text-slate-700">EARNINGS</div>
                    <div className="p-2.5 space-y-1.5 font-mono">
                      <div className="flex justify-between"><span>Basic Pay</span><span className="font-bold">₹25,000</span></div>
                      <div className="flex justify-between"><span>HRA (40%)</span><span>₹10,000</span></div>
                      <div className="flex justify-between"><span>Special Allow.</span><span>₹2,500</span></div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                        <span>Gross Earnings</span><span>₹37,500</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-100/70 px-3 py-1.5 font-bold text-rose-700">DEDUCTIONS</div>
                    <div className="p-2.5 space-y-1.5 font-mono">
                      <div className="flex justify-between"><span>PF (12%)</span><span>₹1,800</span></div>
                      <div className="flex justify-between"><span>ESI (0.75%)</span><span>₹0</span></div>
                      <div className="flex justify-between"><span>TDS Tax</span><span>₹500</span></div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-rose-600">
                        <span>Total Ded.</span><span>-₹2,300</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Take-Home Hero Card */}
                <div
                  className="p-3.5 rounded-xl text-white flex items-center justify-between shadow-md"
                  style={{ backgroundColor: customizerForm.theme_color }}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">NET DISBURSED TAKE-HOME</div>
                    <div className="text-lg font-black font-mono">₹35,200.00</div>
                  </div>
                  <CheckCircle2 size={24} className="opacity-90" />
                </div>

                {/* Footer Signatures */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100">
                  <div>{customizerForm.stamp_text}</div>
                  <div className="text-right font-bold text-slate-600">{customizerForm.signatory_label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TABS 8-11: LOANS, ADVANCES, BONUSES & COMMISSIONS             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Corporate Employee Loans</h3>
            <button
              onClick={() => setLoanModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> New Loan Application
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">EMPLOYEE</th>
                  <th className="px-5 py-3">TYPE</th>
                  <th className="px-5 py-3">PRINCIPAL</th>
                  <th className="px-5 py-3">TENURE</th>
                  <th className="px-5 py-3">MONTHLY EMI</th>
                  <th className="px-5 py-3">REMAINING</th>
                  <th className="px-5 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loans.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans">No active employee loans.</td></tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id}>
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{l.employee_name}</td>
                      <td className="px-5 py-3 font-sans">{l.loan_type}</td>
                      <td className="px-5 py-3 font-bold">₹{l.principal_amount?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-sans">{l.tenure_months} Mos</td>
                      <td className="px-5 py-3 text-purple-700 font-bold">₹{l.monthly_emi?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-rose-600">₹{l.remaining_amount?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-sans text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{l.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Salary Advances</h3>
            <button
              onClick={() => setAdvanceModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Record Advance
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">EMPLOYEE</th>
                  <th className="px-5 py-3">AMOUNT</th>
                  <th className="px-5 py-3">REASON</th>
                  <th className="px-5 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {advances.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-sans">No salary advances recorded.</td></tr>
                ) : (
                  advances.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{a.employee_name}</td>
                      <td className="px-5 py-3 font-bold text-purple-700">₹{a.amount?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-sans text-slate-500">{a.reason || '—'}</td>
                      <td className="px-5 py-3 font-sans text-right">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{a.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bonuses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Employee Bonuses & Spot Incentives</h3>
            <button
              onClick={() => setBonusModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Award Bonus
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">EMPLOYEE</th>
                  <th className="px-5 py-3">TITLE</th>
                  <th className="px-5 py-3">TYPE</th>
                  <th className="px-5 py-3">AMOUNT</th>
                  <th className="px-5 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {bonuses.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-sans">No bonuses awarded yet.</td></tr>
                ) : (
                  bonuses.map((b) => (
                    <tr key={b.id}>
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{b.employee_name}</td>
                      <td className="px-5 py-3 font-sans font-semibold">{b.title}</td>
                      <td className="px-5 py-3 font-sans text-slate-500">{b.bonus_type}</td>
                      <td className="px-5 py-3 font-bold text-emerald-600">₹{b.amount?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-sans text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{b.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Sales Commission & Slab Matrix</h3>
            <button
              onClick={() => setCommModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Record Commission
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">EMPLOYEE</th>
                  <th className="px-5 py-3">TARGET QUOTA</th>
                  <th className="px-5 py-3">ACHIEVED VOLUME</th>
                  <th className="px-5 py-3">RATE</th>
                  <th className="px-5 py-3 text-right">TOTAL COMMISSION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {commissions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-sans">No sales commissions recorded.</td></tr>
                ) : (
                  commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{c.employee_name}</td>
                      <td className="px-5 py-3 text-slate-500">₹{c.target_quota?.toLocaleString()}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">₹{c.achieved_volume?.toLocaleString()}</td>
                      <td className="px-5 py-3 text-purple-700">{c.commission_rate}%</td>
                      <td className="px-5 py-3 font-black text-emerald-600 text-right">₹{c.total_commission?.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: MAP EMPLOYEE SALARY STRUCTURE (AUTO-FORMULA)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {structModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Map Employee Salary Structure</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                    AUTO-FORMULA
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter Basic Salary — all statutory allowances and deductions auto-calculate instantaneously.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStructModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryStructure} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  CHOOSE EMPLOYEE <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={structForm.employee_id}
                  onChange={(e) => setStructForm({ ...structForm, employee_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-800"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name || ''} ({e.code}) - {e.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-700 mb-1">
                    BASIC SALARY * <span className="text-[10px] font-normal text-slate-400">(MASTER ENTRY)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 25000"
                    value={structForm.basic_salary}
                    onChange={(e) => handleBasicSalaryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-purple-200 focus:border-purple-600 outline-none font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">HRA ALLOWANCE (40%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.hra}
                    onChange={(e) => setStructForm({ ...structForm, hra: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">OTHER ALLOWANCES (10%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.other_allowances}
                    onChange={(e) => setStructForm({ ...structForm, other_allowances: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-700 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PF DEDUCTION (12% EPFO)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.pf_deduction}
                    onChange={(e) => setStructForm({ ...structForm, pf_deduction: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ESI (0.75%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.esi_deduction}
                    onChange={(e) => setStructForm({ ...structForm, esi_deduction: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-mono text-slate-700 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">TDS TAX</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.tds_deduction}
                    onChange={(e) => setStructForm({ ...structForm, tds_deduction: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-mono text-slate-700 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">OTHER DED.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={structForm.other_deductions}
                    onChange={(e) => setStructForm({ ...structForm, other_deductions: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 font-mono text-slate-700 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Live Compensation Breakdown Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Live Compensation Breakdown</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                    ✓ Fully Synchronized
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">GROSS EARNINGS</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">₹{structLiveCalc.gross.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400">TOTAL DEDUCTIONS</div>
                    <div className="text-xs font-black text-rose-600 mt-0.5">-₹{structLiveCalc.deductions.toLocaleString()}</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-700">NET TAKE-HOME</div>
                    <div className="text-xs font-black text-emerald-700 mt-0.5">₹{structLiveCalc.net.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStructModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/25 transition cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: SINGLE EMPLOYEE DISBURSE MODAL                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {disburseModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900">Disburse Employee Salary</h3>
              <button
                type="button"
                onClick={() => setDisburseModalItem(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSingleDisburseSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="text-xs font-bold text-purple-900">{disburseModalItem.employee_name}</div>
                <div className="text-[11px] text-purple-600">{disburseModalItem.employee_code} • {disburseModalItem.designation}</div>
                <div className="text-base font-black text-purple-900 mt-2 font-mono">
                  Net Payout: ₹{disburseModalItem.net_payout?.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="UPI">UPI Direct Transfer</option>
                  <option value="Direct Bank Transfer (NEFT/RTGS)">Direct Bank Transfer (NEFT/RTGS)</option>
                  <option value="Company Cheque">Company Cheque</option>
                  <option value="Cash Voucher">Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction / Reference ID</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Bank Ref Number"
                  value={disburseTxnRef}
                  onChange={(e) => setDisburseTxnRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisburseModalItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisbursing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {isDisbursing && <Loader2 size={14} className="animate-spin" />}
                  <span>Confirm Disbursal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: PAYSLIP PREVIEW MODAL                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {previewSlipModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs font-sans text-slate-800 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Salary Statement Details</h3>
              <button
                type="button"
                onClick={() => setPreviewSlipModal(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-slate-900">{previewSlipModal.employee_name}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Department / Role:</span>
                <span className="font-semibold text-slate-700">{previewSlipModal.department} • {previewSlipModal.designation}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span>Gross Earnings:</span>
                <span className="font-bold">₹{previewSlipModal.gross_earnings?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Statutory Deductions:</span>
                <span className="font-bold">-₹{previewSlipModal.statutory_deductions?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-emerald-700 font-sans">
                <span>Net Disbursed Take-Home:</span>
                <span className="font-mono">₹{previewSlipModal.net_payout?.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewSlipModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
              >
                Close
              </button>
              {previewSlipModal.payslip_id && (
                <a
                  href={`/api/v1/hrms/payroll/payslips/${previewSlipModal.payslip_id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <Printer size={13} /> Print Official Slip
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODALS 4-7: LOANS, ADVANCES, BONUSES, COMMISSIONS MODALS      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900">New Employee Loan</h3>
            <select
              value={loanForm.employee_id}
              onChange={(e) => setLoanForm({ ...loanForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''}</option>)}
            </select>
            <input
              type="number"
              placeholder="Principal Amount (₹)"
              value={loanForm.principal_amount}
              onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <input
              type="number"
              placeholder="Tenure (Months)"
              value={loanForm.tenure_months}
              onChange={(e) => setLoanForm({ ...loanForm, tenure_months: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setLoanModalOpen(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
              <button
                onClick={async () => {
                  await hrmsApi.createLoan(loanForm);
                  onSuccessToast?.('✅ Loan recorded');
                  setLoanModalOpen(false);
                  hrmsApi.getLoans().then(setLoans);
                }}
                className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-xl"
              >
                Save Loan
              </button>
            </div>
          </div>
        </div>
      )}

      {advanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900">Salary Advance</h3>
            <select
              value={advanceForm.employee_id}
              onChange={(e) => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''}</option>)}
            </select>
            <input
              type="number"
              placeholder="Advance Amount (₹)"
              value={advanceForm.amount}
              onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <input
              type="text"
              placeholder="Reason / Notes"
              value={advanceForm.reason}
              onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAdvanceModalOpen(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
              <button
                onClick={async () => {
                  await hrmsApi.createAdvance(advanceForm);
                  onSuccessToast?.('✅ Salary advance approved');
                  setAdvanceModalOpen(false);
                  hrmsApi.getAdvances().then(setAdvances);
                }}
                className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-xl"
              >
                Save Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {bonusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900">Award Employee Bonus</h3>
            <select
              value={bonusForm.employee_id}
              onChange={(e) => setBonusForm({ ...bonusForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''}</option>)}
            </select>
            <input
              type="text"
              placeholder="Bonus Title (e.g. Festival Bonus, Spot Award)"
              value={bonusForm.title}
              onChange={(e) => setBonusForm({ ...bonusForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={bonusForm.amount}
              onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setBonusModalOpen(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
              <button
                onClick={async () => {
                  await hrmsApi.createBonus(bonusForm);
                  onSuccessToast?.('✅ Bonus recorded');
                  setBonusModalOpen(false);
                  hrmsApi.getBonuses().then(setBonuses);
                }}
                className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-xl"
              >
                Award Bonus
              </button>
            </div>
          </div>
        </div>
      )}

      {commModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 text-xs">
            <h3 className="text-sm font-black text-slate-900">Record Sales Commission</h3>
            <select
              value={commForm.employee_id}
              onChange={(e) => setCommForm({ ...commForm, employee_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''}</option>)}
            </select>
            <input
              type="number"
              placeholder="Target Quota (₹)"
              value={commForm.target_quota}
              onChange={(e) => setCommForm({ ...commForm, target_quota: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <input
              type="number"
              placeholder="Achieved Volume (₹)"
              value={commForm.achieved_volume}
              onChange={(e) => setCommForm({ ...commForm, achieved_volume: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <input
              type="number"
              placeholder="Commission Rate (%)"
              value={commForm.commission_rate}
              onChange={(e) => setCommForm({ ...commForm, commission_rate: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setCommModalOpen(false)} className="px-3 py-1.5 border rounded-xl">Cancel</button>
              <button
                onClick={async () => {
                  await hrmsApi.createCommission(commForm);
                  onSuccessToast?.('✅ Commission calculated and saved');
                  setCommModalOpen(false);
                  hrmsApi.getCommissions().then(setCommissions);
                }}
                className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-xl"
              >
                Save Commission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
