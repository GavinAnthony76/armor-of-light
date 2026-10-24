import { WEAPONS, type WeaponId, type Rank, ROMAN } from './core/weapons';
import { Player } from './core/player';
import { HeroView } from './render/hero';
import { drawWeapon } from './render/weapons';
const gallery=document.getElementById('gallery')!;
const views:{ctx:CanvasRenderingContext2D;p:Player;hero:HeroView;id:WeaponId;rank:Rank}[]=[];
for(const id of Object.keys(WEAPONS) as WeaponId[]){
 const row=document.createElement('section');row.className='row';
 const label=document.createElement('div');label.className='label';label.textContent=WEAPONS[id].name;
 const small=document.createElement('small');small.textContent=WEAPONS[id].benefit;label.append(small);row.append(label);
 for(const rank of [1,2,3] as Rank[]){
  const tile=document.createElement('div');tile.className='tile';const c=document.createElement('canvas');c.width=480;c.height=320;
  const tag=document.createElement('div');tag.className='rank';tag.textContent=id==='hammer'?'Signature · always available':`Rank ${ROMAN[rank]}`;
  tile.append(c,tag);row.append(tile);
  const p=new Player(0,0,8);p.onGround=true;if(id!=='hammer')p.equipment={alternate:{id,rank},equipped:'alternate'};
  views.push({ctx:c.getContext('2d')!,p,hero:new HeroView(),id,rank});
 }
 gallery.append(row);
}
let time=0,last=performance.now();
function frame(now:number){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
 for(const v of views){const {ctx,p,hero,id,rank}=v;ctx.clearRect(0,0,480,320);hero.update(p,dt);
  ctx.save();ctx.translate(130,270);ctx.scale(2.65,2.65);hero.draw(ctx,p);ctx.restore();
  ctx.save();ctx.translate(315,240);ctx.scale(2.3,2.3);drawWeapon(ctx,id,rank,{x:0,y:0},2.7,time);ctx.restore();
 }
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);
