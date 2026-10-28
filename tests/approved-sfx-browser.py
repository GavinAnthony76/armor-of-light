"""Actual decode + immediate synth/later WAV regression, built web and offline.
ENGINE=chromium|firefox|webkit python tests/approved-sfx-browser.py
WebKit is an automated engine, not desktop Safari or hardware listening.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import subprocess
import threading
from playwright.sync_api import sync_playwright
from browser_engine import launch_engine, engine_info

ROOT = Path(__file__).resolve().parents[1]
ENGINE = os.environ.get('ENGINE', 'chromium')
OUT = ROOT / 'generated-artifacts/approved-sfx' / ENGINE
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(['node', '--input-type=module', '-e', """
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite/package.json'))('esbuild');
await build({entryPoints:['tests/approved-sfx-fixture.ts'],bundle:true,format:'iife',
 outfile:'generated-artifacts/approved-sfx/fixture.js',define:{'import.meta.env.BASE_URL':'"./"'},target:'es2020'});
"""], cwd=ROOT, check=True)
fixture = (ROOT / 'generated-artifacts/approved-sfx/fixture.js').read_text()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = dict(engine=ENGINE, editions={})
browser = None
try:
    with sync_playwright() as pw:
        browser = launch_engine(pw, ENGINE)
        report.update(engine_info(browser, ENGINE))
        try:
            for edition, url in [('web', f'http://127.0.0.1:{server.server_port}/?debug'),
                                 ('offline', (ROOT/'dist-single/armor-of-light.html').as_uri()+'?debug')]:
                context = browser.new_context(offline=edition=='offline')
                network, errors = [], []
                context.on('request', lambda r: network.append(r.url) if r.url.startswith(('http:', 'https:')) else None)
                page = context.new_page()
                page.add_init_script('window.requestAnimationFrame=()=>0')
                page.on('pageerror', lambda e: errors.append(str(e)))
                print(f'{ENGINE} {edition}: loading',flush=True)
                page.goto(url)
                print(f'{ENGINE} {edition}: loaded',flush=True)
                # Explicit gesture for a real live context; waveform assertions
                # use offline graphs because runner audio hardware can be absent.
                page.evaluate("""() => {
                  const b=document.createElement('button');b.id='unlock-test';b.textContent='Unlock test';
                  b.style.cssText='position:fixed;top:0;left:0;z-index:2147483647';
                  b.onclick=()=>{window.unlockContext=new AudioContext();void unlockContext.resume().catch(e=>{window.unlockResumeError=String(e);});};document.body.append(b);
                }""")
                page.click('#unlock-test')
                print(f'{ENGINE} {edition}: gesture',flush=True)
                unlock_state=page.evaluate("Promise.race([unlockContext.resume().then(()=>unlockContext.state),new Promise(r=>setTimeout(()=>r(unlockContext.state),3000))])")
                page.evaluate('unlockContext.close()')
                page.evaluate('__aol.audio.ctx?.close()')
                page.add_script_tag(content=fixture)
                print(f'{ENGINE} {edition}: fixture',flush=True)
                result = page.evaluate("Promise.race([__soundQA.run(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Sound timeout at '+__soundQA.stage)),30000))])")
                result['unlockState'] = unlock_state
                result['liveUnlockVerified'] = unlock_state == 'running'
                if report['runnerMediaWorkaround']:
                    result['liveUnlockLimitation'] = 'Null audio backend/in-process media on sandboxed runner; codec graphs verified offline, live output not certified'
                else:
                    assert result['liveUnlockVerified'], result
                assert not errors, errors
                if edition == 'offline':
                    assert not network, network
                result.update(errors=errors, offlineNetworkRequests=network if edition=='offline' else [])
                report['editions'][edition] = result
                print(f'PASS {ENGINE} {edition}: {len(result["decoded"])} actual exports, four fallback scenarios', flush=True)
                context.close()
            report['status'] = 'passed'
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed' if browser else 'unavailable', error=str(error))
    raise
finally:
    server.shutdown()
    (OUT/'results.json').write_text(json.dumps(report, indent=2))
