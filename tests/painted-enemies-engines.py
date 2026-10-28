"""Desktop engine QA for built web + file:// offline editions.

python3 tests/painted-enemies-engines.py --engines chromium firefox webkit
Requires npm run build && npm run build:single and Playwright engines installed.
Failures and unavailable engines produce nonzero exit, never silent passes.
No Safari application, audio, or physical-device certification is implied.
"""
import argparse
import base64
import functools
import glob
import http.server
import json
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'generated-artifacts/painted-enemy-engines'
SINGLE = ROOT / 'dist-single/armor-of-light.html'


def nix_libraries():
    """Use installed Nix libraries without global shell/environment changes."""
    patterns = [
        '*gtk+3*', '*gtk4*', '*glib-2*', '*pango-*', '*cairo-*', '*gdk-pixbuf-*',
        '*atk-*', '*at-spi2-*', '*libX*', '*libxcb-*', '*alsa-lib-*', '*dbus-*',
        '*libepoxy-*', '*fontconfig-*', '*freetype-*', '*harfbuzz-*',
        '*gstreamer-*', '*gst-plugins-*', '*icu4c-74*', '*libavif-*',
        '*libmanette-*', '*enchant-*', '*libsecret-*', '*hyphen-*', '*flite-*',
        '*libevent-*', '*libwebp-*', '*libxml2-*', '*sqlite-*', '*libxslt-*',
        '*lcms2-*', '*opus-*', '*wayland-*', '*libxkbcommon-*', '*libdrm-*',
        '*mesa-*', '*libglvnd-*', '*libjpeg-turbo-*', '*graphene-*',
        '*vulkan-loader-*', '*gcc-*-lib', '*x264-*', '*libjxl-*',
    ]
    paths = [p for pattern in patterns for p in glob.glob('/nix/store/' + pattern + '/lib')]
    return ':'.join(filter(None, [os.environ.get('LD_LIBRARY_PATH', ''), *paths]))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def boot(page, url, fixture):
    page.add_init_script("""(() => {
      window.__imageSources=[];
      const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
      Object.defineProperty(HTMLImageElement.prototype,'src',{...d,set(v){
        window.__imageSources.push(v);return d.set.call(this,v);
      }});
    })()""")
    page.goto(url)
    page.wait_for_function('window.__aol?.productionAssets.manifest.actors["boss.warden"]')
    if page.locator('.opening-enter').count():
        page.locator('.opening-enter').click()
    page.evaluate("""() => {
      const a=__aol;a.startLevel(0);a.game.paused=true;a.game.stage.enemies=[];
      a.game.camX=0;a.game.camY=0;a.game.banners=[];a.game.texts=[];
      a.game.stage.player.invuln=999;
    }""")
    page.add_script_tag(content=fixture)
    page.evaluate('__paintedQA.init(__aol.productionAssets.manifest)')


