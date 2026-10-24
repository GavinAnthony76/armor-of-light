import { AudioEngine } from '../src/audio/audio';
let checks=0;function check(v:unknown,m:string){if(!v)throw Error(m);checks++;}
class Param {value=0;setTargetAtTime(v:number){this.value=v;}setValueAtTime(v:number){this.value=v;}linearRampToValueAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(v:number){this.value=v;}}
class Node {gain=new Param();frequency=new Param();detune=new Param();threshold=new Param();ratio=new Param();Q=new Param();connections:Node[]=[];buffer:unknown;type='';connect(n:Node){this.connections.push(n);return n;}start(){}stop(){}}
let context:Context;let scheduled:(()=>void)|null=null;
class Context {state='suspended';currentTime=0;sampleRate=8000;destination=new Node();gains:Node[]=[];resumeCount=0;constructor(){context=this;}
 createDynamicsCompressor(){return new Node();}createGain(){const n=new Node();this.gains.push(n);return n;}createConvolver(){return new Node();}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}
 createBuffer(ch:number,len:number){const data=Array.from({length:ch},()=>new Float32Array(len));return{getChannelData:(n:number)=>data[n]};}
 async resume(){this.state='running';this.resumeCount++;}async suspend(){this.state='suspended';}}
(globalThis as unknown as {window:unknown}).window={AudioContext:Context,setInterval:(cb:()=>void)=>{scheduled=cb;return 1;},clearInterval:()=>{scheduled=null;}};
const audio=new AudioEngine();audio.playMusic('desert');check(!audio.ready,'locked before gesture');audio.unlock();check(audio.ready,'gesture unlocks context');check(!!scheduled,'scheduler started for deferred song');
const ctx=context!;
const master=ctx.gains[0],sfx=ctx.gains[1],music=ctx.gains[2];
check(master.gain.value>0&&music.gain.value>0&&sfx.gain.value>0,'enabled buses audible');
audio.setMusic(false);check(music.gain.value===0&&sfx.gain.value>0,'mute music independent of effects');
audio.setMusic(true);audio.setMusicVolume(.25);const low=music.gain.value;audio.setMusicVolume(.9);check(music.gain.value>low,'music volume affects output');
audio.setHostAllowed(false);check(master.gain.value===0,'host mute gates all output');audio.setHostAllowed(true);check(master.gain.value>0,'host reenable restores output');
audio.suspend();check(!audio.ready,'pause suspends');audio.resume();await Promise.resolve();check(audio.ready,'resume restores context');
ctx.state='interrupted';audio.unlock();await Promise.resolve();check(audio.ready,'interrupted mobile context resumes on gesture');
ctx.currentTime=1000;scheduled!();check(ctx.gains.length<100,'background resume bounds scheduler catch-up instead of scheduling expired minutes');
audio.stopMusic();check(!scheduled,'stopped scheduler released');
console.log(`${checks} audio lifecycle checks passed (mock Web Audio; browser meter tested separately).`);
