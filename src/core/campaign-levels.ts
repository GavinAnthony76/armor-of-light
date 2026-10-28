import type { StageDef } from './levels';
import type { EnemyKind } from './enemy';
import { LAND_WEAPONS } from './weapons';
import type { JourneyDef } from './journey-types';

const X=[0,1400,1600,1800,2000,2850,3050,3250,3450,3650,4200,4500,4700,4900,5100,5850,6050,6250,6450,6650,8100];
const profiles:{
  depths:[number,number];rooms:[string,string,string];minis:[string,string];
  kinds:[EnemyKind,EnemyKind];boss:EnemyKind;hint:string;
}[]=[
  {depths:[900,120],rooms:['Drowned Causeway','The Sunken Pump','Bell-Tower Crossing'],minis:['Marshjaw','The Bellwarden'],kinds:['lurker','sentinel'],boss:'serpent',hint:'Descend beneath the false bridge; the pump guardian holds the crossing.'},
  {depths:[90,900],rooms:['Olive Stair','Canopy Sanctuary','The Root Crypt'],minis:['Briar Duelist','Rootmaw'],kinds:['sentinel','lurker'],boss:'thorn',hint:'Climb the living stair. The garden gate answers to the canopy guardian.'},
  {depths:[150,1020],rooms:['Pilgrim Ascent','The Wind Belfry','Buried Observatory'],minis:['Gale Harrier','The Glass Seer'],kinds:['wisp','caster'],boss:'watcher',hint:'The upper belfry guards the pass; the lower trail is a detour.'},
  {depths:[1050,90],rooms:['Ashen Descent','The Cinder Works','Furnace Crown'],minis:['Cinder Brute','Iron Oathkeeper'],kinds:['husk','sentinel'],boss:'colossus',hint:'Follow the furnace lamps down into the works, not across the dead gantry.'},
  {depths:[60,960],rooms:['Broken Rampart','The Watch Spire','Underwall Reliquary'],minis:['The Night Scribe','Grave Hound'],kinds:['caster','lurker'],boss:'keeper',hint:'Scale the watch spire. Its keeper seals the street beyond.'},
  {depths:[960,60],rooms:['Last Pilgrim Road','The Deep Spring','Dawn Sanctuary'],minis:['Spring Oathkeeper','Dawn Revenant'],kinds:['sentinel','husk'],boss:'king',hint:'The deep spring is below the abandoned aqueduct. Follow its blue lamps.'},
];
const interpolate=(a:number,b:number,n:number)=>Math.round(a+(b-a)*n/4);

/** Six authored route profiles: two mandatory vertical excursions per land.
 * Shared construction keeps geometry, checkpoints, clues and gates in sync;
 * each land has different elevations, elite archetypes, secrets and guardian.
 */
