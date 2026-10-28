import { Stage } from '../src/core/stage';
import { STAGES } from '../src/core/levels';
import { NO_INPUT } from '../src/core/types';
import { cleanJournal, LAND_WEAPONS } from '../src/core/weapons';
import { SaveStore } from '../src/save';
import type { ChestDef } from '../src/core/journey-types';
import { WebPlatform } from '../src/platform/web';

let count=0;
function check(v:unknown,m:string):asserts v {if(!v)throw Error(m);count++;}
function tick(s:Stage,n=1){for(let i=0;i<n;i++){s.step(NO_INPUT);s.takeEvents();}}
function stand(s:Stage,x:number,y:number){const p=s.player;p.x=x;p.y=y;p.vx=p.vy=0;p.onGround=true;p.invuln=999;p.setState('move');tick(s,2);}
function interact(s:Stage){s.step({...NO_INPUT,interactPressed:true,interactHeld:true});tick(s,2);}
function open(s:Stage,c:ChestDef){stand(s,c.x,c.y);interact(s);}
function fixture(i:number){const d=STAGES[i];return new Stage({...d,encounters:[],expedition:{...d.expedition!,gates:[]}},'gentle');}
let raw:string|null=null;
const store=new SaveStore({load:async()=>raw,save:async(v:string)=>{raw=v;}} as never);

