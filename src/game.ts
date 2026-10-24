import type { AudioEngine } from './audio/audio';
import { Autopilot } from './core/autopilot';
import { DifficultyId, DT } from './core/config';
import { STAGES } from './core/levels';
import { Stage, StageResult } from './core/stage';
import { NO_INPUT, StageEvent } from './core/types';
import type { Input } from './input';
import { Fx } from './render/fx';
import { HeroView } from './render/hero';
import { WorldView } from './render/world';

export interface Banner {
  text: string;
  sub?: string;
  t: number;
  dur: number;
  big: boolean;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

const PATH_TEXT = ['The way is clear', 'A path rises from the water', 'The gate opens'];

/**
 * Runs a stage in real time: fixed-step simulation, camera, and turning
 * stage events into sound and particles. Menus live elsewhere.
 */
export class Game {
  stage: Stage | null = null;
  world: WorldView | null = null;
  hero = new HeroView();
  fx = new Fx();
  camX = 0;
  viewW = 960;
  time = 0;
  reduceMotion = false;
  paused = false;
  /** Attract mode: the demo that plays behind the title screen. */
  demo = false;
  banners: Banner[] = [];
  texts: FloatText[] = [];
  hurtFlash = 0;
  whiteFlash = 0;
  gateOpen = 0;
  private acc = 0;
  private timeScale = 1;
  private slowTimer = 0;
  private finishTimer = -1;
  private pickupChain = 0;
  private pickupClock = 0;
  private bot: Autopilot | null = null;
  private smokeClock = 0;
  onFinish: ((r: StageResult) => void) | null = null;
  /** Test-only fast-forward (set from ?speed= with ?debug). */
  speed = 1;

  constructor(
    private audio: AudioEngine,
    private input: Input,
  ) {}

  start(level: number, diff: DifficultyId, opts: { demo?: boolean; autoplay?: boolean } = {}): void {
    const def = STAGES[level];
    this.stage = new Stage(def, diff, (Date.now() & 0xffff) + 1);
    if (!this.world || this.world.def !== def) this.world = new WorldView(def);
    this.demo = !!opts.demo;
    this.bot = opts.demo || opts.autoplay ? new Autopilot(opts.demo ? 0.85 : 1) : null;
    this.hero.reset();
    this.fx.clear();
    this.banners = [];
    this.texts = [];
    this.acc = 0;
    this.timeScale = 1;
    this.finishTimer = -1;
    this.gateOpen = 0;
    this.paused = false;
    this.camX = Math.max(0, this.stage.player.x - this.viewW * 0.35);
    if (!this.demo) {
      this.audio.playMusic(def.theme);
      this.audio.setIntensity(0);
      this.banners.push({ text: def.name, sub: `${def.verse.text} — ${def.verse.ref}`, t: 0, dur: 4.2, big: true });
    }
  }

  get renderAlpha():number {return this.paused||this.stage?.hitstop?1:Math.max(0,Math.min(1,this.acc/DT));}

  get level(): number {
    return this.stage?.def.id ?? 0;
  }

  update(frameDt: number): void {
    const s = this.stage;
    if (!s) return;
    this.time += frameDt;
    if (this.paused) return;

    this.slowTimer = Math.max(0, this.slowTimer - frameDt);
    this.timeScale += ((this.slowTimer > 0 ? 0.3 : 1) - this.timeScale) * Math.min(1, frameDt * 12);
    this.acc += frameDt * this.timeScale * this.speed;
    if (!this.bot) this.input.pollGamepad();
    let steps = 0;
    const maxSteps = 5 * this.speed;
    while (this.acc >= DT && steps < maxSteps) {
      const inp = this.bot ? this.bot.decide(s) : this.input.consume();
      s.step(this.demo ? inp : inp);
      for (const e of s.takeEvents()) this.onEvent(e);
      this.acc -= DT;
      steps++;
    }
    if (steps === maxSteps) this.acc = 0;

    const dt = frameDt * this.timeScale;
    this.hero.update(s.player, dt);
    this.fx.update(dt);
    this.updateCamera(frameDt);
    this.ambientFx(dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - frameDt * 2.5);
    this.whiteFlash = Math.max(0, this.whiteFlash - frameDt * 2);
    this.pickupClock -= frameDt;
    if (this.pickupClock <= 0) this.pickupChain = 0;
    if (s.pathOpen) this.gateOpen = Math.min(1, this.gateOpen + frameDt * 0.5);
    for (const b of this.banners) b.t += frameDt;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    for (const t of this.texts) {
      t.t += frameDt;
      t.y -= 30 * frameDt;
    }
    this.texts = this.texts.filter((t) => t.t < 1.1);

    if (this.finishTimer >= 0) {
      this.finishTimer -= frameDt;
      if (this.finishTimer <= 0 && s.result) {
        this.finishTimer = -1;
        if (this.demo) this.start(0, 'gentle', { demo: true });
        else this.onFinish?.(s.result);
      }
    }
    // the demo restarts if it ever stalls
    if (this.demo && s.time > 240) this.start(0, 'gentle', { demo: true });
  }

