import {readFileSync,statSync} from 'node:fs';
import {validateManifest} from '../src/production/manifest.ts';

let checks=0;
const check=(ok,message)=>{if(!ok)throw Error(message);checks++;};
const manifest=validateManifest(JSON.parse(readFileSync('public/assets/production/asset-manifest.json','utf8')));
const mappings={
  swing:'swing',hit:'hit',hitHeavy:'hammer-impact',block:'block',parry:'parry',
  jump:'jump',land:'land',splash:'splash',click:'menu-select',
};
check(Object.keys(manifest.audio).sort().join()===Object.keys(mappings).sort().join(),'only approved event mappings');
let encoded=0,decoded=0;
for(const [event,name] of Object.entries(mappings)){
  const spec=manifest.audio[event],base=`assets/production/audio/sfx/${name}`;
  check(spec.sources.join()===`${base}.ogg,${base}.wav`,`${event}: OGG then PCM fallback`);
  check(spec.voices<=3&&spec.gain>0&&spec.gain<=1,`${event}: conservative event mix`);
  for(const path of spec.sources){
    const size=statSync(`public/${path}`).size;encoded+=size;
    check(size<4*1024*1024,`${event}: encoded source budget`);
  }
  const ogg=readFileSync(`public/${base}.ogg`);
  check(ogg.toString('ascii',0,4)==='OggS'&&ogg.includes(Buffer.from('vorbis')),`${event}: actual Vorbis source`);
  const wav=readFileSync(`public/${base}.wav`);
  check(wav.toString('ascii',0,4)==='RIFF'&&wav.toString('ascii',8,12)==='WAVE',`${event}: actual WAV fallback`);
  let format,pcm;
  for(let pos=12;pos+8<=wav.length;){
    const id=wav.toString('ascii',pos,pos+4),size=wav.readUInt32LE(pos+4);
    if(id==='fmt ')format=wav.subarray(pos+8,pos+8+size);
    if(id==='data')pcm=wav.subarray(pos+8,pos+8+size);
    pos+=8+size+(size%2);
  }
  check(format?.readUInt16LE(0)===1&&format.readUInt16LE(2)===1&&
    format.readUInt32LE(4)===48000&&format.readUInt16LE(14)===16,`${event}: mono 48kHz 16-bit PCM`);
  const duration=pcm.length/2/48000;decoded+=pcm.length*2;
  check(duration>=.05&&duration<=.5,`${event}: short one-shot duration`);
  let peak=0,first=-1,last=-1;
  for(let i=0;i<pcm.length/2;i++){
    const value=Math.abs(pcm.readInt16LE(i*2))/32768;peak=Math.max(peak,value);
    if(value>.001){if(first<0)first=i;last=i;}
  }
  check(peak<=10**(-3/20)&&peak>.05,`${event}: non-silent, unclipped headroom`);
  check(first>=0&&first/48000<=.01,`${event}: onset within 10ms`);
  check(last/48000<duration&&Math.abs(pcm.readInt16LE(pcm.length-2))<100,`${event}: quiet tail`);
}
check(encoded<512*1024&&decoded<1024*1024,'small pack encoded and decoded budgets');
check(!manifest.audio.warn&&!manifest.audio.warnRed&&!manifest.audio.sling,'distinct warnings and sling remain synthesized');
console.log(`${checks} approved sample mapping, waveform, codec and delivery checks passed (${encoded} encoded bytes).`);
