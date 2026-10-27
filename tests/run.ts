/**
 * Headless test suite. Run with `npm test`.
 *  1. Rule checks (physics, combat, checkpoints, level data)
 *  2. A bot plays every level on both difficulties and must finish each one.
 */
import { Autopilot } from '../src/core/autopilot';
import { DIFFICULTIES, DifficultyId, PLAYER } from '../src/core/config';
import { Enemy } from '../src/core/enemy';
import { STAGES } from '../src/core/levels';
import { createRng } from '../src/core/rng';
import { Stage } from '../src/core/stage';
import { Terrain } from '../src/core/terrain';
import { InputFrame, NO_INPUT } from '../src/core/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  }
}
const steps = (s: Stage, n: number, inp: Partial<InputFrame> = {}) => {
  for (let i = 0; i < n; i++) s.step({ ...NO_INPUT, ...inp });
};

// ------------------------------------------------------------ rules
{
  const t = new Terrain([[0, 500, 450], [500, 700, 400]], [[100, 200, 350]]);
  const b = { x: 50, y: 300, vx: 0, vy: 0, w: 30, h: 64, onGround: false };
  for (let i = 0; i < 120; i++) t.move(b, 1 / 60, 0, 1000);
  check('body lands on ground', b.onGround && Math.abs(b.y - 450) < 0.01, `y=${b.y}`);
  b.vx = 300;
  for (let i = 0; i < 120; i++) t.move(b, 1 / 60, 0, 1000);
  check('raised block acts as a wall', b.x <= 500 - 15 + 0.01, `x=${b.x}`);
  const c = { x: 150, y: 300, vx: 0, vy: 0, w: 30, h: 64, onGround: false };
  for (let i = 0; i < 120; i++) t.move(c, 1 / 60, 0, 1000);
  check('one-way platform holds a falling body', Math.abs(c.y - 350) < 0.01, `y=${c.y}`);
  const up = { x: 150, y: 450, vx: 0, vy: -900, w: 30, h: 64, onGround: false };
  t.move(up, 1 / 60, 0, 1000);
  for (let i = 0; i < 10; i++) t.move(up, 1 / 60, 0, 1000);
  check('jumping up passes through platform', up.y < 350, `y=${up.y}`);
}

{
  const s = new Stage(STAGES[0], 'gentle');
  steps(s, 30);
  const y0 = s.player.y;
  let minY = y0;
  s.step({ ...NO_INPUT, jumpPressed: true, jumpHeld: true });
  for (let i = 0; i < 60; i++) {
    s.step({ ...NO_INPUT, jumpHeld: true });
    minY = Math.min(minY, s.player.y);
  }
  const h = y0 - minY;
  check('full jump reaches 120–160 px', h > 120 && h < 160, `h=${h.toFixed(1)}`);
  check('jump returns to ground', s.player.onGround);
  const exp = (PLAYER.jumpV * PLAYER.jumpV) / (2 * 2300);
  check('jump height matches physics', Math.abs(h - exp) < 12, `exp=${exp.toFixed(1)}`);
}

{
  // parry: block pressed right before a husk swing lands
  const s = new Stage(STAGES[0], 'challenging');
  steps(s, 5);
  const e = s.spawnEnemy('husk', s.player.x + 70);
  s.active = null;
  steps(s, 50); // finish spawn
  let pressedAt = -1;
  let result = '';
  for (let i = 0; i < 300 && !result; i++) {
    const remaining = e.state === 'windup' ? e.windupTime(s) - e.t : 9;
    const block = remaining < 0.05 || e.state === 'active';
    if (block && pressedAt < 0) pressedAt = i;
    s.step({ ...NO_INPUT, blockHeld: block, blockPressed: block && pressedAt === i, right: block });
    for (const ev of s.takeEvents()) if (ev.type === 'parry' || ev.type === 'block' || ev.type === 'playerHurt') result = ev.type;
  }
  check('well-timed block is a parry', result === 'parry', result);
  steps(s, 2);
  check('parry staggers the attacker', e.state === 'stagger', e.state);
}

{
  // late block (held long) is a regular block, no damage
  const s = new Stage(STAGES[0], 'challenging');
  steps(s, 5);
  s.spawnEnemy('husk', s.player.x + 70);
  let result = '';
  for (let i = 0; i < 400 && !result; i++) {
    s.step({ ...NO_INPUT, blockHeld: true, blockPressed: i === 0, right: i === 0 });
    for (const ev of s.takeEvents()) if (ev.type === 'parry' || ev.type === 'block' || ev.type === 'playerHurt') result = ev.type;
  }
  check('holding block early still blocks', result === 'block', result);
  check('blocking costs no hearts', s.player.hp === s.player.maxHp);
}

