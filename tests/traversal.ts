import {Player,SWINGS} from '../src/core/player';
import {NO_INPUT} from '../src/core/types';
import {STAGES} from '../src/core/levels';
let n=0;const check=(v:unknown,m:string)=>{if(!v)throw Error(m);n++;};
const p=new Player(100,450,8);p.onGround=true;p.control({...NO_INPUT,jumpPressed:true,jumpHeld:true},1/60);check(!p.onGround&&p.airJumpReady,'ground leap reserves extra jump');
p.vy=40;p.control({...NO_INPUT,jumpPressed:true,jumpHeld:true},1/60);check(p.vy<0&&!p.airJumpReady,'second press launches aerial jump');p.vy=100;p.control({...NO_INPUT,jumpPressed:true,jumpHeld:true},1/60);check(p.vy===100,'third leap denied');p.onGround=true;p.control(NO_INPUT,1/60);check(p.airJumpReady,'landing recharges');
p.onGround=false;p.airJumpReady=false;p.wallGrace=.1;p.wallDir=1;p.control({...NO_INPUT,jumpPressed:true,jumpHeld:true},1/60);check(p.vy<0&&p.vx<0&&!p.airJumpReady,'wall jump remains available without granting infinite extra jumps');
check(p.swing===SWINGS[0],'hammer timings unchanged');for(const s of STAGES){check(s.ground.some(g=>g[2]<=200),'high traversal summit');check(s.signs.some(q=>q.key==='double'),'double jump teaching');}
console.log(`${n} traversal checks passed.`);
