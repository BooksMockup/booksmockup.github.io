import React, { useEffect, useRef } from 'react';
import { MockupTemplate } from '../data/mockupTemplates';
import { renderMockupToCanvas } from '../utils/canvas3DRenderer';
import { Check } from 'lucide-react';

interface TemplateThumbnailCardProps {
  template: MockupTemplate;
  isSelected: boolean;
  onSelect: (template: MockupTemplate) => void;
  coverImage: HTMLImageElement | null;
  spineImage: HTMLImageElement | null;
  pageEdgeTint?: 'cream' | 'white' | 'gilded';
}

export const TemplateThumbnailCard: React.FC<TemplateThumbnailCardProps> = ({
  template,
  isSelected,
  onSelect,
  coverImage,
  spineImage,
  pageEdgeTint = 'cream',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMockupToCanvas(canvas, {
      templateId: template.id,
      coverImage,
      spineImage,
      transparentBackground: true,
      backgroundColor: '#FFFFFF',
      shadowIntensity: 0.78,
      glossIntensity: 0.65,
      pageEdgeTint,
      scaleMultiplier: 0.42, // Crisp Three.js WebGL PBR thumbnail render
    });
  }, [template.id, coverImage, spineImage, pageEdgeTint]);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`group relative flex flex-col text-left rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-amber-600 bg-amber-50/50 shadow-md ring-2 ring-amber-500/30'
          : 'border-stone-200/90 bg-white hover:border-stone-400 hover:shadow-sm hover:bg-stone-50/80'
      }`}
    >
      {/* Thumbnail Canvas Preview Container with clean checkerboard for transparency */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center p-2.5 overflow-hidden checkerboard-bg border-b border-stone-200/80">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
        />

        {/* Selected Checkmark Badge */}
        {isSelected && (
          <span
            aria-label="Selected template"
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md animate-in fade-in zoom-in-75 duration-150"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        )}
      </div>

      {/* Template Info Footer */}
      <div className="p-3 flex flex-col justify-between flex-1 bg-white">
        <div className="font-semibold text-xs sm:text-sm text-stone-900 leading-snug line-clamp-1 group-hover:text-amber-800 transition-colors">
          {template.name}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500 font-mono tabular-nums">
          <span className="capitalize">{template.category}</span>
          <span aria-hidden="true">·</span>
          <span>{template.requiresSpine ? 'Spine + Cover' : 'Cover Only'}</span>
        </div>
      </div>
    </button>
  );
};
