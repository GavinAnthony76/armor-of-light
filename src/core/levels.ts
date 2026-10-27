import {desertDemo} from "./desert-demo";
import type { EnemyKind } from './enemy';

/**
 * Levels are plain data. Coordinates are in pixels; the ground line is
 * usually y = 450 (smaller y = higher). To make a new level, copy one of
 * these, change the geometry and encounters, and add it to STAGES.
 */

export interface Spawn {
  kind: EnemyKind;
  x: number;
  y?: number; // for flyers
  delay?: number;
}

export interface Encounter {
  trigger: number; // fight starts when the player passes this x
  arena: [number, number]; // walls of light appear here until it's won
  checkpoint?: number; // retry position (defaults to just inside the arena)
  waves: Spawn[][];
  boss?: boolean;
  openRoad?:boolean;
  sealGuardian?:boolean;
}

export type Theme = 'desert' | 'flood' | 'garden' | 'mountain' | 'valley' | 'city' | 'river';

export type Prop =
  | { t: 'pillar' | 'broken' | 'arch' | 'palm' | 'rock' | 'obelisk' | 'tent'; x: number; s?: number }
  | { t: 'reeds' | 'deadTree' | 'post' | 'lily' | 'ruinWall' | 'lantern'; x: number; s?: number }
  | { t: 'cypress' | 'hedge' | 'flowers' | 'fountain' | 'gate' | 'trellis' | 'olive'; x: number; s?: number };

export interface Sign {
  x: number;
  key: 'move' | 'jump' | 'attack' | 'block' | 'parry' | 'red' | 'combo' | 'water' | 'shield' | 'dash' | 'wall' | 'double';
}

export interface StageDef {
  id: number;
  /** Change when authored checkpoint, collectible or reward identities change. */
  layoutRevision?: string;
  name: string;
  subtitle: string;
  verse: { text: string; ref: string };
  theme: Theme;
  story?: string;
  inspiration?: string;
  background?: string;
  bossArt?: string;
  voidY?:number;
  length: number;
  start: number;
  exit: number;
  par: number; // seconds, for the time bonus
  ground: [number, number, number][]; // [x0, x1, top y]
  platforms: [number, number, number][];
  afterBoss?: [number, number, number][]; // ground that rises when the guardian falls
  motes: [number, number][];
  signs: Sign[];
  props: Prop[];
  encounters: Encounter[];
}

/** Evenly spaced motes along a jump arc or line. */
function arc(x0: number, x1: number, yBase: number, height: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    out.push([Math.round(x0 + (x1 - x0) * t), Math.round(yBase - Math.sin(t * Math.PI) * height)]);
  }
  return out;
}
function line(x0: number, x1: number, y: number, n: number): [number, number][] {
  return arc(x0, x1, y, 0, n);
}

