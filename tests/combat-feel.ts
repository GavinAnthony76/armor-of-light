import {Player} from '../src/core/player';
import {Stage} from '../src/core/stage';
import {STAGES} from '../src/core/levels';
import {NO_INPUT} from '../src/core/types';

let checks=0;
const check=(v:unknown,m:string)=>{if(!v)throw Error(m);checks++;};
function hero(){const p=new Player(300,450,8);p.onGround=true;return p;}
for(const hz of [30,60,120]){
  const dt=1/hz,p=hero(),beats:number[]=[];
  for(let f=0;f<hz;f++){
    const result=p.control({...NO_INPUT,attackPressed:f===0||f===1,heavyPressed:f===2},dt);
    if(result.swung)beats.push(p.combo);
  }
  check(beats.join(',')==='0,1,2',`${hz}Hz: rapid light-light-heavy preserves all three beats`);
  check(p.heavySwing,`${hz}Hz: the third beat retains the heavy intention`);
  const late=hero();
  late.control({...NO_INPUT,attackPressed:true},dt);
  while(late.attacking)late.control(NO_INPUT,dt);
  late.control(NO_INPUT,.07);
  late.control({...NO_INPUT,attackPressed:true},dt);
  check(late.attacking&&late.combo===1,`${hz}Hz: natural late follow-up continues after recovery`);
  const stale=hero();
  stale.control({...NO_INPUT,attackPressed:true},dt);
  for(let i=0;i<hz;i++)stale.control(NO_INPUT,dt);
  stale.control({...NO_INPUT,attackPressed:true},dt);
  check(stale.combo===0,`${hz}Hz: old sequence expires instead of granting a free finisher`);
  const dash=hero();dash.onGround=false;dash.vy=-550;
  dash.control({...NO_INPUT,dashPressed:true},dt);
  check(dash.vy===-550,`${hz}Hz: air dash does not repeatedly damp the jump`);
  for(let i=0;i<hz/4;i++)dash.control(NO_INPUT,dt);
  check(dash.vx===0&&dash.dashTime===0,`${hz}Hz: released dash has a controlled stop`);
}
{
  const p=hero();
  p.control({...NO_INPUT,dashPressed:true,right:true},1/60);
  const r=p.control({...NO_INPUT,jumpPressed:true,jumpHeld:true,right:true},1/60);
  check(r.jumped&&p.dashTime===0&&p.vy<-700,'jump immediately cancels dash into a real jump');
  const air=hero();air.onGround=false;air.vy=100;
  air.control({...NO_INPUT,attackPressed:true},1/60);
  for(let i=0;i<8;i++)air.control(NO_INPUT,1/60);
  air.control({...NO_INPUT,jumpPressed:true,jumpHeld:true},1/60);
  for(let i=0;i<6;i++)air.control({...NO_INPUT,jumpHeld:true},1/60);
  check(!air.attacking&&!air.airJumpReady&&air.vy<-700,'double jump buffered during air attack executes on recovery');
  for(let i=0;i<20;i++)air.control({...NO_INPUT,jumpHeld:true},1/60);
  check(!air.airJumpReady&&air.jumpBuffer===0,'held jump never grants repeated aerial jumps');
  const hurt=hero();
  hurt.control({...NO_INPUT,attackPressed:true},1/60);
  hurt.control({...NO_INPUT,heavyPressed:true},1/60);
  hurt.setState('hurt');
  for(let i=0;i<45;i++)hurt.control(NO_INPUT,1/60);
  check(!hurt.attacking&&!hurt.queued&&!hurt.queuedEarly&&hurt.comboGrace===0,'damage clears pending follow-ups and combo grace');
}
{
  const def={...STAGES[0],ground:[[0,4900,450]] as [number,number,number][],platforms:[],encounters:[]};
  const s=new Stage(def,'challenging',1);
  s.player.x=300;s.player.y=450;s.player.onGround=true;s.player.invuln=999;
  const e=s.spawnEnemy('husk',390);e.hp=20;e.maxHp=20;e.state='move';e.cooldown=999;
  let lightStop=0,lightKnock=0;
  for(let i=0;i<100;i++){
    s.step({...NO_INPUT,attackPressed:i===0||i===5,heavyPressed:i===14});
    if(s.comboHits===1&&s.player.combo===0){lightStop=Math.max(lightStop,s.hitstop);lightKnock=Math.max(lightKnock,Math.abs(e.vx));}
  }
  check(s.comboHits===3,'actual edge-of-reach target receives all three contacts');
  check(lightStop>0&&lightStop<=.025,'light contact has a short stop rather than heavy pacing');
  check(lightKnock<=80,'light openers keep a live foe in follow-up range');
  check(e.hp<17,'committed third heavy delivers its empowered damage');
}
console.log(`${checks} combat-feel checks passed: ordered fast chains, grace, actual contacts, dash control and buffered aerial movement.`);