{
  // unblockable shockwave hurts through a block, jumping avoids it
  const s = new Stage(STAGES[0], 'gentle');
  steps(s, 5);
  s.spawnWave(s.player.x + 80, s.player.y, -1, 380, 600, true);
  steps(s, 60, { blockHeld: true });
  check('red shockwave goes through block', s.player.hp === s.player.maxHp - 1, `hp=${s.player.hp}`);
  const s2 = new Stage(STAGES[0], 'gentle');
  steps(s2, 5);
  s2.spawnWave(s2.player.x + 80, s2.player.y, -1, 380, 600, true);
  let jumped = false;
  for (let i = 0; i < 90; i++) {
    const w = s2.waves[0];
    const near = w && Math.abs(w.x - s2.player.x) < 110;
    s2.step({ ...NO_INPUT, jumpPressed: !!near && !jumped, jumpHeld: true });
    if (near) jumped = true;
  }
  check('jumping clears a shockwave', s2.player.hp === s2.player.maxHp, `hp=${s2.player.hp}`);
}

{
  // combo kills a husk and it drops motes
  const s = new Stage(STAGES[0], 'gentle');
  steps(s, 5);
  const e = s.spawnEnemy('husk', s.player.x + 60);
  steps(s, 45);
  for (let i = 0; i < 200 && e.alive; i++) s.step({ ...NO_INPUT, attackPressed: i % 8 === 0 });
  check('husk can be defeated', !e.alive);
  const before = s.score;
  steps(s, 120);
  check('defeat drops motes that are collected', s.score > before, `${before} -> ${s.score}`);
}

{
  // sentinel shield blocks frontal hits
  const s = new Stage(STAGES[2], 'gentle');
  steps(s, 5);
  const e = s.spawnEnemy('sentinel', s.player.x + 60);
  e.cooldown = 99;
  steps(s, 45);
  let clang = 0;
  for (let i = 0; i < 40; i++) {
    s.step({ ...NO_INPUT, attackPressed: i % 10 === 0 });
    for (const ev of s.takeEvents()) if (ev.type === 'clang') clang++;
  }
  check('sentinel shield deflects frontal swings', clang > 0 && e.hp === e.maxHp, `clang=${clang} hp=${e.hp}`);
}

{
  // death: instant retry at checkpoint with full hearts, encounter restarts
  const s = new Stage(STAGES[0], 'challenging');
  s.player.x=s.def.encounters[0].trigger+1;
  for(let i=0;i<120&&!s.active;i++)s.step(NO_INPUT);
  check("checkpoint encounter starts",!!s.active);
  steps(s, 90);
  s.player.hp = 1;
  s.player.invuln = 0;
  s.hitPlayer({ x: s.player.x + 10 }, 1, true);
  check('player dies at 0 hearts', s.phase === 'dead');
  steps(s, 100);
  check('respawns after a short pause', s.phase === 'play');
  check('respawn restores hearts', s.player.hp === s.player.maxHp);
  check('respawn at checkpoint', Math.abs(s.player.x - s.checkpoint.x) < 30, `${s.player.x} vs ${s.checkpoint.x}`);
  check('encounter still active after retry', !!s.active);
}

{
  // falling in water costs one heart and returns you to safe ground
  const s = new Stage(STAGES[1], 'gentle');
  const gap=Array.from({length:s.def.length},(_,x)=>x).find(x=>s.terrain.groundAt(x)===null)!;
  s.player.x=gap;s.player.y=635;s.player.onGround=false;
  let splashed = false;
  for (let i = 0; i < 400; i++) {
    s.step({ ...NO_INPUT, right: !splashed });
    if (s.takeEvents().some((e) => e.type === 'splash')) splashed = true;
  }
  check('falling in water costs a heart', s.player.hp === s.player.maxHp - 1, `hp=${s.player.hp}`);
  check('returned to safe ground', s.player.onGround || s.player.y <= 450);
}

