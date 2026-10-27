import type { Lightstone } from '../core/ranged';

/** Rank changes are geometry, number of stones and trails—not a color swap. */
export function drawLightstones(ctx:CanvasRenderingContext2D,stones:Lightstone[]):void {
  ctx.save();
  for(const b of stones){
    const radius=b.heavy?6:4;
    ctx.strokeStyle=b.rank===3?'#fff2b0':'#79efff';ctx.lineWidth=b.heavy?5:2;
    ctx.globalAlpha=.5;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*.045,b.y-b.vy*.045);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.globalAlpha=1;ctx.fillStyle='#f4ffff';
    ctx.shadowColor=b.rank===3?'#ffd277':'#43ddff';ctx.shadowBlur=14;
    ctx.beginPath();ctx.arc(b.x,b.y,radius,0,Math.PI*2);ctx.fill();
    if(b.rank>=2){
      ctx.strokeStyle='#fff0c4';ctx.lineWidth=1;ctx.beginPath();
      ctx.moveTo(b.x,b.y-9);ctx.lineTo(b.x+9,b.y);ctx.lineTo(b.x,b.y+9);ctx.lineTo(b.x-9,b.y);ctx.closePath();ctx.stroke();
    }
  }
  ctx.restore();
}