  private updateCamera(dt: number): void {
    const s = this.stage!;
    const p = s.player;
    let minX = 0;
    let maxX = s.def.length;
    if (s.active) {
      minX = s.bounds.minX - 40;
      // leave room to see a guardian that lives beyond the wall (the serpent)
      maxX = s.bounds.maxX + (s.boss?.kind === 'serpent' ? 240 : 40);
    }
    let target = p.x - this.viewW / 2 + p.facing * Math.min(110, this.viewW * 0.1);
    // frame the hero and the guardian together
    const b = s.boss;
    if (b && b.alive) {
      const bx = b.kind === 'serpent' ? (b.head.x + b.homeX) / 2 : b.x;
      if (Math.abs(bx - p.x) < this.viewW * 1.1) target = (p.x + bx) / 2 - this.viewW / 2;
    }
    if (maxX - minX <= this.viewW) target = (minX + maxX) / 2 - this.viewW / 2;
    else target = Math.max(minX, Math.min(maxX - this.viewW, target));
    target = Math.max(0, Math.min(s.def.length - this.viewW, target));
    this.camX += (target - this.camX) * Math.min(1, dt * (s.active ? 4 : 5));
  }

  private ambientFx(dt: number): void {
    const s = this.stage!;
    this.smokeClock -= dt;
    if (this.smokeClock > 0) return;
    this.smokeClock = 0.08;
    for (const e of s.enemies) {
      if (!e.alive) continue;
      const b = e.hurtBox();
      this.fx.add('smoke', b.x + Math.random() * b.w, b.y + Math.random() * b.h * 0.6, {
        vy: -20 - Math.random() * 30, vx: (Math.random() - 0.5) * 20, life: 0.6, size: 3 + Math.random() * (e.boss ? 8 : 4), color: '#24123a', drag: 1,
      });
    }
    // light motes around the arena walls
    if (s.active) {
      for (const x of [s.bounds.minX, s.bounds.maxX]) {
        this.fx.add('wisp', x + (Math.random() - 0.5) * 10, 450, { vy: -80 - Math.random() * 60, life: 1.2, size: 2.5, color: '#ffe7a8', drag: 0.5 });
      }
    }
  }

  private say(_e: StageEvent): boolean {
    return !this.demo;
  }

