import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { hrmsApi } from '@/services/hrmsApi';

export interface MasterDataItem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  parent_id?: string;
  parent_name?: string;
  extra_info?: string;
  check_in_time?: string;
  check_out_time?: string;
  level?: string | number;
  display_order?: number;
  description?: string;
  days?: number | string;
  created_at?: string;
}

export interface MasterCategory {
  id: string;
  title: string;
  icon: string;
  bgLight: string;
  textColor: string;
  description?: string;
  parentCategory?: string;
  codePrefix: string;
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  { id: 'districts', title: 'District', icon: 'map', bgLight: 'bg-sky-100', textColor: 'text-sky-700', codePrefix: 'DST' },
  { id: 'mandals', title: 'Mandal', icon: 'map-pin', bgLight: 'bg-rose-100', textColor: 'text-rose-700', parentCategory: 'districts', codePrefix: 'MDL' },
  { id: 'towns', title: 'Village/Town', icon: 'home', bgLight: 'bg-amber-100', textColor: 'text-amber-700', parentCategory: 'mandals', codePrefix: 'VLG' },
  { id: 'institution_types', title: 'Type of Institution', icon: 'building', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'TOI' },
  { id: 'place_of_working', title: 'Place of Working', icon: 'briefcase', bgLight: 'bg-stone-100', textColor: 'text-stone-700', codePrefix: 'POW' },
  { id: 'dashboard_locations', title: 'Dashboard Locations', icon: 'compass', bgLight: 'bg-red-100', textColor: 'text-red-700', codePrefix: 'DBL' },
  { id: 'mapping_institute', title: 'Mapping Institute', icon: 'layers', bgLight: 'bg-orange-100', textColor: 'text-orange-700', codePrefix: 'MPI' },
  { id: 'division_mapping', title: 'Division Institution Mapping', icon: 'git-branch', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'DIM' },
  { id: 'designations', title: 'Designation', icon: 'award', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'DES' },
  { id: 'roles', title: 'Role', icon: 'shield', bgLight: 'bg-purple-100', textColor: 'text-purple-700', codePrefix: 'ROL' },
  { id: 'departments', title: 'Departments', icon: 'layers', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'DEPT' },
  { id: 'posting_types', title: 'Type of Posting', icon: 'arrow-left-right', bgLight: 'bg-cyan-100', textColor: 'text-cyan-700', codePrefix: 'TOP' },
  { id: 'diagnostics', title: 'Diagnostics', icon: 'microscope', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'DX' },
  { id: 'animal_types', title: 'Animal Type', icon: 'tag', bgLight: 'bg-slate-100', textColor: 'text-slate-700', codePrefix: 'ANI' },
  { id: 'breeds', title: 'Breeds', icon: 'sparkles', bgLight: 'bg-violet-100', textColor: 'text-violet-700', codePrefix: 'BRD' },
  { id: 'vaccination_types', title: 'Vaccination Type', icon: 'shield-alert', bgLight: 'bg-teal-100', textColor: 'text-teal-700', codePrefix: 'VAC' },
  { id: 'items', title: 'Items', icon: 'package', bgLight: 'bg-amber-100', textColor: 'text-amber-800', codePrefix: 'ITM' },
  { id: 'surgical_types', title: 'Surgical Type', icon: 'settings', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'STP' },
  { id: 'surgical', title: 'Surgical', icon: 'plus-circle', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'SUR' },
  { id: 'qualifications', title: 'Qualification', icon: 'book-open', bgLight: 'bg-sky-100', textColor: 'text-sky-700', codePrefix: 'QLF' },
  { id: 'specializations', title: 'Specialization', icon: 'file-text', bgLight: 'bg-slate-100', textColor: 'text-slate-800', parentCategory: 'qualifications', codePrefix: 'SPC' },
  { id: 'leave_reasons', title: 'Leave Reasons', icon: 'clock', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'LVR' },
  { id: 'grampanchayath', title: 'Grampanchayath', icon: 'home', bgLight: 'bg-emerald-100', textColor: 'text-emerald-700', codePrefix: 'GP' },
  { id: 'allocation_forms', title: 'Allocation Form', icon: 'file-spreadsheet', bgLight: 'bg-indigo-100', textColor: 'text-indigo-700', codePrefix: 'ALF' },
  { id: 'drugs', title: 'Drugs', icon: 'pill', bgLight: 'bg-green-100', textColor: 'text-green-700', codePrefix: 'DRG' },
  { id: 'financial_years', title: 'Financial Year', icon: 'indian-rupee', bgLight: 'bg-lime-100', textColor: 'text-lime-800', codePrefix: 'FY' },
  { id: 'schemes', title: 'Scheme', icon: 'bar-chart-3', bgLight: 'bg-blue-100', textColor: 'text-blue-700', codePrefix: 'SCH' },
  { id: 'quarters', title: 'Quarter', icon: 'pie-chart', bgLight: 'bg-purple-100', textColor: 'text-purple-700', codePrefix: 'QTR' },
  { id: 'form_types', title: 'Form Type', icon: 'edit-3', bgLight: 'bg-yellow-100', textColor: 'text-yellow-700', codePrefix: 'FRM' },
  { id: 'budget_allocations', title: 'Budget / Percentage Allocation', icon: 'pie-chart', bgLight: 'bg-orange-100', textColor: 'text-orange-700', codePrefix: 'BGT' },
  { id: 'policies', title: 'Policies', icon: 'clipboard-list', bgLight: 'bg-slate-100', textColor: 'text-slate-700', codePrefix: 'POL' },
  { id: 'calendars', title: 'Calendar', icon: 'calendar', bgLight: 'bg-rose-100', textColor: 'text-rose-700', codePrefix: 'CAL' },
  { id: 'farmers', title: 'Farmers', icon: 'user', bgLight: 'bg-blue-100', textColor: 'text-blue-800', codePrefix: 'FRM' },
  { id: 'sex_sorted_semen', title: 'Sex Sorted Semen', icon: 'dna', bgLight: 'bg-fuchsia-100', textColor: 'text-fuchsia-700', codePrefix: 'SSS' },
];

