import { ATTACKS, Enemy } from './enemy';
import type { Stage } from './stage';
import { InputFrame, NO_INPUT } from './types';

/**
 * A simple computer player. Used by the automated tests to prove every
 * level can be finished, and by ?autoplay for demos. It only sees the
 * same information a player sees on screen (positions and warnings).
 */
export class Autopilot {
  private jumpHold = 0;
  private attackGap = 0;
  private blockFor = 0;
  private blockTarget: { x: number } | null = null;
  private stuck = 0;
  private lastX = 0;
  private leavePlatform:number|null=null;
  /** 0..1: chance per decision to react to a warning. 1 = perfect. */
  constructor(private skill = 1, private rng: () => number = Math.random) {}

  decide(s: Stage): InputFrame {
    const inp: InputFrame = { ...NO_INPUT };
    const p = s.player;
    this.jumpHold = Math.max(0, this.jumpHold - 1 / 60);
    this.attackGap = Math.max(0, this.attackGap - 1 / 60);
    this.blockFor = Math.max(0, this.blockFor - 1 / 60);
    if (s.phase !== 'play' || p.state === 'dead') return inp;
    inp.jumpHeld = this.jumpHold > 0;

    const jump = () => {
      if (p.onGround && this.jumpHold <= 0) {
        inp.jumpPressed = true;
        inp.jumpHeld = true;
        this.jumpHold = 0.32;
      }
    };
    const face = (x: number) => {
      if (x > p.x + 2) inp.right = true;
      else if (x < p.x - 2) inp.left = true;
    };

    if(this.leavePlatform!==null){
      const stillOnPlatform=s.terrain.platforms.some(q=>p.x+15>=q.x0&&p.x-15<=q.x1&&p.y<=q.y+3);
      if(p.onGround&&!stillOnPlatform)this.leavePlatform=null;
      else{face(this.leavePlatform);return inp;}
    }
    if(p.wallGrace>0 && !p.onGround && p.vy>0){inp.jumpPressed=true;inp.jumpHeld=true;this.jumpHold=.3;return inp;}
    if(p.dashCooldown<=0&&p.onGround&&!s.active&&s.terrain.groundAt(p.x+250)!==null&&s.terrain.groundAt(p.x+250)===p.y)inp.dashPressed=true;
    // React to authored high ledges using the same extra jump available to the player.
    if(!p.onGround&&p.airJumpReady&&p.vy>0){
      const rise=s.terrain.groundAt(p.x+p.facing*75);
      if(rise!==null&&rise<p.y-20){inp.jumpPressed=true;inp.jumpHeld=true;this.jumpHold=.3;}
    }
    // ---------------------------------------------------- 1. red attacks
    for (const w of s.waves) {
      const toward = (p.x - w.x) * w.dir > 0;
      const d = Math.abs(p.x - w.x);
      if (toward && d < 120 && d > 20) {
        jump();
        inp.jumpHeld = true;
      }
    }
    for (const e of s.enemies) {
      if (!e.marker || !(e.state === 'windup' || e.state === 'active')) continue;
      const d = p.x - e.marker.x;
      if (Math.abs(d) < e.marker.r + 50) {
        let dir = Math.sign(d) || 1;
        if (p.x + dir * 120 > s.bounds.maxX - 20 || p.x + dir * 120 < s.bounds.minX + 20) dir = -dir;
        if (dir > 0) inp.right = true;
        else inp.left = true;
        return inp;
      }
    }
    // Warden slam / king wave: back off a little and wait for the shockwave
    for (const e of s.enemies) {
      const reach = e.attack?.box ? e.attack.box.dx + e.attack.box.w + 50 : 150;
      if (e.state === 'windup' && e.attack?.heavy && !e.marker && Math.abs(e.x - p.x) < reach) {
        face(p.x + Math.sign(p.x - e.x || 1) * 100);
        if(p.dashCooldown<=0)inp.dashPressed=true;
        return inp;
      }
    }

    // --------------------------------------------------- 2. block / parry
    if (this.blockFor > 0 && this.blockTarget) {
      inp.blockHeld = true;
      face(this.blockTarget.x);
      return inp;
    }
    const threat = this.findThreat(s);
    if (threat && this.rng() < this.skill + 0.0001) {
      inp.blockHeld = true;
      inp.blockPressed = !p.blocking;
      face(threat.x);
      this.blockTarget = { x: threat.x };
      this.blockFor = threat.hold;
      return inp;
    }

    // ------------------------------------------------------ 3. offense
    const target = this.pickTarget(s);
    if (target) {
      const c = target.kind === 'serpent' ? target.head : target.center();
      const tx = c.x;
      const dx = tx - p.x;
      const adx = Math.abs(dx);
      const high = c.y < p.y - 92;
      const guarded = target.guarding && (p.x - target.x) * target.facing > 0;
      const reach = 58 + target.w / 2;
      if(target.y>p.y+55&&p.onGround){
        const platform=s.terrain.platforms.find(q=>p.x>=q.x0&&p.x<=q.x1&&Math.abs(q.y-p.y)<2);
        if(platform){this.leavePlatform=platform.x1+70;face(this.leavePlatform);return inp;}
      }
      if(guarded&&Math.abs(target.y-p.y)>20){face(tx);this.handleTerrain(s,Math.sign(dx),jump);return inp;}
      if (guarded) {
        // wait just outside its reach for it to attack, then parry
        const want = target.x - Math.sign(target.x - p.x || 1) * 150;
        if (Math.abs(want - p.x) > 20) face(want);
        else face(target.x);
        if (Math.abs(want - p.x) <= 20) {
          inp.left = inp.right = false;
        }
        return inp;
      }
      if (adx < reach && !high) {
        if (Math.sign(dx) !== p.facing && Math.abs(dx) > 4) face(tx);
        if (this.attackGap <= 0 && !this.danger(s)) {
          inp.attackPressed = true;
          this.attackGap = 0.13;
        }
        return inp;
      }
      if (high && adx < 70) {
        jump();
        if (!p.onGround && p.vy > -500 && this.attackGap <= 0) {
          inp.attackPressed = true;
          this.attackGap = 0.25;
        }
        face(tx);
        return inp;
      }
      // approach, hopping over gaps
      face(tx);
      this.handleTerrain(s, Math.sign(dx), jump);
      return inp;
    }

    // ------------------------------------------------- 4. travel right
    if (s.active) {
      // between waves: wait near the middle of the arena
      const mid = (s.bounds.minX + s.bounds.maxX) / 2;
      if (Math.abs(mid - p.x) > 60) face(mid);
      return inp;
    }
    inp.right = true;
    this.handleTerrain(s, 1, jump);
    return inp;
  }

