"""Named mini paintings: live rendering, per-land decoded residency, 404s,
phone layouts, reduced motion and offline delivery. Desktop Chromium only.
BASE=https://<development-domain> python3 tests/painted-minis-browser.py
"""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:5174')
OUT = Path('generated-artifacts/painted-mini-qa')
OUT.mkdir(parents=True, exist_ok=True)


def start(page, level=0, url=None):
    page.goto(url or BASE + '/?debug')
    page.wait_for_function('window.__aol?.productionAssets.manifest.actors["mini.marshjaw"]')
    if page.locator('.opening-enter').count():
        page.locator('.opening-enter').click()
    page.evaluate("""level=>{
      const a=__aol;a.startLevel(level);a.game.paused=true;
      a.game.camX=0;a.game.camY=0;a.game.banners=[];a.game.texts=[];
      a.game.stage.player.x=90;a.game.stage.player.y=450;
      a.game.stage.enemies=[];a.game.stage.player.invuln=999;
      window.miniDraws=[];
      if(!window.originalMiniDraw){
        window.originalMiniDraw=CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
          if(image?.src)window.miniDraws.push(image.src);
          if(window.miniDraws.length>1000)window.miniDraws.splice(0,500);
          return window.originalMiniDraw.call(this,image,...args);
        };
      }
    }""", level)


def fixture(page, mini, state='move', facing=1):
    page.evaluate("""async ({mini,state,facing})=>{
      const a=__aol,s=a.game.stage;s.enemies=[];
      const e=s.spawnEnemy(mini.kind,a.game.viewW*.62,450);
      e.miniName=mini.name;e.prevX=e.x;e.prevY=e.y;e.facing=facing;
      e.onGround=true;e.vx=65;e.stride=1.2;e.anim=1.1;
      const [motion,id]=state.split('.');
      e.state=motion;e.attack=id?mini.attacks[id]:null;
      const duration=motion==='windup'?e.attack.windup*s.diff.windup:
        motion==='active'?e.attack.active:motion==='recover'?e.attack.recover:
        motion==='hurt'?.26:motion==='dying'?.6:motion==='spawn'?.5:1;
      e.t=duration*.7;window.miniDraws=[];
      await a.productionAssets.preloadImage(mini.image);
    }""", dict(mini=mini, state=state, facing=facing))
    page.wait_for_timeout(75)


