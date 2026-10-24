const assert=Object.assign((condition:unknown,message='assertion failed')=>{if(!condition)throw new Error(message);},{equal:(a:unknown,b:unknown)=>{if(a!==b)throw new Error(`Expected ${String(a)} to equal ${String(b)}`)}});
import {STAGES} from '../src/core/levels';
import {SaveStore} from '../src/save';
import {Player,SWINGS} from '../src/core/player';
import {NO_INPUT} from '../src/core/types';
let raw:string|null=null;
const platform={load:async()=>raw,save:async(s:string)=>{raw=s}};
// Storage and progression across the whole campaign, including legacy saves.
const save=new SaveStore(platform as never);
raw=JSON.stringify({unlocked:2,best:{2:{score:300,lamps:2,time:150}},settings:{difficulty:'gentle'}});
await save.load();assert.equal(save.data.unlocked,2);assert.equal(save.data.best[2].score,300);
for(let i=0;i<7;i++) save.record({stageId:i,score:1000,lamps:2,time:100,difficulty:'gentle'} as never);
assert.equal(save.data.unlocked,6);assert.equal(save.totalLamps(),14);
await save.flush();
const reloaded=new SaveStore(platform as never);await reloaded.load();assert.equal(reloaded.data.unlocked,6);
raw=JSON.stringify({unlocked:6,run:{level:6,encounter:4,score:40,motes:2,kills:1,time:40,deaths:0,collected:[1,2],difficulty:'gentle'}});
await reloaded.load();assert.equal(reloaded.data.run?.level,6);
raw=JSON.stringify({unlocked:0,run:{level:6,encounter:4,score:40,motes:2,kills:1,time:40,deaths:0,collected:[],difficulty:'gentle'}});
await reloaded.load();assert.equal(reloaded.data.run,undefined);
assert.equal(new Set(STAGES.map(s=>s.theme)).size,7);
assert.equal(new Set(STAGES.map(s=>s.encounters.find(e=>e.boss)!.waves[0][0].kind)).size,7);
assert(STAGES.every(s=>s.story&&s.inspiration&&s.background&&s.bossArt));
// The original response contract remains intact as the campaign expands.
assert.equal(SWINGS[0].hitFrom,.06);assert.equal(SWINGS[0].hitTo,.15);
const p=new Player(100,450,8);p.onGround=true;
p.control({...NO_INPUT,attackPressed:true},1/60);
for(let i=0;i<10;i++)p.control({...NO_INPUT,blockHeld:true},1/60);
assert(p.blocking,'shield cancels basic strike after the active frames');
console.log('Campaign progression, legacy saves, resume validation, seven unique guardians and original shield timing passed.');
