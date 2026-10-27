import { LAND_WEAPONS, type WeaponId } from './weapons';

/**
 * Loot integration is separate from authored terrain/encounters. Never add foes,
 * waves or change their stats just to exercise a weapon. These source identities
 * refer to foes in the authored Desert Ruins data. Each weapon has three
 * opportunities before the guardian; do not invent spawns to supply upgrades.
 */
const DESERT_REWARDS:Readonly<Record<string,WeaponId>>={
  e0w0s0:'sunblade',e0w1s0:'sunblade',e2w0s0:'sunblade',
  e1w0s0:'sling',e1w1s0:'sling',e1w1s1:'sling',
  e3w0s0:'sunblade',
};
export function rewardForSpawn(land:number,encounter:number,wave:number,spawn:number):WeaponId|undefined {
  if(land===0)return DESERT_REWARDS[`e${encounter}w${wave}s${spawn}`];
  return spawn===0?LAND_WEAPONS[land]:undefined;
}

export function rewardForSource(land:number,source:string):WeaponId|undefined {
  const match=/^e(\d+)w(\d+)s(\d+)$/.exec(source);
  if(!match)return undefined;
  return rewardForSpawn(land,Number(match[1]),Number(match[2]),Number(match[3]));
}
