import { asset } from '../assets';
import { emptyManifest } from './types';
import { validateManifest } from './manifest';
import type { EnemyPresentation, SourceRect } from './types';
import { validMaterialPixels } from './enemy-presentation';

function readMaterialPixels(im:HTMLImageElement,rect:SourceRect):Uint8ClampedArray {
  const canvas=document.createElement('canvas');
  canvas.width=rect[2];canvas.height=rect[3];
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Material pixel reader unavailable');
  ctx.drawImage(im,...rect,0,0,rect[2],rect[3]);
  return ctx.getImageData(0,0,rect[2],rect[3]).data;
}

/** Failures are observable but never prevent the procedural game from rendering. */
export class ProductionAssets {
  manifest=emptyManifest();
  readonly issues:string[]=[];
  private loading?:Promise<void>;
  private cache=new Map<string,HTMLImageElement>();
  private pending=new Map<string,Promise<HTMLImageElement|null>>();
  private failed=new Set<string>();
  private visible=new Set<string>();
  private bytes=0;
  private loaded=new Set<string>();
  private loads=0;
  private materialChecks=new WeakMap<HTMLImageElement,Map<string,boolean>>();
  private reloads=0;
  private evictions=0;
  private peakBytes=0;
  readonly budget=96*1024*1024;
  /** Protect this frame's assets from cache eviction/reload thrashing. */
  beginFrame():void {this.visible.clear();}
  constructor(
    readonly resolve:(path:string)=>string=asset,
    private fetcher:typeof fetch=(...args)=>fetch(...args),
    private makeImage:()=>HTMLImageElement=()=>new Image(),
    private readPixels:(im:HTMLImageElement,rect:SourceRect)=>Uint8ClampedArray=readMaterialPixels,
  ){}
  /** Check each decoded source/rectangle once, outside the repeated drawing path. */
  materialImage(id:string,samples:NonNullable<EnemyPresentation['samples']>):HTMLImageElement|undefined {
    const im=this.image(id);if(!im)return undefined;
    let checks=this.materialChecks.get(im);
    if(!checks){checks=new Map();this.materialChecks.set(im,checks);}
    for(const [role,rect] of Object.entries(samples)){
      const key=JSON.stringify([role,rect]);
      if(!checks.has(key)){
        let valid=false;
        try{valid=validMaterialPixels(this.readPixels(im,rect),rect,role==='serpentHead');}catch{/* Fail closed, including unreadable/tainted canvas. */}
        checks.set(key,valid);
        if(!valid)this.report(`Invalid or transparent material sample ${id}: ${role}`);
      }
      if(!checks.get(key))return undefined;
    }
    return im;
  }
  report(message:string):void {
    if(this.issues.includes(message))return;
    this.issues.push(message);
    console.warn(`[production assets] ${message}; existing presentation retained.`);
  }
  install(raw:unknown):void {
    const valid=validateManifest(raw);
    this.manifest=valid;
  }
  load():Promise<void> {
    return this.loading??=(async()=>{
      try{
        const bytes=await this.read('assets/production/asset-manifest.json',512*1024);
        this.install(JSON.parse(new TextDecoder().decode(bytes)));
      }catch(e){this.report(`Manifest unavailable: ${String(e)}`);}
    })();
  }
  async read(path:string,limit:number):Promise<ArrayBuffer> {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await this.fetcher(this.resolve(path),{signal:controller.signal});
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${path}`);
      const announced=Number(response.headers.get('content-length'));
      if(announced>limit)throw new Error(`File budget exceeded: ${path}`);
      const data=await response.arrayBuffer();
      if(data.byteLength>limit)throw new Error(`File budget exceeded: ${path}`);
      return data;
    }finally{clearTimeout(timer);}
  }
  image(id:string):HTMLImageElement|null {
    this.visible.add(id);
    const im=this.cache.get(id);
    if(im){this.cache.delete(id);this.cache.set(id,im);return im;}
    if(!this.failed.has(id)&&this.manifest.images[id])void this.preloadImage(id);
    return null;
  }
  preloadImage(id:string):Promise<HTMLImageElement|null> {
    const existing=this.cache.get(id);
    if(existing)return Promise.resolve(existing);
    if(this.failed.has(id))return Promise.resolve(null);
    const pending=this.pending.get(id);if(pending)return pending;
    const spec=this.manifest.images[id];
    if(!spec)return Promise.resolve(null);
    this.loads++;
    if(this.loaded.has(id))this.reloads++;
    const promise=new Promise<HTMLImageElement|null>(resolve=>{
      const im=this.makeImage();
      const finish=(ok:boolean)=>{
        clearTimeout(timer);im.onload=null;im.onerror=null;
        if(!ok||im.naturalWidth!==spec.width||im.naturalHeight!==spec.height){
          this.failed.add(id);this.report(`Missing, corrupt or dimension-mismatched image ${id}`);resolve(null);return;
        }
        const cost=spec.width*spec.height*4;
        if(cost>this.budget){this.failed.add(id);this.report(`Decoded image budget exceeded: ${id}`);resolve(null);return;}
        while(this.bytes+cost>this.budget&&this.cache.size){
          const key=[...this.cache.keys()].find(k=>!this.visible.has(k));
          if(!key)break;
          const old=this.cache.get(key)!;
          this.bytes-=old.naturalWidth*old.naturalHeight*4;this.cache.delete(key);
          this.evictions++;
        }
        if(this.bytes+cost>this.budget){this.failed.add(id);this.report(`Current scene image budget exceeded: ${id}`);resolve(null);return;}
        this.cache.set(id,im);this.bytes+=cost;this.loaded.add(id);
        this.peakBytes=Math.max(this.peakBytes,this.bytes);resolve(im);
      };
      const timer=setTimeout(()=>finish(false),8000);
      im.onload=()=>finish(true);im.onerror=()=>finish(false);
      im.decoding='async';im.src=this.resolve(spec.src);
    }).catch(e=>{this.failed.add(id);this.report(`Image loading failed for ${id}: ${String(e)}`);return null;});
    this.pending.set(id,promise);
    void promise.finally(()=>this.pending.delete(id));
    return promise;
  }
  diagnostics():{images:number;decodedBytes:number;visibleBytes:number;pending:number;failed:number;
    loads:number;reloads:number;evictions:number;peakDecodedBytes:number;residentIds:string[];issues:readonly string[]} {
    let visibleBytes=0;
    for(const id of this.visible){
      const im=this.cache.get(id);
      if(im)visibleBytes+=im.naturalWidth*im.naturalHeight*4;
    }
    return {images:this.cache.size,decodedBytes:this.bytes,visibleBytes,pending:this.pending.size,
      failed:this.failed.size,loads:this.loads,reloads:this.reloads,evictions:this.evictions,
      peakDecodedBytes:this.peakBytes,residentIds:[...this.cache.keys()],issues:[...this.issues]};
  }
}
export const productionAssets=new ProductionAssets();
