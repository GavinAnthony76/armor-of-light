// Authoring only. The generated master stays ignored and is not a dependency.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const master='generated-artifacts/painted-guardian-source.png';
const path='public/assets/production/asset-manifest.json';
const m=JSON.parse(readFileSync(path,'utf8'));
const actors=[
  ['serpent',70,70,'340x470+0+0',['spit','tail','bite']],
  ['thorn',64,128,'330x470+340+0',['thrust1','thrust2','tail','summon']],
  ['watcher',64,144,'354x470+670+0',['casterOrb','tail','kingWave','kingDash']],
  ['colossus',120,200,'340x554+0+470',['sweep','slam']],
  ['keeper',64,128,'330x554+340+470',['kingDash','combo1','combo2','combo3','kingWave','summon']],
  ['king',64,128,'354x554+670+470',['combo1','combo2','combo3','kingDash','kingWave','kingLeap','summon']],
];
for(const [kind,w,h,crop,attacks] of actors){
  const dir=`assets/production/bosses/${kind}`;
  mkdirSync(`public/${dir}`,{recursive:true});
  const src=`${dir}/${kind}-painted-body.png`,id=`${kind}-painted-body`;
  const result=spawnSync('magick',[master,'-crop',crop,'+repage',
    // Background-removal exports may retain faint checkerboard alpha. Remove
    // only low-confidence source alpha before resampling the clean silhouette.
    '-channel','A','-threshold','50%','+channel','-trim','+repage',
    '-resize',`${w/.5}x${h/.5}`,'-background','none','-gravity','south',
    '-extent','512x448','-gravity','north','-extent','512x512',
    '-depth','8','rgba:-'],{maxBuffer:2*1024*1024});
  if(result.status!==0)throw Error(String(result.stderr));
  const rgba=result.stdout;
  if(rgba.length!==512*512*4)throw Error('Unexpected pixel count');
  for(let i=0;i<rgba.length;i+=4)if(!rgba[i+3])rgba[i]=rgba[i+1]=rgba[i+2]=0;
  const png=spawnSync('magick',['-size','512x512','-depth','8','rgba:-',
    '+profile','*','-interlace','none','-define','png:color-type=6',`public/${src}`],{input:rgba});
  if(png.status!==0)throw Error(String(png.stderr));
  m.images[id]={src,width:512,height:512,anchor:[256,448],scale:.5,
    source:'User-authorized recreation from Armor of Light Complete Game Asset Showcase / Game Asset Bible; six-guardian armless painted source. Serpent material is clipped to original live neck and jaw geometry.',
    license:'Generated artwork for this project under generation service terms; user-authorized recreation from supplied art direction.'};
  const states={};
  for(const state of ['spawn','move','stagger','hurt','dying',...attacks.flatMap(a=>['windup','active','recover'].map(s=>`${s}.${a}`))]){
    const key=`painted-${kind}-${state.replaceAll('.','-').toLowerCase()}`;
    m.clips[key]={image:id,frames:[0],fps:12,loop:state==='move',mode:'replace',bodyMotion:state.split('.')[0]};
    states[state]=key;
  }
  m.actors[`boss.${kind}`]={states};
}
writeFileSync(path,JSON.stringify(m,null,2)+'\n');
console.log('Installed six calibrated guardian sources and exact live-state bindings.');