export const STAGES: StageDef[] = [
  // ------------------------------------------------------------------ 1
  {
    id: 0,
    name: 'The Desert Ruins',
    subtitle: 'Where the old road ends',
    verse: { text: 'Thy word is a lamp unto my feet, and a light unto my path.', ref: 'Psalm 119:105' },
    theme: 'desert',
    length: 4900,
    start: 120,
    exit: 4760,
    par: 220,
    ground: [
      [0, 1950, 450],
      [1950, 2150, 404],
      [2150, 4900, 450],
    ],
    platforms: [
      [430, 600, 356],
      [2240, 2380, 340],
      [2440, 2580, 290],
    ],
    motes: [
      ...line(250, 380, 420, 3),
      ...arc(440, 590, 320, 30, 4),
      ...line(650, 720, 420, 2),
      ...arc(1880, 2020, 380, 50, 3),
      ...line(2260, 2360, 305, 3),
      ...line(2460, 2560, 255, 3),
      ...line(3350, 3450, 420, 3),
      ...arc(4620, 4740, 410, 40, 3),
    ],
    signs: [
      { x: 180, key: 'move' },
      { x: 400, key: 'jump' },
      { x: 860, key: 'attack' },
      { x: 1180, key: 'block' },
      { x: 2350, key: 'combo' },
      { x: 3640, key: 'red' },
    ],
    props: [
      { t: 'rock', x: 60 },
      { t: 'palm', x: 300, s: 1.1 },
      { t: 'broken', x: 520 },
      { t: 'pillar', x: 760 },
      { t: 'tent', x: 1020 },
      { t: 'pillar', x: 1320, s: 1.15 },
      { t: 'arch', x: 1600 },
      { t: 'broken', x: 1870 },
      { t: 'obelisk', x: 2050 },
      { t: 'palm', x: 2290 },
      { t: 'pillar', x: 2700 },
      { t: 'arch', x: 3000, s: 1.1 },
      { t: 'rock', x: 3260 },
      { t: 'broken', x: 3480 },
      { t: 'pillar', x: 3700, s: 1.2 },
      { t: 'obelisk', x: 4050, s: 1.3 },
      { t: 'pillar', x: 4420, s: 1.2 },
      { t: 'palm', x: 4650 },
      { t: 'arch', x: 4830 },
    ],
    encounters: [
      {
        trigger: 980,
        arena: [760, 1760],
        checkpoint: 830,
        waves: [[{ kind: 'husk', x: 1500 }], [{ kind: 'husk', x: 1640 }, { kind: 'husk', x: 900, delay: 1.2 }]],
      },
      {
        trigger: 2620,
        arena: [2250, 3250],
        checkpoint: 2330,
        waves: [
          [{ kind: 'wisp', x: 3000, y: 330 }, { kind: 'wisp', x: 2450, y: 320, delay: 1 }],
          [{ kind: 'caster', x: 3150 }, { kind: 'husk', x: 2420, delay: 0.8 }],
        ],
      },
      {
        trigger: 3820,
        arena: [3560, 4520],
        checkpoint: 3640,
        boss: true,
        waves: [[{ kind: 'warden', x: 4320 }]],
      },
    ],
  },

  // ------------------------------------------------------------------ 2
  {
    id: 1,
    name: 'The Flooded Paths',
    subtitle: 'Stone by stone across the marsh',
    verse: { text: 'When thou passest through the waters, I will be with thee.', ref: 'Isaiah 43:2' },
    theme: 'flood',
    length: 5900,
    start: 100,
    exit: 5740,
    par: 280,
    ground: [
      [0, 720, 450],
      [860, 1920, 450],
      [2080, 2300, 450],
      [2460, 3520, 450],
      [3680, 4110, 450],
      [4250, 5160, 450],
    ],
    platforms: [
      [765, 815, 426],
      [1975, 2025, 418],
      [2340, 2420, 388],
      [2850, 3010, 336],
      [3575, 3645, 406],
      [3830, 3960, 340],
      [4155, 4205, 418],
    ],
    afterBoss: [[5160, 5900, 450]],
    motes: [
      ...line(200, 340, 420, 3),
      ...arc(700, 880, 410, 70, 4),
      ...arc(1900, 2100, 400, 80, 4),
      ...arc(2290, 2470, 360, 60, 4),
      ...line(2870, 2990, 300, 3),
      ...arc(3500, 3720, 390, 90, 5),
      ...line(3850, 3940, 305, 3),
      ...arc(4090, 4270, 400, 70, 4),
      ...line(5300, 5600, 420, 4),
    ],
    signs: [
      { x: 160, key: 'water' },
      { x: 2620, key: 'parry' },
      { x: 4330, key: 'red' },
    ],
    props: [
      { t: 'reeds', x: 40 },
      { t: 'deadTree', x: 260, s: 1.1 },
      { t: 'post', x: 690 },
      { t: 'lily', x: 790 },
      { t: 'reeds', x: 900 },
      { t: 'ruinWall', x: 1180 },
      { t: 'lantern', x: 1460 },
      { t: 'deadTree', x: 1720 },
      { t: 'post', x: 1900 },
      { t: 'lily', x: 2000 },
      { t: 'reeds', x: 2200 },
      { t: 'lily', x: 2380 },
      { t: 'lantern', x: 2520 },
      { t: 'ruinWall', x: 2780, s: 1.2 },
      { t: 'reeds', x: 3150 },
      { t: 'deadTree', x: 3380, s: 1.2 },
      { t: 'post', x: 3505 },
      { t: 'lily', x: 3610 },
      { t: 'lantern', x: 3760 },
      { t: 'reeds', x: 4060 },
      { t: 'lily', x: 4180 },
      { t: 'post', x: 4270 },
      { t: 'ruinWall', x: 4520, s: 1.3 },
      { t: 'deadTree', x: 4900, s: 1.3 },
      { t: 'lantern', x: 5140 },
      { t: 'reeds', x: 5500 },
      { t: 'lantern', x: 5800 },
    ],
    encounters: [
      {
        trigger: 1120,
        arena: [880, 1900],
        checkpoint: 960,
        waves: [[{ kind: 'lurker', x: 1650 }], [{ kind: 'husk', x: 1760 }, { kind: 'lurker', x: 1000, delay: 1.4 }]],
      },
      {
        trigger: 2720,
        arena: [2480, 3500],
        checkpoint: 2560,
        waves: [
          [{ kind: 'caster', x: 3360 }, { kind: 'wisp', x: 2950, y: 300, delay: 1 }],
          [{ kind: 'lurker', x: 3300 }, { kind: 'caster', x: 2540, delay: 1 }],
          [{ kind: 'wisp', x: 3150, y: 290 }, { kind: 'husk', x: 3400, delay: 0.5 }, { kind: 'wisp', x: 2700, y: 300, delay: 1.5 }],
        ],
      },
      {
        trigger: 4480,
        arena: [4260, 5160],
        checkpoint: 4340,
        boss: true,
        waves: [[{ kind: 'serpent', x: 5330 }]],
      },
    ],
  },

  // ------------------------------------------------------------------ 3
  {
    id: 2,
    name: 'The Garden Gates',
    subtitle: 'The last shadow keeps the gate',
    verse: { text: 'Be strong and of a good courage; be not afraid.', ref: 'Joshua 1:9' },
    theme: 'garden',
    length: 6100,
    start: 100,
    exit: 5960,
    par: 330,
    ground: [
      [0, 1050, 450],
      [1050, 2450, 404],
      [2450, 2600, 450],
      [2760, 3850, 450],
      [3850, 4150, 406],
      [4150, 6100, 450],
    ],
    platforms: [
      [600, 760, 350],
      [2650, 2710, 420],
      [3200, 3360, 330],
      [4300, 4440, 340],
    ],
    motes: [
      ...line(220, 380, 420, 3),
      ...arc(610, 750, 315, 30, 4),
      ...arc(960, 1110, 390, 60, 3),
      ...arc(2580, 2780, 400, 80, 4),
      ...line(3220, 3340, 295, 3),
      ...arc(3760, 3920, 380, 60, 3),
      ...line(4320, 4420, 305, 3),
      ...line(5960, 6060, 420, 3),
    ],
    signs: [
      { x: 1180, key: 'shield' },
      { x: 5160, key: 'red' },
    ],
    props: [
      { t: 'cypress', x: 60 },
      { t: 'flowers', x: 200 },
      { t: 'olive', x: 420 },
      { t: 'hedge', x: 860 },
      { t: 'trellis', x: 1180 },
      { t: 'cypress', x: 1440, s: 1.1 },
      { t: 'flowers', x: 1680 },
      { t: 'fountain', x: 1960 },
      { t: 'cypress', x: 2300 },
      { t: 'flowers', x: 2520 },
      { t: 'hedge', x: 2900 },
      { t: 'olive', x: 3120, s: 1.2 },
      { t: 'trellis', x: 3520 },
      { t: 'cypress', x: 3780 },
      { t: 'flowers', x: 4000 },
      { t: 'hedge', x: 4260 },
      { t: 'cypress', x: 4600, s: 1.2 },
      { t: 'fountain', x: 4900, s: 1.1 },
      { t: 'olive', x: 5250 },
      { t: 'cypress', x: 5500, s: 1.3 },
      { t: 'gate', x: 5930 },
      { t: 'flowers', x: 6050 },
    ],
    encounters: [
      {
        trigger: 1360,
        arena: [1080, 2420],
        checkpoint: 1150,
        waves: [[{ kind: 'sentinel', x: 1900 }], [{ kind: 'husk', x: 2280 }, { kind: 'sentinel', x: 2050, delay: 0.6 }]],
      },
      {
        trigger: 3000,
        arena: [2780, 3840],
        checkpoint: 2860,
        waves: [
          [{ kind: 'caster', x: 3700 }, { kind: 'wisp', x: 3300, y: 300, delay: 0.8 }],
          [{ kind: 'lurker', x: 3600 }, { kind: 'sentinel', x: 3420, delay: 1 }],
          [{ kind: 'wisp', x: 3000, y: 300 }, { kind: 'wisp', x: 3600, y: 300, delay: 1 }, { kind: 'caster', x: 3760, delay: 1.5 }],
        ],
      },
      {
        trigger: 4400,
        arena: [4160, 5000],
        checkpoint: 4230,
        waves: [[{ kind: 'sentinel', x: 4850 }, { kind: 'lurker', x: 4700, delay: 1 }]],
      },
      {
        trigger: 5320,
        arena: [5060, 5880],
        checkpoint: 5140,
        boss: true,
        waves: [[{ kind: 'thorn', x: 5680 }]],
      },
    ],
  },
];

