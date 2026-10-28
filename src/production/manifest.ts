import type { ProductionManifest } from './types';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v:unknown,min:number,max:number):v is number=>finite(v,min,max)&&Number.isInteger(v);
const point=(v:unknown):v is [number,number]=>Array.isArray(v)&&v.length===2&&v.every(n=>finite(n,-16384,16384));
export function productionPath(v:unknown,ext:string):v is string {
  return typeof v==='string'&&v.startsWith('assets/production/')&&!v.includes('..')&&
    new RegExp(`^assets/production/[a-z0-9/_.-]+\\.(${ext})$`).test(v);
}
/** Reject malformed presentation data; no fields are forwarded to gameplay. */
export function validateManifest(raw:unknown):ProductionManifest {
  const fail=(m:string):never=>{throw new Error(`Production manifest: ${m}`);};
  if(!record(raw)||raw.version!==1)fail('expected version 1');
  const m=raw as Record<string,unknown>;
  for(const key of ['images','clips','actors','effects','lands','audio']){
    if(!record(m[key])||Object.keys(m[key] as object).length>256)fail(`invalid ${key}`);
    const identity=key==='audio'?/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/:/^[a-z0-9][a-z0-9.-]*$/;
    if(Object.keys(m[key] as object).some(id=>!identity.test(id)||['constructor','prototype','__proto__'].includes(id)))fail(`unsafe ${key} identity`);
  }
  const images=m.images as Record<string,unknown>,clips=m.clips as Record<string,unknown>;
  const owns=(object:object,id:unknown):id is string=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(object,id);
  for(const [id,value] of Object.entries(images)){
    if(!record(value))fail(`image ${id}`);
    const v=value as Record<string,unknown>;
    if(!productionPath(v.src,'png|webp')||!integer(v.width,1,4096)||!integer(v.height,1,4096)||
      !point(v.anchor)||!finite(v.scale,.01,4)||typeof v.source!=='string'||typeof v.license!=='string')fail(`image ${id} metadata`);
    let fw=v.width as number,fh=v.height as number;
    if(v.frame!==undefined){
      if(!record(v.frame))fail(`image ${id} frame`);
      const f=v.frame as Record<string,unknown>;
      if(!integer(f.width,1,4096)||!integer(f.height,1,4096)||!integer(f.columns,1,128)||!integer(f.count,1,256)||
        (f.width as number)*(f.columns as number)>fw||Math.ceil((f.count as number)/(f.columns as number))*(f.height as number)>fh)fail(`image ${id} atlas bounds`);
      fw=f.width as number;fh=f.height as number;
    }
    if((v.anchor as number[])[0]<0||(v.anchor as number[])[0]>fw||(v.anchor as number[])[1]<0||(v.anchor as number[])[1]>fh)fail(`image ${id} anchor`);
    if(v.sockets!==undefined&&(!record(v.sockets)||Object.values(v.sockets).some(p=>!point(p))))fail(`image ${id} sockets`);
  }
  for(const [id,value] of Object.entries(clips)){
    if(!record(value))fail(`clip ${id}`);
    const v=value as Record<string,unknown>,image=(owns(images,v.image)?images[v.image]:undefined) as Record<string,unknown>|undefined;
    const count=(image?.frame as Record<string,unknown>|undefined)?.count??1;
    if(!image||!Array.isArray(v.frames)||!v.frames.length||v.frames.length>256||v.frames.some(n=>!integer(n,0,Number(count)-1))||
      !finite(v.fps,1,60)||typeof v.loop!=='boolean'||(v.mode!==undefined&&v.mode!=='overlay'&&v.mode!=='replace'))fail(`clip ${id} mapping`);
  }
  for(const [id,value] of Object.entries(m.actors as object)){
    if(!record(value)||!record(value.states)||Object.values(value.states).some(c=>!owns(clips,c)))fail(`actor ${id}`);
  }
  for(const [id,c] of Object.entries(m.effects as object))if(!owns(clips,c))fail(`effect ${id}`);
  for(const [id,value] of Object.entries(m.lands as object)){
    if(!['desert','flood','garden','mountain','valley','city','river'].includes(id)||!record(value)||!Array.isArray(value.layers)||!Array.isArray(value.props)||
      value.layers.length>8||value.props.length>128)fail(`land ${id}`);
    const v=value as {layers:unknown[];props:unknown[]};
    for(const layer of v.layers){
      if(!record(layer)||!owns(images,layer.image)||!['background','foreground'].includes(String(layer.plane))||
        !finite(layer.height,64,4096)||!finite(layer.speedX,0,1.5)||!finite(layer.speedY,0,1)||
        (layer.x!==undefined&&!finite(layer.x,-20000,20000))||(layer.y!==undefined&&!finite(layer.y,-2000,4000))||
        (layer.opacity!==undefined&&!finite(layer.opacity,0,layer.plane==='foreground'?.35:1))||
        (layer.depth!==undefined&&(!point(layer.depth)||layer.depth[0]>=layer.depth[1]))||
        (layer.fadeY!==undefined&&!finite(layer.fadeY,0,300))||
        (layer.repeatX!==undefined&&typeof layer.repeatX!=='boolean')||(layer.cover!==undefined&&typeof layer.cover!=='boolean'))fail(`land ${id} layer`);
      const s=images[(layer as Record<string,unknown>).image as string] as Record<string,unknown>;
      const f=s.frame as Record<string,number>|undefined;
      if((layer as Record<string,number>).height*(f?.width??Number(s.width))/(f?.height??Number(s.height))<64)fail(`land ${id} layer repeat density`);
    }
    for(const p of v.props)if(!record(p)||!owns(images,p.image)||!finite(p.x,-20000,20000)||!finite(p.y,-2000,4000)||
      (p.facing!==undefined&&p.facing!==1&&p.facing!==-1)||(p.clip!==undefined&&(!owns(clips,p.clip)||(clips[String(p.clip)] as Record<string,unknown>).image!==p.image)))fail(`land ${id} prop`);
    const surfaces=(value as Record<string,unknown>).surfaces;
    if(surfaces!==undefined){
      if(!record(surfaces))fail(`land ${id} surfaces`);
      for(const [kind,image] of Object.entries(surfaces as object)){
        const s=(owns(images,image)?images[image]:undefined) as Record<string,unknown>|undefined;
        if(!['ground','platform'].includes(kind)||!s||s.frame||Number(s.width)*Number(s.scale)<16||Number(s.height)*Number(s.scale)<16)fail(`land ${id} surface tile`);
      }
    }
  }
  for(const [id,value] of Object.entries(m.audio as object))
    if(!record(value)||!Array.isArray(value.sources)||!value.sources.length||value.sources.length>3||
      value.sources.some(s=>!productionPath(s,'wav|ogg|mp3'))||!finite(value.gain,0,1)||!integer(value.voices,1,8))fail(`audio ${id}`);
  return raw as ProductionManifest;
}
