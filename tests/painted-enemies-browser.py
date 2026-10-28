"""Painted body integration in Chromium. Requires the existing Vite workflow.

BASE=https://<development-domain> python3 tests/painted-enemies-browser.py
Screenshots are generated output, not shipped assets. Physical phones and
Safari/Firefox are intentionally not certified by this desktop browser check.
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5174')
OUT = Path('generated-artifacts/painted-enemy-qa')
OUT.mkdir(parents=True, exist_ok=True)
KINDS = ['husk', 'wisp', 'caster', 'lurker', 'sentinel', 'warden']


def start(page):
    page.goto(BASE + '/?debug')
    page.wait_for_function('window.__aol?.productionAssets.manifest.actors["boss.warden"]')
    if page.locator('.opening-enter').count():
        page.locator('.opening-enter').click()
    page.evaluate("""() => {
      const a=__aol; a.startLevel(0); a.game.paused=true;
      a.game.camX=0; a.game.camY=0; a.game.banners=[]; a.game.texts=[];
      a.game.stage.player.x=90; a.game.stage.player.y=450;
      a.game.stage.enemies=[]; a.game.stage.player.invuln=999;
    }""")


def fixture(page, motion='move', phase=1, progress=.7, heavy=False):
    return page.evaluate("""async ({motion,phase,progress,heavy}) => {
      const {ATTACKS}=await import('/src/core/enemy.ts');
      const a=__aol,s=a.game.stage;
      s.enemies=[];
      const kinds=['husk','wisp','caster','lurker','sentinel','warden'];
      const ids=['huskSwing','wispDash','casterOrb','lurkerSnap','thrust1',heavy?'slam':'sweep'];
      const worldW=a.game.viewW;
      const result=[];
      for(let i=0;i<kinds.length;i++){
        const x=145+(worldW-250)*i/5;
        const e=s.spawnEnemy(kinds[i],x,450);
        e.prevX=e.x;e.prevY=e.y;e.facing=i%2?-1:1;e.onGround=true;
        e.state=motion;e.phase=phase;e.vx=65;e.stride=1.2;e.anim=1.1;
        e.attack=ATTACKS[ids[i]];
        const duration=motion==='windup'?e.attack.windup*s.diff.windup*(phase>=2?.85:1):
          motion==='active'?e.attack.active:motion==='recover'?e.attack.recover*(phase>=2?.8:1):1;
        e.t=progress*duration;
        result.push({kind:e.kind,x:e.x,y:e.y,h:e.h,w:e.w,state:e.state,t:e.t});
        await a.productionAssets.preloadImage(e.kind+'-painted-body');
      }
      return result;
    }""", dict(motion=motion, phase=phase, progress=progress, heavy=heavy))


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    errors = []
    page = browser.new_page(viewport=dict(width=1280, height=720))
    page.on('pageerror', lambda error: errors.append(str(error)))
    start(page)
    page.wait_for_timeout(500)
    for motion in ['move', 'windup', 'active', 'recover', 'stagger', 'hurt', 'spawn', 'dying']:
        fixture(page, motion, phase=2, progress=.7, heavy=motion == 'windup')
        page.wait_for_timeout(120)
        page.screenshot(path=str(OUT / (motion + '.jpg')))
        assert not page.evaluate('__aol.productionAssets.diagnostics().issues'), motion
    # Capture light warning separately, both warnings are original procedural code.
    fixture(page, 'windup', heavy=False)
    page.wait_for_timeout(100)
    page.screenshot(path=str(OUT / 'gold-warnings.jpg'))
    diagnostics = page.evaluate('__aol.productionAssets.diagnostics()')
    assert diagnostics['decodedBytes'] < 80 * 1024 * 1024, diagnostics
    # Simulation clock is held while the game is paused: pixels do not animate
    # painted bodies based on a decorative wall-clock tick.
    print('PASS desktop phases, light/heavy warnings, shared residency', diagnostics)
    for name, size in [('portrait', dict(width=390, height=844)),
                       ('landscape', dict(width=844, height=390))]:
        mobile = browser.new_context(viewport=size, is_mobile=True, has_touch=True)
        phone = mobile.new_page()
        phone.on('pageerror', lambda error: errors.append(str(error)))
        start(phone)
        fixture(phone, 'windup', heavy=True)
        phone.wait_for_timeout(100)
        phone.screenshot(path=str(OUT / (name + '.jpg')))
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('__aol.game.reduceMotion=true')
    fixture(page, 'active')
    page.screenshot(path=str(OUT / 'reduced-motion.jpg'))
    print('PASS portrait, landscape and reduced-motion gameplay')
    # Actual network failure, not only a mocked missing image.
    failed = browser.new_page(viewport=dict(width=1280, height=720))
    failed.on('pageerror', lambda error: errors.append(str(error)))
    failures = []
    failed.route('**/warden-painted-body.png', lambda route: (failures.append(route.request.url), route.fulfill(status=404, body='missing')))
    start(failed)
    fixture(failed, 'windup', heavy=True)
    failed.wait_for_timeout(500)
    bad = failed.evaluate('__aol.productionAssets.diagnostics()')
    assert len(failures) == 1, failures
    assert sum('warden-painted-body' in issue for issue in bad['issues']) == 1, bad
    failed.screenshot(path=str(OUT / 'missing-warden.jpg'))
    print('PASS real missing-file fallback without reload churn')
    # The single HTML must boot and render its packaged bodies with no sidecars.
    single = Path('dist-single/armor-of-light.html')
    if single.exists():
        offline = browser.new_page(viewport=dict(width=1280, height=720))
        offline.on('pageerror', lambda error: errors.append(str(error)))
        net = []
        offline.on('request', lambda req: net.append(req.url) if req.url.startswith(('http:', 'https:')) else None)
        offline.goto(single.resolve().as_uri() + '?debug')
        offline.wait_for_function('window.__aol?.productionAssets.manifest.actors["boss.warden"]')
        if offline.locator('.opening-enter').count():
            offline.locator('.opening-enter').click()
        offline.evaluate("""async () => {
          __aol.startLevel(0);__aol.game.paused=true;__aol.game.banners=[];
          for(const kind of ['husk','wisp','caster','lurker','sentinel','warden'])
            await __aol.productionAssets.preloadImage(kind+'-painted-body');
          const e=__aol.game.stage.spawnEnemy('warden',450,450);e.state='move';e.prevX=e.x;e.prevY=e.y;
        }""")
        offline.wait_for_timeout(300)
        assert not net, net
        assert not offline.evaluate('__aol.productionAssets.diagnostics().issues')
        offline.screenshot(path=str(OUT / 'offline.jpg'))
        print('PASS offline embedded bodies with zero network sidecars')
    assert not errors, errors
    (OUT / 'results.json').write_text(json.dumps(dict(errors=errors, diagnostics=diagnostics), indent=2))
    browser.close()
