import { Stage } from '../src/core/stage';
import { Player } from '../src/core/player';
import { STAGES } from '../src/core/levels';
import { cleanJournal } from '../src/core/weapons';
import { NO_INPUT } from '../src/core/types';
import { rewardForSpawn } from '../src/core/rewards';

let count=0;
function check(value:unknown,message:string):void {if(!value)throw Error(message);count++;}
const dt=1/60;
function player():Player {const p=new Player(300,450,8);p.onGround=true;return p;}
function stage(flat=false):Stage {
  const def=flat?{...STAGES[0],ground:[[0,4900,450]] as [number,number,number][],platforms:[],encounters:[]}:STAGES[0];
  const s=new Stage({...def,expedition:undefined},'gentle',1);
  s.player.x=300;s.player.y=450;s.player.onGround=true;s.player.invuln=999;
  return s;
}
function ticks(s:Stage,n:number):void {for(let i=0;i<n;i++)s.step(NO_INPUT);}

for(const hz of [30,60,120]){
  const p=player(),step=1/hz;
  p.control({...NO_INPUT,attackPressed:true},step);
  p.control({...NO_INPUT,attackPressed:true},step);
  let elapsed=step;
  while(p.combo===0&&elapsed<.5){p.control(NO_INPUT,step);elapsed+=step;}
  check(p.combo===1&&elapsed<.27,`${hz}Hz: second light chains in recovery`);
  p.control({...NO_INPUT,heavyPressed:true},step);
  for(let i=0;i<hz/3&&p.combo===1;i++)p.control(NO_INPUT,step);
  check(p.heavySwing&&p.combo===2,`${hz}Hz: light-light-heavy reaches empowered finisher`);
  check(p.swing.damage>2.4,`${hz}Hz: committed combo heavy differs from standalone heavy`);
  for(let i=0;i<hz;i++)p.control(NO_INPUT,step);
  check(!p.attacking,`${hz}Hz: no automatic infinite chain`);
}
{
  const p=player();p.state='hurt';p.t=.29;
  p.control({...NO_INPUT,dashPressed:true},dt);
  for(let i=0;i<4;i++)p.control(NO_INPUT,dt);
  check(p.dashTime>0,'dash near hurt-recovery end is retained');
  const early=player();early.dashCooldown=.5;
  early.control({...NO_INPUT,dashPressed:true},dt);
  for(let i=0;i<40;i++)early.control(NO_INPUT,dt);
  check(early.dashTime===0&&early.dashBuffer===0,'stale dash does not fire after a distant cooldown');
}
{
  const s=stage();s.hitstop=.08;
  s.step({...NO_INPUT,heavyPressed:true});
  ticks(s,10);
  check(s.player.attacking&&s.player.heavySwing,'heavy pressed during impact pause survives');
  s.player.clearActionBuffers();s.player.setState('attack');s.player.heavySwing=false;s.player.combo=0;s.player.t=.08;
  s.hitstop=.06;s.step({...NO_INPUT,attackPressed:true});ticks(s,6);
  check(s.player.queued||s.player.queuedEarly||s.player.combo===1,'combo tap during impact pause is not discarded');
}
for(const rank of [1,2,3] as const){
  const s=stage(true);s.player.equipment={alternate:{id:'sling',rank},equipped:'alternate'};
  const e=s.spawnEnemy('husk',620);e.state='move';e.cooldown=999;e.hp=40;e.maxHp=40;
  s.step({...NO_INPUT,attackPressed:true});ticks(s,5);
  check(s.ranged.stones.length===rank,`rank ${rank}: real projectile fan has ${rank} stones`);
  check(e.hp===40,`rank ${rank}: no invisible melee damage at range`);
  ticks(s,70);
  check(Math.abs(e.hp-(40-(1+(rank-1)*.18)))<.001,`rank ${rank}: fan hits at range without shotgunning one target`);
  check(s.comboHits===1,`rank ${rank}: hit counter measures actual damage, not emitted projectiles`);
  check(s.ranged.stones.length===0,`rank ${rank}: projectiles have a bounded lifetime`);
}
{
  const s=stage();s.player.x=640;s.player.equipment={alternate:{id:'sling',rank:1},equipped:'alternate'};
  const e=s.spawnEnemy('husk',850);e.state='move';e.cooldown=999;e.hp=40;e.maxHp=40;
  s.step({...NO_INPUT,attackPressed:true});ticks(s,76);
  check(e.hp===40&&s.ranged.stones.length===0,'solid first-land traversal wall blocks lightstones');
}
{
  const s=stage();s.player.equipment={alternate:{id:'sling',rank:3},equipped:'alternate'};
  s.player.heavySwing=true;s.ranged.fire(s);
  check(s.ranged.stones.length===3&&s.ranged.stones.every(b=>b.pierce===2&&b.heavy),'heavy sling volley is piercing');
  s.player.attackBuffer=.1;s.player.heavyBuffer=.1;s.player.dashBuffer=.1;
  s.respawn();
  check(s.ranged.stones.length===0,'retry clears shots from the old life');
  check(s.player.attackBuffer===0&&s.player.heavyBuffer===0&&s.player.dashBuffer===0,'retry clears pending combat inputs');
  check(s.player.weaponId==='sling'&&s.player.weaponRank===3,'retry preserves the earned sling rank');
}
{
  const s=stage();
  for(const source of ['e0w1s1','e1w0s0','e2w0s0']){
    const e=s.spawnEnemy('husk',350);e.state='move';e.rewardId=source;
    e.takeHit(s,999,1,0);ticks(s,2);
  }
  ticks(s,150);
  check(s.weaponDrops.filter(d=>d.weapon==='sling'&&d.settled).length===3,'authored pre-guardian foes provide three physical earned sling copies');
  check(s.player.weaponId==='hammer','weapons never auto-equip');
  for(let rank=1;rank<=3;rank++){
    const d=s.weaponDrops.find(d=>d.weapon==='sling')!;s.player.x=d.x;s.player.y=d.y;s.player.vx=0;s.player.vy=0;
    s.player.onGround=true;s.player.setState('move');ticks(s,2);
    s.step({...NO_INPUT,interactPressed:true,interactHeld:true});ticks(s,2);
    check(s.player.weaponId==='sling'&&s.player.weaponRank===rank,`earned copy forges sling rank ${rank}`);
  }
  const journal=s.weaponJournal();
  const restored=cleanJournal(journal,0,s.def.length);
  check(restored.equipment.alternate?.id==='sling'&&restored.equipment.alternate.rank===3,'Continue journal retains first-land sling');
  check(cleanJournal(journal,1,6000).equipment.alternate===null,'sling cannot migrate into another land');
  s.step({...NO_INPUT,swapPressed:true});ticks(s,2);
  check(s.player.weaponId==='hammer'&&s.player.equipment.alternate?.rank===3,'hammer swap preserves sling upgrades');
  let opportunities=0;
  STAGES[0].encounters.slice(0,-1).forEach((e,ei)=>e.waves.forEach((w,wi)=>w.forEach((_,si)=>{if(rewardForSpawn(0,ei,wi,si)==='sling')opportunities++;})));
  check(opportunities===3,'three existing authored foes supply rank III before the guardian');
}
{
  const s=stage(),events:string[]=[];
  const e=s.spawnEnemy('husk',350);e.state='move';e.cooldown=999;e.hp=.2;
  s.step({...NO_INPUT,heavyPressed:true});
  for(let i=0;i<40;i++){s.step(NO_INPUT);events.push(...s.takeEvents().map(e=>e.type));}
  check(!e.alive&&events.includes('finisher'),'actual heavy killing blow emits cinematic finisher');
  check(s.comboBest>=1,'actual landed hit records best streak');
  s.recordCombatHit('killed',350,420,3,false,true);
  check(!s.takeEvents().some(e=>e.type==='finisher'),'finisher cooldown avoids slowing every kill');
  ticks(s,160);
  check(s.comboHits===0,'hit streak expires instead of climbing forever');
}
{
  const s=stage(),e=s.spawnEnemy('sentinel',350);
  e.state='move';e.cooldown=999;e.facing=-1;
  s.step({...NO_INPUT,heavyPressed:true});ticks(s,25);
  check(String(e.state)==='stagger'||e.hp<e.maxHp,'heavy pressure opens or damages a shielded opponent');
}
console.log(`${count} first-land slice checks passed: light/heavy chains, hitstop input retention, ranged collision/ranks, earned pickups, saves and finishers.`);
