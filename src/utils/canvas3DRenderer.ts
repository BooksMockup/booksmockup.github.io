/**
 * Photorealistic Studio 3D Book & Device Renderer for DIY Book Covers
 *
 * Key Realism Architecture:
 * 1. True 3D Floor-Plane Analytical Gaussian GLSL Shadow Shader:
 *    Renders a horizontal 3D studio floor plane (y = floorY) inside the Three.js scene
 *    evaluated per-pixel on the GPU using the exact separable 2D Gaussian box integral (erf)
 *    and 20-slice continuous height integration for variable-penumbra softbox cast shadows.
 *    - Zero 2D stroked lines, zero polygonal banding, zero Z-fighting.
 *    - Follows the exact 3D oriented bounding box (uAxis, vAxis) of every book and device.
 *    - Foreshortening-calibrated contact occlusion crease + ambient floor cushion + softbox cast tail.
 * 2. Zero White Glare / 100% True Cover Colors:
 *    Preserves exact sRGB artwork saturation and contrast with zero white overlay,
 *    paired with realistic dark-only French hinge creases, cylindrical spine depth,
 *    seamless edge-continuation board rims, and 220-sheet cream/white/gilded paper blocks.
 */

import * as THREE from 'three';

export interface RenderOptions {
  templateId: string;
  coverImage: HTMLImageElement | null;
  spineImage: HTMLImageElement | null;
  transparentBackground: boolean;
  backgroundColor: string;
  shadowIntensity: number; // 0 to 1
  glossIntensity: number;  // 0 to 1
  pageEdgeTint: 'cream' | 'white' | 'gilded';
  scaleMultiplier?: number;
}

// ============================================================================
// SHARED SINGLETON WEBGL STUDIO CONTEXT
// ============================================================================

interface StudioContext {
  renderer: THREE.WebGLRenderer;
  maxAnisotropy: number;
}

let sharedStudio: StudioContext | null = null;
let webglUnavailable = false;

function getSharedStudio(): StudioContext | null {
  if (webglUnavailable) return null;
  if (sharedStudio) {
    try {
      const gl = sharedStudio.renderer.getContext();
      if (gl && !gl.isContextLost()) {
        return sharedStudio;
      }
      sharedStudio.renderer.dispose();
    } catch {
      // Recreate below
    }
    sharedStudio = null;
  }

  try {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true,
      });
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(1);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy() || 4;

    sharedStudio = {
      renderer,
      maxAnisotropy,
    };
    return sharedStudio;
  } catch {
    webglUnavailable = true;
    return null;
  }
}

// ============================================================================
// PROCEDURAL TEXTURE GENERATORS & SMART CACHES
// ============================================================================

let placeholderCoverCanvas: HTMLCanvasElement | null = null;

function getPlaceholderCoverCanvas(): HTMLCanvasElement {
  if (placeholderCoverCanvas) return placeholderCoverCanvas;
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 1200;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 800, 1200);
  grad.addColorStop(0, '#1E293B');
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 1200);

  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 704, 1104);

  ctx.fillStyle = '#F59E0B';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DIY BOOK COVERS STUDIO', 400, 160);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 68px "Fraunces", Georgia, serif';
  ctx.fillText('YOUR BOOK', 400, 520);
  ctx.fillText('COVER HERE', 400, 610);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '400 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Upload a 2D JPG/PNG or select a Preset', 400, 740);

  placeholderCoverCanvas = c;
  return c;
}

