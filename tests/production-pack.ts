// Node-only checks run through tsx; the app intentionally excludes Node typings.
// @ts-expect-error Node fs is available in this test runner, not the browser app.
import { readFileSync, existsSync } from 'node:fs';
import { validateManifest } from '../src/production/manifest';
import { playerVisual } from '../src/production/scene';
import { Player } from '../src/core/player';

const m = validateManifest(JSON.parse(readFileSync('public/assets/production/asset-manifest.json', 'utf8')));
let n = 0;
function check(value: unknown, message: string) {
  if (!value) throw Error(message);
  n++;
}
check(Object.keys(m.images).length > 0, 'production art is installed, not an empty manifest');
for (const [id, image] of Object.entries(m.images)) {
  check(existsSync(`public/${image.src}`), `${id}: shipped image exists`);
  check(image.source.length > 10 && image.license.length > 10, `${id}: provenance and rights recorded`);
}
const states = m.actors.eliam?.states;
check(states, 'Eliam body bindings exist');
for (const key of ['idle', 'run', 'jump-rise', 'jump-fall', 'dash', 'block', 'hurt', 'dead',
  'attack.hammer.light-1', 'attack.hammer.light-2', 'attack.hammer.light-3', 'attack.hammer.heavy',
  'attack.hammer.air', 'attack.hammer.air-heavy']) {
  const clip = m.clips[states[key]];
  check(clip && clip.frames.length > 1 && clip.mode === 'replace', `${key}: calibrated animated body without duplicate procedural helmet`);
  const image = m.images[clip.image];
  check(image.frame?.width === 512 && image.frame.height === 512 &&
    image.anchor.join(',') === '256,448' && image.scale === .25, `${key}: untrimmed source-cell pivot and scale`);
}
const p = new Player(100, 450, 8);
p.state = 'attack';
for (let combo = 0; combo < 3; combo++) {
  p.combo = combo;
  const visual = playerVisual(p);
  check(visual.key === `attack.hammer.light-${combo + 1}` && !!states[visual.key],
    `live combo ${combo + 1} has its own mapped state`);
  check(visual.duration === p.swing.dur, 'animation uses live swing duration');
}
const desert = m.lands.desert;
check(desert?.layers.length >= 3, 'layered desert scene installed');
check(new Set(desert.layers.map(l => l.speedX)).size >= 3, 'three independent parallax rates');
const surface = desert.layers.filter(l => l.depth && l.depth[1] <= 750);
const archive = desert.layers.filter(l => l.depth && l.depth[0] >= 450);
check(surface.length >= 2 && archive.length > 0, 'surface and archive have explicit world-depth ranges');
check(surface.every(l => l.depth![1] < 900), 'surface art is absent at archive floor depth');
check(archive.some(l => l.depth![0] < 900 && l.depth![1] > 900), 'archive art covers the lower route');
check(desert.layers.filter(l => l.plane === 'foreground').every(l => (l.opacity ?? .25) <= .35),
  'near scenery remains restrained and behind gameplay');
// Conservative upper bound, even if every atlas and depth band is resident.
const decoded = Object.values(m.images).reduce((sum, im) => sum + im.width * im.height * 4, 0);
check(decoded < 80 * 1024 * 1024, `whole art pack fits active-scene headroom (${(decoded / 1048576).toFixed(1)} MiB)`);
console.log(`${n} installed painted-pack checks passed.`);
