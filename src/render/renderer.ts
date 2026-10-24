import { VIEW_H, VIEW_W_MAX, VIEW_W_MIN } from '../core/config';
import type { Sign } from '../core/levels';
import type { Game } from '../game';
import type { InputMode } from '../input';
import { drawEnemy, WARN_RED } from './shadows';
import { romanRank, WEAPONS } from '../core/weapons';
import { drawWeaponSilhouette } from './weapon-art';

export interface Layout {
  w: number; // CSS px viewport
  h: number;
  dpr: number;
  scale: number; // CSS px per world unit
  viewW: number; // world units visible horizontally
  ox: number; // CSS px offset of the game view
  oy: number;
  portrait: boolean;
  zoom: number; // world magnification inside the view
}

export const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif';
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Landscape fills the screen; portrait puts the view on top and controls below. */
export function computeLayout(w: number, h: number): Layout {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const portrait = h > w * 1.05;
  if (portrait) {
    const viewW = 560;
    const scale = w / viewW;
    const gh = VIEW_H * scale;
    const oy = Math.max(0, Math.min(h * 0.07, (h - gh) / 2 - h * 0.14));
    return { w, h, dpr, scale, viewW, ox: 0, oy, portrait, zoom: 1.1 };
  }
  const viewW = Math.max(VIEW_W_MIN, Math.min(VIEW_W_MAX, (w / h) * VIEW_H));
  const scale = Math.min(h / VIEW_H, w / viewW);
  return { w, h, dpr, scale, viewW, ox: (w - viewW * scale) / 2, oy: (h - VIEW_H * scale) / 2, portrait, zoom: 1.2 };
}

