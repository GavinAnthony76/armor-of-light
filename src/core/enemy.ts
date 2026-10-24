import type { Difficulty } from './config';
import type { Player } from './player';
import type { Terrain } from './terrain';
import { overlaps, Rect, StageEvent } from './types';

export type EnemyKind = 'wisp' | 'husk' | 'caster' | 'lurker' | 'sentinel' | 'warden' | 'serpent' | 'king' | 'thorn' | 'watcher' | 'colossus' | 'keeper';

/** What enemies may ask of the stage. */
export interface World {
  player: Player;
  terrain: Terrain;
  diff: Difficulty;
  bounds: { minX: number; maxX: number };
  rng: () => number;
  emit(e: StageEvent): void;
  takeToken(e: Enemy): boolean;
  releaseToken(e: Enemy): void;
  hitPlayer(src: { x: number; enemy?: Enemy }, dmg: number, heavy: boolean): 'parry' | 'block' | 'hit' | 'miss';
  spawnOrb(x: number, y: number, vx: number, vy: number, owner: Enemy): void;
  spawnWave(x: number, y: number, dir: number, speed: number, range: number, big: boolean): void;
  spawnEnemy(kind: EnemyKind, x: number, y?: number): Enemy;
  shake(amount: number): void;
}

export interface AttackDef {
  id: string;
  windup: number;
  active: number;
  recover: number;
  damage: number;
  heavy?: boolean; // unblockable (red warning)
  box?: { dx: number; dy: number; w: number; h: number };
  lunge?: number;
  next?: string;
}

interface KindCfg {
  w: number;
  h: number;
  hp: number;
  speed: number;
  flying?: boolean;
  boss?: boolean;
  score: number;
  motes: number;
  name?: string;
  title?: string;
}

export const KINDS: Record<EnemyKind, KindCfg> = {
  thorn: {w:64,h:128,hp:34,speed:95,boss:true,score:1900,motes:26,name:'Thorn Sentinel',title:'Guardian of the Olive Gate'},
  watcher: {w:64,h:144,hp:36,speed:100,boss:true,score:2100,motes:27,name:'Storm Watcher',title:'Sentinel of the High Pass'},
  colossus: {w:120,h:200,hp:34,speed:65,boss:true,score:2300,motes:28,name:'Iron Colossus',title:'The Unmoved One'},
  keeper: {w:64,h:128,hp:40,speed:160,boss:true,score:2400,motes:29,name:'Keeper of Shadows',title:'Sentinel of the Broken Wall'},

  wisp: { w: 34, h: 34, hp: 2, speed: 150, flying: true, score: 60, motes: 3 },
  husk: { w: 40, h: 74, hp: 4, speed: 95, score: 100, motes: 4 },
  caster: { w: 40, h: 82, hp: 3, speed: 110, score: 120, motes: 5 },
  lurker: { w: 56, h: 46, hp: 4, speed: 120, score: 120, motes: 5 },
  sentinel: { w: 48, h: 92, hp: 6, speed: 80, score: 180, motes: 6 },
  warden: { w: 120, h: 200, hp: 30, speed: 60, boss: true, score: 1500, motes: 24, name: 'The Dune Warden', title: 'Shadow of the Sands' },
  serpent: { w: 70, h: 70, hp: 34, speed: 0, boss: true, score: 1800, motes: 26, name: 'The Tide Serpent', title: 'Shadow of the Deep' },
  king: { w: 64, h: 128, hp: 44, speed: 150, boss: true, score: 2500, motes: 30, name: 'The Hollow King', title: 'Shadow at the Gate' },
};

