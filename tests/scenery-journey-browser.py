"""Sustained scenery residency / frame pacing, in ONE page without reloads.

BASE=https://<development-preview-host> python3 tests/scenery-journey-browser.py
Optional: SWEEPS=3 FRAMES=90 VIEWPORT=desktop|portrait|landscape (defaults shown).
ENGINE=chromium|firefox|webkit. Outputs are ignored. WebKit is not desktop Safari.
Firefox touch-sized views omit unsupported is_mobile emulation.
Room positioning isolates scenery from combat/physics; the real RAF renderer,
animated scenery, level startup and pause-menu restart handlers remain in use.
"""
import json
import os
import struct
import time
import zlib
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright
from browser_engine import launch_engine, engine_info, development_base

ENGINE = os.environ.get("ENGINE", "chromium")
BASE = development_base()
SWEEPS = int(os.environ.get("SWEEPS", "3"))
FRAMES = int(os.environ.get("FRAMES", "90"))
assert SWEEPS >= 3 and FRAMES >= 60, "Use at least three sweeps and 60 frames per room"
VIEWPORT = os.environ.get("VIEWPORT", "desktop")
WIDTH, HEIGHT = {"desktop": (1280, 720), "portrait": (390, 844),
                 "landscape": (844, 390)}[VIEWPORT]
OUT = Path("generated-artifacts/scenery-journey") / ENGINE / VIEWPORT
OUT.mkdir(parents=True, exist_ok=True)
THEMES = ["desert", "flood", "garden", "mountain", "valley", "city", "river"]
LOWER_X = [2600, 2450, 5500, 5500, 2450, 5500, 2450]
LOWER_Y = [1060, 900, 900, 1020, 1050, 960, 960]


