import { asset } from '../assets';
import { VIEW_H } from '../core/config';
import type { Prop, StageDef, Theme } from '../core/levels';
import type { Terrain } from '../core/terrain';
import { createRng } from '../core/rng';

/**
 * Painted, procedurally generated scenery for each theme: sky, parallax
 * silhouettes, props, ground, water and weather.
 */

interface Palette {
  sky: [number, string][];
  celestial: { x: number; y: number; r: number; color: string; glow: string };
  layers: { color: string; factor: number; base: number; amp: number; kind: 'mesa' | 'dune' | 'hills' | 'trees' | 'reeds' | 'cypress' | 'ruins' }[];
  haze: string;
  groundTop: string;
  groundA: string;
  groundB: string;
  groundEdge: string;
  platTop: string;
  platBody: string;
  ambient: 'sand' | 'rain' | 'petals';
  grade: string; // full-screen color wash
  water?: { top: string; deep: string; shine: string };
}

const PALETTES: Record<string, Palette> = {
  desert: {
    sky: [[0, '#f29e5c'], [0.42, '#f8c784'], [0.75, '#fde3b5'], [1, '#fff1d6']],
    celestial: { x: 0.72, y: 0.5, r: 58, color: '#fff7dc', glow: 'rgba(255, 205, 130, 0.55)' },
    layers: [
      { color: '#d79a86', factor: 0.08, base: 330, amp: 60, kind: 'mesa' },
      { color: '#e2a674', factor: 0.2, base: 380, amp: 40, kind: 'dune' },
      { color: '#cf9160', factor: 0.38, base: 405, amp: 50, kind: 'ruins' },
    ],
    haze: 'rgba(255, 228, 185, 0.35)',
    groundTop: '#f7d9a0',
    groundA: '#e7b06e',
    groundB: '#b97a49',
    groundEdge: '#9c6236',
    platTop: '#efc98d',
    platBody: '#c48a52',
    ambient: 'sand',
    grade: 'rgba(255, 170, 90, 0.06)',
  },
  flood: {
    sky: [[0, '#1d2b45'], [0.45, '#3b5677'], [0.8, '#7593ad'], [1, '#aec3d1']],
    celestial: { x: 0.78, y: 0.2, r: 30, color: '#eef4ff', glow: 'rgba(190, 215, 255, 0.35)' },
    layers: [
      { color: '#3a5370', factor: 0.08, base: 350, amp: 50, kind: 'hills' },
      { color: '#2f4560', factor: 0.22, base: 400, amp: 30, kind: 'trees' },
      { color: '#253a50', factor: 0.4, base: 430, amp: 20, kind: 'reeds' },
    ],
    haze: 'rgba(180, 205, 225, 0.22)',
    groundTop: '#7f9e6b',
    groundA: '#5a6e5d',
    groundB: '#2f3c37',
    groundEdge: '#24302b',
    platTop: '#9aa8a2',
    platBody: '#606e6b',
    ambient: 'rain',
    grade: 'rgba(40, 70, 120, 0.12)',
    water: { top: '#5d8fab', deep: '#15293b', shine: 'rgba(210, 235, 255, 0.7)' },
  },
  garden: {
    sky: [[0, '#f9b8a8'], [0.4, '#ffd9b8'], [0.78, '#fff1d6'], [1, '#eef7ee']],
    celestial: { x: 0.2, y: 0.36, r: 64, color: '#fffbe8', glow: 'rgba(255, 225, 170, 0.55)' },
    layers: [
      { color: '#a9ccb2', factor: 0.08, base: 340, amp: 50, kind: 'hills' },
      { color: '#7fb089', factor: 0.2, base: 380, amp: 60, kind: 'cypress' },
      { color: '#5d9467', factor: 0.38, base: 420, amp: 30, kind: 'hills' },
    ],
    haze: 'rgba(255, 240, 220, 0.3)',
    groundTop: '#8ccd6c',
    groundA: '#9a6d48',
    groundB: '#5f3f2a',
    groundEdge: '#4b3221',
    platTop: '#f4efe4',
    platBody: '#cfc2ac',
    ambient: 'petals',
    grade: 'rgba(255, 190, 170, 0.05)',
  },
};