const A: Record<string, AttackDef> = {
  wispDash: { id: 'wispDash', windup: 0.7, active: 0.42, recover: 0.8, damage: 1 },
  huskSwing: { id: 'huskSwing', windup: 0.65, active: 0.14, recover: 0.7, damage: 1, box: { dx: 6, dy: -84, w: 84, h: 82 }, lunge: 130 },
  casterOrb: { id: 'casterOrb', windup: 0.8, active: 0.1, recover: 0.6, damage: 1 },
  lurkerLeap: { id: 'lurkerLeap', windup: 0.6, active: 1.2, recover: 0.8, damage: 1 },
  lurkerSnap: { id: 'lurkerSnap', windup: 0.5, active: 0.12, recover: 0.6, damage: 1, box: { dx: 10, dy: -44, w: 62, h: 42 }, lunge: 160 },
  thrust1: { id: 'thrust1', windup: 0.7, active: 0.16, recover: 0.25, damage: 1, box: { dx: 8, dy: -66, w: 106, h: 36 }, lunge: 220, next: 'thrust2' },
  thrust2: { id: 'thrust2', windup: 0.35, active: 0.16, recover: 0.9, damage: 1, box: { dx: 8, dy: -66, w: 106, h: 36 }, lunge: 220 },
  // Dune Warden
  sweep: { id: 'sweep', windup: 0.9, active: 0.25, recover: 0.9, damage: 1, box: { dx: -30, dy: -110, w: 230, h: 110 } },
  slam: { id: 'slam', windup: 1.1, active: 0.12, recover: 1.5, damage: 1, heavy: true, box: { dx: -40, dy: -60, w: 200, h: 60 } },
  summon: { id: 'summon', windup: 1.0, active: 0.1, recover: 0.8, damage: 0 },
  // Tide Serpent
  spit: { id: 'spit', windup: 0.8, active: 0.1, recover: 0.7, damage: 1 },
  tail: { id: 'tail', windup: 1.1, active: 0.22, recover: 0.7, damage: 1, heavy: true },
  bite: { id: 'bite', windup: 0.9, active: 0.34, recover: 1.7, damage: 1 },
  // Hollow King
  combo1: { id: 'combo1', windup: 0.6, active: 0.14, recover: 0.12, damage: 1, box: { dx: 0, dy: -120, w: 128, h: 118 }, lunge: 170, next: 'combo2' },
  combo2: { id: 'combo2', windup: 0.36, active: 0.14, recover: 0.12, damage: 1, box: { dx: 0, dy: -120, w: 128, h: 118 }, lunge: 170, next: 'combo3' },
  combo3: { id: 'combo3', windup: 0.46, active: 0.16, recover: 1.0, damage: 1, box: { dx: 0, dy: -130, w: 150, h: 128 }, lunge: 220 },
  kingDash: { id: 'kingDash', windup: 0.8, active: 0.42, recover: 0.9, damage: 1 },
  kingWave: { id: 'kingWave', windup: 1.0, active: 0.1, recover: 0.9, damage: 1, heavy: true },
  kingLeap: { id: 'kingLeap', windup: 0.7, active: 1.4, recover: 1.1, damage: 1, heavy: true },
};

export const ATTACKS = A;

let nextId = 1;

export type EnemyState = 'spawn' | 'move' | 'windup' | 'active' | 'recover' | 'stagger' | 'hurt' | 'dying';

export class Enemy {
  readonly id = nextId++;
  readonly kind: EnemyKind;
  readonly cfg: KindCfg;
  x: number;
  y: number;
  prevX:number;
  prevY:number;
  vx = 0;
  vy = 0;
  w: number;
  h: number;
  onGround = false;
  facing = -1;
  hp: number;
  maxHp: number;
  state: EnemyState = 'spawn';
  t = 0;
  stride=0;
  anim = 0;
  attack: AttackDef | null = null;
  attackHit = false;
  cooldown = 0.6;
  hasToken = false;
  flash = 0;
  staggerDur = 0;
  guardBroken = 0;
  flinches = 0;
  flinchClock = 0;
  armor = 0;
  removed = false;
  rewarded = false;
  phase = 1;
  summons = 0;
  /** Ground marker for area attacks (serpent tail, king leap). */
  marker: { x: number; r: number } | null = null;
  /** Serpent head position (world) and resting anchor. */
  head = { x: 0, y: 0 };
  homeX = 0;
  side = 1;
  wave = 0; // which encounter wave spawned it

  constructor(kind: EnemyKind, x: number, y: number, diff: Difficulty) {
    this.kind = kind;
    this.cfg = KINDS[kind];
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.w = this.cfg.w;
    this.h = this.cfg.h;
    this.maxHp = this.hp = Math.max(1, Math.round(this.cfg.hp * diff.enemyHp));
    this.homeX = x;
    this.head = { x: x - 120, y: y - 200 };
  }

  get boss(): boolean {
    return !!this.cfg.boss;
  }