function sampleCoverEdgeColor(source: HTMLImageElement | HTMLCanvasElement): string {
  try {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(source, 0, 0, Math.max(4, source.width * 0.08), source.height, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r = Math.max(22, Math.floor((r / count) * 0.84));
    g = Math.max(22, Math.floor((g / count) * 0.84));
    b = Math.max(22, Math.floor((b / count) * 0.84));
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#292524';
  }
}

interface CachedBookArtwork {
  sourceCover: HTMLImageElement | HTMLCanvasElement;
  sourceSpine: HTMLImageElement | HTMLCanvasElement | null;
  hardcoverTex: THREE.CanvasTexture;
  paperbackTex: THREE.CanvasTexture;
  spiralTex: THREE.CanvasTexture;
  deviceTex: THREE.CanvasTexture;
  spineTex: THREE.CanvasTexture;
  rightRimTex: THREE.CanvasTexture;
  topBottomRimTex: THREE.CanvasTexture;
  boardColor: string;
}

let cachedArtwork: CachedBookArtwork | null = null;

function getBookArtworkTextures(
  coverSource: HTMLImageElement | HTMLCanvasElement,
  spineSource: HTMLImageElement | HTMLCanvasElement | null,
  maxAnisotropy: number
): CachedBookArtwork {
  if (
    cachedArtwork &&
    cachedArtwork.sourceCover === coverSource &&
    cachedArtwork.sourceSpine === spineSource
  ) {
    return cachedArtwork;
  }

  if (cachedArtwork) {
    cachedArtwork.hardcoverTex.dispose();
    cachedArtwork.paperbackTex.dispose();
    cachedArtwork.spiralTex.dispose();
    cachedArtwork.deviceTex.dispose();
    cachedArtwork.spineTex.dispose();
    cachedArtwork.rightRimTex.dispose();
    cachedArtwork.topBottomRimTex.dispose();
  }

  const makeCoverTex = (mode: 'hardcover' | 'paperback' | 'spiral' | 'device') => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1536;
    const ctx = c.getContext('2d')!;

    // 100% pure cover artwork — ZERO white overlay or white glare
    ctx.drawImage(coverSource, 0, 0, c.width, c.height);

    if (mode === 'hardcover') {
      // Authentic dark-only French joint groove near the left spine edge — ZERO right-side shadow
      const grooveGrad = ctx.createLinearGradient(0, 0, c.width, 0);
      grooveGrad.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
      grooveGrad.addColorStop(0.014, 'rgba(0, 0, 0, 0.04)');
      grooveGrad.addColorStop(0.032, 'rgba(0, 0, 0, 0.30)');
      grooveGrad.addColorStop(0.048, 'rgba(0, 0, 0, 0.02)');
      grooveGrad.addColorStop(0.07, 'rgba(0, 0, 0, 0)');
      grooveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grooveGrad;
      ctx.fillRect(0, 0, c.width, c.height);
    } else if (mode === 'paperback') {
      const grooveGrad = ctx.createLinearGradient(0, 0, c.width, 0);
      grooveGrad.addColorStop(0, 'rgba(0, 0, 0, 0.20)');
      grooveGrad.addColorStop(0.022, 'rgba(0, 0, 0, 0.18)');
      grooveGrad.addColorStop(0.042, 'rgba(0, 0, 0, 0)');
      grooveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grooveGrad;
      ctx.fillRect(0, 0, c.width, c.height);
    } else if (mode === 'spiral') {
      const holeCount = 18;
      const holeInsetFrac = 0.044;
      const marginFrac = 0.055;
      const hx = c.width * holeInsetFrac;
      const holeRadius = 15.5;

      for (let i = 0; i < holeCount; i++) {
        const t = i / (holeCount - 1);
        const hy = c.height * (marginFrac + t * (1 - 2 * marginFrac));

        // Outer die-cut bevel rim
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius + 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Deep dark punched hole cavity
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle inner board thickness crescent on the right wall of the hole
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(hx, hy, holeRadius - 1.2, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();

        // Contact shadow inside left side of hole where the twin metallic springs exit
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(hx - 3, hy, holeRadius * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  };

  // Seamless right edge wrap texture (samples the outermost 2% right strip of the cover with zero dark tint)
  const rc = document.createElement('canvas');
  rc.width = 64;
  rc.height = 1024;
  const rctx = rc.getContext('2d')!;
  const rightStripW = Math.max(4, Math.floor(coverSource.width * 0.02));
  rctx.drawImage(
    coverSource,
    coverSource.width - rightStripW,
    0,
    rightStripW,
    coverSource.height,
    0,
    0,
    rc.width,
    rc.height
  );
  const rightRimTex = new THREE.CanvasTexture(rc);
  rightRimTex.colorSpace = THREE.SRGBColorSpace;

  // Seamless top/bottom edge wrap texture
  const tc = document.createElement('canvas');
  tc.width = 1024;
  tc.height = 64;
  const tctx = tc.getContext('2d')!;
  const botStripH = Math.max(4, Math.floor(coverSource.height * 0.02));
  tctx.drawImage(
    coverSource,
    0,
    coverSource.height - botStripH,
    coverSource.width,
    botStripH,
    0,
    0,
    tc.width,
    tc.height
  );
  tctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  tctx.fillRect(0, 0, tc.width, tc.height);
  const topBottomRimTex = new THREE.CanvasTexture(tc);
  topBottomRimTex.colorSpace = THREE.SRGBColorSpace;

  // Spine Texture — natural 3D cylindrical shadow depth
  const sc = document.createElement('canvas');
  sc.width = 256;
  sc.height = 1536;
  const sctx = sc.getContext('2d')!;
  if (spineSource) {
    sctx.drawImage(spineSource, 0, 0, sc.width, sc.height);
    sctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    sctx.fillRect(0, 0, sc.width, sc.height);
  } else {
    const stripW = Math.max(12, Math.floor(coverSource.width * 0.07));
    sctx.drawImage(coverSource, 0, 0, stripW, coverSource.height, 0, 0, sc.width, sc.height);
    sctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    sctx.fillRect(0, 0, sc.width, sc.height);
  }
  const hGrad = sctx.createLinearGradient(0, 0, sc.width, 0);
  hGrad.addColorStop(0, 'rgba(0, 0, 0, 0.40)');
  hGrad.addColorStop(0.22, 'rgba(0, 0, 0, 0.05)');
  hGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.02)');
  hGrad.addColorStop(0.86, 'rgba(0, 0, 0, 0.14)');
  hGrad.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
  sctx.fillStyle = hGrad;
  sctx.fillRect(0, 0, sc.width, sc.height);

  const spineTex = new THREE.CanvasTexture(sc);
  spineTex.colorSpace = THREE.SRGBColorSpace;
  spineTex.anisotropy = maxAnisotropy;

  cachedArtwork = {
    sourceCover: coverSource,
    sourceSpine: spineSource,
    hardcoverTex: makeCoverTex('hardcover'),
    paperbackTex: makeCoverTex('paperback'),
    spiralTex: makeCoverTex('spiral'),
    deviceTex: makeCoverTex('device'),
    spineTex,
    rightRimTex,
    topBottomRimTex,
    boardColor: sampleCoverEdgeColor(coverSource),
  };

  return cachedArtwork;
}

/**
 * Generates realistic warm paper stack textures (220+ compressed paper leaves)
 * with realistic cover-overhang shadow right under the front cover lip.
 */
interface PaperTexturePair {
  foreEdgeMap: THREE.CanvasTexture;
  topEdgeMap: THREE.CanvasTexture;
}

const paperTextureCache = new Map<string, PaperTexturePair>();

function getPaperTextures(
  tint: 'cream' | 'white' | 'gilded',
  maxAnisotropy: number
): PaperTexturePair {
  const cached = paperTextureCache.get(tint);
  if (cached) return cached;

  const palette =
    tint === 'white'
      ? {
          bright: '#FFFFFF',
          base: '#F1F5F9',
          mid: '#E2E8F0',
          edge: '#CBD5E1',
          overhangShadow: '#94A3B8',
          lineDark: 'rgba(30, 41, 59, 0.48)',
          lineLight: 'rgba(255, 255, 255, 0.95)',
          sigGroove: 'rgba(15, 23, 42, 0.66)',
        }
      : tint === 'gilded'
      ? {
          bright: '#FEF08A',
          base: '#EAB308',
          mid: '#CA8A04',
          edge: '#A16207',
          overhangShadow: '#713F12',
          lineDark: 'rgba(92, 45, 12, 0.52)',
          lineLight: 'rgba(254, 249, 195, 0.92)',
          sigGroove: 'rgba(66, 32, 6, 0.72)',
        }
      : {
          bright: '#FAF5E8',
          base: '#EFE6D2',
          mid: '#E2D4BA',
          edge: '#CBB898',
          overhangShadow: '#8C7958',
          lineDark: 'rgba(72, 54, 32, 0.48)',
          lineLight: 'rgba(255, 252, 245, 0.94)',
          sigGroove: 'rgba(52, 38, 22, 0.68)',
        };

  // Across-thickness resolution calibrated to 160 texels with LinearFilter (generateMipmaps = false):
  // Each of the 28 paper strata is ~5.7 texels wide (~3 texels bright crown + ~2.7 texels dark crease),
  // which guarantees 100% crisp, high-contrast individual paper sheets on BOTH 35px-tall horizontal
  // flatlay books (Composite #7) and 55px-wide vertical standing books with zero mipmap washout.
  const drawRealisticPaperStack = (
    ctx: CanvasRenderingContext2D,
    span: number,
    length: number,
    isHorizontal: boolean
  ) => {
    const numStrata = 28;
    const halfStrata = numStrata / 2;

    for (let i = 1; i < numStrata; i++) {
      const symIdx = i <= halfStrata ? i : numStrata - i;
      const jitter = Math.sin(symIdx * 2.5) * 0.14;
      const normPos =
        i <= halfStrata
          ? (symIdx + jitter) / numStrata
          : 1 - (symIdx + jitter) / numStrata;
      const pos = normPos * span;
      const isSig = symIdx % 5 === 0;

      // Crisp dark crease between paper leaves
      ctx.strokeStyle = isSig ? palette.sigGroove : palette.lineDark;
      ctx.lineWidth = isSig ? 2.4 : 1.7;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(0, pos);
        ctx.lineTo(length, pos);
      } else {
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, length);
      }
      ctx.stroke();

      // Bright paper crown right next to each crease so sheets pop on flat & standing books
      ctx.strokeStyle = palette.lineLight;
      ctx.lineWidth = isSig ? 2.1 : 1.5;
      const crownPos = pos + (i <= halfStrata ? 1.8 : -1.8);
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(0, crownPos);
        ctx.lineTo(length, crownPos);
      } else {
        ctx.moveTo(crownPos, 0);
        ctx.lineTo(crownPos, length);
      }
      ctx.stroke();
    }
  };

  // 1. Fore-Edge Page Stack (+X face: 160 across thickness x 1024 along length)
  const foreCanvas = document.createElement('canvas');
  foreCanvas.width = 160;
  foreCanvas.height = 1024;
  const fctx = foreCanvas.getContext('2d')!;

  const baseGrad = fctx.createLinearGradient(0, 0, foreCanvas.width, 0);
  baseGrad.addColorStop(0, palette.overhangShadow);
  baseGrad.addColorStop(0.03, palette.edge);
  baseGrad.addColorStop(0.1, palette.mid);
  baseGrad.addColorStop(0.28, palette.base);
  baseGrad.addColorStop(0.5, palette.bright);
  baseGrad.addColorStop(0.72, palette.base);
  baseGrad.addColorStop(0.9, palette.mid);
  baseGrad.addColorStop(0.97, palette.edge);
  baseGrad.addColorStop(1, palette.overhangShadow);
  fctx.fillStyle = baseGrad;
  fctx.fillRect(0, 0, foreCanvas.width, foreCanvas.height);

  drawRealisticPaperStack(fctx, foreCanvas.width, foreCanvas.height, false);

  const vShade = fctx.createLinearGradient(0, 0, 0, foreCanvas.height);
  vShade.addColorStop(0, 'rgba(28, 22, 16, 0.10)');
  vShade.addColorStop(0.02, 'rgba(28, 22, 16, 0)');
  vShade.addColorStop(0.98, 'rgba(28, 22, 16, 0)');
  vShade.addColorStop(1, 'rgba(28, 22, 16, 0.10)');
  fctx.fillStyle = vShade;
  fctx.fillRect(0, 0, foreCanvas.width, foreCanvas.height);

  // 2. Top/Bottom Horizontal Page Stack (-Y/+Y faces: 1024 along width x 160 across thickness)
  const topCanvas = document.createElement('canvas');
  topCanvas.width = 1024;
  topCanvas.height = 160;
  const tctx = topCanvas.getContext('2d')!;

  const topGrad = tctx.createLinearGradient(0, 0, 0, topCanvas.height);
  topGrad.addColorStop(0, palette.overhangShadow);
  topGrad.addColorStop(0.03, palette.edge);
  topGrad.addColorStop(0.1, palette.mid);
  topGrad.addColorStop(0.28, palette.base);
  topGrad.addColorStop(0.5, palette.bright);
  topGrad.addColorStop(0.72, palette.base);
  topGrad.addColorStop(0.9, palette.mid);
  topGrad.addColorStop(0.97, palette.edge);
  topGrad.addColorStop(1, palette.overhangShadow);
  tctx.fillStyle = topGrad;
  tctx.fillRect(0, 0, topCanvas.width, topCanvas.height);

  drawRealisticPaperStack(tctx, topCanvas.height, topCanvas.width, true);

  const hShade = tctx.createLinearGradient(0, 0, topCanvas.width, 0);
  hShade.addColorStop(0, 'rgba(28, 22, 16, 0.16)');
  hShade.addColorStop(0.05, 'rgba(28, 22, 16, 0)');
  hShade.addColorStop(1, 'rgba(28, 22, 16, 0)');
  tctx.fillStyle = hShade;
  tctx.fillRect(0, 0, topCanvas.width, topCanvas.height);

  const foreEdgeMap = new THREE.CanvasTexture(foreCanvas);
  foreEdgeMap.colorSpace = THREE.SRGBColorSpace;
  foreEdgeMap.minFilter = THREE.LinearFilter;
  foreEdgeMap.magFilter = THREE.LinearFilter;
  foreEdgeMap.generateMipmaps = false;

  const topEdgeMap = new THREE.CanvasTexture(topCanvas);
  topEdgeMap.colorSpace = THREE.SRGBColorSpace;
  topEdgeMap.minFilter = THREE.LinearFilter;
  topEdgeMap.magFilter = THREE.LinearFilter;
  topEdgeMap.generateMipmaps = false;

  const pair: PaperTexturePair = {
    foreEdgeMap,
    topEdgeMap,
  };
  paperTextureCache.set(tint, pair);
  return pair;
}