export function buildCampaignLand(base:StageDef):StageDef {
  const p=profiles[base.id-1],a=p.depths[0],b=p.depths[1];
  const ys=[450,...[1,2,3,4].map(n=>interpolate(450,a,n)),
    ...[1,2,3,4].map(n=>interpolate(a,450,n)),450,
    ...[1,2,3,4].map(n=>interpolate(450,b,n)),b,
    ...[1,2,3,4].map(n=>interpolate(b,450,n)),450];
  let ground=X.slice(0,-1).map((x,i)=>[x,X[i+1],ys[i]] as [number,number,number]);
  const gaps=base.theme==='flood'?[[720,860],[4180,4320]]:base.theme==='mountain'?[[760,910]]:base.theme==='valley'?[[780,930]]:base.theme==='river'?[[780,910]]:[];
  for(const [a,b] of gaps)ground=ground.flatMap(([x,z,y])=>z<=a||x>=b?[[x,z,y]]:([[x,Math.min(z,a),y],[Math.max(x,b),z,y]].filter(([l,r])=>r>l))) as [number,number,number][];
  const route=ground.map(([x,z,y])=>[Math.round((x+z)/2),y] as [number,number]);
  const platforms:[number,number,number][]=[
    [470,640,340],[720,890,230],[980,1130,120],
    // An abandoned upper branch deliberately bypasses the first room's entrance,
    // but cannot bypass its guardian's gate.
    [1440,1660,Math.min(340,a-100)],[1800,2010,Math.min(320,a-180)],
    [2180,2390,Math.min(340,a-180)],[2550,2790,Math.min(320,a-180)],
    [2950,3190,Math.min(330,a-170)],
    [3890,4070,340],[4250,4420,230],
    [5210,5400,b-120],[5580,5760,b-220],
    [6350,6500,Math.min(250,ys[17]-120)],
  ];
  const expedition:JourneyDef={
    route,
    bossWeapon:LAND_WEAPONS[base.id],
    zones:[
      {x:0,name:p.rooms[0],hint:p.hint},
      {x:1950,name:p.rooms[1],hint:`Defeat ${p.minis[0]}, then return to the sealed crossing.`},
      {x:3660,name:'The Returning Road',hint:`Find ${p.rooms[2]}; the second seal lies ${b>450?'below':'above'} the road.`},
      {x:5000,name:p.rooms[2],hint:`Defeat ${p.minis[1]} to break the second seal.`},
      {x:6500,name:'Guardian Approach',hint:'Prepare your weapon. The guardian waits beyond the last lamps.'},
    ],
    gates:[
      {id:`land${base.id}-first`,name:p.minis[0],x:3650,y:450,encounter:1},
      {id:`land${base.id}-second`,name:p.minis[1],x:6450,y:ys[18],encounter:3},
    ],
    chests:[
      {id:`l${base.id}-wayside`,name:'Pilgrim Cache',x:600,y:340,reward:'treasure',value:450},
      {id:`l${base.id}-rooftop`,name:'Hidden Reliquary',x:1060,y:120,hidden:true,reward:'relic',value:900},
      {id:`l${base.id}-forge-a`,name:'First Forge',x:1300,y:450,reward:'upgrade'},
      // Stable cache identities; different lands offer different alternate discoveries.
      {id:`l${base.id}-sling`,name:'Forgotten Armory',x:2600,y:a,hidden:true,reward:'weapon',weapon:(['sling','sunblade','sling','tide','thorn','storm'] as const)[base.id-1]},
      {id:`l${base.id}-healing`,name:'Keeper’s Provisions',x:2900,y:ys[5],reward:'heart'},
      {id:`l${base.id}-forge-b`,name:'Crossing Forge',x:3940,y:450,reward:'upgrade'},
      {id:`l${base.id}-false-road`,name:'Lost Offering',x:4320,y:230,hidden:true,reward:'treasure',value:1300},
      {id:`l${base.id}-relic`,name:'Sanctuary Relic',x:5670,y:b-220,hidden:true,reward:'relic',value:1100},
      {id:`l${base.id}-forge-c`,name:'Guardian Forge',x:6600,y:450,reward:'upgrade'},
      {id:`l${base.id}-rest`,name:'Last Provision',x:6800,y:450,reward:'heart'},
    ],
  };
  return {...base,layoutRevision:`expedition-${base.id}-1`,length:8100,exit:7970,par:540,voidY:1480,
    ground,platforms,afterBoss:[],expedition,
    motes:route.flatMap(([x,y])=>[[x-40,y-38],[x,y-48],[x+40,y-38]] as [number,number][]),
    signs:[{x:180,key:'move'},{x:450,key:'double'},{x:1200,key:'combo'},{x:3850,key:'dash'},{x:6750,key:'parry'}],
    props:base.props.filter(q=>q.x<1300||q.x>6700),
    encounters:[
      {trigger:1010,arena:[970,1370],checkpoint:1060,openRoad:true,waves:[[{kind:'husk',x:1190},{kind:'wisp',x:1300,y:320,delay:.8}]]},
      {trigger:2180,triggerY:a,arena:[2050,2820],checkpoint:2140,miniBoss:{name:p.minis[0],title:p.rooms[1],hp:14+base.id*2},
        waves:[[{kind:p.kinds[0],x:2650,y:p.kinds[0]==='wisp'?a-100:undefined}]]},
      {trigger:3790,arena:[3700,4170],checkpoint:3750,openRoad:true,waves:[[{kind:'caster',x:4070},{kind:'husk',x:3960,delay:.8}]]},
      {trigger:5200,triggerY:b,arena:[5140,5820],checkpoint:5220,miniBoss:{name:p.minis[1],title:p.rooms[2],hp:18+base.id*2},
        waves:[[{kind:p.kinds[1],x:5660}]]},
      {trigger:6940,arena:[6860,7790],checkpoint:6920,boss:true,waves:[[{kind:p.boss,x:7520}]]},
    ]};
}

export function addDesertTreasures(def:StageDef):StageDef {
  return {...def,expedition:{bossWeapon:'sunblade',
    route:[[120,450],[1370,450],[2050,675],[2300,900],[2800,900],[3400,760],[3550,640],[3820,450],[5100,450],[6370,450],[7460,450]],
    zones:[{x:0,name:'Desert Ruins',hint:'Explore the old road. The Archive below holds the Beacon Seal.'}],
    gates:[],
    chests:[
      {id:'desert-pilgrim',name:'Pilgrim Cache',x:430,y:450,reward:'treasure',value:400},
      {id:'desert-forge',name:'Ember Forge',x:1230,y:450,reward:'upgrade'},
      {id:'desert-sling',name:'Forgotten Hunter',x:2480,y:900,hidden:true,reward:'weapon',weapon:'sling'},
      {id:'desert-archive',name:'Archive Reliquary',x:2760,y:690,hidden:true,reward:'relic',value:1000},
      {id:'desert-return',name:'Return Forge',x:4010,y:450,reward:'upgrade'},
      {id:'desert-secret',name:'Wind-Worn Offering',x:5650,y:350,hidden:true,reward:'treasure',value:1500},
      {id:'desert-final',name:'Guardian Provisions',x:6180,y:450,reward:'heart'},
    ]}};
}
