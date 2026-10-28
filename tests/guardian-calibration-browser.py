"""Development-only calibration UI, actual paintings/exports; no gameplay edits."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_engine import launch_engine, development_base, engine_info
ROOT=Path(__file__).resolve().parents[1]
ENGINE=os.environ.get('ENGINE','chromium')
OUT=ROOT/'generated-artifacts/guardian-calibration'/ENGINE
OUT.mkdir(parents=True,exist_ok=True)
BASE=development_base()
report=dict(engine=ENGINE)
try:
    with sync_playwright() as pw:
        browser=launch_engine(pw,ENGINE)
        report.update(engine_info(browser,ENGINE))
        page=browser.new_page(viewport=dict(width=1240,height=960))
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'/tests/guardian-calibration.html')
        page.wait_for_function('!document.querySelector("#export").disabled')
        actors=page.locator('#actor option').evaluate_all('(options)=>options.map(o=>o.value)')
        assert len(actors)==24, actors
        for actor in actors:
            page.select_option('#actor',actor)
            page.wait_for_function('!document.querySelector("#export").disabled')
            assert page.locator('#attack option').count()>0,actor
        page.select_option('#actor','boss.colossus')
        page.wait_for_function('!document.querySelector("#export").disabled')
        page.get_by_label('Band neck',exact=True).fill('142')
        page.get_by_label('Band neck',exact=True).press('Tab')
        page.wait_for_function('!document.querySelector("#export").disabled')
        assert json.loads(page.input_value('#metadata'))['bands']['neck']==142
        page.uncheck('#animate')
        page.locator('#progress').fill('0.75')
        page.screenshot(path=str(OUT/'colossus-overlays-poses.png'),full_page=True)
        # Transparent material rect cannot be accepted even if its bounds are valid.
        page.fill('#metadata','{"samples":{"colossusStone":[0,0,16,16]}}')
        assert page.locator('#export').is_disabled()
        page.click('#apply')
        page.wait_for_function('document.querySelector("#status").textContent.includes("transparent")')
        assert page.locator('#export').is_disabled()
        page.fill('#metadata','{"bands":{"top":400}}')
        page.click('#apply')
        page.wait_for_function('document.querySelector("#status").textContent.includes("body bands")')
        assert page.locator('#export').is_disabled()
        page.click('#reset')
        page.wait_for_function('!document.querySelector("#export").disabled')
        with page.expect_download() as event:
            page.click('#export')
        patch=json.loads(page.input_value('#output'))
        assert patch['images']['colossus-painted-body']['anchor']==[256,448],patch
        event.value.save_as(OUT/'colossus-settings.json')
        page.fill('#source','assets/production/bosses/colossus/review.png')
        page.set_input_files('#file',ROOT/'public/assets/production/bosses/colossus/colossus-painted-body.png')
        page.wait_for_function('document.querySelector("#status").textContent.includes("Validated")')
        assert page.locator('#export').is_disabled()
        page.fill('#provenance','Browser fixture: original Colossus source reused for local preview')
        page.fill('#license','Test only; existing owner-approved production source')
        page.click('#apply')
        page.wait_for_function('!document.querySelector("#export").disabled')
        with page.expect_download() as uploaded:
            page.click('#export')
        local_patch=json.loads(page.input_value('#output'))
        assert local_patch['images']['colossus-painted-body']['src'].endswith('/review.png')
        assert local_patch['images']['colossus-painted-body']['source'].startswith('Browser fixture:')
        uploaded.value.save_as(OUT/'local-source-settings.json')
        # A real wrong-size local image must never be exported as a valid body.
        page.set_input_files('#file',ROOT/'public/assets/production/world/flood/flood-painted-sky.webp')
        page.wait_for_function('document.querySelector("#status").textContent.includes("failed to decode")')
        assert page.locator('#export').is_disabled()
        page.click('#reset')
        page.wait_for_function('!document.querySelector("#export").disabled')
        page.set_viewport_size(dict(width=390,height=844))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(OUT/'portrait.png'),full_page=True)
        assert not errors,errors
        report.update(status='passed',actors=len(actors),errors=errors,exported=patch)
        browser.close()
        print(f'PASS {ENGINE}: 24 actors, mirrored attack poses, invalid/transparent rejection, export, portrait layout')
except Exception as error:
    report.update(status='failed',error=str(error))
    raise
finally:
    (OUT/'results.json').write_text(json.dumps(report,indent=2))
