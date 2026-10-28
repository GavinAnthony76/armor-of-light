// @ts-expect-error Node-only installed export checks.
import { readFileSync } from 'node:fs';
import { validateManifest } from '../src/production/manifest';
import { ProductionAssets } from '../src/production/assets';
import { ProductionScene } from '../src/production/scene';
import { STAGES } from '../src/core/levels';

let n = 0;
function check(ok: unknown, message: string) { if (!ok) throw Error(message); n++; }
const m = validateManifest(JSON.parse(readFileSync('public/assets/production/asset-manifest.json', 'utf8')));
const floors = { flood: 900, garden: 900, mountain: 1020, valley: 1050, city: 960, river: 960 };
const a = new ProductionAssets();
a.install(m);
const scene = new ProductionScene(a);
let requested: string[] = [], calls: unknown[] = [];
a.image = id => {
  requested.push(id);
  return { id } as unknown as HTMLImageElement;
};
const ctx = new Proxy({ globalAlpha: 1 }, {
  get(target, key) {
    if (key in target) return Reflect.get(target, key);
    return (...args: unknown[]) => calls.push([key, ...args]);
  },
  set(target, key, value) {
    calls.push(['set', key, value]); Reflect.set(target, key, value); return true;
  },
}) as unknown as CanvasRenderingContext2D;
function draw(theme: string, y: number, camX = 0, still = false, width = 960, height = 540) {
  requested = []; calls = [];
  for (const plane of ['background', 'foreground'] as const)
    scene.layers(ctx, theme, plane, camX, y - 350, width, height, still, y);
  return JSON.stringify(calls);
}
for (const [theme, floor] of Object.entries(floors)) {
  const land = m.lands[theme];
  check(land.layers.length === 4, `${theme}: distant, transparent mid, near and lower paintings`);
  check(new Set(land.layers.map(l => l.speedX)).size >= 3, `${theme}: independent parallax rates`);
  check(land.layers.every(l => l.depth && l.fadeY && !l.repeatX), `${theme}: depth-faded nonrepeating paintings`);
  const stage = STAGES.find(s => s.theme === theme)!;
  check(stage.ground.some(g => g[2] === floor), `${theme}: lower painting calibrated to actual room floor`);
  check(land.layers.filter(l => l.plane === 'foreground').every(l => (l.opacity ?? 1) <= .35),
    `${theme}: near layer does not hide gameplay`);
  for (const part of ['sky', 'mid', 'lower']) {
    const id = `${theme}-painted-${part}`, spec = m.images[id];
    check(spec?.src.includes(`world/${theme}/`), `${theme}: distinct authored ${part} artwork, not a recolored desert`);
    check(spec.width === 512 && spec.height === 170, `${theme}: bounded optimized delivery`);
  }
  for (const size of [[960, 540], [390, 844], [844, 390]]) {
    draw(theme, 450, 0, false, ...size as [number, number]);
    check(requested.includes(`${theme}-painted-sky`) && !requested.includes(`${theme}-painted-lower`),
      `${theme}: surface does not request lower-room artwork at ${size}`);
    draw(theme, floor, 0, false, ...size as [number, number]);
    check(requested.length === 1 && requested[0] === `${theme}-painted-lower`,
      `${theme}: lower room never loads sky/mid at ${size}`);
    draw(theme, -20, 0, false, ...size as [number, number]);
    check(requested.includes(`${theme}-painted-sky`), `${theme}: upper exploration retains surface at ${size}`);
  }
  check(draw(theme, 450, 0) !== draw(theme, 450, 180), `${theme}: camera gives parallax`);
  check(draw(theme, 450, 0, true) === draw(theme, 450, 180, true), `${theme}: reduced motion freezes added parallax`);
  check(scene.lowerRoomCoverage(theme, 450) === 0, `${theme}: surface void/water wash unchanged`);
  check(scene.lowerRoomCoverage(theme, floor) === 1, `${theme}: decoded painting is visible beneath lower-room terrain`);
  check(scene.lowerRoomCoverage(theme, floor - 310) === .5, `${theme}: void wash fades with the room painting`);
  for (let y = 450; y <= floor; y += 5) {
    draw(theme, y);
    check(requested.length > 0, `${theme}: no empty transition at world-foot ${y}`);
  }
  draw(theme, 2501);
  check(requested.length === 0, `${theme}: beyond authored depths, original fallback is untouched`);
}
const before = JSON.stringify(m);
a.image = () => null;
for (const theme of Object.keys(floors)) {
  draw(theme, 450);
  check(calls.every(c => !JSON.stringify(c).includes('drawImage')), `${theme}: missing art draws nothing over fallback`);
  check(scene.lowerRoomCoverage(theme, floors[theme as keyof typeof floors]) === 0,
    `${theme}: missing lower artwork retains original opaque pit/water fallback`);
}
check(JSON.stringify(m) === before, 'rendering cannot mutate manifest or terrain definitions');
const decoded = Object.values(m.images).reduce((sum, im) => sum + im.width * im.height * 4, 0);
check(decoded < 80 * 1048576, 'entire installed art catalog remains below 80 MiB');
console.log(`${n} six-land painted scenery, depth, aspect, fallback and reduced-motion checks passed.`);