for(const d of STAGES){
  const j=d.expedition!;
  check(!!j,`${d.name}: exploration data present`);
  check(new Set(j.chests.map(c=>c.id)).size===j.chests.length,`${d.name}: stable unique chest identities`);
  for(const c of j.chests)check([...d.ground,...d.platforms].some(([a,b,y])=>c.x>=a&&c.x<=b&&c.y===y),`${d.name}: ${c.id} rests on reachable geometry`);
  check(j.chests.some(c=>c.hidden)&&j.chests.some(c=>c.reward==='relic'),`${d.name}: secrets and meaningful collectibles`);
  if(d.id>0){
    check(d.encounters.filter(e=>e.miniBoss).length===2,`${d.name}: two named mini-bosses`);
    check(Math.max(...d.ground.map(g=>g[2]))-Math.min(...d.ground.map(g=>g[2]))>=700,`${d.name}: substantial vertical route`);
    check(j.gates.every(g=>d.encounters[g.encounter].miniBoss&&!d.encounters[g.encounter].openRoad),`${d.name}: seals require actual mini-boss clears`);
    const s=new Stage(d,'gentle');const first=j.gates[0];
    stand(s,first.x-50,first.y);s.step({...NO_INPUT,right:true,dashPressed:true,jumpPressed:true});tick(s,60);
    check(s.player.x<first.x&&!s.exploration.isGateOpen(first),`${d.name}: jump/dash cannot bypass seal`);
    s.nextEncounter=1;stand(s,2200,d.encounters[1].triggerY!);tick(s,110);
    const mini=s.enemies.find(e=>e.miniName===d.encounters[1].miniBoss!.name);
    check(mini&&mini.maxHp===Math.round(d.encounters[1].miniBoss!.hp*s.diff.enemyHp),`${d.name}: actual named elite spawns with difficulty-scaled health`);
    mini.stagger(s,1);mini.takeHit(s,999,1,0);tick(s,120);
    check(s.nextEncounter===2&&s.exploration.isGateOpen(first)&&!s.exploration.isGateOpen(j.gates[1]),`${d.name}: only the earned seal opens`);
    check(s.weaponDrops.length===0,`${d.name}: mini-boss does not drop a weapon`);
    const q=new Stage(d,'gentle');q.nextEncounter=s.nextEncounter;q.score=s.score;q.restoreLevelState(s.levelState());
    check(q.exploration.isGateOpen(first)&&q.terrain.groundAt(first.x)!==-1800,`${d.name}: Continue restores unlocked terrain`);
  }
  // Ordinary enemies can still award score/health, never equipment.
  const ordinary=new Stage(d,'gentle');const foe=ordinary.spawnEnemy('husk',350);foe.state='move';foe.rewardId='e0w0s0';foe.takeHit(ordinary,999,1,0);tick(ordinary,2);
  check(ordinary.weaponDrops.length===0,`${d.name}: no ordinary enemy weapon drops`);
  for(const c of j.chests){
    const s=fixture(d.id),score=s.levelState().checkpointScore??0;open(s,c);
    check(s.exploration.opened.has(c.id),`${c.id}: deliberate interaction opens chest`);
    const state=s.levelState(),journal=s.weaponJournal();
    interact(s);check(s.exploration.opened.size===1,`${c.id}: cannot open twice`);
    s.respawn();check(s.exploration.opened.has(c.id),`${c.id}: retry retains ownership`);
    const q=fixture(d.id);q.restoreWeapons(journal);q.restoreLevelState(state);
    check(q.exploration.opened.has(c.id),`${c.id}: Continue retains ownership`);
    if(c.reward==='upgrade')check(s.player.weaponRank===2,`${c.id}: forge upgrades signature hammer`);
    if(c.reward==='relic')check(q.player.maxHp===q.diff.hearts+1,`${c.id}: relic heart capacity survives Continue`);
    if(c.reward==='treasure')check(s.levelState().checkpointScore===score+(c.value??500),`${c.id}: treasure has actual banked score value`);
    if(c.reward==='weapon'){
      check(q.weaponDrops.length===1&&q.weaponDrops[0].weapon===c.weapon,`${c.id}: unopened loot remains once after Continue`);
      check(cleanJournal(q.weaponJournal(),d.id,d.length,true).drops.length===1,`${c.id}: chest source accepted by save validation`);
    }
  }
  // Real guardian spawner, physical reward, and saved cross-land equipment.
  const s=new Stage(d,'gentle');s.nextEncounter=d.encounters.length-1;s.archiveGateOpen=true;s.exploration.syncGates();
  stand(s,d.encounters[d.encounters.length-1].trigger+1,450);tick(s,190);
  const boss=s.enemies.find(e=>e.boss);check(boss,`${d.name}: final guardian spawns`);
  boss.stagger(s,1);boss.takeHit(s,999,1,0);tick(s,160);
  check(s.pathOpen&&s.awaitingBossReward&&s.weaponDrops[0]?.weapon===LAND_WEAPONS[d.id],`${d.name}: guardian leaves a real weapon before exit`);
  store.rememberEquipment(s);check(!store.data.bossRewards?.[LAND_WEAPONS[d.id]],`${d.name}: unclaimed reward is not silently unlocked`);
  const journal=s.weaponJournal();check(cleanJournal(journal,d.id,d.length,true).drops.length===1,`${d.name}: pending guardian loot survives save validation`);
  const drop=s.weaponDrops[0];stand(s,drop.x,drop.y);interact(s);
  check(!s.awaitingBossReward&&s.player.equipment.alternate?.id===LAND_WEAPONS[d.id],`${d.name}: explicit pickup claims guardian reward`);
  store.rememberEquipment(s);store.persist();await store.flush();await store.load();
  check(store.data.bossRewards?.[LAND_WEAPONS[d.id]]===1,`${d.name}: earned reward persists`);
  if(d.id<6)check(store.startingEquipment(d.id+1).alternate?.id===LAND_WEAPONS[d.id],`${d.name}: following land starts with earned guardian weapon`);
}
// Chest score remains banked while replayable encounter kills roll back.
{
  const d=STAGES[0],s=new Stage(d,'gentle');stand(s,1500,450);tick(s,80);
  const chest=d.expedition!.chests.find(c=>c.id==='desert-forge')!;open(s,chest);
  const bank=s.score;s.score+=999;s.respawn();check(s.score===bank,'retry cannot farm opened chest or keep failed-fight score');
  const q=new Stage(d,'gentle');q.score=bank+999;q.restoreLevelState(s.levelState());
  check(q.score===bank&&q.exploration.opened.has(chest.id),'Continue restores banked treasure without duplicating partial-fight score');
  q.exploration.restore(['forged-chest-id',chest.id,chest.id]);check(q.exploration.opened.size===1,'untrusted chest identities and duplicates are filtered');
}
// Preserve previous single-land progress when enabling the full campaign.
{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  const storage=new Map<string,string>([['demo','existing-demo-progress']]);
  Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}}});
  const platform=new WebPlatform('campaign','demo');
  check(await platform.load()==='existing-demo-progress'&&storage.get('campaign')==='existing-demo-progress','demo save imports when campaign save is absent');
  check(storage.get('demo')==='existing-demo-progress','legacy save is never deleted');
  storage.set('campaign','newer-campaign-progress');
  check(await platform.load()==='newer-campaign-progress','established campaign save takes precedence over legacy demo');
  if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');
}
console.log(`${count} exploration, mini-boss gate, chest, relic, reward and campaign-carry checks passed.`);
