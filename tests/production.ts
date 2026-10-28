import { emptyManifest } from '../src/production/types';
import { validateManifest } from '../src/production/manifest';
import { ProductionAssets } from '../src/production/assets';
import { ProductionScene, frameIndex, playerVisual, enemyVisual } from '../src/production/scene';
import { SampleBank } from '../src/production/samples';
import { AudioEngine } from '../src/audio/audio';
import { Player } from '../src/core/player';
import { Enemy } from '../src/core/enemy';
import { DIFFICULTIES } from '../src/core/config';
import { Terrain } from '../src/core/terrain';

let count=0;
function check(ok:unknown,message:string):void {if(!ok)throw new Error(message);count++;}
const manifest=emptyManifest();
manifest.images['eliam-body']={
  src:'assets/production/characters/eliam/eliam-body.png',width:512,height:256,
  frame:{width:128,height:128,columns:4,count:8},anchor:[64,112],scale:.5,
  source:'test metadata only; no artwork',license:'test',
};
manifest.images['terrain-tile']={src:'assets/production/world/desert/tiles/sandstone.png',width:512,height:256,anchor:[0,0],scale:.25,source:'test metadata only',license:'test'};
manifest.clips['eliam-run']={image:'eliam-body',frames:[0,2,4,6],fps:12,loop:true,mode:'replace'};
manifest.actors.eliam={states:{run:'eliam-run'}};
manifest.effects.impact='eliam-run';
manifest.lands.desert={layers:[{image:'eliam-body',plane:'background',height:128,speedX:.1,speedY:.1,repeatX:true}],props:[{image:'eliam-body',x:100,y:450}],surfaces:{ground:'terrain-tile',platform:'terrain-tile'}};
manifest.audio.hit={sources:['assets/production/audio/sfx/hit.ogg','assets/production/audio/sfx/hit.mp3'],gain:.4,voices:1};
manifest.audio.hitHeavy={...manifest.audio.hit};
check(validateManifest(manifest)===manifest,'valid manifest accepted without transforming game data');
for(const mutate of [
  (m:typeof manifest)=>{m.version=2 as 1;},
  (m:typeof manifest)=>{m.images['eliam-body'].src='https://external.invalid/x.png';},
  (m:typeof manifest)=>{m.images['eliam-body'].src='assets/production/../secret.png';},
  (m:typeof manifest)=>{m.images['eliam-body'].anchor=[999,0];},
  (m:typeof manifest)=>{m.images['eliam-body'].frame!.count=100;},
  (m:typeof manifest)=>{m.clips['eliam-run'].frames=[99];},
  (m:typeof manifest)=>{m.clips['eliam-run'].fps=NaN;},
  (m:typeof manifest)=>{m.audio.hit.voices=100;},
  (m:typeof manifest)=>{m.audio.hit.gain=10;},
  (m:typeof manifest)=>{m.lands.desert.layers[0].plane='foreground';m.lands.desert.layers[0].opacity=1;},
  (m:typeof manifest)=>{m.lands.desert.layers[0].height=1;},
  (m:typeof manifest)=>{m.actors.eliam.states.run='missing-clip';},
  (m:typeof manifest)=>{m.lands.desert.surfaces!.ground='eliam-body';},
  (m:typeof manifest)=>{m.clips['eliam-run'].image='constructor';},
  (m:typeof manifest)=>{m.lands.desert.props[0].sway=1;},
]){
  const copy=JSON.parse(JSON.stringify(manifest)) as typeof manifest;mutate(copy);
  let failed=false;try{validateManifest(copy);}catch{failed=true;}check(failed,'invalid manifest rejects safely');
}
const clip=manifest.clips['eliam-run'];
// Many exact state bindings may share a texture; metadata growth must not
// silently disable the whole installed pack, nor remove its finite ceiling.
const manyClips=JSON.parse(JSON.stringify(manifest)) as typeof manifest;
for(let i=1;i<512;i++)manyClips.clips[`test-${i}`]={...clip};
check(Object.keys(validateManifest(manyClips).clips).length===512,'512 bounded clips accepted');
manyClips.clips['one-too-many']={...clip};
let oversized=false;try{validateManifest(manyClips);}catch{oversized=true;}
check(oversized,'513 clips rejected without expanding image/cache limits');
check(frameIndex(clip,1)===0,'cyclic animation wraps');
check(frameIndex(clip,.2,.4)===4,'attack frames use actual engine duration');
check(frameIndex(clip,99,.4)===6,'attack never loops into an extra strike');
check(frameIndex(clip,.2,.4,true)===0,'decorative reduced motion uses still frame');

