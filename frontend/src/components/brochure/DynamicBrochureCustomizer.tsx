import React, { useState } from 'react';
import type { BrochureDesignJson, BrochureElement } from '@/types/brochure';
import { Icon } from '@/components/ui/Icon';
import { GymBrandLogo } from './GymBrandLogo';

const LOGO_PRESETS = [
  { id: 'kettlebell-bolt', label: 'Power Kettlebell & Bolt', desc: 'PowerZone Style' },
  { id: 'bicep-barbell', label: 'Iron Bicep & Barbell', desc: 'Fit with Sahil' },
  { id: 'spartan-crest', label: 'Spartan Wings & Helmet', desc: 'Discipline Poster' },
  { id: 'crown-elite', label: 'Royal Crown Elite', desc: 'Luxury Wellness' },
  { id: 'flame-bull', label: 'Fierce Flame Bull', desc: 'Strength & Power' },
  { id: 'shield-gym', label: 'Shield & Iron Star', desc: 'Performance Club' },
];

interface DynamicBrochureCustomizerProps {
  designJson: BrochureDesignJson;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onChangeDesignJson: (updated: BrochureDesignJson) => void;
  onApplyAiPrompt: (prompt: string) => Promise<void>;
  onOpenScanModal: () => void;
  onAddElement?: (type: 'text' | 'badge' | 'logo' | 'button' | 'qrcode') => void;
  onDeleteElement?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  isAiGenerating?: boolean;
}

type TabKey = 'elements' | 'inspector' | 'palette' | 'ai-assistant' | 'document';

