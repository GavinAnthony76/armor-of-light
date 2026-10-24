export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Input for one simulation step. "Pressed" flags are edges since the last step. */
export interface InputFrame {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  blockHeld: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  blockPressed: boolean;
  dashPressed?: boolean;
}

export const NO_INPUT: InputFrame = {
  left: false,
  right: false,
  jumpHeld: false,
  blockHeld: false,
  jumpPressed: false,
  attackPressed: false,
  blockPressed: false,
};

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Things the presentation layer reacts to (sound, particles, shake). */
export type StageEvent =
  | { type: 'dash'; x:number; y:number; facing:number }
  | { type: 'swing'; x: number; y: number; step: number; facing: number; air: boolean }
  | { type: 'hit'; x: number; y: number; heavy: boolean; boss: boolean }
  | { type: 'clang'; x: number; y: number }
  | { type: 'enemyDie'; x: number; y: number; kind: string; size: number }
  | { type: 'playerHurt'; x: number; y: number; dmg: number }
  | { type: 'block'; x: number; y: number }
  | { type: 'parry'; x: number; y: number }
  | { type: 'jump'; x: number; y: number }
  | { type: 'land'; x: number; y: number; hard: boolean }
  | { type: 'telegraph'; x: number; y: number; heavy: boolean; boss: boolean }
  | { type: 'shoot'; x: number; y: number }
  | { type: 'shockwave'; x: number; y: number; big: boolean }
  | { type: 'pickup'; x: number; y: number; kind: 'mote' | 'heart' }
  | { type: 'heal'; x: number; y: number }
  | { type: 'encounterStart'; boss: boolean }
  | { type: 'waveStart'; index: number; total: number }
  | { type: 'encounterClear'; boss: boolean }
  | { type: 'bossIntro'; name: string; title: string }
  | { type: 'bossPhase'; x: number; y: number }
  | { type: 'bossDefeated'; x: number; y: number }
  | { type: 'playerDeath'; x: number; y: number }
  | { type: 'respawn'; x: number; y: number }
  | { type: 'splash'; x: number; y: number }
  | { type: 'spawn'; x: number; y: number; kind: string }
  | { type: 'stageClear' }
  | { type: 'pathOpen'; x: number };
