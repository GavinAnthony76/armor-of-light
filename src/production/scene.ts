import type { Player } from '../core/player';
import type { Enemy } from '../core/enemy';
import type { Particle } from '../render/fx';
import type { Difficulty } from '../core/config';
import type { Terrain } from '../core/terrain';
import type { BodyArt, Clip } from './types';
import { productionAssets, type ProductionAssets } from './assets';

export function frameIndex(clip:Clip,time:number,duration?:number,still=false):number {
  if(still)return clip.frames[0];
  const n=duration&&duration>0?Math.floor(Math.max(0,time)/duration*clip.frames.length):Math.floor(Math.max(0,time)*clip.fps);
  return clip.frames[duration===undefined&&clip.loop?n%clip.frames.length:Math.min(n,clip.frames.length-1)];
}
export function playerVisual(p:Player):{key:string;time:number;duration?:number} {
  if(p.state==='attack')return {key:`attack.${p.weaponId}.${p.airSwing?(p.heavySwing?'air-heavy':'air'):p.heavySwing?'heavy':`light-${p.combo+1}`}`,time:p.t,duration:p.swing.dur};
  if(p.state!=='move')return {key:p.state,time:p.t};
  if(p.dashTime>0)return {key:'dash',time:.14-p.dashTime,duration:.14};
  if(!p.onGround)return {key:p.vy<0?'jump-rise':'jump-fall',time:p.t};
  return Math.abs(p.vx)>10?{key:'run',time:p.runTime}:{key:'idle',time:p.t};
}
export function enemyVisual(e:Enemy,diff:Difficulty):{key:string;time:number;duration?:number} {
  const a=e.attack;
  const duration=a?(e.state==='windup'?a.windup*diff.windup*(e.phase>=2?.85:1):e.state==='active'?a.active:e.state==='recover'?a.recover:undefined):undefined;
  return {key:a&&['windup','active','recover'].includes(e.state)?`${e.state}.${a.id}`:e.state,time:e.t,duration};
}

