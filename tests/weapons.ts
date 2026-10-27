import { Stage } from '../src/core/stage';
import { STAGES } from '../src/core/levels';
import { NO_INPUT, type InputFrame } from '../src/core/types';
import { LAND_WEAPONS, cleanJournal, type Rank } from '../src/core/weapons';
import { SWINGS, AIR_SWING } from '../src/core/player';
import { SaveStore } from '../src/save';
import { Autopilot } from '../src/core/autopilot';
import { createRng } from '../src/core/rng';
let checks=0;
function check(v:unknown,m:string){if(!v)throw Error(m);checks++;}
const tick=(s:Stage,n=1,inp:InputFrame=NO_INPUT)=>{for(let i=0;i<n;i++){s.step(inp);s.takeEvents();}};
const fixture=(land=0)=>{const s=new Stage(STAGES[land],'gentle',1);s.player.invuln=999;s.player.x=300;s.player.y=s.terrain.groundAt(300)??450;return s;};
function kill(s:Stage,id:string,x=350,y?:number){const e=s.spawnEnemy('husk',x,y);e.cooldown=999;e.rewardId=id;e.state='move';e.takeHit(s,999,1,0);tick(s);return e;}
function settle(s:Stage){tick(s,150);}
function near(s:Stage){const d=s.weaponDrops[0];s.player.x=d.x;s.player.y=d.y;s.player.vx=0;s.player.vy=0;s.player.setState('move');s.player.onGround=true;tick(s,2);}
function pickup(s:Stage){tick(s,1,{...NO_INPUT,interactPressed:true,interactHeld:true});tick(s,1);}
// Reward eligibility and stable source identities, including the actual encounter spawner.
for(let land=0;land<7;land++){
 const s=fixture(land),enc=s.def.encounters[0];s.player.x=enc.trigger+1;tick(s,100);
 const e=s.enemies.find(e=>e.rewardId);check(!!e,`land ${land}: eligible encounter foe`);
 const x=e!.x,y=e!.center().y;e!.stagger(s,1);e!.takeHit(s,999,1,0);s.hitstop=0;tick(s);
 check(s.weaponDrops[0]?.weapon===LAND_WEAPONS[land],`land ${land}: correct reward`);
 check(Math.abs(s.weaponDrops[0].x-x)<4&&Math.abs(s.weaponDrops[0].y-y)<8,`land ${land}: physical drop starts at defeated foe`);
 settle(s);check(s.weaponDrops[0].settled,`land ${land}: reward lands`);
}
const s=fixture();kill(s,'e0w0s0');check(s.weaponDrops.length===1,'eligible kill creates one reward');
check(s.weaponDrops[0].vy<0,'reward launches upward');const spawn=s.weaponDrops[0].x;
settle(s);check(s.weaponDrops[0].bounce===1&&s.weaponDrops[0].settled,'launch fall bounce settle');
check(Math.abs(s.weaponDrops[0].x-spawn)<30,'reward never magnetizes');
const deathX=s.weaponDrops[0].x;near(s);tick(s,20);check(s.player.weaponId==='hammer'&&s.weaponDrops.length===1,'walking over reward does not equip');
// Press before range; held and repeated frames are rejected. A fresh press after release works.
s.player.x=deathX-130;tick(s);tick(s,1,{...NO_INPUT,interactPressed:true,interactHeld:true});s.player.x=deathX;
tick(s,20,{...NO_INPUT,interactPressed:true,interactHeld:true});check(s.player.weaponId==='hammer','held or buffered interaction cannot collect');
tick(s);pickup(s);check(s.player.weaponId==='sunblade'&&s.weaponDrops.length===0,'explicit pickup equips visible identity');
check(s.player.weaponRank===1,'first rank I');
kill(s,'e0w1s0');settle(s);near(s);pickup(s);check(s.player.weaponRank===2,'copy upgrades rank II');
// Keeper supplies the third Sunblade copy in the current authored map.
// Isolate forging here; level-integration tests retain all declined sling loot.
kill(s,'e1w0s0');settle(s);s.weaponDrops=s.weaponDrops.filter(d=>d.weapon==='sunblade');near(s);pickup(s);check(s.player.weaponRank===3,'copy upgrades rank III');
kill(s,'e3w0s0');check(s.weaponDrops.length===0,'suppress further max-rank rewards');
s.weaponDrops.push({id:'e0w4s0',weapon:'sunblade',rank:1,copy:true,x:s.player.x,y:s.player.y,vx:0,vy:0,age:1,bounce:1,settled:true});s.issuedRewards.add('e0w4s0');near(s);pickup(s);
check(s.weaponDrops.length===1&&s.player.weaponRank===3,'existing max-rank copy is not silently consumed');
check(s.takeEvents().length===0,'test event draining independent of simulation');
tick(s,1,{...NO_INPUT,swapPressed:true});check(s.player.weaponId==='hammer','swap returns signature hammer');
tick(s,8,{...NO_INPUT,swapPressed:true,swapHeld:true});check(s.player.weaponId==='hammer','held swap cannot repeat');tick(s);tick(s,1,{...NO_INPUT,swapPressed:true});check(s.player.weaponId==='sunblade','fresh swap returns alternate');
// Retry, save/Continue journal, source replay, and a fresh land attempt.
const journal=s.weaponJournal();s.respawn();check(s.player.weaponId==='sunblade'&&s.player.weaponRank===3,'retry preserves equipment');
const restored=fixture();restored.restoreWeapons(journal);check(restored.player.weaponRank===3,'Continue restores ranks');
check(restored.weaponDrops.length===1,'Continue preserves declined copy');kill(restored,'e0w0s0');check(restored.weaponDrops.length===1,'replayed enemy cannot create duplicate reward');
check(new Stage(STAGES[0],'gentle').player.equipment.alternate===null,'restarting land resets alternate');
check(new Stage(STAGES[1],'gentle').player.weaponId==='hammer','new land starts signature hammer');
// Uncollected unique opportunity survives repeated checkpoint reloads without multiplication.
const pending=fixture();kill(pending,'e0w0s0');const saved=pending.weaponJournal();
for(let i=0;i<8;i++){const a=fixture();a.restoreWeapons(saved);kill(a,'e0w0s0');settle(a);check(a.weaponDrops.length===1,'reload does not multiply unclaimed reward');near(a);pickup(a);kill(a,'e0w0s0');check(a.weaponDrops.length===0,'consumed source cannot be farmed');}
// Real drop recovery from gaps, off-screen deaths, cliffs and locked arena boundaries.
for(const def of STAGES){for(const x of [-80,def.length+80,...def.ground.map(g=>g[1]+10)]){
 const a=fixture(def.id);kill(a,'e0w0s0',x,520);settle(a);const d=a.weaponDrops[0];
 check(d.settled&&a.terrain.groundAt(d.x)===d.y&&d.x>=0&&d.x<=def.length,`${def.name} safe ground at ${x}`);
 a.bounds={minX:def.encounters[0].arena[0],maxX:def.encounters[0].arena[1]};a.respawn();
 check(d.x>a.bounds.minX&&d.x<a.bounds.maxX,'retry recovers rewards inside reachable bounds');
}}
// Two-slot replacement drops the old rank intact; cycling stored drops never forges them.
const ex=fixture();ex.player.equipment={alternate:{id:'tide',rank:2},equipped:'alternate'};
kill(ex,'e0w0s0');settle(ex);near(ex);pickup(ex);check(ex.player.weaponId==='sunblade','new alternate replaces slot');
check(ex.weaponDrops.length===1&&ex.weaponDrops[0].weapon==='tide'&&ex.weaponDrops[0].rank===2&&!ex.weaponDrops[0].copy,'replaced alternate physically retained');
for(let i=0;i<6;i++){settle(ex);near(ex);pickup(ex);check(ex.weaponDrops.length===1,'slot exchanges conserve weapon count');}
// Hammer timing and geometry are the original objects. Alternate defensive windows never extend them.
const p=fixture().player;for(let c=0;c<3;c++){p.combo=c;check(p.swing===SWINGS[c],'hammer retains exact swing definition');}p.airSwing=true;check(p.swing===AIR_SWING,'hammer air swing unchanged');
for(const id of LAND_WEAPONS){p.airSwing=false;p.equipment={alternate:{id,rank:3},equipped:'alternate'};p.combo=0;check(p.swing.hitTo<=SWINGS[0].hitTo,'alternate defensive cancel no later than baseline');}
// Migration and malicious/corrupt journal handling.
let raw=JSON.stringify({version:1,unlocked:0,settings:{sfx:false,music:false},run:{level:0,layoutRevision:STAGES[0].layoutRevision,encounter:1,score:30,motes:0,kills:1,time:20,deaths:0,collected:[],difficulty:'gentle'}});
const store=new SaveStore({load:async()=>raw,save:async(x:string)=>{raw=x;}} as never);await store.load();
check(store.data.version===2&&!!store.data.run,'old run migrated');check(store.data.run?.weapons?.equipment.alternate===null,'old save starts hammer safely');check(!store.data.settings.music&&!store.data.settings.sfx,'migration respects mute');
store.data.run!.weapons=journal;store.persist();await store.flush();await store.load();check(store.data.run?.weapons?.equipment.alternate?.rank===3,'save roundtrip retains rank');
const clean=cleanJournal({equipment:{alternate:{id:'__proto__',rank:9},equipped:'alternate'},drops:[{x:NaN}],issued:['bogus',1]},0,4900);check(clean.equipment.alternate===null&&clean.drops.length===0&&clean.issued.length===0,'invalid journal discarded');
// Full seven-land completion with each land's alternate at I and III, both difficulties.
let runs=0;
for(const def of STAGES)for(const diff of ['gentle','challenging'] as const)for(const rank of [1,3] as Rank[]){
 const a=new Stage(def,diff,2);a.player.equipment={alternate:{id:LAND_WEAPONS[def.id],rank},equipped:'alternate'};
 const bot=new Autopilot(diff==='gentle'?.8:.92,createRng(26));let n=0;
 while(!a.result&&n++<60*60*12){a.step(bot.decide(a));a.takeEvents();}
 check(!!a.result,`${def.name} ${diff} alternate rank ${rank} completes; x=${a.player.x} encounter=${a.nextEncounter}`);runs++;
}
console.log(`${checks} weapon checks passed; ${runs} alternate-loadout campaign runs completed.`);