// Initial 33 Telangana Districts
const SEED_DISTRICTS: MasterDataItem[] = [
  { id: 'dst_1', name: 'Adilabad', code: '501', is_active: true, extra_info: 'ADB' },
  { id: 'dst_2', name: 'Bhadradri Kothagudem', code: '690', is_active: true, extra_info: 'BDK' },
  { id: 'dst_3', name: 'Hanumakonda', code: '686', is_active: true, extra_info: 'HNK' },
  { id: 'dst_4', name: 'Hyderabad', code: '507', is_active: true, extra_info: 'HYD' },
  { id: 'dst_5', name: 'Jagitial', code: '681', is_active: true, extra_info: 'JGL' },
  { id: 'dst_6', name: 'Jangaon', code: '689', is_active: true, extra_info: 'JGN' },
  { id: 'dst_7', name: 'Jayashankar Bhupalapally', code: '687', is_active: true, extra_info: 'JBP' },
  { id: 'dst_8', name: 'Jogulamba Gadwal', code: '695', is_active: true, extra_info: 'JGD' },
  { id: 'dst_9', name: 'Kamareddy', code: '685', is_active: true, extra_info: 'KMR' },
  { id: 'dst_10', name: 'Karimnagar', code: '508', is_active: true, extra_info: 'KNR' },
  { id: 'dst_11', name: 'Khammam', code: '509', is_active: true, extra_info: 'KMM' },
  { id: 'dst_12', name: 'Kumuram Bheem Asifabad', code: '680', is_active: true, extra_info: 'KBA' },
  { id: 'dst_13', name: 'Mahabubabad', code: '691', is_active: true, extra_info: 'MBD' },
  { id: 'dst_14', name: 'Mahabubnagar', code: '510', is_active: true, extra_info: 'MBN' },
  { id: 'dst_15', name: 'Mancherial', code: '682', is_active: true, extra_info: 'MCL' },
  { id: 'dst_16', name: 'Medak', code: '511', is_active: true, extra_info: 'MDK' },
  { id: 'dst_17', name: 'Medchal-Malkajgiri', code: '693', is_active: true, extra_info: 'MDM' },
  { id: 'dst_18', name: 'Mulugu', code: '698', is_active: true, extra_info: 'MLG' },
  { id: 'dst_19', name: 'Nagarkurnool', code: '696', is_active: true, extra_info: 'NGK' },
  { id: 'dst_20', name: 'Nalgonda', code: '512', is_active: true, extra_info: 'NLG' },
  { id: 'dst_21', name: 'Narayanpet', code: '699', is_active: true, extra_info: 'NPT' },
  { id: 'dst_22', name: 'Nirmal', code: '683', is_active: true, extra_info: 'NRM' },
  { id: 'dst_23', name: 'Nizamabad', code: '513', is_active: true, extra_info: 'NZB' },
  { id: 'dst_24', name: 'Peddapalli', code: '684', is_active: true, extra_info: 'PDP' },
  { id: 'dst_25', name: 'Rajanna Sircilla', code: '688', is_active: true, extra_info: 'RJS' },
  { id: 'dst_26', name: 'Ranga Reddy', code: '514', is_active: true, extra_info: 'RRD' },
  { id: 'dst_27', name: 'Sangareddy', code: '694', is_active: true, extra_info: 'SRD' },
  { id: 'dst_28', name: 'Siddipet', code: '692', is_active: true, extra_info: 'SDP' },
  { id: 'dst_29', name: 'Suryapet', code: '697', is_active: true, extra_info: 'SYP' },
  { id: 'dst_30', name: 'Vikarabad', code: '695', is_active: true, extra_info: 'VKB' },
  { id: 'dst_31', name: 'Wanaparthy', code: '696', is_active: true, extra_info: 'WNP' },
  { id: 'dst_32', name: 'Warangal', code: '515', is_active: true, extra_info: 'WGL' },
  { id: 'dst_33', name: 'Yadadri Bhuvanagiri', code: '698', is_active: true, extra_info: 'YDB' },
];