// Later chapters use the original movement and encounter contracts.
const chapters: {name:string; subtitle:string; theme:Theme; boss:EnemyKind; verse:StageDef['verse']; story:string; inspiration:string; ground:StageDef['ground']; platforms:StageDef['platforms']}[] = [
 {name:'The Mountain of Promise',subtitle:'Courage above the storm',theme:'mountain',boss:'watcher',verse:{text:'The LORD shall fight for you, and ye shall hold your peace.',ref:'Exodus 14:14'},inspiration:'Sinai · Exodus 19–20',story:'Climb toward the summit through a gathering storm. Patience means reading the warning, then taking the next faithful step.',ground:[[0,800,450],[800,2100,404],[2100,2500,450],[2640,4300,450],[4300,6100,450]],platforms:[[500,650,350],[2530,2600,420],[2800,2960,340],[4000,4140,310]]},
 {name:'The Valley of Courage',subtitle:'Stand firm beneath a giant shadow',theme:'valley',boss:'colossus',verse:{text:'The battle is the LORD’s.',ref:'1 Samuel 17:47'},inspiration:'David and Goliath · 1 Samuel 17',story:'The valley magnifies every fear. Face a towering guardian with timing and courage: strength alone will not carry the day.',ground:[[0,2100,450],[2100,2350,404],[2350,4000,450],[4000,4200,404],[4200,6100,450]],platforms:[[450,620,350],[2500,2680,340],[3700,3850,330]]},
 {name:'The City of the Watch',subtitle:'Keep the light through the long night',theme:'city',boss:'keeper',verse:{text:'Be not afraid of them: remember the Lord, which is great and terrible.',ref:'Nehemiah 4:14'},inspiration:'Rebuilding the wall · Nehemiah 4',story:'Cross a city whose walls have fallen into shadow. Guard the road, hold your ground, and open a path for the light to return.',ground:[[0,1000,450],[1000,2100,404],[2100,2500,450],[2650,4000,450],[4000,4250,404],[4250,6100,450]],platforms:[[550,710,350],[2540,2610,415],[3200,3380,340],[4500,4640,340]]},
 {name:'The River of Life',subtitle:'The last gate opens toward morning',theme:'river',boss:'king',verse:{text:'And he shewed me a pure river of water of life, clear as crystal.',ref:'Revelation 22:1'},inspiration:'Restoration · Revelation 21–22',story:'The journey ends beside a river of living light. Defeat the last shadow and walk toward the morning. These fictional guardians symbolize obstacles, not biblical characters.',ground:[[0,900,450],[1040,2150,450],[2290,4000,450],[4140,6100,450]],platforms:[[940,1000,415],[2190,2250,415],[4040,4100,415],[2800,2980,340]]},
];
for (const c of chapters) {
 const id=STAGES.length;
 STAGES.push({id,name:c.name,subtitle:c.subtitle,theme:c.theme,verse:c.verse,story:c.story,inspiration:c.inspiration,length:6100,start:100,exit:5960,par:330,ground:c.ground,platforms:c.platforms,
 motes:[...line(220,380,420,4),...line(1280,1450,370,4),...arc(2150,2310,360,50,4),...line(2800,2960,300,4),...line(4650,4800,420,4),...arc(5900,6020,410,30,3)],
 signs:[{x:180,key:'move'},{x:650,key:'jump'},{x:1100,key:'parry'},{x:5100,key:'red'}],
 props:Array.from({length:23},(_,i)=>({t:(c.theme==='city'?['pillar','arch','lantern','ruinWall']:c.theme==='valley'?['rock','deadTree','tent','broken']:c.theme==='mountain'?['rock','obelisk','pillar','lantern']:['olive','fountain','flowers','gate'])[i%4] as Prop['t'],x:80+i*260,s:0.8+(i%3)*0.2})),
 encounters:[
 {trigger:1300,arena:[1100,2000],checkpoint:1170,waves:[[{kind:'husk',x:1750},{kind:'caster',x:1900}],[{kind:c.theme==='valley'?'sentinel':'wisp',x:1500,y:c.theme==='valley'?undefined:300}]]},
 {trigger:3000,arena:[2750,3900],checkpoint:2830,waves:[[{kind:'sentinel',x:3500},{kind:'lurker',x:3750}],[{kind:'caster',x:3650},{kind:'wisp',x:3100,y:300}]]},
 {trigger:4500,arena:[4350,4950],checkpoint:4420,waves:[[{kind:'sentinel',x:4750},{kind:'husk',x:4860}]]},
 {trigger:5320,arena:[5060,5880],checkpoint:5140,boss:true,waves:[[{kind:c.boss,x:5640}]]}
 ]});
}
const art=['desert.webp','world-02-flooded.webp','world-03-garden.webp','world-04-mountain.webp','world-05-valley.webp','world-06-city.webp','world-07-river.webp'];
const bosses=['dune-warden','tide-serpent','thorn-sentinel','storm-watcher','iron-colossus','keeper-of-shadows','hollow-king'];
STAGES.forEach((s,i)=>{s.background='assets/'+art[i];s.bossArt='assets/boss-'+bosses[i]+'.webp';});
STAGES[0].inspiration='The wilderness journey · Exodus 16–17';STAGES[0].story='Carry the light through a wilderness of broken roads. Learn to stand, defend, and move forward with trust.';
STAGES[1].inspiration='The receding flood · Genesis 8–9';STAGES[1].story='The waters have receded, but the crossing is not yet safe. Find a steady path through the remnants of the flood.';
STAGES[2].inspiration='Tending and keeping · Genesis 2:15';STAGES[2].story='A neglected garden waits behind guarded gates. Learn to protect what is good and seek an opening without rushing.';