def pressure_png(index):
    """Unique real decoded 16 MiB textures; no shipping assets or budget edits."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(
            ">I", zlib.crc32(kind + data) & 0xffffffff)
    row = b"\0" + bytes([30 + index, 60, 90, 255]) * 2048
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(
        ">IIBBBBB", 2048, 2048, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(row * 2048)) + chunk(b"IEND", b""))


with sync_playwright() as pw:
    try:
        browser = launch_engine(pw, ENGINE)
    except Exception as error:
        (OUT / "results.json").write_text(json.dumps(dict(engine=ENGINE,status="unavailable",error=str(error)),indent=2))
        raise
    ctx = browser.new_context(viewport={"width": WIDTH, "height": HEIGHT},
                              has_touch=VIEWPORT != "desktop", **({"is_mobile": VIEWPORT != "desktop"} if ENGINE != "firefox" else {}))
    page = ctx.new_page()
    page.set_default_timeout(30000)
    errors, failed_requests, responses, navigations = [], [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("requestfailed", lambda request: failed_requests.append(
        {"url": request.url, "failure": request.failure}))
    page.on("response", lambda response: responses.append(
        {"url": response.url, "status": response.status}) if "/assets/production/" in response.url else None)
    page.on("framenavigated", lambda frame: navigations.append(frame.url) if frame == page.main_frame else None)
    started = time.monotonic()
    report = {"viewport": VIEWPORT, "sweeps": SWEEPS, "framesPerRoom": FRAMES,
              **engine_info(browser, ENGINE), "status": "running", "samples": [], "errors": errors, "failedRequests": failed_requests}
    try:
        page.goto(BASE + "/?debug" + ("&touch" if VIEWPORT != "desktop" else ""))
        page.wait_for_function("!!window.__aol")
        # Wrap the real render method only in this test page. No game hooks ship.
        page.evaluate("""async () => {
          const {Renderer}=await import('/src/render/renderer.ts');
          const original=Renderer.prototype.render;
          window.journey={frames:[],intervals:[],violations:[],maxBytes:0,maxVisible:0,
            samples:0,last:0};
          Renderer.prototype.render=function(...args){
            const j=window.journey, start=performance.now();
            const result=original.apply(this,args);
            const end=performance.now(),d=__aol.productionAssets.diagnostics();
            j.frames.push(end-start);
            if(j.last)j.intervals.push(start-j.last);
            j.last=start;j.samples++;
            j.maxBytes=Math.max(j.maxBytes,d.decodedBytes);
            j.maxVisible=Math.max(j.maxVisible,d.visibleBytes);
            if(d.decodedBytes>96*1048576||d.visibleBytes>80*1048576)
              j.violations.push(d);
            return result;
          };
        }""")

        def visit(sweep, land, room, phase="journey"):
            x = LOWER_X[land] if room == "lower" else 650
            y = LOWER_Y[land] if room == "lower" else -20 if room == "upper" else 450
            page.evaluate("""({x,y}) => {
              const g=__aol.game,s=g.stage,p=s.player;
              p.x=p.prevX=s.prevPlayerX=x;p.y=p.prevY=s.prevPlayerY=y;
              p.vx=p.vy=0;p.onGround=true;
              g.camX=x-260;g.paused=true;g.banners=[];
            }""", {"x": x, "y": y})
            # Depth-aware readiness check without calling image(): diagnostics
            # must not mark assets visible or touch their LRU ordering.
            parts = (["archive"] if land == 0 else ["lower"]) if room == "lower" else ["sky", "mid"]
            expected = [f"{THEMES[land]}-painted-{part}" for part in parts]
            page.wait_for_function("""expected => {
              const d=__aol.productionAssets.diagnostics();
              return !d.pending && expected.every(id=>d.residentIds.includes(id));
            }""", arg=expected)
            sample = page.evaluate("""async frames => {
              const j=window.journey;
              // Warm after room switch; do not confuse decode/upload with steady rendering.
              for(let i=0;i<15;i++)await new Promise(requestAnimationFrame);
              j.frames=[];j.intervals=[];j.last=0;
              for(let i=0;i<frames;i++)await new Promise(requestAnimationFrame);
              const stats=a=>{
                const s=[...a].sort((a,b)=>a-b);
                return {n:s.length,p50:s[Math.floor(s.length*.5)],
                  p95:s[Math.min(s.length-1,Math.floor(s.length*.95))],
                  max:s.at(-1),over50:s.filter(v=>v>50).length};
              };
              return {renderMs:stats(j.frames),frameMs:stats(j.intervals),
                diagnostics:__aol.productionAssets.diagnostics(),
                theme:__aol.game.stage.def.theme,state:__aol.getState()};
            }""", FRAMES)
            sample.update(sweep=sweep, land=land, room=room, phase=phase)
            report["samples"].append(sample)
            assert sample["theme"] == THEMES[land] and sample["state"] == "playing", sample
            assert not sample["diagnostics"]["issues"], sample
            assert sample["diagnostics"]["failed"] == 0, sample
            limit = 80 if phase == "journey" else 96
            assert sample["diagnostics"]["decodedBytes"] <= limit * 1048576, sample
            assert sample["renderMs"]["n"] >= FRAMES - 1, sample
            return sample

        def start(land):
            page.evaluate("""land=>{
              delete __aol.save.data.run;
              __aol.startLevel(land);
            }""", land)

        def restart():
            # Actual pause-menu restart: verify stage identity changes without navigation.
            page.evaluate("window.previousStage=__aol.game.stage")
            page.keyboard.press("Escape")
            page.locator('[data-screen="pause"] [data-act="restart"]').click()
            assert page.evaluate("__aol.game.stage!==window.previousStage && __aol.getState()==='playing'")

        for sweep in range(SWEEPS):
            for land in range(7):
                start(land)
                for room in ["surface", "upper", "lower", "surface"]:
                    visit(sweep, land, room)
                restart()
                for room in ["lower", "upper", "surface"]:
                    visit(sweep, land, room)
                print(f"sweep {sweep+1}/{SWEEPS} {THEMES[land]}: "
                      f"{report['samples'][-1]['diagnostics']['decodedBytes']/1048576:.2f} MiB", flush=True)
            # Once every land/room is warm, later sweeps must not load again.
            warm = page.evaluate("__aol.productionAssets.diagnostics()")
            if sweep == 0:
                first_warm = warm
            else:
                assert warm["loads"] == first_warm["loads"], (first_warm, warm)
                assert warm["decodedBytes"] == first_warm["decodedBytes"], (first_warm, warm)

        # Paired same-room comparisons avoid comparing a costly desert against a
        # cheap river. Allow runner noise, but reject progressive rendering slowdown.
        comparisons = []
        for land in range(7):
            for room in ["surface", "upper", "lower"]:
                groups = [[s for s in report["samples"] if s["sweep"] == sweep
                           and s["land"] == land and s["room"] == room] for sweep in [1, SWEEPS-1]]
                for metric, floor in [("renderMs", 2), ("frameMs", 8)]:
                    early = sum(s[metric]["p95"] for s in groups[0]) / len(groups[0])
                    late = sum(s[metric]["p95"] for s in groups[1]) / len(groups[1])
                    comparisons.append({"land": land, "room": room, "metric": metric,
                                        "earlyP95": early, "lateP95": late})
                    assert late <= max(early * 1.5, early + floor), comparisons[-1]
        report["comparisons"] = comparisons

        # This small production catalog fits without churn. Exercise eviction at
        # the UNCHANGED 96 MiB budget using seven distinct decoded QA-only PNGs.
        for index in range(7):
            image = pressure_png(index)
            path = f"assets/production/world/qa-pressure-{index}.png"
            page.route("**/" + path, lambda route, request, data=image: route.fulfill(
                status=200, content_type="image/png", body=data))
        pressure = page.evaluate("""async () => {
          const a=__aol.productionAssets,raw=structuredClone(a.manifest);
          for(let i=0;i<7;i++)raw.images['qa-pressure-'+i]={
            src:'assets/production/world/qa-pressure-'+i+'.png',
            width:2048,height:2048,anchor:[0,0],scale:1,source:'test only',license:'test'};
          a.install(raw);
          const before=a.diagnostics();
          for(let i=0;i<7;i++){
            if(!await a.preloadImage('qa-pressure-'+i))throw Error('Pressure image failed');
          }
          return {before,after:a.diagnostics(),budget:a.budget};
        }""")
        report["pressure"] = pressure
        assert pressure["budget"] == 96 * 1048576
        assert pressure["after"]["evictions"] > pressure["before"]["evictions"], pressure
        # Two full recovery sweeps: re-decode evicted paintings, then prove the
        # recovered working set is stable rather than constantly being reloaded.
        for recovery in range(2):
            for land in range(7):
                start(land)
                for room in ["surface", "upper", "lower", "surface"]:
                    visit(recovery, land, room, "recovery")
                restart()
                visit(recovery, land, "surface", "recovery")
            recovered = page.evaluate("__aol.productionAssets.diagnostics()")
            if recovery == 0:
                first_recovered = recovered
                assert recovered["reloads"] > pressure["before"]["reloads"], recovered
            else:
                assert recovered["loads"] == first_recovered["loads"], (first_recovered, recovered)
            print(f"recovery {recovery+1}/2: {recovered['reloads']} reloads, "
                  f"{recovered['evictions']} evictions, no image issues", flush=True)

        for land in range(7):
            for room in ["surface", "upper", "lower"]:
                early_samples = [s for s in report["samples"] if s["phase"] == "journey"
                                 and s["sweep"] == SWEEPS-1 and s["land"] == land and s["room"] == room]
                late_samples = [s for s in report["samples"] if s["phase"] == "recovery"
                                and s["sweep"] == 1 and s["land"] == land and s["room"] == room]
                for metric, floor in [("renderMs", 2), ("frameMs", 8)]:
                    early = sum(s[metric]["p95"] for s in early_samples) / len(early_samples)
                    late = sum(s[metric]["p95"] for s in late_samples) / len(late_samples)
                    comparisons.append({"land": land, "room": room, "metric": metric,
                                        "afterPressure": True, "earlyP95": early, "lateP95": late})
                    assert late <= max(early * 1.5, early + floor), comparisons[-1]

        report["totals"] = page.evaluate("""() => {
          const j=window.journey;
          return {frames:j.samples,maxDecodedBytes:j.maxBytes,maxVisibleBytes:j.maxVisible,
            violations:j.violations,final:__aol.productionAssets.diagnostics()};
        }""")
        assert not report["totals"]["violations"], report["totals"]
        assert len(navigations) == 1, navigations
        assert not errors and not failed_requests, (errors, failed_requests)
        assert not [r for r in responses if r["status"] >= 400], responses
        report["imageResponses"] = dict(Counter(r["url"].split("/assets/production/")[-1]
                                                for r in responses))
        report["navigations"] = navigations
        page.screenshot(path=str(OUT / "final.png"))
        report["passed"] = True
        report["status"] = "passed"
        print(f"PASS: {len(report['samples'])} room samples, "
              f"{report['totals']['frames']} real rendered frames, "
              "one page, seven lands, repeated menu restarts and eviction recovery.", flush=True)
    except Exception as error:
        report.update(status="failed", error=str(error))
        raise
    finally:
        report["durationSeconds"] = round(time.monotonic() - started, 2)
        (OUT / "results.json").write_text(json.dumps(report, indent=2))
        browser.close()