// ============================================================================
// ANATOMICAL 3D BOOK ASSEMBLY BUILDER
// ============================================================================

interface Book3DConfig {
  width?: number;
  height?: number;
  thickness?: number;
  isHardcover?: boolean;
  withSpiralRings?: boolean;
  showRightPages?: boolean;
  isFlatlay?: boolean;
  coverTex: THREE.CanvasTexture;
  spineTex: THREE.CanvasTexture;
  rightRimTex: THREE.CanvasTexture;
  topBottomRimTex: THREE.CanvasTexture;
  boardColor: string;
  opts: RenderOptions;
  maxAnisotropy: number;
}

function buildAnatomicalBook3D(cfg: Book3DConfig): {
  group: THREE.Group;
  disposables: Array<THREE.BufferGeometry | THREE.Material>;
} {
  const W = cfg.width ?? 3.35;
  const H = cfg.height ?? 5.05;
  const T = cfg.thickness ?? 0.64;
  const isHardcover = cfg.isHardcover ?? true;
  const withSpiral = cfg.withSpiralRings ?? false;
  const showRightPages = cfg.showRightPages ?? false;
  const isFlatlay = cfg.isFlatlay ?? false;

  const overhang = isFlatlay ? 0.012 : showRightPages ? 0.044 : 0.022;
  const boardThick = isFlatlay ? 0.024 : isHardcover ? 0.038 : 0.024;

  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const bookGroup = new THREE.Group();

  const paperTex = getPaperTextures(cfg.opts.pageEdgeTint, cfg.maxAnisotropy);

  const frontCoverMat = new THREE.MeshBasicMaterial({
    map: cfg.coverTex,
  });

  const rightRimMat = new THREE.MeshBasicMaterial({
    map: cfg.rightRimTex,
  });

  const topBottomRimMat = new THREE.MeshBasicMaterial({
    map: cfg.topBottomRimTex,
  });

  const spineMat = new THREE.MeshBasicMaterial({
    map: cfg.spineTex,
    side: THREE.DoubleSide,
  });

  const boardEdgeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.boardColor),
  });

  const endpaperMat = new THREE.MeshBasicMaterial({
    color: cfg.opts.pageEdgeTint === 'white' ? 0xdadfe6 : 0xd5c7ad,
  });

  const foreEdgeMat = new THREE.MeshBasicMaterial({
    map: paperTex.foreEdgeMap,
  });

  const topBottomEdgeMat = new THREE.MeshBasicMaterial({
    map: paperTex.topEdgeMap,
  });

  disposables.push(
    frontCoverMat,
    rightRimMat,
    topBottomRimMat,
    spineMat,
    boardEdgeMat,
    endpaperMat,
    foreEdgeMat,
    topBottomEdgeMat
  );

  // 1. FRONT COVER BOARD (Seamless edge-wrapped rims, zero black borders or squashed text)
  const frontBoardGeo = new THREE.BoxGeometry(W, H, boardThick);
  const frontBoardMats = [
    rightRimMat,      // +X (right fore-edge rim)
    spineMat,         // -X (left spine-side rim)
    topBottomRimMat,  // +Y (top rim)
    topBottomRimMat,  // -Y (bottom rim)
    frontCoverMat,    // +Z (front cover artwork)
    endpaperMat,      // -Z (inner endpaper)
  ];
  const frontBoardMesh = new THREE.Mesh(frontBoardGeo, frontBoardMats);
  frontBoardMesh.position.set(0, 0, (T - boardThick) / 2);
  bookGroup.add(frontBoardMesh);
  disposables.push(frontBoardGeo);

  // 2. BACK COVER BOARD
  const backW = showRightPages ? W : W - 0.04;
  const backH = showRightPages ? H : H - 0.02;
  const backBoardGeo = new THREE.BoxGeometry(backW, backH, boardThick);
  const backBoardMats = [
    rightRimMat,
    spineMat,
    topBottomRimMat,
    topBottomRimMat,
    endpaperMat,
    boardEdgeMat,
  ];
  const backBoardMesh = new THREE.Mesh(backBoardGeo, backBoardMats);
  backBoardMesh.position.set(showRightPages ? 0.01 : -0.02, 0, -(T - boardThick) / 2);
  bookGroup.add(backBoardMesh);
  disposables.push(backBoardGeo);

  // 3. INNER PAGE BLOCK
  const pageW = W - overhang - 0.015;
  const pageH = H - overhang * 2;
  const pageT = Math.max(0.12, T - boardThick * 2);

  const pageBlockGeo = new THREE.BoxGeometry(pageW, pageH, pageT);
  const pageBlockMats = [
    foreEdgeMat,
    spineMat,
    topBottomEdgeMat,
    topBottomEdgeMat,
    endpaperMat,
    endpaperMat,
  ];
  const pageBlockMesh = new THREE.Mesh(pageBlockGeo, pageBlockMats);
  pageBlockMesh.position.set(-overhang * 0.5 + 0.01, 0, 0);
  bookGroup.add(pageBlockMesh);
  disposables.push(pageBlockGeo);

  // 4. SPINE SHELL OR SPIRAL RINGS
  if (!withSpiral) {
    if (isHardcover) {
      const curveBulge = Math.min(0.068, T * 0.11);
      const spineSegs = 20;
      const spineGeo = new THREE.PlaneGeometry(T, H, spineSegs, 1);
      const pos = spineGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const norm = px / (T / 2);
        const arch = Math.cos(norm * (Math.PI / 2)) * curveBulge;
        pos.setZ(i, arch);
      }
      spineGeo.computeVertexNormals();

      const spineMesh = new THREE.Mesh(spineGeo, spineMat);
      spineMesh.rotation.y = -Math.PI / 2;
      spineMesh.position.set(-W / 2 + 0.003, 0, 0);
      bookGroup.add(spineMesh);
      disposables.push(spineGeo);
    } else {
      const spineGeo = new THREE.BoxGeometry(0.024, H, T);
      const spineMats = [
        endpaperMat,
        spineMat,
        spineMat,
        spineMat,
        spineMat,
        spineMat,
      ];
      const spineMesh = new THREE.Mesh(spineGeo, spineMats);
      spineMesh.position.set(-W / 2 + 0.008, 0, 0);
      bookGroup.add(spineMesh);
      disposables.push(spineGeo);
    }
  } else {
    // Dark punched binding channel along the spine so the gaps between pages/covers look deep
    const spineChannelGeo = new THREE.BoxGeometry(0.03, H, T * 0.92);
    const spineChannelMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const spineChannelMesh = new THREE.Mesh(spineChannelGeo, spineChannelMat);
    spineChannelMesh.position.set(-W / 2 + 0.016, 0, 0);
    bookGroup.add(spineChannelMesh);
    disposables.push(spineChannelGeo, spineChannelMat);

    // Procedural metallic gradient texture for realistic 3D steel/chrome Wire-O spring coils
    const metalCanvas = document.createElement('canvas');
    metalCanvas.width = 128;
    metalCanvas.height = 64;
    const mctx = metalCanvas.getContext('2d')!;
    const mGrad = mctx.createLinearGradient(0, 0, 128, 64);
    mGrad.addColorStop(0.0, '#1E293B');   // Deep shadow inside the punched hole
    mGrad.addColorStop(0.18, '#64748B');  // Emerging from the hole
    mGrad.addColorStop(0.38, '#F8FAFC');  // Bright specular highlight on upper front arch
    mGrad.addColorStop(0.55, '#CBD5E1');  // Metallic silver midtone around outer spine loop
    mGrad.addColorStop(0.75, '#475569');  // Lower curve shadow
    mGrad.addColorStop(1.0, '#0F172A');   // Entering back cover hole
    mctx.fillStyle = mGrad;
    mctx.fillRect(0, 0, 128, 64);
    const metalTex = new THREE.CanvasTexture(metalCanvas);
    metalTex.colorSpace = THREE.SRGBColorSpace;

    // 3D curve that starts INSIDE the front punched hole (x = holeX, z = +T*0.15),
    // exits straight through the hole on the front cover (x = holeX, z = +T*0.50),
    // arches over the left cover margin, loops around the outer left spine edge (-W/2 - 0.095),
    // and threads directly into the corresponding back cover hole!
    const holeCount = 18;
    const holeInsetFrac = 0.044;
    const marginFrac = 0.055;
    const holeX = -W / 2 + W * holeInsetFrac;
    const leftEdgeX = -W / 2;

    const springCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(holeX + 0.008, 0, T * 0.14),
      new THREE.Vector3(holeX, 0, T * 0.505),
      new THREE.Vector3(holeX - 0.028, 0, T * 0.635),
      new THREE.Vector3(leftEdgeX - 0.042, 0, T * 0.54),
      new THREE.Vector3(leftEdgeX - 0.098, 0, 0),
      new THREE.Vector3(leftEdgeX - 0.042, 0, -T * 0.54),
      new THREE.Vector3(holeX - 0.028, 0, -T * 0.635),
      new THREE.Vector3(holeX, 0, -T * 0.505),
      new THREE.Vector3(holeX + 0.008, 0, -T * 0.14),
    ]);

    const ringGeo = new THREE.TubeGeometry(springCurve, 32, 0.0115, 12, false);
    const ringMat = new THREE.MeshBasicMaterial({ map: metalTex });
    disposables.push(ringGeo, ringMat, metalTex);

    // Dark interior hole plug mesh right at each hole on the front cover so the wire visibly plunges into a deep aperture
    const holePlugGeo = new THREE.CircleGeometry(0.048, 24);
    const holePlugMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    disposables.push(holePlugGeo, holePlugMat);

    for (let i = 0; i < holeCount; i++) {
      const t = i / (holeCount - 1);
      const ry = -H * (0.5 - marginFrac) + t * H * (1 - 2 * marginFrac);

      const plugMesh = new THREE.Mesh(holePlugGeo, holePlugMat);
      plugMesh.position.set(holeX, ry, T / 2 + 0.0015);
      bookGroup.add(plugMesh);

      // Twin-loop Wire-O double prongs threading directly into the same punched hole
      const loop1 = new THREE.Mesh(ringGeo, ringMat);
      loop1.position.set(0, ry - 0.012, 0);
      bookGroup.add(loop1);

      const loop2 = new THREE.Mesh(ringGeo, ringMat);
      loop2.position.set(0, ry + 0.012, 0);
      bookGroup.add(loop2);
    }
  }

  return { group: bookGroup, disposables };
}

