import { WEAPONS, type WeaponId, type Rank } from '../core/weapons';
type V={x:number;y:number};
const C={outline:'#111e30'};
/** Same silhouettes in the hand, on the ground and in the equipment display. +Y is blade/shaft axis. */
export function drawWeapon(ctx:CanvasRenderingContext2D,id:WeaponId,rank:Rank,hand:V,a:number,time:number,swinging=false,paired=true):void {
  if(id==='hammer'){drawHammer(ctx,hand,a,swinging,time);return;}
  const w=WEAPONS[id];
  ctx.save();ctx.translate(hand.x,hand.y);ctx.rotate(-a);
  ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#101b2c';ctx.lineWidth=2;
  const metal=ctx.createLinearGradient(-7,0,8,0);metal.addColorStop(0,'#eff8f3');metal.addColorStop(.4,w.color);metal.addColorStop(.55,'#526779');metal.addColorStop(1,'#d5e7e6');
  ctx.fillStyle=metal;
  const polygon=(points:number[][])=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();};
  const shaft=(end:number)=>{ctx.strokeStyle='#101b2c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,end);ctx.stroke();ctx.strokeStyle='#9e794d';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#101b2c';ctx.lineWidth=1.4;};
  // Rank light is concentrated around the forged core, never a neon outline.
  if(rank>=2){
    const pulse=.85+Math.sin(time*3.2)*.12,radius=rank===3?31:25;
    const glow=ctx.createRadialGradient(0,23,1,0,23,radius);
    glow.addColorStop(0,`${w.color}${rank===3?'38':'25'}`);glow.addColorStop(1,`${w.color}00`);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse;ctx.fillStyle=glow;ctx.fillRect(-radius,23-radius,radius*2,radius*2);ctx.restore();
  }
  if(id==='sling'){
    drawSling(ctx,w.color,rank,swinging,time);
    ctx.restore();
    return;
  }
  if(id==='iron'){
    shaft(26);polygon([[-12,20],[-17,25],[-17,37],[-12,42],[12,42],[17,37],[17,25],[12,20]]);
    ctx.strokeStyle=w.color;ctx.lineWidth=2;ctx.strokeRect(-10,24,20,14);
  }else if(id==='tide'||id==='thorn'){
    shaft(w.length-13);
    polygon(id==='tide'?[[0,68],[-6,49],[0,41],[6,49]]:[[0,58],[-6,39],[0,32],[8,34],[13,45],[8,54]]);
    if(id==='thorn'){ctx.fillStyle='#91ba81';polygon([[-3,29],[-10,22],[-2,24],[3,18],[3,30]]);}
  }else{
    shaft(8);ctx.fillStyle=metal;
    const len=w.length,width=id==='river'?9:id==='watch'?4:6;
    polygon(id==='storm'?[[0,7],[-width,10],[-2,len-7],[8,len],[6,len-13],[4,8]]:[[0,7],[-width,12],[-width*.7,len-9],[0,len],[width*.7,len-9],[width,12]]);
    ctx.strokeStyle='#b99050';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-9,9);ctx.quadraticCurveTo(0,5,9,9);ctx.stroke();
  }
  // Rank II: a forged collar plus separate side fins; rank III: crown and inset runes.
  if(rank>=2){ctx.fillStyle='#f0cd83';ctx.strokeStyle='#332a25';ctx.lineWidth=1;ctx.fillRect(-5,13,10,4);
    polygon([[-4,17],[-10,21],[-7,29],[-3,24]]);polygon([[4,17],[10,21],[7,29],[3,24]]);}
  if(rank>=3){ctx.fillStyle='#fff0c6';ctx.strokeStyle='#76582d';
    polygon([[-5,30],[-8,35],[-4,39],[0,35],[4,39],[8,35],[5,30],[0,32]]);
    ctx.fillStyle=w.color;for(let i=0;i<3;i++){ctx.save();ctx.translate(0,21+i*5);ctx.rotate(Math.PI/4);ctx.fillRect(-1.3,-1.3,2.6,2.6);ctx.restore();}}
  ctx.restore();
  if(id==='watch'&&paired)drawWeapon(ctx,id,rank,{x:hand.x-13,y:hand.y+9},a-.45,time,swinging,false);
}
function drawSling(ctx:CanvasRenderingContext2D,color:string,rank:Rank,releasing:boolean,time:number):void{
  const stroke=(width:number,style:string,draw:()=>void)=>{ctx.strokeStyle=style;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();draw();ctx.stroke();};
  // Carved grip and forked dawnwood frame.
  stroke(7,C.outline,()=>{ctx.moveTo(0,18);ctx.quadraticCurveTo(-2,8,0,0);ctx.lineTo(-8,-15);});
  stroke(7,C.outline,()=>{ctx.moveTo(0,0);ctx.lineTo(8,-15);});
  stroke(4,'#8a6549',()=>{ctx.moveTo(0,17);ctx.lineTo(-1,5);});
  stroke(4,color,()=>{ctx.moveTo(-8,-15);ctx.quadraticCurveTo(-10,-19,-7,-22);});
  stroke(4,color,()=>{ctx.moveTo(8,-15);ctx.quadraticCurveTo(10,-19,7,-22);});
  if(rank>=2){
    // A second fork brace and two visible forged ferrules mark the first upgrade.
    stroke(2.4,'#f4d38b',()=>{ctx.moveTo(-8,-15);ctx.quadraticCurveTo(0,-10,8,-15);});
    ctx.fillStyle='#f1ce82';ctx.strokeStyle='#553d2b';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(-11,-19,5,4,1);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.roundRect(6,-19,5,4,1);ctx.fill();ctx.stroke();
  }
  if(rank===3){
    // Rank III adds a twin crown and an inset, legible rune at the grip.
    ctx.fillStyle='#fff0bf';ctx.strokeStyle='#72522e';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-8,-22);ctx.lineTo(-5,-29);ctx.lineTo(-1,-23);ctx.lineTo(0,-31);ctx.lineTo(2,-23);ctx.lineTo(7,-29);ctx.lineTo(8,-22);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,7,2.2,0,Math.PI*2);ctx.fill();
  }
  // A brief relaxed string marks the engine's release window; the real bolt is simulation-owned.
  stroke(rank>=2?2.6:2,color,()=>{
    ctx.moveTo(-7,-22);
    if(releasing){ctx.quadraticCurveTo(-4,-10,-1,0);ctx.quadraticCurveTo(1,-8,7,-22);}
    else{ctx.quadraticCurveTo(-7,-8,-2,1);ctx.quadraticCurveTo(0,3,2,1);ctx.quadraticCurveTo(7,-8,7,-22);}
  });
  if(!releasing){
    ctx.fillStyle=rank===3?'#e8fcff':color;ctx.strokeStyle='#173343';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(0,5,rank===3?3.3:2.8,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  if(rank>=3){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+Math.sin(time*4)*.08;
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,7,1.1,0,Math.PI*2);ctx.fill();ctx.restore();
  }
}
function drawHammer(ctx: CanvasRenderingContext2D, hand: V, a: number, swinging: boolean, time:number): void {
    const d={x:Math.sin(a),y:Math.cos(a)};
    const head={x:hand.x+d.x*31,y:hand.y+d.y*31};
    ctx.save();
    // A compact halo and deterministic tongues of fire, behind the metal head.
    ctx.globalCompositeOperation='lighter';
    const glow=ctx.createRadialGradient(head.x,head.y,2,head.x,head.y,swinging?33:25);
    glow.addColorStop(0,'rgba(255,220,110,0.55)');
    glow.addColorStop(.45,'rgba(255,100,22,0.20)');
    glow.addColorStop(1,'rgba(255,65,10,0)');
    ctx.fillStyle=glow;ctx.fillRect(head.x-35,head.y-35,70,70);
    ctx.globalCompositeOperation='source-over';
    for(let i=0;i<5;i++){
      const x=head.x+(i-2)*4;
      const wave=Math.sin(time*11+i*2.3);
      const y=head.y-4+Math.sin(i*1.9)*3;
      const length=12+(swinging?10:4)+wave*3;
      ctx.fillStyle=i%2?'#ff9c27cc':'#f25e20bb';
      ctx.beginPath();ctx.moveTo(x-5,y+4);
      ctx.bezierCurveTo(x-10,y-5,x+wave*6,y-length+5,x+wave*4,y-length);
      ctx.bezierCurveTo(x+wave*4+2,y-length+9,x+9,y-3,x+5,y+4);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='#ffe8a6dd';ctx.beginPath();ctx.moveTo(x-2,y+3);ctx.quadraticCurveTo(x+wave*3,y-length*.65,x+3,y+3);ctx.fill();
    }
    // Wrapped handle.
    ctx.strokeStyle=C.outline;ctx.lineWidth=6.5;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hand.x-d.x*5,hand.y-d.y*5);ctx.lineTo(head.x,head.y);ctx.stroke();
    ctx.strokeStyle='#75432c';ctx.lineWidth=4;ctx.stroke();
    const n={x:-d.y,y:d.x};
    ctx.strokeStyle='#d6a24f';ctx.lineWidth=1.5;
    for(let k=0;k<4;k++){const t=k*5;ctx.beginPath();ctx.moveTo(hand.x+d.x*t+n.x*2,hand.y+d.y*t+n.y*2);ctx.lineTo(hand.x+d.x*(t+2)-n.x*2,hand.y+d.y*(t+2)-n.y*2);ctx.stroke();}
    // Broad forged head. Its face stays readable throughout the original combo.
    ctx.translate(head.x,head.y);ctx.rotate(Math.atan2(d.y,d.x));
    const metal=ctx.createLinearGradient(-7,-14,7,14);
    metal.addColorStop(0,'#fff4cb');metal.addColorStop(.35,'#c7b9a1');metal.addColorStop(.55,'#6e6873');metal.addColorStop(1,'#b18a53');
    ctx.fillStyle=metal;ctx.strokeStyle=C.outline;ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(-7,-10);ctx.lineTo(-3,-14);ctx.lineTo(5,-14);ctx.lineTo(9,-10);ctx.lineTo(9,10);ctx.lineTo(5,14);ctx.lineTo(-3,14);ctx.lineTo(-7,10);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#f7ca69';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-11);ctx.lineTo(5,-11);ctx.moveTo(-4,11);ctx.lineTo(5,11);ctx.stroke();
    ctx.fillStyle='#fff0ac';ctx.beginPath();ctx.arc(1,0,3.2,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