// Initial Mandals
const SEED_MANDALS: MasterDataItem[] = [
  { id: 'mdl_1', name: 'Adilabad Urban', code: '4310', is_active: true, parent_id: 'dst_1', parent_name: 'Adilabad' },
  { id: 'mdl_2', name: 'Adilabad Rural', code: '4311', is_active: true, parent_id: 'dst_1', parent_name: 'Adilabad' },
  { id: 'mdl_3', name: 'Gudihanoor', code: '4312', is_active: true, parent_id: 'dst_1', parent_name: 'Adilabad' },
  { id: 'mdl_4', name: 'Ichoda', code: '4322', is_active: true, parent_id: 'dst_1', parent_name: 'Adilabad' },
  { id: 'mdl_5', name: 'Inderavelly', code: '4313', is_active: true, parent_id: 'dst_1', parent_name: 'Adilabad' },
  { id: 'mdl_6', name: 'Amberpet', code: '5001', is_active: true, parent_id: 'dst_4', parent_name: 'Hyderabad' },
  { id: 'mdl_7', name: 'Ameerpet', code: '5002', is_active: true, parent_id: 'dst_4', parent_name: 'Hyderabad' },
  { id: 'mdl_8', name: 'Secunderabad', code: '5003', is_active: true, parent_id: 'dst_4', parent_name: 'Hyderabad' },
  { id: 'mdl_9', name: 'Khairatabad', code: '5004', is_active: true, parent_id: 'dst_4', parent_name: 'Hyderabad' },
  { id: 'mdl_10', name: 'Hanamkonda', code: '6001', is_active: true, parent_id: 'dst_3', parent_name: 'Hanumakonda' },
  { id: 'mdl_11', name: 'Kazipet', code: '6002', is_active: true, parent_id: 'dst_3', parent_name: 'Hanumakonda' },
];

// Initial Villages / Towns
const SEED_TOWNS: MasterDataItem[] = [
  { id: 'twn_1', name: 'Adilabad Ward No 15', code: '126681', is_active: true, parent_id: 'mdl_1', parent_name: 'Adilabad Urban', extra_info: '501' },
  { id: 'twn_2', name: 'Adilabad Ward No 16', code: '126682', is_active: true, parent_id: 'mdl_1', parent_name: 'Adilabad Urban', extra_info: '501' },
  { id: 'twn_3', name: 'Adilabad Ward No 17', code: '126683', is_active: true, parent_id: 'mdl_1', parent_name: 'Adilabad Urban', extra_info: '501' },
  { id: 'twn_4', name: 'Gudihanoor Village', code: '50316', is_active: true, parent_id: 'mdl_3', parent_name: 'Gudihanoor', extra_info: '501' },
  { id: 'twn_5', name: 'Ichoda Town', code: '126677', is_active: true, parent_id: 'mdl_4', parent_name: 'Ichoda', extra_info: '501' },
  { id: 'twn_6', name: 'Inderavelly Colony', code: '126679', is_active: true, parent_id: 'mdl_5', parent_name: 'Inderavelly', extra_info: '501' },
];

// Type of Institution (Exact 27 records from Screenshot 1)
const SEED_INSTITUTION_TYPES: MasterDataItem[] = [
  { id: 'toi_1', name: 'ADDL', code: 'ADDL', is_active: true, level: '0', display_order: 1 },
  { id: 'toi_2', name: 'AVH', code: 'AVH', is_active: true, level: '0', display_order: 2 },
  { id: 'toi_3', name: 'CADDL', code: 'CADDL', is_active: true, level: '0', display_order: 3 },
  { id: 'toi_4', name: 'Directorate', code: 'Directorate', is_active: true, level: '0', display_order: 4 },
  { id: 'toi_5', name: 'District Medicine Store', code: 'DMS', is_active: true, level: '0', display_order: 5 },
  { id: 'toi_6', name: 'DLDA', code: 'DLDA', is_active: true, level: '0', display_order: 6 },
  { id: 'toi_7', name: 'DTA', code: 'DTA', is_active: true, level: '0', display_order: 7 },
  { id: 'toi_8', name: 'DVAHD', code: 'DVAHD', is_active: true, level: '0', display_order: 8 },
  { id: 'toi_9', name: 'DVH', code: 'DVH', is_active: true, level: '0', display_order: 9 },
  { id: 'toi_10', name: 'ISDP', code: 'ISDP', is_active: true, check_in_time: '09:10 AM', check_out_time: '05:00 PM', level: 'Level 0', display_order: 1 },
  { id: 'toi_11', name: 'Mobile Veterinary Clinic', code: 'MVC', is_active: true, check_in_time: '09:00 AM', check_out_time: '05:00 PM', level: 'Level 1', display_order: 11 },
  { id: 'toi_12', name: 'Polyclinic', code: 'PVC', is_active: true, check_in_time: '08:30 AM', check_out_time: '04:30 PM', level: 'Level 1', display_order: 12 },
  { id: 'toi_13', name: 'Primary Veterinary Center', code: 'PVCTR', is_active: true, check_in_time: '09:00 AM', check_out_time: '05:00 PM', level: 'Level 2', display_order: 13 },
  { id: 'toi_14', name: 'Regional Training Center', code: 'RTC', is_active: true, level: 'Level 0', display_order: 14 },
  { id: 'toi_15', name: 'State Veterinary Institute', code: 'SVI', is_active: true, level: 'Level 0', display_order: 15 },
  { id: 'toi_16', name: 'Veterinary Dispensary', code: 'VD', is_active: true, check_in_time: '09:00 AM', check_out_time: '05:00 PM', level: 'Level 1', display_order: 16 },
  { id: 'toi_17', name: 'Veterinary Hospital', code: 'VH', is_active: true, check_in_time: '08:00 AM', check_out_time: '05:00 PM', level: 'Level 1', display_order: 17 },
];

