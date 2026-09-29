import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { customerApi } from '@/services/customerApi';
import type { FoodScanResult } from '@/types/customer';

type ScanState = 'idle' | 'camera' | 'scanning' | 'results';

export function FoodScannerPage() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('General');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);

  // Real Camera Stream States & Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [streamObj, setStreamObj] = useState<MediaStream | null>(null);

  // Real-Time Live Camera Scanner States
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [liveDetectionStatus, setLiveDetectionStatus] = useState<string>('Searching for meal in camera viewfinder...');
  const autoScanActiveRef = useRef<boolean>(false);

  // Dynamic custom meal input form
  const [customItem, setCustomItem] = useState({
    name: '',
    portion: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  // Stop camera media tracks on unmount
  useEffect(() => {
    return () => {
      autoScanActiveRef.current = false;
      if (streamObj) {
        streamObj.getTracks().forEach((track) => track.stop());
      }
    };
  }, [streamObj]);

  // Bind WebRTC MediaStream to <video> element as soon as viewfinder mounts
  useEffect(() => {
    if (state === 'camera' && streamObj && videoRef.current) {
      videoRef.current.srcObject = streamObj;
      videoRef.current.play().catch((err) => console.warn('Video play error:', err));
    }
  }, [state, streamObj]);

  // Start Real Device Camera Stream
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (streamObj) {
        streamObj.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStreamObj(stream);
      setCameraActive(true);
      setState('camera');
      setLiveDetectionStatus('Scanning viewfinder for food plate...');
    } catch (err) {
      console.warn('Real camera access failed or not supported:', err);
      setToast('Unable to open hardware camera. You can upload a photo.');
      setState('idle');
    }
  };

  // Switch between Front & Rear Camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Stop Camera Stream
  const stopCamera = () => {
    autoScanActiveRef.current = false;
    if (streamObj) {
      streamObj.getTracks().forEach((t) => t.stop());
      setStreamObj(null);
    }
    setCameraActive(false);
  };

  // Real-Time Auto-Detection Loop while Camera is Open
  useEffect(() => {
    if (state !== 'camera' || !cameraActive) {
      autoScanActiveRef.current = false;
      return;
    }

    autoScanActiveRef.current = true;
    let isSubscribed = true;

    const intervalId = setInterval(async () => {
      if (!autoScanActiveRef.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.75);

      if (!isSubscribed) return;
      setIsAutoScanning(true);

      try {
        const data = await customerApi.scanFood({ image_base64: frameBase64 } as any);
        if (!isSubscribed || !autoScanActiveRef.current) return;

        if (data && (data as any).is_food !== false && data.items && data.items.length > 0) {
          // FOOD DETECTED AUTOMATICALLY! Lock frame and transition to results
          autoScanActiveRef.current = false;
          setCapturedImageBase64(frameBase64);
          stopCamera();

          const formattedItems = (data.items || []).map((it: any) => {
            const rawGrams = (typeof it.grams === 'number' && it.grams > 0)
              ? it.grams
              : (parseFloat(String(it.portion || '').replace(/[^0-9.]/g, '')) || 0);

            return {
              ...it,
              grams: rawGrams,
              initialGrams: rawGrams,
              initialCalories: Number(it.calories) || 0,
              initialProtein: Number(it.protein) || 0,
              initialCarbs: Number(it.carbs) || 0,
              initialFat: Number(it.fat) || 0,
            };
          });

          setResult({
            ...data,
            items: formattedItems,
          });
          if (data.meal_name) setMealName(data.meal_name);
          setState('results');
          setToast('Food detected automatically via Live AI Camera Scanner!');
          setTimeout(() => setToast(null), 4000);
        } else {
          // Non-food in camera view
          setLiveDetectionStatus((data as any)?.error_message || 'No food detected. Point camera at meal plate...');
        }
      } catch (_err) {
        if (isSubscribed) setLiveDetectionStatus('Scanning viewfinder frame...');
      } finally {
        if (isSubscribed) setIsAutoScanning(false);
      }
    }, 2800);

    return () => {
      isSubscribed = false;
      autoScanActiveRef.current = false;
      clearInterval(intervalId);
    };
  }, [state, cameraActive]);

  // Capture Frame Manually via Shutter Button
  const handleCaptureShutter = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImageBase64(base64Data);
    stopCamera();
    processImageScan(base64Data);
  };

  // Process File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setCapturedImageBase64(base64Data);
      processImageScan(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Send Base64 Payload to Backend AI Vision API
  const processImageScan = async (base64Payload: string) => {
    setState('scanning');
    try {
      const data = await customerApi.scanFood({
        image_base64: base64Payload,
      } as any);

      if (data) {
        if ((data as any).is_food === false || !data.items || data.items.length === 0) {
          setToast((data as any).error_message || 'No food detected in photo. Please point camera at your meal plate.');
          setState('idle');
          return;
        }

        const formattedItems = (data.items || []).map((it: any) => {
          const rawGrams = (typeof it.grams === 'number' && it.grams > 0)
            ? it.grams
            : (parseFloat(String(it.portion || '').replace(/[^0-9.]/g, '')) || 0);

        return {
          ...it,
          grams: rawGrams,
          initialGrams: rawGrams,
          initialCalories: Number(it.calories) || 0,
          initialProtein: Number(it.protein) || 0,
          initialCarbs: Number(it.carbs) || 0,
          initialFat: Number(it.fat) || 0,
          initialFiber: Number(it.fiber) || 0,
          initialSugar: Number(it.sugar) || 0,
          fiber: Number(it.fiber) || 0,
          sugar: Number(it.sugar) || 0,
          vitamins: it.vitamins || { vitamin_a_iu: 0, vitamin_c_mg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 },
        };
      });

      setResult({
        ...data,
        items: formattedItems,
      });
      if (data.meal_name) setMealName(data.meal_name);
      setToast('Meal photo analyzed successfully via AI Vision API!');
      setTimeout(() => setToast(null), 4000);
    }
    setState('results');
  } catch (err: any) {
    console.error('[FoodScannerPage] Scan Error:', err);
    setToast(err?.message || 'Failed to analyze meal photo with backend server.');
    setState('idle');
  }
};

// Recalculate Item & Total Macros Dynamically when Portion Slider Changes
const handleUpdateItemGrams = (idx: number, newGrams: number) => {
  if (!result) return;
  const safeGrams = Math.max(0, Math.min(1000, newGrams));

  const updatedItems = result.items.map((item: any, i: number) => {
    if (i !== idx) return item;
    const baseGrams = item.initialGrams > 0 ? item.initialGrams : 100;
    const ratio = safeGrams / baseGrams;

    const baseVit = item.vitamins || {};

    return {
      ...item,
      grams: safeGrams,
      portion: `${Math.round(safeGrams)}g`,
      calories: Math.round(item.initialCalories * ratio),
      protein: Math.round(item.initialProtein * ratio * 10) / 10,
      carbs: Math.round(item.initialCarbs * ratio * 10) / 10,
      fat: Math.round(item.initialFat * ratio * 10) / 10,
      fiber: Math.round((item.initialFiber || 0) * ratio * 10) / 10,
      sugar: Math.round((item.initialSugar || 0) * ratio * 10) / 10,
      vitamins: {
        vitamin_a_iu: Math.round((baseVit.vitamin_a_iu || 0) * ratio * 10) / 10,
        vitamin_c_mg: Math.round((baseVit.vitamin_c_mg || 0) * ratio * 10) / 10,
        calcium_mg: Math.round((baseVit.calcium_mg || 0) * ratio * 10) / 10,
        iron_mg: Math.round((baseVit.iron_mg || 0) * ratio * 10) / 10,
        potassium_mg: Math.round((baseVit.potassium_mg || 0) * ratio * 10) / 10,
      },
    };
  });

  const totalCal = updatedItems.reduce((acc, it) => acc + (it.calories || 0), 0);
  const totalP = updatedItems.reduce((acc, it) => acc + (it.protein || 0), 0);
  const totalC = updatedItems.reduce((acc, it) => acc + (it.carbs || 0), 0);
  const totalF = updatedItems.reduce((acc, it) => acc + (it.fat || 0), 0);
  const totalFiber = updatedItems.reduce((acc, it) => acc + (it.fiber || 0), 0);
  const totalSugar = updatedItems.reduce((acc, it) => acc + (it.sugar || 0), 0);

  const totVitA = updatedItems.reduce((acc, it) => acc + (it.vitamins?.vitamin_a_iu || 0), 0);
  const totVitC = updatedItems.reduce((acc, it) => acc + (it.vitamins?.vitamin_c_mg || 0), 0);
  const totCalcium = updatedItems.reduce((acc, it) => acc + (it.vitamins?.calcium_mg || 0), 0);
  const totIron = updatedItems.reduce((acc, it) => acc + (it.vitamins?.iron_mg || 0), 0);
  const totPotassium = updatedItems.reduce((acc, it) => acc + (it.vitamins?.potassium_mg || 0), 0);

  setResult({
    ...result,
    items: updatedItems,
    total: {
      calories: Math.round(totalCal),
      protein: Math.round(totalP * 10) / 10,
      carbs: Math.round(totalC * 10) / 10,
      fat: Math.round(totalF * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
      sugar: Math.round(totalSugar * 10) / 10,
      vitamins: {
        vitamin_a_iu: Math.round(totVitA * 10) / 10,
        vitamin_c_mg: Math.round(totVitC * 10) / 10,
        calcium_mg: Math.round(totCalcium * 10) / 10,
        iron_mg: Math.round(totIron * 10) / 10,
        potassium_mg: Math.round(totPotassium * 10) / 10,
      },
    },
  });
};

  // Add Manual Custom Meal Item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItem.name) return;
    const g = parseFloat(customItem.portion.replace(/[^0-9.]/g, '')) || 0;
    const cal = Number(customItem.calories) || 0;
    const prot = Number(customItem.protein) || 0;
    const carb = Number(customItem.carbs) || 0;
    const fatVal = Number(customItem.fat) || 0;

    const newItem: any = {
      name: customItem.name,
      portion: g > 0 ? `${g}g` : customItem.portion,
      grams: g,
      initialGrams: g,
      calories: cal,
      initialCalories: cal,
      protein: prot,
      initialProtein: prot,
      carbs: carb,
      initialCarbs: carb,
      fat: fatVal,
      initialFat: fatVal,
    };

    const currentItems = result ? [...result.items, newItem] : [newItem];
    const totalCal = currentItems.reduce((acc, i) => acc + i.calories, 0);
    const totalP = currentItems.reduce((acc, i) => acc + i.protein, 0);
    const totalC = currentItems.reduce((acc, i) => acc + i.carbs, 0);
    const totalF = currentItems.reduce((acc, i) => acc + i.fat, 0);

    setResult({
      scan_id: result?.scan_id || `foodscan_${Date.now()}`,
      items: currentItems,
      total: { calories: Math.round(totalCal), protein: Math.round(totalP), carbs: Math.round(totalC), fat: Math.round(totalF) },
      confidence: 0.95,
    });
    setState('results');
    setCustomItem({ name: '', portion: '', calories: '', protein: '', carbs: '', fat: '' });
  };

  // Persist Confirmed Meal Log to PostgreSQL Database
  const handleConfirmToDiary = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await customerApi.confirmFoodScan(result.scan_id, {
        meal_name: mealName,
        meal_type: mealType,
        total: result.total,
        items: result.items,
      } as any);
      setToast(res.message || 'Meal saved to your nutrition diary in PostgreSQL!');
      setTimeout(() => setToast(null), 4000);
    } catch (_err) {
      setToast('Failed to save meal to nutrition diary.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="AI Vision Food Scanner" breadcrumb={['Customer', 'Food Scanner']} />

      {/* Hidden Offscreen Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      {toast && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <Icon name="info" size={16} className="text-brand-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live WebRTC Camera & Capture Controls */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-navy-900 mb-4 flex items-center justify-between">
              <span>Real Camera Viewfinder</span>
              <Badge variant="ai">
                {state === 'camera' ? 'Live Auto Scanning' : 'Live AI Vision'}
              </Badge>
            </h3>

            {/* Viewfinder State 1: Idle (Prompt to start camera) */}
            {state === 'idle' && (
              <div
                className="aspect-square rounded-2xl border-2 border-dashed border-navy-200 flex flex-col items-center justify-center gap-4 hover:border-brand-400 hover:bg-brand-50/30 transition-colors cursor-pointer group p-4"
                onClick={() => startCamera()}
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon name="camera" size={32} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-navy-900">Click to Open Live Camera</div>
                  <div className="text-xs text-navy-400 mt-1">Real-time auto food recognition</div>
                </div>
              </div>
            )}

            {/* Viewfinder State 2: Active Real Camera Stream with Live Auto-Scan Overlay */}
            {state === 'camera' && (
              <div className="aspect-square rounded-2xl bg-black relative overflow-hidden flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                {/* Top Floating Live AI Auto-Scan Pill */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 bg-black/75 backdrop-blur px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-white shadow-md">
                  <div className="flex items-center gap-2 truncate">
                    {isAutoScanning ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{liveDetectionStatus}</span>
                  </div>
                </div>

                {/* Camera Target Overlay Reticle */}
                <div className="absolute inset-10 border-2 border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-brand-400" />
                    <span className="w-4 h-4 border-t-2 border-r-2 border-brand-400" />
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-brand-400" />
                    <span className="w-4 h-4 border-b-2 border-r-2 border-brand-400" />
                  </div>
                </div>

                {/* Camera Controls Bar */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <button
                    onClick={toggleCameraFacing}
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black"
                    title="Switch Camera"
                  >
                    <Icon name="refresh-cw" size={18} />
                  </button>

                  {/* Shutter Button (Manual Override) */}
                  <button
                    onClick={handleCaptureShutter}
                    className="w-14 h-14 rounded-full bg-white border-4 border-brand-600 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                    title="Manual Shutter Capture"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-600" />
                  </button>

                  <button
                    onClick={() => {
                      stopCamera();
                      setState('idle');
                    }}
                    className="w-10 h-10 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black"
                    title="Close Camera"
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Viewfinder State 3: AI Scanning Processing */}
            {state === 'scanning' && (
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-navy-900 to-navy-950 flex flex-col items-center justify-center gap-4 relative overflow-hidden text-white">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-400/40 flex items-center justify-center animate-pulse">
                  <Icon name="sparkles" size={32} className="text-brand-400" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white">AI Vision Analyzing Meal...</div>
                  <div className="text-xs text-navy-300 mt-1">Identifying items, portions & macros</div>
                </div>
              </div>
            )}

            {/* Viewfinder State 4: Results Image Thumbnail */}
            {state === 'results' && (
              <div className="aspect-square rounded-2xl bg-slate-900 relative overflow-hidden border border-slate-200 shadow-inner">
                {capturedImageBase64 ? (
                  <img src={capturedImageBase64} alt="Captured Meal" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center">
                    <Icon name="apple" size={48} className="text-brand-400 mb-2" />
                    <span className="text-sm font-bold">{mealName}</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur p-2.5 rounded-xl flex items-center justify-between text-white text-xs font-bold border border-white/10">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Icon name="check-circle" size={14} /> Photo Captured
                  </span>
                  <button onClick={() => startCamera()} className="text-brand-400 hover:underline flex items-center gap-1">
                    <Icon name="camera" size={14} /> Retake
                  </button>
                </div>
              </div>
            )}

            {/* Camera & Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={state === 'scanning'}
                className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2.5"
              >
                <Icon name="upload" size={14} /> Upload Photo
              </button>
              <button
                onClick={() => startCamera()}
                disabled={state === 'scanning'}
                className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5"
              >
                <Icon name="camera" size={14} /> Open Live Camera
              </button>
            </div>
          </div>

          {/* Add Custom Meal Item Form */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-bold text-navy-900">Add Custom Food Item</h3>
            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-navy-700 mb-1 block">Food Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Oats with Peanut Butter"
                  value={customItem.name}
                  onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Calories (kcal)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={customItem.calories}
                    onChange={(e) => setCustomItem({ ...customItem, calories: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={customItem.protein}
                    onChange={(e) => setCustomItem({ ...customItem, protein: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={customItem.carbs}
                    onChange={(e) => setCustomItem({ ...customItem, carbs: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-navy-700 mb-1 block">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="8"
                    value={customItem.fat}
                    onChange={(e) => setCustomItem({ ...customItem, fat: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <button type="submit" className="btn-secondary w-full text-xs flex items-center justify-center gap-1">
                <Icon name="plus" size={14} /> Add Item to Analysis
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Scan Results & Interactive Portion Sliders */}
        <div className="card p-5 lg:col-span-2">
          {state !== 'results' || !result ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm border border-brand-100">
                <Icon name="scan-line" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">No Active Meal Scan Analyzed</h3>
                <p className="text-xs text-navy-500 mt-1 max-w-md leading-relaxed">
                  Click <strong>Open Live Camera</strong>. The AI scanner continuously analyzes your camera feed in real time and automatically locks onto your meal plate!
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-sm"
                >
                  <Icon name="upload" size={14} /> Upload Photo
                </button>
                <button
                  onClick={() => startCamera()}
                  className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-xl shadow-md"
                >
                  <Icon name="camera" size={14} /> Open Live Camera
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header Status & Captured Photo Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-navy-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Photo Captured & Analyzed
                    </span>
                    <span className="text-xs text-navy-400">•</span>
                    <span className="text-xs font-semibold text-navy-500">{result.items.length} Food Items Detected</span>
                  </div>
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="text-lg font-black text-navy-900 bg-transparent border-b border-dashed border-navy-300 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="input-field text-xs py-1.5"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Dinner</option>
                    <option>Snack</option>
                  </select>
                  <Badge variant="ai">
                    <Icon name="sparkles" size={12} /> {Math.round((result.confidence || 0.95) * 100)}% Confidence
                  </Badge>
                </div>
              </div>

              {/* Detected Items List with Interactive Portion Sliders */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Detected Food Items & Portion Controls</h4>

                {result.items.map((food: any, idx: number) => {
                  const gramsVal = food.grams || 150;

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                            <Icon name="apple" size={18} className="text-brand-600" />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-navy-900">{food.name}</div>
                            <div className="text-xs text-navy-500 font-semibold mt-0.5">
                              {food.calories} kcal · P: {food.protein}g, C: {food.carbs}g, F: {food.fat}g · 🥗 Fiber: {food.fiber || 0}g, 🍇 Sugar: {food.sugar || 0}g
                            </div>
                          </div>
                        </div>

                        {/* Portion Gram Badge */}
                        <div className="bg-white border border-navy-200 px-3 py-1 rounded-xl text-xs font-mono font-bold text-brand-600 shadow-sm">
                          {food.portion || `${gramsVal}g`}
                        </div>
                      </div>

                      {/* Interactive Gram Portion Slider */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-navy-500">
                          <span>Adjust Weight (Grams):</span>
                          <span className="text-navy-900">{gramsVal}g</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateItemGrams(idx, gramsVal - 25)}
                            className="w-7 h-7 rounded-lg bg-white border border-navy-200 text-navy-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center shrink-0"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="20"
                            max="500"
                            step="5"
                            value={gramsVal}
                            onChange={(e) => handleUpdateItemGrams(idx, parseFloat(e.target.value))}
                            className="w-full h-2 bg-navy-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                          />
                          <button
                            onClick={() => handleUpdateItemGrams(idx, gramsVal + 25)}
                            className="w-7 h-7 rounded-lg bg-white border border-navy-200 text-navy-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Macro & Micronutrient Summary Totals */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Total Meal Macronutrients & Fiber</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="text-center p-3 rounded-2xl bg-brand-50/50 border border-brand-200/60">
                    <div className="text-[11px] text-brand-700 font-bold mb-0.5">Total Calories</div>
                    <div className="text-lg font-black text-brand-700">{result.total.calories} kcal</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
                    <div className="text-[11px] text-emerald-700 font-bold mb-0.5">Protein</div>
                    <div className="text-lg font-black text-emerald-700">{result.total.protein} g</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                    <div className="text-[11px] text-amber-700 font-bold mb-0.5">Carbs</div>
                    <div className="text-lg font-black text-amber-700">{result.total.carbs} g</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-rose-50/50 border border-rose-200/60">
                    <div className="text-[11px] text-rose-700 font-bold mb-0.5">Fats</div>
                    <div className="text-lg font-black text-rose-700">{result.total.fat} g</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-teal-50/50 border border-teal-200/60">
                    <div className="text-[11px] text-teal-700 font-bold mb-0.5">Dietary Fiber</div>
                    <div className="text-lg font-black text-teal-700">{result.total.fiber || 0} g</div>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-purple-50/50 border border-purple-200/60">
                    <div className="text-[11px] text-purple-700 font-bold mb-0.5">Sugars</div>
                    <div className="text-lg font-black text-purple-700">{result.total.sugar || 0} g</div>
                  </div>
                </div>

                {/* Micronutrients / Vitamins Breakdown */}
                {result.total.vitamins && (
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <Icon name="sparkles" size={14} className="text-indigo-600" /> Essential Vitamins & Minerals
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-medium text-indigo-950">
                      <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-semibold">Vitamin A</span>
                        <span className="font-extrabold">{result.total.vitamins.vitamin_a_iu || 0} IU</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-semibold">Vitamin C</span>
                        <span className="font-extrabold">{result.total.vitamins.vitamin_c_mg || 0} mg</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-semibold">Calcium</span>
                        <span className="font-extrabold">{result.total.vitamins.calcium_mg || 0} mg</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-semibold">Iron</span>
                        <span className="font-extrabold">{result.total.vitamins.iron_mg || 0} mg</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                        <span className="text-[10px] text-indigo-600 block font-semibold">Potassium</span>
                        <span className="font-extrabold">{result.total.vitamins.potassium_mg || 0} mg</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save to PostgreSQL Button */}
              <div className="pt-4 border-t border-navy-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setState('idle');
                  }}
                  className="btn-secondary text-xs"
                >
                  Discard
                </button>
                <button onClick={handleConfirmToDiary} disabled={saving} className="btn-primary text-xs flex items-center gap-2">
                  <Icon name="check" size={16} /> {saving ? 'Saving to Database...' : 'Save Meal to PostgreSQL Diary'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
