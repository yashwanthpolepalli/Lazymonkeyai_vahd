import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { hrmsApi, DepartmentItem, DesignationItem } from '@/services/hrmsApi';
import { masterDataApi } from '@/services/masterDataApi';
import { cn } from '@/utils/cn';

export interface EmployeeEnrollmentModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  employeeToEdit?: any;
}

interface WorkExperienceRow {
  duration: string;
  company: string;
  designation: string;
  lastSalary: string;
  reasonForLeaving: string;
}

interface LanguageRow {
  language: string;
  read: boolean;
  write: boolean;
  speak: boolean;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CASTE_OPTIONS = [
  { value: 'OC', label: 'OC / General' },
  { value: 'BC-A', label: 'BC-A' },
  { value: 'BC-B', label: 'BC-B' },
  { value: 'BC-C', label: 'BC-C' },
  { value: 'BC-D', label: 'BC-D' },
  { value: 'BC-E', label: 'BC-E' },
  { value: 'SC', label: 'SC (Scheduled Caste)' },
  { value: 'ST', label: 'ST (Scheduled Tribe)' },
  { value: 'EWS', label: 'EWS (Economically Weaker Section)' },
  { value: 'Other', label: 'Other' },
];

const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Unmarried', 'Divorced', 'Widowed', 'Separated'];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const DEFAULT_EMPLOYEE_ROLES = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'FACULTY', label: 'Faculty / Teacher' },
  { value: 'employee', label: 'employee / Coach' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'EMPLOYEE', label: 'Employee' },
];
const EMPLOYEE_ROLES = DEFAULT_EMPLOYEE_ROLES;

const getOrgBranchLabel = (b: any) => {
  const orgName = (b.vahd_name || b.organisation || '').trim();
  const bName = (b.branch_name || b.name || '').trim();
  if (orgName && bName && orgName.toLowerCase() !== bName.toLowerCase()) {
    return `${orgName} (${bName})${b.city ? ` - ${b.city}` : ''}`;
  }
  return orgName || bName || 'Main Organisation';
};