// Initial Qualifications (Exact 9 from Screenshot 2)
const SEED_QUALIFICATIONS: MasterDataItem[] = [
  { id: 'qlf_1', name: 'Degree', code: 'DEGREE', is_active: true },
  { id: 'qlf_2', name: 'Intermediate', code: 'INTER', is_active: true },
  { id: 'qlf_3', name: 'M.sc', code: 'MSC', is_active: true },
  { id: 'qlf_4', name: 'm.tech', code: 'MTECH', is_active: true },
  { id: 'qlf_5', name: 'M.TECH', code: 'MTECH-ADV', is_active: true },
  { id: 'qlf_6', name: 'M V S c', code: '617d2d2e-f113-430c-b6e5-f0e9673f0e8b', is_active: true },
  { id: 'qlf_7', name: 'M V S c & Phd', code: '4db9e66d-e97a-4416-8d3e-9934f7f69a73', is_active: true },
  { id: 'qlf_8', name: 'Post Graduation', code: 'PG', is_active: true },
  { id: 'qlf_9', name: 'SSC', code: 'SSC', is_active: true },
];

// Mock items to filter out if cached in browser storage
const MOCK_ITEM_IDS = new Set([
  'spc_1', 'spc_2', 'spc_3', 'spc_4', 'spc_5', 'spc_6', 'spc_7', 'spc_8', 'spc_9',
  'rol_1', 'rol_2', 'rol_3', 'rol_4', 'rol_5', 'rol_6',
  'des_1', 'des_2', 'des_3', 'des_4', 'des_5', 'des_6', 'des_7', 'des_8',
  'dept_1', 'dept_2', 'dept_3', 'dept_4', 'dept_5', 'dept_6',
]);

const MOCK_CODES = new Set([
  'SPC-01', 'SPC-02', 'SPC-03', 'SPC-04', 'SPC-05', 'SPC-06', 'SPC-07', 'SPC-08', 'SPC-09',
  'ROLE-SUPER', 'ROLE-HO', 'ROLE-DVO', 'ROLE-VAS', 'ROLE-PV', 'ROLE-ATT',
  'DES-DAH', 'DES-ADDL', 'DES-JD', 'DES-DD', 'DES-AD', 'DES-VAS', 'DES-JVO', 'DES-VA',
  'DEPT-CS', 'DEPT-PMV', 'DEPT-AI', 'DEPT-VDS', 'DEPT-PDL', 'DEPT-HR'
]);

function sanitizeMasterStore(store: Record<string, MasterDataItem[]>): { store: Record<string, MasterDataItem[]>; modified: boolean } {
  let modified = false;
  const categoriesToCheck = ['specializations', 'roles', 'designations', 'departments'];
  for (const cat of categoriesToCheck) {
    if (Array.isArray(store[cat])) {
      const filtered = store[cat].filter((item) => !MOCK_ITEM_IDS.has(item.id) && !MOCK_CODES.has(item.code));
      if (filtered.length !== store[cat].length) {
        store[cat] = filtered;
        modified = true;
      }
    } else {
      store[cat] = [];
      modified = true;
    }
  }
  return { store, modified };
}

// Initial Leave Reasons (Exact 11 from Screenshot)
const SEED_LEAVE_REASONS: MasterDataItem[] = [
  { id: 'lvr_1', name: 'Casual Leave', code: 'LVR-01', is_active: true, days: 15 },
  { id: 'lvr_2', name: 'Child Care Leave', code: 'LVR-02', is_active: true, days: 180 },
  { id: 'lvr_3', name: 'Emergency Leave', code: 'LVR-03', is_active: true, days: 30 },
  { id: 'lvr_4', name: 'Extraordinary Leave', code: 'LVR-04', is_active: true, days: 1794 },
  { id: 'lvr_5', name: 'Maternity Leave', code: 'LVR-05', is_active: true, days: 180 },
  { id: 'lvr_6', name: 'Medical Leave', code: 'LVR-06', is_active: true, days: 300 },
  { id: 'lvr_7', name: 'Optional Holiday', code: 'LVR-07', is_active: true, days: 5 },
  { id: 'lvr_8', name: 'Paternity Leave', code: 'LVR-08', is_active: true, days: 15 },
  { id: 'lvr_9', name: 'Special Leave', code: 'LVR-09', is_active: true, days: 5 },
  { id: 'lvr_10', name: 'Study Leave', code: 'LVR-10', is_active: true, days: 300 },
  { id: 'lvr_11', name: 'Surrender Leave', code: 'LVR-11', is_active: true, days: 15 },
];

// Helper to get seed data for any category
function getSeedDataForCategory(catId: string): MasterDataItem[] {
  if (catId === 'districts') return SEED_DISTRICTS;
  if (catId === 'mandals') return SEED_MANDALS;
  if (catId === 'towns') return SEED_TOWNS;
  if (catId === 'institution_types') return SEED_INSTITUTION_TYPES;
  if (catId === 'qualifications') return SEED_QUALIFICATIONS;
  if (catId === 'leave_reasons') return SEED_LEAVE_REASONS;

  return [];
}

export interface MasterDataSettingsProps {
  selectedCatId?: string | null;
  onBack?: () => void;
}