for (const [theme,base,sky,ground,ambient] of [
 ['mountain','flood','#485c80','#8d9ba9','rain'],['valley','desert','#b1bcd0','#b3a17f','sand'],['city','flood','#1b1638','#77718d','sand'],['river','garden','#aadccf','#a7d6bd','petals']
] as const) { PALETTES[theme]={...PALETTES[base],sky:[[0,sky],[1,ground]],groundTop:ground,ambient,layers:PALETTES[base].layers.map(l=>({...l}))}; }

const TILE = 1600; // width of a repeating background layer (logical px)

interface Ambient {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  p: number;
}

export class WorldView {
  readonly pal: Palette;
  private layers: HTMLCanvasElement[] = [];
  private skyCanvas: HTMLCanvasElement | null = null;
  private groundPattern: CanvasPattern | null = null;
  private res = 0;
  private ambient: Ambient[] = [];
  private illustration: HTMLImageElement | null = null;
  private flash = 0;
  private nextFlash = 8;

  constructor(readonly def: StageDef) {
    this.pal = PALETTES[def.theme];
    if(def.background){this.illustration=new Image();this.illustration.src=asset(def.background);}
    const rng = createRng(def.id * 31 + 5);
    const n = def.theme === 'flood' ? 140 : 60;
    for (let i = 0; i < n; i++) this.ambient.push({ x: rng() * 1400, y: rng() * VIEW_H, vx: 0, vy: 0, s: 0.5 + rng(), p: rng() * 10 });
  }

  /** Re-paints cached layers for a new screen resolution. */
  build(res: number, ctxForPattern: CanvasRenderingContext2D): void {
    res = Math.min(2, Math.max(0.5, res));
    if (Math.abs(res - this.res) < 0.05 && this.layers.length) return;
    this.res = res;
    this.layers = this.pal.layers.map((l, i) => this.paintLayer(l, i, res));
    this.skyCanvas = this.paintSky(res);
    const tile = this.paintGroundTile();
    this.groundPattern = ctxForPattern.createPattern(tile, 'repeat');
  }

