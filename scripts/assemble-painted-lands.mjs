// Offline export only: runtime/builds use the committed WebP files and manifest.
// Source sheets stay in ignored generated-artifacts; never commit full masters.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath = 'public/assets/production/asset-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const lands = [
  ['flood', 900], ['garden', 900], ['mountain', 1020],
  ['valley', 1050], ['city', 960], ['river', 960],
];
const convert = args => execFileSync('convert', args);
for (const [theme, lowerFloor] of lands) {
  const source = `generated-artifacts/painted-${theme}-sheet.png`;
  const dimensions = execFileSync('identify', ['-format', '%w %h', source], { encoding: 'utf8' }).split(' ').map(Number);
  const [width, height] = dimensions;
  // Sheets are three independent panoramic paintings, not animation frames.
  const cuts = [0, Math.round(height / 3), Math.round(height * 2 / 3), height];
  const directory = `public/assets/production/world/${theme}`;
  mkdirSync(directory, { recursive: true });
  for (const [i, part] of ['sky', 'mid', 'lower'].entries()) {
    const file = `${directory}/${theme}-painted-${part}.webp`;
    const crop = `${width}x${cuts[i + 1] - cuts[i]}+0+${cuts[i]}`;
    convert([source, '-crop', crop, '+repage',
      // Key out open sky AND arch gaps before downsampling. Threshold in RGB
      // removes magenta edge spill without eating stone, foliage or shadows.
      ...(part === 'mid' ? ['-alpha', 'on', '-channel', 'A',
        '-fx', 'r > 0.5 && b > 0.5 && g < r*0.65 && g < b*0.65 ? 0 : 1', '+channel'] : []),
      '-resize', '512x170^', '-background', 'none', '-gravity', 'center', '-extent', '512x170',
      '-strip', '-quality', '88', file]);
    manifest.images[`${theme}-painted-${part}`] = {
      src: file.replace('public/', ''), width: 512, height: 170,
      anchor: [0, 0], scale: 1,
      source: `AI-generated ${theme} three-panel scenery, adapted from the user-supplied Armor of Light Game Asset Bible / Complete Game Asset Showcase direction with user authorization. Source: ${source}.`,
      license: 'Generated artwork for this project under generation-service terms; user-supplied reference direction used with user authorization. Verify reference rights before public release.',
    };
  }
  const surface = [-2000, lowerFloor - 180];
  const midDepth = [-2000, lowerFloor - 240];
  const previous = manifest.lands[theme] ?? { props: [] };
  manifest.lands[theme] = {
    ...previous,
    layers: [
      { image: `${theme}-painted-sky`, plane: 'background', height: 540,
        speedX: .035, speedY: 0, cover: true, depth: surface, fadeY: 120 },
      { image: `${theme}-painted-mid`, plane: 'background', height: 500, y: 70,
        speedX: .28, speedY: 0, cover: true, opacity: .48, depth: midDepth, fadeY: 100 },
      { image: `${theme}-painted-mid`, plane: 'foreground', height: 620, y: 220,
        speedX: .85, speedY: 0, cover: true, opacity: .10, depth: midDepth, fadeY: 100 },
      { image: `${theme}-painted-lower`, plane: 'background', height: 540,
        speedX: .12, speedY: 0, cover: true, depth: [lowerFloor - 400, 2400], fadeY: 180 },
    ],
  };
}
const decoded = Object.values(manifest.images).reduce((sum, im) => sum + im.width * im.height * 4, 0);
if (decoded >= 80 * 1048576) throw Error(`Combined catalog exceeds 80 MiB: ${decoded}`);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Installed six layered painted lands; combined catalog ${(decoded / 1048576).toFixed(2)} MiB decoded.`);
