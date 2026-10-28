import { ProductionAssets } from '../src/production/assets';
import { ProductionScene, enemyVisual } from '../src/production/scene';
import { bodyBands, materialSamples } from '../src/production/enemy-presentation';
import { Enemy, ATTACKS, type EnemyKind, type EnemyState } from '../src/core/enemy';
import { DIFFICULTIES } from '../src/core/config';
import { STAGES } from '../src/core/levels';
import { drawEnemy } from '../src/render/shadows';
import { emptyManifest, type ProductionManifest } from '../src/production/types';
import { calibrationPack } from './guardian-calibration-model';

if(!import.meta.env.DEV)throw Error('Calibration is available through the development server only.');
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const actor=$<HTMLSelectElement>('actor'),attack=$<HTMLSelectElement>('attack');
const metadata=$<HTMLTextAreaElement>('metadata'),source=$<HTMLInputElement>('source');
const provenance=$<HTMLInputElement>('provenance'),license=$<HTMLInputElement>('license');
const status=$('status'),exportButton=$<HTMLButtonElement>('export');
const response=await fetch('/assets/production/asset-manifest.json');
const base=await response.json() as ProductionManifest;
const minis=STAGES.flatMap(s=>s.encounters.flatMap(e=>e.miniBoss?[{id:'mini.'+e.miniBoss.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:e.miniBoss.name,kind:e.waves[0][0].kind}]:[]));
let blob='',localPath='',selection=0,ready=false;
let previewEnemy:Enemy|undefined;
const assets=new ProductionAssets(p=>blob&&p===localPath?blob:'/'+p);
assets.install(base);
const scene=new ProductionScene(assets);
const info=()=>{
  const state=base.actors[actor.value].states.move,clip=base.clips[state];
  const mini=minis.find(m=>m.id===actor.value);
  return {image:clip.image,kind:(mini?.kind??actor.value.replace('boss.','')) as EnemyKind,mini};
};
for(const [id,a] of Object.entries(base.actors))if(base.clips[a.states.move]?.bodyMotion){
  const option=new Option(id,id);actor.add(option);
}
actor.value='boss.warden';
const motions=['move','windup','active','recover'] as const;
const views=motions.flatMap(motion=>[1,-1].map(facing=>{
  const figure=document.createElement('figure'),label=document.createElement('figcaption'),c=document.createElement('canvas');
  c.width=320;c.height=350;label.textContent=motion+(facing===1?' · right':' · left');
  figure.append(label,c);$('poses').append(figure);return {motion,facing,c};
}));
async function apply(){
  const seq=++selection;ready=false;exportButton.disabled=true;
  $<HTMLTextAreaElement>('output').value='';
  if(blob)localPath=source.value;
  try{
    const {image,kind}=info();
    const pack=calibrationPack(base,image,source.value,metadata.value);
    await validate(pack,image,kind,seq);
  }catch(error){status.textContent=String(error);}
}
async function validate(pack:ProductionManifest,image:string,kind:EnemyKind,seq:number){
  assets.install(pack);
  const im=await assets.preloadImage(image);
  if(seq!==selection)return;
  if(!im)throw Error('Image failed to decode at the required 512 × 512 size.');
  const samples=materialSamples(pack.images[image],kind);
  if(!assets.materialImage(image,samples))throw Error('Material sample is transparent or unreadable. Adjust the rectangles.');
  controls(pack);
  ready=true;exportButton.disabled=!provenance.value.trim()||!license.value.trim();status.textContent='Validated source, manifest bounds and material pixels. Review every pose before accepting.';
}
function controls(pack:ProductionManifest){
  const {image,kind}=info(),spec=pack.images[image];
  const e=previewEnemy?.kind===kind?previewEnemy:new Enemy(kind,160,310,DIFFICULTIES.challenging);
  const bands=bodyBands(spec,kind,e.h),samples=materialSamples(spec,kind);
  $('band-controls').replaceChildren();$('material-controls').replaceChildren();
  $('material-fields').hidden=!Object.keys(samples).length;
  const field=(host:string,label:string,value:number,edit:(n:number)=>void)=>{
    const row=document.createElement('label'),input=document.createElement('input');
    row.textContent=label;input.type='number';input.step='1';input.min='0';input.max='512';input.value=String(value);
    input.setAttribute('aria-label',label);row.append(input);$(host).append(row);
    input.onchange=()=>{
      try{edit(input.valueAsNumber);void apply();}
      catch(error){ready=false;exportButton.disabled=true;status.textContent=String(error);}
    };
  };
  for(const [name,value] of Object.entries(bands))field('band-controls','Band '+name,value,n=>{
    const next=JSON.parse(metadata.value);next.bands={...bands,[name]:n};metadata.value=JSON.stringify(next,null,2);
  });
  for(const [role,rect] of Object.entries(samples))for(let i=0;i<4;i++){
    field('material-controls',role+' '+['x','y','width','height'][i],rect[i],n=>{
      const next=JSON.parse(metadata.value),r=[...rect];r[i]=n;
      next.samples={...next.samples,[role]:r};metadata.value=JSON.stringify(next,null,2);
    });
  }
}
function reset(){
  if(blob){assets.install(emptyManifest());URL.revokeObjectURL(blob);}
  blob='';localPath='';$<HTMLInputElement>('file').value='';
  const {image}=info(),spec=base.images[image];source.value=spec.src;provenance.value=spec.source;license.value=spec.license;
  metadata.value=JSON.stringify(spec.enemyPresentation??{},null,2);
  attack.replaceChildren();
  for(const key of Object.keys(base.actors[actor.value].states))if(key.startsWith('active.'))attack.add(new Option(key.slice(7),key.slice(7)));
  void apply();
}
source.addEventListener('input',()=>{provenance.value='';license.value='';});
for(const field of [metadata,source,provenance,license])field.oninput=()=>{ready=false;exportButton.disabled=true;
  $<HTMLTextAreaElement>('output').value='';status.textContent='Apply to validate edited settings.';};
