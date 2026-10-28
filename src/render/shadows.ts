import type { Difficulty } from '../core/config';
import type { Enemy } from '../core/enemy';

/**
 * Shadow creatures: dark, softly wobbling shapes with a violet rim and
 * glowing eyes. Warnings use two colors everywhere:
 *   gold  = blockable (raise your shield; block as it flashes to parry)
 *   red   = unblockable (jump or move away)
 */

import { productionAssets } from '../production/assets';
export const WARN_GOLD = '#ffd25e';
export const WARN_RED = '#ff4b4b';

interface Mat {
  body: string | CanvasGradient;
  rim: string;
  eye: string;
}

type Ctx = CanvasRenderingContext2D;

function material(ctx: Ctx, e: Enemy, top: number, bottom: number): Mat {
  if (e.flash > 0) return { body: '#fff4d6', rim: '#ffffff', eye: '#ffffff' };
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  const colors:Record<string,[string,string,string]>={husk:['#697487','#172334','#9aafbc'],sentinel:['#6e7959','#1d2b2b','#bcb47e'],caster:['#685779','#201b36','#bb9bd5'],thorn:['#5e8169','#1d3430','#a4cf98'],watcher:['#5d879f','#1a2d44','#9ee5ff'],colossus:['#818d9b','#273544','#d2b985'],keeper:['#785a88','#211d39','#d7a2e8'],king:['#857465','#292134','#e2c095'],warden:['#8d7762','#352e39','#d2b280']};
  const palette=colors[e.kind]||['#4a476a','#171b30','#a6a4d4'];
  g.addColorStop(0,palette[0]);g.addColorStop(.42,palette[1]);g.addColorStop(1,'#0e1420');
  let eye = '#e6d2ff';
  if (e.telegraphing) eye = e.attack?.heavy ? WARN_RED : WARN_GOLD;
  if (e.state === 'stagger') eye = '#7f6aa8';
  return { body: g, rim: e.state === 'stagger' ? '#5a4a7a' : palette[2], eye };
}

function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, t: number, wob = 0.08, rot = 0): void {
  ctx.beginPath();
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + Math.sin(a * 3 + t * 4) * wob + Math.sin(a * 5 - t * 3) * wob * 0.5;
    const x = Math.cos(a) * rx * w;
    const y = Math.sin(a) * ry * w;
    const rx2 = x * Math.cos(rot) - y * Math.sin(rot);
    const ry2 = x * Math.sin(rot) + y * Math.cos(rot);
    if (i === 0) ctx.moveTo(cx + rx2, cy + ry2);
    else ctx.lineTo(cx + rx2, cy + ry2);
  }
  ctx.closePath();
}

function fillShape(ctx: Ctx, m: Mat, rimW = 2.2): void {
  ctx.fillStyle = m.body;
  ctx.fill();
  ctx.strokeStyle = m.rim;
  ctx.globalAlpha *= 0.85;
  ctx.lineWidth = rimW;
  ctx.stroke();
  ctx.globalAlpha /= 0.85;
}