{
  // gentle keeps boss damage across retries; challenging resets it
  for (const id of ['gentle', 'challenging'] as DifficultyId[]) {
    const s = new Stage(STAGES[0], id);
    s.restoreLevelState({keeper:true,seal:true,gate:true}); // Isolate boss retry behavior after the required archive gate.
    const bossEnc = s.def.encounters.length - 1;
    s.nextEncounter = bossEnc;
    s.player.x = s.def.encounters[bossEnc].trigger + 5;
    steps(s, 200);
    const boss = s.boss as Enemy | null;
    if (!boss) {
      check(`boss spawns (${id})`, false);
      continue;
    }
    boss.hp = 10;
    s.player.hp = 1;
    s.player.invuln = 0;
    s.hitPlayer({ x: s.player.x + 10 }, 1, true);
    steps(s, 260);
    const nb = s.boss as Enemy | null;
    if (id === 'gentle') check('gentle: boss keeps damage after retry', !!nb && nb.hp === 10, `hp=${nb?.hp}`);
    else check('challenging: boss resets after retry', !!nb && nb.hp === nb.maxHp, `hp=${nb?.hp}`);
  }
}

// ------------------------------------------------------------ level data
for (const def of STAGES) {
  const t = new Terrain(def.ground, def.platforms);
  check(`${def.name}: start on ground`, t.groundAt(def.start) !== null);
  let prev = -1;
  for (const [i, e] of def.encounters.entries()) {
    const [a, b] = e.arena;
    check(`${def.name} fight ${i + 1}: trigger inside arena`, e.trigger > a && e.trigger < b);
    check(`${def.name} fight ${i + 1}: in order`, e.trigger > prev);
    prev = e.trigger;
    const cp = e.checkpoint ?? a + 110;
    check(`${def.name} fight ${i + 1}: checkpoint on ground`, t.groundAt(cp) !== null);
    const g0 = t.groundAt(a + 5);
    let flat = true;
    for (let x = a + 5; x < b - 5; x += 10) if (t.groundAt(x) !== g0) flat = false;
    check(`${def.name} fight ${i + 1}: arena floor is flat and solid`, flat);
    for (const wave of e.waves)
      for (const sp of wave) {
        if (sp.kind === 'serpent') continue;
        check(`${def.name} fight ${i + 1}: ${sp.kind} spawns inside arena`, sp.x > a + 20 && sp.x < b - 20);
      }
  }
  check(`${def.name}: exit after last fight`, def.exit > def.encounters[def.encounters.length - 1].arena[1] || !!def.afterBoss);
  // every gap must be jumpable (<= 190px)
  const g = [...def.ground, ...(def.afterBoss ?? [])].sort((p, q) => p[0] - q[0]);
  let covered=g[0][1];
  for (let i=1;i<g.length;i++){
    const gap=g[i][0]-covered;
    check(`${def.name}: gap at ${covered} is jumpable`,gap<=170,`gap=${gap}`);
    covered=Math.max(covered,g[i][1]);
  }
}
check('two difficulties exist', Object.keys(DIFFICULTIES).length === 2);
check('seven levels exist', STAGES.length === 7);

// --------------------------------------------------- full playthroughs
console.log('\nBot playthroughs (each must reach the exit):');
console.log('level                  difficulty    seed  result   time   deaths  hits  score');
const MAX_STEPS = 60 * 60 * 12; // 12 minutes of game time
for (const def of STAGES) {
  for (const diff of ['gentle', 'challenging'] as DifficultyId[]) {
    for (const seed of [1, 2, 3]) {
      const s = new Stage(def, diff, seed);
      const bot = new Autopilot(diff === 'gentle' ? 0.8 : 0.92, createRng(seed * 13));
      let i = 0;
      while (!s.result && i < MAX_STEPS) {
        s.step(bot.decide(s));
        s.takeEvents();
        i++;
      }
      const ok = !!s.result;
      check(`${def.name} on ${diff} (seed ${seed}) is finished by the bot`, ok, ok ? '' : `stuck at x=${s.player.x.toFixed(0)} enc=${s.nextEncounter} active=${!!s.active} enemies=${s.enemies.map((e) => e.kind + ':' + e.state).join(',')}`);
      const r = s.result;
      console.log(
        `${def.name.padEnd(23)}${diff.padEnd(14)}${String(seed).padEnd(6)}${(ok ? 'clear' : 'FAIL').padEnd(9)}${(s.time.toFixed(0) + 's').padEnd(7)}${String(s.deaths).padEnd(8)}${String(s.player.hitsTaken).padEnd(6)}${r?.score ?? '-'}`,
      );
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log('  ✗ ' + f);
  (globalThis as unknown as { process: { exit(n: number): void } }).process.exit(1);
}