  private handleTerrain(s: Stage, dir: number, jump: () => void): void {
    const p = s.player;
    if (!p.onGround) return;
    const rise=s.terrain.groundAt(p.x+dir*105);
    const stepping=s.terrain.platforms.some(q=>p.x+dir*90>=q.x0&&p.x+dir*90<=q.x1&&q.y<p.y-14&&q.y>p.y-135);
    const distant=s.terrain.groundAt(p.x+dir*200);
    if((rise!==null&&rise<p.y-14)||(stepping&&(distant===null||distant<p.y-135)))jump();
    const ahead = s.terrain.surfaceBelow(p.x + dir * 18, p.y - 70);
    const far = s.terrain.surfaceBelow(p.x + dir * 70, p.y - 70);
    if (ahead === null || ahead < p.y - 10 || (far === null && ahead === null)) jump();
    // stuck against something: hop
    if (Math.abs(p.x - this.lastX) < 0.3 && dir !== 0) {
      this.stuck += 1 / 60;
      if (this.stuck > 0.25) {
        jump();
        this.stuck = 0;
      }
    } else this.stuck = 0;
    this.lastX = p.x;
  }

  /** Is some enemy about to strike? Then don't commit to a swing. */
  private danger(s: Stage): boolean {
    const p = s.player;
    for (const e of s.enemies) {
      if (!e.alive || e.state !== 'windup' || !e.attack || e.attack.heavy) continue;
      const remaining = e.windupTime(s) - e.t;
      const ox = e.kind === 'serpent' ? e.head.x : e.x;
      if (Math.abs(ox - p.x) < 420 && remaining < 0.34) return true;
    }
    return false;
  }

  private pickTarget(s: Stage): Enemy | null {
    const p = s.player;
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of s.enemies) {
      if (!e.alive || e.state === 'spawn') continue;
      const c = e.kind === 'serpent' ? e.head : e.center();
      let d = Math.abs(c.x - p.x) + Math.abs(c.y - (p.y - 40)) * 0.5;
      if (e.cfg.flying) d += 60; // prefer grounded threats
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** An attack about to land that we should block, and how long to hold. */
  private findThreat(s: Stage): { x: number; hold: number } | null {
    const p = s.player;
    for (const e of s.enemies) {
      if (!e.alive || !e.attack || e.attack.heavy || e.attack.damage <= 0) continue;
      if (e.state !== 'windup') continue;
      const remaining = e.windupTime(s) - e.t;
      const ox = e.kind === 'serpent' ? e.head.x : e.x;
      const d = Math.abs(ox - p.x);
      const id = e.attack.id;
      let range = e.attack.box ? e.attack.box.dx + e.attack.box.w + 60 : 170;
      if (id === 'wispDash') range = 300;
      if (id === 'lurkerLeap') range = 380;
      if (id === 'kingDash') range = 400;
      if (id === 'bite') range = 640;
      if (id === 'casterOrb' || id === 'spit') continue; // handled as orbs
      if (d > range) continue;
      if (remaining <= (p.attacking ? 0.15 : 0.06)) {
        const hold = (e.attack.active + (e.attack.next ? ATTACKS[e.attack.next].windup * s.diff.windup + 0.4 : 0)) + 0.12;
        return { x: ox, hold: Math.min(1.4, hold) };
      }
    }
    for (const o of s.orbs) {
      if (o.owner !== 'enemy') continue;
      const dx = p.x - o.x;
      if (Math.sign(dx) !== Math.sign(o.vx)) continue;
      const tt = Math.abs(dx) / Math.max(1, Math.abs(o.vx));
      const yAt = o.y + o.vy * tt;
      if (yAt < p.y - p.h - 14 || yAt > p.y + 10) continue;
      if (tt < 0.09) return { x: o.x, hold: 0.2 };
    }
    return null;
  }
}
