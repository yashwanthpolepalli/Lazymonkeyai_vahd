import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { printStudentAdmissionForm } from '@/lib/student-print-helper';

interface StudentEnrollmentModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  studentToEdit?: any | null;
}

export const DEGREE_COURSES = [
  'B.Sc. (M.P.C)',
  'B.Sc. (M.P.Cs)',
  'B.Sc. (M.S.Cs)',
  'B.Sc. (B.Z.C)',
  'B.Com (Gen)',
  'B.A. (H.E.P)',
] as const;

export function StudentEnrollmentModal({
  isOpen,
  open,
  onClose,
  onSuccess,
  studentToEdit,
}: StudentEnrollmentModalProps) {
  const visible = isOpen ?? open ?? false;
  if (!visible) return null;

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear} - ${currentYear + 1}`;

  const [course, setCourse] = useState<string>('');
  const [customCourse, setCustomCourse] = useState<string>('');
  const [isCustomCourse, setIsCustomCourse] = useState<boolean>(false);
  const [medium, setMedium] = useState<string>('');
  const [academicYear, setAcademicYear] = useState<string>(defaultAcademicYear);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');

  // College / Form Branding (Editable Name, Subtitle, and Logo)
  const [collegeName, setCollegeName] = useState<string>(() => {
    return localStorage.getItem('ssdc_college_name') || '';
  });
  const [affiliation, setAffiliation] = useState<string>(() => {
    return localStorage.getItem('ssdc_affiliation') || '';
  });
  const [collegeLogo, setCollegeLogo] = useState<string | null>(() => {
    return localStorage.getItem('ssdc_college_logo') || null;
  });
  const [editingHeader, setEditingHeader] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCollegeLogo(dataUrl);
      localStorage.setItem('ssdc_college_logo', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    localStorage.setItem('ssdc_college_name', collegeName.trim());
    localStorage.setItem('ssdc_affiliation', affiliation.trim());
    if (collegeLogo) {
      localStorage.setItem('ssdc_college_logo', collegeLogo);
    } else {
      localStorage.removeItem('ssdc_college_logo');
    }
    setEditingHeader(false);
  };

  // Permanent Address
  const [permDoorNo, setPermDoorNo] = useState('');
  const [permStreet, setPermStreet] = useState('');
  const [permVillage, setPermVillage] = useState('');
  const [permMandal, setPermMandal] = useState('');
  const [permDistrict, setPermDistrict] = useState('');
  const [permState, setPermState] = useState('');
  const [permMobile, setPermMobile] = useState('');

  // Present Address
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [presDoorNo, setPresDoorNo] = useState('');
  const [presStreet, setPresStreet] = useState('');
  const [presVillage, setPresVillage] = useState('');
  const [presMandal, setPresMandal] = useState('');
  const [presDistrict, setPresDistrict] = useState('');
  const [presState, setPresState] = useState('');
  const [presMobile, setPresMobile] = useState('');
  const [telephone, setTelephone] = useState('');

  // Personal Info
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string>('Male');
  const [caste, setCaste] = useState<string>('');
  const [subCaste, setSubCaste] = useState('');
  const [motherTongue, setMotherTongue] = useState('');
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<string>('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');

  // Marks & Parent Details
  const [identificationMark1, setIdentificationMark1] = useState('');
  const [identificationMark2, setIdentificationMark2] = useState('');
  const [parentOccupation, setParentOccupation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [aadharNumber, setAadharNumber] = useState(['', '', '', '', '', '', '', '', '', '', '', '']);

  // Photo & Camera
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Status & Submit
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill form dynamically when editing an existing student, or reset to empty
  useEffect(() => {
    if (studentToEdit) {
      const meta = studentToEdit.meta_data || {};
      if (meta.college_name) setCollegeName(meta.college_name);
      if (meta.affiliation) setAffiliation(meta.affiliation);
      if (meta.college_logo) setCollegeLogo(meta.college_logo);

      const targetCourse = meta.course || studentToEdit.goal || '';
      setCourse(targetCourse);
      const isPredefined = DEGREE_COURSES.includes(targetCourse as any);
      if (targetCourse && !isPredefined) {
        setIsCustomCourse(true);
        setCustomCourse(targetCourse);
      } else {
        setIsCustomCourse(false);
        setCustomCourse('');
      }

      setMedium(meta.medium || '');
      setAcademicYear(meta.academic_year || defaultAcademicYear);
      setFullName(studentToEdit.full_name || studentToEdit.name || '');
      setFatherName(meta.father_name || '');
      setMotherName(meta.mother_name || '');

      const perm = meta.permanent_address || {};
      setPermDoorNo(perm.door_no || '');
      setPermStreet(perm.street || '');
      setPermVillage(perm.village || '');
      setPermMandal(perm.mandal || '');
      setPermDistrict(perm.district || '');
      setPermState(perm.state || '');
      setPermMobile(perm.mobile || studentToEdit.phone || '');

      const pres = meta.present_address || {};
      setPresDoorNo(pres.door_no || '');
      setPresStreet(pres.street || '');
      setPresVillage(pres.village || '');
      setPresMandal(pres.mandal || '');
      setPresDistrict(pres.district || '');
      setPresState(pres.state || '');
      setPresMobile(pres.mobile || studentToEdit.phone || '');
      setTelephone(pres.telephone || '');

      setDob(meta.dob || '');
      setAge(String(studentToEdit.age || meta.age || ''));
      setGender(studentToEdit.gender ? (studentToEdit.gender.toLowerCase() === 'female' ? 'Female' : 'Male') : (meta.gender || 'Male'));
      setCaste(meta.caste || '');
      setSubCaste(meta.sub_caste || '');
      setMotherTongue(meta.mother_tongue || '');
      setNationality(meta.nationality || '');
      setMaritalStatus(meta.marital_status || '');
      setPlaceOfBirth(meta.place_of_birth || '');

      const marks = Array.isArray(meta.identification_marks) ? meta.identification_marks : [];
      setIdentificationMark1(marks[0] || '');
      setIdentificationMark2(marks[1] || '');
      setParentOccupation(meta.parent_occupation || '');
      setAnnualIncome(meta.annual_income || '');

      const aadh = (meta.aadhar_number || '').replace(/\D/g, '').slice(0, 12);
      const aadhArr = ['', '', '', '', '', '', '', '', '', '', '', ''];
      for (let i = 0; i < aadh.length; i++) {
        aadhArr[i] = aadh[i];
      }
      setAadharNumber(aadhArr);
      setPhotoBase64(studentToEdit.face_image || studentToEdit.profile_image || null);
    } else {
      // Dynamic clean initialization
      setCourse('');
      setCustomCourse('');
      setIsCustomCourse(false);
      setMedium('');
      setAcademicYear(defaultAcademicYear);
      setFullName('');
      setFatherName('');
      setMotherName('');
      setPermDoorNo('');
      setPermStreet('');
      setPermVillage('');
      setPermMandal('');
      setPermDistrict('');
      setPermState('');
      setPermMobile('');
      setPresDoorNo('');
      setPresStreet('');
      setPresVillage('');
      setPresMandal('');
      setPresDistrict('');
      setPresState('');
      setPresMobile('');
      setTelephone('');
      setDob('');
      setAge('');
      setGender('Male');
      setCaste('');
      setSubCaste('');
      setMotherTongue('');
      setNationality('');
      setMaritalStatus('');
      setPlaceOfBirth('');
      setIdentificationMark1('');
      setIdentificationMark2('');
      setParentOccupation('');
      setAnnualIncome('');
      setAadharNumber(['', '', '', '', '', '', '', '', '', '', '', '']);
      setPhotoBase64(null);
    }
  }, [studentToEdit, visible]);

  // Auto calculate age from DOB
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

  const handleAadharBoxChange = (idx: number, char: string) => {
    const val = char.replace(/\D/g, '').slice(-1);
    const updated = [...aadharNumber];
    updated[idx] = val;
    setAadharNumber(updated);
    if (val && idx < 11) {
      const nextInput = document.getElementById(`aadhar-box-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handleAadharPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 12);
    if (pasteData) {
      const updated = [...aadharNumber];
      for (let i = 0; i < pasteData.length; i++) {
        updated[i] = pasteData[i];
      }
      setAadharNumber(updated);
    }
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
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setErrorMsg('Webcam permission denied. Please upload photo from file.');
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

  const handleSameAddressToggle = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) {
      setPresDoorNo(permDoorNo);
      setPresStreet(permStreet);
      setPresVillage(permVillage);
      setPresMandal(permMandal);
      setPresDistrict(permDistrict);
      setPresState(permState);
      setPresMobile(permMobile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full Name is required (as per SSC).');
      return;
    }
    const finalMobile = permMobile.trim() || presMobile.trim();
    if (!finalMobile) {
      setErrorMsg('Mobile number is required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const aadharJoined = aadharNumber.join('');
    const emailFormatted = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'student'}_${Date.now().toString().slice(-4)}@student.vahd.ai`;
    const selectedFinalCourse = isCustomCourse ? customCourse.trim() : course.trim();

    const studentPayload = {
      full_name: fullName.toUpperCase().trim(),
      email: emailFormatted,
      phone: finalMobile,
      gender: gender.toLowerCase(),
      age: age ? parseInt(age, 10) : undefined,
      role: 'STUDENT',
      goal: selectedFinalCourse ? `${selectedFinalCourse}${medium ? ` (${medium} Medium)` : ''}` : 'Student Admission',
      profile_image: photoBase64 || undefined,
      face_image: photoBase64 || undefined,
      face_registered: !!photoBase64,
      status: 'ACTIVE',
      meta_data: {
        admission_type: 'DEGREE_ADMISSION',
        college_name: collegeName.toUpperCase().trim(),
        affiliation: affiliation.trim(),
        college_logo: collegeLogo || undefined,
        academic_year: academicYear,
        course: selectedFinalCourse,
        medium,
        father_name: fatherName.toUpperCase(),
        mother_name: motherName.toUpperCase(),
        permanent_address: {
          door_no: permDoorNo,
          street: permStreet,
          village: permVillage,
          mandal: permMandal,
          district: permDistrict,
          state: permState,
          mobile: permMobile,
        },
        present_address: {
          door_no: presDoorNo,
          street: presStreet,
          village: presVillage,
          mandal: presMandal,
          district: presDistrict,
          state: presState,
          mobile: presMobile,
          telephone,
        },
        dob,
        age,
        gender,
        caste,
        sub_caste: subCaste,
        mother_tongue: motherTongue,
        nationality,
        marital_status: maritalStatus,
        place_of_birth: placeOfBirth,
        identification_marks: [identificationMark1, identificationMark2].filter(Boolean),
        parent_occupation: parentOccupation,
        annual_income: annualIncome,
        aadhar_number: aadharJoined,
        enrolled_at: studentToEdit?.meta_data?.enrolled_at || new Date().toISOString(),
      }
    };

    try {
      if (studentToEdit?.id) {
        await apiClient.put(`/customers/${studentToEdit.id}`, studentPayload);
      } else {
        await apiClient.post('/customers', studentPayload);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to submit student application.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printStudentAdmissionForm({
      collegeName,
      affiliation,
      collegeLogo,
      academicYear,
      course: isCustomCourse ? customCourse : course,
      medium,
      fullName,
      fatherName,
      motherName,
      permDoorNo,
      permStreet,
      permVillage,
      permMandal,
      permDistrict,
      permState,
      permMobile,
      presDoorNo,
      presStreet,
      presVillage,
      presMandal,
      presDistrict,
      presState,
      presMobile,
      telephone,
      dob,
      age,
      gender,
      caste,
      subCaste,
      motherTongue,
      nationality,
      maritalStatus,
      placeOfBirth,
      identificationMark1,
      identificationMark2,
      parentOccupation,
      annualIncome,
      aadharNumber,
      photoBase64,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Hidden Logo File Input */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shrink-0">
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            {/* Logo box (Clickable to upload / change logo) */}
            <div
              onClick={() => logoInputRef.current?.click()}
              className="relative group w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border border-white/25 cursor-pointer shrink-0 transition overflow-hidden shadow-xs"
              title="Click to Upload / Change Logo"
            >
              {collegeLogo ? (
                <img src={collegeLogo} alt="Logo" className="w-full h-full object-contain p-1 rounded-2xl bg-white/10" />
              ) : (
                <Icon name="graduation-cap" size={24} className="text-white" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                <Icon name="camera" size={14} />
              </div>
            </div>

            {/* Institution Name & Affiliation */}
            {editingHeader ? (
              <div className="flex-1 space-y-2 max-w-xl animate-fade-in">
                <div>
                  <label className="text-[10px] uppercase font-bold text-blue-200 block mb-0.5">
                    Institution / Form Name:
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. SRI SAI DEGREE COLLEGE - BOBBILI"
                    className="w-full px-3 py-1.5 bg-white/15 border border-white/30 rounded-xl text-xs font-black uppercase text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-blue-200 block mb-0.5">
                    Affiliation / Subtitle:
                  </label>
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="e.g. Affiliated to ANDHRA UNIVERSITY"
                    className="w-full px-3 py-1.5 bg-white/15 border border-white/30 rounded-xl text-xs font-semibold text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    className="px-3 py-1 bg-white text-blue-900 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm hover:bg-blue-50 transition"
                  >
                    <Icon name="check" size={13} /> Save Header
                  </button>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Icon name="upload" size={12} /> {collegeLogo ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {collegeLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setCollegeLogo(null);
                        localStorage.removeItem('ssdc_college_logo');
                      }}
                      className="px-2.5 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 rounded-lg text-xs font-bold transition"
                    >
                      Remove Logo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingHeader(false)}
                    className="px-2.5 py-1 text-blue-200 hover:text-white text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-wide leading-tight uppercase truncate">
                    {studentToEdit ? 'EDIT STUDENT ADMISSION DETAILS' : (collegeName || 'STUDENT ADMISSION FORM')}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditingHeader(true)}
                    className="px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 border border-white/20 transition"
                    title="Edit Form Name & Logo"
                  >
                    <Icon name="edit" size={11} />
                    <span>Edit Name & Logo</span>
                  </button>
                </div>
                <p className="text-[11px] sm:text-xs text-blue-100 font-semibold tracking-wider truncate">
                  {affiliation ? `(${affiliation}) • ` : ''}{studentToEdit ? 'Update Admission Dossier' : 'Student Admission Form'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 transition border border-white/20 shadow-xs cursor-pointer"
              title="Print Official Admission Form (A4)"
            >
              <Icon name="printer" size={14} />
              <span>Print Form</span>
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Form Body Container */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-800 dark:text-slate-200">
          
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <Icon name="alert-circle" size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* College Header & Course Selector Box */}
          <div className="border-2 border-slate-800 dark:border-slate-600 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="font-extrabold uppercase tracking-wide text-slate-900 dark:text-white text-xs">
                APPLICATION FORM FOR ADMISSION TO DEGREE / COURSE FOR:
              </span>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="Academic Year (e.g. 2026 - 2027)"
                className="w-40 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-center text-blue-700 dark:text-blue-400"
              />
            </div>

            {/* Courses Matrix + Custom Course Support */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {DEGREE_COURSES.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition',
                      !isCustomCourse && course === c
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                    )}
                  >
                    <input
                      type="radio"
                      name="degree_course"
                      checked={!isCustomCourse && course === c}
                      onChange={() => {
                        setCourse(c);
                        setIsCustomCourse(false);
                      }}
                      className="sr-only"
                    />
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                      !isCustomCourse && course === c ? 'bg-white text-blue-600 font-black' : 'border-slate-400'
                    )}>
                      {!isCustomCourse && course === c && '✓'}
                    </span>
                    <span>{c}</span>
                  </label>
                ))}
                
                <label
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer font-bold text-xs transition',
                    isCustomCourse
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                  )}
                >
                  <input
                    type="radio"
                    name="degree_course"
                    checked={isCustomCourse}
                    onChange={() => setIsCustomCourse(true)}
                    className="sr-only"
                  />
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                    isCustomCourse ? 'bg-white text-blue-600 font-black' : 'border-slate-400'
                  )}>
                    {isCustomCourse && '✓'}
                  </span>
                  <span>+ Other / Custom Course</span>
                </label>
              </div>

              {isCustomCourse && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    placeholder="Enter Course / Degree Program Name (e.g. B.Tech Computer Science)"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-blue-400 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Medium Selector */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-extrabold text-slate-700 dark:text-slate-300 underline">Medium of Instruction:</span>
              <div className="flex items-center gap-3">
                {['English', 'Telugu', 'Hindi'].map((m) => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer font-bold text-xs">
                    <input
                      type="radio"
                      name="medium"
                      checked={medium === m}
                      onChange={() => setMedium(m)}
                      className="accent-blue-600"
                    />
                    <span>{m}</span>
                  </label>
                ))}
                <input
                  type="text"
                  value={['English', 'Telugu', 'Hindi'].includes(medium) ? '' : medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder="Other Medium"
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium w-32"
                />
              </div>
            </div>
          </div>

          {/* Top Section: Names & Photo Frame */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left 9 Cols: Full Name, Father's Name, Mother's Name */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  1. Full Name <span className="text-slate-500 font-medium">(In BLOCK Letters Only) (As Per SSC)</span> <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value.toUpperCase())}
                  placeholder="E.G. POLEPALLI YASHWANTH"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-bold uppercase tracking-wider text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  2. Father's / Guardian's Name <span className="text-slate-500 font-medium">(In BLOCK Letters Only)</span>
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value.toUpperCase())}
                  placeholder="FATHER'S FULL NAME"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-semibold uppercase tracking-wider text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  3. Mother's Name <span className="text-slate-500 font-medium">(In BLOCK Letters)</span>
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                  placeholder="MOTHER'S FULL NAME"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl font-semibold uppercase tracking-wider text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Right 3-4 Cols: Photo / Biometric Live Capture Box */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-800/60 relative text-center min-h-[190px]">
              {cameraActive ? (
                <div className="w-full flex flex-col items-center space-y-2">
                  <video ref={videoRef} autoPlay playsInline muted className="w-36 h-36 object-cover rounded-xl border border-blue-500 shadow-sm" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1"
                    >
                      <Icon name="camera" size={13} /> Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-bold text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : photoBase64 ? (
                <div className="flex flex-col items-center space-y-2">
                  <img src={photoBase64} alt="Student Snapshot" className="w-32 h-36 object-cover rounded-xl border-2 border-blue-500 shadow-md" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100"
                    >
                      Retake Cam
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoBase64(null)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
                    <Icon name="user" size={24} />
                  </div>
                  <div className="text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300">
                    Passport Photo / Face ID
                  </div>
                  <p className="text-[10px] text-slate-400">Attach passport photo or snap live webcam for Face Recognition</p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5"
                    >
                      <Icon name="camera" size={13} /> Live Cam
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-[11px] cursor-pointer">
                      Upload
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Permanent Postal Address */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800/40 space-y-3">
            <span className="font-extrabold text-slate-900 dark:text-white text-xs block underline uppercase tracking-wide">
              4. Permanent Postal Address:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">D.No :</label>
                <input
                  type="text"
                  value={permDoorNo}
                  onChange={(e) => setPermDoorNo(e.target.value)}
                  placeholder="Door / Flat No"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Street :</label>
                <input
                  type="text"
                  value={permStreet}
                  onChange={(e) => setPermStreet(e.target.value)}
                  placeholder="Street / Colony"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Village / Town :</label>
                <input
                  type="text"
                  value={permVillage}
                  onChange={(e) => setPermVillage(e.target.value)}
                  placeholder="Bobbili / Town"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mandal :</label>
                <input
                  type="text"
                  value={permMandal}
                  onChange={(e) => setPermMandal(e.target.value)}
                  placeholder="Mandal"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">District :</label>
                <input
                  type="text"
                  value={permDistrict}
                  onChange={(e) => setPermDistrict(e.target.value)}
                  placeholder="Vizianagaram"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">State :</label>
                <input
                  type="text"
                  value={permState}
                  onChange={(e) => setPermState(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="tel"
                  required
                  value={permMobile}
                  onChange={(e) => setPermMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-blue-700 dark:text-blue-400"
                />
              </div>
            </div>
          </div>

          {/* 5. Present Address for Correspondence */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs underline uppercase tracking-wide">
                5. Present Address for Correspondence:
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-600 dark:text-blue-400">
                <input
                  type="checkbox"
                  checked={sameAsPermanent}
                  onChange={(e) => handleSameAddressToggle(e.target.checked)}
                  className="accent-blue-600 rounded"
                />
                <span>Same as Permanent Address</span>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">D.No :</label>
                <input
                  type="text"
                  value={presDoorNo}
                  onChange={(e) => setPresDoorNo(e.target.value)}
                  placeholder="D.No"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Street :</label>
                <input
                  type="text"
                  value={presStreet}
                  onChange={(e) => setPresStreet(e.target.value)}
                  placeholder="Street"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Village / Town :</label>
                <input
                  type="text"
                  value={presVillage}
                  onChange={(e) => setPresVillage(e.target.value)}
                  placeholder="Village"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mandal :</label>
                <input
                  type="text"
                  value={presMandal}
                  onChange={(e) => setPresMandal(e.target.value)}
                  placeholder="Mandal"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">District :</label>
                <input
                  type="text"
                  value={presDistrict}
                  onChange={(e) => setPresDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">State :</label>
                <input
                  type="text"
                  value={presState}
                  onChange={(e) => setPresState(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Telephone :</label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Landline / Alt"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mobile :</label>
                <input
                  type="tel"
                  value={presMobile}
                  onChange={(e) => setPresMobile(e.target.value)}
                  placeholder="Mobile"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Rows 7 to 11: DOB, Sex, Caste, Mother Tongue, Marital Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* 7. Date of Birth & Age */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                7. Date of Birth & Age:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">DOB (DD/MM/YYYY):</span>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Age (Years):</span>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Years"
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 8. Sex */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                8. Sex / Gender:
              </label>
              <div className="flex items-center gap-5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="sex"
                    checked={gender === 'Male'}
                    onChange={() => setGender('Male')}
                    className="accent-blue-600"
                  />
                  <span>Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="sex"
                    checked={gender === 'Female'}
                    onChange={() => setGender('Female')}
                    className="accent-blue-600"
                  />
                  <span>Female</span>
                </label>
              </div>
            </div>

            {/* 10. Mother Tongue & Nationality */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                10. Mother Tongue & Nationality:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)}
                  placeholder="Mother Tongue"
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Nationality"
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>

          </div>

          {/* 9. Caste Selection Checkboxes */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800/40 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-800 dark:text-slate-200">
                9. Caste Category:
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Sub Caste:</span>
                <input
                  type="text"
                  value={subCaste}
                  onChange={(e) => setSubCaste(e.target.value)}
                  placeholder="Sub Caste Name"
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
              {['SC', 'ST', 'BC-A', 'BC-B', 'BC-C', 'BC-D', 'BC-E', 'OC'].map((c) => (
                <label
                  key={c}
                  className={cn(
                    'flex items-center justify-center gap-1.5 p-2 rounded-xl border text-center cursor-pointer font-extrabold text-xs transition',
                    caste === c
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <input
                    type="radio"
                    name="caste"
                    checked={caste === c}
                    onChange={() => setCaste(c)}
                    className="sr-only"
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 11 & 12: Marital Status, Place of Birth, Identification Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 11. Marital Status & Place of Birth */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                11. Marital Status & Place of Birth:
              </label>
              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="maritalStatus"
                    checked={maritalStatus === 'Married'}
                    onChange={() => setMaritalStatus('Married')}
                    className="accent-blue-600"
                  />
                  <span>Married</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="maritalStatus"
                    checked={maritalStatus === 'Unmarried'}
                    onChange={() => setMaritalStatus('Unmarried')}
                    className="accent-blue-600"
                  />
                  <span>Unmarried</span>
                </label>
              </div>
              <div className="pt-2">
                <span className="text-[10px] text-slate-500 block mb-1">Place of Birth:</span>
                <input
                  type="text"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  placeholder="Town / City of Birth"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* 12. Identification Marks */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                12. Identification Marks (Moles):
              </label>
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-500">1.</span>
                  <input
                    type="text"
                    value={identificationMark1}
                    onChange={(e) => setIdentificationMark1(e.target.value)}
                    placeholder="A mole on the right side of neck..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-500">2.</span>
                  <input
                    type="text"
                    value={identificationMark2}
                    onChange={(e) => setIdentificationMark2(e.target.value)}
                    placeholder="A mole on the left forearm..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 13 & 14: Parent Occupation & Aadhar Card 12 Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* 13. Parent Occupation & Income */}
            <div className="md:col-span-6 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                13. Parent's Occupation & Annual Income:
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Occupation:</span>
                  <input
                    type="text"
                    value={parentOccupation}
                    onChange={(e) => setParentOccupation(e.target.value)}
                    placeholder="Agriculture / Business"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Annual Income (₹):</span>
                  <input
                    type="text"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    placeholder="₹ 1,50,000"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 14. Aadhar Card Number - 12 Segments */}
            <div className="md:col-span-6 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 bg-white dark:bg-slate-800/40 space-y-2">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                14. Aadhar Card Number:
              </label>
              <div className="pt-1" onPaste={handleAadharPaste}>
                <div className="grid grid-cols-12 gap-1 sm:gap-1.5">
                  {aadharNumber.map((digit, i) => (
                    <input
                      key={i}
                      id={`aadhar-box-${i}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleAadharBoxChange(i, e.target.value)}
                      className="w-full h-9 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-center font-black text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:bg-blue-50/40 dark:focus:bg-blue-950/40 outline-none transition"
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Paste or enter 12-digit Unique Identification Number</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
              <Icon name="shield-check" size={16} className="text-blue-600" />
              <span>Verified Collegiate Admission Form • Biometric Sync Ready</span>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl border border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none px-7 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{studentToEdit ? 'Updating Record...' : 'Processing Admission...'}</span>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" size={16} />
                    <span>{studentToEdit ? 'Save & Update Details' : 'Submit & Enroll Student'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
