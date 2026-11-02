"""Real installed-Chrome offline UI flow for Hero SPD affecting an outbound march."""
from pathlib import Path
import hashlib, json, os
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
html = root / 'Play-Heoofgaia-HG11.html'
evidence = root / 'docs' / 'evidence' / 'hg09'
receipts = root / 'docs' / 'qa' / 'hg09'
evidence.mkdir(parents=True, exist_ok=True)
receipts.mkdir(parents=True, exist_ok=True)
configured = os.environ.get('HOG_CHROMIUM_PATH')
candidates = [Path(configured)] if configured else [Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google' / 'Chrome' / 'Application' / 'chrome.exe', Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)')) / 'Microsoft' / 'Edge' / 'Application' / 'msedge.exe']
browser_path = next((str(p) for p in candidates if p and p.is_file()), None)
if not browser_path:
    raise SystemExit('Chrome/Edge not found; set HOG_CHROMIUM_PATH.')

checks, errors = [], []
def check(name, ok):
    checks.append({'name': name, 'passed': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + name)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=browser_path, headless=True, args=['--no-sandbox', '--allow-file-access-from-files'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.goto(html.as_uri(), wait_until='load')
    check('Offline browser opens the exact product title', page.title() == 'Anh Hùng Thời Loạn')
    page.locator('[data-action="start"]').click()
    check('New kingdom starts through the actual title-screen action', page.locator('#world-canvas').count() == 1)

    # Visit the real source-listed Prayer Temple, then use the actual map target
    # selector and March button. The focus is route timing, not simulated combat.
    page.locator('[data-action="select"][data-key="62,57"]').click()
    page.locator('[data-action="visit"]').click()
    buff = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {base:s.heroes[0].spd,active:HOG_ENGINE.heroStats(s,1).spd,buff:s.heroBuffs.find(x=>x.heroId===1&&x.stat==='spd')}})()''')
    check('Visiting the real Prayer Temple applies its +10% Hero SPD buff', buff['buff'] is not None and abs(buff['active']-buff['base']*1.1)<1e-9)

    target = page.evaluate('''(()=>{const q=HOG_ENGINE.NPC_CAMPS_2009.find(x=>x.stars>=5&&HOG_ENGINE.pathfind('3,4',x.key)?.length>=8);return q?.key||null})()''')
    check('World route uses a source-listed, reachable high-star camp', bool(target))
    if not target:
        raise SystemExit('No reachable high-star fixture is available.')
    page.locator(f'[data-action="select"][data-key="{target}"]').click()
    page.locator('[data-action="march"]').click()
    route = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero),path=s.march?.path||[];return {target:s.march?.target,phase:s.march?.phase,heroRaw:h?.spd,heroEffective:HOG_ENGINE.heroStats(s,h.id)?.spd,eta:s.march?.remaining,baseEta:HOG_ENGINE.marchDuration(h?.spd,path),expectedEta:HOG_ENGINE.marchDuration(HOG_ENGINE.heroStats(s,h.id).spd,path),pathLength:path.length,ap:s.ap}})()''')
    check('Actual march button starts the route with a buff-adjusted ETA', route['phase'] == 'outbound' and route['target'] == target and route['eta'] == route['expectedEta'] and route['eta'] < route['baseEta'])
    check('Dispatch leaves stored base Hero SPD unchanged', route['heroRaw'] == buff['base'])
    page.screenshot(path=str(evidence / 'hero-spd-march-live-chrome.png'), full_page=True)

    page.locator('#save').click()
    page.reload(wait_until='load')
    loaded = page.evaluate('''(()=>{const s=HOG_APP_DEBUG.getState();return {version:s?.version,target:s?.march?.target,phase:s?.march?.phase,total:s?.march?.total,remaining:s?.march?.remaining,heroRaw:s?.heroes?.find(h=>h.id===s.activeHero)?.spd,buff:s?.heroBuffs?.some(q=>q.heroId===s.activeHero&&q.stat==='spd')}})()''')
    check('v07 reload preserves the in-flight target, fixed ETA and active buff', loaded['version'] == 7 and loaded['target'] == target and loaded['phase'] == 'outbound' and loaded['total'] == route['eta'] and loaded['remaining'] <= route['eta'] and loaded['remaining'] > 0 and loaded['buff'])
    check('No JavaScript exceptions in the real offline dispatch/reload flow', not errors)
    context.close()
    browser.close()

screenshot = evidence / 'hero-spd-march-live-chrome.png'
result = {'command': '.venv\\Scripts\\python.exe qa-hg09-march-speed-chrome.py', 'browser': browser_path, 'productTitle': 'Anh Hùng Thời Loạn', 'total': len(checks), 'passed': sum(c['passed'] for c in checks), 'failed': sum(not c['passed'] for c in checks), 'errors': errors, 'checks': checks, 'march': {'route': target, 'pathLength': route['pathLength'], 'heroSpeedBeforeDispatch': route['heroRaw'], 'heroSpeedWithBuff': route['heroEffective'], 'normalEtaGameSeconds': route['baseEta'], 'buffedEtaGameSeconds': route['eta'], 'reload': loaded}, 'screenshot': {'path': 'docs/evidence/hg09/hero-spd-march-live-chrome.png', 'sha256': hashlib.sha256(screenshot.read_bytes()).hexdigest().upper(), 'bytes': screenshot.stat().st_size}}
receipt = receipts / 'hero-spd-march-chrome.json'
receipt.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'CHROME TOTAL {result["passed"]}/{result["total"]} PASS; JS errors={len(errors)}')
raise SystemExit(0 if result['passed'] == result['total'] else 1)