/** All drawing stays inside the existing camera transform and read-only pose data. */
export class ProductionScene {
  private clocks=new WeakMap<object,{key:string;origin:number;last:number}>();
  constructor(readonly assets:ProductionAssets=productionAssets){}
  private elapsed(actor:object,key:string,time:number,exact=false):number {
    let clock=this.clocks.get(actor);
    if(!clock||clock.key!==key||time<clock.last){
      clock={key,origin:time,last:time};this.clocks.set(actor,clock);
    }
    clock.last=time;
    return exact?time:Math.max(0,time-clock.origin);
  }
  drawClip(ctx:CanvasRenderingContext2D,clip:Clip,time:number,x=0,y=0,facing=1,duration?:number,still=false):boolean {
    const spec=this.assets.manifest.images[clip.image],im=this.assets.image(clip.image);
    if(!spec||!im)return false;
    const f=spec.frame??{width:spec.width,height:spec.height,columns:1,count:1};
    const index=frameIndex(clip,time,duration,still);
    ctx.save();ctx.translate(x,y);ctx.scale(facing*spec.scale,spec.scale);
    ctx.drawImage(im,(index%f.columns)*f.width,Math.floor(index/f.columns)*f.height,f.width,f.height,-spec.anchor[0],-spec.anchor[1],f.width,f.height);
    ctx.restore();return true;
  }
  private actor(ids:string[],state:string,time:number,duration:number|undefined,ctx:CanvasRenderingContext2D,x=0,y=0,facing=1):BodyArt|undefined {
    for(const id of ids){
      const key=this.assets.manifest.actors[id]?.states[state],clip=this.assets.manifest.clips[key];
      if(clip)return {mode:clip.mode??'overlay',draw:()=>this.drawClip(ctx,clip,time,x,y,facing,duration)};
    }
    return undefined; // Deliberately no standing-art substitution during attacks.
  }
  hero(ctx:CanvasRenderingContext2D,p:Player):BodyArt|undefined {
    const v=playerVisual(p),t=this.elapsed(p,v.key,v.time,v.duration!==undefined||p.state!=='move');
    return this.actor(['eliam'],v.key,t,v.duration,ctx);
  }
  enemy(ctx:CanvasRenderingContext2D,e:Enemy,diff:Difficulty):BodyArt|undefined {
    const v=enemyVisual(e,diff);
    const ids=e.miniName?[`mini.${e.miniName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,e.kind]:[e.cfg.boss?`boss.${e.kind}`:e.kind];
    return this.actor(ids,v.key,v.time,v.duration,ctx,e.x,e.y,e.facing);
  }
  layers(ctx:CanvasRenderingContext2D,theme:string,plane:'background'|'foreground',camX:number,camY:number,viewW:number,viewH:number,still=false,focusY=camY+viewH/2):void {
    for(const l of this.assets.manifest.lands[theme]?.layers??[]){
      if(l.plane!==plane)continue;
      const fade=l.fadeY??0;
      const depthAlpha=l.depth?(focusY<l.depth[0]||focusY>l.depth[1]?0:fade?Math.min(1,(focusY-l.depth[0])/fade,(l.depth[1]-focusY)/fade):1):1;
      if(depthAlpha<=0)continue;
      const spec=this.assets.manifest.images[l.image],im=this.assets.image(l.image);
      if(!im)continue;
      const sw=spec.frame?.width??spec.width,sh=spec.frame?.height??spec.height;
      const h=l.cover?Math.max(l.height,viewH,viewW*sh/sw):l.height,w=h*sw/sh;
      const y=(l.y??0)-(still?0:camY*l.speedY);
      const offset=still?0:camX*l.speedX;
      const x=(l.x??0)-(l.repeatX?((offset%w)+w)%w:l.cover?Math.min(Math.max(0,w-viewW),Math.max(0,offset)):offset);
      ctx.save();ctx.globalAlpha=(l.opacity??(plane==='foreground'?.25:1))*depthAlpha;
      for(let xx=x;xx<viewW;xx+=w){ctx.drawImage(im,0,0,sw,sh,xx,y,w,h);if(!l.repeatX)break;}
      ctx.restore();
    }
  }
  props(ctx:CanvasRenderingContext2D,theme:string,camX:number,camY:number,viewW:number,viewH:number,time:number,still:boolean):void {
    for(const p of this.assets.manifest.lands[theme]?.props??[]){
      const spec=this.assets.manifest.images[p.image],w=(spec.frame?.width??spec.width)*spec.scale,h=(spec.frame?.height??spec.height)*spec.scale;
      if(p.x+w<camX||p.x-w>camX+viewW||p.y+h<camY||p.y-h>camY+viewH)continue;
      const clip=p.clip?this.assets.manifest.clips[p.clip]:{image:p.image,frames:[0],fps:1,loop:false};
      this.drawClip(ctx,clip,time,p.x,p.y,p.facing??1,undefined,still);
    }
  }
  surfaces(ctx:CanvasRenderingContext2D,theme:string,terrain:Terrain,camX:number,camY:number,viewW:number,viewH:number):void {
    const surfaces=this.assets.manifest.lands[theme]?.surfaces;
    if(!surfaces)return;
    for(const kind of ['ground','platform'] as const){
      const id=surfaces[kind];if(!id)continue;
      const spec=this.assets.manifest.images[id],im=this.assets.image(id);if(!im)continue;
      const tw=spec.width*spec.scale,th=spec.height*spec.scale;
      for(const r of kind==='ground'?terrain.ground:terrain.platforms){
        // Narrow route barriers are not floors. Preserve every existing top edge.
        const width=r.x1-r.x0;
        if(width<64)continue;
        const left=Math.max(r.x0+3,camX),right=Math.min(r.x1-3,camX+viewW);
        const bodyBottom=theme==='desert'?24:width<90?20:14;
        const top=Math.max(r.y+4,camY),bottom=kind==='ground'?camY+viewH:Math.min(r.y+bodyBottom-2,camY+viewH);
        if(right<=left||bottom<=top)continue;
        ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
        ctx.globalAlpha=.85;
        for(let y=r.y+Math.floor((top-r.y)/th)*th;y<bottom;y+=th)
          for(let x=r.x0+Math.floor((left-r.x0)/tw)*tw;x<right;x+=tw)ctx.drawImage(im,x,y,tw,th);
        ctx.restore();
      }
    }
  }
  effect(ctx:CanvasRenderingContext2D,p:Particle,still:boolean):boolean {
    const id=this.assets.manifest.effects[p.kind],clip=this.assets.manifest.clips[id];
    if(!clip)return false;
    const spec=this.assets.manifest.images[clip.image];
    const width=(spec.frame?.width??spec.width)*spec.scale;
    const scale=Math.max(.1,p.size*2/width);
    ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.globalCompositeOperation='source-over';
    ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.scale(scale,scale);
    const drawn=this.drawClip(ctx,clip,p.max-p.life,0,0,1,p.max,still);
    ctx.restore();return drawn;
  }
}