function eyes(ctx: Ctx, x: number, y: number, m: Mat, size = 3, gap = 7, glow = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 16 * glow);
  g.addColorStop(0, m.eye);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = g;
  ctx.fillRect(x - 18 * glow, y - 18 * glow, 36 * glow, 36 * glow);
  ctx.restore();
  ctx.fillStyle = m.eye;
  ctx.beginPath();
  ctx.ellipse(x - gap / 2, y, size * 0.8, size, 0, 0, Math.PI * 2);
  ctx.ellipse(x + gap / 2, y, size * 0.8, size, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 0..1 progress through the current wind-up. */
function windK(e: Enemy, diff: Difficulty): number {
  if (e.state !== 'windup' || !e.attack) return 0;
  const phaseK = e.phase >= 2 ? 0.85 : 1;
  return Math.min(1, e.t / (e.attack.windup * diff.windup * phaseK));
}

/** Arm angle for melee attackers: rest → raised during wind-up → swung. */
function swingArm(e: Enemy, diff: Difficulty, rest: number, raised: number, swung: number): number {
  const a = e.attack;
  switch (e.state) {
    case 'windup':
      return rest + (raised - rest) * Math.sqrt(windK(e, diff)) + Math.sin(e.t * 40) * 0.03;
    case 'active':
      return a ? raised + (swung - raised) * Math.min(1, e.t / Math.max(0.05, a.active * 0.7)) : swung;
    case 'recover':
      return a ? swung + (rest - swung) * Math.min(1, e.t / a.recover) : rest;
    case 'stagger':
      return rest - 0.8;
    default:
      return rest + Math.sin(e.anim * 2) * 0.12;
  }
}

function legs(ctx: Ctx, e: Enemy, m: Mat, hipY: number, spread: number, len: number, w: number): void {
  const ph = e.stride;
  const moving = Math.abs(e.vx) > 15 && e.onGround;
  const s = moving ? Math.sin(ph) * 0.5 : 0;
  ctx.strokeStyle = typeof m.body === 'string' ? m.body : '#160b26';
  ctx.lineCap = 'round';
  ctx.lineWidth = w;
  for (const [ox, a] of [
    [-spread, -s],
    [spread, s],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(ox, hipY);
    ctx.lineTo(ox + Math.sin(a) * len, hipY + Math.cos(a) * len);
    ctx.stroke();
  }
}

export function drawEnemy(ctx: Ctx, e: Enemy, diff: Difficulty, time: number, art?:import('../production/types').BodyArt): void {
  ctx.save();
  let alpha = 1;
  if (e.state === 'dying') alpha = Math.max(0, 1 - e.t / 0.6);
  if (e.state === 'spawn') alpha = Math.min(1, e.t / 0.5);
  ctx.globalAlpha = alpha;
  if(art?.mode==='replace'&&!art.bodyOnly&&art.draw()){
    ctx.restore();drawWarning(ctx,e,diff,time);return;
  }

  if (e.kind === 'serpent') {
    drawSerpent(ctx, e, diff, time);
    ctx.restore();
    if(art?.mode==='overlay'){ctx.save();ctx.globalAlpha=alpha;art.draw();ctx.restore();}
    drawWarning(ctx, e, diff, time);
    return;
  }

  // shadow pool on the ground
  if (!e.cfg.flying) {
    ctx.fillStyle = 'rgba(15, 5, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 1, e.w * 0.7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const painted=!!(art?.bodyOnly&&art.mode==='replace'&&art.draw());

  ctx.translate(e.x, e.y);
  if (e.state === 'spawn') {
    // rising out of a pool of shadow
    const k = Math.min(1, e.t / 0.6);
    ctx.scale(1, 0.2 + 0.8 * k);
  }
  ctx.scale(e.facing, 1);
  const t = time + e.id * 1.37;
  switch (e.kind) {
    case 'wisp':
      if(!painted)drawWisp(ctx, e, diff, t);
      break;
    case 'husk':
      drawHusk(ctx, e, diff, t, painted);
      break;
    case 'caster':
      drawCaster(ctx, e, diff, t, painted);
      break;
    case 'lurker':
      if(!painted)drawLurker(ctx, e, diff, t);
      break;
    case 'sentinel':
      drawSentinel(ctx, e, diff, t, painted);
      break;
    case 'colossus':
      
      drawWarden(ctx,e,diff,t);
      break;
    case 'thorn':
    case 'watcher':
    case 'keeper':
      
      drawKing(ctx,e,diff,t);
      break;
    case 'warden':
      drawWarden(ctx, e, diff, t, painted);
      break;
    case 'king':
      drawKing(ctx, e, diff, t);
      break;
  }
  if(!painted)drawArmorDetail(ctx,e,diff,t);
  if(['thorn','watcher','colossus','keeper'].includes(e.kind)){
    ctx.filter='none';ctx.strokeStyle=e.telegraphing?(e.attack?.heavy?WARN_RED:WARN_GOLD):e.kind==='thorn'?'#9fe2aa':e.kind==='watcher'?'#b1e9ff':e.kind==='colossus'?'#bfc9d4':'#dda7ff';
    ctx.lineWidth=3;const y=-e.h-10;
    if(e.kind==='watcher'){ctx.beginPath();ctx.moveTo(-12,y-30);ctx.lineTo(10,y-12);ctx.lineTo(-5,y-9);ctx.lineTo(14,y+12);ctx.stroke();}
    else if(e.kind==='thorn'){for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*12,y+18);ctx.lineTo(i*18,y-18-Math.abs(i)*4);ctx.stroke();}}
    else if(e.kind==='colossus'){ctx.strokeRect(-e.w*.55,-e.h*.7,e.w*1.1,40);ctx.strokeRect(-28,y,56,18);}
    else {ctx.beginPath();ctx.arc(0,y,30,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-45,-70);ctx.lineTo(-65+Math.sin(time*4)*8,-160);ctx.moveTo(45,-70);ctx.lineTo(65,-160);ctx.stroke();}
  }
  ctx.restore();
  if(art?.mode==='overlay'){ctx.save();ctx.globalAlpha=alpha;art.draw();ctx.restore();}
  drawWarning(ctx, e, diff, time);
}

/** Materials, layered armor and silhouette details follow the original attack poses. */
function drawArmorDetail(ctx:Ctx,e:Enemy,diff:Difficulty,t:number):void {
 if(e.kind==='wisp'){ctx.strokeStyle='#d3baff';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-4-i*5,-7+i*7);ctx.lineTo(-24-i*7-Math.sin(t*5+i)*4,-12+i*8);ctx.stroke();}return;}
 if(e.kind==='lurker'){ctx.strokeStyle='#9ba68b';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-17+i*9,-35);ctx.lineTo(-24+i*9,-49+i*2);ctx.stroke();}return;}
 const m=material(ctx,e,-e.h,0),h=e.kind==='sentinel'?104:e.kind==='warden'||e.kind==='colossus'?210:e.kind==='husk'?76:e.h;
 const w=e.kind==='warden'||e.kind==='colossus'?44:e.kind==='husk'?17:21;
 const bob=Math.sin(t*2)*.7;
 ctx.save();ctx.translate(e.kind==='husk'?4:0,bob);
 ctx.fillStyle=m.body;ctx.strokeStyle=m.rim;ctx.lineWidth=1.1;
 // Breastplate and overlapping abdominal lames.
 ctx.beginPath();ctx.moveTo(-w,-h*.76);ctx.lineTo(-w*.5,-h*.81);ctx.lineTo(w*.6,-h*.79);ctx.lineTo(w,-h*.70);ctx.lineTo(w*.65,-h*.44);ctx.lineTo(0,-h*.39);ctx.lineTo(-w*.75,-h*.48);ctx.closePath();ctx.fill();ctx.stroke();
 // Painted metal follows the same torso bob; telegraphs and weapons stay above it.
 if(['sentinel','king','keeper','watcher'].includes(e.kind)){
   const armor=productionAssets.image('shadow-armor');
   if(armor){
     const scale=Math.min(w*2.4/armor.naturalWidth,h*.44/armor.naturalHeight);
     const aw=armor.naturalWidth*scale,ah=armor.naturalHeight*scale;
     ctx.drawImage(armor,-aw/2,-h*.61-ah/2,aw,ah);
   }
 }
 ctx.globalAlpha*=.7;for(let i=0;i<3;i++){const y=-h*.57+i*5;ctx.beginPath();ctx.moveTo(-w*.7,y);ctx.lineTo(0,y+4);ctx.lineTo(w*.7,y);ctx.stroke();}ctx.globalAlpha/=.7;
 // Asymmetric pauldrons with distinct crowns and helmet ridges.
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*w*.7,-h*.77);ctx.lineTo(side*(w+7),-h*.80);ctx.lineTo(side*(w+11),-h*.68);ctx.lineTo(side*w*.75,-h*.66);ctx.closePath();ctx.fill();ctx.stroke();}
 const headY=e.kind==='warden'||e.kind==='colossus'?-h+ -6:e.kind==='husk'?-67:-h*.91;
 ctx.beginPath();ctx.moveTo(-10,headY+8);ctx.lineTo(-12,headY-6);ctx.lineTo(0,headY-15);ctx.lineTo(12,headY-6);ctx.lineTo(14,headY+4);ctx.lineTo(5,headY+12);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=e.telegraphing?(e.attack?.heavy?WARN_RED:WARN_GOLD):m.eye;
 ctx.fillRect(2,headY-2,9,2);ctx.fillStyle=m.body;
 if(e.kind==='caster'||e.kind==='watcher'){ctx.beginPath();ctx.moveTo(-15,headY+3);ctx.lineTo(-5,headY-29);ctx.lineTo(18,headY+6);ctx.stroke();}
 if(e.kind==='husk'){ctx.strokeStyle='#bdad91';ctx.beginPath();ctx.moveTo(-8,headY-6);ctx.lineTo(-17,headY-20);ctx.moveTo(8,headY-7);ctx.lineTo(18,headY-18);ctx.stroke();}
 if(e.kind==='king'||e.kind==='keeper'){ctx.strokeStyle=m.rim;ctx.beginPath();ctx.moveTo(-13,headY-9);ctx.lineTo(-17,headY-25);ctx.lineTo(-2,headY-17);ctx.lineTo(4,headY-31);ctx.lineTo(12,headY-11);ctx.stroke();}
 ctx.restore();void diff;
}