  private onEvent(e: StageEvent): void {
    const fx = this.fx;
    const a = this.audio;
    const sound = this.say(e);
    const s = this.stage!;
    switch (e.type) {
      case 'dash':
        for(let i=0;i<9;i++)fx.add('ember',e.x-e.facing*i*5,e.y-22,{vx:-e.facing*100,vy:-30,life:.2+i*.015,size:2,color:'#ffb05f'});
        if(sound)a.play('swing',0);break;
      case 'swing':
        if (sound) a.play('swing', e.step);
        break;
      case 'hit':
        fx.sparks(e.x, e.y, e.heavy ? 18 : 10, '#ffe08a', e.heavy ? 520 : 380);
        fx.ring(e.x, e.y, e.heavy ? 50 : 30, '#fff3c4', 0.25);
        if (sound) a.play(e.heavy ? 'hitHeavy' : 'hit');
        break;
      case 'clang':
        fx.sparks(e.x, e.y, 10, '#d8e6ff', 360);
        if (sound) a.play('clang');
        break;
      case 'enemyDie':
        fx.dissolve(e.x, e.y, e.size * 40, e.size * 50, e.size * 26);
        if (sound) a.play('kill');
        break;
      case 'playerHurt':
        fx.sparks(e.x, e.y, 12, '#ff8b7a', 320);
        this.hurtFlash = 0.6;
        if (sound) a.play('hurt');
        break;
      case 'block':
        fx.sparks(e.x, e.y, 12, '#fff6d8', 380, s.player.facing > 0 ? 0 : Math.PI, 1.0);
        this.hero.shieldFlash = 0.6;
        if (sound) a.play('block');
        break;
      case 'parry':
        fx.sparks(e.x, e.y, 30, '#ffe08a', 600);
        fx.ring(e.x, e.y, 80, '#ffffff', 0.45);
        fx.add('flash', e.x, e.y, { life: 0.3, size: 120, color: '#fff7dc' });
        this.hero.shieldFlash = 1;
        this.slowTimer = 0.22;
        this.texts.push({ x: e.x, y: e.y - 40, text: 'PARRY!', color: '#ffe08a', t: 0 });
        if (sound) a.play('parry');
        break;
      case 'jump':
        fx.dust(e.x, e.y, 5, this.dustColor(), 20, 40);
        if (sound && Math.abs(e.x - s.player.x) < 2) a.play('jump');
        break;
      case 'land':
        fx.dust(e.x, e.y, e.hard ? 12 : 6, this.dustColor(), e.hard ? 50 : 25, e.hard ? 80 : 40);
        if (sound) a.play('land', e.hard ? 1 : 0);
        break;
      case 'telegraph':
        if (sound && Math.abs(e.x - (this.camX + this.viewW / 2)) < this.viewW) a.play(e.heavy ? 'warnRed' : 'warn');
        break;
      case 'shoot':
        if (sound) a.play('shoot');
        break;
      case 'shockwave':
        fx.ring(e.x, e.y, e.big ? 140 : 80, '#ff8a8a', 0.5);
        fx.dust(e.x, e.y, 16, this.dustColor(), 80, 90);
        if (sound) a.play('boom');
        break;
      case 'pickup':
        fx.sparks(e.x, e.y, 5, e.kind === 'heart' ? '#ff9db0' : '#ffe9a8', 160);
        if (sound) a.play(e.kind === 'heart' ? 'heal' : 'pickup', this.pickupChain++);
        this.pickupClock = 0.5;
        if (e.kind === 'heart') this.texts.push({ x: e.x, y: e.y - 20, text: '+1 ♥', color: '#ff9db0', t: 0 });
        break;
      case 'heal':
        for (let i = 0; i < 14; i++) fx.add('wisp', e.x + (Math.random() - 0.5) * 40, e.y + 20, { vy: -60 - Math.random() * 80, life: 1, size: 3, color: '#c8ffb0' });
        if (sound) a.play('heal');
        break;
      case 'encounterStart':
        if (!e.boss) {
          this.banners.push({ text: 'Shadows gather', t: 0, dur: 1.8, big: false });
          a.setIntensity(0.75);
        }
        break;
      case 'waveStart':
        if (e.index > 0) this.banners.push({ text: `Wave ${e.index + 1} of ${e.total}`, t: 0, dur: 1.5, big: false });
        if (sound) a.play('wave');
        break;
      case 'encounterClear':
        this.banners.push({ text: e.boss ? 'The shadow is gone' : 'The light holds', t: 0, dur: 2, big: false });
        a.setIntensity(0);
        break;
      case 'bossIntro':
        this.banners.push({ text: e.name, sub: e.title, t: 0, dur: 3, big: true });
        a.setIntensity(1, true);
        if (sound) a.play('roar');
        break;
      case 'bossPhase':
        this.banners.push({ text: 'The shadow grows fierce', t: 0, dur: 1.8, big: false });
        this.whiteFlash = 0.3;
        fx.ring(e.x, e.y, 160, '#c9a0ff', 0.6);
        if (sound) a.play('roar');
        break;
      case 'bossDefeated':
        this.slowTimer = 0.9;
        this.whiteFlash = 0.7;
        fx.ring(e.x, e.y, 220, '#ffffff', 0.9);
        if (sound) a.play('bossDown');
        break;
      case 'playerDeath':
        fx.dissolve(e.x, e.y, 30, 60, 40);
        this.banners.push({ text: 'Rise again', sub: 'Back to the last light', t: -0.4, dur: 1.9, big: false });
        if (sound) a.play('death');
        break;
      case 'respawn':
        fx.ring(e.x, e.y, 70, '#ffe7a8', 0.6);
        for (let i = 0; i < 20; i++) fx.add('wisp', e.x + (Math.random() - 0.5) * 30, e.y - Math.random() * 60, { vy: -40, life: 0.9, size: 3, color: '#fff1c4' });
        this.hero.reset();
        if (sound) a.play('respawn');
        break;
      case 'splash':
        fx.splash(e.x, 462);
        if (sound) a.play('splash');
        break;
      case 'spawn':
        for (let i = 0; i < 10; i++) fx.add('smoke', e.x + (Math.random() - 0.5) * 40, e.y - Math.random() * 20, { vy: -30 - Math.random() * 40, life: 0.9, size: 8 + Math.random() * 8, color: '#1e1030' });
        break;
      case 'stageClear':
        this.finishTimer = 2.6;
        this.banners.push({ text: 'Level complete', t: 0, dur: 2.6, big: true });
        if (sound) a.play('clear');
        break;
      case 'pathOpen':
        this.banners.push({ text: PATH_TEXT[s.def.id] ?? 'The way is clear', t: 1.2, dur: 3.4, big: false });
        if (sound) a.play('gate');
        break;
    }
  }

  private dustColor(): string {
    const t = this.stage?.def.theme;
    return t === 'desert' ? '#f3d3a0' : t === 'flood' ? '#a9b8a8' : '#d9c7a0';
  }

  /** Releases held buttons (e.g. on pause) so nothing sticks. */
  releaseInput(): void {
    this.input.releaseAll();
    void NO_INPUT;
  }
}
