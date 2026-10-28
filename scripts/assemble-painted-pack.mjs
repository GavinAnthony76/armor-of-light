// Run after the Eliam exporter. Preserve independently delivered sampled audio.
import {readFileSync, writeFileSync} from 'node:fs';

const path='public/assets/production/asset-manifest.json';
const manifest=JSON.parse(readFileSync(path,'utf8'));
const hero=JSON.parse(readFileSync('generated-artifacts/eliam-manifest.json','utf8'));
Object.assign(manifest.images,hero.images);
Object.assign(manifest.clips,hero.clips);
// The initial overlay calibration exposed a helmet/plume halo around the
// painted face. Replace only the calibrated body; HeroView keeps all gear,
// procedural arms, cloth and trails, and falls back unless the image is ready.
for(const id of Object.keys(hero.clips))manifest.clips[id].mode='replace';
Object.assign(manifest.actors,hero.actors);
const provenance='Recreated from user-supplied Armor of Light Game Asset Bible direction with explicit user authorization on 2026-10-27; generated source in generated-artifacts/painted-desert-*.png.';
const license='Generated artwork for this project under generation service terms; user-supplied art direction used with user authorization.';
for(const [id,file,width,height,anchor,scale] of [
  ['desert-painted-sky','sky/desert-painted-sunset.webp',1024,640,[0,0],.5],
  ['desert-painted-mid','mid/desert-painted-aqueduct.webp',1024,640,[0,0],.5],
  ['desert-painted-archive','sky/desert-painted-archive.webp',1024,640,[0,0],.5],
  ['desert-painted-stone','tiles/desert-painted-stone.webp',256,256,[0,0],.25],
  ['desert-painted-palm','foreground/desert-painted-palm.webp',512,512,[256,508],.32],
]){
  manifest.images[id]={src:'assets/production/world/desert/'+file,width,height,anchor,scale,
    source:id==='desert-painted-stone'?'Optimized existing desert-stone-v2 painting; original provenance in docs/ENVIRONMENT_ASSETS.md.':provenance,license};
}
const retainedProps=(manifest.lands.desert?.props??[]).filter(p=>p.image!=='desert-painted-palm');
if(manifest.images['desert-pillar']&&!retainedProps.some(p=>p.image==='desert-pillar')){
  retainedProps.push({image:'desert-pillar',x:440,y:450},{image:'desert-pillar',x:1590,y:450,facing:-1});
}
manifest.lands.desert={
  layers:[
    {image:'desert-painted-sky',plane:'background',height:540,speedX:.035,speedY:0,cover:true,depth:[-2000,720],fadeY:120},
    {image:'desert-painted-mid',plane:'background',height:500,y:100,speedX:.28,speedY:0,cover:true,opacity:.55,depth:[-2000,660],fadeY:100},
    {image:'desert-painted-mid',plane:'foreground',height:620,y:220,speedX:.85,speedY:0,cover:true,opacity:.12,depth:[-2000,650],fadeY:100},
    {image:'desert-painted-archive',plane:'background',height:540,speedX:.12,speedY:0,cover:true,depth:[500,2400],fadeY:200},
  ],
  props:[
    {image:'desert-painted-palm',x:560,y:450,sway:.035},
    {image:'desert-painted-palm',x:1710,y:450,sway:.025,facing:-1},
    {image:'desert-painted-palm',x:3910,y:450,sway:.035},
    {image:'desert-painted-palm',x:6300,y:450,sway:.03,facing:-1},
    ...retainedProps,
  ],
  surfaces:{ground:'desert-painted-stone',platform:'desert-painted-stone'},
};
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log('Installed painted Eliam and desert pack; existing audio/events preserved.');
