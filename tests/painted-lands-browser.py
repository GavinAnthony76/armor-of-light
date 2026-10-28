"""Six-land browser scenery checks; screenshots/results are ignored outputs.

Browser emulation only, not real-phone or Safari certification.
BASE=https://<development-preview-host> python3 tests/painted-lands-browser.py
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5174')
OUT = Path('generated-artifacts/painted-lands-review')
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ['flood', 'garden', 'mountain', 'valley', 'city', 'river']
SIZES = [('desktop', 1280, 720), ('portrait', 390, 844), ('landscape', 844, 390)]
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'))
    results = []
    for name, w, h in SIZES:
        ctx = browser.new_context(viewport={'width': w, 'height': h},
                                  has_touch=name != 'desktop', is_mobile=name != 'desktop')
        for land, theme in enumerate(THEMES, 1):
            for room in ['surface', 'lower']:
                page = ctx.new_page()
                errors, requests = [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: requests.append(r.url))
                page.goto(f'{BASE}/tests/painted-lands-review.html?land={land}&room={room}'
                          + ('&touch' if name != 'desktop' else ''))
                page.wait_for_function('window.reviewReady === true')
                app = page.frames[1]
                expected = ['lower'] if room == 'lower' else ['sky', 'mid']
                app.wait_for_function("""parts => parts.every(p =>
                  __aol.productionAssets.image(__aol.game.stage.def.theme+'-painted-'+p))""", arg=expected)
                details = app.evaluate("""() => {
                  const a=__aol.productionAssets;
                  return {diagnostics:a.diagnostics(), y:__aol.game.stage.player.y,
                    theme:__aol.game.stage.def.theme};
                }""")
                assert not details['diagnostics']['issues'], details
                assert details['diagnostics']['decodedBytes'] < 80 * 1048576
                assert details['theme'] == theme
                assert not any('/world/' + t + '/' in r for r in requests for t in THEMES if t != theme), requests
                if room == 'surface':
                    assert not any(f'{theme}-painted-lower' in r for r in requests)
                    # Alpha and chroma-spill audit on real decoded exports.
                    alpha = app.evaluate("""theme => {
                      const im=__aol.productionAssets.image(theme+'-painted-mid');
                      const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
                      const x=c.getContext('2d');x.drawImage(im,0,0);
                      const d=x.getImageData(0,0,c.width,c.height).data;
                      let clear=0,ink=0,key=0;
                      for(let i=0;i<d.length;i+=4){
                        if(d[i+3]===0)clear++;
                        if(d[i+3]>200){ink++;if(d[i]>160&&d[i+2]>160&&d[i+1]<80)key++;}
                      }
                      return {clear,ink,key,total:c.width*c.height};
                    }""", theme)
                    assert alpha['clear'] > alpha['total'] * .20, alpha
                    assert alpha['ink'] > alpha['total'] * .15 and alpha['key'] == 0, alpha
                    details['alpha'] = alpha
                # No horizontal overflow in either the fixture or real app.
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                assert app.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.screenshot(path=str(OUT / f'{theme}-{name}-{room}.png'))
                if room == 'lower':
                    # A loaded painting must actually affect the final framebuffer,
                    # not be hidden under an opaque full-screen pit/water wash.
                    difference = app.evaluate("""async theme => {
                      const g=__aol.game,a=__aol.productionAssets;
                      const update=g.update,image=a.image;
                      g.update=()=>{};
                      const next=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                      const c=document.getElementById('game'),x=c.getContext('2d');
                      const pixels=()=>x.getImageData(0,0,c.width,c.height).data;
                      try {
                        await next();const painted=pixels();
                        a.image=function(id){return id===theme+'-painted-lower'?null:image.call(this,id);};
                        await next();const fallback=pixels();
                        let changed=0;
                        for(let i=0;i<painted.length;i+=16)
                          if(Math.abs(painted[i]-fallback[i])+Math.abs(painted[i+1]-fallback[i+1])+Math.abs(painted[i+2]-fallback[i+2])>20)changed++;
                        return changed/(painted.length/16);
                      } finally {a.image=image;g.update=update;await next();}
                    }""", theme)
                    assert difference > .08, f'{theme} lower painting hidden: {difference}'
                    details['visiblePaintedPixelFraction'] = difference
                app.evaluate('__aol.game.reduceMotion=true')
                page.emulate_media(reduced_motion='reduce')
                page.wait_for_timeout(80)
                assert app.evaluate('__aol.game.reduceMotion')
                assert not errors, errors
                results.append({'viewport': name, 'room': room, **details, 'pageErrors': errors})
                page.close()
        ctx.close()
    # Failure of ANY one land pack must leave a playable existing presentation.
    for land, theme in enumerate(THEMES, 1):
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = ctx.new_page()
        page.route(f'**/world/{theme}/{theme}-painted-*', lambda route: route.abort())
        page.goto(BASE + '/?debug')
        page.wait_for_function('!!window.__aol')
        page.evaluate('(land) => {__aol.startLevel(land);__aol.game.banners=[]}', land)
        page.wait_for_function('__aol.productionAssets.diagnostics().issues.length > 0')
        assert page.evaluate('__aol.getState()') == 'playing'
        x = page.evaluate('__aol.game.stage.player.x')
        page.keyboard.down('KeyD')
        page.wait_for_timeout(280)
        page.keyboard.up('KeyD')
        assert page.evaluate('__aol.game.stage.player.x') > x + 20, theme
        results.append({'theme': theme, 'missingSceneryFallback': True})
        ctx.close()
    browser.close()
    (OUT / 'results.json').write_text(json.dumps(results, indent=2))
    print('Six lands × three viewports × surface/lower, decoded alpha, lazy loading, reduced motion and six missing-pack fallbacks passed.')
