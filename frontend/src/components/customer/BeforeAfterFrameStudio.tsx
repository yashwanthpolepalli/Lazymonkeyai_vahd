import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { BeforeAfterFrameItem, CustomerProfile } from '@/types/customer';

interface BeforeAfterFrameStudioProps {
  profile?: CustomerProfile | null;
  initialBeforeImage?: string;
  initialAfterImage?: string;
  onToast?: (msg: string) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => String(currentYear - 5 + i));

export const TEMPLATES = [
  {
    id: 'cyber-gold',
    name: 'FitClub Gold',
    desc: 'Mockup Dark Gunmetal with Metallic Gold & Central Badge',
    badge: 'Official',
    bg: 'from-[#12161f] via-[#1a212d] to-[#10141b]',
    border: 'border-amber-500/40',
    accentColor: '#eab308',
    cardBg: 'bg-[#1e2634]',
    textColor: 'text-amber-400',
    arrowColor: '#eab308',
  },
  {
    id: 'neon-matrix',
    name: 'Neon Cyberpunk',
    desc: 'High-energy Electric Cyan & Emerald Glow',
    badge: 'Popular',
    bg: 'from-[#0b131f] via-[#091e2f] to-[#04121d]',
    border: 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)]',
    accentColor: '#06b6d4',
    cardBg: 'bg-[#0f2334]',
    textColor: 'text-cyan-400',
    arrowColor: '#06b6d4',
  },
  {
    id: 'minimal-luxe',
    name: 'Minimalist Luxe',
    desc: 'Frosted Glass, Clean Serif & Subtle Gym Branding',
    badge: 'Aesthetic',
    bg: 'from-[#1e1b2e] via-[#241a38] to-[#151221]',
    border: 'border-purple-400/40',
    accentColor: '#c084fc',
    cardBg: 'bg-[#292040]',
    textColor: 'text-purple-300',
    arrowColor: '#c084fc',
  },
  {
    id: 'iron-stencil',
    name: 'Hardcore Iron',
    desc: 'Heavy Metal Stencil with Crimson Power Accents',
    badge: 'Beast',
    bg: 'from-[#1a1414] via-[#241818] to-[#120d0d]',
    border: 'border-red-500/50',
    accentColor: '#ef4444',
    cardBg: 'bg-[#261b1b]',
    textColor: 'text-red-400',
    arrowColor: '#ef4444',
  },
  {
    id: 'emerald-athletic',
    name: 'Emerald Athletic',
    desc: 'Clean Performance Green for Fitness & Wellness',
    badge: 'Fresh',
    bg: 'from-[#0d1f17] via-[#112920] to-[#081711]',
    border: 'border-emerald-500/40',
    accentColor: '#10b981',
    cardBg: 'bg-[#143026]',
    textColor: 'text-emerald-400',
    arrowColor: '#10b981',
  },
  {
    id: 'story-916',
    name: 'Insta Story 9:16',
    desc: 'Full-bleed Story Card format for IG & WhatsApp',
    badge: 'Social',
    bg: 'from-[#0f172a] via-[#1e293b] to-[#0f172a]',
    border: 'border-brand-500/50',
    accentColor: '#f59e0b',
    cardBg: 'bg-[#1e293b]',
    textColor: 'text-amber-400',
    arrowColor: '#f59e0b',
  },
];

