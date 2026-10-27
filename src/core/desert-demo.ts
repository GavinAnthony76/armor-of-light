import type {StageDef} from './levels';
export const DESERT_ZONES=[
 {x:0,name:'The Silent Approach',goal:'Follow the extinguished lamps toward the aqueduct.'},
 {x:620,name:'The Broken Aqueduct',goal:'Climb the broken masonry. Wall jumps and a second leap open the upper route.'},
 {x:1300,name:'The Caravan Court',goal:'Face the shadows. Their weapons are yours only if you choose to take them.'},
 {x:2350,name:'The Sunken Archive',goal:'Explore the upper ledges, or follow the lower passage.'},
 {x:4350,name:'The Windward Crossing',goal:'Read the landings. A lower ledge can catch a missed leap.'},
 {x:5350,name:'The Beacon Stair',goal:'Climb toward the last watchlight. The guardian waits beyond.'},
 {x:6200,name:'The Warden’s Court',goal:'Defeat the Dune Warden, then carry the ember to the beacon.'},
];
export function desertDemo(base:StageDef):StageDef {
 const row=(a:number,b:number,y:number,n=4):[number,number][]=>Array.from({length:n},(_,i)=>[a+(b-a)*i/(n-1),y]);
 return {...base,length:7600,exit:7460,par:340,start:120,
 ground:[[0,700,450],[700,754,310],[754,980,450],[980,1040,200],[1040,2600,450],[2600,2660,350],[2660,3300,480],[3300,4550,450],[4680,4880,410],[5010,5490,450],[5490,5550,330],[5550,5780,450],[5780,5840,230],[5840,7600,450]],
 platforms:[[360,510,365],[810,910,350],[1080,1210,305],[2380,2510,350],[2740,2860,365],[2890,3030,275],[3090,3220,350],[4555,4675,485],[4885,5005,485],[5200,5310,345],[5580,5710,350],[5870,5990,315],[6030,6150,390]],
 motes:[...row(240,320,415,3),...row(380,490,330),...row(790,910,290),...row(987,1030,170,3),...row(1100,1200,270),...row(1800,1940,415),...row(2400,2490,315),...row(2910,3010,240),...row(2750,3100,445),...row(3900,4020,415),...row(4540,4700,350),...row(4880,5020,355),...row(5600,5700,315),...row(5790,5830,195,3),...row(7300,7440,415)],
 signs:[{x:180,key:'move'},{x:340,key:'jump'},{x:640,key:'wall'},{x:850,key:'double'},{x:1340,key:'attack'},{x:1510,key:'block'},{x:2350,key:'dash'},{x:3400,key:'parry'},{x:4440,key:'jump'},{x:5460,key:'wall'},{x:6260,key:'red'}],
 props:[{t:'rock',x:80},{t:'lantern',x:230},{t:'broken',x:540},{t:'arch',x:650},{t:'pillar',x:1050},{t:'tent',x:1340},{t:'tent',x:2150},{t:'palm',x:1720},{t:'ruinWall',x:2420},{t:'obelisk',x:2800},{t:'ruinWall',x:3180},{t:'lantern',x:3330},{t:'arch',x:3850},{t:'post',x:4480},{t:'post',x:4720},{t:'post',x:5050},{t:'rock',x:5320},{t:'lantern',x:5420},{t:'pillar',x:5790},{t:'arch',x:6150},{t:'obelisk',x:6240},{t:'pillar',x:7050},{t:'lantern',x:7380},{t:'gate',x:7500}],
 encounters:[
 {trigger:1460,arena:[1300,2300],checkpoint:1370,openRoad:true,waves:[[{kind:'husk',x:1780}],[{kind:'husk',x:2080},{kind:'husk',x:1570,delay:1.2}]]},
 {trigger:3470,arena:[3300,4350],checkpoint:3370,openRoad:true,waves:[[{kind:'caster',x:3960},{kind:'husk',x:3710,delay:1}],[{kind:'wisp',x:4000,y:330},{kind:'husk',x:3550,delay:1}]]},
 {trigger:5130,arena:[5050,5350],checkpoint:5080,openRoad:true,waves:[[{kind:'husk',x:5290}]]},
 {trigger:6360,arena:[6200,7150],checkpoint:6290,boss:true,waves:[[{kind:'warden',x:6880}]]},
 ]};
}
