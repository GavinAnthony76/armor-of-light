import type { Stage } from './stage';
import { overlaps } from './types';

export interface Lightstone {
  x:number; y:number; lastX:number; lastY:number; vx:number; vy:number;
  life:number; rank:number; heavy:boolean; damage:number; facing:number;
  pierce:number; struck:Set<number>;
}

/** Real, finite, swept-collision projectiles; no invisible ranged melee box. */
export class RangedCombat {
  stones: Lightstone[] = [];

  fire(s:Stage):void {
    const p=s.player, rank=p.weaponRank;
    if(this.stones.length>=24)return;
    const x=p.x+p.facing*28,y=p.y-43;
    const target=s.enemies.filter(e=>e.alive && (e.x-p.x)*p.facing>20 && Math.abs(e.x-p.x)<720)
      .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    const aim=target?Math.max(-.3,Math.min(.3,Math.atan2(target.center().y-y,Math.abs(target.x-x)))):0;
    const count=rank, speed=p.heavySwing?920:800;
    const struck=new Set<number>(); // a fan widens coverage; it cannot shotgun one target
    for(let i=0;i<count;i++){
      const angle=aim+(i-(count-1)/2)*.085;
      this.stones.push({x,y,lastX:x,lastY:y,vx:Math.cos(angle)*speed*p.facing,vy:Math.sin(angle)*speed,
        life:1.15,rank,heavy:p.heavySwing,damage:((p.heavySwing?1.7:1.0)+(rank-1)*.18)*(p.heavySwing&&p.combo===2?1.25:1),
        facing:p.facing,pierce:p.heavySwing?2:1,struck});
    }
    s.emit({type:'slingShot',x,y,rank,facing:p.facing});
  }

  update(s:Stage,dt:number):void {
    for(const b of this.stones){
      b.lastX=b.x;b.lastY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      const ground=s.terrain.groundAt(b.x);
      if(b.x<0||b.x>s.def.length||b.y<0||b.y>650||(ground!==null&&b.y>=ground)){b.life=0;continue;}
      const box={x:Math.min(b.x,b.lastX)-5,y:Math.min(b.y,b.lastY)-5,w:Math.abs(b.x-b.lastX)+10,h:Math.abs(b.y-b.lastY)+10};
      for(const e of s.enemies){
        if(!e.alive||b.struck.has(e.id)||!overlaps(box,e.hurtBox()))continue;
        const result=e.takeHit(s,b.damage,b.facing,b.heavy?280:110);
        if(result==='hit'||result==='killed'||result==='guarded'){
          b.struck.add(e.id);b.pierce--;
          if(result==='guarded'){
            s.emit({type:'clang',x:b.x,y:b.y});
            if(b.heavy)e.stagger(s,.45);
          }
          else s.recordCombatHit(result,b.x,b.y,b.damage,e.boss,b.heavy);
          if(b.pierce<=0){b.life=0;break;}
        }
      }
    }
    this.stones=this.stones.filter(b=>b.life>0);
  }

  clear():void {this.stones=[];}
}
