import type {StageDef} from './levels';
export const DESERT_ZONES=[
 {x:0,name:'The Silent Approach',goal:'Follow the extinguished lamps toward the aqueduct.'},
 {x:620,name:'The Broken Aqueduct',goal:'Climb the broken masonry. Wall jumps and a second leap open the upper route.'},
 {x:1300,name:'The Caravan Court',goal:'Face the shadows. Their weapons are yours only if you choose to take them.'},
 {x:1850,name:'The Sunken Archive',goal:'Descend into the archive. Defeat its keeper and recover the Beacon Seal.'},
 {x:4350,name:'The Windward Crossing',goal:'Read the landings. A lower ledge can catch a missed leap.'},
 {x:5350,name:'The Beacon Stair',goal:'Climb toward the last watchlight. The guardian waits beyond.'},
 {x:6200,name:'The Warden’s Court',goal:'Defeat the Dune Warden, then carry the ember to the beacon.'},
];
export function desertDemo(base:StageDef):StageDef {
 const row=(a:number,b:number,y:number,n=4):[number,number][]=>Array.from({length:n},(_,i)=>[a+(b-a)*i/(n-1),y]);
 return {...base,voidY:1140,length:7600,exit:7460,par:340,start:120,
 ground:[[0,700,450],[700,754,310],[754,980,450],[980,1040,200],[1040,2000,450],[2170,3300,900],[3300,3360,790],[3360,3420,900],[3420,3480,670],[3480,3550,900],[3550,3610,550],[3610,3700,450],[3700,3760,-1200],[3760,4550,450],[4680,4880,410],[5010,5490,450],[5490,5550,330],[5550,5780,450],[5780,5840,230],[5840,7600,450]],
 platforms:[[360,510,365],[810,910,350],[1080,1210,305],[1960,2130,570],[2110,2260,710],[2440,2590,790],[2670,2830,690],[2910,3080,770],[3180,3290,800],[3370,3450,760],[3490,3570,640],[4555,4675,485],[4885,5005,485],[5200,5310,345],[5580,5710,350],[5870,5990,315],[6030,6150,390]],
 motes:[...row(240,320,415,3),...row(380,490,330),...row(790,910,290),...row(987,1030,170,3),...row(1100,1200,270),...row(1800,1940,415),...row(2020,2100,535),...row(2140,2230,675),...row(2460,2570,755),...row(2690,2810,655),...row(2930,3050,735),...row(3220,3290,865),...row(3440,3470,635),...row(3560,3590,515),...row(3900,4020,415),...row(4540,4700,350),...row(4880,5020,355),...row(5600,5700,315),...row(5790,5830,195,3),...row(7300,7440,415)],
 signs:[{x:180,key:'move'},{x:340,key:'jump'},{x:640,key:'wall'},{x:850,key:'double'},{x:1340,key:'attack'},{x:1510,key:'block'},{x:1900,key:'jump'},{x:2450,key:'parry'},{x:3360,key:'wall'},{x:4440,key:'jump'},{x:5460,key:'wall'},{x:6260,key:'red'}],
 props:[{t:'rock',x:80},{t:'lantern',x:230},{t:'broken',x:540},{t:'arch',x:650},{t:'pillar',x:1050},{t:'tent',x:1340},{t:'tent',x:2150},{t:'palm',x:1720},{t:'ruinWall',x:2420},{t:'obelisk',x:2800},{t:'ruinWall',x:3180},{t:'lantern',x:3330},{t:'arch',x:3850},{t:'post',x:4480},{t:'post',x:4720},{t:'post',x:5050},{t:'rock',x:5320},{t:'lantern',x:5420},{t:'pillar',x:5790},{t:'arch',x:6150},{t:'obelisk',x:6240},{t:'pillar',x:7050},{t:'lantern',x:7380},{t:'gate',x:7500}],
 encounters:[
 {trigger:1460,arena:[1300,1900],checkpoint:1370,openRoad:true,waves:[[{kind:'husk',x:1780}],[{kind:'husk',x:1860},{kind:'husk',x:1570,delay:1.2}]]},
 {trigger:2760,arena:[2700,3280],checkpoint:2800,sealGuardian:true,waves:[[{kind:'sentinel',x:3070}]]},
 {trigger:5130,arena:[5050,5350],checkpoint:5080,openRoad:true,waves:[[{kind:'husk',x:5290}]]},
 {trigger:6360,arena:[6200,7150],checkpoint:6290,boss:true,waves:[[{kind:'warden',x:6880}]]},
 ]};
}
