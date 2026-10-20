/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MOCKUP_TEMPLATES,
  SAMPLE_BOOK_PRESETS,
  MockupCategory,
  MockupTemplate,
  SampleBookPreset,
  generateSampleCoverAndSpine,
} from './data/mockupTemplates';
import { renderMockupToCanvas } from './utils/canvas3DRenderer';
import { TemplateThumbnailCard } from './components/TemplateThumbnailCard';
import { QuickCoverDesignerModal } from './components/QuickCoverDesignerModal';
import {
  Upload,
  Download,
  BookOpen,
  Layers,
  Image as ImageIcon,
  Check,
  Sliders,
  ArrowRight,
  RotateCcw,
  FileImage,
  Palette,
  Sparkles,
  CheckCircle2,
  Trash2,
  ChevronDown,
} from 'lucide-react';

export default function App() {
  // Active Step & Category State
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<MockupCategory>('single');
  const [selectedTemplate, setSelectedTemplate] = useState<MockupTemplate>(
    MOCKUP_TEMPLATES[0]
  );

  // Uploaded / Sample Cover & Spine Image Elements
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null);
  const [spineImage, setSpineImage] = useState<HTMLImageElement | null>(null);
  const [coverFileName, setCoverFileName] = useState<string>('The Architect of Silence (Sample)');
  const [spineFileName, setSpineFileName] = useState<string>('Auto-Matched Spine (Sample)');
  const [activePresetId, setActivePresetId] = useState<string>(
    SAMPLE_BOOK_PRESETS[0].id
  );
  const [isUserUploaded, setIsUserUploaded] = useState<boolean>(false);

  // Studio Lighting, Paper & Background Controls
  const [transparentBackground, setTransparentBackground] = useState<boolean>(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF');
  const [shadowIntensity, setShadowIntensity] = useState<number>(0.8);
  const [glossIntensity, setGlossIntensity] = useState<number>(0.65);
  const [pageEdgeTint, setPageEdgeTint] = useState<'cream' | 'white' | 'gilded'>('cream');

  // UI & Export Feedback States
  const [isDraggingCover, setIsDraggingCover] = useState<boolean>(false);
  const [isDraggingSpine, setIsDraggingSpine] = useState<boolean>(false);
  const [lastExportStatus, setLastExportStatus] = useState<string | null>(null);
  const [isDesignerOpen, setIsDesignerOpen] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Refs for Main Preview Canvas & File Inputs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const spineInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to load any dataURL or blob URL into an HTMLImageElement with full error handling
  const loadImageFromUrl = useCallback(
    (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => {
          console.error('Failed to load image from URL:', err);
          reject(err);
        };
        img.src = url;
      });
    },
    []
  );

  // Apply a Sample Book Preset
  const applyPreset = useCallback(
    async (preset: SampleBookPreset) => {
      try {
        const { coverDataUrl, spineDataUrl } = generateSampleCoverAndSpine(preset);
        const [loadedCover, loadedSpine] = await Promise.all([
          loadImageFromUrl(coverDataUrl),
          loadImageFromUrl(spineDataUrl),
        ]);
        setCoverImage(loadedCover);
        setSpineImage(loadedSpine);
        setCoverFileName(`${preset.title} (Cover)`);
        setSpineFileName(`${preset.title} (Spine)`);
        setActivePresetId(preset.id);
        setIsUserUploaded(false);
      } catch (e) {
        console.error('Preset loading error:', e);
      }
    },
    [loadImageFromUrl]
  );

  // Initialize with the first sample book preset on mount
  useEffect(() => {
    applyPreset(SAMPLE_BOOK_PRESETS[0]);
  }, [applyPreset]);

  // Re-render main 3D preview canvas whenever template, images, or studio sliders change
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    renderMockupToCanvas(canvas, {
      templateId: selectedTemplate.id,
      coverImage,
      spineImage,
      transparentBackground,
      backgroundColor,
      shadowIntensity,
      glossIntensity,
      pageEdgeTint,
      scaleMultiplier: 1,
    });
  }, [
    selectedTemplate,
    coverImage,
    spineImage,
    transparentBackground,
    backgroundColor,
    shadowIntensity,
    glossIntensity,
    pageEdgeTint,
  ]);

  // Handle user uploading a 2D Front Cover file
  const handleCoverFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const img = await loadImageFromUrl(dataUrl);
          setCoverImage(img);
          setCoverFileName(file.name);
          setActivePresetId('');
          setIsUserUploaded(true);
          // If no custom spine was uploaded, reset custom spine so auto-spine derives from new cover
          setSpineImage(null);
          setSpineFileName('Auto-extracted from cover edge');
          setLastExportStatus(`Loaded cover: ${file.name}`);
          setTimeout(() => setLastExportStatus(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload cover file:', err);
    }
  };

  // Handle user uploading a 2D Spine file
  const handleSpineFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          const img = await loadImageFromUrl(dataUrl);
          setSpineImage(img);
          setSpineFileName(file.name);
          setActivePresetId('');
          setLastExportStatus(`Loaded spine: ${file.name}`);
          setTimeout(() => setLastExportStatus(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload spine file:', err);
    }
  };

  // High-Resolution Download Handler with Blob URL to ensure 100% reliable download in all browsers
  const handleDownloadMockup = (format: 'png' | 'jpg') => {
    try {
      const exportCanvas = document.createElement('canvas');
      const isPng = format === 'png';

      renderMockupToCanvas(exportCanvas, {
        templateId: selectedTemplate.id,
        coverImage,
        spineImage,
        transparentBackground: isPng ? transparentBackground : false,
        backgroundColor: isPng ? backgroundColor : backgroundColor || '#FFFFFF',
        shadowIntensity,
        glossIntensity,
        pageEdgeTint,
        scaleMultiplier: 2, // 2x Ultra-HD 300 DPI Resolution
      });

      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const cleanSlug = selectedTemplate.id.replace(/[^a-z0-9-]/gi, '-');
      const filename = `3d-book-mockup-${cleanSlug}.${format}`;

      // Use toBlob for direct browser file streaming (prevents URL length truncation or sandbox blocks)
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to dataURL if toBlob fails
            const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
            const a = document.createElement('a');
            a.download = filename;
            a.href = dataUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 400);

          setLastExportStatus(
            `Saved ${exportCanvas.width}×${exportCanvas.height}px ${format.toUpperCase()}`
          );
          setTimeout(() => setLastExportStatus(null), 4000);
        },
        mimeType,
        0.95
      );
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const filteredTemplates = MOCKUP_TEMPLATES.filter(
    (t) => t.category === selectedCategory
  );

  const backgroundSwatches = [
    { label: 'Pure White', hex: '#FFFFFF' },
    { label: 'Warm Ivory', hex: '#FAF8F5' },
    { label: 'Studio Stone', hex: '#E7E5E4' },
    { label: 'Amber Parchment', hex: '#FEF3C7' },
    { label: 'Deep Slate', hex: '#0F172A' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 overflow-x-hidden selection:bg-amber-500/20">
      {/* Clean Top Navigation Bar — No Unwanted Buttons */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/90 transition-all">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="#top"
              className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-serif-display whitespace-nowrap shrink-0 flex items-center gap-2.5"
            >
              <img
                src="./header.png"
                alt="Books Mockup Logo"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-contain shadow-2xs shrink-0"
              />
              <span>Books Mockup</span>
            </a>
          </div>

        </div>
      </header>

      {/* Main Content Viewport */}
      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Responsive Hero & 3-Step Wizard Progress Nav */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 sm:pb-8 border-b border-stone-200">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-stone-900 text-balance font-serif-display">
              Turn Your 2D Flat Book Cover into a 3D Mockup
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-2">
              Select any Single or Composite template below, upload your front cover image, and download high-resolution 3D product shots instantly.
            </p>
          </div>

          {/* 3-Step Wizard Navigation */}
          <div
            role="tablist"
            aria-label="Mockup creation steps"
            className="w-full xl:w-auto grid grid-cols-3 gap-1 sm:gap-2 p-1.5 bg-stone-200/80 rounded-xl border border-stone-300/80 shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeStep === 1}
              onClick={() => setActiveStep(1)}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeStep === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums shrink-0 ${
                  activeStep === 1
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-300 text-stone-700'
                }`}
              >
                1
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">Step 1: </span>Template
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeStep === 2}
              onClick={() => setActiveStep(2)}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeStep === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums shrink-0 ${
                  activeStep === 2
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-300 text-stone-700'
                }`}
              >
                2
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">Step 2: </span>Cover
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeStep === 3}
              onClick={() => setActiveStep(3)}
              className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums shrink-0 ${
                  activeStep === 3
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-300 text-stone-700'
                }`}
              >
                3
              </span>
              <span className="truncate">
                <span className="hidden sm:inline">Step 3: </span>Export
              </span>
            </button>
          </div>
        </div>

        {/* Core 2-Column Responsive Workbench */}
        <section
          id="mockup-studio"
          className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
        >
          {/* LEFT WORKSPACE COLUMN (7 Cols): Step Panels */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 1: TEMPLATE SELECTION GALLERY */}
            {activeStep === 1 && (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-serif-display">
                      01. Select a 3D Mockup Template
                    </h2>
                    <p className="text-xs text-stone-600 mt-1">
                      Choose between Single standalone editions or Composite multi-device launch sets.
                    </p>
                  </div>

                  {/* Single vs Composite Toggle Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200/80 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('single')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        selectedCategory === 'single'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Single (9)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('composite')}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        selectedCategory === 'composite'
                          ? 'bg-white text-stone-900 shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Composite (8)</span>
                    </button>
                  </div>
                </div>

                {/* Auto-Adjustable Responsive Grid for Thumbnails */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-h-[580px] overflow-y-auto pr-1">
                  {filteredTemplates.map((tmpl) => (
                    <TemplateThumbnailCard
                      key={tmpl.id}
                      template={tmpl}
                      isSelected={selectedTemplate.id === tmpl.id}
                      onSelect={(t) => setSelectedTemplate(t)}
                      coverImage={coverImage}
                      spineImage={spineImage}
                      pageEdgeTint={pageEdgeTint}
                    />
                  ))}
                </div>

                {/* Step 1 Footer */}
                <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-stone-600 truncate">
                    Selected:{' '}
                    <span className="font-semibold text-stone-900">
                      {selectedTemplate.name}
                    </span>{' '}
                    ·{' '}
                    <span className="font-mono tabular-nums text-stone-500">
                      {selectedTemplate.requiresSpine
                        ? 'Cover + Spine'
                        : 'Cover Only'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    <span>Next: Upload Cover Image</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: UPLOAD 2D COVER & SPINE + PRESETS */}
            {activeStep === 2 && (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-serif-display">
                      02. Load Your 2D Front Cover & Spine
                    </h2>
                    <p className="text-xs text-stone-600 mt-1">
                      Upload your book image below. Once uploaded, all 20 mockups will immediately show your artwork!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDesignerOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300/80 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 text-amber-700" />
                    <span>Instant Cover Builder</span>
                  </button>
                </div>

                {/* Upload Status Banner */}
                {isUserUploaded && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Your custom cover <strong>{coverFileName}</strong> is active across all 3D mockups!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyPreset(SAMPLE_BOOK_PRESETS[0])}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
                    >
                      Reset to Sample
                    </button>
                  </div>
                )}

                {/* Responsive Upload Dropzone Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Front Cover Card */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(true);
                    }}
                    onDragLeave={() => setIsDraggingCover(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingCover(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleCoverFileUpload(file);
                    }}
                    className={`flex flex-col justify-between p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all ${
                      isDraggingCover
                        ? 'border-amber-600 bg-amber-50/60'
                        : isUserUploaded
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-stone-300 bg-stone-50/70 hover:border-stone-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                        <span>Front Cover Image</span>
                        <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm">
                          JPG / PNG / WEBP
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Recommended: {selectedTemplate.recommendedCoverSize}
                      </p>

                      <div className="mt-3.5 flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200">
                        <FileImage className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-stone-900 truncate">
                            {coverFileName}
                          </div>
                          {coverImage && (
                            <div className="text-[11px] font-mono text-stone-500 tabular-nums">
                              Loaded: {coverImage.width} × {coverImage.height} px
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {/* Hidden File Input with explicit ref & onchange */}
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverFileUpload(file);
                          e.target.value = ''; // Reset so uploading same file again triggers onchange
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Front Cover File</span>
                      </button>
                    </div>
                  </div>

                  {/* Spine Card */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingSpine(true);
                    }}
                    onDragLeave={() => setIsDraggingSpine(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingSpine(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleSpineFileUpload(file);
                    }}
                    className={`flex flex-col justify-between p-4 sm:p-5 rounded-xl border-2 border-dashed transition-all ${
                      isDraggingSpine
                        ? 'border-amber-600 bg-amber-50/60'
                        : 'border-stone-300 bg-stone-50/70 hover:border-stone-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                        <span>Spine Strip Image</span>
                        <span className="font-mono text-[11px] text-stone-500">
                          {selectedTemplate.requiresSpine ? 'Active on 3D view' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {selectedTemplate.requiresSpine
                          ? 'Auto-generated from cover edge if omitted.'
                          : 'Not required for this front-facing template.'}
                      </p>

                      <div className="mt-3.5 flex items-center gap-3 p-3 rounded-lg bg-white border border-stone-200">
                        <FileImage className="w-5 h-5 text-stone-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-stone-900 truncate">
                            {spineFileName}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500 tabular-nums">
                            {spineImage
                              ? `${spineImage.width} × ${spineImage.height} px`
                              : 'Auto-sampled from edge'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        ref={spineInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSpineFileUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => spineInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Spine Strip</span>
                      </button>
                      {spineImage && (
                        <button
                          type="button"
                          title="Reset to auto spine"
                          onClick={() => {
                            setSpineImage(null);
                            setSpineFileName('Auto-extracted from cover edge');
                          }}
                          className="p-2.5 text-stone-600 bg-white border border-stone-300 rounded-lg hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Instant Sample Presets */}
                <div className="pt-2">
                  <div className="text-xs font-semibold text-stone-800 mb-2.5 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Or Test with a Ready-Made Sample Author Preset:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SAMPLE_BOOK_PRESETS.map((preset) => {
                      const isCurrent = activePresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600 shadow-2xs'
                              : 'border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-7 h-9 rounded-xs shrink-0 border border-black/15 shadow-2xs"
                              style={{
                                background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})`,
                              }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-stone-900 truncate">
                                {preset.title}
                              </div>
                              <div className="text-[11px] text-stone-500 truncate">
                                {preset.author} · {preset.genre}
                              </div>
                            </div>
                          </div>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 Footer */}
                <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Back to Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    <span>Continue To Export</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: STUDIO LIGHTING, BACKGROUND & DOWNLOAD */}
            {activeStep === 3 && (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-6">
                <div className="pb-5 border-b border-stone-200">
                  <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-serif-display">
                    03. Fine-Tune Studio Lighting & Export High-Res Mockup
                  </h2>
                  <p className="text-xs text-stone-600 mt-1">
                    Adjust shadow depth, paper edge stock, and foil sheen before downloading in crisp 300 DPI resolution.
                  </p>
                </div>

                {/* Studio Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Shadow Depth */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>Drop Shadow Intensity</span>
                      </span>
                      <span className="font-mono tabular-nums text-stone-600">
                        {Math.round(shadowIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={shadowIntensity}
                      onChange={(e) => setShadowIntensity(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                      <span>Subtle (0%)</span>
                      <span>Studio (80%)</span>
                      <span>Deep (100%)</span>
                    </div>
                  </div>

                  {/* Gloss / Foil Sheen */}
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>Cover Gloss / Foil Sheen</span>
                      </span>
                      <span className="font-mono tabular-nums text-stone-600">
                        {Math.round(glossIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={glossIntensity}
                      onChange={(e) => setGlossIntensity(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                      <span>Matte</span>
                      <span>Satin Jacket</span>
                      <span>High Gloss</span>
                    </div>
                  </div>
                </div>

                {/* Paper Block Tint & Backdrop Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-2">
                      Page Edge Paper Stock
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'cream', label: 'Warm Cream' },
                          { id: 'white', label: 'Bright White' },
                          { id: 'gilded', label: 'Gold Gilded' },
                        ] as const
                      ).map((tint) => (
                        <button
                          key={tint.id}
                          type="button"
                          onClick={() => setPageEdgeTint(tint.id)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                            pageEdgeTint === tint.id
                              ? 'border-amber-600 bg-amber-50 text-stone-900 font-semibold shadow-2xs'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          {tint.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-2">
                      Background
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setTransparentBackground(true)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          transparentBackground
                            ? 'border-amber-600 bg-amber-50 text-stone-900 font-semibold shadow-2xs'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        Transparent PNG
                      </button>

                      {backgroundSwatches.map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          title={swatch.label}
                          onClick={() => {
                            setTransparentBackground(false);
                            setBackgroundColor(swatch.hex);
                          }}
                          className={`w-8 h-8 rounded-lg border transition-transform cursor-pointer ${
                            !transparentBackground && backgroundColor === swatch.hex
                              ? 'ring-2 ring-amber-600 scale-105 border-stone-900'
                              : 'border-stone-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direct High-Resolution Download Actions */}
                <div className="pt-4 border-t border-stone-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadMockup('png')}
                      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadMockup('jpg')}
                      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Download JPG</span>
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="text-stone-700 hover:text-stone-900 font-medium underline underline-offset-4 cursor-pointer"
                    >
                      ← Change 3D template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT WORKSPACE COLUMN (5 Cols): Live 3D Render Stage */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
              {/* Stage Top Bar */}
              <div className="px-4 sm:px-5 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-stone-900 truncate">
                    {selectedTemplate.name}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    {selectedTemplate.subtitle}
                  </div>
                </div>
              </div>

              {/* Responsive Auto-Fitting Canvas Viewport */}
              <div
                className={`relative w-full aspect-[4/3] sm:aspect-[11/10] flex items-center justify-center p-4 sm:p-6 transition-colors overflow-hidden ${
                  transparentBackground ? 'checkerboard-bg' : ''
                }`}
                style={
                  !transparentBackground ? { backgroundColor } : undefined
                }
              >
                <canvas
                  ref={mainCanvasRef}
                  className="w-full h-full object-contain transition-all duration-150"
                />

                {lastExportStatus && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-stone-900/95 text-white text-xs font-medium shadow-lg flex items-center gap-2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>{lastExportStatus}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Specifications & Size Guide Section */}
        <section
          id="cover-specs"
          className="mt-14 sm:mt-16 pt-10 sm:pt-12 border-t border-stone-200"
        >
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif-display">
              Recommended Cover & Spine Dimensions
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5">
              Standard publishing ratios to ensure maximum sharpness for Amazon KDP, BookBub promos, and social launch ads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-xs font-mono text-amber-700 tabular-nums">
                01. FRONT COVER RATIO (1 : 1.5)
              </div>
              <h3 className="text-base font-bold text-stone-900 mt-1 font-serif-display">
                Standard eBook & Trade Cover
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Upload any 6″×9″ or 1600×2400 px JPG or PNG. The subdivided perspective shader automatically maps your cover onto 3D book angles, French joints, and device screens without affine distortion.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-mono text-stone-500 tabular-nums">
                Recommended: 1600 × 2400 px · 300 DPI
              </div>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="text-xs font-mono text-amber-700 tabular-nums">
                02. BOOK SPINE STRIP
              </div>
              <h3 className="text-base font-bold text-stone-900 mt-1 font-serif-display">
                Spine-Enabled Mockups
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Templates showing a spine can take a dedicated spine file (e.g. 220×2400 px). If you don’t have one, our studio automatically samples and creates a color-matched spine from your cover edge.
              </p>
              <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-mono text-stone-500 tabular-nums">
                Recommended: 220 × 2400 px · Strip
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section (Collapsed by default, click to expand) */}
        <section id="faq" className="mt-14 sm:mt-16 pt-10 sm:pt-12 pb-6 border-t border-stone-200">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif-display mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {[
              {
                question: 'Is this 3D mockup maker 100% free for commercial use?',
                answer:
                  'Yes. You can create and download unlimited Single and Composite 3D mockups with zero watermarks, no registration, and full commercial rights for Amazon A+, BookBub, Kickstarter, and book covers.',
              },
              {
                question: 'What is the difference between Single and Composite mockups?',
                answer:
                  'Single mockups showcase one standalone item (like an angled hardcover or Kindle Paperwhite). Composite mockups combine several formats (e.g., printed book + tablet + smartphone) to show off complete book launches.',
              },
            ].map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-stone-200/90 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left hover:bg-stone-50/70 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold text-stone-900">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-600 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-700' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 pt-1 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 text-center sm:text-left">
          <div>
            Books Mockup — Free Online 3D Book Mockup Generator for Authors & Publishers.
          </div>
        </div>
      </footer>

      {/* Custom 2D Cover & Spine Builder Modal */}
      <QuickCoverDesignerModal
        isOpen={isDesignerOpen}
        onClose={() => setIsDesignerOpen(false)}
        onApplyDesign={async (coverDataUrl, spineDataUrl, label) => {
          const [cImg, sImg] = await Promise.all([
            loadImageFromUrl(coverDataUrl),
            loadImageFromUrl(spineDataUrl),
          ]);
          setCoverImage(cImg);
          setSpineImage(sImg);
          setCoverFileName(`${label} (Custom Cover)`);
          setSpineFileName(`${label} (Custom Spine)`);
          setActivePresetId('');
          setIsUserUploaded(true);
        }}
      />
    </div>
  );
}
