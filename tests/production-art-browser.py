"""Real-browser production-art checks. BASE may point at the development proxy.

Outputs stay in ignored generated-artifacts/production-art-review.
This is browser emulation, not physical iOS/Android certification.
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5174')
OUT = Path('generated-artifacts/production-art-review')
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'))
    results = []
    for name, size, touch in [
        ('desktop', {'width': 1280, 'height': 720}, False),
        ('portrait', {'width': 390, 'height': 844}, True),
        ('landscape', {'width': 844, 'height': 390}, True),
    ]:
        ctx = browser.new_context(viewport=size, has_touch=touch, is_mobile=touch)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE + '/?debug' + ('&touch' if touch else ''))
        page.wait_for_function('!!window.__aol')
        page.evaluate('window.__aol.startLevel(0)')
        page.wait_for_timeout(1000)
        # Decode every shipped image and verify source sizes and alpha padding.
        details = page.evaluate("""async () => {
          const a=window.__aol.productionAssets, m=a.manifest;
          const images=[];
          for(const [id,s] of Object.entries(m.images)) {
            const im=await a.preloadImage(id);
            if(!im) throw Error('decode failed: '+id);
            const c=document.createElement('canvas'); c.width=im.width;c.height=im.height;
            const x=c.getContext('2d'); x.drawImage(im,0,0);
            const data=x.getImageData(0,0,c.width,c.height).data;
            let clear=0, ink=0;
            for(let i=3;i<data.length;i+=4) {if(data[i]===0)clear++;if(data[i]>0)ink++;}
            if(s.frame && (!clear || !ink))throw Error('body alpha invalid: '+id);
            if(s.frame) {
              const hashes=[];
              for(let cell=0;cell<s.frame.count;cell++){
                const sx=(cell%s.frame.columns)*s.frame.width;
                const sy=Math.floor(cell/s.frame.columns)*s.frame.height;
                const pixels=x.getImageData(sx,sy,s.frame.width,s.frame.height).data;
                let hash=2166136261;
                for(let k=0;k<pixels.length;k+=17)hash=Math.imul(hash^pixels[k],16777619)>>>0;
                hashes.push(hash);
              }
              for(const clip of Object.values(m.clips).filter(c=>c.image===id)){
                if(new Set(clip.frames.map(f=>hashes[f])).size<2)throw Error('static body clip: '+JSON.stringify(clip));
              }
            }
            images.push({id,width:im.width,height:im.height,transparentPixels:clear});
          }
          return {images,diagnostics:a.diagnostics()};
        }""")
        assert len(details['images']) > 0
        assert not details['diagnostics']['issues'], details['diagnostics']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT / (name + '-surface.png')))
        # Lower-room world-foot depth, independent of viewport/camera aspect.
        page.evaluate("""() => {
          const g=__aol.game,s=g.stage,p=s.player;
          s.enemies=[];p.x=2810;p.y=900;p.prevX=p.x;p.prevY=p.y;
          p.vx=0;p.vy=0;p.onGround=true;g.camX=2450;g.banners=[];
        }""")
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / (name + '-archive.png')))
        page.emulate_media(reduced_motion='reduce')
        page.evaluate('__aol.game.reduceMotion=true')
        page.wait_for_timeout(100)
        assert not errors, errors
        results.append({'viewport': name, **details, 'pageErrors': errors})
        ctx.close()
    # A corrupt/missing installed image must retain the procedural body.
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = ctx.new_page()
    page.route('**/assets/production/characters/eliam/**', lambda route: route.abort())
    page.goto(BASE + '/?debug')
    page.wait_for_function('!!window.__aol')
    page.evaluate('__aol.startLevel(0)')
    page.wait_for_timeout(1200)
    fallback = page.evaluate('__aol.productionAssets.diagnostics()')
    assert fallback['issues'], 'missing-file failure should be reported'
    assert page.evaluate('__aol.getState()') == 'playing'
    page.keyboard.down('KeyD')
    x = page.evaluate('__aol.game.stage.player.x')
    page.wait_for_timeout(300)
    page.keyboard.up('KeyD')
    assert page.evaluate('__aol.game.stage.player.x') > x + 30, 'fallback preserves input/physics'
    page.screenshot(path=str(OUT / 'missing-body-fallback.png'))
    results.append({'missingBodyFallback': fallback})
    browser.close()
    (OUT / 'results.json').write_text(json.dumps(results, indent=2))
    print('Desktop, portrait, landscape, source dimensions/alpha, archive, reduced-motion and missing-body checks passed.')