  private paintSky(res: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = Math.ceil(VIEW_H * res);
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, c.height);
    for (const [t, col] of this.pal.sky) grad.addColorStop(t, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  private paintLayer(l: Palette['layers'][number], idx: number, res: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = Math.ceil(TILE * res);
    c.height = Math.ceil(VIEW_H * res);
    const g = c.getContext('2d')!;
    g.scale(res, res);
    const rng = createRng(this.def.id * 100 + idx * 7 + 3);
    // periodic ridge: integer cycles across the tile so it repeats seamlessly
    const waves = [1, 2, 3, 5, 8].map((k) => ({ k, a: rng() * 0.6 + 0.2, p: rng() * Math.PI * 2 }));
    const ridge = (x: number) => {
      let y = 0;
      for (const w of waves) y += Math.sin((x / TILE) * Math.PI * 2 * w.k + w.p) * w.a / w.k;
      return y;
    };
    g.fillStyle = l.color;
    g.beginPath();
    g.moveTo(0, VIEW_H);
    for (let x = 0; x <= TILE; x += 8) {
      let y = l.base - ridge(x) * l.amp;
      if (l.kind === 'mesa') y = l.base - Math.round(ridge(x) * 2.2) * l.amp * 0.4;
      g.lineTo(x, y);
    }
    g.lineTo(TILE, VIEW_H);
    g.closePath();
    g.fill();

    const darker = shade(l.color, -0.12);
    switch (l.kind) {
      case 'ruins':
        for (let i = 0; i < 9; i++) {
          const x = (i / 9) * TILE + rng() * 80;
          const h = 60 + rng() * 90;
          const y = l.base - ridge(x) * l.amp;
          g.fillStyle = l.color;
          g.fillRect(x, y - h, 18, h + 10);
          g.fillRect(x - 4, y - h - 6, 26, 8);
          if (rng() < 0.5) {
            g.fillRect(x + 60, y - h * 0.8, 18, h * 0.8 + 10);
            g.beginPath();
            g.arc(x + 39, y - h * 0.8, 30, Math.PI, 0);
            g.lineTo(x + 78, y - h * 0.8 + 10);
            g.lineTo(x, y - h * 0.8 + 10);
            g.fill();
          }
        }
        break;
      case 'trees':
        g.strokeStyle = l.color;
        g.lineCap = 'round';
        for (let i = 0; i < 26; i++) {
          const x = rng() * TILE;
          const y = l.base - ridge(x) * l.amp;
          const h = 80 + rng() * 120;
          g.lineWidth = 5 + rng() * 4;
          g.beginPath();
          g.moveTo(x, y + 10);
          g.lineTo(x + (rng() - 0.5) * 20, y - h);
          g.stroke();
          g.lineWidth = 2.5;
          for (let b = 0; b < 4; b++) {
            const by = y - h * (0.4 + b * 0.15);
            const dir = b % 2 ? 1 : -1;
            g.beginPath();
            g.moveTo(x, by);
            g.lineTo(x + dir * (20 + rng() * 25), by - 15 - rng() * 20);
            g.stroke();
          }
        }
        break;
      case 'reeds':
        g.strokeStyle = l.color;
        g.lineWidth = 2;
        for (let i = 0; i < 220; i++) {
          const x = rng() * TILE;
          const y = l.base - ridge(x) * l.amp;
          const h = 20 + rng() * 50;
          g.beginPath();
          g.moveTo(x, y + 6);
          g.quadraticCurveTo(x + 4, y - h / 2, x + (rng() - 0.3) * 14, y - h);
          g.stroke();
        }
        break;
      case 'cypress':
        for (let i = 0; i < 20; i++) {
          const x = (i / 20) * TILE + rng() * 40;
          const y = l.base - ridge(x) * l.amp * 0.3;
          const h = 90 + rng() * 80;
          g.fillStyle = i % 3 ? l.color : darker;
          g.beginPath();
          g.moveTo(x, y + 10);
          g.quadraticCurveTo(x - 14, y - h * 0.5, x, y - h);
          g.quadraticCurveTo(x + 14, y - h * 0.5, x, y + 10);
          g.fill();
        }
        break;
      case 'dune':
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.beginPath();
        g.moveTo(0, VIEW_H);
        for (let x = 0; x <= TILE; x += 8) g.lineTo(x, l.base - ridge(x) * l.amp + 4);
        g.lineTo(TILE, VIEW_H);
        g.fill();
        break;
    }
    // atmospheric fade at the bottom of each layer
    const fade = g.createLinearGradient(0, l.base - 40, 0, VIEW_H);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, this.pal.haze);
    g.fillStyle = fade;
    g.globalCompositeOperation = 'source-atop';
    g.fillRect(0, 0, TILE, VIEW_H);
    return c;
  }

  private paintGroundTile(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d')!;
    const rng = createRng(this.def.id + 99);
    g.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) {
      const x = rng() * 128;
      const y = rng() * 128;
      const r = 2 + rng() * 6;
      g.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (this.def.theme === 'desert') {
      g.strokeStyle = 'rgba(120, 70, 30, 0.18)';
      g.lineWidth = 2;
      g.strokeRect(0, 20, 64, 40);
      g.strokeRect(64, 60, 64, 40);
    }
    return c;
  }

  // ------------------------------------------------------------- drawing

  /** Sky, sun or moon, and parallax layers. Screen space (0..viewW). */
  drawBackground(ctx: CanvasRenderingContext2D, camX: number, viewW: number, time: number): void {
    if (this.skyCanvas) ctx.drawImage(this.skyCanvas, 0, 0, viewW, VIEW_H);
    const c = this.pal.celestial;
    const cx = viewW * c.x - camX * 0.02;
    const cy = VIEW_H * c.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, c.r * 0.6, cx, cy, c.r * 4.5);
    g.addColorStop(0, c.glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - c.r * 5, cy - c.r * 5, c.r * 10, c.r * 10);
    ctx.restore();
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(cx, cy, c.r, 0, Math.PI * 2);
    ctx.fill();
    if (this.def.theme === 'garden') this.godRays(ctx, cx, cy, viewW, time);