def assert_painted(page, mini):
    used = page.evaluate("""image=>{
      const a=__aol,spec=a.productionAssets.manifest.images[image];
      const im=a.productionAssets.image(image);
      return !!im&&im.naturalWidth===512&&im.naturalHeight===512&&
        window.miniDraws.some(src=>src===im.src)&&!!spec;
    }""", mini['image'])
    assert used, (mini['name'], 'decoded unique body not drawn in current frame')
    assert not page.evaluate('__aol.productionAssets.diagnostics().issues')


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    errors = []
    page = browser.new_page(viewport=dict(width=1280, height=720))
    page.on('pageerror', lambda error: errors.append(str(error)))
    start(page)
    minis = page.evaluate("""async ()=>{
      const {STAGES}=await import('/src/core/levels.ts');
      const {ATTACKS}=await import('/src/core/enemy.ts');
      const m=__aol.productionAssets.manifest;
      return STAGES.flatMap((land,level)=>land.encounters.flatMap(enc=>{
        if(!enc.miniBoss)return [];
        const name=enc.miniBoss.name,slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const actor='mini.'+slug,image='mini-'+slug+'-painted-body';
        const states=Object.keys(m.actors[actor].states),attacks={};
        for(const state of states)if(state.startsWith('active.')){
          const id=state.split('.')[1];attacks[id]=ATTACKS[id];
        }
        return [{name,slug,actor,image,states,attacks,level,theme:land.theme,kind:enc.waves[0][0].kind}];
      }));
    }""")
    assert len(minis) == 12
    for mini in minis:
        for state in mini['states']:
            fixture(page, mini, state)
            assert_painted(page, mini)
        fixture(page, mini, next(s for s in mini['states'] if s.startswith('windup.')))
        page.screenshot(path=str(OUT / (mini['slug'] + '-desktop.jpg')))
    print('PASS every exact live state uses its own decoded mini painting')

    # Conservative all-resources-in-current-land measurement, not future lands.
    residency = {}
    guardian = ['warden', 'serpent', 'thorn', 'watcher', 'colossus', 'keeper', 'king']
    for level in range(7):
        context = browser.new_context(viewport=dict(width=1280, height=720))
        scene = context.new_page()
        scene.on('pageerror', lambda error: errors.append(str(error)))
        requested = []
        scene.on('request', lambda req: requested.append(req.url) if '/enemies/minis/' in req.url else None)
        start(scene, level)
        current = [mini for mini in minis if mini['level'] == level]
        scene.evaluate("""async ({level,minis,guardian})=>{
          const a=__aol,m=a.productionAssets.manifest,ids=new Set();
          const clip=id=>ids.add(m.clips[id].image);
          for(const id of ['eliam','husk','wisp','caster','lurker','sentinel','boss.'+guardian,
            ...minis.map(mini=>mini.actor)])
            Object.values(m.actors[id].states).forEach(clip);
          Object.values(m.effects).forEach(clip);
          Object.keys(m.images).filter(id=>id.startsWith('eliam-')).forEach(id=>ids.add(id));
          const {STAGES}=await import('/src/core/levels.ts'),land=m.lands[STAGES[level].theme];
          land.layers.forEach(l=>ids.add(l.image));
          land.props.forEach(p=>{ids.add(p.image);if(p.clip)clip(p.clip);});
          Object.values(land.surfaces??{}).forEach(id=>ids.add(id));
          for(const id of ids)await a.productionAssets.preloadImage(id);
        }""", dict(level=level, minis=current, guardian=guardian[level]))
        diag = scene.evaluate('__aol.productionAssets.diagnostics()')
        assert not diag['issues'] and diag['decodedBytes'] < 80 * 1048576, diag
        assert all(any('/' + mini['slug'] + '/' in url for mini in current) for url in requested), requested
        assert len(set(requested)) == len(current), (level, requested)
        residency[level] = diag['decodedBytes']
        context.close()
    print('PASS seven current-scene decoded bounds including both local minis; no future-mini requests', residency)

    for label, size in [('portrait', dict(width=390, height=844)),
                        ('landscape', dict(width=844, height=390))]:
        context = browser.new_context(viewport=size, is_mobile=True, has_touch=True, reduced_motion='reduce')
        phone = context.new_page()
        phone.on('pageerror', lambda error: errors.append(str(error)))
        start(phone)
        phone.evaluate('__aol.game.reduceMotion=true')
        for mini in minis:
            fixture(phone, mini, next(s for s in mini['states'] if s.startswith('windup.')), facing=-1)
            assert_painted(phone, mini)
            assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
            phone.screenshot(path=str(OUT / (mini['slug'] + '-' + label + '.jpg')))
        context.close()
    print('PASS all unique minis in portrait/landscape, mirrored and reduced motion')

    for mini in minis:
        context = browser.new_context(viewport=dict(width=1280, height=720))
        broken = context.new_page()
        broken.on('pageerror', lambda error: errors.append(str(error)))
        requests = []
        broken.route('**/' + mini['slug'] + '-painted-body.png',
                     lambda route: (requests.append(route.request.url), route.fulfill(status=404, body='missing')))
        start(broken)
        fixture(broken, mini, next(s for s in mini['states'] if s.startswith('windup.')))
        broken.wait_for_timeout(150)
        diag = broken.evaluate('__aol.productionAssets.diagnostics()')
        assert len(requests) == 1 and len(diag['issues']) == 1, (mini['name'], requests, diag)
        assert mini['image'] in diag['issues'][0], diag
        broken.screenshot(path=str(OUT / (mini['slug'] + '-missing.jpg')))
        context.close()
    print('PASS twelve real 404 body fallbacks, diagnosed once without retry churn')

    single = Path('dist-single/armor-of-light.html')
    assert single.exists(), 'Build the single-file edition before running this delivery check'
    offline_context = browser.new_context(viewport=dict(width=1280, height=720), offline=True)
    offline = offline_context.new_page()
    offline.on('pageerror', lambda error: errors.append(str(error)))
    network = []
    offline.on('request', lambda req: network.append(req.url) if req.url.startswith(('http:', 'https:')) else None)
    start(offline, url=single.resolve().as_uri() + '?debug')
    for mini in minis:
        fixture(offline, mini, next(s for s in mini['states'] if s.startswith('active.')))
        assert_painted(offline, mini)
    offline.screenshot(path=str(OUT / 'offline.jpg'))
    assert not network, network
    assert not errors, errors
    print('PASS all twelve embedded mini paintings render offline with zero network sidecars')
    (OUT / 'results.json').write_text(json.dumps(dict(errors=errors, sceneBytes=residency, minis=len(minis)), indent=2))
    browser.close()
