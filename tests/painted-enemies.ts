// @ts-expect-error Node-only asset audit, not a browser dependency.
import { readFileSync, statSync } from 'node:fs';
import { Enemy, ATTACKS, type EnemyKind, type EnemyState } from '../src/core/enemy';
import { DIFFICULTIES } from '../src/core/config';
import { ProductionAssets } from '../src/production/assets';
import { ProductionScene, enemyVisual } from '../src/production/scene';
import { validateManifest } from '../src/production/manifest';
import { drawEnemy, WARN_GOLD, WARN_RED } from '../src/render/shadows';
import { bodyBands, materialSamples, validMaterialPixels } from '../src/production/enemy-presentation';
import type { ImageSpec, SourceRect } from '../src/production/types';
// @ts-expect-error Node-only PNG fixture reader.
import { decodeRGBA } from './png-rgba.mjs';

let n=0;
const check=(value:unknown,message:string)=>{if(!value)throw Error(message);n++;};
const m=validateManifest(JSON.parse(readFileSync('public/assets/production/asset-manifest.json','utf8')));
const attacks:Partial<Record<EnemyKind,string[]>>={
  husk:['huskSwing'],wisp:['wispDash'],caster:['casterOrb'],
  lurker:['lurkerLeap','lurkerSnap'],sentinel:['thrust1','thrust2'],warden:['sweep','slam','summon'],
  serpent:['spit','tail','bite'],thorn:['thrust1','thrust2','tail','summon'],
  watcher:['casterOrb','tail','kingWave','kingDash'],colossus:['sweep','slam'],
  keeper:['kingDash','combo1','combo2','combo3','kingWave','summon'],
  king:['combo1','combo2','combo3','kingDash','kingWave','kingLeap','summon'],
};
type Call={op:string;args:unknown[]};
let calls:Call[]=[];
const ctx=new Proxy({globalAlpha:1},{
  get(target,key){
    if(key in target)return Reflect.get(target,key);
    if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
    return (...args:unknown[])=>calls.push({op:String(key),args});
  },
  set(target,key,value){calls.push({op:`set:${String(key)}`,args:[value]});return Reflect.set(target,key,value);},
}) as unknown as CanvasRenderingContext2D;
let requests:string[]=[];
const decoded=new WeakMap<HTMLImageElement,{width:number;pixels:Uint8ClampedArray}>();
let pixelReads=0;
const readPixels=(im:HTMLImageElement,rect:SourceRect)=>{
  pixelReads++;
  const source=decoded.get(im)!;
  const out=new Uint8ClampedArray(rect[2]*rect[3]*4);
  for(let y=0;y<rect[3];y++){
    const start=((rect[1]+y)*source.width+rect[0])*4;
    out.set(source.pixels.subarray(start,start+rect[2]*4),y*rect[2]*4);
  }
  return out;
};
const assets=new ProductionAssets(p=>p,undefined,()=>{
  const image={naturalWidth:512,naturalHeight:512,onload:null as (()=>void)|null,onerror:null as (()=>void)|null,
    set src(path:string){
      requests.push(path);
      decoded.set(image as unknown as HTMLImageElement,decodeRGBA(`public/${path}`));
      queueMicrotask(()=>image.onload?.());
    },
  };return image as unknown as HTMLImageElement;
},readPixels);
assets.install(m);
const scene=new ProductionScene(assets);
let exportBytes=0;
for(const [kind,ids] of Object.entries(attacks) as [EnemyKind,string[]][]){
  const boss=new Enemy(kind,210,450,DIFFICULTIES.challenging).cfg.boss;
  const actor=m.actors[boss?`boss.${kind}`:kind];
  const image=m.images[`${kind}-painted-body`];
  exportBytes+=statSync(`public/${image.src}`).size;
  check(image.width===512&&image.height===512&&image.anchor.join(',')==='256,448','stable untrimmed cell and foot pivot');
  check(image.scale===(boss?.5:.25),'original normal/guardian body scale');
  check(!!image.source&&!!image.license,'recorded provenance');
  await assets.preloadImage(`${kind}-painted-body`);
  for(const diff of Object.values(DIFFICULTIES)){
    const e=new Enemy(kind,210,450,diff);
    e.onGround=true;e.vx=80;e.stride=1.1;e.anim=1;
    const allStates=['spawn','move','stagger','hurt','dying',...ids.flatMap(id=>['windup','active','recover'].map(s=>`${s}.${id}`))];
    for(const state of allStates){
      const [motion,id]=state.split('.');
      check(!!actor.states[state],`${kind}: exact live ${state} mapping`);
      const clip=m.clips[actor.states[state]];
      check(clip.bodyMotion===motion&&clip.mode==='replace','body-only articulation uses exact state');
      for(const phase of [1,2]){
        e.phase=phase;e.state=motion as EnemyState;e.attack=id?ATTACKS[id]:null;e.staggerDur=.63;
        const v=enemyVisual(e,diff),duration=v.duration??1;
        check(v.key===state,'live attack ID is never renamed');
        if(e.attack){
          const expected=motion==='windup'?e.attack.windup*diff.windup*(phase>=2?.85:1):
            motion==='recover'?e.attack.recover*(phase>=2?.8:1):e.attack.active;
          check(Math.abs(duration-expected)<1e-10,'difficulty AND phase adjusted duration matches core');
        }
        const poses=[];
        for(const k of [.08,.52,.95]){
          e.t=duration*k;e.anim=motion==='move'?k:1;e.stride=motion==='move'?k*5:1;
          const before=JSON.stringify(e),box=JSON.stringify(e.hurtBox());
          calls=[];const art=scene.enemy(ctx,e,diff);
          check(art?.bodyOnly&&art.draw(),'ready body draws real articulated image regions');
          if(kind==='serpent'){
            drawEnemy(ctx,e,diff,1,art);
            check(calls.some(c=>c.op==='clip')&&calls.some(c=>c.op==='drawImage'),'serpent paints inside original neck and jaw paths');
          }else check(calls.some(c=>c.op==='scale'&&c.args[0]===e.facing*image.scale),'uniform original world scale and facing');
          const explicit=JSON.stringify(calls),presentation=image.enemyPresentation;
          delete image.enemyPresentation;
          calls=[];
          const legacy=scene.enemy(ctx,e,diff);
          legacy?.draw();
          if(kind==='serpent')drawEnemy(ctx,e,diff,1,legacy);
          check(JSON.stringify(calls)===explicit,`${kind}: omitted metadata retains identical legacy draw commands`);
          image.enemyPresentation=presentation;
          check(JSON.stringify(e)===before&&JSON.stringify(e.hurtBox())===box,'rendering cannot mutate combat, hitboxes or movement');
          poses.push(JSON.stringify(calls));
        }
        if(kind!=='serpent')check(new Set(poses).size>1,'live simulation changes pose rather than holding a full-body still');
      }
    }
    // Both facing directions reflect around the same foot pivot.
    e.state='move';e.attack=null;e.facing=1;calls=[];scene.enemy(ctx,e,diff)?.draw();
    if(kind==='serpent')continue; // Uses original head/home geometry, not a foot-pivot portrait.
    check(calls.some(c=>c.op==='translate'&&c.args[0]===e.x&&c.args[1]===e.y+(e.cfg.flying?e.h/2:0)),'ground foot / flying center calibration');
    const normal=JSON.stringify(calls);
    e.facing=-1;calls=[];scene.enemy(ctx,e,diff)?.draw();
    check(JSON.stringify(calls)!==normal,'facing mirrors body art');
  }
}
check(exportBytes<1536*1024,'twelve lossless PNG delivery paintings remain small');
check(assets.diagnostics().decodedBytes===12*512*512*4,'twelve shared sources cost 12MiB across all state clips');
check(requests.length===12,'changing states, difficulty, phase and facing never reloads images');
check(pixelReads===3,'decoded material checks run once per image/rectangle, not per frame');
// Missing exact states never substitute standing art.
const e=new Enemy('warden',300,450,DIFFICULTIES.challenging);
e.state='active';e.attack={...ATTACKS.sweep,id:'unmapped'};
check(!scene.enemy(ctx,e,DIFFICULTIES.challenging),'unknown attack retains full original animation');
e.miniName='The Bellwarden';e.attack=ATTACKS.sweep;
check(scene.enemy(ctx,e,DIFFICULTIES.challenging)?.bodyOnly,'mini-boss inherits only exact archetype state');
e.miniName=undefined;
for(const id of ['sweep','slam']){
  e.state='windup';e.attack=ATTACKS[id];e.t=.5;
  calls=[];drawEnemy(ctx,e,DIFFICULTIES.challenging,0,scene.enemy(ctx,e,DIFFICULTIES.challenging));
  const imageLast=calls.map(c=>c.op).lastIndexOf('drawImage');
  const color=calls.findIndex((c,i)=>i>imageLast&&c.op==='set:fillStyle'&&c.args[0]===(id==='slam'?WARN_RED:WARN_GOLD));
  check(imageLast>=0&&color>imageLast,'procedural gold/red telegraphs draw on top of painted bodies');
  check(calls.slice(imageLast+1).some(c=>c.op==='lineTo'),'procedural attack arms survive body replacement');
}
// Read-only pose code must not depend on the decorative wall clock.
e.t=.51;calls=[];drawEnemy(ctx,e,DIFFICULTIES.challenging,1,scene.enemy(ctx,e,DIFFICULTIES.challenging));
const paintCalls=calls.filter(c=>c.op==='drawImage'||c.op==='rotate').slice(0,9);
calls=[];drawEnemy(ctx,e,DIFFICULTIES.challenging,999,scene.enemy(ctx,e,DIFFICULTIES.challenging));
check(JSON.stringify(paintCalls)===JSON.stringify(calls.filter(c=>c.op==='drawImage'||c.op==='rotate').slice(0,9)),'combat poses stay simulation-driven during reduced motion/hitstop');
const failed=new ProductionAssets(p=>p,undefined,()=>{
  const image={onload:null,onerror:null as (()=>void)|null,set src(_path:string){queueMicrotask(()=>image.onerror?.());}};
  return image as unknown as HTMLImageElement;
});
failed.install(m);
check(await failed.preloadImage('warden-painted-body')===null,'missing body file fails closed');
const fallbackScene=new ProductionScene(failed);
calls=[];drawEnemy(ctx,e,DIFFICULTIES.challenging,1,fallbackScene.enemy(ctx,e,DIFFICULTIES.challenging));
check(!calls.some(c=>c.op==='drawImage')&&calls.some(c=>c.op==='quadraticCurveTo'),'failed painted file keeps full procedural guardian body');
for(let i=0;i<5;i++)fallbackScene.enemy(ctx,e,DIFFICULTIES.challenging)?.draw();
check(failed.diagnostics().issues.length===1&&failed.diagnostics().decodedBytes===0,'failed file is diagnosed once without reload churn');
// Serpent texture preserves every original path and head coordinate.
const serpent=new Enemy('serpent',600,450,DIFFICULTIES.challenging);
serpent.state='windup';serpent.attack=ATTACKS.bite;serpent.t=.6;
calls=[];drawEnemy(ctx,serpent,DIFFICULTIES.challenging,1);
const geometry=calls.filter(c=>['moveTo','lineTo','quadraticCurveTo','ellipse','translate','scale'].includes(c.op));
calls=[];drawEnemy(ctx,serpent,DIFFICULTIES.challenging,1,scene.enemy(ctx,serpent,DIFFICULTIES.challenging));
check(JSON.stringify(geometry)===JSON.stringify(calls.filter(c=>['moveTo','lineTo','quadraticCurveTo','ellipse','translate','scale'].includes(c.op))),'painted serpent preserves exact original curve, fins, jaw, eyes and water geometry');
for(const kind of ['serpent','thorn','watcher','colossus','keeper','king'] as EnemyKind[]){
  const guardian=new Enemy(kind,300,450,DIFFICULTIES.challenging);
  guardian.state='windup';guardian.attack=ATTACKS[attacks[kind]![0]];guardian.t=.5;
  if(kind!=='serpent'){
    const sx=kind==='colossus'?-40:10,sy=kind==='colossus'?-110:-100;
    const gearLines=(list:Call[])=>{
      const start=list.findIndex(c=>c.op==='moveTo'&&c.args[0]===sx&&c.args[1]===sy);
      check(start>=0,`${kind}: original articulated arm socket remains`);
      // Stop at the weapon: fallback-only armor detailing follows the actor.
      return list.slice(start).filter(c=>c.op==='lineTo').slice(0,kind==='colossus'?2:3);
    };
    calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1);
    const original=JSON.stringify(gearLines(calls));
    calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,scene.enemy(ctx,guardian,DIFFICULTIES.challenging));
    check(JSON.stringify(gearLines(calls))===original,`${kind}: original arm/weapon endpoints and warning geometry unchanged`);
    if(kind!=='colossus'){
      const cape=calls.findIndex(c=>c.op==='set:fillStyle'&&c.args[0]==='#0b0514');
      const paint=calls.findIndex(c=>c.op==='drawImage');
      check(cape>=0&&cape<paint,`${kind}: original moving cape remains behind painted body`);
    }
  }
  const missing=new ProductionAssets(p=>p,undefined,()=>{
    const image={onload:null,onerror:null as (()=>void)|null,set src(_path:string){queueMicrotask(()=>image.onerror?.());}};
    return image as unknown as HTMLImageElement;
  });
  missing.install(m);await missing.preloadImage(`${kind}-painted-body`);
  calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,new ProductionScene(missing).enemy(ctx,guardian,DIFFICULTIES.challenging));
  check(!calls.some(c=>c.op==='drawImage')&&calls.some(c=>['quadraticCurveTo','roundRect'].includes(c.op)),`${kind}: missing source retains full original body and weapons`);
  for(const heavy of [false,true]){
    guardian.attack={...guardian.attack!,heavy};
    calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,scene.enemy(ctx,guardian,DIFFICULTIES.challenging));
    const last=calls.map(c=>c.op).lastIndexOf('drawImage');
    check(calls.some((c,i)=>i>last&&c.op==='set:fillStyle'&&c.args[0]===(heavy?WARN_RED:WARN_GOLD)),`${kind}: gold/red warning survives above paint`);
  }
}
// Replacement calibrations affect only source crops/pivots, never live geometry.
for(const kind of ['warden','serpent','colossus'] as EnemyKind[]){
  const guardian=new Enemy(kind,300,450,DIFFICULTIES.challenging);
  guardian.state='active';guardian.attack=ATTACKS[kind==='serpent'?'bite':'sweep'];guardian.t=.08;
  const spec=m.images[`${kind}-painted-body`],saved=spec.enemyPresentation;
  const snapshot=JSON.stringify(guardian),hurtbox=JSON.stringify(guardian.hurtBox());
  calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,scene.enemy(ctx,guardian,DIFFICULTIES.challenging));
  const original=calls;
  const bands={top:60,neck:155,hip:320,legTop:315,foot:448};
  const samples=kind==='serpent'?{serpentScales:[234,388,16,16] as SourceRect,serpentHead:[236,390,8,8] as SourceRect}:
    kind==='colossus'?{colossusStone:[220,140,24,24] as SourceRect}:undefined;
  spec.enemyPresentation={...(kind!=='serpent'?{bands}:{}),samples};
  validateManifest(m);
  calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,scene.enemy(ctx,guardian,DIFFICULTIES.challenging));
  check(JSON.stringify(calls)!==JSON.stringify(original),`${kind}: replacement calibration changes painted draw commands`);
  if(kind!=='serpent')check(calls.some(c=>c.op==='drawImage'&&c.args[2]===bands.legTop-2),'custom leg band controls actual source crop');
  for(const r of Object.values(samples??{})){
    check(calls.some(c=>c.op==='drawImage'&&JSON.stringify(c.args.slice(1,5))===JSON.stringify(r)),`${kind}: configured material rectangle reaches renderer`);
  }
  const paths=(list:Call[])=>list.filter(c=>['moveTo','lineTo','quadraticCurveTo','ellipse','arc','roundRect'].includes(c.op));
  check(JSON.stringify(paths(calls))===JSON.stringify(paths(original)),`${kind}: replacement calibration leaves original geometry and weapons untouched`);
  check(JSON.stringify(guardian)===snapshot&&JSON.stringify(guardian.hurtBox())===hurtbox,`${kind}: replacement calibration leaves combat state and hurtbox untouched`);
  spec.enemyPresentation=saved;
}
// Actual transparent pixels fail closed even when the rectangle is in bounds.
for(const kind of ['serpent','colossus'] as EnemyKind[]){
  const id=`${kind}-painted-body`,spec=m.images[id],saved=spec.enemyPresentation;
  const guardian=new Enemy(kind,300,450,DIFFICULTIES.challenging);
  guardian.state='windup';guardian.attack=ATTACKS[kind==='serpent'?'bite':'slam'];
  spec.enemyPresentation={samples:kind==='serpent'?{serpentScales:[0,0,8,8]}:{colossusStone:[0,0,8,8]}};
  validateManifest(m);
  const beforeReads=pixelReads;
  for(let i=0;i<3;i++){
    calls=[];drawEnemy(ctx,guardian,DIFFICULTIES.challenging,1,scene.enemy(ctx,guardian,DIFFICULTIES.challenging));
    check(!calls.some(c=>c.op==='drawImage')&&calls.some(c=>c.op==='quadraticCurveTo'),`${kind}: transparent patch retains complete procedural actor`);
  }
  check(pixelReads===beforeReads+1,`${kind}: invalid patch is not re-read every frame`);
  check(assets.issues.filter(issue=>issue.includes(`sample ${id}:`)).length===1,`${kind}: invalid material diagnosed once`);
  spec.enemyPresentation=saved;
}
const opaque=new Uint8ClampedArray([40,50,60,255]),clear=new Uint8ClampedArray([40,50,60,0]);
check(validMaterialPixels(opaque,[0,0,1,1],false),'opaque material accepted');
check(!validMaterialPixels(clear,[0,0,1,1],true),'fully transparent head overlay rejected');
check(!validMaterialPixels(new Uint8ClampedArray([1,2,3,100]),[0,0,1,1],false),'translucent material rejected');
check(!validMaterialPixels(opaque,[0,0,2,2],false),'incomplete pixel data rejected');
const unreadable=new ProductionAssets(p=>p,undefined,()=>{
  const im={naturalWidth:512,naturalHeight:512,onload:null as (()=>void)|null,onerror:null,
    set src(_path:string){queueMicrotask(()=>im.onload?.());}};
  return im as unknown as HTMLImageElement;
},()=>{throw Error('Canvas read failed');});
unreadable.install(m);await unreadable.preloadImage('serpent-painted-body');
check(!unreadable.materialImage('serpent-painted-body',materialSamples(m.images['serpent-painted-body'],'serpent')),'unreadable material pixels fail closed');
check(bodyBands({scale:.5} as ImageSpec,'warden',200).neck===140,'legacy body bands remain available without metadata');
// Cache residency protects all visible bodies from eviction.
assets.beginFrame();
for(const kind of Object.keys(attacks))assets.image(`${kind}-painted-body`);
Object.defineProperty(assets,'budget',{value:12*512*512*4});
m.images['excess-body']={...m.images['husk-painted-body']};assets.install(m);
check(await assets.preloadImage('excess-body')===null,'full visible scene falls back rather than evicting visible bodies');
assets.beginFrame();
check(!!await assets.preloadImage('husk-painted-body'),'resident body stays decoded after overflow');
// Reject uncalibrated body painting contracts, including accidental atlases.
for(const mutate of [
  (copy:typeof m)=>{copy.clips['painted-husk-move'].bodyMotion='bad' as 'move';},
  (copy:typeof m)=>{copy.images['husk-painted-body'].width=256;},
  (copy:typeof m)=>{copy.images['husk-painted-body'].anchor=[0,0];},
  (copy:typeof m)=>{copy.images['husk-painted-body'].scale=.1;},
  ...[
    {top:0,neck:140,hip:328,legTop:328,foot:448},
    {top:48,neck:340,hip:328,legTop:328,foot:448},
    {top:48,neck:140,hip:328,legTop:328,foot:513},
    {top:48,neck:140,hip:NaN,legTop:328,foot:448},
  ].map(bands=>(copy:typeof m)=>{copy.images['warden-painted-body'].enemyPresentation={bands};}),
  ...[
    [-1,116,10,10],[500,116,20,10],[200,500,10,20],[200,116,0,10],
    [200,116,10.5,10],[200,116,Infinity,10],[200,116,10],
  ].map(rect=>(copy:typeof m)=>{copy.images['colossus-painted-body'].enemyPresentation={samples:{colossusStone:rect as SourceRect}};}),
  (copy:typeof m)=>{copy.images['colossus-painted-body'].enemyPresentation={samples:{unknown:[0,0,8,8]} as never};},
  (copy:typeof m)=>{copy.images['colossus-painted-body'].enemyPresentation={bands:{} as never};},
]){
  const copy=JSON.parse(JSON.stringify(m));mutate(copy);
  let rejected=false;try{validateManifest(copy);}catch{rejected=true;}check(rejected,'malformed body-motion contract rejected');
}
console.log(`${n} painted enemy pose, timing, warning, fallback, provenance and residency checks passed.`);
