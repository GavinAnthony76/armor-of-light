export type WeaponId =
  | 'sunblade'
  | 'tide-spear'
  | 'thorn-glaive'
  | 'storm-sabre'
  | 'iron-maul'
  | 'watch-twinblades'
  | 'river-greatsword';

export type WeaponSlot = 'hammer' | 'alternate';

export interface WeaponProfile {
  id: WeaponId;
  name: string;
  kind: 'sword' | 'spear' | 'glaive' | 'sabre' | 'maul' | 'twinblades' | 'greatsword';
  color: string;
  shine: string;
  reach: number;
  tempo: number;
  knock: number;
  lunge: number;
  advantage: string;
  tradeoff: string;
}

export const WEAPONS: Record<WeaponId, WeaponProfile> = {
  sunblade: {
    id: 'sunblade', name: 'Sunblade', kind: 'sword', color: '#f6bd48', shine: '#fff2ad',
    reach: 1.02, tempo: 1.05, knock: 0.9, lunge: 1.05,
    advantage: 'Balanced reach and speed', tradeoff: 'Lighter knockback than the hammer',
  },
  'tide-spear': {
    id: 'tide-spear', name: 'Tide Spear', kind: 'spear', color: '#55c8e8', shine: '#d5fbff',
    reach: 1.34, tempo: 0.96, knock: 0.9, lunge: 0.92,
    advantage: 'Longest, narrow thrusts', tradeoff: 'Less coverage beside you',
  },
  'thorn-glaive': {
    id: 'thorn-glaive', name: 'Thorn Glaive', kind: 'glaive', color: '#87cc72', shine: '#e2ffad',
    reach: 1.22, tempo: 0.92, knock: 1.08, lunge: 1,
    advantage: 'Wide, high-cleaving arcs', tradeoff: 'Slower recovery',
  },
  'storm-sabre': {
    id: 'storm-sabre', name: 'Storm Sabre', kind: 'sabre', color: '#9db9ff', shine: '#eff5ff',
    reach: 0.98, tempo: 1.2, knock: 0.82, lunge: 1.12,
    advantage: 'Fast strikes and forward pressure', tradeoff: 'Light knockback',
  },
  'iron-maul': {
    id: 'iron-maul', name: 'Iron Maul', kind: 'maul', color: '#d8a66f', shine: '#fff0cb',
    reach: 0.9, tempo: 0.82, knock: 1.34, lunge: 0.84,
    advantage: 'Heavy impact and knockback', tradeoff: 'Slow, shorter swings',
  },
  'watch-twinblades': {
    id: 'watch-twinblades', name: 'Watch Twinblades', kind: 'twinblades', color: '#c9a6ff', shine: '#fff0ff',
    reach: 0.86, tempo: 1.26, knock: 0.72, lunge: 1.16,
    advantage: 'Quick, close-range combos', tradeoff: 'Shortest reach and knockback',
  },
  'river-greatsword': {
    id: 'river-greatsword', name: 'River Greatsword', kind: 'greatsword', color: '#74d7b6', shine: '#e0fff3',
    reach: 1.2, tempo: 0.87, knock: 1.2, lunge: 0.95,
    advantage: 'Broad reach with strong knockback', tradeoff: 'Slower than a sabre',
  },
};

export const LAND_WEAPONS: WeaponId[] = [
  'sunblade',
  'tide-spear',
  'thorn-glaive',
  'storm-sabre',
  'iron-maul',
  'watch-twinblades',
  'river-greatsword',
];

export interface WeaponDropSave {
  id: string;
  weapon: WeaponId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  settled: boolean;
}

export interface WeaponRunSave {
  alternate: WeaponId | null;
  rank: number;
  equipped: WeaponSlot;
  dropsIssued: number;
  rewardedSources?: string[];
  drops: WeaponDropSave[];
}

export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(WEAPONS, value);
}

export function romanRank(rank: number): string {
  return ['—', 'I', 'II', 'III'][Math.max(0, Math.min(3, Math.floor(rank)))] ?? '—';
}