/** The warning glyph over an attacker, and a flash at the parry moment. */
function drawWarning(ctx: Ctx, e: Enemy, diff: Difficulty, time: number): void {
  if (!e.telegraphing || !e.attack) return;
  const heavy = !!e.attack.heavy;
  const col = heavy ? WARN_RED : WARN_GOLD;
  const k = windK(e, diff);
  const box = e.hurtBox();
  const x = box.x + box.w / 2;
  const y = box.y - 22 - Math.sin(time * 8) * 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 4);
  const s = 1 + (1 - Math.min(1, k * 3)) * 0.6;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.shadowColor = col;
  ctx.shadowBlur = 12;
  ctx.fillStyle = col;
  ctx.strokeStyle = '#1a0e26';
  ctx.lineWidth = 2.5;
  if (heavy) {
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(12, 9);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.fillStyle = '#1a0e26';
    ctx.fillRect(-1.6, -5, 3.2, 8);
    ctx.fillRect(-1.6, 5, 3.2, 2.4);
  } else {
    // a small shield: "block this"
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(10, -10, 10, -6);
    ctx.quadraticCurveTo(10, 6, 0, 12);
    ctx.quadraticCurveTo(-10, 6, -10, -6);
    ctx.quadraticCurveTo(-10, -10, 0, -12);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.restore();

  // parry cue: a bright flash in the last moments before it strikes
  if (!heavy) {
    const phaseK = e.phase >= 2 ? 0.85 : 1;
    const remaining = e.attack.windup * diff.windup * phaseK - e.t;
    if (remaining < diff.parryWindow * 0.9 && remaining > -0.02) {
      const c = e.kind === 'serpent' ? e.head : e.center();
      const r = 16 + (1 - remaining / (diff.parryWindow * 0.9)) * 22;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255, 245, 210, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ------------------------------------------------------------ creatures

function drawWisp(ctx: Ctx, e: Enemy, diff: Difficulty, t: number): void {
  const m = material(ctx, e, -20, 20);
  const k = windK(e, diff);
  const sp = Math.hypot(e.vx, e.vy);
  const tail = 22 + Math.min(30, sp * 0.05) + k * 8;
  const r = 15 + k * 3;
  // flame body with a tail trailing behind
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.bezierCurveTo(r, -r * 1.2, -r * 0.6, -r * 1.1, -tail, Math.sin(t * 9) * 6);
  ctx.bezierCurveTo(-r * 0.6, r * 1.1, r, r * 1.2, r, 0);
  ctx.closePath();
  fillShape(ctx, m);
  if (e.telegraphing) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.4 * k;
    ctx.fillStyle = m.eye;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  eyes(ctx, 5, -2, m, 3, 8);
}

function drawHusk(ctx: Ctx, e: Enemy, diff: Difficulty, t: number, painted=false): void {
  const m = material(ctx, e, -80, 0);
  const k = windK(e, diff);
  if(!painted){
  legs(ctx, e, m, -22, 7, 22, 9);
  // hunched body
  blob(ctx, 0, -42, 17, 25, t, 0.06, 0.32 + k * 0.15);
  fillShape(ctx, m);
  // head
  blob(ctx, 13, -66 + k * 2, 10, 9, t * 1.3, 0.05);
  fillShape(ctx, m);
  eyes(ctx, 16, -67 + k * 2, m, 2.4, 6);
  }
  // long clawed arm
  const a = swingArm(e, diff, 0.25, -2.5, 1.5);
  const sx = 8;
  const sy = -56;
  const ex = sx + Math.sin(a) * 18;
  const ey = sy + Math.cos(a) * 18;
  const hx = ex + Math.sin(a + 0.3) * 20;
  const hy = ey + Math.cos(a + 0.3) * 20;
  ctx.strokeStyle = painted ? '#6d5540' : '#1a0d2c';
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = e.telegraphing ? m.eye : painted ? '#c2aa7e' : '#8a62d9';
  ctx.lineWidth = 2.5;
  for (const off of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.sin(a + 0.3 + off) * 11, hy + Math.cos(a + 0.3 + off) * 11);
    ctx.stroke();
  }
  if (e.state === 'active') arcSwipe(ctx, sx, sy, 44, -1.4, 1.6, m.eye);
}

function arcSwipe(ctx: Ctx, x: number, y: number, r: number, a0: number, a1: number, color: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = 6;
  ctx.beginPath();
  // angles are "from straight down"; convert to canvas angles
  ctx.arc(x, y, r, Math.PI / 2 - a1, Math.PI / 2 - a0);
  ctx.stroke();
  ctx.restore();
}

function drawCaster(ctx: Ctx, e: Enemy, diff: Difficulty, t: number, painted=false): void {
  const m = material(ctx, e, -86, 0);
  const k = windK(e, diff);
  const sway = Math.sin(t * 2) * 2;
  if(!painted){
  // robe
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-18 + i * 6, -((i % 2) * 5) + Math.sin(t * 6 + i) * 1.5);
  ctx.lineTo(14, -40);
  ctx.quadraticCurveTo(8 + sway, -78, 0 + sway, -84);
  ctx.quadraticCurveTo(-14 + sway, -78, -16, -40);
  ctx.closePath();
  fillShape(ctx, m);
  // hood opening
  ctx.fillStyle = '#05020b';
  ctx.beginPath();
  ctx.ellipse(6 + sway, -66, 8, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  eyes(ctx, 8 + sway, -66, m, 2.2, 5);
  }
  // arm and gathering orb
  const reach = e.state === 'windup' ? 10 + k * 14 : e.state === 'active' ? 26 : 6;
  ctx.strokeStyle = painted ? '#5d4564' : '#1a0d2c';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, -50);
  ctx.lineTo(10 + reach, -52);
  ctx.stroke();
  if (e.state === 'windup') {
    const r = 4 + k * 9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(12 + reach, -52, 0, 12 + reach, -52, r * 2.5);
    g.addColorStop(0, '#f4dcff');
    g.addColorStop(0.4, '#a46bff');
    g.addColorStop(1, 'rgba(120,60,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(12 + reach, -52, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawLurker(ctx: Ctx, e: Enemy, diff: Difficulty, t: number): void {
  const m = material(ctx, e, -50, 0);
  const k = windK(e, diff);
  const air = !e.onGround;
  const crouch = e.state === 'windup' ? k : 0;
  const ry = air ? 14 : 16 - crouch * 5;
  const rx = air ? 34 : 28 + crouch * 5;
  const cy = air ? -24 : -18 + crouch * 4;
  // legs
  ctx.strokeStyle = '#140a24';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const step = Math.abs(e.vx) > 15 && e.onGround ? Math.sin(e.anim * 12) * 4 : 0;
  ctx.beginPath();
  ctx.moveTo(-14, cy + 4);
  ctx.lineTo(-26, air ? cy + 6 : -12 + crouch * 6);
  ctx.lineTo(-18 + step, air ? cy + 18 : 0);
  ctx.moveTo(14, cy + 4);
  ctx.lineTo(20 - step, air ? cy + 16 : 0);
  ctx.stroke();
  blob(ctx, 0, cy, rx, ry, t, 0.05, air ? -0.2 : 0);
  fillShape(ctx, m);
  // spines
  ctx.fillStyle = '#1b0e30';
  for (let i = 0; i < 4; i++) {
    const sx = -16 + i * 9;
    ctx.beginPath();
    ctx.moveTo(sx - 4, cy - ry + 3);
    ctx.lineTo(sx, cy - ry - 7 - (i % 2) * 3);
    ctx.lineTo(sx + 4, cy - ry + 3);
    ctx.fill();
  }
  // head + jaw
  const open = e.state === 'active' && e.attack?.id === 'lurkerSnap' ? 0.6 : crouch * 0.3;
  ctx.save();
  ctx.translate(rx - 4, cy - 4);
  blob(ctx, 4, 0, 13, 10, t, 0.04);
  fillShape(ctx, m);
  ctx.strokeStyle = m.eye;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(16, 3 + open * 8);
  ctx.stroke();
  eyes(ctx, 7, -4, m, 2.2, 6);
  ctx.restore();
}

function drawSentinel(ctx: Ctx, e: Enemy, diff: Difficulty, t: number, painted=false): void {
  const m = material(ctx, e, -96, 0);
  const k = windK(e, diff);
  if(!painted){
  legs(ctx, e, m, -32, 7, 32, 10);
  // armored torso
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(-16, -72);
  ctx.lineTo(-6, -82);
  ctx.lineTo(8, -82);
  ctx.lineTo(16, -70);
  ctx.lineTo(13, -30);
  ctx.closePath();
  fillShape(ctx, m);
  // helm with a crest
  ctx.beginPath();
  ctx.moveTo(-8, -82);
  ctx.lineTo(-6, -98);
  ctx.lineTo(0, -108);
  ctx.lineTo(4, -98);
  ctx.lineTo(10, -96);
  ctx.lineTo(9, -82);
  ctx.closePath();
  fillShape(ctx, m);
  eyes(ctx, 6, -92, m, 2, 5);
  }
  // spear (thrusts forward)
  let reach = 0;
  if (e.state === 'windup') reach = -14 * Math.sqrt(k);
  else if (e.state === 'active') reach = 46;
  else if (e.state === 'recover') reach = 46 * Math.max(0, 1 - e.t / 0.3);
  ctx.strokeStyle = '#2a1846';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30 + reach, -60);
  ctx.lineTo(56 + reach, -60);
  ctx.stroke();
  ctx.fillStyle = e.telegraphing ? m.eye : '#b48cff';
  ctx.beginPath();
  ctx.moveTo(56 + reach, -65);
  ctx.lineTo(72 + reach, -60);
  ctx.lineTo(56 + reach, -55);
  ctx.closePath();
  ctx.fill();
  // tall shield, lowered when its guard is broken
  const broken = e.guardBroken > 0;
  const raised = e.guarding;
  ctx.save();
  ctx.translate(20, raised ? -56 : -34);
  ctx.rotate(raised ? 0 : broken ? 0.9 : 0.5);
  ctx.beginPath();
  ctx.moveTo(-6, -30);
  ctx.lineTo(8, -26);
  ctx.lineTo(9, 14);
  ctx.lineTo(0, 30);
  ctx.lineTo(-7, 14);
  ctx.closePath();
  ctx.fillStyle = e.flash > 0 ? '#fff4d6' : '#1d1030';
  ctx.fill();
  ctx.strokeStyle = broken ? '#ffb35e' : '#b48cff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (broken) {
    ctx.strokeStyle = '#ffb35e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(4, -4);
    ctx.lineTo(-2, 6);
    ctx.lineTo(3, 18);
    ctx.stroke();
  }
  ctx.restore();
  void t;
}

function drawWarden(ctx: Ctx, e: Enemy, diff: Difficulty, t: number, painted=false): void {
  const m = material(ctx, e, -210, 0);
  const k = windK(e, diff);
  const id = e.attack?.id;
  // pillar legs
  const ph = Math.abs(e.vx) > 10 ? Math.sin(e.stride*.5) * 6 : 0;
  if(!painted){
  ctx.fillStyle = '#140a22';
  ctx.beginPath();
  ctx.roundRect(-38 + ph, -70, 26, 70, 8);
  ctx.roundRect(12 - ph, -70, 26, 70, 8);
  ctx.fill();
  }
  // great body
  const lean = id === 'slam' && e.state === 'windup' ? -0.12 * k : id === 'slam' && e.state === 'active' ? 0.25 : 0;
  ctx.save();
  ctx.translate(0, -70);
  ctx.rotate(lean);
  if(!painted){
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-64, -70, -46, -124);
  ctx.quadraticCurveTo(0, -150, 46, -124);
  ctx.quadraticCurveTo(64, -70, 40, 0);
  ctx.closePath();
  fillShape(ctx, m, 3);
  // sand-stone cracks
  ctx.strokeStyle = 'rgba(155,107,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, -20);
  ctx.lineTo(-18, -50);
  ctx.lineTo(-26, -80);
  ctx.moveTo(28, -30);
  ctx.lineTo(18, -60);
  ctx.stroke();
  // glowing heart-core: brighter when exposed after a slam
  const exposed = id === 'slam' && e.state === 'recover';
  const coreCol = e.telegraphing ? m.eye : exposed ? '#fff0c0' : '#a77bff';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, -70, 0, 0, -70, exposed ? 40 : 26);
  g.addColorStop(0, coreCol);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-50, -120, 100, 100);
  ctx.restore();
  // head
  blob(ctx, 6, -146, 18, 15, t, 0.05);
  fillShape(ctx, m, 3);
  eyes(ctx, 12, -148, m, 3.6, 11, 1.4);
  }
  // arms
  const front = id === 'sweep' ? swingArm(e, diff, 0.2, -1.9, 2.2) : id === 'slam' ? swingArm(e, diff, 0.2, -2.9, 0.5) : id === 'summon' ? -2.6 * Math.sqrt(k) : 0.2 + Math.sin(e.anim * 1.5) * 0.08;
  const back = id === 'slam' ? front : -0.2 + Math.sin(e.anim * 1.5 + 1) * 0.08;
  for (const [sx, a, shade] of [
    [-40, back, '#0e0619'],
    [40, front, '#1a0d2e'],
  ] as const) {
    const ex = sx + Math.sin(a) * 50;
    const ey = -110 + Math.cos(a) * 50;
    ctx.strokeStyle = shade;
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, -110);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(ex, ey, 20, 0, Math.PI * 2);
    ctx.fill();
    if(painted){
      // Texture the original moving arm capsule and fist, not a new pose or
      // hitbox. Reuse the resident body stone instead of loading another sheet.
      const stone=productionAssets.image('warden-painted-body');
      if(stone){
        ctx.save();ctx.translate(sx,-110);ctx.rotate(-a);
        ctx.beginPath();ctx.roundRect(-12,-12,24,74,12);
        ctx.moveTo(20,50);ctx.arc(0,50,20,0,Math.PI*2);ctx.clip();
        ctx.drawImage(stone,200,116,100,100,-46,-12,92,92);
        ctx.restore();
        // Paths aren't restored by canvas save/restore; rebuild the fist rim.
        ctx.beginPath();ctx.arc(ex,ey,20,0,Math.PI*2);
      }
    }
    ctx.strokeStyle = e.telegraphing ? m.eye : 'rgba(155,107,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  if (id === 'sweep' && e.state === 'active') arcSwipe(ctx, 40, -180, 100, -1.2, 2.2, m.eye);
}

