// Local authoring tool, not a build/runtime dependency. Master stays ignored.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const master='generated-artifacts/painted-enemy-source.png';
const path='public/assets/production/asset-manifest.json';
const manifest=JSON.parse(readFileSync(path,'utf8'));
const actors=[
  ['husk',40,74,'207x405+86+70',['huskSwing']],
  ['wisp',34,34,'190x290+420+155',['wispDash']],
  ['caster',40,82,'210x435+695+40',['casterOrb']],
  ['lurker',56,46,'320x262+40+685',['lurkerLeap','lurkerSnap']],
  ['sentinel',48,92,'220x443+405+502',['thrust1','thrust2']],
  ['warden',120,200,'275x430+670+515',['sweep','slam','summon']],
];
for(const [kind,w,h,crop,attacks] of actors){
  const boss=kind==='warden',scale=boss?.5:.25;
  const dir=`assets/production/${boss?'bosses':'enemies'}/${kind}`;
  mkdirSync(`public/${dir}`,{recursive:true});
  const src=`${dir}/${kind}-painted-body.png`,id=`${kind}-painted-body`;
  // Preserve the actual source aspect ratio; transparent untrimmed cell has
  // exactly the same world foot pivot as the fallback, never a camera offset.
  const result=spawnSync('magick',[master,'-crop',crop,'+repage','-trim','+repage',
    '-resize',`${w/scale}x${h/scale}`,'-background','none','-gravity','south',
    '-extent','512x448','-gravity','north','-extent','512x512',
    '-depth','8','rgba:-'],{maxBuffer:2*1024*1024});
  if(result.status!==0)throw Error(String(result.stderr));
  const rgba=result.stdout;
  if(rgba.length!==512*512*4)throw Error('Unexpected cutout pixel count');
  // Normalize AFTER 8-bit alpha quantization. Otherwise tiny alpha values round
  // down at encode time and can retain nonzero hidden RGB in the final file.
  for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]===0)rgba[i]=rgba[i+1]=rgba[i+2]=0;
  const png=spawnSync('magick',['-size','512x512','-depth','8','rgba:-',
    '+profile','*','-interlace','none','-define','png:color-type=6',`public/${src}`],{input:rgba});
  if(png.status!==0)throw Error(String(png.stderr));
  // PNG avoids inconsistent direct-preview decoding of lossless-alpha WebP.
  rmSync(`public/${dir}/${kind}-painted-body.webp`,{force:true});
  manifest.images[id]={src,width:512,height:512,anchor:[256,448],scale,
    source:'Recreated from the user-approved Armor of Light Complete Game Asset Showcase and Game Asset Bible; six-body painted source, articulated in the original combat poses.',
    license:'Generated artwork for this project under generation service terms; user-authorized recreation from supplied art direction.'};
  const states={};
  for(const state of ['spawn','move','stagger','hurt','dying',...attacks.flatMap(a=>['windup','active','recover'].map(s=>`${s}.${a}`))]){
    // Clip identities are lowercase; exact live state keys retain camelCase IDs.
    const key=`painted-${kind}-${state.replaceAll('.','-').toLowerCase()}`;
    manifest.clips[key]={image:id,frames:[0],fps:12,loop:state==='move',mode:'replace',bodyMotion:state.split('.')[0]};
    states[state]=key;
  }
  manifest.actors[boss?`boss.${kind}`:kind]={states};
}
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log('Installed six calibrated articulated paintings; combat and all existing assets retained.');