const SIGN_TEXT: Record<Sign['key'], Record<InputMode, string>> = {
  dash:{keyboard:'L / V to dash · strike, then jump to keep moving',touch:'DASH past danger · jump after a strike',gamepad:'LB to dash · jump after a strike'},
  wall:{keyboard:'Hold toward the wall, then jump to kick away',touch:'Hold toward the wall and tap JUMP to kick away',gamepad:'Hold toward the wall and press A to kick away'},
  move: { keyboard: '← →  or  A D  to walk', touch: 'Slide on the pad to walk', gamepad: 'Stick or D-pad to walk' },
  jump: { keyboard: 'Space  or  W  to jump', touch: 'Tap  JUMP  to leap', gamepad: 'Press  A  to jump' },
  attack: { keyboard: 'J  or  X  to strike', touch: 'Tap  STRIKE  to swing', gamepad: 'Press  X  to strike' },
  block: { keyboard: 'Hold  K  or  C  to raise your shield', touch: 'Hold  SHIELD  to block', gamepad: 'Hold  B  to block' },
  parry: { keyboard: 'Block as a gold warning flashes to PARRY', touch: 'Block as a gold warning flashes to PARRY', gamepad: 'Block as a gold warning flashes to PARRY' },
  red: { keyboard: 'Red warnings can’t be blocked: jump or move', touch: 'Red warnings can’t be blocked: jump or move', gamepad: 'Red warnings can’t be blocked: jump or move' },
  combo: { keyboard: 'Strike three times for a combo', touch: 'Tap STRIKE three times for a combo', gamepad: 'Press X three times for a combo' },
  water: { keyboard: 'Jump the gaps. The water is deep.', touch: 'Jump the gaps. The water is deep.', gamepad: 'Jump the gaps. The water is deep.' },
  shield: { keyboard: 'Shielded foes: parry them, or strike from behind', touch: 'Shielded foes: parry them, or strike from behind', gamepad: 'Shielded foes: parry them, or strike from behind' },
};

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  layout: Layout;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.layout = this.resize();
  }

  resize(): Layout {
    const viewport = window.visualViewport;
    const l = computeLayout(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight);
    this.canvas.width = Math.round(l.w * l.dpr);
    this.canvas.height = Math.round(l.h * l.dpr);
    this.canvas.style.width = `${l.w}px`;
    this.canvas.style.height = `${l.h}px`;
    this.layout = l;
    return l;
  }

  render(game: Game, frameDt: number, inputMode: InputMode): void {
    const ctx = this.ctx;
    const l = this.layout;
    const s = game.stage;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#100b18';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!s || !game.world) return;
    const Z = l.zoom;
    const worldW = l.viewW / Z;
    const camTop = VIEW_H - VIEW_H / Z; // keep the ground line anchored to the bottom
    game.viewW = worldW;
    const world = game.world;
    const k = l.scale * l.dpr;
    world.build(k, ctx);

    const shake = game.reduceMotion ? 0 : s.shakeAmount + (s.hitstop > 0 ? 1.5 : 0);
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(k, 0, 0, k, l.ox * l.dpr, l.oy * l.dpr);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, l.viewW, VIEW_H);
    ctx.clip();

    world.drawBackground(ctx, game.camX, l.viewW, game.time);

    // ---------------- world space
    ctx.save();
    ctx.scale(Z, Z);
    ctx.translate(-Math.round(game.camX * 4) / 4 + sx, -camTop + sy);
    const camX = game.camX;
    world.drawProps(ctx, s.terrain, camX, worldW, game.time, game.gateOpen);
    this.drawExit(game);
    world.drawTerrain(ctx, s.terrain, camX, worldW, game.time);
    if (!game.demo) for (const sign of s.def.signs) if (Math.abs(sign.x-s.player.x)<170) this.drawSign(sign, s.terrain.groundAt(sign.x) ?? 450, inputMode);
    this.drawPickups(game);
    this.drawWeaponDrops(game);
    this.drawMarkers(game);
    this.drawWaves(game);
    for(const e of s.enemies){
      if(e.x+200<camX||e.x-200>camX+worldW)continue;
      const t=game.renderAlpha,dx=e.prevX+(e.x-e.prevX)*t-e.x,dy=e.prevY+(e.y-e.prevY)*t-e.y;
      ctx.save();ctx.translate(dx,dy);drawEnemy(ctx,e,s.diff,game.time);ctx.restore();
    }
    if (s.def.theme === 'flood') this.drawWaterFront(game);
    const p = s.player;
    const blink = p.invuln > 0 && p.state !== 'dead' && Math.floor(game.time * 16) % 2 === 0;
    const alpha = p.state === 'dead' ? Math.max(0, 1 - p.t / 0.8) : blink ? 0.35 : 1;
    const t=game.renderAlpha;
    const rendered=Object.assign(Object.create(Object.getPrototypeOf(p)),p,{x:s.prevPlayerX+(p.x-s.prevPlayerX)*t,y:s.prevPlayerY+(p.y-s.prevPlayerY)*t});
    game.hero.draw(ctx, rendered, alpha);
    this.drawOrbs(game);
    this.drawArenaWalls(game);
    game.fx.drawBase(ctx);
    game.fx.drawGlow(ctx);
    this.drawTexts(game);
    ctx.restore();

    // ---------------- screen space
    world.drawWeather(ctx, camX, l.viewW, frameDt, game.time);
    if (game.hurtFlash > 0) {
      const g = ctx.createRadialGradient(l.viewW / 2, VIEW_H / 2, VIEW_H * 0.3, l.viewW / 2, VIEW_H / 2, l.viewW * 0.7);
      g.addColorStop(0, 'rgba(255, 40, 40, 0)');
      g.addColorStop(1, `rgba(200, 20, 40, ${game.hurtFlash * 0.55})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, l.viewW, VIEW_H);
    }
    if (game.whiteFlash > 0 && !game.reduceMotion) {
      ctx.fillStyle = `rgba(255, 248, 225, ${game.whiteFlash * 0.6})`;
      ctx.fillRect(0, 0, l.viewW, VIEW_H);
    }
    if (s.phase === 'dead') {
      ctx.fillStyle = `rgba(255, 244, 220, ${Math.min(0.5, s.phaseT * 0.5)})`;
      ctx.fillRect(0, 0, l.viewW, VIEW_H);
    }
    if (!game.demo) this.drawHud(game);
    this.drawBanners(game);
    ctx.restore();
  }

  // ------------------------------------------------------------ world

  private drawExit(game: Game): void {
    const s = game.stage!;
    const done = !s.active && s.nextEncounter >= s.def.encounters.length;
    if (!done) return;
    const ctx = this.ctx;
    const x = s.def.exit + 40;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.7 + Math.sin(game.time * 3) * 0.2;
    const g = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    g.addColorStop(0, 'rgba(255, 236, 170, 0)');
    g.addColorStop(0.5, `rgba(255, 236, 170, ${0.45 * pulse})`);
    g.addColorStop(1, 'rgba(255, 236, 170, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 50, 0, 100, 460);
    ctx.restore();
    if (Math.random() < 0.4) game.fx.add('wisp', x + (Math.random() - 0.5) * 60, 450, { vy: -120, life: 2, size: 2.5, color: '#fff1c4', drag: 0.3 });
  }

  private drawSign(sign: Sign, gy: number, mode: InputMode): void {
    const ctx = this.ctx;
    const text = SIGN_TEXT[sign.key][mode];
    ctx.save();
    ctx.font = `600 15px ${SANS}`;
    const w = Math.max(120, ctx.measureText(text).width + 28);
    const x = sign.x;
    const y = gy - 112;
    ctx.fillStyle = '#5b4330';
    ctx.fillRect(x - 3, y + 30, 6, gy - y - 30);
    ctx.fillStyle = 'rgba(30, 20, 40, 0.72)';
    ctx.strokeStyle = 'rgba(255, 226, 150, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, 34, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 17.5);
    ctx.restore();
  }

  private drawPickups(game: Game): void {
    const ctx = this.ctx;
    const s = game.stage!;
    ctx.save();
    for (const k of s.pickups) {
      if (k.taken) continue;
      if (k.x < game.camX - 50 || k.x > game.camX + game.viewW + 50) continue;
      const bob = k.placed ? Math.sin(game.time * 3 + k.t) * 4 : 0;
      const y = k.y + bob;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(k.x, y, 0, k.x, y, 18);
      g.addColorStop(0, k.kind === 'heart' ? 'rgba(255, 120, 150, 0.6)' : 'rgba(255, 225, 140, 0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(k.x - 18, y - 18, 36, 36);
      ctx.globalCompositeOperation = 'source-over';
      if (k.kind === 'heart') {
        heart(ctx, k.x, y, 9, '#ff5d7a', '#ffd0da');
      } else {
        ctx.fillStyle = '#fff1c2';
        ctx.save();
        ctx.translate(k.x, y);
        ctx.rotate(game.time * 2 + k.t);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawWeaponDrops(game: Game): void {
    const ctx = this.ctx;
    const s = game.stage!;
    for (const drop of s.weaponDrops) {
      if (drop.x < game.camX - 60 || drop.x > game.camX + game.viewW + 60) continue;
      const weapon = WEAPONS[drop.weapon];
      const heldRank = s.player.alternateWeapon === drop.weapon ? s.player.weaponRank : 0;
      const offerRank = Math.min(3, heldRank + 1) || 1;
      const bob = drop.settled ? Math.sin(game.time * 3 + drop.x * 0.03) * 2 : 0;
      const y = drop.y - 14 + bob;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = drop.settled ? 0.8 : 0.58;
      const glow = ctx.createRadialGradient(drop.x, y, 2, drop.x, y, 26);
      glow.addColorStop(0, `${weapon.color}88`);
      glow.addColorStop(1, `${weapon.color}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(drop.x - 28, y - 28, 56, 56);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#090b14';
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y - 1, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const tilt = drop.settled ? -0.45 : Math.sin(game.time * 9 + drop.x) * 0.12;
      drawWeaponSilhouette(ctx, drop.x - 4, y, tilt, weapon, offerRank, 0.58);
      if (drop.bounces > 0 || s.player.alternateWeapon === drop.weapon) {
        ctx.fillStyle = '#fff4d0';
        ctx.font = `800 9px ${SANS}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(romanRank(offerRank), drop.x, y + 15);
      }
      ctx.restore();
    }
  }

  private drawMarkers(game: Game): void {
    const ctx = this.ctx;
    for (const e of game.stage!.enemies) {
      if (!e.marker || !(e.state === 'windup' || e.state === 'active')) continue;
      const m = e.marker;
      const gy = game.stage!.terrain.groundAt(m.x) ?? 450;
      const pulse = 0.6 + Math.sin(game.time * 14) * 0.3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, gy - 240, 0, gy);
      g.addColorStop(0, 'rgba(255, 60, 60, 0)');
      g.addColorStop(1, `rgba(255, 60, 60, ${0.3 * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(m.x - m.r, gy - 240, m.r * 2, 240);
      ctx.restore();
      ctx.strokeStyle = WARN_RED;
      ctx.lineWidth = 3;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.ellipse(m.x, gy, m.r, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawWaves(game: Game): void {
    const ctx = this.ctx;
    for (const w of game.stage!.waves) {
      const h = w.big ? 46 : 30;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(w.dir, 1);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -h / 2, 0, 0, -h / 2, h * 1.2);
      g.addColorStop(0, 'rgba(255, 70, 70, 0.55)');
      g.addColorStop(1, 'rgba(255, 70, 70, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-h * 1.3, -h * 2, h * 2.6, h * 2.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#1a0b22';
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.quadraticCurveTo(-10, -h * 0.4, 4, -h);
      ctx.quadraticCurveTo(10, -h * 0.5, 22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = WARN_RED;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      if (Math.random() < 0.5) game.fx.add('dust', w.x, w.y - 2, { vx: -w.dir * 40, vy: -40, life: 0.5, size: 6, color: '#3a2238', drag: 3 });
    }
  }

  private drawOrbs(game: Game): void {
    const ctx = this.ctx;
    for (const o of game.stage!.orbs) {
      const mine = o.owner === 'player';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3);
      g.addColorStop(0, mine ? 'rgba(255, 240, 180, 0.9)' : 'rgba(180, 120, 255, 0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = mine ? '#fff7dc' : '#1a0b2c';
      ctx.strokeStyle = mine ? '#ffd25e' : '#c9a0ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      game.fx.add(mine ? 'wisp' : 'smoke', o.x, o.y, { life: 0.3, size: mine ? 3 : 5, color: mine ? '#ffe8a8' : '#3a2058', drag: 4 });
    }
  }

  private drawArenaWalls(game: Game): void {
    const s = game.stage!;
    if (!s.active || s.active.def.openRoad) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const x of [s.bounds.minX, s.bounds.maxX]) {
      const flick = 0.75 + Math.sin(game.time * 11 + x) * 0.1;
      const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
      g.addColorStop(0, 'rgba(255, 226, 150, 0)');
      g.addColorStop(0.5, `rgba(255, 226, 150, ${0.5 * flick})`);
      g.addColorStop(1, 'rgba(255, 226, 150, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 22, 0, 44, 470);
      ctx.fillStyle = `rgba(255, 250, 230, ${0.7 * flick})`;
      ctx.fillRect(x - 1.5, 0, 3, 470);
    }
    ctx.restore();
  }

  private drawWaterFront(game: Game): void {
    const ctx = this.ctx;
    const s = game.stage!;
    const g = [...s.terrain.ground].sort((a, b) => a.x0 - b.x0);
    const x0 = game.camX - 50;
    const x1 = game.camX + game.viewW + 50;
    const grad = ctx.createLinearGradient(0, 462, 0, VIEW_H);
    grad.addColorStop(0, 'rgba(93, 143, 171, 0.82)');
    grad.addColorStop(1, 'rgba(21, 41, 59, 0.95)');
    ctx.fillStyle = grad;
    let prev = -1e9;
    for (const b of [...g, { x0: 1e9, x1: 1e9, y: 450 }]) {
      const gx0 = Math.max(prev, x0);
      const gx1 = Math.min(b.x0, x1);
      if (gx1 > gx0) ctx.fillRect(gx0, 464, gx1 - gx0, VIEW_H - 464);
      prev = Math.max(prev, b.x1);
    }
  }

  private drawTexts(game: Game): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of game.texts) {
      const k = 1 - t.t / 1.1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `800 ${18 + (t.t < 0.1 ? (0.1 - t.t) * 60 : 0)}px ${SANS}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(30, 15, 40, 0.8)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------- hud

  private drawHud(game: Game): void {
    const ctx = this.ctx;
    const s = game.stage!;
    const l = this.layout;
    const p = s.player;
    // hearts
    const top = 26;
    const left = Math.max(86, 80 / l.scale); // clear of the pause button
    for (let i = 0; i < p.maxHp; i++) {
      const x = left + i * 28;
      const full = i < p.hp;
      const lost = !full && i < p.hp + 1 && game.hurtFlash > 0;
      heart(ctx, x, top, 11, full ? '#ff5d7a' : lost ? '#ffffff' : 'rgba(40, 20, 50, 0.55)', full ? '#ffd0da' : 'rgba(255,255,255,0.35)');
    }
    ctx.save();
    ctx.font=`600 11px ${SANS}`;
    ctx.fillStyle='#e9d5a3';
    ctx.fillText(`ELIAM · ${p.dashCooldown>0?'DASH RECHARGING':'DASH READY'}`,left-10,top+29);
    const equipped = p.equippedWeapon
      ? `${p.equippedWeapon.name} · RANK ${romanRank(p.weaponRank)}`
      : 'BURNING HAMMER';
    ctx.font=`700 11px ${SANS}`;
    ctx.fillStyle=p.equippedWeapon?.color ?? '#ffd877';
    ctx.fillText(equipped,left-10,top+45);
    ctx.restore();
    // motes + score (leaves room on the right for the pause button)
    const rx = l.viewW - 24;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `800 20px ${SANS}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20, 10, 30, 0.55)';
    const motes = `${s.motes} / ${s.totalMotes}`;
    ctx.strokeText(motes, rx, top);
    ctx.fillStyle = '#fff1c2';
    ctx.fillText(motes, rx, top);
    const mw = ctx.measureText(motes).width;
    ctx.fillStyle = '#ffe08a';
    ctx.save();
    ctx.translate(rx - mw - 14, top);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
    ctx.font = `700 14px ${SANS}`;
    ctx.strokeText(`Score ${s.score.toLocaleString()}`, rx, top + 24);
    ctx.fillStyle = 'rgba(255, 245, 225, 0.9)';
    ctx.fillText(`Score ${s.score.toLocaleString()}`, rx, top + 24);
    ctx.restore();

    // guardian health
    const b = s.boss;
    if (b && b.alive) {
      const w = Math.min(520, l.viewW - 120);
      const x = (l.viewW - w) / 2;
      const y = VIEW_H - 46;
      ctx.save();
      ctx.font = `600 18px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3d6';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20, 10, 30, 0.7)';
      ctx.strokeText(b.cfg.name ?? '', l.viewW / 2, y - 14);
      ctx.fillText(b.cfg.name ?? '', l.viewW / 2, y - 14);
      ctx.fillStyle = 'rgba(20, 10, 30, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, w + 6, 18, 9);
      ctx.fill();
      const k = b.hp / b.maxHp;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#8b5cf6');
      g.addColorStop(1, '#c9a0ff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(0, w * k), 12, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(x + w / 2 - 1, y - 2, 2, 16);
      ctx.restore();
    }
  }

  private drawBanners(game: Game): void {
    const ctx = this.ctx;
    const l = this.layout;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let y = 150;
    for (const b of game.banners) {
      if (b.t < 0) continue;
      const fadeIn = Math.min(1, b.t / 0.35);
      const fadeOut = Math.min(1, (b.dur - b.t) / 0.5);
      const a = Math.min(fadeIn, fadeOut);
      ctx.globalAlpha = a;
      const rise = (1 - fadeIn) * 12;
      if (b.big) {
        ctx.font = `600 46px ${SERIF}`;
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(30, 15, 40, 0.55)';
        ctx.strokeText(b.text, l.viewW / 2, y + rise);
        const g = ctx.createLinearGradient(0, y - 24, 0, y + 24);
        g.addColorStop(0, '#fffbe8');
        g.addColorStop(1, '#ffd77a');
        ctx.fillStyle = g;
        ctx.fillText(b.text, l.viewW / 2, y + rise);
        if (b.sub) {
          ctx.font = `italic 400 18px ${SERIF}`;
          ctx.lineWidth = 4;
          wrapText(ctx, b.sub, l.viewW / 2, y + 42 + rise, Math.min(560, l.viewW - 60), 24, true);
        }
        y += b.sub ? 110 : 70;
      } else {
        ctx.font = `600 26px ${SERIF}`;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(30, 15, 40, 0.55)';
        ctx.strokeText(b.text, l.viewW / 2, y + rise);
        ctx.fillStyle = '#fff3d6';
        ctx.fillText(b.text, l.viewW / 2, y + rise);
        if (b.sub) {
          ctx.font = `400 16px ${SANS}`;
          ctx.strokeText(b.sub, l.viewW / 2, y + 30 + rise);
          ctx.fillStyle = 'rgba(255, 243, 214, 0.85)';
          ctx.fillText(b.sub, l.viewW / 2, y + 30 + rise);
        }
        y += 56;
      }
    }
    ctx.restore();
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, shine: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(30, 10, 30, 0.6)';
  ctx.stroke();
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.35, r * 0.25, r * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, stroke: boolean): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => {
    if (stroke) ctx.strokeText(ln, x, y + i * lh);
    ctx.fillStyle = 'rgba(255, 245, 225, 0.92)';
    ctx.fillText(ln, x, y + i * lh);
  });
}
