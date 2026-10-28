import { drawAtmosphere, drawBrazier, sceneryTime, windSway } from '../src/render/atmosphere';
import type { Theme } from '../src/core/levels';

let n=0;
function check(value:unknown,message:string){if(!value)throw Error(message);n++;}
function trace(theme:Theme,time:number,reduced=false,depth=450){
  const calls:unknown[]=[];
  const gradient={addColorStop:(...args:unknown[])=>calls.push(['color',...args])};
  const ctx=new Proxy({globalAlpha:1},{
    get(target,key){
      if(key in target)return target[key as keyof typeof target];
      if(key==='createRadialGradient')return (...args:unknown[])=>{calls.push([key,...args]);return gradient;};
      return (...args:unknown[])=>calls.push([key,...args]);
    },
    set(_target,key,value){calls.push(['set',key,value]);return true;},
  }) as unknown as CanvasRenderingContext2D;
  drawAtmosphere(ctx,theme,time,120,960,540,depth,reduced);
  drawBrazier(ctx,600,430,sceneryTime(time,reduced));
  return JSON.stringify(calls);
}
for(const theme of ['desert','flood','garden','mountain','valley','city','river'] as Theme[]){
  check(trace(theme,1)!==trace(theme,2),`${theme}: scenery animates with stationary camera/player`);
  check(trace(theme,1,true)===trace(theme,2,true),`${theme}: reduced motion is a static presentation`);
}
check(trace('desert',1,false,900)!==trace('desert',1,false,450),'archive has distinct atmosphere without sky birds');
check(windSway(1,123)!==windSway(2,123),'rooted vegetation wind varies with time');
for(let t=0;t<20;t+=.1)check(Math.abs(windSway(t,700))<=.0241,'plant sway remains small and rooted');
console.log(`${n} environmental animation and reduced-motion checks passed.`);
