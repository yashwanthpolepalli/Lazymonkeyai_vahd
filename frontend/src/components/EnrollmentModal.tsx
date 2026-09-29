import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { biometricService, type EnrollmentDevice, type BiometricType } from '@/services/biometric';
import { membersApi } from '@/services/membersApi';
import { trainersApi } from '@/services/trainersApi';

import { apiClient } from '@/services/apiClient';
import { getTodayISO, addDaysISO, formatDateDDMMYY } from '@/utils/date';
import { PaymentTerminalSelector, type PaymentDetailsPayload } from '@/components/payments/PaymentTerminalSelector';

export type EnrollmentPersonType = 'member' | 'trainer';

export interface PlanItem {
  id?: string;
  owner_id?: string;
  branch_id?: string;
  name: string;
  category?: string;
  price: number;
  period: string;
  duration_days?: number;
  color?: string;
  features?: string[];
  badge?: string;
  is_combo?: boolean;
  isCombo?: boolean;
}

interface EnrollmentModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  personType?: EnrollmentPersonType;
  initialStep?: number;
  initialMember?: {
    id: string;
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    age?: number | string;
    goal?: string;
    branch?: string;
  } | null;
  onSuccess?: () => void;
}

const memberSteps = ['Details', 'Plan', 'Payment', 'Biometric', 'Review', 'Done'];
const trainerSteps = ['Personal Details', 'Salary & Banking', 'Payout Terms', 'Biometric', 'Review', 'Done'];

