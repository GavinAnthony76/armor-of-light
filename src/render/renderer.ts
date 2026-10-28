import {asset} from '../assets';
import { drawWeapon } from './weapons';
import { drawLightstones } from './ranged';
import { WEAPONS } from '../core/weapons';
import { VIEW_H, VIEW_W_MAX, VIEW_W_MIN } from '../core/config';
import type { Sign } from '../core/levels';
import type { Game } from '../game';
import type { InputMode } from '../input';
import { drawEnemy, WARN_RED } from './shadows';
import { drawJourney } from './journey';

export interface Layout {
  w: number; // CSS px viewport
  h: number;
  dpr: number;
  scale: number; // CSS px per world unit
  viewH: number; // visible vertical world span (camera framing, not physics)
  touch: boolean;
  controlsH: number; // CSS pixels reserved for the touch dock
  viewW: number; // world units visible horizontally
  ox: number; // CSS px offset of the game view
  oy: number;
  portrait: boolean;
  zoom: number; // world magnification inside the view
}

export const SERIF = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif';
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Touch fills the safe viewport above a compact dock; desktop keeps its framing. */
export function computeLayout(w:number,h:number,touch=false,insets={top:0,right:0,bottom:0,left:0}):Layout {
  const dpr=Math.min(window.devicePixelRatio||1,2),portrait=h>w*1.05;
  const controlsH=touch&&portrait?184:0;
  const aw=Math.max(1,w-insets.left-insets.right),ah=Math.max(1,h-insets.top-insets.bottom-controlsH);
  if(touch){
    // Landscape keeps Eliam readable; portrait adds sky rather than empty letterboxing.
    const scale=portrait?aw/540:ah/Math.max(320,Math.min(VIEW_H,ah/.85));
    return {w,h,dpr,scale,viewW:aw/scale,viewH:ah/scale,touch,controlsH,ox:insets.left,oy:insets.top,portrait,zoom:1};
  }
  const viewW=portrait?720:Math.max(VIEW_W_MIN,Math.min(VIEW_W_MAX,aw/ah*VIEW_H));
  const scale=Math.min(aw/viewW,ah/VIEW_H);
  return {w,h,dpr,scale,viewW,viewH:VIEW_H,touch,controlsH,ox:insets.left+(aw-viewW*scale)/2,oy:insets.top+(ah-VIEW_H*scale)/2,portrait,zoom:1};
}

/** Follow high traversal while retaining a little ground beneath Eliam. */
export function cameraTop(viewH:number,playerY:number,zoom=1,footRoom=90):number {
  return Math.min(450+footRoom-viewH/zoom,playerY-Math.min(170,viewH/zoom*.4));
}

