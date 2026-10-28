"""Offline scenery test of the actual self-contained edition, no sidecar host.
ENGINE=chromium|firefox|webkit python tests/painted-lands-offline.py
Positions isolate rendering; missing-art movement uses the real simulation/input.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_engine import launch_engine, engine_info

ROOT = Path(__file__).resolve().parents[1]
ENGINE = os.environ.get('ENGINE', 'chromium')
OUT = ROOT/'generated-artifacts/painted-lands-offline'/ENGINE
OUT.mkdir(parents=True, exist_ok=True)
SINGLE = ROOT/'dist-single/armor-of-light.html'
THEMES = ['flood','garden','mountain','valley','city','river']
LOWER_X = [2450,5500,5500,2450,5500,2450]
LOWER_Y = [900,900,1020,1050,960,960]
report = dict(engine=ENGINE, samples=[], fallbacks=[])
browser = None
try:
    with sync_playwright() as pw:
        browser = launch_engine(pw, ENGINE)
        report.update(engine_info(browser, ENGINE))
        context = browser.new_context(offline=True, viewport=dict(width=960,height=600))
        page = context.new_page()
        network, sidecars, errors = [], [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else
                sidecars.append(r.url) if r.url.startswith('file:') and r.url.split('?')[0]!=SINGLE.as_uri() else None)
        page.goto(SINGLE.as_uri()+'?debug')
        page.wait_for_function('Object.keys(window.__aol?.productionAssets.manifest.lands??{}).length===7')
        if page.locator('.opening-enter').count():
            page.locator('.opening-enter').click()
        for land,theme in enumerate(THEMES,1):
            prior_issues=page.evaluate('__aol.productionAssets.issues.length')
            for room in ['surface','lower']:
                page.evaluate("""({land,x,y})=>{
                  const a=__aol;a.startLevel(land);const g=a.game,s=g.stage,p=s.player;
                  p.x=p.prevX=s.prevPlayerX=x;p.y=p.prevY=s.prevPlayerY=y;
                  p.vx=p.vy=0;p.onGround=true;g.camX=x-260;g.camY=0;
                  g.paused=true;g.banners=[];g.texts=[];
                }""", dict(land=land,x=LOWER_X[land-1] if room=='lower' else 650,y=LOWER_Y[land-1] if room=='lower' else 450))
                ids = [theme+'-painted-lower'] if room=='lower' else [theme+'-painted-sky',theme+'-painted-mid']
                page.wait_for_function("""ids=>ids.every(id=>__aol.productionAssets.diagnostics().residentIds.includes(id))""", arg=ids)
                sample = page.evaluate("""async ({ids,room})=>{
                  const a=__aol.productionAssets,images=[];
                  for(const id of ids){
                    const im=a.image(id),spec=a.manifest.images[id],c=document.createElement('canvas');
                    c.width=im.naturalWidth;c.height=im.naturalHeight;
                    const x=c.getContext('2d');x.drawImage(im,0,0);const p=x.getImageData(0,0,c.width,c.height).data;
                    let clear=0,ink=0;for(let i=3;i<p.length;i+=4){if(!p[i])clear++;if(p[i]>200)ink++;}
                    if(c.width!==spec.width||c.height!==spec.height)throw Error('wrong decoded dimensions');
                    if(!ink)throw Error('empty painting');
                    if(id.endsWith('-mid')&&(clear<c.width*c.height*.2||ink<c.width*c.height*.15))throw Error('bad alpha');
                    images.push({id,width:c.width,height:c.height,clear,ink});
                  }
                  const next=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                  const c=document.getElementById('game'),x=c.getContext('2d'),pixels=()=>x.getImageData(0,0,c.width,c.height).data;
                  await next();const painted=pixels(),image=a.image;
                  try{
                    a.image=function(id){return ids.includes(id)?null:image.call(this,id);};
                    await next();const fallback=pixels();let changed=0;
                    for(let i=0;i<painted.length;i+=16)if(Math.abs(painted[i]-fallback[i])+Math.abs(painted[i+1]-fallback[i+1])+Math.abs(painted[i+2]-fallback[i+2])>20)changed++;
                    return {room,images,visiblePaintedPixelFraction:changed/(painted.length/16),diagnostics:a.diagnostics()};
                  }finally{a.image=image;await next();}
                }""", dict(ids=ids,room=room))
                assert sample['visiblePaintedPixelFraction']>.08, sample
                assert len(sample['diagnostics']['issues'])==prior_issues and not sample['diagnostics']['failed'], sample
                assert sample['diagnostics']['decodedBytes']<=96*1048576 and sample['diagnostics']['visibleBytes']<=80*1048576, sample
                sample.update(theme=theme)
                report['samples'].append(sample)
                page.screenshot(path=str(OUT/f'{theme}-{room}.png'))
            # Remove the embedded source entry for ALL scenery in this land.
            # Keep networking blocked; fallback must not need an external file.
            page.evaluate("""theme=>{
              const a=__aol.productionAssets,m=structuredClone(a.manifest);
              const path='assets/production/world/'+theme+'/qa-missing.webp';
              delete window.__armorAssetMap[path];
              for(const [id,spec] of Object.entries(m.images))if(id.startsWith(theme+'-painted-'))spec.src=path;
              a.install(m);__aol.startLevel(['desert','flood','garden','mountain','valley','city','river'].indexOf(theme));
              __aol.game.banners=[];__aol.game.paused=false;
            }""", theme)
            page.wait_for_function('__aol.productionAssets.diagnostics().failed>0')
            x = page.evaluate('__aol.game.stage.player.x')
            page.keyboard.down('KeyD');page.wait_for_timeout(350);page.keyboard.up('KeyD')
            assert page.evaluate('__aol.getState()')=='playing'
            assert page.evaluate('__aol.game.stage.player.x')>x+20, theme
            page.screenshot(path=str(OUT/f'{theme}-missing.png'))
            report['fallbacks'].append(dict(theme=theme,playable=True,missingEmbeddedEntry=True))
            # Restore original embedded pack before checking the next land.
            page.evaluate("""async ()=>{
              const path='assets/production/asset-manifest.json';
              const m=await (await fetch(window.__armorAssetMap[path])).json();__aol.productionAssets.install(m);
            }""")
        assert not errors and not network and not sidecars, (errors,network,sidecars)
        report.update(status='passed',errors=errors,networkRequests=network,sidecarRequests=sidecars)
        browser.close()
        print(f'PASS {ENGINE}: 12 offline rooms, six playable missing-art fallbacks, zero sidecar requests')
except Exception as error:
    report.update(status='failed' if browser else 'unavailable',error=str(error))
    raise
finally:
    (OUT/'results.json').write_text(json.dumps(report,indent=2))