def run_edition(browser, engine, edition, url, fixture):
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    errors, network, body_requests = [], [], []
    context.on('page', lambda p: p.on('pageerror', lambda e: errors.append(str(e))))
    context.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
    context.on('request', lambda r: body_requests.append(r.url) if '-painted-body.png' in r.url else None)
    page = context.new_page()
    boot(page, url, fixture)
    try:
        report = page.evaluate('__paintedQA.run()')
    except Exception:
        page.screenshot(path=str(OUT / f'{engine}-{edition}-failure.png'), full_page=True)
        raise
    assert not report['diagnostics']['issues'], report
    assert report['diagnostics']['decodedBytes'] < 8 * 1024 * 1024, report
    report['canvasFilter'] = page.evaluate("'filter' in document.createElement('canvas').getContext('2d')")
    for kind, url_data in page.evaluate('__paintedQA.contacts()').items():
        (OUT / f'{engine}-{edition}-{kind}.png').write_bytes(base64.b64decode(url_data.split(',')[1]))
    page.screenshot(path=str(OUT / f'{engine}-{edition}-gallery.png'), full_page=True)
    # Sample complete game rendering too, using the same frozen poses but the
    # edition's shipped renderer/cache, not just the isolated fixture bundle.
    page.evaluate("""async () => {
      document.querySelector('#engine-evidence').remove();
      const a=__aol,s=a.game.stage;
      for(const [i,kind] of ['husk','wisp','caster','lurker','sentinel','warden'].entries()){
        await a.productionAssets.preloadImage(kind+'-painted-body');
        const e=s.spawnEnemy(kind,130+i*145,450);
        e.state='move';e.prevX=e.x;e.prevY=e.y;e.onGround=true;
        e.vx=65;e.anim=1.1;e.stride=1.2;
      }
    }""")
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / f'{engine}-{edition}-game.png'))
    residency = page.evaluate('__aol.productionAssets.diagnostics()')
    assert residency['decodedBytes'] < 80 * 1024 * 1024, residency
    assert not residency['issues'], residency
    counts = len(body_requests)
    # Exercise shipped game bodies over state changes as well as isolated pixel
    # checks. No simulation step, combat timing or attack definition is changed.
    for state in ['hurt', 'stagger', 'spawn', 'dying', 'move']:
        page.evaluate("""state => {
          for(const e of __aol.game.stage.enemies){e.state=state;e.t=.2;}
        }""", state)
        page.wait_for_timeout(40)
    page.emulate_media(reduced_motion='reduce')
    page.evaluate('__aol.game.reduceMotion=true')
    assert page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
    reduced = page.evaluate('__paintedQA.run()')
    assert reduced['poses'] == report['poses']
    page.screenshot(path=str(OUT / f'{engine}-{edition}-reduced.png'), full_page=True)
    assert len(body_requests) == counts, 'body reload on state/reduced-motion changes'
    assert page.evaluate('__aol.productionAssets.diagnostics()') == residency
    if edition == 'offline':
        assert not network, network
    assert not errors, errors
    report.update(residency=residency, bodyRequests=counts, errors=errors,
                  offlineNetworkRequests=network if edition == 'offline' else None)
    context.close()
    # Missing file is not route.fulfill: point ONLY the fixture's Warden source
    # at an absent file, let the static host/file loader really fail, then draw
    # 120 frames + preload attempts and require a single request/diagnostic.
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    errors, misses, failures = [], [], []
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: misses.append(r.url) if 'missing-warden-body' in r.url else None)
    page.on('requestfailed', lambda r: failures.append(r.url) if 'missing-warden-body' in r.url else None)
    boot(page, url, fixture)
    page.evaluate("""() => {
      const m=structuredClone(__aol.productionAssets.manifest);
      m.images['warden-painted-body'].src='assets/production/missing-warden-body.png';
      __paintedQA.init(m);
    }""")
    missing = page.evaluate('__paintedQA.missing()')
    page.wait_for_timeout(500)
    assignments = page.evaluate("__imageSources.filter(s=>s.includes('missing-warden-body'))")
    assert len(assignments) == 1, assignments
    assert len(missing['issues']) == 1, missing
    assert not errors, errors
    if edition == 'web':
        assert len(misses) == 1, misses
        # Independently prove the host returns 404 for that exact path.
        import urllib.request
        import urllib.error
        try:
            urllib.request.urlopen(url.split('?')[0].rsplit('/', 1)[0] + '/assets/production/missing-warden-body.png')
            raise AssertionError('missing path exists')
        except urllib.error.HTTPError as e:
            assert e.code == 404
    else:
        assert not (SINGLE.parent / 'assets/production/missing-warden-body.png').exists()
        # Firefox file:// reports image.onerror without requestfailed.
        # Absent file + image failure + one attempt are the portable contract.
    page.screenshot(path=str(OUT / f'{engine}-{edition}-missing.png'))
    report['missing'] = dict(requests=len(misses), imageSourceAssignments=len(assignments),
                            failedRequestEvents=len(failures), diagnostics=missing, realFailure=True)
    context.close()
    return report


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--engines', nargs='+', default=['chromium', 'firefox', 'webkit'])
    opts = args.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    assert (ROOT / 'dist/index.html').exists() and SINGLE.exists(), 'Build both editions first'
    subprocess.run(['node', '--input-type=module', '-e', """
      import {createRequire} from 'node:module';
      const require=createRequire(import.meta.url);
      const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
      await build({entryPoints:['tests/painted-enemies-engine-fixture.ts'],bundle:true,
        outfile:'generated-artifacts/painted-enemy-engines/fixture.js',format:'iife',
        define:{'import.meta.env.BASE_URL':'"./"'},target:'es2020'});
    """], cwd=ROOT, check=True)
    fixture = (OUT / 'fixture.js').read_text()
    # One-off static built-web host, not a duplicate dev workflow.
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        functools.partial(QuietHandler, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = {}
    os.environ['LD_LIBRARY_PATH'] = nix_libraries()
    env = dict(os.environ)
    try:
        with sync_playwright() as pw:
            for name in opts.engines:
                browser = None
                try:
                    launch = dict(env=env)
                    if name == 'chromium':
                        if shutil.which('chromium'):
                            launch.update(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
                    if name == 'webkit' and Path('/nix/store').exists():
                        # Upstream's Linux wrapper REPLACES LD_LIBRARY_PATH,
                        # discarding all Nix libs. Keep that path in a local
                        # generated wrapper; do not patch the downloaded engine.
                        base = Path(pw.webkit.executable_path).parent / 'minibrowser-wpe'
                        wrapper = OUT / 'webkit-nix.sh'
                        mesa = glob.glob('/nix/store/*mesa-*/lib/libEGL_mesa.so.0')
                        if mesa:
                            vendor = OUT / 'egl-vendor.json'
                            vendor.write_text(json.dumps({'file_format_version': '1.0.0',
                                'ICD': {'library_path': mesa[0]}}))
                            launch['env'] = dict(env, LIBGL_ALWAYS_SOFTWARE='1',
                                EGL_PLATFORM='surfaceless',
                                __EGL_VENDOR_LIBRARY_FILENAMES=str(vendor))
                        wrapper.write_text('#!/usr/bin/env bash\n' +
                            '\n'.join(f'export {k}={shlex.quote(str(v))}' for k, v in {
                                'WEBKIT_EXEC_PATH': base / 'bin',
                                'WEBKIT_INJECTED_BUNDLE_PATH': base / 'lib',
                                'WEBKIT_INSPECTOR_RESOURCES_PATH': base / 'share',
                                'LD_LIBRARY_PATH': f'{base}/lib:{base}/sys/lib:{env["LD_LIBRARY_PATH"]}',
                            }.items()) + '\nexec ' + shlex.quote(str(base / 'bin/MiniBrowser')) + ' "$@"\n')
                        wrapper.chmod(0o755)
                        launch['executable_path'] = str(wrapper)
                    browser = getattr(pw, name).launch(**launch)
                    results[name] = {'version': browser.version, 'editions': {}}
                    for edition, url in [
                        ('web', f'http://127.0.0.1:{server.server_port}/index.html?debug'),
                        ('offline', SINGLE.as_uri() + '?debug'),
                    ]:
                        results[name]['editions'][edition] = run_edition(browser, name, edition, url, fixture)
                        print(f'PASS {name} {edition}', flush=True)
                    results[name]['status'] = 'passed'
                except Exception as e:
                    results.setdefault(name, {})['status'] = 'failed' if browser else 'unavailable'
                    results[name]['error'] = str(e)
                    print(f'{results[name]["status"].upper()} {name}: {e}', flush=True)
                finally:
                    if browser:
                        browser.close()
                (OUT / 'results.json').write_text(json.dumps(results, indent=2))
    finally:
        server.shutdown()
    raise SystemExit(0 if all(r['status'] == 'passed' for r in results.values()) else 1)


if __name__ == '__main__':
    main()
