import {STAGES} from '../src/core/levels';
import {DESERT_ZONES} from '../src/core/desert-demo';
import {Stage} from '../src/core/stage';
import {Autopilot} from '../src/core/autopilot';
import {createRng} from '../src/core/rng';
import {NO_INPUT} from '../src/core/types';
let count=0;function check(v:unknown,m:string){if(!v)throw Error(m);count++;}
const def=STAGES[0];check(DESERT_ZONES.length===7,'seven distinct sections');
check(def.encounters.length===4&&def.encounters[3].boss,'guardian concludes four encounters');
for(const difficulty of ['gentle','challenging'] as const){for(const alternate of [false,true]){
 const s=new Stage(def,difficulty,17),bot=new Autopilot(1,createRng(17));const zones=new Set<number>();let checkpointRetries=0;
 if(alternate)s.player.equipment={alternate:{id:'sunblade',rank:3},equipped:'alternate'};
 for(let frame=0;frame<60*400&&s.phase!=='clear';frame++){
  s.step(bot.decide(s));DESERT_ZONES.forEach((z,i)=>{if(s.player.x>=z.x)zones.add(i);});
  if(s.active&&s.active.index===1&&checkpointRetries===0){const before=s.weaponJournal();s.respawn();check(JSON.stringify(s.weaponJournal().equipment)===JSON.stringify(before.equipment),'retry retains equipment');checkpointRetries++;}
 }
 check(s.phase==='clear',`${difficulty}/${alternate?'Sunblade':'hammer'} reaches ending`);check(zones.size===7,'entire route traversed');check(s.pathOpen,'guardian defeated opens beacon');
 const restored=new Stage(def,difficulty);restored.restoreWeapons(s.weaponJournal());check(restored.player.weaponId===s.player.weaponId,'Continue journal retains equipment');
 console.log(`${difficulty} ${alternate?'Sunblade III':'hammer'}: clear in ${s.time.toFixed(1)}s, ${s.deaths} retries`);
}}
// Both elevated reward routes are physically reachable using normal jumps.
for(const [x,target] of [[2700,275],[5580,230]] as const){
 const s=new Stage(def,'gentle');s.nextEncounter=def.encounters.length;s.player.x=x;s.player.y=s.terrain.groundAt(x)??450;s.player.onGround=true;
 let high=s.player.y;
 for(let frame=0;frame<120;frame++){s.step({...NO_INPUT,right:true,jumpHeld:true,jumpPressed:frame===0||frame===18});high=Math.min(high,s.player.y);}
 check(high<=target,`upper route at ${x} reachable with two leaps`);
}
console.log(`${count} level-one route/retry/loadout checks passed.`);