// Regular encounters are moving skirmishes; guardians retain sealed arenas.
STAGES.forEach(s=>s.encounters.forEach(e=>{if(!e.boss)e.openRoad=true;}));

STAGES[0].ground.push([1950,2070,282]);
STAGES[0].platforms.push([1780,1910,356],[2090,2220,312]);
STAGES[0].motes.push(...arc(1945,2070,250,24,4));
STAGES[3].ground.push([2250,2340,288]);
STAGES[3].platforms.push([2130,2240,365],[2360,2470,350]);
STAGES[5].ground.push([2390,2470,286]);
STAGES[5].platforms.push([2240,2370,360],[2490,2580,350]);

STAGES[0].signs.push({x:650,key:'dash'},{x:1850,key:'wall'});


// Authored traversal pockets: teach on a safe approach, then repeat between fights.
// Arena floors and enemy wave positions are intentionally preserved.
STAGES.forEach((s,land)=>{
  const first=s.encounters[0].arena[0];
  const x=Math.max(s.start+150,first-490);
  const floor=s.ground.find(g=>x>=g[0]&&x+320<g[1])?.[2]??450;
  // Opposing faces form a wall-spring corridor; the second summit rewards the air jump.
  s.ground.push([x,x+54,floor-175],[x+230,x+290,floor-265]);
  s.platforms.push([x+100,x+174,floor-100],[x+305,x+400,floor-150]);
  s.motes.push(...arc(x+65,x+220,floor-205,30,5));
  s.signs.push({x:x-65,key:'wall'},{x:x+120,key:'double'});
  // Different silhouettes and spacing create a distinct second ascent in each land.
  const a=s.encounters[0].arena[1]+70,b=s.encounters[1].arena[0]-50;
  if(b-a>300){
    const gy=s.ground.find(g=>a>=g[0]&&a+80<g[1])?.[2]??450;
    s.ground.push([a,a+55,gy-150-(land%3)*18]);
    s.platforms.push([a+100,a+185,gy-95],[b-80,b,gy-185]);
    s.motes.push(...arc(a+100,b-30,gy-210,20,4));
  }
});

// Level-design branch: authored first-land demo, keeping the shared combat contracts.
STAGES[0]=desertDemo(STAGES[0]);