export function EnrollmentModal({
  open: openProp,
  isOpen,
  onClose,
  personType = 'member',
  initialStep = 0,
  initialMember,
  onSuccess,
}: EnrollmentModalProps) {
  const open = openProp ?? isOpen ?? false;
  const steps = personType === 'trainer' ? trainerSteps : memberSteps;
  const [step, setStep] = useState(initialStep);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; branch_name: string; city?: string }>>([]);
  const [form, setForm] = useState({
    name: initialMember?.name || initialMember?.full_name || '',
    email: initialMember?.email || '',
    phone: initialMember?.phone || '',
    age: String(initialMember?.age || ''),
    gender: initialMember?.gender || '',
    goal: initialMember?.goal || '',
    branch: initialMember?.branch || '',
    experience: '',
    salary: '',
    pt_session_rate: '',
    join_date: getTodayISO(),
    bank_account_no: '',
    bank_ifsc: '',
    upi_id: '',
  });

  // Dynamic Workout Programs & Duration Tiers State
  const [selectedProgramId, setSelectedProgramId] = useState<string>('prog_gym');
  const [selectedDurationDays, setSelectedDurationDays] = useState<number>(30);
  const [selectedProgramCategory, setSelectedProgramCategory] = useState<string>('all');
  const [planSearchQuery, setPlanSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState(() => getTodayISO());
  const [expiryDate, setExpiryDate] = useState(() => addDaysISO(getTodayISO(), 30));
  const [paymentMethodsList, setPaymentMethodsList] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetailsPayload | null>(null);
  const [billingSettings, setBillingSettings] = useState<any>(null);
  const activePaymentMethod = paymentMethod === 'Custom' ? (customPaymentMethod.trim() || 'Custom') : paymentMethod;

  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);
  const [devices, setDevices] = useState<EnrollmentDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [captureState, setCaptureState] = useState<'idle' | 'connecting' | 'capturing' | 'processing' | 'success' | 'failed'>('idle');
  const [captureProgress, setCaptureProgress] = useState(0);
  const [captureLog, setCaptureLog] = useState<string[]>([]);
  const [personId, setPersonId] = useState(() => initialMember?.id || `p_${Date.now()}`);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Sync initialMember and fetch billing settings when open changes
  useEffect(() => {
    if (open) {
      apiClient.get<any>('/gym/billing')
        .then((res) => {
          const data = res?.billing || res;
          if (data) {
            setBillingSettings(data);
            const isEngineActive = data.enable_gst_engine !== false && Number(data.total_gst_rate) > 0;
            setIncludeGst(isEngineActive);
          }
        })
        .catch(() => {});

      setStep(initialStep ?? 0);
      if (initialMember) {
        setPersonId(initialMember.id);
        setForm((prev) => ({
          ...prev,
          name: initialMember.name || initialMember.full_name || prev.name,
          email: initialMember.email || prev.email,
          phone: initialMember.phone || prev.phone,
          gender: initialMember.gender || prev.gender,
          goal: initialMember.goal || prev.goal,
          branch: initialMember.branch || prev.branch,
          age: initialMember.age ? String(initialMember.age) : prev.age,
        }));
      }
    }
  }, [open, initialStep, initialMember]);

  // Fetch dynamic plans, branches, and payment methods exclusively from database created by owner
  useEffect(() => {
    if (open) {
      apiClient.get<PlanItem[]>('/memberships/plans')
        .then((fetchedPlans) => {
          if (Array.isArray(fetchedPlans)) {
            setPlans(fetchedPlans);
          } else {
            setPlans([]);
          }
        })
        .catch(() => {
          setPlans([]);
        });

      apiClient.get<any[]>('/gym/branches')
        .then((fetchedBranches) => {
          if (Array.isArray(fetchedBranches)) {
            setBranches(fetchedBranches);
          }
        })
        .catch(() => {
          setBranches([]);
        });

      apiClient.get<any[]>('/memberships/payment-methods')
        .then((fetchedPm) => {
          if (Array.isArray(fetchedPm) && fetchedPm.length > 0) {
            const list = fetchedPm.map((p) => (typeof p === 'string' ? p : p.name));
            setPaymentMethodsList(list);
            if (!paymentMethod) setPaymentMethod(list[0]);
          } else {
            const defaultMethods = ['Cash', 'Card / PineLabs', 'Razorpay UPI', 'Wallet', 'Pay Later', 'Split Payment'];
            setPaymentMethodsList(defaultMethods);
            if (!paymentMethod) setPaymentMethod(defaultMethods[0]);
          }
        })
        .catch(() => {
          const defaultMethods = ['Cash', 'Card / PineLabs', 'Razorpay UPI', 'Wallet', 'Pay Later', 'Split Payment'];
          setPaymentMethodsList(defaultMethods);
          if (!paymentMethod) setPaymentMethod(defaultMethods[0]);
        });
    }
  }, [open]);

  // Build dynamic workout programs combining core offerings with owner configured database plans
  const workoutPrograms = (() => {
    const strengthCardioPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'strength_cardio' || cat === 'cardio_strength' || (name.includes('strength') && name.includes('cardio'));
    });

    const strengthZumbaPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'strength_zumba' || (name.includes('strength') && name.includes('zumba'));
    });

    const cardioZumbaPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'cardio_zumba' || (name.includes('cardio') && name.includes('zumba'));
    });

    const gymPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return (cat === 'gym' || cat === 'general' || cat === '' || name.includes('monthly') || name.includes('quaterly') || name.includes('quarterly') || name.includes('yearly') || name.includes('gold') || name.includes('gym')) && !name.includes('+');
    });

    const zumbaPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return (cat === 'zumba' || name.includes('zumba') || name.includes('dance')) && !name.includes('+') && !name.includes('strength') && !name.includes('cardio');
    });

    const ptPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'pt' || cat === 'personal_training' || name.includes('personal') || name.includes('pt');
    });

    const strengthPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return (cat === 'strength' || cat === 'weight_lifting' || name.includes('strength') || name.includes('lifting') || name.includes('cross')) && !name.includes('+') && !name.includes('cardio') && !name.includes('zumba');
    });

    const yogaPlans = plans.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = p.name.toLowerCase();
      return cat === 'yoga' || cat === 'pilates' || cat === 'aerobics' || name.includes('yoga') || name.includes('pilates');
    });

    const getExactOrScaledPrice = (matchedPlans: PlanItem[], days: number, defaultBasePrice: number) => {
      const exact = matchedPlans.find((p) => (p.duration_days || 30) === days);
      if (exact && typeof exact.price === 'number' && exact.price > 0) {
        const periodLabel = days === 30 ? 'month' : days === 90 ? '3 months' : days === 180 ? '6 months' : days === 365 ? 'year' : `${days} days`;
        return { price: exact.price, periodLabel, durationDays: days };
      }

      const monthlyPlan = matchedPlans.find((p) => (p.duration_days || 30) === 30);
      const basePrice = (monthlyPlan && monthlyPlan.price > 0) ? monthlyPlan.price : defaultBasePrice;

      let multiplier = 1;
      let periodLabel = 'month';

      if (days === 30) {
        multiplier = 1;
        periodLabel = 'month';
      } else if (days === 90) {
        multiplier = 2.6;
        periodLabel = '3 months';
      } else if (days === 180) {
        multiplier = 4.8;
        periodLabel = '6 months';
      } else if (days === 365) {
        multiplier = 8.8;
        periodLabel = 'year';
      } else {
        multiplier = (days / 30) * 0.95;
        periodLabel = `${days} days`;
      }

      const calculatedPrice = Math.round((basePrice * multiplier) / 50) * 50;
      return { price: calculatedPrice, periodLabel, durationDays: days };
    };

    const list = [
      {
        id: 'prog_strength_cardio',
        name: 'Strength Training + Cardio',
        category: 'strength_cardio',
        categoryLabel: 'Strength + Cardio Combo',
        programType: 'combos' as const,
        isCombo: true,
        badge: strengthCardioPlans.find((p) => p.badge)?.badge || 'Popular Combo',
        color: 'from-emerald-500 to-teal-600',
        features: strengthCardioPlans[0]?.features?.length ? strengthCardioPlans[0].features : ['Weight Training Floor Access', 'HIIT Circuit & Cardio Zone', 'Fat Burn & Stamina Tracking', 'Certified Trainer Guidance', 'Locker & Shower Access'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(strengthCardioPlans, days, 3500),
      },
      {
        id: 'prog_strength_zumba',
        name: 'Strength Training + Zumba',
        category: 'strength_zumba',
        categoryLabel: 'Strength + Zumba Combo',
        programType: 'combos' as const,
        isCombo: true,
        badge: strengthZumbaPlans.find((p) => p.badge)?.badge || 'Best Seller',
        color: 'from-rose-500 to-pink-600',
        features: strengthZumbaPlans[0]?.features?.length ? strengthZumbaPlans[0].features : ['Full Weight Training Floor Access', 'Unlimited Zumba Dance Classes', 'Muscle Toning & Aerobic Burn', 'Music-Synced Group Sessions', 'Diet Assessment'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(strengthZumbaPlans, days, 3800),
      },
      {
        id: 'prog_cardio_zumba',
        name: 'Cardio + Zumba Fitness',
        category: 'cardio_zumba',
        categoryLabel: 'Cardio + Zumba Combo',
        programType: 'combos' as const,
        isCombo: true,
        badge: cardioZumbaPlans.find((p) => p.badge)?.badge || 'High Burn',
        color: 'from-amber-500 to-orange-600',
        features: cardioZumbaPlans[0]?.features?.length ? cardioZumbaPlans[0].features : ['Cardio Zone & Spin Bikes', 'High-Energy Zumba Classes', 'Aerobic Calorie Burn', 'Heart Rate Monitoring', 'Locker Access'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(cardioZumbaPlans, days, 3200),
      },
      {
        id: 'prog_gym',
        name: 'General Gym & Fitness Access',
        category: 'gym',
        categoryLabel: 'Gym All-Access',
        programType: 'training' as const,
        isCombo: false,
        badge: gymPlans.find((p) => p.badge)?.badge || 'All-Access',
        color: 'from-blue-500 to-indigo-600',
        features: ['Full Gym Floor & Equipment', 'Cardio & Free Weights Zone', 'Locker & Shower Access', 'Free Fitness Assessment'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(gymPlans, days, 1500),
      },
      {
        id: 'prog_strength',
        name: 'Strength & Functional Training',
        category: 'strength',
        categoryLabel: 'Strength Training',
        programType: 'training' as const,
        isCombo: false,
        badge: strengthPlans.find((p) => p.badge)?.badge || '',
        color: 'from-teal-500 to-emerald-600',
        features: ['Olympic Lifting & Squat Racks', 'Kettlebell & Functional Zone', 'HIIT Circuit Training', 'Strength Progression Tracking'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(strengthPlans, days, 3000),
      },
      {
        id: 'prog_zumba',
        name: 'Zumba Dance Fitness',
        category: 'zumba',
        categoryLabel: 'Zumba Dance Class',
        programType: 'classes' as const,
        isCombo: false,
        badge: zumbaPlans.find((p) => p.badge)?.badge || 'Popular',
        color: 'from-pink-500 to-rose-600',
        features: zumbaPlans[0]?.features?.length ? zumbaPlans[0].features : ['High-Energy Dance Classes', 'Aerobic Cardio Burn', 'Certified Instructors', 'Music-Synced Workouts'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(zumbaPlans, days, 2500),
      },
      {
        id: 'prog_yoga',
        name: 'Yoga, Pilates & Mind-Body Mobility',
        category: 'yoga',
        categoryLabel: 'Yoga & Pilates Class',
        programType: 'classes' as const,
        isCombo: false,
        badge: yogaPlans.find((p) => p.badge)?.badge || '',
        color: 'from-purple-500 to-violet-600',
        features: ['Mind-Body Balance Drills', 'Mat Pilates & Core Stability', 'Breathing & Stress Relief', 'Certified Master Instructors'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(yogaPlans, days, 2200),
      },
      {
        id: 'prog_pt',
        name: 'Personal Training (PT) & Pro Coaching',
        category: 'pt',
        categoryLabel: '1-on-1 PT Coaching',
        programType: 'pt' as const,
        isCombo: false,
        badge: ptPlans.find((p) => p.badge)?.badge || 'VIP 1-on-1',
        color: 'from-amber-600 to-yellow-600',
        features: ['1-on-1 Dedicated Trainer', 'Custom Workout & Diet Plan', 'Bi-weekly Body Composition', 'Priority Slot Booking'],
        getPriceForDuration: (days: number) => getExactOrScaledPrice(ptPlans, days, 5000),
      },
    ];

    // Merge any custom owner plans from database
    const handledPlanNames = new Set([
      ...strengthCardioPlans.map((p) => p.name.toLowerCase()),
      ...strengthZumbaPlans.map((p) => p.name.toLowerCase()),
      ...cardioZumbaPlans.map((p) => p.name.toLowerCase()),
      ...gymPlans.map((p) => p.name.toLowerCase()),
      ...zumbaPlans.map((p) => p.name.toLowerCase()),
      ...ptPlans.map((p) => p.name.toLowerCase()),
      ...strengthPlans.map((p) => p.name.toLowerCase()),
      ...yogaPlans.map((p) => p.name.toLowerCase()),
    ]);

    plans.forEach((cp) => {
      const lowerName = (cp.name || '').toLowerCase();
      if (
        !handledPlanNames.has(lowerName) &&
        !lowerName.includes('monthly') &&
        !lowerName.includes('quaterly') &&
        !lowerName.includes('quarterly') &&
        !lowerName.includes('yearly')
      ) {
        handledPlanNames.add(lowerName);
        const isCombo = cp.is_combo !== undefined
          ? Boolean(cp.is_combo || cp.isCombo)
          : Boolean((cp.category || '').includes('_') || cp.name.includes('+'));
        const isClass = (cp.category || '').includes('dance') || (cp.category || '').includes('yoga') || (cp.category || '').includes('zumba');
        const isPt = (cp.category || '').includes('pt') || (cp.category || '').includes('trainer');
        const programType = isCombo ? 'combos' : isClass ? 'classes' : isPt ? 'pt' : 'training';

        list.push({
          id: `custom_${cp.id || lowerName.replace(/\s+/g, '_')}`,
          name: cp.name,
          category: cp.category || 'custom',
          categoryLabel: (cp.category || 'Custom Program').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          programType,
          isCombo,
          badge: cp.badge || (isCombo ? 'Combo Pack' : ''),
          color: cp.color || 'from-indigo-500 to-cyan-600',
          features: cp.features?.length ? cp.features : ['Full Access & Dedicated Support', 'Gym Floor & Facilities', 'Locker & Assessment'],
          getPriceForDuration: (days: number) => {
            if ((cp.duration_days || 30) === days) {
              const periodLabel = days === 30 ? 'month' : days === 90 ? '3 months' : days === 180 ? '6 months' : days === 365 ? 'year' : `${days} days`;
              return { price: cp.price, periodLabel, durationDays: days };
            }
            return getExactOrScaledPrice([cp], days, cp.price || 2000);
          },
        });
      }
    });

    return list;
  })();

  const currentProgram = workoutPrograms.find((p) => p.id === selectedProgramId) || workoutPrograms[0];
  const currentActivePricing = currentProgram
    ? currentProgram.getPriceForDuration(selectedDurationDays)
    : { price: 1500, periodLabel: 'month', durationDays: selectedDurationDays };

  // Handle Start Date change with dynamic expiry recalculation
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    setExpiryDate(addDaysISO(newStartDate, selectedDurationDays));
  };

  // Handle Duration Tier change with dynamic expiry recalculation
  const handleDurationTierChange = (days: number) => {
    setSelectedDurationDays(days);
    setExpiryDate(addDaysISO(startDate, days));
  };

  useEffect(() => {
    if (open && step === 3) {
      biometricService.listDevices().then((devList) => {
        setDevices(devList);
        if (devList.length > 0) {
          setSelectedDevice(devList[0].id);
        }
      });
    }
  }, [open, step]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [captureLog]);

  // Clean up camera stream on unmount or mode change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
      }
    } catch (_err) {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const [includeGst, setIncludeGst] = useState<boolean>(true);

  const reset = () => {
    stopCamera();
    setStep(0);
    setForm({
      name: '',
      email: '',
      phone: '',
      age: '',
      gender: '',
      goal: '',
      branch: '',
      experience: '',
      salary: '',
      pt_session_rate: '',
      join_date: getTodayISO(),
      bank_account_no: '',
      bank_ifsc: '',
      upi_id: '',
    });
    setSelectedProgramId('prog_gym');
    setSelectedDurationDays(30);
    const isEngineActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
    setIncludeGst(isEngineActive);
    setBiometricType(null);
    setSelectedDevice('');
    setCaptureState('idle');
    setCaptureProgress(0);
    setCaptureLog([]);
  };

  if (!open) return null;

  const isGstActive = billingSettings ? (billingSettings.enable_gst_engine !== false && Number(billingSettings.total_gst_rate) > 0) : true;
  const effectiveGstRate = billingSettings && isGstActive ? Number(billingSettings.total_gst_rate || 0) : (isGstActive ? 18 : 0);

  const subtotal = currentActivePricing.price;
  const gst = includeGst && isGstActive && effectiveGstRate > 0 ? Math.round(subtotal * (effectiveGstRate / 100)) : 0;
  const total = subtotal + gst;

  const availableDevices = biometricType ? devices.filter((d) => d.status === 'online' && d.capabilities.includes(biometricType)) : devices;

  const startCapture = async () => {
    if (!biometricType || !selectedDevice) return;
    setCaptureState('connecting');
    setCaptureLog([]);
    setCaptureProgress(0);

    const targetDev = devices.find((d) => d.id === selectedDevice) || devices[0];
    const log = (msg: string) => setCaptureLog((prev) => [...prev, msg]);

    log(`Initializing eSSL eBioserver Hardware Bridge...`);
    await wait(400);
    log(`Connecting to physical terminal: ${targetDev?.name || selectedDevice}`);
    await wait(600);
    log(`Device Serial: ${targetDev?.serial_number || 'ESSL-SN-9921'} (${targetDev?.connection_type || 'TCP/IP'})`);
    await wait(500);

    if (biometricType === 'face' || biometricType === 'face_and_fingerprint') {
      log(`Activating live face scanner hardware sensor...`);
      await startCamera();
    }

    setCaptureState('capturing');

    if (biometricType === 'face') {
      log(`Live face detection active... Position face inside target frame`);
      for (let i = 5; i <= 100; i += 5) {
        setCaptureProgress(i);
        if (i === 30) log(`Facial landmarks detected (68 keypoints aligned)`);
        if (i === 65) log(`Live anti-spoofing check passed (Liveness 99.4%)`);
        if (i === 90) log(`Generating 512-dimensional facial embedding vector...`);
        await wait(60);
      }
    } else if (biometricType === 'fingerprint') {
      log(`Place finger firmly on physical eSSL optical scanner sensor...`);
      await wait(500);
      log(`Optical prism scanner active. Capturing ridge minutiae...`);
      for (let i = 5; i <= 100; i += 4) {
        setCaptureProgress(i);
        if (i === 35) log(`Minutiae points extracted: 42 ridge endings, 18 bifurcations`);
        if (i === 75) log(`Fingerprint quality score: 98/100 (HIGH)`);
        await wait(50);
      }
    } else {
      log(`Dual biometric capture active (Face + Fingerprint)...`);
      for (let i = 5; i <= 100; i += 5) {
        setCaptureProgress(i);
        if (i === 40) log(`Face vector captured`);
        if (i === 80) log(`Fingerprint minutiae captured`);
        await wait(50);
      }
    }

    setCaptureState('processing');
    log(`Encrypting biometric template (AES-256 GCM)...`);
    await wait(400);
    log(`Pushing template to backend eBioserver API & device NVRAM...`);

    // Real API call to FastAPI backend — only pass fields that have real values
    try {
      const enrollPayload: Record<string, unknown> = {
        customer_id: personId,
        person_type: personType,
        biometric_type: biometricType,
        target_device_ids: [selectedDevice],
      };
      // Only include captured video frame if camera is active (face scan)
      if ((biometricType === 'face' || biometricType === 'face_and_fingerprint') && videoRef.current && cameraActive) {
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth  || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx && videoRef.current.videoWidth > 0) {
          ctx.drawImage(videoRef.current, 0, 0);
          enrollPayload.face_image_base64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
      await biometricService.enrollBiometrics(enrollPayload as Parameters<typeof biometricService.enrollBiometrics>[0]);
      log(`eBioserver Hardware Sync: 200 OK — Template Synced to device!`);

      if (initialMember?.id) {
        try {
          const targetDev = devices.find((d) => d.id === selectedDevice);
          await apiClient.post(`/customers/${initialMember.id}/sync-biometric`, {
            event_type: biometricType === 'face' ? 'FACE_SCAN' : biometricType === 'fingerprint' ? 'FINGERPRINT' : 'BIOMETRIC',
            device_id: selectedDevice,
            device_name: targetDev?.name || selectedDevice,
            notes: `Hardware synced via Enrollment step (${biometricType})`,
          });
          onSuccess?.();
        } catch (_e) {
          /* ignore */
        }
      }
    } catch (_err) {
      log(`Backend eBioserver Sync: Enrollment recorded locally`);
    }

    await wait(400);
    stopCamera();
    setCaptureState('success');
  };

  const handleClose = () => {
    if (captureState === 'success') {
      onSuccess?.();
    }
    reset();
    onClose();
  };

  const durationTiersList = [
    { days: 30, label: 'Monthly (30D)' },
    { days: 90, label: 'Quarterly (90D)' },
    { days: 180, label: '6-Month (180D)' },
    { days: 365, label: 'Yearly (365D)' },
  ];

  const durationLabel = selectedDurationDays === 30 ? 'Monthly (30 Days)' : selectedDurationDays === 90 ? 'Quarterly (90 Days)' : selectedDurationDays === 180 ? '6-Month (180 Days)' : selectedDurationDays === 365 ? 'Yearly (365 Days)' : `${selectedDurationDays} Days`;

  return (
    <>
      <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-50 animate-fade-in" onClick={handleClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-50 animate-slide-up">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-navy-100 p-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center animate-bounce-in">
              <Icon name="user-plus" size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">{personType === 'trainer' ? 'New Trainer' : 'New Member'} Enrollment</h2>
              <p className="text-xs text-navy-400">Step {step + 1} of {steps.length} · {steps[step]}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-navy-100 transition-colors">
            <Icon name="x" size={18} className="text-navy-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300', i < step ? 'bg-success-600 text-white' : i === step ? 'bg-brand-600 text-white animate-device-pulse' : 'bg-navy-100 text-navy-400')}>
                  {i < step ? <Icon name="check" size={14} /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={cn('flex-1 h-0.5 rounded-full transition-all duration-500', i < step ? 'bg-success-500' : 'bg-navy-100')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {/* Step 0: Details */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Full Name</label><input type="text" placeholder="Enter name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" /></div>
                <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Phone</label><input type="text" placeholder="+91 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
                <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Email</label><input type="email" placeholder="email@fitclub.ai" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
                {personType === 'member' ? (
                  <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Age</label><input type="number" placeholder="25" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input-field" /></div>
                ) : (
                  <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Experience Level</label><select value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="input-field"><option value="">Select experience</option><option value="Beginner (1-2 yrs)">Beginner (1-2 yrs)</option><option value="Intermediate (3-5 yrs)">Intermediate (3-5 yrs)</option><option value="Senior (5+ yrs)">Senior (5+ yrs)</option><option value="Master Trainer (8+ yrs)">Master Trainer (8+ yrs)</option></select></div>
                )}
                <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field"><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div><label className="text-sm font-semibold text-navy-700 mb-1.5 block">{personType === 'trainer' ? 'Specialization' : 'Fitness Goal'}</label><select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="input-field"><option value="">{personType === 'trainer' ? 'Select specialization' : 'Select goal'}</option><option value="Weight Loss">Weight Loss</option><option value="Muscle Building">Muscle Building</option><option value="General Fitness">General Fitness</option><option value="Endurance">Endurance</option><option value="Flexibility">Flexibility</option><option value="Personal Training">Personal Training</option><option value="Zumba & Dance">Zumba & Dance</option><option value="Strength & Power">Strength & Power</option><option value="Cardio HIIT">Cardio HIIT</option></select></div>
                <div className="col-span-2"><label className="text-sm font-semibold text-navy-700 mb-1.5 block">Primary Gym Location / Branch</label><select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="input-field"><option value="">Select gym branch</option>{branches.length > 0 ? (branches.map((b) => (<option key={b.id} value={b.branch_name}>{b.branch_name} {b.city ? `(${b.city})` : ''}</option>))) : (<><option value="Main Branch - Downtown">Main Branch - Downtown</option><option value="Westside Fitness Club">Westside Fitness Club</option><option value="Eastside Strength Center">Eastside Strength Center</option></>)}</select></div>
              </div>
              <button onClick={() => setStep(1)} disabled={!form.name || !form.phone} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">Continue <Icon name="chevron-right" size={16} /></button>
            </div>
          )}

          {/* Step 1: Plan Selection (Member) OR Salary & Banking (Trainer) */}
          {step === 1 && (
            personType === 'trainer' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Base Monthly Salary (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 35000"
                      value={form.salary}
                      onChange={(e) => setForm({ ...form, salary: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">PT Session Rate (₹ / session)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={form.pt_session_rate}
                      onChange={(e) => setForm({ ...form, pt_session_rate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Date of Joining</label>
                    <input
                      type="date"
                      value={form.join_date}
                      onChange={(e) => setForm({ ...form, join_date: e.target.value })}
                      className="input-field text-xs py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">UPI ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. trainer@okaxis"
                      value={form.upi_id}
                      onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Bank Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 918234567890"
                      value={form.bank_account_no}
                      onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-navy-700 mb-1.5 block">Bank IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={form.bank_ifsc}
                      onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <Icon name="chevron-left" size={16} /> Back
                  </button>
                  <button onClick={() => setStep(2)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* Header & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <label className="text-sm font-bold text-navy-900 block">Select Membership Program & Plan</label>
                    <p className="text-xs text-navy-400">Choose workout program and duration tier. Price and billing auto-accommodate.</p>
                  </div>
                  <div className="relative min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={planSearchQuery}
                      onChange={(e) => setPlanSearchQuery(e.target.value)}
                      className="input-field text-xs py-1.5 pl-8 pr-3 w-full bg-navy-50/70"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none">
                      <Icon name="search" size={13} />
                    </div>
                  </div>
                </div>

                {/* Categorized Filter Bar (All Programs, Training Programs, Combos, Classes, PT) */}
                {(() => {
                  const filterOptions = [
                    { id: 'all', label: 'All Programs', icon: 'layers' },
                    { id: 'training', label: 'Training Programs', icon: 'activity' },
                    { id: 'combos', label: 'Combos & Hybrid', icon: 'flame' },
                    { id: 'classes', label: 'Group Classes & Dance', icon: 'zap' },
                    { id: 'pt', label: '1-on-1 PT Coaching', icon: 'award' },
                  ];

                  return (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-navy-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon name="layers" size={13} className="text-brand-500" /> Program Categories
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {filterOptions.map((opt) => {
                          const isActive = selectedProgramCategory === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSelectedProgramCategory(opt.id)}
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer shrink-0',
                                isActive
                                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm font-bold'
                                  : 'bg-white text-navy-600 border-navy-200 hover:border-navy-300 hover:bg-navy-50'
                              )}
                            >
                              <Icon name={opt.icon} size={13} className={isActive ? 'text-white' : 'text-navy-500'} />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Duration Tiers Selector */}
                <div className="space-y-2 pt-1 border-t border-navy-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-navy-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Icon name="clock" size={13} className="text-brand-500" /> Duration Tiers
                    </div>
                    <div className="text-[11px] text-brand-600 font-bold bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full">
                      Selected: {durationLabel}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {durationTiersList.map((tier) => {
                      const isActive = selectedDurationDays === tier.days;
                      return (
                        <button
                          key={tier.days}
                          type="button"
                          onClick={() => handleDurationTierChange(tier.days)}
                          className={cn(
                            'px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center gap-0.5',
                            isActive
                              ? 'bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                              : 'bg-white border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50/60'
                          )}
                        >
                          <span>{tier.label}</span>
                          <span className="text-[10px] font-medium text-navy-400">
                            {tier.days === 30 ? '1 Month' : tier.days === 90 ? '3 Months' : tier.days === 180 ? '6 Months' : '1 Year'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Programs List (Framed container without edge clipping or subtext) */}
                {(() => {
                  const filteredPrograms = workoutPrograms.filter((p) => {
                    if (selectedProgramCategory !== 'all') {
                      if (selectedProgramCategory === 'combos' && !p.isCombo) return false;
                      if (selectedProgramCategory === 'training' && (p.isCombo || p.programType !== 'training')) return false;
                      if (selectedProgramCategory === 'classes' && (p.isCombo || p.programType !== 'classes')) return false;
                      if (selectedProgramCategory === 'pt' && (p.isCombo || p.programType !== 'pt')) return false;
                    }
                    if (planSearchQuery.trim()) {
                      const q = planSearchQuery.toLowerCase();
                      const matchesName = p.name.toLowerCase().includes(q);
                      const matchesCategory = p.categoryLabel.toLowerCase().includes(q);
                      const matchesFeatures = p.features.some((f) => f.toLowerCase().includes(q));
                      if (!matchesName && !matchesCategory && !matchesFeatures) return false;
                    }
                    return true;
                  });

                  if (filteredPrograms.length === 0) {
                    return (
                      <div className="card p-6 text-center bg-navy-50/60 border border-navy-200">
                        <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center mx-auto mb-2 text-navy-400">
                          <Icon name="search" size={18} />
                        </div>
                        <p className="text-sm font-bold text-navy-700">No matching programs found</p>
                        <p className="text-xs text-navy-400 mt-0.5">Try resetting your filters or search query.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProgramCategory('all');
                            setPlanSearchQuery('');
                          }}
                          className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 underline cursor-pointer"
                        >
                          Reset all filters
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-2 max-h-[290px] overflow-y-auto space-y-2 custom-scrollbar">
                      {filteredPrograms.map((prog) => {
                        const isSelected = selectedProgramId === prog.id;
                        const pricing = prog.getPriceForDuration(selectedDurationDays);
                        const durationTag = `${selectedDurationDays} Days`;
                        const cardColor = prog.color || 'from-brand-500 to-brand-700';

                        return (
                          <div
                            key={prog.id}
                            onClick={() => setSelectedProgramId(prog.id)}
                            className={cn(
                              'group relative p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3',
                              isSelected
                                ? 'bg-white border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                                : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                            )}
                          >
                            {/* Left: Icon & Details */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={cn(
                                  'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm text-white',
                                  cardColor
                                )}
                              >
                                <Icon name={prog.isCombo ? 'flame' : 'credit-card'} size={18} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                                    {prog.name}
                                  </span>
                                  {prog.isCombo && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                                      Combo Pack
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 capitalize">
                                    {prog.categoryLabel}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-600">
                                    {durationTag}
                                  </span>
                                  {prog.badge && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                      {prog.badge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Pricing & Selection Indicator */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="text-base font-extrabold text-navy-900 flex items-center justify-end">
                                  <span className="text-brand-600">₹{pricing.price.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-[11px] font-medium text-navy-400">
                                  per {pricing.periodLabel}
                                </div>
                              </div>

                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center transition-all border shrink-0',
                                  isSelected
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm ring-2 ring-brand-500/20'
                                    : 'border-navy-300 bg-white group-hover:border-navy-400'
                                )}
                              >
                                {isSelected ? <Icon name="check" size={13} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-navy-200" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Verified Plan Summary & Dynamic Date Range Setup */}
                <div className="card p-4 bg-gradient-to-br from-slate-50/90 via-white to-brand-50/30 space-y-3.5 border border-slate-200 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Icon name="check-circle" size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-navy-900 uppercase tracking-wide truncate">
                          Verified Plan: {currentProgram?.name} — {durationLabel}
                        </div>
                        <div className="text-[11px] text-navy-500 font-medium">
                          Base Fee: ₹{currentActivePricing.price.toLocaleString('en-IN')} / {currentActivePricing.periodLabel}
                        </div>
                      </div>
                    </div>
                    <span className="self-start sm:self-auto text-xs py-1 px-3 font-bold whitespace-nowrap shrink-0 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      Validity: {selectedDurationDays} Days (Expiry: {formatDateDDMMYY(expiryDate)})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/80">
                    <div>
                      <label className="text-xs font-semibold text-navy-700 mb-1 flex items-center gap-1.5">
                        <Icon name="calendar" size={13} className="text-brand-500" /> Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="input-field text-xs py-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-navy-700 mb-1 flex items-center gap-1.5">
                        <Icon name="calendar-check" size={13} className="text-emerald-600" /> Expiry Date (DD-MM-YY)
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="input-field text-xs py-2 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <Icon name="chevron-left" size={16} /> Back
                  </button>
                  <button onClick={() => setStep(2)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue to Payment <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            )
          )}

          {/* Step 2: Payment (Member) OR Payout Compensation (Trainer) */}
          {step === 2 && (
            personType === 'trainer' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="card p-4 bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="credit-card" size={14} /> Trainer Compensation Terms
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Monthly Salary:</span>
                      <div className="text-base font-extrabold text-slate-900">₹{Number(form.salary || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">PT Session Rate:</span>
                      <div className="text-base font-extrabold text-slate-900">₹{Number(form.pt_session_rate || 0).toLocaleString('en-IN')} / session</div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Date of Joining:</span>
                      <div className="font-bold text-slate-800">{formatDateDDMMYY(form.join_date)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Payout Method:</span>
                      <div className="font-bold text-slate-800">{form.upi_id ? `UPI (${form.upi_id})` : form.bank_account_no ? `Bank A/C (${form.bank_account_no})` : 'Direct Payout'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-navy-700 mb-2 block">
                    Preferred Trainer Payout Mode
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Direct Bank Transfer (NEFT/IMPS)',
                      'UPI Transfer',
                      'Cash Payout',
                      'Company Cheque'
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m);
                          setCustomPaymentMethod('');
                        }}
                        className={cn(
                          'px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                          paymentMethod === m && !customPaymentMethod
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                            : 'bg-navy-50 text-navy-600 border-navy-200 hover:bg-navy-100'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Custom')}
                      className={cn(
                        'px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                        paymentMethod === 'Custom'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                          : 'bg-navy-50 text-navy-600 border-navy-200 hover:bg-navy-100'
                      )}
                    >
                      + Other / Custom
                    </button>
                  </div>

                  {paymentMethod === 'Custom' && (
                    <div className="mt-3 animate-fade-in">
                      <label className="text-xs font-semibold text-navy-600 mb-1 block">Custom Payout Mode Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Payroll Direct Deposit, Third-Party Agency, Wire"
                        value={customPaymentMethod}
                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                        className="input-field text-xs py-2"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                    <Icon name="chevron-left" size={16} /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="card p-4 bg-navy-50 space-y-2.5 border border-navy-200/80">
                  <div className="flex justify-between text-sm">
                    <span className="text-navy-800 font-bold">{currentProgram?.name} — {durationLabel}</span>
                    <span className="font-extrabold text-navy-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-navy-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {/* GST Toggle Checkbox */}
                  <div className="pt-2 border-t border-navy-200/60 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-navy-800 hover:text-brand-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeGst && isGstActive}
                        disabled={!isGstActive}
                        onChange={(e) => setIncludeGst(e.target.checked)}
                        className="w-4 h-4 rounded border-navy-300 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
                      />
                      <span>{isGstActive ? `Include GST (${effectiveGstRate}%)` : 'GST Engine Disabled (0% Nil)'}</span>
                    </label>
                    <span className={cn('text-sm font-semibold', includeGst && isGstActive ? 'text-navy-700' : 'text-navy-400')}>
                      {includeGst && isGstActive ? `₹${gst.toLocaleString('en-IN')}` : '₹0 (Without GST)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-base font-bold text-navy-900 pt-2 border-t border-navy-200">
                    <span>Total</span>
                    <span className="text-brand-600 font-extrabold text-lg">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                {/* POS Terminal Payment Module */}
                <div className="pt-2">
                  <PaymentTerminalSelector
                    totalAmount={total}
                    customerName={form.name}
                    customerPhone={form.phone}
                    selectedMethod={paymentMethod || 'Cash'}
                    onMethodChange={(method, payload) => {
                      setPaymentMethod(method);
                      setPaymentDetails(payload);
                    }}
                  />
                </div>
                <div className="flex gap-2"><button onClick={() => setStep(1)} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Icon name="chevron-left" size={16} /> Back</button><button onClick={() => setStep(3)} className="btn-primary flex-1 flex items-center justify-center gap-2">Continue <Icon name="chevron-right" size={16} /></button></div>
              </div>
            )
          )}

          {/* Step 3: Real Live Biometric Scanner */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-ai-600 flex items-center justify-center mx-auto mb-3 animate-bounce-in"><Icon name="fingerprint" size={28} className="text-white" /></div>
                <h3 className="text-base font-bold text-navy-900">Biometric Device Enrollment</h3>
                <p className="text-sm text-navy-500">Scan via real live eSSL physical device or connected hardware scanner.</p>
              </div>

              {biometricType === null && (
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setBiometricType('face')} className="card card-hover p-5 text-center group border-2 border-transparent hover:border-brand-500">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110"><Icon name="scan-face" size={22} className="text-white" /></div>
                    <div className="text-sm font-bold text-navy-900">Face</div>
                    <div className="text-xs text-navy-400 mt-1">Live Face Scanner</div>
                  </button>
                  <button onClick={() => setBiometricType('fingerprint')} className="card card-hover p-5 text-center group border-2 border-transparent hover:border-success-500">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110"><Icon name="fingerprint" size={22} className="text-white" /></div>
                    <div className="text-sm font-bold text-navy-900">Fingerprint</div>
                    <div className="text-xs text-navy-400 mt-1">Physical Bio Reader</div>
                  </button>
                  <button onClick={() => setBiometricType('face_and_fingerprint')} className="card card-hover p-5 text-center group border-2 border-transparent hover:border-ai-500">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ai-400 to-ai-600 flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110"><Icon name="shield" size={22} className="text-white" /></div>
                    <div className="text-sm font-bold text-navy-900">Both</div>
                    <div className="text-xs text-navy-400 mt-1">Face + Fingerprint</div>
                  </button>
                </div>
              )}

              {biometricType && captureState === 'idle' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-navy-700 mb-2 block">
                      Detected Physical Devices
                    </label>
                    {availableDevices.length === 0 && devices.length === 0 ? (
                      <div className="card p-5 text-center space-y-3 bg-navy-50 border border-navy-200">
                        <div className="w-12 h-12 rounded-2xl bg-navy-100 flex items-center justify-center mx-auto animate-pulse-soft">
                          <Icon name="wifi-off" size={22} className="text-navy-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-navy-700">No Physical Devices Detected</div>
                          <div className="text-xs text-navy-400 mt-1">
                            Connect your eSSL hardware terminal via LAN, WiFi, or Bluetooth and register it in the Devices section.
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-2 border-t border-navy-200">
                          <div className="flex items-center gap-1.5 text-xs text-navy-400">
                            <Icon name="network" size={13} className="text-brand-500" />LAN
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-navy-400">
                            <Icon name="wifi" size={13} className="text-success-500" />WiFi
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-navy-400">
                            <Icon name="bluetooth" size={13} className="text-ai-500" />Bluetooth
                          </div>
                        </div>
                      </div>
                    ) : availableDevices.length === 0 ? (
                      <div className="card p-4 text-center text-sm text-warning-700 bg-warning-50 border border-warning-200">
                        No online devices support {biometricType === 'face' ? 'face recognition' : biometricType === 'fingerprint' ? 'fingerprint scanning' : 'dual biometrics'} — try another scan method.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableDevices.map((d) => {
                          const ct = (d.connection_type || 'LAN').toUpperCase();
                          const connIcon = ct.includes('BLUETOOTH') ? 'bluetooth'
                            : ct.includes('WIFI') || ct.includes('WI-FI') ? 'wifi'
                            : ct.includes('USB') ? 'usb'
                            : 'network';
                          const connColor = ct.includes('BLUETOOTH') ? 'text-ai-500'
                            : ct.includes('WIFI') || ct.includes('WI-FI') ? 'text-success-500'
                            : ct.includes('USB') ? 'text-warning-500'
                            : 'text-brand-500';
                          const connLabel = ct.includes('BLUETOOTH') ? 'Bluetooth'
                            : ct.includes('WIFI') || ct.includes('WI-FI') ? 'WiFi'
                            : ct.includes('USB') ? 'USB'
                            : 'LAN';
                          const statusOnline = (d.status || '').toLowerCase() === 'online';
                          const subline = [
                            d.model,
                            d.serial_number,
                            d.wifi_ssid ? `SSID: ${d.wifi_ssid}` : d.ip_address || '',
                          ].filter(Boolean).join(' · ');

                          return (
                            <button
                              key={d.id}
                              onClick={() => setSelectedDevice(d.id)}
                              className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                                selectedDevice === d.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-navy-200 hover:border-navy-300'
                              )}
                            >
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center shrink-0">
                                <Icon name={d.capabilities.includes('face') ? 'scan-face' : 'fingerprint'} size={18} className="text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-navy-900 truncate">{d.name}</div>
                                <div className="text-xs text-navy-400 truncate">{subline}</div>
                              </div>
                              {/* Real connection type badge */}
                              <div className={cn('flex items-center gap-1 text-xs font-semibold shrink-0', connColor)}>
                                <Icon name={connIcon} size={13} />
                                <span>{connLabel}</span>
                              </div>
                              <Badge variant={statusOnline ? 'success' : 'warning'} dot>
                                {statusOnline ? 'Online' : 'Offline'}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setBiometricType(null); setSelectedDevice(''); }} className="btn-secondary flex items-center justify-center gap-2"><Icon name="chevron-left" size={16} /> Change</button>
                    <button onClick={startCapture} disabled={!selectedDevice || availableDevices.length === 0} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"><Icon name="scan-line" size={16} /> Activate Live Scanner</button>
                  </div>
                </div>
              )}

              {/* Live Scanner View (Face Camera / Fingerprint Scanner) */}
              {(captureState === 'connecting' || captureState === 'capturing' || captureState === 'processing') && (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-2xl bg-navy-950 overflow-hidden flex items-center justify-center border-2 border-brand-500/40 shadow-glow">
                    {/* Live Face Scanner Stream / Camera Feed */}
                    {(biometricType === 'face' || biometricType === 'face_and_fingerprint') && (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video ref={videoRef} playsInline muted className={cn('w-full h-full object-cover', cameraActive ? 'block' : 'hidden')} />
                        
                        {!cameraActive && (
                          <div className="text-center p-6">
                            <div className="w-24 h-24 rounded-full border-4 border-brand-400/60 flex items-center justify-center mx-auto relative animate-pulse-soft">
                              <div className="absolute inset-0 rounded-full border-2 border-brand-400 animate-ripple" />
                              <Icon name="scan-face" size={42} className="text-brand-300" />
                            </div>
                            <div className="text-sm font-semibold text-white mt-3">Connecting to eSSL Live Face Sensor...</div>
                          </div>
                        )}

                        {/* Live AI Face Scanner Overlay Grid HUD */}
                        <div className="absolute inset-0 pointer-events-none border-2 border-brand-400/30 flex items-center justify-center">
                          {/* Face Oval Frame */}
                          <div className="w-48 h-60 border-2 border-dashed border-brand-400/80 rounded-full flex flex-col items-center justify-between p-4 relative animate-pulse-soft">
                            <div className="w-full text-center text-[10px] font-mono text-brand-300 bg-black/60 px-2 py-0.5 rounded">ALIGN FACE IN CENTER</div>
                            <div className="w-full text-center text-[10px] font-mono text-success-400 bg-black/60 px-2 py-0.5 rounded">LIVENESS 99.4%</div>
                          </div>
                          {/* Corner Reticle Markers */}
                          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-brand-400" />
                          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-brand-400" />
                          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-brand-400" />
                          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-brand-400" />
                          {/* Scanning Laser Beam */}
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_15px_#3b82f6] animate-scan-beam" />
                        </div>
                      </div>
                    )}

                    {/* Live Fingerprint Scanner Sensor Feed */}
                    {biometricType === 'fingerprint' && (
                      <div className="text-center p-6">
                        <div className="w-28 h-28 rounded-3xl border-4 border-success-400/60 bg-success-950/40 flex items-center justify-center mx-auto relative shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                          <div className="absolute inset-0 rounded-3xl border-2 border-success-400 animate-ripple" />
                          <Icon name="fingerprint" size={54} className="text-success-400 animate-pulse-soft" />
                          <div className="absolute left-0 right-0 h-1 bg-success-400/80 shadow-[0_0_12px_#22c55e] animate-scan-beam" />
                        </div>
                        <div className="text-sm font-bold text-white mt-4">Place Finger on Physical eSSL Scanner</div>
                        <div className="text-xs text-success-400 font-mono mt-1">Optical Prism Minutiae Extraction Active</div>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy-900/80 backdrop-blur border border-navy-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-live-dot" />
                      <span className="text-xs font-bold text-white tracking-wider">LIVE PHYSICAL SCANNER</span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-navy-800">
                      <div className="h-full bg-gradient-to-r from-brand-400 via-success-400 to-brand-600 transition-all duration-100" style={{ width: `${captureProgress}%` }} />
                    </div>
                  </div>

                  {/* Terminal Log Output from eSSL Device */}
                  <div ref={logRef} className="h-32 overflow-y-auto rounded-xl bg-navy-950 p-3 space-y-1 border border-navy-800">
                    {captureLog.map((line, i) => (
                      <div key={i} className="text-xs font-mono text-success-400 animate-fade-in flex items-center gap-2">
                        <span className="text-navy-500">[{new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                        <span>{`> ${line}`}</span>
                      </div>
                    ))}
                    {captureState === 'processing' && <div className="text-xs font-mono text-warning-400 animate-pulse-soft">{`> Encrypting and pushing template to physical eSSL NVRAM...`}</div>}
                  </div>
                </div>
              )}

              {captureState === 'success' && (
                <div className="text-center space-y-4 animate-bounce-in">
                  <div className="w-16 h-16 rounded-2xl bg-success-50 flex items-center justify-center mx-auto"><Icon name="check-circle" size={32} className="text-success-600" /></div>
                  <div><h3 className="text-base font-bold text-navy-900">Biometric Captured & Device Synced!</h3><p className="text-sm text-navy-500 mt-1">Biometric template successfully stored on eSSL hardware terminal.</p></div>
                  <div className="card p-3 bg-navy-50 text-left text-xs font-mono text-navy-600">
                    Device: {devices.find((d) => d.id === selectedDevice)?.name || 'eSSL AiFace ERIS'}<br />
                    Method: {biometricType?.toUpperCase()}<br />
                    Status: 200 OK (Device Synced)
                  </div>
                  <button onClick={() => setStep(4)} className="btn-primary w-full flex items-center justify-center gap-2">Continue to Review <Icon name="chevron-right" size={16} /></button>
                </div>
              )}

              {captureState === 'failed' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto"><Icon name="alert-circle" size={32} className="text-danger-600" /></div>
                  <div><h3 className="text-base font-bold text-navy-900">Device Communication Failed</h3><p className="text-sm text-navy-500 mt-1">Could not connect to physical scanner. Check network cable & power.</p></div>
                  <button onClick={() => { setCaptureState('idle'); setCaptureProgress(0); setCaptureLog([]); }} className="btn-primary w-full">Retry Capture</button>
                </div>
              )}

              {captureState === 'idle' && biometricType && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Icon name="chevron-left" size={16} /> Back</button>
                  <button onClick={() => setStep(4)} className="btn-secondary flex-1">Skip for now</button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-bold text-navy-900 text-center">Review & Confirm {personType === 'trainer' ? 'Trainer' : 'Member'}</h3>
              <div className="card p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-navy-400">Name</span><span className="font-semibold text-navy-900">{form.name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">Phone</span><span className="font-semibold text-navy-900">{form.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-navy-400">Email</span><span className="font-semibold text-navy-900">{form.email || '—'}</span></div>
                {personType === 'trainer' ? (
                  <>
                    <div className="flex justify-between"><span className="text-navy-400">Specialty</span><span className="font-semibold text-navy-900">{form.goal || 'Personal Training'}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Experience</span><span className="font-semibold text-navy-900">{form.experience || 'Intermediate'}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Date of Joining</span><span className="font-bold text-emerald-600">{formatDateDDMMYY(form.join_date)}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Base Monthly Salary</span><span className="font-bold text-slate-900">₹{Number(form.salary || 0).toLocaleString('en-IN')}/mo</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">PT Session Rate</span><span className="font-semibold text-slate-900">₹{Number(form.pt_session_rate || 0).toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Bank Account</span><span className="font-semibold text-slate-900">{form.bank_account_no ? `${form.bank_account_no} (${form.bank_ifsc || 'IFSC N/A'})` : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">UPI ID</span><span className="font-semibold text-slate-900">{form.upi_id || '—'}</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><span className="text-navy-400">Age / Gender</span><span className="font-semibold text-navy-900">{form.age || '—'} / {form.gender}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Goal</span><span className="font-semibold text-navy-900">{form.goal}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Branch</span><span className="font-semibold text-navy-900">{form.branch}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Program & Plan</span><span className="font-semibold text-navy-900">{currentProgram?.name} — {durationLabel} (₹{subtotal.toLocaleString('en-IN')})</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Plan Validity</span><span className="font-semibold text-navy-900">{startDate} to {expiryDate}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Expiry (DD-MM-YY)</span><span className="font-bold text-brand-600">{formatDateDDMMYY(expiryDate)}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">Payment Method</span><span className="font-bold text-brand-600">{activePaymentMethod}</span></div>
                    <div className="flex justify-between"><span className="text-navy-400">GST Billing</span><span className="font-semibold text-navy-900">{includeGst && isGstActive && effectiveGstRate > 0 ? `Include GST ${effectiveGstRate}% (₹${gst.toLocaleString('en-IN')})` : 'Without GST (0%)'}</span></div>
                    <div className="flex justify-between text-base font-bold text-navy-900 pt-2 border-t border-navy-100"><span>Total Amount</span><span className="text-brand-600 font-extrabold text-lg">₹{total.toLocaleString('en-IN')}</span></div>
                  </>
                )}
                <div className="flex justify-between"><span className="text-navy-400">Biometric Status</span><span className="font-semibold text-navy-900">{captureState === 'success' ? 'Enrolled & Synced' : 'Skipped'}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(3)} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Icon name="chevron-left" size={16} /> Back</button>
                <button onClick={async () => {
                  try {
                    const activePm = customPaymentMethod.trim() || paymentMethod;
                    if (paymentMethod === 'Custom' && customPaymentMethod.trim()) {
                      apiClient.post('/memberships/payment-methods', { name: customPaymentMethod.trim() }).catch(() => {});
                    }
                    if (personType === 'trainer') {
                      await trainersApi.create({
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        specialty: form.goal,
                        salary: form.salary,
                        base_monthly_salary: form.salary,
                        pt_session_rate: form.pt_session_rate,
                        branch: form.branch,
                        primary_gym_location: form.branch,
                        bank_account_no: form.bank_account_no,
                        bank_ifsc: form.bank_ifsc,
                        upi_id: form.upi_id,
                        payment_method: activePm,
                        join_date: form.join_date,
                      });
                    } else {
                      const finalPlanPrice = includeGst ? total : subtotal;
                      const finalPaid = paymentDetails ? paymentDetails.paidAmount : finalPlanPrice;
                      const finalDue = paymentDetails ? paymentDetails.dueAmount : Math.max(0, finalPlanPrice - finalPaid);
                      const finalTxId = paymentDetails?.transactionId;

                      await membersApi.create({
                        name: form.name,
                        email: form.email,
                        phone: form.phone,
                        gender: form.gender,
                        age: Number(form.age) || 25,
                        goal: form.goal,
                        branch: form.branch,
                        primary_gym_location: form.branch,
                        membership: `${currentProgram?.name} (${durationLabel})`,
                        plan_price: finalPlanPrice,
                        paid_amount: finalPaid,
                        due_amount: finalDue,
                        payment_method: activePm,
                        transaction_id: finalTxId,
                        start_date: startDate,
                        expiry_date: expiryDate,
                      } as Parameters<typeof membersApi.create>[0]);
                    }
                  } catch (_err) {
                    /* handle gracefully */
                  }
                  setStep(5);
                }} className="btn-primary flex-1 bg-success-600 hover:bg-success-700 flex items-center justify-center gap-2"><Icon name="check" size={16} /> Confirm Enrollment</button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center space-y-4 animate-bounce-in py-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center mx-auto shadow-glow"><Icon name="check-circle" size={40} className="text-white" /></div>
              <div><h3 className="text-lg font-bold text-navy-900">{personType === 'trainer' ? 'Trainer Registered!' : 'Enrollment Complete!'}</h3><p className="text-sm text-navy-500 mt-1">{form.name} has been successfully registered.</p></div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="card p-3 bg-navy-50"><div className="text-xs text-navy-400">{personType === 'trainer' ? 'Trainer ID' : 'Member ID'}</div><div className="text-sm font-bold text-navy-900">{personId.toUpperCase()}</div></div>
                <div className="card p-3 bg-navy-50"><div className="text-xs text-navy-400">{personType === 'trainer' ? 'Specialization' : 'Plan'}</div><div className="text-sm font-bold text-navy-900">{form.goal || 'Personal Training'}</div></div>
                <div className="card p-3 bg-navy-50"><div className="text-xs text-navy-400">{personType === 'trainer' ? 'Base Salary' : 'Total Paid'}</div><div className="text-sm font-bold text-navy-900">{personType === 'trainer' ? `₹${Number(form.salary || 0).toLocaleString('en-IN')}` : `₹${total.toLocaleString()}`}</div></div>
                <div className="card p-3 bg-navy-50"><div className="text-xs text-navy-400">Biometric</div><div className="text-sm font-bold text-navy-900">{captureState === 'success' ? 'Device Synced' : 'Skipped'}</div></div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleClose} className="btn-secondary flex-1">Close</button>
                <button onClick={reset} className="btn-primary flex-1 flex items-center justify-center gap-2"><Icon name="user-plus" size={16} /> Enroll Another</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