export function EmployeeEnrollmentModal({
  isOpen,
  open,
  onClose,
  onSuccess,
  employeeToEdit,
}: EmployeeEnrollmentModalProps) {
  const visible = isOpen ?? open ?? false;

  // Header & HR Info
  const [employeeCode, setEmployeeCode] = useState('');

  // Section 1: Employee Details
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [areaOfService, setAreaOfService] = useState('');
  const [caste, setCaste] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [religion, setReligion] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [maritalStatus, setMaritalStatus] = useState<string>('');
  const [workExperienceYears, setWorkExperienceYears] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');

  // Section 2: Emergency Contact Details
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyAddress, setEmergencyAddress] = useState('');
  const [emergencyContactNo, setEmergencyContactNo] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');

  // Section 3: Post Details
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [jobDesignation, setJobDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [companyId, setCompanyId] = useState('');
  const [employeeRole, setEmployeeRole] = useState('STAFF');
  const [employeeStatus, setEmployeeStatus] = useState<'Active' | 'Inactive'>('Active');
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [baseSalary, setBaseSalary] = useState('');

  // Section 4: Bank Details
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankBranchCity, setBankBranchCity] = useState('');
  const [bankAccountType, setBankAccountType] = useState('Savings');
  const [ifscCode, setIfscCode] = useState('');
  const [panNo, setPanNo] = useState('');

  // Section 5: Work Experience Details Table
  const [experienceRows, setExperienceRows] = useState<WorkExperienceRow[]>([
    { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' },
    { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' },
    { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' }
  ]);

  // Section 6: Reference Contact Details
  const [refName, setRefName] = useState('');
  const [refCompany, setRefCompany] = useState('');
  const [refAddress, setRefAddress] = useState('');
  const [refPost, setRefPost] = useState('');
  const [refTelephone, setRefTelephone] = useState('');
  const [refContactNo, setRefContactNo] = useState('');

  // Section 7: Language Understanding
  const [languageList, setLanguageList] = useState<LanguageRow[]>([
    { language: 'English', read: false, write: false, speak: false },
    { language: 'Telugu', read: false, write: false, speak: false },
    { language: 'Hindi', read: false, write: false, speak: false },
  ]);
  const [newLanguageInput, setNewLanguageInput] = useState('');
  const [showAddLang, setShowAddLang] = useState(false);

  // Photo & Camera
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Active Navigation Tab & Form Helpers
  const [activeTab, setActiveTab] = useState<'personal' | 'emergency' | 'post' | 'bank' | 'experience' | 'language' | 'all'>('personal');
  const [sameAsPresent, setSameAsPresent] = useState(false);

  // Status & Submit
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Departments and Designations from HRMS (stored and managed live in DB)
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [designationsList, setDesignationsList] = useState<DesignationItem[]>([]);
  const [branchesList, setBranchesList] = useState<Array<{ id: string; branch_name: string; name?: string; vahd_name?: string; city?: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedSecondaryBranches, setSelectedSecondaryBranches] = useState<string[]>([]);
  const [showSecondaryDropdown, setShowSecondaryDropdown] = useState(false);
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('');
  const secondaryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Technical Skills from DB Master Data
  const [dynamicSkillsList, setDynamicSkillsList] = useState<Array<{ id: string; name: string; code?: string; extra_info?: string; description?: string }>>([]);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [customSkillInput, setCustomSkillInput] = useState('');
  const skillsDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (secondaryDropdownRef.current && !secondaryDropdownRef.current.contains(event.target as Node)) {
        setShowSecondaryDropdown(false);
      }
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target as Node)) {
        setShowSkillsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSkillsArray = useMemo(() => {
    return technicalSkills ? technicalSkills.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }, [technicalSkills]);

  const toggleSkill = (skillName: string) => {
    const current = selectedSkillsArray;
    let next: string[];
    if (current.includes(skillName)) {
      next = current.filter((s) => s !== skillName);
    } else {
      next = [...current, skillName];
    }
    setTechnicalSkills(next.join(', '));
  };

  const removeSkill = (skillName: string) => {
    const next = selectedSkillsArray.filter((s) => s !== skillName);
    setTechnicalSkills(next.join(', '));
  };

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (!selectedSkillsArray.includes(trimmed)) {
      const next = [...selectedSkillsArray, trimmed];
      setTechnicalSkills(next.join(', '));
    }
    setCustomSkillInput('');
  };

  // Dynamic Master Data options (Gender, Blood Groups, Caste, Roles, Locations, Service Areas)
  const [dynamicBloodGroups, setDynamicBloodGroups] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3') || localStorage.getItem('vahd_master_data_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.blood_groups) && parsed.blood_groups.length > 0) {
          return parsed.blood_groups.filter((b: any) => b.is_active !== false).map((b: any) => b.name);
        }
      }
    } catch { }
    return BLOOD_GROUPS;
  });

  const [dynamicCastes, setDynamicCastes] = useState<Array<{ value: string; label: string }>>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3') || localStorage.getItem('vahd_master_data_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.castes) && parsed.castes.length > 0) {
          return parsed.castes.filter((c: any) => c.is_active !== false).map((c: any) => ({
            value: c.code || c.name,
            label: c.name,
          }));
        }
      }
    } catch { }
    return CASTE_OPTIONS;
  });

  const [dynamicGenders, setDynamicGenders] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3') || localStorage.getItem('vahd_master_data_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.gender_types) && parsed.gender_types.length > 0) {
          return parsed.gender_types.filter((g: any) => g.is_active !== false).map((g: any) => g.name);
        }
      }
    } catch { }
    return GENDER_OPTIONS;
  });

  const [dynamicRoles, setDynamicRoles] = useState<Array<{ value: string; label: string }>>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3') || localStorage.getItem('vahd_master_data_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.roles) && parsed.roles.length > 0) {
          const activeRoles = parsed.roles.filter((r: any) => r.is_active !== false);
          if (activeRoles.length > 0) {
            return activeRoles.map((r: any) => ({
              value: (r.code || r.name).toUpperCase().replace(/\s+/g, '_'),
              label: r.name,
            }));
          }
        }
      }
    } catch { }
    return DEFAULT_EMPLOYEE_ROLES;
  });

  const [masterDistricts, setMasterDistricts] = useState<string[]>([]);
  const [masterMandals, setMasterMandals] = useState<string[]>([]);
  const [masterTowns, setMasterTowns] = useState<string[]>([]);
  const [masterAreaOfServiceList, setMasterAreaOfServiceList] = useState<string[]>([]);

  // Synchronize departments, designations, branches, roles, and master lookup values
  const syncAllMasterAndApiData = async () => {
    try {
      let parsed: Record<string, any> = {};
      try {
        const stored = localStorage.getItem('vahd_master_data_v3') || localStorage.getItem('vahd_master_data_v2');
        if (stored) parsed = JSON.parse(stored);
      } catch { }

      // Fetch fresh master data from backend DB
      const apiMaster = await masterDataApi.getAll().catch(() => null);
      if (apiMaster && typeof apiMaster === 'object') {
        parsed = { ...parsed, ...apiMaster };
      }

      // 1. Roles
      if (Array.isArray(parsed.roles)) {
        const activeRoles = parsed.roles.filter((r: any) => r.is_active !== false);
        if (activeRoles.length > 0) {
          setDynamicRoles(activeRoles.map((r: any) => ({
            value: (r.code || r.name).toUpperCase().replace(/\s+/g, '_'),
            label: r.name,
          })));
        } else {
          setDynamicRoles(DEFAULT_EMPLOYEE_ROLES);
        }
      }

      // 2. Blood Groups, Castes, Genders
      if (Array.isArray(parsed.blood_groups) && parsed.blood_groups.length > 0) {
        setDynamicBloodGroups(parsed.blood_groups.filter((b: any) => b.is_active !== false).map((b: any) => b.name));
      }
      if (Array.isArray(parsed.castes) && parsed.castes.length > 0) {
        setDynamicCastes(parsed.castes.filter((c: any) => c.is_active !== false).map((c: any) => ({
          value: c.code || c.name,
          label: c.name,
        })));
      }
      if (Array.isArray(parsed.gender_types) && parsed.gender_types.length > 0) {
        setDynamicGenders(parsed.gender_types.filter((g: any) => g.is_active !== false).map((g: any) => g.name));
      }

      // 3. Districts, Mandals, Towns
      if (Array.isArray(parsed.districts)) {
        setMasterDistricts(parsed.districts.filter((d: any) => d.is_active !== false).map((d: any) => d.name));
      }
      if (Array.isArray(parsed.mandals)) {
        setMasterMandals(parsed.mandals.filter((m: any) => m.is_active !== false).map((m: any) => m.name));
      }
      if (Array.isArray(parsed.towns)) {
        setMasterTowns(parsed.towns.filter((t: any) => t.is_active !== false).map((t: any) => t.name));
      }

      // 4. Area of Service (Specializations + Posting Types)
      const serviceOptions: string[] = [];
      if (Array.isArray(parsed.specializations)) {
        parsed.specializations.filter((s: any) => s.is_active !== false).forEach((s: any) => {
          if (s.name && !serviceOptions.includes(s.name)) serviceOptions.push(s.name);
        });
      }
      if (Array.isArray(parsed.posting_types)) {
        parsed.posting_types.filter((p: any) => p.is_active !== false).forEach((p: any) => {
          if (p.name && !serviceOptions.includes(p.name)) serviceOptions.push(p.name);
        });
      }
      if (serviceOptions.length > 0) {
        setMasterAreaOfServiceList(serviceOptions);
      }

      // Technical Skills from Master Data (Filtered for Employee or Shared Both)
      if (Array.isArray(parsed.technical_skills)) {
        const empSkills = parsed.technical_skills.filter((s: any) => {
          if (s.is_active === false) return false;
          const extra = (s.extra_info || '').toLowerCase().trim();
          return extra === 'employee' || extra === 'both' || !extra || extra === 'all';
        });
        setDynamicSkillsList(empSkills);
      }

      // 5. Departments (HRMS API + Settings masterStore) - Filtered specifically for Employee / Staff View
      const isEmployeeDept = (d: any) => {
        if (typeof d === 'object' && d) {
          const extra = (d.extra_info || d.department_type || '').toLowerCase().trim();
          if (extra === 'student' || extra === 'students' || extra === 'academic') return false;
          if (extra === 'employee' || extra === 'staff' || extra === 'both' || extra === 'all') return true;
        }
        return true;
      };

      hrmsApi.getDepartments().then((data) => {
        const apiDepts = Array.isArray(data) ? data.filter((d: any) => isEmployeeDept(d)) : [];
        const existingNames = new Set(apiDepts.map((d: any) => d.name.toLowerCase()));
        const merged = [...apiDepts];
        if (Array.isArray(parsed.departments)) {
          parsed.departments.filter((d: any) => d.is_active !== false && isEmployeeDept(d)).forEach((md: any) => {
            if (!existingNames.has(md.name.toLowerCase())) {
              existingNames.add(md.name.toLowerCase());
              merged.push({
                id: md.id || `dept_${md.name}`,
                name: md.name,
                code: md.code || '',
                description: md.description || md.extra_info || '',
                head_name: md.head_name || '',
                employee_count: md.employee_count || 0,
                is_active: true,
              });
            }
          });
        }
        setDepartmentsList(merged);
      }).catch(() => {
        if (Array.isArray(parsed.departments)) {
          setDepartmentsList(parsed.departments.filter((d: any) => d.is_active !== false && isEmployeeDept(d)).map((md: any) => ({
            id: md.id || `dept_${md.name}`,
            name: md.name,
            code: md.code || '',
            description: md.description || '',
            head_name: md.head_name || '',
            employee_count: md.employee_count || 0,
            is_active: true,
          })));
        }
      });

      // 6. Designations (HRMS API + Settings masterStore)
      hrmsApi.getDesignations().then((data) => {
        const apiDesgs = Array.isArray(data) ? data : [];
        const existingTitles = new Set(apiDesgs.map((d: any) => d.title.toLowerCase()));
        const merged = [...apiDesgs];
        if (Array.isArray(parsed.designations)) {
          parsed.designations.filter((d: any) => d.is_active !== false).forEach((md: any) => {
            if (!existingTitles.has(md.name.toLowerCase())) {
              existingTitles.add(md.name.toLowerCase());
              merged.push({
                id: md.id || `desg_${md.name}`,
                title: md.name,
                department: md.parent_name || 'ALL',
                level: md.level ? String(md.level) : '',
                description: md.description || md.extra_info || '',
                employee_count: md.employee_count || 0,
              });
            }
          });
        }
        setDesignationsList(merged);
      }).catch(() => {
        if (Array.isArray(parsed.designations)) {
          setDesignationsList(parsed.designations.filter((d: any) => d.is_active !== false).map((md: any) => ({
            id: md.id || `desg_${md.name}`,
            title: md.name,
            department: md.parent_name || 'ALL',
            level: md.level ? String(md.level) : '',
            description: md.description || '',
            employee_count: md.employee_count || 0,
          })));
        }
      });

      // 7. Branches & Institutions (API + institution_types + place_of_working)
      const hoRes = await apiClient.get<any>('/ho/organizations').catch(() => null);
      let list: any[] = [];
      if (hoRes?.organizations && Array.isArray(hoRes.organizations) && hoRes.organizations.length > 0) {
        list = hoRes.organizations;
      } else {
        const branchRes = await apiClient.get<any[]>('/vahd/branches').catch(() => []);
        if (Array.isArray(branchRes)) list = branchRes;
      }

      const existingBranchNames = new Set(list.map((b) => (b.branch_name || b.name || b.vahd_name || '').toLowerCase()));
      const extraInstitutions: any[] = [];
      const addMasterInstitutions = (items: any[], typeLabel: string) => {
        if (Array.isArray(items)) {
          items.filter((it: any) => it.is_active !== false).forEach((it: any) => {
            const name = (it.name || '').trim();
            if (name && !existingBranchNames.has(name.toLowerCase())) {
              existingBranchNames.add(name.toLowerCase());
              extraInstitutions.push({
                id: it.id || `inst_${name}`,
                branch_name: name,
                name: name,
                vahd_name: it.parent_name || typeLabel,
                city: it.extra_info || '',
              });
            }
          });
        }
      };

      addMasterInstitutions(parsed.institution_types, 'Institution');
      addMasterInstitutions(parsed.place_of_working, 'Place of Working');

      const allBranches = [...list, ...extraInstitutions];
      setBranchesList(allBranches);

      if (allBranches.length > 0) {
        const activeOrgId = localStorage.getItem('vahd_selected_org_id');
        const matchedActive = activeOrgId && activeOrgId !== 'all' ? allBranches.find((b) => b.id === activeOrgId) : null;
        const target = matchedActive || (employeeToEdit ? allBranches.find((b) => b.id === (employeeToEdit.branch_id || employeeToEdit.meta_data?.branch_id)) : null) || allBranches[0];

        if (target && !selectedBranchId) {
          setSelectedBranchId(target.id);
          if (!location) setLocation(getOrgBranchLabel(target));
        }
      }
    } catch { }
  };

  useEffect(() => {
    syncAllMasterAndApiData();
    window.addEventListener('vahd_master_data_updated', syncAllMasterAndApiData);
    return () => window.removeEventListener('vahd_master_data_updated', syncAllMasterAndApiData);
  }, []);

  useEffect(() => {
    if (visible) {
      syncAllMasterAndApiData();
    }
  }, [visible]);

  // Populate or Reset data
  useEffect(() => {
    if (!visible) return;

    if (employeeToEdit) {
      const meta = employeeToEdit.meta_data || {};
      setEmployeeCode(employeeToEdit.code || meta.employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setName(employeeToEdit.full_name || employeeToEdit.name || `${employeeToEdit.first_name || ''} ${employeeToEdit.last_name || ''}`.trim());
      setFatherName(meta.father_name || '');
      setDob(meta.dob || '');
      setAge(meta.age ? String(meta.age) : '');
      setAreaOfService(meta.area_of_service || employeeToEdit.specialization || '');
      setCaste(meta.caste || '');
      setBloodGroup(meta.blood_group || '');
      setReligion(meta.religion || '');
      setGender(employeeToEdit.gender?.toLowerCase() === 'female' ? 'Female' : (employeeToEdit.gender?.toLowerCase() === 'male' ? 'Male' : ''));
      setMaritalStatus(meta.marital_status || 'Single');
      setWorkExperienceYears(meta.work_experience_years || '');
      setContactNo(employeeToEdit.phone || '');
      setPersonalEmail(employeeToEdit.email || '');
      setPresentAddress(meta.present_address || employeeToEdit.address || '');
      setPermanentAddress(meta.permanent_address || '');

      const emerg = meta.emergency_details || {};
      setEmergencyName(emerg.name || '');
      setEmergencyRelationship(emerg.relationship || '');
      setEmergencyAddress(emerg.address || '');
      setEmergencyContactNo(emerg.contact_no || '');
      setEmergencyNote(emerg.note || '');

      const post = meta.post_details || {};
      setLocation(post.location || employeeToEdit.vahd_branch || employeeToEdit.primary_vahd_location || '');
      setDepartment(post.department || employeeToEdit.department || '');
      setJobDesignation(post.designation || employeeToEdit.designation || employeeToEdit.role || '');
      setJoiningDate(post.joining_date || employeeToEdit.joined_date || new Date().toISOString().split('T')[0]);
      setCompanyId(post.company_id || '');
      setEmployeeRole(employeeToEdit.role || meta.role || meta.employee_role || post.role || 'STAFF');
      if (employeeToEdit.branch_id || meta.branch_id) {
        setSelectedBranchId(employeeToEdit.branch_id || meta.branch_id);
      }
      const rawSecondary = (employeeToEdit as any).secondary_branches || meta.secondary_branches || post.secondary_branches || [];
      setSelectedSecondaryBranches(Array.isArray(rawSecondary) ? rawSecondary : []);
      setShowSecondaryDropdown(false);
      setSecondarySearchQuery('');
      setTechnicalSkills(post.technical_skills || (Array.isArray(employeeToEdit.skills) ? employeeToEdit.skills.join(', ') : ''));
      setBaseSalary(employeeToEdit.salary ? String(employeeToEdit.salary) : (employeeToEdit.base_monthly_salary ? String(employeeToEdit.base_monthly_salary) : ''));
      const rawStatus = employeeToEdit.status || (employeeToEdit.is_active === false ? 'Inactive' : 'Active');
      setEmployeeStatus(rawStatus.toLowerCase() === 'inactive' ? 'Inactive' : 'Active');

      const bank = meta.bank_details || {};
      setAccountHolderName(bank.account_holder_name || '');
      setBankName(bank.bank_name || '');
      setAccountNumber(bank.account_number || employeeToEdit.bank_account_no || '');
      setBankBranchCity(bank.branch_city || '');
      setBankAccountType(bank.account_type || 'Savings');
      setIfscCode(bank.ifsc_code || employeeToEdit.bank_ifsc || '');
      setPanNo(bank.pan_no || '');

      if (meta.work_experience_history && Array.isArray(meta.work_experience_history) && meta.work_experience_history.length > 0) {
        setExperienceRows(meta.work_experience_history);
      } else {
        setExperienceRows([
          { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' },
          { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' }
        ]);
      }

      const ref = meta.reference_contact || {};
      setRefName(ref.name || '');
      setRefCompany(ref.company || '');
      setRefAddress(ref.address || '');
      setRefPost(ref.post || '');
      setRefTelephone(ref.telephone || '');
      setRefContactNo(ref.contact_no || '');

      if (meta.language_list && Array.isArray(meta.language_list)) {
        setLanguageList(meta.language_list);
      }

      setPhotoBase64(employeeToEdit.avatar || employeeToEdit.face_image || null);
    } else {
      // Reset form for fresh entry
      setEmployeeCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
      setName('');
      setFatherName('');
      setDob('');
      setAge('');
      setAreaOfService('');
      setCaste('');
      setBloodGroup('');
      setReligion('');
      setGender('');
      setMaritalStatus('');
      setWorkExperienceYears('');
      setContactNo('');
      setPersonalEmail('');
      setPresentAddress('');
      setPermanentAddress('');
      setEmergencyName('');
      setEmergencyRelationship('');
      setEmergencyAddress('');
      setEmergencyContactNo('');
      setEmergencyNote('');
      setLocation('');
      setSelectedSecondaryBranches([]);
      setShowSecondaryDropdown(false);
      setSecondarySearchQuery('');
      setDepartment('');
      setJobDesignation('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setCompanyId('');
      setEmployeeRole('STAFF');
      setEmployeeStatus('Active');
      setTechnicalSkills('');
      setBaseSalary('');
      setAccountHolderName('');
      setBankName('');
      setAccountNumber('');
      setBankBranchCity('');
      setBankAccountType('Savings');
      setIfscCode('');
      setPanNo('');
      setExperienceRows([
        { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' },
        { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' },
        { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' }
      ]);
      setRefName('');
      setRefCompany('');
      setRefAddress('');
      setRefPost('');
      setRefTelephone('');
      setRefContactNo('');
      setLanguageList([
        { language: 'English', read: false, write: false, speak: false },
        { language: 'Telugu', read: false, write: false, speak: false },
        { language: 'Hindi', read: false, write: false, speak: false },
      ]);
      setPhotoBase64(null);
    }
    setActiveTab('personal');
    setSameAsPresent(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [visible, employeeToEdit]);

  const handleDobChange = (val: string) => {
    setDob(val);
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge > 0 && calculatedAge < 120) {
        setAge(String(calculatedAge));
      }
    }
  };

  const addExperienceRow = () => {
    setExperienceRows([
      ...experienceRows,
      { duration: '', company: '', designation: '', lastSalary: '', reasonForLeaving: '' }
    ]);
  };

  const removeExperienceRow = (idx: number) => {
    if (experienceRows.length <= 1) return;
    setExperienceRows(experienceRows.filter((_, i) => i !== idx));
  };

  const updateExperienceRow = (idx: number, field: keyof WorkExperienceRow, value: string) => {
    const updated = [...experienceRows];
    updated[idx][field] = value;
    setExperienceRows(updated);
  };

  const toggleLanguageSkill = (idx: number, skill: 'read' | 'write' | 'speak') => {
    setLanguageList((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [skill]: !copy[idx][skill] };
      return copy;
    });
  };

  const addCustomLanguage = () => {
    if (!newLanguageInput.trim()) return;
    setLanguageList([...languageList, { language: newLanguageInput.trim(), read: false, write: false, speak: false }]);
    setNewLanguageInput('');
    setShowAddLang(false);
  };

  const removeLanguage = (idx: number) => {
    setLanguageList(languageList.filter((_, i) => i !== idx));
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch {
      setErrorMsg('Camera access denied or not available. Please upload an image file.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 400;
    canvas.height = videoRef.current.videoHeight || 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPhotoBase64(dataUrl);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Precision A4 Multi-Color Print Generator
  const handlePrint = () => {
    const safeVal = (v?: string | null) => (v && v.trim() ? v.trim() : '—');
    const checkedIcon = (checked: boolean) =>
      checked
        ? `<span style="display:inline-block;width:13px;height:13px;background-color:#1d4ed8;color:#ffffff;border-radius:2px;font-size:10px;line-height:13px;text-align:center;font-weight:bold;margin-right:4px;">✓</span>`
        : `<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #64748b;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Personal Details Form - ${name || employeeCode || 'Employee'}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm 7mm 5mm 7mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size: 10px;
              line-height: 1.25;
            }
            .form-wrapper {
              width: 100%;
              border: 2px solid #1e3a8a;
              border-radius: 4px;
              overflow: hidden;
            }
            .form-header {
              text-align: center;
              padding: 6px 4px 4px 4px;
              border-bottom: 2px solid #1e3a8a;
              background: #ffffff;
            }
            .form-header h1 {
              margin: 0;
              font-size: 16px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #1e3a8a;
              text-transform: uppercase;
            }
            .form-header span {
              font-size: 9px;
              font-weight: 700;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-bar {
              padding: 3px 8px;
              font-weight: 900;
              font-size: 9.5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #ffffff !important;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .table-grid {
              width: 100%;
              border-collapse: collapse;
            }
            .table-grid td, .table-grid th {
              padding: 3.5px 6px;
              border: 1px solid #cbd5e1;
              vertical-align: middle;
            }
            .label {
              font-weight: 800;
              color: #0f172a;
              font-size: 9.5px;
            }
            .val {
              color: #0f172a;
              font-weight: 600;
              font-size: 10px;
            }
            .val-bold {
              color: #1e3a8a;
              font-weight: 800;
            }
            .photo-box {
              width: 105px;
              height: 125px;
              border: 1.5px dashed #2563eb;
              background-color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              margin: 0 auto;
              border-radius: 4px;
              overflow: hidden;
            }
            .photo-box img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          <div class="form-wrapper">
            
            <!-- Form Title -->
            <div class="form-header">
              <h1>PERSONAL DETAILS FORM</h1>
              <span>Official Staff Record & Biometric KYC Dossier</span>
            </div>

            <!-- Top HR Section & Photo Container -->
            <table class="table-grid" style="border: none; border-bottom: 2px solid #1e3a8a;">
              <tr>
                <td style="width: 78%; padding: 0; vertical-align: top; border: none; border-right: 2px solid #1e3a8a;">
                  
                  <table class="table-grid" style="border: none;">
                    <tr>
                      <td style="width: 50%; background-color: #e0f2fe; border: none; border-bottom: 1.5px solid #1e3a8a; border-right: 1.5px solid #1e3a8a;">
                        <span style="font-weight: 900; font-size: 11px; color: #0369a1; text-transform: uppercase;">TO BE COMPLETED BY HR</span>
                      </td>
                      <td style="width: 50%; background-color: #eef2ff; border: none; border-bottom: 1.5px solid #1e3a8a;">
                        <span class="label" style="color: #3730a3;">Employee Code: </span>
                        <span class="val-bold" style="font-size: 11px; color: #4338ca;">${safeVal(employeeCode)}</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Section 1: EMPLOYEE DETAILS HEADER -->
                  <div class="section-bar" style="background: linear-gradient(90deg, #1d4ed8, #3b82f6) !important; background-color: #1d4ed8 !important;">
                    <span>EMPLOYEE DETAILS</span>
                    <span style="font-size: 8.5px; opacity: 0.9;">Section 1</span>
                  </div>

                  <table class="table-grid" style="border: none;">
                    <tr style="background-color: #f8fafc;">
                      <td style="width: 50%; border-top: none; border-left: none;">
                        <span class="label">Name: </span>
                        <span class="val" style="font-weight: 800;">${safeVal(name)}</span>
                      </td>
                      <td style="width: 50%; border-top: none; border-right: none;">
                        <span class="label">Father Name: </span>
                        <span class="val">${safeVal(fatherName)}</span>
                      </td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="border-left: none;">
                        <span class="label">Date of Birth: </span>
                        <span class="val">${safeVal(dob)}</span>
                      </td>
                      <td style="border-right: none;">
                        <span class="label">Age: </span>
                        <span class="val-bold">${safeVal(age)}</span>
                      </td>
                    </tr>
                    <tr style="background-color: #f8fafc;">
                      <td style="border-left: none; border-bottom: none;">
                        <span class="label">Area of service: </span>
                        <span class="val">${safeVal(areaOfService)}</span>
                      </td>
                      <td style="border-right: none; border-bottom: none;">
                        <span class="label">Caste: </span>
                        <span class="val">${safeVal(caste)}</span>
                      </td>
                    </tr>
                  </table>

                </td>

                <!-- Photo Box on Right Column -->
                <td style="width: 22%; text-align: center; vertical-align: middle; background-color: #f0f9ff; border: none; padding: 4px;">
                  <div class="photo-box">
                    ${photoBase64
        ? `<img src="${photoBase64}" alt="Passport Photo" />`
        : `<span style="font-weight:900; font-size:12px; color:#94a3b8; letter-spacing:1px;">PHOTO</span><span style="font-size:8px; color:#94a3b8; margin-top:2px;">Passport Size</span>`
      }
                  </div>
                </td>
              </tr>
            </table>

            <!-- Employee Details Continued (Full Width) -->
            <table class="table-grid" style="border: none; border-bottom: 2px solid #1e3a8a;">
              <tr style="background-color: #ffffff;">
                <td style="width: 50%; border-top: none; border-left: none;">
                  <span class="label">Blood Group: </span>
                  <span class="val-bold" style="color: #b91c1c;">${safeVal(bloodGroup)}</span>
                </td>
                <td style="width: 50%; border-top: none; border-right: none;">
                  <span class="label">Religion: </span>
                  <span class="val">${safeVal(religion)}</span>
                </td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="border-left: none;">
                  <span class="label">Gender: </span>
                  <span style="margin-left: 6px; font-weight: 600;">
                    ${checkedIcon(gender === 'Male')} Male
                    &nbsp;&nbsp;
                    ${checkedIcon(gender === 'Female')} Female
                    &nbsp;&nbsp;
                    ${checkedIcon(gender === 'Other')} Other
                  </span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Marital Status: </span>
                  <span style="margin-left: 4px; font-size: 9px; font-weight: 600;">
                    ${checkedIcon(maritalStatus === 'Married')} Married &nbsp;
                    ${checkedIcon(maritalStatus === 'Single' || maritalStatus === 'Unmarried')} Single &nbsp;
                    ${checkedIcon(maritalStatus === 'Separated')} Separated &nbsp;
                    ${checkedIcon(maritalStatus === 'Divorced')} Divorced &nbsp;
                    ${checkedIcon(maritalStatus === 'Widowed')} Widowed
                  </span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td colspan="2" style="border-left: none; border-right: none;">
                  <span class="label">Work Experience: </span>
                  <span class="val">${safeVal(workExperienceYears)}</span>
                </td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="border-left: none;">
                  <span class="label">Contact No: </span>
                  <span class="val-bold" style="color: #1d4ed8;">${safeVal(contactNo)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Personal Email ID: </span>
                  <span class="val">${safeVal(personalEmail)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="border-left: none; border-bottom: none; vertical-align: top; height: 38px;">
                  <span class="label" style="display: block; margin-bottom: 2px;">Present Address:</span>
                  <span class="val" style="font-size: 9px; line-height: 1.2;">${safeVal(presentAddress)}</span>
                </td>
                <td style="border-right: none; border-bottom: none; vertical-align: top; height: 38px;">
                  <span class="label" style="display: block; margin-bottom: 2px;">Permanent Address:</span>
                  <span class="val" style="font-size: 9px; line-height: 1.2;">${safeVal(permanentAddress)}</span>
                </td>
              </tr>
            </table>

            <!-- Section 2: EMERGENCY CONTACT DETAILS -->
            <div class="section-bar" style="background: linear-gradient(90deg, #d97706, #ea580c) !important; background-color: #d97706 !important;">
              <span>EMERGENCY CONTACT DETAILS</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 2</span>
            </div>
            <table class="table-grid" style="border: none; border-bottom: 2px solid #d97706;">
              <tr style="background-color: #fffbeb;">
                <td style="width: 50%; border-top: none; border-left: none;">
                  <span class="label">Full Name: </span>
                  <span class="val">${safeVal(emergencyName)}</span>
                </td>
                <td style="width: 50%; border-top: none; border-right: none;">
                  <span class="label">Relationship: </span>
                  <span class="val">${safeVal(emergencyRelationship)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="border-left: none;">
                  <span class="label">Address: </span>
                  <span class="val">${safeVal(emergencyAddress)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Contact No: </span>
                  <span class="val-bold" style="color: #b45309;">${safeVal(emergencyContactNo)}</span>
                </td>
              </tr>
              <tr style="background-color: #fffbeb;">
                <td colspan="2" style="border-left: none; border-right: none; border-bottom: none;">
                  <span class="label">Note: </span>
                  <span class="val">${safeVal(emergencyNote)}</span>
                </td>
              </tr>
            </table>

            <!-- Section 3: POST DETAILS -->
            <div class="section-bar" style="background: linear-gradient(90deg, #7e22ce, #9333ea) !important; background-color: #7e22ce !important;">
              <span>POST DETAILS</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 3</span>
            </div>
            <table class="table-grid" style="border: none; border-bottom: 2px solid #7e22ce;">
              <tr style="background-color: #faf5ff;">
                <td style="width: 50%; border-top: none; border-left: none;">
                  <span class="label">Location: </span>
                  <span class="val">${safeVal(location)}</span>
                </td>
                <td style="width: 50%; border-top: none; border-right: none;">
                  <span class="label">Department: </span>
                  <span class="val">${safeVal(department)}</span>
                </td>
              </tr>
              ${selectedSecondaryBranches.length > 0 ? `
              <tr style="background-color: #ffffff;">
                <td colspan="2" style="border-left: none; border-right: none;">
                  <span class="label">Secondary Organisation(s): </span>
                  <span class="val" style="color: #6b21a8; font-weight: 600;">${safeVal(selectedSecondaryBranches.join(', '))}</span>
                </td>
              </tr>
              ` : ''}
              <tr style="background-color: #ffffff;">
                <td style="border-left: none;">
                  <span class="label">Job Designation: </span>
                  <span class="val-bold" style="color: #6b21a8;">${safeVal(jobDesignation)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Joining Date: </span>
                  <span class="val">${safeVal(joiningDate)}</span>
                </td>
              </tr>
              <tr style="background-color: #faf5ff;">
                <td style="border-left: none;">
                  <span class="label">Company ID: </span>
                  <span class="val">${safeVal(companyId)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Role: </span>
                  <span class="val-bold" style="color: #6b21a8;">${safeVal(employeeRole)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="border-left: none; border-bottom: none;">
                  <span class="label">Technical Skills: </span>
                  <span class="val">${safeVal(technicalSkills)}</span>
                </td>
                <td style="border-right: none; border-bottom: none;">
                  <span class="label">Monthly Salary (₹): </span>
                  <span class="val-bold" style="color: #047857;">${safeVal(baseSalary ? `₹ ${Number(baseSalary).toLocaleString('en-IN')}` : '')}</span>
                </td>
              </tr>
            </table>

            <!-- Section 4: BANK DETAILS -->
            <div class="section-bar" style="background: linear-gradient(90deg, #047857, #059669) !important; background-color: #047857 !important;">
              <span>BANK DETAILS - Please ensure that you have a completed and SIGNED form</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 4</span>
            </div>
            <table class="table-grid" style="border: none; border-bottom: 2px solid #047857;">
              <tr style="background-color: #f0fdf4;">
                <td colspan="2" style="border-top: none; border-left: none; border-right: none;">
                  <span class="label">Account Holders Name: </span>
                  <span class="val" style="font-weight: 800;">${safeVal(accountHolderName)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="width: 50%; border-left: none;">
                  <span class="label">Name of Bank: </span>
                  <span class="val">${safeVal(bankName)}</span>
                </td>
                <td style="width: 50%; border-right: none;">
                  <span class="label">Account Number: </span>
                  <span class="val-bold" style="font-family: monospace; color: #065f46;">${safeVal(accountNumber)}</span>
                </td>
              </tr>
              <tr style="background-color: #f0fdf4;">
                <td style="border-left: none;">
                  <span class="label">Branch(City): </span>
                  <span class="val">${safeVal(bankBranchCity)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Bank Account Type: </span>
                  <span class="val">${safeVal(bankAccountType)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="border-left: none; border-bottom: none;">
                  <span class="label">Branch Code (IFSC) No: </span>
                  <span class="val-bold" style="font-family: monospace;">${safeVal(ifscCode)}</span>
                </td>
                <td style="border-right: none; border-bottom: none;">
                  <span class="label">Pan No: </span>
                  <span class="val-bold" style="font-family: monospace; color: #047857;">${safeVal(panNo)}</span>
                </td>
              </tr>
            </table>

            <!-- Section 5: WORK EXPERIENCE DETAILS -->
            <div class="section-bar" style="background: linear-gradient(90deg, #0e7490, #0891b2) !important; background-color: #0e7490 !important;">
              <span>WORK EXPERIENCE DETAILS</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 5</span>
            </div>
            <table class="table-grid" style="border: none; border-bottom: 2px solid #0e7490;">
              <thead>
                <tr style="background-color: #ecfeff; font-weight: 900; color: #164e63; font-size: 8.5px;">
                  <th style="border-top: none; border-left: none; width: 22%;">DURATION<br/><span style="font-weight: normal; font-size: 7.5px;">(month-year) to (month-year)</span></th>
                  <th style="border-top: none; width: 28%;">COMPANY<br/><span style="font-weight: normal; font-size: 7.5px;">(name & place)</span></th>
                  <th style="border-top: none; width: 18%;">DESIG-NATION<br/><span style="font-weight: normal; font-size: 7.5px;">(last)</span></th>
                  <th style="border-top: none; width: 14%;">LAST GROSS SALARY</th>
                  <th style="border-top: none; border-right: none; width: 18%;">REASONS FOR LEAVING</th>
                </tr>
              </thead>
              <tbody>
                ${experienceRows
        .map(
          (row, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f0fdfa'};">
                    <td style="border-left: none; font-size: 9px;">${safeVal(row.duration)}</td>
                    <td style="font-weight: 600; font-size: 9px;">${safeVal(row.company)}</td>
                    <td style="font-size: 9px;">${safeVal(row.designation)}</td>
                    <td style="font-weight: 700; color: #0f766e; font-size: 9px;">${safeVal(row.lastSalary)}</td>
                    <td style="border-right: none; font-size: 9px;">${safeVal(row.reasonForLeaving)}</td>
                  </tr>`
        )
        .join('')}
              </tbody>
            </table>

            <!-- Section 6: REFERENCE CONTACT DETAILS -->
            <div class="section-bar" style="background: linear-gradient(90deg, #be123c, #e11d48) !important; background-color: #be123c !important;">
              <span>REFERENCE CONTACT DETAILS</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 6</span>
            </div>
            <table class="table-grid" style="border: none; border-bottom: 2px solid #be123c;">
              <tr style="background-color: #fff1f2;">
                <td style="width: 50%; border-top: none; border-left: none;">
                  <span class="label">Name: </span>
                  <span class="val">${safeVal(refName)}</span>
                </td>
                <td style="width: 50%; border-top: none; border-right: none;">
                  <span class="label">Company: </span>
                  <span class="val">${safeVal(refCompany)}</span>
                </td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="border-left: none;">
                  <span class="label">Address: </span>
                  <span class="val">${safeVal(refAddress)}</span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Post: </span>
                  <span class="val">${safeVal(refPost)}</span>
                </td>
              </tr>
              <tr style="background-color: #fff1f2;">
                <td style="border-left: none; border-bottom: none;">
                  <span class="label">Telephone Number: </span>
                  <span class="val">${safeVal(refTelephone)}</span>
                </td>
                <td style="border-right: none; border-bottom: none;">
                  <span class="label">Contact No: </span>
                  <span class="val-bold" style="color: #be123c;">${safeVal(refContactNo)}</span>
                </td>
              </tr>
            </table>

            <!-- Section 7: UNDERSTANDING OF LANGUAGE -->
            <div class="section-bar" style="background: linear-gradient(90deg, #3730a3, #4338ca) !important; background-color: #3730a3 !important;">
              <span>UNDERSTANDING OF LANGUAGE</span>
              <span style="font-size: 8.5px; opacity: 0.9;">Section 7</span>
            </div>
            <table class="table-grid" style="border: none;">
              <thead>
                <tr style="background-color: #eef2ff; font-weight: 900; color: #312e81; font-size: 8.5px;">
                  <th style="border-top: none; border-left: none; text-align: left; width: 40%; padding-left: 10px;">LANGUANGE</th>
                  <th style="border-top: none; width: 20%; text-align: center;">READ</th>
                  <th style="border-top: none; width: 20%; text-align: center;">WRITE</th>
                  <th style="border-top: none; border-right: none; width: 20%; text-align: center;">SPEAK</th>
                </tr>
              </thead>
              <tbody>
                ${languageList
        .map(
          (item, idx) => `
                  <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f5f3ff'};">
                    <td style="border-left: none; font-weight: 800; padding-left: 10px; color: #1e1b4b;">${item.language}</td>
                    <td style="text-align: center;">${checkedIcon(item.read)}</td>
                    <td style="text-align: center;">${checkedIcon(item.write)}</td>
                    <td style="border-right: none; text-align: center;">${checkedIcon(item.speak)}</td>
                  </tr>`
        )
        .join('')}
              </tbody>
            </table>

          </div>

          <!-- Bottom Footer Signatures -->
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 4px;">
            <div style="text-align: left; font-size: 8.5px; color: #64748b;">
              <div>Date of Verification: _______________________</div>
              <div style="margin-top: 2px;">HR Verified By: _____________________________</div>
            </div>
            <div style="text-align: right; font-size: 8.5px; color: #64748b;">
              <div style="border-top: 1px solid #94a3b8; width: 140px; padding-top: 3px; text-align: center; font-weight: bold; color: #0f172a;">
                Employee Signature
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                if (window.frameElement && window.frameElement.parentNode) {
                  window.frameElement.parentNode.removeChild(window.frameElement);
                }
              }, 1200);
            };
          </script>
        </body>
      </html>
    `;

    // Create an isolated iframe for clean document printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Employee Name is required.');
      return;
    }
    if (!contactNo.trim()) {
      setErrorMsg('Contact Number is required.');
      return;
    }
    if (!personalEmail.trim()) {
      setErrorMsg('Personal Email ID is required.');
      return;
    }
    // Permissive email check — accept any format including legacy emails like karnisujata@21@gmail.com
    const emailVal = personalEmail.trim();
    if (!emailVal || !emailVal.includes('@') || emailVal.length < 3) {
      setErrorMsg('Please enter a valid Email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const names = name.trim().split(' ');
    const firstName = names[0] || name.trim();
    const lastName = names.slice(1).join(' ') || '';
    const safeEmail = personalEmail.trim().toLowerCase();

    const payload = {
      code: employeeCode,
      first_name: firstName,
      last_name: lastName,
      full_name: name.trim(),
      email: safeEmail,
      phone: contactNo.trim(),
      gender: gender ? gender.toLowerCase() : '',
      designation: jobDesignation ? jobDesignation.trim() : '',
      department: department ? department.trim() : '',
      salary: parseFloat(baseSalary || '0') || 0,
      vahd_branch: location,
      branch_id: selectedBranchId || undefined,
      secondary_branches: selectedSecondaryBranches,
      joined_date: joiningDate,
      avatar: photoBase64 || undefined,
      face_image: photoBase64 || undefined,
      address: presentAddress || permanentAddress,
      emergency_contact: emergencyContactNo ? `${emergencyName} (${emergencyRelationship}): ${emergencyContactNo}` : undefined,
      skills: technicalSkills ? technicalSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      role: employeeRole || 'STAFF',
      status: employeeStatus,
      is_active: employeeStatus === 'Active',
      meta_data: {
        form_title: 'PERSONAL DETAILS FORM',
        employee_code: employeeCode,
        secondary_branches: selectedSecondaryBranches,
        father_name: fatherName,
        dob,
        age,
        area_of_service: areaOfService,
        caste,
        blood_group: bloodGroup,
        religion,
        gender,
        marital_status: maritalStatus,
        work_experience_years: workExperienceYears,
        present_address: presentAddress,
        permanent_address: permanentAddress,
        emergency_details: {
          name: emergencyName,
          relationship: emergencyRelationship,
          address: emergencyAddress,
          contact_no: emergencyContactNo,
          note: emergencyNote,
        },
        post_details: {
          location,
          secondary_branches: selectedSecondaryBranches,
          department,
          designation: jobDesignation,
          joining_date: joiningDate,
          company_id: companyId,
          role: employeeRole || 'STAFF',
          technical_skills: technicalSkills,
        },
        bank_details: {
          account_holder_name: accountHolderName,
          bank_name: bankName,
          account_number: accountNumber,
          branch_city: bankBranchCity,
          account_type: bankAccountType,
          ifsc_code: ifscCode,
          pan_no: panNo,
        },
        work_experience_history: experienceRows.filter((r) => r.company.trim() || r.designation.trim() || r.duration.trim()),
        reference_contact: {
          name: refName,
          company: refCompany,
          address: refAddress,
          post: refPost,
          telephone: refTelephone,
          contact_no: refContactNo,
        },
        language_list: languageList,
        enrolled_at: new Date().toISOString(),
      }
    };

    try {
      if (employeeToEdit?.id) {
        // Update existing
        try {
          await apiClient.put(`/hrms/employees/${employeeToEdit.id}`, payload);
        } catch {
          await apiClient.put(`/employees/${employeeToEdit.id.replace('emp_', '')}`, payload);
        }
      } else {
        // Create new
        try {
          await apiClient.post('/hrms/employees', payload);
        } catch {
          await apiClient.post('/employees', {
            full_name: payload.full_name,
            email: payload.email,
            phone: payload.phone,
            role: payload.role || 'EMPLOYEE',
            specialization: payload.designation,
            base_monthly_salary: payload.salary,
            primary_vahd_location: payload.vahd_branch,
            branch_id: payload.branch_id,
            bank_account_no: accountNumber,
            bank_ifsc: ifscCode,
          });
        }
      }

      setSuccessMsg('Employee registered successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to save employee details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const TABS = [
    { id: 'personal', label: '1. Personal & KYC', icon: 'user' },
    { id: 'emergency', label: '2. Emergency', icon: 'phone-call' },
    { id: 'post', label: '3. Post & Role', icon: 'briefcase' },
    { id: 'bank', label: '4. Bank & Payroll', icon: 'credit-card' },
    { id: 'experience', label: '5. Experience & Ref', icon: 'history' },
    { id: 'language', label: '6. Languages', icon: 'globe' },
    { id: 'all', label: 'All Sections', icon: 'layers' },
  ] as const;

  const tabOrder = ['personal', 'emergency', 'post', 'bank', 'experience', 'language'] as const;
  const currentTabIndex = tabOrder.indexOf(activeTab as any);

  const goToPrevTab = () => {
    if (currentTabIndex > 0) setActiveTab(tabOrder[currentTabIndex - 1]);
  };

  const goToNextTab = () => {
    if (currentTabIndex < tabOrder.length - 1) setActiveTab(tabOrder[currentTabIndex + 1]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static animate-fade-in employee-modal-overlay">

      {/* Dynamic Print CSS for Page Isolation */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body > *:not(.employee-modal-overlay) {
            display: none !important;
          }
          #root {
            display: none !important;
          }
          .employee-modal-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .employee-modal-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            max-height: none !important;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* Camera Live Modal Overlay */}
      {cameraActive && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Icon name="camera" size={16} />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Take Passport Photo</h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/40 m-6 rounded-2xl" />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="camera" size={14} />
                <span>Capture Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal Dialog Window */}
      <div className="bg-white text-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 employee-modal-card animate-scale-in">

        {/* ── Top Header ───────────────── */}
        <div className="bg-white px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name={employeeToEdit ? 'user-check' : 'user-plus'} size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  {employeeToEdit ? 'Edit Employee Dossier' : 'Employee Registration & Dossier'}
                </h2>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                  KYC Form
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Official personal records, post details, KYC &amp; biometric setup
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Print Official Form (Isolated A4)"
            >
              <Icon name="printer" size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Print Form</span>
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs Bar ───────────────── */}
        <div className="bg-slate-50/80 border-b border-slate-100 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 no-print">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100/70'
                )}
              >
                <Icon name={tab.icon as any} size={13} className={isActive ? 'text-white' : 'text-purple-600'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Scrollable Form Body ───────────────── */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#FAFBFD]/60 print:p-0 print:overflow-visible">

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs no-print">
              <Icon name="alert-circle" size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs no-print">
              <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: PERSONAL & KYC DETAILS                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'personal' || activeTab === 'all') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                    <Icon name="user" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Personal Details &amp; KYC</h3>
                    <p className="text-xs text-slate-400 font-medium">Section 1 · Official staff identification &amp; KYC record</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-purple-50/70 border border-purple-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  <span className="text-[11px] font-bold text-purple-900 whitespace-nowrap">Employee Code:</span>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                    placeholder="EMP-001"
                    className="bg-transparent font-black font-mono text-xs text-purple-700 outline-none uppercase w-24"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-5">
                {/* Form Fields Column */}
                <div className="col-span-12 lg:col-span-9 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name *</label>
                      <div className="relative">
                        <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full Name (Required)"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Father Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Father Name</label>
                      <div className="relative">
                        <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          placeholder="Father's Name"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Date of Birth</label>
                      <div className="relative">
                        <Icon name="calendar" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => handleDobChange(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Age */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Age (Years)</label>
                      <div className="relative">
                        <Icon name="clock" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Age"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Gender</label>
                      <div className="relative">
                        <Icon name="users" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                        >
                          <option value="">Select Gender</option>
                          {dynamicGenders.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Blood Group */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Blood Group</label>
                      <div className="relative">
                        <Icon name="heart-pulse" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500 pointer-events-none" />
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-rose-700 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                        >
                          <option value="">Select Blood Group</option>
                          {dynamicBloodGroups.map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                          {bloodGroup && !dynamicBloodGroups.includes(bloodGroup) && (
                            <option value={bloodGroup}>{bloodGroup}</option>
                          )}
                        </select>
                        <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Caste / Category */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Caste / Category</label>
                      <div className="relative">
                        <Icon name="tag" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={caste}
                          onChange={(e) => setCaste(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                        >
                          <option value="">Select Caste / Category</option>
                          {dynamicCastes.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Religion */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Religion</label>
                      <div className="relative">
                        <Icon name="compass" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={religion}
                          onChange={(e) => setReligion(e.target.value)}
                          placeholder="Religion"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Marital Status */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Marital Status</label>
                      <div className="relative">
                        <Icon name="users" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                          value={maritalStatus}
                          onChange={(e) => setMaritalStatus(e.target.value)}
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                        >
                          <option value="">Select Marital Status</option>
                          {MARITAL_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                          {maritalStatus && !MARITAL_STATUS_OPTIONS.includes(maritalStatus) && (
                            <option value={maritalStatus}>{maritalStatus}</option>
                          )}
                        </select>
                        <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Work Experience */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Work Experience (Years)</label>
                      <div className="relative">
                        <Icon name="briefcase" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={workExperienceYears}
                          onChange={(e) => setWorkExperienceYears(e.target.value)}
                          placeholder="e.g. 5 Years"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Contact No */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Contact No *</label>
                      <div className="relative">
                        <Icon name="phone" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={contactNo}
                          onChange={(e) => setContactNo(e.target.value)}
                          placeholder="Mobile / Phone Number"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Personal Email ID */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Personal Email ID *</label>
                      <div className="relative">
                        <Icon name="mail" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                          placeholder="email@domain.com"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>

                    {/* Area of Service */}
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Area of Service / Specialization</label>
                      <div className="relative">
                        <Icon name="layers" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          list="employeeAreaOfServiceList"
                          value={areaOfService}
                          onChange={(e) => setAreaOfService(e.target.value)}
                          placeholder="E.g. Training, Operations, Administration, Specialization"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Present Address</label>
                      <textarea
                        rows={2}
                        value={presentAddress}
                        onChange={(e) => {
                          setPresentAddress(e.target.value);
                          if (sameAsPresent) setPermanentAddress(e.target.value);
                        }}
                        placeholder="Door No, Street, Landmark, Village/City, Mandal, District, State, PIN"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700">Permanent Address</label>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={sameAsPresent}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSameAsPresent(checked);
                              if (checked) setPermanentAddress(presentAddress);
                            }}
                            className="rounded text-purple-600 border-slate-300 accent-purple-600 cursor-pointer"
                          />
                          Same as Present Address
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        value={permanentAddress}
                        onChange={(e) => {
                          setPermanentAddress(e.target.value);
                          if (sameAsPresent) setSameAsPresent(false);
                        }}
                        placeholder="Door No, Street, Landmark, Village/City, Mandal, District, State, PIN"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Passport Photo Uploader Box */}
                <div className="col-span-12 lg:col-span-3 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
                  {photoBase64 ? (
                    <div className="relative group w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-md">
                      <img src={photoBase64} alt="Passport Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="p-2 rounded-xl bg-white/90 text-slate-800 hover:bg-white shadow-xs cursor-pointer transition"
                          title="Retake Photo"
                        >
                          <Icon name="camera" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoBase64(null)}
                          className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer transition"
                          title="Remove Photo"
                        >
                          <Icon name="trash-2" size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-center p-3 shadow-inner">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 shadow-2xs">
                        <Icon name="user" size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Passport Photo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Formal Staff Picture</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 w-full max-w-[180px] no-print">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Icon name="camera" size={13} />
                      <span>Camera</span>
                    </button>
                    <label className="flex-1 py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold text-center cursor-pointer transition shadow-2xs">
                      Upload
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: EMERGENCY CONTACT DETAILS                         */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'emergency' || activeTab === 'all') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Icon name="phone-call" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Emergency Contact Details</h3>
                  <p className="text-xs text-slate-400 font-medium">Section 2 · Designated emergency contact person &amp; medical notes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Contact Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact Name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Relationship */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Relationship</label>
                  <div className="relative">
                    <Icon name="users" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      placeholder="Spouse / Parent / Sibling / Friend"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Contact No */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Contact No</label>
                  <div className="relative">
                    <Icon name="phone" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={emergencyContactNo}
                      onChange={(e) => setEmergencyContactNo(e.target.value)}
                      placeholder="Phone Number"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Address</label>
                  <div className="relative">
                    <Icon name="map-pin" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={emergencyAddress}
                      onChange={(e) => setEmergencyAddress(e.target.value)}
                      placeholder="Address of emergency contact"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Special Note / Medical</label>
                  <div className="relative">
                    <Icon name="file-text" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={emergencyNote}
                      onChange={(e) => setEmergencyNote(e.target.value)}
                      placeholder="Special medical conditions / blood donor notes"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: POST DETAILS                                      */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'post' || activeTab === 'all') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Icon name="briefcase" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Post &amp; Employment Details</h3>
                  <p className="text-xs text-slate-400 font-medium">Section 3 · Branch deployment, role designation &amp; compensation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Branch */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Organisation / Branch *</label>
                  <div className="relative">
                    <Icon name="building" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    {branchesList.length > 0 ? (
                      <select
                        value={selectedBranchId || location}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedBranchId(val);
                          const found = branchesList.find((b) => b.id === val);
                          setLocation(found ? getOrgBranchLabel(found) : val);
                        }}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                      >
                        <option value="">Select Organisation / Branch</option>
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {getOrgBranchLabel(b)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Organisation / Branch"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                      />
                    )}
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Department</label>
                  <div className="relative">
                    <Icon name="layers" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                    >
                      <option value="">Select Department</option>
                      {departmentsList.map((dept) => (
                        <option key={dept.id || dept.name} value={dept.name}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                      {department && !departmentsList.some((d) => d.name.toLowerCase() === department.toLowerCase()) && (
                        <option value={department}>{department}</option>
                      )}
                    </select>
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Job Designation */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Job Designation</label>
                  <div className="relative">
                    <Icon name="briefcase" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={jobDesignation}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobDesignation(val);
                        if (!department && val) {
                          const found = designationsList.find((d) => d.title.toLowerCase() === val.toLowerCase());
                          if (found && found.department && found.department !== 'ALL') {
                            setDepartment(found.department);
                          }
                        }
                      }}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                    >
                      <option value="">Select Job Designation</option>
                      {(() => {
                        const filtered = department
                          ? designationsList.filter((d) => !d.department || d.department.toLowerCase() === department.toLowerCase() || d.department === 'ALL')
                          : designationsList;
                        const listToRender = filtered.length > 0 ? filtered : designationsList;
                        return (
                          <>
                            {listToRender.map((desg) => (
                              <option key={desg.id || desg.title} value={desg.title}>
                                {desg.title} {desg.department && desg.department !== 'ALL' ? `(${desg.department})` : ''}
                              </option>
                            ))}
                            {jobDesignation && !listToRender.some((d) => d.title.toLowerCase() === jobDesignation.toLowerCase()) && (
                              <option value={jobDesignation}>{jobDesignation}</option>
                            )}
                          </>
                        );
                      })()}
                    </select>
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Secondary Organisations Dropdown */}
                <div className="sm:col-span-2 md:col-span-1" ref={secondaryDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Secondary Organisations</label>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                      {selectedSecondaryBranches.length} Selected
                    </span>
                  </div>

                  <div className="relative">
                    <div
                      onClick={() => setShowSecondaryDropdown((prev) => !prev)}
                      className="min-h-[38px] w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:border-purple-400 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-wrap items-center gap-1 flex-1 overflow-hidden">
                        {selectedSecondaryBranches.length === 0 ? (
                          <span className="text-slate-400 text-xs">Select secondary branches...</span>
                        ) : (
                          selectedSecondaryBranches.map((branchName) => (
                            <span
                              key={branchName}
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                            >
                              <span className="truncate max-w-[120px]">{branchName}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSecondaryBranches((prev) => prev.filter((b) => b !== branchName));
                                }}
                                className="text-purple-500 hover:text-rose-600 rounded-full"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <Icon name="chevron-down" size={14} className="text-slate-400 shrink-0" />
                    </div>

                    {showSecondaryDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 flex items-center gap-2">
                          <input
                            type="text"
                            value={secondarySearchQuery}
                            onChange={(e) => setSecondarySearchQuery(e.target.value)}
                            placeholder="Search branches..."
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-purple-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const allLabels = branchesList
                                .filter((b) => b.id !== selectedBranchId)
                                .map((b) => getOrgBranchLabel(b));
                              setSelectedSecondaryBranches(Array.from(new Set(allLabels)));
                            }}
                            className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSecondaryBranches([])}
                            className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto p-1 divide-y divide-slate-50">
                          {branchesList
                            .filter((b) => {
                              if (b.id && selectedBranchId && b.id === selectedBranchId) return false;
                              const lbl = getOrgBranchLabel(b);
                              if (!secondarySearchQuery.trim()) return true;
                              return lbl.toLowerCase().includes(secondarySearchQuery.toLowerCase());
                            })
                            .map((b) => {
                              const label = getOrgBranchLabel(b);
                              const isChecked = selectedSecondaryBranches.includes(label);
                              return (
                                <label
                                  key={b.id || label}
                                  className={cn(
                                    'flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg transition select-none',
                                    isChecked ? 'bg-purple-50 font-bold text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedSecondaryBranches((prev) =>
                                        prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
                                      );
                                    }}
                                    className="w-4 h-4 text-purple-600 rounded border-slate-300 accent-purple-600"
                                  />
                                  <span className="text-xs flex-1">{label}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Skills Dropdown */}
                <div className="sm:col-span-2 md:col-span-2" ref={skillsDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Technical Skills</label>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
                      {selectedSkillsArray.length} Selected
                    </span>
                  </div>

                  <div className="relative">
                    <div
                      onClick={() => setShowSkillsDropdown((prev) => !prev)}
                      className="min-h-[38px] w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:border-purple-400 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-wrap items-center gap-1 flex-1 overflow-hidden">
                        {selectedSkillsArray.length === 0 ? (
                          <span className="text-slate-400 text-xs">Select or add technical skills...</span>
                        ) : (
                          selectedSkillsArray.map((skillName) => (
                            <span
                              key={skillName}
                              className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                            >
                              <span className="truncate max-w-[120px]">{skillName}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSkill(skillName);
                                }}
                                className="text-purple-500 hover:text-rose-600 rounded-full"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <Icon name="chevron-down" size={14} className="text-slate-400 shrink-0" />
                    </div>

                    {showSkillsDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs divide-y divide-slate-100">
                        <div className="p-2 bg-slate-50 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={skillSearchQuery}
                              onChange={(e) => setSkillSearchQuery(e.target.value)}
                              placeholder="Search skills..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-purple-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setTechnicalSkills('')}
                              className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customSkillInput}
                              onChange={(e) => setCustomSkillInput(e.target.value)}
                              placeholder="Add custom skill..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-purple-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addCustomSkill();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={addCustomSkill}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px]"
                            >
                              + Add
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto p-1 divide-y divide-slate-50">
                          {dynamicSkillsList
                            .filter((s) => {
                              if (!skillSearchQuery.trim()) return true;
                              return s.name.toLowerCase().includes(skillSearchQuery.toLowerCase());
                            })
                            .map((s) => {
                              const isChecked = selectedSkillsArray.includes(s.name);
                              return (
                                <label
                                  key={s.id || s.name}
                                  className={cn(
                                    'flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg transition select-none',
                                    isChecked ? 'bg-purple-50 font-bold text-purple-900' : 'hover:bg-slate-50 text-slate-700'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSkill(s.name)}
                                    className="w-4 h-4 text-purple-600 rounded border-slate-300 accent-purple-600"
                                  />
                                  <span className="text-xs flex-1">{s.name}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Joining Date */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Joining Date</label>
                  <div className="relative">
                    <Icon name="calendar" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Biometric / Machine ID */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Biometric / Machine Punch ID</label>
                  <div className="relative">
                    <Icon name="fingerprint" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      placeholder="e.g. Punch ID / Staff ID"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Role Access</label>
                  <div className="relative">
                    <Icon name="user-check" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      value={employeeRole}
                      onChange={(e) => setEmployeeRole(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer uppercase"
                    >
                      {dynamicRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Employment Status */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Employment Status</label>
                  <div className="relative">
                    <select
                      value={employeeStatus}
                      onChange={(e) => setEmployeeStatus(e.target.value as 'Active' | 'Inactive')}
                      className={cn(
                        'w-full px-3 py-2.5 rounded-xl border text-xs font-bold transition appearance-none cursor-pointer',
                        employeeStatus === 'Active'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      )}
                    >
                      <option value="Active">Active (Currently Employed)</option>
                      <option value="Inactive">Inactive (Relieved / On Hold)</option>
                    </select>
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Monthly Gross Salary (₹)</label>
                  <div className="relative">
                    <Icon name="indian-rupee" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="e.g. 35000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-black text-emerald-700 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 4: BANK DETAILS                                      */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'bank' || activeTab === 'all') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Icon name="credit-card" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Bank Details &amp; Payroll</h3>
                  <p className="text-xs text-slate-400 font-medium">Section 4 · Direct salary disbursement &amp; verified KYC banking info</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Account Holders Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Account Holders Name</label>
                  <div className="relative">
                    <Icon name="user" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Full name as printed in bank passbook"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Name of Bank */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Name of Bank</label>
                  <div className="relative">
                    <Icon name="building" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. SBI, HDFC, ICICI"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Account Number</label>
                  <div className="relative">
                    <Icon name="credit-card" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-emerald-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Branch City */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Branch (City)</label>
                  <div className="relative">
                    <Icon name="map-pin" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={bankBranchCity}
                      onChange={(e) => setBankBranchCity(e.target.value)}
                      placeholder="Branch City"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>

                {/* Bank Account Type */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Bank Account Type</label>
                  <div className="relative">
                    <select
                      value={bankAccountType}
                      onChange={(e) => setBankAccountType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 transition appearance-none cursor-pointer"
                    >
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                      <option value="Salary">Salary</option>
                    </select>
                    <Icon name="chevron-down" size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Branch Code (IFSC) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Branch Code (IFSC) No</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono uppercase font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                {/* PAN No */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">PAN Card Number</label>
                  <input
                    type="text"
                    value={panNo}
                    onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono uppercase font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 5: WORK EXPERIENCE & REFERENCES                      */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'experience' || activeTab === 'all') && (
            <div className="space-y-5">
              {/* Work Experience Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                      <Icon name="history" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">Work Experience History</h3>
                      <p className="text-xs text-slate-400 font-medium">Section 5 · Past professional tenure, companies &amp; roles</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addExperienceRow}
                    className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 transition flex items-center gap-1.5 cursor-pointer no-print shadow-2xs"
                  >
                    <Icon name="plus" size={13} />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                        <th className="p-3 w-1/4">Duration</th>
                        <th className="p-3 w-1/4">Company</th>
                        <th className="p-3 w-1/5">Designation</th>
                        <th className="p-3 w-1/6">Last Salary</th>
                        <th className="p-3">Reason for Leaving</th>
                        <th className="p-3 text-center w-10 no-print">#</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {experienceRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.duration}
                              onChange={(e) => updateExperienceRow(idx, 'duration', e.target.value)}
                              placeholder="e.g. 06/2021 to 08/2023"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.company}
                              onChange={(e) => updateExperienceRow(idx, 'company', e.target.value)}
                              placeholder="Company, City"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-purple-500 font-semibold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.designation}
                              onChange={(e) => updateExperienceRow(idx, 'designation', e.target.value)}
                              placeholder="Role / Title"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.lastSalary}
                              onChange={(e) => updateExperienceRow(idx, 'lastSalary', e.target.value)}
                              placeholder="₹ 30,000"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-emerald-700 outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.reasonForLeaving}
                              onChange={(e) => updateExperienceRow(idx, 'reasonForLeaving', e.target.value)}
                              placeholder="Career advancement"
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-purple-500"
                            />
                          </td>
                          <td className="p-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => removeExperienceRow(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Row"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reference Contact Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                    <Icon name="users" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Reference Contact Details</h3>
                    <p className="text-xs text-slate-400 font-medium">Section 6 · Professional or personal verification referee</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Referee Name</label>
                    <input
                      type="text"
                      value={refName}
                      onChange={(e) => setRefName(e.target.value)}
                      placeholder="Reference Person"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Company */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Company / Organization</label>
                    <input
                      type="text"
                      value={refCompany}
                      onChange={(e) => setRefCompany(e.target.value)}
                      placeholder="Organization"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Post */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Post / Designation</label>
                    <input
                      type="text"
                      value={refPost}
                      onChange={(e) => setRefPost(e.target.value)}
                      placeholder="Designation of referee"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Contact No */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Mobile Number</label>
                    <input
                      type="tel"
                      value={refContactNo}
                      onChange={(e) => setRefContactNo(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Telephone */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Telephone / Landline</label>
                    <input
                      type="tel"
                      value={refTelephone}
                      onChange={(e) => setRefTelephone(e.target.value)}
                      placeholder="Landline / Tel"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Location / Address</label>
                    <input
                      type="text"
                      value={refAddress}
                      onChange={(e) => setRefAddress(e.target.value)}
                      placeholder="Location / Address"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION 7: UNDERSTANDING OF LANGUAGE                         */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {(activeTab === 'language' || activeTab === 'all') && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Icon name="globe" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Understanding of Language</h3>
                    <p className="text-xs text-slate-400 font-medium">Section 7 · Multilingual proficiency assessment (Read, Write, Speak)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddLang(!showAddLang)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer no-print shadow-2xs"
                >
                  <Icon name="plus" size={13} />
                  <span>Add Language</span>
                </button>
              </div>

              {showAddLang && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80 flex items-center gap-2 animate-fade-in no-print">
                  <input
                    type="text"
                    value={newLanguageInput}
                    onChange={(e) => setNewLanguageInput(e.target.value)}
                    placeholder="Enter language name (e.g. Tamil, Kannada, Marathi, French)..."
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs flex-1 outline-none focus:border-indigo-500 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomLanguage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomLanguage}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-xs"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 text-left pl-4 w-2/5">Language</th>
                      <th className="p-3 w-1/5">Read</th>
                      <th className="p-3 w-1/5">Write</th>
                      <th className="p-3 w-1/5">Speak</th>
                      <th className="p-3 w-12 no-print">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {languageList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="p-3 text-left pl-4 text-slate-900 font-black">
                          {item.language}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.read}
                            onChange={() => toggleLanguageSkill(idx, 'read')}
                            className="w-4 h-4 rounded text-purple-600 border-slate-300 accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.write}
                            onChange={() => toggleLanguageSkill(idx, 'write')}
                            className="w-4 h-4 rounded text-purple-600 border-slate-300 accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.speak}
                            onChange={() => toggleLanguageSkill(idx, 'speak')}
                            className="w-4 h-4 rounded text-purple-600 border-slate-300 accent-purple-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center no-print">
                          {languageList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLanguage(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Icon name="x" size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Sticky Modal Footer ───────────────── */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Icon name="shield-check" size={16} className="text-emerald-500" />
              <span>Verified Staff KYC &amp; Biometrics Dossier</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              {activeTab !== 'all' && currentTabIndex > 0 && (
                <button
                  type="button"
                  onClick={goToPrevTab}
                  className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="arrow-left" size={13} />
                  <span>Previous</span>
                </button>
              )}

              {activeTab !== 'all' && currentTabIndex < tabOrder.length - 1 && (
                <button
                  type="button"
                  onClick={goToNextTab}
                  className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next Step</span>
                  <Icon name="arrow-right" size={13} />
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-indigo-600/15 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Details...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" size={15} />
                    <span>{employeeToEdit ? 'Update Employee Record' : 'Enroll Employee'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Master Datalists for Autocomplete */}
          <datalist id="employeeAreaOfServiceList">
            {masterAreaOfServiceList.map((svc) => (
              <option key={svc} value={svc} />
            ))}
          </datalist>
          <datalist id="employeeDistrictsList">
            {masterDistricts.map((dst) => (
              <option key={dst} value={dst} />
            ))}
          </datalist>
          <datalist id="employeeMandalsList">
            {masterMandals.map((mdl) => (
              <option key={mdl} value={mdl} />
            ))}
          </datalist>
          <datalist id="employeeTownsList">
            {masterTowns.map((twn) => (
              <option key={twn} value={twn} />
            ))}
          </datalist>

        </form>

      </div>

    </div>
  );
}
