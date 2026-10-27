import { LAND_WEAPONS, type WeaponId } from './weapons';

/**
 * Loot integration is separate from authored terrain/encounters. Never add foes,
 * waves or change their stats just to exercise a weapon. These source identities
 * refer to foes already in the approved first-land encounter data.
 */
export function rewardForSpawn(land:number,encounter:number,wave:number,spawn:number):WeaponId|undefined {
  if(land===0&&encounter===1&&(spawn===0||(wave===1&&spawn===1)))return 'sling';
  return spawn===0?LAND_WEAPONS[land]:undefined;
}

export function rewardForSource(land:number,source:string):WeaponId|undefined {
  const match=/^e(\d+)w(\d+)s(\d+)$/.exec(source);
  if(!match)return undefined;
  return rewardForSpawn(land,Number(match[1]),Number(match[2]),Number(match[3]))??LAND_WEAPONS[land];
}