  get alive(): boolean {
    return this.state !== 'dying' && !this.removed;
  }

  /** True while showing a warning before an attack. */
  get telegraphing(): boolean {
    return this.state === 'windup' && !!this.attack && this.attack.damage > 0;
  }

  get guarding(): boolean {
    return this.kind === 'sentinel' && this.guardBroken <= 0 && (this.state === 'move' || this.state === 'windup' || this.state === 'spawn');
  }

  windupTime(w: World): number {
    if (!this.attack) return 0;
    const phaseK = this.phase >= 2 ? 0.85 : 1;
    return this.attack.windup * w.diff.windup * phaseK;
  }

  hurtBox(): Rect {
    if (this.kind === 'serpent') return { x: this.head.x - 34, y: this.head.y - 32, w: 68, h: 64 };
    if (this.cfg.flying) return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  /** Center point for effects. */
  center(): { x: number; y: number } {
    const b = this.hurtBox();
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  }

  private setState(s: EnemyState): void {
    this.state = s;
    this.t = 0;
  }

  private start(w: World, id: string, needToken = true): boolean {
    if (needToken && !this.boss && !w.takeToken(this)) return false;
    this.attack = A[id];
    this.attackHit = false;
    this.setState('windup');
    const c = this.center();
    if (this.attack.damage > 0) w.emit({ type: 'telegraph', x: c.x, y: c.y, heavy: !!this.attack.heavy, boss: this.boss });
    return true;
  }

  private finishAttack(w: World): void {
    this.attack = null;
    this.marker = null;
    w.releaseToken(this);
    this.setState('move');
  }

  stagger(w: World, dur: number): void {
    if (!this.alive) return;
    this.attack = null;
    this.marker = null;
    w.releaseToken(this);
    this.staggerDur = dur;
    this.setState('stagger');
    if (this.kind === 'sentinel') this.guardBroken = 2.6;
    this.vx = -this.facing * 120;
  }

  /** Returns 'guarded' if the hit was blocked by a shield. */
  takeHit(w: World, dmg: number, dir: number, knock: number): 'hit' | 'guarded' | 'killed' | 'ignored' {
    if (!this.alive || this.state === 'spawn') return 'ignored';
    if (this.guarding && (w.player.x - this.x) * this.facing > 0) {
      this.vx = dir * 60;
      return 'guarded';
    }
    this.hp -= dmg;
    this.flash = 0.14;
    if (this.hp <= 0) {
      this.hp = 0;
      w.releaseToken(this);
      this.attack = null;
      this.marker = null;
      this.setState('dying');
      return 'killed';
    }
    if (this.boss) {
      if (this.phase === 1 && this.hp <= this.maxHp / 2) {
        this.phase = 2;
        const c = this.center();
        w.emit({ type: 'bossPhase', x: c.x, y: c.y });
      }
      return 'hit';
    }
    // regular enemies flinch, but not forever
    this.flinchClock = 1.6;
    this.flinches++;
    if (this.armor > 0 || this.state === 'active') return 'hit';
    if (this.flinches >= 3) {
      this.armor = 1.2;
      this.flinches = 0;
    }
    this.attack = null;
    w.releaseToken(this);
    this.setState('hurt');
    this.vx = dir * knock * (this.cfg.flying ? 1.2 : 1);
    if (this.cfg.flying) this.vy = -60;
    return 'hit';
  }

  update(w: World, dt: number): void {
    this.t += dt;
    this.anim += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cooldown -= dt;
    this.guardBroken = Math.max(0, this.guardBroken - dt);
    this.armor = Math.max(0, this.armor - dt);
    this.flinchClock -= dt;
    if (this.flinchClock <= 0) this.flinches = 0;
    const speed = this.cfg.speed * w.diff.enemySpeed;

    switch (this.state) {
      case 'spawn':
        if (this.t > 0.65) this.setState('move');
        this.vx = 0;
        break;
      case 'dying':
        this.vx *= 0.9;
        if (this.t > 0.75) this.removed = true;
        break;
      case 'stagger':
        this.vx *= Math.pow(0.05, dt);
        if (this.t > this.staggerDur) this.setState('move');
        break;
      case 'hurt':
        this.vx *= Math.pow(0.02, dt);
        if (this.cfg.flying) this.vy *= Math.pow(0.05, dt);
        if (this.t > 0.26) this.setState('move');
        break;
      case 'move':
        this.think(w, dt, speed);
        break;
      case 'windup':
        this.windup(w, dt);
        if (this.attack && this.t >= this.windupTime(w)) {
          this.setState('active');
          this.onActive(w);
        }
        break;
      case 'active':
        this.active(w, dt);
        break;
      case 'recover':
        this.recover(w, dt);
        if (this.attack && this.t >= this.attack.recover * (this.phase >= 2 ? 0.8 : 1)) {
          this.cooldown = this.boss ? 0.3 + w.rng() * 0.5 : 0.7 + w.rng() * 0.9;
          this.finishAttack(w);
        }
        break;
    }

    this.physics(w, dt);
    this.stride+=Math.abs(this.x-this.prevX)*.055;
  }

  // ----------------------------------------------------------- movement

  private faceToPlayer(w: World): void {
    if (this.kind === 'serpent') return;
    this.facing = w.player.x >= this.x ? 1 : -1;
  }

  /** Walk toward `tx`, stopping at ledges. */
  private walkTo(w: World, tx: number, speed: number, dt: number): void {
    const d = tx - this.x;
    const dir = Math.abs(d) < 6 ? 0 : Math.sign(d);
    let target = dir * speed;
    if (dir !== 0 && this.onGround) {
      const ahead = this.x + dir * (this.w / 2 + 8);
      const s = w.terrain.surfaceBelow(ahead, this.y - 4);
      if (s === null || Math.abs(s - this.y) > 6) target = 0;
    }
    this.vx += (target - this.vx) * Math.min(1, dt * 8);
  }

  private think(w: World, dt: number, speed: number): void {
    const p = w.player;
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const dy = p.y - this.y;
    if (this.kind !== 'serpent') this.faceToPlayer(w);
    const ready = this.cooldown <= 0 && p.state !== 'dead';

    switch (this.kind) {
      case 'wisp': {
        if (this.x !== p.x) this.side = Math.sign(this.x - p.x) || 1;
        const tx = p.x + this.side * 150;
        const ty = p.y - 84 + Math.sin(this.anim * 2.2) * 14;
        this.steer(tx, ty, speed, dt);
        if (ready && adx < 250 && adx > 60) this.start(w, 'wispDash');
        break;
      }
      case 'husk':
        this.walkTo(w, p.x - Math.sign(dx || 1) * 58, speed, dt);
        if (ready && adx < 86 && Math.abs(dy) < 50) this.start(w, 'huskSwing');
        break;
      case 'caster': {
        let tx = this.x;
        if (adx < 230) tx = this.x - Math.sign(dx || 1) * 80;
        else if (adx > 420) tx = p.x - Math.sign(dx || 1) * 380;
        this.walkTo(w, tx, speed, dt);
        if (ready && adx < 560 && Math.abs(dy) < 80) this.start(w, 'casterOrb');
        break;
      }
      case 'lurker':
        this.walkTo(w, p.x - Math.sign(dx || 1) * 190, speed, dt);
        if (ready && adx < 74 && Math.abs(dy) < 40) this.start(w, 'lurkerSnap');
        else if (ready && adx > 130 && adx < 340 && Math.abs(dy) < 60 && this.onGround) this.start(w, 'lurkerLeap');
        break;
      case 'sentinel':
        this.walkTo(w, p.x - Math.sign(dx || 1) * 86, speed, dt);
        if (ready && adx < 124 && Math.abs(dy) < 50) this.start(w, 'thrust1');
        break;
      case 'thorn':
      case 'watcher':
      case 'colossus':
      case 'keeper':
        this.thinkChapterBoss(w, dt, speed, adx, dx, ready);
        break;
      case 'warden':
        this.thinkWarden(w, dt, speed, adx, dx, ready);
        break;
      case 'serpent':
        this.thinkSerpent(w, dt, ready);
        break;
      case 'king':
        this.thinkKing(w, dt, speed, adx, dx, ready);
        break;
    }
  }

  private steer(tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const s = Math.min(speed, d * 3);
    this.vx += ((dx / d) * s - this.vx) * Math.min(1, dt * 5);
    this.vy += ((dy / d) * s - this.vy) * Math.min(1, dt * 5);
  }

  private thinkChapterBoss(w: World, dt: number, speed: number, adx: number, dx: number, ready: boolean): void {
    this.walkTo(w, w.player.x-Math.sign(dx||1)*(this.kind==='watcher'?210:100),speed*(this.phase===2?1.15:1),dt);
    if (!ready) return;
    // Advance only when an attack is selected; every guardian has a legible cycle.
    const cycles: Record<string,string[]> = {
      thorn: ['thrust1','tail','thrust1','summon'],
      watcher: ['casterOrb','tail','casterOrb','kingWave'],
      colossus: ['sweep','slam','sweep'],
      keeper: ['kingDash','combo1','kingWave','summon'],
    };
    const cycle=cycles[this.kind];
    let move=cycle[this.summons%cycle.length];
    if (adx>260 && (move==='sweep'||move==='thrust1'||move==='combo1')) move=this.kind==='thorn'?'tail':this.kind==='colossus'?'slam':'kingDash';
    if (this.start(w,move)) this.summons++;
  }

  private thinkWarden(w: World, dt: number, speed: number, adx: number, dx: number, ready: boolean): void {
    this.walkTo(w, w.player.x - Math.sign(dx || 1) * 140, speed * (this.phase >= 2 ? 1.4 : 1), dt);
    if (!ready) return;
    const hpK = this.hp / this.maxHp;
    if ((this.summons === 0 && hpK < 0.66) || (this.summons === 1 && hpK < 0.33)) {
      this.summons++;
      this.start(w, 'summon');
      return;
    }
    const r = w.rng();
    if (adx < 240) this.start(w, r < 0.62 ? 'sweep' : 'slam');
    else if (r < 0.45) this.start(w, 'slam');
  }

  private thinkSerpent(w: World, dt: number, ready: boolean): void {
    // idle: head sways above the water, high but reachable with a jump
    const hx = this.homeX - 150 + Math.sin(this.anim * 1.3) * 30;
    const hy = this.y - 196 + Math.sin(this.anim * 2.1) * 12;
    this.moveHead(hx, hy, 4, dt);
    if (!ready) return;
    const r = w.rng();
    const dist = Math.abs(w.player.x - this.homeX);
    if (dist < 560 && r < 0.4) this.start(w, 'bite');
    else if (r < 0.72) this.start(w, 'spit');
    else this.start(w, 'tail');
  }

  private thinkKing(w: World, dt: number, speed: number, adx: number, dx: number, ready: boolean): void {
    const sp = speed * (this.phase >= 2 ? 1.25 : 1);
    this.walkTo(w, w.player.x - Math.sign(dx || 1) * 110, sp, dt);
    if (!ready) return;
    if (this.phase >= 2 && this.summons === 0) {
      this.summons = 1;
      this.start(w, 'summon');
      return;
    }
    const r = w.rng();
    if (this.phase >= 2 && r < 0.3) this.start(w, r < 0.15 ? 'kingWave' : 'kingLeap');
    else if (adx < 170) this.start(w, 'combo1');
    else if (adx > 220) this.start(w, r < 0.6 ? 'kingDash' : this.phase >= 2 ? 'kingWave' : 'kingDash');
  }

  private moveHead(tx: number, ty: number, k: number, dt: number): void {
    const f = Math.min(1, dt * k);
    this.head.x += (tx - this.head.x) * f;
    this.head.y += (ty - this.head.y) * f;
  }

  // ------------------------------------------------------------- attacks

  private windup(w: World, dt: number): void {
    const a = this.attack!;
    const p = w.player;
    if (this.t < dt * 1.5) this.faceToPlayer(w);
    switch (a.id) {
      case 'wispDash':
        // pull back, gathering shadow
        this.vx += (-this.facing * 50 - this.vx) * Math.min(1, dt * 6);
        this.vy += ((p.y - 70 - this.y) * 1.5 - this.vy) * Math.min(1, dt * 4);
        break;
      case 'tail':
        if (!this.marker) this.marker = { x: p.x, r: 78 };
        this.moveHead(this.homeX - 60, this.y - 250, 3, dt);
        break;
      case 'spit':
        this.moveHead(this.homeX - 90, this.y - 250, 4, dt);
        break;
      case 'bite':
        this.moveHead(this.homeX - 40, this.y - 70, 4, dt);
        break;
      case 'kingLeap':
        if (!this.marker) this.marker = { x: p.x, r: 100 };
        this.marker.x += (p.x - this.marker.x) * Math.min(1, dt * 2);
        this.vx *= 0.8;
        break;
      default:
        if (!this.cfg.flying) this.vx *= Math.pow(0.001, dt);
    }
  }

  private onActive(w: World): void {
    const a = this.attack!;
    const p = w.player;
    switch (a.id) {
      case 'wispDash': {
        const dx = p.x - this.x;
        const dy = p.y - 36 - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const s = 560 * w.diff.enemySpeed;
        this.vx = (dx / d) * s;
        this.vy = (dy / d) * s;
        break;
      }
      case 'casterOrb': {
        const hy = this.y - 52;
        w.spawnOrb(this.x + this.facing * 26, hy, this.facing * 340 * w.diff.enemySpeed, 0, this);
        w.emit({ type: 'shoot', x: this.x + this.facing * 26, y: hy });
        break;
      }
      case 'lurkerLeap': {
        const dx = p.x - this.x;
        this.vx = Math.max(-430, Math.min(430, dx / 0.72));
        this.vy = -720;
        this.onGround = false;
        w.emit({ type: 'jump', x: this.x, y: this.y });
        break;
      }
      case 'slam': {
        w.spawnWave(this.x - 70, this.y, -1, 380, 900, true);
        w.spawnWave(this.x + 70, this.y, 1, 380, 900, true);
        w.emit({ type: 'shockwave', x: this.x, y: this.y, big: true });
        w.shake(10);
        break;
      }
      case 'summon': {
        const n = this.kind === 'king' ? 2 : 2;
        for (let i = 0; i < n; i++) {
          const sx = Math.max(w.bounds.minX + 60, Math.min(w.bounds.maxX - 60, this.x + (i === 0 ? -220 : 220)));
          w.spawnEnemy('wisp', sx, this.y - 160);
        }
        break;
      }
      case 'spit': {
        const n = this.phase >= 2 ? 5 : 3;
        const dx = p.x - this.head.x;
        const dy = p.y - 40 - this.head.y;
        const base = Math.atan2(dy, dx);
        for (let i = 0; i < n; i++) {
          const ang = base + (i - (n - 1) / 2) * 0.16;
          const s = 330 * w.diff.enemySpeed;
          w.spawnOrb(this.head.x, this.head.y, Math.cos(ang) * s, Math.sin(ang) * s, this);
        }
        w.emit({ type: 'shoot', x: this.head.x, y: this.head.y });
        break;
      }
      case 'tail':
        w.emit({ type: 'shockwave', x: this.marker?.x ?? p.x, y: this.y, big: true });
        w.shake(8);
        break;
      case 'kingWave':
        w.spawnWave(this.x + this.facing * 50, this.y, this.facing, 430, 1000, true);
        w.emit({ type: 'shockwave', x: this.x, y: this.y, big: false });
        break;
      case 'kingDash':
        this.vx = this.facing * 720 * w.diff.enemySpeed;
        break;
      case 'kingLeap': {
        const tx = this.marker?.x ?? p.x;
        this.vx = (tx - this.x) / 0.8;
        this.vy = -900;
        this.onGround = false;
        break;
      }
    }
  }

  private meleeBox(): Rect | null {
    const a = this.attack;
    if (!a?.box) return null;
    const b = a.box;
    const x = this.facing > 0 ? this.x + b.dx : this.x - b.dx - b.w;
    return { x, y: this.y + b.dy, w: b.w, h: b.h };
  }

  private tryHit(w: World, box: Rect | null, heavy = false): void {
    if (!box || this.attackHit || !this.attack) return;
    if (overlaps(box, w.player.hurtBox())) {
      this.attackHit = true;
      const r = w.hitPlayer({ x: this.kind === 'serpent' ? this.head.x : this.x, enemy: this }, this.attack.damage, heavy || !!this.attack.heavy);
      if (r === 'block' && this.attack.lunge) this.vx *= 0.2;
    }
  }

  private active(w: World, _dt: number): void {
    const a = this.attack!;
    const bodyBox = () => {
      const b = this.hurtBox();
      return { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 };
    };
    switch (a.id) {
      case 'wispDash':
        this.tryHit(w, bodyBox());
        if (this.t >= a.active) this.toRecover();
        return;
      case 'lurkerLeap':
        this.tryHit(w, bodyBox());
        if ((this.onGround && this.t > 0.12) || this.t > a.active) {
          this.vx = 0;
          w.spawnWave(this.x - 30, this.y, -1, 300, 190, false);
          w.spawnWave(this.x + 30, this.y, 1, 300, 190, false);
          w.emit({ type: 'land', x: this.x, y: this.y, hard: true });
          this.toRecover();
        }
        return;
      case 'kingDash':
        this.tryHit(w, bodyBox());
        if (this.t >= a.active) {
          this.vx *= 0.3;
          this.toRecover();
        }
        return;
      case 'kingLeap':
        if ((this.onGround && this.t > 0.15) || this.t > a.active) {
          this.vx = 0;
          const m = this.marker?.x ?? this.x;
          this.tryHit(w, { x: m - 100, y: this.y - 140, w: 200, h: 140 }, true);
          w.spawnWave(this.x - 40, this.y, -1, 340, 260, false);
          w.spawnWave(this.x + 40, this.y, 1, 340, 260, false);
          w.emit({ type: 'shockwave', x: this.x, y: this.y, big: true });
          w.shake(10);
          this.toRecover();
        }
        return;
      case 'tail': {
        const m = this.marker;
        if (m) this.tryHit(w, { x: m.x - m.r, y: this.y - 230, w: m.r * 2, h: 230 }, true);
        break;
      }
      case 'bite': {
        const k = Math.min(1, this.t / a.active);
        const reach = this.homeX - 40 - 520 * easeOut(k);
        this.head.x = reach;
        this.head.y = this.y - 46;
        this.tryHit(w, { x: this.head.x - 44, y: this.head.y - 34, w: 88, h: 70 });
        break;
      }
      default:
        if (a.lunge && this.t < a.active) {
          this.vx = this.facing * a.lunge * w.diff.enemySpeed;
        }
        this.tryHit(w, this.meleeBox());
    }
    if (this.t >= a.active) {
      if (a.next && this.alive) {
        this.attack = A[a.next];
        this.attackHit = false;
        this.setState('windup');
        const c = this.center();
        w.emit({ type: 'telegraph', x: c.x, y: c.y, heavy: !!this.attack.heavy, boss: this.boss });
      } else this.toRecover();
    }
  }

  private toRecover(): void {
    this.setState('recover');
  }

  private recover(_w: World, dt: number): void {
    if (this.cfg.flying) {
      this.vx *= Math.pow(0.1, dt);
      this.vy *= Math.pow(0.1, dt);
    } else this.vx *= Math.pow(0.002, dt);
    if (this.kind === 'serpent' && this.attack?.id === 'bite') {
      // head rests on the shore: the opening to strike
      if (this.t > this.attack.recover - 0.5) this.moveHead(this.homeX - 150, this.y - 190, 3, dt);
    }
  }

  // ------------------------------------------------------------- physics

  private physics(w: World, dt: number): void {
    if (this.kind === 'serpent') {
      if (this.state === 'stagger') this.moveHead(this.head.x, this.y - 40, 3, dt);
      return;
    }
    const minX = w.bounds.minX;
    const maxX = w.bounds.maxX;
    if (this.cfg.flying) {
      if (this.state === 'dying') {
        this.vy -= 30 * dt;
      }
      if (this.state === 'stagger') this.vy += 600 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const ground = w.terrain.surfaceBelow(this.x, this.y - 200) ?? 450;
      const maxY = ground - this.h / 2 - 2;
      if (this.y > maxY) {
        this.y = maxY;
        this.vy = Math.min(0, this.vy);
      }
      this.y = Math.max(70, this.y);
      this.x = Math.max(minX + 20, Math.min(maxX - 20, this.x));
      return;
    }
    const r = w.terrain.move(this, dt, minX, maxX);
    // fell into a pit: vanish
    if (this.y > 700) {
      this.hp = 0;
      w.releaseToken(this);
      this.state = 'dying';
      this.removed = true;
    }
    if (r.landed && r.impact > 600 && this.kind === 'king') w.emit({ type: 'land', x: this.x, y: this.y, hard: true });
  }
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
