// Authoring only: ignored source sheets are not build/runtime dependencies.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const path='public/assets/production/asset-manifest.json';
const m=JSON.parse(readFileSync(path,'utf8'));
const attacks={husk:['huskSwing'],wisp:['wispDash'],caster:['casterOrb'],
  lurker:['lurkerLeap','lurkerSnap'],sentinel:['thrust1','thrust2']};
const boxes={husk:[40,74],wisp:[34,34],caster:[40,82],lurker:[56,46],sentinel:[48,92]};
const sources=[
  ['marshjaw','lurker','a','395x260+10+260'],
  ['the-bellwarden','sentinel','a','195x480+450+30'],
  ['briar-duelist','sentinel','a','190x485+750+25'],
  ['rootmaw','lurker','a','385x315+10+660'],
  ['gale-harrier','wisp','a','255x435+400+545'],
  ['the-glass-seer','caster','a','215x455+715+530'],
  ['cinder-brute','husk','b','265x450+65+35'],
  ['iron-oathkeeper','sentinel','b','215x450+415+30'],
  ['the-night-scribe','caster','b','205x450+710+30'],
  ['grave-hound','lurker','b','350x300+25+665'],
  ['spring-oathkeeper','sentinel','b','195x460+420+505'],
  ['dawn-revenant','husk','b','215x460+705+505'],
];
for(const [name,kind,sheet,crop] of sources){
  const [w,h]=boxes[kind],id=`mini-${name}-painted-body`;
  const dir=`assets/production/enemies/minis/${name}`,src=`${dir}/${name}-painted-body.png`;
  mkdirSync(`public/${dir}`,{recursive:true});
  const result=spawnSync('magick',[`generated-artifacts/painted-mini-source-${sheet}.png`,
    '-crop',crop,'+repage','-channel','A','-threshold','50%','+channel','-trim','+repage',
    '-resize',`${w/.25}x${h/.25}`,'-background','none','-gravity','south',
    '-extent','512x448','-gravity','north','-extent','512x512','-depth','8','rgba:-'],
    {maxBuffer:2*1024*1024});
  if(result.status!==0)throw Error(String(result.stderr));
  const rgba=result.stdout;
  if(rgba.length!==512*512*4)throw Error('Unexpected cutout pixel count');
  for(let i=0;i<rgba.length;i+=4)if(!rgba[i+3])rgba[i]=rgba[i+1]=rgba[i+2]=0;
  const png=spawnSync('magick',['-size','512x512','-depth','8','rgba:-','+profile','*',
    '-interlace','none','-define','png:color-type=6',`public/${src}`],{input:rgba});
  if(png.status!==0)throw Error(String(png.stderr));
  m.images[id]={src,width:512,height:512,anchor:[256,448],scale:.25,
    source:`User-authorized original ${name} body painting following Armor of Light Complete Game Asset Showcase / Game Asset Bible; mini source sheet ${sheet}, calibrated without arms, held gear, shadows or warning effects.`,
    license:'Generated artwork for this project under generation service terms; user-authorized recreation from supplied art direction.'};
  const states={};
  for(const state of ['spawn','move','stagger','hurt','dying',
    ...attacks[kind].flatMap(a=>['windup','active','recover'].map(s=>`${s}.${a}`))]){
    const key=`painted-mini-${name}-${state.replaceAll('.','-').toLowerCase()}`;
    m.clips[key]={image:id,frames:[0],fps:12,loop:state==='move',mode:'replace',bodyMotion:state.split('.')[0]};
    states[state]=key;
  }
  m.actors[`mini.${name}`]={states};
}
writeFileSync(path,JSON.stringify(m,null,2)+'\n');
console.log('Installed twelve distinct mini bodies and exact live-state bindings; no gameplay changes.');
