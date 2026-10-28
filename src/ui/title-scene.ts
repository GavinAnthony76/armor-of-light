import { Player } from '../core/player';
import { HeroView } from '../render/hero';
import { ProductionScene } from '../production/scene';
import { productionAssets } from '../production/assets';

const scene = new ProductionScene();
let appReduceMotion = false;
const instances = new Set<TitleScene>();

/** Feet stay inside the viewport; all character artwork uses one uniform scale. */
export function titleHeroPlacement(w: number, h: number, opening: boolean): { x: number; foot: number; size: number } {
  const portrait = h > w * 1.12;
  const shortLandscape = h < 480 && w > h;
  const heightRatio = portrait ? opening ? h < 700 ? .34 : .4 : h < 700 ? .24 : .3 : .7;
  const widthRatio = portrait ? opening ? .72 : .6 : .32;
  return {
    x: w * (portrait ? .73 : shortLandscape && !opening ? .49 : .78),
    foot: h * (portrait ? opening ? .72 : h < 700 ? .46 : .52 : .88),
    size: Math.min(h * heightRatio, w * widthRatio),
  };
}

export function setTitleReduceMotion(value: boolean): void {
  appReduceMotion = value;
  for (const instance of instances) instance.refreshMotion();
}

/** A decorative-only scene. It owns no Stage, input, save, or gameplay state. */
export class TitleScene {
  private ctx: CanvasRenderingContext2D | null;
  private hero = new HeroView();
  private player = new Player(0, 0, 8);
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private active = false;
  private disposed = false;
  private reduced = false;
  private resizeObserver: ResizeObserver;
  private media = window.matchMedia('(prefers-reduced-motion: reduce)');
  private resize = () => this.size();
  private visibility = () => {
    if (document.hidden) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    } else this.schedule();
  };
  private intersection?: IntersectionObserver;
  private motionChange = () => this.refreshMotion();

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.player.onGround = true;
    this.player.facing = -1;
    this.hero.update(this.player, 1 / 60);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    if (this.media.addEventListener) this.media.addEventListener('change', this.motionChange);
    else this.media.addListener(this.motionChange);
    document.addEventListener('visibilitychange', this.visibility);
    this.intersection = new IntersectionObserver(() => this.schedule());
    this.intersection.observe(canvas);
    instances.add(this);
    void productionAssets.load().then(async () => {
      if (this.disposed) return;
      await Promise.all(['desert-painted-sky', 'desert-painted-mid', 'desert-painted-palm',
        'eliam-body-painterly', 'eliam-head', 'eliam-torso', 'eliam-boot', 'eliam-thigh', 'eliam-bracer', 'hammer-head']
        .map((id) => productionAssets.preloadImage(id)));
      if (this.disposed) return;
      this.paint();
      this.schedule();
    });
    this.size();
    this.refreshMotion();
  }

  setActive(active: boolean): void {
    if (this.disposed || this.active === active) return;
    this.active = active;
    this.last = 0;
    if (!active && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.schedule();
  }

  refreshMotion(): void {
    const next = appReduceMotion || this.media.matches;
    if (next === this.reduced) return;
    this.reduced = next;
    this.last = 0;
    if (next) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.paint();
    } else this.schedule();
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersection?.disconnect();
    if (this.media.removeEventListener) this.media.removeEventListener('change', this.motionChange);
    else this.media.removeListener(this.motionChange);
    document.removeEventListener('visibilitychange', this.visibility);
    instances.delete(this);
  }

  private size(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.paint();
    }
  }

  private visible(): boolean {
    return !document.hidden && this.active && !!this.canvas.isConnected &&
      this.canvas.getBoundingClientRect().width > 0 &&
      (!this.intersection || this.canvas.getBoundingClientRect().height > 0);
  }

  private schedule(): void {
    if (this.disposed || !this.visible() || this.reduced || this.raf) return;
    this.raf = requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    this.raf = 0;
    if (!this.visible() || this.reduced) return;
    // Decorative motion does not need a second 60fps full-screen render on phones.
    if (this.last && now - this.last < 1000 / 30) {
      this.schedule();
      return;
    }
    const dt = this.last ? Math.min(.05, Math.max(0, (now - this.last) / 1000)) : 0;
    this.last = now;
    this.elapsed += dt;
    this.player.t = this.elapsed;
    this.player.stride = 0;
    this.hero.update(this.player, dt);
    this.paint();
    this.schedule();
  }

  private paint(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width, h = this.canvas.height;
    if (!w || !h) return;
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = w / dpr, height = h / dpr;
    const t = this.reduced ? 0 : this.elapsed;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const sky = productionAssets.image('desert-painted-sky');
    const mid = productionAssets.image('desert-painted-mid');
    this.cover(ctx, sky, width, height, 1, Math.sin(t * .08) * 5);
    ctx.save();
    ctx.globalAlpha = .7;
    this.cover(ctx, mid, width, height, 1.07, Math.sin(t * .11) * 12);
    ctx.restore();
    this.drawForeground(ctx, width, height, t);
    const menu = this.canvas.classList.contains('title-scene');
    const portrait = height > width * 1.12;
    // Shade the scenery for legibility before drawing Eliam, not over his artwork.
    const shade = ctx.createLinearGradient(0, 0, width, 0);
    shade.addColorStop(0, menu && !portrait ? 'rgba(19,22,28,.88)' : 'rgba(19,22,28,.44)');
    shade.addColorStop(.48, menu && !portrait ? 'rgba(19,22,28,.34)' : 'rgba(19,22,28,.10)');
    shade.addColorStop(1, 'rgba(19,22,28,.02)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
    const vertical = ctx.createLinearGradient(0, 0, 0, height);
    vertical.addColorStop(0, menu && portrait ? 'rgba(15,18,25,.72)' : 'rgba(15,18,25,.06)');
    vertical.addColorStop(.48, menu && portrait ? 'rgba(17,19,25,.18)' : 'rgba(17,19,25,.02)');
    vertical.addColorStop(1, menu && portrait ? 'rgba(17,18,23,.90)' : 'rgba(17,18,23,.64)');
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, width, height);
    this.drawHero(ctx, width, height, t);
    if (!this.reduced) this.drawEmbers(ctx, width, height, t);
  }

  private cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, w: number, h: number, scale: number, drift: number): void {
    if (!image?.complete || !image.naturalWidth) return;
    const s = Math.max(w / image.naturalWidth, h / image.naturalHeight) * scale;
    const dw = image.naturalWidth * s, dh = image.naturalHeight * s;
    ctx.drawImage(image, (w - dw) / 2 + drift, (h - dh) / 2, dw, dh);
  }

  private drawForeground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const palm = productionAssets.image('desert-painted-palm');
    if (!palm?.complete || !palm.naturalWidth) return;
    const scale = Math.min(h / 512, w / 1150);
    const ph = palm.naturalHeight * scale, pw = palm.naturalWidth * scale;
    ctx.save();
    ctx.globalAlpha = .72;
    ctx.translate(w * .94 + (this.reduced ? 0 : Math.sin(t * .35) * 4), h * .88);
    ctx.scale(-1, 1);
    ctx.drawImage(palm, -pw * .5, -ph, pw, ph);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .32;
    ctx.translate(w * .08 + (this.reduced ? 0 : Math.sin(t * .29 + 2) * 3), h * .92);
    ctx.drawImage(palm, -pw * .35, -ph * .78, pw * .7, ph * .78);
    ctx.restore();
  }

  private drawHero(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    const opening = this.canvas.classList.contains('opening-scene');
    const { x, foot, size } = titleHeroPlacement(w, h, opening);
    this.player.x = 0;
    this.player.y = 0;
    ctx.save();
    ctx.translate(x, foot + (this.reduced ? 0 : Math.sin(t * 1.45) * 2));
    ctx.scale(size / 85, size / 85);
    this.hero.draw(ctx, this.player, 1, scene.hero(ctx, this.player));
    ctx.restore();
  }

  private drawEmbers(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 15; i++) {
      const phase = (t * (.055 + (i % 4) * .008) + i * .173) % 1;
      const x = ((i * 79 + Math.sin(t * .17 + i) * 19) % w + w) % w;
      const y = h * (.46 + .48 * (1 - phase));
      const alpha = Math.sin(phase * Math.PI) * (.19 + (i % 3) * .05);
      ctx.fillStyle = `rgba(255,190,91,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * .45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function mountTitleScene(canvas: HTMLCanvasElement): TitleScene {
  return new TitleScene(canvas);
}
