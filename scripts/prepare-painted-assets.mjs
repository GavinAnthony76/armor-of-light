// Offline art preparation only. Runtime has no ImageMagick or Node dependency.
// Source masters stay in ignored generated-artifacts; optimized exports are bundled.
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root='public/assets/production';
for(const d of ['characters/eliam','enemies','world/desert','world/materials','effects'])mkdirSync(`${root}/${d}`,{recursive:true});
const convert=(args)=>execFileSync('convert',args);
const sheet='generated-artifacts/painted-warrior-parts-source.png';
const part=(name,crop,size,extra=[])=>convert([sheet,'-crop',crop,'+repage','-trim','+repage',...extra,'-resize',size,'-background','none','-gravity','center','-extent',size,'-quality','88',`${root}/characters/eliam/${name}.webp`]);
part('head','341x500+0+0','192x256');
part('torso','341x500+341+0','192x256');
part('boot','341x500+683+0','128x96',['-gravity','south','-crop','100%x38%+0+0','+repage','-trim','+repage']);
part('thigh','341x512+0+512','96x256');
part('bracer','341x512+341+512','96x192');
part('hammer','335x240+675+700','256x192');
convert([`${root}/characters/eliam/torso.webp`,'-modulate','67,32,100','-fill','#4e5273','-colorize','25','-quality','88',`${root}/enemies/shadow-armor.webp`]);
convert(['generated-artifacts/desert-painted-source.png','-crop','1024x640+0+120','+repage','-quality','86',`${root}/world/desert/painted-ruins.webp`]);
// Separate a stone tower from the recreated illustration, without a baked sky.
convert(['-size','1024x1024','xc:black','-fill','white','-draw','polygon 54,259 72,253 74,242 98,249 102,265 126,259 126,246 153,251 159,270 191,270 192,256 213,278 214,299 201,305 199,329 183,337 175,772 148,807 110,807 82,786 80,353 65,333 57,319','generated-artifacts/pillar-mask.png']);
convert(['generated-artifacts/desert-painted-source.png','generated-artifacts/pillar-mask.png','-alpha','on','-channel','A','-fx','u[1].r','+channel','-crop','180x580+40+235','+repage','-resize','128x384','-background','none','-gravity','south','-extent','128x384','-quality','88',`${root}/world/desert/pillar.webp`]);
convert(['-size','1536x512','xc:none',`${root}/world/desert/pillar.webp`,'-geometry','+160+128','-compose','over','-composite','-quality','88',`${root}/world/desert/parallax-pillars.webp`]);
// Mirrored quadrants match at tile boundaries; every land retains its own palette.
for(const [theme,brightness,saturation,tint] of [
 ['desert',94,92,'#bd8449'],['flood',72,34,'#3d7d83'],['garden',82,55,'#638463'],
 ['mountain',85,12,'#91a4bb'],['valley',88,70,'#9f6742'],['city',108,18,'#d4c6aa'],['river',90,50,'#408e85'],
]){
 convert(['public/assets/desert-stone-v2.webp','-resize','128x128','-modulate',`${brightness},${saturation},100`,'-fill',tint,'-colorize','28','(','+clone','-flop',')','+append','(','+clone','-flip',')','-append','-quality','85',`${root}/world/materials/${theme}-stone.webp`]);
}
// Four transparent flame phases, attached to existing ember lifetime/position only.
for(let i=0;i<4;i++){
 convert([sheet,'-crop','100x180+760+520','+repage','-trim','+repage','-resize',`${26+i*5}x${48+i*4}`,'-background','none','-rotate',`${-12+i*8}`,'-gravity','center','-extent','96x96',`generated-artifacts/ember-${i}.png`]);
}
convert([...[0,1,2,3].map(i=>`generated-artifacts/ember-${i}.png`),'+append','-quality','88',`${root}/effects/painted-embers.webp`]);
console.log('Prepared painted rig, seven material palettes, desert layers and flame phases.');
const pillarColor=Number(execFileSync('identify',['-format','%[fx:mean.r+mean.g+mean.b]',`${root}/world/desert/pillar.webp`],{encoding:'utf8'}));
if(pillarColor<.1)throw new Error('Pillar mask discarded painted RGB channels');
