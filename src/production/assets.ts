import { asset } from '../assets';
import { emptyManifest } from './types';
import { validateManifest } from './manifest';

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
  readonly budget=96*1024*1024;
  /** Protect this frame's assets from cache eviction/reload thrashing. */
  beginFrame():void {this.visible.clear();}
  constructor(
    readonly resolve:(path:string)=>string=asset,
    private fetcher:typeof fetch=(...args)=>fetch(...args),
    private makeImage:()=>HTMLImageElement=()=>new Image(),
  ){}
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
        }
        if(this.bytes+cost>this.budget){this.failed.add(id);this.report(`Current scene image budget exceeded: ${id}`);resolve(null);return;}
        this.cache.set(id,im);this.bytes+=cost;resolve(im);
      };
      const timer=setTimeout(()=>finish(false),8000);
      im.onload=()=>finish(true);im.onerror=()=>finish(false);
      im.decoding='async';im.src=this.resolve(spec.src);
    }).catch(e=>{this.failed.add(id);this.report(`Image loading failed for ${id}: ${String(e)}`);return null;});
    this.pending.set(id,promise);
    void promise.finally(()=>this.pending.delete(id));
    return promise;
  }
  diagnostics():{images:number;decodedBytes:number;issues:readonly string[]} {
    return {images:this.cache.size,decodedBytes:this.bytes,issues:this.issues};
  }
}
export const productionAssets=new ProductionAssets();
