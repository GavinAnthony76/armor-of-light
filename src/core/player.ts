import { freshEquipment, WEAPONS, type Equipment, type WeaponId, type Rank } from './weapons';
import { PLAYER } from './config';
import type { Body } from './terrain';
import type { InputFrame, Rect } from './types';

export type PlayerState = 'move' | 'attack' | 'block' | 'hurt' | 'dead';

interface SwingDef {
  dur: number;
  hitFrom: number;
  hitTo: number;
  box: { dx: number; dy: number; w: number; h: number };
  damage: number;
  knock: number;
  lunge: number;
  chainFrom: number; // earliest time the next press is accepted
}

/** Three-hit ground combo, plus one air slash. */
export const SWINGS: SwingDef[] = [
  { dur: 0.27, hitFrom: 0.06, hitTo: 0.15, box: { dx: 4, dy: -78, w: 76, h: 70 }, damage: 1, knock: 160, lunge: 90, chainFrom: 0.1 },
  { dur: 0.27, hitFrom: 0.06, hitTo: 0.15, box: { dx: 4, dy: -74, w: 78, h: 66 }, damage: 1, knock: 160, lunge: 90, chainFrom: 0.1 },
  { dur: 0.41, hitFrom: 0.1, hitTo: 0.2, box: { dx: 0, dy: -90, w: 92, h: 88 }, damage: 2, knock: 380, lunge: 160, chainFrom: 99 },
];
export const AIR_SWING: SwingDef = {
  dur: 0.30, hitFrom: 0.04, hitTo: 0.2, box: { dx: -14, dy: -86, w: 100, h: 96 }, damage: 1, knock: 200, lunge: 0, chainFrom: 99,
};
export const HEAVY_SWING: SwingDef = {
  dur: .46, hitFrom: .12, hitTo: .24,
  box: { dx: -8, dy: -94, w: 110, h: 98 },
  damage: 2.4, knock: 440, lunge: 145, chainFrom: 99,
};

export class Player implements Body {
  equipment: Equipment = freshEquipment();
  get weaponId(): WeaponId { return this.equipment.equipped==='alternate'&&this.equipment.alternate?this.equipment.alternate.id:'hammer'; }
  get weaponRank(): Rank { return this.weaponId==='hammer'?1:this.equipment.alternate?.rank??1; }
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  w = PLAYER.w;
  h = PLAYER.h;
  onGround = false;
  facing = 1;
  hp: number;
  maxHp: number;
  state: PlayerState = 'move';
  t = 0; // time in state
  combo = 0; // index into SWINGS for current swing
  airSwing = false;
  queued = false;
  heavySwing = false;
  queuedHeavy = false;
  attackBuffer = 0;
  heavyBuffer = 0;
  dashBuffer = 0;
  /** Enemies already struck by the current swing. */
  struck = new Set<number>();
  invuln = 0;
  coyote = 0;
  jumpBuffer = 0;
  jumpCut = false;
  dashTime=0;
  dashCooldown=0;
  wallDir=0;
  wallGrace=0;
  wallLock=0;
  airAttackReady=true;
  airJumpReady=true;
  airJumpFlash=0;
  queuedEarly=false;
  blockTime = 0;
  airTime = 0;
  stride=0;
  runTime = 0; // for animation
  lastSafe = { x: 0, y: 0 };
  hitsTaken = 0;
  /** Set by the stage when the player is close to a gap edge. */
  lastHurtDir = 1;

  constructor(x: number, y: number, hearts: number) {
    this.x = x;
    this.y = y;
    this.hp = hearts;
    this.maxHp = hearts;
    this.lastSafe = { x, y };
  }

  get swing(): SwingDef {
    const raw = this.heavySwing ? HEAVY_SWING : this.airSwing ? AIR_SWING : SWINGS[this.combo];
    const base = this.heavySwing && this.combo===2 ? {...raw,damage:raw.damage*1.25,knock:520} : raw;
    if(this.weaponId==='hammer') return base;
    const w=WEAPONS[this.weaponId], rank=this.weaponRank;
    // Defensive cancel always opens no later than the signature hammer's window.
    return {...base,dur:base.dur*w.tempo,hitFrom:base.hitFrom*Math.min(1,w.tempo),hitTo:base.hitTo*Math.min(1,w.tempo),chainFrom:base.chainFrom*w.tempo,
      damage:base.damage*w.damage*(1+(rank-1)*.09),knock:base.knock*w.knock,
      box:{...base.box,w:base.box.w*w.reach,h:this.weaponId==='tide'?38:base.box.h,dy:this.weaponId==='tide'?-65:base.box.dy}};
  }

