import { Stage } from '../src/core/stage';
import { STAGES } from '../src/core/levels';
import { bonusRewardForSource, rewardForSource, rewardForSpawn } from '../src/core/rewards';
import { NO_INPUT } from '../src/core/types';
import { SaveStore } from '../src/save';

let count=0;
function check(v:unknown,m:string):asserts v {if(!v)throw Error(m);count++;}
function tick(s:Stage,n=1):void {for(let i=0;i<n;i++){s.step(NO_INPUT);s.takeEvents();}}
let raw:string|null=null;
const store=new SaveStore({load:async()=>raw,save:async(v:string)=>{raw=v;}} as never);
function saveRun(s:Stage):void {
  store.data.run={level:0,layoutRevision:s.def.layoutRevision,encounter:s.nextEncounter,
    score:s.score,motes:s.motes,kills:s.kills,time:s.time,deaths:s.deaths,collected:[],
    difficulty:'gentle',levelState:s.levelState(),weapons:s.weaponJournal()};
  store.persist();
}
// Legacy authored-run migration/loot compatibility; new chest campaign has its own suite.
const def={...STAGES[0],expedition:undefined};
for(const weapon of ['sunblade','sling'] as const){
  let s=new Stage(def,'gentle',12);
  s.player.invuln=9999;
  let rank=0;
  const issued=new Set<string>();
  for(let encounter=0;encounter<def.encounters.length-1;encounter++){
    const enc=def.encounters[encounter];
    s.player.x=enc.trigger+1;s.player.y=s.terrain.groundAt(s.player.x)??450;
    // Exercise the real encounter/wave spawner, not manually assigned reward IDs.
    for(let frame=0;frame<3000&&s.nextEncounter<=encounter;frame++){
      tick(s);
      for(const foe of s.enemies){
        if(!foe.alive||foe.state==='dying'||foe.state==='spawn')continue;
        if(foe.rewardId){
          issued.add(foe.rewardId);
          check(rewardForSource(0,foe.rewardId)===rewardForSpawn(0,encounter,foe.wave,
            Number(foe.rewardId.split('s')[1])),'spawn and saved source agree');
        }
        foe.stagger(s,1);foe.takeHit(s,999,1,0);
      }
      const drop=s.weaponDrops.find(d=>d.weapon===weapon&&d.settled&&d.copy);
      if(drop){
        s.player.x=drop.x;s.player.y=drop.y;s.player.vx=0;s.player.vy=0;
        s.player.onGround=true;s.player.setState('move');
        tick(s);
        s.step({...NO_INPUT,interactPressed:true,interactHeld:true});tick(s);
        rank++;
        check(s.player.weaponId===weapon&&s.player.weaponRank===rank,`${weapon} earns rank ${rank} from authored foe`);
      }
    }
    // Collect any reward still falling after the final foe's death.
    tick(s,150);
    for(const drop of [...s.weaponDrops].filter(d=>d.weapon===weapon&&d.copy)){
      s.player.x=drop.x;s.player.y=drop.y;s.player.vx=0;s.player.vy=0;
      s.player.onGround=true;s.player.setState('move');tick(s);
      s.step({...NO_INPUT,interactPressed:true,interactHeld:true});tick(s);
      rank++;
      check(s.player.weaponId===weapon&&s.player.weaponRank===rank,`${weapon} collects settled rank ${rank}`);
    }
    check(s.nextEncounter===encounter+1,`${weapon}: authored encounter ${encounter} completes normally (next=${s.nextEncounter}, x=${s.player.x.toFixed(0)}, y=${s.player.y.toFixed(0)})`);
    if(s.archiveKeeperDefeated&&!s.archiveGateOpen){
      // Exercise explicit objective interactions before testing later rewards.
      for(const [x,y] of [[3070,900],[3640,450]]){
        s.player.x=x;s.player.y=y;s.player.vx=0;s.player.vy=0;s.player.onGround=true;s.player.setState('move');
        tick(s,2);s.step({...NO_INPUT,interactPressed:true});tick(s);
      }
      check(s.beaconSeal&&s.archiveGateOpen,'earned seal and deliberate gate interaction permit onward rewards');
    }
    const before=s.weaponJournal();
    s.respawn();
    check(JSON.stringify(s.weaponJournal().equipment)===JSON.stringify(before.equipment),'checkpoint retry preserves earned equipment');
    saveRun(s);await store.flush();await store.load();
    check(!!store.data.run,'current layout run survives real SaveStore roundtrip');
    const restored=new Stage(def,'gentle',12);
    restored.nextEncounter=store.data.run.encounter;
    restored.restoreWeapons(store.data.run.weapons);
    restored.restoreLevelState(store.data.run!.levelState);
    check(JSON.stringify(restored.weaponJournal().equipment)===JSON.stringify(before.equipment),'Continue restores earned ranks');
    check(restored.archiveGateOpen===s.archiveGateOpen&&restored.beaconSeal===s.beaconSeal,'Continue retains archive progression alongside equipment');
    check(JSON.stringify(restored.weaponJournal().issued)===JSON.stringify(before.issued),'Continue retains duplicate prevention');
    s=restored;s.player.invuln=9999;
  }
  check(rank===3&&s.player.weaponRank===3&&s.nextEncounter===3,`${weapon} III available before guardian`);
  check([...issued].filter(id=>rewardForSource(0,id)===weapon||bonusRewardForSource(0,id)===weapon).length===3,`${weapon} has exactly three authored pre-guardian sources`);
  check(new Stage(def,'gentle').player.weaponId==='hammer','fresh replay resets equipment');
  check(new Stage(STAGES[1],'gentle').player.equipment.alternate===null,'next land resets alternate');
}
// Declined physical loot survives SaveStore + retry; replay cannot reissue it.
{
  const s=new Stage(def,'gentle');s.player.invuln=9999;s.player.x=def.encounters[0].trigger+1;
  tick(s,100);
  const foe=s.enemies.find(e=>e.rewardId==='e0w0s0');
  check(foe,'actual first-wave source spawned');foe.takeHit(s,999,1,0);tick(s,2);
  saveRun(s);await store.flush();await store.load();
  const retry=new Stage(def,'gentle');retry.restoreWeapons(store.data.run!.weapons);
  retry.player.x=def.encounters[0].trigger+1;retry.player.invuln=9999;tick(retry,100);
  const replay=retry.enemies.find(e=>e.rewardId==='e0w0s0');
  check(replay,'source respawns after Continue');replay.takeHit(retry,999,1,0);tick(retry,2);
  retry.respawn();tick(retry,150);
  check(retry.weaponDrops.length===1&&retry.weaponDrops[0].settled,'pending drop retained once across save/replay/retry');
  check(retry.player.weaponId==='hammer','declined reward never auto-equips');
}
// Main's Archive saves predate the revision tag but use this same objective map.
raw=JSON.stringify({...store.data,run:{...store.data.run,layoutRevision:undefined,encounter:2,
  levelState:{keeper:true,seal:true,gate:false,checkpoint:{x:2800,y:900}}}});
