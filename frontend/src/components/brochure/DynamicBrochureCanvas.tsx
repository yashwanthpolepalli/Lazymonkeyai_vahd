import React, { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import type { BrochureDesignJson, BrochureElement } from '@/types/brochure';
import { GymBrandLogo } from './GymBrandLogo';
import { Icon } from '@/components/ui/Icon';

type ResizeHandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface DynamicBrochureCanvasProps {
  designJson: BrochureDesignJson;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string | null) => void;
  onUpdateElement?: (
    elementId: string,
    updates: Partial<Omit<BrochureElement, 'position' | 'size' | 'content' | 'style'>> & {
      position?: Partial<BrochureElement['position']>;
      size?: Partial<BrochureElement['size']>;
      content?: Partial<BrochureElement['content']>;
      style?: Partial<BrochureElement['style']>;
    }
  ) => void;
  onDeleteElement?: (elementId: string) => void;
  onDuplicateElement?: (elementId: string) => void;
  onOpenLogoLibrary?: (elementId?: string) => void;
  scale?: number;
}

export const DynamicBrochureCanvas = forwardRef<HTMLDivElement, DynamicBrochureCanvasProps>(
  (
    {
      designJson,
      selectedElementId,
      onSelectElement,
      onUpdateElement,
      onDeleteElement,
      onDuplicateElement,
      onOpenLogoLibrary,
      scale = 0.75,
    },
    ref
  ) => {
    const { document: doc, elements } = designJson;
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

    // Inline text edit state (Double Click)
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState<string>('');
    const inlineInputRef = useRef<HTMLTextAreaElement>(null);

    // Drag state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragStartRef = useRef<{
      mouseX: number;
      mouseY: number;
      startX: number;
      startY: number;
    } | null>(null);

    // Resize state
    const [resizingHandle, setResizingHandle] = useState<ResizeHandleType | null>(null);
    const resizeStartRef = useRef<{
      mouseX: number;
      mouseY: number;
      startX: number;
      startY: number;
      startW: number;
      startH: number;
      startFontSize?: number;
    } | null>(null);

    // Canvas direct logo file input
    const canvasLogoInputRef = useRef<HTMLInputElement>(null);
    const canvasQrInputRef = useRef<HTMLInputElement>(null);

    const handleCanvasLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, elId: string) => {
      const file = e.target.files?.[0];
      if (file && onUpdateElement) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onUpdateElement(elId, {
              content: {
                src: ev.target.result as string,
                logoUrl: ev.target.result as string,
              },
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleCanvasQrUpload = (e: React.ChangeEvent<HTMLInputElement>, elId: string) => {
      const file = e.target.files?.[0];
      if (file && onUpdateElement) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onUpdateElement(elId, {
              content: {
                src: ev.target.result as string,
                customQrUrl: ev.target.result as string,
              },
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleCycleLogoPreset = (el: BrochureElement) => {
      const presets = ['kettlebell-bolt', 'bicep-barbell', 'spartan-crest', 'crown-elite', 'flame-bull', 'shield-gym'];
      const current = el.content?.preset || el.content?.logo_type || 'kettlebell-bolt';
      const idx = presets.indexOf(current);
      const nextPreset = presets[(idx + 1) % presets.length];
      if (onUpdateElement) {
        onUpdateElement(el.id, {
          content: {
            ...el.content,
            preset: nextPreset,
            logo_type: nextPreset,
            src: undefined,
            logoUrl: undefined,
          },
        });
      }
    };

    const docWidth = doc?.width || 640;
    const docHeight = doc?.height || 880;

    // Sort elements by zIndex / layer
    const sortedElements = [...elements].sort((a, b) => {
      const zA = a.position?.zIndex ?? 0;
      const zB = b.position?.zIndex ?? 0;
      return zA - zB;
    });

    const selectedElement = elements.find((el) => el.id === selectedElementId);

    // Auto-focus inline text editing input
    useEffect(() => {
      if (editingTextId && inlineInputRef.current) {
        inlineInputRef.current.focus();
        inlineInputRef.current.select();
      }
    }, [editingTextId]);

    // Global MouseMove & MouseUp listeners for Drag & Resize
    useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        // Handle element Drag
        if (draggingId && dragStartRef.current && onUpdateElement) {
          const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
          const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;
          const newX = Math.round(dragStartRef.current.startX + deltaX);
          const newY = Math.round(dragStartRef.current.startY + deltaY);

          onUpdateElement(draggingId, {
            position: {
              x: Math.max(-100, Math.min(docWidth + 100, newX)),
              y: Math.max(-100, Math.min(docHeight + 100, newY)),
            },
          });
        }

        // Handle element Resize
        if (resizingHandle && resizeStartRef.current && selectedElementId && onUpdateElement) {
          const deltaX = (e.clientX - resizeStartRef.current.mouseX) / scale;
          const deltaY = (e.clientY - resizeStartRef.current.mouseY) / scale;

          let newX = resizeStartRef.current.startX;
          let newY = resizeStartRef.current.startY;
          let newW = resizeStartRef.current.startW;
          let newH = resizeStartRef.current.startH;

          if (resizingHandle.includes('e')) {
            newW = Math.max(30, Math.round(resizeStartRef.current.startW + deltaX));
          }
          if (resizingHandle.includes('s')) {
            newH = Math.max(20, Math.round(resizeStartRef.current.startH + deltaY));
          }
          if (resizingHandle.includes('w')) {
            const rawW = resizeStartRef.current.startW - deltaX;
            if (rawW >= 30) {
              newW = Math.round(rawW);
              newX = Math.round(resizeStartRef.current.startX + deltaX);
            }
          }
          if (resizingHandle.includes('n')) {
            const rawH = resizeStartRef.current.startH - deltaY;
            if (rawH >= 20) {
              newH = Math.round(rawH);
              newY = Math.round(resizeStartRef.current.startY + deltaY);
            }
          }

          // Optional font scale calculation if resizing corner of text element
          let updatedStyle = undefined;
          if (
            resizeStartRef.current.startFontSize &&
            (resizingHandle === 'se' || resizingHandle === 'ne' || resizingHandle === 'sw' || resizingHandle === 'nw')
          ) {
            const ratio = newW / resizeStartRef.current.startW;
            const newFontSize = Math.max(8, Math.min(96, Math.round(resizeStartRef.current.startFontSize * ratio)));
            updatedStyle = { fontSize: `${newFontSize}px` };
          }

          onUpdateElement(selectedElementId, {
            position: { x: newX, y: newY },
            size: { width: newW, height: newH },
            style: updatedStyle,
          });
        }
      };

      const handleGlobalMouseUp = () => {
        setDraggingId(null);
        setResizingHandle(null);
        dragStartRef.current = null;
        resizeStartRef.current = null;
      };

      if (draggingId || resizingHandle) {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
      }

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }, [draggingId, resizingHandle, selectedElementId, onUpdateElement, scale, docWidth, docHeight]);

    // Keyboard controls (Delete, Escape, Arrow key nudging)
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (editingTextId) return; // Don't intercept when user is typing in text input

        if (selectedElementId) {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDeleteElement?.(selectedElementId);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onSelectElement?.(null);
          } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onDuplicateElement?.(selectedElementId);
          } else if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
            selectedElement &&
            onUpdateElement
          ) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const curX = selectedElement.position.x;
            const curY = selectedElement.position.y;
            let nextX = curX;
            let nextY = curY;

            if (e.key === 'ArrowLeft') nextX -= step;
            if (e.key === 'ArrowRight') nextX += step;
            if (e.key === 'ArrowUp') nextY -= step;
            if (e.key === 'ArrowDown') nextY += step;

            onUpdateElement(selectedElementId, { position: { x: nextX, y: nextY } });
          }
        }
      },
      [selectedElementId, selectedElement, editingTextId, onDeleteElement, onSelectElement, onDuplicateElement, onUpdateElement]
    );

    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Handle Start Dragging Element
    const handleElementMouseDown = (e: React.MouseEvent, el: BrochureElement) => {
      if (el.semantic_role === 'background' || el.editable === false) return;
      if (editingTextId === el.id) return;

      e.stopPropagation();
      onSelectElement?.(el.id);

      setDraggingId(el.id);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: el.position.x,
        startY: el.position.y,
      };
    };

    // Handle Start Resizing Element
    const handleResizeHandleMouseDown = (
      e: React.MouseEvent,
      handle: ResizeHandleType,
      el: BrochureElement
    ) => {
      e.stopPropagation();
      e.preventDefault();

      const elW = typeof el.size?.width === 'number' ? el.size.width : (e.currentTarget.parentElement?.offsetWidth || 150);
      const elH = typeof el.size?.height === 'number' ? el.size.height : (e.currentTarget.parentElement?.offsetHeight || 60);
      const parsedFontSize = el.style?.fontSize ? parseInt(el.style.fontSize) : 14;

      setResizingHandle(handle);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: el.position.x,
        startY: el.position.y,
        startW: elW,
        startH: elH,
        startFontSize: isNaN(parsedFontSize) ? 14 : parsedFontSize,
      };
    };

    // Handle Double Click to trigger inline text edit
    const handleDoubleClick = (e: React.MouseEvent, el: BrochureElement) => {
      e.stopPropagation();
      if (['text', 'textbox', 'badge', 'button'].includes(el.type)) {
        setEditingTextId(el.id);
        setEditingTextValue(el.content?.text || el.content?.title || '');
      }
    };

    // Commit Inline Text Edit
    const handleCommitInlineEdit = (elementId: string) => {
      if (onUpdateElement) {
        onUpdateElement(elementId, {
          content: { text: editingTextValue },
        });
      }
      setEditingTextId(null);
    };

    // Layer zIndex adjustment
    const handleLayerOrder = (elementId: string, direction: 'forward' | 'backward') => {
      if (!onUpdateElement) return;
      const el = elements.find((item) => item.id === elementId);
      if (!el) return;
      const currentZ = el.position.zIndex || 5;
      const nextZ = direction === 'forward' ? currentZ + 2 : Math.max(1, currentZ - 2);
      onUpdateElement(elementId, { position: { zIndex: nextZ } });
    };

    // Render individual element content
    const renderElementContent = (el: BrochureElement) => {
      const { type, content, style } = el;
      const isEditingText = editingTextId === el.id;

      if (isEditingText) {
        return (
          <div className="relative w-full h-full">
            <textarea
              ref={inlineInputRef}
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={() => handleCommitInlineEdit(el.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCommitInlineEdit(el.id);
                }
                if (e.key === 'Escape') {
                  setEditingTextId(null);
                }
              }}
              style={{
                fontSize: style?.fontSize || '14px',
                fontFamily: style?.fontFamily,
                fontWeight: style?.fontWeight || 'bold',
                color: style?.color || '#FFFFFF',
                textAlign: style?.textAlign || 'left',
                lineHeight: style?.lineHeight || '1.1',
                backgroundColor: 'rgba(0,0,0,0.92)',
                border: '2px solid #EAB308',
                borderRadius: '8px',
                padding: '6px',
                width: '100%',
                height: '100%',
                resize: 'none',
                outline: 'none',
              }}
              className="shadow-2xl z-40"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCommitInlineEdit(el.id);
              }}
              className="absolute -top-7 right-0 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-lg shadow-lg flex items-center gap-1 z-50 transition cursor-pointer"
              title="Finish editing text"
            >
              <Icon name="check" className="w-3 h-3" />
              <span>Done</span>
            </button>
          </div>
        );
      }

      switch (type) {
        case 'image':
          return (
            <img
              src={content?.src || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80'}
              alt={content?.alt || 'Brochure Asset'}
              className="w-full h-full pointer-events-none select-none"
              style={{
                objectFit: style?.objectFit || 'cover',
                borderRadius: style?.borderRadius,
                filter: style?.filter,
                opacity: style?.opacity,
              }}
              crossOrigin="anonymous"
            />
          );

        case 'logo':
          return (
            <div className="w-full h-full flex items-center justify-center p-1 pointer-events-none select-none">
              <GymBrandLogo
                logoUrl={content?.src || content?.logoUrl}
                logoPreset={content?.preset || content?.logo_type || 'kettlebell-bolt'}
                primaryColor={style?.primaryColor || doc.primaryColor || '#EAB308'}
                accentColor={style?.accentColor || doc.accentColor || '#F59E0B'}
                sizePx={
                  typeof el.size?.width === 'number'
                    ? Math.min(el.size.width - 4, (typeof el.size.height === 'number' ? el.size.height - 4 : 80))
                    : 64
                }
                bgStyle={content?.bgStyle || 'glass-dark'}
                shape={content?.shape || 'squircle'}
                brandText={content?.text || content?.brandName}
                showText={Boolean(content?.showText && (content?.text || content?.brandName))}
                textColor={style?.color || '#FFFFFF'}
              />
            </div>
          );

        case 'badge':
          return (
            <div
              className="w-full h-full flex flex-col justify-center items-center text-center shadow-md select-none pointer-events-none"
              style={{
                backgroundColor: style?.backgroundColor || doc.primaryColor || '#EAB308',
                color: style?.color || '#000000',
                borderRadius: style?.borderRadius || '9999px',
                padding: style?.padding || '6px 12px',
                border: style?.border,
                boxShadow: style?.boxShadow,
              }}
            >
              {content?.tag && (
                <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">
                  {content.tag}
                </span>
              )}
              {content?.title && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {content.title}
                </span>
              )}
              {content?.text && (
                <span className="text-sm font-black uppercase tracking-wide">
                  {content.text}
                </span>
              )}
              {content?.subtitle && (
                <span className="text-[9px] font-semibold opacity-90 mt-0.5">
                  {content.subtitle}
                </span>
              )}
            </div>
          );

        case 'button':
          return (
            <div
              className="w-full h-full flex items-center justify-center font-black uppercase cursor-pointer select-none transition-transform pointer-events-none"
              style={{
                background: style?.background || doc.primaryColor || '#EAB308',
                color: style?.color || '#000000',
                borderRadius: style?.borderRadius || '12px',
                fontSize: style?.fontSize || '13px',
                letterSpacing: style?.letterSpacing || '0.08em',
                boxShadow: style?.boxShadow || '0 8px 24px rgba(234, 179, 8, 0.35)',
                padding: style?.padding || '10px 16px',
              }}
            >
              {content?.text || 'CLAIM OFFER NOW'}
            </div>
          );

        case 'checklist':
          return (
            <div
              className="w-full h-full flex flex-col justify-between py-1 px-2 select-none pointer-events-none"
              style={{
                fontSize: style?.fontSize || '10px',
                color: style?.color || '#E2E8F0',
                lineHeight: style?.lineHeight || '1.4',
              }}
            >
              {Array.isArray(content?.items) &&
                content.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold text-xs leading-none">✓</span>
                    <div>
                      <p className="font-extrabold text-[9.5px] uppercase tracking-wide text-white">
                        {item.title || item}
                      </p>
                      {item.subtitle && (
                        <p className="text-[8.5px] text-slate-400 font-medium">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          );

        case 'group':
          if (el.semantic_role === 'contact') {
            return (
              <div
                className="w-full h-full flex flex-col justify-center space-y-1 text-left select-none pointer-events-none"
                style={{
                  fontSize: style?.fontSize || '9.5px',
                  color: style?.color || '#CBD5E1',
                }}
              >
                {content?.phone && (
                  <p className="font-bold text-white flex items-center gap-1.5 truncate">
                    <span>📞</span> {content.phone}
                  </p>
                )}
                {content?.email && (
                  <p className="text-slate-300 flex items-center gap-1.5 truncate">
                    <span>📧</span> {content.email}
                  </p>
                )}
                {content?.address && (
                  <p className="text-slate-400 text-[8.5px] flex items-center gap-1.5 truncate">
                    <span>📍</span> {content.address}
                  </p>
                )}
                {content?.website && (
                  <p className="text-amber-400/90 text-[8.5px] font-mono flex items-center gap-1.5 truncate">
                    <span>🌐</span> {content.website}
                  </p>
                )}
              </div>
            );
          }
          if (el.semantic_role === 'bullet') {
            return (
              <div
                className="w-full h-full flex items-center justify-around px-2 select-none pointer-events-none"
                style={{
                  backgroundColor: style?.backgroundColor,
                  borderRadius: style?.borderRadius,
                  border: style?.border,
                }}
              >
                {Array.isArray(content?.items) &&
                  content.items.map((b: any, idx: number) => (
                    <div key={idx} className="text-center px-2">
                      {b.label && (
                        <span className="text-[8px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                          {b.label}
                        </span>
                      )}
                      <p className="text-[11px] font-black text-white uppercase mt-0.5">
                        {b.title}
                      </p>
                      <p className="text-[8.5px] font-bold text-amber-400 uppercase tracking-wider">
                        {b.desc}
                      </p>
                    </div>
                  ))}
              </div>
            );
          }
          return null;

        case 'qrcode':
          const qrSrc = content?.src || content?.customQrUrl || content?.qrUrl;
          return (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center shadow-lg select-none pointer-events-none"
              style={{
                backgroundColor: style?.backgroundColor || '#FFFFFF',
                borderRadius: style?.borderRadius || '12px',
                color: style?.color || '#000000',
              }}
            >
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="Custom QR Code"
                  className="w-12 h-12 object-contain"
                  crossOrigin="anonymous"
                />
              ) : (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    content?.url || 'https://fitclub.ai'
                  )}&color=0-0-0`}
                  alt="QR Code"
                  className="w-12 h-12 object-contain"
                  crossOrigin="anonymous"
                />
              )}
              <span className="text-[7.5px] font-extrabold uppercase tracking-wider mt-1 text-slate-900 truncate max-w-full">
                {content?.label || 'SCAN TO JOIN'}
              </span>
            </div>
          );

        case 'text':
        case 'textbox':
        default:
          return (
            <div
              className="w-full h-full flex items-center select-none"
              style={{
                fontSize: style?.fontSize || '14px',
                fontFamily: style?.fontFamily,
                fontWeight: style?.fontWeight || '600',
                color: style?.color || '#FFFFFF',
                letterSpacing: style?.letterSpacing,
                textTransform: style?.textTransform,
                lineHeight: style?.lineHeight || '1.1',
                textAlign: style?.textAlign || 'left',
                textShadow: style?.textShadow,
                backgroundColor: style?.backgroundColor,
                padding: style?.padding,
                borderRadius: style?.borderRadius,
              }}
            >
              {content?.text || ''}
            </div>
          );
      }
    };

    return (
      <div
        ref={ref}
        id="brochure-export-node"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement?.(null);
            setEditingTextId(null);
          }
        }}
        style={{
          width: `${docWidth}px`,
          height: `${docHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          background: doc.backgroundGradient || doc.backgroundColor || '#0A0A0A',
        }}
        className="relative overflow-hidden rounded-2xl shadow-2xl transition-transform duration-150 border border-slate-300 select-none flex-shrink-0"
      >
        {sortedElements.map((el) => {
          const isSelected = selectedElementId === el.id;
          const isHovered = hoveredElementId === el.id;
          const isBg = el.semantic_role === 'background';
          const isDraggingThis = draggingId === el.id;

          return (
            <div
              key={el.id}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              onDoubleClick={(e) => handleDoubleClick(e, el)}
              onMouseEnter={() => !isBg && setHoveredElementId(el.id)}
              onMouseLeave={() => setHoveredElementId(null)}
              style={{
                position: 'absolute',
                left: `${el.position.x}px`,
                top: `${el.position.y}px`,
                width: typeof el.size?.width === 'number' ? `${el.size.width}px` : el.size?.width || 'auto',
                height: typeof el.size?.height === 'number' ? `${el.size.height}px` : el.size?.height || 'auto',
                zIndex: el.position.zIndex || (isBg ? 0 : 5),
                cursor: !isBg && el.editable !== false ? (isDraggingThis ? 'grabbing' : 'grab') : 'default',
              }}
              className={`group transition-shadow ${
                isSelected
                  ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-black/70 shadow-2xl z-40'
                  : isHovered
                  ? 'ring-1 ring-amber-400/70 ring-offset-1 ring-offset-black/50'
                  : ''
              }`}
            >
              {renderElementContent(el)}

              {/* Selection Badge & Floating Action Toolbar */}
              {isSelected && !draggingId && !resizingHandle && (
                <>
                  {/* Floating Action Toolbar */}
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur border border-amber-400/80 rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span className="text-[9px] font-mono font-bold uppercase text-amber-400 px-1 border-r border-slate-700">
                      {el.semantic_role}
                    </span>

                    {/* Inline edit button for text */}
                    {['text', 'textbox', 'badge', 'button'].includes(el.type) && (
                      <button
                        onClick={() => {
                          setEditingTextId(el.id);
                          setEditingTextValue(el.content?.text || el.content?.title || '');
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Edit text (or double-click)"
                      >
                        <Icon name="edit-2" className="w-3 h-3 text-amber-400" />
                      </button>
                    )}

                    {/* Logo Quick Actions */}
                    {el.type === 'logo' && (
                      <>
                        <input
                          type="file"
                          ref={canvasLogoInputRef}
                          accept="image/png, image/jpeg, image/svg+xml, image/webp"
                          className="hidden"
                          onChange={(e) => handleCanvasLogoUpload(e, el.id)}
                        />
                        <button
                          onClick={() => canvasLogoInputRef.current?.click()}
                          className="p-1 px-1.5 rounded-lg hover:bg-slate-800 text-amber-300 hover:text-amber-200 flex items-center gap-1 text-[9px] font-bold transition"
                          title="Upload custom logo file (PNG/SVG/JPG)"
                        >
                          <Icon name="upload" className="w-3 h-3 text-amber-400" />
                          <span>Upload</span>
                        </button>
                        <button
                          onClick={() => handleCycleLogoPreset(el)}
                          className="p-1 px-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-[9px] font-bold transition"
                          title="Cycle through vector emblem presets"
                        >
                          <Icon name="refresh-cw" className="w-3 h-3 text-amber-400" />
                          <span>Preset</span>
                        </button>
                      </>
                    )}

                    {/* QR Code Quick Actions */}
                    {el.type === 'qrcode' && (
                      <>
                        <input
                          type="file"
                          ref={canvasQrInputRef}
                          accept="image/png, image/jpeg, image/svg+xml, image/webp"
                          className="hidden"
                          onChange={(e) => handleCanvasQrUpload(e, el.id)}
                        />
                        <button
                          onClick={() => canvasQrInputRef.current?.click()}
                          className="p-1 px-1.5 rounded-lg hover:bg-slate-800 text-amber-300 hover:text-amber-200 flex items-center gap-1 text-[9px] font-bold transition"
                          title="Upload custom QR code image (UPI/Payment/Instagram/WhatsApp)"
                        >
                          <Icon name="upload" className="w-3 h-3 text-amber-400" />
                          <span>Upload QR</span>
                        </button>
                        {(el.content?.src || el.content?.customQrUrl) && (
                          <button
                            onClick={() => {
                              if (onUpdateElement) {
                                onUpdateElement(el.id, {
                                  content: {
                                    ...el.content,
                                    src: undefined,
                                    customQrUrl: undefined,
                                    qrUrl: undefined,
                                  },
                                });
                              }
                            }}
                            className="p-1 px-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 flex items-center gap-1 text-[9px] font-bold transition"
                            title="Reset to dynamic generated QR"
                          >
                            <Icon name="refresh-cw" className="w-3 h-3 text-rose-400" />
                            <span>Auto QR</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Duplicate button */}
                    <button
                      onClick={() => onDuplicateElement?.(el.id)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
                      title="Duplicate layer (Ctrl+D)"
                    >
                      <Icon name="copy" className="w-3 h-3 text-cyan-400" />
                    </button>

                    {/* Layer Bring Forward */}
                    <button
                      onClick={() => handleLayerOrder(el.id, 'forward')}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-[9px] font-black"
                      title="Bring forward"
                    >
                      ▲
                    </button>

                    {/* Layer Send Backward */}
                    <button
                      onClick={() => handleLayerOrder(el.id, 'backward')}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white text-[9px] font-black"
                      title="Send backward"
                    >
                      ▼
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteElement?.(el.id)}
                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                      title="Delete layer (Delete / Backspace)"
                    >
                      <Icon name="trash-2" className="w-3 h-3" />
                    </button>

                    {/* Done button */}
                    <button
                      onClick={() => {
                        if (editingTextId) {
                          handleCommitInlineEdit(editingTextId);
                        }
                        onSelectElement?.(null);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black flex items-center gap-1 transition shadow-xs cursor-pointer ml-0.5"
                      title="Done editing (close selection handles)"
                    >
                      <Icon name="check" className="w-3 h-3" />
                      <span>Done</span>
                    </button>
                  </div>

                  {/* 8-Point Interactive Bounding Box Resize Handles */}
                  {/* NW Corner */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw', el)}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  {/* NE Corner */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne', el)}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  {/* SW Corner */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw', el)}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-md z-40 hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  {/* SE Corner */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se', el)}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-md z-40 hover:scale-125 transition-transform"
                    title="Drag to resize"
                  />
                  {/* Top Edge */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n', el)}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-amber-500 rounded-sm cursor-ns-resize z-40"
                  />
                  {/* Bottom Edge */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 's', el)}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-amber-500 rounded-sm cursor-ns-resize z-40"
                  />
                  {/* Left Edge */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w', el)}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-3 bg-white border border-amber-500 rounded-sm cursor-ew-resize z-40"
                  />
                  {/* Right Edge */}
                  <div
                    onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e', el)}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-3 bg-white border border-amber-500 rounded-sm cursor-ew-resize z-40"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);