export function MasterDataSettings({ selectedCatId: propSelectedCatId, onBack }: MasterDataSettingsProps = {}) {
  const [selectedCatId, setSelectedCatId] = useState<string | null>(propSelectedCatId || null);

  useEffect(() => {
    if (propSelectedCatId !== undefined) {
      setSelectedCatId(propSelectedCatId);
    }
  }, [propSelectedCatId]);

  const [masterStore, setMasterStore] = useState<Record<string, MasterDataItem[]>>(() => {
    try {
      const stored = localStorage.getItem('vahd_master_data_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        const { store: cleaned, modified } = sanitizeMasterStore(parsed);
        let updated = false;
        if (!Array.isArray(cleaned.leave_reasons) || cleaned.leave_reasons.length === 0) {
          cleaned.leave_reasons = SEED_LEAVE_REASONS;
          updated = true;
        }
        if (modified || updated) {
          localStorage.setItem('vahd_master_data_v3', JSON.stringify(cleaned));
        }
        return cleaned;
      }

      // Purge old mock data from previous version if exists
      const oldStored = localStorage.getItem('vahd_master_data_v2');
      if (oldStored) {
        const parsed = JSON.parse(oldStored);
        const { store: cleaned } = sanitizeMasterStore(parsed);
        if (!Array.isArray(cleaned.leave_reasons) || cleaned.leave_reasons.length === 0) {
          cleaned.leave_reasons = SEED_LEAVE_REASONS;
        }
        localStorage.setItem('vahd_master_data_v3', JSON.stringify(cleaned));
        return cleaned;
      }
    } catch {}

    // Clean initial store
    const initial: Record<string, MasterDataItem[]> = {};
    MASTER_CATEGORIES.forEach((cat) => {
      initial[cat.id] = getSeedDataForCategory(cat.id);
    });
    return initial;
  });

  const saveMasterStore = (updated: Record<string, MasterDataItem[]>) => {
    setMasterStore(updated);
    try {
      localStorage.setItem('vahd_master_data_v3', JSON.stringify(updated));
      localStorage.setItem('vahd_master_data_v2', JSON.stringify(updated));
      window.dispatchEvent(new Event('vahd_master_data_updated'));
    } catch {}
  };

  // Synchronize DB-backed categories with live backend database
  useEffect(() => {
    if (selectedCatId === 'leave_reasons' || !selectedCatId) {
      hrmsApi.getLeaveTypes().then((types) => {
        if (Array.isArray(types) && types.length > 0) {
          const mapped: MasterDataItem[] = types.map((t) => ({
            id: t.id,
            name: t.name,
            code: t.code,
            days: t.annual_quota || 0,
            is_active: t.is_active,
            description: t.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, leave_reasons: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }).catch(() => {});
    }

    if (selectedCatId === 'departments' || !selectedCatId) {
      hrmsApi.getDepartments().then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          const mapped: MasterDataItem[] = depts.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            is_active: d.is_active,
            description: d.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, departments: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }).catch(() => {});
    }

    if (selectedCatId === 'designations' || !selectedCatId) {
      hrmsApi.getDesignations().then((desgs) => {
        if (Array.isArray(desgs) && desgs.length > 0) {
          const mapped: MasterDataItem[] = desgs.map((d: any) => ({
            id: d.id,
            name: d.title || d.name || '',
            code: d.code || 'DES',
            level: d.level,
            parent_name: d.department,
            is_active: d.is_active !== false,
            description: d.description || '',
          }));
          setMasterStore((prev) => {
            const next = { ...prev, designations: mapped };
            try {
              localStorage.setItem('vahd_master_data_v3', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }).catch(() => {});
    }
  }, [selectedCatId]);

  const selectedCategory = useMemo(() => {
    return MASTER_CATEGORIES.find((c) => c.id === selectedCatId) || null;
  }, [selectedCatId]);

  const categoryItems = useMemo(() => {
    if (!selectedCatId) return [];
    return masterStore[selectedCatId] || [];
  }, [selectedCatId, masterStore]);

  // Table filters & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [formExtra, setFormExtra] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('');
  const [formCheckOut, setFormCheckOut] = useState('');
  const [formLevel, setFormLevel] = useState('0');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formDescription, setFormDescription] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formActive, setFormActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered rows
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categoryItems;
    return categoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.parent_name && item.parent_name.toLowerCase().includes(q)) ||
        (item.extra_info && item.extra_info.toLowerCase().includes(q))
    );
  }, [categoryItems, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open modal for add
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormParentId('');
    setFormExtra('');
    setFormCheckIn('');
    setFormCheckOut('');
    setFormLevel('0');
    setFormDisplayOrder('0');
    setFormDescription('');
    setFormDays('');
    setFormActive(true);
    setModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (item: MasterDataItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormParentId(item.parent_id || '');
    setFormExtra(item.extra_info || '');
    setFormCheckIn(item.check_in_time || '');
    setFormCheckOut(item.check_out_time || '');
    setFormLevel(String(item.level ?? '0'));
    setFormDisplayOrder(String(item.display_order ?? '0'));
    setFormDescription(item.description || '');
    setFormDays(String(item.days ?? ''));
    setFormActive(item.is_active);
    setModalOpen(true);
  };

  // Open modal for view
  const handleOpenView = (item: MasterDataItem) => {
    setModalMode('view');
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormParentId(item.parent_id || '');
    setFormExtra(item.extra_info || '');
    setFormCheckIn(item.check_in_time || '');
    setFormCheckOut(item.check_out_time || '');
    setFormLevel(String(item.level ?? '0'));
    setFormDisplayOrder(String(item.display_order ?? '0'));
    setFormDescription(item.description || '');
    setFormDays(String(item.days ?? ''));
    setFormActive(item.is_active);
    setModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !formName.trim()) return;

    const currentItems = masterStore[selectedCatId] || [];
    const parentCategory = selectedCategory?.parentCategory;
    let resolvedParentName = '';
    let resolvedParentCode = '';
    if (parentCategory && formParentId) {
      const parents = masterStore[parentCategory] || [];
      const match = parents.find((p) => p.id === formParentId);
      if (match) {
        resolvedParentName = match.name;
        resolvedParentCode = match.code;
      }
    }

    if (modalMode === 'edit' && editingItem) {
      if (selectedCatId === 'leave_reasons') {
        hrmsApi.updateLeaveType(editingItem.id, {
          name: formName.trim(),
          code: formCode.trim() || editingItem.code,
          annual_quota: parseFloat(formDays) || 15,
          is_active: formActive,
        }).catch(() => {});
      } else if (selectedCatId === 'departments') {
        hrmsApi.updateDepartment(editingItem.id, {
          name: formName.trim(),
          code: formCode.trim() || editingItem.code,
          is_active: formActive,
        }).catch(() => {});
      } else if (selectedCatId === 'designations') {
        hrmsApi.updateDesignation(editingItem.id, {
          title: formName.trim(),
          level: formLevel,
          department: resolvedParentName,
        }).catch(() => {});
      }

      const updatedList = currentItems.map((item) => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formName.trim(),
            code: formCode.trim() || item.code,
            parent_id: formParentId || undefined,
            parent_name: resolvedParentName || item.parent_name,
            extra_info: formExtra.trim() || resolvedParentCode || item.extra_info,
            check_in_time: formCheckIn.trim() || undefined,
            check_out_time: formCheckOut.trim() || undefined,
            level: formLevel || undefined,
            display_order: parseInt(formDisplayOrder, 10) || 0,
            description: formDescription.trim() || undefined,
            days: formDays ? parseInt(formDays, 10) : undefined,
            is_active: formActive,
          };
        }
        return item;
      });
      saveMasterStore({ ...masterStore, [selectedCatId]: updatedList });
    } else {
      // Add new
      const autoCode =
        formCode.trim() ||
        `${selectedCategory?.codePrefix || 'CD'}-${Math.floor(100 + Math.random() * 900)}`;

      if (selectedCatId === 'leave_reasons') {
        hrmsApi.createLeaveType({
          name: formName.trim(),
          code: autoCode,
          annual_quota: parseFloat(formDays) || 15,
          paid_type: 'PAID',
          is_paid: true,
          gender_eligibility: ['MALE', 'FEMALE', 'OTHER'],
          min_service_days: 0,
          carry_forward_allowed: false,
          max_carry_forward_days: 0,
          attachment_required: false,
          is_active: formActive,
        }).catch(() => {});
      } else if (selectedCatId === 'departments') {
        hrmsApi.createDepartment({
          name: formName.trim(),
          code: autoCode,
          is_active: formActive,
        }).catch(() => {});
      } else if (selectedCatId === 'designations') {
        hrmsApi.createDesignation({
          title: formName.trim(),
          level: formLevel,
          department: resolvedParentName,
        }).catch(() => {});
      }

      const newItem: MasterDataItem = {
        id: `${selectedCatId}_${Date.now()}`,
        name: formName.trim(),
        code: autoCode,
        is_active: formActive,
        parent_id: formParentId || undefined,
        parent_name: resolvedParentName || undefined,
        extra_info: formExtra.trim() || resolvedParentCode || undefined,
        check_in_time: formCheckIn.trim() || undefined,
        check_out_time: formCheckOut.trim() || undefined,
        level: formLevel || undefined,
        display_order: parseInt(formDisplayOrder, 10) || 0,
        description: formDescription.trim() || undefined,
        days: formDays ? parseInt(formDays, 10) : undefined,
        created_at: new Date().toISOString(),
      };
      saveMasterStore({ ...masterStore, [selectedCatId]: [newItem, ...currentItems] });
    }

    setModalOpen(false);
  };

  // Delete single item
  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!selectedCatId) return;
    if (!confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) return;

    if (selectedCatId === 'leave_reasons') {
      hrmsApi.deleteLeaveType(itemId).catch(() => {});
    } else if (selectedCatId === 'departments') {
      hrmsApi.deleteDepartment(itemId).catch(() => {});
    } else if (selectedCatId === 'designations') {
      hrmsApi.deleteDesignation(itemId).catch(() => {});
    }

    const currentItems = masterStore[selectedCatId] || [];
    const updated = currentItems.filter((i) => i.id !== itemId);
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
  };


  // Delete Selected / Delete All
  const handleDeleteSelected = () => {
    if (!selectedCatId || selectedItemIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItemIds.length} selected record(s)?`)) return;
    const currentItems = masterStore[selectedCatId] || [];
    const deleteSet = new Set(selectedItemIds);
    const updated = currentItems.filter((i) => !deleteSet.has(i.id));
    saveMasterStore({ ...masterStore, [selectedCatId]: updated });
    setSelectedItemIds([]);
  };

  const handleDeleteAll = () => {
    if (!selectedCatId) return;
    if (!confirm(`Are you sure you want to delete ALL records for ${selectedCategory?.title}?`)) return;
    saveMasterStore({ ...masterStore, [selectedCatId]: [] });
    setSelectedItemIds([]);
  };

  // Sample CSV Download
  const handleDownloadSampleCsv = () => {
    if (!selectedCategory) return;
    const isHierarchical = Boolean(selectedCategory.parentCategory);
    let csvContent = 'NAME,CODE,IS_ACTIVE';
    if (isHierarchical) csvContent += ',PARENT_NAME';
    csvContent += '\n';

    csvContent += `Sample ${selectedCategory.title} 1,${selectedCategory.codePrefix}-101,TRUE`;
    if (isHierarchical) csvContent += ',Parent Example';
    csvContent += '\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sample_${selectedCategory.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCatId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) return;
        const newRecords: MasterDataItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols[0]) {
            newRecords.push({
              id: `${selectedCatId}_imp_${Date.now()}_${i}`,
              name: cols[0],
              code: cols[1] || `${selectedCategory?.codePrefix || 'CD'}-${Math.floor(100 + Math.random() * 900)}`,
              is_active: cols[2] ? cols[2].toUpperCase() !== 'FALSE' : true,
              parent_name: cols[3] || undefined,
            });
          }
        }
        if (newRecords.length > 0) {
          const existing = masterStore[selectedCatId] || [];
          saveMasterStore({ ...masterStore, [selectedCatId]: [...existing, ...newRecords] });
          alert(`Successfully imported ${newRecords.length} records into ${selectedCategory?.title}.`);
        }
      } catch (err) {
        alert('Failed to parse file. Please use a valid CSV file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Parent options for dropdowns
  const parentOptions = useMemo(() => {
    if (!selectedCategory?.parentCategory) return [];
    return masterStore[selectedCategory.parentCategory] || [];
  }, [selectedCategory, masterStore]);

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 2: CATEGORY DETAIL TABLE VIEW (Screenshots 1 - 5)
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedCatId && selectedCategory) {
    const isInstitutionType = selectedCategory.id === 'institution_types';
    const isSpecialization = selectedCategory.id === 'specializations';
    const isQualification = selectedCategory.id === 'qualifications';
    const isLeaveReasons = selectedCategory.id === 'leave_reasons';

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Hidden File Input for CSV Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".csv,.xlsx,.xls"
          className="hidden"
        />

        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : setSelectedCatId(null))}>Home</span>
              <Icon name="chevron-right" size={12} />
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => (onBack ? onBack() : setSelectedCatId(null))}>Settings</span>
              <Icon name="chevron-right" size={12} />
              <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedCategory.title}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {selectedCategory.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Settings · {categoryItems.length} records
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  setSelectedCatId(null);
                }
                setSearchQuery('');
                setSelectedItemIds([]);
              }}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="chevron-left" size={14} />
              <span>Back</span>
            </button>

            {/* Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="upload" size={13} />
              <span>Import Excel / CSV</span>
            </button>

            {/* Sample Files */}
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer"
            >
              Sample .xlsx
            </button>
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 cursor-pointer"
            >
              Sample .csv
            </button>

            {/* Delete All / Delete Selected */}
            {selectedItemIds.length > 0 ? (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Icon name="trash-2" size={13} />
                <span>Delete Selected ({selectedItemIds.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Icon name="trash-2" size={13} />
                <span>Delete All</span>
              </button>
            )}

            {/* + Add Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Icon name="plus" size={14} />
              <span>+ Add {selectedCategory.title}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${selectedCategory.title.toLowerCase()}...`}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{filteredItems.length} records</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        {/* Master Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {!isLeaveReasons && (
                    <th className="w-10 py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedItemIds.length === filteredItems.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4 w-16">S.NO</th>

                  {/* Category-Specific Columns */}
                  {isSpecialization ? (
                    <>
                      <th className="py-3.5 px-4">QUALIFICATION ID</th>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      <th className="py-3.5 px-4">QUALIFICATION NAME</th>
                    </>
                  ) : isInstitutionType ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">CODE</th>
                      <th className="py-3.5 px-4">CHECK-IN TIME</th>
                      <th className="py-3.5 px-4">CHECK-OUT TIME</th>
                      <th className="py-3.5 px-4">LEVEL</th>
                      <th className="py-3.5 px-4">DISPLAY ORDER</th>
                      <th className="py-3.5 px-4">STATUS</th>
                    </>
                  ) : isLeaveReasons ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      <th className="py-3.5 px-4">DAYS</th>
                    </>
                  ) : isQualification ? (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">NAME</th>
                      <th className="py-3.5 px-4">CODE</th>
                      <th className="py-3.5 px-4">IS ACTIVE</th>
                      {selectedCategory.parentCategory && (
                        <th className="py-3.5 px-4 uppercase">{selectedCategory.parentCategory.replace('_', ' ')}</th>
                      )}
                      {selectedCategory.id === 'districts' && (
                        <th className="py-3.5 px-4">DISTRICT CODE</th>
                      )}
                    </>
                  )}

                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 font-semibold">
                      <Icon name="layers" size={24} className="mx-auto text-slate-300 mb-2" />
                      <div>No records found for "{selectedCategory.title}".</div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isChecked = selectedItemIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                          isChecked ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''
                        )}
                      >
                        {!isLeaveReasons && (
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-semibold text-slate-500">{idx + 1}</td>

                        {/* Specialization Columns (Screenshot 3) */}
                        {isSpecialization ? (
                          <>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                              {item.extra_info || item.parent_id || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {item.parent_name || '—'}
                            </td>
                          </>
                        ) : isInstitutionType ? (
                          /* Institution Type Columns (Screenshot 1) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {item.code || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                              {item.check_in_time ? (
                                <span className="flex items-center gap-1">
                                  <Icon name="clock" size={12} className="text-rose-500" />
                                  <span>{item.check_in_time}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                              {item.check_out_time ? (
                                <span className="flex items-center gap-1">
                                  <Icon name="clock" size={12} className="text-rose-500" />
                                  <span>{item.check_out_time}</span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {item.level ? (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                                  {String(item.level).includes('Level') ? item.level : `Level ${item.level}`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                              {item.display_order ?? '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </>
                        ) : isLeaveReasons ? (
                          /* Leave Reasons Columns (Screenshot 4) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {item.days ?? '—'}
                            </td>
                          </>
                        ) : isQualification ? (
                          /* Qualification Columns (Screenshot 2) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </>
                        ) : (
                          /* Default Master Data Columns (District, Mandal, etc.) */
                          <>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {item.code}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-full text-[11px] font-extrabold',
                                  item.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                )}
                              >
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {selectedCategory.parentCategory && (
                              <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                {item.parent_name || '—'}
                              </td>
                            )}
                            {selectedCategory.id === 'districts' && (
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                {item.extra_info || item.code}
                              </td>
                            )}
                          </>
                        )}

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenView(item)}
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Icon name="eye" size={12} />
                              <span>View</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Icon name="edit-3" size={12} />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Icon name="x" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ADD / EDIT / VIEW MODAL (Screenshots 1, 3, 4, 5)                    */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {modalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {modalMode === 'add'
                    ? `Add ${selectedCategory.title}`
                    : modalMode === 'edit'
                    ? `Edit ${selectedCategory.title}`
                    : `View ${selectedCategory.title}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
                {/* 1. Parent Selection if Specialization (Screenshot 3) or Mandal/Town */}
                {selectedCategory.parentCategory && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      {isSpecialization ? 'QUALIFICATION *' : `${selectedCategory.parentCategory.replace('_', ' ').toUpperCase()} *`}
                    </label>
                    <select
                      value={formParentId}
                      onChange={(e) => setFormParentId(e.target.value)}
                      disabled={modalMode === 'view'}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    >
                      <option value="">Select...</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Primary Name Field */}
                <div className="space-y-1">
                  <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                    {isLeaveReasons
                      ? 'LEAVE REASON *'
                      : isInstitutionType
                      ? 'INSTITUTION TYPE NAME *'
                      : `${selectedCategory.title.toUpperCase()} NAME *`}
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      isInstitutionType
                        ? 'e.g. Polyclinic'
                        : isLeaveReasons
                        ? 'e.g. Casual Leave'
                        : `e.g. ${selectedCategory.title} name`
                    }
                    disabled={modalMode === 'view'}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* 3. Leave Reasons Days (Screenshot 5) */}
                {isLeaveReasons && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      MAX DAYS ALLOWED
                    </label>
                    <input
                      type="number"
                      value={formDays}
                      onChange={(e) => setFormDays(e.target.value)}
                      placeholder="e.g. 12 (leave blank for unlimited)"
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}

                {/* 4. Code Field (optional for institution type, district, etc.) */}
                {!isLeaveReasons && (
                  <div className="space-y-1">
                    <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                      CODE
                    </label>
                    <input
                      type="text"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder={
                        isInstitutionType
                          ? 'Optional — e.g. PVC'
                          : 'Optional — e.g. HYD, or leave blank to auto-generate'
                      }
                      disabled={modalMode === 'view'}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                )}

                {/* 5. Type of Institution Custom Fields (Screenshot 1) */}
                {isInstitutionType && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          CHECK-IN TIME
                        </label>
                        <input
                          type="text"
                          value={formCheckIn}
                          onChange={(e) => setFormCheckIn(e.target.value)}
                          placeholder="e.g. 09:00 AM"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          CHECK-OUT TIME
                        </label>
                        <input
                          type="text"
                          value={formCheckOut}
                          onChange={(e) => setFormCheckOut(e.target.value)}
                          placeholder="e.g. 05:00 PM"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          LEVEL
                        </label>
                        <input
                          type="text"
                          value={formLevel}
                          onChange={(e) => setFormLevel(e.target.value)}
                          placeholder="e.g. 0"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                          DISPLAY ORDER
                        </label>
                        <input
                          type="number"
                          value={formDisplayOrder}
                          onChange={(e) => setFormDisplayOrder(e.target.value)}
                          placeholder="e.g. 0"
                          disabled={modalMode === 'view'}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-black uppercase text-[10px] tracking-wider text-slate-700 dark:text-slate-300">
                        DESCRIPTION
                      </label>
                      <input
                        type="text"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Optional description"
                        disabled={modalMode === 'view'}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </>
                )}

                {/* Active Checkbox */}
                {modalMode !== 'view' && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Status is Active</span>
                  </label>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 transition-colors"
                  >
                    {modalMode === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {modalMode !== 'view' && (
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      ✓ Save
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 1: MASTER DATA CARDS GRID (Screenshot 1)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Matching Screenshot 1 */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-serif">
          Settings
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Master data — geography, clinical, HR, finance, pharmacy, and fodder
        </p>
      </div>

      {/* Subtab indicator */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="text-blue-600 font-black text-sm">|</span>
        <span className="text-xs font-bold text-blue-600">Settings</span>
      </div>

      {/* 33 Category Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {MASTER_CATEGORIES.map((cat) => {
          const count = (masterStore[cat.id] || []).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCatId(cat.id);
                setSearchQuery('');
                setSelectedItemIds([]);
              }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group shadow-2xs min-h-[130px]"
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs',
                  cat.bgLight,
                  cat.textColor
                )}
              >
                <Icon name={cat.icon} size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block leading-tight">
                  {cat.title}
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  {count} records
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