await store.load();
check(store.data.run?.layoutRevision===def.layoutRevision&&store.data.run?.levelState?.seal===true,'same-map legacy Archive save migrates without losing the earned seal');
// Old terrain's checkpoint, collectible and source indices must not leak into new terrain.
for(const revision of [undefined,'desert-authored-1','older-desert']){
  const best={0:{score:900,lamps:3,time:90,challenging:true}};
  raw=JSON.stringify({version:2,unlocked:3,best,settings:{sfx:false,music:false,musicVolume:.3,reduceMotion:true,difficulty:'challenging'},
    run:{level:0,encounter:0,score:0,motes:0,kills:0,time:0,deaths:0,collected:[],difficulty:'gentle',layoutRevision:revision,levelState:undefined}});
  await store.load();
  check(!store.data.run,'incompatible first-land run resets');
  check(store.data.unlocked===3&&store.data.best[0].score===900,'migration preserves campaign progress and best');
  check(!store.data.settings.music&&!store.data.settings.sfx&&store.data.settings.reduceMotion&&store.data.settings.musicVolume===.3,'migration preserves settings');
}
raw=JSON.stringify({version:2,unlocked:1,run:{level:1,layoutRevision:STAGES[1].layoutRevision,encounter:0,score:0,motes:0,kills:0,time:0,deaths:0,collected:[],difficulty:'gentle'}});
await store.load();check(store.data.run?.level===1,'matching redesigned land revision retains its run');
check(rewardForSource(0,'e0w2s0')===undefined&&rewardForSource(0,'e99w99s99')===undefined,'nonexistent Desert sources cannot issue rewards');
console.log(`${count} authored level reward/save/reset integration checks passed.`);
