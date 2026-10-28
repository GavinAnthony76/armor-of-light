import type { Enemy } from '../core/enemy';
import type { Clip, ImageSpec } from '../production/types';

/** Read-only cutout animation. All positions are relative to the original feet. */
export function drawPaintedEnemyBody(
  ctx:CanvasRenderingContext2D, e:Enemy, im:HTMLImageElement, spec:ImageSpec,
  motion:NonNullable<Clip['bodyMotion']>, time:number, duration?:number,
):void {
  const k=duration?Math.min(1,Math.max(0,time/duration)):0;
  const wave=Math.sin(e.anim*2+e.id);
  const slam=e.attack?.id==='slam';
  const leap=e.attack?.id==='lurkerLeap'||e.attack?.id==='wispDash';
  let lean=wave*.012, crouch=0;
  if(motion==='windup'){lean=(slam?-.12:leap?-.14:-.07)*Math.sqrt(k);crouch=k*.025;}
  if(motion==='active'){lean=(slam?.25:leap?.15:.10)*Math.sin(Math.min(1,k*2)*Math.PI/2);crouch=slam?.08:0;}
  if(motion==='recover'){lean=(slam?.25:.10)*(1-k);crouch=slam?.08*(1-k):0;}
  if(motion==='stagger'||motion==='hurt')lean=-.12*(1-k);
  if(motion==='dying'){lean=-.25*k;crouch=.15*k;}
  const moving=motion==='move'&&Math.abs(e.vx)>15&&e.onGround;
  const step=moving?Math.sin(e.stride)*.14:0;
  const h=e.h/spec.scale,top=448-h,hip=448-h*.30;
  const neck=448-h*.77,foot=448;
  // Source is a calibrated 512-square, armless body. Regions overlap by two
  // source pixels to avoid seams; no opaque rectangle or contact shadow.
  const region=(x:number,y:number,w:number,height:number,px:number,py:number,angle:number)=>{
    ctx.save();ctx.translate(px,py);ctx.rotate(angle);
    ctx.drawImage(im,x,y,w,height,x-px,y-py,w,height);ctx.restore();
  };
  // Flying actors store their body CENTER in core; ground actors store feet.
  ctx.save();ctx.translate(e.x,e.y+(e.cfg.flying?e.h/2:0));ctx.scale(e.facing*spec.scale,spec.scale);
  ctx.translate(-spec.anchor[0],-spec.anchor[1]);
  if(motion==='spawn'){
    ctx.translate(256,448);ctx.scale(1,.2+.8*Math.min(1,time/.6));ctx.translate(-256,-448);
  }
  // Damage brightness affects painted parts only, never the gold/red warnings.
  if(e.flash>0)ctx.filter='brightness(1.8)';
  if(e.kind==='wisp'){
    ctx.translate(256,448-h/2);ctx.rotate(lean);
    const pulse=1+Math.sin(e.anim*5)*.025;
    ctx.scale(pulse,pulse);ctx.drawImage(im,-256,-448+h/2);
  }else{
    // Grounded legs remain separate and move in opposition; quadrupeds use
    // the same split at their measured low hip rather than stretching a still.
    const legTop=e.kind==='lurker'?448-h*.38:hip;
    region(0,legTop-2,256,foot-legTop+2,240,legTop,-step);
    region(256,legTop-2,256,foot-legTop+2,272,legTop,step);
    ctx.translate(256,hip+h*crouch);ctx.rotate(lean);ctx.translate(-256,-hip);
    region(0,neck-2,512,legTop-neck+4,256,hip,0);
    region(0,top-2,512,neck-top+4,256,neck,-lean*.35+wave*.008);
  }
  ctx.restore();
}
