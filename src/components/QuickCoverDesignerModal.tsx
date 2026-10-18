import React, { useState } from 'react';
import { SampleBookPreset, generateSampleCoverAndSpine } from '../data/mockupTemplates';
import { Palette, Sparkles, RefreshCw } from 'lucide-react';

interface QuickCoverDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDesign: (coverDataUrl: string, spineDataUrl: string, label: string) => void;
}

export const QuickCoverDesignerModal: React.FC<QuickCoverDesignerModalProps> = ({
  isOpen,
  onClose,
  onApplyDesign,
}) => {
  const [title, setTitle] = useState('THE ARCHITECT OF SILENCE');
  const [subtitle, setSubtitle] = useState('A Novel of Memory and Obsidian Tides');
  const [author, setAuthor] = useState('ELENA VANCE');
  const [badgeText, setBadgeText] = useState('NEW YORK TIMES BESTSELLER');
  const [primaryColor, setPrimaryColor] = useState('#0F172A');
  const [secondaryColor, setSecondaryColor] = useState('#1E293B');
  const [accentColor, setAccentColor] = useState('#F59E0B');

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const customPreset: SampleBookPreset = {
      id: 'custom-' + Date.now(),
      title: title.trim() || 'UNTITLED WORK',
      subtitle: subtitle.trim() || 'A New Edition',
      author: author.trim() || 'AUTHOR NAME',
      genre: 'Custom Edition',
      primaryColor,
      secondaryColor,
      accentColor,
      textColor: '#F8FAFC',
      spineBgColor: primaryColor,
      badgeText: badgeText.trim() || 'FIRST EDITION',
    };
    const { coverDataUrl, spineDataUrl } = generateSampleCoverAndSpine(customPreset);
    onApplyDesign(coverDataUrl, spineDataUrl, customPreset.title);
    onClose();
  };

  const colorThemes = [
    { name: 'Midnight Gold', primary: '#0F172A', secondary: '#1E293B', accent: '#F59E0B' },
    { name: 'Royal Apothecary', primary: '#142E24', secondary: '#0A1914', accent: '#EAB308' },
    { name: 'Bauhaus Terracotta', primary: '#C2410C', secondary: '#7C2D12', accent: '#FEF3C7' },
    { name: 'Nordic Crimson', primary: '#18181B', secondary: '#27272A', accent: '#EF4444' },
    { name: 'Imperial Burgundy', primary: '#4C0519', secondary: '#1F030B', accent: '#FBBF24' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-designer-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-amber-600" />
            <h2 id="cover-designer-title" className="text-lg font-semibold text-stone-900">
              Instant 2D Cover & Spine Builder
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-md hover:bg-stone-200/60 transition-colors"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            Don’t have a finished JPG/PNG on hand? Customize your book title, author, and palette below to generate a high-resolution 1600×2400 cover and matching spine directly into the 3D mockup maker.
          </p>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Book Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              placeholder="e.g. THE ARCHITECT OF SILENCE"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                placeholder="e.g. ELENA VANCE"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Top Kicker / Award Line
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                placeholder="e.g. NEW YORK TIMES BESTSELLER"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Subtitle / Tagline
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
              placeholder="e.g. A Novel of Memory and Obsidian Tides"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-2">
              Editorial Color Theme
            </label>
            <div className="flex flex-wrap gap-2">
              {colorThemes.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(t.primary);
                    setSecondaryColor(t.secondary);
                    setAccentColor(t.accent);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    primaryColor === t.primary
                      ? 'border-amber-600 bg-amber-50 text-stone-900'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15"
                    style={{ backgroundColor: t.primary }}
                  />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate & Apply to 3D Mockup</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
