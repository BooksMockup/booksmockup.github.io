export type MockupCategory = 'single' | 'composite';

export interface MockupTemplate {
  id: string;
  name: string;
  category: MockupCategory;
  subtitle: string;
  requiresSpine: boolean;
  dimensionsLabel: string;
  recommendedCoverSize: string;
  recommendedSpineSize?: string;
}

export interface SampleBookPreset {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  spineBgColor: string;
  badgeText: string;
}

export const MOCKUP_TEMPLATES: MockupTemplate[] = [
  // Single Mockups (12 templates)
  {
    id: 'single-standing-hardcover-left',
    name: 'Standing Hardcover (Left Spine)',
    category: 'single',
    subtitle: 'Classic angled hardcover with spine & realistic studio shadow',
    requiresSpine: true,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'single-standing-paperback-right',
    name: 'Standing Paperback (Right Page Edge)',
    category: 'single',
    subtitle: 'Angled trade paperback showing cream page block & soft crease',
    requiresSpine: false,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'single-front-hardcover',
    name: 'Front-Facing Hardcover Edition',
    category: 'single',
    subtitle: 'Straight-on presentation with deep binding groove & drop shadow',
    requiresSpine: false,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'single-thick-epic-novel',
    name: 'Thick Boxed Omnibus Hardcover',
    category: 'single',
    subtitle: 'Extra-wide spine showcase for 600+ page novels or box sets',
    requiresSpine: true,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '340 × 2400 px',
  },
  {
    id: 'single-kindle-ereader',
    name: 'E-Reader Paperwhite Display',
    category: 'single',
    subtitle: 'Matte flush-front digital e-reader frame with anti-glare finish',
    requiresSpine: false,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'single-tablet-pro',
    name: 'Modern Tablet eBook Reader',
    category: 'single',
    subtitle: 'Sleek aluminum bezel tablet with subtle glass screen reflection',
    requiresSpine: false,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'single-smartphone-reader',
    name: 'Smartphone Mobile eBook',
    category: 'single',
    subtitle: 'angled flagship phone displaying full-bleed vertical cover',
    requiresSpine: false,
    dimensionsLabel: '1500 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'single-audiobook-case',
    name: 'Audiobook Edition + Headphones',
    category: 'single',
    subtitle: 'Square audiobook edition case paired with studio headphones icon badge',
    requiresSpine: false,
    dimensionsLabel: '1800 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (auto-cropped/fitted)',
  },
  {
    id: 'single-glossy-workbook',
    name: 'Spiral / Trade Workbook Edition',
    category: 'single',
    subtitle: 'Wide trade manual with metallic wire-o rings along the left edge',
    requiresSpine: false,
    dimensionsLabel: '1600 × 2000 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },

  // Composite Mockups (10 templates)
  {
    id: 'comp-hardcover-ereader',
    name: 'Print + E-Reader Duo',
    category: 'composite',
    subtitle: 'Standing 3D hardcover with spine alongside a matte e-reader',
    requiresSpine: true,
    dimensionsLabel: '2200 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-hardcover-tablet-phone',
    name: 'Full Launch Bundle (Book + Tablet + Phone)',
    category: 'composite',
    subtitle: 'Bestseller promotional trio: 3D hardcover, tablet & smartphone',
    requiresSpine: true,
    dimensionsLabel: '2400 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-twin-hardcover-paperback',
    name: 'Dual Editions (Spine + Page View)',
    category: 'composite',
    subtitle: 'Two angled books showing both the spine side and page-edge side',
    requiresSpine: true,
    dimensionsLabel: '2200 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-trilogy-boxset',
    name: 'Three-Book Series Stack',
    category: 'composite',
    subtitle: 'Staggered 3-book series showcase ideal for box sets & trilogies',
    requiresSpine: true,
    dimensionsLabel: '2400 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-book-audiobook-phone',
    name: 'Print + Audiobook + Mobile App',
    category: 'composite',
    subtitle: 'Hardcover novel paired with square audiobook jacket & mobile player',
    requiresSpine: true,
    dimensionsLabel: '2400 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-tablet-phone-digital',
    name: 'Digital First Duo (Tablet + Smartphone)',
    category: 'composite',
    subtitle: 'Clean digital release combo for Kindle Unlimited & eBook launches',
    requiresSpine: false,
    dimensionsLabel: '2000 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
  },
  {
    id: 'comp-standing-and-flatlay',
    name: 'Standing Book + Lying Stack',
    category: 'composite',
    subtitle: 'Upright hardcover standing beside a flat tabletop edition',
    requiresSpine: true,
    dimensionsLabel: '2300 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
  {
    id: 'comp-mega-author-pack',
    name: 'Complete Author Marketing Pack (4-in-1)',
    category: 'composite',
    subtitle: 'Hardcover, paperback, tablet, and e-reader arranged in a studio arc',
    requiresSpine: true,
    dimensionsLabel: '2600 × 1800 px',
    recommendedCoverSize: '1600 × 2400 px (1:1.5)',
    recommendedSpineSize: '220 × 2400 px',
  },
];

export const SAMPLE_BOOK_PRESETS: SampleBookPreset[] = [
  {
    id: 'preset-architect-of-silence',
    title: 'THE ARCHITECT OF SILENCE',
    subtitle: 'A Novel of Memory and Obsidian Tides',
    author: 'ELENA VANCE',
    genre: 'Literary Speculative Fiction',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    accentColor: '#F59E0B',
    textColor: '#F8FAFC',
    spineBgColor: '#090D16',
    badgeText: 'NEW YORK TIMES BESTSELLER',
  },
  {
    id: 'preset-botanical-cipher',
    title: 'THE VERMILION HERBARIUM',
    subtitle: 'Secret Histories of the Royal Apothecary',
    author: 'JULIAN BLACKWOOD',
    genre: 'Historical Mystery',
    primaryColor: '#142E24',
    secondaryColor: '#0A1914',
    accentColor: '#EAB308',
    textColor: '#FEFCE8',
    spineBgColor: '#0B1D16',
    badgeText: 'BOOKER PRIZE SHORTLIST',
  },
  {
    id: 'preset-design-systems',
    title: 'FORM & FRICTION',
    subtitle: 'Principles of Enduring Product Architecture',
    author: 'MARCUS LINDQVIST',
    genre: 'Design & Monograph',
    primaryColor: '#EA580C',
    secondaryColor: '#9A3412',
    accentColor: '#FFFBEB',
    textColor: '#FFFFFF',
    spineBgColor: '#1C1917',
    badgeText: 'REVISED THIRD EDITION',
  },
  {
    id: 'preset-nordic-noir',
    title: 'COLD HARBOR PROTOCOL',
    subtitle: 'No One Leaves the Archipelago Unseen',
    author: 'SOREN KJAER',
    genre: 'International Thriller',
    primaryColor: '#18181B',
    secondaryColor: '#3F3F46',
    accentColor: '#EF4444',
    textColor: '#FAFAFA',
    spineBgColor: '#09090B',
    badgeText: 'OVER 1 MILLION COPIES SOLD',
  },
];

/**
 * Generates a high-resolution sample book cover and matching spine data URL
 * using HTML5 Canvas so the user can test any 3D mockup with 1 click.
 */
export function generateSampleCoverAndSpine(preset: SampleBookPreset): {
  coverDataUrl: string;
  spineDataUrl: string;
} {
  // 1. Generate Front Cover (800 x 1200)
  const coverCanvas = document.createElement('canvas');
  coverCanvas.width = 800;
  coverCanvas.height = 1200;
  const ctx = coverCanvas.getContext('2d')!;

  // Rich gradient background
  const grad = ctx.createLinearGradient(0, 0, 800, 1200);
  grad.addColorStop(0, preset.primaryColor);
  grad.addColorStop(1, preset.secondaryColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1200);

  // Subtle geometric editorial artwork
  ctx.save();
  ctx.strokeStyle = preset.accentColor;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  for (let r = 80; r <= 420; r += 34) {
    ctx.beginPath();
    ctx.arc(400, 620, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Framing border
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 704, 1104);
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, 680, 1080);
  ctx.restore();

  // Center illustration emblem
  ctx.save();
  ctx.translate(400, 620);
  const radial = ctx.createRadialGradient(0, 0, 20, 0, 0, 240);
  radial.addColorStop(0, preset.accentColor);
  radial.addColorStop(0.5, preset.primaryColor + '88');
  radial.addColorStop(1, 'transparent');
  ctx.fillStyle = radial;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, 240, 0, Math.PI * 2);
  ctx.fill();

  // Crisp geometric star / compass / architectural motif
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * 165, Math.sin(angle) * 165);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 95, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = preset.accentColor;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Top Badge text
  ctx.fillStyle = preset.accentColor;
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText(preset.badgeText, 400, 130);

  // Title (multi-line wrap)
  ctx.fillStyle = preset.textColor;
  ctx.font = '700 64px "Fraunces", Georgia, serif';
  const words = preset.title.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    if (ctx.measureText(testLine).width < 620) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  let titleY = 235;
  lines.forEach((line) => {
    ctx.fillText(line, 400, titleY);
    titleY += 74;
  });

  // Subtitle
  ctx.fillStyle = preset.textColor;
  ctx.globalAlpha = 0.82;
  ctx.font = 'italic 400 26px "Fraunces", Georgia, serif';
  ctx.fillText(preset.subtitle, 400, 945);

  // Divider line
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(310, 990);
  ctx.lineTo(490, 990);
  ctx.stroke();

  // Author Name
  ctx.globalAlpha = 1;
  ctx.fillStyle = preset.textColor;
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(preset.author, 400, 1065);

  // 2. Generate Matching Spine (140 x 1200)
  const spineCanvas = document.createElement('canvas');
  spineCanvas.width = 140;
  spineCanvas.height = 1200;
  const sctx = spineCanvas.getContext('2d')!;

  sctx.fillStyle = preset.spineBgColor;
  sctx.fillRect(0, 0, 140, 1200);

  // Top & Bottom publisher bands
  sctx.fillStyle = preset.accentColor;
  sctx.fillRect(0, 60, 140, 6);
  sctx.fillRect(0, 1090, 140, 6);

  // Vertical Rotated Title on Spine
  sctx.save();
  sctx.translate(70, 520);
  sctx.rotate(Math.PI / 2);
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillStyle = preset.textColor;
  sctx.font = '700 32px "Fraunces", Georgia, serif';
  sctx.fillText(preset.title, 0, -4);
  sctx.restore();

  // Vertical Rotated Author on Spine
  sctx.save();
  sctx.translate(70, 960);
  sctx.rotate(Math.PI / 2);
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillStyle = preset.accentColor;
  sctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  sctx.fillText(preset.author, 0, 0);
  sctx.restore();

  // Publisher Colophon Emblem at bottom of spine
  sctx.strokeStyle = preset.accentColor;
  sctx.lineWidth = 2.5;
  sctx.beginPath();
  sctx.arc(70, 1142, 18, 0, Math.PI * 2);
  sctx.stroke();

  return {
    coverDataUrl: coverCanvas.toDataURL('image/png'),
    spineDataUrl: spineCanvas.toDataURL('image/png'),
  };
}
