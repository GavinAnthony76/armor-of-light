import { ROMAN, WEAPONS, cleanJournal, type WeaponDrop, type WeaponJournal } from './weapons';
import { DIFFICULTIES, Difficulty, DifficultyId, DT, SCORE, VIEW_H } from './config';
import { Enemy, EnemyKind, KINDS, World } from './enemy';
import type { Encounter, StageDef } from './levels';
import { Player } from './player';
import { createRng } from './rng';
import { RangedCombat } from './ranged';
import { rewardForSource, rewardForSpawn } from './rewards';
import { Terrain } from './terrain';
import { InputFrame, NO_INPUT, overlaps, Rect, StageEvent } from './types';

export interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  owner: 'enemy' | 'player';
  life: number;
  dead: boolean;
  from: Enemy | null;
}

export interface Wave {
  x: number;
  y: number;
  dir: number;
  speed: number;
  left: number; // distance left to travel
  big: boolean;
  hit: boolean;
  dead: boolean;
  age: number;
}

export interface Pickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'mote' | 'heart';
  placed: boolean;
  t: number;
  taken: boolean;
}

export interface StageResult {
  stageId: number;
  difficulty: DifficultyId;
  score: number;
  time: number;
  deaths: number;
  hitsTaken: number;
  motes: number;
  lamps: number;
}

type Phase = 'play' | 'dead' | 'clear';

interface ActiveEncounter {
  index: number;
  def: Encounter;
  wave: number;
  delay: number;
  enemies: Enemy[];
  introDone: boolean;
}

/**
 * One playthrough of one level. Everything that matters for gameplay
 * happens here, one fixed 1/60 s step at a time. No DOM, no drawing.
 */
export class Stage implements World {
  readonly def: StageDef;
  readonly diff: Difficulty;
  terrain: Terrain;
  player: Player;
  enemies: Enemy[] = [];
  orbs: Orb[] = [];
  waves: Wave[] = [];
  pickups: Pickup[] = [];
  weaponDrops: WeaponDrop[] = [];
  issuedRewards = new Set<string>();
  equipmentRevision = 0;
  private exchangeSerial = 0;
  private nearbyLast: string | null = null;
  private interactWasHeld = false;
  private swapWasHeld = false;