    // soft clouds
    ctx.fillStyle = this.def.theme === 'flood' ? 'rgba(30, 45, 70, 0.35)' : 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 6; i++) {
      const w = 220 + (i % 3) * 90;
      const x = mod(i * 310 - camX * 0.04 + time * 6, viewW + w * 2) - w;
      const y = 60 + (i % 3) * 45;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, 16 + (i % 2) * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.pal.layers.forEach((l, i) => {
      const img = this.layers[i];
      if (!img) return;
      const off = -mod(camX * l.factor, TILE);
      for (let x = off; x < viewW; x += TILE) ctx.drawImage(img, x, 0, TILE, VIEW_H);
    });

    const art=this.illustration;
    if(art?.complete && art.naturalWidth){
      ctx.save();
      const h=VIEW_H, w=Math.max(viewW*1.18,art.naturalWidth/art.naturalHeight*h);
      const travel=Math.min(1,Math.max(0,camX/Math.max(1,this.def.length-viewW)));
      ctx.drawImage(art,-(w-viewW)*travel,0,w,h);
      const shade=ctx.createLinearGradient(0,250,0,VIEW_H);
      shade.addColorStop(0,'rgba(10,15,25,0)');shade.addColorStop(1,'rgba(10,15,25,0.3)');
      ctx.fillStyle=shade;ctx.fillRect(0,0,viewW,VIEW_H);ctx.restore();
    }

    if (this.def.theme === 'flood') {
      // distant lake catching the light
      const lg = ctx.createLinearGradient(0, 430, 0, VIEW_H);
      lg.addColorStop(0, 'rgba(150, 185, 210, 0.45)');
      lg.addColorStop(1, 'rgba(40, 70, 95, 0.6)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 440, viewW, VIEW_H - 440);
    }
  }

  private godRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, viewW: number, time: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = 0.15 + i * 0.16 + Math.sin(time * 0.2 + i) * 0.02;
      const len = viewW * 1.2;
      ctx.fillStyle = `rgba(255, 240, 200, ${0.05 + (i % 2) * 0.03})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(a + 0.07) * len, cy + Math.sin(a + 0.07) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Props standing in the scene behind the action. World space. */
  drawProps(ctx: CanvasRenderingContext2D, terrain: Terrain, camX: number, viewW: number, time: number, gateOpen: number): void {
    for (const p of this.def.props) {
      if (p.x < camX - 300 || p.x > camX + viewW + 300) continue;
      const gy = terrain.groundAt(p.x) ?? 462;
      drawProp(ctx, p, gy, time, gateOpen, this.def.theme);
    }
  }

  /** Ground blocks, platforms and water. World space. */
  drawTerrain(ctx: CanvasRenderingContext2D, terrain: Terrain, camX: number, viewW: number, time: number): void {
    const pal = this.pal;
    const x0 = camX - 40;
    const x1 = camX + viewW + 40;

    if (pal.water) {
      // water fills everything below the banks
      const wy = 462;
      const g = ctx.createLinearGradient(0, wy, 0, VIEW_H);
      g.addColorStop(0, pal.water.top);
      g.addColorStop(1, pal.water.deep);
      ctx.fillStyle = g;
      ctx.fillRect(x0, wy, x1 - x0, VIEW_H - wy + 40);
      ctx.strokeStyle = pal.water.shine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) {
        const y = wy + Math.sin(x * 0.04 + time * 2.4) * 2 + Math.sin(x * 0.013 - time) * 1.5;
        if (x === Math.floor(x0 / 6) * 6) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(220, 240, 255, 0.18)';
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(x0 / 80) * 80 + i * 80 + Math.sin(i * 7.3) * 20;
        const y = wy + 18 + ((i * 37) % 60);
        ctx.fillRect(x + Math.sin(time * 1.5 + i) * 8, y, 30 + (i % 3) * 10, 2);
      }
    } else {
      // dark pit below the world
      ctx.fillStyle = '#1b1020';
      ctx.fillRect(x0, 470, x1 - x0, VIEW_H);
    }

    for (const s of terrain.ground) {
      if (s.x1 < x0 || s.x0 > x1) continue;
      const w = s.x1 - s.x0;
      const g = ctx.createLinearGradient(0, s.y, 0, VIEW_H);
      g.addColorStop(0, pal.groundA);
      g.addColorStop(1, pal.groundB);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(s.x0, s.y, w, VIEW_H - s.y + 30, [10, 10, 0, 0]);
      ctx.fill();
      if (this.groundPattern) {
        ctx.save();
        ctx.fillStyle = this.groundPattern;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(s.x0, s.y + 8, w, VIEW_H - s.y);
        ctx.restore();
      }
      // top lip
      ctx.fillStyle = pal.groundTop;
      ctx.beginPath();
      ctx.roundRect(s.x0, s.y - 3, w, 12, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(s.x0 + 6, s.y - 2, w - 12, 2);
      ctx.strokeStyle = pal.groundEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x0, VIEW_H);
      ctx.lineTo(s.x0, s.y + 6);
      ctx.moveTo(s.x1, s.y + 6);
      ctx.lineTo(s.x1, VIEW_H);
      ctx.stroke();
      if (this.def.theme === 'garden') this.grass(ctx, s.x0, s.x1, s.y, time);
      if (this.def.theme === 'flood') this.moss(ctx, s.x0, s.x1, s.y);
    }

    for (const s of terrain.platforms) {
      if (s.x1 < x0 || s.x0 > x1) continue;
      const w = s.x1 - s.x0;
      const small = w < 90;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(s.x0 + w / 2, s.y + 22, w / 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.platBody;
      ctx.beginPath();
      if (small) ctx.roundRect(s.x0, s.y - 2, w, 22, 10);
      else ctx.roundRect(s.x0, s.y - 2, w, 16, 5);
      ctx.fill();
      ctx.fillStyle = pal.platTop;
      ctx.beginPath();
      ctx.roundRect(s.x0, s.y - 3, w, 7, 4);
      ctx.fill();
      if (this.def.theme === 'garden') {
        ctx.fillStyle = '#e0b54a';
        ctx.fillRect(s.x0 + 3, s.y + 9, w - 6, 2);
      }
    }
  }

  private grass(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, time: number): void {
    ctx.strokeStyle = '#6fb457';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0 + 4; x < x1 - 4; x += 7) {
      const h = 5 + ((x * 13) % 7);
      const sway = Math.sin(time * 2 + x * 0.05) * 1.5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + sway, y - h);
    }
    ctx.stroke();
    for (let x = x0 + 20; x < x1 - 10; x += 53) {
      ctx.fillStyle = (x / 53) % 3 < 1 ? '#ffd6e6' : (x / 53) % 3 < 2 ? '#fff3a8' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y - 4, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private moss(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number): void {
    ctx.fillStyle = '#6c8f5c';
    for (let x = x0 + 6; x < x1 - 6; x += 18) {
      ctx.beginPath();
      ctx.ellipse(x, y + 8, 7, 3 + ((x * 7) % 3), 0, 0, Math.PI);
      ctx.fill();
    }
  }

  /** Weather and a light color wash over everything. Screen space. */
  drawWeather(ctx: CanvasRenderingContext2D, camX: number, viewW: number, dt: number, time: number): void {
    const kind = this.pal.ambient;
    const W = viewW + 100;
    if (kind === 'rain') {
      ctx.strokeStyle = 'rgba(200, 220, 240, 0.35)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const a of this.ambient) {
        a.y += (620 + a.s * 200) * dt;
        a.x += -120 * dt;
        if (a.y > VIEW_H) {
          a.y -= VIEW_H + 20;
          a.x = Math.random() * W;
        }
        const x = mod(a.x - camX * 0.9, W) - 50;
        ctx.moveTo(x, a.y);
        ctx.lineTo(x - 5, a.y + 14 * a.s);
      }
      ctx.stroke();
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) {
        this.flash = 0.5;
        this.nextFlash = 10 + Math.random() * 12;
      }
      if (this.flash > 0) {
        this.flash -= dt;
        ctx.fillStyle = `rgba(220, 235, 255, ${Math.max(0, this.flash) * 0.25})`;
        ctx.fillRect(0, 0, viewW, VIEW_H);
      }
    } else if (kind === 'sand') {
      ctx.fillStyle = 'rgba(255, 240, 210, 0.7)';
      for (const a of this.ambient) {
        a.x += (50 + a.s * 80) * dt;
        a.y += Math.sin(time * 2 + a.p) * 12 * dt;
        const x = mod(a.x - camX * 1.1, W) - 50;
        ctx.fillRect(x, a.y, 1.6 * a.s, 1.6 * a.s);
      }
    } else {
      for (const a of this.ambient) {
        a.x += (24 + a.s * 20) * dt;
        a.y += (18 + a.s * 10) * dt;
        if (a.y > VIEW_H) a.y = -10;
        const x = mod(a.x - camX * 1.1, W) - 50;
        const r = a.p % 2 < 1;
        ctx.fillStyle = r ? 'rgba(255, 190, 210, 0.85)' : 'rgba(255, 250, 230, 0.85)';
        ctx.save();
        ctx.translate(x, a.y);
        ctx.rotate(time * 2 + a.p);
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5 * a.s, 1.8 * a.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = this.pal.grade;
    ctx.fillRect(0, 0, viewW, VIEW_H);
    // vignette
    const v = ctx.createRadialGradient(viewW / 2, VIEW_H / 2, VIEW_H * 0.45, viewW / 2, VIEW_H / 2, viewW * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, this.def.theme === 'flood' ? 'rgba(5, 10, 25, 0.45)' : 'rgba(60, 25, 10, 0.25)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, viewW, VIEW_H);
  }
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

// ----------------------------------------------------------------- props

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, gy: number, time: number, gateOpen: number, theme: Theme): void {
  const s = p.s ?? 1;
  const x = p.x;
  ctx.save();
  ctx.translate(x, gy + 2);
  ctx.scale(s, s);
  switch (p.t) {
    case 'pillar':
    case 'broken': {
      const h = p.t === 'pillar' ? 190 : 90;
      ctx.fillStyle = '#e6b981';
      ctx.fillRect(-14, -h, 28, h);
      ctx.fillStyle = 'rgba(160, 100, 50, 0.25)';
      for (let i = -9; i <= 9; i += 6) ctx.fillRect(i, -h, 2, h);
      ctx.fillStyle = '#d8a56b';
      ctx.fillRect(-20, -12, 40, 12);
      if (p.t === 'pillar') {
        ctx.fillRect(-20, -h - 12, 40, 14);
        ctx.fillStyle = '#f0cc97';
        ctx.fillRect(-20, -h - 12, 40, 4);
      } else {
        ctx.fillStyle = '#e6b981';
        ctx.beginPath();
        ctx.moveTo(-14, -h);
        ctx.lineTo(-6, -h - 14);
        ctx.lineTo(2, -h - 4);
        ctx.lineTo(9, -h - 18);
        ctx.lineTo(14, -h);
        ctx.fill();
        ctx.fillRect(22, -10, 22, 10);
      }
      break;
    }
    case 'arch':
      ctx.fillStyle = '#ddae76';
      ctx.fillRect(-70, -170, 26, 170);
      ctx.fillRect(44, -170, 26, 170);
      ctx.beginPath();
      ctx.moveTo(-74, -168);
      ctx.arc(0, -168, 74, Math.PI, 0);
      ctx.lineTo(74, -150);
      ctx.arc(0, -168, 48, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(160, 100, 50, 0.22)';
      ctx.fillRect(-70, -60, 26, 4);
      ctx.fillRect(44, -100, 26, 4);
      break;
    case 'obelisk':
      ctx.fillStyle = '#d29f68';
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-11, -200);
      ctx.lineTo(0, -222);
      ctx.lineTo(11, -200);
      ctx.lineTo(16, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 240, 200, 0.5)';
      for (let i = 0; i < 5; i++) ctx.fillRect(-4, -170 + i * 28, 8, 3);
      break;
    case 'palm': {
      ctx.strokeStyle = '#9c6a3e';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(14, -80, 6, -160);
      ctx.stroke();
      ctx.strokeStyle = '#5f9b5a';
      ctx.lineWidth = 7;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.55 + Math.sin(time * 1.3 + i) * 0.04;
        ctx.beginPath();
        ctx.moveTo(6, -160);
        ctx.quadraticCurveTo(6 + Math.cos(a) * 40, -160 + Math.sin(a) * 40 - 14, 6 + Math.cos(a) * 70, -160 + Math.sin(a) * 50 + 20);
        ctx.stroke();
      }
      break;
    }
    case 'rock':
      ctx.fillStyle = '#c48c5b';
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(-30, -30);
      ctx.lineTo(-5, -44);
      ctx.lineTo(28, -26);
      ctx.lineTo(42, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(-30, -30);
      ctx.lineTo(-5, -44);
      ctx.lineTo(0, -30);
      ctx.fill();
      break;
    case 'tent':
      ctx.fillStyle = '#b0563c';
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(0, -80);
      ctx.lineTo(60, 0);
      ctx.fill();
      ctx.fillStyle = '#f0d9a8';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-60 + i * 40, 0);
        ctx.lineTo(0, -80);
        ctx.lineTo(-48 + i * 40, 0);
        ctx.fill();
      }
      ctx.fillStyle = '#3a1f18';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(0, -30);
      ctx.lineTo(12, 0);
      ctx.fill();
      break;
    case 'reeds':
      ctx.strokeStyle = '#4f6b4e';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) {
        const sway = Math.sin(time * 1.4 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(-20 + i * 5, 0);
        ctx.quadraticCurveTo(-20 + i * 5, -40, -20 + i * 5 + sway, -60 - (i % 3) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(-6, -78, 4, 14);
      ctx.fillRect(10, -70, 4, 14);
      break;
    case 'deadTree':
      ctx.strokeStyle = '#2b3a46';
      ctx.lineCap = 'round';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -150);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-4, -90);
      ctx.lineTo(-44, -130);
      ctx.moveTo(-5, -120);
      ctx.lineTo(30, -160);
      ctx.moveTo(-6, -146);
      ctx.lineTo(-26, -186);
      ctx.stroke();
      break;
    case 'post':
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(-5, -60, 10, 70);
      ctx.strokeStyle = '#a58c63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -50);
      ctx.lineTo(5, -44);
      ctx.stroke();
      break;
    case 'lily':
      ctx.restore();
      ctx.save();
      ctx.translate(x, 464);
      ctx.fillStyle = '#5f8f57';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 5, 0, 0.3, Math.PI * 2);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.fillStyle = '#ffd7e8';
      ctx.beginPath();
      ctx.arc(6, -3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ruinWall':
      ctx.fillStyle = '#6f7d73';
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.lineTo(-70, -90);
      ctx.lineTo(-40, -110);
      ctx.lineTo(-10, -90);
      ctx.lineTo(20, -120);
      ctx.lineTo(60, -70);
      ctx.lineTo(70, 0);
      ctx.fill();
      ctx.fillStyle = '#5c8152';
      ctx.fillRect(-70, -40, 140, 8);
      ctx.strokeStyle = 'rgba(30, 40, 35, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) ctx.strokeRect(-60 + i * 30, -80, 30, 20);
      break;
    case 'lantern': {
      ctx.fillStyle = '#3a3026';
      ctx.fillRect(-3, -90, 6, 90);
      ctx.fillRect(-3, -90, 22, 4);
      ctx.fillStyle = '#ffcf6e';
      ctx.fillRect(12, -84, 12, 14);
      ctx.globalCompositeOperation = 'lighter';
      const flick = 0.85 + Math.sin(time * 9 + x) * 0.08;
      const g = ctx.createRadialGradient(18, -77, 0, 18, -77, 70);
      g.addColorStop(0, `rgba(255, 200, 110, ${0.55 * flick})`);
      g.addColorStop(1, 'rgba(255, 200, 110, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-60, -150, 160, 160);
      break;
    }
    case 'cypress':
      ctx.fillStyle = '#3f7a4d';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-24, -90, 0, -200);
      ctx.quadraticCurveTo(24, -90, 0, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 220, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(-14, -90, 0, -190);
      ctx.quadraticCurveTo(-4, -90, 0, -10);
      ctx.fill();
      break;
    case 'hedge':
      ctx.fillStyle = '#4c8a55';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(-60 + i * 30, -26 - (i % 2) * 6, 26, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(-80, -26, 160, 26);
      ctx.fillStyle = '#ffd6e6';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(-66 + i * 19, -30 - ((i * 7) % 18), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'flowers':
      for (let i = 0; i < 9; i++) {
        const fx = -40 + i * 10;
        const fh = 14 + ((i * 7) % 12);
        ctx.strokeStyle = '#5f9b4e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, 0);
        ctx.lineTo(fx + Math.sin(time * 2 + i) * 2, -fh);
        ctx.stroke();
        ctx.fillStyle = ['#ff8fb1', '#ffe17a', '#ffffff', '#c7a2ff'][i % 4];
        ctx.beginPath();
        ctx.arc(fx + Math.sin(time * 2 + i) * 2, -fh, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'fountain': {
      ctx.fillStyle = '#efe8dc';
      ctx.beginPath();
      ctx.roundRect(-60, -30, 120, 30, 8);
      ctx.fill();
      ctx.fillRect(-8, -80, 16, 52);
      ctx.beginPath();
      ctx.ellipse(0, -80, 30, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fc3e0';
      ctx.fillRect(-54, -28, 108, 8);
      ctx.strokeStyle = 'rgba(180, 225, 255, 0.85)';
      ctx.lineWidth = 2.5;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -86);
        ctx.quadraticCurveTo(d * 30, -110 + Math.sin(time * 5) * 2, d * 46, -28);
        ctx.stroke();
      }
      break;
    }
    case 'trellis':
      ctx.strokeStyle = '#efe8dc';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-50, -120);
      ctx.arc(0, -120, 50, Math.PI, 0);
      ctx.lineTo(50, 0);
      ctx.stroke();
      ctx.fillStyle = '#5e9c58';
      for (let i = 0; i < 16; i++) {
        const a = Math.PI + (i / 15) * Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 50, -120 + Math.sin(a) * 50, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ff9fbf';
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 50, -124 + Math.sin(a) * 50, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'olive':
      ctx.strokeStyle = '#7a5a3c';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-12, -50, 4, -100);
      ctx.stroke();
      ctx.fillStyle = '#7ea36f';
      for (const [ox, oy, r] of [
        [-30, -110, 30],
        [10, -130, 34],
        [40, -105, 26],
        [-5, -95, 24],
      ]) {
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'gate': {
      // golden gate; doors swing open after the final battle
      ctx.fillStyle = '#efe8dc';
      ctx.fillRect(-90, -230, 26, 230);
      ctx.fillRect(64, -230, 26, 230);
      ctx.fillRect(-98, -250, 196, 24);
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(-98, -252, 196, 4);
      const open = gateOpen;
      ctx.globalCompositeOperation = 'lighter';
      const lg = ctx.createLinearGradient(0, -226, 0, 0);
      lg.addColorStop(0, `rgba(255, 240, 190, ${0.15 + open * 0.6})`);
      lg.addColorStop(1, `rgba(255, 240, 190, ${0.05 + open * 0.3})`);
      ctx.fillStyle = lg;
      ctx.fillRect(-64, -226, 128, 226);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#d9a93a';
      ctx.lineWidth = 4;
      for (const side of [-1, 1]) {
        const w = 64 * (1 - open * 0.85);
        const x0 = side < 0 ? -64 : 64 - w;
        for (let i = 0; i <= 5; i++) {
          const bx = x0 + (w * i) / 5;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.lineTo(bx, -210);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x0, -120);
        ctx.lineTo(x0 + w, -120);
        ctx.moveTo(x0, -200);
        ctx.lineTo(x0 + w, -200);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
  void theme;
}
