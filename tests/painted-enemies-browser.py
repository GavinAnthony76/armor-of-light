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
GUARDIANS = ['serpent', 'thorn', 'watcher', 'colossus', 'keeper', 'king']


def start(page, level=0):
    page.goto(BASE + '/?debug')
    page.wait_for_function('window.__aol?.productionAssets.manifest.actors["boss.warden"]')
    if page.locator('.opening-enter').count():
        page.locator('.opening-enter').click()
    page.evaluate("""level => {
      const a=__aol; a.startLevel(level); a.game.paused=true;
      a.game.camX=0; a.game.camY=0; a.game.banners=[]; a.game.texts=[];
      a.game.stage.player.x=90; a.game.stage.player.y=450;
      a.game.stage.enemies=[]; a.game.stage.player.invuln=999;
    }""", level)


def fixture(page, motion='move', phase=1, progress=.7, heavy=False, guardians=False):
    return page.evaluate("""async ({motion,phase,progress,heavy,guardians}) => {
      const {ATTACKS}=await import('/src/core/enemy.ts');
      const a=__aol,s=a.game.stage;
      s.enemies=[];
      const kinds=guardians?['serpent','thorn','watcher','colossus','keeper','king']:
        ['husk','wisp','caster','lurker','sentinel','warden'];
      const ids=guardians?[heavy?'tail':'bite',heavy?'tail':'thrust2',heavy?'kingWave':'kingDash',
        heavy?'slam':'sweep',heavy?'kingWave':'combo3',heavy?'kingLeap':'combo3']:
        ['huskSwing','wispDash','casterOrb','lurkerSnap','thrust1',heavy?'slam':'sweep'];
      const worldW=a.game.viewW;
      const result=[];
      for(let i=0;i<kinds.length;i++){
        const x=145+(worldW-250)*i/5;
        // Keep the serpent's original head offset and full neck on screen.
        const e=s.spawnEnemy(kinds[i],x+(kinds[i]==='serpent'?120:0),450);
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
    }""", dict(motion=motion, phase=phase, progress=progress, heavy=heavy, guardians=guardians))


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
    for motion in ['move', 'windup', 'active', 'recover', 'stagger', 'hurt', 'spawn', 'dying']:
        fixture(page, motion, phase=2, heavy=motion == 'windup', guardians=True)
        page.wait_for_timeout(120)
        page.screenshot(path=str(OUT / ('guardians-' + motion + '.jpg')))
        assert not page.evaluate('__aol.productionAssets.diagnostics().issues'), motion
    fixture(page, 'windup', guardians=True)
    page.screenshot(path=str(OUT / 'guardians-gold-warnings.jpg'))
    diagnostics = page.evaluate('__aol.productionAssets.diagnostics()')
    assert diagnostics['decodedBytes'] < 80 * 1024 * 1024, diagnostics
    print('PASS six guardians in every state, both warnings and stress-scene residency', diagnostics)
    scene_bytes = {}
    for level, kind in enumerate(['warden'] + GUARDIANS):
        encounter = browser.new_context(viewport=dict(width=1280, height=720))
        scene = encounter.new_page()
        scene.on('pageerror', lambda error: errors.append(str(error)))
        requested_bodies = []
        scene.on('request', lambda req: requested_bodies.append(req.url) if '/bosses/' in req.url else None)
        start(scene, level)
        scene.evaluate("""async kind => {
          const a=__aol,s=a.game.stage,m=a.productionAssets.manifest;
          // Conservatively retain every hero pose and shared enemy, even
          // though an ordinary frame needs fewer sources.
          for(const id of ['eliam','husk','wisp','caster','lurker','sentinel','boss.'+kind])
            for(const clip of Object.values(m.actors[id].states))
              await a.productionAssets.preloadImage(m.clips[clip].image);
          for(const id of Object.keys(m.images).filter(id=>id.startsWith('eliam-')))
            await a.productionAssets.preloadImage(id);
          const e=s.spawnEnemy(kind,a.game.viewW*.6,450);
          e.state='move';e.prevX=e.x;e.prevY=e.y;
        }""", kind)
        scene.wait_for_timeout(150)
        live = scene.evaluate('__aol.productionAssets.diagnostics()')
        assert live['decodedBytes'] < 80 * 1024 * 1024 and not live['issues'], (kind, live)
        assert requested_bodies and all('/bosses/' + kind + '/' in url for url in requested_bodies), requested_bodies
        scene_bytes[kind] = live['decodedBytes']
        scene.screenshot(path=str(OUT / ('land-' + kind + '.jpg')))
        encounter.close()
    print('PASS seven current-land scenes below 80MiB and no future-guardian requests', scene_bytes)
    for name, size in [('portrait', dict(width=390, height=844)),
                       ('landscape', dict(width=844, height=390))]:
        mobile = browser.new_context(viewport=size, is_mobile=True, has_touch=True)
        phone = mobile.new_page()
        phone.on('pageerror', lambda error: errors.append(str(error)))
        start(phone)
        fixture(phone, 'windup', heavy=True, guardians=True)
        phone.wait_for_timeout(100)
        phone.screenshot(path=str(OUT / (name + '.jpg')))
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
        # A real encounter has one guardian, not six overlapping bosses.
        # Inspect each full silhouette and retained gear at both phone sizes.
        for kind in GUARDIANS:
            fixture(phone, 'windup', heavy=True, guardians=True)
            phone.evaluate("""kind => {
              const s=__aol.game.stage;
              s.enemies=s.enemies.filter(e=>e.kind===kind);
              const e=s.enemies[0],x=__aol.game.viewW*.62,dx=x-e.x;
              e.x=x;e.prevX=x;e.homeX+=dx;e.head.x+=dx;
            }""", kind)
            phone.wait_for_timeout(80)
            phone.screenshot(path=str(OUT / (name + '-' + kind + '.jpg')))
            assert not phone.evaluate('__aol.productionAssets.diagnostics().issues')
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('__aol.game.reduceMotion=true')
    fixture(page, 'active', guardians=True)
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
    for kind in GUARDIANS:
        missing = browser.new_context(viewport=dict(width=1280, height=720))
        broken = missing.new_page()
        broken.on('pageerror', lambda error: errors.append(str(error)))
        requests = []
        broken.route('**/' + kind + '-painted-body.png',
                     lambda route: (requests.append(route.request.url), route.fulfill(status=404, body='missing')))
        start(broken)
        fixture(broken, 'windup', heavy=True, guardians=True)
        broken.wait_for_timeout(150)
        bad = broken.evaluate('__aol.productionAssets.diagnostics()')
        assert len(requests) == 1, (kind, requests)
        assert sum(kind + '-painted-body' in issue for issue in bad['issues']) == 1, bad
        broken.screenshot(path=str(OUT / ('missing-' + kind + '.jpg')))
        missing.close()
    print('PASS all six guardians with real missing-file fallback and no retry churn')
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
          for(const kind of ['husk','wisp','caster','lurker','sentinel','warden',
                             'serpent','thorn','watcher','colossus','keeper','king'])
            await __aol.productionAssets.preloadImage(kind+'-painted-body');
          __aol.game.stage.enemies=[];
          for(const [i,kind] of ['serpent','thorn','watcher','colossus','keeper','king'].entries()){
            const e=__aol.game.stage.spawnEnemy(kind,190+i*150,450);
            e.state='move';e.prevX=e.x;e.prevY=e.y;
          }
        }""")
        offline.wait_for_timeout(300)
        assert not net, net
        assert not offline.evaluate('__aol.productionAssets.diagnostics().issues')
        offline.screenshot(path=str(OUT / 'offline.jpg'))
        print('PASS offline embedded bodies with zero network sidecars')
    assert not errors, errors
    (OUT / 'results.json').write_text(json.dumps(dict(errors=errors, diagnostics=diagnostics, sceneBytes=scene_bytes), indent=2))
    browser.close()