  weaponJournal(): WeaponJournal {
    return JSON.parse(JSON.stringify({equipment:this.player.equipment,issued:[...this.issuedRewards],drops:this.weaponDrops,serial:this.exchangeSerial}));
  }
  restoreWeapons(raw:unknown):void {
    const j=cleanJournal(raw,this.def.id,this.def.length);
    this.player.equipment=j.equipment;this.issuedRewards=new Set(j.issued);this.weaponDrops=j.drops;this.exchangeSerial=j.serial;
    this.recoverWeaponDrops();this.nearbyLast=null;this.equipmentRevision++;
  }
  nearbyWeapon():WeaponDrop|null {
    const p=this.player;
    if(this.phase!=='play'||p.state==='dead')return null;
    return this.weaponDrops.filter(d=>d.settled&&Math.abs(d.x-p.x)<66&&Math.abs(d.y-p.y)<55)
      .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)||a.id.localeCompare(b.id))[0]??null;
  }
  private safeWeaponGround(x:number):{x:number;y:number} {
    const lo=this.bounds.minX+26,hi=this.bounds.maxX-26;
    let best:{x:number;y:number}|null=null,dist=Infinity;
    for(const g of this.terrain.ground){
      const a=Math.max(lo,g.x0+26),b=Math.min(hi,g.x1-26);
      if(a>b||g.y<90||g.y>500)continue;
      const gx=Math.max(a,Math.min(b,x)),distance=Math.abs(gx-x);
      if(distance<dist){dist=distance;best={x:gx,y:g.y};}
    }
    return best??{...this.checkpoint};
  }
  /** Called after a retry or Continue: keep an unclaimed opportunity inside the reachable arena. */
  private recoverWeaponDrops():void {
    for(const d of this.weaponDrops){const g=this.safeWeaponGround(d.x);d.x=g.x;d.y=g.y;d.vx=0;d.vy=0;d.bounce=1;d.settled=true;}
  }
  private updateWeapons(inp:InputFrame,dt:number):void {
    for(const d of this.weaponDrops){
      d.age+=dt;
      if(d.settled)continue;
      const g=this.safeWeaponGround(d.x);
      // Recover pits, cliffs and off-screen death locations onto nearby walkable ground.
      if(Math.abs(g.x-d.x)>1)d.x+=(g.x-d.x)*Math.min(1,dt*10);
      d.vy+=1000*dt;d.x+=d.vx*dt;d.vx*=Math.exp(-dt*7);d.y+=d.vy*dt;
      const surface=this.terrain.groundAt(d.x);
      if(surface!==null&&d.y>=surface&&d.vy>=0){
        d.y=surface;
        if(d.bounce===0){d.vy=-85;d.vx=0;d.bounce=1;}else{d.vy=0;d.settled=true;}
      }
      if(d.age>2&&!d.settled){d.x=g.x;d.y=g.y;d.vx=0;d.vy=0;d.settled=true;}
    }
    const near=this.nearbyWeapon(),p=this.player;
    const held=!!(inp.interactHeld||inp.interactPressed),swapHeld=!!(inp.swapHeld||inp.swapPressed);
    const safe=p.state==='move'&&p.onGround&&p.dashTime<=0;
    if(safe&&inp.swapPressed&&!this.swapWasHeld){
      if(p.equipment.alternate){p.equipment.equipped=p.equipment.equipped==='hammer'?'alternate':'hammer';this.equipmentRevision++;
        this.emit({type:'equipment',text:`Equipped ${WEAPONS[p.weaponId].name} ${ROMAN[p.weaponRank]}`});}
      else this.emit({type:'equipment',text:'Ember Hammer ready · find an alternate'});
    }
    // A fresh press must start AFTER the prompt became eligible. No held/buffered pickup.
    if(safe&&near&&near.id===this.nearbyLast&&inp.interactPressed&&!this.interactWasHeld)this.pickupWeapon(near);
    this.nearbyLast=near?.id??null;this.interactWasHeld=held;this.swapWasHeld=swapHeld;
  }
  private pickupWeapon(d:WeaponDrop):void {
    const eq=this.player.equipment,alt=eq.alternate;
    if(alt?.id===d.weapon&&alt.rank===3){this.emit({type:'equipment',text:`${WEAPONS[d.weapon].name} · maximum rank III`});return;}
    this.weaponDrops=this.weaponDrops.filter(x=>x!==d);
    let text='';
    if(alt?.id===d.weapon){
      alt.rank=d.copy?Math.min(3,alt.rank+1) as 1|2|3:Math.max(alt.rank,d.rank) as 1|2|3;
      text=`Forged to rank ${ROMAN[alt.rank]} · ${WEAPONS[d.weapon].name}`;
    }else{
      if(alt){
        const g=this.safeWeaponGround(this.player.x-42*this.player.facing);
        this.weaponDrops.push({id:`exchange${++this.exchangeSerial}`,weapon:alt.id,rank:alt.rank,copy:false,x:g.x,y:g.y-35,vx:0,vy:-100,age:0,bounce:0,settled:false});
      }
      eq.alternate={id:d.weapon,rank:d.rank};text=`Equipped ${WEAPONS[d.weapon].name} ${ROMAN[d.rank]} · hammer kept`;
    }
    eq.equipped='alternate';this.equipmentRevision++;
    this.emit({type:'equipment',text});
  }
  private rewardWeapon(e:Enemy):void {
    if(!e.rewardId||this.issuedRewards.has(e.rewardId))return;
    this.issuedRewards.add(e.rewardId);this.equipmentRevision++;
    const weapon=rewardForSource(this.def.id,e.rewardId);
    if(!weapon||this.player.equipment.alternate?.id===weapon&&this.player.equipment.alternate.rank===3)return;
    if(this.weaponDrops.filter(d=>d.copy).length>=3)return; // readable reward density; later encounters remain opportunities
    const c=e.center();
    this.weaponDrops.push({id:e.rewardId,weapon,rank:1,copy:true,x:c.x,y:c.y,vx:e.facing*-28,vy:-190,age:0,bounce:0,settled:false});
  }

  events: StageEvent[] = [];
  bounds: { minX: number; maxX: number };
  phase: Phase = 'play';
  phaseT = 0;
  time = 0;
  score = 0;
  motes = 0;
  deaths = 0;
  hitstop = 0;
  readonly ranged = new RangedCombat();
  comboHits=0;
  comboBest=0;
  comboTimer=0;
  finisherFlash=0;
  private finisherCooldown=0;
  private frozenInput:InputFrame={...NO_INPUT};
  prevPlayerX=0;
  prevPlayerY=0;
  shakeAmount = 0;
  rng: () => number;
  nextEncounter = 0;
  active: ActiveEncounter | null = null;
  boss: Enemy | null = null;
  bossCarryHp: number | null = null;
  pathOpen = false;
  result: StageResult | null = null;
  checkpoint: { x: number; y: number };
  kills = 0;
  /** Score when the current fight began; a retry rolls back to it. */
  private scoreAtCheckpoint = 0;
  private tokens = new Set<number>();

  constructor(def: StageDef, difficulty: DifficultyId, seed = 1) {
    this.def = def;
    this.diff = DIFFICULTIES[difficulty];
    this.rng = createRng(seed * 7919 + def.id);
    this.terrain = new Terrain(def.ground, def.platforms);
    const sy = this.terrain.groundAt(def.start) ?? 450;
    this.player = new Player(def.start, sy, this.diff.hearts);
    this.player.onGround = true;
    this.prevPlayerX=this.player.x;this.prevPlayerY=this.player.y;
    this.checkpoint = { x: def.start, y: sy };
    this.bounds = { minX: 0, maxX: def.length };
    for (const [x, y] of def.motes) {
      this.pickups.push({ x, y, vx: 0, vy: 0, kind: 'mote', placed: true, t: this.rng() * 6, taken: false });
    }
  }

  get totalMotes(): number {
    return this.def.motes.length;
  }

  // ---------------------------------------------------------- World API

  emit(e: StageEvent): void {
    this.events.push(e);
  }

  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  takeToken(e: Enemy): boolean {
    if (e.hasToken) return true;
    if (this.tokens.size >= this.diff.maxAttackers) return false;
    this.tokens.add(e.id);
    e.hasToken = true;
    return true;
  }

  releaseToken(e: Enemy): void {
    this.tokens.delete(e.id);
    e.hasToken = false;
  }

  spawnOrb(x: number, y: number, vx: number, vy: number, owner: Enemy): void {
    this.orbs.push({ x, y, vx, vy, r: 12, owner: 'enemy', life: 4, dead: false, from: owner });
  }

  spawnWave(x: number, y: number, dir: number, speed: number, range: number, big: boolean): void {
    this.waves.push({ x, y, dir, speed: speed * this.diff.enemySpeed, left: range, big, hit: false, dead: false, age: 0 });
  }

  spawnEnemy(kind: EnemyKind, x: number, y?: number): Enemy {
    const cfg = KINDS[kind];
    const gy = this.terrain.groundAt(x) ?? 450;
    const ey = y ?? (cfg.flying ? gy - 110 : gy);
    const e = new Enemy(kind, x, ey, this.diff);
    if (!cfg.flying && kind !== 'serpent') e.onGround = true;
    e.facing = this.player.x < x ? -1 : 1;
    this.enemies.push(e);
    if (this.active) this.active.enemies.push(e);
    this.emit({ type: 'spawn', x, y: ey, kind });
    return e;
  }

  hitPlayer(src: { x: number; enemy?: Enemy }, dmg: number, heavy: boolean): 'parry' | 'block' | 'hit' | 'miss' {
    const p = this.player;
    if (p.state === 'dead') return 'miss';
    const facingSrc = (src.x - p.x) * p.facing >= -6;
    if (!heavy && p.blocking && facingSrc) {
      const fx = p.x + p.facing * 20;
      const fy = p.y - 40;
      if (p.blockTime <= this.diff.parryWindow) {
        this.emit({ type: 'parry', x: fx, y: fy });
        if (src.enemy) src.enemy.stagger(this, src.enemy.boss ? (src.enemy.kind === 'serpent' ? 2.2 : 1.1) : 1.5);
        this.hitstop = Math.max(this.hitstop, 0.13);
        this.score += 25;
        return 'parry';
      }
      this.emit({ type: 'block', x: fx, y: fy });
      p.vx = -p.facing * 220;
      this.hitstop = Math.max(this.hitstop, 0.05);
      return 'block';
    }
    if (p.invuln > 0) return 'miss';
    const damage = heavy ? this.diff.heavyDamage : dmg;
    p.hp = Math.max(0, p.hp - damage);
    this.comboHits=0;this.comboTimer=0;
    p.hitsTaken++;
    p.invuln = this.diff.invuln;
    const dir = p.x >= src.x ? 1 : -1;
    p.lastHurtDir = dir;
    p.setState('hurt');
    p.vx = dir * 340;
    p.vy = -360;
    p.onGround = false;
    this.hitstop = Math.max(this.hitstop, 0.09);
    this.shake(7);
    this.emit({ type: 'playerHurt', x: p.x, y: p.y - 34, dmg: damage });
    if (p.hp <= 0) this.killPlayer();
    return 'hit';
  }

  // --------------------------------------------------------------- step

  step(inp: InputFrame): void {
    const dt = DT;
    this.prevPlayerX=this.player.x;this.prevPlayerY=this.player.y;
    for(const e of this.enemies){e.prevX=e.x;e.prevY=e.y;}

    this.shakeAmount = Math.max(0, this.shakeAmount - dt * 30);
    this.finisherCooldown=Math.max(0,this.finisherCooldown-dt);
    this.finisherFlash=Math.max(0,this.finisherFlash-dt);
    this.comboTimer=Math.max(0,this.comboTimer-dt);
    if(this.comboTimer===0)this.comboHits=0;
    if (this.hitstop > 0) {
      this.frozenInput={...NO_INPUT,
        attackPressed:inp.attackPressed||this.frozenInput.attackPressed,
        heavyPressed:inp.heavyPressed||this.frozenInput.heavyPressed,
        jumpPressed:inp.jumpPressed||this.frozenInput.jumpPressed,
        blockPressed:inp.blockPressed||this.frozenInput.blockPressed,
        dashPressed:inp.dashPressed||this.frozenInput.dashPressed};
      this.hitstop = Math.max(0, this.hitstop - dt);
      return;
    }
    inp={...inp,attackPressed:inp.attackPressed||this.frozenInput.attackPressed,
      heavyPressed:inp.heavyPressed||this.frozenInput.heavyPressed,
      jumpPressed:inp.jumpPressed||this.frozenInput.jumpPressed,
      blockPressed:inp.blockPressed||this.frozenInput.blockPressed,
      blockHeld:inp.blockHeld||this.frozenInput.blockPressed,
      dashPressed:inp.dashPressed||this.frozenInput.dashPressed};
    this.frozenInput={...NO_INPUT};
    if (this.phase === 'play') this.time += dt;
    this.phaseT += dt;
    const p = this.player;

    if (this.phase === 'dead') {
      p.control({ ...inp, left: false, right: false, jumpPressed: false, attackPressed: false }, dt);
      this.terrain.move(p, dt, this.bounds.minX, this.bounds.maxX);
      if (this.phaseT > 1.5) this.respawn();
      this.updateEffects(dt);
      return;
    }

    // ---- player
    const wasDashing=p.dashTime>0;
    const acts = p.control(this.phase === 'clear' ? { ...inp, left: false, right: true, attackPressed: false, blockHeld: false } : inp, dt);
    if(!wasDashing&&p.dashTime>0)this.emit({type:'dash',x:p.x,y:p.y,facing:p.facing});
    if (acts.jumped) this.emit({ type: 'jump', x: p.x, y: p.y });
    if (acts.swung) this.emit({ type: 'swing', x: p.x, y: p.y - 40, step: p.airSwing ? 3 : p.combo, facing: p.facing, air: p.airSwing });
    const mv = this.terrain.move(p, dt, this.bounds.minX, this.bounds.maxX);
    if(p.onGround&&p.dashTime<=0)p.stride+=Math.abs(p.x-this.prevPlayerX)*.045;
    const direction=(inp.right?1:0)-(inp.left?1:0);
    if(!p.onGround && mv.hitWall && direction && p.x>this.bounds.minX+22 && p.x<this.bounds.maxX-22){
      p.wallDir=direction;p.wallGrace=.10;
      if(p.vy>0&&p.state==='move')p.vy=Math.min(p.vy,135);
    }else if(p.onGround){p.wallDir=0;p.wallGrace=0;}
    if (mv.landed) this.emit({ type: 'land', x: p.x, y: p.y, hard: mv.impact > 900 });
    if (p.onGround) {
      const a = this.terrain.groundAt(p.x - 60);
      const b = this.terrain.groundAt(p.x + 60);
      if (a !== null && a === b && a === p.y) p.lastSafe = { x: p.x, y: p.y };
    }
    if (p.y > VIEW_H + 90) this.fellInPit();

    // ---- player attacks
    const box = p.swingBox();
    if (box) {
      if(p.weaponId==='sling'){
        if(!p.struck.has(-1)){p.struck.add(-1);this.ranged.fire(this);}
      }else this.resolveSwing(box);
    }
    this.ranged.update(this,dt);

    // ---- enemies
    for (const e of this.enemies){
      if(!e.boss && !this.active?.def.boss && p.x-e.x>1100){this.releaseToken(e);e.removed=true;continue;}
      e.update(this, dt);
    }
    this.enemies = this.enemies.filter((e) => {
      if (e.removed) {
        this.onEnemyRemoved(e);
        return false;
      }
      return true;
    });
    // dying enemies drop their rewards the moment they die
    for (const e of this.enemies) {
      if (e.state === 'dying' && !e.rewarded) {
        e.rewarded = true;
        this.onEnemyKilled(e);
      }
    }

    this.updateOrbs(dt);
    this.updateWaves(dt);
    this.updatePickups(dt);
    this.updateWeapons(inp,dt);
    this.updateEncounters(dt);

    // ---- end of stage
    if (this.phase === 'play' && !this.active && this.nextEncounter >= this.def.encounters.length && p.x >= this.def.exit) {
      this.finish();
    }
    if (this.phase === 'clear' && this.phaseT > 3) this.phase = 'clear';
  }

  private updateEffects(dt: number): void {
    this.updateOrbs(dt);
    this.updateWaves(dt);
  }

  private resolveSwing(box: Rect): void {
    const p = this.player;
    const s = p.swing;
    for (const e of this.enemies) {
      if (!e.alive || p.struck.has(e.id)) continue;
      if (!overlaps(box, e.hurtBox())) continue;
      p.struck.add(e.id);
      const r = e.takeHit(this, s.damage, p.facing, s.knock);
      const c = e.center();
      const hx = (Math.max(box.x, c.x - e.w / 2) + Math.min(box.x + box.w, c.x + e.w / 2)) / 2;
      if (r === 'guarded') {
        if(p.heavySwing)e.stagger(this,.65);
        this.emit({ type: 'clang', x: hx, y: c.y });
        p.vx = -p.facing * 200;
        this.hitstop = Math.max(this.hitstop, 0.06);
      } else if (r === 'hit' || r === 'killed') {
        const heavy = s.damage > 1 || r === 'killed';
        this.recordCombatHit(r,hx,c.y,s.damage,e.boss,p.heavySwing||p.combo===2);
        this.hitstop = Math.max(this.hitstop, heavy ? 0.07 : 0.04);
        if (heavy) this.shake(5);
      }
    }
    // swords cut shadow orbs out of the air
    for (const o of this.orbs) {
      if (o.dead || o.owner !== 'enemy') continue;
      if (overlaps(box, { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 })) {
        o.dead = true;
        this.emit({ type: 'clang', x: o.x, y: o.y });
      }
    }
  }

  recordCombatHit(result:'hit'|'killed',x:number,y:number,damage:number,boss:boolean,finishing:boolean):void {
    this.comboHits++;this.comboTimer=2.4;this.comboBest=Math.max(this.comboBest,this.comboHits);
    this.score+=10;
    this.emit({type:'hit',x,y,heavy:damage>1||result==='killed',boss});
    if(result==='killed'&&finishing&&!boss&&this.finisherCooldown<=0){
      this.finisherCooldown=3;this.finisherFlash=.4;
      this.emit({type:'finisher',x,y});
    }
  }

  private onEnemyKilled(e: Enemy): void {
    const c = e.center();
    this.rewardWeapon(e);
    this.kills++;
    this.score += e.cfg.score;
    this.emit({ type: 'enemyDie', x: c.x, y: c.y, kind: e.kind, size: e.boss ? 3 : 1 });
    for (let i = 0; i < e.cfg.motes; i++) {
      const a = -Math.PI / 2 + (this.rng() - 0.5) * 2.2;
      const sp = 160 + this.rng() * 220;
      this.pickups.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, kind: 'mote', placed: false, t: 0, taken: false });
    }
    const p = this.player;
    const heartChance = this.diff.id === 'gentle' ? 0.3 : 0.12;
    if (!e.boss && p.hp < p.maxHp && this.rng() < heartChance) {
      this.pickups.push({ x: c.x, y: c.y, vx: 0, vy: -300, kind: 'heart', placed: false, t: 0, taken: false });
    }
    if (e.boss) {
      this.emit({ type: 'bossDefeated', x: c.x, y: c.y });
      this.shake(12);
      this.hitstop = 0.25;
      // the boss's shadows fade with it
      for (const o of this.enemies) if (o !== e && o.alive) o.takeHit(this, 999, 1, 0);
    }
  }

  private onEnemyRemoved(_e: Enemy): void {}

  private updateOrbs(dt: number): void {
    const p = this.player;
    for (const o of this.orbs) {
      if (o.dead) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < this.bounds.minX - 40 || o.x > this.bounds.maxX + 40 || o.y > 560) o.dead = true;
      const g = this.terrain.groundAt(o.x);
      if (g !== null && o.y > g) o.dead = true;
      if (o.dead) continue;
      const ob: Rect = { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
      if (o.owner === 'enemy') {
        if (overlaps(ob, p.hurtBox())) {
          const r = this.hitPlayer({ x: o.x - Math.sign(o.vx) * 10 }, 1, false);
          if (r === 'parry') {
            // reflected back as light
            o.owner = 'player';
            const target = o.from && o.from.alive ? o.from.center() : null;
            if (target) {
              const dx = target.x - o.x;
              const dy = target.y - o.y;
              const d = Math.hypot(dx, dy) || 1;
              o.vx = (dx / d) * 560;
              o.vy = (dy / d) * 560;
            } else {
              o.vx = -o.vx * 1.4;
              o.vy = -o.vy;
            }
            o.life = 3;
          } else if (r !== 'miss') o.dead = true;
        }
      } else {
        for (const e of this.enemies) {
          if (!e.alive || !overlaps(ob, e.hurtBox())) continue;
          const r = e.takeHit(this, 2, Math.sign(o.vx) || 1, 200);
          const c = e.center();
          if (r === 'guarded') this.emit({ type: 'clang', x: o.x, y: o.y });
          else if (r !== 'ignored') {
            this.emit({ type: 'hit', x: o.x, y: o.y, heavy: true, boss: e.boss });
            if (e.alive && !e.boss) e.stagger(this, 0.8);
            this.score += 40;
          }
          void c;
          o.dead = true;
          break;
        }
      }
    }
    this.orbs = this.orbs.filter((o) => !o.dead);
  }

  private updateWaves(dt: number): void {
    const p = this.player;
    for (const w of this.waves) {
      w.age += dt;
      const step = w.speed * dt;
      w.x += w.dir * step;
      w.left -= step;
      const g = this.terrain.groundAt(w.x);
      if (w.left <= 0 || g === null || Math.abs(g - w.y) > 4 || w.x < this.bounds.minX || w.x > this.bounds.maxX) {
        w.dead = true;
        continue;
      }
      const h = w.big ? 46 : 30;
      const box: Rect = { x: w.x - 22, y: w.y - h, w: 44, h };
      if (!w.hit && overlaps(box, p.hurtBox())) {
        const r = this.hitPlayer({ x: w.x - w.dir * 30 }, 1, true);
        if (r === 'hit') w.hit = true;
      }
    }
    this.waves = this.waves.filter((w) => !w.dead);
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    const px = p.x;
    const py = p.y - 32;
    for (const k of this.pickups) {
      if (k.taken) continue;
      k.t += dt;
      const dx = px - k.x;
      const dy = py - k.y;
      const d = Math.hypot(dx, dy);
      if (!k.placed && k.t < 0.35) {
        k.vy += 900 * dt;
        k.vx *= Math.pow(0.2, dt);
        k.vy *= Math.pow(0.4, dt);
      } else if (d < 170 && p.state !== 'dead') {
        const s = 700;
        k.vx += ((dx / (d || 1)) * s - k.vx) * Math.min(1, dt * 8);
        k.vy += ((dy / (d || 1)) * s - k.vy) * Math.min(1, dt * 8);
      } else {
        k.vx *= Math.pow(0.05, dt);
        k.vy *= Math.pow(0.05, dt);
        if (!k.placed) {
          // drift down to hover above the ground
          const g = this.terrain.surfaceBelow(k.x, k.y - 10) ?? 450;
          k.vy += ((g - 40 - k.y) * 2 - k.vy) * Math.min(1, dt * 3);
        }
      }
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      if (d < 30) {
        k.taken = true;
        if (k.kind === 'mote') {
          this.motes += k.placed ? 1 : 0;
          this.score += SCORE.mote;
        } else {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          this.emit({ type: 'heal', x: p.x, y: p.y - 40 });
        }
        this.emit({ type: 'pickup', x: k.x, y: k.y, kind: k.kind });
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken || k.placed);
  }

  private updateEncounters(dt: number): void {
    const p = this.player;
    if (!this.active) {
      const enc = this.def.encounters[this.nextEncounter];
      if (enc && p.x >= enc.trigger && this.phase === 'play') this.startEncounter(this.nextEncounter);
      return;
    }
    const a = this.active;
    if(a.def.openRoad && p.x>a.def.arena[1]+90){
      // Passing a skirmish advances the road, but grants no kill or clear bonus.
      this.nextEncounter=a.index+1;this.active=null;this.bounds={minX:0,maxX:this.def.length};return;
    }
    a.enemies = a.enemies.filter((e) => !e.removed);
    if (a.delay > 0) {
      a.delay -= dt;
      if (a.delay <= 0) this.spawnWave_(a);
      return;
    }
    const living = a.enemies.filter((e) => e.alive);
    if (living.length === 0 && a.enemies.length === 0) {
      if (a.wave + 1 < a.def.waves.length) {
        a.wave++;
        a.delay = 1.0;
      } else {
        this.clearEncounter();
      }
    }
  }

  private startEncounter(index: number): void {
    const def = this.def.encounters[index];
    this.active = { index, def, wave: 0, delay: def.boss ? 2.2 : 0.6, enemies: [], introDone: false };
    this.bounds = def.openRoad ? {minX:0,maxX:this.def.length} : { minX: def.arena[0], maxX: def.arena[1] };
    const cx = Math.max(def.arena[0] + 90, Math.min(def.arena[1] - 90, def.checkpoint ?? def.arena[0] + 110));
    this.checkpoint = { x: cx, y: this.terrain.groundAt(cx) ?? 450 };
    this.scoreAtCheckpoint = this.score;
    this.recoverWeaponDrops();
    this.emit({ type: 'encounterStart', boss: !!def.boss });
    if (def.boss) {
      const k = KINDS[def.waves[0][0].kind];
      this.emit({ type: 'bossIntro', name: k.name ?? '', title: k.title ?? '' });
    }
  }

  private spawnWave_(a: ActiveEncounter): void {
    const wave = a.def.waves[a.wave];
    if (a.wave > 0 || !a.def.boss) this.emit({ type: 'waveStart', index: a.wave, total: a.def.waves.length });
    for (const [spawnIndex,s] of wave.entries()) {
      const e = this.spawnEnemy(s.kind, s.x, s.y);
      e.wave = a.wave;
      if(rewardForSpawn(this.def.id,a.index,a.wave,spawnIndex)) e.rewardId=`e${a.index}w${a.wave}s${spawnIndex}`;
      e.cooldown = 0.8 + (s.delay ?? 0) + this.rng() * 0.6;
      if (e.boss) {
        this.boss = e;
        e.cooldown = 1.2;
        if (this.bossCarryHp !== null) {
          e.hp = this.bossCarryHp;
          if (e.hp <= e.maxHp / 2) e.phase = 2;
        }
      }
    }
  }

  private clearEncounter(): void {
    const a = this.active!;
    const p = this.player;
    this.active = null;
    this.nextEncounter = a.index + 1;
    this.bounds = { minX: 0, maxX: this.def.length };
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + this.diff.healOnClear);
    if (p.hp > before) this.emit({ type: 'heal', x: p.x, y: p.y - 40 });
    this.emit({ type: 'encounterClear', boss: !!a.def.boss });
    if (a.def.boss) {
      this.boss = null;
      this.bossCarryHp = null;
      for (const g of this.def.afterBoss ?? []) this.terrain.addGround(g[0], g[1], g[2]);
      this.pathOpen = true;
      this.emit({ type: 'pathOpen', x: a.def.arena[1] });
    }
  }

  private fellInPit(): void {
    const p = this.player;
    p.clearActionBuffers();p.dashTime=0;
    this.comboHits=0;this.comboTimer=0;
    this.emit({ type: 'splash', x: p.x, y: 450 });
    p.hp = Math.max(0, p.hp - 1);
    p.hitsTaken++;
    this.emit({ type: 'playerHurt', x: p.x, y: 430, dmg: 1 });
    if (p.hp <= 0) {
      this.killPlayer();
      return;
    }
    p.x = p.lastSafe.x;
    p.y = p.lastSafe.y;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.4;
    p.setState('move');
    this.emit({ type: 'respawn', x: p.x, y: p.y });
  }

  private killPlayer(): void {
    const p = this.player;
    p.clearActionBuffers();this.frozenInput={...NO_INPUT};
    p.setState('dead');
    this.phase = 'dead';
    this.phaseT = 0;
    this.deaths++;
    this.emit({ type: 'playerDeath', x: p.x, y: p.y - 30 });
  }

  /** Instant retry from the last checkpoint with full hearts. */
  respawn(): void {
    const p = this.player;
    p.clearActionBuffers();p.heavySwing=false;this.frozenInput={...NO_INPUT};
    this.ranged.clear();this.comboHits=0;this.comboTimer=0;this.finisherFlash=0;
    p.airJumpReady=true;p.airJumpFlash=0;p.dashTime=0;p.dashCooldown=0;p.wallDir=0;p.wallGrace=0;p.wallLock=0;p.queuedEarly=false;p.airAttackReady=true;
    const a = this.active;
    if (a) {
      if (this.boss && this.diff.bossKeepsDamage && this.boss.hp > 0) this.bossCarryHp = this.boss.hp;
      for (const e of a.enemies) {
        this.releaseToken(e);
        e.removed = true;
      }
      this.enemies = this.enemies.filter((e) => !e.removed);
      a.enemies = [];
      a.wave = 0;
      a.delay = a.def.boss ? 1.4 : 0.9;
      this.boss = null;
      this.score = this.scoreAtCheckpoint;
    }
    this.tokens.clear();
    for (const e of this.enemies) e.hasToken = false;
    this.orbs = [];
    this.waves = [];
    p.x = this.checkpoint.x;
    p.y = this.checkpoint.y;
    p.vx = 0;
    p.vy = 0;
    p.hp = p.maxHp;
    p.invuln = 1.6;
    p.facing = 1;
    p.setState('move');
    this.phase = 'play';
    this.phaseT = 0;
    this.recoverWeaponDrops();this.nearbyLast=null;this.interactWasHeld=true;this.equipmentRevision++;
    this.emit({ type: 'respawn', x: p.x, y: p.y });
  }

  private finish(): void {
    this.phase = 'clear';
    this.phaseT = 0;
    const timeBonus = Math.max(0, Math.round((this.def.par - this.time) * SCORE.timeBonusPerSec));
    this.score += SCORE.clearBonus + timeBonus + (this.deaths === 0 ? SCORE.noDeathBonus : 0);
    const hits = this.player.hitsTaken;
    const lamps = this.deaths === 0 && hits <= 3 ? 3 : this.deaths <= 1 ? 2 : 1;
    this.result = {
      stageId: this.def.id,
      difficulty: this.diff.id,
      score: this.score,
      time: this.time,
      deaths: this.deaths,
      hitsTaken: hits,
      motes: this.motes,
      lamps,
    };
    this.emit({ type: 'stageClear' });
  }

  /** Drains the event queue for the presentation layer. */
  takeEvents(): StageEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get arenaLocked(): boolean {
    return !!this.active;
  }
}
