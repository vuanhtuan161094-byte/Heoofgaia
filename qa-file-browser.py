from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, tempfile

root = Path(__file__).resolve().parent
html = root / 'Play-Heoofgaia-HG11.html'
evidence = root / 'docs' / 'evidence' / 'hg08'
evidence.mkdir(parents=True, exist_ok=True)
checks = []
errors = []

def chromium_path():
    configured = os.environ.get('HOG_CHROMIUM_PATH')
    candidates = [Path(configured)] if configured else [
        Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe',
        Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
        Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe',
    ]
    return next((str(path) for path in candidates if path.is_file()), None)

executable = chromium_path()
if not executable:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH to an installed browser executable')

def check(name, ok):
    checks.append({'name': name, 'passed': bool(ok)})
    print(('PASS' if ok else 'FAIL'), name)

def click_minimap_tile(page, tx, ty):
    canvas = page.locator('#world-canvas')
    page.wait_for_function('''()=>{const c=document.querySelector('#world-canvas'),tab=document.querySelector('#nav .active');
      if(!c||tab?.dataset.tab!=='map')return false;const r=c.getBoundingClientRect();return r.width>0&&r.height>0}''')
    def click_current_canvas_point():
        point = page.evaluate('''({tx,ty})=>{const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),m=HOG_PAINTER.miniBounds(c),pad=9;
          if(r.width<=0||r.height<=0)throw Error('World canvas lost its visible rectangle');
          return {x:r.left+(m.x+pad+(tx+.5)*(m.w-2*pad)/HOG_ENGINE.WIDTH)/c.width*r.width,
                  y:r.top+(m.y+pad+(ty+.5)*(m.h-2*pad)/HOG_ENGINE.HEIGHT)/c.height*r.height}}''',{'tx':tx,'ty':ty})
        page.mouse.click(point['x'], point['y'])
    click_current_canvas_point()
    # Chromium can drop the first pointer sequence while a resized file:// canvas
    # is settling. Repeating the same real pointer click is idempotent and keeps
    # this check about visible minimap input rather than a test-only state write.
    try:
        page.locator('[data-action="march"], [data-action="recall"]').first.wait_for(state='visible', timeout=1500)
    except Exception:
        click_current_canvas_point()
        page.locator('[data-action="march"], [data-action="recall"]').first.wait_for(state='visible', timeout=5000)

