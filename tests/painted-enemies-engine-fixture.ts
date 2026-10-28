/** Browser-only, bundled by the Python runner; never imported by the game. */
import { Enemy, ATTACKS, type EnemyKind, type EnemyState } from '../src/core/enemy';
import { DIFFICULTIES } from '../src/core/config';
import { productionAssets as assets } from '../src/production/assets';
import { ProductionScene, enemyVisual } from '../src/production/scene';
import { drawEnemy } from '../src/render/shadows';

const kinds:EnemyKind[]=['husk','wisp','caster','lurker','sentinel','warden'];
const attacks:Record<string,string[]>={husk:['huskSwing'],wisp:['wispDash'],caster:['casterOrb'],
  lurker:['lurkerSnap','lurkerLeap'],sentinel:['thrust1','thrust2'],warden:['sweep','slam','summon']};
const diff=DIFFICULTIES.challenging;
const scene=new ProductionScene(assets);
let evidence:{label:string;c:HTMLCanvasElement}[]=[];
function check(ok:unknown,message:string):asserts ok {if(!ok)throw Error(message);}
function enemy(kind:EnemyKind,state:EnemyState='move',attack=attacks[kind][0],progress=.7,facing=1){
  const e=new Enemy(kind,180,310,diff);
  e.state=state;e.attack=ATTACKS[attack];e.phase=2;e.anim=1.1;e.stride=1.2;
  e.onGround=true;e.vx=65;e.facing=facing;e.staggerDur=.8;
  e.t=progress*(enemyVisual(e,diff).duration??1);
  return e;
}
function canvas(){const c=document.createElement('canvas');c.width=360;c.height=370;return c;}
function render(e:Enemy,mode:'painted'|'procedural'|'body'='painted'){
  const c=canvas(),ctx=c.getContext('2d')!;
  const before=JSON.stringify(e);
  const art=scene.enemy(ctx,e,diff);
  if(mode==='body'){check(art?.draw(),'body binding decoded');}
  else drawEnemy(ctx,e,diff,1.1,mode==='painted'?art:undefined);
  check(JSON.stringify(e)===before,'rendering changed simulation');
  check(ctx.filter==='none'&&ctx.globalAlpha===1,'canvas style leaked');
  return c;
}
function pixels(c:HTMLCanvasElement){return c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;}
function same(a:HTMLCanvasElement,b:HTMLCanvasElement){const p=pixels(a),q=pixels(b);return p.every((v,i)=>v===q[i]);}
function imagePixels(im:HTMLImageElement){
  const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
  c.getContext('2d')!.drawImage(im,0,0);return pixels(c);
}
function gallery(rows:{label:string;c:HTMLCanvasElement}[]){
  evidence=rows;
  const host=document.createElement('section');host.id='engine-evidence';
  host.style.cssText='position:absolute;z-index:99999;left:0;top:0;background:#263544;color:white;display:grid;grid-template-columns:repeat(6,180px);font:12px sans-serif';
  for(const row of rows){
    const box=document.createElement('div');box.textContent=row.label;
    row.c.style.cssText='width:180px;height:185px;background:linear-gradient(90deg,#d5c8ac 50%,#263544 50%)';
    box.append(row.c);host.append(box);
  }
  document.querySelector('#engine-evidence')?.remove();document.body.append(host);
}