  get blocking(): boolean {
    return this.state === 'block';
  }

  get attacking(): boolean {
    return this.state === 'attack';
  }

  /** Hitbox of the current swing, if it's in its active frames. */
  swingBox(): Rect | null {
    if (this.state !== 'attack') return null;
    const s = this.swing;
    if (this.t < s.hitFrom || this.t > s.hitTo) return null;
    const x = this.facing > 0 ? this.x + s.box.dx : this.x - s.box.dx - s.box.w;
    return { x, y: this.y + s.box.dy, w: s.box.w, h: s.box.h };
  }

  hurtBox(): Rect {
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  setState(s: PlayerState): void {
    this.state = s;
    this.t = 0;
  }

  clearActionBuffers(): void {
    this.attackBuffer=0;this.heavyBuffer=0;this.dashBuffer=0;this.jumpBuffer=0;
    this.queued=false;this.queuedEarly=false;this.queuedHeavy=false;
  }

  /** Movement and actions for one step. Returns notable actions for events. */
  control(inp: InputFrame, dt: number): { jumped: boolean; swung: boolean } {
    let jumped = false;
    let swung = false;
    this.t += dt;
    this.airJumpFlash=Math.max(0,this.airJumpFlash-dt);
    if(this.onGround)this.airJumpReady=true;
    this.invuln = Math.max(0, this.invuln - dt);
    this.coyote = this.onGround ? PLAYER.coyote : Math.max(0, this.coyote - dt);
    this.jumpBuffer = inp.jumpPressed ? PLAYER.jumpBuffer : Math.max(0, this.jumpBuffer - dt);
    this.attackBuffer=inp.attackPressed ? .14 : Math.max(0,this.attackBuffer-dt);
    this.heavyBuffer=inp.heavyPressed ? .14 : Math.max(0,this.heavyBuffer-dt);
    this.dashBuffer=inp.dashPressed ? .12 : Math.max(0,this.dashBuffer-dt);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    this.wallLock=Math.max(0,this.wallLock-dt);
    this.wallGrace=Math.max(0,this.wallGrace-dt);
    if(this.onGround)this.airAttackReady=true;
    this.airTime = this.onGround ? 0 : this.airTime + dt;

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    if (this.state === 'dead') {
      this.clearActionBuffers();
      this.vx *= 0.9;
      return { jumped, swung };
    }

    if (this.state === 'hurt') {
      this.vx *= Math.pow(0.02, dt);
      if (this.t <= 0.32) return { jumped, swung };
      this.setState('move');
    }

    if(this.dashBuffer>0 && this.dashCooldown<=0 && (!this.attacking||this.t>this.swing.hitTo)){
      this.setState('move');this.dashTime=.14;this.dashCooldown=.65;this.invuln=Math.max(this.invuln,.12);
      this.facing=dir||this.facing;this.queued=false;this.queuedEarly=false;this.queuedHeavy=false;this.dashBuffer=0;
    }
    if(this.dashTime>0){this.dashTime=Math.max(0,this.dashTime-dt);this.vx=this.facing*620;this.vy*=.75;return {jumped,swung};}
    // Jump and block can cancel recovery, after the attack has dealt its damage.
    if(this.attacking && this.jumpBuffer>0 && (this.onGround||this.airJumpReady) && this.t>this.swing.hitTo)this.setState('move');
    // blocking cancels the tail end of a swing, so defense always feels responsive
    if (this.state === 'attack' && inp.blockHeld && this.onGround && this.t > this.swing.hitTo) {
      this.setState('move');
    }

    // ---- block (hold)
    if (this.state !== 'attack' && inp.blockHeld && this.onGround) {
      if (this.state !== 'block') {
        this.setState('block');
        this.blockTime = 0;
      }
      if (inp.blockPressed) this.blockTime = 0; // re-tapping restarts the parry window
      this.blockTime += dt;
      if (dir !== 0) this.facing = dir;
      this.vx += (0 - this.vx) * Math.min(1, dt * 18);
      if (this.jumpBuffer > 0) {
        // jumping out of a block is allowed
        this.setState('move');
      } else {
        return { jumped, swung };
      }
    } else if (this.state === 'block') {
      this.setState('move');
    }

    // ---- attack
    if (this.attackBuffer>0 || this.heavyBuffer>0) {
      if (this.state === 'attack') {
        if (!this.airSwing && !this.heavySwing && this.combo < SWINGS.length - 1) {
          this.queuedHeavy=this.heavyBuffer>0;
          if(this.t>=this.swing.chainFrom)this.queued=true;else this.queuedEarly=true;
          this.attackBuffer=0;this.heavyBuffer=0;
        }
      } else {
        this.startSwing(dir, !this.onGround, 0, this.heavyBuffer>0);
        if(!this.onGround)this.airAttackReady=false;
        swung = true;
      }
    }

    if (this.state === 'attack') {
      const s = this.swing;
      if(this.queuedEarly&&this.t>=s.chainFrom){this.queued=true;this.queuedEarly=false;}
      if (!this.airSwing) {
        // ground swings lunge forward a little then settle
        const lunge = this.t < s.hitTo ? s.lunge : 0;
        this.vx += (this.facing * lunge - this.vx) * Math.min(1, dt * 14);
      } else {
        this.vx += (dir * PLAYER.speed - this.vx) * Math.min(1, dt * 10);
      }
      const chainReady=this.queued&&!this.airSwing&&this.t>=s.hitTo+.04;
      if (this.t >= s.dur || chainReady || (this.airSwing && this.onGround && this.t > s.hitTo)) {
        if (this.queued && !this.airSwing) {
          this.startSwing(dir, false, this.queuedHeavy?2:this.combo + 1,this.queuedHeavy);
          swung = true;
        } else {
          this.setState('move');
          if(this.attackBuffer>0||this.heavyBuffer>0){
            this.startSwing(dir,!this.onGround,0,this.heavyBuffer>0);swung=true;
          }
        }
      }
      if (this.state === 'attack') return { jumped, swung };
    }

    // ---- move
    const target = dir * PLAYER.speed;
    const a = this.onGround ? (dir !== 0 ? PLAYER.accel : PLAYER.decel) : PLAYER.airAccel;
    if(this.wallLock<=0){
    if (this.vx < target) this.vx = Math.min(target, this.vx + a * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - a * dt);
    }
    if (dir !== 0 && this.wallLock<=0) this.facing = dir;
    this.runTime = this.onGround && dir !== 0 ? this.runTime + dt : 0;

    if(this.jumpBuffer>0 && !this.onGround && this.wallGrace>0 && this.wallDir!==0){
      this.vx=-this.wallDir*340;this.vy=-PLAYER.jumpV*.9;this.facing=-this.wallDir;this.wallLock=.15;this.wallGrace=0;this.wallDir=0;this.jumpBuffer=0;this.jumpCut=false;this.airAttackReady=true;jumped=true;
    }
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -PLAYER.jumpV;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumpCut = false;
      jumped = true;
    }
    // A deliberate second press spends one aerial jump. Holding jump cannot retrigger it.
    if(!jumped && inp.jumpPressed && !this.onGround && this.coyote<=0 && this.airJumpReady){
      this.vy=-PLAYER.jumpV*.92;this.airJumpReady=false;this.airJumpFlash=.24;
      this.jumpBuffer=0;this.jumpCut=false;jumped=true;
    }
    // releasing jump early gives a shorter hop
    if (!inp.jumpHeld && this.vy < -260 && !this.jumpCut) {
      this.vy *= 0.5;
      this.jumpCut = true;
    }
    return { jumped, swung };
  }

  private startSwing(dir: number, air: boolean, combo: number, heavy=false): void {
    if (dir !== 0) this.facing = dir;
    this.setState('attack');
    this.combo = air ? 0 : combo;
    this.heavySwing=heavy;this.queuedHeavy=false;this.attackBuffer=0;this.heavyBuffer=0;
    this.airSwing = air;
    this.queued = false;
    this.queuedEarly=false;
    this.struck.clear();
  }
}
