/** Equipment is local to one land attempt. Hammer timing is never modified. */
export type WeaponId = 'hammer' | 'sunblade' | 'tide' | 'thorn' | 'storm' | 'iron' | 'watch' | 'river';
export type Rank = 1 | 2 | 3;
export interface WeaponDef {
  name: string; shape: 'hammer'|'sword'|'spear'|'glaive'|'sabre'|'maul'|'twins'|'greatsword';
  benefit: string; color: string; reach: number; tempo: number; damage: number; knock: number; length: number;
}
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  hammer: {name:'Ember Hammer',shape:'hammer',benefit:'Balanced force · flame never fades',color:'#ffac45',reach:1,tempo:1,damage:1,knock:1,length:36},
  sunblade: {name:'Sunblade',shape:'sword',benefit:'Quicker cuts · lighter impact',color:'#ffe091',reach:1.03,tempo:.90,damage:.92,knock:.78,length:43},
  tide: {name:'Tide Spear',shape:'spear',benefit:'Long thrust · narrow contact',color:'#8ee7f2',reach:1.38,tempo:1.03,damage:.94,knock:.8,length:68},
  thorn: {name:'Thorn Glaive',shape:'glaive',benefit:'Wide sweep · slower recovery',color:'#bce6a1',reach:1.22,tempo:1.07,damage:1,knock:.9,length:58},
  storm: {name:'Storm Sabre',shape:'sabre',benefit:'Swift arc · lighter knockback',color:'#b6c9ff',reach:1.02,tempo:.86,damage:.89,knock:.7,length:42},
  iron: {name:'Iron Maul',shape:'maul',benefit:'Heavy impact · shorter reach',color:'#dfbb8d',reach:.89,tempo:1.1,damage:1.24,knock:1.3,length:33},
  watch: {name:'Watch Twinblades',shape:'twins',benefit:'Rapid paired cuts · close range',color:'#d4b7ff',reach:.86,tempo:.81,damage:.85,knock:.65,length:30},
  river: {name:'River Greatsword',shape:'greatsword',benefit:'Long powerful arc · deliberate tempo',color:'#a0e7da',reach:1.25,tempo:1.1,damage:1.12,knock:1.12,length:56},
};
export const LAND_WEAPONS: WeaponId[] = ['sunblade','tide','thorn','storm','iron','watch','river'];
export const ROMAN = ['','I','II','III'];
export interface Equipment { alternate: {id:WeaponId;rank:Rank}|null; equipped:'hammer'|'alternate' }
export interface WeaponDrop { id:string; weapon:WeaponId; rank:Rank; copy:boolean; x:number;y:number;vx:number;vy:number;age:number;bounce:number;settled:boolean }
export interface WeaponJournal { equipment:Equipment; issued:string[]; drops:WeaponDrop[]; serial:number }
export const freshEquipment=():Equipment=>({alternate:null,equipped:'hammer'});
export const validWeapon=(x:unknown):x is WeaponId=>typeof x==='string'&&Object.prototype.hasOwnProperty.call(WEAPONS,x);
export const rankOf=(x:unknown):Rank=>x===2?2:x===3?3:1;
/** Untrusted saves: only known identities, finite positions, bounded sizes; no aliasing. */
export function cleanJournal(raw:unknown,land:number,length:number):WeaponJournal {
  const r=raw as Partial<WeaponJournal>|null;
  const equipment=freshEquipment();
  const alt=r?.equipment?.alternate;
  if(alt&&alt.id===LAND_WEAPONS[land])equipment.alternate={id:alt.id,rank:rankOf(alt.rank)};
  if(equipment.alternate&&r?.equipment?.equipped==='alternate')equipment.equipped='alternate';
  const issued=Array.isArray(r?.issued)?[...new Set(r.issued.filter(x=>typeof x==='string'&&/^e\d+w\d+s\d+$/.test(x)))].slice(0,100):[];
  const seen=new Set<string>();
  const drops:WeaponDrop[]=[];
  for(const d of Array.isArray(r?.drops)?r.drops.slice(0,20):[]){
    if(!d||typeof d.id!=='string'||seen.has(d.id)||d.weapon!==LAND_WEAPONS[land]||!Number.isFinite(d.x)||!Number.isFinite(d.y))continue;
    if(d.copy&&!issued.includes(d.id))continue;
    if(!d.copy&&!/^exchange\d+$/.test(d.id))continue;
    seen.add(d.id);drops.push({id:d.id,weapon:d.weapon,rank:rankOf(d.rank),copy:!!d.copy,x:Math.max(24,Math.min(length-24,d.x)),y:Math.max(0,Math.min(500,d.y)),vx:0,vy:0,age:1,bounce:1,settled:false});
  }
  return {equipment,issued,drops,serial:Math.max(0,Math.min(10000,Math.floor(Number(r?.serial)||0)))};
}