function drawKing(ctx: Ctx, e: Enemy, diff: Difficulty, t: number): void {
  const m = material(ctx, e, -140, 0);
  const k = windK(e, diff);
  const id = e.attack?.id;
  // tattered cape
  ctx.fillStyle = '#0b0514';
  ctx.beginPath();
  ctx.moveTo(-6, -108);
  for (let i = 0; i <= 5; i++) {
    const y = -108 + i * 20;
    ctx.lineTo(-24 - i * 5 + Math.sin(t * 3 + i) * 5, y);
  }
  ctx.lineTo(-10, -10);
  ctx.closePath();
  ctx.fill();
  legs(ctx, e, m, -50, 9, 50, 13);
  // torso armor
  ctx.beginPath();
  ctx.moveTo(-18, -48);
  ctx.lineTo(-22, -100);
  ctx.lineTo(-10, -114);
  ctx.lineTo(14, -114);
  ctx.lineTo(24, -98);
  ctx.lineTo(18, -48);
  ctx.closePath();
  fillShape(ctx, m, 2.6);
  // helm + crown
  ctx.beginPath();
  ctx.roundRect(-10, -138, 22, 26, 7);
  fillShape(ctx, m, 2.4);
  ctx.fillStyle = '#3a2456';
  ctx.beginPath();
  ctx.moveTo(-12, -136);
  for (let i = 0; i < 5; i++) {
    const x = -12 + i * 6.5;
    ctx.lineTo(x + 3, -150 - (i % 2 ? 0 : 6));
    ctx.lineTo(x + 6.5, -136);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = e.phase >= 2 ? '#ff7a9a' : '#c9a0ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  eyes(ctx, 6, -126, m, 2.4, 7, 1.2);
  // greatsword
  let a: number;
  if (id === 'combo1' || id === 'combo3') a = swingArm(e, diff, 0.6, -2.6, 1.7);
  else if (id === 'combo2') a = swingArm(e, diff, 1.7, 0.2, 2.8);
  else if (id === 'kingDash') a = e.state === 'windup' ? 1.6 - k * 0.2 : 1.55;
  else if (id === 'kingWave' || id === 'kingLeap') a = e.state === 'windup' ? 0.6 - 3.4 * Math.sqrt(k) : 1.4;
  else a = 0.6 + Math.sin(e.anim * 1.8) * 0.1;
  const sx = 10;
  const sy = -100;
  const hx = sx + Math.sin(a) * 24;
  const hy = sy + Math.cos(a) * 24;
  ctx.strokeStyle = '#1a0d2c';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  const bx = Math.sin(a);
  const by = Math.cos(a);
  ctx.strokeStyle = '#120820';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx + bx * 78, hy + by * 78);
  ctx.stroke();
  ctx.strokeStyle = e.telegraphing ? m.eye : e.phase >= 2 ? '#ff7a9a' : '#b48cff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#3a2456';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hx - by * 10, hy + bx * 10);
  ctx.lineTo(hx + by * 10, hy - bx * 10);
  ctx.stroke();
  if (e.state === 'active' && id && id.startsWith('combo')) arcSwipe(ctx, sx, sy, 90, id === 'combo2' ? 0.2 : -2.4, id === 'combo2' ? 2.8 : 1.7, m.eye);
}