export function BeforeAfterFrameStudio({
  profile,
  initialBeforeImage = '',
  initialAfterImage = '',
  onToast,
}: BeforeAfterFrameStudioProps) {
  // Photos & Dates State
  const [beforeImage, setBeforeImage] = useState<string>(initialBeforeImage);
  const [afterImage, setAfterImage] = useState<string>(initialAfterImage);
  
  const [beforeMonth, setBeforeMonth] = useState<string>('Jan');
  const [beforeYear, setBeforeYear] = useState<string>(String(currentYear));
  const [afterMonth, setAfterMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [afterYear, setAfterYear] = useState<string>(String(currentYear));
  
  // Custom Metrics & Details
  const [beforeWeight, setBeforeWeight] = useState<string>(profile?.weight ? String(profile.weight) : '85');
  const [afterWeight, setAfterWeight] = useState<string>(profile?.target_weight ? String(profile.target_weight) : '74');
  const [customCaption, setCustomCaption] = useState<string>('Consistency Beats Talent • Trust The Process');
  const [gymBranding, setGymBranding] = useState<string>('FITCLUB AI');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('cyber-gold');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('4:5');
  const [showWeights, setShowWeights] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  // Gallery state (persisted in localStorage + memory)
  const [gallery, setGallery] = useState<BeforeAfterFrameItem[]>(() => {
    try {
      const saved = localStorage.getItem('fitclub_ai_transformation_gallery');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal / Camera states
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState<'before' | 'after'>('before');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoTipsModalOpen, setPhotoTipsModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Refs
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sync initial images if provided
  useEffect(() => {
    if (initialBeforeImage && !beforeImage) setBeforeImage(initialBeforeImage);
    if (initialAfterImage && !afterImage) setAfterImage(initialAfterImage);
  }, [initialBeforeImage, initialAfterImage]);

  // Save gallery to localStorage
  const saveGalleryToStorage = (items: BeforeAfterFrameItem[]) => {
    setGallery(items);
    try {
      localStorage.setItem('fitclub_ai_transformation_gallery', JSON.stringify(items));
    } catch (_e) {
      /* ignore storage quota errors */
    }
  };

  // Calculate elapsed months
  const calculateElapsedMonths = () => {
    const bMonthIdx = MONTHS.indexOf(beforeMonth);
    const aMonthIdx = MONTHS.indexOf(afterMonth);
    const bY = parseInt(beforeYear, 10);
    const aY = parseInt(afterYear, 10);
    if (isNaN(bY) || isNaN(aY)) return 'Transformation';

    const diff = (aY - bY) * 12 + (aMonthIdx - bMonthIdx);
    if (diff <= 0) return 'Same Period';
    if (diff === 1) return '1 Month Journey';
    if (diff < 12) return `${diff} Months Journey`;
    const yrs = Math.floor(diff / 12);
    const remM = diff % 12;
    return remM > 0 ? `${yrs}y ${remM}m Journey` : `${yrs} Year Journey`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (target === 'before') {
          setBeforeImage(base64);
        } else {
          setAfterImage(base64);
        }
        onToast?.(`✅ ${target === 'before' ? 'Before' : 'After'} photo uploaded successfully!`);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    e.target.value = '';
  };

  // Camera Handler
  const startCamera = async (target: 'before' | 'after') => {
    setActiveCameraTarget(target);
    setCameraModalOpen(true);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (_err) {
      onToast?.('Camera permission denied or camera not found. Please upload from gallery.');
      setCameraModalOpen(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraModalOpen(false);
    setCountdown(null);
  };

  const capturePhoto = () => {
    setCountdown(3);
    let current = 3;
    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
      } else {
        clearInterval(interval);
        setCountdown(null);
        doSnap();
      }
    }, 800);
  };

  const doSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (cameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      if (activeCameraTarget === 'before') {
        setBeforeImage(dataUrl);
      } else {
        setAfterImage(dataUrl);
      }
      onToast?.(`📸 Live ${activeCameraTarget === 'before' ? 'Before' : 'After'} photo captured!`);
    }
    stopCamera();
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    setTimeout(() => {
      startCamera(activeCameraTarget);
    }, 100);
  };

  // Render Frame onto High-Resolution Canvas for Export/Download
  const generateFrameCanvas = async (): Promise<HTMLCanvasElement> => {
    const activeTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

    // Canvas sizes according to aspect ratio
    let canvasW = 1200;
    let canvasH = 1200;
    if (aspectRatio === '4:5') {
      canvasW = 1080;
      canvasH = 1350;
    } else if (aspectRatio === '9:16') {
      canvasW = 1080;
      canvasH = 1920;
    } else if (aspectRatio === '16:9') {
      canvasW = 1600;
      canvasH = 900;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. Draw Background
    ctx.fillStyle = activeTpl.id === 'iron-stencil' ? '#140e0e' : activeTpl.id === 'minimal-luxe' ? '#171324' : '#111620';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle background mesh/gradient
    const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, activeTpl.accentColor + '15');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Outer Decorative Border
    ctx.strokeStyle = activeTpl.accentColor + '80';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, canvasW - 40, canvasH - 40);

    // Top Header: "BEFORE & AFTER"
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Inter", sans-serif';
    ctx.fillText('BEFORE & AFTER', canvasW / 2, 90);

    // Duration / Slogan Subheader
    const duration = calculateElapsedMonths();
    ctx.font = '700 20px "Inter", sans-serif';
    ctx.fillStyle = activeTpl.accentColor;
    ctx.fillText(duration.toUpperCase() + (customCaption ? ` • ${customCaption}` : ''), canvasW / 2, 130);

    // 2. Compute Card Dimensions
    const headerH = 160;
    const footerH = 140;
    const contentH = canvasH - headerH - footerH;
    const padding = 50;
    const cardGap = 40;
    const cardW = (canvasW - (padding * 2) - cardGap) / 2;
    const cardH = contentH;
    const cardY = headerH;

    const leftCardX = padding;
    const rightCardX = padding + cardW + cardGap;

    // Helper to load image
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });
    };

    // Draw Image with Rounded Rect & Cover Fit
    const drawPhotoSlot = async (
      imgSrc: string,
      x: number,
      y: number,
      w: number,
      h: number,
      label: 'BEFORE' | 'AFTER',
      month: string,
      year: string,
      weight?: string
    ) => {
      ctx.save();
      // Draw Card background
      ctx.fillStyle = '#1e2634';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 3;

      // Rounded Box
      const r = 24;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.clip();

      if (imgSrc) {
        try {
          const img = await loadImage(imgSrc);
          const imgRatio = img.width / img.height;
          const cardRatio = w / h;
          let renderW = w;
          let renderH = h;
          let offsetX = x;
          let offsetY = y;

          if (imgRatio > cardRatio) {
            renderW = h * imgRatio;
            offsetX = x - (renderW - w) / 2;
          } else {
            renderH = w / imgRatio;
            offsetY = y - (renderH - h) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
        } catch {
          // fallback placeholder
        }
      } else {
        // Placeholder text
        ctx.fillStyle = '#64748b';
        ctx.font = '600 24px "Inter", sans-serif';
        ctx.fillText(`Add ${label} Photo`, x + w / 2, y + h / 2);
      }

      // Bottom Dark Gradient on Card
      const cardGrad = ctx.createLinearGradient(x, y + h - 140, x, y + h);
      cardGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      cardGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = cardGrad;
      ctx.fillRect(x, y + h - 140, w, 140);

      // Label Pill
      ctx.fillStyle = label === 'BEFORE' ? 'rgba(255, 255, 255, 0.9)' : activeTpl.accentColor;
      ctx.font = '900 24px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h - 60);

      // Date Stamp & Weight
      ctx.font = '700 18px "Inter", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      const dateText = `${month.toUpperCase()} ${year}` + (showWeights && weight ? ` • ${weight} kg` : '');
      ctx.fillText(dateText, x + w / 2, y + h - 25);

      ctx.restore();
    };

    // Draw Before and After Cards
    await drawPhotoSlot(beforeImage, leftCardX, cardY, cardW, cardH, 'BEFORE', beforeMonth, beforeYear, beforeWeight);
    await drawPhotoSlot(afterImage, rightCardX, cardY, cardW, cardH, 'AFTER', afterMonth, afterYear, afterWeight);

    // 3. Central Divider Badge (FitClub AI + Arrow)
    const centerX = canvasW / 2;
    const centerY = cardY + cardH / 2;

    // Central Pill
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = activeTpl.accentColor;
    ctx.lineWidth = 3;
    const pillW = 60;
    const pillH = 140;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(centerX - pillW / 2, centerY - pillH / 2, pillW, pillH, 30) : ctx.rect(centerX - pillW / 2, centerY - pillH / 2, pillW, pillH);
    ctx.fill();
    ctx.stroke();

    // Vertical FitClub AI text
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px "Inter", sans-serif';
    ctx.fillText(gymBranding.toUpperCase(), 0, 4);
    ctx.restore();

    // Gold Arrow below divider
    ctx.fillStyle = activeTpl.accentColor;
    ctx.beginPath();
    ctx.moveTo(centerX - 16, cardY + cardH + 16);
    ctx.lineTo(centerX + 18, cardY + cardH + 32);
    ctx.lineTo(centerX - 16, cardY + cardH + 48);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 4. Footer Branding & Weight Transformation Result
    if (showWatermark) {
      ctx.textAlign = 'center';
      ctx.font = '900 24px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(gymBranding, canvasW / 2, canvasH - 65);

      ctx.font = '600 15px "Inter", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Official AI Fitness Transformation Studio • Verified Result', canvasW / 2, canvasH - 35);
    }

    if (showWeights && beforeWeight && afterWeight) {
      const bW = parseFloat(beforeWeight);
      const aW = parseFloat(afterWeight);
      if (!isNaN(bW) && !isNaN(aW)) {
        const delta = Math.round((aW - bW) * 10) / 10;
        const deltaText = delta < 0 ? `${Math.abs(delta)} kg Fat Loss 🔥` : `+${delta} kg Lean Mass 💪`;
        ctx.font = '800 20px "Inter", sans-serif';
        ctx.fillStyle = delta < 0 ? '#10b981' : '#38bdf8';
        ctx.fillText(deltaText, canvasW / 2, canvasH - 95);
      }
    }

    return canvas;
  };

  // Download Frame as Image
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await generateFrameCanvas();
      const link = document.createElement('a');
      link.download = `FitClub_AI_Transformation_${beforeMonth}_${beforeYear}_to_${afterMonth}_${afterYear}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      onToast?.('🎉 Transformation Frame downloaded in ultra HD!');
    } catch (_err) {
      onToast?.('Failed to download transformation image.');
    } finally {
      setDownloading(false);
    }
  };

  // Save to Gallery
  const handleSaveToGallery = () => {
    if (!beforeImage && !afterImage) {
      onToast?.('Please add at least one photo before saving to gallery.');
      return;
    }

    const newItem: BeforeAfterFrameItem = {
      id: 'frame_' + Date.now(),
      template_id: selectedTemplate,
      aspect_ratio: aspectRatio,
      before_image: beforeImage,
      after_image: afterImage,
      before_date_month: beforeMonth,
      before_date_year: beforeYear,
      after_date_month: afterMonth,
      after_date_year: afterYear,
      before_weight_kg: beforeWeight,
      after_weight_kg: afterWeight,
      duration_text: calculateElapsedMonths(),
      caption: customCaption,
      gym_branding: gymBranding,
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...gallery];
    saveGalleryToStorage(updated);
    onToast?.('💾 Transformation saved to your Before & After Gallery!');
  };

  // Share Frame
  const handleShare = async () => {
    if (navigator.share) {
      try {
        const canvas = await generateFrameCanvas();
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'my_transformation.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: 'My FitClub AI Fitness Transformation',
                text: `Check out my Before & After journey from ${beforeMonth} ${beforeYear} to ${afterMonth} ${afterYear}! #FitClubAI #FitnessJourney`,
                files: [file],
              });
              onToast?.('Shared successfully!');
              return;
            }
          }
          // Fallback share without file
          await navigator.share({
            title: 'My FitClub AI Fitness Transformation',
            text: `Check out my Before & After journey from ${beforeMonth} ${beforeYear} to ${afterMonth} ${afterYear}!`,
            url: window.location.href,
          });
        }, 'image/png');
      } catch (_err) {
        setShareModalOpen(true);
      }
    } else {
      setShareModalOpen(true);
    }
  };

  // Load an item from gallery into editor
  const loadGalleryItem = (item: BeforeAfterFrameItem) => {
    setBeforeImage(item.before_image || '');
    setAfterImage(item.after_image || '');
    setBeforeMonth(item.before_date_month || 'Jan');
    setBeforeYear(item.before_date_year || String(currentYear));
    setAfterMonth(item.after_date_month || 'Aug');
    setAfterYear(item.after_date_year || String(currentYear));
    if (item.before_weight_kg) setBeforeWeight(String(item.before_weight_kg));
    if (item.after_weight_kg) setAfterWeight(String(item.after_weight_kg));
    if (item.template_id) setSelectedTemplate(item.template_id);
    if (item.aspect_ratio) setAspectRatio(item.aspect_ratio);
    if (item.caption) setCustomCaption(item.caption);
    setGymBranding(item.gym_branding || 'FITCLUB AI');
    onToast?.('✨ Loaded transformation into designer!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteGalleryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = gallery.filter((g) => g.id !== id);
    saveGalleryToStorage(filtered);
    onToast?.('Item removed from gallery.');
  };

  const currentTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Hidden File Inputs for Before & After */}
      <input
        ref={beforeFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'before')}
      />
      <input
        ref={afterFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'after')}
      />

      {/* Main Studio Frame Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT / TOP: LIVE DESIGNER FRAME (Matches User Mockup Exactly) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Main Visual Frame Container */}
          <div
            ref={frameContainerRef}
            className={`w-full max-w-lg rounded-[2.5rem] p-5 sm:p-7 border bg-gradient-to-b ${currentTpl.bg} ${currentTpl.border} shadow-2xl relative transition-all duration-300`}
            style={{
              aspectRatio:
                aspectRatio === '1:1'
                  ? '1 / 1'
                  : aspectRatio === '4:5'
                  ? '4 / 5'
                  : aspectRatio === '9:16'
                  ? '9 / 16'
                  : '16 / 9',
            }}
          >
            {/* Frame Top Header */}
            <div className="text-center pt-1 pb-4">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase drop-shadow">
                BEFORE & AFTER
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: `${currentTpl.accentColor}25`, color: currentTpl.accentColor }}
                >
                  {calculateElapsedMonths()}
                </span>
              </div>
            </div>

            {/* Side-by-Side Dual Photo Cards (Exact UI from Mockup) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 relative my-auto">
              {/* Left: BEFORE Photo Card */}
              <div
                onClick={() => !beforeImage && beforeFileInputRef.current?.click()}
                className={`relative aspect-[3/4] rounded-2xl sm:rounded-3xl border border-white/10 ${currentTpl.cardBg} flex flex-col items-center justify-center p-3 text-center cursor-pointer group overflow-hidden transition-transform duration-200 hover:scale-[1.01]`}
              >
                {beforeImage ? (
                  <>
                    <img
                      src={beforeImage}
                      alt="Before Transformation"
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl sm:rounded-3xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    {/* Re-upload / Camera overlay button on hover */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Upload from gallery"
                        onClick={(e) => {
                          e.stopPropagation();
                          beforeFileInputRef.current?.click();
                        }}
                        className="p-1.5 rounded-full bg-black/70 text-white hover:bg-brand-600 transition"
                      >
                        <Icon name="upload" size={12} />
                      </button>
                      <button
                        title="Capture with Camera"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCamera('before');
                        }}
                        className="p-1.5 rounded-full bg-black/70 text-white hover:bg-brand-600 transition"
                      >
                        <Icon name="camera" size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-2">
                    {/* Gold Landscape Icon */}
                    <div className="w-12 h-10 sm:w-14 sm:h-11 mx-auto rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <Icon name="image" size={24} className="text-amber-400" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-tight">
                      Tap to add a<br />before photo
                    </p>
                    {/* Yellow Plus Circle */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition">
                      <Icon name="plus" size={18} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {/* Bottom Label & Date Stamp */}
                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
                  <span className="text-xs sm:text-sm font-black text-white tracking-widest block uppercase">
                    BEFORE
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 block">
                    {beforeMonth.toUpperCase()} {beforeYear}
                    {showWeights && beforeWeight ? ` • ${beforeWeight}kg` : ''}
                  </span>
                </div>
              </div>

              {/* Center Divider: FitClub AI Badge (Exact mockup) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
                <div className="px-2 py-3 rounded-xl bg-slate-900/90 border border-white/20 shadow-2xl backdrop-blur-md flex items-center justify-center">
                  <span
                    className="text-[10px] font-black tracking-widest text-white [writing-mode:vertical-lr] rotate-180"
                    style={{ letterSpacing: '0.15em' }}
                  >
                    {gymBranding}
                  </span>
                </div>
              </div>

              {/* Right: AFTER Photo Card */}
              <div
                onClick={() => !afterImage && afterFileInputRef.current?.click()}
                className={`relative aspect-[3/4] rounded-2xl sm:rounded-3xl border border-white/10 ${currentTpl.cardBg} flex flex-col items-center justify-center p-3 text-center cursor-pointer group overflow-hidden transition-transform duration-200 hover:scale-[1.01]`}
              >
                {afterImage ? (
                  <>
                    <img
                      src={afterImage}
                      alt="After Transformation"
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl sm:rounded-3xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                    {/* Re-upload / Camera overlay button on hover */}
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Upload from gallery"
                        onClick={(e) => {
                          e.stopPropagation();
                          afterFileInputRef.current?.click();
                        }}
                        className="p-1.5 rounded-full bg-black/70 text-white hover:bg-brand-600 transition"
                      >
                        <Icon name="upload" size={12} />
                      </button>
                      <button
                        title="Capture with Camera"
                        onClick={(e) => {
                          e.stopPropagation();
                          startCamera('after');
                        }}
                        className="p-1.5 rounded-full bg-black/70 text-white hover:bg-brand-600 transition"
                      >
                        <Icon name="camera" size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-2">
                    {/* Gold Landscape Icon */}
                    <div className="w-12 h-10 sm:w-14 sm:h-11 mx-auto rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                      <Icon name="image" size={24} className="text-amber-400" />
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-tight">
                      Tap to add an<br />after photo
                    </p>
                    {/* Yellow Plus Circle */}
                    <div className="w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition">
                      <Icon name="plus" size={18} strokeWidth={3} />
                    </div>
                  </div>
                )}

                {/* Bottom Label & Date Stamp */}
                <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
                  <span
                    className="text-xs sm:text-sm font-black tracking-widest block uppercase"
                    style={{ color: currentTpl.accentColor }}
                  >
                    AFTER
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 block">
                    {afterMonth.toUpperCase()} {afterYear}
                    {showWeights && afterWeight ? ` • ${afterWeight}kg` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Gold Arrow Indicator Between Before & After (Mockup) */}
            <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
              <span className="w-0 h-0 border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[12px] border-l-amber-400 inline-block drop-shadow" />
            </div>

            {/* Frame Bottom Branding */}
            {showWatermark && (
              <div className="text-center pt-2 pb-1">
                <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                  ⚡ {gymBranding} OFFICIAL FITNESS TRANSFORMATION
                </span>
              </div>
            )}
          </div>

          {/* Quick Upload Buttons Bar */}
          <div className="w-full max-w-lg mt-4 grid grid-cols-2 gap-3">
            {/* Before Upload Options */}
            <div className="p-3 rounded-2xl bg-white border border-navy-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                <Icon name="image" size={14} className="text-amber-500" />
                Before Photo
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => beforeFileInputRef.current?.click()}
                  className="py-1.5 px-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-700 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                >
                  <Icon name="upload" size={12} /> Gallery
                </button>
                <button
                  onClick={() => startCamera('before')}
                  className="py-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                >
                  <Icon name="camera" size={12} /> Live
                </button>
              </div>
            </div>

            {/* After Upload Options */}
            <div className="p-3 rounded-2xl bg-white border border-navy-100 shadow-sm space-y-2">
              <span className="text-xs font-bold text-navy-800 flex items-center gap-1.5">
                <Icon name="sparkles" size={14} className="text-emerald-500" />
                After Photo
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => afterFileInputRef.current?.click()}
                  className="py-1.5 px-2 rounded-xl bg-navy-50 hover:bg-navy-100 text-navy-700 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                >
                  <Icon name="upload" size={12} /> Gallery
                </button>
                <button
                  onClick={() => startCamera('after')}
                  className="py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                >
                  <Icon name="camera" size={12} /> Live
                </button>
              </div>
            </div>
          </div>

          {/* Frame Actions: Download, Share, Save */}
          <div className="w-full max-w-lg mt-4 grid grid-cols-3 gap-3">
            <button
              onClick={handleSaveToGallery}
              className="py-3 px-4 rounded-2xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-800 text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition hover:scale-[1.02]"
            >
              <Icon name="bookmark-check" size={16} className="text-brand-600" />
              <span>Save</span>
            </button>

            <button
              onClick={handleShare}
              className="py-3 px-4 rounded-2xl bg-white hover:bg-navy-50 border border-navy-200 text-navy-800 text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition hover:scale-[1.02]"
            >
              <Icon name="share-2" size={16} className="text-cyan-600" />
              <span>Share</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition hover:scale-[1.02] disabled:opacity-50"
            >
              <Icon name={downloading ? 'refresh-cw' : 'download'} size={16} className={downloading ? 'animate-spin' : ''} />
              <span>{downloading ? 'Exporting...' : 'Download'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT / BOTTOM: FRAME CUSTOMIZATION & SOCIAL TOOLS */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Date Range & Weight Details */}
          <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2 border-b border-navy-100 pb-3">
              <Icon name="calendar" size={16} className="text-brand-600" />
              Custom Date Range (Month & Year)
            </h3>

            {/* Before Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-navy-700 block">
                1. Before Photo Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={beforeMonth}
                  onChange={(e) => setBeforeMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={beforeYear}
                  onChange={(e) => setBeforeYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* After Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-navy-700 block">
                2. After Photo Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={afterMonth}
                  onChange={(e) => setAfterMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={afterYear}
                  onChange={(e) => setAfterYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Weight inputs */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-navy-600">Before Weight (kg)</label>
                <input
                  type="number"
                  value={beforeWeight}
                  onChange={(e) => setBeforeWeight(e.target.value)}
                  placeholder="85"
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-navy-600">After Weight (kg)</label>
                <input
                  type="number"
                  value={afterWeight}
                  onChange={(e) => setAfterWeight(e.target.value)}
                  placeholder="74"
                  className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold text-navy-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWeights}
                  onChange={(e) => setShowWeights(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Display weights on frame
              </label>
              <label className="text-xs font-bold text-navy-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Gym watermark
              </label>
            </div>
          </div>

          {/* 2. Stylish Frame Templates */}
          <div className="card p-6 bg-white border border-navy-100 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2 border-b border-navy-100 pb-3">
              <Icon name="palette" size={16} className="text-brand-600" />
              Social Media Frame Templates
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedTemplate === tpl.id
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/50'
                      : 'border-navy-100 hover:border-navy-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-navy-900">{tpl.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-100 font-bold text-navy-600">
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-navy-400 leading-tight">{tpl.desc}</p>
                </button>
              ))}
            </div>

            {/* Aspect Ratio Selector */}
            <div className="pt-2 border-t border-navy-100 space-y-2">
              <label className="text-xs font-bold text-navy-700 block">Aspect Ratio / Format</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: '1:1', label: '1:1 Square' },
                  { id: '4:5', label: '4:5 Feed' },
                  { id: '9:16', label: '9:16 Story' },
                  { id: '16:9', label: '16:9 Wide' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id as any)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      aspectRatio === ar.id
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20'
                        : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Brand Tagline */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-navy-700 block">Custom Brand Name / Watermark</label>
              <input
                type="text"
                value={gymBranding}
                onChange={(e) => setGymBranding(e.target.value)}
                placeholder="FITCLUB AI"
                className="w-full px-3 py-2 rounded-xl bg-navy-50 border border-navy-200 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* GALLERY SECTION (Matches Mockup Bottom Area) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-navy-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-navy-900">Gallery</h3>
            <p className="text-xs text-navy-400">Your created and saved transformation frames</p>
          </div>
          <button
            onClick={() => setPhotoTipsModalOpen(true)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 underline underline-offset-4"
          >
            <Icon name="help-circle" size={14} />
            How to take a photo?
          </button>
        </div>

        {gallery.length === 0 ? (
          /* Exact Empty State from Mockup */
          <div className="card p-10 bg-gradient-to-b from-[#18202d] to-[#12161f] border border-slate-700/50 rounded-3xl shadow-xl text-center space-y-5">
            <div className="max-w-sm mx-auto space-y-2">
              <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
                You haven’t added any photos yet.
                <br />
                Take or add a photo to create your <strong className="text-amber-400 font-bold">Before & After</strong> picture.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  beforeFileInputRef.current?.click();
                }}
                className="px-8 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-400/20 transition hover:scale-105"
              >
                Add Photo
              </button>

              <button
                onClick={() => setPhotoTipsModalOpen(true)}
                className="text-xs font-bold text-slate-400 hover:text-white underline underline-offset-4"
              >
                How to take a photo?
              </button>
            </div>
          </div>
        ) : (
          /* Populated Gallery Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((item) => (
              <div
                key={item.id}
                onClick={() => loadGalleryItem(item)}
                className="group card p-4 bg-white border border-navy-100 hover:border-brand-500/50 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer space-y-3"
              >
                <div className="grid grid-cols-2 gap-2 aspect-[4/3] rounded-2xl overflow-hidden bg-navy-900 relative">
                  {item.before_image ? (
                    <img src={item.before_image} alt="Before" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-navy-400">
                      No Before
                    </div>
                  )}
                  {item.after_image ? (
                    <img src={item.after_image} alt="After" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-navy-400">
                      No After
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Delete frame"
                      onClick={(e) => deleteGalleryItem(item.id, e)}
                      className="p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-700 transition"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900">
                    {item.before_date_month} {item.before_date_year} → {item.after_date_month} {item.after_date_year}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
                    {item.duration_text || 'Journey'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-navy-400 border-t border-navy-50 pt-2">
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="text-brand-600 font-bold group-hover:underline flex items-center gap-1">
                    Edit in Studio <Icon name="chevron-right" size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* LIVE CAMERA CAPTURE MODAL */}
      {/* ───────────────────────────────────────────────────────── */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-navy-950 border border-navy-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5 text-white">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <span className="text-sm font-bold flex items-center gap-2">
                <Icon name="camera" size={18} className="text-amber-400" />
                Live Camera Capture ({activeCameraTarget === 'before' ? 'Before Photo' : 'After Photo'})
              </span>
              <button onClick={stopCamera} className="p-1 text-navy-400 hover:text-white">
                <Icon name="x" size={18} />
              </button>
            </div>

            {/* Video Preview with Overlay Grid */}
            <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-navy-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Grid Lines for alignment */}
              <div className="absolute inset-0 pointer-events-none border border-white/10 grid grid-cols-3 grid-rows-3 opacity-30" />

              {/* Countdown Overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-7xl font-black text-amber-400 animate-ping">{countdown}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4">
              <button
                onClick={toggleCameraFacing}
                className="p-3 rounded-2xl bg-navy-800 hover:bg-navy-700 text-white transition"
                title="Flip Camera"
              >
                <Icon name="refresh-cw" size={18} />
              </button>

              <button
                onClick={capturePhoto}
                disabled={countdown !== null}
                className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/30 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-950" />
                </div>
              </button>

              <button
                onClick={stopCamera}
                className="py-2 px-3 rounded-2xl bg-navy-800 hover:bg-navy-700 text-xs font-bold text-navy-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* "HOW TO TAKE A PHOTO?" TIPS MODAL */}
      {/* ───────────────────────────────────────────────────────── */}
      {photoTipsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Icon name="camera" size={18} className="text-amber-500" />
                How to Take Consistent Before & After Photos
              </h3>
              <button onClick={() => setPhotoTipsModalOpen(false)} className="text-navy-400 hover:text-navy-900">
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-navy-700">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                <span className="text-base">💡</span>
                <div>
                  <h4 className="font-bold text-navy-900">1. Consistent Frontal Lighting</h4>
                  <p className="text-navy-600">Avoid harsh overhead shadows. Use natural morning light or diffuse front room lighting.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-base">📐</span>
                <div>
                  <h4 className="font-bold text-navy-900">2. Same Distance & Height</h4>
                  <p className="text-navy-600">Place phone at chest or waist height, approximately 6 to 8 feet away against a plain wall.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-base">🧘</span>
                <div>
                  <h4 className="font-bold text-navy-900">3. Natural Relaxed Posture</h4>
                  <p className="text-navy-600">Stand straight with shoulders back and arms slightly away from sides. Don't suck in your stomach.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-base">⏰</span>
                <div>
                  <h4 className="font-bold text-navy-900">4. Morning Fasted Timing</h4>
                  <p className="text-navy-600">Take check-in photos first thing in the morning after using the restroom and before breakfast.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPhotoTipsModalOpen(false)}
              className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition"
            >
              Got It, Let’s Create!
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* SOCIAL SHARE MODAL */}
      {/* ───────────────────────────────────────────────────────── */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-navy-100 pb-3">
              <h3 className="text-base font-bold text-navy-900 flex items-center gap-2">
                <Icon name="share-2" size={18} className="text-brand-600" />
                Share Transformation
              </h3>
              <button onClick={() => setShareModalOpen(false)} className="text-navy-400 hover:text-navy-900">
                <Icon name="x" size={18} />
              </button>
            </div>

            <p className="text-xs text-navy-500">
              Showcase your hard work and inspire others on social media!
            </p>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out my fitness transformation on FitClub AI! From ${beforeMonth} ${beforeYear} to ${afterMonth} ${afterYear} 💪`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>💬 WhatsApp</span>
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My fitness transformation journey from ${beforeMonth} ${beforeYear} to ${afterMonth} ${afterYear}! #FitClubAI #FitnessTransformation`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <span>🐦 X / Twitter</span>
              </a>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                onToast?.('🔗 Page link copied to clipboard!');
                setShareModalOpen(false);
              }}
              className="w-full py-2.5 rounded-2xl bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Icon name="copy" size={14} /> Copy Page Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
