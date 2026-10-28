import type { Stage } from './stage';
import type { ChestDef, RouteGate } from './journey-types';
import { ROMAN, WEAPONS, type Rank } from './weapons';

/** Chest ownership and seals are independent of enemy loot and checkpoint retries. */
export class Exploration {
  readonly opened=new Set<string>();
  constructor(private s:Stage){this.syncGates();}
  isGateOpen(g:RouteGate):boolean{return this.s.nextEncounter>g.encounter;}
  get limit():number {
    return Math.min(this.s.def.length,...(this.s.def.expedition?.gates??[]).filter(g=>!this.isGateOpen(g)).map(g=>g.x));
  }
  syncGates():void {
    for(const g of this.s.def.expedition?.gates??[]){
      this.s.terrain.ground=this.s.terrain.ground.filter(q=>!(q.x0===g.x&&q.x1===g.x+44&&q.y===-1800));
      if(!this.isGateOpen(g))this.s.terrain.addGround(g.x,g.x+44,-1800);
    }
  }
  nearbyChest():ChestDef|null {
    const p=this.s.player;
    return this.s.def.expedition?.chests.filter(c=>!this.opened.has(c.id)&&Math.abs(c.x-p.x)<65&&Math.abs(c.y-p.y)<55)
      .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]??null;
  }
  restore(raw:unknown):void {
    this.opened.clear();
    if(Array.isArray(raw))for(const id of raw)if(typeof id==='string'&&this.s.def.expedition?.chests.some(c=>c.id===id))this.opened.add(id);
    for(const c of this.s.def.expedition?.chests??[])if(c.reward==='weapon'&&this.s.issuedRewards.has(`chest:${c.id}`))this.opened.add(c.id);
    const relics=this.s.def.expedition?.chests.filter(c=>c.reward==='relic'&&this.opened.has(c.id)).length??0;
    this.s.player.maxHp=this.s.diff.hearts+Math.min(3,relics);
    this.s.player.hp=this.s.player.maxHp;
    this.syncGates();
  }
  open():void {
    const c=this.nearbyChest();if(!c)return;
    this.opened.add(c.id);
    const s=this.s,p=s.player,eq=p.equipment;
    let text='';
    if(c.reward==='weapon'&&c.weapon){
      const id=`chest:${c.id}`;
      s.issuedRewards.add(id);
      s.weaponDrops.push({id,weapon:c.weapon,rank:1,copy:true,x:c.x,y:c.y,vx:0,vy:-170,age:0,bounce:0,settled:false});
      text=`Discovered ${WEAPONS[c.weapon].name} · pick up or leave`;
    }else if(c.reward==='upgrade'){
      const rank=p.weaponRank;
      if(rank<3){
        if(p.weaponId==='hammer')eq.hammerRank=(rank+1) as Rank;
        else if(eq.alternate)eq.alternate.rank=(rank+1) as Rank;
        text=`Forged ${WEAPONS[p.weaponId].name} ${ROMAN[p.weaponRank]}`;
      }else text='Masterwork bonus · +750 score';
      s.bankTreasure(rank===3?750:250);
    }else if(c.reward==='relic'){
      p.maxHp=Math.min(s.diff.hearts+3,p.maxHp+1);p.hp=p.maxHp;
      s.bankTreasure(c.value??1000);text=`Relic recovered · heart capacity +1 · +${c.value??1000}`;
    }else if(c.reward==='heart'){
      p.hp=p.maxHp;s.bankTreasure(150);text='Hearts restored · +150 score';
      s.emit({type:'heal',x:p.x,y:p.y-40});
    }else{
      s.bankTreasure(c.value??500);text=`Treasure recovered · +${c.value??500} score`;
    }
    s.equipmentRevision++;s.emit({type:'equipment',text});
    s.emit({type:'pickup',x:c.x,y:c.y-24,kind:'mote'});
  }
}
