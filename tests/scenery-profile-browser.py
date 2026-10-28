"""Diagnostic method timings, not a performance acceptance test.

Run with ENGINE=firefox and optionally FORCE_LEGACY_BACKGROUND=1 to compare the
same tree with hidden-background elimination disabled. No runtime hooks ship.
"""
import json,os
from pathlib import Path
from browser_engine import launch_engine,development_base,engine_info
from playwright.sync_api import sync_playwright
base=development_base()
engine=os.environ.get('ENGINE','chromium')
legacy=os.environ.get('FORCE_LEGACY_BACKGROUND')=='1'
out=Path('generated-artifacts/scenery-profile')/engine
out.mkdir(parents=True,exist_ok=True)
samples=[]
with sync_playwright() as pw:
 b=launch_engine(pw,engine);p=b.new_page(viewport={'width':1280,'height':720})
 p.goto(base+'/?debug');p.wait_for_function('!!window.__aol')
 p.evaluate('''async()=>{
 const {WorldView}=await import('/src/render/world.ts');
 const {ProductionScene}=await import('/src/production/scene.ts');
 const {Renderer}=await import('/src/render/renderer.ts');
 window.prof={};
 for(const [C,names] of [[WorldView,['build','drawBackground','drawTerrain','drawProps','drawWeather']],[ProductionScene,['layers','surfaces','props','enemy','hero']],[Renderer,['render','drawDesertDepth','drawDesertForeground']]])for(const name of names){
 const original=C.prototype[name],key=C.name+'.'+name;
 C.prototype[name]=function(...args){const t=performance.now();try{return original.apply(this,args)}finally{(prof[key]??=[]).push(performance.now()-t)}};
 }
 }''')
 if legacy:p.evaluate("async()=>{const {ProductionScene}=await import('/src/production/scene.ts');ProductionScene.prototype.coversBackground=()=>false}")
 for land in [0,2]:
  p.evaluate('land=>{delete __aol.save.data.run;__aol.startLevel(land);const g=__aol.game,s=g.stage,p=s.player;p.x=p.prevX=s.prevPlayerX=650;p.y=p.prevY=s.prevPlayerY=-20;p.vx=p.vy=0;g.camX=390;g.paused=true;g.banners=[]}',land)
  p.wait_for_timeout(3000)
  r=p.evaluate('''async()=>{window.prof={};for(let i=0;i<120;i++)await new Promise(requestAnimationFrame);return Object.fromEntries(Object.entries(prof).map(([k,a])=>{a.sort((x,y)=>x-y);return[k,{n:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p95:a[Math.floor(a.length*.95)]}]}))}''')
  sample={'land':land,'profile':r};samples.append(sample)
  print(json.dumps(sample),flush=True)
 (out/('legacy.json' if legacy else 'optimized.json')).write_text(json.dumps({**engine_info(b,engine),'forcedLegacyBackground':legacy,'samples':samples},indent=2))
 b.close()