const SIGN_TEXT: Record<Sign['key'], Record<InputMode, string>> = {
  double:{keyboard:'Tap jump again in the air · one extra leap per landing',touch:'Tap JUMP again in the air for your second leap',gamepad:'Press A again in the air · land to recharge'},
  dash:{keyboard:'L / V to dash · strike, then jump to keep moving',touch:'DASH past danger · jump after a strike',gamepad:'LB to dash · jump after a strike'},
  wall:{keyboard:'Hold toward the wall, then jump to kick away',touch:'Hold toward the wall and tap JUMP to kick away',gamepad:'Hold toward the wall and press A to kick away'},
  move: { keyboard: '← →  or  A D  to walk', touch: 'Slide on the pad to walk', gamepad: 'Stick or D-pad to walk' },
  jump: { keyboard: 'Space  or  W  to jump', touch: 'Tap  JUMP  to leap', gamepad: 'Press  A  to jump' },
  attack: { keyboard: 'J light · I heavy', touch: 'STRIKE is light · HEAVY breaks guards', gamepad: 'X light · RT heavy' },
  block: { keyboard: 'Hold  K  or  C  to raise your shield', touch: 'Hold  SHIELD  to block', gamepad: 'Hold  B  to block' },
  parry: { keyboard: 'Block as a gold warning flashes to PARRY', touch: 'Block as a gold warning flashes to PARRY', gamepad: 'Block as a gold warning flashes to PARRY' },
  red: { keyboard: 'Red warnings can’t be blocked: jump or move', touch: 'Red warnings can’t be blocked: jump or move', gamepad: 'Red warnings can’t be blocked: jump or move' },
  combo: { keyboard: 'J · J · I for an Ember finisher', touch: 'STRIKE · STRIKE · HEAVY to finish', gamepad: 'X · X · RT for an Ember finisher' },
  water: { keyboard: 'Jump the gaps. The water is deep.', touch: 'Jump the gaps. The water is deep.', gamepad: 'Jump the gaps. The water is deep.' },
  shield: { keyboard: 'Heavy opens a guard · or parry / flank', touch: 'HEAVY opens a guard · or parry / flank', gamepad: 'RT opens a guard · or parry / flank' },
};

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  layout: Layout;
  private desertArt:HTMLImageElement[]=[];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.layout = this.resize();
    this.desertArt=['desert-sky-v2.webp','desert-aqueduct-v2.webp','desert-archive-v2.webp'].map(name=>{const im=new Image();im.src=asset('assets/'+name);return im;});
  }

  resize(): Layout {
    const style=getComputedStyle(document.documentElement);
    const inset=(key:string)=>parseFloat(style.getPropertyValue('--safe-'+key))||0;
    const w=Math.min(window.innerWidth,window.visualViewport?.width??Infinity),h=Math.min(window.innerHeight,window.visualViewport?.height??Infinity);
    const touch=(window.matchMedia?.('(pointer: coarse)').matches??false)||new URLSearchParams(location.search).has('touch');
    const l=computeLayout(w,h,touch,{top:inset('top'),right:inset('right'),bottom:inset('bottom'),left:inset('left')});
    document.body.style.width=`${w}px`;document.body.style.height=`${h}px`;
    document.body.classList.toggle('mobile-layout',touch);
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
    const camTop = cameraTop(l.viewH,s.player.y,Z,l.touch&&!l.portrait?Math.max(90,106/l.scale):90)+Math.max(0,s.player.y-450);
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
    ctx.rect(0, 0, l.viewW, l.viewH);
    ctx.clip();

    if(s.def.id===0)this.drawDesertDepth(game);
    else world.drawBackground(ctx, game.camX, l.viewW, game.time,l.viewH);

    // ---------------- world space
    ctx.save();
    ctx.scale(Z, Z);
    ctx.translate(-Math.round(game.camX * 4) / 4 + sx, -camTop + sy);
    const camX = game.camX;
    world.drawProps(ctx, s.terrain, camX, worldW, game.time, game.gateOpen);
    this.drawExit(game);
    world.drawTerrain(ctx, s.terrain, camX, worldW, game.time,Math.max(VIEW_H,camTop+l.viewH/Z));
    if(s.def.id===0)this.drawDesertLandmarks(game);
    if (!game.demo) for (const sign of s.def.signs.filter(q=>Math.abs(q.x-s.player.x)<170).sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x)).slice(0,1)) this.drawSign(sign, s.terrain.groundAt(sign.x) ?? 450, inputMode);
    this.drawPickups(game);
    this.drawWeaponDrops(game);
    drawJourney(ctx,s,game.time,camX,worldW);
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
    drawLightstones(ctx,s.ranged.stones);
    this.drawArenaWalls(game);
    game.fx.drawBase(ctx);
    game.fx.drawGlow(ctx);
    this.drawTexts(game);
    ctx.restore();

    // ---------------- screen space
    world.drawWeather(ctx, camX, l.viewW, frameDt, game.time,l.viewH);
    if(s.def.id===0)this.drawDesertForeground(game);
    if (game.hurtFlash > 0) {
      const g = ctx.createRadialGradient(l.viewW / 2, l.viewH / 2, l.viewH * 0.3, l.viewW / 2, l.viewH / 2, l.viewW * 0.7);
      g.addColorStop(0, 'rgba(255, 40, 40, 0)');
      g.addColorStop(1, `rgba(200, 20, 40, ${game.hurtFlash * 0.55})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, l.viewW, l.viewH);
    }
    if (game.whiteFlash > 0 && !game.reduceMotion) {
      ctx.fillStyle = `rgba(255, 248, 225, ${game.whiteFlash * 0.6})`;
      ctx.fillRect(0, 0, l.viewW, l.viewH);
    }
    if (s.phase === 'dead') {
      ctx.fillStyle = `rgba(255, 244, 220, ${Math.min(0.5, s.phaseT * 0.5)})`;
      ctx.fillRect(0, 0, l.viewW, l.viewH);
    }
    if (!game.demo) this.drawHud(game);
    this.drawBanners(game);
    ctx.restore();
  }

  // ------------------------------------------------------------ world

  private drawDesertDepth(game:Game):void {
    const c=this.ctx,l=this.layout,t=game.time,depth=Math.max(0,Math.min(1,(game.stage!.player.y-500)/220));
    const cover=(im:HTMLImageElement,rate:number)=>{if(!im.complete||!im.naturalWidth)return;const h=Math.max(l.viewH,l.viewW/1.5),w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,-Math.min(Math.max(0,w-l.viewW),game.camX*rate),(l.viewH-h)/2,w,h);};
    c.save();c.fillStyle='#d79962';c.fillRect(0,0,l.viewW,l.viewH);cover(this.desertArt[0],.035);
    const ruins=this.desertArt[1];
    if(ruins.complete&&ruins.naturalWidth){const h=l.viewH*.95,w=h*ruins.naturalWidth/ruins.naturalHeight;const offset=((game.camX*.28)%w+w)%w;c.globalAlpha=.8;for(let x=-offset-w;x<l.viewW;x+=w)c.drawImage(ruins,x,l.viewH-h,w,h);c.globalAlpha=1;}
    // Independent cloud movement is visible even when Eliam stands still.
    c.fillStyle='rgba(255,228,185,.045)';for(let i=0;i<8;i++){const x=((i*230+t*(8+i%3)-game.camX*.06)%(l.viewW+300)+l.viewW+300)%(l.viewW+300)-150;c.beginPath();c.ellipse(x,45+i%3*29,95,12,0,0,Math.PI*2);c.fill();}
    if(depth>0){c.globalAlpha=depth;c.fillStyle='#10232c';c.fillRect(0,0,l.viewW,l.viewH);cover(this.desertArt[2],.12);c.globalAlpha=depth*.18;const g=c.createLinearGradient(0,0,0,l.viewH);g.addColorStop(0,'#eab65c');g.addColorStop(1,'#92e7e000');c.fillStyle=g;for(let i=0;i<3;i++){const x=(i*390-game.camX*.15+t*2)%(l.viewW+400);c.beginPath();c.moveTo(x,0);c.lineTo(x+45,0);c.lineTo(x-90,l.viewH);c.lineTo(x-220,l.viewH);c.fill();}}
    c.restore();
  }

  private drawDesertForeground(game:Game):void {
    const c=this.ctx,l=this.layout,im=this.desertArt[1];if(!im.complete||!im.naturalWidth||game.stage!.player.y>620)return;
    c.save();c.beginPath();c.rect(0,0,Math.min(55,l.viewW*.055),l.viewH);c.rect(l.viewW-Math.min(55,l.viewW*.055),0,Math.min(55,l.viewW*.055),l.viewH);c.clip();c.globalAlpha=.26;
    const h=l.viewH*1.5,w=h*im.naturalWidth/im.naturalHeight,off=(game.camX*1.12)%w;
    for(let x=-off-w;x<l.viewW;x+=w)c.drawImage(im,x,l.viewH-h,w,h);c.restore();
  }

  private drawDesertLandmarks(game:Game):void {
    const c=this.ctx,s=game.stage!,t=game.time;
    for(const x of [1320,2180,4450,4740,5090,6180]){
      if(x<game.camX-100||x>game.camX+game.viewW+100)continue;
      const y=s.terrain.groundAt(x)??450;
      c.save();c.strokeStyle='#594331';c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-110);c.stroke();
      c.fillStyle='#ae7254';c.beginPath();c.moveTo(x,y-108);for(let i=1;i<=8;i++)c.lineTo(x+i*7,y-108+i*.9+Math.sin(t*3+i*.7)*4);for(let i=8;i>=1;i--)c.lineTo(x+i*7,y-86+i*.6+Math.sin(t*3+i*.7)*4);c.lineTo(x,y-86);c.fill();c.restore();
    }
    for(const sign of [{x:1900,y:390,text:'ARCHIVE ↓'},{x:3250,y:840,text:'SEAL GATE ↗'}]){
      c.save();c.fillStyle='#12212be6';c.strokeStyle='#dbbd7d';c.lineWidth=2;c.beginPath();c.roundRect(sign.x-74,sign.y-25,148,35,6);c.fill();c.stroke();c.fillStyle='#ffe0a0';c.font='700 14px '+SANS;c.textAlign='center';c.fillText(sign.text,sign.x,sign.y-3);c.restore();
    }
    if(!s.archiveGateOpen){
      const x=3700;c.save();c.fillStyle='#514735';c.fillRect(x,145,60,305);c.strokeStyle='#d2ae63';c.lineWidth=4;c.strokeRect(x+4,149,52,301);
      c.fillStyle=s.beaconSeal?'#ffd579':'#74665a';c.beginPath();c.arc(x+30,300,18,0,Math.PI*2);c.fill();c.fillStyle='#222536';c.fillRect(x+26,287,8,26);c.restore();
    }
    if(s.archiveKeeperDefeated&&!s.beaconSeal){
      c.save();c.translate(3070,865+Math.sin(t*3)*4);c.shadowColor='#ffda6e';c.shadowBlur=15;c.fillStyle='#ffe29a';c.beginPath();c.moveTo(0,-18);c.lineTo(16,0);c.lineTo(0,18);c.lineTo(-16,0);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#8f642b';c.lineWidth=3;c.strokeRect(-6,-6,12,12);c.restore();
    }
    const keeper=s.active?.def.sealGuardian?s.enemies.find(e=>e.alive):null;
    if(keeper){c.save();c.textAlign='center';c.font='700 15px '+SANS;c.lineWidth=4;c.strokeStyle='#10121e';c.fillStyle='#ffe2a0';c.strokeText('ARCHIVE KEEPER',keeper.x,keeper.y-123);c.fillText('ARCHIVE KEEPER',keeper.x,keeper.y-123);c.fillStyle='#191c2b';c.fillRect(keeper.x-45,keeper.y-112,90,6);c.fillStyle='#e6b86a';c.fillRect(keeper.x-45,keeper.y-112,90*Math.max(0,keeper.hp/keeper.maxHp),6);c.restore();}
    const x=7410,y=450,lit=s.pathOpen;
    c.save();c.fillStyle='#8b6745';c.fillRect(x-18,y-120,36,120);c.fillStyle='#e5c38b';c.fillRect(x-28,y-126,56,12);
    if(lit){
      const g=c.createRadialGradient(x,y-144,2,x,y-144,95);g.addColorStop(0,'#ffd46a88');g.addColorStop(1,'#ffd46a00');c.fillStyle=g;c.fillRect(x-95,y-239,190,190);
      c.fillStyle='#ffb545';c.beginPath();c.moveTo(x-16,y-128);c.quadraticCurveTo(x-24,y-153,x+Math.sin(t*5)*8,y-181);c.quadraticCurveTo(x+28,y-146,x+16,y-128);c.fill();c.fillStyle='#fff3ae';c.beginPath();c.ellipse(x,y-139,7,17,0,0,Math.PI*2);c.fill();
    }else{c.fillStyle='#302b35';c.beginPath();c.ellipse(x,y-134,16,7,0,0,Math.PI*2);c.fill();}
    c.restore();
  }

  private drawWeaponDrops(game:Game):void {
    const ctx=this.ctx,s=game.stage!;
    for(const d of s.weaponDrops){
      if(d.x<game.camX-100||d.x>game.camX+game.viewW+100)continue;
      const w=WEAPONS[d.weapon],ground=s.terrain.groundAt(d.x)??d.y;
      ctx.save();ctx.fillStyle='rgba(10,12,27,.45)';ctx.beginPath();ctx.ellipse(d.x,ground+1,24,4,0,0,Math.PI*2);ctx.fill();
      // Small dark backing and thin light rim keep the actual silhouette readable on every land.
      ctx.translate(d.x,d.y-22+(d.settled?Math.sin(d.age*2)*1.5:0));
      ctx.shadowColor='#090f20';ctx.shadowBlur=5;ctx.strokeStyle='#fff3cd';ctx.lineWidth=1;
      ctx.fillStyle=w.color+'18';ctx.beginPath();ctx.ellipse(0,0,35,28,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.shadowColor=w.color;ctx.shadowBlur=7;
      ctx.rotate(d.settled?-.12:Math.sin(d.age*6)*.3);
      ctx.scale(.82,.82);drawWeapon(ctx,d.weapon,d.rank,{x:-18,y:14},2.05,game.time);ctx.restore();
    }
  }

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
      ctx.fillRect(x - 22, (s.terrain.groundAt(x+ (x===s.bounds.minX?20:-20))??450)-450, 44, 470);
      ctx.fillStyle = `rgba(255, 250, 230, ${0.7 * flick})`;
      ctx.fillRect(x - 1.5, (s.terrain.groundAt(x+ (x===s.bounds.minX?20:-20))??450)-450, 3, 470);
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
    const top = l.touch?22/l.scale:26;
    const left = l.touch?60/l.scale:Math.max(86, 80 / l.scale); // clear of the pause button
    for (let i = 0; i < p.maxHp; i++) {
      const x = left + i * (l.touch?16/l.scale:28);
      const full = i < p.hp;
      const lost = !full && i < p.hp + 1 && game.hurtFlash > 0;
      heart(ctx, x, top, l.touch?7/l.scale:11, full ? '#ff5d7a' : lost ? '#ffffff' : 'rgba(40, 20, 50, 0.55)', full ? '#ffd0da' : 'rgba(255,255,255,0.35)');
    }
    ctx.save();ctx.font=`600 ${l.touch?8/l.scale:11}px ${SANS}`;ctx.fillStyle='#e9d5a3';ctx.fillText(`ELIAM · ${p.dashCooldown>0?'DASH RECHARGING':'DASH READY'}`,left-10,top+(l.touch?16/l.scale:29));ctx.restore();
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
      const w = l.touch?Math.min(340/l.scale,l.viewW-32/l.scale):Math.min(520, l.viewW - 120);
      const x = (l.viewW - w) / 2;
      const y = l.touch?102/l.scale:l.viewH - 46;
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
        ctx.strokeText(b.text, l.viewW / 2, y + rise,l.viewW-50);
        const g = ctx.createLinearGradient(0, y - 24, 0, y + 24);
        g.addColorStop(0, '#fffbe8');
        g.addColorStop(1, '#ffd77a');
        ctx.fillStyle = g;
        ctx.fillText(b.text, l.viewW / 2, y + rise,l.viewW-50);
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
        ctx.strokeText(b.text, l.viewW / 2, y + rise,l.viewW-50);
        ctx.fillStyle = '#fff3d6';
        ctx.fillText(b.text, l.viewW / 2, y + rise,l.viewW-50);
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
