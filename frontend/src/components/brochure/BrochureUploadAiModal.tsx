import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { BrochureData } from '@/types/brochure';
import { extractBrochureFromImage, type ExtractedBrochureResult } from '@/services/brochureAiExtractor';

interface BrochureUploadAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtracted: (data: BrochureData, designJson?: any) => void;
}

const SAMPLE_POSTERS_FOR_TESTING = [
  {
    name: 'PowerZone Gold Flyer',
    url: '/assets/brochures/powerzone_bg.jpg',
    vibe: 'Angled Gold Cutouts',
    id: 'powerzone-split',
  },
  {
    name: 'Fit Chalk Motivation',
    url: '/assets/brochures/chalk_motivation_bg.png',
    vibe: 'Chalk Athlete 6 Steps',
    id: 'chalk-motivation',
  },
  {
    name: 'Spartan Discipline',
    url: '/assets/brochures/spartan_discipline_bg.jpg',
    vibe: '3D Gold & Red Spartan',
    id: 'spartan-discipline',
  },
  {
    name: 'Future Self Anime',
    url: '/assets/brochures/future_self_bg.jpg',
    vibe: 'Aura Shadow Warrior',
    id: 'future-self-anime',
  },
  {
    name: 'Dark Focus Moodboard',
    url: '/assets/brochures/focus_moodboard_bg.png',
    vibe: 'Moodboard & Schedule',
    id: 'focus-moodboard',
  },
  {
    name: 'BodyHub 50% Off Diamond',
    url: '/assets/brochures/bodyhub_diamond_bg.jpg',
    vibe: 'Diamond Geometry Promo',
    id: 'bodyhub-diamond',
  },
];

export function BrochureUploadAiModal({
  isOpen,
  onClose,
  onApplyExtracted,
}: BrochureUploadAiModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [extractedResult, setExtractedResult] = useState<ExtractedBrochureResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      runAiScan(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = async (sample: typeof SAMPLE_POSTERS_FOR_TESTING[0]) => {
    setSelectedImage(sample.url);
    setFilename(sample.name);

    try {
      const response = await fetch(sample.url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        runAiScan(base64, sample.name);
      };
      reader.readAsDataURL(blob);
    } catch {
      runAiScan(sample.url, sample.name);
    }
  };

  const runAiScan = async (imgData: string, name: string) => {
    setIsScanning(true);
    setScanStep(2);

    try {
      const result = await extractBrochureFromImage(imgData, name);
      setExtractedResult(result);
      setScanStep(4);
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApply = () => {
    if (extractedResult?.data) {
      onApplyExtracted(extractedResult.data, extractedResult.designJson);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-800 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <Icon name="sparkles" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI Brochure & Poster Scanner</h3>
              <p className="text-xs text-slate-500">
                Upload any fitness poster to automatically extract brand logo, copy, perks & rules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* File Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center transition bg-slate-50 relative group">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Icon name="upload" className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-slate-900">
                Drag & Drop or Click to Upload Brochure / Poster
              </p>
              <p className="text-xs text-slate-500">Supports PNG, JPG, JPEG, WEBP files up to 25MB</p>
            </div>
          </div>

          {/* Preset Quick Samples for Testing */}
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Or Try A Preset Pinterest Poster:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SAMPLE_POSTERS_FOR_TESTING.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleSelectSample(sample)}
                  className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-amber-500 hover:bg-slate-100 text-left transition flex flex-col items-center text-center group"
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-full h-16 object-cover rounded-lg mb-1 group-hover:scale-105 transition"
                  />
                  <span className="text-[9px] font-bold text-slate-800 truncate w-full">{sample.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scanning Animation State */}
          {isScanning && (
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-xs font-black text-amber-800 uppercase tracking-wider">
                  AI Vision Scanning in Progress...
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-700">
                <p className={scanStep >= 1 ? 'text-emerald-600 font-bold' : 'opacity-40'}>
                  ✓ 1. Reading image pixels and OCR text layers
                </p>
                <p className={scanStep >= 2 ? 'text-emerald-600 font-bold' : 'opacity-40'}>
                  ✓ 2. Extracting Gym Brand, Slogans & Headlines
                </p>
                <p className={scanStep >= 3 ? 'text-emerald-600 font-bold' : 'opacity-40'}>
                  ✓ 3. Parsing 6-step discipline rules & pricing deals
                </p>
                <p className={scanStep >= 4 ? 'text-emerald-600 font-bold' : 'opacity-40'}>
                  ✓ 4. Mapping to zero-overlap clean vector layout
                </p>
              </div>
            </div>
          )}

          {/* Extracted Data Preview */}
          {!isScanning && extractedResult && (
            <div className="p-4 bg-slate-50 border border-emerald-400 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    AI Extraction Successful
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Confidence: {Math.round(extractedResult.confidence * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Gym Brand:</span>
                  <p className="font-bold text-slate-900 text-sm">{extractedResult.data.gymName}</p>
                  <p className="text-[10px] text-amber-700">{extractedResult.data.gymTagline}</p>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Headline:</span>
                  <p className="font-black text-slate-900 text-sm">{extractedResult.data.headline}</p>
                  <p className="text-[10px] text-slate-600 truncate">{extractedResult.data.subheadline}</p>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Extracted Checklist & Badges:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(extractedResult.data.checklistItems || []).map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                    >
                      {item.title}: {item.subtitle}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={!extractedResult || isScanning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="check" className="w-4 h-4" />
            <span>Apply & Open in Studio Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
}