let imageRequests=0;
const assets=new ProductionAssets(p=>p,(async(input)=>{
  if(String(input).endsWith('asset-manifest.json'))return new Response(JSON.stringify(manifest));
  return new Response(new Uint8Array([String(input).endsWith('.ogg')?1:2]));
}) as typeof fetch,()=>{
  const im={naturalWidth:512,naturalHeight:256,onload:null as (()=>void)|null,onerror:null as (()=>void)|null};
  Object.defineProperty(im,'src',{set:()=>{imageRequests++;queueMicrotask(()=>im.onload?.());}});
  return im as unknown as HTMLImageElement;
});
await assets.load();check(Object.keys(assets.manifest.images).length===2,'JSON loader installs manifest');
const a=assets.preloadImage('eliam-body'),b=assets.preloadImage('eliam-body');
check(a===b,'in-flight image requests are shared');
await a;check(imageRequests===1,'image requested once');
check(!!assets.image('eliam-body')&&assets.diagnostics().decodedBytes===512*256*4,'decoded image cache accounts actual memory');
check(assets.diagnostics().loads===1&&assets.diagnostics().reloads===0&&assets.diagnostics().pending===0,
  'diagnostics count completed loads without duplicate in-flight requests');
check(assets.diagnostics().visibleBytes===512*256*4,'diagnostics count only resident visible bytes');
assets.beginFrame();
check(assets.diagnostics().visibleBytes===0,'visible residency resets for each real render frame');
const snapshot=assets.diagnostics();snapshot.residentIds.length=0;
check(assets.diagnostics().residentIds.length===1,'diagnostic snapshots cannot mutate residency');
const scene=new ProductionScene(assets),calls:{name:string;args:unknown[]}[]=[];
const ctx=new Proxy({globalAlpha:1,globalCompositeOperation:'source-over'},{
  get(target,key){return key in target?target[key as keyof typeof target]:(...args:unknown[])=>calls.push({name:String(key),args});},
}) as unknown as CanvasRenderingContext2D;
check(scene.drawClip(ctx,clip,.2,100,450,-1,.4),'ready clip draws');
const draw=calls.find(c=>c.name==='drawImage')!,scale=calls.find(c=>c.name==='scale')!;
check(scale.args[0]===-.5&&scale.args[1]===.5,'mirroring retains uniform source scale');
check(draw.args.slice(1).join(',')==='0,128,128,128,-64,-112,128,128','atlas crop and foot anchor are exact, without stretching');
calls.length=0;
scene.layers(ctx,'desert','background',100,50,960,540);
check(calls.filter(c=>c.name==='drawImage').length>1,'horizontal parallax tiles across view');
calls.length=0;
scene.layers(ctx,'desert','background',100,50,960,540,true);
check(calls.find(c=>c.name==='drawImage')?.args[5]===0,'reduced-motion parallax remains static');
calls.length=0;assets.manifest.lands.desert.layers[0].depth=[-1000,600];
scene.layers(ctx,'desert','background',100,50,960,540,false,900);
check(!calls.length,'upper sky layer does not cover lower archive rooms');
delete assets.manifest.lands.desert.layers[0].depth;
calls.length=0;scene.props(ctx,'desert',5000,0,960,540,1,false);
check(!calls.length,'distant props do not draw or preload');
assets.manifest.lands.desert.props[0].sway=.04;
calls.length=0;scene.props(ctx,'desert',0,0,960,540,1,false);
check(calls.some(c=>c.name==='translate'&&c.args[0]===100&&c.args[1]===450),'painted vegetation sways about its fixed world base');
check(calls.some(c=>c.name==='transform'&&Math.abs(Number(c.args[2]))<=.04),'painted vegetation sway is bounded');
calls.length=0;scene.props(ctx,'desert',0,0,960,540,2,true);
check(calls.some(c=>c.name==='transform'&&c.args[2]===0),'reduced motion freezes painted vegetation');
await assets.preloadImage('terrain-tile');calls.length=0;
const terrain=new Terrain([[100,300,450],[350,394,-1800]],[[420,510,380]]);
const terrainBefore=JSON.stringify(terrain);
scene.surfaces(ctx,'desert',terrain,0,0,960,540);
const clips=calls.filter(c=>c.name==='rect');
check(clips.length===2&&clips[0].args.join(',')==='103,454,194,86'&&clips[1].args.join(',')==='423,384,84,18','surface textures preserve ledge edges, gaps and narrow route gates');
check(calls.filter(c=>c.name==='drawImage').every(c=>Number(c.args[3])/Number(c.args[4])===2),'tile repetition preserves source aspect ratio');
check(JSON.stringify(terrain)===terrainBefore,'surface artwork cannot mutate collision terrain');
const p=new Player(100,450,8);p.onGround=true;p.vx=200;
const before=JSON.stringify(p);
check(scene.hero(ctx,p)?.mode==='replace','explicit mapped replacement is available');
scene.hero(ctx,p)?.draw();check(JSON.stringify(p)===before,'visual rendering cannot mutate player physics or equipment');
p.state='attack';p.combo=1;
check(playerVisual(p).key==='attack.hammer.light-2'&&playerVisual(p).duration===p.swing.dur,'exact combo and live weapon timing bind to visual state');
check(!scene.hero(ctx,p),'missing attack clips retain procedural animation instead of standing art');
p.airSwing=true;p.heavySwing=true;check(playerVisual(p).key==='attack.hammer.air-heavy','aerial heavy has a distinct visual mapping');
const e=new Enemy('husk',300,450,DIFFICULTIES.gentle);e.state='windup';e.attack={id:'test',windup:1,active:.2,recover:.3,damage:1};
check(enemyVisual(e,DIFFICULTIES.gentle).duration===DIFFICULTIES.gentle.windup,'enemy warning phase uses difficulty-adjusted duration');
e.phase=2;check(enemyVisual(e,DIFFICULTIES.gentle).duration===DIFFICULTIES.gentle.windup*.85,'second-phase windup remains engine-driven');

