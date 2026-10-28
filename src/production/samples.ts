import { productionAssets, type ProductionAssets } from './assets';

/** Decoding never delays an event: until ready, callers immediately synthesize it. */
export class SampleBank {
  private buffers=new Map<string,AudioBuffer>();
  private pending=new Map<string,Promise<void>>();
  private failed=new Set<string>();
  private voices=new Map<string,number>();
  private totalVoices=0;
  private bytes=0;
  constructor(private ctx:AudioContext,private bus:AudioNode,private assets:ProductionAssets=productionAssets,private decodeTimeoutMs=2000){}
  preload(id:string):Promise<void> {
    const pending=this.pending.get(id);if(pending)return pending;
    const spec=this.assets.manifest.audio[id];
    if(!spec||this.failed.has(id)||this.buffers.has(id))return Promise.resolve();
    const promise=this.decode(id,spec.sources).finally(()=>this.pending.delete(id));
    this.pending.set(id,promise);return promise;
  }
  private async decode(id:string,sources:string[]):Promise<void> {
    const errors:string[]=[];
    for(const path of sources){
        try{
          const raw=await this.assets.read(path,4*1024*1024);
          const buffer=await this.decodeBuffer(raw);
          const bytes=buffer.length*buffer.numberOfChannels*4;
          if(buffer.duration>10||this.bytes+bytes>32*1024*1024)throw new Error('Decoded SFX budget exceeded');
          this.buffers.set(id,buffer);this.bytes+=bytes;return;
        }catch(e){errors.push(`${path}: ${String(e)}`);}
      }
    this.failed.add(id);this.assets.report(`No decodable, in-budget SFX source for ${id}: ${errors.join('; ')}`);
  }
  /** Some codec implementations stall rather than reject; never block WAV fallback forever. */
  private async decodeBuffer(raw:ArrayBuffer):Promise<AudioBuffer> {
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      return await Promise.race([
        this.ctx.decodeAudioData(raw),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('SFX decode timeout')),this.decodeTimeoutMs);}),
      ]);
    }finally{clearTimeout(timer);}
  }
  play(id:string,level=1):boolean {
    const spec=this.assets.manifest.audio[id];
    if(!spec)return false;
    const buffer=this.buffers.get(id);
    if(!buffer){void this.preload(id);return false;}
    if((this.voices.get(id)??0)>=spec.voices||this.totalVoices>=24)return true;
    try{
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
      source.buffer=buffer;
      gain.gain.value=spec.gain*(Number.isFinite(level)?Math.max(0,Math.min(1,level)):1);
      source.connect(gain).connect(this.bus);
      source.onended=()=>{
        this.voices.set(id,Math.max(0,(this.voices.get(id)??1)-1));this.totalVoices--;
        source.disconnect();gain.disconnect();
      };
      try{source.start();}catch(e){source.onended=null;source.disconnect();gain.disconnect();throw e;}
      this.voices.set(id,(this.voices.get(id)??0)+1);this.totalVoices++;return true;
    }catch(e){this.assets.report(`SFX playback failed for ${id}: ${String(e)}`);return false;}
  }
}
