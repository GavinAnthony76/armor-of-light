"""
Browser tests for Armor of Light (Playwright + Chromium).

  npm run build && npx vite preview --port 4174 &
  python3 tests/e2e.py            # BASE=http://localhost:4174 by default

Checks menus, keyboard, touch, pause on blur, saving, every level loading,
and that a bot can clear all seven levels in the real browser build.
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4174')
SHOTS = os.environ.get('SHOTS', '')
passed, failed = 0, []


def check(name, cond, detail=''):
    global passed
    if cond:
        passed += 1
        print(f'  ok   {name}')
    else:
        failed.append(f'{name} {detail}')
        print(f'  FAIL {name} {detail}')


def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        page.screenshot(path=os.path.join(SHOTS, f'{name}.png'))


def state(page):
    return page.evaluate("window.__aol.getState()")


def player(page):
    return page.evaluate("(() => { const p = window.__aol.game.stage.player; return {x: p.x, y: p.y, state: p.state, onGround: p.onGround, hp: p.hp} })()")


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ------------------------------------------------------------ desktop
    print('desktop')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(f'{BASE}/?debug')
    page.wait_for_timeout(900)
    check('title screen shows', page.is_visible('[data-screen="title"].active'))
    check('page does not scroll sideways', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    shot(page, 'desktop-title')

    page.click('[data-diff="challenging"]')
    check('difficulty can be changed', page.evaluate("window.__aol.save.data.settings.difficulty") == 'challenging')
    page.click('[data-diff="gentle"]')

    page.click('[data-screen="title"] [data-act="help"]')
    check('how-to-play opens', page.is_visible('[data-screen="help"].active'))
    page.click('[data-screen="help"] [data-act="home"]')

    page.click('[data-screen="title"] [data-act="levels"]')
    check('level select lists 7 lands', page.locator('.level-card').count() == 7)
    check('only the first land is unlocked', page.locator('.level-card.locked').count() == 6)
    page.click('[data-level="0"]')
    page.wait_for_timeout(300)
    check('level starts', state(page) == 'playing')

    x0 = player(page)['x']
    page.keyboard.down('KeyD')
    page.wait_for_timeout(700)
    page.keyboard.up('KeyD')
    check('keyboard moves right', player(page)['x'] > x0 + 100, f"{x0} -> {player(page)['x']}")
    page.wait_for_timeout(200)
    y0 = player(page)['y']
    page.keyboard.down('Space')
    page.wait_for_timeout(180)
    y1 = player(page)['y']
    page.keyboard.up('Space')
    check('space jumps', y1 < y0 - 40, f'{y0} -> {y1}')
    page.wait_for_timeout(700)
    page.keyboard.press('KeyJ')
    page.wait_for_timeout(40)
    check('J strikes', player(page)['state'] == 'attack')
    page.wait_for_timeout(500)
    page.keyboard.down('KeyK')
    page.wait_for_timeout(120)
    check('holding K blocks', player(page)['state'] == 'block')
    page.keyboard.up('KeyK')
    shot(page, 'desktop-play')

    page.keyboard.press('Escape')
    page.wait_for_timeout(200)
    check('Esc pauses', state(page) == 'paused' and page.is_visible('[data-screen="pause"].active'))
    page.click('[data-act="resume"]')
    page.wait_for_timeout(150)
    check('resume returns to play', state(page) == 'playing')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.wait_for_timeout(150)
    check('losing focus pauses the game', state(page) == 'paused')
    t0 = page.evaluate("window.__aol.game.stage.time")
    page.wait_for_timeout(400)
    check('game time stops while paused', page.evaluate("window.__aol.game.stage.time") == t0)
    page.click('[data-act="resume"]')

    page.click('[data-act="pause"]')
    page.click('[data-screen="pause"] [data-act="sfx"]')
    check('sound toggle saves', page.evaluate("JSON.parse(localStorage.getItem('armor-of-light-save-v1')).settings.sfx") is False)
    page.click('[data-screen="pause"] [data-act="sfx"]')
    page.click('[data-screen="pause"] [data-act="resume"]')
    page.wait_for_timeout(100)
    check('audio runs again after resuming', page.evaluate("window.__aol.audio.ready"))

    # each level loads, its fights trigger, and its guardian appears
    for lv in range(7):
        page.evaluate(f'window.__aol.startLevel({lv})')
        page.wait_for_timeout(400)
        page.evaluate("(() => { const s = window.__aol.game.stage; s.nextEncounter = s.def.encounters.length - 1; s.player.x = s.def.encounters[s.nextEncounter].trigger + 5; })()")
        page.wait_for_timeout(3200)
        boss = page.evaluate("(() => { const b = window.__aol.game.stage.boss; return b ? b.kind : null })()")
        check(f'level {lv + 1} guardian appears', boss in ('warden', 'serpent', 'king'), str(boss))
        shot(page, f'desktop-boss{lv + 1}')

    check('no errors on desktop', not errors, json.dumps(errors[:5]))
    ctx.close()

    # ------------------------------------------- full playthroughs (bot)
    print('bot playthroughs in the browser')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(f'{BASE}/?debug&autoplay&speed=6')
    page.wait_for_timeout(600)
    for lv in range(7):
        page.evaluate(f'window.__aol.startLevel({lv})')
        try:
            page.wait_for_function("window.__aol.getState() === 'results'", timeout=150000)
            ok = True
        except Exception:
            ok = False
        info = page.evaluate("(() => { const s = window.__aol.game.stage; return {x: Math.round(s.player.x), deaths: s.deaths, score: s.score, time: Math.round(s.time)} })()")
        check(f'level {lv + 1} cleared in the browser', ok, json.dumps(info))
        if ok:
            page.wait_for_timeout(900)
            shot(page, f'results{lv + 1}')
    saved = page.evaluate("JSON.parse(localStorage.getItem('armor-of-light-save-v1'))")
    check('progress saved: all lands unlocked', saved['unlocked'] == 6, json.dumps(saved))
    check('best scores saved for all lands', len(saved['best']) == 7)
    check('final results show the ending', page.is_visible('[data-ref="resEnding"]') and not page.is_visible('[data-ref="nextBtn"]'))
    page.goto(f'{BASE}/?debug')
    page.wait_for_timeout(700)
    check('progress survives a reload', page.evaluate("window.__aol.save.data.unlocked") == 6)
    check('title offers to continue', 'Continue' in page.inner_text('[data-ref="playLabel"]'))
    check('no errors during playthroughs', not errors, json.dumps(errors[:5]))
    ctx.close()

    # ------------------------------------------------------- phone touch
    for name, vp in [('portrait', {'width': 390, 'height': 844}), ('landscape', {'width': 844, 'height': 390})]:
        print(f'phone {name}')
        ctx = browser.new_context(viewport=vp, has_touch=True, is_mobile=True, device_scale_factor=2)
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'{BASE}/?debug')
        page.wait_for_timeout(900)
        check(f'{name}: no sideways scroll', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.tap('[data-act="continue"]')
        page.wait_for_timeout(300)
        check(f'{name}: touch controls visible', page.is_visible('[data-ref="pad"]') and page.is_visible('[data-ref="tAttack"]'))
        cdp = ctx.new_cdp_session(page)
        pad = page.locator('[data-ref="pad"]').bounding_box()
        cx, cy = pad['x'] + pad['width'] / 2, pad['y'] + pad['height'] / 2
        x0 = player(page)['x']
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx, 'y': cy, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cx + pad['width'] * 0.4, 'y': cy, 'id': 1}]})
        page.wait_for_timeout(600)
        # second finger: jump while still walking
        jb = page.locator('[data-ref="tJump"]').bounding_box()
        y0 = player(page)['y']
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx + pad['width'] * 0.4, 'y': cy, 'id': 1}, {'x': jb['x'] + jb['width'] / 2, 'y': jb['y'] + jb['height'] / 2, 'id': 2}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [{'x': cx + pad['width'] * 0.4, 'y': cy, 'id': 1}]})
        page.wait_for_timeout(200)
        y1 = player(page)['y']
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        x1 = player(page)['x']
        check(f'{name}: pad walks', x1 > x0 + 80, f'{x0} -> {x1}')
        check(f'{name}: jump while walking (multi-touch)', y1 < y0 - 40, f'{y0} -> {y1}')
        page.wait_for_timeout(800)
        page.tap('[data-ref="tAttack"]')
        page.wait_for_timeout(40)
        check(f'{name}: strike button', player(page)['state'] == 'attack')
        page.wait_for_timeout(500)
        sb = page.locator('[data-ref="tBlock"]').bounding_box()
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': sb['x'] + sb['width'] / 2, 'y': sb['y'] + sb['height'] / 2, 'id': 3}]})
        page.wait_for_timeout(150)
        check(f'{name}: shield button blocks', player(page)['state'] == 'block')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        check(f'{name}: page never scrolled', page.evaluate('scrollX === 0 && scrollY === 0'))
        shot(page, f'phone-{name}')
        check(f'{name}: no errors', not errors, json.dumps(errors[:5]))
        ctx.close()

    browser.close()

print(f'\n{passed} passed, {len(failed)} failed')
for f in failed:
    print('  ✗', f)
sys.exit(1 if failed else 0)
