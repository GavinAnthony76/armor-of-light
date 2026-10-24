// World units are pixels of a 540px-tall view. The view width stretches
// between VIEW_W_MIN and VIEW_W_MAX to fit the screen's shape.

export const VIEW_H = 540;
export const VIEW_W_MIN = 960;
export const VIEW_W_MAX = 1280;
export const DT = 1 / 60;

export const GRAVITY = 2300;
export const MAX_FALL = 1300;

export const PLAYER = {
  w: 30,
  h: 64,
  speed: 305,
  accel: 3100,
  decel: 3500,
  airAccel: 1800,
  jumpV: 800,
  coyote: 0.1,
  jumpBuffer: 0.13,
  blockSpeed: 0, // standing still while blocking
} as const;

export type DifficultyId = 'gentle' | 'challenging';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  blurb: string;
  hearts: number;
  windup: number; // multiplies every enemy wind-up (bigger = more warning)
  enemyHp: number;
  enemySpeed: number;
  parryWindow: number; // seconds after pressing block that count as a parry
  invuln: number;
  maxAttackers: number; // how many regular enemies may attack at once
  healOnClear: number; // hearts restored after each fight
  bossKeepsDamage: boolean; // boss stays hurt when you retry
  heavyDamage: number; // damage of red (unblockable) attacks
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  gentle: {
    id: 'gentle',
    label: 'Gentle',
    blurb: 'More hearts, longer warnings, and bosses stay hurt when you retry.',
    hearts: 8,
    windup: 1.4,
    enemyHp: 0.75,
    enemySpeed: 0.85,
    parryWindow: 0.24,
    invuln: 1.3,
    maxAttackers: 1,
    healOnClear: 99,
    bossKeepsDamage: true,
    heavyDamage: 1,
  },
  challenging: {
    id: 'challenging',
    label: 'Challenging',
    blurb: 'Fewer hearts, faster foes, and a tighter parry.',
    hearts: 5,
    windup: 1.0,
    enemyHp: 1.0,
    enemySpeed: 1.0,
    parryWindow: 0.16,
    invuln: 1.0,
    maxAttackers: 2,
    healOnClear: 2,
    bossKeepsDamage: false,
    heavyDamage: 2,
  },
};

export const SCORE = {
  mote: 10,
  clearBonus: 1000,
  noDeathBonus: 750,
  timeBonusPerSec: 6,
} as const;