// Every file failure is single-shot and reports why the existing presentation remains.
const missing=new ProductionAssets(p=>p,(async()=>new Response('',{status:404})) as typeof fetch);
await missing.load();await missing.load();
check(missing.issues.length===1&&!Object.keys(missing.manifest.images).length,'missing manifest is cached fallback, not a startup crash or request storm');
const broken=new ProductionAssets(p=>p,undefined,()=>{
  const im={naturalWidth:1,naturalHeight:1,onload:null as (()=>void)|null,onerror:null as (()=>void)|null};
  Object.defineProperty(im,'src',{set:()=>queueMicrotask(()=>im.onload?.())});return im as unknown as HTMLImageElement;
});
broken.install(manifest);
check(await broken.preloadImage('eliam-body')===null,'dimension mismatch never draws corrupt atlas');
check(await broken.preloadImage('eliam-body')===null&&broken.issues.length===1,'failed images stay in fallback without repeated requests');
check(broken.diagnostics().failed===1&&broken.diagnostics().loads===1,
  'failure diagnostics reveal single-shot fallback without retry storms');
// Small deterministic cache mirrors sustained browser pressure at the real ceiling.
const churn=new ProductionAssets(p=>p,undefined,()=>{
  const im={naturalWidth:512,naturalHeight:256,onload:null as (()=>void)|null,onerror:null as (()=>void)|null};
  Object.defineProperty(im,'src',{set:()=>queueMicrotask(()=>im.onload?.())});
  return im as unknown as HTMLImageElement;
});
const churnManifest=structuredClone(manifest);
churnManifest.images['third']={...manifest.images['eliam-body']};
churn.install(churnManifest);
Object.defineProperty(churn,'budget',{value:512*256*4*2});
await churn.preloadImage('eliam-body');await churn.preloadImage('terrain-tile');
churn.beginFrame();churn.image('eliam-body');
await churn.preloadImage('third');
check(churn.diagnostics().evictions===1&&churn.diagnostics().residentIds.includes('eliam-body')&&
  !churn.diagnostics().residentIds.includes('terrain-tile'),'LRU pressure evicts only non-visible residency');
await churn.preloadImage('terrain-tile');
check(churn.diagnostics().loads===4&&churn.diagnostics().reloads===1&&churn.diagnostics().evictions===2,
  'diagnostics distinguish first loads, successful reloads and evictions');
check(churn.diagnostics().peakDecodedBytes===churn.budget&&churn.diagnostics().decodedBytes<=churn.budget&&
  !churn.diagnostics().failed,'reload recovery stays bounded and has no failed assets');
