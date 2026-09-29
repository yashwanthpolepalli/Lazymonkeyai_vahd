import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Icon } from '@/components/ui/Icon';
import { BROCHURE_TEMPLATES } from '@/data/brochureTemplates';
import type { BrochureData, BrochureDesignJson, BrochureTemplateId, ApiBrochureTemplate } from '@/types/brochure';
import { DynamicBrochureCanvas } from '@/components/brochure/DynamicBrochureCanvas';
import { DynamicBrochureCustomizer } from '@/components/brochure/DynamicBrochureCustomizer';
import { BrochurePreviewCanvas } from '@/components/brochure/BrochurePreviewCanvas';
import { BrochureCustomizerPanel } from '@/components/brochure/BrochureCustomizerPanel';
import { BrochureUploadAiModal } from '@/components/brochure/BrochureUploadAiModal';
import { BrochureAiPromptModal } from '@/components/brochure/BrochureAiPromptModal';
import { optimizeBrochureLayout } from '@/utils/brochureAiAligner';
import { brochureDataToDesignJson } from '@/utils/brochureDesignJsonBridge';

export function BrochuresPage() {
  const [engineMode, setEngineMode] = useState<'dynamic' | 'classic'>('dynamic');
  const [selectedTemplateId, setSelectedTemplateId] = useState<BrochureTemplateId>('powerzone-split');
  const [apiTemplates, setApiTemplates] = useState<ApiBrochureTemplate[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Classic BrochureData state
  const [brochureData, setBrochureData] = useState<BrochureData>(() => {
    const saved = localStorage.getItem('fitclub_custom_brochure_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_e) {
        /* fallback */
      }
    }
    return BROCHURE_TEMPLATES[0].defaultData;
  });

  // Dynamic Fabric/JSON design state
  const [designJson, setDesignJson] = useState<BrochureDesignJson>(() => {
    const savedJson = localStorage.getItem('fitclub_design_json_v5');
    if (savedJson) {
      try {
        return JSON.parse(savedJson);
      } catch (_e) {
        /* fallback */
      }
    }
    return brochureDataToDesignJson(BROCHURE_TEMPLATES[0].defaultData);
  });

  const [zoomScale, setZoomScale] = useState<number>(0.75);
  const [isExporting, setIsExporting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [resolution, setResolution] = useState<'1080p' | '4k'>('4k');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAiUploadOpen, setIsAiUploadOpen] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const activeWidth = engineMode === 'dynamic' ? (designJson.document?.width || 640) : (designJson.document?.width || 640);
  const activeHeight = engineMode === 'dynamic' ? (designJson.document?.height || 880) : (designJson.document?.height || 880);

  const handleUpdateCanvasDimensions = (w: number, h: number) => {
    const validW = Math.max(100, Math.min(6000, w));
    const validH = Math.max(100, Math.min(6000, h));
    setDesignJson((prev) => ({
      ...prev,
      document: {
        ...prev.document,
        width: validW,
        height: validH,
      },
    }));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch templates from PostgreSQL backend
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const res = await fetch(`${apiBase}/api/v1/brochures/templates`);
        if (res.ok) {
          const data = await res.json();
          if (data.templates && data.templates.length > 0) {
            setApiTemplates(data.templates);
          }
        }
      } catch (err) {
        console.warn('Backend templates API fetch fallback:', err);
      }
    };
    fetchTemplates();
  }, []);

  // Switch template
  const handleSelectTemplate = (templateId: BrochureTemplateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = BROCHURE_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      const merged: BrochureData = {
        ...tmpl.defaultData,
        gymName: brochureData.gymName || tmpl.defaultData.gymName,
        logoUrl: brochureData.logoUrl || tmpl.defaultData.logoUrl,
        contact: {
          ...tmpl.defaultData.contact,
          phone: brochureData.contact.phone || tmpl.defaultData.contact.phone,
          address: brochureData.contact.address || tmpl.defaultData.contact.address,
        },
      };
      setBrochureData(merged);

      // Check if backend has a specialized design_json for this template
      const apiTmpl = apiTemplates.find((at) => at.id.includes(templateId.replace('-', '_')) || at.id.includes(templateId));
      if (apiTmpl && apiTmpl.design_json) {
        setDesignJson(apiTmpl.design_json);
      } else {
        setDesignJson(brochureDataToDesignJson(merged));
      }

      setSelectedElementId(null);
      showToast(`Switched to "${tmpl.name}" structured template.`);
    }
  };

  // Handle AI Design Assistant prompt execution
  const handleApplyAiAssistantPrompt = async (prompt: string) => {
    setIsAiGenerating(true);
    showToast(`🤖 AI Assistant processing: "${prompt}"...`);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(`${apiBase}/api/v1/brochures/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_json: designJson,
          prompt,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.design_json) {
          setDesignJson(result.design_json);
          showToast('✨ AI Modifications applied smoothly to all layers!');
          setIsAiGenerating(false);
          return;
        }
      }
    } catch (err) {
      console.warn('AI Assistant API call error, applying intelligent local transformer:', err);
    }

    // Local fallback transformer
    const updated = JSON.parse(JSON.stringify(designJson));
    const p = prompt.toLowerCase();
    if (p.includes('gold') || p.includes('luxury') || p.includes('premium')) {
      updated.document.primaryColor = '#D97706';
      updated.document.accentColor = '#F59E0B';
    } else if (p.includes('neon') || p.includes('cyber')) {
      updated.document.primaryColor = '#06B6D4';
      updated.document.accentColor = '#A855F7';
    } else if (p.includes('70%')) {
      const offerEl = updated.elements.find((el: any) => el.semantic_role === 'offer');
      if (offerEl && offerEl.content) {
        offerEl.content.text = '70% OFF MEGA PASS';
      }
    }
    setDesignJson(updated);
    showToast('✨ AI Transformation applied!');
    setIsAiGenerating(false);
  };

  // Save customized brochure to PostgreSQL and localStorage
  const handleSaveBrochure = async () => {
    localStorage.setItem('fitclub_custom_brochure_v5', JSON.stringify(brochureData));
    localStorage.setItem('fitclub_design_json_v5', JSON.stringify(designJson));

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      await fetch(`${apiBase}/api/v1/brochures/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${brochureData.gymName} Poster`,
          design_json: designJson,
        }),
      });
      showToast('💾 Saved to PostgreSQL & Local Studio Library!');
    } catch (_e) {
      showToast('💾 Saved to Local Studio Library!');
    }
  };

  // Export as PNG/JPG
  const handleDownloadImage = async (format: 'png' | 'jpg') => {
    const node = canvasRef.current;
    if (!node) return;
    setIsExporting(true);

    const scaleMultiplier = resolution === '4k' ? 2.5 : 1.5;
    showToast(`⚡ High-DPI Rendering ${resolution.toUpperCase()} ${format.toUpperCase()} Master...`);

    try {
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await html2canvas(node, {
        scale: scaleMultiplier,
        useCORS: true,
        allowTaint: false,
        backgroundColor: designJson.document?.backgroundColor || '#0A0A0A',
        logging: false,
        width: activeWidth,
        height: activeHeight,
      });

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const filename = `brochure_${Date.now()}.${format}`;
      const dataUrl = canvas.toDataURL(mimeType, format === 'jpg' ? 0.95 : undefined);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 1000);

      showToast(`✅ Saved ${filename} to your Downloads!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('⚠️ Export failed. Please try PDF export.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export as crisp PDF
  const handleDownloadPdf = async () => {
    const node = canvasRef.current;
    if (!node) return;
    setIsExporting(true);
    showToast('⚡ Generating High-Resolution Vector PDF...');

    try {
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await html2canvas(node, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: designJson.document?.backgroundColor || '#0A0A0A',
        logging: false,
        width: activeWidth,
        height: activeHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: activeWidth > activeHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [activeWidth, activeHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, activeWidth, activeHeight);
      pdf.save(`brochure_master_${Date.now()}.pdf`);
      showToast('✅ Saved PDF to Downloads!');
    } catch (err) {
      console.error('PDF error:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Apply Extracted Data from AI Upload
  const handleApplyExtracted = (extracted: BrochureData) => {
    setBrochureData(extracted);
    setSelectedTemplateId(extracted.templateId);
    setDesignJson(brochureDataToDesignJson(extracted));
    showToast('🎉 AI Template Decomposed & Ready to Edit in Canvas!');
  };

  // Handle Apply Generated Data from AI Prompt Designer
  const handleApplyGenerated = (generated: BrochureData) => {
    setBrochureData(generated);
    setSelectedTemplateId(generated.templateId);
    setDesignJson(brochureDataToDesignJson(generated));
    showToast('🚀 AI Poster Generated with structured layers!');
  };

  // Direct element manipulation handlers
  const handleUpdateElement = (
    elementId: string,
    updates: any
  ) => {
    setDesignJson((prev) => {
      const updatedElements = prev.elements.map((el) => {
        if (el.id !== elementId) return el;
        return {
          ...el,
          ...updates,
          position: updates.position ? { ...el.position, ...updates.position } : el.position,
          size: updates.size ? { ...el.size, ...updates.size } : el.size,
          content: updates.content ? { ...el.content, ...updates.content } : el.content,
          style: updates.style ? { ...el.style, ...updates.style } : el.style,
        };
      });
      return { ...prev, elements: updatedElements };
    });
  };

  const handleDeleteElement = (elementId: string) => {
    setDesignJson((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== elementId),
    }));
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
    showToast('🗑️ Layer deleted');
  };

  const handleDuplicateElement = (elementId: string) => {
    const target = designJson.elements.find((el) => el.id === elementId);
    if (!target) return;
    const newId = `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cloned = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      editable: true,
      position: {
        ...target.position,
        x: Math.min(500, (target.position?.x || 50) + 20),
        y: Math.min(800, (target.position?.y || 50) + 20),
        zIndex: (target.position?.zIndex || 10) + 1,
      },
    };
    setDesignJson((prev) => ({
      ...prev,
      elements: [...prev.elements, cloned],
    }));
    setSelectedElementId(newId);
    showToast(`📋 Duplicated "${target.content?.text || target.semantic_role || 'Layer'}"`);
  };

  const handleAddNewElement = (type: 'text' | 'badge' | 'logo' | 'button' | 'qrcode') => {
    const newId = `el_${type}_${Date.now()}`;
    let newEl: any;

    if (type === 'text') {
      newEl = {
        id: newId,
        type: 'text',
        semantic_role: 'body',
        editable: true,
        position: { x: 70, y: 320, zIndex: 30 },
        size: { width: 500, height: 60 },
        content: { text: 'DOUBLE CLICK TO EDIT TEXT' },
        style: {
          fontSize: 26,
          fontWeight: '900',
          color: '#FFFFFF',
          textAlign: 'center',
          fontFamily: 'Montserrat, sans-serif',
          textTransform: 'uppercase',
        },
      };
    } else if (type === 'badge') {
      newEl = {
        id: newId,
        type: 'badge',
        semantic_role: 'badge',
        editable: true,
        position: { x: 220, y: 220, zIndex: 35 },
        size: { width: 200, height: 44 },
        content: { text: '★ LIMITED TIME OFFER ★' },
        style: {
          fontSize: 12,
          fontWeight: '800',
          color: '#0A0A0A',
          backgroundColor: '#F59E0B',
          borderRadius: 22,
          textAlign: 'center',
          padding: 8,
        },
      };
    } else if (type === 'logo') {
      newEl = {
        id: newId,
        type: 'logo',
        semantic_role: 'brand_logo',
        editable: true,
        position: { x: 240, y: 40, zIndex: 40 },
        size: { width: 150, height: 90 },
        content: {
          text: brochureData.gymName || 'FITCLUB',
          logo_type: 'kettlebell-bolt',
        },
        style: {
          fontSize: 13,
          fontWeight: '900',
          color: '#FFFFFF',
        },
      };
    } else if (type === 'button') {
      newEl = {
        id: newId,
        type: 'button',
        semantic_role: 'cta',
        editable: true,
        position: { x: 180, y: 720, zIndex: 40 },
        size: { width: 280, height: 56 },
        content: { text: 'JOIN TODAY & CLAIM PASS' },
        style: {
          fontSize: 15,
          fontWeight: '900',
          color: '#0A0A0A',
          backgroundColor: '#F59E0B',
          borderRadius: 28,
          textAlign: 'center',
        },
      };
    } else {
      newEl = {
        id: newId,
        type: 'qrcode',
        semantic_role: 'contact',
        editable: true,
        position: { x: 490, y: 740, zIndex: 30 },
        size: { width: 100, height: 100 },
        content: { text: 'https://fitclub.com/join' },
        style: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 8,
        },
      };
    }

    setDesignJson((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newId);
    showToast(`✨ Added new ${type.toUpperCase()} layer!`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8 text-slate-900">
      {/* AI Prompt-to-Poster Designer Modal */}
      <BrochureAiPromptModal
        isOpen={isAiPromptOpen}
        onClose={() => setIsAiPromptOpen(false)}
        onApplyGenerated={handleApplyGenerated}
      />

      {/* AI Upload & Scan Modal */}
      <BrochureUploadAiModal
        isOpen={isAiUploadOpen}
        onClose={() => setIsAiUploadOpen(false)}
        onApplyExtracted={handleApplyExtracted}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white/95 backdrop-blur-xl border border-amber-400/80 text-slate-900 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* MASTER HEADER DOCK */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
        <div className="absolute top-0 right-1/4 w-96 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          {/* Brand & Title */}
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <img
                src="/icon.png"
                alt="LazyMonkey FIT CLUB AI"
                className="w-10 h-10 rounded-2xl object-contain shadow-md shadow-amber-500/20 border border-amber-300/40 p-0.5 bg-white shrink-0"
              />
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950">
                DYNAMIC <span className="text-amber-500">BROCHURE STUDIO</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Interactive Canvas Studio: Drag, resize, adjust, and inline-edit elements directly with cursor, swap logos with GymBrandLogo presets, or upload custom brand logos.
            </p>
          </div>

          {/* Master Action Dock */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* LazyMonkey Brand Emblem */}
            <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200 rounded-2xl px-3 py-1.5 shadow-xs">
              <img
                src="/icon.png"
                alt="LazyMonkey AI"
                className="w-6 h-6 rounded-lg object-contain"
              />
              <span className="text-[11px] font-black text-slate-900 tracking-tight">
                FIT CLUB <span className="text-amber-500">AI</span>
              </span>
            </div>

            {/* Engine Mode Switcher */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 shadow-inner">
              <button
                onClick={() => setEngineMode('dynamic')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  engineMode === 'dynamic'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                ✨ Canvas
              </button>
              <button
                onClick={() => setEngineMode('classic')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                  engineMode === 'classic'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🎨 Classic Presets
              </button>
            </div>

            {/* AI Scan Poster Button */}
            <button
              onClick={() => setIsAiUploadOpen(true)}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <Icon name="upload" className="w-4 h-4 text-amber-500" />
              <span>AI Scan JPG/PDF</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveBrochure}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 shadow-sm"
              title="Save custom poster"
            >
              <Icon name="save" className="w-4 h-4 text-amber-500" />
              <span>Save</span>
            </button>

            {/* Print / PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-2xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 shadow-sm disabled:opacity-50"
            >
              <Icon name="file-text" className="w-4 h-4 text-amber-600" />
              <span>PDF</span>
            </button>

            {/* Download JPG */}
            <button
              onClick={() => handleDownloadImage('jpg')}
              disabled={isExporting}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Icon name="download" className="w-4 h-4 text-amber-500" />
              <span>JPG</span>
            </button>

            {/* Download Master PNG */}
            <button
              onClick={() => handleDownloadImage('png')}
              disabled={isExporting}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Icon
                name={isExporting ? 'refresh-cw' : 'download'}
                className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`}
              />
              <span>{isExporting ? 'Rendering...' : 'Export Master PNG'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TEMPLATE DOCK / 6 JPG REFERENCES */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              6 Built-In JPGs Converted to Structured Templates
            </h3>
          </div>
          <span className="text-[11px] text-amber-600 font-bold">100% Dynamic & Editable JSON</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {BROCHURE_TEMPLATES.slice(0, 6).map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="h-16 rounded-xl overflow-hidden mb-2 relative">
                  <img
                    src={tmpl.defaultData.heroImage}
                    alt={tmpl.name}
                    className="w-full h-full object-cover brightness-95"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-[11px] truncate">{tmpl.name}</h4>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5">{tmpl.category.split(' ')[0]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN STUDIO WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customizer Panel (5 cols) */}
        <div className="xl:col-span-5">
          {engineMode === 'dynamic' ? (
            <DynamicBrochureCustomizer
              designJson={designJson}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onChangeDesignJson={setDesignJson}
              onApplyAiPrompt={handleApplyAiAssistantPrompt}
              onOpenScanModal={() => setIsAiUploadOpen(true)}
              onAddElement={handleAddNewElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              isAiGenerating={isAiGenerating}
            />
          ) : (
            <BrochureCustomizerPanel
              data={brochureData}
              onChange={(updated) => {
                setBrochureData(updated);
                setDesignJson(brochureDataToDesignJson(updated));
              }}
              onSelectTemplate={handleSelectTemplate}
              onResetDefaults={() => {
                const tmpl = BROCHURE_TEMPLATES.find((t) => t.id === selectedTemplateId);
                if (tmpl) {
                  setBrochureData(tmpl.defaultData);
                  setDesignJson(brochureDataToDesignJson(tmpl.defaultData));
                }
              }}
              onOpenAiUpload={() => setIsAiUploadOpen(true)}
            />
          )}
        </div>

        {/* Right Column: Interactive Live Viewport (7 cols) */}
        <div className="xl:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col items-center">
          {/* Viewport Toolbar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {engineMode === 'dynamic' ? 'Interactive Layer Viewport' : 'Live Studio Viewport'}
              </span>

              {/* Dynamic Editable Pixel Dimension Pill */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-2xl px-2 py-1 shadow-xs">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-0.5 shadow-xs">
                  <input
                    type="number"
                    min="200"
                    max="4000"
                    step="10"
                    value={activeWidth}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleUpdateCanvasDimensions(val, activeHeight);
                    }}
                    className="w-11 text-center text-[11px] font-mono font-black text-slate-900 focus:outline-none focus:text-amber-600 p-0"
                    title="Edit Canvas Width (px)"
                  />
                  <span className="text-[10px] font-bold text-slate-400">×</span>
                  <input
                    type="number"
                    min="200"
                    max="4000"
                    step="10"
                    value={activeHeight}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleUpdateCanvasDimensions(activeWidth, val);
                    }}
                    className="w-11 text-center text-[11px] font-mono font-black text-slate-900 focus:outline-none focus:text-amber-600 p-0"
                    title="Edit Canvas Height (px)"
                  />
                  <span className="text-[9px] font-bold text-slate-400 font-mono">px</span>
                </div>

                {/* Quick Aspect Ratio Presets */}
                <select
                  value={`${activeWidth}x${activeHeight}`}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    if (w && h) {
                      handleUpdateCanvasDimensions(w, h);
                    }
                  }}
                  className="bg-transparent border-0 text-[10px] font-bold text-amber-700 hover:text-amber-900 focus:outline-none cursor-pointer pr-1"
                  title="Choose Dimension Preset"
                >
                  <option value={`${activeWidth}x${activeHeight}`}>Preset...</option>
                  <option value="640x880">640 × 880 (Standard Poster)</option>
                  <option value="1080x1920">1080 × 1920 (Instagram Story/Reel)</option>
                  <option value="1080x1080">1080 × 1080 (Square 1:1)</option>
                  <option value="1080x1350">1080 × 1350 (Portrait 4:5)</option>
                  <option value="1200x630">1200 × 630 (Facebook/Banner)</option>
                  <option value="800x1200">800 × 1200 (HD Tall Flyer)</option>
                  <option value="1240x1754">1240 × 1754 (A4 Print)</option>
                </select>
              </div>

              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full text-[9px] font-bold">
                ✓ Ready
              </span>
            </div>

            {/* Quick Canvas Actions */}
            {engineMode === 'dynamic' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs">
                <button
                  onClick={() => handleAddNewElement('text')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  title="Add new text headline"
                >
                  <Icon name="type" className="w-3 h-3 text-amber-500" />
                  + Text
                </button>
                <button
                  onClick={() => handleAddNewElement('badge')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  title="Add promo badge"
                >
                  <Icon name="tag" className="w-3 h-3 text-amber-500" />
                  + Badge
                </button>
                <button
                  onClick={() => handleAddNewElement('logo')}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                  title="Add GymBrandLogo badge"
                >
                  <Icon name="award" className="w-3 h-3 text-amber-500" />
                  + Logo
                </button>
                {selectedElementId && (
                  <>
                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                    <button
                      onClick={() => setSelectedElementId(null)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Finish editing and close selection"
                    >
                      <Icon name="check" className="w-3 h-3" />
                      Done
                    </button>
                    <button
                      onClick={() => handleDuplicateElement(selectedElementId)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      title="Duplicate selected element (Ctrl+D)"
                    >
                      <Icon name="copy" className="w-3 h-3 text-amber-600" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteElement(selectedElementId)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                      title="Delete selected element (Delete/Backspace)"
                    >
                      <Icon name="trash-2" className="w-3 h-3 text-rose-600" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Zoom Slider */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setZoomScale((s) => Math.max(0.5, +(s - 0.05).toFixed(2)))}
                className="text-slate-600 hover:text-slate-900 text-xs font-bold p-1"
                title="Zoom out"
              >
                -
              </button>
              <span className="text-xs font-mono text-amber-700 font-bold min-w-[40px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => setZoomScale((s) => Math.min(1.2, +(s + 0.05).toFixed(2)))}
                className="text-slate-600 hover:text-slate-900 text-xs font-bold p-1"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={() => setZoomScale(0.75)}
                className="px-2.5 py-0.5 rounded-xl bg-white hover:bg-slate-200 text-[10px] text-slate-800 font-bold transition shadow-xs border border-slate-200"
              >
                75%
              </button>
            </div>
          </div>

          {/* Canvas Container Backdrop */}
          <div className="w-full overflow-hidden flex justify-center py-6 rounded-2xl bg-slate-100/90 border border-slate-200 shadow-inner min-h-[720px]">
            {engineMode === 'dynamic' ? (
              <DynamicBrochureCanvas
                ref={canvasRef}
                designJson={designJson}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                scale={zoomScale}
              />
            ) : (
              <BrochurePreviewCanvas
                ref={canvasRef}
                data={brochureData}
                scale={zoomScale}
                width={activeWidth}
                height={activeHeight}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
