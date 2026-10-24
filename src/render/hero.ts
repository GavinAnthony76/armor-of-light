import type { Player } from '../core/player';
import { drawWeaponSilhouette } from './weapon-art';

/**
 * The traveler is a small procedural rig: joint angles are computed from the
 * player's state each frame, then limbs are drawn as shapes. The cape is a
 * tiny verlet rope so it trails naturally behind movement.
 */

interface Pose {
  bob: number; // hip drop (px, + = lower)
  lean: number; // torso tilt (rad, + = forward)
  hipF: number;
  kneeF: number;
  hipB: number;
  kneeB: number;
  armS: number; // sword arm (rad from straight down, + = forward)
  elS: number;
  blade: number;
  armH: number; // shield arm
  elH: number;
  head: number;
}

const BASE: Pose = { bob: 0, lean: 0.05, hipF: 0.12, kneeF: 0.15, hipB: -0.12, kneeB: 0.1, armS: -0.25, elS: 0.5, blade: 1.9, armH: 0.3, elH: 1.0, head: 0 };

const C = {
  steel: '#93abc2',
  steelMid: '#597189',
  steelDark: '#293b52',
  outline: '#111e30',
  gold: '#f2c14e',
  goldDeep: '#b9821f',
  cape: '#285867',
  capeDark: '#152b41',
  plume: '#e8573f',
  skin: '#2a2f45',
};