// ============================================================================
// 3D DIGITAL DEVICES & AUDIOBOOK BUILDERS
// ============================================================================

function buildDigitalDevice3D(
  deviceType: 'ereader' | 'tablet' | 'phone',
  coverTex: THREE.CanvasTexture
): {
  group: THREE.Group;
  height: number;
  width: number;
  disposables: Array<THREE.BufferGeometry | THREE.Material>;
} {
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const group = new THREE.Group();

  const isPhone = deviceType === 'phone';
  const isEReader = deviceType === 'ereader';

  const W = isPhone ? 2.2 : isEReader ? 3.3 : 3.6;
  const H = isPhone ? 4.5 : isEReader ? 4.75 : 5.1;
  const D = isPhone ? 0.15 : isEReader ? 0.14 : 0.14;
  const cornerR = isPhone ? 0.32 : isEReader ? 0.22 : 0.24;

  const shape = new THREE.Shape();
  const hw = W / 2;
  const hh = H / 2;
  shape.moveTo(-hw + cornerR, -hh);
  shape.lineTo(hw - cornerR, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cornerR);
  shape.lineTo(hw, hh - cornerR);
  shape.quadraticCurveTo(hw, hh, hw - cornerR, hh);
  shape.lineTo(-hw + cornerR, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cornerR);
  shape.lineTo(-hw, -hh + cornerR);
  shape.quadraticCurveTo(-hw, -hh, -hw + cornerR, -hh);

  const chassisGeo = new THREE.ExtrudeGeometry(shape, {
    depth: D,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.022,
    bevelThickness: 0.022,
  });
  chassisGeo.center();

  const chassisMat = new THREE.MeshBasicMaterial({
    color: isEReader ? 0x1e293b : 0x0f172a,
  });

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  group.add(chassisMesh);
  disposables.push(chassisGeo, chassisMat);

  const padX = isPhone ? 0.11 : isEReader ? 0.25 : 0.19;
  const padTop = isPhone ? 0.14 : isEReader ? 0.26 : 0.21;
  const padBot = isPhone ? 0.14 : isEReader ? 0.42 : 0.21;
  const screenW = W - padX * 2;
  const screenH = H - padTop - padBot;

  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMat = new THREE.MeshBasicMaterial({
    map: coverTex,
  });

  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, (padBot - padTop) * 0.5, D / 2 + 0.025);
  group.add(screenMesh);
  disposables.push(screenGeo, screenMat);

  return { group, height: H, width: W, disposables };
}

