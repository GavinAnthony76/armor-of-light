"""Exact framebuffer comparison against forced legacy background rendering.

ENGINE=firefox|chromium|webkit; desktop and touch viewport geometry, all lands,
surface/upper/lower and depth transitions. This is not physical-device evidence.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_engine import development_base, launch_engine, engine_info

ENGINE = os.environ.get('ENGINE', 'chromium')
OUT = Path('generated-artifacts/background-occlusion') / ENGINE
OUT.mkdir(parents=True, exist_ok=True)
base = development_base()
with sync_playwright() as pw:
    browser = launch_engine(pw, ENGINE)
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    page.goto(base + '/?debug')
    page.wait_for_function('!!window.__aol')
    page.evaluate('''async()=>{
      const {Renderer}=await import('/src/render/renderer.ts');
      const {ProductionScene}=await import('/src/production/scene.ts');
      const canvas=document.createElement('canvas');
      window.comparison={renderer:new Renderer(canvas),canvas,ProductionScene};
      await Promise.all(comparison.renderer.desertArt.map(im=>im.decode()));
    }''')
    samples = []
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width, height, touch in [(1280, 720, False), (390, 844, True), (844, 390, True)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.evaluate('''touch=>{
          const url=new URL(location.href);touch?url.searchParams.set('touch',''):url.searchParams.delete('touch');
          history.replaceState(null,'',url);comparison.renderer.resize();
        }''', touch)
        for land in range(7):
            page.evaluate('''land=>{
              delete __aol.save.data.run;__aol.startLevel(land);__aol.game.paused=true;
            }''', land)
            # Preload this land so the comparison never conflates decode arrival with culling.
            page.evaluate('''async()=>{
              const a=__aol.productionAssets,theme=__aol.game.stage.def.theme;
              await Promise.all(a.manifest.lands[theme].layers.map(l=>a.preloadImage(l.image)));
            }''')
            transition_y = [650, 650, 650, 770, 800, 710, 710][land]
            for y in [-20, 450, transition_y, 1060]:
                result = page.evaluate('''y=>{
                  const {renderer:r,canvas,ProductionScene:C}=comparison,g=__aol.game,s=g.stage,p=s.player;
                  p.x=p.prevX=s.prevPlayerX=650;p.y=p.prevY=s.prevPlayerY=y;
                  p.vx=p.vy=0;g.camX=390;g.banners=[];s.shakeAmount=0;s.hitstop=0;
                  const original=C.prototype.coversBackground,random=Math.random;
                  let culled=false;
                  C.prototype.coversBackground=function(...args){return culled=original.apply(this,args)};
                  Math.random=()=>.5;
                  try{
                    r.render(g,0,'keyboard');
                    const a=r.ctx.getImageData(0,0,canvas.width,canvas.height).data;
                    const optimized=culled;
                    C.prototype.coversBackground=()=>false;
                    r.render(g,0,'keyboard');
                    const b=r.ctx.getImageData(0,0,canvas.width,canvas.height).data;
                    let different=0,maxDelta=0;
                    for(let i=0;i<a.length;i++)if(a[i]!==b[i]){different++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]))}
                    return {culled:optimized,different,maxDelta,actualLand:s.def.id};
                  }finally{C.prototype.coversBackground=original;Math.random=random}
                }''', y)
                result.update(land=land, y=y, width=width, height=height, touch=touch)
                samples.append(result)
                (OUT / 'results.json').write_text(json.dumps({**engine_info(browser, ENGINE), 'samples': samples, 'errors': errors}, indent=2))
                assert result['actualLand'] == land, result
                assert result['different'] == 0, result
                assert result['culled'] == (y != transition_y), result
            if land == 2:
                # Actual rendered upper-room scene at each viewport, not a mockup.
                page.evaluate('''()=>{
                  const g=__aol.game,s=g.stage;s.player.y=s.prevPlayerY=s.player.prevY=-20;
                  comparison.renderer.render(g,0,'keyboard');
                  // Keep the compared canvas visible; the game's next RAF must not
                  // replace the capture with its independently resized viewport.
                  Object.assign(comparison.canvas.style,{position:'fixed',top:'0',left:'0',zIndex:'10000'});
                  document.body.append(comparison.canvas);
                }''')
                page.screenshot(path=str(OUT / f'garden-{width}x{height}.png'))
                page.evaluate('comparison.canvas.remove()')
    report = {**engine_info(browser, ENGINE), 'samples': samples, 'errors': errors}
    (OUT / 'results.json').write_text(json.dumps(report, indent=2))
    assert not errors, errors
    assert any(s['culled'] for s in samples), 'Optimization never exercised'
    assert any(not s['culled'] for s in samples), 'Fallback never exercised'
    print(f'{len(samples)} exact framebuffer comparisons passed; '
          f'{sum(s["culled"] for s in samples)} fully occluded backgrounds skipped.')
    browser.close()
