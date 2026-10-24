import { Autopilot } from '../src/core/autopilot';
import { createRng } from '../src/core/rng';
import { STAGES } from '../src/core/levels';
import { NO_INPUT } from '../src/core/types';
import { Player, SWINGS } from '../src/core/player';
import { Stage } from '../src/core/stage';
import { LAND_WEAPONS, WEAPONS } from '../src/core/weapons';
import { SaveStore } from '../src/save';

let passed = 0;
function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Weapon test failed: ${message}`);
  passed++;
}

function steps(stage: Stage, count: number): void {
  for (let i = 0; i < count; i++) stage.step(NO_INPUT);
}

function killForWeapon(stage: Stage, x: number): void {
  const enemy = stage.spawnEnemy('husk', x);
  enemy.state = 'move';
  enemy.cooldown = 99;
  check(enemy.takeHit(stage, 999, 1, 0) === 'killed', 'a normal enemy can be defeated');
  stage.step(NO_INPUT);
}

function positionDropAtPlayer(stage: Stage, index: number): void {
  const drop = stage.weaponDrops[index];
  drop.x = stage.player.x + 38;
  drop.y = stage.player.y - 22;
  drop.vx = 0;
  drop.vy = 0;
  drop.settled = true;
  drop.onGround = true;
}

// The original hammer remains the unmodified, default combat implementation.
{
  const p = new Player(120, 450, 8);
  p.onGround = true;
  check(p.swing === SWINGS[0], 'hammer uses the original first swing definition');
  p.control({ ...NO_INPUT, attackPressed: true }, 1 / 60);
  check(p.swing === SWINGS[0] && p.combo === 0, 'hammer attack timing and combo index are unchanged');
  check(SWINGS[0].dur === 0.27 && SWINGS[1].dur === 0.27 && SWINGS[2].dur === 0.41, 'original three-strike durations stay intact');
  p.acquireWeapon('tide-spear');
  check(p.swing.box.w > SWINGS[0].box.w && p.swing.box.h < SWINGS[0].box.h, 'spear has longer reach but narrower coverage');
  p.acquireWeapon('sunblade');
  check(p.swing.knock < SWINGS[0].knock, 'Sunblade trades hammer knockback for speed');
}

// Drops physically fall, bounce, settle on a real surface, and recover from pits.
{
  const stage = new Stage(STAGES[0], 'gentle');
  killForWeapon(stage, 360);
  check(stage.weaponDrops.length === 1, 'first regular kill offers the land weapon');
  const drop = stage.weaponDrops[0];
  steps(stage, 300);
  check(drop.settled && drop.onGround, 'weapon drop settles after its bounce');
  check(stage.terrain.surfaceBelow(drop.x, drop.y - 2) !== null, 'settled drop rests on valid terrain');
  drop.x = 2000;
  drop.y = 610;
  drop.vx = 0;
  drop.vy = 0;
  drop.settled = false;
  drop.onGround = false;
  stage.step(NO_INPUT);
  check(drop.settled && stage.terrain.surfaceBelow(drop.x, drop.y - 2) !== null, 'weapon falling below the world safely recovers to ground');
}

// Drops are optional and require a fresh deliberate press inside proximity.
{
  const stage = new Stage(STAGES[0], 'gentle');
  killForWeapon(stage, 360);
  const drop = stage.weaponDrops[0];
  positionDropAtPlayer(stage, 0);
  drop.x = stage.player.x + 130;
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.alternateWeapon === null && stage.weaponDrops.includes(drop), 'pressing outside proximity neither picks up nor consumes the drop');
  drop.x = stage.player.x + 38;
  stage.step(NO_INPUT);
  check(stage.player.alternateWeapon === null, 'moving into range does not auto-pick up a weapon');
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.alternateWeapon === 'sunblade' && stage.player.weaponRank === 1, 'deliberate pickup equips rank I in the alternate slot');
  check(!stage.weaponDrops.includes(drop), 'picked-up drop is removed once');
}

// Two repeated copies improve the owned weapon to rank III; swapping preserves the hammer.
{
  const stage = new Stage(STAGES[0], 'gentle');
  for (const x of [360, 460, 560]) killForWeapon(stage, x);
  check(stage.weaponDrops.length === 3 && stage.weaponDropsIssued === 3, 'only three deterministic drops can be issued in a run');
  positionDropAtPlayer(stage, 0);
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.weaponRank === 1 && stage.player.equippedSlot === 'alternate', 'new weapon starts at rank I and is selected');

  stage.step({ ...NO_INPUT, swapPressed: true });
  check(stage.player.equippedSlot === 'hammer', 'swap returns to the permanent hammer');
  stage.step({ ...NO_INPUT, swapPressed: true });
  check(stage.player.equippedSlot === 'alternate', 'swap selects the optional weapon again');

  positionDropAtPlayer(stage, 0);
  stage.step({ ...NO_INPUT, swapPressed: true });
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.weaponRank === 2 && stage.player.equippedSlot === 'hammer', 'duplicate raises rank while preserving the selected slot');
  positionDropAtPlayer(stage, 0);
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.weaponRank === 3, 'third copy reaches rank III');

  const maxed = {
    id: 'maxed-copy',
    weapon: 'sunblade' as const,
    x: stage.player.x + 38,
    y: stage.player.y - 22,
    vx: 0,
    vy: 0,
    bounces: 0,
    settled: true,
    w: 18,
    h: 16,
    onGround: true,
  };
  stage.weaponDrops.push(maxed);
  stage.step({ ...NO_INPUT, interactPressed: true });
  check(stage.player.weaponRank === 3 && stage.weaponDrops.includes(maxed), 'max-rank duplicate is not silently consumed');

  stage.respawn();
  check(stage.player.alternateWeapon === 'sunblade' && stage.player.weaponRank === 3, 'checkpoint respawn preserves weapon and rank');
}

// Retrying/reloading a rewarded enemy cannot farm a new copy, while its
// uncollected physical reward and later opportunities remain available.
{
  const stage = new Stage(STAGES[0], 'gentle');
  killForWeapon(stage, 360);
  const originalId = stage.weaponDrops[0].id;
  stage.respawn();
  killForWeapon(stage, 360);
  check(stage.weaponDrops.length === 1 && stage.weaponDropsIssued === 1, 'checkpoint retry cannot duplicate a rewarded source');
  const resumed = new Stage(STAGES[0], 'gentle');
  resumed.restoreWeaponState(stage.saveWeaponState());
  killForWeapon(resumed, 360);
  check(resumed.weaponDrops.length === 1 && resumed.weaponDrops[0].id === originalId, 'Continue retains the declined drop without duplicating it');
  killForWeapon(resumed, 460);
  check(resumed.weaponDrops.length === 2 && resumed.weaponDropsIssued === 2, 'a later enemy still offers another opportunity');
}

// Safe save migration, Continue restoration, new-attempt reset, and distinct land catalog.
{
  const stage = new Stage(STAGES[0], 'gentle');
  killForWeapon(stage, 360);
  positionDropAtPlayer(stage, 0);
  stage.step({ ...NO_INPUT, interactPressed: true });
  const weaponState = stage.saveWeaponState();
  let raw: string | null = JSON.stringify({
    version: 2,
    unlocked: 0,
    best: {},
    settings: { sfx: true, music: true, difficulty: 'gentle' },
    run: { level: 0, encounter: 0, score: 0, motes: 0, kills: 1, time: 4, deaths: 0, collected: [], difficulty: 'gentle', weaponState },
  });
  const platform = { load: async () => raw, save: async (value: string) => { raw = value; } };
  const store = new SaveStore(platform as never);
  await store.load();
  check(store.data.run?.weaponState?.alternate === 'sunblade', 'valid weapon state survives save loading');
  const resumed = new Stage(STAGES[0], 'gentle');
  resumed.restoreWeaponState(store.data.run?.weaponState);
  check(resumed.player.alternateWeapon === 'sunblade' && resumed.player.weaponRank === 1, 'Continue restores loadout');
  check(resumed.player.equippedSlot === 'alternate', 'Continue restores selected weapon slot');

  raw = JSON.stringify({
    version: 1,
    unlocked: 0,
    best: {},
    settings: { sfx: true, music: true, difficulty: 'gentle' },
    run: { level: 0, encounter: 0, score: 0, motes: 0, kills: 0, time: 0, deaths: 0, collected: [], difficulty: 'gentle' },
  });
  await store.load();
  check(store.data.run?.weaponState === undefined, 'legacy v1 run loads with safe hammer-only defaults');
  const freshAttempt = new Stage(STAGES[0], 'gentle');
  check(freshAttempt.player.alternateWeapon === null && freshAttempt.player.equippedSlot === 'hammer', 'fresh attempt starts with hammer only');
  const nextLand = new Stage(STAGES[1], 'gentle');
  check(nextLand.player.alternateWeapon === null, 'new land starts a new level-specific loadout');
  check(new Set(LAND_WEAPONS).size === 7 && LAND_WEAPONS.every((id) => !!WEAPONS[id]), 'each land has its own distinct weapon');
}

// The alternate loadout remains viable across the entire campaign; baseline bots
// separately prove hammer-only campaign completion.
for (const [index, def] of STAGES.entries()) {
  const stage = new Stage(def, 'gentle', 1);
  stage.player.acquireWeapon(LAND_WEAPONS[index]);
  const bot = new Autopilot(0.8, createRng(100 + index));
  const limit = 60 * 60 * 12;
  let i = 0;
  while (!stage.result && i < limit) {
    stage.step(bot.decide(stage));
    stage.takeEvents();
    i++;
  }
  check(!!stage.result, `${def.name} remains clearable with ${WEAPONS[LAND_WEAPONS[index]].name}`);
}

console.log(`${passed} weapon checks passed: drops, deliberate pickup, upgrades, swaps, checkpoints, Continue migration, safe recovery, seven lands and hammer baseline.`);