export function DynamicBrochureCustomizer({
  designJson,
  selectedElementId,
  onSelectElement,
  onChangeDesignJson,
  onApplyAiPrompt,
  onOpenScanModal,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  isAiGenerating = false,
}: DynamicBrochureCustomizerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('elements');
  const [searchTerm, setSearchTerm] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const selectedElement = designJson.elements.find((el) => el.id === selectedElementId);

  // Update a single element in design_json
  const handleUpdateElement = (
    elementId: string,
    updates: Partial<Omit<BrochureElement, 'position' | 'size' | 'content' | 'style'>> & {
      position?: Partial<BrochureElement['position']>;
      size?: Partial<BrochureElement['size']>;
      content?: Partial<BrochureElement['content']>;
      style?: Partial<BrochureElement['style']>;
    }
  ) => {
    const newElements = designJson.elements.map((el) => {
      if (el.id === elementId) {
        return {
          ...el,
          ...updates,
          content: { ...el.content, ...(updates.content || {}) },
          style: { ...el.style, ...(updates.style || {}) },
          position: { ...el.position, ...(updates.position || {}) },
          size: { ...el.size, ...(updates.size || {}) },
        };
      }
      return el;
    });

    onChangeDesignJson({
      ...designJson,
      elements: newElements,
    });
  };

  // Update document settings
  const handleUpdateDocument = (updates: Partial<BrochureDesignJson['document']>) => {
    onChangeDesignJson({
      ...designJson,
      document: {
        ...designJson.document,
        ...updates,
      },
    });
  };

  // Quick prompt presets for AI assistant
  const AI_PRESETS = [
    { label: '✨ Make it Gold & Ultra-Premium', prompt: 'Make this brochure ultra-premium with gold luxury accents and dark obsidian backdrop' },
    { label: '⚡ Neon Cyberpunk Vibe', prompt: 'Convert to vibrant cyberpunk neon cyan and purple glowing aesthetics' },
    { label: '🔥 Flat 70% Off Mega Sale', prompt: 'Make the discount 70% OFF mega sale and highlight urgent CTA' },
    { label: '🏆 Aggressive Warrior Crimson', prompt: 'Transform with aggressive bold red and dark spartan energy' },
    { label: '🌟 Festive Celebration Edition', prompt: 'Create a festive gold celebration edition with celebratory typography' },
  ];

  // Filtered elements list
  const filteredElements = designJson.elements.filter((el) => {
    if (filterType !== 'all' && el.type !== filterType && el.semantic_role !== filterType) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const roleMatch = el.semantic_role.toLowerCase().includes(term);
    const typeMatch = el.type.toLowerCase().includes(term);
    const textMatch = el.content?.text?.toLowerCase().includes(term) || el.content?.title?.toLowerCase().includes(term);
    return roleMatch || typeMatch || textMatch;
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-5 text-slate-800">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        {[
          { key: 'elements' as TabKey, label: 'Layers & Elements', icon: 'layers' },
          { key: 'inspector' as TabKey, label: selectedElement ? `Edit (${selectedElement.semantic_role})` : 'Inspector', icon: 'edit-3' },
          { key: 'palette' as TabKey, label: 'Theme & Colors', icon: 'palette' },
          { key: 'ai-assistant' as TabKey, label: 'AI Assistant', icon: 'sparkles' },
          { key: 'document' as TabKey, label: 'Canvas Doc', icon: 'settings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Icon name={tab.icon as any} className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: DYNAMIC ELEMENTS LIST */}
      {activeTab === 'elements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Detected Elements ({designJson.elements.length})
              </h3>
              <p className="text-[10px] text-slate-500">
                Click any layer to inspect, select, or modify properties
              </p>
            </div>
            <button
              onClick={onOpenScanModal}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5"
            >
              <Icon name="upload" className="w-3 h-3 text-amber-600" />
              <span>Scan New JPG</span>
            </button>
          </div>

          {/* Quick Insert Elements Bar */}
          {onAddElement && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[9px] font-bold uppercase text-slate-400 shrink-0">Add Layer:</span>
              <button
                onClick={() => onAddElement('text')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                title="Add custom text layer"
              >
                <Icon name="plus" className="w-3 h-3 text-amber-600" />
                <span>Text</span>
              </button>
              <button
                onClick={() => onAddElement('badge')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                title="Add special offer badge pill"
              >
                <Icon name="award" className="w-3 h-3 text-amber-600" />
                <span>Badge</span>
              </button>
              <button
                onClick={() => onAddElement('logo')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                title="Add Gym Brand Logo layer"
              >
                <Icon name="shield" className="w-3 h-3 text-amber-600" />
                <span>Logo</span>
              </button>
              <button
                onClick={() => onAddElement('button')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                title="Add CTA button"
              >
                <Icon name="mouse-pointer" className="w-3 h-3 text-amber-600" />
                <span>Button</span>
              </button>
              <button
                onClick={() => onAddElement('qrcode')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded-xl text-[10px] font-bold transition flex items-center gap-1 shrink-0"
                title="Add scan QR code"
              >
                <Icon name="qr-code" className="w-3 h-3 text-amber-600" />
                <span>QR Code</span>
              </button>
            </div>
          )}

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {['all', 'headline', 'offer', 'image', 'logo', 'button', 'contact'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                  filterType === t
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Elements List */}
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredElements.map((el) => {
              const isSelected = selectedElementId === el.id;
              const displayText =
                el.content?.text ||
                el.content?.title ||
                el.content?.label ||
                el.content?.phone ||
                el.content?.src ||
                el.type;

              return (
                <div
                  key={el.id}
                  onClick={() => {
                    onSelectElement(el.id);
                    setActiveTab('inspector');
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-500 shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-white text-[9px] font-mono font-bold uppercase text-amber-700 border border-slate-200 shrink-0">
                      {el.semantic_role}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                        {displayText}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        type: {el.type} • pos: ({el.position.x}, {el.position.y})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Duplicate button */}
                    {onDuplicateElement && el.semantic_role !== 'background' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateElement(el.id);
                        }}
                        className="p-1.5 rounded-lg bg-white hover:bg-cyan-100 hover:text-cyan-800 text-slate-500 border border-slate-200 transition shadow-xs"
                        title="Duplicate layer"
                      >
                        <Icon name="copy" className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete button */}
                    {onDeleteElement && el.semantic_role !== 'background' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteElement(el.id);
                        }}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 transition shadow-xs"
                        title="Delete layer"
                      >
                        <Icon name="trash-2" className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Inspect button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectElement(el.id);
                        setActiveTab('inspector');
                      }}
                      className="p-1.5 rounded-lg bg-white hover:bg-amber-500 hover:text-slate-950 text-slate-600 border border-slate-200 transition shadow-xs"
                      title="Inspect element"
                    >
                      <Icon name="edit-2" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ELEMENT INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="space-y-4">
          {selectedElement ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Editing: <span className="text-amber-600">{selectedElement.semantic_role}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">Layer ID: {selectedElement.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSelectElement(null);
                      setActiveTab('elements');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                    title="Done editing layer"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </button>
                  {onDeleteElement && selectedElement.semantic_role !== 'background' && (
                    <button
                      onClick={() => onDeleteElement(selectedElement.id)}
                      className="text-[10px] text-red-500 hover:text-red-700 font-bold px-1"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => onSelectElement(null)}
                    className="text-[10px] text-slate-500 hover:text-slate-900 font-semibold"
                  >
                    Deselect
                  </button>
                </div>
              </div>

              {/* Text content editing */}
              {(selectedElement.type === 'text' ||
                selectedElement.type === 'textbox' ||
                selectedElement.type === 'button' ||
                selectedElement.type === 'badge') && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Text Content
                    </label>
                    <textarea
                      rows={2}
                      value={selectedElement.content?.text || ''}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          content: { text: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>

                  {selectedElement.type === 'badge' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Badge Title
                        </label>
                        <input
                          type="text"
                          value={selectedElement.content?.title || ''}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              content: { title: e.target.value },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">
                          Badge Subtitle
                        </label>
                        <input
                          type="text"
                          value={selectedElement.content?.subtitle || ''}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              content: { subtitle: e.target.value },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Typography styling */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Font Size
                      </label>
                      <input
                        type="text"
                        value={selectedElement.style?.fontSize || '14px'}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            style: { fontSize: e.target.value },
                          })
                        }
                        placeholder="e.g. 24px"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.style?.color || '#FFFFFF'}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              style: { color: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedElement.style?.color || '#FFFFFF'}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              style: { color: e.target.value },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gym Brand Logo Inspector */}
              {selectedElement.type === 'logo' && (
                <div className="space-y-4">
                  {/* Upload Logo Dropzone */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Icon name="upload" className="w-3.5 h-3.5 text-amber-500" />
                        Upload Custom Gym Logo
                      </label>
                      {selectedElement.content?.src && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          Custom Image Active
                        </span>
                      )}
                    </div>

                    {/* Drag & Drop / Click Upload Box */}
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white rounded-xl cursor-pointer transition group shadow-xs">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                handleUpdateElement(selectedElement.id, {
                                  content: {
                                    ...selectedElement.content,
                                    src: ev.target.result as string,
                                    logoUrl: ev.target.result as string,
                                  },
                                });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5 transition">
                          <Icon name="upload-cloud" className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition">
                          Click to browse or drag & drop logo
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Supports PNG (transparent), SVG vector, JPG, WebP
                        </p>
                      </div>
                    </label>

                    {/* Logo Image URL field */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Or Paste Logo Image URL:
                      </label>
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        value={selectedElement.content?.src || selectedElement.content?.logoUrl || ''}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            content: {
                              ...selectedElement.content,
                              src: e.target.value || undefined,
                              logoUrl: e.target.value || undefined,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>

                    {/* Active Upload Preview & Clear */}
                    {(selectedElement.content?.src || selectedElement.content?.logoUrl) && (
                      <div className="flex items-center justify-between p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={selectedElement.content?.src || selectedElement.content?.logoUrl}
                            alt="Preview"
                            className="w-9 h-9 object-contain rounded-lg bg-slate-950 p-1 border border-amber-400/40"
                          />
                          <div>
                            <p className="text-[11px] font-bold text-slate-900">Custom Brand Logo</p>
                            <p className="text-[9px] text-emerald-700 font-medium">Rendered on Canvas</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateElement(selectedElement.id, {
                              content: {
                                ...selectedElement.content,
                                src: undefined,
                                logoUrl: undefined,
                              },
                            })
                          }
                          className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                        >
                          Remove & Use Vector
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Brand Name / Text Alongside Logo */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                      Brand Name / Gym Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. POWERZONE FITNESS"
                      value={selectedElement.content?.text || selectedElement.content?.brandName || ''}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          content: {
                            ...selectedElement.content,
                            text: e.target.value,
                            brandName: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedElement.content?.showText)}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            content: {
                              ...selectedElement.content,
                              showText: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>Show brand name next to emblem badge</span>
                    </label>
                  </div>

                  {/* Badge Shape & Background Style */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Badge Shape
                      </label>
                      <select
                        value={selectedElement.content?.shape || 'squircle'}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            content: {
                              ...selectedElement.content,
                              shape: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:border-amber-500"
                      >
                        <option value="squircle">Squircle (Smooth)</option>
                        <option value="circle">Circle</option>
                        <option value="rect">Rounded Box</option>
                        <option value="none">None (Transparent)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Background Glow
                      </label>
                      <select
                        value={selectedElement.content?.bgStyle || 'glass-dark'}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            content: {
                              ...selectedElement.content,
                              bgStyle: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:border-amber-500"
                      >
                        <option value="glass-dark">Dark Glass Badge</option>
                        <option value="glow-gold">Gold Luxury Glow</option>
                        <option value="solid-dark">Solid Black</option>
                        <option value="solid-white">Solid White</option>
                        <option value="transparent">Transparent</option>
                      </select>
                    </div>
                  </div>

                  {/* Vector Emblem Presets */}
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 block mb-2">
                      Or Choose a Vector Emblem Preset:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {LOGO_PRESETS.map((preset) => {
                        const isSelected =
                          !selectedElement.content?.src &&
                          !selectedElement.content?.logoUrl &&
                          (selectedElement.content?.preset === preset.id ||
                            selectedElement.content?.logo_type === preset.id ||
                            (!selectedElement.content?.preset && !selectedElement.content?.logo_type && preset.id === 'kettlebell-bolt'));
                        return (
                          <div
                            key={preset.id}
                            onClick={() =>
                              handleUpdateElement(selectedElement.id, {
                                content: {
                                  ...selectedElement.content,
                                  preset: preset.id,
                                  logo_type: preset.id,
                                  src: undefined,
                                  logoUrl: undefined,
                                },
                              })
                            }
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                              isSelected
                                ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/40 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <GymBrandLogo
                              logoPreset={preset.id}
                              primaryColor={designJson.document.primaryColor || '#EAB308'}
                              accentColor={designJson.document.accentColor || '#F59E0B'}
                              sizePx={36}
                            />
                            <div className="leading-tight truncate">
                              <p className="font-bold text-[10px] text-slate-900 truncate">{preset.label}</p>
                              <p className="text-[8.5px] text-slate-500 truncate">{preset.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Image element editing */}
              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={selectedElement.content?.src || ''}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          content: { src: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Upload Replacement Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              handleUpdateElement(selectedElement.id, {
                                content: { src: ev.target.result as string },
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Opacity ({Math.round((selectedElement.style?.opacity ?? 1) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={selectedElement.style?.opacity ?? 1}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          style: { opacity: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* QR Code inspector */}
              {selectedElement.type === 'qrcode' && (
                <div className="space-y-3.5">
                  {/* QR Image Upload Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Icon name="upload" className="w-3.5 h-3.5 text-amber-500" />
                      <span>Upload Custom QR Image</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Upload any UPI / Payment / WhatsApp / Google Review / Custom QR image (PNG, JPG, SVG).
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              handleUpdateElement(selectedElement.id, {
                                content: {
                                  ...selectedElement.content,
                                  src: ev.target.result as string,
                                  customQrUrl: ev.target.result as string,
                                },
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />

                    {(selectedElement.content?.src || selectedElement.content?.customQrUrl) && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <img
                            src={selectedElement.content?.src || selectedElement.content?.customQrUrl}
                            alt="Custom QR Preview"
                            className="w-8 h-8 object-contain rounded-lg border border-slate-200 bg-white"
                          />
                          <span className="text-[10px] font-bold text-emerald-700">Custom QR Active</span>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateElement(selectedElement.id, {
                              content: {
                                ...selectedElement.content,
                                src: undefined,
                                customQrUrl: undefined,
                                qrUrl: undefined,
                              },
                            })
                          }
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                        >
                          Use Auto-Generated QR
                        </button>
                      </div>
                    )}
                  </div>

                  {/* QR Destination URL (for auto-generated QR) */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Destination Link / URL (Auto-Generated QR)
                    </label>
                    <input
                      type="text"
                      placeholder="https://fitclub.ai/join or https://wa.me/..."
                      value={selectedElement.content?.url || ''}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          content: { ...selectedElement.content, url: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* QR Label Text */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      QR Subtitle Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SCAN TO JOIN / PAY VIA UPI"
                      value={selectedElement.content?.label || ''}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          content: { ...selectedElement.content, label: e.target.value },
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                    />
                  </div>

                  {/* Quick Preset Labels */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['SCAN TO JOIN', 'PAY VIA UPI', 'WHATSAPP US', 'INSTAGRAM', '50% OFF PASS'].map((presetLabel) => (
                      <button
                        key={presetLabel}
                        onClick={() =>
                          handleUpdateElement(selectedElement.id, {
                            content: { ...selectedElement.content, label: presetLabel },
                          })
                        }
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 text-[9px] font-bold transition border border-slate-200"
                      >
                        {presetLabel}
                      </button>
                    ))}
                  </div>

                  {/* QR Card Background & Text Color */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Card Background
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.style?.backgroundColor || '#FFFFFF'}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              style: { ...selectedElement.style, backgroundColor: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-600">{selectedElement.style?.backgroundColor || '#FFFFFF'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Label Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.style?.color || '#000000'}
                          onChange={(e) =>
                            handleUpdateElement(selectedElement.id, {
                              style: { ...selectedElement.style, color: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-600">{selectedElement.style?.color || '#000000'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Position coordinates */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Position X (px)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.x}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        position: { x: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Position Y (px)
                  </label>
                  <input
                    type="number"
                    value={selectedElement.position.y}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        position: { y: parseInt(e.target.value) || 0 },
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bottom Done Editing Bar */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">Edits saved in real-time</p>
                <button
                  onClick={() => {
                    onSelectElement(null);
                    setActiveTab('elements');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Icon name="check" className="w-4 h-4" />
                  <span>Done Editing</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Icon name="cursor" className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p className="text-xs font-bold text-slate-600">No layer selected</p>
              <p className="text-[10px] text-slate-400">Click any layer on the canvas to inspect, drag & edit.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PALETTE & THEME */}
      {activeTab === 'palette' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-900">Global Color Harmony</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={designJson.document.primaryColor || '#EAB308'}
                  onChange={(e) => handleUpdateDocument({ primaryColor: e.target.value })}
                  className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={designJson.document.primaryColor || '#EAB308'}
                  onChange={(e) => handleUpdateDocument({ primaryColor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Accent Glow Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={designJson.document.accentColor || '#F59E0B'}
                  onChange={(e) => handleUpdateDocument({ accentColor: e.target.value })}
                  className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={designJson.document.accentColor || '#F59E0B'}
                  onChange={(e) => handleUpdateDocument({ accentColor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              Canvas Background
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={designJson.document.backgroundColor || '#0A0A0A'}
                onChange={(e) => handleUpdateDocument({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-lg bg-transparent border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={designJson.document.backgroundColor || '#0A0A0A'}
                onChange={(e) => handleUpdateDocument({ backgroundColor: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AI DESIGN ASSISTANT */}
      {activeTab === 'ai-assistant' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Icon name="sparkles" className="w-4 h-4 text-amber-500" />
              <span>AI Design Assistant</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Type custom design requests or choose instant presets. AI will modify layers while preserving layout.
            </p>
          </div>

          {/* Prompt Presets */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Quick AI Enhancements
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {AI_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => onApplyAiPrompt(preset.prompt)}
                  disabled={isAiGenerating}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400 text-left text-xs font-bold text-slate-800 transition flex items-center justify-between group disabled:opacity-50"
                >
                  <span>{preset.label}</span>
                  <Icon name="arrow-right" className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt Box */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-[10px] font-bold text-slate-600 block">
              Custom AI Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 'Make the headline punchier and add gold luxury borders'"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPrompt.trim()) {
                    onApplyAiPrompt(customPrompt);
                    setCustomPrompt('');
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              <button
                onClick={() => {
                  if (customPrompt.trim()) {
                    onApplyAiPrompt(customPrompt);
                    setCustomPrompt('');
                  }
                }}
                disabled={isAiGenerating || !customPrompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition shadow-sm disabled:opacity-50"
              >
                {isAiGenerating ? '...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOCUMENT SETTINGS */}
      {activeTab === 'document' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-900">Canvas Document Bounds</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Width (px)
              </label>
              <input
                type="number"
                value={designJson.document.width}
                onChange={(e) =>
                  handleUpdateDocument({ width: parseInt(e.target.value) || 640 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Height (px)
              </label>
              <input
                type="number"
                value={designJson.document.height}
                onChange={(e) =>
                  handleUpdateDocument({ height: parseInt(e.target.value) || 880 })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