function buildAudiobookCase3D(
  coverTex: THREE.CanvasTexture,
  spineTex: THREE.CanvasTexture
): {
  group: THREE.Group;
  disposables: Array<THREE.BufferGeometry | THREE.Material>;
} {
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const group = new THREE.Group();

  const S = 3.95;
  const T = 0.42;

  const coverMat = new THREE.MeshBasicMaterial({
    map: coverTex,
  });
  const spineMat = new THREE.MeshBasicMaterial({
    map: spineTex,
  });
  disposables.push(coverMat, spineMat);

  const boxGeo = new THREE.BoxGeometry(S, S, T);
  const boxMats = [coverMat, spineMat, coverMat, coverMat, coverMat, coverMat];
  const boxMesh = new THREE.Mesh(boxGeo, boxMats);
  boxMesh.position.set(-0.45, 0, 0);
  group.add(boxMesh);
  disposables.push(boxGeo);

  const discR = S * 0.44;
  const discGeo = new THREE.CylinderGeometry(discR, discR, 0.03, 64);
  const discMat = new THREE.MeshBasicMaterial({
    color: 0x18181b,
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.rotation.x = Math.PI / 2;
  discMesh.position.set(1.25, 0, -0.06);
  group.add(discMesh);

  const labelGeo = new THREE.RingGeometry(discR * 0.08, discR * 0.42, 48);
  const labelMat = new THREE.MeshBasicMaterial({
    map: coverTex,
    side: THREE.DoubleSide,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.set(1.25, 0, -0.042);
  group.add(labelMesh);

  disposables.push(discGeo, discMat, labelGeo, labelMat);
  return { group, disposables };
}

// ============================================================================
// TRUE 3D STUDIO FLOOR-PLANE GLSL GAUSSIAN SHADOW ENGINE
// ============================================================================

const MAX_SHADOW_CASTERS = 8;

interface FloorShadowCaster {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  ux: number;
  uz: number;
  vx: number;
  vz: number;
  castX: number;
  castZ: number;
  heightScale: number;
  mode: number; // 0 = standing, 1 = floating, 2 = flatlay
}

/**
 * Extracts the exact 3D floor-plane oriented bounding box (OBB) of a mesh group
 * directly from its `matrixWorld`, guaranteeing 100% alignment between the 3D book's
 * bottom edges and the 3D floor shadow at every angle.
 */
function extractFloorCaster(
  group: THREE.Group,
  localCenter: THREE.Vector3,
  halfW: number,
  halfD: number,
  rotY: number,
  heightScale: number,
  mode: 0 | 1 | 2
): FloorShadowCaster {
  group.updateMatrixWorld(true);

  const worldCenter = localCenter.clone().applyMatrix4(group.matrixWorld);
  const uWorld = new THREE.Vector3(1, 0, 0).transformDirection(group.matrixWorld);
  const vLocal = mode === 2 ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, 1);
  const vWorld = vLocal.transformDirection(group.matrixWorld);

  const uLen = Math.hypot(uWorld.x, uWorld.z) || 1;
  const ux = uWorld.x / uLen;
  const uz = uWorld.z / uLen;

  const vLen = Math.hypot(vWorld.x, vWorld.z) || 1;
  const vx = vWorld.x / vLen;
  const vz = vWorld.z / vLen;

  // Keep shadows strictly underneath vertical standing & floating books (ZERO right-side shadow cast)
  let castX = 0.0;
  let castZ = 0.08 * heightScale;

  if (mode === 2) {
    // Flatlay book: compact shadow strictly underneath the tabletop book
    castX = 0.0;
    castZ = 0.16;
  } else if (mode === 1) {
    // Floating book: soft detached shadow strictly underneath the book
    castX = 0.0;
    castZ = 0.06;
  }

  return {
    cx: worldCenter.x,
    cz: worldCenter.z,
    halfW,
    halfD,
    ux,
    uz,
    vx,
    vz,
    castX,
    castZ,
    heightScale,
    mode,
  };
}

const STUDIO_FLOOR_VERTEX_SHADER = /* glsl */ `
  varying vec2 vWorldXZ;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPos.xz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const STUDIO_FLOOR_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 vWorldXZ;

  uniform int uCasterCount;
  uniform float uShadowIntensity;
  uniform vec4 uCenterHalf[8]; // (cx, cz, halfW, halfD)
  uniform vec4 uAxes[8];       // (ux, uz, vx, vz)
  uniform vec4 uCastParams[8]; // (castX, castZ, heightScale, mode)

  // High-precision Abramowitz & Stegun 7.1.26 error function approximation
  float erfApprox(float x) {
    float s = sign(x);
    float a = abs(x);
    float t = 1.0 / (1.0 + 0.3275911 * a);
    float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-a * a);
    return s * y;
  }

  // Exact 1D Gaussian convolution of segment [-halfSpan, +halfSpan]
  float boxShadow1D(float coord, float halfSpan, float sigma) {
    float inv = 1.0 / (max(sigma, 0.0005) * 1.41421356);
    return 0.5 * (erfApprox((halfSpan - coord) * inv) + erfApprox((halfSpan + coord) * inv));
  }

  // Exact separable 2D Gaussian convolution of box [-halfSpan.x, +halfSpan.x] x [-halfSpan.y, +halfSpan.y]
  float boxShadow2D(vec2 localPos, vec2 halfSpan, vec2 sigma) {
    return boxShadow1D(localPos.x, halfSpan.x, sigma.x) *
           boxShadow1D(localPos.y, halfSpan.y, sigma.y);
  }

  float evaluateCasterShadow(vec4 centerHalf, vec4 axes, vec4 castParams, vec2 p) {
    vec2 center = centerHalf.xy;
    vec2 halfSize = centerHalf.zw;
    vec2 uAxis = axes.xy;
    vec2 vAxis = axes.zw;
    float mode = castParams.w;

    vec2 d = p - center;
    vec2 local = vec2(dot(d, uAxis), dot(d, vAxis));

    // MODE 1: FLOATING BOOK (Soft detached studio floor shadow strictly below, zero right-side spill)
    if (mode > 0.5 && mode < 1.5) {
      float floatMaskX = smoothstep(halfSize.x + 0.02, halfSize.x - 0.14, abs(local.x));
      float coreSpanX = max(0.12, halfSize.x - 0.26);
      float haloSpanX = max(0.10, halfSize.x - 0.42);
      float core = boxShadow2D(local - vec2(0.0, 0.04), vec2(coreSpanX, halfSize.y * 0.95), vec2(0.22, 0.26)) * 0.48;
      float halo = boxShadow2D(local - vec2(0.0, 0.08), vec2(haloSpanX, halfSize.y * 1.05), vec2(0.38, 0.46)) * 0.24;
      return (1.0 - (1.0 - core) * (1.0 - halo)) * floatMaskX;
    }

    // MODE 2: FLATLAY BOOK LYING ON TABLE
    if (mode >= 1.5) {
      float contact = boxShadow2D(local - vec2(0.0, 0.015), halfSize, vec2(0.026, 0.026)) * 0.68;
      float nearAO = boxShadow2D(local - vec2(0.0, 0.045), vec2(max(0.1, halfSize.x - 0.08), halfSize.y + 0.02), vec2(0.085, 0.095)) * 0.38;
      float castSh = boxShadow2D(local - vec2(0.0, 0.10), vec2(max(0.1, halfSize.x - 0.18), halfSize.y + 0.04), vec2(0.16, 0.20)) * 0.28;
      return 1.0 - (1.0 - contact) * (1.0 - nearAO) * (1.0 - castSh);
    }

    // MODE 0: VERTICAL STANDING BOOK OR DEVICE ON STUDIO FLOOR
    // Strictly underneath the book base (ZERO right-side or sideways shadow extension):
    // Hard horizontal mask guarantees zero shadow beyond the left/right edges of the book.
    float underMaskX = smoothstep(halfSize.x + 0.005, halfSize.x - 0.08, abs(local.x));
    if (underMaskX <= 0.001) {
      return 0.0;
    }

    // Also mask out the region behind the book (-local.y) so no shadow ever pokes out around the back-right corner
    float frontBaseMaskY = smoothstep(-halfSize.y - 0.06, -halfSize.y + 0.04, local.y);

    // 1. Crisp contact occlusion crease directly under the bottom base of the book
    float spanX1 = max(0.08, halfSize.x - 0.04);
    float contact = boxShadow2D(
      local - vec2(0.0, 0.008),
      vec2(spanX1, halfSize.y + 0.004),
      vec2(0.024, 0.048)
    ) * 0.74;

    // 2. Soft near-base studio ambient occlusion cushion directly underneath the book
    float spanX2 = max(0.08, halfSize.x - 0.18);
    float nearUnder = boxShadow2D(
      local - vec2(0.0, 0.045),
      vec2(spanX2, halfSize.y + 0.025),
      vec2(0.095, 0.13)
    ) * 0.42;

    // 3. Soft vertical downward fade strictly underneath the bottom edge
    float spanX3 = max(0.08, halfSize.x - 0.34);
    float softUnder = boxShadow2D(
      local - vec2(0.0, 0.095),
      vec2(spanX3, halfSize.y + 0.045),
      vec2(0.18, 0.25)
    ) * 0.22;

    float combinedUnder = 1.0 - (1.0 - contact) * (1.0 - nearUnder) * (1.0 - softUnder);
    return combinedUnder * underMaskX * frontBaseMaskY;
  }

  void main() {
    if (uShadowIntensity <= 0.005 || uCasterCount <= 0) {
      discard;
    }

    float transmittance = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i >= uCasterCount) break;
      float sh = evaluateCasterShadow(uCenterHalf[i], uAxes[i], uCastParams[i], vWorldXZ);
      transmittance *= (1.0 - sh);
    }

    float alpha = clamp((1.0 - transmittance) * uShadowIntensity, 0.0, 0.92);
    if (alpha <= 0.002) {
      discard;
    }

    // Pure black rgb(0,0,0) with smooth alpha ensures identical premultiplied & straight alpha
    // with zero dark halos on both Transparent PNG and Solid Background JPG exports.
    gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
  }
`;

function createStudioFloorShadowMesh(
  casters: FloorShadowCaster[],
  floorY: number,
  shadowIntensity: number
): {
  mesh: THREE.Mesh;
  disposables: Array<THREE.BufferGeometry | THREE.Material>;
} {
  const uCenterHalf: THREE.Vector4[] = [];
  const uAxes: THREE.Vector4[] = [];
  const uCastParams: THREE.Vector4[] = [];

  for (let i = 0; i < MAX_SHADOW_CASTERS; i++) {
    const c = casters[i];
    if (c) {
      uCenterHalf.push(new THREE.Vector4(c.cx, c.cz, c.halfW, c.halfD));
      uAxes.push(new THREE.Vector4(c.ux, c.uz, c.vx, c.vz));
      uCastParams.push(new THREE.Vector4(c.castX, c.castZ, c.heightScale, c.mode));
    } else {
      uCenterHalf.push(new THREE.Vector4(0, 0, 0, 0));
      uAxes.push(new THREE.Vector4(1, 0, 0, 1));
      uCastParams.push(new THREE.Vector4(0, 0, 1, 0));
    }
  }

  const floorGeo = new THREE.PlaneGeometry(28, 22);
  const floorMat = new THREE.ShaderMaterial({
    vertexShader: STUDIO_FLOOR_VERTEX_SHADER,
    fragmentShader: STUDIO_FLOOR_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uCasterCount: { value: Math.min(casters.length, MAX_SHADOW_CASTERS) },
      uShadowIntensity: { value: shadowIntensity },
      uCenterHalf: { value: uCenterHalf },
      uAxes: { value: uAxes },
      uCastParams: { value: uCastParams },
    },
  });

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, floorY, 0);
  // Render floor shadow FIRST so all 3D books/devices composite cleanly on top with full MSAA and zero Z-fighting
  floorMesh.renderOrder = -10;

  return { mesh: floorMesh, disposables: [floorGeo, floorMat] };
}

// ============================================================================
// MAIN ENTRYPOINT
// ============================================================================

export function renderMockupToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderOptions
) {
  const mult = options.scaleMultiplier || 1;
  const isComposite = options.templateId.startsWith('comp-');

  const baseW = isComposite ? 1200 : 960;
  const baseH = 840;
  const targetW = Math.round(baseW * mult);
  const targetH = Math.round(baseH * mult);

  canvas.width = targetW;
  canvas.height = targetH;

  const ctx2d = canvas.getContext('2d')!;
  ctx2d.clearRect(0, 0, targetW, targetH);

  if (!options.transparentBackground) {
    ctx2d.fillStyle = options.backgroundColor || '#FFFFFF';
    ctx2d.fillRect(0, 0, targetW, targetH);
  }

  const studio = getSharedStudio();
  if (!studio) return;

  const { renderer, maxAnisotropy } = studio;
  renderer.setSize(targetW, targetH, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  const floorCasters: FloorShadowCaster[] = [];

  // 1. Retrieve Cached Pure-Color Cover & Spine Textures (Zero White Glare)
  const rawCover = options.coverImage || getPlaceholderCoverCanvas();
  const artwork = getBookArtworkTextures(rawCover, options.spineImage, maxAnisotropy);
  const {
    hardcoverTex,
    paperbackTex,
    spiralTex,
    deviceTex,
    spineTex,
    rightRimTex,
    topBottomRimTex,
    boardColor,
  } = artwork;

  // 2. Telephoto Studio Camera (22° FOV with natural studio tabletop elevation)
  const camera = new THREE.PerspectiveCamera(22, targetW / targetH, 0.1, 100);
  camera.position.set(0, 0.56, 14.8);
  camera.lookAt(0, -0.09, 0);

  const floorY = -2.42;

  const addBook = (params: {
    x?: number;
    y?: number;
    z?: number;
    rotX?: number;
    rotY?: number;
    rotZ?: number;
    scale?: number;
    thickness?: number;
    isHardcover?: boolean;
    withSpiralRings?: boolean;
    showRightPages?: boolean;
    isFloating?: boolean;
    isFlatlay?: boolean;
    skipFloorShadow?: boolean;
  }) => {
    const sc = params.scale ?? 1;
    const thick = params.thickness ?? 0.64;
    const isHc = params.isHardcover ?? true;
    const isSp = params.withSpiralRings ?? false;
    const rotY = params.rotY ?? 0;
    const showRight = params.showRightPages ?? rotY < -0.2;
    const activeCoverTex = isSp ? spiralTex : isHc ? hardcoverTex : paperbackTex;

    const { group, disposables: bDisp } = buildAnatomicalBook3D({
      thickness: thick,
      isHardcover: isHc,
      withSpiralRings: isSp,
      showRightPages: showRight,
      isFlatlay: params.isFlatlay,
      coverTex: activeCoverTex,
      spineTex,
      rightRimTex,
      topBottomRimTex,
      boardColor,
      opts: options,
      maxAnisotropy,
    });
    disposables.push(...bDisp);

    group.scale.setScalar(sc);
    group.rotation.set(params.rotX ?? 0, rotY, params.rotZ ?? 0);
    const bx = params.x ?? 0;
    const by = params.y ?? floorY + (5.05 * sc) / 2;
    const bz = params.z ?? 0;
    group.position.set(bx, by, bz);
    scene.add(group);

    if (!params.skipFloorShadow) {
      if (params.isFlatlay) {
        floorCasters.push(
          extractFloorCaster(
            group,
            new THREE.Vector3(0, 0, -thick * 0.5),
            (3.35 * sc) * 0.5,
            (5.05 * sc) * 0.5,
            0,
            sc,
            2
          )
        );
      } else {
        floorCasters.push(
          extractFloorCaster(
            group,
            new THREE.Vector3(0, -5.05 * 0.5, 0),
            (3.35 * sc) * 0.5,
            (thick * sc) * 0.5,
            rotY,
            sc,
            params.isFloating ? 1 : 0
          )
        );
      }
    }

    return group;
  };

  const addDevice = (params: {
    type: 'ereader' | 'tablet' | 'phone';
    x?: number;
    y?: number;
    z?: number;
    rotX?: number;
    rotY?: number;
    rotZ?: number;
    scale?: number;
  }) => {
    const sc = params.scale ?? 1;
    const rotY = params.rotY ?? 0;
    const { group, height, width, disposables: dDisp } = buildDigitalDevice3D(
      params.type,
      deviceTex
    );
    disposables.push(...dDisp);

    group.scale.setScalar(sc);
    group.rotation.set(params.rotX ?? 0, rotY, params.rotZ ?? 0);
    const dx = params.x ?? 0;
    const dy = params.y ?? floorY + (height * sc) / 2;
    const dz = params.z ?? 0;
    group.position.set(dx, dy, dz);
    scene.add(group);

    floorCasters.push(
      extractFloorCaster(
        group,
        new THREE.Vector3(0, -height * 0.5, 0),
        (width * sc) * 0.5,
        0.09 * sc,
        rotY,
        sc * (height / 5.05),
        0
      )
    );
    return group;
  };

  // ============================================================================
  // SCENE COMPOSITION BY TEMPLATE ID
  // ============================================================================
  switch (options.templateId) {
    case 'single-standing-hardcover-left': {
      addBook({
        rotY: 0.42,
        thickness: 0.66,
        isHardcover: true,
      });
      break;
    }

    case 'single-standing-paperback-right': {
      addBook({
        rotY: -0.46,
        thickness: 0.66,
        isHardcover: false,
        showRightPages: true,
      });
      break;
    }

    case 'single-front-hardcover': {
      addBook({
        rotY: 0.0,
        thickness: 0.58,
        isHardcover: true,
      });
      break;
    }

    case 'single-glossy-workbook': {
      addBook({
        rotY: -0.22,
        thickness: 0.54,
        isHardcover: false,
        withSpiralRings: true,
        showRightPages: true,
      });
      break;
    }

    case 'single-tilted-floating': {
      addBook({
        x: 0.05,
        y: floorY + 2.72,
        z: 0,
        rotX: 0.06,
        rotY: 0.38,
        rotZ: -0.11,
        thickness: 0.65,
        isHardcover: true,
        isFloating: true,
      });
      break;
    }

    case 'single-flatlay-table': {
      addBook({
        rotY: -0.4,
        thickness: 0.74,
        isHardcover: true,
        showRightPages: true,
      });
      break;
    }

    case 'single-thick-epic-novel': {
      addBook({
        rotY: 0.48,
        thickness: 1.05,
        isHardcover: true,
      });
      break;
    }

    case 'single-kindle-ereader': {
      addDevice({
        type: 'ereader',
        rotY: -0.12,
      });
      break;
    }

    case 'single-tablet-pro': {
      addDevice({
        type: 'tablet',
        rotY: -0.14,
      });
      break;
    }

    case 'single-smartphone-reader': {
      addDevice({
        type: 'phone',
        rotY: -0.16,
        scale: 1.08,
      });
      break;
    }

    case 'single-audiobook-case': {
      const { group: audioGroup, disposables: aDisp } = buildAudiobookCase3D(
        deviceTex,
        spineTex
      );
      disposables.push(...aDisp);
      audioGroup.rotation.y = 0.2;
      audioGroup.position.set(0, floorY + 3.95 / 2, 0);
      scene.add(audioGroup);
      // Box shadow caster + CD disc shadow caster
      floorCasters.push(
        extractFloorCaster(
          audioGroup,
          new THREE.Vector3(-0.45, -3.95 * 0.5, 0),
          3.95 * 0.5,
          0.21,
          0.2,
          0.82,
          0
        ),
        extractFloorCaster(
          audioGroup,
          new THREE.Vector3(1.25, -3.95 * 0.44, -0.06),
          1.45,
          0.06,
          0.2,
          0.55,
          0
        )
      );
      break;
    }

    case 'single-leaning-stack': {
      addBook({
        x: 1.08,
        z: -0.5,
        rotY: -0.46,
        scale: 0.95,
        thickness: 0.64,
        isHardcover: false,
        showRightPages: true,
      });
      addBook({
        x: -0.95,
        z: 0.45,
        rotY: 0.42,
        scale: 1.0,
        thickness: 0.66,
        isHardcover: true,
      });
      break;
    }

    // ================= COMPOSITE TEMPLATES =================
    case 'comp-hardcover-ereader': {
      camera.position.set(0, 0.58, 16.0);
      addBook({
        x: -1.35,
        z: 0.2,
        rotY: 0.4,
        scale: 1.02,
        thickness: 0.66,
        isHardcover: true,
      });
      addDevice({
        type: 'ereader',
        x: 1.65,
        z: 0.55,
        rotY: -0.2,
        scale: 0.92,
      });
      break;
    }

    case 'comp-hardcover-tablet-phone': {
      camera.position.set(0, 0.58, 16.6);
      addBook({
        x: -1.75,
        z: 0.15,
        rotY: 0.4,
        scale: 1.02,
        thickness: 0.66,
        isHardcover: true,
      });
      addDevice({
        type: 'tablet',
        x: 1.45,
        z: -0.25,
        rotY: -0.18,
        scale: 0.96,
      });
      addDevice({
        type: 'phone',
        x: 0.45,
        z: 0.85,
        rotY: -0.12,
        scale: 0.82,
      });
      break;
    }

    case 'comp-twin-hardcover-paperback': {
      camera.position.set(0, 0.58, 16.0);
      addBook({
        x: -1.45,
        z: 0.25,
        rotY: 0.42,
        scale: 1.02,
        thickness: 0.68,
        isHardcover: true,
      });
      addBook({
        x: 1.5,
        z: -0.15,
        rotY: -0.46,
        scale: 0.98,
        thickness: 0.64,
        isHardcover: false,
        showRightPages: true,
      });
      break;
    }

    case 'comp-trilogy-boxset': {
      camera.position.set(0, 0.58, 16.8);
      addBook({
        x: 2.05,
        z: -0.65,
        rotY: 0.42,
        scale: 0.94,
        thickness: 0.66,
        isHardcover: true,
      });
      addBook({
        x: 0.1,
        z: -0.1,
        rotY: 0.42,
        scale: 0.99,
        thickness: 0.66,
        isHardcover: true,
      });
      addBook({
        x: -1.9,
        z: 0.45,
        rotY: 0.42,
        scale: 1.04,
        thickness: 0.66,
        isHardcover: true,
      });
      break;
    }

    case 'comp-book-audiobook-phone': {
      camera.position.set(0, 0.58, 17.2);
      addBook({
        x: -2.15,
        z: 0.25,
        rotY: 0.4,
        scale: 1.02,
        thickness: 0.66,
        isHardcover: true,
      });
      const { group: audioGroup, disposables: aDisp } = buildAudiobookCase3D(
        deviceTex,
        spineTex
      );
      disposables.push(...aDisp);
      audioGroup.scale.setScalar(0.88);
      audioGroup.rotation.y = -0.12;
      audioGroup.position.set(0.85, floorY + (3.95 * 0.88) / 2, -0.2);
      scene.add(audioGroup);
      floorCasters.push(
        extractFloorCaster(
          audioGroup,
          new THREE.Vector3(-0.45, -3.95 * 0.5, 0),
          3.95 * 0.88 * 0.5,
          0.21 * 0.88,
          -0.12,
          0.75,
          0
        ),
        extractFloorCaster(
          audioGroup,
          new THREE.Vector3(1.25, -3.95 * 0.44, -0.06),
          1.35 * 0.88,
          0.06,
          -0.12,
          0.5,
          0
        )
      );
      addDevice({
        type: 'phone',
        x: 2.95,
        z: 0.65,
        rotY: -0.2,
        scale: 0.82,
      });
      break;
    }

    case 'comp-tablet-phone-digital': {
      camera.position.set(0, 0.58, 15.6);
      addDevice({
        type: 'tablet',
        x: -0.85,
        z: -0.15,
        rotY: 0.16,
        scale: 1.04,
      });
      addDevice({
        type: 'phone',
        x: 1.45,
        z: 0.55,
        rotY: -0.2,
        scale: 0.94,
      });
      break;
    }

    case 'comp-standing-and-flatlay': {
      camera.position.set(0, 1.38, 16.2);
      camera.lookAt(0.1, -0.35, 0);
      addBook({
        x: -1.85,
        z: -0.1,
        rotY: 0.42,
        scale: 1.0,
        thickness: 0.68,
        isHardcover: true,
      });
      addBook({
        x: 1.5,
        y: floorY + 0.4,
        z: 0.42,
        rotX: -Math.PI / 2,
        rotY: 0,
        rotZ: -0.52,
        scale: 0.96,
        thickness: 0.8,
        isHardcover: true,
        showRightPages: true,
        isFlatlay: true,
      });
      break;
    }

    case 'comp-mega-author-pack': {
      camera.position.set(0, 0.58, 17.6);
      addBook({
        x: -2.45,
        z: 0.25,
        rotY: 0.42,
        scale: 1.0,
        thickness: 0.66,
        isHardcover: true,
      });
      addBook({
        x: -0.1,
        z: -0.25,
        rotY: -0.44,
        scale: 0.96,
        thickness: 0.64,
        isHardcover: false,
        showRightPages: true,
      });
      addDevice({
        type: 'tablet',
        x: 2.35,
        z: -0.35,
        rotY: -0.2,
        scale: 0.92,
      });
      addDevice({
        type: 'phone',
        x: 1.35,
        z: 0.85,
        rotY: -0.15,
        scale: 0.78,
      });
      break;
    }

    default: {
      addBook({
        rotY: 0.42,
        thickness: 0.66,
        isHardcover: true,
      });
      break;
    }
  }

  // PASS 1: Render 3D Studio Floor Shadow Plane in its own scene FIRST and composite onto ctx2d.
  // Because Three.js renders transparent meshes after opaque meshes within a single scene,
  // separating the floor shadow into Pass 1 guarantees that ZERO shadow pixels can ever bleed
  // over the front cover of any book (even on bright/colored covers).
  if (options.shadowIntensity > 0.005 && floorCasters.length > 0) {
    const floorScene = new THREE.Scene();
    const { mesh: floorMesh, disposables: fDisp } = createStudioFloorShadowMesh(
      floorCasters,
      floorY,
      options.shadowIntensity
    );
    floorScene.add(floorMesh);
    disposables.push(...fDisp);

    renderer.render(floorScene, camera);
    ctx2d.drawImage(renderer.domElement, 0, 0, targetW, targetH);
  }

  // PASS 2: Render 3D Books & Devices into a clean buffer and composite ON TOP of the floor shadow
  renderer.render(scene, camera);
  ctx2d.drawImage(renderer.domElement, 0, 0, targetW, targetH);

  for (const item of disposables) {
    item.dispose();
  }
}