function mix(a: Pose, b: Pose, k: number): Pose {
  const o = { ...a };
  for (const key of Object.keys(a) as (keyof Pose)[]) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Piecewise interpolation through keyframes [time 0..1, pose overrides]. */
function keyed(base: Pose, keys: [number, Partial<Pose>][], k: number): Pose {
  let i = 0;
  while (i < keys.length - 2 && k > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i];
  const [t1, p1] = keys[i + 1];
  const local = Math.max(0, Math.min(1, (k - t0) / Math.max(0.0001, t1 - t0)));
  return mix({ ...base, ...p0 }, { ...base, ...p1 }, smooth(local));
}

const LUNGE_LEGS: Partial<Pose> = { hipF: 0.65, kneeF: 0.55, hipB: -0.6, kneeB: 0.35 };

function poseFor(p: Player, time: number): Pose {
  if (p.state === 'dead') {
    const k = Math.min(1, p.t / 0.6);
    return mix(BASE, { ...BASE, bob: 14, lean: 0.9, hipF: 1.3, kneeF: 2.2, hipB: -0.1, kneeB: 2.4, armS: 0.6, elS: 0.3, armH: 0.9, elH: 0.4, head: 0.5 }, smooth(k));
  }
  if (p.state === 'hurt') {
    return { ...BASE, lean: -0.45, bob: 1, hipF: 0.5, kneeF: 0.4, hipB: -0.4, kneeB: 0.6, armS: -1.6, elS: 0.4, armH: -0.4, elH: 0.6, head: -0.3 };
  }
  if (p.state === 'block') {
    const breathe = Math.sin(time * 6) * 0.03;
    return { ...BASE, bob: 3, lean: -0.06, hipF: 0.45, kneeF: 0.8, hipB: -0.55, kneeB: 0.55, armH: 1.25 + breathe, elH: 0.25, armS: -0.7, elS: 1.0, blade: 1.5, head: -0.05 };
  }
  if (p.state === 'attack') {
    const s = p.swing;
    const k = Math.min(1, p.t / s.dur);
    if (p.airSwing) {
      return keyed({ ...BASE, hipF: 0.6, kneeF: 1.1, hipB: -0.2, kneeB: 1.0 }, [
        [0, { armS: -2.9, elS: -0.2, blade: 0.2, lean: -0.1 }],
        [0.55, { armS: 2.6, elS: 0.1, blade: 0.2, lean: 0.4 }],
        [1, { armS: 1.6, elS: 0.3, blade: 0.6, lean: 0.2 }],
      ], k);
    }
    if (p.combo === 0) {
      return keyed({ ...BASE, ...LUNGE_LEGS }, [
        [0, { armS: -2.5, elS: -0.3, blade: 0.4, lean: 0.05, bob: 1 }],
        [0.2, { armS: -2.3, elS: -0.3, blade: 0.4, lean: 0.1, bob: 1 }],
        [0.5, { armS: 1.0, elS: 0.2, blade: 0.3, lean: 0.35, bob: 3 }],
        [1, { armS: 0.5, elS: 0.5, blade: 1.0, lean: 0.2, bob: 2 }],
      ], k);
    }
    if (p.combo === 1) {
      return keyed({ ...BASE, ...LUNGE_LEGS }, [
        [0, { armS: 0.2, elS: 0.1, blade: 0, lean: 0.25, bob: 3 }],
        [0.2, { armS: 0.1, elS: 0.1, blade: 0, lean: 0.25, bob: 3 }],
        [0.5, { armS: 2.6, elS: 0.1, blade: 0.25, lean: 0.05, bob: 0 }],
        [1, { armS: 2.0, elS: 0.4, blade: 0.4, lean: 0.05, bob: 1 }],
      ], k);
    }
    return keyed({ ...BASE }, [
      [0, { armS: -2.8, elS: -0.2, blade: 0.2, lean: -0.18, bob: -2, hipF: 0.3, kneeF: 0.4, hipB: -0.3, kneeB: 0.4 }],
      [0.25, { armS: -3.05, elS: -0.1, blade: 0.1, lean: -0.2, bob: -3, hipF: 0.3, kneeF: 0.4, hipB: -0.3, kneeB: 0.4 }],
      [0.5, { armS: 1.25, elS: 0.15, blade: 0.2, lean: 0.5, bob: 6, hipF: 0.9, kneeF: 1.2, hipB: -0.7, kneeB: 0.5 }],
      [1, { armS: 1.0, elS: 0.3, blade: 0.5, lean: 0.35, bob: 5, hipF: 0.9, kneeF: 1.2, hipB: -0.7, kneeB: 0.5 }],
    ], k);
  }
  if(p.dashTime>0)return {...BASE,lean:.75,bob:7,hipF:1.1,kneeF:.7,hipB:-1.1,kneeB:.4,armS:-.7,armH:1.2};
  if(!p.onGround&&p.wallGrace>0&&p.vy>0)return {...BASE,lean:-.1,hipF:.8,kneeF:1.2,hipB:.3,kneeB:.8,armH:1.6,armS:-.8};
  if (!p.onGround) {
    const rising = p.vy < 0;
    return {
      ...BASE,
      lean: 0.12,
      hipF: rising ? 0.75 : 0.35,
      kneeF: rising ? 1.3 : 0.55,
      hipB: rising ? -0.25 : -0.5,
      kneeB: rising ? 0.95 : 0.35,
      armS: -0.9,
      elS: 0.4,
      blade: 1.8,
      armH: 0.7,
      elH: 0.7,
    };
  }
  if (Math.abs(p.vx) > 30) {
    const ph = p.stride;
    const s = Math.sin(ph);
    const sp = Math.min(1, Math.abs(p.vx) / 280);
    return {
      ...BASE,
      lean: 0.22 * sp,
      bob: 1.5 - Math.abs(Math.cos(ph)) * 3 * sp,
      hipF: s * 0.8 * sp,
      kneeF: 0.25 + Math.max(0, Math.cos(ph)) * 1.2 * sp,
      hipB: -s * 0.8 * sp,
      kneeB: 0.25 + Math.max(0, -Math.cos(ph)) * 1.2 * sp,
      armS: -0.35 - s * 0.45,
      armH: 0.45 + s * 0.25,
    };
  }
  return { ...BASE, bob: Math.sin(time * 2.2) * 0.8 };
}

type V = { x: number; y: number };

export class HeroView {
  private cape: { x: number; y: number; px: number; py: number }[] = [];
  private trail: { tip: V; hilt: V; age: number; color: string | null }[] = [];
  private lastTip: V | null = null;
  private capeAccumulator=0;
  private time = 0;
  private pose:Pose={...BASE};
  shieldFlash = 0;

  reset(): void {
    this.cape = [];
    this.trail = [];this.lastTip=null;this.pose={...BASE};this.capeAccumulator=0;
  }

  update(p: Player, dt: number): void {
    this.time += dt;
    this.shieldFlash = Math.max(0, this.shieldFlash - dt * 3);
    for (const t of this.trail) t.age += dt;
    this.trail = this.trail.filter((t) => t.age < 0.12);
    const target=poseFor(p,this.time);
    this.pose=p.attacking?target:mix(this.pose,target,1-Math.exp(-dt*24));
    const pose=this.pose,f=p.facing;
    const hip={x:0,y:-30+pose.bob};
    const neck={x:hip.x+Math.sin(pose.lean)*22,y:hip.y-Math.cos(pose.lean)*22};
    const shoulder={x:hip.x+Math.sin(pose.lean)*19,y:hip.y-Math.cos(pose.lean)*19};
    const fa=pose.armS+pose.elS;
    const hand={x:shoulder.x+Math.sin(pose.armS)*12+Math.sin(fa)*11,y:shoulder.y+Math.cos(pose.armS)*12+Math.cos(fa)*11};
    const angle=fa+pose.blade;
    const W=(v:V):V=>({x:p.x+v.x*f,y:p.y+v.y});
    if(p.attacking){
      const profile=p.equippedWeapon;
      const length=profile?.kind==='spear'?80:profile?.kind==='glaive'?66:profile?.kind==='greatsword'?64:profile?.kind==='maul'?50:profile?.kind==='twinblades'?48:profile?.kind==='sabre'?58:profile?58:36;
      const grip=profile?Math.min(30,length*.48):22;
      const tip=W({x:hand.x+Math.sin(angle)*length,y:hand.y+Math.cos(angle)*length});
      const hilt=W({x:hand.x+Math.sin(angle)*grip,y:hand.y+Math.cos(angle)*grip});
      if(this.lastTip)this.trail.push({tip,hilt,age:0,color:profile?.color??null});
      this.lastTip=tip;
    }else this.lastTip=null;
    if(this.trail.length>24)this.trail.splice(0,this.trail.length-24);
    this.capeAccumulator=Math.min(.05,this.capeAccumulator+dt);
    while(this.capeAccumulator>=1/120){this.stepCape(W({x:neck.x-4,y:neck.y+2}),p,1/120);this.capeAccumulator-=1/120;}
  }

  draw(ctx: CanvasRenderingContext2D, p: Player, alpha = 1): void {
    const pose = this.pose;
    const f = p.facing;

    // joints in local space (facing right), origin at feet
    const hip: V = { x: 0, y: -30 + pose.bob };
    const neck: V = { x: hip.x + Math.sin(pose.lean) * 22, y: hip.y - Math.cos(pose.lean) * 22 };
    const shoulder: V = { x: hip.x + Math.sin(pose.lean) * 19, y: hip.y - Math.cos(pose.lean) * 19 };
    const headC: V = { x: neck.x + Math.sin(pose.lean + pose.head) * 9, y: neck.y - Math.cos(pose.lean + pose.head) * 9 };
    const leg = (a: number, k: number) => {
      const knee = { x: hip.x + Math.sin(a) * 15, y: hip.y + Math.cos(a) * 15 };
      const sa = a - k;
      const foot = { x: knee.x + Math.sin(sa) * 15, y: knee.y + Math.cos(sa) * 15 };
      return { knee, foot, sa };
    };
    const arm = (a: number, e: number) => {
      const elbow = { x: shoulder.x + Math.sin(a) * 12, y: shoulder.y + Math.cos(a) * 12 };
      const fa = a + e;
      const hand = { x: elbow.x + Math.sin(fa) * 11, y: elbow.y + Math.cos(fa) * 11 };
      return { elbow, hand, fa };
    };
    const lf = leg(pose.hipF, pose.kneeF);
    const lb = leg(pose.hipB, pose.kneeB);
    const as = arm(pose.armS, pose.elS);
    const ah = arm(pose.armH, pose.elH);
    const bladeA = as.fa + pose.blade;
    ctx.save();
    ctx.globalAlpha = alpha;

    // soft light the traveler carries
    ctx.globalCompositeOperation = 'lighter';
    const glowR = p.blocking ? 70 : 48;
    const g = ctx.createRadialGradient(p.x + f * 10, p.y - 38, 0, p.x + f * 10, p.y - 38, glowR + this.shieldFlash * 50);
    g.addColorStop(0, `rgba(255, 226, 150, ${0.22 + this.shieldFlash * 0.4})`);
    g.addColorStop(1, 'rgba(255, 226, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 140, p.y - 160, 280, 240);
    ctx.globalCompositeOperation = 'source-over';

    this.drawCape(ctx);
    this.drawTrail(ctx);

    ctx.translate(p.x, p.y);
    ctx.scale(f, 1);

    // ground shadow
    if (p.onGround) {
      ctx.fillStyle = 'rgba(20, 10, 30, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 1, 16, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // back leg
    this.limb(ctx, hip, lb.knee, lb.foot, 7, C.steelMid);
    this.boot(ctx, lb.foot, lb.sa, C.steelDark);

    // torso
    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.rotate(pose.lean);
    // tunic skirt
    ctx.fillStyle = C.capeDark;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(8, -4);
    ctx.lineTo(10, 6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    // breastplate
    const plate=ctx.createLinearGradient(-10,-24,10,0);
    plate.addColorStop(0,'#d9e0d7');plate.addColorStop(.3,'#8ba3b6');plate.addColorStop(.6,'#314860');plate.addColorStop(1,'#18283c');
    ctx.fillStyle=plate;
    ctx.strokeStyle=C.outline;ctx.lineWidth=1.3;
    ctx.beginPath();
    ctx.moveTo(-8, -1);
    ctx.quadraticCurveTo(-10, -18, -6, -24);
    ctx.lineTo(7, -24);
    ctx.quadraticCurveTo(11, -14, 8, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle='#d9ba72';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-6,-21);ctx.lineTo(-3,-13);ctx.lineTo(6,-17);ctx.moveTo(-6,-10);ctx.lineTo(6,-12);ctx.stroke();
    // belt + gold trim
    ctx.fillStyle = C.gold;
    ctx.fillRect(-8, -5, 16, 3);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -21);
    ctx.lineTo(4, -21);
    ctx.moveTo(0.5, -21);
    ctx.lineTo(0.5, -9);
    ctx.stroke();
    ctx.restore();

    // front leg
    this.limb(ctx, hip, lf.knee, lf.foot, 7, C.steel);
    this.boot(ctx, lf.foot, lf.sa, C.steelDark);

    // head: helmet with plume and glowing visor
    ctx.save();
    ctx.translate(headC.x, headC.y);
    ctx.rotate(pose.lean * 0.6 + pose.head);
    const sway = Math.sin(this.time * 7) * 0.12 - Math.min(0.5, Math.abs(p.vx) / 600);
    ctx.fillStyle = C.plume;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.quadraticCurveTo(-10, -20 + sway * 4, -20, -10 + sway * 10);
    ctx.quadraticCurveTo(-10, -12, -4, -6);
    ctx.closePath();
    ctx.fill();
    const helm=ctx.createLinearGradient(-9,-10,9,8);
    helm.addColorStop(0,'#dbe5e3');helm.addColorStop(.35,'#8bacc0');helm.addColorStop(.6,'#374b65');helm.addColorStop(1,'#1b2c40');
    ctx.fillStyle=helm;ctx.strokeStyle=C.outline;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-9,4);ctx.lineTo(-10,-4);ctx.lineTo(-6,-10);ctx.lineTo(3,-12);ctx.lineTo(9,-7);ctx.lineTo(12,-1);ctx.lineTo(9,8);ctx.lineTo(3,11);ctx.lineTo(-3,7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#e6bf70';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-6,-9);ctx.lineTo(1,-10);ctx.lineTo(6,-5);ctx.moveTo(9,3);ctx.lineTo(6,8);ctx.lineTo(0,6);ctx.stroke();
    // visor
    ctx.fillStyle = '#1b2033';
    ctx.beginPath();
    ctx.roundRect(1, -3, 10, 3.8, 1);
    ctx.fill();
    ctx.fillStyle = '#9ff3ff';
    ctx.globalAlpha = alpha * (0.75 + Math.sin(this.time * 3) * 0.2);
    ctx.fillRect(4.5, -2, 5, 2);
    ctx.globalAlpha = alpha;
    ctx.restore();

    // shield arm + shield
    this.limb(ctx, shoulder, ah.elbow, ah.hand, 6, C.steelMid);
    this.shield(ctx, ah.hand, p.blocking);

    // Keep the signature flame hammer intact; alternates use their own silhouettes.
    this.limb(ctx, shoulder, as.elbow, as.hand, 6, C.steel);
    if (p.equippedWeapon) {
      drawWeaponSilhouette(ctx, as.hand.x, as.hand.y, bladeA, p.equippedWeapon, p.weaponRank, 0.86);
    } else {
      this.hammer(ctx, as.hand, bladeA, p.state === 'attack');
    }

    ctx.restore();
  }

  private limb(ctx:CanvasRenderingContext2D,a:V,b:V,c:V,w:number,color:string):void {
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=C.outline;ctx.lineWidth=w+2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();
    for(const [u,v] of [[a,b],[b,c]]){
      const dx=v.x-u.x,dy=v.y-u.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
      const metal=ctx.createLinearGradient(u.x+nx*w,u.y+ny*w,v.x-nx*w,v.y-ny*w);
      metal.addColorStop(0,'#d1dacf');metal.addColorStop(.28,color);metal.addColorStop(1,C.steelDark);
      ctx.fillStyle=metal;ctx.strokeStyle=C.outline;ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(u.x+nx*w*.6,u.y+ny*w*.6);ctx.lineTo(v.x+nx*w*.36,v.y+ny*w*.36);ctx.lineTo(v.x-nx*w*.36,v.y-ny*w*.36);ctx.lineTo(u.x-nx*w*.6,u.y-ny*w*.6);ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.fillStyle=C.goldDeep;ctx.beginPath();ctx.arc(b.x,b.y,w*.34,0,Math.PI*2);ctx.fill();ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(b.x-1,b.y-1,1.1,0,Math.PI*2);ctx.fill();
  }

  private boot(ctx: CanvasRenderingContext2D, foot: V, a: number, color: string): void {
    ctx.save();
    ctx.translate(foot.x, foot.y);
    ctx.rotate(-a * 0.5);
    ctx.fillStyle = C.outline;
    ctx.beginPath();
    ctx.roundRect(-4.5, -4, 12.5, 6, 2.5);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-3.2, -3, 10, 4, 2);
    ctx.fill();
    ctx.restore();
  }

  private shield(ctx: CanvasRenderingContext2D, hand: V, blocking: boolean): void {
    ctx.save();
    ctx.translate(hand.x + 2, hand.y);
    const sx = blocking ? 1 : 0.62;
    const glow = blocking ? 1 : 0.45;
    // aura
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(4, 0, 2, 4, 0, 34);
    g.addColorStop(0, `rgba(255,235,170,${0.55 * glow + this.shieldFlash * 0.5})`);
    g.addColorStop(1, 'rgba(255,235,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-34, -34, 72, 68);
    ctx.globalCompositeOperation = 'source-over';
    ctx.scale(sx, 1);
    ctx.fillStyle = '#fdf6e3';
    ctx.strokeStyle = C.goldDeep;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(4, 0, 12, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(4, 0, 9, 13.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // radiant emblem
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 ? 2.5 : 7.5;
      ctx.lineTo(4 + Math.cos(a) * r * 0.8, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private hammer(ctx: CanvasRenderingContext2D, hand: V, a: number, swinging: boolean): void {
    const d={x:Math.sin(a),y:Math.cos(a)};
    const head={x:hand.x+d.x*31,y:hand.y+d.y*31};
    ctx.save();
    // A compact halo and deterministic tongues of fire, behind the metal head.
    ctx.globalCompositeOperation='lighter';
    const glow=ctx.createRadialGradient(head.x,head.y,2,head.x,head.y,swinging?33:25);
    glow.addColorStop(0,'rgba(255,220,110,0.55)');
    glow.addColorStop(.45,'rgba(255,100,22,0.20)');
    glow.addColorStop(1,'rgba(255,65,10,0)');
    ctx.fillStyle=glow;ctx.fillRect(head.x-35,head.y-35,70,70);
    ctx.globalCompositeOperation='source-over';
    for(let i=0;i<5;i++){
      const x=head.x+(i-2)*4;
      const wave=Math.sin(this.time*11+i*2.3);
      const y=head.y-4+Math.sin(i*1.9)*3;
      const length=12+(swinging?10:4)+wave*3;
      ctx.fillStyle=i%2?'#ff9c27cc':'#f25e20bb';
      ctx.beginPath();ctx.moveTo(x-5,y+4);
      ctx.bezierCurveTo(x-10,y-5,x+wave*6,y-length+5,x+wave*4,y-length);
      ctx.bezierCurveTo(x+wave*4+2,y-length+9,x+9,y-3,x+5,y+4);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffe8a6dd';ctx.beginPath();ctx.moveTo(x-2,y+3);ctx.quadraticCurveTo(x+wave*3,y-length*.65,x+3,y+3);ctx.fill();
    }
    // Wrapped handle.
    ctx.strokeStyle=C.outline;ctx.lineWidth=6.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hand.x-d.x*5,hand.y-d.y*5);ctx.lineTo(head.x,head.y);ctx.stroke();
    ctx.strokeStyle='#75432c';ctx.lineWidth=4;ctx.stroke();
    const n={x:-d.y,y:d.x};
    ctx.strokeStyle='#d6a24f';ctx.lineWidth=1.5;
    for(let k=0;k<4;k++){const t=k*5;ctx.beginPath();ctx.moveTo(hand.x+d.x*t+n.x*2,hand.y+d.y*t+n.y*2);ctx.lineTo(hand.x+d.x*(t+2)-n.x*2,hand.y+d.y*(t+2)-n.y*2);ctx.stroke();}
    // Broad forged head. Its face stays readable throughout the original combo.
    ctx.translate(head.x,head.y);ctx.rotate(Math.atan2(d.y,d.x));
    const metal=ctx.createLinearGradient(-7,-14,7,14);
    metal.addColorStop(0,'#fff4cb');metal.addColorStop(.35,'#c7b9a1');metal.addColorStop(.55,'#6e6873');metal.addColorStop(1,'#b18a53');
    ctx.fillStyle=metal;ctx.strokeStyle=C.outline;ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(-7,-10);ctx.lineTo(-3,-14);ctx.lineTo(5,-14);ctx.lineTo(9,-10);ctx.lineTo(9,10);ctx.lineTo(5,14);ctx.lineTo(-3,14);ctx.lineTo(-7,10);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#f7ca69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-11);ctx.lineTo(5,-11);ctx.moveTo(-4,11);ctx.lineTo(5,11);ctx.stroke();
    ctx.fillStyle='#fff0ac';ctx.beginPath();ctx.arc(1,0,3.2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const k = 1 - b.age / 0.12;
      const color = b.color;
      ctx.fillStyle = color ? this.rgba(color, 0.62 * k) : `rgba(255, 139, 34, ${0.65 * k})`;
      ctx.beginPath();
      ctx.moveTo(a.hilt.x, a.hilt.y);
      ctx.lineTo(a.tip.x, a.tip.y);
      ctx.lineTo(b.tip.x, b.tip.y);
      ctx.lineTo(b.hilt.x, b.hilt.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private rgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const value = Number.parseInt(clean, 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  private stepCape(anchor: V, p: Player, dt:number): void {
    const N = 7;
    const SEG = 5.5;
    if (this.cape.length !== N || Math.hypot(this.cape[0].x - anchor.x, this.cape[0].y - anchor.y) > 60) {
      this.cape = [];
      for (let i = 0; i < N; i++) {
        const x = anchor.x - p.facing * i * SEG;
        this.cape.push({ x, y: anchor.y + i * 2, px: x, py: anchor.y + i * 2 });
      }
    }
    const wind = Math.sin(this.time * 1.7) * 18 - p.facing * 25;
    for (let i = 1; i < N; i++) {
      const c = this.cape[i];
      const vx = (c.x - c.px) * 0.94;
      const vy = (c.y - c.py) * 0.94;
      c.px = c.x;
      c.py = c.y;
      c.x += vx + wind * dt * dt * 10;
      c.y += vy + 520 * dt * dt;
    }
    this.cape[0].x = anchor.x;
    this.cape[0].y = anchor.y;
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < N; i++) {
        const a = this.cape[i - 1];
        const b = this.cape[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - SEG) / d;
        if (i === 1) {
          b.x -= dx * diff;
          b.y -= dy * diff;
        } else {
          a.x += dx * diff * 0.5;
          a.y += dy * diff * 0.5;
          b.x -= dx * diff * 0.5;
          b.y -= dy * diff * 0.5;
        }
      }
      this.cape[0].x = anchor.x;
      this.cape[0].y = anchor.y;
      // keep the cape behind the body and above the ground
      for (let i = 1; i < N; i++) {
        const c = this.cape[i];
        if ((c.x - p.x) * p.facing > -2) c.x = p.x - p.facing * 2;
        if (c.y > p.y - 2) c.y = p.y - 2;
      }
    }
  }

  private drawCape(ctx: CanvasRenderingContext2D): void {
    const pts = this.cape;
    if (pts.length < 2) return;
    const left: V[] = [];
    const right: V[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const w = 3 + (i / (pts.length - 1)) * 6;
      left.push({ x: pts[i].x - (dy / d) * w, y: pts[i].y + (dx / d) * w });
      right.push({ x: pts[i].x + (dy / d) * w, y: pts[i].y - (dx / d) * w });
    }
    ctx.fillStyle = C.cape;
    ctx.strokeStyle = C.capeDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (const v of left) ctx.lineTo(v.x, v.y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
