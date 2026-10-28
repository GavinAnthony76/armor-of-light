import type { WeaponId } from './weapons';

export interface ChestDef {
  id:string; name:string; x:number; y:number; hidden?:boolean;
  reward:'weapon'|'upgrade'|'treasure'|'heart'|'relic';
  weapon?:WeaponId; value?:number;
}
export interface RouteGate { id:string; name:string; x:number; y:number; encounter:number }
export interface JourneyDef {
  route:[number,number][];
  zones:{name:string;x:number;hint:string}[];
  chests:ChestDef[];
  gates:RouteGate[];
  bossWeapon:WeaponId;
}
export interface LevelState {
  keeper?:boolean; seal?:boolean; gate?:boolean;
  checkpoint?:{x:number;y:number};
  opened?:string[];
  checkpointScore?:number;
}