actor.onchange=reset;$('reset').onclick=reset;$('apply').onclick=()=>void apply();
$<HTMLInputElement>('file').onchange=async event=>{
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
  if(blob)URL.revokeObjectURL(blob);blob=URL.createObjectURL(file);localPath=source.value;
  provenance.value='';license.value='';
  // An empty valid pack cancels the prior isolated decode without touching the game.
  assets.install(emptyManifest());
  await apply();
};
exportButton.onclick=()=>{
  if(!ready||!provenance.value.trim()||!license.value.trim())return;
  const {image}=info(),pack=calibrationPack(base,image,source.value,metadata.value,
    {source:provenance.value.trim(),license:license.value.trim()});
  const text=JSON.stringify({images:{[image]:pack.images[image]}},null,2);
  $<HTMLTextAreaElement>('output').value=text;
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=image+'-settings.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function draw(now:number){
  if(ready){
    const {image,kind,mini}=info(),spec=assets.manifest.images[image],im=assets.image(image)!;
    if(!previewEnemy||previewEnemy.kind!==kind)previewEnemy=new Enemy(kind,160,310,DIFFICULTIES.challenging);
    const e=previewEnemy,bands=bodyBands(spec,kind,e.h);
    const c=$<HTMLCanvasElement>('source-view'),x=c.getContext('2d')!;x.clearRect(0,0,512,512);x.drawImage(im,0,0);
    x.lineWidth=2;x.font='13px system-ui';x.fillStyle=x.strokeStyle='#ffe082';
    for(const [label,y] of Object.entries(bands)){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();x.fillText(label,4,y-4);}
    x.strokeStyle='#fff';x.beginPath();x.moveTo(246,448);x.lineTo(266,448);x.moveTo(256,438);x.lineTo(256,458);x.stroke();
    for(const [label,r] of Object.entries(materialSamples(spec,kind))){x.strokeStyle='#00e5ff';x.strokeRect(...r);x.fillText(label,r[0],r[1]-4);}
    const animate=$<HTMLInputElement>('animate').checked,progress=Number($<HTMLInputElement>('progress').value);
    for(const v of views){
      const ctx=v.c.getContext('2d')!;ctx.clearRect(0,0,v.c.width,v.c.height);
      e.state=v.motion as EnemyState;e.attack=ATTACKS[attack.value];e.facing=v.facing;e.miniName=mini?.name;
      e.anim=animate?now/1000:progress;e.stride=e.anim*7;e.onGround=true;e.vx=65;
      const duration=enemyVisual(e,DIFFICULTIES.challenging).duration??1;
      e.t=(animate?(now/1000/duration)%1:progress)*duration;
      ctx.save();ctx.translate(160,310);ctx.scale(.65,.65);ctx.translate(-160,-310);
      drawEnemy(ctx,e,DIFFICULTIES.challenging,e.anim,scene.enemy(ctx,e,DIFFICULTIES.challenging));ctx.restore();
    }
  }
  requestAnimationFrame(draw);
}
reset();requestAnimationFrame(draw);
