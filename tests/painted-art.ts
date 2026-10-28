// @ts-expect-error Node-only export audit; browser project intentionally omits Node type packages.
import { readFileSync, statSync } from 'node:fs';
import { validateManifest } from '../src/production/manifest';
import { productionAssets } from '../src/production/assets';
import { drawPaintedHead, drawPaintedTorso, drawPaintedSegment } from '../src/render/painted-rig';
import { HeroView } from '../src/render/hero';
import { Player } from '../src/core/player';
let count=0;
const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);count++;};
const manifest=validateManifest(JSON.parse(readFileSync('public/assets/production/asset-manifest.json','utf8')));
let decoded=0,compressed=0;
for(const [id,spec] of Object.entries(manifest.images)){
  const path=`public/${spec.src}`,b=readFileSync(path);
  const png=b.subarray(0,8).equals(new Uint8Array([137,80,78,71,13,10,26,10]));
  check(png||(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'),`${id}: real PNG/WebP export`);
  const chunk=png?'PNG':b.toString('ascii',12,16);
  let w:number,h:number;
  if(png){w=b.readUInt32BE(16);h=b.readUInt32BE(20);}
  else if(chunk==='VP8X'){w=b.readUIntLE(24,3)+1;h=b.readUIntLE(27,3)+1;}
  else if(chunk==='VP8L'){const n=b.readUInt32LE(21);w=(n&0x3fff)+1;h=((n>>>14)&0x3fff)+1;}
  else {check(chunk==='VP8 ',`${id}: supported WebP header`);w=b.readUInt16LE(26)&0x3fff;h=b.readUInt16LE(28)&0x3fff;}
  check(w===spec.width&&h===spec.height,`${id}: exact manifest dimensions`);
  if(id.startsWith('eliam-')||id==='desert-pillar'){
    check(png?b[25]===6:chunk==='VP8X'&&(b[20]&16)!==0,`${id}: transparent RGBA export`);
  }
  decoded+=w*h*4;compressed+=statSync(path).size;
}
check(decoded<80*1024*1024,'combined painted rig and animation pack fits 80MiB scene budget');
check(compressed<6*1024*1024,'combined optimized paintings and atlas stay under 6MiB');
for(const actor of Object.values(manifest.actors)){
  check(Object.values(actor.states).every(id=>manifest.clips[id].frames.length>1),
    'body animation mappings use multiple pose samples, never a static full-body portrait');
}
for(const theme of ['desert','flood','garden','mountain','valley','city','river']){
  check(!!manifest.lands[theme]?.surfaces?.ground,`${theme}: actual textured terrain binding`);
}
check(manifest.lands.desert.layers.every(l=>l.depth!==undefined),'new desert scenery cannot cover archive/sky routes');
for(const y of [-2100,2500]){
  check(manifest.lands.desert.layers.every(l=>l.depth&&(y<l.depth[0]||y>l.depth[1])),'archive and sky depths retain their original scenery');
}
check(manifest.clips['painted-ember'].frames.length===4,'real four-phase ember atlas');

// The ready artwork uses original joint transforms and uniform image scale.
const originalImage=productionAssets.image;
type Call={op:string,args:unknown[]};
let calls:Call[]=[];
const ctx=new Proxy({globalAlpha:1},{
  get(target,key){
    if(key in target)return Reflect.get(target,key);
    if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
    return (...args:unknown[])=>calls.push({op:String(key),args});
  },
}) as unknown as CanvasRenderingContext2D;
productionAssets.image=(id:string)=>{
  const spec=manifest.images[id];
  return spec?{id,complete:true,naturalWidth:spec.width,naturalHeight:spec.height} as unknown as HTMLImageElement:null;
};
check(drawPaintedHead(ctx,3,4,.2),'painted head is ready');
const draws=calls.filter(c=>c.op==='drawImage'),draw=draws[draws.length-1];
check(Math.abs(Number(draw.args[3])/Number(draw.args[4])-.75)<.0001,'head preserves source aspect ratio');
check(drawPaintedTorso(ctx,0,-12,.3),'painted torso is ready');
check(drawPaintedSegment(ctx,'eliam-bracer',{x:0,y:0},{x:12,y:0},9),'arm follows horizontal bone');
check(calls.some(c=>c.op==='rotate'&&c.args[0]===-Math.PI/2),'bone changes rotate the painted segment');
const p=new Player(100,450,8),hero=new HeroView();
p.onGround=true;
const frame=()=>{
  calls=[];const before=JSON.stringify(p);hero.update(p,1/60);hero.draw(ctx,p);
  check(JSON.stringify(p)===before,'painted drawing cannot mutate physics, equipment or combat');
  check(calls.filter(c=>c.op==='drawImage').length>=8,'painted parts remain articulated');
  return JSON.stringify(calls.filter(c=>c.op==='rotate'||c.op==='translate'));
};
const idle=frame();
p.state='attack';p.combo=1;p.t=p.swing.dur*.5;
check(frame()!==idle,'live combo phase changes rig transforms instead of showing a still image');
p.state='move';p.onGround=false;p.vy=-180;
check(frame()!==idle,'jump retains its own rig pose');
productionAssets.image=()=>null;
check(!drawPaintedHead(ctx,0,0,0),'missing artwork explicitly retains procedural fallback');
calls=[];hero.draw(ctx,p);
check(calls.some(c=>c.op==='fill'),'procedural hero still draws when images fail');
productionAssets.image=originalImage;
console.log(`${count} painted export, aspect ratio, articulated pose, fallback and asset-budget checks passed (${Math.round(compressed/1024)}KiB exports).`);