with sync_playwright() as p:
    user_data = tempfile.TemporaryDirectory(prefix='heoofgaia-hg07-profile-')
    context = p.chromium.launch_persistent_context(
        user_data.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('file:// HTML opens in Chromium', page.title().startswith('Anh Hùng Thời Loạn'))
    check('file:// visible masthead uses the canonical title', page.locator('.masthead .brand').inner_text().strip() == 'ANH HÙNG THỜI LOẠN' and page.locator('.welcome-copy h1').inner_text().strip() == 'ANH HÙNG THỜI LOẠN')
    page.screenshot(path=str(root / 'docs' / 'evidence' / 'hg11' / 'title-file-chrome.png'), full_page=True)
    page.locator('[data-action="race"][data-race="elf"]').click()
    page.locator('[data-action="start"]').click()
    check('Game starts from local file', page.evaluate('HOG_APP_DEBUG.getState().race') == 'elf')
    page.screenshot(path=str(evidence / 'screenshot-file-launch-1280x720.png'), full_page=True)
    page.locator('#save').click()
    saved = page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')
    check('file:// save is written under v07 key', bool(saved))
    page.reload(wait_until='load')
    check('file:// reload restores the selected race', page.evaluate('HOG_APP_DEBUG.getState()?.race') == 'elf')
    check('file:// reload preserves the v07 save', bool(page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();s.speed=1;s.wounded.elf_1=2;HOG_APP_DEBUG.render()})()')
    page.locator('#nav [data-tab="heroes"]').click()
    page.locator('[data-action="heal"]').click()
    check('file:// Arena starts a paid recovery queue', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.paidGold===36&&s.wounded.elf_1===0})()'))
    page.screenshot(path=str(evidence / 'screenshot-file-arena-queue-1280x720.png'), full_page=True)
    page.reload(wait_until='load')
    check('file:// reload resumes Arena queue and countdown', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.remaining>0&&s.arenaQueue?.remaining<=400})()'))
    check('No page errors during file launch and reload', not errors)
    context.close()

    context = p.chromium.launch_persistent_context(
        user_data.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('New browser process reload restores saved race', page.evaluate('HOG_APP_DEBUG.getState()?.race') == 'elf')
    check('New browser process retains v07 save', bool(page.evaluate('localStorage.getItem("heoofgaia_hg_only_v07")')))
    check('New browser process resumes persisted Arena recovery', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.arenaQueue?.count===2&&s.arenaQueue?.remaining>0})()'))
    check('No page errors after persistent-profile restart', not errors)
    context.close()
    user_data.cleanup()

    catchup_profile = tempfile.TemporaryDirectory(prefix='heoofgaia-hg10-24h-catchup-')
    context = p.chromium.launch_persistent_context(
        catchup_profile.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    page.locator('[data-action="start"]').click()
    page.locator('#speed').click()
    check('file:// catch-up uses the real 1x speed control', page.evaluate('HOG_APP_DEBUG.getState().speed') == 1)
    page.locator('#nav [data-tab="city"]').click()
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();for(const k of HOG_CATALOG.keys)s.res[k]=HOG_ENGINE.limits(s)[k];HOG_APP_DEBUG.render()})()')
    page.locator('[data-action="building"][data-key="market"]').click()
    page.locator('[data-action="upgrade"]').click()
    check('file:// actual UI starts a paid city construction queue', page.evaluate('HOG_APP_DEBUG.getState().buildingQueue?.key==="market"&&HOG_APP_DEBUG.getState().buildings.market===0'))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();s.lastTick=Date.now()-86400000;HOG_ENGINE.tick(s,Date.now());HOG_APP_DEBUG.render()})()')
    check('file:// 24-hour catch-up completes the queued building exactly once', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.buildings.market===1&&s.buildingQueue===null&&s.tavern.round===24&&s.ap===s.apMax})()'))
    page.wait_for_timeout(3100)  # let the live queue completion toast clear before the actual 1280x720 capture
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(evidence / 'screenshot-file-offline-24h-market-complete-1280x720.png'))
    page.locator('#save').click()
    page.reload(wait_until='load')
    check('file:// reload preserves 24-hour completion and v07 schema', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.version===7&&s.buildings.market===1&&s.buildingQueue===null&&s.tavern.round===24})()'))
    check('No page errors during file:// 24-hour catch-up', not errors)
    context.close()
    context = p.chromium.launch_persistent_context(
        catchup_profile.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('new Chrome process retains 24-hour catch-up state', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s?.buildings.market===1&&s?.buildingQueue===null&&s?.tavern.round===24})()'))
    context.close()
    catchup_profile.cleanup()

    garrison_profile = tempfile.TemporaryDirectory(prefix='heoofgaia-hg10-garrison-')
    context = p.chromium.launch_persistent_context(
        garrison_profile.name,
        headless=True,
        executable_path=executable,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
        viewport={'width': 1280, 'height': 720},
    )
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(html.as_uri(), wait_until='load')
    check('file:// standalone starts the real mine-expedition flow', page.title().startswith('Anh Hùng Thời Loạn'))
    page.locator('[data-action="start"]').click()
    page.locator('#speed').click()
    page.locator('#nav [data-tab="map"]').click()
    click_minimap_tile(page, 6, 3)
    check('file:// minimap pointer selects a mine and enables real dispatch', page.locator('[data-action="march"]').is_enabled())
    page.locator('[data-action="march"]').click()
    check('file:// departure assigns starter troops to the traveling hero', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.march?.phase==="outbound"&&s.army.human_1===0&&s.expedition?.army.human_1===16})()'))
    page.locator('#save').click()
    page.reload(wait_until='load')
    check('file:// reload resumes the outbound hero and army', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.march?.phase==="outbound"&&s.expedition?.army.human_1===16&&s.army.human_1===0})()'))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('file:// march arrival opens the actual mine battle', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return !!s.battle&&s.battle.target==="6,3"&&s.battle.allies[0].count===16})()'))
    for _ in range(72):
        if not page.evaluate('!!HOG_APP_DEBUG.getState().battle'):
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
    check('file:// natural starter battle captures the mine and stations the hero', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return !s.battle&&s.mines.some(m=>m.key==="6,3")&&s.stationedHeroes.some(h=>h.heroId===1&&h.key==="6,3")})()'))
    # Ensure the post-battle view has completed its switch from Combat to World before targeting the garrison.
    page.locator('#nav [data-tab="map"]').click()
    page.locator('#world-canvas').wait_for(state='visible')
    click_minimap_tile(page, 6, 3)
    check('file:// map shows the garrison and a working Recall action', 'Đồn trú' in page.locator('#main').inner_text() and page.locator('[data-action="recall"][data-id="1"]').is_enabled())
    page.wait_for_timeout(3100)  # let the live game's success toast fade before capture
    page.screenshot(path=str(evidence / 'screenshot-file-mine-garrison-1280x720.png'), full_page=True)
    page.locator('[data-action="recall"][data-id="1"]').click()
    check('file:// Recall creates a real return march', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.march?.phase==="return"&&s.expedition?.army.human_1>0&&s.stationedHeroes.length===0})()'))
    page.wait_for_timeout(3100)  # capture return state without the transient toast
    page.screenshot(path=str(evidence / 'screenshot-file-hero-return-1280x720.png'), full_page=True)
    page.locator('#save').click()
    page.reload(wait_until='load')
    check('file:// reload preserves the return march', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.march?.phase==="return"&&s.expedition?.phase==="returning"})()'))
    page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()')
    check('file:// return merges surviving troops once and retains mine income', page.evaluate('(()=>{const s=HOG_APP_DEBUG.getState();return s.march===null&&s.expedition===null&&s.stationedHeroes.length===0&&s.army.human_1>0&&s.mines.length===1&&HOG_ENGINE.rate(s).wood===HOG_ENGINE.rate(HOG_ENGINE.make("human")).wood+40})()'))
    check('No page errors through file:// march, combat, recall and reload', not errors)
    context.close()
    garrison_profile.cleanup()

result = {'checks': checks, 'errors': errors, 'passed': sum(x['passed'] for x in checks), 'total': len(checks)}
(evidence / 'file-launch-persistence.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
raise SystemExit(0 if result['passed'] == result['total'] else 1)
