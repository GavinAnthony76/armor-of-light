import type { Theme } from '../core/levels';

const wrap = (n: number, span: number) => ((n % span) + span) % span;

/** Deterministic presentation time. Never changes world objects or collision. */
export function sceneryTime(time: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : time;
}

export function windSway(time: number, x: number): number {
  return Math.sin(time * 1.3 + x * .013) * .018 + Math.sin(time * 2.1 + x * .021) * .006;
}

/** Screen-space distant movement, drawn BEFORE terrain, actors and warnings.
 * Bounded work; no particles are allocated into the gameplay effect pool.
 */
export function drawAtmosphere(ctx: CanvasRenderingContext2D, theme: Theme,
  time: number, camX: number, width: number, height: number, focusY: number,
  reducedMotion: boolean): void {
  const t = sceneryTime(time, reducedMotion);
  const underground = Math.max(0, Math.min(1, (focusY - 530) / 200));
  ctx.save();
  // Large soft cloud banks move independently of the player/camera.
  if (underground < 1) {
    for (let i = 0; i < 5; i++) {
      const x = wrap(i * 317 + t * (7 + i * 1.8) - camX * .045, width + 500) - 250;
      const y = height * (.13 + (i % 3) * .09);
      const g = ctx.createRadialGradient(x, y, 8, x, y, 190);
      g.addColorStop(0, theme === 'desert' ? '#ffe9bb35' : '#d9e8ee25');
      g.addColorStop(1, '#ffffff00');
      ctx.globalAlpha = 1 - underground;
      ctx.save();ctx.translate(x,y);ctx.scale(1,.2);ctx.translate(-x,-y);
      ctx.fillStyle = g;ctx.fillRect(x - 200, y - 200, 400, 400);ctx.restore();
    }
    // Small migrating silhouettes: flap rather than sliding a static decal.
    ctx.strokeStyle = theme === 'desert' ? '#63494a' : '#23384b';
    ctx.lineWidth = 1.3;ctx.globalAlpha = (1 - underground) * .5;
    for (let i = 0; i < 4; i++) {
      const x = wrap(t * 23 + i * 24 - camX * .08, width + 180) - 90;
      const y = height * .29 + Math.sin(t * .6 + i) * 8 - i * 5;
      const flap = Math.sin(t * 5 + i * .7) * 4;
      ctx.beginPath();ctx.moveTo(x - 6, y - flap);
      ctx.quadraticCurveTo(x - 2, y - 3, x, y);
      ctx.quadraticCurveTo(x + 2, y - 3, x + 6, y - flap);ctx.stroke();
    }
  }
  // Gust streaks / suspended archive dust / garden fireflies.
  const green = theme === 'garden' || theme === 'river';
  for (let i = 0; i < 28; i++) {
    const seed = i * 79.37;
    const x = wrap(seed + t * (underground > .5 ? 4 : 22 + i % 9) - camX * .15, width + 100) - 50;
    const y = wrap(i * 47.1 + Math.sin(t * .8 + i) * 13 - t * (green ? 3 : 1), height);
    ctx.globalAlpha = .13 + (Math.sin(t * 1.7 + i) + 1) * .12;
    ctx.fillStyle = green ? '#e4fba2' : underground > .5 ? '#b3ddd9' : '#ffe0a0';
    ctx.beginPath();ctx.ellipse(x, y, green ? 1.8 : underground > .5 ? 1 : 5, 1, -.15, 0, Math.PI * 2);ctx.fill();
  }
  if (underground > 0) {
    // Archive light shafts and suspended motes, not a bright overlay on combat.
    ctx.globalAlpha = underground * .045;
    ctx.fillStyle = '#f8d594';
    for (let i = 0; i < 3; i++) {
      const x = wrap(i * 373 - camX * .12 + Math.sin(t * .25 + i) * 14, width + 300) - 100;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+22,0);
      ctx.lineTo(x-65,height);ctx.lineTo(x-170,height);ctx.fill();
    }
  }
  if (theme === 'flood' || theme === 'river') {
    ctx.strokeStyle = theme === 'river' ? '#b3fff3' : '#b0dcff';ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const phase = wrap(t * .28 + i * .37, 1);
      ctx.globalAlpha = Math.sin(phase * Math.PI) * .2;
      const x = wrap(i * 137 - camX * .2, width);
      ctx.beginPath();ctx.ellipse(x,height*(.7+(i%4)*.07),8+phase*28,1+phase*3,0,0,Math.PI*2);ctx.stroke();
    }
  }
  ctx.restore();
}

/** Local flame, smoke and rising sparks around an authored decorative brazier. */
export function drawBrazier(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const phase = time * 7 + x;
  ctx.save();ctx.translate(x,y);
  const glow = ctx.createRadialGradient(0,-15,1,0,-15,58);
  glow.addColorStop(0, `rgba(255,178,71,${.18 + Math.sin(phase) * .025})`);
  glow.addColorStop(1,'#ffb04700');ctx.fillStyle=glow;ctx.fillRect(-60,-75,120,120);
  ctx.fillStyle='#493b38';ctx.fillRect(-3,-3,6,22);
  ctx.fillStyle='#a17b52';ctx.beginPath();ctx.ellipse(0,-2,10,4,0,0,Math.PI*2);ctx.fill();
  for (let i=0;i<2;i++) {
    const wobble=Math.sin(phase+i)*3;
    ctx.fillStyle=i?'#ffe4a0':'#f99c43';ctx.beginPath();
    ctx.moveTo(-7+i*3,-4);ctx.quadraticCurveTo(-11+i*4,-14,wobble,-29+i*8);
    ctx.quadraticCurveTo(12-i*4,-15,7-i*3,-4);ctx.fill();
  }
  for(let i=0;i<4;i++){
    const age=wrap(time*.5+i*.27,1);
    ctx.globalAlpha=(1-age)*.45;ctx.fillStyle='#ffcd77';
    ctx.fillRect(Math.sin(age*5+x+i)*8,-20-age*39,1.5,1.5);
  }
  ctx.restore();
}