const qa={
  async init(manifest:unknown){assets.install(manifest);},
  async preload(){await Promise.all(kinds.map(k=>assets.preloadImage(k+'-painted-body')));},
  diagnostics(){return assets.diagnostics();},
  contacts(){
    return Object.fromEntries(kinds.map(kind=>{
      const rows=evidence.filter(r=>r.label.toLowerCase().startsWith(kind));
      const c=document.createElement('canvas');c.width=1080;c.height=Math.ceil(rows.length/3)*390;
      const ctx=c.getContext('2d')!;
      rows.forEach((r,i)=>{
        const x=(i%3)*360,y=Math.floor(i/3)*390;
        ctx.fillStyle='#d5c8ac';ctx.fillRect(x,y,180,390);
        ctx.fillStyle='#263544';ctx.fillRect(x+180,y,180,390);
        ctx.drawImage(r.c,x,y+20);
        ctx.fillStyle='#15121a';ctx.fillRect(x,y,360,20);
        ctx.fillStyle='white';ctx.font='15px sans-serif';ctx.fillText(r.label,x+5,y+16);
      });
      return [kind,c.toDataURL()];
    }));
  },
  async run(){
    const rows:{label:string;c:HTMLCanvasElement}[]=[];
    let poses=0,warnings=0,brightness=0;
    // Decode delivered PNG pixels, not merely a WebP/PNG support flag.
    const alpha=[];
    for(const kind of kinds){
      const im=await assets.preloadImage(kind+'-painted-body');check(im,kind+' image');
      const p=imagePixels(im);let clear=0,solid=0,hidden=0;
      for(let i=0;i<p.length;i+=4){if(!p[i+3]){clear++;if(p[i]||p[i+1]||p[i+2])hidden++;}if(p[i+3]===255)solid++;}
      check(clear>0&&solid>0&&hidden===0,kind+' decoded clean alpha');
      alpha.push({kind,clear,solid,hidden});
    }
    // Actual alpha-bearing shipped WebP (hero cutout) remains used by both editions.
    const webp=await assets.preloadImage('eliam-head');check(webp,'WebP decoded');
    const wp=imagePixels(webp);let transparent=0,visible=0;
    for(let i=3;i<wp.length;i+=4){if(wp[i]===0)transparent++;if(wp[i]>0)visible++;}
    check(transparent>0&&visible>0,'WebP decoded alpha, not an opaque panel');
    for(const kind of kinds){
      for(const state of ['move','spawn','stagger','hurt','dying'] as EnemyState[]){
        for(const facing of [-1,1])for(const progress of [.05,.5,.95]){
          const e=enemy(kind,state,undefined,progress,facing);const c=render(e);
          check(pixels(c).some((v,i)=>i%4===3&&v>0),kind+' visible '+state);poses++;
        }
        rows.push({label:kind+' '+state,c:render(enemy(kind,state))});
      }
      for(const attack of attacks[kind])for(const state of ['windup','active','recover'] as EnemyState[]){
        for(const facing of [-1,1])for(const progress of [.05,.5,.95]){
          render(enemy(kind,state,attack,progress,facing));poses++;
        }
        const e=enemy(kind,state,attack);
        if(state!=='windup'||!e.telegraphing)rows.push({label:kind+' '+attack+' '+state,c:render(e)});
        if(state==='windup'&&e.telegraphing){
          const plain=render(e,'procedural'),painted=render(e);
          // Compare solid warning pixels, not translucent glow composited over
          // intentionally different procedural/painted silhouettes.
          const box=e.hurtBox(),y=Math.floor(box.y-22-Math.sin(1.1*8)*2)-8;
          const crop=(c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(176,y,8,8).data;
          const baseline=crop(plain),paintedWarning=crop(painted);
          const color=e.attack?.heavy?[255,75,75]:[255,210,94],mask:number[]=[];
          for(let i=0;i<baseline.length;i+=4)if(baseline[i+3]===255&&color.every((v,j)=>baseline[i+j]===v))mask.push(i);
          check(mask.length>8,'solid warning exists '+kind+' '+attack+' '+mask.length);
          if(!mask.every(i=>color.every((v,j)=>paintedWarning[i+j]===v)&&paintedWarning[i+3]===255)){
            gallery([{label:'procedural '+attack,c:plain},{label:'painted '+attack,c:painted}]);
            throw Error('painted warning layering '+attack+' '+JSON.stringify(mask.filter(i=>!color.every((v,j)=>paintedWarning[i+j]===v)).slice(0,5).map(i=>[i,...paintedWarning.slice(i,i+4)])));
          }
          e.flash=.1;
          const flash=render(e),fp=crop(flash);
          check(mask.every(i=>color.every((v,j)=>fp[i+j]===v)&&fp[i+3]===255),'damage altered warning '+attack);
          warnings++;
          rows.push({label:kind+' '+attack+' warning',c:painted});
        }
      }
      // Body-only brightness must change real output pixels, not just accept
      // a filter property. Warning equality is checked separately above.
      const e=enemy(kind),normal=render(e,'body');e.flash=.1;const lit=render(e,'body');
      const p=pixels(normal),q=pixels(lit);let before=0,after=0;
      for(let i=0;i<p.length;i+=4)if(p[i+3]>240&&q[i+3]>240){before+=p[i]+p[i+1]+p[i+2];after+=q[i]+q[i+1]+q[i+2];}
      check(after>before*1.2,kind+' brightness not effective');brightness++;
      rows.push({label:kind+' damage',c:render(e)});
      // Unknown exact attack must fall back completely, never borrow idle.
      const unknown=enemy(kind,'windup');unknown.attack={...unknown.attack!,id:'not-mapped'};
      check(!scene.enemy(canvas().getContext('2d')!,unknown,diff),'unknown exact binding');
      check(same(render(unknown),render(unknown,'procedural')),'exact-state procedural fallback'); 
    }
    // Clip instrumentation on a real CanvasRenderingContext2D. Texture calls
    // must follow a clip and restore must contain their effects.
    const c=canvas(),ctx=c.getContext('2d')!,events:string[]=[];
    for(const name of ['clip','drawImage','save','restore'] as const){
      const original=(ctx[name] as Function).bind(ctx);
      (ctx as any)[name]=(...args:unknown[])=>{events.push(name);return original(...args);};
    }
    const e=enemy('warden','active','slam'),art=scene.enemy(ctx,e,diff);
    drawEnemy(ctx,e,diff,1.1,art);
    check(events.filter(x=>x==='clip').length===2,'two Warden arm texture clips');
    for(let i=0;i<events.length;i++)if(events[i]==='clip'){
      check(events[i+1]==='drawImage'&&events[i+2]==='restore','arm texture escaped clip');
    }
    rows.push({label:'Warden clipped slam',c});
    // Freeze holds simulation pose; changing simulation stride still animates.
    const moving=enemy('husk'),held=render(moving);
    check(same(held,render(moving)),'paused pose moved');
    moving.stride+=Math.PI;moving.anim+=.5;
    check(!same(held,render(moving)),'simulation motion frozen');
    gallery(rows);
    return {poses,warnings,brightness,alpha,webp:{transparent,visible},armClips:2,diagnostics:assets.diagnostics()};
  },
  async missing(){
    const e=enemy('warden','windup','slam');await assets.preloadImage('warden-painted-body');
    const fallback=render(e);
    check(same(fallback,render(e,'procedural')),'missing body not complete procedural fallback');
    for(let i=0;i<120;i++){render(e);await assets.preloadImage('warden-painted-body');}
    check(assets.diagnostics().issues.filter(s=>s.includes('warden-painted-body')).length===1,'duplicate failure diagnostics');
    gallery([{label:'real missing Warden: procedural red warning',c:fallback}]);
    return assets.diagnostics();
  },
};
(window as any).__paintedQA=qa;
