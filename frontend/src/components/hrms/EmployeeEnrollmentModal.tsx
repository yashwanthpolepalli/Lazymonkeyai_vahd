import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiClient } from '@/services/apiClient';

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
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
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
  const [skypeId, setSkypeId] = useState('');
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

  // Status & Submit
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setLocation(post.location || employeeToEdit.gym_branch || employeeToEdit.primary_gym_location || '');
      setDepartment(post.department || employeeToEdit.department || '');
      setJobDesignation(post.designation || employeeToEdit.designation || employeeToEdit.role || '');
      setJoiningDate(post.joining_date || employeeToEdit.joined_date || new Date().toISOString().split('T')[0]);
      setCompanyId(post.company_id || '');
      setSkypeId(post.skype_id || '');
      setTechnicalSkills(post.technical_skills || (Array.isArray(employeeToEdit.skills) ? employeeToEdit.skills.join(', ') : ''));
      setBaseSalary(employeeToEdit.salary ? String(employeeToEdit.salary) : (employeeToEdit.base_monthly_salary ? String(employeeToEdit.base_monthly_salary) : ''));

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
      setDepartment('');
      setJobDesignation('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setCompanyId('');
      setSkypeId('');
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
          videoRef.current.play().catch(() => {});
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
                    ${
                      photoBase64
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
                  </span>
                </td>
                <td style="border-right: none;">
                  <span class="label">Marital Status: </span>
                  <span style="margin-left: 4px; font-size: 9px; font-weight: 600;">
                    ${checkedIcon(maritalStatus === 'Married')} Married &nbsp;
                    ${checkedIcon(maritalStatus === 'Single')} Single &nbsp;
                    ${checkedIcon(maritalStatus === 'Separated')} Separated &nbsp;
                    ${checkedIcon(maritalStatus === 'Divorced')} Divorced
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
                  <span class="label">Skype ID: </span>
                  <span class="val">${safeVal(skypeId)}</span>
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalEmail.trim())) {
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
      gender: gender ? gender.toLowerCase() : 'male',
      designation: jobDesignation || 'Staff',
      department: department || 'General',
      salary: parseFloat(baseSalary || '0') || 0,
      gym_branch: location,
      joined_date: joiningDate,
      avatar: photoBase64 || undefined,
      face_image: photoBase64 || undefined,
      address: presentAddress || permanentAddress,
      emergency_contact: emergencyContactNo ? `${emergencyName} (${emergencyRelationship}): ${emergencyContactNo}` : undefined,
      skills: technicalSkills ? technicalSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      role: 'EMPLOYEE',
      meta_data: {
        form_title: 'PERSONAL DETAILS FORM',
        employee_code: employeeCode,
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
          department,
          designation: jobDesignation,
          joining_date: joiningDate,
          company_id: companyId,
          skype_id: skypeId,
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
          await apiClient.put(`/trainers/${employeeToEdit.id.replace('emp_', '')}`, payload);
        }
      } else {
        // Create new
        try {
          await apiClient.post('/hrms/employees', payload);
        } catch {
          await apiClient.post('/trainers', {
            full_name: payload.full_name,
            email: payload.email,
            phone: payload.phone,
            role: 'STAFF',
            specialization: payload.designation,
            base_monthly_salary: payload.salary,
            primary_gym_location: payload.gym_branch,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static animate-fade-in employee-modal-overlay">
      
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

      {/* Modal Dialog Window */}
      <div className="bg-white text-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col font-sans print:border-none print:shadow-none print:max-h-none print:w-full print:m-0 employee-modal-card">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 no-print border-b border-indigo-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Icon name="user-check" size={17} className="text-emerald-400" />
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-wider block leading-tight">
                {employeeToEdit ? 'Edit Employee Dossier' : 'Employee Registration & HR Dossier'}
              </span>
              <span className="text-[10px] text-blue-200 font-semibold">Official Personal Details Multi-Color Form</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm border border-blue-400/40 cursor-pointer"
              title="Print Official Form (Isolated)"
            >
              <Icon name="printer" size={14} />
              <span>Print Form</span>
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content / Printable Element */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 print:p-0 print:overflow-visible">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2 no-print">
              <Icon name="alert-circle" size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 no-print">
              <Icon name="check-circle" size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Printable Container Wrapper */}
          <div id="employee-printable-dossier" className="space-y-3.5">
            
            {/* Form Top Title */}
            <div className="text-center pb-2 border-b-2 border-blue-900 flex flex-col items-center">
              <h1 className="text-lg sm:text-xl font-black tracking-wider text-blue-950 uppercase">
                PERSONAL DETAILS FORM
              </h1>
              <span className="text-[10px] font-bold text-blue-700 tracking-wide uppercase">
                Official Staff Record & Biometric KYC
              </span>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* TOP SECTION: HR CODE & PASSPORT PHOTO                         */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-blue-900 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="grid grid-cols-12 divide-x-2 divide-blue-900">
                
                {/* Left Column: HR Block & Employee Details Table */}
                <div className="col-span-8 sm:col-span-9 flex flex-col">
                  
                  {/* Header HR & Code Row */}
                  <div className="grid grid-cols-2 divide-x-2 divide-blue-900 border-b-2 border-blue-900">
                    <div className="bg-sky-100 p-2 flex items-center">
                      <span className="font-black text-xs sm:text-sm text-sky-950 uppercase tracking-tight">
                        TO BE COMPLETED BY HR
                      </span>
                    </div>
                    <div className="bg-indigo-50 p-2 flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm text-indigo-950 whitespace-nowrap">
                        Employee Code:
                      </span>
                      <input
                        type="text"
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                        placeholder="EMP-001"
                        className="w-full bg-transparent font-black text-xs sm:text-sm text-indigo-700 outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* SECTION 1: EMPLOYEE DETAILS HEADER (Royal Blue Gradient) */}
                  <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>EMPLOYEE DETAILS</span>
                    <span className="text-[10px] text-blue-200 font-semibold">Section 1</span>
                  </div>

                  {/* Sub-table within top block */}
                  <div className="divide-y divide-blue-200 text-xs bg-blue-50/15">
                    
                    {/* Row 1: Name & Father Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Name:</span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full bg-transparent outline-none font-bold text-slate-900 px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Father Name:</span>
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          placeholder="Father's Name"
                          className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                    </div>

                    {/* Row 2: Date of Birth & Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Date of Birth:</span>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => handleDobChange(e.target.value)}
                          className="w-full bg-transparent outline-none text-slate-900 text-xs px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Age:</span>
                        <input
                          type="text"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Age"
                          className="w-20 bg-transparent outline-none text-blue-900 font-bold px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                    </div>

                    {/* Row 3: Area of service & Caste */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Area of service:</span>
                        <input
                          type="text"
                          value={areaOfService}
                          onChange={(e) => setAreaOfService(e.target.value)}
                          placeholder="E.g. Training, Operations"
                          className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                      <div className="p-1.5 flex items-center gap-2">
                        <span className="font-bold text-blue-950 shrink-0">Caste:</span>
                        <input
                          type="text"
                          value={caste}
                          onChange={(e) => setCaste(e.target.value)}
                          placeholder="Caste"
                          className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-blue-100/50"
                        />
                      </div>
                    </div>

                  </div>

                </div>

                {/* Right Column: Passport Photo Box */}
                <div className="col-span-4 sm:col-span-3 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-sky-50/50 to-blue-50/50 relative min-h-[160px]">
                  {photoBase64 ? (
                    <div className="relative group w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={photoBase64}
                        alt="Passport"
                        className="w-28 h-36 sm:w-32 sm:h-40 object-cover border-2 border-blue-600 rounded-lg shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoBase64(null)}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md shadow-sm opacity-90 hover:opacity-100 no-print cursor-pointer"
                        title="Remove Photo"
                      >
                        <Icon name="trash-2" size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                      <span className="font-black text-base sm:text-lg text-blue-300 tracking-widest uppercase">
                        PHOTO
                      </span>
                      <span className="text-[10px] text-blue-400 mt-0.5 font-semibold no-print">Passport Size</span>
                      
                      <div className="flex flex-col gap-1.5 mt-2 w-full max-w-[130px] no-print">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition"
                        >
                          <Icon name="camera" size={12} /> Camera
                        </button>
                        <label className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-[10px] font-bold text-center cursor-pointer transition">
                          Upload
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* EMPLOYEE DETAILS Continued (Full Width Grid Rows) */}
              <div className="divide-y divide-blue-200 border-t-2 border-blue-900 text-xs bg-blue-50/15">
                
                {/* Row 4: Blood Group & Religion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-blue-950 shrink-0">Blood Group:</span>
                    <input
                      type="text"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
                      placeholder="E.g. O+, B+, A+"
                      className="w-full bg-transparent outline-none font-bold text-rose-700 px-1 py-0.5 focus:bg-blue-100/50 uppercase"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-blue-950 shrink-0">Religion:</span>
                    <input
                      type="text"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      placeholder="Religion"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-blue-100/50"
                    />
                  </div>
                </div>

                {/* Row 5: Gender & Marital Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                  
                  {/* Gender */}
                  <div className="p-1.5 flex items-center gap-4">
                    <span className="font-bold text-blue-950 shrink-0">Gender:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-blue-950">
                      <input
                        type="checkbox"
                        checked={gender === 'Male'}
                        onChange={() => setGender(gender === 'Male' ? '' : 'Male')}
                        className="w-4 h-4 rounded border-blue-400 text-blue-700 accent-blue-700"
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-blue-950">
                      <input
                        type="checkbox"
                        checked={gender === 'Female'}
                        onChange={() => setGender(gender === 'Female' ? '' : 'Female')}
                        className="w-4 h-4 rounded border-blue-400 text-blue-700 accent-blue-700"
                      />
                      <span>Female</span>
                    </label>
                  </div>

                  {/* Marital Status */}
                  <div className="p-1.5 flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-950 shrink-0">Marital Status:</span>
                    {['Married', 'Single', 'Separated', 'Divorced', 'Widowed'].map((status) => (
                      <label key={status} className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-800 mr-1.5">
                        <input
                          type="checkbox"
                          checked={maritalStatus === status}
                          onChange={() => setMaritalStatus(maritalStatus === status ? '' : status)}
                          className="w-3.5 h-3.5 rounded border-blue-400 accent-blue-700"
                        />
                        <span>{status}</span>
                      </label>
                    ))}
                  </div>

                </div>

                {/* Row 6: Work Experience */}
                <div className="p-1.5 flex items-center gap-2">
                  <span className="font-bold text-blue-950 shrink-0">Work Experience:</span>
                  <input
                    type="text"
                    value={workExperienceYears}
                    onChange={(e) => setWorkExperienceYears(e.target.value)}
                    placeholder="E.g. 5 Years in relevant industry"
                    className="w-full bg-transparent outline-none text-blue-900 font-semibold px-1 py-0.5 focus:bg-blue-100/50"
                  />
                </div>

                {/* Row 7: Contact No & Personal Email ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-blue-950 shrink-0">Contact No:<span className="text-rose-500 ml-0.5">*</span></span>
                    <input
                      type="tel"
                      required
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      placeholder="Mobile / Phone Number"
                      className="w-full bg-transparent outline-none font-black text-blue-700 px-1 py-0.5 focus:bg-blue-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-blue-950 shrink-0">Personal Email ID:<span className="text-rose-500 ml-0.5">*</span></span>
                    <input
                      type="email"
                      required
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-blue-100/50 font-medium"
                    />
                  </div>
                </div>

                {/* Row 8: Present Address & Permanent Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
                  <div className="p-2">
                    <span className="font-bold text-blue-950 block mb-1">Present Address:</span>
                    <textarea
                      rows={2}
                      value={presentAddress}
                      onChange={(e) => setPresentAddress(e.target.value)}
                      placeholder="Door No, Street, Landmark, Village/City, Mandal, District, State, PIN"
                      className="w-full bg-white/70 outline-none text-slate-900 text-xs p-1.5 focus:bg-white resize-none border border-blue-200 rounded-lg"
                    />
                  </div>
                  <div className="p-2">
                    <span className="font-bold text-blue-950 block mb-1">Permanent Address:</span>
                    <textarea
                      rows={2}
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      placeholder="Door No, Street, Landmark, Village/City, Mandal, District, State, PIN"
                      className="w-full bg-white/70 outline-none text-slate-900 text-xs p-1.5 focus:bg-white resize-none border border-blue-200 rounded-lg"
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 2: EMERGENCY CONTACT DETAILS (Amber Gradient)        */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-amber-600 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>EMERGENCY CONTACT DETAILS</span>
                <span className="text-[10px] text-amber-100 font-semibold">Section 2</span>
              </div>
              
              <div className="divide-y divide-amber-200 bg-amber-50/15">
                {/* Row 1: Full Name & Relationship */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-amber-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-amber-950 shrink-0">Full Name:</span>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact Name"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-amber-100/50 font-medium"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-amber-950 shrink-0">Relationship:</span>
                    <input
                      type="text"
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      placeholder="Spouse / Parent / Sibling / Friend"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-amber-100/50"
                    />
                  </div>
                </div>

                {/* Row 2: Address & Contact No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-amber-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-amber-950 shrink-0">Address:</span>
                    <input
                      type="text"
                      value={emergencyAddress}
                      onChange={(e) => setEmergencyAddress(e.target.value)}
                      placeholder="Address of emergency contact"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-amber-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-amber-950 shrink-0">Contact No:</span>
                    <input
                      type="tel"
                      value={emergencyContactNo}
                      onChange={(e) => setEmergencyContactNo(e.target.value)}
                      placeholder="Phone Number"
                      className="w-full bg-transparent outline-none font-bold text-amber-900 px-1 py-0.5 focus:bg-amber-100/50"
                    />
                  </div>
                </div>

                {/* Row 3: Note */}
                <div className="p-1.5 flex items-center gap-2">
                  <span className="font-bold text-amber-950 shrink-0">Note:</span>
                  <input
                    type="text"
                    value={emergencyNote}
                    onChange={(e) => setEmergencyNote(e.target.value)}
                    placeholder="Special medical conditions / blood donor notes"
                    className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-amber-100/50"
                  />
                </div>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 3: POST DETAILS (Purple Gradient)                     */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-purple-700 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-purple-700 via-violet-700 to-purple-800 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>POST DETAILS</span>
                <span className="text-[10px] text-purple-200 font-semibold">Section 3</span>
              </div>
              
              <div className="divide-y divide-purple-200 bg-purple-50/15">
                {/* Row 1: Location & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-purple-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Location:</span>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Branch / Campus Location"
                      className="w-full bg-transparent outline-none text-purple-900 px-1 py-0.5 focus:bg-purple-100/50 font-bold"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Department:</span>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Department"
                      className="w-full bg-transparent outline-none text-purple-900 px-1 py-0.5 focus:bg-purple-100/50 font-bold"
                    />
                  </div>
                </div>

                {/* Row 2: Job Designation & Joining Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-purple-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Job Designation:</span>
                    <input
                      type="text"
                      value={jobDesignation}
                      onChange={(e) => setJobDesignation(e.target.value)}
                      placeholder="E.g. Senior Lecturer / Coach"
                      className="w-full bg-transparent outline-none font-bold text-slate-900 px-1 py-0.5 focus:bg-purple-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Joining Date:</span>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full bg-transparent outline-none text-slate-900 text-xs px-1 py-0.5 focus:bg-purple-100/50 font-medium"
                    />
                  </div>
                </div>

                {/* Row 3: Company ID & Skype ID / Monthly Salary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-purple-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Company ID:</span>
                    <input
                      type="text"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                      placeholder="Staff / Bio ID"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-purple-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Skype ID:</span>
                    <input
                      type="text"
                      value={skypeId}
                      onChange={(e) => setSkypeId(e.target.value)}
                      placeholder="Skype / Handle"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-purple-100/50"
                    />
                  </div>
                </div>

                {/* Row 4: Technical Skills & Salary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-purple-200">
                  <div className="sm:col-span-2 p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Technical Skills:</span>
                    <input
                      type="text"
                      value={technicalSkills}
                      onChange={(e) => setTechnicalSkills(e.target.value)}
                      placeholder="Certifications, Special Skills, Domains"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-purple-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-purple-950 shrink-0">Monthly Salary (₹):</span>
                    <input
                      type="number"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(e.target.value)}
                      placeholder="Gross Pay"
                      className="w-full bg-transparent outline-none font-black text-emerald-700 px-1 py-0.5 focus:bg-purple-100/50"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 4: BANK DETAILS (Emerald Gradient)                    */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-emerald-700 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>BANK DETAILS - Please ensure that you have a completed and SIGNED form</span>
                <span className="text-[10px] text-emerald-200 font-semibold">Section 4</span>
              </div>
              
              <div className="divide-y divide-emerald-200 bg-emerald-50/15">
                {/* Row 1: Account Holders Name */}
                <div className="p-1.5 flex items-center gap-2">
                  <span className="font-bold text-emerald-950 shrink-0">Account Holders Name:</span>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Full name as printed in bank passbook"
                    className="w-full bg-transparent outline-none font-bold text-slate-900 px-1 py-0.5 focus:bg-emerald-100/50"
                  />
                </div>

                {/* Row 2: Name of Bank & Account Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Name of Bank:</span>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Bank Name (e.g. SBI, HDFC, ICICI)"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-emerald-100/50 font-medium"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Account Number:</span>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full bg-transparent outline-none font-mono font-bold text-emerald-800 px-1 py-0.5 focus:bg-emerald-100/50"
                    />
                  </div>
                </div>

                {/* Row 3: Branch(City) & Bank Account Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Branch(City):</span>
                    <input
                      type="text"
                      value={bankBranchCity}
                      onChange={(e) => setBankBranchCity(e.target.value)}
                      placeholder="Branch City"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-emerald-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Bank Account Type:</span>
                    <select
                      value={bankAccountType}
                      onChange={(e) => setBankAccountType(e.target.value)}
                      className="w-full bg-transparent outline-none font-bold text-emerald-900 px-1 py-0.5 focus:bg-emerald-100/50"
                    >
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                      <option value="Salary">Salary</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Branch Code (IFSC) No & Pan No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-emerald-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Branch Code (IFSC) No:</span>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="IFSC Code (e.g. SBIN0001234)"
                      className="w-full bg-transparent outline-none font-mono uppercase font-bold text-slate-900 px-1 py-0.5 focus:bg-emerald-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-emerald-950 shrink-0">Pan No:</span>
                    <input
                      type="text"
                      value={panNo}
                      onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                      placeholder="PAN (e.g. ABCDE1234F)"
                      className="w-full bg-transparent outline-none font-mono uppercase font-black text-slate-900 px-1 py-0.5 focus:bg-emerald-100/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 5: WORK EXPERIENCE DETAILS (Cyan Gradient)           */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-cyan-800 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-cyan-800 via-sky-800 to-blue-900 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>WORK EXPERIENCE DETAILS</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-200 font-semibold">Section 5</span>
                  <button
                    type="button"
                    onClick={addExperienceRow}
                    className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold flex items-center gap-1 no-print cursor-pointer transition shadow-xs"
                  >
                    <Icon name="plus" size={11} />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cyan-100/80 text-[10px] font-black text-cyan-950 uppercase tracking-tight border-b-2 border-cyan-800 divide-x divide-cyan-300">
                      <th className="p-1.5 w-1/4">DURATION<br/><span className="font-normal text-[9px] lowercase">(month-year) to (month-year)</span></th>
                      <th className="p-1.5 w-1/4">COMPANY<br/><span className="font-normal text-[9px] lowercase">(name & place)</span></th>
                      <th className="p-1.5 w-1/6">DESIG-NATION<br/><span className="font-normal text-[9px] lowercase">(last)</span></th>
                      <th className="p-1.5 w-1/6">LAST GROSS SALARY</th>
                      <th className="p-1.5">REASONS FOR LEAVING</th>
                      <th className="p-1 text-center w-8 no-print">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-200">
                    {experienceRows.map((row, idx) => (
                      <tr key={idx} className="divide-x divide-cyan-200 hover:bg-cyan-50/40">
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.duration}
                            onChange={(e) => updateExperienceRow(idx, 'duration', e.target.value)}
                            placeholder="e.g. 06/2021 to 08/2023"
                            className="w-full bg-transparent outline-none text-slate-900 text-xs px-1"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.company}
                            onChange={(e) => updateExperienceRow(idx, 'company', e.target.value)}
                            placeholder="Company, City"
                            className="w-full bg-transparent outline-none text-slate-900 text-xs px-1 font-medium"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.designation}
                            onChange={(e) => updateExperienceRow(idx, 'designation', e.target.value)}
                            placeholder="Role"
                            className="w-full bg-transparent outline-none text-slate-900 text-xs px-1"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.lastSalary}
                            onChange={(e) => updateExperienceRow(idx, 'lastSalary', e.target.value)}
                            placeholder="₹ 30,000"
                            className="w-full bg-transparent outline-none text-emerald-800 text-xs px-1 font-bold"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.reasonForLeaving}
                            onChange={(e) => updateExperienceRow(idx, 'reasonForLeaving', e.target.value)}
                            placeholder="Career Advancement"
                            className="w-full bg-transparent outline-none text-slate-900 text-xs px-1"
                          />
                        </td>
                        <td className="p-1 text-center no-print">
                          <button
                            type="button"
                            onClick={() => removeExperienceRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                            title="Delete Row"
                          >
                            <Icon name="trash-2" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 6: REFERENCE CONTACT DETAILS (Rose Gradient)          */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-rose-700 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>REFERENCE CONTACT DETAILS</span>
                <span className="text-[10px] text-rose-200 font-semibold">Section 6</span>
              </div>
              
              <div className="divide-y divide-rose-200 bg-rose-50/15">
                {/* Row 1: Name & Company */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rose-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Name:</span>
                    <input
                      type="text"
                      value={refName}
                      onChange={(e) => setRefName(e.target.value)}
                      placeholder="Reference Person"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-rose-100/50 font-medium"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Company:</span>
                    <input
                      type="text"
                      value={refCompany}
                      onChange={(e) => setRefCompany(e.target.value)}
                      placeholder="Organization"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-rose-100/50 font-medium"
                    />
                  </div>
                </div>

                {/* Row 2: Address & Post */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rose-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Address:</span>
                    <input
                      type="text"
                      value={refAddress}
                      onChange={(e) => setRefAddress(e.target.value)}
                      placeholder="Location / Address"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-rose-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Post:</span>
                    <input
                      type="text"
                      value={refPost}
                      onChange={(e) => setRefPost(e.target.value)}
                      placeholder="Designation of referee"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-rose-100/50"
                    />
                  </div>
                </div>

                {/* Row 3: Telephone Number & Contact No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rose-200">
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Telephone Number:</span>
                    <input
                      type="tel"
                      value={refTelephone}
                      onChange={(e) => setRefTelephone(e.target.value)}
                      placeholder="Landline / Tel"
                      className="w-full bg-transparent outline-none text-slate-900 px-1 py-0.5 focus:bg-rose-100/50"
                    />
                  </div>
                  <div className="p-1.5 flex items-center gap-2">
                    <span className="font-bold text-rose-950 shrink-0">Contact No:</span>
                    <input
                      type="tel"
                      value={refContactNo}
                      onChange={(e) => setRefContactNo(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full bg-transparent outline-none font-bold text-rose-900 px-1 py-0.5 focus:bg-rose-100/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SECTION 7: UNDERSTANDING OF LANGUAGE (Indigo Gradient)        */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="border-2 border-indigo-800 rounded-xl overflow-hidden bg-white shadow-xs text-xs">
              <div className="bg-gradient-to-r from-indigo-800 via-purple-900 to-slate-900 text-white px-3 py-1 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                <span>UNDERSTANDING OF LANGUAGE</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-200 font-semibold">Section 7</span>
                  <button
                    type="button"
                    onClick={() => setShowAddLang(!showAddLang)}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold flex items-center gap-1 no-print cursor-pointer transition shadow-xs"
                  >
                    <Icon name="plus" size={11} />
                    <span>Add Language</span>
                  </button>
                </div>
              </div>

              {showAddLang && (
                <div className="p-2 bg-indigo-50 border-b-2 border-indigo-800 flex items-center gap-2 no-print">
                  <input
                    type="text"
                    value={newLanguageInput}
                    onChange={(e) => setNewLanguageInput(e.target.value)}
                    placeholder="Enter language name (e.g. Tamil, Kannada, Marathi)..."
                    className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs flex-1 outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomLanguage(); } }}
                  />
                  <button
                    type="button"
                    onClick={addCustomLanguage}
                    className="px-3 py-1 bg-indigo-800 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-900"
                  >
                    Add
                  </button>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-indigo-100/80 text-[10px] font-black text-indigo-950 uppercase tracking-tight border-b-2 border-indigo-800 divide-x divide-indigo-200">
                      <th className="p-1.5 text-left w-2/5 pl-3">LANGUANGE</th>
                      <th className="p-1.5 w-1/5">READ</th>
                      <th className="p-1.5 w-1/5">WRITE</th>
                      <th className="p-1.5 w-1/5">SPEAK</th>
                      <th className="p-1 w-8 no-print">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-200 font-bold">
                    {languageList.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-indigo-200 hover:bg-indigo-50/40">
                        <td className="p-1.5 text-left text-slate-900 font-black pl-3">
                          {item.language}
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.read}
                            onChange={() => toggleLanguageSkill(idx, 'read')}
                            className="w-4 h-4 rounded border-indigo-400 accent-indigo-700 cursor-pointer"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.write}
                            onChange={() => toggleLanguageSkill(idx, 'write')}
                            className="w-4 h-4 rounded border-indigo-400 accent-indigo-700 cursor-pointer"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.speak}
                            onChange={() => toggleLanguageSkill(idx, 'speak')}
                            className="w-4 h-4 rounded border-indigo-400 accent-indigo-700 cursor-pointer"
                          />
                        </td>
                        <td className="p-1 text-center no-print">
                          {languageList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLanguage(idx)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
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

          </div>

          {/* Modal Bottom Actions (Hidden in Print) */}
          <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 no-print">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
              <Icon name="shield-check" size={16} className="text-emerald-600" />
              <span>Official Multi-Color HR Form • Verified Staff KYC & Biometrics</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-400 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 hover:from-blue-800 hover:to-black text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Details...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check-circle" size={16} />
                    <span>{employeeToEdit ? 'Update Employee Record' : 'Enroll Employee'}</span>
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
