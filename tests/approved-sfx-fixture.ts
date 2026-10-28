/** Bundled for browser QA only, including offline file://; no game import. */
import { SampleBank } from '../src/production/samples';
import { ProductionAssets } from '../src/production/assets';
import { AudioEngine } from '../src/audio/audio';
const check=(ok:unknown,msg:string)=>{if(!ok)throw Error(msg);};
const rms=(p:Float32Array)=>Math.sqrt(p.reduce((s,n)=>s+n*n,0)/p.length);
async function run(){
  qa.stage='manifest';const assets=new ProductionAssets();await assets.load();
  check(Object.keys(assets.manifest.audio).length===9,'Missing shipped SFX manifest');
  const decoded:unknown[]=[],unsupported:string[]=[];
  const decodeContext=new OfflineAudioContext(1,48000,48000);
  for(const [id,spec] of Object.entries(assets.manifest.audio))for(const path of spec.sources){
    qa.stage='decode '+path;const raw=await assets.read(path,4*1024*1024);
    let b:AudioBuffer;
    try{b=await decodeContext.decodeAudioData(raw);}catch(error){
      if(path.endsWith('.ogg')){unsupported.push(path);continue;}throw error;
    }
    check(b.duration<=.5&&b.numberOfChannels===1,'Wrong format: '+path);
    const pcm=b.getChannelData(0);let peak=0,first=-1;
    for(let i=0;i<pcm.length;i++){peak=Math.max(peak,Math.abs(pcm[i]));if(first<0&&Math.abs(pcm[i])>.001)first=i;}
    check(peak<=10**(-3/20)&&first>=0&&first/b.sampleRate<=.01,'Wrong waveform: '+path);
    decoded.push({id,path,duration:b.duration,peak});
  }
  const scenarios=[];
  for(const failure of ['corrupt-preferred','unsupported-preferred','stalled-preferred','all-fail'] as const){
    qa.stage=failure;const context=new OfflineAudioContext(1,48000,48000);let clock=0,oscillators=0;
    const requests:string[]=[],originals=new Map<ArrayBuffer,string>();
    const pack=new ProductionAssets(p=>assets.resolve(p),async (url,options)=>{
      requests.push(String(url));return fetch(url,options);
    });pack.install(assets.manifest);
    // Force codec rejection AFTER actual bytes have been fetched. Other sources
    // are passed to the actual engine decoder. No production manifest is edited.
    const read=pack.read.bind(pack);
    pack.read=async (path,limit)=>{
      const bytes=await read(path,limit);originals.set(bytes,path);return bytes;
    };
    const proxy=new Proxy(context,{
      get(target,key){
        if(key==='state')return 'running'; // Offline graphs are suspended until rendered.
        if(key==='currentTime')return clock;
        if(key==='createBufferSource')return ()=>{
          const source=target.createBufferSource(),start=source.start.bind(source);
          source.start=((when=clock)=>start(when)) as typeof source.start;return source;
        };
        if(key==='createOscillator')return ()=>{oscillators++;return target.createOscillator();};
        if(key==='decodeAudioData')return async (bytes:ArrayBuffer)=>{
          const path=originals.get(bytes)??'';
          if(failure==='stalled-preferred'&&path.endsWith('.ogg'))return new Promise<AudioBuffer>(()=>{});
          if(failure==='all-fail'||path.endsWith('.ogg')){
            if(failure==='unsupported-preferred')throw new DOMException('Forced unsupported preferred codec','NotSupportedError');
            return target.decodeAudioData(new Uint8Array([0,1,2]).buffer);
          }
          return target.decodeAudioData(bytes);
        };
        const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
      },
    }) as unknown as AudioContext;
    const bus=context.createGain();bus.connect(context.destination);
    const bank=new SampleBank(proxy,bus,pack),engine=new AudioEngine();
    const noise=context.createBuffer(1,48000,48000);noise.getChannelData(0).fill(.1);
    Object.assign(engine,{ctx:proxy,sfxBus:bus,samples:bank,noise});
    engine.play('hit');const coldOscillators=oscillators;
    check(coldOscillators>0,'Cold event did not synthesize immediately');
    await bank.preload('hit');
    check(oscillators===coldOscillators,'Decoding replayed a delayed event');
    clock=.5;engine.play('hit');
    check(failure==='all-fail'?oscillators>coldOscillators:oscillators===coldOscillators,'Wrong warm sample/synth routing');
    check(pack.issues.length===(failure==='all-fail'?1:0),'Unexpected failure reporting');
    qa.stage=failure+' rendering';const buffer=await context.startRendering(),pcm=buffer.getChannelData(0);
    const coldRms=rms(pcm.slice(0,12000)),warmRms=rms(pcm.slice(24000,36000));
    check(coldRms>.001&&warmRms>.001,'Silent cold fallback or later event');
    // No side effects from a failed source after another event.
    const requestsBefore=requests.length;await bank.preload('hit');
    check(requests.length===requestsBefore,'Failed source retry storm');
    scenarios.push({failure,coldRms,warmRms,coldOscillators,warmOscillators:oscillators,requests:requests.length});
  }
  return {decoded,unsupported,scenarios};
}
const qa={run,stage:'ready'};Object.assign(window,{__soundQA:qa});