function drawSerpent(ctx: Ctx, e: Enemy, diff: Difficulty, t: number): void {
  const m = material(ctx, e, e.head.y - 40, e.y + 80);
  const k = windK(e, diff);
  const baseX = e.homeX + 30;
  const baseY = e.y + 60;
  const hx = e.head.x;
  const hy = e.head.y;
  const cx = (baseX + hx) / 2 + 60;
  const cy = Math.min(baseY, hy) - 40;
  // neck: a tapered curve built from offsets along a bezier
  const N = 18;
  const pts: { x: number; y: number; nx: number; ny: number; w: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = (1 - u) * (1 - u) * baseX + 2 * (1 - u) * u * cx + u * u * hx;
    const y = (1 - u) * (1 - u) * baseY + 2 * (1 - u) * u * cy + u * u * hy + Math.sin(u * 6 + t * 3) * 4 * (1 - u);
    const dx = 2 * (1 - u) * (cx - baseX) + 2 * u * (hx - cx);
    const dy = 2 * (1 - u) * (cy - baseY) + 2 * u * (hy - cy);
    const d = Math.hypot(dx, dy) || 1;
    pts.push({ x, y, nx: -dy / d, ny: dx / d, w: 30 - u * 12 });
  }
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x + p.nx * p.w, p.y + p.ny * p.w) : ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w)));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x - pts[i].nx * pts[i].w, pts[i].y - pts[i].ny * pts[i].w);
  ctx.closePath();
  fillShape(ctx, m, 3);
  // dorsal fins
  ctx.fillStyle = '#1d0f33';
  for (let i = 3; i < N - 2; i += 2) {
    const p = pts[i];
    ctx.beginPath();
    ctx.moveTo(p.x - p.nx * p.w, p.y - p.ny * p.w);
    ctx.lineTo(p.x - p.nx * (p.w + 14), p.y - p.ny * (p.w + 14));
    ctx.lineTo(pts[i + 1].x - pts[i + 1].nx * pts[i + 1].w, pts[i + 1].y - pts[i + 1].ny * pts[i + 1].w);
    ctx.fill();
  }
  // head facing left
  const open = e.attack?.id === 'spit' && e.state === 'windup' ? k * 0.5 : e.attack?.id === 'bite' && (e.state === 'windup' || e.state === 'active') ? 0.6 : 0.1;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.moveTo(-24, -18);
  ctx.quadraticCurveTo(10, -30, 44, -6 - open * 10);
  ctx.lineTo(10, 0);
  ctx.lineTo(44, 8 + open * 22);
  ctx.quadraticCurveTo(10, 26, -24, 16);
  ctx.closePath();
  fillShape(ctx, m, 3);
  eyes(ctx, 14, -12, m, 3.4, 9, 1.3);
  ctx.restore();
  // water churn at the base
  ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(baseX - 20 + i * 14, e.y + 6 + Math.sin(t * 4 + i) * 2, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