// A too-large active pack fails closed rather than evicting visible assets each frame.
Object.defineProperty(assets,'budget',{value:512*256*4*2});
assets.beginFrame();assets.image('eliam-body');assets.image('terrain-tile');
manifest.images['extra-body']={...manifest.images['eliam-body']};
assets.install(manifest);
check(await assets.preloadImage('extra-body')===null,'active scene budget retains visible textures and falls back for excess');

let decodes=0,plays=0,connections:unknown[]=[],sampleGains:number[]=[];
const sources:{onended:(()=>void)|null}[]=[];
const bus={} as AudioNode;
const audioCtx={
  state:'running',currentTime:1,
  async decodeAudioData(data:ArrayBuffer){decodes++;if(new Uint8Array(data)[0]===1)throw Error('unsupported codec');return {length:100,numberOfChannels:1,duration:.1} as AudioBuffer;},
  createGain(){const gain={value:0};return {gain,connect(n:unknown){sampleGains.push(gain.value);connections.push(n);return n;},disconnect(){}};},
  createBufferSource(){const s={buffer:null,onended:null as (()=>void)|null,connect(n:unknown){return n;},disconnect(){},start(){plays++;}};sources.push(s);return s;},
} as unknown as AudioContext;
const bank=new SampleBank(audioCtx,bus,assets);
check(!bank.play('hit'),'cold samples immediately return control for synthesized fallback');
await bank.preload('hit');
check(decodes===2,'unsupported OGG falls through to MP3 once');
check(bank.play('hit')&&plays===1&&connections.includes(bus),'decoded sample reaches existing SFX bus');
check(bank.play('hit')&&plays===1,'sample voice cap suppresses stacking without extra synthesis');
sources[0].onended!();bank.play('hit');check(plays===2,'completed voice releases concurrency slot');
sources[1].onended!();
const engine=new AudioEngine();
Object.assign(engine,{ctx:audioCtx,sfxBus:bus,samples:bank});
engine.play('hit');check(plays===3,'actual AudioEngine routes ready sample instead of synthesizing');
sources[2].onended!();Object.assign(audioCtx,{currentTime:2});
Object.assign(engine,{hostAllowed:false});engine.play('hit');check(plays===3,'host mute prevents sampled output');
Object.assign(engine,{hostAllowed:true,sfxOn:false});engine.play('hit');check(plays===3,'SFX preference prevents sampled output');
Object.assign(engine,{sfxOn:true});Object.assign(audioCtx,{state:'suspended'});
engine.play('hit');check(plays===3,'suspended context never plays sampled output');
Object.assign(audioCtx,{state:'running',currentTime:3});
manifest.audio.land={...manifest.audio.hit,gain:.8,voices:2};
await bank.preload('land');
Object.assign(engine,{sfxOn:true});
engine.play('land',0);
const soft=sampleGains[sampleGains.length-1];
Object.assign(audioCtx,{currentTime:4});engine.play('land',1);
const hard=sampleGains[sampleGains.length-1];
check(Math.abs(hard/soft-.38/.18)<.0001&&hard===.8,'sampled landing preserves original hard/soft gain ratio');
for(const source of sources.slice(3))source.onended?.();
const beforeFailure=plays;
const failedAssets=new ProductionAssets(p=>p,(async()=>{throw Error('missing file');}) as typeof fetch);
failedAssets.install(manifest);
const failedBank=new SampleBank(audioCtx,bus,failedAssets);
check(!failedBank.play('hit'),'failed sample first event immediately falls back');
await failedBank.preload('hit');
check(!failedBank.play('hit')&&plays===beforeFailure,'all codecs failing never replays a delayed event');
check(failedAssets.issues.length===1,'all-codec failure reported once');
await bank.preload('hitHeavy');
manifest.audio.block={...manifest.audio.hit,voices:2};
await bank.preload('block');
manifest.audio.hit.voices=8;manifest.audio.hitHeavy.voices=8;manifest.audio.land.voices=8;
for(let i=0;i<8;i++)for(const id of ['hit','hitHeavy','land'])bank.play(id);
const capped=plays;
check(bank.play('block')&&plays===capped,'24-voice global cap suppresses an uncapped event without synthesis');
sources[sources.length-1].onended!();
check(bank.play('block')&&plays===capped+1,'global voice slot released on completion');
console.log(`${count} production manifest, atlas, fallback, parallax, pose, sample codec and audio-gate checks passed.`);
